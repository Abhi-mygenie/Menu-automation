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
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import List, Optional

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
        # pdftoppm output: prefix-<page_no>.ppm (zero-padded for multi-digit jobs)
        candidates = sorted(td_path.glob("page-*.ppm"))
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
        raise NotImplementedError(
            "Gemini call is gated. After pre-flight + payload review the owner must "
            "explicitly wire this flag in a follow-up patch. Refusing to run."
        )

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
