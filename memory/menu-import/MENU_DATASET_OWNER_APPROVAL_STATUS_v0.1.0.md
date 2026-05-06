# MyGenie POS · Menu Import — Dataset Owner Approval Status v0.1.0

**Dataset version:** `v0.1.0-PROPOSED`
**Status:** **PROPOSED — NOT FROZEN**
**Maintained by:** Phase 0C Dataset Deliverables Reconstruction Agent + owner
**Linked docs:**
- `MENU_DATASET_INVENTORY_v0.1.0_PROPOSED.md`
- `MENU_DATASET_QUALITY_REPORT_v0.1.0.md`
- `MENU_GOLDEN_DATASET_SPLIT_v0.1.0_PROPOSED.md`
- `MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json`
- `MENU_DATASET_REVIEWER_HANDOFF_SUNIL_v0.1.0.md`
- `PHASE_0_DECISION_LOG.md`

---

## 1. Headline

| Field | Value |
|---|---|
| `dataset_version` | `v0.1.0-PROPOSED` |
| `frozen_at` | `null` |
| `human_review_status` | `HUMAN_REVIEW_REQUIRED` |
| Total files found | 33 |
| Accepted (non-duplicate, supported) | 32 |
| Duplicates flagged | 1 (`Makhna_menu.pdf` in batch-04 ≡ batch-07) |
| 30-menu target | ✅ **MET** (32 ≥ 30) |
| Image-format coverage | ❌ none — deferred to v0.1.1 |
| Primary reviewer | **Sunil** (closed in `PHASE_0_DECISION_LOG.md` H-4) |
| Second reviewer | ⬜ **PENDING NOMINATION** (not waived) |

---

## 2. Gate board

The dataset moves from PROPOSED → FROZEN only when **all** gates below are green and the owner issues an explicit freeze command.

| ID | Gate | Status | Owner / Actor | Notes |
|----|------|--------|---------------|-------|
| **G1** | Dataset PDFs present on disk | ✅ DONE | agent | 33 files at `/app/datasets/menus_raw/v0.1.0-PROPOSED/` |
| **G2** | Inventory created | ✅ DONE | agent | `MENU_DATASET_INVENTORY_v0.1.0_PROPOSED.md` |
| **G3** | Quality report created | ✅ DONE | agent | `MENU_DATASET_QUALITY_REPORT_v0.1.0.md` |
| **G4** | Golden split proposed | ✅ DONE | agent | `MENU_GOLDEN_DATASET_SPLIT_v0.1.0_PROPOSED.md` |
| **G5** | Expected-output placeholders created | ✅ DONE | agent | `MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json` (32 entries) |
| **G6** | Owner approves the proposed split | ⬜ **PENDING** | owner | paste `"v0.1.0 split approved as proposed"` (or with amendments) in chat |
| **G7** | Sunil completes expected-output review | ⬜ **PENDING** | Sunil | fills `expected_pages[]` per template rules; see reviewer handoff doc |
| **G8** | Second reviewer assigned **or** waiver recorded | ⬜ **PENDING** | owner | recommended for Phase 1 Golden + Stress; capture decision in `PHASE_0_DECISION_LOG.md` |
| **G9** | Owner issues freeze command | ⬜ **PENDING** | owner | trigger phrase: `"freeze v0.1.0 dataset — all gates green"` |
| **G10** | Agent freeze action executed | ⬜ **PENDING** | agent | rename `…/v0.1.0-PROPOSED/` → `…/v0.1.0/`; set `frozen_at` on all expected-output entries; mark `human_review_status = approved`; write `PHASE_0C_COMPLETION_REPORT_v0.1.0.md` |

### Gate progression rule
- G1–G5 (agent gates) are **all closed**. No more agent-only work is required to reach G9.
- G6 must close **before** G7 begins (Sunil should not start filling expected outputs against an unapproved split).
- G7 and G8 may run **in parallel** once G6 is green.
- G9 is the **owner trigger**. The agent does not freeze without G9.
- G10 is **idempotent and reversible**: until the owner accepts the freeze report, the agent will keep the freeze action as a single atomic commit that can be reverted with one `git revert`.

---

## 3. Concerns / open items raised by the agent

1. **Image-format coverage gap.** The corpus is 100% PDF. `IMAGE_CLEAR_MENU` / `IMAGE_POOR_QUALITY_MENU` set classifications are not represented in v0.1.0. Recommendation: defer image coverage to v0.1.1 (a follow-up dataset version), unless the owner instructs otherwise.
2. **Text-layer probe not run.** `pdftotext` / `pdfinfo` are not installed in the dataset-prep environment. Sunil therefore cannot rely on a pre-marked `PDF_TEXT_MENU` vs `PDF_SCANNED_MENU` field; he should mark this per file during his review, or the owner can install `poppler-utils` so a follow-up agent can probe each file.
3. **Variant / add-on detection** could not be performed (requires reading content). The Phase 2 Parking Set is currently empty. Sunil populates it during his review.
4. **Stratification confidence is LOW** for SIMPLE / MEDIUM / COMPLEX axis (size buckets only). Sunil should confirm or amend complexity per file.
5. **Leaked GCP service-account key** (`bug-intake@…`, key id `ad8c4a3857158b4aa34be710f862ea4f221a42b1`) — recorded as Sev-1 in `PHASE_0_DECISION_LOG.md §2`. Revocation status **cannot be verified** from the workspace. Independent of the dataset freeze, but required as security hygiene before any future Drive-based ingestion (v0.1.1+).

---

## 4. What "freeze" means (operational definition)

When the owner sends G9, the agent will:

1. Verify all G1–G8 are green.
2. **Atomically** rename:
   - `/app/datasets/menus_raw/v0.1.0-PROPOSED/` → `/app/datasets/menus_raw/v0.1.0/`
3. **Atomically** edit `MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json`:
   - rename to `MENU_EXPECTED_OUTPUT_v0.1.0.json` (drop `_PLACEHOLDERS`)
   - set every `instance_metadata.frozen_at` to the freeze timestamp
   - set `human_review_status = "approved"`
   - set `human_verified_by = "Sunil"` and `human_verified_at` per Sunil's own timestamps
   - copy second-reviewer / waiver into `second_reviewer` / notes
4. Update `MENU_GOLDEN_DATASET_SPLIT_v0.1.0_PROPOSED.md` → `MENU_GOLDEN_DATASET_SPLIT_v0.1.0.md` (drop `_PROPOSED`).
5. Update `MENU_DATASET_INVENTORY_v0.1.0_PROPOSED.md` → `MENU_DATASET_INVENTORY_v0.1.0.md`.
6. Write `PHASE_0C_COMPLETION_REPORT_v0.1.0.md` summarizing counts, reviewer signoffs, anomalies (per `MENU_DATASET_AGENT_HANDOFF.md` Step 9).
7. Mark this gate-board file with `frozen_at` and lock it as immutable for `dataset_version = v0.1.0`.

> **Critical:** No file content is mutated; only metadata + folder name. The original PDFs are untouched.

---

## 5. What "freeze" does NOT do

- ❌ Does not start Build Phase 1 or Build Phase 2.
- ❌ Does not create database schemas / migrations.
- ❌ Does not call Gemini.
- ❌ Does not deploy.
- ❌ Does not push to upstream git (a separate decision; this workspace has no remote).

Build Phase 1 is unblocked **independently** by closure of `PRODUCTION_GRADE_OWNER_DECISION_SHEET.md` Gates 1–7.
Build Phase 2 is unblocked when **both** the dataset is frozen here **and** Build Phase 1 has shipped.

---

## 6. Owner action queue (in order)

1. **Approve the split** (close G6) — paste the trigger phrase, or amend.
2. **Nominate or waive second reviewer** (close G8) — and ensure the decision is captured in `PHASE_0_DECISION_LOG.md`.
3. **Trigger Sunil's review** (G7 begins) — share `MENU_DATASET_REVIEWER_HANDOFF_SUNIL_v0.1.0.md` with Sunil; provide him filesystem read access to the PDFs.
4. **Confirm leaked-key revocation** (independent security item).
5. **When G7 + G8 close, send the freeze command** (G9) — agent executes G10.

— END —
