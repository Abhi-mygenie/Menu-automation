# MyGenie POS · AI Menu Import — Current Status Audit (read-only)

**Audit timestamp:** 2026-05-06 (UTC, container time)
**Audited by:** continuation-status audit agent
**Mode:** read-only (no code changed, no deploy, no Gemini calls, no DB writes)
**Audit path:** `/app` (only repo on disk; `/app/menu-automation/` does not exist)

---

## 1. Executive status

> **🟥 RED — Menu-Import program has NOT started in this repo.**

None of the Phase 0A / 0B / 0C / Phase 1 / Phase 2 menu-import artifacts exist anywhere in the workspace. The dataset is still **PROPOSED, not FROZEN**. There is no `memory/menu-import/` tree (other than this audit doc just created), no Sunil-review record, no schema/migration files, and no Gemini code.

The repo currently contains only a **generic React + FastAPI + Mongo "Menu Automation" setup & handover** (the prior agent's deliverable in this same conversation): a FastAPI status/datasets API, a status dashboard UI, Dockerfiles, `docker-compose.yml`, and `DEPLOYMENT.md`. **That is unrelated to the production-grade Menu-Import system described in the audit checklist.**

The likely cause: the previous agent died / a new agent pulled code, and the Phase-0 docs (which were planned separately) never landed in this branch — or they live in another branch / another repo that was not pulled into `/app`.

---

## 2. Git / repo status

| Field | Value |
|---|---|
| Repo path | `/app` |
| Current branch | `main` |
| Latest commit | `731bd5f auto-commit for 34f87d91-de73-412c-bab6-e08ee7b7bd8b` (2026-05-06 16:12 UTC) |
| Previous commit | `f8ded90 auto-commit for d9084288-…` (full setup + dataset folder) |
| Initial commit | `26896ea Initial commit` |
| Remote(s) | **none configured** (`git remote -v` empty) |
| Working tree | **dirty** — untracked files only, no modifications |

### Untracked files (non-blocking, just env/lockfiles)
```
?? .env.example
?? backend/.env
?? frontend/.env
?? frontend/yarn.lock
?? yarn.lock
```

> Note: there is **no `7-may` branch on this checkout** — the prior agent cloned that branch from upstream into `/tmp` and synced files into `/app`, but the local `/app` git only has `main`. The user-visible branch in the prior conversation (`7-may`) is therefore **not the branch this audit ran against**.

---

## 3. Phase status table

| Phase | Status | Evidence | Blocker / Next Step |
|---|---|---|---|
| Phase 0A POS Discovery | **Pending (not started)** | `POS_MENU_API_CONTRACT_DISCOVERY_REPORT.md` not present anywhere under `/app` | Author the discovery doc; nothing else proceeds until POS API contract is captured. |
| Phase 0B Gemini Playbook | **Pending (not started)** | `PHASE_0B_AI_READINESS_SUMMARY.md` not present | Cannot start until 0A is reviewed; even the playbook scaffold is missing. |
| Phase 0C Dataset Ingestion | **Partial — raw assets only** | `/app/datasets/menus_raw/v0.1.0-PROPOSED/` exists with 7 batches (33 PDFs); no split / expected-output / approval doc | Author the split doc, expected-output placeholders, owner-approval doc. |
| Dataset Freeze v0.1.0 | **PROPOSED (not frozen)** | Folder name is literally `v0.1.0-PROPOSED`; no `FROZEN` marker / no `frozen_at` field anywhere | Cannot freeze without owner approval + reviewer sign-off. |
| Sunil Expected-Output Review | **Pending** | `Sunil` not found in any tracked file; no `MENU_DATASET_OWNER_APPROVAL_STATUS_v0.1.0.md` | Send placeholders to Sunil; capture written approval. |
| Second Reviewer | **Pending (status unknown)** | No decision log file; no waiver record | Either schedule second reviewer or capture explicit waiver in `PHASE_0_DECISION_LOG.md`. |
| Build Phase 1 Foundation | **Not Started** | No services / controllers / DB models for menu-import. Backend has only `server.py` (status + datasets/stats endpoints from setup task) and a placeholder `StatusCheck` model. | Blocked on Phase 0 completion + dataset freeze. |
| Build Phase 2 Extraction | **Not Started** | No Gemini SDK in requirements (no `google-generativeai`, no `emergentintegrations` usage), no extraction code, no batch/upload code | Blocked on Phase 1 + Phase 0B Gemini playbook. |
| Build Phase 6 POS Sync | **Parked** | No POS-sync code, no contract doc | Stays parked until Phases 0–5 complete. |

---

## 4. Dataset status

| Field | Value |
|---|---|
| Dataset folder | `/app/datasets/menus_raw/v0.1.0-PROPOSED/` |
| Sub-folders | `batch-01` … `batch-07` (7 batches) |
| Accepted file count | **33 PDF files** (5+5+5+5+5+5+3 across the 7 batches) |
| Image gap | **Unknown** — no inventory doc exists; raw folder is PDF-only, no per-restaurant image catalogue |
| Split approved | **No** — `MENU_GOLDEN_DATASET_SPLIT_v0.1.0_PROPOSED.md` does not exist |
| Expected-output placeholders | **Missing** — `MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json` does not exist |
| `frozen_at` | **null / not present** |
| `human_review_status` | **not recorded** — no approval doc, no decision log |
| Folder suffix | `-PROPOSED` (suffix is the only freeze signal and it explicitly says NOT frozen) |

---

## 5. Database / schema status

| Check | Result |
|---|---|
| Schema files (`*.sql`, `schema.py`, `models/menu*.py`, `alembic/`, `migrations/`) | **None found** |
| Migration tooling configured | **No** (no `alembic.ini`, no `prisma/`, no `migrations/` folder) |
| Tables actually created in any DB | **No evidence** — only collection in Mongo is `status_checks` (used by the prior status-check API); no `menu_*` collections referenced anywhere |
| Mongo `DB_NAME` in use | `test_database` (default placeholder from `backend/.env`) |
| Any `CREATE TABLE` / `db.collection_name` for menu entities | **Not found** in any tracked file |

> Conclusion: **no menu-import schema has been designed or deployed.** The only persisted entity is the unrelated `status_checks` collection.

---

## 6. Implementation status

### Backend
- `/app/backend/server.py` — only the prior setup task's endpoints:
  - `GET /api/`
  - `GET /api/health`
  - `GET /api/datasets/stats` (filesystem listing of `datasets/menus_raw/`, **no DB**)
  - `POST /api/status` / `GET /api/status` (placeholder `StatusCheck` model)
- `/app/backend/requirements.txt` — generic deps. **No Gemini SDK** (`google-generativeai` absent). `emergentintegrations==0.1.0` is listed but not imported.
- No services / controllers / repositories / DTOs for menu import.
- No upload, batch, ingestion, OCR, or extraction code.

### Frontend
- `/app/frontend/src/App.js` — status dashboard from setup task (Backend / MongoDB / Datasets cards + per-batch listing). **No upload UI, no review UI, no extraction UI.**
- shadcn UI library present at `frontend/src/components/ui/` — unchanged from template; no menu-import-specific components.

### Gemini integration
- **None.** No Gemini call code, no API-key wiring, no playbook stub.

### Upload / import batch code
- **None.** No multipart upload endpoint, no batch table/collection, no job queue.

---

## 7. Deployment status

| Check | Result |
|---|---|
| Build logs | None present in `/app` |
| Deploy evidence | None (no `deployment_agent` reports, no CD logs) |
| Environment changes | Only the `backend/.env` and `frontend/.env` defaults from the template; nothing menu-import-specific |
| Docker artifacts in repo | `Dockerfile.backend`, `Dockerfile.frontend`, `nginx.conf`, `docker-compose.yml` exist (from prior setup task) — **but never built or pushed** in this workspace |
| Containers actually running in prod | **Not visible** from this workspace |
| Supervisor services | `backend`, `frontend`, `mongodb` running locally — these are dev services only, not a deployment |

---

## 8. Risk / mismatch notes

1. **Doc-path mismatch / missing tree.** Both `/app/memory/menu-import/` and `/app/menu-automation/memory/menu-import/` were absent before this audit. None of the Phase 0 / 0A / 0B / 0C deliverables exist anywhere in `/app` (verified via `find /app -path '*menu-import*'` → empty).
2. **Branch mismatch suspicion.** The prior agent worked against an upstream `7-may` branch but `/app/.git` only carries `main` and has no remotes — so the menu-import phase work, if it exists, is in a *different* repo or *different* branch than what's checked out here.
3. **Proposed vs frozen confusion is moot — dataset is unambiguously PROPOSED.** Folder name `v0.1.0-PROPOSED` is the only marker; no `FROZEN`, no `frozen_at`, no approval doc.
4. **Implementation-before-approval risk.** None — nothing has been implemented; this is actually the safer side of the risk register.
5. **Untracked env files.** `backend/.env`, `frontend/.env`, `.env.example` are untracked. Not blocking, but make sure they aren't committed with real secrets.
6. **No remote configured.** `git remote -v` is empty in `/app`. Any "push to upstream" assumption is currently impossible from this workspace without first adding a remote.

---

## 9. Recommended next safe action

> **STOP — do NOT enter Build Phase 1 or Build Phase 2 from this workspace.**

Before any further work, the following **read/write-only-on-docs** sequence must happen:

1. **Confirm with the owner** which repo / branch carries the existing Phase 0 docs (if any). If they exist elsewhere, pull that branch into `/app` (or rebase). If they do not exist anywhere, accept that Phase 0 has not started and proceed from a clean slate.
2. **Add a git remote** in `/app` so future pushes are possible:
   `git remote add origin <repo-url>` (after owner confirms the canonical URL).
3. **Author Phase 0A POS Discovery doc** at:
   `/app/memory/menu-import/POS_MENU_API_CONTRACT_DISCOVERY_REPORT.md`
4. **Author Phase 0B Gemini playbook** at:
   `/app/memory/menu-import/PHASE_0B_AI_READINESS_SUMMARY.md`
   (and call `integration_playbook_expert_v2` for Gemini before any code).
5. **Author Phase 0C dataset docs**:
   - `MENU_GOLDEN_DATASET_SPLIT_v0.1.0_PROPOSED.md`
   - `MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json`
   - `MENU_DATASET_OWNER_APPROVAL_STATUS_v0.1.0.md` (Sunil + second reviewer)
6. **Capture decisions** in `PHASE_0_DECISION_LOG.md` (proposed → frozen transition rules; second-reviewer waiver, if any).
7. **Only after** the dataset is **FROZEN** (folder rename `v0.1.0-PROPOSED → v0.1.0` + approval doc + `frozen_at` timestamp) → begin Build Phase 1 Foundation (DB schema design + migration files, still not deployed).

No Gemini calls, no extraction runs, no DB migrations, no POS sync until the above six items are signed off in writing.

---

## Final answer (per checklist)

1. **Status report file created:** `/app/memory/menu-import/MENU_IMPORT_CURRENT_STATUS_AUDIT.md` (this file). The canonical `menu-import/` tree did not exist before this audit; only path that existed was `/app/memory/` itself, so the canonical location is `/app/memory/menu-import/`. No symlink in play. `/app/menu-automation/` does not exist.
2. **Current branch / commit:** `main` @ `731bd5f` (no remote configured).
3. **Dataset state:** **PROPOSED** (folder `datasets/menus_raw/v0.1.0-PROPOSED/`, 33 PDFs across 7 batches). **NOT frozen.**
4. **DB / schema implemented or deployed:** **No.** No schema files, no migrations, no menu collections; only the unrelated `status_checks` collection from the setup task exists. No deploy evidence visible.
5. **Build Phase 1 started:** **No.** No menu-import code exists in backend or frontend.
6. **Build Phase 2 still blocked:** **Yes.** Blocked by Phase 0A, 0B, 0C, dataset freeze, and Phase 1 (in that order). No Gemini SDK installed, no extraction code.
7. **Exact next safe step:** **Confirm with the owner whether Phase 0 docs exist on another branch/repo. If not, author Phase 0A POS Discovery doc at `/app/memory/menu-import/POS_MENU_API_CONTRACT_DISCOVERY_REPORT.md`. Do not write any code, schema, migration, or Gemini call until the dataset is frozen and Sunil's review is recorded.**

— END OF AUDIT (read-only). No further action taken. —
