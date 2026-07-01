# /app/scripts

Bootstrap and operational scripts for the MyGenie AI Menu Import System.

## Contents

| File | Purpose |
|---|---|
| `g7a_bootstrap_smoke.py` | G7A Smoke Set AI-assisted bootstrap (text + OCR pipeline, per-page chunking, NO Gemini call). |
| `_g7a_staging/` | Build artifacts from `g7a_bootstrap_smoke.py --build`. Regenerable; not committed. |

## Quick reference

```bash
# Pre-flight (read-only validation; no extraction, no Gemini)
python3 /app/scripts/g7a_bootstrap_smoke.py --preflight

# Text + OCR extraction for all 5 Smoke Set PDFs (no Gemini)
python3 /app/scripts/g7a_bootstrap_smoke.py --build

# Same, restricted to one Smoke ID
python3 /app/scripts/g7a_bootstrap_smoke.py --build --dataset-id MENU-v0.1.0-0025
```

For full operator instructions see:
- `/app/memory/menu-import/SMOKE_SET_AI_BOOTSTRAP_RUNBOOK_v0.1.0.md`
- `/app/memory/menu-import/AI_ASSISTED_G7_ACTIVE_PLAN_v0.1.0.md`
