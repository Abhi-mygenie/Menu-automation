# G7A Smoke Set Run Report — v0.1.0

> Append-only log of every G7A run against the 5 Smoke Set PDFs.
> Updated by `g7a_bootstrap_smoke.py` operators (manual entry).
> Pre-Gemini runs are recorded as `kind: text_build`. Once the Gemini call is
> wired up, those runs are recorded as `kind: gemini_first_pass`.

---

## Schema of each entry

```yaml
run_id: <ISO-8601 UTC timestamp + short hash>
kind: text_build | gemini_first_pass
schema_version: gemini-extract-schema-v1.x
script_revision: <git short SHA or N/A>
dataset_ids: [MENU-v0.1.0-XXXX, ...]
outcome: pass | partial | fail
halt_reason: <free text> | null
artifacts:
  - <path>
notes: |
  <free text>
```

---

## Run #1 — text_build (initial bootstrap in canonical workspace)

```yaml
run_id: PENDING
kind: text_build
schema_version: gemini-extract-schema-v1.2
script_revision: N/A (not yet committed)
dataset_ids:
  - MENU-v0.1.0-0007
  - MENU-v0.1.0-0013
  - MENU-v0.1.0-0023
  - MENU-v0.1.0-0024
  - MENU-v0.1.0-0025
outcome: NOT YET RUN
halt_reason: awaiting owner approval to execute `--build` after pre-flight
artifacts: []
notes: |
  This file is initialized at the same time the G7A execution layer is
  recreated in the canonical workspace. The previously discussed runs #1–#4
  happened in a different workspace and were not committed to 7-may; their
  outcomes (per ChatGPT thread) were:

    - Run #1: prompt iteration on full PDF/vision payload (not reproducible here).
    - Run #2: schema v1 rejected `category_inferred` row issues — drove the
              v1.1 patch.
    - Run #3: schema v1.1 still rejected page-level `mixed_language_detected`,
              `multi_column_confusion`, etc. attached to pages — drove the
              v1.2 patch (pages[].warnings).
    - Run #4: 0007 hit three upstream 502s on the 13-page full payload;
              0023/0013 produced model output but failed v1.1 validation
              because pages[].warnings was not allowed; 0024/0025 not reached.

  Those four runs are RECORDED HISTORICALLY here for continuity but were not
  observed in the canonical workspace. They are NOT counted as actual G7A
  runs against this branch.
```

---

## Run #2 onward

(append below)
