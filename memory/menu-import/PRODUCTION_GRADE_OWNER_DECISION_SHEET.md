# MyGenie POS — Menu Import — Production-Grade Owner Decision Sheet

**Purpose:** All decisions the product owner must sign off before Build Phase 1 begins.
**Scope:** Decisions only. No implementation. Cross-linked to `MENU_IMPORT_MVP_OPEN_QUESTIONS.md`.
**Status:** Draft — awaiting owner decisions.

---

## How to use this sheet

- Each row is one decision.
- **Recommended default** is a safe, production-grade choice you can accept without further research.
- **Impact if not decided** tells you what slips if you don't choose.
- **Blocks build?** — if `YES`, Build Phase 1 cannot start until closed.
- To sign off: write your decision in the `Decision` column and initial with date.

---

## A. Architecture Decisions

| ID | Question | Recommended default | Impact if not decided | Blocks build? | Decision |
|---|---|---|---|---|---|
| A-1 | Node.js framework | **NestJS** (DI, modules, guards, queue integration) | Delays Phase 1 scaffold by 1–2 days | No (safe to close at start of Phase 1) | |
| A-2 | ORM | **Prisma** (migrations + type-safety) | Same as A-1 | No | |
| A-3 | Worker model | Single worker subscribing to all queues | Minor scaling flexibility | No | |
| A-4 | RLS in all environments | **Yes** (pre-prod + prod) | Accept small dev friction; catches tenant bugs early | No | |
| A-5 | Pre-prod storage durability | **PVC** for `/app/storage/menu-imports/` | Lost files on pod restart otherwise | No | |
| A-6 | Observability stack | pino + prom-client + OpenTelemetry + Grafana | Without this, Phase 8 pilot is blind | No (stand up during Phase 7) | |

---

## B. POS Menu API Decisions

| ID | Question | Recommended default | Impact if not decided | Blocks build? | Decision |
|---|---|---|---|---|---|
| B-1 | Exact POS Menu API contract (endpoints, payloads, errors) | Invoke **POS Menu API Contract Discovery Agent** | Blocks Sync (Phase 6), Dedup (Phase 2) | **YES (Phase 0)** | |
| B-2 | POS delete / archive support (drives rollback mode) | Start with **Mode C** (manual cleanup list) until confirmed; promote to A/B on confirmation | Rollback scope ambiguous | **YES (Phase 0)** | |
| B-3 | POS bulk endpoints availability | Assume **per-item with idempotency keys**; bulk is a bonus | Sync throughput design | **YES (Phase 0)** | |
| B-4 | POS category creation permissions | Assume **POS create-category is allowed with JWT that can manage menu** | Sync behavior when category missing | No (in-phase) | |
| B-5 | Where `cuisine_type` lives on restaurant profile | **POS restaurant profile**; if missing, add a one-time onboarding question | Phase 2 cuisine learning blocked | **YES (Phase 0)** | |
| B-6 | POS role / scope required to call Menu API | Same JWT used by this module (needs `menu:write` scope) | Sync returns 401/403 in pilot | No (in-phase) | |

---

## C. Database Decisions

| ID | Question | Recommended default | Impact if not decided | Blocks build? | Decision |
|---|---|---|---|---|---|
| C-1 | Primary key type | **BIGSERIAL** internally; external refs stored as JSONB (POS shape-agnostic) | Migrations friction if POS uses UUIDs | No | |
| C-2 | Audit log partitioning from day one | **Defer**. Partition when > 100M rows | Over-engineering | No | |
| C-3 | Draft snapshot retention | **30 days** default, configurable per plan | User expectations vague | No | |
| C-4 | Audit + corrections retention | **13 months** minimum | Compliance stance | No | |
| C-5 | Soft-delete for `menu_learning_memory` | **Yes**, with `deleted_at` | No loss of history | No | |

---

## D. AI / Gemini Decisions

| ID | Question | Recommended default | Impact if not decided | Blocks build? | Decision |
|---|---|---|---|---|---|
| D-1 | Gemini 3 SDK / JSON mode / safety pin | Invoke **`integration_playbook_expert_v2`** | Extraction cannot be implemented | **YES (Phase 0)** | |
| D-2 | Default model | **gemini-3-pro** primary, **gemini-3-flash** fast lane / fallback | Locks cost/latency profile | No (in-phase) | |
| D-3 | Auto-fallback policy (Pro → Flash on 429) | **Enabled**, configurable per restaurant | Model outage handling | No | |
| D-4 | Token cap per file | **500k tokens**; `force_flash=true` bypass | Cost control | No | |
| D-5 | Prompt version pin at Phase 1 release | `extract-v1` (frozen for pilot) | Accuracy regression hygiene | No | |
| D-6 | Per-restaurant monthly cost cap (default) | **USD X** (set by Finance; recommend USD 25 for pilot restaurants) | No ceiling → risk of runaway cost | **YES (Phase 0)** | ✅ **Closed 2026-01:** "Free — it's our own POS product." No per-restaurant cap surfaced; defensive ceilings retained (see `PHASE_0_DECISION_LOG.md §3`). |

---

## E. Learning Memory Decisions

| ID | Question | Recommended default | Impact if not decided | Blocks build? | Decision |
|---|---|---|---|---|---|
| E-1 | Enable restaurant-scope learning in Phase 1 | **Yes** | Phase 1 value diminishes | No | |
| E-2 | Enable cuisine-scope promotion in Phase 1 | **No** — Phase 2 only | Accidental cross-tenant side effects | No | |
| E-3 | Enable global-scope promotion in Phase 1 | **No** — Phase 2 + admin queue + DB constraint | Highest-risk path; closed by constraint | No | |
| E-4 | Anti-overfitting cap (single restaurant's share of cuisine evidence) | **40%** | Single-restaurant dominance risk | No | |
| E-5 | Per-restaurant opt-out of cuisine/global rules | **DB flag exists from Phase 1**, UI exposure Phase 2 | Safe default | No | |
| E-6 | Price-learning policy | **Only structural patterns (`/-`, `/kg`, etc.)**, never bare numerics | Dangerous if loose | No | |
| E-7 | Fuzzy-match policy | spelling fuzzy (Lev ≥ 0.88); category exact; food_type exact; unit regex | Quality impact | No | |

---

## F. Review UI Decisions

| ID | Question | Recommended default | Impact if not decided | Blocks build? | Decision |
|---|---|---|---|---|---|
| F-1 | Show Source Provenance pane by default | **Yes** | Primary hallucination defense | No | |
| F-2 | "Approve all clean" default threshold | **0.85** + blocking-warning exclusion | Safety vs speed balance | No | |
| F-3 | Bulk approve > 100 rows confirmation | **Required** (second click) | Rubber-stamp mitigation | No | |
| F-4 | Sync disabled until dedup-preview run (Phase 2+) | **Yes** | Duplicate prevention | No | |
| F-5 | Auto-create categories on sync | **Yes**, with "will be created" badge | Sync UX | No | |
| F-6 | Reviewed flag visible and filterable | **Yes** | Triage UX | No | |
| F-7 | Mobile review support | **Defer** to Phase 3 | Scope control | No | |
| F-8 | Bulk-select persistence across pagination | **Yes** | UX polish | No | |

---

## G. Rollout Decisions

| ID | Question | Recommended default | Impact if not decided | Blocks build? | Decision |
|---|---|---|---|---|---|
| G-1 | Feature flag gating | **Per-restaurant flag** `menu_import.enabled` (DB-backed) | Pilot control | No | |
| G-2 | Pilot cohort size | **5 restaurants**, staggered onboarding over 2 weeks | Risk containment | No | |
| G-3 | Rollback mode on pilot | Determined by B-2 (default **C**) | Tied to B-2 | Tied to B-2 | |
| G-4 | Data residency / S3 region | **ap-south-1** (India) unless customers dictate otherwise | Bucket creation | **YES (Phase 0)** | ✅ **Closed 2026-01:** "Park Amazon — work on local in Phase 1." Phase 1 storage = local PVC only; S3 region (`ap-south-1` recommended) deferred to a later phase before prod cutover. |
| G-5 | Compliance stance (India DPDP / GDPR) | Follow POS-wide posture; document in security runbook | Legal risk | No (in-phase; validate before GA) | |
| G-6 | AI usage disclosure copy | Shown at onboarding: "AI reads your menu; you approve before going live." | Trust | No | |
| G-7 | Pilot exit criteria (approval to broaden) | Hold-out accuracy met; `manual_correction_rate ≤ 25%`; sync success ≥ 99%; 0 Sev-1 | Gate to Phase 2 | No | |

---

## H. Dataset Decisions (Phase 0C — required before Build Phase 2)

| ID | Question | Recommended default | Impact if not decided | Blocks build? | Decision |
|---|---|---|---|---|---|
| H-1 | Google Drive source folder ID | Owner provides one Drive folder containing all test menu files; supplied via env `GOOGLE_DRIVE_DATASET_FOLDER_ID`; **never committed** to git or pasted into docs | Phase 0C ingest cannot start | **YES (Phase 0C)** | 🟢 **Deferred 2026-01:** owner pivoted to zip upload (one-time job). Re-open if Phase 2+ needs Drive. |
| H-2 | Service account credential handling | Use environment variable / mounted secret file `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_PATH`; **never** commit credentials; `.gitignore` includes `*-sa.json`; rotate annually | Drive auth + security | **YES (Phase 0C)** | 🟢 **Deferred for Phase 0C 2026-01** (Drive deferred). 🔴 Leaked key (`bug-intake@...`, key id `ad8c4a3857158b4aa34be710f862ea4f221a42b1`) **still requires revocation as security hygiene** — see `PHASE_0_DECISION_LOG.md §2`. |
| H-3 | Initial dataset size | **30 menus** at `dataset_version v0.1.0` — 10 simple / 10 medium / 5 complex / 5 variants-or-addons (Phase 2 Parking, flagging-only in Phase 1) | Phase 0C target | **YES (Phase 0C)** | ✅ **Closed 2026-01:** "Pick any 30." Agent picks 30 honoring stratification 10/10/5/5. |
| H-4 | Golden dataset human-review owner | Owner or assigned operations person is primary reviewer; second internal reviewer for Phase 1 Golden + Stress menus; third resolves disagreements | Expected outputs cannot be filled/frozen | **YES (Phase 0C)** | ✅ **Closed 2026-01:** Primary reviewer = **Sunil**. Recommend nominating a second internal reviewer for Phase 1 Golden + Stress menus. |
| H-5 | Dataset storage target | Local controlled storage (PVC) in pre-prod at `MENU_DATASET_LOCAL_STORAGE_PATH`; S3 (KMS-encrypted) in prod at `MENU_DATASET_S3_BUCKET` (region per G-4) | Where copies live + retention | **YES (Phase 0C)** | ✅ **Closed 2026-01 for Phase 1:** Local / PVC only in Phase 1; S3 deferred per G-4. |
| H-6 | Allowed file types | `application/pdf`, `image/jpeg`, `image/png` (configurable via `MENU_DATASET_ALLOWED_MIME_TYPES`) | Disallowed types are inventoried but not downloaded | No | |
| H-7 | Max file size | **25 MB** per file (`MENU_DATASET_MAX_FILE_SIZE_MB=25`) | Prevent PDF zip-bomb / oversized scans | No | |
| H-8 | Dataset audit log retention | **13 months** (mirrors menu_import_audit_log) | Traceability + compliance | No | |
| H-9 | Cross-version duplicate handling | Mark as `cross_version_duplicate_of=<prior_version>`; never delete | Reproducibility + reviewer efficiency | No | |
| H-10 | Phase 2 Parking grading rule | Phase 1 grades only flagging (variant_detected / addon_detected); does NOT grade variant/addon content. `phase2_only_detail` block stored, not scored. | Avoids false-fail on Phase 1 release | No | |
| **H-11** | Dataset upload method (Phase 0C) | **Zip-via-chat asset, one-shot** (replaces Drive route for Phase 0C) | Without this, Phase 0C cannot ingest | **YES (Phase 0C)** | ✅ **Closed 2026-01:** owner uploads ~30 menus as a single zip; agent processes per `ZIP_DATASET_INGESTION_OPTION.md`. Trigger phrase: "zip uploaded — proceed with Phase 0C execution". |

---

## Summary — P0 Owner Actions

### P0 — Required before Build Phase 1 (Foundation)
1. **B-1, B-2, B-3, B-5** — POS Menu API contract + delete support + bulk support + cuisine_type source. Action: invoke POS Menu API Contract Discovery Agent (Phase 0A). Note: Phase 0A discovery against `/app/` has been executed and **all four remain blocked pending POS team confirmation**. Build Phase 1 (Foundation) does **not** require these — it can start once owner approves; Build Phase 6 (Sync) is parked.
2. **D-1** — Gemini 3 SDK pin. Action: invoke `integration_playbook_expert_v2` (Phase 0B).
3. **D-6** — Per-restaurant monthly cost cap USD value. Action: Finance decision.
4. **G-4** — S3 region / data residency. Action: Sec + Product decision.

### P0 — Required before Build Phase 2 (Extraction) — Phase 0C Dataset
5. **H-1** — Drive folder ID (via env var, never committed).
6. **H-2** — Service account credential handling (mounted secret, never committed).
7. **H-3** — Initial dataset size (recommended 30 menus: 10/10/5/5).
8. **H-4** — Human-review owner identified.
9. **H-5** — Dataset storage target (PVC pre-prod / S3 prod).

### P0 — Required before Build Phase 6 (POS Sync)
- B-1 / B-2 / B-3 confirmed by the POS engineering team (still blocked at the time of this sheet).

All other decisions have production-safe defaults and can be closed in-phase.

---

## Sign-off

| Role | Name | Date | Notes |
|---|---|---|---|
| Product owner | | | |
| Backend architect | | | |
| Frontend lead | | | |
| POS team lead | | | |
| Security | | | |

Sign-off of this sheet closes Phase 0. Build Phase 1 may then begin.
