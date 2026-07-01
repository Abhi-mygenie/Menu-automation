# Open Gaps Register -- MyGenie Menu Automation

**Last updated:** 2026-06-27
**Purpose:** Track every known gap, contradiction, or unresolved item that needs owner or team action.

---

## Gap Format

```
### GAP-NNNN: [Title]
- Severity: CRITICAL / HIGH / MEDIUM / LOW
- Category: ARCHITECTURE / PROCESS / SECURITY / DATA / TOOLING
- Status: OPEN / MITIGATED / CLOSED
- Owner: [who must resolve]
- Impact: [what breaks if not resolved]
- Recommended action: [what to do]
```

---

## Open Gaps

### GAP-0001: Stack Contradiction in Documentation
- Severity: CRITICAL
- Category: ARCHITECTURE
- Status: OPEN
- Owner: Owner (Abhi)
- Impact: Foundation agent will scaffold the wrong stack (Node.js instead of Python). Architecture docs, DB schema, API contract all reference Node/NestJS/PostgreSQL. Owner decision D-7 says Python/FastAPI.
- Recommended action: Owner confirms D-7 is authoritative. Architecture docs updated to reflect Python/FastAPI/MongoDB (or PostgreSQL if owner confirms DB engine separately). One-page errata on `PRODUCTION_GRADE_APPROVAL_SUMMARY.md`.

### GAP-0002: Gates 1-7 Missing Owner Sign-off
- Severity: CRITICAL
- Category: PROCESS
- Status: OPEN
- Owner: Owner (Abhi)
- Impact: All product implementation (Build Phase 1+) is blocked. 50+ markdown files of specs exist but none are formally approved.
- Recommended action: Owner reviews each gate doc and either signs off or flags specific objections. Sign-off recorded in `PRODUCTION_GRADE_OWNER_DECISION_SHEET.md` signature table.

### GAP-0003: Sunil G7B Review Not Started
- Severity: HIGH
- Category: DATA
- Status: OPEN
- Owner: Sunil
- Impact: Dataset cannot be frozen. Phase 0C cannot complete. Phase 2 (Extraction) blocked. Ground truth for accuracy evaluation does not exist.
- Recommended action: Sunil starts review using guide at `memory/menu-import/G7B_EXCEL_REVIEW_GUIDE_SUNIL_v0.1.0.md`. Estimated effort: 2-3 hours for 5 workbooks.

### GAP-0004: Dataset Not Frozen
- Severity: HIGH
- Category: DATA
- Status: OPEN (depends on GAP-0003)
- Owner: Owner (Abhi) -- only owner can trigger freeze
- Impact: No evaluation benchmark. Build Phase 2 accuracy claims are meaningless.
- Recommended action: After Sunil's review, owner issues Gate G9 freeze command. Folder renamed from `v0.1.0-PROPOSED` to `v0.1.0`. `frozen_at` set on all entries.

### GAP-0005: POS API Not Confirmed
- Severity: HIGH
- Category: ARCHITECTURE
- Status: OPEN (external dependency)
- Owner: POS engineering team
- Impact: Phase 6 (Sync) is parked. Rollback mode (A/B/C) cannot be selected. Dedup-preview design is blocked.
- Recommended action: Engage POS team with `POS_MENU_API_OPENAPI_DRAFT.yaml` as strawman. Obtain confirmation or revisions. Phase 1-5 are unaffected.

### GAP-0006: Leaked Service Account Key -- Revocation Unconfirmed
- Severity: CRITICAL (SECURITY)
- Category: SECURITY
- Status: OPEN
- Owner: Owner (Abhi)
- Impact: Leaked key (`bug-intake@voice-bug-intake.iam.gserviceaccount.com`, key id `ad8c4a3857158b4aa34be710f862ea4f221a42b1`) may be exploitable. Incident recorded in `PHASE_0_DECISION_LOG.md` section 2.
- Recommended action: Owner revokes the key in GCP Console, audits Drive API activity for past 24h, creates a fresh read-only service account if Drive is re-enabled later. Confirm revocation to the team.

### GAP-0007: Second Reviewer Not Nominated or Waived
- Severity: MEDIUM
- Category: PROCESS
- Status: OPEN
- Owner: Owner (Abhi)
- Impact: Phase 1 Golden + Stress set reviews will have single-reviewer quality only. `MENU_DATASET_PREPARATION_PLAN.md` recommends two reviewers per file.
- Recommended action: Owner nominates a second reviewer or explicitly waives with justification recorded in `PHASE_0_DECISION_LOG.md`.

### GAP-0008: Database Engine Undecided (PostgreSQL vs MongoDB)
- Severity: HIGH
- Category: ARCHITECTURE
- Status: OPEN (related to GAP-0001)
- Owner: Owner (Abhi)
- Impact: All 14-table schema is designed for PostgreSQL with RLS. Existing code uses MongoDB. Building the wrong one wastes weeks.
- Recommended action: Owner confirms database engine. If PostgreSQL, a fresh instance must be provisioned. If MongoDB, the schema docs need significant rework.

### GAP-0009: Branch Divergence Not Resolved
- Severity: LOW
- Category: TOOLING
- Status: OPEN
- Owner: Owner (Abhi)
- Impact: Three branches (`main`, `7-may`, `12-may`) carry different content. No merge strategy documented.
- Recommended action: Declare `12-may` canonical (it has everything). Merge to `main`. Archive `7-may`.

### GAP-0010: No Release Tags or Versioning
- Severity: LOW
- Category: PROCESS
- Status: OPEN
- Owner: Any agent
- Impact: No way to reference specific points in the project lifecycle.
- Recommended action: Adopt semantic versioning. Tag `v0.0.1` for current status-dashboard-only state. Tag `v0.1.0-rc.1` at dataset freeze.
