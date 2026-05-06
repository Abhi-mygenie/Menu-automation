# MyGenie POS — Production-Grade AI Menu Import System — Open Questions

**Document version:** 2.0 (production-grade revision)
**Status:** Living document — P0 items must close before Build Phase 1. P1 items must close during their phase. P2 items may defer.

Classification:
- **P0** = Blocks implementation / Phase 0 must close.
- **P1** = In-phase decision; recommend default now, finalize during build.
- **P2** = Future scope; defer safely.

---

## Section A — Confirmed (from kickoff)

| # | Question | Answer | Source |
|---|---|---|---|
| A1 | Stack? | Node.js + PostgreSQL | Kickoff Q&A |
| A2 | AI extraction model? | Gemini 3 Pro (primary), Gemini 3 Flash (fast lane / fallback) | Kickoff Q&A |
| A3 | File storage? | Local disk in pre-prod, S3 in prod (single `StorageAdapter` interface) | Kickoff Q&A |
| A4 | POS integration mode? | POS will expose Menu API; staging module uses it for sync | Kickoff Q&A |
| A5 | Auth? | Existing POS JWT + `restaurant_id` scoping | Kickoff Q&A |

---

## P0 — Blocks Implementation (close in Phase 0)

### P0-1 — POS Menu API exact contract
**Status:** **STILL BLOCKED** (Phase 0 discovery 2026-01).
**Why it blocks:** Sync engine, dedup-preview, audit payloads, rollback all depend on it.
**Owner:** POS team.
**Discovery outcome:** Static inspection of `/app/` found **no POS Menu API present in this repository** — the codebase is a fresh FastAPI + React + MongoDB scaffold. See `POS_MENU_API_CONTRACT_DISCOVERY_REPORT.md` for evidence trail. A **proposed canonical contract** has been drafted at `POS_MENU_API_OPENAPI_DRAFT.yaml` (every field marked TODO awaiting POS team confirmation).
**Action:** Engage POS engineering team with the proposed OpenAPI draft as the strawman; obtain confirmation or revisions.
**Recommended default until closed:** Implement Sync Service against the draft; run contract tests against a contract-faithful mock; switch to real POS endpoints after team confirmation.

### P0-2 — POS Menu API delete/archive support (rollback mode)
**Status:** **STILL BLOCKED** (Phase 0 discovery 2026-01).
**Why it blocks:** Determines rollback Mode A vs B vs C selection at deployment.
**Owner:** POS team.
**Discovery outcome:** No item / category mutation surface exists in `/app/`; capability unknown.
**Action:** Confirm with POS team whether `DELETE /menu/items/{id}` and/or `PATCH /menu/items/{id}` with archive semantics are supported.
**Recommended default until closed:** **Mode C (manual cleanup list)**. Rollback Service is built to support all three modes with `ROLLBACK_MODE=A|B|C` config; switching is a deployment toggle, not a code change. See `POS_MENU_IMPORT_SYNC_STRATEGY.md §2`.

### P0-3 — POS Menu API bulk endpoints
**Status:** **STILL BLOCKED** (Phase 0 discovery 2026-01).
**Why it blocks:** Sync throughput optimization on 50–200-item menus.
**Owner:** POS team.
**Discovery outcome:** Bulk endpoint capability unknown; no POS API in `/app/`.
**Action:** Confirm with POS team.
**Recommended default until closed:** **Sequential per-item POSTs with `Idempotency-Key`**. Throughput on a 50-item menu remains ≈ 20s — within the 30s P95 target. Hybrid mode is config-switchable to bulk if/when POS confirms support. See `POS_MENU_IMPORT_SYNC_STRATEGY.md §1`.

### P0-4 — Source of `cuisine_type` per restaurant
**Status:** **STILL BLOCKED** (Phase 0 discovery 2026-01).
**Why it blocks:** Cuisine-scope learning (Phase 2) requires it.
**Owner:** POS team + Product.
**Discovery outcome:** No restaurant / profile model present in `/app/`.
**Action:** Confirm with POS team whether `cuisine_type` exists on the restaurant profile (proposed endpoint `GET /restaurants/me`).
**Recommended default until closed:** If POS lacks the field, capture `cuisine_type` via a one-time onboarding question on first menu upload and persist either on the POS restaurant profile (preferred) or on a local `restaurant_overrides` table in `menu_import.*`. Phase 1 is unaffected (it uses only restaurant-scope learning).

### P0-5 — Gemini 3 SDK / JSON mode pin
**Status:** ✅ **CLOSED** (Phase 0B, 2026-01).
**Why it blocks:** Extract service cannot be implemented without verified SDK details.
**Owner:** `integration_playbook_expert_v2` (invoked in Phase 0B).
**Outcome:**
- **Primary model:** `gemini-3.1-pro-preview`.
- **Fast / fallback model:** `gemini-3-flash-preview`.
- **Backup alternative (if preview unstable):** `gemini-2.5-pro` + `gemini-2.5-flash`.
- **SDK Path A (recommended default):** Python `emergentintegrations` + Emergent Universal Key `EMERGENT_LLM_KEY`.
- **SDK Path B (alternative):** Node.js `@google/genai` + owner's `GEMINI_API_KEY`. (Surfaced as new decision **D-7** below.)
- **Structured JSON:** strict schema at `GEMINI_MENU_EXTRACTION_JSON_SCHEMA.json`; prompt + post-call `jsonschema`/`ajv` validation; native `responseSchema` mode used where SDK exposes it.
**Deliverables:** `GEMINI_MENU_EXTRACTION_PLAYBOOK.md`, `GEMINI_MENU_EXTRACTION_JSON_SCHEMA.json`, `GEMINI_MENU_EXTRACTION_PROMPT_TEMPLATE.md`, `GEMINI_COST_CONTROL_AND_VERSIONING_SPEC.md`, `PHASE_0B_AI_READINESS_SUMMARY.md`.

### P0-6 — Data residency / S3 region
**Why it blocks:** Bucket creation + KMS + prod deployment.
**Owner:** Sec + Product.
**Recommended default:** India region (`ap-south-1`) for pilot if no specific constraint; revisit if customers span EU/US.

### P0-7 — Rollback mode decision (A/B/C)
**Status:** **STILL BLOCKED** (Phase 0 discovery 2026-01) — tied to P0-2.
**Why it blocks:** Wiring of Rollback Service; UI copy.
**Owner:** Eng + POS.
**Discovery outcome:** Mode determined by POS capability per P0-2; capability unknown.
**Recommended default until closed:** **Mode C** (manual cleanup list). Rollback Service supports all three modes via `ROLLBACK_MODE` env. See `POS_MENU_IMPORT_SYNC_STRATEGY.md §2`.

### P0-8 — Gemini cost budget (monthly cap default)
**Status:** ✅ **CLOSED** (2026-01) — owner: "free, it's our own POS product".
**Interpretation:** No per-restaurant cost cap surfaced to restaurants. Defensive guardrails retained at the platform level (per-file token cap 500k, per-page 60k, hourly upload rate limit 10/hr, auto-fallback Pro→Flash, alarms on aggregate spend). See `PHASE_0_DECISION_LOG.md §3` for the safety-ceiling matrix.
**Effective config:**
- `MENU_EXTRACT_PER_RESTAURANT_MONTHLY_CAP_USD` set to a very high ceiling (e.g., `100000`) — effectively disabled, prevents accidental zero-cap blocking.
- Other cost knobs unchanged from `GEMINI_COST_CONTROL_AND_VERSIONING_SPEC.md`.

### P0-10 — AI Extraction Service stack path (D-7, NEW)
**Status:** ✅ **CLOSED** (2026-01) — owner approved **Path A**.
**Decision:** Python microservice using `emergentintegrations` + Emergent Universal Key (`EMERGENT_LLM_KEY`). Aligns with current `/app/backend/` FastAPI scaffold.
**Implementation impact:** Build Phase 2 produces a Python `AIExtractionService` (FastAPI + worker). Other services per architecture doc remain as planned (Review UI in React; storage adapter abstracted; etc.).

### P0-9 — Additional POS sync contract issues (B-7)
**Status:** **PARTIALLY CLOSED** (Phase 0 discovery 2026-01).
**Origin:** Issues surfaced during static review of `/app/` that the POS team must clarify alongside P0-1.
**Items requiring POS team confirmation (none directly answered by `/app/`):**
1. POS JWT issuer + signing algorithm + JWKS endpoint + required claims (`restaurant_id` vs `vendor_id` vs `outlet_id` vs `merchant_id`) + scopes (e.g., `menu:write`).
2. Whether `Idempotency-Key` header is honored server-side, or whether the local `menu_import_idempotency_keys` table is the only safety net.
3. POS error code catalog (codes for `CATEGORY_NOT_FOUND`, `ITEM_DUPLICATE`, etc.).
4. POS rate limits on Menu API and the response shape on `429`.
5. Whether variants / add-ons are first-class entities or nested in the item payload.
6. Whether `external_ref` / `import_source` fields are accepted on item create (so POS can mark items created via this module).
7. Image upload flow (URL accepted vs upload-then-attach) — Phase 3+.
8. Whether POS supports nested categories.
**Owner:** POS team.
**Discovery outcome:** Documented as TODOs throughout `POS_MENU_API_OPENAPI_DRAFT.yaml` and `POS_MENU_API_CONTRACT_DISCOVERY_REPORT.md §14`. Defensive defaults are in `POS_MENU_IMPORT_SYNC_STRATEGY.md`.
**Action:** Confirm or revise alongside P0-1 in the POS contract workshop.

---

## P1 — In-phase Decisions (recommend defaults, finalize during build)

### P1-1 — Framework final: NestJS vs Express + tsoa
**Default:** NestJS. Modularity + DI + queue integration.
**Closure:** End of Phase 1 foundation.

### P1-2 — ORM final: Prisma vs Knex + Objection
**Default:** Prisma. Migration ergonomics + type-safety.
**Closure:** End of Phase 1 foundation.

### P1-3 — Worker process model
**Default:** Single worker subscribing to all queues; split per-queue only if signals demand it.
**Closure:** Phase 7 (hardening).

### P1-4 — RLS in pre-prod
**Default:** Enabled in both pre-prod and prod.
**Closure:** Phase 1 foundation.

### P1-5 — Local-disk persistence in pre-prod
**Default:** PersistentVolumeClaim mounted at `/app/storage/menu-imports/`.
**Closure:** Phase 1 deployment.

### P1-6 — BIGSERIAL vs UUID PKs
**Default:** Match POS convention; if mixed, default BIGSERIAL internally with string external refs.
**Closure:** Phase 1 foundation.

### P1-7 — "Approve all clean" default
**Default:** Enabled. Threshold 0.85 + blocking-warning exclusion. Tunable per restaurant.
**Closure:** Phase 3 UI.

### P1-8 — Auto-create categories on sync
**Default:** Yes, with "will be created" badge in sync preview.
**Closure:** Phase 6 sync.

### P1-9 — Show source crop pane by default
**Default:** Yes. Primary safety control.
**Closure:** Phase 3 UI.

### P1-10 — Auto-fallback Pro → Flash
**Default:** Enabled, configurable per restaurant.
**Closure:** Phase 2 extraction.

### P1-11 — Signed URL TTL
**Default:** 5 minutes.
**Closure:** Phase 1 storage.

### P1-12 — Per-restaurant upload rate limit
**Default:** 10/hour.
**Closure:** Phase 1 upload.

### P1-13 — Per-file token cap
**Default:** 500k tokens per file; `force_flash=true` allowed to bypass by routing to Flash only.
**Closure:** Phase 2 extraction.

### P1-14 — Idempotency key TTL
**Default:** 7 days.
**Closure:** Phase 1.

### P1-15 — Admin role mapping
**Default:** `ops_admin` = MyGenie internal; `platform_admin` = MyGenie engineering admin; `restaurant_owner` / `restaurant_manager` / `restaurant_staff` per POS roles.
**Closure:** Phase 1 auth.

### P1-16 — Bulk select persistence across pagination
**Default:** Yes (sticky).
**Closure:** Phase 3 UI.

### P1-17 — Feature flag mechanism
**Default:** Simple DB-backed feature flag `menu_import.enabled` per restaurant; read at request time.
**Closure:** Phase 7.

---

## P0 — Phase 0C Dataset Decisions (must close before Build Phase 2)

### P0-D1 — Google Drive source folder ID (B-D1)
**Status:** 🟢 **DEFERRED for Phase 0C** (2026-01) — owner pivoted to zip upload (one-time job; see P0-D7 below). Re-open if Phase 2+ requires recurring/large-scale Drive ingestion.
**Owner:** Product / Owner.
**Recommended default (kept for future):** Owner provides **one** Drive folder via env var `GOOGLE_DRIVE_DATASET_FOLDER_ID`; folder shared **read-only** with the dataset service account; **never** committed.

### P0-D2 — Service account credential handling (B-D2)
**Status:** 🟢 **DEFERRED for Phase 0C** (Drive route deferred). 🔴 **Leaked-key revocation still required as security hygiene.**
**Incident:** Owner pasted full SA JSON in chat (recorded in `PHASE_0_DECISION_LOG.md §2`). Even though Drive is no longer needed for Phase 0C, the leaked credential must still be revoked.
**Required actions (owner):** revoke key id `ad8c4a3857158b4aa34be710f862ea4f221a42b1`; audit recent activity. Creating a new dedicated SA is no longer necessary unless Drive is later re-introduced.
**Recommended default (kept for future):** Mounted secret file path only. Never committed. `.gitignore` includes `*-sa.json`. Rotate annually or per Sec policy.

### P0-D3 — Initial dataset size (B-D3)
**Status:** ✅ **CLOSED** (2026-01).
**Decision:** **30 menus**. Owner does not pre-select; agent picks any 30 from the uploaded zip honoring stratification (10 simple / 10 medium / 5 complex / 5 variant-or-addon-heavy) per `MENU_DATASET_PREPARATION_PLAN.md §10`.

### P0-D4 — Golden dataset human-review owner (B-D4)
**Status:** ✅ **CLOSED** (2026-01).
**Decision:** Primary reviewer = **Sunil**. Recommendation: nominate a second internal reviewer for Phase 1 Golden + Stress menus; third resolver on disagreements.

### P0-D5 — Dataset storage target (B-D5)
**Status:** ✅ **CLOSED** for Phase 1 (2026-01).
**Decision:** **Local controlled storage (PVC) only in Phase 1.** S3 path parked per G-4 ("park Amazon — local in Phase 1"). S3 region selection (Mumbai `ap-south-1` recommended) deferred to a later phase before prod cutover.

### P0-D7 — Dataset upload method for Phase 0C (NEW, H-11)
**Status:** ✅ **CLOSED** (2026-01) — owner: "I will upload 30 menus in a zip file, one-time job."
**Decision:** **Zip-via-chat asset** is the chosen Phase 0C ingestion method. Replaces the Drive route for Phase 0C.
**Spec:** `ZIP_DATASET_INGESTION_OPTION.md`.
**Trigger phrase:** "zip uploaded — proceed with Phase 0C execution".
**Effect on Drive plan:** Drive route remains documented (`GOOGLE_DRIVE_DATASET_INGESTION_SPEC.md`) for future reuse if dataset becomes recurring; not needed for Phase 0C.

### P0-D6 — Dataset access audit retention
**Status:** Recommended default below.
**Why:** Compliance + traceability.
**Recommended default:** 13 months minimum, mirrors `menu_import_audit_log` retention.

---

## P2 — Deferrable (Future Scope)
### P2-1 — External id shape (BIGINT/UUID/string)
Store as JSONB; compatibility without ORM coupling.

### P2-2 — Audit log monthly partitioning from day one
Defer until > 100M rows.

### P2-3 — Per-restaurant retention overrides
Add when enterprise plan lands.

### P2-4 — Share global memory between staging / prod
Keep independent in Phase 1–2.

### P2-5 — Mobile review viability
Defer to Phase 3.

### P2-6 — "Rules I've taught" restaurant-facing UI
Nice-to-have for trust; deliver in Phase 2.

### P2-7 — Per-restaurant opt-out UI for cuisine/global rules
DB flag exists from Phase 1 (defaults to false). UI exposure in Phase 2.

### P2-8 — AI usage disclosure copy placement
Legal/product copy during Phase 2.

### P2-9 — Multi-branch sharing of restaurant-scope rules
Nice future: if restaurant X has multiple branches, should branches share rules? Future.

### P2-10 — "Teach me from scratch" (disable all inherited rules) toggle
Aligns with P2-7.

---

## Closing a Question

1. Update the question's "Recommended default" with the final decision + decided-by.
2. Move it into the "Confirmed" table.
3. Update affected docs.

P0 closures **must** be reflected in `PRODUCTION_GRADE_OWNER_DECISION_SHEET.md` and `PRODUCTION_GRADE_APPROVAL_SUMMARY.md` before build begins.
