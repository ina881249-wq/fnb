from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from database import users_col, outlets_col, roles_col, audit_logs_col
from auth import get_current_user, check_permission, check_outlet_access, hash_password, serialize_user
from utils.audit import log_audit, serialize_doc
from utils.helpers import PERMISSION_CATALOG, to_object_id, now_utc
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter(prefix="/api/core", tags=["core"])

# ===================== USERS =====================
class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    role_ids: Optional[List[str]] = None
    portal_access: Optional[List[str]] = None
    outlet_access: Optional[List[str]] = None
    is_active: Optional[bool] = None
    is_superadmin: Optional[bool] = None

@router.get("/users")
async def list_users(current_user: dict = Depends(get_current_user), skip: int = 0, limit: int = 50, search: str = ""):
    await check_permission(current_user, "core.view_users")
    query = {}
    if search:
        query["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"email": {"$regex": search, "$options": "i"}}]
    total = await users_col.count_documents(query)
    cursor = users_col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    users = []
    async for u in cursor:
        users.append(serialize_user(u))
    return {"users": users, "total": total}

@router.get("/users/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    user = await users_col.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return serialize_user(user)

@router.put("/users/{user_id}")
async def update_user(user_id: str, req: UpdateUserRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "core.manage_users")
    update = {"updated_at": now_utc()}
    if req.name is not None: update["name"] = req.name
    if req.role_ids is not None: update["role_ids"] = [ObjectId(r) for r in req.role_ids]
    if req.portal_access is not None: update["portal_access"] = req.portal_access
    if req.outlet_access is not None: update["outlet_access"] = [ObjectId(o) for o in req.outlet_access]
    if req.is_active is not None: update["is_active"] = req.is_active
    if req.is_superadmin is not None: update["is_superadmin"] = req.is_superadmin
    
    result = await users_col.update_one({"_id": ObjectId(user_id)}, {"$set": update})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await log_audit(current_user["id"], "update", "core", "user", user_id, changes=update)
    return {"message": "User updated"}

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "core.manage_users")
    result = await users_col.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await log_audit(current_user["id"], "delete", "core", "user", user_id)
    return {"message": "User deleted"}

# ===================== OUTLETS =====================
class OutletRequest(BaseModel):
    name: str
    city: str
    address: Optional[str] = ""
    phone: Optional[str] = ""
    status: Optional[str] = "active"
    settings: Optional[dict] = {}

@router.get("/outlets")
async def list_outlets(current_user: dict = Depends(get_current_user), skip: int = 0, limit: int = 50):
    if current_user.get("is_superadmin"):
        query = {}
    else:
        outlet_ids = [ObjectId(o) for o in current_user.get("outlet_access", [])]
        query = {"_id": {"$in": outlet_ids}} if outlet_ids else {"_id": None}
    total = await outlets_col.count_documents(query)
    cursor = outlets_col.find(query).sort("name", 1).skip(skip).limit(limit)
    outlets = []
    async for o in cursor:
        outlets.append(serialize_doc(o))
    return {"outlets": outlets, "total": total}

@router.post("/outlets")
async def create_outlet(req: OutletRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "core.manage_outlets")
    doc = {
        "name": req.name,
        "city": req.city,
        "address": req.address,
        "phone": req.phone,
        "status": req.status,
        "settings": req.settings,
        "created_at": now_utc(),
        "updated_at": now_utc(),
        "created_by": current_user["id"],
    }
    result = await outlets_col.insert_one(doc)
    await log_audit(current_user["id"], "create", "core", "outlet", str(result.inserted_id), details=f"Created outlet {req.name}")
    return {"id": str(result.inserted_id), "message": "Outlet created"}

@router.put("/outlets/{outlet_id}")
async def update_outlet(outlet_id: str, req: OutletRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "core.manage_outlets")
    update = {**req.dict(exclude_unset=True), "updated_at": now_utc()}
    result = await outlets_col.update_one({"_id": ObjectId(outlet_id)}, {"$set": update})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Outlet not found")
    await log_audit(current_user["id"], "update", "core", "outlet", outlet_id)
    return {"message": "Outlet updated"}

@router.delete("/outlets/{outlet_id}")
async def delete_outlet(outlet_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "core.manage_outlets")
    await outlets_col.update_one({"_id": ObjectId(outlet_id)}, {"$set": {"status": "inactive"}})
    await log_audit(current_user["id"], "deactivate", "core", "outlet", outlet_id)
    return {"message": "Outlet deactivated"}

# ===================== ROLES =====================
class RoleRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    permissions: List[str] = []
    portal_access: List[str] = []

@router.get("/roles")
async def list_roles(current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "core.view_roles")
    roles = []
    async for r in roles_col.find().sort("name", 1):
        roles.append(serialize_doc(r))
    return {"roles": roles}

@router.post("/roles")
async def create_role(req: RoleRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "core.manage_roles")
    existing = await roles_col.find_one({"name": req.name})
    if existing:
        raise HTTPException(status_code=400, detail="Role name already exists")
    doc = {
        "name": req.name,
        "description": req.description,
        "permissions": req.permissions,
        "portal_access": req.portal_access,
        "is_system": False,
        "created_at": now_utc(),
        "updated_at": now_utc(),
        "created_by": current_user["id"],
    }
    result = await roles_col.insert_one(doc)
    await log_audit(current_user["id"], "create", "core", "role", str(result.inserted_id), details=f"Created role {req.name}")
    return {"id": str(result.inserted_id), "message": "Role created"}

@router.put("/roles/{role_id}")
async def update_role(role_id: str, req: RoleRequest, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "core.manage_roles")
    role = await roles_col.find_one({"_id": ObjectId(role_id)})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.get("is_system"):
        raise HTTPException(status_code=400, detail="Cannot modify system role")
    update = {"name": req.name, "description": req.description, "permissions": req.permissions, "portal_access": req.portal_access, "updated_at": now_utc()}
    await roles_col.update_one({"_id": ObjectId(role_id)}, {"$set": update})
    await log_audit(current_user["id"], "update", "core", "role", role_id)
    return {"message": "Role updated"}

@router.delete("/roles/{role_id}")
async def delete_role(role_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "core.manage_roles")
    role = await roles_col.find_one({"_id": ObjectId(role_id)})
    if role and role.get("is_system"):
        raise HTTPException(status_code=400, detail="Cannot delete system role")
    await roles_col.delete_one({"_id": ObjectId(role_id)})
    await log_audit(current_user["id"], "delete", "core", "role", role_id)
    return {"message": "Role deleted"}

# ===================== AUDIT LOGS =====================
@router.get("/audit-logs")
async def list_audit_logs(current_user: dict = Depends(get_current_user), skip: int = 0, limit: int = 50, module: str = "", action: str = "", user_id: str = ""):
    await check_permission(current_user, "core.view_audit")
    query = {}
    if module: query["module"] = module
    if action: query["action"] = action
    if user_id: query["user_id"] = user_id
    total = await audit_logs_col.count_documents(query)
    cursor = audit_logs_col.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    logs = []
    async for l in cursor:
        doc = serialize_doc(l)
        # Enrich with user name
        if l.get("user_id"):
            user = await users_col.find_one({"_id": ObjectId(l["user_id"])})
            doc["user_name"] = user.get("name", "Unknown") if user else "Unknown"
        logs.append(doc)
    return {"logs": logs, "total": total}

# ===================== SETTINGS =====================
@router.get("/settings/permissions-catalog")
async def permissions_catalog(current_user: dict = Depends(get_current_user)):
    return PERMISSION_CATALOG
