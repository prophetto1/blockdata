# Plan Tracker Workspace Refoundation Implementation Plan

**Goal:** Rebuild `/app/superuser/plan-tracker` on top of the existing Test Integrations three-column workspace foundation so the tracker uses the repo's File System Access API and editor surfaces correctly, presents a metadata-driven left navigator with lifecycle-state tabs instead of a raw directory tree, opens real Markdown artifacts in the center document pane, and drives lifecycle transitions plus artifact-backed note creation from the right metadata pane.

**Architecture:** Keep the feature entirely browser-local inside `web`. Reuse the existing `Workbench`, File System Access API utilities, `MdxEditorSurface`, editor registry, and the directory/session patterns already proven in `TestIntegrations` + `useWorkspaceEditor`. Do not use the literal repo directory tree as the primary product model. Instead, read `docs/plans/**` from disk, parse frontmatter plus legacy filename heuristics through `planTrackerModel.ts`, group documents into plan units, normalize those plan units into the locked lifecycle states, and render that metadata-derived view in the left column. Selecting an artifact still opens and writes the real file on disk, while the right column shows the locked inspector sections and workflow actions.

**Tech Stack:** React 19, TypeScript, existing `web` workbench shell, File System Access API, IndexedDB handle persistence, `@mdxeditor/editor`, existing code-editor profiles, `react-markdown`, `remark-frontmatter`, `remark-gfm`, `js-yaml`, Vitest, ESLint.

**Status:** Draft
**Author:** Codex
**Date:** 2026-04-04

## Source Documents

- `docs/plans/dev-docs-site/2026-04-03-plan-tracker-workbench-implementation-plan.md`
- `docs/plans/dev-docs-site/requirements-0403`
- `docs/plans/dev-only/plan-tracker/2026-04-04-plan-tracker-refoundation-takeover-notes.md`
- `web/src/pages/superuser/TestIntegrations.tsx`
- `web/src/pages/superuser/useWorkspaceEditor.tsx`
- `web/src/pages/superuser/WorkspaceFileTree.tsx`
- `web/src/pages/superuser/MdxEditorSurface.tsx`
- `web/src/pages/superuser/PlanTracker.tsx`
- `web/src/pages/superuser/usePlanTracker.tsx`
- `web/src/pages/superuser/planTrackerModel.ts`
- `web/src/components/workbench/Workbench.tsx`
- `web/src/lib/fs-access.ts`

## Verified Current State

- `web/src/pages/superuser/TestIntegrations.tsx` already mounts a stable three-column workbench shell backed by `useWorkspaceEditor`.
- `web/src/pages/superuser/useWorkspaceEditor.tsx` already owns directory picking, handle restore, file selection, save behavior, view-mode toggles, and editor-profile routing for Markdown and code files.
- `web/src/pages/superuser/WorkspaceFileTree.tsx` already integrates the File System Access API with Ark UI tree rendering, drag/drop, create, rename, move, delete, and handle persistence.
- `web/src/pages/superuser/MdxEditorSurface.tsx` already provides the rich-text/source/diff Markdown editor surface used by the workspace.
- `web/src/pages/superuser/PlanTracker.tsx` already exists as a route, but its current shell is a tracker-specific four-pane layout rather than the proven workspace foundation.
- `web/src/pages/superuser/usePlanTracker.tsx` already contains useful browser-local logic for document grouping, selected artifact state, dirty-action gating, workflow artifact creation, and directory reads against `docs/plans/**`.
- `web/src/pages/superuser/planTrackerModel.ts` already contains useful frontmatter parsing, filename heuristics, deterministic artifact naming, and workflow status/title helpers.
- `docs/plans/**` remains mixed and legacy-heavy; raw directory shape cannot be the user-facing state model.
- No current requirement in this refoundation introduces platform API, database, edge-function, or shared backend runtime changes.

## Manifest

### Platform API

No platform API changes.

The refoundation remains browser-local. It reads and writes local Markdown files through the File System Access API only and does not add, modify, or consume any `services/platform-api` endpoints.

### Observability

No OpenTelemetry trace, metric, or structured-log changes in this refoundation.

Justification:

- The tracker still runs entirely in the browser against user-granted local file handles.
- The refoundation changes the frontend shell and metadata navigation model, not an owned backend runtime seam.
- Browser-local errors remain local UI states and `console.error(...)` diagnostics.

Allowed local diagnostics:

- `console.error(...)` for parse, read, write, or handle-restore failures
- inline empty/error states in the left navigator, document pane, and metadata pane

Forbidden in this refoundation:

- new platform-api spans
- new backend metrics
- structured logs pretending to audit local-only file operations

### Database Migrations

No database migrations.

The system of record remains the local `docs/plans/**` Markdown tree selected through the browser file picker.

### Edge Functions

No edge functions created or modified.

This refoundation stays entirely in the authenticated React app and local browser file APIs.

### Frontend Surface Area

**New pages/routes:** `0`

The route remains `/app/superuser/plan-tracker`.

**Modified pages:** `1`

| Surface | File | What changes |
|------|------|--------------|
| `PlanTracker` | `web/src/pages/superuser/PlanTracker.tsx` | Rebuild the route on the Test Integrations three-column workspace shell instead of the custom four-pane rail shell |

**Modified routing/navigation files:** `0`

**New hooks:** `0`

**Modified existing hooks:** `1`

| Hook | File | What changes |
|------|------|--------------|
| `usePlanTracker` | `web/src/pages/superuser/usePlanTracker.tsx` | Rebase orchestration on the workspace-editor document/session contract, add controlling-lifecycle resolution plus lifecycle-state filtering, and drive a metadata-derived left navigator plus structured right-column inspector |

**New utility modules:** `0`

**Modified existing utility modules:** `1`

| Module | File | What changes |
|------|------|--------------|
| `planTrackerModel` | `web/src/pages/superuser/planTrackerModel.ts` | Lock lifecycle states, controlling-state resolution, artifact types, metadata schema, legacy normalization rules, and grouped plan/artifact semantics for the refounded shell |

**New components:** `1`

| Component | File | Purpose |
|-----------|------|---------|
| `PlanStateNavigator` | `web/src/pages/superuser/PlanStateNavigator.tsx` | Left-column metadata-driven navigator with lifecycle-state tabs, plan-unit rows, and nested artifact rows for the selected plan |

**Modified existing components:** `2`

| Component | File | What changes |
|-----------|------|--------------|
| `PlanMetadataPane` | `web/src/pages/superuser/PlanMetadataPane.tsx` | Keep the right metadata/actions pane but align it to the refounded three-column shell, the locked Summary -> Classification -> Timeline -> Workflow -> Notes -> Related Artifacts inspector order, and the phase-1 editable-vs-display-only metadata split |
| `PlanDocumentPreview` | `web/src/pages/superuser/PlanDocumentPreview.tsx` | Keep the read-only preview path aligned with the new artifact/document flow |

**Deleted superseded components:** `2`

- `web/src/pages/superuser/PlanUnitsRail.tsx`
- `web/src/pages/superuser/PlanArtifactsRail.tsx`

**New test modules:** `1`

| Test | File | Covers |
|------|------|--------|
| `PlanStateNavigator.test.tsx` | `web/src/pages/superuser/PlanStateNavigator.test.tsx` | Lifecycle-state tabs, plan filtering, nested artifact rows, and selection behavior |

**Modified existing test modules:** `3`

| Test | File | Covers |
|------|------|--------|
| `planTrackerModel.test.ts` | `web/src/pages/superuser/planTrackerModel.test.ts` | Lifecycle normalization, controlling-state resolution, metadata schema, artifact grouping, deterministic naming |
| `usePlanTracker.test.tsx` | `web/src/pages/superuser/usePlanTracker.test.tsx` | Directory load, metadata-driven filtering, document open/save, dirty-action gating, lifecycle actions, transition-matrix enforcement, and artifact-backed notes |
| `PlanTracker.test.tsx` | `web/src/pages/superuser/PlanTracker.test.tsx` | Route-level three-column shell behavior and pane rendering |

**Reused as-is as infrastructure or implementation reference in this refoundation**

- `web/src/pages/superuser/TestIntegrations.tsx` - route-level shell reference for the three-column workspace composition
- `web/src/pages/superuser/useWorkspaceEditor.tsx` - directory/session/editor contract reused beneath the tracker-specific hook
- `web/src/pages/superuser/WorkspaceFileTree.tsx` - File System Access API tree/reference implementation reused as a substrate example, not as the intended primary mounted tracker UX
- `web/src/pages/superuser/MdxEditorSurface.tsx` - editor surface reused directly
- `web/src/components/workbench/Workbench.tsx` - three-column workbench shell reused directly
- `web/src/lib/fs-access.ts` - browser-local file IO utilities reused directly

## Pre-Implementation Contract

No major product, metadata, shell, or workflow decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. The tracker remains at `/app/superuser/plan-tracker`.
2. The page shell is re-based on the existing Test Integrations three-column workspace foundation, not the previous custom four-pane rail design.
3. The File System Access API remains the system-of-record IO layer, but the literal repo directory tree is not the primary product model.
4. The left column is a metadata-driven navigator. It uses the locked lifecycle-state tabs at the top and shows plan units filtered into those tabs by parsed metadata and legacy fallback heuristics.
5. One row in the left navigator represents one plan unit. The selected plan unit may reveal its actual artifact files as nested child rows inside that same left column.
6. The center column is the active document surface. It opens the selected artifact's real file from disk and supports editable Markdown/MDX plus preview/source/diff modes through the existing editor surface.
7. The right column is the structured metadata + workflow inspector. It follows the locked section order and owns workflow actions, note composition, and dirty-action resolution.
8. The tracker must preserve the distinction between plan-unit selection and artifact selection. The selected plan unit stays stable while the active artifact may change within that plan.
9. The first-load state must not mirror the raw folder tree to the user. It may read the whole selected directory behind the scenes, but the visible model is metadata-driven lifecycle tabs and filtered plan units.
10. Existing legacy files without tracker metadata must remain readable. The first open must not mass-rewrite the tree.
11. Any tracker-created artifact or explicit tracker save that normalizes a legacy file must preserve the existing filename of that legacy file.

### Locked Lifecycle-State Contract

The tracker lifecycle states are:

- `to-do`
- `in-progress`
- `under-review`
- `approved`
- `implemented`
- `verified`
- `closed`

These lifecycle states describe the current controlling state of the plan unit, not merely the state of one arbitrary artifact file.

The left navigator must expose these lifecycle tabs in this exact order:

1. `To Do`
2. `In Progress`
3. `Under Review`
4. `Approved`
5. `Implemented`
6. `Verified`
7. `Closed`

Rules:

1. The left-column tabs are lifecycle-state tabs, not raw artifact-type tabs.
2. One visible row in the left navigator represents one plan unit.
3. A plan unit's tab placement is determined by its controlling lifecycle state.
4. Nested child rows may expose the selected plan unit's concrete artifact files inside the active tab.
5. Legacy values may be normalized into the locked lifecycle states using fallback heuristics:
   - `review`, `pending-approval`, `under-review` -> `under-review`
   - unknown or missing values -> best-effort fallback, but the normalized lifecycle state must resolve to one of the locked values above
6. The tracker must not use the raw repo directory tree as the primary left-column UX.

### Locked Controlling Lifecycle-State Resolution Contract

The tracker must resolve one and only one controlling lifecycle state for each visible plan unit.

#### Tracker-managed resolution rule

1. Collect all artifacts whose explicit or inferred `artifactType` resolves to `plan`.
2. If one or more plan artifacts exist, sort them by:
   - highest numeric `version`
   - newest `updatedAt`
   - newest `createdAt`
   - lexical file path as the final deterministic tie-breaker
3. The first artifact in that ordered list is the controlling plan artifact.
4. The visible lifecycle tab placement of the plan unit is the normalized `status` of that controlling plan artifact.
5. Non-plan artifacts do not directly control left-column tab placement for tracker-managed plan units.
6. Every workflow action that creates a supplementary note artifact must also update the controlling plan artifact so the plan unit's lifecycle state remains unambiguous.

#### Legacy fallback resolution rule

If no artifact resolves to `plan`, the tracker must still derive a deterministic controlling lifecycle state:

1. Sort all artifacts in the plan unit by:
   - highest numeric `version`
   - highest normalized lifecycle rank, where `closed` > `verified` > `implemented` > `approved` > `under-review` > `in-progress` > `to-do`
   - newest `updatedAt`
   - newest `createdAt`
   - lexical file path as the final deterministic tie-breaker
2. The first artifact in that ordered list becomes the legacy controlling artifact.
3. The visible lifecycle state of the plan unit is the normalized `status` of that legacy controlling artifact.
4. After any tracker-managed save or workflow action, the plan unit must thereafter have an explicit controlling `plan` artifact.

### Locked Artifact-Type Contract

Artifact type is distinct from lifecycle state.

The tracker-managed artifact types are:

- `plan`
- `review-note`
- `approval-note`
- `implementation-note`
- `verification-note`
- `closure-note`

Rules:

1. Lifecycle state determines which left-column tab a plan unit appears in.
2. Artifact type explains what the selected file actually is.
3. A plan unit may contain multiple artifact types while still resolving to a single controlling lifecycle state.
4. Artifact type must be explicit metadata for tracker-managed files.
5. Legacy files may infer artifact type through filename heuristics until explicitly normalized.

### Locked Metadata Contract

Tracker-managed files must use frontmatter-backed metadata.

#### Required phase-1 metadata

- `title`
- `planId`
- `artifactType`
- `status`
- `version`
- `productL1`
- `productL2`
- `productL3`
- `createdAt`
- `updatedAt`

#### Optional but strongly encouraged phase-1 metadata

- `owner`
- `reviewer`
- `tags`
- `supersedesArtifactId`
- `relatedArtifacts`
- `notes`

Definitions:

- `status` is the lifecycle state and must resolve to one of the locked lifecycle values.
- `artifactType` is the artifact classification and must resolve to one of the locked artifact types.
- `productL1` is the top product domain, e.g. `blockdata`, `agchain`, `admin-superuser`.
- `productL2` is the subsystem / architectural surface, e.g. `platform`, `backend`, `database`, `frontend`, `docs`, `infra`.
- `productL3` is the granular feature / capability / service name.

Rules:

1. For legacy files, `version` may be inferred when missing.
2. For tracker-managed files, `version` must be written explicitly.
3. The first open must not mass-rewrite legacy files.
4. The first tracker-managed save or workflow action may normalize metadata in place while preserving the existing filename.

### Locked Metadata Editability Contract

The right-column inspector must distinguish between metadata that is editable in phase 1 and metadata that is display-only.

#### Display-only in phase 1

- `planId`
- `artifactType`
- `status`
- `version`
- `createdAt`
- `updatedAt`
- `supersedesArtifactId`
- derived lineage / related artifact summaries

#### Editable in phase 1

- `title`
- `productL1`
- `productL2`
- `productL3`
- `owner`
- `reviewer`
- `tags`
- `notes`

Rules:

1. Lifecycle state changes happen through workflow actions, not freeform status editing.
2. Artifact type is not user-editable once a tracker-managed artifact is created.
3. Version is system-managed.
4. Timestamps are system-managed.
5. The right column must not expand into a general-purpose arbitrary metadata form in phase 1.

### Locked Right-Column Inspector Contract

The right column is a structured metadata + workflow inspector.

It must use this section order:

1. **Summary**
   - `title`
   - lifecycle state badge
   - artifact type badge
   - version
2. **Classification**
   - `productL1`
   - `productL2`
   - `productL3`
   - `planId`
3. **Timeline**
   - `createdAt`
   - `updatedAt`
   - `supersedesArtifactId` / lineage summary when present
4. **Workflow Actions**
   - only the actions allowed by the locked workflow transition matrix for the current lifecycle state
5. **Notes / Action Composer**
   - structured input area
   - creates a real artifact-backed note file
   - does not create an ephemeral inline comment system
6. **Related Artifacts**
   - related files / lineage links when available

Rules:

1. The top of the right column is informational context.
2. The middle and lower portions are operational.
3. "Comments" in phase 1 are artifact-backed notes, not threaded inline comments.
4. Dirty-action gating remains mandatory in front of all workflow side effects.

### Locked Workflow Transition Matrix

The right column must use the following lifecycle-action contract.

| Current lifecycle state | Available action | Resulting lifecycle state | Required artifact side effect |
|---|---|---|---|
| `to-do` | `Start Work` | `in-progress` | update the controlling `plan` artifact only |
| `in-progress` | `Submit for Review` | `under-review` | update the controlling `plan` artifact only |
| `under-review` | `Send Back` | `in-progress` | create `review-note` and update the controlling `plan` artifact |
| `under-review` | `Approve` | `approved` | create `approval-note` and update the controlling `plan` artifact |
| `approved` | `Mark Implementing` | `in-progress` | create or update `implementation-note` and update the controlling `plan` artifact |
| `in-progress` after an approval artifact already exists for the current version lineage | `Mark Implemented` | `implemented` | create or update `implementation-note` and update the controlling `plan` artifact |
| `implemented` | `Request Verification` | `verified` | create `verification-note` and update the controlling `plan` artifact |
| `verified` | `Close` | `closed` | create `closure-note` and update the controlling `plan` artifact |

Rules:

1. `Request Verification` is a combined request-and-record action in phase 1 because there is no multi-user workflow engine yet.
2. `Send Back` and `Approve` are only available from `under-review`.
3. `Mark Implemented` is only available when the current version lineage has already reached `approved`.
4. `Close` is only available from `verified`.
5. Every state transition must update the controlling `plan` artifact even when it also creates a supplementary note artifact.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. A user opens `/app/superuser/plan-tracker`, picks the repo's `docs/plans` directory, and sees a three-column workspace shell: metadata-driven left navigator, center document pane, and right metadata/actions pane.
2. The left navigator shows the locked lifecycle-state tabs and filters plan units by parsed metadata rather than literal directory shape.
3. Selecting a plan unit reveals its related artifacts within the same left navigator and opens the default artifact in the center pane.
4. Selecting an artifact opens that artifact's real Markdown file in the center document pane and shows metadata in the right pane.
5. The center document pane reuses the existing workspace editor contract: file header, unsaved state, save behavior, and preview/source/diff handling.
6. If the active document is dirty and the user clicks a workflow action, the tracker presents `Save`, `Discard`, and `Cancel`. `Save` must persist before action side effects occur, `Discard` must drop in-memory edits before continuing, and `Cancel` must leave both disk and memory unchanged.
7. Workflow actions still create or update concrete sibling Markdown artifacts and refresh the metadata-driven navigator without requiring the directory to be re-picked.
8. The left navigator remains metadata-driven even after workflow writes; it must not fall back to exposing the raw folder tree as the primary UX.
9. No backend API, database, or edge-function changes are required for this refoundation.
10. The left navigator uses the locked lifecycle-state tabs, not the older Draft/Review/Rejected/Superseded taxonomy.
11. The right pane shows at least the required phase-1 metadata fields: `title`, `planId`, `artifactType`, `status`, `version`, `productL1`, `productL2`, `productL3`, `createdAt`, and `updatedAt`.
12. The right pane follows the locked section order: Summary, Classification, Timeline, Workflow Actions, Notes / Action Composer, Related Artifacts.
13. Any phase-1 comment or note action creates a concrete artifact-backed note file on disk rather than an ephemeral inline comment object.
14. The left navigator resolves each plan unit's tab placement through the locked controlling-lifecycle-state algorithm rather than ad hoc artifact inspection.
15. The right pane only exposes workflow actions allowed by the locked workflow transition matrix for the current lifecycle state.
16. The right pane respects the locked metadata editability split rather than exposing freeform editing for all metadata fields.

### Locked Platform API Surface

#### New platform API endpoints: `0`

#### Modified platform API endpoints: `0`

#### Existing platform API endpoints reused as-is: `0`

This refoundation does not cross into `services/platform-api`.

### Locked Observability Surface

#### New traces: `0`

#### New metrics: `0`

#### New structured logs: `0`

Local-only browser diagnostics remain:

- inline UI error states
- `console.error(...)` for unexpected file/parse failures

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

- New routes/pages: `0`
- Modified existing pages: `1`
- Modified routing/navigation files: `0`
- New hooks: `0`
- Modified existing hooks: `1`
- New utility modules: `0`
- Modified existing utility modules: `1`
- New visual components: `1`
- Modified existing visual components: `2`
- Deleted superseded visual components: `2`

#### Tests

- New test modules: `1`
- Modified existing test modules: `3`

### Locked File Inventory

#### New files

- `web/src/pages/superuser/PlanStateNavigator.tsx`
- `web/src/pages/superuser/PlanStateNavigator.test.tsx`

#### Modified files

- `web/src/pages/superuser/PlanTracker.tsx`
- `web/src/pages/superuser/usePlanTracker.tsx`
- `web/src/pages/superuser/planTrackerModel.ts`
- `web/src/pages/superuser/PlanMetadataPane.tsx`
- `web/src/pages/superuser/PlanDocumentPreview.tsx`
- `web/src/pages/superuser/planTrackerModel.test.ts`
- `web/src/pages/superuser/usePlanTracker.test.tsx`
- `web/src/pages/superuser/PlanTracker.test.tsx`

#### Deleted files

- `web/src/pages/superuser/PlanUnitsRail.tsx`
- `web/src/pages/superuser/PlanArtifactsRail.tsx`

## Frozen Storage/View Contract

The tracker must preserve the current repository reality while presenting a metadata-first workspace.

1. The local `docs/plans/**` Markdown tree remains the storage layer and write target.
2. The visible left-column UX is not the raw directory structure; it is a metadata-derived state navigator.
3. Directory shape is not the source of truth for plan relationships.
4. Explicit tracker metadata is the source of truth when present.
5. Filename heuristics are a read-only fallback for legacy files that lack explicit metadata.
6. Selecting a plan or artifact must still resolve to a real file on disk.
7. The document header must keep the active file legible by showing the actual file name and unsaved state.
8. The first open must not rewrite unrelated files just to normalize metadata.
9. The first tracker-managed save or workflow action against a legacy file may normalize metadata in place, but it must preserve that file's existing filename.
10. New revisions and supplementary artifacts must continue using deterministic tracker-generated filenames.
11. Tracker-managed files must write the locked required metadata fields explicitly.
12. The left navigator is allowed to read the whole selected directory behind the scenes, but the visible grouping must always be metadata-driven.

## Explicit Risks Accepted In This Plan

1. Legacy grouping remains the main operational risk until more files carry explicit `planId`, `artifactType`, normalized lifecycle status, and the locked product classification metadata fields.
2. The refoundation keeps browser-local file access and therefore has no multi-user synchronization or server audit trail.
3. Collapsing the old artifact rail into the left metadata navigator raises navigator-density risk; tests and manual verification must ensure artifact discovery remains clear.
4. The MDX rich-text editor may still fail on malformed legacy content; the refoundation must preserve source/diff recovery paths rather than assuming rich-text parsing always succeeds.

## Completion Criteria

The work is complete only when all of the following are true:

1. `/app/superuser/plan-tracker` uses the re-founded three-column workspace shell.
2. The left navigator reads `docs/plans/**`, filters by locked lifecycle-state tabs, and presents plan units plus nested artifact rows without exposing the raw directory tree as the primary UX.
3. The center pane opens and saves real files through the existing editor foundation.
4. The right pane shows the locked metadata fields, the locked inspector section order, and dirty-action-gated workflow actions.
5. The locked frontend inventory matches the actual created, modified, and deleted files.
6. No backend, database, or edge-function changes were introduced.

## Task 1: Re-lock the lifecycle, artifact, and metadata model

**File(s):** `web/src/pages/superuser/planTrackerModel.ts`, `web/src/pages/superuser/planTrackerModel.test.ts`

**Step 1:** Lock the lifecycle-state taxonomy, artifact-type taxonomy, controlling-lifecycle-state resolution rule, and required metadata schema used by the tracker.
**Step 2:** Keep the existing frontmatter parsing, deterministic artifact naming, and grouped plan/artifact model where still valid.
**Step 3:** Add helpers that normalize legacy values into the locked lifecycle states and artifact types without relying on directory shape.
**Step 4:** Add helpers that resolve a single controlling lifecycle state per plan unit and bucket plan units into the locked lifecycle-state tabs deterministically.
**Step 5:** Keep deterministic artifact ordering and the distinction between selected plan unit and selected artifact.
**Step 6:** Write failing tests for lifecycle normalization, controlling-state resolution, metadata schema enforcement, grouping, and filename determinism.
**Step 7:** Make the tests pass.

**Test command:** `cd web && npm run test -- src/pages/superuser/planTrackerModel.test.ts`
**Expected output:** Vitest reports the tracker-model tests passing, including lifecycle normalization, controlling-state resolution, artifact typing, metadata schema handling, and grouping behavior.

**Commit:** `feat: re-lock plan tracker lifecycle and metadata model`

## Task 2: Build the metadata-driven left navigator

**File(s):** `web/src/pages/superuser/PlanStateNavigator.tsx`, `web/src/pages/superuser/PlanStateNavigator.test.tsx`

**Step 1:** Build a left-column navigator with the locked lifecycle-state tabs at the top.
**Step 2:** Render one row per plan unit inside the active tab.
**Step 3:** Allow the selected plan to reveal nested artifact rows inside the same navigator.
**Step 4:** Keep the component presentational; it must not own file reads or writes.
**Step 5:** Write failing tests for lifecycle-tab switching, filtered rendering, nested artifact rows, and selection.
**Step 6:** Make the tests pass.

**Test command:** `cd web && npm run test -- src/pages/superuser/PlanStateNavigator.test.tsx`
**Expected output:** Vitest reports the left navigator tests passing with lifecycle-tab filtering and nested artifact behavior covered.

**Commit:** `feat: add metadata-driven plan state navigator`

## Task 3: Rebase usePlanTracker on the workspace-editor document contract

**File(s):** `web/src/pages/superuser/usePlanTracker.tsx`, `web/src/pages/superuser/usePlanTracker.test.tsx`

**Step 1:** Rework the hook so it follows the proven `useWorkspaceEditor` directory/session pattern: open directory, restore handle, flatten markdown nodes, open selected file, track original content, and save back to disk.
**Step 2:** Replace the old separate plan/artifact rail state with left-navigator tab state plus selected plan/artifact state.
**Step 3:** Keep the metadata model browser-local by reading actual files from `docs/plans/**`, parsing metadata, grouping plan units, resolving one controlling lifecycle state per plan unit, and filtering into the locked lifecycle-state tabs.
**Step 4:** Keep the document surface driven by the real selected artifact file, reusing the existing editor/preview/source/diff handling.
**Step 5:** Preserve dirty-action gating and make it work with the re-founded three-column shell.
**Step 6:** Expose the right-column inspector data in the locked section order, ensure the required metadata fields are available to the pane, and enforce the phase-1 editable-vs-display-only metadata split.
**Step 7:** Add tests for initial load, lifecycle filtering, controlling-state resolution, selected artifact open/save, metadata availability, and pending-action resolution.

**Test command:** `cd web && npm run test -- src/pages/superuser/usePlanTracker.test.tsx`
**Expected output:** Vitest reports the refounded hook tests passing, including lifecycle filtering, controlling-state resolution, document save behavior, right-pane metadata availability, and dirty-action gating.

**Commit:** `feat: rebase plan tracker hook on workspace editor contract`

## Task 4: Rebuild the plan tracker route on the Test Integrations shell

**File(s):** `web/src/pages/superuser/PlanTracker.tsx`, `web/src/pages/superuser/PlanMetadataPane.tsx`, `web/src/pages/superuser/PlanDocumentPreview.tsx`, `web/src/pages/superuser/PlanTracker.test.tsx`, `web/src/pages/superuser/PlanUnitsRail.tsx`, `web/src/pages/superuser/PlanArtifactsRail.tsx`

**Step 1:** Rebuild `PlanTracker.tsx` so it mounts the same three-column workbench shape used by Test Integrations: left navigator, center document, right metadata/actions.
**Step 2:** Keep `PlanMetadataPane.tsx` and `PlanDocumentPreview.tsx`, but align them with the new three-column flow and the locked right-column inspector contract.
**Step 3:** Remove the old four-pane rail assumptions from the page shell and tests.
**Step 4:** Delete `PlanUnitsRail.tsx` and `PlanArtifactsRail.tsx` once the new navigator replaces them.
**Step 5:** Add route-level tests that assert the refounded three-column shell is mounted.

**Test command:** `cd web && npm run test -- src/pages/superuser/PlanTracker.test.tsx`
**Expected output:** The route-level tracker test passes and confirms the three-column workspace shell is mounted.

**Commit:** `refactor: rebase plan tracker page on test integrations shell`

## Task 5: Reconnect lifecycle actions and artifact-backed notes to the refounded shell

**File(s):** `web/src/pages/superuser/usePlanTracker.tsx`, `web/src/pages/superuser/planTrackerModel.ts`, `web/src/pages/superuser/PlanMetadataPane.tsx`, `web/src/pages/superuser/usePlanTracker.test.tsx`

**Step 1:** Implement the locked lifecycle-transition actions exactly as specified by the workflow matrix: `Start Work`, `Submit for Review`, `Send Back`, `Approve`, `Mark Implementing`, `Mark Implemented`, `Request Verification`, and `Close`.
**Step 2:** Gate action availability by the current lifecycle state so the right pane only exposes valid transitions.
**Step 3:** Add the structured Notes / Action Composer area that creates artifact-backed note files rather than ephemeral inline comments.
**Step 4:** Ensure each action writes or updates the required concrete Markdown artifacts on disk and updates the controlling `plan` artifact's lifecycle state exactly as locked.
**Step 5:** Keep the locked dirty-action gate in front of all workflow side effects.
**Step 6:** Refresh the metadata-driven navigator after each workflow write without re-picking the directory.
**Step 7:** Keep plan-unit selection stable while updating the active artifact after action-driven note or state changes.
**Step 8:** Add failing tests for each lifecycle-action flow, transition-availability rule, and note-composer flow in the refounded shell, then make them pass.

**Test command:** `cd web && npm run test -- src/pages/superuser/usePlanTracker.test.tsx`
**Expected output:** Workflow tests pass, including transition-matrix enforcement, dirty gating, lifecycle state updates, artifact-backed note creation, and selection persistence.

**Commit:** `feat: reconnect lifecycle actions in refounded plan tracker`

## Task 6: Run full verification and cleanup

**File(s):** `web/src/pages/superuser/PlanTracker.tsx`, `web/src/pages/superuser/usePlanTracker.tsx`, `web/src/pages/superuser/planTrackerModel.ts`, `web/src/pages/superuser/PlanStateNavigator.tsx`, `web/src/pages/superuser/PlanMetadataPane.tsx`, `web/src/pages/superuser/PlanDocumentPreview.tsx`, `web/src/pages/superuser/*.test.tsx`

**Step 1:** Run the refounded tracker tests together.
**Step 2:** Run targeted `eslint` on the touched tracker files.
**Step 3:** Manually verify the route by opening `docs/plans`, switching lifecycle tabs, selecting a plan, opening an artifact, editing it, and running one workflow action plus one note-composer action.
**Step 4:** Verify the left navigator is metadata-driven even though the document pane still opens real files from disk.
**Step 5:** Verify the left navigator resolves tab placement through the locked controlling-lifecycle-state rule even when a plan unit has mixed artifact types.
**Step 6:** Verify the right column follows the locked inspector order, shows the required metadata fields, and respects the phase-1 editable-vs-display-only metadata split.
**Step 7:** Fix any contract drift discovered during verification without expanding scope.

**Test command:** `cd web && npm run test -- src/pages/superuser/planTrackerModel.test.ts src/pages/superuser/PlanStateNavigator.test.tsx src/pages/superuser/usePlanTracker.test.tsx src/pages/superuser/PlanTracker.test.tsx && npx eslint src/pages/superuser/PlanTracker.tsx src/pages/superuser/usePlanTracker.tsx src/pages/superuser/planTrackerModel.ts src/pages/superuser/PlanStateNavigator.tsx src/pages/superuser/PlanMetadataPane.tsx src/pages/superuser/PlanDocumentPreview.tsx src/pages/superuser/planTrackerModel.test.ts src/pages/superuser/PlanStateNavigator.test.tsx src/pages/superuser/usePlanTracker.test.tsx src/pages/superuser/PlanTracker.test.tsx`
**Expected output:** Vitest passes the refounded tracker tests and ESLint reports no new errors in the changed files.

**Commit:** `test: verify refounded plan tracker workspace`
