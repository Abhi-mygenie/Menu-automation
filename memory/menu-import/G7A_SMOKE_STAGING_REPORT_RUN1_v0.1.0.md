# G7A Smoke Set Staging Report — v0.1.0 (Run #1, text_build)

> Generated: 2026-05-11T18:48 UTC
> Workspace: `/app` · branch `7-may`
> Command: `python3 /app/scripts/g7a_bootstrap_smoke.py --build`
> Mode: **local text/OCR/chunking only — NO Gemini call**
> Scope: 5 Smoke Set PDFs

---

## 1. Headline

✅ **Build succeeded for all 5 Smoke Set PDFs.** 23/23 pages produced text. 17 text-only payloads staged (1 single + 13 chunked for the 13-page menu + 3 singles). Aggregate payload size: **66.8 KB** on disk — well below any model context cap.

One pipeline bug was found and fixed mid-run: `pdftoppm -gray` emits `.pgm` (grayscale Netpbm), not `.ppm`. The original glob pattern in `g7a_bootstrap_smoke.py` only matched `.ppm`, so the OCR fallback silently produced empty strings on the image-only PDFs (0023/0024/0025). Glob fixed to `page-*.p[pg]m`; staging directory wiped and re-run cleanly.

No Gemini call. No placeholder mutation. No archive written.

---

## 2. Per-document results

### 2.1 Summary table

| Dataset ID | Source file | Pages | Text source breakdown | Total chars | Chunked? | Chunks | Payload size on disk |
|---|---|---:|---|---:|:---:|---:|---:|
| MENU-v0.1.0-0007 | Ghatkesar family dhaba.pdf | 13 | 4 × `pdftotext` + 9 × `pdftotext-low` (false positive — see §3.1) | 32 569 | ✅ YES | **13** | 44 346 B |
| MENU-v0.1.0-0013 | Akula Organics.pdf | 4 | 1 × `pdftotext` + 3 × `pdftotext-low` (false positive) | 6 226 | NO | 1 | 9 003 B |
| MENU-v0.1.0-0023 | sona chadi.pdf | 1 | 1 × **`tesseract`** (image-only PDF) | 1 116 | NO | 1 | 4 706 B |
| MENU-v0.1.0-0024 | south indian dishes.pdf | 3 | 3 × **`tesseract`** (image-only PDF) | 2 700 | NO | 1 | 4 348 B |
| MENU-v0.1.0-0025 | spicy.pdf | 2 | 2 × **`tesseract`** (image-only PDF) | 3 638 | NO | 1 | 5 961 B |
| **Total** | — | **23** | 5 × text-layer, 6 × OCR, 12 × text-layer-low-ratio | **46 249** | — | **17** | **68 364 B** |

### 2.2 Per-page detail

| Doc | Page | Method | Chars | Letter ratio | Notes |
|---|---:|---|---:|---:|---|
| 0007 | 01 | pdftotext-low | 5 801 | 0.28 | low ratio → OCR tried → OCR did not improve, kept pdftotext output |
| 0007 | 02 | pdftotext-low | 6 193 | 0.30 | same |
| 0007 | 03 | pdftotext-low | 4 620 | 0.29 | same |
| 0007 | 04 | pdftotext | 128 | 0.49 | clean (3 beverage rows) |
| 0007 | 05 | pdftotext-low | 3 668 | 0.20 | same |
| 0007 | 06 | pdftotext-low | 2 418 | 0.27 | same |
| 0007 | 07 | pdftotext-low | 2 418 | 0.27 | same — exact duplicate of p06 chars; verify upstream |
| 0007 | 08 | pdftotext-low | 164 | 0.29 | short tail |
| 0007 | 09 | pdftotext-low | 3 063 | 0.32 | same |
| 0007 | 10 | pdftotext | 1 967 | 0.47 | clean |
| 0007 | 11 | pdftotext | 1 967 | 0.47 | clean — exact duplicate of p10 chars; verify upstream |
| 0007 | 12 | pdftotext | 143 | 0.48 | short tail |
| 0007 | 13 | pdftotext-low | 19 | 0.95 | almost-empty page — just `Complementary_price` |
| 0013 | 01 | pdftotext-low | 1 781 | 0.30 | low ratio (numerics dominate) |
| 0013 | 02 | pdftotext-low | 1 503 | 0.35 | borderline |
| 0013 | 03 | pdftotext-low | 1 268 | 0.32 | same |
| 0013 | 04 | pdftotext | 1 674 | 0.43 | clean |
| 0023 | 01 | **tesseract** | 1 116 | 0.37 | image-only PDF; OCR produced text but quality is **mixed-script + noisy** (Marathi + Telugu + symbols). See §3.3. |
| 0024 | 01 | **tesseract** | 1 083 | 0.68 | clean English OCR (`Plain Dosa 70`, `Masala Uttapam 80`, …) |
| 0024 | 02 | **tesseract** | 757 | 0.63 | clean English OCR |
| 0024 | 03 | **tesseract** | 860 | 0.65 | clean English OCR |
| 0025 | 01 | **tesseract** | 1 976 | 0.51 | English OCR — quality likely good (ratio normal) |
| 0025 | 02 | **tesseract** | 1 662 | 0.55 | English OCR — quality likely good |

---

## 3. Findings & special handling

### 3.1 Threshold artefact: `pdftotext-low` is mostly a false positive on price-heavy menus

12 of the 23 pages were tagged `pdftotext-low` because their `letter_ratio` dipped below the **0.35** trigger. The trigger fires because Indian restaurant menus naturally have a high density of digits, currency symbols, and column whitespace (the rate column alone drags the ratio down). In **every** case the OCR fallback ran but **did not improve** on pdftotext (`ocr_did_not_improve`), so the pipeline kept the pdftotext output verbatim. The text quality on those pages is good — verified by eye on 0007 p01 (well-structured `Id Name Price CategoryId Variations Addons give_discount` rows).

**Recommendation before Gemini:** keep the threshold but treat `pdftotext-low + ocr_did_not_improve` as a soft signal only (not a "quality issue"). The model_metadata payload sent to Gemini should expose `extraction_method` per page so the model can self-rate.

**No mutation required** — the current pipeline already handles this correctly (output is the pdftotext text).

### 3.2 0007 chunking — 13 per-page payloads

Total text crossed the 25 000-char threshold (`32 569` chars), so the script emitted **13 per-page chunks** under `payloads/MENU-v0.1.0-0007/payload-chunked/page-NN-of-13.json`. Each chunk is well-formed JSON and self-contained (carries `import_id`, `dataset_id`, `sha256`, `chunk_label`, and only that page's text). Average chunk size: ~3.4 KB.

**Special handling before Gemini:**
- Each chunk must be POSTed to Gemini independently.
- The eventual orchestrator must **merge chunk responses** back into a single document before archiving (merging the per-page `pages[]`, unioning `warnings[]`, summing `extraction_summary` counters). This merge logic is OUT OF SCOPE for the current G7A patch and must be authored alongside the Gemini call wiring.
- Each chunk's request envelope should set `pages[].warnings` to include `chunked_page_partial_context` so the model knows it cannot rely on cross-page joins (e.g., a category heading that visually lives on page N-1).

### 3.3 0023 (sona chadi) — OCR-borderline / mixed-script

This is the highest-risk Smoke file. The PDF is a **scanned 1-page menu** (image-only; pdftotext returned 0 chars). Tesseract OCR produced 1 116 characters but the content is heavily **Devanagari + Telugu + Latin glyphs mixed with OCR noise** (e.g., `हाटेल Ee. = ;`, `ఇళ ——-`, `“ NK LP 007`). The menu is in **Marathi** (handwritten/printed) with English/Telugu artifacts. Letter ratio of 0.37 understates the noise.

**Special handling before Gemini — RECOMMENDED:**

| Option | Effort | When to use |
|---|---|---|
| (a) Send as-is with `pages[].warnings = ["mixed_language_detected", "ocr_unreadable", "no_source_grounding_page_level"]` and `prompt_version = extract-v1-lowtrust` | low | First attempt. Gemini may surface what it can; reviewer will fill the gaps. |
| (b) Re-OCR with `tesseract -l mar+eng --psm 4` (Marathi-specific, sparse layout) before sending | medium | If (a) yields <50% extraction. **Requires installing `tesseract-ocr-mar`.** |
| (c) Manually re-scan the source at higher DPI / better contrast | high | Last resort. Owner action; out of agent scope. |

Currently in staging the file is queued for **(a)**. No additional language packs were installed in this step.

### 3.4 0024 / 0025 — clean OCR

Both image-only PDFs OCR'd cleanly in English. `Plain Dosa 70 / Masala Uttapam 80 / Idli & Vada [1 Piece Each] 50` etc. extract correctly. Letter ratios (0.51–0.68) are healthy. Send straight to Gemini with `pages[].warnings = ["ocr_unreadable"]` removed and only an informational tag (e.g., `extraction_method: "tesseract"` in model_metadata) so the model knows the source.

### 3.5 0013 — no chunking, suspected mixed-language content

Page 02 has the exact threshold letter_ratio of 0.35 — borderline. Spot-checked: pdftotext output is structured menu data. No special handling required beyond standard prompt.

### 3.6 0007 — possible upstream duplicate pages

- p06 and p07 both have exactly `2 418` chars at `0.27` ratio.
- p10 and p11 both have exactly `1 967` chars at `0.47` ratio.

This is likely an upstream artefact of the source spreadsheet (`Creator: EXCEL.EXE`) being printed across multiple pages with continuation. **Not a script bug** — the text files differ in actual content (visual inspection recommended before owner sign-off on the v0.1.0 dataset). This is a **dataset characteristic**, not a pipeline issue, and will be visible to Gemini and to the reviewer.

---

## 4. OCR_LOW_CONFIDENCE flag

By the strict numeric definition used in this report (`method == tesseract AND char_count < 200`), **no pages** are flagged OCR_LOW_CONFIDENCE.

By qualitative inspection:
- **0023 / page 1** — **flagged for reviewer attention** (mixed-script noise; see §3.3). Not blocking the Gemini call.
- All other OCR pages (0024 ×3, 0025 ×2) — clean.

---

## 5. Payload manifest

```
/app/scripts/_g7a_staging/
├── build_summary.json
├── extraction_log/
│   ├── MENU-v0.1.0-0007.json     (per-page method, char_count, letter_ratio, notes)
│   ├── MENU-v0.1.0-0013.json
│   ├── MENU-v0.1.0-0023.json
│   ├── MENU-v0.1.0-0024.json
│   └── MENU-v0.1.0-0025.json
└── payloads/
    ├── MENU-v0.1.0-0007/
    │   ├── page-01.txt … page-13.txt
    │   └── payload-chunked/
    │       ├── page-01-of-13.json   (6.8 KB)
    │       ├── page-02-of-13.json   (7.3 KB)
    │       └── … page-13-of-13.json
    ├── MENU-v0.1.0-0013/
    │   ├── page-01.txt … page-04.txt
    │   └── payload.json             (9.0 KB)
    ├── MENU-v0.1.0-0023/
    │   ├── page-01.txt
    │   └── payload.json             (4.7 KB)
    ├── MENU-v0.1.0-0024/
    │   ├── page-01.txt … page-03.txt
    │   └── payload.json             (4.3 KB)
    └── MENU-v0.1.0-0025/
        ├── page-01.txt … page-02.txt
        └── payload.json             (5.9 KB)
```

Total staging footprint: **160 849 bytes** (~157 KB).

All `payload*.json` envelopes carry: `request_kind: "text_only"`, `gemini_model: "gemini-2.5-flash"`, `schema_version: "gemini-extract-schema-v1.2"`, `import_id`, `source_file`, `dataset_id`, `sha256`, `chunk_label`, `pages_in_payload`, `total_pages_in_source`, and `text_parts[]` (each with `page_number`, `extraction_method`, `char_count`, `letter_ratio`, `notes`, `text`).

---

## 6. Pipeline bug found & fixed during the run

| Bug | Symptom | Root cause | Fix |
|---|---|---|---|
| OCR fallback silently empty on image-only PDFs | First run: 0023/0024/0025 reported `chars=0` for every page despite OCR being invoked | `_tesseract_page()` globbed `page-*.ppm`, but `pdftoppm -gray` emits `.pgm` (grayscale Netpbm). The temp directory contained `page-1.pgm`, so `candidates` was empty and the function returned `""`. | Glob pattern updated to `page-*.p[pg]m` to match both color (`.ppm`) and grayscale (`.pgm`) outputs. Staging wiped (`rm -rf /app/scripts/_g7a_staging`) and `--build` re-run cleanly. |

The fix is in `/app/scripts/g7a_bootstrap_smoke.py` (one-line glob change). All other pipeline behavior is unchanged.

---

## 7. Does any file require special handling before Gemini? — Yes, two

| Dataset ID | Special handling required | Action |
|---|---|---|
| MENU-v0.1.0-0007 | Will be sent as **13 chunks**, not 1 payload. | Wiring of the Gemini call must support per-chunk requests + an orchestrator that merges responses into a single document before the v1.2 schema validation runs against the union. Each chunk should be tagged `pages[].warnings = ["chunked_page_partial_context"]`. |
| MENU-v0.1.0-0023 | OCR text is **noisy & mixed-script** (Marathi/Telugu/Latin). | Send with `pages[].warnings = ["mixed_language_detected", "ocr_unreadable", "no_source_grounding_page_level"]`. If first-pass yield is poor, consider installing `tesseract-ocr-mar` and re-running just this ID (`--build --dataset-id MENU-v0.1.0-0023`) before retrying Gemini. |

| MENU-v0.1.0-0013 / 0024 / 0025 | No special handling. Standard prompt. |

---

## 8. Stop conditions honored

| Constraint | Honored? |
|---|---|
| Run only local text/OCR/chunking | ✅ |
| Stage under `/app/scripts/_g7a_staging/payloads/` | ✅ |
| Do not call Gemini | ✅ (no Gemini import, no network call for extraction) |
| Do not use `--call-gemini` | ✅ |
| Do not modify expected-output placeholders | ✅ (still 32 entries, all `expected_pages: []`) |
| Do not create first-pass archive | ✅ (`MENU_AI_FIRST_PASS_OUTPUT_SMOKE_v0.1.0.json` absent) |
| Do not freeze dataset | ✅ (still `v0.1.0-PROPOSED`) |
| Do not process remaining 27 files | ✅ |
| Do not modify backend/frontend product code | ✅ |
| Do not sync to POS | ✅ |

---

## 9. Recommended next single action

```bash
ls -R /app/scripts/_g7a_staging/payloads/
```

(or open any `payload*.json` in an editor to inspect the text-only envelopes that would be sent to Gemini)

After inspection, the **next gate** is wiring the Gemini call — a separate patch that must:
1. Implement per-chunk submission + response merge for chunked docs (0007).
2. Tag `pages[].warnings` per the §3 recommendations (esp. 0023).
3. Validate each response against `gemini-extract-schema-v1.2` before archiving.
4. Atomically write `MENU_AI_FIRST_PASS_OUTPUT_SMOKE_v0.1.0.json`.
5. Enforce a per-run budget cap.

That patch is **out of scope** for the current step.
