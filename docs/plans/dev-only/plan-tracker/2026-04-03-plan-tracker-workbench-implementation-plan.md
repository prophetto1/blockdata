# Plan Tracker Workbench Implementation Plan

**Goal:** Add a dedicated `/app/superuser/plan-tracker` React workbench that reads and writes `docs/plans/**`, groups plan units by status, shows attached artifacts in a second rail, edits Markdown/MDX in the center pane, and drives artifact-backed state changes from a metadata/action panel without taking over the existing generic `/app/workspace` surface.

**Architecture:** Keep the feature entirely inside `web` as a filesystem-backed React workbench. Reuse the existing File System Access API utilities, MDX editor surface, and multi-pane `Workbench`, but build the four-pane tracker UI as a custom fixture-driven surface first and only then wire it to plan metadata, local file reads, and artifact actions. Treat one primary left-rail row as one plan unit. Derive artifact relationships from explicit frontmatter when present and from filename heuristics only as a read-only fallback for legacy files. Every state transition created by the new workbench must also create or update a concrete Markdown artifact.

**Tech Stack:** React 19, TypeScript, existing `web` workbench shell, File System Access API, IndexedDB handle persistence, `@mdxeditor/editor`, `react-markdown`, `remark-frontmatter`, `remark-gfm`, `js-yaml`, Vitest, ESLint.

**Status:** Draft
**Author:** Codex
**Date:** 2026-04-03

## Source Documents

- `docs/plans/dev-docs-site/requirements-0403`
- `docs/plans/2026-03-28-crypto-kdf-migration-plan.md`
- `web/src/pages/Workspace.tsx`
- `web/src/pages/superuser/useWorkspaceEditor.tsx`
- `web/src/pages/superuser/WorkspaceFileTree.tsx`
- `web/src/pages/superuser/MdxEditorSurface.tsx`
- `web/src/components/workbench/Workbench.tsx`
- `web/src/lib/fs-access.ts`
- `web/src/components/documents/PreviewTabPanel.tsx`
- `web/src/components/admin/AdminLeftNav.tsx`
- `web/src/router.tsx`

## Verified Current State

- `web/src/pages/Workspace.tsx` already mounts a full-bleed generic workbench at `/app/workspace`.
- `web/src/router.tsx` already registers `/app/workspace`, but no dedicated `/app/superuser/plan-tracker` route exists yet.
- `web/src/components/admin/AdminLeftNav.tsx` already owns superuser navigation and does not yet expose a plan-tracker entry.
- `web/src/pages/superuser/useWorkspaceEditor.tsx` already owns a three-pane workbench built from a file tree, editor surface, and blank pane.
- `web/src/pages/superuser/WorkspaceFileTree.tsx` already supports directory picking, IndexedDB-backed handle restore, full tree rendering, drag/drop, create, rename, move, and delete.
- `web/src/lib/fs-access.ts` already supports recursive directory reads plus file read/write/create/move/delete operations against the File System Access API.
- `web/src/pages/superuser/MdxEditorSurface.tsx` already supports Markdown/MDX editing, diff mode, frontmatter editing, and Ctrl+S save handling.
- `web/src/components/workbench/Workbench.tsx` already supports multi-column panes, tab strips, split panes, and persisted layout state.
- `web/src/components/documents/PreviewTabPanel.tsx` already contains the repo’s Markdown preview stack (`react-markdown`, `remark-frontmatter`, `remark-gfm`) but is currently coupled to backend document locators instead of local file handles.
- `docs/plans/**` is not normalized today. The tree mixes flat root-level plan files, nested product-area folders, evaluation documents, reevaluation documents, status reports, and handoff notes. Relationship inference cannot rely on directory shape alone.
- The intent source in `requirements-0403` started as a Starlight/plugin exploration list, but the current product direction is a custom React workbench in `web`, not an Astro/Starlight surface.

## Manifest

### Platform API

No platform API changes.

The phase-1 workbench is browser-local and reads/writes local Markdown files through the File System Access API only. It does not add, modify, or consume any `services/platform-api` endpoints.

### Observability

No OpenTelemetry trace, metric, or structured-log changes in phase 1.

Justification:

- The phase-1 workbench introduces no new owned backend runtime seam.
- All reads, writes, and artifact creation happen in the browser against user-granted local file handles.
- Adding fake backend observability to a browser-only local workflow would be misleading.
- Browser error handling remains local: console errors, blocking prompts, and explicit UI error states in the workbench.

Allowed phase-1 local diagnostics:

- `console.error(...)` on failed file operations or parse failures.
- Inline rail/pane error copy for unreadable or malformed Markdown files.

Forbidden in phase 1:

- New platform-api spans
- New backend counters
- Structured logs pretending to audit local-only filesystem actions

### Database Migrations

No database migrations.

The system of record remains the local `docs/plans/**` Markdown tree. No Supabase tables, RPCs, or migrations are added or modified.

### Edge Functions

No edge functions created or modified.

This implementation stays entirely in the authenticated React app and local browser file APIs. If a later phase adds shared persistence or multi-user review state, that requires a separate plan.

### Frontend Surface Area

**New pages/routes:** `1`

The phase-1 POC mounts at a dedicated `/app/superuser/plan-tracker` route and preserves the existing `/app/workspace` route.

| Page | File | What changes |
|------|------|--------------|
| `PlanTracker` | `web/src/pages/superuser/PlanTracker.tsx` | New dedicated route surface that first renders a fixture-driven four-pane tracker shell, then swaps to the live plan-tracker hook during wiring |

**Modified pages:** `0`

**Modified routing files:** `1`

| File | What changes |
|------|--------------|
| `web/src/router.tsx` | Register the dedicated superuser plan-tracker route without changing `/app/workspace` |

**Modified navigation components:** `1`

| File | What changes |
|------|--------------|
| `web/src/components/admin/AdminLeftNav.tsx` | Add a superuser navigation entry for the new plan-tracker route |

**New hooks:** `1`

| Hook | File | Purpose |
|------|------|---------|
| `usePlanTracker` | `web/src/pages/superuser/usePlanTracker.tsx` | Owns plan scanning, metadata parsing, plan/artifact grouping, selected document state, save flows, and action-driven artifact creation |

**New utility modules:** `1`

| Module | File | Purpose |
|--------|------|---------|
| `planTrackerModel` | `web/src/pages/superuser/planTrackerModel.ts` | Parses and serializes frontmatter, derives plan identity and artifact relationships, applies filename fallback heuristics, and generates deterministic artifact filenames |

**New components:** `4`

| Component | File | Used by |
|-----------|------|---------|
| `PlanUnitsRail` | `web/src/pages/superuser/PlanUnitsRail.tsx` | `usePlanTracker` primary left rail |
| `PlanArtifactsRail` | `web/src/pages/superuser/PlanArtifactsRail.tsx` | `usePlanTracker` secondary left rail |
| `PlanMetadataPane` | `web/src/pages/superuser/PlanMetadataPane.tsx` | `usePlanTracker` right rail |
| `PlanDocumentPreview` | `web/src/pages/superuser/PlanDocumentPreview.tsx` | `usePlanTracker` center-pane read-only preview mode |

**New test modules:** `3`

| Test | File | Covers |
|------|------|--------|
| `planTrackerModel.test.ts` | `web/src/pages/superuser/planTrackerModel.test.ts` | Frontmatter parsing, grouping heuristics, artifact naming, state transition helpers |
| `usePlanTracker.test.tsx` | `web/src/pages/superuser/usePlanTracker.test.tsx` | Hook orchestration, rail selection, action flows, save/update behavior, and dirty-action gating |
| `PlanTracker.test.tsx` | `web/src/pages/superuser/PlanTracker.test.tsx` | Route-level wiring, rail rendering, and dedicated plan-tracker page shell behavior |

**Modified existing hooks/services:** `0`

Existing workbench primitives in `fs-access.ts`, `Workbench.tsx`, `WorkspaceFileTree.tsx`, and `MdxEditorSurface.tsx` are reused as-is in phase 1.

## Pre-Implementation Contract

No major product, file-identity, metadata, or lifecycle decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. The phase-1 POC lives at the dedicated `/app/superuser/plan-tracker` route. It does not start in `web-docs`, Astro, or Starlight, and it must not replace the existing generic `/app/workspace` surface.
2. The system of record is the local `docs/plans/**` Markdown tree selected by the user through the browser file picker.
3. One row in the primary left rail represents one plan unit, not one raw file.
4. The secondary left rail represents artifacts attached to the selected plan unit: plan revisions, evaluations, approvals, implementation notes, and verification notes.
5. The four-pane front-end surface is locked first in an unwired, fixture-driven state before plan scanning, file writes, or workflow actions are wired in.
6. The locked layout is four panes: primary plan rail, secondary artifact rail, center document surface, and right metadata/action pane.
7. The center pane is the active document surface. It supports editable Markdown/MDX through `MdxEditorSurface` and read-only rendered Markdown through a local preview component.
8. The right pane shows extracted metadata plus action buttons. It is not a passive inspector only; it owns workflow actions.
9. State changes are artifact-driven. A workflow action is not complete unless it writes a concrete artifact file and updates the selected plan’s metadata accordingly.
10. Creating a revision does not replace the selected plan unit. The selected plan unit remains stable by `planId`, while the active artifact switches to the newly created revision file.
11. If the active document has unsaved edits and the user triggers a workflow action, the tracker must block that action behind an explicit `Save`, `Discard`, or `Cancel` choice. No artifact creation or metadata mutation may occur until the save succeeds or the user explicitly discards those edits.
12. Existing files without tracker metadata must remain readable. The tracker may infer relationships for display, but it may not mass-rewrite the whole `docs/plans` tree on first open.
13. Files created or explicitly saved through the new tracker become normalized tracker files with explicit metadata fields.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. A user opens `/app/superuser/plan-tracker`, picks the repo’s `docs/plans` directory, and sees plan units grouped in the primary left rail.
2. Before live filesystem wiring is enabled, the dedicated route renders the locked four-pane shell with deterministic fixture data representing multiple plan states, artifact states, metadata states, and action affordances.
3. Selecting one plan unit populates a second left rail with that plan’s related artifacts, even when the current tree uses mixed flat and nested legacy filenames.
4. Selecting an artifact opens its Markdown body in the center pane, keeps the artifact rail separate from the editor surface, and shows metadata including at least `title`, `status`, `artifactType`, `version`, and identity fields in the right pane.
5. Editing a plan file and pressing save writes the updated Markdown back to disk through the existing File System Access API path.
6. If the active document is dirty and the user clicks a workflow action, the tracker presents `Save`, `Discard`, and `Cancel`. `Save` must persist the current document before action side effects occur, `Discard` must drop in-memory edits before continuing, and `Cancel` must leave both disk state and in-memory state unchanged.
7. Clicking `Reject with Notes` after resolving dirty-state gating creates a new evaluation artifact file, updates the current plan status to `rejected`, and refreshes both rails without re-picking the directory.
8. Clicking `Approve with Notes` after resolving dirty-state gating creates a new approval artifact file, updates the current plan status to `approved`, and refreshes both rails.
9. Clicking `Create Revision` after resolving dirty-state gating creates a new plan-version file with incremented version metadata, marks the previous version `superseded`, keeps the same plan unit selected by `planId`, and selects the new revision as the active artifact in the workbench.
10. The first explicit save or action against a legacy file that lacks required tracker metadata preserves that file’s existing filename, writes the minimum normalized metadata into that same file, and only then creates any new sibling artifact files with deterministic tracker-generated filenames.
11. No backend API, database, or edge-function changes are required for the phase-1 POC.

### Locked Platform API Surface

#### New platform API endpoints: `0`

#### Modified platform API endpoints: `0`

#### Existing platform API endpoints reused as-is: `0`

This implementation does not cross into `services/platform-api`.

### Locked Observability Surface

#### New traces: `0`

#### New metrics: `0`

#### New structured logs: `0`

Local-only browser diagnostics remain:

- inline UI error states in rails/panes
- `console.error(...)` for unexpected read/write/parse failures

No backend or OpenTelemetry surface is created in this phase.

### Locked Inventory Counts

#### Database

- New migrations: `0`
- Modified existing migrations: `0`

#### Backend

- New FastAPI route modules: `0`
- Modified existing FastAPI route modules: `0`
- New edge functions: `0`
- Modified edge functions: `0`

#### Frontend

- New routes/pages: `1`
- Modified existing pages: `0`
- Modified routing files: `1`
- Modified navigation components: `1`
- New hooks: `1`
- New utility modules: `1`
- New visual components: `4`
- Modified existing shared workbench primitives: `0`

#### Tests

- New test modules: `3`
- Modified existing test modules: `0`

### Locked File Inventory

#### New files

- `web/src/pages/superuser/PlanTracker.tsx`
- `web/src/pages/superuser/usePlanTracker.tsx`
- `web/src/pages/superuser/planTrackerModel.ts`
- `web/src/pages/superuser/PlanUnitsRail.tsx`
- `web/src/pages/superuser/PlanArtifactsRail.tsx`
- `web/src/pages/superuser/PlanMetadataPane.tsx`
- `web/src/pages/superuser/PlanDocumentPreview.tsx`
- `web/src/pages/superuser/planTrackerModel.test.ts`
- `web/src/pages/superuser/usePlanTracker.test.tsx`
- `web/src/pages/superuser/PlanTracker.test.tsx`

#### Modified files

- `web/src/router.tsx`
- `web/src/components/admin/AdminLeftNav.tsx`

## Frozen docs/plans Identity Contract

The tracker must preserve the current repository reality while still creating a sane forward path.

1. Directory shape is not the source of truth for artifact relationships.
2. Explicit tracker metadata is the source of truth when present.
3. Filename heuristics are a read-only fallback only for legacy files that do not yet contain explicit tracker metadata.
4. The first open of `docs/plans/**` must not rewrite unrelated files just to normalize metadata.
5. Existing legacy filenames must be preserved unless the user explicitly creates a new revision or supplementary artifact through the tracker.
6. The first tracker-managed save or workflow action against a legacy file that lacks required tracker metadata may normalize metadata in place, but it must preserve that file’s existing filename.
7. Any file created by an action button or saved after explicit tracker editing must include normalized tracker metadata.
8. Deterministic filenames for new artifacts are required:
   - revised plan: `<plan-stem>.v{N}.md`
   - evaluation: `<plan-stem>.v{N}.evaluation.{M}.md`
   - approval: `<plan-stem>.v{N}.approval.{M}.md`
   - implementation note: `<plan-stem>.v{N}.implementation.{M}.md`
   - verification note: `<plan-stem>.v{N}.verification.{M}.md`
9. Minimum normalized metadata written by the tracker:
   - `title`
   - `description`
   - `planId`
   - `artifactType`
   - `status`
   - `version`
   - `productArea`
   - `functionalArea`
   - `updatedAt`
10. Recommended optional metadata supported by the UI:
   - `priority`
   - `owner`
   - `trackerId`
   - `tags`
   - `relatedArtifacts`
   - `notes`

## Explicit Risks Accepted In This Plan

1. Legacy grouping will be imperfect until more files carry explicit `planId` and `artifactType` metadata. The fallback heuristics are for continuity, not perfect historical reconstruction.
2. The phase-1 POC is browser-local. There is no multi-user synchronization, server audit trail, or shared remote source of truth.
3. Action-created implementation artifacts are Markdown notes only in phase 1. They may reference commits, branches, or changed files in metadata, but the tracker does not yet ingest Git diffs automatically.
4. Browser support is limited to environments that support the File System Access API and persistent handle storage.

## Completion Criteria

The work is complete only when all of the following are true:

1. `/app/superuser/plan-tracker` renders the plan tracker while `/app/workspace` remains the existing generic workspace shell.
2. Before live filesystem wiring, the dedicated route has already been verified in an unwired fixture-driven state that matches the locked four-pane layout and interaction contract.
3. The tracker can open `docs/plans/**` through the existing directory picker and persist the handle between reloads.
4. Plan grouping, artifact grouping, metadata extraction, save flows, dirty-action gating, and action-driven artifact creation are covered by passing Vitest tests.
5. The locked frontend inventory matches the actual created and modified files.
6. No backend, database, or edge-function changes were introduced for the phase-1 POC.

## Task 1: Build the tracker metadata and artifact model

**File(s):** `web/src/pages/superuser/planTrackerModel.ts`, `web/src/pages/superuser/planTrackerModel.test.ts`

**Step 1:** Define the tracker types for plan units, artifact summaries, normalized metadata, and action payloads.
**Step 2:** Implement frontmatter parse/serialize helpers using existing Markdown text plus `js-yaml`.
**Step 3:** Implement legacy filename heuristics for `evaluation`, `reevaluation`, `implementation-evaluation`, `status-report`, and revision suffixes.
**Step 4:** Implement deterministic artifact filename builders and version increment helpers.
**Step 5:** Write failing tests for frontmatter parsing, grouping, and artifact naming.
**Step 6:** Make the tests pass.

**Test command:** `cd web && npm run test -- src/pages/superuser/planTrackerModel.test.ts`
**Expected output:** Vitest reports the new tracker-model test file passing with no failed cases.

**Commit:** `feat: add plan tracker metadata model`

## Task 2: Build the unwired plan shell, rails, and local preview surface

**File(s):** `web/src/pages/superuser/PlanTracker.tsx`, `web/src/pages/superuser/PlanTracker.test.tsx`, `web/src/pages/superuser/PlanUnitsRail.tsx`, `web/src/pages/superuser/PlanArtifactsRail.tsx`, `web/src/pages/superuser/PlanMetadataPane.tsx`, `web/src/pages/superuser/PlanDocumentPreview.tsx`

**Step 1:** Implement the dedicated `PlanTracker` page shell with deterministic fixture data so the four-pane layout can be reviewed before live wiring begins.
**Step 2:** Implement the primary plan rail that groups plan units by status and supports selection against fixture data.
**Step 3:** Implement the secondary artifact rail that shows the selected plan’s revisions and supplementary artifacts against fixture data.
**Step 4:** Implement the metadata pane with status/version/category display plus action button slots, but keep action buttons unwired in this task.
**Step 5:** Implement a local Markdown preview component using the existing `react-markdown` + `remark-frontmatter` + `remark-gfm` stack without backend document locators.
**Step 6:** Keep these components and the page shell presentational; do not let them own filesystem writes directly.

**Test command:** `cd web && npm run test -- src/pages/superuser/PlanTracker.test.tsx`
**Expected output:** Initial presentational tests cover the fixture-driven four-pane shell, rail rendering, preview display, and the dedicated page shell without depending on workflow actions or filesystem handles.

**Commit:** `feat: add plan tracker rails and preview surface`

## Task 3: Build the plan tracker orchestration hook

**File(s):** `web/src/pages/superuser/usePlanTracker.tsx`, `web/src/pages/superuser/usePlanTracker.test.tsx`

**Step 1:** Create a new hook that opens and restores the chosen `docs/plans` directory using the existing File System Access API utilities.
**Step 2:** Read `.md` and `.mdx` files from the selected tree and transform them into grouped plan units plus artifact trees using `planTrackerModel.ts`.
**Step 3:** Manage selected plan, selected artifact, open document content, dirty state, save behavior, and the pending-action gate that resolves `Save`, `Discard`, or `Cancel` before any workflow side effects occur.
**Step 4:** Reuse `MdxEditorSurface` for editable mode and `PlanDocumentPreview` for read-only mode.
**Step 5:** Expose `renderContent(tabId)` plus tracker-specific tabs and pane defaults for the workbench shell.
**Step 6:** Add tests for initial load, selection behavior, save behavior, dirty-action gating, and rail refresh after write operations.

**Test command:** `cd web && npm run test -- src/pages/superuser/usePlanTracker.test.tsx`
**Expected output:** Vitest reports the new hook test file passing, including dirty-action gating, rail refresh after save, and selection changes.

**Commit:** `feat: add plan tracker workbench hook`

## Task 4: Implement artifact-backed workflow actions

**File(s):** `web/src/pages/superuser/usePlanTracker.tsx`, `web/src/pages/superuser/planTrackerModel.ts`, `web/src/pages/superuser/usePlanTracker.test.tsx`

**Step 1:** Add action handlers for `Reject with Notes`, `Approve with Notes`, `Create Revision`, `Attach Implementation Note`, and `Attach Verification`.
**Step 2:** Before any action writes files, require the dirty-state gate to resolve with `Save`, `Discard`, or `Cancel`; abort without side effects on `Cancel`.
**Step 3:** For each action, create the required sibling artifact file with normalized metadata and write it through `writeFileContent()`.
**Step 4:** When the selected legacy file lacks required tracker metadata, normalize that metadata in place without renaming the file before creating any new sibling artifact.
**Step 5:** Update the selected plan’s metadata status and version fields according to the locked lifecycle rules.
**Step 6:** Refresh the in-memory tree and preserve selection on the newly created artifact or revision.
**Step 7:** Add failing tests for each action flow, then make them pass.

**Test command:** `cd web && npm run test -- src/pages/superuser/usePlanTracker.test.tsx`
**Expected output:** Action-flow tests pass and confirm that state changes always create or update a concrete artifact file, including in-place normalization for legacy files when required.

**Commit:** `feat: add plan tracker artifact actions`

## Task 5: Replace the unwired shell with live route wiring

**File(s):** `web/src/pages/superuser/PlanTracker.tsx`, `web/src/pages/superuser/PlanTracker.test.tsx`, `web/src/router.tsx`, `web/src/components/admin/AdminLeftNav.tsx`

**Step 1:** Replace the deterministic fixture data in `PlanTracker.tsx` with the live `usePlanTracker(...)` hook while preserving the approved four-pane layout and interaction contract.
**Step 2:** Register `/app/superuser/plan-tracker` in `web/src/router.tsx` without changing the existing `/app/workspace` route.
**Step 3:** Add a superuser navigation entry in `AdminLeftNav.tsx` for the new tracker route.
**Step 4:** Set the pane defaults to the locked four-pane tracker layout: plan rail, artifact rail, center document surface, and metadata/action pane.
**Step 5:** Add a route-level test that renders `/app/superuser/plan-tracker` and asserts the tracker shell appears.

**Test command:** `cd web && npm run test -- src/pages/superuser/PlanTracker.test.tsx`
**Expected output:** The dedicated route test passes and confirms the tracker shell mounts at `/app/superuser/plan-tracker`, preserves the approved four-pane layout, and no longer depends on fixture data.

**Commit:** `feat: mount plan tracker at dedicated superuser route`

## Task 6: Run full verification and cleanup

**File(s):** `web/src/pages/superuser/PlanTracker.tsx`, `web/src/pages/superuser/usePlanTracker.tsx`, `web/src/pages/superuser/planTrackerModel.ts`, `web/src/pages/superuser/*.test.tsx`, `web/src/router.tsx`, `web/src/components/admin/AdminLeftNav.tsx`

**Step 1:** Run the new tracker tests together.
**Step 2:** Run `eslint` for the `web` workspace.
**Step 3:** Manually verify the fixture-driven shell before live hookup to confirm the four-pane layout, selection states, metadata presentation, and action affordances match the approved front-end contract.
**Step 4:** Manually verify the live local workbench by opening `docs/plans`, selecting both a flat root-level legacy plan and a nested legacy plan, editing one, confirming the dirty-action gate works, and creating one supplementary artifact from a legacy file without renaming that file.
**Step 5:** Fix any contract drift discovered during verification without expanding the locked scope.

**Test command:** `cd web && npm run test -- src/pages/superuser/planTrackerModel.test.ts src/pages/superuser/usePlanTracker.test.tsx src/pages/superuser/PlanTracker.test.tsx && npm run lint`
**Expected output:** Vitest passes the new tracker tests, including dirty-action and dedicated-route coverage, and ESLint reports no new errors in the changed files.

**Commit:** `test: verify dedicated plan tracker workspace`
