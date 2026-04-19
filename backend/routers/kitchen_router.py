from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId

from database import (
    pos_orders_col, waste_logs_col, items_col, outlets_col, stock_movements_col,
)
from auth import get_current_user, check_outlet_access
from utils.audit import log_audit, serialize_doc
from utils.helpers import now_utc
from websocket_manager import ws_manager

router = APIRouter(prefix="/api/kitchen", tags=["kitchen"])


VALID_STATUSES = {"queued", "preparing", "ready", "served"}


class TicketStatusRequest(BaseModel):
    status: str  # queued | preparing | ready | served


class WasteCreateRequest(BaseModel):
    outlet_id: str
    item_id: Optional[str] = None
    item_name: str
    quantity: float
    uom: str = "pcs"
    reason: str
    category: str = "spoilage"  # spoilage | overproduction | error | expired | breakage | other
    cost: Optional[float] = 0
    notes: Optional[str] = ""


# ============ QUEUE ============
@router.get("/queue")
async def get_queue(
    current_user: dict = Depends(get_current_user),
    outlet_id: str = "",
    include_served: bool = False,
):
    """Get kitchen queue for an outlet - paid orders that need kitchen attention."""
    if not outlet_id:
        if current_user.get("is_superadmin"):
            outlet_query = {}
        else:
            outlet_query = {"outlet_id": {"$in": current_user.get("outlet_access", [])}}
    else:
        await check_outlet_access(current_user, outlet_id)
        outlet_query = {"outlet_id": outlet_id}

    # Only paid orders (non-voided)
    query = {
        **outlet_query,
        "payment_status": "paid",
        "status": {"$ne": "voided"},
    }
    if not include_served:
        query["kitchen_status"] = {"$in": ["queued", "preparing", "ready"]}

    # Limit to last 24h to keep queue manageable
    cutoff = now_utc() - timedelta(hours=24)
    query["paid_at"] = {"$gte": cutoff}

    orders = []
    async for o in pos_orders_col.find(query).sort("paid_at", 1).limit(200):
        orders.append(serialize_doc(o))

    # Group by status
    groups = {"queued": [], "preparing": [], "ready": [], "served": []}
    for o in orders:
        s = o.get("kitchen_status", "queued")
        if s in groups:
            groups[s].append(o)

    # Stats
    stats = {
        "total_active": len(groups["queued"]) + len(groups["preparing"]) + len(groups["ready"]),
        "queued": len(groups["queued"]),
        "preparing": len(groups["preparing"]),
        "ready": len(groups["ready"]),
        "served": len(groups["served"]),
    }

    return {"groups": groups, "stats": stats, "total": len(orders)}


@router.post("/tickets/{order_id}/status")
async def update_ticket_status(order_id: str, req: TicketStatusRequest, current_user: dict = Depends(get_current_user)):
    """Update kitchen_status on a pos_order ticket."""
    if req.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {VALID_STATUSES}")
    try:
        oid = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    order = await pos_orders_col.find_one({"_id": oid})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("status") == "voided":
        raise HTTPException(status_code=400, detail="Cannot update voided order")

    await check_outlet_access(current_user, order["outlet_id"])

    prev = order.get("kitchen_status", "queued")

    update_fields = {
        "kitchen_status": req.status,
        "kitchen_updated_at": now_utc(),
        "kitchen_updated_by": current_user["id"],
        "updated_at": now_utc(),
    }
    # Timestamp per status transition
    status_ts_key = f"kitchen_{req.status}_at"
    update_fields[status_ts_key] = now_utc()

    await pos_orders_col.update_one({"_id": oid}, {"$set": update_fields})

    await log_audit(
        current_user["id"], "kitchen_status", "kitchen", "pos_order", order_id,
        details=f"{order.get('order_number')}: {prev} → {req.status}",
        before_value={"kitchen_status": prev},
        after_value={"kitchen_status": req.status},
    )
    await ws_manager.broadcast_all({
        "type": "kitchen_ticket_status",
        "outlet_id": order["outlet_id"],
        "order_id": order_id,
        "order_number": order.get("order_number"),
        "status": req.status,
    })
    return {"message": "Ticket status updated", "status": req.status}


@router.get("/tickets/{order_id}")
async def get_ticket(order_id: str, current_user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    order = await pos_orders_col.find_one({"_id": oid})
    if not order:
        raise HTTPException(status_code=404, detail="Not found")
    await check_outlet_access(current_user, order["outlet_id"])
    return {"ticket": serialize_doc(order)}


# ============ WASTE ============
@router.post("/waste")
async def create_waste(req: WasteCreateRequest, current_user: dict = Depends(get_current_user)):
    await check_outlet_access(current_user, req.outlet_id)
    cost = req.cost or 0
    # Try to enrich cost from items collection if item_id provided
    if req.item_id and not cost:
        try:
            it = await items_col.find_one({"_id": ObjectId(req.item_id)})
            if it and it.get("cost_per_unit"):
                cost = float(it["cost_per_unit"]) * float(req.quantity)
        except Exception:
            pass

    doc = {
        "outlet_id": req.outlet_id,
        "item_id": req.item_id,
        "item_name": req.item_name,
        "quantity": req.quantity,
        "uom": req.uom,
        "reason": req.reason,
        "category": req.category,
        "cost": cost,
        "notes": req.notes,
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "created_by": current_user["id"],
        "created_by_name": current_user.get("name", ""),
        "created_at": now_utc(),
    }
    result = await waste_logs_col.insert_one(doc)

    # Create a stock_movement for traceability if item_id present
    if req.item_id:
        try:
            await stock_movements_col.insert_one({
                "item_id": req.item_id,
                "outlet_id": req.outlet_id,
                "type": "waste",
                "quantity": -abs(float(req.quantity)),
                "reference": f"WASTE-{str(result.inserted_id)[-6:]}",
                "description": f"Waste: {req.reason}",
                "date": doc["date"],
                "status": "posted",
                "created_by": current_user["id"],
                "created_at": now_utc(),
            })
        except Exception as e:
            print(f"warn: waste stock movement failed: {e}")

    await log_audit(current_user["id"], "create", "kitchen", "waste_log", str(result.inserted_id),
                    details=f"{req.item_name} x{req.quantity} {req.uom} - {req.reason}")
    await ws_manager.broadcast_all({"type": "kitchen_waste_logged", "outlet_id": req.outlet_id, "waste_id": str(result.inserted_id)})
    return {"id": str(result.inserted_id), "message": "Waste logged", "cost": cost}


@router.get("/waste")
async def list_waste(
    current_user: dict = Depends(get_current_user),
    outlet_id: str = "",
    date_from: str = "",
    date_to: str = "",
    category: str = "",
    skip: int = 0,
    limit: int = 50,
):
    query = {}
    if outlet_id:
        await check_outlet_access(current_user, outlet_id)
        query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        query["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    if category:
        query["category"] = category
    if date_from or date_to:
        dq = {}
        if date_from:
            dq["$gte"] = date_from
        if date_to:
            dq["$lte"] = date_to
        query["date"] = dq

    total = await waste_logs_col.count_documents(query)
    total_cost = 0.0
    cursor = waste_logs_col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = []
    async for w in cursor:
        items.append(serialize_doc(w))

    # Aggregated total cost for filter
    agg = waste_logs_col.aggregate([
        {"$match": query},
        {"$group": {"_id": None, "total": {"$sum": "$cost"}, "qty": {"$sum": "$quantity"}}}
    ])
    async for r in agg:
        total_cost = r.get("total", 0) or 0

    return {"waste": items, "total": total, "total_cost": total_cost}


@router.delete("/waste/{waste_id}")
async def delete_waste(waste_id: str, current_user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(waste_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    existing = await waste_logs_col.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    await check_outlet_access(current_user, existing["outlet_id"])
    await waste_logs_col.delete_one({"_id": oid})
    await log_audit(current_user["id"], "delete", "kitchen", "waste_log", waste_id)
    return {"message": "Waste log deleted"}


# ============ DASHBOARD ============
@router.get("/dashboard")
async def kitchen_dashboard(current_user: dict = Depends(get_current_user), outlet_id: str = ""):
    if not outlet_id:
        raise HTTPException(status_code=400, detail="outlet_id required")
    await check_outlet_access(current_user, outlet_id)

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_start = datetime.fromisoformat(today).replace(tzinfo=timezone.utc)
    today_end = today_start + timedelta(days=1)

    # Today orders flowing through kitchen
    paid_today = 0
    queued = 0
    preparing = 0
    ready = 0
    served = 0
    total_prep_time_sec = 0
    prep_count = 0

    async for o in pos_orders_col.find({
        "outlet_id": outlet_id,
        "payment_status": "paid",
        "status": {"$ne": "voided"},
        "paid_at": {"$gte": today_start, "$lt": today_end},
    }):
        paid_today += 1
        s = o.get("kitchen_status", "queued")
        if s == "queued": queued += 1
        elif s == "preparing": preparing += 1
        elif s == "ready": ready += 1
        elif s == "served": served += 1
        # Simple prep time proxy: paid_at -> kitchen_ready_at
        try:
            paid_at = o.get("paid_at")
            ready_at = o.get("kitchen_ready_at")
            if paid_at and ready_at:
                delta = (ready_at - paid_at).total_seconds()
                if delta > 0 and delta < 7200:  # sanity < 2h
                    total_prep_time_sec += delta
                    prep_count += 1
        except Exception:
            pass

    avg_prep_min = round((total_prep_time_sec / prep_count) / 60, 1) if prep_count else 0

    # Today waste
    waste_today_cost = 0.0
    waste_today_count = 0
    async for w in waste_logs_col.find({"outlet_id": outlet_id, "date": today}):
        waste_today_count += 1
        waste_today_cost += float(w.get("cost", 0) or 0)

    # Top waste reasons (last 7 days)
    week_start = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
    reasons: dict = {}
    async for w in waste_logs_col.find({"outlet_id": outlet_id, "date": {"$gte": week_start}}):
        cat = w.get("category", "other")
        if cat not in reasons:
            reasons[cat] = {"category": cat, "count": 0, "cost": 0.0}
        reasons[cat]["count"] += 1
        reasons[cat]["cost"] += float(w.get("cost", 0) or 0)
    top_categories = sorted(reasons.values(), key=lambda x: x["cost"], reverse=True)[:5]

    return {
        "paid_today": paid_today,
        "queued": queued,
        "preparing": preparing,
        "ready": ready,
        "served": served,
        "avg_prep_minutes": avg_prep_min,
        "waste_today_count": waste_today_count,
        "waste_today_cost": waste_today_cost,
        "waste_categories_7d": top_categories,
    }
