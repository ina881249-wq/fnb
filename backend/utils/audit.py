from datetime import datetime, timezone
from database import audit_logs_col
from bson import ObjectId

async def log_audit(user_id: str, action: str, module: str, entity_type: str, entity_id: str = None, changes: dict = None, details: str = None):
    entry = {
        "user_id": user_id,
        "action": action,
        "module": module,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "changes": changes,
        "details": details,
        "timestamp": datetime.now(timezone.utc),
    }
    await audit_logs_col.insert_one(entry)
    return entry

def serialize_doc(doc: dict) -> dict:
    if not doc:
        return None
    result = {}
    for key, value in doc.items():
        if key == "_id":
            result["id"] = str(value)
        elif isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, list):
            result[key] = [serialize_doc(v) if isinstance(v, dict) else str(v) if isinstance(v, ObjectId) else v.isoformat() if isinstance(v, datetime) else v for v in value]
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        else:
            result[key] = value
    return result
