# Menu Automation — PRD

## Original Problem Statement
Pull code from https://github.com/Abhi-mygenie/Menu-automation.git (branch: main), wipe local /app and pull here directly, preserve platform folder and files, understand structure from repo, deploy and run the code.

## Architecture
- **Frontend**: React 19 + CRACO + Tailwind CSS (port 3000)
- **Backend**: FastAPI + Motor/MongoDB (port 8001, uvicorn)
- **Database**: MongoDB (port 27017)
- **Supervisor**: manages all services

## What Was Done (2026-07-01)
1. Cloned https://github.com/Abhi-mygenie/Menu-automation.git to /tmp
2. rsync'd repo to /app (excluding .git, .emergent from repo)
3. Preserved platform files: .emergent/, .git/, frontend/.env, backend/.env
4. Installed Python deps (`pip install -r requirements.txt`)
5. Installed Node deps (`yarn install`)
6. Fixed webpack-dev-server v5 incompatibility in `craco.config.js`:
   - `onBeforeSetupMiddleware` → `setupMiddlewares`
   - `onAfterSetupMiddleware` → `setupMiddlewares`
   - `https` option → `server.type`
7. Restarted all services via supervisor

## App Structure
- **Home page**: Setup & handover dashboard — API health, MongoDB status, dataset stats
- **Review Tool**: AI Extraction Review — lists 5 smoke-set documents for human review
  - Each doc shows pages, rows, notes, progress %
  - Review workspace: inline edit, approve, delete-hallucination, add-missing
  - PDF viewer alongside review table
  - Export corrected JSON
- **Datasets**: 33 PDF menu files in 7 batches under `/app/datasets/menus_raw/`
- **Memory docs**: Extensive planning docs in `/app/memory/`

## Environment
- Frontend URL: https://menu-app-build.preview.emergentagent.com
- Backend URL: https://menu-app-build.preview.emergentagent.com/api
- MONGO_URL: mongodb://localhost:27017
- DB_NAME: test_database

## Core Requirements
- [x] Repo pulled and deployed
- [x] Backend running (FastAPI on :8001)
- [x] Frontend running (React on :3000)
- [x] MongoDB connected
- [x] Review Tool functional with 5 smoke documents
- [x] Datasets loaded (33 PDFs, 7 batches)

## Backlog / Next Items
- Run review on the 5 smoke set documents
- Export corrected JSON after review
- Import corrected data to POS system
- Extend smoke set to full batch dataset
