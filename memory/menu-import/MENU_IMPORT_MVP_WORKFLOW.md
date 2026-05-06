# MyGenie POS — Production-Grade AI Menu Import System — Workflow

**Document version:** 2.0 (production-grade revision)
**Status:** Draft — pending Approval Gate 2
**Module:** `menu-import`
**Positioning:** Workflows are production-grade and live-safe from Phase 1. Every stage is idempotent, resumable, auditable, and tenant-scoped.

---

## 1. End-to-End Workflow (canonical)

```
┌────────────────┐
│ 1. Upload menu │  POST /api/menu-imports/upload  (multipart)
└──────┬─────────┘
       │  → store original via StorageAdapter
       │  → compute sha256, mime, size, page-count guess
       │  → INSERT menu_imports (status=uploaded)
       │  → ENQUEUE preprocess
       ▼
┌──────────────────────┐
│ 2. Preprocessing     │   worker: menu-import.preprocess
│   - PDF → page images│   set status=preprocessing
│   - rotate / deskew  │   per page: INSERT menu_import_pages (status=ready|failed)
│   - contrast         │   on done → ENQUEUE extract per page
└──────┬───────────────┘
       ▼
┌──────────────────────┐
│ 3. AI Extraction     │   worker: menu-import.extract
│   Gemini 3 Pro/Flash │   set status=extracting
│   structured JSON    │   per page: items, variants, addons, menu_notes
│                      │   INSERT menu_import_rows (status=raw)
└──────┬───────────────┘
       ▼
┌──────────────────────┐
│ 4. Normalization +   │   worker: menu-import.normalize
│    Confidence +      │   strip currency, unit detect, food-type, title-case
│    Learning apply    │   apply restaurant-scope memory
│                      │   recompute confidence + warnings
│                      │   set status=review_required
└──────┬───────────────┘
       ▼
┌──────────────────────┐
│ 5. Review UI         │   user opens /menu-import/{id}/review
│   - rows table       │   GET /rows  (with variants/addons/notes)
│   - panels           │
│   - filters / search │
└──────┬───────────────┘
       │
       │  user actions:
       │     PATCH rows / variants / addons / notes  → INSERT corrections + update memory
       │     POST  rows/{id}/approve  | reject | merge | split | convert
       ▼
┌──────────────────────┐
│ 6. Approval          │   POST /approve-selected | /approve-all (clean only)
│                      │   row.status=approved
│                      │   children must be approved or ignored
└──────┬───────────────┘
       ▼
┌──────────────────────┐
│ 7. Validation        │   on /sync trigger:
│                      │   required fields, price > 0, food_type enum, etc.
│                      │   block-list violations cause sync to refuse w/ 422
└──────┬───────────────┘
       ▼
┌──────────────────────┐
│ 8. Sync to POS Menu  │   worker: menu-import.sync
│   Master via API     │   resolve/create categories
│                      │   create items / variants / addons
│                      │   store synced_external_ref per row
│                      │   per attempt: INSERT menu_import_audit_log
└──────┬───────────────┘
       ▼
┌──────────────────────┐
│ 9. Audit + Rollback  │   menu_import_audit_log holds full request/response
│                      │   rollback_ref = list of created entity ids
│                      │   set status=synced_to_menu  (or sync_partial)
└──────┬───────────────┘
       ▼
┌──────────────────────┐
│ 10. Learning improves│   memory promotion job (cron / on-write)
│     future imports   │   restaurant → cuisine → global thresholds
└──────────────────────┘
```

---

## 2. Per-stage Detail

### Stage 1 — Upload
- **Trigger:** user clicks "Upload menu", picks file.
- **Inputs:** `multipart/form-data` with `file` + optional `restaurant_notes`.
- **Side effects:**
  - File written via `StorageAdapter.put(...)`.
  - `menu_imports` row inserted: `status=uploaded`, `file_hash`, `file_url`, `file_type`, `model_used` (default `gemini-3-pro`), `prompt_version`, `preprocessing_version`, `normalizer_version`.
  - Job enqueued: `menu-import.preprocess` with `{ menu_import_id }`.
- **Idempotency:** `(restaurant_id, file_hash)` — if existing import in `synced_to_menu` exists, response includes `duplicate_of_import_id`; user may force re-run with `?force=true`.

### Stage 2 — Preprocessing (background)
- **Trigger:** `menu-import.preprocess` job.
- **Steps:**
  1. Set `menu_imports.status = preprocessing`.
  2. If PDF: split each page → image (configurable DPI). If image: single page.
  3. For each page: rotate / deskew / normalize contrast → put image via Storage Adapter.
  4. INSERT `menu_import_pages` (page_no, image_url, processing_status=ready|failed).
  5. After all pages: enqueue `menu-import.extract` per page (or batch if total pages ≤ 4).
  6. Set `menu_imports.status = extracting`.
- **Failure handling:** per-page failure → `processing_status=failed` + `error_message`; remaining pages still processed.
- **Configurable knobs:** DPI (default 250), max pages (default 30), max image side (default 2400 px).

### Stage 3 — AI Extraction (background)
- **Trigger:** `menu-import.extract` job per page.
- **Steps:**
  1. Read page image via Storage Adapter.
  2. Build prompt from versioned template (`prompts/extract.{version}.txt`) + JSON schema.
  3. Call Gemini 3 (Pro by default; Flash if file size small + restaurant has high accuracy track record).
  4. Validate response against JSON schema (Ajv).
  5. Persist:
     - `menu_import_rows` (one per item).
     - `menu_import_row_variants` (children).
     - `menu_import_row_addons` (children).
     - `menu_import_menu_notes` (page-level notes).
     - Modifier groups detected: `menu_import_modifier_groups` + `_options` (best-effort, P1).
  6. Mark page `processing_status=extracted`.
- **Failure handling:**
  - 5xx / 429 → exponential backoff; on Pro 429 fall back to Flash if `auto_fallback=true`.
  - JSON parse / schema fail → up to 2 stricter retries; then mark page `failed`.
- **All-pages-done check:** when no remaining `pending` page jobs, enqueue `menu-import.normalize`.

### Stage 4 — Normalization + Learning Apply (background)
- **Trigger:** `menu-import.normalize` job once all pages settled.
- **Steps:**
  1. For each row in this import:
     - Strip currency symbols.
     - Detect unit (`/kg`, `/pc`, `/plate`, `/dozen`).
     - Map food type tokens to enum.
     - Apply restaurant-scope `menu_learning_memory` rules (spelling, category mapping, etc.) — record the rule id used in `applied_memory_ids`.
     - Re-compute `confidence_score` (weighted blend: model field confidence × memory boost × warning penalty).
     - Re-compute `warnings`.
  2. Set `menu_imports.status = review_required`.

### Stage 5 — Review (interactive)
- **UI loads:** `GET /api/menu-imports/{id}/rows?include=variants,addons,modifier_groups,notes`.
- **User edits:** every change → `PATCH` → server inserts a `menu_import_corrections` row capturing `field_name, old_value, new_value, raw_text, correction_type, source=user`. `_corrected` columns on the staging row are filled.
- **Learning write-side:** on save, restaurant-scope `menu_learning_memory` is upserted (`usage_count += 1`).
- **Row actions** (each is a server-side endpoint or a `PATCH` on `status`):
  - approve / reject / delete / split-variant / convert-to-variant / convert-to-addon / mark-as-combo / mark-as-menu-note / merge-duplicate.
- **Batch actions:**
  - approve-all-clean: server-side filter `confidence_score >= 0.85 AND no blocking warnings`.
  - approve-selected / reject-selected / sync-approved.
  - export CSV.

### Stage 6 — Approval
- **Rules:**
  - A row is approvable only if:
    - All required fields valid (item_name, category, price OR ≥1 variant price).
    - All variant children are `approved` or `ignored`.
    - All add-on children are `approved` or `ignored`.
    - No blocking warning unresolved (user can override by explicit `force_approve=true` with audit annotation).
- **Side effects:** `menu_import_rows.status = approved`, `approved_at`, `approved_by`.

### Stage 7 — Validation (pre-sync)
- Runs again at `/sync` time as a defense-in-depth check (between approve and sync, learning rules or POS Menu master could have changed).
- Ensures:
  - All approved rows still satisfy validation rules.
  - Categories resolvable (existing or to-create).
  - No price/unit anomalies introduced after approval.
- On failure: returns 422 with per-row error list; offending rows revert to `review_required`.

### Stage 8 — Sync (background)
- **Trigger:** `POST /api/menu-imports/{id}/sync`.
- **Worker steps:**
  1. Load all `approved` rows with children.
  2. Resolve categories (`GET /pos/menu/categories`); for missing: `POST` create with `Idempotency-Key`.
  3. For each row:
     - `POST /pos/menu/items` with the resolved `category_id`, food_type, base price, etc.
     - For each approved variant: `POST /pos/menu/items/{id}/variants`.
     - For each approved add-on: `POST /pos/menu/items/{id}/addons`.
     - Save returned external IDs to `menu_import_rows.synced_external_ref` (JSONB: `{item_id, variant_ids, addon_ids}`).
     - INSERT `menu_import_audit_log` (request, response, status, latency, http_status).
     - On failure → row.status=`sync_failed`, `error_message`, `last_attempt_at`.
  4. After all rows attempted:
     - All success → `menu_imports.status = synced_to_menu`.
     - Some success / some fail → `menu_imports.status = sync_partial`.
     - All fail → keep `review_required` (with synced_failed rows visible) — do NOT mark as failed import.
- **Retry:** user clicks "Retry failed" → re-enqueues sync job with filter `status=sync_failed`.

### Stage 9 — Audit + Rollback
- Every sync attempt writes one or more `menu_import_audit_log` rows: `actor_user_id, action, payload, response, http_status, duration_ms, attempt_no, idempotency_key`.
- `menu_imports.rollback_ref` (JSONB) accumulates the list of `(item_id, variant_ids, addon_ids)` created across the import.
- **Rollback API (P1):** `POST /api/menu-imports/{id}/rollback` walks `rollback_ref` and calls `DELETE /pos/menu/items/{id}` if POS supports it; if not, marks rows as `archived` in this module and surfaces the list to ops for manual cleanup.

### Stage 10 — Learning Promotion (background, periodic)
- **Job:** `menu-import.learning.promote` — runs hourly (configurable).
- **Steps:**
  - Find restaurant-scope rules with `usage_count >= 3` confirmed across `>= 3` distinct restaurants of the same `cuisine_type` → upsert into cuisine-scope memory with `confidence = 0.6`.
  - Find cuisine-scope rules with `usage_count >= 10` distinct restaurants AND admin approval flag → upsert into global-scope memory.
  - **Never** auto-promote to global without an admin `approved_at` timestamp.
- See `MENU_IMPORT_MVP_LEARNING_MEMORY_SPEC.md` for full math.

---

## 3. State Machine — `menu_imports.status`

Allowed transitions:

| From | To | Trigger |
|---|---|---|
| (new) | `uploaded` | upload API |
| `uploaded` | `preprocessing` | preprocess worker pickup |
| `preprocessing` | `extracting` | preprocess complete |
| `preprocessing` | `failed` | unrecoverable preprocess error |
| `extracting` | `review_required` | normalize complete |
| `extracting` | `failed` | all pages failed |
| `review_required` | `syncing` | user calls sync |
| `syncing` | `synced_to_menu` | all rows synced |
| `syncing` | `sync_partial` | some rows failed |
| `sync_partial` | `syncing` | retry failed rows |
| `sync_partial` | `synced_to_menu` | retry completes all |
| any non-terminal | `failed` | unrecoverable error |
| `failed` | `preprocessing` | user "retry import" (P1) |

Terminal statuses: `synced_to_menu`, `failed`.
Re-runnable (with audit): `synced_to_menu` allows a new import for same file with `force=true` (creates a new import row).

---

## 4. State Machine — `menu_import_rows.status`

| From | To | Trigger |
|---|---|---|
| (new) | `raw` | inserted by extract worker |
| `raw` | `review_required` | normalize sets per-row |
| `review_required` | `approved` | user approve |
| `review_required` | `rejected` | user reject |
| `review_required` | `merged_into:{row_id}` | user merge duplicate |
| `review_required` | `converted_to_variant_of:{row_id}` | user convert |
| `review_required` | `converted_to_addon_of:{row_id}` | user convert |
| `review_required` | `marked_as_menu_note` | user marks as note |
| `review_required` | `marked_as_combo` | user marks as combo |
| `approved` | `syncing` | sync started |
| `syncing` | `synced` | sync ok |
| `syncing` | `sync_failed` | sync error |
| `sync_failed` | `syncing` | retry |
| `synced` | (terminal) | — |

---

## 5. Worker Concurrency Model

- **preprocess-worker** — 1 concurrent job per worker (CPU-bound, image ops).
- **extract-worker** — 4–8 concurrent (network-bound to Gemini), bounded by Gemini rate limits per project.
- **normalize-worker** — 4 concurrent (DB-bound).
- **sync-worker** — 2 concurrent per restaurant (avoid hammering POS Menu API), but global pool larger.

---

## 6. Edge Cases + Behavior

| Case | Behavior |
|---|---|
| Re-upload of same file before previous completes | Returns existing import id (status visible). |
| Re-upload after sync | Warns "duplicate menu detected"; user can `force=true` to create new import. |
| User edits a row, then closes tab | Edits already saved per-PATCH; review can resume on next visit. |
| User sends "approve-all-clean" before normalize finishes | API returns 409 `import_not_ready`. |
| User approves a row whose child variant is unapproved | API returns 422 with `pending_children=[…]`. |
| Two users in the same restaurant edit same row | Optimistic concurrency; second `PATCH` returns 409 with current version. |
| Gemini rate limit | extract-worker switches Pro → Flash if `auto_fallback=true`; otherwise retries with backoff. |
| Menu Master API down | sync-worker retries; rows go `sync_failed`; user can retry later. |
| Partial sync, then user edits a synced row | `synced` rows are immutable in this module; user must edit via POS UI directly. |
| File hash matches a different restaurant | Treated as new import; learning memory is per-restaurant so no cross-tenant leakage. |
| Combo detected but user marks "split into items" | Only allowed in P1; in MVP, combos remain single items. |

---

## 7. Sequence Diagrams

### 7.1 Upload + Extract

```
User -> UI : choose file, click upload
UI -> API : POST /upload (multipart, JWT)
API -> Storage : put(original)
API -> DB : INSERT menu_imports (uploaded)
API -> Queue : enqueue preprocess
API -> UI : 202 { menu_import_id, status: uploaded }
UI -> API : poll GET /status
Queue -> PreprocessWorker : pickup
PreprocessWorker -> Storage : get(original) + put(page-1.png ...)
PreprocessWorker -> DB : INSERT menu_import_pages
PreprocessWorker -> Queue : enqueue extract per page
Queue -> ExtractWorker : pickup page
ExtractWorker -> Storage : signedUrl(page-1.png)
ExtractWorker -> Gemini3 : vision + JSON schema
Gemini3 -> ExtractWorker : structured JSON
ExtractWorker -> DB : INSERT rows / variants / addons / notes
ExtractWorker -> Queue : (last page) enqueue normalize
Queue -> NormalizeWorker : pickup
NormalizeWorker -> DB : update rows (apply memory + recompute confidence)
NormalizeWorker -> DB : menu_imports.status = review_required
UI -> API : GET /rows -> renders review UI
```

### 7.2 Approve + Sync

```
User -> UI : edits + approves rows
UI -> API : PATCH /rows/{id} (each edit)
API -> DB : update row + INSERT correction
API -> DB : upsert restaurant memory
User -> UI : click "Sync approved"
UI -> API : POST /sync
API -> Queue : enqueue sync
Queue -> SyncWorker : pickup
SyncWorker -> POS Menu API : POST /menu/categories (idempotent)
SyncWorker -> POS Menu API : POST /menu/items
SyncWorker -> POS Menu API : POST /menu/items/{id}/variants
SyncWorker -> POS Menu API : POST /menu/items/{id}/addons
POS Menu API -> SyncWorker : ids
SyncWorker -> DB : update synced_external_ref + INSERT audit_log
SyncWorker -> DB : menu_imports.status = synced_to_menu
UI -> API : poll status -> show success
```

---

## 8. Workflow Anti-patterns (explicitly forbidden)

- ❌ AI directly calling POS Menu API.
- ❌ Auto-approving rows below confidence threshold.
- ❌ Writing to global learning memory from a single correction.
- ❌ Hiding low-confidence rows from the user.
- ❌ Discarding raw model response (must be retained for audit).
- ❌ Skipping validation between approve and sync.
- ❌ Silent partial sync without surfacing failed rows.
- ❌ Skipping the duplicate-preview step before sync (Phase 2+).
- ❌ Persisting an extracted row with no `raw_text` / `source_bbox` provenance.
- ❌ Applying a learning rule to a field the user has already edited in the current session.

---

## 9. Draft Save — First-class Workflow Step

Every user edit is already a durable save (PATCH writes to staging immediately). On top of that, the user can:

- Leave the review screen and return — state is preserved.
- Click **Save draft** to create a named snapshot in `menu_import_draft_snapshots` (JSONB payload). Snapshots are for the user's peace of mind (e.g., end-of-day checkpoint) and for support/ops to roll back an in-progress review.
- Snapshots do not affect sync; only `approved` rows sync. Draft state and sync state are independent axes.

---

## 10. Correction Memory State Machine

Tracks the lifecycle of a learning rule.

```
   (created on first correction, restaurant scope)
             │
             ▼
      restaurant.active  ◄──────── user keeps correcting ────────┐
             │                                                    │
  ≥ 3 restaurants / cuisine                                       │
             │                                                    │
             ▼                                                    │
      cuisine.active (auto-promoted, admin may suppress)          │
             │                                                    │
  ≥ 10 restaurants / ≥ 3 cuisines                                 │
             │                                                    │
             ▼                                                    │
      global.candidate                                            │
             │                                                    │
  admin approves ─────────────────►  global.active                │
             │                              │                     │
             │                              ▼                     │
             │                  reversal-budget hit ───►  deactivated (soft) ──► archived
             │
  admin suppresses ──► suppressed (never applies; surfaced to admin for context)
```

A rule in any `active` state is applied during normalization (order: restaurant > cuisine > global). A rule in `candidate`, `suppressed`, `deactivated`, or `archived` is not applied.

---

## 11. Manual Override Flow

For cases where extraction fails or the user wants to enter items by hand:

1. User clicks **Add row** (or **Mark page as manual** on a failed page).
2. User enters item fields directly — the row is inserted with `source=manual`, `confidence_score=1.0`, `warnings=[]`, `raw_text=null` (permitted only for manual rows), `source_bbox=null`.
3. Manual rows do NOT contribute to correction memory (they are original user intent, not corrections of extracted data).
4. Manual rows flow through the same approval + sync path as extracted rows.

---

## 12. Failure Recovery Matrix (expanded)

| Stage failure | Containment | Recovery action |
|---|---|---|
| Upload: virus scan fails | File rejected; not stored beyond quarantine | User re-uploads a clean file |
| Upload: magic byte mismatch | 415 returned | User uploads correct file type |
| Upload: size / page cap | 413 / 422 | User splits file |
| Upload: cost cap hit | 422 `COST_CAP_EXCEEDED` | Admin override or next billing period |
| Preprocess: PDF corrupt | Import `failed` with message | User re-uploads; image path available |
| Preprocess: single page fails | Page `failed`; others continue | User uses manual override on that page |
| Extract: Gemini 429/5xx | Worker retries (3 exp. backoff); Pro→Flash auto-fallback | If all retries fail, page `failed`; re-process action available |
| Extract: JSON schema violation | 2 stricter retries | Then page `failed` with `error_message=invalid_json` |
| Extract: zero items returned | Warning `empty_page` on the page | User can manual override or ignore |
| Normalize: DB error | Job retried; dead-letter after N attempts | Ops inspects dead-letter queue |
| Review: concurrency conflict | 409 from PATCH | UI refreshes row state and prompts user |
| Approve: pending children | 422 with list | User approves children first |
| Dedup-preview: POS unreachable | Sync blocked with actionable error | Operator-side retry or skip-dedup admin flag (audited) |
| Sync: POS row failure | Row `sync_failed` with `error_message` | User retries via sync/retry endpoint |
| Sync: POS mass outage | Batch paused | SRE/ops page; auto-resume on recovery |
| Rollback: POS delete unsupported | Mode C behavior | Manual cleanup list returned + audited |

---

## 13. Phase 0C — Dataset-driven Evaluation Workflow (planning loop, not runtime)

A separate, planning-time loop exists for dataset preparation and extraction evaluation. It is **not** part of the per-restaurant import runtime, but is on the critical path before Build Phase 2. It is documented here for completeness.

```
1. INGEST (Drive → controlled storage)
   service-account read of GOOGLE_DRIVE_DATASET_FOLDER_ID
   → dry-run inventory → owner approval → full ingest
   → per-file SHA-256 + classification + manifest write
   (Spec: GOOGLE_DRIVE_DATASET_INGESTION_SPEC.md)

2. CLASSIFY (rule-based)
   assign dataset categories (SIMPLE_MENU / MEDIUM_MENU / ...)
   propose set memberships (Smoke / Phase 1 Golden / Stress / Learning Memory / Phase 2 Parking)

3. HUMAN REVIEW (golden expected outputs)
   reviewers fill MENU_EXPECTED_OUTPUT_TEMPLATE.json per menu
   two reviewers + third resolver on disagreements

4. FREEZE
   set frozen_at on expected outputs + manifest rows
   (Spec: MENU_DATASET_PREPARATION_PLAN.md §17)

5. EVALUATE (loops in Build Phase 2+)
   run extractor against frozen dataset
   compute metrics per MENU_EXTRACTION_EVALUATION_RUBRIC.md
   gate PRs / nightlies / hold-out runs against thresholds

6. CORRECTION-MEMORY VALIDATION
   re-run on Learning Memory Set after seeded corrections
   verify memory reuse + anti-overfitting + global guardrail
```

This loop is referenced by `MENU_IMPORT_MVP_TEST_STRATEGY.md` and is owned by the Menu Dataset Preparation Agent (handoff: `MENU_DATASET_AGENT_HANDOFF.md`).
