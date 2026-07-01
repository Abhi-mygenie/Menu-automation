# MyGenie POS — Gemini Menu Extraction Playbook (Phase 0B)

**Document version:** 1.0
**Status:** Draft — production planning. **No code. No Gemini calls. No menu files processed.**
**Phase:** 0B — Gemini Integration Playbook.
**Source of SDK/model info:** `integration_playbook_expert_v2` returned the verified Emergent integration playbook for Gemini 3 Pro + Gemini 3 Flash (Node.js request scope → Emergent library is Python; see §16 stack decision).
**Audience:** Backend engineers (Build Phase 2), SRE, Finance, Product.

---

## 1. Executive Recommendation

- **Primary model:** `gemini-3.1-pro-preview` (a.k.a. "Gemini 3 Pro") for menu extraction accuracy.
- **Fast lane / fallback model:** `gemini-3-flash-preview` (a.k.a. "Gemini 3 Flash") for small menus, retries on Pro 429, and low-cost re-runs.
- **Backup alternative (if preview models show instability):** `gemini-2.5-pro` (marked "recommended" in current Emergent playbook) with `gemini-2.5-flash` as fallback. Owner decision at Phase 0B close.
- **Access path:** **`emergentintegrations` Python library + Emergent Universal Key (`EMERGENT_LLM_KEY`)** as Phase 1 default. This covers all three providers (OpenAI/Anthropic/Gemini) with a single key and is already provisioned in the Emergent platform.
- **Stack implication (IMPORTANT — see §16):** The Emergent integration library is Python. The planning pack assumed Node.js/NestJS. Phase 0B surfaces this as a new **owner decision** (**D-7**):
  - **Path A (recommended for speed to pilot):** Implement AI Extraction Service as a **Python microservice** using `emergentintegrations` + `EMERGENT_LLM_KEY`. Rest of the service stays Node.js if desired, or switch the whole service to Python.
  - **Path B:** Keep Node.js/NestJS and use the **Google Gen AI Node SDK** (`@google/genai`) directly. Requires owner's own Gemini API key and standalone cost accounting; does **not** use Emergent Universal Key.
- **Structured JSON:** Enforce via a strict response schema + prompt contract (§5, §7). The JSON schema file lives at `/app/memory/menu-import/GEMINI_MENU_EXTRACTION_JSON_SCHEMA.json`.
- **Hallucination control:** Prompt forbids invention, schema rejects extra fields, every row must carry `raw_text`, and UI shows source crop at review time.

**D-1 status:** **CLOSED** for model selection + SDK path (with the Path A/B decision surfaced as **D-7**).
**D-6 status:** **PARTIALLY CLOSED** — concrete per-restaurant monthly cap value requires Finance sign-off; this playbook proposes a tiered default.

---

## 2. SDK / Package Recommendation

### 2.1 Path A (RECOMMENDED DEFAULT) — Python + `emergentintegrations`

- **Package:** `emergentintegrations` (pre-installed in Emergent environment; install via `pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/` if missing).
- **Core classes:** `LlmChat`, `UserMessage`, `ImageContent`, `FileContentWithMimeType`.
- **Model selection pattern:**
  ```
  chat.with_model("gemini", "gemini-3.1-pro-preview")
  chat.with_model("gemini", "gemini-3-flash-preview")
  ```
- **Session isolation rule (from playbook):** "Always create a new instance of LlmChat for each chat session." In our use this means **one fresh `LlmChat` per page (or per batch of pages) per import** — state never crosses imports or tenants.
- **Env setup:** `EMERGENT_LLM_KEY` read from environment (`python-dotenv` `load_dotenv()` before access). **Never hard-code.** **Never commit.**
- **Image + PDF attachments:**
  - Use `FileContentWithMimeType(file_path=..., mime_type=...)` when the file exists in controlled storage (this is the Gemini-native path, supports images and PDFs directly).
  - Use `ImageContent(image_base64=...)` only when file paths are not available (e.g., in-memory streams).
- **MIME rules (from playbook safety block):** accept only `image/jpeg`, `image/png`, `image/webp`; PDFs handled via `application/pdf`. Re-detect MIME **after** preprocessing (post-deskew/contrast). Transcode HEIC / other formats to JPEG or PNG before calling Gemini.

### 2.2 Path B (alternative) — Node.js + `@google/genai`

- If owner decides to keep the service Node.js, use the official Google Gen AI Node SDK.
- **SDK (subject to owner confirmation at Phase 0B close):** `@google/genai` (Node.js). Exact major-version pin **TODO — to be confirmed** alongside the model string check at implementation time.
- **Requires owner-provided Gemini API key** (not the Emergent Universal Key).
- **Vision input:** via `Part.fromBytes(bytes, mimeType)` (base64) or via `File` upload API for large files. Supports PDF directly (subject to page cap; see §4).
- **Structured output mode:** `generationConfig.responseMimeType = "application/json"` + `generationConfig.responseSchema = ...`.
- **Cost:** standalone billing against owner's Google Cloud project; Finance tracks separately (no shared Emergent meter).

### 2.3 Why Path A is the default

1. **Universal Key** eliminates the need to procure + rotate a separate Gemini API key for pilot.
2. `emergentintegrations` is **already installed** in the environment; no pip/npm friction.
3. Swap to Anthropic Claude / OpenAI GPT via `chat.with_model(...)` if we ever want a second opinion.
4. The current `/app/backend/` is FastAPI (Python) — a Python AI extraction module integrates without language bridging.
5. Switching to Path B later is possible if needs change (cost, latency, feature).

---

## 3. Required Environment Variables

| Variable | Purpose | Default |
|---|---|---|
| `EMERGENT_LLM_KEY` | Universal key for Gemini/OpenAI/Anthropic via `emergentintegrations` (Path A) | set by Emergent platform; **never** committed |
| `GEMINI_API_KEY` | Owner's Gemini API key (Path B only) | — |
| `MENU_EXTRACT_PRIMARY_MODEL` | Primary Gemini model string | `gemini-3.1-pro-preview` (or `gemini-2.5-pro` — owner choice) |
| `MENU_EXTRACT_FALLBACK_MODEL` | Fast / fallback model | `gemini-3-flash-preview` (or `gemini-2.5-flash`) |
| `MENU_EXTRACT_AUTO_FALLBACK` | Enable Pro→Flash auto-fallback on 429/quota | `true` |
| `MENU_EXTRACT_MAX_RETRIES` | JSON-schema validation retry limit | `2` |
| `MENU_EXTRACT_TIMEOUT_SECONDS` | Per-page model call timeout | `60` |
| `MENU_EXTRACT_PER_FILE_TOKEN_CAP` | Hard cap on tokens per file | `500000` |
| `MENU_EXTRACT_PER_RESTAURANT_MONTHLY_CAP_USD` | Cost cap per restaurant per month | owner decision (see §11; default proposal `25`) |
| `MENU_EXTRACT_COST_WARN_THRESHOLD_PCT` | % of monthly cap that triggers warning | `70` |
| `MENU_EXTRACT_PROMPT_VERSION` | Version pin of the prompt template | `extract-v1` |
| `MENU_EXTRACT_JSON_SCHEMA_VERSION` | Version pin of the JSON schema file | `gemini-extract-schema-v1` |
| `MENU_EXTRACT_PREPROCESSING_VERSION` | Version pin of the preprocessing pipeline | `pp-1.2.0` |
| `MENU_EXTRACT_NORMALIZER_VERSION` | Version pin of the normalizer | `norm-1.4.0` |

Env variable names only. **No values committed.** All real values live in Secrets Manager / mounted secrets / platform-provided env.

---

## 4. File Input Strategy

### 4.1 Per-file decision tree (decided by preprocessing worker, not Gemini)

```
Uploaded file
├── application/pdf
│   ├── Text layer present (selectable text ≥ X chars per page)
│   │   → Path: PDF_TEXT_MENU
│   │   → Pass PDF directly to Gemini with vision + OCR grounding prompt
│   │     (Gemini handles both text and layout extraction natively)
│   │   → Preserve page_number; extract per page
│   │
│   └── Scanned (no/low text layer)
│       → Path: PDF_SCANNED_MENU
│       → Rasterize PDF → one image per page (DPI 250, configurable)
│       → Deskew / rotate / contrast each page image
│       → Pass each page image to Gemini
│
└── image/*
    ├── Clear
    │   → Pass to Gemini directly after orientation correction
    └── Poor quality (tilted/blurry/low-contrast)
        → Preprocess: rotate/deskew/contrast/sharpen
        → Pass the enhanced image (not the original)
```

### 4.2 Decisions

1. **Selectable-text PDFs:** Gemini receives the PDF directly; we do **not** pre-extract text ourselves. Reason: the model's layout understanding is better than naive text extraction when menus use tabular / multi-column layouts. The text-layer detection is used only to **choose model strategy**, not to substitute extraction.
2. **Scanned PDFs:** we rasterize page-by-page to control DPI + orientation. Rasterization outputs are stored in staging (`menu_import_pages.image_url`) and passed by file path via `FileContentWithMimeType(mime_type="image/png")`.
3. **Poor-quality images:** preprocessing is mandatory before Gemini call (deskew, contrast). This is the Preprocessing Service's job (already in architecture doc); Gemini always receives a "best-we-can-do" image.
4. **Multi-column menus:** do **not** slice columns in preprocessing. Gemini handles columns natively; slicing can lose context and duplicate rows. Warnings are surfaced post-extraction (`multi_column_confusion`) if the model signals uncertainty.
5. **Page references:** the preprocessing pipeline assigns `page_number` deterministically (1-based) and records it on `menu_import_pages`. The extract worker passes `page_number` + `source_file` + `import_id` in the prompt context so the model response is grounded to the correct source.
6. **PDF page cap for direct submission:** Per published Gemini guidance, direct PDF upload is bounded (typically ≤ 1000 pages or the model's file-size limit). Our `MENU_DATASET_MAX_FILE_SIZE_MB=25` keeps us well under that. **TODO — confirm current hard cap** at Build Phase 2 kickoff; rasterize-by-page path is the universal fallback.

### 4.3 Single API shape across file types

Whatever the file, the extract worker calls Gemini with:
- `system_message` = versioned menu extraction system prompt (§5).
- `user_message.text` = per-page context header (see prompt template).
- `user_message.file_contents` = one `FileContentWithMimeType` per page image (or one PDF when text-layer path).

This keeps the call surface uniform and the retry logic simple.

---

## 5. Prompt Strategy (summary — full template in `GEMINI_MENU_EXTRACTION_PROMPT_TEMPLATE.md`)

**System prompt (versioned `extract-v1`) instructs Gemini:**

1. Extract **only visible content**. No invention. No "typical menu item" guesses.
2. Preserve **raw_text** verbatim from the source for each row.
3. Identify **category headings** by layout + typography; if none detected, assign `Uncategorized` and warn `category_inferred`.
4. Identify **item names** as the lexical item associated with a price.
5. Identify **rates / prices** as decimal numbers. If no price → `rate: null` + warn `missing_price`.
6. If multiple prices appear next to one item (variants) → emit a single row with `rate: null` and `variant_warning: true`, do NOT split into children in Phase 1.
7. If extras / add-ons detected (`+ Cheese 20`, `Extra ...`) → emit one row with `addon_warning: true`; do NOT split in Phase 1.
8. Detect tax / GST / service / packaging notes; add one entry per detected note in `menu_notes[]` with `tax_note_warning: true` on the corresponding menu-level note. **Never auto-apply** any tax.
9. Default currency = `INR` when prices look Indian and no explicit currency is seen.
10. If the page is unreadable or empty, return `rows: []` and warn `empty_page`.
11. Confidence = `high` / `medium` / `low` based on clarity of source, price readability, and category grounding.
12. **Output strict JSON only**. No markdown. No prose. No commentary. Any non-JSON response is a failure.

**User prompt** per call carries: `page_number`, `source_file`, `import_id`, and file attachment(s).

**No tenant identifier** is included in the prompt (cross-tenant isolation: learning rules are applied server-side after response).

---

## 6. Structured JSON Output Strategy

### 6.1 Shape

```jsonc
{
  "import_id": "",
  "source_file": "",
  "model_metadata": {
    "model_name": "",                 // e.g., "gemini-3.1-pro-preview"
    "sdk_version": "",                // emergentintegrations version or @google/genai version
    "prompt_version": "",             // "extract-v1"
    "json_schema_version": "",        // "gemini-extract-schema-v1"
    "preprocessing_version": "",      // "pp-1.2.0"
    "normalizer_version": ""          // "norm-1.4.0"
  },
  "pages": [
    {
      "page_number": 1,
      "rows": [
        {
          "row_no": 1,
          "category": "",
          "item_name": "",
          "rate": null,
          "currency": "INR",
          "raw_text": "",
          "confidence": "high|medium|low",
          "issue_status": "clean|review_required|flagged_only_phase1",
          "source_grounded": true,
          "source_bbox": null,
          "variant_warning": false,
          "addon_warning": false,
          "tax_note_warning": false,
          "notes": ""
        }
      ],
      "menu_notes": [
        {
          "note_text": "",
          "note_type": "tax_note|service_charge_note|packaging_note|addon_note|availability_note|general_note",
          "tax_note_warning": false,
          "confidence": "high|medium|low"
        }
      ]
    }
  ],
  "warnings": [],
  "extraction_summary": {
    "total_rows": 0,
    "rows_with_missing_price": 0,
    "rows_with_variant_warning": 0,
    "rows_with_addon_warning": 0,
    "menu_notes_detected": 0,
    "pages_extracted": 0,
    "pages_empty": 0
  }
}
```

### 6.2 Hard rules

- **Output JSON only.** Any `text/markdown`/`text/plain` wrapper constitutes failure (retry with stricter prompt).
- `additionalProperties: false` on every object (see schema file §3).
- `rate` must be `null` OR `number ≥ 0`. Strings are rejected.
- `raw_text` is **required** and non-empty for every row (per FR-13 hallucination control). A row with empty `raw_text` is rejected at the validator (see §8).
- `source_grounded` is `true` iff `raw_text` present AND bbox or page grounding maintained.
- `variant_warning`, `addon_warning`, `tax_note_warning` are boolean flags **only** in Phase 1. Variant/add-on **children** are out-of-scope for Phase 1 output (Phase 2 releases that expansion; schema `$defs` includes placeholders so Phase 2 is additive without a breaking bump).
- `issue_status`: `clean` (passes all checks), `review_required` (any warning/low confidence), `flagged_only_phase1` (variant/add-on/tax-note flag, content not extracted in Phase 1).

### 6.3 How enforcement is wired

- **Prompt** states "output JSON only" + pastes the minimal schema example.
- **SDK response mode**: when using `@google/genai` (Path B) we set `responseMimeType=application/json` and `responseSchema=...`. When using `emergentintegrations` (Path A), we rely on prompt contract + post-call Ajv (Python: `jsonschema`) validation (the library does not currently expose a first-class `responseSchema`; equivalent strictness is enforced server-side). **TODO — re-check** at implementation time whether newer `emergentintegrations` versions expose structured-output parameters; if so, use them.
- **Post-call validation** (always, regardless of Path): run the response through `GEMINI_MENU_EXTRACTION_JSON_SCHEMA.json` with strict mode. On failure → retry per §7.

---

## 7. Validation + Retry Strategy

### 7.1 Validation pipeline (per page)

1. **Envelope check:** non-empty response, parses as JSON.
2. **Schema check:** validates against `GEMINI_MENU_EXTRACTION_JSON_SCHEMA.json` (strict, `additionalProperties:false`).
3. **Required fields:** `import_id`, `source_file`, `model_metadata.model_name`, `pages[].page_number`, `pages[].rows[].raw_text`, `pages[].rows[].confidence`.
4. **Numeric rate validation:** `rate` is null OR `>= 0` AND `<= 1,000,000`.
5. **Source grounding validation:** for every row, `raw_text` is non-empty; if `source_grounded=true`, `raw_text` must be present.
6. **Hallucination check:** flag rows whose `item_name` has zero token overlap with `raw_text` (after normalization); such rows are quarantined with warning `no_source_grounding` and cannot be auto-approved downstream.
7. **Duplicate detection:** rows within the same page with identical `(normalize(item_name), category_norm, rate)` are merged before persistence; warning `duplicate_possible` applied to the survivor.
8. **Missing-price handling:** rows with `rate: null` must carry `issue_status: review_required` and either `variant_warning` or `missing_price`.
9. **Multi-price / variant flagging:** the prompt guarantees single-row-with-flag; the validator double-checks no row has numeric `rate` while its `raw_text` contains multiple price tokens — if so, force `variant_warning: true` and re-mark `issue_status: flagged_only_phase1`.
10. **Empty extraction:** `pages[i].rows` empty is allowed only if `warnings` contains `empty_page` for that page.
11. **Low-confidence threshold:** any row with `confidence: low` is automatically `review_required`.

### 7.2 Retry rules

| Failure | Action |
|---|---|
| Non-JSON / markdown wrapper | Retry (up to `MENU_EXTRACT_MAX_RETRIES=2`) with a stricter system prompt variant (`extract-v1-strict`). |
| Schema validation fail | Retry with the same model + stricter prompt (add: "Previous response violated schema: {reason}. Output JSON only."). |
| Required field missing | Same as schema fail. |
| Empty array (no rows) with no `empty_page` warning | Retry with a nudge: "Re-inspect the page; list every item visible with raw_text grounding." |
| Model 429 / quota | Exp. backoff (1s, 4s, 16s). After 3 backoffs, fallback to `MENU_EXTRACT_FALLBACK_MODEL` (Pro→Flash). Still failing after fallback → page `failed`. |
| Model 5xx | Exp. backoff; same fallback chain. |
| Timeout (>`MENU_EXTRACT_TIMEOUT_SECONDS`) | Abort call; retry once; then fallback to Flash. |
| All rows `confidence=low` | Do not retry; surface the whole page as `review_required` so the user can manually verify. |
| Cost cap exceeded | Do **not** retry. Mark page `failed` with `COST_CAP_EXCEEDED`. Admin override can reopen. |

### 7.3 When to escalate

- Retry with **same model** (Pro) first: invalid JSON, missing fields, empty rows.
- **Fallback to Flash** on: rate limit / quota / timeout on Pro, and when `auto_fallback=true`.
- **Fail to manual review** on: schema still invalid after max retries, all pages failed, model refusal.
- **Mark extraction partial** when: some pages extracted, others `failed` — extraction still progresses to review UI; user handles failed pages via manual override.

---

## 8. Hallucination Control (production-grade)

Five defenses, layered:

1. **Prompt** — explicit "do not invent" rule; rule 11 forces every row to include its `raw_text`.
2. **Response schema** — `additionalProperties: false`, `raw_text: required`, `source_grounded: required`.
3. **Post-call validator** — zero-token-overlap check flags suspect rows with `no_source_grounding`.
4. **Runtime warning** — rows with `no_source_grounding` cannot be auto-approved downstream.
5. **UI** — Source Provenance Pane shows the source crop (per `MENU_IMPORT_MVP_REVIEW_UI_SPEC.md §19`) so the human reviewer catches anything the automated defenses missed.

Aggregate metric: `menu_import_hallucination_warnings_total` — spikes page SRE (Sev-2); sustained > 2% of rows triggers release block.

---

## 9. Cost Control Strategy (summary — full detail in `GEMINI_COST_CONTROL_AND_VERSIONING_SPEC.md`)

- Per-restaurant monthly USD cap (env `MENU_EXTRACT_PER_RESTAURANT_MONTHLY_CAP_USD`; default proposal: **USD 25 per restaurant per month** for pilot, tiered by plan post-pilot).
- Per-file token cap (`MENU_EXTRACT_PER_FILE_TOKEN_CAP=500000`). Files over the cap route automatically to Flash (if `force_flash=true`) or are rejected at upload with `COST_CAP_EXCEEDED` (actionable error).
- Per-import cost recorded on `menu_imports.cost_usd` + per-page cost on `menu_import_pages` (new field).
- Warning at 70% of cap (email / dashboard badge). Hard block at 100% (admin can override with audit entry).
- Extracted data retained after cap hit; only **new** extraction calls are blocked. Manual review and sync of already-extracted data continue.

**D-6 status:** **PARTIALLY CLOSED** — proposed default present; Finance must sign off on the exact USD value before Build Phase 2 cutover to prod.

---

## 10. Logging + Versioning Fields

Every Gemini call persists:

- `menu_import_id`, `menu_import_page_id`
- `model_name` (e.g. `gemini-3.1-pro-preview`)
- `sdk_name` + `sdk_version` (e.g. `emergentintegrations==<ver>` or `@google/genai@<ver>`)
- `prompt_version`
- `json_schema_version`
- `preprocessing_version`
- `normalizer_version`
- `tokens_input`, `tokens_output`, `tokens_cached`
- `duration_ms`
- `http_status` / `provider_error_code` (if failure)
- `retry_count`
- `fallback_triggered` (bool)
- `correlation_id`
- `restaurant_id` (denormalized, tenant scope)

These fields land on `menu_imports` (aggregate) and a new `menu_import_model_calls` ledger table (append-only; to be added at Build Phase 1 schema time).

---

## 11. Error Handling (by failure mode)

| Failure mode | Handling |
|---|---|
| Invalid JSON | Retry (stricter prompt, max 2). Then mark page `failed`. |
| Empty extraction | Warn `empty_page`; accept if ≥ 1 page has rows, else mark import `review_required` with manual-override affordance. |
| Poor OCR | Preprocessing re-attempted at higher DPI; if still bad, page `failed` with `ocr_unreadable`. |
| Unreadable image | Page `failed`; user can re-upload or manual override. |
| PDF page failure | Individual page `failed`; other pages continue. Import still progresses. |
| Model refusal / safety block | Log, mark page `failed` with `safety_refusal`. Owner can request admin re-process with revised prompt in very rare cases. |
| Model timeout | Retry once; then Flash fallback; then `failed`. |
| Rate limit | Backoff + Flash fallback. |
| Cost cap exceeded | Reject new extractions with `COST_CAP_EXCEEDED`. Existing data stays. |
| Hallucinated rows | Warning `no_source_grounding`; cannot auto-approve; audited. |
| No source grounding | Same as above — quarantine. |
| Unsupported file | Rejected at upload; never reaches Gemini. |
| Partial extraction | Acceptable; import enters review; user handles failed pages via manual override. |

---

## 12. Security Considerations

1. **Secrets:** `EMERGENT_LLM_KEY` (Path A) or `GEMINI_API_KEY` (Path B) lives only in Secrets Manager / platform env. **Never** in docs, repo, chat, logs.
2. **Credential scoping:** one credential per environment; rotate per Sec policy.
3. **Tenant isolation:** the prompt does **NOT** include `restaurant_id` or restaurant name text. Learning memory is applied server-side after Gemini response. The model receives only the menu image/PDF + page context.
4. **No cross-restaurant leakage:** each `LlmChat` instance is per-import; no session history is shared. `emergentintegrations` rule: "always create a new instance of LlmChat for each chat session" enforced in the worker.
5. **No fine-tuning in Phase 1:** customer menus are **not** used to fine-tune or retrain Gemini. This is a hard product rule (see `MENU_IMPORT_MVP_REQUIREMENTS.md`).
6. **No AI direct live POS write:** Phase 1 live-safety invariant. Only the user-approved `POST /sync` mutates POS.
7. **Human review mandatory.** Enforced structurally in `menu_import_rows.status`.
8. **Audit:** every Gemini call is logged in `menu_import_model_calls` (append-only) + on `menu_import_audit_log` for the user-triggered downstream sync.
9. **Output storage:** raw model responses stored in `menu_import_pages.raw_extraction_payload` (JSONB) for reproducibility + regression debug; retention per `MENU_IMPORT_MVP_DB_SCHEMA.md §9`.
10. **Safety settings:** use the SDK's default safety categories for the `food/menu` context (no sensitive content expected). Log any `safety_refusal`.

---

## 13. Phase 1 Implementation Guidance (for Build Phase 2 engineer — **not implemented yet**)

When Build Phase 2 starts:

1. **Before writing code**, re-invoke `integration_playbook_expert_v2` to confirm current SDK + model strings haven't drifted.
2. Confirm **D-7** (Path A Python vs Path B Node) with owner; the rest of this doc adapts by replacing the client layer.
3. Create the `AIExtractionService` module per architecture §3.7:
   - One `LlmChat` per page per import.
   - Inject `EMERGENT_LLM_KEY` via `os.environ.get('EMERGENT_LLM_KEY')` after `load_dotenv()`.
   - Use `FileContentWithMimeType` for image + PDF inputs.
4. Wire the validator (Ajv-equivalent — Python: `jsonschema`) pointed at `GEMINI_MENU_EXTRACTION_JSON_SCHEMA.json`.
5. Implement the retry/fallback ladder per §7.
6. Persist `menu_import_model_calls` ledger entries per call.
7. Gate Gemini calls behind the cost-cap middleware per §9.
8. Save the mandatory image testing protocol (from `integration_playbook_expert_v2` response) to `/app/image_testing.md` **only when Build Phase 2 begins** and real test files are staged (not during planning).
9. Do NOT enable variant/addon child extraction in Phase 1; only flags.
10. Run the extraction against the **frozen Phase 0C dataset** and measure against the rubric in `MENU_EXTRACTION_EVALUATION_RUBRIC.md`.

---

## 14. What Must NOT Be Implemented Yet

- ❌ No Gemini API call.
- ❌ No reading of real menu files.
- ❌ No prompt iteration on live data.
- ❌ No model selection UI.
- ❌ No cost-cap override UI.
- ❌ No variant/addon child extraction (that is a Phase 2 feature).
- ❌ No fine-tuning pipeline.
- ❌ No writing a production `AIExtractionService` module.
- ❌ No `/app/image_testing.md` yet (planning phase).
- ❌ No model-output storage schema migration yet (the `menu_import_model_calls` additive change happens at Build Phase 1 schema time).

Everything above lands in Build Phase 2 after Phase 0B + Phase 0C close.

---

## 15. Phase 0B — D-1 and D-6 Status

### D-1 (Gemini SDK / model / JSON structured-output)
**Status:** ✅ **CLOSED** (with one new decision surfaced).
- Primary model recommended: `gemini-3.1-pro-preview`.
- Fallback model recommended: `gemini-3-flash-preview`.
- Backup alternative if preview models show instability: `gemini-2.5-pro` + `gemini-2.5-flash`.
- SDK path A: Python `emergentintegrations` + `EMERGENT_LLM_KEY`.
- SDK path B: Node.js `@google/genai` with owner's own API key.
- Structured JSON strategy: prompt contract + strict server-side validation against JSON schema (owner-provided schema file in this pack); native `responseSchema` mode used where SDK exposes it.
- New owner decision **D-7**: Path A (Python) vs Path B (Node). Recommended default: **Path A**.

### D-6 (Per-restaurant monthly cost cap default)
**Status:** 🟡 **PARTIALLY CLOSED**.
- Proposed default: **USD 25 per restaurant per month** for pilot; tiered post-pilot (Free=5, Starter=25, Pro=100 — indicative).
- Hard requirement: Finance sign-off on the exact USD value before Build Phase 2 prod-cutover.
- Enforcement mechanism documented (§9, `GEMINI_COST_CONTROL_AND_VERSIONING_SPEC.md`). Implementation pending.

---

## 16. Stack Decision Surfaced — D-7 (NEW)

**Question:** Python (Path A) vs Node.js (Path B) for the AI Extraction Service.

| Criterion | Path A (Python + `emergentintegrations`) | Path B (Node.js + `@google/genai`) |
|---|---|---|
| SDK maturity in Emergent env | ✅ Pre-installed, Emergent-optimized | Requires external install + key provisioning |
| Key management | ✅ Universal Key already provided | Owner must issue + rotate Gemini key |
| Cost accounting | ✅ Shared Emergent meter | Separate Google Cloud billing |
| Alignment with current `/app/backend/` | ✅ Already FastAPI/Python | Requires Node subsystem alongside Python |
| Alignment with original plan (Node/NestJS) | Deviates | ✅ Matches |
| Cross-provider experimentation | ✅ One-line model swap to Claude/OpenAI | Per-provider SDK wiring |
| Speed to pilot | ✅ Fastest | Slower |

**Recommended default:** **Path A**. The whole `menu-import-service` becomes a Python module (FastAPI + Motor/Mongo or Prisma-for-Python / SQLAlchemy if we honor the Postgres plan). Other services (Review UI, etc.) stay as planned.

**If Path B is chosen**, most of this doc remains valid — only §2 SDK section, structured-output enforcement, and env var `GEMINI_API_KEY` differ.

---

## 17. Cross-References

- JSON schema: `GEMINI_MENU_EXTRACTION_JSON_SCHEMA.json`
- Prompt template: `GEMINI_MENU_EXTRACTION_PROMPT_TEMPLATE.md`
- Cost + versioning: `GEMINI_COST_CONTROL_AND_VERSIONING_SPEC.md`
- Phase readiness: `PHASE_0B_AI_READINESS_SUMMARY.md`
- Evaluation rubric (how we measure accuracy): `MENU_EXTRACTION_EVALUATION_RUBRIC.md`
- Dataset plan (what we measure against): `MENU_DATASET_PREPARATION_PLAN.md`
- Architecture (where this service sits): `MENU_IMPORT_MVP_ARCHITECTURE.md §3.7`
- Requirements (hallucination + cost FRs): `MENU_IMPORT_MVP_REQUIREMENTS.md §FR-13, FR-15`
