from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from database import (
    accounts_col, cash_movements_col, settlement_rules_col,
    petty_cash_col, accounting_periods_col, journals_col,
    sales_summaries_col, outlets_col
)
from auth import get_current_user, check_permission, check_outlet_access
from utils.audit import log_audit, serialize_doc
from utils.helpers import now_utc
from websocket_manager import ws_manager
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter(prefix="/api/finance", tags=["finance"])

# ===================== ACCOUNTS =====================
class AccountRequest(BaseModel):
    name: str
    type: str  # bank, outlet_cash, petty_cash, clearing, expense, revenue, cogs
    outlet_id: Optional[str] = None
    currency: str = "IDR"
    opening_balance: float = 0
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    description: Optional[str] = ""

@router.get("/accounts")
async def list_accounts(current_user: dict = Depends(get_current_user), outlet_id: str = "", type: str = "", skip: int = 0, limit: int = 100):
    query = {}
    if outlet_id:
        await check_outlet_access(current_user, outlet_id)
        query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        outlet_ids = current_user.get("outlet_access", [])
        query["$or"] = [{"outlet_id": {"$in": outlet_ids}}, {"outlet_id": None}, {"outlet_id": ""}]
    if type:
        query["type"] = type
    total = await accounts_col.count_documents(query)
    cursor = accounts_col.find(query).sort("name", 1).skip(skip).limit(limit)
    accounts = []
    async for a in cursor:
        doc = serialize_doc(a)
        # Enrich with outlet name
        if a.get("outlet_id"):
            outlet = await outlets_col.find_one({"_id": ObjectId(a["outlet_id"])})
            doc["outlet_name"] = outlet.get("name", "") if outlet else ""
        accounts.append(doc)
    return {"accounts": accounts, "total": total}

@router.post("/accounts")
async def create_account(req: AccountRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "finance.manage_accounts")
    doc = {
        "name": req.name,
        "type": req.type,
        "outlet_id": req.outlet_id,
        "currency": req.currency,
        "opening_balance": req.opening_balance,
        "current_balance": req.opening_balance,
        "bank_name": req.bank_name,
        "account_number": req.account_number,
        "description": req.description,
        "status": "active",
        "created_at": now_utc(),
        "updated_at": now_utc(),
        "created_by": current_user["id"],
    }
    result = await accounts_col.insert_one(doc)
    await log_audit(current_user["id"], "create", "finance", "account", str(result.inserted_id), details=f"{req.type}: {req.name}")
    return {"id": str(result.inserted_id), "message": "Account created"}

@router.put("/accounts/{account_id}")
async def update_account(account_id: str, req: AccountRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "finance.manage_accounts")
    update = {**req.dict(exclude_unset=True), "updated_at": now_utc()}
    result = await accounts_col.update_one({"_id": ObjectId(account_id)}, {"$set": update})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    await log_audit(current_user["id"], "update", "finance", "account", account_id)
    return {"message": "Account updated"}

# ===================== CASH MOVEMENTS =====================
class CashMovementRequest(BaseModel):
    type: str  # cash_in, cash_out, transfer, settlement
    from_account_id: Optional[str] = None
    to_account_id: Optional[str] = None
    amount: float
    outlet_id: str
    reference: Optional[str] = ""
    description: Optional[str] = ""
    date: Optional[str] = None
    requires_approval: bool = False

@router.get("/cash-movements")
async def list_cash_movements(current_user: dict = Depends(get_current_user), outlet_id: str = "", type: str = "", skip: int = 0, limit: int = 50, date_from: str = "", date_to: str = ""):
    query = {}
    if outlet_id:
        await check_outlet_access(current_user, outlet_id)
        query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        query["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    if type:
        query["type"] = type
    if date_from:
        query.setdefault("date", {})["$gte"] = date_from
    if date_to:
        query.setdefault("date", {})["$lte"] = date_to
    total = await cash_movements_col.count_documents(query)
    cursor = cash_movements_col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    movements = []
    async for m in cursor:
        doc = serialize_doc(m)
        # Enrich account names
        if m.get("from_account_id"):
            acc = await accounts_col.find_one({"_id": ObjectId(m["from_account_id"])})
            doc["from_account_name"] = acc.get("name", "") if acc else ""
        if m.get("to_account_id"):
            acc = await accounts_col.find_one({"_id": ObjectId(m["to_account_id"])})
            doc["to_account_name"] = acc.get("name", "") if acc else ""
        movements.append(doc)
    return {"movements": movements, "total": total}

@router.post("/cash-movements")
async def create_cash_movement(req: CashMovementRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "finance.create_cash_movement")
    await check_outlet_access(current_user, req.outlet_id)
    
    doc = {
        "type": req.type,
        "from_account_id": req.from_account_id,
        "to_account_id": req.to_account_id,
        "amount": req.amount,
        "outlet_id": req.outlet_id,
        "reference": req.reference,
        "description": req.description,
        "date": req.date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "status": "pending_approval" if req.requires_approval else "completed",
        "created_by": current_user["id"],
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    result = await cash_movements_col.insert_one(doc)
    movement_id = str(result.inserted_id)
    
    # Update account balances if not requiring approval
    if not req.requires_approval:
        if req.from_account_id:
            await accounts_col.update_one(
                {"_id": ObjectId(req.from_account_id)},
                {"$inc": {"current_balance": -req.amount}, "$set": {"updated_at": now_utc()}}
            )
        if req.to_account_id:
            await accounts_col.update_one(
                {"_id": ObjectId(req.to_account_id)},
                {"$inc": {"current_balance": req.amount}, "$set": {"updated_at": now_utc()}}
            )
    
    await log_audit(current_user["id"], "create", "finance", "cash_movement", movement_id, details=f"{req.type}: {req.amount}")
    
    # Auto-post journal entry for this cash movement
    if not req.requires_approval:
        try:
            from routers.journal_router import auto_post_journal
            from database import coa_accounts_col
            # Find appropriate COA accounts
            cash_coa = await coa_accounts_col.find_one({"code": "1120"})  # Outlet Cash
            bank_coa = await coa_accounts_col.find_one({"code": "1110"})  # Bank
            revenue_coa = await coa_accounts_col.find_one({"code": "4100"})  # Food Sales
            petty_coa = await coa_accounts_col.find_one({"code": "1130"})  # Petty Cash
            
            lines = []
            if req.type == "cash_in" and cash_coa and revenue_coa:
                lines = [
                    {"account_id": str(cash_coa["_id"]), "account_code": "1120", "account_name": "Outlet Cash", "debit": req.amount, "credit": 0, "description": "Cash in"},
                    {"account_id": str(revenue_coa["_id"]), "account_code": "4100", "account_name": "Food Sales", "debit": 0, "credit": req.amount, "description": "Revenue"},
                ]
            elif req.type == "cash_out" and cash_coa:
                expense_coa = await coa_accounts_col.find_one({"code": "6900"})
                if expense_coa:
                    lines = [
                        {"account_id": str(expense_coa["_id"]), "account_code": "6900", "account_name": "Misc Expense", "debit": req.amount, "credit": 0, "description": "Cash out"},
                        {"account_id": str(cash_coa["_id"]), "account_code": "1120", "account_name": "Outlet Cash", "debit": 0, "credit": req.amount, "description": "Cash out"},
                    ]
            elif req.type == "settlement" and cash_coa and bank_coa:
                lines = [
                    {"account_id": str(bank_coa["_id"]), "account_code": "1110", "account_name": "Bank", "debit": req.amount, "credit": 0, "description": "Settlement to bank"},
                    {"account_id": str(cash_coa["_id"]), "account_code": "1120", "account_name": "Outlet Cash", "debit": 0, "credit": req.amount, "description": "Settlement from cash"},
                ]
            elif req.type == "transfer" and cash_coa and bank_coa:
                lines = [
                    {"account_id": str(bank_coa["_id"]), "account_code": "1110", "account_name": "Bank", "debit": req.amount, "credit": 0, "description": "Transfer in"},
                    {"account_id": str(cash_coa["_id"]), "account_code": "1120", "account_name": "Outlet Cash", "debit": 0, "credit": req.amount, "description": "Transfer out"},
                ]
            
            if lines:
                await auto_post_journal(
                    source_type="cash_movement", source_id=movement_id,
                    description=f"{req.type}: {req.description or req.reference or ''} - Rp {req.amount:,.0f}",
                    outlet_id=req.outlet_id,
                    posting_date=doc["date"],
                    lines=lines, user_id=current_user["id"]
                )
        except Exception as e:
            print(f"Auto-journal posting error: {e}")
    
    await ws_manager.broadcast_to_outlet(req.outlet_id, {
        "type": "cash_movement_created",
        "movement_id": movement_id,
        "amount": req.amount,
        "movement_type": req.type,
    })
    
    return {"id": movement_id, "message": "Cash movement recorded"}

# ===================== SETTLEMENT RULES =====================
class SettlementRuleRequest(BaseModel):
    outlet_id: str
    from_account_type: str = "outlet_cash"
    to_account_id: str
    mode: str = "manual"  # manual, auto
    description: Optional[str] = ""

@router.get("/settlement-rules")
async def list_settlement_rules(current_user: dict = Depends(get_current_user), outlet_id: str = ""):
    query = {}
    if outlet_id:
        query["outlet_id"] = outlet_id
    rules = []
    async for r in settlement_rules_col.find(query):
        rules.append(serialize_doc(r))
    return {"rules": rules}

@router.post("/settlement-rules")
async def create_settlement_rule(req: SettlementRuleRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "finance.manage_settlement")
    doc = {**req.dict(), "created_at": now_utc(), "created_by": current_user["id"]}
    result = await settlement_rules_col.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Settlement rule created"}

# ===================== PETTY CASH =====================
class PettyCashExpenseRequest(BaseModel):
    outlet_id: str
    account_id: str
    amount: float
    description: str
    category: Optional[str] = "operational"
    receipt_ref: Optional[str] = ""
    date: Optional[str] = None

@router.get("/petty-cash")
async def list_petty_cash(current_user: dict = Depends(get_current_user), outlet_id: str = "", skip: int = 0, limit: int = 50):
    query = {}
    if outlet_id:
        await check_outlet_access(current_user, outlet_id)
        query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        query["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    total = await petty_cash_col.count_documents(query)
    cursor = petty_cash_col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    expenses = []
    async for e in cursor:
        expenses.append(serialize_doc(e))
    return {"expenses": expenses, "total": total}

@router.post("/petty-cash")
async def create_petty_cash_expense(req: PettyCashExpenseRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "finance.manage_petty_cash")
    await check_outlet_access(current_user, req.outlet_id)
    
    doc = {
        "outlet_id": req.outlet_id,
        "account_id": req.account_id,
        "amount": req.amount,
        "description": req.description,
        "category": req.category,
        "receipt_ref": req.receipt_ref,
        "date": req.date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "status": "recorded",
        "created_by": current_user["id"],
        "created_at": now_utc(),
    }
    result = await petty_cash_col.insert_one(doc)
    
    # Deduct from petty cash account
    await accounts_col.update_one(
        {"_id": ObjectId(req.account_id)},
        {"$inc": {"current_balance": -req.amount}, "$set": {"updated_at": now_utc()}}
    )
    
    await log_audit(current_user["id"], "create", "finance", "petty_cash", str(result.inserted_id), details=f"Expense: {req.amount} - {req.description}")
    
    # Auto-post journal for petty cash expense
    try:
        from routers.journal_router import auto_post_journal
        from database import coa_accounts_col
        petty_coa = await coa_accounts_col.find_one({"code": "1130"})  # Petty Cash
        # Map category to expense account
        cat_map = {"transport": "6300", "supplies": "6400", "cleaning": "6400", "maintenance": "6500", "operational": "6900"}
        exp_code = cat_map.get(req.category, "6900")
        expense_coa = await coa_accounts_col.find_one({"code": exp_code})
        if petty_coa and expense_coa:
            await auto_post_journal(
                source_type="petty_cash", source_id=str(result.inserted_id),
                description=f"Petty Cash: {req.description} - Rp {req.amount:,.0f}",
                outlet_id=req.outlet_id, posting_date=doc["date"],
                lines=[
                    {"account_id": str(expense_coa["_id"]), "account_code": exp_code, "account_name": expense_coa["name"], "debit": req.amount, "credit": 0, "description": req.description},
                    {"account_id": str(petty_coa["_id"]), "account_code": "1130", "account_name": "Petty Cash", "debit": 0, "credit": req.amount, "description": req.description},
                ],
                user_id=current_user["id"]
            )
    except Exception as e:
        print(f"Auto-journal petty cash error: {e}")
    
    return {"id": str(result.inserted_id), "message": "Petty cash expense recorded"}

# ===================== SALES SUMMARIES =====================
class SalesSummaryRequest(BaseModel):
    outlet_id: str
    date: str
    total_sales: float
    cash_sales: float = 0
    card_sales: float = 0
    online_sales: float = 0
    other_sales: float = 0
    notes: Optional[str] = ""

@router.get("/sales-summaries")
async def list_sales_summaries(current_user: dict = Depends(get_current_user), outlet_id: str = "", skip: int = 0, limit: int = 30):
    query = {}
    if outlet_id:
        await check_outlet_access(current_user, outlet_id)
        query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        query["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    total = await sales_summaries_col.count_documents(query)
    cursor = sales_summaries_col.find(query).sort("date", -1).skip(skip).limit(limit)
    summaries = []
    async for s in cursor:
        doc = serialize_doc(s)
        if s.get("outlet_id"):
            outlet = await outlets_col.find_one({"_id": ObjectId(s["outlet_id"])})
            doc["outlet_name"] = outlet.get("name", "") if outlet else ""
        summaries.append(doc)
    return {"summaries": summaries, "total": total}

@router.post("/sales-summaries")
async def create_sales_summary(req: SalesSummaryRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "outlet.create_sales_summary")
    await check_outlet_access(current_user, req.outlet_id)
    
    # Check if already exists for this date and outlet
    existing = await sales_summaries_col.find_one({"outlet_id": req.outlet_id, "date": req.date})
    if existing:
        await sales_summaries_col.update_one(
            {"_id": existing["_id"]},
            {"$set": {**req.dict(), "updated_by": current_user["id"], "updated_at": now_utc()}}
        )
        await log_audit(current_user["id"], "update", "finance", "sales_summary", str(existing["_id"]), details=f"Updated sales for {req.date}")
        return {"id": str(existing["_id"]), "message": "Sales summary updated"}
    
    doc = {
        **req.dict(),
        "created_by": current_user["id"],
        "created_at": now_utc(),
    }
    result = await sales_summaries_col.insert_one(doc)
    await log_audit(current_user["id"], "create", "finance", "sales_summary", str(result.inserted_id), details=f"Sales for {req.date}: {req.total_sales}")

    # Auto-post journal for sales summary (revenue recognition)
    try:
        from utils.posting_service import post_sales_summary_journal
        ss_doc = await sales_summaries_col.find_one({"_id": result.inserted_id})
        if ss_doc:
            await post_sales_summary_journal(ss_doc, current_user["id"])
    except Exception as e:
        print(f"Auto-journal sales_summary error: {e}")

    return {"id": str(result.inserted_id), "message": "Sales summary recorded"}

# ===================== ACCOUNTING PERIODS =====================
class PeriodRequest(BaseModel):
    name: str
    start_date: str
    end_date: str

@router.get("/periods")
async def list_periods(current_user: dict = Depends(get_current_user)):
    periods = []
    async for p in accounting_periods_col.find().sort("start_date", -1):
        periods.append(serialize_doc(p))
    return {"periods": periods}

@router.post("/periods")
async def create_period(req: PeriodRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "finance.close_period")
    doc = {
        "name": req.name,
        "start_date": req.start_date,
        "end_date": req.end_date,
        "status": "open",
        "created_at": now_utc(),
        "created_by": current_user["id"],
    }
    result = await accounting_periods_col.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Period created"}

@router.post("/periods/{period_id}/close")
async def close_period(period_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "finance.close_period")
    period = await accounting_periods_col.find_one({"_id": ObjectId(period_id)})
    if not period:
        raise HTTPException(status_code=404, detail="Period not found")
    if period["status"] == "closed":
        raise HTTPException(status_code=400, detail="Period already closed")
    
    await accounting_periods_col.update_one(
        {"_id": ObjectId(period_id)},
        {"$set": {"status": "closed", "closed_by": current_user["id"], "closed_at": now_utc()}}
    )
    await log_audit(current_user["id"], "close", "finance", "period", period_id, details=f"Closed period {period['name']}")
    return {"message": "Period closed"}

# ===================== DASHBOARD DATA =====================
@router.get("/dashboard")
async def finance_dashboard(current_user: dict = Depends(get_current_user), outlet_id: str = ""):
    """Get financial dashboard data"""
    account_query = {}
    movement_query = {}
    if outlet_id:
        account_query["outlet_id"] = outlet_id
        movement_query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        outlets = current_user.get("outlet_access", [])
        account_query["$or"] = [{"outlet_id": {"$in": outlets}}, {"outlet_id": None}, {"outlet_id": ""}]
        movement_query["outlet_id"] = {"$in": outlets}
    
    # Total balances by type
    pipeline = [
        {"$match": account_query},
        {"$group": {"_id": "$type", "total": {"$sum": "$current_balance"}, "count": {"$sum": 1}}}
    ]
    balance_by_type = {}
    async for b in accounts_col.aggregate(pipeline):
        balance_by_type[b["_id"]] = {"total": b["total"], "count": b["count"]}
    
    # Recent movements
    recent_movements = []
    async for m in cash_movements_col.find(movement_query).sort("created_at", -1).limit(10):
        recent_movements.append(serialize_doc(m))
    
    # Daily sales trend (last 30 days)
    sales_pipeline = [
        {"$match": movement_query},
        {"$sort": {"date": -1}},
        {"$limit": 30},
        {"$group": {"_id": "$date", "total_sales": {"$sum": "$total_sales"}}},
        {"$sort": {"_id": -1}}
    ]
    sales_trend = []
    async for s in sales_summaries_col.aggregate(sales_pipeline):
        sales_trend.append({"date": s["_id"], "total_sales": s["total_sales"]})
    
    # Petty cash total
    pc_pipeline = [
        {"$match": movement_query},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    petty_total = 0
    async for p in petty_cash_col.aggregate(pc_pipeline):
        petty_total = p["total"]
    
    return {
        "balance_by_type": balance_by_type,
        "recent_movements": recent_movements,
        "sales_trend": sales_trend,
        "petty_cash_total": petty_total,
        "total_bank_balance": balance_by_type.get("bank", {}).get("total", 0),
        "total_cash_balance": balance_by_type.get("outlet_cash", {}).get("total", 0),
        "total_petty_cash": balance_by_type.get("petty_cash", {}).get("total", 0),
    }

@router.get("/cash-position")
async def daily_cash_position(current_user: dict = Depends(get_current_user), outlet_id: str = "", date: str = ""):
    """Get daily cash position for outlet"""
    if not date:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    query = {"date": date}
    if outlet_id:
        await check_outlet_access(current_user, outlet_id)
        query["outlet_id"] = outlet_id
    
    # Get cash movements for the day
    movements_in = 0
    movements_out = 0
    async for m in cash_movements_col.find(query):
        if m.get("type") in ["cash_in", "settlement"]:
            movements_in += m.get("amount", 0)
        else:
            movements_out += m.get("amount", 0)
    
    # Get sales for the day
    sales = await sales_summaries_col.find_one({"outlet_id": outlet_id, "date": date})
    
    # Get account balances
    accounts = []
    async for a in accounts_col.find({"outlet_id": outlet_id, "type": {"$in": ["outlet_cash", "petty_cash"]}}):
        accounts.append(serialize_doc(a))
    
    return {
        "date": date,
        "outlet_id": outlet_id,
        "cash_in": movements_in,
        "cash_out": movements_out,
        "net_cash": movements_in - movements_out,
        "sales": serialize_doc(sales) if sales else None,
        "accounts": accounts,
    }
