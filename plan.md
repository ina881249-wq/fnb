# plan.md

## 1) Objectives
- Stabilize and **perfect Phase 1 & Phase 2** (existing build) so the product moves from:
  - **system of record → system of control**
  - **passive dashboards → workflow-based operations**
  - **data lists → decision + action layer**
- Keep architecture as **modular monolith** (FastAPI + MongoDB) with strict domain boundaries so future phases can be added without redesign.
- Implement the **Feature Enhancement Backlog** (saved as the source-of-truth in `/app/memory/FEATURE_BACKLOG.md`) **phase-by-phase** with explicit acceptance criteria to ensure nothing is missed.
- Elevate accounting/inventory accuracy and auditability:
  - Double-entry accounting via **Journal Engine**
  - Strong controls via **reconciliation, daily closing, approvals, and alerts**
- Upgrade UI to an enterprise operational cockpit:
  - pagination/search/filter/saved views/bulk actions
  - workflow-first screens
  - consistent menu structure and contextual actions

> Current status: **Original Phase 1 & 2 baseline build is COMPLETE** (auth/RBAC, finance, inventory, reporting/export, approvals, audit, portals + UX). Next work is **Enhancement Phase 1A → 1D**, then **Enhancement Phase 2A → 2B**.

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
- **Management Portal (7 pages)**: Dashboard, Finance, Inventory, Reports (Excel/PDF export), Admin (users/roles/outlets), Approvals, Audit.
- **Outlet Portal (5 pages)**: Dashboard, Cash, Sales Summary, Petty Cash, Inventory.
- Seed data: 3 outlets + sample accounts/items/sales/cash/petty-cash.

Hardening fixes applied:
- `_id` serialization corrected → `id` for frontend consistency
- Outlet portal auto-select outlet for assigned users

Exit criteria: Met (backend tests 100%, manual UI verification complete).

---

## Enhancement Roadmap (NEW) — Focus on perfecting Phase 1 & 2 first

### Enhancement Phase 1A — Finance Control Core (START HERE)
Goal: make finance/accounting **control-grade** with double-entry, reconciliation, and daily locking.

#### Scope (Features)
1) **Journal Engine / Double Entry Accounting**
- Add Journal module:
  - journal header + journal lines (debit/credit)
  - source document reference (cash movement, petty cash, settlement, sales summary, adjustments)
  - posting date, outlet scope
  - status: draft, posted, reversed
- All finance transactions must go through **posting service**.
- Reports (P&L/cashflow/balance sheet/equity) must be derived from **journals** (source-of-truth).
- UI: Management → Finance & Accounting → Journal Entries (list + filters + detail view).

2) **COA Management (Chart of Accounts) — tree/hierarchy**
- COA tree (parent-child), account types (asset/liability/equity/revenue/expense/cogs)
- active/inactive, report mapping
- support dimensions (future-ready): outlet/city/cost center/analytic tag
- UI: Management → Finance & Accounting → Chart of Accounts (tree view + search + inline edit).

3) **Cash Reconciliation & Bank Reconciliation**
- expected vs actual amount, difference, variance reason, approval status
- reconciliation per outlet/account/period
- rule: daily closing cannot lock if mismatch unresolved
- UI:
  - Management → Finance & Accounting → Reconciliation (wizard/stepper)
  - Outlet → Cash & Bank → Daily Cash Review (summary + variance submit)

4) **Daily Closing Outlet (workflow + lock)**
- daily status per outlet: open → in_progress → submitted → approved → locked
- checklist:
  - sales summary complete
  - petty cash complete
  - stock movement complete
  - cash reconciliation complete
- after locked: edits require privileged override + audit trail
- UI:
  - Outlet → Tasks & Closing → Daily Closing (stepper)
  - Management → Operations → Outlet Closing Monitor

#### User stories
- Finance can view journal entries and trace them to source documents.
- Every cash movement / petty cash expense / settlement / sales summary generates correct debit-credit postings.
- Finance can reconcile cash/bank and approve variances.
- Outlet manager can complete daily checklist and submit closing.
- Locked day cannot be edited except via override with audit.

#### Backend work
- New collections (minimum):
  - `coa_accounts`
  - `journals` (header)
  - `journal_lines`
  - `reconciliations`
  - `daily_closings`
- New routers (suggested):
  - `/api/coa/*`
  - `/api/journals/*`
  - `/api/reconciliation/*`
  - `/api/daily-closing/*`
- Refactor existing finance endpoints to call:
  - `posting_service.post_cash_movement(...)`
  - `posting_service.post_petty_cash_expense(...)`
  - `posting_service.post_sales_summary(...)`
- Update reporting endpoints to query journals.

#### Frontend work
- New management pages:
  - COA Management
  - Journal Entries
  - Reconciliation (wizard)
  - Outlet Closing Monitor
- New outlet pages:
  - Daily Cash Review (reconciliation summary)
  - Daily Closing (stepper)
- Add server-side pagination primitives to existing lists.

#### Acceptance criteria
- Creating any finance transaction results in balanced journal lines (total debit == total credit).
- Reports match journal totals.
- Closing cannot reach locked when reconciliation mismatch unresolved.
- Audit shows who locked and who overrode.

---

### Enhancement Phase 1B — Inventory Control Core
Goal: inventory becomes production-aware and sales-consumption-aware.

Scope:
- **Recipe/BOM engine** (raw → prep → sub-prep → menu)
- **Consumption engine** (from sales summary now; POS later)
- **Production / Prep Orders** (batch, yield/loss, statuses; management UI; kitchen portal later)
- **Enterprise stock movement upgrades**:
  - expanded movement types
  - mandatory reason codes
  - approvals for certain movements
  - transfer workflow with transit tracking

Key outputs:
- Theoretical consumption computed and posted.
- Stock reduced by BOM consumption.
- Production outputs roll up cost.

---

### Enhancement Phase 1C — Control Layer (Decision + Action)
Goal: exception-first monitoring and operational investigation.

Scope:
- **Variance Report** (theoretical vs actual) by outlet/item/period + thresholds
- **Exception Alerts engine**:
  - low stock, cash mismatch, overdue closing, missing submissions, unusual expense, high variance
  - WebSocket notify + dashboard feed
- **Audit Trail operational upgrade**:
  - before_value/after_value
  - filter by outlet/user/module/transaction
  - export support

---

### Enhancement Phase 1D — UI/UX Best Practices (applies to all modules)
Goal: make UI enterprise-grade for daily operations.

Scope:
- Server-side pagination (10/20/50) across all long lists
- Search global + per module
- Smart filter + saved views
- Sort + sticky headers + column visibility
- Bulk actions (approve many, export selected, batch close)
- Empty/loading/error states (skeletons + CTA)
- Contextual actions only
- Responsive optimizations for outlet/tablet
- Workflow-first screens (daily tasks → actions → closing)
- Implement the recommended menu structure (Management + Outlet) from backlog

---

### Enhancement Phase 2A — Scale & Control Lanjutan
Scope:
- Budgeting per outlet (budget vs actual, burn rate)
- Granular approvals (rule-based: type/amount/outlet/role, chains/escalation/delegation)
- Scheduled/Recurring transactions (draft auto-generated + review + approval)
- Multi-level reporting drill-down (global → city → outlet → category → item → transaction) with breadcrumbs

---

### Enhancement Phase 2B — Portal Expansion (functional, not placeholders)
Scope:
- **Kitchen Portal**: production tasks (kanban), batch completion, yield/loss
- **Warehouse Portal**: receiving, picking list, transfer requests, batch receipts

---

## 3) Next Actions (immediate)
1. Start **Enhancement Phase 1A** with the correct implementation order:
   1) COA → 2) Journal Engine & Posting Service → 3) Refactor reports to journals → 4) Reconciliation → 5) Daily Closing
2. Confirm MVP accounting policy assumptions for Phase 1A:
   - COA structure depth
   - Mapping rules for auto-journals (sales/cash/settlement/petty cash)
3. Confirm whether outlet closing approval should be:
   - manager only, or manager + finance chain
4. After Phase 1A, proceed to Phase 1B.

---

## 4) Success Criteria
- All transactions produce correct **double-entry journals** and reports derive from journals.
- Reconciliation + variance approvals exist and block final locking when unresolved.
- Daily outlet closing workflow exists (open → locked) with override + audit.
- Inventory supports recipes/production and produces variance reporting.
- Exception alerts highlight issues proactively (dashboard feed + WebSocket).
- UI is operational-grade: pagination, search/filter/saved views, bulk actions, workflow-first screens.
- Phase 1 & 2 enhancements delivered without missing any item from `/app/memory/FEATURE_BACKLOG.md`.
