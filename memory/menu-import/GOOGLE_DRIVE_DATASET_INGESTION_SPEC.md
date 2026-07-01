# MyGenie POS — Google Drive Dataset Ingestion Specification

**Document version:** 1.0
**Status:** Planning only. **Do not implement. Do not access Drive yet. Do not commit secrets.**
**Phase:** 0C — Menu Dataset Preparation.
**Audience:** Menu Dataset Preparation Agent (future), Sec, Ops.

---

## 1. Service Account Setup Assumptions

The following are **assumed** to be done out-of-band by the owner before Phase 0C executes:

1. A Google Cloud project exists for MyGenie internal tooling.
2. A **Service Account** has been created in that project, dedicated to dataset ingestion. Suggested name: `menu-dataset-readonly@<gcp-project>.iam.gserviceaccount.com`.
3. The service account has the minimum role needed; **`drive.readonly`** scope is sufficient when the Drive folder is shared with it.
4. The service account JSON key has been generated **once** and is stored securely (Secrets Manager / mounted file). The key file is **never** committed to git.
5. The owner has **shared** the dataset Drive folder with the service account email at **Viewer** (read-only) permission.
6. The owner has obtained the **folder ID** (the long opaque string in the Drive URL) and provided it via env var (not in chat / docs).

> If any of (1)–(6) is not done, Phase 0C cannot proceed.

---

## 2. Required Drive Permissions

- Service account: **`https://www.googleapis.com/auth/drive.readonly`** (sufficient).
- Folder access: **Viewer** on the dataset folder (and any subfolders if separately shared).
- The service account **must not** have edit/delete access. Read-only is mandatory by policy.

If multiple ingest environments exist (pre-prod / prod), each environment uses its **own** service account credential file pointing at the **same** Drive folder; this prevents one environment's credential exposure from compromising the others.

---

## 3. Drive Folder ID Usage

- Resolved at runtime from `GOOGLE_DRIVE_DATASET_FOLDER_ID` env var.
- The id is treated as **non-sensitive** but **internal**; it is not published in marketing or external docs.
- The ingest tool walks the folder recursively (depth-first), respecting the env-defined `MENU_DATASET_MAX_DEPTH` (default `5`).

---

## 4. Supported File MIME Types

Allowed (gating set; everything else rejected as `unsupported`):

| Extension | MIME |
|---|---|
| `.pdf` | `application/pdf` |
| `.jpg`, `.jpeg` | `image/jpeg` |
| `.png` | `image/png` |

Configurable via `MENU_DATASET_ALLOWED_MIME_TYPES`. Adding `image/webp` or `image/heic` is a future toggle (not in initial Phase 0C).

> Google Drive native types (`application/vnd.google-apps.document`, `…spreadsheet`, etc.) are **rejected**. Owner must export Drive Docs to PDF before placing in the folder.

---

## 5. File Discovery Strategy

Pseudocode of the discovery pass (planning only — not code):

```
authenticate(service_account_json)
folder_id = env.GOOGLE_DRIVE_DATASET_FOLDER_ID
dataset_version = generate_version_stamp()       # e.g. v0.1.0-2026-01-22T10:00Z

queue = [folder_id]
inventory = []

while queue not empty:
    parent = queue.pop()
    page_token = null
    repeat:
        list = drive.list(
            q = f"'{parent}' in parents and trashed=false",
            fields = "nextPageToken, files(id, name, mimeType, size, modifiedTime)",
            page_size = 1000,
            page_token = page_token
        )
        for entry in list.files:
            if entry.mimeType == "application/vnd.google-apps.folder":
                queue.append(entry.id)
            else:
                inventory.append(meta(entry, parent, dataset_version))
        page_token = list.nextPageToken
    until page_token is null

return inventory
```

`meta(entry, parent, dataset_version)` constructs the inventory row described in `MENU_DATASET_PREPARATION_PLAN.md §7`, with `processing_status="inventoried"`.

---

## 6. Download / Copy Strategy

For each inventoried file:

1. Validate MIME against allow-list. If not allowed → `processing_status=unsupported`, no download.
2. Validate size against `MENU_DATASET_MAX_FILE_SIZE_MB`. If oversized → `processing_status=oversized`, no download.
3. Stream-download to a temp file using the service account token.
4. Compute SHA-256 of the file bytes.
5. Resolve target path:
   - **Pre-prod:** `MENU_DATASET_LOCAL_STORAGE_PATH/{dataset_version}/{drive_file_id}/{file_name}`
   - **Prod:** `s3://{MENU_DATASET_S3_BUCKET}/{dataset_version}/{drive_file_id}/{file_name}` (KMS-encrypted at rest).
6. Move temp file to target path (rename within filesystem in pre-prod; multipart upload in prod).
7. Update inventory row: `processing_status=copied`, `local_storage_path` or `storage_ref` set, `sha256` set.
8. Errors during download → `processing_status=failed`, `notes` populated; the inventory continues with other files.

**Drive file is never modified**: read-only credentials cannot mutate, but as a defense-in-depth the ingest code path also has no `drive.update`/`drive.delete` calls.

---

## 7. File Naming Strategy (in controlled storage)

- Source file name **preserved** (sanitized: trim, replace `/` and control chars with `_`).
- Path includes `dataset_version` and `drive_file_id` to avoid name collisions across runs and to keep historical reproducibility.
- Optional `notes` field on the inventory row records the original Drive folder path for traceability.
- **No PII derivation.** File names are never used to infer restaurant identity downstream.

Example pre-prod path:

```
/app/datasets/menus_raw/v0.1.0-2026-01-22T10:00Z/1A2bC3.../paneer-special-menu.pdf
```

---

## 8. Duplicate Detection

Two layers:

### 8.1 Same-version dedup
Within a single `dataset_version` ingest:
- Two files with same `sha256` → second is marked `processing_status=duplicate`, copy skipped.
- Two files with same `(file_name, size_bytes)` but different content → flagged in `notes` for human review (likely re-saved versions).

### 8.2 Cross-version dedup
Against prior inventoried versions:
- If a file with same `sha256` already exists in a prior `dataset_version`, the new version still inventories it (so the new manifest is self-contained), but the row's `notes` records `cross_version_duplicate_of=<prior_dataset_version>`.
- This prevents human reviewers from re-labelling identical files redundantly.

Duplicates are **never deleted** automatically.

---

## 9. Checksum Strategy

- Algorithm: **SHA-256** (industry standard, collision-safe for this use).
- Computed **after** download, on the bytes written to controlled storage. The Drive `md5Checksum` (when available) is also recorded in `notes` for cross-check, but SHA-256 is canonical for our purposes.
- Used by §8 dedup, §11 audit, and runtime menu-import dedup compatibility.

---

## 10. Unsupported File Handling

- Files with disallowed MIME types are inventoried (so the human reviewer can see what's in the source folder) but not downloaded.
- `processing_status=unsupported`, `notes` lists the disallowed MIME.
- The whole inventory run does **not** fail because of one unsupported file.
- Owner can take action: re-export to PDF, remove from folder, or update `MENU_DATASET_ALLOWED_MIME_TYPES` with security review.

---

## 11. Error Handling

| Failure | Behavior |
|---|---|
| Service account auth fails | Whole run fails fast with `INVALID_CREDENTIALS`. No partial state. |
| Drive folder not visible to service account | Whole run fails fast with `FOLDER_NOT_FOUND_OR_NOT_SHARED`. |
| Drive API rate limit (429) | Exponential backoff, up to 5 retries. After that, the offending entry is `processing_status=failed`. |
| Single file download fails (5xx, network) | Retry up to 3 times. Then mark `failed`; continue. |
| Disk full / S3 upload fails | Run pauses; alarm-paged. Inventory rows already written are not rolled back. |
| Hash mismatch with Drive's md5 | Logged in `notes`; row remains `copied` (file is present, sha256 is canonical). |
| Allow-list misconfiguration | Reject with `CONFIG_ERROR`. |

All errors are written to a structured dataset-ingest log with `dataset_version, drive_file_id, error_code, message`.

---

## 12. Credential Safety

**Mandatory:**
- Service account JSON file lives **only** at the path declared by `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_PATH`.
- That path is mounted from a secret store (Secrets Manager / KMS-backed) — **not** stored in `.env` files in pre-prod's repo, and **never** committed to git.
- `.gitignore` must include the credential filename pattern (e.g., `*-sa.json`).
- Logs **never** print credential contents. Token usage is logged as the service-account email only, never the private key.
- Rotate credential annually (or per Sec policy).
- If a credential leak is suspected, the service account key is **revoked** in GCP and a new one issued; old `dataset_version`s remain valid (data is already copied to controlled storage and not reachable via the leaked key).

**Forbidden:**
- Pasting credential JSON into chat, planning docs, GitHub issues, Slack, or PR descriptions.
- Storing credential in `frontend/.env`.
- Embedding credential in container images.

---

## 13. Audit Log Requirements

Every Drive interaction is auditable. Suggested log shape (planning only — schema added at Phase 0C build time):

```
dataset_audit_log:
  - id
  - dataset_version
  - actor (service-account email or human ops user)
  - action (list | download | hash | classify | manual_review | freeze)
  - drive_file_id (nullable)
  - dataset_id (nullable)
  - http_status (when applicable)
  - duration_ms
  - notes
  - created_at
```

Audit log is append-only; retention 13 months minimum.

---

## 14. Local / Pre-prod vs S3 / Prod Storage Behavior

| Concern | Pre-prod | Prod |
|---|---|---|
| Storage path | `MENU_DATASET_LOCAL_STORAGE_PATH` (PVC) | `s3://{MENU_DATASET_S3_BUCKET}/...` (KMS-encrypted) |
| Path format | `{base}/{dataset_version}/{drive_file_id}/{name}` | same shape under bucket |
| Lifecycle | Manual cleanup on PVC pressure | S3 lifecycle: hot 24m → Glacier; expire after 60m |
| Access | Local filesystem | Signed URLs only; no public access |
| Backup | PVC snapshots (cluster policy) | S3 versioning enabled |
| Retention | Tied to dataset_version rotation | Configurable per restaurant retention if applicable |
| Bandwidth | Localhost copy | VPC endpoint to S3, no public egress |

The **Storage Adapter** abstraction (`menu_import.StorageAdapter`) used by the runtime menu-import system is **shared** with dataset prep: same `put / get / signedUrl / delete` interface, different driver per env.

---

## 15. No-Secret-Committed Rule (re-stated)

This document **does not contain**:
- The Drive folder ID.
- The service account email.
- The service account private key or any portion thereof.
- Any token, password, or signed URL.

Any future doc referencing these values must do so via env var name only. Before merging any change to this folder, a `git diff` review must confirm no secret was added.

---

## 16. Operational Runbook (skeleton; full version at Phase 0C exit)

1. **Prerequisite check** — confirm env vars set, credential file readable, Drive folder reachable.
2. **Dry run** — list-only mode (`--dry-run`) outputs inventory without downloading.
3. **Full run** — produces `dataset_version` manifest + copied files.
4. **Verify** — sample 5% of copied files; recompute hash; confirm Drive metadata matches.
5. **Hand off to human reviewers** — reviewers use the manifest + storage paths to fill `*.expected.json`.
6. **Freeze** — when reviewers sign off, the manifest's `frozen_at` is set; further changes require a new `dataset_version`.

---

## 17. Out of Scope for this Spec

- Any Drive write or modification.
- Any access outside the designated folder.
- Any inference / extraction (those happen in Build Phase 2 against the frozen dataset).
- Any sharing of dataset files outside the controlled storage.
- Continuous live sync of Drive ↔ dataset (each ingest is a discrete `dataset_version` run).
