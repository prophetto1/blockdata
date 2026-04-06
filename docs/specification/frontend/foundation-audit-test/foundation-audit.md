# Frontend Foundation Audit Report

## Summary

| Metric | Value |
|---|---|
| Shell regions | 3 |
| Token sources | 3 |
| Component roles | 2 |
| Page patterns | 2 |
| Conflict bundles | 2 |
| Clean areas | 2 |
| Sampling mode | full |

## Scope

- Repo: `example-app`
- Audit date: 2026-04-04
- Captures reviewed: `captures/shell-light.png`, `captures/shell-dark.png`, `captures/dashboard-page.png`
- Token files reviewed: `src/styles/tokens.css`, `src/theme/colors.ts`, `tailwind.config.ts`
- Major directories: src/components, src/layouts, src/pages, src/styles, src/theme
- Exclusions: src/legacy/
- Surface area: 4 shell, 3 token, 22 shared components, 14 pages
- Sampling: full

## Shell Ownership Map

| Region | Owner File(s) | Runtime Role | State Owner | Clarity |
|---|---|---|---|---|
| top-header | src/layouts/AppShell.tsx | Renders logo, global nav links, user menu, and theme toggle | src/stores/shellStore.ts | clear |
| left-rail | src/layouts/Sidebar.tsx, src/layouts/CollapsibleNav.tsx | Primary workspace navigation and section switching | -- | conflicting |
| content-area | src/layouts/PageFrame.tsx | Wraps page content with consistent padding and scroll container | -- | clear |

### Shell Notes

- **left-rail:** Two components both render the left rail depending on route. Sidebar.tsx is used on dashboard routes, CollapsibleNav.tsx on workspace routes. No shared state owner.

## Navigation and Rail Structure

### Primary Navigation
src/layouts/Sidebar.tsx, src/layouts/CollapsibleNav.tsx

### Secondary Navigation
None identified.

### Route Mapping
src/router.tsx defines route tree with layout wrappers per section

### Breadcrumb Conventions
No breadcrumbs. Pages use PageHeader with a back-link when nested.

### Action Placement
Primary actions in PageHeader right slot. Table row actions in a dropdown menu.

- [evidence] src/router.tsx groups routes under DashboardLayout and WorkspaceLayout
- [evidence] No <Breadcrumb> component found in codebase

## Token and Theme Inventory

| Source | File(s) | Semantic | Raw Values | Light | Dark | Drift Notes |
|---|---|---|---|---|---|---|
| CSS custom properties | src/styles/tokens.css | yes | no | full | full | -- |
| TypeScript theme object | src/theme/colors.ts | yes | yes | partial | none | Defines a parallel color scale with raw hex values. Some names overlap with CSS tokens but values differ. Dark mode not covered. |
| Tailwind config | tailwind.config.ts | no | yes | partial | partial | Extends default colors with project-specific values that do not reference either the CSS tokens or the TypeScript theme. |

## Component Contract Inventory

| Role | Canonical Candidate(s) | Competing | Owner File(s) | State Coverage |
|---|---|---|---|---|
| data-table | src/components/ui/DataTable.tsx | src/components/dashboard/InlineTable.tsx, src/pages/settings/SettingsGrid.tsx | src/components/ui/DataTable.tsx | default, loading, empty, error |
| page-header | src/components/shell/PageHeader.tsx | -- | src/components/shell/PageHeader.tsx | default |

## Page Pattern Inventory

| Pattern | Strongest Example | Competing Examples | Structure Notes |
|---|---|---|---|
| registry-list | src/pages/ProjectsListPage.tsx | src/pages/dashboard/DashboardListPage.tsx | ProjectsListPage uses PageFrame + DataTable + filter toolbar. DashboardListPage uses its own InlineTable with a custom filter bar. |
| detail-workspace | src/pages/ProjectDetailPage.tsx | -- | Tabs + content area with consistent layout. Only one detail workspace pattern exists. |

## State-Presentation Inventory

### Loading

Inconsistent. Some pages use a shared Spinner component, others use skeleton loaders, two pages use inline 'Loading...' text.

### Empty

Most pages use an EmptyState component. Two dashboard pages render custom empty markup.

### Error

ErrorBoundary at the shell level. Page-level error handling varies: some use toast, some use inline alerts, some have no handling.

### Success

Toast-based via a shared useToast hook. Consistent.

### Permission

No shared pattern. Two pages check permissions inline and render 'Access denied' text.

### Async / Polling

Long-running operations use polling with no shared convention. Three different polling intervals observed.

- [evidence] grep -r 'Spinner' shows 6 imports; grep -r 'Skeleton' shows 4 imports; 'Loading...' literal found in 2 files
- [evidence] src/components/ui/EmptyState.tsx imported in 10 pages; custom empty markup in src/pages/dashboard/
- [evidence] src/hooks/useToast.ts imported consistently for success messages

## Accessibility and Mode-Consistency Notes

- Focus ring visible on interactive elements via Tailwind ring utilities.
- Left rail does not trap focus when open on mobile. Escape key does not close it.
- DataTable has no aria-label or caption. Row selection is mouse-only.
- Dark mode contrast ratios not verified. Some muted-text classes appear low-contrast in captures.

## Conflict Bundles

### Bundle: left-rail-ownership

**Role under dispute:** Primary left-rail navigation component

**Competing implementations:**
1. **Sidebar** (src/layouts/Sidebar.tsx) -- Static navigation for dashboard routes with fixed width and icon+label links
2. **CollapsibleNav** (src/layouts/CollapsibleNav.tsx) -- Collapsible navigation for workspace routes with expand/collapse state and nested sections

**Evidence:**
- [evidence] src/layouts/Sidebar.tsx imported by src/routes/dashboard.tsx
- [evidence] src/layouts/CollapsibleNav.tsx imported by src/routes/workspace.tsx
- [evidence] captures/shell-light.png shows different rail widths: 240px on dashboard, 64px collapsed on workspace
- [evidence] No shared nav state store or consistent width token

**Why no single contract exists:** The two components were built at different times for different sections. Neither was designed to handle the other's use case. No architectural decision was made to unify them.

**Recommended direction:** Unify into a single rail component that supports both static and collapsible modes. CollapsibleNav is the stronger candidate because it already handles the more complex case. The static Sidebar behavior can be expressed as CollapsibleNav with collapse disabled.

**Discussion questions:**
1. Should the rail always be collapsible, or should dashboard routes keep a fixed rail?
2. Should the collapse state persist across navigation or reset per section?
3. Is the 240px/64px width split intentional, or should both modes share a width token?

### Bundle: token-source-fragmentation

**Role under dispute:** Canonical source of color and theme tokens

**Competing implementations:**
1. **CSS custom properties** (src/styles/tokens.css) -- Provides semantic color tokens with full light/dark coverage via CSS variables
2. **TypeScript theme object** (src/theme/colors.ts) -- Provides a palette object for components that consume theme via JS rather than CSS
3. **Tailwind config extensions** (tailwind.config.ts) -- Extends Tailwind's default palette with project-specific utility classes

**Evidence:**
- [evidence] src/styles/tokens.css --color-primary is #3b82f6
- [evidence] src/theme/colors.ts primary is #2563eb
- [evidence] tailwind.config.ts brand-blue is #1e40af
- [evidence] Three different 'primary blue' values across three sources

**Why no single contract exists:** CSS tokens were the original system. The TypeScript theme was added for a charting library that needed JS values. Tailwind extensions were added ad hoc. No reconciliation was done.

**Recommended direction:** Make CSS custom properties the single source of truth. The TypeScript theme should read from CSS variables at runtime or be generated from the same source. Tailwind config should reference CSS variables via var() rather than defining independent values.

**Discussion questions:**
1. Is the charting library's need for JS values still active, or can it consume CSS variables?
2. Should Tailwind extensions be removed entirely in favor of utility classes that reference CSS tokens?
3. Are the three different 'primary blue' values intentional (different contexts) or accidental drift?

## Clean Areas

### page-header

Single PageHeader component used consistently across all 14 pages. No competing implementations. Clear ownership in src/components/shell/PageHeader.tsx.

- [evidence] grep -r 'PageHeader' shows import in all 14 page files
- [evidence] No other page-header-like components found in codebase

### success-messaging

All success feedback uses the shared useToast hook. No competing patterns.

- [evidence] src/hooks/useToast.ts is the only success notification mechanism
- [evidence] grep -r 'toast' shows consistent usage across mutation handlers

## Recommended Directions

1. **left-rail-ownership:** Unify into a single rail component that supports both static and collapsible modes. CollapsibleNav is the stronger candidate because it already handles the more complex case. The static Sidebar behavior can be expressed as CollapsibleNav with collapse disabled.
2. **token-source-fragmentation:** Make CSS custom properties the single source of truth. The TypeScript theme should read from CSS variables at runtime or be generated from the same source. Tailwind config should reference CSS variables via var() rather than defining independent values.

## Unresolved Decisions

1. Should the rail always be collapsible, or should dashboard routes keep a fixed rail? *(from: left-rail-ownership)*
2. Should the collapse state persist across navigation or reset per section? *(from: left-rail-ownership)*
3. Is the 240px/64px width split intentional, or should both modes share a width token? *(from: left-rail-ownership)*
4. Is the charting library's need for JS values still active, or can it consume CSS variables? *(from: token-source-fragmentation)*
5. Should Tailwind extensions be removed entirely in favor of utility classes that reference CSS tokens? *(from: token-source-fragmentation)*
6. Are the three different 'primary blue' values intentional (different contexts) or accidental drift? *(from: token-source-fragmentation)*

## Suggested Next Artifact

The next artifact should be the canonical frontend foundation contract, derived from this audit and the resolved discussion decisions.
