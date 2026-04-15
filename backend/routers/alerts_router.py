from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import (
    alerts_col, stock_on_hand_col, items_col, outlets_col,
    reconciliations_col, daily_closings_col, petty_cash_col,
    sales_summaries_col, cash_movements_col, stock_movements_col
)
from auth import get_current_user
from utils.audit import serialize_doc
from utils.helpers import now_utc
from websocket_manager import ws_manager
from bson import ObjectId
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

ALERT_TYPES = [
    "low_stock", "cash_mismatch", "overdue_closing", "missing_submission",
    "unusual_expense", "high_variance", "high_waste"
]

PRIORITY_MAP = {"critical": 3, "high": 2, "medium": 1, "low": 0}

@router.get("")
async def list_alerts(current_user: dict = Depends(get_current_user), outlet_id: str = "", alert_type: str = "", resolved: str = "", skip: int = 0, limit: int = 50):
    query = {}
    if outlet_id:
        query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        query["$or"] = [{"outlet_id": {"$in": current_user.get("outlet_access", [])}}, {"outlet_id": None}]
    if alert_type:
        query["alert_type"] = alert_type
    if resolved == "true":
        query["resolved"] = True
    elif resolved == "false":
        query["resolved"] = False
    
    total = await alerts_col.count_documents(query)
    cursor = alerts_col.find(query).sort("created_at", -1).skip(skip).limit(limit)
    alerts = []
    async for a in cursor:
        doc = serialize_doc(a)
        if a.get("outlet_id"):
            outlet = await outlets_col.find_one({"_id": ObjectId(a["outlet_id"])})
            doc["outlet_name"] = outlet.get("name", "") if outlet else ""
        alerts.append(doc)
    return {"alerts": alerts, "total": total}

@router.get("/stats")
async def alert_stats(current_user: dict = Depends(get_current_user), outlet_id: str = ""):
    query = {"resolved": False}
    if outlet_id:
        query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        query["$or"] = [{"outlet_id": {"$in": current_user.get("outlet_access", [])}}, {"outlet_id": None}]
    
    pipeline = [{"$match": query}, {"$group": {"_id": "$priority", "count": {"$sum": 1}}}]
    stats = {"critical": 0, "high": 0, "medium": 0, "low": 0, "total": 0}
    async for s in alerts_col.aggregate(pipeline):
        stats[s["_id"]] = s["count"]
        stats["total"] += s["count"]
    
    # By type
    type_pipeline = [{"$match": query}, {"$group": {"_id": "$alert_type", "count": {"$sum": 1}}}]
    by_type = {}
    async for s in alerts_col.aggregate(type_pipeline):
        by_type[s["_id"]] = s["count"]
    stats["by_type"] = by_type
    return stats

@router.post("/{alert_id}/resolve")
async def resolve_alert(alert_id: str, current_user: dict = Depends(get_current_user)):
    result = await alerts_col.update_one(
        {"_id": ObjectId(alert_id)},
        {"$set": {"resolved": True, "resolved_by": current_user["id"], "resolved_at": now_utc()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert resolved"}

@router.post("/generate")
async def generate_alerts(current_user: dict = Depends(get_current_user)):
    """
    Scan system state and generate alerts for anomalies.
    Should be called periodically or on-demand.
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    generated = []
    
    # 1. Low Stock Alerts
    async for soh in stock_on_hand_col.find():
        item = await items_col.find_one({"_id": ObjectId(soh["item_id"])})
        if not item or not item.get("reorder_threshold"):
            continue
        if soh.get("quantity", 0) <= item["reorder_threshold"]:
            # Check if alert already exists for this item+outlet
            existing = await alerts_col.find_one({
                "alert_type": "low_stock", "entity_id": soh["item_id"],
                "outlet_id": soh.get("outlet_id"), "resolved": False
            })
            if not existing:
                alert = {
                    "alert_type": "low_stock",
                    "priority": "high" if soh.get("quantity", 0) <= 0 else "medium",
                    "title": f"Low stock: {item['name']}",
                    "description": f"{item['name']} has {soh.get('quantity', 0)} {item.get('uom', '')} (threshold: {item['reorder_threshold']})",
                    "entity_type": "item", "entity_id": soh["item_id"],
                    "outlet_id": soh.get("outlet_id"),
                    "data": {"quantity": soh.get("quantity", 0), "threshold": item["reorder_threshold"]},
                    "resolved": False, "created_at": now_utc(),
                }
                await alerts_col.insert_one(alert)
                generated.append(alert["title"])
    
    # 2. Overdue Closing
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    async for outlet in outlets_col.find({"status": "active"}):
        oid = str(outlet["_id"])
        closing = await daily_closings_col.find_one({"outlet_id": oid, "date": yesterday})
        if not closing or closing.get("status") not in ["locked", "approved"]:
            existing = await alerts_col.find_one({
                "alert_type": "overdue_closing", "outlet_id": oid,
                "data.date": yesterday, "resolved": False
            })
            if not existing:
                alert = {
                    "alert_type": "overdue_closing",
                    "priority": "high",
                    "title": f"Overdue closing: {outlet['name']}",
                    "description": f"{outlet['name']} has not completed closing for {yesterday}",
                    "entity_type": "outlet", "entity_id": oid,
                    "outlet_id": oid,
                    "data": {"date": yesterday},
                    "resolved": False, "created_at": now_utc(),
                }
                await alerts_col.insert_one(alert)
                generated.append(alert["title"])
    
    # 3. Cash Mismatch (unresolved reconciliations)
    async for recon in reconciliations_col.find({"status": "variance"}):
        existing = await alerts_col.find_one({
            "alert_type": "cash_mismatch", "entity_id": str(recon["_id"]), "resolved": False
        })
        if not existing:
            alert = {
                "alert_type": "cash_mismatch",
                "priority": "critical" if abs(recon.get("difference", 0)) > 1000000 else "high",
                "title": f"Cash mismatch: Rp {abs(recon.get('difference', 0)):,.0f}",
                "description": f"Unresolved cash variance of Rp {recon.get('difference', 0):,.0f} on {recon.get('date')}",
                "entity_type": "reconciliation", "entity_id": str(recon["_id"]),
                "outlet_id": recon.get("outlet_id"),
                "data": {"difference": recon.get("difference", 0), "date": recon.get("date")},
                "resolved": False, "created_at": now_utc(),
            }
            await alerts_col.insert_one(alert)
            generated.append(alert["title"])
    
    # 4. High Waste
    waste_pipeline = [
        {"$match": {"type": {"$in": ["waste", "spoilage"]}, "date": today}},
        {"$group": {"_id": {"outlet_id": "$outlet_id", "item_id": "$item_id"}, "total": {"$sum": "$quantity"}}}
    ]
    async for w in stock_movements_col.aggregate(waste_pipeline):
        item = await items_col.find_one({"_id": ObjectId(w["_id"]["item_id"])})
        if item and abs(w["total"]) * item.get("cost_per_unit", 0) > 500000:  # > 500k waste
            existing = await alerts_col.find_one({
                "alert_type": "high_waste", "entity_id": w["_id"]["item_id"],
                "outlet_id": w["_id"]["outlet_id"], "data.date": today, "resolved": False
            })
            if not existing:
                waste_val = abs(w["total"]) * item.get("cost_per_unit", 0)
                alert = {
                    "alert_type": "high_waste",
                    "priority": "high",
                    "title": f"High waste: {item['name']}",
                    "description": f"Waste of {abs(w['total'])} {item.get('uom', '')} (Rp {waste_val:,.0f}) today",
                    "entity_type": "item", "entity_id": w["_id"]["item_id"],
                    "outlet_id": w["_id"]["outlet_id"],
                    "data": {"quantity": abs(w["total"]), "value": waste_val, "date": today},
                    "resolved": False, "created_at": now_utc(),
                }
                await alerts_col.insert_one(alert)
                generated.append(alert["title"])
    
    # Broadcast via WebSocket
    if generated:
        await ws_manager.broadcast_all({
            "type": "alerts_generated",
            "count": len(generated),
            "alerts": generated[:5],
        })
    
    return {"generated": len(generated), "alerts": generated}

@router.post("/resolve-all")
async def resolve_all_alerts(current_user: dict = Depends(get_current_user), alert_type: str = ""):
    query = {"resolved": False}
    if alert_type:
        query["alert_type"] = alert_type
    result = await alerts_col.update_many(query, {"$set": {"resolved": True, "resolved_by": current_user["id"], "resolved_at": now_utc()}})
    return {"resolved_count": result.modified_count}
