# Sprint C Backend Enhancements
# C1: Recipe Versioning
# C3: Variance Root Cause
# C4: Exception Center Upgrade

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from database import recipes_col, recipe_lines_col, stock_movements_col, items_col, alerts_col, outlets_col
from auth import get_current_user, check_permission
from utils.audit import log_audit, serialize_doc
from utils.helpers import now_utc
from bson import ObjectId

router = APIRouter(prefix="/api/enhancements", tags=["enhancements"])

# ===================== C1: RECIPE VERSIONING =====================

@router.post("/recipes/{recipe_id}/new-version")
async def create_recipe_version(recipe_id: str, current_user: dict = Depends(get_current_user)):
    """Create a new draft version of an existing recipe"""
    await check_permission(current_user, "inventory.manage_items")
    
    original = await recipes_col.find_one({"_id": ObjectId(recipe_id)})
    if not original:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    # Get max version
    max_ver = 1
    async for r in recipes_col.find({"name": original["name"]}).sort("version", -1).limit(1):
        max_ver = r.get("version", 1)
    
    new_version = max_ver + 1
    new_doc = {
        "name": original["name"],
        "output_item_id": original.get("output_item_id"),
        "output_quantity": original.get("output_quantity", 1),
        "output_uom": original.get("output_uom", ""),
        "description": original.get("description", ""),
        "yield_percentage": original.get("yield_percentage", 100),
        "version": new_version,
        "active": False,
        "version_status": "draft",  # draft, pending_approval, approved, active, archived
        "parent_version_id": recipe_id,
        "created_by": current_user["id"],
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    result = await recipes_col.insert_one(new_doc)
    new_id = str(result.inserted_id)
    
    # Clone lines
    async for line in recipe_lines_col.find({"recipe_id": recipe_id}):
        clone_line = {
            "recipe_id": new_id,
            "line_number": line["line_number"],
            "item_id": line["item_id"],
            "quantity": line["quantity"],
            "uom": line.get("uom", ""),
            "notes": line.get("notes", ""),
        }
        await recipe_lines_col.insert_one(clone_line)
    
    await log_audit(current_user["id"], "create", "inventory", "recipe_version", new_id, details=f"New version {new_version} of {original['name']}")
    return {"id": new_id, "version": new_version, "message": f"Version {new_version} created as draft"}

@router.post("/recipes/{recipe_id}/approve-version")
async def approve_recipe_version(recipe_id: str, current_user: dict = Depends(get_current_user)):
    """Approve a draft recipe version"""
    await check_permission(current_user, "inventory.manage_items")
    recipe = await recipes_col.find_one({"_id": ObjectId(recipe_id)})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    await recipes_col.update_one(
        {"_id": ObjectId(recipe_id)},
        {"$set": {"version_status": "approved", "approved_by": current_user["id"], "approved_at": now_utc(), "updated_at": now_utc()}}
    )
    await log_audit(current_user["id"], "approve", "inventory", "recipe_version", recipe_id)
    return {"message": "Recipe version approved"}

@router.post("/recipes/{recipe_id}/activate-version")
async def activate_recipe_version(recipe_id: str, current_user: dict = Depends(get_current_user)):
    """Activate an approved recipe version (deactivates previous active version)"""
    await check_permission(current_user, "inventory.manage_items")
    recipe = await recipes_col.find_one({"_id": ObjectId(recipe_id)})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    if recipe.get("version_status") not in ["approved", None]:
        raise HTTPException(status_code=400, detail="Recipe must be approved before activation")
    
    # Deactivate other versions of same recipe
    await recipes_col.update_many(
        {"name": recipe["name"], "_id": {"$ne": ObjectId(recipe_id)}},
        {"$set": {"active": False, "version_status": "archived", "updated_at": now_utc()}}
    )
    
    # Activate this version
    await recipes_col.update_one(
        {"_id": ObjectId(recipe_id)},
        {"$set": {"active": True, "version_status": "active", "activated_by": current_user["id"], "activated_at": now_utc(), "updated_at": now_utc()}}
    )
    
    await log_audit(current_user["id"], "activate", "inventory", "recipe_version", recipe_id, details=f"Activated {recipe['name']} v{recipe.get('version', 1)}")
    return {"message": f"Recipe version {recipe.get('version', 1)} activated"}

@router.get("/recipes/{recipe_id}/versions")
async def get_recipe_versions(recipe_id: str, current_user: dict = Depends(get_current_user)):
    """Get all versions of a recipe"""
    recipe = await recipes_col.find_one({"_id": ObjectId(recipe_id)})
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    versions = []
    async for r in recipes_col.find({"name": recipe["name"]}).sort("version", -1):
        doc = serialize_doc(r)
        doc["line_count"] = await recipe_lines_col.count_documents({"recipe_id": str(r["_id"])})
        versions.append(doc)
    
    return {"recipe_name": recipe["name"], "versions": versions}

# ===================== C3: VARIANCE ROOT CAUSE =====================

class VarianceRootCauseRequest(BaseModel):
    item_id: str
    outlet_id: str
    reason_code: str  # over_portion, waste, spoilage, theft, stock_error, void, other
    explanation: str
    linked_movement_id: Optional[str] = None
    period: Optional[str] = ""

VARIANCE_REASON_CODES = [
    {"code": "over_portion", "label": "Over-portion", "severity": "medium"},
    {"code": "waste", "label": "Waste/Spoilage", "severity": "medium"},
    {"code": "theft", "label": "Suspected Theft", "severity": "critical"},
    {"code": "stock_error", "label": "Stock Count Error", "severity": "low"},
    {"code": "void", "label": "Voided Transaction", "severity": "low"},
    {"code": "recipe_change", "label": "Recipe Changed", "severity": "low"},
    {"code": "supplier_issue", "label": "Supplier Issue", "severity": "medium"},
    {"code": "other", "label": "Other", "severity": "low"},
]

@router.get("/variance/reason-codes")
async def get_reason_codes(current_user: dict = Depends(get_current_user)):
    return {"reason_codes": VARIANCE_REASON_CODES}

@router.post("/variance/root-cause")
async def submit_root_cause(req: VarianceRootCauseRequest, current_user: dict = Depends(get_current_user)):
    """Submit root cause for a variance item"""
    from database import db
    variance_causes_col = db["variance_root_causes"]
    
    doc = {
        **req.dict(),
        "submitted_by": current_user["id"],
        "created_at": now_utc(),
    }
    result = await variance_causes_col.insert_one(doc)
    await log_audit(current_user["id"], "submit", "inventory", "variance_root_cause", str(result.inserted_id), details=f"Reason: {req.reason_code} - {req.explanation}")
    return {"id": str(result.inserted_id), "message": "Root cause recorded"}

@router.get("/variance/root-causes")
async def list_root_causes(current_user: dict = Depends(get_current_user), outlet_id: str = "", item_id: str = ""):
    from database import db
    variance_causes_col = db["variance_root_causes"]
    query = {}
    if outlet_id:
        query["outlet_id"] = outlet_id
    if item_id:
        query["item_id"] = item_id
    
    causes = []
    async for c in variance_causes_col.find(query).sort("created_at", -1).limit(100):
        doc = serialize_doc(c)
        item = await items_col.find_one({"_id": ObjectId(c["item_id"])})
        doc["item_name"] = item.get("name", "") if item else ""
        causes.append(doc)
    return {"root_causes": causes}

# ===================== C4: EXCEPTION CENTER UPGRADE =====================

@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, current_user: dict = Depends(get_current_user)):
    """Acknowledge an alert (seen but not yet resolved)"""
    result = await alerts_col.update_one(
        {"_id": ObjectId(alert_id)},
        {"$set": {"acknowledged": True, "acknowledged_by": current_user["id"], "acknowledged_at": now_utc()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert acknowledged"}

@router.post("/alerts/{alert_id}/escalate")
async def escalate_alert(alert_id: str, current_user: dict = Depends(get_current_user)):
    """Escalate an alert to higher priority"""
    alert = await alerts_col.find_one({"_id": ObjectId(alert_id)})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    priority_order = ["low", "medium", "high", "critical"]
    current_idx = priority_order.index(alert.get("priority", "low"))
    new_priority = priority_order[min(current_idx + 1, 3)]
    
    await alerts_col.update_one(
        {"_id": ObjectId(alert_id)},
        {"$set": {"priority": new_priority, "escalated": True, "escalated_by": current_user["id"], "escalated_at": now_utc()}}
    )
    
    from websocket_manager import ws_manager
    await ws_manager.broadcast_all({"type": "alert_escalated", "alert_id": alert_id, "new_priority": new_priority})
    
    await log_audit(current_user["id"], "escalate", "operations", "alert", alert_id, details=f"Escalated to {new_priority}")
    return {"message": f"Alert escalated to {new_priority}"}

@router.get("/alerts/categories")
async def alert_categories(current_user: dict = Depends(get_current_user)):
    """Get alert taxonomy/categories"""
    return {
        "categories": [
            {"type": "low_stock", "label": "Low Stock", "module": "inventory", "severity_default": "medium"},
            {"type": "cash_mismatch", "label": "Cash Mismatch", "module": "finance", "severity_default": "high"},
            {"type": "overdue_closing", "label": "Overdue Closing", "module": "operations", "severity_default": "high"},
            {"type": "high_waste", "label": "High Waste", "module": "inventory", "severity_default": "high"},
            {"type": "missing_submission", "label": "Missing Submission", "module": "operations", "severity_default": "medium"},
            {"type": "unusual_expense", "label": "Unusual Expense", "module": "finance", "severity_default": "medium"},
            {"type": "high_variance", "label": "High Variance", "module": "inventory", "severity_default": "high"},
            {"type": "budget_exceeded", "label": "Budget Exceeded", "module": "finance", "severity_default": "high"},
            {"type": "approval_overdue", "label": "Approval Overdue", "module": "operations", "severity_default": "medium"},
        ]
    }
