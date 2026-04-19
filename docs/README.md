# F&B ERP — Dokumentasi Resmi

Client: **Lusi & Pakan** (Fusion Local Bali F&B)
Last updated: **2026-04-19**

## Daftar Dokumen

| # | Dokumen | Tujuan | File |
|---|---|---|---|
| 1 | **Technical Design Document (TDD)** | Blueprint teknis lengkap arsitektur, modul, API, data, security | [`01-technical-design-document.md`](./01-technical-design-document.md) |
| 2 | **Development Tracker** | Status pengerjaan nyata per modul/fitur, blocker, decision log | [`02-development-tracker.md`](./02-development-tracker.md) |
| 3 | **Enhancement Backlog** | Ide pengembangan lanjutan, prioritisasi, future roadmap | [`03-enhancement-backlog.md`](./03-enhancement-backlog.md) |

## Audience

| Peran | Dokumen yang paling relevan |
|---|---|
| CTO / Tech Lead | TDD (lengkap) + Enhancement Backlog |
| Engineer baru | TDD section A-F (Overview → Architecture), Development Tracker |
| Product Owner / Business | TDD section B-C, Development Tracker, Enhancement Backlog |
| Auditor / Compliance | TDD section N-O (Security + Audit Trail) |
| DevOps | TDD section F, Q, S (Architecture, Performance, Deployment) |

## Update Cadence

- **TDD**: di-update setiap ada perubahan arsitektur/modul major (tiap sprint besar)
- **Tracker**: di-update mingguan setelah retro sprint
- **Backlog**: di-update kapan saja saat ide baru masuk

## Catatan

- Bahasa utama dokumen: **Bahasa Indonesia** (dengan istilah teknis bahasa Inggris sesuai konvensi industri).
- Sumber kebenaran kode: repository `/app/`
- Sumber kebenaran data test: `/app/memory/test_credentials.md`
