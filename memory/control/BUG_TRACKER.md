# Bug Tracker -- MyGenie Menu Automation

**Last updated:** 2026-06-27

---

## Bug ID Format

`BUG-MENU-NNNN` where NNNN is a zero-padded sequential number.

For bugs inherited from the broader POS system, the original ID is preserved (e.g., `BUG-042-B`).

---

## Severity Scale

| Severity | Description |
|---|---|
| SEV-1 | Catastrophic: data corruption, tenant leakage, security breach, live POS mutation without approval |
| SEV-2 | Major: feature broken, workflow blocked, significant data quality issue |
| SEV-3 | Moderate: incorrect behavior that has a workaround |
| SEV-4 | Minor: cosmetic, low-impact, polish |

---

## Known Bugs

| Bug ID | Title | Severity | Status | Component | Created | Notes |
|---|---|---|---|---|---|---|
| BUG-042-B | Hold-tab Collect payment path failure | SEV-2 | **READY_TO_CLOSE** | POS (not menu-import) | 2026-05-11 | Smoke-tested and passed. Owner smoke sign-off recorded at `memory/bugs/BUG_042_B_SMOKE_SIGNOFF.md`. Awaiting formal tracker closure. |

---

## Open Bugs

None.

---

## How to Log a Bug

1. Create a file: `/app/memory/bugs/BUG-MENU-NNNN.md`
2. Use the template:
   ```
   # BUG-MENU-NNNN: [Title]
   - Severity: [SEV-1 / SEV-2 / SEV-3 / SEV-4]
   - Status: [OPEN / INVESTIGATING / FIX_IN_PROGRESS / FIX_VERIFIED / READY_TO_CLOSE / CLOSED]
   - Component: [backend / frontend / pipeline / dataset / infra]
   - Reported by: [name]
   - Created: [ISO date]
   - Steps to reproduce: [...]
   - Expected behavior: [...]
   - Actual behavior: [...]
   - Root cause: [if known]
   - Fix: [if applied]
   - Regression test: [how to verify fix]
   - Files touched: [list]
   ```
3. Update this tracker.
4. Update `/app/memory/control/REGISTRY.json`.

---

## Rules

- SEV-1 bugs block any release.
- All bugs must have a regression test before close.
- Bugs related to the menu-import pipeline must reference the dataset version they affect.
- Bugs found during G7B review are dataset issues, not code bugs -- log them in reviewer notes, not here.
