# Superuser Operational Readiness Control Plane Implementation Plan

**Goal:** Build a unified operational-readiness surface inside super/admin so the user can see, before debugging any feature flow, whether the required shared platform, BlockData, and AGChain dependencies are actually up, configured, and usable.

**Architecture:** Add one superuser-only `platform-api` readiness snapshot endpoint backed by a code-owned readiness registry, then mount one new `/app/superuser/operational-readiness` page that merges backend-owned dependency status with lightweight browser-owned local diagnostics. Initial ownership is intentionally consolidated inside super/admin even for signals that may later move into user-facing product surfaces.

**Tech Stack:** FastAPI, React + TypeScript, OpenTelemetry, pytest, Vitest, existing Supabase admin client, existing GCP storage client, existing admin shell.

**Status:** Draft
**Author:** Codex
**Date:** 2026-03-30

## Source Documents

- User request in this session: make operational status the immediate priority; show what is working vs not working in the frontend; mount it in super/admin for now; keep it scalable as more dependencies are added.
- Existing admin shell and superuser seams:
  - `web/src/components/layout/AdminShellLayout.tsx`
  - `web/src/components/admin/AdminLeftNav.tsx`
  - `web/src/pages/superuser/SuperuserWorkspace.tsx`
  - `web/src/router.tsx`
- Existing fragmented status/readiness references:
  - `web/src/hooks/useExtractRuntimeReadiness.ts`
  - `supabase/functions/extract-readiness/index.ts`
  - `web/src/pages/superuser/SuperuserProvisioningMonitor.tsx`
  - `web/src/pages/superuser/SuperuserApiEndpoints.tsx`
  - `web/src/pages/settings/ConnectionsPanel.tsx`
- Existing backend reference seams:
  - `services/platform-api/app/api/routes/health.py`
  - `services/platform-api/app/api/routes/telemetry.py`
  - `services/platform-api/app/api/routes/admin_storage.py`
  - `services/platform-api/app/api/routes/storage.py`
  - `services/platform-api/app/main.py`
  - `services/platform-api/app/core/config.py`

## Current-State Assessment

### What is wrong right now

1. There is no single page that answers the question: “Is the system operational for the flow I am about to test?”
2. Status visibility is fragmented across narrow, unrelated surfaces:
   - storage provisioning is in `SuperuserProvisioningMonitor`
   - extract readiness is a separate edge-function hook
   - API discovery is in `SuperuserApiEndpoints`
   - external connections are in `ConnectionsPanel`
   - platform health and telemetry exist as backend endpoints but are not assembled into one operator view
3. The current system makes the user infer runtime state from failures, logs, and repeated manual checks.
4. Frontend-local problems such as relative `/platform-api` base usage, current origin, or auth-bypass mode are not shown anywhere the user can see before testing flows.
5. There is no backend-owned readiness registry that can grow as more product capabilities are added.

### Why existing seams are insufficient

- `GET /health` and `GET /health/ready` only expose platform-api process health and conversion-pool state.
- `GET /observability/telemetry-status` only exposes OTel config, not broader runtime readiness.
- `SuperuserProvisioningMonitor` is storage-signup specific and does not generalize to platform dependencies.
- `useExtractRuntimeReadiness` is a one-off edge-function check and not a system-wide status model.
- `ConnectionsPanel` is credential management, not a unified runtime status page.

### Product interpretation to lock now

The user does not want a final perfect ownership split yet. The user wants one reliable, scalable operational-status surface now. This plan therefore consolidates initial readiness visibility under super/admin, while explicitly treating that as temporary ownership rather than a permanent product boundary.

## Manifest

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/admin/runtime/readiness` | Return a grouped readiness snapshot for shared platform, BlockData, and AGChain dependency checks | New |

#### New endpoint contract

`GET /admin/runtime/readiness`

- Auth: `require_superuser`
- Query params:
  - `surface`: optional; one of `all`, `shared`, `blockdata`, `agchain`; defaults to `all`
- Response shape:
  - `generated_at`: ISO timestamp
  - `summary`: `{ ok, warn, fail, unknown }`
  - `surfaces`: array of grouped readiness sections
  - `surfaces[].id`: `shared | blockdata | agchain`
  - `surfaces[].label`: human-readable surface label
  - `surfaces[].summary`: per-surface status counts
  - `surfaces[].checks[]`: array of check results
  - `surfaces[].checks[].id`: stable check id
  - `surfaces[].checks[].category`: `process | config | credential | connectivity | browser-dependent | observability | product`
  - `surfaces[].checks[].status`: `ok | warn | fail | unknown`
  - `surfaces[].checks[].label`: short display label
  - `surfaces[].checks[].summary`: one-line human explanation
  - `surfaces[].checks[].evidence`: small JSON-safe evidence object
  - `surfaces[].checks[].remediation`: short actionable next step
  - `surfaces[].checks[].checked_at`: ISO timestamp
- Touches:
  - in-process platform state
  - existing config/environment via `get_settings()`
  - existing Supabase admin client for lightweight probe(s)
  - existing GCS storage client for sign-capability and bucket CORS checks
- Does not persist readiness snapshots

#### Locked Phase-1 readiness checks

##### Shared platform

1. `shared.platform_api.ready`
   - Probe current in-process app readiness and conversion-pool saturation.
2. `shared.supabase.admin_connectivity`
   - Probe lightweight authenticated Supabase admin reachability.
3. `shared.background_workers.config`
   - Report whether required worker-start prerequisites are configured.
4. `shared.observability.telemetry_config`
   - Report current OTel enabled/config state.

##### BlockData

1. `blockdata.storage.bucket_config`
   - Verify `GCS_USER_STORAGE_BUCKET` is configured.
2. `blockdata.storage.signed_url_signing`
   - Verify current server credentials can produce a GCS signed upload URL.
3. `blockdata.storage.bucket_cors`
   - Verify the configured GCS bucket has browser-upload CORS rules.
4. `blockdata.pipeline.definitions`
   - Verify pipeline definitions can resolve from the current runtime.

##### AGChain

1. `agchain.benchmarks.catalog`
   - Verify the AGChain benchmark catalog runtime seam resolves.
2. `agchain.models.providers`
   - Verify the AGChain model-provider runtime seam resolves.
3. `agchain.models.targets`
   - Verify model-target listing runtime seam resolves.

#### Existing platform API endpoints modified: `0`

#### Existing platform API endpoints reused as references only: `3`

1. `GET /health/ready`
2. `GET /observability/telemetry-status`
3. Existing storage and AGChain helper seams inside `platform-api`

### Observability

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Trace span | `admin.runtime.readiness.snapshot` | `services/platform-api/app/api/routes/admin_runtime_readiness.py` | Measure request latency and surface-level result counts |
| Trace span | `admin.runtime.readiness.check` | `services/platform-api/app/services/runtime_readiness.py` | Measure individual check latency and failure points |
| Metric counter | `platform.admin.runtime.readiness.snapshot.count` | readiness route | Count snapshot requests by result |
| Metric counter | `platform.admin.runtime.readiness.check.count` | readiness service | Count per-check outcomes by surface and status |
| Metric histogram | `platform.admin.runtime.readiness.check.duration_ms` | readiness service | Measure per-check latency |
| Structured log | `admin.runtime.readiness.degraded` | readiness route/service | Record degraded or failed check ids and surface counts for operator audit |

Observability attribute rules:

- Allowed trace/metric attributes:
  - `surface`
  - `check.id`
  - `check.category`
  - `status`
  - `result`
  - `http.status_code`
  - `degraded_count`
  - `failed_count`
  - `has_bucket`
  - `has_signing_credentials`
  - `cors_configured`
  - `workers_configured`
- Forbidden in trace or metric attributes:
  - emails
  - JWTs
  - secret values
  - private keys
  - raw object keys
  - signed URLs
  - full credential file paths
- Structured logs may include stable check ids and remediation text, but not secrets or signed URLs.

### Database Migrations

No database migrations.

Justification:

- readiness is an on-demand operational snapshot, not a new persisted product data model
- this phase should not create a second configuration system in Postgres
- the readiness registry remains code-owned and versioned with application behavior

### Edge Functions

No edge functions created or modified.

Existing edge functions such as `extract-readiness` remain compatibility references only. This implementation creates a unified readiness surface in `platform-api` and the frontend super/admin shell.

### Frontend Surface Area

**New top-level pages/routes:** `1`

| Page | File | Purpose |
|------|------|---------|
| `SuperuserOperationalReadiness` | `web/src/pages/superuser/SuperuserOperationalReadiness.tsx` | Unified operator-facing readiness page for shared, BlockData, and AGChain status |

**New components:** `3`

| Component | File | Used by |
|-----------|------|---------|
| `OperationalReadinessSummary` | `web/src/components/superuser/OperationalReadinessSummary.tsx` | `SuperuserOperationalReadiness.tsx` |
| `OperationalReadinessCheckGrid` | `web/src/components/superuser/OperationalReadinessCheckGrid.tsx` | `SuperuserOperationalReadiness.tsx` |
| `OperationalReadinessClientPanel` | `web/src/components/superuser/OperationalReadinessClientPanel.tsx` | `SuperuserOperationalReadiness.tsx` |

**New hooks:** `1`

| Hook | File | Purpose |
|------|------|---------|
| `useOperationalReadiness` | `web/src/hooks/useOperationalReadiness.ts` | Fetch backend readiness snapshot and collect browser/local diagnostics |

**New libraries/services:** `1`

| File | Purpose |
|------|---------|
| `web/src/lib/operationalReadiness.ts` | Shared types, browser-diagnostic helpers, and frontend merge utilities for readiness data |

**Modified existing files:** `3`

| File | What changes |
|------|--------------|
| `web/src/router.tsx` | Mount `/app/superuser/operational-readiness` |
| `web/src/components/admin/AdminLeftNav.tsx` | Add super/admin nav entry for the new readiness page |
| `web/src/components/admin/__tests__/AdminLeftNav.test.tsx` | Lock new nav entry presence and path |

This phase does not modify AGChain shell pages or end-user BlockData feature pages. The new readiness surface lives only in super/admin.

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. The initial mounted surface lives under super/admin even for statuses that may later become user-owned.
2. There is one backend-owned readiness snapshot endpoint; the frontend must not scatter independent server probes across many pages.
3. Browser-only diagnostics are allowed, but they are a small explicit companion layer, not the source of truth for backend dependency health.
4. The readiness registry is code-owned in this phase. Do not store readiness definitions or statuses in Supabase tables.
5. The new page is read-only diagnostics. It does not mutate config, restart services, or auto-remediate failures.
6. The page must group statuses by `Shared`, `BlockData`, and `AGChain` so one admin area can support both products without needing a final ownership split first.
7. Existing point solutions such as storage provisioning monitor, extract readiness hook, and connections management remain in place, but they are not the new unified readiness source of truth.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. A superuser can open `/app/superuser/operational-readiness`.
2. The page shows grouped readiness sections for `Shared`, `BlockData`, and `AGChain`.
3. The page shows a backend-owned readiness status for platform-api readiness, Supabase admin connectivity, background worker configuration, and telemetry configuration.
4. The page shows explicit BlockData upload-path prerequisites, including whether the server can sign a GCS upload URL and whether the bucket has browser-upload CORS configured.
5. The page shows explicit AGChain runtime checks for benchmark catalog and models readiness.
6. The page shows browser/local diagnostics including current frontend origin, resolved platform-api base mode, and auth-bypass mode.
7. A failed or degraded check includes visible remediation guidance so the user can tell “not on yet” apart from “broken.”
8. The admin nav exposes the new page in the same super/admin area used by other operational tooling.
9. No database migrations or edge-function changes are introduced.
10. Locked inventory counts match the actual changed file set.

### Locked Platform API Surface

#### New superuser-only platform API endpoints: `1`

1. `GET /admin/runtime/readiness`

#### Existing platform API endpoints modified: `0`

#### Existing platform API endpoints reused as references only: `3`

1. `GET /health/ready`
2. `GET /observability/telemetry-status`
3. Existing in-process storage / AGChain helper seams

### Locked Observability Surface

#### New traces: `2`

1. `admin.runtime.readiness.snapshot`
2. `admin.runtime.readiness.check`

#### New metrics: `2 counters`, `1 histogram`

1. `platform.admin.runtime.readiness.snapshot.count`
2. `platform.admin.runtime.readiness.check.count`
3. `platform.admin.runtime.readiness.check.duration_ms`

#### New structured logs: `1`

1. `admin.runtime.readiness.degraded`

### Locked Inventory Counts

#### Platform API runtime

- New route modules: `1`
- New service modules: `1`
- New observability modules: `1`
- Modified existing platform-api files: `1`

#### Frontend runtime

- New top-level pages/routes: `1`
- New visual components: `3`
- New hooks: `1`
- New libraries/services: `1`
- Modified existing frontend files: `3`

#### Tests

- New pytest modules: `2`
- New Vitest modules: `2`
- Modified existing Vitest modules: `1`

#### Database/runtime zero-cases

- New migrations: `0`
- Modified migrations: `0`
- Modified edge-function files: `0`

### Locked File Inventory

#### New files

- `services/platform-api/app/api/routes/admin_runtime_readiness.py`
- `services/platform-api/app/services/runtime_readiness.py`
- `services/platform-api/app/observability/runtime_readiness_metrics.py`
- `services/platform-api/tests/test_admin_runtime_readiness_routes.py`
- `services/platform-api/tests/test_runtime_readiness_service.py`
- `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`
- `web/src/pages/superuser/SuperuserOperationalReadiness.test.tsx`
- `web/src/components/superuser/OperationalReadinessSummary.tsx`
- `web/src/components/superuser/OperationalReadinessCheckGrid.tsx`
- `web/src/components/superuser/OperationalReadinessClientPanel.tsx`
- `web/src/hooks/useOperationalReadiness.ts`
- `web/src/hooks/useOperationalReadiness.test.tsx`
- `web/src/lib/operationalReadiness.ts`

#### Modified files

- `services/platform-api/app/main.py`
- `web/src/router.tsx`
- `web/src/components/admin/AdminLeftNav.tsx`
- `web/src/components/admin/__tests__/AdminLeftNav.test.tsx`

#### Not modified

- `supabase/migrations/**`
- `supabase/functions/**`
- `web/src/pages/superuser/SuperuserWorkspace.tsx`
- `web/src/pages/superuser/SuperuserProvisioningMonitor.tsx`
- `web/src/pages/settings/ConnectionsPanel.tsx`
- `web/src/hooks/useExtractRuntimeReadiness.ts`

## Frozen Operational Readiness Contract

The new readiness surface exists to stop scattered, ad hoc debugging. Do not implement this by letting each frontend page probe its own dependencies independently. The system must have one backend-owned readiness registry and one super/admin operational-status page that can be expanded as more capabilities are added.

Do not persist readiness snapshots in Supabase. Do not reuse `service_registry` as the runtime readiness source of truth. `service_registry` is a service catalog / admin management seam, not a live dependency-status control plane.

Do not include secrets, signed URLs, private keys, raw credential paths, or user emails in readiness evidence payloads.

## Explicit Risks Accepted In This Plan

1. Super/admin temporarily over-owns readiness visibility for both BlockData and AGChain because the user explicitly wants consolidation first and ownership refinement later.
2. This phase provides live snapshots and manual refresh, not historical timelines or alerting.
3. Some local-browser issues can only be reported from the frontend layer, so the page intentionally combines backend and browser diagnostics in one operator view.
4. Existing narrow monitors remain in the codebase during this phase; consolidation of every legacy status surface is deferred.

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked platform API surface exists exactly as specified.
2. The locked readiness check catalog exists for the phase-1 checks in this plan.
3. The locked traces, metrics, and structured logs exist exactly as specified.
4. The super/admin frontend page exists and is reachable from admin navigation.
5. The page visually separates `Shared`, `BlockData`, and `AGChain` statuses.
6. The page surfaces GCS sign-capability and bucket CORS state for the BlockData upload path.
7. The page surfaces current browser/local diagnostics alongside server readiness results.
8. The inventory counts in this plan match the actual created and modified files.
9. No database migrations or edge-function changes are introduced.

## Task 1: Lock the failing backend readiness contract tests

**File(s):**

- `services/platform-api/tests/test_admin_runtime_readiness_routes.py`
- `services/platform-api/tests/test_runtime_readiness_service.py`

**Step 1:** Write the route-level failing tests for `GET /admin/runtime/readiness`, including superuser auth, response shape, and grouped `shared` / `blockdata` / `agchain` sections.
**Step 2:** Write the service-level failing tests for the phase-1 readiness checks, including sign-capability and bucket-CORS classification behavior.
**Step 3:** Run the backend tests and confirm they fail for the missing route/service.

**Test command:** `cd services/platform-api && pytest -q tests/test_admin_runtime_readiness_routes.py tests/test_runtime_readiness_service.py`
**Expected output:** New readiness tests fail because the route and service do not exist yet.

**Commit:** `test: lock operational readiness backend contract`

## Task 2: Implement the backend-owned readiness control plane

**File(s):**

- `services/platform-api/app/api/routes/admin_runtime_readiness.py`
- `services/platform-api/app/services/runtime_readiness.py`
- `services/platform-api/app/observability/runtime_readiness_metrics.py`
- `services/platform-api/app/main.py`

**Step 1:** Create the code-owned readiness registry/service with the locked phase-1 check ids, grouped by `shared`, `blockdata`, and `agchain`.
**Step 2:** Implement the concrete probe logic for process readiness, Supabase connectivity, worker config, telemetry config, GCS bucket presence, GCS sign-capability, bucket CORS, pipeline definitions, AGChain benchmarks, and AGChain models.
**Step 3:** Add the locked readiness traces, metrics, and structured log emission.
**Step 4:** Add the `GET /admin/runtime/readiness` route and mount it in `app/main.py`.
**Step 5:** Re-run the backend tests and make them pass.

**Test command:** `cd services/platform-api && pytest -q tests/test_admin_runtime_readiness_routes.py tests/test_runtime_readiness_service.py`
**Expected output:** The new readiness route and service tests pass.

**Commit:** `feat: add superuser runtime readiness api`

## Task 3: Lock the failing frontend route, nav, and page contract tests

**File(s):**

- `web/src/pages/superuser/SuperuserOperationalReadiness.test.tsx`
- `web/src/hooks/useOperationalReadiness.test.tsx`
- `web/src/components/admin/__tests__/AdminLeftNav.test.tsx`

**Step 1:** Write the failing page test proving the new readiness page renders summary counts, grouped sections, remediation text, and browser diagnostics.
**Step 2:** Write the failing hook test proving backend snapshot data and browser diagnostics are merged into one consumable state model.
**Step 3:** Extend the admin nav test to fail until the new `Operational Status` link is present.
**Step 4:** Run the targeted frontend tests and confirm they fail before implementation.

**Test command:** `cd web && npm exec vitest run src/pages/superuser/SuperuserOperationalReadiness.test.tsx src/hooks/useOperationalReadiness.test.tsx src/components/admin/__tests__/AdminLeftNav.test.tsx --reporter=verbose`
**Expected output:** The new page/hook tests fail because the new route and page do not exist yet, and the nav test fails because the link is missing.

**Commit:** `test: lock operational readiness frontend contract`

## Task 4: Implement the super/admin operational-status page

**File(s):**

- `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`
- `web/src/components/superuser/OperationalReadinessSummary.tsx`
- `web/src/components/superuser/OperationalReadinessCheckGrid.tsx`
- `web/src/components/superuser/OperationalReadinessClientPanel.tsx`
- `web/src/hooks/useOperationalReadiness.ts`
- `web/src/lib/operationalReadiness.ts`
- `web/src/router.tsx`
- `web/src/components/admin/AdminLeftNav.tsx`
- `web/src/components/admin/__tests__/AdminLeftNav.test.tsx`

**Step 1:** Implement the shared frontend types and browser/local diagnostics helper in `operationalReadiness.ts`.
**Step 2:** Implement `useOperationalReadiness` to fetch the backend snapshot and collect browser diagnostics without duplicating backend dependency probes in the browser.
**Step 3:** Build the new page and supporting components so the page shows summary counts, grouped checks, remediation text, and client diagnostics.
**Step 4:** Add the `/app/superuser/operational-readiness` route and admin-nav entry.
**Step 5:** Re-run the targeted frontend tests and make them pass.

**Test command:** `cd web && npm exec vitest run src/pages/superuser/SuperuserOperationalReadiness.test.tsx src/hooks/useOperationalReadiness.test.tsx src/components/admin/__tests__/AdminLeftNav.test.tsx --reporter=verbose`
**Expected output:** The new readiness page, hook, and nav tests pass.

**Commit:** `feat: add superuser operational readiness page`

## Task 5: Run the final operational-readiness regression sweep

**File(s):**

- `services/platform-api/app/api/routes/admin_runtime_readiness.py`
- `services/platform-api/app/services/runtime_readiness.py`
- `services/platform-api/app/observability/runtime_readiness_metrics.py`
- `services/platform-api/app/main.py`
- `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`
- `web/src/hooks/useOperationalReadiness.ts`
- `web/src/components/admin/AdminLeftNav.tsx`
- `web/src/router.tsx`

**Step 1:** Run the locked backend readiness tests.
**Step 2:** Run the locked frontend readiness tests.
**Step 3:** Run the existing admin-nav and build verification path.
**Step 4:** In a browser session, verify the new page shows a visible failing state when a prerequisite is degraded and shows a visible passing state when the prerequisite is healthy.

**Test command:** `cd services/platform-api && pytest -q tests/test_admin_runtime_readiness_routes.py tests/test_runtime_readiness_service.py && cd ../../web && npm exec vitest run src/pages/superuser/SuperuserOperationalReadiness.test.tsx src/hooks/useOperationalReadiness.test.tsx src/components/admin/__tests__/AdminLeftNav.test.tsx --reporter=verbose && npm run build`
**Expected output:** Backend tests pass, frontend tests pass, and the web build completes successfully.

**Commit:** `test: verify superuser operational readiness control plane`

