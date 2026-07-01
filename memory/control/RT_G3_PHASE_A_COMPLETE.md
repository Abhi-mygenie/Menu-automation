# RT-G3 Phase A — Backend Complete

**Date:** 2026-07-01
**Status:** COMPLETE — all 9 endpoints verified

## What was built

Added ~350 lines to `/app/backend/server.py` (additive only — zero changes to existing endpoints).

### New endpoints (all under `/api/menu-review/`)

| # | Method | Path | Status |
|---|---|---|---|
| 1 | GET | `/documents` | ✅ Verified |
| 2 | GET | `/documents/{id}` | ✅ Verified |
| 3 | GET | `/documents/{id}/pdf` | ✅ Verified — all 5 PDFs serving |
| 4 | POST | `/documents/{id}/start` | ✅ Verified |
| 5 | POST | `/corrections` | ✅ Verified |
| 6 | POST | `/note-corrections` | ✅ Verified |
| 7 | GET | `/documents/{id}/progress` | ✅ Verified |
| 8 | POST | `/documents/{id}/complete` | ✅ Verified |
| 9 | GET | `/documents/{id}/export` | ✅ Verified |
| +1 | PATCH | `/documents/{id}/page` | ✅ Bonus — current page tracker |

### New MongoDB collections
- `menu_reviews` — one per document, tracks status / progress
- `menu_review_corrections` — one per (dataset_id + page_number + row_no) for rows, or (dataset_id + note_page + note_index) for notes

### Critical design note
Row numbers (`row_no`) are **page-local in the archive** — row 1 exists on every page.
Correction records are keyed by `(dataset_id, page_number, row_no)` — NOT just `row_no`.
The `_get_corrections()` helper returns a dict keyed by `"{page_number}-{row_no}"`.

## Next: Phase B
Build `/review` landing page frontend (ReviewLanding.jsx + PDFCard.jsx).
