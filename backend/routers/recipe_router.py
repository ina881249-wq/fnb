from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from database import recipes_col, recipe_lines_col, items_col, stock_on_hand_col, outlets_col
from auth import get_current_user, check_permission
from utils.audit import log_audit, serialize_doc
from utils.helpers import now_utc
from bson import ObjectId

router = APIRouter(prefix="/api/recipes", tags=["recipes"])

class RecipeLineInput(BaseModel):
    item_id: str
    quantity: float
    uom: Optional[str] = ""
    notes: Optional[str] = ""

class RecipeRequest(BaseModel):
    name: str
    output_item_id: str
    output_quantity: float = 1
    output_uom: Optional[str] = ""
    description: Optional[str] = ""
    yield_percentage: float = 100
    version: int = 1
    active: bool = True
    lines: List[RecipeLineInput] = []

@router.get("")
async def list_recipes(current_user: dict = Depends(get_current_user), search: str = "", output_item_id: str = "", active_only: bool = True, skip: int = 0, limit: int = 50):
    query = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if output_item_id:
        query["output_item_id"] = output_item_id
    if active_only:
        query["active"] = True
    
    total = await recipes_col.count_documents(query)
    cursor = recipes_col.find(query).sort("name", 1).skip(skip).limit(limit)
    recipes = []
    async for r in cursor:
        doc = serialize_doc(r)
        # Enrich output item
        if r.get("output_item_id"):
            item = await items_col.find_one({"_id": ObjectId(r["output_item_id"])})
            doc["output_item_name"] = item.get("name", "") if item else ""
            doc["output_item_uom"] = item.get("uom", "") if item else ""
        # Get line count
        doc["ingredient_count"] = await recipe_lines_col.count_documents({"recipe_id": str(r["_id"])})
        recipes.append(doc)
    return {"recipes": recipes, "total": total}

@router.get("/{recipe_id}")
async def get_recipe(recipe_id: str, current_user: dict = Depends(get_current_user)):
    recipe = await recipes_col.find_one({"_id": ObjectId(recipe_id)})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    doc = serialize_doc(recipe)
    # Get output item
    if recipe.get("output_item_id"):
        item = await items_col.find_one({"_id": ObjectId(recipe["output_item_id"])})
        doc["output_item_name"] = item.get("name", "") if item else ""
        doc["output_item_uom"] = item.get("uom", "") if item else ""
    # Get lines with item details
    lines = []
    async for line in recipe_lines_col.find({"recipe_id": recipe_id}).sort("line_number", 1):
        ldoc = serialize_doc(line)
        if line.get("item_id"):
            item = await items_col.find_one({"_id": ObjectId(line["item_id"])})
            ldoc["item_name"] = item.get("name", "") if item else ""
            ldoc["item_uom"] = item.get("uom", "") if item else ""
            ldoc["item_category"] = item.get("category", "") if item else ""
            ldoc["cost_per_unit"] = item.get("cost_per_unit", 0) if item else 0
        lines.append(ldoc)
    doc["lines"] = lines
    # Calculate total cost
    doc["total_cost"] = sum(l.get("quantity", 0) * l.get("cost_per_unit", 0) for l in lines)
    return doc

@router.post("")
async def create_recipe(req: RecipeRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "inventory.manage_items")
    
    recipe_doc = {
        "name": req.name,
        "output_item_id": req.output_item_id,
        "output_quantity": req.output_quantity,
        "output_uom": req.output_uom,
        "description": req.description,
        "yield_percentage": req.yield_percentage,
        "version": req.version,
        "active": req.active,
        "created_by": current_user["id"],
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    result = await recipes_col.insert_one(recipe_doc)
    recipe_id = str(result.inserted_id)
    
    # Insert lines
    for i, line in enumerate(req.lines):
        line_doc = {
            "recipe_id": recipe_id,
            "line_number": i + 1,
            "item_id": line.item_id,
            "quantity": line.quantity,
            "uom": line.uom,
            "notes": line.notes,
        }
        await recipe_lines_col.insert_one(line_doc)
    
    await log_audit(current_user["id"], "create", "inventory", "recipe", recipe_id, details=f"Recipe: {req.name}")
    return {"id": recipe_id, "message": "Recipe created"}

@router.put("/{recipe_id}")
async def update_recipe(recipe_id: str, req: RecipeRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "inventory.manage_items")
    
    update = {
        "name": req.name, "output_item_id": req.output_item_id,
        "output_quantity": req.output_quantity, "output_uom": req.output_uom,
        "description": req.description, "yield_percentage": req.yield_percentage,
        "version": req.version, "active": req.active, "updated_at": now_utc(),
    }
    await recipes_col.update_one({"_id": ObjectId(recipe_id)}, {"$set": update})
    
    # Replace lines
    await recipe_lines_col.delete_many({"recipe_id": recipe_id})
    for i, line in enumerate(req.lines):
        line_doc = {
            "recipe_id": recipe_id, "line_number": i + 1,
            "item_id": line.item_id, "quantity": line.quantity,
            "uom": line.uom, "notes": line.notes,
        }
        await recipe_lines_col.insert_one(line_doc)
    
    await log_audit(current_user["id"], "update", "inventory", "recipe", recipe_id)
    return {"message": "Recipe updated"}

@router.delete("/{recipe_id}")
async def deactivate_recipe(recipe_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "inventory.manage_items")
    await recipes_col.update_one({"_id": ObjectId(recipe_id)}, {"$set": {"active": False}})
    await log_audit(current_user["id"], "deactivate", "inventory", "recipe", recipe_id)
    return {"message": "Recipe deactivated"}

@router.post("/{recipe_id}/consume")
async def consume_by_recipe(recipe_id: str, outlet_id: str, quantity: float = 1, current_user: dict = Depends(get_current_user)):
    """Consume inventory based on recipe for given quantity of output"""
    await check_permission(current_user, "inventory.manage_conversions")
    
    recipe = await recipes_col.find_one({"_id": ObjectId(recipe_id)})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    lines = []
    async for line in recipe_lines_col.find({"recipe_id": recipe_id}):
        lines.append(line)
    
    # Calculate consumption per line × quantity multiplier
    multiplier = quantity / recipe.get("output_quantity", 1)
    consumed = []
    for line in lines:
        consume_qty = line["quantity"] * multiplier
        # Deduct from stock
        await stock_on_hand_col.update_one(
            {"item_id": line["item_id"], "outlet_id": outlet_id},
            {"$inc": {"quantity": -consume_qty}, "$set": {"updated_at": now_utc()}},
            upsert=True
        )
        item = await items_col.find_one({"_id": ObjectId(line["item_id"])})
        consumed.append({"item_id": line["item_id"], "item_name": item.get("name", "") if item else "", "quantity": consume_qty})
    
    # Add output to stock
    output_qty = quantity * (recipe.get("yield_percentage", 100) / 100)
    await stock_on_hand_col.update_one(
        {"item_id": recipe["output_item_id"], "outlet_id": outlet_id},
        {"$inc": {"quantity": output_qty}, "$set": {"updated_at": now_utc()}},
        upsert=True
    )
    
    await log_audit(current_user["id"], "consume", "inventory", "recipe", recipe_id, details=f"Consumed {quantity}x, {len(consumed)} ingredients")
    return {"consumed": consumed, "output_quantity": output_qty, "message": "Consumption recorded"}

@router.get("/{recipe_id}/consumption-preview")
async def consumption_preview(recipe_id: str, outlet_id: str = "", quantity: float = 1, current_user: dict = Depends(get_current_user)):
    """Preview what will be consumed without actually consuming"""
    recipe = await recipes_col.find_one({"_id": ObjectId(recipe_id)})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    multiplier = quantity / recipe.get("output_quantity", 1)
    preview = []
    total_cost = 0
    
    async for line in recipe_lines_col.find({"recipe_id": recipe_id}):
        consume_qty = line["quantity"] * multiplier
        item = await items_col.find_one({"_id": ObjectId(line["item_id"])})
        cost = consume_qty * (item.get("cost_per_unit", 0) if item else 0)
        total_cost += cost
        
        # Check stock availability
        stock = None
        if outlet_id:
            stock = await stock_on_hand_col.find_one({"item_id": line["item_id"], "outlet_id": outlet_id})
        
        preview.append({
            "item_id": line["item_id"],
            "item_name": item.get("name", "") if item else "",
            "item_uom": item.get("uom", "") if item else "",
            "required_quantity": consume_qty,
            "available_stock": stock.get("quantity", 0) if stock else 0,
            "sufficient": (stock.get("quantity", 0) if stock else 0) >= consume_qty,
            "cost": cost,
        })
    
    all_sufficient = all(p["sufficient"] for p in preview)
    return {
        "recipe_name": recipe["name"],
        "output_quantity": quantity * (recipe.get("yield_percentage", 100) / 100),
        "ingredients": preview,
        "total_cost": total_cost,
        "all_ingredients_available": all_sufficient,
    }
