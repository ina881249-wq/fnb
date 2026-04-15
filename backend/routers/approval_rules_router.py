from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from database import approval_rules_col, approvals_col, users_col, roles_col
from auth import get_current_user, check_permission
from utils.audit import log_audit, serialize_doc
from utils.helpers import now_utc
from bson import ObjectId

router = APIRouter(prefix="/api/approval-rules", tags=["approval_rules"])

class ApprovalRuleRequest(BaseModel):
    name: str
    transaction_type: str  # cash_movement, petty_cash, stock_movement, period_close, etc.
    condition_field: Optional[str] = "amount"  # field to evaluate
    condition_operator: Optional[str] = "gte"  # gte, lte, eq, gt, lt
    condition_value: Optional[float] = 0
    outlet_id: Optional[str] = None  # specific outlet or null for all
    approver_role_ids: List[str] = []  # roles that can approve
    approver_user_ids: List[str] = []  # specific users
    requires_comment: bool = False
    auto_approve_below: Optional[float] = None  # auto-approve if amount below this
    escalation_hours: Optional[int] = 24  # escalate after N hours
    active: bool = True
    description: Optional[str] = ""

@router.get("")
async def list_rules(current_user: dict = Depends(get_current_user), transaction_type: str = "", active_only: bool = True):
    query = {}
    if transaction_type:
        query["transaction_type"] = transaction_type
    if active_only:
        query["active"] = True
    
    rules = []
    async for r in approval_rules_col.find(query).sort("transaction_type", 1):
        doc = serialize_doc(r)
        # Enrich with role names
        role_names = []
        for rid in r.get("approver_role_ids", []):
            role = await roles_col.find_one({"_id": ObjectId(rid)})
            if role:
                role_names.append(role.get("name", ""))
        doc["approver_role_names"] = role_names
        rules.append(doc)
    return {"rules": rules}

@router.post("")
async def create_rule(req: ApprovalRuleRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "approvals.approve")
    doc = {
        **req.dict(),
        "created_by": current_user["id"],
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    result = await approval_rules_col.insert_one(doc)
    await log_audit(current_user["id"], "create", "approvals", "approval_rule", str(result.inserted_id), details=f"Rule: {req.name} for {req.transaction_type}")
    return {"id": str(result.inserted_id), "message": "Approval rule created"}

@router.put("/{rule_id}")
async def update_rule(rule_id: str, req: ApprovalRuleRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "approvals.approve")
    update = {**req.dict(), "updated_at": now_utc()}
    await approval_rules_col.update_one({"_id": ObjectId(rule_id)}, {"$set": update})
    await log_audit(current_user["id"], "update", "approvals", "approval_rule", rule_id)
    return {"message": "Rule updated"}

@router.delete("/{rule_id}")
async def deactivate_rule(rule_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "approvals.approve")
    await approval_rules_col.update_one({"_id": ObjectId(rule_id)}, {"$set": {"active": False, "updated_at": now_utc()}})
    return {"message": "Rule deactivated"}

@router.get("/evaluate")
async def evaluate_approval(transaction_type: str, amount: float = 0, outlet_id: str = "", current_user: dict = Depends(get_current_user)):
    """Check if a transaction needs approval based on rules"""
    query = {"transaction_type": transaction_type, "active": True}
    if outlet_id:
        query["$or"] = [{"outlet_id": outlet_id}, {"outlet_id": None}, {"outlet_id": ""}]
    
    needs_approval = False
    matching_rules = []
    
    async for rule in approval_rules_col.find(query):
        # Auto-approve check
        if rule.get("auto_approve_below") and amount < rule["auto_approve_below"]:
            continue
        
        # Condition check
        cond_value = rule.get("condition_value", 0)
        op = rule.get("condition_operator", "gte")
        
        passes = False
        if op == "gte" and amount >= cond_value:
            passes = True
        elif op == "gt" and amount > cond_value:
            passes = True
        elif op == "lte" and amount <= cond_value:
            passes = True
        elif op == "lt" and amount < cond_value:
            passes = True
        elif op == "eq" and abs(amount - cond_value) < 0.01:
            passes = True
        
        if passes:
            needs_approval = True
            matching_rules.append(serialize_doc(rule))
    
    return {
        "needs_approval": needs_approval,
        "matching_rules": matching_rules,
        "auto_approved": not needs_approval,
    }


# ===================== DELEGATION =====================
class DelegationRequest(BaseModel):
    delegator_id: str  # user going on leave
    delegate_id: str   # user taking over
    start_date: str
    end_date: str
    reason: Optional[str] = ""

@router.get("/delegations")
async def list_delegations(current_user: dict = Depends(get_current_user)):
    """List active approval delegations"""
    from database import db
    delegations_col = db["approval_delegations"]
    delegations = []
    async for d in delegations_col.find({"active": True}).sort("created_at", -1):
        doc = serialize_doc(d)
        delegator = await users_col.find_one({"_id": ObjectId(d["delegator_id"])})
        delegate = await users_col.find_one({"_id": ObjectId(d["delegate_id"])})
        doc["delegator_name"] = delegator.get("name", "") if delegator else ""
        doc["delegate_name"] = delegate.get("name", "") if delegate else ""
        delegations.append(doc)
    return {"delegations": delegations}

@router.post("/delegations")
async def create_delegation(req: DelegationRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "approvals.approve")
    from database import db
    delegations_col = db["approval_delegations"]
    
    doc = {
        "delegator_id": req.delegator_id,
        "delegate_id": req.delegate_id,
        "start_date": req.start_date,
        "end_date": req.end_date,
        "reason": req.reason,
        "active": True,
        "created_by": current_user["id"],
        "created_at": now_utc(),
    }
    result = await delegations_col.insert_one(doc)
    await log_audit(current_user["id"], "create", "approvals", "delegation", str(result.inserted_id), details=f"Delegation: {req.delegator_id} → {req.delegate_id}")
    return {"id": str(result.inserted_id), "message": "Delegation created"}

@router.delete("/delegations/{delegation_id}")
async def revoke_delegation(delegation_id: str, current_user: dict = Depends(get_current_user)):
    from database import db
    delegations_col = db["approval_delegations"]
    await delegations_col.update_one({"_id": ObjectId(delegation_id)}, {"$set": {"active": False}})
    return {"message": "Delegation revoked"}
