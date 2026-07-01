# MyGenie POS — Gemini Cost Control + Versioning Specification

**Document version:** 1.0
**Status:** Planning only. **No cost budget configured yet.** Finance sign-off required for the USD cap value.
**Phase:** 0B.

---

## 1. Cost Axes

Three axes to control cost:

- **Per-restaurant monthly cap** — bounds per-tenant spend; hard block when hit.
- **Per-file token cap** — prevents a single adversarial or huge file from burning credits.
- **Per-account / platform caps** — global safeguard; owned by SRE + Finance alarms.

All enforcement happens **before** the Gemini call leaves `AIExtractionService`.

---

## 2. Per-Restaurant Monthly Cap

### 2.1 Default (proposed)

| Plan tier | Monthly cap (USD) | Soft-warn threshold | Notes |
|---|---|---|---|
| Pilot / Free | **25** | 70% (USD 17.50) | Default for all new restaurants in Phase 1 pilot |
| Starter | 50 | 70% | Post-pilot tier (indicative, Finance finalizes) |
| Pro | 100 | 70% | Post-pilot tier |
| Enterprise | per contract | per contract | Negotiated |

**D-6 status:** 🟡 PARTIALLY CLOSED — `25` USD/month is a defensible default for pilot; Finance signs off before Build Phase 2 prod cutover.

### 2.2 Config

- `MENU_EXTRACT_PER_RESTAURANT_MONTHLY_CAP_USD` — per-env default.
- `menu_import.restaurant_settings.monthly_cap_usd` — per-restaurant override (DB; nullable → fall back to env default).
- Billing period = calendar month in the restaurant's timezone.

### 2.3 Enforcement flow

```
INCOMING upload request
    │
    ▼
load restaurant_settings + MTD spend from menu_imports
    │
    ▼
projected_cost = min_estimate_for_this_file()
    │
    ├── MTD + projected_cost >= cap         → 422 COST_CAP_EXCEEDED
    │                                       │
    │                                       ▼
    │                          return error to UI with:
    │                          - monthly_cap_usd
    │                          - month_to_date_usd
    │                          - remaining_usd
    │                          - next_reset_at (first-of-next-month in TZ)
    │
    ├── MTD >= warn_threshold               → allow upload, add warning badge
    │
    └── else                                → proceed normally
```

### 2.4 After-hit behavior

- **New extractions** blocked with `COST_CAP_EXCEEDED`.
- **Already-extracted data** remains fully usable — user can review, correct, approve, and sync. Sync calls the POS Menu API, not Gemini; unaffected by cap.
- **Admin override** (`platform_admin` / `ops_admin`) can temporarily raise the cap via `PATCH /admin/restaurants/{id}/cost-cap` with a required reason; action recorded in `menu_import_admin_actions`.
- **Next billing period** (midnight month-rollover in restaurant TZ) auto-resets MTD.

---

## 3. Per-File Token Cap

### 3.1 Default

| Variable | Default | Notes |
|---|---|---|
| `MENU_EXTRACT_PER_FILE_TOKEN_CAP` | `500000` | Estimated ceiling for a large multi-page PDF |
| `MENU_EXTRACT_PER_PAGE_TOKEN_CAP` | `60000` | Estimated ceiling for one page |

### 3.2 Enforcement

- Pre-call estimate (bytes-to-tokens heuristic + page count).
- If estimate exceeds cap:
  - If `force_flash=true` on upload → route the file to `MENU_EXTRACT_FALLBACK_MODEL` (Flash) even on first try. Audited.
  - Else → reject upload with `FILE_TOO_LARGE` + actionable message: "Try splitting the file or enabling `Fast extraction`."
- Post-call actuals recorded on `menu_import_pages` + aggregated on `menu_imports`.

---

## 4. Warning Thresholds

- **70% of monthly cap** → inline warning banner in UI + email to restaurant owner (if enabled).
- **90% of monthly cap** → banner escalates + "cap may soon be reached" copy.
- **100%** → hard block with `COST_CAP_EXCEEDED`.

Thresholds read from:
- `MENU_EXTRACT_COST_WARN_THRESHOLD_PCT=70`
- `MENU_EXTRACT_COST_ALERT_THRESHOLD_PCT=90`

---

## 5. Flash as Cost-Saver

When to prefer Flash (fallback model) as primary:

- Restaurant has ≥ 5 previous imports with `manual_correction_rate ≤ 15%` (indicates extraction quality is stable for that restaurant's menu style).
- Feature flag `menu_import.default_model_flash` is true for that restaurant.
- Owner sets `model_preference=gemini-3-flash-preview` on upload.

Flash also covers:
- Automatic fallback on Pro quota / 429.
- Retries after JSON schema failure (cheaper retries).
- Internal smoke tests / regression runs.

---

## 6. Per-Call Cost Logging

Every Gemini call writes to a new append-only ledger table:

**`menu_import_model_calls`** (Build Phase 1 additive migration)

| Field | Type | Notes |
|---|---|---|
| id | BIGSERIAL PK | |
| menu_import_id | BIGINT FK | |
| menu_import_page_id | BIGINT FK nullable | |
| restaurant_id | BIGINT | Tenant denorm |
| model_name | TEXT | e.g. `gemini-3.1-pro-preview` |
| sdk_name | TEXT | `emergentintegrations` or `@google/genai` |
| sdk_version | TEXT | |
| prompt_version | TEXT | |
| json_schema_version | TEXT | |
| preprocessing_version | TEXT | |
| normalizer_version | TEXT | |
| tokens_input | INTEGER | |
| tokens_output | INTEGER | |
| tokens_cached | INTEGER | If provider exposes cached-content discount |
| cost_usd | NUMERIC(12,6) | Computed from tokens × model rate |
| duration_ms | INTEGER | |
| http_status | INTEGER nullable | |
| provider_error_code | TEXT nullable | |
| retry_count | INTEGER default 0 | |
| fallback_triggered | BOOLEAN default false | |
| correlation_id | TEXT | OTel trace id |
| created_at | TIMESTAMPTZ | |

Append-only enforcement via the same trigger pattern as `menu_import_audit_log`. Retention 13 months.

Aggregates persist to `menu_imports.cost_usd`, `menu_imports.tokens_input`, `menu_imports.tokens_output`.

---

## 7. Cost Pricing Reference (indicative — confirm at implementation)

Exact token rates per model are set by the provider and change over time. We store **rates in DB** (editable by admin) and compute cost per call at ingest time.

**`menu_import_model_pricing`** (seed data, editable)

| model_name | input_per_1m_usd | output_per_1m_usd | effective_from |
|---|---|---|---|
| gemini-3.1-pro-preview | **TODO — confirm current rate** | **TODO** | — |
| gemini-3-flash-preview | **TODO** | **TODO** | — |
| gemini-2.5-pro | **TODO** | **TODO** | — |
| gemini-2.5-flash | **TODO** | **TODO** | — |

Admin updates rates as provider prices change; historical `cost_usd` on past rows is **not** retroactively re-computed (audit stability).

---

## 8. Dashboards + Alarms

- **Per-restaurant dashboard**: MTD spend, monthly cap, projected monthly spend, % cap used.
- **Platform dashboard**: Top 10 restaurants by MTD spend; total daily/weekly spend; Pro-vs-Flash split; fallback rate.
- **Alarms**:
  - Daily spend > threshold → Sev-3 Slack alert.
  - Any restaurant hits 100% cap → Sev-3 Slack.
  - Pro→Flash fallback rate > 20% over 1h → Sev-2 (suggests quota / provider issue).
  - `cost_cap_hits_total{restaurant_id}` anomaly → Sev-3.

---

## 9. Admin Experience

- **View** cap status per restaurant (read-only), past 12 months MTD chart.
- **Override** cap temporarily (required fields: `reason`, `expires_at`). Action audited.
- **Force-reset MTD** only in disaster cases (e.g., billing dispute); hard-audited.
- **Switch default model** per restaurant (Pro ↔ Flash) with reason.

---

## 10. User-facing Cost UI (`GET /{id}/cost` endpoint)

Already specified in the API contract doc (endpoint AB). The UI surfaces:

- Per-import cost.
- Restaurant month-to-date.
- Cap & remaining.
- Next reset date.

No per-token breakdown surfaced to end users; that is admin-only.

---

## 11. Versioning — What Gets Stamped

Every extraction persists these versions for reproducibility:

- `model_name`
- `sdk_name` + `sdk_version`
- `prompt_version`
- `json_schema_version`
- `preprocessing_version`
- `normalizer_version`

Located on `menu_imports` (aggregate) + `menu_import_model_calls` (per call) + `menu_import_pages.raw_extraction_payload` (original response).

### 11.1 Bumping rules

| Change | Bumps |
|---|---|
| Prompt text edit | `prompt_version` → regression rerun required |
| JSON schema edit | `json_schema_version` → regression rerun required |
| Normalizer rule change | `normalizer_version` → regression rerun required |
| Preprocessing DPI / deskew / contrast change | `preprocessing_version` → regression rerun required |
| Model swap (Pro/Flash/2.5) | `model_name` recorded per-call; no version bump |
| SDK major upgrade | `sdk_version` updated; regression rerun recommended |

### 11.2 Historical reproducibility

A past `menu_imports` row can be **re-extracted** using its stored versions by locating:
- The prompt file `prompts/extract-v{N}.txt`
- The schema file `schemas/gemini-extract-schema-v{N}.json`
- The preprocessing code tag `pp-{version}`
- The normalizer code tag `norm-{version}`
- The SDK version (git-locked)

This is how we diagnose regressions introduced by any layer.

---

## 12. Security Considerations for Cost Data

- Cost tables are tenant-scoped by `restaurant_id`.
- Users see their own cost only.
- Cross-restaurant aggregates (top-10 dashboards) are visible only to `platform_admin`.
- No PII in cost rows; only IDs, tokens, USD, versions, timestamps.

---

## 13. Open Items Around Cost

| Item | Status |
|---|---|
| Exact USD cap for pilot | 🟡 Finance sign-off on `USD 25` (D-6 proposed default) |
| Post-pilot plan-tier caps | 🔴 Pending Finance |
| Exact Gemini price-per-token rates | 🔴 Confirm at Build Phase 2 kickoff; store in `menu_import_model_pricing` table |
| Admin UI for cap override | 🔴 Phase 7 (Production Hardening) |
| Cost anomaly ML detection | 🔴 Phase 3 (post-pilot) |
