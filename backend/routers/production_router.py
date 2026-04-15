from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from database import (
    production_orders_col, recipes_col, recipe_lines_col,
    items_col, stock_on_hand_col, outlets_col
)
from auth import get_current_user, check_permission, check_outlet_access
from utils.audit import log_audit, serialize_doc
from utils.helpers import now_utc
from websocket_manager import ws_manager
from bson import ObjectId
from datetime import datetime, timezone
import random, string

router = APIRouter(prefix="/api/production", tags=["production"])

def generate_po_number():
    date_part = datetime.now(timezone.utc).strftime("%Y%m%d")
    rand_part = ''.join(random.choices(string.digits, k=4))
    return f"PO-{date_part}-{rand_part}"

class ProductionOrderRequest(BaseModel):
    recipe_id: str
    outlet_id: str
    planned_quantity: float
    planned_date: Optional[str] = None
    notes: Optional[str] = ""
    priority: Optional[str] = "normal"  # low, normal, high, urgent

class ProductionCompleteRequest(BaseModel):
    actual_output: float
    waste_quantity: float = 0
    notes: Optional[str] = ""

@router.get("")
async def list_production_orders(current_user: dict = Depends(get_current_user), outlet_id: str = "", status: str = "", skip: int = 0, limit: int = 20):
    query = {}
    if outlet_id:
        query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        query["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    if status:
        query["status"] = status
    
    total = await production_orders_col.count_documents(query)
    cursor = production_orders_col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    orders = []
    async for po in cursor:
        doc = serialize_doc(po)
        # Enrich
        if po.get("recipe_id"):
            recipe = await recipes_col.find_one({"_id": ObjectId(po["recipe_id"])})
            doc["recipe_name"] = recipe.get("name", "") if recipe else ""
            if recipe and recipe.get("output_item_id"):
                item = await items_col.find_one({"_id": ObjectId(recipe["output_item_id"])})
                doc["output_item_name"] = item.get("name", "") if item else ""
        if po.get("outlet_id"):
            outlet = await outlets_col.find_one({"_id": ObjectId(po["outlet_id"])})
            doc["outlet_name"] = outlet.get("name", "") if outlet else ""
        orders.append(doc)
    return {"orders": orders, "total": total}

@router.get("/stats")
async def production_stats(current_user: dict = Depends(get_current_user), outlet_id: str = ""):
    query = {}
    if outlet_id:
        query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        query["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    
    pipeline = [{"$match": query}, {"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    stats = {}
    async for s in production_orders_col.aggregate(pipeline):
        stats[s["_id"]] = s["count"]
    return stats

@router.post("")
async def create_production_order(req: ProductionOrderRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "inventory.manage_conversions")
    await check_outlet_access(current_user, req.outlet_id)
    
    recipe = await recipes_col.find_one({"_id": ObjectId(req.recipe_id)})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    po_number = generate_po_number()
    doc = {
        "po_number": po_number,
        "recipe_id": req.recipe_id,
        "outlet_id": req.outlet_id,
        "planned_quantity": req.planned_quantity,
        "actual_output": 0,
        "waste_quantity": 0,
        "planned_date": req.planned_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "notes": req.notes,
        "priority": req.priority,
        "status": "draft",  # draft, planned, in_progress, completed, closed, cancelled
        "created_by": current_user["id"],
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    result = await production_orders_col.insert_one(doc)
    po_id = str(result.inserted_id)
    
    await log_audit(current_user["id"], "create", "inventory", "production_order", po_id, details=f"PO {po_number}: {recipe['name']} x{req.planned_quantity}")
    return {"id": po_id, "po_number": po_number, "message": "Production order created"}

@router.post("/{po_id}/start")
async def start_production(po_id: str, current_user: dict = Depends(get_current_user)):
    """Start production - deducts input materials from stock"""
    po = await production_orders_col.find_one({"_id": ObjectId(po_id)})
    if not po:
        raise HTTPException(status_code=404, detail="Production order not found")
    if po["status"] not in ["draft", "planned"]:
        raise HTTPException(status_code=400, detail=f"Cannot start: status is {po['status']}")
    
    recipe = await recipes_col.find_one({"_id": ObjectId(po["recipe_id"])})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    # Deduct input materials
    multiplier = po["planned_quantity"] / recipe.get("output_quantity", 1)
    consumed_items = []
    async for line in recipe_lines_col.find({"recipe_id": str(recipe["_id"])}):
        consume_qty = line["quantity"] * multiplier
        await stock_on_hand_col.update_one(
            {"item_id": line["item_id"], "outlet_id": po["outlet_id"]},
            {"$inc": {"quantity": -consume_qty}, "$set": {"updated_at": now_utc()}},
            upsert=True
        )
        item = await items_col.find_one({"_id": ObjectId(line["item_id"])})
        consumed_items.append({"item": item.get("name", "") if item else "", "qty": consume_qty})
    
    await production_orders_col.update_one(
        {"_id": ObjectId(po_id)},
        {"$set": {"status": "in_progress", "started_at": now_utc(), "started_by": current_user["id"], "consumed_items": consumed_items, "updated_at": now_utc()}}
    )
    
    await log_audit(current_user["id"], "start", "inventory", "production_order", po_id, details=f"Started: consumed {len(consumed_items)} ingredients")
    await ws_manager.broadcast_to_outlet(po["outlet_id"], {"type": "production_started", "po_id": po_id, "po_number": po["po_number"]})
    return {"message": "Production started, materials consumed", "consumed": consumed_items}

@router.post("/{po_id}/complete")
async def complete_production(po_id: str, req: ProductionCompleteRequest, current_user: dict = Depends(get_current_user)):
    """Complete production - adds output to stock"""
    po = await production_orders_col.find_one({"_id": ObjectId(po_id)})
    if not po:
        raise HTTPException(status_code=404, detail="Production order not found")
    if po["status"] != "in_progress":
        raise HTTPException(status_code=400, detail=f"Cannot complete: status is {po['status']}")
    
    recipe = await recipes_col.find_one({"_id": ObjectId(po["recipe_id"])})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    # Add output to stock
    await stock_on_hand_col.update_one(
        {"item_id": recipe["output_item_id"], "outlet_id": po["outlet_id"]},
        {"$inc": {"quantity": req.actual_output}, "$set": {"updated_at": now_utc()}},
        upsert=True
    )
    
    yield_pct = (req.actual_output / po["planned_quantity"] * 100) if po["planned_quantity"] > 0 else 0
    
    await production_orders_col.update_one(
        {"_id": ObjectId(po_id)},
        {"$set": {
            "status": "completed", "actual_output": req.actual_output,
            "waste_quantity": req.waste_quantity, "yield_percentage": yield_pct,
            "completed_at": now_utc(), "completed_by": current_user["id"],
            "completion_notes": req.notes, "updated_at": now_utc(),
        }}
    )
    
    await log_audit(current_user["id"], "complete", "inventory", "production_order", po_id, details=f"Output: {req.actual_output}, Waste: {req.waste_quantity}, Yield: {yield_pct:.1f}%")
    await ws_manager.broadcast_to_outlet(po["outlet_id"], {"type": "production_completed", "po_id": po_id})
    return {"message": "Production completed", "yield_percentage": yield_pct}

@router.post("/{po_id}/cancel")
async def cancel_production(po_id: str, current_user: dict = Depends(get_current_user)):
    po = await production_orders_col.find_one({"_id": ObjectId(po_id)})
    if not po:
        raise HTTPException(status_code=404, detail="Production order not found")
    if po["status"] in ["completed", "closed", "cancelled"]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel: status is {po['status']}")
    
    await production_orders_col.update_one(
        {"_id": ObjectId(po_id)},
        {"$set": {"status": "cancelled", "cancelled_by": current_user["id"], "cancelled_at": now_utc(), "updated_at": now_utc()}}
    )
    await log_audit(current_user["id"], "cancel", "inventory", "production_order", po_id)
    return {"message": "Production order cancelled"}
