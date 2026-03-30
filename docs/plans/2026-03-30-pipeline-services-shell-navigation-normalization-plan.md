# Pipeline Services Shell Navigation Normalization Implementation Plan

**Goal:** Remove the current navigation ambiguity in Pipeline Services by making `/app/pipeline-services` a plain overview page owned by the side-rail drill, and making `/app/pipeline-services/index-builder` a dedicated service page whose internal tabs describe Index Builder itself rather than a generic “Service Overview”.

**Architecture:** Keep the existing Pipeline Services shell drill exactly as the route-level navigation model: `Pipeline Services` owns the second-level entries `Knowledge Bases` and `Index Builder`. Split the current overloaded `PipelineServicesPage` into two route surfaces. The overview route at `/app/pipeline-services` renders overview content directly with no workbench container. The Index Builder route at `/app/pipeline-services/index-builder` renders a service-local workbench with fixed tabs whose identities are stable and service-specific. Reuse the already-built source-set/job/upload panels and current platform API contracts unchanged; this is a frontend routing, composition, and navigation-identity correction, not a backend feature expansion.

**Tech Stack:** React, TypeScript, React Router, existing Workbench component, Vitest, Testing Library.

**Status:** Draft
**Author:** Codex for jwchu
**Date:** 2026-03-30

## Manifest

### Platform API

Zero platform API route changes.

Existing pipeline, source-set, upload, job, and deliverable endpoints remain unchanged. The navigation defect is entirely in the frontend route/page composition layer, so this plan does not add, remove, or modify any FastAPI paths, request bodies, response bodies, auth rules, or worker behavior.

### Observability

Zero observability changes.

No new spans, metrics, or structured logs are required because this plan does not change backend execution seams or introduce a new async flow. Existing Index Builder telemetry remains in force.

### Database Migrations

Zero database migrations.

No schema, RPC, backfill, or storage-contract changes are needed. Source-set and job persistence remain as implemented.

### Edge Functions

Zero edge function changes.

### Frontend Surface Area

This plan modifies only the Pipeline Services route shell, page composition, and associated tests.

#### New frontend files: `4`

- `web/src/pages/IndexBuilderPage.tsx` — dedicated page component for the Index Builder route
- `web/src/pages/useIndexBuilderWorkbench.tsx` — extracted service-local workbench hook with fixed Index Builder tab identities
- `web/src/pages/usePipelineServicesOverview.ts` — overview-only data/loading hook that resolves service cards for the overview route
- `web/src/pages/IndexBuilderPage.test.tsx` — route-level and interaction tests for the dedicated Index Builder page

#### Modified frontend files: `8`

- `web/src/router.tsx` — route split between overview and dedicated Index Builder page, plus explicit unknown-service handling
- `web/src/pages/PipelineServicesPage.tsx` — overview-only page with no workbench container
- `web/src/components/pipelines/PipelineCatalogPanel.tsx` — overview copy and CTA alignment for the non-workbench overview route
- `web/src/components/pipelines/PipelineCatalogPanel.test.tsx` — overview-card assertions after the route split
- `web/src/pages/PipelineServicesPage.test.tsx` — overview-only assertions after the route split
- `web/src/components/shell/LeftRailShadcn.test.tsx` — verify drill behavior stays consistent between overview and Index Builder routes
- `web/src/components/shell/nav-config.test.ts` — assert route/nav alignment still holds after the route split
- `web/src/components/common/useShellHeaderTitle.test.tsx` — breadcrumb/title expectations for overview vs Index Builder detail

#### Removed frontend files: `1`

- `web/src/pages/usePipelineServicesWorkbench.tsx` — replaced by the dedicated Index Builder workbench hook so overview and detail responsibilities are no longer co-mingled

## Pre-Implementation Contract

### Locked Product Decisions

- `/app/pipeline-services` is the Pipeline Services overview page and must not render a Workbench container.
- The left-rail `Pipeline Services` drill remains the only route-level second-level navigation for this surface.
- `/app/pipeline-services/index-builder` is a dedicated service detail route, not a generic “service overview” route.
- The labels `Services` and `Service Overview` are removed from the Pipeline Services page chrome.
- The Index Builder page gets its own service-local tabs. The first tab is `Index Builder`. The second tab is `Runs & Downloads`.
- Triggering a run from the Index Builder page auto-activates `Runs & Downloads` so the user lands on canonical progress and deliverables immediately after starting a job.
- `Knowledge Bases` remains a sibling route under the Pipeline Services drill and is not folded into the Index Builder workbench.
- Unknown `/app/pipeline-services/:serviceSlug` values redirect to `/app/pipeline-services` with `replace`, rather than rendering a mislabeled generic detail page.

### Locked Frontend Design Contract

- The overview page renders overview content directly in the page body using the shell and drill navigation only.
- The overview page contains the current service catalog content and CTA cards, but no internal workbench tabs.
- The overview page uses an explicit overview-only loading seam that fetches `/pipelines/definitions`, merges definition data with the static Pipeline Services catalog metadata, and passes `services`, `loading`, and `error` into `PipelineCatalogPanel`.
- The Index Builder page renders inside the existing full-bleed shell treatment for Pipeline Services routes.
- The Index Builder workbench stays single-pane, locked-layout, and non-draggable.
- The prior source-set plan's three functional phases remain intact, but this plan intentionally redistributes them across two service-local tabs instead of one undivided page.
- `Index Builder` tab content owns input-oriented tasks:
  - upload markdown sources
  - show uploaded markdown inventory
  - manage the processing set
  - expose the primary “Run” action
- `Runs & Downloads` tab content owns execution-output tasks:
  - a pinned source-set context summary showing the active source-set name, member count, and compact member context
  - latest job stage/status
  - progress and stage checklist
  - deliverable availability and downloads
- The active source-set context remains visible while processing and after completion; the progress view must not replace the entire tab with a blank loading state.
- The detail page tab labels must match the selected service identity. A user entering from the side rail on `Index Builder` must never see a generic `Service Overview` label.

### Locked Routing And Shell Contract

- `web/src/router.tsx` must explicitly route `/app/pipeline-services` to the overview page and `/app/pipeline-services/index-builder` to the dedicated Index Builder page.
- The legacy redirects `/app/rag` and `/app/rag/:serviceSlug` remain in place and continue targeting canonical Pipeline Services routes.
- The left rail continues to expose `Pipeline Services` as the parent drill with `Knowledge Bases` and `Index Builder` children.
- Shell header expectations:
  - overview route: `Pipeline Services`
  - Index Builder route: `Pipeline Services > Index Builder`
- Workbench persisted state for the dedicated Index Builder page must use a new save key version so old `pipeline-services-catalog` / `pipeline-services-overview` tab ids cannot resurrect stale layout state after deployment.

### Locked Backend Compatibility Contract

- All current source-set, upload, job, and deliverable frontend service calls remain unchanged.
- No backend compatibility shims are introduced just to preserve the old `Service Overview` tab model.
- Existing tests for source-set execution, upload reservations, and job polling remain part of the regression surface and must continue to pass.

## Explicit Supersession Of Prior Frontend Contract

This plan intentionally replaces the old page-shell contract in `docs/plans/2026-03-30-pipeline-services-multi-markdown-source-sets-recovery-plan.md` for the Pipeline Services frontend only.

It explicitly supersedes these prior sections:

- `### Locked Frontend Design Contract`
- `### Locked Frontend Stage Tracker Contract`
- the frontend presentation portions of `### Locked Acceptance Contract`
- the frontend-shell portions of `## Task 1`, `## Task 6`, and `## Task 7`

The supersession is narrow:

- the prior plan remains authoritative for upload, source-set, job, deliverable, storage, worker, database, and observability contracts
- this normalization plan replaces only the route identity, page composition, tab identity, and presentation-layer organization of the Index Builder experience

## Frozen Compatibility Contract

- The multi-markdown source-set plan at `docs/plans/2026-03-30-pipeline-services-multi-markdown-source-sets-recovery-plan.md` remains the functional contract for Index Builder upload, source-set management, execution, and deliverables.
- This normalization plan supersedes the prior same-page three-phase presentation requirement and replaces it with a two-tab service-local presentation, while preserving the underlying upload, processing, and deliverable behavior.
- `PipelineCatalogPanel` remains the entry surface for discovering/opening services, but only on the overview route.

## Explicit Risks Accepted In This Plan

- Splitting overview and detail routes may break tests that currently assume one shared `PipelineServicesPage` serves both surfaces. The plan accepts this and updates those tests explicitly rather than preserving the overloaded page abstraction.
- Removing the old shared workbench save key can drop any locally persisted pane state for Pipeline Services. This is acceptable because the old persisted state encodes invalid tab identities.
- The product still contains another unrelated `Services` label under marketplace/connections. This plan does not rename that surface; it only removes the conflicting page-internal `Services` tab inside Pipeline Services.

## Completion Criteria

- Visiting `/app/pipeline-services` shows overview content with no workbench tabs visible.
- Visiting `/app/pipeline-services/index-builder` shows a dedicated Index Builder page whose chrome and tab labels refer to `Index Builder`, not `Service Overview`.
- The left rail drill remains the route-level navigation source of truth for `Pipeline Services`, `Knowledge Bases`, and `Index Builder`.
- Clicking `Index Builder` from the overview page or the side rail lands on the same dedicated Index Builder route and page.
- The overview route still loads pipeline definitions correctly and renders resolved service cards through an overview-only loading seam.
- The `Runs & Downloads` tab keeps active source-set context visible while the latest job is queued, running, complete, or failed.
- Index Builder upload, source-set persistence, job trigger, progress polling, and deliverable download behavior remain functional.
- Triggering a run from the `Index Builder` tab activates the `Runs & Downloads` tab automatically.
- Seeding legacy `pipeline-services-catalog` / `pipeline-services-overview` workbench state in localStorage does not resurrect the old tab model after deployment.
- No user-visible `Services` or `Service Overview` workbench tabs remain on the Pipeline Services overview route.

## Task 1: Split the overview route from the service-detail route

- Change `web/src/router.tsx` so `/app/pipeline-services` renders the overview page and `/app/pipeline-services/index-builder` renders a dedicated detail page.
- Preserve `/app/pipeline-services/knowledge-bases` and the legacy `/app/rag*` redirects exactly as they work now.
- Add explicit unknown-slug handling so unsupported `:serviceSlug` values redirect back to overview instead of entering a generic detail shell.
- Rework `web/src/pages/PipelineServicesPage.tsx` into an overview-only page with no Workbench wrapper.
- Add `web/src/pages/usePipelineServicesOverview.ts` as the dedicated overview seam that:
  - fetches `/pipelines/definitions`
  - merges API definitions with the static Pipeline Services catalog metadata
  - exposes `services`, `loading`, and `error` to the overview page
  - sets the shell title/breadcrumb contract for the overview route

## Task 2: Extract the Index Builder page into its own service-local workbench

- Move the detail-route workbench logic out of `usePipelineServicesWorkbench.tsx` into `web/src/pages/useIndexBuilderWorkbench.tsx`.
- Create `web/src/pages/IndexBuilderPage.tsx` to render the dedicated Index Builder workbench.
- Replace the generic `pipeline-services-catalog` / `pipeline-services-overview` tabs with fixed service-local tabs:
  - `index-builder-main`
  - `index-builder-runs-downloads`
- Bump the persisted workbench save key version so obsolete tab ids from the old page cannot be restored.

## Task 3: Recompose the existing Index Builder panels across the new tab model

- Keep the current upload, source inventory, processing-set, job-status, and deliverables components; do not redesign their internal data contracts.
- Place input-oriented panels on the `Index Builder` tab.
- Place job-stage and deliverable panels on the `Runs & Downloads` tab.
- Add a pinned source-set context summary at the top of `Runs & Downloads` so the active source set remains visible during processing and after completion.
- Make the primary Run action persist the source set, trigger the job, and then activate `Runs & Downloads`.
- Ensure the service detail page title, empty states, and headings all refer to `Index Builder`.

## Task 4: Align shell titles, nav tests, and page tests with the corrected information architecture

- Update breadcrumb/header expectations so overview is `Pipeline Services` and detail is `Pipeline Services > Index Builder`.
- Update or replace the existing `PipelineServicesPage.test.tsx` coverage so overview and detail routes are tested independently.
- Update `PipelineCatalogPanel.test.tsx` so the overview card surface remains covered after the route split.
- Add dedicated `IndexBuilderPage.test.tsx` coverage for:
  - direct route render
  - tab identity
  - upload flow continuity
  - source-set persistence before run
  - progress/download tab render
- Add stale-layout-state coverage by seeding legacy `pipeline-services-${pageKey}-v1` localStorage state and verifying the new overview/detail pages ignore the old `pipeline-services-catalog` / `pipeline-services-overview` tab ids.
- Update side-rail and nav-config tests so they verify route-level navigation consistency rather than the old shared-page behavior.

## Task 5: Run route-level and workflow regression verification

- Frontend verification:
  - `cd web && npm run test -- --run src/pages/PipelineServicesPage.test.tsx src/pages/IndexBuilderPage.test.tsx src/components/pipelines/PipelineCatalogPanel.test.tsx src/components/pipelines/PipelineUploadPanel.test.tsx src/components/pipelines/PipelineSourceFilesPanel.test.tsx src/components/pipelines/PipelineSourceSetPanel.test.tsx src/components/pipelines/PipelineJobStatusPanel.test.tsx src/components/pipelines/PipelineDeliverablesPanel.test.tsx src/components/shell/nav-config.test.ts src/components/shell/LeftRailShadcn.test.tsx src/components/common/useShellHeaderTitle.test.tsx src/lib/pipelineService.test.ts src/lib/storageUploadService.test.ts`
- Manual verification:
  - open `/app/pipeline-services` and confirm there are no internal workbench tabs
  - navigate to `Index Builder` from the side rail
  - navigate to `Index Builder` from the overview card
  - confirm both paths land on the same dedicated Index Builder page
  - trigger a run and confirm the page switches to `Runs & Downloads`
  - confirm the active source-set context remains visible while the run is in progress and after it completes
  - seed legacy `pipeline-services-${pageKey}-v1` localStorage layout state and confirm the old `Services` / `Service Overview` tabs do not reappear
  - upload markdown files, create or persist a source set, trigger a run, and download deliverables from the dedicated service page
