# RT-G3: Review Tool — Deep Implementation Plan

**Date:** 2026-07-01
**Gate:** RT-G3 (Deep Planning)
**Status:** COMPLETE — ready for implementation
**Previous gates:** RT-G1 (Discovery) ✅ · RT-G2 (Mockups) ✅ owner-approved
**Next step:** Implementation agent picks up Phase A and works sequentially through Phase E

---

## 0. Scope Reminder (locked at RT-G1/RT-G2)

| In scope | Out of scope |
|---|---|
| Review + correct + approve rows and notes | POS sync |
| pdf.js page-by-page PDF rendering | Gemini calls / re-extraction |
| MongoDB corrections storage | New PDF uploads |
| Smoke set only (5 PDFs, 412 rows, 17 notes) | Variants / add-ons detail |
| Export corrected JSON | Authentication |

---

## 1. Data Available (what the backend already has)

### 1.1 AI Archive (read-only, never modified)

**File:** `/app/memory/menu-import/MENU_AI_FIRST_PASS_OUTPUT_SMOKE_v0.1.0.json`
**Size:** 258 KB

Top-level structure:
```
archive
  ├── documents[]           ← 5 documents (one per PDF)
  │     ├── import_id       e.g. "smoke-MENU-v0.1.0-0013"
  │     ├── source_file     e.g. "Akula Organics.pdf"
  │     ├── warnings[]      doc-level warnings
  │     ├── extraction_summary
  │     └── pages[]
  │           ├── page_number
  │           ├── warnings[]
  │           ├── menu_notes[]
  │           │     ├── note_text
  │           │     ├── note_type   (tax_note | service_charge_note | packaging_note |
  │           │     │                addon_note | availability_note | general_note)
  │           │     ├── tax_note_warning  (bool)
  │           │     └── confidence  (high | medium | low)
  │           └── rows[]
  │                 ├── row_no
  │                 ├── item_name
  │                 ├── category
  │                 ├── rate        (number)
  │                 ├── currency    ("INR")
  │                 ├── raw_text    (verbatim OCR source — provenance)
  │                 ├── confidence  (high | medium | low)
  │                 ├── issue_status (clean | review_required | flagged_only_phase1 |
  │                 │                 category_inferred)
  │                 ├── source_grounded  (bool)
  │                 ├── variant_warning  (bool)
  │                 ├── addon_warning    (bool)
  │                 ├── tax_note_warning (bool)
  │                 └── notes       (free text)
```

### 1.2 Smoke Set — Document Summary

| dataset_id | source_file | pages | rows | notes | doc warnings |
|---|---|---|---|---|---|
| smoke-MENU-v0.1.0-0007 | Ghatkesar family dhaba.pdf | 13 | 126 | 0 | empty_page, ocr_unreadable |
| smoke-MENU-v0.1.0-0013 | Akula Organics.pdf | 4 | 74 | 7 | none |
| smoke-MENU-v0.1.0-0023 | sona chadi.pdf | 1 | 42 | 0 | mixed_language, ocr_unreadable |
| smoke-MENU-v0.1.0-0024 | south indian dishes.pdf | 3 | 93 | 5 | none |
| smoke-MENU-v0.1.0-0025 | spicy.pdf | 2 | 77 | 5 | none |
| **TOTAL** | | **23** | **412** | **17** | |

### 1.3 PDF Files Location

Source PDFs live in: `/app/datasets/menus_raw/v0.1.0-PROPOSED/`
Spread across batch-01 through batch-07 subdirectories.
The backend must **walk this directory tree** to locate a PDF by filename.
PDFs are read-only — never modified.

---

## 2. MongoDB Collections (new — additive only)

### 2.1 `menu_reviews`

One document per review session per PDF. Created when reviewer first opens a document.

```python
{
  "id":            str,       # uuid4 — primary key
  "dataset_id":    str,       # e.g. "smoke-MENU-v0.1.0-0013"
  "source_file":   str,       # e.g. "Akula Organics.pdf"
  "status":        str,       # "not_started" | "in_progress" | "complete"
  "total_rows":    int,       # from AI archive (immutable after creation)
  "total_notes":   int,       # from AI archive (immutable after creation)
  "current_page":  int,       # last page reviewer was on (1-indexed). Default 1.
  "started_at":    datetime | None,
  "completed_at":  datetime | None,
  "created_at":    datetime,
  "updated_at":    datetime
}
```

Index: `dataset_id` (unique — one active review per document for now)

### 2.2 `menu_review_corrections`

One document per row action. Upserted on every reviewer action (same row_no + dataset_id = update existing, not insert new).

```python
{
  "id":            str,       # uuid4
  "review_id":     str,       # ref → menu_reviews.id
  "dataset_id":    str,

  "correction_type": str,     # "row" | "note"

  # ── Row fields (correction_type == "row") ──────────────────
  "row_no":        int | None,
  "page_number":   int,
  "action":        str,       # "approve" | "edit" | "delete_hallucination"
                              #   | "add_missing" | "unclear" | "out_of_scope"

  # Snapshot of AI values at time of correction (for audit trail)
  "original_item_name":    str | None,
  "original_rate":         float | None,
  "original_category":     str | None,
  "original_issue_status": str | None,
  "original_raw_text":     str | None,

  # Only populated when action == "edit"
  "corrected_item_name":    str | None,
  "corrected_rate":         float | None,
  "corrected_category":     str | None,
  "corrected_issue_status": str | None,
  "reviewer_notes":         str | None,

  # Only populated when action == "add_missing"
  "is_manual_add":  bool,     # True for add_missing rows

  # ── Note fields (correction_type == "note") ─────────────────
  "note_index":    int | None,   # index within page's menu_notes array (0-based)
  "note_page":     int | None,
  "original_note_text":   str | None,
  "original_note_type":   str | None,
  "corrected_note_text":  str | None,

  "created_at":    datetime,
  "updated_at":    datetime
}
```

Compound index: `(dataset_id, correction_type, row_no)` — for fast upsert lookup on rows.
Compound index: `(dataset_id, correction_type, note_index, note_page)` — for note upserts.

---

## 3. Backend API — 9 New Endpoints

All under prefix `/api/menu-review/`. Additive — existing endpoints untouched.

### Endpoint Reference Table

| # | Method | Path | Purpose |
|---|---|---|---|
| 1 | GET | `/api/menu-review/documents` | List all 5 documents with review status + progress |
| 2 | GET | `/api/menu-review/documents/{dataset_id}` | Full document data (rows + notes, all pages) |
| 3 | GET | `/api/menu-review/documents/{dataset_id}/pdf` | Serve raw PDF binary for pdf.js |
| 4 | POST | `/api/menu-review/documents/{dataset_id}/start` | Create/activate review session |
| 5 | POST | `/api/menu-review/corrections` | Save a row correction (upsert) |
| 6 | POST | `/api/menu-review/note-corrections` | Save a note correction (upsert) |
| 7 | GET | `/api/menu-review/documents/{dataset_id}/progress` | Detailed progress stats |
| 8 | POST | `/api/menu-review/documents/{dataset_id}/complete` | Mark review as complete |
| 9 | GET | `/api/menu-review/documents/{dataset_id}/export` | Download corrected JSON |

---

### Endpoint 1 — GET `/api/menu-review/documents`

**Purpose:** Powers the S1 Landing page card grid.

**Logic:**
1. Read all 5 documents from the in-memory AI archive.
2. For each document, look up its `menu_reviews` record in MongoDB (may not exist yet — default to `not_started`).
3. Count corrections per document from `menu_review_corrections`.
4. Return merged summary.

**Response shape:**
```json
[
  {
    "dataset_id": "smoke-MENU-v0.1.0-0013",
    "source_file": "Akula Organics.pdf",
    "pages": 4,
    "total_rows": 74,
    "total_notes": 7,
    "doc_warnings": [],
    "status": "not_started",
    "rows_reviewed": 0,
    "rows_approved": 0,
    "rows_edited": 0,
    "rows_deleted": 0,
    "rows_unclear": 0,
    "rows_out_of_scope": 0,
    "notes_reviewed": 0,
    "progress_pct": 0,
    "started_at": null,
    "completed_at": null
  }
]
```

---

### Endpoint 2 — GET `/api/menu-review/documents/{dataset_id}`

**Purpose:** Loads the full workspace data when reviewer opens a PDF.

**Logic:**
1. Find document in AI archive by `dataset_id`.
2. Fetch all corrections for this document from `menu_review_corrections`.
3. For each row, attach its correction record if one exists (`action`, corrected fields, `reviewer_notes`).
4. For each note, attach its correction record if one exists.
5. Return structured by pages.

**Response shape:**
```json
{
  "dataset_id": "smoke-MENU-v0.1.0-0013",
  "source_file": "Akula Organics.pdf",
  "total_pages": 4,
  "total_rows": 74,
  "total_notes": 7,
  "doc_warnings": [],
  "status": "in_progress",
  "current_page": 2,
  "pages": [
    {
      "page_number": 1,
      "page_warnings": [],
      "rows": [
        {
          "row_no": 1,
          "item_name": "Paneer Tikka",
          "category": "Starters",
          "rate": 180,
          "currency": "INR",
          "raw_text": "Paneer Tikka 180",
          "confidence": "high",
          "issue_status": "clean",
          "source_grounded": true,
          "variant_warning": false,
          "addon_warning": false,
          "tax_note_warning": false,
          "notes": null,
          "correction": {
            "action": "approve",
            "corrected_item_name": null,
            "corrected_rate": null,
            "corrected_category": null,
            "reviewer_notes": null
          }
        }
      ],
      "menu_notes": [
        {
          "note_index": 0,
          "note_text": "Fresh food takes time! Please allow at least 15 minutes...",
          "note_type": "general_note",
          "confidence": "high",
          "tax_note_warning": false,
          "correction": null
        }
      ]
    }
  ]
}
```

---

### Endpoint 3 — GET `/api/menu-review/documents/{dataset_id}/pdf`

**Purpose:** Serve the raw PDF binary so pdf.js can render it in the browser.

**Logic:**
1. Look up `source_file` for this `dataset_id` from the AI archive.
2. Walk `/app/datasets/menus_raw/v0.1.0-PROPOSED/` recursively to find the file by name.
3. Return file with `Content-Type: application/pdf` and `Content-Disposition: inline`.

**Response:** Raw PDF bytes.
**Error:** 404 if file not found on disk.

> Note: No authentication, no signed URLs (not needed for Review Tool v1). PDF is served directly.

---

### Endpoint 4 — POST `/api/menu-review/documents/{dataset_id}/start`

**Purpose:** Called when reviewer clicks "Start Review" or "Continue Review" on a card.

**Logic:**
1. Check if a `menu_reviews` record exists for this `dataset_id`.
2. If not: create it with `status=in_progress`, `started_at=now`, `total_rows` and `total_notes` from AI archive.
3. If exists and `status=not_started`: update to `in_progress`, set `started_at=now`.
4. If `status=in_progress` or `complete`: return existing record as-is (idempotent).

**Response:** The `menu_reviews` record.

---

### Endpoint 5 — POST `/api/menu-review/corrections`

**Purpose:** Called on every row action (approve / edit / delete / unclear / out-of-scope / add-missing).

**Request body:**
```json
{
  "dataset_id": "smoke-MENU-v0.1.0-0013",
  "row_no": 3,
  "page_number": 1,
  "action": "edit",
  "original_item_name": "VEG MANCHURIYAN",
  "original_rate": 140,
  "original_category": "Chinese",
  "original_issue_status": "clean",
  "original_raw_text": "91523 VEG MANCHURIYAN 140 Chinese...",
  "corrected_item_name": "Veg Manchurian",
  "corrected_rate": null,
  "corrected_category": null,
  "corrected_issue_status": null,
  "reviewer_notes": "Fixed spelling"
}
```

**Logic:**
1. Look up `menu_reviews` for `dataset_id` → get `review_id`. If no review exists yet, auto-create it (treat as implicit start).
2. Upsert `menu_review_corrections`: match on `(dataset_id, correction_type="row", row_no)`. If found: update. If not: insert.
3. Update `menu_reviews.updated_at`.

**Response:** The upserted correction record.

---

### Endpoint 6 — POST `/api/menu-review/note-corrections`

**Purpose:** Called on every note action (approve / edit / delete / out-of-scope).

**Request body:**
```json
{
  "dataset_id": "smoke-MENU-v0.1.0-0013",
  "note_index": 1,
  "note_page": 1,
  "action": "approve",
  "original_note_text": "Takeaway packing charges ₹10/- per item.",
  "original_note_type": "packaging_note",
  "corrected_note_text": null
}
```

**Logic:** Same upsert pattern as Endpoint 5.
Match on `(dataset_id, correction_type="note", note_index, note_page)`.

**Response:** The upserted note correction record.

---

### Endpoint 7 — GET `/api/menu-review/documents/{dataset_id}/progress`

**Purpose:** Powers the S6 Progress tab.

**Logic:**
1. Get `total_rows` and `total_notes` from AI archive.
2. Get all corrections from `menu_review_corrections` for this `dataset_id`.
3. Count by action type overall and per page.
4. Compute `rows_remaining = total_rows - rows_with_any_correction`.

**Response shape:**
```json
{
  "dataset_id": "smoke-MENU-v0.1.0-0013",
  "total_rows": 74,
  "total_notes": 7,
  "rows_approved": 32,
  "rows_edited": 8,
  "rows_deleted": 5,
  "rows_unclear": 0,
  "rows_out_of_scope": 0,
  "rows_added": 2,
  "rows_reviewed": 47,
  "rows_remaining": 27,
  "progress_pct": 64,
  "notes_approved": 4,
  "notes_deleted": 1,
  "notes_out_of_scope": 0,
  "notes_reviewed": 5,
  "notes_remaining": 2,
  "per_page": [
    { "page_number": 1, "total": 18, "reviewed": 18, "complete": true },
    { "page_number": 2, "total": 20, "reviewed": 15, "complete": false },
    { "page_number": 3, "total": 18, "reviewed": 12, "complete": false },
    { "page_number": 4, "total": 18, "reviewed": 2,  "complete": false }
  ]
}
```

---

### Endpoint 8 — POST `/api/menu-review/documents/{dataset_id}/complete`

**Purpose:** Mark the review as complete. Called when "Complete & Export" button is clicked.

**Validation:**
- All rows must have a correction (no `rows_remaining > 0`).
- If any rows are `unclear`, return a 422 with `{ "code": "UNCLEAR_ROWS_REMAIN", "count": N }`.

**Logic:**
1. Run progress check.
2. If all rows actioned: update `menu_reviews.status = "complete"`, `completed_at = now`.
3. If `unclear` rows remain: allow completion anyway but include a warning in the response (reviewer chose to proceed with unclear items).

**Response:** Updated `menu_reviews` record.

---

### Endpoint 9 — GET `/api/menu-review/documents/{dataset_id}/export`

**Purpose:** Generate the corrected JSON file for download. Powers the S8 Export button.

**Logic:**
1. Load the original document from the AI archive.
2. Load all corrections from `menu_review_corrections` for this `dataset_id`.
3. Merge: for each row, apply corrections in order:
   - `delete_hallucination` → exclude from export
   - `edit` → replace fields with corrected values
   - `approve` / `unclear` / `out_of_scope` → include as-is (with action metadata)
   - `add_missing` → include as a new row with `source: "manual"`
4. For notes: apply same merge logic.
5. Return JSON with `Content-Disposition: attachment; filename="<dataset_id>_corrected.json"`.

**Export format:**
```json
{
  "export_version": "review-tool-v1",
  "dataset_id": "smoke-MENU-v0.1.0-0013",
  "source_file": "Akula Organics.pdf",
  "exported_at": "2026-07-01T...",
  "review_summary": {
    "total_original_rows": 74,
    "approved": 58,
    "edited": 11,
    "deleted": 3,
    "added": 2,
    "unclear": 0,
    "out_of_scope": 0,
    "final_row_count": 73
  },
  "pages": [
    {
      "page_number": 1,
      "rows": [...],        // final corrected rows
      "menu_notes": [...]   // final corrected notes
    }
  ]
}
```

---

## 4. Frontend — File Structure

New files only. Existing files touched minimally (App.js gets 2 new routes only).

```
frontend/src/
├── App.js                          ← ADD 2 routes only: /review and /review/:datasetId
├── pages/
│   └── review/
│       ├── ReviewLanding.jsx       S1 — landing page (document grid)
│       └── ReviewWorkspace.jsx     S2 — main workspace (split view shell + state manager)
└── components/
    └── review/
        ├── PDFCard.jsx             S1 — per-document card with progress bar
        ├── PDFViewer.jsx           pdf.js wrapper component
        ├── PageNavigation.jsx      S5 — prev/next/input + optional thumbnails
        ├── ReviewTable.jsx         S2 right panel — table of rows
        ├── ReviewRow.jsx           single row with action buttons
        ├── InlineEditor.jsx        S3 — edit form, shown in-place on a row
        ├── AddMissingRowModal.jsx  S4 — modal dialog for adding missed items
        ├── MenuNotesPanel.jsx      S7 — tab content: list of note cards
        ├── MenuNoteCard.jsx        single note with approve/edit/delete actions
        ├── ProgressPanel.jsx       S6 — tab content: progress stats
        ├── ExportModal.jsx         S8 — completion summary + export button
        ├── TableToolbar.jsx        search / filter / approve-all-clean / add-row button
        ├── ConfidenceBadge.jsx     reusable HIGH/MEDIUM/LOW badge
        └── ActionButtons.jsx       reusable row action button group
```

**Total new files: 16 (frontend) + backend changes to server.py**

---

## 5. Component Responsibilities

### ReviewLanding.jsx
- Fetches `GET /api/menu-review/documents` on mount
- Renders 5 PDFCard components in a responsive grid
- Shows overall review progress count (X/5 complete)
- Handles loading + error state

### PDFCard.jsx
- Props: document summary object
- Shows: filename, page count, row count, note count, progress bar, status badge
- Special badge: `OCR_LOW_CONFIDENCE` for sona chadi (has `ocr_unreadable` warning)
- CTA button: "Start Review" (not started) or "Continue Review" (in progress) or "View" (complete)
- On click: calls `POST /start` then navigates to `/review/:datasetId`

### ReviewWorkspace.jsx
- URL param: `datasetId`
- On mount: fetches `GET /documents/{id}` (full doc data)
- Holds state for: currentPage, activeTab, selectedRowNo
- Orchestrates: PDF viewer, table, tabs
- Uses `ResizablePanelGroup` from shadcn/ui

### PDFViewer.jsx
- Installs and uses `pdfjs-dist`
- PDF URL: `{BACKEND_URL}/api/menu-review/documents/{datasetId}/pdf`
- Renders one page at a time (not all pages)
- Props: pdfUrl, currentPage, totalPages, onPageChange
- Controls: zoom in/out, fit-to-width
- Behavior: re-renders when `currentPage` prop changes

### PageNavigation.jsx
- Prev / Next buttons
- Direct page number input (type number + Enter)
- Shows: `Page N of M`
- On page change: notifies ReviewWorkspace → triggers PDF re-render + table page filter

### ReviewTable.jsx
- Props: rows for current page (filtered from full doc), corrections map
- Columns: checkbox, row_no, item_name, category, rate, confidence, action buttons
- Row color coding: green left border = high, amber = medium, red = low confidence
- When a row has `correction.action` set: show the action badge (APPROVED / EDITED / etc.)
- Click on row: triggers PDF scroll hint (future enhancement, not blocking)

### ReviewRow.jsx
- Single row rendering
- If `isEditing`: renders InlineEditor instead of read-only cells
- Shows raw_text on hover/expand for provenance

### ActionButtons.jsx
- 5 icon buttons per row: ✓ Approve | ✎ Edit | ✕ Delete | ? Unclear | ⊘ Out-of-scope
- Each button calls the correction API and updates local state
- Already-actioned rows show the current action highlighted; can be changed

### InlineEditor.jsx
- Shown in-place when "Edit" is clicked on a row
- Fields: item_name (text), category (combobox), rate (number), issue_status (select), reviewer_notes (textarea)
- Shows original AI value in grey below each field
- Shows `raw_text` read-only at bottom for provenance
- Save → calls POST /corrections with action="edit" + corrected fields
- Cancel → reverts to read-only row view

### TableToolbar.jsx
- Search input: filters rows by item_name (client-side)
- Filter dropdown: by action status (All / Not reviewed / Approved / Edited / Deleted / Unclear)
- Confidence filter: All / High only / Low+Medium (needs review)
- "Approve All Clean" button: calls POST /corrections in batch for all rows where confidence=high AND issue_status=clean AND no blocking warnings AND not yet actioned
- "Add Row +" button: opens AddMissingRowModal

### AddMissingRowModal.jsx
- Dialog component (shadcn/ui Dialog)
- Fields: item_name (required), rate, category (combobox), page_number (select, defaults to current page), notes
- Category dropdown: populated from categories seen in this document
- On submit: calls POST /corrections with action="add_missing", is_manual_add=true

### MenuNotesPanel.jsx
- Renders for the "Menu Notes (N)" tab
- Groups notes by page
- Maps over pages, renders MenuNoteCard for each note

### MenuNoteCard.jsx
- Shows: note_text, note_type badge, confidence badge
- Warning highlight: amber/red border for notes where `tax_note_warning=true`
- These CANNOT be auto-approved via "Approve All Clean" — must be manually approved
- Action buttons: ✓ Approve | ✎ Edit text | ✕ Delete | ⊘ Out-of-scope
- Edit mode: text area replaces note_text (saves corrected_note_text)

### ProgressPanel.jsx
- Rendered in "Progress" tab
- Overall progress bar
- Per-action breakdown bars (approved / edited / deleted / unclear / remaining)
- Per-page table: page number, total rows, reviewed count, complete indicator

### ExportModal.jsx
- Dialog shown when "Complete & Export" is clicked
- If not all rows reviewed: shows count of remaining rows, asks to confirm
- If all reviewed: shows review summary stats + "Export Corrected JSON" button + "Back to Landing" button
- Export button: fetches `GET /documents/{id}/export` as a file download

---

## 6. State Management Approach

No Redux / Zustand needed. Local React state per component.

| State | Owned by | What it holds |
|---|---|---|
| `documents[]` | ReviewLanding | API response, refresh on nav back |
| `docData` | ReviewWorkspace | Full document from GET /documents/{id} |
| `corrections` | ReviewWorkspace | Map of `{row_no: correction_record}` — updated optimistically on each action |
| `noteCorrections` | ReviewWorkspace | Map of `{page_no-note_index: correction_record}` |
| `currentPage` | ReviewWorkspace | Currently viewed PDF page number |
| `activeTab` | ReviewWorkspace | "rows" | "notes" | "progress" |
| `editingRowNo` | ReviewWorkspace | Which row is in edit mode (null if none) |
| `filterStatus` | ReviewTable (via toolbar) | Current filter applied |
| `searchTerm` | ReviewTable (via toolbar) | Text search term |

**Optimistic updates:** When reviewer clicks Approve on a row, the UI updates instantly (action button highlights, row shows APPROVED badge) before the API call resolves. On API failure, revert with a toast notification.

---

## 7. pdf.js Integration Details

**Package to install:** `pdfjs-dist` (latest stable, client-side only)

**Worker setup:**
```
pdfjs-dist provides a web worker (pdf.worker.min.js) that must be pointed to.
With CRA/craco, copy it to /public or use a CDN URL.
Recommended: use the CDN worker URL to avoid bundling issues.
```

**Rendering approach:**
- Load PDF document from backend URL once
- Render one page at a time to a `<canvas>` element
- Page navigation triggers `pdfDoc.getPage(pageNum)` → `page.render()`
- Zoom: controlled via `scale` parameter (default 1.2, fit-width calculates from canvas width)
- No full PDF download until viewer is opened (streaming)

---

## 8. Design System (from RT-G2)

| Token | Value |
|---|---|
| Background | white `#FFFFFF` |
| Border | slate `1px solid #E2E8F0` |
| Accent / CTA | Klein Blue `#002FA7` |
| Approve / success | `#10B981` (green) |
| Delete / issue | `#E63946` (red) |
| Warning / unclear | `#FFB703` (amber) |
| Heading font | Cabinet Grotesk (load via @import or CDN) |
| Body / table font | IBM Plex Sans |
| Price / data font | IBM Plex Mono |
| Corners | Sharp (no `rounded-*` on cards/panels) |
| Layout | Technical grid, 1px separators, enterprise data tool feel |

**Confidence row coloring:**
- `high` → 2px green left border on row
- `medium` → 2px amber left border
- `low` → 2px red left border + light red row background tint

**tax_note_warning on notes:**
- Amber border + amber background tint on MenuNoteCard
- Cannot be auto-approved — enforce in UI and backend

---

## 9. Implementation Phases (Execution Order)

### Phase A — Backend Data Layer
**Deliverable:** All 9 API endpoints working, testable via curl. Zero frontend.

Tasks:
1. Load AI archive JSON into module-level constant at startup
2. Build `_find_pdf_path(source_file)` helper that walks datasets dir
3. Define Pydantic models for all request/response shapes
4. Implement all 9 endpoints in `server.py` (add to existing `api_router`)
5. Create MongoDB indexes on startup (`menu_reviews.dataset_id`, compound indexes on `menu_review_corrections`)
6. Verify all endpoints via curl

### Phase B — Landing Page (S1)
**Deliverable:** `/review` route shows 5 PDF cards with correct data.

Tasks:
1. Add `/review` and `/review/:datasetId` routes to `App.js`
2. Add "Review Tool" nav link on the home page header
3. Build `ReviewLanding.jsx` + `PDFCard.jsx`
4. Wire to `GET /api/menu-review/documents`
5. Progress bar shows 0% for all (nothing reviewed yet)

### Phase C — Workspace Shell + PDF Viewer (S2 structure + S5)
**Deliverable:** Opening a PDF shows the split layout with PDF rendering and page nav. No review actions yet.

Tasks:
1. Install `pdfjs-dist` via yarn
2. Build `ReviewWorkspace.jsx` shell with `ResizablePanelGroup`
3. Build `PDFViewer.jsx` (canvas rendering, zoom controls)
4. Build `PageNavigation.jsx`
5. Wire PDF endpoint: `GET /api/menu-review/documents/{id}/pdf`
6. Call `POST /start` when workspace mounts
7. Table area shows placeholder rows list (no actions yet)

### Phase D — Row Review (Core Loop)
**Deliverable:** Reviewer can approve / edit / delete / unclear / out-of-scope every row. Actions persist to MongoDB.

Tasks:
1. Build `ReviewTable.jsx` + `ReviewRow.jsx` with confidence color coding
2. Build `ActionButtons.jsx` (5 action buttons)
3. Build `InlineEditor.jsx` for edit action
4. Wire all row actions to `POST /api/menu-review/corrections`
5. Implement optimistic state updates (map in ReviewWorkspace)
6. Page sync: changing PDF page filters table to that page's rows
7. Build `TableToolbar.jsx`: search + filter by status + confidence filter
8. Implement "Approve All Clean" batch action

### Phase E — Notes, Progress, Export (S4, S6, S7, S8)
**Deliverable:** Full end-to-end review flow including notes, add missing, progress tracking, and export.

Tasks:
1. Build `MenuNotesPanel.jsx` + `MenuNoteCard.jsx` — wire to `POST /api/menu-review/note-corrections`
2. Build `AddMissingRowModal.jsx` — wire to `POST /api/menu-review/corrections` with `add_missing`
3. Build `ProgressPanel.jsx` — wire to `GET /api/menu-review/documents/{id}/progress`
4. Build `ExportModal.jsx` + complete flow — wire to `POST /complete` + `GET /export`
5. Add confirmation guard on `Complete & Export` if unclear rows remain

---

## 10. New Dependencies

### Frontend
| Package | Why | Install command |
|---|---|---|
| `pdfjs-dist` | pdf.js for in-browser PDF page rendering | `yarn add pdfjs-dist` |

No other new frontend packages needed. All shadcn/ui components, lucide-react, react-resizable-panels, axios, react-router-dom, framer-motion already installed.

### Backend
No new Python packages needed.
- `python-multipart` — already in requirements (not needed for PDF serve, but present)
- All FastAPI, motor, pydantic dependencies already present

---

## 11. Existing Files Touched

| File | Change | Risk |
|---|---|---|
| `backend/server.py` | Add ~200-250 lines: 9 new endpoints + models. Existing endpoints untouched. | LOW — additive only |
| `frontend/src/App.js` | Add 2 import lines + 2 `<Route>` elements in the existing BrowserRouter. | LOW — additive only |
| `frontend/package.json` | `yarn add pdfjs-dist` will add one entry | LOW |

**Zero other existing files are modified.**

---

## 12. Protected Files (do not touch)

| File | Rule |
|---|---|
| `memory/menu-import/MENU_AI_FIRST_PASS_OUTPUT_SMOKE_v0.1.0.json` | Immutable. Backend reads it, never writes to it. |
| `datasets/menus_raw/v0.1.0-PROPOSED/**` | Source PDFs. Read-only. Backend serves them, never modifies. |
| `scripts/_g7b_review/*.xlsx` | Excel workbooks. Not touched. |
| All other `memory/menu-import/*.md` docs | Planning docs. Not modified. |
| `frontend/src/components/ui/*` | shadcn components. Used as-is. |

---

## 13. Key Implementation Rules

1. **Archive is loaded once at startup** — not on every request. Module-level dict keyed by `dataset_id`.
2. **Corrections are upserted, not appended** — one correction per (dataset_id + row_no) or (dataset_id + note_index + note_page). Reviewer can change their mind; latest action wins.
3. **Tax-warning notes cannot be auto-approved** — enforce in the "Approve All Clean" logic (skip notes with `tax_note_warning=true`).
4. **Add-missing rows get `row_no = None`** — generate a stable ID for them using a counter or uuid suffix stored in the correction record.
5. **PDF file lookup must handle batch subdirectories** — `os.walk` across all batches, match on filename.
6. **Export merges archive + corrections** — archive is the base; corrections are applied on top. Deleted rows are excluded. Edited rows use corrected_ fields.
7. **Progress = corrections count, not document status** — a row is "reviewed" the moment any correction exists for it. Status=complete is separate (requires all rows to have a correction).
8. **No authentication in Review Tool v1** — no user_id on corrections. Reviewer field left as static `"sunil"` for now.
9. **data-testid on every interactive element** — required per platform conventions.
10. **Fonts** — Cabinet Grotesk and IBM Plex Sans must be loaded (Google Fonts CDN or @font-face in index.css).

---

## 14. Acceptance Criteria (what "done" looks like)

| Criterion | How to verify |
|---|---|
| Landing page shows 5 PDF cards with correct row/page/note counts | Open `/review`, compare counts to this document's table in §1.2 |
| PDF renders page-by-page with zoom and nav | Open any document, paginate through all pages |
| Reviewer can approve every row on a page | Approve all rows on page 1 of Akula Organics |
| Reviewer can edit item_name, rate, category and save | Edit row 3 of any doc, check MongoDB correction saved |
| Reviewer can delete a row | Mark a row delete_hallucination, verify it's excluded from export |
| Approve All Clean skips tax-warning notes | Trigger bulk approve, verify packaging_note rows not auto-approved |
| Add missing row appears in export | Add a row, export, verify it appears with is_manual_add=true |
| Menu Notes tab shows all 7 notes for Akula Organics | Open doc, click Notes tab |
| All 5 notes with tax_note_warning=true show amber highlight | Check sona chadi notes (none) and south indian dishes packaging notes (3 pages) |
| Progress tab shows correct per-page breakdown | Review some rows, check progress tab counts |
| Export JSON passes schema validation | Download export, check structure against §9 of this doc |
| Existing `/` dashboard is completely unaffected | Open `/`, verify all 3 status pills still green |
| All corrections survive a backend restart | Save corrections, restart backend, reopen doc |

---

*RT-G3 Deep Implementation Plan — COMPLETE.*
*Implementation agent: start with Phase A (backend). Each phase is independently testable before proceeding to the next.*
