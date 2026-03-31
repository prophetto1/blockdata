# Docling Block Types Absorption Implementation Plan

**Goal:** Remove the standalone "Block Types" page (`SuperuserDocumentViews.tsx`), absorb its single setting as a card into the Docling Profiles page (`DoclingConfigPanel.tsx`), replace the failing `admin-config` edge function call with a new platform-api endpoint, remove the Docling secondary rail (which existed only to toggle between Profiles and Block Types), and remove the `document-views` route.

**Architecture:** The `platform.docling_blocks_mode` policy currently lives in `admin_runtime_policy` and is read/written through the `admin-config` Supabase edge function (which is currently failing with "Failed to fetch"). A new platform-api endpoint (`GET/PATCH /admin/config/docling`) will replace that edge function call. The setting is absorbed into `DoclingConfigPanel.tsx` as a `SettingCard` below the profile toolbar. The `documentViews.ts` utility module stays (it has consumers in `parseArtifacts.ts` and `BlockViewerGridRDG.tsx`) but its `loadDocumentViewMode()` function will be updated to call platform-api instead of the `upload-policy` edge function.

**Tech Stack:** FastAPI, React + TypeScript, OpenTelemetry, pytest, Vitest

**Status:** Complete
**Author:** Jon
**Date:** 2026-03-30

---

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any item below needs to change, the implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. The "Block Types" page (`SuperuserDocumentViews.tsx`) is deleted. Its single setting is absorbed into `DoclingConfigPanel.tsx`.
2. The `document-views` route is removed from the router.
3. The Docling secondary rail (`DOCLING_SECTIONS`) is removed. Clicking "Docling" in the 1st rail navigates directly to the Profiles page with no 2nd rail.
4. The `documentViews.ts` utility module is NOT deleted — it has consumers (`parseArtifacts.ts`, `BlockViewerGridRDG.tsx`). Its `loadDocumentViewMode()` is updated to call platform-api.
5. The `admin-config` edge function is NOT deleted in this plan — other pages may still reference it. Only the Block Types page's usage is removed.
6. The `DoclingProfileEditor.tsx` file is NOT deleted — it is a separate page component (used by a different mount) and is out of scope.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. Navigating to `/app/superuser/parsers-docling` shows the Profiles page with a "Block Presentation" setting card visible (below the toolbar, above the config editor).
2. The setting card displays the current `docling_blocks_mode` value loaded from platform-api.
3. Changing and saving the setting writes through platform-api, not the edge function.
4. Navigating to `/app/superuser/document-views` hits a 404 / no route match.
5. The Docling entry in the 1st rail no longer triggers a 2nd rail.
6. `loadDocumentViewMode()` in `documentViews.ts` calls platform-api instead of the `upload-policy` edge function.
7. All existing tests pass. New tests cover the platform-api endpoint.

---

## Manifest

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/admin/config/docling` | Read docling config policies (block presentation mode) | New |
| PATCH | `/admin/config/docling` | Update docling config policies | New |

#### New endpoint contracts

`GET /admin/config/docling`

- Auth: `require_superuser`
- Request: no body
- Response: `{ "docling_blocks_mode": "raw_docling" | "normalized" }`
- Touches: `public.admin_runtime_policy` — reads row where `policy_key = 'platform.docling_blocks_mode'`

`PATCH /admin/config/docling`

- Auth: `require_superuser`
- Request: `{ "docling_blocks_mode": "raw_docling" | "normalized", "reason": "string" }`
- Response: `{ "docling_blocks_mode": "raw_docling" | "normalized", "updated_at": "...", "updated_by": "..." }`
- Touches: `public.admin_runtime_policy` (upsert), `public.admin_runtime_policy_audit` (insert)
- Pattern: follows `admin_storage.py` exactly — read current, upsert new, write audit row

### Observability

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Trace span | `admin.config.docling.read` | `admin_config_docling.py:get_docling_config` | Measure read latency |
| Trace span | `admin.config.docling.update` | `admin_config_docling.py:patch_docling_config` | Measure update latency |
| Structured log | `admin.config.docling.updated` | `admin_config_docling.py:patch_docling_config` | Audit old/new value and reason |
| Metric | `platform.admin.config.docling.read.count` | `admin_config_docling.py` | Count reads |
| Metric | `platform.admin.config.docling.update.count` | `admin_config_docling.py` | Count updates |

Observability attribute rules:

- Allowed attributes: `policy_key`, `result`, `http.status_code`, `docling_blocks_mode`
- Forbidden in trace or metric attributes: `user_id`, `email`, `reason`

### Database Migrations

No database migrations. The `admin_runtime_policy` table and the `platform.docling_blocks_mode` policy key already exist.

### Edge Functions

No edge functions created or modified. The `admin-config` edge function is left in place (other consumers may exist). Only the frontend call from `SuperuserDocumentViews.tsx` is removed, and `documentViews.ts:loadDocumentViewMode()` is redirected to platform-api.

### Frontend Surface Area

**New pages:** `0`
**New components:** `0`
**New hooks:** `0`

**Deleted pages:** `1`

| Page | File | Why |
|------|------|-----|
| `SuperuserDocumentViews` | `web/src/pages/superuser/SuperuserDocumentViews.tsx` | Absorbed into DoclingConfigPanel |

**Modified files:** `6`

| File | What changes |
|------|-------------|
| `web/src/pages/settings/DoclingConfigPanel.tsx` | Add block presentation `SettingCard` below toolbar, loaded/saved via platform-api |
| `web/src/pages/superuser/documentViews.ts` | Update `loadDocumentViewMode()` to call `platformApiFetch('/admin/config/docling')` instead of `edgeFetch('upload-policy')` |
| `web/src/components/admin/AdminLeftNav.tsx` | Remove `DOCLING_SECTIONS`, remove docling case from `getSecondaryNav()` |
| `web/src/components/admin/__tests__/AdminLeftNav.test.tsx` | Remove docling secondary nav tests, update `getSecondaryNav` contract tests |
| `web/src/router.tsx` | Remove `document-views` route |
| `web/src/components/layout/__tests__/AdminShellLayout.test.tsx` | Remove or update test for parsers-docling secondary rail if present |

---

## Locked Platform API Surface

#### New superuser-only platform API endpoints: `2`

1. `GET /admin/config/docling`
2. `PATCH /admin/config/docling`

#### Existing platform API endpoints modified: `0`

---

## Locked Inventory Counts

### Backend

- New route modules: `1` (`admin_config_docling.py`)
- New observability modules: `1` (`admin_config_docling_metrics.py`)
- Modified files: `1` (`main.py` — register router)

### Frontend

- Deleted files: `1` (`SuperuserDocumentViews.tsx`)
- Modified files: `6`

### Tests

- New test modules: `2` (backend endpoint test, frontend integration)
- Modified test modules: `2` (`AdminLeftNav.test.tsx`, `AdminShellLayout.test.tsx`)

---

## Locked File Inventory

### New files

- `services/platform-api/app/api/routes/admin_config_docling.py`
- `services/platform-api/app/observability/admin_config_docling_metrics.py`
- `services/platform-api/tests/test_admin_config_docling.py`

### Deleted files

- `web/src/pages/superuser/SuperuserDocumentViews.tsx`

### Modified files

- `services/platform-api/app/main.py`
- `web/src/pages/settings/DoclingConfigPanel.tsx`
- `web/src/pages/superuser/documentViews.ts`
- `web/src/components/admin/AdminLeftNav.tsx`
- `web/src/components/admin/__tests__/AdminLeftNav.test.tsx`
- `web/src/router.tsx`
- `web/src/components/layout/__tests__/AdminShellLayout.test.tsx`

---

## Explicit Risks Accepted In This Plan

1. The `admin-config` edge function is not deleted. If no other consumers exist, it becomes dead code. A future cleanup can remove it.
2. The `docling_blocks_mode` setting currently has only one valid option (`raw_docling`). The platform-api endpoint accepts both `raw_docling` and `normalized` to preserve the contract for future use.
3. The `loadDocumentViewMode()` in `documentViews.ts` switches from the `upload-policy` edge function to platform-api. The two consumers (`parseArtifacts.ts`, `BlockViewerGridRDG.tsx`) will now call platform-api at runtime. This is the correct direction per user feedback on edge function distancing.

---

## Completion Criteria

The work is complete only when all of the following are true:

1. The `SuperuserDocumentViews.tsx` page is deleted.
2. The `document-views` route is removed from `router.tsx`.
3. The Docling secondary rail is removed — `getSecondaryNav` returns `[]` for `parsers-docling`.
4. The `DoclingConfigPanel` shows the block presentation setting card, loaded and saved via platform-api.
5. `loadDocumentViewMode()` calls platform-api, not an edge function.
6. The two new platform-api endpoints exist with observability.
7. All tests pass.
8. The inventory counts match.

---

## Tasks

### Task 1: Create platform-api docling config endpoint

**File(s):** `services/platform-api/app/api/routes/admin_config_docling.py`

**Step 1:** Create the route module following the `admin_storage.py` pattern. Two endpoints:
- `GET /admin/config/docling` — reads `platform.docling_blocks_mode` from `admin_runtime_policy`, returns `{ "docling_blocks_mode": value }`. Default to `"raw_docling"` if row missing.
- `PATCH /admin/config/docling` — accepts `{ "docling_blocks_mode": str, "reason": str }`, validates value is `"raw_docling"` or `"normalized"`, upserts the policy row, writes audit row, returns updated value.

Both require `require_superuser`.

**Step 2:** Verify file compiles with no import errors.

**Commit:** `feat: add platform-api docling config endpoint`

---

### Task 2: Create observability for docling config endpoint

**File(s):** `services/platform-api/app/observability/admin_config_docling_metrics.py`

**Step 1:** Create metrics module with:
- Tracer: `admin_config_docling_tracer`
- Counter: `platform.admin.config.docling.read.count`
- Counter: `platform.admin.config.docling.update.count`
- Record functions: `record_admin_config_docling_read(result, duration_ms, http_status_code)`, `record_admin_config_docling_update(result, docling_blocks_mode, duration_ms, http_status_code)`

Follow the pattern in existing observability modules.

**Step 2:** Wire the tracer and record functions into the route module from Task 1.

**Commit:** `feat: add observability for docling config endpoint`

---

### Task 3: Register the router in main.py

**File(s):** `services/platform-api/app/main.py`

**Step 1:** Add import and `app.include_router(admin_config_docling_router)` in the admin routes section (after `admin_runtime_readiness_router`).

**Commit:** `feat: register docling config router`

---

### Task 4: Write backend tests

**File(s):** `services/platform-api/tests/test_admin_config_docling.py`

**Step 1:** Write tests covering:
- GET returns default `raw_docling` when no row exists
- GET returns stored value when row exists
- PATCH updates value and writes audit row
- PATCH rejects invalid values (not `raw_docling` or `normalized`)
- Both endpoints require superuser auth

**Test command:** `cd services/platform-api && python -m pytest tests/test_admin_config_docling.py -v`

**Commit:** `test: docling config endpoint`

---

### Task 5: Remove Docling secondary rail

**File(s):** `web/src/components/admin/AdminLeftNav.tsx`

**Step 1:** Delete the `DOCLING_SECTIONS` constant.

**Step 2:** Remove the `parsers-docling` / `document-views` case from `getSecondaryNav()`.

**Step 3:** Verify `getSecondaryNav('/app/superuser/parsers-docling')` now returns `[]`.

**Test command:** `cd web && npx vitest run src/components/admin/__tests__/AdminLeftNav.test.tsx`

**Commit:** `feat: remove Docling secondary rail`

---

### Task 6: Update AdminLeftNav tests

**File(s):** `web/src/components/admin/__tests__/AdminLeftNav.test.tsx`

**Step 1:** Remove the test `'renders docling secondary links for docling pages'`.

**Step 2:** Move `parsers-docling` and `document-views` from the "returns sections" test to the "returns empty array" test in the `getSecondaryNav` contract tests.

**Test command:** `cd web && npx vitest run src/components/admin/__tests__/AdminLeftNav.test.tsx`

**Commit:** `test: update AdminLeftNav tests for Docling rail removal`

---

### Task 7: Remove document-views route

**File(s):** `web/src/router.tsx`

**Step 1:** Remove the line `{ path: 'document-views', lazy: () => import('@/pages/superuser/SuperuserDocumentViews') }`.

**Commit:** `feat: remove document-views route`

---

### Task 8: Delete SuperuserDocumentViews page

**File(s):** `web/src/pages/superuser/SuperuserDocumentViews.tsx`

**Step 1:** Delete the file.

**Commit:** `feat: delete SuperuserDocumentViews page`

---

### Task 9: Update loadDocumentViewMode to use platform-api

**File(s):** `web/src/pages/superuser/documentViews.ts`

**Step 1:** Replace the `edgeFetch('upload-policy', ...)` call in `loadDocumentViewMode()` with `platformApiFetch('/admin/config/docling')`. Import `platformApiFetch` from `@/lib/platformApi`.

**Step 2:** Update the response parsing — the new endpoint returns `{ "docling_blocks_mode": "raw_docling" }` directly, not the nested `{ platform: { docling_blocks_mode: ... } }` or `{ policies: [...] }` shape.

**Step 3:** Remove the `edgeFetch` import if it's no longer used in this file.

**Test command:** `cd web && npx vitest run src/pages/superuser/documentViews.test.ts`

**Commit:** `feat: loadDocumentViewMode calls platform-api`

---

### Task 10: Add block presentation card to DoclingConfigPanel

**File(s):** `web/src/pages/settings/DoclingConfigPanel.tsx`

**Step 1:** Import `platformApiFetch` from `@/lib/platformApi`.

**Step 2:** Add state for the block presentation mode: `blockMode`, `blockModeServer`, `blockModeLoading`, `blockModeSaving`, `blockModeError`.

**Step 3:** Load the value on mount via `platformApiFetch('/admin/config/docling')`.

**Step 4:** Add a save handler that calls `platformApiFetch('/admin/config/docling', { method: 'PATCH', ... })`.

**Step 5:** Render a settings section below the toolbar (before the profile editor) with:
- A bordered card showing "Block Presentation" label
- A description: "Parse Blocks uses Docling-native labels and reading order."
- A select with options: `Docling Native` (`raw_docling`)
- A save button (shown when dirty)

**Step 6:** The card should be visually distinct from the profile editor — a simple bordered card above the scroll area.

**Test command:** `cd web && npx vitest run src/pages/settings/DoclingConfigPanel.tsx` (if test exists) or verify manually.

**Commit:** `feat: add block presentation card to DoclingConfigPanel`

---

### Task 11: Update AdminShellLayout test

**File(s):** `web/src/components/layout/__tests__/AdminShellLayout.test.tsx`

**Step 1:** If there is a test asserting `parsers-docling` shows the secondary rail, update it to assert the secondary rail is NOT present for that route (since Docling no longer has secondary nav).

**Test command:** `cd web && npx vitest run src/components/layout/__tests__/AdminShellLayout.test.tsx`

**Commit:** `test: update admin shell layout for Docling rail removal`

---

### Task 12: Run full test suite

**Step 1:** Run all admin, layout, and superuser tests.

**Test command:** `cd web && npx vitest run src/components/admin/ src/components/layout/ src/pages/superuser/ src/pages/settings/`

**Expected output:** All tests pass, zero failures.

**Commit:** No commit — verification only.
