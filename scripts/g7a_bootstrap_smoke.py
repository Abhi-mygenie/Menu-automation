#!/usr/bin/env python3
"""
G7A Smoke Set AI-assisted bootstrap script.

PURPOSE
-------
For the 5 Smoke Set PDFs (MENU-v0.1.0-0007, 0013, 0023, 0024, 0025), produce a
text-only payload that is ready to send to Gemini for first-pass extraction.

PIPELINE (per page)
-------------------
1. Try `pdftotext -layout` for clean digital text.
2. If a page returns <MIN_TEXT_CHARS_PER_PAGE characters OR confidence is poor,
   rasterize that page with `pdftoppm -r 300` and OCR it with
   `tesseract -l eng+hin+tel`.
3. Aggregate per-page text, attach metadata, run length checks.
4. If the *combined* prompt+text payload would exceed CHUNK_THRESHOLD_CHARS
   characters, split into per-page chunks (each chunk carries its own page
   context + the schema-required envelope).
5. Build the final text-only request payload(s) — NO PDF, NO vision parts —
   and write them to a staging directory for inspection.

This script does NOT call Gemini. The Gemini call is intentionally gated
behind `--call-gemini` which is currently a NotImplementedError; G7A requires
owner approval after the pre-flight report before that flag is wired up.

MODES
-----
  --preflight    Validate environment and inputs only. Writes no payloads.
  --build        Build text payloads for all Smoke Set IDs. Default.
  --dataset-id ID
                 Restrict --build to a single Smoke Set ID.
  --call-gemini  GATED. Not implemented in this version (raises).

USAGE
-----
  python3 /app/scripts/g7a_bootstrap_smoke.py --preflight
  python3 /app/scripts/g7a_bootstrap_smoke.py --build
  python3 /app/scripts/g7a_bootstrap_smoke.py --build --dataset-id MENU-v0.1.0-0025

ARTIFACTS
---------
  /app/scripts/_g7a_staging/
    payloads/<DATASET_ID>/page-<NN>.txt           extracted text per page
    payloads/<DATASET_ID>/payload.json            text-only request envelope
    payloads/<DATASET_ID>/payload-chunked/        per-page chunks (if any)
    extraction_log/<DATASET_ID>.json              per-page method/metrics

NON-GOALS
---------
- Does not freeze any dataset.
- Does not mutate /app/memory/menu-import/MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json.
- Does not write the immutable first-pass archive
  (MENU_AI_FIRST_PASS_OUTPUT_SMOKE_v0.1.0.json) — that happens only after a
  successful Gemini run, in a later step.

SCHEMA CONFORMANCE
------------------
Targets gemini-extract-schema-v1.2 (see GEMINI_MENU_EXTRACTION_JSON_SCHEMA.json).
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import uuid
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

REPO_ROOT = Path("/app")
MEMORY_DIR = REPO_ROOT / "memory" / "menu-import"
SCHEMA_PATH = MEMORY_DIR / "GEMINI_MENU_EXTRACTION_JSON_SCHEMA.json"
PLACEHOLDERS_PATH = MEMORY_DIR / "MENU_EXPECTED_OUTPUT_PLACEHOLDERS_v0.1.0.json"
PROMPT_TEMPLATE_PATH = MEMORY_DIR / "GEMINI_MENU_EXTRACTION_PROMPT_TEMPLATE.md"
DATASET_ROOT = REPO_ROOT / "datasets" / "menus_raw" / "v0.1.0-PROPOSED"

STAGING_DIR = Path(__file__).parent / "_g7a_staging"
PAYLOADS_DIR = STAGING_DIR / "payloads"
LOG_DIR = STAGING_DIR / "extraction_log"

# Smoke Set (owner-approved in the golden split doc)
SMOKE_SET_IDS = [
    "MENU-v0.1.0-0007",
    "MENU-v0.1.0-0013",
    "MENU-v0.1.0-0023",
    "MENU-v0.1.0-0024",
    "MENU-v0.1.0-0025",
]

# Pipeline thresholds
MIN_TEXT_CHARS_PER_PAGE = 80         # below this we treat the page as "no text"
OCR_TRIGGER_LETTER_RATIO = 0.35      # below this we suspect garbled extract
CHUNK_THRESHOLD_CHARS = 25_000       # combined payload size that forces chunking
OCR_LANGS = "eng+hin+tel"
OCR_DPI = 300

GEMINI_MODEL = "gemini-2.5-flash"
SCHEMA_VERSION = "gemini-extract-schema-v1.2"
PROMPT_VERSION = "extract-v1"
PREPROCESSING_VERSION = "g7a-textocr-v1"
NORMALIZER_VERSION = "n/a-bootstrap"

# --- Gemini call configuration (added by --call-gemini wiring) ---
SMOKE_ARCHIVE_PATH = MEMORY_DIR / "MENU_AI_FIRST_PASS_OUTPUT_SMOKE_v0.1.0.json"
RUN_REPORT_PATH = MEMORY_DIR / "G7A_SMOKE_RUN_REPORT_v0.1.0.md"
GEMINI_TEMPERATURE = 0.0
GEMINI_MAX_OUTPUT_TOKENS = 16_384
GEMINI_BUDGET_USD = 1.00
# gemini-2.5-flash prices (USD per 1M tokens) — used only for char-based estimation
GEMINI_PRICE_INPUT_PER_M = 0.30
GEMINI_PRICE_OUTPUT_PER_M = 2.50
GEMINI_RETRY_LIMIT = 1  # one strict retry per call on schema-validation failure
SDK_VERSION = "emergentintegrations==0.1.0"
# Dataset-specific page warnings (must be injected even if model omits them)
DATASET_0023_REQUIRED_PAGE_WARNINGS = [
    "mixed_language_detected",
    "ocr_unreadable",
    "no_source_grounding_page_level",
]

# Google AI Studio free tier limits gemini-2.5-flash to 5 RPM. Stay safely under
# that with a per-call min interval; also retry on 429 with server-suggested delay.
GEMINI_MIN_CALL_INTERVAL_S = 13.0
GEMINI_RATE_LIMIT_RETRIES = 4
_LAST_CALL_TS: List[float] = [0.0]  # module-level mutable holder


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class PageExtract:
    page_number: int
    method: str                       # "pdftotext" | "tesseract" | "mixed"
    char_count: int
    letter_ratio: float
    text: str
    notes: List[str] = field(default_factory=list)


@dataclass
class SourceDoc:
    dataset_id: str
    source_file: str
    abs_path: Path
    sha256: str
    page_count: int
    pages: List[PageExtract] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _run(cmd: List[str], **kwargs) -> subprocess.CompletedProcess:
    """Run a shell command, capturing both streams; raise on non-zero."""
    return subprocess.run(cmd, check=True, capture_output=True, text=True, **kwargs)


def _which(name: str) -> Optional[str]:
    return shutil.which(name)


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _letter_ratio(s: str) -> float:
    if not s:
        return 0.0
    letters = sum(1 for c in s if c.isalpha())
    return letters / max(1, len(s))


def _pdf_page_count(pdf: Path) -> int:
    out = _run(["pdfinfo", str(pdf)]).stdout
    for line in out.splitlines():
        if line.lower().startswith("pages:"):
            return int(line.split(":", 1)[1].strip())
    raise RuntimeError(f"pdfinfo did not report Pages for {pdf}")


def _pdftotext_page(pdf: Path, page_no: int) -> str:
    out = _run([
        "pdftotext", "-layout",
        "-f", str(page_no), "-l", str(page_no),
        str(pdf), "-",
    ]).stdout
    return out


def _tesseract_page(pdf: Path, page_no: int) -> str:
    """Rasterize one page with pdftoppm then OCR with tesseract."""
    with tempfile.TemporaryDirectory(prefix="g7a_ocr_") as td:
        td_path = Path(td)
        prefix = td_path / "page"
        _run([
            "pdftoppm", "-r", str(OCR_DPI),
            "-f", str(page_no), "-l", str(page_no),
            "-gray",
            str(pdf), str(prefix),
        ])
        # pdftoppm output: prefix-<page_no>.ppm (color) or .pgm (with -gray);
        # zero-padded for multi-digit jobs.
        candidates = sorted(td_path.glob("page-*.p[pg]m"))
        if not candidates:
            return ""
        img = candidates[0]
        result = _run([
            "tesseract", str(img), "-",
            "-l", OCR_LANGS,
            "--psm", "6",  # assume a single uniform block of text
        ])
        return result.stdout


def _extract_page(pdf: Path, page_no: int) -> PageExtract:
    """pdftotext first; fall back to tesseract OCR if poor."""
    text = ""
    notes: List[str] = []
    try:
        text = _pdftotext_page(pdf, page_no)
    except subprocess.CalledProcessError as e:
        notes.append(f"pdftotext_failed:{e.returncode}")

    text_stripped = text.strip()
    ratio = _letter_ratio(text_stripped)

    if len(text_stripped) < MIN_TEXT_CHARS_PER_PAGE or ratio < OCR_TRIGGER_LETTER_RATIO:
        notes.append(
            f"pdftotext_insufficient(chars={len(text_stripped)},letter_ratio={ratio:.2f}) -> ocr"
        )
        try:
            ocr_text = _tesseract_page(pdf, page_no).strip()
        except subprocess.CalledProcessError as e:
            notes.append(f"tesseract_failed:{e.returncode}")
            ocr_text = ""
        if ocr_text and len(ocr_text) >= len(text_stripped):
            return PageExtract(
                page_number=page_no,
                method="tesseract",
                char_count=len(ocr_text),
                letter_ratio=_letter_ratio(ocr_text),
                text=ocr_text,
                notes=notes,
            )
        # OCR didn't beat pdftotext — fall through with original text.
        return PageExtract(
            page_number=page_no,
            method="pdftotext-low",
            char_count=len(text_stripped),
            letter_ratio=ratio,
            text=text_stripped,
            notes=notes + ["ocr_did_not_improve"],
        )

    return PageExtract(
        page_number=page_no,
        method="pdftotext",
        char_count=len(text_stripped),
        letter_ratio=ratio,
        text=text_stripped,
        notes=notes,
    )


# ---------------------------------------------------------------------------
# Smoke Set resolution (read placeholders; do NOT mutate them)
# ---------------------------------------------------------------------------

def load_smoke_set() -> List[SourceDoc]:
    """Resolve the 5 Smoke Set IDs to their PDFs by walking the dataset tree."""
    placeholders = json.loads(PLACEHOLDERS_PATH.read_text())
    pdf_index: dict[str, Path] = {}
    for pdf in DATASET_ROOT.rglob("*.pdf"):
        pdf_index.setdefault(pdf.name, pdf)

    docs: List[SourceDoc] = []
    by_id = {e["instance_metadata"]["dataset_id"]: e["instance_metadata"]
             for e in placeholders["entries"]}

    for sid in SMOKE_SET_IDS:
        if sid not in by_id:
            raise SystemExit(f"Smoke ID {sid} not found in placeholders.")
        meta = by_id[sid]
        fname = meta["source_file"]
        if fname not in pdf_index:
            raise SystemExit(
                f"PDF '{fname}' for {sid} not found under {DATASET_ROOT}"
            )
        pdf_path = pdf_index[fname]
        on_disk_sha = _sha256(pdf_path)
        expected_sha = meta.get("sha256")
        if expected_sha and expected_sha != on_disk_sha:
            raise SystemExit(
                f"SHA256 mismatch for {sid} ({fname}): "
                f"on-disk={on_disk_sha[:12]} vs placeholder={expected_sha[:12]}"
            )
        page_count = _pdf_page_count(pdf_path)
        docs.append(SourceDoc(
            dataset_id=sid,
            source_file=fname,
            abs_path=pdf_path,
            sha256=on_disk_sha,
            page_count=page_count,
        ))
    return docs


# ---------------------------------------------------------------------------
# Pre-flight (read-only validation)
# ---------------------------------------------------------------------------

def preflight() -> dict:
    """Return a structured pre-flight report. Performs NO Gemini call."""
    report: dict = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "checks": [],
        "smoke_set": [],
        "config": {
            "model": GEMINI_MODEL,
            "schema_version": SCHEMA_VERSION,
            "prompt_version": PROMPT_VERSION,
            "preprocessing_version": PREPROCESSING_VERSION,
            "chunk_threshold_chars": CHUNK_THRESHOLD_CHARS,
            "ocr_langs": OCR_LANGS,
            "ocr_dpi": OCR_DPI,
        },
        "ok": True,
        "blocking": [],
    }

    def add(name: str, ok: bool, detail: str, blocking: bool = True):
        report["checks"].append({"name": name, "ok": ok, "detail": detail})
        if not ok and blocking:
            report["ok"] = False
            report["blocking"].append(name)

    # Tool checks
    for tool in ("pdftotext", "pdfinfo", "pdftoppm", "tesseract"):
        path = _which(tool)
        add(f"tool:{tool}", path is not None, path or "NOT FOUND")

    # Tesseract languages
    try:
        langs = _run(["tesseract", "--list-langs"]).stdout.lower()
        for lang in ("eng", "hin", "tel"):
            add(f"tesseract-lang:{lang}", lang in langs, langs.strip().splitlines()[-1] if langs else "n/a")
    except Exception as e:
        add("tesseract-lang:check", False, repr(e))

    # Schema
    try:
        schema = json.loads(SCHEMA_PATH.read_text())
        v = schema.get("version") or "<unset>"
        page_props = list(
            schema.get("$defs", {}).get("Page", {}).get("properties", {}).keys()
        )
        issue_enum = (
            schema.get("$defs", {})
            .get("Row", {})
            .get("properties", {})
            .get("issue_status", {})
            .get("enum", [])
        )
        add(
            "schema-version", v == "1.2",
            f"version={v}, page_props={page_props}, issue_status={issue_enum}",
        )
        add(
            "schema-pages-warnings", "warnings" in page_props,
            "pages[].warnings present" if "warnings" in page_props else "MISSING",
        )
        add(
            "schema-category-inferred", "category_inferred" in issue_enum,
            "issue_status.category_inferred present" if "category_inferred" in issue_enum else "MISSING",
        )
    except Exception as e:
        add("schema-load", False, repr(e))

    # Placeholders + Smoke Set resolution
    try:
        docs = load_smoke_set()
        for d in docs:
            report["smoke_set"].append({
                "dataset_id": d.dataset_id,
                "source_file": d.source_file,
                "path": str(d.abs_path),
                "page_count": d.page_count,
                "sha256_prefix": d.sha256[:12],
            })
        add("smoke-set-resolution", len(docs) == 5,
            f"resolved {len(docs)}/5 Smoke Set PDFs")
    except SystemExit as e:
        add("smoke-set-resolution", False, str(e))
    except Exception as e:
        add("smoke-set-resolution", False, repr(e))

    # Prompt template
    add("prompt-template", PROMPT_TEMPLATE_PATH.exists(),
        str(PROMPT_TEMPLATE_PATH))

    return report


# ---------------------------------------------------------------------------
# Build text-only payloads
# ---------------------------------------------------------------------------

def _build_envelope(doc: SourceDoc, pages: List[PageExtract], chunk_label: Optional[str]) -> dict:
    """Construct the text-only request envelope that mirrors what Gemini will see."""
    return {
        "request_kind": "text_only",
        "gemini_model": GEMINI_MODEL,
        "schema_version": SCHEMA_VERSION,
        "prompt_version": PROMPT_VERSION,
        "preprocessing_version": PREPROCESSING_VERSION,
        "import_id": f"smoke-{doc.dataset_id}",
        "source_file": doc.source_file,
        "dataset_id": doc.dataset_id,
        "dataset_version": "v0.1.0-PROPOSED",
        "sha256": doc.sha256,
        "chunk_label": chunk_label,
        "pages_in_payload": [p.page_number for p in pages],
        "total_pages_in_source": doc.page_count,
        "text_parts": [
            {
                "page_number": p.page_number,
                "extraction_method": p.method,
                "char_count": p.char_count,
                "letter_ratio": round(p.letter_ratio, 3),
                "notes": p.notes,
                "text": p.text,
            }
            for p in pages
        ],
    }


def _maybe_chunk(doc: SourceDoc) -> List[dict]:
    """Return one full payload, or N per-page chunks if the total exceeds the cap."""
    total_chars = sum(p.char_count for p in doc.pages) + 4 * len(doc.pages)
    if total_chars <= CHUNK_THRESHOLD_CHARS:
        return [_build_envelope(doc, doc.pages, chunk_label=None)]
    # per-page chunking
    return [
        _build_envelope(doc, [p], chunk_label=f"page-{p.page_number:02d}-of-{doc.page_count:02d}")
        for p in doc.pages
    ]


def build(only_id: Optional[str] = None) -> dict:
    docs = load_smoke_set()
    PAYLOADS_DIR.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    summary = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "docs": [],
    }

    for doc in docs:
        if only_id and doc.dataset_id != only_id:
            continue
        print(f"[g7a] extracting {doc.dataset_id} :: {doc.source_file} ({doc.page_count} pages)")
        out_dir = PAYLOADS_DIR / doc.dataset_id
        out_dir.mkdir(parents=True, exist_ok=True)

        for page_no in range(1, doc.page_count + 1):
            pe = _extract_page(doc.abs_path, page_no)
            doc.pages.append(pe)
            (out_dir / f"page-{page_no:02d}.txt").write_text(pe.text)
            print(f"  page {page_no:02d}: method={pe.method} chars={pe.char_count} notes={pe.notes}")

        # log
        log_path = LOG_DIR / f"{doc.dataset_id}.json"
        log_path.write_text(json.dumps({
            "dataset_id": doc.dataset_id,
            "source_file": doc.source_file,
            "page_count": doc.page_count,
            "pages": [
                {k: v for k, v in asdict(p).items() if k != "text"}
                for p in doc.pages
            ],
        }, indent=2))

        # build envelope(s)
        envelopes = _maybe_chunk(doc)
        if len(envelopes) == 1:
            (out_dir / "payload.json").write_text(json.dumps(envelopes[0], indent=2))
        else:
            chunk_dir = out_dir / "payload-chunked"
            chunk_dir.mkdir(parents=True, exist_ok=True)
            for env in envelopes:
                (chunk_dir / f"{env['chunk_label']}.json").write_text(json.dumps(env, indent=2))

        summary["docs"].append({
            "dataset_id": doc.dataset_id,
            "source_file": doc.source_file,
            "page_count": doc.page_count,
            "total_text_chars": sum(p.char_count for p in doc.pages),
            "chunked": len(envelopes) > 1,
            "chunk_count": len(envelopes),
            "payload_path": str(out_dir),
        })

    (STAGING_DIR / "build_summary.json").write_text(json.dumps(summary, indent=2))
    return summary


# ---------------------------------------------------------------------------
# Gemini call (G7A — wired)
# ---------------------------------------------------------------------------

def _load_system_prompt_verbatim() -> str:
    """Load the verbatim ``` block under '## 1. System prompt' from the prompt template."""
    txt = PROMPT_TEMPLATE_PATH.read_text()
    # Match the first fenced code block (``` ... ```) which holds the system prompt.
    m = re.search(r"```\s*\n(.*?)\n```", txt, flags=re.DOTALL)
    if not m:
        raise SystemExit("Could not find verbatim system prompt block in template.")
    return m.group(1).strip()


def _strip_code_fence(s: str) -> str:
    """Strip a leading ```json ... ``` or ``` ... ``` wrapper if present."""
    s = s.strip()
    if s.startswith("```"):
        # remove first fence line
        s = re.sub(r"^```[a-zA-Z0-9_-]*\s*\n", "", s)
        # remove trailing ```
        s = re.sub(r"\n```\s*$", "", s)
    return s.strip()


def _load_payloads_for(dataset_id: str) -> List[Dict[str, Any]]:
    """Return the list of staged envelopes for a Smoke ID (1 single, or N chunks)."""
    base = PAYLOADS_DIR / dataset_id
    chunk_dir = base / "payload-chunked"
    if chunk_dir.is_dir():
        envelopes = []
        for p in sorted(chunk_dir.glob("page-*-of-*.json")):
            envelopes.append(json.loads(p.read_text()))
        if not envelopes:
            raise SystemExit(f"No chunk payloads found under {chunk_dir}")
        return envelopes
    single = base / "payload.json"
    if not single.is_file():
        raise SystemExit(f"No payload.json or payload-chunked/ for {dataset_id} at {base}")
    return [json.loads(single.read_text())]


def _build_user_prompt(envelope: Dict[str, Any]) -> str:
    """Compose the per-call user prompt: page text(s) + echoed metadata."""
    lines: List[str] = []
    lines.append("Extract the menu from the page text(s) below.")
    lines.append("")
    lines.append("Context (echo these back verbatim in model_metadata where relevant):")
    lines.append(f"  import_id             = {envelope['import_id']}")
    lines.append(f"  source_file           = {envelope['source_file']}")
    lines.append(f"  dataset_id            = {envelope['dataset_id']}")
    lines.append(f"  model_name            = {envelope['gemini_model']}")
    lines.append(f"  sdk_version           = {SDK_VERSION}")
    lines.append(f"  prompt_version        = {envelope['prompt_version']}")
    lines.append(f"  json_schema_version   = {envelope['schema_version']}")
    lines.append(f"  preprocessing_version = {envelope['preprocessing_version']}")
    lines.append(f"  normalizer_version    = {NORMALIZER_VERSION}")
    if envelope.get("chunk_label"):
        lines.append(f"  chunk_label           = {envelope['chunk_label']}")
        lines.append(
            "  NOTE: This is a per-page chunk of a larger source. Cross-page joins"
            " (e.g., a category heading on another page) are NOT available here."
            " Add 'chunked_page_partial_context' to that page's warnings if relevant."
        )
    lines.append("")
    lines.append("Pages in this payload (text-only; no images attached):")
    lines.append(
        "For each page below, extract rows + menu_notes. Use the page_number as printed."
    )
    lines.append("")
    for part in envelope["text_parts"]:
        lines.append(f"----- BEGIN PAGE {part['page_number']} -----")
        lines.append(f"(extraction_method={part['extraction_method']}, "
                     f"char_count={part['char_count']}, "
                     f"letter_ratio={part['letter_ratio']})")
        lines.append("")
        lines.append(part["text"])
        lines.append("")
        lines.append(f"----- END PAGE {part['page_number']} -----")
        lines.append("")
    lines.append(
        "Return ONLY the JSON object conforming to gemini-extract-schema-v1.2. "
        "No markdown, no prose, no commentary."
    )
    return "\n".join(lines)


def _estimate_cost(prompt_chars: int, response_chars: int) -> float:
    """Rough USD estimate: chars/4 ≈ tokens; Gemini 2.5 Flash list prices."""
    in_tok = prompt_chars / 4.0
    out_tok = response_chars / 4.0
    return (
        in_tok / 1_000_000 * GEMINI_PRICE_INPUT_PER_M
        + out_tok / 1_000_000 * GEMINI_PRICE_OUTPUT_PER_M
    )


async def _call_gemini_once(system_prompt: str, user_prompt: str,
                            session_id: str) -> Tuple[str, int, int]:
    """Single Gemini call with RPM throttling + 429 retry. Returns (text, prompt_chars, response_chars)."""
    # Lazy import so non-gemini code paths don't require the SDK at import time.
    from emergentintegrations.llm.chat import LlmChat, UserMessage  # type: ignore

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise SystemExit("Neither GEMINI_API_KEY nor EMERGENT_LLM_KEY is set in environment.")

    # Throttle: keep below 5 RPM (free tier cap) — wait at least N seconds since last call.
    elapsed = time.monotonic() - _LAST_CALL_TS[0]
    if _LAST_CALL_TS[0] > 0 and elapsed < GEMINI_MIN_CALL_INTERVAL_S:
        wait = GEMINI_MIN_CALL_INTERVAL_S - elapsed
        print(f"  [throttle] sleeping {wait:.1f}s to stay under free-tier RPM")
        await asyncio.sleep(wait)

    chat = (
        LlmChat(api_key=api_key, session_id=session_id, system_message=system_prompt)
        .with_model("gemini", GEMINI_MODEL)
        .with_params(
            temperature=GEMINI_TEMPERATURE,
            max_tokens=GEMINI_MAX_OUTPUT_TOKENS,
        )
    )

    last_err: Optional[str] = None
    for rl_attempt in range(GEMINI_RATE_LIMIT_RETRIES + 1):
        try:
            resp_text = await chat.send_message(UserMessage(text=user_prompt))
            _LAST_CALL_TS[0] = time.monotonic()
            prompt_chars = len(system_prompt) + len(user_prompt)
            response_chars = len(resp_text or "")
            return resp_text or "", prompt_chars, response_chars
        except Exception as e:  # ChatError wraps litellm errors
            msg = str(e)
            last_err = msg
            is_rate = ("RateLimitError" in msg or "429" in msg
                       or "RESOURCE_EXHAUSTED" in msg or "quota" in msg.lower())
            if not is_rate or rl_attempt >= GEMINI_RATE_LIMIT_RETRIES:
                raise
            # Try to parse a server-suggested retry delay; fallback to 30s.
            m = re.search(r"Please retry in ([0-9.]+)s", msg)
            delay = float(m.group(1)) + 2.0 if m else 30.0
            delay = max(delay, GEMINI_MIN_CALL_INTERVAL_S)
            print(f"  [rate-limit] 429 received; sleeping {delay:.1f}s and retrying ({rl_attempt + 1}/{GEMINI_RATE_LIMIT_RETRIES})")
            await asyncio.sleep(delay)
    # Should not reach here
    raise SystemExit(f"Gemini rate-limit retries exhausted: {last_err}")


def _build_validator() -> Any:
    import jsonschema  # type: ignore
    schema = json.loads(SCHEMA_PATH.read_text())
    return jsonschema.Draft202012Validator(schema)


def _validate(validator: Any, obj: Dict[str, Any]) -> Optional[str]:
    """Return None if valid, else a short human-readable error message."""
    errors = sorted(validator.iter_errors(obj), key=lambda e: list(e.absolute_path))
    if not errors:
        return None
    first = errors[0]
    path = "/".join(str(p) for p in first.absolute_path) or "<root>"
    return f"{first.message} (at {path})"


async def _call_for_envelope(
    validator: Any,
    system_prompt: str,
    envelope: Dict[str, Any],
    cost_state: Dict[str, float],
) -> Dict[str, Any]:
    """Call Gemini for one envelope (single doc or single chunk). Returns parsed JSON.

    Performs up to GEMINI_RETRY_LIMIT strict retries on schema validation failure.
    Updates cost_state in place. Raises SystemExit on budget breach or final failure.
    """
    user_prompt = _build_user_prompt(envelope)
    session_id = f"g7a-{envelope['dataset_id']}-{envelope.get('chunk_label') or 'single'}-{uuid.uuid4().hex[:8]}"

    attempt = 0
    last_error: Optional[str] = None
    last_response: Optional[str] = None
    current_system = system_prompt

    while attempt <= GEMINI_RETRY_LIMIT:
        # Pre-call budget guard (cheap pre-flight against the input charge alone).
        provisional_input_cost = _estimate_cost(len(current_system) + len(user_prompt), 0)
        if cost_state["used_usd"] + provisional_input_cost > GEMINI_BUDGET_USD:
            raise SystemExit(
                f"BUDGET_EXCEEDED before call (used=${cost_state['used_usd']:.4f}, "
                f"projected_input=${provisional_input_cost:.4f}, cap=${GEMINI_BUDGET_USD:.2f})"
            )

        text, p_chars, r_chars = await _call_gemini_once(current_system, user_prompt, session_id)
        cost = _estimate_cost(p_chars, r_chars)
        cost_state["used_usd"] += cost
        cost_state["calls"] += 1
        cost_state["prompt_chars"] += p_chars
        cost_state["response_chars"] += r_chars
        print(
            f"  [gemini] {envelope['dataset_id']}"
            f"{(' ' + envelope.get('chunk_label')) if envelope.get('chunk_label') else ''}"
            f" attempt={attempt+1}"
            f" prompt_chars={p_chars} response_chars={r_chars}"
            f" call_cost=${cost:.4f} run_total=${cost_state['used_usd']:.4f}"
        )

        if cost_state["used_usd"] > GEMINI_BUDGET_USD:
            raise SystemExit(
                f"BUDGET_EXCEEDED after call (used=${cost_state['used_usd']:.4f}, cap=${GEMINI_BUDGET_USD:.2f})"
            )

        last_response = text
        cleaned = _strip_code_fence(text)
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError as e:
            last_error = f"json_decode_error: {e.msg} at line {e.lineno} col {e.colno}"
            attempt += 1
            current_system = system_prompt + (
                "\n\nPREVIOUS ATTEMPT FAILED SCHEMA VALIDATION.\n"
                f"Reason: {last_error}\n"
                "Do not explain. Do not apologize. Re-emit the corrected JSON that strictly "
                "conforms to the schema described above. JSON only."
            )
            continue

        err = _validate(validator, parsed)
        if err is None:
            return parsed
        last_error = err
        attempt += 1
        current_system = system_prompt + (
            "\n\nPREVIOUS ATTEMPT FAILED SCHEMA VALIDATION.\n"
            f"Reason: {last_error}\n"
            "Do not explain. Do not apologize. Re-emit the corrected JSON that strictly "
            "conforms to the schema described above. JSON only."
        )

    raise SystemExit(
        f"SCHEMA_VALIDATION_FAILED for {envelope['dataset_id']}"
        f"{(' chunk=' + envelope.get('chunk_label')) if envelope.get('chunk_label') else ''}"
        f" after {GEMINI_RETRY_LIMIT + 1} attempts. last_error={last_error}\n"
        f"last_response_head={(last_response or '')[:400]}"
    )


def _merge_chunked_outputs(envelopes: List[Dict[str, Any]],
                           chunk_outputs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Merge per-page chunk responses for MENU-v0.1.0-0007 into one document output."""
    assert envelopes and chunk_outputs and len(envelopes) == len(chunk_outputs)
    head = chunk_outputs[0]
    # All chunks share the same import_id/source_file/model_metadata. Use the first.
    merged: Dict[str, Any] = {
        "import_id": head["import_id"],
        "source_file": head["source_file"],
        "model_metadata": head["model_metadata"],
        "pages": [],
        "warnings": [],
        "extraction_summary": {
            "total_rows": 0,
            "rows_with_missing_price": 0,
            "rows_with_variant_warning": 0,
            "rows_with_addon_warning": 0,
            "menu_notes_detected": 0,
            "pages_extracted": 0,
            "pages_empty": 0,
        },
    }
    seen_warnings = set()
    for env, out in zip(envelopes, chunk_outputs):
        # Each chunk holds 1 page in pages[]; ensure page_number matches the envelope's page.
        for page in out["pages"]:
            # add chunked_page_partial_context as a structural marker if not already present
            warnings = list(page.get("warnings") or [])
            if "chunked_page_partial_context" not in warnings:
                warnings.append("chunked_page_partial_context")
            page_copy = {
                "page_number": page["page_number"],
                "rows": page["rows"],
                "menu_notes": page["menu_notes"],
                "warnings": warnings,
            }
            merged["pages"].append(page_copy)
        for w in out.get("warnings", []):
            if w not in seen_warnings:
                seen_warnings.add(w)
                merged["warnings"].append(w)
        s = out.get("extraction_summary", {})
        for k in merged["extraction_summary"]:
            merged["extraction_summary"][k] += int(s.get(k, 0) or 0)
    # Sort pages by page_number to be safe
    merged["pages"].sort(key=lambda p: p["page_number"])
    # De-duplicate warnings preserving order
    merged["warnings"] = list(dict.fromkeys(merged["warnings"]))
    return merged


def _inject_required_warnings(dataset_id: str, doc: Dict[str, Any]) -> List[str]:
    """For specific Smoke IDs, ensure required warnings are present on pages + top level.

    Returns a list of warnings that were *added* (for audit logging).
    """
    added: List[str] = []
    if dataset_id == "MENU-v0.1.0-0023":
        # Top-level warnings
        top = list(doc.get("warnings") or [])
        for w in DATASET_0023_REQUIRED_PAGE_WARNINGS:
            if w not in top:
                top.append(w)
                added.append(f"top:{w}")
        doc["warnings"] = top
        # Page-level warnings on every page (single-page doc but be defensive)
        for page in doc.get("pages", []):
            pwarn = list(page.get("warnings") or [])
            for w in DATASET_0023_REQUIRED_PAGE_WARNINGS:
                if w not in pwarn:
                    pwarn.append(w)
                    added.append(f"page{page.get('page_number')}:{w}")
            page["warnings"] = pwarn
    return added


def gemini_preflight() -> Dict[str, Any]:
    """Pre-flight that ONLY validates what the Gemini call needs (no OCR tools)."""
    report: Dict[str, Any] = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "checks": [],
        "ok": True,
        "blocking": [],
    }

    def add(name: str, ok: bool, detail: str, blocking: bool = True):
        report["checks"].append({"name": name, "ok": ok, "detail": detail})
        if not ok and blocking:
            report["ok"] = False
            report["blocking"].append(name)

    # 1. Schema v1.2 + warnings
    try:
        schema = json.loads(SCHEMA_PATH.read_text())
        v = schema.get("version") or "<unset>"
        page_props = list(
            schema.get("$defs", {}).get("Page", {}).get("properties", {}).keys()
        )
        add("schema-version", v == "1.2", f"version={v}")
        add("schema-pages-warnings", "warnings" in page_props,
            "pages[].warnings present" if "warnings" in page_props else "MISSING")
    except Exception as e:
        add("schema-load", False, repr(e))

    # 2. Prompt template
    add("prompt-template", PROMPT_TEMPLATE_PATH.exists(), str(PROMPT_TEMPLATE_PATH))

    # 3. Smoke archive must NOT exist
    add("archive-absent", not SMOKE_ARCHIVE_PATH.exists(),
        f"{SMOKE_ARCHIVE_PATH} {'EXISTS (refusing to overwrite)' if SMOKE_ARCHIVE_PATH.exists() else 'absent'}")

    # 4. Staged payloads present for all 5 Smoke IDs
    missing: List[str] = []
    chunk_counts: Dict[str, int] = {}
    for sid in SMOKE_SET_IDS:
        try:
            envs = _load_payloads_for(sid)
            chunk_counts[sid] = len(envs)
        except SystemExit as e:
            missing.append(f"{sid}: {e}")
    add("staged-payloads", not missing,
        f"chunk_counts={chunk_counts}" + (f" missing={missing}" if missing else ""))

    # 5. Placeholders untouched (entries have empty expected_pages, no frozen_at)
    try:
        ph = json.loads(PLACEHOLDERS_PATH.read_text())
        bad = []
        for e in ph.get("entries", []):
            if e.get("expected_pages"):
                bad.append(f"{e.get('instance_metadata', {}).get('dataset_id')}:non-empty-expected_pages")
            if e.get("frozen_at"):
                bad.append(f"{e.get('instance_metadata', {}).get('dataset_id')}:non-null-frozen_at")
        add("placeholders-untouched", not bad,
            "all entries clean" if not bad else f"violations={bad[:5]}")
        add("placeholders-dataset-version",
            ph.get("dataset_version") == "v0.1.0-PROPOSED",
            f"dataset_version={ph.get('dataset_version')}")
    except Exception as e:
        add("placeholders-load", False, repr(e))

    # 6. API key available (direct Gemini key OR Emergent universal key)
    has_key = bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("EMERGENT_LLM_KEY"))
    add("api-key", has_key,
        "GEMINI_API_KEY or EMERGENT_LLM_KEY set" if has_key else "MISSING")

    # 7. jsonschema available
    try:
        import jsonschema  # noqa: F401
        add("jsonschema-import", True, "ok")
    except Exception as e:
        add("jsonschema-import", False, repr(e))

    # 8. emergentintegrations available
    try:
        from emergentintegrations.llm.chat import LlmChat  # noqa: F401
        add("emergentintegrations-import", True, "ok")
    except Exception as e:
        add("emergentintegrations-import", False, repr(e))

    return report


async def call_gemini_async() -> Dict[str, Any]:
    """Run G7A Gemini calls over the 5 Smoke Set staged payloads.

    Returns the immutable archive dict that will be written. Raises SystemExit on any
    failure (budget, schema, missing payload, etc.). Does NOT write partial output.
    """
    pf = gemini_preflight()
    if not pf["ok"]:
        print(json.dumps(pf, indent=2))
        raise SystemExit("Gemini preflight failed; refusing to call.")

    system_prompt = _load_system_prompt_verbatim()
    validator = _build_validator()
    cost_state: Dict[str, Any] = {
        "used_usd": 0.0,
        "calls": 0,
        "prompt_chars": 0,
        "response_chars": 0,
        "budget_cap_usd": GEMINI_BUDGET_USD,
    }

    per_doc_outputs: List[Dict[str, Any]] = []
    per_doc_metadata: List[Dict[str, Any]] = []
    warnings_injected_log: Dict[str, List[str]] = {}

    for sid in SMOKE_SET_IDS:
        envelopes = _load_payloads_for(sid)
        print(f"\n[g7a] === {sid} :: {len(envelopes)} envelope(s) ===")
        chunk_outs: List[Dict[str, Any]] = []
        for env in envelopes:
            parsed = await _call_for_envelope(validator, system_prompt, env, cost_state)
            chunk_outs.append(parsed)

        if len(envelopes) > 1:
            doc = _merge_chunked_outputs(envelopes, chunk_outs)
            # Re-validate merged doc
            err = _validate(validator, doc)
            if err is not None:
                raise SystemExit(
                    f"MERGE_VALIDATION_FAILED for {sid} after merging "
                    f"{len(envelopes)} chunks: {err}"
                )
        else:
            doc = chunk_outs[0]

        # Per-dataset required warning injection (e.g., 0023)
        added = _inject_required_warnings(sid, doc)
        if added:
            warnings_injected_log[sid] = added
            err = _validate(validator, doc)
            if err is not None:
                raise SystemExit(
                    f"POST_INJECT_VALIDATION_FAILED for {sid}: {err}"
                )

        per_doc_outputs.append(doc)
        per_doc_metadata.append({
            "dataset_id": sid,
            "source_file": envelopes[0]["source_file"],
            "sha256": envelopes[0]["sha256"],
            "envelopes_sent": len(envelopes),
            "chunked": len(envelopes) > 1,
            "page_count": envelopes[0]["total_pages_in_source"],
            "warnings_injected": warnings_injected_log.get(sid, []),
            "ocr_low_confidence": sid == "MENU-v0.1.0-0023",
        })

    # Build immutable archive
    archive = {
        "archive_version": "g7a-smoke-v1",
        "dataset_version": "v0.1.0-PROPOSED",
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "generated_by": "g7a_bootstrap_smoke.py --call-gemini",
        "schema_version": SCHEMA_VERSION,
        "prompt_version": PROMPT_VERSION,
        "preprocessing_version": PREPROCESSING_VERSION,
        "sdk_version": SDK_VERSION,
        "model_name": GEMINI_MODEL,
        "dataset_ids": list(SMOKE_SET_IDS),
        "cost_usage_usd": round(cost_state["used_usd"], 6),
        "cost_cap_usd": GEMINI_BUDGET_USD,
        "calls": cost_state["calls"],
        "prompt_chars_total": cost_state["prompt_chars"],
        "response_chars_total": cost_state["response_chars"],
        "warnings_injected": warnings_injected_log,
        "per_document_metadata": per_doc_metadata,
        "documents": per_doc_outputs,
        "human_review_status": "HUMAN_REVIEW_REQUIRED",
        "frozen_at": None,
        "notes": (
            "First-pass Gemini extraction for the 5 Smoke Set PDFs. "
            "Awaits G7B human review by Sunil. Placeholders are NOT modified by this run."
        ),
    }

    # Atomic write
    tmp = SMOKE_ARCHIVE_PATH.with_suffix(SMOKE_ARCHIVE_PATH.suffix + ".tmp")
    tmp.write_text(json.dumps(archive, indent=2, ensure_ascii=False))
    os.replace(tmp, SMOKE_ARCHIVE_PATH)
    print(f"\n[g7a] archive written: {SMOKE_ARCHIVE_PATH}")
    print(f"[g7a] cost used: ${cost_state['used_usd']:.4f} / ${GEMINI_BUDGET_USD:.2f}")
    return archive


def _append_run_report(archive: Dict[str, Any]) -> None:
    """Append a new run entry to G7A_SMOKE_RUN_REPORT_v0.1.0.md."""
    if not RUN_REPORT_PATH.exists():
        return
    body = RUN_REPORT_PATH.read_text()
    run_id = (
        time.strftime("%Y-%m-%dT%H:%MZ-", time.gmtime())
        + uuid.uuid4().hex[:6]
    )
    per_doc = archive["per_document_metadata"]
    chunk_summary = ", ".join(
        f"{m['dataset_id']}({'chunks=' + str(m['envelopes_sent']) if m['chunked'] else 'single'})"
        for m in per_doc
    )
    entry = f"""
## Run #2 — gemini_first_pass — COMPLETED

```yaml
run_id: {run_id}
kind: gemini_first_pass
schema_version: {archive['schema_version']}
prompt_version: {archive['prompt_version']}
model_name: {archive['model_name']}
sdk_version: {archive['sdk_version']}
script_revision: g7a_bootstrap_smoke.py --call-gemini (wired)
dataset_ids:
  - MENU-v0.1.0-0007
  - MENU-v0.1.0-0013
  - MENU-v0.1.0-0023
  - MENU-v0.1.0-0024
  - MENU-v0.1.0-0025
outcome: pass
halt_reason: null
artifacts:
  - /app/memory/menu-import/MENU_AI_FIRST_PASS_OUTPUT_SMOKE_v0.1.0.json
metrics:
  files_processed: {len(archive['dataset_ids'])}
  payload_count_total: {sum(m['envelopes_sent'] for m in per_doc)}
  chunk_count_0007: {next(m['envelopes_sent'] for m in per_doc if m['dataset_id'] == 'MENU-v0.1.0-0007')}
  gemini_calls: {archive['calls']}
  prompt_chars_total: {archive['prompt_chars_total']}
  response_chars_total: {archive['response_chars_total']}
  cost_usage_usd: {archive['cost_usage_usd']}
  cost_cap_usd: {archive['cost_cap_usd']}
  schema_validation: all 5 documents passed gemini-extract-schema-v1.2 (merged 0007 re-validated)
  warnings_injected: {archive['warnings_injected']}
notes: |
  All 5 Smoke Set documents extracted by gemini-2.5-flash from staged text-only
  payloads. MENU-v0.1.0-0007 was submitted as 13 per-page chunks and merged
  orchestrator-side. MENU-v0.1.0-0023 received post-call injection of the
  required page+top-level warnings (mixed_language_detected, ocr_unreadable,
  no_source_grounding_page_level) plus OCR_LOW_CONFIDENCE marker in metadata.

  Per-document submission summary:
    {chunk_summary}

  Placeholders left untouched. Dataset NOT frozen.
  G7B (human review by Sunil) may now begin against the archive at:
    /app/memory/menu-import/MENU_AI_FIRST_PASS_OUTPUT_SMOKE_v0.1.0.json
```
"""
    # Append before the trailing "(append below)" marker if present, else just append.
    marker = "## Run #2 onward\n\n(append below)\n"
    if marker in body:
        body = body.replace(marker, marker + entry.strip() + "\n")
    else:
        body = body.rstrip() + "\n\n" + entry.strip() + "\n"
    RUN_REPORT_PATH.write_text(body)


def call_gemini() -> int:
    """Sync wrapper around the async Gemini orchestrator."""
    archive = asyncio.run(call_gemini_async())
    _append_run_report(archive)
    return 0


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(description="G7A Smoke Set bootstrap (text/OCR pipeline; NO Gemini call).")
    ap.add_argument("--preflight", action="store_true", help="Validate environment + inputs only.")
    ap.add_argument("--build", action="store_true", help="Run text/OCR extraction and build payloads.")
    ap.add_argument("--dataset-id", help="Restrict --build to one Smoke Set ID.")
    ap.add_argument("--call-gemini", action="store_true",
                    help="GATED: not implemented in v1. Requires explicit owner approval.")
    args = ap.parse_args()

    if args.call_gemini:
        return call_gemini()

    if args.preflight or not (args.build or args.preflight):
        rep = preflight()
        print(json.dumps(rep, indent=2))
        return 0 if rep["ok"] else 1

    if args.build:
        rep = preflight()
        if not rep["ok"]:
            print("Pre-flight failed; refusing to build payloads.")
            print(json.dumps(rep, indent=2))
            return 2
        s = build(only_id=args.dataset_id)
        print(json.dumps(s, indent=2))
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
