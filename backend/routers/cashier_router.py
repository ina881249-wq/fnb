from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId

from database import (
    menu_items_col, cashier_shifts_col, pos_orders_col,
    outlets_col, items_col, sales_summaries_col, cash_movements_col,
    accounts_col,
)
from auth import get_current_user, check_outlet_access
from utils.audit import log_audit, serialize_doc
from utils.helpers import now_utc
from websocket_manager import ws_manager

router = APIRouter(prefix="/api/cashier", tags=["cashier"])


# ============ MENU ITEMS ============
class MenuItemCreate(BaseModel):
    name: str
    category: str = "Main"
    price: float
    description: Optional[str] = ""
    item_id: Optional[str] = None  # link to items (BOM/inventory)
    image_url: Optional[str] = None
    active: bool = True
    available_outlets: List[str] = []  # empty = all


class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    description: Optional[str] = None
    item_id: Optional[str] = None
    image_url: Optional[str] = None
    active: Optional[bool] = None
    available_outlets: Optional[List[str]] = None


@router.get("/menu")
async def list_menu_items(
    current_user: dict = Depends(get_current_user),
    category: str = "",
    search: str = "",
    outlet_id: str = "",
    active_only: bool = True,
):
    query = {}
    if active_only:
        query["active"] = True
    if category:
        query["category"] = category
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    items = []
    async for m in menu_items_col.find(query).sort("category", 1):
        doc = serialize_doc(m)
        # outlet filtering
        if outlet_id and doc.get("available_outlets"):
            if outlet_id not in doc["available_outlets"]:
                continue
        items.append(doc)
    # Collect categories
    cats = sorted({i.get("category", "Main") for i in items})
    return {"items": items, "categories": cats, "total": len(items)}


@router.post("/menu")
async def create_menu_item(req: MenuItemCreate, current_user: dict = Depends(get_current_user)):
    doc = req.dict()
    doc["created_at"] = now_utc()
    doc["updated_at"] = now_utc()
    doc["created_by"] = current_user["id"]
    result = await menu_items_col.insert_one(doc)
    await log_audit(current_user["id"], "create", "cashier", "menu_item", str(result.inserted_id), details=f"Created menu: {req.name}")
    return {"id": str(result.inserted_id), "message": "Menu item created"}


@router.put("/menu/{item_id}")
async def update_menu_item(item_id: str, req: MenuItemUpdate, current_user: dict = Depends(get_current_user)):
    update = {k: v for k, v in req.dict().items() if v is not None}
    update["updated_at"] = now_utc()
    try:
        oid = ObjectId(item_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    result = await menu_items_col.update_one({"_id": oid}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    await log_audit(current_user["id"], "update", "cashier", "menu_item", item_id, details="Updated menu")
    return {"message": "Menu item updated"}


@router.delete("/menu/{item_id}")
async def delete_menu_item(item_id: str, current_user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(item_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    result = await menu_items_col.update_one({"_id": oid}, {"$set": {"active": False, "updated_at": now_utc()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    await log_audit(current_user["id"], "deactivate", "cashier", "menu_item", item_id)
    return {"message": "Menu item deactivated"}


# ============ SHIFTS ============
class ShiftOpenRequest(BaseModel):
    outlet_id: str
    opening_cash: float = 0
    notes: Optional[str] = ""


class ShiftCloseRequest(BaseModel):
    actual_cash: float
    notes: Optional[str] = ""


async def _recompute_shift_totals(shift_id: str) -> dict:
    """Aggregate paid orders for a shift. Returns totals dict."""
    totals = {
        "total_orders": 0,
        "total_sales": 0.0,
        "cash_sales": 0.0,
        "card_sales": 0.0,
        "online_sales": 0.0,
        "other_sales": 0.0,
        "voided_orders": 0,
    }
    async for o in pos_orders_col.find({"shift_id": shift_id}):
        if o.get("status") == "voided":
            totals["voided_orders"] += 1
            continue
        if o.get("payment_status") != "paid":
            continue
        totals["total_orders"] += 1
        total = float(o.get("total", 0))
        totals["total_sales"] += total
        pm = o.get("payment_method", "cash")
        if pm == "cash":
            totals["cash_sales"] += total
        elif pm == "card":
            totals["card_sales"] += total
        elif pm == "online" or pm == "qris":
            totals["online_sales"] += total
        else:
            totals["other_sales"] += total
    return totals


@router.post("/shifts/open")
async def open_shift(req: ShiftOpenRequest, current_user: dict = Depends(get_current_user)):
    await check_outlet_access(current_user, req.outlet_id)
    # Only one open shift per user+outlet
    existing = await cashier_shifts_col.find_one({
        "cashier_id": current_user["id"],
        "outlet_id": req.outlet_id,
        "status": "open",
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already have an open shift on this outlet. Close it first.")
    # Shift number
    count = await cashier_shifts_col.count_documents({"outlet_id": req.outlet_id})
    shift_number = f"SHF-{req.outlet_id[-4:]}-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{count + 1:04d}"
    doc = {
        "shift_number": shift_number,
        "outlet_id": req.outlet_id,
        "cashier_id": current_user["id"],
        "cashier_name": current_user.get("name", ""),
        "opening_cash": req.opening_cash,
        "opening_notes": req.notes,
        "status": "open",
        "opened_at": now_utc(),
        "closed_at": None,
        "totals": {},
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    result = await cashier_shifts_col.insert_one(doc)
    await log_audit(current_user["id"], "open_shift", "cashier", "shift", str(result.inserted_id), details=f"Opening cash: {req.opening_cash}")
    await ws_manager.broadcast_all({"type": "shift_opened", "outlet_id": req.outlet_id, "shift_id": str(result.inserted_id)})
    return {"id": str(result.inserted_id), "shift_number": shift_number, "message": "Shift opened"}


@router.get("/shifts/current")
async def get_current_shift(current_user: dict = Depends(get_current_user), outlet_id: str = ""):
    if not outlet_id:
        raise HTTPException(status_code=400, detail="outlet_id required")
    shift = await cashier_shifts_col.find_one({
        "cashier_id": current_user["id"],
        "outlet_id": outlet_id,
        "status": "open",
    })
    if not shift:
        return {"shift": None}
    doc = serialize_doc(shift)
    # live totals
    doc["totals"] = await _recompute_shift_totals(str(shift["_id"]))
    return {"shift": doc}


@router.get("/shifts")
async def list_shifts(
    current_user: dict = Depends(get_current_user),
    outlet_id: str = "",
    status: str = "",
    date_from: str = "",
    date_to: str = "",
    skip: int = 0,
    limit: int = 20,
):
    query = {}
    if outlet_id:
        query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        query["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    if status:
        query["status"] = status
    if date_from or date_to:
        dq = {}
        if date_from:
            dq["$gte"] = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
        if date_to:
            dq["$lte"] = datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc) + timedelta(days=1)
        query["opened_at"] = dq

    total = await cashier_shifts_col.count_documents(query)
    cursor = cashier_shifts_col.find(query).sort("opened_at", -1).skip(skip).limit(limit)
    shifts = []
    async for s in cursor:
        doc = serialize_doc(s)
        outlet = await outlets_col.find_one({"_id": ObjectId(s["outlet_id"])}) if s.get("outlet_id") else None
        doc["outlet_name"] = outlet.get("name", "") if outlet else ""
        shifts.append(doc)
    return {"shifts": shifts, "total": total}


@router.get("/shifts/{shift_id}")
async def get_shift(shift_id: str, current_user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(shift_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    shift = await cashier_shifts_col.find_one({"_id": oid})
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    doc = serialize_doc(shift)
    doc["totals"] = await _recompute_shift_totals(shift_id)
    # Include orders count
    orders = []
    async for o in pos_orders_col.find({"shift_id": shift_id}).sort("created_at", -1):
        orders.append(serialize_doc(o))
    doc["orders"] = orders
    return {"shift": doc}


@router.post("/shifts/{shift_id}/close")
async def close_shift(shift_id: str, req: ShiftCloseRequest, current_user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(shift_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    shift = await cashier_shifts_col.find_one({"_id": oid})
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    if shift.get("status") != "open":
        raise HTTPException(status_code=400, detail=f"Shift is {shift.get('status')}")
    if shift.get("cashier_id") != current_user["id"] and not current_user.get("is_superadmin"):
        raise HTTPException(status_code=403, detail="Only owner or admin can close this shift")

    totals = await _recompute_shift_totals(shift_id)
    expected_cash = float(shift.get("opening_cash", 0)) + totals["cash_sales"]
    variance = float(req.actual_cash) - expected_cash

    await cashier_shifts_col.update_one(
        {"_id": oid},
        {"$set": {
            "status": "closed",
            "closed_at": now_utc(),
            "closing_cash_actual": req.actual_cash,
            "closing_cash_expected": expected_cash,
            "variance": variance,
            "closing_notes": req.notes,
            "totals": totals,
            "updated_at": now_utc(),
        }}
    )
    # Auto-create a sales summary for the day from shift totals (additive)
    try:
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        existing_ss = await sales_summaries_col.find_one({"outlet_id": shift["outlet_id"], "date": date_str, "source": "cashier_shift"})
        summary_payload = {
            "outlet_id": shift["outlet_id"],
            "date": date_str,
            "total_sales": totals["total_sales"],
            "cash_sales": totals["cash_sales"],
            "card_sales": totals["card_sales"],
            "online_sales": totals["online_sales"],
            "other_sales": totals["other_sales"],
            "notes": f"Auto-generated from shift {shift.get('shift_number')}",
            "created_by": current_user["id"],
            "created_at": now_utc(),
            "source": "cashier_shift",
            "shift_id": shift_id,
        }
        if existing_ss:
            # accumulate if multiple shifts per day
            summary_payload["total_sales"] += existing_ss.get("total_sales", 0)
            summary_payload["cash_sales"] += existing_ss.get("cash_sales", 0)
            summary_payload["card_sales"] += existing_ss.get("card_sales", 0)
            summary_payload["online_sales"] += existing_ss.get("online_sales", 0)
            summary_payload["other_sales"] += existing_ss.get("other_sales", 0)
            await sales_summaries_col.update_one({"_id": existing_ss["_id"]}, {"$set": summary_payload})
            ss_id = existing_ss["_id"]
        else:
            ins = await sales_summaries_col.insert_one(summary_payload)
            ss_id = ins.inserted_id
        # Auto-post journal for this sales summary
        try:
            from utils.posting_service import post_sales_summary_journal
            ss_full = await sales_summaries_col.find_one({"_id": ss_id})
            if ss_full:
                # If updated, force repost to reflect new totals
                await post_sales_summary_journal(ss_full, current_user["id"], force=bool(existing_ss))
        except Exception as e:
            print(f"Auto-journal sales_summary (cashier) error: {e}")
    except Exception as e:
        print(f"Warning: failed to create sales summary: {e}")

    await log_audit(current_user["id"], "close_shift", "cashier", "shift", shift_id,
                    details=f"Closed. Expected cash: {expected_cash}, Actual: {req.actual_cash}, Variance: {variance}")
    await ws_manager.broadcast_all({"type": "shift_closed", "outlet_id": shift["outlet_id"], "shift_id": shift_id, "variance": variance})
    return {
        "message": "Shift closed",
        "totals": totals,
        "expected_cash": expected_cash,
        "actual_cash": req.actual_cash,
        "variance": variance,
    }


# ============ POS ORDERS ============
class OrderLineReq(BaseModel):
    menu_item_id: str
    name: str
    qty: int = 1
    price: float
    notes: Optional[str] = ""


class OrderCreateRequest(BaseModel):
    outlet_id: str
    order_type: str = "dine_in"  # dine_in | takeaway | delivery
    customer_name: Optional[str] = ""
    table_number: Optional[str] = ""
    lines: List[OrderLineReq]
    notes: Optional[str] = ""
    discount: float = 0
    tax_rate: float = 0  # percent


class OrderPayRequest(BaseModel):
    payment_method: str  # cash | card | qris | online | other
    amount_tendered: float
    notes: Optional[str] = ""


class OrderVoidRequest(BaseModel):
    reason: str


async def _next_order_number(outlet_id: str) -> str:
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    count = await pos_orders_col.count_documents({
        "outlet_id": outlet_id,
        "order_number": {"$regex": f"^POS-{today}"}
    })
    return f"POS-{today}-{outlet_id[-4:]}-{count + 1:04d}"


@router.post("/orders")
async def create_order(req: OrderCreateRequest, current_user: dict = Depends(get_current_user)):
    await check_outlet_access(current_user, req.outlet_id)
    # Need an open shift for this cashier
    shift = await cashier_shifts_col.find_one({
        "cashier_id": current_user["id"],
        "outlet_id": req.outlet_id,
        "status": "open",
    })
    if not shift:
        raise HTTPException(status_code=400, detail="Please open a shift before creating orders")

    subtotal = sum(l.qty * l.price for l in req.lines)
    tax = round(subtotal * (req.tax_rate / 100), 2)
    total = subtotal + tax - (req.discount or 0)
    if total < 0:
        total = 0

    order_number = await _next_order_number(req.outlet_id)
    doc = {
        "order_number": order_number,
        "outlet_id": req.outlet_id,
        "shift_id": str(shift["_id"]),
        "cashier_id": current_user["id"],
        "cashier_name": current_user.get("name", ""),
        "order_type": req.order_type,
        "customer_name": req.customer_name,
        "table_number": req.table_number,
        "lines": [l.dict() for l in req.lines],
        "subtotal": subtotal,
        "discount": req.discount or 0,
        "tax_rate": req.tax_rate,
        "tax": tax,
        "total": total,
        "notes": req.notes,
        "status": "open",  # open | paid | voided
        "payment_status": "unpaid",
        "payment_method": None,
        "kitchen_status": "queued",  # queued | preparing | ready | served
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    result = await pos_orders_col.insert_one(doc)
    await log_audit(current_user["id"], "create", "cashier", "pos_order", str(result.inserted_id), details=f"{order_number} - {total}")
    await ws_manager.broadcast_all({"type": "pos_order_created", "outlet_id": req.outlet_id, "order_id": str(result.inserted_id), "order_number": order_number})
    created = await pos_orders_col.find_one({"_id": result.inserted_id})
    return {"order": serialize_doc(created)}


@router.get("/orders")
async def list_orders(
    current_user: dict = Depends(get_current_user),
    outlet_id: str = "",
    status: str = "",
    payment_status: str = "",
    shift_id: str = "",
    search: str = "",
    date: str = "",
    skip: int = 0,
    limit: int = 30,
):
    query = {}
    if outlet_id:
        query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        query["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    if status:
        query["status"] = status
    if payment_status:
        query["payment_status"] = payment_status
    if shift_id:
        query["shift_id"] = shift_id
    if search:
        query["$or"] = [
            {"order_number": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"table_number": {"$regex": search, "$options": "i"}},
        ]
    if date:
        start = datetime.fromisoformat(date).replace(tzinfo=timezone.utc)
        end = start + timedelta(days=1)
        query["created_at"] = {"$gte": start, "$lt": end}

    total = await pos_orders_col.count_documents(query)
    cursor = pos_orders_col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = []
    async for o in cursor:
        items.append(serialize_doc(o))
    return {"orders": items, "total": total}


@router.get("/orders/{order_id}")
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    order = await pos_orders_col.find_one({"_id": oid})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"order": serialize_doc(order)}


@router.post("/orders/{order_id}/pay")
async def pay_order(order_id: str, req: OrderPayRequest, current_user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    order = await pos_orders_col.find_one({"_id": oid})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("status") == "voided":
        raise HTTPException(status_code=400, detail="Order is voided")
    if order.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Order already paid")

    total = float(order.get("total", 0))
    change = float(req.amount_tendered) - total if req.payment_method == "cash" else 0
    if req.payment_method == "cash" and req.amount_tendered < total:
        raise HTTPException(status_code=400, detail=f"Insufficient cash. Total: {total}, Tendered: {req.amount_tendered}")

    await pos_orders_col.update_one(
        {"_id": oid},
        {"$set": {
            "payment_status": "paid",
            "payment_method": req.payment_method,
            "amount_tendered": req.amount_tendered,
            "change_amount": change,
            "paid_at": now_utc(),
            "status": "paid",
            "updated_at": now_utc(),
        }}
    )
    await log_audit(current_user["id"], "pay", "cashier", "pos_order", order_id,
                    details=f"{order.get('order_number')} - {req.payment_method} {total}")
    await ws_manager.broadcast_all({
        "type": "pos_order_paid",
        "outlet_id": order["outlet_id"],
        "order_id": order_id,
        "order_number": order.get("order_number"),
    })
    # Notify kitchen immediately
    await ws_manager.broadcast_all({
        "type": "kitchen_ticket_new",
        "outlet_id": order["outlet_id"],
        "order_id": order_id,
        "order_number": order.get("order_number"),
    })
    updated = await pos_orders_col.find_one({"_id": oid})
    return {"order": serialize_doc(updated), "change": change}


@router.post("/orders/{order_id}/void")
async def void_order(order_id: str, req: OrderVoidRequest, current_user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    order = await pos_orders_col.find_one({"_id": oid})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("status") == "voided":
        raise HTTPException(status_code=400, detail="Already voided")
    await pos_orders_col.update_one(
        {"_id": oid},
        {"$set": {
            "status": "voided",
            "voided_at": now_utc(),
            "voided_by": current_user["id"],
            "void_reason": req.reason,
            "updated_at": now_utc(),
        }}
    )
    await log_audit(current_user["id"], "void", "cashier", "pos_order", order_id, details=f"Void: {req.reason}")
    await ws_manager.broadcast_all({"type": "pos_order_voided", "outlet_id": order["outlet_id"], "order_id": order_id})
    return {"message": "Order voided"}


# ============ DASHBOARD ============
@router.get("/dashboard")
async def cashier_dashboard(current_user: dict = Depends(get_current_user), outlet_id: str = ""):
    if not outlet_id:
        raise HTTPException(status_code=400, detail="outlet_id required")
    await check_outlet_access(current_user, outlet_id)

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_start = datetime.fromisoformat(today).replace(tzinfo=timezone.utc)
    today_end = today_start + timedelta(days=1)

    orders_today = 0
    sales_today = 0.0
    async for o in pos_orders_col.find({
        "outlet_id": outlet_id,
        "created_at": {"$gte": today_start, "$lt": today_end},
        "payment_status": "paid",
        "status": "paid",
    }):
        orders_today += 1
        sales_today += float(o.get("total", 0))

    open_orders = await pos_orders_col.count_documents({
        "outlet_id": outlet_id,
        "status": "open",
    })

    current_shift = await cashier_shifts_col.find_one({
        "cashier_id": current_user["id"],
        "outlet_id": outlet_id,
        "status": "open",
    })

    # Top items today
    top_items_map: dict = {}
    async for o in pos_orders_col.find({
        "outlet_id": outlet_id,
        "created_at": {"$gte": today_start, "$lt": today_end},
        "payment_status": "paid",
    }):
        for ln in o.get("lines", []):
            key = ln.get("name", "Unknown")
            if key not in top_items_map:
                top_items_map[key] = {"name": key, "qty": 0, "revenue": 0.0}
            top_items_map[key]["qty"] += int(ln.get("qty", 0))
            top_items_map[key]["revenue"] += float(ln.get("qty", 0)) * float(ln.get("price", 0))
    top_items = sorted(top_items_map.values(), key=lambda x: x["revenue"], reverse=True)[:5]

    return {
        "today_orders": orders_today,
        "today_sales": sales_today,
        "open_orders": open_orders,
        "current_shift": serialize_doc(current_shift) if current_shift else None,
        "top_items": top_items,
    }


# ============ SEED HELPERS (exposed for manual reseed) ============
@router.post("/menu/seed-defaults")
async def seed_default_menu(current_user: dict = Depends(get_current_user)):
    """Admin helper: seed default Indonesian F&B menu if empty."""
    if not current_user.get("is_superadmin"):
        raise HTTPException(status_code=403, detail="Admin only")
    existing = await menu_items_col.count_documents({})
    if existing > 0:
        return {"message": f"Menu already has {existing} items"}
    defaults = [
        # Food
        {"name": "Nasi Rendang", "category": "Makanan", "price": 45000, "description": "Nasi dengan rendang khas Padang"},
        {"name": "Nasi Ayam Goreng", "category": "Makanan", "price": 32000, "description": "Nasi dengan ayam goreng kremes"},
        {"name": "Nasi Gurame Bakar", "category": "Makanan", "price": 55000, "description": "Nasi dengan ikan gurame bakar"},
        {"name": "Nasi Soto Ayam", "category": "Makanan", "price": 30000, "description": "Soto ayam kuah bening"},
        {"name": "Mie Goreng Spesial", "category": "Makanan", "price": 28000, "description": "Mie goreng dengan ayam & sayur"},
        {"name": "Gado-gado", "category": "Makanan", "price": 25000, "description": "Sayur dengan bumbu kacang"},
        # Drinks
        {"name": "Es Teh Manis", "category": "Minuman", "price": 8000, "description": "Teh dingin manis"},
        {"name": "Teh Hangat", "category": "Minuman", "price": 6000, "description": "Teh panas tawar/manis"},
        {"name": "Kopi Tubruk", "category": "Minuman", "price": 12000, "description": "Kopi hitam panas"},
        {"name": "Es Jeruk", "category": "Minuman", "price": 12000, "description": "Jeruk peras dingin"},
        {"name": "Air Mineral", "category": "Minuman", "price": 5000, "description": "Botol 600ml"},
        # Sides
        {"name": "Kerupuk", "category": "Pendamping", "price": 5000, "description": "Kerupuk putih"},
        {"name": "Tempe Goreng", "category": "Pendamping", "price": 10000, "description": "3pcs tempe goreng"},
        {"name": "Tahu Goreng", "category": "Pendamping", "price": 10000, "description": "3pcs tahu goreng"},
        # Dessert
        {"name": "Es Campur", "category": "Dessert", "price": 18000, "description": "Aneka buah & cincau"},
        {"name": "Pisang Goreng", "category": "Dessert", "price": 15000, "description": "Pisang goreng madu"},
    ]
    now = now_utc()
    for d in defaults:
        d.update({"active": True, "available_outlets": [], "created_at": now, "updated_at": now, "created_by": current_user["id"]})
    result = await menu_items_col.insert_many(defaults)
    return {"message": f"Seeded {len(result.inserted_ids)} menu items"}
