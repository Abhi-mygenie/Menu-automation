# Decisions Log -- MyGenie Menu Automation

**Last updated:** 2026-06-27
**Format:** Append-only. Never modify a closed decision. Add a new entry to supersede.

---

## Decision Format

```
### DEC-NNNN: [Title]
- Date: [ISO date]
- Status: CLOSED / OPEN / DEFERRED / SUPERSEDED
- Owner: [who decided]
- Source: [document or conversation reference]
- Decision: [what was decided]
- Rationale: [why]
- Impact: [what this unblocks or changes]
```

---

## Closed Decisions (verified from `PHASE_0_DECISION_LOG.md` and `PRODUCTION_GRADE_OWNER_DECISION_SHEET.md`)

### DEC-0001: Gemini SDK pin (D-1 / P0-5)
- Date: 2026-01
- Status: CLOSED
- Owner: Owner + integration playbook
- Source: `PHASE_0_DECISION_LOG.md`, `PHASE_0B_AI_READINESS_SUMMARY.md`
- Decision: Primary `gemini-3.1-pro-preview`; fallback `gemini-3-flash-preview`; backup `gemini-2.5-pro` + `gemini-2.5-flash`. Path A (Python + emergentintegrations + EMERGENT_LLM_KEY) recommended default.
- Impact: Unblocks Phase 0B, Phase 2 AI-side.

### DEC-0002: Cost cap (D-6)
- Date: 2026-01
- Status: CLOSED
- Owner: Owner (Abhi)
- Source: `PHASE_0_DECISION_LOG.md` section 3
- Decision: "Free -- it's our own POS product." No per-restaurant cost cap surfaced to users. Defensive ceilings retained (per-file 500k tokens, per-page 60k tokens).
- Impact: Cost controls simplified. Monitoring + alarms remain.

### DEC-0003: Stack path (D-7)
- Date: 2026-01
- Status: CLOSED
- Owner: Owner (Abhi)
- Source: `PHASE_0_DECISION_LOG.md`
- Decision: **Path A -- Python + FastAPI + emergentintegrations + EMERGENT_LLM_KEY**
- Rationale: Aligns with existing `/app/backend/` FastAPI scaffold.
- Impact: Architecture docs (which say Node.js) need reconciliation. Foundation agent must scaffold Python, not Node.

### DEC-0004: S3 region / data residency (G-4)
- Date: 2026-01
- Status: CLOSED (for Phase 1)
- Owner: Owner (Abhi)
- Source: `PRODUCTION_GRADE_OWNER_DECISION_SHEET.md` G-4
- Decision: "Park Amazon -- work on local in Phase 1." S3 (`ap-south-1` recommended) deferred to later phase.
- Impact: Phase 1 storage = local PVC only.

### DEC-0005: Dataset size (H-3)
- Date: 2026-01
- Status: CLOSED
- Owner: Owner (Abhi)
- Source: `PHASE_0_DECISION_LOG.md`
- Decision: 30 menus, agent picks any 30 honoring stratification 10/10/5/5 (simple/medium/complex/variant-addon).
- Impact: 33 PDFs collected (3 extra/spare).

### DEC-0006: Primary reviewer (H-4)
- Date: 2026-01
- Status: CLOSED
- Owner: Owner (Abhi)
- Source: `PHASE_0_DECISION_LOG.md`
- Decision: Sunil is primary reviewer. Second reviewer recommended but not yet nominated.
- Impact: Sunil's review gates dataset freeze.

### DEC-0007: Storage target (H-5)
- Date: 2026-01
- Status: CLOSED
- Owner: Owner (Abhi)
- Source: `PHASE_0_DECISION_LOG.md`
- Decision: Local / PVC in pre-prod, S3 in production (deferred per G-4).
- Impact: Phase 1 uses local storage only.

### DEC-0008: Dataset upload method (H-11)
- Date: 2026-01
- Status: CLOSED
- Owner: Owner (Abhi)
- Source: `PHASE_0_DECISION_LOG.md`
- Decision: Zip-via-chat asset, one-shot. Replaces Google Drive route.
- Impact: Drive integration deferred. Phase 0C ingest method settled.

---

## Deferred Decisions

### DEC-0009: Google Drive folder ID (H-1)
- Date: 2026-01
- Status: DEFERRED
- Decision: Pivoted to zip upload (H-11). Re-open if Phase 2+ needs Drive.

### DEC-0010: Service account credential (H-2)
- Date: 2026-01
- Status: DEFERRED (Drive route deferred) + SECURITY ACTION PENDING
- Decision: Drive route deferred. **Leaked key (`bug-intake@...`, key id `ad8c4a3...`) still requires revocation.**

---

## POS-Blocked Decisions (cannot close without POS team)

### DEC-POS-001: POS Menu API exact contract (B-1)
- Status: BLOCKED
- Blocking: Phase 6 Sync
- Required from: POS engineering team

### DEC-POS-002: POS delete/archive support -- rollback mode (B-2)
- Status: BLOCKED
- Blocking: Rollback mode selection (A/B/C)
- Required from: POS engineering team

### DEC-POS-003: POS bulk endpoints (B-3)
- Status: BLOCKED
- Blocking: Sync throughput design
- Required from: POS engineering team

### DEC-POS-004: cuisine_type source per restaurant (B-5)
- Status: BLOCKED
- Blocking: Phase 2 cuisine learning
- Required from: POS team + Product

---

## Review Tool Decisions (closed 2026-06-27)

### DEC-RT-001: Review Tool Scope
- Date: 2026-06-27
- Status: CLOSED
- Owner: Owner (Abhi)
- Decision: Review + correct + approve only. No POS sync, no variants, no upload, no Gemini calls.

### DEC-RT-002: PDF Rendering Approach
- Date: 2026-06-27
- Status: CLOSED
- Owner: Owner (Abhi)
- Decision: **Option B — pdf.js page-by-page rendering** (more control, zoom, better UX)

### DEC-RT-003: Start with Smoke Set Only
- Date: 2026-06-27
- Status: CLOSED
- Owner: Owner (Abhi)
- Decision: Yes — 5 PDFs / 412 rows first. Expandable to all 33 later.

### DEC-RT-004: MongoDB for Corrections
- Date: 2026-06-27
- Status: CLOSED
- Owner: Owner (Abhi)
- Decision: Yes — new collections alongside existing ones.

### DEC-RT-005: Proceed to Mockups (RT-G2)
- Date: 2026-06-27
- Status: CLOSED
- Owner: Owner (Abhi)
- Decision: Yes — approved.

---

## Pending Decisions (need owner action)

| ID | Question | Impact |
|---|---|---|
| Gates 1-7 sign-off | All 7 gate docs are v2.0 draft | Blocks full production system (not blocking Review Tool) |
| Second reviewer nomination | H-4 recommends second reviewer for Golden+Stress sets | Affects data quality confidence |
| Stack contradiction reconciliation | Docs say Node.js but D-7 says Python. Owner confirmed MongoDB in conversation. | Needs formal doc update |
