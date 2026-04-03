# Classic/Pipeline Nav Alignment Rule And Refactor Plan

**Status:** Draft  
**Date:** 2026-03-28  
**Goal:** Correct the BlockData classic and pipeline shells so they express the same information architecture, with one canonical naming and breadcrumb system, without yet collapsing both shells into one implementation.

## Locked Rule

### Semantic node types

The app nav model must treat every visible nav object as one of:

- `leaf page`
- `section`
- `section child`
- `divider`

### Classic render rule

- `leaf page` renders as a normal clickable row.
- `section` renders as a non-clickable section heading.
- `section child` renders as a clickable row directly under its section heading.
- Classic view does not require a drill interaction to expose section children.

### Pipeline render rule

- `section` renders as the clickable level-1 entry.
- Entering a pipeline drill shows:
  - the back row with the section name
  - a flat list of `section child` rows
- Pipeline drill view must **never** render `section heading` text inside the drill body.
- In pipeline drill view, `section heading` is not a visible UI construct at all.

### Breadcrumb rule

- `leaf page` breadcrumb: `Leaf`
- `section child` breadcrumb: `Section / Child`
- Legacy flattened labels must not appear in breadcrumbs when a `section / child` form exists.

## Locked Naming And Route Rule

- `RAG` is not a user-facing app nav object in this phase.
- `Pipeline Services` is the canonical section name.
- Canonical routes:
  - `/app/pipeline-services`
  - `/app/pipeline-services/knowledge-bases`
  - `/app/pipeline-services/index-builder`
- Compatibility redirects only:
  - `/app/rag` -> `/app/pipeline-services`
  - `/app/rag/:serviceSlug` -> `/app/pipeline-services/:serviceSlug`
  - `/app/knowledge-bases` -> `/app/pipeline-services/knowledge-bases`

This route cleanup applies to the web app surface only. Domain references to RAG outside the app nav and router are not part of this change.

## Refactor Scope

### Shared nav model

Refactor [`web/src/components/shell/nav-config.ts`](/e:/writing-system/web/src/components/shell/nav-config.ts) so the source of truth is section-based rather than two flattened menus that drift independently.

Required outcome:

- Define shared `section` and `section child` data once.
- Derive classic rows and pipeline drill menus from that same source.
- Remove or fold dead legacy exports such as `GLOBAL_MENUS` and `NAV_GROUPS` if they are no longer needed.
- Remove the user-facing classic `RAG` row.

### Classic shell

Refactor [`web/src/components/shell/LeftRailShadcn.tsx`](/e:/writing-system/web/src/components/shell/LeftRailShadcn.tsx) so classic renders:

- standalone leaf pages such as `Assets`
- non-clickable section headings such as `Ingest`, `Build AI / Agents`, `Pipeline Services`, `Settings`
- clickable child rows under each heading

### Pipeline shell

Refactor [`web/src/components/shell/LeftRailShadcn.tsx`](/e:/writing-system/web/src/components/shell/LeftRailShadcn.tsx) so pipeline drill view renders only:

- the back row for the active section
- the flat child list

It must not render `section.label` inside the drill body under any condition.

### Router and links

Refactor these files to make `/app/pipeline-services` canonical:

- [`web/src/router.tsx`](/e:/writing-system/web/src/router.tsx)
- [`web/src/components/pipelines/PipelineCatalogPanel.tsx`](/e:/writing-system/web/src/components/pipelines/PipelineCatalogPanel.tsx)
- [`web/src/pages/PipelineServicesPage.test.tsx`](/e:/writing-system/web/src/pages/PipelineServicesPage.test.tsx)

### Breadcrumb resolution

Refactor [`web/src/components/common/useShellHeaderTitle.tsx`](/e:/writing-system/web/src/components/common/useShellHeaderTitle.tsx) so breadcrumbs resolve from the shared `section / child` ownership model instead of from flattened classic labels.

## File Inventory

Primary implementation files:

- [`web/src/components/shell/nav-config.ts`](/e:/writing-system/web/src/components/shell/nav-config.ts)
- [`web/src/components/shell/LeftRailShadcn.tsx`](/e:/writing-system/web/src/components/shell/LeftRailShadcn.tsx)
- [`web/src/components/common/useShellHeaderTitle.tsx`](/e:/writing-system/web/src/components/common/useShellHeaderTitle.tsx)
- [`web/src/router.tsx`](/e:/writing-system/web/src/router.tsx)
- [`web/src/components/pipelines/PipelineCatalogPanel.tsx`](/e:/writing-system/web/src/components/pipelines/PipelineCatalogPanel.tsx)

Required test files:

- [`web/src/components/shell/nav-config.test.ts`](/e:/writing-system/web/src/components/shell/nav-config.test.ts)
- [`web/src/components/shell/LeftRailShadcn.test.tsx`](/e:/writing-system/web/src/components/shell/LeftRailShadcn.test.tsx)
- [`web/src/components/common/useShellHeaderTitle.test.tsx`](/e:/writing-system/web/src/components/common/useShellHeaderTitle.test.tsx)
- [`web/src/pages/PipelineServicesPage.test.tsx`](/e:/writing-system/web/src/pages/PipelineServicesPage.test.tsx)
- [`web/src/components/pipelines/PipelineCatalogPanel.test.tsx`](/e:/writing-system/web/src/components/pipelines/PipelineCatalogPanel.test.tsx)

## Execution Order

1. Lock canonical route names in tests.
2. Move pipeline links and router paths to `/app/pipeline-services`.
3. Add compatibility redirects from `/app/rag*` and `/app/knowledge-bases`.
4. Replace flattened classic `RAG` with section-based classic rendering.
5. Remove pipeline drill section-heading rendering.
6. Re-point breadcrumb ownership to the shared section/child model.
7. Delete obsolete nav definitions left behind by the old flattening approach.

## Acceptance Criteria

- Classic view renders grouped section headings with child rows.
- Pipeline view renders clickable sections at level 1 and flat child lists in drill view.
- Pipeline drill view renders no section-heading text below the back row.
- No user-facing breadcrumb or menu label says `RAG`.
- `Pipeline Services / Index Builder` is reachable at `/app/pipeline-services/index-builder`.
- `/app/rag` and `/app/rag/index-builder` still resolve through redirects during compatibility period.
- Targeted nav, breadcrumb, and pipeline-services tests pass.

## Verification

Run:

```bash
cd /e/writing-system/web && npm run test -- src/components/shell/nav-config.test.ts src/components/shell/LeftRailShadcn.test.tsx src/components/common/useShellHeaderTitle.test.tsx src/pages/PipelineServicesPage.test.tsx src/components/pipelines/PipelineCatalogPanel.test.tsx
```
