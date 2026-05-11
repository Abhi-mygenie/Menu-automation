# Menu Automation — Deployment Handover (E1 Deployment Agent)

**Date:** 2026-05-11
**Performed by:** E1 Deployment Agent
**Scope:** Pull → install → configure → build → run → verify. No QA, no refactor, no business-logic changes.

---

## 1. Source

| Item | Value |
|---|---|
| Repo | `https://github.com/Abhi-mygenie/Menu-automation.git` |
| Branch | `12-may` (strictly, per user instruction) |
| Latest commit | `f05c6f4 Auto-generated changes` |
| Visibility | Public (no token required) |
| Clone target | `/app` (existing template wiped first) |

> Note: The prompt mentioned both `12-may` and `7-may`. The user explicitly clarified: **"12-may strictly"**. The in-app page still renders a static label "branch 7-may" — this is hardcoded copy in the React page from a prior commit on this branch and was **not** modified (out of scope).

---

## 2. Stack

- **Frontend:** React 19 + CRA (CRACO) + Tailwind + shadcn/ui — port `3000`
- **Backend:** FastAPI + Motor (async MongoDB) — port `8001`, all routes mounted under `/api`
- **Database:** MongoDB local — `mongodb://localhost:27017`, db `test_database`
- **Process manager:** Supervisor (managed by the container; do not start servers manually)

---

## 3. Steps Executed

1. Backed up existing `/app/backend/.env` and `/app/frontend/.env` to `/tmp/*.env.bak`.
2. Stopped supervisor `frontend` and `backend`.
3. Wiped `/app` entirely.
4. `git clone --branch 12-may --single-branch https://github.com/Abhi-mygenie/Menu-automation.git` → moved into `/app`.
5. Restored `.env` files at `/app/backend/.env` and `/app/frontend/.env` (`.env` files are gitignored — see §4).
6. Backend deps: `pip install -r /app/backend/requirements.txt` (all already satisfied in the pod's venv; `emergentintegrations==0.1.0` resolved).
7. Frontend deps: `cd /app/frontend && yarn install` (yarn 1.22.22, 55s, lockfile written).
8. `sudo supervisorctl start backend frontend` → both `RUNNING`.
9. Verified endpoints (see §6).

No code changes were made.

---

## 4. Environment Variables (placeholders / local values)

### `/app/backend/.env`
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"
```
- `MONGO_URL` / `DB_NAME` — using local Mongo instance bundled with the pod (per user instruction).
- `CORS_ORIGINS` — wildcard for now. **PLACEHOLDER for production** — restrict to actual domain(s).

### `/app/frontend/.env`
```
REACT_APP_BACKEND_URL=https://154661f4-dd31-4b7c-8c49-fbca2705d23a.preview.emergentagent.com
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```
- `REACT_APP_BACKEND_URL` — Emergent preview URL (Kubernetes ingress routes `/api/*` to backend:8001 and the rest to frontend:3000). **PLACEHOLDER for production** — set to your own domain.

### Optional / not currently used (placeholders if needed later)
| Var | Purpose | Where used |
|---|---|---|
| `DATASETS_DIR` | Override path of the menu PDF corpus | `backend/server.py` (defaults to `/app/datasets`) |
| `EMERGENT_LLM_KEY` | LLM access via `emergentintegrations` | Required only if LLM features are exercised (none active in this branch's endpoints) |

---

## 5. Service Status

```
backend                          RUNNING   pid 630
code-server                      RUNNING   pid 199
frontend                         RUNNING   pid 634
mongodb                          RUNNING   pid 201
nginx-code-proxy                 RUNNING   pid 197
```

---

## 6. Verification

### Internal (in-pod)
| Check | Result |
|---|---|
| `GET http://localhost:8001/api/` | `{"message":"Menu Automation API is running","docs":"/docs"}` |
| `GET http://localhost:8001/api/health` | `{"status":"ok","mongo":"ok",...}` |
| `GET http://localhost:8001/api/datasets/stats` | `exists=True, total_files=33, batches=7` |
| `GET http://localhost:3000/` | HTTP 200, HTML served |

### External (Kubernetes ingress)
| Check | Result |
|---|---|
| `GET https://<host>/api/health` | HTTP 200, mongo ok |
| `GET https://<host>/` | HTTP 200, React app renders |

### UI sanity (screenshot captured)
- Hero: "Menu Automation — setup & handover"
- Three green status pills: **API Online**, **MongoDB Connected**, **Datasets Ready**
- Backend card: service=`menu-automation-backend`, status=`ok`, port=`8001`
- MongoDB card: connection=`ok`, driver=`motor 3.3.1`, port=`27017`
- Datasets card: `total menus = 33`, `batches = 7`, `format = PDF`
- Dataset breakdown lists 7 batches (`v0.1.0-PROPOSED/batch-01…07`) under `/app/datasets/menus_raw`

---

## 7. Endpoints Available

All routes prefixed with `/api`:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/` | Service banner |
| GET | `/api/health` | Liveness + Mongo ping |
| GET | `/api/datasets/stats` | Counts of bundled menu PDFs by batch |
| POST | `/api/status` | Create `StatusCheck` record (Mongo `status_checks`) |
| GET | `/api/status` | List `StatusCheck` records |

Swagger UI: `https://<host>/docs` (routed via backend).

---

## 8. Build Artifacts

- A production frontend build was **not** generated in this pod (dev server is what supervisor runs). To produce one:
  ```bash
  cd /app/frontend && yarn build      # outputs build/ for nginx
  ```
- Docker artifacts are present and untouched: `Dockerfile.backend`, `Dockerfile.frontend`, `docker-compose.yml`, `nginx.conf`. They are documented in the repo's `DEPLOYMENT.md` and are not in scope here.

---

## 9. Known Notes / Gotchas (no fixes applied — pure observations)

1. **Static "7-may" label in UI.** The hero badge and page text show `7-may` though we deployed `12-may`. It's hardcoded React copy from an earlier commit on the branch. Out of scope to change.
2. **`CORS_ORIGINS=*`.** Acceptable for the preview environment; tighten for production.
3. **`emergentintegrations==0.1.0` in requirements.** Imported by the project's package surface but no active endpoint in this branch uses LLMs. Safe; no key required for current runtime.
4. **`.env` files are gitignored** in the repo — recreated by this agent with the values listed in §4. Document these values in your secrets manager before redeploying elsewhere.
5. **Yarn peer-dep warnings.** Standard CRA/eslint noise; install succeeded, app compiles cleanly ("webpack compiled successfully").
6. **Backups.** Pre-wipe env backups left at `/tmp/backend.env.bak` and `/tmp/frontend.env.bak`.

---

## 10. How To Restart / Re-deploy

```bash
# Restart services (e.g. after .env edits)
sudo supervisorctl restart backend frontend

# Check status
sudo supervisorctl status

# Tail logs
tail -n 100 /var/log/supervisor/backend.*.log
tail -n 100 /var/log/supervisor/frontend.*.log

# Re-pull latest 12-may (preserves env files since they are gitignored)
cd /app && git fetch origin && git reset --hard origin/12-may
cd /app/backend && pip install -r requirements.txt
cd /app/frontend && yarn install
sudo supervisorctl restart backend frontend
```

---

## 11. Handover Result

✅ Deployment **successful** on branch `12-may`.
✅ Frontend + Backend + MongoDB all reachable internally and through the external preview URL.
✅ No business-logic or feature changes were made.
🔁 Next agent: pick up from a clean, running base. Refer to §4 for env vars to replace with real secrets before any production cutover.
