from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
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
