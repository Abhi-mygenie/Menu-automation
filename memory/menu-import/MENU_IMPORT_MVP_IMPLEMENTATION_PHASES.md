# MyGenie POS — Production-Grade AI Menu Import System — Implementation Phases

**Document version:** 2.0 (production-grade revision)
**Status:** Draft — pending Approval Gate 7
**Positioning:** Two views are provided — a **Release Train** (product-visible releases that ship to production) and **Build Phases** (engineering sequence to deliver each release). Phase 1 of the Release Train is a **live production release** to pilot restaurants, not a prototype.

---

## 1. Release Train (product-visible)

| Release | Theme | What ships live | Gate to next |
|---|---|---|---|
| **Phase 1 Production Release** | Basic extraction + human review + restaurant learning + draft save + staged sync + rollback (if POS supports) | Upload, preprocess, extract, normalize, review, correct, restaurant-scope learning, draft save, approval, idempotent sync to POS, audit + rollback reference, cost caps, tenant isolation, production smoke tests. | Pilot accuracy + safety metrics met. |
| **Phase 2 Capability Expansion** | Variants / add-ons / duplicates / cuisine learning | Variant + add-on extraction & UI, dedup-preview + resolution, cuisine-scope learning auto-promotion, global-scope learning with admin approval queue, admin actions table, export review CSV, failed-page re-process, rollback Mode A/B as supported. | Restaurant retention + NPS thresholds met. |
| **Phase 3 Menu Intelligence** | Inventory / recipe / tax / unattended sync | Combo decomposition, inventory / BOM mapping, tax auto-suggestion (opt-in), opt-in unattended sync for mature restaurants, multi-language extraction hardening, handwritten-menu best-effort, mobile review. | — |

Each release is **live** on pilot or full production; none is a sandbox. All releases reuse the same core schema with additive changes — no destructive migrations planned between phases.

---

## 2. Build Phases (engineering sequence)

Each build phase maps to part of the Release Train. Dependencies + deliverables + Definition-of-Done + gates are stated.

### Phase 0 — Decisions, POS API Contract, Gemini Playbook, Dataset Preparation

**Goal:** Close all P0 decision blockers and prepare three independent Phase-0 streams that gate Build Phase 2. Phase 0 is broken into three sub-phases that run in parallel.

#### Phase 0A — POS Menu API Discovery
**Status:** ✅ **DONE** (Phase 0A discovery executed; POS Sync remains blocked).
**Deliverables produced:**
- `POS_MENU_API_CONTRACT_DISCOVERY_REPORT.md` — evidence-based finding that no POS API exists in `/app/`.
- `POS_MENU_API_OPENAPI_DRAFT.yaml` — proposed canonical contract awaiting POS team validation.
- `POS_MENU_IMPORT_SYNC_STRATEGY.md` — defensive sync / rollback / dedup / idempotency strategy.
- Updates to `MENU_IMPORT_MVP_OPEN_QUESTIONS.md` (P0-1, P0-2, P0-3, P0-4/B-5, P0-7, P0-9/B-7).
**Net result:** POS contract still requires POS-engineering-team confirmation. Build Phase 6 (Sync) **remains blocked** pending POS contract sign-off. Build Phase 1 is unblocked because foundation work is POS-independent.

#### Phase 0B — Gemini Integration Playbook
**Status:** ⏳ **PENDING**.
**Deliverable:** `/docs/integrations/gemini3.md` (or equivalent under `/app/memory/menu-import/`) with verified SDK, env keys, JSON-mode params, safety config, and example schemas.
**Driver:** `integration_playbook_expert_v2` invoked with:
> `INTEGRATION: Gemini 3 Pro + Gemini 3 Flash (Node.js, vision, structured JSON output)`
**Net result:** Until 0B closes, Build Phase 2 (Extraction) cannot start.

#### Phase 0C — Menu Dataset Preparation + Golden Test Set
**Status:** ⏳ **PENDING — REQUIRED BEFORE BUILD PHASE 2**.
**Deliverables produced (planning):**
- `MENU_DATASET_PREPARATION_PLAN.md`
- `GOOGLE_DRIVE_DATASET_INGESTION_SPEC.md`
- `MENU_EXPECTED_OUTPUT_TEMPLATE.json`
- `MENU_EXTRACTION_EVALUATION_RUBRIC.md`
- `MENU_DATASET_AGENT_HANDOFF.md`
**Deliverables to produce (execution):**
- Inventoried + classified dataset of 30 menus (10 simple / 10 medium / 5 complex / 5 variant-or-addon-heavy).
- Frozen expected outputs for Smoke + Phase 1 Golden + Stress + Learning Memory sets.
- `PHASE_0C_COMPLETION_REPORT_{dataset_version}.md`.
**Driver:** Menu Dataset Preparation Agent, per handoff doc.
**Source of menus:** Owner-supplied Google Drive folder, accessed read-only by a service account (`GOOGLE_DRIVE_DATASET_FOLDER_ID` + `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_PATH`).
**Net result:** Until 0C closes, Build Phase 2 (Extraction) cannot run a faithful evaluation.

**Phase 0 exit gate:** all three sub-phases (0A confirmed by POS team, 0B playbook ingested, 0C dataset frozen) **plus** owner sign-off on `PRODUCTION_GRADE_OWNER_DECISION_SHEET.md`.

**Parallelism:** 0B and 0C can run in parallel. 0A's outcome blocks **only Build Phase 6** (Sync), not Phase 1 (Foundation) or Phase 2 (Extraction).

**Complexity:** S–M for each sub-phase; mostly external dependency latency.

### Phase 1 — Foundation
**Goal:** Backend service scaffold, DB schema, storage, auth, upload, import batch.
**Deliverables:**
- `menu-import-service` skeleton (NestJS + TypeScript + Prisma per P1 defaults, confirmable).
- Migrations for all 14 tables in the schema doc applied.
- `StorageAdapter` (local driver) wired.
- Auth Guard (POS JWT, PEM/JWKS) + tenant context propagation to workers.
- Endpoints: `/upload` (A), `/status` (C), `/{id}/file` (Y), `/save-draft` (Z), `/cost` (AB).
- Idempotency keys table live + enforced on `/upload`.
- Rate limit + cost cap enforcement on `/upload`.
- Unit tests + integration smoke: upload + status.
- Tenant isolation test (Sev-1).
**DoD:** can upload a PDF, see record in DB, status visible via API; tenant isolation test green.
**Exit gate:** schema review + security review.
**Dependencies:** Phase 0.
**Complexity:** M.

### Phase 2 — Extraction Prototype with Gemini + Parser
**Goal:** Preprocess + extract + normalize + persist staged rows with provenance.
**Hard prerequisites:** Phase 0B complete (Gemini playbook), Phase 0C complete (frozen dataset + golden expected outputs).
**Deliverables:**
- BullMQ workers: preprocess, extract, normalize.
- Gemini 3 client (per playbook), versioned prompt, Ajv schema.
- Hallucination-control contract wired: `raw_text` + `source_bbox` captured, `no_source_grounding` warning.
- Normalizer (currency, unit, food_type, title-case).
- Restaurant-scope learning: write path on every PATCH (apply path starts in Phase 5; Phase 2 just captures events).
- Endpoints: `/{id}/process` (B), `/{id}/rows` (D), `/{id}/notes` (E), `/rows/{id}/source-crop` (AD).
- Accuracy regression on 20 test menus reaches Phase 1 targets at intermediate bar.
**DoD:** end-to-end upload → extract → normalize → API returns rows w/ provenance.
**Exit gate:** internal review with first 3 calibration menus.
**Dependencies:** Phase 1.
**Complexity:** L.
**Drivers:** Backend engineer + Gemini playbook.

### Phase 3 — Review UI + Editable Rows
**Goal:** Review-first UI operational with source provenance pane.
**Deliverables:**
- Routes: `/menu-import`, `/menu-import/upload`, `/menu-import/{id}`, `/menu-import/{id}/review`.
- Main table w/ columns, filters, search, virtualization.
- Inline edit + optimistic concurrency.
- **Source provenance pane** (primary safety UI).
- Reviewed flag + filter.
- Row actions: approve, reject, delete, add, edit.
- Bulk actions (approve-all-clean, approve-selected, reject-selected).
- Status polling + terminal states rendered.
- `data-testid` on every interactive element.
- WCAG 2.1 AA verified.
**DoD:** Playwright e2e: upload → review → correct → approve all clean → all green.
**Exit gate:** UX walkthrough.
**Dependencies:** Phase 2.
**Complexity:** L.

### Phase 4 — Draft Save + Correction Memory Capture
**Goal:** Correction events captured + named draft snapshots.
**Deliverables:**
- `menu_import_corrections` append on every PATCH (all field types).
- `menu_import_draft_snapshots` write path.
- Endpoint `/save-draft` (Z) fully functional.
- Restaurant-scope rule upsert on every correction (write only; apply still inert).
- Undo-last-edit (session-scoped) in UI.
**DoD:** corrections flow end-to-end; draft snapshots restorable via support endpoint.
**Dependencies:** Phase 3.
**Complexity:** M.

### Phase 5 — Learning Memory Application
**Goal:** Apply restaurant-scope rules on new imports (live).
**Deliverables:**
- Normalize-worker applies restaurant rules before review.
- UI badges: `Learned` vs `Suggested` distinction.
- Undo-learned-rule action in UI (deactivates rule).
- Reversal-budget auto-deactivation.
- Opt-out flag at restaurant level (honored even though cuisine/global aren't active yet).
- Metrics: applied_rules_count, manual_correction_rate.
**DoD:** integration test — upload menu, correct, re-upload similar menu, rule applied.
**Dependencies:** Phase 4.
**Complexity:** M.

### Phase 6 — POS Menu API Staging Sync
**Goal:** Approved rows sync to live POS Menu Master.
**Deliverables:**
- POS Menu API client (per Phase 0 contract) with idempotency + retries + structured errors.
- Sync-worker; `/sync` (R), `/sync/retry` (S), `/audit-log` (V).
- External refs persisted; `rollback_ref` accumulated.
- Storage Adapter S3 driver enabled for prod.
- Contract tests against POS Menu API mock (in CI).
- Staging end-to-end: real (or staging) POS receives items.
**DoD:** 50-row import syncs to POS staging with zero duplicates, full audit log.
**Dependencies:** Phases 3–5; POS Menu API contract.
**Complexity:** L.

### Phase 7 — Production Hardening
**Goal:** Audit, monitoring, rollback, runbooks — production-ready before pilot.
**Deliverables:**
- Rollback endpoint `/rollback` (T) implementing selected mode (A/B/C) per Phase 0 decision.
- Grafana dashboards for availability / latency / cost / quality / safety.
- Alarm routes wired to PagerDuty (or equivalent).
- Secrets management (Secrets Manager) in prod.
- RLS enabled in prod DB.
- Virus-scan adapter wired (even if no-op in pre-prod).
- Cost-dashboard live; auto-fallback Pro→Flash tested.
- Operations runbooks committed: "sync stuck", "tenant guard alarm", "rollback", "cost cap hit", "Gemini outage".
- Tenant isolation + file security + rollback + correction-reuse test suites green (pre-requisite for production).
- Production smoke tests pipeline added.
**DoD:** pre-prod deployment + synthetic chaos drill (simulated Gemini 429, simulated POS outage) → system behaves per runbooks.
**Dependencies:** Phase 6.
**Complexity:** M.

### Phase 8 — Pilot Rollout
**Goal:** Onboard 5 pilot restaurants on production behind feature flag.
**Deliverables:**
- Feature flag gate (`menu_import.enabled` per restaurant).
- White-glove onboarding runbook.
- Daily metrics review with pilot owners.
- Incident drill documented + run.
- Gather field feedback → feed Phase 2 release planning.
**DoD:** pilot exit criteria met:
- Hold-out accuracy ≥ targets.
- Manual correction rate ≤ 25% across pilots.
- Sync success rate ≥ 99%.
- No Sev-1 incidents.
- No tenant isolation breaches.
- Time-to-approve 50-item menu ≤ 8 minutes.
**Exit gate:** GA approval for Phase 1 Production Release.
**Dependencies:** Phase 7.
**Complexity:** M.

---

## 3. Release Train × Build Phases Matrix

```
Release → Phase 1 Production Release ────────────────────► Phase 2 Expansion ───────► Phase 3 Intelligence
Build   →  0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 (pilot)  →  9 (variants+addons)     →  12 (combo decomp)
                                                         10 (dedup preview UI)        13 (inventory)
                                                         11 (cuisine+global + admin)  14 (unattended sync)
```

Build phases 9+ are planned after Phase 8 pilot exit, informed by real data. Current doc set covers 0–8 in depth.

---

## 4. Cross-cutting Streams (run continuously from Phase 1+)

### Observability
- Structured logging (pino).
- Prometheus metrics + Grafana dashboards.
- OpenTelemetry traces.
- Log retention policy (13 months for audit + corrections).

### Security
- Virus-scan adapter.
- Secrets management.
- RLS in prod.
- Periodic permissions audit.

### Cost Controls
- Per-restaurant rate limit.
- Token + cost dashboards.
- Auto-fallback Pro → Flash on quota.

### Documentation
- OpenAPI 3.1 published.
- TS SDK generated for frontend.
- Operations runbooks.
- Postman collection.

### Quality Gates
- Tenant isolation tests on every PR.
- File security tests on every PR.
- Accuracy regression on every PR touching prompt / normalizer / extractor.

---

## 5. Suggested Agent Assignment

| Build Phase | Best-fit agent / role |
|---|---|
| 0A | POS Menu API Contract Discovery Agent (✅ done; awaiting POS team confirmation) |
| 0B | `integration_playbook_expert_v2` |
| 0C | Menu Dataset Preparation Agent (handoff: `MENU_DATASET_AGENT_HANDOFF.md`) |
| 1 | Backend Foundation Implementation Agent |
| 2 | Backend engineer (+ Gemini integration in hand from 0B; dataset frozen by 0C) |
| 3 | Frontend engineer + design partner |
| 4 | Backend engineer |
| 5 | Backend engineer (ML-adjacent) |
| 6 | Backend engineer + POS team (gated on Phase 0A POS confirmation) |
| 7 | SRE + backend engineer |
| 8 | Product + QA + SRE |

---

## 6. Approval Gates Recap

- **Gate 1** — Requirements approved? → `MENU_IMPORT_MVP_REQUIREMENTS.md`
- **Gate 2** — Architecture + Workflow approved? → `MENU_IMPORT_MVP_ARCHITECTURE.md` + `_WORKFLOW.md`
- **Gate 3** — DB schema approved? → `MENU_IMPORT_MVP_DB_SCHEMA.md`
- **Gate 4** — API contract approved? → `MENU_IMPORT_MVP_API_CONTRACT.md`
- **Gate 5** — Review UI approved? → `MENU_IMPORT_MVP_REVIEW_UI_SPEC.md`
- **Gate 6** — Learning memory approved? → `MENU_IMPORT_MVP_LEARNING_MEMORY_SPEC.md`
- **Gate 7** — Implementation plan approved? → this document

> Implementation (Build Phase 1+) begins **only** after all gates are closed AND Phase 0 (decisions + POS contract + Gemini playbook) is complete.
