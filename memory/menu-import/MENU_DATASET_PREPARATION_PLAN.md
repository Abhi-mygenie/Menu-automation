# MyGenie POS — Menu Dataset Preparation Plan (Phase 0C)

**Document version:** 1.0
**Status:** Draft — pending owner approval of Phase 0C
**Phase placement:** Phase 0C, between Phase 0B (Gemini Integration Playbook) and Build Phase 2 (Extraction).
**Audience:** Owner, Menu Dataset Preparation Agent, QA, Pilot operations.
**Scope:** Planning only. **No Google Drive access yet. No secrets. No real menus processed.**

---

## 1. Purpose

Build a **production-grade evaluation dataset** of real restaurant menus that lets us:

1. Test extraction quality across formats / cuisines / complexities.
2. Tune the versioned prompt + parser/normalizer rules.
3. Validate the correction-memory loop (corrections are stored, reused, and never corrupt global rules).
4. Produce **production-readiness evidence** before pilot rollout.
5. Maintain a **golden dataset** that future regression runs measure against.

Without this dataset, Build Phase 2 (Extraction) cannot begin.

---

## 2. Why this is **NOT** ML fine-tuning

Phase 1 of the Production Release uses **Gemini 3 Pro / Flash as-is**. We do not retrain or fine-tune the model. The dataset is used purely for:

- **Prompt engineering** — measure prompt v1, v2, v3 against ground truth.
- **Parser rule tuning** — calibrate currency stripping, unit detection, food-type mapping, etc.
- **Correction-memory validation** — prove the learning loop works on repeatable patterns.
- **Regression detection** — catch quality drops on every PR.
- **Holdout evaluation** — final exam before any pilot restaurant onboards.

This distinction matters because fine-tuning would require legal review on data rights, much larger volumes, and a different infra path. We avoid all of that by using Gemini in zero-shot / structured-output mode and measuring with a curated golden set.

---

## 3. Phase 0C Placement (Authoritative Sequence)

```
Phase 0A — POS Menu API Discovery        ✅ DONE (POS Sync still blocked)
Phase 0B — Gemini Integration Playbook   ⏳ PENDING (integration_playbook_expert_v2)
Phase 0C — Menu Dataset Preparation      ⏳ THIS PLAN (must complete before Build Phase 2)
─────────────────────────────────────────────────────────────────────────────
Build Phase 1 — Foundation               ✅ CAN START (POS-independent + dataset-independent)
Build Phase 2 — Extraction               ❌ BLOCKED until Phase 0B + Phase 0C complete
Build Phase 3–5                          (depend on Phase 2)
Build Phase 6 — POS Sync                 ❌ BLOCKED until POS contract confirmed (Phase 0A)
Build Phase 7–8                          (depend on Phase 6)
```

**Rule:** Phase 0C and Phase 0B can run in parallel; both are gates on Build Phase 2.

---

## 4. Google Drive Service-Account Ingestion (Source of Dataset)

The owner provides menu files via a **single Google Drive folder** (or a tree of subfolders) shared with a **service account** in read-only mode. This module ingests files **once per dataset version** and copies them to controlled storage.

### 4.1 High-level flow (planning only — not implemented)

```
Owner Drive folder (shared read-only with service account)
        │
        ▼
Inventory job (read-only Drive API)
        │ enumerate files + metadata
        ▼
Classifier (rule-based)
        │ assigns dataset categories
        ▼
Copy job (read original, write to controlled storage)
        │ pre-prod → /app/datasets/menus_raw/
        │ prod → s3://mygenie-menu-datasets-{env}/
        ▼
Manifest write (menu_import_dataset_manifest table + manifest.csv)
        │
        ▼
Human review pass (golden expected outputs filled in)
        │
        ▼
Dataset version frozen → consumed by extraction tests
```

Full Drive ingestion details: see `GOOGLE_DRIVE_DATASET_INGESTION_SPEC.md`.

### 4.2 Hard rules

- **Service account credential is NEVER committed to the repo.** It lives at a path or secret reference declared via env var.
- Drive files are **never mutated** — read-only access.
- Files are copied (not linked) to controlled storage so dataset evaluation is reproducible if Drive content changes.
- Every ingest run produces a **dataset_version** stamp.

---

## 5. Required Environment Variables

Documented here for reference. **Values are NOT in this document. Secrets are NOT committed.**

| Variable | Purpose | Example shape |
|---|---|---|
| `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_PATH` | Path to mounted service-account JSON | `/etc/secrets/menu-dataset-sa.json` |
| `GOOGLE_DRIVE_DATASET_FOLDER_ID` | Drive folder ID owner shared with service account | (opaque ID string) |
| `MENU_DATASET_LOCAL_STORAGE_PATH` | Local controlled dataset storage path (pre-prod) | `/app/datasets/menus_raw/` |
| `MENU_DATASET_S3_BUCKET` | Object storage bucket (prod) | `mygenie-menu-datasets-prod` |
| `MENU_DATASET_S3_REGION` | S3 region | per Phase 0 G-4 decision |
| `MENU_DATASET_ALLOWED_MIME_TYPES` | Comma-separated allowed MIMEs | `application/pdf,image/jpeg,image/png` |
| `MENU_DATASET_MAX_FILE_SIZE_MB` | Hard cap per file | `25` |
| `MENU_DATASET_VERSION_TAG` | Optional override for dataset_version | `v0.1.0-2026-01` |

> Storage path on local disk in pre-prod uses a PVC (per Phase 0 P1-5 default).

---

## 6. Folder / File Discovery Process

1. Resolve `GOOGLE_DRIVE_DATASET_FOLDER_ID` from env.
2. List files under the folder (recursive across subfolders).
3. For each entry, capture metadata (see §7).
4. Reject files outside `MENU_DATASET_ALLOWED_MIME_TYPES`; mark them `unsupported` (not deleted).
5. Reject files larger than `MENU_DATASET_MAX_FILE_SIZE_MB`; mark them `oversized`.
6. Compute SHA-256 checksum after download to detect duplicates and changes.
7. Persist inventory rows to `menu_import_dataset_manifest`.

---

## 7. File Metadata Fields (per inventoried file)

| Field | Description |
|---|---|
| `dataset_id` | Internal identifier (UUID/BIGSERIAL) |
| `dataset_version` | Stamp for the ingest run, e.g., `v0.1.0-2026-01-22T10:00Z` |
| `drive_file_id` | Google Drive file id (opaque) |
| `file_name` | Drive file name (original) |
| `file_type` | `pdf | image | other` |
| `mime_type` | e.g., `application/pdf`, `image/jpeg` |
| `size_bytes` | Bytes |
| `sha256` | Content hash (post-download) |
| `modified_time` | Drive `modifiedTime` |
| `source_folder` | Drive folder path or root id |
| `local_storage_path` | Path in pre-prod controlled storage |
| `storage_ref` | S3 key in prod |
| `processing_status` | `inventoried | classified | copied | unsupported | oversized | duplicate | failed` |
| `classification` | One or more dataset categories (see §9) |
| `notes` | Free text from classifier or human reviewer |
| `created_at` / `updated_at` | Timestamps |

The PostgreSQL home for this is the existing `menu_import_dataset_manifest` table (`MENU_IMPORT_MVP_DB_SCHEMA.md §3.15`). It will be extended with `dataset_version`, `drive_file_id`, `sha256`, `modified_time`, `source_folder`, `local_storage_path`, `storage_ref`, `processing_status`, `classification[]`, `notes` at Build Phase 1 schema time. (The ALTER will be additive; documented here only.)

---

## 8. Checksum + Versioning

- Every file is hashed (SHA-256) **after** download/copy to controlled storage.
- A file with the same `(sha256)` already inventoried under a previous `dataset_version` is marked `duplicate` (not deleted).
- Duplicate handling extends to fuzzy duplicates only at the **menu-import** runtime layer (live import dedup). For dataset prep, `(file_name, size_bytes)` collisions are also flagged.
- A new `dataset_version` is created **per ingest run**. Existing files in storage are not overwritten; new copies live under `dataset_version`-prefixed paths to keep historical reproducibility.
- Golden datasets reference `(dataset_id, dataset_version)` pairs. A frozen golden set is not re-derived from a new ingest.

---

## 9. Dataset Categories (Classification Taxonomy)

Each menu can have one or more categories. A rule-based classifier assigns them based on file metadata + post-extraction signals; a human reviewer corrects in the manifest before freezing.

1. **SIMPLE_MENU** — Clean category + item + single price.
2. **MEDIUM_MENU** — Multiple categories, mixed layout, some formatting issues.
3. **COMPLEX_MENU** — Multiple columns, combo sections, notes, unclear layout.
4. **VARIANT_MENU** — Half/full, S/M/L, quarter/half/full pricing.
5. **ADDON_MENU** — Extra toppings, add-on pricing, modifiers.
6. **PDF_TEXT_MENU** — PDF with selectable text.
7. **PDF_SCANNED_MENU** — PDF requiring OCR.
8. **IMAGE_CLEAR_MENU** — Clear menu photo/image.
9. **IMAGE_POOR_QUALITY_MENU** — Tilted, blurry, bad lighting, low OCR quality.
10. **TAX_NOTE_MENU** — Menu has GST/service charge/tax notes.
11. **REGIONAL_INDIAN_MENU** — Common Indian dishes, OCR spelling issues, Hindi/English mix if present.
12. **EDGE_CASE_MENU** — Missing prices, multiple prices, item descriptions, combo meals, inconsistent category placement.

A menu in **`SIMPLE_MENU + REGIONAL_INDIAN_MENU + IMAGE_CLEAR_MENU`** is, for example, a clean photo of a basic Indian café menu — useful for `Smoke Set`. A menu in **`COMPLEX_MENU + PDF_SCANNED_MENU + TAX_NOTE_MENU`** belongs to `Stress Set`.

---

## 10. Recommended Initial Dataset Size — 30 menus

| Bucket | Count | Use |
|---|---|---|
| Simple menus | 10 | Smoke + Phase 1 Golden |
| Medium menus | 10 | Phase 1 Golden + Stress |
| Complex menus | 5 | Stress |
| Variant / add-on menus | 5 | **Phase 2 Parking Set** — flagging only in Phase 1 |

> The owner can grow these counts in subsequent ingests; 30 is the minimum to evaluate Phase 1 thresholds with statistical comfort. Phase 2 expansion may target 100+ menus.

---

## 11. Golden Dataset Splits

A single menu may belong to multiple sets if useful (e.g., a complex Indian menu can be in both `Stress Set` and `Learning Memory Set`).

### 11.1 Smoke Set (≈ 5 menus)
- All `SIMPLE_MENU`, ideally `IMAGE_CLEAR_MENU` or `PDF_TEXT_MENU`.
- Used for fast PR-time checks (< 2 min total runtime against stub Gemini).
- Pass/fail criteria are tight (≥ 95% on item name + price).

### 11.2 Phase 1 Golden Set (≈ 20 menus)
- Mix: 10 simple + 10 medium.
- Focus: category, item name, rate extraction.
- Source provenance must hold for every row.
- Used for accuracy regression on every PR touching prompt / normalizer / extractor.

### 11.3 Stress Set (≈ 20 menus, drawn from broader pool)
- Mix: complex + poor-quality images + scanned PDFs + tax-note menus.
- Used for nightly run + monthly hold-out evaluations.
- Lower targets, but **hallucination must remain at 0** for critical fields.

### 11.4 Learning Memory Set (≈ 10 menus)
- Menus where repeated patterns can be tested:
  - Same item with different OCR spellings across pages.
  - Same category mislabel multiple times.
  - Recurrent missing-price flags.
- Used to validate the correction-memory loop end-to-end (see §13).

### 11.5 Phase 2 Parking Set (≈ 5–10 menus)
- Variant + add-on heavy menus.
- In Phase 1, the system **must detect & flag** these patterns (warning chips), but it is **not** required to fully extract variants/add-ons as child rows.
- These menus stress-test Phase 2 readiness without raising Phase 1 expectations.

> Important: Test set + Hold-out set splits described in `MENU_IMPORT_MVP_TEST_STRATEGY.md` are **roles**, not separate datasets. The 30 inventoried menus map onto Smoke / Golden / Stress / Memory / Parking sets; Hold-out is reserved exclusively for release-manager runs and is **frozen** (no engineer reads its expected outputs during tuning).

---

## 12. Expected Output Template (Required)

For every menu in any golden set, a human reviewer fills in an **expected-output JSON** matching the template in `MENU_EXPECTED_OUTPUT_TEMPLATE.json`.

Strict rules:
- **Do not invent expected outputs.** Each row is filled by the reviewer reading the source file.
- Two reviewers per file in `Phase 1 Golden Set` and `Stress Set`; disagreements resolved by a third.
- Once frozen, the expected output is immutable for that `dataset_version`. A correction triggers a new `dataset_version`.

The expected-output schema captures: dataset id, source file ref, page number, category, item name, rate, currency, raw_text reference, expected issue/warning flags, variant/add-on/tax-note flags, confidence expectation, source-grounding required, reviewer + timestamp, free-text notes.

---

## 13. Extraction Evaluation Metrics (linked to rubric)

Full definitions in `MENU_EXTRACTION_EVALUATION_RUBRIC.md`. Summary:

| Metric | Phase 1 production target |
|---|---|
| Item extraction precision | ≥ 90% |
| Item extraction recall | ≥ 90% |
| Price/rate accuracy | ≥ 90% |
| Category accuracy | ≥ 80% |
| Source-grounded rows | ≥ 95% |
| Hallucinated critical rows | **0 tolerance** |
| Variant warning recall (parking set) | ≥ 70% |
| Add-on warning recall (parking set) | ≥ 60% |
| Tax-note warning recall | ≥ 80% |
| Correction-memory reuse accuracy | ≥ 85% |
| Duplicate row rate | ≤ 2% |
| Missing-price flagging accuracy | ≥ 95% |

---

## 14. Correction-Memory Validation Plan

Validates the production-grade learning loop end-to-end **without** corrupting global memory.

Test scenarios (each driven by 1–2 menus from `Learning Memory Set`):

1. **Repeated OCR spelling**
   - Pass 1: extract menu containing `Panner`. Reviewer corrects to `Paneer` on 3 rows.
   - Pass 2: re-extract a similar menu. Expected: `restaurant_id` rule applied; `applied_memory_ids` non-empty; `Panner` → `Paneer` pre-filled.

2. **Wrong category**
   - Pass 1: extractor places "Tomato Soup" under `Starters`. Reviewer corrects to `Soup`.
   - Pass 2: similar item appears. Expected: category suggested as `Soup` (badge: `Suggested`); user can apply or dismiss.

3. **Wrong price (do-not-learn)**
   - Reviewer changes a numeric price 120 → 130. Expected: correction event logged, **but no learning rule created** (per §9.1 of `_LEARNING_MEMORY_SPEC.md`).

4. **Structural price pattern (do-learn)**
   - Original raw_text: `Rs 120/-`. User keeps 120. Expected: a `price_pattern` rule for `/-` is upserted at restaurant scope.

5. **Missing price**
   - User adds price manually via inline edit. Expected: row goes from `missing_price` warning + `review_required` to `approved` after manual fill; correction recorded as `manual_addition` (no learning rule).

6. **Similar item reuse**
   - A previous correction's item name resembles a new row. Expected: the new row's `corrected_item_name` is **not** auto-overwritten (current-session edits not pre-applied to new sessions); but a `Suggested` badge appears.

7. **Anti-overfitting check**
   - One restaurant alone produces 10 corrections of the same `category_mapping`. Expected: cuisine-scope promotion **does NOT** trigger (single-restaurant cap at 40% evidence) until other restaurants confirm.

8. **Global-rule guardrail**
   - Force a candidate global rule via fixtures. Expected: DB constraint `chk_global_requires_admin` rejects `active=true AND scope='global' AND approved_at IS NULL`.

Every scenario produces a deterministic expected outcome documented in the menu's expected-output JSON or in a sibling `*.memory.test.json` file under the dataset.

---

## 15. Privacy + Security Rules

- Menu files may contain restaurant-identifiable information (logo, address, phone). Treat the dataset as **restaurant-scoped, internal-only**.
- No public links. No public sharing of any menu file.
- Service account has read-only Drive access to **only** the designated folder.
- Service account credentials live at `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_PATH`. **Never** committed to the repo.
- All access (list, download, classify) is logged to a dataset audit log: who/what process accessed which file when.
- Cross-restaurant leakage is prevented because dataset prep does not interact with the runtime tenant context; restaurants in production never read the dataset.
- Files in dataset storage are subject to retention policy: 24 months hot, then archive (S3 Glacier in prod). Pre-prod retention: tied to PVC capacity; cleaned up on dataset version rotation.
- Right-to-delete: if a restaurant whose menu is in the dataset is deleted from the platform, the corresponding dataset menus are removed and a new dataset_version is cut.

---

## 16. Phase 2 Parking — What is intentionally NOT processed in Phase 1

The 5 variant/add-on-heavy menus in the recommended initial 30 belong to `Phase 2 Parking Set`. In Phase 1 production:

- The system **must flag** variant patterns (warning code `variant_detected`) and add-on patterns (`possible_addon_detected`).
- The system is **not required** to populate `menu_import_row_variants` / `menu_import_row_addons` correctly during Phase 1 evaluation.
- The Review UI does not surface variant/add-on side panels in Phase 1 (per release scope).
- These menus exist to confirm Phase 1 doesn't crash on them, doesn't hallucinate variants as items, and produces actionable warnings.

When Phase 2 begins, the Parking Set becomes part of the active golden set with stricter targets.

---

## 17. Approval Gates for Phase 0C

| Gate | What is approved | Document |
|---|---|---|
| 0C.1 | Owner provides Drive folder ID + grants service account read-only access | (out of band) |
| 0C.2 | Service account credential mount path agreed and provisioned (not in repo) | Owner Decision Sheet rows H-1, H-2 |
| 0C.3 | Initial dataset size 30 with split 10/10/5/5 confirmed | Owner Decision Sheet H-3 |
| 0C.4 | Human-review owner identified for filling expected outputs | Owner Decision Sheet H-4 |
| 0C.5 | Storage target: local PVC pre-prod / S3 prod confirmed | Owner Decision Sheet H-5 |
| 0C.6 | Inventory + classification + manifest produced for `dataset_version v0.1.0` | Manifest in DB + CSV |
| 0C.7 | Expected outputs filled, peer-reviewed, frozen | Reviewer sign-off log |
| 0C.8 | Smoke + Phase 1 Golden + Learning Memory sets selected and frozen | Manifest tags |

When 0C.1–0C.8 close, **Phase 0C is complete** and Build Phase 2 (Extraction) is unblocked (subject to Phase 0B Gemini playbook also closed).

---

## 18. Summary

- Phase 0C is a **mandatory** step before Build Phase 2.
- Source: a Google Drive folder shared read-only with a service account.
- Output: 30-menu inventory + classified manifest + frozen golden expected outputs + dataset_version stamp.
- The dataset is for **evaluation, not training**.
- Phase 0C runs **in parallel** with Phase 0B (Gemini Playbook).
- **Build Phase 1 (Foundation) is not gated by Phase 0C** — it can start now.
- **Build Phase 2 (Extraction) is gated by Phase 0B + Phase 0C**.
- **Build Phase 6 (POS Sync) remains blocked** until Phase 0A POS contract is confirmed.
