# RT-G1: Review Tool — Discovery + Impact Analysis

**Date:** 2026-06-27
**Gate:** RT-G1 (Discovery + Impact Analysis)
**Status:** COMPLETE — awaiting owner review
**Next gate:** RT-G2 (Mockup + Flow Approval) — owner must approve before proceeding

---

## PART 1: DISCOVERY

### 1.1 What We're Building

A **web-based Menu Review & Correction Tool** that replaces the current Excel-based workflow. It lets a reviewer (Sunil or any team member) open a restaurant menu PDF side-by-side with the AI-extracted items, approve/correct/delete rows, and capture every correction as structured data that feeds into the learning system.

**This is NOT the full production system.** It is the **Review Tool only** — the critical piece that enables:
- Human review of AI extraction output
- Structured correction capture (replaces Excel)
- Ground truth creation for dataset freeze
- Foundation for learning memory

### 1.2 What Data Already Exists (Ready to Use)

| Data | File | Records | Ready? |
|---|---|---|---|
| AI extraction output (5 smoke PDFs) | `MENU_AI_FIRST_PASS_OUTPUT_SMOKE_v0.1.0.json` | 5 documents, 23 pages, 412 rows, 17 menu notes | YES |
| Source PDFs | `datasets/menus_raw/v0.1.0-PROPOSED/batch-*/` | 33 files (5 in smoke set) | YES |
| Extraction metadata (per-page OCR details) | `scripts/_g7a_staging/extraction_log/*.json` | 5 files, 23 pages | YES |
| Gemini extraction schema | `GEMINI_MENU_EXTRACTION_JSON_SCHEMA.json` | v1.2, 362 lines | YES |

### 1.3 AI Extraction Output Structure (verified from file)

Each document in the archive has:

```
document
  ├── import_id, source_file, model_metadata
  ├── warnings[]          (doc-level: "empty_page", "ocr_unreadable", "mixed_language_detected")
  ├── extraction_summary
  └── pages[]
       ├── page_number
       ├── warnings[]     (page-level: "chunked_page_partial_context", "category_inferred_page_level")
       ├── menu_notes[]   (note_text, note_type, tax_note_warning, confidence)
       └── rows[]
            ├── row_no
            ├── category
            ├── item_name
            ├── rate (number)
            ├── currency ("INR")
            ├── raw_text (verbatim source text — the provenance link)
            ├── confidence ("high" / "medium" / "low")
            ├── issue_status ("clean" / "review_required" / "flagged_only_phase1" / "category_inferred")
            ├── source_grounded (boolean)
            ├── source_bbox (null for text-mode extractions)
            ├── variant_warning (boolean)
            ├── addon_warning (boolean)
            ├── tax_note_warning (boolean)
            └── notes (free text)
```

### 1.4 Per-Document Summary (Smoke Set)

| dataset_id | Source PDF | Pages | Rows | Menu Notes | Doc Warnings | Special |
|---|---|---|---|---|---|---|
| MENU-v0.1.0-0007 | Ghatkesar family dhaba.pdf | 13 | 126 | 0 | `empty_page`, `ocr_unreadable` | 13-chunk extraction; all pages have `chunked_page_partial_context` |
| MENU-v0.1.0-0013 | Akula Organics.pdf | 4 | 74 | 7 | none | Cleanest input |
| MENU-v0.1.0-0023 | sona chadi.pdf | 1 | 42 | 0 | `mixed_language_detected`, `ocr_unreadable`, `no_source_grounding_page_level` | Noisiest. Mixed Marathi/Telugu/English. High hallucination expected. |
| MENU-v0.1.0-0024 | south indian dishes.pdf | 3 | 93 | 5 | none | Clean OCR |
| MENU-v0.1.0-0025 | spicy.pdf | 2 | 77 | 5 | none | Clean OCR |
| **TOTAL** | | **23** | **412** | **17** | | |

### 1.5 Actions the Tool Must Support (from existing specs + Excel workflow)

| Action | What it does | Source |
|---|---|---|
| `approve` | Row is correct. Accept as-is. | G7B guide, Review UI spec section 6 |
| `edit` | Row is partially correct. Correct specific fields. | G7B guide, Review UI spec section 9 |
| `delete_hallucination` | AI invented this row. Remove from ground truth. | G7B guide |
| `add_missing` | AI missed an item visible on the PDF. Add manually. | G7B guide |
| `unclear` | Reviewer unsure. Flag for later. | G7B guide |
| `out_of_scope` | Not a menu item (address, phone, disclaimer). Exclude. | G7B guide |

Correctable fields: `item_name`, `rate`, `category`, `issue_status`

### 1.6 Existing Tech Stack (what we build on)

| Layer | What's there | Can we use it? |
|---|---|---|
| **Backend** | FastAPI + MongoDB (motor) | YES — add new endpoints alongside existing ones |
| **Frontend** | React 19 + CRA (craco) + Tailwind + shadcn/ui | YES — 46 shadcn components already installed |
| **Routing** | react-router-dom v7 | YES — add new routes |
| **UI components** | table, tabs, dialog, sheet, dropdown-menu, checkbox, select, badge, button, card, tooltip, popover, separator, scroll-area, progress, alert, input, textarea, command (cmdk) | YES — almost everything needed is pre-installed |
| **Data fetching** | axios | YES |
| **Icons** | lucide-react | YES |
| **Resizable panels** | react-resizable-panels | YES — perfect for PDF + table side-by-side |
| **PDF rendering** | Nothing installed | NEED: browser-native PDF embed OR pdf.js |
| **PDF tools (server-side)** | pdftoppm, pdftotext, tesseract, PyMuPDF — **ALL NOT INSTALLED** in current env | NEED: install poppler-utils at minimum for PDF-to-image; OR serve raw PDF and let browser render |
| **MongoDB** | Running, connected | YES — add new collections |

### 1.7 What the Existing Review UI Spec Says vs What We Need Now

The spec (468 lines, 23 sections) was written for the **full production system** with POS sync, dedup preview, modifier groups, etc. For the **Review Tool v1**, we take a subset:

| Spec feature | Needed for Review Tool v1? | Why / why not |
|---|---|---|
| Import list landing page | YES (simplified) | Browse available PDFs |
| Review table with all columns | YES (core feature) | The main workspace |
| Inline editing | YES | How corrections happen |
| Source provenance pane (PDF side-by-side) | YES (critical) | Primary defense against hallucination |
| Approve / reject / edit / delete actions | YES | Core workflow |
| Bulk approve clean rows | YES | Speed |
| Add missing row | YES | Capture what AI missed |
| Confidence + warning visualization | YES | Triage |
| Menu notes panel | YES (simplified) | Review GST/tax notes |
| Correction capture to MongoDB | YES (new) | Replaces Excel. Feeds learning. |
| Variant / add-on side panels | DEFER | Phase 2 concern; Phase 1 only flags them |
| Sync preview modal | NO | No POS sync in this tool |
| Sync to POS | NO | Later integration |
| Dedup preview | NO | Needs POS data |
| Modifier groups panel | DEFER | Phase 2 |
| Keyboard shortcuts | NICE-TO-HAVE | Can add iteratively |
| Mobile responsive | DEFER | Desktop-first for reviewer |
| Export CSV | NICE-TO-HAVE | Can add later |

### 1.8 Missing Dependencies (must install/add)

| What | Why | Options |
|---|---|---|
| PDF rendering in browser | Show source PDF pages alongside extracted rows | Option A: `<iframe>` with native browser PDF viewer (simplest). Option B: `react-pdf` / `pdfjs-dist` (more control, page-by-page). Option C: Server-side PDF-to-image via `poppler-utils` |
| MongoDB collections for corrections | Store reviewer actions persistently | New collections: `menu_reviews`, `menu_review_corrections` |
| Backend API endpoints for the tool | Serve data, save corrections | New endpoints under `/api/menu-review/` |

---

## PART 2: IMPACT ANALYSIS

### 2.1 Files That Will Be Created (new)

| File | Purpose |
|---|---|
| Frontend: new page components (ReviewTool, PDFViewer, ReviewTable, RowEditor, etc.) | The tool UI |
| Backend: new API routes in `server.py` or new module | Serve menu data, PDF files, save corrections |
| MongoDB: new collections | `menu_reviews`, `menu_review_corrections` |

### 2.2 Files That Will Be Modified

| File | What changes | Risk |
|---|---|---|
| `backend/server.py` | Add new API routes for the review tool (alongside existing routes) | LOW — additive only, existing endpoints untouched |
| `frontend/src/App.js` | Add new routes (e.g., `/review`, `/review/:id`) | LOW — additive, existing dashboard route untouched |
| `backend/requirements.txt` | May add `python-multipart` (if not already), possibly `pymupdf` or `pdf2image` for PDF page rendering | LOW |
| `frontend/package.json` | May add `react-pdf` or `pdfjs-dist` for PDF rendering | LOW |

### 2.3 Files That Will NOT Be Modified (protected)

| File | Why protected |
|---|---|
| `MENU_AI_FIRST_PASS_OUTPUT_SMOKE_v0.1.0.json` | Immutable archive. Tool reads it, never writes to it. |
| `scripts/_g7b_review/*.xlsx` | Excel workbooks preserved as historical artifacts. Tool replaces the workflow, doesn't modify the files. |
| `scripts/g7a_bootstrap_smoke.py` | Pipeline script. Not touched by the review tool. |
| `scripts/g7b_build_review_workbook.py` | Workbook generator. Not touched. |
| `scripts/g7b_ingest_review_workbook.py` | Workbook ingester. Not touched. |
| `datasets/menus_raw/v0.1.0-PROPOSED/**` | Source PDFs. Read-only. Never modified. |
| All `memory/menu-import/*.md` docs | Planning docs. Not modified by the tool. |
| `GEMINI_MENU_EXTRACTION_JSON_SCHEMA.json` | Schema. Read-only reference. |
| `frontend/src/components/ui/*` | Existing shadcn components. Used as-is, not modified. |

### 2.4 Data Flow (Review Tool)

```
SOURCE DATA (read-only)                    TOOL                         NEW DATA (written)
─────────────────────                    ──────                       ──────────────────

AI Archive JSON ──────────────►  Backend API  ──────►  Review UI
(412 rows, 5 docs)                  │                    │
                                    │                    │ reviewer actions
PDF files on disk ────────────►  PDF endpoint  ──►  PDF Viewer    │
(serve raw or as images)                         (side-by-side)    │
                                                                    ▼
                                                            MongoDB Collections
                                                         ┌──────────────────────┐
                                                         │ menu_reviews         │
                                                         │ (per-doc status)     │
                                                         ├──────────────────────┤
                                                         │ menu_review_         │
                                                         │ corrections          │
                                                         │ (per-row actions)    │
                                                         └──────────────────────┘
                                                                    │
                                                                    ▼
                                                         Ground truth JSON
                                                         (exportable for
                                                          dataset freeze)
```

### 2.5 Impact on Existing Functionality

| Existing feature | Impact | Risk |
|---|---|---|
| Status dashboard (`/`) | **NONE** — stays exactly as-is. New tool lives on separate routes. | ZERO |
| `/api/health` endpoint | **NONE** | ZERO |
| `/api/datasets/stats` endpoint | **NONE** | ZERO |
| `/api/status` endpoints | **NONE** | ZERO |
| MongoDB `status_checks` collection | **NONE** — new collections are separate | ZERO |
| G7A pipeline scripts | **NONE** — tool reads their output, doesn't modify them | ZERO |
| G7B Excel workbooks | **SUPERSEDED** but not deleted. Kept as historical artifacts. | ZERO |

**The review tool is purely additive. Nothing existing is modified or broken.**

### 2.6 Impact on Project Phases

| Phase | Impact |
|---|---|
| Phase 0C (dataset prep) | **ACCELERATED** — Sunil reviews via tool instead of Excel, corrections captured digitally |
| G7B (human review) | **REPLACED** — tool replaces Excel workflow |
| G8 (dataset freeze) | **UNBLOCKED FASTER** — tool produces structured output directly, no Excel-to-JSON conversion needed |
| Phase 1 (foundation) | **PARTIALLY DONE** — the review tool creates the corrections schema and API that Phase 1 would have built |
| Phase 2 (extraction) | **UNCHANGED** — still needs Gemini pipeline work |
| Phase 3 (review UI) | **SUBSTANTIALLY DONE** — the review tool IS the Phase 3 deliverable (simplified) |
| Phase 4 (corrections) | **PARTIALLY DONE** — correction capture is built into the tool |
| Phase 5 (learning) | **ENABLED** — corrections are in MongoDB, ready for learning rules |
| Phase 6-8 | **UNCHANGED** — POS sync, hardening, pilot are independent |

### 2.7 Impact on Existing Documents

| Document | Impact |
|---|---|
| `MENU_IMPORT_MVP_IMPLEMENTATION_PHASES.md` | Phase order changes. Review Tool is built before Foundation. Need an addendum noting the reorder. |
| `MENU_IMPORT_MVP_DB_SCHEMA.md` | Was written for PostgreSQL. Now irrelevant for the tool — we use MongoDB collections. New schema doc needed for the tool's MongoDB collections. |
| `MENU_IMPORT_MVP_API_CONTRACT.md` | The 30-endpoint spec is for the full production system. The tool uses a subset (~8-10 endpoints). A lightweight API doc needed for the tool. |
| `G7B_EXCEL_REVIEW_GUIDE_SUNIL_v0.1.0.md` | Superseded by the tool's own workflow. Keep as historical reference. |
| `MENU_DATASET_REVIEWER_PACKAGE_SUNIL_v0.1.0.md` | Needs an update pointing Sunil to the tool instead of Excel files. |
| All other docs | **No impact.** |

### 2.8 Risks

| Risk | Severity | Mitigation |
|---|---|---|
| PDF rendering quality varies by browser | MEDIUM | Use pdf.js for consistent cross-browser rendering; fallback to native `<iframe>` |
| Large PDFs (42 MB for one file) may be slow to render | MEDIUM | Render page-by-page, lazy load. Start with smoke set (all small files). |
| Reviewer makes mistakes that corrupt ground truth | LOW | Every action is logged with timestamp + reviewer ID. Undo support. Original AI archive is immutable. |
| Tool scope creep (adding POS sync, variants, etc.) | MEDIUM | Strict scope: review + correct + approve. No sync. No variants. No learning apply. Gate RT-G2 locks scope via approved mockups. |
| Stack contradiction confusion | LOW | **Resolved: MongoDB + Python/FastAPI + React. No PostgreSQL. No Node.js.** |

### 2.9 What the Tool Does NOT Do (explicit scope exclusion)

- Does NOT upload new PDFs (existing PDFs only)
- Does NOT call Gemini (uses existing AI output)
- Does NOT sync to POS
- Does NOT handle variants/add-ons (flags them only)
- Does NOT implement learning memory apply (captures corrections for future use)
- Does NOT create database migrations (MongoDB is schemaless)
- Does NOT modify any existing planning docs
- Does NOT process the remaining 27 PDFs (only the 5 smoke set initially; expandable later)

---

## PART 3: SCOPE DEFINITION FOR RT-G2 (MOCKUPS)

When you approve this discovery + impact analysis, the next step is mockups. Here's what I'll prepare for your review:

### Screens to Mock Up

| Screen | What it shows |
|---|---|
| **S1: Review Landing** | List of available PDFs (5 smoke set), status per PDF (not started / in progress / complete), row counts |
| **S2: Review Workspace** | Split view — PDF page on left, extracted rows table on right. The main working screen. |
| **S3: Row Detail / Edit** | Inline editing of item_name, rate, category, issue_status. Correction capture. |
| **S4: Add Missing Row** | Modal/form to add a row the AI missed |
| **S5: Page Navigation** | How to move between pages within a multi-page PDF |
| **S6: Review Progress** | Overall progress — how many rows reviewed, approved, corrected, deleted per PDF |
| **S7: Menu Notes Review** | Separate tab/panel for GST/tax notes |
| **S8: Export / Completion** | What happens when review is done — export corrected JSON, mark PDF as reviewed |

### User Flow to Mock Up

```
Landing → Select PDF → View Page 1 + Rows → Review each row → Navigate pages → Mark PDF complete → Export
```

---

## PART 4: OWNER DECISIONS (CLOSED 2026-06-27)

| # | Question | Decision | Date |
|---|---|---|---|
| 1 | Scope: Review + correct + approve only. No POS sync, no variants, no upload, no Gemini calls. | **YES — confirmed** | 2026-06-27 |
| 2 | PDF rendering approach | **Option B: pdf.js page-by-page rendering** (more control, zoom, better UX) | 2026-06-27 |
| 3 | Start with smoke set only (5 PDFs / 412 rows, expandable later) | **YES — confirmed** | 2026-06-27 |
| 4 | MongoDB for corrections (new collections alongside existing) | **YES — confirmed** | 2026-06-27 |
| 5 | Proceed to mockups (RT-G2) | **YES — approved** | 2026-06-27 |

---

*RT-G1 Discovery + Impact Analysis — COMPLETE. Owner decisions recorded. Proceeding to RT-G2.*
