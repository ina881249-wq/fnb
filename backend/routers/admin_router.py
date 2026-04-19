"""
Admin utilities router — operational maintenance endpoints for super admins.

Currently contains:
- Journal backfill: generates posted journals for historical sales_summaries / petty_cash / cash_movements
  that don't yet have a corresponding journal. Idempotent (dedup by source_type + source_id).
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import (
    sales_summaries_col, petty_cash_col, cash_movements_col,
    journals_col,
)
from auth import get_current_user
from utils.posting_service import (
    post_sales_summary_journal,
    post_petty_cash_journal,
    post_cash_movement_journal,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


class BackfillRequest(BaseModel):
    date_from: Optional[str] = ""
    date_to: Optional[str] = ""
    outlet_id: Optional[str] = ""
    sources: Optional[list] = None  # ['sales_summary', 'petty_cash', 'cash_movement'] or None = all
    force: Optional[bool] = False   # if True, repost even if journal exists (not recommended)


@router.post("/journals/backfill")
async def backfill_journals(req: BackfillRequest, current_user: dict = Depends(get_current_user)):
    """
    Scan historical operational transactions and auto-post journals that are missing.
    Requires super admin.
    """
    if not current_user.get("is_superadmin"):
        raise HTTPException(status_code=403, detail="Super admin required")

    sources = req.sources or ["sales_summary", "petty_cash", "cash_movement"]
    report = {
        "sales_summary": {"processed": 0, "posted": 0, "skipped_already_posted": 0, "failed": 0},
        "petty_cash": {"processed": 0, "posted": 0, "skipped_already_posted": 0, "failed": 0},
        "cash_movement": {"processed": 0, "posted": 0, "skipped_already_posted": 0, "failed": 0},
    }

    def _date_query():
        q = {}
        if req.date_from:
            q.setdefault("date", {})["$gte"] = req.date_from
        if req.date_to:
            q.setdefault("date", {})["$lte"] = req.date_to
        if req.outlet_id:
            q["outlet_id"] = req.outlet_id
        return q

    user_id = current_user["id"]

    # ---- Sales Summaries
    if "sales_summary" in sources:
        async for s in sales_summaries_col.find(_date_query()):
            report["sales_summary"]["processed"] += 1
            source_id = str(s["_id"])
            existing = await journals_col.find_one({"source_type": "sales_summary", "source_id": source_id})
            if existing and not req.force:
                report["sales_summary"]["skipped_already_posted"] += 1
                continue
            res = await post_sales_summary_journal(s, user_id, force=req.force)
            if res:
                report["sales_summary"]["posted"] += 1
            else:
                report["sales_summary"]["failed"] += 1

    # ---- Petty Cash
    if "petty_cash" in sources:
        async for p in petty_cash_col.find(_date_query()):
            report["petty_cash"]["processed"] += 1
            source_id = str(p["_id"])
            existing = await journals_col.find_one({"source_type": "petty_cash", "source_id": source_id})
            if existing and not req.force:
                report["petty_cash"]["skipped_already_posted"] += 1
                continue
            res = await post_petty_cash_journal(p, user_id, force=req.force)
            if res:
                report["petty_cash"]["posted"] += 1
            else:
                report["petty_cash"]["failed"] += 1

    # ---- Cash Movements
    if "cash_movement" in sources:
        async for m in cash_movements_col.find(_date_query()):
            report["cash_movement"]["processed"] += 1
            source_id = str(m["_id"])
            existing = await journals_col.find_one({"source_type": "cash_movement", "source_id": source_id})
            if existing and not req.force:
                report["cash_movement"]["skipped_already_posted"] += 1
                continue
            res = await post_cash_movement_journal(m, user_id, force=req.force)
            if res:
                report["cash_movement"]["posted"] += 1
            else:
                report["cash_movement"]["failed"] += 1

    return {
        "ok": True,
        "message": "Backfill complete",
        "report": report,
        "parameters": {
            "date_from": req.date_from,
            "date_to": req.date_to,
            "outlet_id": req.outlet_id,
            "sources": sources,
            "force": req.force,
        }
    }


@router.get("/journals/coverage")
async def journal_coverage(current_user: dict = Depends(get_current_user)):
    """
    Report how many ops records have journals posted.
    Useful to detect gaps after backfill.
    """
    if not current_user.get("is_superadmin"):
        raise HTTPException(status_code=403, detail="Super admin required")

    total_ss = await sales_summaries_col.count_documents({})
    total_pc = await petty_cash_col.count_documents({})
    total_cm = await cash_movements_col.count_documents({})

    posted_ss = await journals_col.count_documents({"source_type": "sales_summary", "status": "posted"})
    posted_pc = await journals_col.count_documents({"source_type": "petty_cash", "status": "posted"})
    posted_cm = await journals_col.count_documents({"source_type": "cash_movement", "status": "posted"})
    posted_wh_receipt = await journals_col.count_documents({"source_type": "warehouse_receipt", "status": "posted"})
    posted_wh_adj = await journals_col.count_documents({"source_type": "warehouse_adjustment", "status": "posted"})
    posted_waste = await journals_col.count_documents({"source_type": "kitchen_waste", "status": "posted"})

    def _pct(posted, total):
        return round((posted / total * 100), 1) if total else 0.0

    return {
        "sales_summary": {"total_ops": total_ss, "posted_journals": posted_ss, "coverage_pct": _pct(posted_ss, total_ss)},
        "petty_cash": {"total_ops": total_pc, "posted_journals": posted_pc, "coverage_pct": _pct(posted_pc, total_pc)},
        "cash_movement": {"total_ops": total_cm, "posted_journals": posted_cm, "coverage_pct": _pct(posted_cm, total_cm)},
        "warehouse_receipt": {"posted_journals": posted_wh_receipt},
        "warehouse_adjustment": {"posted_journals": posted_wh_adj},
        "kitchen_waste": {"posted_journals": posted_waste},
        "total_journals_posted": await journals_col.count_documents({"status": "posted"}),
    }
