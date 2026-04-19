from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from database import (
    daily_closings_col, sales_summaries_col, petty_cash_col,
    stock_movements_col, reconciliations_col, outlets_col,
    cashier_shifts_col, pos_orders_col,
)
from auth import get_current_user, check_permission, check_outlet_access
from utils.audit import log_audit, serialize_doc
from utils.helpers import now_utc
from websocket_manager import ws_manager
from bson import ObjectId
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/api/daily-closing", tags=["daily_closing"])

class ClosingSubmitRequest(BaseModel):
    notes: Optional[str] = ""

class ClosingActionRequest(BaseModel):
    comment: Optional[str] = ""

@router.get("")
async def list_closings(current_user: dict = Depends(get_current_user), outlet_id: str = "", status: str = "", date_from: str = "", date_to: str = "", skip: int = 0, limit: int = 20):
    query = {}
    if outlet_id:
        query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        query["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    if status:
        query["status"] = status
    if date_from:
        query.setdefault("date", {})["$gte"] = date_from
    if date_to:
        query.setdefault("date", {})["$lte"] = date_to
    
    total = await daily_closings_col.count_documents(query)
    cursor = daily_closings_col.find(query).sort("date", -1).skip(skip).limit(limit)
    closings = []
    async for c in cursor:
        doc = serialize_doc(c)
        if c.get("outlet_id"):
            outlet = await outlets_col.find_one({"_id": ObjectId(c["outlet_id"])})
            doc["outlet_name"] = outlet.get("name", "") if outlet else ""
        closings.append(doc)
    return {"closings": closings, "total": total}

@router.get("/status")
async def get_closing_status(current_user: dict = Depends(get_current_user), outlet_id: str = "", date: str = ""):
    """Get closing status and checklist for a specific outlet and date"""
    if not outlet_id or not date:
        raise HTTPException(status_code=400, detail="outlet_id and date are required")
    
    await check_outlet_access(current_user, outlet_id)
    
    # Get existing closing record
    closing = await daily_closings_col.find_one({"outlet_id": outlet_id, "date": date})
    
    # Build checklist
    sales_count = await sales_summaries_col.count_documents({"outlet_id": outlet_id, "date": date})
    petty_count = await petty_cash_col.count_documents({"outlet_id": outlet_id, "date": date})
    stock_count = await stock_movements_col.count_documents({"outlet_id": outlet_id, "date": date})
    recon_count = await reconciliations_col.count_documents({"outlet_id": outlet_id, "date": date})
    recon_unresolved = await reconciliations_col.count_documents({"outlet_id": outlet_id, "date": date, "status": "variance"})
    
    # ----- Phase 3C: Integrate cashier shifts -----
    try:
        day_start = datetime.fromisoformat(date).replace(tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)
    except Exception:
        day_start = None
        day_end = None

    shifts_open = 0
    shifts_closed = 0
    shift_summary = {
        "total_orders": 0,
        "total_sales": 0.0,
        "cash_sales": 0.0,
        "card_sales": 0.0,
        "online_sales": 0.0,
        "other_sales": 0.0,
        "expected_cash_total": 0.0,
        "actual_cash_total": 0.0,
        "variance_total": 0.0,
        "max_variance": 0.0,
    }
    shift_list = []
    if day_start:
        query = {"outlet_id": outlet_id, "opened_at": {"$gte": day_start, "$lt": day_end}}
        async for s in cashier_shifts_col.find(query).sort("opened_at", 1):
            doc = serialize_doc(s)
            shift_list.append(doc)
            if s.get("status") == "open":
                shifts_open += 1
            else:
                shifts_closed += 1
                t = s.get("totals", {}) or {}
                shift_summary["total_orders"] += int(t.get("total_orders", 0) or 0)
                shift_summary["total_sales"] += float(t.get("total_sales", 0) or 0)
                shift_summary["cash_sales"] += float(t.get("cash_sales", 0) or 0)
                shift_summary["card_sales"] += float(t.get("card_sales", 0) or 0)
                shift_summary["online_sales"] += float(t.get("online_sales", 0) or 0)
                shift_summary["other_sales"] += float(t.get("other_sales", 0) or 0)
                shift_summary["expected_cash_total"] += float(s.get("closing_cash_expected", 0) or 0)
                shift_summary["actual_cash_total"] += float(s.get("closing_cash_actual", 0) or 0)
                v = float(s.get("variance", 0) or 0)
                shift_summary["variance_total"] += v
                if abs(v) > abs(shift_summary["max_variance"]):
                    shift_summary["max_variance"] = v

    # Discrepancy flags
    discrepancies = []
    # Threshold for cashier variance (10,000 IDR per shift)
    VARIANCE_THRESHOLD = 10000
    if abs(shift_summary["variance_total"]) > VARIANCE_THRESHOLD:
        discrepancies.append({
            "type": "cash_variance",
            "severity": "warning" if abs(shift_summary["variance_total"]) < 50000 else "critical",
            "message": f"Total variance kas shift: {shift_summary['variance_total']:,.0f}",
        })
    if shifts_open > 0:
        discrepancies.append({
            "type": "open_shifts",
            "severity": "critical",
            "message": f"{shifts_open} shift kasir belum ditutup",
        })
    if shifts_closed == 0 and sales_count == 0:
        discrepancies.append({
            "type": "no_sales_data",
            "severity": "warning",
            "message": "Tidak ada shift atau ringkasan penjualan untuk tanggal ini",
        })

    # Has cashier data flag
    has_cashier_data = (shifts_open + shifts_closed) > 0
    shift_complete = has_cashier_data and shifts_open == 0

    checklist = {
        "sales_summary": {"complete": sales_count > 0 or shift_complete, "count": sales_count},
        "petty_cash": {"complete": True, "count": petty_count},  # OK even if 0
        "stock_movements": {"complete": True, "count": stock_count},  # OK even if 0
        "cash_reconciliation": {"complete": recon_count > 0 and recon_unresolved == 0, "count": recon_count, "unresolved": recon_unresolved},
        "cashier_shifts": {"complete": shift_complete if has_cashier_data else True, "count": shifts_closed, "open_count": shifts_open, "has_data": has_cashier_data},
    }
    
    all_complete = (checklist["sales_summary"]["complete"] and
                    checklist["cash_reconciliation"]["complete"] and
                    checklist["cashier_shifts"]["complete"])
    
    # Block submit if critical discrepancy
    has_critical = any(d.get("severity") == "critical" for d in discrepancies)

    return {
        "closing": serialize_doc(closing) if closing else None,
        "status": closing["status"] if closing else "open",
        "checklist": checklist,
        "can_submit": all_complete and not has_critical and (not closing or closing.get("status") in ["open", "in_progress"]),
        "date": date,
        "outlet_id": outlet_id,
        "shift_summary": shift_summary,
        "shifts": shift_list,
        "discrepancies": discrepancies,
    }

@router.post("/start")
async def start_closing(outlet_id: str, date: str, current_user: dict = Depends(get_current_user)):
    """Start or create a daily closing record"""
    await check_outlet_access(current_user, outlet_id)
    
    existing = await daily_closings_col.find_one({"outlet_id": outlet_id, "date": date})
    if existing:
        if existing["status"] in ["locked", "approved"]:
            raise HTTPException(status_code=400, detail="Day is already closed and locked")
        await daily_closings_col.update_one(
            {"_id": existing["_id"]},
            {"$set": {"status": "in_progress", "updated_at": now_utc()}}
        )
        return {"id": str(existing["_id"]), "status": "in_progress", "message": "Closing resumed"}
    
    doc = {
        "outlet_id": outlet_id,
        "date": date,
        "status": "in_progress",
        "created_by": current_user["id"],
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    result = await daily_closings_col.insert_one(doc)
    await log_audit(current_user["id"], "create", "operations", "daily_closing", str(result.inserted_id), details=f"Started closing for {date}")
    return {"id": str(result.inserted_id), "status": "in_progress", "message": "Closing started"}

@router.post("/submit")
async def submit_closing(outlet_id: str, date: str, req: ClosingSubmitRequest, current_user: dict = Depends(get_current_user)):
    """Submit daily closing for approval"""
    await check_outlet_access(current_user, outlet_id)
    
    closing = await daily_closings_col.find_one({"outlet_id": outlet_id, "date": date})
    if not closing:
        raise HTTPException(status_code=404, detail="No closing record found. Start closing first.")
    if closing["status"] in ["submitted", "approved", "locked"]:
        raise HTTPException(status_code=400, detail=f"Cannot submit: status is {closing['status']}")
    
    # Check if all items complete
    recon_unresolved = await reconciliations_col.count_documents({"outlet_id": outlet_id, "date": date, "status": "variance"})
    if recon_unresolved > 0:
        raise HTTPException(status_code=400, detail=f"Cannot submit: {recon_unresolved} unresolved reconciliation(s)")
    
    sales_count = await sales_summaries_col.count_documents({"outlet_id": outlet_id, "date": date})
    if sales_count == 0:
        raise HTTPException(status_code=400, detail="Cannot submit: Sales summary not completed")
    
    await daily_closings_col.update_one(
        {"_id": closing["_id"]},
        {"$set": {"status": "submitted", "submitted_by": current_user["id"], "submitted_at": now_utc(), "submit_notes": req.notes, "updated_at": now_utc()}}
    )
    
    await log_audit(current_user["id"], "submit", "operations", "daily_closing", str(closing["_id"]), details=f"Submitted closing for {date}")
    await ws_manager.broadcast_all({"type": "closing_submitted", "outlet_id": outlet_id, "date": date})
    # Notification — alert management portal
    try:
        from utils.notification_service import create_notification
        await create_notification(
            type="closing",
            title=f"Closing menunggu approval — {date}",
            body=f"Outlet telah submit closing untuk {date}. Silakan review.",
            severity="warning",
            outlet_id=outlet_id,
            portal_scope=["management"],
            ref_type="daily_closing",
            ref_id=str(closing["_id"]),
            link=f"/management/closing/{outlet_id}/{date}",
        )
    except Exception as e:
        print(f"[notif] closing submit notify failed: {e}")
    return {"message": "Closing submitted for approval"}

@router.post("/approve")
async def approve_closing(outlet_id: str, date: str, req: ClosingActionRequest, current_user: dict = Depends(get_current_user)):
    """Approve and lock daily closing"""
    await check_permission(current_user, "finance.close_period")
    
    closing = await daily_closings_col.find_one({"outlet_id": outlet_id, "date": date})
    if not closing:
        raise HTTPException(status_code=404, detail="No closing record found")
    if closing["status"] != "submitted":
        raise HTTPException(status_code=400, detail=f"Cannot approve: status is {closing['status']}")
    
    await daily_closings_col.update_one(
        {"_id": closing["_id"]},
        {"$set": {"status": "locked", "approved_by": current_user["id"], "approved_at": now_utc(), "approval_comment": req.comment, "updated_at": now_utc()}}
    )
    
    await log_audit(current_user["id"], "approve", "operations", "daily_closing", str(closing["_id"]), details=f"Approved & locked closing for {date}")
    await ws_manager.broadcast_to_outlet(outlet_id, {"type": "closing_locked", "date": date})
    # Notification — inform outlet staff
    try:
        from utils.notification_service import create_notification
        await create_notification(
            type="closing",
            title=f"Closing disetujui & dikunci — {date}",
            body=f"Closing outlet untuk {date} telah di-lock oleh {current_user.get('name')}.",
            severity="success",
            outlet_id=outlet_id,
            portal_scope=["outlet", "management"],
            ref_type="daily_closing",
            ref_id=str(closing["_id"]),
            link=f"/outlet/closing",
        )
    except Exception as e:
        print(f"[notif] closing approve notify failed: {e}")
    return {"message": "Closing approved and day locked"}

@router.post("/override")
async def override_closing(outlet_id: str, date: str, req: ClosingActionRequest, current_user: dict = Depends(get_current_user)):
    """Override a locked day (admin only)"""
    if not current_user.get("is_superadmin"):
        await check_permission(current_user, "finance.reopen_period")
    
    closing = await daily_closings_col.find_one({"outlet_id": outlet_id, "date": date})
    if not closing:
        raise HTTPException(status_code=404, detail="No closing record found")
    if closing["status"] != "locked":
        raise HTTPException(status_code=400, detail="Only locked days can be overridden")
    
    if not req.comment:
        raise HTTPException(status_code=400, detail="Override reason is required")
    
    await daily_closings_col.update_one(
        {"_id": closing["_id"]},
        {"$set": {"status": "in_progress", "overridden_by": current_user["id"], "overridden_at": now_utc(), "override_reason": req.comment, "updated_at": now_utc()}}
    )
    
    await log_audit(current_user["id"], "override", "operations", "daily_closing", str(closing["_id"]), details=f"Override locked day {date}: {req.comment}")
    return {"message": "Day reopened via override"}

@router.post("/reopen-request")
async def request_reopen(outlet_id: str, date: str, req: ClosingActionRequest, current_user: dict = Depends(get_current_user)):
    """Request to reopen a locked day (creates an approval request)"""
    await check_outlet_access(current_user, outlet_id)
    
    closing = await daily_closings_col.find_one({"outlet_id": outlet_id, "date": date})
    if not closing:
        raise HTTPException(status_code=404, detail="No closing record found")
    if closing["status"] not in ["locked", "approved"]:
        raise HTTPException(status_code=400, detail=f"Cannot request reopen: status is {closing['status']}")
    
    if not req.comment:
        raise HTTPException(status_code=400, detail="Reason for reopen is required")
    
    # Create approval request
    from database import approvals_col
    approval_doc = {
        "type": "reopen_closing",
        "module": "operations",
        "description": f"Request to reopen closing for {date}: {req.comment}",
        "data": {"outlet_id": outlet_id, "date": date, "closing_id": str(closing["_id"])},
        "outlet_id": outlet_id,
        "amount": None,
        "requester_id": current_user["id"],
        "approver_ids": [],
        "status": "pending",
        "comments": [],
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    result = await approvals_col.insert_one(approval_doc)
    
    # Update closing status
    await daily_closings_col.update_one(
        {"_id": closing["_id"]},
        {"$set": {"reopen_requested": True, "reopen_reason": req.comment, "reopen_requested_by": current_user["id"], "reopen_requested_at": now_utc(), "updated_at": now_utc()}}
    )
    
    await log_audit(current_user["id"], "reopen_request", "operations", "daily_closing", str(closing["_id"]), details=f"Reopen request for {date}: {req.comment}")
    await ws_manager.broadcast_all({"type": "reopen_requested", "outlet_id": outlet_id, "date": date})
    return {"approval_id": str(result.inserted_id), "message": "Reopen request submitted for approval"}


@router.get("/monitor")
async def closing_monitor(current_user: dict = Depends(get_current_user), date: str = ""):
    """Get closing status for all outlets for a given date (management view)"""
    from datetime import datetime, timezone
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    from database import outlets_col
    outlets = []
    async for o in outlets_col.find({"status": "active"}):
        outlet_data = serialize_doc(o)
        closing = await daily_closings_col.find_one({"outlet_id": str(o["_id"]), "date": date})
        outlet_data["closing_status"] = closing["status"] if closing else "open"
        outlet_data["closing"] = serialize_doc(closing) if closing else None
        outlets.append(outlet_data)
    
    return {"date": date, "outlets": outlets}
