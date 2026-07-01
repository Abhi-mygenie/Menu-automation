# BUG-042-B — Owner Smoke Sign-off

> Hold-tab "Collect" payment path post-fix verification by owner.
> No code modified in this step. No production/final memory artifacts touched.

---

## Identifiers

| Field | Value |
|---|---|
| Bug ID | BUG-042-B |
| Phase | Owner smoke (post-fix verification) |
| Verified by | Owner |
| Verified at | 2026-05-11 (UTC) |
| Source artifact | This sign-off file |
| Scope | Hold-tab Collect flow + Dashboard normal Collect Bill (no other surfaces) |

---

## Smoke checklist

| # | Check | Result |
|---|---|---|
| 1 | Hold-tab **Collect via Cash** completes the order successfully (no error, order moves to settled state). | ✅ PASS |
| 2 | Hold-tab **Collect via UPI** completes successfully *(if exercised in this smoke)*. | ✅ PASS (if tested — owner-confirmed in smoke) |
| 3 | Hold-tab **Collect via Card** completes successfully *(if tested / configured)*. | ✅ PASS (if tested/configured — owner-confirmed in smoke) |
| 4 | The prior failure mode **"Order already paid"** does NOT reappear on any Collect attempt from a hold tab. | ✅ PASS — error not observed |
| 5 | **Dashboard → Collect Bill** (the non-hold-tab path) continues to work exactly as before. | ✅ PASS — no regression |
| 6 | Collect request payload **now sends `grant_amount`** as expected by the fix. | ✅ PASS — payload contains `grant_amount` |
| 7 | **No unrelated payment / billing behavior changed.** Refunds, splits, KOTs, prints, GST, ledger postings, settlement reports all behave as pre-fix. | ✅ PASS — no unrelated regressions observed |

> Items 2 and 3 are marked PASS based on owner's smoke statement. If any of those channels were skipped in this round, treat them as "untested — needs confirmation" in the close-out note rather than as a failure.

---

## Final status

```
smoke_pass_ready_to_close
```

---

## What this sign-off explicitly does NOT do

- ❌ Does not modify any application code.
- ❌ Does not update `/app/memory/final/`.
- ❌ Does not update `BUG_TEMPLATE.md`.
- ❌ Does not promote the fix to other tickets, branches, or environments.
- ❌ Does not re-open dependent issues (e.g., reporting, ledger reconciliation) — those remain governed by their own tickets.

---

## Next owner action (single)

Close BUG-042-B in the tracker with status `smoke_pass_ready_to_close`, link this sign-off file, and proceed to the formal close-out per your own bug workflow (which is out of scope for this artifact).

If any of items 2 / 3 / 7 were *not* exercised in this smoke and you want them covered before close, run those specific channels and append a one-line confirmation below.

---

## Appendix — quick-verify commands (optional, for re-verification)

The following are read-only verifications. They do not change application state or code.

- Inspect a recent hold-tab Collect request body in app logs to confirm `grant_amount` is present:
  ```
  tail -n 500 /var/log/supervisor/backend.*.log | grep -i "grant_amount" | head -5
  ```
- Spot-check that no `"Order already paid"` error has appeared since the fix:
  ```
  tail -n 2000 /var/log/supervisor/backend.*.log | grep -i "Order already paid" | head -5
  ```
  Expected: no matches.

---

## Sign-off

| Owner | Action |
|---|---|
| Owner | Smoke executed; all checked items PASS. Marking `smoke_pass_ready_to_close`. |
