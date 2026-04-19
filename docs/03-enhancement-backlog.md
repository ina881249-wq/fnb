# Enhancement Backlog — F&B ERP
## Future Enhancement Document

---

## A. Document Control

| Field | Value |
|---|---|
| Nama dokumen | Enhancement Backlog — F&B ERP Lusi & Pakan |
| Versi | 1.0 |
| Owner | Product Owner + Engineering Lead |
| Tanggal update | 2026-04-19 |
| Review cycle | Bi-weekly (setiap grooming session) |

---

## B. Enhancement Objective

### Tujuan Enhancement
Memperluas sistem dari MVP + Tier 2 menuju **production-grade enterprise ERP** yang:
- Memenuhi compliance audit Indonesia (PSAK, tax)
- Scalable untuk 50+ outlet
- Mendukung operasi 24/7 dengan otomatisasi penuh
- Memberi competitive advantage (AI, predictive analytics, omnichannel)

### Masalah yang Ingin Diselesaikan
1. **Finance rigor**: Budget tanpa versioning, no AR module, no multi-currency
2. **Scalability**: No caching, no read replicas, no async job queue
3. **Operational efficiency**: Manual alert trigger, manual backup, no daily digest
4. **User experience**: Keyboard shortcuts terbatas, no PWA, no offline mode
5. **Security**: No rate limit, no session revoke, no file virus scan
6. **Integration**: No payment gateway live, no accounting software sync (Accurate/Jurnal)

### Nilai Bisnis
- **Audit-ready**: mempermudah external audit, memenuhi syarat pinjaman bank
- **Risk reduction**: backup + encryption + rate limit mitigates data loss & security incidents
- **Operational scale**: 1 tim warehouse bisa handle 10 outlet (vs current 1:2)
- **Time-to-insight**: financial data real-time ke CFO tanpa menunggu closing manual

### Target User
- Owner, CFO, Finance Head, CTO, Auditor, Outlet Manager

### Outcome yang Diharapkan
- Revenue visibility hari ini jam 9 pagi ≤ 5 menit (vs current ±15 menit)
- Variance detection & alert ≤ 1 jam dari kejadian
- Zero data loss dari backup + replication
- Go-live di 5 outlet baru dalam 1 minggu (vs 1 bulan)

---

## C. Enhancement List

Format ringkas: setiap item punya detailed breakdown di section E.

| ID | Judul | Modul | Priority | Effort | Complexity | Status | Target |
|---|---|---|---|---|---|---|---|
| E-01 | Midtrans QRIS Payment Gateway | M-POS, M-FIN | **P0** | 5d | Medium | 🔴 Blocked (API keys) | Q2 2026 |
| E-02 | Budget Versioning + Approval Cycle | M-BUDGET | P1 | 5d | Medium | ⬜ Not Started | Q2 2026 |
| E-03 | COGS per-sale via BOM consumption | M-POS, M-JOURNAL | P1 | 7d | High | ⬜ Not Started | Q2 2026 |
| E-04 | Accounts Receivable module (credit sales) | M-FIN, M-JOURNAL | P1 | 5d | Medium | ⬜ Not Started | Q3 2026 |
| E-05 | Multi-level PO Approval (sequential) | M-APPR, M-PO | P2 | 3d | Low | ⬜ Not Started | Q3 2026 |
| E-06 | Scheduled Alerts (Celery/APScheduler) | M-ALERT | P1 | 3d | Medium | ⬜ Not Started | Pre-production |
| E-07 | Daily Digest Email | M-NOTIF | P2 | 3d | Low | ⬜ Not Started | Post go-live |
| E-08 | Automated MongoDB Backup to S3 | Infra | **P0** | 2d | Low | ⬜ Not Started | **Pre-production** |
| E-09 | CI/CD Pipeline (GitHub Actions → Emergent) | Infra | P1 | 4d | Medium | ⬜ Not Started | Pre-production |
| E-10 | Cash Ledger View (per bank account) | M-REPORT | P2 | 3d | Low | ⬜ Not Started | Q3 2026 |
| E-11 | Budget vs Actual Drill-down | M-REPORT, M-BUDGET | P2 | 3d | Low | ⬜ Not Started | Q3 2026 |
| E-12 | YoY Comparative Reports | M-REPORT | P2 | 2d | Low | ⬜ Not Started | Q3 2026 |
| E-13 | Multi-currency support | M-REPORT, M-FIN | P3 | 10d | High | ⬜ Not Started | 2027 |
| E-14 | Xendit / Stripe (payment backup) | M-POS | P3 | 5d | Medium | ⬜ Not Started | After Midtrans live |
| E-15 | Accurate / Jurnal.id sync (export batch) | Integration | P2 | 7d | High | ⬜ Not Started | Q3 2026 |
| E-16 | Redis cache for Financial Ratios | M-REPORT | P3 | 2d | Low | ⬜ Not Started | Post-scale |
| E-17 | Server-side pagination wiring (frontend) | Frontend | P2 | 3d | Low | ⬜ Not Started | Q3 2026 |
| E-18 | Materialized balance view | M-REPORT | P3 | 5d | Medium | ⬜ Not Started | Post-scale |
| E-19 | Mandatory 2FA for Finance roles | M-AUTH | **P0** | 1d | Low | ⬜ Not Started | Pre-production |
| E-20 | Session revocation list (Redis) | M-AUTH | P2 | 3d | Medium | ⬜ Not Started | Q3 2026 |
| E-21 | Attachment virus scan (ClamAV) | M-ATTACH | P1 | 3d | Medium | ⬜ Not Started | Pre-production |
| E-22 | Login rate limiting (slowapi) | M-AUTH | **P0** | 1d | Low | ⬜ Not Started | **Pre-production** |
| E-23 | Extended keyboard shortcuts | UI | P3 | 2d | Low | ⬜ Not Started | Q3 2026 |
| E-24 | Mobile PWA for Outlet Manager | Frontend | P2 | 5d | Medium | ⬜ Not Started | Q3 2026 |
| E-25 | Offline-capable Cashier (IndexedDB) | M-POS | P3 | 10d | High | ⬜ Not Started | 2027 |
| E-26 | Item master duplicate detector | M-INV | P2 | 2d | Low | ⬜ Not Started | Q3 2026 |
| E-27 | Recipe yield variance tracker | M-RECIPE, M-VAR | P2 | 3d | Medium | ⬜ Not Started | Q3 2026 |
| E-28 | Supplier performance scorecard | M-WH | P2 | 5d | Medium | ⬜ Not Started | Q3 2026 |
| E-29 | Read replicas (MongoDB replica set) | Infra | P1 | 3d | Medium | ⬜ Not Started | Post-scale |
| E-30 | Separate analytics DB (BI) | Infra | P3 | 7d | High | ⬜ Not Started | 2027 |
| E-31 | CDN for static assets | Infra | P3 | 1d | Low | ⬜ Not Started | Post go-live |
| E-32 | Sentry / Datadog monitoring | Infra | **P0** | 1d | Low | ⬜ Not Started | **Pre-production** |
| E-33 | Structured logging (JSON logs) | Backend | P1 | 2d | Low | ⬜ Not Started | Pre-production |
| E-34 | Central Warehouse Portal | M-WH | P2 | 7d | Medium | ⬜ Not Started | Q3 2026 |
| E-35 | Stock transfer in-transit tracking (with attachment) | M-WH | P2 | 3d | Medium | ⬜ Not Started | Q3 2026 |
| E-36 | Table management / QR order | M-POS | P3 | 7d | High | ⬜ Not Started | 2027 |
| E-37 | Split bill / merge bill | M-POS | P3 | 3d | Medium | ⬜ Not Started | 2027 |
| E-38 | Unit test coverage 60%+ | Testing | P1 | 10d | Medium | ⬜ Not Started | Ongoing |
| E-39 | Tax compliance (PPN / PPh output tax) | M-FIN | P2 | 7d | High | ⬜ Not Started | Q3 2026 |
| E-40 | Payroll / HR module | New | P3 | 15d | High | ⬜ Not Started | 2027+ |

---

## D. Enhancement Categorization

### D1. Functional Enhancement
- E-02 Budget Versioning
- E-03 COGS per-sale
- E-04 AR Module
- E-05 Multi-level PO Approval
- E-34 Central Warehouse Portal
- E-35 Stock transfer in-transit
- E-36 Table management
- E-37 Split bill
- E-39 Tax compliance
- E-40 Payroll

### D2. UX Enhancement
- E-23 Keyboard shortcuts
- E-24 Mobile PWA
- E-25 Offline Cashier

### D3. Automation Enhancement
- E-06 Scheduled alerts
- E-07 Daily digest email
- E-08 Automated backup
- E-09 CI/CD pipeline

### D4. Reporting Enhancement
- E-10 Cash Ledger
- E-11 Budget vs Actual drill-down
- E-12 YoY comparative
- E-13 Multi-currency

### D5. Performance Optimization
- E-16 Redis cache
- E-17 Server-side pagination
- E-18 Materialized balance view
- E-29 Read replicas
- E-30 Analytics DB
- E-31 CDN

### D6. Security Improvement
- E-19 Mandatory 2FA for finance
- E-20 Session revocation
- E-21 Attachment virus scan
- E-22 Login rate limiting
- E-32 Monitoring
- E-33 Structured logging

### D7. Data Quality Improvement
- E-26 Item master dedup
- E-27 Recipe yield tracker
- E-28 Supplier scorecard

### D8. Integration Expansion
- E-01 Midtrans QRIS
- E-14 Xendit / Stripe
- E-15 Accurate / Jurnal.id sync

### D9. Scalability Enhancement
- E-29 Read replicas
- E-30 Analytics DB

### D10. Testing
- E-38 Unit tests coverage

---

## E. Detailed Enhancement Breakdown

### E-02: Budget Versioning + Approval Cycle

**Current limitation**: Budget per outlet per period adalah single value yang dapat di-overwrite tanpa trace. Tidak ada distinction antara original vs revised, tidak ada jejak audit siapa yang merevisi dan kenapa.

**Proposed solution**:
1. New collection `budget_versions` (header) dan `budget_lines` (detail per account+period)
2. State: `draft` → `submitted` → `approved` → `locked`; after locked, revisi = new version
3. Fields: `version_number`, `parent_version_id`, `revision_reason`, `effective_from/to`, `approved_by/at`
4. Variance report: dropdown pilih "Compare vs Version X"
5. UI: Version list + diff view + approve dialog

**Expected impact**:
- Transparency: CFO lihat berapa kali budget direvisi dan kenapa
- Accountability: outlet manager tidak bisa "diam-diam" turunin target
- Regulatory: audit trail lengkap

**User journey impact**: Finance Head akan ada additional step "approve revision" setiap kali budget berubah.

**Data model impact**: Migrasi data existing budget → convert ke `budget_versions` v1.0 approved.

**API impact**: New endpoints `/api/budgets/versions/*`, existing `/api/budgets` deprecated gradually.

**UI impact**: Budget page: tab "Versions" + diff viewer. Variance report: version selector.

**Risk**: Migrasi data kompleks; pastikan zero-downtime.

**Implementation note**: Leverage existing approval engine untuk approval flow.

---

### E-03: COGS per-sale via BOM consumption

**Current limitation**: COGS saat ini hanya di-post saat waste/adjustment (bukan per penjualan). Akibatnya, P&L real-time tidak benar-benar matching revenue dengan direct cost-of-sale.

**Proposed solution**:
1. Saat POS order confirmed → lookup recipe.ingredients → decrease stock_on_hand + post COGS journal (Dr COGS / Cr Inventory)
2. Fallback: jika recipe tidak ada, skip COGS journal (log warning)
3. Recipe versioning: track historical cost-per-recipe snapshots

**Expected impact**:
- True P&L per outlet per day (matching principle)
- Gross margin accurate per menu item
- Inventory accuracy improved (stock-as-sold)

**Risk**: Performance (POS must be snappy; COGS posting async via task queue)

**Implementation note**: Gunakan Celery atau FastAPI BackgroundTasks untuk posting async.

---

### E-04: Accounts Receivable module

**Current limitation**: Semua sales dianggap cash on delivery. Tidak ada tracking invoice customer, credit terms, aging receivables.

**Proposed solution**:
1. New collection `customers` + `invoices` + `payments_received`
2. Sales summary dapat flagged as "credit" → generate invoice
3. AR aging report (current, 30, 60, 90, 90+)
4. Payment matching endpoint
5. Auto-dunning emails (future)

**Expected impact**:
- B2B catering sales dapat ditrack proper
- Cash flow forecasting akurat

---

### E-08: Automated MongoDB Backup to S3 — **P0 CRITICAL PRE-PROD**

**Current limitation**: No backup automation. RPO 24 jam best case, bisa kehilangan 1 hari data.

**Proposed solution**:
1. Daily cron (3 AM) → `mongodump` dump → upload S3 (with date prefix)
2. Retention: 30 daily, 12 monthly, 7 yearly
3. Encrypted at rest (S3 SSE)
4. Restore procedure documented + tested

**Expected impact**:
- RPO 24h → RPO 1h (with incremental oplog future)
- Compliance with Indonesia data protection

**Implementation**:
```bash
mongodump --uri $MONGO_URL --gzip --archive=/tmp/backup-$(date +%F).gz
aws s3 cp /tmp/backup-$(date +%F).gz s3://lusipakan-backups/mongo/
```

**Dependency**: AWS S3 bucket provisioned; IAM creds in env.

---

### E-19: Mandatory 2FA for Finance roles — **P0 PRE-PROD**

**Current limitation**: 2FA opsional untuk semua user.

**Proposed solution**:
1. Policy: user dengan role Finance Head / Super Admin WAJIB enable 2FA
2. Login: jika role qualify dan 2FA disabled, force redirect ke `/2fa-setup` before access system
3. Config via `role.require_2fa=true`

**Risk**: Lock-out user existing; siapkan migration window + emergency bypass for superadmin.

---

### E-22: Login Rate Limiting — **P0 PRE-PROD**

**Current limitation**: Tidak ada rate limit; brute force attack possible.

**Proposed solution**: `slowapi` middleware
- 10 requests / minute per IP untuk `/api/auth/login`
- 100 requests / minute per user untuk other endpoints
- 429 Too Many Requests + Retry-After header

---

### E-32: Sentry / Datadog Monitoring — **P0 PRE-PROD**

**Proposed**: Integrate Sentry SDK (free tier → paid when scale)
- Backend: `sentry-sdk[fastapi]`
- Frontend: `@sentry/react`
- Alert on error spike (>5 / min)

---

*(Detailed breakdown untuk E-05 hingga E-40 mengikuti format yang sama — Current → Proposed → Impact → Risk → Implementation note. Detail penuh akan ditambahkan saat item diprioritaskan.)*

---

## F. Prioritization Matrix

### By Impact × Effort

```
High Impact │ [E-02 Budget Vers]       │ [E-03 COGS per-sale]
            │ [E-08 Backup]            │ [E-04 AR Module]
            │ [E-19 2FA Mandatory]     │ [E-15 Accurate Sync]
            │ [E-22 Rate Limit]        │ [E-39 Tax Compliance]
            │                          │
            │ High Impact / Low Effort │ High Impact / High Effort
────────────┼──────────────────────────┼────────────────────────
            │ Low Impact / Low Effort  │ Low Impact / High Effort
            │                          │
Low Impact  │ [E-12 YoY Report]        │ [E-13 Multi-currency]
            │ [E-16 Redis cache]       │ [E-30 Analytics DB]
            │ [E-23 Keyboard shortcut] │ [E-25 Offline POS]
            │ [E-31 CDN]               │ [E-40 Payroll]
```

### MoSCoW Classification

**Must-have (pre-production)**:
- E-01 Midtrans QRIS
- E-08 Automated backup
- E-19 Mandatory 2FA finance
- E-22 Login rate limit
- E-32 Monitoring setup

**Should-have (Q2-Q3 2026)**:
- E-02 Budget versioning
- E-03 COGS per-sale
- E-04 AR Module
- E-06 Scheduled alerts
- E-09 CI/CD
- E-21 Attachment virus scan
- E-29 Read replicas
- E-33 Structured logging
- E-38 Unit tests

**Could-have (2026 jika timeline allow)**:
- E-05 Multi-level PO approval
- E-07 Daily digest email
- E-10, E-11, E-12 Enhanced reports
- E-15 Accurate sync
- E-17 Server-side pagination
- E-24 Mobile PWA
- E-26, E-27, E-28 Data quality
- E-34, E-35 Warehouse advanced
- E-39 Tax compliance

**Won't-have (2027+)**:
- E-13 Multi-currency
- E-14 Xendit (dual gateway)
- E-25 Offline POS
- E-30 Analytics DB
- E-36 Table / QR order
- E-37 Split bill
- E-40 Payroll

---

## G. Business Case per Enhancement (Selected)

### E-02 Budget Versioning
- **Revenue impact**: Indirect — better planning saves Rp ~50jt / outlet / tahun
- **Cost saving**: Reduced financial rework ~40 hours / tahun
- **Productivity**: Faster budget approval cycle (from email → system)
- **Risk reduction**: Audit-ready
- **User satisfaction**: CFO happy

### E-03 COGS per-sale
- **Revenue impact**: Better menu pricing (identify low-margin items) → +5% gross margin potential
- **Cost saving**: Detect recipe waste / over-portioning
- **Insight**: Real-time P&L per outlet

### E-08 Backup — **CRITICAL**
- **Risk reduction**: Prevents catastrophic data loss
- **Compliance**: Required for most enterprise contracts
- **Business continuity**: RPO 1h vs 24h

### E-15 Accurate / Jurnal.id sync
- **Productivity**: Eliminates manual re-entry ke accounting software
- **Cost saving**: ~Rp 10-20jt / bulan untuk outsourced bookkeeper
- **Revenue impact**: Indirect (faster financial close)

### E-19 Mandatory 2FA
- **Risk reduction**: Huge — prevents account compromise on high-privilege roles
- **Cost saving**: Avoids breach costs

---

## H. Technical Feasibility

| Enhancement | Feasibility | Architecture Dependency | Data Dependency | 3rd Party Dependency | Refactor Needed |
|---|---|---|---|---|---|
| E-01 Midtrans | ✅ High | Existing POS | Transaction volume data | Midtrans API | Small |
| E-02 Budget Vers | ✅ High | Existing budget | Existing budget rows | - | Medium (migration) |
| E-03 COGS per-sale | ⚠️ Medium | Async queue needed | Recipe data quality | Optional Celery | Medium |
| E-04 AR Module | ✅ High | - | New tables | - | Low |
| E-08 Backup | ✅ High | Infra change | - | AWS S3 | None |
| E-13 Multi-currency | ⚠️ Low | Major journal refactor | Exchange rate source | Currency API | Huge |
| E-15 Accurate sync | ⚠️ Medium | Export engine | Journal data | Accurate API | Medium |
| E-29 Read replicas | ✅ High | Mongo config | - | - | None (read query routing) |
| E-30 Analytics DB | ⚠️ Medium | ETL pipeline | - | ClickHouse / DuckDB | Medium |

---

## I. Future Roadmap

### Tahap 1 — Pre-Production Hardening (2-3 minggu)
**Goal**: System siap go-live production dengan keamanan + operasional readiness

- E-08 Automated backup
- E-19 Mandatory 2FA for finance
- E-22 Login rate limiting
- E-32 Sentry monitoring
- E-33 Structured logging
- E-21 Attachment virus scan

### Tahap 2 — Q2 2026 (Post go-live)
**Goal**: Fill critical functional gaps

- E-01 Midtrans QRIS (assuming keys arrive)
- E-02 Budget versioning
- E-03 COGS per-sale (POC at 1 outlet first)
- E-06 Scheduled alerts
- E-09 CI/CD
- E-38 Unit tests (60% coverage)

### Tahap 3 — Q3 2026
**Goal**: Reporting depth + integrations

- E-04 AR Module
- E-05 Multi-level PO approval
- E-10 Cash Ledger
- E-11 Budget vs Actual
- E-12 YoY
- E-15 Accurate / Jurnal sync
- E-17 Server-side pagination
- E-24 Mobile PWA
- E-26, E-27, E-28 Data quality
- E-34, E-35 Warehouse advanced
- E-39 Tax compliance
- E-29 Read replicas

### Tahap 4 — 2027 Long-term Vision
**Goal**: Omnichannel + scale

- E-13 Multi-currency (if expand internationally)
- E-14 Xendit / Stripe dual gateway
- E-25 Offline POS
- E-30 Analytics DB (BI)
- E-36 Table / QR order
- E-37 Split bill
- E-40 Payroll / HR

### Long-term (nice-to-have)
- AI-powered demand forecasting per menu
- Supply chain optimization (auto-PO triggering)
- Customer loyalty program integration
- Franchise management module
- Multi-brand support (jika Lusi & Pakan ekspansi brand)

---

## J. Deferred Ideas

| Ide | Alasan Ditunda | Kondisi agar Bisa Dikerjakan |
|---|---|---|
| Blockchain-based audit ledger | Over-engineering for current scale | 100+ outlet, regulatory pressure |
| Voice-activated POS | UX unproven, infra cost high | Kasir feedback + accessibility law |
| Drone delivery integration | Out of scope | New business line |
| NFT customer loyalty | Hype cycle, low adoption | Customer demand validated |
| On-prem deployment option | No demand yet | Enterprise client with data sovereignty |
| React Native rebuild for POS | PWA cukup | PWA performance proven insufficient |

### Prasyarat Teknis yang Belum Ada
- Redis cluster (for caching + session revocation + rate limiter)
- Celery workers (for async jobs)
- Kafka / event bus (for service decoupling)
- Kubernetes multi-zone deployment
- CDN (Cloudflare or similar)

### Prasyarat Bisnis yang Belum Ada
- Production client commitment + payment terms
- Regulatory confirmation (PSAK compliance approval from auditor)
- Data Privacy Impact Assessment (UU PDP Indonesia)
- Staff training program

---

## Appendix — Estimation Reference

### Effort Scale
- **1d**: 1 engineer-day (~6 hours productive work)
- **Low complexity**: Boilerplate, well-understood patterns
- **Medium complexity**: New integration / new data model
- **High complexity**: Cross-cutting refactor, or unfamiliar domain

### Priority Definitions
- **P0**: Must do before production (blocker)
- **P1**: Critical for launch plans 30-90 days post-go-live
- **P2**: Important, 3-6 months
- **P3**: Nice-to-have, 6-12 months
- **P4**: Ideas, speculative

---

**End of Enhancement Backlog v1.0.**
