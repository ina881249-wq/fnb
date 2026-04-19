"""
Warehouse Portal Router
Handles: Receiving (goods inward), Transfers (outlet-to-outlet),
Stock Adjustments (manual corrections), Inventory Count (stock opname).
All operations write to stock_movements_col for audit trail.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId

from database import (
    warehouse_receipts_col, warehouse_transfers_col,
    warehouse_adjustments_col, warehouse_counts_col, suppliers_col,
    warehouse_settings_col, purchase_orders_col, po_lines_col, gridfs_bucket,
    items_col, stock_on_hand_col, stock_movements_col, outlets_col,
)
from auth import get_current_user, check_outlet_access
from utils.audit import log_audit, serialize_doc
from utils.helpers import now_utc
from utils.posting_service import post_receipt_journal, post_adjustment_journal
from websocket_manager import ws_manager

router = APIRouter(prefix="/api/warehouse", tags=["warehouse"])


# ============ SUPPLIERS ============
class SupplierCreate(BaseModel):
    name: str
    code: Optional[str] = ""
    contact_person: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    address: Optional[str] = ""
    category: Optional[str] = "general"  # food, beverage, cleaning, general
    active: bool = True


@router.get("/suppliers")
async def list_suppliers(current_user: dict = Depends(get_current_user), search: str = "", active_only: bool = True):
    q = {}
    if active_only:
        q["active"] = True
    if search:
        q["name"] = {"$regex": search, "$options": "i"}
    items = []
    async for s in suppliers_col.find(q).sort("name", 1):
        items.append(serialize_doc(s))
    return {"suppliers": items, "total": len(items)}


@router.post("/suppliers")
async def create_supplier(req: SupplierCreate, current_user: dict = Depends(get_current_user)):
    doc = req.dict()
    doc.update({
        "created_at": now_utc(), "updated_at": now_utc(), "created_by": current_user["id"],
    })
    result = await suppliers_col.insert_one(doc)
    await log_audit(current_user["id"], "create", "warehouse", "supplier", str(result.inserted_id), details=f"Supplier: {req.name}")
    return {"id": str(result.inserted_id), "message": "Supplier created"}


# ============ RECEIVING (Goods Inward) ============
class ReceiptLine(BaseModel):
    item_id: str
    item_name: str
    quantity: float
    uom: str = "pcs"
    unit_cost: float = 0
    total_cost: Optional[float] = 0
    notes: Optional[str] = ""


class ReceiptCreate(BaseModel):
    outlet_id: str  # destination outlet
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = ""
    po_reference: Optional[str] = ""
    invoice_number: Optional[str] = ""
    date: Optional[str] = None  # YYYY-MM-DD
    lines: List[ReceiptLine]
    notes: Optional[str] = ""


async def _apply_stock_delta(item_id: str, outlet_id: str, delta: float, movement_type: str, reference: str, description: str, user_id: str):
    """Update stock_col with a delta and write a stock_movement record."""
    try:
        # Find existing stock row
        existing = await stock_on_hand_col.find_one({"item_id": item_id, "outlet_id": outlet_id})
        if existing:
            new_qty = float(existing.get("quantity", 0)) + float(delta)
            await stock_on_hand_col.update_one(
                {"_id": existing["_id"]},
                {"$set": {"quantity": new_qty, "updated_at": now_utc()}}
            )
        else:
            await stock_on_hand_col.insert_one({
                "item_id": item_id,
                "outlet_id": outlet_id,
                "quantity": max(0, float(delta)),
                "created_at": now_utc(), "updated_at": now_utc(),
            })
        # Movement log
        await stock_movements_col.insert_one({
            "item_id": item_id,
            "outlet_id": outlet_id,
            "type": movement_type,
            "quantity": float(delta),
            "reference": reference,
            "description": description,
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "status": "posted",
            "created_by": user_id,
            "created_at": now_utc(),
        })
    except Exception as e:
        print(f"warn: stock delta failed: {e}")


@router.post("/receipts")
async def create_receipt(req: ReceiptCreate, current_user: dict = Depends(get_current_user)):
    await check_outlet_access(current_user, req.outlet_id)
    # Generate receipt number
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    count = await warehouse_receipts_col.count_documents({"receipt_number": {"$regex": f"^GRN-{today}"}})
    receipt_number = f"GRN-{today}-{count + 1:04d}"

    # Calculate totals
    total_value = 0.0
    lines_out = []
    for ln in req.lines:
        line_total = float(ln.quantity) * float(ln.unit_cost)
        total_value += line_total
        lines_out.append({**ln.dict(), "total_cost": line_total})

    receipt_date = req.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    doc = {
        "receipt_number": receipt_number,
        "outlet_id": req.outlet_id,
        "supplier_id": req.supplier_id,
        "supplier_name": req.supplier_name or "",
        "po_reference": req.po_reference,
        "invoice_number": req.invoice_number,
        "date": receipt_date,
        "lines": lines_out,
        "total_value": total_value,
        "total_items": len(req.lines),
        "notes": req.notes,
        "status": "posted",
        "received_by": current_user["id"],
        "received_by_name": current_user.get("name", ""),
        "created_at": now_utc(),
    }
    result = await warehouse_receipts_col.insert_one(doc)

    # Apply to stock
    for ln in req.lines:
        await _apply_stock_delta(
            ln.item_id, req.outlet_id, float(ln.quantity),
            "receiving", receipt_number,
            f"Receipt {receipt_number} — {ln.item_name}",
            current_user["id"],
        )

    await log_audit(current_user["id"], "create", "warehouse", "receipt", str(result.inserted_id),
                    details=f"{receipt_number} — {len(req.lines)} items, total {total_value:,.0f}")
    await ws_manager.broadcast_all({"type": "warehouse_receipt_created", "receipt_number": receipt_number, "outlet_id": req.outlet_id})

    # Auto-post journal (Dr Inventory / Cr AP)
    doc_for_post = {**doc, "_id": result.inserted_id}
    journal_result = await post_receipt_journal(doc_for_post, current_user["id"])
    journal_number = journal_result["journal_number"] if journal_result else None

    return {"id": str(result.inserted_id), "receipt_number": receipt_number, "total_value": total_value, "journal_number": journal_number}


@router.get("/receipts")
async def list_receipts(
    current_user: dict = Depends(get_current_user),
    outlet_id: str = "",
    supplier_id: str = "",
    date_from: str = "",
    date_to: str = "",
    search: str = "",
    skip: int = 0,
    limit: int = 30,
):
    q = {}
    if outlet_id:
        q["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        q["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    if supplier_id:
        q["supplier_id"] = supplier_id
    if date_from or date_to:
        dq = {}
        if date_from: dq["$gte"] = date_from
        if date_to: dq["$lte"] = date_to
        q["date"] = dq
    if search:
        q["$or"] = [
            {"receipt_number": {"$regex": search, "$options": "i"}},
            {"supplier_name": {"$regex": search, "$options": "i"}},
            {"po_reference": {"$regex": search, "$options": "i"}},
            {"invoice_number": {"$regex": search, "$options": "i"}},
        ]
    total = await warehouse_receipts_col.count_documents(q)
    cursor = warehouse_receipts_col.find(q).sort("created_at", -1).skip(skip).limit(limit)
    items = []
    async for r in cursor:
        items.append(serialize_doc(r))
    return {"receipts": items, "total": total}


@router.get("/receipts/{receipt_id}")
async def get_receipt(receipt_id: str, current_user: dict = Depends(get_current_user)):
    try: oid = ObjectId(receipt_id)
    except: raise HTTPException(status_code=400, detail="Invalid id")
    doc = await warehouse_receipts_col.find_one({"_id": oid})
    if not doc: raise HTTPException(status_code=404, detail="Not found")
    return {"receipt": serialize_doc(doc)}


# ============ TRANSFERS (Outlet-to-Outlet) ============
class TransferLine(BaseModel):
    item_id: str
    item_name: str
    quantity: float
    uom: str = "pcs"
    notes: Optional[str] = ""


class TransferCreate(BaseModel):
    from_outlet_id: str
    to_outlet_id: str
    date: Optional[str] = None
    lines: List[TransferLine]
    notes: Optional[str] = ""
    requires_approval: bool = False  # if True, starts as 'requested' instead of 'in_transit'


class TransferApproveRequest(BaseModel):
    comment: Optional[str] = ""


class ReceiveLine(BaseModel):
    item_id: str
    received_qty: float


class TransferReceiveRequest(BaseModel):
    lines: Optional[List[ReceiveLine]] = None  # per-line received qty. If None, receive all.
    notes: Optional[str] = ""


@router.post("/transfers")
async def create_transfer(req: TransferCreate, current_user: dict = Depends(get_current_user)):
    if req.from_outlet_id == req.to_outlet_id:
        raise HTTPException(status_code=400, detail="Source and destination must differ")
    await check_outlet_access(current_user, req.from_outlet_id)

    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    count = await warehouse_transfers_col.count_documents({"transfer_number": {"$regex": f"^TRF-{today}"}})
    transfer_number = f"TRF-{today}-{count + 1:04d}"
    transfer_date = req.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    initial_status = "requested" if req.requires_approval else "in_transit"

    doc = {
        "transfer_number": transfer_number,
        "from_outlet_id": req.from_outlet_id,
        "to_outlet_id": req.to_outlet_id,
        "date": transfer_date,
        "lines": [{**l.dict(), "received_qty": 0} for l in req.lines],
        "total_items": len(req.lines),
        "notes": req.notes,
        "status": initial_status,
        "requires_approval": req.requires_approval,
        "requested_by": current_user["id"],
        "requested_by_name": current_user.get("name", ""),
        "created_at": now_utc(), "updated_at": now_utc(),
    }
    result = await warehouse_transfers_col.insert_one(doc)

    # Deduct from source only if auto-approved (legacy path)
    if initial_status == "in_transit":
        for ln in req.lines:
            await _apply_stock_delta(
                ln.item_id, req.from_outlet_id, -abs(float(ln.quantity)),
                "transfer_out", transfer_number,
                f"Transfer {transfer_number} to destination",
                current_user["id"],
            )

    await log_audit(current_user["id"], "create", "warehouse", "transfer", str(result.inserted_id),
                    details=f"{transfer_number}: {len(req.lines)} items, status={initial_status}")
    await ws_manager.broadcast_all({"type": "warehouse_transfer_created", "transfer_number": transfer_number, "status": initial_status})
    return {"id": str(result.inserted_id), "transfer_number": transfer_number, "status": initial_status}


@router.post("/transfers/{transfer_id}/approve")
async def approve_transfer(transfer_id: str, req: TransferApproveRequest, current_user: dict = Depends(get_current_user)):
    """Approve a requested transfer. Deducts stock from source and moves to in_transit."""
    try: oid = ObjectId(transfer_id)
    except: raise HTTPException(status_code=400, detail="Invalid id")
    doc = await warehouse_transfers_col.find_one({"_id": oid})
    if not doc: raise HTTPException(status_code=404, detail="Not found")
    if doc.get("status") != "requested":
        raise HTTPException(status_code=400, detail=f"Cannot approve — status: {doc.get('status')}")
    await check_outlet_access(current_user, doc["from_outlet_id"])

    # Deduct from source
    for ln in doc.get("lines", []):
        await _apply_stock_delta(
            ln["item_id"], doc["from_outlet_id"], -abs(float(ln["quantity"])),
            "transfer_out", doc["transfer_number"],
            f"Transfer {doc['transfer_number']} approved & shipped",
            current_user["id"],
        )
    await warehouse_transfers_col.update_one(
        {"_id": oid},
        {"$set": {
            "status": "in_transit",
            "approved_at": now_utc(),
            "approved_by": current_user["id"],
            "approved_by_name": current_user.get("name", ""),
            "approval_comment": req.comment or "",
            "updated_at": now_utc(),
        }}
    )
    await log_audit(current_user["id"], "approve_transfer", "warehouse", "transfer", transfer_id,
                    details=f"{doc['transfer_number']} approved")
    await ws_manager.broadcast_all({"type": "warehouse_transfer_approved", "transfer_number": doc["transfer_number"]})
    return {"message": "Transfer approved and shipped", "status": "in_transit"}


@router.post("/transfers/{transfer_id}/reject")
async def reject_transfer(transfer_id: str, req: TransferApproveRequest, current_user: dict = Depends(get_current_user)):
    """Reject a requested transfer. No stock impact."""
    try: oid = ObjectId(transfer_id)
    except: raise HTTPException(status_code=400, detail="Invalid id")
    doc = await warehouse_transfers_col.find_one({"_id": oid})
    if not doc: raise HTTPException(status_code=404, detail="Not found")
    if doc.get("status") != "requested":
        raise HTTPException(status_code=400, detail=f"Cannot reject — status: {doc.get('status')}")
    await check_outlet_access(current_user, doc["from_outlet_id"])

    await warehouse_transfers_col.update_one(
        {"_id": oid},
        {"$set": {
            "status": "rejected",
            "rejected_at": now_utc(),
            "rejected_by": current_user["id"],
            "rejected_by_name": current_user.get("name", ""),
            "rejection_reason": req.comment or "",
            "updated_at": now_utc(),
        }}
    )
    await log_audit(current_user["id"], "reject_transfer", "warehouse", "transfer", transfer_id,
                    details=f"{doc['transfer_number']} rejected: {req.comment}")
    return {"message": "Transfer rejected", "status": "rejected"}


@router.post("/transfers/{transfer_id}/receive")
async def receive_transfer(transfer_id: str, req: Optional[TransferReceiveRequest] = None, current_user: dict = Depends(get_current_user)):
    """Receive transfer at destination. Supports partial receive via req.lines per-line received_qty."""
    try: oid = ObjectId(transfer_id)
    except: raise HTTPException(status_code=400, detail="Invalid id")
    doc = await warehouse_transfers_col.find_one({"_id": oid})
    if not doc: raise HTTPException(status_code=404, detail="Not found")
    if doc.get("status") not in ("in_transit", "partially_received"):
        raise HTTPException(status_code=400, detail=f"Cannot receive — status: {doc.get('status')}")
    await check_outlet_access(current_user, doc["to_outlet_id"])

    # Build map of received qty from request, default = full qty
    rcv_map = {}
    if req and req.lines:
        for rl in req.lines:
            rcv_map[rl.item_id] = float(rl.received_qty)

    updated_lines = []
    all_full = True
    any_received_now = False
    variance_notes = []
    for ln in doc.get("lines", []):
        expected_total = float(ln.get("quantity", 0))
        prev_recv = float(ln.get("received_qty", 0))
        # Incremental qty received now
        if ln["item_id"] in rcv_map:
            new_recv_total = rcv_map[ln["item_id"]]
        else:
            new_recv_total = expected_total  # default full
        new_recv_total = max(0, min(new_recv_total, expected_total))  # clamp
        incremental = new_recv_total - prev_recv
        if incremental > 0:
            any_received_now = True
            await _apply_stock_delta(
                ln["item_id"], doc["to_outlet_id"], incremental,
                "transfer_in", doc["transfer_number"],
                f"Transfer {doc['transfer_number']} received ({new_recv_total}/{expected_total} {ln.get('uom','')})",
                current_user["id"],
            )
        ln["received_qty"] = new_recv_total
        if new_recv_total < expected_total:
            all_full = False
            diff = expected_total - new_recv_total
            variance_notes.append(f"{ln.get('item_name','?')}: -{diff:.2f} {ln.get('uom','')}")
        updated_lines.append(ln)

    if not any_received_now:
        raise HTTPException(status_code=400, detail="No additional quantity received")

    new_status = "received" if all_full else "partially_received"
    update_doc = {
        "status": new_status,
        "lines": updated_lines,
        "last_received_at": now_utc(),
        "updated_at": now_utc(),
    }
    if new_status == "received":
        update_doc["received_at"] = now_utc()
        update_doc["received_by"] = current_user["id"]
        update_doc["received_by_name"] = current_user.get("name", "")
        if variance_notes:
            update_doc["variance_notes"] = variance_notes
    await warehouse_transfers_col.update_one({"_id": oid}, {"$set": update_doc})
    await log_audit(current_user["id"], "receive_transfer", "warehouse", "transfer", transfer_id,
                    details=f"{doc['transfer_number']} → {new_status}")
    await ws_manager.broadcast_all({"type": "warehouse_transfer_received", "transfer_number": doc["transfer_number"], "status": new_status})
    return {"message": f"Transfer {new_status}", "status": new_status, "variance_notes": variance_notes}


@router.post("/transfers/{transfer_id}/cancel")
async def cancel_transfer(transfer_id: str, current_user: dict = Depends(get_current_user)):
    try: oid = ObjectId(transfer_id)
    except: raise HTTPException(status_code=400, detail="Invalid id")
    doc = await warehouse_transfers_col.find_one({"_id": oid})
    if not doc: raise HTTPException(status_code=404, detail="Not found")
    if doc.get("status") not in ("in_transit", "requested"):
        raise HTTPException(status_code=400, detail="Only requested or in_transit can be cancelled")
    # Restore source only if stock was already deducted (in_transit)
    if doc.get("status") == "in_transit":
        for ln in doc.get("lines", []):
            already_received = float(ln.get("received_qty", 0))
            remaining = float(ln.get("quantity", 0)) - already_received
            if remaining > 0:
                await _apply_stock_delta(
                    ln["item_id"], doc["from_outlet_id"], remaining,
                    "transfer_cancel", doc["transfer_number"],
                    f"Transfer {doc['transfer_number']} cancelled - reverted",
                    current_user["id"],
                )
    await warehouse_transfers_col.update_one(
        {"_id": oid},
        {"$set": {"status": "cancelled", "cancelled_at": now_utc(), "cancelled_by": current_user["id"], "updated_at": now_utc()}}
    )
    return {"message": "Transfer cancelled"}


@router.get("/transfers")
async def list_transfers(
    current_user: dict = Depends(get_current_user),
    outlet_id: str = "",
    status: str = "",
    date_from: str = "",
    date_to: str = "",
    skip: int = 0,
    limit: int = 30,
):
    q = {}
    if outlet_id:
        q["$or"] = [{"from_outlet_id": outlet_id}, {"to_outlet_id": outlet_id}]
    elif not current_user.get("is_superadmin"):
        oa = current_user.get("outlet_access", [])
        q["$or"] = [{"from_outlet_id": {"$in": oa}}, {"to_outlet_id": {"$in": oa}}]
    if status:
        q["status"] = status
    if date_from or date_to:
        dq = {}
        if date_from: dq["$gte"] = date_from
        if date_to: dq["$lte"] = date_to
        q["date"] = dq
    total = await warehouse_transfers_col.count_documents(q)
    cursor = warehouse_transfers_col.find(q).sort("created_at", -1).skip(skip).limit(limit)
    items = []
    async for t in cursor:
        items.append(serialize_doc(t))
    return {"transfers": items, "total": total}


# ============ ADJUSTMENTS ============
class AdjustmentLine(BaseModel):
    item_id: str
    item_name: str
    current_qty: float  # snapshot before adjustment
    new_qty: float      # desired new quantity
    uom: str = "pcs"
    reason: str
    notes: Optional[str] = ""


class AdjustmentCreate(BaseModel):
    outlet_id: str
    date: Optional[str] = None
    category: str = "manual"  # manual | correction | damage | theft | other
    reason: str
    lines: List[AdjustmentLine]
    notes: Optional[str] = ""


@router.post("/adjustments")
async def create_adjustment(req: AdjustmentCreate, current_user: dict = Depends(get_current_user)):
    await check_outlet_access(current_user, req.outlet_id)
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    count = await warehouse_adjustments_col.count_documents({"adjustment_number": {"$regex": f"^ADJ-{today}"}})
    adj_number = f"ADJ-{today}-{count + 1:04d}"
    adj_date = req.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    lines_out = []
    total_value_abs = 0.0
    for ln in req.lines:
        delta = float(ln.new_qty) - float(ln.current_qty)
        # Estimate value impact using item's cost_per_unit
        try:
            item = await items_col.find_one({"_id": ObjectId(ln.item_id)})
            cost_per_unit = (item or {}).get("cost_per_unit", 0) or 0
        except Exception:
            cost_per_unit = 0
        value_impact = delta * cost_per_unit
        total_value_abs += abs(value_impact)
        lines_out.append({**ln.dict(), "delta": delta, "value_impact": round(value_impact, 2)})

    # Get outlet-specific adjustment approval threshold
    settings = await warehouse_settings_col.find_one({"outlet_id": req.outlet_id}) or {}
    threshold = float(settings.get("adjustment_approval_threshold", 1_000_000))  # default 1jt
    requires_approval = total_value_abs > threshold and not current_user.get("is_superadmin")

    doc = {
        "adjustment_number": adj_number,
        "outlet_id": req.outlet_id,
        "date": adj_date,
        "category": req.category,
        "reason": req.reason,
        "lines": lines_out,
        "total_items": len(req.lines),
        "total_value_abs": round(total_value_abs, 2),
        "threshold_applied": threshold,
        "notes": req.notes,
        "status": "pending_approval" if requires_approval else "posted",
        "attachments": [],
        "created_by": current_user["id"],
        "created_by_name": current_user.get("name", ""),
        "created_at": now_utc(),
    }
    result = await warehouse_adjustments_col.insert_one(doc)
    adj_id = str(result.inserted_id)

    journal_number = None
    if not requires_approval:
        # Apply stock + post journal directly
        for ln in lines_out:
            if ln["delta"] != 0:
                await _apply_stock_delta(
                    ln["item_id"], req.outlet_id, float(ln["delta"]),
                    "adjustment", adj_number,
                    f"Adjustment {adj_number}: {req.reason}",
                    current_user["id"],
                )
        doc_for_post = {**doc, "_id": result.inserted_id}
        journal_result = await post_adjustment_journal(doc_for_post, current_user["id"])
        journal_number = journal_result["journal_number"] if journal_result else None
    else:
        # Notify management for approval
        try:
            from utils.notification_service import create_notification
            await create_notification(
                type="warehouse",
                title=f"Adjustment menunggu approval: {adj_number}",
                body=f"Nilai adjustment Rp {total_value_abs:,.0f} melebihi threshold Rp {threshold:,.0f}. Reason: {req.reason}",
                severity="warning",
                outlet_id=req.outlet_id,
                portal_scope=["management", "warehouse"],
                ref_type="warehouse_adjustment",
                ref_id=adj_id,
                link="/warehouse/adjustments",
            )
        except Exception as e:
            print(f"[notif] adjustment notify failed: {e}")

    await log_audit(current_user["id"], "create", "warehouse", "adjustment", adj_id,
                    details=f"{adj_number}: {len(req.lines)} items, Rp {total_value_abs:,.0f}, status: {doc['status']}")

    return {
        "id": adj_id,
        "adjustment_number": adj_number,
        "journal_number": journal_number,
        "status": doc["status"],
        "requires_approval": requires_approval,
        "total_value_abs": round(total_value_abs, 2),
        "threshold": threshold,
    }


@router.post("/adjustments/{adjustment_id}/approve")
async def approve_adjustment(adjustment_id: str, current_user: dict = Depends(get_current_user)):
    """Approve a pending adjustment: apply stock movements + auto-post journal."""
    try:
        adj = await warehouse_adjustments_col.find_one({"_id": ObjectId(adjustment_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid adjustment id")
    if not adj:
        raise HTTPException(status_code=404, detail="Adjustment not found")
    if adj.get("status") != "pending_approval":
        raise HTTPException(status_code=400, detail=f"Cannot approve: status is {adj.get('status')}")
    # permission — superadmin OR finance approver
    if not current_user.get("is_superadmin"):
        from auth import check_permission
        await check_permission(current_user, "approvals.approve")

    # Apply stock deltas now
    for ln in adj.get("lines", []):
        if ln.get("delta") and float(ln["delta"]) != 0:
            await _apply_stock_delta(
                ln["item_id"], adj["outlet_id"], float(ln["delta"]),
                "adjustment", adj["adjustment_number"],
                f"Adjustment {adj['adjustment_number']} (approved): {adj.get('reason', '')}",
                current_user["id"],
            )

    journal_result = await post_adjustment_journal(adj, current_user["id"])
    journal_number = journal_result["journal_number"] if journal_result else None

    await warehouse_adjustments_col.update_one(
        {"_id": adj["_id"]},
        {"$set": {
            "status": "posted",
            "approved_by": current_user["id"],
            "approved_by_name": current_user.get("name", ""),
            "approved_at": now_utc(),
            "journal_number": journal_number,
        }}
    )

    await log_audit(current_user["id"], "approve", "warehouse", "adjustment", adjustment_id,
                    details=f"Approved {adj['adjustment_number']} (Rp {adj.get('total_value_abs', 0):,.0f})")

    try:
        from utils.notification_service import create_notification
        await create_notification(
            type="warehouse",
            title=f"Adjustment disetujui: {adj['adjustment_number']}",
            body=f"Disetujui oleh {current_user.get('name')}. Stock & jurnal telah diposting.",
            severity="success",
            user_id=adj.get("created_by"),
            ref_type="warehouse_adjustment",
            ref_id=adjustment_id,
            link="/warehouse/adjustments",
        )
    except Exception as e:
        print(f"[notif] adjustment approve notify failed: {e}")

    return {"ok": True, "status": "posted", "journal_number": journal_number}


@router.post("/adjustments/{adjustment_id}/reject")
async def reject_adjustment(adjustment_id: str, current_user: dict = Depends(get_current_user)):
    try:
        adj = await warehouse_adjustments_col.find_one({"_id": ObjectId(adjustment_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid adjustment id")
    if not adj:
        raise HTTPException(status_code=404, detail="Adjustment not found")
    if adj.get("status") != "pending_approval":
        raise HTTPException(status_code=400, detail=f"Cannot reject: status is {adj.get('status')}")
    if not current_user.get("is_superadmin"):
        from auth import check_permission
        await check_permission(current_user, "approvals.reject")

    await warehouse_adjustments_col.update_one(
        {"_id": adj["_id"]},
        {"$set": {
            "status": "rejected",
            "rejected_by": current_user["id"],
            "rejected_by_name": current_user.get("name", ""),
            "rejected_at": now_utc(),
        }}
    )
    await log_audit(current_user["id"], "reject", "warehouse", "adjustment", adjustment_id,
                    details=f"Rejected {adj['adjustment_number']}")
    try:
        from utils.notification_service import create_notification
        await create_notification(
            type="warehouse",
            title=f"Adjustment ditolak: {adj['adjustment_number']}",
            body=f"Ditolak oleh {current_user.get('name')}. Stock tidak berubah.",
            severity="critical",
            user_id=adj.get("created_by"),
            ref_type="warehouse_adjustment",
            ref_id=adjustment_id,
            link="/warehouse/adjustments",
        )
    except Exception:
        pass
    return {"ok": True, "status": "rejected"}


@router.get("/adjustments")
async def list_adjustments(
    current_user: dict = Depends(get_current_user),
    outlet_id: str = "",
    category: str = "",
    date_from: str = "",
    date_to: str = "",
    skip: int = 0,
    limit: int = 30,
):
    q = {}
    if outlet_id:
        q["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        q["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    if category:
        q["category"] = category
    if date_from or date_to:
        dq = {}
        if date_from: dq["$gte"] = date_from
        if date_to: dq["$lte"] = date_to
        q["date"] = dq
    total = await warehouse_adjustments_col.count_documents(q)
    cursor = warehouse_adjustments_col.find(q).sort("created_at", -1).skip(skip).limit(limit)
    items = []
    async for a in cursor:
        items.append(serialize_doc(a))
    return {"adjustments": items, "total": total}


# ============ INVENTORY COUNT (Stock Opname) ============
class CountLine(BaseModel):
    item_id: str
    item_name: str
    expected_qty: float
    counted_qty: float
    uom: str = "pcs"
    notes: Optional[str] = ""


class CountCreate(BaseModel):
    outlet_id: str
    date: Optional[str] = None
    count_type: str = "full"  # full | cycle | spot
    lines: List[CountLine]
    notes: Optional[str] = ""


@router.post("/counts")
async def create_count(req: CountCreate, current_user: dict = Depends(get_current_user)):
    await check_outlet_access(current_user, req.outlet_id)
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    count = await warehouse_counts_col.count_documents({"count_number": {"$regex": f"^COUNT-{today}"}})
    count_number = f"COUNT-{today}-{count + 1:04d}"
    count_date = req.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    total_variance = 0.0
    matches = 0
    variances = 0
    lines_out = []
    for ln in req.lines:
        diff = float(ln.counted_qty) - float(ln.expected_qty)
        if diff == 0:
            matches += 1
        else:
            variances += 1
            total_variance += diff
        lines_out.append({**ln.dict(), "variance": diff})

    doc = {
        "count_number": count_number,
        "outlet_id": req.outlet_id,
        "date": count_date,
        "count_type": req.count_type,
        "lines": lines_out,
        "total_items": len(req.lines),
        "matches": matches,
        "variances": variances,
        "total_variance": total_variance,
        "notes": req.notes,
        "status": "posted",  # auto-adjusts stock to counted_qty
        "created_by": current_user["id"],
        "created_by_name": current_user.get("name", ""),
        "created_at": now_utc(),
    }
    result = await warehouse_counts_col.insert_one(doc)

    # Sync stock to counted_qty (the "truth" after a physical count)
    for ln in lines_out:
        if ln["variance"] != 0:
            await _apply_stock_delta(
                ln["item_id"], req.outlet_id, float(ln["variance"]),
                "count_adjustment", count_number,
                f"Count {count_number}: reconcile to counted qty",
                current_user["id"],
            )

    await log_audit(current_user["id"], "create", "warehouse", "count", str(result.inserted_id),
                    details=f"{count_number}: {matches} match, {variances} variance")
    return {
        "id": str(result.inserted_id),
        "count_number": count_number,
        "matches": matches,
        "variances": variances,
        "total_variance": total_variance,
    }


@router.get("/counts")
async def list_counts(
    current_user: dict = Depends(get_current_user),
    outlet_id: str = "",
    count_type: str = "",
    date_from: str = "",
    date_to: str = "",
    skip: int = 0,
    limit: int = 30,
):
    q = {}
    if outlet_id:
        q["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        q["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    if count_type:
        q["count_type"] = count_type
    if date_from or date_to:
        dq = {}
        if date_from: dq["$gte"] = date_from
        if date_to: dq["$lte"] = date_to
        q["date"] = dq
    total = await warehouse_counts_col.count_documents(q)
    cursor = warehouse_counts_col.find(q).sort("created_at", -1).skip(skip).limit(limit)
    items = []
    async for c in cursor:
        items.append(serialize_doc(c))
    return {"counts": items, "total": total}


# ============ STOCK SNAPSHOT for count pre-fill ============
@router.get("/stock-snapshot")
async def stock_snapshot(current_user: dict = Depends(get_current_user), outlet_id: str = ""):
    """Return current stock levels for an outlet — used to pre-fill count/adjustment forms."""
    if not outlet_id:
        raise HTTPException(status_code=400, detail="outlet_id required")
    await check_outlet_access(current_user, outlet_id)
    rows = []
    async for s in stock_on_hand_col.find({"outlet_id": outlet_id}).limit(500):
        row = serialize_doc(s)
        # Enrich with item name
        if row.get("item_id"):
            try:
                item = await items_col.find_one({"_id": ObjectId(row["item_id"])})
                if item:
                    row["item_name"] = item.get("name", "?")
                    row["uom"] = item.get("uom", "pcs")
                    row["category"] = item.get("category", "")
            except Exception:
                pass
        rows.append(row)
    return {"stock": rows, "total": len(rows)}


# ============ DASHBOARD ============
@router.get("/dashboard")
async def warehouse_dashboard(current_user: dict = Depends(get_current_user), outlet_id: str = ""):
    if not outlet_id:
        raise HTTPException(status_code=400, detail="outlet_id required")
    await check_outlet_access(current_user, outlet_id)

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")

    # Receipts this week
    receipts_week = 0
    receipts_value_week = 0.0
    async for r in warehouse_receipts_col.find({"outlet_id": outlet_id, "date": {"$gte": week_ago}}):
        receipts_week += 1
        receipts_value_week += float(r.get("total_value", 0) or 0)

    # In-transit transfers
    in_transit_out = await warehouse_transfers_col.count_documents({"from_outlet_id": outlet_id, "status": "in_transit"})
    in_transit_in = await warehouse_transfers_col.count_documents({"to_outlet_id": outlet_id, "status": "in_transit"})

    # Recent adjustments
    adjustments_week = await warehouse_adjustments_col.count_documents({"outlet_id": outlet_id, "date": {"$gte": week_ago}})

    # Count variance week
    count_variance_week = 0.0
    count_sessions = 0
    async for c in warehouse_counts_col.find({"outlet_id": outlet_id, "date": {"$gte": week_ago}}):
        count_sessions += 1
        count_variance_week += abs(float(c.get("total_variance", 0) or 0))

    return {
        "receipts_week": receipts_week,
        "receipts_value_week": receipts_value_week,
        "transfers_in_transit_out": in_transit_out,
        "transfers_in_transit_in": in_transit_in,
        "adjustments_week": adjustments_week,
        "count_sessions_week": count_sessions,
        "count_variance_week": count_variance_week,
    }


# ============================================================================
# WAREHOUSE SETTINGS (per outlet)
# ============================================================================

class WarehouseSettingsUpdate(BaseModel):
    adjustment_approval_threshold: Optional[float] = 1_000_000
    require_receipt_attachment: Optional[bool] = False
    auto_receive_po: Optional[bool] = False


@router.get("/settings/{outlet_id}")
async def get_warehouse_settings(outlet_id: str, current_user: dict = Depends(get_current_user)):
    await check_outlet_access(current_user, outlet_id)
    s = await warehouse_settings_col.find_one({"outlet_id": outlet_id})
    if not s:
        # Return default settings
        return {
            "outlet_id": outlet_id,
            "adjustment_approval_threshold": 1_000_000,
            "require_receipt_attachment": False,
            "auto_receive_po": False,
            "is_default": True,
        }
    return {**serialize_doc(s), "is_default": False}


@router.put("/settings/{outlet_id}")
async def update_warehouse_settings(outlet_id: str, req: WarehouseSettingsUpdate, current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_superadmin"):
        from auth import check_permission
        await check_permission(current_user, "settings.manage")
    payload = {k: v for k, v in req.dict().items() if v is not None}
    payload["outlet_id"] = outlet_id
    payload["updated_by"] = current_user["id"]
    payload["updated_at"] = now_utc()
    await warehouse_settings_col.update_one(
        {"outlet_id": outlet_id}, {"$set": payload}, upsert=True,
    )
    await log_audit(current_user["id"], "update", "warehouse", "settings", outlet_id,
                    details=f"Threshold: {payload.get('adjustment_approval_threshold')}")
    return {"ok": True, "settings": payload}


@router.get("/settings")
async def list_warehouse_settings(current_user: dict = Depends(get_current_user)):
    """List all settings (for admin overview)."""
    if not current_user.get("is_superadmin"):
        from auth import check_permission
        await check_permission(current_user, "settings.manage")
    items = []
    async for s in warehouse_settings_col.find({}):
        items.append(serialize_doc(s))
    return {"items": items}


# ============================================================================
# PURCHASE ORDERS
# ============================================================================

class POLine(BaseModel):
    item_id: str
    item_name: str
    qty: float
    unit_cost: float
    uom: str = "pcs"
    note: Optional[str] = ""


class PurchaseOrderCreate(BaseModel):
    outlet_id: str
    supplier_id: str
    supplier_name: str
    expected_date: Optional[str] = ""
    lines: List[POLine]
    notes: Optional[str] = ""


class POStatusUpdate(BaseModel):
    status: str  # submitted | approved | cancelled | closed
    comment: Optional[str] = ""


@router.post("/purchase-orders")
async def create_purchase_order(req: PurchaseOrderCreate, current_user: dict = Depends(get_current_user)):
    await check_outlet_access(current_user, req.outlet_id)
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    count = await purchase_orders_col.count_documents({"po_number": {"$regex": f"^PO-{today}"}})
    po_number = f"PO-{today}-{count + 1:04d}"

    total = 0.0
    lines_out = []
    for ln in req.lines:
        lt = float(ln.qty) * float(ln.unit_cost)
        total += lt
        lines_out.append({**ln.dict(), "line_total": round(lt, 2), "received_qty": 0})

    doc = {
        "po_number": po_number,
        "outlet_id": req.outlet_id,
        "supplier_id": req.supplier_id,
        "supplier_name": req.supplier_name,
        "expected_date": req.expected_date or "",
        "lines": lines_out,
        "total_amount": round(total, 2),
        "notes": req.notes,
        "status": "draft",
        "attachments": [],
        "created_by": current_user["id"],
        "created_by_name": current_user.get("name", ""),
        "created_at": now_utc(),
    }
    res = await purchase_orders_col.insert_one(doc)
    await log_audit(current_user["id"], "create", "warehouse", "purchase_order", str(res.inserted_id),
                    details=f"{po_number}: {len(req.lines)} items, Rp {total:,.0f}")
    return {"id": str(res.inserted_id), "po_number": po_number, "total_amount": round(total, 2), "status": "draft"}


@router.get("/purchase-orders")
async def list_purchase_orders(
    current_user: dict = Depends(get_current_user),
    outlet_id: str = "",
    status: str = "",
    search: str = "",
    skip: int = 0,
    limit: int = 50,
):
    q = {}
    if outlet_id:
        q["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        q["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    if status:
        q["status"] = status
    if search:
        q["$or"] = [
            {"po_number": {"$regex": search, "$options": "i"}},
            {"supplier_name": {"$regex": search, "$options": "i"}},
        ]
    total = await purchase_orders_col.count_documents(q)
    items = []
    async for p in purchase_orders_col.find(q).sort("created_at", -1).skip(skip).limit(limit):
        items.append(serialize_doc(p))
    return {"items": items, "total": total}


@router.get("/purchase-orders/{po_id}")
async def get_purchase_order(po_id: str, current_user: dict = Depends(get_current_user)):
    try:
        p = await purchase_orders_col.find_one({"_id": ObjectId(po_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not p:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    return serialize_doc(p)


@router.post("/purchase-orders/{po_id}/status")
async def update_po_status(po_id: str, req: POStatusUpdate, current_user: dict = Depends(get_current_user)):
    valid = ["submitted", "approved", "cancelled", "closed"]
    if req.status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {valid}")
    try:
        p = await purchase_orders_col.find_one({"_id": ObjectId(po_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not p:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    # Simple state machine
    current = p.get("status", "draft")
    allowed = {
        "draft": ["submitted", "cancelled"],
        "submitted": ["approved", "cancelled"],
        "approved": ["closed", "cancelled"],
        "partial_received": ["closed", "cancelled"],
        "received": ["closed"],
    }
    if req.status not in allowed.get(current, []):
        raise HTTPException(status_code=400, detail=f"Cannot move from '{current}' to '{req.status}'")

    patch = {"status": req.status, "updated_at": now_utc()}
    if req.status == "approved":
        patch["approved_by"] = current_user["id"]
        patch["approved_at"] = now_utc()
    elif req.status == "cancelled":
        patch["cancelled_by"] = current_user["id"]
        patch["cancelled_at"] = now_utc()
    elif req.status == "closed":
        patch["closed_by"] = current_user["id"]
        patch["closed_at"] = now_utc()
    await purchase_orders_col.update_one({"_id": p["_id"]}, {"$set": patch})
    await log_audit(current_user["id"], f"po_{req.status}", "warehouse", "purchase_order", po_id, details=req.comment or "")

    # Notify outlet / management
    try:
        from utils.notification_service import create_notification
        await create_notification(
            type="warehouse",
            title=f"PO {p['po_number']} → {req.status.upper()}",
            body=req.comment or f"Status diperbarui oleh {current_user.get('name')}",
            severity="info",
            outlet_id=p.get("outlet_id"),
            portal_scope=["warehouse", "management"],
            ref_type="purchase_order",
            ref_id=po_id,
            link="/warehouse/purchase-orders",
        )
    except Exception:
        pass
    return {"ok": True, "status": req.status}


class POReceiveLine(BaseModel):
    item_id: str
    qty_received: float
    unit_cost: Optional[float] = None  # optional override


class POReceiveRequest(BaseModel):
    lines: List[POReceiveLine]
    notes: Optional[str] = ""


@router.post("/purchase-orders/{po_id}/receive")
async def receive_po(po_id: str, req: POReceiveRequest, current_user: dict = Depends(get_current_user)):
    """Receive a (partial or full) shipment against a Purchase Order.
    Creates a warehouse receipt + applies stock + updates PO line received_qty."""
    try:
        p = await purchase_orders_col.find_one({"_id": ObjectId(po_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    if not p:
        raise HTTPException(status_code=404, detail="PO not found")
    if p.get("status") not in ("approved", "partial_received"):
        raise HTTPException(status_code=400, detail=f"Cannot receive: PO status is {p.get('status')}")
    await check_outlet_access(current_user, p["outlet_id"])

    # Build receipt doc + update PO line qty
    lines_map = {ln["item_id"]: ln for ln in p.get("lines", [])}
    receipt_lines = []
    grand_total = 0.0
    for rl in req.lines:
        base_ln = lines_map.get(rl.item_id)
        if not base_ln:
            continue
        qty = float(rl.qty_received or 0)
        if qty <= 0:
            continue
        unit_cost = float(rl.unit_cost) if rl.unit_cost is not None else float(base_ln.get("unit_cost", 0))
        subtotal = qty * unit_cost
        grand_total += subtotal
        receipt_lines.append({
            "item_id": rl.item_id,
            "item_name": base_ln.get("item_name", ""),
            "qty": qty,
            "uom": base_ln.get("uom", "pcs"),
            "unit_cost": unit_cost,
            "subtotal": round(subtotal, 2),
        })

    if not receipt_lines:
        raise HTTPException(status_code=400, detail="No valid lines to receive")

    # Create a warehouse_receipt linked to PO
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    rcount = await warehouse_receipts_col.count_documents({"receipt_number": {"$regex": f"^GRN-{today}"}})
    grn_number = f"GRN-{today}-{rcount + 1:04d}"
    receipt_doc = {
        "receipt_number": grn_number,
        "outlet_id": p["outlet_id"],
        "supplier_id": p.get("supplier_id"),
        "supplier_name": p.get("supplier_name"),
        "po_id": po_id,
        "po_number": p.get("po_number"),
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "lines": receipt_lines,
        "grand_total": round(grand_total, 2),
        "notes": req.notes,
        "status": "posted",
        "attachments": [],
        "created_by": current_user["id"],
        "created_by_name": current_user.get("name", ""),
        "created_at": now_utc(),
    }
    r_res = await warehouse_receipts_col.insert_one(receipt_doc)

    # Apply stock movements
    for ln in receipt_lines:
        await _apply_stock_delta(
            ln["item_id"], p["outlet_id"], float(ln["qty"]),
            "receipt", grn_number,
            f"Receipt {grn_number} from PO {p.get('po_number')}: {p.get('supplier_name', '')}",
            current_user["id"],
        )

    # Update PO line received_qty
    updated_lines = []
    fully_received = True
    for base_ln in p.get("lines", []):
        match = next((rl for rl in receipt_lines if rl["item_id"] == base_ln["item_id"]), None)
        new_rec = float(base_ln.get("received_qty", 0)) + (float(match["qty"]) if match else 0)
        ln2 = {**base_ln, "received_qty": new_rec}
        updated_lines.append(ln2)
        if new_rec < float(base_ln.get("qty", 0)):
            fully_received = False
    new_status = "received" if fully_received else "partial_received"
    await purchase_orders_col.update_one(
        {"_id": p["_id"]},
        {"$set": {"lines": updated_lines, "status": new_status, "updated_at": now_utc()}}
    )

    # Auto-post journal
    try:
        journal_result = await post_receipt_journal({**receipt_doc, "_id": r_res.inserted_id}, current_user["id"])
        jnumber = journal_result.get("journal_number") if journal_result else None
    except Exception as e:
        print(f"[post] PO receipt journal err: {e}")
        jnumber = None

    await log_audit(current_user["id"], "receive", "warehouse", "purchase_order", po_id,
                    details=f"Received into {grn_number} (Rp {grand_total:,.0f})")

    try:
        from utils.notification_service import create_notification
        await create_notification(
            type="warehouse",
            title=f"Barang diterima: {grn_number}",
            body=f"{p.get('po_number')} — {len(receipt_lines)} item, Rp {grand_total:,.0f}{' (PARTIAL)' if not fully_received else ''}",
            severity="success",
            outlet_id=p["outlet_id"],
            portal_scope=["warehouse", "management"],
            ref_type="warehouse_receipt",
            ref_id=str(r_res.inserted_id),
            link="/warehouse/receipts",
        )
    except Exception:
        pass

    return {
        "ok": True,
        "receipt_number": grn_number,
        "journal_number": jnumber,
        "po_status": new_status,
        "grand_total": round(grand_total, 2),
    }


# ============================================================================
# ATTACHMENTS (GridFS)
# ============================================================================
from fastapi import File, UploadFile
from fastapi.responses import StreamingResponse
import io


@router.post("/attachments/upload")
async def upload_attachment(
    ref_type: str,
    ref_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload a file attachment (receipt photo, invoice, etc.) and link it to a warehouse record.
    ref_type: 'receipt' | 'adjustment' | 'purchase_order'
    """
    allowed_refs = {
        "receipt": warehouse_receipts_col,
        "adjustment": warehouse_adjustments_col,
        "purchase_order": purchase_orders_col,
    }
    if ref_type not in allowed_refs:
        raise HTTPException(status_code=400, detail=f"Invalid ref_type. Allowed: {list(allowed_refs.keys())}")
    col = allowed_refs[ref_type]
    try:
        parent = await col.find_one({"_id": ObjectId(ref_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ref_id")
    if not parent:
        raise HTTPException(status_code=404, detail=f"{ref_type} not found")

    # Basic validation
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    metadata = {
        "ref_type": ref_type,
        "ref_id": ref_id,
        "content_type": file.content_type,
        "original_filename": file.filename,
        "uploaded_by": current_user["id"],
        "uploaded_by_name": current_user.get("name", ""),
        "uploaded_at": now_utc(),
    }
    file_id = await gridfs_bucket.upload_from_stream(
        file.filename, io.BytesIO(content), metadata=metadata,
    )

    attachment_info = {
        "file_id": str(file_id),
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(content),
        "uploaded_by_name": current_user.get("name", ""),
        "uploaded_at": metadata["uploaded_at"],
    }

    await col.update_one({"_id": parent["_id"]}, {"$push": {"attachments": attachment_info}})
    await log_audit(current_user["id"], "upload", "warehouse", "attachment", str(file_id),
                    details=f"{ref_type}/{ref_id}: {file.filename} ({len(content)} bytes)")

    return {"ok": True, "attachment": attachment_info}


@router.get("/attachments/{file_id}")
async def download_attachment(file_id: str, current_user: dict = Depends(get_current_user)):
    """Stream an attachment file back to the client."""
    try:
        oid = ObjectId(file_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")

    # Read file into memory (small files only)
    try:
        grid_out = await gridfs_bucket.open_download_stream(oid)
    except Exception:
        raise HTTPException(status_code=404, detail="Attachment not found")

    content = await grid_out.read()
    content_type = (grid_out.metadata or {}).get("content_type", "application/octet-stream")
    filename = grid_out.filename or "file"
    return StreamingResponse(
        io.BytesIO(content),
        media_type=content_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.delete("/attachments/{file_id}")
async def delete_attachment(file_id: str, current_user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(file_id)
        grid_out = await gridfs_bucket.open_download_stream(oid)
        meta = grid_out.metadata or {}
        ref_type = meta.get("ref_type")
        ref_id = meta.get("ref_id")
        await gridfs_bucket.delete(oid)
        # unlink from parent doc
        mapping = {
            "receipt": warehouse_receipts_col,
            "adjustment": warehouse_adjustments_col,
            "purchase_order": purchase_orders_col,
        }
        col = mapping.get(ref_type)
        if col and ref_id:
            await col.update_one(
                {"_id": ObjectId(ref_id)},
                {"$pull": {"attachments": {"file_id": file_id}}}
            )
        await log_audit(current_user["id"], "delete", "warehouse", "attachment", file_id, details=f"{ref_type}/{ref_id}")
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

