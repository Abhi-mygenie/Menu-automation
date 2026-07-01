# File Ownership -- MyGenie Menu Automation

**Last updated:** 2026-06-27
**Purpose:** Track which files are touched by which agent/person and flag files requiring special care.

---

## How to Record

When any agent or person modifies a file, add an entry below with:
- File path
- Modified by
- Date
- What changed
- Review required (yes/no)

---

## Special Caution Files

These files require extra care. Modifications to these files have outsized impact.

| File | Owner | Caution level | Rule |
|---|---|---|---|
| `scripts/g7a_bootstrap_smoke.py` | Pipeline agent | HIGH | Changes affect all extraction outputs. Re-run preflight + build after any change. |
| `scripts/g7b_build_review_workbook.py` | Pipeline agent | HIGH | Column changes break ingest script. |
| `scripts/g7b_ingest_review_workbook.py` | Pipeline agent | HIGH | Must match workbook column names exactly. |
| `scripts/_g7b_review/*.xlsx` | Sunil (reviewer) | CRITICAL | Never overwrite after generation. After Sunil reviews, these are evidence. |
| `memory/menu-import/MENU_AI_FIRST_PASS_OUTPUT_SMOKE_v0.1.0.json` | Immutable | CRITICAL | Never modify. Immutable archive. |
| `memory/menu-import/GEMINI_MENU_EXTRACTION_JSON_SCHEMA.json` | Pipeline agent | HIGH | Version bump required for any change. |
| `memory/menu-import/GEMINI_MENU_EXTRACTION_PROMPT_TEMPLATE.md` | Pipeline agent | HIGH | Versioned as extract-v1. Changes require accuracy regression. |
| `memory/menu-import/PRODUCTION_GRADE_OWNER_DECISION_SHEET.md` | Owner | HIGH | Sign-off table gates all implementation. |
| `memory/menu-import/PHASE_0_DECISION_LOG.md` | Owner | HIGH | Contains security incident record (section 2). |
| `datasets/menus_raw/v0.1.0-PROPOSED/**` | Owner | HIGH | Never delete or modify. Rename folder only at freeze. |
| `backend/.env` | Infra | MEDIUM | Contains MONGO_URL, DB_NAME. Never commit secrets. |
| `frontend/.env` | Infra | MEDIUM | Contains REACT_APP_BACKEND_URL. Environment-specific. |

---

## Modification Log

| Date | File | Modified by | What changed |
|---|---|---|---|
| 2026-06-27 | `/app/backend/server.py` | Deployment agent | Copied from 12-may repo (no changes to content) |
| 2026-06-27 | `/app/frontend/src/App.js` | Deployment agent | Copied from 12-may repo (no changes to content) |
| 2026-06-27 | `/app/frontend/craco.config.js` | Deployment agent | Made devServer function conditional (WDS v5 compat fix) |
| 2026-06-27 | `/app/backend/.env` | Deployment agent | Added DATASETS_DIR=/app/datasets |
| 2026-06-27 | `/app/memory/` (all control files) | Discovery agent | Created control directory structure and bootstrap docs |
| 2026-07-01 | `/app/backend/server.py` | E1 | Added all Phase A–E endpoints (menu-review routes, corrections, export) |
| 2026-07-01 | `/app/frontend/src/App.js` | E1 | Added /review and /review/:datasetId routes |
| 2026-07-01 | `/app/frontend/src/pages/review/ReviewLanding.jsx` | E1 | Created (Phase B) |
| 2026-07-01 | `/app/frontend/src/pages/review/ReviewWorkspace.jsx` | E1 | Created (Phase C–E) |
| 2026-07-01 | `/app/frontend/src/components/review/PDFViewer.jsx` | E1 | Created (Phase C) |
| 2026-07-01 | `/app/frontend/src/components/review/PageNavigation.jsx` | E1 | Created (Phase C) |
| 2026-07-01 | `/app/frontend/src/components/review/ReviewTable.jsx` | E1 | Created (Phase D) |
| 2026-07-01 | `/app/frontend/src/components/review/ActionButtons.jsx` | E1 | Created (Phase D) |
| 2026-07-01 | `/app/frontend/src/components/review/InlineEditor.jsx` | E1 | Created (Phase D) |
| 2026-07-01 | `/app/frontend/src/components/review/TableToolbar.jsx` | E1 | Created (Phase D) |
| 2026-07-01 | `/app/frontend/src/components/review/MenuNotesPanel.jsx` | E1 | Created (Phase E) |
| 2026-07-01 | `/app/frontend/src/components/review/MenuNoteCard.jsx` | E1 | Created (Phase E) |
| 2026-07-01 | `/app/frontend/src/components/review/AddMissingRowModal.jsx` | E1 | Created (Phase E) |
| 2026-07-01 | `/app/frontend/src/components/review/ExportModal.jsx` | E1 | Created (Phase E) — pending CR-MENU-0001 diff view enhancement |
| 2026-07-01 | `/app/memory/control/CR_STATUS_DASHBOARD.md` | E1 | Registered CR-MENU-0001 |
| 2026-07-01 | `/app/memory/control/REGISTRY.json` | E1 | Added CR-MENU-0001 entry |
| 2026-07-01 | `/app/memory/change_requests/CR-MENU-0001.md` | E1 | Created — full discovery + impact analysis |
| 2026-07-01 | `/app/memory/change_requests/CR-MENU-0002.md` | E1 | Created — follow-on CR for note corrections in diff view |
| 2026-07-01 | `/app/memory/control/CR-MENU-0001-IMPLEMENTATION-PLAN.md` | E1 | Created — detailed implementation plan for CR-MENU-0001 |
