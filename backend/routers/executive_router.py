from fastapi import APIRouter, Depends
from database import (
    sales_summaries_col, cash_movements_col, petty_cash_col,
    stock_on_hand_col, items_col, outlets_col, accounts_col,
    approvals_col, alerts_col, daily_closings_col, reconciliations_col,
    stock_movements_col, inventory_conversions_col, journals_col
)
from auth import get_current_user
from utils.audit import serialize_doc
from bson import ObjectId
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/api/executive", tags=["executive"])

def parse_date(d):
    try:
        return datetime.strptime(d, "%Y-%m-%d")
    except:
        return None

@router.get("/overview")
async def executive_overview(current_user: dict = Depends(get_current_user), date_from: str = "", date_to: str = "", outlet_id: str = ""):
    """Main KPI overview for executive dashboard"""
    now = datetime.now(timezone.utc)
    if not date_from:
        date_from = (now - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = now.strftime("%Y-%m-%d")
    
    sales_q = {"date": {"$gte": date_from, "$lte": date_to}}
    if outlet_id:
        sales_q["outlet_id"] = outlet_id
    
    # Revenue
    total_revenue = 0
    total_cash_sales = 0
    total_card_sales = 0
    total_online_sales = 0
    sales_days = 0
    async for s in sales_summaries_col.find(sales_q):
        total_revenue += s.get("total_sales", 0)
        total_cash_sales += s.get("cash_sales", 0)
        total_card_sales += s.get("card_sales", 0)
        total_online_sales += s.get("online_sales", 0)
        sales_days += 1
    
    avg_daily_revenue = total_revenue / max(sales_days, 1)
    
    # Previous period for comparison
    days_range = (parse_date(date_to) - parse_date(date_from)).days if parse_date(date_from) and parse_date(date_to) else 30
    prev_from = (parse_date(date_from) - timedelta(days=days_range)).strftime("%Y-%m-%d") if parse_date(date_from) else ""
    prev_to = (parse_date(date_from) - timedelta(days=1)).strftime("%Y-%m-%d") if parse_date(date_from) else ""
    
    prev_revenue = 0
    prev_q = {"date": {"$gte": prev_from, "$lte": prev_to}}
    if outlet_id:
        prev_q["outlet_id"] = outlet_id
    async for s in sales_summaries_col.find(prev_q):
        prev_revenue += s.get("total_sales", 0)
    
    revenue_growth = ((total_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0
    
    # Expenses
    expense_q = {"date": {"$gte": date_from, "$lte": date_to}}
    if outlet_id:
        expense_q["outlet_id"] = outlet_id
    total_expenses = 0
    async for p in petty_cash_col.find(expense_q):
        total_expenses += p.get("amount", 0)
    
    # Bank balance
    bank_q = {"type": "bank"}
    if outlet_id:
        bank_q["outlet_id"] = outlet_id
    total_bank = 0
    async for a in accounts_col.find(bank_q):
        total_bank += a.get("current_balance", 0)
    
    # Cash balance
    cash_q = {"type": "outlet_cash"}
    if outlet_id:
        cash_q["outlet_id"] = outlet_id
    total_cash = 0
    async for a in accounts_col.find(cash_q):
        total_cash += a.get("current_balance", 0)
    
    # Inventory value
    inv_q = {}
    if outlet_id:
        inv_q["outlet_id"] = outlet_id
    total_inv = 0
    async for soh in stock_on_hand_col.find(inv_q):
        item = await items_col.find_one({"_id": ObjectId(soh["item_id"])})
        if item:
            total_inv += soh.get("quantity", 0) * item.get("cost_per_unit", 0)
    
    # Outlets count
    outlets_count = await outlets_col.count_documents({"status": "active"})
    
    # Pending approvals
    pending_approvals = await approvals_col.count_documents({"status": "pending"})
    
    # Active alerts
    active_alerts = await alerts_col.count_documents({"resolved": False})
    
    # Gross profit estimate
    gross_profit = total_revenue - total_expenses
    margin = (gross_profit / total_revenue * 100) if total_revenue > 0 else 0
    
    return {
        "period": {"from": date_from, "to": date_to},
        "revenue": {
            "total": total_revenue,
            "cash": total_cash_sales,
            "card": total_card_sales,
            "online": total_online_sales,
            "avg_daily": avg_daily_revenue,
            "growth_pct": round(revenue_growth, 1),
            "prev_period": prev_revenue,
        },
        "expenses": {"total": total_expenses},
        "profit": {"gross": gross_profit, "margin_pct": round(margin, 1)},
        "balances": {"bank": total_bank, "cash": total_cash, "inventory": total_inv, "total_assets": total_bank + total_cash + total_inv},
        "operations": {"outlets": outlets_count, "pending_approvals": pending_approvals, "active_alerts": active_alerts},
    }

@router.get("/revenue-trend")
async def revenue_trend(current_user: dict = Depends(get_current_user), date_from: str = "", date_to: str = "", outlet_id: str = "", group_by: str = "day"):
    """Revenue trend over time - group by day, week, or month"""
    now = datetime.now(timezone.utc)
    if not date_from:
        date_from = (now - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = now.strftime("%Y-%m-%d")
    
    query = {"date": {"$gte": date_from, "$lte": date_to}}
    if outlet_id:
        query["outlet_id"] = outlet_id
    
    daily = {}
    async for s in sales_summaries_col.find(query).sort("date", 1):
        date = s.get("date", "")
        if group_by == "month":
            key = date[:7]
        elif group_by == "week":
            d = parse_date(date)
            key = f"{d.year}-W{d.isocalendar()[1]:02d}" if d else date
        else:
            key = date
        
        if key not in daily:
            daily[key] = {"date": key, "revenue": 0, "cash": 0, "card": 0, "online": 0, "count": 0}
        daily[key]["revenue"] += s.get("total_sales", 0)
        daily[key]["cash"] += s.get("cash_sales", 0)
        daily[key]["card"] += s.get("card_sales", 0)
        daily[key]["online"] += s.get("online_sales", 0)
        daily[key]["count"] += 1
    
    data = list(daily.values())
    total = sum(d["revenue"] for d in data)
    return {"data": data, "total": total, "group_by": group_by}

@router.get("/outlet-ranking")
async def outlet_ranking(current_user: dict = Depends(get_current_user), date_from: str = "", date_to: str = "", metric: str = "revenue"):
    """Rank outlets by revenue, expenses, profit, or efficiency"""
    now = datetime.now(timezone.utc)
    if not date_from:
        date_from = (now - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = now.strftime("%Y-%m-%d")
    
    outlets = []
    async for o in outlets_col.find({"status": "active"}):
        oid = str(o["_id"])
        sq = {"outlet_id": oid, "date": {"$gte": date_from, "$lte": date_to}}
        
        revenue = 0
        async for s in sales_summaries_col.find(sq):
            revenue += s.get("total_sales", 0)
        
        expenses = 0
        async for p in petty_cash_col.find(sq):
            expenses += p.get("amount", 0)
        
        waste_value = 0
        async for m in stock_movements_col.find({"outlet_id": oid, "type": {"$in": ["waste", "spoilage"]}}):
            item = await items_col.find_one({"_id": ObjectId(m["item_id"])})
            if item:
                waste_value += abs(m.get("quantity", 0)) * item.get("cost_per_unit", 0)
        
        # Closing compliance
        days_in_range = (parse_date(date_to) - parse_date(date_from)).days + 1 if parse_date(date_from) and parse_date(date_to) else 30
        closed_days = await daily_closings_col.count_documents({"outlet_id": oid, "status": "locked", "date": {"$gte": date_from, "$lte": date_to}})
        closing_rate = (closed_days / max(days_in_range, 1)) * 100
        
        profit = revenue - expenses
        margin = (profit / revenue * 100) if revenue > 0 else 0
        
        outlets.append({
            "outlet_id": oid,
            "outlet_name": o.get("name", ""),
            "city": o.get("city", ""),
            "revenue": revenue,
            "expenses": expenses,
            "profit": profit,
            "margin_pct": round(margin, 1),
            "waste_value": waste_value,
            "closing_rate": round(closing_rate, 1),
            "closed_days": closed_days,
            "total_days": days_in_range,
        })
    
    # Sort by metric
    sort_key = metric if metric in ["revenue", "expenses", "profit", "waste_value", "closing_rate"] else "revenue"
    reverse = sort_key != "expenses" and sort_key != "waste_value"
    outlets.sort(key=lambda x: x.get(sort_key, 0), reverse=reverse)
    
    # Add rank
    for i, o in enumerate(outlets):
        o["rank"] = i + 1
    
    return {"outlets": outlets, "metric": metric, "period": {"from": date_from, "to": date_to}}

@router.get("/expense-breakdown")
async def expense_breakdown(current_user: dict = Depends(get_current_user), date_from: str = "", date_to: str = "", outlet_id: str = ""):
    """Expense breakdown by category and outlet"""
    now = datetime.now(timezone.utc)
    if not date_from:
        date_from = (now - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = now.strftime("%Y-%m-%d")
    
    query = {"date": {"$gte": date_from, "$lte": date_to}}
    if outlet_id:
        query["outlet_id"] = outlet_id
    
    by_category = {}
    by_outlet = {}
    daily_trend = {}
    
    async for p in petty_cash_col.find(query):
        cat = p.get("category", "other")
        amt = p.get("amount", 0)
        oid = p.get("outlet_id", "")
        date = p.get("date", "")
        
        by_category[cat] = by_category.get(cat, 0) + amt
        
        if oid not in by_outlet:
            outlet = await outlets_col.find_one({"_id": ObjectId(oid)}) if oid else None
            by_outlet[oid] = {"outlet_name": outlet.get("name", "") if outlet else "HQ", "total": 0}
        by_outlet[oid]["total"] += amt
        
        if date not in daily_trend:
            daily_trend[date] = 0
        daily_trend[date] += amt
    
    total = sum(by_category.values())
    categories = [{"category": k, "amount": v, "pct": round(v / max(total, 1) * 100, 1)} for k, v in sorted(by_category.items(), key=lambda x: x[1], reverse=True)]
    outlet_breakdown = [{"outlet_id": k, **v} for k, v in sorted(by_outlet.items(), key=lambda x: x[1]["total"], reverse=True)]
    trend = [{"date": k, "amount": v} for k, v in sorted(daily_trend.items())]
    
    return {"total": total, "by_category": categories, "by_outlet": outlet_breakdown, "daily_trend": trend}

@router.get("/cashflow-summary")
async def cashflow_summary(current_user: dict = Depends(get_current_user), date_from: str = "", date_to: str = "", outlet_id: str = ""):
    """Cashflow summary with inflow/outflow breakdown"""
    now = datetime.now(timezone.utc)
    if not date_from:
        date_from = (now - timedelta(days=30)).strftime("%Y-%m-%d")
    if not date_to:
        date_to = now.strftime("%Y-%m-%d")
    
    query = {"date": {"$gte": date_from, "$lte": date_to}}
    if outlet_id:
        query["outlet_id"] = outlet_id
    
    inflow_by_type = {}
    outflow_by_type = {}
    daily = {}
    
    async for m in cash_movements_col.find(query):
        date = m.get("date", "")
        amt = m.get("amount", 0)
        mtype = m.get("type", "")
        
        if mtype in ["cash_in"]:
            inflow_by_type[mtype] = inflow_by_type.get(mtype, 0) + amt
        else:
            outflow_by_type[mtype] = outflow_by_type.get(mtype, 0) + amt
        
        if date not in daily:
            daily[date] = {"date": date, "inflow": 0, "outflow": 0}
        if mtype in ["cash_in"]:
            daily[date]["inflow"] += amt
        else:
            daily[date]["outflow"] += amt
    
    # Add sales as inflow
    async for s in sales_summaries_col.find(query):
        date = s.get("date", "")
        cash_sales = s.get("cash_sales", 0)
        inflow_by_type["sales_cash"] = inflow_by_type.get("sales_cash", 0) + cash_sales
        if date not in daily:
            daily[date] = {"date": date, "inflow": 0, "outflow": 0}
        daily[date]["inflow"] += cash_sales
    
    total_inflow = sum(inflow_by_type.values())
    total_outflow = sum(outflow_by_type.values())
    trend = [{"date": k, "inflow": v["inflow"], "outflow": v["outflow"], "net": v["inflow"] - v["outflow"]} for k, v in sorted(daily.items())]
    
    return {
        "total_inflow": total_inflow,
        "total_outflow": total_outflow,
        "net": total_inflow - total_outflow,
        "inflow_breakdown": [{"type": k, "amount": v} for k, v in inflow_by_type.items()],
        "outflow_breakdown": [{"type": k, "amount": v} for k, v in outflow_by_type.items()],
        "daily_trend": trend,
    }

@router.get("/alerts-summary")
async def alerts_summary(current_user: dict = Depends(get_current_user)):
    """Alert summary for control tower"""
    pipeline = [
        {"$match": {"resolved": False}},
        {"$group": {"_id": {"type": "$alert_type", "priority": "$priority"}, "count": {"$sum": 1}}}
    ]
    
    by_type = {}
    by_priority = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    total = 0
    
    async for s in alerts_col.aggregate(pipeline):
        atype = s["_id"]["type"]
        priority = s["_id"]["priority"]
        count = s["count"]
        by_type[atype] = by_type.get(atype, 0) + count
        by_priority[priority] = by_priority.get(priority, 0) + count
        total += count
    
    # Recent alerts
    recent = []
    async for a in alerts_col.find({"resolved": False}).sort("created_at", -1).limit(10):
        doc = serialize_doc(a)
        if a.get("outlet_id"):
            outlet = await outlets_col.find_one({"_id": ObjectId(a["outlet_id"])})
            doc["outlet_name"] = outlet.get("name", "") if outlet else ""
        recent.append(doc)
    
    return {
        "total": total,
        "by_priority": by_priority,
        "by_type": [{"type": k, "count": v} for k, v in sorted(by_type.items(), key=lambda x: x[1], reverse=True)],
        "recent": recent,
    }

@router.get("/inventory-health")
async def inventory_health(current_user: dict = Depends(get_current_user), outlet_id: str = ""):
    """Inventory health metrics"""
    query = {}
    if outlet_id:
        query["outlet_id"] = outlet_id
    
    total_value = 0
    total_items = 0
    low_stock = 0
    by_category = {}
    
    async for soh in stock_on_hand_col.find(query):
        item = await items_col.find_one({"_id": ObjectId(soh["item_id"])})
        if not item:
            continue
        value = soh.get("quantity", 0) * item.get("cost_per_unit", 0)
        total_value += value
        total_items += 1
        
        cat = item.get("category", "Other")
        if cat not in by_category:
            by_category[cat] = {"value": 0, "items": 0, "low": 0}
        by_category[cat]["value"] += value
        by_category[cat]["items"] += 1
        
        if item.get("reorder_threshold", 0) > 0 and soh.get("quantity", 0) <= item["reorder_threshold"]:
            low_stock += 1
            by_category[cat]["low"] += 1
    
    categories = [{"category": k, **v, "pct": round(v["value"] / max(total_value, 1) * 100, 1)} for k, v in sorted(by_category.items(), key=lambda x: x[1]["value"], reverse=True)]
    
    return {
        "total_value": total_value,
        "total_items": total_items,
        "low_stock_count": low_stock,
        "health_score": round(((total_items - low_stock) / max(total_items, 1)) * 100, 1),
        "by_category": categories,
    }
