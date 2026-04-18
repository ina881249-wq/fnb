from bson import ObjectId
from datetime import datetime, timezone

def to_object_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        return None

def now_utc():
    return datetime.now(timezone.utc)

def validate_object_id(id_str: str) -> bool:
    try:
        ObjectId(id_str)
        return True
    except Exception:
        return False

# Permission catalog
PERMISSION_CATALOG = {
    "core": {
        "label": "Core System",
        "permissions": [
            "core.manage_users",
            "core.view_users",
            "core.manage_roles",
            "core.view_roles",
            "core.manage_outlets",
            "core.view_outlets",
            "core.view_audit",
            "core.manage_settings",
        ]
    },
    "finance": {
        "label": "Finance & Accounting",
        "permissions": [
            "finance.view_accounts",
            "finance.manage_accounts",
            "finance.create_cash_movement",
            "finance.approve_cash_movement",
            "finance.view_cashflow",
            "finance.manage_settlement",
            "finance.close_period",
            "finance.reopen_period",
            "finance.view_journals",
            "finance.manage_petty_cash",
        ]
    },
    "inventory": {
        "label": "Inventory",
        "permissions": [
            "inventory.view_items",
            "inventory.manage_items",
            "inventory.create_stock_movement",
            "inventory.approve_stock_movement",
            "inventory.view_stock",
            "inventory.manage_conversions",
            "inventory.view_valuation",
            "inventory.manage_hierarchy",
        ]
    },
    "outlet": {
        "label": "Outlet Operations",
        "permissions": [
            "outlet.view_data",
            "outlet.create_sales_summary",
            "outlet.manage_petty_cash",
            "outlet.manage_cash",
            "outlet.view_pnl",
            "outlet.manage_inventory",
        ]
    },
    "reports": {
        "label": "Reports",
        "permissions": [
            "reports.view_reports",
            "reports.export_reports",
            "reports.view_pnl",
            "reports.view_cashflow",
            "reports.view_balance_sheet",
            "reports.view_inventory",
        ]
    },
    "approvals": {
        "label": "Approvals",
        "permissions": [
            "approvals.view",
            "approvals.approve",
            "approvals.reject",
            "approvals.submit",
        ]
    },
    "cashier": {
        "label": "Cashier (POS)",
        "permissions": [
            "cashier.pos.use",
            "cashier.shift.open",
            "cashier.shift.close",
            "cashier.payments.process",
            "cashier.menu.manage",
        ]
    },
    "kitchen": {
        "label": "Kitchen",
        "permissions": [
            "kitchen.queue.view",
            "kitchen.ticket.update",
            "kitchen.waste.log",
        ]
    },
}

PORTAL_LIST = [
    {"id": "executive", "name": "Executive Portal", "description": "Data analytics, performance insights, and control tower for directors", "icon": "bar-chart-3", "status": "active"},
    {"id": "management", "name": "Management Portal", "description": "Global visibility for finance, operations, and admin", "icon": "building-2", "status": "active"},
    {"id": "outlet", "name": "Outlet Portal", "description": "Outlet-level control for managers and staff", "icon": "store", "status": "active"},
    {"id": "cashier", "name": "Cashier Portal", "description": "Point-of-sale, payment and shift handling for front-line staff", "icon": "credit-card", "status": "active"},
    {"id": "kitchen", "name": "Kitchen Portal", "description": "Production tasks for kitchen and prep staff", "icon": "chef-hat", "status": "coming_soon"},
    {"id": "warehouse", "name": "Warehouse Portal", "description": "Receiving and stock movement management", "icon": "warehouse", "status": "coming_soon"},
]
