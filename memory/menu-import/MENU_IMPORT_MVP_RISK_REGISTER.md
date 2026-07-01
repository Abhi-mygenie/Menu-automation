# MyGenie POS — Production-Grade AI Menu Import System — Risk Register

**Document version:** 2.0 (production-grade revision)
**Status:** Draft
**Positioning:** Production-grade risk posture. Phase 1 is live with real restaurants; Sev-1 items are actively monitored with alarms from day one.
**Severity scale:** Sev-1 (catastrophic) → Sev-4 (low)
**Likelihood:** L1 (rare) → L4 (almost certain)
**Risk score:** Severity × Likelihood (1–16)

---

## 1. Risk Matrix

| ID | Risk | Sev | Likelihood | Score | Owner |
|---|---|---|---|---|---|
| R-01 | AI corrupts live POS menu | 1 | L2 | 8 | Eng |
| R-02 | Wrong price syncs and orders are placed | 1 | L2 | 8 | Eng + Ops |
| R-03 | Cross-tenant leakage of menu / corrections | 1 | L1 | 4 | Eng + Sec |
| R-04 | Global learning corrupted by a single bad correction | 2 | L2 | 6 | Eng |
| R-05 | Gemini outage / quota exhausted | 2 | L3 | 9 | Eng + SRE |
| R-06 | POS Menu API contract drift | 2 | L3 | 9 | Eng + POS team |
| R-07 | Storage misconfig: files leak via signed URL | 1 | L1 | 4 | Sec |
| R-08 | Cost runaway from large/handwritten files | 2 | L2 | 6 | Eng + Finance |
| R-09 | Low accuracy on phone-photo / handwritten menus | 2 | L3 | 9 | Product |
| R-10 | User abandons review (UI too slow / heavy) | 2 | L2 | 6 | Product |
| R-11 | Variant / add-on extraction quality below target | 2 | L3 | 9 | Eng |
| R-12 | Combo extraction wrongly created as multiple items | 3 | L3 | 9 | Eng |
| R-13 | Tax note auto-applied accidentally (forbidden) | 1 | L1 | 4 | Eng |
| R-14 | Idempotency key collision causes duplicate POS entries | 2 | L1 | 2 | Eng |
| R-15 | Concurrent user edits cause data corruption | 2 | L2 | 6 | Eng |
| R-16 | Audit log gap (truncation, async drop) | 2 | L1 | 2 | Eng |
| R-17 | Schema migration breaks staging data mid-flight | 2 | L1 | 2 | Eng |
| R-18 | PII or financial data accidentally sent to Gemini | 2 | L1 | 2 | Sec |
| R-19 | Restaurant retains stale categories from previous AI run | 3 | L2 | 6 | Product |
| R-20 | Dataset leakage (test/holdout used for tuning) | 2 | L2 | 6 | Eng |
| R-21 | AI hallucination — invented items/prices/categories | 1 | L3 | 12 | Eng + Product |
| R-22 | User "rubber-stamp" review — bulk approve without looking | 2 | L3 | 9 | Product |
| R-23 | Duplicate POS item creation | 2 | L3 | 9 | Eng + Product |
| R-24 | Cost runaway from adversarial uploads | 2 | L2 | 6 | Eng + Finance |
| R-25 | Wrong POS category referenced at sync (stale read) | 3 | L2 | 6 | Eng |

---

## 2. Risk Detail + Mitigations

### R-01 — AI corrupts live POS menu
- **Description:** A bug or oversight allows AI extraction to write directly to POS menu master.
- **Mitigations:**
  - Architectural separation: only `sync-worker` calls POS Menu API.
  - Write path requires `row.status = 'approved'` enforced in DB and code.
  - Linter/CI rule: `import { posMenuClient }` allowed only in `sync.worker.ts`.
  - Code review checklist + integration test "extracted but not approved row never reaches POS".
- **Detection:** audit log absence of approval, unexpected POST without approval.
- **Owner:** Eng
- **Status:** open until first integration test green.

### R-02 — Wrong price syncs to live menu
- **Mitigations:**
  - Confidence threshold for auto-approve = 0.85.
  - Blocking warning `price_uncertain` excluded from auto-approve.
  - Validation: `0 < price <= 1,000,000`.
  - Sync preview (dry run) shows totals for human glance check.
  - Rollback API + audit log to recover.
- **Detection:** restaurant complaint, audit log diffs, pilot monitoring on first orders.
- **Owner:** Eng + Ops.

### R-03 — Cross-tenant leakage
- **Mitigations:**
  - `restaurant_id` from JWT only; never from request body.
  - Repository-level enforcement.
  - PostgreSQL RLS with `app.restaurant_id` GUC in prod.
  - Static check: `WHERE restaurant_id =` present in tenant-scoped queries (linted).
- **Detection:** pen-test, fuzz tests on JWT manipulation.
- **Owner:** Eng + Sec.

### R-04 — Global learning corrupted by single correction
- **Mitigations:**
  - Constraint: `chk_global_requires_admin` (DB).
  - Promotion thresholds: ≥ 10 distinct restaurants, ≥ 3 cuisines for global.
  - Admin approval gate.
  - Reversal-budget auto-deactivation.
- **Detection:** spike in reversals, admin review queue.
- **Owner:** Eng.

### R-05 — Gemini outage / quota
- **Mitigations:**
  - Auto-fallback Pro → Flash on 429.
  - Exponential backoff (3 retries) + dead letter to manual ops queue.
  - Pre-prod: stub mode allows continued dev.
  - Rate budget per restaurant + global.
- **Detection:** error rate alarms, 429 metric.
- **Owner:** Eng + SRE.

### R-06 — POS Menu API contract drift
- **Mitigations:**
  - Versioned client; consumer-driven contract tests (Pact-like) against POS team.
  - Mock POS Menu API in CI based on the contract.
  - Backwards-compatible field handling (extra fields ignored, missing fields fall back).
- **Detection:** contract test failures, sync failure spikes.
- **Owner:** Eng + POS team.

### R-07 — Storage signed URL leakage
- **Mitigations:**
  - 5-minute TTL.
  - One-time use (P1) via short-lived presigned + access count.
  - No signed URLs in client logs.
  - S3 bucket policy denying public access.
- **Detection:** S3 access logs, anomaly detection on URL fetches.
- **Owner:** Sec.

### R-08 — Cost runaway
- **Mitigations:**
  - Per-restaurant rate limit (10 uploads/hour MVP).
  - Token + page caps.
  - Cost meter on `menu_imports`; alert when daily cost exceeds threshold.
  - Default to Flash for short menus or experienced restaurants.
- **Detection:** cost dashboard.
- **Owner:** Eng + Finance.

### R-09 — Low accuracy on phone-photos / handwritten
- **Mitigations:**
  - Preprocessing: deskew, contrast, rotation correction.
  - Multi-attempt extraction: stricter prompt on retry.
  - Friendly error: "Try uploading a clearer photo or PDF."
  - Pilot in cuisines/formats where accuracy is highest first.
- **Detection:** accuracy dashboards by `format` bucket.
- **Owner:** Product.

### R-10 — User abandons review
- **Mitigations:**
  - 200-row p95 < 1.5s render.
  - Inline edits with single keypress shortcuts.
  - "Approve all clean" reduces review burden.
  - Save resume — can return later.
  - Tutorial overlays on first import.
- **Detection:** funnel analytics: import created → reviewed → synced.
- **Owner:** Product.

### R-11 — Variant/add-on quality below target
- **Mitigations:**
  - Explicit prompt section + JSON schema for variants/addons.
  - `split-variant` and `convert` actions in UI to fix wrong cases.
  - Learning rules: variant_pattern, addon_pattern.
  - Iterate on prompt v2 if test set falls below target.
- **Detection:** test set accuracy.
- **Owner:** Eng.

### R-12 — Combo wrongly created as multiple items
- **Mitigations:**
  - Combo detection emits `combo_detected` warning by default.
  - User can `Mark as Combo`.
  - In MVP, combos remain single items; do not auto-decompose.
- **Detection:** correction logs with `combo_fix`.
- **Owner:** Eng.

### R-13 — Tax note auto-applied
- **Mitigations:**
  - `mapped_to=tax_setting` only records intent; **never** mutates POS tax.
  - Code path for tax mapping is read-only towards POS.
  - UI banner emphasizes "apply tax in POS settings."
- **Detection:** code review, integration test that tax mapping triggers no external calls.
- **Owner:** Eng.

### R-14 — Idempotency key collisions
- **Mitigations:**
  - Key format: `menu-import:{import_id}:row:{row_id}:attempt:{n}` — globally unique.
  - POS Menu API expected to dedupe on `Idempotency-Key`.
  - On retry, attempt_no increments → new key.
- **Detection:** duplicate item alerts on POS side.
- **Owner:** Eng.

### R-15 — Concurrent edits
- **Mitigations:**
  - Optimistic concurrency via `version` + `If-Match`.
  - 409 on mismatch with current state in response body.
  - UI auto-refresh + conflict toast.
- **Detection:** 409 metrics, user reports.
- **Owner:** Eng.

### R-16 — Audit log gaps
- **Mitigations:**
  - Audit log writes are synchronous in the same transaction as the action.
  - DB `refuse_mutation` trigger prevents updates/deletes.
  - Periodic completeness check job: count audit entries vs sync attempts.
- **Detection:** ratio metric: audit count / sync attempts.
- **Owner:** Eng.

### R-17 — Schema migration mid-flight
- **Mitigations:**
  - Migrations are forward-only.
  - Use additive changes during running imports; backfill in separate job.
  - `CREATE INDEX CONCURRENTLY`.
  - Pause sync workers during major migrations (operational runbook).
- **Detection:** migration test on production-shaped data.
- **Owner:** Eng.

### R-18 — PII to Gemini
- **Mitigations:**
  - Prompt does NOT include `restaurant_id` plaintext.
  - Only the page image is sent.
  - Outbound logging of model requests redacts metadata.
- **Detection:** outgoing payload audit.
- **Owner:** Sec.

### R-19 — Stale categories
- **Mitigations:**
  - Sync resolves categories via `GET /pos/menu/categories` at sync time, not at extract time.
  - User UI shows "category will be created" badge if not existing.
- **Detection:** ad-hoc — count `created_category` actions in audit log.
- **Owner:** Product.

### R-20 — Dataset leakage
- **Mitigations:**
  - Test + Holdout buckets are frozen and reviewed.
  - Engineering team is barred from training/iterating on holdout feedback.
  - CI runs accuracy on **test** bucket; **holdout** is run only by release manager.
- **Detection:** code review + dataset diff alerts.
- **Owner:** Eng.

### R-21 — AI hallucination (invented items / prices / categories)
- **Description:** The model invents menu items, variants, or prices not actually present in the source file.
- **Mitigations:**
  - Prompt contract explicitly forbids invention; instructs "extract only what is visible."
  - JSON schema with `additionalProperties: false`.
  - Every row must carry `raw_text` and `source_bbox`; rows without grounding get warning `no_source_grounding` and cannot be auto-approved.
  - UI shows source crop per row (primary human defense).
  - Hallucination warning metric tracked; spikes alarm.
  - Low-confidence rows are highlighted, never hidden.
- **Detection:** `menu_import_hallucination_warnings_total` metric, pilot feedback, accuracy regression on test set.
- **Owner:** Eng + Product.

### R-22 — User "rubber-stamp" review
- **Description:** User bulk-approves everything without actually reviewing, defeating the core safety model.
- **Mitigations:**
  - "Approve all clean" threshold 0.85 + blocking-warning filter excludes risky rows.
  - Bulk approve > 100 rows requires second-click confirmation.
  - Dashboard tracks `manual_correction_rate` per user; trend to 0 with high volume flags to ops.
  - Onboarding UX emphasizes "The AI can be wrong — please verify prices especially."
- **Detection:** per-user correction-rate trend.
- **Owner:** Product.

### R-23 — Duplicate POS item creation
- **Description:** Items already in the live POS menu are re-created, doubling records.
- **Mitigations:**
  - Dedup-preview API + UI modal (Phase 2).
  - `sync` blocks with `DEDUP_PREVIEW_REQUIRED` until preview is run (Phase 2+).
  - Phase 1 explicitly scoped to new-menu onboarding; existing-menu update workflow ships in Phase 2 with dedup preview mandatory.
  - Audit log captures every create for regression detection.
- **Detection:** POS duplicate rate per restaurant; `menu_import_duplicate_prevented_total`.
- **Owner:** Eng + Product.

### R-24 — Cost runaway from adversarial uploads
- **Description:** Bad actor uploads huge PDFs or triggers repeated re-process to burn Gemini credits.
- **Mitigations:**
  - Per-restaurant monthly cap.
  - Per-file token cap.
  - Hourly upload rate limit.
  - Auto-fallback Pro → Flash.
  - Same-hash dedup returns existing import; `force=true` rate-limited.
- **Detection:** cost dashboard alarms.
- **Owner:** Eng + Finance.

### R-25 — Wrong POS category referenced at sync
- **Description:** Category id resolved at extract time becomes stale by sync time.
- **Mitigations:**
  - Category resolution happens in sync worker at sync time, not at extract time.
  - If resolution fails, row goes `sync_failed` with `CATEGORY_NOT_FOUND`; user resolves.
- **Detection:** sync_failed metric by error code.
- **Owner:** Eng.

---

## 3. Top 5 Watchlist (review weekly)

1. R-21 AI hallucination.
2. R-05 Gemini outage / quota.
3. R-23 Duplicate POS item creation.
4. R-09 Low accuracy on phone-photo / handwritten.
5. R-22 User rubber-stamp review.

---

## 4. Incident Playbook (skeleton)

- **Severity 1**: Data integrity / live menu corruption → rollback the impacted import, freeze the module via feature flag, post-mortem within 48h.
- **Severity 2**: Provider outage / accuracy regression → switch model profile, communicate to pilots, re-run failed imports.
- **Severity 3**: UI regression → hotfix, deploy frontend.
- **Severity 4**: Documentation / cosmetic → next sprint.

Each playbook entry pairs with a runbook in `/docs/runbooks/menu-import/` (created in implementation phase).
