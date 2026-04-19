# UI Modernization Plan — Premium Interactive Experience

**Client:** Lusi & Pakan (Fusion Local Bali F&B)
**Document Version:** 1.0
**Last updated:** 2026-04-19
**Owner:** Frontend / Tech Lead
**Status:** **Active** — Phase EXEC-1 completed; rollout in progress

---

## A. Executive Summary

Dokumen ini mendefinisikan **strategi, standar, dan rencana bertahap** untuk memodernisasi seluruh UI F&B ERP menjadi **dashboard-grade, interactive, insightful, premium** — setara atau melebihi referensi modern seperti Dashbrd X (BRIX Templates) — **tanpa merusak fitur yang sudah berjalan**.

Modernisasi ini **dimulai dari Executive Portal** (sebagai flagship — visual impact tertinggi dan beban data terbesar), kemudian **di-adopsi secara terkendali ke 5 portal lainnya**: Management, Outlet, Cashier, Kitchen, Warehouse.

### Prinsip Utama

1. **Reusable first** — Setiap komponen interaktif dibangun sekali di `/components/executive/` (akan dipromosikan menjadi `/components/premium/` pada Phase B) dan digunakan di banyak tempat.
2. **Backward compatible** — Modernisasi tidak boleh mematahkan alur existing. Rollout menggunakan strategi **progressive migration** (bukan big-bang rewrite).
3. **Design tokens, bukan hardcode** — Semua warna, spacing, radius, shadow via CSS variables. Ini memungkinkan theming multi-portal dan dark/light mode sempurna.
4. **Interactive by default** — Setiap card, chart, list harus punya minimum 1 interaksi bermakna (drill-down, deep-link, hover insight).
5. **Performance conscious** — Skeleton loaders, memoized transforms, debounced WebSocket updates, prefers-reduced-motion.
6. **i18n + a11y built-in** — EN/ID + keyboard nav + focus-visible + ARIA dari awal.

### Target Outcome

| Dimensi | Baseline (Sebelum) | Target (Setelah) |
|---|---|---|
| Interaksi per card | 0 (statis) | 2-4 (hover, click, drill, deep-link) |
| Visual cohesion | Glass dasar, variasi ad-hoc | Design tokens konsisten, 1 set komponen premium |
| Informativeness | "Apa" | "Apa + Mengapa + Apa selanjutnya" |
| Waktu untuk wawasan | 3-5 klik | 1 klik (drill-down modal) |
| First impression | Functional | Premium / setara SaaS kelas atas |

---

## B. Design System — "Premium Interactive Glass"

### B.1 Color Tokens

Sistem warna kita **dual-layer**:

1. **Global tokens** (sudah ada): `--primary` (teal 174° 84% 45%), `--accent`, `--foreground`, `--muted-foreground`, `--border`, `--destructive`, `--glass-bg`, `--glass-border`, dst.
2. **Portal-specific accents** (baru): ditambahkan khusus untuk memberi identitas visual tiap portal tanpa mengorbankan konsistensi.

#### Portal Accent Matrix

| Portal | Primary (global) | Portal Accent (baru) | Rationale |
|---|---|---|---|
| **Executive** | Teal | **Electric Blue** `214 95% 62%` | Analitik kelas eksekutif, matching Dashbrd X reference. **Sudah live.** |
| **Management** | Teal | **Deep Indigo** `236 72% 58%` *(proposed)* | Kontrol & governance — indigo = authority, trust |
| **Outlet** | Teal | **Warm Amber** `38 92% 55%` *(proposed)* | Operasional frontline, warm & inviting |
| **Cashier** | Teal | **Mint/Emerald** `158 72% 48%` *(proposed)* | Fast POS — hijau = success, money flow |
| **Kitchen** | Teal | **Coral/Orange** `16 90% 58%` *(proposed)* | Urgency, heat, dapur |
| **Warehouse** | Teal | **Steel Blue** `210 50% 55%` *(proposed)* | Logistik, struktur, kalem |

> **Penting:** Primary **tetap teal** di semua portal untuk global branding. Portal accent hanya dipakai di: chart strokes, active states, focus rings, decorative highlights. **Proporsi accent ≤ 15% area viewport** (aturan design guidelines).

#### Token Naming Convention

```
--{portal}-accent           # base HSL
--{portal}-accent-soft      # alpha 0.18
--{portal}-accent-glow      # alpha 0.35 (shadow/glow)
--{portal}-ring             # focus-visible ring
--{portal}-grid             # chart grid lines
--{portal}-positive         # semantic green (per-portal tweak)
--{portal}-negative         # semantic red
--{portal}-warning          # semantic amber
```

Implementasi: di `index.css` pada `:root/.dark` dan `.light`, scope via wrapper class (`exec-portal-scope`, `mgmt-portal-scope`, dst) jika perlu override.

### B.2 Typography Scale

| Level | Class | Usage |
|---|---|---|
| Page title | `text-2xl sm:text-3xl font-semibold tracking-tight` (Space Grotesk) | Judul halaman |
| Hero metric | `text-4xl sm:text-5xl font-semibold tabular-nums` (Space Grotesk) | KPI detail sheet metric hero |
| KPI value | `text-[28px] sm:text-[30px] font-semibold tabular-nums` (Space Grotesk) | Interactive KPI card value |
| KPI label | `text-[10px] sm:text-[11px] uppercase tracking-[0.18em]` | Label mikro di atas angka |
| Body | `text-sm` (Manrope/Inter) | Teks umum |
| Micro | `text-[11px] text-muted-foreground` | Timestamp, caption, meta |
| Badge | `text-[11px]` | Shadcn Badge |

**Fonts terdaftar:** Manrope (body), Space Grotesk (headings/metrics), IBM Plex Mono (numeric). Sudah loaded di `index.css`.

### B.3 Spacing / Radius / Elevation

| Token | Value | Usage |
|---|---|---|
| `--exec-card-radius` | `1.05rem` | Card utama dashboard |
| `--radius` | `0.9rem` | Card standar (existing) |
| Card padding | `p-4` (16px) / `p-5` (20px) | Default / spacious |
| Card gap | `gap-3` (12px) / `gap-4` (16px) | KPI grid / chart grid |
| Hairline border | `border-[var(--glass-border)]` | 1px glass |
| Soft shadow | `shadow-[var(--glass-shadow-soft)]` | Resting |
| Glow shadow | `shadow-[var(--exec-glow-shadow)]` | Hover elevated |

### B.4 Motion Guidelines

| Interaksi | Duration | Easing | Notes |
|---|---|---|---|
| Card hover | 150-200ms | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Jangan `transition-all` — property spesifik (background, border, box-shadow) |
| Page enter stagger | 40ms delay per card | same | Framer Motion `initial={{opacity:0,y:10}}` |
| Count-up number | 650-700ms | easeOutCubic | Respect `prefers-reduced-motion` |
| WS update pulse | 900ms | same | `.exec-kpi-pulse` animation |
| Sheet enter | 240ms | same | Shadcn default |
| Dialog enter | 220ms | same | Shadcn default |
| Chart active dot | 120ms scale + tooltip fade | same | Recharts built-in + custom tooltip |

### B.5 Interactive Pattern Library

Setiap pattern harus ada minimal **1 interaksi bermakna**:

| Pattern | Interaksi Wajib |
|---|---|
| **KPI Card** | hover glow → click opens Detail Sheet |
| **Chart (trend)** | hover glass tooltip → click datapoint opens Drilldown Dialog |
| **Chart (donut/pie)** | hover segment highlight → click legend/segment filters view |
| **List row** | hover bg highlight → click opens profile dialog or navigate |
| **Leaderboard item** | rank badge + mini-bar + click opens drill |
| **Alert feed item** | click to view; quick-resolve button |
| **Badge/Chip** | optional click filters parent view |
| **Period selector** | preset pills + custom range + compare toggle |

---

## C. Component Library — "Premium Interactive"

### C.1 Current State (Phase EXEC-1 Delivered)

Lokasi: `/app/frontend/src/components/executive/`

| Component | Purpose | Status | Reusability |
|---|---|---|---|
| `formatters.js` | `formatCurrency`, `formatPercent`, `formatNumber`, `formatDate` | ✅ Live | Global |
| `CountUpNumber.js` | Smooth animated numeric counter | ✅ Live | Global |
| `ChartTooltip.js` | Glass floating tooltip for Recharts | ✅ Live | Global |
| `PremiumPeriodPicker.js` | Preset pills + custom range + compare toggle | ✅ Live | Global |
| `InteractiveKpiCard.js` | Value + trend + sparkline + click handler | ✅ Live | Global |
| `KpiDetailSheet.js` | Slide-over metric detail + breakdown + CTA | ✅ Live | Global |
| `DatapointDrilldownDialog.js` | Modal breakdown for chart datapoint click | ✅ Live | Global |
| `OutletLeaderboardCard.js` | Ranked list with mini-bar + trend | ✅ Live | Exec-specific (generalizable) |
| `OutletDrilldownDialog.js` | Outlet profile modal | ✅ Live | Exec-specific |

### C.2 Promotion Strategy — dari `executive/` ke `premium/`

Pada **Phase B (UI Rollout Foundation)**, kita akan **memindahkan** komponen yang bersifat generik ke lokasi netral:

```
/app/frontend/src/components/
├── premium/                           ← NEW shared library
│   ├── PremiumPeriodPicker.js         (moved from executive/)
│   ├── InteractiveKpiCard.js          (accent prop, not hardcoded blue)
│   ├── KpiDetailSheet.js
│   ├── DatapointDrilldownDialog.js
│   ├── ChartTooltip.js
│   ├── CountUpNumber.js
│   ├── LeaderboardCard.js             (generalized from OutletLeaderboardCard)
│   ├── ProfileDrilldownDialog.js      (generalized from OutletDrilldownDialog)
│   ├── SectionCard.js                 (NEW — standard section wrapper)
│   ├── StatusBadge.js                 (NEW — priority/status chip)
│   └── formatters.js
├── executive/                         ← keep exec-only glue
└── common/                            ← existing (DataTable, CommandPalette, NotificationBell, etc.)
```

**Migration rules:**
- Komponen di `premium/` **harus menerima `accent` prop** (default `'blue'`) dan **TIDAK hardcode** CSS var tertentu.
- Komponen di `premium/` **harus tidak bergantung** pada context/API khusus Exec — kalau perlu data fetching, lakukan di caller (pages).
- Wrapper portal-specific tetap di folder masing-masing (misal `components/outlet/OutletTaskHome.js` bisa consume `premium/`).

### C.3 New Components (to be built during rollout)

| Component | Phase | Purpose |
|---|---|---|
| `SectionCard.js` | B | Wrapper section standar (header + action + body) — menggantikan pattern `<Card><CardHeader>...</CardHeader></Card>` |
| `StatusBadge.js` | B | Unified status/priority chip dengan semantic color |
| `FilterChipRow.js` | B | Row of toggleable filter chips |
| `InlineTrendChip.js` | B | Inline trend % chip dengan arrow (reused dari InteractiveKpiCard) |
| `MiniHeatmap.js` | C (Revenue) | Hourly × day-of-week heatmap |
| `ComparisonBar.js` | C | Side-by-side current vs previous bar pairs |
| `QuickAction.js` | D (Outlet/Cashier) | Large tappable action tile untuk mobile-first |

---

## D. Phased Rollout Plan

### Overview

```
[DONE]  Phase EXEC-1  — Executive Overview flagship (1 page)
[NEXT]  Phase EXEC-2  — Executive Revenue/Expenses/Outlets (3 pages)
        Phase EXEC-3  — Executive Control Tower + realtime polish
        Phase B       — Promote components to /premium/ + generalize
        Phase M       — Management Portal adoption (6 high-traffic pages)
        Phase O       — Outlet Portal adoption (6 pages, mobile-aware)
        Phase C       — Cashier Portal polish (POS remains specialized)
        Phase K       — Kitchen Portal polish (KDS remains specialized)
        Phase W       — Warehouse Portal adoption
        Phase X       — AI & Inventory Health revamp
```

### Phase EXEC-1 — Executive Overview Flagship ✅ **COMPLETED**

Delivered:
- Design tokens (`--exec-accent-blue`, `--exec-ring`, `--exec-grid`, exec-positive/negative/warning)
- 8 reusable components (di `/components/executive/`)
- 3 backend endpoints (`kpi-detail`, `datapoint-breakdown`, `outlet-profile`)
- ExecOverview.js full refactor dengan 8 KPI cards, trend chart dengan drilldown, donut dengan clickable legend, outlet leaderboard, alert summary, inventory health
- Verified: 26/26 backend tests pass, manual UI verification OK (dark + light)

### Phase EXEC-2 — Executive Revenue / Expenses / Outlets (NEXT)

**Target:** 3 halaman analytics dengan kualitas dan interaktivitas setara Overview.

| Halaman | Widget Baru | Interaksi | Endpoint Baru |
|---|---|---|---|
| **Revenue** | Trend (day/week/month toggle), Channel donut, Hourly heatmap, Day-of-week breakdown, Top Items list, Outlet ranking | Semua clickable → drilldown | `GET /api/executive/revenue-detail` |
| **Expenses** | Category donut + center metric, Expense trend vs budget overlay, Top expense outlets, Category drilldown | Category click → expense list modal | `GET /api/executive/expense-vs-budget` |
| **Outlets** | Multi-metric tab leaderboard (Revenue/Margin/Closing/Waste), Outlet comparison matrix | Row click → outlet profile dialog | `GET /api/executive/outlet-matrix` |

Scope:
- Reuse `PremiumPeriodPicker`, `InteractiveKpiCard`, `KpiDetailSheet`, `DatapointDrilldownDialog`, `ChartTooltip`, `OutletLeaderboardCard`, `OutletDrilldownDialog`
- Tambah `MiniHeatmap`, `ComparisonBar`, `FilterChipRow`
- Backend testing agent setelah endpoints siap

### Phase EXEC-3 — Control Tower + Realtime Polish

**Target:** Control Tower sebagai command center realtime. Polish end-to-end (a11y, perf, reduced-motion).

Scope:
- Rebuild `ControlTower.js`: live alerts stream, approvals pending inline, system health, critical KPI row di atas
- WebSocket wiring penuh: event `exec.kpi.refresh` dari posting/approval/closing/alerts → frontend debounced refetch + pulse animation
- Polish: keyboard nav audit, focus-visible audit, prefers-reduced-motion
- Testing agent comprehensive

### Phase B — Promote Components to `/premium/` (Foundation untuk rollout lain)

**Target:** Generalisasi komponen agar siap dipakai portal lain tanpa bergantung CSS var exec.

Kerja:
1. Buat folder `/app/frontend/src/components/premium/`
2. Pindahkan komponen generik dari `/executive/` ke `/premium/`, refactor:
   - Tambah prop `accent?: 'blue'|'indigo'|'amber'|'emerald'|'coral'|'steel'`
   - Tambah prop `scopeClass?` (default `''`) untuk portal scoping
   - Ganti hardcoded `hsl(var(--exec-accent-blue))` → `hsl(var(--${accent}-accent))` atau mapping
3. Update imports di executive pages (aliases untuk backward compat)
4. Tambah CSS vars untuk portal accent lain (indigo, amber, emerald, coral, steel) di `index.css`
5. Dokumentasi komponen (storybook-lite di `/docs/05-component-library.md` — opsional)
6. Sanity test: executive portal tetap jalan normal

### Phase M — Management Portal Adoption

**Target pages (prioritas by traffic + impact):**

| Halaman | Widget yang di-upgrade | Catatan |
|---|---|---|
| `/management/dashboard` | KPI row → `InteractiveKpiCard` (accent: indigo), trend section → drilldown | High impact, jadi showcase pertama |
| `/management/finance` | Cash & Bank section → `SectionCard` + sparklines | Konsumsi endpoint existing |
| `/management/reports` (P&L, BS, CF) | Period picker → `PremiumPeriodPicker`, drilldown modal sudah ada — harmonize style | Sudah semi-modern, sinkronkan |
| `/management/alerts` | List → card-based premium feed seperti Control Tower | Konsisten dengan exec |
| `/management/journals` | Keep DataTable; tambah top strip KPI cards (total debit/credit, posted count, unbalanced) | Tetap tabel-heavy |
| `/management/approvals` | Keep DataTable; tambah KPI row + `StatusBadge` standar | Tetap tabel-heavy |

**Non-goals:**
- Tidak mengubah admin CRUD forms (biarkan cepat & fungsional)
- Tidak mengubah COA Tree (sudah special-purpose)

### Phase O — Outlet Portal Adoption

**Target pages:**

| Halaman | Widget yang di-upgrade | Catatan |
|---|---|---|
| `/outlet/dashboard` | Task home cards → `InteractiveKpiCard` (accent: amber) + quick actions | Mobile-aware (touch targets 44px) |
| `/outlet/sales-summary` | Top KPI row, existing table tetap | - |
| `/outlet/petty-cash` | Top KPI (today/MTD), table tetap | - |
| `/outlet/inventory` | Ganti stat tiles pakai `InteractiveKpiCard` | - |
| `/outlet/daily-closing` | Stepper tetap; tambah `PremiumPeriodPicker` di monitor view | Stepper adalah UX kritis, jangan diubah |
| `/outlet/cash` | Top KPI + `DatapointDrilldownDialog` untuk hari ini | - |

**Mobile-first rules:**
- Min touch target 44×44px
- Period picker collapse menjadi bottom sheet di mobile
- KPI card grid: 1 col di mobile, 2 di tablet, 4 di desktop

### Phase C — Cashier Portal Polish

**Pendekatan berbeda:** Cashier Portal adalah **functional-first POS**, UX kecepatan jauh lebih penting daripada visual glossy. Fokus:

- **Keep:** POS grid, payment flow, shift modal (jangan diubah — kritis bagi operasional)
- **Polish:**
  - Dashboard tab → `InteractiveKpiCard` (accent: emerald) untuk KPI shift saat ini
  - Orders list → `StatusBadge` unified
  - Shift history → `PremiumPeriodPicker`

### Phase K — Kitchen Portal Polish

**Pendekatan:** KDS = **real-time kanban**, prioritas latency & legibility.

- **Keep:** Kanban columns, realtime WS, waste logging form
- **Polish:**
  - Dashboard KPI cards → `InteractiveKpiCard` (accent: coral)
  - Waste history → `PremiumPeriodPicker` + `DatapointDrilldownDialog`
  - Urgency timer animation tetap (sudah spesifik KDS)

### Phase W — Warehouse Portal Adoption

| Halaman | Widget | Accent |
|---|---|---|
| Dashboard | KPI row (PO aktif, pending receiving, stock value) | steel blue |
| Receiving / Transfer / Adjustment | Keep workflows, tambah top KPI + period picker untuk history | steel blue |
| Purchase Orders | DataTable existing + top KPI row | steel blue |
| Settings | Form tetap | - |

### Phase X — AI & Inventory Health Revamp (Deferred)

- AI Insights / Chat / Forecast / Anomalies → layout premium, tetapi konten AI-specific
- Executive Inventory Health full page revamp (sekarang sudah ada di Overview dalam bentuk ringkas)

---

## E. Portal Adoption Matrix (At a Glance)

| Component | Exec | Mgmt | Outlet | Cashier | Kitchen | Warehouse |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `PremiumPeriodPicker` | ✅ | ✅ | ✅ | ✅ (shift history) | ✅ (waste history) | ✅ |
| `InteractiveKpiCard` | ✅ | ✅ | ✅ | ✅ (shift KPIs) | ✅ (kitchen KPIs) | ✅ |
| `KpiDetailSheet` | ✅ | ✅ | ⚠️ optional | ❌ | ❌ | ⚠️ optional |
| `DatapointDrilldownDialog` | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ |
| `ChartTooltip` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `LeaderboardCard` | ✅ | ⚠️ (outlets) | ❌ | ❌ | ❌ | ❌ |
| `DataTable` (common) | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| `CommandPalette` (common) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `NotificationBell` (common) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Legend: ✅ applicable — ⚠️ conditional — ❌ not applicable by nature

---

## F. Technical Guidelines for Migration

### F.1 Migration Pattern (per halaman)

Untuk setiap halaman yang di-migrate:

1. **Baseline snapshot** — screenshot dark + light sebelum perubahan
2. **Identifikasi widget** — KPI, chart, list, form
3. **Map ke premium components** — tabel di atas
4. **Refactor bertahap** (jangan bulk-rewrite 1 file lebih dari 50% per commit):
   - Step 1: Ganti header + period picker
   - Step 2: Ganti KPI cards
   - Step 3: Upgrade charts (tambah ChartTooltip + click handler)
   - Step 4: Upgrade lists (drilldown)
5. **Smoke test** — buka halaman, cek click flow
6. **Visual regression** — compare snapshot
7. **A11y check** — Tab navigation, focus-visible
8. **Commit**

### F.2 Non-Negotiable Rules

❌ **Jangan:**
- Mengubah backend API response shape tanpa versioning
- Menghapus `data-testid` existing (hanya tambah / rename dengan care)
- Hardcode hex color di komponen premium
- Pakai `transition-all`
- Pakai AI/emoji icons
- Menonaktifkan role/permission check di route guards
- Ubah global tokens (`--primary`) — tambah portal-specific saja

✅ **Harus:**
- Test di dark mode DAN light mode
- Test keyboard navigation (Tab, Enter, Escape)
- Respect `prefers-reduced-motion`
- Tambah `data-testid` kebab-case role-based di semua elemen interaktif
- Backward compat: rute lama tidak rusak

### F.3 Testing Strategy

| Type | Tool | When |
|---|---|---|
| Unit (komponen kecil) | (N/A — skip untuk speed) | - |
| Backend regression | Testing agent | Setelah setiap phase dengan endpoint baru |
| Visual & interactive | Manual screenshot + click-flow | Setiap halaman |
| Comprehensive E2E | Testing agent (browser automation) | Akhir tiap Phase M/O/C/K/W |
| A11y sanity | Manual (keyboard-only pass) | Setiap page migrate |
| Perf | DevTools Performance panel spot-check | Jika terasa lag |

---

## G. Risk & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Regresi operasional (Cashier POS, Kitchen KDS) | Outlet tidak bisa jualan | **Jangan ubah core flow.** Hanya polish periphery. Keep backend contract. |
| Over-design di halaman simple | Dev time membengkak, UX jadi berat | Gunakan Portal Adoption Matrix — jangan semua widget di-upgrade |
| Accent color clash dengan brand | Visual fragmentation | Audit accent proportion tiap rollout (≤ 15% viewport) |
| Performance drop (animasi + chart) | Lag di low-end device | Respect `prefers-reduced-motion`, memoize, debounce WS |
| Scope creep "sekalian rombak semua" | Project terlambat | Phase-gated. Tiap Phase punya exit criteria |
| Breaking existing tests | CI red | Tambah-only `data-testid`, pertahankan selector lama |

---

## H. Success Metrics

### Per-Phase Exit Criteria

| Phase | Criteria |
|---|---|
| EXEC-2 | 3 halaman analytic dengan drilldown penuh, period picker konsisten, backend test 100% |
| EXEC-3 | Realtime pulse bekerja, a11y audit OK, comprehensive testing pass |
| B | Semua komponen pindah ke `/premium/`, accent prop bekerja, exec portal tetap normal |
| M/O/W | Target pages selesai migrate, smoke test OK, testing agent pass |
| C/K | Polish tanpa regresi operasional (bukti: POS dan KDS E2E jalan normal) |

### Product-level KPIs (qualitative awal, kuantitatif setelah launch)

- **Time-to-insight** (manager klik dari login → lihat revenue drilldown): target < 10 detik
- **Session depth** (jumlah drilldown per sesi exec): target ≥ 3
- **NPS/feedback** dari user internal: target ≥ 8/10
- **Bug report rate** setelah rollout: target < 2 per phase

---

## I. Timeline (Indicative)

> Waktu estimasi berdasarkan pengalaman EXEC-1 (1 hari kerja produktif agent). Estimasi ini **asumsi no blocker**.

| Phase | Estimated Effort | Dependency |
|---|---|---|
| EXEC-2 | 1.5-2 sesi | EXEC-1 done ✅ |
| EXEC-3 | 1 sesi | EXEC-2 |
| B (promote) | 0.5-1 sesi | EXEC-2 |
| M | 1-1.5 sesi | B |
| O | 1 sesi | B |
| W | 0.5-1 sesi | B |
| C polish | 0.5 sesi | B |
| K polish | 0.5 sesi | B |
| X (AI + Inventory) | 1 sesi | M, O |

**Total: ~8 sesi kerja** (tergantung scope change & feedback cycle).

---

## J. Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-04-19 | Hybrid accent: teal primary tetap global, blue khusus Executive | User explicit choice (option C) |
| 2026-04-19 | Scope EXEC prioritas = Overview, Revenue, Expenses, Outlets, Control Tower | User explicit choice (option B) |
| 2026-04-19 | Real DB data, no extra mocking | User explicit choice (option A) |
| 2026-04-19 | Semua interactive features ON (period, drill, pulse) | User explicit choice |
| 2026-04-19 | Rollout ke portal lain diadopsi setelah EXEC stabil | Menghindari multi-front migration risk |
| 2026-04-19 | Komponen akan di-promote ke `/premium/` dengan accent prop | Reusability lintas portal tanpa fragmentasi |

---

## K. Open Questions (untuk didiskusikan saat fase rollout tiba)

1. **Apakah portal accent (indigo/amber/emerald/coral/steel) final?** — bisa di-tune saat adopsi per portal.
2. **Apakah semua halaman Management perlu period picker?** — atau cukup dashboard + reports?
3. **Bagaimana posisi DataTable vs premium card-list?** — DataTable tetap untuk dataset besar; premium list untuk top-N / leaderboard.
4. **Apakah Kitchen KDS perlu accent override saat "urgent"?** — mungkin coral → red saat timer > threshold.
5. **Apakah ada kebutuhan "custom dashboard" user-configurable?** — parkir untuk Phase X+ (Enhancement Backlog).

---

## L. References

- Desain referensi: **Dashbrd X by BRIX Templates** (uploaded by user, 2026-04-19)
- File design spec: `/app/design_guidelines.md` (section "Executive Dashboard — Premium Interactive Guidelines")
- Current components live: `/app/frontend/src/components/executive/`
- Planned components library: `/app/frontend/src/components/premium/` (to be created Phase B)
- Test credentials: `/app/memory/test_credentials.md`
- Backend test report: `/app/test_reports/iteration_8.json` (EXEC-1 backend: 26/26 pass)

---

**End of UI Modernization Plan v1.0**

*Dokumen ini akan di-update setiap akhir phase dengan status aktual, issue yang ditemui, dan decision baru.*
