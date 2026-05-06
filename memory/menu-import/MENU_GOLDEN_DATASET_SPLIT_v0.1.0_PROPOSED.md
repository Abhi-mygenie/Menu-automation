# MyGenie POS · Menu Import — Golden Dataset Split (PROPOSED) v0.1.0

**Dataset version:** `v0.1.0-PROPOSED`
**Status:** **PROPOSED — NOT FROZEN**
**Generated:** 2026-05-06T16:50:12+00:00
**Generator:** Phase 0C Dataset Deliverables Reconstruction Agent (read-only, heuristic-based)
**Source inventory:** `MENU_DATASET_INVENTORY_v0.1.0_PROPOSED.md` (32 accepted unique files)

> ⚠️ **Confidence disclaimer.** Without text-layer / page-count / content probes, the split below is a *heuristic* proposal based on filename hints + file-size buckets. Sunil **must** confirm or amend the split during review. The same file **may** appear in multiple sets (this is expected and called out in `MENU_DATASET_AGENT_HANDOFF.md` Step 6).

> The 10 / 10 / 5 / 5 stratification (10 simple + 10 medium + 5 complex + 5 variant-or-addon-heavy) cannot be deterministically applied here because **VARIANT_MENU / ADDON_MENU classification requires reading file content**, which this agent does not do. The Phase 2 Parking Set is therefore **proposed empty** and Sunil/owner identifies its members during review.

## 1. Set-membership summary

| Set | Target size | Proposed size | Selection rule |
|---|---:|---:|---|
| Smoke Set | ~5 | **5** | 5 smallest accepted files (likely SIMPLE & clean) |
| Phase 1 Golden Set | ~20 | **20** | 20 mid-sized accepted files (excluding Smoke & Stress) |
| Stress Set | ~5–20 | **6** | top-5 largest + any `LIKELY_SCANNED_PDF_HEURISTIC` hits |
| Learning Memory Set | ~10 | **31** | filename hint = `REGIONAL_INDIAN_MENU` |
| Phase 2 Parking Set | ~5–10 | **0** (TBD by Sunil) | variant/add-on heavy menus — cannot be detected from filename + size alone |

**Total accepted available:** 32. Multi-set membership is allowed, so total set-row count > 32.

## 2. Stratification proposal (size-bucket heuristic, LOW confidence)

Per H-3 the target is 10 / 10 / 5 / 5. Without content probes, we approximate using size buckets.

| Bucket | Heuristic mapping | Count |
|---|---|---:|
| TINY / SMALL (< 1.5 MB) → likely SIMPLE | covers 10 simple slots | 11 |
| MEDIUM (1.5 – 6 MB) → likely MEDIUM | covers 10 medium slots | 10 |
| LARGE (≥ 6 MB) → likely COMPLEX | covers 5 complex slots | 11 |
| VARIANT/ADDON-heavy | UNKNOWN — Sunil to identify | TBD |

## 3. Smoke Set (PROPOSED)

**Set id:** `SMOKE`
**Selection rule:** 5 smallest accepted files (likely SIMPLE & clean source)
**Confidence:** MEDIUM (size signal is reliable for 'small'; layout simplicity not verified)
**Status:** PROPOSED — pending Sunil's confirmation.

| dataset_id | source_file | size_bytes | classification (auto) | rationale |
|---|---|---:|---|---|
| `MENU-v0.1.0-0007` | `Ghatkesar family dhaba.pdf` | 64,936 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_TINY | tiny size; likely simple, clean |
| `MENU-v0.1.0-0023` | `sona chadi.pdf` | 133,899 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_TINY | tiny size; likely simple, clean |
| `MENU-v0.1.0-0013` | `Akula Organics.pdf` | 255,378 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_TINY | tiny size; likely simple, clean |
| `MENU-v0.1.0-0024` | `south indian dishes.pdf` | 317,191 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_TINY | tiny size; likely simple, clean |
| `MENU-v0.1.0-0025` | `spicy.pdf` | 319,522 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_TINY | tiny size; likely simple, clean |

## 4. Phase 1 Golden Set (PROPOSED)

**Set id:** `PHASE1_GOLDEN`
**Selection rule:** 20 mid-sized accepted files; Smoke + Stress excluded; sorted ascending by size
**Confidence:** LOW–MEDIUM (size buckets only; SIMPLE/MEDIUM mix not verified)
**Status:** PROPOSED — pending Sunil's confirmation.

| dataset_id | source_file | size_bytes | classification (auto) | rationale |
|---|---|---:|---|---|
| `MENU-v0.1.0-0026` | `ECOZEN NATURAL RHINO MENU 2024-1.pdf` | 441,882 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_TINY | tiny size; likely simple, clean |
| `MENU-v0.1.0-0022` | `simla menu.pdf` | 505,917 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | small; likely simple |
| `MENU-v0.1.0-0009` | `Henchu_Cafe_Menu_8th August_14th August.pdf` | 705,477 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | small; likely simple |
| `MENU-v0.1.0-0030` | `vatika.pdf` | 1,249,259 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | small; likely simple |
| `MENU-v0.1.0-0032` | `Militia eatery.pdf` | 1,254,235 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | small; likely simple |
| `MENU-v0.1.0-0008` | `Green Way 2025.pdf` | 1,470,440 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | small; likely simple |
| `MENU-v0.1.0-0014` | `Andhra Bhojanam.pdf` | 1,659,902 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | mid-sized; likely medium complexity |
| `MENU-v0.1.0-0003` | `Thirumalai.pdf` | 2,139,745 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | mid-sized; likely medium complexity |
| `MENU-v0.1.0-0001` | `Shree Krishna.pdf` | 2,734,778 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | mid-sized; likely medium complexity |
| `MENU-v0.1.0-0015` | `annavaya.pdf` | 2,993,182 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | mid-sized; likely medium complexity |
| `MENU-v0.1.0-0027` | `fish house.pdf` | 3,050,157 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | mid-sized; likely medium complexity |
| `MENU-v0.1.0-0010` | `the Tasty table_update price.pdf` | 3,144,705 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | mid-sized; likely medium complexity |
| `MENU-v0.1.0-0021` | `Rhino.pdf` | 3,295,264 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | mid-sized; likely medium complexity |
| `MENU-v0.1.0-0017` | `MASALA KITCHEN-MENU-PRICE UPDATE.pdf` | 4,294,195 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | mid-sized; likely medium complexity |
| `MENU-v0.1.0-0018` | `MD Green Food.pdf` | 5,585,390 | PDF_TEXT_OR_SCANNED_UNKNOWN, SIZE_BUCKET_MEDIUM | mid-sized; likely medium complexity |
| `MENU-v0.1.0-0002` | `Sushi Cafe_update menu.pdf` | 5,740,261 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | mid-sized; likely medium complexity |
| `MENU-v0.1.0-0028` | `food fusion menu 2025 a3_compressed.pdf` | 6,157,427 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | large; likely complex / many pages |
| `MENU-v0.1.0-0006` | `Forkfuel Menu.pdf` | 6,410,421 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | large; likely complex / many pages |
| `MENU-v0.1.0-0004` | `tamil.pdf` | 6,480,886 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | large; likely complex / many pages |
| `MENU-v0.1.0-0012` | `11 CAFE.pdf` | 6,877,655 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | large; likely complex / many pages |

## 5. Stress Set (PROPOSED)

**Set id:** `STRESS`
**Selection rule:** Top-5 largest accepted files + any with `LIKELY_SCANNED_PDF_HEURISTIC` filename hint
**Confidence:** MEDIUM (size + filename signal; actual scan/text-layer not probed)
**Status:** PROPOSED — pending Sunil's confirmation.

| dataset_id | source_file | size_bytes | classification (auto) | rationale |
|---|---|---:|---|---|
| `MENU-v0.1.0-0011` | `,,THE SINGHS MANU 2025-3.pdf` | 42,047,352 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_LARGE | very large; likely complex / scanned / Stress |
| `MENU-v0.1.0-0029` | `tribe gate.pdf` | 15,893,258 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_LARGE | very large; likely complex / scanned / Stress |
| `MENU-v0.1.0-0019` | `Madhu-Menu-1.pdf` | 13,963,346 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_LARGE | very large; likely complex / scanned / Stress |
| `MENU-v0.1.0-0005` | `the-mill-final.pdf` | 13,520,317 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_LARGE | very large; likely complex / scanned / Stress |
| `MENU-v0.1.0-0033` | `menu tandoori lab [Recovered] copy.pdf` | 10,645,594 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, LIKELY_SCANNED_PDF_HEURISTIC, SIZE_BUCKET_LARGE | very large; likely complex / scanned / Stress |
| `MENU-v0.1.0-0016` | `M.R SINGH_20250130_160537_0000.pdf` | 9,709,848 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, LIKELY_SCANNED_PDF_HEURISTIC, SIZE_BUCKET_MEDIUM | large; likely complex / many pages |

## 6. Learning Memory Set (PROPOSED)

**Set id:** `LEARNING_MEMORY`
**Selection rule:** Files matching `REGIONAL_INDIAN_MENU` filename heuristic — likely to repeat spelling / category patterns useful for correction-memory testing
**Confidence:** MEDIUM (filename hint match deterministic; semantic value not verified)
**Status:** PROPOSED — pending Sunil's confirmation.

| dataset_id | source_file | size_bytes | classification (auto) | rationale |
|---|---|---:|---|---|
| `MENU-v0.1.0-0001` | `Shree Krishna.pdf` | 2,734,778 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | mid-sized; likely medium complexity |
| `MENU-v0.1.0-0002` | `Sushi Cafe_update menu.pdf` | 5,740,261 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | mid-sized; likely medium complexity |
| `MENU-v0.1.0-0003` | `Thirumalai.pdf` | 2,139,745 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | mid-sized; likely medium complexity |
| `MENU-v0.1.0-0004` | `tamil.pdf` | 6,480,886 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | large; likely complex / many pages |
| `MENU-v0.1.0-0005` | `the-mill-final.pdf` | 13,520,317 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_LARGE | very large; likely complex / scanned / Stress |
| `MENU-v0.1.0-0006` | `Forkfuel Menu.pdf` | 6,410,421 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | large; likely complex / many pages |
| `MENU-v0.1.0-0007` | `Ghatkesar family dhaba.pdf` | 64,936 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_TINY | tiny size; likely simple, clean |
| `MENU-v0.1.0-0008` | `Green Way 2025.pdf` | 1,470,440 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | small; likely simple |
| `MENU-v0.1.0-0009` | `Henchu_Cafe_Menu_8th August_14th August.pdf` | 705,477 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | small; likely simple |
| `MENU-v0.1.0-0010` | `the Tasty table_update price.pdf` | 3,144,705 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | mid-sized; likely medium complexity |
| `MENU-v0.1.0-0011` | `,,THE SINGHS MANU 2025-3.pdf` | 42,047,352 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_LARGE | very large; likely complex / scanned / Stress |
| `MENU-v0.1.0-0012` | `11 CAFE.pdf` | 6,877,655 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | large; likely complex / many pages |
| `MENU-v0.1.0-0013` | `Akula Organics.pdf` | 255,378 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_TINY | tiny size; likely simple, clean |
| `MENU-v0.1.0-0014` | `Andhra Bhojanam.pdf` | 1,659,902 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | mid-sized; likely medium complexity |
| `MENU-v0.1.0-0015` | `annavaya.pdf` | 2,993,182 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | mid-sized; likely medium complexity |
| `MENU-v0.1.0-0016` | `M.R SINGH_20250130_160537_0000.pdf` | 9,709,848 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, LIKELY_SCANNED_PDF_HEURISTIC, SIZE_BUCKET_MEDIUM | large; likely complex / many pages |
| `MENU-v0.1.0-0017` | `MASALA KITCHEN-MENU-PRICE UPDATE.pdf` | 4,294,195 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | mid-sized; likely medium complexity |
| `MENU-v0.1.0-0019` | `Madhu-Menu-1.pdf` | 13,963,346 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_LARGE | very large; likely complex / scanned / Stress |
| `MENU-v0.1.0-0020` | `Makhna_menu.pdf` | 10,314,531 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_LARGE | very large; likely complex / scanned / Stress |
| `MENU-v0.1.0-0021` | `Rhino.pdf` | 3,295,264 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | mid-sized; likely medium complexity |
| `MENU-v0.1.0-0022` | `simla menu.pdf` | 505,917 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | small; likely simple |
| `MENU-v0.1.0-0023` | `sona chadi.pdf` | 133,899 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_TINY | tiny size; likely simple, clean |
| `MENU-v0.1.0-0024` | `south indian dishes.pdf` | 317,191 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_TINY | tiny size; likely simple, clean |
| `MENU-v0.1.0-0025` | `spicy.pdf` | 319,522 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_TINY | tiny size; likely simple, clean |
| `MENU-v0.1.0-0026` | `ECOZEN NATURAL RHINO MENU 2024-1.pdf` | 441,882 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_TINY | tiny size; likely simple, clean |
| `MENU-v0.1.0-0027` | `fish house.pdf` | 3,050,157 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | mid-sized; likely medium complexity |
| `MENU-v0.1.0-0028` | `food fusion menu 2025 a3_compressed.pdf` | 6,157,427 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_MEDIUM | large; likely complex / many pages |
| `MENU-v0.1.0-0029` | `tribe gate.pdf` | 15,893,258 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_LARGE | very large; likely complex / scanned / Stress |
| `MENU-v0.1.0-0030` | `vatika.pdf` | 1,249,259 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | small; likely simple |
| `MENU-v0.1.0-0032` | `Militia eatery.pdf` | 1,254,235 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, SIZE_BUCKET_SMALL | small; likely simple |
| `MENU-v0.1.0-0033` | `menu tandoori lab [Recovered] copy.pdf` | 10,645,594 | PDF_TEXT_OR_SCANNED_UNKNOWN, REGIONAL_INDIAN_MENU, LIKELY_SCANNED_PDF_HEURISTIC, SIZE_BUCKET_LARGE | very large; likely complex / scanned / Stress |

## 7. Phase 2 Parking Set (PROPOSED)

**Set id:** `PHASE2_PARKING`
**Selection rule:** Variant / add-on-heavy menus — cannot be inferred from filename or size; **must be identified by Sunil during review**
**Confidence:** NONE — agent did not select any; Sunil populates this set
**Status:** PROPOSED — pending Sunil's confirmation.

_(empty in this proposal — to be populated by Sunil during review)_

## 8. Files NOT placed in any set

_(none — every accepted file appears in at least one set)_

## 9. Coverage gaps (record before freeze)

- **Image format menus** (`IMAGE_CLEAR_MENU` / `IMAGE_POOR_QUALITY_MENU`) — **0 files**. Deferred to v0.1.1.
- **Tax-note menus** (`TAX_NOTE_MENU`) — 0 files matched filename hint. Sunil may upgrade individual files during review.
- **Variant / add-on menus** — UNKNOWN until Sunil reads files.
- **PDF text-layer vs scanned** — not probed (tools unavailable).

## 10. Owner approval section

> The owner reviews this proposal, optionally amends set memberships, then either approves or returns it. **Approval here is a prerequisite to Sunil starting the expected-output review.**

| Field | Value |
|---|---|
| Owner sign-off | ⬜ pending |
| Owner amendments (free-text) | _none yet_ |
| Sign-off date | _pending_ |
| Sign-off by | _pending_ |

**Approval format (paste into chat):**
> _"v0.1.0 split approved as proposed"_  (or with explicit amendments)

Until owner approves, **this split is non-binding** and Sunil should not start filling expected outputs.

— END —