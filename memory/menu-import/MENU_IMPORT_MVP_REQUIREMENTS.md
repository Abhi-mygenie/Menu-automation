# MyGenie POS — Production-Grade AI Menu Import System — Requirements

**Document version:** 2.0 (production-grade revision)
**Status:** Draft — pending Approval Gate 1
**Positioning:** **Production-Grade Menu Import System** for MyGenie POS, delivered as a **staged release train** — Phase 1 is the first **production release** (not a prototype or demo).
**Owner:** Architecture / Product
**Module:** `menu-import`
**Plug-in target:** MyGenie POS (Node.js + PostgreSQL backend, exposes Menu Master REST API)

---

## 1. Purpose

Allow restaurant operators to onboard or update their menu by uploading a **menu image / PDF** instead of typing every item by hand.

The system must **extract structured menu data using AI**, present it in a **review-first editable UI**, **learn from corrections**, and only sync **approved data** to the live POS Menu Master via the exposed Menu API.

This module is **not** an "AI auto-creates your menu" tool. It is a **production-grade, human-reviewed AI extraction system** with mandatory human review, auditable correction learning, draft-safe persistence, idempotent sync, rollback reference, and progressive restaurant-first learning.

### 1.1 Release Train (product-visible phases)

- **Phase 1 — Production Release (live-safe).** Upload → extract → review → correct → draft save → approve → sync to POS Menu Master. Restaurant-scope correction learning. Audit + rollback. Pilot rollout to real restaurants.
- **Phase 2 — Capability Expansion.** Variants, add-ons, duplicate-item matching against live POS menu, cuisine-scope learning promotion, export/import of rules, admin approval queue for global promotion.
- **Phase 3 — Menu Intelligence.** Inventory/recipe mapping, combo decomposition, tax automation, multi-language extraction hardening, auto-sync (opt-in, per restaurant).

Each release is **live in production**. No phase is a sandbox.

---

## 2. In Scope

### 2.1 Phase 1 Production Release (P0 — live with pilot restaurants)
- Upload a single menu file (image / PDF / multi-page PDF).
- Persist original file + metadata + content hash for dedup.
- Preprocessing: PDF → page images, rotation/deskew, contrast, OCR-readiness.
- AI extraction (Gemini 3 Pro primary, Gemini 3 Flash fast lane / fallback) returning structured JSON that is **schema-validated and bounded to items visible in the source file** (hallucination-control contract — see FR-3, FR-13).
- Normalization: trim whitespace, currency stripping (`₹`, `Rs`, `INR`, `/-`), unit detection (`/kg`, `/pc`, `/plate`).
- Confidence scoring per field + overall + warnings.
- Editable review table with row-level + batch actions.
- **Row provenance**: every extracted row links to its source page + bounding box so the user can verify it against the original file.
- **Draft save** (implicit on every edit + explicit snapshot) — user can close the tab and return without losing progress.
- Menu-level notes detection (GST extra, Jain available, parcel charges) shown in a separate panel.
- Save user corrections to `menu_import_corrections`.
- **Restaurant-scope** learning memory applied on subsequent uploads.
- **Duplicate-prevention preview** against the live POS menu at sync time.
- Manual approval per row (or batch) gate before any sync.
- Validation layer before pushing to Menu Master.
- Sync via existing POS Menu Master REST API (idempotent).
- Audit log of every sync + rollback reference.
- Prompt / model / preprocessing / normalizer version tracking on every import.
- Auth: existing POS JWT + `restaurant_id` scoping (multi-tenant isolation).
- **Cost caps**: per-restaurant monthly cap, per-file token cap, per-restaurant hourly upload rate limit.

### 2.2 Phase 2 — Capability Expansion
- Variants extraction + editing (Small/Medium/Large, Half/Full, etc.) as child rows.
- Add-ons extraction + editing (Extra cheese, Extra patty, etc.).
- Subcategory detection.
- Food type detection: `veg` / `non_veg` / `egg` / `unknown` surfaced in UI.
- GST / tax / packaging / parcel note detection (NOT auto-applied).
- Weight / unit-based pricing detection (`/kg`, `/pc`, `/plate`).
- Combo detection (flagged, stored as single item with description, NOT auto-decomposed).
- **Cuisine-scope** learning memory promotion + admin approval queue.
- **Global-scope** learning memory with admin approval (DB-enforced).
- Export review CSV.
- Failed-page surfacing to user with re-processing / manual override.
- Rollback API (if POS supports delete).

### 2.3 Phase 3 — Menu Intelligence (post-pilot, later production release)
- Auto-creation of modifier groups with user mapping.
- Recipe / inventory / BOM mapping.
- Auto-decomposition of combos into component SKUs.
- Auto-application of tax rules (opt-in).
- Opt-in unattended sync for mature restaurants.
- Handwritten menu extraction (regional scripts).
- Full-language translation surface.
- Offline-capable mobile review.

---

## 3. Personas

### 3.1 Restaurant Owner / Manager (primary user)
- Non-technical, time-constrained.
- Uploads menu PDF/photo from phone or laptop.
- Reviews extracted rows, fixes obvious errors, approves and syncs.
- Expects the system to be faster than manual entry.

### 3.2 Restaurant Operations Staff (secondary)
- Updates menu seasonally.
- Re-uploads menu when prices change.
- Cares that learned corrections persist (does not want to re-correct same spelling every time).

### 3.3 MyGenie Internal Ops / Onboarding Agent
- Helps restaurants onboard.
- Needs failed-page visibility, audit trail, and can override low-confidence rows.

### 3.4 MyGenie Platform Admin (tertiary)
- Reviews global learning memory candidates.
- Approves promotion of cuisine-level patterns to global.
- Monitors accuracy regression dashboards.

---

## 4. Functional Requirements

### FR-1 Upload
- FR-1.1 User can upload a file of type: `pdf`, `jpg`, `jpeg`, `png`, `webp`, `heic`.
- FR-1.2 Maximum file size: 25 MB (configurable).
- FR-1.3 Maximum pages: 30 pages per import (configurable).
- FR-1.4 System computes `sha256` of file. If a previous import for same `(restaurant_id, sha256)` exists in `synced_to_menu` state, prompt user with "duplicate menu" warning but still allow re-run.
- FR-1.5 System creates a `menu_imports` record with status `uploaded`.

### FR-2 Preprocessing
- FR-2.1 PDF → image pages (one image per page, configurable DPI 200–300).
- FR-2.2 Auto-rotate and deskew each page.
- FR-2.3 Contrast normalization.
- FR-2.4 Each page persisted with its own row in `menu_import_pages`.
- FR-2.5 Failed pages do not abort the import; they are flagged with `processing_status = failed` and `error_message`.
- FR-2.6 Preprocessing version is stored on the import record.

### FR-3 AI Extraction
- FR-3.1 Each page (or batch of pages) sent to Gemini 3 with a versioned prompt.
- FR-3.2 Output strictly conforms to the Extraction JSON Contract (see API doc §7).
- FR-3.3 Each item carries field-level + overall confidence scores.
- FR-3.4 Each item carries a `warnings[]` array.
- FR-3.5 Variants are emitted as `variants[]` children of an item, never as standalone items.
- FR-3.6 Add-ons are emitted as `addons[]` children of an item.
- FR-3.7 Menu-level notes are emitted at page level under `menu_notes[]`.
- FR-3.8 If the model returns malformed JSON, system retries with stricter "JSON-only" prompt up to 2 times before marking the page as `failed`.

### FR-4 Normalization
- FR-4.1 Strip currency symbols (`₹`, `Rs`, `Rs.`, `INR`, `/-`) from price fields.
- FR-4.2 Detect unit suffixes (`/kg`, `/pc`, `/plate`, `/half`, `/full`).
- FR-4.3 Parse numeric prices to decimal(10,2).
- FR-4.4 Map food-type variants: `V`, `Veg`, `Vegetarian` → `veg`; `NV`, `N.Veg`, `Non Veg`, `Non-Veg` → `non_veg`; `E`, `Egg` → `egg`.
- FR-4.5 Title-case item names (configurable, restaurant-overridable).
- FR-4.6 Apply restaurant-scope learning memory before final write to staging.
- FR-4.7 Normalizer version is stored on the import record.

### FR-5 Confidence + Warnings
- FR-5.1 Every row has a numeric `confidence_score` ∈ [0, 1].
- FR-5.2 Warnings include (but not limited to):
  `price_uncertain`, `category_inferred`, `variant_detected`, `possible_addon_detected`, `addon_without_parent_item`, `multi_column_confusion`, `duplicate_possible`, `same_name_different_price`, `same_price_different_variant`, `missing_price`, `possible_spelling_issue`, `tax_note_detected`, `combo_detected`, `unit_price_detected`.
- FR-5.3 UI thresholds: `>= 0.85` green, `0.60–0.84` yellow, `< 0.60` red.

### FR-6 Editable Review UI
- FR-6.1 Tabular view with all fields editable inline.
- FR-6.2 Variant + add-on side panels per row.
- FR-6.3 Menu Notes panel.
- FR-6.4 Row actions: edit / delete / split variant / convert-to-variant / convert-to-addon / mark-as-combo / mark-as-menu-note / approve / reject.
- FR-6.5 Batch actions: approve all clean rows, approve selected, reject selected, sync approved, export CSV.
- FR-6.6 Filters by status / confidence / warning / category.
- FR-6.7 Search by item name.
- FR-6.8 Undo last edit (session-scoped).

### FR-7 Corrections + Learning
- FR-7.1 Every user-driven change is logged to `menu_import_corrections` with old + new value.
- FR-7.2 Restaurant-scope learning memory updated immediately on save.
- FR-7.3 Cuisine-scope learning memory updated only after `>= 3` distinct restaurants of same cuisine confirm same pattern.
- FR-7.4 Global-scope learning memory updated only after `>= 10` distinct restaurants confirm same pattern AND admin approval.
- FR-7.5 Learning is applied **before** writing to staging on next import (not retroactively to past imports).

### FR-8 Approval Gate
- FR-8.1 No row can be synced unless `status = approved`.
- FR-8.2 "Approve all clean rows" only auto-approves rows where `confidence_score >= 0.85` AND no blocking warnings (`price_uncertain`, `missing_price`, `addon_without_parent_item`, `multi_column_confusion`).
- FR-8.3 Approving a row with variants/add-ons requires those children to be in `approved` or `ignored` state.

### FR-9 Validation
- FR-9.1 Required fields enforced: `item_name`, `category`, and a price (either base `rate` or at least one variant price).
- FR-9.2 Price must be `> 0` and `<= 1,000,000` (configurable).
- FR-9.3 Item name uniqueness within `(restaurant_id, category)` — duplicates trigger a merge-or-rename prompt.
- FR-9.4 Food type must be one of `veg | non_veg | egg | unknown`.
- FR-9.5 Pricing type must be one of `fixed | variant_based | addon_based | weight_based | quantity_based | open_price`.

### FR-10 Sync to Menu Master
- FR-10.1 Sync calls existing POS Menu Master REST API with idempotency key = `(menu_import_id, row_id, attempt_no)`.
- FR-10.2 Categories that don't exist in Menu Master are created via the POS API.
- FR-10.3 On partial failure, successful rows remain synced; failed rows go to `sync_failed` with `error_message` and are retryable.
- FR-10.4 Audit log entry per sync attempt (request, response, status, timestamp, user).
- FR-10.5 Rollback reference stored: list of created/updated entity IDs returned by Menu Master API per row, enabling future "undo this import".

### FR-11 Versioning + Traceability
- FR-11.1 Every import row stores: `model_used`, `model_version`, `prompt_version`, `normalizer_version`, `preprocessing_version`.
- FR-11.2 Changing any version produces a new version string; old imports stay reproducible.

### FR-12 Multi-tenant Isolation
- FR-12.1 All queries scoped by `restaurant_id` extracted from JWT.
- FR-12.2 No cross-restaurant data leakage in learning memory at restaurant scope.
- FR-12.3 Cuisine + global memory are read-only to the restaurant; only the system writes to them.

### FR-13 Hallucination Control (production-grade)
- FR-13.1 Prompt explicitly instructs: "Extract only items visible in the provided image. Do not invent items, categories, prices, variants, or add-ons."
- FR-13.2 JSON schema enforces `additionalProperties: false`; non-conforming responses are retried or the page is marked `failed`.
- FR-13.3 Every extracted row persists `raw_text` (the OCR/vision-grounded source text) and `source_bbox` (bounding box on the page image) for provenance.
- FR-13.4 Review UI exposes a **"View source"** pane showing the original page crop for any row; this is the primary mitigation against hallucinated items.
- FR-13.5 Any row whose `raw_text` is empty or cannot be linked to a page region is flagged with warning `no_source_grounding` and cannot be auto-approved.
- FR-13.6 Confidence scores are a model output, not a truth signal — they are used as a heuristic, not as the sole gate for sync.

### FR-14 Duplicate Prevention (against live POS menu)
- FR-14.1 Before sync, system calls POS Menu API to list existing items in the target categories.
- FR-14.2 For each approved row, compute a **dedup signature**: `(normalized_item_name, category_id, price_triplet)`; fuzzy-match (Levenshtein ratio ≥ 0.92) within category.
- FR-14.3 Candidate duplicates surfaced in a **Duplicate Preview** UI modal before sync. User resolves each with one of: `create_new | update_existing | skip`.
- FR-14.4 The resolution is stored per row (`dedup_resolution`) and honored by the sync worker.
- FR-14.5 Default resolution for high-confidence matches (ratio ≥ 0.98 and same price) is `skip` unless user overrides.
- FR-14.6 The dedup check is **advisory, not destructive** — live POS items are never modified without explicit `update_existing` resolution per row.

### FR-15 Cost Controls
- FR-15.1 Per-restaurant monthly Gemini-cost cap (configurable; default USD-denominated). When reached, new uploads are rejected with `COST_CAP_EXCEEDED` until next billing period or admin override.
- FR-15.2 Per-file token cap (configurable). Files projected to exceed are rejected at upload with actionable error; retry with `force_flash=true` routes to Flash.
- FR-15.3 Per-restaurant hourly upload rate limit (default 10/hour).
- FR-15.4 Auto-fallback policy: Gemini Pro 429/quota → Flash (configurable per restaurant).
- FR-15.5 Cost is recorded per import (`menu_imports.cost_usd`) and surfaced in UI for transparency.

### FR-16 Draft Save
- FR-16.1 Every PATCH is a durable save (server-side); closing the tab does not lose work.
- FR-16.2 Explicit `POST /{id}/save-draft` creates an optional named snapshot in `menu_import_draft_snapshots` (JSONB) for milestone checkpoints (e.g., end-of-day).
- FR-16.3 Draft state is never confused with "approved for sync" — sync only considers `approved` rows regardless of draft state.

### FR-17 Manual Override
- FR-17.1 If a page fails extraction, user can add rows manually via "Add row" action.
- FR-17.2 Manually added rows are marked `source=manual` in `menu_import_corrections` and do not contribute to learning memory.
- FR-17.3 A failed page remains visible in the UI with re-process / ignore / mark-handled-manually actions.

---

## 5. Non-functional Requirements

### NFR-1 Performance
- Upload accepted in `< 2s` (excluding actual upload time).
- Preprocessing of a 5-page PDF: `< 30s`.
- AI extraction of a 5-page menu: `< 60s` end-to-end (Gemini 3 Pro), `< 25s` on Flash fast lane.
- Review UI initial render: `< 1.5s` for 200 rows.
- Sync of 100 approved rows: `< 30s`.

### NFR-2 Reliability
- Idempotent endpoints for upload, process, approve, sync.
- All long-running stages (preprocessing, extraction, sync) are background-jobbed and resumable.
- A failed page never blocks other pages from extraction.
- Sync retries with exponential backoff (3 attempts) before marking row as `sync_failed`.

### NFR-3 Security
- File upload virus-scan hook (ClamAV/lambda) — pluggable.
- Only signed, time-limited URLs for retrieving stored files.
- All API calls require valid POS JWT.
- PII is not extracted or stored (menus are public-facing data, but file metadata is restaurant-scoped).
- AI calls do not leak `restaurant_id` to the model in the prompt body unless required for learning memory; if leaked, must be in pseudonymized form.

### NFR-4 Observability
- Structured logs (JSON) with `menu_import_id` correlation.
- Metrics: upload count, preprocessing latency, extraction latency p50/p95/p99, model token usage, model cost per import, manual_correction_rate, rows_auto_approved_percentage, sync success rate.
- Trace ID propagated end-to-end.
- Per-import detail page for ops to inspect raw model response, prompt, and corrections.

### NFR-5 Cost
- Track Gemini 3 token usage per import; store cost on `menu_imports`.
- Default to Gemini 3 Flash for restaurants with > 5 successful imports of consistent quality (configurable).

### NFR-6 Compliance / Auditability
- 13-month minimum retention of audit log + corrections.
- Right-to-delete: deleting a restaurant cascades to all `menu_imports` rows but **does not** purge global / cuisine learning memory unless explicitly requested (and only after pseudonymization check).

### NFR-7 Accessibility (Review UI)
- WCAG 2.1 AA target: keyboard navigation, focus rings, sufficient contrast (no dark-on-dark).
- Color is never the only indicator of confidence — also use icons + text label.

### NFR-8 Internationalization
- UI strings i18n-ready (English MVP).
- Extracted text supports UTF-8 (Devanagari, Tamil, etc. parsed as opaque text).

---

## 6. Success Metrics (Phase 1 Production Release)

| Metric | Target | Measured On |
|---|---|---|
| Item name accuracy | ≥ 85% | Hold-out 10 menus |
| Price accuracy | ≥ 90% | Hold-out 10 menus |
| Category accuracy | ≥ 75% | Hold-out 10 menus |
| Food type accuracy | ≥ 90% | Hold-out 10 menus |
| Variant detection recall | ≥ 70% | Test set 20 menus (Phase 2 target) |
| Add-on detection recall | ≥ 60% | Test set 20 menus (Phase 2 target) |
| Manual correction rate | ≤ 25% of rows | Pilot restaurants |
| Rows auto-approved | ≥ 40% | Pilot restaurants |
| Time-to-approve a 50-item menu | ≤ 8 minutes | Pilot restaurants |
| Sync success rate (approved → live) | ≥ 99% | Production |
| Duplicate false-sync rate (dup created in POS) | = 0 | Production |
| P95 extraction latency (Gemini Pro) | ≤ 90s | Production |
| Tenant isolation breach count | = 0 | Every release |

---

## 7. Constraints + Assumptions

### Constraints
- **Stack**: Node.js (NestJS or Express + TypeScript recommended) + PostgreSQL 14+.
- **AI**: Gemini 3 Pro (primary) and Gemini 3 Flash (fast lane / fallback) only. No fine-tuning in MVP.
- **Storage**: Local disk in pre-prod, S3 in prod, accessed via a single `StorageAdapter` interface.
- **Auth**: POS JWT (HS256/RS256 per existing POS) — `restaurant_id` and `user_id` claims required.
- **Sync**: Menu Master is **only** mutated via the existing POS Menu API. No direct DB writes into POS menu tables from this module.

### Assumptions
- POS already exposes (or will expose) the following Menu API endpoints: `POST /menu/categories`, `POST /menu/items`, `POST /menu/items/{id}/variants`, `POST /menu/items/{id}/addons`, `GET /menu/categories`, idempotency-key supported. Gaps will be documented in `MENU_IMPORT_MVP_OPEN_QUESTIONS.md`.
- A restaurant's `cuisine_type` is already known on the POS (used for cuisine-scope learning).
- A background job runner is available (BullMQ + Redis recommended; documented in architecture).
- Internal ops staff have admin role for promoting global learning patterns.

---

## 8. Out of Band — Non-Goals (Explicit)

- This module **will not** auto-publish menus.
- This module **will not** modify orders, KOTs, taxes, or pricing engines.
- This module **will not** generate menu items it didn't see in the file (no hallucinated SKUs).
- This module **will not** retrain or fine-tune the underlying LLM in MVP.
- This module **will not** handle live menu price changes (use existing POS UI for that).

---

## 9. Acceptance Criteria (Phase 1 Production Release — go-live)

A. End-to-end happy path verified on **10 hold-out menus** across format/cuisine/complexity buckets:
   - Upload → preprocess → extract → review → correct → approve → sync → audit logged → visible in POS Menu Master via API.
B. All Phase 1 Production Release features implemented and tested.
C. Hold-out accuracy targets met (see §6).
D. Pilot restaurant onboards a 50-item menu in ≤ 8 minutes with manual_correction_rate ≤ 25%.
E. Duplicate preview correctly flags existing POS items and prevents accidental duplicate creation.
F. Rollback (if supported by POS API) of one synced import works end-to-end; otherwise documented manual cleanup list is produced.
G. Tenant isolation automated test is green (a user in tenant A cannot access tenant B data through any endpoint).
H. File security tests green (magic-byte enforcement, malicious file rejected, zip-bomb PDF rejected).
I. Cost cap enforced: a synthetic over-cap restaurant receives `COST_CAP_EXCEEDED`.
J. Production smoke test suite green post-deploy.
K. All approval gates 1–7 closed with sign-off.

### 9.1 Phase 1 Go-Live Guarantees (live-safety)

Phase 1 ships to production with these guarantees:

1. AI never mutates live POS menu directly.
2. Every synced row is traceable to an approved staging row with user-visible raw_text + source crop.
3. Every sync is logged with idempotency key and rollback reference.
4. Tenant isolation is enforced in JWT + repository layer + PostgreSQL RLS.
5. Cost and rate limits are enforced; no pathological input can cause unbounded AI spend.
6. A restaurant can always fall back to manual entry if AI fails on a file.
7. Correction learning is scoped to the restaurant in Phase 1; cross-tenant (cuisine/global) promotion ships in Phase 2.
