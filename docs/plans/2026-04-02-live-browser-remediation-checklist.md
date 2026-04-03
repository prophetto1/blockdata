# Live Browser Remediation Checklist

**Date:** 2026-04-02  
**Scope:** `https://blockdata.run` browser failures against the deployed platform stack

## Purpose

Use this checklist to restore live browser operability for the deployed site. The current failures are a deployment-state mismatch, not an AGChain page-composition bug.

## Confirmed findings

- The deployed `platform-api` rejects browser preflight requests from `https://blockdata.run`.
- The deployed `platform-api` is behind local code and does not expose `GET /agchain/organizations`.
- The deployed Supabase schema is behind the current frontend and does not expose `document_surface` on `public.view_documents`.
- The `Invalid Refresh Token` browser error is likely stale client session state and should be treated as a cleanup step after the backend and database are corrected.

## Execution order

Complete these in order. Do not start with browser cache clearing.

### 1. Record the current broken state

- Confirm the live web origin is `https://blockdata.run`.
- Confirm browser requests to `https://blockdata-platform-api-sqsmf5q2rq-uc.a.run.app` fail CORS preflight.
- Confirm live `GET /agchain/organizations` returns `404`.
- Confirm live Supabase `view_documents` requests that filter `document_surface=eq.assets` return `400`.
- Save screenshots or network captures before changes.

### 2. Fix deployed platform-api CORS configuration

- Inspect the runtime environment for the deployed `platform-api` service.
- Update `AUTH_REDIRECT_ORIGINS` so it includes `https://blockdata.run`.
- If any additional production web origins are truly live, add those exact origins only.
- Do not use wildcard origins.
- Keep the existing localhost development origins if they are still required.

**Expected outcome**

- Browser preflight requests from `https://blockdata.run` receive `Access-Control-Allow-Origin: https://blockdata.run`.
- `OPTIONS` requests stop returning `400`.

### 3. Redeploy the current platform-api revision

- Deploy the current local `platform-api` code, not the older live revision.
- Confirm the deployed OpenAPI surface now includes `GET /agchain/organizations`.
- Confirm AGChain route groups deployed locally are also present in the live revision.

**Expected outcome**

- `GET /agchain/organizations` is no longer `404`.
- The route reaches auth or business logic instead of missing the path entirely.

### 4. Apply the missing Supabase migrations

Apply the production migrations that add storage-surface metadata and recreate the Assets document view:

- [20260402193000_storage_namespace_metadata_foundation.sql](/E:/writing-system/supabase/migrations/20260402193000_storage_namespace_metadata_foundation.sql)
- [20260402195000_storage_namespace_backfill_and_source_document_reconciliation.sql](/E:/writing-system/supabase/migrations/20260402195000_storage_namespace_backfill_and_source_document_reconciliation.sql)

After migration:

- confirm `public.source_documents` includes `document_surface`
- confirm `public.view_documents` includes `document_surface`
- confirm `public.view_documents` can be filtered by `document_surface = 'assets'`

**Expected outcome**

- Assets document queries no longer fail with `400`.
- The live frontend can load the Assets document inventory again.

### 5. Clear stale browser auth state

- Sign out of the live site if possible.
- Clear local site storage for the live origin if the refresh-token error persists.
- Sign in again to obtain a fresh Supabase session.

**Expected outcome**

- `auth/v1/token?grant_type=refresh_token` no longer returns `Invalid Refresh Token: Refresh Token Not Found`.

## Verification checklist

Run these after steps 2 through 5 are complete.

### API verification

- `GET /health` succeeds from the live site without a CORS error.
- `GET /storage/quota` reaches auth or returns data, but does not fail CORS.
- `GET /agchain/organizations` reaches auth or returns data, but does not return `404`.
- `GET /admin/storage/policy` and `GET /admin/storage/provisioning/recent` no longer fail CORS from the live superuser surface.

### Database verification

- `public.view_documents` exposes `document_surface`.
- Assets queries filtering `document_surface=eq.assets` succeed.

### Browser verification

- `https://blockdata.run/app/agchain/prompts` loads without CORS failures in DevTools.
- `https://blockdata.run/app/superuser` loads without CORS failures in DevTools.
- the operational-readiness page can call the live API health endpoint from the browser.
- no fresh `Invalid Refresh Token` error appears after signing in again.

## Failure interpretation

- If CORS errors remain after step 2, the deployed env or deployed revision is still stale.
- If `/agchain/organizations` still returns `404` after step 3, the wrong API revision is still deployed.
- If `view_documents` still returns `400` after step 4, the production database did not receive the April 2 storage migrations.
- If only the refresh-token error remains after steps 2 through 4, the remaining issue is client session state, not backend readiness.

## Exit criteria

This incident is resolved only when all of the following are true:

- browser requests from `https://blockdata.run` no longer fail CORS against `platform-api`
- live `platform-api` exposes `/agchain/organizations`
- live Supabase accepts Assets document queries that filter `document_surface`
- a fresh browser session can use the live site without the refresh-token loop
