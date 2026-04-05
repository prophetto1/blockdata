# Plan Tracker Phase 2 Persistent Scaffold Implementation Note

**Date:** 2026-04-04  
**Route:** `/app/superuser/plan-tracker`

## Scope Executed

Phase 2 of the frontend structural design pass was implemented in the live tracker UI.

The goal was to keep the plan tracker's product identity visible before selection or filesystem data is present. This pass did not change backend/API/database/edge-function scope or the approved lifecycle/artifact/metadata contracts.

## Implemented Changes

### Persistent document scaffold

- Added `web/src/pages/superuser/PlanDocumentPane.tsx`
- The center pane now always renders as a document workspace
- The workspace keeps a visible:
  - header
  - artifact/status strip
  - save affordance
  - mode-control cluster
  - editor frame / placeholder frame

### Persistent metadata/workflow scaffold

- Updated `web/src/pages/superuser/PlanMetadataPane.tsx`
- The right pane now stays mounted even when no plan or artifact is selected
- The pane now always shows:
  - `Summary`
  - `Classification`
  - `Timeline`
  - `Workflow Actions`
  - `Notes / Action Composer`
  - `Related Artifacts`
- Added visible scaffold rows for:
  - owner
  - reviewer
  - tags
  - notes
- Added disabled placeholder workflow buttons for no-selection mode

### Persistent navigator scaffold

- Updated `web/src/pages/superuser/PlanStateNavigator.tsx`
- The left pane now keeps lifecycle tabs and navigator structure visible before directory selection
- Added in-pane loading / empty / open-directory treatment instead of replacing the entire pane

### Hook composition changes

- Updated `web/src/pages/superuser/usePlanTracker.tsx`
- The hook now renders the left, center, and right pane scaffolds persistently
- The old bare fallbacks:
  - `No artifact selected.`
  - `No metadata available.`
  no longer replace the entire center/right panes

## Files Changed

- `E:\writing-system\web\src\pages\superuser\usePlanTracker.tsx`
- `E:\writing-system\web\src\pages\superuser\PlanMetadataPane.tsx`
- `E:\writing-system\web\src\pages\superuser\PlanStateNavigator.tsx`
- `E:\writing-system\web\src\pages\superuser\PlanDocumentPane.tsx`
- `E:\writing-system\web\src\pages\superuser\usePlanTracker.test.tsx`

## Verification

Focused tests passed:

- `src/pages/superuser/usePlanTracker.test.tsx`
- `src/pages/superuser/PlanTracker.test.tsx`
- `src/pages/superuser/PlanStateNavigator.test.tsx`

Focused ESLint passed on:

- `src/pages/superuser/usePlanTracker.tsx`
- `src/pages/superuser/PlanMetadataPane.tsx`
- `src/pages/superuser/PlanStateNavigator.tsx`
- `src/pages/superuser/PlanDocumentPane.tsx`
- `src/pages/superuser/usePlanTracker.test.tsx`

## Current Boundary

This pass locks the persistent scaffold and placeholder-mode composition.

It does **not** expand into:

- new backend/API work
- database work
- edge functions
- workflow-contract changes

Phase 4 visual verification via Playwright is still the next structural validation step if requested.

