# plan.md

## 1) Objectives
- Stabilize and **perfect Phase 1 & Phase 2** (existing build) so the product moves from:
  - **system of record → system of control**
  - **passive dashboards → workflow-based operations**
  - **data lists → decision + action layer**
- Keep architecture as **modular monolith** (FastAPI + MongoDB) with strict domain boundaries so future phases can be added without redesign.
- Implement the **Feature Enhancement Backlog** (saved as the source-of-truth in `/app/memory/FEATURE_BACKLOG.md`) **phase-by-phase** with explicit acceptance criteria to ensure nothing is missed.
- Elevate accounting/inventory accuracy and auditability:
  - Double-entry accounting via **COA + Journal Engine + posting service**
  - Strong controls via **reconciliation, daily closing, approvals, and alerts**
  - Production-aware inventory via **recipes + production orders**
- Upgrade UI to an enterprise operational cockpit:
  - pagination/search/filter/saved views/bulk actions
  - workflow-first screens
  - consistent menu structure and contextual actions

> Current status: **Original Phase 1 & 2 baseline build is COMPLETE**. Enhancement **Phase 1A and 1B are COMPLETE**. Next work is **Enhancement Phase 1C → 1D**, then **Enhancement Phase 2A → 2B**.

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
- Cash movements and petty cash now auto-generate balanced journals
- Posting service function available (`auto_post_journal`)

4) **Cash & Bank Reconciliation**
- expected vs actual, difference, variance reason
- approval actions (approve/reject)
- mismatch WebSocket notification foundation
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

> Remaining Phase 1A follow-ups (moved into Phase 1D):
- Refactor **all** reporting calculations to be journal-driven (source-of-truth)
- Standardize server-side pagination/search/filter patterns across all finance lists

---

### Enhancement Phase 1B — Inventory Control Core (COMPLETED)
Goal: inventory becomes production-aware and sales-consumption-aware.

#### Scope (Features) — Delivered
1) **Recipe/BOM Engine**
- Recipe master + ingredient lines
- yield % + total cost calculation
- Consumption preview API
- Seeded **3 sample recipes**
- UI: Management → Inventory → Recipe & BOM

2) **Production / Prep Orders**
- Full lifecycle: draft/planned → in_progress → completed (cancel supported)
- On start: consumes ingredients based on recipe
- On completion: adds output stock and calculates yield %
- UI: Management → Inventory → Production Orders

> Remaining Phase 1B follow-ups:
- Upgrade stock movement into full enterprise transfer flow (transit tracking, transfer-in/out) as described in backlog (planned in Phase 1D/Phase 2B where portal separation is introduced).

---

### Enhancement Phase 1C — Control Layer (NEXT)
Goal: exception-first monitoring and operational investigation.

Scope:
1) **Variance Report**
- theoretical consumption vs actual stock movement
- variance by outlet/item/period
- threshold alerts when exceeding limits
- Menu:
  - Management → Reports → Variance
  - Outlet → Reports → Variance Snapshot

2) **Exception Alerts engine**
- alert types:
  - low stock
  - cash mismatch
  - overdue closing
  - missing submission
  - unusual expense
  - high variance
- delivery:
  - dashboard feed + badges
  - WebSocket notifications to targeted users
- Menu:
  - Management → Dashboard/Alerts
  - Outlet → Dashboard → Today Alerts

3) **Audit Trail operational upgrade**
- store before_value / after_value
- searchable by outlet/user/module/transaction
- drill-down detail view + export (Phase 1D UI)

Acceptance criteria:
- Variance report reconciles recipe-driven theoretical usage with stock movement deltas.
- Alerts can be generated deterministically from rules and shown in dashboards.
- Audit trail can prove who changed what with before/after diffs.

---

### Enhancement Phase 1D — UI/UX Best Practices (after 1C, applies to all modules)
Goal: make UI enterprise-grade for daily operations.

Scope:
- Server-side pagination (10/20/50) across all long lists:
  - sales summaries, cash movements, petty cash, stock movements, journal entries, audit trail, approvals, items
- Search:
  - global (command palette) + per module search
- Smart filters + saved views (per role)
- Sort + sticky headers + column visibility
- Bulk actions (approve many, export selected, batch close outlet)
- Empty/loading/error states (skeleton + CTA)
- Contextual actions only (role + page context)
- Responsive optimizations for outlet/tablet
- Workflow-first screens (daily tasks → actions → closing)
- Continue aligning menu structure to backlog (already started in Management)
- Reporting refactor milestone:
  - Move P&L/Cashflow/Balance Sheet calculations to be journal-driven

Acceptance criteria:
- All key lists have stable pagination + filters.
- Global search works and is role-scoped.
- Reports are consistent with journal totals.

---

### Enhancement Phase 2A — Scale & Control Lanjutan (Later)
Scope:
- Budgeting per outlet (budget vs actual, burn rate)
- Granular approvals (rule-based: type/amount/outlet/role, chains/escalation/delegation)
- Scheduled/Recurring transactions (draft auto-generated + review + approval)
- Multi-level reporting drill-down (global → city → outlet → category → item → transaction) with breadcrumbs

---

### Enhancement Phase 2B — Portal Expansion (functional, not placeholders) (Later)
Scope:
- **Kitchen Portal**: production tasks (kanban), batch completion, yield/loss
- **Warehouse Portal**: receiving, picking list, transfer requests, batch receipts

---

## 3) Next Actions (immediate)
1. Start **Enhancement Phase 1C** in this order:
   1) Define theoretical consumption source (recipes + production + sales summary)
   2) Implement variance computation services + endpoints
   3) Implement alert engine + WebSocket delivery + dashboard feed
   4) Upgrade audit trail schema (before/after) and retrofit logging in critical modules
2. Confirm variance policy for MVP:
   - which items tracked first (protein/high-cost first?)
   - variance threshold defaults per category/outlet
3. Confirm who receives which alerts (role routing):
   - outlet manager vs finance head vs inventory controller
4. After 1C is stable, proceed to **Phase 1D UI/UX** (pagination/search/filter/bulk actions + journal-driven reports)

---

## 4) Success Criteria
- All transactions produce correct **double-entry journals** and (eventually) reports derive from journals.
- Reconciliation + variance approvals exist and block final locking when unresolved.
- Daily outlet closing workflow exists (open → locked) with override + audit.
- Inventory supports recipes/production and produces variance reporting.
- Exception alerts highlight issues proactively (dashboard feed + WebSocket).
- UI is operational-grade: pagination, search/filter/saved views, bulk actions, workflow-first screens.
- Phase 1 & 2 enhancements delivered without missing any item from `/app/memory/FEATURE_BACKLOG.md`.
