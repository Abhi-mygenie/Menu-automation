# MyGenie Menu Automation -- Project-Specific Addendum

**Created:** 2026-06-27
**Status:** Authoritative reference for any agent working on this project
**Scope:** Discovery + control bootstrap. No product code. No refactoring.

---

## 1. Project Identity

| Field | Value |
|---|---|
| Product name | MyGenie POS / Menu Automation |
| Business domain | Restaurant POS -- AI-assisted menu digitization |
| Current stage | **Planning complete, product code not started** |
| Owner / decision maker | Abhi (repo owner); Sunil (named dataset reviewer) |
| Current branch | `12-may` (consolidation of `main` docs + `7-may` datasets) |
| Current milestone | Phase 0C execution -- G7B human review pending |
| Running app today | Read-only status dashboard (health check, dataset stats, Mongo ping) |
| Repo URL | `https://github.com/Abhi-mygenie/Menu-automation.git` |

---

## 2. Tech Stack

### 2.1 Current Actual Stack (from code)

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Backend | FastAPI (Python) | 0.110.1 | 159-line `server.py` -- status dashboard only |
| Frontend | React 19 + CRA (craco) | 19.0.0 | 281-line `App.js` -- dashboard only |
| Database | MongoDB | 7.x | Via `motor` 3.3.1 async driver |
| CSS | Tailwind CSS | 3.4.17 | + shadcn/ui component library |
| Package manager (backend) | pip + requirements.txt | -- | venv-based |
| Package manager (frontend) | yarn 1.22.22 | -- | **Do NOT use npm** |
| Pipeline scripts | Python 3.11 | -- | pdftotext, tesseract OCR, Gemini via emergentintegrations |
| AI model | gemini-2.5-flash | -- | Via `emergentintegrations==0.1.0` + `EMERGENT_LLM_KEY` |
| Deployment (dev) | Supervisor | -- | backend:8001, frontend:3000, mongodb:27017 |
| Deployment (prod planned) | Docker + docker-compose + nginx | -- | Dockerfiles exist but untested in production |

### 2.2 Planned Stack (from docs)

Several planning docs (`MENU_IMPORT_MVP_ARCHITECTURE.md`, `PRODUCTION_GRADE_APPROVAL_SUMMARY.md`, `MENU_IMPORT_MVP_HANDOFF_INDEX.md`) reference:

- **Node.js + NestJS + TypeScript + Prisma + PostgreSQL + BullMQ + Redis**
- Queue workers, RLS, 14-table PostgreSQL schema

### 2.3 Stack Contradiction

| Document | Says |
|---|---|
| `PRODUCTION_GRADE_APPROVAL_SUMMARY.md` | "Node.js + PostgreSQL" |
| `MENU_IMPORT_MVP_ARCHITECTURE.md` | "NestJS recommended" |
| `MENU_IMPORT_MVP_DB_SCHEMA.md` | PostgreSQL 14+ with RLS |
| **`PHASE_0_DECISION_LOG.md` D-7** | **"Path A -- Python + FastAPI + emergentintegrations + EMERGENT_LLM_KEY"** -- CLOSED |
| `MENU_IMPORT_CURRENT_STATUS_AUDIT.md` | Flags this as Risk #3: "Stack contradiction in docs" |
| Existing codebase | Python + FastAPI + MongoDB |

**Resolution required:** Owner decision D-7 closes the stack as Python/FastAPI. Architecture docs need a sweep to reflect this or the foundation agent will scaffold the wrong language. **Do NOT scaffold Node.js/NestJS without explicit owner re-confirmation.**

---

## 3. Repository and Important Paths

| Purpose | Path |
|---|---|
| Repo root | `/app/` |
| Backend | `/app/backend/` |
| Backend entry point | `/app/backend/server.py` |
| Frontend | `/app/frontend/` |
| Frontend entry point | `/app/frontend/src/App.js` |
| Pipeline scripts | `/app/scripts/` |
| G7A bootstrap script | `/app/scripts/g7a_bootstrap_smoke.py` |
| G7B workbook builder | `/app/scripts/g7b_build_review_workbook.py` |
| G7B workbook ingest | `/app/scripts/g7b_ingest_review_workbook.py` |
| G7A staging artifacts | `/app/scripts/_g7a_staging/` |
| G7A extraction logs | `/app/scripts/_g7a_staging/extraction_log/` |
| G7A payloads | `/app/scripts/_g7a_staging/payloads/` |
| G7B review workbooks | `/app/scripts/_g7b_review/` |
| Datasets root | `/app/datasets/` |
| Menu PDFs | `/app/datasets/menus_raw/v0.1.0-PROPOSED/batch-01..07/` |
| Memory / docs root | `/app/memory/` |
| Menu-import planning docs | `/app/memory/menu-import/` |
| Control directory | `/app/memory/control/` |
| Bug tracker | `/app/memory/bugs/` |
| Gate docs (requirements) | `/app/memory/menu-import/MENU_IMPORT_MVP_REQUIREMENTS.md` |
| Gate docs (architecture) | `/app/memory/menu-import/MENU_IMPORT_MVP_ARCHITECTURE.md` |
| Gate docs (DB schema) | `/app/memory/menu-import/MENU_IMPORT_MVP_DB_SCHEMA.md` |
| Gate docs (API contract) | `/app/memory/menu-import/MENU_IMPORT_MVP_API_CONTRACT.md` |
| Gate docs (review UI) | `/app/memory/menu-import/MENU_IMPORT_MVP_REVIEW_UI_SPEC.md` |
| Gate docs (learning memory) | `/app/memory/menu-import/MENU_IMPORT_MVP_LEARNING_MEMORY_SPEC.md` |
| Gate docs (implementation phases) | `/app/memory/menu-import/MENU_IMPORT_MVP_IMPLEMENTATION_PHASES.md` |
| Owner decision sheet | `/app/memory/menu-import/PRODUCTION_GRADE_OWNER_DECISION_SHEET.md` |
| Decision log | `/app/memory/menu-import/PHASE_0_DECISION_LOG.md` |
| Handoff index | `/app/memory/menu-import/MENU_IMPORT_MVP_HANDOFF_INDEX.md` |
| Current status audit | `/app/memory/menu-import/MENU_IMPORT_CURRENT_STATUS_AUDIT.md` |
| AI first-pass output | `/app/memory/menu-import/MENU_AI_FIRST_PASS_OUTPUT_SMOKE_v0.1.0.json` |
| Gemini extraction schema | `/app/memory/menu-import/GEMINI_MENU_EXTRACTION_JSON_SCHEMA.json` |
| Gemini extraction playbook | `/app/memory/menu-import/GEMINI_MENU_EXTRACTION_PLAYBOOK.md` |
| Gemini prompt template | `/app/memory/menu-import/GEMINI_MENU_EXTRACTION_PROMPT_TEMPLATE.md` |
| Risk register | `/app/memory/menu-import/MENU_IMPORT_MVP_RISK_REGISTER.md` |
| Deployment doc | `/app/DEPLOYMENT.md` |
| Deployment handover (agent) | `/app/DEPLOYMENT_HANDOVER.md` |
| Deployment handover (E1) | `/app/DEPLOYMENT_HANDOVER_E1.md` |

---

## 4. Current Project State

### 4.1 Actually Implemented (code exists, runs)

| Item | Evidence |
|---|---|
| Status dashboard backend | `server.py`: 5 endpoints (`/api/`, `/api/health`, `/api/datasets/stats`, `/api/status` POST+GET) |
| Status dashboard frontend | `App.js`: React dashboard with health/mongo/dataset status pills and cards |
| Dataset files on disk | 33 PDFs across 7 batches in `datasets/menus_raw/v0.1.0-PROPOSED/` |
| G7A text/OCR pipeline | `g7a_bootstrap_smoke.py` (1206 lines): extracts text from PDFs via pdftotext/tesseract, builds Gemini payloads |
| G7A Gemini first-pass output | 5 Smoke Set PDFs processed, 412 rows extracted, archived in `MENU_AI_FIRST_PASS_OUTPUT_SMOKE_v0.1.0.json` |
| G7B review workbook generator | `g7b_build_review_workbook.py` (461 lines): generates Excel from AI output |
| G7B review workbook ingest | `g7b_ingest_review_workbook.py` (419 lines): ingests reviewed Excel back to JSON |
| 5 Excel review workbooks | Generated, sitting at `/app/scripts/_g7b_review/`, **not yet reviewed** |
| Docker artifacts | Dockerfile.backend, Dockerfile.frontend, docker-compose.yml, nginx.conf |
| Deployment docs | DEPLOYMENT.md, DEPLOYMENT_HANDOVER.md, DEPLOYMENT_HANDOVER_E1.md |

### 4.2 Only Planned (docs exist, zero code)

| Item | Spec document | Lines |
|---|---|---|
| 14-table database schema | `MENU_IMPORT_MVP_DB_SCHEMA.md` | 896 |
| 30 API endpoints | `MENU_IMPORT_MVP_API_CONTRACT.md` | 811 |
| Review UI (routes, components, provenance pane) | `MENU_IMPORT_MVP_REVIEW_UI_SPEC.md` | 468 |
| Learning memory system (3-scope correction rules) | `MENU_IMPORT_MVP_LEARNING_MEMORY_SPEC.md` | 363 |
| Architecture (13 logical services) | `MENU_IMPORT_MVP_ARCHITECTURE.md` | 439 |
| Workflow (state machines, failure recovery) | `MENU_IMPORT_MVP_WORKFLOW.md` | exists |
| POS sync strategy | `POS_MENU_IMPORT_SYNC_STRATEGY.md` | exists |
| Test strategy | `MENU_IMPORT_MVP_TEST_STRATEGY.md` | exists |
| 25-risk register | `MENU_IMPORT_MVP_RISK_REGISTER.md` | 290 |
| Build Phases 1-8 | `MENU_IMPORT_MVP_IMPLEMENTATION_PHASES.md` | 268 |

### 4.3 Partially Done

| Item | Done | Not done |
|---|---|---|
| Phase 0A (POS API discovery) | Discovery executed, OpenAPI draft proposed | POS team has not confirmed/revised the contract |
| Phase 0B (Gemini playbook) | Playbook + schema + prompt + cost spec written | Owner closure on D-6 (cost cap) already done; D-7 (stack) closed |
| Phase 0C (dataset preparation) | 33 PDFs collected, inventory done, split proposed, G7A smoke run complete | Dataset NOT frozen, G7B review NOT done, expected-output placeholders NOT filled by Sunil |
| Gate approval process | All 7 gate docs written (v2.0) | Zero gates have owner sign-off |

### 4.4 Blocked

| Item | Blocked by |
|---|---|
| Dataset freeze (G8) | Sunil's G7B review not started |
| Build Phase 1 (Foundation) | Gates 1-7 not signed off by owner |
| Build Phase 2 (Extraction) | Phase 1 not started + dataset not frozen |
| Build Phases 3-5 | Phase 2 not started |
| G7C-G7F (remaining 27 PDFs) | G7B smoke review not complete |

### 4.5 Parked

| Item | Why parked |
|---|---|
| Phase 6 (POS Menu Sync) | No POS Menu API exists; POS team has not confirmed the proposed contract |
| Google Drive dataset ingestion | Owner pivoted to zip-via-chat (H-11 closed) |
| S3 storage | Deferred to post-Phase-1 (G-4 closed: local PVC only in Phase 1) |

---

## 5. Menu Automation Business Modules (Planned)

| Module | Phase | Status | Key spec |
|---|---|---|---|
| PDF upload + file storage | Phase 1 | Not started | `_API_CONTRACT.md` POST /upload |
| Text/OCR extraction (pdftotext, tesseract) | Phase 0C/G7A | **Done for smoke set** | `g7a_bootstrap_smoke.py` |
| Gemini AI extraction | Phase 2 | **Done for smoke set only** | `GEMINI_MENU_EXTRACTION_PLAYBOOK.md` |
| Normalization (currency, unit, title-case) | Phase 2 | Not started | `_ARCHITECTURE.md` normalize-worker |
| Human review workbook (Excel) | Phase 0C/G7B | **Workbooks generated, review pending** | `G7B_EXCEL_REVIEW_GUIDE_SUNIL_v0.1.0.md` |
| Review UI (web) | Phase 3 | Not started | `_REVIEW_UI_SPEC.md` |
| Approval workflow | Phase 3 | Not started | `_API_CONTRACT.md` approve/reject endpoints |
| Draft save | Phase 4 | Not started | `_API_CONTRACT.md` /save-draft |
| Correction memory capture | Phase 4 | Not started | `_LEARNING_MEMORY_SPEC.md` |
| Learning memory apply | Phase 5 | Not started | `_LEARNING_MEMORY_SPEC.md` |
| POS menu sync | Phase 6 | **Parked** | `POS_MENU_IMPORT_SYNC_STRATEGY.md` |
| Dataset freeze | Phase 0C/G8 | Not done | `AI_ASSISTED_G7_ACTIVE_PLAN_v0.1.0.md` |
| Monitoring / dashboards | Phase 7 | Not started | `_ARCHITECTURE.md` observability |
| Pilot rollout (5 restaurants) | Phase 8 | Not started | `_IMPLEMENTATION_PHASES.md` Phase 8 |

---

## 6. Business-Critical Flows

### 6.1 Menu PDF Intake
- **Why critical:** Entry point for all menu data. Without upload, nothing else works.
- **What breaks if it fails:** Entire pipeline is dead. No extraction, no review, no sync.
- **Minimum regression:** File accepted, stored, metadata persisted, idempotency key enforced, virus scan passed, status visible.

### 6.2 Gemini AI Extraction
- **Why critical:** Core value proposition. Converts unstructured PDF to structured menu items.
- **What breaks if it fails:** Manual data entry required (defeats product purpose).
- **Minimum regression:** Schema-validated JSON output for every page, confidence scores, hallucination-control contract (raw_text + source_bbox), cost cap honored, versioned prompt/model.

### 6.3 Human Review
- **Why critical:** Safety gate. AI never directly modifies live POS menu.
- **What breaks if it fails:** Either bad data reaches POS (if bypassed) or users can't approve (if broken).
- **Minimum regression:** Every row editable, source provenance visible, approve/reject/edit actions work, draft save works, bulk actions work.

### 6.4 Approved Item Normalization
- **Why critical:** Ensures consistent data format before POS sync.
- **What breaks if it fails:** Inconsistent prices, categories, item names in POS.
- **Minimum regression:** Currency stripped, units detected, title-case applied, food_type mapped.

### 6.5 Dataset Freeze
- **Why critical:** Locks the evaluation ground truth. Build Phase 2 accuracy is graded against it.
- **What breaks if it fails:** No benchmark, accuracy claims are meaningless.
- **Minimum regression:** Folder renamed from `-PROPOSED` to version, `frozen_at` set, no further edits, Sunil's review recorded.

### 6.6 POS Menu Sync
- **Why critical:** Delivers the approved data to the live restaurant POS system.
- **What breaks if it fails:** Menu changes don't reach the POS; orders use stale menu.
- **Minimum regression:** Idempotent sync, audit log per row, rollback reference, duplicate prevention, no partial writes.

### 6.7 Correction Memory / Learning Loop
- **Why critical:** Reduces manual review over time. Key to scaling beyond pilot.
- **What breaks if it fails:** Every upload requires full manual review forever.
- **Minimum regression:** Restaurant-scope rules captured on every correction, applied on subsequent uploads, user can undo learned rules.

### 6.8 Restaurant Pilot Rollout
- **Why critical:** First real-world validation with actual restaurant operators.
- **What breaks if it fails:** Product doesn't meet accuracy/speed targets, restaurants reject it.
- **Minimum regression:** Feature-flagged per restaurant, daily metrics review, hold-out accuracy >= targets, manual correction rate <= 25%.

---

## 7. High-Risk Files / Modules

### 7.1 Pipeline Scripts

| File | Risk | What depends on it | Required regression |
|---|---|---|---|
| `scripts/g7a_bootstrap_smoke.py` | HIGH -- drives all text extraction + Gemini calls | G7A output, G7B workbooks, dataset ground truth | Pre-flight check (`--preflight`), schema validation, cost cap enforcement |
| `scripts/g7b_build_review_workbook.py` | HIGH -- generates the Excel Sunil reviews | Sunil's review accuracy, G7B ingest | Output column names must match ingest script exactly |
| `scripts/g7b_ingest_review_workbook.py` | HIGH -- converts Sunil's reviewed Excel to JSON | Expected-output ground truth, dataset freeze | Column validation, Action value validation |

### 7.2 Dataset Folders

| Path | Risk | Rule |
|---|---|---|
| `datasets/menus_raw/v0.1.0-PROPOSED/` | HIGH -- source of truth for all evaluation | **Never delete, rename, or modify PDFs.** Rename to `v0.1.0/` only at freeze. |

### 7.3 Generated Artifacts

| Path | Risk | Rule |
|---|---|---|
| `scripts/_g7b_review/*.xlsx` | CRITICAL -- Sunil will edit these | **Never overwrite after generation.** After Sunil reviews, these are evidence. |
| `memory/menu-import/MENU_AI_FIRST_PASS_OUTPUT_SMOKE_v0.1.0.json` | HIGH -- immutable first-pass archive | **Never modify.** G7B review compares against this. |
| `scripts/_g7a_staging/` | MEDIUM -- regenerable build artifacts | Can be regenerated from source PDFs, but log files are useful for audit. |

### 7.4 Gemini Prompt / Schema Files

| File | Risk | Rule |
|---|---|---|
| `memory/menu-import/GEMINI_MENU_EXTRACTION_JSON_SCHEMA.json` | HIGH -- defines extraction output structure | Any change invalidates all prior extractions. Version bump required. |
| `memory/menu-import/GEMINI_MENU_EXTRACTION_PROMPT_TEMPLATE.md` | HIGH -- drives extraction quality | Versioned as `extract-v1`. Changes require accuracy regression. |

### 7.5 Gate / Decision Docs

| File | Risk | Rule |
|---|---|---|
| `memory/menu-import/PRODUCTION_GRADE_OWNER_DECISION_SHEET.md` | HIGH -- gates all implementation | Sign-off table is empty. No implementation before sign-off. |
| `memory/menu-import/PHASE_0_DECISION_LOG.md` | HIGH -- contains security incident record | Section 2: leaked service account key. Do not expose. |

### 7.6 POS API Docs

| File | Risk | Rule |
|---|---|---|
| `memory/menu-import/POS_MENU_API_OPENAPI_DRAFT.yaml` | MEDIUM -- proposed, not confirmed | Every field is marked TODO. Do not implement sync against this without POS team confirmation. |

---

## 8. Gate / CR / Decision Status

### 8.1 Gate Status

| Gate | Document | Version | Status |
|---|---|---|---|
| Gate 1 -- Requirements | `MENU_IMPORT_MVP_REQUIREMENTS.md` | v2.0 | **PENDING** owner sign-off |
| Gate 2 -- Architecture + Workflow | `_ARCHITECTURE.md` + `_WORKFLOW.md` | v2.0 | **PENDING** owner sign-off |
| Gate 3 -- DB Schema | `_DB_SCHEMA.md` | v2.0 | **PENDING** owner sign-off |
| Gate 4 -- API Contract | `_API_CONTRACT.md` | v2.0 | **PENDING** owner sign-off |
| Gate 5 -- Review UI | `_REVIEW_UI_SPEC.md` | v2.0 | **PENDING** owner sign-off |
| Gate 6 -- Learning Memory | `_LEARNING_MEMORY_SPEC.md` | v2.0 | **PENDING** owner sign-off |
| Gate 7 -- Implementation Phases | `_IMPLEMENTATION_PHASES.md` | v2.0 | **PENDING** owner sign-off |

**Zero gates are signed off.**

### 8.2 Closed Decisions

| ID | Decision | Source |
|---|---|---|
| D-1/P0-5 | Gemini SDK pin: gemini-3.1-pro primary, gemini-3-flash fallback | `PHASE_0_DECISION_LOG.md` |
| D-6 | Cost cap: "free -- our own POS product" (defensive ceilings retained) | `PHASE_0_DECISION_LOG.md` |
| D-7 | Stack: **Path A -- Python + FastAPI + emergentintegrations** | `PHASE_0_DECISION_LOG.md` |
| G-4 | S3 region: parked; local PVC only in Phase 1 | `PRODUCTION_GRADE_OWNER_DECISION_SHEET.md` |
| H-3 | Dataset size: 30 menus, agent picks, stratified 10/10/5/5 | `PHASE_0_DECISION_LOG.md` |
| H-4 | Primary reviewer: Sunil | `PHASE_0_DECISION_LOG.md` |
| H-5 | Storage: local Phase 1, S3 deferred | `PHASE_0_DECISION_LOG.md` |
| H-11 | Dataset upload: zip-via-chat, one-shot | `PHASE_0_DECISION_LOG.md` |

### 8.3 POS-Blocked Decisions

| ID | Question | Blocked by |
|---|---|---|
| B-1 | POS Menu API exact contract | POS team confirmation |
| B-2 | POS delete/archive support (rollback mode) | POS team confirmation |
| B-3 | POS bulk endpoints | POS team confirmation |
| B-5 | `cuisine_type` source per restaurant | POS team + Product |

### 8.4 Pending Owner Actions

| Action | Impact |
|---|---|
| Sign Gates 1-7 | Unblocks Build Phase 1 |
| Confirm or waive second reviewer | Currently only Sunil |
| Confirm leaked service account key revocation | Security hygiene |
| Reconcile stack contradiction in docs | Prevents wrong scaffold |

---

## 9. Dataset Status

| Field | Value |
|---|---|
| Dataset version | `v0.1.0` |
| State | **PROPOSED -- NOT FROZEN** |
| Folder suffix | `-PROPOSED` (explicit "not frozen" signal) |
| Total PDF files | 33 |
| Batch folders | 7 (`batch-01` through `batch-07`) |
| Duplicate detected | 1 (MENU-v0.1.0-0031 = Makhna_menu.pdf in batch-07, duplicate of MENU-v0.1.0-0020 in batch-04) |
| Accepted unique files | 32 |
| Smoke Set (5 files) | MENU-v0.1.0-{0007, 0013, 0023, 0024, 0025} |
| G7A text/OCR build | **DONE** -- 23 pages, 46249 chars, 17 payloads |
| G7A Gemini first-pass | **DONE** -- 20 Gemini calls, $0.20 cost, all 5 passed schema v1.2 |
| G7A output archive | `MENU_AI_FIRST_PASS_OUTPUT_SMOKE_v0.1.0.json` (258 KB) |
| G7B review workbooks | **GENERATED** -- 5 Excel files, 412 total rows |
| G7B human review (Sunil) | **NOT STARTED** |
| Expected-output placeholders | File exists (`MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json`) with 32 entries, all `expected_pages: []` |
| Owner approval doc | Exists (`MENU_DATASET_OWNER_APPROVAL_STATUS_v0.1.0.md`) |
| `frozen_at` | **null** |
| Remaining 27 PDFs | Not processed (G7C-G7F gates pending G7B completion) |

### What is needed before freeze

1. Sunil completes G7B review of 5 Excel workbooks
2. Ingest script run: `python3 /app/scripts/g7b_ingest_review_workbook.py`
3. (Optional) Second reviewer or explicit waiver
4. Owner issues freeze command (Gate G9)
5. Folder renamed: `v0.1.0-PROPOSED/` to `v0.1.0/`
6. `frozen_at` set on all entries

---

## 10. API / Backend Contract

### 10.1 What Backend Exists Today

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/` | GET | Service banner |
| `/api/health` | GET | Liveness probe + Mongo ping |
| `/api/datasets/stats` | GET | Enumerate bundled menu PDFs by batch |
| `/api/status` | POST | Create StatusCheck record |
| `/api/status` | GET | List StatusCheck records |

**Total: 5 endpoints. All are status/health -- zero menu-import business logic.**

### 10.2 What API is Only Planned

Per `MENU_IMPORT_MVP_API_CONTRACT.md` (811 lines), 30 endpoints are specified under `/api/menu-imports/`:
- Upload, process, status, rows CRUD, approve, reject, mark-reviewed, source-crop, save-draft, cost, sync, retry, audit-log, rollback, dedup-preview, variant/addon patches, merge/convert/split, admin approval queue, export CSV.

**Zero of these are implemented.**

### 10.3 POS API Unknowns

- No POS Menu API exists in this repository
- `POS_MENU_API_OPENAPI_DRAFT.yaml` (897 lines) is a proposed contract with every field marked TODO
- POS team has not confirmed or revised it
- Build Phase 6 (Sync) is parked until confirmation

### 10.4 What Must Not Be Implemented

- Do not implement any of the 30 planned menu-import endpoints until Gates 1-7 are signed off
- Do not implement POS sync endpoints until POS team confirms the API contract
- Do not hard-code POS API details from the draft -- they are proposals only

---

## 11. Data / Storage / Runtime Rules

### Dataset Folder Rules
- **NEVER** delete, rename, or modify files in `datasets/menus_raw/v0.1.0-PROPOSED/`
- Folder rename (`-PROPOSED` removal) happens ONLY at freeze (Gate G9)
- New PDFs go into new batch folders; never replace existing files

### Generated Artifact Rules
- `scripts/_g7b_review/*.xlsx` -- **NEVER overwrite** after Sunil begins review
- `memory/menu-import/MENU_AI_FIRST_PASS_OUTPUT_SMOKE_v0.1.0.json` -- **immutable archive**
- `scripts/_g7a_staging/` -- regenerable from source PDFs; extraction logs are useful audit trail

### Excel Workbook Rules
- Column names must match exactly between `g7b_build_review_workbook.py` and `g7b_ingest_review_workbook.py`
- Sunil must not add/rename/delete columns or sheets
- Action values restricted to: `approve`, `edit`, `delete_hallucination`, `add_missing`, `unclear`, `out_of_scope`

### JSON Output Rules
- All Gemini outputs validated against `gemini-extract-schema-v1.2`
- Schema version tracked on every extraction
- Prompt version tracked on every extraction

### Learning Memory Rules (Phase 5+)
- 3 scopes: restaurant (Phase 1) > cuisine (Phase 2) > global (Phase 2 + admin approval)
- Anti-overfitting cap: 40% single-restaurant evidence share for cuisine promotion
- Price corrections: structural patterns only, never bare numerics
- Per-restaurant opt-out flag from Phase 1

### What Must Be Frozen Before Phase 1 or Phase 2
- Phase 1 (Foundation): Gates 1-7 signed off
- Phase 2 (Extraction): dataset v0.1.0 frozen + Phase 1 complete + Sunil's expected-output review done

---

## 12. Testing and QA Rules

### Current Tests

| Test | Location | Status |
|---|---|---|
| G7A pre-flight check | `g7a_bootstrap_smoke.py --preflight` | Passed |
| G7A text build | `g7a_bootstrap_smoke.py --build` | Passed (Run #1) |
| G7A Gemini first-pass | `g7a_bootstrap_smoke.py --call-gemini` | Passed (Run #2) |
| Backend API tests | `backend/tests/test_menu_automation_api.py` | 100% pass (6 tests) |
| Frontend screenshot test | Testing agent iteration 1 | 100% pass |
| BUG-042-B smoke test | `memory/bugs/BUG_042_B_SMOKE_SIGNOFF.md` | Passed |

### Pipeline Validation Tests
- Schema validation: every Gemini response checked against `gemini-extract-schema-v1.2`
- SHA-256 verification: PDFs checked against placeholder file before extraction
- Cost cap enforcement: per-run budget limit checked

### Workbook Review Validation
- Ingest script (`g7b_ingest_review_workbook.py`) validates:
  - Column header names match expected set
  - Action values are from allowed list
  - Corrected fields present when Action = `edit`

### Future Product QA (planned, not implemented)
- Tenant isolation tests (Sev-1 gate)
- File security tests
- Accuracy regression on prompt/normalizer changes
- Rollback tests
- Correction-reuse tests
- Production smoke tests
- Hold-out evaluation

---

## 13. Release and Deployment Rules

### Current Docker/Deployment Files

| File | Purpose | Status |
|---|---|---|
| `Dockerfile.backend` | Python 3.11 + uvicorn image | Exists, builds |
| `Dockerfile.frontend` | Multi-stage node:20 -> nginx:1.27 | Exists, not tested in prod |
| `docker-compose.yml` | mongo + backend + frontend | Exists with healthchecks |
| `nginx.conf` | SPA fallback + /api reverse proxy | Exists |

### What is Actually Deployed
- **Emergent preview only** -- supervisor-managed dev server
- No production deployment
- No CI/CD pipeline

### Version/Tag Convention
- **No release tags exist** on any branch
- **No semantic versioning** applied to the app
- Dataset has proposed version `v0.1.0` but it is not frozen
- Recommended: adopt `v0.1.0-rc.N` for pre-release, `v0.1.0` at dataset freeze

### Branch Status
- `main`: planning docs only (no datasets)
- `7-may`: datasets only (no planning docs)
- `12-may`: **consolidation branch** -- has everything
- Common ancestor: `26896ea` (Initial commit)
- Recommendation: declare `12-may` as canonical, merge to `main`, archive `7-may`

---

## 14. Project-Specific Do Not Do Rules

1. **Do NOT build product code** before Gates 1-7 are signed off by the owner
2. **Do NOT scaffold Node.js/NestJS/PostgreSQL** -- owner decision D-7 closed as Python/FastAPI. If docs say Node, that's stale.
3. **Do NOT run full dataset extraction** (all 33 PDFs) before G7B smoke review is complete and approved
4. **Do NOT freeze the dataset** before Sunil completes G7B review and owner issues Gate G9
5. **Do NOT sync to POS** before POS engineering team confirms the API contract
6. **Do NOT expose, reuse, or reference the leaked Google service account key** (`bug-intake@voice-bug-intake.iam.gserviceaccount.com`, key id `ad8c4a3...`). It must be revoked by the owner.
7. **Do NOT delete PDFs** from `datasets/menus_raw/v0.1.0-PROPOSED/`
8. **Do NOT delete or overwrite** the 5 Excel review workbooks in `scripts/_g7b_review/`
9. **Do NOT overwrite** `MENU_AI_FIRST_PASS_OUTPUT_SMOKE_v0.1.0.json` -- it is an immutable archive
10. **Do NOT assume Node/PostgreSQL** if owner decision says Python/FastAPI. Always check `PHASE_0_DECISION_LOG.md` D-7.
11. **Do NOT treat planning docs as approved** unless the owner sign-off exists in `PRODUCTION_GRADE_OWNER_DECISION_SHEET.md`
12. **Do NOT modify `GEMINI_MENU_EXTRACTION_JSON_SCHEMA.json`** without a version bump and re-validation of all prior extractions
13. **Do NOT call Gemini** on the remaining 27 PDFs before G7B smoke set review is done
14. **Do NOT create database tables/migrations** before the stack contradiction is resolved and the owner confirms Python+FastAPI or Node+PostgreSQL

---

## 15. Open Questions / Unknowns Needing Owner Confirmation

| # | Question | Impact | Blocking? |
|---|---|---|---|
| 1 | **Stack: Python/FastAPI or Node.js/NestJS?** D-7 says Python, architecture docs say Node. Which is authoritative? | Foundation agent will scaffold wrong stack | YES -- blocks Phase 1 |
| 2 | **Gates 1-7: When will owner sign off?** All specs are v2.0 draft. | All implementation blocked | YES -- blocks Phase 1 |
| 3 | **Sunil's G7B review: When will he start?** Workbooks generated, guide written. | Dataset freeze blocked | YES -- blocks Phase 0C completion |
| 4 | **Second reviewer: Nominate or waive?** H-4 recommends a second reviewer for Golden+Stress sets. | Affects Phase 1 Golden quality | MEDIUM |
| 5 | **POS Menu API: When will POS team respond?** Proposed OpenAPI draft sent. | Phase 6 Sync parked | YES -- blocks Phase 6 |
| 6 | **Leaked service account key: Has it been revoked?** Key id `ad8c4a3...` for `bug-intake@voice-bug-intake.iam`. | Security hygiene | SECURITY |
| 7 | **Database: PostgreSQL or MongoDB?** Existing code uses MongoDB. Spec docs describe PostgreSQL 14+. | Schema design and migrations | YES -- blocks Phase 1 |
| 8 | **Canonical branch: Is `12-may` the new `main`?** Three branches exist with different content. | Merge strategy needed | MEDIUM |
| 9 | **Cost cap value: Is "free" final or does Finance need to set a ceiling?** D-6 closed but defensive ceilings retained. | Gemini cost controls | LOW |
| 10 | **BUG-042-B: Can it be formally closed?** Smoke-tested and passed. Awaiting tracker close. | Bug hygiene | LOW |
