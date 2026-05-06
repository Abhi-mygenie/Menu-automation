# MyGenie POS — Production-Grade AI Menu Import System — Architecture

**Document version:** 2.0 (production-grade revision)
**Status:** Draft — pending Approval Gate 2
**Module:** `menu-import`
**Positioning:** Production-grade, plug-in module of MyGenie POS. Phase 1 is live-safe with pilot restaurants, not a sandbox.

---

## 1. Goals of this Architecture

- **Review-first, never auto-write.** AI output goes to **staging** tables. Live POS menu is mutated only after explicit approval and only via the POS Menu API.
- **Plug-in-ready.** This module is a self-contained service ("`menu-import-service`") that can be deployed alongside the existing MyGenie POS or absorbed as a sub-module.
- **Versioned + reproducible.** Every artifact (preprocessing, prompt, normalizer, model) is versioned.
- **Resumable.** Upload → preprocess → extract → review → sync are independently restartable.
- **Auditable + rollback-able.** Sync produces audit + rollback references.
- **Learnable.** Corrections feed a 3-tier learning memory used on subsequent imports.

---

## 2. High-level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Restaurant Operator (Browser)                       │
│  Uploads file • Reviews extracted rows • Edits • Approves • Syncs            │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │  HTTPS (POS JWT)
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  POS Frontend (existing) — Menu Import UI                    │
│  React/Next routes:  /menu-import  /menu-import/{id}/review                  │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │  REST /api/menu-imports/*
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       menu-import-service  (Node.js)                         │
│                                                                              │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌─────────────┐  │
│   │  HTTP API    │   │  Auth Guard  │   │  Job Producer│   │  Sync Engine │  │
│   │  (Nest/Exp)  │──▶│  (POS JWT)   │──▶│  (BullMQ)    │──▶│  (Idempotent)│  │
│   └──────────────┘   └──────────────┘   └──────┬───────┘   └──────┬──────┘  │
│                                                 │                  │         │
│   ┌─────────────────────────────────────────────▼──────────────────▼──────┐ │
│   │                    Background Workers (BullMQ)                        │ │
│   │   preprocess-worker • extract-worker • normalize-worker • sync-worker │ │
│   └────────────┬─────────────────────┬────────────────────┬───────────────┘ │
│                │                     │                    │                 │
│                ▼                     ▼                    ▼                 │
│        ┌─────────────┐       ┌─────────────┐      ┌─────────────────┐       │
│        │  Storage    │       │  Gemini 3   │      │   POS Menu API  │       │
│        │  Adapter    │       │  (Pro/Flash)│      │  (existing)     │       │
│        │  local | s3 │       │  Vision +   │      │  /menu/items …  │       │
│        └─────────────┘       │  JSON mode  │      └─────────────────┘       │
│                              └─────────────┘                                │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                       PostgreSQL 14+                                 │  │
│   │   schema: menu_import.*                                              │  │
│   │   tables: menu_imports, menu_import_pages, menu_import_rows,         │  │
│   │           menu_import_row_variants, menu_import_row_addons,          │  │
│   │           menu_import_modifier_groups, menu_import_modifier_options, │  │
│   │           menu_import_menu_notes, menu_import_corrections,           │  │
│   │           menu_learning_memory, menu_import_audit_log                │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│   ┌─────────────┐   ┌──────────────────────┐   ┌─────────────────────────┐  │
│   │  Redis      │   │  Object Storage      │   │  Observability          │  │
│   │  (BullMQ)   │   │  Local FS / S3       │   │  (Logs, Metrics, Trace) │  │
│   └─────────────┘   └──────────────────────┘   └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Responsibilities

### 3.0 Service Boundaries (Production-Grade Modules)

The system is built as one Node.js service (`menu-import-service`) composed of these **logical services / modules**, each with a clear responsibility and an independent scaling / ownership boundary:

| Logical Service | Responsibility |
|---|---|
| **Upload Service** | File intake, magic-byte validation, virus-scan hook, hash computation, storage write, import record creation, rate-limit + cost-cap enforcement. |
| **Preprocessing Service** | PDF → images, rotation/deskew/contrast, OCR-readiness, per-page persistence, failure surfacing. |
| **AI Extraction Service** | Gemini 3 Pro/Flash client, versioned prompts, JSON-schema validation, hallucination-control contract, token/cost accounting. |
| **Parser / Normalizer Service** | Currency/unit/food-type normalization, title-casing, restaurant-scope learning rule application, confidence + warning re-computation. |
| **Review / Draft Service** | Serves review data, persists corrections, manages draft snapshots, enforces optimistic concurrency. |
| **Learning Memory Service** | Upserts restaurant rules on each correction, runs promotion job for cuisine/global, honors admin approval queue, enforces reversal-budget deactivation, per-restaurant opt-out. |
| **Duplicate Prevention Service** | At sync time, queries live POS for existing items in target categories, computes dedup signatures, returns per-row resolution candidates. |
| **Sync Service** | Idempotent calls to POS Menu API, per-row error handling, external-ref capture, retry and partial-sync semantics. |
| **Audit Service** | Append-only writes to `menu_import_audit_log`, exposes read APIs for the audit UI and ops dashboards. |
| **Admin Approval Service** | Exposes the global/cuisine promotion queue, admin actions (approve, suppress, deactivate), writes to `menu_import_admin_actions`. |
| **Storage Service** | `StorageAdapter` interface — local (pre-prod) and S3 (prod); signed URLs; lifecycle (IA after 30d, expire after 365d). |
| **Monitoring / Logging Service** | pino structured logs, prom-client metrics, OpenTelemetry traces, cost dashboards. |
| **Rollback Service** | Walks `rollback_ref`, calls POS delete when supported; produces manual cleanup list otherwise. |

These are modules within one Node.js service in Phase 1. In Phase 2 or 3 any of them can be split into separate deployables without schema rework (e.g., Admin Approval becomes its own service behind the admin console).

### 3.1 HTTP API (Nest/Express + TypeScript)
- Exposes `/api/menu-imports/*` (see API contract doc).
- Validates JWT, extracts `restaurant_id`, `user_id`, `roles`.
- Persists upload metadata, enqueues background jobs.
- Returns staging data to UI.
- **Stateless** — horizontally scalable.

### 3.2 Auth Guard
- Verifies POS JWT signature + expiry.
- Loads tenant context (`restaurant_id`, `cuisine_type`).
- Enforces RBAC roles: `restaurant_owner`, `restaurant_manager`, `ops_admin`, `platform_admin`.
- All DB queries enforce `WHERE restaurant_id = :ctx.restaurant_id` at the repository layer.

### 3.3 Job Producer (BullMQ)
- Queues:
  - `menu-import.preprocess` — split PDF, optimize images.
  - `menu-import.extract` — call Gemini per page (or batch).
  - `menu-import.normalize` — apply normalizer + restaurant learning memory.
  - `menu-import.sync` — push approved rows to POS Menu API.
- Each job carries `menu_import_id`, `attempt_no`, `correlation_id`.
- Retries with exponential backoff. Dead-letter after 5 attempts.

### 3.4 Background Workers
- **preprocess-worker**
  - PDF → 1 image per page (`pdf-poppler` / `pdf-image` / `mupdf`).
  - Auto-rotate + deskew + contrast (sharp / opencv).
  - Persist each page image via Storage Adapter.
  - Insert `menu_import_pages` rows.
  - On per-page failure: mark page failed, continue others.
- **extract-worker**
  - Reads page image from Storage Adapter.
  - Calls Gemini 3 (vision + structured JSON) with the versioned prompt.
  - Validates response against JSON Schema (Ajv).
  - On schema fail: 2 retries with stricter "JSON only" prompt; then mark page `failed`.
  - Inserts `menu_import_rows`, `menu_import_row_variants`, `menu_import_row_addons`, `menu_import_menu_notes`.
- **normalize-worker**
  - Currency stripping, unit detection, food-type mapping, title-casing.
  - Applies restaurant-scope learning memory rules.
  - Recomputes `confidence_score` after applying learning rules.
  - Sets `menu_imports.status = review_required` once all pages either succeed or fail.
- **sync-worker**
  - Validates approved rows.
  - Resolves/creates categories via POS Menu API.
  - Creates items, variants, add-ons via POS Menu API.
  - Idempotency key: `menu-import:{import_id}:row:{row_id}:attempt:{n}`.
  - On success: stores returned IDs in `menu_import_rows.synced_external_ref`.
  - On failure: row goes `sync_failed` with `error_message`.
  - Writes `menu_import_audit_log` per attempt.

### 3.5 Sync Engine
- Wraps POS Menu API client.
- Adds idempotency, retries, structured error mapping.
- Provides `dryRun` for the review UI's "preview sync" feature.

### 3.6 Storage Adapter
- Interface:
  - `put(key, stream, mime) → url`
  - `get(key) → stream`
  - `signedUrl(key, ttl) → url`
  - `delete(key)`
- Implementations:
  - `LocalDiskStorage` (pre-prod): files at `/app/storage/menu-imports/<restaurant_id>/<import_id>/...`
  - `S3Storage` (prod): bucket `mygenie-menu-imports-{env}`, KMS-encrypted at rest.
- Selection: `STORAGE_DRIVER=local|s3` env var.

### 3.7 Gemini 3 Client
- Wrapper around Google Gen AI SDK (Node).
- Two configured profiles:
  - `gemini-3-pro` for primary extraction (higher accuracy).
  - `gemini-3-flash` for fast lane (small menus, retries, low-cost re-runs).
- Structured-output mode (JSON Schema enforced).
- Safety settings tuned for "menu" category (food / minimal harm).
- Prompts loaded from versioned files: `prompts/extract.v1.txt`, `extract.v2.txt`, ...
- Token + cost accounting per call recorded on `menu_imports`.

> **Note on integration**: Before any code is written, `integration_playbook_expert_v2` MUST be invoked with `INTEGRATION: Gemini 3 Pro + Gemini 3 Flash (Node.js, vision, structured JSON output)` to obtain the verified playbook (SDK, env keys, model strings, JSON-schema mode, safety config). This planning doc fixes the **architecture role** of the client, not the SDK details.

### 3.8 PostgreSQL
- Schema namespace: `menu_import.*` (see DB schema doc).
- Heavy use of `JSONB` for `warnings`, `confidence`, `raw_extraction_payload`.
- Indexes on `(restaurant_id, status)`, `(menu_import_id)`, `(file_hash)`, plus GIN on JSONB fields used for search.
- All timestamps `TIMESTAMPTZ` with `now()` defaults.
- Soft-delete (`deleted_at`) on long-lived tables (`menu_learning_memory`, `menu_import_corrections`).

### 3.9 Redis
- Backing for BullMQ queues, rate limiting, and short-lived dedup locks (`SETNX file_hash`).

### 3.10 Observability
- **Logs**: pino → stdout → log shipper. Required fields: `ts, level, restaurant_id, menu_import_id, page_id, row_id, correlation_id`.
- **Metrics**: prom-client; export `/metrics`. Suggested:
  - `menu_import_uploads_total`
  - `menu_import_preprocess_seconds` (histogram)
  - `menu_import_extract_seconds` (histogram)
  - `menu_import_extract_tokens_total` (counter, by `model`)
  - `menu_import_extract_cost_usd_total` (counter, by `model`)
  - `menu_import_rows_total{status}` (gauge / counter)
  - `menu_import_sync_failures_total`
  - `menu_import_manual_correction_rate` (gauge per restaurant)
- **Tracing**: OpenTelemetry. Spans: `upload`, `preprocess.page`, `extract.page`, `normalize`, `review.query`, `sync.row`.
- **Per-import inspector** (admin UI, post-MVP): raw prompt + raw model response + diffs.

---

## 4. Data Flow (canonical)

```
1. UPLOAD
   client → POST /upload → Storage Adapter (put original)
                         → INSERT menu_imports (status=uploaded, file_hash)
                         → ENQUEUE preprocess

2. PREPROCESS (worker)
   read original → split pages → optimize → put each page → INSERT menu_import_pages
   on done → ENQUEUE extract per page (or batched)
   set menu_imports.status = extracting

3. EXTRACT (worker)
   for each page → call Gemini 3 with vision + JSON schema
                → validate output → INSERT rows / variants / addons / notes (status=raw)
   on all pages done → ENQUEUE normalize

4. NORMALIZE (worker)
   apply normalizer + restaurant learning memory
   recompute confidence + warnings
   set status=review_required

5. REVIEW (user)
   GET /rows → user edits/corrects → PATCH writes to staging + INSERT corrections
   user approves → row.status=approved (children must also be approved or ignored)

6. SYNC (worker triggered by user)
   validate → call POS Menu API per row → store external refs
   write menu_import_audit_log
   on success → menu_imports.status=synced_to_menu
   on partial failure → some rows synced, others sync_failed; user can retry
```

---

## 5. State Machine — `menu_imports.status`

```
   uploaded
       │
       ▼
   preprocessing ──► failed
       │
       ▼
   extracting ──► failed
       │
       ▼
   review_required ◄────┐
       │                 │
       ▼                 │ (user edits / re-process)
   approved* (computed)  │
       │                 │
       ▼                 │
   syncing               │
       │                 │
       ├──► synced_to_menu
       └──► sync_partial ──► (retry) ──► synced_to_menu
                          └──► failed
```

`approved*` is not a stored status on `menu_imports` — it's a computed property: "all rows approved or rejected and at least one approved exists." The user transitions from `review_required` directly to `syncing` via the sync API.

---

## 6. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Backend runtime | **Node.js 20 LTS, TypeScript** | Aligns with existing POS stack |
| Framework | **NestJS** (preferred) or Express + tsoa | Nest gives DI, guards, modules; better for plug-in module |
| ORM | **Prisma** (preferred) or Knex + Objection | Migrations, type-safe, familiar to Node teams |
| DB | **PostgreSQL 14+** | Aligns with POS; supports `JSONB`, `GIN`, partial indexes |
| Queue | **BullMQ + Redis 7** | Reliable, retries, dead-letter, visible UI (Bull Board) |
| Validation | **Zod** + Ajv | Zod for HTTP DTOs, Ajv for Gemini JSON schema |
| AI | **Gemini 3 Pro / Flash** via `@google/genai` (or current Google GenAI Node SDK) | User's choice; vision + structured JSON |
| Storage | **Local FS (preprod) / S3 (prod)** | Single `StorageAdapter` interface |
| Frontend | **React/Next** (existing POS) + TanStack Table + Zustand/Redux + shadcn/ui | Matches POS conventions |
| Auth | **Existing POS JWT** | No re-implementation |
| Logs | **pino** | High-perf JSON logs |
| Metrics | **prom-client** | Prometheus standard |
| Tracing | **OpenTelemetry** | Vendor-neutral |
| Tests | **Vitest** + Supertest + Playwright | Fast unit + e2e |

---

## 7. Deployment Topology

### 7.1 Pre-prod (single node, simplified)
- One container: `menu-import-service` (HTTP + workers in same process, low concurrency).
- Local PostgreSQL.
- Local Redis.
- Local disk storage at `/app/storage/menu-imports/`.
- `.env` carries `GEMINI_API_KEY`, `STORAGE_DRIVER=local`, `POS_API_BASE_URL`, `POS_JWT_PUBLIC_KEY`.

### 7.2 Production
- **HTTP API**: stateless, ≥ 2 replicas, autoscale on CPU + queue depth.
- **Workers**: separate deployment, scaled by queue depth (`preprocess`, `extract`, `normalize`, `sync` either as separate worker types or a single worker subscribing to all).
- **PostgreSQL**: managed (RDS/CloudSQL), daily snapshots, PITR.
- **Redis**: managed (ElastiCache/Memorystore), persistence enabled.
- **S3**: KMS-encrypted bucket `mygenie-menu-imports-prod`, lifecycle: originals → IA after 30d, expire after 365d (configurable per restaurant retention policy).
- **Secrets**: AWS Secrets Manager / GCP Secret Manager. No secrets in env files in prod.
- **Network**: private subnets; egress only to Gemini API + POS internal.
- **Image scanning**: ClamAV sidecar or AWS GuardDuty/S3 malware protection.

### 7.3 Plug-in mode (alternative)
If the team prefers a single deployable, the entire `menu-import-service` can be mounted as a NestJS sub-module within the existing POS backend. The DB schema (`menu_import.*`) stays isolated. Workers can run in the same process behind a feature flag.

---

## 8. Security

- POS JWT validated using PEM/JWKS; `restaurant_id` claim is mandatory.
- All repositories enforce tenant scoping via a `TenantContext` injected per-request and propagated to workers via the job payload.
- Uploaded files quarantined until virus scan passes (pluggable adapter; no-op in pre-prod).
- Signed URLs (5–15 min TTL) for any UI-side file fetches.
- Rate limit per user: 10 uploads / hour (configurable) to prevent abuse.
- No raw image/file content is logged.
- Gemini calls do NOT include `restaurant_id` plaintext in the prompt; learning memory is applied **server-side** post-extraction (the prompt itself is restaurant-agnostic).

---

## 9. Failure Modes + Mitigations

| Failure | Detection | Mitigation |
|---|---|---|
| PDF malformed | preprocess-worker exception | Mark import `failed`, surface friendly error: "We couldn't read this PDF — try uploading as images." |
| Single page OCR-illegible | preprocess returns `processing_status=failed` for that page | Other pages continue; user sees the failed page in UI with re-upload option. |
| Gemini 5xx / quota | extract-worker | Exponential backoff; switch to Flash on Pro 429 (configurable); after N failures, mark page failed. |
| Gemini returns invalid JSON | Ajv schema check fails | 2 stricter retries; then mark page failed with `error_message=invalid_json`. |
| Sync to POS Menu API fails for some rows | sync-worker | Per-row error; failed rows stay `sync_failed`; user can retry; partial success is accepted. |
| Duplicate file uploaded | `file_hash` matches existing `synced_to_menu` import | Warn user, allow proceed (returns existing import_id by default, "force re-run" to create new). |
| Concurrent edits in review UI | optimistic locking via `updated_at` | `PATCH` requires `If-Match: <updated_at>`; return 409 on mismatch. |
| Approval race (two users approve same row) | DB unique index `(row_id, status=approved)` partial | First write wins; second returns 409 with current state. |

---

## 10. Versioning Strategy

Each import row stores 5 versions:

- `preprocessing_version` (e.g., `pp-1.2.0`) — defined in code constant.
- `prompt_version` (e.g., `extract-v3`) — string id of the prompt file used.
- `model_used` + `model_version` (e.g., `gemini-3-pro` + `2026-01-15`) — from API metadata.
- `normalizer_version` (e.g., `norm-1.4.0`) — defined in code constant.

Bumping any version is a code change + migration tag. Old imports remain reproducible because their version stamps point to immutable prompt/code references.

---

## 11. Plug-in Contract with Existing POS

This module depends on the POS exposing the following Menu Master REST API surface (canonical names; actual paths to be confirmed with POS team — see Open Questions):

- `GET  /pos/menu/categories?restaurant_id=…` → returns existing categories (id, name).
- `POST /pos/menu/categories` → create category. Idempotent on `(restaurant_id, name)`.
- `GET  /pos/menu/items?restaurant_id=…&category_id=…` → returns existing items (id, name, price, variants, addons). **Required for Duplicate Prevention Service.**
- `POST /pos/menu/items` → create item. Idempotent on `(restaurant_id, category_id, name)`.
- `PATCH /pos/menu/items/{id}` → update existing item (used only when user resolves a duplicate as `update_existing`).
- `POST /pos/menu/items/{id}/variants` → bulk add variants.
- `POST /pos/menu/items/{id}/addons` → bulk add add-ons.
- `DELETE /pos/menu/items/{id}` → optional, used for rollback (see §12 Rollback Strategy).

All requests carry POS JWT and an `Idempotency-Key` header. The Menu API contract is the **only** integration boundary with POS data. Confirmation of this contract is **Phase 0** work (see Implementation Phases).

---

## 12. Rollback Strategy (Production-Grade, 3 Modes)

Because POS Menu API capabilities affect rollback, we support three deterministic modes:

| Mode | POS Capability | Rollback Behavior |
|---|---|---|
| **Mode A — Full Undo** | `DELETE /pos/menu/items/{id}` supported | Walk `rollback_ref`; delete each created item/variant/addon; mark import `rolled_back`; audit each delete. |
| **Mode B — Soft Undo** | POS supports `PATCH /pos/menu/items/{id}` with `archived=true` | Walk `rollback_ref`; soft-archive each created entity; audit each archive; surface a note that entities can be manually un-archived. |
| **Mode C — Manual Cleanup** | No delete or archive | Rollback endpoint returns 501 with a **manual cleanup list** (entity IDs + names + created_at). Admin / restaurant staff cleans up via POS UI. Audit records the list. |

The mode selected at deployment time is recorded in config (`ROLLBACK_MODE`). Phase 0 confirms the POS capability and fixes the mode.

---

## 13. Future Live-Import Path (beyond Phase 1)

Phase 1 syncs staged data on explicit user approval. Future phases introduce:

- **Phase 2** — Duplicate-prevention at sync time (in-scope for Phase 2 release per scope doc) + cuisine/global learning.
- **Phase 3** — Opt-in **unattended sync** for mature restaurants after N successful supervised imports with high auto-approve rate. Unattended sync still runs through the same Sync Service with the same audit + rollback semantics; only the "human gate" is automated. DB schema does not change.
- **Phase 3+** — Real-time menu intelligence: inventory mapping, combo decomposition, tax rule suggestions. All new logic plugs into existing staging tables with additive columns; no destructive migrations planned.

The architecture allows these evolutions without rework because:
1. Staging, review, and sync are decoupled modules.
2. Learning memory is scope-extensible (restaurant → cuisine → global → [future: franchise, region]).
3. The POS Menu API boundary is the single integration surface.

---

## 14. Monitoring + Logging (Production-Grade detail)

- **Logs** (pino): every worker and handler emits structured JSON to stdout. Required correlation fields: `ts, level, restaurant_id, menu_import_id, page_id, row_id, correlation_id, model_used, prompt_version`.
- **Metrics** (prom-client):
  - Throughput: `menu_import_uploads_total`, `menu_import_sync_rows_total{status}`.
  - Latency: `menu_import_preprocess_seconds`, `menu_import_extract_seconds`, `menu_import_sync_row_seconds` (histograms).
  - Cost: `menu_import_extract_tokens_total{model}`, `menu_import_extract_cost_usd_total{model}`, `menu_import_cost_cap_hits_total`.
  - Quality: `menu_import_manual_correction_rate` (per restaurant, gauge), `menu_import_rows_auto_approved_ratio`, `menu_import_hallucination_warnings_total`.
  - Safety: `menu_import_tenant_guard_violations_total` (should always be 0; alarm-critical), `menu_import_duplicate_prevented_total`.
- **Traces** (OpenTelemetry): spans for `upload`, `preprocess.page`, `extract.page`, `normalize`, `dedup-preview`, `sync.row`, `rollback`.
- **Dashboards**: a dedicated Grafana board for this module — availability, latency, cost, quality, safety panels.
- **Alerts**:
  - `tenant_guard_violations_total > 0` → Sev-1 page.
  - `sync_success_rate_1h < 0.98` → Sev-2 page.
  - `cost_usd_daily_total > budget` → Sev-3 alert.
  - `extract_p95_seconds > 120s` → Sev-3 alert.

---

## 12. Why Staging-First (rationale)

A direct AI-to-live-menu design is rejected because:
1. **Wrong items become orderable** — financial + reputational risk for the restaurant.
2. **Bad categories pollute** the POS menu master and reports/analytics.
3. **No accountability** — sync-time audit trail is impossible.
4. **No learning loop** — without staged corrections there is nothing to learn from.
5. **No rollback** — direct writes mean restoring requires DB intervention.

The staging-first design with explicit approval gates ensures the AI is an **assistant**, not an authority.

---

## 13. Open Architecture Decisions

Tracked in `MENU_IMPORT_MVP_OPEN_QUESTIONS.md`. Highlights:
- Nest vs Express finalization.
- Prisma vs Knex.
- Worker process model (single vs per-queue).
- Whether POS Menu API supports bulk endpoints (affects sync throughput).
- Rollback semantics on POS side.
- Whether file storage in pre-prod uses pod ephemeral disk or PVC.
