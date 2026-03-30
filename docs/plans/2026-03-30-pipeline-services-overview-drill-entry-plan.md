# Pipeline Services Overview Drill Entry Implementation Plan

**Goal:** Make the Pipeline Services side-rail drill explicitly include an `Overview` child so the navigation model matches the now-separate overview page at `/app/pipeline-services`.

**Architecture:** Keep the already-landed split between the Pipeline Services overview page and the dedicated Index Builder page. Amend only the shell drill contract so `Pipeline Services` exposes three second-level entries: `Overview`, `Knowledge Bases`, and `Index Builder`. Reuse the existing overview route, page, and data-loading seam unchanged; this is a shell-navigation identity correction, not a backend or routing redesign.

**Tech Stack:** React, TypeScript, React Router, existing shell nav config, Vitest, Testing Library.

**Status:** Draft
**Author:** Codex for jwchu
**Date:** 2026-03-30

## Manifest

### Platform API

No platform API changes.

Verified zero-case:
- The overview page already exists at `/app/pipeline-services` and already loads through the current frontend seam in `web/src/pages/usePipelineServicesOverview.ts`.
- Adding an explicit `Overview` drill child changes only shell navigation metadata and tests; no request, response, auth, or touched-table contract changes are required.

### Observability

No observability changes.

Verified zero-case:
- No new runtime path is being created.
- No platform-api route, worker stage, or browser-to-backend flow changes in this amendment.
- Existing frontend verification is sufficient because the change is limited to drill-item identity and route highlighting.

### Database Migrations

No database migrations.

Verified zero-case:
- No persistence model changes are needed.
- The overview route, knowledge-bases route, and index-builder route already exist and do not require new stored state.

### Edge Functions

No edge functions created or modified.

Verified zero-case:
- The change does not touch Supabase functions or any hosted runtime seam.

### Frontend Surface Area

**New pages:** `0`

**New components:** `0`

**New hooks/services:** `0`

**Modified files:** `4`

- `web/src/components/shell/nav-config.ts` — add `Overview` as an explicit child under the Pipeline Services drill, targeting `/app/pipeline-services`
- `web/src/components/shell/nav-config.test.ts` — assert the drill children now include `Overview`, `Knowledge Bases`, and `Index Builder`
- `web/src/components/shell/LeftRailShadcn.test.tsx` — verify pipeline-view drill rendering on `/app/pipeline-services` shows and highlights `Overview`
- `web/src/components/common/useShellHeaderTitle.test.tsx` — verify breadcrumb/title behavior still resolves `Pipeline Services` correctly when the drill now contains an explicit `Overview` child

## Pre-Implementation Contract

No major routing, backend, or workbench decision may be improvised during implementation. This plan only amends the shell drill contract so the second-level menu reflects the already-existing overview page.

### Locked Product Decisions

1. `/app/pipeline-services` remains the real overview page and remains the route target for the new `Overview` drill item.
2. `Knowledge Bases` remains at `/app/pipeline-services/knowledge-bases`.
3. `Index Builder` remains at `/app/pipeline-services/index-builder`.
4. No new top-level route is introduced.
5. No backend/frontend data-loading seam is replaced; `usePipelineServicesOverview.ts` remains the overview source of truth.

### Locked Acceptance Contract

1. In the side rail drill for `Pipeline Services`, the user sees `Overview`, `Knowledge Bases`, and `Index Builder`.
2. Clicking `Overview` navigates to `/app/pipeline-services`.
3. On `/app/pipeline-services`, the drill highlights `Overview`.
4. On `/app/pipeline-services/knowledge-bases`, the drill highlights `Knowledge Bases`.
5. On `/app/pipeline-services/index-builder`, the drill highlights `Index Builder`.
6. The overview page content and Index Builder page content remain unchanged apart from the corrected drill identity.

### Locked Platform API Surface

#### New platform API endpoints: `0`

#### Modified platform API endpoints: `0`

#### Existing platform API endpoints reused as-is: `1`

1. `GET /pipelines/definitions` — reused indirectly by the already-existing overview seam with no contract change

### Locked Inventory Counts

#### Backend

- New platform-api files: `0`
- Modified platform-api files: `0`
- New migrations: `0`
- Modified migrations: `0`
- New edge functions: `0`
- Modified edge functions: `0`

#### Frontend

- New files: `0`
- Modified files: `4`

#### Tests

- New test modules: `0`
- Modified test modules: `3`

### Locked File Inventory

#### New files

- None

#### Modified files

- `web/src/components/shell/nav-config.ts`
- `web/src/components/shell/nav-config.test.ts`
- `web/src/components/shell/LeftRailShadcn.test.tsx`
- `web/src/components/common/useShellHeaderTitle.test.tsx`

## Frozen Compatibility Contract

The existing Pipeline Services route split is already correct and must not be reworked in this amendment:

- `/app/pipeline-services` stays overview-only
- `/app/pipeline-services/index-builder` stays the dedicated service page
- unknown `:serviceSlug` handling stays unchanged
- all source-set, upload, job, and deliverable frontend/backend seams stay unchanged

Do not reintroduce a generic `Service Overview` page or shared workbench model while implementing this drill amendment.

## Explicit Risks Accepted In This Plan

1. The top-level `Pipeline Services` item and the child `Overview` item will target the same route. That duplication is intentional because the product now treats the overview as a real page and the drill should reflect that fact explicitly.
2. Existing tests that assumed only two Pipeline Services drill children will need to be updated.

## Completion Criteria

1. The Pipeline Services drill explicitly lists `Overview`, `Knowledge Bases`, and `Index Builder`.
2. `/app/pipeline-services` is reachable from both the top-level `Pipeline Services` entry and the `Overview` drill entry.
3. Route highlighting is correct for all three drill children.
4. No platform-api, observability, database, or edge-function files were added or modified.
5. The modified frontend test slice passes.

## Task 1: Add the explicit Overview drill child

**File(s):** `web/src/components/shell/nav-config.ts`

**Step 1:** Add a new Pipeline Services drill item labeled `Overview` with path `/app/pipeline-services`.
**Step 2:** Keep `Knowledge Bases` and `Index Builder` as sibling drill items under the same parent section.
**Step 3:** Preserve the top-level `Pipeline Services` parent item and all existing route paths.

**Test command:** `cd web && npm run test -- --run src/components/shell/nav-config.test.ts`
**Expected output:** the nav-config slice passes with the updated drill contract.

**Commit:** `plan: add overview child to pipeline services drill`

## Task 2: Update shell tests for overview highlighting

**File(s):** `web/src/components/shell/LeftRailShadcn.test.tsx`, `web/src/components/common/useShellHeaderTitle.test.tsx`

**Step 1:** Add or update a pipeline-view shell test so `/app/pipeline-services` renders the Pipeline Services drill with `Overview` visible and active.
**Step 2:** Keep the existing `Knowledge Bases` and `Index Builder` route assertions intact.
**Step 3:** Update header-title assertions only if the explicit `Overview` drill child affects breadcrumb resolution.

**Test command:** `cd web && npm run test -- --run src/components/shell/LeftRailShadcn.test.tsx src/components/common/useShellHeaderTitle.test.tsx`
**Expected output:** both shell test modules pass without changing any backend-facing behavior.

**Commit:** `test: cover pipeline services overview drill entry`

## Task 3: Run the targeted regression slice

**File(s):** `web/src/components/shell/nav-config.test.ts`, `web/src/components/shell/LeftRailShadcn.test.tsx`, `web/src/components/common/useShellHeaderTitle.test.tsx`, `web/src/pages/PipelineServicesPage.test.tsx`, `web/src/pages/IndexBuilderPage.test.tsx`

**Step 1:** Run the focused pipeline/nav regression slice after the drill change.
**Step 2:** Confirm overview route behavior is unchanged and Index Builder route behavior is unchanged.
**Step 3:** Record the passing result as implementation evidence.

**Test command:** `cd web && npm run test -- --run src/components/shell/nav-config.test.ts src/components/shell/LeftRailShadcn.test.tsx src/components/common/useShellHeaderTitle.test.tsx src/pages/PipelineServicesPage.test.tsx src/pages/IndexBuilderPage.test.tsx`
**Expected output:** all listed modules pass.

**Commit:** `test: verify pipeline services overview drill regression slice`
