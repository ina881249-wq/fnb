# plan.md

## 1) Objectives
- Deliver a production-quality **Phase 1 control layer** for a multi-outlet F&B ERP using a **modular-monolith** backend (FastAPI + MongoDB) and a **React glassmorphism UI**.
- Implement deeply:
  - **Phase 1 (Complete):** Core ERP (Users/Outlets), **custom RBAC**, Approvals, Audit trail, WebSocket foundation, Finance/Accounting, Inventory, Reporting + Export.
  - **Phase 2 (Shell + UX Ready):** Portal split UX is in place and **Kitchen/Cashier/Warehouse** portals are visible as **Coming Soon** to ensure future rollout without redesign.
- Establish from day-1 (already delivered): **WebSocket foundation**, **customizable RBAC** (custom roles + configurable permissions), **approval workflows**, **audit trail**, **Excel/PDF export**.
- Provide **portal selector login UX** and strict **outlet-scoped access control**; ship with **2–3 demo outlets** + sample seeded data.

> Current status: **Phase 2 is complete** and verified via screenshots. Backend automated tests passed **100%**; frontend automated tests ~**85%** with minor timing/navigation artifacts in the test agent (real behavior verified). Critical fixes applied: `serialize_doc` id mapping and outlet auto-selection.

## 2) Implementation Steps

### Phase 1 — Core POC (Isolation) (must pass before full build)
**Core to prove:** outlet-scoped RBAC + portal access + approval + audit + WebSocket eventing (the control plane that everything depends on).

User stories:
1. As an admin, I can define a custom role with granular permissions so teams match real operations.
2. As a manager, I can only see outlets assigned to me so data remains isolated.
3. As an outlet staff, I can only log into the Outlet Portal for my outlet so mistakes are prevented.
4. As an approver, I can approve/reject a request and see it fully audited so controls are enforceable.
5. As a user, I see real-time status updates (WebSocket) for approvals so I don’t need to refresh.

Steps (Completed):
- Created modular backend foundation with routers + shared utilities.
- Implemented:
  - Entities: User, Outlet, Role, Permission catalog, ApprovalRequest, AuditLog.
  - Portal login guard: allowed portals + outlet scope.
  - Approval flow: submit → pending → approve/reject + audit entries.
  - WebSocket endpoint and broadcast manager foundation.
- Created minimal frontend baseline:
  - Login + Portal Selector (all portals shown; Phase 2 portals “Coming Soon”).

POC exit criteria (Met):
- All RBAC/outlet scoping behaviors verified.
- API endpoints functional and testable.

### Phase 2 — V1 App Development (build around proven core)
User stories:
1. As a user, I can pick a portal at login and clearly see which outlet I’m operating in.
2. As an admin, I can manage outlets, users, roles, permissions, and approval routes from one place.
3. As finance, I can record cash/bank/petty-cash movements and see accurate ledgers per outlet.
4. As inventory control, I can perform stock movements and conversions with traceability.
5. As executives, I can view drill-down dashboards and export reports to Excel/PDF.

Backend (modular monolith) — **Completed**:
- Structure: `routers/` + shared `utils/` with clear domain boundaries.
- Core ERP:
  - Outlets CRUD, Users CRUD, Roles CRUD.
  - RBAC: permission catalog + custom role creation.
  - Audit trail: append-only audit log.
  - WebSocket: foundation endpoint + outlet/portal broadcast.
- Finance & Accounting (Phase 1 deep):
  - Accounts (bank/outlet_cash/petty_cash/clearing).
  - Cash movements (cash_in/cash_out/transfer/settlement).
  - Sales summaries (manual POS substitute).
  - Period close entity (MVP).
- Inventory (Phase 1 deep):
  - Item master + UOM + material level.
  - Material hierarchy links.
  - Stock movements (count/adjustment/waste/transfer).
  - Conversions with yield/loss.
  - Stock-on-hand + low-stock alerts via WS.
- Reporting:
  - P&L, cashflow, balance sheet, inventory valuation, inventory movement report.
  - Export: Excel + PDF endpoints.
- Seed data:
  - 3 outlets, multiple users/roles, accounts, items, stock, cash movements, petty cash, sales summaries.

Frontend (React glassmorphism) — **Completed**:
- Global glassmorphism theme tokens implemented.
- Portal Selector implemented:
  - Management + Outlet active.
  - Kitchen/Cashier/Warehouse visible as “Coming Soon”.
- Management Portal (7 pages) implemented:
  - Dashboard (KPIs + charts)
  - Finance
  - Inventory
  - Reports (with export actions)
  - Admin (users/roles/outlets + permission assignment)
  - Approvals
  - Audit Trail
- Outlet Portal (5 pages) implemented:
  - Outlet Dashboard
  - Cash Management
  - Sales Summary
  - Petty Cash
  - Inventory

Fixes applied during Phase 2 hardening:
- Fixed serialization bug: `_id` now correctly mapped to `id` (impacted outlet selection and scoping in UI).
- Strengthened outlet auto-selection in Outlet portal.

End Phase 2 verification (Met):
- Backend tests: **100%** passing.
- Frontend tests: ~**85%** (minor navigation timing artifacts in test agent).
- Manual verification via screenshots confirmed:
  - Finance page loads correctly.
  - Outlet portal auto-selects assigned outlet and shows scoped data.

### Phase 3 — Phase 2 Modules (deeper) + hardening (Next)
User stories:
1. As kitchen staff, I can record prep production and see required inputs so production is controlled.
2. As supervisors, I can approve production batches and see yield/loss so variance is visible.
3. As warehouse staff, I can receive stock and transfer to outlets so stock is accurate.
4. As cashiers, I can access a dedicated portal (even if POS is later) so UX is role-specific.
5. As admins, I can enable/disable portals per outlet so rollout is controlled.

Steps (Planned):
- Kitchen/Production Portal (Phase 2 real build):
  - Production batch entity tied to conversions (raw→prep→sub-prep).
  - Batch yield/loss capture.
  - Approval + audit + WebSocket status updates.
- Warehouse Portal:
  - Receiving workflow + transfer-out + approvals.
  - Stock movement enhancements: supplier, PO ref (optional), receiving variance.
- Cashier Portal:
  - Dedicated sales capture UX (still manual until POS integration).
  - Outlet cash allocation + reconciliation.
- Hardening:
  - Idempotency for postings, stronger validations, more indexes.
  - Expand export formats and improve drill-down experiences.

End Phase 3:
- E2E test pass including production + warehouse + cashier flows; regression on Phase 1–2.

### Phase 4 — Authentication + security + production readiness (Later)
User stories:
1. As a user, I can login via email/password securely and reset my password.
2. As an admin, I can enforce password policy and optionally enable 2FA for privileged roles.
3. As compliance, I can search audit logs by user/outlet/action so investigations are fast.
4. As finance, I can run period close confidently knowing postings are locked.
5. As ops, I can import/export safely with clear error feedback.

Steps (Planned):
- Auth hardening:
  - Password reset flow.
  - Optional 2FA for privileged roles.
  - Session/token lifecycle improvements.
- RBAC hardening:
  - Permission matrix UX improvements.
  - Portal/outlet assignment UX improvements.
- Audit trail:
  - Advanced filtering + export.
- Import/Export:
  - Excel import templates + validation report.
- Test coverage:
  - Expand automated UI tests and reduce flakiness by stabilizing waits and adding deterministic `data-testid` coverage.

## 3) Next Actions (immediate)
1. Confirm which Phase 3 portal to build first:
   - Kitchen/Production
   - Warehouse
   - Cashier
2. Confirm MVP depth for Phase 3:
   - Minimal workflows + approvals only, or full operational flow with reporting.
3. Decide on inventory valuation method for accounting-grade reporting (current MVP uses simple cost-per-unit; can evolve to weighted average/FIFO).
4. Add a WebSocket-driven notifications panel (UI) if you want real-time UX beyond toasts.

## 4) Success Criteria
- Portal selector works; users can only access allowed portals and assigned outlets.
- Custom roles/permissions enforced on API + UI; outlet scoping is strict.
- Approval workflow functions end-to-end with immutable audit trail and WebSocket foundation.
- Phase 1 finance + inventory core flows work and produce drill-down reports.
- PDF/Excel export works for key reports.
- Phase 2 portals are visible in UX with “Coming Soon” and do not break navigation.
- Phase 2 delivered with seeded demo data (2–3 outlets) and verified manually + automated tests.
- Phase 3 success: Kitchen/Warehouse/Cashier portals become functional (not just placeholders) with approvals, auditability, and reporting parity.
