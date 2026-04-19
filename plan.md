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
- Server-side pagination untuk dataset sangat besar (stock movements, audit trail, approvals) bila volume tinggi.
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
- Management → **InventoryPage**: 3 tabs (Stock on Hand, Items, Movements) migrated ke `DataTable` dengan search/sort/filter/pagination
- Management → **JournalEntriesPage**: migrated ke `DataTable` + server-side pagination + status & source filter + row-click detail dialog
- Management → **ReconciliationPage**: migrated ke `DataTable` + status/type filter + search
- (Sudah sebelumnya) Management → **ApprovalsPage** dan **AuditTrailPage** sudah pakai `DataTable`

Bundled fix:
- **DataTable**: fixed client-side pagination bug (Prev/Next bekerja selama `onPageChange` diberikan, tidak lagi tergantung `isServerSide`).

Notes:
- ProductionPage tetap kanban (lebih optimal untuk workflow status).
- RecipeBOMPage tetap card grid (lebih optimal untuk browsing resep).

Quality / Testing:
- Testing agent `iteration_4.json`: tidak ada critical bugs; beberapa finding adalah false positives terkait selector.

Acceptance criteria — Met.

---

### Phase 3E — Warehouse Portal (COMPLETED)
Scope delivered:
- Receiving (PO-less receiving / supplier delivery note)
- Transfers antar-outlet (basic status: `in_transit`, `received`, `cancelled`)
- Stock Adjustments (reason-coded)
- Inventory Count (stock opname) + variance posting ke stock movements
- Warehouse Dashboard (7-day KPIs)

Integration notes:
- Semua aksi gudang tercermin pada `stock_on_hand` + `stock_movements`.
- Frontend line picker untuk Receiving/Transfers mewajibkan pilihan item dari katalog (`item_id`).
- Routing & akses portal aktif.

Acceptance criteria — Met.

---

## Phase 3F — AI Executive Portal (COMPLETE)
Delivered Features:
1) AI Insights (briefing)
2) AI Chat
3) AI Forecast
4) AI Anomalies

Provider:
- Emergent Universal Key (Claude Sonnet)

Acceptance criteria — Met.

---

## P1 Production Hardening — Operational + Security + Mobility (COMPLETE)

### P1a — Auto-journal integration (Finance ↔ Operasional) (COMPLETED)
Goal: Semua transaksi operasional penting auto-post ke journal (double-entry) untuk audit-grade reporting.

Delivered:
- File baru: `/app/backend/utils/posting_service.py`
  - `post_receipt_journal()` → Dr Inventory (1210/1220) / Cr AP (2100)
  - `post_waste_journal()` → Dr Waste & Spoilage (6800) / Cr Inventory (1210/1220)
  - `post_adjustment_journal()` → gain/loss inventory vs Misc Expense (6900)
- Integrasi:
  - `routers/warehouse_router.py`: create_receipt + create_adjustment mengembalikan `journal_number`
  - `routers/kitchen_router.py`: waste logging mengembalikan `journal_number`
- Verified end-to-end: jurnal balanced dan posted, dengan `source_type`:
  - `warehouse_receipt`, `kitchen_waste`, `warehouse_adjustment`

Acceptance criteria — Met.

---

### P1c — Mobile/Tablet-first POS Cashier (COMPLETED)
Goal: Siap pilot di lapangan (tablet/iPad/Android), touch-friendly dan cepat.

Delivered (frontend):
- Refactor besar `/app/frontend/src/pages/cashier/POSPage.js`:
  - Responsive layout: desktop sticky cart; tablet/mobile via **bottom Sheet drawer** + floating FAB
  - Touch targets: qty +/- jadi `h-10 w-10`, menu card min-height 140px, pill tabs tinggi 44px
  - Numeric keypad (3×4): `1-9, 000, 0, backspace` untuk cash tender
  - Quick-amount buttons: 50K/100K/150K/200K/500K
  - Checkout button `h-14`
- Verified via screenshot tablet/mobile flows.

Acceptance criteria — Met.

---

### P1b — Auth hardening lanjutan (COMPLETED)
Goal: Siap production multi-outlet (password policy, onboarding aman, audit login).

Backend (`routers/auth_router.py`):
- Password policy: min 8 char, wajib ada 1 huruf + 1 angka via `validate_password_policy()`
- Applied to: register, change-password, admin reset password, accept-invite
- New endpoints:
  - `POST /api/auth/admin/invite` (admin buat invite token)
  - `GET /api/auth/invite-info?token=` (public pre-check)
  - `POST /api/auth/accept-invite` (public accept + set password + auto-login)
  - `GET /api/auth/sessions?user_id=&limit=` (recent login activity, berbasis audit log)
  - `GET /api/auth/password-policy` (public UI hints)

Frontend:
- New page: `/app/frontend/src/pages/AcceptInvitePage.js`
- Route baru: `/accept-invite` (unauthenticated)
- Management Admin:
  - Invite User dialog + copyable invite link
  - Session history dialog (Clock icon)
  - Password hint pada create user

Acceptance criteria — Met.

---

## P2 — Production Readiness Plus (COMPLETE)

### P2c — Advanced Warehouse Transfer Workflow (COMPLETED)
Goal: formal transfer governance dan traceability lintas outlet.

Backend (`warehouse_router.py`):
- Status baru: `requested → in_transit → partially_received → received` + branch `rejected`, `cancelled`
- Endpoint tambahan:
  - `POST /api/warehouse/transfers` support `requires_approval` (jika true → status `requested`)
  - `POST /api/warehouse/transfers/{id}/approve` (ship: potong stok source)
  - `POST /api/warehouse/transfers/{id}/reject` (tanpa dampak stok)
  - `POST /api/warehouse/transfers/{id}/receive` support partial per-line (`lines:[{item_id, received_qty}]`)
- Policy:
  - Deduct stock hanya saat **approve** (bukan saat request)
  - Partial receive menyimpan `received_qty` per line

Frontend (`WarehouseTransfers.js`):
- Create transfer dialog: checkbox **requires approval**
- Approve/Reject action buttons untuk status `requested`
- Receive dialog mendukung **partial receive** (input qty per item)
- Badge status dengan 6 warna

Acceptance criteria — Met.

---

### P2e — Mobile-first Kitchen KDS (COMPLETED)
Goal: kitchen workstation siap tablet/kiosk, cepat, jelas, touch-friendly.

Frontend (`KitchenQueue.js`) — rewritten:
- Mobile: **horizontal scroll-snap carousel** per kolom status
- Tablet/Desktop: grid kanban
- Big touch targets: action button `h-14`, typography diperbesar
- Urgency indicator:
  - ≥15 menit: border amber
  - ≥25 menit: pulsing border merah
- Fullscreen toggle (native Fullscreen API) untuk kiosk mode
- Show/Hide Served toggle
- Notes display dalam callout amber
- Stats strip compact di mobile

Acceptance criteria — Met.

---

### P2a — 2FA TOTP (COMPLETED)
Goal: hardening security untuk role sensitif (management/executive/superadmin).

Backend (`auth_router.py` + libs `pyotp`, `qrcode`):
- `POST /api/auth/2fa/setup` → secret + provisioning URI + QR base64 PNG
- `POST /api/auth/2fa/enable` → verify code + finalize
- `POST /api/auth/2fa/disable` → require current code
- `GET /api/auth/2fa/status` → enabled/required_by_role/enrolled_at
- Login behavior:
  - jika `totp_enabled=true` dan `totp_code` kosong → `401 {detail: "TOTP_REQUIRED"}`

Frontend:
- LoginPage: menangani `TOTP_REQUIRED` → tampilkan input kode 6-digit (retry login)
- New page: `/2fa-setup` via `TwoFactorSetupPage.js` (QR + verify + disable)

Acceptance criteria — Met.

---

## 3) Next Actions (immediate)
Karena P1 + P2 sudah complete, opsi lanjutan untuk iterasi berikutnya:
1) **Evaluation + Enhancement Recommendations (post-P2)**
   - UAT checklist per role (Cashier/Kitchen/Warehouse/Manager/Finance/Executive)
   - Gap analysis data integrity: journal vs reports, stock movements vs SOH
   - Performance check (list pages, large datasets)
2) **P3 — Hardware + Integrations**
   - Printer struk (ESC/POS), cash drawer, QRIS provider integration
3) **P3 — Journal-driven reporting full refactor**
   - P&L/Cashflow/Balance Sheet 100% dari journal sebagai single source-of-truth
4) **P3 — Real-time websockets UI**
   - Kitchen UI subscribe ke `kitchen_ticket_new` + updates (hapus polling)
5) **P3 — Advanced workflows**
   - Receiving berbasis PO, approval threshold untuk adjustments, attachments (invoice/receipt images)

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

---

## Appendix — Current Navigation Snapshot
### Management Portal
- **Executive**: Dashboard, Alerts
- **Finance**: Chart of Accounts, Journal Entries, Cash & Bank, Reconciliation
- **Inventory**: Items & Stock, Recipe & BOM, Production Orders
- **Reports**: Reports, Variance
- **Operations**: Closing Monitor, Approvals
- **Admin**: Admin, Audit Trail

### Outlet Portal
Dashboard, Cash, Sales, Petty Cash, Inventory, Daily Closing

### Cashier Portal
Dashboard, POS, Orders, Shift

### Kitchen Portal
Dashboard, Queue (Mobile KDS), Waste

### Warehouse Portal
Dashboard, Receiving, Transfers (Advanced), Adjustments, Inventory Count

### Executive Portal
Overview, Revenue Analytics, Expense Analytics, Outlet Performance, Inventory Health, Control Tower,
AI Insights, AI Chat, AI Forecast, AI Anomalies
