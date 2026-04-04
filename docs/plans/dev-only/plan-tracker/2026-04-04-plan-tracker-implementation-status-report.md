# Plan Tracker Implementation Status Report

**Date:** 2026-04-04
**Author:** Codex
**Status:** Partial implementation complete; frontend visual contract still needs correction
**Primary Reference Plan:** `docs/plans/dev-docs-site/2026-04-03-plan-tracker-workbench-implementation-plan.md`

## Goal

Record what has actually been implemented for the plan tracker so far, using the same implementation categories that the `investigating-and-writing-plan` skill uses to lock execution scope. This report is a status artifact, not a new implementation plan.

## Source Documents

- `docs/plans/dev-docs-site/2026-04-03-plan-tracker-workbench-implementation-plan.md`
- `docs/plans/dev-docs-site/2026-04-03-plan-tracker-workbench-plan.md`
- `docs/plans/dev-docs-site/requirements-0403`

## Current Status Summary

The current implementation covers the browser-local plan tracker model, the dedicated superuser route, the filesystem-backed orchestration hook, the workflow actions, and the route/nav integration. The shell works functionally, but the current frontend presentation is not acceptable yet. The page is mounted, the empty-state shell is real, the file-loading path is real, and the workflow actions are implemented, but the visual contract agreed from the reference mock was not carried through strongly enough.

## Manifest Status

### Platform API

No platform API work was implemented.

Background:

- No endpoints were added.
- No endpoints were modified.
- No platform-api route modules were touched.
- The tracker remains browser-local and uses the File System Access API through existing frontend utilities only.

### Observability

No observability work was implemented.

Background:

- No traces were added.
- No metrics were added.
- No structured backend logs were added.
- Error handling remains local to the browser workbench surface.

### Database Migrations

No database migrations were implemented.

Background:

- No Supabase migrations were added.
- No tables, views, RPCs, or schema changes were introduced.
- The system of record remains local Markdown files under `docs/plans/**`.

### Edge Functions

No edge-function work was implemented.

Background:

- No functions were added.
- No existing functions were modified.
- No server-side review or persistence workflow was introduced in this phase.

### Frontend Surface Area

This is where all implemented work landed.

What was implemented:

- dedicated route mount at `/app/superuser/plan-tracker`
- plan/artifact metadata model and grouping heuristics
- filesystem-backed hook for reading and writing plan documents
- workflow action handlers for reject, approve, revision, implementation note, and verification note
- plan/artifact rails
- document editor surface wiring
- metadata/action pane wiring
- superuser navigation entry

What is still not complete:

- the visual shell does not yet meet the agreed frontend reference quality
- the empty state is functional but visually raw
- the invariant rail structure needs a design correction pass

## Files Created And Modified

### New Files Created

- `web/src/pages/superuser/PlanArtifactsRail.tsx`
- `web/src/pages/superuser/PlanDocumentPreview.tsx`
- `web/src/pages/superuser/PlanMetadataPane.tsx`
- `web/src/pages/superuser/PlanTracker.test.tsx`
- `web/src/pages/superuser/PlanTracker.tsx`
- `web/src/pages/superuser/PlanUnitsRail.tsx`
- `web/src/pages/superuser/planTrackerModel.test.ts`
- `web/src/pages/superuser/planTrackerModel.ts`
- `web/src/pages/superuser/usePlanTracker.test.tsx`
- `web/src/pages/superuser/usePlanTracker.tsx`

### Existing Files Modified

- `web/src/router.tsx`
- `web/src/components/admin/AdminLeftNav.tsx`

## What Was Implemented

### Metadata And Grouping Model

Implemented in `web/src/pages/superuser/planTrackerModel.ts`.

This work added:

- frontmatter parsing and serialization
- metadata normalization helpers
- plan grouping by `planId`
- heuristic fallback for legacy filenames
- deterministic artifact filename generation
- plan revision/version helpers
- workflow artifact naming and status helpers

### Hook And Filesystem Orchestration

Implemented in `web/src/pages/superuser/usePlanTracker.tsx`.

This work added:

- local directory selection and handle restore
- recursive Markdown discovery under the selected plans directory
- transformation from raw files into grouped plan units and artifacts
- document selection state
- dirty-state tracking
- save behavior
- action gating with `Save`, `Discard`, and `Cancel`
- action-backed artifact creation and plan metadata updates

### Route And Navigation

Implemented in:

- `web/src/pages/superuser/PlanTracker.tsx`
- `web/src/router.tsx`
- `web/src/components/admin/AdminLeftNav.tsx`

This work added:

- dedicated superuser route
- dedicated page mount
- superuser navigation entry for the tracker

### Presentational Surfaces

Implemented in:

- `web/src/pages/superuser/PlanUnitsRail.tsx`
- `web/src/pages/superuser/PlanArtifactsRail.tsx`
- `web/src/pages/superuser/PlanMetadataPane.tsx`
- `web/src/pages/superuser/PlanDocumentPreview.tsx`

This work added:

- primary plan rail
- secondary artifact rail
- metadata/action pane
- local Markdown preview panel

## Verification Evidence

Verified passing:

- `cd web && npm run test -- src/pages/superuser/planTrackerModel.test.ts src/pages/superuser/usePlanTracker.test.tsx src/pages/superuser/PlanTracker.test.tsx`
- targeted ESLint on the touched plan-tracker files

Verified with caveat:

- the exact workspace-wide `cd web && npm run lint` command does not pass, but the failures are outside the plan-tracker slice and were not introduced by this implementation

Manual verification already performed:

- the dedicated route mounts
- the four-pane empty state renders
- the superuser nav item appears

Manual verification still worth doing:

- open the real `docs/plans` directory through the browser picker
- select real plans and artifacts
- create at least one real supplementary artifact through the UI

## Frontend Intent

The intended frontend was not supposed to be a blank generic workbench. The intent was:

- preserve the four-pane structure from the approved reference
- keep the structural shell stable before data loads
- make the first pane a clear onboarding point into the tracker
- keep the plans rail, artifacts rail, document pane, and metadata/action pane visibly structured at all times
- treat the reference mock as the shell contract, not only as a rough topology diagram

What actually happened:

- the implementation carried forward the four-pane shape
- the logic and actions were wired
- but the invariant visual shell remained too generic and too empty

That mismatch is the main frontend defect now.

## Frontend Files That Need Modification For The Next Frontend Pass

### Must Modify

- `web/src/pages/superuser/PlanTracker.tsx`
  - overall shell framing and page-level presentation
- `web/src/pages/superuser/usePlanTracker.tsx`
  - empty-state rendering contract and pane-level content decisions
- `web/src/pages/superuser/PlanUnitsRail.tsx`
  - primary rail structure, grouping hierarchy, and empty/loading treatment
- `web/src/pages/superuser/PlanArtifactsRail.tsx`
  - artifact rail structure, labels, hierarchy, and empty treatment
- `web/src/pages/superuser/PlanMetadataPane.tsx`
  - metadata hierarchy, action priority, gating UI, and panel design
- `web/src/pages/superuser/PlanDocumentPreview.tsx`
  - preview presentation so the center pane matches the tracker shell

### Likely Modify

- `web/src/pages/superuser/MdxEditorSurface.tsx`
  - if the editor chrome needs to visually integrate with the tracker shell rather than appearing dropped in

### Optional Depending On Desired Depth

- `web/src/components/workbench/Workbench.tsx`
  - only if the generic workbench chrome itself needs stronger plan-tracker-specific panel treatment that cannot be achieved cleanly from the page-level surfaces

## Recommended Frontend Correction Scope

The next frontend pass should focus on:

- stable four-pane shell that looks intentional before data loads
- stronger empty-state design in the first pane
- visible structured headers and panel identity in every pane
- better hierarchy between plans, artifacts, document, and metadata/actions
- stronger correspondence to the approved reference mock

The next frontend pass should not change:

- route placement
- browser-local data model
- artifact-backed action semantics
- dirty-action gating behavior

## Bottom Line

Backend-style surfaces are still zero in this phase. The real work that landed is all frontend and browser-local orchestration. The tracker is functionally real, but the frontend is only partially successful: the behavior and route wiring are in place, while the visual contract still needs a correction pass in the files listed above.
