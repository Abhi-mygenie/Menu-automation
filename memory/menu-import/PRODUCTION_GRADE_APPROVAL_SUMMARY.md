# MyGenie POS — Menu Import — Production-Grade Approval Summary

**Document version:** 1.0
**Status:** Final (planning pass 2). **Implementation NOT started.**
**Module:** `menu-import`
**Plug-in target:** MyGenie POS (Node.js + PostgreSQL)

---

## 1. What was revised

Two planning passes have been performed on this module, plus a Phase 0A discovery and a Phase 0C dataset-prep planning pass:

- **Pass 1 (production-grade revision)**: The original 12-document MVP planning pack was reviewed and upgraded to a **production-grade staged release plan**.
- **Pass 2 (Phase 0A POS API Discovery)**: An evidence-based discovery against `/app/` confirmed no POS Menu API exists in this repo; a proposed canonical OpenAPI was drafted; defensive sync strategy authored.
- **Pass 3 (Phase 0C Dataset Prep planning)**: New phase inserted for Menu Dataset Preparation + Golden Test Set, sourced from a Google Drive folder shared with a service account; classification taxonomy + initial split + expected-output template + evaluation rubric + agent handoff documented.

No code has been written across any pass. All artifacts are in `/app/memory/menu-import/`.

Three new top-level documents were added in pass 1:

- `PRODUCTION_GRADE_PLANNING_REVIEW_REPORT.md` — document-by-document review + gaps + decision-blocker classification + recommendation.
- `PRODUCTION_GRADE_OWNER_DECISION_SHEET.md` — clean owner sign-off sheet across A. Architecture · B. POS API · C. Database · D. AI · E. Learning · F. Review UI · G. Rollout · **H. Dataset (added in pass 3)**.
- `PRODUCTION_GRADE_APPROVAL_SUMMARY.md` — this file.

Pass 2 (Phase 0A) added:

- `POS_MENU_API_CONTRACT_DISCOVERY_REPORT.md`
- `POS_MENU_API_OPENAPI_DRAFT.yaml`
- `POS_MENU_IMPORT_SYNC_STRATEGY.md`

Pass 3 (Phase 0C) added:

- `MENU_DATASET_PREPARATION_PLAN.md`
- `GOOGLE_DRIVE_DATASET_INGESTION_SPEC.md`
- `MENU_EXPECTED_OUTPUT_TEMPLATE.json`
- `MENU_EXTRACTION_EVALUATION_RUBRIC.md`
- `MENU_DATASET_AGENT_HANDOFF.md`

The 12 existing documents were revised in place (filenames preserved for traceability):

| File | Revision class |
|---|---|
| `MENU_IMPORT_MVP_REQUIREMENTS.md` | v2.0 — re-positioned as production-grade Phase 1 release; added FR-13 Hallucination Control, FR-14 Duplicate Prevention, FR-15 Cost Controls, FR-16 Draft Save, FR-17 Manual Override; updated success metrics + acceptance criteria with live-safety guarantees |
| `MENU_IMPORT_MVP_ARCHITECTURE.md` | v2.0 — added §3.0 Logical Service Boundaries (Upload, Preprocessing, AI Extraction, Parser/Normalizer, Review/Draft, Learning Memory, Duplicate Prevention, Sync, Audit, Admin Approval, Storage, Monitoring, Rollback); §12 3-mode rollback; §13 future live-import path; §14 monitoring detail |
| `MENU_IMPORT_MVP_WORKFLOW.md` | v2.0 — added §9 Draft Save first-class step; §10 Correction Memory state machine; §11 Manual Override flow; §12 Failure Recovery Matrix |
| `MENU_IMPORT_MVP_DB_SCHEMA.md` | v2.0 — `menu_import_rows` extended with `source_bbox`, `source`, `dedup_resolution`, `reviewed`, `force_approved`; new tables: 3.12 `menu_import_idempotency_keys`, 3.13 `menu_import_admin_actions`, 3.14 `menu_import_draft_snapshots` |
| `MENU_IMPORT_MVP_API_CONTRACT.md` | v2.0 — added endpoints Z `save-draft`, AA `dedup-preview`, AB `cost`, AC `mark-reviewed`, AD `source-crop`; error catalog adds `COST_CAP_EXCEEDED`, `FILE_MAGIC_MISMATCH`, `NO_SOURCE_GROUNDING`, `DUPLICATE_ON_POS`, `DEDUP_PREVIEW_REQUIRED` |
| `MENU_IMPORT_MVP_REVIEW_UI_SPEC.md` | v2.0 — added §19 Source Provenance Pane; §20 Reviewed flag + filter; §21 Learned vs Suggested visual language; §22 Duplicate Preview Modal; §23 UI safety guardrails |
| `MENU_IMPORT_MVP_LEARNING_MEMORY_SPEC.md` | v2.0 — added Anti-overfitting cap (#11), per-restaurant opt-out (#12), fuzzy-match policy (#13), §9.1 What NOT to Learn (Price Safety), §9.2 Category Correction Safety, §10 Admin Approval Queue mechanics |
| `MENU_IMPORT_MVP_TEST_STRATEGY.md` | v2.0 — added §15 Tenant Isolation Tests (Sev-1), §16 File Security Tests, §17 Rollback Tests, §18 Correction-Memory Reuse Tests, §19 Production Smoke Tests |
| `MENU_IMPORT_MVP_RISK_REGISTER.md` | v2.0 — added R-21 Hallucination, R-22 Rubber-stamp review, R-23 Duplicate POS items, R-24 Cost runaway, R-25 Wrong POS category at sync; updated top-5 watchlist |
| `MENU_IMPORT_MVP_IMPLEMENTATION_PHASES.md` | v2.0 — **structural rewrite**: separated Release Train (Phase 1 / 2 / 3) from Build Phases (0–8); Phase 0 = decisions + POS contract + Gemini playbook; Phase 1–8 are production build phases ending in pilot rollout |
| `MENU_IMPORT_MVP_OPEN_QUESTIONS.md` | v2.0 — **structural rewrite**: P0 / P1 / P2 classification with explicit blocker labels |
| `MENU_IMPORT_MVP_HANDOFF_INDEX.md` | v2.0 — re-positioned as production-grade entry point with Release Train, what's approved/pending, what NOT to implement, recommended next agent |

---

## 2. What changed from MVP to Production-Grade

### Positioning
- Removed framing as a "throwaway MVP / demo / prototype."
- Established Release Train: **Phase 1 = live production release** (not sandbox), Phase 2 = capability expansion, Phase 3 = menu intelligence.
- Each release ships to real restaurants behind a feature flag.

### Architecture
- Logical services made explicit (Upload, Preprocessing, AI Extraction, Parser/Normalizer, Review/Draft, Learning Memory, Duplicate Prevention, Sync, Audit, Admin Approval, Storage, Monitoring, Rollback).
- 3-mode rollback strategy with deterministic behavior whether or not POS supports delete.
- Future live-import path documented (Phase 3 unattended sync via the same staging tables).
- Monitoring + alerting expanded with named metrics and Sev-1/Sev-2 alarm thresholds.

### Safety hardening
- **Hallucination control** is now a first-class FR with prompt + schema + provenance UI.
- **Source provenance pane** added to UI (page crop per row) — primary human defense against hallucination.
- **Duplicate prevention** via `dedup-preview` API + UI modal (Phase 2+); `sync` blocked until preview run.
- **Cost controls**: per-restaurant monthly cap, per-file token cap, hourly upload rate limit, auto-fallback Pro → Flash.
- **File security**: magic-byte enforcement, virus-scan adapter, zip-bomb guard, signed-URL TTL.
- **Tenant isolation** elevated to a Sev-1 PR-blocker test.

### Database
- New tables for production hygiene: `menu_import_idempotency_keys`, `menu_import_admin_actions`, `menu_import_draft_snapshots`.
- `menu_import_rows` extended with provenance (`source_bbox`, `source`), dedup (`dedup_resolution`, `dedup_target_external_id`), and review tracking (`reviewed`, `force_approved`).

### Learning Memory
- Restaurant-scope live in Phase 1; cuisine + global ship in Phase 2 with admin approval queue + DB-enforced approval requirement.
- **Anti-overfitting cap** (no single restaurant > 40% of cuisine evidence).
- **Per-restaurant opt-out** flag from Phase 1 (UI in Phase 2).
- **Price-learning policy**: only structural patterns (`/-`, `/kg`, etc.), never bare numeric value updates.
- **Fuzzy-match policy** specified per pattern type.

### Review UI
- Source provenance pane (Phase 1).
- Reviewed flag + filter (Phase 1).
- Learned vs Suggested visual language (Phase 1).
- Duplicate Preview modal (Phase 2).
- Bulk-approve > 100 rows confirmation; sync disabled until dedup-preview (Phase 2).

### Test Strategy
- Tenant isolation tests as Sev-1 gate.
- File security tests added.
- Rollback tests added (all 3 modes).
- Correction-memory reuse tests added.
- Production smoke tests pipeline added.

### Risk Register
- Top 5 watchlist updated to put Hallucination at #1.
- Added Rubber-stamp review and Duplicate POS items as named risks.

### Open Questions
- Reclassified into P0 (blocks Phase 0), P1 (in-phase decisions), P2 (deferrable).
- P0 list: B-1 contract, B-2 delete support, B-3 bulk endpoints, B-5 cuisine_type source, D-1 Gemini SDK pin, D-6 cost cap value, G-4 S3 region.

---

## 3. What is still Phase 1 (Production Release)

The Phase 1 ship-to-pilot list:

- Upload (with magic-byte, virus-scan hook, hash, rate limit, cost cap).
- Preprocess (PDF→images, deskew, contrast, per-page failure surfacing).
- Extract (Gemini 3 Pro/Flash with hallucination-control contract, raw_text + source_bbox, JSON schema enforcement).
- Normalize (currency, unit, food_type, title-case) + apply restaurant-scope learning.
- Review UI: editable rows, source provenance pane, reviewed flag, learned/suggested badges, draft save, bulk approve-clean.
- Approval gate (per-row + bulk) with confidence + blocking-warning rules.
- Sync to POS Menu Master via Menu API, idempotent, per-row error handling, audit log.
- Rollback in mode A / B / C as supported by POS.
- Tenant isolation (JWT + RLS), idempotency keys, draft snapshots.
- Cost dashboards, alarms, smoke tests.
- Pilot rollout with feature flag, 5 restaurants.

---

## 4. What remains Future Scope

**Phase 2 Capability Expansion** (next release after pilot exit):
- Variant + add-on extraction & UI editing.
- Duplicate prevention against live POS menu (`dedup-preview` UI modal + sync gating).
- Cuisine-scope learning auto-promotion + global-scope learning with admin approval queue.
- `menu_import_admin_actions` table active.
- Subcategory + tax/packaging note detection.
- Combo flagging (single item + warning), weight/unit pricing detection.
- Export review CSV.
- Failed-page re-process action.
- "Rules I've taught" UI.

**Phase 3 Menu Intelligence**:
- Combo decomposition into component SKUs.
- Inventory / recipe / BOM mapping.
- Tax rule auto-application (opt-in).
- Opt-in unattended sync for mature restaurants.
- Multi-language extraction hardening.
- Handwritten extraction best-effort.
- Mobile review experience.

---

## 5. Open Blockers (P0 — must close before Build Phase 1 and Build Phase 2)

### 5.1 Phase 0A — POS Menu API Discovery
**Status:** ✅ Done. POS Sync is **STILL BLOCKED** pending POS team confirmation of the proposed contract.
**Deliverables:** `POS_MENU_API_CONTRACT_DISCOVERY_REPORT.md`, `POS_MENU_API_OPENAPI_DRAFT.yaml`, `POS_MENU_IMPORT_SYNC_STRATEGY.md`. Open items B-1 / B-2 / B-3 / B-5 / B-7 reflected in `MENU_IMPORT_MVP_OPEN_QUESTIONS.md`.
**Effect:** Build Phase 6 (Sync) **remains parked**. Build Phase 1 (Foundation) is **unblocked**.

### 5.2 Phase 0B — Gemini Integration Playbook
**Status:** ✅ **Substantively closed** (2026-01).
**Deliverables produced:** `GEMINI_MENU_EXTRACTION_PLAYBOOK.md`, `GEMINI_MENU_EXTRACTION_JSON_SCHEMA.json`, `GEMINI_MENU_EXTRACTION_PROMPT_TEMPLATE.md`, `GEMINI_COST_CONTROL_AND_VERSIONING_SPEC.md`, `PHASE_0B_AI_READINESS_SUMMARY.md`.
**Outcome:**
- **D-1:** ✅ CLOSED. Primary `gemini-3.1-pro-preview`; fallback `gemini-3-flash-preview`; backup alternative `gemini-2.5-pro` + `gemini-2.5-flash`. Path A (Python `emergentintegrations` + `EMERGENT_LLM_KEY`) recommended as default; Path B (Node `@google/genai`) documented as alternative.
- **D-6:** 🟡 PARTIALLY CLOSED. Cost-cap mechanism fully specified; proposed pilot default USD 25/restaurant/month; Finance sign-off on exact value pending.
- **D-7 (NEW):** 🟡 OPEN. Stack path Python (Path A, recommended) vs Node (Path B). Owner decision required before Build Phase 2.
- Hallucination control: five-layer defense (prompt + schema + validator + runtime warning + UI source-crop pane).
- Versioning: prompt / schema / preprocessing / normalizer / SDK / model recorded per call in new `menu_import_model_calls` ledger; `menu_import_model_pricing` table seeded at Build Phase 2 kickoff.
- Security: tenant id never in prompt; no fine-tuning; key never committed; safety refusals logged.
**Effect:** Build Phase 2 (Extraction) **AI-side blockers cleared** pending owner closure of D-6 USD value + D-7 stack path. Build Phase 2 also remains gated by Phase 0C dataset.

### 5.3 Phase 0C — Menu Dataset Preparation + Golden Test Set
**Status:** 🟢 Ready for execution (planning complete).
**Source (revised 2026-01):** **Owner-uploaded zip (one-shot)** — see `ZIP_DATASET_INGESTION_OPTION.md`. The original Google Drive service-account route is deferred but documented for future reuse.
**Owner trigger phrase:** "zip uploaded — proceed with Phase 0C execution".
**Deliverables produced (planning):** `MENU_DATASET_PREPARATION_PLAN.md`, `GOOGLE_DRIVE_DATASET_INGESTION_SPEC.md` (deferred path), `ZIP_DATASET_INGESTION_OPTION.md` (active path), `MENU_EXPECTED_OUTPUT_TEMPLATE.json`, `MENU_EXTRACTION_EVALUATION_RUBRIC.md`, `MENU_DATASET_AGENT_HANDOFF.md`.
**Owner decisions:** H-3 (size=30, agent picks any 30), H-4 (Sunil reviewer), H-5 (local Phase 1), H-11 (zip method) all ✅ closed. H-1, H-2 deferred.
**Effect:** Build Phase 2 (Extraction) **blocked** until owner uploads the zip and Sunil completes expected-output review for the golden sets.

### 5.4 Phase 0 owner decisions remaining
| Item | Status |
|---|---|
| B-1 / B-2 / B-3 / B-5 / B-7 (POS) | 🔴 STILL BLOCKED (POS team confirmation needed) |
| **D-1** Gemini SDK pin (Phase 0B) | ✅ CLOSED |
| **D-6** Cost cap | ✅ CLOSED — owner: "free, our own POS product" (defensive ceilings retained, see `PHASE_0_DECISION_LOG.md §3`) |
| **D-7** Stack path (Path A Python) | ✅ CLOSED — Path A approved |
| **G-4** S3 region / data residency | ✅ CLOSED for Phase 1 — local PVC only; S3 parked |
| **H-1** Drive folder ID | 🟢 Deferred — Drive route superseded by zip-via-chat for Phase 0C |
| **H-2** Service account credential | 🟢 Deferred for Phase 0C (Drive deferred); 🔴 leaked-key revocation **still required** as security hygiene |
| **H-3** Dataset size = 30 (any 30, stratified) | ✅ CLOSED |
| **H-4** Reviewer = Sunil (primary) | ✅ CLOSED (second reviewer to be nominated) |
| **H-5** Storage = local Phase 1 / S3 deferred | ✅ CLOSED |
| **H-11 (NEW)** Dataset upload method = zip-via-chat | ✅ CLOSED |

### 5.5 Build phase status snapshot

| Build Phase | Status |
|---|---|
| **Phase 1 — Foundation** | ✅ **CAN START** after owner approval — POS-independent + dataset-independent |
| **Phase 2 — Extraction** | ❌ **BLOCKED** until Phase 0B (Gemini) AND Phase 0C (Dataset) complete |
| **Phase 3 — Review UI** | depends on Phase 2 |
| **Phase 4 — Draft + correction capture** | depends on Phase 3 |
| **Phase 5 — Learning memory apply** | depends on Phase 4 |
| **Phase 6 — POS Menu Sync** | ❌ **PARKED** until Phase 0A POS contract confirmed by POS team |
| **Phase 7 — Production hardening** | partially gated; non-POS items can proceed alongside Phase 6 |
| **Phase 8 — Pilot rollout** | gated on Phase 6 |

---

## 6. Recommended Approval Gates

To start build, the owner must:

| Gate | What is approved | Document |
|---|---|---|
| Gate 1 | Requirements (production-grade) | `MENU_IMPORT_MVP_REQUIREMENTS.md` v2.0 |
| Gate 2 | Architecture + Workflow | `MENU_IMPORT_MVP_ARCHITECTURE.md` + `_WORKFLOW.md` v2.0 |
| Gate 3 | DB schema | `MENU_IMPORT_MVP_DB_SCHEMA.md` v2.0 |
| Gate 4 | API contract | `MENU_IMPORT_MVP_API_CONTRACT.md` v2.0 |
| Gate 5 | Review UI | `MENU_IMPORT_MVP_REVIEW_UI_SPEC.md` v2.0 |
| Gate 6 | Learning memory | `MENU_IMPORT_MVP_LEARNING_MEMORY_SPEC.md` v2.0 |
| Gate 7 | Implementation plan (Release Train + Build Phases) | `MENU_IMPORT_MVP_IMPLEMENTATION_PHASES.md` v2.0 |
| Phase 0 | All P0 owner decisions closed (`PRODUCTION_GRADE_OWNER_DECISION_SHEET.md`) | this sheet |

Build Phase 1 starts only when **all Gates 1–7 close AND Phase 0 is complete**.

---

## 7. Recommended Next Agent

Based on what is missing to start Phase 1 + Phase 2:

**Step A — Phase 0 closures (in parallel where possible):**
1. **POS Menu API Contract Discovery Agent** (Phase 0A) — ✅ done; **still requires POS engineering team confirmation** of the proposed OpenAPI draft. Until they confirm, Build Phase 6 stays parked.
2. **`integration_playbook_expert_v2`** (Phase 0B) with:
   ```
   INTEGRATION: Gemini 3 Pro + Gemini 3 Flash (Node.js, vision, structured JSON output)
   CONSTRAINTS: Used for menu image OCR + structured JSON extraction with strict schema; restaurant-scoped multi-tenant context; cost-budget tracked per call.
   ```
   Deliverable: `/docs/integrations/gemini3.md` with pinned SDK, env keys, JSON-mode params, safety config.
3. **Menu Dataset Preparation Agent** (Phase 0C) — handoff: `MENU_DATASET_AGENT_HANDOFF.md`. Requires owner decisions H-1 through H-5 closed.

**Step B — Owner closes** `PRODUCTION_GRADE_OWNER_DECISION_SHEET.md` (P0 rows + H-1..H-5).

**Step C — Reviewers approve** Gates 1–7.

**Step D — Then** invoke:
- **Backend Foundation Implementation Agent** to drive Build Phase 1 (foundation: schema + storage + auth + upload). This agent **can start once Step C completes**; it does not need Phase 0B or 0C.
- **Frontend Review UI Implementation Agent** in parallel after Build Phase 2 unblocks `/rows`.

**Step E — Build Phase 2** starts only after **both** Phase 0B and Phase 0C are complete.

**Step F — Build Phase 6** unblocks only after the POS engineering team confirms the contract from Phase 0A.

Until Steps A–C complete, **do not begin code**. Until 0B + 0C complete, **do not begin extraction work**. Until POS team confirms contract, **do not begin sync work**.

---

## 8. Final Note

The pack now reflects production-grade thinking in both content and positioning. Phase 1 is a real release, not a prototype. The safety invariants are explicit and testable. The next correct action is **Phase 0 (decisions + discoveries) and Gate approvals**, not implementation.
