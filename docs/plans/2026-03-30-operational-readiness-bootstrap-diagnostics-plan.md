# Operational Readiness Bootstrap Diagnostics Correction Plan

**Goal:** Correct the `Operational Readiness` page so it can diagnose its own transport, target-resolution, route-availability, and auth failures before it attempts to act like a backend-owned control plane. Eliminate the generic terminal `Failed to fetch` operator state and replace it with explicit bootstrap diagnosis that names why the control plane is unavailable.

**Architecture:** Treat bootstrap diagnosis as a first-class frontend-owned prerequisite layer that sits in front of the existing backend-owned readiness snapshot. The page must establish target resolution, basic reachability, route availability, and auth state before it treats `GET /admin/runtime/readiness` as authoritative. Use existing `platform-api` seams where possible; do not add a second bootstrap-specific backend dependency unless the existing seams prove insufficient. The page remains mounted at the existing superuser route and preserves the current shell where it is already correct.

**Tech Stack:** React + TypeScript, existing `platform-api` health and readiness routes, Vite dev proxy, Supabase auth session helpers, Vitest.

**Plan Type:** Frontend-first correction / prerequisite plan

**Status:** Draft
**Author:** Codex
**Date:** 2026-03-30
**Prerequisite relation:** No backend development for `Operational Readiness` in [2026-03-30-emergency-backend-surface-correction-plan.md](E:/writing-system/docs/plans/2026-03-30-emergency-backend-surface-correction-plan.md) should begin until this plan is implemented and verified.

## 1. Root cause and current reality

The current page fails at the wrong layer.

Observed failure chain:

1. [useOperationalReadiness.ts](E:/writing-system/web/src/hooks/useOperationalReadiness.ts) calls `platformApiFetch('/admin/runtime/readiness?surface=all')` immediately on mount.
2. [platformApi.ts](E:/writing-system/web/src/lib/platformApi.ts) always resolves a `platform-api` base URL and always attaches an `Authorization` header.
3. When `VITE_PLATFORM_API_URL` is an absolute origin or points at the wrong port, the first browser request can fail before any HTTP response is returned.
4. The hook catches that thrown transport error and stores only the raw thrown message string.
5. [SuperuserOperationalReadiness.tsx](E:/writing-system/web/src/pages/superuser/SuperuserOperationalReadiness.tsx) renders a generic `Readiness snapshot failed to load.` banner and still renders zero-valued summary cards.
6. The page therefore fails exactly where it is supposed to provide diagnosis.

Current design defect:

1. the page assumes the readiness control plane is already reachable
2. target resolution and transport bootstrap are not part of the primary page contract
3. `Client Environment` exists, but only as a secondary footer panel, not as the first diagnostic surface
4. a generic `Failed to fetch` banner is allowed to be the terminal operator-facing diagnosis
5. zero-valued summary cards render even when no authoritative snapshot exists

This plan fixes that contract error first.

## 2. Manifest

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/health` | Probe basic platform-api reachability without auth | Existing - no contract change |
| GET | `/admin/runtime/readiness` | Probe route availability without auth, then load authenticated readiness snapshot only after bootstrap passes | Existing - no contract change |

#### New endpoint contracts

No new `platform-api` endpoints are added in this plan.

Reason:

1. adding a second bootstrap-specific backend route would recreate the same circular dependency at a different path
2. the page can establish the required bootstrap diagnosis using existing `/health`, local target-resolution facts, local auth facts, and the existing readiness route

#### Modified endpoint contracts

No backend request or response shape changes are declared in this plan.

Zero-case justification:

1. this plan corrects frontend sequencing, diagnosis, and rendering behavior
2. if implementation proves that existing `/health` plus `/admin/runtime/readiness` are insufficient to classify bootstrap failures, stop and revise this plan before adding a new backend seam

### Observability

No backend OpenTelemetry changes are added in this plan.

Zero-case justification:

1. the immediate defect is a frontend-owned bootstrap diagnosis failure
2. this plan resolves that failure by turning local target-resolution, auth, route-probe, and snapshot states into explicit UI states and test coverage
3. any later backend-owned telemetry additions belong to the larger emergency correction plan, not this prerequisite bootstrap fix

### Database Migrations

No database migrations are added or modified.

### Edge Functions

No edge functions are created or modified.

### Frontend Surface Area

**New pages:** `0`

**New components:** `1`

| Component | File | Used by |
|-----------|------|---------|
| `OperationalReadinessBootstrapPanel` | `web/src/components/superuser/OperationalReadinessBootstrapPanel.tsx` | `SuperuserOperationalReadiness.tsx` |

**New component tests:** `1`

| Test | File |
|------|------|
| `OperationalReadinessBootstrapPanel.test.tsx` | `web/src/components/superuser/OperationalReadinessBootstrapPanel.test.tsx` |

**New libraries/services:** `1`

| Library | File | Purpose |
|---------|------|---------|
| `platformApiDiagnostics` | `web/src/lib/platformApiDiagnostics.ts` | Resolve target mode, run unauthenticated bootstrap probes, and classify bootstrap failures |

**Modified pages:** `1`

| Page | File | What changes |
|------|------|--------------|
| `SuperuserOperationalReadiness` | `web/src/pages/superuser/SuperuserOperationalReadiness.tsx` | Render bootstrap diagnostics as the first authoritative operator surface and suppress misleading zero-summary render when no snapshot exists |

**Modified components:** `3`

| Component | File | What changes |
|-----------|------|--------------|
| `OperationalReadinessSummary` | `web/src/components/superuser/OperationalReadinessSummary.tsx` | Render only when an authoritative snapshot exists |
| `OperationalReadinessClientPanel` | `web/src/components/superuser/OperationalReadinessClientPanel.tsx` | Demote to supporting detail under the bootstrap panel and include target-mode facts only as secondary detail |
| `OperationalReadinessCheckGrid` | `web/src/components/superuser/OperationalReadinessCheckGrid.tsx` | Render only after bootstrap readiness reaches `snapshot_available` |

**Modified hooks/services/tests:** `6`

1. `web/src/hooks/useOperationalReadiness.ts`
2. `web/src/hooks/useOperationalReadiness.test.tsx`
3. `web/src/lib/platformApi.ts`
4. `web/src/lib/operationalReadiness.ts`
5. `web/src/lib/platformApiDiagnostics.test.ts`
6. `web/.env.example`

## 3. Pre-Implementation Contract

No backend development for `Operational Readiness` may begin until the frontend bootstrap contract in this plan is implemented and verified.

No major decision about bootstrap diagnosis, target resolution, route-probe ordering, auth-state handling, or rendering fallback may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

## 4. Locked product decisions

1. The `Operational Readiness` page is responsible for diagnosing its own inability to reach the backend control plane.
2. A generic transport string such as `Failed to fetch` must never be the terminal operator-facing diagnosis.
3. Bootstrap diagnosis precedes authenticated readiness snapshot loading.
4. `Client Environment` remains a supporting panel, not the page’s primary failure explanation.
5. Zero-valued summary cards and empty readiness surfaces must not render as if authoritative when no snapshot has been loaded successfully.
6. Default local development should prefer the relative `/platform-api` path through the Vite proxy; absolute `VITE_PLATFORM_API_URL` is an advanced override that must be surfaced explicitly in diagnostics.
7. This plan does not add a new backend bootstrap endpoint unless implementation proves the existing seams are genuinely insufficient.

## 5. Locked acceptance contract

The implementation is only complete when all of the following are true:

1. When the configured `platform-api` target is unreachable, the page renders an explicit `Platform API unreachable` diagnosis with target and probe detail; it does not terminate at `Failed to fetch`.
2. When `/health` succeeds but `/admin/runtime/readiness` returns `404`, the page renders an explicit `Readiness route unavailable on current backend target` diagnosis.
3. When the readiness route exists but no auth token is available, the page renders an explicit `Authentication required before loading readiness snapshot` diagnosis.
4. When an auth token exists but the readiness request returns `401` or `403`, the page renders an explicit `Authentication rejected` diagnosis.
5. When the snapshot succeeds, the bootstrap panel shows `Ready`, the summary cards render authoritative values, and the surface grids become visible.
6. When no snapshot exists, the page does not render zero-valued summary counts as authoritative readiness state.
7. The page always shows the frontend origin, resolved API target, target mode (`relative proxy` vs `absolute direct`), health-probe result, readiness-route probe result, auth-token presence, and snapshot-request result.
8. Local development with the default repo configuration uses the correct `platform-api` target without requiring manual port guessing.

## 6. Frozen frontend contract

### 6.1 Bootstrap state model

Add the following frozen types to the readiness frontend contract:

```ts
type PlatformApiBaseMode = 'relative_proxy' | 'absolute_direct';
type BootstrapProbeStatus = 'pending' | 'ok' | 'warn' | 'fail' | 'skipped';
type BootstrapDiagnosisKind =
  | 'platform_api_unreachable'
  | 'readiness_route_missing'
  | 'auth_missing'
  | 'auth_rejected'
  | 'snapshot_http_error'
  | 'preflight_or_cors_failure'
  | 'target_mismatch'
  | 'unknown_transport_failure'
  | 'ready';

type BootstrapProbeId =
  | 'frontend_origin'
  | 'platform_api_target'
  | 'health_probe'
  | 'readiness_route_probe'
  | 'auth_token_probe'
  | 'snapshot_request';

type OperationalReadinessBootstrapProbe = {
  probe_id: BootstrapProbeId;
  label: string;
  status: BootstrapProbeStatus;
  summary: string;
  detail: string;
  target_url?: string;
  http_status_code?: number | null;
};

type OperationalReadinessBootstrapState = {
  diagnosis_kind: BootstrapDiagnosisKind;
  diagnosis_title: string;
  diagnosis_summary: string;
  snapshot_available: boolean;
  base_mode: PlatformApiBaseMode;
  frontend_origin: string;
  platform_api_target: string;
  probes: OperationalReadinessBootstrapProbe[];
};
```

### 6.2 Probe ordering contract

The page must resolve bootstrap state in this order:

1. resolve frontend origin and the normalized `platform-api` target
2. classify target mode as `relative_proxy` or `absolute_direct`
3. run an unauthenticated `GET /health` probe
4. run an unauthenticated `GET /admin/runtime/readiness?surface=all`
   - `404` means route missing
   - `401` or `403` means route exists but requires auth
5. inspect local auth token availability without making the authenticated snapshot request the first truth source
6. run the authenticated readiness snapshot only after the prior probes complete
7. classify final diagnosis from the whole probe set, not from one thrown string

### 6.3 UI layout contract

Keep the existing page shell where it is already correct, but change the order and gating rules:

1. page header and refresh action stay at the top
2. `OperationalReadinessBootstrapPanel` renders immediately below the header and is the first authoritative panel on the page
3. `OperationalReadinessSummary` renders only when `snapshot_available = true`
4. readiness surface grids render only when `snapshot_available = true`
5. `OperationalReadinessClientPanel` remains below the bootstrap panel and below the readiness surfaces when a snapshot exists
6. on bootstrap failure, the page must show:
   - diagnosis title
   - diagnosis summary
   - per-probe result cards
   - explicit target/origin facts
   - next operator action
7. on bootstrap failure, the page must not show zeroed KPI cards as if they came from an authoritative backend snapshot

### 6.4 Diagnosis mapping contract

The frontend must map probe combinations to explicit diagnoses:

1. `/health` network failure -> `platform_api_unreachable`
2. `/health` ok + readiness route `404` -> `readiness_route_missing`
3. readiness route `401/403` + no local token -> `auth_missing`
4. readiness route `401/403` + local token present + authenticated request returns `401/403` -> `auth_rejected`
5. target mode `absolute_direct` + network throw on authenticated request after successful `/health` -> `preflight_or_cors_failure`
6. target mode indicates unexpected local port or host -> `target_mismatch`
7. authenticated request returns a non-auth HTTP error -> `snapshot_http_error`
8. anything else thrown before response -> `unknown_transport_failure`

## 7. Dev target hardening contract

1. `web/.env.example` must document that standard local development leaves `VITE_PLATFORM_API_URL` unset so the app uses `/platform-api`.
2. `platformApi.ts` must expose the resolved target and base mode for diagnostics.
3. bootstrap diagnostics must always show the resolved target string that the browser is attempting to use.
4. if `VITE_PLATFORM_API_URL` is set to an absolute local URL, the page must surface that fact explicitly as `absolute direct` mode.

## 8. Risks

1. Browser JavaScript cannot fully introspect every CORS-preflight failure detail; some diagnoses will remain best-effort classifications based on probe combinations.
2. If local auth helpers themselves throw unexpectedly, the page must degrade to explicit auth/bootstrap diagnosis rather than collapsing to a generic banner.
3. Existing tests currently normalize old `remediation` behavior and do not assert bootstrap sequencing, so the new tests must fail first.

## 9. Task plan

No implementation work should begin outside these tasks.

### Task 1: Lock failing tests for bootstrap diagnosis

**File(s):**

1. `web/src/hooks/useOperationalReadiness.test.tsx`
2. `web/src/components/superuser/OperationalReadinessBootstrapPanel.test.tsx`
3. `web/src/lib/platformApiDiagnostics.test.ts`

**Step 1:** Add failing tests for the bootstrap probe order and frozen diagnosis mapping contract.
**Step 2:** Add failing tests proving that zero summary cards do not render when `snapshot_available = false`.
**Step 3:** Add failing tests for the four primary failure classes: unreachable target, missing route, missing auth, rejected auth.
**Step 4:** Add failing tests for `absolute_direct` target mode and explicit target rendering.

**Test command:** `cd E:\\writing-system\\web && npm exec vitest run src/hooks/useOperationalReadiness.test.tsx src/components/superuser/OperationalReadinessBootstrapPanel.test.tsx src/lib/platformApiDiagnostics.test.ts`
**Expected output:** tests fail because the current page still collapses bootstrap failure into a generic banner and renders zero-valued summary cards.

**Commit:** `test: lock readiness bootstrap diagnostics contract`

### Task 2: Implement target-resolution and bootstrap probe utilities

**File(s):**

1. `web/src/lib/platformApi.ts`
2. `web/src/lib/platformApiDiagnostics.ts`
3. `web/src/lib/platformApiDiagnostics.test.ts`
4. `web/.env.example`

**Step 1:** Add a normalized target-resolution helper that returns the final target string and `base_mode`.
**Step 2:** Add unauthenticated bootstrap probe helpers for `/health` and route-availability checks.
**Step 3:** Keep authenticated `platformApiFetch` for the actual readiness snapshot; do not reuse it as the bootstrap probe path.
**Step 4:** Document the default local-dev target contract in `.env.example`.

**Test command:** `cd E:\\writing-system\\web && npm exec vitest run src/lib/platformApiDiagnostics.test.ts`
**Expected output:** target normalization and diagnosis helpers pass.

**Commit:** `feat: add platform-api bootstrap diagnostics helpers`

### Task 3: Rebuild the readiness hook around bootstrap-first sequencing

**File(s):**

1. `web/src/hooks/useOperationalReadiness.ts`
2. `web/src/hooks/useOperationalReadiness.test.tsx`
3. `web/src/lib/operationalReadiness.ts`

**Step 1:** Extend the hook state with `bootstrap`.
**Step 2:** Run bootstrap probes before the authenticated snapshot request.
**Step 3:** Classify thrown transport errors using the frozen diagnosis mapping instead of exposing raw error strings as the primary diagnosis.
**Step 4:** Gate `summary` and `surfaces` on `snapshot_available`.

**Test command:** `cd E:\\writing-system\\web && npm exec vitest run src/hooks/useOperationalReadiness.test.tsx`
**Expected output:** the hook returns explicit bootstrap diagnosis state and no longer treats empty summary data as authoritative on fetch failure.

**Commit:** `feat: sequence readiness around bootstrap diagnostics`

### Task 4: Redesign the page around bootstrap-first operator flow

**File(s):**

1. `web/src/pages/superuser/SuperuserOperationalReadiness.tsx`
2. `web/src/components/superuser/OperationalReadinessBootstrapPanel.tsx`
3. `web/src/components/superuser/OperationalReadinessBootstrapPanel.test.tsx`
4. `web/src/components/superuser/OperationalReadinessSummary.tsx`
5. `web/src/components/superuser/OperationalReadinessClientPanel.tsx`
6. `web/src/components/superuser/OperationalReadinessCheckGrid.tsx`

**Step 1:** Insert the bootstrap panel below the header as the first authoritative page surface.
**Step 2:** Hide summary cards and readiness grids until the hook reports `snapshot_available = true`.
**Step 3:** Move the existing generic banner responsibility into the bootstrap diagnosis surface; do not keep a separate generic transport banner.
**Step 4:** Keep the client panel as secondary context.

**Test command:** `cd E:\\writing-system\\web && npm exec vitest run src/components/superuser/OperationalReadinessBootstrapPanel.test.tsx src/hooks/useOperationalReadiness.test.tsx`
**Expected output:** the page renders explicit bootstrap diagnoses and no longer terminates at `Failed to fetch`.

**Commit:** `feat: make readiness page diagnose its own bootstrap failures`

### Task 5: Browser verification against real local failure modes

**Commands:**

1. run the web app in default local-dev mode
2. verify healthy local startup against `/platform-api`
3. verify a wrong absolute `VITE_PLATFORM_API_URL` produces an explicit target-unreachable or target-mismatch diagnosis
4. verify a healthy backend with no authenticated session produces an explicit auth diagnosis

**Expected output:**

1. no terminal `Failed to fetch` operator state
2. bootstrap diagnostics correctly identify the failure class
3. summary cards remain hidden until an authoritative snapshot is loaded

**Commit:** `test: verify readiness bootstrap diagnostics in browser`

## 10. Completion criteria

This plan is complete only when:

1. `Operational Readiness` can diagnose its own inability to reach the control plane.
2. a thrown browser transport error is classified into an explicit bootstrap diagnosis.
3. the page never renders empty summary counts as if they were real readiness data when the snapshot is unavailable.
4. the resolved `platform-api` target and target mode are always visible to the operator.
5. the page distinguishes route-missing, auth-missing, auth-rejected, and target-unreachable states.
6. the page still loads the full readiness snapshot and existing grids once bootstrap passes.
7. the page is usable as a prerequisite surface before any deeper readiness backend work proceeds.

