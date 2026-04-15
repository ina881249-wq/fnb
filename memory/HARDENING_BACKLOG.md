# HARDENING BACKLOG — CTO Audit & Recommendations
# Prioritas: Hardening dulu sebelum expand ke modul baru
# Sprint order: A → B → C

---

## SPRINT A — UX & Control Hardening (PRIORITAS TERTINGGI)

### A1. Global Command Palette / Quick Search
- Ctrl+K shortcut, search: menu/dokumen/outlet/user/report
- Recent items, favorite menu
- Hasil langsung ke halaman target
- Global, tersedia di seluruh portal

### A2. Standardized Table System
- Komponen tabel standar: pagination, search, filter, sort, sticky header, column visibility, bulk action
- Terapkan ke SELURUH list page (journal, cash movement, inventory, approvals, audit, reports)
- Top bar konsisten, action button kanan atas, row action via kebab/drawer

### A3. Saved Views & Preset Filters
- Save filter preset per user
- Default view per role
- Reset to default, bookmark saved views
- Dropdown preset filter di semua halaman list dan report

### A4. Pagination Seluruh List
- Server-side pagination 10/20/50
- Page size selector
- Terapkan ke: sales summary, cash movements, petty cash, stock movements, journal, audit trail, approvals, items, recipes, production orders

### A5. Outlet Task Home
- Today tasks panel (tugas hari ini)
- Pending actions + deadline + completion state
- Personalized per role
- Task cards di atas, urut prioritas, CTA langsung ke halaman relevan
- Ganti dashboard outlet dari angka-oriented jadi task-oriented

---

## SPRINT B — Finance Control Strengthening

### B1. Journal Workbench
- Template journal (clone dari journal sebelumnya)
- Auto-balance indicator real-time
- Batch post banyak draft sekaligus
- Link ke source document
- Form: header + lines, debit/credit balance terlihat real-time
- Draft autosave, inline validation

### B2. Reconciliation Assistant / Bank Statement Import
- Import statement CSV/Excel
- Matching engine: nominal, tanggal, reference
- Manual override unmatched items
- Split view: statement vs ledger
- Match suggestion chips, highlight unmatched rows

### B3. Approval Delegation & SLA
- Delegation rule (approver cuti → delegate)
- SLA per approval type
- Escalation path otomatis jika lewat SLA
- Approval history log lengkap
- States: pending, approved, rejected, escalated, delegated

### B4. Bank Statement Import
- (Merged with B2 - Reconciliation Assistant)

### B5. Closing Wizard Refinement
- Stepper mandatory checkpoint
- Check state per step
- Auto validation before submit
- Reopen request flow
- Exception gating (block jika ada anomali)
- Final submission controls

---

## SPRINT C — Inventory/Production Maturity

### C1. Recipe Versioning & Approval
- Recipe version per item
- Status: draft, approved, active, archived
- Cost roll-up preview sebelum aktivasi
- Version timeline
- Side-by-side compare old vs new recipe

### C2. Production Kanban / Batch Board
- Board: planned → in_progress → hold → completed → closed
- Assign PIC & deadline
- Output, waste, yield, notes per batch
- Quick actions, batch detail drawer
- QC hold/release

### C3. Variance Root Cause Capture
- Reason code per variance item
- Root cause note
- Link ke waste, adjustment, production batch
- Badge severity + actionable notes
- Drill-down ke penyebab

### C4. Exception Center Upgrade
- Exception taxonomy (categories)
- Severity level yang lebih granular
- States: acknowledge → resolve → escalate
- Per-module alert routing
- Alert feed ringkas, urut severity
- One-click action dari alert

---

## AUDIT GAPS — Additional Items from Module Audit

### Auth & Security
- Password reset flow
- 2FA (optional for privileged roles)
- Session timeout policy
- Onboarding invite flow
- User profile security page

### Portal Navigation
- Breadcrumb di semua deep pages
- Pinned/favorite menu
- Saved last page (resume navigation)

### Executive Dashboard
- Ubah jadi "control tower": alert, exception, ranking outlet, quick drill-down
- Exception-first, action-oriented

### COA Management
- Template COA
- Import/export accounts
- Account mapping assistant
- Dimension tagging

### Cash & Bank
- Cash ledger view
- Transit account
- Settlement schedule

### Budgeting
- Budget versioning
- Approval cycle untuk budget
- Forecast rolling
- Remaining budget indicator
- Threshold alerts ketika mendekati/melebihi budget

### Items & Stock
- Barcode workflow (future)
- Lot/expiry tracking
- Item grouping matang
- Stock by location

### Stock Movement
- Transfer workflow formal (request → in-transit → received)
- Return-to-supplier
- Movement reason governance (mandatory reason codes)
- Document link per movement

### Reports Drill-Down
- Compare periods
- Saved report views
- Export preset
- Subscription (auto-send report)

### Outlet Sales Summary
- Speed input enhancement
- Auto-default values
- Keyboard navigation
- Duplicate last day shortcut
- Inline validation

### Outlet Petty Cash
- Upload receipt workflow
- Category quick pick
- Recurring petty templates

---

## EXECUTION ORDER

Phase 1 (Current): Sprint A — UX & Control Hardening
Phase 2 (Next): Sprint B — Finance Control Strengthening
Phase 3 (After): Sprint C — Inventory/Production Maturity
Phase 4 (Later): Auth & Security + remaining audit gaps
Phase 5 (Future): Portal Expansion (Kitchen, Warehouse)
