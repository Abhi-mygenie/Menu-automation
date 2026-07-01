# MyGenie POS · Menu Import — Golden Dataset Split (OWNER-APPROVED) v0.1.0

**Dataset version:** `v0.1.0-PROPOSED`
**Split status:** ✅ **OWNER-APPROVED with amendments — 2026-05** (Gate G6 closed)
**Dataset freeze status:** 🔴 **NOT FROZEN** (still PROPOSED at folder level until Gate G9)
**Generator:** Phase 0C Dataset Deliverables Reconstruction Agent (read-only, heuristic-based)
**Source inventory:** `MENU_DATASET_INVENTORY_v0.1.0_PROPOSED.md` (32 accepted unique files)

> **Approval trail:** Owner reviewed the original proposal (31-file Learning Memory) and amended Learning Memory down to 12 curated files representative of six specific test axes. All other sets kept as proposed. Second reviewer **explicitly waived** for v0.1.0 in the same approval. See `MENU_DATASET_OWNER_APPROVAL_STATUS_v0.1.0.md` and `PHASE_0_DECISION_LOG.md §7`.

---

## 1. Set-membership summary (POST-AMENDMENT)

| Set | Target size | Approved size | Selection rule |
|---|---:|---:|---|
| Smoke Set | ~5 | **5** | 5 smallest accepted files (likely SIMPLE & clean) — *kept as proposed* |
| Phase 1 Golden Set | ~20 | **20** | 20 mid-sized accepted files (excluding Smoke & Stress) — *kept as proposed* |
| Stress Set | ~5–20 | **6** | top-5 largest + any `LIKELY_SCANNED_PDF_HEURISTIC` hits — *kept as proposed* |
| Learning Memory Set | ~10 | **12** | **CURATED** (owner amendment) — 12 files mapped 1-to-1 against 6 correction-memory test axes (regional naming, OCR/spelling, wrong category, wrong price, missing price, confusing layout) |
| Phase 2 Parking Set | ~5–10 | **0** (TBD by Sunil) | variant/add-on heavy menus — *kept as proposed; Sunil populates during review* |

**Total accepted available:** 32. Multi-set membership is allowed.

---

## 2. Stratification (size-bucket heuristic, LOW confidence)

Per H-3 the target was 10 / 10 / 5 / 5. Without content probes, we approximate using size buckets — Sunil reviews and confirms during expected-output filling.

| Bucket | Heuristic mapping | Count |
|---|---|---:|
| TINY / SMALL (< 1.5 MB) → likely SIMPLE | covers 10 simple slots | 10 |
| MEDIUM (1.5 – 6 MB) → likely MEDIUM | covers 10 medium slots | 12 |
| LARGE (≥ 6 MB) → likely COMPLEX | covers 5 complex slots | 10 |
| VARIANT/ADDON-heavy | UNKNOWN — Sunil populates Phase 2 Parking | TBD |

---

## 3. Smoke Set (APPROVED)

**Set id:** `SMOKE`
**Selection rule:** 5 smallest accepted files (likely SIMPLE & clean source)
**Confidence:** MEDIUM
**Status:** ✅ APPROVED 2026-05.

| dataset_id | source_file | size_bytes | rationale |
|---|---|---:|---|
| `MENU-v0.1.0-0007` | `Ghatkesar family dhaba.pdf` | 64,936 | tiny size; likely simple, clean |
| `MENU-v0.1.0-0023` | `sona chadi.pdf` | 133,899 | tiny size; likely simple, clean |
| `MENU-v0.1.0-0013` | `Akula Organics.pdf` | 255,378 | tiny size; likely simple, clean |
| `MENU-v0.1.0-0024` | `south indian dishes.pdf` | 317,191 | tiny size; likely simple, clean |
| `MENU-v0.1.0-0025` | `spicy.pdf` | 319,522 | tiny size; likely simple, clean |

---

## 4. Phase 1 Golden Set (APPROVED)

**Set id:** `PHASE1_GOLDEN`
**Selection rule:** 20 mid-sized accepted files (excluding Smoke & Stress); sorted ascending by size
**Confidence:** LOW–MEDIUM (size buckets only; SIMPLE/MEDIUM mix not verified)
**Status:** ✅ APPROVED 2026-05.

| dataset_id | source_file | size_bytes | rationale |
|---|---|---:|---|
| `MENU-v0.1.0-0026` | `ECOZEN NATURAL RHINO MENU 2024-1.pdf` | 441,882 | tiny size; likely simple, clean |
| `MENU-v0.1.0-0022` | `simla menu.pdf` | 505,917 | small; likely simple |
| `MENU-v0.1.0-0009` | `Henchu_Cafe_Menu_8th August_14th August.pdf` | 705,477 | small; likely simple |
| `MENU-v0.1.0-0030` | `vatika.pdf` | 1,249,259 | small; likely simple |
| `MENU-v0.1.0-0032` | `Militia eatery.pdf` | 1,254,235 | small; likely simple |
| `MENU-v0.1.0-0008` | `Green Way 2025.pdf` | 1,470,440 | small; likely simple |
| `MENU-v0.1.0-0014` | `Andhra Bhojanam.pdf` | 1,659,902 | mid-sized; likely medium |
| `MENU-v0.1.0-0003` | `Thirumalai.pdf` | 2,139,745 | mid-sized; likely medium |
| `MENU-v0.1.0-0001` | `Shree Krishna.pdf` | 2,734,778 | mid-sized; likely medium |
| `MENU-v0.1.0-0015` | `annavaya.pdf` | 2,993,182 | mid-sized; likely medium |
| `MENU-v0.1.0-0027` | `fish house.pdf` | 3,050,157 | mid-sized; likely medium |
| `MENU-v0.1.0-0010` | `the Tasty table_update price.pdf` | 3,144,705 | mid-sized; likely medium |
| `MENU-v0.1.0-0021` | `Rhino.pdf` | 3,295,264 | mid-sized; likely medium |
| `MENU-v0.1.0-0017` | `MASALA KITCHEN-MENU-PRICE UPDATE.pdf` | 4,294,195 | mid-sized; likely medium |
| `MENU-v0.1.0-0018` | `MD Green Food.pdf` | 5,585,390 | mid-sized; likely medium |
| `MENU-v0.1.0-0002` | `Sushi Cafe_update menu.pdf` | 5,740,261 | mid-sized; likely medium |
| `MENU-v0.1.0-0028` | `food fusion menu 2025 a3_compressed.pdf` | 6,157,427 | large; likely complex / many pages |
| `MENU-v0.1.0-0006` | `Forkfuel Menu.pdf` | 6,410,421 | large; likely complex / many pages |
| `MENU-v0.1.0-0004` | `tamil.pdf` | 6,480,886 | large; likely complex / many pages |
| `MENU-v0.1.0-0012` | `11 CAFE.pdf` | 6,877,655 | large; likely complex / many pages |

---

## 5. Stress Set (APPROVED)

**Set id:** `STRESS`
**Selection rule:** Top-5 largest accepted files + any with `LIKELY_SCANNED_PDF_HEURISTIC` filename hint
**Confidence:** MEDIUM
**Status:** ✅ APPROVED 2026-05 (kept as proposed).

| dataset_id | source_file | size_bytes | rationale |
|---|---|---:|---|
| `MENU-v0.1.0-0011` | `,,THE SINGHS MANU 2025-3.pdf` | 42,047,352 | very large; likely complex / scanned |
| `MENU-v0.1.0-0029` | `tribe gate.pdf` | 15,893,258 | very large; likely complex / scanned |
| `MENU-v0.1.0-0019` | `Madhu-Menu-1.pdf` | 13,963,346 | very large; likely complex / scanned |
| `MENU-v0.1.0-0005` | `the-mill-final.pdf` | 13,520,317 | very large; likely complex / scanned |
| `MENU-v0.1.0-0033` | `menu tandoori lab [Recovered] copy.pdf` | 10,645,594 | LIKELY_SCANNED_PDF_HEURISTIC + very large |
| `MENU-v0.1.0-0016` | `M.R SINGH_20250130_160537_0000.pdf` | 9,709,848 | LIKELY_SCANNED_PDF_HEURISTIC (timestamped filename) |

---

## 6. Learning Memory Set (CURATED — APPROVED)

**Set id:** `LEARNING_MEMORY`
**Selection rule:** **OWNER-AMENDED** — trimmed from 31 (filename-regex hits) to 12 curated files mapped 1-to-1 against the 6 correction-memory test axes from the owner's amendment.
**Confidence:** MEDIUM (file selection deterministic from filename signals; semantic value to be confirmed by Sunil)
**Status:** ✅ APPROVED 2026-05.

### Test-axis coverage matrix

| Test axis (owner) | Files |
|---|---|
| repeated OCR / spelling correction | 0009, 0011, 0016, 0033 (4) |
| wrong category correction | 0028, 0002 (2) |
| wrong price correction | 0017, 0010 (2) |
| missing price correction | _surfaces during Sunil's review on tiny / poor-quality files; no separate dedicated entry — see note below_ |
| regional Indian menu naming | 0014, 0004, 0024 (3) |
| confusing layout / source grounding | 0019, 0011 (2; 0011 dual-purpose) |

**Total:** 12 files (0011 covers 2 axes; rest are unique to a primary axis).

### File list

| dataset_id | source_file | size_bytes | primary test axis | rationale |
|---|---|---:|---|---|
| `MENU-v0.1.0-0014` | `Andhra Bhojanam.pdf` | 1,659,902 | regional Indian menu naming | Telugu/Andhra cuisine vocabulary; canonical regional category names. |
| `MENU-v0.1.0-0004` | `tamil.pdf` | 6,480,886 | regional Indian menu naming | Tamil cuisine naming; distinct script/transliteration patterns. |
| `MENU-v0.1.0-0024` | `south indian dishes.pdf` | 317,191 | regional Indian menu naming | Explicit South Indian cuisine; concise pattern bank. |
| `MENU-v0.1.0-0019` | `Madhu-Menu-1.pdf` | 13,963,346 | confusing layout / source grounding | Large Indian menu, multi-column layout likely. |
| `MENU-v0.1.0-0011` | `,,THE SINGHS MANU 2025-3.pdf` | 42,047,352 | OCR / spelling correction **+** confusing layout | Leading commas + 'MANU' typo (≠ 'MENU'); 42 MB suggests scanned multi-page. |
| `MENU-v0.1.0-0017` | `MASALA KITCHEN-MENU-PRICE UPDATE.pdf` | 4,294,195 | wrong price correction | Filename literally says 'PRICE UPDATE' — captures price-correction memory. |
| `MENU-v0.1.0-0010` | `the Tasty table_update price.pdf` | 3,144,705 | wrong price correction | Companion to 0017; second sample point for price-correction memory. |
| `MENU-v0.1.0-0009` | `Henchu_Cafe_Menu_8th August_14th August.pdf` | 705,477 | OCR / spelling correction | Date-stamped operational menu; transliterated 'Henchu' likely needs spelling fix. |
| `MENU-v0.1.0-0016` | `M.R SINGH_20250130_160537_0000.pdf` | 9,709,848 | OCR / spelling correction | Timestamped filename = phone-camera scan; OCR error correction. |
| `MENU-v0.1.0-0033` | `menu tandoori lab [Recovered] copy.pdf` | 10,645,594 | OCR / spelling correction | '[Recovered] copy' = degraded source; OCR/spelling correction. |
| `MENU-v0.1.0-0028` | `food fusion menu 2025 a3_compressed.pdf` | 6,157,427 | wrong category correction | 'fusion' = ambiguous cuisine; tests cross-cuisine category learning. |
| `MENU-v0.1.0-0002` | `Sushi Cafe_update menu.pdf` | 5,740,261 | wrong category correction | Japanese cuisine inside Indian-dominant corpus; cross-cuisine category test. |

### Note on `missing_price_correction` axis

The owner's 6th test axis (missing-price correction) is hard to pre-select from filenames alone — missing prices typically surface during the *act of reading* a low-quality or partial menu. This axis is expected to surface **organically during Sunil's expected-output review** on smaller / lower-quality files such as `Ghatkesar family dhaba.pdf` (64 KB), `sona chadi.pdf` (134 KB), or `Akula Organics.pdf` (255 KB). When Sunil encounters a row with an unprintable / missing price, he flags `missing_price` in `expected_warnings` (per the controlled list in the reviewer brief) and that row becomes the natural training point for missing-price correction memory. **No additional dedicated file is needed** for this axis.

---

## 7. Phase 2 Parking Set (APPROVED — empty proposal)

**Set id:** `PHASE2_PARKING`
**Selection rule:** Variant / add-on-heavy menus — cannot be inferred from filename or size; **must be identified by Sunil during review**
**Confidence:** NONE — agent did not select any; Sunil populates this set
**Status:** ✅ APPROVED 2026-05 (kept as proposed; population deferred to Sunil).

_(empty in this proposal — to be populated by Sunil during review)_

---

## 8. Files NOT placed in any set (overflow / spare)

After the Learning Memory amendment, one previously LM-only file is now an unattached spare:

| dataset_id | source_file | size_bytes | reason | Status |
|---|---|---:|---|---|
| `MENU-v0.1.0-0020` | `Makhna_menu.pdf` (batch-04 original) | 10,314,531 | Was only in Learning Memory under the original 31-file proposal. The owner's curated 12 did not include it. Did not qualify for top-5 Stress and was excluded from Phase 1 Golden by size-threshold. | OVERFLOW — available as a **Phase 2 Parking** candidate (Sunil's call) or a **v0.1.1 Stress Set** candidate. Owner may amend later if needed. |

> Note: `MENU-v0.1.0-0031` (`Makhna_menu.pdf` in batch-07) is the SHA-256 duplicate of `0020` and was previously excluded from accepted-set counts and from this split (see `MENU_DATASET_INVENTORY_v0.1.0_PROPOSED.md §3`).

---

## 9. Coverage gaps (record before freeze)

- **Image format menus** (`IMAGE_CLEAR_MENU` / `IMAGE_POOR_QUALITY_MENU`) — **0 files**. Deferred to v0.1.1.
- **Tax-note menus** (`TAX_NOTE_MENU`) — 0 files matched filename hint. Sunil may upgrade individual files during review.
- **Variant / add-on menus** — UNKNOWN until Sunil reads files; populates Phase 2 Parking.
- **PDF text-layer vs scanned** — not probed (`pdftotext` / `pdfinfo` not installed); Sunil to mark per file during review.
- **Missing-price corpus point** — no dedicated file pre-selected; expected to surface organically during Sunil's review (see §6 note).

---

## 10. Owner approval section (CLOSED — Gate G6 ✅)

| Field | Value |
|---|---|
| Owner sign-off | ✅ **APPROVED with amendments** |
| Sign-off date | 2026-05 |
| Sign-off by | Owner (recorded in `PHASE_0_DECISION_LOG.md §7`) |
| Original approval message | _"v0.1.0 split approved with amendment: keep Smoke=5, Phase 1 Golden=20, Stress as proposed, trim Learning Memory to ~10–12 curated for 6 test axes, keep Phase 2 Parking as proposed, dataset stays PROPOSED not frozen, waive second reviewer for v0.1.0, key revoked."_ |
| Amendments applied | Learning Memory trimmed 31 → 12 (curated); Phase 2 Parking left empty for Sunil; all other sets unchanged. |
| Second reviewer | **WAIVED for v0.1.0** (Gate G8 ✅ closed by owner) |
| Leaked GCP key (`bug-intake@…`, key id `ad8c4a3857158b4aa34be710f862ea4f221a42b1`) | **REVOKED** (owner-confirmed) |

> The split is now binding. Sunil may begin G7 (expected-output review) using `MENU_DATASET_REVIEWER_PACKAGE_SUNIL_v0.1.0.md`.

---

— END —
