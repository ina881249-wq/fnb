"""
Reseed script: Replace all data with Lusi & Pakan brand placeholder data.
- 2 outlets in Bali (Denpasar + Tabanan)
- Fusion local + western menu (~50 items)
- 90 days of realistic sales data with seasonal patterns
- Monthly revenue 300-500jt per outlet
"""
import asyncio
import random
from datetime import datetime, timezone, timedelta
from bson import ObjectId

from database import (
    users_col, outlets_col, roles_col, audit_logs_col, approvals_col,
    accounts_col, cash_movements_col, settlement_rules_col, petty_cash_col,
    items_col, material_hierarchy_col, stock_movements_col, stock_on_hand_col,
    inventory_conversions_col, accounting_periods_col, journals_col, journal_lines_col,
    sales_summaries_col, notifications_col, coa_accounts_col, reconciliations_col,
    daily_closings_col, recipes_col, recipe_lines_col, production_orders_col,
    alerts_col, budgets_col, approval_rules_col, recurring_transactions_col,
    menu_items_col, cashier_shifts_col, pos_orders_col, waste_logs_col,
    ai_conversations_col, ai_insights_cache_col,
    warehouse_receipts_col, warehouse_transfers_col, warehouse_adjustments_col,
    warehouse_counts_col, suppliers_col,
)
from auth import hash_password

random.seed(42)  # deterministic


async def clear_all():
    print("[1/15] Clearing existing data...")
    all_cols = [
        users_col, outlets_col, roles_col, audit_logs_col, approvals_col,
        accounts_col, cash_movements_col, settlement_rules_col, petty_cash_col,
        items_col, material_hierarchy_col, stock_movements_col, stock_on_hand_col,
        inventory_conversions_col, accounting_periods_col, journals_col, journal_lines_col,
        sales_summaries_col, notifications_col, coa_accounts_col, reconciliations_col,
        daily_closings_col, recipes_col, recipe_lines_col, production_orders_col,
        alerts_col, budgets_col, approval_rules_col, recurring_transactions_col,
        menu_items_col, cashier_shifts_col, pos_orders_col, waste_logs_col,
        ai_conversations_col, ai_insights_cache_col,
        warehouse_receipts_col, warehouse_transfers_col, warehouse_adjustments_col,
        warehouse_counts_col, suppliers_col,
    ]
    for col in all_cols:
        await col.delete_many({})
    print("    cleared.")


async def main():
    await clear_all()
    now = datetime.now(timezone.utc)

    # ============= OUTLETS =============
    print("[2/15] Outlets...")
    outlets = [
        {"name": "Lusi & Pakan - Denpasar", "city": "Denpasar", "address": "Jl. Sunset Road No. 88, Kuta, Badung, Bali",
         "phone": "+62-361-555-1001", "status": "active", "settings": {"tax_rate": 0.11, "service_charge": 0.05},
         "created_at": now, "updated_at": now},
        {"name": "Lusi & Pakan - Tabanan", "city": "Tabanan", "address": "Jl. Raya Tabanan No. 12, Tabanan, Bali",
         "phone": "+62-361-555-2002", "status": "active", "settings": {"tax_rate": 0.11, "service_charge": 0.05},
         "created_at": now, "updated_at": now},
    ]
    out_res = await outlets_col.insert_many(outlets)
    outlet_ids = [str(i) for i in out_res.inserted_ids]
    OUT_DPS, OUT_TBN = outlet_ids
    print(f"    {len(outlet_ids)} outlets created")

    # ============= ROLES =============
    print("[3/15] Roles...")
    roles = [
        {"name": "Super Admin", "description": "Full access", "permissions": ["*"],
         "portal_access": ["management", "outlet", "kitchen", "cashier", "warehouse", "executive"],
         "is_system": True, "created_at": now, "updated_at": now},
        {"name": "Executive", "description": "C-level analytics & AI", "permissions": [
            "executive.view", "reports.view_reports", "reports.view_pnl", "reports.view_cashflow",
            "reports.view_balance_sheet", "reports.view_inventory", "core.view_outlets",
         ], "portal_access": ["executive"], "is_system": True, "created_at": now, "updated_at": now},
        {"name": "Finance Head", "description": "Finance & accounting", "permissions": [
            "finance.view_accounts", "finance.manage_accounts", "finance.create_cash_movement",
            "finance.approve_cash_movement", "finance.view_cashflow", "finance.manage_settlement",
            "finance.close_period", "finance.reopen_period", "finance.view_journals",
            "finance.manage_petty_cash", "reports.view_reports", "reports.export_reports",
            "reports.view_pnl", "reports.view_cashflow", "reports.view_balance_sheet",
            "approvals.view", "approvals.approve", "approvals.reject",
            "core.view_users", "core.view_outlets", "core.view_audit",
         ], "portal_access": ["management"], "is_system": True, "created_at": now, "updated_at": now},
        {"name": "Outlet Manager", "description": "Outlet operations", "permissions": [
            "outlet.view_data", "outlet.create_sales_summary", "outlet.manage_petty_cash",
            "outlet.manage_cash", "outlet.view_pnl", "outlet.manage_inventory",
            "finance.view_accounts", "finance.create_cash_movement", "finance.manage_petty_cash",
            "inventory.view_items", "inventory.create_stock_movement", "inventory.view_stock",
            "reports.view_reports", "reports.view_pnl", "reports.view_inventory",
            "approvals.view", "approvals.submit",
         ], "portal_access": ["outlet"], "is_system": True, "created_at": now, "updated_at": now},
        {"name": "Inventory Controller", "description": "Inventory management", "permissions": [
            "inventory.view_items", "inventory.manage_items", "inventory.create_stock_movement",
            "inventory.approve_stock_movement", "inventory.view_stock", "inventory.manage_conversions",
            "inventory.view_valuation", "reports.view_reports", "reports.view_inventory",
            "approvals.view", "approvals.approve", "approvals.reject", "core.view_outlets",
         ], "portal_access": ["management"], "is_system": True, "created_at": now, "updated_at": now},
        {"name": "Cashier", "description": "POS operations", "permissions": [
            "cashier.pos.use", "cashier.shift.open", "cashier.shift.close",
            "cashier.payments.process", "outlet.view_data",
         ], "portal_access": ["cashier"], "is_system": True, "created_at": now, "updated_at": now},
        {"name": "Kitchen Staff", "description": "Kitchen & prep", "permissions": [
            "kitchen.queue.view", "kitchen.ticket.update", "kitchen.waste.log", "inventory.view_items",
         ], "portal_access": ["kitchen"], "is_system": True, "created_at": now, "updated_at": now},
        {"name": "Warehouse Staff", "description": "Warehouse operations", "permissions": [
            "warehouse.receipts.create", "warehouse.transfers.create", "warehouse.transfers.receive",
            "warehouse.adjustments.create", "warehouse.counts.create",
            "inventory.view_items", "inventory.view_stock",
         ], "portal_access": ["warehouse"], "is_system": True, "created_at": now, "updated_at": now},
    ]
    role_res = await roles_col.insert_many(roles)
    ROLE = {roles[i]["name"]: role_res.inserted_ids[i] for i in range(len(roles))}

    # ============= USERS =============
    print("[4/15] Users...")
    all_outlet_oids = [ObjectId(OUT_DPS), ObjectId(OUT_TBN)]
    users = [
        {"email": "admin@lusipakan.com", "password_hash": hash_password("admin123"), "name": "System Admin",
         "role_ids": [ROLE["Super Admin"]], "portal_access": ["management", "outlet", "kitchen", "cashier", "warehouse", "executive"],
         "outlet_access": all_outlet_oids, "is_active": True, "is_superadmin": True, "created_at": now, "updated_at": now},
        {"email": "owner@lusipakan.com", "password_hash": hash_password("owner123"), "name": "Pak Wayan (Owner)",
         "role_ids": [ROLE["Executive"], ROLE["Finance Head"]], "portal_access": ["executive", "management"],
         "outlet_access": all_outlet_oids, "is_active": True, "is_superadmin": False, "created_at": now, "updated_at": now},
        {"email": "exec@lusipakan.com", "password_hash": hash_password("exec123"), "name": "Ibu Luh (Executive)",
         "role_ids": [ROLE["Executive"]], "portal_access": ["executive"],
         "outlet_access": all_outlet_oids, "is_active": True, "is_superadmin": False, "created_at": now, "updated_at": now},
        {"email": "finance@lusipakan.com", "password_hash": hash_password("finance123"), "name": "Kadek Finance",
         "role_ids": [ROLE["Finance Head"]], "portal_access": ["management"],
         "outlet_access": all_outlet_oids, "is_active": True, "is_superadmin": False, "created_at": now, "updated_at": now},
        {"email": "manager.denpasar@lusipakan.com", "password_hash": hash_password("manager123"), "name": "Gede Denpasar",
         "role_ids": [ROLE["Outlet Manager"]], "portal_access": ["outlet"],
         "outlet_access": [ObjectId(OUT_DPS)], "is_active": True, "is_superadmin": False, "created_at": now, "updated_at": now},
        {"email": "manager.tabanan@lusipakan.com", "password_hash": hash_password("manager123"), "name": "Made Tabanan",
         "role_ids": [ROLE["Outlet Manager"]], "portal_access": ["outlet"],
         "outlet_access": [ObjectId(OUT_TBN)], "is_active": True, "is_superadmin": False, "created_at": now, "updated_at": now},
        {"email": "inventory@lusipakan.com", "password_hash": hash_password("inventory123"), "name": "Komang Inventory",
         "role_ids": [ROLE["Inventory Controller"]], "portal_access": ["management"],
         "outlet_access": all_outlet_oids, "is_active": True, "is_superadmin": False, "created_at": now, "updated_at": now},
        {"email": "cashier.denpasar@lusipakan.com", "password_hash": hash_password("cashier123"), "name": "Rina Kasir DPS",
         "role_ids": [ROLE["Cashier"]], "portal_access": ["cashier"],
         "outlet_access": [ObjectId(OUT_DPS)], "is_active": True, "is_superadmin": False, "created_at": now, "updated_at": now},
        {"email": "cashier.tabanan@lusipakan.com", "password_hash": hash_password("cashier123"), "name": "Ayu Kasir TBN",
         "role_ids": [ROLE["Cashier"]], "portal_access": ["cashier"],
         "outlet_access": [ObjectId(OUT_TBN)], "is_active": True, "is_superadmin": False, "created_at": now, "updated_at": now},
        {"email": "kitchen.denpasar@lusipakan.com", "password_hash": hash_password("kitchen123"), "name": "Chef Putu DPS",
         "role_ids": [ROLE["Kitchen Staff"]], "portal_access": ["kitchen"],
         "outlet_access": [ObjectId(OUT_DPS)], "is_active": True, "is_superadmin": False, "created_at": now, "updated_at": now},
        {"email": "kitchen.tabanan@lusipakan.com", "password_hash": hash_password("kitchen123"), "name": "Chef Nyoman TBN",
         "role_ids": [ROLE["Kitchen Staff"]], "portal_access": ["kitchen"],
         "outlet_access": [ObjectId(OUT_TBN)], "is_active": True, "is_superadmin": False, "created_at": now, "updated_at": now},
        {"email": "warehouse@lusipakan.com", "password_hash": hash_password("warehouse123"), "name": "Budi Gudang",
         "role_ids": [ROLE["Warehouse Staff"]], "portal_access": ["warehouse"],
         "outlet_access": all_outlet_oids, "is_active": True, "is_superadmin": False, "created_at": now, "updated_at": now},
    ]
    await users_col.insert_many(users)
    print(f"    {len(users)} users created")

    # ============= COA =============
    print("[5/15] Chart of Accounts...")
    coa_defs = [
        ("1000", "Assets", "asset", True, "debit", "balance_sheet"),
        ("1100", "Cash & Bank", "asset", True, "debit", "balance_sheet"),
        ("1110", "Bank Accounts", "asset", False, "debit", "balance_sheet"),
        ("1120", "Outlet Cash", "asset", False, "debit", "balance_sheet"),
        ("1130", "Petty Cash", "asset", False, "debit", "balance_sheet"),
        ("1200", "Inventory", "asset", False, "debit", "balance_sheet"),
        ("1210", "Raw Material Inventory", "asset", False, "debit", "balance_sheet"),
        ("1220", "Prep Material Inventory", "asset", False, "debit", "balance_sheet"),
        ("2000", "Liabilities", "liability", True, "credit", "balance_sheet"),
        ("2100", "Accounts Payable", "liability", False, "credit", "balance_sheet"),
        ("2200", "Accrued Expenses", "liability", False, "credit", "balance_sheet"),
        ("2300", "Tax Payable (PB1/PPN)", "liability", False, "credit", "balance_sheet"),
        ("3000", "Equity", "equity", True, "credit", "balance_sheet"),
        ("3100", "Retained Earnings", "equity", False, "credit", "balance_sheet"),
        ("4000", "Revenue", "revenue", True, "credit", "pnl"),
        ("4100", "Food Sales", "revenue", False, "credit", "pnl"),
        ("4200", "Beverage Sales", "revenue", False, "credit", "pnl"),
        ("4300", "Service Charge", "revenue", False, "credit", "pnl"),
        ("4900", "Discounts & Returns", "contra", False, "debit", "pnl"),
        ("5000", "Cost of Goods Sold", "cogs", True, "debit", "pnl"),
        ("5100", "Food COGS", "cogs", False, "debit", "pnl"),
        ("5200", "Beverage COGS", "cogs", False, "debit", "pnl"),
        ("5300", "Packaging COGS", "cogs", False, "debit", "pnl"),
        ("6000", "Operating Expenses", "expense", True, "debit", "pnl"),
        ("6100", "Wages & Salaries", "expense", False, "debit", "pnl"),
        ("6200", "Rent & Utilities", "expense", False, "debit", "pnl"),
        ("6300", "Transport & Delivery", "expense", False, "debit", "pnl"),
        ("6400", "Cleaning & Supplies", "expense", False, "debit", "pnl"),
        ("6500", "Repair & Maintenance", "expense", False, "debit", "pnl"),
        ("6600", "Marketing & Promotion", "expense", False, "debit", "pnl"),
        ("6700", "Office & Admin", "expense", False, "debit", "pnl"),
        ("6800", "Waste & Spoilage", "expense", False, "debit", "pnl"),
        ("6900", "Miscellaneous Expense", "expense", False, "debit", "pnl"),
    ]
    coa_docs = [{"code": c[0], "name": c[1], "account_type": c[2], "parent_id": None,
                 "is_header": c[3], "normal_balance": c[4], "report_mapping": c[5],
                 "active": True, "created_at": now} for c in coa_defs]
    coa_res = await coa_accounts_col.insert_many(coa_docs)
    coa_by_code = {coa_defs[i][0]: str(coa_res.inserted_ids[i]) for i in range(len(coa_defs))}
    parent_map = {
        "1100": "1000", "1110": "1100", "1120": "1100", "1130": "1100", "1200": "1000",
        "1210": "1200", "1220": "1200", "2100": "2000", "2200": "2000", "2300": "2000",
        "3100": "3000", "4100": "4000", "4200": "4000", "4300": "4000", "4900": "4000",
        "5100": "5000", "5200": "5000", "5300": "5000",
        "6100": "6000", "6200": "6000", "6300": "6000", "6400": "6000", "6500": "6000",
        "6600": "6000", "6700": "6000", "6800": "6000", "6900": "6000",
    }
    for c, p in parent_map.items():
        await coa_accounts_col.update_one({"code": c}, {"$set": {"parent_id": coa_by_code[p]}})
    print(f"    {len(coa_defs)} COA accounts")

    # ============= ACCOUNTS (bank/cash/petty per outlet) =============
    print("[6/15] Bank/cash accounts...")
    accounts = []
    for oid, name in [(OUT_DPS, "Denpasar"), (OUT_TBN, "Tabanan")]:
        accounts += [
            {"name": f"BCA - {name}", "type": "bank", "outlet_id": oid, "currency": "IDR",
             "opening_balance": 150_000_000, "current_balance": 150_000_000 + random.randint(20, 80) * 1_000_000,
             "bank_name": "BCA", "account_number": f"028{random.randint(1000000,9999999)}",
             "description": f"Main bank {name}", "status": "active", "created_at": now, "updated_at": now},
            {"name": f"Cash Register - {name}", "type": "outlet_cash", "outlet_id": oid, "currency": "IDR",
             "opening_balance": 5_000_000, "current_balance": random.randint(5, 20) * 1_000_000,
             "bank_name": None, "account_number": None,
             "description": f"Daily cash {name}", "status": "active", "created_at": now, "updated_at": now},
            {"name": f"Petty Cash - {name}", "type": "petty_cash", "outlet_id": oid, "currency": "IDR",
             "opening_balance": 3_000_000, "current_balance": random.randint(1500, 3000) * 1000,
             "bank_name": None, "account_number": None,
             "description": f"Petty cash {name}", "status": "active", "created_at": now, "updated_at": now},
        ]
    accounts += [
        {"name": "BCA - HQ Lusi & Pakan", "type": "bank", "outlet_id": None, "currency": "IDR",
         "opening_balance": 800_000_000, "current_balance": 920_000_000,
         "bank_name": "BCA", "account_number": "0289999001",
         "description": "HQ main account", "status": "active", "created_at": now, "updated_at": now},
        {"name": "Mandiri - Operational", "type": "bank", "outlet_id": None, "currency": "IDR",
         "opening_balance": 200_000_000, "current_balance": 185_000_000,
         "bank_name": "Mandiri", "account_number": "1400011112222",
         "description": "HQ operational", "status": "active", "created_at": now, "updated_at": now},
        {"name": "Clearing Account", "type": "clearing", "outlet_id": None, "currency": "IDR",
         "opening_balance": 0, "current_balance": 0, "bank_name": None, "account_number": None,
         "description": "Settlement clearing", "status": "active", "created_at": now, "updated_at": now},
    ]
    acc_res = await accounts_col.insert_many(accounts)
    acc_docs = []
    async for a in accounts_col.find():
        acc_docs.append(a)
    print(f"    {len(accounts)} accounts")

    # ============= SUPPLIERS =============
    print("[7/15] Suppliers...")
    suppliers = [
        {"name": "CV Segar Bali", "code": "SUP-001", "contact_person": "Pak Kadek", "phone": "+62-361-444001",
         "email": "order@segarbali.co.id", "address": "Pasar Badung, Denpasar", "category": "vegetable",
         "active": True, "created_at": now},
        {"name": "UD Ikan Samudra", "code": "SUP-002", "contact_person": "Bu Ayu", "phone": "+62-361-444002",
         "email": "samudra@gmail.com", "address": "Pelabuhan Benoa, Denpasar", "category": "seafood",
         "active": True, "created_at": now},
        {"name": "PT Sumber Protein", "code": "SUP-003", "contact_person": "Pak Budi", "phone": "+62-361-444003",
         "email": "sales@sumberprotein.co.id", "address": "Industri Denpasar", "category": "meat",
         "active": True, "created_at": now},
        {"name": "CV Dairy Dewata", "code": "SUP-004", "contact_person": "Ibu Wayan", "phone": "+62-361-444004",
         "email": "info@dairydewata.com", "address": "Tabanan", "category": "dairy",
         "active": True, "created_at": now},
        {"name": "Indofood Distribusi Bali", "code": "SUP-005", "contact_person": "Pak Made", "phone": "+62-361-444005",
         "email": "bali@indofood.com", "address": "Gudang Sanur, Denpasar", "category": "dry_goods",
         "active": True, "created_at": now},
        {"name": "Bali Beverage Supply", "code": "SUP-006", "contact_person": "Ibu Dewi", "phone": "+62-361-444006",
         "email": "bali-bev@supply.co.id", "address": "Kuta, Badung", "category": "beverage",
         "active": True, "created_at": now},
        {"name": "Padi Mas (Beras & Grains)", "code": "SUP-007", "contact_person": "Pak Ketut", "phone": "+62-361-444007",
         "email": "padimas@gmail.com", "address": "Tabanan", "category": "grains",
         "active": True, "created_at": now},
    ]
    await suppliers_col.insert_many(suppliers)
    print(f"    {len(suppliers)} suppliers")

    # ============= RAW ITEMS (inventory) =============
    print("[8/15] Raw material items...")
    items = [
        # Protein
        ("Chicken Breast", "Protein", "kg", "raw", 15, 75000),
        ("Beef Tenderloin", "Protein", "kg", "raw", 8, 220000),
        ("Beef Short Ribs", "Protein", "kg", "raw", 6, 185000),
        ("Pork Ribs", "Protein", "kg", "raw", 6, 150000),
        ("Salmon Fillet", "Protein", "kg", "raw", 5, 280000),
        ("Prawn (Udang)", "Protein", "kg", "raw", 5, 165000),
        ("Squid (Calamari)", "Protein", "kg", "raw", 4, 95000),
        ("Bacon Strips", "Protein", "kg", "raw", 3, 140000),
        # Grains & Carbs
        ("Jasmine Rice", "Grains", "kg", "raw", 50, 16500),
        ("Pasta Spaghetti", "Grains", "kg", "raw", 10, 45000),
        ("Pasta Penne", "Grains", "kg", "raw", 8, 45000),
        ("Pizza Dough Flour", "Grains", "kg", "raw", 15, 22000),
        ("Burger Bun", "Grains", "pcs", "raw", 40, 4500),
        # Dairy
        ("Mozzarella Cheese", "Dairy", "kg", "raw", 8, 165000),
        ("Parmesan Cheese", "Dairy", "kg", "raw", 3, 280000),
        ("Fresh Cream", "Dairy", "liter", "raw", 10, 52000),
        ("Butter", "Dairy", "kg", "raw", 5, 95000),
        ("Full Cream Milk", "Dairy", "liter", "raw", 30, 18000),
        # Produce
        ("Tomato", "Produce", "kg", "raw", 15, 18000),
        ("Onion", "Produce", "kg", "raw", 15, 22000),
        ("Lettuce Mixed", "Produce", "kg", "raw", 8, 45000),
        ("Mango", "Produce", "kg", "raw", 10, 28000),
        ("Avocado", "Produce", "kg", "raw", 5, 45000),
        ("Lime (Jeruk Nipis)", "Produce", "kg", "raw", 5, 35000),
        ("Basil Fresh", "Produce", "kg", "raw", 2, 75000),
        # Beverage bases
        ("Coffee Beans Arabica", "Beverage", "kg", "raw", 10, 195000),
        ("Tea Earl Grey", "Beverage", "box", "raw", 8, 85000),
        ("Tea Lemongrass", "Beverage", "box", "raw", 5, 75000),
        ("Passion Fruit Puree", "Beverage", "liter", "raw", 5, 120000),
        ("Lychee Syrup", "Beverage", "liter", "raw", 4, 95000),
        ("Rum White", "Beverage", "liter", "raw", 3, 350000),
        ("Vodka", "Beverage", "liter", "raw", 3, 320000),
        ("Tequila", "Beverage", "liter", "raw", 2, 380000),
        ("Gin", "Beverage", "liter", "raw", 3, 340000),
        # Condiments & Spices
        ("Olive Oil Extra Virgin", "Oil", "liter", "raw", 6, 125000),
        ("Cooking Oil", "Oil", "liter", "raw", 40, 20000),
        ("Soy Sauce Premium", "Condiments", "liter", "raw", 10, 42000),
        ("Oyster Sauce", "Condiments", "liter", "raw", 6, 55000),
        ("Fish Sauce", "Condiments", "liter", "raw", 4, 48000),
        ("Balinese Spice Mix", "Spices", "kg", "raw", 3, 95000),
        ("Chili (Cabai)", "Spices", "kg", "raw", 5, 55000),
        ("Garlic (Bawang Putih)", "Spices", "kg", "raw", 5, 42000),
        # Prep materials
        ("Rendang Paste", "Prep", "kg", "prep", 3, 85000),
        ("Sambal Matah", "Prep", "kg", "prep", 3, 55000),
        ("Teriyaki Glaze", "Prep", "liter", "prep", 3, 78000),
        ("Caesar Dressing", "Prep", "liter", "prep", 3, 65000),
        ("BBQ Sauce House", "Prep", "liter", "prep", 3, 58000),
    ]
    item_docs = [{"name": n, "category": c, "uom": u, "pack_size": 1, "material_level": ml,
                  "reorder_threshold": rt, "cost_per_unit": cp, "description": n, "active": True,
                  "outlet_applicability": [], "created_at": now, "updated_at": now}
                 for (n, c, u, ml, rt, cp) in items]
    item_res = await items_col.insert_many(item_docs)
    item_ids_by_name = {items[i][0]: str(item_res.inserted_ids[i]) for i in range(len(items))}
    print(f"    {len(items)} items")

    # ============= STOCK ON HAND =============
    print("[9/15] Stock on hand...")
    stock_rows = []
    for oid in [OUT_DPS, OUT_TBN]:
        for name, (_, _, _, _, rt, _) in zip(item_ids_by_name.keys(),
                                              [(i[1], i[2], i[3], i[4], i[4], i[5]) for i in items]):
            # qty = 1.5x to 4x the reorder threshold
            target_rt = next((i[4] for i in items if i[0] == name), 5)
            qty = random.uniform(1.5, 4.0) * target_rt
            stock_rows.append({
                "item_id": item_ids_by_name[name], "outlet_id": oid,
                "quantity": round(qty, 2), "updated_at": now,
            })
    await stock_on_hand_col.insert_many(stock_rows)
    print(f"    {len(stock_rows)} stock rows")

    # ============= MENU ITEMS =============
    print("[10/15] Menu items (food + beverage)...")
    food_menu = [
        # Appetizer
        ("Bruschetta Trio", "Appetizer", 48000, "Crispy toast with tomato, pesto, and mushroom toppings"),
        ("Crispy Calamari", "Appetizer", 58000, "Golden fried calamari with garlic aioli"),
        ("Chicken Wings Honey Glaze", "Appetizer", 52000, "8pcs wings with honey mustard glaze"),
        # Snacks
        ("Truffle Parmesan Fries", "Snacks", 45000, "Crispy fries with truffle oil and parmesan"),
        ("Loaded Nachos", "Snacks", 62000, "Corn chips, cheese, jalapeno, guacamole, sour cream"),
        ("Mozzarella Sticks", "Snacks", 48000, "6pcs fried mozzarella with marinara"),
        # Salad
        ("Caesar Salad Classic", "Salad", 55000, "Romaine lettuce, parmesan, croutons, caesar dressing"),
        ("Quinoa Avocado Bowl", "Salad", 68000, "Quinoa, avocado, cherry tomato, lime vinaigrette"),
        ("Thai Mango Salad", "Salad", 58000, "Green mango, prawn, peanut, nam jim dressing"),
        # Asian
        ("Nasi Goreng Seafood", "Asian", 68000, "Balinese fried rice with prawn, squid, egg"),
        ("Pad Thai Prawn", "Asian", 75000, "Rice noodle with prawn, tamarind, peanut, lime"),
        ("Ayam Betutu Rice Set", "Asian", 72000, "Slow-cooked Balinese chicken with rice & urap"),
        ("Mie Goreng Spesial", "Asian", 55000, "Egg noodle, chicken, prawn, vegetables"),
        # Ribs
        ("Honey BBQ Pork Ribs", "Ribs", 95000, "Half rack glazed pork ribs with house BBQ"),
        ("Smoked Beef Short Ribs", "Ribs", 99000, "Slow-smoked beef ribs with jus"),
        # Soup
        ("Tom Yum Seafood", "Soup", 58000, "Spicy sour Thai soup with prawn, squid, mushroom"),
        ("Creamy Pumpkin Soup", "Soup", 45000, "Roasted pumpkin cream with toasted bread"),
        ("Soto Ayam Bali", "Soup", 42000, "Balinese chicken soup with lemongrass"),
        # Ricebowl
        ("Chicken Teriyaki Bowl", "Ricebowl", 58000, "Grilled chicken, teriyaki glaze, steamed rice"),
        ("Beef Rendang Bowl", "Ricebowl", 68000, "Slow-cooked rendang, nasi putih, sambal matah"),
        ("Salmon Poke Bowl", "Ricebowl", 85000, "Fresh salmon, avocado, edamame, sesame"),
        # Western
        ("Grilled Chicken Steak", "Western", 72000, "Herb marinated chicken, mashed potato, veg"),
        ("Sirloin Steak 200gr", "Western", 98000, "Prime sirloin, pepper sauce, potato wedges"),
        ("Fish & Chips Classic", "Western", 68000, "Beer battered fish, fries, tartar sauce"),
        # Pasta
        ("Carbonara Bacon", "Pasta", 65000, "Spaghetti, bacon, egg yolk, parmesan"),
        ("Aglio Olio Prawn", "Pasta", 75000, "Spaghetti, garlic, chili, prawn, parsley"),
        ("Penne Bolognese", "Pasta", 62000, "Penne with slow-cooked beef bolognese"),
        # Pizza
        ("Pizza Margherita", "Pizza", 68000, "Tomato, mozzarella, basil"),
        ("Pizza Pepperoni", "Pizza", 78000, "Tomato, mozzarella, spicy pepperoni"),
        ("Pizza Quattro Formaggi", "Pizza", 88000, "Four cheese classic"),
        # Kids Meal
        ("Mini Burger Set", "Kids Meal", 45000, "2 mini beef sliders, fries, juice"),
        ("Mac & Cheese Kids", "Kids Meal", 42000, "Creamy macaroni cheese"),
        ("Chicken Nugget & Fries", "Kids Meal", 40000, "6pcs homemade nuggets with fries"),
        # Dessert
        ("Tiramisu Classic", "Dessert", 48000, "Coffee-soaked ladyfinger with mascarpone"),
        ("Molten Chocolate Cake", "Dessert", 52000, "Warm chocolate cake with vanilla ice cream"),
        ("Pisang Goreng Ice Cream", "Dessert", 42000, "Fried banana with vanilla ice cream & palm syrup"),
        ("Panna Cotta Berry", "Dessert", 48000, "Vanilla panna cotta with berry compote"),
    ]
    beverage_menu = [
        # Coffee
        ("Espresso", "Coffee", 28000, "Single shot espresso"),
        ("Americano", "Coffee", 32000, "Espresso with hot water"),
        ("Cappuccino", "Coffee", 42000, "Espresso, steamed milk, foam"),
        ("Latte Caramel", "Coffee", 48000, "Espresso, steamed milk, caramel"),
        ("Kopi Susu Gula Aren", "Coffee", 38000, "Signature Indonesian milk coffee"),
        # Mocktails
        ("Virgin Mojito", "Mocktails", 48000, "Mint, lime, soda, brown sugar"),
        ("Sunset Bali", "Mocktails", 52000, "Passionfruit, orange, grenadine, lime"),
        ("Tropical Paradise", "Mocktails", 55000, "Mango, pineapple, coconut cream"),
        # Flavoured
        ("Lychee Fizz", "Flavoured", 42000, "Lychee, lime, soda"),
        ("Strawberry Lemonade", "Flavoured", 38000, "Fresh strawberry, lemon, honey"),
        ("Blue Ocean Soda", "Flavoured", 45000, "Blue curacao syrup, lime, soda"),
        # Juice
        ("Fresh Orange Juice", "Juice", 38000, "100% squeezed orange"),
        ("Watermelon Juice", "Juice", 32000, "Fresh watermelon"),
        ("Green Detox Juice", "Juice", 48000, "Apple, cucumber, celery, lime"),
        # Tea
        ("Iced Lemon Tea", "Tea", 28000, "Classic iced black tea with lemon"),
        ("Earl Grey Hot/Iced", "Tea", 32000, "Premium earl grey"),
        ("Lemongrass Ginger Tea", "Tea", 35000, "Fresh lemongrass & ginger infusion"),
        # Cocktails
        ("Mojito Classic", "Cocktails", 65000, "White rum, mint, lime, soda"),
        ("Pina Colada", "Cocktails", 62000, "White rum, pineapple, coconut cream"),
        ("Margarita", "Cocktails", 65000, "Tequila, triple sec, lime, salt rim"),
        ("Gin & Tonic", "Cocktails", 58000, "Premium gin, tonic, lime"),
    ]
    all_menu = [(n, c, p, d, "food") for (n, c, p, d) in food_menu] + \
               [(n, c, p, d, "beverage") for (n, c, p, d) in beverage_menu]
    menu_docs = [{"name": n, "category": c, "price": p, "description": d,
                  "group": grp, "active": True, "available_outlets": [],
                  "created_at": now, "updated_at": now, "created_by": "system"}
                 for (n, c, p, d, grp) in all_menu]
    menu_res = await menu_items_col.insert_many(menu_docs)
    menu_ids = [str(i) for i in menu_res.inserted_ids]
    menu_full = [{"id": menu_ids[i], **menu_docs[i]} for i in range(len(menu_docs))]
    print(f"    {len(all_menu)} menu items ({len(food_menu)} food + {len(beverage_menu)} beverage)")

    # ============= SALES SUMMARIES (90 days with season) =============
    print("[11/15] Sales summaries (90 days × 2 outlets)...")
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    sales_docs = []
    daily_closing_docs = []
    for day_offset in range(90, 0, -1):
        d = today - timedelta(days=day_offset)
        dstr = d.strftime("%Y-%m-%d")
        # Season multiplier based on days ago: older = lower (post-holiday Feb), newer = peak (Apr)
        if day_offset > 60:      # month -3 (low season post-holiday)
            season_mult = 0.72   # ~320jt
        elif day_offset > 30:    # month -2 (normal)
            season_mult = 0.88   # ~380jt
        else:                    # month -1 (peak approaching)
            season_mult = 1.05   # ~450jt
        # Weekday/weekend pattern
        wd = d.weekday()  # 0=Mon .. 6=Sun
        day_mult = 1.35 if wd in (4, 5, 6) else 0.85  # Fri/Sat/Sun higher
        # Outlet size difference: Denpasar 15% bigger than Tabanan
        for oid, outlet_bias in [(OUT_DPS, 1.10), (OUT_TBN, 0.95)]:
            base = 12_500_000  # base daily avg
            # noise
            noise = random.uniform(0.88, 1.12)
            total = int(base * season_mult * day_mult * outlet_bias * noise)
            # Split: Food ~65%, Beverage ~35%
            food_sales = int(total * random.uniform(0.60, 0.68))
            bev_sales = total - food_sales
            # Payment mix: cash 40%, card 35%, online 20%, other 5%
            cash_pct = random.uniform(0.38, 0.45)
            card_pct = random.uniform(0.30, 0.38)
            online_pct = random.uniform(0.15, 0.22)
            cash_sales = int(total * cash_pct)
            card_sales = int(total * card_pct)
            online_sales = int(total * online_pct)
            other_sales = total - cash_sales - card_sales - online_sales
            sales_docs.append({
                "outlet_id": oid, "date": dstr,
                "total_sales": total, "cash_sales": cash_sales, "card_sales": card_sales,
                "online_sales": online_sales, "other_sales": other_sales,
                "food_sales": food_sales, "beverage_sales": bev_sales,
                "notes": "", "created_by": "system",
                "created_at": d + timedelta(hours=23), "source": "outlet_manual",
            })
            # Daily closing (submitted+approved for days > 2 days ago)
            if day_offset > 2:
                daily_closing_docs.append({
                    "outlet_id": oid, "date": dstr,
                    "status": "approved",
                    "total_sales": total, "cash_sales": cash_sales,
                    "card_sales": card_sales, "online_sales": online_sales,
                    "submitted_at": d + timedelta(hours=23, minutes=30),
                    "approved_at": d + timedelta(hours=23, minutes=45),
                    "submitted_by": "manager", "approved_by": "finance",
                    "checklist": {"cashier_shifts": True, "sales_entered": True,
                                  "cash_counted": True, "petty_cash_logged": True, "inventory_counted": False},
                    "discrepancies": [],
                    "notes": "", "created_at": d + timedelta(hours=23, minutes=30),
                })
    await sales_summaries_col.insert_many(sales_docs)
    if daily_closing_docs:
        await daily_closings_col.insert_many(daily_closing_docs)
    print(f"    {len(sales_docs)} sales summaries, {len(daily_closing_docs)} daily closings")

    # ============= CASHIER SHIFTS (last 30 days) =============
    print("[12/15] Cashier shifts (last 30 days × 2 outlets)...")
    cashier_dps_user = await users_col.find_one({"email": "cashier.denpasar@lusipakan.com"})
    cashier_tbn_user = await users_col.find_one({"email": "cashier.tabanan@lusipakan.com"})
    shift_docs = []
    for day_offset in range(30, 0, -1):
        d = today - timedelta(days=day_offset)
        for oid, u, name in [(OUT_DPS, cashier_dps_user, "DPS"), (OUT_TBN, cashier_tbn_user, "TBN")]:
            # Find matching sales summary
            ss = next((s for s in sales_docs if s["outlet_id"] == oid and s["date"] == d.strftime("%Y-%m-%d")), None)
            if not ss:
                continue
            total = ss["total_sales"]
            cash = ss["cash_sales"]
            card = ss["card_sales"]
            online = ss["online_sales"]
            other = ss["other_sales"]
            variance = random.choice([0, 0, 0, -50000, 25000, -100000, 15000])
            shift_docs.append({
                "shift_number": f"SHF-{oid[-4:]}-{d.strftime('%Y%m%d')}-0001",
                "outlet_id": oid,
                "cashier_id": str(u["_id"]),
                "cashier_name": u["name"],
                "opening_cash": 500000,
                "opening_notes": "",
                "status": "closed",
                "opened_at": d + timedelta(hours=10),
                "closed_at": d + timedelta(hours=23),
                "closing_cash_expected": 500000 + cash,
                "closing_cash_actual": 500000 + cash + variance,
                "variance": variance,
                "closing_notes": "Shift complete" if variance == 0 else f"Variance Rp {variance:,}",
                "totals": {
                    "total_sales": total, "cash_sales": cash, "card_sales": card,
                    "online_sales": online, "other_sales": other,
                    "order_count": random.randint(40, 120),
                },
                "created_at": d + timedelta(hours=10),
                "updated_at": d + timedelta(hours=23),
            })
    await cashier_shifts_col.insert_many(shift_docs)
    print(f"    {len(shift_docs)} shifts")

    # ============= CASH MOVEMENTS (bank deposits) =============
    print("[13/15] Cash movements + petty cash...")
    cash_movs = []
    for oid in [OUT_DPS, OUT_TBN]:
        cash_acc = next((a for a in acc_docs if a.get("outlet_id") == oid and a["type"] == "outlet_cash"), None)
        bank_acc = next((a for a in acc_docs if a.get("outlet_id") == oid and a["type"] == "bank"), None)
        if not cash_acc or not bank_acc:
            continue
        for day_offset in range(60, 0, -1):
            d = today - timedelta(days=day_offset)
            dstr = d.strftime("%Y-%m-%d")
            if day_offset % 2 == 0:  # every other day: deposit to bank
                cash_movs.append({
                    "type": "settlement",
                    "from_account_id": str(cash_acc["_id"]),
                    "to_account_id": str(bank_acc["_id"]),
                    "amount": random.randint(8, 25) * 1_000_000,
                    "outlet_id": oid,
                    "reference": f"SETTLE-{dstr}",
                    "description": "Daily cash deposit to bank",
                    "date": dstr, "status": "completed", "created_by": "system",
                    "created_at": d + timedelta(hours=18), "updated_at": d + timedelta(hours=18),
                })
    await cash_movements_col.insert_many(cash_movs)

    # Petty cash
    pc_docs = []
    categories = ["supplies", "cleaning", "maintenance", "transport", "operational"]
    descs = ["Bahan cleaning", "Gas refill", "Parking operasional", "Gallon air minum",
             "Kertas struk", "Tinta printer", "LPG", "Delivery bahan", "Perbaikan mixer"]
    for oid in [OUT_DPS, OUT_TBN]:
        pc_acc = next((a for a in acc_docs if a.get("outlet_id") == oid and a["type"] == "petty_cash"), None)
        if not pc_acc:
            continue
        for day_offset in range(60, 0, -1):
            if random.random() < 0.45:  # ~27 entries/outlet
                d = today - timedelta(days=day_offset)
                pc_docs.append({
                    "outlet_id": oid, "account_id": str(pc_acc["_id"]),
                    "amount": random.randint(50, 450) * 1000,
                    "description": random.choice(descs),
                    "category": random.choice(categories),
                    "receipt_ref": f"PC-{d.strftime('%Y%m%d')}-{random.randint(1,99):02d}",
                    "date": d.strftime("%Y-%m-%d"), "status": "recorded",
                    "created_by": "manager", "created_at": d + timedelta(hours=14),
                })
    if pc_docs:
        await petty_cash_col.insert_many(pc_docs)
    print(f"    {len(cash_movs)} cash movements, {len(pc_docs)} petty cash entries")

    # ============= WAREHOUSE RECEIPTS + WASTE =============
    print("[14/15] Warehouse receipts & waste logs...")
    suppliers_list = []
    async for s in suppliers_col.find():
        suppliers_list.append(s)
    # Bi-weekly receipts per outlet
    wh_receipts = []
    receipt_counter = {OUT_DPS: 0, OUT_TBN: 0}
    for oid in [OUT_DPS, OUT_TBN]:
        for day_offset in range(84, 0, -7):
            d = today - timedelta(days=day_offset)
            # Pick 3-5 items from different suppliers
            items_pool = list(item_ids_by_name.keys())
            selected = random.sample(items_pool, random.randint(3, 6))
            lines = []
            total_val = 0
            for name in selected:
                item_info = next((i for i in items if i[0] == name), None)
                if not item_info:
                    continue
                qty = random.randint(3, 25)
                cost = item_info[5]
                line_total = qty * cost
                total_val += line_total
                lines.append({
                    "item_id": item_ids_by_name[name], "item_name": name,
                    "quantity": qty, "uom": item_info[2],
                    "unit_cost": cost, "total_cost": line_total, "notes": "",
                })
            sup = random.choice(suppliers_list)
            receipt_counter[oid] += 1
            wh_receipts.append({
                "receipt_number": f"GRN-{d.strftime('%Y%m%d')}-{receipt_counter[oid]:04d}",
                "outlet_id": oid, "supplier_id": str(sup["_id"]),
                "supplier_name": sup["name"],
                "po_reference": f"PO-{d.strftime('%Y%m')}-{receipt_counter[oid]:03d}",
                "invoice_number": f"INV-{sup['code']}-{random.randint(1000,9999)}",
                "date": d.strftime("%Y-%m-%d"),
                "lines": lines, "total_items": len(lines), "total_value": total_val,
                "notes": "", "status": "posted",
                "created_by": "warehouse", "created_by_name": "Budi Gudang",
                "created_at": d + timedelta(hours=9),
            })
    if wh_receipts:
        await warehouse_receipts_col.insert_many(wh_receipts)

    # Waste logs (kitchen)
    waste_reasons = ["expired", "damage", "over-prep", "customer return", "trim waste"]
    waste_docs = []
    for oid in [OUT_DPS, OUT_TBN]:
        for day_offset in range(30, 0, -1):
            if random.random() < 0.35:  # ~10 waste/outlet
                d = today - timedelta(days=day_offset)
                name = random.choice(list(item_ids_by_name.keys()))
                item_info = next((i for i in items if i[0] == name), None)
                if not item_info:
                    continue
                qty = round(random.uniform(0.2, 2.5), 2)
                cost = item_info[5]
                waste_docs.append({
                    "outlet_id": oid,
                    "item_id": item_ids_by_name[name], "item_name": name,
                    "quantity": qty, "uom": item_info[2],
                    "reason": random.choice(waste_reasons),
                    "category": random.choice(["food", "beverage"]),
                    "cost_impact": round(qty * cost, 0),
                    "notes": "",
                    "logged_by": "kitchen", "logged_by_name": "Chef",
                    "created_at": d + timedelta(hours=random.randint(11, 22)),
                    "date": d.strftime("%Y-%m-%d"),
                })
    if waste_docs:
        await waste_logs_col.insert_many(waste_docs)
    print(f"    {len(wh_receipts)} receipts, {len(waste_docs)} waste logs")

    # ============= BUDGETS =============
    print("[15/15] Budgets (current month)...")
    month_str = now.strftime("%Y-%m")
    budgets = []
    for oid, label in [(OUT_DPS, "Denpasar"), (OUT_TBN, "Tabanan")]:
        target = 450_000_000 if oid == OUT_DPS else 380_000_000
        budgets.append({
            "outlet_id": oid, "month": month_str,
            "revenue_target": target,
            "cogs_budget": int(target * 0.35),
            "wages_budget": int(target * 0.18),
            "rent_budget": int(target * 0.08),
            "utilities_budget": int(target * 0.04),
            "marketing_budget": int(target * 0.03),
            "other_budget": int(target * 0.05),
            "notes": f"Budget bulan {month_str} untuk {label}",
            "created_at": now, "updated_at": now,
        })
    await budgets_col.insert_many(budgets)
    print(f"    {len(budgets)} budgets")

    # ============= SUMMARY =============
    total_rev_summary = sum(s["total_sales"] for s in sales_docs) / 1_000_000
    dps_rev = sum(s["total_sales"] for s in sales_docs if s["outlet_id"] == OUT_DPS) / 1_000_000
    tbn_rev = sum(s["total_sales"] for s in sales_docs if s["outlet_id"] == OUT_TBN) / 1_000_000
    print("\n" + "=" * 60)
    print("RESEED COMPLETE — Lusi & Pakan data loaded")
    print("=" * 60)
    print(f"Outlets        : 2 (Denpasar, Tabanan)")
    print(f"Users          : {len(users)}")
    print(f"Menu items     : {len(all_menu)}")
    print(f"Items (stock)  : {len(items)}")
    print(f"Sales (90d)    : Rp {total_rev_summary:,.0f} jt total")
    print(f"  - Denpasar   : Rp {dps_rev:,.0f} jt")
    print(f"  - Tabanan    : Rp {tbn_rev:,.0f} jt")
    print(f"Shifts (30d)   : {len(shift_docs)}")
    print(f"Receipts       : {len(wh_receipts)}")
    print("\n=== LOGIN CREDENTIALS ===")
    print("Super Admin     : admin@lusipakan.com / admin123")
    print("Owner (F+Exec)  : owner@lusipakan.com / owner123")
    print("Executive       : exec@lusipakan.com / exec123")
    print("Finance         : finance@lusipakan.com / finance123")
    print("Manager DPS     : manager.denpasar@lusipakan.com / manager123")
    print("Manager TBN     : manager.tabanan@lusipakan.com / manager123")
    print("Inventory       : inventory@lusipakan.com / inventory123")
    print("Cashier DPS     : cashier.denpasar@lusipakan.com / cashier123")
    print("Cashier TBN     : cashier.tabanan@lusipakan.com / cashier123")
    print("Kitchen DPS     : kitchen.denpasar@lusipakan.com / kitchen123")
    print("Kitchen TBN     : kitchen.tabanan@lusipakan.com / kitchen123")
    print("Warehouse       : warehouse@lusipakan.com / warehouse123")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
