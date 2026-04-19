# Development Tracker — F&B ERP
## Implementation Progress Document

---

## A. Document Control

| Field | Value |
|---|---|
| Nama dokumen | Development Tracker — F&B ERP Lusi & Pakan |
| Versi | 1.0 |
| Tanggal update | 2026-04-19 |
| Owner | Engineering Team Lead |
| Update cadence | Mingguan (setiap end-of-sprint retro) |
| Reviewer | CTO, Product Owner |

---

## B. Project / Module Summary

| Field | Value |
|---|---|
| Project | F&B Financial Control Platform |
| Client | Lusi & Pakan (Fusion Local Bali) |
| Scope aktif | Tier 2 Enhancements (T2.1/T2.1-Plus/T2.3/T2.2) — **COMPLETE** |
| Timeline target | MVP: Q1 2026 · Tier 2: April 2026 |
| Sprint aktif | Sprint 10 (wrap-up + documentation) |
| Go-live target | Setelah production MongoDB + Midtrans keys tersedia |

---

## C. Status Legend

| Symbol | Status | Arti |
|---|---|---|
| ✅ | **Done** | Selesai, tested, merged |
| 🟡 | **In Progress** | Aktif dikerjakan |
| ⬜ | **Not Started** | Belum dimulai |
| 🔴 | **Blocked** | Terhambat — perlu intervensi |
| 🔍 | **Pending Review** | Code review / QA |
| 🧪 | **Pending UAT** | Menunggu UAT dari user |
| 🚀 | **Pending Deployment** | Ready tapi belum di-release |

---

## D. Master Worklist

### Phase 1 — MVP Core (Q1 2026) — ✅ COMPLETE

| Modul | Submodul | Feature | Status | Owner | Est. | Actual | Notes |
|---|---|---|---|---|---|---|---|
| Auth | Login + RBAC | JWT + permission matcher | ✅ | Eng | 3d | 3d | |
| Auth | 2FA | TOTP via pyotp + QR | ✅ | Eng | 2d | 2d | |
| Auth | Invite Flow | Email invite + accept | ✅ | Eng | 2d | 2d | |
| Auth | Session Logs | IP+UA tracking | ✅ | Eng | 1d | 1d | |
| Core | Users/Roles/Outlets | CRUD + seeding | ✅ | Eng | 3d | 3d | |
| Finance | Sales Summary | Input form + auto-journal | ✅ | Eng | 2d | 2d | |
| Finance | Petty Cash | CRUD + auto-journal | ✅ | Eng | 2d | 2d | |
| Finance | Cash Movements | settlement/in/out + auto-journal | ✅ | Eng | 2d | 2d | |
| Finance | Reconciliation | Bank statement import + matching | ✅ | Eng | 3d | 4d | Sprint B |
| COA | Tree view + CRUD | Accordion hierarchy | ✅ | Eng | 2d | 3d | Fixed Babel recursion bug |
| Journal | Manual entry | Double-entry validation | ✅ | Eng | 2d | 2d | |
| Journal | Batch post | Multiple journals atomic | ✅ | Eng | 1d | 1d | |
| Closing | Daily Closing Stepper | 5-step outlet workflow | ✅ | Eng | 3d | 4d | Phase 1C |
| Inventory | Items CRUD | Master + cost_per_unit | ✅ | Eng | 2d | 2d | |
| Inventory | Stock on hand | Denormalized from movements | ✅ | Eng | 2d | 2d | |
| Recipe | BOM | yield_factor + ingredients | ✅ | Eng | 2d | 2d | |
| Production | Kanban | Queue + status | ✅ | Eng | 2d | 3d | Sprint C |
| Variance | Reporting | Per outlet + per item | ✅ | Eng | 2d | 2d | Phase 1D |
| Alerts | Engine | Low stock + overdue closing | ✅ | Eng | 2d | 2d | |
| Approvals | Granular Rules | Per-type, per-amount | ✅ | Eng | 2d | 2d | Phase 2A |
| Budget | Per outlet | Single value | ✅ | Eng | 2d | 2d | Versioning deferred |
| Executive | Dashboard | 6 pages + AI | ✅ | Eng | 5d | 6d | Priority 2 |
| UI | Dark/Light + i18n | Context + CSS vars | ✅ | Eng | 3d | 3d | |
| UI | DataTable | Reusable table | ✅ | Eng | 2d | 2d | Sprint A |
| UI | CommandPalette | Ctrl+K global search | ✅ | Eng | 2d | 2d | Sprint B |
| Outlet | Task Dashboard | 4 action cards | ✅ | Eng | 2d | 2d | |

### Phase 2 — POS & Kitchen + Hardware (March-April 2026) — ✅ COMPLETE

| Modul | Feature | Status | Est. | Actual | Notes |
|---|---|---|---|---|---|
| Cashier | POS tablet UI | ✅ | 4d | 5d | P1c |
| Cashier | ESC/POS printer integration | ✅ | 3d | 3d | E1 |
| Kitchen | KDS Kanban | ✅ | 3d | 3d | P2e |
| Kitchen | WebSocket real-time | ✅ | 2d | 2d | E2 |
| Warehouse | Transfer workflow | ✅ | 3d | 3d | P2c |

### Phase 3 — Tier 2 Enhancements (April 2026) — ✅ COMPLETE

| Task | Feature | Status | Test Report | Notes |
|---|---|---|---|---|
| T2.1 | Journal-driven P&L / Neraca / Cashflow | ✅ | iter_5 90% | 299 journals backfilled |
| T2.1-Plus | SCE + Financial Ratios + Revenue Trend | ✅ | iter_6 98% | 8 KPI bar, waterfall, treemap |
| T2.1-Plus | Period presets + Comparison toggle | ✅ | iter_6 | 12 presets |
| T2.1-Plus | GL drill-down modal | ✅ | iter_6 | Click any account row |
| T2.3 | Notification Center backend | ✅ | iter_7 96% | 5 endpoints |
| T2.3 | NotificationBell + 6 layouts integration | ✅ | iter_7 | WS push + polling fallback |
| T2.3 | Emit hooks (approvals/alerts/closing/warehouse) | ✅ | iter_7 | 10+ emit points |
| T2.2 | Configurable threshold per outlet | ✅ | iter_7 | GET/PUT settings |
| T2.2 | Adjustment approval flow | ✅ | iter_7 | pending_approval → approve/reject |
| T2.2 | Purchase Order full workflow | ✅ | iter_7 | state machine 6 stages |
| T2.2 | GridFS attachments | ✅ | iter_7 | 10MB limit, download streaming |
| T2.2 | Purchase Orders UI | ✅ | iter_7 | PurchaseOrdersPage.js |
| T2.2 | Warehouse Settings UI | ✅ | iter_7 | WarehouseSettingsPage.js |

---

## E. Development Progress by Module

### M-AUTH (Authentication & RBAC) — ✅ 100%
- ✅ Login JWT
- ✅ Permission matcher (wildcard, glob)
- ✅ Outlet scope enforcement
- ✅ 2FA TOTP
- ✅ User invite flow
- ✅ Session activity logs
- ✅ Password policy (bcrypt, min 8, uppercase, digit)
- ⬜ Refresh token (future)
- ⬜ Session revocation list (future)

### M-FIN (Finance) — ✅ 95%
- ✅ Sales Summary input + auto-journal
- ✅ Petty Cash CRUD + auto-journal
- ✅ Cash Movements + auto-journal
- ✅ Bank Statement Import + matching engine
- ⬜ Payment (Midtrans) — BLOCKED (waiting keys)
- ⬜ AR module (credit sales) — planned

### M-JOURNAL — ✅ 100%
- ✅ Manual entry (double-entry validated)
- ✅ Batch post
- ✅ Reverse journal
- ✅ List + filter + pagination
- ✅ Auto-post via `posting_service.py` (6 source types)
- ✅ Backfill via admin endpoint

### M-COA — ✅ 100%
- ✅ CRUD accounts
- ✅ Tree view (parent_code hierarchy)
- ✅ Account types enum + normal_balance inference

### M-REPORT — ✅ 100% (Tier 2 Plus complete)
- ✅ P&L (Laba Rugi)
- ✅ Balance Sheet (Neraca)
- ✅ Cashflow Statement (Arus Kas)
- ✅ Statement of Changes in Equity (Perubahan Ekuitas)
- ✅ Trial Balance
- ✅ General Ledger (per-account, paginated)
- ✅ Financial Ratios (20+ metrics)
- ✅ Revenue Trend (daily/weekly/monthly)
- ✅ Inventory Valuation
- ✅ Export Excel/PDF
- ✅ Period presets (12) + comparison toggle
- ✅ Drill-down modal

### M-WH (Warehouse) — ✅ 95%
- ✅ Suppliers CRUD
- ✅ GRN (Goods Receipt Note)
- ✅ Transfer workflow (request/approve/in_transit/receive)
- ✅ Adjustments with threshold-based approval
- ✅ Inventory counts
- ✅ Purchase Orders (draft→submitted→approved→received→closed)
- ✅ Per-outlet settings
- ✅ GridFS attachments (upload/download/delete)
- ⬜ Multi-level PO approval (future)
- ⬜ Supplier performance scorecard (future)

### M-POS (Cashier) — ✅ 95%
- ✅ Tablet-first UI
- ✅ Menu browser + cart
- ✅ Shift open/close
- ✅ Payment methods (cash/card/online/other)
- ✅ Kitchen ticket push via WS
- ✅ ESC/POS printer integration (Web Serial)
- ✅ Receipt templating
- ⬜ Table management / QR order (future)
- ⬜ Split bill (future)

### M-KDS (Kitchen) — ✅ 100%
- ✅ Kanban queue (new → in_progress → ready → served)
- ✅ WebSocket real-time
- ✅ Full-screen mode
- ✅ Ticket details modal

### M-EXEC (Executive Portal) — ✅ 100%
- ✅ Overview (KPIs)
- ✅ Revenue deep-dive
- ✅ Outlets ranking
- ✅ Control Tower (alerts feed)
- ✅ AI Insights (Emergent LLM)
- ✅ AI Chat
- ✅ AI Forecast
- ✅ AI Anomalies

### M-NOTIF — ✅ 100%
- ✅ Notifications CRUD endpoints
- ✅ WS broadcast (per user / per outlet / all)
- ✅ NotificationBell component
- ✅ Integrated 6 layouts
- ✅ Emit hooks: approvals (submit/approve/reject), alerts (auto), closing (submit/lock), warehouse (adj/PO)

### M-APPR — ✅ 100%
- ✅ Submit/approve/reject endpoints
- ✅ Granular rules (approval_rules collection)
- ✅ Notification integration
- ⬜ Multi-level sequential approval (future)

### M-ALERT — ✅ 100%
- ✅ Engine (low stock, overdue closing, variance)
- ✅ Resolve/dismiss
- ✅ Notification push
- ⬜ Scheduled auto-run (currently manual trigger)

### M-ADMIN — ✅ 100%
- ✅ Journal backfill endpoint
- ✅ Coverage statistics endpoint
- ✅ Frontend Coverage dialog

### M-HW (Hardware) — ✅ 100%
- ✅ Web Serial API wrapper
- ✅ ESC/POS command builder
- ✅ Printer settings page
- ✅ Fallback to browser print

---

## F. Ongoing Work Section

**Saat ini tidak ada work aktif.** Tier 2 sudah complete; system siap untuk:
- UAT internal yang lebih panjang
- Production deployment setup
- Tier 3 enhancements (lihat Backlog)

---

## G. Not Started Section

| Item | Priority | Alasan | Dependency | Target Sprint |
|---|---|---|---|---|
| Midtrans QRIS integration | P1 | Menunggu API keys dari client | Client provides keys | Q2 2026 |
| Budget Versioning (B1-B4) | P2 | Scope kreatif, perlu approval design | Product Owner sign-off | TBD |
| Multi-level PO Approval | P3 | Current single-approver sufficient for MVP | - | Post go-live |
| Cron scheduler untuk alerts | P3 | Manual trigger works for now | Celery + Redis setup | Post go-live |
| Automated backup | P1 | Risk mitigation critical pra-prod | DevOps setup | Pre-production |
| CI/CD pipeline | P2 | Manual deploy works but scales poorly | Repo + K8s config | Pre-production |
| Materialized balance view | P3 | Performance optimization | Benchmark shows bottleneck | Post go-live jika perlu |

---

## H. Blocker / Issue Log

### Active Blockers
**Tidak ada active blocker saat ini.**

### Resolved Issues

| ID | Deskripsi | Severity | Modul | Tanggal Ditemukan | Rencana Penyelesaian | Status |
|---|---|---|---|---|---|---|
| BUG-001 | Babel recursion error saat render COA tree | High | M-COA | 2026-01-28 | Flatten tree structure | ✅ Fixed |
| BUG-002 | MongoDB `_id` parsing error di `serialize_doc` | High | M-CORE | 2026-01-30 | Handle ObjectId → str conversion | ✅ Fixed |
| BUG-003 | Stock on hand dengan invalid ObjectId (empty) | Low | M-INV | 2026-04-19 | Manual cleanup script | ✅ Fixed |
| BUG-004 | Approval 403 test flaky | Low | M-APPR | 2026-04-19 | Confirmed working manually | ✅ Verified |
| BUG-005 | Filter dropdown testing-agent strict selector | Low | UI | 2026-04-05 | Confirmed manually | ✅ Verified (false positive) |

---

## I. Decision Log

| Tanggal | Keputusan | Alasan | Approver |
|---|---|---|---|
| 2026-01-15 | Modular monolith (bukan microservices) | Velocity, tim kecil, MVP | CTO |
| 2026-01-15 | MongoDB (bukan PostgreSQL) | Schemaless flexibility, ada di Emergent default | CTO |
| 2026-02-10 | React SPA (bukan Next.js) | Simple routing, no SSR need | Eng Lead |
| 2026-02-20 | Custom RBAC (bukan Keycloak/Auth0) | Outlet-scoping kompleks, kontrol penuh | CTO |
| 2026-03-05 | Web Serial API untuk printer (bukan cloud print) | Direct USB, gratis, no backend | Product |
| 2026-03-15 | WebSocket native (bukan Pusher/Ably) | Cost, simplicity, 1 pod deployment | CTO |
| 2026-04-01 | Emergent LLM Key (bukan direct OpenAI API) | Single key management, universal | Product |
| 2026-04-10 | Midtrans (bukan Xendit/Stripe) untuk QRIS | Client preference | Product |
| 2026-04-15 | Journal-driven reports (bukan aggregate sales) | Single source of truth, audit-grade | CFO |
| 2026-04-19 | Configurable threshold per outlet (Option D) | Flexibility different outlet size | Product |
| 2026-04-19 | GridFS untuk attachments (bukan S3) | No external dependency, ≤10MB OK | Eng Lead |

---

## J. Change Log

### v1.0 → Current (April 2026)

**Added**:
- Statement of Changes in Equity report + endpoint
- Financial Ratios dashboard (8 KPI cards)
- Revenue Trend endpoint (daily/weekly/monthly buckets)
- Period preset component (12 presets)
- Comparison toggle (current vs prior period)
- General Ledger drill-down modal
- Notification Center module (complete)
- Purchase Order full workflow
- Warehouse settings (threshold per outlet)
- GridFS attachment system
- Adjustment approval flow

**Changed**:
- ReportsPage complete rewrite with advanced visualizations
- Adjustments: now supports pending_approval status
- Warehouse sidebar: added "Purchase Orders" + "Settings" links
- Bell icon in all 6 layouts (replaced static Bell button)

**Deprecated**:
- Legacy sales_summaries-based report calculations (still exist but not used)

**Removed**:
- None (backward compatible)

### Previous versions: lihat Riwayat Perubahan di TDD

---

## K. Testing Status

### Test Reports Archive

| Iteration | Date | Scope | Backend | Frontend | Critical Bugs |
|---|---|---|---|---|---|
| iter_1 | Feb 2026 | Phase 2A drill-down | 94% | - | 0 |
| iter_2 | Mar 2026 | Sprint A/B/C | 88% | 85% | 0 |
| iter_3 | Mar 2026 | Executive portal | 92% | 90% | 0 |
| iter_4 | Apr 2026 | Lusi & Pakan reseed, DataTable rollout | 88% | 82% | 0 (false positives) |
| iter_5 | Apr 15 | T2.1 Journal-driven reports | 92.5% | 85% | 0 |
| iter_6 | Apr 19 | T2.1-Plus SCE + Ratios + Drill-down | 96.2% | 100% | 0 |
| iter_7 | Apr 19 | T2.3 + T2.2 | 96% | 90% | 0 |

### Bug Status (Current)
- **Open**: 0 critical, 0 high
- **Fixed pending verify**: 0
- **Verified fixed**: 5 (lihat Blocker Log)

### Release Readiness
- Ready for UAT: ✅ Yes
- Ready for Prod: ⚠️ Need backup + CI/CD setup

---

## L. Release Readiness

### Siap Rilis ✅
- Semua 6 portal fungsional
- Journal-driven reports lengkap
- Notification Center
- Advanced Warehouse (PO + attachments + threshold)
- 2FA + password policy
- ESC/POS printer integration
- WebSocket real-time

### Pending Sebelum Produksi

| Item | Status | Blocker |
|---|---|---|
| MongoDB replica set | ⬜ | DevOps / Infrastructure |
| Automated daily backup | ⬜ | DevOps |
| Production domain + SSL | ⬜ | Client / DevOps |
| Midtrans API keys | ⬜ | Client |
| Production env secrets | ⬜ | DevOps |
| Monitoring (Sentry / Datadog) | ⬜ | DevOps |
| Load testing | ⬜ | Eng |
| Migration plan (seed → real data) | ⬜ | Client data |

### Approval Readiness
- ✅ Engineering sign-off
- ✅ Design sign-off
- ⬜ Product Owner UAT sign-off (pending full UAT cycle)
- ⬜ Client acceptance

---

## M. Daily / Weekly Progress Summary

### Minggu 16 (2026-04-14 → 2026-04-19)

**Completed**:
- T2.1 Journal-driven reports E2E + backfill (299 journals)
- T2.1-Plus UI overhaul (ratios bar, presets, comparison, waterfall, donut, treemap, drill-down)
- T2.3 Notification Center full stack + WS push + 6 layouts
- T2.2 PO workflow + threshold + GridFS attachments + settings
- Fixed: stock_on_hand invalid ObjectId
- Documentation: TDD + Tracker + Backlog

**Active**:
- Documentation finalization (this week)

**New Blockers**:
- None

**Planned Next**:
- Await client input for Tier 3 priorities
- UAT cycle kick-off

**Risk Update**:
- Midtrans still waiting client keys — low urgency
- Production infra setup belum dimulai — medium urgency saat go-live approach

### Minggu Sebelumnya (ringkasan)
- Minggu 15: Phase 2 - POS/Kitchen/ESC-POS/2FA/WS
- Minggu 14: Lusi & Pakan reseed + DataTable rollout + auto-journals
- Minggu 13: Executive portal built
- Minggu 12: Sprint A/B/C hardening (DataTable, CommandPalette, OutletTaskHome)

---

## N. Technical Debt Tracker

| # | Category | Item | Impact | Est. to Fix | Priority |
|---|---|---|---|---|---|
| TD-01 | Code Quality | Beberapa pages lama belum pake `<DataTable />` (Cash Movements, Inventory Stock, Items, Sales Summary, Petty Cash, Recipes) | Inconsistent UX | 3d | P2 |
| TD-02 | Performance | No Mongo aggregation pipeline untuk reports (in-memory Python) | Slow saat data scale | 2d | P3 |
| TD-03 | Schema | No strict schema validation on inserts (Pydantic on API only) | Data drift risk | 3d | P2 |
| TD-04 | Code Quality | Linter warnings di warehouse_router.py (pre-existing multi-statement lines) | Cosmetic | 1d | P4 |
| TD-05 | Testing | No unit tests; rely on integration via testing agent | Regression risk | 10d | P2 |
| TD-06 | Documentation | API docs hanya via FastAPI auto-swagger (no curated) | Onboarding friction | 2d | P3 |
| TD-07 | Security | TOTP secret plaintext at rest | Compliance risk pra-prod | 1d | P1 |
| TD-08 | Security | No rate limiting on login endpoint | Brute-force risk | 1d | P1 |
| TD-09 | Performance | Server-side pagination tidak di-wire di frontend (Stock Movements, POS Orders) | OK sekarang, risk saat scale | 2d | P3 |
| TD-10 | Observability | No Sentry / structured logging | Hard to diagnose in prod | 2d | P2 |
| TD-11 | Operations | No automated DB backup | RPO 24h unacceptable prod | 2d | P1 |
| TD-12 | Operations | No CI/CD pipeline | Manual deploy friction | 3d | P2 |
| TD-13 | Architecture | Emit hooks tightly coupled in routers (should use event bus) | Hard to extend | 5d | P3 |
| TD-14 | Data | No duplicate detection on item master | Manual cleanup needed | 2d | P3 |
| TD-15 | UX | Toast messages sometimes cover important UI | Occasional UX friction | 1d | P4 |

### Prioritas Tindak Lanjut (P1)
1. **TD-07**: Encrypt TOTP secrets pre-prod
2. **TD-08**: Add rate limiting (slowapi)
3. **TD-11**: Setup mongodump cron + S3 upload

**End of Development Tracker v1.0.**
