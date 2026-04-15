from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
from database import reconciliations_col, cash_movements_col, accounts_col, outlets_col
from auth import get_current_user, check_permission
from utils.audit import log_audit, serialize_doc
from utils.helpers import now_utc
from bson import ObjectId
import io
import csv

router = APIRouter(prefix="/api/bank-statement", tags=["bank_statement"])

@router.post("/upload")
async def upload_bank_statement(file: UploadFile = File(...), outlet_id: str = "", account_id: str = "", current_user: dict = Depends(get_current_user)):
    """
    Upload bank statement CSV. Expected columns: date, description, reference, debit, credit, balance
    Returns parsed rows and matching suggestions.
    """
    await check_permission(current_user, "finance.manage_accounts")
    
    content = await file.read()
    text = content.decode('utf-8', errors='ignore')
    reader = csv.DictReader(io.StringIO(text))
    
    rows = []
    for i, row in enumerate(reader):
        # Normalize column names
        normalized = {}
        for k, v in row.items():
            key = k.strip().lower().replace(' ', '_')
            normalized[key] = v.strip() if v else ''
        
        date = normalized.get('date', normalized.get('tanggal', ''))
        desc = normalized.get('description', normalized.get('keterangan', normalized.get('desc', '')))
        ref = normalized.get('reference', normalized.get('ref', normalized.get('no_ref', '')))
        debit = float(normalized.get('debit', '0').replace(',', '').replace('.', '') or '0') if normalized.get('debit') else 0
        credit = float(normalized.get('credit', '0').replace(',', '').replace('.', '') or '0') if normalized.get('credit') else 0
        balance = normalized.get('balance', normalized.get('saldo', ''))
        amount = credit - debit if credit > debit else -(debit - credit)
        
        rows.append({
            "line": i + 1,
            "date": date,
            "description": desc,
            "reference": ref,
            "debit": debit,
            "credit": credit,
            "amount": abs(amount),
            "type": "credit" if amount > 0 else "debit",
            "balance": balance,
            "match_status": "unmatched",
            "matched_movement_id": None,
            "matched_movement": None,
        })
    
    # Try to match with existing cash movements
    for row in rows:
        query = {}
        if outlet_id:
            query["outlet_id"] = outlet_id
        if row["date"]:
            query["date"] = row["date"]
        if row["amount"] > 0:
            query["amount"] = {"$gte": row["amount"] * 0.99, "$lte": row["amount"] * 1.01}
        
        if query:
            match = await cash_movements_col.find_one(query)
            if match:
                row["match_status"] = "suggested"
                row["matched_movement_id"] = str(match["_id"])
                row["matched_movement"] = {
                    "id": str(match["_id"]),
                    "type": match.get("type", ""),
                    "amount": match.get("amount", 0),
                    "reference": match.get("reference", ""),
                    "description": match.get("description", ""),
                    "date": match.get("date", ""),
                }
    
    matched = sum(1 for r in rows if r["match_status"] == "suggested")
    unmatched = len(rows) - matched
    
    return {
        "rows": rows,
        "total_rows": len(rows),
        "matched": matched,
        "unmatched": unmatched,
        "total_debit": sum(r["debit"] for r in rows),
        "total_credit": sum(r["credit"] for r in rows),
    }

class MatchConfirmRequest(BaseModel):
    matches: List[dict]  # [{statement_line, movement_id, status: 'matched'|'unmatched'|'manual'}]
    outlet_id: str
    account_id: str
    date: str

@router.post("/confirm-matches")
async def confirm_matches(req: MatchConfirmRequest, current_user: dict = Depends(get_current_user)):
    """Confirm matches from bank statement import and create reconciliation records"""
    await check_permission(current_user, "finance.manage_accounts")
    
    confirmed = 0
    for match in req.matches:
        if match.get("status") == "matched" and match.get("movement_id"):
            # Mark cash movement as reconciled
            await cash_movements_col.update_one(
                {"_id": ObjectId(match["movement_id"])},
                {"$set": {"reconciled": True, "reconciled_at": now_utc()}}
            )
            confirmed += 1
    
    # Create reconciliation summary
    total_matched = sum(1 for m in req.matches if m.get("status") == "matched")
    total_unmatched = sum(1 for m in req.matches if m.get("status") != "matched")
    
    recon_doc = {
        "outlet_id": req.outlet_id,
        "account_id": req.account_id,
        "date": req.date,
        "type": "bank",
        "source": "statement_import",
        "total_rows": len(req.matches),
        "matched_rows": total_matched,
        "unmatched_rows": total_unmatched,
        "expected_amount": sum(m.get("amount", 0) for m in req.matches if m.get("status") == "matched"),
        "actual_amount": sum(m.get("amount", 0) for m in req.matches if m.get("status") == "matched"),
        "difference": 0,
        "status": "matched" if total_unmatched == 0 else "variance",
        "variance_reason": f"{total_unmatched} unmatched items" if total_unmatched > 0 else "",
        "created_by": current_user["id"],
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    await reconciliations_col.insert_one(recon_doc)
    
    await log_audit(current_user["id"], "import", "finance", "bank_statement", details=f"Imported statement: {confirmed} matched, {total_unmatched} unmatched")
    return {"confirmed": confirmed, "unmatched": total_unmatched, "message": "Statement processed"}
