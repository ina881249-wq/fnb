from fastapi import APIRouter, Depends
from database import (
    recipes_col, recipe_lines_col, sales_summaries_col,
    stock_movements_col, stock_on_hand_col, items_col, outlets_col,
    production_orders_col
)
from auth import get_current_user
from utils.audit import serialize_doc
from bson import ObjectId

router = APIRouter(prefix="/api/variance", tags=["variance"])

@router.get("")
async def variance_report(current_user: dict = Depends(get_current_user), outlet_id: str = "", date_from: str = "", date_to: str = ""):
    """
    Calculate theoretical consumption (from recipes x sales) vs actual stock changes.
    Variance = actual usage - theoretical usage. Positive = over-usage, Negative = under-usage.
    """
    # 1. Get all recipes with their ingredients
    recipe_map = {}  # recipe_id -> {output_item_id, lines: [{item_id, qty_per_unit}]}
    async for r in recipes_col.find({"active": True}):
        rid = str(r["_id"])
        lines = []
        async for line in recipe_lines_col.find({"recipe_id": rid}):
            lines.append({"item_id": line["item_id"], "quantity": line["quantity"]})
        recipe_map[rid] = {
            "name": r["name"],
            "output_item_id": r.get("output_item_id"),
            "output_quantity": r.get("output_quantity", 1),
            "lines": lines
        }
    
    # 2. Get production orders (completed) to compute theoretical consumption
    prod_query = {"status": "completed"}
    if outlet_id:
        prod_query["outlet_id"] = outlet_id
    
    theoretical = {}  # item_id -> total theoretical consumption
    async for po in production_orders_col.find(prod_query):
        recipe = recipe_map.get(po.get("recipe_id"))
        if not recipe:
            continue
        multiplier = po.get("planned_quantity", 0) / recipe["output_quantity"]
        for line in recipe["lines"]:
            iid = line["item_id"]
            theoretical[iid] = theoretical.get(iid, 0) + (line["quantity"] * multiplier)
    
    # 3. Get actual stock movements (waste, adjustment, production_input)
    move_query = {}
    if outlet_id:
        move_query["outlet_id"] = outlet_id
    if date_from:
        move_query.setdefault("date", {})["$gte"] = date_from
    if date_to:
        move_query.setdefault("date", {})["$lte"] = date_to
    
    actual_usage = {}  # item_id -> total actual consumption (waste + adjustments negative)
    async for m in stock_movements_col.find(move_query):
        iid = m.get("item_id")
        qty = abs(m.get("quantity", 0))
        if m.get("type") in ["waste", "spoilage"]:
            actual_usage[iid] = actual_usage.get(iid, 0) + qty
        elif m.get("type") == "adjustment" and m.get("quantity", 0) < 0:
            actual_usage[iid] = actual_usage.get(iid, 0) + qty
    
    # 4. Build variance report
    all_item_ids = set(list(theoretical.keys()) + list(actual_usage.keys()))
    variance_items = []
    total_variance_value = 0
    
    for iid in all_item_ids:
        item = await items_col.find_one({"_id": ObjectId(iid)})
        if not item:
            continue
        theo = theoretical.get(iid, 0)
        actual = actual_usage.get(iid, 0)
        variance_qty = actual - theo
        variance_pct = ((variance_qty / theo) * 100) if theo > 0 else (100 if actual > 0 else 0)
        cost = item.get("cost_per_unit", 0)
        variance_value = variance_qty * cost
        total_variance_value += variance_value
        
        severity = "ok"
        if abs(variance_pct) > 20:
            severity = "critical"
        elif abs(variance_pct) > 10:
            severity = "warning"
        
        variance_items.append({
            "item_id": iid,
            "item_name": item.get("name", ""),
            "category": item.get("category", ""),
            "uom": item.get("uom", ""),
            "theoretical_usage": round(theo, 2),
            "actual_usage": round(actual, 2),
            "variance_qty": round(variance_qty, 2),
            "variance_pct": round(variance_pct, 1),
            "cost_per_unit": cost,
            "variance_value": round(variance_value, 0),
            "severity": severity,
        })
    
    # Sort by absolute variance value (highest first)
    variance_items.sort(key=lambda x: abs(x["variance_value"]), reverse=True)
    
    # Summary stats
    critical_count = sum(1 for v in variance_items if v["severity"] == "critical")
    warning_count = sum(1 for v in variance_items if v["severity"] == "warning")
    
    return {
        "items": variance_items,
        "total_items": len(variance_items),
        "total_variance_value": total_variance_value,
        "critical_count": critical_count,
        "warning_count": warning_count,
        "ok_count": len(variance_items) - critical_count - warning_count,
    }

@router.get("/by-outlet")
async def variance_by_outlet(current_user: dict = Depends(get_current_user)):
    """Get variance summary per outlet"""
    outlet_variances = []
    async for outlet in outlets_col.find({"status": "active"}):
        oid = str(outlet["_id"])
        # Quick variance calc
        waste_count = await stock_movements_col.count_documents({"outlet_id": oid, "type": {"$in": ["waste", "spoilage"]}})
        adj_count = await stock_movements_col.count_documents({"outlet_id": oid, "type": "adjustment"})
        
        # Sum waste values
        waste_value = 0
        async for m in stock_movements_col.find({"outlet_id": oid, "type": {"$in": ["waste", "spoilage"]}}):
            item = await items_col.find_one({"_id": ObjectId(m["item_id"])})
            if item:
                waste_value += abs(m.get("quantity", 0)) * item.get("cost_per_unit", 0)
        
        outlet_variances.append({
            "outlet_id": oid,
            "outlet_name": outlet.get("name", ""),
            "city": outlet.get("city", ""),
            "waste_count": waste_count,
            "adjustment_count": adj_count,
            "waste_value": waste_value,
        })
    
    return {"outlets": outlet_variances}
