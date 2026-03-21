# Design Layout Captures — Backend Migration & Admin UX

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate design layout captures from filesystem JSON to a Supabase PostgreSQL table with FastAPI CRUD endpoints, replace individual action buttons with a dropdown menu, add async capture polling, and remove dead fields (`pageType`, `both` theme). Overlay capture support is deferred to a future phase.

**Architecture:**
Data persistence moves from `captures.json` to a `design_layout_captures` Supabase table accessed through FastAPI admin routes using the existing `require_superuser` auth pattern. The local capture server (`scripts/capture-server.mjs`) becomes a thin Playwright runner — it executes headless browser captures locally but reads/writes capture metadata through the platform-api instead of the filesystem. The frontend switches from `localhost:4488` to `platformApiFetch` for data, and only hits the local server to trigger captures and serve files. Captures run asynchronously: the server returns immediately after starting and updates the API when done, eliminating the "capturing forever" blocking behavior.

**Tech Stack:** FastAPI, Supabase PostgreSQL, Pydantic, React + TypeScript, Ark UI Menu, Node.js (Playwright runner)

**Supersedes:**
- `2026-03-20-overlay-capture-and-admin-cleanup-v2.md`
- `2026-03-20-overlay-v2-review-fixes.md`
- `2026-03-21-capture-backend-table-and-cleanup.md`

---

## Task 0: Remove `pageType` and `both` theme from all layers

`pageType` does nothing — the pulldown values (`settings`, `editor`, `dashboard`, `workbench`, `marketing`) have no behavioral effect. `both` theme is unused by the capture server (it was a UI-only concept). Remove both everywhere, and add `auth-needed` to CaptureStatus since it exists in runtime data but not in the type.

**Files:**
- Modify: `web/src/pages/superuser/design-captures.types.ts`
- Modify: `web/src/pages/superuser/DesignLayoutCaptures.tsx`
- Modify: `web/src/pages/superuser/DesignLayoutCaptures.test.tsx`
- Modify: `scripts/capture-server.mjs`
- Modify: `docs/design-layouts/captures.json`

### Step 1: Update types

In `web/src/pages/superuser/design-captures.types.ts`, replace the entire file with:

```ts
export type CaptureStatus = 'pending' | 'auth-needed' | 'capturing' | 'complete' | 'failed';

export type ThemeRequest = 'light' | 'dark';

export type CaptureEntry = {
  id: string;
  name: string;
  url: string;
  viewport: string;
  theme: ThemeRequest;
  capturedAt: string | null;
  outputDir: string;
  status: CaptureStatus;
};

export type CaptureRequest = {
  url: string;
  width: number;
  height: number;
  theme: ThemeRequest;
};
```

### Step 2: Update component — remove imports and constants

In `web/src/pages/superuser/DesignLayoutCaptures.tsx`:

Remove `PageType` from the type import at line 37:

```ts
import type { CaptureEntry, CaptureRequest, ThemeRequest } from './design-captures.types';
```

Delete the `PAGE_TYPE_COLORS` constant (lines 87-93):

```ts
const PAGE_TYPE_COLORS = {
  settings: 'blue',
  editor: 'violet',
  dashboard: 'teal',
  workbench: 'orange',
  marketing: 'green',
} as const satisfies Record<PageType, string>;
```

Replace `THEME_BADGE` (lines 95-99) with:

```ts
const THEME_BADGE = {
  light: 'default',
  dark: 'dark',
} as const satisfies Record<ThemeRequest, string>;
```

### Step 3: Update component — remove `pageType` from sort, filter, form

Remove `'pageType'` from the `SortField` union (line 82):

```ts
type SortField = 'name' | 'viewport' | 'theme' | 'capturedAt';
```

Remove `row.pageType` from the search filter array (line 274):

```ts
return [row.name, row.url, row.viewport, row.theme]
```

Remove `pageType: row.pageType` from `handleReCapture` request (line 299):

```ts
const req: CaptureRequest = {
  url: row.url,
  width: w,
  height: h,
  theme: row.theme,
};
```

Remove `pageType: 'settings'` from `captureForm` initial state (lines 338-344):

```ts
const [captureForm, setCaptureForm] = useState<CaptureRequest>({
  url: '',
  width: 1920,
  height: 1080,
  theme: 'light',
});
```

### Step 4: Update component — remove `pageType` column and `both` theme

Delete the Page Type `<th>` (lines 443-446):

```tsx
<th className="w-[7rem] px-3 py-2 font-medium">
  <button type="button" onClick={() => toggleSort('pageType')} className="inline-flex items-center gap-1 hover:text-foreground">
    Page Type <SortIcon field="pageType" activeField={sortField} dir={sortDir} />
  </button>
</th>
```

Delete the Page Type `<td>` (lines 519-521):

```tsx
<td className="px-3 py-3">
  <Badge variant={PAGE_TYPE_COLORS[row.pageType]} size="sm">{row.pageType}</Badge>
</td>
```

Update `colSpan` from 9 to 8 in both the loading and empty `<td>` elements (lines 460 and 466).

Remove `row.theme === 'both' ? 'light' : row.theme` — replace with `row.theme` in the preview image (line 499), the view screenshot button (line 546), and the download report button (line 556).

Remove the `both` option from the theme `<select>` (line 697):

```tsx
<option value="both">Both (light + dark)</option>
```

Delete the Page Type `<select>` block and its wrapping `<label>` (lines 700-716). Then remove the **second** `<div className="grid grid-cols-2 gap-3">` wrapper (the one around Theme + Page Type at line 684 — NOT the width/height grid at line 657). The Theme `<label>` becomes a standalone block element, no longer inside a grid.

### Step 5: Update test

In `web/src/pages/superuser/DesignLayoutCaptures.test.tsx`, remove `pageType: 'settings' as const` from `sampleCapture` (line 21).

### Step 6: Update capture server

In `scripts/capture-server.mjs`:

Remove `pageType = "settings"` from `startCapture` destructuring (line 158).

Change ID format from `${slug}--${width}x${height}--${theme}--${pageType}` to `${slug}--${width}x${height}--${theme}` (line 165).

Remove `pageType` from the entry object (line 173).

Remove `pageType` from the startup console.log message (line 365).

Remove the `both` theme branch in `runCapture` (lines 205-206):

```js
if (options.theme === "both") {
  measureOptions.captureBothThemes = "true";
} else if (options.theme === "light" || options.theme === "dark") {
```

Replace with:

```js
if (options.theme === "light" || options.theme === "dark") {
```

### Step 7: Clean captures.json

In `docs/design-layouts/captures.json`:

- Remove `"pageType": "..."` from every entry
- Update every `"id"` to strip the `--${pageType}` suffix (e.g., `"...--light--settings"` becomes `"...--light"`)
- Remove any entries with `"theme": "both"` (there are none currently, but guard against it)

### Step 8: Verify

```bash
cd web && npx tsc --noEmit --project tsconfig.app.json
cd web && npx vitest run src/pages/superuser/DesignLayoutCaptures.test.tsx
```

### Step 9: Commit

```bash
git add web/src/pages/superuser/design-captures.types.ts \
        web/src/pages/superuser/DesignLayoutCaptures.tsx \
        web/src/pages/superuser/DesignLayoutCaptures.test.tsx \
        scripts/capture-server.mjs \
        docs/design-layouts/captures.json
git commit -m "refactor: remove dead pageType and both theme from design layout captures"
```

---

## Task 1: Supabase migration — `design_layout_captures` table

**Files:**
- Create: `supabase/migrations/20260321100000_103_design_layout_captures.sql`

### Step 1: Write migration

```sql
-- Design layout captures — stores metadata for Playwright-based page captures.
-- Artifacts (screenshots, JSON reports) remain on the local filesystem.
-- Superuser-only; no RLS needed (accessed via service_role from platform-api).

CREATE TABLE IF NOT EXISTS design_layout_captures (
  id               TEXT        PRIMARY KEY,
  name             TEXT        NOT NULL,
  url              TEXT        NOT NULL,
  viewport         TEXT        NOT NULL,
  theme            TEXT        NOT NULL CHECK (theme IN ('light', 'dark')),
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'auth-needed', 'capturing', 'complete', 'failed')),
  output_dir       TEXT        NOT NULL,
  captured_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE design_layout_captures IS 'Superuser tool: Playwright-based layout capture metadata. Artifacts live on local filesystem.';
```

### Step 2: Apply migration

For local Supabase:

```bash
npx supabase db push --local
```

For remote (production):

```bash
npx supabase db push
```

### Step 3: Commit

```bash
git add supabase/migrations/20260321100000_103_design_layout_captures.sql
git commit -m "feat(migration): add design_layout_captures table"
```

---

## Task 2: FastAPI CRUD routes for captures

Follow the existing pattern from `services/platform-api/app/api/routes/admin_services.py`.

**Files:**
- Create: `services/platform-api/app/api/routes/admin_captures.py`
- Modify: `services/platform-api/app/main.py`

### Step 1: Write the route file

Create `services/platform-api/app/api/routes/admin_captures.py`:

```python
"""Admin CRUD for design layout captures."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.infra.supabase_client import get_supabase_admin
from app.auth.dependencies import SuperuserContext, require_superuser

logger = logging.getLogger("admin-captures")

router = APIRouter(prefix="/admin/captures", tags=["admin-captures"])

VALID_THEMES = {"light", "dark"}
VALID_STATUSES = {"pending", "auth-needed", "capturing", "complete", "failed"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
#  GET /admin/captures — list all
# ---------------------------------------------------------------------------

@router.get("", openapi_extra={"x-required-role": "platform_admin"})
async def list_captures(su: SuperuserContext = Depends(require_superuser)):
    sb = get_supabase_admin()
    result = sb.table("design_layout_captures").select("*").order(
        "created_at", desc=True
    ).execute()
    return {"captures": result.data or []}


# ---------------------------------------------------------------------------
#  POST /admin/captures — create or upsert entry
# ---------------------------------------------------------------------------

class CaptureCreate(BaseModel):
    id: str
    name: str
    url: str
    viewport: str
    theme: str
    status: str = "pending"
    output_dir: str


@router.post("", openapi_extra={"x-required-role": "platform_admin"})
async def upsert_capture(
    body: CaptureCreate,
    su: SuperuserContext = Depends(require_superuser),
):
    if body.theme not in VALID_THEMES:
        raise HTTPException(400, f"theme must be one of: {', '.join(sorted(VALID_THEMES))}")
    if body.status not in VALID_STATUSES:
        raise HTTPException(400, f"status must be one of: {', '.join(sorted(VALID_STATUSES))}")

    sb = get_supabase_admin()
    row = {
        "id": body.id.strip(),
        "name": body.name.strip(),
        "url": body.url.strip(),
        "viewport": body.viewport.strip(),
        "theme": body.theme,
        "status": body.status,
        "output_dir": body.output_dir,
        "updated_at": _now_iso(),
    }
    result = sb.table("design_layout_captures").upsert(row, on_conflict="id").execute()
    created = (result.data or [{}])[0]
    return {"ok": True, "capture": created}


# ---------------------------------------------------------------------------
#  PATCH /admin/captures/{capture_id} — update status/fields
# ---------------------------------------------------------------------------

class CaptureUpdate(BaseModel):
    status: str | None = None
    captured_at: str | None = None
    output_dir: str | None = None


@router.patch("/{capture_id}", openapi_extra={"x-required-role": "platform_admin"})
async def update_capture(
    capture_id: str,
    body: CaptureUpdate,
    su: SuperuserContext = Depends(require_superuser),
):
    update: dict = {}
    if body.status is not None:
        if body.status not in VALID_STATUSES:
            raise HTTPException(400, f"status must be one of: {', '.join(sorted(VALID_STATUSES))}")
        update["status"] = body.status
    if body.captured_at is not None:
        update["captured_at"] = body.captured_at
    if body.output_dir is not None:
        update["output_dir"] = body.output_dir

    if not update:
        raise HTTPException(400, "No updatable fields provided")

    update["updated_at"] = _now_iso()

    sb = get_supabase_admin()
    sb.table("design_layout_captures").update(update).eq("id", capture_id).execute()
    return {"ok": True, "updated_id": capture_id}


# ---------------------------------------------------------------------------
#  DELETE /admin/captures/{capture_id}
# ---------------------------------------------------------------------------

@router.delete("/{capture_id}", openapi_extra={"x-required-role": "platform_admin"})
async def delete_capture(
    capture_id: str,
    su: SuperuserContext = Depends(require_superuser),
):
    sb = get_supabase_admin()
    sb.table("design_layout_captures").delete().eq("id", capture_id).execute()
    return {"ok": True, "deleted_id": capture_id}
```

### Step 2: Register in main.py

In `services/platform-api/app/main.py`, after the `admin_services` router (line 108), add:

```python
    # 3b. Admin captures (superuser only)
    from app.api.routes.admin_captures import router as admin_captures_router
    app.include_router(admin_captures_router)
```

### Step 3: Verify route loads

```bash
cd services/platform-api && python -c "from app.main import app; print([r.path for r in app.routes if 'capture' in r.path])"
```

Expected: paths containing `/admin/captures`

### Step 4: Commit

```bash
git add services/platform-api/app/api/routes/admin_captures.py \
        services/platform-api/app/main.py
git commit -m "feat(api): add admin CRUD routes for design layout captures"
```

---

## Task 3: Rewrite capture server — async, API-backed

The capture server stops managing `captures.json` and instead:
1. Receives a capture request with a pre-created capture ID
2. Calls the platform-api to update status to `capturing`
3. Runs `measureLayout` in the background
4. Calls the platform-api to update status to `complete` or `failed`
5. Returns immediately to the caller

> **Deployment note:** After this commit, the capture server expects the new request shape (`{ id, url, outputDir, ... }`). The current frontend (not updated until Task 4) sends the old shape. The capture feature is non-functional between Tasks 3 and 4 — both must be deployed in the same session.

**Required environment variables:**
- `PLATFORM_API_URL` — platform-api base URL (default: `http://localhost:8000`)
- `PLATFORM_API_M2M_TOKEN` — the same M2M bearer token configured in the platform-api (`PLATFORM_API_M2M_TOKEN` env var in `services/platform-api`). The capture server sends this as `Authorization: Bearer <token>` on PATCH calls. The platform-api's `require_auth` dependency matches it against `settings.platform_api_m2m_token` and grants the `platform_admin` role, which satisfies the `require_superuser` guard on the admin captures routes. Without this, all PATCH calls fail with 401 and captures appear stuck in `pending`.

Example startup: `PLATFORM_API_M2M_TOKEN=<token> node scripts/capture-server.mjs`

**Files:**
- Rewrite: `scripts/capture-server.mjs`

### Step 1: Rewrite capture-server.mjs

Replace the entire file. The server needs these routes:
- `GET /health` — health check for frontend connection detection
- `POST /capture` — accepts `{ id, url, width, height, theme, outputDir }`, starts async capture, returns immediately
- `POST /cleanup` — accepts `{ outputDir }`, removes local artifact directory (called by frontend after API delete)
- `GET /files/*` — serves local capture artifacts (screenshots, reports)
- CORS headers on all responses

Key changes from current:
- **No `captures.json`** — all CRUD goes through the platform-api
- **No `readCaptures` / `writeCaptures` / `updateCaptureStatus`** — removed
- **Async capture** — `runCapture` spawns in background, POST returns immediately
- **API_URL** — configurable via `PLATFORM_API_URL` env var (defaults to `http://localhost:8000`)
- **API_TOKEN** — configurable via `PLATFORM_API_M2M_TOKEN` env var (same token the platform-api checks in `require_auth`)
- **Artifact cleanup** — `POST /cleanup` removes local output directory when a capture is deleted
- **Capture timeout** — 120-second timeout on `measureLayout`; if exceeded, mark as `failed`

```js
#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const capturesRoot = path.join(repoRoot, "docs", "design-layouts");
const skillScriptsDir = path.join(
  repoRoot,
  "docs",
  "jon",
  "skills",
  "design-1-layouts-spec-with-playwright",
  "scripts"
);

const PORT = Number(process.env.CAPTURE_SERVER_PORT || "4488");
const API_URL = (process.env.PLATFORM_API_URL || "http://localhost:8000").replace(/\/+$/, "");
const API_TOKEN = process.env.PLATFORM_API_M2M_TOKEN || "";
const CAPTURE_TIMEOUT_MS = 120_000;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

/* ------------------------------------------------------------------ */
/*  Platform-API client                                                */
/* ------------------------------------------------------------------ */

async function apiPatch(captureId, patch) {
  const url = `${API_URL}/admin/captures/${encodeURIComponent(captureId)}`;
  const headers = { "Content-Type": "application/json" };
  if (API_TOKEN) headers["Authorization"] = `Bearer ${API_TOKEN}`;

  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[api] PATCH ${captureId} failed (${res.status}): ${text}`);
    }
  } catch (err) {
    console.error(`[api] PATCH ${captureId} error: ${err.message}`);
  }
}

/* ------------------------------------------------------------------ */
/*  Capture logic                                                      */
/* ------------------------------------------------------------------ */

async function loadMeasureModule() {
  return import(pathToFileURL(path.join(skillScriptsDir, "measure-layout.mjs")).href);
}

async function runCapture(id, options) {
  await apiPatch(id, { status: "capturing" });
  console.log(`[capture] Starting ${id} → ${options.url} at ${options.width}x${options.height} theme=${options.theme}`);

  try {
    const mod = await loadMeasureModule();

    const measureOptions = {
      url: options.url,
      width: String(options.width),
      height: String(options.height),
      outputDir: options.outputDir,
    };

    if (options.theme === "light" || options.theme === "dark") {
      measureOptions.theme = options.theme;
    }

    // Run base capture with timeout
    await Promise.race([
      mod.measureLayout(measureOptions),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Capture timed out")), CAPTURE_TIMEOUT_MS)
      ),
    ]);

    const capturedAt = new Date().toISOString();
    await apiPatch(id, { status: "complete", captured_at: capturedAt });
    console.log(`[capture] Complete: ${id}`);
  } catch (err) {
    await apiPatch(id, { status: "failed" });
    console.error(`[capture] Failed: ${id}`, err.message);
  }
}

/* ------------------------------------------------------------------ */
/*  HTTP routes                                                        */
/* ------------------------------------------------------------------ */

async function handleRequest(req, res) {
  const { method } = req;
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = urlObj.pathname;

  // CORS preflight
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  try {
    // GET /health — connection check
    if (method === "GET" && pathname === "/health") {
      sendJson(res, 200, { status: "ok" });
      return;
    }

    // POST /capture — start async capture
    if (method === "POST" && pathname === "/capture") {
      const body = await readBody(req);
      const { id, url, width = 1920, height = 1080, theme = "light", outputDir } = body;

      if (!id) {
        sendJson(res, 400, { error: "Missing required field: id" });
        return;
      }
      if (!url) {
        sendJson(res, 400, { error: "Missing required field: url" });
        return;
      }
      if (!outputDir) {
        sendJson(res, 400, { error: "Missing required field: outputDir" });
        return;
      }

      const fullOutputDir = path.resolve(capturesRoot, outputDir);

      // Fire and forget — capture runs in background
      runCapture(id, {
        url,
        width: Number(width),
        height: Number(height),
        theme,
        outputDir: fullOutputDir,
      }).catch((err) => {
        console.error(`[capture] Unhandled error for ${id}:`, err);
      });

      sendJson(res, 202, { id, status: "accepted" });
      return;
    }

    // POST /cleanup — remove local artifact directory
    if (method === "POST" && pathname === "/cleanup") {
      const body = await readBody(req);
      const { outputDir } = body;
      if (typeof outputDir !== "string" || !outputDir.trim()) {
        sendJson(res, 400, { error: "Missing required field: outputDir" });
        return;
      }

      const fullPath = path.resolve(capturesRoot, outputDir);
      if (!fullPath.startsWith(capturesRoot) || outputDir.includes("..")) {
        sendJson(res, 403, { error: "Forbidden" });
        return;
      }

      try {
        if (fs.existsSync(fullPath)) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        }
        sendJson(res, 200, { ok: true, removed: outputDir });
      } catch (err) {
        sendJson(res, 500, { error: `Failed to remove artifacts: ${err.message}` });
      }
      return;
    }

    // GET /files/* — serve captured files (screenshots, reports)
    if (method === "GET" && pathname.startsWith("/files/")) {
      const relativePath = decodeURIComponent(pathname.slice("/files/".length));
      const filePath = path.resolve(capturesRoot, relativePath);

      if (!filePath.startsWith(capturesRoot) || relativePath.includes("..")) {
        sendJson(res, 403, { error: "Forbidden" });
        return;
      }

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        sendJson(res, 404, { error: "File not found" });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
      };

      res.writeHead(200, {
        "Content-Type": mimeTypes[ext] || "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (err) {
    console.error(`[server] Error:`, err.message);
    sendJson(res, 500, { error: err.message });
  }
}

/* ------------------------------------------------------------------ */
/*  Start                                                              */
/* ------------------------------------------------------------------ */

const server = http.createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`\nCapture server running on http://localhost:${PORT}`);
  console.log(`  Platform API: ${API_URL}`);
  console.log(`  GET  /health          — connection check`);
  console.log(`  POST /capture         — trigger async capture { id, url, width, height, theme, outputDir }`);
  console.log(`  POST /cleanup         — remove local artifact directory { outputDir }`);
  console.log(`  GET  /files/*         — serve captured artifacts\n`);
});
```

### Step 2: Verify locally

```bash
node scripts/capture-server.mjs &
curl http://localhost:4488/health
```

Expected: `{"status":"ok"}`

### Step 3: Commit

```bash
git add scripts/capture-server.mjs
git commit -m "feat(capture-server): async capture with platform-api persistence"
```

---

## Task 4: Update frontend to use platform-api for data

The frontend switches from talking to the capture server for CRUD to talking to the platform-api. The capture server is only used for triggering captures and serving files.

**Files:**
- Modify: `web/src/pages/superuser/design-captures.types.ts`
- Rewrite: `web/src/pages/superuser/DesignLayoutCaptures.tsx`
- Modify: `web/src/pages/superuser/DesignLayoutCaptures.test.tsx`

### Step 1: Update types for DB shape

Replace `web/src/pages/superuser/design-captures.types.ts` with:

```ts
export type CaptureStatus = 'pending' | 'auth-needed' | 'capturing' | 'complete' | 'failed';

export type ThemeRequest = 'light' | 'dark';

export type CaptureEntry = {
  id: string;
  name: string;
  url: string;
  viewport: string;
  theme: ThemeRequest;
  status: CaptureStatus;
  output_dir: string;
  captured_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CaptureFormData = {
  url: string;
  width: number;
  height: number;
  theme: ThemeRequest;
};
```

Note: `CaptureRequest` is renamed to `CaptureFormData` — it represents the form state, not the API request shape. The actual API request body is constructed in the component.

### Step 2: Rewrite the data functions

In `web/src/pages/superuser/DesignLayoutCaptures.tsx`, replace the entire imports section and constants/helpers block (lines 1-201) with:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
  IconCamera,
  IconDots,
  IconPlus,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Checkbox } from '@ark-ui/react/checkbox';
import { Pagination } from '@ark-ui/react/pagination';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MenuContent,
  MenuItem,
  MenuPositioner,
  MenuPortal,
  MenuRoot,
  MenuTrigger,
} from '@/components/ui/menu';
import {
  DialogRoot,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogCloseTrigger,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  ICON_CONTEXT_SIZE,
  ICON_SIZES,
  ICON_STANDARD,
  ICON_STROKES,
} from '@/lib/icon-contract';
import { platformApiFetch } from '@/lib/platformApi';
import type { CaptureEntry, CaptureFormData, ThemeRequest } from './design-captures.types';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CAPTURE_SERVER = import.meta.env.VITE_CAPTURE_SERVER_URL || 'http://localhost:4488';

type SortField = 'name' | 'viewport' | 'theme' | 'captured_at';
type SortDir = 'asc' | 'desc';

const PAGE_SIZES = [10, 25, 50] as const;

const THEME_BADGE = {
  light: 'default',
  dark: 'dark',
} as const satisfies Record<ThemeRequest, string>;

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 180_000;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fileUrl(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/');
  const encoded = normalized.split('/').map(encodeURIComponent).join('/');
  return `${CAPTURE_SERVER}/files/${encoded}`;
}

function captureFileUrl(row: CaptureEntry, theme: string, filename: string): string {
  return fileUrl(`${row.output_dir}/${theme}/${filename}`.replace(/\\/g, '/'));
}

function formatDate(value: string | null): string {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleString();
}

async function fetchCaptures(): Promise<{ data: CaptureEntry[]; connected: boolean }> {
  try {
    const res = await platformApiFetch('/admin/captures');
    if (!res.ok) return { data: [], connected: true };
    const json = await res.json();
    return { data: json.captures ?? [], connected: true };
  } catch {
    return { data: [], connected: false };
  }
}

async function checkCaptureServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${CAPTURE_SERVER}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

function deriveCaptureSlug(url: string): string {
  try {
    const parsed = new URL(url);
    return (parsed.hostname + parsed.pathname)
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  } catch {
    return 'unknown';
  }
}

function deriveCaptureId(slug: string, width: number, height: number, theme: string): string {
  return `${slug}--${width}x${height}--${theme}`;
}

function deriveOutputDir(slug: string, width: number, height: number): string {
  return `${slug}/${width}x${height}`;
}

async function createCaptureEntry(form: CaptureFormData): Promise<CaptureEntry> {
  const slug = deriveCaptureSlug(form.url);
  const id = deriveCaptureId(slug, form.width, form.height, form.theme);
  const output_dir = deriveOutputDir(slug, form.width, form.height);

  const res = await platformApiFetch('/admin/captures', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      name: slug,
      url: form.url,
      viewport: `${form.width}x${form.height}`,
      theme: form.theme,
      status: 'pending',
      output_dir,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error ?? err.detail ?? `HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.capture;
}

async function triggerCapture(entry: CaptureEntry): Promise<void> {
  const [w, h] = entry.viewport.split('x').map(Number);
  const res = await fetch(`${CAPTURE_SERVER}/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: entry.id,
      url: entry.url,
      width: w,
      height: h,
      theme: entry.theme,
      outputDir: entry.output_dir,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error ?? `Capture server HTTP ${res.status}`);
  }
}

async function cleanupArtifacts(outputDir: string): Promise<void> {
  try {
    await fetch(`${CAPTURE_SERVER}/cleanup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputDir }),
    });
  } catch {
    // Best-effort: local artifacts may remain if capture server is down
  }
}

async function deleteCaptureEntry(entry: CaptureEntry): Promise<void> {
  const encoded = encodeURIComponent(entry.id);
  const res = await platformApiFetch(`/admin/captures/${encoded}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error ?? err.detail ?? `HTTP ${res.status}`);
  }
  // Remove local screenshots/reports after DB record is gone
  await cleanupArtifacts(entry.output_dir);
}
```

### Step 3: Rewrite the component body

Replace the `Component` function with the updated version. Key changes:

1. **`loadData`** calls `fetchCaptures()` which uses `platformApiFetch` (not capture server)
2. **Server health** — checked via `GET /health` on the capture server, separate from data loading
3. **`handleStartCapture`** — two-step: create entry via API, then trigger capture server, then start polling
4. **`handleReCapture`** — triggers capture server (which PATCHes status to `capturing` internally), starts polling
5. **Polling** — after triggering a capture, poll the API every 3s until status changes from `capturing`/`pending`; auto-stops after 3 minutes
6. **`handleDelete`** — calls `deleteCaptureEntry` (platform-api DELETE + capture server cleanup for local artifacts)
7. **Action menu** — `MenuRoot` dropdown with "View Screenshot", "View JSON", "Re-capture" (always visible), plus standalone delete button
8. **Removes** — `deleteCapabilityCache`, `checkServerDeleteCapability`, `staleDeleteServerError`, `requestDeleteCapture`, `requestCapture`, `normalizeOutputDir`, `makeCaptureEntryForPreview` — all replaced by the new helpers above

Replace the `Component` function body. Here is the full component:

```tsx
/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SortIcon({ field, activeField, dir }: { field: SortField; activeField: SortField | null; dir: SortDir }) {
  if (field !== activeField) return <IconArrowsSort size={12} className="text-muted-foreground/50" />;
  return dir === 'asc'
    ? <IconArrowUp size={12} className="text-primary" />
    : <IconArrowDown size={12} className="text-primary" />;
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export function Component() {
  useShellHeaderTitle({ title: 'Design Layout Captures', breadcrumbs: ['Superuser', 'Design Layout Captures'] });

  const [rows, setRows] = useState<CaptureEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [captureServerOnline, setCaptureServerOnline] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [sortField, setSortField] = useState<SortField | null>('captured_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [previewLoadFailed, setPreviewLoadFailed] = useState<Set<string>>(new Set());

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const utilityIconSize = ICON_SIZES[ICON_CONTEXT_SIZE[ICON_STANDARD.utilityTopRight.context]];
  const utilityIconStroke = ICON_STROKES[ICON_STANDARD.utilityTopRight.stroke];

  // ---------- data loading ----------

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await fetchCaptures();
    setRows(data);
    setPreviewLoadFailed(new Set());
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
    checkCaptureServerHealth().then(setCaptureServerOnline);
  }, [loadData]);

  // ---------- polling ----------

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    pollRef.current = null;
    pollTimeoutRef.current = null;
  }, []);

  const startPolling = useCallback((captureId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const { data } = await fetchCaptures();
      setRows(data);
      const entry = data.find((c) => c.id === captureId);
      if (entry && entry.status !== 'capturing' && entry.status !== 'pending') {
        stopPolling();
        setPreviewLoadFailed(new Set());
      }
    }, POLL_INTERVAL_MS);
    // Auto-stop after timeout
    pollTimeoutRef.current = setTimeout(() => {
      stopPolling();
    }, POLL_TIMEOUT_MS);
  }, [stopPolling]);

  useEffect(() => stopPolling, [stopPolling]);

  // ---------- sort / filter ----------

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = rows
    .filter((row) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return [row.name, row.url, row.viewport, row.theme]
        .join(' ')
        .toLowerCase()
        .includes(q);
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ---------- re-capture ----------

  const handleReCapture = async (row: CaptureEntry) => {
    try {
      await triggerCapture(row);
      startPolling(row.id);
      void loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async (row: CaptureEntry) => {
    if (!window.confirm(`Delete capture "${row.name}" and remove its artifacts?`)) return;

    setDeleting((prev) => new Set(prev).add(row.id));
    try {
      await deleteCaptureEntry(row);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    }
  };

  // ---------- add-new modal ----------

  const [showAddNew, setShowAddNew] = useState(false);
  const [captureForm, setCaptureForm] = useState<CaptureFormData>({
    url: '',
    width: 1920,
    height: 1080,
    theme: 'light',
  });
  const [modalStatus, setModalStatus] = useState<{
    state: 'idle' | 'submitting' | 'capturing' | 'done' | 'error';
    message?: string;
    captureId?: string;
  }>({ state: 'idle' });

  const handleStartCapture = async () => {
    setModalStatus({ state: 'submitting' });
    try {
      const entry = await createCaptureEntry(captureForm);
      setModalStatus({ state: 'capturing', captureId: entry.id });
      void loadData();

      await triggerCapture(entry);
      startPolling(entry.id);
    } catch (err) {
      setModalStatus({ state: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  // Watch for polling completion to update modal
  useEffect(() => {
    if (modalStatus.state !== 'capturing' || !modalStatus.captureId) return;
    const entry = rows.find((r) => r.id === modalStatus.captureId);
    if (!entry) return;
    if (entry.status === 'complete') {
      setModalStatus({ state: 'done', captureId: entry.id });
    } else if (entry.status === 'failed') {
      setModalStatus({ state: 'error', message: 'Capture failed. Check the capture server logs.' });
    }
  }, [rows, modalStatus.state, modalStatus.captureId]);

  // ---------- render ----------

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pt-3">
      {!captureServerOnline && !loading && (
        <div className="flex items-center gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 dark:border-red-700 dark:bg-red-900/20">
          <span className="text-sm font-medium text-red-800 dark:text-red-300">Capture server unavailable</span>
          <span className="text-sm text-red-700 dark:text-red-400">
            Run <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs dark:bg-red-900/40">npm run capture-server</code> to start it on localhost:{CAPTURE_SERVER.split(':').pop()}
          </span>
        </div>
      )}
      <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          <label className="relative min-w-[220px] flex-1 max-w-sm">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
              <HugeiconsIcon icon={Search01Icon} size={utilityIconSize} strokeWidth={utilityIconStroke} className="text-muted-foreground" />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                const next = e.currentTarget?.value ?? '';
                setQuery(next);
                setPage(1);
              }}
              placeholder="Search captures"
              className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-2 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </label>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadData()}>
              <IconRefresh size={14} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowAddNew(true)}>
              <IconPlus size={14} />
              Add New
            </Button>
          </div>
        </div>

        {/* Table */}
        <ScrollArea className="min-h-0 flex-1">
          <table className="w-full table-fixed text-left">
            <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="w-10 px-3 py-2">
                  <Checkbox.Root
                    checked={selected.size === paginated.length && paginated.length > 0}
                    onCheckedChange={(details) => {
                      if (details.checked) {
                        setSelected(new Set(paginated.map((r) => r.id)));
                      } else {
                        setSelected(new Set());
                      }
                    }}
                  >
                    <Checkbox.Control className="h-4 w-4 rounded border-input" />
                    <Checkbox.HiddenInput />
                  </Checkbox.Root>
                </th>
                <th className="w-[6rem] px-3 py-2 font-medium">Preview</th>
                <th className="w-[40%] px-3 py-2 font-medium">URL</th>
                <th className="w-[7rem] px-3 py-2 font-medium">
                  <button type="button" onClick={() => toggleSort('viewport')} className="inline-flex items-center gap-1 hover:text-foreground">
                    Viewport <SortIcon field="viewport" activeField={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="w-[6rem] px-3 py-2 font-medium">
                  <button type="button" onClick={() => toggleSort('theme')} className="inline-flex items-center gap-1 hover:text-foreground">
                    Theme <SortIcon field="theme" activeField={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="w-[10rem] px-3 py-2 font-medium">
                  <button type="button" onClick={() => toggleSort('captured_at')} className="inline-flex items-center gap-1 hover:text-foreground">
                    Captured <SortIcon field="captured_at" activeField={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="w-[7rem] px-3 py-2 font-medium">Status</th>
                <th className="w-[7rem] px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">
                    Loading captures...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">
                    No captures yet. Click "Add New" to start.
                  </td>
                </tr>
              ) : (
                paginated.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      'border-b border-border/60 align-top hover:bg-accent/30',
                      selected.has(row.id) && 'bg-accent/20',
                    )}
                  >
                    <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox.Root
                        checked={selected.has(row.id)}
                        onCheckedChange={() => toggleRow(row.id)}
                      >
                        <Checkbox.Control className="h-4 w-4 rounded border-input" />
                        <Checkbox.HiddenInput />
                      </Checkbox.Root>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center">
                        {row.status === 'complete' && (
                          previewLoadFailed.has(row.id) ? (
                            <div className="flex h-8 w-14 shrink-0 items-center justify-center rounded border border-dashed border-border bg-muted text-[10px] text-muted-foreground">
                              No image
                            </div>
                          ) : (
                            <img
                              src={captureFileUrl(row, row.theme, 'viewport.png')}
                              alt=""
                              className="h-8 w-14 shrink-0 rounded border border-border object-cover object-top"
                              onError={() =>
                                setPreviewLoadFailed((prev) => new Set(prev).add(row.id))
                              }
                            />
                          )
                        )}
                      </div>
                    </td>
                    <td className="break-all whitespace-normal px-3 py-3 text-sm text-muted-foreground" title={row.url}>
                      {row.url}
                    </td>
                    <td className="px-3 py-3 text-sm text-muted-foreground font-mono">{row.viewport}</td>
                    <td className="px-3 py-3">
                      <Badge variant={THEME_BADGE[row.theme]} size="sm">{row.theme}</Badge>
                    </td>
                    <td className="px-3 py-3 text-sm text-muted-foreground">{formatDate(row.captured_at)}</td>
                    <td className="px-3 py-3">
                      <Badge
                        variant={
                          row.status === 'complete' ? 'green'
                          : row.status === 'failed' ? 'red'
                          : row.status === 'capturing' ? 'blue'
                          : 'gray'
                        }
                        size="sm"
                      >
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <MenuRoot>
                          <MenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              aria-label="Actions"
                              title="Actions"
                            >
                              <IconDots size={14} />
                            </Button>
                          </MenuTrigger>
                          <MenuPortal>
                            <MenuPositioner>
                              <MenuContent>
                                {row.status === 'complete' && (
                                  <>
                                    <MenuItem
                                      value="view-screenshot"
                                      onClick={() =>
                                        window.open(captureFileUrl(row, row.theme, 'viewport.png'), '_blank')
                                      }
                                    >
                                      View Screenshot
                                    </MenuItem>
                                    <MenuItem
                                      value="view-json"
                                      onClick={() =>
                                        window.open(captureFileUrl(row, row.theme, 'report.json'), '_blank')
                                      }
                                    >
                                      View JSON
                                    </MenuItem>
                                  </>
                                )}
                                <MenuItem
                                  value="re-capture"
                                  onClick={() => void handleReCapture(row)}
                                >
                                  Re-capture
                                </MenuItem>
                              </MenuContent>
                            </MenuPositioner>
                          </MenuPortal>
                        </MenuRoot>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                          aria-label="Delete capture"
                          title="Delete capture and artifacts"
                          onClick={() => void handleDelete(row)}
                          disabled={deleting.has(row.id)}
                        >
                          <IconTrash size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ScrollArea>

        {/* Pagination footer */}
        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                const value = Number(e.currentTarget?.value ?? '0');
                setPageSize(Number.isFinite(value) && value > 0 ? value : 10);
                setPage(1);
              }}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s} per page</option>
              ))}
            </select>
            {totalPages > 1 && (
              <Pagination.Root
                count={filtered.length}
                pageSize={pageSize}
                page={page}
                onPageChange={(details) => setPage(details.page)}
                className="flex items-center gap-1"
              >
                <Pagination.PrevTrigger className="rounded px-1.5 py-0.5 hover:bg-accent disabled:opacity-40">
                  Prev
                </Pagination.PrevTrigger>
                <span>Page {page} of {totalPages}</span>
                <Pagination.NextTrigger className="rounded px-1.5 py-0.5 hover:bg-accent disabled:opacity-40">
                  Next
                </Pagination.NextTrigger>
              </Pagination.Root>
            )}
          </div>
          <span className="font-medium">Total: {filtered.length}</span>
        </div>
      </section>

      {/* Add New Capture modal */}
      <DialogRoot open={showAddNew} onOpenChange={(details) => {
        setShowAddNew(details.open);
        if (!details.open) setModalStatus({ state: 'idle' });
      }}>
        <DialogContent className="max-w-lg">
          <DialogCloseTrigger />
          <DialogTitle>New Capture</DialogTitle>
          <DialogDescription>
            Enter a URL and capture settings. The capture server must be running on localhost:4488.
          </DialogDescription>

          <DialogBody>
            <label className="block">
              <span className="text-sm font-medium">URL</span>
              <input
                type="url"
                value={captureForm.url}
                onChange={(e) => {
                  const value = e.currentTarget?.value ?? '';
                  setCaptureForm((f) => ({ ...f, url: value }));
                }}
                placeholder="https://www.evidence.studio/settings/organization"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium">Width</span>
                <input
                  type="number"
                  value={captureForm.width}
                  onChange={(e) => {
                    const value = Number(e.currentTarget?.value ?? '0');
                    setCaptureForm((f) => ({ ...f, width: Number.isFinite(value) && value > 0 ? value : 1920 }));
                  }}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Height</span>
                <input
                  type="number"
                  value={captureForm.height}
                  onChange={(e) => {
                    const value = Number(e.currentTarget?.value ?? '0');
                    setCaptureForm((f) => ({ ...f, height: Number.isFinite(value) && value > 0 ? value : 1080 }));
                  }}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-medium">Theme</span>
              <select
                value={captureForm.theme}
                onChange={(e) => {
                  const next = (e.currentTarget?.value ?? 'light') as ThemeRequest;
                  setCaptureForm((f) => ({ ...f, theme: next }));
                }}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>

            {/* Status feedback */}
            {modalStatus.state === 'submitting' && (
              <p className="text-sm text-muted-foreground">Starting capture...</p>
            )}
            {modalStatus.state === 'capturing' && (
              <div className="flex gap-3 rounded-md border border-blue-300 bg-blue-50 p-3 dark:border-blue-700 dark:bg-blue-900/20">
                <span className="text-sm text-blue-800 dark:text-blue-300">Capturing... Playwright is running the measurement scripts.</span>
              </div>
            )}
            {modalStatus.state === 'done' && (
              <div className="flex gap-3 rounded-md border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-700 dark:bg-emerald-900/20">
                <span className="text-sm text-emerald-800 dark:text-emerald-300">Capture complete.</span>
              </div>
            )}
            {modalStatus.state === 'error' && (
              <div className="flex gap-3 rounded-md border border-red-300 bg-red-50 p-3 dark:border-red-700 dark:bg-red-900/20">
                <span className="text-sm text-red-800 dark:text-red-300">{modalStatus.message}</span>
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            {modalStatus.state !== 'done' && (
              <Button size="sm" variant="outline" onClick={() => setShowAddNew(false)}>Cancel</Button>
            )}
            {(modalStatus.state === 'idle' || modalStatus.state === 'error') && (
              <Button size="sm" onClick={() => void handleStartCapture()} disabled={!captureForm.url}>
                <IconCamera size={14} />
                Capture
              </Button>
            )}
            {modalStatus.state === 'done' && (
              <Button size="sm" variant="outline" onClick={() => setShowAddNew(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </div>
  );
}
```

### Step 4: Update test

Replace `web/src/pages/superuser/DesignLayoutCaptures.test.tsx` with:

```tsx
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Component as DesignLayoutCaptures } from './DesignLayoutCaptures';

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: vi.fn(),
}));

const sampleCapture = {
  id: 'capture-1',
  name: 'Long Layout Capture Name',
  url: 'https://example.com/super/long/path/that/should/wrap/in/a/narrow/table/layout',
  viewport: '1440x1024',
  theme: 'light' as const,
  captured_at: '2026-03-19T12:00:00.000Z',
  output_dir: 'captures/capture-1',
  status: 'complete' as const,
  created_at: '2026-03-19T12:00:00.000Z',
  updated_at: '2026-03-19T12:00:00.000Z',
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('DesignLayoutCaptures responsiveness', () => {
  it('uses an image-only preview column while wrapping long URL content', async () => {
    const { platformApiFetch } = await import('@/lib/platformApi');
    (platformApiFetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ captures: [sampleCapture] }),
    });

    // Mock capture server health check
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) }),
    );

    const { container } = render(<DesignLayoutCaptures />);

    await screen.findByText(sampleCapture.url);

    const table = container.querySelector('table');
    const previewCell = container.querySelector('tbody tr td:nth-child(2)');
    const urlCell = container.querySelector('tbody tr td:nth-child(3)');

    expect(table?.className).toContain('table-fixed');
    expect(previewCell?.querySelector('img')).not.toBeNull();
    expect(previewCell?.textContent?.trim()).toBe('');
    expect(urlCell?.className).toContain('whitespace-normal');
    expect(urlCell?.className).toContain('break-all');
  });
});
```

### Step 5: Verify

```bash
cd web && npx tsc --noEmit --project tsconfig.app.json
cd web && npx vitest run src/pages/superuser/DesignLayoutCaptures.test.tsx
```

### Step 6: Commit

```bash
git add web/src/pages/superuser/design-captures.types.ts \
        web/src/pages/superuser/DesignLayoutCaptures.tsx \
        web/src/pages/superuser/DesignLayoutCaptures.test.tsx
git commit -m "feat(frontend): wire captures to platform-api with action menu and polling"
```

---

## Task 5: Seed migration and cleanup

**Files:**
- Delete or archive: `docs/design-layouts/captures.json`
- Modify: `package.json` (capture-server npm script — update env var docs if needed)

### Step 1: Verify captures.json is clean

Task 0 already stripped the `pageType` suffix from IDs and removed `both` theme. Verify:

```bash
node -e "
const captures = JSON.parse(require('fs').readFileSync('docs/design-layouts/captures.json', 'utf8'));
const problems = [];
captures.forEach(c => {
  if (c.pageType) problems.push('pageType still present on ' + c.id);
  if (c.theme === 'both') problems.push('both theme still present on ' + c.id);
});
const ids = captures.map(c => c.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length) dupes.forEach(d => problems.push('Duplicate ID: ' + d));
if (problems.length) { console.log('PROBLEMS:'); problems.forEach(p => console.log('  ' + p)); }
else { console.log('Clean. ' + captures.length + ' entries ready to seed.'); }
"
```

If duplicates or stale fields remain, fix captures.json before proceeding (Task 0 should have handled this).

### Step 2: Seed existing data

Write a one-time seed script that reads the current `captures.json` and POSTs each entry to the platform-api:

```bash
node -e "
const fs = require('fs');
const captures = JSON.parse(fs.readFileSync('docs/design-layouts/captures.json', 'utf8'));
(async () => {
  for (const c of captures) {
    // IDs and themes are already clean (Task 0 stripped pageType suffix and removed both)
    const res = await fetch('http://localhost:8000/admin/captures', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.PLATFORM_API_M2M_TOKEN,
      },
      body: JSON.stringify({
        id: c.id,
        name: c.name,
        url: c.url,
        viewport: c.viewport,
        theme: c.theme,
        status: c.status,
        output_dir: c.outputDir,
      }),
    });
    console.log(c.id, res.status);
  }
})();
"
```

Note: captures.json uses camelCase (`outputDir`) — the script maps it to snake_case for the API. The `id`, `theme`, and `status` fields are used as-is since Task 0 already cleaned them.

Run this once with the platform-api running locally.

### Step 3: Delete captures.json

After seeding is verified:

```bash
rm docs/design-layouts/captures.json
```

### Step 4: Commit

```bash
git add docs/design-layouts/captures.json
git commit -m "chore: remove captures.json — data now lives in Supabase"
```

---

## Task 6: End-to-end verification

**Preconditions:** Platform-api, capture server, and frontend dev server all running.

### Step 1: Start services

```bash
# Terminal 1
cd services/platform-api && uvicorn app.main:app --reload

# Terminal 2
PLATFORM_API_M2M_TOKEN=<your-token> node scripts/capture-server.mjs

# Terminal 3
cd web && npm run dev
```

### Step 2: Verify list loads from API

Navigate to `/app/superuser/design-layout-captures`. The table should load data from the API (seeded entries from Task 5).

### Step 3: Add a new capture

1. Click "Add New"
2. Enter a public URL (e.g., `https://example.com`)
3. Select viewport and theme
4. Click "Capture"
6. Verify: entry appears in table with status `pending` → `capturing` (via polling)
7. Verify: status transitions to `complete` or `failed`
8. Verify: modal updates to "Capture complete." or shows error

### Step 4: Verify action menu

1. Click the 3-dot menu on a `complete` row → verify "View Screenshot", "View JSON", "Re-capture" items
2. Click the 3-dot menu on a `failed` row → verify only "Re-capture" is shown (no view items)
3. Click "Re-capture" → verify the row cycles through `capturing` → `complete`

### Step 5: Verify delete

1. Click the delete button → confirm dialog → verify row disappears from table AND from database
2. Verify local artifacts are removed: check the full `output_dir` path (e.g., `ls docs/design-layouts/<slug>/<viewport>/`) — the viewport subdirectory should be gone. The parent slug directory may still exist if other viewport captures of the same URL remain.

### Step 6: Verify database

```sql
SELECT id, name, status, captured_at
FROM design_layout_captures
ORDER BY created_at DESC LIMIT 5;
```

### Step 7: Fix any issues found and commit

```bash
git add <fixup files>
git commit -m "fix: adjustments from live verification"
```

---

## Summary of changes by file

| File | Action | Task |
|------|--------|------|
| `web/src/pages/superuser/design-captures.types.ts` | Remove pageType/both, then update for DB shape | 0, 4 |
| `web/src/pages/superuser/DesignLayoutCaptures.tsx` | Remove pageType/both column, rewrite for API + menu + polling | 0, 4 |
| `web/src/pages/superuser/DesignLayoutCaptures.test.tsx` | Remove pageType, update mocks for API | 0, 4 |
| `scripts/capture-server.mjs` | Remove pageType/both, rewrite as async API-backed runner with cleanup route | 0, 3 |
| `docs/design-layouts/captures.json` | Clean pageType, eventually delete | 0, 5 |
| `supabase/migrations/...103...sql` | New table | 1 |
| `services/platform-api/app/api/routes/admin_captures.py` | New CRUD routes | 2 |
| `services/platform-api/app/main.py` | Register new router | 2 |

## Commit sequence

1. `refactor: remove dead pageType and both theme from design layout captures`
2. `feat(migration): add design_layout_captures table`
3. `feat(api): add admin CRUD routes for design layout captures`
4. `feat(capture-server): async capture with platform-api persistence`
5. `feat(frontend): wire captures to platform-api with action menu and polling`
6. `chore: remove captures.json — data now lives in Supabase`
7. (if needed) `fix: adjustments from live verification`