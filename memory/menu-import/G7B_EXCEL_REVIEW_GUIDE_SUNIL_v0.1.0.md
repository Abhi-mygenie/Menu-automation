# G7B Excel Review Guide — for Sunil (v0.1.0 Smoke Set)

> Single-reviewer workflow on **5 PDF menus** to produce the v0.1.0 expected-output ground truth.
> No AI call here. No dataset freeze here. No POS sync here.

---

## 0. TL;DR

1. Open each `*_review.xlsx` next to its source PDF.
2. For every row, set the **Action** column. Optionally fill the `Corrected_*` columns.
3. Save the file with the same name. Hand the 5 files back.
4. We run the ingest script — it produces a corrected expected-output JSON + a diff report. Nothing else changes.

---

## 1. Files to open

| Dataset ID | Workbook | Source PDF |
|---|---|---|
| MENU-v0.1.0-0007 | `/app/scripts/_g7b_review/MENU-v0.1.0-0007_review.xlsx` | `Ghatkesar family dhaba.pdf` (13 pages, OCR-chunked) |
| MENU-v0.1.0-0013 | `/app/scripts/_g7b_review/MENU-v0.1.0-0013_review.xlsx` | `Akula Organics.pdf` (4 pages, text-layer) |
| MENU-v0.1.0-0023 | `/app/scripts/_g7b_review/MENU-v0.1.0-0023_review.xlsx` | `sona chadi.pdf` (1 page, MIXED-SCRIPT OCR — noisy) |
| MENU-v0.1.0-0024 | `/app/scripts/_g7b_review/MENU-v0.1.0-0024_review.xlsx` | `south indian dishes.pdf` (3 pages, OCR) |
| MENU-v0.1.0-0025 | `/app/scripts/_g7b_review/MENU-v0.1.0-0025_review.xlsx` | `spicy.pdf` (2 pages, OCR) |

The source PDFs live at:
`/app/datasets/menus_raw/v0.1.0-PROPOSED/batch-XX/<filename>.pdf`

---

## 2. Workbook layout

Each workbook has these sheets:

- **`Summary`** — dataset metadata, per-page extraction method (pdftotext vs. tesseract), AI rollup counts.
- **`Page_01`, `Page_02`, …** — one sheet per page of the PDF. Each row is a candidate menu item the AI extracted.
- **`Page_warnings`** — page-level warnings emitted by the model (e.g., `mixed_language_detected`).

### Row columns (left → right)
| Column | What it is | Editable? |
|---|---|---|
| `row_no` | Row index within the page (AI-assigned) | No |
| `page_number` | Page in the PDF | No |
| `category` | AI-detected category heading | No (override via `Corrected_category`) |
| `item_name` | AI-extracted item name | No (override via `Corrected_item_name`) |
| `rate` | AI-extracted price (decimal) | No (override via `Corrected_rate`) |
| `currency` | Currency code | No |
| `confidence` | Model self-reported confidence (high/medium/low) | No |
| `issue_status` | Model's status (clean / review_required / flagged_only_phase1 / category_inferred) | No (override via `Corrected_issue_status`) |
| `variant_warning` | True if size/portion variants were detected | No |
| `addon_warning` | True if add-on phrasing was detected | No |
| `tax_note_warning` | True for tax/GST/packaging notes attached to this row | No |
| `raw_text` | **VERBATIM page text the row is grounded in** — use this to compare with the PDF | No |
| `source_bbox` | Optional bounding box (often blank in text-PDF mode) | No |
| **`Action`** | **Your decision — REQUIRED.** Drop-down. | **YES** |
| `Corrected_item_name` | Fill only if you want to override the AI's item name | YES |
| `Corrected_rate` | Fill only if you want to override the AI's price (number) | YES |
| `Corrected_category` | Fill only if you want to override the AI's category | YES |
| `Corrected_issue_status` | Drop-down: clean / review_required / flagged_only_phase1 / category_inferred (override only) | YES |
| `Reviewer_notes` | Free-text notes for this row | YES |

### Colour codes you'll see
- 🟥 **Red row** — `review_required`. Look first.
- 🟧 **Amber row** — `flagged_only_phase1` (variants / add-ons / tax notes). Phase 1 only flags them; keep as-is unless wrong.
- 🟪 **Violet row** — `category_inferred` (model guessed the category). Verify against the PDF.
- 🟩 **Green row** — `clean` AI extraction. Usually just confirm.

The **Action** cell also colours itself as you fill it (green = approve, blue = edit, red = delete, amber = add, gray = unclear, violet = out_of_scope).

---

## 3. The Action column — pick exactly one per row

| Action | Meaning | When to use |
|---|---|---|
| `approve` | AI got this row right. Keep as-is. | Default for `clean` + high/medium confidence rows that match the PDF. **Pre-filled.** |
| `edit` | AI got it mostly right but you're correcting one or more fields. | When `item_name`/`rate`/`category`/`issue_status` is wrong. **Fill the relevant `Corrected_*` column.** |
| `delete_hallucination` | AI invented this row — it isn't in the PDF, or the AI duplicated it. | Row will be removed from ground truth. |
| `add_missing` | The AI missed a row on this page. | Insert a new Excel row below the existing ones on the same page, fill `Corrected_item_name` / `Corrected_rate` / `Corrected_category` / `Corrected_issue_status`. Set `Action = add_missing`. |
| `unclear` | You're not sure. Need a second look or domain help. | Stays in ground truth as `review_required`. Listed in the diff report so we can revisit before G8 freeze. **Pre-filled for any row that wasn't clearly clean.** |
| `out_of_scope` | Not menu content (e.g., ads, contact info, address blocks the AI mistakenly picked up). | Row is excluded from ground truth and from row-count metrics. |

> **Important:** `Action` must be one of the values above. The drop-down enforces this; copy-pasting other text will be rejected by the ingest script.

---

## 4. Workflow (recommended)

1. **Open the Summary sheet.** Confirm `dataset_id` and `source_file` match the PDF you're reviewing.
2. **Apply auto-filter** on each page sheet (already enabled — click the funnel icon next to any header):
   - First pass: filter `issue_status = review_required`. Decide each row.
   - Second pass: filter `issue_status = flagged_only_phase1`. Verify (most stay `approve`).
   - Third pass: filter `issue_status = clean`. Bulk-confirm or correct.
   - Fourth pass: filter `confidence = low`. Catch silent misses.
3. **Compare against the PDF.** `raw_text` shows you exactly which line on the PDF the AI used. If `raw_text` matches the PDF but the parsed `item_name`/`rate` is wrong → `Action = edit` and fill `Corrected_*`. If `raw_text` is bogus or absent → likely `delete_hallucination`.
4. **For missing rows:** scan the PDF page top-to-bottom for any item the AI didn't capture. Insert a new Excel row below the last row on that page sheet. Fill `row_no` (next integer), `page_number` (current page), `Corrected_item_name`, `Corrected_rate`, `Corrected_category`, `Corrected_issue_status`. Set `Action = add_missing`. Leave `category`/`item_name`/etc. blank.
5. **Menu notes:** at the bottom of each page sheet there's a "MENU NOTES (page-level)" block for items like "GST extra", "Parcel charge extra". Same Action drop-down applies, but only `approve`, `edit`, `delete_hallucination`, `out_of_scope`, `unclear` are meaningful.
6. **Save the file** (Ctrl+S). Excel and LibreOffice both work; keep the `.xlsx` extension.

---

## 5. Special handling notes

### MENU-v0.1.0-0007 (Ghatkesar family dhaba — 13 pages)
- Was submitted to the AI as 13 per-page chunks. Cross-page context (category headers running across pages) may be off — please verify category assignments on every page.
- Each page carries the warning `chunked_page_partial_context` — that's structural metadata, not a row-level issue.

### MENU-v0.1.0-0023 (sona chadi — 1 page)
- **MIXED-SCRIPT OCR** (Marathi + Hindi + Telugu). Tagged `OCR_LOW_CONFIDENCE` in the Summary sheet.
- The AI emitted 42 candidate rows; expect a high `delete_hallucination` rate, and many `Corrected_item_name` cleanups. Many `raw_text` cells will contain garbled OCR — that's expected.
- All rows carry top-level warnings `mixed_language_detected`, `ocr_unreadable`, `no_source_grounding_page_level`. **You may keep `Corrected_issue_status = review_required` on most rows** unless you can confidently transcribe the item.
- If you can read the Marathi/Devanagari text yourself, please transcribe in `Corrected_item_name`. Otherwise mark `unclear` so a Marathi-speaking reviewer can revisit.

### MENU-v0.1.0-0013 (Akula Organics — 4 pages, text-layer)
- Cleanest input. Most rows should be `approve` after a quick eyeball.

### MENU-v0.1.0-0024 / MENU-v0.1.0-0025 (south indian dishes / spicy)
- Tesseract OCR was clean. Expect mostly `approve`, with the occasional category mistake.

---

## 6. When you're done

Hand back all 5 files at:
```
/app/scripts/_g7b_review/MENU-v0.1.0-0007_review.xlsx
/app/scripts/_g7b_review/MENU-v0.1.0-0013_review.xlsx
/app/scripts/_g7b_review/MENU-v0.1.0-0023_review.xlsx
/app/scripts/_g7b_review/MENU-v0.1.0-0024_review.xlsx
/app/scripts/_g7b_review/MENU-v0.1.0-0025_review.xlsx
```

Then we run:
```bash
python3 /app/scripts/g7b_ingest_review_workbook.py
```

This will create — without touching any canonical file:
- `/app/memory/menu-import/MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0_G7B_CORRECTED.json`
- `/app/memory/menu-import/G7B_REVIEW_DIFF_REPORT_v0.1.0.md`

The canonical placeholder JSON (`MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json`) is **untouched** and remains the source of truth until G8 freeze.

---

## 7. What this guide does NOT cover

- ❌ The other 27 menus — out of scope until G7C/G7D approval.
- ❌ Dataset freeze (G8).
- ❌ POS sync (Phase 1 MVP work, much later).
- ❌ Production review UI — for now, Excel is the tool.
- ❌ Marathi OCR — owner deferred. If many `unclear` rows pile up on 0023, we'll revisit with `tesseract-ocr-mar`.

---

## 8. FAQ

**Q: Can I add columns or sheets?**
A: Please don't. The ingest script reads the exact column header names. Adding columns is fine *to the right* if you need scratch space, but don't rename or reorder the canonical ones.

**Q: Can I sort the rows?**
A: Yes — auto-filter is enabled. Sort by `issue_status` or `confidence` to triage. The ingest re-indexes `row_no` based on the order it sees in the sheet, so sorting may change row order in the output. That's fine for ground truth.

**Q: What if I disagree with the AI's `raw_text`?**
A: `raw_text` is read-only — it's the audit trail of what the AI saw. If the AI grounded itself wrong, set `Action = delete_hallucination` and add `Reviewer_notes` explaining what's actually on the PDF.

**Q: What if I want to keep an `unclear` row but mark it for follow-up?**
A: Set `Action = unclear`, fill `Reviewer_notes` with your concern. The diff report counts it and flags it.

**Q: What if the PDF page is genuinely blank or has no menu items?**
A: Leave the sheet empty (or `delete_hallucination` any false rows). The page will still appear in `expected_pages` with `expected_rows = []`.
