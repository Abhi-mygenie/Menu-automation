# MyGenie POS — Phase 0B — AI Readiness Summary

**Document version:** 1.0
**Status:** Final (Phase 0B planning). **No code. No Gemini calls.**
**Pack location:** `/app/memory/menu-import/`

---

## 1. AI / Gemini Readiness Verdict

**Phase 0B is substantively complete for planning purposes.** SDK, model strings, JSON schema, prompt template, retry ladder, cost control, versioning, security, and failure handling are documented at production-grade detail. Two residual items need owner closure before Build Phase 2 begins, and one new decision (stack path) has surfaced.

| Area | Status |
|---|---|
| SDK + model strings | ✅ Closed (Emergent library + Gemini 3 Pro/Flash preview, with 2.5 Pro/Flash backup alternative) |
| Structured JSON schema | ✅ Closed (`GEMINI_MENU_EXTRACTION_JSON_SCHEMA.json`) |
| Prompt template | ✅ Closed (`GEMINI_MENU_EXTRACTION_PROMPT_TEMPLATE.md` version `extract-v1`) |
| Retry + fallback strategy | ✅ Closed |
| Hallucination control | ✅ Closed (prompt + schema + validator + UI provenance layered) |
| Cost control strategy | ✅ Closed on mechanism; 🟡 USD value for cap pending Finance |
| Versioning | ✅ Closed (new `menu_import_model_calls` ledger + pricing table specified) |
| Security | ✅ Closed (no tenant id in prompt, no fine-tune, key handling strict) |
| Stack path (Python vs Node) | 🟡 New decision **D-7** surfaced; default Path A (Python + Emergent library) |
| Safety settings / policy defaults | ✅ Closed (default SDK settings for food/menu; refusal is logged) |

---

## 2. D-1 Status — Gemini SDK / Model / JSON Structured Output

**CLOSED** (with one new decision surfaced as D-7).

- **Primary model:** `gemini-3.1-pro-preview`.
- **Fast / fallback model:** `gemini-3-flash-preview`.
- **Backup alternative if preview models are unstable in pilot:** `gemini-2.5-pro` + `gemini-2.5-flash`.
- **SDK (Path A — recommended default):** `emergentintegrations` (Python) + Emergent Universal Key `EMERGENT_LLM_KEY`. Pre-installed in Emergent environment; covers all three providers with one key.
- **SDK (Path B — alternative):** `@google/genai` (Node.js) with owner's own `GEMINI_API_KEY`. Keeps the Node/NestJS plan intact but loses the Universal Key benefit.
- **Structured JSON enforcement:**
  - Prompt contract (JSON only, no markdown, no prose).
  - Versioned response schema at `GEMINI_MENU_EXTRACTION_JSON_SCHEMA.json` with `additionalProperties:false`, required `raw_text` on every row, and conditional rules enforcing that variant/addon flags imply `rate=null` + `issue_status=flagged_only_phase1`.
  - Post-call server-side validation via `jsonschema` (Python) / `ajv` (Node).
  - Native `responseSchema` when SDK exposes it (Path B); prompt-contract + validator when SDK does not (Path A today).
- **Hallucination control:** five-layer defense (prompt ← schema ← validator ← runtime warning ← UI source-crop pane).

### New decision surfaced — D-7 (Stack path)

Python (Path A, recommended) vs Node.js (Path B). Owner decides before Build Phase 2.

---

## 3. D-6 Status — Per-Restaurant Monthly Cost Cap

**PARTIALLY CLOSED** — mechanism fully specified; numeric USD value needs Finance sign-off.

- **Enforcement:** pre-call gate in `AIExtractionService`; hard block at 100% with `COST_CAP_EXCEEDED`. Warning at 70%, escalation at 90%. Already-extracted data remains usable after cap hit; only new Gemini calls are blocked. Admin override with audited reason available.
- **Pilot default proposed:** **USD 25 / restaurant / month**.
- **Post-pilot tiers proposed (indicative):** Free 5 / Starter 25 / Pro 100 / Enterprise negotiated. Finance finalizes.
- **Companion knobs closed:** per-file token cap (500k), per-page token cap (60k), warn threshold (70%), alert threshold (90%), auto-fallback Pro→Flash (enabled), Flash-first-for-mature-restaurants flag.
- **Pricing table:** new `menu_import_model_pricing` DB table (rates editable by admin, not retroactively applied to past cost records). Exact rate values to be populated at Build Phase 2 kickoff from provider documentation.

---

## 4. Remaining Blockers

| Blocker | Area | Status |
|---|---|---|
| **D-1** SDK/model choice | AI | ✅ Closed |
| **D-6** USD cap value | Cost | 🟡 Finance sign-off pending |
| **D-7** Stack Path A (Python) vs Path B (Node) | Architecture | 🟡 New — owner decision required before Build Phase 2 |
| Exact Gemini token rates per model | Cost | 🟡 Confirm at Build Phase 2 kickoff; populate `menu_import_model_pricing` |
| Preview-model stability validation | AI | ⏳ Will be validated during Build Phase 2 against the frozen Phase 0C dataset; if preview shows issues, swap to `gemini-2.5-pro`/`gemini-2.5-flash` |

**Dependencies on other phases:**

- **Phase 0A (POS)** — unaffected by 0B; POS Sync still blocked independently.
- **Phase 0C (Dataset)** — 0B and 0C are parallel gates on Build Phase 2. Extraction cannot be evaluated without frozen Phase 0C expected outputs.

---

## 5. Required Owner Decisions (added to `PRODUCTION_GRADE_OWNER_DECISION_SHEET.md`)

1. **D-6 value:** confirm USD cap for pilot restaurants (recommended `25`).
2. **D-7 stack path:** Path A (Python + Emergent) or Path B (Node + Google Gen AI). Recommended: Path A.
3. **Preview vs 2.5 models:** accept preview-first strategy with 2.5 fallback, or require 2.5-first for pilot (conservative).
4. **Model-pricing seed values:** authorize Backend Foundation agent to populate `menu_import_model_pricing` at Build Phase 2 kickoff using provider published rates at that time.

---

## 6. Can Build Phase 2 Start from the AI Side?

**YES — from the AI side, pending these two items:**

1. Owner closes D-6 value (target: pilot cap `25 USD`).
2. Owner closes D-7 stack path (target: Path A).

**NO — overall Build Phase 2 remains gated by Phase 0C.** Extraction cannot be evaluated (and therefore cannot be released) without:
- Frozen Phase 0C dataset (`dataset_version v0.1.0`, 30 menus inventoried + classified).
- Human-reviewed expected outputs for Smoke + Phase 1 Golden + Stress + Learning Memory sets.

**Summary:**

| Dependency | Blocks Build Phase 2? |
|---|---|
| Phase 0B Gemini Playbook (D-1) | ✅ Closed |
| Phase 0B cost cap (D-6) | 🟡 Partial — owner decision required |
| Phase 0B stack path (D-7) | 🟡 New — owner decision required |
| Phase 0C dataset frozen | 🔴 Blocks |

---

## 7. What Still Depends on Phase 0C

Before Build Phase 2 can declare the AI Extraction Service "production-ready," the following must exist:

- Phase 0C inventoried + classified dataset (≥ 30 menus per `MENU_DATASET_PREPARATION_PLAN.md`).
- Frozen `*.expected.json` ground truth files.
- Accuracy regression targets hit on Phase 1 Golden + Stress sets per `MENU_EXTRACTION_EVALUATION_RUBRIC.md`.
- Hallucination rate = 0 across all sets.
- Source-grounded rows ≥ 95%.
- Correction-memory reuse accuracy ≥ 0.85 on Learning Memory Set.

Without Phase 0C, Build Phase 2 can produce an extractor but cannot prove it meets production thresholds.

---

## 8. Deliverables Produced in Phase 0B

| File | Purpose |
|---|---|
| `GEMINI_MENU_EXTRACTION_PLAYBOOK.md` | Master playbook — SDK, models, file strategy, prompt strategy, validation, retry, cost, security, versioning |
| `GEMINI_MENU_EXTRACTION_JSON_SCHEMA.json` | Strict response schema (versioned `gemini-extract-schema-v1`) |
| `GEMINI_MENU_EXTRACTION_PROMPT_TEMPLATE.md` | Versioned prompt template (`extract-v1` + `extract-v1-strict`) |
| `GEMINI_COST_CONTROL_AND_VERSIONING_SPEC.md` | Cost axes, caps, pricing table, versioning bump rules |
| `PHASE_0B_AI_READINESS_SUMMARY.md` | This summary |

Existing docs updated (minimally):
- `MENU_IMPORT_MVP_OPEN_QUESTIONS.md` — D-1 marked CLOSED; D-6 marked PARTIALLY CLOSED; D-7 added.
- `PRODUCTION_GRADE_APPROVAL_SUMMARY.md` — Phase 0B section updated.

---

## 9. Recommended Next Agent

Two parallel tracks from here:

1. **Owner** — close D-6 (USD value), D-7 (stack path), D-1 preview-vs-2.5 preference in `PRODUCTION_GRADE_OWNER_DECISION_SHEET.md`.
2. **Menu Dataset Preparation Agent** (Phase 0C) — run per the handoff in `MENU_DATASET_AGENT_HANDOFF.md` once owner closes H-1..H-5.

**Then** (sequentially after both close and Gates 1–7 approved):
3. **Backend Foundation Implementation Agent** — Build Phase 1 (schema, storage, auth scaffold, upload, import batch).
4. **Backend Implementation Agent (AI Extraction Service)** — Build Phase 2, using this playbook as the authoritative reference.

Until owner decisions close, **do not begin Build Phase 2**. Build Phase 1 is independent and can start as soon as owner approves Gates 1–7.

---

## 10. Final Note

Phase 0B closed the AI-side planning. Phase 0A remains partially blocked on POS-team confirmation of the Menu API contract (affects Build Phase 6 only). Phase 0C remains on the owner's desk for dataset decisions (affects Build Phase 2 evaluation).

The production invariants are preserved: AI is **assistive, not authoritative**; human review is mandatory; no fine-tuning of the model with customer menus; no direct live POS writes; tenant isolation is strict; every extraction is versioned and auditable; cost is bounded; hallucinations are defended in five layers.
