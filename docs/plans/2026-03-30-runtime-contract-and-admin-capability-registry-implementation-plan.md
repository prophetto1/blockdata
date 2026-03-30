# Runtime Contract And Admin Capability Registry Implementation Plan

**Goal:** Prevent super/admin pages from mounting against unsupported or stale backends by introducing one shared backend runtime-contract surface, one frontend admin capability registry, and one explicit backend identity model that every admin page can rely on before it renders product-specific behavior.

**Architecture:** Add a new superuser `platform-api` runtime-contract endpoint that exposes backend identity, startup provenance, supported admin capabilities, and route-group compatibility. Make the admin shell consume that contract once, drive nav availability from it, and require the operational-readiness page to boot only through that contract. This turns backend/frontend compatibility into a first-class system contract instead of an implicit assumption.

**Tech Stack:** FastAPI, React + TypeScript, admin shell, OpenTelemetry, pytest, Vitest.

**Status:** Draft
**Author:** Codex
**Date:** 2026-03-30

## Source Basis

- User requirement in this session: this exact class of hidden operational mismatch must stop recurring; if the page cannot reliably operate its own backend dependency, the implementation is a failure.
- Existing implementation seams:
  - `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`
  - `web/src/pages/superuser/SuperuserApiEndpoints.tsx`
  - `web/src/components/admin/AdminLeftNav.tsx`
  - `web/src/router.tsx`
  - `web/src/hooks/useOperationalReadiness.ts`
  - `services/platform-api/app/api/routes/admin_runtime_readiness.py`
  - `services/platform-api/app/api/routes/health.py`
  - `services/platform-api/app/main.py`
- Existing startup seams:
  - `scripts/start-platform-api.ps1`
  - `services/platform-api/start-dev.sh`
  - root `package.json`

## Current-State Assessment

### What is wrong right now

1. Admin pages assume backend support based on source code, not on the backend instance actually reached by the browser.
2. `Operational Readiness` is mounted unconditionally in the admin nav.
3. The page tries to call a route that may not exist on the current backend process.
4. The system has no shared runtime contract that answers:
   - which backend instance am I talking to
   - which admin capabilities does it support
   - which route groups are present
   - was it started through the standard launcher

### Why a compatibility patch alone may be insufficient

1. The same hidden mismatch can recur on other admin pages, not just operational readiness.
2. `openapi.json` route discovery alone still leaves capability ownership scattered page by page.
3. The admin shell currently has no single source of truth for backend support state.

### Product interpretation to lock now

This option treats the failure as a **missing shared runtime contract**. The fix is therefore bigger than one page: all super/admin pages must become capability-aware, and the shell must stop advertising surfaces the connected backend does not support.

## Manifest

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/admin/runtime/contract` | Return backend identity, startup provenance, supported capability registry, and route-group compatibility | New |
| GET | `/admin/runtime/readiness` | Return grouped readiness snapshot | Existing - consumed through the contract |
| GET | `/health/ready` | Continue returning process readiness | Existing - no breaking change |

#### New endpoint contract

`GET /admin/runtime/contract`

- Auth: `require_superuser`
- Request: no body
- Response shape:
  - `generated_at`: ISO timestamp
  - `backend`:
    - `service`
    - `started_at`
    - `git_sha`
    - `build_source`
    - `launcher`
    - `env_file_loaded`
    - `process_host`
    - `process_port`
  - `capabilities[]`:
    - `id`: stable capability id
    - `label`
    - `status`: `supported | unsupported | degraded`
    - `required_routes[]`
    - `summary`
    - `remediation`
  - `route_groups[]`:
    - `id`
    - `status`
    - `paths[]`
  - `recommended_pages[]`:
    - admin route path
    - capability id
    - display status
- Locked phase-1 capabilities:
  - `superuser.operational_readiness`
  - `superuser.api_endpoints`
  - `superuser.storage_policy`
  - `superuser.provisioning_monitor`
- Touches:
  - app route registry
  - process env
  - startup metadata stamped by launcher
  - no database tables

#### Existing endpoint contract consumed through the registry

`GET /admin/runtime/readiness`

- Only called by the frontend when `superuser.operational_readiness` is `supported`.

### Observability

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Trace span | `admin.runtime.contract.snapshot` | new contract route | Measure contract generation latency |
| Trace span | `admin.runtime.capability.evaluate` | new runtime contract service | Measure capability evaluation per surface |
| Metric counter | `platform.admin.runtime.capability.count` | contract service | Count capabilities by `supported`, `unsupported`, `degraded` |
| Structured log | `admin.runtime.capability.unsupported` | contract service | Record unsupported capability ids with remediation |

Observability attribute rules:

- Allowed: `capability.id`, `status`, `launcher`, `build_source`, `route_group`, `degraded_count`
- Forbidden: secret env values, JWTs, private keys, absolute credential contents

### Database Migrations

No database migrations.

### Edge Functions

No edge function changes.

### Frontend Surface Area

**New files:** `3`

| File | Purpose |
|------|---------|
| `web/src/lib/adminRuntimeContract.ts` | Shared runtime-contract types and helpers |
| `web/src/hooks/useAdminRuntimeContract.ts` | One admin-shell contract fetch hook |
| `services/platform-api/app/services/runtime_contract.py` | Capability evaluation service for the new endpoint |

**Modified existing frontend files:** `7`

| File | Change |
|------|--------|
| `web/src/components/admin/AdminLeftNav.tsx` | Drive page availability and badges from runtime contract |
| `web/src/components/layout/AdminShellLayout.tsx` | Fetch runtime contract once and provide it through context |
| `web/src/router.tsx` | Keep routes mounted, but add unsupported-capability guard rendering for relevant pages |
| `web/src/pages/superuser/SuperuserOperationalReadiness.tsx` | Require runtime-contract support before readiness fetch |
| `web/src/pages/superuser/SuperuserApiEndpoints.tsx` | Show backend identity and route-group facts from shared contract |
| `web/src/pages/superuser/SuperuserStoragePolicy.tsx` | Gate on capability support |
| `web/src/pages/superuser/SuperuserProvisioningMonitor.tsx` | Gate on capability support |

**Modified existing backend files:** `5`

| File | Change |
|------|--------|
| `services/platform-api/app/api/routes/admin_runtime_readiness.py` | Consume shared contract assumptions where useful; no public contract change |
| `services/platform-api/app/api/routes/health.py` | Reuse or expose process facts needed by the contract service |
| `services/platform-api/app/api/routes/admin_runtime_contract.py` | New route |
| `services/platform-api/app/main.py` | Mount new route and stamp startup facts on `app.state` |
| `scripts/start-platform-api.ps1` and `services/platform-api/start-dev.sh` | Emit launcher provenance into env/app state |

**Test files:** `10`

| File | Change |
|------|--------|
| `services/platform-api/tests/test_admin_runtime_contract_routes.py` | New route tests |
| `services/platform-api/tests/test_runtime_contract_service.py` | Capability evaluation tests |
| `services/platform-api/tests/test_procfile_startup.py` | Launcher provenance contract |
| `web/src/hooks/useAdminRuntimeContract.test.tsx` | Contract hook tests |
| `web/src/components/admin/__tests__/AdminLeftNav.test.tsx` | Nav driven by capability support |
| `web/src/pages/superuser/SuperuserOperationalReadiness.test.tsx` | Unsupported-capability state and supported flow |
| `web/src/pages/superuser/SuperuserApiEndpoints.test.tsx` | Backend identity/route-group rendering |
| `web/src/pages/superuser/SuperuserStoragePolicy.test.tsx` | Guarded unsupported state |
| `web/src/pages/superuser/SuperuserProvisioningMonitor.test.tsx` | Guarded unsupported state |
| `web/src/components/layout/AdminShellLayout.test.tsx` | Shared contract provisioning into admin shell |

## Pre-Implementation Contract

### Locked Product Decisions

1. Super/admin surfaces must become capability-aware through one shared runtime contract.
2. The admin shell, not each individual page, owns the first backend compatibility check.
3. Unsupported capabilities may remain routed, but must render an explicit unsupported-backend guard state instead of failing with downstream request errors.
4. The operational-readiness page is only one consumer of the runtime contract; this plan generalizes the fix for future admin pages.
5. No admin page may treat “exists in source code” as proof that the current backend supports it.

### Locked Runtime Contract Decisions

1. `GET /admin/runtime/contract` is the sole backend compatibility source of truth for super/admin.
2. The contract must expose backend identity and startup provenance, not just capability booleans.
3. Capability ids are stable public contract values and must be versioned deliberately.
4. The admin shell must fetch the contract once per mount and provide it via context or shared hook state.
5. `Operational Readiness` must not request `/admin/runtime/readiness` until `superuser.operational_readiness` is `supported`.

### Locked Frontend Contract

1. `AdminLeftNav` must show unsupported or degraded state for admin pages whose capability is not fully supported.
2. `SuperuserOperationalReadiness` must render one of three states:
   - loading contract
   - unsupported/degraded backend contract
   - supported readiness snapshot
3. `SuperuserApiEndpoints` must show backend identity and route-group facts from the runtime contract.
4. Guard states must use explicit remediation text that points to the standard launcher.

### Locked Acceptance Contract

1. Against a backend that supports `superuser.operational_readiness`, the page shows the readiness dashboard normally.
2. Against a backend that does not support it, the page shows an explicit unsupported-capability state and never a raw `404`.
3. The admin nav reflects unsupported capabilities before the user clicks into them.
4. The backend identity shown in the UI matches the backend instance actually reached by the browser.
5. The same contract can be extended later for new admin pages without inventing another bootstrap mechanism.

## Risks

1. This option is broader and touches shared admin shell behavior, so regression risk is higher than the targeted compatibility-gate option.
2. Capability ids become a public contract and must be maintained carefully.
3. More super/admin pages will need tests updated once the shell becomes contract-aware.

## Completion Criteria

1. `Operational Readiness` never fails with a raw `404` due to unsupported backend capability.
2. `AdminLeftNav` and guarded super/admin pages consistently reflect backend support state.
3. The runtime contract exposes enough identity to diagnose stale/wrong-server problems immediately.
4. The same capability registry can be reused by future admin surfaces.

## Tasks

### Task 1 - Build backend runtime-contract service and route

**Files**
- `services/platform-api/app/services/runtime_contract.py`
- `services/platform-api/app/api/routes/admin_runtime_contract.py`
- `services/platform-api/app/main.py`
- `services/platform-api/app/api/routes/health.py`
- `services/platform-api/tests/test_admin_runtime_contract_routes.py`
- `services/platform-api/tests/test_runtime_contract_service.py`

**Work**
- Implement backend identity and capability evaluation service.
- Mount `GET /admin/runtime/contract`.
- Define stable phase-1 capability ids and route groups.
- Add route and service tests.

**Verification**
- `cd services/platform-api && pytest -q tests/test_admin_runtime_contract_routes.py tests/test_runtime_contract_service.py`

### Task 2 - Standardize startup provenance for launcher visibility

**Files**
- `scripts/start-platform-api.ps1`
- `services/platform-api/start-dev.sh`
- `services/platform-api/tests/test_procfile_startup.py`

**Work**
- Stamp launcher and env-load provenance into process env or app state.
- Lock provenance contract in startup tests.

**Verification**
- `cd services/platform-api && pytest -q tests/test_procfile_startup.py`

### Task 3 - Add admin-shell runtime-contract hook and provider

**Files**
- `web/src/lib/adminRuntimeContract.ts`
- `web/src/hooks/useAdminRuntimeContract.ts`
- `web/src/components/layout/AdminShellLayout.tsx`
- `web/src/components/layout/AdminShellLayout.test.tsx`

**Work**
- Fetch runtime contract once in the admin shell.
- Provide contract state to admin children.
- Add tests for supported and unsupported contract states.

**Verification**
- `cd web && npm exec vitest run src/components/layout/AdminShellLayout.test.tsx src/hooks/useAdminRuntimeContract.test.tsx`

### Task 4 - Gate admin nav and pages by capability support

**Files**
- `web/src/components/admin/AdminLeftNav.tsx`
- `web/src/components/admin/__tests__/AdminLeftNav.test.tsx`
- `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`
- `web/src/pages/superuser/SuperuserApiEndpoints.tsx`
- `web/src/pages/superuser/SuperuserStoragePolicy.tsx`
- `web/src/pages/superuser/SuperuserProvisioningMonitor.tsx`
- corresponding page tests

**Work**
- Make the nav and relevant pages consume shared capability state.
- Replace downstream request failures with explicit unsupported-capability guards.
- Keep readiness snapshot fetch behind the contract.

**Verification**
- `cd web && npm exec vitest run src/components/admin/__tests__/AdminLeftNav.test.tsx src/pages/superuser/SuperuserOperationalReadiness.test.tsx src/pages/superuser/SuperuserApiEndpoints.test.tsx src/pages/superuser/SuperuserStoragePolicy.test.tsx src/pages/superuser/SuperuserProvisioningMonitor.test.tsx`

### Task 5 - Final end-to-end verification

**Commands**
- `cd services/platform-api && pytest -q tests/test_admin_runtime_contract_routes.py tests/test_runtime_contract_service.py tests/test_procfile_startup.py`
- `cd web && npm exec vitest run src/components/layout/AdminShellLayout.test.tsx src/hooks/useAdminRuntimeContract.test.tsx src/components/admin/__tests__/AdminLeftNav.test.tsx src/pages/superuser/SuperuserOperationalReadiness.test.tsx src/pages/superuser/SuperuserApiEndpoints.test.tsx src/pages/superuser/SuperuserStoragePolicy.test.tsx src/pages/superuser/SuperuserProvisioningMonitor.test.tsx`
- `cd web && npm run build`

**Manual acceptance**
- Start backend with `npm run platform-api:dev`
- Start frontend with `cd web && npm run dev`
- Verify:
  - supported backend => normal admin pages
  - unsupported/stale backend => explicit unsupported-capability state in nav and page
  - no raw `404` on `Operational Readiness`
