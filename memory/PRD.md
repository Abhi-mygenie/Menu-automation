# PRD — Menu Automation (setup & handover)

## Original problem statement
> Act as a senior full-stack engineer. Clone the repository
> https://github.com/Abhi-mygenie/Menu-automation.git (branch `7-may`),
> install dependencies, set up React + Python + Mongo, build and run the project
> fixing any errors, prepare a production-ready build and Docker setup,
> generate clear deployment documentation for handover to the next team.

## User choices captured
- Branch: **7-may**
- Strategy: clone into `/app` replacing the template
- API keys / env: defaults
- Docker setup: defaults (compose + Dockerfiles + nginx)
- Deployment docs: defaults (single `DEPLOYMENT.md` at repo root)

## Architecture
- **Backend** — FastAPI (Python 3.11) served by uvicorn on `:8001`. All routes mounted under `/api`. Mongo via `motor` async driver. Reads `MONGO_URL`, `DB_NAME`, optional `DATASETS_DIR` and `CORS_ORIGINS` from `backend/.env`.
- **Frontend** — React 19 + CRA (craco) + Tailwind + shadcn UI. Calls backend through `REACT_APP_BACKEND_URL`. Production bundle served by nginx in the Docker image; nginx also reverse-proxies `/api/*` to the backend service.
- **Database** — MongoDB 7 (containerised in compose, named volume `mongo_data`).
- **Datasets** — 33 menu PDFs across 7 batches under `datasets/menus_raw/v0.1.0-PROPOSED/`. Bundled into the backend image; surfaced by `/api/datasets/stats`.

## User personas
- **Next dev team** — picks up the repo, expects working dev environment + clear deploy story.
- **DevOps / SRE** — needs Docker + env-var contract + healthchecks for production rollout.

## Core (static) requirements
1. Repo cloned, deps installed, services running locally.
2. Production frontend build verified.
3. Backend has health probe.
4. Docker images for backend & frontend, plus compose with Mongo.
5. Comprehensive deployment / handover document.

## What's been implemented (2026-02-06)
- Cloned `7-may` of `Abhi-mygenie/Menu-automation` and merged into `/app` (datasets, configs).
- Added `/api/health` (Mongo ping) and `/api/datasets/stats` endpoints.
- Replaced placeholder UI with a status dashboard (live API/Mongo/datasets pills, batch breakdown, quickstart card) using shadcn-friendly Tailwind utilities, mono typography, light theme.
- Authored `Dockerfile.backend` (python:3.11-slim + curl healthcheck on `/api/health`).
- Authored `Dockerfile.frontend` (multi-stage node:20-alpine → nginx:1.27-alpine, takes `REACT_APP_BACKEND_URL` build arg).
- Authored `nginx.conf` (SPA fallback, gzip, `/api` proxy to `backend:8001`, edge `/healthz`).
- Authored `docker-compose.yml` (mongo + backend + frontend with healthchecks, env contract documented).
- Added `.dockerignore` and `.env.example`.
- Wrote `DEPLOYMENT.md` (10 sections incl. troubleshooting + handover checklist) and refreshed `README.md`.
- Verified production build (`yarn build` — 93 KB gzipped JS) and live API (`/api/health` → ok, `/api/datasets/stats` → 33 files / 7 batches).
- Testing agent (iteration 1): 100% backend, 100% frontend pass.

## Backlog
### P1 (immediate next sprint)
- Implement menu-extraction pipeline (PDF → structured JSON) over `datasets/menus_raw/`.
- Replace `CORS_ORIGINS=*` with real frontend origin in production env.
- Add CI (GitHub Actions): lint + pytest + docker build + push.

### P2
- Add auth (JWT or Emergent Google OAuth) before any public exposure.
- Migrate Mongo to a managed service (Atlas / DocumentDB) for production.
- Migrate FastAPI lifecycle from deprecated `@app.on_event` to `lifespan` context manager.
- Drop the legacy `version: '3.9'` key in `docker-compose.yml`.

### P3
- Add metrics/observability (OpenTelemetry, Prometheus exporter).
- Author an admin UI for browsing extracted menu items + manual corrections.

## Next tasks
1. Confirm handover with next team using `DEPLOYMENT.md` §10 checklist.
2. Pick up P1 #1 — design the PDF-extraction service interface.
