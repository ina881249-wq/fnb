"""
Notifications Router — user-centric notification feed.

Endpoints:
- GET  /api/notifications              — paginated feed of user's notifications
- GET  /api/notifications/unread-count — quick unread counter for bell badge
- POST /api/notifications/{id}/read    — mark one as read
- POST /api/notifications/read-all     — mark all user's as read
- POST /api/notifications/test         — (superadmin) send a test notification to self
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import notifications_col
from auth import get_current_user
from utils.audit import serialize_doc
from utils.helpers import now_utc
from utils.notification_service import create_notification
from bson import ObjectId

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def _user_scope_query(current_user):
    """Return the mongo filter that matches notifications for this user."""
    uid = current_user["id"]
    outlet_access = current_user.get("outlet_access", []) or []
    portal_access = current_user.get("portal_access", []) or []
    conditions = [
        {"user_id": uid},  # personal
    ]
    # Outlet-scoped broadcast (user_id None, matches one of the user's outlets)
    if outlet_access:
        conditions.append({"user_id": None, "outlet_id": {"$in": outlet_access}})
    # Portal-scoped broadcast (user_id None AND outlet_id None, portal_scope intersects)
    if portal_access:
        conditions.append({
            "user_id": None,
            "outlet_id": None,
            "portal_scope": {"$in": portal_access + ["all"]},
        })
    else:
        conditions.append({"user_id": None, "outlet_id": None, "portal_scope": {"$in": ["all"]}})
    return {"$or": conditions}


@router.get("")
async def list_notifications(
    current_user: dict = Depends(get_current_user),
    unread_only: bool = False,
    skip: int = 0,
    limit: int = 20,
):
    query = _user_scope_query(current_user)
    if unread_only:
        query["read_at"] = None

    total = await notifications_col.count_documents(query)
    unread = await notifications_col.count_documents({**query, "read_at": None})

    items = []
    cursor = notifications_col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    async for n in cursor:
        doc = serialize_doc(n)
        doc["is_read"] = bool(n.get("read_at"))
        items.append(doc)

    return {"items": items, "total": total, "unread_count": unread}


@router.get("/unread-count")
async def unread_count(current_user: dict = Depends(get_current_user)):
    q = _user_scope_query(current_user)
    q["read_at"] = None
    count = await notifications_col.count_documents(q)
    return {"unread_count": count}


@router.post("/{notif_id}/read")
async def mark_read(notif_id: str, current_user: dict = Depends(get_current_user)):
    try:
        _id = ObjectId(notif_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    # Only allow marking if the notification matches user scope
    scope_q = _user_scope_query(current_user)
    n = await notifications_col.find_one({"_id": _id, **scope_q})
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    if n.get("read_at"):
        return {"ok": True, "already_read": True}
    await notifications_col.update_one({"_id": _id}, {"$set": {"read_at": now_utc()}})
    return {"ok": True}


@router.post("/read-all")
async def mark_read_all(current_user: dict = Depends(get_current_user)):
    scope_q = _user_scope_query(current_user)
    scope_q["read_at"] = None
    result = await notifications_col.update_many(scope_q, {"$set": {"read_at": now_utc()}})
    return {"ok": True, "updated": result.modified_count}


class TestNotifReq(BaseModel):
    title: Optional[str] = "Test notification"
    body: Optional[str] = "Ini adalah pesan uji coba"
    severity: Optional[str] = "info"
    link: Optional[str] = ""


@router.post("/test")
async def send_test_notification(req: TestNotifReq, current_user: dict = Depends(get_current_user)):
    """Superadmin-only: send a test notification to self (for UI testing)."""
    if not current_user.get("is_superadmin"):
        raise HTTPException(status_code=403, detail="Super admin required")
    await create_notification(
        type="system",
        title=req.title,
        body=req.body,
        severity=req.severity,
        user_id=current_user["id"],
        link=req.link or "",
    )
    return {"ok": True}
