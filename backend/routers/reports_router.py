"""
Reports Router — Journal-Driven Financial Reports (single source of truth).

All financial reports (P&L, Cashflow, Balance Sheet, Trial Balance) are computed from:
  - `journals` (status = 'posted')
  - `journal_lines` (double-entry postings)
joined with the Chart of Accounts (`coa_accounts`).

Inventory Valuation & Movements remain data-driven (they describe physical inventory, not financial posting).
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from database import (
    coa_accounts_col, journals_col, journal_lines_col,
    items_col, stock_on_hand_col, stock_movements_col, outlets_col,
)
from auth import get_current_user
from utils.audit import serialize_doc
from bson import ObjectId
from datetime import datetime, timezone
import io

router = APIRouter(prefix="/api/reports", tags=["reports"])


# ============================================================================
# Helpers
# ============================================================================

def _iso_today():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def _get_outlet_scope(current_user: dict, outlet_id: str = ""):
    """Return the outlet filter clause for `journals.outlet_id`."""
    if outlet_id:
        return {"outlet_id": outlet_id}
    if current_user.get("is_superadmin"):
        return {}
    # Non-superadmin → scoped to their outlet_access; also allow HQ (null/empty) journals
    scope = current_user.get("outlet_access", []) or []
    return {"$or": [{"outlet_id": {"$in": scope}}, {"outlet_id": None}, {"outlet_id": ""}]}


async def _query_posted_journals(current_user, outlet_id="", period_start="", period_end=""):
    q = {"status": "posted"}
    q.update(await _get_outlet_scope(current_user, outlet_id))
    if period_start:
        q.setdefault("posting_date", {})["$gte"] = period_start
    if period_end:
        q.setdefault("posting_date", {})["$lte"] = period_end
    return q


async def _collect_journal_ids(query):
    """Return list of journal_id strings matching the query."""
    ids = []
    async for j in journals_col.find(query, {"_id": 1}):
        ids.append(str(j["_id"]))
    return ids


async def _aggregate_lines_by_account(journal_ids):
    """
    Aggregate journal_lines grouped by account_id.
    Returns: dict { account_id: { 'debit': total, 'credit': total, 'count': n } }
    """
    if not journal_ids:
        return {}
    pipeline = [
        {"$match": {"journal_id": {"$in": journal_ids}}},
        {"$group": {
            "_id": "$account_id",
            "debit": {"$sum": "$debit"},
            "credit": {"$sum": "$credit"},
            "count": {"$sum": 1},
        }}
    ]
    result = {}
    async for row in journal_lines_col.aggregate(pipeline):
        result[row["_id"]] = {"debit": row["debit"] or 0, "credit": row["credit"] or 0, "count": row["count"]}
    return result


async def _load_coa_map():
    """Load all COA accounts into a dict by id for enrichment."""
    coa_by_id = {}
    async for a in coa_accounts_col.find({}):
        coa_by_id[str(a["_id"])] = {
            "id": str(a["_id"]),
            "code": a.get("code", ""),
            "name": a.get("name", ""),
            "account_type": a.get("account_type", ""),
            "normal_balance": a.get("normal_balance", "debit"),
            "parent_id": a.get("parent_id", ""),
        }
    return coa_by_id


def _account_balance(agg_row, normal_balance):
    """Compute balance according to normal balance."""
    d = agg_row.get("debit", 0)
    c = agg_row.get("credit", 0)
    if normal_balance == "credit":
        return c - d
    return d - c


# ============================================================================
# P&L
# ============================================================================

@router.get("/pnl")
async def pnl_report(
    current_user: dict = Depends(get_current_user),
    outlet_id: str = "",
    period_start: str = "",
    period_end: str = "",
):
    """
    Journal-driven Profit & Loss.

    Revenue = sum of credit-balance on 'revenue' type accounts  (minus 'contra' type accounts)
    COGS    = sum of debit-balance on 'cogs' type accounts
    Expense = sum of debit-balance on 'expense' type accounts
    Gross Profit = Revenue - COGS
    Net Profit   = Gross Profit - Expense
    """
    q = await _query_posted_journals(current_user, outlet_id, period_start, period_end)
    journal_ids = await _collect_journal_ids(q)
    agg = await _aggregate_lines_by_account(journal_ids)
    coa_map = await _load_coa_map()

    total_revenue = 0.0
    total_cogs = 0.0
    total_expense = 0.0
    revenue_details = []
    cogs_details = []
    expense_details = []
    contra_details = []

    for acc_id, row in agg.items():
        acc = coa_map.get(acc_id)
        if not acc:
            continue
        atype = acc.get("account_type")
        balance = _account_balance(row, acc.get("normal_balance", "debit"))
        entry = {
            "account_id": acc_id,
            "account_code": acc["code"],
            "account_name": acc["name"],
            "debit": round(row["debit"], 2),
            "credit": round(row["credit"], 2),
            "balance": round(balance, 2),
        }
        if atype == "revenue":
            total_revenue += balance
            revenue_details.append(entry)
        elif atype == "contra":
            # Contra revenue (e.g. discounts) reduces revenue
            total_revenue -= balance  # contra has debit normal, balance>0 reduces revenue
            contra_details.append(entry)
        elif atype == "cogs":
            total_cogs += balance
            cogs_details.append(entry)
        elif atype == "expense":
            total_expense += balance
            expense_details.append(entry)

    gross_profit = total_revenue - total_cogs
    net_profit = gross_profit - total_expense
    margin = (net_profit / total_revenue * 100) if total_revenue > 0 else 0

    # Revenue by outlet (re-scan journals grouped by outlet)
    revenue_by_outlet = {}
    async for j in journals_col.find(q):
        jid = str(j["_id"])
        oid = j.get("outlet_id") or "HQ"
        async for line in journal_lines_col.find({"journal_id": jid}):
            acc = coa_map.get(line.get("account_id"))
            if not acc:
                continue
            atype = acc.get("account_type")
            if atype == "revenue":
                revenue_by_outlet[oid] = revenue_by_outlet.get(oid, 0) + (line.get("credit", 0) - line.get("debit", 0))
            elif atype == "contra":
                revenue_by_outlet[oid] = revenue_by_outlet.get(oid, 0) - (line.get("debit", 0) - line.get("credit", 0))

    revenue_details_by_outlet = []
    for oid, rev in revenue_by_outlet.items():
        outlet_name = oid
        if oid and oid != "HQ":
            try:
                outlet = await outlets_col.find_one({"_id": ObjectId(oid)})
                if outlet:
                    outlet_name = outlet.get("name", oid)
            except Exception:
                pass
        revenue_details_by_outlet.append({
            "outlet_id": oid,
            "outlet_name": outlet_name,
            "revenue": round(rev, 2),
        })

    # Expense by top-level category (parent code)
    expense_categories = {}
    for e in expense_details:
        key = e["account_name"]
        expense_categories[key] = expense_categories.get(key, 0) + e["balance"]

    return {
        "data_source": "journals",
        "period_start": period_start,
        "period_end": period_end,
        "journal_count": len(journal_ids),
        "total_revenue": round(total_revenue, 2),
        "total_cogs": round(total_cogs, 2),
        "gross_profit": round(gross_profit, 2),
        "total_expenses": round(total_expense, 2),
        "net_profit": round(net_profit, 2),
        "margin_percentage": round(margin, 2),
        "revenue_breakdown": sorted(revenue_details, key=lambda x: -x["balance"]),
        "cogs_breakdown": sorted(cogs_details, key=lambda x: -x["balance"]),
        "expense_breakdown": sorted(expense_details, key=lambda x: -x["balance"]),
        "contra_revenue": contra_details,
        "revenue_by_outlet": sorted(revenue_details_by_outlet, key=lambda x: -x["revenue"]),
        "expense_categories": [{"category": k, "amount": round(v, 2)} for k, v in sorted(expense_categories.items(), key=lambda x: -x[1])],
    }


# ============================================================================
# Cashflow
# ============================================================================

# Accounts considered "cash-equivalent" for cashflow reporting.
CASH_ACCOUNT_CODES = ["1110", "1120", "1130"]  # Bank, Outlet Cash, Petty Cash


@router.get("/cashflow")
async def cashflow_report(
    current_user: dict = Depends(get_current_user),
    outlet_id: str = "",
    period_start: str = "",
    period_end: str = "",
):
    """
    Journal-driven Cashflow Statement.

    Inflow = debit to cash/bank accounts
    Outflow = credit to cash/bank accounts

    Grouped by posting_date + counterparty account type (operating / financing / investing).
    For MVP: operating = non-cash counterparty type not equity; financing = equity counterparty; investing = asset (long-term) counterparty.
    """
    q = await _query_posted_journals(current_user, outlet_id, period_start, period_end)
    journal_ids = await _collect_journal_ids(q)
    coa_map = await _load_coa_map()

    # Collect cash account IDs
    cash_account_ids = set()
    for acc_id, acc in coa_map.items():
        if acc.get("code") in CASH_ACCOUNT_CODES:
            cash_account_ids.add(acc_id)

    if not cash_account_ids or not journal_ids:
        return {
            "data_source": "journals",
            "period_start": period_start,
            "period_end": period_end,
            "journal_count": len(journal_ids),
            "total_inflow": 0,
            "total_outflow": 0,
            "net_cashflow": 0,
            "daily_cashflow": [],
            "by_category": {"operating": 0, "financing": 0, "investing": 0},
            "inflow_breakdown": [],
            "outflow_breakdown": [],
        }

    # Map journal_id -> posting_date for grouping
    journal_date_map = {}
    async for j in journals_col.find(q, {"_id": 1, "posting_date": 1}):
        journal_date_map[str(j["_id"])] = j.get("posting_date") or _iso_today()

    total_inflow = 0.0
    total_outflow = 0.0
    daily = {}  # date -> {inflow, outflow}
    by_category = {"operating": 0.0, "financing": 0.0, "investing": 0.0}
    inflow_by_counter = {}  # counterparty account id -> amount
    outflow_by_counter = {}

    # For each journal, find cash-account lines and pair them with counterparty lines for categorization
    for jid in journal_ids:
        cash_impact = 0.0  # positive = inflow, negative = outflow
        non_cash_lines = []
        async for line in journal_lines_col.find({"journal_id": jid}):
            acc_id = line.get("account_id")
            if acc_id in cash_account_ids:
                cash_impact += (line.get("debit", 0) - line.get("credit", 0))
            else:
                non_cash_lines.append({
                    "account_id": acc_id,
                    "debit": line.get("debit", 0),
                    "credit": line.get("credit", 0),
                })

        if cash_impact == 0:
            continue

        date = journal_date_map.get(jid, _iso_today())
        if date not in daily:
            daily[date] = {"inflow": 0, "outflow": 0}

        if cash_impact > 0:
            total_inflow += cash_impact
            daily[date]["inflow"] += cash_impact
        else:
            total_outflow += -cash_impact
            daily[date]["outflow"] += -cash_impact

        # Categorize by counterparty (first non-cash line is primary counterparty)
        # Operating = revenue / expense / cogs / liability(AP)
        # Financing = equity
        # Investing = long-term asset (for MVP, default to operating)
        category = "operating"
        for cp in non_cash_lines:
            acc = coa_map.get(cp["account_id"])
            if not acc:
                continue
            atype = acc.get("account_type")
            if atype == "equity":
                category = "financing"
                break
            # (Could detect 'investing' by specific codes in future)
        by_category[category] = by_category.get(category, 0) + cash_impact

        # Counterparty breakdown for display
        for cp in non_cash_lines:
            acc = coa_map.get(cp["account_id"])
            if not acc:
                continue
            amt = cp["credit"] - cp["debit"]  # counterparty's net (opposite sign of cash)
            if cash_impact > 0:  # cash inflow means counterparty's Credit side normal
                inflow_by_counter[acc["id"]] = inflow_by_counter.get(acc["id"], 0) + amt
            else:
                outflow_by_counter[acc["id"]] = outflow_by_counter.get(acc["id"], 0) + abs(cp["debit"] - cp["credit"])

    def _build_breakdown(counter_map):
        out = []
        for aid, amt in counter_map.items():
            acc = coa_map.get(aid)
            if not acc:
                continue
            out.append({
                "account_code": acc["code"],
                "account_name": acc["name"],
                "account_type": acc["account_type"],
                "amount": round(abs(amt), 2),
            })
        return sorted(out, key=lambda x: -x["amount"])

    cashflow_data = [
        {"date": k, "inflow": round(v["inflow"], 2), "outflow": round(v["outflow"], 2),
         "net": round(v["inflow"] - v["outflow"], 2)}
        for k, v in sorted(daily.items())
    ]

    return {
        "data_source": "journals",
        "period_start": period_start,
        "period_end": period_end,
        "journal_count": len(journal_ids),
        "total_inflow": round(total_inflow, 2),
        "total_outflow": round(total_outflow, 2),
        "net_cashflow": round(total_inflow - total_outflow, 2),
        "daily_cashflow": cashflow_data,
        "by_category": {k: round(v, 2) for k, v in by_category.items()},
        "inflow_breakdown": _build_breakdown(inflow_by_counter),
        "outflow_breakdown": _build_breakdown(outflow_by_counter),
    }


# ============================================================================
# Balance Sheet
# ============================================================================

@router.get("/balance-sheet")
async def balance_sheet(
    current_user: dict = Depends(get_current_user),
    as_of: str = "",
    outlet_id: str = "",
):
    """
    Journal-driven Balance Sheet as of a given date (default: today).

    Assets = sum of debit-balance on 'asset' type accounts
    Liabilities = sum of credit-balance on 'liability' type accounts
    Equity = sum of credit-balance on 'equity' type + (Revenue - COGS - Expense) i.e. Retained Earnings from P&L
    """
    period_end = as_of or _iso_today()
    q = await _query_posted_journals(current_user, outlet_id, "", period_end)
    journal_ids = await _collect_journal_ids(q)
    agg = await _aggregate_lines_by_account(journal_ids)
    coa_map = await _load_coa_map()

    assets = []
    liabilities = []
    equity = []

    total_assets = 0.0
    total_liabilities = 0.0
    total_equity_posted = 0.0
    total_revenue = 0.0
    total_cogs = 0.0
    total_expense = 0.0

    for acc_id, row in agg.items():
        acc = coa_map.get(acc_id)
        if not acc:
            continue
        atype = acc.get("account_type")
        balance = _account_balance(row, acc.get("normal_balance", "debit"))
        entry = {
            "account_id": acc_id,
            "account_code": acc["code"],
            "account_name": acc["name"],
            "balance": round(balance, 2),
        }
        if atype == "asset":
            assets.append(entry)
            total_assets += balance
        elif atype == "liability":
            liabilities.append(entry)
            total_liabilities += balance
        elif atype == "equity":
            equity.append(entry)
            total_equity_posted += balance
        elif atype == "revenue":
            total_revenue += balance
        elif atype == "contra":
            total_revenue -= balance
        elif atype == "cogs":
            total_cogs += balance
        elif atype == "expense":
            total_expense += balance

    retained_earnings_current = total_revenue - total_cogs - total_expense
    total_equity = total_equity_posted + retained_earnings_current
    balance_diff = total_assets - (total_liabilities + total_equity)

    # Sort by code for readability
    assets.sort(key=lambda x: x["account_code"])
    liabilities.sort(key=lambda x: x["account_code"])
    equity.sort(key=lambda x: x["account_code"])

    return {
        "data_source": "journals",
        "as_of": period_end,
        "journal_count": len(journal_ids),
        "assets": {
            "accounts": assets,
            "total": round(total_assets, 2),
        },
        "liabilities": {
            "accounts": liabilities,
            "total": round(total_liabilities, 2),
        },
        "equity": {
            "accounts": equity,
            "retained_earnings_current_period": round(retained_earnings_current, 2),
            "total": round(total_equity, 2),
        },
        "balance_check": {
            "assets": round(total_assets, 2),
            "liabilities_plus_equity": round(total_liabilities + total_equity, 2),
            "difference": round(balance_diff, 2),
            "is_balanced": abs(balance_diff) < 1.0,
        },
    }


# ============================================================================
# Trial Balance
# ============================================================================

@router.get("/trial-balance")
async def trial_balance(
    current_user: dict = Depends(get_current_user),
    outlet_id: str = "",
    period_start: str = "",
    period_end: str = "",
):
    """
    Trial Balance: list all accounts with totals of debit/credit and final balance.
    Use this to sanity-check the ledger.
    """
    q = await _query_posted_journals(current_user, outlet_id, period_start, period_end)
    journal_ids = await _collect_journal_ids(q)
    agg = await _aggregate_lines_by_account(journal_ids)
    coa_map = await _load_coa_map()

    rows = []
    total_debit = 0.0
    total_credit = 0.0
    for acc_id, row in agg.items():
        acc = coa_map.get(acc_id)
        if not acc:
            continue
        debit = row["debit"]
        credit = row["credit"]
        total_debit += debit
        total_credit += credit
        balance = _account_balance(row, acc.get("normal_balance", "debit"))
        rows.append({
            "account_id": acc_id,
            "account_code": acc["code"],
            "account_name": acc["name"],
            "account_type": acc.get("account_type", ""),
            "normal_balance": acc.get("normal_balance", ""),
            "debit": round(debit, 2),
            "credit": round(credit, 2),
            "balance": round(balance, 2),
        })
    rows.sort(key=lambda x: x["account_code"])

    return {
        "data_source": "journals",
        "period_start": period_start,
        "period_end": period_end,
        "journal_count": len(journal_ids),
        "rows": rows,
        "total_debit": round(total_debit, 2),
        "total_credit": round(total_credit, 2),
        "difference": round(total_debit - total_credit, 2),
        "is_balanced": abs(total_debit - total_credit) < 1.0,
    }


# ============================================================================
# General Ledger (per account)
# ============================================================================

@router.get("/general-ledger")
async def general_ledger(
    account_id: str,
    current_user: dict = Depends(get_current_user),
    outlet_id: str = "",
    period_start: str = "",
    period_end: str = "",
    skip: int = 0,
    limit: int = 100,
):
    """
    Returns all journal lines for a single COA account within period, newest first.
    """
    if not account_id:
        raise HTTPException(status_code=400, detail="account_id is required")
    q = await _query_posted_journals(current_user, outlet_id, period_start, period_end)
    journal_ids = await _collect_journal_ids(q)

    filt = {"journal_id": {"$in": journal_ids}, "account_id": account_id}
    total = await journal_lines_col.count_documents(filt)

    # Aggregate totals
    agg_pipeline = [
        {"$match": filt},
        {"$group": {"_id": None, "debit": {"$sum": "$debit"}, "credit": {"$sum": "$credit"}}}
    ]
    agg_res = {"debit": 0, "credit": 0}
    async for r in journal_lines_col.aggregate(agg_pipeline):
        agg_res = {"debit": r.get("debit", 0), "credit": r.get("credit", 0)}

    # Fetch account info
    acc = await coa_accounts_col.find_one({"_id": ObjectId(account_id)})
    acc_info = {
        "id": account_id,
        "code": acc.get("code", "") if acc else "",
        "name": acc.get("name", "") if acc else "",
        "account_type": acc.get("account_type", "") if acc else "",
        "normal_balance": acc.get("normal_balance", "debit") if acc else "debit",
    }

    # Load lines with their journal context
    lines = []
    # Sort by posting_date descending -> we need to join with journals to sort
    # For efficiency, pull lines + look up journals
    async for line in journal_lines_col.find(filt).skip(skip).limit(limit):
        ldoc = serialize_doc(line)
        jid = line.get("journal_id", "")
        if jid:
            try:
                j = await journals_col.find_one({"_id": ObjectId(jid)})
                if j:
                    ldoc["posting_date"] = j.get("posting_date", "")
                    ldoc["journal_number"] = j.get("journal_number", "")
                    ldoc["journal_description"] = j.get("description", "")
                    ldoc["source_type"] = j.get("source_type", "")
                    ldoc["outlet_id"] = j.get("outlet_id", "")
            except Exception:
                pass
        lines.append(ldoc)

    # Sort by posting_date desc in Python (after enrichment)
    lines.sort(key=lambda x: x.get("posting_date", ""), reverse=True)

    balance = agg_res["debit"] - agg_res["credit"]
    if acc_info["normal_balance"] == "credit":
        balance = agg_res["credit"] - agg_res["debit"]

    return {
        "data_source": "journals",
        "account": acc_info,
        "period_start": period_start,
        "period_end": period_end,
        "total_debit": round(agg_res["debit"], 2),
        "total_credit": round(agg_res["credit"], 2),
        "balance": round(balance, 2),
        "lines": lines,
        "total": total,
    }


# ============================================================================
# Inventory Reports (remain data-driven)
# ============================================================================

@router.get("/inventory-valuation")
async def inventory_valuation(current_user: dict = Depends(get_current_user), outlet_id: str = ""):
    query = {}
    if outlet_id:
        query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        query["outlet_id"] = {"$in": current_user.get("outlet_access", [])}

    items_data = []
    total_value = 0
    async for s in stock_on_hand_col.find(query):
        try:
            item = await items_col.find_one({"_id": ObjectId(s["item_id"])})
        except Exception:
            item = None
        if item:
            value = s.get("quantity", 0) * item.get("cost_per_unit", 0)
            total_value += value
            outlet = None
            if s.get("outlet_id"):
                try:
                    outlet = await outlets_col.find_one({"_id": ObjectId(s["outlet_id"])})
                except Exception:
                    outlet = None
            items_data.append({
                "item_id": s["item_id"],
                "item_name": item.get("name", ""),
                "category": item.get("category", ""),
                "uom": item.get("uom", ""),
                "quantity": s.get("quantity", 0),
                "cost_per_unit": item.get("cost_per_unit", 0),
                "value": value,
                "outlet_id": s.get("outlet_id", ""),
                "outlet_name": outlet.get("name", "") if outlet else "",
            })

    return {
        "items": sorted(items_data, key=lambda x: x["value"], reverse=True),
        "total_value": total_value,
    }


@router.get("/inventory-movements")
async def inventory_movements_report(
    current_user: dict = Depends(get_current_user),
    outlet_id: str = "",
    period_start: str = "",
    period_end: str = "",
):
    query = {}
    if outlet_id:
        query["outlet_id"] = outlet_id
    elif not current_user.get("is_superadmin"):
        query["outlet_id"] = {"$in": current_user.get("outlet_access", [])}
    if period_start:
        query.setdefault("date", {})["$gte"] = period_start
    if period_end:
        query.setdefault("date", {})["$lte"] = period_end

    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$type",
            "count": {"$sum": 1},
            "total_quantity": {"$sum": "$quantity"}
        }}
    ]
    movement_summary = []
    async for m in stock_movements_col.aggregate(pipeline):
        movement_summary.append({"type": m["_id"], "count": m["count"], "total_quantity": m["total_quantity"]})

    movements = []
    async for m in stock_movements_col.find(query).sort("created_at", -1).limit(100):
        doc = serialize_doc(m)
        try:
            item = await items_col.find_one({"_id": ObjectId(m["item_id"])})
            doc["item_name"] = item.get("name", "") if item else ""
        except Exception:
            doc["item_name"] = ""
        movements.append(doc)

    return {
        "summary": movement_summary,
        "movements": movements,
    }


# ============================================================================
# Export
# ============================================================================

@router.get("/export/{report_type}")
async def export_report(
    report_type: str,
    format: str = "excel",
    current_user: dict = Depends(get_current_user),
    outlet_id: str = "",
    period_start: str = "",
    period_end: str = "",
):
    """Export reports to Excel or PDF"""
    from utils.export import generate_excel, generate_pdf

    if report_type == "pnl":
        data = await pnl_report(current_user, outlet_id, period_start, period_end)
    elif report_type == "cashflow":
        data = await cashflow_report(current_user, outlet_id, period_start, period_end)
    elif report_type == "balance-sheet":
        data = await balance_sheet(current_user, period_end, outlet_id)
    elif report_type == "trial-balance":
        data = await trial_balance(current_user, outlet_id, period_start, period_end)
    elif report_type == "inventory-valuation":
        data = await inventory_valuation(current_user, outlet_id)
    elif report_type == "inventory-movements":
        data = await inventory_movements_report(current_user, outlet_id, period_start, period_end)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown report type: {report_type}")

    if format == "excel":
        buffer = generate_excel(report_type, data)
        return StreamingResponse(
            io.BytesIO(buffer),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={report_type}_report.xlsx"}
        )
    elif format == "pdf":
        buffer = generate_pdf(report_type, data)
        return StreamingResponse(
            io.BytesIO(buffer),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={report_type}_report.pdf"}
        )
