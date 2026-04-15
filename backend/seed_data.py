import asyncio
from database import (
    users_col, outlets_col, roles_col, accounts_col,
    items_col, stock_on_hand_col, sales_summaries_col,
    cash_movements_col, petty_cash_col
)
from auth import hash_password
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import random

async def seed_data():
    """Seed demo data for the F&B ERP system"""
    # Check if data already exists
    existing_users = await users_col.count_documents({})
    if existing_users > 0:
        print("Data already seeded, skipping...")
        return
    
    print("Seeding demo data...")
    now = datetime.now(timezone.utc)
    
    # ===================== OUTLETS =====================
    outlets = [
        {"name": "Warung Nusantara - Sudirman", "city": "Jakarta", "address": "Jl. Sudirman No. 45, Jakarta Pusat", "phone": "+62-21-5551234", "status": "active", "settings": {}, "created_at": now, "updated_at": now},
        {"name": "Warung Nusantara - Kemang", "city": "Jakarta", "address": "Jl. Kemang Raya No. 12, Jakarta Selatan", "phone": "+62-21-5555678", "status": "active", "settings": {}, "created_at": now, "updated_at": now},
        {"name": "Warung Nusantara - Bandung", "city": "Bandung", "address": "Jl. Braga No. 88, Bandung", "phone": "+62-22-4441234", "status": "active", "settings": {}, "created_at": now, "updated_at": now},
    ]
    outlet_results = await outlets_col.insert_many(outlets)
    outlet_ids = [str(oid) for oid in outlet_results.inserted_ids]
    print(f"Created {len(outlet_ids)} outlets")
    
    # ===================== ROLES =====================
    roles = [
        {
            "name": "Super Admin",
            "description": "Full system access",
            "permissions": ["*"],
            "portal_access": ["management", "outlet", "kitchen", "cashier", "warehouse"],
            "is_system": True,
            "created_at": now,
            "updated_at": now,
        },
        {
            "name": "Finance Head",
            "description": "Finance and accounting management",
            "permissions": [
                "finance.view_accounts", "finance.manage_accounts", "finance.create_cash_movement",
                "finance.approve_cash_movement", "finance.view_cashflow", "finance.manage_settlement",
                "finance.close_period", "finance.reopen_period", "finance.view_journals",
                "finance.manage_petty_cash", "reports.view_reports", "reports.export_reports",
                "reports.view_pnl", "reports.view_cashflow", "reports.view_balance_sheet",
                "approvals.view", "approvals.approve", "approvals.reject",
                "core.view_users", "core.view_outlets", "core.view_audit",
            ],
            "portal_access": ["management"],
            "is_system": True,
            "created_at": now,
            "updated_at": now,
        },
        {
            "name": "Outlet Manager",
            "description": "Outlet-level operations management",
            "permissions": [
                "outlet.view_data", "outlet.create_sales_summary", "outlet.manage_petty_cash",
                "outlet.manage_cash", "outlet.view_pnl", "outlet.manage_inventory",
                "finance.view_accounts", "finance.create_cash_movement", "finance.manage_petty_cash",
                "inventory.view_items", "inventory.create_stock_movement", "inventory.view_stock",
                "inventory.manage_conversions", "inventory.view_valuation",
                "reports.view_reports", "reports.view_pnl", "reports.view_inventory",
                "approvals.view", "approvals.submit",
            ],
            "portal_access": ["outlet"],
            "is_system": True,
            "created_at": now,
            "updated_at": now,
        },
        {
            "name": "Inventory Controller",
            "description": "Inventory management and control",
            "permissions": [
                "inventory.view_items", "inventory.manage_items", "inventory.create_stock_movement",
                "inventory.approve_stock_movement", "inventory.view_stock", "inventory.manage_conversions",
                "inventory.view_valuation", "inventory.manage_hierarchy",
                "reports.view_reports", "reports.view_inventory", "reports.export_reports",
                "approvals.view", "approvals.approve", "approvals.reject",
                "core.view_outlets",
            ],
            "portal_access": ["management"],
            "is_system": True,
            "created_at": now,
            "updated_at": now,
        },
        {
            "name": "Outlet Staff",
            "description": "Basic outlet operations",
            "permissions": [
                "outlet.view_data", "outlet.create_sales_summary", "outlet.manage_cash",
                "inventory.view_items", "inventory.view_stock", "inventory.create_stock_movement",
                "approvals.submit",
            ],
            "portal_access": ["outlet"],
            "is_system": True,
            "created_at": now,
            "updated_at": now,
        },
    ]
    role_results = await roles_col.insert_many(roles)
    role_ids = [str(rid) for rid in role_results.inserted_ids]
    print(f"Created {len(role_ids)} roles")
    
    # ===================== USERS =====================
    users = [
        {
            "email": "admin@fnb.com",
            "password_hash": hash_password("admin123"),
            "name": "System Admin",
            "role_ids": [role_results.inserted_ids[0]],  # Super Admin
            "portal_access": ["management", "outlet", "kitchen", "cashier", "warehouse"],
            "outlet_access": [ObjectId(oid) for oid in outlet_ids],
            "is_active": True,
            "is_superadmin": True,
            "created_at": now,
            "updated_at": now,
        },
        {
            "email": "finance@fnb.com",
            "password_hash": hash_password("finance123"),
            "name": "Sarah Finance",
            "role_ids": [role_results.inserted_ids[1]],  # Finance Head
            "portal_access": ["management"],
            "outlet_access": [ObjectId(oid) for oid in outlet_ids],
            "is_active": True,
            "is_superadmin": False,
            "created_at": now,
            "updated_at": now,
        },
        {
            "email": "manager.sudirman@fnb.com",
            "password_hash": hash_password("manager123"),
            "name": "Budi Sudirman",
            "role_ids": [role_results.inserted_ids[2]],  # Outlet Manager
            "portal_access": ["outlet"],
            "outlet_access": [ObjectId(outlet_ids[0])],  # Only Sudirman outlet
            "is_active": True,
            "is_superadmin": False,
            "created_at": now,
            "updated_at": now,
        },
        {
            "email": "manager.kemang@fnb.com",
            "password_hash": hash_password("manager123"),
            "name": "Dewi Kemang",
            "role_ids": [role_results.inserted_ids[2]],  # Outlet Manager
            "portal_access": ["outlet"],
            "outlet_access": [ObjectId(outlet_ids[1])],  # Only Kemang outlet
            "is_active": True,
            "is_superadmin": False,
            "created_at": now,
            "updated_at": now,
        },
        {
            "email": "inventory@fnb.com",
            "password_hash": hash_password("inventory123"),
            "name": "Andi Inventory",
            "role_ids": [role_results.inserted_ids[3]],  # Inventory Controller
            "portal_access": ["management"],
            "outlet_access": [ObjectId(oid) for oid in outlet_ids],
            "is_active": True,
            "is_superadmin": False,
            "created_at": now,
            "updated_at": now,
        },
    ]
    await users_col.insert_many(users)
    print(f"Created {len(users)} users")
    
    # ===================== ACCOUNTS =====================
    accounts = []
    for i, oid in enumerate(outlet_ids):
        outlet_name = outlets[i]["name"].split(" - ")[-1]
        accounts.extend([
            {"name": f"BCA - {outlet_name}", "type": "bank", "outlet_id": oid, "currency": "IDR", "opening_balance": random.randint(50, 200) * 1000000, "current_balance": random.randint(50, 200) * 1000000, "bank_name": "BCA", "account_number": f"123456789{i}", "description": f"Main bank account for {outlet_name}", "status": "active", "created_at": now, "updated_at": now},
            {"name": f"Cash Register - {outlet_name}", "type": "outlet_cash", "outlet_id": oid, "currency": "IDR", "opening_balance": 5000000, "current_balance": random.randint(3, 15) * 1000000, "bank_name": None, "account_number": None, "description": f"Daily cash for {outlet_name}", "status": "active", "created_at": now, "updated_at": now},
            {"name": f"Petty Cash - {outlet_name}", "type": "petty_cash", "outlet_id": oid, "currency": "IDR", "opening_balance": 2000000, "current_balance": random.randint(500, 2000) * 1000, "bank_name": None, "account_number": None, "description": f"Petty cash for {outlet_name}", "status": "active", "created_at": now, "updated_at": now},
        ])
    # HQ accounts
    accounts.append({"name": "BCA - Head Office", "type": "bank", "outlet_id": None, "currency": "IDR", "opening_balance": 500000000, "current_balance": 500000000, "bank_name": "BCA", "account_number": "9999999990", "description": "Head office main account", "status": "active", "created_at": now, "updated_at": now})
    accounts.append({"name": "Clearing Account", "type": "clearing", "outlet_id": None, "currency": "IDR", "opening_balance": 0, "current_balance": 0, "bank_name": None, "account_number": None, "description": "Settlement clearing", "status": "active", "created_at": now, "updated_at": now})
    await accounts_col.insert_many(accounts)
    print(f"Created {len(accounts)} accounts")
    
    # ===================== ITEMS =====================
    items = [
        # Raw materials
        {"name": "Beras Premium", "category": "Grains", "uom": "kg", "pack_size": 25, "material_level": "raw", "reorder_threshold": 50, "cost_per_unit": 14000, "description": "Premium rice", "active": True, "outlet_applicability": [], "created_at": now, "updated_at": now},
        {"name": "Ayam Potong", "category": "Protein", "uom": "kg", "pack_size": 1, "material_level": "raw", "reorder_threshold": 20, "cost_per_unit": 38000, "description": "Fresh chicken", "active": True, "outlet_applicability": [], "created_at": now, "updated_at": now},
        {"name": "Daging Sapi", "category": "Protein", "uom": "kg", "pack_size": 1, "material_level": "raw", "reorder_threshold": 15, "cost_per_unit": 130000, "description": "Beef", "active": True, "outlet_applicability": [], "created_at": now, "updated_at": now},
        {"name": "Ikan Gurame", "category": "Protein", "uom": "kg", "pack_size": 1, "material_level": "raw", "reorder_threshold": 10, "cost_per_unit": 55000, "description": "Gourami fish", "active": True, "outlet_applicability": [], "created_at": now, "updated_at": now},
        {"name": "Minyak Goreng", "category": "Oil", "uom": "liter", "pack_size": 5, "material_level": "raw", "reorder_threshold": 20, "cost_per_unit": 18000, "description": "Cooking oil", "active": True, "outlet_applicability": [], "created_at": now, "updated_at": now},
        {"name": "Bawang Merah", "category": "Spices", "uom": "kg", "pack_size": 1, "material_level": "raw", "reorder_threshold": 10, "cost_per_unit": 35000, "description": "Shallots", "active": True, "outlet_applicability": [], "created_at": now, "updated_at": now},
        {"name": "Bawang Putih", "category": "Spices", "uom": "kg", "pack_size": 1, "material_level": "raw", "reorder_threshold": 10, "cost_per_unit": 40000, "description": "Garlic", "active": True, "outlet_applicability": [], "created_at": now, "updated_at": now},
        {"name": "Cabai Merah", "category": "Spices", "uom": "kg", "pack_size": 1, "material_level": "raw", "reorder_threshold": 8, "cost_per_unit": 45000, "description": "Red chili", "active": True, "outlet_applicability": [], "created_at": now, "updated_at": now},
        {"name": "Santan Kelapa", "category": "Dairy", "uom": "liter", "pack_size": 1, "material_level": "raw", "reorder_threshold": 10, "cost_per_unit": 25000, "description": "Coconut milk", "active": True, "outlet_applicability": [], "created_at": now, "updated_at": now},
        {"name": "Teh Celup", "category": "Beverages", "uom": "box", "pack_size": 25, "material_level": "raw", "reorder_threshold": 10, "cost_per_unit": 15000, "description": "Tea bags", "active": True, "outlet_applicability": [], "created_at": now, "updated_at": now},
        {"name": "Kopi Bubuk", "category": "Beverages", "uom": "kg", "pack_size": 1, "material_level": "raw", "reorder_threshold": 5, "cost_per_unit": 80000, "description": "Ground coffee", "active": True, "outlet_applicability": [], "created_at": now, "updated_at": now},
        {"name": "Gula Pasir", "category": "Condiments", "uom": "kg", "pack_size": 1, "material_level": "raw", "reorder_threshold": 20, "cost_per_unit": 16000, "description": "Sugar", "active": True, "outlet_applicability": [], "created_at": now, "updated_at": now},
        # Prep materials
        {"name": "Bumbu Rendang", "category": "Prep", "uom": "kg", "pack_size": 1, "material_level": "prep", "reorder_threshold": 5, "cost_per_unit": 85000, "description": "Rendang spice paste", "active": True, "outlet_applicability": [], "created_at": now, "updated_at": now},
        {"name": "Sambal Matah", "category": "Prep", "uom": "kg", "pack_size": 1, "material_level": "prep", "reorder_threshold": 3, "cost_per_unit": 50000, "description": "Raw sambal", "active": True, "outlet_applicability": [], "created_at": now, "updated_at": now},
        {"name": "Nasi Putih", "category": "Prep", "uom": "kg", "pack_size": 1, "material_level": "prep", "reorder_threshold": 10, "cost_per_unit": 18000, "description": "Cooked rice", "active": True, "outlet_applicability": [], "created_at": now, "updated_at": now},
    ]
    item_results = await items_col.insert_many(items)
    item_ids = [str(iid) for iid in item_results.inserted_ids]
    print(f"Created {len(item_ids)} items")
    
    # ===================== STOCK ON HAND =====================
    stock_entries = []
    for oid in outlet_ids:
        for i, item_id in enumerate(item_ids):
            stock_entries.append({
                "item_id": item_id,
                "outlet_id": oid,
                "quantity": random.randint(5, 100),
                "updated_at": now,
            })
    await stock_on_hand_col.insert_many(stock_entries)
    print(f"Created {len(stock_entries)} stock entries")
    
    # ===================== SALES SUMMARIES (last 30 days) =====================
    sales_data = []
    for oid in outlet_ids:
        for day in range(30):
            date = (now - timedelta(days=day)).strftime("%Y-%m-%d")
            total = random.randint(8, 25) * 1000000
            cash_pct = random.uniform(0.4, 0.7)
            sales_data.append({
                "outlet_id": oid,
                "date": date,
                "total_sales": total,
                "cash_sales": int(total * cash_pct),
                "card_sales": int(total * (1 - cash_pct) * 0.7),
                "online_sales": int(total * (1 - cash_pct) * 0.3),
                "other_sales": 0,
                "notes": "",
                "created_by": "system",
                "created_at": now - timedelta(days=day),
            })
    await sales_summaries_col.insert_many(sales_data)
    print(f"Created {len(sales_data)} sales summaries")
    
    # ===================== CASH MOVEMENTS =====================
    cm_data = []
    accs = []
    async for a in accounts_col.find():
        accs.append(a)
    
    for oid_idx, oid in enumerate(outlet_ids):
        outlet_accs = [a for a in accs if a.get("outlet_id") == oid]
        cash_acc = next((a for a in outlet_accs if a["type"] == "outlet_cash"), None)
        bank_acc = next((a for a in outlet_accs if a["type"] == "bank"), None)
        if cash_acc and bank_acc:
            for day in range(15):
                date = (now - timedelta(days=day)).strftime("%Y-%m-%d")
                cm_data.append({
                    "type": "cash_in",
                    "from_account_id": None,
                    "to_account_id": str(cash_acc["_id"]),
                    "amount": random.randint(5, 15) * 1000000,
                    "outlet_id": oid,
                    "reference": f"SALES-{date}",
                    "description": f"Daily sales deposit",
                    "date": date,
                    "status": "completed",
                    "created_by": "system",
                    "created_at": now - timedelta(days=day),
                    "updated_at": now - timedelta(days=day),
                })
                if day % 3 == 0:
                    cm_data.append({
                        "type": "settlement",
                        "from_account_id": str(cash_acc["_id"]),
                        "to_account_id": str(bank_acc["_id"]),
                        "amount": random.randint(10, 30) * 1000000,
                        "outlet_id": oid,
                        "reference": f"SETTLE-{date}",
                        "description": f"Cash to bank settlement",
                        "date": date,
                        "status": "completed",
                        "created_by": "system",
                        "created_at": now - timedelta(days=day),
                        "updated_at": now - timedelta(days=day),
                    })
    if cm_data:
        await cash_movements_col.insert_many(cm_data)
    print(f"Created {len(cm_data)} cash movements")
    
    # ===================== PETTY CASH =====================
    pc_data = []
    categories = ["transport", "supplies", "cleaning", "maintenance", "operational"]
    for oid_idx, oid in enumerate(outlet_ids):
        petty_acc = next((a for a in accs if a.get("outlet_id") == oid and a["type"] == "petty_cash"), None)
        if petty_acc:
            for day in range(10):
                date = (now - timedelta(days=day)).strftime("%Y-%m-%d")
                pc_data.append({
                    "outlet_id": oid,
                    "account_id": str(petty_acc["_id"]),
                    "amount": random.randint(50, 500) * 1000,
                    "description": random.choice(["Office supplies", "Gas refill", "Cleaning materials", "Parking fees", "Equipment repair"]),
                    "category": random.choice(categories),
                    "receipt_ref": f"PC-{day:03d}",
                    "date": date,
                    "status": "recorded",
                    "created_by": "system",
                    "created_at": now - timedelta(days=day),
                })
    if pc_data:
        await petty_cash_col.insert_many(pc_data)
    print(f"Created {len(pc_data)} petty cash entries")
    
    print("\n=== DEMO CREDENTIALS ===")
    print("Admin: admin@fnb.com / admin123 (All portals, all outlets)")
    print("Finance: finance@fnb.com / finance123 (Management portal)")
    print("Manager Sudirman: manager.sudirman@fnb.com / manager123 (Outlet portal, Sudirman only)")
    print("Manager Kemang: manager.kemang@fnb.com / manager123 (Outlet portal, Kemang only)")
    print("Inventory: inventory@fnb.com / inventory123 (Management portal)")
    print("========================\n")
    print("Seed complete!")
