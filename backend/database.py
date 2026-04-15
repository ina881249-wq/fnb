import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "fnb_erp")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Collections
users_col = db["users"]
outlets_col = db["outlets"]
roles_col = db["roles"]
audit_logs_col = db["audit_logs"]
approvals_col = db["approvals"]
accounts_col = db["accounts"]
cash_movements_col = db["cash_movements"]
settlement_rules_col = db["settlement_rules"]
petty_cash_col = db["petty_cash_expenses"]
items_col = db["items"]
material_hierarchy_col = db["material_hierarchy"]
stock_movements_col = db["stock_movements"]
stock_on_hand_col = db["stock_on_hand"]
inventory_conversions_col = db["inventory_conversions"]
accounting_periods_col = db["accounting_periods"]
journals_col = db["journals"]
sales_summaries_col = db["sales_summaries"]
notifications_col = db["notifications"]

async def create_indexes():
    await users_col.create_index("email", unique=True)
    await outlets_col.create_index("name")
    await roles_col.create_index("name", unique=True)
    await audit_logs_col.create_index([("timestamp", -1)])
    await audit_logs_col.create_index("user_id")
    await audit_logs_col.create_index("module")
    await approvals_col.create_index([("status", 1), ("created_at", -1)])
    await accounts_col.create_index([("outlet_id", 1), ("type", 1)])
    await cash_movements_col.create_index([("outlet_id", 1), ("created_at", -1)])
    await items_col.create_index("name")
    await items_col.create_index("category")
    await stock_on_hand_col.create_index([("item_id", 1), ("outlet_id", 1)], unique=True)
    await stock_movements_col.create_index([("outlet_id", 1), ("created_at", -1)])
    await sales_summaries_col.create_index([("outlet_id", 1), ("date", -1)])
