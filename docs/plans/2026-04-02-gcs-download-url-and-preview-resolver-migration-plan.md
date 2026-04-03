# GCS Download URL and Preview Resolver Migration Implementation Plan

**Goal:** Enable file preview and download for GCS-uploaded files by adding a signed download URL endpoint to platform-api and migrating the frontend signed URL resolver to try GCS first, falling back to Supabase Storage for legacy files.

**Architecture:** Add a `POST /storage/download-url` endpoint to `services/platform-api` that verifies user ownership via `storage_objects`, generates a signed GCS GET URL, and returns it. Update the single frontend choke point (`createSignedUrlForLocator` in `projectDetailHelpers.ts`) to route `users/` prefixed locators through platform-api and `uploads/` prefixed locators through Supabase Storage. All 8+ downstream consumers (preview, download, artifact loading) inherit the fix automatically.

**Tech Stack:** FastAPI, Google Cloud Storage signed URLs, React + TypeScript, OpenTelemetry, pytest, Vitest.

**Status:** Superseded
**Author:** jon
**Date:** 2026-04-02

**Superseded by:** `docs/plans/2026-04-02-storage-namespace-separation-and-gcs-access-correction-plan.md`

**Execution note:** Do not execute this plan as a standalone implementation plan. Its download/preview resolver work is now one implementation track inside the umbrella storage namespace correction plan.

## Verified current state

### Backend

- `services/platform-api/app/api/routes/storage.py` has `create_signed_upload_url()` (PUT method, line 104) but no download signed URL equivalent.
- `_gcs_client()` is cached via `@lru_cache(maxsize=1)` (line 38).
- `SIGNED_URL_MINUTES = 30` is the existing expiration constant.
- `storage_objects` table has `owner_user_id`, `bucket`, `object_key`, `status` columns — sufficient for ownership verification.
- Auth pattern: `Depends(require_user_auth)` provides `auth.user_id`.

### Frontend

- `createSignedUrlForLocator` in `web/src/lib/projectDetailHelpers.ts` (line 119) is the single internal function that creates signed URLs. It calls `supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl()` — Supabase Storage only.
- `resolveSignedUrlForLocators` (line 139) iterates locators and calls `createSignedUrlForLocator` for each. All 8+ consumer files go through this.
- `web/src/pages/Upload.tsx` has a duplicate implementation of both functions (lines 117-149) — same Supabase-only pattern.
- `web/src/components/documents/ParseTabPanel.tsx` has two direct `supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl()` calls (lines 161, 181) that bypass the shared helper.

### Locator format distinction

| Format | Pattern | Storage backend | Has `storage_objects` row |
|--------|---------|----------------|--------------------------|
| GCS (new) | `users/{user_id}/...` | Google Cloud Storage | Yes |
| Legacy | `uploads/{source_uid}/...` | Supabase Storage | No |

Detection: `locator.startsWith('users/')` → GCS; otherwise → Supabase Storage.

### Consumers of `resolveSignedUrlForLocators`

| File | Usage |
|------|-------|
| `PreviewTabPanel.tsx` | Preview loading (source + conv locators) |
| `PreviewTabPanel.tsx` | Parsed PDF view (docling JSON locator) |
| `useAssetsWorkbench.tsx` | Download button |
| `FlowWorkbench.tsx` | Flow editor preview panel |
| `Upload.tsx` | Upload page preview (duplicate implementation) |
| `parseArtifacts.ts` | Load JSON, markdown, docling, HTML artifacts |

### Direct Supabase Storage access (bypassing shared helper)

| File | Line | Usage |
|------|------|-------|
| `useAssetsWorkbench.tsx` | 69 | `supabase.storage.from().remove()` for deletion |
| `FlowWorkbench.tsx` | 810 | `supabase.storage.from().remove()` for deletion |
| `ParseTabPanel.tsx` | 161 | `supabase.storage.from().createSignedUrl()` for JSON view |
| `ParseTabPanel.tsx` | 181 | `supabase.storage.from().createSignedUrl()` for JSON download |

## Pre-implementation contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any item below needs to change, the implementation must stop and this plan must be revised first.

## Locked product decisions

1. The preview resolver migration is a choke-point fix — update `createSignedUrlForLocator` and all consumers inherit the change.
2. GCS locators are detected by the `users/` prefix. Everything else falls back to Supabase Storage.
3. The `POST /storage/download-url` endpoint verifies ownership via `storage_objects` before issuing a signed URL.
4. Legacy Supabase Storage files (`uploads/` prefix) continue to work through the existing path. No data migration.
5. The duplicate signed URL implementation in `Upload.tsx` is removed and replaced with the shared helper.
6. Direct `supabase.storage.from().createSignedUrl()` calls in `ParseTabPanel.tsx` are migrated to the shared helper for consistency.
7. Direct `supabase.storage.from().remove()` calls in `useAssetsWorkbench.tsx` and `FlowWorkbench.tsx` are out of scope for this plan — deletion is a separate concern and the platform-api already has `DELETE /storage/objects/{id}`.

## Manifest

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| POST | `/storage/download-url` | Issue a signed GCS download URL for an owned storage object | New |
| GET | `/storage/quota` | Read quota summary | Existing — no changes |
| POST | `/storage/uploads` | Reserve upload slot | Existing — no changes |
| DELETE | `/storage/objects/{storage_object_id}` | Delete storage object | Existing — no changes |

#### New endpoint contract

`POST /storage/download-url`

- Auth: `require_user_auth`
- Request:
  ```json
  {
    "object_key": "users/ae4c.../assets/projects/.../source/file.md"
  }
  ```
- Response (200):
  ```json
  {
    "signed_url": "https://storage.googleapis.com/...",
    "expires_in_seconds": 1800
  }
  ```
- Response (404): object not found or not owned by user
- Touches: `public.storage_objects` (SELECT with `owner_user_id`, `object_key`, `status = 'active'`)
- Uses: `_gcs_client().bucket().blob().generate_signed_url(method="GET")`

### Observability

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Trace span | `storage.download.sign_url` | `storage.py:create_download_url` | Measure download URL generation latency |
| Counter | `platform.storage.download.sign_url.count` | `storage.py:create_download_url` | Count successful download URL requests |
| Counter | `platform.storage.download.sign_url.failure.count` | `storage.py:create_download_url` | Count failed download URL requests |
| Histogram | `platform.storage.download.sign_url.duration_ms` | `storage.py:create_download_url` | Measure download URL generation latency distribution |

Observability attribute rules:

- Allowed attributes: `result`, `storage.kind`, `http.status_code`, `has_object`
- Forbidden in trace or metric attributes: `user_id`, `object_key`, `bucket`, `signed_url`

### Database migrations

No migrations. The `storage_objects` table already has the required columns (`owner_user_id`, `object_key`, `bucket`, `status`).

### Edge functions

No edge functions created or modified.

### Frontend surface area

**New pages:** `0`

**New components:** `0`

**New hooks:** `0`

**New libraries/services:** `0`

**Modified libraries:** `1`

| Library | File | What changes |
|---------|------|--------------|
| `projectDetailHelpers` | `web/src/lib/projectDetailHelpers.ts` | `createSignedUrlForLocator` gains GCS-first path via `platformApiFetch` for `users/` prefixed locators; Supabase Storage becomes fallback for `uploads/` prefixed locators |

**Modified pages:** `1`

| Page | File | What changes |
|------|------|--------------|
| `Upload` | `web/src/pages/Upload.tsx` | Remove duplicate `createSignedUrlForLocator` / `resolveSignedUrlForLocators` implementation; import from shared `projectDetailHelpers` |

**Modified components:** `1`

| Component | File | What changes |
|-----------|------|--------------|
| `ParseTabPanel` | `web/src/components/documents/ParseTabPanel.tsx` | Replace direct `supabase.storage.from().createSignedUrl()` calls with shared `resolveSignedUrlForLocators` |

**Modified observability:** `1`

| File | What changes |
|------|--------------|
| `storage_metrics.py` | Add `record_storage_download_sign` metric function matching existing patterns |

## Locked acceptance contract

The implementation is only complete when all of the following are true:

1. A GCS-uploaded file (locator starting with `users/`) renders in the Preview panel on the Assets page.
2. A GCS-uploaded markdown file renders its markdown content (not "Preview unavailable").
3. A legacy Supabase-uploaded file (locator starting with `uploads/`) still renders in the Preview panel.
4. The download button works for both GCS and legacy files.
5. `ParseTabPanel` JSON view and JSON download work for both GCS and legacy artifacts.
6. `Upload.tsx` no longer contains duplicate signed URL resolution code.
7. The `POST /storage/download-url` endpoint returns 404 for objects not owned by the authenticated user.
8. OpenTelemetry span, counters, and histogram emit for the new endpoint.

## Locked inventory counts

### Backend

- New endpoint functions: `2` (helper + route handler)
- New metric functions: `1`
- Modified route files: `1` (`storage.py`)
- Modified observability files: `1` (`storage_metrics.py`)
- New migrations: `0`

### Frontend

- Modified lib files: `1` (`projectDetailHelpers.ts`)
- Modified pages: `1` (`Upload.tsx`)
- Modified components: `1` (`ParseTabPanel.tsx`)
- New files: `0`

### Tests

- New backend test cases: `3` (success, not-found, not-owned)
- New frontend test cases: `2` (GCS locator, legacy locator)
- Modified existing test files: `0`

## Locked file inventory

### Modified files

- `services/platform-api/app/api/routes/storage.py`
- `services/platform-api/app/observability/storage_metrics.py`
- `web/src/lib/projectDetailHelpers.ts`
- `web/src/pages/Upload.tsx`
- `web/src/components/documents/ParseTabPanel.tsx`

### New files

- `services/platform-api/tests/test_storage_download_url.py`

## Frozen seam contract

### Supabase Storage fallback

Legacy files with `uploads/` prefixed locators continue to resolve through `supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl()`. This fallback path must remain functional until all legacy files are migrated or deleted. A future plan can remove the Supabase Storage fallback after the product fully moves to GCS.

### Locator detection

The frontend distinguishes storage backends by prefix:
- `users/` → platform-api `POST /storage/download-url` → GCS signed URL
- everything else → Supabase Storage signed URL (legacy fallback)

Do not use storage_objects table lookups from the frontend to distinguish. The prefix check is sufficient and avoids an extra round trip.

### Ownership verification

The `POST /storage/download-url` endpoint must verify that the authenticated user owns the `storage_objects` row. Do not serve signed URLs for objects owned by other users. The query filters on `owner_user_id = auth.user_id AND object_key = body.object_key AND status = 'active'`.

## Explicit risks accepted in this plan

1. Conv/parsed artifact locators for GCS-uploaded files also start with `users/` but may not have their own `storage_objects` row (they may share the source object's row or be generated by a pipeline). If `POST /storage/download-url` returns 404 for these, the frontend falls back to Supabase Storage, which will also 404 — the preview will show "unavailable." This is acceptable for V1; pipeline-generated artifacts will get their own `storage_objects` rows in a future plan.
2. The `Upload.tsx` duplicate removal is low-risk because the shared helper is identical in behavior.

## Task breakdown

### Task 1: Add `record_storage_download_sign` metric function

**File:** `services/platform-api/app/observability/storage_metrics.py`

**Steps:**

1. Read the existing metric function pattern (e.g., `record_storage_upload_reserve`).
2. Add three meter instruments: `_storage_download_sign_duration_ms` (histogram), `_storage_download_sign_count` (counter), `_storage_download_sign_failure_count` (counter).
3. Add `record_storage_download_sign(*, result, storage_kind, http_status_code, duration_ms)` following the existing keyword-only pattern with `_clean()`.

**Test command:** `cd services/platform-api && python -c "from app.observability.storage_metrics import record_storage_download_sign; print('ok')"`

**Expected output:** `ok`

**Commit:** `feat(storage): add download signed URL observability metrics`

### Task 2: Add `POST /storage/download-url` endpoint

**File:** `services/platform-api/app/api/routes/storage.py`

**Steps:**

1. Add `create_signed_download_url(bucket_name, object_key)` helper next to the existing upload equivalent. Same pattern but `method="GET"` and no `content_type`.
2. Add `CreateDownloadUrlRequest` Pydantic model with `object_key: str`.
3. Add `create_download_url` route handler at `POST /storage/download-url`:
   - Auth: `Depends(require_user_auth)`
   - Query `storage_objects` for `owner_user_id = auth.user_id AND object_key = body.object_key AND status = 'active'`
   - 404 if not found
   - Generate signed download URL using the object's bucket
   - Record span + metrics
   - Return `{ signed_url, expires_in_seconds }`

**Test command:** `cd services/platform-api && pytest -q tests/test_storage_download_url.py`

**Expected output:** 3 tests pass (success, not-found, not-owned)

**Commit:** `feat(storage): add POST /storage/download-url endpoint`

### Task 3: Write backend tests for download URL endpoint

**File:** `services/platform-api/tests/test_storage_download_url.py`

**Steps:**

1. Write test for successful signed URL generation (mock GCS, seed storage_objects row).
2. Write test for 404 when object_key doesn't exist.
3. Write test for 404 when object exists but belongs to different user.

**Test command:** `cd services/platform-api && pytest -q tests/test_storage_download_url.py -v`

**Expected output:** 3 passed

**Commit:** `test(storage): add download URL endpoint tests`

### Task 4: Update `createSignedUrlForLocator` to route GCS locators through platform-api

**File:** `web/src/lib/projectDetailHelpers.ts`

**Steps:**

1. Import `platformApiFetch` from `@/lib/platformApi`.
2. Add `createGcsSignedUrl(objectKey)` helper that calls `POST /storage/download-url` with `{ object_key: objectKey }` and returns `SignedUrlResult`.
3. Update `createSignedUrlForLocator` to check if the normalized locator starts with `users/`. If yes, try `createGcsSignedUrl` first. If no, or if GCS call fails, fall back to the existing Supabase Storage path.

**Test command:** `cd web && npx vitest run src/lib/projectDetailHelpers.test.ts`

**Expected output:** Existing tests pass, new tests for GCS-prefixed and legacy locators pass.

**Commit:** `feat(storage): route GCS locators through platform-api download URL`

### Task 5: Remove duplicate signed URL implementation from Upload.tsx

**File:** `web/src/pages/Upload.tsx`

**Steps:**

1. Remove the local `createSignedUrlForLocator` and `resolveSignedUrlForLocators` functions (lines ~117-149).
2. Import `resolveSignedUrlForLocators` from `@/lib/projectDetailHelpers`.
3. Verify the page still renders previews.

**Test command:** `cd web && npx vitest run src/pages/Upload.test.tsx`

**Expected output:** Existing tests pass.

**Commit:** `refactor(upload): use shared signed URL resolver`

### Task 6: Migrate ParseTabPanel direct Supabase Storage calls to shared helper

**File:** `web/src/components/documents/ParseTabPanel.tsx`

**Steps:**

1. Replace the `handleViewJson` direct `supabase.storage.from().createSignedUrl()` call (line ~161) with `resolveSignedUrlForLocators([key])`.
2. Replace the `handleDownloadJson` direct call (line ~181) with `resolveSignedUrlForLocators([key])`.
3. Remove the direct `supabase` import if no longer needed.

**Test command:** `cd web && npx vitest run src/components/documents/ParseTabPanel.test.tsx`

**Expected output:** Existing tests pass.

**Commit:** `refactor(parse): use shared signed URL resolver in ParseTabPanel`

### Task 7: Verification sweep

**Test commands:**

- `cd services/platform-api && pytest -q tests/test_storage_download_url.py`
- `cd web && npx vitest run src/lib/projectDetailHelpers.test.ts src/pages/Upload.test.tsx src/components/documents/ParseTabPanel.test.tsx src/pages/ProjectAssetsPage.test.tsx`
- `cd web && npm run build`

**Expected output:** All tests pass, build succeeds.

**Manual verification:**

1. Open Assets page, click a GCS-uploaded file → preview renders (not "Object not found")
2. Click a legacy Supabase-uploaded file → preview still renders
3. Click download on a GCS file → file downloads
4. Open Parse page, click View JSON on a processed document → JSON renders

**Commit:** `test(storage): verify GCS download URL and preview resolver migration`

## Completion criteria

The work is complete only when all of the following are true:

1. The `POST /storage/download-url` endpoint exists with ownership verification and observability.
2. `createSignedUrlForLocator` routes `users/` locators through platform-api and falls back to Supabase Storage for legacy locators.
3. All 8+ consumers of `resolveSignedUrlForLocators` inherit the fix without modification.
4. The `Upload.tsx` duplicate is removed.
5. `ParseTabPanel.tsx` direct Supabase Storage calls are migrated to the shared helper.
6. The locked acceptance contract is satisfied.
7. The locked inventory counts match the actual set of created and modified files.
