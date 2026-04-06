# Plan Tracker Missing Feature Inventory

Date: 2026-04-05

## Scope

This document records every feature or capability described in the requested source set that does **not** exist in the current repository state.

Requested inputs reviewed in full:

1. `docs/plans/dev-only/plan-tracker/2026-04-03-plan-tracker-workbench-implementation-plan.md`
2. `docs/plans/dev-only/plan-tracker/2026-04-04-plan-tracker-frontend-code-bundle.md`
3. `docs/plans/dev-only/plan-tracker/2026-04-04-plan-tracker-frontend-component-guide.md`
4. `docs/plans/dev-only/plan-tracker/2026-04-04-plan-tracker-frontend-refit-code-bundle.md`
5. `docs/plans/dev-only/plan-tracker/2026-04-04-plan-tracker-implementation-status-report.md`
6. `docs/plans/dev-only/plan-tracker/2026-04-04-plan-tracker-refoundation-takeover-notes.md`
7. `docs/plans/dev-only/plan-tracker/2026-04-04-plan-tracker-workspace-refoundation-implementation-plan.md`
8. `docs/plans/dev-only/plan-tracker/image.png`
9. `docs/plans/dev-only/plan-tracker/image copy.png`

Current implementation compared against:

- `web/src/pages/superuser/PlanTracker.tsx`
- `web/src/pages/superuser/usePlanTracker.tsx`
- `web/src/pages/superuser/planTrackerModel.ts`
- `web/src/pages/superuser/PlanStateNavigator.tsx`
- `web/src/pages/superuser/PlanDocumentPane.tsx`
- `web/src/pages/superuser/PlanMetadataPane.tsx`
- `web/src/pages/superuser/PlanDocumentPreview.tsx`
- `web/src/pages/superuser/MdxEditorSurface.tsx`
- `web/src/pages/superuser/useWorkspaceEditor.tsx`
- `web/src/pages/superuser/WorkspaceFileTree.tsx`
- `web/src/pages/superuser/PlanUnitsRail.tsx`
- `web/src/pages/superuser/PlanArtifactsRail.tsx`
- repo-wide `plan-tracker|PlanTracker|planTracker` search
- `services/platform-api` repo search for any Plan Tracker backend surface

## Findings Summary

- Missing against the **latest refoundation contract**: `6`
- Missing but only described in **older or superseded artifacts**: `12`
- Missing backend/database/edge/platform-api surfaces: `0`

## A. Missing Against The Latest Refoundation Contract

### MF-01. The center document header does not show the actual active file name

Source:

- `2026-04-04-plan-tracker-workspace-refoundation-implementation-plan.md`
- Frozen Storage/View Contract item `7`
- reuse of the `useWorkspaceEditor` document contract

Required behavior:

- the document header keeps the active file legible by showing the actual file name and unsaved state

Current reality:

- `PlanDocumentPane.tsx` shows `artifact.title`, status text, type badge, and version badge
- the actual file name is not surfaced in the mounted document header
- `useWorkspaceEditor.tsx` already has the expected pattern and renders `openFile.node.name`, but the tracker does not reuse that header contract

### MF-02. A reachable rendered preview mode does not exist in the mounted route

Source:

- `2026-04-04-plan-tracker-workspace-refoundation-implementation-plan.md`
- completion criteria and workspace-editor contract reuse language
- `2026-04-03-plan-tracker-workbench-implementation-plan.md`
- `2026-04-04-plan-tracker-frontend-component-guide.md`

Required behavior:

- preview/source/diff handling or an equivalent read-only preview path remains part of the document surface contract

Current reality:

- `PlanDocumentPreview.tsx` exists
- `usePlanTracker.tsx` still has a `document-preview` render branch
- `PLAN_TRACKER_TABS` does not expose `document-preview`
- `PlanDocumentPane.tsx` only exposes `Edit`, `Source`, and `Diff`

Result:

- the preview component exists in code but is effectively unreachable from the mounted tracker UI

### MF-03. Full reuse of the existing workspace-editor document/session contract has not actually landed

Source:

- `2026-04-04-plan-tracker-workspace-refoundation-implementation-plan.md`
- Task 3
- completion criteria item `3`
- `2026-04-04-plan-tracker-refoundation-takeover-notes.md`

Required behavior:

- the tracker is rebased on the existing workspace-editor contract rather than reimplementing a parallel editor/session model

Current reality:

- `usePlanTracker.tsx` still owns a custom document session model, custom file selection model, custom save flow, and custom document pane composition
- `PlanDocumentPane.tsx` uses a custom header and control strip instead of the `useWorkspaceEditor.tsx` file-header pattern
- the tracker does not mount `WorkspaceFileTree.tsx` or `useWorkspaceEditor.tsx`

Result:

- the route reuses `Workbench`, but not the full editor/session/file-header contract that the refoundation docs explicitly pointed to

### MF-04. The phase-1 metadata editability split is only cosmetic, not real

Source:

- `2026-04-04-plan-tracker-workspace-refoundation-implementation-plan.md`
- Locked Metadata Editability Contract
- `2026-04-04-plan-tracker-workspace-refoundation-implementation-plan.md`
- PlanMetadataPane description in the frontend inventory

Required behavior:

- the right pane distinguishes between display-only metadata and metadata that is actually editable in phase 1

Current reality:

- `PlanMetadataPane.tsx` renders `Editable` and `Read only` pills
- no actual metadata editing controls exist for `productL1`, `productL2`, `productL3`, `owner`, `reviewer`, or `tags`
- the only real writable controls in the pane are the note title/body composer inputs

Result:

- the editability contract is represented visually, but not implemented behaviorally

### MF-05. Related artifacts / lineage are not surfaced as actionable links

Source:

- `2026-04-04-plan-tracker-workspace-refoundation-implementation-plan.md`
- Locked Right-Column Inspector Contract

Required behavior:

- related files and lineage links should appear when available

Current reality:

- `PlanMetadataPane.tsx` renders plain text blocks for related artifacts
- timeline only shows a count-like lineage summary string
- there is no click-through behavior to open a related artifact from the right pane

Result:

- lineage is displayed as inert text, not as related-artifact navigation

### MF-06. The refoundation plan said the superseded rail files would be deleted, but they still exist

Source:

- `2026-04-04-plan-tracker-workspace-refoundation-implementation-plan.md`
- Locked File Inventory
- deleted superseded components list

Required behavior:

- `web/src/pages/superuser/PlanUnitsRail.tsx`
- `web/src/pages/superuser/PlanArtifactsRail.tsx`

Current reality:

- both files still exist in `web/src/pages/superuser/`

Result:

- the locked deleted-file inventory is not satisfied

## B. Missing But Described In Older Or Superseded Artifacts

These items are absent in the current repo **and** were explicitly described in the older plan/bundle/screenshot set. Some were later superseded by the 2026-04-04 refoundation plan, but they were still requested inputs and are therefore listed here.

### SF-01. The older four-pane shell does not exist now

Source:

- `2026-04-03-plan-tracker-workbench-implementation-plan.md`
- `2026-04-04-plan-tracker-frontend-refit-code-bundle.md`
- `image.png`

Described behavior:

- primary plan rail
- secondary artifact rail
- center document surface
- right metadata/action pane

Current reality:

- the mounted route is a locked three-pane shell only

### SF-02. The separate secondary artifact rail does not exist now

Source:

- `2026-04-03-plan-tracker-workbench-implementation-plan.md`
- `image.png`

Described behavior:

- a dedicated rail for plan revisions, evaluations, approvals, implementation notes, and verification notes

Current reality:

- artifacts are nested inside the single left navigator instead of living in a separate mounted rail

### SF-03. The dedicated local preview pane/panel does not exist now

Source:

- `2026-04-03-plan-tracker-workbench-implementation-plan.md`
- `2026-04-04-plan-tracker-implementation-status-report.md`
- `image.png`

Described behavior:

- a local Markdown preview panel as a dedicated surface

Current reality:

- there is no mounted preview pane
- there is no reachable preview mode in the current tab set

### SF-04. `Reject with Notes` does not exist now

Source:

- `2026-04-03-plan-tracker-workbench-implementation-plan.md`
- `2026-04-04-plan-tracker-frontend-code-bundle.md`
- `image.png`
- `image copy.png`

Current reality:

- the current workflow matrix uses `Send Back` instead
- no `reject-with-notes` action ID or button exists in current code

### SF-05. `Approve with Notes` does not exist now

Source:

- `2026-04-03-plan-tracker-workbench-implementation-plan.md`
- `2026-04-04-plan-tracker-frontend-code-bundle.md`
- `image.png`
- `image copy.png`

Current reality:

- the current workflow matrix uses `Approve`
- no `approve-with-notes` action ID or button exists in current code

### SF-06. `Create Revision` does not exist now

Source:

- `2026-04-03-plan-tracker-workbench-implementation-plan.md`
- `2026-04-04-plan-tracker-frontend-code-bundle.md`
- `image.png`
- `image copy.png`

Described behavior:

- create a new plan revision artifact
- preserve selected plan-unit identity while switching the active artifact to the new revision
- generate deterministic sibling filenames for the new revision

Current reality:

- there is no `create-revision` action ID
- there is no workflow branch that creates a new `plan` artifact with a bumped version number
- there is no implementation that switches the active artifact to a new revision file

### SF-07. `Attach Implementation Note` does not exist now

Source:

- `2026-04-03-plan-tracker-workbench-implementation-plan.md`
- `2026-04-04-plan-tracker-frontend-code-bundle.md`
- `image.png`

Current reality:

- the current workflow matrix has `Mark Implementing` and `Mark Implemented`
- no `attach-implementation-note` action ID or button exists

### SF-08. `Attach Verification` does not exist now

Source:

- `2026-04-03-plan-tracker-workbench-implementation-plan.md`
- `2026-04-04-plan-tracker-frontend-code-bundle.md`
- `image.png`

Current reality:

- the current workflow matrix has `Request Verification`
- no `attach-verification` action ID or button exists

### SF-09. The older `Draft / Rejected / Approved / Superseded` lifecycle taxonomy does not exist now

Source:

- `image copy.png`
- parts of the 2026-04-03 workbench flow language

Current reality:

- current code normalizes to `to-do`, `in-progress`, `under-review`, `approved`, `implemented`, `verified`, `closed`
- `rejected` and `superseded` are not first-class visible lifecycle tabs in the current route

### SF-10. The older revision lineage flow that creates `plan v2` and supersedes older lineage does not exist now

Source:

- `image copy.png`
- `2026-04-03-plan-tracker-workbench-implementation-plan.md`

Described behavior:

- save through dirty-state gate into a new revision lineage
- produce `plan v2`
- later mark older lineage as superseded

Current reality:

- current code updates the controlling plan artifact in place during workflow transitions
- no lineage-promoting `plan v2` creation exists
- no `superseded` artifact/state transition flow exists

### SF-11. The older `evaluation artifact` flow/terminology does not exist now

Source:

- `image copy.png`
- `2026-04-03-plan-tracker-workbench-implementation-plan.md`

Current reality:

- current code normalizes evaluation-style files into `review-note`
- the UI and workflow surface no longer expose `evaluation artifact` terminology as a first-class action/result

### SF-12. Mounted real file-tree exposure does not exist now

Source:

- `2026-04-04-plan-tracker-frontend-component-guide.md`

Described behavior:

- a mounted or hybrid use of `WorkspaceFileTree.tsx`
- visible real file paths / real filesystem structure as part of the tracker UX

Current reality:

- `WorkspaceFileTree.tsx` exists in the repo
- the tracker route does not mount it
- the current tracker hides the literal filesystem behind derived plan rows and nested artifact rows

## C. Backend / Database / Edge / Platform API Surface

No missing backend, database, edge-function, or platform-api features were found for this audit set.

Reason:

- both the older 2026-04-03 workbench plan and the later 2026-04-04 refoundation plan explicitly lock this work to a browser-local File System Access API implementation
- both controlling plans declare `0` new or modified platform API endpoints
- both controlling plans declare `0` database migrations
- both controlling plans declare `0` edge functions
- repo search under `services/platform-api` produced no Plan Tracker implementation surface

## Bottom Line

The current repo is missing a small number of still-required refoundation features and a larger set of older/superseded capabilities that were explicitly described in the earlier plan/bundle/image set.

The highest-signal missing items against the **current** refoundation contract are:

1. actual active file name in the document header
2. a reachable rendered preview mode
3. real reuse of the workspace-editor contract
4. true editable metadata controls instead of editable badges only
5. clickable related-artifact / lineage navigation
6. deletion of the superseded rail files promised by the refoundation plan
