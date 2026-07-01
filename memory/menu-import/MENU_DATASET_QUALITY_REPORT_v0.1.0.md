# MyGenie POS · Menu Import — Dataset Quality Report v0.1.0

**Dataset version:** `v0.1.0-PROPOSED` (NOT frozen)
**Generated:** 2026-05-06T16:49:04+00:00
**Source:** `/app/datasets/menus_raw/v0.1.0-PROPOSED/`
**Generator:** Phase 0C Dataset Deliverables Reconstruction Agent (read-only)

## 1. Executive verdict

**🟡 YELLOW — Dataset is technically sufficient (32 accepted ≥ 30 target) but has known coverage gaps (no images, no scanned/text-layer probe).** Ready for **Sunil's expected-output review** once owner approves the proposed split.

## 2. Headline counts

| Metric | Value |
|---|---|
| Total files found | **33** |
| Supported files (allowed MIME) | **33** (100% — all PDF) |
| Unsupported files | **0** |
| Duplicate files (SHA-256) | **1** |
| **Accepted files** (non-duplicate, supported) | **32** |
| 30-menu target (H-3) | ✅ **MET** (32 ≥ 30) |

## 3. File-type distribution

| Type | Count | % |
|---|---:|---:|
| `application/pdf` | 33 | 100.0% |
| `image/jpeg` | 0 | 0.0% |
| `image/png` | 0 | 0.0% |
| Other / unsupported | 0 | 0.0% |

## 4. PDF-only limitation & image-format gap

> ⚠️ **CRITICAL COVERAGE NOTE — record before freeze:**
> - The corpus is **100% PDF**.
> - Set classifications **`IMAGE_CLEAR_MENU`** and **`IMAGE_POOR_QUALITY_MENU`** (defined in `MENU_DATASET_PREPARATION_PLAN.md` and the expected-output template) are **NOT covered in v0.1.0**.
> - **Image coverage is deferred to a future `v0.1.1`** unless the owner instructs otherwise.
> - Build Phase 2 evaluation against image inputs will therefore not be possible until `v0.1.1` is added.

## 5. Expected OCR difficulty (size-bucket heuristic — LOW confidence)

Without `pdftotext`/`pdfinfo`, OCR difficulty is approximated from file size only. Sunil to confirm or adjust per file.

| Bucket | Count | Implication |
|---|---:|---|
| TINY (<500 KB) | 6 | very few pages or simple layout — likely SIMPLE |
| SMALL (500 KB – 3 MB) | 9 | moderate — likely SIMPLE / MEDIUM |
| MEDIUM (3 MB – 10 MB) | 11 | many pages or moderate scan DPI — likely MEDIUM / COMPLEX |
| LARGE (≥ 10 MB) | 7 | many pages or high-DPI scan — likely COMPLEX / Stress Set |

**Tools needed to upgrade confidence:** install `poppler-utils` (provides `pdftotext`, `pdfinfo`) on the dataset-prep environment, or have Sunil mark `pdf_text` vs `pdf_scanned` for each file.

## 6. Heuristic category distribution (filename-derived, LOW–MEDIUM confidence)

| Heuristic class | Count (of accepted) | Confidence |
|---|---:|---|
| `REGIONAL_INDIAN_MENU` (filename hint) | 31 | MEDIUM |
| `LIKELY_SCANNED_PDF_HEURISTIC` (timestamps / `Recovered` / `copy`) | 2 | LOW |
| `TAX_NOTE_MENU` (filename token `gst`/`tax`/`vat`) | 0 | MEDIUM |
| `VARIANT_MENU` / `ADDON_MENU` | UNKNOWN | requires reading content |
| `SIMPLE` / `MEDIUM` / `COMPLEX` | UNKNOWN (size-bucketed only) | LOW |

## 7. 30-menu target check (per H-3, recommended split 10/10/5/5)

- **Available accepted:** 32
- **Target:** 30 (10 SIMPLE / 10 MEDIUM / 5 COMPLEX / 5 VARIANT-or-ADDON-heavy)
- **Verdict:** ✅ Numerically sufficient (32 ≥ 30, with 2 spares).
- **Caveat:** the 10/10/5/5 stratification cannot be definitively assigned from filename + size alone. The proposed split (`MENU_GOLDEN_DATASET_SPLIT_v0.1.0_PROPOSED.md`) uses heuristics and **explicitly requires Sunil to confirm or amend** before freeze.

## 8. Readiness verdict

| Gate | Verdict |
|---|---|
| Files exist on disk | ✅ |
| Inventory written | ✅ (this run) |
| Quality report written | ✅ (this file) |
| Split proposed | ✅ (`MENU_GOLDEN_DATASET_SPLIT_v0.1.0_PROPOSED.md`) |
| Expected-output placeholders generated | ✅ (`MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json`) |
| Sunil's expected outputs filled | ❌ pending |
| Second reviewer assigned | ❌ pending nomination |
| Owner approves split | ❌ pending |
| Owner triggers freeze | ❌ pending |
| Image format coverage (jpg/png) | ❌ deferred to v0.1.1 |
| Text-layer probe (PDF_TEXT vs PDF_SCANNED) | ⚠️ tool unavailable — Sunil to mark per file |

## 9. Remaining blockers

1. **Sunil's expected-output review** — placeholders ready; reviewer to fill `expected_pages[]` per `MENU_EXPECTED_OUTPUT_TEMPLATE.json` rules.
2. **Second reviewer** — recommended in `MENU_DATASET_PREPARATION_PLAN.md §11` for Phase 1 Golden + Stress sets; owner to nominate or explicitly waive in `PHASE_0_DECISION_LOG.md`.
3. **Owner sign-off on the proposed split** — see `MENU_DATASET_OWNER_APPROVAL_STATUS_v0.1.0.md`.
4. **Image-format coverage gap (v0.1.0)** — defer to v0.1.1 (recommendation) or owner direction.
5. **Leaked GCP key revocation** (`PHASE_0_DECISION_LOG.md §2`) — independent security-hygiene blocker; not technically blocking the dataset freeze, but listed for visibility.
6. **Build Phase 2 remains blocked** until items 1–3 close and the dataset is frozen.

— END —