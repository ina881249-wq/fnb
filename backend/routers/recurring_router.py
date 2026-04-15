from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from database import recurring_transactions_col, outlets_col
from auth import get_current_user, check_permission
from utils.audit import log_audit, serialize_doc
from utils.helpers import now_utc
from bson import ObjectId
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/api/recurring", tags=["recurring"])

class RecurringRequest(BaseModel):
    name: str
    transaction_type: str  # cash_movement, petty_cash, settlement
    frequency: str  # daily, weekly, monthly
    amount: float
    outlet_id: Optional[str] = None
    from_account_id: Optional[str] = None
    to_account_id: Optional[str] = None
    description: Optional[str] = ""
    day_of_week: Optional[int] = None  # 0=Mon for weekly
    day_of_month: Optional[int] = None  # 1-28 for monthly
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    auto_approve: bool = False

@router.get("")
async def list_recurring(current_user: dict = Depends(get_current_user), status: str = "", skip: int = 0, limit: int = 20):
    query = {}
    if status:
        query["status"] = status
    if not current_user.get("is_superadmin"):
        query["$or"] = [{"outlet_id": {"$in": current_user.get("outlet_access", [])}}, {"outlet_id": None}]
    
    total = await recurring_transactions_col.count_documents(query)
    cursor = recurring_transactions_col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = []
    async for r in cursor:
        doc = serialize_doc(r)
        if r.get("outlet_id"):
            outlet = await outlets_col.find_one({"_id": ObjectId(r["outlet_id"])})
            doc["outlet_name"] = outlet.get("name", "") if outlet else ""
        items.append(doc)
    return {"recurring": items, "total": total}

@router.post("")
async def create_recurring(req: RecurringRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "finance.manage_accounts")
    
    # Calculate next run
    today = datetime.now(timezone.utc)
    if req.frequency == "daily":
        next_run = (today + timedelta(days=1)).strftime("%Y-%m-%d")
    elif req.frequency == "weekly":
        days_ahead = (req.day_of_week or 0) - today.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        next_run = (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
    elif req.frequency == "monthly":
        dom = req.day_of_month or 1
        if today.day >= dom:
            if today.month == 12:
                next_run = f"{today.year + 1}-01-{dom:02d}"
            else:
                next_run = f"{today.year}-{today.month + 1:02d}-{dom:02d}"
        else:
            next_run = f"{today.year}-{today.month:02d}-{dom:02d}"
    else:
        next_run = req.start_date or today.strftime("%Y-%m-%d")
    
    doc = {
        **req.dict(),
        "status": "active",  # active, paused, expired
        "next_run": next_run,
        "last_run": None,
        "run_count": 0,
        "created_by": current_user["id"],
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    result = await recurring_transactions_col.insert_one(doc)
    await log_audit(current_user["id"], "create", "finance", "recurring_transaction", str(result.inserted_id), details=f"Recurring: {req.name} ({req.frequency})")
    return {"id": str(result.inserted_id), "next_run": next_run, "message": "Recurring transaction created"}

@router.post("/{rec_id}/pause")
async def pause_recurring(rec_id: str, current_user: dict = Depends(get_current_user)):
    await recurring_transactions_col.update_one(
        {"_id": ObjectId(rec_id)},
        {"$set": {"status": "paused", "updated_at": now_utc()}}
    )
    return {"message": "Recurring transaction paused"}

@router.post("/{rec_id}/resume")
async def resume_recurring(rec_id: str, current_user: dict = Depends(get_current_user)):
    await recurring_transactions_col.update_one(
        {"_id": ObjectId(rec_id)},
        {"$set": {"status": "active", "updated_at": now_utc()}}
    )
    return {"message": "Recurring transaction resumed"}

@router.delete("/{rec_id}")
async def delete_recurring(rec_id: str, current_user: dict = Depends(get_current_user)):
    await recurring_transactions_col.update_one(
        {"_id": ObjectId(rec_id)},
        {"$set": {"status": "expired", "updated_at": now_utc()}}
    )
    return {"message": "Recurring transaction expired"}

@router.get("/stats")
async def recurring_stats(current_user: dict = Depends(get_current_user)):
    pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}, "total_amount": {"$sum": "$amount"}}}]
    stats = {}
    async for s in recurring_transactions_col.aggregate(pipeline):
        stats[s["_id"]] = {"count": s["count"], "total_amount": s["total_amount"]}
    return stats
