# plan.md

## 1) Objectives
- Menjaga baseline yang sudah stabil (Phase 1 & 2) sambil memperluas platform menjadi **workflow operasional end-to-end** dari frontliner (**Cashier/Kitchen**) sampai kontrol (Outlet/Management/Executive).
- Tetap memakai arsitektur **modular monolith** (FastAPI + MongoDB) dengan batas domain jelas (finance, inventory, approvals, closing, POS, kitchen, warehouse) agar portal baru bisa ditambahkan tanpa redesign.
- Menjadikan finance + inventory **audit-grade** dan **control-grade**:
  - Double-entry accounting via **COA + Journal Engine + posting service**
  - Kontrol operasional via **reconciliation, daily closing, approvals, alerts**
  - Production-aware inventory via **recipes + production orders**
- Upgrade UI menjadi **enterprise operational cockpit**:
  - DataTable standar (pagination/search/filter/sort) bertahap di semua modul
  - workflow-first screens untuk outlet ops (closing-driven)
  - konsistensi navigasi + tindakan kontekstual
- Menjadikan **Cashier Portal & Kitchen Portal** sebagai sumber data transaksi/produksi yang mengalir ke outlet closing dan approval.
- Menambahkan **AI Control Tower untuk Executive**:
  - Auto-narrative briefing, chat Q&A berbasis data internal, forecast, dan anomaly detection
  - Fokus: actionable insight, investigasi cepat, dan early warning operasional

> **Current status (updated):**
> - Baseline Phase 1 & 2: **COMPLETE**
> - Enhancement Phase 1A/1B/1C: **COMPLETE**
> - Enhancement Phase 1D: **PARTIALLY COMPLETE** (sisa dipindah ke hardening)
> - **Phase 3A Cashier Portal MVP: COMPLETE** (backend + frontend + testing 100% pass)
> - **Phase 3B Kitchen Portal MVP: COMPLETE** (backend + frontend + basic E2E verified)
> - **Phase 3C Daily Closing Integration: COMPLETE** (shift summary + discrepancy detection + UI integration)
> - **Phase 3D.1 DataTable Rollout (Outlet pages): COMPLETE** (Cash, Sales Summary, Petty Cash)
> - **Phase 3F AI Executive Portal: COMPLETE** (Insights + Chat + Forecast + Anomalies; verified via Playwright)
> - **All key portals active:** Executive, Management, Outlet, Cashier, Kitchen
> - Latest testing: **Backend 100%**, **Frontend 95%**
>   - catatan minor: pagination UI DataTable kadang tidak muncul jika dataset < pageSize (expected behavior)

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
- Seed data: 3 outlets + sample accounts/items/sales/cash/petty-cash.

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

### Enhancement Phase 1D — UI/UX Best Practices (PARTIALLY COMPLETE)
Goal: make UI enterprise-grade for daily operations.

#### Completed in 1D so far
- Pagination implemented on **Journal Entries** list.
- Search/filters implemented on control pages:
  - Alerts filter by type
  - Variance structured layout + empty-state guidance
- Empty states and CTAs implemented across new modules.
- Navigation/menu restructure implemented.

#### Remaining Scope (moved to Phase 3D hardening queue)
- Server-side pagination (10/20/50) across **all long lists**:
  - stock movements, audit trail, approvals, items, recipes, production orders, reconciliations, etc.
- Smart filters + saved views (per role) on key modules.
- Sort + sticky headers + column visibility for large tables.
- Bulk actions (approve multiple, resolve alerts, export selected).
- Global search (command palette) + structured search per module.
- Reporting refactor milestone:
  - move P&L/Cashflow/Balance Sheet calculations to be **journal-driven** as single source-of-truth.

Acceptance criteria (to close 1D)
- All key lists have stable pagination + filters.
- Global search works and is role-scoped.
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
- Testing agent: **Backend 29/29 passed**, frontend core flows verified end-to-end.

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
  - Saat POS order dibayar, backend broadcast event `kitchen_ticket_new` (real-time next step)
  - Waste log (jika item_id ada) membuat `stock_movements` type `waste` (traceability)

#### Frontend (Delivered)
- Layout: `KitchenLayout.js`
- Pages:
  - `/kitchen/dashboard`, `/kitchen/queue`, `/kitchen/waste`
- Portal Selector: Kitchen portal **active** + routing enabled

#### Quality / Testing
- Verified via Playwright flow (queue update + waste entry) + testing agent regression.

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

### Phase 3D — Hardening (DataTable rollout + Auth hardening) (IN PROGRESS)
#### Phase 3D.1 — DataTable rollout (Outlet major pages) (COMPLETED)
Delivered (client-side DataTable standardization):
- Outlet → **Cash Management** migrated to `DataTable`:
  - search + filter type + sort + pagination
- Outlet → **Sales Summary** migrated to `DataTable`:
  - search + sortable columns + pagination
- Outlet → **Petty Cash** migrated to `DataTable`:
  - search + category filter + pagination

Quality:
- Tested via UI navigation + testing agent.

#### Phase 3D.2 — Auth & Security Hardening (UPCOMING; user choice: admin-trigger reset)
Scope (revised):
- **Admin-trigger password reset**
  - endpoint admin: generate temporary password
  - enforce user must change password on next login (flag `must_change_password`)
  - audit log for reset actions
- Session timeout behavior (clarify + harden)
  - clear idle timeout UI messaging
  - optional server-side token invalidation list (lightweight)
- User invite (optional)
  - create user with temporary password + role + outlet access

Acceptance criteria:
- Admin bisa reset password user dengan aman, tercatat di audit.
- User dipaksa ganti password setelah reset.
- Session behavior jelas dan tidak mudah disalahgunakan.

#### Phase 3D.3 — DataTable rollout (remaining modules) (UPCOMING)
Scope:
- Rollout `DataTable` ke list panjang lainnya (Management + Outlet):
  - Stock Movements
  - Items
  - Recipes
  - Production Orders
  - Approvals
  - Audit Trail (cek keseragaman config)
  - Reconciliation
  - Journal Entries (upgrade ke standard DataTable + filters)
- (Opsional) migrasi ke server-side pagination untuk dataset besar.

Acceptance criteria:
- Konsistensi UX tabel di semua modul utama.
- Query params konsisten untuk pagination/filter (jika server-side diaktifkan).

---

### Phase 3E — Warehouse Portal (UPCOMING; scope: FULL)
Scope target:
- Receiving (PO-less receiving / supplier delivery note)
- Transfers antar-outlet (request → approve → ship → receive)
- Stock Adjustments (reason-coded)
- Inventory Count (stock opname) + variance posting

Notes:
- Harus terhubung ke `stock_movements` dan (opsional) journal posting bila biaya inventori perlu dibukukan.

Acceptance criteria:
- Warehouse operations bisa dilakukan end-to-end dan tercermin di stock movement ledger.
- Transfer antar outlet punya traceability lengkap (source/destination + status transitions).

---

## Phase 3F — AI Executive Portal (COMPLETE)
**User priority decision:** kerjakan AI Executive dulu (impact tinggi).

### Delivered Features (All completed; verified)
1) **AI Insights (Auto-narrative Briefing)**
   - Endpoint: `POST /api/ai/insights`
   - Output: briefing eksekutif dalam Bahasa Indonesia (sections: Ringkasan Utama, Performa Outlet, Perhatian Khusus, Rekomendasi)
   - Caching harian via `ai_insights_cache`
2) **AI Chat Assistant (Q&A berbasis data)**
   - Endpoints:
     - `POST /api/ai/chat`
     - `GET /api/ai/chat/sessions`
     - `GET /api/ai/chat/sessions/{session_id}`
     - `DELETE /api/ai/chat/sessions/{session_id}`
   - Session-based memory per user via `ai_conversations`
   - Context injection: 30 hari data ringkas (sales, waste, variance, alerts, top items)
3) **AI Forecasting**
   - Endpoint: `POST /api/ai/forecast`
   - Baseline forecast: trend + weekday seasonality (simple, explainable)
   - AI narration: proyeksi ringkas + pola + implikasi operasional
4) **AI Anomaly Detection + Explanation**
   - Endpoint: `POST /api/ai/anomalies`
   - Anomalies:
     - revenue spike/drop (z-score)
     - waste spike (z-score)
     - cashier variance besar
     - active alerts summary
   - AI explanation: interpretasi otomatis + prioritas tindakan + hipotesis akar masalah

### Model / Provider
- Provider: **Emergent Universal Key**
- Model default: **Anthropic `claude-sonnet-4-5-20250929`**
  - Catatan: OpenAI sempat 502 pada environment ini, sehingga default dipindah ke Claude.

### Frontend (Delivered)
- Executive nav + pages:
  - `/executive/ai-insights`
  - `/executive/ai-chat`
  - `/executive/ai-forecast`
  - `/executive/ai-anomalies`
- Verified via Playwright screenshots untuk semua halaman.

### Data Storage
- Collections:
  - `ai_conversations` (chat history)
  - `ai_insights_cache` (cached daily insights)

Acceptance criteria — Met.

---

## 3) Next Actions (immediate)
1) **Mulai Phase 3D.2 (Auth hardening)**
   - Admin-trigger reset password + force change on next login
   - Session timeout messaging + lightweight security improvements
   - (Optional) user invite
2) **Lanjut Phase 3D.3 (DataTable rollout sisanya)**
   - prioritas: Items/Stock Movements/Reconciliation/Approvals/Audit/Journal
3) **Mulai Phase 3E (Warehouse Portal — Full scope)**
   - receiving, transfer antar outlet, stock adjustment, inventory count

---

## 4) Success Criteria
- Semua transaksi operasional (POS, cash, petty cash, stock movement, waste) mengalir ke:
  - approval (bila perlu)
  - daily closing (outlet)
  - reporting (management/executive)
- Daily closing end-to-end berjalan sesuai flow PDF:
  - cashier close shift → outlet review → system validate → submit approval → finance finalize/lock.
- Finance tetap **double-entry**, dan laporan makin journal-driven.
- UI operasional-grade: DataTable konsisten, filter/pagination stabil, saved views/bulk actions bertahap.
- Executive control tower makin proaktif dengan AI:
  - briefing otomatis, anomaly detection, dan forecasting untuk tindakan cepat.

---

## Appendix — Current Navigation Snapshot
### Management Portal (15 items across 6 sections)
- **Executive**: Dashboard, Alerts
- **Finance**: Chart of Accounts, Journal Entries, Cash & Bank, Reconciliation
- **Inventory**: Items & Stock, Recipe & BOM, Production Orders
- **Reports**: Reports, Variance
- **Operations**: Closing Monitor, Approvals
- **Admin**: Admin, Audit Trail

### Outlet Portal (6 tabs)
Dashboard, Cash, Sales, Petty Cash, Inventory, Daily Closing

### Cashier Portal (Phase 3A — Delivered)
Dashboard, POS, Orders, Shift

### Kitchen Portal (Phase 3B — Delivered)
Dashboard, Queue, Waste

### Executive Portal (AI — Delivered)
Overview, Revenue Analytics, Expense Analytics, Outlet Performance, Inventory Health, Control Tower,
**AI Insights, AI Chat, AI Forecast, AI Anomalies**
