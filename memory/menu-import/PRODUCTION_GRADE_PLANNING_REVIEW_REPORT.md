# MyGenie POS — Menu Import — Production-Grade Planning Review Report

**Reviewer role:** Senior product architect + backend architect + production-readiness reviewer
**Scope:** The 12 planning documents under `/app/memory/menu-import/` authored in the previous planning pass.
**Outcome:** Revised positioning from "MVP" to **Production-Grade AI Menu Import System** with a **Phase 1 Production Release** model, plus targeted hardening.

---

## 1. Executive Verdict

### 1.1 Is the current planning pack production-grade?

**Substantively: yes. Positionally: no.** The existing pack reflects production-grade thinking throughout — staging-first, human approval gates, per-row audit log, rollback references, version stamps, optimistic concurrency, RLS, append-only ledgers, 3-scope learning with admin approval, and a proper extraction JSON contract. Those are not MVP-shaped decisions.

However the pack is **labelled** as an MVP, uses MVP-era language, and structures its phases as a prototype → pilot → GA progression. That framing is wrong for this product. The correct framing is: **this is a production-grade, plug-in module of MyGenie POS, shipped in staged releases. Phase 1 is a live-safe production release, not a prototype.**

### 1.2 What is strong (keep)

- **Staging-first architecture** with approval gate before sync. This is the single most important production property and it is correctly enforced.
- **Audit log + rollback reference** on every sync attempt.
- **Optimistic concurrency** on row edits and **idempotency keys** on POS Menu API calls.
- **Version stamping** (model, prompt, normalizer, preprocessing) on every import + row.
- **Append-only corrections ledger** and **RLS** for tenant isolation.
- **3-scope learning memory** with a DB check constraint requiring admin approval for `global` scope — this is a rare and valuable safeguard.
- **Storage Adapter** abstraction — clean path from local disk (pre-prod) to S3 (prod).
- **Extraction JSON contract** with JSON schema validation; the model is not allowed to bypass the schema.

### 1.3 What must be revised

1. **Re-position language globally.** Replace "MVP" with "Production-Grade Menu Import System" / "Phase 1 Production Release" / "staged rollout." Remove any phrasing that implies disposability, demo, or prototype.
2. **Restructure phasing.** Add **Phase 0** (decision closing + POS contract confirmation) and split implementation phases to 0–8 per the new direction, while keeping a separate "release train" view (Phase 1 basic / Phase 2 variants+addons+dedup / Phase 3 inventory+recipe).
3. **Clarify go-live readiness of Phase 1.** State explicitly what ships live, what does not, and the live-safety guarantees.
4. **Harden hallucination control.** Constrain extractor to "items visible in the file only" + forbid invented SKUs in the prompt contract; add UI-side provenance (row ↔ page crop) so every extracted row can be verified against its source.
5. **Tighten duplicate handling.** Add explicit per-item dedup strategy against the live POS menu at sync time (name + category + price triplet fuzzy match) with confirm-before-create.
6. **Strengthen price-correction safety.** Spell out rules for when a price correction becomes a learning rule vs a one-off. This is in the learning spec but needs a clearer "do not learn" list.
7. **Add file security specifics.** Mime sniffing by magic bytes, ClamAV (or equivalent) hook, signed URL TTL policy, anti-CSRF, XSS-safe CSV export.
8. **Define cost controls more concretely.** Per-restaurant monthly cap, per-file token cap, model auto-fallback policy.
9. **POS Menu API contract** needs to move from assumption → confirmed artifact before Phase 6 build. Phase 0 exists for this.
10. **Reclassify open questions** into P0 blockers / P1 decisions / P2 deferrable. Currently, several P0-level questions sit in a flat "open" list.

---

## 2. Document-by-Document Review

Symbols: 🟢 approve as-is (after language pass) · 🟡 approve with targeted revisions · 🔴 needs structural revision.

### 2.1 `MENU_IMPORT_MVP_REQUIREMENTS.md` — 🟡

**Strengths**
- Clear P0 / P1 / Later split.
- Correct non-negotiables (staging-first, no auto-sync, manual override always available).
- Solid NFRs (perf, reliability, security, observability, cost, compliance, accessibility, i18n).
- Concrete acceptance criteria.

**Gaps**
- Positions itself as MVP; needs relabelling as Phase 1 Production Release with explicit live-safety guarantees.
- No explicit statement that "Phase 1 is live with pilot restaurants, not a sandbox."
- Missing explicit mention of **hallucination control** as a requirement (it is addressed implicitly via schema but deserves an explicit FR).
- Missing explicit **duplicate prevention** FR against the live POS menu.
- Missing explicit **cost control** FR (per-restaurant monthly cap).

**Required changes**
- Re-title and re-position as production-grade.
- Add FR-Hallucination-Control, FR-Duplicate-Prevention, FR-Cost-Cap.
- Clarify acceptance criteria include production SLOs, not just "MVP exit."

**Verdict:** 🟡 revise.

---

### 2.2 `MENU_IMPORT_MVP_ARCHITECTURE.md` — 🟡

**Strengths**
- Clean component diagram; correct separation of HTTP API, workers, sync engine, storage adapter.
- Correct plug-in model: this module owns staging; POS owns live.
- State machine is well-formed.

**Gaps**
- Positions itself as MVP; same relabelling needed.
- Missing a dedicated **Normalizer/Parser service** block in the diagram (it's currently a worker; ok, but should be called out as a distinct service boundary).
- Missing explicit **Audit service** block (audit currently lives inline in sync-worker; valid, but for production-grade we should name it as an architectural concern with a separate consumer path for dashboards).
- Missing **Monitoring/Logging** subsystem detail (it's covered in NFRs but not in the architecture diagram).
- Rollback strategy needs expansion (what happens when POS doesn't support delete — deterministic behavior).

**Required changes**
- Re-title.
- Add blocks: Normalizer Service, Audit Service, Monitoring Service.
- Expand "Rollback" to include three modes: (a) POS delete supported (full undo), (b) POS soft-archive supported (soft undo), (c) no delete support (manual cleanup list).
- Add a "Future live-import path" section — how the module evolves beyond Phase 1 without schema rework.

**Verdict:** 🟡 revise.

---

### 2.3 `MENU_IMPORT_MVP_WORKFLOW.md` — 🟡

**Strengths**
- Canonical end-to-end flow with per-stage detail.
- Good state machines for `menu_imports.status` and `menu_import_rows.status`.
- Edge cases + worker concurrency addressed.

**Gaps**
- "Draft save" is implicit (review rows persist on every PATCH) but not called out as a first-class concept. The new direction names "Draft save" explicitly as a Phase 1 feature.
- No state machine for **correction memory** lifecycle (create → apply → promote → deactivate).
- Failure recovery section is thin on "partial preprocessing success + partial extraction success" interactions.
- Manual override flow not separated from normal edit flow.

**Required changes**
- Re-title.
- Promote "Draft save" to a named workflow step; note that it is implicit-on-PATCH + explicit snapshot on `save-draft` action.
- Add a **correction memory state machine**.
- Add a dedicated **Manual Override** flow that lets a user bypass a failed page and enter items by hand.
- Expand failure recovery matrix.

**Verdict:** 🟡 revise.

---

### 2.4 `MENU_IMPORT_MVP_DB_SCHEMA.md` — 🟡

**Strengths**
- 11 tables and 13 ENUMs are justified: nothing here is speculative.
- Indexes + GIN on JSONB + trigram on item_name are correct.
- Append-only triggers on corrections + audit_log are production-grade.
- RLS design is correct.
- Retention + lifecycle policies are stated.

**Gaps**
- Missing `menu_import_drafts` or a clearer "draft snapshot" concept — right now the staging rows ARE the draft, which is fine but should be named and versioned if the user explicitly saves a checkpoint.
- No explicit **idempotency key** table (we store keys on `menu_import_audit_log` but there is no dedicated unique store for reject-on-replay).
- No **global correction approval queue** table (currently we rely on `approved_by_admin`/`approved_at` columns; for auditability we should also have an admin action log).
- Table sizing and partitioning guidance for `menu_import_audit_log` / `menu_import_corrections` is present but should specify the concrete switchover threshold.

**Required changes**
- Re-title.
- Add **`menu_import_idempotency_keys`** table (small, unique per (scope, key), TTL via job).
- Add **`menu_import_admin_actions`** table for global-rule approvals + deactivations (separate from audit_log which is sync-focused).
- Add **draft snapshot** pattern (via existing `menu_import_rows.version` + a new `menu_import_draft_snapshots` JSONB per-user checkpoint) — keep lightweight.
- Add explicit partitioning strategy with trigger thresholds ("partition audit_log monthly when > 100M rows or > 90 days retention with high write volume").

**Verdict:** 🟡 revise.

---

### 2.5 `MENU_IMPORT_MVP_API_CONTRACT.md` — 🟡

**Strengths**
- Endpoints are not over-complicated; 25 endpoints cover the full lifecycle.
- Auth + tenant scoping defined at the top as convention.
- Idempotency + concurrency headers standardized.
- Error catalog is practical.

**Gaps**
- Positions as MVP.
- Needs explicit **`POST /{id}/save-draft`** endpoint to promote draft to a named user intention (even if it's a no-op under the hood, the UX contract benefits).
- Needs explicit **dedup-check endpoint** — `POST /{id}/dedup-preview` that returns, for each approved row, the likely existing POS item matches (for UI to show before sync).
- Needs **cost-status endpoint** — `GET /{id}/cost` or inclusion in `/status` (token usage already in status; add projected monthly cost for the restaurant).
- Error code catalog should add `DUPLICATE_ON_POS`, `COST_CAP_EXCEEDED`, `FILE_MAGIC_MISMATCH`.

**Required changes**
- Re-title.
- Add `save-draft`, `dedup-preview`.
- Extend error catalog.
- Add explicit note: no endpoint in this module writes to live POS menu except `sync`; all other endpoints touch staging only.

**Verdict:** 🟡 revise.

---

### 2.6 `MENU_IMPORT_MVP_REVIEW_UI_SPEC.md` — 🟡

**Strengths**
- Table design with sticky cols, filters, search, inline edit, side panels.
- Accessibility called out (WCAG 2.1 AA).
- Every interactive element gets a `data-testid`.
- Sync preview modal (dry-run) is there.

**Gaps**
- Positions as MVP.
- Missing explicit **row provenance** feature: clicking a row shows the exact crop of the source file for that item (reduces hallucination risk; directly supports "user can see raw text/source").
- Missing **reviewed flag filter** — user should be able to mark a row as "reviewed" independent of approve/reject (reviewed-but-not-yet-decided).
- Missing clear visual distinction for **auto-applied learning rules** vs **suggestions** (learning spec calls it out but the UI spec does not express it strongly enough).
- Missing **pre-sync duplicate preview** UI that consumes the new `dedup-preview` API.

**Required changes**
- Re-title.
- Add "Source crop" pane toggle on row detail.
- Add "Reviewed" status flag + filter (in addition to approve/reject).
- Add visual language for auto-applied rule vs suggestion (badge: `Learned` vs `Suggested`).
- Add Duplicate Preview modal.

**Verdict:** 🟡 revise.

---

### 2.7 `MENU_IMPORT_MVP_LEARNING_MEMORY_SPEC.md` — 🟡

**Strengths**
- 3-scope model (restaurant / cuisine / global) with clear thresholds.
- DB constraint enforcing admin approval for global.
- Reversal-budget deactivation.
- Apply order + never-override-user-edits.

**Gaps**
- Price corrections need a **tighter "do not learn" list**. Current doc partially addresses it; elevate to a named section.
- No explicit **admin approval queue** mechanics (what the admin sees, what signals they review).
- Confidence formula is stated; fuzzy-match policy (exact vs Levenshtein ratio vs phonetic) for spelling rules not fully spelled out.
- Missing **per-restaurant opt-out** for cuisine/global rules (some restaurants have idiosyncratic menus; they may want to disable all non-restaurant rules).
- Missing **anti-overfitting** policy when a single heavy-user restaurant dominates a cuisine bucket.

**Required changes**
- Re-title.
- Section 5.1 "What NOT to learn" → promote to a named policy section and expand.
- Add **Admin Approval Queue mechanics**: what fields admin sees, what signals cross-cuisine coverage, suppression reason codes.
- Clarify fuzzy-match strategy per pattern type.
- Add **Per-restaurant opt-out** flag (restaurant profile).
- Add **Anti-overfitting**: cap one restaurant's contribution to a cuisine rule at 40% of the evidence.

**Verdict:** 🟡 revise.

---

### 2.8 `MENU_IMPORT_MVP_TEST_STRATEGY.md` — 🟡

**Strengths**
- 70 / 20 / 10 split with stratification.
- Unit / integration / regression / hold-out / pilot layers.
- Concrete accuracy metrics + targets.

**Gaps**
- Positions as MVP.
- Missing **production smoke tests** (post-deploy canary) category.
- Missing explicit **tenant isolation test** — a PR-gated test proving a user in tenant A cannot read tenant B's imports (this is the most dangerous regression in any multi-tenant system).
- Missing explicit **file security tests** (magic-byte mismatch, malicious PDF, oversized zip-bomb PDF, svg-in-png).
- Missing **rollback tests**.
- Missing **correction-memory reuse tests** — upload menu, correct, re-upload similar menu, verify rule applied.

**Required changes**
- Re-title.
- Add Production Smoke Tests section.
- Add dedicated Tenant Isolation test, File Security tests, Rollback tests, Correction Reuse tests.
- Define per-phase test gates.

**Verdict:** 🟡 revise.

---

### 2.9 `MENU_IMPORT_MVP_RISK_REGISTER.md` — 🟡

**Strengths**
- 20 risks scored; mitigations listed; top-5 watchlist.

**Gaps**
- Positions as MVP.
- "AI hallucination" risk missing as a named row (it is implicit in R-11 but should be its own risk).
- "User skipping review" missing as a named risk (users bulk-approving everything without looking — social risk).
- "Duplicate item creation in POS" missing as a named row (implicit in sync but dedup is the direct mitigation).

**Required changes**
- Re-title.
- Add R-21 AI Hallucination.
- Add R-22 User review short-circuit / rubber-stamp.
- Add R-23 Duplicate POS item creation.

**Verdict:** 🟡 revise.

---

### 2.10 `MENU_IMPORT_MVP_IMPLEMENTATION_PHASES.md` — 🔴

**Strengths**
- Phase-by-phase structure with DoD + exit gates.

**Gaps**
- Positions as MVP.
- Phases are implementation-centric but do not separate **release train** (product-visible phases) from **build phases** (engineering sequence).
- Phase 1 currently means "architecture + requirements finalization." Under the new direction, Phase 1 is the **first production release** (extraction + review + correction + draft).
- Missing a **Phase 0** for decision closing + POS API contract confirmation.
- Missing a **Phase 7** for production hardening (audit dashboards, cost monitors, rollback, runbooks) before pilot.

**Required changes**
- Restructure into: Release Train (Phase 1 basic / Phase 2 variants+addons+dedup / Phase 3 inventory+recipe) + Build Phases (0–8) that map to the Release Train.
- Rename old "Phase 1 — Architecture + Requirements" → "Phase 0 — Decisions + POS Contract."
- Add Phase 7 "Production Hardening."
- Add Phase 8 "Pilot Rollout."
- Make clear: **Phase 1 of the Release Train is live with pilot restaurants**, not sandbox.

**Verdict:** 🔴 revise (structural).

---

### 2.11 `MENU_IMPORT_MVP_OPEN_QUESTIONS.md` — 🔴

**Strengths**
- Questions are well-articulated with candidate answers.

**Gaps**
- All questions sit flat; no priority classification (P0 blocker vs P1 in-phase decision vs P2 future).
- POS API contract questions (B1–B4) are P0 blockers but not labelled.
- `cuisine_type` source (B5) is P0 for learning.
- NestJS/Prisma choice (C1/C2) is a low-risk P1 and should be closed quickly.

**Required changes**
- Restructure into P0 / P1 / P2 buckets.
- Recommend explicit defaults for P1/P2 to unblock progress.
- Surface P0s in the Approval Summary.

**Verdict:** 🔴 revise (structural).

---

### 2.12 `MENU_IMPORT_MVP_HANDOFF_INDEX.md` — 🟡

**Strengths**
- Single entry-point structure.
- Clear approval gates and recommended next agent.

**Gaps**
- Positions as MVP.
- Does not clearly state "Phase 1 is a production release."
- Recommended next agent list should be explicit about the two possible first steps (POS API discovery agent vs Gemini integration playbook) depending on what owner decides first.

**Required changes**
- Re-title.
- Explicitly state production-grade framing up top.
- Reflect new Phase 0.

**Verdict:** 🟡 revise.

---

## 3. Critical Gaps (Production Items Missing or Weak)

| # | Gap | Covered? | Action |
|---|---|---|---|
| G1 | AI hallucination control — explicit prompt-level + schema-level + UI provenance | Partial | Add FR + UI source crop + dedicated risk |
| G2 | Duplicate prevention against live POS menu at sync time | Partial | Add `dedup-preview` API + UI modal + FR |
| G3 | Cost control — per-restaurant monthly cap, per-file token cap, auto-fallback policy | Mentioned | Elevate to named NFR + config table |
| G4 | File security: magic-byte verification, malware scan hook, zip-bomb guard | Mentioned | Elevate + add tests |
| G5 | Tenant isolation tests — dedicated test layer | Missing | Add to test strategy |
| G6 | Draft save as a named UX concept + optional snapshot | Implicit | Add endpoint + table |
| G7 | Admin approval queue for global learning (UI + actions table) | Partial | Add table + spec |
| G8 | Row provenance — source crop per row | Missing | Add UI pane + DB field `source_bbox` |
| G9 | Rollback semantics for POS-unsupported-delete | Partial | Spell out 3 modes |
| G10 | Production smoke tests post-deploy | Missing | Add to test strategy |
| G11 | POS Menu API contract (B1–B4) | Open | P0 blocker; Phase 0 must close |
| G12 | User-review-skip social risk | Missing | Add risk + UI guard (force=true audited) |
| G13 | Per-restaurant opt-out of cuisine/global rules | Missing | Add to learning spec |
| G14 | Anti-overfitting cap (one restaurant's share of a cuisine rule) | Missing | Add to learning spec |

---

## 4. Decision Blockers (Open Questions Classified)

### P0 — Must decide before implementation starts
- **B1** POS Menu API exact contract (endpoints, payloads, idempotency, errors).
- **B2** POS Menu API delete / rollback support.
- **B3** POS Menu API bulk-endpoint availability.
- **B5** Source of `cuisine_type` per restaurant.
- **F1** Gemini 3 SDK + JSON mode pin (requires `integration_playbook_expert_v2`).
- **G1** Data residency / regional pinning (India DPDP / EU GDPR) — for S3 region selection.

### P1 — Can decide during Phase 1 build
- **C1** Framework final: NestJS (default) vs Express + tsoa.
- **C2** ORM final: Prisma (default) vs Knex + Objection.
- **C3** Worker process model: single vs per-queue (default single).
- **C4** RLS in pre-prod (default: yes).
- **C5** PVC for local storage in pre-prod (default: yes).
- **D1** BIGSERIAL vs UUID PKs (default: match POS).
- **E2** "Approve all clean" default (default: enabled with 0.85 threshold + blocking-warning filter).
- **E4** Auto-create categories on sync (default: yes, with "will be created" badge in sync preview).
- **E5** Show original file crop next to row (default: yes; ties to G8).
- **F3** Auto-fallback Pro → Flash (default: enabled, configurable per restaurant).

### P2 — Can defer to later phase
- **B4** External ID type (BIGINT vs UUID) storage shape.
- **C6** Audit log partitioning from day one (default: defer; partition when > 100M rows).
- **D2** Per-restaurant retention overrides.
- **D3** Share global memory between staging / prod.
- **E3** Mobile review viability.
- **E6** Per-restaurant opt-out of cuisine/global rules (will still add DB flag now; UI exposure deferred).
- **E7** "Rules I've taught" UI.
- **G2** AI usage disclosure copy placement.

---

## 5. Recommendation — Next Exact Step

1. **Close Phase 0 decisions** in the owner decision sheet (new doc: `PRODUCTION_GRADE_OWNER_DECISION_SHEET.md`).
2. In parallel, engage:
   - **POS Menu API Contract Discovery Agent** to produce the OpenAPI/contract artifact for the POS Menu API (unblocks Phase 6 build + rollback design).
   - **`integration_playbook_expert_v2`** with `INTEGRATION: Gemini 3 Pro + Gemini 3 Flash (Node.js, vision, structured JSON output)` to pin SDK, env keys, JSON mode, safety settings.
3. After P0 decisions are closed and the two discovery artifacts are back, **close Approval Gates 1–7** on the revised pack.
4. Only then begin Phase 1 Production Release build with the **Backend Foundation Implementation Agent** as primary driver, and the **Frontend Review UI Implementation Agent** starting in parallel after `/rows` API is stable.

**Do not begin implementation until P0 blockers are closed.** The revised pack makes this explicit.
