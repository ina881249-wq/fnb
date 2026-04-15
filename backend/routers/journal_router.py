from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from database import (
    journals_col, journal_lines_col, coa_accounts_col,
    cash_movements_col, petty_cash_col, sales_summaries_col,
    accounts_col, outlets_col
)
from auth import get_current_user, check_permission, check_outlet_access
from utils.audit import log_audit, serialize_doc
from utils.helpers import now_utc
from bson import ObjectId
from datetime import datetime, timezone
import random
import string

router = APIRouter(prefix="/api/journals", tags=["journals"])

def generate_journal_number():
    """Generate unique journal number: JRN-YYYYMMDD-XXXX"""
    date_part = datetime.now(timezone.utc).strftime("%Y%m%d")
    rand_part = ''.join(random.choices(string.digits, k=4))
    return f"JRN-{date_part}-{rand_part}"

class JournalLineInput(BaseModel):
    account_id: str  # COA account id
    account_code: Optional[str] = ""
    account_name: Optional[str] = ""
    debit: float = 0
    credit: float = 0
    description: Optional[str] = ""

class JournalRequest(BaseModel):
    posting_date: str
    description: str
    outlet_id: Optional[str] = None
    source_type: Optional[str] = ""  # cash_movement, petty_cash, settlement, sales, manual
    source_id: Optional[str] = ""
    lines: List[JournalLineInput]
    status: Optional[str] = "draft"  # draft, posted, reversed

@router.get("")
async def list_journals(current_user: dict = Depends(get_current_user), outlet_id: str = "", status: str = "", source_type: str = "", search: str = "", skip: int = 0, limit: int = 20, date_from: str = "", date_to: str = ""):
    query = {}
    if outlet_id:
        query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        query["$or"] = [{"outlet_id": {"$in": current_user.get("outlet_access", [])}}, {"outlet_id": None}, {"outlet_id": ""}]
    if status:
        query["status"] = status
    if source_type:
        query["source_type"] = source_type
    if search:
        query["$or"] = [{"journal_number": {"$regex": search, "$options": "i"}}, {"description": {"$regex": search, "$options": "i"}}]
    if date_from:
        query.setdefault("posting_date", {})["$gte"] = date_from
    if date_to:
        query.setdefault("posting_date", {})["$lte"] = date_to
    
    total = await journals_col.count_documents(query)
    cursor = journals_col.find(query).sort("posting_date", -1).skip(skip).limit(limit)
    journals = []
    async for j in cursor:
        doc = serialize_doc(j)
        # Get outlet name
        if j.get("outlet_id"):
            outlet = await outlets_col.find_one({"_id": ObjectId(j["outlet_id"])})
            doc["outlet_name"] = outlet.get("name", "") if outlet else ""
        # Get line count and totals
        lines = []
        total_debit = 0
        total_credit = 0
        async for line in journal_lines_col.find({"journal_id": str(j["_id"])}):
            total_debit += line.get("debit", 0)
            total_credit += line.get("credit", 0)
            lines.append(serialize_doc(line))
        doc["line_count"] = len(lines)
        doc["total_debit"] = total_debit
        doc["total_credit"] = total_credit
        doc["is_balanced"] = abs(total_debit - total_credit) < 0.01
        journals.append(doc)
    return {"journals": journals, "total": total}

@router.get("/{journal_id}")
async def get_journal(journal_id: str, current_user: dict = Depends(get_current_user)):
    journal = await journals_col.find_one({"_id": ObjectId(journal_id)})
    if not journal:
        raise HTTPException(status_code=404, detail="Journal not found")
    doc = serialize_doc(journal)
    # Get lines
    lines = []
    async for line in journal_lines_col.find({"journal_id": journal_id}).sort("line_number", 1):
        ldoc = serialize_doc(line)
        # Enrich with account info
        if line.get("account_id"):
            acc = await coa_accounts_col.find_one({"_id": ObjectId(line["account_id"])})
            if acc:
                ldoc["account_code"] = acc.get("code", "")
                ldoc["account_name"] = acc.get("name", "")
        lines.append(ldoc)
    doc["lines"] = lines
    doc["total_debit"] = sum(l.get("debit", 0) for l in lines)
    doc["total_credit"] = sum(l.get("credit", 0) for l in lines)
    return doc

@router.post("")
async def create_journal(req: JournalRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "finance.view_journals")
    
    # Validate balanced
    total_debit = sum(l.debit for l in req.lines)
    total_credit = sum(l.credit for l in req.lines)
    if abs(total_debit - total_credit) > 0.01:
        raise HTTPException(status_code=400, detail=f"Journal not balanced: debit={total_debit}, credit={total_credit}")
    
    if len(req.lines) < 2:
        raise HTTPException(status_code=400, detail="Journal must have at least 2 lines")
    
    journal_number = generate_journal_number()
    
    journal_doc = {
        "journal_number": journal_number,
        "posting_date": req.posting_date,
        "description": req.description,
        "outlet_id": req.outlet_id,
        "source_type": req.source_type or "manual",
        "source_id": req.source_id,
        "status": req.status or "draft",
        "total_debit": total_debit,
        "total_credit": total_credit,
        "created_by": current_user["id"],
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    result = await journals_col.insert_one(journal_doc)
    journal_id = str(result.inserted_id)
    
    # Insert lines
    for i, line in enumerate(req.lines):
        line_doc = {
            "journal_id": journal_id,
            "line_number": i + 1,
            "account_id": line.account_id,
            "account_code": line.account_code,
            "account_name": line.account_name,
            "debit": line.debit,
            "credit": line.credit,
            "description": line.description,
        }
        await journal_lines_col.insert_one(line_doc)
    
    await log_audit(current_user["id"], "create", "finance", "journal", journal_id, details=f"Journal {journal_number}: {req.description}")
    return {"id": journal_id, "journal_number": journal_number, "message": "Journal created"}

@router.post("/{journal_id}/post")
async def post_journal(journal_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "finance.view_journals")
    journal = await journals_col.find_one({"_id": ObjectId(journal_id)})
    if not journal:
        raise HTTPException(status_code=404, detail="Journal not found")
    if journal["status"] == "posted":
        raise HTTPException(status_code=400, detail="Journal already posted")
    
    await journals_col.update_one(
        {"_id": ObjectId(journal_id)},
        {"$set": {"status": "posted", "posted_by": current_user["id"], "posted_at": now_utc(), "updated_at": now_utc()}}
    )
    await log_audit(current_user["id"], "post", "finance", "journal", journal_id, details=f"Posted journal {journal['journal_number']}")
    return {"message": "Journal posted"}

@router.post("/{journal_id}/reverse")
async def reverse_journal(journal_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "finance.view_journals")
    journal = await journals_col.find_one({"_id": ObjectId(journal_id)})
    if not journal:
        raise HTTPException(status_code=404, detail="Journal not found")
    if journal["status"] != "posted":
        raise HTTPException(status_code=400, detail="Only posted journals can be reversed")
    
    # Create reversal journal
    reversal_number = generate_journal_number()
    reversal_doc = {
        "journal_number": reversal_number,
        "posting_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "description": f"Reversal of {journal['journal_number']}: {journal.get('description', '')}",
        "outlet_id": journal.get("outlet_id"),
        "source_type": "reversal",
        "source_id": journal_id,
        "status": "posted",
        "total_debit": journal.get("total_credit", 0),
        "total_credit": journal.get("total_debit", 0),
        "created_by": current_user["id"],
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    rev_result = await journals_col.insert_one(reversal_doc)
    
    # Reverse lines (swap debit/credit)
    async for line in journal_lines_col.find({"journal_id": journal_id}):
        rev_line = {
            "journal_id": str(rev_result.inserted_id),
            "line_number": line["line_number"],
            "account_id": line["account_id"],
            "account_code": line.get("account_code", ""),
            "account_name": line.get("account_name", ""),
            "debit": line.get("credit", 0),  # swap
            "credit": line.get("debit", 0),  # swap
            "description": f"Reversal: {line.get('description', '')}",
        }
        await journal_lines_col.insert_one(rev_line)
    
    # Mark original as reversed
    await journals_col.update_one(
        {"_id": ObjectId(journal_id)},
        {"$set": {"status": "reversed", "reversed_by": current_user["id"], "reversed_at": now_utc(), "reversal_id": str(rev_result.inserted_id), "updated_at": now_utc()}}
    )
    
    await log_audit(current_user["id"], "reverse", "finance", "journal", journal_id, details=f"Reversed {journal['journal_number']} → {reversal_number}")
    return {"id": str(rev_result.inserted_id), "journal_number": reversal_number, "message": "Journal reversed"}

@router.get("/summary/by-account")
async def journal_summary_by_account(current_user: dict = Depends(get_current_user), outlet_id: str = "", date_from: str = "", date_to: str = ""):
    """Get aggregated debit/credit totals by COA account from posted journals"""
    match = {"status": "posted"}
    if date_from:
        match.setdefault("posting_date", {})["$gte"] = date_from
    if date_to:
        match.setdefault("posting_date", {})["$lte"] = date_to
    
    # Get journal IDs
    journal_ids = []
    journal_query = {**match}
    if outlet_id:
        journal_query["outlet_id"] = outlet_id
    async for j in journals_col.find(journal_query, {"_id": 1}):
        journal_ids.append(str(j["_id"]))
    
    # Aggregate lines
    pipeline = [
        {"$match": {"journal_id": {"$in": journal_ids}}},
        {"$group": {
            "_id": "$account_id",
            "total_debit": {"$sum": "$debit"},
            "total_credit": {"$sum": "$credit"},
            "count": {"$sum": 1}
        }}
    ]
    
    summary = []
    async for s in journal_lines_col.aggregate(pipeline):
        acc = await coa_accounts_col.find_one({"_id": ObjectId(s["_id"])})
        summary.append({
            "account_id": s["_id"],
            "account_code": acc.get("code", "") if acc else "",
            "account_name": acc.get("name", "") if acc else "",
            "account_type": acc.get("account_type", "") if acc else "",
            "total_debit": s["total_debit"],
            "total_credit": s["total_credit"],
            "balance": s["total_debit"] - s["total_credit"],
            "line_count": s["count"],
        })
    
    return {"summary": sorted(summary, key=lambda x: x.get("account_code", ""))}

# ===================== POSTING SERVICE =====================
async def auto_post_journal(source_type: str, source_id: str, description: str, outlet_id: str, posting_date: str, lines: list, user_id: str):
    """Auto-create and post a journal entry from a financial transaction"""
    total_debit = sum(l["debit"] for l in lines)
    total_credit = sum(l["credit"] for l in lines)
    
    if abs(total_debit - total_credit) > 0.01:
        return None  # Skip if not balanced
    
    journal_number = generate_journal_number()
    journal_doc = {
        "journal_number": journal_number,
        "posting_date": posting_date,
        "description": description,
        "outlet_id": outlet_id,
        "source_type": source_type,
        "source_id": source_id,
        "status": "posted",
        "total_debit": total_debit,
        "total_credit": total_credit,
        "created_by": user_id,
        "posted_by": user_id,
        "created_at": now_utc(),
        "updated_at": now_utc(),
        "posted_at": now_utc(),
    }
    result = await journals_col.insert_one(journal_doc)
    journal_id = str(result.inserted_id)
    
    for i, line in enumerate(lines):
        line_doc = {
            "journal_id": journal_id,
            "line_number": i + 1,
            "account_id": line.get("account_id", ""),
            "account_code": line.get("account_code", ""),
            "account_name": line.get("account_name", ""),
            "debit": line.get("debit", 0),
            "credit": line.get("credit", 0),
            "description": line.get("description", ""),
        }
        await journal_lines_col.insert_one(line_doc)
    
    return {"journal_id": journal_id, "journal_number": journal_number}
