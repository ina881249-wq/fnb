# Technical Design Document (TDD)
## F&B Financial Control Platform — Lusi & Pakan

---

## A. Document Control

| Field | Value |
|---|---|
| Nama dokumen | F&B ERP — Technical Design Document |
| Versi | 1.0 |
| Tanggal | 2026-04-19 |
| Pemilik dokumen | Engineering Team |
| Reviewer / approver | CTO, Product Owner |
| Status | Active |

### Riwayat Perubahan

| Versi | Tanggal | Penulis | Ringkasan |
|---|---|---|---|
| 0.1 | 2026-01-15 | Engineering | Initial MVP architecture (3 portal) |
| 0.5 | 2026-02-20 | Engineering | Phase 1C-1D + Phase 2A (drill-down, budget, granular approvals) |
| 0.8 | 2026-03-10 | Engineering | Sprint A/B/C hardening, DataTable, CommandPalette, Executive portal |
| 0.9 | 2026-04-05 | Engineering | Cashier + Kitchen portal, 2FA, WS real-time, ESC/POS integration, Lusi & Pakan reseed |
| **1.0** | **2026-04-19** | Engineering | Tier 2 — Journal-driven reports + SCE + Financial Ratios + Notification Center + Advanced Warehouse (PO/threshold/GridFS) |

---

## B. System Overview

### Nama Sistem
**F&B Financial Control Platform** — sistem ERP modular untuk operasional F&B multi-outlet multi-kota yang menggabungkan finance/accounting, inventory, POS, dan kitchen operations dalam satu platform.

### Tujuan Sistem
Memberikan **single source of truth** finansial & operasional untuk bisnis F&B yang memiliki beberapa outlet. Menjembatani gap antara operasional harian (POS, kitchen, warehouse) dengan laporan keuangan formal (P&L, Neraca, Arus Kas, Perubahan Ekuitas) melalui journal-entry engine otomatis berbasis double-entry accounting.

### Scope Dokumen
- Semua modul yang **sudah live** pada versi 1.0 (Management, Outlet, Executive, Cashier, Kitchen, Warehouse)
- Arsitektur backend (FastAPI + MongoDB) dan frontend (React SPA + Tailwind + shadcn/ui)
- Integrasi Emergent LLM, Web Serial API (ESC/POS), WebSocket real-time
- **Tidak termasuk**: Midtrans payment gateway (deferred hingga API keys tersedia)

### Definisi Istilah

| Istilah | Arti |
|---|---|
| **Outlet** | Satu titik penjualan fisik (mis. Lusi & Pakan Denpasar) |
| **GRN** | Goods Receipt Note — bukti terima barang dari supplier |
| **PO** | Purchase Order — pesanan pembelian ke supplier |
| **COA** | Chart of Accounts — daftar akun akuntansi |
| **SCE** | Statement of Changes in Equity — Laporan Perubahan Ekuitas |
| **KDS** | Kitchen Display System |
| **Backfill** | Proses generate jurnal dari transaksi operasional historis |
| **Double-entry** | Setiap jurnal harus memiliki total debit = total credit |
| **Idempotent** | Endpoint aman dipanggil berulang tanpa efek samping ganda |

### Ringkasan Arsitektur
- **Modular Monolith backend** (FastAPI) — semua modul dalam 1 deployment, tapi dipisah via router
- **React SPA frontend** dengan 6 portal terpisah berbagi context (Auth, Theme, Lang)
- **MongoDB** sebagai primary database + GridFS untuk file attachments
- **WebSocket** untuk kitchen real-time + notification push
- **Custom RBAC** berbasis role+permission+outlet_access, bukan off-the-shelf

### Prinsip Desain Utama
1. **Journal-driven**: semua angka di laporan keuangan berasal dari `journals` + `journal_lines`, bukan dari collection operasional.
2. **Idempotent auto-posting**: transaksi operasional auto-generate journal, dengan dedup via `(source_type, source_id)`.
3. **Outlet-scoped RBAC**: non-superadmin hanya bisa akses outlet dalam `outlet_access` mereka.
4. **Indonesian first**: UI default Indonesia, toggle EN tersedia. Format Rupiah konsisten.
5. **Glassmorphism UI**: dark/light mode, tokens via CSS variables, Space Grotesk + Inter typography.
6. **Mobile-first untuk kasir/kitchen**, desktop-first untuk management/exec.

---

## C. Business Context

### Problem Statement
Bisnis F&B multi-outlet kesulitan konsolidasi keuangan karena:
- Closing harian manual rawan human error.
- Tidak ada standar double-entry, sulit audit.
- Laporan performa antar outlet tidak terstandar.
- Stok hilang/waste sulit ditelusuri.

### Business Objective
- **Transparansi finansial real-time** bagi owner/CFO tanpa menunggu akhir bulan
- **Kontrol outlet** dengan approval workflow (cash movements, adjustment besar, closing)
- **Efisiensi operasional** via POS tablet + KDS + thermal printer integration
- **Audit-readiness**: setiap rupiah punya journal entry

### User Goals

| Role | Goal |
|---|---|
| Owner/CEO | Tahu performa semua outlet dalam 1 layar (Executive Portal) |
| CFO/Finance Head | Laporan audit-grade, reconcile bank, approve closing |
| Outlet Manager | Input sales harian, kelola petty cash, submit closing |
| Kasir | Layani customer cepat, print struk, tutup shift |
| Chef/Kitchen | Lihat antrian order real-time, tandai selesai |
| Warehouse Keeper | Terima barang, transfer antar outlet, adjustment stok |

### Process yang Didukung Sistem
1. **Sales-to-cash**: POS → kitchen prep → payment → shift close → sales summary → auto-journal
2. **Procure-to-pay**: PO → approval → receive (GRN) → stock update → AP journal
3. **Inventory-to-kitchen**: Receipt → recipe consumption → production → waste tracking
4. **Period close**: Daily closing (stepper) → management approval → day lock
5. **Variance monitoring**: Auto-alerts on low stock, overdue closing, negative variance

### Critical Business Rules
1. **Double-entry invariant**: setiap `journals.status='posted'` MUST have `sum(debit)=sum(credit)`
2. **Outlet scope**: user hanya melihat data outlet pada `outlet_access` kecuali superadmin
3. **Closing lock**: setelah day locked, tidak boleh ada transaksi baru dengan tanggal tsb kecuali override super admin
4. **Adjustment threshold**: adjustment > outlet threshold → `pending_approval`, stock belum dipotong sampai approved
5. **PO state machine**: draft→submitted→approved→partial_received→received→closed (non-reversible)
6. **Session timeout** & **password policy** wajib aktif untuk semua user

---

## D. Module Breakdown

### Daftar Modul Utama

| Kode | Modul | Status | Portal Primer |
|---|---|---|---|
| M-AUTH | Authentication & RBAC | ✅ Live | Semua |
| M-CORE | Core (Users, Outlets, Roles) | ✅ Live | Management |
| M-FIN | Finance & Accounting | ✅ Live | Management, Outlet |
| M-COA | Chart of Accounts | ✅ Live | Management |
| M-JOURNAL | Journal Engine | ✅ Live | Management |
| M-RECON | Bank Reconciliation | ✅ Live | Management |
| M-CLOSE | Daily Closing | ✅ Live | Outlet, Management |
| M-BUDGET | Budget Management | ✅ Live (v1) | Management |
| M-INV | Inventory | ✅ Live | Management, Warehouse |
| M-RECIPE | Recipe / BOM | ✅ Live | Management |
| M-PROD | Production (Kitchen) | ✅ Live | Management |
| M-VAR | Variance Reporting | ✅ Live | Management |
| M-ALERT | Alerts Engine | ✅ Live | Management |
| M-APPR | Approvals | ✅ Live | Management |
| M-WH | Warehouse Operations | ✅ Live | Warehouse |
| M-PO | Purchase Orders | ✅ Live (v1) | Warehouse |
| M-POS | Cashier / POS | ✅ Live | Cashier |
| M-KDS | Kitchen Display | ✅ Live | Kitchen |
| M-EXEC | Executive Dashboard | ✅ Live | Executive |
| M-REPORT | Financial Reports | ✅ Live (journal-driven) | Management |
| M-NOTIF | Notification Center | ✅ Live | Semua |
| M-AI | AI Insights (Emergent LLM) | ✅ Live | Executive |
| M-HW | Hardware (ESC/POS printer) | ✅ Live | Cashier |
| M-ATTACH | File Attachments (GridFS) | ✅ Live | Warehouse |
| M-ADMIN | Admin Utilities (backfill, coverage) | ✅ Live | Management |

### Modul yang Belum Dibangun / Partial

| Kode | Modul | Status | Catatan |
|---|---|---|---|
| M-PAY | Payment Gateway (Midtrans QRIS) | ❌ Not Started | Menunggu API keys dari client |
| M-BUDGET-V2 | Budget Versioning + Approval Cycle | ⏳ Planned | Lihat Enhancement Backlog |
| M-AP | Accounts Payable module | ⏳ Partial | Tracked via journals, no dedicated UI |
| M-AR | Accounts Receivable module | ⏳ Partial | Tidak ada credit sales yet |
| M-PAYROLL | Payroll / HR | ❌ Not Started | Out of scope |
| M-TAX | Tax compliance (PPh/PPN) | ❌ Not Started | Out of scope v1 |

### Ketergantungan Antar Modul

```
M-AUTH (foundation)
  └─> M-CORE (user→outlet)
        ├─> M-FIN ──> M-JOURNAL <── M-WH / M-POS / M-CLOSE (auto-post)
        │                 └─> M-REPORT (journal-driven)
        ├─> M-INV <── M-RECIPE ──> M-PROD
        ├─> M-APPR <── M-WH (adjustment), M-CLOSE
        ├─> M-ALERT ──> M-NOTIF ──> WebSocket ──> All portals
        ├─> M-POS ──> M-KDS (via WS) ──> M-HW (printer)
        └─> M-EXEC ──> M-AI (Emergent LLM)
```

---

## E. Functional Specification per Module

### M-AUTH: Authentication & RBAC

| Aspek | Spesifikasi |
|---|---|
| **Tujuan** | Autentikasi user dengan JWT, otorisasi berbasis permission + outlet_access + portal_access |
| **User Role** | Semua |
| **Input** | email, password, (opsional) TOTP code, invite token |
| **Output** | access_token JWT, user object (permissions, outlet_access, portal_access) |
| **Flow** | Login → validasi password (bcrypt) → jika 2fa_enabled minta TOTP → issue JWT (TTL 8h) |
| **Validation** | password policy (min 8, uppercase, digit), TOTP window ±30s, rate limit login |
| **Exception** | Account locked after 5 failed attempts (15 min cooldown), expired invite token |
| **Permission** | Public (login), user-scope (me, logout, change-password, 2fa) |
| **Audit** | Setiap login (success/fail), logout, password change, 2fa enable/disable |

### M-FIN: Finance & Accounting

| Aspek | Spesifikasi |
|---|---|
| **Tujuan** | Input sales summary harian, petty cash, cash movements, dan trigger auto-journal |
| **User Role** | Finance Head, Outlet Manager, Cashier (indirectly via shift close) |
| **Input** | Date, outlet_id, total_sales, cash/card/online/other split, food/beverage split |
| **Output** | Sales summary doc + auto-posted journal (Dr Cash/Bank / Cr Revenue) |
| **Flow** | Input → validate period not locked → persist → trigger `post_sales_summary_journal` → notify if anomaly |
| **Validation** | Total = sum of components, date dalam periode terbuka, non-negative |
| **Exception** | Duplicate entry untuk (outlet, date) → update + repost journal (force=True) |
| **Permission** | `finance.sales.input` + outlet_access |
| **Audit** | Setiap create/update sales summary + petty cash + cash movement |

### M-JOURNAL: Journal Engine

| Aspek | Spesifikasi |
|---|---|
| **Tujuan** | Posting jurnal double-entry (manual atau auto), validasi keseimbangan debit=credit |
| **User Role** | Finance Head, Accountant, System (auto-post) |
| **Input** | posting_date, source_type, lines[]{account_id, debit, credit, description} |
| **Output** | Journal dengan status `draft` atau `posted`, journal_lines records |
| **Flow** | Receive payload → validate balance → generate journal_number → insert journals + journal_lines → post → (optional) reverse |
| **Validation** | `sum(debit)==sum(credit)`, minimum 2 lines, accounts must exist |
| **Exception** | Imbalance → return 400; locked period → require override permission |
| **Permission** | `journal.post` + `journal.reverse` untuk reversal |
| **Audit** | Full journal history tak boleh dihapus, reversal = new journal with negative amounts |

### M-REPORT: Financial Reports (Journal-Driven)

| Aspek | Spesifikasi |
|---|---|
| **Tujuan** | Hasilkan P&L, Neraca, Arus Kas, Perubahan Ekuitas, Trial Balance, GL, Financial Ratios, Revenue Trend — semua dari `journals` |
| **User Role** | Finance Head, Manager, Executive |
| **Input** | period_start, period_end, outlet_id, granularity |
| **Output** | JSON dengan breakdowns, totals, balance_check, by_outlet, by_category |
| **Flow** | Query posted journals (scoped) → aggregate journal_lines by account → group by account_type → compute |
| **Validation** | period_start ≤ period_end, outlet_id in user's access |
| **Exception** | Empty period → return zero totals dengan journal_count=0 |
| **Permission** | `reports.view` + outlet_access |
| **Audit** | Report generation not logged (read-only); export Excel/PDF logged |

### M-WH: Warehouse Operations + M-PO: Purchase Orders

| Aspek | Spesifikasi |
|---|---|
| **Tujuan** | Kelola procure-to-pay: PO → approve → receive (GRN) → stock update → journal |
| **User Role** | Warehouse Keeper, Outlet Manager, Finance approver |
| **Input (PO)** | supplier_id, outlet_id, expected_date, lines[]{item_id, qty, unit_cost} |
| **Input (Receive)** | lines[]{item_id, qty_received, unit_cost (optional override)} |
| **Output** | PO number, GRN number, stock movements, auto-posted journal |
| **Flow PO** | Create(draft) → submit → approve → receive (partial/full) → close |
| **Flow Adjustment** | Create → if value>threshold: pending_approval; else: posted → apply stock + journal |
| **Validation** | State machine transitions, qty ≤ remaining, threshold comparison |
| **Exception** | Invalid transition → 400; missing COA (AP, inventory) → skip journal (log warning) |
| **Permission** | `warehouse.po.create/approve/receive`, `warehouse.adjustment.create/approve` |
| **Audit** | Setiap status change PO/adjustment, attachment upload/delete |

### M-POS: Cashier / POS

| Aspek | Spesifikasi |
|---|---|
| **Tujuan** | POS tablet-first untuk kasir: order → kitchen push → payment → shift close |
| **User Role** | Cashier |
| **Input** | Menu items + qty + modifiers, payment method, tendered amount |
| **Output** | POS order, kitchen ticket (via WS), receipt print (ESC/POS), sales summary on shift close |
| **Flow** | Open shift → build cart → confirm order → print kitchen ticket (WS broadcast) → process payment → print receipt → close shift → generate sales summary → auto-journal |
| **Validation** | Shift must be open, menu/price valid, payment ≥ total |
| **Exception** | Printer offline → fallback `window.print()`; WS disconnect → retry with buffer |
| **Permission** | `pos.operate` + outlet_access |
| **Audit** | Every order, void, refund, shift open/close |

### M-KDS: Kitchen Display System

| Aspek | Spesifikasi |
|---|---|
| **Tujuan** | Antrean order real-time untuk tim dapur dengan aksi in_progress/ready |
| **User Role** | Chef, Kitchen staff |
| **Input** | WS event `kitchen_ticket_new` dari POS |
| **Output** | Kanban columns: new → in_progress → ready → served |
| **Flow** | Subscribe `/ws/kitchen/{outlet_id}` → render ticket cards → chef tap status → emit update WS |
| **Validation** | Ticket ownership (outlet scope) |
| **Exception** | WS reconnect on drop, cache last 50 tickets locally |
| **Permission** | `kitchen.operate` + outlet_access |
| **Audit** | Ticket state transitions |

### M-NOTIF: Notification Center

| Aspek | Spesifikasi |
|---|---|
| **Tujuan** | Push notifikasi real-time ke user sesuai portal/outlet/permission |
| **User Role** | Semua |
| **Input** | Emit dari approval/alert/closing/warehouse/POS flows |
| **Output** | Notifications doc + WS broadcast + bell badge |
| **Flow** | Event occur → `create_notification()` → insert doc → WS `send_to_user` / `broadcast_to_outlet` / `broadcast_all` → frontend bell update |
| **Validation** | severity in [info, warning, critical, success], link valid relative path |
| **Exception** | WS failed → rely on 30s polling fallback |
| **Permission** | Read: user scope (personal + outlet + portal broadcast); admin `notifications.test` |
| **Audit** | Not explicitly audited (audit via underlying event) |

*(Modul lain disingkat untuk brevity; struktur sama: Tujuan / User / Input-Output / Flow / Validation / Exception / Permission / Audit.)*

---

## F. Technical Architecture

### High-Level Architecture

```
   ┌────────────────────────────────────────────────────────────┐
   │   Browser / Tablet (React SPA, shadcn/ui, Tailwind)       │
   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
   │  │ Mgmt     │ │ Outlet   │ │ Cashier  │ │ Kitchen  │ ... │
   │  │ Layout   │ │ Layout   │ │ Layout   │ │ Layout   │     │
   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
   │       │   Context (Auth, Theme, Lang)                       │
   └───────┼────────────────────────────────────────────────────┘
           │ HTTPS (REST /api/*) + WSS (/ws/{token})
           ▼
   ┌────────────────────────────────────────────────────────────┐
   │   K8s Ingress (/api → backend:8001, else → frontend:3000)  │
   └───────┼────────────────────────────────────────────────────┘
           ▼
   ┌────────────────────────────────────────────────────────────┐
   │   FastAPI Backend (uvicorn)                                │
   │   ├── Auth + RBAC middleware                               │
   │   ├── Routers: auth, core, finance, inventory, coa,        │
   │   │    journal, reports, warehouse, cashier, kitchen,      │
   │   │    executive, notifications, admin, ai, approvals,     │
   │   │    closing, alerts, budget, variance, reconciliation   │
   │   ├── Utils: posting_service, notification_service,        │
   │   │    audit, export, helpers                              │
   │   └── WebSocketManager (broadcast_all/outlet/user)         │
   └───────┼────────────────────────────────────────────────────┘
           ▼
   ┌──────────────────────┐       ┌─────────────────────────┐
   │ MongoDB (Motor)      │       │  Emergent LLM API       │
   │ ├─ collections       │       │  (openai/anthropic/     │
   │ └─ GridFS bucket     │       │   gemini via SDK)       │
   │    (attachments)     │       └─────────────────────────┘
   └──────────────────────┘
```

### Frontend Structure
```
/app/frontend/src/
├── api/            # axios client + interceptors (token)
├── components/
│   ├── ui/         # shadcn primitives
│   ├── common/     # CommandPalette, DataTable, NotificationBell
│   └── reports/    # PeriodPicker, ReportCharts, FinancialRatiosBar, GLModal
├── context/        # AuthContext, ThemeContext, LangContext
├── hooks/          # useWebSocket
├── layouts/        # 6 portal layouts
├── pages/
│   ├── management/   # Finance, COA, Journals, Reports, Admin, ...
│   ├── outlet/       # OutletDashboard, DailyClosing, SalesSummary, ...
│   ├── executive/    # ExecOverview, ControlTower, AI chat/insights
│   ├── cashier/      # POSPage (tablet-optimized)
│   ├── kitchen/      # KitchenQueue (WS-driven KDS)
│   └── warehouse/    # PurchaseOrders, Receiving, Transfers, Adjustments, Settings
├── services/       # escposPrinter (Web Serial API)
└── App.js          # routes + ProtectedRoute
```

### Backend Structure
```
/app/backend/
├── server.py              # FastAPI app entry (lifespan, CORS, ws endpoint)
├── auth.py                # JWT + permission checking
├── database.py            # Mongo client + collections + GridFS bucket
├── models.py              # Pydantic models
├── websocket_manager.py   # WS connection registry + broadcast helpers
├── utils/
│   ├── audit.py           # log_audit, serialize_doc helpers
│   ├── helpers.py         # now_utc, etc.
│   ├── export.py          # Excel/PDF generators
│   ├── posting_service.py # Auto-journal posting (sales, petty, cash_mv, receipt, waste, adj)
│   └── notification_service.py  # create_notification + notify_by_role
├── routers/               # 1 file per modul (~25 files)
└── seed_data.py / reseed_lusipakan.py
```

### Database Structure
- MongoDB single DB (`DB_NAME` env, default `test_database`)
- ~40 collections, all use `_id: ObjectId` primary key
- UUIDs used as logical identifiers di beberapa tempat untuk portability
- Indexes on common filter fields (outlet_id, posting_date, status, email)

### Service / Worker / Scheduler
- **Tidak ada worker queue / cron terpisah** (monolith mode)
- Alert generation: manual trigger via `POST /api/alerts/generate`
- Future: migrate to Celery + Redis untuk scheduled job (lihat Enhancement Backlog)

### Integration Layer
- **Emergent LLM** (HTTP) — AI insights, forecast, anomalies via `emergentintegrations` SDK
- **Web Serial API** (browser-side) — ESC/POS thermal printer
- **WebSocket** (native, no broker) — kitchen + notifications
- **Midtrans QRIS** — planned, deferred

### Environment Structure

| Env | Purpose | Status |
|---|---|---|
| Preview | Emergent preview URL `outlet-hub-system.preview.emergentagent.com` | Active |
| Staging | - | Not provisioned |
| Production | - | Not provisioned |

### Deployment Topology
- K8s cluster dengan Ingress routing `/api/*` → backend pod:8001, lainnya → frontend pod:3000
- Supervisor manages 2 processes per pod (backend + frontend dev server / static serve)
- MongoDB single-instance (no replica set in preview)

---

## G. Data Architecture

### Entity List (Primary)
1. **users** — auth & profile
2. **roles** — RBAC roles
3. **outlets** — physical stores
4. **items** — inventory SKUs
5. **recipes** — BOM mapping menu → ingredients
6. **suppliers** — vendor master
7. **coa_accounts** — chart of accounts
8. **journals** / **journal_lines** — double-entry ledger
9. **sales_summaries** — daily aggregate per outlet
10. **petty_cash** — outlet small cash expenses
11. **cash_movements** — settlements, cash in/out
12. **warehouse_receipts** / **warehouse_transfers** / **warehouse_adjustments** / **warehouse_counts**
13. **purchase_orders** / **po_lines**
14. **warehouse_settings** — per-outlet thresholds
15. **stock_on_hand** / **stock_movements** — current stock + history
16. **production_orders** — kitchen prep batches
17. **pos_orders** / **cashier_shifts** — POS transactions
18. **kitchen_tickets** — KDS queue
19. **approvals** / **approval_rules** — approval workflow
20. **alerts** — auto-generated warnings
21. **budgets** — period targets per outlet
22. **notifications** — notification feed
23. **sessions** — user session log (2FA hardening)
24. **daily_closings** — closing stepper state
25. **bank_statements** / **bank_matches** — reconciliation
26. **audit_logs** — full audit trail
27. **attachments** (GridFS) — file storage

### ERD Summary (Key Relationships)

```
users ─── outlet_access[] ──> outlets
users ─── role_ids[] ──> roles
outlets <── sales_summaries, petty_cash, cash_movements, journals, pos_orders
items <── recipes.ingredients[], stock_on_hand, stock_movements, receipt_lines, po_lines
journals 1──N journal_lines
journal_lines.account_id ──> coa_accounts._id
purchase_orders 1──N po_lines, 1──N warehouse_receipts (optional)
production_orders.recipe_id ──> recipes
approvals.ref_id ──> (polymorphic, ref_type指定)
notifications ─── user_id/outlet_id/portal_scope (scoped delivery)
```

### Data Lifecycle
- **Transactional**: sales, POS orders, petty cash, journals — immutable setelah posted (use reversal untuk koreksi)
- **Master data**: items, recipes, outlets, users — soft-delete via `is_active=false`, no hard delete
- **Audit log**: append-only, tidak pernah diupdate/dihapus
- **Attachments**: hard-delete manual via endpoint `DELETE /api/warehouse/attachments/{id}`

### Source of Truth
- **Financial reports** → journals + journal_lines (bukan sales_summaries)
- **Current stock** → stock_on_hand (materialized dari stock_movements)
- **User permissions** → roles.permissions ∪ users.permissions (direct override)
- **Outlet active** → outlets.status='active'

### Master vs Transactional

| Master | Transactional |
|---|---|
| users, roles, outlets, items, recipes, coa_accounts, suppliers | sales_summaries, petty_cash, cash_movements, journals, journal_lines, stock_movements, pos_orders, production_orders, approvals, alerts, notifications |

### Data Ownership

| Data | Owner |
|---|---|
| users/roles | Super Admin |
| outlets/items/recipes | Management (HQ) |
| sales, petty cash, cash movements | Outlet Manager |
| journals, COA | Finance |
| PO, receipt, transfer | Warehouse |
| POS orders | Cashier |

### Data Retention Rule
- Audit logs: 10 tahun (regulatory)
- Journals: **forever** (source of truth)
- POS orders / kitchen tickets: 2 tahun hot, archive after
- Notifications: 90 hari (auto-prune future)

---

## H. Data Dictionary (Selected Critical Tables)

### `journals`
Fungsi: Header jurnal akuntansi double-entry.

| Field | Type | Required | Default | Note |
|---|---|---|---|---|
| _id | ObjectId | Yes | auto | PK |
| journal_number | string | Yes | - | Format: `JV-YYYYMMDD-####` |
| posting_date | string (YYYY-MM-DD) | Yes | - | Tanggal efektif |
| source_type | string | Yes | - | `manual` / `sales_summary` / `petty_cash` / `cash_movement` / `warehouse_receipt` / `warehouse_adjustment` / `kitchen_waste` / `production` |
| source_id | string | Yes* | - | FK polymorphic ke source record |
| description | string | Yes | - | Human-readable |
| outlet_id | string / null | No | null | Scope; null = HQ |
| status | string | Yes | `draft` | `draft` / `posted` / `reversed` |
| total_debit | float | Yes | 0 | Sum of lines.debit |
| total_credit | float | Yes | 0 | Sum of lines.credit (harus ≡ total_debit) |
| created_by | string | Yes | - | user_id |
| created_at | datetime | Yes | now_utc | |
| posted_at | datetime | No | null | |
| reversed_by_journal_id | string | No | null | Untuk reversal |

Index: `(posting_date, status)`, `(source_type, source_id)`, `(outlet_id, posting_date)`

### `journal_lines`
Fungsi: Detail baris debit/credit per jurnal.

| Field | Type | Required | Note |
|---|---|---|---|
| _id | ObjectId | Yes | |
| journal_id | string | Yes | FK → journals._id |
| account_id | string | Yes | FK → coa_accounts._id |
| account_code | string | Yes | Denormalized for fast reporting |
| account_name | string | Yes | Denormalized |
| debit | float | Yes | ≥ 0 |
| credit | float | Yes | ≥ 0 (exactly one of debit/credit > 0 per line) |
| description | string | No | Memo per line |

Index: `journal_id`, `account_id`

### `purchase_orders`
| Field | Type | Note |
|---|---|---|
| po_number | string | `PO-YYYYMMDD-####` |
| outlet_id | string | FK outlets |
| supplier_id / supplier_name | string | Denormalized for display |
| expected_date | string (YYYY-MM-DD) | Optional |
| lines[] | array | {item_id, item_name, qty, unit_cost, uom, line_total, received_qty} |
| total_amount | float | Sum of line_total |
| status | enum | `draft` / `submitted` / `approved` / `partial_received` / `received` / `cancelled` / `closed` |
| attachments[] | array | {file_id, filename, content_type, size, uploaded_by_name, uploaded_at} |
| created_by / approved_by / closed_by | string | Audit fields |

### `warehouse_adjustments`
| Field | Type | Note |
|---|---|---|
| adjustment_number | string | `ADJ-YYYYMMDD-####` |
| outlet_id | string | |
| category | enum | `manual` / `correction` / `damage` / `theft` / `expired` / `other` |
| reason | string | Required |
| lines[] | array | {item_id, current_qty, new_qty, delta, value_impact, reason} |
| total_value_abs | float | Sum of \|value_impact\| |
| threshold_applied | float | Snapshot of outlet threshold at create time |
| status | enum | `posted` / `pending_approval` / `rejected` |
| approved_by / rejected_by | string | |
| attachments[] | array | Same shape as PO |

### `notifications`
| Field | Type | Note |
|---|---|---|
| user_id | string / null | Personal target or null for broadcast |
| outlet_id | string / null | Outlet scope |
| portal_scope | array | e.g. `["management", "outlet"]` or `["all"]` |
| type | string | `approval` / `alert` / `closing` / `warehouse` / `system` / `kitchen` |
| severity | enum | `info` / `warning` / `critical` / `success` |
| title / body | string | |
| ref_type / ref_id | string | Polymorphic FK |
| link | string | Relative path for navigation |
| read_at | datetime / null | null = unread |
| created_at | datetime | |

Index: `(user_id, read_at, created_at)`, `(outlet_id, created_at)`

### `warehouse_settings`
| Field | Type | Default | Note |
|---|---|---|---|
| outlet_id | string (unique) | - | |
| adjustment_approval_threshold | float | 1,000,000 | Rupiah |
| require_receipt_attachment | bool | false | |
| auto_receive_po | bool | false | Reserved, not yet honored |

### `coa_accounts`
| Field | Type | Note |
|---|---|---|
| code | string | Gaap-like `1110`, `4100`, etc. |
| name | string | |
| account_type | enum | `asset` / `liability` / `equity` / `revenue` / `contra` / `cogs` / `expense` |
| normal_balance | enum | `debit` / `credit` (inferred from type) |
| parent_code | string | For tree hierarchy |
| is_active | bool | |

*(Data dictionary lengkap untuk semua tabel tersedia via MongoDB `db.<col>.findOne()` untuk inferensi runtime.)*

---

## I. Business Logic

### Rule per Fitur

**Sales Summary**:
- Jika `food_sales + beverage_sales = 0`, auto-split 70/30 dari `total_sales`
- Payment channels debit side harus sama dengan revenue credit side (auto-scale jika mismatch < 1%)
- Duplicate (outlet, date) → update existing + re-post journal (force=True)

**Petty Cash**:
- Category mapped ke expense COA: cleaning/supplies → 6400, transport → 6300, rent/utilities → 6200, dll.
- Max amount per entry: Rp 500k (soft limit, warning; not blocked)
- Requires receipt_ref untuk >Rp 100k

**Adjustment**:
- total_value_abs ≤ threshold → auto-posted
- total_value_abs > threshold → pending_approval (stock NOT moved, journal NOT posted yet)
- Approve → apply stock delta + post journal
- Reject → status=rejected (terminal)

**Purchase Order**:
- State machine: `draft → submitted → approved → partial_received ⇄ received → closed`
- Cancelable only until `approved` (not after receive)
- Partial receive allowed; closes when all lines `received_qty >= qty`

**Daily Closing**:
- Cannot submit jika hari sebelumnya belum `locked`
- Once `locked`, no new transactions for that date (exception: override permission)

### Rule per Status

| Entity | Status | Next Allowed | Action Allowed |
|---|---|---|---|
| Journal | draft | posted, cancelled | edit lines |
| Journal | posted | reversed | reverse only |
| PO | draft | submitted, cancelled | edit all |
| PO | submitted | approved, cancelled | view only |
| PO | approved | partial_received, received, cancelled | receive |
| Adjustment | pending_approval | posted, rejected | approve/reject |
| Adjustment | posted | (terminal) | view only |
| Closing | draft | submitted | edit fields |
| Closing | submitted | locked, rejected | approve/reject |
| Closing | locked | - | view only |

### Rule per Role

| Role | Can |
|---|---|
| Super Admin | Everything (`permissions: ["*"]`) |
| Finance Head | All financial ops + approve closing + approve adjustment + post/reverse journal |
| Outlet Manager | Sales summary + petty cash + submit closing + view reports (outlet-scoped) |
| Warehouse Keeper | PO create/receive, transfer, adjustment (within threshold) |
| Cashier | POS operate, shift open/close |
| Kitchen | KDS operate, mark ready |
| Executive | Read-only Executive Portal + AI chat |

### Rule Calculation

**Journal-driven P&L**:
- Revenue = Σ credit-balance(revenue) − Σ debit-balance(contra)
- COGS = Σ debit-balance(cogs)
- OpEx = Σ debit-balance(expense)
- Gross Profit = Revenue − COGS
- Net Profit = Gross Profit − OpEx

**Balance Sheet**:
- Assets = Σ debit-balance(asset)
- Liabilities = Σ credit-balance(liability)
- Equity = Σ credit-balance(equity) + Retained Earnings (= Revenue − COGS − OpEx for period)

**Financial Ratios**:
- Current Ratio = Current Assets (codes 11xx/12xx/13xx) / Current Liabilities
- ROE = (Net Profit × 365/period_days) / Total Equity
- Runway = Cash / Monthly Burn (daily_burn × 30)

### Rule Approval
- Lihat `approval_rules` collection — granular matcher by (type, amount_min, outlet_id)
- Fallback: super admin always can approve
- Email/notification sent to approvers via `notify_users_by_role(permission="approvals.approve")`

### Rule Override
- Period lock override: permission `closing.override` (super admin only)
- Manual journal after auto-post: allowed with `journal.manual_entry` permission

### Rule Exception
- Missing COA account saat auto-post → skip journal + log warning (jangan block operasi)
- WebSocket failed → polling fallback 30s untuk notifications
- Printer offline → fallback `window.print()` (browser print dialog)

---

## J. Workflow / Process Flow

### 1. Daily Sales → Auto-Journal Flow (AS-IS)

```
[Cashier] open shift → take orders (POS)
                           │
                           ▼
                  [Kitchen] receive ticket via WS → mark ready → served
                           │
                           ▼
[Cashier] close shift → system generates sales_summary
                           │
                           ▼
              [posting_service] post_sales_summary_journal()
                           │
                           ▼
          Dr Cash/Bank (by payment mix) / Cr Revenue (food + bev)
                           │
                           ▼
                [Reports] P&L reflects in real-time
```

### 2. Daily Closing Flow

```
[Outlet Mgr] (1) Sales reconcile → (2) Petty cash reconcile →
             (3) Cash deposit → (4) Inventory count → (5) Submit
                              │
                              ▼
[Management] Review via notification → Approve/Reject
                              │
                        ├──> Approve: status=locked, day closed
                        └──> Reject: status=draft, back to Outlet with comment
```

### 3. PO Procure-to-Pay Flow

```
[Warehouse] Create PO (draft)
                │
                ▼ submit
[Supervisor] Approve PO
                │
                ▼ approved
[Warehouse] Receive partial/full → GRN auto-created
                │                     │
                │                     ▼
                │              [posting_service] post_receipt_journal()
                │                     │
                │                     ▼
                │         Dr Inventory / Cr Accounts Payable
                │
                ▼ (all lines received)
[Warehouse] Close PO → status=closed
```

### 4. Adjustment Approval Flow (threshold > X)

```
[WH Staff] Create adjustment (value > threshold)
                │
                ▼
            status=pending_approval (stock NOT moved, no journal)
                │
                ▼
[Notification] sent to Finance approvers
                │
                ▼
[Finance] Review → Approve/Reject
                │
        ├──> Approve: _apply_stock_delta() + post_adjustment_journal() → posted
        └──> Reject: status=rejected (terminal), no stock movement
```

### Decision Points
- Auto-post vs pending: threshold, policy
- Approval quorum: single approver for v1 (multi-approver future)

### Rollback Flow
- **Journal reversal**: create new journal with negated amounts, source_type = `reversal_of_{original_journal_id}`
- **PO cancel**: allowed pre-receive; after receive, must create adjustment
- **Closing override**: manual unlock with super admin permission

### Retry / Resubmit Flow
- Failed auto-journal logs warning but does not block operational transaction
- Superadmin can trigger `POST /api/admin/journals/backfill` untuk regenerate missing journals
- Notification WS fallback ke polling setiap 30s

---

## K. API Specification

*(Dokumentasi endpoint utama — lengkap ada di source `/app/backend/routers/*.py` yang ter-auto-OpenAPI di `/docs` saat dev.)*

### Auth

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/auth/login` | POST | Public | Login with email+password, optional 2FA |
| `/api/auth/me` | GET | Bearer | Current user profile |
| `/api/auth/logout` | POST | Bearer | Invalidate token (client-side) |
| `/api/auth/2fa/setup` | POST | Bearer | Generate TOTP secret + QR |
| `/api/auth/2fa/verify` | POST | Bearer | Verify TOTP and enable |
| `/api/auth/invite` | POST | `users.invite` | Create invite token |
| `/api/auth/accept-invite` | POST | Public + token | Activate invited account |
| `/api/auth/change-password` | POST | Bearer | Update own password |
| `/api/auth/sessions` | GET | Bearer | List active sessions |

### Finance

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/finance/sales-summary` | POST | `finance.sales.input` | Create/update daily summary (auto-journal) |
| `/api/finance/petty-cash` | POST | `finance.petty.create` | Log petty cash (auto-journal) |
| `/api/finance/cash-movements` | POST | `finance.cash.create` | Cash in/out/settlement (auto-journal) |
| `/api/finance/*` GET variants | GET | `finance.read` | List/query |

### Journals & COA

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/journal/post` | POST | Manual journal posting (double-entry validated) |
| `/api/journal/batch-post` | POST | Multiple journals in one transaction |
| `/api/journal/{id}/reverse` | POST | Reverse a posted journal |
| `/api/journal` | GET | List with pagination/filter |
| `/api/coa` | GET/POST/PUT | Manage chart of accounts |

### Reports (Journal-Driven)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/reports/pnl` | GET | Laba Rugi |
| `/api/reports/balance-sheet` | GET | Neraca |
| `/api/reports/cashflow` | GET | Arus Kas |
| `/api/reports/equity-changes` | GET | Perubahan Ekuitas (SCE) |
| `/api/reports/trial-balance` | GET | Trial Balance |
| `/api/reports/general-ledger` | GET | Per-account ledger |
| `/api/reports/financial-ratios` | GET | 20+ ratios |
| `/api/reports/revenue-trend` | GET | Bucketed daily/weekly/monthly |
| `/api/reports/inventory-valuation` | GET | Physical inventory valuation |
| `/api/reports/export/{type}` | GET | Excel/PDF export |

**Query params common**: `period_start`, `period_end`, `outlet_id`

### Warehouse & PO

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/warehouse/suppliers` | GET/POST | Supplier master |
| `/api/warehouse/receipts` | GET/POST | GRN |
| `/api/warehouse/transfers/*` | GET/POST | Transfer workflow |
| `/api/warehouse/adjustments` | POST | Create adjustment (threshold-aware) |
| `/api/warehouse/adjustments/{id}/approve` | POST | Approve pending adjustment |
| `/api/warehouse/adjustments/{id}/reject` | POST | Reject |
| `/api/warehouse/purchase-orders` | GET/POST | PO CRUD |
| `/api/warehouse/purchase-orders/{id}/status` | POST | State transition |
| `/api/warehouse/purchase-orders/{id}/receive` | POST | Partial/full receive → GRN |
| `/api/warehouse/settings/{outlet_id}` | GET/PUT | Per-outlet config |
| `/api/warehouse/attachments/upload` | POST (multipart) | Upload file (10MB limit) |
| `/api/warehouse/attachments/{file_id}` | GET/DELETE | Download/remove |

### Notifications

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/notifications` | GET | Feed (user-scoped) |
| `/api/notifications/unread-count` | GET | Badge counter |
| `/api/notifications/{id}/read` | POST | Mark one read |
| `/api/notifications/read-all` | POST | Mark all read |
| `/api/notifications/test` | POST | Superadmin — self-test |

### Admin

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/admin/journals/backfill` | POST | Regenerate journals from ops data |
| `/api/admin/journals/coverage` | GET | Coverage statistics |

### WebSocket

| URL | Purpose |
|---|---|
| `/ws/{token}` | General notification + event push |
| `/ws/kitchen/{outlet_id}?token=...` | Kitchen ticket stream |

### Common Response Pattern
- **Success**: `200 OK` + JSON body
- **Validation error**: `400 Bad Request` + `{"detail": "<message>"}`
- **Auth missing/bad**: `401 Unauthorized` + `{"detail": "Not authenticated"}`
- **Permission denied**: `403 Forbidden` + `{"detail": "Super admin required"}` etc.
- **Not found**: `404` + `{"detail": "X not found"}`
- **Server error**: `500` + generic message (detail in logs)

### Idempotency / Retry
- Auto-posting jurnal idempotent via `(source_type, source_id)` dedup
- PO state transitions idempotent (requesting same status twice returns 400 gracefully)

### Versioning
- Current: v1 (no URL versioning yet, relies on `/api` prefix)
- Future: `/api/v2/*` when breaking changes required

---

## L. Integration Specification

### Emergent LLM
- **Arah**: Outbound only (Backend → Emergent)
- **Data sent**: Financial metrics snippet + user query
- **Data received**: Natural language insight text
- **Format**: JSON via `emergentintegrations` SDK (OpenAI-compatible)
- **Sync/async**: Sync (with timeout 30s)
- **Frequency**: On-demand per user click (Exec AI tab)
- **Failure handling**: Toast error to user, log error, no fallback
- **Key**: `EMERGENT_LLM_KEY` env var

### Web Serial API (ESC/POS)
- **Arah**: Browser → USB serial device
- **Data sent**: ESC/POS command bytes (text + formatting + cut)
- **Format**: Binary
- **Sync**: Yes (with `navigator.serial` API)
- **Failure handling**: Fallback ke `window.print()` (browser print dialog)

### WebSocket
- **Arah**: Bi-directional (server → client push, client → server ping)
- **Channel**: `/ws/{token}` (general), `/ws/kitchen/{outlet_id}` (KDS)
- **Frequency**: Real-time event-driven
- **Reconnection**: Client auto-reconnect on disconnect; polling fallback

### Midtrans (Planned)
- Blocked: waiting for production API keys
- Integration via `integration_playbook_expert_v2` agent akan run saat keys tersedia

---

## M. UI / UX Technical Notes

### Screen List (Major)

| Portal | Screens |
|---|---|
| Management | Dashboard, Finance (Sales/Petty/CashMv/Reconcile), COA, Journals, Reports (6 tabs), Inventory, Recipes, Production, Approvals, Alerts, Admin, Budgets, Audit Trail |
| Outlet | OutletDashboard, DailyClosing (5-step stepper), SalesSummary, PettyCash |
| Executive | Overview, Revenue, Outlets (ranking), ControlTower (alerts feed), AI Insights/Chat/Forecast/Anomalies |
| Cashier | POSPage (full-screen tablet mode) |
| Kitchen | KitchenQueue (Kanban: new → in_progress → ready → served) |
| Warehouse | Dashboard, PurchaseOrders, Receiving, Transfers, Adjustments, Counts, Settings |

### Komponen Reusable

- `DataTable` — search + sort + pagination, adopted by major list pages
- `CommandPalette` — Ctrl+K global search
- `NotificationBell` — bell + dropdown (5-pull layout integration)
- `PeriodPicker` — preset dropdown + date range
- `FinancialRatiosBar` — 8 KPI cards
- `ReportCharts` — WaterfallChart, RevenueExpenseTrend, CompositionDonut, CashflowArea, RunningBalance, AssetTreemap, ComparisonBars
- `GeneralLedgerModal` — drill-down GL viewer

### Field Behavior
- Currency inputs: Rupiah, thousands separator on blur, parse on focus
- Date inputs: native `type="date"` (ISO `YYYY-MM-DD`)
- Numeric: `fontVariantNumeric: 'tabular-nums'` untuk alignment
- Required fields marked dengan `*`

### Conditional Display
- Outlet selector: hidden untuk user dengan 1 outlet only
- `Coverage` button (backfill): visible hanya untuk `is_superadmin`
- Approve/Reject buttons: visible jika status = pending_approval AND user has permission

### Empty / Loading / Error States
- **Loading**: skeleton loaders (min 300ms) atau `Loading...` teks
- **Empty**: icon + message "Tidak ada data" + CTA button
- **Error**: Sonner toast dengan error message

### Form Validation
- Client-side: required, min/max, pattern (date, currency)
- Server-side: Pydantic models (400 response dengan detail)
- Inline error: border-rose-500 + helper text

### Role-based Visibility
- Navigation links hidden jika user tidak punya permission
- Buttons disabled (grey) jika no permission, dengan tooltip "Anda tidak punya akses"

---

## N. Security & Access Control

### User Roles (Default Seed)

| Role | Permissions Highlight |
|---|---|
| Super Admin | `["*"]` — all |
| Finance Head | `finance.*`, `journal.*`, `reports.*`, `approvals.approve` |
| Outlet Manager | `finance.sales.input`, `finance.petty.create`, `closing.submit`, `reports.view` (outlet) |
| Warehouse Keeper | `warehouse.*`, `po.create/receive` |
| Cashier | `pos.operate` |
| Kitchen | `kitchen.operate` |
| Executive | `reports.view`, `exec.view`, `ai.use` |

### Authentication Model
- **JWT** (HS256), 8-hour TTL, stored in localStorage frontend
- **TOTP 2FA** (pyotp), optional per user, required for finance roles (policy configurable)
- **Password policy**: min 8 chars, uppercase, digit. Bcrypt hash.

### Authorization Model
- `check_permission(user, perm)` utility
- Permission matching: exact OR wildcard `*` OR glob like `warehouse.*`
- Outlet scope: `user.outlet_access[]` checked on every write

### Sensitive Data Handling
- Passwords: bcrypt hash, never logged
- TOTP secret: stored encrypted-at-rest (via env key future; currently plaintext in dev)
- Tokens: JWT signed with `JWT_SECRET` env
- Bank details, tax IDs: none stored yet

### Logging Requirement
- **Audit log**: every write operation (create/update/delete/approve/reject) via `log_audit()`
- **System log**: print() → supervisor logs → `/var/log/supervisor/backend.*.log`
- **Request log**: uvicorn access log

### Session / Token Rule
- JWT expiry 8h, client prompts re-login
- No refresh token yet (future)
- Session tracking via `sessions` collection on login (IP + UA)

### Access Audit Trail
- `audit_logs` collection — immutable, queryable
- View via `/management/audit-trail` dengan DataTable

---

## O. Audit Trail & Traceability

### Event Logged (Write Operations)

| Event | Fields |
|---|---|
| user.login | user_id, ip, user_agent, success |
| user.password_change | user_id, timestamp |
| sales_summary.create/update | user_id, outlet_id, date, total |
| petty_cash.create | user_id, outlet_id, amount, category |
| journal.post | user_id, journal_id, journal_number, source_type, total |
| journal.reverse | original_id, new_id, reason |
| po.create/submit/approve/cancel/receive/close | user_id, po_id, po_number |
| adjustment.create/approve/reject | user_id, adjustment_id, value, status |
| closing.submit/approve/reject | user_id, outlet_id, date |
| approval.submit/approve/reject | user_id, ref_type, ref_id |
| attachment.upload/delete | user_id, file_id, ref_type, ref_id |

### Before/After Value
- Currently stored in `audit_logs.details` as string (future: structured diff)

### Actor / Timestamp / Source
- Setiap log: `user_id`, `user_name`, `created_at` (timezone-aware UTC), `action`, `resource_type`, `resource_id`, `details`

### Traceability Example
- Dari laporan P&L → klik row akun → GL modal → klik journal_number → lihat source transaction → klik back ke PO/GRN/Sales Summary. **Full traceability preserved** ✅

---

## P. Error Handling

### Error Classification

| Category | Handling | UX |
|---|---|---|
| Validation (400) | Pydantic/FastAPI | Toast with `detail` |
| Auth (401) | Middleware | Redirect to login |
| Permission (403) | check_permission | Toast "Akses ditolak" |
| Not Found (404) | Router | Toast "Data tidak ditemukan" |
| Server Error (500) | Generic handler | Toast "Terjadi kesalahan" + log |

### User-facing Error
- Sonner toast (library). Severity: error / warning / info / success.
- Never expose stack traces to user.

### System Log Error
- `print()` in backend → supervisor captures
- Format: `[{module}] {operation} failed: {exception}`

### Recovery / Fallback
- Journal auto-post fail → operational transaction still succeeds (graceful)
- WS disconnect → 30s polling fallback
- Printer offline → browser print dialog

---

## Q. Performance & Scalability

### Performance Target
- API p95: < 500ms
- Page load (FCP): < 2s
- WebSocket latency: < 200ms

### Load Assumption (Current)
- 2 outlets, 10 users, 500 POS orders/day, 180 sales summaries (3mo backfill)
- Database size: ~10 MB operational data

### Capacity Assumption (Next 12 Months)
- 10 outlets, 50 users, 5000 POS orders/day, 2 years of history
- Expected DB size: ~1 GB

### Bottleneck Risk
- Report aggregation over wide date ranges (currently 100+ journal_lines per journal)
- No DB indexing strategy audit yet → future task

### Optimization Strategy
- Index `(posting_date, status, outlet_id)` on journals
- Index `(journal_id, account_id)` on journal_lines
- Consider materialized view `account_balances` for trial balance (future)

### Caching Strategy
- No caching yet (keep reports fresh)
- Future: Redis cache for `/api/reports/financial-ratios` (5min TTL)

### Pagination / Batching
- List endpoints: default `limit=50`, max `limit=500`, `skip` param
- Trial balance: single query (all accounts, small dataset)
- GL: pagination on `journal_lines` skip/limit

---

## R. Testing Consideration

### Scope

| Level | Coverage |
|---|---|
| Unit | — (not formal yet; done via integration) |
| Integration | Testing agent iterations 1-7, ~90-98% pass |
| API | `/app/backend_test.py` + testing_agent_v3 |
| UAT | Manual via preview URL |

### UAT Scenarios (Completed)
- Login all 6 roles → portal access correct
- Daily closing stepper end-to-end
- Journal-driven reports balance check
- PO create → approve → partial receive → full receive
- Adjustment threshold trigger approval flow
- Notification bell WS push

### Edge Cases Verified
- Empty period → reports return 0
- Invalid outlet_id → 400
- Duplicate sales_summary → update + repost
- Adjustment exactly at threshold → posted (not pending)
- Invalid PO state transition → 400

### Regression Risk
- **Journal-driven reports**: dependent on COA integrity (deleted accounts)
- **Notifications**: dependent on WS availability (fallback polling)
- **Stock delta**: dependent on stock_on_hand not having stale data

### Acceptance Criteria
- Trial Balance debit = credit (tolerance Rp 1)
- Balance Sheet: Assets = Liabilities + Equity (tolerance Rp 1)
- All CRITICAL bugs from testing agent resolved

---

## S. Deployment Notes

### Environment List
- **Preview (Emergent)**: `outlet-hub-system.preview.emergentagent.com` — current live

### Release Dependency
- MongoDB instance accessible via `MONGO_URL`
- `EMERGENT_LLM_KEY` env for AI features
- Frontend build via `yarn build` (not `npm`)

### Migration Requirement
- None formal (MongoDB schemaless)
- Data migration for new features via admin endpoints (e.g., journal backfill)

### Rollback Plan
- Deploy previous container image
- Database rollback: restore from daily backup (not implemented yet — future)

### Feature Flag
- None currently; use `is_superadmin` check for experimental features

### Config Change Required
- None at release v1.0

### Known Deployment Risk
- Single MongoDB instance (no replica set) → RPO = 24h worst case
- No backup automation yet

---

## T. Known Limitations

| Limitation | Workaround | Priority to Fix |
|---|---|---|
| COGS tidak di-post per sale (dibutuhkan BOM consumption per order) | P&L tetap benar secara makro, tapi COGS = 0 di journal-driven report | Medium |
| Bulk operations frontend tidak pake server-side pagination | OK untuk data <1000 rows, perlu refactor saat scale | Medium |
| No automated backup | Manual export | High |
| No CI/CD pipeline | Manual deploy via Emergent | Low |
| AI features tidak offline | User akan lihat error jika LLM API down | Low |
| Attachments GridFS tidak ada virus scan | Manual policy untuk file yang di-upload | Medium |
| Session hanya JWT (no revocation list) | User harus wait TTL habis (8h) | Low |
| Budget belum ada versioning | Single value, bisa direplace tanpa trace | Medium (planned) |

### Technical Debt
- Inline SQL-like aggregation di Python (reports) → pertimbangkan MongoDB aggregation pipeline optimization
- Beberapa pages lama belum adopt `DataTable` component
- Error handling banyak yang generic — perlu struktur error class hierarchy
- Test coverage formal belum ada (hanya integration via agent)

### Dependency Risk
- `emergentintegrations` library version pinning
- Web Serial API browser support (Chrome only)
- MongoDB version (needs 4.x+ for aggregation features used)

---

## U. Future Enhancements

**(Lihat dokumen terpisah `03-enhancement-backlog.md` untuk detail lengkap.)**

Ringkasan kategori:

1. **Functional**: Budget Versioning, COGS-per-sale via recipe consumption, AR module (credit sales), PO multi-level approval, Transfer workflow lengkap dengan in-transit state
2. **Operational**: Cron scheduler untuk alerts, daily digest email, automated MongoDB backup
3. **Reporting**: Cash Ledger view, Trial Balance comparative (YoY), Budget vs Actual drill-down, Multi-currency support
4. **Integration**: Midtrans QRIS (blocked), Xendit/Stripe (fallback), Accurate/Jurnal sync (ekspor batch)
5. **Performance**: Redis caching for ratios, server-side pagination wiring, materialized balance view
6. **Security**: MFA wajib untuk finance roles, session revocation list, attachment virus scan, rate limit pada login
7. **UX**: Keyboard shortcuts expanded, dark mode polish, mobile outlet dashboard PWA
8. **Data Quality**: Item master duplicate detector, recipe yield variance tracker, supplier performance scorecard
9. **Scalability**: Move ke read replicas, separate analytics DB, CDN for static assets

---

## Appendix

- Source code: `/app/`
- Test credentials: `/app/memory/test_credentials.md`
- Plan/roadmap: `/app/plan.md`
- Memory docs: `/app/memory/SYSTEM_SUMMARY.md`, `/app/memory/FEATURE_BACKLOG.md`, `/app/memory/HARDENING_BACKLOG.md`

**End of TDD v1.0.**
