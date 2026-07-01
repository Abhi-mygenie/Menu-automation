# MyGenie POS — Menu Extraction Evaluation Rubric

**Document version:** 1.0
**Status:** Planning. Used by Phase 0C dataset prep + Build Phase 2 onwards.
**Inputs:** `MENU_EXPECTED_OUTPUT_TEMPLATE.json` (per-menu ground truth), live extractor output.
**Output:** Per-PR + nightly + hold-out + pilot accuracy reports.

---

## 1. Notation

For a single menu in a set:

- **G** = set of expected rows from the human-reviewed expected output (`expected_rows`).
- **E** = set of extracted rows from the system under test.
- A pair `(g, e)` is a **match** if and only if all of:
  - same `category` (after normalization), OR `expected_warnings` includes `category_inferred`.
  - same `item_name` after a **strict normalization** (lowercase, whitespace collapsed, currency stripped, trailing punctuation removed). For fuzzy variant of the metric, Levenshtein ratio ≥ 0.92.
  - `|rate_g − rate_e| / max(rate_g, rate_e) <= 0.005` (≤ 0.5% drift, accommodates penny rounding) OR both null.
  - `currency_g == currency_e`.

A row in E with no match is a **hallucination candidate**.

---

## 2. Metrics — Definitions + Phase 1 Targets

### 2.1 Item Extraction Precision
> Of the rows the extractor produced, how many were correct?

```
precision_item = | matched(E, G) | / | E |
```

**Phase 1 target:** ≥ **0.90** on Phase 1 Golden Set.

### 2.2 Item Extraction Recall
> Of the rows that should have been produced, how many did we get?

```
recall_item = | matched(E, G) | / | G |
```

**Phase 1 target:** ≥ **0.90** on Phase 1 Golden Set.

### 2.3 Price / Rate Accuracy
> Among matched rows (excluding `missing_price` cases), how many have correct price?

```
price_accuracy = | matched ∧ price_correct | / | matched ∧ rate_g_not_null |
```

**Phase 1 target:** ≥ **0.90**.

### 2.4 Category Assignment Accuracy
> Among matched rows, how many have correct canonical category?

```
category_accuracy = | matched ∧ category_correct | / | matched |
```

**Phase 1 target:** ≥ **0.80**.

### 2.5 Row Count Accuracy
> How close is total row count to ground truth?

```
row_count_error = | |E| − |G| | / |G|
row_count_accuracy = 1 − row_count_error
```

**Phase 1 target:** row_count_accuracy ≥ **0.92** on Phase 1 Golden Set. Rationale: small over/under-extraction is acceptable as long as precision/recall hold.

### 2.6 Source-Grounded Rows
> Every extracted row must carry `raw_text` and `source_bbox`.

```
source_grounded_ratio = | E ∧ raw_text_non_empty ∧ source_bbox_non_null | / | E |
```

**Phase 1 target:** ≥ **0.95** on all sets.
**Hard rule:** rows with `source_grounding_required=true` in the expected output and missing grounding in extraction count as failures regardless of correctness.

### 2.7 Variant Warning Accuracy (Parking Set)
> When the expected output has `variant_flag_expected=true`, did the system flag `variant_detected`?

```
variant_warning_recall = | rows_with_expected_flag ∧ extracted_warning_includes_variant_detected |
                       / | rows_with_expected_flag |
```

**Phase 1 target (Parking Set only):** ≥ **0.70**.

### 2.8 Add-on Warning Accuracy (Parking Set)

```
addon_warning_recall = same shape but for addon flag
```

**Phase 1 target:** ≥ **0.60**.

### 2.9 Tax-Note Warning Accuracy

```
tax_note_recall = | menu_notes_expected_with_tax ∧ extracted_warning_includes_tax_note_detected |
                / | menu_notes_expected_with_tax |
```

**Phase 1 target:** ≥ **0.80**.

### 2.10 Correction-Memory Reuse Accuracy
> On a controlled re-run after corrections, how often does the prior correction apply correctly?

Defined in `MENU_DATASET_PREPARATION_PLAN.md §14`. Quantitative metric:

```
memory_reuse_accuracy = | rows_where_applied_memory_ids_non_empty
                       ∧ field_matches_corrected_target |
                       / | eligible_rows |
```

`eligible_rows` = rows in pass-2 extraction whose pass-1 raw_text triggered an active restaurant rule.

**Phase 1 target:** ≥ **0.85** on `Learning Memory Set`.

### 2.11 Hallucination Rate
> Critical-field rows in E with no source grounding AND no match in G.

```
hallucination_rate = | E ∧ critical_field_invented ∧ no_match | / | E |

critical_field_invented := non-empty item_name AND non-null rate AND no source_bbox
```

**Phase 1 target:** **0** on critical fields. Any hallucinated row is a Sev-1 finding.

### 2.12 Duplicate Row Rate
> Duplicate rows produced within the same import (same `(item_name_norm, category_norm, rate)`).

```
duplicate_row_rate = | duplicates_in_E | / | E |
```

**Phase 1 target:** ≤ **0.02** (≤ 2% of extracted rows).

### 2.13 Missing-Price Flagging Accuracy
> When ground truth has `expected_warnings` including `missing_price`, did the extractor flag it?

```
missing_price_flag_recall = same shape with missing_price warning
```

**Phase 1 target:** ≥ **0.95**.

---

## 3. Pass / Fail Rules per Set

### 3.1 Smoke Set (PR-time)
- Item precision ≥ 0.95 AND recall ≥ 0.95.
- Price accuracy ≥ 0.95.
- Hallucination rate = 0.
- Source grounded ≥ 0.98.
- **Hard fail** on any miss → PR blocked.

### 3.2 Phase 1 Golden Set (PR-time + nightly)
- Item precision ≥ 0.90, recall ≥ 0.90.
- Price accuracy ≥ 0.90.
- Category accuracy ≥ 0.80.
- Source grounded ≥ 0.95.
- Hallucination rate = 0.
- Duplicate row rate ≤ 0.02.
- Missing-price flag recall ≥ 0.95.
- Tax-note recall ≥ 0.80.
- **PR fail** if any drop > 2 percentage points vs last green run.

### 3.3 Stress Set (nightly + monthly hold-out)
- Item precision ≥ 0.80, recall ≥ 0.75 (lower bar; stress set is hard).
- Price accuracy ≥ 0.85.
- Source grounded ≥ 0.95.
- Hallucination rate = 0 (still!).
- Duplicate row rate ≤ 0.05.
- **Soft fail** triggers product review; not necessarily a release block unless hallucinations appear.

### 3.4 Learning Memory Set
- Memory reuse accuracy ≥ 0.85.
- Anti-overfitting cap respected.
- Global rule never created without admin.
- **Hard fail** if global rule emerges from a single restaurant.

### 3.5 Phase 2 Parking Set
- Variant warning recall ≥ 0.70.
- Add-on warning recall ≥ 0.60.
- No requirement to populate variant/addon child rows in Phase 1; **failure to do so is not a fail.**
- Hallucinated variants/add-ons (i.e., extractor fabricated a variant not in source) **is** a fail.

---

## 4. How to Handle "Rows Needing Review"

- Rows with `confidence_score < 0.85` or any blocking warning are **expected** to land in `review_required` status.
- Such rows are **not counted** in precision/recall denominators **only when the expected output also marks them as `flagged_only_phase1`**.
- Otherwise, a row is counted as extracted regardless of status — the system must produce the right content even if it then flags it for review.
- A row that the system should have rejected but produced cleanly (high confidence, no warning) **is a stronger fail** than producing it as `review_required`.

---

## 5. Reporting Hallucinations

Every CI run that finds a hallucination produces a structured report entry:

```
{
  "menu_dataset_id": "...",
  "dataset_version": "...",
  "row_index_in_extraction": 17,
  "item_name_extracted": "Mango Lassi Special",
  "rate_extracted": "180.00",
  "raw_text_extracted": null,
  "source_bbox_extracted": null,
  "match_attempts_in_G": [
    { "candidate_g": "...", "name_similarity": 0.74, "price_diff_ratio": 0.30, "rejected_reason": "below_match_threshold" }
  ],
  "page_number": 2,
  "prompt_version": "extract-v1",
  "model_used": "gemini-3-pro",
  "severity": "Sev-1"
}
```

These are aggregated into a **hallucination dashboard** and **block release**.

---

## 6. Reporting Variant / Add-on Flagging

For each `Phase 2 Parking Set` run, produce a **flagging report**:

```
{
  "menu_dataset_id": "...",
  "page_number": 1,
  "expected_variant_flag": true,
  "extracted_warning_includes_variant_detected": true,
  "expected_addon_flag": false,
  "extracted_warning_includes_addon_detected": false,
  "phase2_data_extracted": {
    "variants_count": 3,
    "addons_count": 0
  },
  "phase2_data_correct": "n/a (Phase 1 evaluation)",
  "phase2_data_hallucinated": false
}
```

This report fuels the Phase 2 prep tracker; it never blocks Phase 1 release.

---

## 7. Reporting Correction-Memory Reuse

Each `Learning Memory Set` run produces a per-scenario report (scenarios listed in `MENU_DATASET_PREPARATION_PLAN.md §14`):

```
{
  "scenario_id": "spelling_panner_to_paneer",
  "pass_1_corrections_recorded": 3,
  "pass_2_rule_applied_count": 4,
  "pass_2_field_matches_corrected_target": 4,
  "result": "passed",
  "applied_memory_ids_per_row": [101, 101, 101, 101],
  "evidence": "row.applied_memory_ids non-empty + corrected_item_name == 'Paneer'"
}
```

Special checks:
- **Anti-overfitting**: scenarios that simulate one restaurant dominating cuisine evidence must end without cuisine-scope promotion.
- **Global guardrail**: scenarios that try to insert a global active rule without `approved_at` must fail at the DB constraint level.

---

## 8. Aggregate Release Gate

For a release to be approved, **all** of these must hold:

1. Smoke Set hard pass.
2. Phase 1 Golden Set hard pass with no > 2-point regression.
3. Hallucination rate = 0 across all sets.
4. Source-grounded ratio ≥ 0.95 across all sets.
5. Memory Reuse ≥ 0.85 on Learning Memory Set.
6. Hold-out evaluation done by release manager (signed off).
7. No P0 blockers re-opened.

A failure on any of (1)–(7) blocks the release.

---

## 9. Versioning

- Rubric version is bumped when metric definitions change.
- Each evaluation report records `rubric_version` alongside `prompt_version`, `model_version`, `normalizer_version`, `preprocessing_version`, and `dataset_version`. This makes regressions diagnosable.

---

## 10. Out of Scope

- Subjective UX metrics (those go through pilot feedback, not this rubric).
- Subcategory accuracy in Phase 1 (Phase 2 metric).
- Variant/add-on **content** correctness in Phase 1 (Phase 2 metric; we only score the **flag** in Phase 1).
- Combo decomposition correctness (Phase 3).
- Multilingual extraction (Phase 3).
