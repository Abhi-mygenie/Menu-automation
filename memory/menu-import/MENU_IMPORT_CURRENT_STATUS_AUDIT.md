# MyGenie POS · AI Menu Import — Current Status Audit (read-only) — v2

**Audit timestamp:** 2026-05-06 (UTC)
**Audited by:** continuation-status audit agent
**Mode:** read-only (`git ls-remote`, `git ls-tree`, `git show` only — no fetch, no pull, no checkout, no working-tree change)
**Audit scope:** local `/app` repo + read-only inspection of both `origin/main` and `origin/7-may` from
`https://github.com/Abhi-mygenie/Menu-automation.git` (via the existing `/tmp/menu-automation` clone)

> **Supersedes:** `MENU_IMPORT_CURRENT_STATUS_AUDIT.md` (v1) which only inspected `7-may`. The previous audit
> incorrectly concluded "no Phase 0 docs exist anywhere"; this v2 corrects that — **the docs all live on `origin/main`**, not on `7-may`.

---

## 1. Executive status

> **🟡 YELLOW — Planning is done. Execution has not started. The right files exist on the right branch (`main`), but the wrong branch (`7-may`) was checked out into `/app`.**

| | `origin/main` | `origin/7-may` (currently in `/app`) |
|---|---|---|
| Last commit | `930758e` @ 2026-05-05 15:03 UTC | `d17fd33` @ 2026-05-06 14:01 UTC |
| `memory/menu-import/` docs | **30 files, ~10,000+ lines** ✅ | empty placeholder ❌ |
| `datasets/menus_raw/v0.1.0-PROPOSED/` | **absent** | **present** (33 PDFs, 7 batches) |
| `backend/server.py` | 88-line template (no menu code) | 88-line template (no menu code) |
| `frontend/src/App.js` | template only | template only |

**One-line verdict:** All Phase 0 (A/B/C) **planning** is complete on `main`; **zero implementation code, zero schema, zero deployment** on either branch; the v0.1.0 dataset is **PROPOSED, not FROZEN**; Sunil is the named reviewer but **the review has not been executed** because the v0.1.0 expected-output placeholders / split / owner-approval files have **not been authored yet**.

---

## 2. Git / repo status

### 2.1 Local `/app`

| Field | Value |
|---|---|
| Path | `/app` |
| Branch | `main` (Emergent's container repo, **not** the GitHub `main`) |
| Latest commit | `731bd5f auto-commit …` (2026-05-06 16:12 UTC) |
| Remote | **none configured** |
| Working tree | dirty by untracked env/lockfiles only (`.env.example`, `backend/.env`, `frontend/.env`, `frontend/yarn.lock`, `yarn.lock`) |

### 2.2 Upstream `Abhi-mygenie/Menu-automation` (read via `git ls-remote`)

| Branch | Tip | When | What it carries |
|---|---|---|---|
| **`main`** | `930758e` | **2026-05-05 15:03 UTC** | Full `memory/menu-import/` docset (30 files). No datasets folder. No menu-import code. |
| **`7-may`** | `d17fd33` | 2026-05-06 14:01 UTC | `datasets/menus_raw/v0.1.0-PROPOSED/` (33 PDFs, 7 batches) + identical 88-line template `server.py`. **No `memory/menu-import/` docs.** |

**Divergence:** 8 commits unique to `main`, 12 commits unique to `7-may` (common ancestor: `26896ea Initial commit`).

### 2.3 What the previous "setup & handover" agent did
- Cloned `7-may` → `/tmp/menu-automation` (still on disk).
- Synced only `datasets/` and `.gitconfig` from that clone into `/app`.
- Built a generic React+FastAPI+Mongo demo with Docker artifacts and `DEPLOYMENT.md` — **unrelated to the Menu-Import program.** That work happened against `/app`'s independent git, not against either GitHub branch.
- Never touched the Menu-Import program because **`7-may` does not carry the program docs.**

---

## 3. Phase status table (authoritative — sourced from `origin/main` docs)

| Phase | Status | Evidence (file on `origin/main`) | Blocker / Next Step |
|---|---|---|---|
| **Phase 0A — POS Discovery** | ✅ **Done (planning)** | `POS_MENU_API_CONTRACT_DISCOVERY_REPORT.md` (299 lines), `POS_MENU_API_OPENAPI_DRAFT.yaml` (897 lines), `POS_MENU_IMPORT_SYNC_STRATEGY.md` (263 lines). Verdict: "No MyGenie POS Menu API exists in this repository." Proposed canonical OpenAPI drafted; sync strategy = defensive Mode-C until POS team confirms. | **POS engineering team must confirm/revise the OpenAPI draft.** Until they do, Build Phase 6 stays parked. |
| **Phase 0B — Gemini Playbook** | ✅ **Substantively done; 2 owner decisions still open** | `PHASE_0B_AI_READINESS_SUMMARY.md` (160 lines), `GEMINI_MENU_EXTRACTION_PLAYBOOK.md` (445), `GEMINI_MENU_EXTRACTION_JSON_SCHEMA.json` (339), `GEMINI_MENU_EXTRACTION_PROMPT_TEMPLATE.md` (272), `GEMINI_COST_CONTROL_AND_VERSIONING_SPEC.md` (262). | **D-6** USD cost-cap value (Finance) — closed via `PHASE_0_DECISION_LOG.md` as "free for restaurants" (defensive ceilings retained). **D-7** stack path = **Path A (Python + `emergentintegrations` + `EMERGENT_LLM_KEY`)** — already closed in `PHASE_0_DECISION_LOG.md`. Net: **Phase 0B can be considered closed for Build Phase 2 purposes.** |
| **Phase 0C — Dataset Ingestion (planning)** | ✅ **Plan done** | `MENU_DATASET_PREPARATION_PLAN.md` (355), `GOOGLE_DRIVE_DATASET_INGESTION_SPEC.md` (265), `ZIP_DATASET_INGESTION_OPTION.md` (187), `MENU_EXPECTED_OUTPUT_TEMPLATE.json` (93), `MENU_EXTRACTION_EVALUATION_RUBRIC.md` (311), `MENU_DATASET_AGENT_HANDOFF.md` (185). Method per `PHASE_0_DECISION_LOG`: zip-via-chat, one-shot. | **Plan is done; execution is not.** |
| **Phase 0C — Dataset Ingestion (execution)** | 🟡 **NOT executed** | Folder `datasets/menus_raw/v0.1.0-PROPOSED/` exists **only on `7-may`** with 33 PDFs across 7 batches. **No** `MENU_GOLDEN_DATASET_SPLIT_v0.1.0_PROPOSED.md`, **no** `MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json`, **no** `MENU_DATASET_OWNER_APPROVAL_STATUS_v0.1.0.md` on either branch. | Author the three v0.1.0 deliverables (split, expected-output placeholders, owner-approval doc) on `main`. Then send to Sunil. |
| **Dataset Freeze v0.1.0** | 🔴 **PROPOSED — NOT frozen** | Folder name on `7-may`: literally `…/v0.1.0-PROPOSED/`. No `frozen_at`, no FROZEN marker file, no rename. | Cannot freeze until owner-approval doc + Sunil sign-off + (recommended) second reviewer sign-off exist. |
| **Sunil expected-output review** | 🔴 **Pending — not started** | `PHASE_0_DECISION_LOG.md` H-4: "Primary reviewer = **Sunil**." Closed as a decision; the **actual review has not happened** because the placeholder file doesn't exist. | Generate `MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json` from the template; hand to Sunil. |
| **Second reviewer** | 🟡 **Pending nomination — not waived** | `PHASE_0_DECISION_LOG.md` §1 H-4 note: "A second internal reviewer for Phase 1 Golden + Stress menus is recommended; owner to nominate." `MENU_DATASET_PREPARATION_PLAN.md` line 239: "Two reviewers per file in Phase 1 Golden Set and Stress Set; disagreements resolved by a third." | Owner nominates. If they explicitly waive, capture the waiver in `PHASE_0_DECISION_LOG.md`. |
| **Build Phase 1 — Foundation** | ❌ **Not started** | `backend/server.py` on **both** branches is the 88-line template (`/api/`, `/api/status`, `StatusCheck` model only). No services, controllers, models, migrations, schemas. | Owner closes Gates 1–7 (per `PRODUCTION_GRADE_APPROVAL_SUMMARY.md §6`) → Backend Foundation Implementation Agent starts. **Independent of 0B/0C — can start as soon as gates close.** |
| **Build Phase 2 — Extraction** | ❌ **Not started; blocked** | No Gemini SDK call code. `backend/requirements.txt` has only `emergentintegrations==0.1.0` (no `google-generativeai`). No upload, batch, ingestion, OCR, extraction code. | Blocked on (1) Build Phase 1 complete, (2) Phase 0C dataset frozen, (3) Sunil's expected outputs filled and approved. |
| **Build Phase 6 — POS Sync** | 🟦 **PARKED** (by design) | Docs say "❌ PARKED until POS team confirms contract." | Stays parked until POS team confirms `POS_MENU_API_OPENAPI_DRAFT.yaml`. |

---

## 4. Dataset status

| Field | Value |
|---|---|
| `dataset_version` (planned) | `v0.1.0` |
| Folder location | **`7-may` only**: `datasets/menus_raw/v0.1.0-PROPOSED/` |
| Accepted file count | **33 PDFs** across 7 batches (`batch-01`…`batch-07`, sizes 5/5/5/5/5/5/3). Note: `MENU_DATASET_PREPARATION_PLAN.md` H-3 target = 30 menus stratified 10/10/5/5; the 33 may include the planned 30 plus 3 spares — classification not yet recorded. |
| Image gap | **Unknown** — no inventory file exists; no per-restaurant image catalogue. The `MENU_DATASET_PREPARATION_PLAN.md` says rule-based classifier + human reviewer fill the manifest before freeze; **this hasn't happened**. |
| Split approved | ❌ **No** — `MENU_GOLDEN_DATASET_SPLIT_v0.1.0_PROPOSED.md` does **not exist on either branch**. |
| Expected-output placeholders | ❌ **Missing** — only the *template* (`MENU_EXPECTED_OUTPUT_TEMPLATE.json`, 93 lines) exists; the v0.1.0 placeholders file does not. |
| `frozen_at` | **null** — no freeze artifact exists. |
| `human_review_status` | **not_started** — Sunil named, but no review record. |
| Owner approval doc | ❌ **Missing** — `MENU_DATASET_OWNER_APPROVAL_STATUS_v0.1.0.md` does not exist. |
| Folder suffix `-PROPOSED` | The only freeze signal, and it explicitly says **NOT frozen.** |

---

## 5. Database / schema status

| Check | Result |
|---|---|
| Schema specification (markdown) | ✅ Present on `main`: `MENU_IMPORT_MVP_DB_SCHEMA.md` (896 lines). v2.0 includes tables 3.12 `menu_import_idempotency_keys`, 3.13 `menu_import_admin_actions`, 3.14 `menu_import_draft_snapshots`, 3.15 `menu_import_dataset_manifest`. |
| Schema implementation files | ❌ **None** — no `schema.py`, no `models/menu*.py`, no SQL files, no `alembic/`, no `prisma/`, no `migrations/`. |
| Migration tooling configured | ❌ No `alembic.ini`, no `prisma/schema.prisma`. `requirements.txt` has neither `alembic` nor `sqlalchemy`. |
| Tables actually created | ❌ **No evidence.** Only the existing template `status_checks` Mongo collection. The whole spec assumes **PostgreSQL** ("Node.js + PostgreSQL" per `PRODUCTION_GRADE_APPROVAL_SUMMARY.md`) — and **no Postgres instance is configured anywhere in either branch.** |
| Deployed to any environment | ❌ Not visible. |

> **Conclusion:** the menu-import database is **fully designed on paper, zero lines of executable schema have been written, zero migrations exist, zero tables have been created.** Build Phase 1 Foundation (the agent that owns this) has not started.

---

## 6. Implementation status

### Backend (`origin/main`, identical on `7-may`)
- `backend/server.py` — 88 lines, the unmodified Emergent template:
  - `GET /api/` (Hello World)
  - `POST /api/status`, `GET /api/status` (placeholder `StatusCheck` model)
- `backend/requirements.txt` — only `emergentintegrations==0.1.0` matches anything menu-relevant. **No** `google-generativeai`, **no** `alembic`, **no** `sqlalchemy`, **no** `pdfplumber` / `pypdf`, **no** OCR libs.
- **No menu-import services / controllers / repositories / DTOs / queue handlers / Gemini call code / upload endpoint / import-batch code.**

### Frontend (`origin/main`, identical on `7-may`)
- `frontend/src/App.js` — template (Hello World axios call). On `/app` it is the dashboard from the prior setup task; on both upstream branches it is the original template.
- shadcn UI library present but unused for menu-import.
- **No upload UI, no review UI, no draft UI, no source-provenance pane, no dedup-preview modal.**

### Gemini integration
- ❌ **Zero code.** The **playbook** (`GEMINI_MENU_EXTRACTION_PLAYBOOK.md`) is comprehensive (445 lines) and prescribes Path A (Python + `emergentintegrations` + `EMERGENT_LLM_KEY`), but no code calls Gemini.

### Upload / import-batch / dataset-ingestion code
- ❌ **None.** No multipart upload endpoint, no batch table/collection, no job queue, no zip-ingestion script.

---

## 7. Deployment status

| Check | Result |
|---|---|
| Build logs | None present (other than the prior task's `iteration_1.json`) |
| Deploy evidence | ❌ None — no `deployment_agent` reports for menu-import |
| Environment changes | None menu-import-specific (`backend/.env` still has `MONGO_URL`, `DB_NAME=test_database`, `CORS_ORIGINS`; **no `EMERGENT_LLM_KEY`, no `GEMINI_API_KEY`, no `POSTGRES_URL`, no `MENU_EXTRACT_*` vars**) |
| Docker artifacts | The prior task's `Dockerfile.backend`, `Dockerfile.frontend`, `nginx.conf`, `docker-compose.yml` exist in `/app`, but **none reference the menu-import architecture** (no Postgres, no worker, no queue, no blob storage). They were authored for the generic React+FastAPI+Mongo template. |
| Containers running in prod | ❌ Not visible from this workspace. |

---

## 8. Risk / mismatch notes

1. **Branch mismatch (root cause of v1 audit's "all missing" verdict).** The user pulled `7-may`, which is the *dataset-only* branch. The *docs* branch is `main`. They are **8 vs 12 commits diverged** with **no overlap on the menu-import doc tree**. Picking one branch loses the other.
2. **Implementation drift on `/app`.** `/app/backend/server.py` was modified in this conversation (added `/api/health` and `/api/datasets/stats` endpoints for the prior "setup & handover" task). That modification is **NOT in either GitHub branch** and **NOT part of the Menu-Import program**. It is harmless but worth noting if `/app` is ever reconciled with `main`.
3. **Stack contradiction in docs.** `PRODUCTION_GRADE_APPROVAL_SUMMARY.md` describes the system as "Node.js + PostgreSQL." `PHASE_0_DECISION_LOG.md` D-7 closes the stack as **Path A — Python + FastAPI + `emergentintegrations`**. Architecture docs need a sweep to reflect the closed D-7 (otherwise the foundation agent will scaffold the wrong language).
4. **Database stack contradiction.** All schema docs assume **PostgreSQL**; the existing `/app` template uses **MongoDB**. No migration path is documented; this is a fresh-build situation, not a port. This must be explicit in the foundation-phase brief.
5. **Dataset is on `7-may`, docs are on `main`.** Build Phase 0C execution will need a single branch (or a merge) carrying both. Recommended: rebase the 33 PDFs onto `main` (or vice-versa) before the Phase 0C agent runs.
6. **Sunil decision recorded ≠ Sunil review performed.** H-4 closed in `PHASE_0_DECISION_LOG`, but the artifact Sunil would review (`MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json`) does not exist. Phase 0C cannot complete until that file is generated and reviewed.
7. **Second reviewer is *recommended*, not *waived*.** Treat as pending until owner explicitly nominates or waives in writing.
8. **Leaked Google service-account key.** `PHASE_0_DECISION_LOG.md §2` records a Sev-1 credential exposure (key id `ad8c4a3857158b4aa34be710f862ea4f221a42b1` for `bug-intake@voice-bug-intake.iam.gserviceaccount.com`). The key was deferred (pivoted to zip-via-chat), but **revocation is still required as security hygiene** — this audit cannot verify whether it has been revoked; that confirmation must come from the owner.
9. **No git remote on `/app`.** Any "push to upstream" assumption is impossible until a remote is added.
10. **No `EMERGENT_LLM_KEY` in `backend/.env`.** Required by Path A before Build Phase 2 can call Gemini.

---

## 9. Recommended next safe action

**STOP — do NOT enter Build Phase 1 or Build Phase 2 from this `/app` checkout.**

Recommended sequence (still **planning / docs-only**, no code):

1. **Confirm the canonical branch with owner.** Decide whether the canonical branch is `main` (carries the docs) or whether `7-may` is the active working branch into which `main`'s docs should be merged. Recommended: **declare `main` canonical** and merge the `datasets/menus_raw/v0.1.0-PROPOSED/` tree from `7-may` onto `main` so future work happens on one branch.
2. **Reconcile `/app` with `origin/main`.** Either:
   - Add `origin = https://github.com/Abhi-mygenie/Menu-automation.git` to `/app`, then `git fetch origin main` and reconcile (the prior agent's status-dashboard changes would need to be discarded or moved to a sub-folder), **or**
   - Re-clone `main` to a fresh workspace and continue there.
3. **Confirm leaked-key revocation** (PHASE_0_DECISION_LOG §2.3 checklist). This is independent of the program but security-blocking.
4. **Author the v0.1.0 dataset deliverables** on the canonical branch (still no code):
   - `MENU_GOLDEN_DATASET_SPLIT_v0.1.0_PROPOSED.md` (apply the 10/10/5/5 stratification from H-3 to the 33 PDFs).
   - `MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json` (generate placeholder rows from `MENU_EXPECTED_OUTPUT_TEMPLATE.json`).
   - `MENU_DATASET_OWNER_APPROVAL_STATUS_v0.1.0.md` (signature lines for Sunil + second reviewer).
5. **Send placeholders to Sunil for expected-output review.** Capture his sign-off in the approval-status doc.
6. **Owner nominates or waives second reviewer.** Record the outcome in `PHASE_0_DECISION_LOG.md`.
7. **On approval, freeze the dataset:** rename `datasets/menus_raw/v0.1.0-PROPOSED/` → `datasets/menus_raw/v0.1.0/`, set `frozen_at` in the manifest, mark `human_review_status = approved`.
8. **In parallel: owner closes Gates 1–7** in `PRODUCTION_GRADE_OWNER_DECISION_SHEET.md` so Build Phase 1 (Foundation) can start. Gates 1–7 are **independent** of the dataset freeze.
9. **Reconcile architecture docs to D-7 (Python).** A single-page errata on `PRODUCTION_GRADE_APPROVAL_SUMMARY.md` saying "stack = Python + FastAPI + Postgres + emergentintegrations" prevents the Foundation Agent from scaffolding NestJS by mistake.
10. **Only then:** invoke **Backend Foundation Implementation Agent** for Build Phase 1 (Postgres schema + migrations + storage + auth scaffold + upload + import_batch). Do NOT invoke Build Phase 2 / extraction agent until Build Phase 1 ships and Phase 0C is frozen.

---

## Final answer (per checklist)

1. **Status report file:** `/app/memory/menu-import/MENU_IMPORT_CURRENT_STATUS_AUDIT.md` (this file). Canonical path is `/app/memory/menu-import/`. The `/app/menu-automation/` path does not exist; no symlink involved.
2. **Current branch / commit:** `/app` is on local `main` @ `731bd5f` with no remote. The **upstream Menu-Import program** lives on **`origin/main` @ `930758e` (2026-05-05 15:03 UTC)** of `https://github.com/Abhi-mygenie/Menu-automation.git`.
3. **Dataset state:** **PROPOSED, not frozen.** Folder `datasets/menus_raw/v0.1.0-PROPOSED/` (on `7-may`, **not** on `main`). 33 PDFs across 7 batches. No expected-output placeholders, no split doc, no owner-approval doc, no `frozen_at`, no Sunil review record.
4. **DB / schema implemented or deployed:** **No.** Schema is fully *specified* (`MENU_IMPORT_MVP_DB_SCHEMA.md`, 896 lines), but **zero implementation files, zero migrations, zero tables created, zero deployment.** The target stack is Postgres; no Postgres instance is configured.
5. **Build Phase 1 started:** **No.** Both branches still carry the unmodified 88-line template `server.py`. No menu-import code exists.
6. **Build Phase 2 still blocked:** **Yes.** Blocked by (a) Build Phase 1 not started, (b) Phase 0C dataset not frozen, (c) Sunil's expected-output review not done, (d) `EMERGENT_LLM_KEY` not configured. Phase 0B itself is closed.
7. **Exact next safe step:** **Confirm with the owner that `origin/main` is canonical; merge the `7-may` dataset tree onto `main`; reconcile `/app` to `main`. Then author the three v0.1.0 dataset deliverables (split, expected-output placeholders, owner-approval doc) and send to Sunil. Do not write any code, schema, migration, or Gemini call until the dataset is frozen and Sunil's review is recorded.**

— END OF AUDIT v2 (read-only). No further action taken. —
