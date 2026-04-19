from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from database import users_col, roles_col, audit_logs_col
from auth import hash_password, verify_password, create_access_token, get_current_user, serialize_user, get_user_permissions
from utils.audit import log_audit
from utils.helpers import PERMISSION_CATALOG, PORTAL_LIST
from bson import ObjectId
from datetime import datetime, timezone, timedelta
import re
import secrets
import string

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ============ Password Policy ============
def validate_password_policy(pw: str):
    """Enforce password policy: min 8 chars, at least 1 letter and 1 digit.
    Raises HTTPException if invalid."""
    if not pw or len(pw) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not re.search(r"[A-Za-z]", pw):
        raise HTTPException(status_code=400, detail="Password must contain at least 1 letter")
    if not re.search(r"\d", pw):
        raise HTTPException(status_code=400, detail="Password must contain at least 1 digit")


class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role_ids: List[str] = []
    portal_access: List[str] = []
    outlet_access: List[str] = []
    is_superadmin: bool = False

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@router.post("/login")
async def login(req: LoginRequest):
    user = await users_col.find_one({"email": req.email.lower().strip()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    token = create_access_token({"user_id": str(user["_id"]), "email": user["email"]})
    user_data = serialize_user(user)
    permissions = await get_user_permissions(user_data)
    must_change_password = bool(user.get("must_change_password", False))
    
    await log_audit(str(user["_id"]), "login", "auth", "user", str(user["_id"]))
    
    return {
        "token": token,
        "user": user_data,
        "permissions": permissions,
        "must_change_password": must_change_password,
    }

@router.post("/register")
async def register(req: RegisterRequest, current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_superadmin"):
        from auth import check_permission
        await check_permission(current_user, "core.manage_users")
    
    validate_password_policy(req.password)
    existing = await users_col.find_one({"email": req.email.lower().strip()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_doc = {
        "email": req.email.lower().strip(),
        "password_hash": hash_password(req.password),
        "name": req.name,
        "role_ids": [ObjectId(r) for r in req.role_ids],
        "portal_access": req.portal_access,
        "outlet_access": [ObjectId(o) for o in req.outlet_access],
        "is_active": True,
        "is_superadmin": req.is_superadmin,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = await users_col.insert_one(user_doc)
    
    await log_audit(current_user["id"], "create", "core", "user", str(result.inserted_id), details=f"Created user {req.email}")
    
    return {"id": str(result.inserted_id), "message": "User created successfully"}

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    permissions = await get_user_permissions(current_user)
    return {"user": current_user, "permissions": permissions}

@router.post("/change-password")
async def change_password(req: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    user = await users_col.find_one({"_id": ObjectId(current_user["id"])})
    if not verify_password(req.old_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    validate_password_policy(req.new_password)
    if verify_password(req.new_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="New password must differ from current")
    
    await users_col.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {
            "password_hash": hash_password(req.new_password),
            "must_change_password": False,
            "password_changed_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }}
    )
    await log_audit(current_user["id"], "change_password", "auth", "user", current_user["id"])
    return {"message": "Password changed successfully"}


# ============ Admin-triggered password reset ============
import secrets
import string

class AdminResetPasswordRequest(BaseModel):
    temp_password: Optional[str] = None  # if None, auto-generate


def _generate_temp_password(length: int = 10) -> str:
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


@router.post("/admin/users/{user_id}/reset-password")
async def admin_reset_password(user_id: str, req: AdminResetPasswordRequest, current_user: dict = Depends(get_current_user)):
    """Admin generates a temporary password for a user. Forces user to change on next login."""
    if not current_user.get("is_superadmin"):
        from auth import check_permission
        await check_permission(current_user, "core.manage_users")
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id")
    target = await users_col.find_one({"_id": oid})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    # Don't allow admin to reset own password via this endpoint (use regular change-password)
    if str(target["_id"]) == current_user["id"]:
        raise HTTPException(status_code=400, detail="Use /auth/change-password for your own account")

    temp_pw = (req.temp_password or "").strip() or _generate_temp_password()
    validate_password_policy(temp_pw)

    await users_col.update_one(
        {"_id": oid},
        {"$set": {
            "password_hash": hash_password(temp_pw),
            "must_change_password": True,
            "password_reset_at": datetime.now(timezone.utc),
            "password_reset_by": current_user["id"],
            "updated_at": datetime.now(timezone.utc),
        }}
    )
    await log_audit(
        current_user["id"], "admin_reset_password", "auth", "user", user_id,
        details=f"Reset password for {target.get('email')}. Force change on next login.",
    )
    return {
        "message": "Password reset. User must change on next login.",
        "temporary_password": temp_pw,
        "email": target.get("email"),
        "must_change_password": True,
    }

@router.get("/permissions-catalog")
async def get_permissions_catalog(current_user: dict = Depends(get_current_user)):
    return PERMISSION_CATALOG

@router.get("/portals")
async def get_portals(current_user: dict = Depends(get_current_user)):
    user_portals = current_user.get("portal_access", [])
    is_super = current_user.get("is_superadmin", False)
    result = []
    for p in PORTAL_LIST:
        portal = p.copy()
        portal["accessible"] = is_super or p["id"] in user_portals
        result.append(portal)
    return result


# ============ User Invite Flow ============

class InviteUserRequest(BaseModel):
    email: EmailStr
    name: str
    role_ids: List[str] = []
    portal_access: List[str] = []
    outlet_access: List[str] = []
    expires_days: int = 7


class AcceptInviteRequest(BaseModel):
    token: str
    password: str


def _generate_invite_token() -> str:
    return secrets.token_urlsafe(32)


@router.post("/admin/invite")
async def invite_user(req: InviteUserRequest, current_user: dict = Depends(get_current_user)):
    """Admin invites a new user. Creates inactive user with invite token.
    The invited user sets their own password via /auth/accept-invite."""
    if not current_user.get("is_superadmin"):
        from auth import check_permission
        await check_permission(current_user, "core.manage_users")

    email = req.email.lower().strip()
    existing = await users_col.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    token = _generate_invite_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=max(1, req.expires_days))

    # Pre-hash a random placeholder password so login is impossible until invite accepted
    placeholder_pw = _generate_temp_password(16)
    user_doc = {
        "email": email,
        "password_hash": hash_password(placeholder_pw),
        "name": req.name,
        "role_ids": [ObjectId(r) for r in req.role_ids],
        "portal_access": req.portal_access,
        "outlet_access": [ObjectId(o) for o in req.outlet_access],
        "is_active": False,
        "is_superadmin": False,
        "invite_token": token,
        "invite_expires_at": expires_at,
        "invited_by": current_user["id"],
        "invited_at": datetime.now(timezone.utc),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    result = await users_col.insert_one(user_doc)
    await log_audit(current_user["id"], "invite", "core", "user", str(result.inserted_id), details=f"Invited {email}")

    return {
        "id": str(result.inserted_id),
        "email": email,
        "invite_token": token,
        "invite_url_suffix": f"/accept-invite?token={token}",
        "expires_at": expires_at.isoformat(),
        "message": "Invite created. Share the invite link with the user.",
    }


@router.get("/invite-info")
async def invite_info(token: str):
    """Public endpoint — check if invite token is valid (for frontend to prefill email/name)."""
    if not token:
        raise HTTPException(status_code=400, detail="Token required")
    user = await users_col.find_one({"invite_token": token})
    if not user:
        raise HTTPException(status_code=404, detail="Invalid invite token")
    expires = user.get("invite_expires_at")
    if expires:
        exp = expires if expires.tzinfo else expires.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Invite has expired")
    if user.get("is_active"):
        raise HTTPException(status_code=400, detail="Invite already accepted")
    return {
        "email": user.get("email"),
        "name": user.get("name"),
        "expires_at": expires.isoformat() if expires else None,
    }


@router.post("/accept-invite")
async def accept_invite(req: AcceptInviteRequest):
    """Public endpoint — user accepts invite by setting their password."""
    if not req.token:
        raise HTTPException(status_code=400, detail="Token required")
    validate_password_policy(req.password)

    user = await users_col.find_one({"invite_token": req.token})
    if not user:
        raise HTTPException(status_code=404, detail="Invalid invite token")
    expires = user.get("invite_expires_at")
    if expires:
        exp = expires if expires.tzinfo else expires.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Invite has expired")
    if user.get("is_active"):
        raise HTTPException(status_code=400, detail="Invite already accepted")

    await users_col.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "password_hash": hash_password(req.password),
            "is_active": True,
            "invite_accepted_at": datetime.now(timezone.utc),
            "must_change_password": False,
            "updated_at": datetime.now(timezone.utc),
        }, "$unset": {"invite_token": "", "invite_expires_at": ""}}
    )
    await log_audit(str(user["_id"]), "accept_invite", "auth", "user", str(user["_id"]), details=f"Invite accepted for {user.get('email')}")

    # Auto-login: issue token immediately
    token = create_access_token({"user_id": str(user["_id"]), "email": user["email"]})
    updated = await users_col.find_one({"_id": user["_id"]})
    user_data = serialize_user(updated)
    permissions = await get_user_permissions(user_data)
    return {
        "token": token,
        "user": user_data,
        "permissions": permissions,
        "must_change_password": False,
        "message": "Invite accepted. Welcome!",
    }


# ============ Session Activity Log ============

@router.get("/sessions")
async def list_sessions(current_user: dict = Depends(get_current_user), user_id: str = "", limit: int = 50):
    """List recent login events (self, or any user if admin).
    Returns timestamps and user info from audit_logs."""
    target_id = user_id or current_user["id"]
    is_self = target_id == current_user["id"]
    if not is_self and not current_user.get("is_superadmin"):
        from auth import check_permission
        await check_permission(current_user, "core.view_audit")

    query = {"action": "login", "user_id": target_id}
    cursor = audit_logs_col.find(query).sort("timestamp", -1).limit(min(limit, 200))
    sessions = []
    async for a in cursor:
        sessions.append({
            "timestamp": a.get("timestamp").isoformat() if a.get("timestamp") else None,
            "user_id": a.get("user_id"),
            "ip_address": a.get("ip_address", ""),
            "user_agent": a.get("user_agent", ""),
            "details": a.get("details", ""),
        })
    return {"sessions": sessions, "total": len(sessions)}


@router.get("/password-policy")
async def get_password_policy():
    """Public endpoint — return current password policy for UI hints."""
    return {
        "min_length": 8,
        "require_letter": True,
        "require_digit": True,
        "require_symbol": False,
        "message": "Password must be at least 8 characters, with at least 1 letter and 1 digit.",
    }
