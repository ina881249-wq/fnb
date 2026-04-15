from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from database import coa_accounts_col
from auth import get_current_user, check_permission
from utils.audit import log_audit, serialize_doc
from utils.helpers import now_utc
from bson import ObjectId

router = APIRouter(prefix="/api/coa", tags=["chart_of_accounts"])

# Account types for COA
ACCOUNT_TYPES = ["asset", "liability", "equity", "revenue", "expense", "cogs", "contra"]

class COAAccountRequest(BaseModel):
    code: str
    name: str
    account_type: str  # asset, liability, equity, revenue, expense, cogs
    parent_id: Optional[str] = None
    description: Optional[str] = ""
    is_header: bool = False  # header accounts can't receive postings
    report_mapping: Optional[str] = ""  # pnl, balance_sheet, cashflow
    normal_balance: Optional[str] = "debit"  # debit or credit
    active: bool = True

@router.get("")
async def list_coa_accounts(current_user: dict = Depends(get_current_user), account_type: str = "", search: str = "", parent_id: str = "", active_only: bool = True):
    """List all COA accounts with optional filters"""
    query = {}
    if account_type:
        query["account_type"] = account_type
    if search:
        query["$or"] = [{"code": {"$regex": search, "$options": "i"}}, {"name": {"$regex": search, "$options": "i"}}]
    if parent_id:
        query["parent_id"] = parent_id
    elif parent_id == "":
        pass  # show all
    if active_only:
        query["active"] = True
    
    accounts = []
    async for a in coa_accounts_col.find(query).sort("code", 1):
        doc = serialize_doc(a)
        # Get children count
        children_count = await coa_accounts_col.count_documents({"parent_id": str(a["_id"])})
        doc["children_count"] = children_count
        accounts.append(doc)
    return {"accounts": accounts, "total": len(accounts)}

@router.get("/tree")
async def get_coa_tree(current_user: dict = Depends(get_current_user), active_only: bool = True):
    """Get COA as a tree structure"""
    query = {}
    if active_only:
        query["active"] = True
    
    all_accounts = []
    async for a in coa_accounts_col.find(query).sort("code", 1):
        all_accounts.append(serialize_doc(a))
    
    # Build tree
    account_map = {a["id"]: {**a, "children": []} for a in all_accounts}
    roots = []
    for a in all_accounts:
        parent = a.get("parent_id")
        if parent and parent in account_map:
            account_map[parent]["children"].append(account_map[a["id"]])
        else:
            roots.append(account_map[a["id"]])
    
    return {"tree": roots}

@router.get("/types")
async def get_account_types(current_user: dict = Depends(get_current_user)):
    return {"types": ACCOUNT_TYPES}

@router.post("")
async def create_coa_account(req: COAAccountRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "finance.manage_accounts")
    
    # Check unique code
    existing = await coa_accounts_col.find_one({"code": req.code})
    if existing:
        raise HTTPException(status_code=400, detail=f"Account code '{req.code}' already exists")
    
    if req.account_type not in ACCOUNT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid account type. Must be one of: {ACCOUNT_TYPES}")
    
    doc = {
        **req.dict(),
        "normal_balance": "debit" if req.account_type in ["asset", "expense", "cogs"] else "credit",
        "created_at": now_utc(),
        "updated_at": now_utc(),
        "created_by": current_user["id"],
    }
    result = await coa_accounts_col.insert_one(doc)
    await log_audit(current_user["id"], "create", "finance", "coa_account", str(result.inserted_id), details=f"COA: {req.code} - {req.name}")
    return {"id": str(result.inserted_id), "message": "Account created"}

@router.put("/{account_id}")
async def update_coa_account(account_id: str, req: COAAccountRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "finance.manage_accounts")
    
    # Check unique code (excluding current)
    existing = await coa_accounts_col.find_one({"code": req.code, "_id": {"$ne": ObjectId(account_id)}})
    if existing:
        raise HTTPException(status_code=400, detail=f"Account code '{req.code}' already exists")
    
    update = {**req.dict(), "updated_at": now_utc()}
    result = await coa_accounts_col.update_one({"_id": ObjectId(account_id)}, {"$set": update})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    await log_audit(current_user["id"], "update", "finance", "coa_account", account_id)
    return {"message": "Account updated"}

@router.delete("/{account_id}")
async def deactivate_coa_account(account_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "finance.manage_accounts")
    # Don't delete, deactivate
    children = await coa_accounts_col.count_documents({"parent_id": account_id})
    if children > 0:
        raise HTTPException(status_code=400, detail="Cannot deactivate account with children. Deactivate children first.")
    await coa_accounts_col.update_one({"_id": ObjectId(account_id)}, {"$set": {"active": False, "updated_at": now_utc()}})
    await log_audit(current_user["id"], "deactivate", "finance", "coa_account", account_id)
    return {"message": "Account deactivated"}
