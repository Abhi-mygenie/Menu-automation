# MENU IMPORT — SYNC VALIDATION REPORT

> Read-only audit of the Emergent workspace against the ChatGPT planning thread's understanding.
> Generated: (this audit run)
> Workspace: `/app`
> Repo: `https://github.com/Abhi-mygenie/Menu-automation` · Branch: `7-may` · HEAD: `686d116`
> Mode: read-only. No code, schema, dataset, scripts, packages, or placeholders were modified.

---

## 1. Executive verdict

**OUT OF SYNC.**

The planning docs and the v0.1.0-PROPOSED dataset are present and consistent with the thread, but the entire G7A AI-assisted bootstrap activity (scripts, system tools, schema patches, run report, runbook, active plan) is **absent from this workspace**. The thread is describing work that has not been committed to this branch.

## 2. One-line current status

Workspace is at **"Phase 0C / planning + dataset frozen-as-PROPOSED"** state; **G7A bootstrap has not been initiated here** — no scripts, no OCR tooling, no schema patch, no run report.

---

## 3. Comparison table

| Area | ChatGPT-thread expected state | Actual workspace state | Match? | Evidence |
|---|---|---|---|---|
| Planning docs (core 8) | All present | 8 of 11 present; **3 missing** | PARTIAL | `ls /app/memory/menu-import/` — see Section 3a |
| Dataset present | `v0.1.0-PROPOSED`, 33 PDFs | `v0.1.0-PROPOSED`, 33 PDFs (7 batches) | YES | `find /app/datasets/menus_raw -name '*.pdf' \| wc -l → 33` |
| Dataset freeze status | NOT frozen (still PROPOSED) | Only `v0.1.0-PROPOSED/` exists, no frozen dir | YES | `ls /app/datasets/menus_raw/` |
| Placeholder JSON — count | 32 accepted entries | 32 entries | YES | `entries` length = 32 |
| Placeholder JSON — expected_pages | all `[]` | all `[]` (32/32) | YES | python check: `expected_pages non-empty: 0` |
| Placeholder JSON — `human_review_status = HUMAN_REVIEW_REQUIRED` | All entries | **Field does not exist** in the template (template_version 1.0). Reviewer-status is implicit (empty `expected_pages` + null aggregate counts). | NO (field naming mismatch) | Entry keys = `[instance_metadata, expected_pages, expected_aggregate_counts]` only |
| Placeholder JSON — `frozen_at = null` | All entries | **Field does not exist** at entry level | NO (field naming mismatch) | Same as above |
| Sunil review status | Not complete | Reviewer handoff docs present; no completed-review artifact found | YES | `MENU_DATASET_REVIEWER_HANDOFF_SUNIL_v0.1.0.md` present; no acceptance file |
| Golden split | Approved with owner amendments, Learning Memory trimmed to 12, second reviewer waived | Doc `MENU_GOLDEN_DATASET_SPLIT_v0.1.0_PROPOSED.md` present (not verified line-by-line) | LIKELY YES | File exists, ~13 KB |
| AI-assisted G7 workflow | Active for Smoke Set | **`AI_ASSISTED_G7_ACTIVE_PLAN_v0.1.0.md` is MISSING** | NO | Not in `ls` of menu-import |
| Smoke Set runbook | Should exist | **`SMOKE_SET_AI_BOOTSTRAP_RUNBOOK_v0.1.0.md` is MISSING** | NO | Not in `ls` of menu-import |
| G7A run report | Should exist (capturing runs #1–#4) | **`G7A_SMOKE_RUN_REPORT_v0.1.0.md` is MISSING** | NO | Not in `ls` of menu-import |
| Immutable first-pass archive | Should NOT exist yet | Not present | YES | `MENU_AI_FIRST_PASS_OUTPUT_SMOKE_v0.1.0.json` absent |
| Schema version | v1.1 (category_inferred patch applied), pending v1.2 patch (pages[].warnings) | **`$id` = `gemini-menu-extraction-v1.json`**; no `version` field; no `$meta.version` | NO | See Section 3b |
| Schema — `category_inferred` row-level field | "v1 → v1.1: added category_inferred issue compatibility" | Row schema has `issue_status` enum = `[clean, review_required, flagged_only_phase1]` — **no `category_inferred` row field/value**. The string `category_inferred_page_level` exists only inside the top-level `warnings` enum. | NO (no row-level patch) | Schema `$defs.Row.properties.issue_status` |
| Schema — `pages[].warnings` | Pending v1.2 patch to add | **NOT present.** `Page` properties are exactly `[page_number, rows, menu_notes]`. There is a top-level `warnings` array, but no per-page warnings. | YES — still pending | Schema `$defs.Page.properties` |
| `/app/scripts/g7a_bootstrap_smoke.py` | Exists; has pdftotext + tesseract pipeline, per-page chunking pending | **`/app/scripts/` directory does not exist** | NO | `ls /app/scripts/` → No such file or directory |
| Per-page chunking fallback | Pending approval/implementation | Not present (no script at all) | N/A (no script) | — |
| `pdftotext` / `pdfinfo` / `pdftoppm` | Installed | **All missing** (`command -v` returns empty; no `poppler-utils` package) | NO | `dpkg -l \| grep poppler` → empty |
| `tesseract-ocr` + eng/hin/tel langs | Installed | **Missing** (`command -v tesseract` → empty; no tesseract package) | NO | `dpkg -l \| grep tesseract` → empty |
| Backend / Frontend production code | Not started | Not started — only the setup dashboard (status check, datasets stats) in `backend/server.py`, generic dashboard in `frontend/src/App.js`. No `menu_import`, `extraction`, `gemini` references. | YES | `grep -nE 'menu_import\|gemini' /app/backend/server.py` → empty |
| POS sync (Phase 6) | Parked | Not started | YES | No POS sync code in backend |

### 3a. Doc presence detail (vs. requested list)
| Doc | Present? |
|---|---|
| `PRODUCTION_GRADE_APPROVAL_SUMMARY.md` | YES |
| `PHASE_0_DECISION_LOG.md` | YES |
| `MENU_DATASET_OWNER_APPROVAL_STATUS_v0.1.0.md` | YES |
| `MENU_GOLDEN_DATASET_SPLIT_v0.1.0_PROPOSED.md` | YES |
| `MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json` | YES |
| `AI_ASSISTED_G7_ACTIVE_PLAN_v0.1.0.md` | **NO** |
| `SMOKE_SET_AI_BOOTSTRAP_RUNBOOK_v0.1.0.md` | **NO** |
| `G7A_SMOKE_RUN_REPORT_v0.1.0.md` | **NO** |
| `GEMINI_MENU_EXTRACTION_JSON_SCHEMA.json` | YES (v1) |
| `GEMINI_MENU_EXTRACTION_PROMPT_TEMPLATE.md` | YES |
| `GEMINI_MENU_EXTRACTION_PLAYBOOK.md` | YES |

### 3b. Schema metadata (read-only)
- `$id`: `https://mygenie.local/schemas/gemini-menu-extraction-v1.json`
- `version`: not set
- `$meta.phase`: `Phase 1 Production Release`
- `$defs.Page.properties`: `page_number`, `rows`, `menu_notes` (no `warnings`)
- `$defs.Row.properties.issue_status.enum`: `clean`, `review_required`, `flagged_only_phase1`
- Top-level `properties.warnings.items.enum`: includes `category_inferred_page_level`, `safety_refusal`, `cost_cap_exceeded`, etc. — these are document-level warning codes, not the row-level `category_inferred` issue value referenced in the thread.

### 3c. Git history check
- HEAD: `686d116 auto-commit for f0bb17dc-d207-433b-8792-87648fd6121d`
- Commit messages are all generic `auto-commit ...` / `Auto-generated changes` / `Initial commit` — none reference `g7`, `smoke`, `tesseract`, or `bootstrap`. The G7A work has never been committed to `7-may`.

---

## 4. Current exact gate state

| Gate | State | Reasoning |
|---|---|---|
| **G6** (Dataset frozen-as-PROPOSED + owner-approved + placeholders templated) | ✅ MET | 33 PDFs, 32 accepted, placeholder template v1.0 present, owner-approval doc present |
| **G7A** (AI-assisted bootstrap on Smoke Set produces first-pass output, immutable archive written) | ❌ NOT STARTED in this workspace | No `g7a_bootstrap_smoke.py`, no tooling, no run report, no archive. (ChatGPT thread says 4 attempted runs — none of that is visible here.) |
| **G7B** (Human review of Smoke Set first pass → fills `expected_pages` for 5 IDs) | ❌ NOT REACHED | Cannot start until G7A produces output |
| **G7C** (Repeat AI-assisted bootstrap on Learning Memory Set) | ❌ NOT REACHED | — |
| **G7D** (Human review of Learning Memory Set) | ❌ NOT REACHED | — |
| **G7E** (Repeat AI-assisted bootstrap on Eval Hold-out) | ❌ NOT REACHED | — |
| **G7F** (Human review of Eval Hold-out → all placeholders concrete) | ❌ NOT REACHED | — |
| **G8** (Dataset freeze → v0.1.0 immutable) | ❌ NOT REACHED | Requires G7F complete |
| **G9** (Production code implementation against frozen dataset) | ❌ NOT STARTED | Backend/frontend still bootstrap-only |
| **G10** (POS sync) | ❌ PARKED | Per plan |

Current gate: **G7A — pending start** (in this workspace).

---

## 5. Current blocker

**Workspace divergence — the entire G7A bootstrap layer (scripts + system tools + schema patches + run logs) is missing from this branch.**

Specifically, before any further G7A action in *this* workspace, two distinct things have to happen:

1. **Source-of-truth reconciliation** — confirm whether the ChatGPT thread was tracking a different workspace/branch/agent, or whether the prior agent's G7A work was lost (not committed) on `7-may`.
2. **If we are continuing here:** the schema v1.2 patch (`pages[].warnings`), per-page chunking, OCR/poppler installs, and the `g7a_bootstrap_smoke.py` script all need to be (re-)created in this workspace.

Secondary blockers if/when work resumes:
- Schema mismatch: thread says "v1.2 proposed" but on-disk schema is still v1 with no `pages[].warnings` and no row-level `category_inferred` field.
- Per-page chunking: not implemented (and no script exists to host it).
- Tooling: `pdftotext`, `pdfinfo`, `pdftoppm`, `tesseract` (+ `tesseract-ocr-eng/hin/tel`) not installed in this container.

NOT blockers right now: budget, Sunil review, dataset freeze (those are downstream of G7A completion).

---

## 6. Exact next safe action (recommended single command for the owner)

**Owner decision required first** — confirm which of these is true:

- **(A)** "The G7A work in the ChatGPT thread happened in a *different* workspace; this `7-may` checkout is the canonical one and needs to receive that work."
  Next safe action (once owner confirms A):
  ```
  Re-bootstrap G7A in this workspace: install poppler-utils + tesseract (eng+hin+tel), patch schema v1 → v1.2 (add pages[].warnings, formalize category_inferred row-level value if intended), author /app/scripts/g7a_bootstrap_smoke.py with pdftotext-first → tesseract fallback → text-only Gemini payload + per-page chunking, and only then run G7A against the 5 Smoke Set IDs.
  ```

- **(B)** "The G7A work lives in another branch / another fork."
  Next safe action (once owner confirms B):
  ```
  Identify the branch/fork where /app/scripts/g7a_bootstrap_smoke.py, G7A_SMOKE_RUN_REPORT_v0.1.0.md, SMOKE_SET_AI_BOOTSTRAP_RUNBOOK_v0.1.0.md, and AI_ASSISTED_G7_ACTIVE_PLAN_v0.1.0.md exist; either merge that branch into 7-may or switch to it before continuing.
  ```

Until the owner resolves A vs. B, **no extraction, no Gemini call, no schema mutation, no script creation, no apt install** — exactly as instructed for this audit.

---

## 7. Risks / mismatches (everything that differs from the thread)

1. **G7A artifacts entirely absent.** The thread asserts 4 attempted runs with specific halt reasons (0007 502s, 0023/0013 schema-validation failures, 0024/0025 not reached). None of those run logs, archives, or scripts exist in this workspace. We cannot independently verify the halt reasons described.
2. **Schema is still v1 on disk.** No `version: "1.1"` or `version: "1.2"` marker; no `pages[].warnings` field; no row-level `category_inferred` issue value. The thread's "v1 → v1.1 added, v1.2 proposed" narrative is not reflected in the file.
3. **`category_inferred` exists only as a *page-level warning* code (`category_inferred_page_level`)**, not as a row-level `issue_status` value. If the thread meant the row-level field, that patch was never applied.
4. **Placeholder schema mismatch with thread vocabulary.** The thread talks about `human_review_status = HUMAN_REVIEW_REQUIRED` and `frozen_at = null` on each entry. The on-disk template (v1.0) does not contain these fields at all — review status is *implicit* in empty `expected_pages` + null `expected_aggregate_counts`. The semantic invariant ("nothing has been filled in yet, nothing frozen") holds, but the literal field names do not.
5. **No `/app/scripts/` directory.** This breaks the assumption that `g7a_bootstrap_smoke.py` exists and was iteratively patched across runs.
6. **No OCR/PDF tooling installed.** `dpkg -l | grep -E 'poppler|tesseract'` returns nothing. None of `pdftotext`, `pdfinfo`, `pdftoppm`, `tesseract` are on `PATH`.
7. **Git history is opaque.** All commits are `auto-commit` / `Auto-generated changes`. No commit references G7A activity, so we cannot tell whether scripts were ever present and reverted, or never existed here.
8. **Production code unchanged.** Backend is the minimal status/datasets dashboard. No `menu_import` API surface, no extraction service, no POS sync — consistent with the thread (Phase 1 implementation not started), but worth noting alongside item 1 for completeness.

---

_End of audit. No mutations were performed during this run._
