# Plan Tracker Frontend Structural Design Pass

**Date:** 2026-04-04  
**Route:** `/app/superuser/plan-tracker`  
**Source Contract:** `E:\writing-system\docs\plans\dev-only\plan-tracker\2026-04-04-plan-tracker-workspace-refoundation-implementation-plan.md`

## Design Output / Deliverables Plan

### Phase 1 — Contract Extraction and Reuse Audit
- Extract the locked frontend contract from the approved implementation plan.
- Audit current route/hook/component drift against that contract.
- Audit reusable tokens, shared UI primitives, shell components, and editor/workbench primitives.
- Produce the pane-by-pane structural UI contract, state-to-visibility matrix, and exact Phase 2 implementation scope.

### Phase 2 — Persistent Scaffold / Placeholder-Mode Composition
- Materialize the three-pane page so the tracker reads correctly before any directory or artifact is selected.
- Keep all pane identities always visible.
- Move empty states inside the scaffold rather than letting them replace whole panes.

### Phase 3 — Component-Level Refinement and Interaction Framing
- Keep the persistent scaffold while refining selection, nested artifact expansion, tab switching, and editor-frame behavior.
- Preserve the approved workflow language and metadata contract without expanding backend scope.

### Phase 4 — Visual Verification and Structural Corrections
- Run Playwright checks for no-directory, no-selection, selected-artifact, dirty-document, and workflow-enabled states.
- Correct only structural or visibility defects found during browser verification.

### Phase 5 — Semantic/Data Wiring
- Keep browser-local filesystem reads/writes, metadata parsing, lifecycle filtering, and workflow actions within the already-visible scaffold.
- Do not change backend/API/database/edge-function scope.

---

## Phase 1 — Frontend Contract Summary

### Page Purpose and Layout

The approved plan locks this route as a three-column browser-local workspace:

- **Left:** metadata-driven lifecycle navigator
- **Center:** MDX document workspace backed by real Markdown files through File System Access API
- **Right:** structured metadata and workflow inspector

The route stays on `/app/superuser/plan-tracker`. No new route, backend API, database, or edge-function surface is part of this pass.

### Locked Lifecycle States

The left navigator must expose these tabs in this exact order:

1. `To Do`
2. `In Progress`
3. `Under Review`
4. `Approved`
5. `Implemented`
6. `Verified`
7. `Closed`

These are lifecycle-state tabs, not artifact-type tabs. A visible left-row represents one plan unit. Tab placement is determined by the plan unit's controlling lifecycle state.

### Locked Artifact Types

Tracker-managed artifact types remain:

- `plan`
- `review-note`
- `approval-note`
- `implementation-note`
- `verification-note`
- `closure-note`

Lifecycle state and artifact type remain separate concepts.

### Locked Metadata Fields

Required phase-1 metadata:

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

Optional but strongly useful in phase 1:

- `owner`
- `reviewer`
- `tags`
- `supersedesArtifactId`
- `relatedArtifacts`
- `notes`

### Locked Metadata Editability Split

Editable in phase 1:

- `productL1`
- `productL2`
- `productL3`
- `owner`
- `reviewer`
- `tags`
- `notes`

Display-only in phase 1:

- `planId`
- `artifactType`
- `status`
- `version`
- `createdAt`
- `updatedAt`
- `supersedesArtifactId`
- lineage / related artifact summaries

### Locked Right-Column Section Order

The right inspector must keep this order:

1. `Summary`
2. `Classification`
3. `Timeline`
4. `Workflow Actions`
5. `Notes / Action Composer`
6. `Related Artifacts`

### Locked Workflow Actions

The right pane must use only the approved lifecycle transition matrix:

- `Start Work`
- `Submit for Review`
- `Send Back`
- `Approve`
- `Mark Implementing`
- `Mark Implemented`
- `Request Verification`
- `Close`

The pane may only show actions valid for the selected lifecycle state.

### Always-Visible Structures vs Conditional Content

Always visible:

- left pane header, lifecycle tabs, navigator list structure
- center pane document workspace frame, file/status strip, mode controls, editor canvas/frame
- right pane inspector section headers and section bodies

Conditional:

- real filesystem-backed plan/artifact rows
- real document content
- real metadata values
- enabled/disabled workflow availability
- dirty-state indicator text and action gating state

Current drift to correct:

- `usePlanTracker.tsx` still replaces the right pane with `No metadata available.` when there is no selected plan/artifact.
- the center MDX surface mounts only when an artifact is selected, so the page does not read as a document tool on arrival.

The structural correction is therefore: **keep the scaffold persistent and swap only the inner content state.**

---

## Phase 1 — Reuse Audit

### Existing Tokens To Consume

Canonical visual tokens already exist and should be reused instead of hand-authored values:

- color/surface CSS vars from `web/src/tailwind.css` and `web/src/lib/color-contract.ts`
  - `--background`
  - `--chrome`
  - `--card`
  - `--secondary`
  - `--muted`
  - `--accent`
  - `--popover`
  - `--border`
  - `--foreground`
  - `--muted-foreground`
- typography contract from `web/src/lib/font-contract.ts`
  - `font-sans` for all UI text
  - `font-mono` only for technical identifiers, paths, versions, or timestamps when needed
  - existing recipe tiers such as `text-2xl font-bold`, `text-xl font-semibold`, `text-sm font-semibold`, `text-sm font-normal`, `text-xs font-medium text-muted-foreground`
- icon contract from `web/src/lib/icon-contract.ts`
  - use icon context sizing, especially `inline`, `content`, and `utility`
  - prefer muted/default tones already defined
- toolbar contract from `web/src/lib/toolbar-contract.ts`
  - use `TOOLBAR_STRIP`, `TOOLBAR_BUTTON_BASE`, and active/inactive state tokens for document mode controls instead of bespoke toggle styling

### Existing Shared Components To Use

Use existing shared primitives first:

- `Button` for workflow actions, primary open/save actions, and no-directory CTA
- `Badge` for lifecycle state, artifact type, version, tag chips, and editable/read-only markers
- `Tabs` for lifecycle-state tabs if the current `PlanStateNavigator` tab strip needs contract-level tightening
- `SegmentedControl` or toolbar contract patterns for center-pane view mode controls
- `Separator` for section dividers and pane sub-headers
- `Skeleton` for placeholder rows, placeholder metadata fields, and editor canvas loading states
- `Input` and existing text-field patterns for the note composer
- `tags-input` patterns if tags become editable inside the right pane

### Existing Layout / Shell / Editor Primitives To Use

Do not reinvent these:

- `Workbench.tsx` for the locked three-column shell
- `MdxEditorSurface.tsx` as the real document editor surface
- `PlanDocumentPreview.tsx` as the center-pane preview surface
- `useWorkspaceEditor.tsx` as the session/document orchestration reference
- `TestIntegrations.tsx` as the three-column composition reference
- `useShellHeaderTitle` for page-level shell title wiring

### What Must Not Be Reinvented

- no custom CSS color palette outside canonical tokens
- no ad hoc button system
- no bespoke badge/chip implementation if `Badge` covers the need
- no custom pane layout replacing `Workbench`
- no replacement editor when `MdxEditorSurface` already satisfies the document requirement
- no raw HTML/CSS toolbar when toolbar tokens and existing button primitives already exist

### Genuinely New Components Needed

No mandatory new top-level component is required by contract.

Permitted extraction only if needed to remove high-level gating from `usePlanTracker.tsx`:

- `PlanDocumentShell.tsx`
  - purely presentational wrapper for the center pane's persistent header, mode controls, empty-state copy, and editor frame
- `PlanMetadataScaffold.tsx`
  - purely presentational wrapper for the right pane's persistent section stack

These are optional refactors, not product-model changes.

---

## Phase 1 — Structural UI Contract

### Left Pane — Lifecycle Navigator

#### Must always be visible on page load

- pane title and supporting copy
- lifecycle tab strip in the locked order
- count chips or zero-count placeholders on each tab
- navigator list region with visible row structure or row skeletons

#### Placeholder until selection/data

- zero or skeleton plan rows when no directory is selected
- empty-state copy inside the list region, not replacing the pane
- disabled visual treatment for nested artifact rows until a plan is selected

#### Live after filesystem/data wiring

- actual plan-unit rows
- controlling lifecycle-state grouping
- nested artifact rows for the selected plan
- active-row and active-artifact states

#### Must never disappear

- tab strip
- pane header
- list frame / navigator body

The left pane must always read as a tracker queue, never as a generic empty rail.

### Center Pane — Document Workspace

#### Must always be visible on page load

- document header region
- filename / artifact identity strip
- dirty/save/status region
- view mode controls for `Edit`, `Preview`, `Source`, `Diff`
- editor canvas/frame even when no file is selected

#### Placeholder until selection/data

- placeholder filename such as `No artifact selected`
- disabled mode controls when no artifact is active
- disabled save button or inactive save affordance
- editor canvas skeleton or empty-state copy inside the frame

#### Live after filesystem/data wiring

- real artifact title or filename
- dirty-state indicator
- active save behavior
- mounted `MdxEditorSurface` and `PlanDocumentPreview`

#### Must never disappear

- header strip
- mode control cluster
- editor frame

The center pane must always read as an MDX-backed document tool.

### Right Pane — Metadata / Workflow Inspector

#### Must always be visible on page load

- inspector heading
- section headers in locked order:
  - `Summary`
  - `Classification`
  - `Timeline`
  - `Workflow Actions`
  - `Notes / Action Composer`
  - `Related Artifacts`
- field row scaffolds inside each section

#### Placeholder until selection/data

- placeholder values for `title`, `planId`, `artifactType`, `status`, `version`, `productL1`, `productL2`, `productL3`, `createdAt`, `updatedAt`
- placeholder owner/reviewer/tags/notes rows
- disabled workflow buttons
- disabled note composer fields and create action
- empty related-artifacts list treatment

#### Live after filesystem/data wiring

- real metadata values
- actual action enablement from lifecycle-state resolution
- dirty-action gating UI
- real note-composer behavior
- real lineage / related artifact links

#### Must never disappear

- entire inspector frame
- section stack
- workflow action area
- notes/composer area

The right pane must always read as a metadata/workflow inspector, not as a message box that appears only after selection.

---

## Phase 1 — State-to-Visibility Matrix

| State | Left Pane | Center Pane | Right Pane |
|---|---|---|---|
| No directory selected | lifecycle tabs visible; counts show `0` or placeholder; row skeletons or empty-state card inside list | document header, mode controls, and editor frame visible; file/save controls disabled; placeholder copy inside canvas | all inspector sections visible; placeholder metadata rows visible; workflow buttons disabled; note composer disabled |
| Directory loaded, no plan selected | lifecycle tabs and real counts visible; plan rows visible; no active row | same persistent document frame; placeholder file identity; disabled controls; no raw blank pane | same persistent inspector sections; placeholder values remain; actions disabled until selection |
| Plan selected, artifact resolution pending or transitional | selected plan row highlighted; nested artifact rows visible | frame persists; show resolving/loading or placeholder content inside canvas only | section scaffolds persist; may show plan-level placeholder summary until artifact context resolves |
| Artifact selected | selected plan and artifact highlighted; counts remain visible | real filename/artifact identity visible; `MdxEditorSurface` or preview surface mounted; save affordance live | real metadata visible in section order; lifecycle actions visible per approved matrix; note composer active |
| Document dirty | left unchanged except selection remains stable | unsaved indicator visible; save action emphasized; mode controls remain mounted | dirty-action guidance visible; workflow actions remain present but route through `Save / Discard / Cancel` gate |
| Workflow action available | active plan row remains visible in current lifecycle tab until refresh/transition | center frame remains stable during action; if artifact changes, new content replaces old inside same frame | only allowed actions enabled; disallowed actions still visible as disabled or absent by contract; note composer remains separate from lifecycle transition buttons |

Note:

- If selecting a plan immediately resolves and opens the controlling/default artifact, the `plan selected, artifact resolution pending` row is a transient state, not a permanent user-visible mode. The scaffold contract still applies.

---

## Phase 1 — Phase 2 Plan

### Files To Modify

#### `E:\writing-system\web\src\pages\superuser\PlanTracker.tsx`
- strengthen route-level page framing around `Workbench`
- keep the current locked three-column shell
- add tracker-specific shell presence if needed, but do not replace `Workbench`

#### `E:\writing-system\web\src\pages\superuser\usePlanTracker.tsx`
- remove high-level empty-state returns that replace entire panes
- keep left, center, and right pane scaffolds mounted at all times
- move no-selection/no-data handling inside the pane bodies
- keep `MdxEditorSurface` reuse intact

#### `E:\writing-system\web\src\pages\superuser\PlanStateNavigator.tsx`
- ensure pane header, tab strip, list region, and row hierarchy remain visible with placeholder mode
- keep navigator presentational

#### `E:\writing-system\web\src\pages\superuser\PlanMetadataPane.tsx`
- add explicit no-selection placeholder mode
- keep section stack persistent
- add owner / reviewer / tags / notes scaffold rows even when values are absent
- keep workflow area visible even when all actions are disabled

#### `E:\writing-system\web\src\pages\superuser\PlanDocumentPreview.tsx`
- ensure the preview state shares the same document-shell framing as edit/source/diff modes
- no separate “blank pane” behavior

### Optional Extraction Only If Needed

#### `E:\writing-system\web\src\pages\superuser\PlanDocumentShell.tsx`
- extract only if `usePlanTracker.tsx` becomes too conditional to keep readable

#### `E:\writing-system\web\src\pages\superuser\PlanMetadataScaffold.tsx`
- extract only if the placeholder/live split makes `PlanMetadataPane.tsx` overly tangled

### Expected Placeholder-Mode Output

When the route loads before directory selection, the user should already see:

- a real lifecycle navigator on the left
- a real document workspace frame in the center
- a real metadata/workflow inspector on the right

Specifically:

- lifecycle tabs with zero/placeholder counts
- plan-row skeletons or explicit empty-state list card
- document header and disabled mode controls
- visible file/status strip
- editor-frame placeholder
- right-column section headers
- placeholder metadata rows
- disabled workflow buttons using shared button styles
- note composer frame with disabled inputs
- related-artifacts section scaffold

If the page could plausibly host a different feature at this point, Phase 2 has failed.

### Playwright Verification Targets For Phase 4

- route load with no directory selected
- directory selected with no active plan
- selected artifact showing real document content
- dirty document state with unsaved indicator visible
- workflow-enabled state showing valid action availability

Pass condition:

- in every state above, the page still reads unmistakably as a plan tracker workspace

