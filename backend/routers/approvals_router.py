from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from database import approvals_col, users_col
from auth import get_current_user, check_permission
from utils.audit import log_audit, serialize_doc
from utils.helpers import now_utc
from websocket_manager import ws_manager
from bson import ObjectId

router = APIRouter(prefix="/api/approvals", tags=["approvals"])

class ApprovalRequest(BaseModel):
    type: str  # cash_movement, stock_movement, petty_cash, period_close, etc.
    module: str
    description: str
    data: dict = {}
    outlet_id: Optional[str] = None
    amount: Optional[float] = None

class ApprovalAction(BaseModel):
    comment: Optional[str] = ""

@router.get("")
async def list_approvals(current_user: dict = Depends(get_current_user), status: str = "", skip: int = 0, limit: int = 50, outlet_id: str = ""):
    query = {}
    if status:
        query["status"] = status
    if outlet_id:
        query["outlet_id"] = outlet_id
    
    # Non-superadmin can only see their own or ones assigned to them
    if not current_user.get("is_superadmin"):
        query["$or"] = [
            {"requester_id": current_user["id"]},
            {"approver_ids": current_user["id"]},
            {"outlet_id": {"$in": current_user.get("outlet_access", [])}},
        ]
    
    total = await approvals_col.count_documents(query)
    cursor = approvals_col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    approvals = []
    async for a in cursor:
        doc = serialize_doc(a)
        # Enrich with user names
        if a.get("requester_id"):
            user = await users_col.find_one({"_id": ObjectId(a["requester_id"])})
            doc["requester_name"] = user.get("name", "Unknown") if user else "Unknown"
        approvals.append(doc)
    return {"approvals": approvals, "total": total}

@router.post("")
async def submit_approval(req: ApprovalRequest, current_user: dict = Depends(get_current_user)):
    doc = {
        "type": req.type,
        "module": req.module,
        "description": req.description,
        "data": req.data,
        "outlet_id": req.outlet_id,
        "amount": req.amount,
        "requester_id": current_user["id"],
        "approver_ids": [],  # Will be assigned based on rules or manually
        "status": "pending",
        "comments": [],
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    result = await approvals_col.insert_one(doc)
    approval_id = str(result.inserted_id)
    
    await log_audit(current_user["id"], "submit", "approvals", req.type, approval_id, details=req.description)
    
    # WebSocket notification
    await ws_manager.broadcast_all({
        "type": "approval_submitted",
        "approval_id": approval_id,
        "description": req.description,
        "requester": current_user["name"],
    })

    # Notification center: ping approvers (for now, broadcast to management portal + outlet)
    try:
        from utils.notification_service import create_notification
        await create_notification(
            type="approval",
            title=f"Approval diminta: {req.type}",
            body=f"{req.description} (oleh {current_user.get('name', 'user')}{f', Rp {req.amount:,.0f}' if req.amount else ''})",
            severity="warning",
            outlet_id=req.outlet_id,
            portal_scope=["management", "outlet"],
            ref_type="approval",
            ref_id=approval_id,
            link="/management/approvals",
        )
    except Exception as e:
        print(f"[notif] approval notify failed: {e}")
    
    return {"id": approval_id, "message": "Approval submitted"}

@router.post("/{approval_id}/approve")
async def approve_request(approval_id: str, req: ApprovalAction, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "approvals.approve")
    approval = await approvals_col.find_one({"_id": ObjectId(approval_id)})
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    if approval["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot approve: status is {approval['status']}")
    
    comment_entry = {
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "action": "approved",
        "comment": req.comment,
        "timestamp": now_utc(),
    }
    
    await approvals_col.update_one(
        {"_id": ObjectId(approval_id)},
        {
            "$set": {"status": "approved", "approved_by": current_user["id"], "approved_at": now_utc(), "updated_at": now_utc()},
            "$push": {"comments": comment_entry}
        }
    )
    
    await log_audit(current_user["id"], "approve", "approvals", approval["type"], approval_id, details=req.comment)
    
    await ws_manager.broadcast_all({
        "type": "approval_approved",
        "approval_id": approval_id,
        "approved_by": current_user["name"],
    })

    # Notification to requester
    try:
        from utils.notification_service import create_notification
        await create_notification(
            type="approval",
            title="Approval disetujui ✓",
            body=f"Permintaan Anda ({approval.get('description', '-')}) telah disetujui oleh {current_user.get('name')}",
            severity="success",
            user_id=approval.get("requester_id"),
            ref_type="approval",
            ref_id=approval_id,
            link="/management/approvals",
        )
    except Exception as e:
        print(f"[notif] approval approved notify failed: {e}")
    
    return {"message": "Approved successfully"}

@router.post("/{approval_id}/reject")
async def reject_request(approval_id: str, req: ApprovalAction, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "approvals.reject")
    approval = await approvals_col.find_one({"_id": ObjectId(approval_id)})
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    if approval["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot reject: status is {approval['status']}")
    
    comment_entry = {
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "action": "rejected",
        "comment": req.comment,
        "timestamp": now_utc(),
    }
    
    await approvals_col.update_one(
        {"_id": ObjectId(approval_id)},
        {
            "$set": {"status": "rejected", "rejected_by": current_user["id"], "rejected_at": now_utc(), "updated_at": now_utc()},
            "$push": {"comments": comment_entry}
        }
    )
    
    await log_audit(current_user["id"], "reject", "approvals", approval["type"], approval_id, details=req.comment)
    
    await ws_manager.broadcast_all({
        "type": "approval_rejected",
        "approval_id": approval_id,
        "rejected_by": current_user["name"],
    })

    # Notification to requester
    try:
        from utils.notification_service import create_notification
        await create_notification(
            type="approval",
            title="Approval ditolak ✗",
            body=f"Permintaan Anda ({approval.get('description', '-')}) ditolak oleh {current_user.get('name')}. Alasan: {req.comment or '-'}",
            severity="critical",
            user_id=approval.get("requester_id"),
            ref_type="approval",
            ref_id=approval_id,
            link="/management/approvals",
        )
    except Exception as e:
        print(f"[notif] approval rejected notify failed: {e}")
    
    return {"message": "Rejected"}

@router.get("/stats")
async def approval_stats(current_user: dict = Depends(get_current_user)):
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    stats = {}
    async for s in approvals_col.aggregate(pipeline):
        stats[s["_id"]] = s["count"]
    return stats
