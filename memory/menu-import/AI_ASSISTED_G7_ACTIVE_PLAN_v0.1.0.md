# AI-Assisted G7 Active Plan — v0.1.0 Smoke Set

> Status: **active for Smoke Set only**
> Phase: 0C → G7A
> Dataset: `v0.1.0-PROPOSED` (NOT frozen)
> Reviewer policy: single human reviewer (Sunil); second reviewer waived

---

## 1. What this plan replaces

The original G7 plan called for human-only page-by-page review of every menu PDF
to produce `expected_pages` ground truth. That is too slow for the v0.1.0 cycle.
This **AI-assisted variant** is approved for the Smoke Set only (5 PDFs); it
will be re-evaluated before being extended to the Learning Memory Set or the
Eval Hold-out.

The Eval Hold-out **must remain Gemini-untouched** until it is frozen.

---

## 2. Gates (re-stated)

| Gate | Goal | AI-assisted? |
|---|---|---|
| **G7A** | First-pass Gemini extraction on the Smoke Set; produce immutable archive | YES |
| **G7B** | Human reviewer (Sunil) corrects the first pass → fills `expected_pages` for 5 IDs | NO |
| **G7C** | Repeat first-pass extraction on Learning Memory Set | YES (pending review of G7A/G7B outcome) |
| **G7D** | Human reviewer fills Learning Memory `expected_pages` | NO |
| **G7E** | Repeat first-pass extraction on Eval Hold-out — **once and only once** | YES, but gated |
| **G7F** | Human reviewer fills Eval Hold-out `expected_pages` | NO |
| **G8** | Dataset freeze → `v0.1.0` immutable | — |

---

## 3. Smoke Set (owner-approved)

| Dataset ID | Source file | Batch |
|---|---|---|
| MENU-v0.1.0-0007 | Ghatkesar family dhaba.pdf | batch-02 |
| MENU-v0.1.0-0013 | Akula Organics.pdf | batch-03 |
| MENU-v0.1.0-0023 | sona chadi.pdf | batch-05 |
| MENU-v0.1.0-0024 | south indian dishes.pdf | batch-05 |
| MENU-v0.1.0-0025 | spicy.pdf | batch-05 |

---

## 4. Pipeline (G7A)

```
PDF (read-only)
  ├─► pdftotext -layout (page-by-page)
  │      └─ if char_count < 80 OR letter_ratio < 0.35 ↓
  ├─► pdftoppm -r 300 → tesseract -l eng+hin+tel  (per page)
  │
  └─► aggregate per-page text + extraction metadata
        └─ if combined chars > 25_000 ⇒ per-page chunking
        └─ build text-only Gemini payload (NO PDF, NO vision parts)
        └─ stage under /app/scripts/_g7a_staging/payloads/<ID>/
        └─ STOP — awaiting owner approval to call Gemini
```

Target model: `gemini-2.5-flash`
Target schema: `gemini-extract-schema-v1.2`
Prompt version: `extract-v1`
Preprocessing version: `g7a-textocr-v1`

---

## 5. Schema patches in scope

| Patch | From → To | What changed | Why |
|---|---|---|---|
| v1 → v1.1 | row-level | `issue_status` enum gained `category_inferred` | Run #2/#3 produced rows whose category was inferred from layout, not literally printed; the previous enum forced the model to mislabel them as `clean` or `review_required`. |
| v1.1 → v1.2 | page-level | `Page` now has optional `warnings: array<enum>` | Run #4 model outputs included page-level warning codes (`mixed_language_detected`, `multi_column_confusion`, etc.) attached to specific pages; v1.1 only had a document-level `warnings`, so those responses failed validation. v1.2 also adds `chunked_page_partial_context` for chunked submissions. |

Both patches are now applied to `GEMINI_MENU_EXTRACTION_JSON_SCHEMA.json`
(`version: "1.2"`).

---

## 6. Per-page chunking rule

A single payload exceeding **25 000 characters** of source text (including
per-page envelopes) is split into **one chunk per page**. Each chunk carries:

- `chunk_label` like `page-03-of-13`
- the same `import_id`, `source_file`, `dataset_id`, `sha256`
- only that page's text
- `warnings` may include `chunked_page_partial_context` to signal the model
  that cross-page joins (e.g., a category header on page N+1) are not
  available in this chunk.

Per-chunk responses are merged orchestrator-side back into a single document
before being archived. Merge logic is OUT OF SCOPE for G7A (will be added when
the Gemini call is enabled in a later patch).

---

## 7. Current G7A status (this workspace)

| Item | State |
|---|---|
| Schema v1.2 patch | **APPLIED** (in this workspace) |
| OCR / poppler tools | **INSTALLED** |
| `g7a_bootstrap_smoke.py` | **CREATED** |
| Per-page chunking | **IMPLEMENTED** in script (text staging only) |
| Pre-flight validation | **PASSING** (see `MENU_IMPORT_G7A_PREFLIGHT_REPORT_v0.1.0.md`) |
| Text/OCR payload build | **READY TO RUN** (`--build`) — does NOT call Gemini |
| Gemini call | **GATED** — `--call-gemini` raises `NotImplementedError` until owner explicitly approves |
| Immutable first-pass archive | **NOT WRITTEN** |
| Placeholders | **UNTOUCHED** |

---

## 8. Next action (single)

```
python3 /app/scripts/g7a_bootstrap_smoke.py --preflight
```

After pre-flight reports `ok: true`, owner may approve running:

```
python3 /app/scripts/g7a_bootstrap_smoke.py --build
```

`--build` runs only the text/OCR + chunking step and stages payloads on disk.
**No external call is made.** The next gate after that is the explicit wiring
of the Gemini call, which is out of scope for this patch.
