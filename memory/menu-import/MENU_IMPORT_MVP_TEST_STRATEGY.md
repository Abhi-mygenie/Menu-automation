# MyGenie POS — Production-Grade AI Menu Import System — Test Strategy

**Document version:** 2.0 (production-grade revision)
**Status:** Draft
**Positioning:** Tests are gates on **production releases**. Every phase has defined test gates. Tenant isolation, file security, and rollback tests are treated as Sev-1 concerns.

---

## 1. Goals

- Prove the pipeline is **safe** (no live menu corruption, fully auditable).
- Prove **accuracy targets** are met on a hold-out set the engineering team has never seen.
- Prove **regression-resistance**: prompt/model/normalizer/preprocessing version bumps don't silently degrade quality.
- Prove **operability**: failures are visible, retries work, partial sync is recoverable.

---

## 2. Test Pyramid

```
                ┌──────────────────────┐
                │  Pilot restaurants   │   real, low volume, monitored
                ├──────────────────────┤
                │  Hold-out 10 menus   │   final exam, agent never sees these
                ├──────────────────────┤
                │ Test set 20 menus    │   regression, run on every change
                ├──────────────────────┤
                │ Calibration 70 menus │   prompt/normalizer tuning
                ├──────────────────────┤
                │ Integration smoke    │   upload→extract→review per stack
                ├──────────────────────┤
                │ Unit tests           │   parser, normalizer, validator, repos
                └──────────────────────┘
```

---

## 3. Dataset Strategy

**Source:** Real restaurant menus supplied by the owner via a Google Drive folder shared read-only with a service account. Full ingest specification: `GOOGLE_DRIVE_DATASET_INGESTION_SPEC.md`. End-to-end dataset plan: `MENU_DATASET_PREPARATION_PLAN.md`. Per-menu expected output template: `MENU_EXPECTED_OUTPUT_TEMPLATE.json`. Grading rubric: `MENU_EXTRACTION_EVALUATION_RUBRIC.md`.

**Phase placement:** Dataset preparation is **Phase 0C**, executed before Build Phase 2 (Extraction). Build Phase 2 cannot start with a faithful evaluation until 0C closes.

### 3.1 Layout

```
/app/datasets/menus_raw/{dataset_version}/{drive_file_id}/{file_name}     (pre-prod)
s3://{MENU_DATASET_S3_BUCKET}/{dataset_version}/{drive_file_id}/{file_name}  (prod)

expected_outputs/{dataset_id}.expected.json    (per-menu, human-filled, frozen)
menu_import_dataset_manifest                   (PostgreSQL — see DB schema §3.15)
dataset_split_proposal_{dataset_version}.csv  (set memberships)
```

### 3.2 Dataset categories (classification taxonomy)

Each menu can carry multiple categories. Source-of-truth is `MENU_DATASET_PREPARATION_PLAN.md §9`:

`SIMPLE_MENU` · `MEDIUM_MENU` · `COMPLEX_MENU` · `VARIANT_MENU` · `ADDON_MENU` · `PDF_TEXT_MENU` · `PDF_SCANNED_MENU` · `IMAGE_CLEAR_MENU` · `IMAGE_POOR_QUALITY_MENU` · `TAX_NOTE_MENU` · `REGIONAL_INDIAN_MENU` · `EDGE_CASE_MENU`.

### 3.3 Recommended initial dataset size (Phase 0C exit)

30 menus minimum:
- 10 simple menus
- 10 medium menus
- 5 complex menus
- 5 variant / add-on menus (Phase 2 Parking — flagging only in Phase 1)

### 3.4 Set memberships (a menu may belong to multiple)

| Set | Approx. count | Role |
|---|---|---|
| **Smoke Set** | ~5 | PR-time fast checks; tight thresholds |
| **Phase 1 Golden Set** | ~20 | PR + nightly accuracy regression on category / item / rate / source-grounding |
| **Stress Set** | ~20 | Nightly + monthly on hard cases (scanned, poor-quality, tax-note) |
| **Learning Memory Set** | ~10 | Validate the correction-memory loop (spelling, category, price-pattern, missing-price) |
| **Phase 2 Parking Set** | ~5–10 | Variant / add-on heavy menus — Phase 1 only requires flagging, not full extraction |
| **Hold-out** | (subset, frozen) | Run only by release manager. Engineering team must not iterate on hold-out feedback. |

The 70 / 20 / 10 calibration / test / hold-out split previously used in this doc is **superseded** by the set-membership model above. Calibration data lives in `Phase 1 Golden + Stress + Learning Memory` collectively; test data is the same sets at PR-time; hold-out is a frozen subset for release-time evaluation.

### 3.5 Expected output (ground truth) shape

Every menu in Smoke / Phase 1 Golden / Stress / Learning Memory sets has a paired `*.expected.json` filled by **two human reviewers** (third resolves disagreements). The schema is in `MENU_EXPECTED_OUTPUT_TEMPLATE.json`. Reviewer rules (no inventing rows, exact spelling post-normalization, raw-text reference required, etc.) live inside the template's `rules_for_reviewer` block.

**Phase 2 Parking Set** menus have expected outputs filled for **flagging fields only** in Phase 1; the variant/add-on detail block is stored under `phase2_only_detail` and is **not graded** in Phase 1.

### 3.6 Dataset versioning

- Each ingest run produces a `dataset_version` stamp.
- Frozen golden datasets reference `(dataset_id, dataset_version)`.
- Changing an expected output requires cutting a new `dataset_version`.

---

## 4. Test Layers

### 4.1 Unit Tests (Vitest)

- `normalizer.spec.ts` — currency stripping, unit detection, food-type mapping, title-casing, learning rule application order.
- `validation.spec.ts` — required fields, price bounds, enum membership.
- `confidence.spec.ts` — re-computation formula, blocking warnings.
- `repository.spec.ts` — RLS / tenant filter (smoke), optimistic concurrency.
- `parser.spec.ts` — Ajv schema validates Extraction JSON Contract; rejects unknown fields.
- `learning.spec.ts` — promotion thresholds (3 restaurants for cuisine; 10 + 3 cuisines for global; admin gate).

Coverage target: **≥ 85%** for `normalizer`, `validation`, `learning`, `confidence` modules. Other modules ≥ 70%.

### 4.2 Integration Smoke (Vitest + Supertest)

Runs against a real Postgres (testcontainers) + Redis + a **mock Gemini client** that replays canned responses keyed by `(file_hash, prompt_version)`.

Scenarios:
- Upload → preprocess (synchronous in test mode) → extract (mock) → normalize → review API returns rows.
- PATCH row → correction inserted, learning rule upserted.
- Approve all clean → only rows above 0.85 with no blocking warnings approved.
- Sync (mock POS Menu API) → success path produces audit log + external refs.
- Sync partial failure → row goes `sync_failed`; retry succeeds.
- Concurrency: two PATCH calls with same version → one 200, one 409.
- Idempotency: duplicate upload by same `(restaurant_id, file_hash)` → returns existing import id.

### 4.3 Accuracy Regression — 20 test menus (run on every PR)

A nightly + on-PR job:
1. For each test menu: run upload → extraction with **current prompt/model/normalizer/preprocessing version**.
2. Compare extracted output vs `gold.json`.
3. Compute metrics (§6).
4. **Fail PR** if any metric drops > 2 percentage points vs the last green run.

Mock vs real model:
- Default: **real Gemini calls** (cost capped at ~$5 per CI run).
- A `STUB=true` mode replays cached responses for fast CI on PRs that don't touch prompts/normalizer/extractor (changes detected by file path).

### 4.4 Hold-out Validation — 10 menus (at MVP exit + monthly)

- Operated **manually or via a controlled job** by a release manager.
- Engineering team must not iterate on prompts/normalizer using hold-out feedback.
- A failure on hold-out blocks the release.

### 4.5 Production Shadow — pilot restaurants

After launch, the first 5 pilot restaurants run normally; metrics aggregated daily. Acceptance signal: manual correction rate trending down across 4 consecutive imports.

### 4.6 End-to-end Browser Tests (Playwright, P1)

Critical user journey:
1. Login → Upload menu → wait for processing.
2. Edit 3 rows, approve a variant, mark a menu note as ignored.
3. Approve all clean → confirm sync preview → confirm sync.
4. Verify audit log shows the sync.
5. Verify (mocked) POS Menu API received the expected payloads.

Tagged `@smoke` and run on staging deploys.

---

## 5. Test Environments

| Env | Purpose | DB | Storage | Gemini | POS Menu API |
|---|---|---|---|---|---|
| local | dev | local PG | local FS | real (rate-limited) or stub | stub server |
| ci | PR + nightly | testcontainers PG | tmp FS | stub by default; real on `accuracy` job | stub server (contract-tested) |
| staging | manual + e2e | managed PG | S3 (staging bucket) | real | staging POS |
| pre-prod | pilot dry-run | managed PG | local disk (per requirement) | real | pre-prod POS |
| prod | live | managed PG | S3 | real | prod POS |

---

## 6. Accuracy Metrics + Definitions

All metrics computed against gold labels.

| Metric | Definition | MVP Target |
|---|---|---|
| `item_name_accuracy` | exact match after lowercase + whitespace normalization | ≥ 85% (holdout) |
| `item_name_fuzzy_accuracy` | Levenshtein ratio ≥ 0.9 against gold | ≥ 92% (holdout) |
| `price_accuracy` | exact match on numeric base price (or all-variant set) | ≥ 90% (holdout) |
| `category_accuracy` | exact match against gold canonical category | ≥ 75% (holdout) |
| `subcategory_accuracy` | exact match | report only |
| `food_type_accuracy` | exact enum match (`unknown` excluded from denominator) | ≥ 90% (holdout) |
| `variant_recall` | `|extracted ∩ gold| / |gold|` per item with variants | ≥ 70% (test) |
| `variant_precision` | `|extracted ∩ gold| / |extracted|` per item with variants | ≥ 80% (test) |
| `addon_recall` | analogous | ≥ 60% (test) |
| `addon_precision` | analogous | ≥ 75% (test) |
| `menu_note_recall` | extracted notes that match gold notes | ≥ 70% (test) |
| `duplicate_detection_accuracy` | % of gold-merge cases identified by AI as `duplicate_possible` | report only |
| `manual_correction_rate` | rows the user edited / rows total | ≤ 25% (pilot) |
| `rows_auto_approved_percentage` | rows approved by `approve-all-clean` / rows total | ≥ 40% (pilot) |
| `avg_confidence_score` | mean `confidence_score` across approved rows | report |
| `time_to_approve_50_items` | wall-clock from open-review to sync-confirm on a 50-item menu | ≤ 8 minutes (pilot) |

Operational metrics:
- p50/p95/p99 extract latency per page.
- Token + cost per import.
- Sync success rate.
- Sync rollback success rate (P1).

---

## 7. Test Reporting

- All test runs emit a JSON report into `/app/test_reports/`.
- The accuracy regression job persists historical results to a small Postgres table or JSON-on-S3 for trend charts.
- Dashboard: "accuracy over time" with vertical bands marking version bumps (prompt, model, normalizer, preprocessing).

---

## 8. Versioned Reproducibility

A "reproduce extraction X on file Y" tooling:
- Given an old import row, fetch its raw_extraction_payload + page image + the prompt/model versions stored on the import.
- Re-run with the **same** versions to confirm idempotency.
- Diff against current versions to debug regressions.

---

## 9. Test Data Hygiene

- All menus in datasets are anonymized (restaurant names redacted).
- Real pilot menus are **never** committed to the repo.
- Pre-prod / local datasets live on local disk; prod test data lives in S3 with restricted access.
- Gold labels are subject to peer review before merge.

---

## 10. Manual QA Checklists

### 10.1 Pre-release (pre-prod)
- [ ] Upload + process succeeds on each `format` (5).
- [ ] Multi-page (≥ 6 pages) succeeds.
- [ ] Failed page surfaces in UI; remaining pages still extract.
- [ ] Variant detection works on at least 2 variant-heavy menus.
- [ ] Add-on detection works on at least 2 add-on-heavy menus.
- [ ] Tax note detection on at least 2 menus that mention GST.
- [ ] Bulk approve-all-clean honors the 0.85 + blocking-warning rule.
- [ ] PATCH writes `menu_import_corrections` and updates restaurant memory.
- [ ] Sync to POS Menu (mock or staging) creates expected entities + audit log.
- [ ] Idempotency: re-trigger sync — no duplicates created.
- [ ] Rollback (P1) deletes synced items.
- [ ] No dark-on-dark / light-on-light contrast issues.

### 10.2 Pilot exit
- [ ] 5 pilot restaurants completed ≥ 1 import each.
- [ ] Manual correction rate ≤ 25% across pilots.
- [ ] No P0 incidents.
- [ ] Sync success rate ≥ 99%.

---

## 11. Negative / Adversarial Tests

- Empty PDF.
- 30-page PDF (limit boundary).
- 31-page PDF (over limit) — expect `413` or `422`.
- File pretending to be a PDF (mismatched magic bytes) — expect `415`.
- Very low-quality phone photo (motion blur).
- Menu with mixed languages + handwritten section.
- All-image PDF (text rendered as images) — extraction must still work via vision.
- File with same `sha256` as an existing import.
- Concurrent upload + edit by two users — second edit returns 409.
- POS Menu API returning 5xx → row goes `sync_failed`, audit log records error.
- Gemini returning malformed JSON twice → page marked `failed`.

---

## 12. Performance Tests (P1)

- Load: 100 concurrent uploads of 5-page menus → confirm queue depth, worker autoscale, and DB are healthy.
- p95 latency under load < 2× baseline.
- 24h soak test: 500 imports/day with mocked Gemini → no memory leaks, no growing queue depth.

---

## 13. Test Tooling Summary

| Concern | Tool |
|---|---|
| Unit + integration | Vitest + Supertest |
| HTTP mocks | nock |
| Postgres | testcontainers-node |
| Redis | testcontainers-node |
| Gemini stub | local fixture replay (keyed by file_hash + prompt_version) |
| POS Menu API stub | wiremock or pretender |
| E2E browser | Playwright |
| Accuracy reports | small Node CLI: `pnpm dataset:eval --bucket=test` |
| Coverage | `c8` |

---

## 14. Exit Criteria for Phase 1 Production Release

1. All unit + integration tests green on `main`.
2. Accuracy regression on 20 test menus ≥ targets in §6.
3. Hold-out validation on 10 menus ≥ targets in §6 — run by release manager, signed off.
4. Pilot success criteria in §10.2 met.
5. Manual QA checklist completed and archived.
6. Negative-tests suite green.
7. **Tenant isolation test suite green** (see §15).
8. **File security test suite green** (see §16).
9. **Rollback test suite green** (see §17).
10. **Correction-memory reuse tests green** (see §18).
11. **Production smoke tests** pass post-deploy (see §19).

---

## 15. Tenant Isolation Tests (Sev-1 Gate)

A failing tenant isolation test **blocks any release**. Run on every PR.

- Seed two restaurants A and B.
- As user of A, attempt to:
  - `GET /{B.menu_import_id}/rows` → expect 404.
  - `PATCH /rows/{B.row_id}` → expect 404.
  - `POST /{B.menu_import_id}/sync` → expect 404.
  - `GET /{B.menu_import_id}/file` → expect 404.
- Attempt JWT manipulation:
  - Valid JWT of A with `restaurant_id=B` in body → server ignores body claim, still operates as A; no B data leaked.
  - Expired/forged JWT → 401.
- RLS bypass attempts:
  - Direct DB query simulating missing GUC → no rows returned.
- Learning memory:
  - Correction by A never writes to B's restaurant-scope rules.
  - Cuisine rule promoted from A's cuisine applies to B only when B shares cuisine and opt-out is off.

---

## 16. File Security Tests

- Magic byte enforcement: upload `.pdf` containing PNG bytes → reject with `FILE_MAGIC_MISMATCH`.
- SVG-as-PNG: reject.
- Zip-bomb PDF (tiny file, huge uncompressed) → reject at preprocess with size guard.
- PDF with embedded JavaScript → preprocess strips; extract ignores.
- Oversized file (> 25 MB) → 413.
- Overlong-page PDF (> 30 pages) → 413 or 422 with actionable error.
- Virus-scan stub: upload test file matching EICAR signature → reject with `VIRUS_SCAN_FAILED` (when scan hook enabled).
- Signed URL scope: A's signed URL cannot be fetched with B's JWT.
- Signed URL TTL: URL expires after configured window (default 5 min).

---

## 17. Rollback Tests

Tested against a contract-tested mock of the POS Menu API (all three rollback modes).

- **Mode A (Full Undo)**: sync 5 items → rollback → all 5 deleted in POS mock; audit shows 5 deletes; `menu_imports.status=rolled_back`.
- **Mode B (Soft Undo)**: sync 5 → rollback → all 5 archived in POS mock; audit shows 5 archives.
- **Mode C (Manual Cleanup)**: sync 5 → rollback → response includes manual cleanup list; audit records list.
- Partial rollback: 3 of 5 deletes succeed, 2 fail → response shows partial; retry possible.

---

## 18. Correction-Memory Reuse Tests

- Upload menu X → correct `Panner` → `Paneer` on rows 1, 2, 3 → verify `menu_learning_memory` has a restaurant rule with usage_count=3.
- Upload menu Y (same restaurant) with `Panner` in raw_text → verify normalization applied the rule → `item_name` pre-filled as `Paneer`, `applied_memory_ids` non-empty.
- Test: rule is NOT applied to fields the user has already edited in the current session.
- Test: deactivating a rule stops it from being applied on the next import.
- Test: cross-tenant isolation — correction by A never affects B.

---

## 19. Production Smoke Tests (post-deploy, canary)

Run automatically after every prod deploy. A smoke failure triggers rollback.

- `POST /upload` with a 1-page fixture PDF → 201.
- `POST /process` → status transitions to `review_required` within 60s (real Gemini Flash call).
- `GET /rows` returns > 0 rows, all with `raw_text` non-empty.
- `PATCH /rows/{id}` with trivial change → 200, correction event recorded.
- `POST /approve-all` with threshold 0.95 → no blocking errors.
- `POST /sync dry_run=true` → returns preview with no 5xx.
- Metrics scraping endpoint `/metrics` responds.
- Tenant guard metric is zero.
- Alarm pipeline: deliberately trigger test alarm → PagerDuty receives in < 2 min.

Fixtures are committed (no PII); canary restaurant is a dedicated internal tenant.
