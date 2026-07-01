# Menu Automation — Deployment & Handover Guide

> Repository: https://github.com/Abhi-mygenie/Menu-automation
> Branch: `7-may`
> Stack: **React 19 (CRA + craco)** · **FastAPI (Python 3.11)** · **MongoDB 7** · **Docker / docker-compose**

This document is the handover for the next team. It covers local development, the production build, the Docker setup that ships in this repo, environment variables, smoke-tests and troubleshooting.

---

## 1. Repository layout

```
.
├── backend/                      FastAPI service
│   ├── server.py                 App entrypoint (mounts /api router)
│   ├── requirements.txt          Python deps (pinned)
│   └── .env                      MONGO_URL, DB_NAME, CORS_ORIGINS
├── frontend/                     React 19 SPA (CRA + craco)
│   ├── src/                      App.js, components/ui (shadcn)
│   ├── package.json              Yarn-managed deps
│   ├── craco.config.js           Webpack/CRA overrides + visual-edits plugin
│   └── .env                      REACT_APP_BACKEND_URL
├── datasets/                     Bundled menu PDFs (33 files, ~185 MB)
│   └── menus_raw/v0.1.0-PROPOSED/batch-XX/*.pdf
├── Dockerfile.backend            Python 3.11 + uvicorn image
├── Dockerfile.frontend           Multi-stage: yarn build → nginx
├── nginx.conf                    SPA fallback + /api reverse proxy
├── docker-compose.yml            mongo + backend + frontend
├── .env.example                  Sample env for docker-compose
└── DEPLOYMENT.md                 this file
```

---

## 2. Prerequisites

| Tool          | Version              | Notes                                                |
|---------------|----------------------|------------------------------------------------------|
| Docker Engine | 24+ (with compose v2)| Production deployment                                |
| Node.js       | 20.x                 | Local dev only (Docker bakes its own)                |
| Yarn          | 1.22.x               | **Do not use npm** — `package.json` scripts assume yarn |
| Python        | 3.11                 | Local dev only                                       |
| MongoDB       | 7.x                  | Provided as a container in compose                   |

---

## 3. Environment variables

All secrets/config are env-driven. Never commit real secrets.

### 3.1 Backend (`backend/.env`)

| Key            | Required | Example                              | Description                         |
|----------------|----------|--------------------------------------|-------------------------------------|
| `MONGO_URL`    | yes      | `mongodb://localhost:27017`          | Mongo connection string             |
| `DB_NAME`      | yes      | `menu_automation`                    | Logical database name               |
| `CORS_ORIGINS` | no       | `http://localhost,https://app.tld`   | Comma-separated allowed origins (`*` ok in dev) |
| `DATASETS_DIR` | no       | `/app/datasets`                      | Override path to the menus dataset  |

### 3.2 Frontend (`frontend/.env`)

| Key                      | Required | Example                          | Description                                                                 |
|--------------------------|----------|----------------------------------|-----------------------------------------------------------------------------|
| `REACT_APP_BACKEND_URL`  | yes (dev)| `http://localhost:8001`          | Absolute backend URL (CRA bakes this at build time)                         |
| `WDS_SOCKET_PORT`        | no       | `443`                            | Dev-server HMR socket port (preview environments)                           |
| `ENABLE_HEALTH_CHECK`    | no       | `false`                          | Toggles the in-repo webpack health plugin                                   |

> When deployed via `docker-compose`, leave `REACT_APP_BACKEND_URL` **empty** — the frontend container's nginx proxies `/api/*` to the backend service on the internal Docker network.

### 3.3 docker-compose root `.env`

Copy from `.env.example`:

```bash
cp .env.example .env
# edit MONGO_INITDB_ROOT_PASSWORD, DB_NAME, CORS_ORIGINS, etc.
```

---

## 4. Local development

Two supported flows.

### 4.1 Native (host services)

```bash
# 1) MongoDB - either install locally OR run a one-off container
docker run -d --name mongo -p 27017:27017 mongo:7

# 2) Backend
cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Make sure backend/.env has MONGO_URL + DB_NAME
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# 3) Frontend (in another shell)
cd frontend
yarn install
# Make sure frontend/.env has REACT_APP_BACKEND_URL=http://localhost:8001
yarn start
```

App → http://localhost:3000 · API → http://localhost:8001/api · Docs → http://localhost:8001/docs

### 4.2 Emergent preview (this container)

Services are managed by **supervisor** and hot-reload on save:

```bash
sudo supervisorctl status
#   backend    RUNNING
#   frontend   RUNNING
#   mongodb    RUNNING

# Restart only after editing .env or installing deps
sudo supervisorctl restart backend
sudo supervisorctl restart frontend

# Live logs
tail -f /var/log/supervisor/backend.*.log
tail -f /var/log/supervisor/frontend.*.log
```

---

## 5. Production build

### 5.1 Frontend bundle

```bash
cd frontend
REACT_APP_BACKEND_URL="https://api.your-domain.tld" \
ENABLE_HEALTH_CHECK=false \
yarn build
# Output: frontend/build/  (static, hashed assets — serve behind any CDN/Nginx)
```

### 5.2 Backend (uvicorn)

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4
```

For production prefer running uvicorn behind a process manager (systemd, gunicorn-w-uvicorn-workers, or the Docker image below).

---

## 6. Docker deployment (recommended)

The repo ships three artifacts:

- `Dockerfile.backend` — Python 3.11 image, runs uvicorn on `:8001`, has a `/api/health` HEALTHCHECK.
- `Dockerfile.frontend` — multi-stage: `node:20` builds CRA → `nginx:1.27` serves it; `nginx.conf` reverse-proxies `/api/*` to the backend service.
- `docker-compose.yml` — wires `mongo` + `backend` + `frontend` together with healthchecks and a named volume for Mongo data.

### 6.1 First-time deploy

```bash
# 1) Configure
cp .env.example .env
$EDITOR .env             # set MONGO password, DB_NAME, CORS_ORIGINS

# 2) Build & start
docker-compose up --build -d

# 3) Verify
docker-compose ps                            # all 3 should be "healthy"
curl -fsS http://localhost/healthz           # frontend edge probe
curl -fsS http://localhost/api/health        # full stack probe (proxied through nginx)
curl -fsS http://localhost/api/datasets/stats | jq '.total_files'

# 4) Open
xdg-open http://localhost                    # or just visit in a browser
```

### 6.2 Common operations

```bash
# Tail logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Apply code changes (rebuild only what changed)
docker-compose up --build -d backend
docker-compose up --build -d frontend

# Stop everything (data volume preserved)
docker-compose down

# DESTRUCTIVE: also drop the Mongo data volume
docker-compose down -v
```

### 6.3 Image-only (no compose)

```bash
docker build -f Dockerfile.backend  -t menu-backend:latest  .
docker build -f Dockerfile.frontend -t menu-frontend:latest \
  --build-arg REACT_APP_BACKEND_URL=https://api.your-domain.tld .

# Run with an external Mongo
docker run -d --name menu-backend -p 8001:8001 \
  -e MONGO_URL="mongodb://user:pass@your-mongo:27017/?authSource=admin" \
  -e DB_NAME=menu_automation \
  -e CORS_ORIGINS=https://app.your-domain.tld \
  menu-backend:latest

docker run -d --name menu-frontend -p 80:80 menu-frontend:latest
```

---

## 7. Reverse proxy / TLS

The bundled `nginx.conf` runs **inside** the frontend container and listens on `:80`. For internet-facing deploys put a TLS-terminating proxy in front (Caddy, Traefik, AWS ALB, Cloudflare, etc.) and forward to the frontend container on port 80. No code changes needed; only set `CORS_ORIGINS` on the backend to your public hostname(s).

---

## 8. Verification (smoke tests)

```bash
# Backend health (also pings Mongo)
curl -s http://localhost:8001/api/health | jq
# {"status":"ok","service":"menu-automation-backend","mongo":"ok",...}

# Round-trip Mongo write
curl -s -X POST http://localhost:8001/api/status \
  -H 'Content-Type: application/json' \
  -d '{"client_name":"smoke-test"}' | jq

# Read it back
curl -s http://localhost:8001/api/status | jq '.[0]'

# Datasets are bundled in the image
curl -s http://localhost:8001/api/datasets/stats | jq '{total_files, batches: (.batches|length)}'
# { "total_files": 33, "batches": 7 }
```

The frontend dashboard at `/` shows live status pills for API / Mongo / Datasets and a per-batch breakdown of the bundled menu PDFs.

---

## 9. Troubleshooting

| Symptom                                          | Likely cause                                                  | Fix                                                                                              |
|--------------------------------------------------|---------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| `KeyError: 'MONGO_URL'` on backend boot          | `backend/.env` missing or not loaded                          | Confirm `backend/.env` exists; in Docker confirm env vars set on the `backend` service.          |
| Frontend loads but API calls fail with CORS      | `CORS_ORIGINS` doesn't include the frontend origin            | Set `CORS_ORIGINS=https://your-frontend.tld` (comma-separated for multiple).                     |
| Frontend calls go to `undefined/api/...`         | `REACT_APP_BACKEND_URL` was empty at build time **and** not behind the nginx proxy | Either rebuild with `--build-arg REACT_APP_BACKEND_URL=...` or run via docker-compose so nginx proxies `/api`. |
| `mongo` container marked unhealthy               | Auth env vars changed against an existing volume              | `docker-compose down -v` to wipe (DESTRUCTIVE) or align creds with the stored `admin` user.      |
| `yarn: command not found` in dev                 | Project uses yarn classic, not npm                            | `corepack enable` or `npm i -g yarn@1.22`. **Never run `npm install` here.**                     |
| Build OOM in Docker                              | CRA build is memory-hungry                                    | Give Docker ≥4 GB RAM or build the image on a beefier host and `docker push`.                    |
| Health endpoint returns `{"mongo":"error: ..."}` | Backend can't reach Mongo                                     | Check `MONGO_URL`, network, firewall; in compose ensure the `backend` service waits for `mongo` healthy (already configured). |
| Hot reload not picking up `.env` change          | `.env` is read on process start                               | `sudo supervisorctl restart backend` (or `frontend`).                                            |

---

## 10. Handover checklist

- [x] Repo cloned from upstream `7-may` branch
- [x] Backend (`uvicorn`) running on `:8001`, `/api/health` returns `ok`
- [x] Frontend (`craco start`) running on `:3000`, status dashboard loads
- [x] MongoDB running on `:27017`, write/read round-trip verified
- [x] Production frontend build verified (`yarn build` succeeds)
- [x] `Dockerfile.backend`, `Dockerfile.frontend`, `nginx.conf`, `docker-compose.yml` in repo root
- [x] `.env.example` provided; real `.env` excluded from git
- [x] `/api/datasets/stats` enumerates the 33 bundled menu PDFs
- [x] This document (`DEPLOYMENT.md`) committed to the repo

**Next team owns:**

1. Implement the menu-extraction pipeline (PDF → structured items) against `datasets/menus_raw/`.
2. Add auth (JWT or Emergent Google) before exposing publicly.
3. Wire CI/CD (GitHub Actions → registry → compose pull on host).
4. Replace the dev `CORS_ORIGINS=*` with the real frontend origin.
5. Move Mongo to a managed service (Atlas / DocumentDB) for production.

---

_Last updated: setup complete on environment provisioning. See `git log` for change history._
