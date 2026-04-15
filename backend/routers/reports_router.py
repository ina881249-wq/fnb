from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from database import (
    accounts_col, cash_movements_col, petty_cash_col,
    sales_summaries_col, items_col, stock_on_hand_col,
    stock_movements_col, inventory_conversions_col, outlets_col
)
from auth import get_current_user, check_permission
from utils.audit import serialize_doc
from bson import ObjectId
import io

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.get("/pnl")
async def pnl_report(current_user: dict = Depends(get_current_user), outlet_id: str = "", period_start: str = "", period_end: str = ""):
    """Profit & Loss report"""
    query = {}
    if outlet_id:
        query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        query["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    
    # Revenue from sales summaries
    sales_query = {**query}
    if period_start:
        sales_query.setdefault("date", {})["$gte"] = period_start
    if period_end:
        sales_query.setdefault("date", {})["$lte"] = period_end
    
    total_revenue = 0
    revenue_by_outlet = {}
    async for s in sales_summaries_col.find(sales_query):
        total_revenue += s.get("total_sales", 0)
        oid = s.get("outlet_id", "HQ")
        revenue_by_outlet[oid] = revenue_by_outlet.get(oid, 0) + s.get("total_sales", 0)
    
    # COGS (from inventory conversions and stock movements)
    total_cogs = 0
    async for c in inventory_conversions_col.find(query):
        input_item = await items_col.find_one({"_id": ObjectId(c["input_item_id"])})
        if input_item:
            total_cogs += c.get("input_quantity", 0) * input_item.get("cost_per_unit", 0)
    
    # Expenses from petty cash
    total_expenses = 0
    expense_categories = {}
    pc_query = {**query}
    if period_start:
        pc_query.setdefault("date", {})["$gte"] = period_start
    if period_end:
        pc_query.setdefault("date", {})["$lte"] = period_end
    async for p in petty_cash_col.find(pc_query):
        total_expenses += p.get("amount", 0)
        cat = p.get("category", "operational")
        expense_categories[cat] = expense_categories.get(cat, 0) + p.get("amount", 0)
    
    gross_profit = total_revenue - total_cogs
    net_profit = gross_profit - total_expenses
    margin = (net_profit / total_revenue * 100) if total_revenue > 0 else 0
    
    # Get outlet names
    revenue_details = []
    for oid, rev in revenue_by_outlet.items():
        outlet = await outlets_col.find_one({"_id": ObjectId(oid)}) if oid != "HQ" else None
        revenue_details.append({
            "outlet_id": oid,
            "outlet_name": outlet.get("name", "HQ") if outlet else oid,
            "revenue": rev
        })
    
    return {
        "total_revenue": total_revenue,
        "total_cogs": total_cogs,
        "gross_profit": gross_profit,
        "total_expenses": total_expenses,
        "net_profit": net_profit,
        "margin_percentage": round(margin, 2),
        "revenue_by_outlet": revenue_details,
        "expense_categories": [{"category": k, "amount": v} for k, v in expense_categories.items()],
        "period_start": period_start,
        "period_end": period_end,
    }

@router.get("/cashflow")
async def cashflow_report(current_user: dict = Depends(get_current_user), outlet_id: str = "", period_start: str = "", period_end: str = ""):
    """Cashflow report"""
    query = {}
    if outlet_id:
        query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        query["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    
    if period_start:
        query.setdefault("date", {})["$gte"] = period_start
    if period_end:
        query.setdefault("date", {})["$lte"] = period_end
    
    total_inflow = 0
    total_outflow = 0
    daily_cashflow = {}
    
    async for m in cash_movements_col.find(query).sort("date", 1):
        date = m.get("date", "unknown")
        if date not in daily_cashflow:
            daily_cashflow[date] = {"inflow": 0, "outflow": 0}
        if m.get("type") in ["cash_in"]:
            daily_cashflow[date]["inflow"] += m.get("amount", 0)
            total_inflow += m.get("amount", 0)
        else:
            daily_cashflow[date]["outflow"] += m.get("amount", 0)
            total_outflow += m.get("amount", 0)
    
    # Include sales as inflow
    async for s in sales_summaries_col.find(query).sort("date", 1):
        date = s.get("date", "unknown")
        if date not in daily_cashflow:
            daily_cashflow[date] = {"inflow": 0, "outflow": 0}
        daily_cashflow[date]["inflow"] += s.get("cash_sales", 0)
        total_inflow += s.get("cash_sales", 0)
    
    cashflow_data = [{"date": k, **v, "net": v["inflow"] - v["outflow"]} for k, v in sorted(daily_cashflow.items())]
    
    return {
        "total_inflow": total_inflow,
        "total_outflow": total_outflow,
        "net_cashflow": total_inflow - total_outflow,
        "daily_cashflow": cashflow_data,
        "period_start": period_start,
        "period_end": period_end,
    }

@router.get("/balance-sheet")
async def balance_sheet(current_user: dict = Depends(get_current_user)):
    """Balance sheet"""
    # Assets
    bank_total = 0
    cash_total = 0
    petty_total = 0
    inventory_total = 0
    
    async for a in accounts_col.find({"type": "bank"}):
        bank_total += a.get("current_balance", 0)
    async for a in accounts_col.find({"type": "outlet_cash"}):
        cash_total += a.get("current_balance", 0)
    async for a in accounts_col.find({"type": "petty_cash"}):
        petty_total += a.get("current_balance", 0)
    
    # Inventory value
    async for s in stock_on_hand_col.find():
        item = await items_col.find_one({"_id": ObjectId(s["item_id"])})
        if item:
            inventory_total += s.get("quantity", 0) * item.get("cost_per_unit", 0)
    
    total_assets = bank_total + cash_total + petty_total + inventory_total
    
    return {
        "assets": {
            "bank_accounts": bank_total,
            "outlet_cash": cash_total,
            "petty_cash": petty_total,
            "inventory": inventory_total,
            "total": total_assets,
        },
        "liabilities": {
            "total": 0,  # Simplified for MVP
        },
        "equity": {
            "total": total_assets,  # Assets - Liabilities
        }
    }

@router.get("/inventory-valuation")
async def inventory_valuation(current_user: dict = Depends(get_current_user), outlet_id: str = ""):
    query = {}
    if outlet_id:
        query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        query["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    
    items_data = []
    total_value = 0
    async for s in stock_on_hand_col.find(query):
        item = await items_col.find_one({"_id": ObjectId(s["item_id"])})
        if item:
            value = s.get("quantity", 0) * item.get("cost_per_unit", 0)
            total_value += value
            outlet = await outlets_col.find_one({"_id": ObjectId(s["outlet_id"])}) if s.get("outlet_id") else None
            items_data.append({
                "item_id": s["item_id"],
                "item_name": item.get("name", ""),
                "category": item.get("category", ""),
                "uom": item.get("uom", ""),
                "quantity": s.get("quantity", 0),
                "cost_per_unit": item.get("cost_per_unit", 0),
                "value": value,
                "outlet_id": s.get("outlet_id", ""),
                "outlet_name": outlet.get("name", "") if outlet else "",
            })
    
    return {
        "items": sorted(items_data, key=lambda x: x["value"], reverse=True),
        "total_value": total_value,
    }

@router.get("/inventory-movements")
async def inventory_movements_report(current_user: dict = Depends(get_current_user), outlet_id: str = "", period_start: str = "", period_end: str = ""):
    query = {}
    if outlet_id:
        query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        query["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    if period_start:
        query.setdefault("date", {})["$gte"] = period_start
    if period_end:
        query.setdefault("date", {})["$lte"] = period_end
    
    # Group by type
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$type",
            "count": {"$sum": 1},
            "total_quantity": {"$sum": "$quantity"}
        }}
    ]
    movement_summary = []
    async for m in stock_movements_col.aggregate(pipeline):
        movement_summary.append({"type": m["_id"], "count": m["count"], "total_quantity": m["total_quantity"]})
    
    # Recent movements
    movements = []
    async for m in stock_movements_col.find(query).sort("created_at", -1).limit(100):
        doc = serialize_doc(m)
        item = await items_col.find_one({"_id": ObjectId(m["item_id"])})
        doc["item_name"] = item.get("name", "") if item else ""
        movements.append(doc)
    
    return {
        "summary": movement_summary,
        "movements": movements,
    }

# ===================== EXPORT =====================
@router.get("/export/{report_type}")
async def export_report(report_type: str, format: str = "excel", current_user: dict = Depends(get_current_user), outlet_id: str = ""):
    """Export reports to Excel or PDF"""
    from utils.export import generate_excel, generate_pdf
    
    # Get report data based on type
    if report_type == "pnl":
        data = await pnl_report(current_user, outlet_id)
    elif report_type == "cashflow":
        data = await cashflow_report(current_user, outlet_id)
    elif report_type == "balance-sheet":
        data = await balance_sheet(current_user)
    elif report_type == "inventory-valuation":
        data = await inventory_valuation(current_user, outlet_id)
    elif report_type == "inventory-movements":
        data = await inventory_movements_report(current_user, outlet_id)
    else:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Unknown report type: {report_type}")
    
    if format == "excel":
        buffer = generate_excel(report_type, data)
        return StreamingResponse(
            io.BytesIO(buffer),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={report_type}_report.xlsx"}
        )
    elif format == "pdf":
        buffer = generate_pdf(report_type, data)
        return StreamingResponse(
            io.BytesIO(buffer),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={report_type}_report.pdf"}
        )
