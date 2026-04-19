"""
Posting Service — Auto-post double-entry journals from operational transactions.

Accounting policy (F&B):
- Receipt/GRN                : Dr Raw/Prep Material Inventory (1210/1220) / Cr Accounts Payable (2100)
- Waste / Spoilage           : Dr Waste & Spoilage (6800)                  / Cr Inventory (1210/1220)
- Adjustment (loss/shrinkage): Dr Miscellaneous Expense (6900)             / Cr Inventory (1210/1220)
- Adjustment (gain/found)    : Dr Inventory (1210/1220)                    / Cr Miscellaneous Expense (6900)
- Sales Summary (daily)      : Dr Outlet Cash (1120) for cash_sales
                               Dr Bank Accounts (1110) for card/online/other
                               Cr Food Sales (4100)
                               Cr Beverage Sales (4200)
                               Cr Service Charge (4300) [if service component exists]
- Petty Cash Expense         : Dr Expense (6100-6900, per category)        / Cr Petty Cash (1130)
- Cash Movement (settlement) : Dr Bank (1110)            / Cr Outlet Cash (1120)
- Cash Movement (cash_in)    : Dr Outlet Cash (1120)     / Cr Other Income or Retained Earnings
- Cash Movement (cash_out)   : Dr Miscellaneous Expense  / Cr Outlet Cash

All auto-posted journals are in status 'posted' and carry source_type indicating their origin.
If a matching COA account is not found, the journal is skipped gracefully (logged to stderr, doesn't block operation).
"""
from datetime import datetime, timezone
from database import coa_accounts_col, items_col, journals_col
from routers.journal_router import auto_post_journal


# Mapping petty cash category -> COA code (expense accounts)
PETTY_CASH_CATEGORY_MAP = {
    "operational": "6900",        # Miscellaneous Expense (catch-all operational)
    "cleaning": "6400",           # Cleaning & Supplies
    "supplies": "6400",           # Cleaning & Supplies
    "maintenance": "6500",        # Repair & Maintenance
    "repair": "6500",
    "transport": "6300",          # Transport & Delivery
    "delivery": "6300",
    "marketing": "6600",          # Marketing & Promotion
    "office": "6700",             # Office & Admin
    "admin": "6700",
    "wages": "6100",
    "salary": "6100",
    "rent": "6200",
    "utilities": "6200",
}


async def _already_posted(source_type: str, source_id: str) -> bool:
    """Idempotency helper — returns True if a journal for this source already exists."""
    if not source_id:
        return False
    existing = await journals_col.find_one({"source_type": source_type, "source_id": str(source_id)})
    return existing is not None


async def _get_coa(code: str):
    """Fetch COA account by code. Returns {id, code, name} or None."""
    acc = await coa_accounts_col.find_one({"code": code, "active": True})
    if not acc:
        return None
    return {
        "id": str(acc["_id"]),
        "code": acc.get("code", ""),
        "name": acc.get("name", ""),
    }


async def _item_inventory_account(item_id: str):
    """Return the COA code for the inventory sub-account based on item material_level."""
    try:
        from bson import ObjectId
        item = await items_col.find_one({"_id": ObjectId(item_id)})
        if item and item.get("material_level") in ("prep", "sub_prep"):
            return "1220"  # Prep Material Inventory
    except Exception:
        pass
    return "1210"  # Raw Material Inventory (default)


async def post_receipt_journal(receipt: dict, user_id: str):
    """
    Auto-post journal for a warehouse receipt:
      Dr Raw/Prep Material Inventory  (per line, grouped)
      Cr Accounts Payable (2100)  total
    """
    try:
        lines_by_acc = {}  # coa_code -> total
        # Group inventory debit by COA (raw vs prep)
        for ln in receipt.get("lines", []):
            qty = float(ln.get("quantity", 0))
            cost = float(ln.get("unit_cost", 0))
            total = qty * cost
            if total <= 0:
                continue
            acc_code = await _item_inventory_account(ln.get("item_id", ""))
            lines_by_acc[acc_code] = lines_by_acc.get(acc_code, 0.0) + total

        total_value = sum(lines_by_acc.values())
        if total_value <= 0:
            return None  # nothing to post

        ap_acc = await _get_coa("2100")  # Accounts Payable
        if not ap_acc:
            print("[posting] skip receipt: COA 2100 not found")
            return None

        journal_lines = []
        for code, amount in lines_by_acc.items():
            inv_acc = await _get_coa(code)
            if not inv_acc:
                continue
            journal_lines.append({
                "account_id": inv_acc["id"],
                "account_code": inv_acc["code"],
                "account_name": inv_acc["name"],
                "debit": round(amount, 2),
                "credit": 0,
                "description": f"Receipt {receipt.get('receipt_number', '')}",
            })
        if not journal_lines:
            return None
        # Credit AP (full total)
        journal_lines.append({
            "account_id": ap_acc["id"],
            "account_code": ap_acc["code"],
            "account_name": ap_acc["name"],
            "debit": 0,
            "credit": round(total_value, 2),
            "description": f"AP — Supplier: {receipt.get('supplier_name') or '-'}",
        })

        result = await auto_post_journal(
            source_type="warehouse_receipt",
            source_id=str(receipt.get("_id", receipt.get("id", ""))),
            description=f"GRN {receipt.get('receipt_number', '')} — {receipt.get('supplier_name', '-')}",
            outlet_id=receipt.get("outlet_id"),
            posting_date=receipt.get("date") or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            lines=journal_lines,
            user_id=user_id,
        )
        return result
    except Exception as e:
        print(f"[posting] post_receipt_journal failed: {e}")
        return None


async def post_waste_journal(waste: dict, user_id: str):
    """
    Auto-post journal for a kitchen waste log:
      Dr Waste & Spoilage (6800)
      Cr Inventory (1210 or 1220)
    """
    try:
        cost_impact = float(waste.get("cost_impact", 0))
        if cost_impact <= 0:
            return None

        waste_acc = await _get_coa("6800")
        if not waste_acc:
            print("[posting] skip waste: COA 6800 not found")
            return None

        inv_code = await _item_inventory_account(waste.get("item_id", ""))
        inv_acc = await _get_coa(inv_code)
        if not inv_acc:
            return None

        item_name = waste.get("item_name") or "-"
        reason = waste.get("reason") or "-"

        journal_lines = [
            {
                "account_id": waste_acc["id"], "account_code": waste_acc["code"], "account_name": waste_acc["name"],
                "debit": round(cost_impact, 2), "credit": 0,
                "description": f"Waste: {item_name} ({reason})",
            },
            {
                "account_id": inv_acc["id"], "account_code": inv_acc["code"], "account_name": inv_acc["name"],
                "debit": 0, "credit": round(cost_impact, 2),
                "description": f"Reduce inventory — {item_name}",
            },
        ]

        result = await auto_post_journal(
            source_type="kitchen_waste",
            source_id=str(waste.get("_id", waste.get("id", ""))),
            description=f"Waste log — {item_name} ({reason})",
            outlet_id=waste.get("outlet_id"),
            posting_date=waste.get("date") or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            lines=journal_lines,
            user_id=user_id,
        )
        return result
    except Exception as e:
        print(f"[posting] post_waste_journal failed: {e}")
        return None


async def post_adjustment_journal(adjustment: dict, user_id: str):
    """
    Auto-post journal for a warehouse adjustment.
    For each line with non-zero delta * unit_cost:
      - delta > 0 (gain)  : Dr Inventory / Cr Misc Expense (6900)
      - delta < 0 (loss)  : Dr Misc Expense (6900) / Cr Inventory
    Aggregated per inventory account.
    """
    try:
        from bson import ObjectId

        misc_acc = await _get_coa("6900")
        if not misc_acc:
            print("[posting] skip adjustment: COA 6900 not found")
            return None

        # Aggregate impact per inventory code
        impact = {"1210": 0.0, "1220": 0.0}  # positive = gain (Dr inv), negative = loss (Cr inv)
        for ln in adjustment.get("lines", []):
            delta = float(ln.get("delta", 0))
            if delta == 0:
                continue
            # Fetch item's unit cost
            unit_cost = 0.0
            try:
                it = await items_col.find_one({"_id": ObjectId(ln.get("item_id", ""))})
                if it:
                    unit_cost = float(it.get("cost_per_unit", 0))
            except Exception:
                pass
            amount = delta * unit_cost
            if amount == 0:
                continue
            inv_code = await _item_inventory_account(ln.get("item_id", ""))
            impact[inv_code] = impact.get(inv_code, 0.0) + amount

        total_amount = sum(abs(v) for v in impact.values())
        if total_amount == 0:
            return None

        journal_lines = []
        misc_debit = 0.0
        misc_credit = 0.0
        for code, amount in impact.items():
            if amount == 0:
                continue
            inv_acc = await _get_coa(code)
            if not inv_acc:
                continue
            if amount > 0:
                # gain — debit inventory
                journal_lines.append({
                    "account_id": inv_acc["id"], "account_code": inv_acc["code"], "account_name": inv_acc["name"],
                    "debit": round(amount, 2), "credit": 0,
                    "description": f"Adjustment gain — {adjustment.get('adjustment_number', '')}",
                })
                misc_credit += amount
            else:
                # loss — credit inventory
                journal_lines.append({
                    "account_id": inv_acc["id"], "account_code": inv_acc["code"], "account_name": inv_acc["name"],
                    "debit": 0, "credit": round(-amount, 2),
                    "description": f"Adjustment loss — {adjustment.get('adjustment_number', '')}",
                })
                misc_debit += -amount

        if misc_debit > 0:
            journal_lines.append({
                "account_id": misc_acc["id"], "account_code": misc_acc["code"], "account_name": misc_acc["name"],
                "debit": round(misc_debit, 2), "credit": 0,
                "description": f"Adjustment expense — {adjustment.get('reason', '')}",
            })
        if misc_credit > 0:
            journal_lines.append({
                "account_id": misc_acc["id"], "account_code": misc_acc["code"], "account_name": misc_acc["name"],
                "debit": 0, "credit": round(misc_credit, 2),
                "description": f"Adjustment gain offset — {adjustment.get('reason', '')}",
            })

        if not journal_lines:
            return None

        result = await auto_post_journal(
            source_type="warehouse_adjustment",
            source_id=str(adjustment.get("_id", adjustment.get("id", ""))),
            description=f"Adjustment {adjustment.get('adjustment_number', '')} — {adjustment.get('reason', '')}",
            outlet_id=adjustment.get("outlet_id"),
            posting_date=adjustment.get("date") or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            lines=journal_lines,
            user_id=user_id,
        )
        return result
    except Exception as e:
        print(f"[posting] post_adjustment_journal failed: {e}")
        return None


async def post_sales_summary_journal(summary: dict, user_id: str, force: bool = False):
    """
    Auto-post journal for a sales summary (daily or shift-close):
      Dr Outlet Cash (1120)    for cash_sales
      Dr Bank Accounts (1110)  for card_sales + online_sales + other_sales
      Cr Food Sales (4100)     for food_sales portion
      Cr Beverage Sales (4200) for beverage_sales portion
      Cr Service Charge (4300) for service charge portion (if tracked)

    Revenue split policy: if food_sales + beverage_sales is provided and non-zero, use those directly.
    Otherwise, split total_sales 70/30 (food/beverage) as a best-effort fallback.
    Idempotent via (source_type=sales_summary, source_id).
    """
    try:
        source_id = str(summary.get("_id", summary.get("id", "")))
        if not force and await _already_posted("sales_summary", source_id):
            return None

        total_sales = float(summary.get("total_sales", 0))
        if total_sales <= 0:
            return None

        cash_sales = float(summary.get("cash_sales", 0))
        card_sales = float(summary.get("card_sales", 0))
        online_sales = float(summary.get("online_sales", 0))
        other_sales = float(summary.get("other_sales", 0))
        food_sales = float(summary.get("food_sales", 0))
        beverage_sales = float(summary.get("beverage_sales", 0))
        service_charge = float(summary.get("service_charge", 0))

        # If no revenue split provided, default 70/30 split
        revenue_known = food_sales + beverage_sales + service_charge
        if revenue_known <= 0:
            food_sales = round(total_sales * 0.7, 2)
            beverage_sales = round(total_sales - food_sales, 2)
            service_charge = 0.0
            revenue_known = food_sales + beverage_sales

        # Ensure credits equal debits (payment channels total)
        payment_total = cash_sales + card_sales + online_sales + other_sales
        # Align debits (payment) vs credits (revenue) if slight mismatch
        if payment_total <= 0:
            payment_total = total_sales
            cash_sales = total_sales  # assume all cash fallback

        # Scale revenue components so their sum matches payment_total exactly
        if abs(revenue_known - payment_total) > 0.01 and revenue_known > 0:
            scale = payment_total / revenue_known
            food_sales = round(food_sales * scale, 2)
            beverage_sales = round(beverage_sales * scale, 2)
            if service_charge > 0:
                service_charge = round(payment_total - food_sales - beverage_sales, 2)
            else:
                beverage_sales = round(payment_total - food_sales, 2)

        # Resolve COA
        cash_acc = await _get_coa("1120")
        bank_acc = await _get_coa("1110")
        food_rev = await _get_coa("4100")
        bev_rev = await _get_coa("4200")
        svc_rev = await _get_coa("4300") if service_charge > 0 else None

        if not cash_acc or not bank_acc or not food_rev or not bev_rev:
            print("[posting] skip sales_summary: required COA not found (1110/1120/4100/4200)")
            return None

        journal_lines = []
        # Debit side — payment channels
        if cash_sales > 0:
            journal_lines.append({
                "account_id": cash_acc["id"], "account_code": cash_acc["code"], "account_name": cash_acc["name"],
                "debit": round(cash_sales, 2), "credit": 0,
                "description": "Cash sales",
            })
        bank_debit = card_sales + online_sales + other_sales
        if bank_debit > 0:
            journal_lines.append({
                "account_id": bank_acc["id"], "account_code": bank_acc["code"], "account_name": bank_acc["name"],
                "debit": round(bank_debit, 2), "credit": 0,
                "description": f"Non-cash sales (card {card_sales:.0f} / online {online_sales:.0f} / other {other_sales:.0f})",
            })

        # Credit side — revenue
        if food_sales > 0:
            journal_lines.append({
                "account_id": food_rev["id"], "account_code": food_rev["code"], "account_name": food_rev["name"],
                "debit": 0, "credit": round(food_sales, 2),
                "description": "Food sales revenue",
            })
        if beverage_sales > 0:
            journal_lines.append({
                "account_id": bev_rev["id"], "account_code": bev_rev["code"], "account_name": bev_rev["name"],
                "debit": 0, "credit": round(beverage_sales, 2),
                "description": "Beverage sales revenue",
            })
        if service_charge > 0 and svc_rev:
            journal_lines.append({
                "account_id": svc_rev["id"], "account_code": svc_rev["code"], "account_name": svc_rev["name"],
                "debit": 0, "credit": round(service_charge, 2),
                "description": "Service charge",
            })

        if len(journal_lines) < 2:
            return None

        result = await auto_post_journal(
            source_type="sales_summary",
            source_id=source_id,
            description=f"Daily sales — {summary.get('date', '')} ({summary.get('source', 'outlet')})",
            outlet_id=summary.get("outlet_id"),
            posting_date=summary.get("date") or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            lines=journal_lines,
            user_id=user_id,
        )
        return result
    except Exception as e:
        print(f"[posting] post_sales_summary_journal failed: {e}")
        return None


async def post_petty_cash_journal(entry: dict, user_id: str, force: bool = False):
    """
    Auto-post journal for a petty cash expense:
      Dr Expense (mapped by category)  / Cr Petty Cash (1130)
    Idempotent via (source_type=petty_cash, source_id).
    """
    try:
        source_id = str(entry.get("_id", entry.get("id", "")))
        if not force and await _already_posted("petty_cash", source_id):
            return None

        amount = float(entry.get("amount", 0))
        if amount <= 0:
            return None

        category = (entry.get("category") or "operational").lower().strip()
        exp_code = PETTY_CASH_CATEGORY_MAP.get(category, "6900")

        petty_acc = await _get_coa("1130")
        exp_acc = await _get_coa(exp_code)
        if not petty_acc or not exp_acc:
            # Fallback: try 6900 Miscellaneous if category mapping fails
            exp_acc = exp_acc or await _get_coa("6900")
            if not petty_acc or not exp_acc:
                print(f"[posting] skip petty_cash: COA not found (1130 or {exp_code})")
                return None

        journal_lines = [
            {
                "account_id": exp_acc["id"], "account_code": exp_acc["code"], "account_name": exp_acc["name"],
                "debit": round(amount, 2), "credit": 0,
                "description": entry.get("description") or f"Petty cash — {category}",
            },
            {
                "account_id": petty_acc["id"], "account_code": petty_acc["code"], "account_name": petty_acc["name"],
                "debit": 0, "credit": round(amount, 2),
                "description": f"Reduce petty cash — {entry.get('receipt_ref') or '-'}",
            },
        ]

        result = await auto_post_journal(
            source_type="petty_cash",
            source_id=source_id,
            description=f"Petty cash — {entry.get('description', category)}",
            outlet_id=entry.get("outlet_id"),
            posting_date=entry.get("date") or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            lines=journal_lines,
            user_id=user_id,
        )
        return result
    except Exception as e:
        print(f"[posting] post_petty_cash_journal failed: {e}")
        return None


async def post_cash_movement_journal(movement: dict, user_id: str, force: bool = False):
    """
    Auto-post journal for a cash movement.
    Types:
      - 'settlement' (outlet cash → bank deposit): Dr Bank (1110) / Cr Outlet Cash (1120)
      - 'cash_in'   (outlet receives cash from other source): Dr Outlet Cash (1120) / Cr Retained Earnings (3100)
      - 'cash_out'  (outlet pays cash for misc): Dr Miscellaneous Expense (6900) / Cr Outlet Cash (1120)
    """
    try:
        source_id = str(movement.get("_id", movement.get("id", "")))
        if not force and await _already_posted("cash_movement", source_id):
            return None

        amount = float(movement.get("amount", 0))
        if amount <= 0:
            return None

        mtype = (movement.get("type") or "").lower()

        bank_acc = await _get_coa("1110")
        cash_acc = await _get_coa("1120")
        re_acc = await _get_coa("3100")
        misc_acc = await _get_coa("6900")

        journal_lines = []
        desc = movement.get("description") or movement.get("reference") or "Cash movement"

        if mtype == "settlement":
            if not bank_acc or not cash_acc:
                return None
            journal_lines = [
                {
                    "account_id": bank_acc["id"], "account_code": bank_acc["code"], "account_name": bank_acc["name"],
                    "debit": round(amount, 2), "credit": 0, "description": f"Deposit to bank — {desc}",
                },
                {
                    "account_id": cash_acc["id"], "account_code": cash_acc["code"], "account_name": cash_acc["name"],
                    "debit": 0, "credit": round(amount, 2), "description": f"Outlet cash settled — {desc}",
                },
            ]
        elif mtype == "cash_in":
            if not cash_acc or not re_acc:
                return None
            journal_lines = [
                {
                    "account_id": cash_acc["id"], "account_code": cash_acc["code"], "account_name": cash_acc["name"],
                    "debit": round(amount, 2), "credit": 0, "description": f"Cash in — {desc}",
                },
                {
                    "account_id": re_acc["id"], "account_code": re_acc["code"], "account_name": re_acc["name"],
                    "debit": 0, "credit": round(amount, 2), "description": f"Funding — {desc}",
                },
            ]
        elif mtype in ("cash_out", "withdrawal", "payout"):
            if not cash_acc or not misc_acc:
                return None
            journal_lines = [
                {
                    "account_id": misc_acc["id"], "account_code": misc_acc["code"], "account_name": misc_acc["name"],
                    "debit": round(amount, 2), "credit": 0, "description": f"Cash out — {desc}",
                },
                {
                    "account_id": cash_acc["id"], "account_code": cash_acc["code"], "account_name": cash_acc["name"],
                    "debit": 0, "credit": round(amount, 2), "description": f"Reduce outlet cash — {desc}",
                },
            ]
        else:
            # Unknown type — skip
            return None

        result = await auto_post_journal(
            source_type="cash_movement",
            source_id=source_id,
            description=f"Cash movement ({mtype}) — {desc}",
            outlet_id=movement.get("outlet_id"),
            posting_date=movement.get("date") or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            lines=journal_lines,
            user_id=user_id,
        )
        return result
    except Exception as e:
        print(f"[posting] post_cash_movement_journal failed: {e}")
        return None

