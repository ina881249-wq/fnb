import os
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from database import create_indexes
from seed_data import seed_data
from websocket_manager import ws_manager
from auth import decode_token

# Import routers
from routers.auth_router import router as auth_router
from routers.core_router import router as core_router
from routers.finance_router import router as finance_router
from routers.inventory_router import router as inventory_router
from routers.reports_router import router as reports_router
from routers.approvals_router import router as approvals_router
from routers.coa_router import router as coa_router
from routers.journal_router import router as journal_router
from routers.reconciliation_router import router as recon_router
from routers.closing_router import router as closing_router
from routers.recipe_router import router as recipe_router
from routers.production_router import router as production_router
from routers.variance_router import router as variance_router
from routers.alerts_router import router as alerts_router
from routers.budget_router import router as budget_router
from routers.approval_rules_router import router as approval_rules_router
from routers.recurring_router import router as recurring_router
from routers.drilldown_router import router as drilldown_router
from routers.bank_statement_router import router as bank_statement_router
from routers.enhancements_router import router as enhancements_router
from routers.executive_router import router as executive_router
from routers.cashier_router import router as cashier_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting F&B ERP System...")
    await create_indexes()
    await seed_data()
    print("F&B ERP System ready!")
    yield
    # Shutdown
    print("Shutting down F&B ERP System...")

app = FastAPI(
    title="F&B Financial Control Platform",
    description="Multi-outlet F&B ERP with Finance, Accounting & Inventory",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
cors_origins = os.environ.get("CORS_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(core_router)
app.include_router(finance_router)
app.include_router(inventory_router)
app.include_router(reports_router)
app.include_router(approvals_router)
app.include_router(coa_router)
app.include_router(journal_router)
app.include_router(recon_router)
app.include_router(closing_router)
app.include_router(recipe_router)
app.include_router(production_router)
app.include_router(variance_router)
app.include_router(alerts_router)
app.include_router(budget_router)
app.include_router(approval_rules_router)
app.include_router(recurring_router)
app.include_router(drilldown_router)
app.include_router(bank_statement_router)
app.include_router(enhancements_router)
app.include_router(executive_router)
app.include_router(cashier_router)

# Health check
@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "F&B ERP"}

# WebSocket endpoint
@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    try:
        payload = decode_token(token)
        user_id = payload.get("user_id")
        if not user_id:
            await websocket.close(code=4001)
            return
        
        from database import users_col
        from bson import ObjectId
        user = await users_col.find_one({"_id": ObjectId(user_id)})
        if not user:
            await websocket.close(code=4001)
            return
        
        outlets = [str(o) for o in user.get("outlet_access", [])]
        portals = user.get("portal_access", [])
        
        await ws_manager.connect(websocket, user_id, outlets, portals)
        
        try:
            while True:
                data = await websocket.receive_text()
                # Handle ping/pong
                if data == "ping":
                    await websocket.send_text("pong")
        except WebSocketDisconnect:
            ws_manager.disconnect(user_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.close(code=4000)
        except Exception:
            pass

# Dashboard summary endpoint
@app.get("/api/dashboard/summary")
async def dashboard_summary():
    from database import outlets_col, users_col, items_col, approvals_col, sales_summaries_col, accounts_col
    
    outlets_count = await outlets_col.count_documents({"status": "active"})
    users_count = await users_col.count_documents({"is_active": True})
    items_count = await items_col.count_documents({"active": True})
    pending_approvals = await approvals_col.count_documents({"status": "pending"})
    
    # Total revenue (last 30 days)
    from datetime import datetime, timezone, timedelta
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    pipeline = [
        {"$match": {"date": {"$gte": thirty_days_ago}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_sales"}}}
    ]
    total_revenue = 0
    async for r in sales_summaries_col.aggregate(pipeline):
        total_revenue = r["total"]
    
    # Total bank balance
    bank_pipeline = [
        {"$match": {"type": "bank"}},
        {"$group": {"_id": None, "total": {"$sum": "$current_balance"}}}
    ]
    total_bank = 0
    async for b in accounts_col.aggregate(bank_pipeline):
        total_bank = b["total"]
    
    return {
        "outlets_count": outlets_count,
        "users_count": users_count,
        "items_count": items_count,
        "pending_approvals": pending_approvals,
        "total_revenue_30d": total_revenue,
        "total_bank_balance": total_bank,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
