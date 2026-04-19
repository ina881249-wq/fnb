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
journal_lines_col = db["journal_lines"]
sales_summaries_col = db["sales_summaries"]
notifications_col = db["notifications"]
coa_accounts_col = db["coa_accounts"]
reconciliations_col = db["reconciliations"]
daily_closings_col = db["daily_closings"]
recipes_col = db["recipes"]
recipe_lines_col = db["recipe_lines"]
production_orders_col = db["production_orders"]
alerts_col = db["alerts"]
budgets_col = db["budgets"]
approval_rules_col = db["approval_rules"]
recurring_transactions_col = db["recurring_transactions"]
# Phase 3A — Cashier Portal collections
menu_items_col = db["menu_items"]
cashier_shifts_col = db["cashier_shifts"]
pos_orders_col = db["pos_orders"]
# Phase 3B — Kitchen Portal collections
waste_logs_col = db["waste_logs"]
# AI Executive
ai_conversations_col = db["ai_conversations"]
ai_insights_cache_col = db["ai_insights_cache"]
# Phase 3E — Warehouse Portal
warehouse_receipts_col = db["warehouse_receipts"]
warehouse_transfers_col = db["warehouse_transfers"]
warehouse_adjustments_col = db["warehouse_adjustments"]
warehouse_counts_col = db["warehouse_counts"]
suppliers_col = db["suppliers"]

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
    # Phase 1A new indexes
    await coa_accounts_col.create_index("code", unique=True)
    await coa_accounts_col.create_index("parent_id")
    await journals_col.create_index([("posting_date", -1)])
    await journals_col.create_index([("outlet_id", 1), ("posting_date", -1)])
    await journals_col.create_index("journal_number")
    await journal_lines_col.create_index("journal_id")
    await journal_lines_col.create_index("account_id")
    await reconciliations_col.create_index([("outlet_id", 1), ("date", -1)])
    await daily_closings_col.create_index([("outlet_id", 1), ("date", -1)], unique=True)
    await recipes_col.create_index("name")
    await recipes_col.create_index("output_item_id")
    await recipe_lines_col.create_index("recipe_id")
    await production_orders_col.create_index([("outlet_id", 1), ("status", 1)])
    await alerts_col.create_index([("created_at", -1)])
    await alerts_col.create_index([("outlet_id", 1), ("resolved", 1)])
    await budgets_col.create_index([("outlet_id", 1), ("period", 1)])
    await approval_rules_col.create_index("transaction_type")
    await recurring_transactions_col.create_index([("status", 1), ("next_run", 1)])
    # Phase 3A indexes
    await menu_items_col.create_index("name")
    await menu_items_col.create_index("category")
    await cashier_shifts_col.create_index([("outlet_id", 1), ("status", 1), ("opened_at", -1)])
    await cashier_shifts_col.create_index("cashier_id")
    await pos_orders_col.create_index([("outlet_id", 1), ("created_at", -1)])
    await pos_orders_col.create_index("shift_id")
    await pos_orders_col.create_index("order_number")
    await pos_orders_col.create_index([("kitchen_status", 1), ("outlet_id", 1)])
    await waste_logs_col.create_index([("outlet_id", 1), ("date", -1)])
