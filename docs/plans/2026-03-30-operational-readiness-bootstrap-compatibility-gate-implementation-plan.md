# Operational Readiness Bootstrap Compatibility Gate Implementation Plan

**Goal:** Eliminate the blind `404` failure on `/app/superuser/operational-readiness` by making the page bootstrap from existing discovery surfaces first, positively verify backend compatibility, and render an explicit incompatible-backend state instead of failing as if the page itself were broken.

**Architecture:** Keep the existing `GET /admin/runtime/readiness` snapshot endpoint, but change the page boot sequence so it first reads `openapi.json` and `GET /health/ready`, determines whether the connected backend actually supports the readiness surface, and only then calls the readiness endpoint. If the backend is stale or wrong, the page still operates as a diagnostic surface and tells the user exactly that.

**Tech Stack:** FastAPI, React + TypeScript, existing admin shell, OpenTelemetry, pytest, Vitest.

**Status:** Draft
**Author:** Codex
**Date:** 2026-03-30

## Source Basis

- User requirement in this session: the operational-readiness surface must not recreate the same hidden operational failure it is supposed to solve.
- Existing implementation:
  - `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`
  - `web/src/hooks/useOperationalReadiness.ts`
  - `web/src/lib/operationalReadiness.ts`
  - `services/platform-api/app/api/routes/admin_runtime_readiness.py`
  - `services/platform-api/app/api/routes/health.py`
  - `services/platform-api/app/main.py`
  - `web/src/pages/superuser/SuperuserApiEndpoints.tsx`
- Existing startup seams:
  - `scripts/start-platform-api.ps1`
  - `services/platform-api/start-dev.sh`
  - root `package.json` script `platform-api:dev`

## Current-State Assessment

### What is failing now

1. The frontend route mounts successfully.
2. The page immediately calls `/admin/runtime/readiness?surface=all`.
3. If the live backend on port `8000` is stale or mismatched, that route is absent.
4. The page falls into a generic red error banner with `404`.

### Why the current implementation is insufficient

1. The page has no bootstrap compatibility check.
2. The page assumes the connected backend supports the new readiness route.
3. The page does not tell the user whether the problem is:
   - wrong backend process
   - stale backend build
   - missing route registration
   - auth issue
4. The admin nav exposes the page unconditionally, even if the connected backend cannot satisfy its contract.

### Product interpretation to lock now

This option treats the immediate failure as a **bootstrap compatibility defect**, not as a missing-feature defect. The fix is therefore to make the page self-diagnose backend compatibility before attempting readiness fetches. This plan does not attempt to become a full local-service supervisor.

## Manifest

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/health/ready` | Return process readiness plus runtime identity metadata used by the compatibility gate | Existing - modified |
| GET | `/admin/runtime/readiness` | Return grouped readiness snapshot | Existing - no contract change |
| GET | `/openapi.json` | Route discovery source used by the frontend compatibility gate | Existing - reused |

#### Modified endpoint contract

`GET /health/ready`

- Auth: none
- Existing behavior preserved: returns basic process readiness and conversion-pool state.
- Added response fields:
  - `service`: fixed service label
  - `started_at`: ISO timestamp for current process lifetime
  - `build_identity`:
    - `git_sha`: short sha if available, else `unknown`
    - `build_source`: `dev | cloud_run | unknown`
  - `startup_contract`:
    - `launcher`: `start-platform-api.ps1 | start-dev.sh | unknown`
    - `env_file_expected`: boolean
    - `env_file_loaded`: boolean or `unknown`
- Why: the readiness page must be able to identify the backend instance it actually reached before deciding whether a `404` means “page broken” or “wrong server.”

#### Existing endpoint reused without contract changes

`GET /admin/runtime/readiness`

- Remains the source of truth for grouped readiness checks when the backend supports it.

### Observability

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Trace span | `admin.runtime.readiness.bootstrap` | `useOperationalReadiness` caller and backend health route | Measure compatibility-gate and readiness-fetch sequence |
| Metric counter | `platform.admin.runtime.compatibility.result.count` | health route and readiness bootstrap | Count `compatible`, `missing_route`, `unauthorized`, `stale_backend` outcomes |
| Structured log | `admin.runtime.compatibility.mismatch` | backend health route not required; frontend-compatible server state logging in backend tests only | Capture mismatch conditions found during route bootstrap |

Observability zero-case note:

- No new persisted telemetry tables.
- No signed URLs, JWTs, or secret env values may appear in logs or attributes.

### Database Migrations

No database migrations.

### Edge Functions

No edge function changes.

### Frontend Surface Area

**Modified existing pages:** `3`

| File | Change |
|------|--------|
| `web/src/pages/superuser/SuperuserOperationalReadiness.tsx` | Replace generic request failure state with explicit compatibility-state rendering |
| `web/src/pages/superuser/SuperuserApiEndpoints.tsx` | Optionally surface route-presence facts for `/admin/runtime/readiness` and runtime identity |
| `web/src/router.tsx` | No route-path change; only update loader expectations if needed |

**Modified existing hooks/libs:** `2`

| File | Change |
|------|--------|
| `web/src/hooks/useOperationalReadiness.ts` | Add staged bootstrap: `openapi.json` -> `/health/ready` -> readiness snapshot only when compatible |
| `web/src/lib/operationalReadiness.ts` | Add compatibility-state types and helper normalization |

**Modified existing components:** `2`

| File | Change |
|------|--------|
| `web/src/components/admin/AdminLeftNav.tsx` | Optional badge or explanatory state for incompatible backend |
| `web/src/components/superuser/OperationalReadinessClientPanel.tsx` | Include backend identity facts alongside browser diagnostics |

**Modified backend files:** `4`

| File | Change |
|------|--------|
| `services/platform-api/app/api/routes/health.py` | Extend readiness response with runtime identity metadata |
| `services/platform-api/app/main.py` | Define startup-contract facts on `app.state` for the health route |
| `scripts/start-platform-api.ps1` | Stamp launcher identity and env-load facts into process environment |
| `services/platform-api/start-dev.sh` | Stamp launcher identity and env-load facts into process environment |

**Test files:** `6`

| File | Change |
|------|--------|
| `services/platform-api/tests/test_routes.py` | Lock new `GET /health/ready` shape |
| `services/platform-api/tests/test_procfile_startup.py` | Extend launcher-contract assertions |
| `web/src/hooks/useOperationalReadiness.test.tsx` | Lock staged bootstrap behavior |
| `web/src/pages/superuser/SuperuserOperationalReadiness.test.tsx` | Lock explicit incompatible-backend UI |
| `web/src/components/admin/__tests__/AdminLeftNav.test.tsx` | Lock nav behavior with incompatibility state |
| `web/src/pages/superuser/SuperuserApiEndpoints.test.tsx` | Add or extend route-presence verification if that surface is updated |

## Pre-Implementation Contract

### Locked Product Decisions

1. The operational-readiness page must remain mounted under `/app/superuser/operational-readiness`.
2. The page must never present a raw `404` for its own bootstrap failure.
3. Backend compatibility must be determined before the readiness snapshot fetch.
4. A stale or wrong backend must render as an explicit operator diagnosis, not as a generic broken page.
5. This option does not create a new control-plane endpoint; it uses existing `openapi.json` plus a strengthened `GET /health/ready`.

### Locked Compatibility Decisions

1. Route presence for `/admin/runtime/readiness` is determined from `openapi.json`.
2. Runtime identity facts come from `GET /health/ready`.
3. The page only calls `/admin/runtime/readiness` if both of the following are true:
   - the route is present in `openapi.json`
   - `GET /health/ready` returns a valid runtime identity payload
4. If `openapi.json` is reachable but the route is absent, the page must render:
   - “Connected backend does not support operational-readiness”
   - backend identity facts
   - one explicit remediation pointing to the standard launcher

### Locked Acceptance Contract

1. Visiting `/app/superuser/operational-readiness` against a compatible backend shows:
   - summary strip
   - grouped readiness surfaces
   - client diagnostics
2. Visiting the page against a backend that lacks `/admin/runtime/readiness` does not show a raw `404`; it shows an incompatible-backend state.
3. The incompatible-backend state includes:
   - backend route support result
   - backend identity summary
   - exact remediation text
4. `AdminLeftNav` must not silently imply the page is fully supported when the compatibility gate says otherwise.

## Risks

1. This option detects and explains stale-backend mismatches, but it does not prevent users from manually starting the wrong backend process.
2. `openapi.json` and `health/ready` must remain stable; if either disappears, bootstrap quality degrades.
3. Extending `GET /health/ready` must not break existing callers that depend on its current fields.

## Completion Criteria

1. The page no longer renders `Operational readiness request failed: 404`.
2. A wrong backend is identified explicitly as a compatibility mismatch.
3. The user can see which backend instance/build they reached.
4. The page remains fully functional against a compatible backend.

## Tasks

### Task 1 - Lock backend runtime identity on existing health route

**Files**
- `services/platform-api/app/api/routes/health.py`
- `services/platform-api/app/main.py`
- `scripts/start-platform-api.ps1`
- `services/platform-api/start-dev.sh`
- `services/platform-api/tests/test_routes.py`
- `services/platform-api/tests/test_procfile_startup.py`

**Work**
- Add runtime identity and launcher facts to `GET /health/ready`.
- Stamp launcher identity/env-load facts from both dev launchers into process env or app state.
- Add tests for the extended response shape and launcher contract.

**Verification**
- `cd services/platform-api && pytest -q tests/test_routes.py tests/test_procfile_startup.py`

### Task 2 - Add staged frontend bootstrap and incompatible-backend state

**Files**
- `web/src/hooks/useOperationalReadiness.ts`
- `web/src/lib/operationalReadiness.ts`
- `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`
- `web/src/hooks/useOperationalReadiness.test.tsx`
- `web/src/pages/superuser/SuperuserOperationalReadiness.test.tsx`

**Work**
- Fetch `openapi.json` first.
- Verify readiness route presence.
- Fetch `/health/ready` and normalize backend identity.
- Only fetch `/admin/runtime/readiness` when compatible.
- Replace raw request-failure rendering with explicit incompatible-backend UI state.

**Verification**
- `cd web && npm exec vitest run src/hooks/useOperationalReadiness.test.tsx src/pages/superuser/SuperuserOperationalReadiness.test.tsx`

### Task 3 - Reflect compatibility state in admin shell surfaces

**Files**
- `web/src/components/admin/AdminLeftNav.tsx`
- `web/src/components/admin/__tests__/AdminLeftNav.test.tsx`
- `web/src/components/superuser/OperationalReadinessClientPanel.tsx`
- `web/src/pages/superuser/SuperuserApiEndpoints.tsx`
- `web/src/pages/superuser/SuperuserApiEndpoints.test.tsx`

**Work**
- Surface compatibility state in the nav and related superuser diagnostics surfaces.
- Show backend identity facts near the client diagnostics.
- Optionally show route-support facts on the API Endpoints page for consistency.

**Verification**
- `cd web && npm exec vitest run src/components/admin/__tests__/AdminLeftNav.test.tsx src/pages/superuser/SuperuserApiEndpoints.test.tsx`

### Task 4 - Final end-to-end verification

**Commands**
- `cd services/platform-api && pytest -q tests/test_routes.py tests/test_procfile_startup.py`
- `cd web && npm exec vitest run src/hooks/useOperationalReadiness.test.tsx src/pages/superuser/SuperuserOperationalReadiness.test.tsx src/components/admin/__tests__/AdminLeftNav.test.tsx`
- `cd web && npm run build`

**Manual acceptance**
- Start backend with `npm run platform-api:dev`
- Start frontend with `cd web && npm run dev`
- Verify:
  - compatible backend => readiness data renders
  - intentionally wrong/stale backend => explicit incompatible-backend state, no raw `404`
