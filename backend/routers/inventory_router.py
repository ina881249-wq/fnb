from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from database import (
    items_col, material_hierarchy_col, stock_movements_col,
    stock_on_hand_col, inventory_conversions_col, outlets_col
)
from auth import get_current_user, check_permission, check_outlet_access
from utils.audit import log_audit, serialize_doc
from utils.helpers import now_utc
from websocket_manager import ws_manager
from bson import ObjectId

router = APIRouter(prefix="/api/inventory", tags=["inventory"])

# ===================== ITEMS =====================
class ItemRequest(BaseModel):
    name: str
    category: str
    uom: str  # unit of measure: kg, liter, piece, pack, etc.
    pack_size: Optional[float] = 1
    material_level: str = "raw"  # raw, prep, sub_prep
    reorder_threshold: Optional[float] = 0
    cost_per_unit: Optional[float] = 0
    description: Optional[str] = ""
    active: bool = True
    outlet_applicability: List[str] = []  # empty = all outlets

@router.get("/items")
async def list_items(current_user: dict = Depends(get_current_user), category: str = "", material_level: str = "", search: str = "", skip: int = 0, limit: int = 50, active_only: bool = True):
    query = {}
    if category:
        query["category"] = category
    if material_level:
        query["material_level"] = material_level
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if active_only:
        query["active"] = True
    total = await items_col.count_documents(query)
    cursor = items_col.find(query).sort("name", 1).skip(skip).limit(limit)
    items = []
    async for i in cursor:
        items.append(serialize_doc(i))
    return {"items": items, "total": total}

@router.post("/items")
async def create_item(req: ItemRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "inventory.manage_items")
    doc = {
        **req.dict(),
        "created_at": now_utc(),
        "updated_at": now_utc(),
        "created_by": current_user["id"],
    }
    result = await items_col.insert_one(doc)
    await log_audit(current_user["id"], "create", "inventory", "item", str(result.inserted_id), details=f"Created item {req.name}")
    return {"id": str(result.inserted_id), "message": "Item created"}

@router.put("/items/{item_id}")
async def update_item(item_id: str, req: ItemRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "inventory.manage_items")
    update = {**req.dict(), "updated_at": now_utc()}
    result = await items_col.update_one({"_id": ObjectId(item_id)}, {"$set": update})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    await log_audit(current_user["id"], "update", "inventory", "item", item_id)
    return {"message": "Item updated"}

@router.delete("/items/{item_id}")
async def delete_item(item_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "inventory.manage_items")
    await items_col.update_one({"_id": ObjectId(item_id)}, {"$set": {"active": False, "updated_at": now_utc()}})
    await log_audit(current_user["id"], "deactivate", "inventory", "item", item_id)
    return {"message": "Item deactivated"}

@router.get("/categories")
async def list_categories(current_user: dict = Depends(get_current_user)):
    categories = await items_col.distinct("category")
    return {"categories": categories}

# ===================== MATERIAL HIERARCHY =====================
class MaterialHierarchyRequest(BaseModel):
    parent_item_id: str
    child_item_id: str
    conversion_ratio: float  # How much child is needed for 1 unit of parent
    yield_percentage: float = 100
    notes: Optional[str] = ""

@router.get("/hierarchy")
async def list_hierarchy(current_user: dict = Depends(get_current_user), parent_item_id: str = ""):
    query = {}
    if parent_item_id:
        query["parent_item_id"] = parent_item_id
    hierarchy = []
    async for h in material_hierarchy_col.find(query):
        doc = serialize_doc(h)
        # Enrich with item names
        parent = await items_col.find_one({"_id": ObjectId(h["parent_item_id"])})
        child = await items_col.find_one({"_id": ObjectId(h["child_item_id"])})
        doc["parent_name"] = parent.get("name", "") if parent else ""
        doc["child_name"] = child.get("name", "") if child else ""
        hierarchy.append(doc)
    return {"hierarchy": hierarchy}

@router.post("/hierarchy")
async def create_hierarchy(req: MaterialHierarchyRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "inventory.manage_hierarchy")
    doc = {**req.dict(), "created_at": now_utc(), "created_by": current_user["id"]}
    result = await material_hierarchy_col.insert_one(doc)
    await log_audit(current_user["id"], "create", "inventory", "hierarchy", str(result.inserted_id))
    return {"id": str(result.inserted_id), "message": "Hierarchy link created"}

@router.delete("/hierarchy/{hierarchy_id}")
async def delete_hierarchy(hierarchy_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "inventory.manage_hierarchy")
    await material_hierarchy_col.delete_one({"_id": ObjectId(hierarchy_id)})
    return {"message": "Hierarchy link removed"}

# ===================== STOCK MOVEMENTS =====================
class StockMovementRequest(BaseModel):
    type: str  # count, adjustment, waste, transfer, spoilage, quarantine
    item_id: str
    outlet_id: str
    quantity: float
    to_outlet_id: Optional[str] = None  # For transfers
    reason: Optional[str] = ""
    reference: Optional[str] = ""
    cost_per_unit: Optional[float] = 0
    date: Optional[str] = None

@router.get("/stock-movements")
async def list_stock_movements(current_user: dict = Depends(get_current_user), outlet_id: str = "", item_id: str = "", type: str = "", skip: int = 0, limit: int = 50):
    query = {}
    if outlet_id:
        await check_outlet_access(current_user, outlet_id)
        query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        query["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    if item_id:
        query["item_id"] = item_id
    if type:
        query["type"] = type
    total = await stock_movements_col.count_documents(query)
    cursor = stock_movements_col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    movements = []
    async for m in cursor:
        doc = serialize_doc(m)
        item = await items_col.find_one({"_id": ObjectId(m["item_id"])})
        doc["item_name"] = item.get("name", "") if item else ""
        doc["item_uom"] = item.get("uom", "") if item else ""
        movements.append(doc)
    return {"movements": movements, "total": total}

@router.post("/stock-movements")
async def create_stock_movement(req: StockMovementRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "inventory.create_stock_movement")
    await check_outlet_access(current_user, req.outlet_id)
    
    doc = {
        **req.dict(),
        "date": req.date or now_utc().strftime("%Y-%m-%d"),
        "created_by": current_user["id"],
        "created_at": now_utc(),
    }
    result = await stock_movements_col.insert_one(doc)
    movement_id = str(result.inserted_id)
    
    # Update stock on hand
    qty_change = req.quantity
    if req.type in ["waste", "spoilage", "transfer"]:
        qty_change = -abs(req.quantity)
    elif req.type == "adjustment":
        # Adjustment can be positive or negative
        pass
    elif req.type == "count":
        # Set absolute quantity
        await stock_on_hand_col.update_one(
            {"item_id": req.item_id, "outlet_id": req.outlet_id},
            {"$set": {"quantity": req.quantity, "updated_at": now_utc()}},
            upsert=True
        )
        await log_audit(current_user["id"], "create", "inventory", "stock_movement", movement_id, details=f"{req.type}: {req.quantity}")
        return {"id": movement_id, "message": "Stock movement recorded"}
    
    await stock_on_hand_col.update_one(
        {"item_id": req.item_id, "outlet_id": req.outlet_id},
        {"$inc": {"quantity": qty_change}, "$set": {"updated_at": now_utc()}},
        upsert=True
    )
    
    # For transfers, add to destination outlet
    if req.type == "transfer" and req.to_outlet_id:
        await stock_on_hand_col.update_one(
            {"item_id": req.item_id, "outlet_id": req.to_outlet_id},
            {"$inc": {"quantity": abs(req.quantity)}, "$set": {"updated_at": now_utc()}},
            upsert=True
        )
    
    # Check low stock alert
    item = await items_col.find_one({"_id": ObjectId(req.item_id)})
    stock = await stock_on_hand_col.find_one({"item_id": req.item_id, "outlet_id": req.outlet_id})
    if item and stock and item.get("reorder_threshold", 0) > 0:
        if stock.get("quantity", 0) <= item["reorder_threshold"]:
            await ws_manager.broadcast_to_outlet(req.outlet_id, {
                "type": "low_stock_alert",
                "item_name": item["name"],
                "current_quantity": stock["quantity"],
                "reorder_threshold": item["reorder_threshold"],
            })
    
    await log_audit(current_user["id"], "create", "inventory", "stock_movement", movement_id, details=f"{req.type}: {req.quantity}")
    return {"id": movement_id, "message": "Stock movement recorded"}

# ===================== STOCK ON HAND =====================
@router.get("/stock")
async def list_stock_on_hand(current_user: dict = Depends(get_current_user), outlet_id: str = "", skip: int = 0, limit: int = 100):
    query = {}
    if outlet_id:
        await check_outlet_access(current_user, outlet_id)
        query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        query["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    
    total = await stock_on_hand_col.count_documents(query)
    cursor = stock_on_hand_col.find(query).skip(skip).limit(limit)
    stock = []
    async for s in cursor:
        doc = serialize_doc(s)
        item = await items_col.find_one({"_id": ObjectId(s["item_id"])})
        if item:
            doc["item_name"] = item.get("name", "")
            doc["item_category"] = item.get("category", "")
            doc["item_uom"] = item.get("uom", "")
            doc["cost_per_unit"] = item.get("cost_per_unit", 0)
            doc["reorder_threshold"] = item.get("reorder_threshold", 0)
            doc["value"] = s.get("quantity", 0) * item.get("cost_per_unit", 0)
            doc["is_low_stock"] = s.get("quantity", 0) <= item.get("reorder_threshold", 0) and item.get("reorder_threshold", 0) > 0
        if s.get("outlet_id"):
            outlet = await outlets_col.find_one({"_id": ObjectId(s["outlet_id"])})
            doc["outlet_name"] = outlet.get("name", "") if outlet else ""
        stock.append(doc)
    return {"stock": stock, "total": total}

# ===================== CONVERSIONS =====================
class ConversionRequest(BaseModel):
    outlet_id: str
    input_item_id: str
    input_quantity: float
    output_item_id: str
    output_quantity: float
    loss_quantity: float = 0
    notes: Optional[str] = ""

@router.get("/conversions")
async def list_conversions(current_user: dict = Depends(get_current_user), outlet_id: str = "", skip: int = 0, limit: int = 50):
    query = {}
    if outlet_id:
        query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        query["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    total = await inventory_conversions_col.count_documents(query)
    cursor = inventory_conversions_col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    conversions = []
    async for c in cursor:
        doc = serialize_doc(c)
        input_item = await items_col.find_one({"_id": ObjectId(c["input_item_id"])})
        output_item = await items_col.find_one({"_id": ObjectId(c["output_item_id"])})
        doc["input_item_name"] = input_item.get("name", "") if input_item else ""
        doc["output_item_name"] = output_item.get("name", "") if output_item else ""
        conversions.append(doc)
    return {"conversions": conversions, "total": total}

@router.post("/conversions")
async def create_conversion(req: ConversionRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "inventory.manage_conversions")
    await check_outlet_access(current_user, req.outlet_id)
    
    # PRD-R03: Must track yield/loss
    yield_pct = (req.output_quantity / req.input_quantity * 100) if req.input_quantity > 0 else 0
    
    doc = {
        **req.dict(),
        "yield_percentage": yield_pct,
        "created_by": current_user["id"],
        "created_at": now_utc(),
    }
    result = await inventory_conversions_col.insert_one(doc)
    
    # Deduct input stock
    await stock_on_hand_col.update_one(
        {"item_id": req.input_item_id, "outlet_id": req.outlet_id},
        {"$inc": {"quantity": -req.input_quantity}, "$set": {"updated_at": now_utc()}},
        upsert=True
    )
    # Add output stock
    await stock_on_hand_col.update_one(
        {"item_id": req.output_item_id, "outlet_id": req.outlet_id},
        {"$inc": {"quantity": req.output_quantity}, "$set": {"updated_at": now_utc()}},
        upsert=True
    )
    
    await log_audit(current_user["id"], "create", "inventory", "conversion", str(result.inserted_id), 
                    details=f"Converted {req.input_quantity} -> {req.output_quantity}, loss: {req.loss_quantity}")
    return {"id": str(result.inserted_id), "message": "Conversion recorded"}

# ===================== DASHBOARD =====================
@router.get("/dashboard")
async def inventory_dashboard(current_user: dict = Depends(get_current_user), outlet_id: str = ""):
    query = {}
    if outlet_id:
        query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        query["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    
    # Total items
    total_items = await items_col.count_documents({"active": True})
    
    # Stock value by category
    stock_data = []
    async for s in stock_on_hand_col.find(query):
        item = await items_col.find_one({"_id": ObjectId(s["item_id"])})
        if item:
            stock_data.append({
                "category": item.get("category", "Other"),
                "value": s.get("quantity", 0) * item.get("cost_per_unit", 0),
                "quantity": s.get("quantity", 0),
            })
    
    # Aggregate by category
    category_values = {}
    for s in stock_data:
        cat = s["category"]
        if cat not in category_values:
            category_values[cat] = {"value": 0, "quantity": 0}
        category_values[cat]["value"] += s["value"]
        category_values[cat]["quantity"] += s["quantity"]
    
    # Low stock items
    low_stock_count = 0
    async for s in stock_on_hand_col.find(query):
        item = await items_col.find_one({"_id": ObjectId(s["item_id"])})
        if item and item.get("reorder_threshold", 0) > 0 and s.get("quantity", 0) <= item["reorder_threshold"]:
            low_stock_count += 1
    
    # Recent movements count
    recent_movements = await stock_movements_col.count_documents(query)
    
    # Total stock value
    total_value = sum(c["value"] for c in category_values.values())
    
    return {
        "total_items": total_items,
        "total_stock_value": total_value,
        "low_stock_count": low_stock_count,
        "recent_movements_count": recent_movements,
        "category_values": [{"category": k, **v} for k, v in category_values.items()],
    }
