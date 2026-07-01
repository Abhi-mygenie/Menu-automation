# MyGenie POS · Menu Import — Reviewer Handoff to Sunil — v0.1.0

**Reviewer:** Sunil (primary; per `PHASE_0_DECISION_LOG.md` H-4)
**Dataset version:** `v0.1.0-PROPOSED` — NOT FROZEN
**Begin only after:** owner approves the split (Gate **G6** in `MENU_DATASET_OWNER_APPROVAL_STATUS_v0.1.0.md`).
**Estimated effort:** ≈ 32 menus × ~10–25 minutes per menu (depends on menu length and scan quality) → ~6–12 hours of focused review for the full set.

---

## 1. What you (Sunil) are being asked to do

For each accepted, non-duplicate menu in `MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json`, **read the source PDF** and fill the `expected_pages[]` array per the rules in `MENU_EXPECTED_OUTPUT_TEMPLATE.json`.

You are the **source of truth** for what the extractor must produce on this dataset. Build Phase 2 will be graded against your file.

---

## 2. Files you must review

There are **32 accepted files** (33 PDFs minus 1 SHA-256 duplicate).

Open the following files, in this order of priority, all under `/app/datasets/menus_raw/v0.1.0-PROPOSED/`:

| Priority | Set | Why review first | Files |
|---|---|---|---|
| **P1** | Smoke Set (5) | Validates the entire pipeline end-to-end with the simplest cases. Required before anything else can be evaluated. | see `MENU_GOLDEN_DATASET_SPLIT_v0.1.0_PROPOSED.md §3` |
| **P2** | Phase 1 Golden Set (20) | Primary accuracy benchmark for the pilot release. | see `…SPLIT… §4` |
| **P3** | Stress Set (5+) | Edge-case correctness (large / scanned). | see `…SPLIT… §5` |
| **P4** | Learning Memory Set (regional Indian hits) | Required for correction-memory reuse evaluation. | see `…SPLIT… §6` |
| **P5** | Phase 2 Parking Set | This set is currently **empty** — as you review the corpus, **flag any file you find variant- or add-on-heavy** and ask the owner to add it to this set. | populate during review |

A file may belong to multiple sets — fill the same expected output, the metadata block records all memberships.

---

## 3. How to fill `expected_pages[]`

For every page of every file, add a `pages[]` entry:

```jsonc
{
  "page_number": 1,
  "expected_rows": [ ... ],          // see §4 below
  "expected_menu_notes": [ ... ]     // tax notes, service charge notes, etc.
}
```

Mark a page `"unreadable": true` and skip its rows when the source page is genuinely illegible. That is a valid evaluation case.

---

## 4. Required fields per row

Each row in `expected_rows[]` MUST have these fields populated:

| Field | Required | Description |
|---|---|---|
| `row_index` | ✅ | sequential index on the page (1, 2, 3 …) |
| `category` | ✅ | canonical category as you'd expect after normalization (e.g. `"Starters"`, not `"STARTERS / OK"`). If the menu doesn't visibly group by category, infer one and add `category_inferred` to `expected_warnings`. |
| `item_name` | ✅ | exact spelling **after normalization** (title case, currency stripped) |
| `rate` | ✅ (when visible) | decimal as **string**, e.g., `"240.00"`. Use `null` and add `missing_price` warning if no price is shown. |
| `currency` | ✅ | usually `"INR"` for this corpus |
| `raw_text_reference` | ✅ | a verbatim substring from the page that grounds this row. **This is the single most important field — it's how we defend against hallucination later.** |
| `source_grounding_required` | ✅ | leave `true` |
| `page_number` | ✅ | (on the parent page entry) |
| `expected_warnings` | ✅ (zero or more) | from the controlled list in §5 |
| `variant_flag_expected` | ✅ | `true` if the row mentions a Small/Medium/Large or Half/Full or per-kg variant |
| `addon_flag_expected` | ✅ | `true` if the row mentions an extra/topping/add-on |
| `tax_note_flag_expected` | ✅ | `true` if there's a tax / GST / service-charge note attached to this row |
| `confidence_expectation` | ✅ | `"high"`, `"medium"`, or `"low"` |
| `phase1_required_extracted` | ✅ | usually `true`; set to `false` for variant/addon detail rows that Phase 1 only flags but does not extract |
| `phase2_only_detail` | ⚠️ | only if the row has variants/add-ons; populate `expected_variants[]` and `expected_addons[]` here |
| `notes` | optional | reviewer commentary |

---

## 5. Controlled warning code list

Use **only** these codes in `expected_warnings`:

| Code | When to use |
|---|---|
| `variant_present` | Row references a size / portion / per-unit variant (use this in addition to `variant_flag_expected: true`) |
| `addon_present` | Row references an add-on / topping / extra |
| `tax_note` | A tax / GST / service-charge note is attached to this row |
| `unreadable_source` | The source text is illegible — provide your best guess and flag |
| `non_english_script` | Source uses a non-English script (Devanagari, Telugu, Tamil, etc.) |
| `out_of_scope_row` | Row is not a menu item (e.g., disclaimer, address, "Wi-Fi password") — should NOT be extracted |
| `price_uncertain` | Price visible but ambiguous (handwriting, multiple corrections) |
| `category_inferred` | Category was not visibly grouped on the menu; you inferred it |
| `multi_column_confusion` | Row appears in a multi-column layout where adjacency is ambiguous |
| `duplicate_possible` | Same item name appears more than once on the menu |
| `same_name_different_price` | Same item name appears twice with different prices (probable variant) |
| `same_price_different_variant` | Different items at same price (legit; flag for dedup logic) |
| `missing_price` | Item visible but no price shown |
| `possible_spelling_issue` | Source has a likely typo |
| `tax_note_detected` | A tax/service note exists somewhere on the page (not necessarily this row) |
| `combo_detected` | Row describes a combo / thali / set meal |
| `unit_price_detected` | Row uses per-kg / per-piece pricing |
| `no_source_grounding` | You could not cite a verbatim substring (rare; should be the exception) |

> Anything not on this list **must not** be added; if you need a new code, message the owner and we'll extend the list before freeze.

---

## 6. How to handle unclear rows / pages

| Situation | Action |
|---|---|
| Page entirely illegible | Set `expected_rows: []` for that page; add a page-level `note: "page_unreadable"`. |
| Row partially illegible (e.g., price missing) | Add the row with `rate: null` + `expected_warnings: ["missing_price", "price_uncertain"]`. |
| Row in non-English script | Add the row, transliterate `item_name` to Latin script, raw_text_reference is the original script verbatim, add `non_english_script` warning. |
| Item appears twice on same page | Add both rows; add `duplicate_possible` to both; let the dedup logic deal with it later. |
| Variant / add-on rows | Use `variant_flag_expected: true` (or `addon_flag_expected: true`); fill `phase2_only_detail.expected_variants[]` (or `expected_addons[]`); set `phase1_required_extracted: false` for sub-rows. |
| Tax / GST line at page bottom | Add it as an `expected_menu_notes[]` entry on that page (NOT as a row). Set `note_type: "tax_note"`, `expected_mapping: "tax_setting"`. |
| Header / address / contact / disclaimer | Do NOT add as a row. Add to `expected_menu_notes[]` as `note_type: "general_note"`, `expected_mapping: "ignored"`. |

When in genuine doubt, leave a `notes` field explaining your reasoning. The agent will surface ambiguous rows to the second reviewer (or owner if waived).

---

## 7. What you (Sunil) MUST NOT do

- ❌ **Do NOT call Gemini.** This is a manual review.
- ❌ **Do NOT run any extraction code.** None exists yet, but if you happen to write one, do not use it as ground truth — that defeats the purpose.
- ❌ **Do NOT freeze the dataset.** Only the owner triggers freeze (Gate G9).
- ❌ **Do NOT delete or modify the source PDFs.**
- ❌ **Do NOT modify `set_membership_proposed`** — request changes via the owner; the split is owner-controlled.
- ❌ **Do NOT invent rows.** Every row must be visible in the source page.
- ❌ **Do NOT skip `raw_text_reference`.** Every row needs a verbatim source substring.

---

## 8. Final output expected from you

When you finish, the file `/app/memory/menu-import/MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json` should have, for **every** entry in `entries[]`:

- `instance_metadata.human_verified_by = "Sunil"`
- `instance_metadata.human_verified_at = "<ISO timestamp>"`
- `instance_metadata.notes = "<your free-text commentary>"`
- `expected_pages` populated with all rows + page notes
- `expected_aggregate_counts` populated with the totals
- `instance_metadata.frozen_at` left **`null`** (only the owner's freeze command sets this)

Then signal "Sunil review complete on v0.1.0" to the owner so Gate **G7** can close. The agent will then check **G8** (second reviewer or waiver) and wait for the owner's freeze command (**G9**).

---

## 9. Tips that save time

- Open the inventory `MENU_DATASET_INVENTORY_v0.1.0_PROPOSED.md` alongside the placeholders JSON — it has size, classification hints, and a per-file recommended use.
- Do all 5 Smoke Set files first end-to-end, even if rough — it lets the team see one full vertical slice of expected output and lock the schema before you commit hours.
- For very large scanned PDFs (`,,THE SINGHS MANU 2025-3.pdf` at 42 MB, `tribe gate.pdf` at 16 MB), do the first 2–3 pages first and check with the owner before completing — they may opt to mark the file `unreadable_source` in bulk if quality is too poor for human review.
- The duplicate file (`MENU-v0.1.0-0031` = `Makhna_menu.pdf` in `batch-07`) **does NOT need its own review** — it's identical to `MENU-v0.1.0-0020`.

— END —
