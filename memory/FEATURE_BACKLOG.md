# F&B Financial Control Platform - Feature Enhancement Backlog
# Dokumen ini adalah referensi utama untuk semua penambahan fitur
# JANGAN HAPUS - Digunakan sebagai konteks development fase per fase

---

## PRINSIP DESAIN PENAMBAHAN
- System of Record → System of Control
- Dashboard Pasif → Workflow-based Operational System
- List Data Biasa → Decision + Action Layer

---

## PHASE 1 — WAJIB UNTUK PRODUCT READY

### 1. Journal Engine / Double Entry Accounting
- **Business**: Semua transaksi finansial harus menghasilkan jurnal debit-credit
- **Use Case**: Cash in → kas outlet bertambah + revenue terposting. Settlement → kas outlet berkurang + bank bertambah. Petty cash → expense tercatat + petty cash berkurang
- **Implementasi**:
  - Journal header + journal lines
  - Debit account, credit account, source document reference
  - Posting date, outlet scope
  - Status: draft, posted, reversed
  - Semua transaksi finance WAJIB lewat journal posting service
  - Journal = sumber utama P&L, cashflow, balance sheet, equity
- **Menu**: Management Portal → Finance & Accounting → Journal Entries
- **UI**: List + pagination + search nomor jurnal/outlet/account/tanggal + filter status/periode/outlet + detail page untuk audit + modal hanya untuk draft input

### 2. Cash Reconciliation & Bank Reconciliation
- **Business**: Kas outlet dan bank harus direkonsiliasi. Saldo sistem = kondisi nyata, atau selisih harus dijelaskan
- **Use Case**: Sales Rp10jt tapi kas fisik Rp9.7jt → selisih Rp300rb → manager beri alasan → finance approve/reject
- **Implementasi**:
  - Menu: Cash Reconciliation, Bank Reconciliation, Settlement Review
  - Fields: expected amount, actual amount, difference, variance reason, approval status
  - Per outlet, per bank account, per periode
  - Rule: closing tidak bisa final jika selisih belum diselesaikan
- **Menu**: Management Portal → Finance → Reconciliation; Outlet Portal → Cash & Bank → Daily Cash Review
- **UI**: Wizard/step review + tabel per tanggal per account + detail drawer untuk selisih + highlight warna mismatch

### 3. Daily Closing Outlet
- **Business**: Outlet menutup aktivitas harian secara formal → data terkunci → dasar kontrol
- **Use Case**: Manager input sales → staff input petty cash/stock/waste → submit closing → supervisor approve → hari terkunci
- **Implementasi**:
  - Status harian per outlet: open, in_progress, submitted, approved, locked
  - Closing checklist: sales summary complete, petty cash complete, stock movement complete, cash reconciliation complete
  - Setelah locked, edit hanya lewat override admin + audit trail
- **Menu**: Outlet Portal → Tasks & Closing → Daily Closing; Management Portal → Operations → Outlet Closing Monitor
- **UI**: Wizard/stepper + progress indicator + task checklist + CTA "Submit Closing" + status badge sangat terlihat

### 4. COA Management (Chart of Accounts)
- **Business**: Struktur akun harus formal, fleksibel, bisa dipakai outlet dan HQ
- **Use Case**: Revenue dipisah makanan/minuman/delivery/diskon. Expense dipisah utilities/packaging/wages/repair/waste. Balance sheet asset/liability/equity benar
- **Implementasi**:
  - COA tree/hierarchy, account type, parent-child, active/inactive, report mapping
  - Dimension: outlet, city, cost center, analytic tag
- **Menu**: Management Portal → Finance & Accounting → Chart of Accounts
- **UI**: Tree view parent-child + search + filter account type + inline edit + collapse/expand hierarchy

### 5. Inventory Recipe / BOM Consumption Engine
- **Business**: Menu/item jadi punya recipe. Saat sales terjadi → sistem hitung pemakaian material teoritis → inventory berkurang sesuai konsumsi
- **Use Case**: "Nasi Ayam" = ayam + nasi + saus + packaging. 50 porsi terjual → raw/prep material berkurang sesuai recipe
- **Implementasi**:
  - Recipe master, recipe line items, yield factor, unit conversion, consumption rule
  - Support level: raw → prep, prep → sub-prep, sub-prep → menu
  - Konsumsi: manual from sales summary / auto from POS future / auto from production output
- **Menu**: Management Portal → Inventory → Recipe & BOM; Outlet Portal → Inventory → Consumption Preview
- **UI**: Tree editor material hierarchy + split view (input kiri, output kanan) + modal tambah ingredient + detail page per recipe version

### 6. Production / Prep Order
- **Business**: Raw material → prep material harus lewat proses produksi resmi dengan yield tracking
- **Use Case**: Outlet buat saus dasar pagi → raw ingredients berkurang → saus masuk stok prep → saat dipakai di menu, stok prep berkurang
- **Implementasi**:
  - Production order, batch production, output quantity, input material, yield result, waste/loss
  - Status: draft, planned, in_progress, completed, closed
  - Output masuk inventory dengan cost roll-up
- **Menu**: Management Portal → Inventory → Production / Prep Orders; Future: Kitchen Portal → Prep Tasks
- **UI**: Kanban untuk status + list view batch + quick action start/complete/close + material allocation drawer

### 7. Stock Movement Enterprise Upgrade
- **Business**: Semua perpindahan stok harus jelas jenis/sumber/tujuan/alasan. Transfer antar outlet ada transit tracking
- **Use Case**: Outlet A transfer ke B → transfer request → stok keluar A → masuk transit → diterima B. Barang rusak = waste + reason
- **Implementasi**:
  - Movement types: purchase_receipt, transfer_out, transfer_in, production_input, production_output, waste, spoilage, adjustment, return_to_supplier
  - Reason code WAJIB, approval untuk movement tertentu
- **Menu**: Management Portal → Inventory → Stock Movements; Outlet Portal → Inventory → My Movements
- **UI**: Table besar + pagination + filter by type/outlet/item/date + detail drawer + status badge + reason code

### 8. Variance Report
- **Business**: Theoretical usage vs actual usage. Deteksi loss, over-portion, fraud
- **Use Case**: Menu harusnya pakai 10kg ayam, stok turun 12kg → variance 2kg → manager jelaskan
- **Implementasi**:
  - Report: theoretical consumption, actual stock movement, variance by outlet/item/period
  - Threshold alert bila variance melewati batas
- **Menu**: Management Portal → Reports → Variance; Outlet Portal → Reports → Variance Snapshot
- **UI**: Chart + table + red flag badge + drill-down ke item/outlet/tanggal

### 9. Exception Alerts & Monitoring
- **Business**: Sistem tandai anomali/kondisi kritis otomatis. User tidak perlu cari masalah satu per satu
- **Use Case**: Stock rendah, cash tidak sesuai, expense over limit, outlet belum closing, variance tinggi
- **Implementasi**:
  - Alert engine: low_stock, cash_mismatch, overdue_closing, missing_submission, unusual_expense, high_variance
  - Notifikasi ke dashboard + user target via WebSocket
- **Menu**: Management Portal → Dashboard / Alerts; Outlet Portal → Dashboard → Today Alerts
- **UI**: Alert feed + warna prioritas + KPI cards atas + alert bawah + auto-refresh badge

### 10. Audit Trail Operational Upgrade
- **Business**: Audit trail untuk investigasi finance/manager, bukan hanya log teknis
- **Use Case**: Petty cash diubah setelah submit → audit trail tunjukkan siapa/kapan/field apa berubah → finance nilai
- **Implementasi**:
  - Simpan: before_value, after_value, actor, timestamp, reason, module, outlet
  - Filter per user, outlet, module, transaksi
- **Menu**: Management Portal → Audit Trail; Outlet Portal → Approvals → History / Profile → My Activity
- **UI**: Timeline view + expandable row before/after + search + filter + export

---

## PHASE 2 — SCALE DAN CONTROL LANJUTAN

### 11. Budgeting per Outlet
- **Business**: HQ tetapkan budget, outlet bandingkan realisasi vs budget
- **Implementasi**: Budget master per outlet/account/periode. Report budget vs actual, variance %, burn rate
- **Menu**: Management Portal → Finance → Budgeting; Outlet Portal → Finance → Budget Snapshot
- **UI**: Monthly table + bar chart budget vs actual + threshold color indicator

### 12. Central Kitchen / Warehouse Portal
- **Business**: Portal khusus central kitchen dan warehouse untuk supply, prep, distribusi
- **Implementasi**: Kitchen portal + warehouse portal. Objects: production task, picking list, transfer request, batch receipt
- **UI**: Kanban/task board + list picking & batch + quick action

### 13. Granular Approval Workflow
- **Business**: Approval berbeda tergantung nominal, jenis transaksi, scope outlet
- **Implementasi**: Rule-based approval: by transaction type, amount, outlet, role. Approver chain, escalation, delegation, mandatory comment
- **Menu**: Management Portal → Approvals; Outlet Portal → Approvals → My Requests
- **UI**: Inbox list + status badge + side drawer + approve/reject dari satu layar

### 14. Scheduled / Recurring Transactions
- **Business**: Transaksi rutin tidak perlu input manual berulang
- **Implementasi**: Recurring rule: daily/weekly/monthly. Auto-generate draft. User review lalu approve
- **Menu**: Management Portal → Finance → Recurring Transactions
- **UI**: List schedule + calendar review + status active/paused/expired

### 15. Multi-level Reporting Drill-down
- **Business**: Direksi lihat global → manager lihat outlet → finance drill ke transaksi sumber
- **Implementasi**: Hierarchy: global → city → outlet → category → item → transaction. Report clickable drill-down
- **Menu**: Management Portal → Reports; Outlet Portal → Reports → Local Reports
- **UI**: Chart + table + klik bar/row drill-down + breadcrumb path

---

## UI BEST PRACTICES — WAJIB SEMUA FITUR

### 16. Pagination semua list panjang
- Harus ada di: sales summary, cash movements, petty cash, stock movements, journal entries, audit trail, approvals, item master
- Server-side pagination. Default 10/20/50 rows. Page size selector

### 17. Search global dan per module
- Search: nomor dokumen, nama item, outlet, user, status, account
- Search box di header tabel. Full text untuk master. Structured untuk transaksi

### 18. Filter cerdas dan saved view
- Filter wajib: outlet, periode, status, kategori, tipe transaksi, user
- Filter panel collapsible. Saved filter preset. Default filter berdasarkan role

### 19. Sort, sticky header, column visibility
- Sorting list besar. Sticky header tabel. Show/hide columns

### 20. Bulk actions
- Use case: approve banyak request, mark multiple movements, export selected, batch close outlet
- Checkbox selection. Action bar saat item dipilih. Role-based permission

### 21. Summary cards + detail table
- Layout: KPI cards atas → chart tengah → table detail bawah

### 22. Empty state, loading state, error state
- Empty state + CTA. Skeleton loading. Error message spesifik

### 23. Contextual action
- Tombol aksi sesuai konteks user dan halaman

### 24. Responsive layout outlet/tablet
- Sidebar collapse. Table horizontal scroll. Form vertikal layar kecil

### 25. Workflow-first screen
- UI ikuti urutan kerja. Contoh outlet: task hari ini → input sales → input expense → cek stok → closing

---

## MENU STRUCTURE BARU

### Management Portal
```
Finance & Accounting
├── Dashboard Finance
├── Chart of Accounts
├── Journal Entries
├── Cash & Bank
├── Reconciliation
├── Closing Period
├── Budgeting (Phase 2)
└── Equity & Balance Sheet

Reports
├── P&L
├── Cashflow
├── Balance Sheet
├── Inventory Valuation
├── Inventory Movements
└── Variance

Inventory
├── Inventory Dashboard
├── Items
├── Material Hierarchy
├── Recipe & BOM
├── Production / Prep Orders
├── Stock Movements
├── Transfers
└── Variance

Operations
├── Outlet Monitoring
├── Approvals
├── Alerts
└── Audit Trail

Admin
├── Users
├── Roles & Permissions
├── Outlets
└── Settings
```

### Outlet Portal
```
Dashboard
├── Today KPI
├── Today Alerts
└── Quick Actions

Daily Operations
├── Sales Summary
├── Cash Count
├── Petty Cash
└── Closing

Inventory
├── On Hand
├── Movements
├── Waste
├── Stock Count
└── Consumption Preview

Finance
├── Outlet Cash
├── Bank Transfer Request
├── Mini P&L
└── Reconciliation Summary

Tasks
├── Daily Checklist
├── Pending Actions
└── Approval Requests
```

---

## DEVELOPMENT ORDER (Fase per fase)

### Phase 1A: Finance Core Enhancement
- [ ] Journal Engine / Double Entry
- [ ] COA Management (tree hierarchy)
- [ ] Cash & Bank Reconciliation
- [ ] Daily Closing Outlet

### Phase 1B: Inventory Core Enhancement
- [ ] Recipe / BOM Consumption Engine
- [ ] Production / Prep Orders
- [ ] Stock Movement Enterprise Upgrade

### Phase 1C: Control Layer
- [ ] Variance Report
- [ ] Exception Alerts & Monitoring
- [ ] Audit Trail Operational Upgrade

### Phase 1D: UI/UX Improvements
- [ ] Pagination all lists (server-side)
- [ ] Search global + per module
- [ ] Filter cerdas
- [ ] Sort, sticky header, column visibility
- [ ] Bulk actions
- [ ] Empty/loading/error states
- [ ] New menu structure (Management + Outlet)
- [ ] Workflow-first outlet screens

### Phase 2A: Scale Features
- [ ] Budgeting per Outlet
- [ ] Granular Approval Workflow
- [ ] Scheduled/Recurring Transactions
- [ ] Multi-level Reporting Drill-down

### Phase 2B: Portal Expansion
- [ ] Central Kitchen Portal
- [ ] Warehouse Portal
