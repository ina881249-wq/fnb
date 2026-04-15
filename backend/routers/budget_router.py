from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from database import budgets_col, outlets_col, petty_cash_col, cash_movements_col, sales_summaries_col, coa_accounts_col
from auth import get_current_user, check_permission
from utils.audit import log_audit, serialize_doc
from utils.helpers import now_utc
from bson import ObjectId

router = APIRouter(prefix="/api/budgets", tags=["budgets"])

class BudgetLineInput(BaseModel):
    account_code: str
    account_name: str
    amount: float

class BudgetRequest(BaseModel):
    outlet_id: str
    period: str  # YYYY-MM format
    name: Optional[str] = ""
    lines: List[BudgetLineInput] = []
    total_budget: float = 0
    notes: Optional[str] = ""

@router.get("")
async def list_budgets(current_user: dict = Depends(get_current_user), outlet_id: str = "", period: str = "", skip: int = 0, limit: int = 20):
    query = {}
    if outlet_id:
        query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        query["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    if period:
        query["period"] = period
    
    total = await budgets_col.count_documents(query)
    cursor = budgets_col.find(query).sort("period", -1).skip(skip).limit(limit)
    budgets = []
    async for b in cursor:
        doc = serialize_doc(b)
        if b.get("outlet_id"):
            outlet = await outlets_col.find_one({"_id": ObjectId(b["outlet_id"])})
            doc["outlet_name"] = outlet.get("name", "") if outlet else ""
        budgets.append(doc)
    return {"budgets": budgets, "total": total}

@router.post("")
async def create_budget(req: BudgetRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "finance.manage_accounts")
    
    existing = await budgets_col.find_one({"outlet_id": req.outlet_id, "period": req.period})
    if existing:
        raise HTTPException(status_code=400, detail=f"Budget for this outlet and period already exists")
    
    total = sum(l.amount for l in req.lines) if req.lines else req.total_budget
    doc = {
        "outlet_id": req.outlet_id,
        "period": req.period,
        "name": req.name or f"Budget {req.period}",
        "lines": [l.dict() for l in req.lines],
        "total_budget": total,
        "notes": req.notes,
        "status": "active",
        "created_by": current_user["id"],
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    result = await budgets_col.insert_one(doc)
    await log_audit(current_user["id"], "create", "finance", "budget", str(result.inserted_id), details=f"Budget {req.period}: {total:,.0f}")
    return {"id": str(result.inserted_id), "message": "Budget created"}

@router.put("/{budget_id}")
async def update_budget(budget_id: str, req: BudgetRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "finance.manage_accounts")
    total = sum(l.amount for l in req.lines) if req.lines else req.total_budget
    update = {
        "lines": [l.dict() for l in req.lines],
        "total_budget": total,
        "name": req.name,
        "notes": req.notes,
        "updated_at": now_utc(),
    }
    await budgets_col.update_one({"_id": ObjectId(budget_id)}, {"$set": update})
    await log_audit(current_user["id"], "update", "finance", "budget", budget_id)
    return {"message": "Budget updated"}

@router.get("/vs-actual")
async def budget_vs_actual(current_user: dict = Depends(get_current_user), outlet_id: str = "", period: str = ""):
    """Compare budget vs actual spending for a given outlet and period"""
    if not period:
        from datetime import datetime, timezone
        period = datetime.now(timezone.utc).strftime("%Y-%m")
    
    # Get budget
    budget_query = {"period": period}
    if outlet_id:
        budget_query["outlet_id"] = outlet_id
    
    budgets = []
    async for b in budgets_col.find(budget_query):
        budgets.append(serialize_doc(b))
    
    total_budget = sum(b.get("total_budget", 0) for b in budgets)
    
    # Get actual spending (petty cash + cash out) for the period
    date_prefix = period  # YYYY-MM
    expense_query = {"date": {"$regex": f"^{date_prefix}"}}
    if outlet_id:
        expense_query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        expense_query["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    
    petty_total = 0
    petty_by_cat = {}
    async for p in petty_cash_col.find(expense_query):
        petty_total += p.get("amount", 0)
        cat = p.get("category", "other")
        petty_by_cat[cat] = petty_by_cat.get(cat, 0) + p.get("amount", 0)
    
    cash_out_total = 0
    cm_query = {**expense_query, "type": "cash_out"}
    async for cm in cash_movements_col.find(cm_query):
        cash_out_total += cm.get("amount", 0)
    
    total_actual = petty_total + cash_out_total
    variance = total_budget - total_actual
    burn_rate = (total_actual / total_budget * 100) if total_budget > 0 else 0
    
    # Revenue for the period
    revenue_total = 0
    async for s in sales_summaries_col.find(expense_query):
        revenue_total += s.get("total_sales", 0)
    
    # Budget lines vs actual
    line_comparison = []
    for b in budgets:
        for line in b.get("lines", []):
            actual_for_line = petty_by_cat.get(line.get("account_code", "").lower(), 0)
            line_comparison.append({
                "account_code": line.get("account_code", ""),
                "account_name": line.get("account_name", ""),
                "budget": line.get("amount", 0),
                "actual": actual_for_line,
                "variance": line.get("amount", 0) - actual_for_line,
                "utilization": (actual_for_line / line.get("amount", 1) * 100) if line.get("amount", 0) > 0 else 0,
            })
    
    return {
        "period": period,
        "outlet_id": outlet_id,
        "total_budget": total_budget,
        "total_actual": total_actual,
        "variance": variance,
        "burn_rate": round(burn_rate, 1),
        "is_over_budget": total_actual > total_budget and total_budget > 0,
        "petty_cash_total": petty_total,
        "cash_out_total": cash_out_total,
        "revenue_total": revenue_total,
        "expense_by_category": [{"category": k, "amount": v} for k, v in petty_by_cat.items()],
        "line_comparison": line_comparison,
        "budgets": budgets,
    }
