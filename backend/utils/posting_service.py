"""
Posting Service — Auto-post double-entry journals from operational transactions.

Accounting policy (F&B):
- Receipt/GRN                : Dr Raw Material Inventory (1210) / Cr Accounts Payable (2100)
- Prep Material Receipt      : Dr Prep Material Inventory (1220) / Cr Accounts Payable (2100)
- Waste / Spoilage           : Dr Waste & Spoilage (6800)         / Cr Inventory (1210/1220)
- Adjustment (loss/shrinkage): Dr Miscellaneous Expense (6900)    / Cr Inventory (1210/1220)
- Adjustment (gain/found)    : Dr Inventory (1210/1220)           / Cr Miscellaneous Expense (6900)

All auto-posted journals are in status 'posted' and carry source_type = warehouse / kitchen_waste / adjustment.
If a matching COA account is not found, the journal is skipped gracefully (logged to stderr, doesn't block operation).
"""
from datetime import datetime, timezone
from database import coa_accounts_col, items_col
from routers.journal_router import auto_post_journal


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
