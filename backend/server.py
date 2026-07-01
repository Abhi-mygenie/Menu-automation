from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import io
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any, Dict
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Datasets directory (mounted alongside the repo). Used by the dataset
# stats endpoint so the team can confirm the menu corpus is available.
DATASETS_DIR = Path(os.environ.get('DATASETS_DIR', ROOT_DIR.parent / 'datasets'))

# Create the main app without a prefix
app = FastAPI(title="Menu Automation API", version="0.1.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


class HealthResponse(BaseModel):
    status: str
    service: str
    mongo: str
    timestamp: datetime


class DatasetBatch(BaseModel):
    name: str
    file_count: int
    files: List[str]


class DatasetStats(BaseModel):
    root: str
    exists: bool
    total_files: int
    batches: List[DatasetBatch]


# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Menu Automation API is running", "docs": "/docs"}


@api_router.get("/health", response_model=HealthResponse)
async def health():
    """Liveness/readiness probe. Verifies Mongo connectivity."""
    mongo_status = "ok"
    try:
        await client.admin.command("ping")
    except Exception as exc:  # pragma: no cover - surfaced in deploy logs
        mongo_status = f"error: {exc.__class__.__name__}"
    return HealthResponse(
        status="ok" if mongo_status == "ok" else "degraded",
        service="menu-automation-backend",
        mongo=mongo_status,
        timestamp=datetime.now(timezone.utc),
    )


@api_router.get("/datasets/stats", response_model=DatasetStats)
async def datasets_stats():
    """Summarise the menus_raw dataset bundled with the repo."""
    root = DATASETS_DIR / "menus_raw"
    if not root.exists():
        return DatasetStats(root=str(root), exists=False, total_files=0, batches=[])

    batches: List[DatasetBatch] = []
    total = 0
    # one level: versioned folder containing batch-XX directories
    for version_dir in sorted(p for p in root.iterdir() if p.is_dir()):
        for batch_dir in sorted(p for p in version_dir.iterdir() if p.is_dir()):
            files = sorted(f.name for f in batch_dir.iterdir() if f.is_file())
            total += len(files)
            batches.append(
                DatasetBatch(
                    name=f"{version_dir.name}/{batch_dir.name}",
                    file_count=len(files),
                    files=files,
                )
            )
    return DatasetStats(root=str(root), exists=True, total_files=total, batches=batches)


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)

    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()

    _ = await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)

    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])

    return status_checks


# ═══════════════════════════════════════════════════════════════════════
# MENU REVIEW TOOL — Phase A  (Review Tool v1)
# ═══════════════════════════════════════════════════════════════════════

# ── Archive loader ───────────────────────────────────────────────────────
ARCHIVE_PATH = (
    ROOT_DIR.parent / "memory" / "menu-import"
    / "MENU_AI_FIRST_PASS_OUTPUT_SMOKE_v0.1.0.json"
)

def _load_archive() -> tuple:
    with open(ARCHIVE_PATH) as f:
        raw = json.load(f)
    index = {doc["import_id"]: doc for doc in raw.get("documents", [])}
    return raw, index

_ARCHIVE, _ARCHIVE_INDEX = _load_archive()


def _doc_totals(doc: dict):
    rows = sum(len(p.get("rows", [])) for p in doc["pages"])
    notes = sum(len(p.get("menu_notes", [])) for p in doc["pages"])
    return rows, notes


def _find_pdf_path(source_file: str):
    for root, _, files in os.walk(DATASETS_DIR / "menus_raw"):
        if source_file in files:
            return Path(root) / source_file
    return None


# ── Pydantic models ──────────────────────────────────────────────────────

class MenuReview(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    dataset_id: str
    source_file: str
    status: str = "not_started"  # not_started | in_progress | complete
    total_rows: int
    total_notes: int
    current_page: int = 1
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CorrectionIn(BaseModel):
    dataset_id: str
    row_no: Optional[int] = None
    page_number: int
    action: str  # approve | edit | delete_hallucination | add_missing | unclear | out_of_scope
    original_item_name: Optional[str] = None
    original_rate: Optional[float] = None
    original_category: Optional[str] = None
    original_issue_status: Optional[str] = None
    original_raw_text: Optional[str] = None
    corrected_item_name: Optional[str] = None
    corrected_rate: Optional[float] = None
    corrected_category: Optional[str] = None
    corrected_issue_status: Optional[str] = None
    reviewer_notes: Optional[str] = None
    is_manual_add: bool = False


class NoteCorrectionIn(BaseModel):
    dataset_id: str
    note_index: int
    note_page: int
    action: str  # approve | edit | delete | out_of_scope
    original_note_text: Optional[str] = None
    original_note_type: Optional[str] = None
    corrected_note_text: Optional[str] = None


# ── Startup: ensure MongoDB indexes ──────────────────────────────────────

@app.on_event("startup")
async def create_review_indexes():
    await db.menu_reviews.create_index("dataset_id", unique=True)
    await db.menu_review_corrections.create_index(
        [("dataset_id", 1), ("correction_type", 1), ("page_number", 1), ("row_no", 1)]
    )
    await db.menu_review_corrections.create_index(
        [("dataset_id", 1), ("correction_type", 1), ("note_index", 1), ("note_page", 1)]
    )


# ── Helper: load corrections for a document ─────────────────────────────

async def _get_corrections(dataset_id: str) -> tuple:
    """Returns (row_corrections dict keyed by (page_number, row_no), note_corrections dict keyed by (note_page, note_index))"""
    cursor = db.menu_review_corrections.find(
        {"dataset_id": dataset_id}, {"_id": 0}
    )
    row_corr: Dict[str, dict] = {}
    note_corr: Dict[str, dict] = {}
    async for c in cursor:
        if c["correction_type"] == "row" and c.get("row_no") is not None:
            key = f"{c['page_number']}-{c['row_no']}"
            row_corr[key] = c
        elif c["correction_type"] == "note":
            key = f"{c['note_page']}-{c['note_index']}"
            note_corr[key] = c
    return row_corr, note_corr


async def _get_or_create_review(dataset_id: str) -> dict:
    """Get existing review record or create it if it doesn't exist."""
    rec = await db.menu_reviews.find_one({"dataset_id": dataset_id}, {"_id": 0})
    if rec:
        return rec
    doc = _ARCHIVE_INDEX.get(dataset_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"dataset_id '{dataset_id}' not found in archive")
    total_rows, total_notes = _doc_totals(doc)
    review = MenuReview(
        dataset_id=dataset_id,
        source_file=doc["source_file"],
        status="not_started",
        total_rows=total_rows,
        total_notes=total_notes,
    )
    rv = review.model_dump()
    await db.menu_reviews.insert_one({**rv, "id": rv["id"]})
    return rv


# ── Endpoint 1: List all documents ───────────────────────────────────────

@api_router.get("/menu-review/documents")
async def list_review_documents():
    result = []
    for doc in _ARCHIVE.get("documents", []):
        dataset_id = doc["import_id"]
        total_rows, total_notes = _doc_totals(doc)

        # Get review record (may not exist yet)
        rec = await db.menu_reviews.find_one({"dataset_id": dataset_id}, {"_id": 0})
        status = rec["status"] if rec else "not_started"
        started_at = rec.get("started_at") if rec else None
        completed_at = rec.get("completed_at") if rec else None

        # Count corrections
        pipeline = [
            {"$match": {"dataset_id": dataset_id, "correction_type": "row"}},
            {"$group": {"_id": "$action", "count": {"$sum": 1}}}
        ]
        action_counts: Dict[str, int] = {}
        async for grp in db.menu_review_corrections.aggregate(pipeline):
            action_counts[grp["_id"]] = grp["count"]

        rows_reviewed = sum(action_counts.values())
        progress_pct = round(rows_reviewed / total_rows * 100) if total_rows else 0

        # Note corrections count
        note_reviewed = await db.menu_review_corrections.count_documents(
            {"dataset_id": dataset_id, "correction_type": "note"}
        )

        result.append({
            "dataset_id": dataset_id,
            "source_file": doc["source_file"],
            "pages": len(doc["pages"]),
            "total_rows": total_rows,
            "total_notes": total_notes,
            "doc_warnings": doc.get("warnings", []),
            "status": status,
            "rows_reviewed": rows_reviewed,
            "rows_approved": action_counts.get("approve", 0),
            "rows_edited": action_counts.get("edit", 0),
            "rows_deleted": action_counts.get("delete_hallucination", 0),
            "rows_unclear": action_counts.get("unclear", 0),
            "rows_out_of_scope": action_counts.get("out_of_scope", 0),
            "notes_reviewed": note_reviewed,
            "progress_pct": progress_pct,
            "started_at": started_at,
            "completed_at": completed_at,
        })
    return result


# ── Endpoint 2: Full document data ────────────────────────────────────────

@api_router.get("/menu-review/documents/{dataset_id}")
async def get_review_document(dataset_id: str):
    doc = _ARCHIVE_INDEX.get(dataset_id)
    if not doc:
        raise HTTPException(404, f"dataset_id '{dataset_id}' not found")

    rec = await db.menu_reviews.find_one({"dataset_id": dataset_id}, {"_id": 0})
    row_corr, note_corr = await _get_corrections(dataset_id)

    pages_out = []
    for page in doc["pages"]:
        rows_out = []
        for row in page.get("rows", []):
            corr = row_corr.get(f"{page['page_number']}-{row['row_no']}")
            rows_out.append({**row, "correction": corr})
        notes_out = []
        for idx, note in enumerate(page.get("menu_notes", [])):
            key = f"{page['page_number']}-{idx}"
            corr = note_corr.get(key)
            notes_out.append({**note, "note_index": idx, "correction": corr})
        pages_out.append({
            "page_number": page["page_number"],
            "page_warnings": page.get("warnings", []),
            "rows": rows_out,
            "menu_notes": notes_out,
        })

    return {
        "dataset_id": dataset_id,
        "source_file": doc["source_file"],
        "total_pages": len(doc["pages"]),
        "total_rows": sum(len(p["rows"]) for p in pages_out),
        "total_notes": sum(len(p["menu_notes"]) for p in pages_out),
        "doc_warnings": doc.get("warnings", []),
        "status": rec["status"] if rec else "not_started",
        "current_page": rec["current_page"] if rec else 1,
        "pages": pages_out,
    }


# ── Endpoint 3: Serve PDF binary ──────────────────────────────────────────

@api_router.get("/menu-review/documents/{dataset_id}/pdf")
async def serve_pdf(dataset_id: str):
    doc = _ARCHIVE_INDEX.get(dataset_id)
    if not doc:
        raise HTTPException(404, f"dataset_id '{dataset_id}' not found")
    pdf_path = _find_pdf_path(doc["source_file"])
    if not pdf_path:
        raise HTTPException(404, f"PDF file '{doc['source_file']}' not found on disk")
    with open(pdf_path, "rb") as f:
        data = f.read()
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=\"{doc['source_file']}\""},
    )


# ── Endpoint 4: Start / activate review session ───────────────────────────

@api_router.post("/menu-review/documents/{dataset_id}/start")
async def start_review(dataset_id: str):
    doc = _ARCHIVE_INDEX.get(dataset_id)
    if not doc:
        raise HTTPException(404, f"dataset_id '{dataset_id}' not found")

    now = datetime.now(timezone.utc)
    total_rows, total_notes = _doc_totals(doc)

    rec = await db.menu_reviews.find_one({"dataset_id": dataset_id}, {"_id": 0})
    if not rec:
        review = MenuReview(
            dataset_id=dataset_id,
            source_file=doc["source_file"],
            status="in_progress",
            total_rows=total_rows,
            total_notes=total_notes,
            started_at=now,
        )
        rv = review.model_dump()
        await db.menu_reviews.insert_one({**rv})
        return rv

    if rec["status"] == "not_started":
        await db.menu_reviews.update_one(
            {"dataset_id": dataset_id},
            {"$set": {"status": "in_progress", "started_at": now, "updated_at": now}},
        )
        rec.update({"status": "in_progress", "started_at": now})
    return {k: v for k, v in rec.items() if k != "_id"}


# ── Endpoint 5: Save row correction ───────────────────────────────────────

@api_router.post("/menu-review/corrections")
async def save_correction(body: CorrectionIn):
    if body.dataset_id not in _ARCHIVE_INDEX:
        raise HTTPException(404, f"dataset_id '{body.dataset_id}' not found")

    rec = await _get_or_create_review(body.dataset_id)
    review_id = rec["id"]
    now = datetime.now(timezone.utc)

    doc_corr = {
        "review_id": review_id,
        "dataset_id": body.dataset_id,
        "correction_type": "row",
        "row_no": body.row_no,
        "page_number": body.page_number,
        "action": body.action,
        "original_item_name": body.original_item_name,
        "original_rate": body.original_rate,
        "original_category": body.original_category,
        "original_issue_status": body.original_issue_status,
        "original_raw_text": body.original_raw_text,
        "corrected_item_name": body.corrected_item_name,
        "corrected_rate": body.corrected_rate,
        "corrected_category": body.corrected_category,
        "corrected_issue_status": body.corrected_issue_status,
        "reviewer_notes": body.reviewer_notes,
        "is_manual_add": body.is_manual_add,
        "updated_at": now,
    }

    # Upsert: one record per (dataset_id, correction_type, page_number, row_no)
    # Exception: add_missing rows always INSERT — they have no real row_no
    if body.action == "add_missing":
        doc_corr["id"] = str(uuid.uuid4())
        doc_corr["created_at"] = now
        await db.menu_review_corrections.insert_one({**doc_corr})
    else:
        filter_q = {"dataset_id": body.dataset_id, "correction_type": "row",
                    "page_number": body.page_number, "row_no": body.row_no}
        existing = await db.menu_review_corrections.find_one(filter_q, {"_id": 0})
        if existing:
            await db.menu_review_corrections.update_one(filter_q, {"$set": doc_corr})
            doc_corr["id"] = existing["id"]
        else:
            doc_corr["id"] = str(uuid.uuid4())
            doc_corr["created_at"] = now
            await db.menu_review_corrections.insert_one({**doc_corr})

    await db.menu_reviews.update_one(
        {"dataset_id": body.dataset_id}, {"$set": {"updated_at": now}}
    )
    return {k: v for k, v in doc_corr.items() if k != "_id"}


# ── Endpoint 6: Save note correction ──────────────────────────────────────

@api_router.post("/menu-review/note-corrections")
async def save_note_correction(body: NoteCorrectionIn):
    if body.dataset_id not in _ARCHIVE_INDEX:
        raise HTTPException(404, f"dataset_id '{body.dataset_id}' not found")

    rec = await _get_or_create_review(body.dataset_id)
    review_id = rec["id"]
    now = datetime.now(timezone.utc)

    doc_corr = {
        "review_id": review_id,
        "dataset_id": body.dataset_id,
        "correction_type": "note",
        "note_index": body.note_index,
        "note_page": body.note_page,
        "action": body.action,
        "original_note_text": body.original_note_text,
        "original_note_type": body.original_note_type,
        "corrected_note_text": body.corrected_note_text,
        "updated_at": now,
    }

    filter_q = {
        "dataset_id": body.dataset_id,
        "correction_type": "note",
        "note_index": body.note_index,
        "note_page": body.note_page,
    }
    existing = await db.menu_review_corrections.find_one(filter_q, {"_id": 0})
    if existing:
        await db.menu_review_corrections.update_one(filter_q, {"$set": doc_corr})
        doc_corr["id"] = existing["id"]
    else:
        doc_corr["id"] = str(uuid.uuid4())
        doc_corr["created_at"] = now
        await db.menu_review_corrections.insert_one({**doc_corr})

    await db.menu_reviews.update_one(
        {"dataset_id": body.dataset_id}, {"$set": {"updated_at": now}}
    )
    return {k: v for k, v in doc_corr.items() if k != "_id"}


# ── Endpoint 7: Progress stats ────────────────────────────────────────────

@api_router.get("/menu-review/documents/{dataset_id}/progress")
async def get_progress(dataset_id: str):
    doc = _ARCHIVE_INDEX.get(dataset_id)
    if not doc:
        raise HTTPException(404, f"dataset_id '{dataset_id}' not found")

    row_corr, note_corr = await _get_corrections(dataset_id)

    total_rows, total_notes = _doc_totals(doc)

    action_counts: Dict[str, int] = {}
    for c in row_corr.values():
        a = c.get("action", "unknown")
        action_counts[a] = action_counts.get(a, 0) + 1

    rows_reviewed = len(row_corr)
    notes_reviewed = len(note_corr)
    note_action_counts: Dict[str, int] = {}
    for c in note_corr.values():
        a = c.get("action", "unknown")
        note_action_counts[a] = note_action_counts.get(a, 0) + 1

    # Per-page breakdown
    per_page = []
    for page in doc["pages"]:
        pn = page["page_number"]
        page_row_nos = {r["row_no"] for r in page.get("rows", [])}
        reviewed_on_page = sum(1 for rn in page_row_nos if f"{pn}-{rn}" in row_corr)
        per_page.append({
            "page_number": pn,
            "total": len(page_row_nos),
            "reviewed": reviewed_on_page,
            "complete": reviewed_on_page == len(page_row_nos) and len(page_row_nos) > 0,
        })

    return {
        "dataset_id": dataset_id,
        "total_rows": total_rows,
        "total_notes": total_notes,
        "rows_approved": action_counts.get("approve", 0),
        "rows_edited": action_counts.get("edit", 0),
        "rows_deleted": action_counts.get("delete_hallucination", 0),
        "rows_unclear": action_counts.get("unclear", 0),
        "rows_out_of_scope": action_counts.get("out_of_scope", 0),
        "rows_added": action_counts.get("add_missing", 0),
        "rows_reviewed": rows_reviewed,
        "rows_remaining": total_rows - rows_reviewed,
        "progress_pct": round(rows_reviewed / total_rows * 100) if total_rows else 0,
        "notes_approved": note_action_counts.get("approve", 0),
        "notes_deleted": note_action_counts.get("delete", 0),
        "notes_out_of_scope": note_action_counts.get("out_of_scope", 0),
        "notes_reviewed": notes_reviewed,
        "notes_remaining": total_notes - notes_reviewed,
        "per_page": per_page,
    }


# ── Endpoint 8: Complete review ───────────────────────────────────────────

@api_router.post("/menu-review/documents/{dataset_id}/complete")
async def complete_review(dataset_id: str):
    doc = _ARCHIVE_INDEX.get(dataset_id)
    if not doc:
        raise HTTPException(404, f"dataset_id '{dataset_id}' not found")

    total_rows, _ = _doc_totals(doc)
    row_corr, _ = await _get_corrections(dataset_id)
    rows_remaining = total_rows - len(row_corr)
    unclear_count = sum(1 for c in row_corr.values() if c.get("action") == "unclear")

    now = datetime.now(timezone.utc)
    await db.menu_reviews.update_one(
        {"dataset_id": dataset_id},
        {"$set": {"status": "complete", "completed_at": now, "updated_at": now}},
        upsert=False,
    )

    rec = await db.menu_reviews.find_one({"dataset_id": dataset_id}, {"_id": 0})
    return {
        **(rec or {}),
        "rows_remaining": rows_remaining,
        "unclear_rows": unclear_count,
        "warning": "UNCLEAR_ROWS_REMAIN" if unclear_count > 0 else None,
    }


# ── Endpoint 9: Export corrected JSON ────────────────────────────────────

@api_router.get("/menu-review/documents/{dataset_id}/export")
async def export_corrected(dataset_id: str):
    doc = _ARCHIVE_INDEX.get(dataset_id)
    if not doc:
        raise HTTPException(404, f"dataset_id '{dataset_id}' not found")

    row_corr, note_corr = await _get_corrections(dataset_id)

    # Counters
    approved = edited = deleted = added = unclear = out_of_scope = 0
    final_pages = []

    for page in doc["pages"]:
        final_rows = []
        for row in page.get("rows", []):
            c = row_corr.get(f"{page['page_number']}-{row['row_no']}")
            if c and c["action"] == "delete_hallucination":
                deleted += 1
                continue
            row_out = dict(row)
            if c:
                row_out["review_action"] = c["action"]
                if c["action"] == "edit":
                    if c.get("corrected_item_name") is not None:
                        row_out["item_name"] = c["corrected_item_name"]
                    if c.get("corrected_rate") is not None:
                        row_out["rate"] = c["corrected_rate"]
                    if c.get("corrected_category") is not None:
                        row_out["category"] = c["corrected_category"]
                    if c.get("reviewer_notes"):
                        row_out["reviewer_notes"] = c["reviewer_notes"]
                    edited += 1
                elif c["action"] == "approve":
                    approved += 1
                elif c["action"] == "unclear":
                    unclear += 1
                elif c["action"] == "out_of_scope":
                    out_of_scope += 1
            else:
                row_out["review_action"] = "pending"
            final_rows.append(row_out)

        # Manually added rows
        for c in row_corr.values():
            if c.get("action") == "add_missing" and c.get("page_number") == page["page_number"]:
                final_rows.append({
                    "row_no": None,
                    "item_name": c.get("corrected_item_name", ""),
                    "category": c.get("corrected_category", ""),
                    "rate": c.get("corrected_rate"),
                    "currency": "INR",
                    "raw_text": None,
                    "confidence": "manual",
                    "issue_status": "manual",
                    "source_grounded": False,
                    "variant_warning": False,
                    "addon_warning": False,
                    "tax_note_warning": False,
                    "notes": c.get("reviewer_notes", ""),
                    "review_action": "add_missing",
                    "is_manual_add": True,
                })
                added += 1

        # Notes
        final_notes = []
        for idx, note in enumerate(page.get("menu_notes", [])):
            key = f"{page['page_number']}-{idx}"
            c = note_corr.get(key)
            if c and c["action"] == "delete":
                continue
            note_out = {**note, "note_index": idx}
            if c:
                note_out["review_action"] = c["action"]
                if c.get("corrected_note_text"):
                    note_out["note_text"] = c["corrected_note_text"]
            else:
                note_out["review_action"] = "pending"
            final_notes.append(note_out)

        final_pages.append({
            "page_number": page["page_number"],
            "rows": final_rows,
            "menu_notes": final_notes,
        })

    total_original_rows, total_original_notes = _doc_totals(doc)
    final_row_count = sum(len(p["rows"]) for p in final_pages)

    export = {
        "export_version": "review-tool-v1",
        "dataset_id": dataset_id,
        "source_file": doc["source_file"],
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "review_summary": {
            "total_original_rows": total_original_rows,
            "approved": approved,
            "edited": edited,
            "deleted": deleted,
            "added": added,
            "unclear": unclear,
            "out_of_scope": out_of_scope,
            "final_row_count": final_row_count,
        },
        "pages": final_pages,
    }

    filename = f"{dataset_id}_corrected.json"
    json_bytes = json.dumps(export, indent=2, default=str).encode("utf-8")
    return StreamingResponse(
        io.BytesIO(json_bytes),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""},
    )


# ── Update current_page helper (called by frontend when page changes) ─────

@api_router.patch("/menu-review/documents/{dataset_id}/page")
async def update_current_page(dataset_id: str, page: int):
    if dataset_id not in _ARCHIVE_INDEX:
        raise HTTPException(404, f"dataset_id '{dataset_id}' not found")
    now = datetime.now(timezone.utc)
    await db.menu_reviews.update_one(
        {"dataset_id": dataset_id},
        {"$set": {"current_page": page, "updated_at": now}},
    )
    return {"dataset_id": dataset_id, "current_page": page}


# ═══════════════════════════════════════════════════════════════════════════

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
