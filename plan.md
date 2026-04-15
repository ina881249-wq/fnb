# plan.md

## 1) Objectives
- Deliver an MVP **F&B Financial Control Platform** with a **modular-monolith** backend (FastAPI + MongoDB) and **React glassmorphism UI**.
- Deeply implement **Phase 1** (Core ERP + Finance/Accounting + Inventory + Outlet Portal + Reporting) and set the foundation + stubs for **Phase 2 portals** (Kitchen/Production, Cashier, Warehouse).
- Establish from day-1: **WebSocket**, **customizable RBAC** (custom roles + configurable permissions), **approval workflows**, **audit trail**, **PDF/Excel export/import**.
- Provide **portal selector login UX** and strict **outlet-scoped access control**; ship with **2–3 demo outlets** + sample data.

## 2) Implementation Steps

### Phase 1 — Core POC (Isolation) (must pass before full build)
**Core to prove:** outlet-scoped RBAC + portal access + approval + audit + WebSocket eventing (the control plane that everything depends on).

User stories:
1. As an admin, I can define a custom role with granular permissions so teams match real operations.
2. As a manager, I can only see outlets assigned to me so data remains isolated.
3. As an outlet staff, I can only log into the Outlet Portal for my outlet so mistakes are prevented.
4. As an approver, I can approve/reject a request and see it fully audited so controls are enforceable.
5. As a user, I see real-time status updates (WebSocket) for approvals so I don’t need to refresh.

Steps:
- Websearch best practices for: FastAPI modular monolith structure, Mongo RBAC modeling, WebSocket event bus patterns.
- Create a **minimal backend POC** (single file or minimal modules):
  - Entities: User, Outlet, Portal, Role, Permission, ApprovalRequest, AuditLog.
  - RBAC evaluator: `can(user, action, resource, outlet_id)`.
  - Portal login guard: user allowed portals + outlet scope.
  - Approval flow: submit → pending → approve/reject → immutable audit entries.
  - WebSocket: broadcast approval status changes to subscribed clients.
- Create a **minimal frontend POC** page set:
  - Portal selector screen (Mgmt/Outlet/Kitchen/Cashier/Warehouse; Phase-2 show Coming soon).
  - Login + one Approval inbox screen proving real-time updates.
- POC exit criteria: all stories above pass manually + via a small automated API test collection.

### Phase 2 — V1 App Development (build around proven core)
User stories:
1. As a user, I can pick a portal at login and clearly see which outlet I’m operating in.
2. As an admin, I can manage outlets, users, roles, permissions, and approval routes from one place.
3. As finance, I can record cash/bank/petty-cash movements and see accurate ledgers per outlet.
4. As inventory control, I can perform stock movements and conversions with traceability.
5. As executives, I can view drill-down dashboards and export reports to Excel/PDF.

Backend (modular monolith):
- Project structure: `routers/ domains/ services/ repositories/ models/` with clear boundaries.
- Core ERP:
  - Master data: outlets, items, accounts (COA minimal), users.
  - RBAC: custom roles, permission catalog, role assignment per portal and outlet.
  - Approval engine: configurable rules (by module/action/threshold) + inbox + state machine.
  - Audit trail: append-only audit log for all write actions.
  - WebSocket gateway: domain events (approvals, cash postings, stock movements).
- Finance & Accounting (Phase 1 deep):
  - Accounts: bank/outlet-cash/petty-cash/clearing.
  - Cash movements: in/out/transfer + references.
  - Settlement rules (PRD-R01) + outlet scoping (PRD-R02).
  - Period control: close/reopen with approvals (PRD-R04).
  - Minimal journal engine mapping for key events (cash, petty cash expense, settlement).
- Inventory (Phase 1 deep):
  - Item master + UOM.
  - Material hierarchy (raw/prep/sub-prep; extensible) (PRD-INV-01).
  - Conversions with yield/loss and lineage (PRD-INV-02, PRD-R03).
  - Movements: count, adjustment, waste, transfer (PRD-INV-03).
  - Valuation: start with weighted average per outlet (can revise later) (PRD-INV-04).
- Reporting:
  - Outlet P&L (MVP), cashflow, inventory valuation/movement; drill-down to transactions.
  - Export: Excel/PDF for all key reports.
- Import:
  - Excel import templates for master data (items, outlets, accounts) + validation errors.

Frontend (React glassmorphism):
- Shared UI kit (shadcn/ui + glass theme tokens) + layout per portal.
- Portal selector + auth screens.
- Management Portal:
  - Dashboard (KPIs + exception lists) + drill-down.
  - Admin (users/roles/permissions/outlets/approval rules).
  - Finance + Inventory + Reports sections.
- Outlet Portal:
  - Daily cash position + sales summary input (no POS) + petty cash expense submission.
  - Inventory quick actions (waste, count, transfer request).
- Phase 2 portals: show in selector; routes exist but “Coming soon”.

End Phase 2:
- Run 1 full E2E test pass: portal login → scoped data → create approval-needed transaction → approve → reporting/export.

### Phase 3 — Phase 2 Modules (deeper) + hardening
User stories:
1. As kitchen staff, I can record prep production and see required inputs so production is controlled.
2. As supervisors, I can approve production batches and see yield/loss so variance is visible.
3. As warehouse staff, I can receive stock and transfer to outlets so stock is accurate.
4. As cashiers, I can access a dedicated portal (even if POS is later) so UX is role-specific.
5. As admins, I can enable/disable portals per outlet so rollout is controlled.

Steps:
- Kitchen/Production (Phase 2):
  - Production batch entity tied to conversions; approvals; WebSocket updates.
- Warehouse portal (Phase 2):
  - Receiving + transfer-out workflows with approvals.
- Cashier portal (Phase 2):
  - Basic sales summary capture workflow (until POS integration) + outlet cash allocation.
- Strengthen reporting for new flows + exports.
- Add more robust validation, idempotency for postings, and performance indexes.

End Phase 3:
- E2E test pass including production + warehouse + cashier flows; regression on Phase 1.

### Phase 4 — Authentication + security + production readiness
User stories:
1. As a user, I can login via email/password securely and reset my password.
2. As an admin, I can enforce password policy and optionally enable 2FA for privileged roles.
3. As compliance, I can search audit logs by user/outlet/action so investigations are fast.
4. As finance, I can run period close confidently knowing postings are locked.
5. As ops, I can import/export safely with clear error feedback.

Steps:
- Implement full auth (JWT sessions), password reset, optional 2FA.
- Harden RBAC admin UX (permission matrix), add audit log search UI.
- Expand test coverage (API tests + UI smoke) + finalize demo data seeding.

## 3) Next Actions (immediate)
1. Confirm the **permission catalog** MVP list (modules/actions) for Phase 1–2.
2. Decide initial **inventory valuation** method for MVP (default: weighted average).
3. Build Phase 1 POC (RBAC + approval + audit + WebSocket) and validate with 2–3 demo outlets.
4. After POC passes, generate the V1 app skeleton (backend modules + frontend portal shell + theme).

## 4) Success Criteria
- Portal selector works; users can only access allowed portals and assigned outlets.
- Custom roles/permissions enforced on API + UI; outlet scoping is strict.
- Approval workflow functions end-to-end with immutable audit trail and WebSocket live updates.
- Phase 1 finance + inventory core flows work and produce drill-down reports.
- PDF/Excel export works for key reports; Excel import works for master data.
- Phase 2 portals are available (at least Coming soon) and Phase 2 core flows (kitchen/warehouse/cashier) function by end of Phase 3.
- One complete regression E2E test pass at the end of each phase with no critical breakages.
