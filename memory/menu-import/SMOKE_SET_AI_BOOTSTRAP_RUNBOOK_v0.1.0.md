# Smoke Set AI Bootstrap Runbook — v0.1.0

> Operator runbook for **G7A only** against the 5 Smoke Set PDFs.
> Read-only against dataset placeholders. No Gemini call in this runbook.

---

## 1. Pre-conditions

- [x] Branch: `7-may`
- [x] Dataset: `v0.1.0-PROPOSED` present at `/app/datasets/menus_raw/v0.1.0-PROPOSED/`
- [x] Schema patched to v1.2 (`gemini-extract-schema-v1.2`)
- [x] System tools installed (`pdftotext`, `pdfinfo`, `pdftoppm`, `tesseract` w/ `eng+hin+tel`)
- [x] Script present: `/app/scripts/g7a_bootstrap_smoke.py`
- [ ] Pre-flight passing (run command in §3)

---

## 2. Smoke Set inventory

```
MENU-v0.1.0-0007  Ghatkesar family dhaba.pdf       batch-02
MENU-v0.1.0-0013  Akula Organics.pdf                batch-03
MENU-v0.1.0-0023  sona chadi.pdf                    batch-05
MENU-v0.1.0-0024  south indian dishes.pdf           batch-05
MENU-v0.1.0-0025  spicy.pdf                         batch-05
```

The script resolves these from `MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json`
and verifies SHA-256 against the on-disk file before extraction.

---

## 3. Steps

### 3.1 Pre-flight

```bash
python3 /app/scripts/g7a_bootstrap_smoke.py --preflight
```

Expected output:

- `ok: true`
- All `tool:*` checks pass
- `tesseract-lang:eng/hin/tel` all pass
- `schema-version` = 1.2
- `schema-pages-warnings` = present
- `schema-category-inferred` = present
- 5 entries under `smoke_set` (one per Smoke ID, with `page_count` and `sha256_prefix`)

If any blocking check fails, stop and fix it. Do not proceed to build.

### 3.2 Text + OCR build (all 5 IDs)

```bash
python3 /app/scripts/g7a_bootstrap_smoke.py --build
```

This will:
1. For each Smoke PDF, page-by-page:
   - Run `pdftotext -layout` for that page.
   - If output is < 80 chars or letter-ratio < 0.35, rasterize via `pdftoppm -r 300 -gray` and OCR with `tesseract -l eng+hin+tel --psm 6`.
2. Aggregate per-page text + metadata.
3. If total payload > 25 000 chars, emit per-page chunks under `payload-chunked/`.
4. Write everything under `/app/scripts/_g7a_staging/`:
   - `payloads/<ID>/page-NN.txt`
   - `payloads/<ID>/payload.json` (or `payload-chunked/page-NN-of-MM.json`)
   - `extraction_log/<ID>.json`
   - `build_summary.json`

### 3.3 Single-ID dry run (optional)

```bash
python3 /app/scripts/g7a_bootstrap_smoke.py --build --dataset-id MENU-v0.1.0-0025
```

Use this to iterate on a single PDF without re-processing all 5.

### 3.4 Gemini call — GATED

```bash
python3 /app/scripts/g7a_bootstrap_smoke.py --call-gemini   # ← raises NotImplementedError
```

This is intentionally not wired up. Wiring it on requires:

1. Owner approval of the staged payloads under `_g7a_staging/`.
2. A separate patch to `g7a_bootstrap_smoke.py` that:
   - Uses `emergentintegrations` (or `google-genai`) to call `gemini-2.5-flash`.
   - Enforces `json_schema_version = gemini-extract-schema-v1.2` and the strict JSON output mode.
   - Validates each response against the schema *before* archiving.
   - Atomically writes the immutable archive
     `/app/memory/menu-import/MENU_AI_FIRST_PASS_OUTPUT_SMOKE_v0.1.0.json`
     (write to `.tmp`, then `os.replace`).
3. A budget cap and a per-document retry policy (§7.2 of the Gemini playbook).

Until that patch lands, `--call-gemini` MUST raise.

---

## 4. What this runbook does NOT do

- Does not modify `MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json`.
- Does not freeze the dataset.
- Does not write to `menu_imports` collection (no backend work in scope).
- Does not extend to Learning Memory or Eval Hold-out PDFs.
- Does not delete or move source PDFs.
- Does not send a vision/PDF attachment to Gemini — text-only payloads only.

---

## 5. Failure modes & recovery

| Symptom | Likely cause | Recovery |
|---|---|---|
| `Smoke ID … not found in placeholders.` | Placeholder file was modified | Restore placeholder file; re-run pre-flight. |
| `SHA256 mismatch for … vs placeholder=…` | A Smoke PDF was modified or replaced | Restore the original PDF; do NOT update the placeholder SHA without owner sign-off. |
| `pdftotext_insufficient(...) -> ocr` notes appear for almost every page | The PDF is image-only / scanned | Expected. OCR fallback should produce text. If OCR also yields < 80 chars, the page is genuinely blank/unreadable; capture as `empty_page` or `ocr_unreadable` in the eventual model output. |
| Per-page chunking triggered for a Smoke PDF | Payload > 25 000 chars | Expected for the 13-page menus. Chunks are written under `payload-chunked/`. |
| `tesseract: No such file or directory` | apt deps not installed | Re-run `apt-get install -y poppler-utils tesseract-ocr tesseract-ocr-{eng,hin,tel}`. |

---

## 6. Audit trail

After every `--build` run, the operator should commit the resulting files
under `/app/scripts/_g7a_staging/extraction_log/` to the repo so that the
next agent can reconstruct the pipeline state without re-running OCR.

The staged `payloads/` directory is a build artifact and need not be
committed — it can be regenerated from the source PDFs at any time.
