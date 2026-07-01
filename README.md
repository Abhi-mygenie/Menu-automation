# Menu Automation

React 19 + FastAPI + MongoDB project for processing restaurant menu PDFs.

- **Branch checked out:** `7-may`
- **Upstream:** https://github.com/Abhi-mygenie/Menu-automation
- **Status dashboard:** the frontend root (`/`) shows live API / Mongo / dataset health.
- **Datasets:** 33 bundled menu PDFs under `datasets/menus_raw/v0.1.0-PROPOSED/batch-XX/`.

## Quick start

```bash
# 1) Local dev (services already running under supervisor in this env)
sudo supervisorctl status

# 2) Production build (frontend bundle)
cd frontend && yarn build

# 3) Full Docker stack
cp .env.example .env       # then edit secrets
docker-compose up --build -d
curl -fsS http://localhost/api/health
```

Full handover docs → **[`DEPLOYMENT.md`](./DEPLOYMENT.md)**.

## Top-level layout

```
backend/         FastAPI service       (port 8001, mounts /api)
frontend/       React 19 SPA          (port 3000 dev / 80 prod via nginx)
datasets/       Bundled menu PDFs     (read-only inputs)
Dockerfile.*    Production images
docker-compose.yml + nginx.conf
DEPLOYMENT.md   Handover guide
```
