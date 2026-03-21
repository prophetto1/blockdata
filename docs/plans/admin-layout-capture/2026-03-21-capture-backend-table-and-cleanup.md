# Design Layout Captures — Backend Table, Cleanup & Bug Fix

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate design layout captures from filesystem JSON to a Supabase PostgreSQL table with FastAPI CRUD endpoints, remove dead `pageType` field, and fix the "capturing forever" UI bug.

**Architecture:**
Data persistence moves from `captures.json` to a `design_layout_captures` Supabase table accessed through FastAPI admin routes. The local capture server (`scripts/capture-server.mjs`) becomes a thin Playwright runner — it still executes headless browser captures locally, but reads/writes capture metadata through the platform-api instead of the filesystem. The frontend switches from `localhost:4488` for data to the platform-api, and only hits the local server to trigger captures. Captures run asynchronously: the server returns immediately after starting and updates the API when done, eliminating the "capturing forever" blocking behavior.

**Tech Stack:** FastAPI, Supabase PostgreSQL, Pydantic, React + TypeScript, Node.js (Playwright runner)

---

## Task 0: Remove `pageType` from all layers

`pageType` does nothing — the pulldown values (`settings`, `editor`, `dashboard`, `workbench`, `marketing`) have no behavioral effect. Remove it everywhere.

**Files:**
- Modify: `web/src/pages/superuser/design-captures.types.ts`
- Modify: `web/src/pages/superuser/DesignLayoutCaptures.tsx`
- Modify: `web/src/pages/superuser/DesignLayoutCaptures.test.tsx`
- Modify: `scripts/capture-server.mjs`
- Modify: `docs/design-layouts/captures.json`

### Step 1: Remove from types

In `web/src/pages/superuser/design-captures.types.ts`:

- Delete the `PageType` type entirely
- Remove `pageType: PageType` from `CaptureEntry`
- Remove `pageType: PageType` from `CaptureRequest`
- Remove `PageType` from any import/export

### Step 2: Remove from component

In `web/src/pages/superuser/DesignLayoutCaptures.tsx`:

- Remove `PageType` from the type import
- Delete `PAGE_TYPE_COLORS` constant
- Remove `'pageType'` from the `SortField` union type
- Remove `row.pageType` from the search filter array
- Remove `pageType: row.pageType` from `handleReCapture` request
- Remove `pageType: 'settings'` from `captureForm` initial state
- Delete the Page Type `<th>` column header (the sortable button)
- Delete the Page Type `<td>` cell (the colored badge)
- Delete the Page Type `<select>` from the modal form
- Update `colSpan` from 9 to 8 in the loading/empty `<td>` elements

### Step 3: Remove from test

In `web/src/pages/superuser/DesignLayoutCaptures.test.tsx`:

- Remove `pageType: 'settings' as const` from `sampleCapture`

### Step 4: Remove from capture server

In `scripts/capture-server.mjs`:

- Remove `pageType = "settings"` from `startCapture` destructuring
- Change ID format from `${slug}--${width}x${height}--${theme}--${pageType}` to `${slug}--${width}x${height}--${theme}`
- Remove `pageType` from the entry object
- Remove `pageType` from the startup console.log message

### Step 5: Clean captures.json

In `docs/design-layouts/captures.json`:

- Remove `"pageType": "..."` from every entry
- Update every `"id"` to strip the `--${pageType}` suffix (e.g., `"gumloop-com-...--light--settings"` becomes `"gumloop-com-...--light"`)

### Step 6: Verify

```bash
cd web && npx tsc --noEmit --project tsconfig.app.json
cd web && npx vitest run src/pages/superuser/DesignLayoutCaptures.test.tsx
```

### Step 7: Commit

```bash
git add web/src/pages/superuser/design-captures.types.ts \
        web/src/pages/superuser/DesignLayoutCaptures.tsx \
        web/src/pages/superuser/DesignLayoutCaptures.test.tsx \
        scripts/capture-server.mjs \
        docs/design-layouts/captures.json
git commit -m "refactor: remove dead pageType from design layout captures"
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
  id            TEXT        PRIMARY KEY,
  name          TEXT        NOT NULL,
  url           TEXT        NOT NULL,
  viewport      TEXT        NOT NULL,
  theme         TEXT        NOT NULL CHECK (theme IN ('light', 'dark')),
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'capturing', 'complete', 'failed')),
  output_dir    TEXT,
  captured_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE design_layout_captures IS 'Superuser tool: Playwright-based layout capture metadata. Artifacts live on local filesystem.';
```

### Step 2: Apply migration locally

```bash
npx supabase db push --local
```

Or if using remote:

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
VALID_STATUSES = {"pending", "capturing", "complete", "failed"}


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
#  POST /admin/captures — create or update entry
# ---------------------------------------------------------------------------

class CaptureCreate(BaseModel):
    id: str
    name: str
    url: str
    viewport: str
    theme: str
    status: str = "pending"
    output_dir: str | None = None


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

In `services/platform-api/app/main.py`, after the admin_services router (line 108), add:

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

## Task 3: Make capture server async and API-backed

This is the biggest change. The capture server stops managing `captures.json` and instead:
1. Receives a capture request with a pre-created capture ID
2. Calls the platform-api to update status to `capturing`
3. Runs `measureLayout` in the background
4. Calls the platform-api to update status to `complete` or `failed`
5. Returns immediately to the caller

**Files:**
- Rewrite: `scripts/capture-server.mjs`

### Step 1: Rewrite capture-server.mjs

The server needs these capabilities:
- `POST /capture` — accepts `{ id, url, width, height, theme, outputDir }`, starts async capture, returns immediately
- `GET /health` — simple health check for frontend connection detection
- `GET /files/*` — serves local capture artifacts (screenshots, reports)
- CORS headers on all responses

Key changes from current:
- **No `captures.json`** — all CRUD goes through the platform-api
- **No `readCaptures` / `writeCaptures`** — removed
- **No `updateCaptureStatus`** — replaced with HTTP PATCH to platform-api
- **Async capture** — `runCapture` spawns in background, POST returns immediately
- **API_URL** — configurable via `PLATFORM_API_URL` env var (defaults to local dev)
- **API_TOKEN** — configurable via `PLATFORM_API_TOKEN` env var (M2M token for auth)

The server calls:
```
PATCH /admin/captures/{id}  { status: "capturing" }
PATCH /admin/captures/{id}  { status: "complete", captured_at: "..." }
PATCH /admin/captures/{id}  { status: "failed" }
```

Capture timeout: add a 120-second timeout to `measureLayout`. If it exceeds this, mark as `failed`.

### Step 2: Verify locally

```bash
node scripts/capture-server.mjs
# In another terminal:
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

**Files:**
- Modify: `web/src/pages/superuser/design-captures.types.ts`
- Modify: `web/src/pages/superuser/DesignLayoutCaptures.tsx`
- Modify: `web/src/pages/superuser/DesignLayoutCaptures.test.tsx`

### Step 1: Update types

Add `created_at` and `updated_at` to `CaptureEntry` (from database):

```ts
export type CaptureEntry = {
  id: string;
  name: string;
  url: string;
  viewport: string;
  theme: ThemeRequest;
  captured_at: string | null;
  output_dir: string;
  status: CaptureStatus;
  created_at: string;
  updated_at: string;
};
```

Note: field names switch to snake_case to match the database columns directly.

Update `CaptureRequest` — this is what the frontend sends to create a capture:

```ts
export type CaptureRequest = {
  url: string;
  width: number;
  height: number;
  theme: ThemeRequest;
};
```

### Step 2: Update data flow in component

The component changes from one server to two:

| Operation | Before | After |
|-----------|--------|-------|
| List captures | `GET localhost:4488/captures` | `GET platform-api/admin/captures` |
| Create capture | `POST localhost:4488/capture` | `POST platform-api/admin/captures` (create entry) → `POST localhost:4488/capture` (trigger Playwright) |
| Delete capture | `POST localhost:4488/captures/:id/delete` | `DELETE platform-api/admin/captures/:id` |
| View files | `GET localhost:4488/files/*` | `GET localhost:4488/files/*` (unchanged — files are local) |
| Re-capture | `POST localhost:4488/capture` | `PATCH platform-api/admin/captures/:id` (reset status) → `POST localhost:4488/capture` (trigger Playwright) |

Key changes in the component:

- `CAPTURE_SERVER` stays for file serving and Playwright triggering
- Add `API_URL` constant: `import.meta.env.VITE_API_URL || 'http://localhost:8000'`
- `fetchCaptures` → `GET ${API_URL}/admin/captures` with auth header
- `requestCapture` → two-step: POST to API (create entry), then POST to capture server (trigger)
- `requestDeleteCapture` → `DELETE ${API_URL}/admin/captures/${id}`
- Add polling: after triggering a capture, poll `GET ${API_URL}/admin/captures` every 3 seconds until status changes from `capturing`
- Remove the `checkServerDeleteCapability` / `staleDeleteServerError` complexity — API always supports DELETE
- Auth header: use the Supabase session token from the auth context

### Step 3: Fix "capturing forever"

The polling mechanism fixes this. After triggering a capture:

```ts
const pollForCompletion = (captureId: string) => {
  const interval = setInterval(async () => {
    const { data } = await fetchCaptures();
    const entry = data.find(c => c.id === captureId);
    if (entry && entry.status !== 'capturing' && entry.status !== 'pending') {
      clearInterval(interval);
      void loadData();
    }
  }, 3000);
  // Auto-stop after 3 minutes
  setTimeout(() => clearInterval(interval), 180_000);
};
```

The modal flow becomes:
1. Click Capture → create entry via API → trigger capture server → show "Capturing..."
2. Poll API every 3s → when status changes to `complete` or `failed` → update modal
3. If 3 minutes pass with no change → stop polling, show timeout message

### Step 4: Update test

Update the test to mock the new API calls instead of the old capture server calls.

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
git commit -m "feat(frontend): wire captures to platform-api with async polling"
```

---

## Task 5: Cleanup

**Files:**
- Delete or archive: `docs/design-layouts/captures.json` (no longer used)
- Modify: `package.json` (if capture-server npm script needs env var updates)

### Step 1: Remove captures.json dependency

The capture server no longer reads or writes `captures.json`. The file can be deleted or kept as a historical artifact. If existing entries need to be migrated, write a one-time script:

```bash
# One-time seed from captures.json to Supabase (run manually)
node -e "
const captures = require('./docs/design-layouts/captures.json');
for (const c of captures) {
  await fetch('http://localhost:8000/admin/captures', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer YOUR_TOKEN' },
    body: JSON.stringify(c),
  });
}
"
```

### Step 2: Verify end-to-end

1. Start platform-api: `cd services/platform-api && uvicorn app.main:app --reload`
2. Start capture server: `npm run capture-server`
3. Start frontend: `cd web && npm run dev`
4. Navigate to `/app/superuser/design-layout-captures`
5. Verify: list loads from API, add new capture triggers Playwright, status updates via polling, delete works

### Step 3: Commit

```bash
git add -A
git commit -m "chore: remove captures.json dependency, add migration seed"
```

---

## Task 6: Live end-to-end verification with a real URL

Implementation is not done until we prove it works. The user provides a URL. We run it through the full pipeline and both visually confirm the output.

**Preconditions:** All three services running (platform-api, capture server, frontend dev server).

### Step 1: User provides a target URL

Ask the user for a URL to capture. Get viewport and theme preferences (defaults: 1920x1080, light).

### Step 2: Create capture via the admin UI

1. Open `/app/superuser/design-layout-captures` in the browser
2. Click "Add New"
3. Enter the URL, viewport, and theme
4. Click "Capture"

### Step 3: Verify async flow

Observe:
- Entry appears in the table with status `pending` → `capturing`
- Modal shows "Capturing..." with polling active
- Status transitions to `complete` (or `failed` with a clear error)
- Modal updates to "Capture complete."

### Step 4: Verify database record

```bash
# Query the Supabase table directly
npx supabase db execute "SELECT id, name, url, status, captured_at FROM design_layout_captures ORDER BY created_at DESC LIMIT 1;"
```

Confirm: row exists, status is `complete`, `captured_at` is populated.

### Step 5: Verify output artifacts

Check the output directory for the expected files:

```bash
ls docs/design-layouts/<capture-slug>/<viewport>/<theme>/
```

Expected files:
- `viewport.png` — full-page screenshot
- `report.json` — layout measurement report

### Step 6: Visual inspection

- Open `viewport.png` — confirm it shows the correct page at the correct viewport
- Open `report.json` — confirm it contains layout measurements (bounding boxes, computed styles)
- Preview thumbnail loads in the admin table

### Step 7: Verify re-capture and delete

1. Click the 3-dot menu on the row → "Re-capture" → confirm it cycles through `capturing` → `complete` again
2. Click the delete button → confirm row disappears from table AND from database AND output directory is removed

### Step 8: Final commit (if any fixups were needed)

```bash
git add <any fixup files>
git commit -m "fix: adjustments from live verification"
```

---

## Summary of changes by file

| File | Action | Task |
|------|--------|------|
| `web/src/pages/superuser/design-captures.types.ts` | Remove pageType, update field names | 0, 4 |
| `web/src/pages/superuser/DesignLayoutCaptures.tsx` | Remove pageType column/form, wire to API, add polling | 0, 4 |
| `web/src/pages/superuser/DesignLayoutCaptures.test.tsx` | Remove pageType, update mocks | 0, 4 |
| `scripts/capture-server.mjs` | Remove pageType, rewrite as async Playwright runner | 0, 3 |
| `docs/design-layouts/captures.json` | Clean pageType, eventually delete | 0, 5 |
| `supabase/migrations/...103...sql` | New table | 1 |
| `services/platform-api/app/api/routes/admin_captures.py` | New CRUD routes | 2 |
| `services/platform-api/app/main.py` | Register new router | 2 |
