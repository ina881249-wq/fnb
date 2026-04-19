# plan.md

## 1) Objectives
- Menjaga baseline yang sudah stabil (Phase 1 & 2) sambil memperluas platform menjadi **workflow operasional end-to-end** dari frontliner (**Cashier/Kitchen/Warehouse**) sampai kontrol (Outlet/Management/Executive).
- Tetap memakai arsitektur **modular monolith** (FastAPI + MongoDB) dengan batas domain jelas (finance, inventory, approvals, closing, POS, kitchen, warehouse, AI) agar portal baru bisa ditambahkan tanpa redesign.
- Menjadikan finance + inventory **audit-grade** dan **control-grade**:
  - Double-entry accounting via **COA + Journal Engine + Posting Service**
  - Kontrol operasional via **reconciliation, daily closing, approvals, alerts**
  - Inventory operasional via **receiving, transfer workflow, adjustment, stock count** + traceability `stock_movements`
- Upgrade UI menjadi **enterprise operational cockpit**:
  - DataTable standar (pagination/search/filter/sort) di semua modul list utama
  - workflow-first screens untuk outlet ops (closing-driven)
  - konsistensi navigasi + tindakan kontekstual
  - **mobile/tablet-first** untuk frontliner (Cashier POS + Kitchen KDS)
- Menjadikan **Cashier Portal, Kitchen Portal, Warehouse Portal** sebagai sumber data operasional yang mengalir ke kontrol outlet (closing) dan monitoring (management/executive).
- Menambahkan **AI Control Tower untuk Executive**:
  - Auto-narrative briefing, chat Q&A berbasis data internal, forecast, dan anomaly detection
  - Fokus: actionable insight, investigasi cepat, dan early warning operasional
- Menutup gap production readiness:
  - **Onboarding aman** (invite flow) + **password policy** + **2FA TOTP** untuk role sensitif
  - **Warehouse transfer governance** (request → approve → ship → receive, partial receive)
  - **KDS mode** untuk dapur (fullscreen kiosk, touch-friendly)
  - **Real-time operations** via WebSocket untuk Kitchen (hapus polling)
  - **Hardware readiness**: thermal printer ESC/POS + cash drawer (QRIS provider deferred)

> **Current status (updated):**
> - Baseline Phase 1 & 2: **COMPLETE**
> - Enhancement Phase 1A/1B/1C: **COMPLETE**
> - Enhancement Phase 1D: **MOSTLY COMPLETE** (tersisa hardening “nice-to-have” seperti saved views/column visibility)
> - **Phase 3A Cashier Portal MVP: COMPLETE**
> - **Phase 3B Kitchen Portal MVP: COMPLETE**
> - **Phase 3C Daily Closing Integration: COMPLETE**
> - **Phase 3D.1 DataTable Rollout (Outlet pages): COMPLETE**
> - **Phase 3D.2 Auth hardening: COMPLETE**
> - **Phase 3D.3 DataTable Rollout (remaining modules): COMPLETE**
> - **Phase 3E Warehouse Portal MVP + integration: COMPLETE**
> - **Phase 3F AI Executive Portal: COMPLETE**
> - Data client reseed: **Lusi & Pakan (2 outlet, 3 bulan data) COMPLETE**
> - **P1a Auto-journal integration: COMPLETE**
> - **P1b Auth hardening lanjutan (password policy + invite + sessions): COMPLETE**
> - **P1c Mobile/tablet-first POS Cashier: COMPLETE**
> - **P2a 2FA TOTP: COMPLETE**
> - **P2c Advanced Transfer Workflow: COMPLETE**
> - **P2e Mobile-first Kitchen KDS: COMPLETE**
> - **Tier-1 E2 Real-time Kitchen WebSocket: COMPLETE**
> - **Tier-1 E3 Server-side pagination readiness: COMPLETE (backend-ready; UI wired where needed)**
> - **Tier-1 E1 Hardware Integration (ESC/POS + cash drawer + print fallback): COMPLETE** *(QRIS gateway deferred pending provider credentials)*
> - Latest testing: `iteration_4.json` (frontend regression DataTable) — **no critical bugs**

---

## 2) Implementation Steps

### Phase 1 — Core POC (Isolation) (Completed)
**Core proven:** outlet-scoped RBAC + portal access + approvals + audit + WebSocket foundation.

Delivered:
- JWT auth, password hashing
- Custom RBAC (permission catalog + custom roles)
- Outlet scoping enforced on API
- Approval workflow (submit/approve/reject) + audit log
- WebSocket base for notifications
- Portal selector with coming-soon portals

Exit criteria: Met.

---

### Phase 2 — V1 App Baseline (Completed)
Delivered baseline product spanning:
- **Management Portal**: Dashboard, Finance, Inventory, Reports (Excel/PDF export), Admin (users/roles/outlets), Approvals, Audit.
- **Outlet Portal**: Dashboard, Cash, Sales Summary, Petty Cash, Inventory, Daily Closing.
- Seed data awal: 3 outlets + sample accounts/items/sales/cash/petty-cash.

Hardening fixes applied:
- `_id` serialization corrected → `id` for frontend consistency
- Outlet portal auto-select outlet for assigned users

Exit criteria: Met.

---

## Enhancement Roadmap — Focus on perfecting Phase 1 & 2 first

### Enhancement Phase 1A — Finance Control Core (COMPLETED)
Goal: make finance/accounting **control-grade** with double-entry, reconciliation, and daily locking.

Delivered:
1) COA Management (tree/hierarchy)
2) Journal Engine / Double Entry Accounting
3) Auto-posting for finance transactions (initial mapping)
4) Cash & Bank Reconciliation
5) Daily Closing Outlet workflow + Closing Monitor

Acceptance criteria — Met.

---

### Enhancement Phase 1B — Inventory Control Core (COMPLETED)
Goal: inventory becomes production-aware and sales-consumption-aware.

Delivered:
1) Recipe/BOM Engine
2) Production / Prep Orders
3) Stock movement enhancements (production consumption/output)

Acceptance criteria — Met.

---

### Enhancement Phase 1C — Control Layer (COMPLETED)
Goal: exception-first monitoring and operational investigation.

Delivered:
1) Variance Report
2) Exception Alerts Engine
3) Audit Trail schema upgrade (before/after)

Acceptance criteria — Met.

---

### Enhancement Phase 1D — UI/UX Best Practices (MOSTLY COMPLETE)
Goal: make UI enterprise-grade for daily operations.

#### Completed in 1D
- Navigation/menu restructure implemented.
- Empty states dan CTAs di modul-modul baru.
- **DataTable standardization selesai** (Phase 3D.1 + 3D.3) untuk modul utama.
- Journal list memiliki pagination + row-click detail.

#### Remaining Scope (nice-to-have)
- Server-side pagination wiring untuk dataset sangat besar (stock movements, approvals) bila volume tinggi.
- Smart filters + saved views (per role) pada modul critical.
- Sticky headers + column visibility + export selected untuk tabel besar.
- Reporting refactor milestone:
  - move P&L/Cashflow/Balance Sheet calculations to be **journal-driven** as single source-of-truth.

Acceptance criteria (to close 1D fully)
- All key lists have stable pagination + filters.
- Reports consistent with journal totals.

---

## Phase 3 — Portal Expansion + End-to-End Ops (based on Final Production PDF)

### Phase 3A — Cashier Portal MVP (COMPLETED; UI-first)
**User decision:** hardware dibutuhkan nanti (printer struk, cash drawer), namun **fokus UI-only dulu**.

#### Implemented Scope (Delivered)
- POS (menu, cart, checkout)
- Payment (cash/card/QRIS/online + receipt)
- Shift (open/close + variance)
- Orders management (pay/void)
- Dashboard KPIs

#### Backend (Delivered)
- Router: `/api/cashier/*`
- Collections + indexes: `menu_items`, `cashier_shifts`, `pos_orders`
- Integration: shift close **auto-creates sales_summaries** (source `cashier_shift`)

#### Frontend (Delivered)
- Layout: `CashierLayout.js`
- Pages: `/cashier/dashboard`, `/cashier/pos`, `/cashier/orders`, `/cashier/shift`
- Portal Selector: Cashier portal **active**

#### Quality / Testing
- Backend passed; frontend core flows verified end-to-end.

Acceptance criteria — Met.

---

### Phase 3B — Kitchen Portal MVP (COMPLETED)
#### Scope (MVP features) — Delivered
- **Queue (Kanban)**: tiket dari order **paid** (filter 24 jam) dikelompokkan per status
- **Prep Tracking**: update status `queued → preparing → ready → served` + timestamp per transisi
- **Waste**: log waste (item/qty/uom/reason/category/cost) + agregasi biaya
- **Dashboard**: KPI queue status + avg prep time (proxy) + waste summary

#### Backend (Delivered)
- Router: `/api/kitchen/*`
- Endpoints:
  - `GET /api/kitchen/queue?outlet_id=&include_served=`
  - `POST /api/kitchen/tickets/{order_id}/status`
  - `GET /api/kitchen/tickets/{order_id}`
  - `POST /api/kitchen/waste`, `GET /api/kitchen/waste`, `DELETE /api/kitchen/waste/{id}`
  - `GET /api/kitchen/dashboard`
- Collections:
  - reuse `pos_orders` untuk ticket + kitchen status
  - `waste_logs` untuk pencatatan waste
- Integration:
  - Saat POS order dibayar, backend broadcast event `kitchen_ticket_new`
  - Waste log (jika item_id ada) membuat `stock_movements` type `waste`

#### Frontend (Delivered)
- Layout: `KitchenLayout.js`
- Pages:
  - `/kitchen/dashboard`, `/kitchen/queue`, `/kitchen/waste`
- Portal Selector: Kitchen portal **active** + routing enabled

#### Quality / Testing
- Verified via Playwright flow + testing agent regression.

Acceptance criteria — Met.

---

### Phase 3C — End-to-end Daily Closing integration (Cashier ↔ Outlet Closing ↔ Approval) (COMPLETED)
#### Scope — Delivered
- Integrasi data **cashier shifts** ke Daily Closing Outlet:
  - ringkasan sales (total + per payment method)
  - expected cash vs actual cash + variance
  - daftar shift harian (open/closed)
- System validation (discrepancy detection):
  - `open_shifts` (critical)
  - `cash_variance` (warning/critical by threshold)
  - `no_sales_data` (warning)
- Submit blocking:
  - `can_submit=false` bila ada discrepancy severity `critical` atau checklist belum complete

#### Backend (Delivered)
- `GET /api/daily-closing/status` diperkaya:
  - `shift_summary`, `shifts[]`, `discrepancies[]`, `checklist.cashier_shifts`

#### Frontend (Delivered)
- Outlet `DailyClosing.js`:
  - step baru: **Cashier Shifts** (first checklist)
  - banner **System Findings**
  - kartu **Shift Summary** + list shift

#### Quality / Testing
- Testing agent: Daily closing integration validated.

Acceptance criteria — Met.

---

### Phase 3D — Hardening (DataTable rollout) (COMPLETE)
#### Phase 3D.1 — DataTable rollout (Outlet major pages) (COMPLETED)
Delivered:
- Outlet → **Cash Management** migrated to `DataTable`
- Outlet → **Sales Summary** migrated to `DataTable`
- Outlet → **Petty Cash** migrated to `DataTable`

#### Phase 3D.2 — Auth & Security Hardening (COMPLETED)
Delivered:
- Admin-trigger password reset (temporary password)
- Force change password on next login (`must_change_password`)
- Session timeout via frontend interceptors + UX messaging

#### Phase 3D.3 — DataTable rollout (remaining modules) (COMPLETED)
Delivered:
- Management → **InventoryPage**: 3 tabs (Stock on Hand, Items, Movements)
- Management → **JournalEntriesPage**: server-side pagination + filters + detail dialog
- Management → **ReconciliationPage**: filters + search
- (Sudah sebelumnya) Approvals & AuditTrail already use DataTable

Bundled fix:
- DataTable client-side pagination bug fixed.

Acceptance criteria — Met.

---

### Phase 3E — Warehouse Portal (COMPLETED)
Scope delivered:
- Receiving (PO-less receiving / supplier delivery note)
- Transfers antar-outlet (basic)
- Stock Adjustments
- Inventory Count (stock opname)
- Warehouse Dashboard

Acceptance criteria — Met.

---

## Phase 3F — AI Executive Portal (COMPLETE)
Delivered Features:
1) AI Insights
2) AI Chat
3) AI Forecast
4) AI Anomalies

Provider:
- Emergent Universal Key (Claude Sonnet)

Acceptance criteria — Met.

---

## P1 Production Hardening — Operational + Security + Mobility (COMPLETE)

### P1a — Auto-journal integration (Finance ↔ Operasional) (COMPLETED)
Delivered:
- `/app/backend/utils/posting_service.py`
- Warehouse: receipt + adjustment return `journal_number`
- Kitchen waste returns `journal_number`

Acceptance criteria — Met.

---

### P1c — Mobile/Tablet-first POS Cashier (COMPLETED)
Delivered:
- POS mobile/tablet layout (drawer + FAB)
- Touch targets + keypad + quick amounts

Acceptance criteria — Met.

---

### P1b — Auth hardening lanjutan (COMPLETED)
Delivered:
- Password policy (min 8, letter+digit)
- Invite flow + accept-invite page + auto-login
- Sessions log endpoint + Admin viewer

Acceptance criteria — Met.

---

## P2 — Production Readiness Plus (COMPLETE)

### P2c — Advanced Warehouse Transfer Workflow (COMPLETED)
Delivered:
- request/approve/reject + partial receive
- stock deducted on approve
- UI updated in Warehouse Transfers

Acceptance criteria — Met.

---

### P2e — Mobile-first Kitchen KDS (COMPLETED)
Delivered:
- horizontal scroll-snap, urgency indicator, fullscreen kiosk mode

Acceptance criteria — Met.

---

### P2a — 2FA TOTP (COMPLETED)
Delivered:
- backend endpoints + QR setup
- LoginPage TOTP flow
- `/2fa-setup` page

Acceptance criteria — Met.

---

## Tier 1 Enhancements — Go-Live Readiness (COMPLETE; QRIS deferred)

### E2 — Real-time WebSocket Kitchen (COMPLETED)
Delivered:
- New hook: `/app/frontend/src/hooks/useWebSocket.js`
  - auto-reconnect + ping keep-alive + event filtering
- KitchenQueue subscribes to:
  - `pos_order_paid`, `pos_order_created`, `kitchen_ticket_status_changed`, `kitchen_waste_logged`, `shift_closed`
- Fallback polling reduced 10s → 30s
- Audio beep on `pos_order_paid`

Acceptance criteria — Met.

---

### E3 — Server-side Pagination (COMPLETED; backend-ready)
Delivered:
- Backend already supports `skip/limit/total` for heavy lists:
  - stock movements, audit logs, journals, pos orders
- Frontend already wired server-side for:
  - AuditTrailPage
  - JournalEntriesPage
- Inventory movements can be wired when volume grows (>5k records). Documented.

Acceptance criteria — Met.

---

### E1 — Hardware Integration (COMPLETED; QRIS deferred)
Delivered:
- ESC/POS printer service (Web Serial): `/app/frontend/src/services/escposPrinter.js`
  - connect/pair, auto-connect, printReceipt (ESC/POS bytes), cut, cash drawer kick
  - `smartPrint()` with browser print fallback (80mm HTML template)
- Printer Settings page: `/management/printer`
  - Connection status, pairing instructions, paper width (58/80mm), test print, open drawer
- POS integration:
  - Auto-print after successful payment (toggle via `localStorage lp_auto_print_receipt=0`)
  - Receipt dialog now includes **Reprint** button
  - Auto open cash drawer on cash payment if paired

Deferred:
- QRIS payment gateway integration (Midtrans/Xendit/DOKU) — requires provider selection + API keys.

Acceptance criteria — Met.

---

## 3) Next Actions (immediate)
1) **Pilot lapangan** dengan thermal printer nyata (58mm/80mm) + cash drawer:
   - verifikasi pairing Web Serial di Chrome/Edge
   - test print formatting untuk menu panjang
   - verifikasi drawer kick wiring
2) Putuskan **provider QRIS** (Midtrans/Xendit/DOKU) dan siapkan API keys untuk integrasi.
3) Monitoring performa setelah 2–4 minggu data akumulasi:
   - jika stock movements/audit logs > 5k, wire server-side pagination pada halaman yang masih client-side
4) Optional hardening:
   - rate limiting untuk /auth/login
   - encryption-at-rest untuk `totp_secret`

---

## 4) Success Criteria
- Semua transaksi operasional (POS, cash, petty cash, receiving, transfer, adjustment, stock count, waste) mengalir ke:
  - approvals (bila perlu)
  - daily closing (outlet)
  - reporting (management/executive)
- Daily closing end-to-end berjalan sesuai flow:
  - cashier close shift → outlet review → system validate → submit approval → finance finalize/lock.
- Finance tetap **double-entry**, dan makin journal-driven.
- UI operasional-grade:
  - DataTable konsisten, filter/pagination stabil
  - mobile/tablet UX siap lapangan (Cashier POS + Kitchen KDS)
- Executive control tower proaktif dengan AI:
  - briefing otomatis, anomaly detection, forecasting untuk tindakan cepat.
- **Production readiness**:
  - Auto-journal untuk receiving/waste/adjustment aktif dan balanced
  - Password policy + invite onboarding + session audit + **2FA** tersedia
  - Warehouse transfers punya governance (request/approve/partial receive)
  - Kitchen real-time via WebSocket (polling hanya fallback)
  - Hardware printing + cash drawer siap (QRIS integration pending provider)

---

## Appendix — Current Navigation Snapshot
### Management Portal
- **Executive**: Dashboard, Alerts
- **Finance**: Chart of Accounts, Journal Entries, Cash & Bank, Reconciliation, Budgeting, Recurring
- **Inventory**: Items & Stock, Recipe & BOM, Production Orders
- **Reports**: Reports, Variance, Drill-Down
- **Operations**: Closing Monitor, Approvals, Approval Rules
- **Admin**: Admin, Printer & Drawer, Audit Trail

### Outlet Portal
Dashboard, Cash, Sales, Petty Cash, Inventory, Daily Closing

### Cashier Portal
Dashboard, POS, Orders, Shift

### Kitchen Portal
Dashboard, Queue (Mobile KDS + Realtime WS), Waste

### Warehouse Portal
Dashboard, Receiving, Transfers (Advanced), Adjustments, Inventory Count

### Executive Portal
Overview, Revenue Analytics, Expense Analytics, Outlet Performance, Inventory Health, Control Tower,
AI Insights, AI Chat, AI Forecast, AI Anomalies
