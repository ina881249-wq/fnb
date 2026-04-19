# F&B ERP — Dokumentasi Resmi

Client: **Lusi & Pakan** (Fusion Local Bali F&B)
Last updated: **2026-04-19**

## Daftar Dokumen

| # | Dokumen | Tujuan | File |
|---|---|---|---|
| 1 | **Technical Design Document (TDD)** | Blueprint teknis lengkap arsitektur, modul, API, data, security | [`01-technical-design-document.md`](./01-technical-design-document.md) |
| 2 | **Development Tracker** | Status pengerjaan nyata per modul/fitur, blocker, decision log | [`02-development-tracker.md`](./02-development-tracker.md) |
| 3 | **Enhancement Backlog** | Ide pengembangan lanjutan, prioritisasi, future roadmap | [`03-enhancement-backlog.md`](./03-enhancement-backlog.md) |
| 4 | **UI Modernization Plan** | Strategi & rencana bertahap modernisasi UI premium untuk semua portal | [`04-ui-modernization-plan.md`](./04-ui-modernization-plan.md) |

## Audience

| Peran | Dokumen yang paling relevan |
|---|---|
| CTO / Tech Lead | TDD (lengkap) + Enhancement Backlog + UI Modernization Plan |
| Engineer baru | TDD section A-F (Overview → Architecture), Development Tracker, UI Modernization Plan section B-F |
| Frontend Engineer | **UI Modernization Plan (utama)**, TDD section F (Architecture) |
| Product Owner / Business | TDD section B-C, Development Tracker, Enhancement Backlog, UI Modernization Plan section A, D |
| UX / Designer | **UI Modernization Plan (utama)** + `/app/design_guidelines.md` |
| Auditor / Compliance | TDD section N-O (Security + Audit Trail) |
| DevOps | TDD section F, Q, S (Architecture, Performance, Deployment) |

## Update Cadence

- **TDD**: di-update setiap ada perubahan arsitektur/modul major (tiap sprint besar)
- **Tracker**: di-update mingguan setelah retro sprint
- **Backlog**: di-update kapan saja saat ide baru masuk
- **UI Modernization Plan**: di-update setiap akhir phase (EXEC-1/2/3, B, M, O, C, K, W, X) dengan status aktual & decision log baru

## Catatan

- Bahasa utama dokumen: **Bahasa Indonesia** (dengan istilah teknis bahasa Inggris sesuai konvensi industri).
- Sumber kebenaran kode: repository `/app/`
- Sumber kebenaran data test: `/app/memory/test_credentials.md`
