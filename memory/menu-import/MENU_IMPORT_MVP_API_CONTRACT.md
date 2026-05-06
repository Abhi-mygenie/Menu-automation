# MyGenie POS — Production-Grade AI Menu Import System — API Contract

**Document version:** 2.0 (production-grade revision)
**Status:** Draft — pending Approval Gate 4
**Base path:** `/api/menu-imports`
**Auth:** All endpoints require POS JWT in `Authorization: Bearer <token>`. JWT must contain `restaurant_id` and `user_id` claims. Tenant isolation is enforced server-side.
**Live-safety invariant:** Only `POST /{id}/sync` (and explicit rollback) writes to the live POS Menu Master. Every other endpoint touches staging tables only.

---

## 0. Conventions

- **Content type:** `application/json` unless multipart noted.
- **Tenant scope:** `restaurant_id` is taken from the JWT and is **never** accepted in the request body.
- **Idempotency:** Mutating endpoints support `Idempotency-Key` header (UUID/string).
- **Concurrency:** Row mutations require `If-Match: <version>` header on `PATCH`s.
- **Timestamps:** ISO 8601 UTC.
- **Money:** All prices are decimal numbers (string in JSON) to avoid float errors. `"rate": "220.00"`.
- **Pagination:** `?page=1&page_size=50` (defaults shown). Responses include `pagination: { page, page_size, total }`.
- **Errors:** standard envelope:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "rate must be > 0",
    "details": [{ "field": "rate", "issue": "must_be_positive" }],
    "trace_id": "01HZ..."
  }
}
```

- **Rate limits:** `X-RateLimit-*` headers; `429 RATE_LIMITED` on excess.
- **Versioning:** This is `v1`. Breaking changes go to `/api/v2/menu-imports`.

---

## 1. Endpoint Index

| # | Method | Path | Purpose | Sync/Async |
|---|---|---|---|---|
| A | POST | `/upload` | Upload menu file, create import record | Sync |
| B | POST | `/{id}/process` | Trigger preprocessing + extraction | Async |
| C | GET | `/{id}/status` | Poll import status | Sync |
| D | GET | `/{id}/rows` | List staged rows w/ children | Sync |
| E | GET | `/{id}/notes` | List menu notes | Sync |
| F | GET | `/{id}/modifier-groups` | List modifier groups | Sync |
| G | PATCH | `/rows/{row_id}` | Update row fields (correction) | Sync |
| H | PATCH | `/variants/{variant_id}` | Update variant (correction) | Sync |
| I | PATCH | `/addons/{addon_id}` | Update add-on (correction) | Sync |
| J | PATCH | `/notes/{note_id}` | Update menu note (correction) | Sync |
| K | POST | `/rows/{row_id}/approve` | Approve a single row | Sync |
| L | POST | `/rows/{row_id}/reject` | Reject a single row | Sync |
| M | POST | `/{id}/approve-selected` | Approve a list of rows | Sync |
| N | POST | `/{id}/approve-all` | Approve all clean rows | Sync |
| O | POST | `/rows/{row_id}/merge` | Merge a row into another | Sync |
| P | POST | `/rows/{row_id}/convert` | Convert row to variant/addon/note/combo | Sync |
| Q | POST | `/rows/{row_id}/split-variant` | Split a row into variants | Sync |
| R | POST | `/{id}/sync` | Sync approved rows to POS Menu | Async |
| S | POST | `/{id}/sync/retry` | Retry sync of failed rows | Async |
| T | POST | `/{id}/rollback` | Rollback synced import (P1) | Async |
| U | GET | `/{id}/export` | Export review CSV | Sync (download) |
| V | GET | `/{id}/audit-log` | Read audit entries | Sync |
| W | GET | `/` | List restaurant's imports | Sync |
| X | DELETE | `/{id}` | Soft delete an import | Sync |
| Y | GET | `/{id}/file` | Get signed URL for original file | Sync |
| Z | POST | `/{id}/save-draft` | Create a named draft snapshot | Sync |
| AA | POST | `/{id}/dedup-preview` | Surface potential duplicates in POS Menu | Sync |
| AB | GET | `/{id}/cost` | Per-import cost + projected monthly cost | Sync |
| AC | POST | `/rows/{row_id}/mark-reviewed` | Mark row reviewed without approving | Sync |
| AD | GET | `/rows/{row_id}/source-crop` | Signed URL to source-crop image (provenance) | Sync |

---

## 2. Endpoint Details

### A. `POST /upload`

Upload a menu file and create a `menu_imports` record.

**Request** (`multipart/form-data`)
- `file` (required) — pdf | jpg | jpeg | png | webp | heic, max 25 MB
- `restaurant_notes` (optional, string ≤ 500 chars)
- `model_preference` (optional, enum: `gemini-3-pro` | `gemini-3-flash` | `auto`, default `auto`)
- `force` (optional, boolean) — bypass duplicate-hash warning

**Response 201**
```json
{
  "menu_import_id": 1024,
  "status": "uploaded",
  "file_hash": "9a1b…",
  "duplicate_of_import_id": null,
  "model_used": "gemini-3-pro",
  "prompt_version": "extract-v1",
  "preprocessing_version": "pp-1.2.0",
  "normalizer_version": "norm-1.4.0",
  "created_at": "2026-01-22T10:11:12Z"
}
```

**Response 200 (duplicate detected, no force)**
```json
{
  "menu_import_id": 1023,
  "status": "synced_to_menu",
  "duplicate_of_import_id": 1023,
  "message": "Duplicate file already imported. Pass force=true to re-run."
}
```

**Errors:** `400 INVALID_FILE_TYPE`, `413 FILE_TOO_LARGE`, `415 UNSUPPORTED_MEDIA_TYPE`, `422 VIRUS_SCAN_FAILED`, `429 RATE_LIMITED`.

---

### B. `POST /{id}/process`

Trigger preprocessing + extraction. Idempotent: calling again on a non-terminal status is a no-op; calling on `failed` re-enqueues.

**Request** (optional body)
```json
{ "model_preference": "gemini-3-flash" }
```

**Response 202**
```json
{ "menu_import_id": 1024, "status": "preprocessing" }
```

**Errors:** `404 NOT_FOUND`, `409 ALREADY_PROCESSING`, `409 ALREADY_SYNCED`.

---

### C. `GET /{id}/status`

**Response 200**
```json
{
  "menu_import_id": 1024,
  "status": "extracting",
  "progress": {
    "total_pages": 5,
    "pages_extracted": 3,
    "pages_failed": 0,
    "rows_extracted": 87,
    "rows_approved": 0,
    "rows_rejected": 0,
    "rows_synced": 0,
    "rows_sync_failed": 0
  },
  "model_used": "gemini-3-pro",
  "prompt_version": "extract-v1",
  "tokens_input": 12450,
  "tokens_output": 9870,
  "cost_usd": "0.0234",
  "updated_at": "2026-01-22T10:13:01Z"
}
```

---

### D. `GET /{id}/rows`

**Query params**
- `page`, `page_size` (default 50, max 200)
- `status` (csv): `raw,review_required,approved,rejected,sync_failed,…`
- `min_confidence`, `max_confidence`
- `warning` (csv) — filter by warning code
- `category` — exact match on effective category
- `search` — trigram match on item_name
- `include` — csv of `variants,addons,modifier_groups,notes`

**Response 200**
```json
{
  "data": [
    {
      "id": 50001,
      "menu_import_id": 1024,
      "page_id": 7011,
      "raw_text": "Paneer Butter Masala 220",
      "item_name": "Paneer Butter Masala",
      "corrected_item_name": null,
      "category": "Main Course",
      "corrected_category": null,
      "subcategory": "Paneer",
      "rate": "220.00",
      "corrected_rate": null,
      "food_type": "veg",
      "pricing_type": "fixed",
      "unit": null,
      "description": null,
      "confidence_score": 0.91,
      "confidence_breakdown": {
        "item_name": 0.94,
        "category": 0.82,
        "rate": 0.91,
        "overall": 0.91
      },
      "warnings": [],
      "status": "review_required",
      "display_order": 12,
      "version": 1,
      "variants": [],
      "addons": [],
      "synced_external_ref": null,
      "applied_memory_ids": [],
      "updated_at": "2026-01-22T10:14:55Z"
    }
  ],
  "pagination": { "page": 1, "page_size": 50, "total": 87 }
}
```

---

### E. `GET /{id}/notes`

```json
{
  "data": [
    {
      "id": 9001,
      "menu_import_id": 1024,
      "page_id": 7011,
      "note_text": "GST extra",
      "note_type": "tax_note",
      "mapped_to": "unmapped",
      "confidence_score": 0.85,
      "status": "review_required"
    }
  ]
}
```

---

### F. `GET /{id}/modifier-groups`

```json
{
  "data": [
    {
      "id": 4001,
      "group_name": "Choose your sauce",
      "group_type": "choice_group",
      "min_select": 1,
      "max_select": 1,
      "is_required": true,
      "confidence_score": 0.78,
      "status": "review_required",
      "options": [
        {"id": 4101, "option_name": "BBQ", "option_price": "0.00", "status": "review_required"},
        {"id": 4102, "option_name": "Peri Peri", "option_price": "0.00", "status": "review_required"}
      ]
    }
  ]
}
```

---

### G. `PATCH /rows/{row_id}`

Apply user corrections. Each call writes a `menu_import_corrections` event for every changed field. Concurrency via `If-Match: <version>`.

**Request**
```json
{
  "corrected_item_name": "Paneer Butter Masala",
  "corrected_category": "Indian Main",
  "corrected_rate": "240.00",
  "corrected_food_type": "veg",
  "corrected_pricing_type": "fixed",
  "warnings_resolved": ["price_uncertain"]
}
```

**Response 200**
```json
{
  "id": 50001,
  "status": "review_required",
  "version": 2,
  "corrected_item_name": "Paneer Butter Masala",
  "corrected_category": "Indian Main",
  "corrected_rate": "240.00",
  "warnings": [],
  "applied_memory_ids": [88, 91],
  "updated_at": "2026-01-22T10:18:21Z"
}
```

**Errors:** `404`, `409 VERSION_CONFLICT` with `current_version`, `422 VALIDATION_FAILED`.

---

### H. `PATCH /variants/{variant_id}`

```json
{
  "corrected_variant_group_name": "Size",
  "corrected_variant_name": "Medium",
  "corrected_variant_price": "180.00",
  "is_default": false,
  "status": "approved"
}
```

**Response 200** — variant resource.

---

### I. `PATCH /addons/{addon_id}`

```json
{
  "corrected_addon_group_name": "Extras",
  "corrected_addon_name": "Extra Cheese",
  "corrected_addon_price": "20.00",
  "status": "approved"
}
```

---

### J. `PATCH /notes/{note_id}`

```json
{
  "note_type": "tax_note",
  "mapped_to": "tax_setting",
  "status": "approved"
}
```

`mapped_to: "tax_setting"` does NOT auto-apply tax; it just records intent. The actual tax setting in POS is left to the user via the POS UI.

---

### K. `POST /rows/{row_id}/approve`

```json
{ "force": false }
```

- Validates row + children. If any child still `review_required`, returns 422 with `pending_children`.
- `force=true` (admin role only) bypasses blocking warnings; recorded in audit log.

**Response 200** — row resource with `status: "approved"`.

---

### L. `POST /rows/{row_id}/reject`

```json
{ "reason": "duplicate of row 50007" }
```

---

### M. `POST /{id}/approve-selected`

```json
{ "row_ids": [50001, 50002, 50003] }
```

- Atomic per-row; partial success allowed.
- **Response 200**:
```json
{
  "approved": [50001, 50002],
  "failed": [
    {"id": 50003, "code": "PENDING_CHILDREN", "message": "1 variant pending review"}
  ]
}
```

---

### N. `POST /{id}/approve-all`

Auto-approves only rows where:
- `effective confidence >= 0.85`
- No blocking warning in: `price_uncertain, missing_price, addon_without_parent_item, multi_column_confusion`
- All children `approved` or `ignored`

```json
{ "min_confidence": 0.85 }
```
**Response 200**:
```json
{ "approved_count": 53, "skipped_count": 34, "skipped_reasons": { "low_confidence": 18, "blocking_warning": 12, "pending_children": 4 } }
```

---

### O. `POST /rows/{row_id}/merge`

Merge this row into another (target).

```json
{
  "target_row_id": 50007,
  "keep_fields_from": "target",       // 'target' | 'source' | 'manual'
  "manual_overrides": {                // when keep_fields_from='manual'
    "item_name": "Paneer Butter Masala",
    "rate": "240.00"
  }
}
```

**Effect:** source row → `status=merged`, `merged_into_row_id=target`. Target keeps its identity. Variants/add-ons of source can be migrated (request param `migrate_children: true`).

---

### P. `POST /rows/{row_id}/convert`

Convert this row into:
- a variant of another row (`to: "variant"` + `parent_row_id`)
- an add-on of another row (`to: "addon"` + `parent_row_id`)
- a menu note (`to: "menu_note"` + `note_type`)
- mark as combo (`to: "combo"`)

```json
{
  "to": "variant",
  "parent_row_id": 50007,
  "variant_group_name": "Size",
  "variant_name": "Medium",
  "variant_price": "180.00"
}
```

---

### Q. `POST /rows/{row_id}/split-variant`

Detect "Pizza — S 120 / M 180 / L 250" wrongly extracted as a single row → split into one parent row + variants.

```json
{
  "parent": { "item_name": "Veg Pizza", "category": "Pizza", "base_price": null },
  "variants": [
    { "name": "Small",  "price": "120.00" },
    { "name": "Medium", "price": "180.00" },
    { "name": "Large",  "price": "250.00" }
  ]
}
```

---

### R. `POST /{id}/sync`

Run validation + push approved rows to POS Menu Master via Menu API.

**Request (optional)**
```json
{ "dry_run": false, "row_ids": null }
```

- `row_ids: null` → all approved rows; otherwise scoped subset.
- `dry_run: true` returns a per-row preview (what would be created/updated) **without** calling POS Menu API.

**Response 202**
```json
{ "menu_import_id": 1024, "status": "syncing", "rows_queued": 53 }
```

**Errors:** `409 NOT_READY` if no approved rows or status not `review_required|sync_partial`.

---

### S. `POST /{id}/sync/retry`

Re-enqueue rows in `sync_failed` state.

**Response 202** — same shape as R.

---

### T. `POST /{id}/rollback` (P1)

Walk `rollback_ref` → call `DELETE /pos/menu/items/{id}` per created item. If the POS Menu API doesn't support deletes, returns 501 with a `manual_cleanup_list`.

**Response 202**
```json
{
  "menu_import_id": 1024,
  "status": "rolling_back",
  "items_to_delete": 53
}
```

---

### U. `GET /{id}/export`

CSV download of all rows + variants/addons (flattened). Useful for offline audit.

**Response 200** — `Content-Type: text/csv; charset=utf-8`.
Columns: `row_id, item_name, category, subcategory, rate, food_type, pricing_type, unit, description, confidence_score, warnings, status, variants, addons, sync_status, external_item_id`.

---

### V. `GET /{id}/audit-log`

```json
{
  "data": [
    {
      "id": 70001,
      "actor_user_id": 4123,
      "action": "sync_create_item",
      "attempt_no": 1,
      "idempotency_key": "menu-import:1024:row:50001:attempt:1",
      "http_status": 201,
      "duration_ms": 312,
      "created_at": "2026-01-22T10:30:01Z",
      "request_payload": { "...": "redacted by default; full only for admin" },
      "response_payload": { "item_id": 9001 }
    }
  ],
  "pagination": { "page": 1, "page_size": 50, "total": 1 }
}
```

---

### W. `GET /`

List the restaurant's menu imports.

Query: `status`, `created_after`, `created_before`, `page`, `page_size`.

---

### X. `DELETE /{id}`

Soft delete (sets `deleted_at`). Allowed only when `status` is not `synced_to_menu` (deleting a synced import requires explicit rollback first).

---

### Y. `GET /{id}/file`

Returns a signed URL (TTL 5 min) to download the original file.

```json
{ "url": "https://…signed", "expires_at": "2026-01-22T10:35:00Z" }
```

---

### Z. `POST /{id}/save-draft`

Create an optional, named snapshot of the current review state. Purely for user checkpointing and support rescue; does not affect sync.

**Request**
```json
{ "label": "before-dinner-review" }
```

**Response 201**
```json
{ "snapshot_id": 5001, "created_at": "2026-01-22T10:40:00Z" }
```

Retention: 30 days by default. Restore is admin-only via a controlled support endpoint (not user-exposed in Phase 1).

---

### AA. `POST /{id}/dedup-preview`

For each **approved** row (or a supplied subset), return any likely duplicate matches in the live POS menu. Advisory only — no writes to POS.

**Request (optional)**
```json
{ "row_ids": null, "fuzzy_threshold": 0.92 }
```

**Response 200**
```json
{
  "menu_import_id": 1024,
  "generated_at": "2026-01-22T11:10:00Z",
  "rows": [
    {
      "row_id": 50001,
      "effective_item_name": "Paneer Butter Masala",
      "effective_category": "Indian Main",
      "effective_rate": "240.00",
      "matches": [
        {
          "external_item_id": "pos-item-8812",
          "name": "Paneer Butter Masala",
          "category": "Indian Main",
          "price": "240.00",
          "similarity": 0.99,
          "recommended_resolution": "skip"
        }
      ]
    },
    {
      "row_id": 50002,
      "effective_item_name": "Veg Pizza",
      "matches": []
    }
  ]
}
```

Recommended resolutions:
- `similarity ≥ 0.98 && price equal` → `skip`
- `similarity ≥ 0.92 && price differs` → `update_existing`
- else → `create_new`

UI surfaces the modal and the user's choice is written to `menu_import_rows.dedup_resolution` via a follow-up PATCH on each row.

---

### AB. `GET /{id}/cost`

```json
{
  "menu_import_id": 1024,
  "cost_usd": "0.0234",
  "tokens_input": 12450,
  "tokens_output": 9870,
  "model_used": "gemini-3-pro",
  "restaurant_month_to_date_usd": "3.89",
  "restaurant_monthly_cap_usd": "25.00",
  "cap_remaining_usd": "21.11"
}
```

---

### AC. `POST /rows/{row_id}/mark-reviewed`

Set `reviewed=true` on the row without approving. Allows "I looked at this, I'll decide later" state.

```json
{ "reviewed": true }
```

---

### AD. `GET /rows/{row_id}/source-crop`

Returns a signed URL to a cropped image for the row's `source_bbox` on the source page — the primary UI provenance control.

```json
{
  "url": "https://…signed",
  "page_no": 3,
  "bbox": { "x": 112, "y": 540, "w": 620, "h": 42 },
  "expires_at": "2026-01-22T11:30:00Z"
}
```

If `source_bbox` is null (manual row or unavailable), returns 404 `NO_SOURCE_GROUNDING`.

---

## 3. Extraction JSON Contract (model output, internal)

Returned by Gemini 3, validated by Ajv before persisting. Versioned by `prompt_version` and `extraction_schema_version`.

```json
{
  "extraction_schema_version": "ext-1.0",
  "menu_import_id": 1024,
  "page_no": 1,
  "items": [
    {
      "raw_text": "Paneer Butter Masala 220",
      "item_name": "Paneer Butter Masala",
      "category": "Main Course",
      "subcategory": "Paneer",
      "rate": 220,
      "food_type": "veg",
      "pricing_type": "fixed",
      "unit": null,
      "description": null,
      "variants": [],
      "addons": [],
      "confidence": {
        "item_name": 0.94,
        "category": 0.82,
        "rate": 0.91,
        "food_type": 0.88,
        "overall": 0.89
      },
      "warnings": []
    },
    {
      "raw_text": "Veg Pizza S/M/L 120/180/250",
      "item_name": "Veg Pizza",
      "category": "Pizza",
      "subcategory": null,
      "rate": null,
      "food_type": "veg",
      "pricing_type": "variant_based",
      "unit": null,
      "description": null,
      "variants": [
        { "variant_group_name": "Size", "variant_name": "Small",  "variant_price": 120, "confidence": 0.92 },
        { "variant_group_name": "Size", "variant_name": "Medium", "variant_price": 180, "confidence": 0.92 },
        { "variant_group_name": "Size", "variant_name": "Large",  "variant_price": 250, "confidence": 0.92 }
      ],
      "addons": [],
      "confidence": { "item_name": 0.95, "category": 0.90, "overall": 0.91 },
      "warnings": ["variant_detected"]
    }
  ],
  "menu_notes": [
    { "note_text": "GST extra",  "note_type": "tax_note", "confidence": 0.85 },
    { "note_text": "Jain option available", "note_type": "availability_note", "confidence": 0.7 }
  ],
  "modifier_groups": []
}
```

Schema constraints (high-level):
- `items[*].rate`: number | null. Must be `>= 0` if present.
- `items[*].variants[*].variant_price`: number | null.
- `items[*].food_type`: enum.
- `items[*].pricing_type`: enum.
- `items[*].confidence.overall`: number 0..1, **required**.
- Unknown fields rejected (`additionalProperties: false`) for forward-compat safety.

Versioning:
- `prompt_version` is bumped when prompt text changes.
- `extraction_schema_version` is bumped when JSON shape changes (prefer non-breaking additions; bump major only on breaking).
- Persisted alongside each row in `menu_imports` for reproducibility.

---

## 4. Error Catalog

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `INVALID_FILE_TYPE` | Unsupported MIME type |
| 400 | `INVALID_REQUEST` | Body schema invalid |
| 401 | `UNAUTHENTICATED` | Missing/invalid JWT |
| 403 | `FORBIDDEN` | Role not allowed |
| 404 | `NOT_FOUND` | Resource not found in scope |
| 409 | `VERSION_CONFLICT` | Optimistic concurrency mismatch |
| 409 | `ALREADY_PROCESSING` | Import already running |
| 409 | `NOT_READY` | Sync requested but no approved rows / status invalid |
| 413 | `FILE_TOO_LARGE` | Above max upload size |
| 415 | `UNSUPPORTED_MEDIA_TYPE` |
| 422 | `VALIDATION_FAILED` | Business rule violation |
| 422 | `PENDING_CHILDREN` | Row approve blocked by child rows |
| 422 | `BLOCKING_WARNING` | Approve blocked by warning, force not given |
| 422 | `VIRUS_SCAN_FAILED` |
| 422 | `COST_CAP_EXCEEDED` | Per-restaurant monthly cost cap reached |
| 422 | `FILE_MAGIC_MISMATCH` | MIME type does not match file bytes |
| 422 | `NO_SOURCE_GROUNDING` | Row has no `raw_text` / `source_bbox` — cannot be auto-approved |
| 422 | `DUPLICATE_ON_POS` | Sync blocked: unresolved duplicate with live POS item |
| 422 | `DEDUP_PREVIEW_REQUIRED` | Sync blocked: duplicate-preview has not been run on this import (Phase 2+) |
| 429 | `RATE_LIMITED` |
| 500 | `INTERNAL_ERROR` |
| 502 | `MODEL_UPSTREAM_ERROR` | Gemini error after retries |
| 502 | `POS_MENU_UPSTREAM_ERROR` | Sync to POS Menu API failed |
| 503 | `SERVICE_UNAVAILABLE` |
| 504 | `UPSTREAM_TIMEOUT` |

---

## 5. Authorization Matrix

| Role | Upload | Process | Edit Rows | Approve | Sync | Rollback | Promote Memory |
|---|---|---|---|---|---|---|---|
| restaurant_owner | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| restaurant_manager | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| restaurant_staff | — | — | ✓ (limited) | — | — | — | — |
| ops_admin (MyGenie) | ✓ | ✓ | ✓ | ✓ (with force) | ✓ | ✓ | — |
| platform_admin | full | full | full | full (with force) | full | full | ✓ |

`force=true` on approve is restricted to `ops_admin` and `platform_admin` and is recorded in audit log.

---

## 6. Webhooks (P1)

For decoupled UIs / monitoring:

- `menu_import.status_changed` → `{ menu_import_id, old_status, new_status, at }`
- `menu_import.row_synced` → `{ menu_import_id, row_id, external_item_id, at }`
- `menu_import.sync_failed` → `{ menu_import_id, row_id, error, at }`

Signed with HMAC-SHA256 using a per-restaurant webhook secret; deliveries retried with exponential backoff up to 24h.

---

## 7. OpenAPI / SDK

- The implementation must publish an OpenAPI 3.1 doc at `/api/menu-imports/openapi.json`.
- Generated TS client for the React review UI.
- Postman collection committed at `/docs/postman/menu-import.json` (P1).

---

## 8. Testing Conventions for the API

- Every mutation endpoint has a happy-path + 1 concurrency conflict test + 1 validation failure test.
- Every async endpoint has a "queued + worker picks up + final state" e2e test using a real Redis + worker process.
- Sync endpoint has a "POS Menu API returns 5xx → row marked sync_failed" test using a contract-tested mock of the POS Menu API.
- See `MENU_IMPORT_MVP_TEST_STRATEGY.md`.
