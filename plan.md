# plan.md

## 1) Objectives
- Stabilize and **perfect Phase 1 & Phase 2** (existing build) so the product moves from:
  - **system of record → system of control**
  - **passive dashboards → workflow-based operations**
  - **data lists → decision + action layer**
- Keep architecture as a **modular monolith** (FastAPI + MongoDB) with strict domain boundaries so future phases can be added without redesign.
- Implement the **Feature Enhancement Backlog** (source-of-truth in `/app/memory/FEATURE_BACKLOG.md`) **phase-by-phase** with explicit acceptance criteria to ensure nothing is missed.
- Ensure finance + inventory are **audit-grade** and **control-grade**:
  - Double-entry accounting via **COA + Journal Engine + posting service**
  - Strong operational controls via **reconciliation, daily closing, approvals, and alerts**
  - Production-aware inventory via **recipes + production orders**
  - Variance and exception monitoring for early anomaly detection
- Upgrade UI into an enterprise operational cockpit:
  - pagination/search/filter/saved views/bulk actions
  - workflow-first screens
  - consistent menu structure and contextual actions

> Current status: **Original Phase 1 & 2 baseline build is COMPLETE**. Enhancement **Phase 1A, 1B, 1C are COMPLETE**. Enhancement **Phase 1D is PARTIALLY COMPLETE** (pagination/search/empty-states for new modules + navigation restructure). Next work is **finish Phase 1D** and then proceed to **Enhancement Phase 2A → 2B**.

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
- **Outlet Portal**: Dashboard, Cash, Sales Summary, Petty Cash, Inventory.
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

#### Remaining Scope (Next)
- Server-side pagination (10/20/50) across **all long lists**:
  - sales summaries, cash movements, petty cash, stock movements, audit trail, approvals, items, recipes, production orders
- Smart filters + saved views (per role) on key modules.
- Sort + sticky headers + column visibility for large tables.
- Bulk actions:
  - approve multiple
  - resolve multiple alerts
  - export selected
  - batch close outlet (future)
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

### Enhancement Phase 2A — Scale & Control Lanjutan (NEXT)
Scope:
1) **Budgeting per outlet**
- Budget master per outlet/account/period
- Budget vs actual report, burn rate, variance %

2) **Granular Approval Workflow**
- rule-based approvals by transaction type, amount, outlet, role
- approver chain + escalation + delegation
- mandatory comments where configured

3) **Scheduled/Recurring Transactions**
- recurring rules (daily/weekly/monthly)
- auto-generate draft → review → approve

4) **Multi-level reporting drill-down**
- global → city → outlet → category → item → transaction
- clickable drill-down + breadcrumbs

Exit criteria:
- Budgets enforce monitoring (alerts when over budget optional).
- Approval routing is configurable and auditable.
- Recurring transactions reduce manual workload.
- Drill-down reports enable investigation to source documents.

---

### Enhancement Phase 2B — Portal Expansion (functional, not placeholders) (Later)
Scope:
- **Kitchen Portal**: production tasks (kanban), batch completion, yield/loss
- **Warehouse Portal**: receiving, picking lists, transfer requests, batch receipts

Exit criteria:
- Kitchen/Warehouse portals are operational (not “coming soon”), scoped by outlet/warehouse and role.

---

## 3) Next Actions (immediate)
1) Decide execution order:
   - **Option A (recommended)**: Finish **Phase 1D** (pagination/search/filter/bulk actions + journal-driven reports) before Phase 2A.
   - Option B: Start **Phase 2A** first if scaling features are urgent.
2) If choosing Option A, implement Phase 1D in this order:
   1) Journal-driven P&L/Cashflow/Balance Sheet (single source-of-truth)
   2) Pagination + page-size selector for all long lists
   3) Saved views + filter panel pattern
   4) Bulk actions + permission checks
   5) Global search (command palette)
3) If choosing Option B, start Phase 2A with:
   1) Budgeting per outlet
   2) Approval rules engine

---

## 4) Success Criteria
- All transactions produce correct **double-entry journals** and reports derive from journals.
- Reconciliation + variance controls block locking when unresolved.
- Daily outlet closing workflow exists (open → locked) with override + audit.
- Inventory supports recipes/production and variance reporting.
- Exception alerts highlight issues proactively (dashboard feed + WebSocket foundation).
- UI is operational-grade: pagination, search/filter/saved views, bulk actions, workflow-first screens.
- Phase 1 & 2 enhancements delivered without missing any item from `/app/memory/FEATURE_BACKLOG.md`.

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
