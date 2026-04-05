# Frontend Foundation Audit Report

## Summary

| Metric | Value |
|---|---|
| Shell regions | 6 |
| Token sources | 9 |
| Component roles | 6 |
| Page patterns | 6 |
| Conflict bundles | 6 |
| Clean areas | 9 |
| Sampling mode | sampled |

## Scope

- Repo: `writing-system/web`
- Audit date: 2026-04-04
- Captures reviewed: none
- Token files reviewed: `web/src/tailwind.css`, `web/src/theme.css`, `web/src/lib/color-contract.ts`, `web/src/lib/font-contract.ts`, `web/src/lib/icon-contract.ts`, `web/src/lib/iconTokens.ts`, `web/src/lib/toolbar-contract.ts`, `web/src/lib/styleTokens.ts`, `web/src/scalar-host/theme-contract.ts`, `web/src/styles/mdxeditor-overrides.css`, `web/src/lib/agGridTheme.ts`, `web/src/lib/codemirrorTheme.ts`
- Major directories: web/src/components, web/src/pages, web/src/lib, web/src/styles, web/src/auth, web/src/hooks, web/src/contexts, web/src/scalar-host
- Exclusions: web/src/components/marketing, web/src/pages/experiments
- Surface area: 30 shell, 30 token, 273 shared components, 178 pages
- Sampling: sampled -- Shell, tokens, and navigation audited in full. Page patterns sampled by structural type (list, detail, settings, workspace, admin). 273 shared components — sampled by directory (ui, shell, common, layout, flows, agchain, admin). Feature-specific one-offs (pipelines, documents, blocks, kv, agents, mcp) skipped unless they surfaced a foundation-level conflict.

## Shell Ownership Map

| Region | Owner File(s) | Runtime Role | State Owner | Clarity |
|---|---|---|---|---|
| top-header | web/src/components/shell/TopCommandBar.tsx | Fixed top bar with search, project switcher, theme toggle. Shared across AppLayout and AgchainShellLayout. | web/src/components/shell/HeaderCenterContext.tsx | clear |
| left-rail-primary | web/src/components/shell/LeftRailShadcn.tsx | Main app sidebar navigation with collapsible/compact mode, project switcher, workspace selector | web/src/components/shell/nav-config.ts | clear |
| left-rail-secondary | web/src/components/admin/AdminLeftNav.tsx, web/src/components/agchain/AgchainLeftNav.tsx, web/src/components/agchain/AgchainBenchmarkNav.tsx, web/src/components/agchain/settings/AgchainSettingsNav.tsx, web/src/components/flows/FlowsDetailRail.tsx | Section-specific secondary navigation rails for admin, AGChain, and flows detail surfaces | -- | ambiguous |
| right-rail | web/src/components/shell/RightRailShell.tsx | Right panel container for help content and AI chat. Toggleable, with detachable chat window. | web/src/components/shell/RightRailContext.tsx | clear |
| content-area | web/src/components/layout/AppLayout.tsx, web/src/components/layout/AdminShellLayout.tsx, web/src/components/layout/AgchainShellLayout.tsx, web/src/components/layout/FlowsShellLayout.tsx | Four authenticated shell layouts each frame <main> differently: AppLayout uses AppPageShell for constrained/fluid modes; AdminShellLayout uses fixed two-column; AgchainShellLayout mirrors AppLayout with AGChain workspace context; FlowsShellLayout uses full-height fixed sidebar + content. | -- | ambiguous |
| public-shells | web/src/components/layout/MarketingLayout.tsx, web/src/components/layout/PublicFullBleedLayout.tsx, web/src/components/layout/PublicLayout.tsx | Three public-facing layouts: MarketingLayout for landing/integrations pages, PublicFullBleedLayout for login/register, PublicLayout for auth callbacks. All share PublicNav header. | -- | clear |

### Shell Notes

- **top-header:** Single implementation. Pages inject title/actions via HeaderCenterProvider context.
- **left-rail-primary:** Single primary rail for /app/* routes under AppLayout. Other shell layouts use section-specific secondary rails instead.
- **left-rail-secondary:** Five different secondary nav components with no shared base, contract, or width token. Each section builds its own rail from scratch. AdminLeftNav serves superuser + blockdata-admin + agchain-admin. AgchainLeftNav serves /app/agchain/*. FlowsDetailRail serves /app/flows/:id/*. Two AGChain sub-navs (Benchmark, Settings) add a third level.
- **right-rail:** Single implementation with clear context provider. Persists open/closed and active tab to localStorage.
- **content-area:** AppLayout and AgchainShellLayout overlap significantly (both have header + left rail + optional right rail + content). AdminShellLayout and FlowsShellLayout serve genuinely different layouts. The overlap between AppLayout and AgchainShellLayout is the main ambiguity.
- **public-shells:** Intentionally separate layouts for distinct public surfaces. No overlap or conflict — each serves a unique route group.

## Navigation and Rail Structure

### Primary Navigation
web/src/components/shell/LeftRailShadcn.tsx, web/src/components/shell/nav-config.ts

### Secondary Navigation
web/src/components/admin/AdminLeftNav.tsx, web/src/components/agchain/AgchainLeftNav.tsx, web/src/components/agchain/AgchainBenchmarkNav.tsx, web/src/components/agchain/settings/AgchainSettingsNav.tsx, web/src/components/flows/FlowsDetailRail.tsx

### Route Mapping
web/src/router.tsx defines the full route tree with nested layout wrappers. Routes group under MarketingLayout, PublicFullBleedLayout, PublicLayout (public), and AuthGuard → AppLayout, AdminShellLayout, AgchainShellLayout, FlowsShellLayout (authenticated).

### Breadcrumb Conventions
AppBreadcrumbs component exists but usage scope not fully traced. Pages primarily use ShellPageHeader via HeaderCenterContext for page identity.

### Action Placement
Primary actions placed in page headers via HeaderCenterContext right slot. Table row actions use dropdown menus. Toolbar actions use toolbar-contract.ts patterns.

- [evidence] web/src/router.tsx groups routes under layout components with nested Outlet rendering
- [evidence] web/src/components/shell/LeftRailShadcn.tsx is the sole primary rail
- [evidence] web/src/components/shell/nav-config.ts defines navigation items and drill configs
- [evidence] 5 different secondary navigation components with no shared base

## Token and Theme Inventory

| Source | File(s) | Semantic | Raw Values | Light | Dark | Drift Notes |
|---|---|---|---|---|---|---|
| CSS custom properties (tailwind.css) | web/src/tailwind.css | yes | yes | full | full | Primary token source. 100+ CSS variables with complete light/dark via :root and :root[data-theme='light']. Also contains @theme inline mapping for Tailwind utility generation. Includes shell layout dimension tokens (header height, navbar width, content max-width). |
| AG Grid / data grid theming (theme.css) | web/src/theme.css | no | yes | partial | partial | 2,235 lines of AG Grid and react-data-grid (rdg) customization. Uses color-mix() utilities and references some CSS custom properties but also contains raw values. Grid-specific, not foundation-wide. |
| TypeScript color contract | web/src/lib/color-contract.ts | yes | yes | full | full | Exports SURFACE_TOKENS, TEXT_TOKENS, BORDER_TOKENS, BRAND_TOKENS, ADMIN_CONFIG_TOKENS with hex pairs + cssVar references. Used by superadmin Design Standards page for live comparison. Should be the TypeScript accessor for CSS tokens, not an independent source. |
| TypeScript font contract | web/src/lib/font-contract.ts | yes | yes | full | full | FONT_FAMILIES, FONT_SIZES (2xs-4xl), FONT_WEIGHTS, FONT_RECIPES (11 usage recipes mapping contexts to Tailwind classes). Clean, well-structured. |
| TypeScript icon contract | web/src/lib/icon-contract.ts, web/src/lib/iconTokens.ts | yes | no | full | full | Two icon token files: icon-contract.ts (ICON_SIZES, ICON_CONTEXT_SIZE, ICON_STROKES, ICON_TONE_CLASS) and iconTokens.ts (defineIconToken factory for shell icons). icon-contract.ts notes Hugeicons migration in progress. iconTokens.ts may be superseded by migration. |
| TypeScript toolbar contract | web/src/lib/toolbar-contract.ts | yes | no | full | full | -- |
| Runtime style tokens (styleTokens.ts) | web/src/lib/styleTokens.ts | yes | yes | partial | partial | Runtime object with shell dimensions (header 60px/44px, navbar 220px/60px), grid light/dark color objects with raw hex, marketing tokens, admin nav width. Overlaps with CSS custom properties for shell dimensions. Grid colors duplicate what agGridTheme.ts consumes. |
| Scalar host theme bridge | web/src/scalar-host/theme-contract.ts | yes | no | full | full | Maps 40+ shell tokens to Scalar API client tokens. Intentional bridge, not a competing source. Clean. |
| Raw hex bypasses in UI primitives | web/src/components/ui/accordion.tsx, web/src/components/ui/checkbox.tsx, web/src/components/ui/collapsible.tsx, web/src/components/ui/combobox.tsx, web/src/components/ui/dialog.tsx, web/src/components/ui/file-upload.tsx, web/src/components/ui/menu.tsx | no | yes | none | partial | 7 Ark UI primitive wrappers use hardcoded hex: border-[#3a3a3a] (dark border), hover:bg-[#222221] (dark hover), outline-[#e2503f] (focus ring ~primary). These bypass --border, --accent, --primary tokens entirely. No light mode equivalents — dark-only hex values. This is the primary token system drift. |

## Component Contract Inventory

| Role | Canonical Candidate(s) | Competing | Owner File(s) | State Coverage |
|---|---|---|---|---|
| data-grid | web/src/components/blocks/BlockViewerGridRDG.tsx | web/src/components/marketing/MarketingGrid.tsx, web/src/pages/settings/SettingsGridSample.tsx | web/src/components/blocks/BlockViewerGridRDG.tsx | default, loading, empty |
| empty-state | web/src/components/agchain/AgchainEmptyState.tsx | web/src/components/flows/tabs/FlowEmptyState.tsx | web/src/components/agchain/AgchainEmptyState.tsx | empty |
| error-alert | web/src/components/common/ErrorAlert.tsx | -- | web/src/components/common/ErrorAlert.tsx | error |
| skeleton-loader | web/src/components/ui/skeleton.tsx | -- | web/src/components/ui/skeleton.tsx | loading |
| page-header | web/src/components/shell/ShellPageHeader.tsx | -- | web/src/components/shell/ShellPageHeader.tsx | default |
| breadcrumbs | web/src/components/common/AppBreadcrumbs.tsx | -- | web/src/components/common/AppBreadcrumbs.tsx | default |

## Page Pattern Inventory

| Pattern | Strongest Example | Competing Examples | Structure Notes |
|---|---|---|---|
| registry-list | web/src/pages/Projects.tsx | web/src/pages/superuser/PlanTracker list views | Projects.tsx: data table with pagination, loading, and toast feedback. Superuser list pages (FlowsList, plan tracker) use similar table pattern but with different table components. |
| detail-workspace | web/src/pages/flows/FlowDetail (via FlowsShellLayout) | web/src/pages/superuser/ workspace editors | FlowDetail uses FlowsShellLayout with fixed sidebar rail + main content with tabs. Superuser workspace editors use AdminShellLayout with a different rail pattern. |
| settings-page | web/src/pages/settings/SettingsLayout.tsx | web/src/components/agchain/settings/AgchainSettingsNav.tsx | SettingsLayout wraps /app/settings/* under AppLayout. AGChain has its own settings surface under AgchainShellLayout with a separate settings nav. Two settings architectures. |
| admin-table-inspector | web/src/pages/superuser/PlanMetadataPane.tsx | -- | Table + inspector pane pattern used in superuser surfaces. AdminShellLayout provides the two-column frame. Inspector panes appear as rails. |
| agchain-workspace | web/src/pages/agchain/ (40 files) | -- | 40 AGChain page files under AgchainShellLayout with AgchainWorkspaceProvider context. Workspace-scoped with organization/project selection. Distinct surface with its own nav, settings, and empty states. |
| database-explorer | web/src/pages/DatabasePlaceholder.tsx | -- | Multi-panel explorer with table catalog sidebar, column metadata, row grid. Handles catalog loading, row loading, empty, and error states individually. |

## State-Presentation Inventory

### Loading

Mixed. AuthGuard and SuperuserGuard use inline spinners/text ('Verifying access...'). AgchainProjectPlaceholderPage uses 'Loading AGChain project...' text. DatabasePlaceholder tracks loadingCatalog and loadingRows separately. Skeleton component exists but is not the universal pattern.

### Empty

Fragmented. AgchainEmptyState (card with title/description/action) and FlowEmptyState (gradient icon + title/subtitle) serve the same role with different visual language. DatabasePlaceholder has inline 'No tables match...' and 'No rows...' text. No shared foundation EmptyState component.

### Error

ErrorAlert component exists in components/common/ but is not universally used. AGChain placeholder pages have their own error-with-retry pattern. SuperuserGuard has inline error text with retry. No ErrorBoundary at shell level detected.

### Success

Consistent. Sonner toast library via UIProvider positioned top-right with rich colors. toast() imported from 'sonner' across pages.

### Permission

Well-structured. AuthGuard redirects unauthenticated to /login. SuperuserGuard handles three admin surface tiers (superuser, blockdata-admin, agchain-admin) with AdminSurfaceGuard. Auth bypass available via VITE_AUTH_BYPASS in development.

### Async / Polling

No shared long-running/polling pattern identified. Suspense used in one place (useWorkspaceEditor for lazy-loaded editors).

- [evidence] web/src/auth/AuthGuard.tsx shows spinner during session check, redirects to /login
- [evidence] web/src/pages/superuser/SuperuserGuard.tsx shows 'Verifying access...' with retry
- [evidence] web/src/components/agchain/AgchainEmptyState.tsx and web/src/components/flows/tabs/FlowEmptyState.tsx are two competing empty state components
- [evidence] web/src/components/common/ErrorAlert.tsx is the only shared error component
- [evidence] web/src/components/ui/provider.tsx renders Toaster from sonner at top-right
- [evidence] web/src/components/ui/skeleton.tsx exports Skeleton with animate-pulse

## Accessibility and Mode-Consistency Notes

- Focus rings present on interactive elements via Tailwind ring utilities and outline-[#e2503f] in UI primitives, but the focus ring color is hardcoded hex rather than using --ring token.
- Three icon libraries with different size conventions may produce inconsistent touch targets.
- No ARIA landmarks audited at shell level beyond semantic HTML elements (<header>, <nav>, <main>, <aside>).
- Dark mode uses :root[data-theme='light'] override pattern — contrast ratios for muted text not verified.
- UI primitive hex bypasses (#3a3a3a borders) are dark-mode-only values with no light mode equivalent, which would break if the component is rendered in light mode with the hardcoded border.

## Conflict Bundles

### Bundle: icon-library-fragmentation

**Role under dispute:** Canonical icon library and icon component contract

**Competing implementations:**
1. **Tabler Icons** (@tabler/icons-react (101 importing files)) -- Legacy/primary icon library with widest current usage across the codebase
2. **Hugeicons** (@hugeicons/react (27 importing files)) -- Migration target per icon-contract.ts. Richer icon set with stroke weight control. Used in newer components.
3. **Lucide React** (lucide-react (8 importing files)) -- Used in UI primitives (likely from shadcn/ui scaffolding). Lightweight, consistent with shadcn conventions.

**Evidence:**
- [evidence] grep shows @tabler/icons-react imported in 101 files
- [evidence] grep shows @hugeicons/react imported in 27 files
- [evidence] grep shows lucide-react imported in 8 files
- [evidence] web/src/lib/icon-contract.ts ICON_STANDARD notes 'Hugeicons migration in progress'
- [evidence] web-docs/src/content/docs/internal/style-guide/icon-unification.md documents full migration plan

**Why no single contract exists:** Three icon libraries accumulated over time. Tabler was the original choice. Hugeicons was selected as the migration target for its richer set and stroke control. Lucide came in via shadcn/ui primitives. Migration plan exists in docs but Phase 1 has not been executed. All three coexist in production.

**Recommended direction:** Execute the documented Hugeicons migration plan. Hugeicons is already the declared target with an AppIcon abstraction planned. Phase 1 (foundation: AppIcon redesign, nav config, UI primitives, shell) should precede Phase 2 (systematic file-by-file migration). Decision rule 2 (broadest legitimate reuse) favors Tabler short-term but rule 6 (easiest to enforce) favors Hugeicons with the AppIcon contract.

**Discussion questions:**
1. Is the Hugeicons migration still the intended direction, or has the team reconsidered?
2. Should the AppIcon abstraction be built first (gating all future icon usage) or should migration proceed file-by-file?
3. What is the timeline priority for icon migration vs other foundation work?

### Bundle: raw-hex-token-bypass-in-ui-primitives

**Role under dispute:** Token system compliance in Ark UI wrapper components

**Competing implementations:**
1. **CSS custom property tokens** (web/src/tailwind.css) -- Semantic border, accent, and primary tokens with full light/dark coverage (--border, --accent, --primary, --ring)
2. **Hardcoded hex values in UI primitives** (web/src/components/ui/accordion.tsx, checkbox.tsx, collapsible.tsx, combobox.tsx, dialog.tsx, file-upload.tsx, menu.tsx) -- Quick dark-mode-specific styling for Ark UI component wrappers. Uses #3a3a3a (border), #222221 (hover bg), #e2503f (focus ring), #f47a5c (checked state).

**Evidence:**
- [evidence] web/src/components/ui/accordion.tsx uses border-[#3a3a3a] and outline-[#e2503f]
- [evidence] web/src/components/ui/combobox.tsx uses border-[#3a3a3a], bg-[#222221], text-[#f47a5c]
- [evidence] web/src/components/ui/dialog.tsx uses border-[#3a3a3a], bg-[#222221], outline-[#e2503f]
- [evidence] web/src/tailwind.css defines --border, --ring, --accent, --primary as semantic tokens
- [evidence] Hex values have no light-mode equivalents — dark-only

**Why no single contract exists:** The Ark UI primitives were likely scaffolded with inline hex values before the token system was mature, or were copied from an external source without token adaptation. The values approximate the semantic tokens but do not reference them, creating a parallel dark-mode-only style layer.

**Recommended direction:** Replace all hardcoded hex values in the 7 UI primitive files with the corresponding CSS custom property references: border-[#3a3a3a] → border-border, hover:bg-[#222221] → hover:bg-accent, outline-[#e2503f] → outline-ring (or outline-primary). This is a low-risk, high-impact cleanup that immediately restores light mode correctness and token system authority. Decision rule 1 (foundation-owned) and rule 4 (light+dark coherence).

**Discussion questions:**
1. Are these hex values intentional dark-mode-specific overrides, or accidental drift from the token system?
2. Should the cleanup be done as a batch (all 7 files at once) or file-by-file with visual verification?
3. Are there other Ark UI primitives beyond these 7 that also bypass tokens?

### Bundle: data-grid-library-fragmentation

**Role under dispute:** Canonical data grid component for tabular data display

**Competing implementations:**
1. **react-data-grid** (web/src/components/blocks/BlockViewerGridRDG.tsx, web/src/pages/settings/SettingsGridSample.tsx) -- Lightweight data grid for block viewer and settings sample. MIT-licensed, smaller bundle.
2. **ag-grid-react** (web/src/components/marketing/MarketingGrid.tsx, web/src/lib/agGridTheme.ts) -- Feature-rich commercial grid for marketing demo page. Has dedicated theme factory.

**Evidence:**
- [evidence] web/src/components/blocks/BlockViewerGridRDG.tsx imports react-data-grid
- [evidence] web/src/pages/settings/SettingsGridSample.tsx imports react-data-grid
- [evidence] web/src/components/marketing/MarketingGrid.tsx imports ag-grid-react
- [evidence] web/src/lib/agGridTheme.ts creates AG Grid theme via themeQuartz.withParams()
- [evidence] Both ag-grid-react and react-data-grid listed in web/package.json dependencies

**Why no single contract exists:** Two grid libraries serve different surfaces (marketing vs app). Neither was chosen as the canonical grid. AG Grid has a theme factory but is only used in marketing. react-data-grid is used in the actual app surfaces but has no theme factory.

**Recommended direction:** Standardize on react-data-grid for app surfaces. ag-grid is only used in the marketing demo — evaluate whether the marketing page can be rebuilt with react-data-grid or whether ag-grid should remain as a marketing-only dependency. Decision rule 2 (broadest reuse) favors react-data-grid for app code.

**Discussion questions:**
1. Is ag-grid needed for any planned app features, or is it marketing-only?
2. Can the marketing grid demo be rebuilt with react-data-grid to eliminate the ag-grid dependency?
3. Should react-data-grid get a theme factory similar to agGridTheme.ts?

### Bundle: secondary-navigation-rail-fragmentation

**Role under dispute:** Secondary navigation rail component contract

**Competing implementations:**
1. **AdminLeftNav** (web/src/components/admin/AdminLeftNav.tsx) -- Left nav for superuser, blockdata-admin, and agchain-admin surfaces under AdminShellLayout
2. **AgchainLeftNav** (web/src/components/agchain/AgchainLeftNav.tsx) -- Left nav for AGChain workspace under AgchainShellLayout
3. **FlowsDetailRail** (web/src/components/flows/FlowsDetailRail.tsx) -- Fixed sidebar rail for flow detail view under FlowsShellLayout
4. **AgchainBenchmarkNav + AgchainSettingsNav** (web/src/components/agchain/AgchainBenchmarkNav.tsx, web/src/components/agchain/settings/AgchainSettingsNav.tsx) -- Sub-section navigation within AGChain for benchmark and settings views

**Evidence:**
- [evidence] web/src/components/admin/AdminLeftNav.tsx renders admin section links
- [evidence] web/src/components/agchain/AgchainLeftNav.tsx renders AGChain workspace links
- [evidence] web/src/components/flows/FlowsDetailRail.tsx renders flow detail tabs as rail links
- [evidence] web/src/components/agchain/AgchainBenchmarkNav.tsx and AgchainSettingsNav.tsx add AGChain sub-navs
- [evidence] No shared SecondaryRail, SectionNav, or DetailRail base component found

**Why no single contract exists:** Each section built its own secondary rail independently. Admin, AGChain, and Flows all need a left rail with section links, but no shared primitive was extracted. Width, padding, active-state styling, and link rendering differ across implementations.

**Recommended direction:** Extract a shared SecondaryRail or SectionNav primitive that accepts a link config array and renders consistently. AdminLeftNav is the broadest current user (serves 3 admin surfaces) and should be the structural reference. Section-specific content (AGChain workspace scope, flow detail tabs) can be injected via render props or slots. Decision rule 2 (broadest reuse) and rule 7 (clearest ownership).

**Discussion questions:**
1. Should all secondary rails share a single width token, or should different sections be allowed different widths?
2. Should the secondary rail support collapse behavior like the primary LeftRailShadcn?
3. Should the AGChain sub-navs (BenchmarkNav, SettingsNav) be expressed as nested sections within AgchainLeftNav rather than separate components?

### Bundle: empty-state-component-fragmentation

**Role under dispute:** Reusable empty-state component for pages and tab views

**Competing implementations:**
1. **AgchainEmptyState** (web/src/components/agchain/AgchainEmptyState.tsx) -- Semi-transparent card with title, description, optional action button and eyebrow label
2. **FlowEmptyState** (web/src/components/flows/tabs/FlowEmptyState.tsx) -- Gradient background icon container with title and optional subtitle

**Evidence:**
- [evidence] web/src/components/agchain/AgchainEmptyState.tsx renders card-style empty state
- [evidence] web/src/components/flows/tabs/FlowEmptyState.tsx renders gradient-icon empty state
- [evidence] No shared EmptyState component in web/src/components/ui/ or web/src/components/common/
- [evidence] web/src/pages/DatabasePlaceholder.tsx uses inline text for empty states, not either component

**Why no single contract exists:** AGChain and Flows built their own empty states independently with different visual language. Neither lives in a shared location. DatabasePlaceholder uses neither and has inline empty text. No foundation-level empty state contract was established.

**Recommended direction:** Create a shared EmptyState component in components/common/ or components/ui/ that supports the AgchainEmptyState's feature set (title, description, action, eyebrow) as it covers the broader API. FlowEmptyState's gradient icon treatment can be a variant prop. Decision rule 1 (foundation-owned) and rule 3 (fewest local overrides).

**Discussion questions:**
1. Should the canonical empty state use the card style (AgchainEmptyState) or the gradient icon style (FlowEmptyState)?
2. Should it support both as variants, or should one visual language be chosen?
3. Should inline empty text (like DatabasePlaceholder's 'No rows...') also use the component, or are simple text empties acceptable?

### Bundle: app-vs-agchain-shell-overlap

**Role under dispute:** Authenticated shell layout for header + left-rail + content surfaces

**Competing implementations:**
1. **AppLayout** (web/src/components/layout/AppLayout.tsx) -- Main application shell with TopCommandBar, LeftRailShadcn, RightRailShell, HeaderCenterProvider, and RightRailProvider
2. **AgchainShellLayout** (web/src/components/layout/AgchainShellLayout.tsx) -- AGChain workspace shell with TopCommandBar, AgchainLeftNav, HeaderCenterProvider, and AgchainWorkspaceProvider — structurally mirrors AppLayout but with different left rail and workspace context

**Evidence:**
- [evidence] web/src/components/layout/AppLayout.tsx renders TopCommandBar + LeftRailShadcn + RightRailShell + Outlet
- [evidence] web/src/components/layout/AgchainShellLayout.tsx renders TopCommandBar + AgchainLeftNav + Outlet with resizable sidebar
- [evidence] Both use HeaderCenterProvider for page title injection
- [evidence] Both use TopCommandBar as the header
- [evidence] Both implement resizable left sidebar with localStorage persistence
- [evidence] AppLayout has right rail; AgchainShellLayout does not

**Why no single contract exists:** AgchainShellLayout was built as a separate layout to accommodate AGChain's workspace context and different left rail. However, its structural shell (header + resizable sidebar + content) is nearly identical to AppLayout. The two diverged because AGChain needed AgchainWorkspaceProvider at the layout level, but the shell framing could have been shared.

**Recommended direction:** Evaluate whether AgchainShellLayout can be expressed as AppLayout with a different left-rail slot and an additional context provider. If AppLayout supported slot injection for the left rail, AGChain could use it directly with AgchainLeftNav + AgchainWorkspaceProvider. This would reduce shell duplication and ensure shell behavior (resize, persistence, header) stays in sync. Decision rule 5 (composes cleanly with shell model) and rule 6 (easiest to enforce).

**Discussion questions:**
1. Should AppLayout become a configurable shell that accepts left-rail and context-provider slots?
2. Does AGChain need its own shell long-term, or should it converge with the main app shell?
3. Should the right rail (help/AI) be available in AGChain workspace, or is its absence intentional?

## Clean Areas

### top-header

TopCommandBar is the single header component shared across AppLayout and AgchainShellLayout. HeaderCenterContext provides a clean injection mechanism for page-specific content. No competing header implementations.

- [evidence] web/src/components/shell/TopCommandBar.tsx is the sole header component
- [evidence] web/src/components/shell/HeaderCenterContext.tsx provides useHeaderCenter() hook
- [evidence] TopCommandBar imported by AppLayout.tsx and AgchainShellLayout.tsx

### right-rail

RightRailShell + RightRailContext provide a single-owner right panel with help and AI chat tabs. State persists to localStorage. AssistantDockHost handles detached chat window. No competing implementations.

- [evidence] web/src/components/shell/RightRailShell.tsx renders the right panel
- [evidence] web/src/components/shell/RightRailContext.tsx manages panel state
- [evidence] web/src/components/shell/RightRailChatPanel.tsx and HomeHelpRail.tsx are content, not competing shells

### authentication

AuthGuard is the single authentication wrapper. Redirects unauthenticated users to /login. Supports VITE_AUTH_BYPASS for development. Clean, no competing auth patterns.

- [evidence] web/src/auth/AuthGuard.tsx wraps all /app/* routes in router.tsx
- [evidence] web/src/auth/AuthContext.tsx provides useAuth() hook

### toast-notifications

Sonner toast library is the single notification mechanism. UIProvider renders Toaster at top-right with rich colors. toast() imported consistently from 'sonner' across pages.

- [evidence] web/src/components/ui/provider.tsx renders <Toaster> from sonner
- [evidence] toast() imported from 'sonner' in Projects.tsx, BlockViewerGridRDG.tsx, and other pages

### theme-switching

Single useTheme hook with data-theme attribute on :root. Theme persists to localStorage. Hydrated in main.tsx before React render to prevent flash. No competing theme mechanisms.

- [evidence] web/src/hooks/useTheme.ts provides useTheme() hook
- [evidence] web/src/main.tsx hydrates theme from localStorage before mount
- [evidence] web/src/tailwind.css uses :root and :root[data-theme='light'] for token overrides

### css-custom-property-system

tailwind.css is the single source of truth for CSS custom properties. 100+ semantic tokens with full light/dark coverage via :root and :root[data-theme='light']. @theme inline mapping generates Tailwind utilities. No competing CSS token source.

- [evidence] web/src/tailwind.css defines all semantic CSS custom properties
- [evidence] TypeScript contracts (color-contract.ts, font-contract.ts) reference CSS vars, not replace them
- [evidence] No separate tokens.css or theme-variables.css competing

### admin-permission-guards

SuperuserGuard handles three admin surface tiers (superuser, blockdata-admin, agchain-admin) via a shared AdminSurfaceGuard pattern. Clean three-tier access model with consistent loading, error, and redirect behavior.

- [evidence] web/src/pages/superuser/SuperuserGuard.tsx exports SuperuserGuard, BlockdataAdminGuard, AgchainAdminGuard
- [evidence] All three use AdminSurfaceGuard internally with surface-specific access checks

### typography-contract

font-contract.ts provides a single, well-structured typography contract with FONT_FAMILIES, FONT_SIZES, FONT_WEIGHTS, and 11 FONT_RECIPES mapping contexts to Tailwind classes. No competing typography definitions.

- [evidence] web/src/lib/font-contract.ts exports complete typography contract
- [evidence] FONT_RECIPES map page-title, section-heading, body-text, nav, badges, code-cells to exact Tailwind classes

### public-shell-layouts

Three public layouts (MarketingLayout, PublicFullBleedLayout, PublicLayout) serve distinct route groups with no overlap. PublicNav shared header. Intentionally separate, not competing.

- [evidence] web/src/router.tsx assigns each public layout to specific route groups
- [evidence] web/src/components/layout/PublicNav.tsx is the shared public header

## Recommended Directions

1. **icon-library-fragmentation:** Execute the documented Hugeicons migration plan. Hugeicons is already the declared target with an AppIcon abstraction planned. Phase 1 (foundation: AppIcon redesign, nav config, UI primitives, shell) should precede Phase 2 (systematic file-by-file migration). Decision rule 2 (broadest legitimate reuse) favors Tabler short-term but rule 6 (easiest to enforce) favors Hugeicons with the AppIcon contract.
2. **raw-hex-token-bypass-in-ui-primitives:** Replace all hardcoded hex values in the 7 UI primitive files with the corresponding CSS custom property references: border-[#3a3a3a] → border-border, hover:bg-[#222221] → hover:bg-accent, outline-[#e2503f] → outline-ring (or outline-primary). This is a low-risk, high-impact cleanup that immediately restores light mode correctness and token system authority. Decision rule 1 (foundation-owned) and rule 4 (light+dark coherence).
3. **data-grid-library-fragmentation:** Standardize on react-data-grid for app surfaces. ag-grid is only used in the marketing demo — evaluate whether the marketing page can be rebuilt with react-data-grid or whether ag-grid should remain as a marketing-only dependency. Decision rule 2 (broadest reuse) favors react-data-grid for app code.
4. **secondary-navigation-rail-fragmentation:** Extract a shared SecondaryRail or SectionNav primitive that accepts a link config array and renders consistently. AdminLeftNav is the broadest current user (serves 3 admin surfaces) and should be the structural reference. Section-specific content (AGChain workspace scope, flow detail tabs) can be injected via render props or slots. Decision rule 2 (broadest reuse) and rule 7 (clearest ownership).
5. **empty-state-component-fragmentation:** Create a shared EmptyState component in components/common/ or components/ui/ that supports the AgchainEmptyState's feature set (title, description, action, eyebrow) as it covers the broader API. FlowEmptyState's gradient icon treatment can be a variant prop. Decision rule 1 (foundation-owned) and rule 3 (fewest local overrides).
6. **app-vs-agchain-shell-overlap:** Evaluate whether AgchainShellLayout can be expressed as AppLayout with a different left-rail slot and an additional context provider. If AppLayout supported slot injection for the left rail, AGChain could use it directly with AgchainLeftNav + AgchainWorkspaceProvider. This would reduce shell duplication and ensure shell behavior (resize, persistence, header) stays in sync. Decision rule 5 (composes cleanly with shell model) and rule 6 (easiest to enforce).

## Unresolved Decisions

1. Is the Hugeicons migration still the intended direction, or has the team reconsidered? *(from: icon-library-fragmentation)*
2. Should the AppIcon abstraction be built first (gating all future icon usage) or should migration proceed file-by-file? *(from: icon-library-fragmentation)*
3. What is the timeline priority for icon migration vs other foundation work? *(from: icon-library-fragmentation)*
4. Are these hex values intentional dark-mode-specific overrides, or accidental drift from the token system? *(from: raw-hex-token-bypass-in-ui-primitives)*
5. Should the cleanup be done as a batch (all 7 files at once) or file-by-file with visual verification? *(from: raw-hex-token-bypass-in-ui-primitives)*
6. Are there other Ark UI primitives beyond these 7 that also bypass tokens? *(from: raw-hex-token-bypass-in-ui-primitives)*
7. Is ag-grid needed for any planned app features, or is it marketing-only? *(from: data-grid-library-fragmentation)*
8. Can the marketing grid demo be rebuilt with react-data-grid to eliminate the ag-grid dependency? *(from: data-grid-library-fragmentation)*
9. Should react-data-grid get a theme factory similar to agGridTheme.ts? *(from: data-grid-library-fragmentation)*
10. Should all secondary rails share a single width token, or should different sections be allowed different widths? *(from: secondary-navigation-rail-fragmentation)*
11. Should the secondary rail support collapse behavior like the primary LeftRailShadcn? *(from: secondary-navigation-rail-fragmentation)*
12. Should the AGChain sub-navs (BenchmarkNav, SettingsNav) be expressed as nested sections within AgchainLeftNav rather than separate components? *(from: secondary-navigation-rail-fragmentation)*
13. Should the canonical empty state use the card style (AgchainEmptyState) or the gradient icon style (FlowEmptyState)? *(from: empty-state-component-fragmentation)*
14. Should it support both as variants, or should one visual language be chosen? *(from: empty-state-component-fragmentation)*
15. Should inline empty text (like DatabasePlaceholder's 'No rows...') also use the component, or are simple text empties acceptable? *(from: empty-state-component-fragmentation)*
16. Should AppLayout become a configurable shell that accepts left-rail and context-provider slots? *(from: app-vs-agchain-shell-overlap)*
17. Does AGChain need its own shell long-term, or should it converge with the main app shell? *(from: app-vs-agchain-shell-overlap)*
18. Should the right rail (help/AI) be available in AGChain workspace, or is its absence intentional? *(from: app-vs-agchain-shell-overlap)*

## Suggested Next Artifact

The next artifact should be the canonical frontend foundation contract, derived from this audit and the resolved discussion decisions.
