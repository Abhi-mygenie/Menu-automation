# MyGenie POS — Production-Grade AI Menu Import System — Handoff Index

**Document version:** 2.0 (production-grade revision)
**Status:** Final (planning pass 2) — pending Approval Gates 1–7 + Phase 0 decisions.
**Module:** `menu-import`
**Plug-in target:** MyGenie POS (Node.js + PostgreSQL)
**Owner:** Architecture / Product

> This is the entry-point doc for any agent or engineer picking up this module. Read this first; then jump to the linked spec for depth.

---

## 0. Positioning — Read First

- This is **not** an MVP / demo / prototype. It is a **production-grade, plug-in module of MyGenie POS**.
- Phase 1 of the Release Train is a **live production release** to pilot restaurants, not a sandbox.
- Releases are phased (Phase 1 Basic → Phase 2 Expansion → Phase 3 Intelligence), but every phase ships to real users.
- The safety invariant is absolute: **AI never directly mutates the live POS menu**. All mutations go via the POS Menu API only after human approval.

---

## 1. What this Module Does

Lets a restaurant operator upload a **menu image / PDF**, runs it through **Gemini 3** for structured extraction (items, variants, add-ons, menu notes), presents the result in a **review-first editable UI** with **source provenance**, **learns from corrections**, and only after **explicit approval** syncs the data to the live POS Menu Master via the existing POS Menu API — with full **audit log** and **rollback reference**.

---

## 2. Module Boundaries

- **Owns:** upload handling, file storage adapter, preprocessing, AI extraction, normalization, staging tables, review UI, correction learning, draft snapshots, admin actions, dedup preview, sync orchestration, audit + rollback metadata, monitoring.
- **Does NOT own:** the POS Menu Master tables, tax engine, KOT/order flow, inventory/recipe BOM. These remain in the POS proper.
- **Integration with POS:** consumes the POS Menu API for sync + dedup queries; consumes POS JWT for auth.

---

## 3. Release Train

| Release | What ships live |
|---|---|
| **Phase 1 Production Release** | Upload, extract, review w/ source provenance, draft save, restaurant learning (apply + capture), approval gate, idempotent sync, audit, rollback (in supported modes), cost caps, tenant isolation, production smoke tests. |
| **Phase 2 Capability Expansion** | Variants + add-ons + duplicates + cuisine/global learning with admin approval queue. |
| **Phase 3 Menu Intelligence** | Inventory, combos, tax automation, opt-in unattended sync, multilingual, mobile. |

---

## 4. Architecture Overview

- **Service:** `menu-import-service` (Node.js 20 + TypeScript, NestJS recommended).
- **Logical services** inside one deployable: Upload, Preprocessing, AI Extraction, Parser/Normalizer, Review/Draft, Learning Memory, Duplicate Prevention, Sync, Audit, Admin Approval, Storage, Monitoring, Rollback.
- **DB:** PostgreSQL 14+, schema namespace `menu_import.*` (14 tables).
- **Queue:** BullMQ + Redis 7.
- **AI:** Gemini 3 Pro (primary) + Flash (fast lane / fallback).
- **Storage:** `StorageAdapter` — local (pre-prod) / S3 (prod).
- **Auth:** POS JWT, `restaurant_id` claim, optional RLS in prod.
- **Sync:** REST calls to POS Menu API; idempotency keys; per-row audit log; 3-mode rollback.
- **Observability:** pino + prom-client + OpenTelemetry + Grafana dashboards.

(See `MENU_IMPORT_MVP_ARCHITECTURE.md`.)

---

## 5. Key DB Tables (14)

1. `menu_imports`
2. `menu_import_pages`
3. `menu_import_rows` — now with `source_bbox`, `source`, `dedup_resolution`, `reviewed`
4. `menu_import_row_variants`
5. `menu_import_row_addons`
6. `menu_import_modifier_groups` + `_options`
7. `menu_import_menu_notes`
8. `menu_import_corrections` (append-only)
9. `menu_learning_memory`
10. `menu_import_audit_log` (append-only)
11. `menu_import_idempotency_keys` (new, Phase 1)
12. `menu_import_admin_actions` (new, Phase 2)
13. `menu_import_draft_snapshots` (new, Phase 1)
14. `menu_import_dataset_manifest` (test/eval, internal)

(See `MENU_IMPORT_MVP_DB_SCHEMA.md`.)

---

## 6. Key APIs

Base path: `/api/menu-imports` — all endpoints JWT-auth + tenant-scoped.

Phase 1 critical:
- `POST /upload`, `POST /{id}/process`, `GET /{id}/status`.
- `GET /{id}/rows`, `PATCH /rows/{id}`, `POST /rows/{id}/approve`, `POST /rows/{id}/mark-reviewed`.
- `GET /rows/{id}/source-crop` (provenance).
- `POST /{id}/save-draft`, `GET /{id}/cost`.
- `POST /{id}/sync`, `POST /{id}/sync/retry`, `GET /{id}/audit-log`.
- `POST /{id}/rollback` (mode-dependent).

Phase 2 additions:
- `POST /{id}/dedup-preview`, variant / addon / note PATCHes, merge / convert / split actions.

Only `POST /{id}/sync` (and `/rollback`) mutate live POS. All other endpoints are staging-only.

(See `MENU_IMPORT_MVP_API_CONTRACT.md`.)

---

## 7. Review UI (production-grade safety control)

- Review table with sticky columns, filters, search, virtualization.
- **Source provenance pane** (Phase 1) — page crop per row.
- **Reviewed flag + filter** (Phase 1).
- **Learned vs Suggested** badge language (Phase 1).
- **Duplicate Preview modal** (Phase 2).
- Inline edit with optimistic concurrency.
- Bulk approve / reject / export.
- Full WCAG 2.1 AA; no dark-on-dark; color-plus-icon-plus-label.
- `data-testid` on every interactive element.

(See `MENU_IMPORT_MVP_REVIEW_UI_SPEC.md`.)

---

## 8. Learning Memory

- **3 scopes**: restaurant (Phase 1 active) → cuisine (Phase 2 with promotion) → global (Phase 2 with admin approval, DB-enforced).
- Apply order restaurant > cuisine > global; current-session user edits always win.
- **Anti-overfitting cap**: 40% single-restaurant evidence share for cuisine promotion.
- **Per-restaurant opt-out** flag from Phase 1.
- Price corrections: learn only structural patterns, never bare numerics.
- Reversal-budget auto-deactivation.
- Admin approval queue in Phase 2 (table `menu_import_admin_actions`).

(See `MENU_IMPORT_MVP_LEARNING_MEMORY_SPEC.md`.)

---

## 9. Testing

- Pyramid: unit / integration / regression / hold-out / pilot / smoke.
- Dataset: 70 calibration / 20 test / 10 hold-out.
- Required gates: tenant isolation, file security, rollback, correction-reuse, production smoke.
- Sev-1 gates block any release.

(See `MENU_IMPORT_MVP_TEST_STRATEGY.md`.)

---

## 10. Production Safety Rules (non-negotiable)

1. AI never directly modifies live menu.
2. AI output flows to staging tables.
3. User approval is mandatory.
4. Global learning requires multi-restaurant + admin approval.
5. Categories are not auto-created without approval (visible in sync preview).
6. Variants/add-ons are not auto-converted.
7. Similar items not auto-merged.
8. Low-confidence rows remain visible.
9. Tax notes are detected, never auto-applied.
10. Every sync produces audit log + rollback ref.
11. Versions (model, prompt, preprocessing, normalizer) stored on every import.
12. Failed pages are visible to users / admins.
13. Manual correction always works even if AI fails entirely.
14. Every extracted row has `raw_text` + `source_bbox` provenance (Phase 1).
15. Dedup-preview blocks sync for Phase 2+ imports.
16. Tenant isolation is a Sev-1 gate.

---

## 11. Approval Gates

- Gate 1 — Requirements approved? → `MENU_IMPORT_MVP_REQUIREMENTS.md`
- Gate 2 — Architecture + Workflow approved? → `_ARCHITECTURE.md` + `_WORKFLOW.md`
- Gate 3 — DB schema approved? → `_DB_SCHEMA.md`
- Gate 4 — API contract approved? → `_API_CONTRACT.md`
- Gate 5 — Review UI approved? → `_REVIEW_UI_SPEC.md`
- Gate 6 — Learning memory approved? → `_LEARNING_MEMORY_SPEC.md`
- Gate 7 — Implementation plan approved? → `_IMPLEMENTATION_PHASES.md`

**Plus Phase 0 (decisions + POS contract + Gemini playbook) must complete.**

> Implementation begins **only** after gates close AND Phase 0 is done.

---

## 12. What's Approved vs Pending

| Item | Status |
|---|---|
| Production-grade positioning | ✅ drafted in this pack |
| Requirements (v2.0) | ⏳ pending Gate 1 |
| Architecture + Workflow (v2.0) | ⏳ pending Gate 2 |
| DB schema (v2.0) | ⏳ pending Gate 3 |
| API contract (v2.0) | ⏳ pending Gate 4 |
| Review UI (v2.0) | ⏳ pending Gate 5 |
| Learning memory (v2.0) | ⏳ pending Gate 6 |
| Implementation phases (v2.0) | ⏳ pending Gate 7 |
| P0 decisions | ⏳ pending — see `PRODUCTION_GRADE_OWNER_DECISION_SHEET.md` |
| POS Menu API contract | ⏳ pending Phase 0 discovery |
| Gemini 3 SDK pin | ⏳ pending Phase 0 playbook |

---

## 13. What NOT to Implement Yet

- Do not start backend code.
- Do not write any React component.
- Do not call Gemini.
- Do not assume POS Menu API contract details.
- Do not create migrations.
- Do not begin any tests.

Everything waits for Gate approvals + Phase 0 closures.

---

## 14. Recommended Next Agent

Pick **one or both** based on owner direction:

1. **POS Menu API Contract Discovery Agent** — closes P0-1, P0-2, P0-3, P0-7. Deliverable: OpenAPI 3.1 spec for the POS Menu API + rollback capability declaration.
2. **`integration_playbook_expert_v2`** with:
   - `INTEGRATION: Gemini 3 Pro + Gemini 3 Flash (Node.js, vision, structured JSON output)`
   - Deliverable: verified SDK, env keys, JSON-mode params, safety config → `/docs/integrations/gemini3.md`.

Only after both are complete (Phase 0 done) and all 7 gates close, invoke:

3. **Backend Foundation Implementation Agent** — Build Phase 1 (schema + storage + auth + upload + import batch).

In parallel after Build Phase 2 unblocks `/rows`:

4. **Frontend Review UI Implementation Agent** — Build Phase 3.

---

## 15. Document Index

| Document | Purpose |
|---|---|
| `MENU_IMPORT_MVP_REQUIREMENTS.md` | Goals, scope, personas, FRs/NFRs (incl. hallucination control, dedup, cost caps, draft save, manual override), success metrics, acceptance criteria |
| `MENU_IMPORT_MVP_ARCHITECTURE.md` | Logical services, deployment, security, 3-mode rollback, monitoring, future live-import path |
| `MENU_IMPORT_MVP_WORKFLOW.md` | End-to-end flow, state machines (incl. correction memory), failure recovery matrix, manual override |
| `MENU_IMPORT_MVP_DB_SCHEMA.md` | 14 tables, ENUMs, indexes, triggers, RLS, idempotency/admin-action/draft tables |
| `MENU_IMPORT_MVP_API_CONTRACT.md` | 30 endpoints, error catalog (incl. `COST_CAP_EXCEEDED`, `DEDUP_PREVIEW_REQUIRED`, etc.), role matrix |
| `MENU_IMPORT_MVP_REVIEW_UI_SPEC.md` | Routes, source provenance pane, reviewed flag, learned-vs-suggested, dedup modal, safety guardrails |
| `MENU_IMPORT_MVP_LEARNING_MEMORY_SPEC.md` | 3-scope model, anti-overfitting cap, opt-out, fuzzy-match policy, price-learning policy, admin approval queue |
| `MENU_IMPORT_MVP_TEST_STRATEGY.md` | Tenant isolation, file security, rollback, correction-reuse, production smoke tests |
| `MENU_IMPORT_MVP_RISK_REGISTER.md` | 25 risks (incl. R-21 hallucination, R-22 rubber-stamp, R-23 duplicates) |
| `MENU_IMPORT_MVP_IMPLEMENTATION_PHASES.md` | Release Train + Build Phases 0–8 with DoD and gates |
| `MENU_IMPORT_MVP_OPEN_QUESTIONS.md` | P0 / P1 / P2 classification |
| `PRODUCTION_GRADE_PLANNING_REVIEW_REPORT.md` | Review of original pack + gaps + recommendations |
| `PRODUCTION_GRADE_OWNER_DECISION_SHEET.md` | Decisions owner must sign off before build |
| `PRODUCTION_GRADE_APPROVAL_SUMMARY.md` | What changed, what's approved, what's pending |
| `MENU_IMPORT_MVP_HANDOFF_INDEX.md` | This file |

---

## 16. Final Note

This pack is production-ready planning. The posture is deliberately conservative: review-first, audit-everything, learn-cautiously, sync-via-API. That is the right posture for a production POS system where bad data has financial and reputational consequences.

The next correct action is **Phase 0 + gate approval**, not code.
