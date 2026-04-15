import os
import jwt
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import users_col, roles_col
from bson import ObjectId

SECRET_KEY = os.environ.get("JWT_SECRET", "fnb-erp-secret-key-2024-super-secure")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(credentials.credentials)
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = await users_col.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return serialize_user(user)

def serialize_user(user: dict) -> dict:
    if not user:
        return None
    return {
        "id": str(user["_id"]),
        "email": user.get("email", ""),
        "name": user.get("name", ""),
        "role_ids": [str(r) for r in user.get("role_ids", [])],
        "portal_access": user.get("portal_access", []),
        "outlet_access": [str(o) for o in user.get("outlet_access", [])],
        "is_active": user.get("is_active", True),
        "is_superadmin": user.get("is_superadmin", False),
        "created_at": user.get("created_at", datetime.now(timezone.utc)).isoformat() if user.get("created_at") else None,
    }

async def get_user_permissions(user: dict) -> list:
    role_ids = [ObjectId(r) for r in user.get("role_ids", [])]
    permissions = set()
    if user.get("is_superadmin"):
        return ["*"]
    async for role in roles_col.find({"_id": {"$in": role_ids}}):
        for p in role.get("permissions", []):
            permissions.add(p)
    return list(permissions)

async def check_permission(user: dict, required_permission: str):
    perms = await get_user_permissions(user)
    if "*" in perms:
        return True
    if required_permission in perms:
        return True
    raise HTTPException(status_code=403, detail=f"Permission denied: {required_permission}")

async def check_outlet_access(user: dict, outlet_id: str):
    if user.get("is_superadmin"):
        return True
    if outlet_id in user.get("outlet_access", []):
        return True
    raise HTTPException(status_code=403, detail="Access denied for this outlet")
