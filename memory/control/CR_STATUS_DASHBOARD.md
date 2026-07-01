# CR Status Dashboard -- MyGenie Menu Automation

**Last updated:** 2026-07-01

---

## CR ID Format

`CR-MENU-NNNN` where NNNN is a zero-padded sequential number.

Example: `CR-MENU-0001`

---

## Gate Status

Gates are not CRs but gate all CRs. No CR may be implemented before its governing gate is signed off.

| Gate | Document | Status | Sign-off date |
|---|---|---|---|
| Gate 1 | `MENU_IMPORT_MVP_REQUIREMENTS.md` v2.0 | PENDING | -- |
| Gate 2 | `MENU_IMPORT_MVP_ARCHITECTURE.md` + `_WORKFLOW.md` v2.0 | PENDING | -- |
| Gate 3 | `MENU_IMPORT_MVP_DB_SCHEMA.md` v2.0 | PENDING | -- |
| Gate 4 | `MENU_IMPORT_MVP_API_CONTRACT.md` v2.0 | PENDING | -- |
| Gate 5 | `MENU_IMPORT_MVP_REVIEW_UI_SPEC.md` v2.0 | PENDING | -- |
| Gate 6 | `MENU_IMPORT_MVP_LEARNING_MEMORY_SPEC.md` v2.0 | PENDING | -- |
| Gate 7 | `MENU_IMPORT_MVP_IMPLEMENTATION_PHASES.md` v2.0 | PENDING | -- |

---

## Active CRs

| CR ID | Title | Phase | Priority | Status | Depends on | Created | Updated |
|---|---|---|---|---|---|---|---|
| CR-MENU-0001 | Pre-Export Correction Diff View | Review Tool — Post Phase E | P1 | CLOSED — implemented & tested 2026-07-01 | — | 2026-07-01 | 2026-07-01 |
| CR-MENU-0002 | Note Corrections in Pre-Export Diff View | Review Tool — follow-on to CR-MENU-0001 | P2 | CLOSED — implemented & tested 2026-07-01 | CR-MENU-0001 | 2026-07-01 | 2026-07-01 |

2 CRs registered.

---

## How to Register a CR

1. Create a file: `/app/memory/change_requests/CR-MENU-NNNN.md`
2. Use the template:
   ```
   # CR-MENU-NNNN: [Title]
   - Phase: [0-8]
   - Gate required: [1-7 or N/A]
   - Priority: [P0/P1/P2]
   - Status: [OPEN / IN_PROGRESS / REVIEW / DONE / BLOCKED]
   - Assigned to: [name or agent role]
   - Created: [ISO date]
   - Description: [what and why]
   - Acceptance criteria: [what must be true when done]
   - Files touched: [list]
   - Dependencies: [other CRs or gates]
   - Test plan: [how to verify]
   ```
3. Update this dashboard.
4. Update `/app/memory/control/REGISTRY.json`.

---

## Notes

- Gates 1-7 are all PENDING. No product CR may be opened until the relevant gate is signed off.
- Phase 0 work (dataset preparation, G7B review) does not require gate sign-off but does require owner approval.
- POS-dependent CRs (sync, rollback) are PARKED until POS team confirms API contract.
