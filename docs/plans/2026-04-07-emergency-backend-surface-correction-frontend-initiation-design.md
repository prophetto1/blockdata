# 2026-04-07 Emergency Backend Surface Correction Frontend Initiation Design

## Purpose

This document turns the frontend-facing portions of `docs\plans\2026-04-07-emergency-backend-surface-correction-successor-implementation-plan.md` into a concrete design for implementation.

It does not replace the April 7 successor plan. It translates that plan's approved frontend work into:

1. a Phase 1 frontend execution design
2. explicit hold-lines for what must not be built yet
3. a readiness checklist for when `Phase 2` and `Phase 3` can open

## Source Of Truth

1. `docs\plans\2026-04-07-emergency-backend-surface-correction-successor-implementation-plan.md` remains the implementation authority.
2. This design is subordinate to the successor plan's locked product decisions, locked file inventory, frozen seam contract, and locked acceptance contract.
3. If this design conflicts with the successor plan, the successor plan wins and this file must be revised.

## Design Goal

The frontend goal is not to create a bigger control plane. The goal is to make the already-mounted frontend surfaces truthful, actionable where the backend is actually actionable, and explicit about what is still only visibility or placeholder state.

For this program, that means:

1. finish the remaining `Phase 1` frontend runtime work for Operational Readiness and Telemetry
2. avoid building speculative `Phase 2` probe/history UI before the revalidation gate
3. prepare a clean handoff into `Phase 3` AGChain truthfulness correction without mixing AGChain cleanup into the readiness and telemetry batch

## Current Frontend State

### Operational Readiness

Current mounted surface:

1. `web\src\pages\superuser\SuperuserOperationalReadiness.tsx`
2. `web\src\hooks\useOperationalReadiness.ts`
3. `web\src\lib\operationalReadiness.ts`
4. `web\src\components\superuser\OperationalReadinessCheckGrid.tsx`

Current strengths:

1. The page already has a mounted route, shell header, summary, grid, bootstrap diagnostics, and refresh action.
2. The normalized data contract already understands `available_actions`, `verify_after`, and `actionability`.
3. The grid already renders action and verification sections in the detail panel.

Current gap:

1. The page and hook do not yet execute the real backend action from the UI.
2. The readiness surface still needs frontend-side truthfulness tightening so the UI does not imply backend remediation where only visibility or external change exists.
3. The post-action refresh path is not yet part of the mounted interaction contract.

### Telemetry

Current mounted surface:

1. `web\src\pages\ObservabilityTelemetry.tsx`

Current gap:

1. The page is still a generic placeholder.
2. The plan-required test file `web\src\pages\ObservabilityTelemetry.test.tsx` does not yet exist.
3. The route already exists at `GET /observability/telemetry-status`, but the page does not yet present honest config visibility and does not explain what the backend route does not prove.

### AGChain

Current relevant surfaces:

1. `\web\src\components\agchain\AgchainLeftNav.tsx`
2. `web\src\components\layout\AgchainShellLayout.tsx`
3. `web\src\pages\agchain\AgchainOverviewPage.tsx`
4. `web\src\pages\agchain\AgchainSectionPage.tsx`
5. `web\src\components\agchain\overview\agchainOverviewPlaceholderData.ts`

Current gap:

1. These are `Phase 3` surfaces, not `Phase 1` execution targets.
2. They should not be pulled into the readiness and telemetry buildout except as explicit blockers or sequencing dependencies.

## Chosen Frontend Approach

### Recommendation

Use the existing mounted pages and hooks as the implementation spine.

This is the correct approach because the successor plan is explicitly trying to avoid reopening March 30 architecture. The frontend should therefore:

1. extend the current Operational Readiness route instead of introducing a new control-plane surface
2. replace the existing Telemetry placeholder page instead of creating a second telemetry route
3. reserve all `Phase 2` proof/history UI for a later gated addendum

### Rejected Alternatives

#### Alternative A - New dedicated action console

Rejected because it would create a second frontend authority for the same readiness domain and silently expand the product surface beyond the plan.

#### Alternative B - Wait for all backend truthfulness work before any frontend runtime changes

Rejected because the successor plan explicitly requires the concrete action to be executable from the page in `Phase 1`.

#### Alternative C - Build the future `Phase 2` probe/history shell now and hide parts of it

Rejected because the plan forbids autopiloting into `Phase 2`. Hidden speculative UI is still premature scope.

## Phase 1 Frontend Design

### 1. Operational Readiness Action Execution

The current readiness page should remain the single mounted operator surface.

Design changes:

1. Add a client-side action execution helper in `operationalReadiness` data access code for `POST /admin/runtime/storage/browser-upload-cors/reconcile`.
2. Extend `useOperationalReadiness.ts` with a mutation path that:
   - starts an in-flight action state keyed by `action_kind` and `check_id`
   - posts `{ "confirmed": true }`
   - stores the returned action result payload for transient operator feedback
   - triggers a refresh of the readiness snapshot after success
   - surfaces a clear error message after failure
3. Pass action execution state and action handlers from the page into `OperationalReadinessCheckGrid.tsx`.
4. Render the concrete action as a real button only when `action_kind === "storage_browser_upload_cors_reconcile"`.
5. Disable the button while the action is in flight and show a deterministic pending label.

### 2. Operational Readiness Truthfulness Rules

The frontend must mirror the frozen seam contract exactly.

Rules:

1. `blockdata.storage.bucket_cors` may render as a backend-executable action.
2. `blockdata.storage.bucket_config` and `blockdata.storage.signed_url_signing` must not visually imply backend-owned remediation in `Phase 1`.
3. Checks with `actionability` of `info_only`, `external_change`, or `backend_probe` must present guidance as explanation, not as a CTA.
4. Verification guidance may remain visible, but it must read as follow-up inspection, not hidden proof or history.
5. The page copy should clarify that a successful action updates one real backend-owned seam and that the rest of the surface may still require external configuration changes.

### 3. Telemetry Status Page

`ObservabilityTelemetry.tsx` should be converted from placeholder copy into an honest status page backed by the existing route.

Design:

1. Fetch `GET /observability/telemetry-status` on mount.
2. Present the returned fields in compact status groups:
   - telemetry enabled state
   - exporter endpoint and protocol
   - sampler configuration
   - logs/metrics enabled state
   - Signoz and Jaeger links when present
3. Add explicit explanatory copy:
   - what this page proves: current backend telemetry configuration visibility
   - what this page does not prove: successful collector ingestion, sink delivery, or trace completeness
4. Use warning styling when telemetry is disabled or partially configured, but do not claim failure of downstream export unless the backend route actually reports that signal.

### 4. Telemetry Page Interaction Contract

The page should remain read-only in `Phase 1`.

It must not include:

1. manual export probes
2. collector test buttons
3. sink-query verification
4. trace history panels

Those belong only to a later `Phase 2` decision if the revalidation gate says they are still justified.

## Phase 1 Component-Level Design

### `SuperuserOperationalReadiness.tsx`

Responsibilities:

1. own refresh lifecycle
2. own action execution and toast/banner feedback
3. keep the summary and grid synchronized after action completion
4. remain the only mounted readiness page

### `useOperationalReadiness.ts`

Responsibilities:

1. continue snapshot bootstrap and refresh behavior
2. add action mutation state without introducing a second source of truth
3. avoid hidden caching that could leave the UI stale after action completion

### `OperationalReadinessCheckGrid.tsx`

Responsibilities:

1. remain a pure view over the normalized readiness contract plus passed-in action handlers
2. render one real CTA for the bucket CORS check
3. preserve existing evidence, verification, and next-step sections
4. keep non-actionable checks explanation-first

### `ObservabilityTelemetry.tsx`

Responsibilities:

1. become the mounted frontend truth surface for telemetry configuration
2. clearly distinguish visibility from proof
3. provide empty, loading, success, and error states without inventing backend semantics

## Error Handling

### Readiness Action Errors

If the CORS reconcile call fails:

1. show a localized error state near the action surface or page header
2. do not optimistically mutate the readiness snapshot
3. leave the prior snapshot visible until refresh is explicitly re-run or automatically retried after the failure path resolves
4. preserve the backend error detail only if it is already safe and operator-appropriate to display

### Telemetry Page Errors

If the telemetry status fetch fails:

1. show a page-level error block
2. do not replace it with fake status cards
3. explain that telemetry status could not be loaded, not that telemetry itself is definitively broken

## Testing Design

### Phase 1 Frontend Tests

Add or update:

1. `web\src\components\superuser\OperationalReadinessCheckGrid.test.tsx`
2. `web\src\pages\superuser\SuperuserOperationalReadiness.test.tsx`
3. `web\src\pages\ObservabilityTelemetry.test.tsx`

Required assertions:

1. the bucket CORS check renders a real action button when actionable
2. the action button enters a pending state during execution
3. a successful action triggers a snapshot refresh and truthful post-action rendering
4. non-actionable checks do not render backend-remediation CTAs
5. the telemetry page renders config/status data from the backend route
6. the telemetry page explicitly states that it is configuration visibility, not export proof

## What This Design Deliberately Does Not Do

1. It does not open `Phase 2` pipeline proof UI early.
2. It does not add readiness detail pages, history pages, or persisted run views.
3. It does not redesign AGChain information architecture beyond what `Phase 3` explicitly allows.
4. It does not create a second telemetry or readiness route.

## Exit Criteria For This Design

This frontend initiation design is complete when:

1. the remaining `Phase 1` frontend work is concrete enough to implement without inventing new product scope
2. the `Phase 2` and `Phase 3` hold-lines are explicit
3. the implementation can be audited directly against the April 7 successor plan's acceptance contract

## Immediate Follow-On

After approval of this design, the next implementation planning session should produce a narrow frontend execution plan covering:

1. readiness action mutation wiring
2. readiness truthfulness copy/state adjustments
3. telemetry status page replacement
4. focused frontend verification for those surfaces only
