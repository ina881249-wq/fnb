# plan.md

## 1) Objectives
- Menjaga baseline sistem yang sudah stabil sambil memperluas kualitas platform menjadi **control-grade + insight-grade** untuk multi-outlet, multi-city.
- Tetap memakai arsitektur **modular monolith** (FastAPI + MongoDB) dengan batas domain jelas (finance, inventory, approvals, closing, POS, kitchen, warehouse, AI, executive analytics) agar penambahan portal/fitur tidak memaksa redesign.
- Menjadikan finance + inventory **audit-grade** dan **control-grade**:
  - Double-entry accounting via **COA + Journal Engine + Posting Service**
  - Kontrol operasional via **reconciliation, daily closing, approvals, alerts**
  - Inventory operasional via **receiving, transfer workflow, adjustment, stock count** + traceability `stock_movements`
- Upgrade UI menjadi **enterprise operational cockpit**:
  - DataTable standar (pagination/search/filter/sort) untuk list utama
  - Workflow-first screens untuk outlet ops (closing-driven)
  - Konsistensi navigasi + tindakan kontekstual + deep-linking
  - Mobile/tablet-first untuk frontliner (Cashier POS + Kitchen KDS)
- Menjadikan **Cashier Portal, Kitchen Portal, Warehouse Portal** sebagai sumber data operasional yang mengalir ke kontrol outlet (closing) dan monitoring (management/executive).
- Menjadikan **Executive Portal** sebagai **premium interactive dashboard** (prioritas saat ini):
  - UI modern (glass premium) dengan **hybrid accent** (teal primary + electric blue accent khusus Executive)
  - Interaksi advanced: **period presets + compare**, KPI drill-over sheet, chart datapoint drill-down dialog, outlet leaderboard drill, deep-link ke halaman relevan
  - Real-time insight: WebSocket pulse + refresh KPI pada event penting
- Menutup gap production readiness:
  - Onboarding aman (invite flow) + password policy + 2FA TOTP
  - Warehouse governance (advanced transfer workflow)
  - Real-time operations via WebSocket
  - Hardware readiness (ESC/POS + cash drawer)
  - Midtrans QRIS (deferred menunggu production keys)

> **Current status (updated):**
> - Baseline Phase 1 & 2: **COMPLETE**
> - Enhancement Phase 1A/1B/1C: **COMPLETE**
> - Enhancement Phase 1D: **MOSTLY COMPLETE** (tersisa nice-to-have UI hardening)
> - Phase 3A Cashier Portal MVP: **COMPLETE**
> - Phase 3B Kitchen Portal MVP: **COMPLETE**
> - Phase 3C Daily Closing Integration: **COMPLETE**
> - Phase 3D Hardening (DataTable rollout): **COMPLETE**
> - Phase 3E Warehouse Portal MVP + integration: **COMPLETE**
> - Phase 3F AI Executive Portal: **COMPLETE**
> - Tier 2 Enhancements:
>   - **T2.1 Journal-Driven Reporting: COMPLETE**
>   - **T2.1-Plus Advanced Finance Reports + Interactive UI: COMPLETE**
>   - **T2.3 Notification Center (WebSocket): COMPLETE**
>   - **T2.2 Advanced Warehouse Workflows: COMPLETE**
> - Documentation repository `/app/docs`: **COMPLETE** (TDD, Tracker, Backlog)
> - Upcoming work now reprioritized: **Executive Portal Dashboard Premium Upgrade** (3 phase)
> - Midtrans QRIS: **DEFERRED** sampai API keys production tersedia

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
- **Management Portal**: Dashboard, Finance, Inventory, Reports, Admin, Approvals, Audit.
- **Outlet Portal**: Dashboard, Cash, Sales Summary, Petty Cash, Inventory, Daily Closing.
- Seed data awal + perbaikan konsistensi `_id` → `id`.

Exit criteria: Met.

---

## Enhancement Roadmap — Focus on perfecting Phase 1 & 2 first

### Enhancement Phase 1A — Finance Control Core (COMPLETED)
Delivered:
1) COA Management (tree/hierarchy)
2) Journal Engine / Double Entry Accounting
3) Auto-posting untuk transaksi finance
4) Cash & Bank Reconciliation
5) Daily Closing Outlet workflow + Closing Monitor

Acceptance criteria — Met.

---

### Enhancement Phase 1B — Inventory Control Core (COMPLETED)
Delivered:
1) Recipe/BOM Engine
2) Production / Prep Orders
3) Stock movement enhancements (production consumption/output)

Acceptance criteria — Met.

---

### Enhancement Phase 1C — Control Layer (COMPLETED)
Delivered:
1) Variance Report
2) Exception Alerts Engine
3) Audit Trail schema upgrade (before/after)

Acceptance criteria — Met.

---

### Enhancement Phase 1D — UI/UX Best Practices (MOSTLY COMPLETE)
Completed:
- Navigation/menu restructure
- Empty states + CTAs
- DataTable standardization untuk modul utama

Remaining (nice-to-have):
- Server-side pagination wiring untuk dataset besar (stock movements, pos orders) bila volume tinggi
- Smart filters + saved views
- Sticky headers + column visibility

Acceptance criteria (to close 1D fully):
- All key lists have stable pagination + filters
- Reports consistent with journal totals

---

## Phase 3 — Portal Expansion + End-to-End Ops (Completed)

### Phase 3A — Cashier Portal MVP (COMPLETED)
Implemented:
- POS flow, payments, shift open/close, orders, dashboard KPI
- Backend `/api/cashier/*` + `pos_orders`, `cashier_shifts`

Acceptance criteria — Met.

---

### Phase 3B — Kitchen Portal MVP (COMPLETED)
Implemented:
- KDS queue kanban, status transitions, waste logging, dashboard
- WebSocket events for kitchen operations

Acceptance criteria — Met.

---

### Phase 3C — End-to-end Daily Closing integration (COMPLETED)
Implemented:
- Cashier shifts integration into outlet daily closing
- Discrepancy detection + submit blocking rules

Acceptance criteria — Met.

---

### Phase 3D — Hardening (DataTable rollout) (COMPLETE)
Implemented:
- Outlet major pages in DataTable
- Auth hardening (force password change, session timeout)
- Management data-heavy modules (journals pagination + filters)

Acceptance criteria — Met.

---

### Phase 3E — Warehouse Portal (COMPLETED)
Implemented:
- Receiving, Transfers, Adjustments, Stock Count, Dashboard

Acceptance criteria — Met.

---

## Phase 3F — AI Executive Portal (COMPLETE)
Implemented:
- AI Insights, AI Chat, AI Forecast, AI Anomalies

Acceptance criteria — Met.

---

## Tier 2 Enhancements — Control-Grade Finance + Ops Governance (COMPLETE)

### T2.1 — Journal-Driven Reporting (COMPLETE)
- Profit & Loss, Cashflow, Balance Sheet, Trial Balance, General Ledger semuanya berbasis journals
- Backfill + coverage tooling tersedia

### T2.1-Plus — Advanced Finance Reports Excellence (COMPLETE)
- Equity changes, financial ratios, revenue trend
- Interactive UI: period presets + compare, charts, drill-down GL modal

### T2.3 — Notification Center (COMPLETE)
- WebSocket notification bell di semua portal
- Unread count + deep link

### T2.2 — Advanced Warehouse Workflows (COMPLETE)
- Purchase Orders + settings threshold + attachments

---

## Executive Portal Premium Dashboard Upgrade (NEW PRIORITY)
> Referensi UI: Dashbrd X (premium dark dashboard). Target: setara atau lebih baik, tetap konsisten dengan glassmorphism app.
> 
> **Confirmed choices:**
> - Scope: prioritas pages: **Overview, Revenue, Expenses, Outlets, Control Tower** (3 phase)
> - Color: **Hybrid** teal primary + electric blue accent khusus Executive
> - Interaksi wajib: period picker presets + compare, KPI drill-over Sheet, chart datapoint drill-down Dialog, outlet leaderboard drill, WebSocket realtime pulse
> - Data: **Real DB** (tanpa mock tambahan)
> - Design spec: sudah ditambahkan ke `/app/design_guidelines.md` ("Executive Dashboard — Premium Interactive Guidelines")

### Phase EXEC-1: Foundation + Overview Flagship (P0)
**Goal:** bangun fondasi komponen premium reusable + jadikan **ExecOverview** sebagai flagship interaktif.

Frontend:
- Tambah exec accent tokens ke `/app/frontend/src/index.css` untuk `.dark` & `.light`:
  - `--exec-accent-blue`, `--exec-accent-blue-soft`, `--exec-accent-glow`, `--exec-ring`, `--exec-grid`, `--exec-positive/negative/warning`
- Buat shared components di `/app/frontend/src/components/executive/`:
  - `PremiumPeriodPicker.js` (preset pills + custom range popover + compare toggle)
  - `InteractiveKpiCard.js` (value + trend + sparkline + click → Sheet)
  - `KpiDetailSheet.js` (Sheet metric detail + breakdown chart + list + CTA "View Full Report")
  - `DatapointDrilldownDialog.js` (Dialog breakdown saat click datapoint)
  - `ChartTooltip.js` (custom glass tooltip untuk Recharts)
  - `OutletLeaderboardCard.js` + `OutletDrilldownDialog.js`
  - `CountUpNumber.js` (animasi angka halus; respect prefers-reduced-motion)
- Refactor `/executive/overview` (`ExecOverview.js`) menggunakan komponen di atas:
  - Period presets + compare toggle
  - KPI cards klik → Sheet detail + deep link
  - Chart datapoint klik → drilldown dialog
  - Leaderboard outlet teaser klik → outlet dialog

Backend:
- Tambah endpoints untuk mendukung drill-down yang real:
  - `GET /api/executive/kpi-detail` (metric + period + outlet scope → breakdown series + top contributors)
  - `GET /api/executive/datapoint-breakdown` (metric + date + scope → daftar transaksi/journals)
  - `GET /api/executive/outlet-profile` (outlet_id + period → multi-metric + series)
- WebSocket integration:
  - Emit event `exec.kpi.refresh` dari posting/approval/closing/alerts agar frontend melakukan debounced refetch + pulse

Testing:
- Frontend compile + lint
- Manual click-flow: KPI sheet, chart drilldown dialog, leaderboard drill
- Visual QA (screenshot quick review) untuk dark/light

Acceptance criteria:
- Overview terasa premium dan interaktif: semua widget bisa drill-down
- Period presets + compare bekerja konsisten
- Tidak ada hardcoded hex di komponen Exec (hanya CSS vars)

---

### Phase EXEC-2: Revenue + Expense + Outlets Analytics (P0)
**Goal:** rebuild 3 halaman analytics agar setara kualitas dengan Overview dan konsisten komponen.

Frontend:
- `ExecRevenue.js`:
  - Trend (day/week/month toggle)
  - Channel split donut (cash/card/online)
  - Hourly heatmap / day-of-week breakdown
  - Top items + outlet ranking by revenue
  - Semua chart & list clickable → drilldown dialog/profile
- `ExecExpenses.js`:
  - Category donut + center metric
  - Trend vs budget overlay (jika budget tersedia)
  - Top expense outlets
  - Drilldown per category
- `ExecOutlets.js`:
  - Multi-metric leaderboard (revenue/margin/closing/waste) via tab pills
  - Outlet comparison matrix
  - Click → outlet profile dialog + deep link

Backend:
- `GET /api/executive/revenue-detail` (hourly, day-of-week, top items, by outlet)
- `GET /api/executive/expense-vs-budget` (join budget; jika budget belum versioned gunakan current approved)
- `GET /api/executive/outlet-matrix` (multi-metric comparison)

Testing:
- Regression basic routing + loading states
- Drilldown dialog data correctness (spot-check)

Acceptance criteria:
- Revenue/Expense/Outlets halaman interaktif penuh (drill-down parity)
- Konsistensi period picker & compare antar halaman

---

### Phase EXEC-3: Control Tower + Realtime Polish (P0)
**Goal:** Control Tower menjadi command center realtime + polish menyeluruh (states, a11y, perf).

Frontend:
- Rebuild `ControlTower.js`:
  - Live alerts stream (priority coding) + view/resolve
  - Approvals pending widget (inline action + deep link)
  - System health indicators + critical KPI row
  - Skeleton/empty/error premium
- Real-time:
  - WebSocket subscriptions untuk approvals/alerts/closing
  - Pulse animation hanya pada widget terdampak

Backend:
- Pastikan event emit konsisten pada approvals/alerts/closing
- (Opsional) endpoint ringkas untuk Control Tower aggregates agar render cepat

Polish:
- Keyboard nav, focus-visible ring exec
- prefers-reduced-motion
- Debounce WebSocket refresh, memoize chart transforms

Testing:
- Comprehensive testing agent run (end-to-end interaction checks)

Acceptance criteria:
- Control Tower cepat, realtime, actionable
- Tidak ada re-render storm; UI tetap halus

---

### Phase EXEC-4 (Deferred): Inventory Health + AI pages revamp
- Refresh `ExecInventory.js`
- Revamp AI pages (Insights/Chat/Forecast/Anomalies) dengan komponen premium yang sama

---

## 3) Next Actions (immediate)
1) Mulai **Phase EXEC-1** (Foundation + Overview Flagship).
2) Setelah EXEC-1 stabil, lanjut **EXEC-2** (Revenue/Expenses/Outlets).
3) Lanjut **EXEC-3** (Control Tower + realtime polish) + jalankan testing agent.

Deferred:
- Midtrans QRIS integration — menunggu API keys production.
- Budget Versioning (P2) — setelah dashboard exec stabil (karena akan mempengaruhi expense-vs-budget dan variance views).

---

## 4) Success Criteria
- Semua transaksi operasional (POS, cash, petty cash, receiving, transfer, adjustment, stock count, waste) mengalir ke:
  - approvals (bila perlu)
  - daily closing (outlet)
  - reporting (management/executive)
- Finance tetap **double-entry** dan laporan **journal-driven** (single source of truth):
  - P&L/Cashflow/Balance Sheet berasal dari `journals` + `journal_lines`
  - Trial Balance balanced
- Executive Portal menjadi **premium interactive cockpit**:
  - Period presets + compare tersedia di semua halaman prioritas
  - Semua KPI/Chart/List punya drill-down (Sheet/Dialog) + deep-link
  - Realtime updates via WebSocket dengan pulse (debounced)
  - UI konsisten dark/light, glass premium, cepat, dan accessible
- Production readiness tetap terjaga:
  - Invite onboarding + password policy + session audit + 2FA
  - Warehouse transfer governance lengkap
  - Kitchen realtime WS + hardware printing siap

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
