from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from database import users_col, roles_col
from auth import hash_password, verify_password, create_access_token, get_current_user, serialize_user, get_user_permissions
from utils.audit import log_audit
from utils.helpers import PERMISSION_CATALOG, PORTAL_LIST
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter(prefix="/api/auth", tags=["auth"])

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
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
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
    if len(temp_pw) < 6:
        raise HTTPException(status_code=400, detail="Temporary password must be at least 6 characters")

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
