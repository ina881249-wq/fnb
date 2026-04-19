"""
AI Executive Router
Provides AI-powered insights, chat Q&A, forecasting, and anomaly detection
using Emergent LLM integration.
"""
import os
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from bson import ObjectId

from database import (
    outlets_col, sales_summaries_col, cash_movements_col, petty_cash_col,
    cashier_shifts_col, pos_orders_col, waste_logs_col, alerts_col,
    reconciliations_col, ai_conversations_col, ai_insights_cache_col,
    stock_movements_col,
)
from auth import get_current_user
from utils.audit import serialize_doc
from utils.helpers import now_utc

from emergentintegrations.llm.chat import LlmChat, UserMessage

router = APIRouter(prefix="/api/ai", tags=["ai-executive"])

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
DEFAULT_MODEL = ("anthropic", "claude-sonnet-4-5-20250929")  # reliable & fast

SYSTEM_PROMPT_BASE = """You are an expert F&B (food & beverage) financial analyst assistant for an Indonesian multi-outlet restaurant ERP system.
You analyze data for executives and directors and provide concise, actionable insights in Bahasa Indonesia (or English if asked).

Style:
- Write in clear, executive-ready prose
- Use concrete numbers, percentages, and dates
- Highlight key wins and risks
- Suggest actions when appropriate
- Use bullets for lists, bold for important metrics
- Format currency as Rp 1.000.000 (Indonesian style) — always use thousand separators
- Keep responses focused and scannable, avoid fluff
- Use <br/> tags only when needed; prefer markdown
"""


# ============ HELPERS ============

def _check_executive_access(user: dict):
    """Only users with executive or admin access can use AI endpoints."""
    if user.get("is_superadmin"):
        return
    portal_access = user.get("portal_access", []) or []
    if "executive" in portal_access or "management" in portal_access:
        return
    raise HTTPException(status_code=403, detail="AI features require executive or management portal access")


async def _gather_business_context(days: int = 30, outlet_id: Optional[str] = None) -> dict:
    """Gather recent business data as structured context for the LLM."""
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)
    since_str = since.strftime("%Y-%m-%d")
    today_str = now.strftime("%Y-%m-%d")

    # Outlets
    outlet_filter = {}
    if outlet_id:
        outlet_filter = {"_id": ObjectId(outlet_id)}
    outlets = []
    async for o in outlets_col.find(outlet_filter):
        outlets.append({"id": str(o["_id"]), "name": o.get("name"), "city": o.get("city")})
    outlet_ids = [o["id"] for o in outlets]

    # Sales summaries per outlet
    sales_by_outlet = {}
    total_sales = 0.0
    total_cash = 0.0
    total_card = 0.0
    total_online = 0.0
    q = {"date": {"$gte": since_str, "$lte": today_str}}
    if outlet_id:
        q["outlet_id"] = outlet_id
    elif outlet_ids:
        q["outlet_id"] = {"$in": outlet_ids}
    async for s in sales_summaries_col.find(q):
        oid = s.get("outlet_id")
        if oid not in sales_by_outlet:
            sales_by_outlet[oid] = {"total": 0.0, "cash": 0.0, "card": 0.0, "online": 0.0, "days": 0}
        sales_by_outlet[oid]["total"] += float(s.get("total_sales", 0) or 0)
        sales_by_outlet[oid]["cash"] += float(s.get("cash_sales", 0) or 0)
        sales_by_outlet[oid]["card"] += float(s.get("card_sales", 0) or 0)
        sales_by_outlet[oid]["online"] += float(s.get("online_sales", 0) or 0)
        sales_by_outlet[oid]["days"] += 1
        total_sales += float(s.get("total_sales", 0) or 0)
        total_cash += float(s.get("cash_sales", 0) or 0)
        total_card += float(s.get("card_sales", 0) or 0)
        total_online += float(s.get("online_sales", 0) or 0)

    # Daily revenue time-series (last 14 days)
    timeseries = {}
    ts_start = (now - timedelta(days=14)).strftime("%Y-%m-%d")
    tsq = {"date": {"$gte": ts_start, "$lte": today_str}}
    if outlet_id:
        tsq["outlet_id"] = outlet_id
    elif outlet_ids:
        tsq["outlet_id"] = {"$in": outlet_ids}
    async for s in sales_summaries_col.find(tsq):
        d = s.get("date")
        timeseries[d] = timeseries.get(d, 0) + float(s.get("total_sales", 0) or 0)
    daily_series = [{"date": d, "revenue": v} for d, v in sorted(timeseries.items())]

    # Petty cash totals
    petty_total = 0.0
    petty_count = 0
    pq = {"date": {"$gte": since_str}}
    if outlet_id:
        pq["outlet_id"] = outlet_id
    elif outlet_ids:
        pq["outlet_id"] = {"$in": outlet_ids}
    async for p in petty_cash_col.find(pq):
        petty_total += float(p.get("amount", 0) or 0)
        petty_count += 1

    # Waste
    waste_total = 0.0
    waste_count = 0
    wq = {"date": {"$gte": since_str}}
    if outlet_id:
        wq["outlet_id"] = outlet_id
    elif outlet_ids:
        wq["outlet_id"] = {"$in": outlet_ids}
    async for w in waste_logs_col.find(wq):
        waste_total += float(w.get("cost", 0) or 0)
        waste_count += 1

    # Shift variances
    variance_total = 0.0
    variance_shifts = 0
    max_neg_variance = 0.0
    sq = {"status": "closed", "closed_at": {"$gte": since}}
    if outlet_id:
        sq["outlet_id"] = outlet_id
    elif outlet_ids:
        sq["outlet_id"] = {"$in": outlet_ids}
    async for s in cashier_shifts_col.find(sq):
        v = float(s.get("variance", 0) or 0)
        variance_total += v
        variance_shifts += 1
        if v < max_neg_variance:
            max_neg_variance = v

    # Active alerts
    active_alerts = 0
    alert_types: dict = {}
    aq = {"status": "active"}
    if outlet_id:
        aq["outlet_id"] = outlet_id
    async for a in alerts_col.find(aq):
        active_alerts += 1
        t = a.get("type", "other")
        alert_types[t] = alert_types.get(t, 0) + 1

    # Top items today (across outlets)
    top_items: dict = {}
    today_start = datetime.fromisoformat(today_str).replace(tzinfo=timezone.utc)
    today_end = today_start + timedelta(days=1)
    poq = {"payment_status": "paid", "created_at": {"$gte": today_start, "$lt": today_end}}
    if outlet_id:
        poq["outlet_id"] = outlet_id
    async for o in pos_orders_col.find(poq):
        for ln in o.get("lines", []):
            nm = ln.get("name", "?")
            if nm not in top_items:
                top_items[nm] = {"qty": 0, "revenue": 0.0}
            top_items[nm]["qty"] += int(ln.get("qty", 0))
            top_items[nm]["revenue"] += float(ln.get("qty", 0)) * float(ln.get("price", 0))
    top_items_list = sorted(
        [{"name": k, **v} for k, v in top_items.items()],
        key=lambda x: x["revenue"], reverse=True
    )[:10]

    # Enrich outlets with name lookup
    outlet_name_map = {o["id"]: o["name"] for o in outlets}
    sales_per_outlet_list = []
    for oid, d in sales_by_outlet.items():
        sales_per_outlet_list.append({
            "outlet_id": oid,
            "outlet_name": outlet_name_map.get(oid, "Unknown"),
            "total_sales": round(d["total"], 0),
            "cash_sales": round(d["cash"], 0),
            "card_sales": round(d["card"], 0),
            "online_sales": round(d["online"], 0),
            "days_with_data": d["days"],
            "avg_daily": round(d["total"] / d["days"], 0) if d["days"] else 0,
        })
    sales_per_outlet_list.sort(key=lambda x: x["total_sales"], reverse=True)

    return {
        "period": {"days": days, "from": since_str, "to": today_str},
        "outlet_scope": outlet_id or "all_outlets",
        "outlets_count": len(outlets),
        "revenue": {
            "total": round(total_sales, 0),
            "cash": round(total_cash, 0),
            "card": round(total_card, 0),
            "online": round(total_online, 0),
            "average_daily": round(total_sales / max(1, days), 0),
        },
        "sales_per_outlet": sales_per_outlet_list,
        "daily_revenue_last_14d": daily_series,
        "expenses": {
            "petty_cash_total": round(petty_total, 0),
            "petty_cash_count": petty_count,
            "waste_cost_total": round(waste_total, 0),
            "waste_count": waste_count,
        },
        "cashier_variance": {
            "total_variance": round(variance_total, 0),
            "closed_shifts": variance_shifts,
            "max_negative_shortage": round(max_neg_variance, 0),
        },
        "alerts": {"active_total": active_alerts, "by_type": alert_types},
        "today_top_items": top_items_list,
    }


def _make_chat(session_id: str, system_message: str) -> LlmChat:
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_message,
    ).with_model(*DEFAULT_MODEL)
    return chat


# ============ 1. INSIGHTS (Auto-narrative) ============

class InsightRequest(BaseModel):
    outlet_id: Optional[str] = None
    period_days: int = 7
    force_refresh: bool = False


@router.post("/insights")
async def generate_insights(req: InsightRequest, current_user: dict = Depends(get_current_user)):
    _check_executive_access(current_user)

    # Cache key
    scope = req.outlet_id or "all"
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cache_key = f"insights:{scope}:{req.period_days}d:{today_str}"

    if not req.force_refresh:
        cached = await ai_insights_cache_col.find_one({"cache_key": cache_key})
        if cached:
            return {"narrative": cached["narrative"], "context": cached.get("context", {}), "cached": True, "generated_at": cached["generated_at"]}

    # Gather data
    ctx = await _gather_business_context(days=req.period_days, outlet_id=req.outlet_id)
    ctx_json = json.dumps(ctx, default=str, indent=2)

    system = SYSTEM_PROMPT_BASE + """
Generate an EXECUTIVE DAILY/WEEKLY BRIEFING (in Bahasa Indonesia) with these sections:

## 🎯 Ringkasan Utama
[3-4 kalimat highlight — total revenue, growth trend, top outlet]

## 📈 Performa Outlet
[ranking outlet + % vs average, highlight top & underperformer]

## ⚠️ Perhatian Khusus
[variance kas, waste tinggi, alerts aktif — jika ada]

## 💡 Rekomendasi Tindakan
[2-4 aksi konkret berdasarkan data]

Gunakan bold untuk angka penting. Jangan menambahkan pengantar atau penutup di luar section tersebut.
"""
    chat = _make_chat(f"insights-{uuid.uuid4()}", system)
    prompt = f"""Analisa data bisnis F&B berikut dan hasilkan briefing eksekutif:

```json
{ctx_json}
```

Periode: {ctx['period']['from']} sampai {ctx['period']['to']} ({req.period_days} hari).
Outlet: {'1 outlet' if req.outlet_id else f"{ctx['outlets_count']} outlet"}.
"""
    try:
        narrative = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

    # Cache
    await ai_insights_cache_col.update_one(
        {"cache_key": cache_key},
        {"$set": {
            "cache_key": cache_key,
            "narrative": narrative,
            "context": ctx,
            "generated_at": now_utc(),
            "outlet_id": req.outlet_id,
            "period_days": req.period_days,
        }},
        upsert=True,
    )

    return {"narrative": narrative, "context": ctx, "cached": False, "generated_at": now_utc()}


# ============ 2. CHAT Q&A ============

class ChatRequest(BaseModel):
    session_id: Optional[str] = None  # if None, new session
    message: str
    outlet_id: Optional[str] = None


@router.post("/chat")
async def ai_chat(req: ChatRequest, current_user: dict = Depends(get_current_user)):
    _check_executive_access(current_user)
    session_id = req.session_id or f"chat-{current_user['id']}-{uuid.uuid4()}"

    # Build context: data + history
    ctx = await _gather_business_context(days=30, outlet_id=req.outlet_id)

    # Fetch conversation history (last 10 msgs)
    history_doc = await ai_conversations_col.find_one({"session_id": session_id})
    history = history_doc.get("messages", []) if history_doc else []
    recent = history[-10:]

    system = SYSTEM_PROMPT_BASE + f"""
You are answering questions from executives/managers about their F&B business data.
You have access to the following business context (summary, 30 days):

```json
{json.dumps(ctx, default=str)}
```

Rules:
- Jawab dalam Bahasa Indonesia kecuali user bertanya dalam English
- Jika data yang ditanyakan tidak tersedia dalam context, katakan dengan jujur
- Berikan angka spesifik dan outlet name ketika mungkin
- Singkat dan actionable (max 6 kalimat untuk jawaban biasa)
- Gunakan markdown bold untuk angka penting
"""
    chat = _make_chat(session_id, system)

    # Replay last few messages for context
    for h in recent:
        if h["role"] == "user":
            try:
                await chat.send_message(UserMessage(text=h["text"]))
            except Exception:
                pass
        # assistant messages are handled internally by the library

    try:
        response = await chat.send_message(UserMessage(text=req.message))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")

    # Save to history
    new_messages = history + [
        {"role": "user", "text": req.message, "timestamp": now_utc()},
        {"role": "assistant", "text": response, "timestamp": now_utc()},
    ]
    await ai_conversations_col.update_one(
        {"session_id": session_id},
        {"$set": {
            "session_id": session_id,
            "user_id": current_user["id"],
            "messages": new_messages[-50:],  # keep last 50
            "outlet_id": req.outlet_id,
            "updated_at": now_utc(),
        }, "$setOnInsert": {"created_at": now_utc()}},
        upsert=True,
    )

    return {"session_id": session_id, "response": response, "message_count": len(new_messages)}


@router.get("/chat/sessions")
async def list_chat_sessions(current_user: dict = Depends(get_current_user), limit: int = 10):
    _check_executive_access(current_user)
    items = []
    async for s in ai_conversations_col.find({"user_id": current_user["id"]}).sort("updated_at", -1).limit(limit):
        items.append({
            "session_id": s["session_id"],
            "preview": (s.get("messages") or [{}])[0].get("text", "")[:80] if s.get("messages") else "",
            "message_count": len(s.get("messages", [])),
            "updated_at": s.get("updated_at"),
            "outlet_id": s.get("outlet_id"),
        })
    return {"sessions": items}


@router.get("/chat/sessions/{session_id}")
async def get_chat_session(session_id: str, current_user: dict = Depends(get_current_user)):
    _check_executive_access(current_user)
    doc = await ai_conversations_col.find_one({"session_id": session_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    if doc.get("user_id") != current_user["id"] and not current_user.get("is_superadmin"):
        raise HTTPException(status_code=403, detail="Not your session")
    return {"session_id": session_id, "messages": doc.get("messages", [])}


@router.delete("/chat/sessions/{session_id}")
async def delete_chat_session(session_id: str, current_user: dict = Depends(get_current_user)):
    _check_executive_access(current_user)
    doc = await ai_conversations_col.find_one({"session_id": session_id})
    if not doc:
        return {"message": "Already deleted"}
    if doc.get("user_id") != current_user["id"] and not current_user.get("is_superadmin"):
        raise HTTPException(status_code=403, detail="Not your session")
    await ai_conversations_col.delete_one({"session_id": session_id})
    return {"message": "Deleted"}


# ============ 3. FORECAST ============

class ForecastRequest(BaseModel):
    outlet_id: Optional[str] = None
    horizon_days: int = 7  # how far ahead
    lookback_days: int = 30


def _simple_forecast(series: list, horizon: int) -> list:
    """Very simple linear + seasonality forecast baseline."""
    if not series or len(series) < 3:
        return []
    values = [p["revenue"] for p in series]
    n = len(values)
    avg = sum(values) / n
    # Trend: slope via least-squares
    xs = list(range(n))
    x_mean = sum(xs) / n
    y_mean = avg
    num = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, values))
    den = sum((x - x_mean) ** 2 for x in xs)
    slope = num / den if den else 0
    # 7-day weekday seasonality if applicable
    weekday_avg = {}
    weekday_cnt = {}
    for p in series:
        try:
            d = datetime.fromisoformat(p["date"])
            wd = d.weekday()
            weekday_avg[wd] = weekday_avg.get(wd, 0) + p["revenue"]
            weekday_cnt[wd] = weekday_cnt.get(wd, 0) + 1
        except Exception:
            pass
    weekday_factor = {}
    if weekday_avg:
        overall = sum(values) / n
        for wd in weekday_avg:
            wd_mean = weekday_avg[wd] / weekday_cnt[wd]
            weekday_factor[wd] = wd_mean / overall if overall else 1

    # Forecast
    forecast = []
    last_date = None
    if series:
        try:
            last_date = datetime.fromisoformat(series[-1]["date"])
        except Exception:
            last_date = datetime.now(timezone.utc)
    last_date = last_date or datetime.now(timezone.utc)
    for i in range(1, horizon + 1):
        future_date = last_date + timedelta(days=i)
        base = avg + slope * (n + i - 1)
        wd_factor = weekday_factor.get(future_date.weekday(), 1)
        pred = max(0, base * wd_factor)
        forecast.append({
            "date": future_date.strftime("%Y-%m-%d"),
            "predicted_revenue": round(pred, 0),
            "weekday": future_date.strftime("%A"),
        })
    return forecast


@router.post("/forecast")
async def ai_forecast(req: ForecastRequest, current_user: dict = Depends(get_current_user)):
    _check_executive_access(current_user)
    if req.horizon_days < 1 or req.horizon_days > 30:
        raise HTTPException(status_code=400, detail="horizon_days must be 1-30")

    # Build historical daily series
    now = datetime.now(timezone.utc)
    since = (now - timedelta(days=req.lookback_days)).strftime("%Y-%m-%d")
    today_str = now.strftime("%Y-%m-%d")
    series_map = {}
    q = {"date": {"$gte": since, "$lte": today_str}}
    if req.outlet_id:
        q["outlet_id"] = req.outlet_id
    async for s in sales_summaries_col.find(q):
        d = s.get("date")
        series_map[d] = series_map.get(d, 0) + float(s.get("total_sales", 0) or 0)
    series = [{"date": d, "revenue": v} for d, v in sorted(series_map.items())]

    if len(series) < 5:
        return {
            "narrative": "Data historis belum cukup untuk memberikan forecast yang andal. Minimal butuh 5 hari data penjualan.",
            "historical": series,
            "forecast": [],
            "total_forecast": 0,
        }

    forecast = _simple_forecast(series, req.horizon_days)
    total_predicted = sum(p["predicted_revenue"] for p in forecast)
    historical_total = sum(p["revenue"] for p in series)
    historical_avg = historical_total / len(series) if series else 0

    # Ask AI for narration
    system = SYSTEM_PROMPT_BASE + """
You explain forecast results in Bahasa Indonesia with 3 short sections:

## 🔮 Proyeksi Ringkas
[1-2 kalimat: total proyeksi, dibanding rata-rata historis]

## 📊 Pola yang Terdeteksi
[trend harian, weekday terbaik/terburuk]

## 🎯 Implikasi Operasional
[2-3 saran aksi: staffing, inventory, promo]

Hindari janji berlebihan. Forecast ini baseline sederhana (trend+seasonality).
"""
    chat = _make_chat(f"forecast-{uuid.uuid4()}", system)
    payload = {
        "period_forecast_days": req.horizon_days,
        "historical_avg_daily": round(historical_avg, 0),
        "historical_total": round(historical_total, 0),
        "forecast_total": round(total_predicted, 0),
        "forecast": forecast,
        "historical_series_recent": series[-14:],
    }
    try:
        narrative = await chat.send_message(UserMessage(
            text=f"Buat penjelasan forecast untuk data:\n```json\n{json.dumps(payload, default=str)}\n```"
        ))
    except Exception as e:
        narrative = f"(AI narration tidak tersedia: {str(e)})"

    return {
        "narrative": narrative,
        "historical": series,
        "forecast": forecast,
        "total_forecast": round(total_predicted, 0),
        "historical_avg_daily": round(historical_avg, 0),
        "model_note": "Baseline trend + weekday seasonality forecast (simple).",
    }


# ============ 4. ANOMALY DETECTION ============

@router.post("/anomalies")
async def detect_anomalies(
    current_user: dict = Depends(get_current_user),
    outlet_id: Optional[str] = None,
    lookback_days: int = 30,
):
    _check_executive_access(current_user)
    now = datetime.now(timezone.utc)
    since_date = (now - timedelta(days=lookback_days)).strftime("%Y-%m-%d")
    today_str = now.strftime("%Y-%m-%d")

    anomalies = []

    # Fetch daily sales
    series_map = {}
    q = {"date": {"$gte": since_date, "$lte": today_str}}
    if outlet_id:
        q["outlet_id"] = outlet_id
    async for s in sales_summaries_col.find(q):
        d = s.get("date")
        series_map[d] = series_map.get(d, 0) + float(s.get("total_sales", 0) or 0)
    series = [{"date": d, "revenue": v} for d, v in sorted(series_map.items())]

    # Revenue anomalies via z-score
    if len(series) >= 7:
        values = [p["revenue"] for p in series]
        mean = sum(values) / len(values)
        var = sum((v - mean) ** 2 for v in values) / len(values)
        std = var ** 0.5 if var > 0 else 1
        for p in series:
            z = (p["revenue"] - mean) / std if std else 0
            if abs(z) >= 2:
                anomalies.append({
                    "type": "revenue_spike" if z > 0 else "revenue_drop",
                    "severity": "high" if abs(z) >= 3 else "medium",
                    "date": p["date"],
                    "value": round(p["revenue"], 0),
                    "expected_range": [round(mean - std, 0), round(mean + std, 0)],
                    "z_score": round(z, 2),
                    "description": f"Revenue pada {p['date']} sebesar Rp {p['revenue']:,.0f} ({z:+.1f}σ dari rata-rata).",
                })

    # High waste days
    waste_by_date = {}
    wq = {"date": {"$gte": since_date}}
    if outlet_id:
        wq["outlet_id"] = outlet_id
    async for w in waste_logs_col.find(wq):
        d = w.get("date")
        waste_by_date[d] = waste_by_date.get(d, 0) + float(w.get("cost", 0) or 0)
    if waste_by_date:
        w_values = list(waste_by_date.values())
        w_mean = sum(w_values) / len(w_values)
        w_std = (sum((v - w_mean) ** 2 for v in w_values) / len(w_values)) ** 0.5 or 1
        for d, cost in waste_by_date.items():
            z = (cost - w_mean) / w_std
            if z >= 2:
                anomalies.append({
                    "type": "waste_spike",
                    "severity": "high" if z >= 3 else "medium",
                    "date": d,
                    "value": round(cost, 0),
                    "expected_range": [0, round(w_mean + w_std, 0)],
                    "z_score": round(z, 2),
                    "description": f"Waste cost pada {d} sebesar Rp {cost:,.0f} ({z:+.1f}σ).",
                })

    # High cashier variance
    sq = {"status": "closed", "closed_at": {"$gte": now - timedelta(days=lookback_days)}}
    if outlet_id:
        sq["outlet_id"] = outlet_id
    async for s in cashier_shifts_col.find(sq):
        v = float(s.get("variance", 0) or 0)
        if abs(v) >= 50000:
            anomalies.append({
                "type": "cash_variance",
                "severity": "high" if abs(v) >= 200000 else "medium",
                "date": s.get("closed_at").strftime("%Y-%m-%d") if s.get("closed_at") else None,
                "value": round(v, 0),
                "shift_number": s.get("shift_number"),
                "cashier_name": s.get("cashier_name"),
                "description": f"Shift {s.get('shift_number')} — variance kas Rp {v:,.0f} ({'kelebihan' if v > 0 else 'kekurangan'}).",
            })

    # Active alerts
    active_alerts = []
    aq = {"status": "active"}
    if outlet_id:
        aq["outlet_id"] = outlet_id
    async for a in alerts_col.find(aq).limit(20):
        active_alerts.append({
            "type": a.get("type"),
            "severity": a.get("severity", "info"),
            "title": a.get("title"),
            "outlet_id": a.get("outlet_id"),
        })

    # Sort anomalies by severity
    sev_order = {"high": 0, "medium": 1, "low": 2}
    anomalies.sort(key=lambda x: (sev_order.get(x.get("severity", "low"), 3), x.get("date", "")))

    # AI explanation
    explanation = ""
    if anomalies or active_alerts:
        system = SYSTEM_PROMPT_BASE + """
You review a list of statistical anomalies and active alerts, and produce:

## 🧠 Interpretasi Otomatis
[2-3 kalimat: pola dominan, outlet/tanggal yang paling bermasalah]

## 🔥 Prioritas Tindakan
[daftar ber-bullet 3-5 action items, dari paling urgent]

## 📌 Akar Masalah yang Mungkin
[1-2 hipotesis: apakah operasional, demand, pricing, atau fraud risk]

Singkat dan actionable. Jangan mengada-ada di luar data yang diberikan.
"""
        chat = _make_chat(f"anomaly-{uuid.uuid4()}", system)
        try:
            explanation = await chat.send_message(UserMessage(
                text=f"Analisa anomali dan alert berikut:\n\nAnomali:\n{json.dumps(anomalies, default=str, indent=2)}\n\nAlert Aktif:\n{json.dumps(active_alerts, default=str, indent=2)}"
            ))
        except Exception as e:
            explanation = f"(AI explanation tidak tersedia: {str(e)})"
    else:
        explanation = "✅ Tidak ada anomali signifikan atau alert aktif pada periode ini. Sistem berjalan dalam pola normal."

    return {
        "anomalies": anomalies,
        "active_alerts": active_alerts,
        "explanation": explanation,
        "period": {"from": since_date, "to": today_str, "days": lookback_days},
        "summary": {
            "total_anomalies": len(anomalies),
            "high_severity": sum(1 for a in anomalies if a.get("severity") == "high"),
            "medium_severity": sum(1 for a in anomalies if a.get("severity") == "medium"),
            "active_alerts": len(active_alerts),
        },
    }


# ============ Health/Status ============
@router.get("/health")
async def ai_health(current_user: dict = Depends(get_current_user)):
    """Check AI subsystem status."""
    _check_executive_access(current_user)
    return {
        "status": "ok" if EMERGENT_LLM_KEY else "missing_key",
        "model": f"{DEFAULT_MODEL[0]}/{DEFAULT_MODEL[1]}",
        "features": ["insights", "chat", "forecast", "anomalies"],
    }
