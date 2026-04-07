# Plan Tracker — Frontend Structural Design Pass (Best-Effort Phase 1)

## Execution status

This artifact is a best-effort Phase 1 output produced from the user-supplied structural-pass brief and the approved-plan conventions shown in the uploaded implementation-plan examples. The named repository files and the approved implementation plan at `E:\writing-system\docs\plans\dev-only\plan-tracker\2026-04-04-plan-tracker-workspace-refoundation-implementation-plan.md` were not accessible in this environment, so file-level inspection and direct code modification could not be completed here.

Because of that limitation:

- the contract below is extracted from the brief itself and from the locked-plan artifact style used in approved implementation plans
- reuse targets are listed from the files the brief explicitly names, but not verified against live source
- no claim is made that Phase 2+ code has been applied on disk

## Design Output / Deliverables Plan

### Phase 1 — Contract extraction and reuse audit

Deliver a locked frontend contract for `/app/superuser/plan-tracker` that defines:

- page purpose and three-pane layout
- always-visible scaffold requirements
- locked inspector section order
- locked lifecycle-state presentation in the navigator
- placeholder-mode requirements for first render
- reuse obligations against existing shell, workbench, editor, token, and shared UI seams
- state-to-visibility matrix
- exact file-touch plan for Phase 2

### Phase 2 — Persistent scaffold / placeholder-mode composition

Materialize the route so the page is unmistakably a plan tracker on first load even with no directory selected:

- left lifecycle navigator scaffold is visible
- center document workspace frame is visible
- right inspector frame is visible with locked section headers
- action affordances and metadata rows render in disabled/placeholder form
- no pane collapses into a generic empty container

### Phase 3 — Component-level refinement and interaction framing

Bind scaffold-level state and interaction rules without changing the approved contract:

- lifecycle tab switching
- plan row selection
- artifact expansion/selection
- editor mount/unmount inside a persistent workspace frame
- dirty-state visibility
- enabled versus disabled workflow affordances

### Phase 4 — Visual verification and structural corrections

Add Playwright coverage for the locked visible states:

- no directory selected
- directory loaded, no plan selected
- plan selected, artifact visible
- dirty editor state
- workflow actions disabled versus enabled

### Phase 5 — Semantic/data wiring (explicitly deferred unless requested)

Wire filesystem reads, metadata parsing, metadata hydration, and workflow action execution into the already-visible scaffold.

## Phase 1 — Contract extraction and reuse audit

## 1. Frontend Contract Summary

### Page purpose and layout

`/app/superuser/plan-tracker` is a browser-local plan-tracker workspace, not a backend-backed admin console. It uses the File System Access API to open and edit real markdown files from disk. The route is a persistent three-column workspace:

- **Left:** lifecycle navigator
- **Center:** document workspace/editor
- **Right:** structured metadata/workflow inspector

This is a workspace page, not a modal flow and not a sequence of conditional empty states.

### Pane roles

#### Left pane — lifecycle navigator

The left pane owns navigation through the plan-tracker lifecycle and plan/artifact hierarchy.

It must present:

- lifecycle tabs in locked order:
  - To Do
  - In Progress
  - Under Review
  - Approved
  - Implemented
  - Verified
  - Closed
- plan-unit rows within the selected lifecycle bucket
- nested artifact rows under a plan unit when expanded
- seeded counts or skeleton counts even before real data is loaded

The navigator is metadata-driven. It is never replaced by a generic “select a directory” panel.

#### Center pane — MDX document workspace

The center pane owns the document workspace for real markdown content.

It must always show a product-specific workspace frame containing:

- workspace header
- filename/status region
- editor mode controls
- document body frame

The editor area may be empty or placeholder until a plan or artifact is selected, but the workspace frame itself must exist from first render.

#### Right pane — metadata/workflow inspector

The right pane owns the structured plan/artifact inspector.

Its section order is locked and must always render in this order:

1. Summary
2. Classification
3. Timeline
4. Workflow Actions
5. Notes / Action Composer
6. Related Artifacts

These section headers are part of pane identity and must remain visible regardless of selection state.

### Always-visible structures versus conditional content

#### Always visible on page load

- three-pane workspace composition
- lifecycle tab strip and navigator frame
- center document workspace frame
- right inspector frame
- locked inspector section headers
- mode controls in the editor frame
- placeholder metadata rows and workflow action affordances

#### Conditional content allowed inside fixed scaffolds

- selected plan title/details
- selected artifact details
- real markdown body
- actual workflow action enablement
- filesystem status and sync messaging
- expanded artifact trees
- populated notes/action composer content
- related-artifact entries

#### Not allowed

- hiding entire panes when no selection exists
- replacing the center pane with a generic empty-state card
- delaying right-pane section headers until metadata is loaded
- rendering the page as a generic editor shell that could belong to any feature

### Locked section order, metadata fields, workflow actions, and lifecycle states

#### Locked lifecycle states

The brief explicitly locks these states:

- To Do
- In Progress
- Under Review
- Approved
- Implemented
- Verified
- Closed

#### Locked right-column section order

The brief explicitly locks this inspector order:

- Summary
- Classification
- Timeline
- Workflow Actions
- Notes / Action Composer
- Related Artifacts

#### Placeholder metadata fields explicitly named in the brief

The placeholder-mode requirement explicitly names these metadata rows:

- title
- planId
- artifactType
- status
- version
- productL1
- productL2
- productL3
- createdAt
- updatedAt

The brief also explicitly requires:

- placeholder tag chips
- owner field
- reviewer field

#### Workflow actions explicitly named in the brief

The brief explicitly names disabled workflow action buttons such as:

- Start Work
- Submit for Review

Because the approved implementation plan itself was not accessible here, those are the only workflow actions that can be safely treated as explicitly extracted in this artifact. Any additional actions must be lifted from the approved plan, not invented during implementation.

## 2. Reuse Audit

This reuse audit is constrained by the fact that the named source files were not accessible here. It therefore records the intended reuse targets defined by the brief and the non-reinvention rules that should govern implementation.

### Existing tokens to consume

The brief identifies these as canonical token sources:

- `web/src/tailwind.css` — canonical CSS custom property tokens
- `web/src/lib/color-contract.ts` — TypeScript color tokens
- `web/src/lib/font-contract.ts` — typography tokens
- `web/src/lib/icon-contract.ts` — icon tokens
- `web/src/lib/toolbar-contract.ts` — toolbar pattern contract

#### Reuse rule

No hardcoded hex values. No parallel typography scale. No custom toolbar idiom. No local one-off spacing/radius/color language unless an audit against these files proves a missing token or primitive.

### Existing shared components to use

The brief identifies these shared component families as first-class reuse targets:

- `web/src/components/ui/`
- `web/src/components/shell/`
  - TopCommandBar
  - LeftRailShadcn
  - ShellPageHeader
- `web/src/components/common/`
  - ErrorAlert
  - AppBreadcrumbs

#### Reuse rule

The page should inherit shell framing, headers, rails, cards, separators, badges, buttons, tabs, sheets, alerts, and empty-state framing from shared components before introducing any feature-local replacement.

### Existing layout / workbench / editor primitives to use

The brief explicitly calls out these feature-level reuse seams:

- `web/src/components/workbench/Workbench.tsx` — reuse as-is
- `web/src/pages/superuser/MdxEditorSurface.tsx` — reuse as-is
- `web/src/pages/superuser/TestIntegrations.tsx` — three-column workspace reference
- `web/src/pages/superuser/useWorkspaceEditor.tsx` — workspace editor contract reference

#### Reuse rule

The route should compose the plan tracker from the established workspace shell and editor seams rather than building a new custom three-column shell from raw layout markup.

### Existing feature components that should remain the first implementation target

The brief identifies these existing plan-tracker-specific files to inspect and likely evolve rather than replace:

- `web/src/pages/superuser/PlanTracker.tsx`
- `web/src/pages/superuser/usePlanTracker.tsx`
- `web/src/pages/superuser/planTrackerModel.ts`
- `web/src/pages/superuser/PlanStateNavigator.tsx`
- `web/src/pages/superuser/PlanMetadataPane.tsx`
- `web/src/pages/superuser/PlanDocumentPreview.tsx`

#### Reuse rule

First attempt should be to recompose and harden these files around the locked scaffold. Do not jump immediately to a new parallel page, a new parallel navigator, or a new parallel inspector.

### What must not be reinvented

- shell/page framing
- three-column workspace shell
- editor surface
- toolbar/mode-toggle idiom
- common buttons/badges/cards/separators
- shell header / breadcrumb pattern
- token/color/typography system
- generic error presentation

### Genuinely new components justified only if existing files cannot absorb the contract

The default posture should be **zero new top-level feature components** for Phase 2. Use the existing page and pane files first.

Potentially justifiable additions, only if the existing files prove too entangled:

- a small placeholder-seed module for scaffold counts and field labels
- a narrow visual-test fixture or story helper

Neither should be introduced until inspection proves the current files cannot host those responsibilities cleanly.

## 3. Structural UI Contract (pane by pane)

## Left pane — lifecycle navigator

### Must always be visible on page load

- navigator shell/frame
- lifecycle tab strip
- tab counts or count placeholders
- list surface for plan rows
- nested-row affordance region for artifacts

### Placeholder until selection/data

- seeded plan rows or skeleton rows
- seeded artifact rows or collapsed placeholders
- disabled expand/selection affordances where needed
- placeholder count chips

### Becomes live after filesystem/metadata wiring

- real counts per lifecycle state
- plan-unit labels and statuses
- nested artifact structure
- selection highlight
- expansion state

### Must never disappear or become generic

- the navigator shell
- lifecycle tabs
- the concept of plan and artifact rows

A message like “Choose a directory to begin” may appear inside the pane, but only as supporting copy within a still-identifiable navigator.

## Center pane — document workspace

### Must always be visible on page load

- workspace frame
- workspace header
- filename/status strip
- editor mode controls (Edit / Preview / Source / Diff placeholders)
- editor body frame

### Placeholder until selection/data

- placeholder filename such as “No document selected”
- placeholder save/sync state
- empty editor body state inside the frame
- disabled mode controls if the contract requires them disabled before selection

### Becomes live after filesystem/metadata wiring

- real markdown document mount
- unsaved/dirty indicators
- active mode switching
- file path / filename / last-saved state
- live editor surface via `MdxEditorSurface`

### Must never disappear or become generic

- workspace frame identity
- filename/status region
- mode-control region
- editor body boundaries

The center pane should look like a document workspace even before any document opens.

## Right pane — metadata/workflow inspector

### Must always be visible on page load

- inspector shell/frame
- section headers in locked order:
  - Summary
  - Classification
  - Timeline
  - Workflow Actions
  - Notes / Action Composer
  - Related Artifacts
- separators/cards/section framing

### Placeholder until selection/data

- field-value placeholders for title, IDs, timestamps, product hierarchy, owner/reviewer, tags
- disabled workflow buttons
- empty notes composer frame
- empty related-artifacts rows/cards

### Becomes live after filesystem/metadata wiring

- selected plan/artifact summary values
- editable versus locked fields according to approved plan metadata rules
- enabled workflow transitions when allowed
- notes composer content
- related-artifact population

### Must never disappear or become generic

- inspector shell
- section headers
- workflow-action section
- notes/action-composer frame

The inspector is not optional and cannot be deferred to a later stage.

## 4. State-to-Visibility Matrix

| State | Left pane | Center pane | Right pane |
|---|---|---|---|
| No directory selected | Navigator frame visible; lifecycle tabs visible; seeded/skeleton counts; seeded plan rows or explicit in-pane prompt | Workspace frame visible; header visible; filename/status placeholder visible; mode toggles visible; editor body empty-state inside frame | Inspector frame visible; all locked section headers visible; placeholder metadata rows visible; workflow buttons disabled |
| Directory loaded, no plan selected | Navigator frame visible; real or seeded counts visible; plan rows visible/selectable | Workspace frame visible; no document selected placeholder in filename/status; editor body empty but framed | Inspector frame visible; section headers visible; generic plan-level placeholder fields visible; workflow buttons disabled |
| Plan selected, no artifact selected | Navigator frame visible; selected plan highlighted; artifact rows expandable/visible | Workspace frame visible; plan-level document placeholder or primary plan doc visible depending on contract; mode controls visible | Inspector frame visible; plan metadata populated; workflow button enablement reflects selected plan state |
| Artifact selected | Navigator frame visible; selected artifact highlighted | Workspace frame visible; artifact markdown mounted or preview frame active; filename/status populated | Inspector frame visible; artifact metadata populated; related artifacts populated as available |
| Document dirty | Navigator unchanged except selection remains visible | Unsaved indicator visible in filename/status region; editor remains mounted inside same frame | Inspector remains visible; any workflow action that depends on clean state may disable, but section remains visible |
| Workflow action unavailable | Navigator visible; no structural change | Workspace visible; no structural change | Workflow Actions section visible; relevant buttons disabled with unchanged layout |
| Workflow action available | Navigator visible; no structural change | Workspace visible; no structural change | Workflow Actions section visible; relevant buttons enabled; order unchanged |

## 5. Phase 2 Plan

### Files to modify first

1. `web/src/pages/superuser/PlanTracker.tsx`
   - Recompose the route around a persistent three-pane workspace shell.
   - Ensure all three panes render from first paint.
   - Make the page visually specific even in placeholder mode.

2. `web/src/pages/superuser/PlanStateNavigator.tsx`
   - Lock lifecycle tab order.
   - Ensure plan/artifact list scaffolds always render.
   - Seed or skeletonize counts and rows for no-directory/no-selection states.

3. `web/src/pages/superuser/PlanDocumentPreview.tsx`
   - Convert it from conditional preview-only behavior into a persistent workspace frame.
   - Render header, filename/status strip, and mode-toggle placeholders at all times.
   - Mount `MdxEditorSurface` inside the persistent frame when a document exists.

4. `web/src/pages/superuser/PlanMetadataPane.tsx`
   - Lock section order.
   - Render placeholder rows/cards for Summary, Classification, Timeline, Workflow Actions, Notes/Action Composer, and Related Artifacts even with no selection.
   - Render disabled workflow actions in placeholder mode.

5. `web/src/pages/superuser/usePlanTracker.tsx`
   - Provide stable UI state for directory presence, selected plan, selected artifact, dirty state, and available transitions.
   - Expose enough view-model state to drive persistent scaffolds without each pane inferring its own emptiness rules.

6. `web/src/pages/superuser/planTrackerModel.ts`
   - Preserve the approved metadata schema.
   - Add only scaffold-friendly helpers or view-model typing if needed; do not change the product contract.

### Reference files to inspect and reuse directly during implementation

- `web/src/components/workbench/Workbench.tsx`
- `web/src/pages/superuser/MdxEditorSurface.tsx`
- `web/src/pages/superuser/TestIntegrations.tsx`
- `web/src/pages/superuser/useWorkspaceEditor.tsx`
- `web/src/components/shell/`
- `web/src/components/common/`
- `web/src/components/ui/`
- `web/src/tailwind.css`
- `web/src/lib/color-contract.ts`
- `web/src/lib/font-contract.ts`
- `web/src/lib/icon-contract.ts`
- `web/src/lib/toolbar-contract.ts`

### Placeholder-mode output that Phase 2 should produce

On first page load, the route should visibly read as a plan tracker workspace with:

- a left navigator showing the seven lifecycle tabs, visible counts or count skeletons, and seeded plan rows with nested artifact affordances
- a center document workspace showing a header, a filename/status strip, an editor frame, and visible Edit / Preview / Source / Diff controls
- a right inspector showing six locked section headers in order and placeholder content beneath each
- disabled workflow actions such as Start Work and Submit for Review
- metadata field rows for title, planId, artifactType, status, version, product hierarchy, timestamps, tags, owner, and reviewer

### Playwright visual checks Phase 4 should add

1. **No directory selected**
   - Assert all three pane shells are visible.
   - Assert lifecycle tabs are visible.
   - Assert center workspace header and mode controls are visible.
   - Assert right inspector section headers are visible.

2. **Directory selected, no plan selected**
   - Assert navigator shows populated or semi-populated rows.
   - Assert center still shows a framed workspace, not a blank page.
   - Assert inspector still shows placeholder sections.

3. **Plan selected, artifact visible**
   - Assert selected row highlight.
   - Assert document workspace shows selected filename/content.
   - Assert inspector metadata is populated.

4. **Dirty document state**
   - Assert unsaved/dirty indicator is visible in the document workspace.

5. **Workflow disabled vs enabled**
   - Assert button disabled state in one scenario and enabled state in another without pane collapse or layout shift.

## Blocker note

The next correct step is to inspect the actual repo files listed in the brief and then apply the Phase 2 modifications directly. That could not be completed in this environment because the referenced repo and plan-tracker source files were not accessible.
