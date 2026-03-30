# Runtime Contract And Admin Capability Registry v2 Implementation Plan

**Goal:** Stop `/app/superuser/operational-readiness` from failing with a blind backend-route mismatch by adding one shared admin runtime-contract endpoint and one shared admin-shell contract seam, so the page can detect unsupported or stale backends before requesting readiness data.

**Architecture:** Add `GET /admin/runtime/contract` as the sole backend compatibility contract for super/admin, stamp backend startup provenance from the standard local launchers, fetch that contract once in `AdminShellLayout`, and make `SuperuserOperationalReadiness` render either a supported readiness dashboard or an explicit unsupported-backend state instead of a raw `404`.

**Tech Stack:** FastAPI, React + TypeScript, existing admin shell, OpenTelemetry, pytest, Vitest.

**Status:** Draft
**Author:** Codex
**Date:** 2026-03-30

## Source Basis

- User requirement in this session: this exact class of hidden operational mismatch must stop recurring; if the page cannot reliably operate its own backend dependency, the implementation is a failure.
- Existing implementation seams:
  - `web/src/components/layout/AdminShellLayout.tsx`
  - `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`
  - `web/src/hooks/useOperationalReadiness.ts`
  - `web/src/lib/operationalReadiness.ts`
  - `services/platform-api/app/api/routes/admin_runtime_readiness.py`
  - `services/platform-api/app/main.py`
- Existing startup seams:
  - `scripts/start-platform-api.ps1`
  - `services/platform-api/start-dev.sh`
  - `services/platform-api/tests/test_procfile_startup.py`
- Existing admin workspace seam to preserve:
  - `web/src/pages/superuser/SuperuserWorkspace.tsx`

## Revision Basis

This v2 revision addresses the evaluation findings against the prior runtime-contract draft:

1. Adds locked inventory counts, locked file inventory, locked platform API counts, and locked observability counts.
2. Removes `recommended_pages[]` from the backend response so page ownership remains frontend-owned.
3. Corrects file classifications and narrows phase-1 scope to the contract endpoint, admin shell/provider seam, and operational-readiness gating only.
4. Removes the incorrect assumption that `SuperuserStoragePolicy` and `SuperuserProvisioningMonitor` are independent routed pages in this phase.
5. Adds a frozen seam contract for `AdminShellLayout.tsx`.

## Current-State Assessment

### What is failing right now

1. `Operational Readiness` is reachable in the admin UI.
2. The page immediately requests `/admin/runtime/readiness?surface=all`.
3. If the connected backend process is stale or mismatched, that route may not exist.
4. The page then collapses into a generic `404` error banner.

### Why the current system is insufficient

1. The admin shell has no shared backend compatibility contract.
2. The page treats “feature exists in source” as if it proves “connected backend supports it.”
3. The page has no supported vs unsupported backend mode.
4. The same class of mismatch can recur on future admin pages unless the shell owns compatibility state centrally.

### Product interpretation to lock now

This revision fixes the exact failure class at the shared admin contract layer, but only for the phase-1 surfaces required to operationalize `Operational Readiness` correctly:

- new backend runtime-contract endpoint
- launcher provenance surfaced through that endpoint
- one admin-shell contract provider seam
- one gated readiness page

This revision does **not** yet capability-gate `SuperuserWorkspace` tabs or other admin pages. Those remain future extensions to the same contract.

## Manifest

### Platform API

**Locked platform API surface counts**

- New endpoints: `1`
- Modified existing endpoints: `0`
- Reused existing endpoints without contract changes: `1`

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/admin/runtime/contract` | Return backend identity, startup provenance, and supported admin capabilities | New |
| GET | `/admin/runtime/readiness` | Return grouped readiness snapshot after contract says readiness is supported | Existing - reused |

#### New endpoint contract

`GET /admin/runtime/contract`

- Auth: `require_superuser`
- Request: no body
- Response shape:
  - `generated_at`: ISO timestamp
  - `backend`:
    - `service`: string
    - `started_at`: ISO timestamp or `null`
    - `git_sha`: short sha string or `unknown`
    - `build_source`: `dev | cloud_run | unknown`
    - `launcher`: `start-platform-api.ps1 | start-dev.sh | unknown`
    - `env_file_loaded`: `true | false | unknown`
  - `capabilities`: array of capability rows
  - `capabilities[].id`: stable capability id
  - `capabilities[].label`: display label
  - `capabilities[].status`: `supported | unsupported | degraded`
  - `capabilities[].required_route_group_ids`: string array
  - `capabilities[].summary`: one-line explanation
  - `capabilities[].remediation`: operator-facing next step
  - `route_groups`: array of route-group rows
  - `route_groups[].id`: stable route-group id
  - `route_groups[].status`: `present | missing | degraded`
  - `route_groups[].paths`: string array
- Locked phase-1 capability ids:
  - `superuser.operational_readiness`
- Locked phase-1 route groups:
  - `admin.runtime.contract`
  - `admin.runtime.readiness`
- Touches:
  - mounted FastAPI route registry
  - process env / app state stamped by launcher
  - no database tables

#### Reused existing endpoint without contract changes

`GET /admin/runtime/readiness`

- Only requested when `superuser.operational_readiness` is `supported`.

### Observability

**Locked observability surface counts**

- Trace spans: `2`
- Metric counters: `1`
- Structured logs: `1`

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Trace span | `admin.runtime.contract.snapshot` | `services/platform-api/app/api/routes/admin_runtime_contract.py` | Measure runtime-contract request latency |
| Trace span | `admin.runtime.capability.evaluate` | `services/platform-api/app/services/runtime_contract.py` | Measure per-capability evaluation |
| Metric counter | `platform.admin.runtime.capability.count` | runtime-contract service | Count capability outcomes by status |
| Structured log | `admin.runtime.capability.unsupported` | runtime-contract service | Record unsupported or degraded capability ids with remediation |

Observability attribute rules:

- Allowed trace and metric attributes:
  - `capability.id`
  - `status`
  - `route_group.id`
  - `route_group.status`
  - `launcher`
  - `build_source`
  - `result`
- Forbidden trace, metric, and log attributes:
  - JWTs
  - secret values
  - private keys
  - credential file contents
  - absolute secret file contents

### Database Migrations

No database migrations.

### Edge Functions

No edge function changes.

### Frontend Surface Area

This revision changes the admin shell and the operational-readiness page only.

## Locked Inventory Counts

### Runtime files

- New backend runtime files: `2`
- Modified backend runtime files: `3`
- New frontend runtime files: `3`
- Modified frontend runtime files: `4`

### Test files

- New backend test files: `2`
- Modified backend test files: `1`
- New frontend test files: `2`
- Modified frontend test files: `2`

### Total locked file counts

- New files total: `9`
- Modified files total: `10`
- Explicitly not modified compatibility-sensitive files: `5`

## Locked File Inventory

### New backend runtime files

- `services/platform-api/app/api/routes/admin_runtime_contract.py`
- `services/platform-api/app/services/runtime_contract.py`

### Modified backend runtime files

- `services/platform-api/app/main.py`
- `scripts/start-platform-api.ps1`
- `services/platform-api/start-dev.sh`

### New frontend runtime files

- `web/src/lib/adminRuntimeContract.ts`
- `web/src/hooks/useAdminRuntimeContract.ts`
- `web/src/components/layout/AdminRuntimeContractContext.tsx`

### Modified frontend runtime files

- `web/src/components/layout/AdminShellLayout.tsx`
- `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`
- `web/src/hooks/useOperationalReadiness.ts`
- `web/src/lib/operationalReadiness.ts`

### New backend test files

- `services/platform-api/tests/test_admin_runtime_contract_routes.py`
- `services/platform-api/tests/test_runtime_contract_service.py`

### Modified backend test files

- `services/platform-api/tests/test_procfile_startup.py`

### New frontend test files

- `web/src/components/layout/AdminShellLayout.test.tsx`
- `web/src/hooks/useAdminRuntimeContract.test.tsx`

### Modified frontend test files

- `web/src/pages/superuser/SuperuserOperationalReadiness.test.tsx`
- `web/src/hooks/useOperationalReadiness.test.tsx`

### Explicitly not modified in this revision

- `web/src/router.tsx`
- `web/src/components/admin/AdminLeftNav.tsx`
- `web/src/pages/superuser/SuperuserWorkspace.tsx`
- `web/src/pages/superuser/SuperuserStoragePolicy.tsx`
- `web/src/pages/superuser/SuperuserProvisioningMonitor.tsx`

## Pre-Implementation Contract

### Locked Product Decisions

1. `GET /admin/runtime/contract` is the sole backend compatibility contract for super/admin in this phase.
2. `Operational Readiness` must not request `/admin/runtime/readiness` until the runtime contract says it is supported.
3. Unsupported backend state must render explicitly in the readiness page instead of surfacing a raw `404`.
4. Backend capability ids are backend-owned contract values; page routing remains frontend-owned.
5. This phase does not capability-gate `SuperuserWorkspace` tabs or unrelated admin pages.

### Locked Frontend Decisions

1. `AdminShellLayout` fetches the runtime contract once per mount and provides it to descendants.
2. `SuperuserOperationalReadiness` renders one of exactly three states:
   - loading contract
   - unsupported/degraded backend contract
   - supported readiness snapshot
3. The unsupported/degraded state must include:
   - capability status
   - route-group status
   - remediation text
4. `useOperationalReadiness` remains responsible for readiness snapshot fetches, but only after contract approval.

### Frozen Seam Contract: `AdminShellLayout.tsx`

The following behaviors must remain unchanged while adding the contract provider seam:

1. Existing sidebar width persistence key and resize behavior remain intact.
2. Existing primary rail and secondary rail geometry remain intact.
3. Existing sign-out flow remains intact.
4. Existing `Outlet` ownership remains intact.
5. No route paths or auth guards change in this revision.

### Locked Acceptance Contract

1. Against a backend that supports `superuser.operational_readiness`, the page shows the readiness dashboard normally.
2. Against a backend that does not support the capability, the page shows an explicit unsupported/degraded state and never a raw `404`.
3. The unsupported/degraded state identifies missing route-group support for `admin.runtime.readiness` or missing runtime-contract support.
4. The page can still show browser-local diagnostics even when backend support is missing.

## Risks

1. `AdminShellLayout` is a shared seam, so even a scoped change needs tight tests.
2. If a backend is so stale that it lacks `/admin/runtime/contract`, the frontend must still normalize that into unsupported state rather than treating it as a generic fetch failure.
3. Future admin pages will still need adoption work in later phases; this revision only solves the contract for readiness.

## Completion Criteria

1. The readiness page no longer shows `Operational readiness request failed: 404`.
2. A stale or unsupported backend produces explicit unsupported/degraded UI instead of a generic backend error banner.
3. The admin shell has one reusable runtime-contract seam for future admin pages.
4. All locked counts and file inventory remain accurate at implementation completion.

## Tasks

### Task 1 - Build the backend runtime-contract endpoint

**Files**
- `services/platform-api/app/api/routes/admin_runtime_contract.py`
- `services/platform-api/app/services/runtime_contract.py`
- `services/platform-api/app/main.py`
- `services/platform-api/tests/test_admin_runtime_contract_routes.py`
- `services/platform-api/tests/test_runtime_contract_service.py`

**Work**
- Implement capability and route-group evaluation for `superuser.operational_readiness`.
- Mount `GET /admin/runtime/contract`.
- Ensure missing readiness route-group support maps to `unsupported` or `degraded`.

**Commit message**
- `feat(platform-api): add admin runtime contract endpoint`

**Verification**
- `cd services/platform-api && pytest -q tests/test_admin_runtime_contract_routes.py tests/test_runtime_contract_service.py`

### Task 2 - Stamp launcher provenance for contract identity

**Files**
- `scripts/start-platform-api.ps1`
- `services/platform-api/start-dev.sh`
- `services/platform-api/tests/test_procfile_startup.py`

**Work**
- Stamp launcher provenance and env-file-loaded facts into process env consumed by the runtime-contract service.
- Extend startup tests to lock that provenance contract.

**Commit message**
- `test(startup): lock platform api launcher provenance contract`

**Verification**
- `cd services/platform-api && pytest -q tests/test_procfile_startup.py`

### Task 3 - Add the shared admin-shell contract provider seam

**Files**
- `web/src/lib/adminRuntimeContract.ts`
- `web/src/hooks/useAdminRuntimeContract.ts`
- `web/src/components/layout/AdminRuntimeContractContext.tsx`
- `web/src/components/layout/AdminShellLayout.tsx`
- `web/src/components/layout/AdminShellLayout.test.tsx`
- `web/src/hooks/useAdminRuntimeContract.test.tsx`

**Work**
- Fetch the runtime contract once in `AdminShellLayout`.
- Provide normalized contract state to admin descendants.
- Preserve the frozen shell seam unchanged apart from the provider addition.

**Commit message**
- `feat(admin-shell): provide shared runtime contract state`

**Verification**
- `cd web && npm exec vitest run src/components/layout/AdminShellLayout.test.tsx src/hooks/useAdminRuntimeContract.test.tsx`

### Task 4 - Gate Operational Readiness through the shared contract

**Files**
- `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`
- `web/src/hooks/useOperationalReadiness.ts`
- `web/src/lib/operationalReadiness.ts`
- `web/src/pages/superuser/SuperuserOperationalReadiness.test.tsx`
- `web/src/hooks/useOperationalReadiness.test.tsx`

**Work**
- Block readiness snapshot fetch until `superuser.operational_readiness` is supported.
- Replace raw route-failure state with explicit unsupported/degraded backend rendering.
- Preserve the existing supported-page layout and summary/check/client panels.

**Commit message**
- `fix(superuser): gate operational readiness by runtime contract`

**Verification**
- `cd web && npm exec vitest run src/pages/superuser/SuperuserOperationalReadiness.test.tsx src/hooks/useOperationalReadiness.test.tsx`

### Task 5 - Final verification

**Commands**
- `cd services/platform-api && pytest -q tests/test_admin_runtime_contract_routes.py tests/test_runtime_contract_service.py tests/test_procfile_startup.py`
- `cd web && npm exec vitest run src/components/layout/AdminShellLayout.test.tsx src/hooks/useAdminRuntimeContract.test.tsx src/pages/superuser/SuperuserOperationalReadiness.test.tsx src/hooks/useOperationalReadiness.test.tsx`
- `cd web && npm run build`

**Manual acceptance**
- Start backend with `npm run platform-api:dev`
- Start frontend with `cd web && npm run dev`
- Verify:
  - supported backend => readiness dashboard renders
  - unsupported/stale backend => explicit unsupported/degraded state
  - no raw `404` shown on `Operational Readiness`
