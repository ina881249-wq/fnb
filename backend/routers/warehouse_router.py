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
    for ln in req.lines:
        delta = float(ln.new_qty) - float(ln.current_qty)
        lines_out.append({**ln.dict(), "delta": delta})

    doc = {
        "adjustment_number": adj_number,
        "outlet_id": req.outlet_id,
        "date": adj_date,
        "category": req.category,
        "reason": req.reason,
        "lines": lines_out,
        "total_items": len(req.lines),
        "notes": req.notes,
        "status": "posted",
        "created_by": current_user["id"],
        "created_by_name": current_user.get("name", ""),
        "created_at": now_utc(),
    }
    result = await warehouse_adjustments_col.insert_one(doc)

    # Apply
    for ln in lines_out:
        if ln["delta"] != 0:
            await _apply_stock_delta(
                ln["item_id"], req.outlet_id, float(ln["delta"]),
                "adjustment", adj_number,
                f"Adjustment {adj_number}: {req.reason}",
                current_user["id"],
            )

    await log_audit(current_user["id"], "create", "warehouse", "adjustment", str(result.inserted_id),
                    details=f"{adj_number}: {len(req.lines)} items, reason: {req.reason}")

    # Auto-post journal (gain/loss vs Misc Expense)
    doc_for_post = {**doc, "_id": result.inserted_id}
    journal_result = await post_adjustment_journal(doc_for_post, current_user["id"])
    journal_number = journal_result["journal_number"] if journal_result else None

    return {"id": str(result.inserted_id), "adjustment_number": adj_number, "journal_number": journal_number}


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
