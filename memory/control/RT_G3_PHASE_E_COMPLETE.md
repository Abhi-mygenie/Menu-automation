# RT-G3 Phase E — All Phases Complete

**Date:** 2026-07-01
**Status:** COMPLETE — All 5 phases done

## What was built in Phase E

### New files
- `src/components/review/MenuNoteCard.jsx` — per-note card with approve/edit/delete/out-of-scope actions + inline text editor
- `src/components/review/MenuNotesPanel.jsx` — replaces NotesPlaceholder; groups notes by page; header shows tax-warning count
- `src/components/review/AddMissingRowModal.jsx` — Dialog for adding items AI missed; fields: item_name, rate, category (datalist), page_number (select), reviewer_notes
- `src/components/review/ExportModal.jsx` — Complete & Export dialog; shows review summary, 70-rows-remaining warning, triggers blob download of corrected JSON

### Modified files
- `backend/server.py` — Fixed add_missing rows to always INSERT (not upsert) since they have no real row_no
- `src/components/review/TableToolbar.jsx` — Added "Add Row +" button
- `src/components/review/ReviewTable.jsx` — Passes onAddRow down to TableToolbar
- `src/pages/review/ReviewWorkspace.jsx` — Added noteCorrections state + noteCorrectionsRef, saveNoteCorrection(), handleAddRow(), showExport/showAddRow state, "Complete & Export" header button, renders both modals at root

## Screenshots verified
1. **Menu Notes (S7)** — 7 notes for Akula Organics; 3 packaging_notes in amber with "MANUAL REVIEW REQUIRED" badge; 4 action buttons (✓ ✎ ✕ ⊘) per note; "0/7 reviewed" counter
2. **Add Missing Row (S4)** — Dialog with ITEM NAME (required), RATE, CATEGORY (combobox), PAGE (select, default Page 1), REVIEWER NOTES; provenance text at bottom
3. **Complete & Export (S8)** — Shows amber warning ("70 rows still unreviewed"), REVIEW SUMMARY table (total=74, reviewed=4, approved=1, edited=1, deleted=1, unclear=1, remaining=70, notes=0/7), "Export Anyway" + Cancel buttons

## Full system status — ALL PHASES DONE

| Phase | What | Status |
|---|---|---|
| A | Backend — 9 API endpoints + 2 MongoDB collections | ✅ Done |
| B | Landing page — 5 PDF cards with progress bars | ✅ Done |
| C | Workspace shell — split layout + pdf.js + page nav | ✅ Done |
| D | Row review loop — ActionButtons, InlineEditor, ReviewTable, Approve All Clean | ✅ Done |
| E | MenuNotesPanel, AddMissingRowModal, ExportModal | ✅ Done |

## What the full flow looks like end-to-end
1. Home page → click "Review Tool" button → /review landing
2. Landing → 5 PDF cards, each showing status/progress/warnings
3. Click any card → /review/:datasetId workspace
4. Left panel: PDF renders page-by-page, page nav, zoom controls
5. Right panel → Rows tab: table with approve/edit/delete/unclear/out-of-scope per row + Approve All Clean
6. Inline editor: edit item_name, rate, category with AI original shown in grey + raw OCR provenance
7. Menu Notes tab: all notes with tax-warning highlights, same action buttons
8. Progress tab: overall bar, per-action breakdown, per-page table
9. Add Row button: modal to add items AI missed
10. Complete & Export: shows review summary, triggers JSON blob download
