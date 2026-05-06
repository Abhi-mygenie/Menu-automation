# MyGenie POS — AI Menu Import — POS Sync Strategy

**Document version:** 1.0
**Status:** Final (Phase 0). Operates against worst-case POS API capabilities until POS team confirms the contract.
**Inputs:** `POS_MENU_API_CONTRACT_DISCOVERY_REPORT.md`, `POS_MENU_API_OPENAPI_DRAFT.yaml`, `MENU_IMPORT_MVP_ARCHITECTURE.md`, `MENU_IMPORT_MVP_API_CONTRACT.md`.

---

## 0. Why a defensive strategy

Discovery confirmed the POS Menu API is **not present in this repository** and its capabilities are **unconfirmed by the POS engineering team**. To avoid blocking foundation work, this strategy assumes the **worst-case** POS profile (no bulk, no delete, no header idempotency, BIGINT ids, per-item rate limits) and is **upgradable** at deployment via configuration when POS capabilities are confirmed.

---

## 1. Recommended Sync Mode — **Hybrid (Sequential by default, Bulk when available)**

### 1.1 Default: Sequential per-row sync

Each approved row in `menu_import_rows` produces this sequence at sync time:

1. Resolve (or create) target category via `GET /menu/categories` then `POST /menu/categories` if missing.
2. For each approved row in display order:
   a. If `dedup_resolution = skip` → no POS call; row goes to `synced` status with `synced_external_ref = { skipped: true, matched_id: <pos_item_id> }`.
   b. If `dedup_resolution = update_existing` → `PATCH /menu/items/{matched_id}` with the resolved payload.
   c. Else → `POST /menu/items` with `Idempotency-Key`.
3. For each approved variant of the row → `POST /menu/items/{id}/variants` (or nested inline if POS doesn't support first-class variants).
4. For each approved add-on of the row → `POST /menu/items/{id}/addons`.
5. Persist `synced_external_ref = { item_id, variant_ids[], addon_ids[] }`.
6. Append `menu_import_audit_log` entry per call.

**Concurrency:** 2 concurrent rows per restaurant (avoid hammering POS), global pool bounded by Gemini-equivalent rate. POS rate limits respected via `429` exponential backoff.

**Throughput baseline:** 50 rows × ~200ms per row × 2 child calls ≈ 20s end-to-end for a 50-item menu — meets the ≤ 30s P95 target.

### 1.2 Optional: Bulk path (config-flagged)

If POS confirms a bulk endpoint (e.g., `POST /menu/items/bulk`), the Sync Service switches to:
- Group rows by category.
- Per category: one `POST /menu/items/bulk` with up to 200 items.
- Per-item child calls (variants/add-ons) remain sequential unless POS also exposes bulk-children endpoints.
- Same `Idempotency-Key` semantics; partial success on bulk is mapped per row.

**Switch mechanism:** env `POS_SYNC_MODE=sequential|bulk|hybrid` and feature flag `pos_bulk_supported` from POS capabilities probe.

### 1.3 Why hybrid (not bulk-first)

- Bulk semantics differ wildly across POS implementations (atomic vs partial; transactional vs best-effort). Sequential is universally implementable.
- A single failed item in bulk shouldn't abort the entire sync; we want per-row sync_failed semantics for retry. Sequential gives that for free.
- Once POS confirms bulk, switching is a config change, not a rewrite.

---

## 2. Recommended Rollback Mode — **Mode C by default; upgradable to B then A**

### 2.1 Mode selection

Set at deployment time via env `ROLLBACK_MODE=A|B|C`:

- **Mode A — Full Undo** (preferred when POS supports `DELETE /menu/items/{id}`).
  - Walk `menu_imports.rollback_ref` (JSONB list of `{item_id, variant_ids[], addon_ids[], category_id?}`).
  - For each entity: call `DELETE /menu/items/{id}` (and category delete if the import created the category and it's now empty).
  - On 409 (item in use): log + skip + add to "manual cleanup" list.

- **Mode B — Soft Undo** (when POS supports `PATCH /menu/items/{id}` with `archived=true` or `is_active=false`).
  - For each entity: `PATCH /menu/items/{id}` with archive flag.
  - User-friendly rollback: "All items from this import have been archived; visit POS to permanently delete or restore."

- **Mode C — Manual Cleanup** (default until POS capabilities are confirmed).
  - Rollback API returns `501` with a structured manual cleanup list:
    ```json
    {
      "menu_import_id": 1024,
      "manual_cleanup_required": true,
      "items_created": [
        { "external_id": "pos-8812", "name": "Paneer Butter Masala", "created_at": "..." },
        ...
      ],
      "categories_created": [...]
    }
    ```
  - Audit log captures the list.
  - UI shows a copyable list and links to POS Menu admin so the user can clean up manually.

### 2.2 Why Mode C is the safe default

- It works against any POS, including legacy POS systems with no destructive API.
- It never produces an unintended destructive action.
- It is upgradable to B or A by toggling `ROLLBACK_MODE`; no code change needed.
- The same `rollback_ref` list powers all three modes — no schema variation.

### 2.3 Rollback safety invariants (always)

- Rollback only deletes/archives entities that **this** import created (tracked in `rollback_ref`).
- Rollback never touches POS items the user resolved as `update_existing` — those remain in their post-update state.
- Every rollback call is itself idempotent (`Idempotency-Key=menu-import:{id}:rollback:row:{row_id}:attempt:{n}`).
- A second rollback call returns `204 already_rolled_back` rather than re-deleting.

---

## 3. Recommended Duplicate Prevention — **Mandatory dedup-preview before sync (Phase 2+)**

### 3.1 Preview as a hard pre-sync gate

- Phase 1 ships **without** dedup-preview because Phase 1 is scoped to **new-menu onboarding** (typically empty target categories). Sync proceeds without preview but `menu_import_audit_log` records all creates so duplicates can be detected post-hoc.
- Phase 2+ makes dedup-preview a **hard gate**: `POST /{id}/sync` returns `422 DEDUP_PREVIEW_REQUIRED` if preview wasn't run for this import.

### 3.2 Matching algorithm

For each approved row, compute a **dedup signature** and match against POS items in the target category:

```
signature(row)   = ( normalize(item_name), category_id, price_anchor )
similarity(a,b)  = max(
                       lev_ratio(name_a, name_b),                        // fuzzy name
                       (price_close(a,b) ? 0.5 : 0)                     // price agreement bonus
                   )
match           = { external_item_id, name, price, similarity }

normalize(s)    = lowercase(s) → strip(punct) → collapse(whitespace)
                  → drop stop_words(["the","with","and","-",","])
lev_ratio       = Levenshtein ratio (0..1)
price_close     = abs(price_a - price_b) / max(price_a, price_b) <= 0.15
```

**Resolution recommendation per match similarity:**

| Similarity | Default recommendation |
|---|---|
| ≥ 0.98 AND price equal | `skip` (likely same item already in POS) |
| ≥ 0.92 AND price differs ≤ 15% | `update_existing` (same item, price update) |
| 0.85–0.92 | `create_new` with warning to user (looks similar but not confident) |
| < 0.85 | `create_new` (no match) |

Thresholds are configurable per restaurant; the user can override any individual row's resolution.

### 3.3 What dedup-preview is **not**

- Not a tax / category re-mapping tool. Categories are resolved separately during sync.
- Not destructive — it never modifies POS in preview mode. It only **reads**.
- Not silent — the user sees and confirms each match before sync.

### 3.4 Phase 1 mitigations (without dedup-preview)

- Restaurants are advised at onboarding: "Phase 1 is for **fresh menu setup**. If your menu already exists in POS, please wait for Phase 2 (Duplicate Preview) or contact support."
- Audit log preserves a complete list of created items per sync so support can reconcile if duplicates are reported.

---

## 4. Recommended Idempotency Strategy — **Composite, server-side enforced**

### 4.1 Key composition

For every mutating call, the Sync Service generates:

```
Idempotency-Key = "menu-import:{import_id}:{scope}:{key_part}:attempt:{n}"

scope          = "category-create" | "item-create" | "item-update"
                | "variant-add"     | "addon-add"   | "rollback-delete"
                | "rollback-archive"
key_part       = restaurant-stable identifier
                  e.g. for item-create: hash(category_resolved_id, normalize(item_name))
                  e.g. for rollback-delete: external_item_id
n              = retry attempt counter on this row+scope
```

### 4.2 Two-layer enforcement

1. **Server-side** (POS): if POS honors `Idempotency-Key`, replays return the cached prior response. **TODO — confirm with POS team.**
2. **Client-side** (this module): regardless of POS support, the Sync Service writes to `menu_import_idempotency_keys` (DB schema §3.12) before each call. On duplicate key, the cached response is replayed locally. This protects against:
   - POS not honoring the header.
   - Network re-tries after timeout.
   - Worker re-pickups after crash.

Cache TTL: 7 days (configurable). Janitor job purges expired keys.

### 4.3 External ID mapping

After every successful POS create, `menu_import_rows.synced_external_ref` is updated:

```json
{
  "item_id": "pos-8812",
  "variant_ids": ["pos-9001", "pos-9002"],
  "addon_ids":   ["pos-9101"],
  "category_id": "pos-cat-77",
  "synced_at":   "2026-01-22T10:33:01Z"
}
```

JSONB shape keeps us POS-shape-agnostic (BIGINT, UUID, or opaque string — all fit). Same shape feeds `rollback_ref` for the import.

### 4.4 Sync attempt tracking

`menu_import_rows.sync_attempts` increments on every attempt; `last_sync_attempt_at` records timing; `sync_error` carries the last error string. After 3 server-side retries with exponential backoff (and a Pro→Flash equivalent escalation if applicable to POS — typically not applicable here), a row stays `sync_failed` and the user can `POST /{id}/sync/retry` later.

### 4.5 Audit trail per attempt

Every attempt writes one `menu_import_audit_log` entry with `request_payload`, `response_payload`, `http_status`, `duration_ms`, `idempotency_key`, `attempt_no`. Append-only by DB trigger.

---

## 5. Final list of P0 blockers — closed vs still open

| ID | Blocker | Status after Phase 0 discovery | Reason |
|---|---|---|---|
| **B-1** | POS Menu API exact contract | **STILL BLOCKED** | No POS API present in `/app/`. Proposed contract drafted (`POS_MENU_API_OPENAPI_DRAFT.yaml`) awaiting POS team confirmation. |
| **B-2** | POS delete / archive / rollback support | **STILL BLOCKED** | Unknown. Mode C default; A/B selectable when confirmed. |
| **B-3** | POS bulk endpoint availability | **STILL BLOCKED** | Unknown. Sequential default; bulk path config-switchable. |
| **B-5** | `cuisine_type` source | **STILL BLOCKED** | No POS restaurant model present. Fallback: capture during onboarding if POS lacks the field. |
| **B-7** | Other POS sync issues discovered during code/API review | **PARTIALLY CLOSED** | This document + OpenAPI draft surface auth, idempotency, error codes, dedup, and rollback as open with documented defaults. Specific POS behaviors still unknown. |
| P0-5 (D-1) | Gemini 3 SDK / JSON mode pin | Unaffected by this work | Out of scope for POS discovery; tracked separately via `integration_playbook_expert_v2`. |
| P0-6 (G-4) | Data residency / S3 region | Unaffected by this work | Owner decision; tracked in `PRODUCTION_GRADE_OWNER_DECISION_SHEET.md`. |
| P0-8 (D-6) | Monthly cost cap value (USD) | Unaffected by this work | Finance decision. |

**Net closure:** **0 P0 POS blockers fully closed** by this Phase 0 discovery. **B-7 partially closed** by the proposed contract + defensive strategy. **B-1 / B-2 / B-3 / B-5 require direct engagement with the POS engineering team** (or access to the POS repository) — this discovery cannot proceed further from inside `/app/`.

---

## 6. What can / cannot proceed

| Build phase | Can proceed now? | Reason |
|---|---|---|
| **Build Phase 1 — Foundation** (schema, storage, auth scaffold, upload, import batch) | ✅ YES | Does not depend on POS Menu API. Tenant guard will mock POS JWT validation until issuer is confirmed. |
| **Build Phase 2 — Extraction** (Gemini, parser, normalizer) | ✅ YES (after Gemini playbook P0-5 closes) | Independent of POS. |
| **Build Phase 3 — Review UI** | ✅ YES | Independent of POS. |
| **Build Phase 4 — Draft + correction capture** | ✅ YES | Independent of POS. |
| **Build Phase 5 — Learning memory apply** | ✅ YES | Independent of POS. |
| **Build Phase 6 — POS Menu Sync** | ❌ NO | Requires confirmed POS contract (B-1) + rollback capability (B-2). |
| **Build Phase 7 — Hardening** | ⚠️ PARTIAL | Tenant isolation + file security + cost dashboards can proceed. POS-side audit dashboards + rollback runbook gated on B-1/B-2. |
| **Build Phase 8 — Pilot rollout** | ❌ NO | Pilot requires Phase 6 sync working end-to-end. |

---

## 7. Recommended next concrete steps

1. **Engage POS engineering team** (synchronous meeting or async ticket). Take this draft as the strawman; ask them to confirm or revise field-by-field.
   - Hand them `POS_MENU_API_OPENAPI_DRAFT.yaml`.
   - Hand them §1.1 sync sequence to validate.
   - Hand them §2.1 rollback modes to confirm capability.
   - Hand them §3.2 dedup signature to validate match correctness on real POS data.
2. **Confirm `cuisine_type` field** on POS restaurant profile (§B-5). If absent, agree on the onboarding-capture fallback.
3. **Document the confirmed contract** at `/docs/contracts/pos-menu-api.openapi.yaml` (replacing the draft) and update `MENU_IMPORT_MVP_OPEN_QUESTIONS.md` with closures.
4. **Lock `ROLLBACK_MODE`** based on POS capability.
5. **Add contract tests** (Pact-style) on every PR to detect drift.
6. **Until contract is confirmed:** run **Build Phases 1–5 in parallel** (they don't depend on POS). **Phase 6 is gated**.

---

## 8. Operational guarantees this strategy preserves

Even under worst-case POS capabilities, the strategy preserves all production-grade safety invariants from `MENU_IMPORT_MVP_REQUIREMENTS.md` and `_ARCHITECTURE.md`:

- ✅ AI never directly mutates live POS menu — only the user-approved sync does.
- ✅ Final sync goes through a single boundary (POS Menu API) with idempotency.
- ✅ Existing live POS menu items are never modified unless user explicitly resolves `update_existing`.
- ✅ Delete is opt-in and gated by deployment config.
- ✅ Bulk is opt-in and behind a config flag.
- ✅ Duplicates are previewed and resolved by the user (Phase 2+); Phase 1 is scoped to new-menu onboarding.
- ✅ Idempotency works regardless of POS support thanks to the local key table.
- ✅ Rollback always has a deterministic outcome (full undo / soft undo / manual cleanup).
- ✅ Audit log captures every call.
- ✅ Tenant isolation is enforced before any POS call leaves the service.
