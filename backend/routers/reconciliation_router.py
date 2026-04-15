from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from database import reconciliations_col, accounts_col, cash_movements_col, sales_summaries_col, outlets_col
from auth import get_current_user, check_permission, check_outlet_access
from utils.audit import log_audit, serialize_doc
from utils.helpers import now_utc
from websocket_manager import ws_manager
from bson import ObjectId

router = APIRouter(prefix="/api/reconciliation", tags=["reconciliation"])

class ReconciliationRequest(BaseModel):
    outlet_id: str
    account_id: str
    date: str
    type: str = "cash"  # cash, bank
    expected_amount: float
    actual_amount: float
    variance_reason: Optional[str] = ""
    notes: Optional[str] = ""

class ReconciliationAction(BaseModel):
    comment: Optional[str] = ""

@router.get("")
async def list_reconciliations(current_user: dict = Depends(get_current_user), outlet_id: str = "", status: str = "", date_from: str = "", date_to: str = "", skip: int = 0, limit: int = 20):
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
    
    total = await reconciliations_col.count_documents(query)
    cursor = reconciliations_col.find(query).sort("date", -1).skip(skip).limit(limit)
    recs = []
    async for r in cursor:
        doc = serialize_doc(r)
        if r.get("outlet_id"):
            outlet = await outlets_col.find_one({"_id": ObjectId(r["outlet_id"])})
            doc["outlet_name"] = outlet.get("name", "") if outlet else ""
        if r.get("account_id"):
            acc = await accounts_col.find_one({"_id": ObjectId(r["account_id"])})
            doc["account_name"] = acc.get("name", "") if acc else ""
        recs.append(doc)
    return {"reconciliations": recs, "total": total}

@router.post("")
async def create_reconciliation(req: ReconciliationRequest, current_user: dict = Depends(get_current_user)):
    await check_outlet_access(current_user, req.outlet_id)
    
    difference = req.actual_amount - req.expected_amount
    status = "matched" if abs(difference) < 0.01 else "variance"
    
    doc = {
        "outlet_id": req.outlet_id,
        "account_id": req.account_id,
        "date": req.date,
        "type": req.type,
        "expected_amount": req.expected_amount,
        "actual_amount": req.actual_amount,
        "difference": difference,
        "variance_reason": req.variance_reason,
        "notes": req.notes,
        "status": status,  # matched, variance, approved, rejected
        "created_by": current_user["id"],
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    result = await reconciliations_col.insert_one(doc)
    rec_id = str(result.inserted_id)
    
    await log_audit(current_user["id"], "create", "finance", "reconciliation", rec_id,
                    details=f"Recon {req.date}: expected={req.expected_amount}, actual={req.actual_amount}, diff={difference}")
    
    if abs(difference) > 0:
        await ws_manager.broadcast_to_outlet(req.outlet_id, {
            "type": "cash_mismatch",
            "date": req.date,
            "difference": difference,
        })
    
    return {"id": rec_id, "status": status, "difference": difference, "message": "Reconciliation recorded"}

@router.post("/{recon_id}/approve")
async def approve_reconciliation(recon_id: str, req: ReconciliationAction, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "finance.approve_cash_movement")
    recon = await reconciliations_col.find_one({"_id": ObjectId(recon_id)})
    if not recon:
        raise HTTPException(status_code=404, detail="Reconciliation not found")
    if recon["status"] not in ["variance"]:
        raise HTTPException(status_code=400, detail=f"Cannot approve: status is {recon['status']}")
    
    await reconciliations_col.update_one(
        {"_id": ObjectId(recon_id)},
        {"$set": {"status": "approved", "approved_by": current_user["id"], "approved_at": now_utc(), "approval_comment": req.comment, "updated_at": now_utc()}}
    )
    await log_audit(current_user["id"], "approve", "finance", "reconciliation", recon_id, details=req.comment)
    return {"message": "Reconciliation approved"}

@router.post("/{recon_id}/reject")
async def reject_reconciliation(recon_id: str, req: ReconciliationAction, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "finance.approve_cash_movement")
    recon = await reconciliations_col.find_one({"_id": ObjectId(recon_id)})
    if not recon:
        raise HTTPException(status_code=404, detail="Reconciliation not found")
    
    await reconciliations_col.update_one(
        {"_id": ObjectId(recon_id)},
        {"$set": {"status": "rejected", "rejected_by": current_user["id"], "rejected_at": now_utc(), "rejection_comment": req.comment, "updated_at": now_utc()}}
    )
    await log_audit(current_user["id"], "reject", "finance", "reconciliation", recon_id, details=req.comment)
    return {"message": "Reconciliation rejected"}

@router.get("/daily-summary")
async def daily_recon_summary(current_user: dict = Depends(get_current_user), outlet_id: str = "", date: str = ""):
    """Get reconciliation summary for a specific date and outlet"""
    query = {}
    if outlet_id:
        query["outlet_id"] = outlet_id
    if date:
        query["date"] = date
    
    recs = []
    async for r in reconciliations_col.find(query):
        recs.append(serialize_doc(r))
    
    total_expected = sum(r.get("expected_amount", 0) for r in recs)
    total_actual = sum(r.get("actual_amount", 0) for r in recs)
    total_diff = sum(r.get("difference", 0) for r in recs)
    unresolved = sum(1 for r in recs if r.get("status") == "variance")
    
    return {
        "reconciliations": recs,
        "total_expected": total_expected,
        "total_actual": total_actual,
        "total_difference": total_diff,
        "unresolved_count": unresolved,
        "all_resolved": unresolved == 0,
    }
