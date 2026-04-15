# F&B Financial Control Platform - Rangkuman Sistem

## Dokumen ini berisi rangkuman lengkap sistem yang telah dibangun

---

## 1. ARSITEKTUR SISTEM

### Tech Stack
- **Backend**: FastAPI (Python) - Modular Monolith
- **Frontend**: React.js dengan Glassmorphism Dark Theme
- **Database**: MongoDB
- **Real-time**: WebSocket
- **UI Library**: Shadcn/UI + Recharts + Framer Motion
- **Export**: Excel (OpenPyXL) + PDF (ReportLab)

### Struktur Backend (Modular)
```
/app/backend/
├── server.py              → Main app, middleware, WebSocket
├── database.py            → MongoDB connection + 18 collections
├── auth.py                → JWT auth, password hashing, RBAC
├── websocket_manager.py   → Real-time broadcast per outlet/portal
├── seed_data.py           → Demo data seeder
├── routers/
│   ├── auth_router.py     → Login, register, permissions
│   ├── core_router.py     → Users, Outlets, Roles, Audit
│   ├── finance_router.py  → Accounts, Cash, Petty Cash, Sales
│   ├── inventory_router.py→ Items, Stock, Movements, Conversions
│   ├── reports_router.py  → P&L, Cashflow, Balance Sheet, Export
│   └── approvals_router.py→ Approval workflow
└── utils/
    ├── audit.py           → Audit logging + serialization
    ├── helpers.py         → Permission catalog + portal list
    └── export.py          → Excel & PDF generator
```

### Struktur Frontend (Portal-based)
```
/app/frontend/src/
├── App.js                 → Main routing
├── api/client.js          → API client dengan auth interceptor
├── context/AuthContext.js  → Auth state + RBAC + outlet scope
├── layouts/
│   ├── ManagementLayout.js→ Sidebar + topbar layout
│   └── OutletLayout.js    → Topbar + nav tabs layout
├── pages/
│   ├── LoginPage.js       → Login screen
│   ├── PortalSelector.js  → Portal selection (5 portal)
│   ├── ComingSoon.js      → Coming soon page
│   ├── management/        → 7 halaman Management Portal
│   └── outlet/            → 5 halaman Outlet Portal
```

---

## 2. SISTEM PORTAL & AKSES

### 5 Portal yang Tersedia
| Portal | Status | Pengguna | Deskripsi |
|--------|--------|----------|-----------|
| **Management Portal** | ✅ Aktif | Directors, Finance Head, Inventory Controller | Dashboard global, finance, inventory, reports, admin |
| **Outlet Portal** | ✅ Aktif | Outlet Manager, Outlet Staff | Operasi harian outlet: cash, sales, petty cash, inventory |
| **Kitchen Portal** | 🔜 Coming Soon | Kitchen Staff, Prep Staff | Produksi dan prep tracking |
| **Cashier Portal** | 🔜 Coming Soon | Cashier, Front-line Staff | Capture transaksi penjualan |
| **Warehouse Portal** | 🔜 Coming Soon | Warehouse Team | Penerimaan dan transfer stok |

### Alur Login & Portal Selection
```
User buka app → Login Page → Masukkan email & password
    → Autentikasi berhasil → Portal Selector Page
        → Lihat 5 portal (yang tidak ada akses = disabled/locked)
        → Pilih portal yang diizinkan
            → Management Portal → Dashboard + sidebar navigation
            → Outlet Portal → Auto-select outlet → Dashboard + tab navigation
            → Kitchen/Cashier/Warehouse → Coming Soon page
```

---

## 3. FITUR-FITUR YANG SUDAH ADA

### A. CORE ERP (Fondasi)

#### 3.1 Custom RBAC (Role-Based Access Control)
- **40+ permission granular** di 6 modul (Core, Finance, Inventory, Outlet, Reports, Approvals)
- **Custom Role Creation**: Admin bisa buat role baru dengan pilih permission satu per satu
- **Portal Access Control**: Setiap role bisa di-assign ke portal tertentu
- **Outlet Scoping**: User hanya bisa akses data outlet yang di-assign ke mereka

**Permission Catalog:**
- **Core**: manage_users, view_users, manage_roles, view_roles, manage_outlets, view_outlets, view_audit, manage_settings
- **Finance**: view_accounts, manage_accounts, create_cash_movement, approve_cash_movement, view_cashflow, manage_settlement, close_period, reopen_period, view_journals, manage_petty_cash
- **Inventory**: view_items, manage_items, create_stock_movement, approve_stock_movement, view_stock, manage_conversions, view_valuation, manage_hierarchy
- **Outlet**: view_data, create_sales_summary, manage_petty_cash, manage_cash, view_pnl, manage_inventory
- **Reports**: view_reports, export_reports, view_pnl, view_cashflow, view_balance_sheet, view_inventory
- **Approvals**: view, approve, reject, submit

#### 3.2 User Management
- CRUD user dengan assignment role, portal, dan outlet
- Password hashing (bcrypt)
- JWT token authentication (24 jam expire)
- Change password

#### 3.3 Outlet Management
- CRUD outlet dengan info lokasi, kota, telepon
- Status active/inactive
- Outlet scoping enforced di semua API endpoint

#### 3.4 Audit Trail
- **Setiap aksi tercatat**: create, update, delete, approve, reject, login
- Informasi: siapa, kapan, modul apa, entitas apa, detail perubahan
- Filter by module dan action
- Tampilan timeline-style di frontend

#### 3.5 WebSocket Foundation
- Koneksi WebSocket per user
- Broadcast per outlet (low stock alerts)
- Broadcast per portal
- Broadcast global (approval notifications)

#### 3.6 Approval Workflow
- Submit request → Status: Pending
- Approver bisa Approve/Reject dengan comment
- Immutable audit trail per approval
- Stats: pending/approved/rejected count
- WebSocket notification saat approval berubah status

---

### B. FINANCE & ACCOUNTING

#### 3.7 Account Management
- **4 tipe akun**: Bank, Outlet Cash, Petty Cash, Clearing
- Setiap akun terikat ke outlet tertentu (atau Head Office)
- Opening balance & current balance tracking
- Info bank: nama bank, nomor rekening
- CRUD account dengan permission check

**Flow Buat Akun Baru:**
```
Admin/Finance → Finance Page → Klik "+ Account"
→ Isi: Nama, Tipe, Outlet, Opening Balance, Bank Info
→ Submit → Akun tercatat + Audit log
```

#### 3.8 Cash Movement
- **4 tipe movement**: Cash In, Cash Out, Transfer, Settlement
- Setiap movement terikat ke outlet
- Reference number & description
- Auto-update balance akun saat movement dibuat
- Status: completed / pending_approval
- Filter by outlet, tipe, tanggal

**Flow Cash Movement:**
```
User → Finance → Klik "+ Movement"
→ Pilih: Tipe (Cash In/Out/Transfer/Settlement)
→ Pilih Outlet → Isi Amount → Pilih Account tujuan
→ Submit → Balance akun ter-update otomatis
→ Audit log tercatat + WebSocket notification ke outlet
```

#### 3.9 Settlement Rules
- Konfigurasi aturan settlement dari outlet cash ke bank
- Mode: manual atau auto
- Per outlet

#### 3.10 Petty Cash Management
- Catat pengeluaran petty cash per outlet
- Kategori: operational, transport, supplies, cleaning, maintenance, other
- Referensi kwitansi (receipt ref)
- Auto-deduct dari akun petty cash
- Summary: total spent & jumlah transaksi

**Flow Petty Cash:**
```
Outlet Manager → Petty Cash Page → Klik "+ Add Expense"
→ Pilih Akun Petty Cash → Isi Amount & Deskripsi
→ Pilih Kategori → Isi Receipt Ref
→ Submit → Balance petty cash berkurang
→ Audit log tercatat
```

#### 3.11 Sales Summary Input (Manual - No POS)
- Input penjualan harian manual (karena belum ada integrasi POS)
- Breakdown: Cash Sales, Card Sales, Online Sales
- Auto-kalkulasi total
- Bisa update jika sudah ada entry untuk tanggal yang sama
- Per outlet per tanggal

**Flow Sales Summary:**
```
Outlet Manager → Sales Summary Page → Klik "+ Add Sales"
→ Pilih Tanggal → Isi Cash Sales, Card Sales, Online Sales
→ Total otomatis terhitung
→ Submit → Data tersimpan untuk reporting
```

#### 3.12 Accounting Periods
- Buat period baru (nama, start date, end date)
- Close period (mengunci posting)
- Status: open / closed
- Hanya user dengan permission finance.close_period yang bisa close

---

### C. INVENTORY MANAGEMENT

#### 3.13 Item Master
- CRUD item inventory
- Atribut: nama, kategori, UOM (unit of measure), pack size
- **Material Level**: Raw Material, Prep Material, Sub-Prep Material
- Cost per unit & reorder threshold
- Active/inactive status
- Filter by category, material level, search

**Flow Buat Item:**
```
Inventory Controller → Inventory Page → Klik "+ Item"
→ Isi: Nama, Kategori, UOM, Material Level, Cost/Unit, Reorder Threshold
→ Submit → Item tersimpan + Audit log
```

#### 3.14 Material Hierarchy
- Link parent-child antar item (Raw → Prep → Sub-Prep)
- Conversion ratio & yield percentage
- Unlimited nested prep levels
- Traceable lineage

#### 3.15 Stock on Hand
- Real-time stock per item per outlet
- Kalkulasi value (quantity × cost per unit)
- **Low Stock Alert**: item yang quantity-nya di bawah reorder threshold
- Badge status: OK (hijau) / Low (kuning)

#### 3.16 Stock Movements
- **6 tipe movement**: Stock Count, Adjustment, Waste, Transfer, Spoilage, Quarantine
- Per item per outlet
- Auto-update stock on hand
- Transfer: deduct dari outlet asal, tambah ke outlet tujuan
- Count: set absolute quantity
- Waste/Spoilage: deduct quantity
- **Low Stock WebSocket Alert** ketika stock jatuh di bawah threshold

**Flow Stock Movement:**
```
User → Inventory → Klik "+ Movement"
→ Pilih Tipe (Count/Adjustment/Waste/Transfer)
→ Pilih Item → Pilih Outlet → Isi Quantity & Reason
→ Submit → Stock on Hand ter-update
→ Jika stock rendah → WebSocket alert ke outlet
→ Audit log tercatat
```

#### 3.17 Inventory Conversions
- Convert raw material → prep material (atau prep → sub-prep)
- Track: input quantity, output quantity, loss quantity
- Auto-kalkulasi yield percentage
- Deduct input stock, tambah output stock
- **PRD-R03 enforced**: Tidak ada value yang hilang tanpa explicit loss record

**Flow Conversion:**
```
User → Inventory → Create Conversion
→ Pilih Input Item & Quantity
→ Pilih Output Item & Quantity
→ Isi Loss Quantity
→ Submit → Input stock berkurang, Output stock bertambah
→ Yield % otomatis dihitung → Audit log
```

---

### D. REPORTING & EXPORT

#### 3.18 Profit & Loss (P&L)
- Total Revenue (dari sales summaries)
- Total COGS (dari inventory conversions)
- Gross Profit = Revenue - COGS
- Total Expenses (dari petty cash)
- Net Profit = Gross Profit - Expenses
- Margin percentage
- **Drill-down**: Revenue by outlet
- Filter by outlet dan period

#### 3.19 Cashflow Report
- Total Inflow & Total Outflow
- Net Cashflow
- Daily cashflow chart (bar chart inflow vs outflow)
- Termasuk cash movements + cash sales

#### 3.20 Balance Sheet
- **Assets**: Bank accounts, Outlet cash, Petty cash, Inventory value
- **Liabilities**: (MVP - placeholder)
- **Equity**: Total Assets - Liabilities
- Konsolidasi seluruh outlet

#### 3.21 Inventory Valuation
- Per item: quantity × cost per unit = value
- Sorted by value (highest first)
- Total valuation across all items
- Filter by outlet

#### 3.22 Inventory Movements Report
- Summary by movement type (count, quantity)
- Detail movements list
- Filter by outlet dan period

#### 3.23 Export Capability
- **Excel Export**: Semua report bisa di-export ke .xlsx
  - Styled headers, auto-width columns
  - Title + generated date
- **PDF Export**: P&L dan Inventory Valuation bisa di-export ke .pdf
  - Formatted tables, professional layout

**Flow Export:**
```
User → Reports → Pilih Report (P&L/Cashflow/Balance Sheet/dll)
→ Klik tombol "Excel" atau "PDF"
→ File ter-download otomatis
```

---

### E. MANAGEMENT PORTAL (7 Halaman)

#### 3.24 Executive Dashboard
- **4 KPI Cards**: Total Revenue (30d), Bank Balance, Active Outlets, Pending Approvals
- **Sales Trend Chart**: Area chart 14 hari terakhir
- **Cash Position Panel**: Bank, Outlet Cash, Petty Cash balances
- **Quick Stats Row**: Active Users, Inventory Items, Petty Cash Spent, Outlets

#### 3.25 Finance Page
- Tab: Accounts | Cash Movements
- Tabel accounts dengan tipe, outlet, dan balance
- Tabel cash movements dengan filter
- Dialog: Create Account & Record Cash Movement

#### 3.26 Inventory Page
- **4 Quick Stats**: Total Items, Stock Value, Low Stock Count, Total Movements
- **Stock Value by Category Chart** (bar chart)
- Tab: Stock on Hand | Items | Movements
- Dialog: Create Item & Stock Movement

#### 3.27 Reports Page
- Tab: P&L | Cashflow | Balance Sheet | Inventory Valuation
- Setiap tab ada tombol Export Excel & PDF
- Visualisasi chart + tabel detail

#### 3.28 Admin Page
- Tab: Users | Roles | Outlets
- **Create User**: assign role, portal access, outlet access
- **Create Role**: pilih permissions granular + portal access
- Role cards menampilkan permission count
- Outlet list dengan status

#### 3.29 Approvals Page
- **3 Stats Cards**: Pending, Approved, Rejected (klik untuk filter)
- Tabel approval requests
- Action: Approve / Reject dengan comment
- Dialog konfirmasi

#### 3.30 Audit Trail Page
- Timeline-style tabel
- Kolom: Timestamp, User, Action, Module, Entity, Details
- Filter by module
- Color-coded badges per action type

---

### F. OUTLET PORTAL (5 Halaman)

#### 3.31 Outlet Dashboard
- **4 KPI Cards**: Cash In, Cash Out, Net Cash, Today Sales
- **4 Quick Action Buttons**: Cash Management, Sales Summary, Petty Cash, Inventory
- **Sales Trend Chart**: 7 hari terakhir
- **Account Balances**: Cash Register & Petty Cash balance outlet

#### 3.32 Cash Management
- Daftar akun outlet dengan balance
- Tabel recent cash movements
- Dialog: Record Cash Movement (Cash In / Cash Out)

#### 3.33 Sales Summary
- Tabel history penjualan harian
- Kolom: Date, Cash, Card, Online, Total, Notes
- Dialog: Record Daily Sales (input manual)

#### 3.34 Petty Cash
- Summary: Total Spent & Transaction Count
- Tabel expense history
- Dialog: Record Petty Cash Expense (amount, description, category, receipt ref)

#### 3.35 Outlet Inventory
- **2 Stats**: Stock Value & Low Stock Items
- Tabel stock on hand dengan status badge
- Dialog: Stock Movement (Count / Adjustment / Waste)

---

## 4. DATA DEMO (SEED)

### Outlets (3)
1. **Warung Nusantara - Sudirman** (Jakarta)
2. **Warung Nusantara - Kemang** (Jakarta)
3. **Warung Nusantara - Bandung** (Bandung)

### Users (5)
| User | Role | Portal | Outlet |
|------|------|--------|--------|
| System Admin | Super Admin | Semua | Semua |
| Sarah Finance | Finance Head | Management | Semua |
| Budi Sudirman | Outlet Manager | Outlet | Sudirman |
| Dewi Kemang | Outlet Manager | Outlet | Kemang |
| Andi Inventory | Inventory Controller | Management | Semua |

### Roles (5)
1. **Super Admin** - Full access (*)
2. **Finance Head** - Finance + Reports + Approvals
3. **Outlet Manager** - Outlet ops + basic inventory + reports
4. **Inventory Controller** - Full inventory + reports
5. **Outlet Staff** - Basic outlet operations

### Items (15)
- **Raw Materials**: Beras Premium, Ayam Potong, Daging Sapi, Ikan Gurame, Minyak Goreng, Bawang Merah, Bawang Putih, Cabai Merah, Santan Kelapa, Teh Celup, Kopi Bubuk, Gula Pasir
- **Prep Materials**: Bumbu Rendang, Sambal Matah, Nasi Putih

### Accounts (11)
- 3× Bank Account (per outlet) + 1 HQ Bank
- 3× Cash Register (per outlet)
- 3× Petty Cash (per outlet)
- 1× Clearing Account

### Sample Data
- **90 sales summaries** (30 hari × 3 outlet)
- **~60 cash movements** (15 hari × 3 outlet, termasuk settlement)
- **~30 petty cash expenses** (10 hari × 3 outlet)
- **45 stock entries** (15 items × 3 outlet)

---

## 5. BUSINESS RULES YANG SUDAH DITERAPKAN

| ID | Rule | Status |
|----|------|--------|
| PRD-R01 | Sales cash movement hanya bisa settle ke bank sesuai konfigurasi | ✅ Settlement rules entity ada |
| PRD-R02 | Outlet user tidak bisa post ke scope outlet lain | ✅ `check_outlet_access()` di setiap endpoint |
| PRD-R03 | Inventory conversion harus track yield/loss | ✅ yield_percentage + loss_quantity tracked |
| PRD-R04 | Closed period tidak bisa diubah tanpa reopen approval | ✅ Period close entity + permission check |
| PRD-R05 | Executive portal read-only (tidak bisa ubah data outlet) | ✅ Portal scoping + permission check |

---

## 6. YANG BELUM DIBANGUN (ROADMAP)

### Phase 3 (Next)
- Kitchen/Production Portal (production batch, prep tracking)
- Warehouse Portal (receiving, transfer workflow)
- Cashier Portal (dedicated sales capture)

### Phase 4 (Later)
- Password reset flow
- Two-Factor Authentication (2FA)
- Excel import templates
- Advanced audit log search & export
- Budget vs Actual
- Notification panel UI (WebSocket-driven)

### Phase 5 (Future)
- POS Integration
- Central Kitchen orchestration
- HRIS & Payroll
- Advanced BI & Forecasting
