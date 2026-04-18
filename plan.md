# plan.md

## 1) Objectives
- Menjaga baseline yang sudah stabil (Phase 1 & 2) sambil memperluas platform menjadi **workflow operasional end-to-end** dari frontliner (**Cashier/Kitchen**) sampai kontrol (Outlet/Management/Executive).
- Tetap memakai arsitektur **modular monolith** (FastAPI + MongoDB) dengan batas domain jelas (finance, inventory, approvals, closing, POS) agar portal baru bisa ditambahkan tanpa redesign.
- Menjadikan finance + inventory **audit-grade** dan **control-grade**:
  - Double-entry accounting via **COA + Journal Engine + posting service**
  - Kontrol operasional via **reconciliation, daily closing, approvals, alerts**
  - Production-aware inventory via **recipes + production orders**
- Upgrade UI menjadi **enterprise operational cockpit**:
  - DataTable standar (pagination/search/filter/sort)
  - workflow-first screens untuk outlet ops
  - konsistensi navigasi + tindakan kontekstual
- Membangun **Cashier Portal & Kitchen Portal** sebagai sistem pencatat transaksi/produksi yang mengalir ke outlet closing dan approval.

> **Current status (updated):**
> - Baseline Phase 1 & 2: **COMPLETE**
> - Enhancement Phase 1A/1B/1C: **COMPLETE**
> - Enhancement Phase 1D: **PARTIALLY COMPLETE** (sisa dipindah ke hardening)
> - **Phase 3A Cashier Portal MVP: COMPLETE** (backend + frontend + testing 100% pass)
> - Next up: **Phase 3B Kitchen Portal MVP** (Queue / Prep / Waste)

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

#### Scope (Features) — Delivered
1) **COA Management (Chart of Accounts) — tree/hierarchy**
- COA tree (parent-child), account types (asset/liability/equity/revenue/expense/cogs/contra)
- Seeded **32 COA accounts**
- UI: Management → Finance → Chart of Accounts

2) **Journal Engine / Double Entry Accounting**
- Journal header + journal lines (debit/credit)
- Status: draft, posted, reversed
- Reversal creates counter-journal
- UI: Management → Finance → Journal Entries

3) **Auto-posting for finance transactions (initial mapping)**
- Cash movements + petty cash auto-generate balanced journals
- Posting service function available (`auto_post_journal`)

4) **Cash & Bank Reconciliation**
- expected vs actual, difference, variance reason
- approval actions (approve/reject)
- mismatch alert foundation
- UI: Management → Finance → Reconciliation

5) **Daily Closing Outlet (workflow + lock) + Monitor**
- open → in_progress → submitted → locked
- checklist (sales, petty cash, stock movements, reconciliation)
- override mechanism for privileged users
- UI:
  - Outlet → Daily Closing (stepper)
  - Management → Closing Monitor

#### Acceptance criteria — Met
- Balanced journal validation exists and is enforced.
- Reconciliation variance blocks closing submission.
- Closing can be locked and overridden with audit.

---

### Enhancement Phase 1B — Inventory Control Core (COMPLETED)
Goal: inventory becomes production-aware and sales-consumption-aware.

#### Scope (Features) — Delivered
1) **Recipe/BOM Engine**
- Recipe master + ingredient lines
- yield % + total cost calculation
- consumption preview API
- Seeded **3 sample recipes**
- UI: Management → Inventory → Recipe & BOM

2) **Production / Prep Orders**
- Full lifecycle: draft/planned → in_progress → completed (cancel supported)
- On start: consumes ingredients based on recipe
- On completion: adds output stock and calculates yield %
- UI: Management → Inventory → Production Orders

3) **Stock movement enhancements (baseline)**
- Extended flow support for production consumption/output via production order lifecycle

#### Acceptance criteria — Met
- Recipes are manageable and costed.
- Production orders consume inputs and create outputs.

---

### Enhancement Phase 1C — Control Layer (COMPLETED)
Goal: exception-first monitoring and operational investigation.

#### Scope (Features) — Delivered
1) **Variance Report**
- theoretical vs actual consumption (current implementation uses production + stock movements)
- severity classification (ok/warning/critical)
- Management UI: Reports → Variance

2) **Exception Alerts Engine**
- alert generation endpoint and alert list/stats
- current implemented alert types:
  - low stock
  - cash mismatch (from unresolved recon)
  - overdue closing
  - high waste
- WebSocket broadcast foundation (`alerts_generated`)
- Management UI: Executive → Alerts

3) **Audit Trail operational upgrade (schema)**
- `log_audit` supports `before_value` / `after_value` fields for operational investigations

#### Acceptance criteria — Met
- Alerts can be generated deterministically and shown as an actionable feed.
- Variance page and data model are in place.
- Audit schema supports before/after values.

---

### Enhancement Phase 1D — UI/UX Best Practices (PARTIALLY COMPLETE)
Goal: make UI enterprise-grade for daily operations.

#### Completed in 1D so far
- Pagination implemented on **Journal Entries** list.
- Search/filters implemented on new control pages:
  - Alerts filter by type
  - Variance has structured layout + empty-state guidance
- Empty states and CTAs implemented across new modules.
- Navigation/menu restructure implemented.

#### Remaining Scope (moved to Phase 3D hardening queue)
- Server-side pagination (10/20/50) across **all long lists**:
  - sales summaries, cash movements, petty cash, stock movements, audit trail, approvals, items, recipes, production orders
- Smart filters + saved views (per role) on key modules.
- Sort + sticky headers + column visibility for large tables.
- Bulk actions:
  - approve multiple
  - resolve multiple alerts
  - export selected
- Global search (command palette) + structured search per module.
- Workflow-first outlet screens:
  - “Today Tasks” → actions → daily closing
- Reporting refactor milestone:
  - move P&L/Cashflow/Balance Sheet calculations to be **journal-driven** as the single source-of-truth.

#### Acceptance criteria (to close 1D)
- All key lists have stable server-side pagination + filters.
- Global search works and is role-scoped.
- Reports are consistent with journal totals.

---

## Phase 3 — Portal Expansion + End-to-End Ops (based on Final Production PDF)

### Phase 3A — Cashier Portal MVP (COMPLETED; UI-first)
**User decision:** hardware dibutuhkan nanti (printer struk, cash drawer), namun **fokus UI-only dulu**.

#### PDF ringkas (poin kunci yang relevan)
- Portal architecture: Executive / Management / Outlet / **Cashier** / **Kitchen**.
- Daily closing flow end-to-end (high level):
  1) Cashier closes shift
  2) Outlet manager review cash & sales
  3) System validates discrepancies
  4) Submit for approval
  5) Finance finalizes closing
- Menu Cashier Portal: **POS, Payment, Shift**.

#### Implemented Scope (Delivered)
1) **POS (order entry UI)**
- Browse menu items + category filter + search
- Cart: qty add/remove, per-line removal, order meta (type/table/customer)
- Checkout flow (create order → pay → receipt)

2) **Payment**
- Methods: cash, card, QRIS, online
- Cash tendered + change calculation
- Receipt modal

3) **Shift (Open/Close)**
- Open shift with opening float
- Close shift with expected cash vs actual cash, variance
- Shift history table

4) **Orders Management**
- Orders list with filters, pagination
- Actions: view, pay open order, void open order (reason required)

5) **Dashboard**
- KPIs: today sales/orders, open orders, current shift, top items

#### Backend (Delivered)
- Router: `/api/cashier/*`
- Mongo Collections + indexes:
  - `menu_items`, `cashier_shifts`, `pos_orders` (+ `waste_logs` placeholder)
- Endpoints delivered:
  - `GET /api/cashier/menu`
  - `POST /api/cashier/shifts/open`, `GET /api/cashier/shifts/current`, `GET /api/cashier/shifts`, `POST /api/cashier/shifts/{id}/close`
  - `POST /api/cashier/orders`, `GET /api/cashier/orders`, `POST /api/cashier/orders/{id}/pay`, `POST /api/cashier/orders/{id}/void`
  - `GET /api/cashier/dashboard`
- Seed additions:
  - 17 menu items
  - roles: **Cashier**, **Kitchen Staff**
  - users: `cashier.sudirman@fnb.com`, `cashier.kemang@fnb.com`, `chef.sudirman@fnb.com`
- Integration: shift close **auto-creates sales_summaries** entry (source `cashier_shift`)

#### Frontend (Delivered)
- Layout: `CashierLayout.js`
- Pages:
  - `/cashier/dashboard`, `/cashier/pos`, `/cashier/orders`, `/cashier/shift`
- Portal Selector: Cashier portal status **active** + routing enabled

#### Quality / Testing
- Testing agent: **Backend 29/29 passed**, Frontend core flows verified end-to-end.

#### Acceptance criteria — Met
- Cashier bisa login → pilih portal cashier → transaksi end-to-end (shift → POS → pay → receipt).
- RBAC outlet scoping berjalan.

---

### Phase 3B — Kitchen Portal MVP (NEXT)
#### Scope (MVP features)
- **Queue**: daftar order paid yang perlu diproses (MVP: polling; next: WebSocket real-time)
- **Prep**: ubah status ticket/order: `queued → preparing → ready → served`
- **Waste**: log waste item (item, qty, reason) dan link ke outlet/date

#### Backend (to implement)
- Router: `kitchen_router.py` (atau extend `cashier_router` minimal untuk kitchen endpoints jika ingin cepat, namun direkomendasikan router terpisah)
- Collections:
  - Reuse `pos_orders` untuk ticket queue + status kitchen
  - `waste_logs` untuk pencatatan waste
- Endpoint minimal:
  - `GET /api/kitchen/queue?outlet_id=` (paid orders + kitchen_status filter)
  - `POST /api/kitchen/tickets/{id}/status` (update `kitchen_status`)
  - `POST /api/kitchen/waste`
- RBAC/Permissions:
  - `kitchen.queue.view`, `kitchen.ticket.update`, `kitchen.waste.log`

#### Frontend (to implement)
- Layout baru: `KitchenLayout.js`
- Pages:
  - `/kitchen/queue` (kanban/columns by status)
  - `/kitchen/prep` (optional; bisa gabung dengan queue untuk MVP)
  - `/kitchen/waste` (form + list)
- Portal Selector: Kitchen tetap `coming_soon` sampai MVP siap, lalu switch ke `active`

#### Acceptance criteria
- Kitchen staff bisa login → pilih portal kitchen → lihat queue per outlet.
- Bisa update status ticket dan perubahan terlihat di queue.
- Bisa log waste dan data tersimpan.

---

### Phase 3C — End-to-end Daily Closing integration (Cashier ↔ Outlet Closing ↔ Approval) (UPCOMING)
#### Scope
- Integrasikan data **shift close** dari cashier ke Daily Closing Outlet:
  - sales by payment type
  - expected cash vs actual cash (variance)
- Outlet manager review: tampilkan shift(s) hari itu + ringkasan
- System validation: flag discrepancy (variance di atas threshold, missing shift close, dll)
- Submit for approval: leverage approval engine existing
- Finance finalize: tetap mengikuti daily closing locking existing + journal posting (bila diperlukan)

#### Acceptance criteria
- Daily Closing stepper di Outlet portal bisa menarik data shift yang closed untuk tanggal/outlet.
- Closing submission memblok jika shift data belum lengkap atau variance belum diresolusikan sesuai rule.

---

### Phase 3D — Hardening (DataTable rollout + Auth hardening) (LATER)
#### Scope
1) **DataTable standardization (server-side pagination + search/filter)**
- Rollout ke list panjang: sales summaries, cash movements, petty cash, stock movements, audit trail, approvals, items, recipes, production orders

2) **Auth & security hardening**
- Password reset flow
- Session timeout / refresh token strategy (jika diperlukan)
- User invite (optional)
- 2FA (later; jika belum prioritas)

#### Acceptance criteria
- Semua list utama punya pagination stabil + query params konsisten.
- Auth lebih aman dan UX login lebih matang.

---

## 3) Next Actions (immediate)
1) **Mulai Phase 3B (Kitchen Portal MVP)**
   - Backend kitchen endpoints (queue/status/waste)
   - Frontend KitchenLayout + Queue UI (kanban)
   - Waste logging UI
   - Aktivasi portal kitchen di PortalSelector setelah MVP siap
2) Setelah Kitchen MVP stabil, lanjut **Phase 3C** (integrasi end-to-end daily closing).
3) Lakukan hardening UI/Auth (**Phase 3D**) dan menutup sisa **Phase 1D**.

---

## 4) Success Criteria
- Semua transaksi operasional (POS, cash, petty cash, stock movement, waste) mengalir ke:
  - approval (bila perlu)
  - daily closing (outlet)
  - reporting (management/executive)
- Daily closing end-to-end berjalan sesuai flow PDF: cashier close shift → outlet review → system validate → submit approval → finance finalize/lock.
- Finance tetap **double-entry**, dan laporan makin journal-driven.
- UI operasional-grade: pagination/search/filter/saved views/bulk actions bertahap.

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

### Kitchen Portal (Phase 3B — Target)
Queue, Prep, Waste
