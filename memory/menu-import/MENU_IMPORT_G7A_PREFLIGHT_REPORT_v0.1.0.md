# G7A Pre-Flight Validation Report — v0.1.0

> Source: `python3 /app/scripts/g7a_bootstrap_smoke.py --preflight`
> Run at: 2026-05-11T18:45 UTC
> Workspace: canonical `/app` on branch `7-may`
> Mode: read-only validation. No Gemini call. No extraction. No mutations.

---

## 1. Verdict

**GREEN — ready for `--build` on owner approval.**

- `ok: true`
- `blocking: []`
- All **12** checks pass.
- All **5** Smoke Set PDFs resolve and SHA-256s match the placeholder file.

---

## 2. Check matrix

| # | Check | Result | Detail |
|---|---|---|---|
| 1 | tool: `pdftotext` | PASS | `/usr/bin/pdftotext` (poppler-utils 22.12.0) |
| 2 | tool: `pdfinfo` | PASS | `/usr/bin/pdfinfo` |
| 3 | tool: `pdftoppm` | PASS | `/usr/bin/pdftoppm` |
| 4 | tool: `tesseract` | PASS | `/usr/bin/tesseract` (5.3.0) |
| 5 | tesseract-lang: `eng` | PASS | available in `/usr/share/tesseract-ocr/5/tessdata/` |
| 6 | tesseract-lang: `hin` | PASS | available |
| 7 | tesseract-lang: `tel` | PASS | available |
| 8 | schema-version | PASS | `version=1.2`, `page_props=[page_number, rows, menu_notes, warnings]`, `issue_status=[clean, review_required, flagged_only_phase1, category_inferred]` |
| 9 | schema-pages-warnings | PASS | `pages[].warnings` present |
| 10 | schema-category-inferred | PASS | `issue_status.category_inferred` present |
| 11 | smoke-set-resolution | PASS | 5/5 Smoke Set PDFs resolved + SHA-256 verified against placeholders |
| 12 | prompt-template | PASS | `/app/memory/menu-import/GEMINI_MENU_EXTRACTION_PROMPT_TEMPLATE.md` exists |

---

## 3. Resolved Smoke Set

| Dataset ID | Source file | Path | Pages | SHA-256 (prefix) |
|---|---|---|---:|---|
| MENU-v0.1.0-0007 | Ghatkesar family dhaba.pdf | `batch-02/Ghatkesar family dhaba.pdf` | 13 | `e57e64a2fd9b` |
| MENU-v0.1.0-0013 | Akula Organics.pdf | `batch-03/Akula Organics.pdf` | 4 | `7d4233768d83` |
| MENU-v0.1.0-0023 | sona chadi.pdf | `batch-05/sona chadi.pdf` | 1 | `93e7d0f5c8fe` |
| MENU-v0.1.0-0024 | south indian dishes.pdf | `batch-05/south indian dishes.pdf` | 3 | `c7f66065388f` |
| MENU-v0.1.0-0025 | spicy.pdf | `batch-05/spicy.pdf` | 2 | `e870f7a85678` |

Total pages across Smoke Set: **23**.

Per-page chunking projection (CHUNK_THRESHOLD_CHARS = 25 000):
- **0007 (13 pages)** is the most likely chunking candidate; previous attempts on this PDF as a full payload triggered upstream 502s — chunking is the explicit mitigation.
- **0023 (1 page)** will never chunk.
- **0013 / 0024 / 0025** will be evaluated after text extraction; expected to stay below the chunking threshold.

---

## 4. Pipeline configuration in use

```
model:                  gemini-2.5-flash
schema_version:         gemini-extract-schema-v1.2
prompt_version:         extract-v1
preprocessing_version:  g7a-textocr-v1
chunk_threshold_chars:  25000
ocr_langs:              eng+hin+tel
ocr_dpi:                300
min_text_chars_per_page: 80
ocr_trigger_letter_ratio: 0.35
```

Payload kind: **text-only** (no PDF attachment, no vision parts).

---

## 5. Files created / modified by the recreate step

| Path | Action | Notes |
|---|---|---|
| `/app/memory/menu-import/GEMINI_MENU_EXTRACTION_JSON_SCHEMA.json` | PATCHED | v1 → v1.2: added `version` field, updated `$id`, updated `json_schema_version` regex to accept dotted version, added `pages[].warnings`, added `category_inferred` to row-level `issue_status` enum. Validates clean under `jsonschema.Draft202012Validator.check_schema`. |
| `/app/memory/menu-import/AI_ASSISTED_G7_ACTIVE_PLAN_v0.1.0.md` | CREATED | Active plan for the AI-assisted G7 workflow (Smoke Set only). |
| `/app/memory/menu-import/SMOKE_SET_AI_BOOTSTRAP_RUNBOOK_v0.1.0.md` | CREATED | Operator runbook (pre-flight, build, gated Gemini call). |
| `/app/memory/menu-import/G7A_SMOKE_RUN_REPORT_v0.1.0.md` | CREATED | Append-only run log; historical runs noted, no live run recorded yet. |
| `/app/scripts/g7a_bootstrap_smoke.py` | CREATED | text+OCR pipeline with per-page chunking; Gemini call gated behind `--call-gemini` (raises `NotImplementedError`). Lint clean. |
| `/app/scripts/README.md` | CREATED | Scripts directory README. |
| OS packages | INSTALLED | `poppler-utils`, `tesseract-ocr`, `tesseract-ocr-eng`, `tesseract-ocr-hin`, `tesseract-ocr-tel`. |

Files **NOT** touched:
- `MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json` — placeholders untouched (still 32 entries, all `expected_pages: []`).
- Any source PDF under `/app/datasets/menus_raw/v0.1.0-PROPOSED/`.
- `backend/server.py`, `frontend/src/App.js`, or any production code.
- No commit was made; staging only.

---

## 6. Stop conditions honored

| Constraint | Honored? |
|---|---|
| Do not restart Phase 0 | YES |
| Do not touch dataset placeholders | YES |
| Do not freeze dataset | YES (dataset still `v0.1.0-PROPOSED`) |
| Do not call Gemini yet | YES (`--call-gemini` gated; `NotImplementedError`) |
| Do not implement product backend/frontend code | YES |

---

## 7. Next safe action (single command — owner-approved)

```bash
python3 /app/scripts/g7a_bootstrap_smoke.py --build
```

This will run the text/OCR pipeline against all 5 Smoke Set PDFs and stage
the text-only payloads under `/app/scripts/_g7a_staging/payloads/`.
**No external call is made.** Stop after `--build`; the next gate is wiring
the Gemini call, which requires a separate owner-approved patch.

For a single-ID dry run before committing to all 5:

```bash
python3 /app/scripts/g7a_bootstrap_smoke.py --build --dataset-id MENU-v0.1.0-0025
```

---

_End of pre-flight report._
