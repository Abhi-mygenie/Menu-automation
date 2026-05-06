# MyGenie POS · Menu Import — Reviewer Package for Sunil — v0.1.0

**Reviewer:** Sunil (primary; second reviewer **waived** for v0.1.0)
**Dataset version:** `v0.1.0-PROPOSED` — split is owner-approved; dataset itself NOT yet frozen.
**Begin status:** ✅ **CLEARED TO START** (Gate G6 closed 2026-05; G8 waived)
**You finish:** Gate G7 (expected-output review); the agent then waits for the owner's freeze command (G9).

---

## 1. The single most important rule

> **You are the source of truth for what the AI extractor must produce on this dataset.** Build Phase 2 will be graded against the file you produce. Take your time, cite verbatim source text, and flag uncertainty rather than guessing.

You may not call Gemini, run extraction code, or freeze the dataset. Only the owner triggers freeze (G9).

---

## 2. The package — what's in your hands

| File | Role |
|---|---|
| `MENU_DATASET_REVIEWER_PACKAGE_SUNIL_v0.1.0.md` | **This file** — your start kit. |
| `MENU_DATASET_REVIEWER_HANDOFF_SUNIL_v0.1.0.md` | Detailed instructions: required fields, warning code list, unclear-row handling, do-not list. **Read this in full before opening any PDF.** |
| `MENU_GOLDEN_DATASET_SPLIT_v0.1.0_PROPOSED.md` | **Owner-approved** set memberships. Sections 3 (Smoke) → 7 (Phase 2 Parking). Tells you which file goes in which set. |
| `MENU_EXPECTED_OUTPUT_TEMPLATE.json` | The schema you fill (per-row, per-page). Has the canonical `rules_for_reviewer`. |
| `MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json` | **The file you edit.** 32 entries pre-filled with metadata + set memberships; `expected_pages` is empty for you to populate. |
| `MENU_DATASET_INVENTORY_v0.1.0_PROPOSED.md` | Per-file metadata (size, sha256, classification hints). Reference. |
| `MENU_EXTRACTION_EVALUATION_RUBRIC.md` | How your work will be used to grade Build Phase 2. Reference. |

The PDFs themselves are at `/app/datasets/menus_raw/v0.1.0-PROPOSED/`.

---

## 3. Review priority order (do not skip ahead)

| Priority | Set | Files | Why this order |
|---|---|---:|---|
| **P1** | Smoke Set | 5 | Validates the whole pipeline end-to-end. Done first so the team can lock the schema before you spend hours on harder files. |
| **P2** | Phase 1 Golden Set | 20 | Primary accuracy benchmark for the pilot release. |
| **P3** | Stress Set | 6 | Edge cases (large / scanned). Build Phase 2 must handle these to declare "production-ready". |
| **P4** | Learning Memory Set | 12 | Specifically chosen for correction-memory testing — see §5 below. |
| **P5** | Phase 2 Parking Set | (TBD) | While going through P1–P4, **flag any file you find variant- or add-on-heavy** and ask the owner to add it here. |

A file may belong to multiple sets — fill its expected output once; metadata tracks all memberships.

**Spare:** `MENU-v0.1.0-0020 Makhna_menu.pdf` is currently in **no set**. If during P3/P4 you decide it's a strong Phase 2 Parking candidate (variant/add-on heavy) or a Stress addition, surface that to the owner.

---

## 4. Smoke Set (start here — 5 files)

The 5 smallest-size files. Tackle these first end-to-end:

| dataset_id | source_file | size |
|---|---|---:|
| `MENU-v0.1.0-0007` | `Ghatkesar family dhaba.pdf` | 64 KB |
| `MENU-v0.1.0-0023` | `sona chadi.pdf` | 134 KB |
| `MENU-v0.1.0-0013` | `Akula Organics.pdf` | 255 KB |
| `MENU-v0.1.0-0024` | `south indian dishes.pdf` | 317 KB |
| `MENU-v0.1.0-0025` | `spicy.pdf` | 320 KB |

After completing the Smoke Set, do a sync with the owner before moving to Phase 1 Golden — this lets the team validate the schema is being filled correctly and lock any conventions you've adopted.

---

## 5. Learning Memory Set — what each file is for

The owner curated this set. Each file is meant to teach a specific correction pattern:

| Test axis | Files (dataset_id) | What you're capturing |
|---|---|---|
| **Repeated OCR / spelling correction** | 0009, 0011, 0016, 0033 | Use `possible_spelling_issue` and `unreadable_source` warnings liberally; transliterate non-English script in `item_name`, keep the original script in `raw_text_reference`. |
| **Wrong category correction** | 0002, 0028 | When the menu's stated category looks wrong for the item type, mark the corrected category in `category` and add `category_inferred` warning. |
| **Wrong price correction** | 0010, 0017 | These files have explicit price-update markers. Capture each price exactly as printed; if you see two prices for one item with the second corrected, document both via `same_name_different_price` warning + `notes`. |
| **Missing price correction** | _surfaces organically_ | Whenever a row has no price, set `rate=null` and add `missing_price` + `price_uncertain` warnings. Don't skip the row. |
| **Regional Indian menu naming** | 0004, 0014, 0024 | Use canonical regional spellings; mark `non_english_script` for any row where the source is in Telugu/Tamil/Hindi script. |
| **Confusing layout / source grounding** | 0011, 0019 | Be especially rigorous with `raw_text_reference` here — multi-column or split layouts are exactly what the source-provenance pane is being trained against. |

---

## 6. Required fields (quick reference)

Per row in `expected_rows[]`:
- `category` ✅
- `item_name` ✅
- `rate` ✅ (or `null` + `missing_price` warning)
- `currency` ✅ (usually `"INR"`)
- `raw_text_reference` ✅ — verbatim source substring
- `page_number` ✅ (on the parent page entry)
- `expected_warnings[]` ✅ (use only the controlled codes — see §7 below)
- `variant_flag_expected`, `addon_flag_expected`, `tax_note_flag_expected` ✅
- `confidence_expectation` ✅ (`high` / `medium` / `low`)

**Per page** also: `expected_menu_notes[]` for tax notes / service-charge / etc.

Full schema: `MENU_EXPECTED_OUTPUT_TEMPLATE.json` (read its `rules_for_reviewer` block).

---

## 7. Controlled warning codes (use ONLY these)

`variant_present`, `addon_present`, `tax_note`, `unreadable_source`, `non_english_script`, `out_of_scope_row`, `price_uncertain`, `category_inferred`, `multi_column_confusion`, `duplicate_possible`, `same_name_different_price`, `same_price_different_variant`, `missing_price`, `possible_spelling_issue`, `tax_note_detected`, `combo_detected`, `unit_price_detected`, `no_source_grounding`.

If you need a code that isn't on the list, message the owner — we'll extend the list before freeze rather than letting you invent one inline.

---

## 8. Unclear row / page handling — short version

- Page entirely illegible → `expected_rows: []`, page-level `note: "page_unreadable"`.
- Row partially illegible → add row, `rate=null`, warnings `missing_price` + `price_uncertain`.
- Non-English script → add row, transliterate `item_name`, keep original in `raw_text_reference`, warning `non_english_script`.
- Variants / add-ons → use the flag fields + populate `phase2_only_detail.expected_variants[]` / `expected_addons[]`; set `phase1_required_extracted: false` for pure sub-detail rows.
- Tax / GST line at page bottom → goes to `expected_menu_notes[]`, **not** as a row.
- Header / address / contact / disclaimer → `expected_menu_notes[]`, `note_type: "general_note"`, `expected_mapping: "ignored"`.

Full version (with all corner cases): `MENU_DATASET_REVIEWER_HANDOFF_SUNIL_v0.1.0.md §6`.

---

## 9. What you MUST NOT do

- ❌ Call Gemini.
- ❌ Run any extractor code.
- ❌ Freeze the dataset (only the owner triggers G9).
- ❌ Modify or delete the source PDFs.
- ❌ Modify `set_membership_proposed` — surface change requests to the owner.
- ❌ Invent rows. Every row must be visible in the source page.
- ❌ Skip `raw_text_reference`.
- ❌ Use a warning code that isn't in §7.

---

## 10. When you're done

The file `/app/memory/menu-import/MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json` should have, **for every entry in `entries[]`** (32 entries; the 1 SHA-256 duplicate is already excluded):

- `instance_metadata.human_verified_by = "Sunil"`
- `instance_metadata.human_verified_at = "<ISO-8601>"`
- `instance_metadata.notes = "<your free-text commentary>"`
- `expected_pages` populated
- `expected_aggregate_counts` populated
- `instance_metadata.frozen_at` left **`null`** (only the owner sets this)
- `instance_metadata.second_reviewer = null` (waived; per `PHASE_0_DECISION_LOG.md §7`)

Then send to the owner:

> _"Sunil review complete on v0.1.0 — 32 entries filled, ready for freeze."_

The owner will then issue Gate G9 (`"freeze v0.1.0 dataset — all gates green"`) and the agent will perform the freeze action (G10): rename folder `…/v0.1.0-PROPOSED/` → `…/v0.1.0/`, set `frozen_at` everywhere, write the Phase 0C completion report, and unblock Build Phase 2.

---

## 11. Escalation

| Situation | Contact |
|---|---|
| Schema question / template ambiguity | Owner |
| New warning code needed | Owner |
| Phase 2 Parking candidate spotted | Owner |
| File appears unreviewable as a whole | Owner — they may opt to mark the file `unreadable_source` in bulk and exclude from accuracy targets |
| Anything POS-related | Out of scope for v0.1.0 — POS Engineering owns Phase 0A confirmation separately |

---

## 12. Quick-start checklist

- [ ] Read `MENU_DATASET_REVIEWER_HANDOFF_SUNIL_v0.1.0.md` end-to-end (15 min)
- [ ] Open `MENU_EXPECTED_OUTPUT_TEMPLATE.json` and skim `rules_for_reviewer` (5 min)
- [ ] Open `/app/memory/menu-import/MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json` in your editor
- [ ] Open the first Smoke file (`MENU-v0.1.0-0007 Ghatkesar family dhaba.pdf`)
- [ ] Fill `expected_pages[]` for it; commit your local copy with the verified-at timestamp
- [ ] Repeat for the other 4 Smoke files
- [ ] **Sync with owner** before starting Phase 1 Golden
- [ ] Continue through P2, P3, P4 in order
- [ ] When all 32 entries are filled, signal the owner for G9

— END —
