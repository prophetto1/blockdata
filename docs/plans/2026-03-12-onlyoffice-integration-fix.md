# OnlyOffice Integration Fix Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the OnlyOffice DOCX editor actually work end-to-end in the ELT workbench — clicking Edit on a DOCX in the assets list opens a working editor.

**Architecture:** The bridge (platform-api) shuttles files between Supabase Storage and OnlyOffice Document Server. The browser loads the OO JS API via Vite proxy, calls the bridge to open a session, gets a signed config, and mounts the editor. The Document Server container fetches the file from the bridge and sends save callbacks back.

**Tech Stack:** FastAPI (bridge), Vite (dev proxy), OnlyOffice Document Server (Docker), Supabase (storage + auth)

---

## Key Facts (verified from actual codebase)

- **Documents table:** `view_documents` (NOT `documents_v2`). Columns include: `source_uid`, `source_locator`, `doc_title`, `owner_id`, `source_type`, `project_id`
- **Frontend document type:** `ProjectDocumentRow` from `web/src/lib/projectDetailHelpers.ts` — has `source_uid`, `source_locator`, `doc_title`, `owner_id`
- **Frontend DOCX detection:** `isDocxDocument()` checks `source_type` and `source_locator` extension (NOT `doc_title`)
- **Browser origin:** `172.21.0.1:527x` (Vite dev server bound to `0.0.0.0`)
- **Platform-api:** `localhost:8000` — browser cannot reach directly from `172.x` origin
- **OnlyOffice Document Server:** Docker container on port `9980`
- **Container→host:** `host.docker.internal` resolves to host inside Docker (via `extra_hosts` in compose)
- **Supabase env:** lives in `/home/jon/BD2/.env` — must be sourced before starting platform-api
- **OnlyOffice JWT secret:** lives in `/home/jon/BD2/services/onlyoffice/.env`

## Network Topology

```
Browser (172.21.0.1:527x)
  ├── /oo-api/*  ──Vite proxy──→ localhost:9980 (Document Server)
  ├── /platform-api/*  ──Vite proxy──→ localhost:8000 (Bridge)
  └── loads DocsAPI.DocEditor which creates iframe to Document Server

Document Server container (port 9980)
  ├── fetches doc from: bridge_url/onlyoffice/doc/{session_id}
  └── sends callbacks to: bridge_url/onlyoffice/callback/{session_id}
  └── bridge_url must be reachable FROM the container = host.docker.internal:8000
```

**Critical insight:** The `document.url` and `callbackUrl` in the editor config are used by the Document Server CONTAINER, not by the browser. So `http://host.docker.internal:8000` is correct for those URLs. The browser communicates with the Document Server via the `/oo-api` Vite proxy (the JS API script handles this automatically based on the script src origin).

---

## Task 1: Fix the bridge to use correct table and DOCX validation

**Files:**
- Modify: `services/platform-api/app/api/routes/onlyoffice.py`

**What was wrong:**
- Table was `documents_v2`, should be `view_documents` (ALREADY FIXED in current code)
- DOCX gate checked `doc_title` instead of `source_locator` (ALREADY FIXED in current code)

**Verify:** These fixes are already in place. Read the file and confirm lines 143 and 170.

---

## Task 2: Create a startup script for the platform-api with all required env vars

**Files:**
- Create: `services/platform-api/start-dev.sh`

**Why:** The platform-api needs env vars from multiple sources. Without a script, every restart requires remembering to source them all. This was the cause of "Invalid bearer token" and "JWT_SECRET not configured" errors.

**Step 1: Create the startup script**

```bash
#!/usr/bin/env bash
# Start the platform-api dev server with all required environment variables.
#
# Usage: ./start-dev.sh
# Requires: OnlyOffice Document Server running (docker compose up -d from ../onlyoffice/)

set -euo pipefail
cd "$(dirname "$0")"

# Load Supabase credentials
if [ -f ../../.env ]; then
  set -a
  source ../../.env
  set +a
fi

# Load OnlyOffice JWT secret (must match Document Server's JWT_SECRET)
if [ -f ../onlyoffice/.env ]; then
  set -a
  source ../onlyoffice/.env
  set +a
fi

# Bridge URL: how the Document Server container reaches this API
export ONLYOFFICE_BRIDGE_URL="${ONLYOFFICE_BRIDGE_URL:-http://host.docker.internal:8000}"

# Document Server URL: how the browser reaches the Document Server (unused by bridge directly,
# but used for SSRF validation on callbacks)
export ONLYOFFICE_DOCSERVER_URL="${ONLYOFFICE_DOCSERVER_URL:-http://localhost:9980}"
export ONLYOFFICE_DOCSERVER_INTERNAL_URL="${ONLYOFFICE_DOCSERVER_INTERNAL_URL:-http://localhost:9980}"

# Local cache directory for editing sessions
export ONLYOFFICE_STORAGE_DIR="${ONLYOFFICE_STORAGE_DIR:-/tmp/onlyoffice-cache}"
mkdir -p "$ONLYOFFICE_STORAGE_DIR"

echo "=== OnlyOffice Bridge Config ==="
echo "BRIDGE_URL:    $ONLYOFFICE_BRIDGE_URL"
echo "DOCSERVER_URL: $ONLYOFFICE_DOCSERVER_URL"
echo "JWT_SECRET:    ${ONLYOFFICE_JWT_SECRET:+set (${#ONLYOFFICE_JWT_SECRET} chars)}"
echo "STORAGE_DIR:   $ONLYOFFICE_STORAGE_DIR"
echo "SUPABASE_URL:  $SUPABASE_URL"
echo "================================"

exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Step 2: Make it executable**

```bash
chmod +x services/platform-api/start-dev.sh
```

**Step 3: Verify it starts correctly**

Run: `./services/platform-api/start-dev.sh`

Expected: Server starts, config dump shows all vars set, health check returns 200.

---

## Task 3: Ensure the OnlyOffice .env has a real JWT secret (not the placeholder)

**Files:**
- Modify: `services/onlyoffice/.env`

**Step 1: Check current secret**

Read `services/onlyoffice/.env`. If `ONLYOFFICE_JWT_SECRET=change-me-to-a-real-secret`, generate a new one:

```bash
ONLYOFFICE_JWT_SECRET=oo-jwt-$(openssl rand -hex 16)
```

**Step 2: Restart the Document Server**

```bash
docker compose -f services/onlyoffice/docker-compose.yml up -d
```

**Step 3: Restart the platform-api**

Use the startup script from Task 2.

---

## Task 4: Verify the Vite proxy configuration

**Files:**
- Verify: `web/vite.config.ts` (lines 76-86)
- Verify: `web/src/lib/platformApi.ts` (line 12)

**What to check:**

1. `vite.config.ts` has BOTH proxies:
   - `/oo-api` → `http://localhost:9980` (Document Server JS API)
   - `/platform-api` → `http://localhost:8000` (Bridge API)

2. `platformApi.ts` defaults to `/platform-api` (NOT `http://localhost:8000`)

3. The Vite dev server MUST be restarted after any vite.config.ts change.

**These are ALREADY FIXED in the current code.** Verify by reading the files.

---

## Task 5: End-to-end smoke test from the command line

**Why:** Before testing in the browser, verify the full chain works from curl.

**Step 1: Verify services are up**

```bash
# Document Server
curl -s http://localhost:9980/healthcheck && echo " OK"

# Platform API
curl -s http://localhost:8000/health && echo " OK"

# JS API script is accessible
curl -s -o /dev/null -w "%{http_code}" http://localhost:9980/web-apps/apps/api/documents/api.js
```

Expected: All return 200.

**Step 2: Test the /open endpoint with a real JWT**

Get a valid Supabase JWT from the browser's network tab or local storage, then:

```bash
TOKEN="<paste real JWT here>"
SOURCE_UID="<paste a real source_uid from the assets list>"

curl -s http://localhost:8000/onlyoffice/open \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"source_uid\": \"$SOURCE_UID\"}"
```

Expected: `{"session_id": "...", "filename": "..."}` (200 OK)

Possible failures:
- 401 → JWT validation failed (check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)
- 404 → source_uid not found in view_documents
- 403 → owner_id mismatch
- 400 → file is not a .docx
- 502 → failed to download from Supabase Storage
- 503 → JWT secret is placeholder

**Step 3: Test the /config endpoint**

```bash
SESSION_ID="<from previous response>"

curl -s http://localhost:8000/onlyoffice/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": \"$SESSION_ID\"}"
```

Expected: JSON with `document.url`, `editorConfig.callbackUrl`, and `token` fields.

**Step 4: Verify the document URL is reachable from the container**

```bash
DOC_URL="<document.url from config response>"

# Test from inside the Docker network
docker exec onlyoffice-documentserver-1 curl -s -o /dev/null -w "%{http_code}" "$DOC_URL"
```

Expected: 200 (the container can fetch the document from the bridge via host.docker.internal)

---

## Task 6: Browser test

**Prerequisites:** All Task 5 checks pass.

1. Restart Vite dev server (to pick up proxy changes)
2. Open the ELT workbench
3. Select a .docx file from the assets list
4. Click the "Edit" button in the preview header
5. Expected: OnlyOffice editor loads in the preview pane

**If it fails:**
- Open browser DevTools → Network tab
- Check which request fails
- The error message in the UI tells you which step failed:
  - "Failed to load OnlyOffice API script" → `/oo-api` proxy not working or Document Server down
  - HTTP error text → `/open` or `/config` endpoint returned an error
  - Editor loads but shows error → Document Server can't reach the bridge (container networking)

---

## Summary of all changes needed (vs current code state)

| Item | Status | File |
|------|--------|------|
| Table name `documents_v2` → `view_documents` | DONE | `onlyoffice.py:143` |
| DOCX gate on `source_locator` not `doc_title` | DONE | `onlyoffice.py:170` |
| Vite proxy `/platform-api` → `localhost:8000` | DONE | `vite.config.ts:82` |
| `platformApiFetch` defaults to `/platform-api` | DONE | `platformApi.ts:12` |
| Edit/Preview toggle in PreviewTabPanel | DONE | `PreviewTabPanel.tsx:369` |
| Tabler icons in OnlyOfficeEditorPanel | DONE | `OnlyOfficeEditorPanel.tsx:2` |
| Startup script with all env vars | TODO | `start-dev.sh` |
| Real JWT secret (not placeholder) | TODO | `services/onlyoffice/.env` |
| End-to-end smoke test | TODO | manual verification |
