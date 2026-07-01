# MyGenie POS — Zip-Based Dataset Ingestion (Phase 0C Option 1)

**Document version:** 1.0
**Status:** Adopted as the **default Phase 0C ingestion method** (2026-01) per owner decision: "I will upload 30 menus in a zip file — it's a one-time job."
**Supersedes for Phase 0C:** the Google Drive service-account route (`GOOGLE_DRIVE_DATASET_INGESTION_SPEC.md`), which is **deferred** to a later phase if/when ongoing dataset growth requires it.

---

## 1. Why zip-via-chat for Phase 0C

- **One-time** dataset prep — ~30 menus, frozen once Sunil reviews.
- **No live integration** code needed (no Drive API client, no SA management).
- **Zero credential surface** — no key to mint, audit, rotate, retire.
- **Phase 1 production system unaffected** — restaurants will still upload menu files directly via the live Upload Service; Drive was only ever the dataset-prep path.
- Drive path remains documented in `GOOGLE_DRIVE_DATASET_INGESTION_SPEC.md` as a future option if the dataset grows or becomes recurring.

---

## 2. Required inputs from owner

| Item | What to provide | How |
|---|---|---|
| Zip file containing menus | One `.zip` archive, ≤ ~200 MB total | Attach to chat; tell agent "zip uploaded — proceed with Phase 0C execution" |
| Allowed file types inside zip | `.pdf`, `.jpg`, `.jpeg`, `.png` only | Other types are inventoried as `unsupported` and not processed |
| Per-file size cap | ≤ 25 MB per file | Larger files are inventoried as `oversized` and not processed |
| Folder structure | Free-form; recursive walk | Agent ignores folder layout for processing; preserves it as `notes` for traceability |
| Naming | Free-form | Agent renames to canonical path in controlled storage |
| Stratification target | 10 simple / 10 medium / 5 complex / 5 variant-or-addon | Owner aims for the mix; agent classifies + reports the actual mix found |

---

## 3. Agent processing pipeline (what runs after zip upload)

```
Owner uploads <menus.zip>  (chat asset)
        │
        ▼
1. Agent calls get_assets_tool to retrieve the zip
        │
        ▼
2. Validate envelope:
     - is a real zip
     - total size ≤ env limit
     - SHA-256 hash of the zip itself (recorded for reproducibility)
        │
        ▼
3. Unzip into controlled storage:
     /app/datasets/menus_raw/{dataset_version}/{sha256_of_file}/{sanitized_original_name}
     where dataset_version = "v0.1.0-<ISO timestamp>"
        │
        ▼
4. For each extracted file:
     - SHA-256 hash
     - MIME sniff (magic-byte) — must match allow-list (pdf | jpeg | png)
     - size validation (≤ 25 MB)
     - dedup within zip (same SHA-256 → mark `duplicate`, keep first)
     - classify: SIMPLE_MENU / MEDIUM_MENU / COMPLEX_MENU / VARIANT_MENU /
       ADDON_MENU / PDF_TEXT_MENU / PDF_SCANNED_MENU /
       IMAGE_CLEAR_MENU / IMAGE_POOR_QUALITY_MENU /
       TAX_NOTE_MENU / REGIONAL_INDIAN_MENU / EDGE_CASE_MENU
       (rule-based heuristics; refined by reviewer later)
        │
        ▼
5. Produce three artifacts:
     - dataset_manifest_v0.1.0.csv  (every file inventoried)
     - dataset_split_proposal_v0.1.0.csv  (set memberships:
         SMOKE / PHASE1_GOLDEN / STRESS / LEARNING_MEMORY / PHASE2_PARKING)
     - one expected-output JSON per menu in Smoke + Phase 1 Golden + Stress
       + Learning Memory sets — metadata pre-filled, expected_pages blank,
       awaiting Sunil's review
        │
        ▼
6. Surface inventory + split proposal to owner for sign-off
        │
        ▼
7. STOP. No Gemini call. No extraction. No model invocation.
   Build Phase 2 only begins after:
     - Sunil completes expected-output reviews
     - dataset_version is frozen
     - D-6 / D-7 / Gates 1–7 closed (already done)
```

---

## 4. Storage layout

```
/app/datasets/
  └── menus_raw/
      └── v0.1.0-2026-01-22T10:00Z/
          ├── _meta/
          │   ├── source_zip.sha256                # hash of original zip
          │   ├── dataset_manifest_v0.1.0.csv
          │   └── dataset_split_proposal_v0.1.0.csv
          ├── <sha256_of_file>/<sanitized_name>.pdf
          ├── <sha256_of_file>/<sanitized_name>.jpg
          └── ...
      └── expected_outputs/
          └── v0.1.0-2026-01-22T10:00Z/
              ├── <dataset_id>.expected.json       # one per menu in golden sets
              └── ...
```

- Files are **not** modified after extraction (read-only after unzip).
- The original zip's SHA is preserved so the dataset version is reproducible.
- Sanitized names are simply: trim, collapse whitespace, replace `/` and control chars with `_`.

---

## 5. Manifest CSV columns (`dataset_manifest_v0.1.0.csv`)

```
dataset_id,
dataset_version,
zip_internal_path,         # original path inside the zip
file_name,                 # sanitized name on disk
file_type,                 # pdf | image
mime_type,                 # application/pdf | image/jpeg | image/png
size_bytes,
sha256,
processing_status,         # inventoried | classified | duplicate | unsupported | oversized | failed
classification,            # one or more of the 12 dataset categories (semicolon-separated)
proposed_set_membership,   # one or more of SMOKE | PHASE1_GOLDEN | STRESS | LEARNING_MEMORY | PHASE2_PARKING
notes
```

This file is committed to controlled storage under `_meta/` for the dataset version — never to git.

---

## 6. What is NOT done in this flow

- ❌ No Gemini call.
- ❌ No image preprocessing (deskew/contrast/etc. is Build Phase 2's responsibility).
- ❌ No expected-output values are filled in by the agent (those are reviewer-only).
- ❌ No file is uploaded to S3 (Phase 1 = local only per G-4).
- ❌ No Drive interaction (deferred).
- ❌ No fine-tuning, no model training.

---

## 7. Failure modes

| Failure | Behavior |
|---|---|
| Zip is not a valid zip | Reject; ask owner to re-upload. |
| Zip exceeds env size limit | Reject; ask owner to split or compress. |
| Single file inside zip is corrupted | Mark `failed`; continue with rest. |
| Single file unsupported MIME | Mark `unsupported`; continue. |
| Single file oversized | Mark `oversized`; continue. |
| Duplicate SHA inside zip | Mark `duplicate` on the second occurrence; continue. |
| Total file count < 30 or stratification badly off | Inventory completes; agent reports the mix and asks owner whether to proceed or upload supplements. |
| Total file count >> 30 | All files inventoried and classified; agent proposes which 30 to use for `v0.1.0` based on stratification; surplus goes into a "next-version" pool. |

The whole inventory **never aborts** because of a single bad file.

---

## 8. Security posture (zip path)

- Zip is treated like any uploaded asset: **MIME-sniffed**, **size-bounded**, **virus-scan hook** (no-op in pre-prod, real adapter in prod).
- Inside-zip files are **never executed**; we only hash + classify + read for metadata.
- No public sharing. No public URLs. Storage is local PVC.
- The platform's chat-asset retrieval is the only ingest pathway; nothing reaches the open internet.

---

## 9. Effect on H-rows + open questions

| ID | Status after zip-decision |
|---|---|
| **H-1** Drive folder ID | **DEFERRED** for Phase 0C (re-open if Phase 2+ needs Drive ingestion) |
| **H-2** Service account credential | **DEFERRED** for Phase 0C — **but still revoke the previously leaked key as security hygiene** (independent matter) |
| **H-3** Dataset size = 30 (any 30, stratified) | ✅ Closed |
| **H-4** Reviewer = Sunil | ✅ Closed |
| **H-5** Storage = local PVC Phase 1 | ✅ Closed |
| **H-11 (NEW)** Dataset upload method | ✅ Closed = **zip-via-chat asset, one-shot** |

---

## 10. Owner trigger phrase

When the zip is attached, owner says exactly:

> **"zip uploaded — proceed with Phase 0C execution"**

That phrase tells the agent to switch from planning to dataset ingestion (which is file management, not extraction or Gemini). The agent stops at "manifest + split proposal + empty expected-output skeletons ready for Sunil's review." Build Phase 2 stays gated until Sunil completes review and freezes the dataset version.
