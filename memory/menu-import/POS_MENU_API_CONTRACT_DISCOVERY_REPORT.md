# MyGenie POS — POS Menu API Contract Discovery Report

**Document version:** 1.0
**Status:** Final (Phase 0 discovery)
**Date:** 2026-01
**Discovery scope:** Codebase under `/app/` (backend + frontend + tests + emergent config + planning docs).
**Method:** Static repository inspection (no runtime calls; no external systems contacted).

---

## 1. Executive Verdict

**No MyGenie POS Menu API exists in this repository.**

The `/app/` codebase is a **fresh full-stack scaffold** (FastAPI + React + MongoDB) containing only a placeholder `Hello World` endpoint and a demo `status_checks` model. There is no menu, category, item, restaurant, outlet, vendor, tenant, cuisine, or POS-related domain code present anywhere in the source tree.

This means:

- **B-1** (POS Menu API exact contract) — **STILL BLOCKED**. No contract is discoverable from this repo.
- **B-2** (delete / archive / rollback support) — **STILL BLOCKED**. No item / category mutation surface exists.
- **B-3** (bulk endpoint availability) — **STILL BLOCKED**. No relevant endpoints to evaluate.
- **B-5** (`cuisine_type` source) — **STILL BLOCKED**. No restaurant / cuisine model exists.
- **B-7** (other sync contract issues) — **PARTIALLY CLOSED**. We can document discovery method + proposed canonical contract that the POS team can validate or revise; specifics remain blocked.

**Recommendation:** Treat the existing MyGenie POS as an **external system** whose contract must be obtained directly from the POS engineering team (or its own repository). This report contains a **proposed canonical contract** (Deliverable 2) and a **defensive sync strategy** (Deliverable 3) that work against worst-case POS API capabilities until that team confirms or revises the contract.

---

## 2. APIs Discovered

### 2.1 Backend endpoints (FastAPI) — full inventory

Source: `/app/backend/server.py`

| Method | Path | Handler | Purpose |
|---|---|---|---|
| GET | `/api/` | `root()` | Returns `{ "message": "Hello World" }` — placeholder |
| POST | `/api/status` | `create_status_check(input)` | Inserts a `status_checks` row with `client_name` |
| GET | `/api/status` | `get_status_checks()` | Lists `status_checks` rows |

**That is the entire backend API surface.** No menu / category / item / restaurant / cuisine / sync / approval / rollback endpoint exists.

### 2.2 Frontend API call sites — full inventory

Source: `/app/frontend/src/App.js`

```js
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const response = await axios.get(`${API}/`);   // Hello World
```

Only one axios call in the entire frontend tree, and it targets the demo `Hello World` route.

### 2.3 Other artifacts

- `/app/backend/requirements.txt` — generic Python deps (FastAPI, Motor, PyJWT, bcrypt, boto3, pandas, emergentintegrations). Nothing POS-specific.
- `/app/frontend/package.json` — generic React + shadcn/ui deps. The "menu" matches in source are shadcn/ui primitives only (`context-menu.jsx`, `dropdown-menu.jsx`, `menubar.jsx`, `navigation-menu.jsx`) — these are UI components, not API clients.
- `/app/.emergent/emergent.yml` — base image config, no POS bindings.
- `/app/backend/.env` — `MONGO_URL`, `DB_NAME=test_database`, `CORS_ORIGINS`. No POS endpoint, no POS JWT issuer, no POS API key.
- `/app/tests/` — empty (only `__init__.py`).
- Git history: 3 commits total (`Initial commit`, two `auto-commit` snapshots). No prior POS code in history.

### 2.4 Stack mismatch with planning pack

The planning pack (per kickoff) targets **Node.js + PostgreSQL** with the existing POS exposing a Menu API. The repo is **FastAPI + MongoDB** with **no POS code**. This is consistent with the planning intent: this `menu-import` module is a separate plug-in service that consumes the POS Menu API; the POS itself lives elsewhere. The mismatch is therefore **not a defect** but **confirms** that POS-side code must be obtained from the POS team's repository, not this one.

---

## 3. API Endpoints Table — Discovered vs. Required

| Required for sync | Discovered in repo? | Evidence | Status |
|---|---|---|---|
| `GET /pos/menu/categories` (list categories) | ❌ Not found | Static grep across `/app/backend/**` returned no matches for `categor` outside shadcn/ui | STILL BLOCKED |
| `POST /pos/menu/categories` (create category) | ❌ Not found | Same | STILL BLOCKED |
| `GET /pos/menu/items` (list items, used for dedup) | ❌ Not found | Same — no `item`-related endpoint | STILL BLOCKED |
| `POST /pos/menu/items` (create item) | ❌ Not found | Same | STILL BLOCKED |
| `PATCH /pos/menu/items/{id}` (update item) | ❌ Not found | Same | STILL BLOCKED |
| `POST /pos/menu/items/{id}/variants` (add variants) | ❌ Not found | Same | STILL BLOCKED |
| `POST /pos/menu/items/{id}/addons` (add add-ons) | ❌ Not found | Same | STILL BLOCKED |
| `DELETE /pos/menu/items/{id}` (rollback) | ❌ Not found | Same | STILL BLOCKED |
| `GET /pos/restaurants/{id}/profile` (cuisine_type) | ❌ Not found | Same — no `restaurant` model | STILL BLOCKED |

The complete list of HTTP routes in this repo: `GET /api/`, `GET /api/status`, `POST /api/status`. None map to POS menu surface.

---

## 4. Request / Response Examples

**No real examples can be provided because no real endpoints exist.** Proposed canonical examples are documented in:

- `/app/memory/menu-import/POS_MENU_API_OPENAPI_DRAFT.yaml` (Deliverable 2) — clearly marked as **proposed**, not discovered. Each section has TODO markers indicating fields the POS team must confirm or replace.

---

## 5. Auth + Tenant Scoping

**Discovered in repo:** None — no JWT verification middleware, no tenant guard, no PyJWT usage in `server.py`. PyJWT is in `requirements.txt` (likely from base image) but is unused.

**Planning-doc assumption (from kickoff Q&A):**
- POS issues JWT (HS256 or RS256, TBD by POS team).
- JWT carries `restaurant_id` and `user_id` claims.
- This module verifies JWT, extracts `restaurant_id`, scopes all queries to it.
- All POS Menu API calls forward the same JWT (or a service token derived from it) plus an `Idempotency-Key` header.

**What POS team must confirm (P0):**
1. Token issuer + signing algorithm (HS256 vs RS256).
2. JWKS / public key endpoint (for RS256).
3. Required claims (`restaurant_id`, `user_id`, `roles`, `scopes`).
4. Required scope to call menu mutating endpoints (e.g., `menu:write`).
5. Whether a service-to-service token is required for the Sync Service or if user JWT is forwarded as-is.
6. Tenant scoping convention: `restaurant_id` vs `vendor_id` vs `outlet_id` vs `merchant_id` — naming and shape.

---

## 6. Category API Details

**Discovered:** None.

**Proposed canonical (in OpenAPI draft):**
- `GET /pos/menu/categories` — list categories (used for sync resolution + dedup-preview).
- `POST /pos/menu/categories` — create category. Idempotent on `(restaurant_id, name)`.
- `PATCH /pos/menu/categories/{id}` — update name / sort order.
- `DELETE /pos/menu/categories/{id}` — optional, for rollback Mode A.

**Required field set (proposed; POS team confirms):**
- `id` (POS-issued, opaque string or BIGINT)
- `restaurant_id` / `vendor_id` / `outlet_id` (per POS convention)
- `name` (string, required)
- `display_order` (integer, optional)
- `is_active` / `archived_at` (for Mode B archive rollback)
- `created_at`, `updated_at`
- `parent_category_id` (if POS supports nested categories; unknown)

---

## 7. Item API Details

**Discovered:** None.

**Proposed canonical:**
- `GET /pos/menu/items?category_id=…` — list items in a category (powers dedup-preview).
- `POST /pos/menu/items` — create item. Idempotent on `(restaurant_id, category_id, name)`.
- `PATCH /pos/menu/items/{id}` — update existing item (used by `update_existing` dedup resolution).
- `DELETE /pos/menu/items/{id}` — optional, for rollback Mode A.

**Required field set (proposed; POS team confirms):**
- `id` (POS-issued)
- `restaurant_id`, `category_id`
- `name` (required)
- `description` (optional)
- `price` / `base_price` (NUMERIC, required when `pricing_type=fixed`)
- `pricing_type` (`fixed | variant_based | weight_based | quantity_based | open_price`) — unknown if POS uses an enum like this
- `unit` (`kg | pc | plate | ...`) — unknown shape
- `food_type` (`veg | non_veg | egg | unknown`) — unknown shape
- `tax_class_id` / `gst_rate` — unknown (any tax fields must NOT be auto-applied by sync)
- `image_url` — unknown if part of payload
- `display_order`
- `is_active` / `archived_at` (Mode B)
- `external_ref` / `import_source` — recommended addition for POS to mark items created via this module
- `created_at`, `updated_at`

**Variant + add-on endpoints (proposed):**
- `POST /pos/menu/items/{id}/variants` — bulk attach variants `[{name, price, is_default}]`.
- `POST /pos/menu/items/{id}/addons` — bulk attach add-ons `[{group_name, name, price}]`.

If POS does not model variants/add-ons as first-class entities, fallback proposed: store variant set inside the item payload itself (POS team must confirm shape).

---

## 8. Update API Details

**Discovered:** None.

**Constraints (regardless of POS shape):**
- This module **only** issues `PATCH` against an item if the user explicitly chose `update_existing` resolution in the dedup-preview UI.
- Default behavior is **never** to mutate an existing POS item.
- Updates carry an `Idempotency-Key` so retries do not re-apply.

---

## 9. Delete / Archive / Rollback Support

**Discovered:** None.

**Three-mode plan** (to be selected by POS team confirmation in Phase 0):

| Mode | POS capability required | Rollback action |
|---|---|---|
| **A — Full Undo** | `DELETE /pos/menu/items/{id}` returning 204 | Walk `rollback_ref`; delete each created item/variant/addon. |
| **B — Soft Undo** | `PATCH /pos/menu/items/{id}` accepting `{ archived: true }` or `{ is_active: false }` | Walk `rollback_ref`; archive each created entity. |
| **C — Manual Cleanup** | None | Rollback returns 501 + a manual cleanup list (entity IDs, names, created_at). |

Until POS confirms, the Sync + Rollback Services are **built to support all three** with the mode chosen at deployment via `ROLLBACK_MODE=A|B|C`.

---

## 10. Bulk Endpoint Support

**Discovered:** None.

**Default plan** (per Phase 0 P-1 default):
- Assume **per-item endpoints with `Idempotency-Key`**.
- If POS later confirms bulk endpoints (e.g., `POST /pos/menu/items/bulk`), the Sync Service can switch to the bulk path behind a config flag without schema rework.
- Throughput target stays achievable per-item: 50 rows × ~200ms = 10s, well under the 30s P95 target for a 100-row sync.

---

## 11. Existing Duplicate Prevention Behavior

**Discovered:** None. POS team must confirm.

**Default plan:**
- Rely on idempotency at our side: `Idempotency-Key = menu-import:{import_id}:row:{row_id}:attempt:{n}`.
- Plus an explicit `dedup-preview` step (Phase 2+) that lists POS items in the target categories so the user can resolve `create_new | update_existing | skip` per row before sync.
- POS team must clarify: does the POS Menu API enforce uniqueness on `(restaurant_id, category_id, name)`? If yes, our second-call retries become safe; if no, dedup-preview is the only line of defense.

---

## 12. `cuisine_type` Source

**Discovered:** None. No restaurant model in this repo.

**Default plan (from Open Questions P0-4 / B-5):**
- Ideal: POS restaurant profile has `cuisine_type` (string or enum). Confirm with POS.
- If absent: capture it via a one-time onboarding question in this module (frontend) and persist on the **POS** restaurant profile via a dedicated POS endpoint, OR (fallback) on a local `restaurant_overrides` table in `menu_import.*` keyed by `restaurant_id`.
- This is required to enable cuisine-scope learning in Phase 2; not strictly required for Phase 1 (which only uses restaurant-scope learning).

---

## 13. Current Call Sites in Frontend / Backend

**Frontend (`/app/frontend/src/`):**
- One axios call: `axios.get('${API}/')` in `App.js:12`. Targets demo `Hello World`.
- No menu / category / item / sync flow exists.

**Backend (`/app/backend/`):**
- Three handlers in `server.py` (root + status × 2). No POS Menu calls outbound, no POS Menu endpoints inbound.

**No call sites to migrate, refactor, or align with.** When this `menu-import` module is implemented, it will introduce its own client wrapper around the POS Menu API and its own endpoints — **independent** of any existing app code.

---

## 14. Gaps + Uncertainties

| # | Gap | Why it matters | Action |
|---|---|---|---|
| 14.1 | POS Menu API contract is entirely unknown in this repo | Sync, dedup, rollback all depend on it | Engage POS engineering team; obtain OpenAPI / Postman / source of truth |
| 14.2 | POS JWT issuer / claims unknown | Auth Guard cannot be implemented faithfully | POS team confirmation |
| 14.3 | Tenant key naming (`restaurant_id` vs `vendor_id` vs `outlet_id`) unknown | Multi-tenant scoping consistency | POS team confirmation |
| 14.4 | Item / category data shape unknown | Sync payload mapping is provisional | POS team confirmation |
| 14.5 | Delete / archive support unknown | Rollback mode (A/B/C) selection | POS team confirmation |
| 14.6 | Bulk endpoints unknown | Sync throughput design | POS team confirmation (low risk; sequential default works) |
| 14.7 | Tax / GST shape unknown | Phase 2+ tax-note mapping (we never auto-apply) | POS team confirmation |
| 14.8 | Image upload flow unknown | Phase 3+ (item photos) | Defer |
| 14.9 | Variant / add-on first-class vs nested unknown | Phase 2 variant/addon sync | POS team confirmation |
| 14.10 | Idempotency header support unknown | Retry semantics | POS team confirmation; if unsupported we add a server-side retry-dedup wrapper |
| 14.11 | Rate limits on POS Menu API unknown | Sync worker concurrency | POS team confirmation |
| 14.12 | `cuisine_type` source unknown | Phase 2 cuisine learning | POS team confirmation |

---

## 15. Recommended Safe POS Sync Strategy for AI Menu Import

Until POS contract is confirmed, the **defensive defaults** below let us continue with planning + foundation work and pivot once the contract arrives. Full rationale in `POS_MENU_IMPORT_SYNC_STRATEGY.md` (Deliverable 3).

1. **Sync mode: sequential per-row, configurable to bulk** — assume per-row writes with `Idempotency-Key`; bulk path is a switchable optimization once POS confirms it.
2. **Rollback mode: C by default, upgradable to B then A** — `ROLLBACK_MODE` env var; Rollback Service ships supporting all three.
3. **Dedup: mandatory dedup-preview before sync (Phase 2+)** — sync API returns `DEDUP_PREVIEW_REQUIRED` if not run.
4. **Idempotency: composite key `menu-import:{import_id}:row:{row_id}:attempt:{n}`** plus a server-side `menu_import_idempotency_keys` table to deduplicate replays even if POS doesn't honor the header.
5. **External-ref capture: `synced_external_ref` JSONB on each row** to keep mapping tolerant of POS using BIGINT, UUID, or string ids.
6. **No live mutation pre-approval** — only `POST /{id}/sync` (and `/rollback`) call POS; all other endpoints are staging-only.
7. **Contract tests** — once POS contract arrives, contract tests run on every PR (Pact-style) so drift is detected immediately.
8. **Mock POS** — for local dev + CI, a contract-faithful mock implements the proposed OpenAPI; integration tests run against it; production tests run against real POS staging.

---

## 16. Evidence Searched (for traceability)

The following searches were performed against `/app/` (excluding `node_modules`, `.git`, `__pycache__`, and shadcn/ui primitives):

- `grep -rEi "menu|categor|item|product|sku|recipe|ingredient|outlet|vendor|tenant|cuisine|restaurant|merchant|store|food|tax|gst" --include="*.py,*.js,*.jsx,*.ts,*.tsx,*.md,*.yaml,*.yml"` → 0 matches outside shadcn/ui.
- `grep -rEn "@(api_router|app|router)\.(get|post|put|patch|delete)"` → 3 hits, all in `server.py` for `/api/` and `/api/status`.
- `grep -rEn "axios\.(get|post|put|patch|delete)|fetch\("` → 1 hit (`App.js` Hello World).
- `grep -rEi "pos[_ /-]?menu|pos[_ /-]?api|sync|draft|approve|rollback|idempotency|bulk"` → 0 POS-related hits in code.
- `git -C /app log --oneline -n 20` → 3 commits (Initial commit + two auto-commits).
- `find /app -type f \( -name "*.py" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/__pycache__/*" ! -path "*/components/ui/*"` → 7 files, none POS-related.

**Conclusion:** the POS Menu API is **not present in this repository**. Discovery must continue in the POS team's repository or via a contract-sharing meeting with the POS engineering team.

---

## 17. Recommended Next Step

1. Engage the **POS engineering team** to obtain the existing Menu API contract (OpenAPI / Postman / source-of-truth). Until this is in hand, B-1 / B-2 / B-3 / B-5 / B-7 remain **STILL BLOCKED**.
2. The **proposed canonical contract** (Deliverable 2) is the starting artifact for that conversation; the POS team confirms or revises field-by-field.
3. The **defensive sync strategy** (Deliverable 3) lets backend foundation (Build Phase 1) start in parallel, since the foundation work (schema, storage, auth scaffold, upload, import batch) does not require knowing the POS Menu API yet.

Backend foundation (Build Phase 1) **can start** if the owner accepts the defensive defaults; **Phase 6 (POS Menu Sync)** **cannot start** until the contract is confirmed.
