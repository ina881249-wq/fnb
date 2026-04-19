"""
Notification Service — centralized helper for creating and pushing notifications.

Notification document schema:
{
  user_id: str,            # target user (or None for broadcast)
  outlet_id: str,          # scope (or None)
  portal_scope: list,      # portals that should receive (management, outlet, etc.) or ['all']
  type: str,               # approval | alert | closing | kitchen | system | warehouse ...
  severity: str,           # info | warning | critical | success
  title: str,
  body: str,
  ref_type: str,           # approval / alert / closing / kitchen_ticket / transfer
  ref_id: str,
  link: str,               # deep-link (relative path)
  read_at: datetime | None,
  created_at: datetime,
}
"""
from datetime import datetime, timezone
from database import notifications_col, users_col
from websocket_manager import ws_manager


async def create_notification(
    *,
    type: str,
    title: str,
    body: str = "",
    severity: str = "info",
    user_id: str = None,
    outlet_id: str = None,
    portal_scope: list = None,
    ref_type: str = "",
    ref_id: str = "",
    link: str = "",
):
    """Insert a single notification. Broadcast via WS to user_id if specified, else to matching outlet users."""
    doc = {
        "user_id": user_id,
        "outlet_id": outlet_id,
        "portal_scope": portal_scope or ["all"],
        "type": type,
        "severity": severity,
        "title": title,
        "body": body,
        "ref_type": ref_type,
        "ref_id": ref_id,
        "link": link,
        "read_at": None,
        "created_at": datetime.now(timezone.utc),
    }
    res = await notifications_col.insert_one(doc)
    notif_id = str(res.inserted_id)

    payload = {
        "type": "notification_new",
        "notification": {
            "id": notif_id,
            **{k: v for k, v in doc.items() if k != "_id"},
            "created_at": doc["created_at"].isoformat(),
        },
    }

    # Broadcast
    try:
        if user_id:
            await ws_manager.send_to_user(user_id, payload)
        elif outlet_id:
            await ws_manager.broadcast_to_outlet(outlet_id, payload)
        else:
            await ws_manager.broadcast_all(payload)
    except Exception as e:
        print(f"[notif] broadcast failed: {e}")

    return notif_id


async def notify_users_by_role(
    *,
    role_names: list = None,
    permission: str = None,
    outlet_id: str = None,
    **kwargs,
):
    """Create notification for each user matching a role or permission; additionally outlet-scoped."""
    q = {"is_active": True}
    if outlet_id:
        q["outlet_access"] = {"$in": [outlet_id]}
    created = 0
    async for u in users_col.find(q):
        # Simple filter: if role_names specified, check via role_ids (we just trust superadmin + assigned)
        if role_names and not u.get("is_superadmin") and not set(u.get("role_ids", [])) & set(role_names or []):
            continue
        await create_notification(user_id=str(u["_id"]), outlet_id=outlet_id, **kwargs)
        created += 1
    return created
