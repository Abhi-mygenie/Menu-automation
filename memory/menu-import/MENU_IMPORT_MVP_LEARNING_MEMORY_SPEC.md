# MyGenie POS — Production-Grade AI Menu Import System — Learning Memory Specification

**Document version:** 2.0 (production-grade revision)
**Status:** Draft — pending Approval Gate 6
**Storage:** `menu_import.menu_learning_memory` + `menu_import.menu_import_corrections` + `menu_import.menu_import_admin_actions`
**Apply phase:** during Stage 4 (Normalization) of every new import.
**Promotion phase:** background job `menu-import.learning.promote` (hourly).
**Positioning:** Learning is a **production-grade, auditable, reversible, tenant-scoped** system. In Phase 1, only restaurant-scope rules are active. Cuisine + global promotion ships in Phase 2 with a dedicated admin approval queue.

---

## 1. Purpose + Principles

The system must learn from user corrections so the same restaurant — and over time, similar restaurants — does **not** have to fix the same errors repeatedly.

Five guiding principles:

1. **Restaurant-first.** Most learning is per-restaurant; cross-tenant promotion is rare and gated.
2. **Conservative.** A single correction never affects global behavior.
3. **Explainable.** Every applied rule leaves an audit trail (`applied_memory_ids`).
4. **Reversible.** A learning rule can be deactivated without data loss.
5. **Bounded.** Learning never overrides explicit user intent in the current import — it merely seeds defaults.

---

## 2. Three Scopes

| Scope | Applies to | Write source | Promotion |
|---|---|---|---|
| `restaurant` | Same restaurant only | Direct: every user correction | n/a |
| `cuisine` | All restaurants of same cuisine | Promotion job: from restaurant rules with broad agreement | gated |
| `global` | All restaurants | Promotion job: from cuisine rules with broad agreement + admin approval | strictly gated |

### Boundary rules

- **One correction never** writes to `cuisine` or `global` scope directly.
- **Cuisine** and **global** rows are write-only via the system; never directly editable via API by restaurants.
- **Global** rules require **explicit `admin_approved_at`**.

---

## 3. Pattern Types

| `pattern_type` | What it learns | Example |
|---|---|---|
| `spelling` | Token / phrase corrections | `Panner` → `Paneer` |
| `category_mapping` | Category text → canonical | `Chinese Main` → `Chinese` |
| `subcategory_mapping` | Subcategory tokens | `Veg Pizza` (sub) → `Pizza > Veg` |
| `price_pattern` | Price format quirks | `120/-` indicates ₹120 |
| `variant_pattern` | Variant block detection | `Small / Medium / Large` near a price triplet |
| `addon_pattern` | Add-on phrasing | `+ Cheese 20` near an item |
| `modifier_pattern` | Choice-group phrasing (P1) | `Choice of sauce: A/B/C` |
| `food_type` | Token → food_type enum | `V` → `veg`, `NV` → `non_veg` |
| `unit_pricing` | Unit detection | `/kg` after price → weight_based |
| `combo_pattern` | Combo phrasing | `Burger + Fries + Coke` → combo |
| `tax_note` | Note phrasing | `GST extra` → `tax_note` |

> Each pattern has a `wrong_value` (or canonical "from") and `correct_value` (canonical "to"). Free-form `context` JSONB holds optional disambiguators (e.g., `category`, `language`).

---

## 4. Storage Model

`menu_learning_memory` (see DB Schema §3.10):

```
id, scope, restaurant_id?, cuisine_type?, pattern_type,
wrong_value, correct_value, context jsonb,
confidence numeric(4,3), usage_count int, distinct_restaurants int,
last_used_at, approved_by_admin?, approved_at?, active bool,
created_at, updated_at, deleted_at
```

Uniqueness:
- `restaurant` scope: unique on `(restaurant_id, pattern_type, wrong_value)` where `active`.
- `cuisine` scope: unique on `(cuisine_type, pattern_type, wrong_value)` where `active`.
- `global` scope: unique on `(pattern_type, wrong_value)` where `active`.

`menu_import_corrections` is the **append-only ledger** that feeds learning. Every correction the user makes lands here first; the learning rule is then upserted in `menu_learning_memory` for `restaurant` scope.

---

## 5. Write Pipeline (when a user corrects)

When `PATCH /rows/{id}` (or variant/addon/note) sets a `corrected_*` field:

1. **Append correction event** to `menu_import_corrections`:
   ```
   field_name, old_value, new_value, raw_text, correction_type,
   source='user', created_by, model/prompt/preprocessing/normalizer versions,
   menu_import_id, menu_import_row_id, child_table?, child_id?
   ```

2. **Map correction → pattern_type**:
   | `correction_type` | `pattern_type` |
   |---|---|
   | `spelling_fix` | `spelling` |
   | `category_fix` | `category_mapping` |
   | `subcategory_fix` | `subcategory_mapping` |
   | `food_type_fix` | `food_type` |
   | `unit_fix` | `unit_pricing` |
   | `variant_fix` | `variant_pattern` |
   | `addon_fix` | `addon_pattern` |
   | `modifier_fix` | `modifier_pattern` |
   | `price_fix` | `price_pattern` (selectively — see §5.1) |
   | `combo_fix` | `combo_pattern` |
   | `tax_note_fix` | `tax_note` |
   | `manual_addition` / `manual_deletion` | (no rule written) |

3. **Compute candidate rule**:
   - `wrong_value` = a normalized representation of the original wrong text (lowercase, trimmed, currency-stripped where relevant).
   - `correct_value` = normalized correct text.
   - `context` (optional): `{ category, language }`.

4. **Upsert** into `menu_learning_memory` at `scope='restaurant'`:
   - If existing row matches `(restaurant_id, pattern_type, wrong_value)`:
     - increment `usage_count`.
     - update `correct_value` only if matches existing `correct_value`; if mismatched, do NOT overwrite (record an `ambiguous` flag in context — see §5.2).
     - bump `last_used_at`.
   - Else:
     - insert new row with `confidence = 0.5` (initial).

5. **Confidence math** (restaurant scope):
   ```
   restaurant_confidence = min(0.95,
       0.5
     + 0.1 * log2(usage_count)
     - 0.2 * ambiguous_flag
   )
   ```
   - Rules below `0.5` are not applied automatically.

### 5.1 What NOT to learn

Some `price_fix` corrections should not become rules:
- A user changing `120` → `130` is just a price update, not a learnable pattern.
- We only learn `price_pattern` when the original `raw_text` contains structural indicators (`/-`, `Rs`, `INR`, `/kg`, `/pc`).
  - Example: raw_text `"Rs 120/-"` → user keeps `120` → record a `price_pattern` rule `(/-, ₹)`.
  - Example: raw_text `"120"` → user changes to `130` → no rule, just a correction event.

The mapping in §5 step 2 is therefore conditional: `price_fix` becomes `price_pattern` only when raw_text contains structural tokens.

### 5.2 Ambiguity handling

If the same `(restaurant_id, pattern_type, wrong_value)` ends up with two different `correct_value`s:
- Set `context.ambiguous = true`.
- `restaurant_confidence` is penalized.
- Rule is **not applied** during normalization until ambiguity is resolved (admin can deactivate one).

---

## 6. Apply Pipeline (during Stage 4 Normalization)

Order of application per row, deterministic:

```
1. raw_text and field-level outputs from extractor
2. tokenization + lowercasing for matching
3. apply rules in this order:
   a. global  scope, active, confidence ≥ 0.85
   b. cuisine scope, active, confidence ≥ 0.7, cuisine_type = restaurant.cuisine_type
   c. restaurant scope, active, confidence ≥ 0.5, restaurant_id = current
4. Last applied wins for the same target field; restaurant overrides cuisine; cuisine overrides global.
5. Each applied rule appended to row.applied_memory_ids and rule.usage_count is incremented.
```

**Side effects:**
- Re-compute `confidence_score`:
  ```
  effective_confidence = max(model_overall, model_overall * 0.7 + memory_boost * 0.3)
  ```
  where `memory_boost` ∈ [0, 0.2] proportional to count of applied rules with confidence ≥ 0.7.
- Add `warnings.applied_memory` if any restaurant rule fired (for transparency in UI).

**Never override user input in current session:**
If a row has any `corrected_*` field set, the apply pipeline only runs on the **non-corrected** counterpart fields. The user's explicit edits always win.

---

## 7. Promotion Pipeline (background job)

Runs hourly. Uses windowed counts only on rules with `active=true` and `deleted_at IS NULL`.

### 7.1 Restaurant → Cuisine

Promote a `restaurant`-scope rule into `cuisine` scope when:
- Same `(pattern_type, wrong_value, correct_value)` is observed across **≥ 3 distinct restaurants** of the **same cuisine**.
- AND aggregate `usage_count >= 6`.
- AND no contradicting `correct_value` exists across those restaurants for the same `(pattern_type, wrong_value)`.

Promotion writes/updates a `cuisine`-scope row with:
```
confidence = min(0.95, 0.5 + restaurants_count / 20)
distinct_restaurants = restaurants_count
usage_count = sum(restaurant usage_counts)
```

If a contradicting `cuisine` row exists, do NOT promote (raise `ambiguous` flag with context for admin review).

### 7.2 Cuisine → Global

Promote a `cuisine`-scope rule into `global` scope when:
- Same `(pattern_type, wrong_value, correct_value)` is confirmed across **≥ 10 distinct restaurants** spanning **≥ 3 distinct cuisines**.
- AND aggregate `usage_count >= 30`.
- AND **no admin has marked the candidate as suppressed**.
- AND an **admin explicitly approves** via the admin console (sets `approved_by_admin`, `approved_at`).

Without admin approval, the candidate sits in a `global_candidates` view (read-only) but is not active.

### 7.3 Demotion / deactivation

A rule is **deactivated** (sets `active=false`) automatically when:
- Within a 14-day window the same rule causes ≥ N user reversals (configurable, default `N = 5`).
- Admin manually deactivates.

Deactivation is logged. A deactivated rule does **not** apply but is preserved for analytics.

---

## 8. Examples

### 8.1 Spelling — restaurant
- User corrects `Panner` → `Paneer` on import #1 → `restaurant` rule with `usage_count=1`, `confidence=0.5`.
- Same correction repeated on imports #2, #3 → `usage_count=3`, `confidence=0.66`.
- Now applied automatically on import #4 — `Panner` becomes `Paneer` before review.

### 8.2 Variant pattern — restaurant
- User repeatedly converts `S/M/L` rows into Pizza variants → `variant_pattern` rule:
  ```
  pattern_type: variant_pattern
  wrong_value:  "s/m/l"
  correct_value: '{"group":"Size","names":["Small","Medium","Large"]}'
  context: {"category_hint": "Pizza"}
  ```
- Applied during extraction normalization: when extractor returns `s/m/l` near 3 prices, builder restructures into a single item with 3 variants instead of 3 items.

### 8.3 Add-on — restaurant → cuisine
- 5 different North-Indian restaurants converted `+ Cheese 20` rows into add-ons.
- Promotion job creates a `cuisine='north_indian'` rule for `addon_pattern: "+ cheese"` → `addon`.
- Sixth North-Indian restaurant uploads → AI extractor still emits `+ Cheese` as a candidate item, but **normalization** sees the cuisine rule and pre-flags the row with warning `possible_addon_detected` + suggested-parent search hint.

### 8.4 Global — token mapping (admin-approved)
- Across 12 restaurants and 4 cuisines, `V` → `veg` is confirmed; admin approves global rule.
- Effect: future imports never need this correction, even on first upload.

### 8.5 Tax note
- User repeatedly maps `"GST extra"` to `note_type=tax_note` and `mapped_to=tax_setting`.
- Restaurant rule: `tax_note` pattern.
- After cuisine threshold met, future menus pre-classify the note (still **never** auto-applied to tax settings).

---

## 9. Anti-corruption Safeguards

1. **No write to global from a single correction** — enforced in code path.
2. **Multi-restaurant + multi-cuisine** required for global promotion.
3. **Admin approval mandatory** for global activation (DB constraint check on `active=true AND scope='global'` requires `approved_at NOT NULL`):
   ```sql
   ALTER TABLE menu_learning_memory
     ADD CONSTRAINT chk_global_requires_admin
     CHECK (NOT (scope = 'global' AND active = TRUE AND approved_at IS NULL));
   ```
4. **Reversal budget** — auto-deactivate on N reversals within window (§7.3).
5. **Ambiguity guard** — never promote contradictory candidates.
6. **Rule cap per restaurant** — soft cap of 2,000 active rules per restaurant; oldest unused (`last_used_at < now() - 6 months`) get archived.
7. **PII pseudonymization** — `restaurant_id` is opaque inside cuisine/global rules (we store cuisine_type, not restaurant_id, in cuisine/global rows).
8. **Apply order** restaurant > cuisine > global — restaurant-specific behavior always wins.
9. **Rules are not applied to fields the user already edited in current import.**
10. **Every applied rule is recorded in `row.applied_memory_ids`** for full traceability.
11. **Anti-overfitting cap**: when aggregating evidence for cuisine promotion, **no single restaurant's contribution may exceed 40%** of the evidence mass for the candidate rule. If one restaurant dominates, promotion is blocked and flagged for admin review.
12. **Per-restaurant opt-out**: a restaurant profile flag `learning_opt_out_cuisine_global` disables application of cuisine/global rules to that restaurant's imports (restaurant rules still apply). Useful for restaurants with highly idiosyncratic menus.
13. **Fuzzy-match policy per pattern type**:
    - `spelling`: Levenshtein ratio ≥ 0.88 for match; exact match for application.
    - `category_mapping`, `subcategory_mapping`: exact match (case/whitespace-normalized) only; fuzzy disabled — category semantics matter.
    - `food_type`: exact token match only.
    - `unit_pricing`: regex match on unit token.
    - `price_pattern`: structural match only (see §5.1); never match on bare numeric differences.

---

## 9.1 What NOT to Learn (Price Correction Safety — Named Policy)

Promoted to a first-class section:

A price correction becomes a **learning rule** only if the original `raw_text` contains structural indicators, i.e., tokens that repeat across menus of this restaurant:

- Structural tokens that qualify: `/-`, `Rs`, `Rs.`, `INR`, `₹`, `/kg`, `/pc`, `/plate`, `/dozen`, `/half`, `/full`, `half:`, `full:`, and clearly formatted unit suffixes.
- A price correction **does NOT** become a rule when:
  - The user simply changes a numeric value (`120` → `130`). That's a price update, not a pattern.
  - The original `raw_text` is missing or empty.
  - The field changed is the corrected one for a row whose model confidence on `rate` was ≥ 0.9 and the user changed it anyway — this is likely a real price change, not a pattern.
- **No price value is ever promoted** to cuisine or global scope. Only **structural price patterns** (e.g., `/-` means ₹) are eligible for cross-tenant promotion.

This is enforced in code as a guard before inserting into `menu_learning_memory`.

---

## 9.2 Category Correction Safety

- Category renames in the user's current import do NOT automatically create global category-mapping rules.
- A `category_mapping` rule at cuisine scope requires the same source→target mapping from ≥ 3 distinct restaurants of the same cuisine.
- Global `category_mapping` requires ≥ 10 restaurants across ≥ 3 cuisines.
- The admin approval queue shows the top 3 sample corrections backing the candidate for human sanity check.

---

## 10. Admin Approval Queue (Production-Grade, Phase 2)

A small internal admin UI exposes:

- **`global_candidates`** — promotion queue with filters (pattern_type, restaurants count, cuisines count, evidence samples).
- **`cuisine_rules`** — list of active cuisine rules with reversal rate, restaurants affected, and controls: suppress / deactivate.
- **`global_rules`** — active rules with approval metadata; controls: suppress / deactivate / reactivate.
- **`suppressed_rules`** — previously rejected candidates; kept for context.
- **`top_reversed_rules`** — rules auto-deactivated due to reversal budget; signal of bad rules.
- **`per_restaurant_opt_outs`** — list of restaurants with cuisine/global learning disabled.

Each admin action writes to `menu_import_admin_actions` with `admin_user_id, action, memory_rule_id, scope, reason, payload_snapshot, created_at` (append-only).

Admin console is in Phase 2 scope. In Phase 1, the DB constraint + feature flag `ENABLE_GLOBAL_MEMORY=false` ensures no global learning is active.

---

## 11. Metrics + Observability

Per-import:
- `applied_rules_count_total` (gauge per import)
- `auto_corrections_count_per_row` (histogram)
- `manual_correction_rate` (1 − rows_unchanged / rows_total)
- `rows_auto_approved_percentage`

Per-rule (sampled):
- `rule_usage_count` (counter)
- `rule_reversal_count` (counter, used for demotion)
- `rule_apply_latency_ms` (histogram)

Dashboards:
- "Top restaurant rules by impact" (sorted by `usage_count`).
- "Cuisine candidates ready for promotion."
- "Suppressed / reverted rules" (top 50).

---

## 12. Failure Modes

| Failure | Effect | Mitigation |
|---|---|---|
| Bad rule pre-applied silently | UI shows `applied_memory` badge per affected field; user can click "undo this rule" → rule deactivated. |
| Rule cap exceeded | Oldest unused rules archived. |
| Promotion job runs while writing | Idempotent upserts + `ON CONFLICT … DO UPDATE`. |
| Conflict between two rules at same scope | Last write wins per field; both rules recorded in `applied_memory_ids` for visibility. |
| Memory store DB lag | Apply pipeline is best-effort; absence of memory only loses learning, not correctness. |
| Cross-cuisine pollution | Cuisine rules strictly filtered by `cuisine_type` at apply time. |

---

## 13. Open Questions

Tracked in `MENU_IMPORT_MVP_OPEN_QUESTIONS.md`:
- Should we expose "View rules I've taught the system" in the restaurant UI?
- Should `restaurant` rules be exportable / importable across the same restaurant's branches?
- Should the system allow restaurants to **opt out** of cuisine/global rules ("teach me from scratch")?
- How to source `cuisine_type` for restaurants where POS doesn't carry it.
