# Phase 0 Decision Log + Security Incident Notice

**Date:** 2026-01
**Owner:** Sunil
**Scope:** Records owner decisions provided in chat and the H-2 credential-exposure security incident.

> **No credential contents are recorded in this log or anywhere else under `/app/`. Only the existence of the incident and the required actions are documented.**

---

## 1. Owner Decisions Recorded

| ID | Decision | Status | Notes |
|---|---|---|---|
| **D-6** Cost cap | "Free — it's our own POS product" → no per-restaurant cost cap | ✅ ACCEPTED with safety guardrails (see §3) | Cost-monitoring + alarms remain enabled; defensive ceilings preserved against runaway pathological input |
| **D-7** Stack path | **Path A — Python `emergentintegrations` + `EMERGENT_LLM_KEY`** | ✅ CLOSED | Implementation in Build Phase 2 will be a Python service; aligns with the existing `/app/backend/` FastAPI scaffold |
| **H-1** Google Drive folder ID | Owner pivoted to zip upload (one-time job) | 🟢 **DEFERRED** for Phase 0C (re-open if Phase 2+ needs Drive) | See `ZIP_DATASET_INGESTION_OPTION.md` |
| **H-2** Service account credential | Drive route deferred + leaked key still requires revocation | 🟢 **DEFERRED for Phase 0C**, 🔴 leaked-key revocation **still required as security hygiene** (see §2) | |
| **H-3** Initial dataset size | 30 menus, owner does not pick specific menus — agent picks any 30 from the zip honoring stratification | ✅ CLOSED | Stratification per `MENU_DATASET_PREPARATION_PLAN.md §10` (10/10/5/5 simple/medium/complex/variant-or-addon) |
| **H-4** Human reviewer | **Sunil** is the primary reviewer | ✅ CLOSED | A second internal reviewer for Phase 1 Golden + Stress menus is recommended; owner to nominate |
| **H-5** Storage target | Local / PVC in pre-prod, S3 in production (deferred) | ✅ CLOSED with caveat | S3 path itself parked per G-4 |
| **G-4** S3 region / data residency | "Park Amazon — we'll work on local in Phase 1" | ✅ CLOSED for Phase 1 | All Phase 1 storage uses local PVC; S3 selection (Mumbai `ap-south-1`) deferred to a later phase before prod cutover |
| **H-11 (NEW)** Dataset upload method | Zip-via-chat asset, one-shot | ✅ **CLOSED** | See `ZIP_DATASET_INGESTION_OPTION.md`. Owner trigger phrase: "zip uploaded — proceed with Phase 0C execution" |

---

## 2. Security Incident — H-2 Service Account Credential Exposure

### 2.1 What happened

In chat dated 2026-01, the owner pasted a complete Google Cloud service-account JSON key (including `private_key`) directly into the conversation. The exposed credential identifies:

- Service account email: `bug-intake@voice-bug-intake.iam.gserviceaccount.com`
- Project: `voice-bug-intake`
- Key id: `ad8c4a3857158b4aa34be710f862ea4f221a42b1`
- Client id: `113309924005218535795`

> The actual private key bytes are **not** recorded here. They appear in the chat transcript only.

### 2.2 Severity

**Sev-1** if the conversation transcript is accessible to anyone outside the owner. The `private_key` field of a service-account JSON is sufficient by itself to mint OAuth tokens for that account.

### 2.3 Immediate actions required (owner)

- [ ] **Revoke** the leaked key id (`ad8c4a3857158b4aa34be710f862ea4f221a42b1`) in GCP Console → IAM & Admin → Service Accounts → Keys.
- [ ] **Audit** the past 24 hours of Drive API + IAM activity for the `bug-intake` service account in Cloud Logging.
- [ ] **Create a dedicated read-only service account** for Phase 0C: recommended name `menu-dataset-readonly@<project>.iam.gserviceaccount.com`. Grant only `roles/viewer` (or `drive.readonly` scope where applicable) on the dataset Drive folder.
- [ ] **Generate a fresh key** for the new service account; **mount it as a secret** at `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_PATH`. Do NOT paste it anywhere.
- [ ] **Confirm completion** to the agent ("done"); the agent must not be sent any new key.

### 2.4 Agent posture

- Agent has **not** saved the credential to any file under `/app/`.
- Agent has **not** echoed the credential back.
- Agent has **not** authenticated to Drive (Phase 0 remains planning-only).
- Agent will **not** treat H-2 as closed until owner confirms rotation.

### 2.5 Process improvement

Going forward, all secret material handed off to this module follows the rule:

> **Never paste secrets in chat. Only confirm "credential mounted at `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_PATH`" without revealing contents.**

Any future agent (Menu Dataset Preparation Agent, Backend Foundation Agent, etc.) that receives a secret in chat must:
1. Refuse to save it.
2. Demand revocation + rotation.
3. Record an incident note in this log.

---

## 3. D-6 Reinterpretation — "Free / Own POS Product"

The owner's intent is "no per-restaurant cost cap because the platform itself absorbs the Gemini cost." This is accepted, with **defensive guardrails** retained for production safety:

| Knob | Setting under "free for restaurants" | Reason |
|---|---|---|
| `MENU_EXTRACT_PER_RESTAURANT_MONTHLY_CAP_USD` | **Effectively disabled** (set to a very high ceiling, e.g., `100000`) | Prevents accidental zero-cap bug from blocking all uploads; still bounds pathological abuse |
| `MENU_EXTRACT_PER_FILE_TOKEN_CAP` | **Retained at `500000`** | Defends against zip-bomb / oversized adversarial uploads |
| `MENU_EXTRACT_PER_PAGE_TOKEN_CAP` | **Retained at `60000`** | Same |
| Per-restaurant hourly upload rate limit | **Retained at `10/hour`** | Defends against scripted abuse |
| Cost dashboards + alarms | **Enabled** (platform-level only, not per-restaurant gating) | Owner sees aggregate spend; spikes paged to ops |
| Auto-fallback Pro → Flash on 429 | **Enabled** | Cost-efficient resilience |
| Admin override on cap | **Not needed** for restaurants; admin still holds override on the safety ceilings | |

**Outcome:**
- Restaurants experience the menu-import as **free / cap-less**.
- The platform retains visibility and the ability to detect abuse or runaway cost.
- D-6 status moves from 🟡 Partial → ✅ **CLOSED** with the "free for restaurants" interpretation.

---

## 4. Net Status After This Round

| Item | Status |
|---|---|
| **D-1** Gemini SDK + models | ✅ Closed |
| **D-6** Cost cap (free for restaurants, defensive ceilings retained) | ✅ Closed |
| **D-7** Stack path = Path A (Python + Emergent) | ✅ Closed |
| **G-4** S3 region (parked; local-only Phase 1) | ✅ Closed for Phase 1 |
| **H-1** Drive folder ID | 🟢 Deferred (Drive route superseded by zip-via-chat for Phase 0C) |
| **H-2** Service account credential | 🟢 Deferred for Phase 0C; 🔴 leaked-key revocation **still required** as security hygiene |
| **H-3** Dataset size = 30 (any 30, stratified) | ✅ Closed |
| **H-4** Reviewer = Sunil (primary) | ✅ Closed (second reviewer for Phase 1 Golden + Stress to be nominated) |
| **H-5** Storage = local Phase 1 / S3 deferred | ✅ Closed |
| **H-11 (NEW)** Dataset upload method = zip-via-chat | ✅ Closed |
| **B-1 / B-2 / B-3 / B-5 / B-7** POS contract | 🔴 Still blocked — POS team must confirm |

---

## 5. What Can Start Now

| Build phase | Status |
|---|---|
| **Build Phase 1 — Foundation** | ✅ **CAN START** — owner approval + Gates 1–7 needed; POS-independent + dataset-independent |
| **Phase 0C — Dataset prep execution** | 🟢 Ready to start when owner uploads the zip and says "proceed with Phase 0C execution" |
| **Build Phase 2 — Extraction** | ❌ Blocked on Phase 0C completion (frozen `dataset_version` + Sunil's expected outputs) |
| **Build Phase 6 — POS Sync** | ❌ Parked until POS team confirms contract |


---

## 6. Phase 0C Dataset Deliverables Reconstruction (2026-05)

**Action by:** Phase 0C Dataset Deliverables Reconstruction Agent (doc-only, read-only).

### What changed

- The agent walked `/app/datasets/menus_raw/v0.1.0-PROPOSED/`, hashed every file (SHA-256), detected duplicates, and produced the missing v0.1.0 deliverables:
  - `MENU_DATASET_INVENTORY_v0.1.0_PROPOSED.md`
  - `MENU_DATASET_QUALITY_REPORT_v0.1.0.md`
  - `MENU_GOLDEN_DATASET_SPLIT_v0.1.0_PROPOSED.md`
  - `MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json`
  - `MENU_DATASET_OWNER_APPROVAL_STATUS_v0.1.0.md`
  - `MENU_DATASET_REVIEWER_HANDOFF_SUNIL_v0.1.0.md`
- Headline numbers: 33 PDFs total, 32 unique, 1 duplicate (`Makhna_menu.pdf` in batch-04 ≡ batch-07), 0 image files. **30-menu target met.**

### Decisions confirmed (no change to existing closures)

- **D-7 Stack path** — Path A (Python + `emergentintegrations` + `EMERGENT_LLM_KEY`) confirmed in §1 above; carry-forward.
- **H-3 Dataset size** — 32 accepted ≥ 30 target ✅.
- **H-4 Reviewer = Sunil** — primary reviewer; second reviewer **NOT yet nominated, NOT waived**. Owner action still pending.
- **D-6 Cost cap** — unchanged (free for restaurants + defensive ceilings).
- **H-1 / H-2** — Drive route still deferred; **leaked-key revocation status STILL UNVERIFIED** by this agent (security hygiene action remains on the owner; see §2).

### New items introduced

| ID | Item | Status | Notes |
|---|---|---|---|
| **D-NEW-1** | Image-format coverage in v0.1.0 | 🔴 **GAP** — corpus is 100% PDF | Recommendation: defer to a follow-up `v0.1.1` release; owner to confirm. Tracked in `MENU_DATASET_QUALITY_REPORT_v0.1.0.md §4`. |
| **D-NEW-2** | PDF text-layer probe tooling | 🟡 **OPS gap** | `pdftotext` / `pdfinfo` not installed; Sunil to mark `PDF_TEXT` vs `PDF_SCANNED` per file, OR install `poppler-utils` and re-run inventory. |
| **D-NEW-3** | Owner approval of split (Gate G6) | ⬜ pending | Trigger phrase in `MENU_GOLDEN_DATASET_SPLIT_v0.1.0_PROPOSED.md §10`. |
| **D-NEW-4** | Sunil review (Gate G7) | ⬜ pending | Begins **after** G6 closes. |
| **D-NEW-5** | Owner freeze command (Gate G9) | ⬜ pending | Trigger phrase: `"freeze v0.1.0 dataset — all gates green"`. |

### Build phase impact

| Build phase | Status (post-reconstruction) |
|---|---|
| **Build Phase 1 — Foundation** | ✅ **CAN START** — independent of dataset freeze; awaits owner closing Gates 1–7 in `PRODUCTION_GRADE_OWNER_DECISION_SHEET.md` |
| **Phase 0C — Dataset prep execution** | 🟡 **Plan + deliverables done; freeze NOT done** — awaits Sunil + owner |
| **Build Phase 2 — Extraction** | ❌ **STILL BLOCKED** on Phase 0C freeze + Build Phase 1 ship |
| **Build Phase 6 — POS Sync** | ❌ **STILL PARKED** — POS team contract confirmation independent of this work |

### Security note (carry-forward)

The H-2 leaked service-account key (`bug-intake@voice-bug-intake.iam.gserviceaccount.com`, key id `ad8c4a3857158b4aa34be710f862ea4f221a42b1`) **revocation has not been verified** by this agent. Independent of dataset freeze, but flagged for visibility. No new credential was requested or used.

