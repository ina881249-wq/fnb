# plan.md

## 1) Objectives
- Menjaga baseline yang sudah stabil (Phase 1 & 2) sambil memperluas platform menjadi **workflow operasional end-to-end** dari frontliner (**Cashier/Kitchen**) sampai kontrol (Outlet/Management/Executive).
- Tetap memakai arsitektur **modular monolith** (FastAPI + MongoDB) dengan batas domain jelas (finance, inventory, approvals, closing, POS, kitchen) agar portal baru bisa ditambahkan tanpa redesign.
- Menjadikan finance + inventory **audit-grade** dan **control-grade**:
  - Double-entry accounting via **COA + Journal Engine + posting service**
  - Kontrol operasional via **reconciliation, daily closing, approvals, alerts**
  - Production-aware inventory via **recipes + production orders**
- Upgrade UI menjadi **enterprise operational cockpit**:
  - DataTable standar (pagination/search/filter/sort) bertahap di semua modul
  - workflow-first screens untuk outlet ops (closing-driven)
  - konsistensi navigasi + tindakan kontekstual
- Menjadikan **Cashier Portal & Kitchen Portal** sebagai sumber data transaksi/produksi yang mengalir ke outlet closing dan approval.

> **Current status (updated):**
> - Baseline Phase 1 & 2: **COMPLETE**
> - Enhancement Phase 1A/1B/1C: **COMPLETE**
> - Enhancement Phase 1D: **PARTIALLY COMPLETE** (sisa dipindah ke hardening)
> - **Phase 3A Cashier Portal MVP: COMPLETE** (backend + frontend + testing 100% pass)
> - **Phase 3B Kitchen Portal MVP: COMPLETE** (backend + frontend + basic E2E verified)
> - **Phase 3C Daily Closing Integration: COMPLETE** (shift summary + discrepancy detection + UI integration)
> - **Phase 3D.1 DataTable Rollout (Outlet pages): COMPLETE** (Cash, Sales Summary, Petty Cash)
> - **All key portals active:** Executive, Management, Outlet, Cashier, Kitchen
> - Latest testing: **Backend 100%**, **Frontend 95%** (minor: beberapa fitur pagination DataTable tidak terlihat pada dataset tertentu; bukan bug fungsional)

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
  - Saat POS order dibayar, backend broadcast event `kitchen_ticket_new` (untuk real-time next step)
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

#### Phase 3D.2 — Auth & Security Hardening (UPCOMING)
Scope:
- Password reset flow (email/token atau admin-trigger reset)
- Session timeout / refresh token strategy (bila diperlukan)
- User invite (optional)
- 2FA (later; jika jadi prioritas)

Acceptance criteria:
- Pengguna bisa reset password dengan aman.
- Session behavior jelas dan tidak mudah disalahgunakan.

#### Phase 3D.3 — DataTable rollout (remaining modules) (UPCOMING)
Scope:
- Rollout `DataTable` ke list panjang lainnya (Management + Outlet):
  - Stock Movements
  - Items
  - Recipes
  - Production Orders
  - Approvals
  - Audit Trail
  - Reconciliation
  - Journal Entries (upgrade ke standard DataTable + filters)
- (Opsional) migrasi ke server-side pagination untuk dataset besar.

Acceptance criteria:
- Konsistensi UX tabel di semua modul utama.
- Query params konsisten untuk pagination/filter (jika server-side diaktifkan).

---

## 3) Next Actions (immediate)
1) **Mulai Phase 3D.2 (Auth hardening)**
   - definisi metode reset password (email vs admin reset)
   - implement endpoint + UI
2) **Lanjut Phase 3D.3 (DataTable rollout sisanya)**
   - prioritas: Items/Stock Movements/Reconciliation/Approvals/Audit
3) **Mulai Phase 3E (Warehouse Portal)** (jika sudah prioritas)
   - receiving, putaway, inter-outlet transfer, stock adjustments

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
