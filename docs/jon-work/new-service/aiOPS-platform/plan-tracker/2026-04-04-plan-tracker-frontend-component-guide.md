# Plan Tracker Frontend Component Guide

**Date:** 2026-04-04
**Purpose:** Help another developer understand the current plan-tracker frontend, the reusable primitives that already exist in the repo, and where the current implementation drifted from the intended design.
**Companion Files:** `docs/plans/dev-only/plan-tracker/2026-04-04-plan-tracker-frontend-code-bundle.md`, `docs/plans/dev-only/plan-tracker/2026-04-04-plan-tracker-implementation-status-report.md`

## Read This First

The current tracker is not missing core capability. The repo already contains:

- a four-pane shell
- a File System Access API utility layer
- an MDX editor
- an Ark UI / TreeView-backed file-tree component

The current problem is composition. The mounted tracker uses the shell, the filesystem utilities, and the editor, but it does not mount the existing file-tree primitive. Instead, it uses custom derived rails. That makes the tracker functionally filesystem-backed while still failing to make the filesystem legible in the UI.

The safest redesign path is to reuse existing primitives first and only redesign the page-level composition unless a lower-level primitive is clearly blocking the intended UX.

## Relationship Overview

The current mounted relationship is:

- `PlanTracker.tsx`
  - mounts `Workbench.tsx`
  - consumes `usePlanTracker.tsx`
- `usePlanTracker.tsx`
  - uses `fs-access.ts`
  - mounts `PlanUnitsRail.tsx`
  - mounts `PlanArtifactsRail.tsx`
  - mounts `PlanMetadataPane.tsx`
  - mounts `MdxEditorSurface.tsx`
  - can render `PlanDocumentPreview.tsx`

The important reusable primitive that exists but is not mounted is:

- `WorkspaceFileTree.tsx`
  - already uses the File System Access API
  - already uses the Ark UI / TreeView stack
  - already exposes a real directory/file structure UI

## 1. `web/src/pages/superuser/PlanTracker.tsx`

This is the page entry point for the tracker route. Its job is intentionally small: set the shell header title, instantiate the tracker hook, and mount the `Workbench` with a fixed four-pane layout. It is not where the data model lives and it is not where the workflow logic lives. It is the page-level composition layer.

In the current implementation, this file proves that the tracker has a dedicated route and that the workbench shell is already wired. The route-level behavior is correct: the page mounts, the shell appears, and the layout is locked to four panes. The problem is not that this file is broken. The problem is that this file currently composes a visually raw shell and delegates too much of the visible product identity to lower-level empty states.

For the redesign, this file is one of the first places to review because it owns the overall presentation framing. If the new design needs stronger page-level structure, section framing, or tracker-specific shell chrome, this is the first place to change. It should remain the page-level mount for `Workbench` unless the redesign proves that `Workbench` itself is the limiting factor.

Relationship summary:

- Mounts: `Workbench.tsx`
- Depends on: `usePlanTracker.tsx`
- Should remain: page entry point
- Likely redesign target: yes

## 2. `web/src/pages/superuser/usePlanTracker.tsx`

This is the real orchestration layer for the tracker. It owns the browser-local plan-tracker behavior: directory selection, persisted directory handle restore, recursive markdown discovery, metadata parsing, grouping files into plan units and artifacts, selected plan state, selected artifact state, document content state, dirty-state handling, save behavior, and the artifact-backed workflow actions.

This file is where the File System Access API is actually mounted into the tracker. It imports and uses `pickDirectory`, `readDirectory`, `readFileContent`, `restoreDirectoryHandle`, `saveDirectoryHandle`, `writeFileContent`, and `createFile` from `fs-access.ts`. It also mounts `MdxEditorSurface.tsx` in the document pane and routes metadata/action behavior into `PlanMetadataPane.tsx`.

The key thing for the next developer to understand is that this file is behaviorally important and visually over-responsible. Right now it not only owns the data and workflow semantics, it also decides most pane-level empty-state rendering through `renderContent`. That means the design correction will probably need to split or simplify some of the rendering responsibility here. The hook should stay the source of truth for data and actions, but it should not be forced to carry the entire visual design contract by itself.

Relationship summary:

- Uses: `fs-access.ts`
- Uses: `planTrackerModel.ts`
- Mounts: rails, metadata pane, editor, preview
- Should remain: behavioral orchestrator
- Likely redesign target: yes, especially for visible empty-state and content composition

## 3. `web/src/pages/superuser/PlanUnitsRail.tsx`

This is the current primary rail component. It takes grouped `PlanUnit` data and renders plans grouped by status such as `to-do`, `in-progress`, and `under-review`. It is intentionally simple: it receives already-derived plan units, groups them in a fixed order, and renders buttons for plan selection.

The component is useful because it expresses one of the core product decisions clearly: one row in the primary rail represents one plan unit, not one raw file. That abstraction is still valid and should probably remain part of the design. The problem is that the rail currently reads more like a plain list than a purpose-built tracker rail, and it does not make the connection to the underlying filesystem legible.

For the redesign, this file should be treated as the “plan grouping rail,” not as a replacement for the actual file tree. It should either coexist with the Ark UI file tree or be visually reworked so the relationship between grouped plan units and real files is obvious. The current component can be reused structurally, but it needs better hierarchy, stronger section identity, and clearer coordination with the artifact/file pane.

Relationship summary:

- Consumes: grouped `PlanUnit[]`
- Does: plan grouping and plan selection
- Does not: reflect raw filesystem structure
- Likely redesign target: yes

## 4. `web/src/pages/superuser/PlanArtifactsRail.tsx`

This is the current secondary rail component. It renders the artifacts belonging to the selected plan: revisions, evaluations, approvals, implementation notes, and verification notes. It is currently a derived list of artifacts, not an actual tree view. That matters because this is the place where the design drift is most obvious.

The product requirement was not merely “show a second list.” The product requirement was to make the selected plan’s document structure understandable and operational. If the tracker is filesystem-backed, the artifact rail should make the file/artifact structure visible. Right now this rail only shows abstract artifact buttons and type chips. It does not make it clear where the files live, how they relate in the filesystem, or that actions create real sibling markdown files.

For the redesign, this file should be reviewed alongside `WorkspaceFileTree.tsx`. The likely correction is either:

- replace or augment this rail with a real tree-backed artifact/file structure, or
- recompose this pane so the existing Ark UI tree primitive is visible and the artifact summary becomes a layer on top of it

Relationship summary:

- Consumes: selected plan artifacts
- Does: artifact selection
- Missing today: actual file-tree legibility
- Highest-priority redesign target: yes

## 5. `web/src/pages/superuser/PlanMetadataPane.tsx`

This is the right-side workflow pane. It displays extracted metadata for the selected artifact and provides the action buttons that drive the tracker lifecycle: reject, approve, create revision, attach implementation note, and attach verification. It also shows the dirty-state gate by exposing `Save`, `Discard`, and `Cancel` when an action is attempted against a dirty document.

This file matters because it already carries the correct workflow semantics at the UI surface. The action set is correct for the current phase, and the presence of the dirty-action gate is important. What is weak is not the existence of this pane, but the visual treatment. The metadata hierarchy is dense, the panel is not strongly enough differentiated from the other panes, and the action area does not yet feel like an intentional operational control surface.

For the redesign, this file should be preserved as the workflow control pane, not replaced with a generic sidebar. The work here is mostly visual and compositional: better grouping, stronger field hierarchy, clearer primary versus secondary actions, and a better-presented pending-action state.

Relationship summary:

- Receives: selected plan + selected artifact
- Shows: metadata and workflow actions
- Owns: visible action-gating UI
- Likely redesign target: yes, but mostly visual rather than behavioral

## 6. `web/src/pages/superuser/PlanDocumentPreview.tsx`

This file is the read-only markdown preview surface. It strips leading frontmatter, renders the document body through `react-markdown`, and frames the content with a simple pane header. The presence of this file is useful because it proves the repo already has a preview-oriented document surface for the tracker context and does not need a new markdown renderer from scratch.

The current issue is not that this preview is impossible. It is that it is not properly exposed in the tracker’s visible interaction model. The current route centers the experience on the editor surface, while the preview branch exists but is not strongly surfaced as part of the visible design contract. That makes the preview feel optional and half-connected, even though it could be an important part of a cohesive document-review experience.

For the redesign, this file should be treated as a supporting pane surface. Whether it remains a dedicated preview tab or becomes a mode inside the document pane is a design question, but the underlying component is already usable and does not need to be rewritten first.

Relationship summary:

- Does: read-only markdown rendering
- Reuses: `react-markdown` stack
- Missing today: strong exposure in the mounted tracker experience
- Likely redesign target: maybe, but lower priority than tree/rail composition

## 7. `web/src/pages/superuser/MdxEditorSurface.tsx`

This is the existing MDX editor primitive. It is a substantial reusable component, not a tracker-specific toy. It already handles rich-text editing, source and diff modes, code blocks, tables, frontmatter editing, markdown shortcuts, and save callbacks. In other words, the editor piece the tracker needs was already in the codebase and is already wired into the route through `usePlanTracker.tsx`.

This component is not the main problem. It is one of the strongest reused primitives in the current implementation. The reason it still feels wrong inside the tracker is contextual: the surrounding shell and pane framing do not yet make the editor feel like part of a coherent plan-review tool. The editor itself is not what failed to land.

For the redesign, the default assumption should be to keep this component and change the surrounding composition first. Only revisit this file if the tracker needs editor chrome changes, a different default mode, better file-path context, or better integration with the plan-specific shell.

Relationship summary:

- Mounted by: `usePlanTracker.tsx`
- Role: main editable document surface
- Already reusable and real: yes
- Redesign target: only if page-level integration still feels wrong after shell fixes

## 8. `web/src/pages/superuser/WorkspaceFileTree.tsx`

This is the missing primitive in the mounted tracker. It already exists in the repo and already does the thing the tracker needed: it is an Ark UI / TreeView-backed file tree that uses the File System Access API, supports directory open/reconnect behavior, renders actual directory/file structure, and exposes hooks for file selection and tree operations. It is the clearest proof that the repo already had the ingredients for a more legible filesystem-backed tracker.

This file matters not because it must be dropped in unchanged, but because it proves there was no technical blocker to showing a real file tree. The mounted tracker currently hides the filesystem behind derived rails. This component is the direct counterexample to that design mistake. It can either be mounted directly in the tracker or used as the implementation reference for a tracker-specific artifact tree that still exposes real file paths and folder structure.

For the redesign, this file should be reviewed very early. If the other dev can integrate it cleanly into the second pane or into a hybrid first/second-pane model, that will likely fix the biggest conceptual gap in the current UI.

Relationship summary:

- Exists in repo: yes
- Mounted in tracker today: no
- Provides: real Ark UI file tree backed by filesystem handles
- Highest-value reuse candidate: yes

## 9. `web/src/lib/fs-access.ts`

This is the browser-local filesystem utility layer. It is the real File System Access API integration used by the superuser workspace surfaces. It already covers recursive directory reads, file content reads and writes, file creation, move/delete operations, and directory-handle persistence and restore. Both the existing tree primitive and the current tracker hook depend on this file.

This is important because it means the filesystem behavior is already centralized properly. The redesign should not create a second file-access layer. The right move is to continue using this module as the single source of truth for browser-local file operations. The issue is not in this file; the issue is that the UI composed on top of it is not yet exposing the filesystem well enough.

For the redesign, this file should mostly be treated as stable infrastructure. Revisit it only if a missing operation is required by the new tracker UX. Otherwise, preserve it and design the page around it.

Relationship summary:

- Used by: `usePlanTracker.tsx`
- Used by: `WorkspaceFileTree.tsx`
- Role: browser-local filesystem utility layer
- Redesign target: probably no

## 10. `web/src/components/workbench/Workbench.tsx`

This is the generic multi-pane workbench shell. It provides the tabbed/paned container model, persisted pane layouts, split-pane behavior, and layout constraints such as fixed column counts, hidden toolbar, and locked layout. The current tracker already uses this file correctly at a basic level: four panes, one tab per pane, no drag, locked layout.

This file matters because it determines whether the tracker shell should remain a workbench composition or become a fully custom page. At the moment, there is not enough evidence that `Workbench.tsx` itself is the problem. The current failure reads more like poor use of a generic shell than a shell that is fundamentally incapable of supporting the right design.

For the redesign, this file should be treated as “include if needed.” The first pass should try to fix the tracker through page-level composition and pane content design. Only go deeper into this component if the page-level work still cannot produce the desired stable rail structure, visual identity, or panel treatment.

Relationship summary:

- Mounted by: `PlanTracker.tsx`
- Role: generic four-pane shell
- Probably reusable: yes
- Review deeply only if page-level fixes are insufficient

## Recommended Reuse Order

If the next developer wants the safest redesign path, the reuse order should be:

1. Keep `fs-access.ts`
2. Keep `MdxEditorSurface.tsx`
3. Keep `Workbench.tsx` unless it proves limiting
4. Reevaluate `usePlanTracker.tsx` as the behavioral orchestrator
5. Recompose the shell so `WorkspaceFileTree.tsx` or its tree behavior becomes visible in the mounted tracker
6. Redesign `PlanUnitsRail.tsx`, `PlanArtifactsRail.tsx`, and `PlanMetadataPane.tsx` around that corrected structure

## Bottom Line

The other developer should not start from zero. Most of the functional primitives already exist and are already working. The main gap is that the current mounted tracker does not express the filesystem-backed reality clearly enough and does not yet deliver the cohesive visual shell that the route needed. The best next step is composition correction, not primitive reinvention.
