from fastapi import APIRouter, Depends
from database import (
    sales_summaries_col, cash_movements_col, petty_cash_col,
    stock_movements_col, items_col, outlets_col, accounts_col,
    inventory_conversions_col, journals_col, journal_lines_col
)
from auth import get_current_user
from utils.audit import serialize_doc
from bson import ObjectId

router = APIRouter(prefix="/api/drilldown", tags=["drilldown"])

@router.get("/revenue")
async def revenue_drilldown(current_user: dict = Depends(get_current_user), level: str = "global", outlet_id: str = "", city: str = "", date_from: str = "", date_to: str = ""):
    """
    Multi-level revenue drill-down:
    global -> city -> outlet -> daily -> transactions
    """
    query = {}
    if date_from:
        query.setdefault("date", {})["$gte"] = date_from
    if date_to:
        query.setdefault("date", {})["$lte"] = date_to
    if not current_user.get("is_superadmin"):
        query["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    
    if level == "global":
        # Group by city
        all_outlets = {}
        async for o in outlets_col.find({"status": "active"}):
            all_outlets[str(o["_id"])] = {"name": o["name"], "city": o.get("city", "Unknown")}
        
        city_data = {}
        async for s in sales_summaries_col.find(query):
            oid = s.get("outlet_id", "")
            outlet_info = all_outlets.get(oid, {"city": "Unknown"})
            c = outlet_info["city"]
            if c not in city_data:
                city_data[c] = {"city": c, "total_sales": 0, "cash_sales": 0, "card_sales": 0, "online_sales": 0, "days": 0, "outlet_count": set()}
            city_data[c]["total_sales"] += s.get("total_sales", 0)
            city_data[c]["cash_sales"] += s.get("cash_sales", 0)
            city_data[c]["card_sales"] += s.get("card_sales", 0)
            city_data[c]["online_sales"] += s.get("online_sales", 0)
            city_data[c]["days"] += 1
            city_data[c]["outlet_count"].add(oid)
        
        result = []
        for c, data in city_data.items():
            result.append({**data, "outlet_count": len(data["outlet_count"]), "avg_daily": data["total_sales"] / max(data["days"], 1)})
        
        total = sum(r["total_sales"] for r in result)
        return {"level": "global", "data": sorted(result, key=lambda x: x["total_sales"], reverse=True), "total": total}
    
    elif level == "city":
        if not city:
            return {"level": "city", "data": [], "error": "city parameter required"}
        # Group by outlet within city
        outlet_ids = {}
        async for o in outlets_col.find({"city": city, "status": "active"}):
            outlet_ids[str(o["_id"])] = o["name"]
        
        query["outlet_id"] = {"$in": list(outlet_ids.keys())}
        outlet_data = {}
        async for s in sales_summaries_col.find(query):
            oid = s.get("outlet_id", "")
            if oid not in outlet_data:
                outlet_data[oid] = {"outlet_id": oid, "outlet_name": outlet_ids.get(oid, ""), "total_sales": 0, "cash_sales": 0, "card_sales": 0, "days": 0}
            outlet_data[oid]["total_sales"] += s.get("total_sales", 0)
            outlet_data[oid]["cash_sales"] += s.get("cash_sales", 0)
            outlet_data[oid]["card_sales"] += s.get("card_sales", 0)
            outlet_data[oid]["days"] += 1
        
        result = list(outlet_data.values())
        for r in result:
            r["avg_daily"] = r["total_sales"] / max(r["days"], 1)
        
        return {"level": "city", "city": city, "data": sorted(result, key=lambda x: x["total_sales"], reverse=True), "total": sum(r["total_sales"] for r in result)}
    
    elif level == "outlet":
        if not outlet_id:
            return {"level": "outlet", "data": [], "error": "outlet_id parameter required"}
        query["outlet_id"] = outlet_id
        
        # Group by date
        daily_data = []
        async for s in sales_summaries_col.find(query).sort("date", -1).limit(60):
            daily_data.append({
                "date": s.get("date", ""),
                "total_sales": s.get("total_sales", 0),
                "cash_sales": s.get("cash_sales", 0),
                "card_sales": s.get("card_sales", 0),
                "online_sales": s.get("online_sales", 0),
            })
        
        outlet = await outlets_col.find_one({"_id": ObjectId(outlet_id)})
        outlet_name = outlet.get("name", "") if outlet else ""
        return {"level": "outlet", "outlet_id": outlet_id, "outlet_name": outlet_name, "data": daily_data, "total": sum(d["total_sales"] for d in daily_data)}
    
    return {"level": level, "data": []}

@router.get("/expenses")
async def expense_drilldown(current_user: dict = Depends(get_current_user), level: str = "global", outlet_id: str = "", category: str = "", date_from: str = "", date_to: str = ""):
    """
    Multi-level expense drill-down:
    global -> outlet -> category -> transactions
    """
    query = {}
    if date_from:
        query.setdefault("date", {})["$gte"] = date_from
    if date_to:
        query.setdefault("date", {})["$lte"] = date_to
    if not current_user.get("is_superadmin"):
        query["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    
    if level == "global":
        # Group by outlet
        outlet_map = {}
        async for o in outlets_col.find({"status": "active"}):
            outlet_map[str(o["_id"])] = o["name"]
        
        outlet_expenses = {}
        async for p in petty_cash_col.find(query):
            oid = p.get("outlet_id", "HQ")
            if oid not in outlet_expenses:
                outlet_expenses[oid] = {"outlet_id": oid, "outlet_name": outlet_map.get(oid, oid), "total": 0, "count": 0, "categories": {}}
            outlet_expenses[oid]["total"] += p.get("amount", 0)
            outlet_expenses[oid]["count"] += 1
            cat = p.get("category", "other")
            outlet_expenses[oid]["categories"][cat] = outlet_expenses[oid]["categories"].get(cat, 0) + p.get("amount", 0)
        
        result = list(outlet_expenses.values())
        for r in result:
            r["top_category"] = max(r["categories"], key=r["categories"].get) if r["categories"] else ""
            r["categories"] = [{"category": k, "amount": v} for k, v in r["categories"].items()]
        
        return {"level": "global", "data": sorted(result, key=lambda x: x["total"], reverse=True), "total": sum(r["total"] for r in result)}
    
    elif level == "outlet":
        if not outlet_id:
            return {"level": "outlet", "data": []}
        query["outlet_id"] = outlet_id
        
        # Group by category
        cat_data = {}
        async for p in petty_cash_col.find(query):
            cat = p.get("category", "other")
            if cat not in cat_data:
                cat_data[cat] = {"category": cat, "total": 0, "count": 0}
            cat_data[cat]["total"] += p.get("amount", 0)
            cat_data[cat]["count"] += 1
        
        outlet = await outlets_col.find_one({"_id": ObjectId(outlet_id)})
        return {"level": "outlet", "outlet_id": outlet_id, "outlet_name": outlet.get("name", "") if outlet else "", "data": sorted(cat_data.values(), key=lambda x: x["total"], reverse=True), "total": sum(c["total"] for c in cat_data.values())}
    
    elif level == "category":
        if not category:
            return {"level": "category", "data": []}
        query["category"] = category
        if outlet_id:
            query["outlet_id"] = outlet_id
        
        # Show individual transactions
        transactions = []
        async for p in petty_cash_col.find(query).sort("date", -1).limit(100):
            transactions.append(serialize_doc(p))
        
        return {"level": "category", "category": category, "data": transactions, "total": sum(t.get("amount", 0) for t in transactions)}
    
    return {"level": level, "data": []}

@router.get("/inventory")
async def inventory_drilldown(current_user: dict = Depends(get_current_user), level: str = "global", outlet_id: str = "", category: str = ""):
    """
    Multi-level inventory drill-down:
    global -> outlet -> category -> items
    """
    from database import stock_on_hand_col
    
    if level == "global":
        # Group by outlet
        outlet_map = {}
        async for o in outlets_col.find({"status": "active"}):
            outlet_map[str(o["_id"])] = o["name"]
        
        outlet_stock = {}
        async for s in stock_on_hand_col.find():
            oid = s.get("outlet_id", "")
            item = await items_col.find_one({"_id": ObjectId(s["item_id"])})
            value = s.get("quantity", 0) * (item.get("cost_per_unit", 0) if item else 0)
            if oid not in outlet_stock:
                outlet_stock[oid] = {"outlet_id": oid, "outlet_name": outlet_map.get(oid, oid), "total_value": 0, "item_count": 0, "low_stock": 0}
            outlet_stock[oid]["total_value"] += value
            outlet_stock[oid]["item_count"] += 1
            if item and item.get("reorder_threshold", 0) > 0 and s.get("quantity", 0) <= item["reorder_threshold"]:
                outlet_stock[oid]["low_stock"] += 1
        
        return {"level": "global", "data": sorted(outlet_stock.values(), key=lambda x: x["total_value"], reverse=True), "total": sum(o["total_value"] for o in outlet_stock.values())}
    
    elif level == "outlet":
        if not outlet_id:
            return {"level": "outlet", "data": []}
        
        # Group by category
        cat_stock = {}
        async for s in stock_on_hand_col.find({"outlet_id": outlet_id}):
            item = await items_col.find_one({"_id": ObjectId(s["item_id"])})
            if not item:
                continue
            cat = item.get("category", "Other")
            value = s.get("quantity", 0) * item.get("cost_per_unit", 0)
            if cat not in cat_stock:
                cat_stock[cat] = {"category": cat, "total_value": 0, "item_count": 0}
            cat_stock[cat]["total_value"] += value
            cat_stock[cat]["item_count"] += 1
        
        outlet = await outlets_col.find_one({"_id": ObjectId(outlet_id)})
        return {"level": "outlet", "outlet_id": outlet_id, "outlet_name": outlet.get("name", "") if outlet else "", "data": sorted(cat_stock.values(), key=lambda x: x["total_value"], reverse=True), "total": sum(c["total_value"] for c in cat_stock.values())}
    
    elif level == "category":
        if not category:
            return {"level": "category", "data": []}
        query = {"category": category}
        
        items_data = []
        async for item in items_col.find(query):
            stock_query = {"item_id": str(item["_id"])}
            if outlet_id:
                stock_query["outlet_id"] = outlet_id
            total_qty = 0
            async for s in stock_on_hand_col.find(stock_query):
                total_qty += s.get("quantity", 0)
            items_data.append({
                "item_id": str(item["_id"]),
                "item_name": item["name"],
                "uom": item.get("uom", ""),
                "material_level": item.get("material_level", ""),
                "cost_per_unit": item.get("cost_per_unit", 0),
                "total_quantity": total_qty,
                "total_value": total_qty * item.get("cost_per_unit", 0),
            })
        
        return {"level": "category", "category": category, "data": sorted(items_data, key=lambda x: x["total_value"], reverse=True), "total": sum(i["total_value"] for i in items_data)}
    
    return {"level": level, "data": []}
