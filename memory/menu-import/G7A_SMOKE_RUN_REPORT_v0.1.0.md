# G7A Smoke Set Run Report — v0.1.0

> Append-only log of every G7A run against the 5 Smoke Set PDFs.
> Updated by `g7a_bootstrap_smoke.py` operators (manual entry).
> Pre-Gemini runs are recorded as `kind: text_build`. Once the Gemini call is
> wired up, those runs are recorded as `kind: gemini_first_pass`.

---

## Schema of each entry

```yaml
run_id: <ISO-8601 UTC timestamp + short hash>
kind: text_build | gemini_first_pass
schema_version: gemini-extract-schema-v1.x
script_revision: <git short SHA or N/A>
dataset_ids: [MENU-v0.1.0-XXXX, ...]
outcome: pass | partial | fail
halt_reason: <free text> | null
artifacts:
  - <path>
notes: |
  <free text>
```

---

## Run #1 — text_build (initial bootstrap in canonical workspace) — COMPLETED

```yaml
run_id: 2026-05-11T18:48Z-build1
kind: text_build
schema_version: gemini-extract-schema-v1.2
script_revision: pre-commit (glob fix applied mid-run; pdftoppm -gray emits .pgm not .ppm)
dataset_ids:
  - MENU-v0.1.0-0007   # 13 pages, 32569 chars, 13-chunk split
  - MENU-v0.1.0-0013   #  4 pages,  6226 chars, single payload
  - MENU-v0.1.0-0023   #  1 page,   1116 chars, OCR (mixed-script, noisy)
  - MENU-v0.1.0-0024   #  3 pages,  2700 chars, OCR (clean English)
  - MENU-v0.1.0-0025   #  2 pages,  3638 chars, OCR (clean English)
outcome: pass
halt_reason: null  # build complete; awaiting owner approval to wire --call-gemini
artifacts:
  - /app/scripts/_g7a_staging/build_summary.json
  - /app/scripts/_g7a_staging/extraction_log/MENU-v0.1.0-{0007,0013,0023,0024,0025}.json
  - /app/scripts/_g7a_staging/payloads/MENU-v0.1.0-0007/payload-chunked/page-NN-of-13.json (×13)
  - /app/scripts/_g7a_staging/payloads/MENU-v0.1.0-{0013,0023,0024,0025}/payload.json
  - /app/memory/menu-import/G7A_SMOKE_STAGING_REPORT_RUN1_v0.1.0.md
metrics:
  total_pages: 23
  total_chars: 46249
  total_payload_count: 17        # 13 chunks (0007) + 4 single payloads
  total_payload_bytes: 68364
  text_layer_pages: 17           # 5 clean pdftotext + 12 pdftotext-low (false positives)
  ocr_pages: 6                   # 0023 ×1 + 0024 ×3 + 0025 ×2
  ocr_low_confidence_pages: 0    # by strict <200-char rule
  qualitative_low_conf: ["MENU-v0.1.0-0023 page 1 (mixed-script noise)"]
notes: |
  Build succeeded for all 5 Smoke Set PDFs. One pipeline bug found and fixed
  mid-run: pdftoppm -gray emits .pgm (grayscale Netpbm), not .ppm; the original
  glob in g7a_bootstrap_smoke.py missed the file. After fix (glob → page-*.p[pg]m),
  staging was wiped and re-run cleanly.

  Special handling required before Gemini:
    - 0007: 13-chunk submission; orchestrator must merge per-chunk responses.
    - 0023: send with pages[].warnings=[mixed_language_detected, ocr_unreadable,
            no_source_grounding_page_level]; if low yield, install
            tesseract-ocr-mar and rerun --build --dataset-id MENU-v0.1.0-0023.

  Full per-page metrics and recommendations in:
    G7A_SMOKE_STAGING_REPORT_RUN1_v0.1.0.md
```

### Pre-Run #1 historical context (different workspace; not committed to 7-may)

```text
The previously discussed runs #1–#4 happened in a different workspace and
were not committed to 7-may. Per the ChatGPT thread their outcomes were:

  - Run #1: prompt iteration on full PDF/vision payload (not reproducible here).
  - Run #2: schema v1 rejected `category_inferred` row issues — drove the
            v1.1 patch.
  - Run #3: schema v1.1 still rejected page-level `mixed_language_detected`,
            `multi_column_confusion`, etc. attached to pages — drove the
            v1.2 patch (pages[].warnings).
  - Run #4: 0007 hit three upstream 502s on the 13-page full payload;
            0023/0013 produced model output but failed v1.1 validation
            because pages[].warnings was not allowed; 0024/0025 not reached.

Those four runs are RECORDED HISTORICALLY for continuity but were not
observed in this canonical workspace. They are NOT counted as actual G7A
runs against this branch. The first canonical run on 7-may is Run #1 above.
```

---

## Run #2 onward

(append below)
