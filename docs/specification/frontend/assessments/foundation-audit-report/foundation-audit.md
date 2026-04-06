# Frontend Foundation Audit Report

## Summary

| Metric | Value |
|---|---|
| Shell regions | 6 |
| Token sources | 7 |
| Component roles | 5 |
| Page patterns | 5 |
| Conflict bundles | 6 |
| Quick wins | 2 |
| Clean areas | 12 |
| Sampling mode | sampled |

## Scope

- Repo: `writing-system/web`
- Audit date: 2026-04-05
- Captures reviewed: none
- Token files reviewed: `web/src/tailwind.css`, `web/src/theme.css`, `web/src/lib/color-contract.ts`, `web/src/lib/font-contract.ts`, `web/src/lib/icon-contract.ts`, `web/src/lib/iconTokens.ts`, `web/src/lib/toolbar-contract.ts`, `web/src/lib/styleTokens.ts`, `web/src/scalar-host/theme-contract.ts`, `web/src/styles/mdxeditor-overrides.css`, `web/src/lib/agGridTheme.ts`, `web/src/lib/codemirrorTheme.ts`
- Major directories: web/src/components, web/src/components/ui, web/src/pages, web/src/lib, web/src/styles, web/src/auth, web/src/hooks, web/src/contexts, web/src/scalar-host
- Exclusions: web/src/components/marketing, web/src/pages/experiments
- Surface area: 30 shell, 30 token, 273 shared components, 178 pages
- Sampling: sampled -- Deep pass (v2). Shell and navigation from v1 preserved — no structural changes since 2026-04-04. Token layer audited line-by-line with exact hex values, CSS custom property counts, and TypeScript contract field counts. All 34 components/ui/ files individually inspected for hex bypasses (v1 reported 7 files, actual count is 20). Icon library imports recounted file-by-file. Page patterns sampled as in v1.

## Shell Ownership Map

| Region | Owner File(s) | Runtime Role | State Owner | Clarity |
|---|---|---|---|---|
| top-header | web/src/components/shell/TopCommandBar.tsx | Fixed top bar with search, project switcher, theme toggle. Shared across AppLayout and AgchainShellLayout. | web/src/components/shell/HeaderCenterContext.tsx | clear |
| left-rail-primary | web/src/components/shell/LeftRailShadcn.tsx | Main app sidebar navigation with collapsible/compact mode, project switcher, workspace selector. | web/src/components/shell/nav-config.ts | clear |
| left-rail-secondary | web/src/components/admin/AdminLeftNav.tsx, web/src/components/agchain/AgchainLeftNav.tsx, web/src/components/agchain/AgchainBenchmarkNav.tsx, web/src/components/agchain/settings/AgchainSettingsNav.tsx, web/src/components/flows/FlowsDetailRail.tsx | Section-specific secondary navigation rails for admin, AGChain, and flows detail surfaces. | -- | ambiguous |
| right-rail | web/src/components/shell/RightRailShell.tsx | Right panel container for help content and AI chat. | web/src/components/shell/RightRailContext.tsx | clear |
| content-area | web/src/components/layout/AppLayout.tsx, web/src/components/layout/AdminShellLayout.tsx, web/src/components/layout/AgchainShellLayout.tsx, web/src/components/layout/FlowsShellLayout.tsx | Four authenticated shell layouts each frame <main> differently. | -- | ambiguous |
| public-shells | web/src/components/layout/MarketingLayout.tsx, web/src/components/layout/PublicFullBleedLayout.tsx, web/src/components/layout/PublicLayout.tsx | Three public-facing layouts for marketing, login/register, and auth callbacks. | -- | clear |

### Shell Notes

- **left-rail-secondary:** Five different secondary nav components with no shared base, contract, or width token.
- **content-area:** AppLayout and AgchainShellLayout overlap significantly (both have header + left rail + optional right rail + content).

## Navigation and Rail Structure

### Primary Navigation
web/src/components/shell/LeftRailShadcn.tsx, web/src/components/shell/nav-config.ts

### Secondary Navigation
web/src/components/admin/AdminLeftNav.tsx, web/src/components/agchain/AgchainLeftNav.tsx, web/src/components/agchain/AgchainBenchmarkNav.tsx, web/src/components/agchain/settings/AgchainSettingsNav.tsx, web/src/components/flows/FlowsDetailRail.tsx

### Route Mapping
web/src/router.tsx defines route tree with nested layout wrappers.

### Breadcrumb Conventions
AppBreadcrumbs component exists. Pages primarily use ShellPageHeader via HeaderCenterContext.

### Action Placement
Primary actions in page headers via HeaderCenterContext right slot. Table row actions in dropdown menus. Toolbar actions use toolbar-contract.ts patterns.

- [evidence] web/src/router.tsx
- [evidence] web/src/components/shell/LeftRailShadcn.tsx
- [evidence] web/src/components/shell/nav-config.ts

## Token and Theme Inventory

| Source | File(s) | Semantic | Raw Values | Light | Dark | Drift Notes |
|---|---|---|---|---|---|---|
| CSS custom properties (tailwind.css) | web/src/tailwind.css | yes | yes | full | full | Primary token source. Dark-mode :root block: ~137 distinct CSS custom properties. Light-mode :root[data-theme='light'] block: ~68 overrides. @theme inline: 34 Tailwind utility mappings. Token groups: core semantic (20), sidebar (8), gray scale (9), status palette (5), shell layout (7), font sizes (6), spacing (4), workbench prose (13), decorative/accent (7), code pane (3), grid (5), overlays (3), JSON tree view (18), marketing (3), flow (5), left rail (4), admin config (11), radius (1), fonts (3). Primary brand color: #EB5E41 (same both modes). |
| TypeScript color contract | web/src/lib/color-contract.ts | yes | yes | full | full | 29 token pairs across 5 groups: SURFACE_TOKENS (7 pairs: background, chrome, card, secondary, muted, accent, popover), TEXT_TOKENS (4 pairs: foreground, muted-foreground, card-foreground, secondary-foreground), BORDER_TOKENS (3 pairs: border, input, sidebar-border), BRAND_TOKENS (4 pairs: primary, primary-foreground, ring, destructive), ADMIN_CONFIG_TOKENS (11 pairs: rail-bg, rail-border, frame-bg, header-bg, content-bg, 3 success status, 3 error status). Each pair has dark hex, light hex, cssVar reference, and note. Values match tailwind.css — this file is a TypeScript accessor, not an independent source. |
| TypeScript font contract | web/src/lib/font-contract.ts | yes | yes | full | full | FONT_FAMILIES: 2 (Inter sans, JetBrains Mono mono). FONT_SIZES: 9-step scale (2xs 10px → 4xl 36px). FONT_WEIGHTS: 4 (normal 400, medium 500, semibold 600, bold 700). FONT_RECIPES: 11 usage recipes mapping contexts to exact Tailwind classes (page title → text-2xl font-bold, section heading → text-xl font-semibold, card title → text-sm font-semibold, body → text-sm font-normal, nav item → text-sm font-medium, label/caption → text-xs font-medium text-muted-foreground, section label uppercase → text-xs font-semibold uppercase tracking-wide text-muted-foreground, badge → text-xs font-medium, data cell mono → text-xs, code/JSON mono → text-xs, dense grid cell → text-2xs). |
| TypeScript icon contract | web/src/lib/icon-contract.ts | yes | no | full | full | ICON_SIZES: 6 (xs 14px, sm 16px, md 20px, lg 24px, xl 28px, xxl 32px). ICON_CONTEXT_SIZE: 5 semantic contexts (inline→sm, content→md, utility→md, nav→lg, hero→xl). ICON_STROKES: 3 (light 1.6, regular 1.8, strong 2.1). ICON_TONE_CLASS: 7 tones (current, default, muted, accent, success, warning, danger) mapped to Tailwind classes. ICON_STANDARD.migrationStatus: 'Hugeicons migration in progress'. |
| TypeScript toolbar contract | web/src/lib/toolbar-contract.ts | yes | no | full | full | TOOLBAR_BUTTON: 10 properties (h-7, px-2, gap-1.5, text-xs, font-medium, leading-4, rounded-md, border, transition-colors, active:scale-[0.97]). TOOLBAR_BUTTON_STATES: 2 (active: border-border bg-background text-foreground; inactive: border-transparent text-muted-foreground hover:bg-accent hover:text-foreground). TOOLBAR_STRIP: 6 properties (flex, gap-1, p-2, bg-card, border border-border rounded-md, gap-2). TOOLBAR_BUTTON_BASE: concatenated class string. |
| Runtime style tokens (styleTokens.ts) | web/src/lib/styleTokens.ts | yes | yes | partial | partial | shell: 11 properties (headerHeight 60, headerHeightMobile 44, headerTallHeight 76, navbarWidth 220, navbarCompactWidth 60, navbarMobileWidth 200, navbarMinWidth 220, navbarMaxWidth 350, rightRailWidth 350, assistantWidth 360, contentMaxWidth via CSS var). grid: 2×5 raw hex colors (light/dark: background, chromeBackground, foreground, border, subtleText). admin: navWidth 200, shellTopBandHeight 40. Grid hex values duplicate CSS vars in tailwind.css. |
| Hardcoded hex bypasses in UI primitives | web/src/components/ui/accordion.tsx, web/src/components/ui/checkbox.tsx, web/src/components/ui/collapsible.tsx, web/src/components/ui/combobox.tsx, web/src/components/ui/dialog.tsx, web/src/components/ui/file-upload.tsx, web/src/components/ui/menu.tsx, web/src/components/ui/number-input.tsx, web/src/components/ui/pagination.tsx, web/src/components/ui/popover.tsx, web/src/components/ui/progress.tsx, web/src/components/ui/select.tsx, web/src/components/ui/segment-group.tsx, web/src/components/ui/splitter.tsx, web/src/components/ui/steps.tsx, web/src/components/ui/switch.tsx, web/src/components/ui/tabs.tsx, web/src/components/ui/tags-input.tsx, web/src/components/ui/tooltip.tsx, web/src/components/ui/tree-view.tsx | no | yes | none | partial | 20 of 34 UI primitive files contain hardcoded hex values in Tailwind classes. 7 distinct hex values, 80 total occurrences. Breakdown: #3a3a3a (31 occurrences, used as border — maps to --border), #e2503f (15 occurrences, used as focus ring — close to --primary #EB5E41 but not identical), #222221 (12 occurrences, used as hover bg — maps to --accent or --secondary), #f47a5c (10 occurrences, used as checked/selected text — lighter primary variant, no token equivalent), #31312e (5 occurrences, used as muted bg — between --secondary #1a1a1a and --border #2a2a2a), #111110 (3 occurrences, used as deep bg — near --background #0e0e0e), #55221e (4 occurrences, used as primary-tinted bg — no token equivalent). 15 files are clean: app-icon, badge, button, field, input, native-select, provider, scroll-area, separator, sheet, sidebar, skeleton, toolbar-button, segmented-control, badge.test. |

## Component Contract Inventory

| Role | Canonical Candidate(s) | Competing | Owner File(s) | State Coverage |
|---|---|---|---|---|
| ui-primitives-library | web/src/components/ui/ | -- | web/src/components/ui/ | default |
| data-grid | web/src/components/blocks/BlockViewerGridRDG.tsx | web/src/components/marketing/MarketingGrid.tsx | web/src/components/blocks/BlockViewerGridRDG.tsx | default, loading, empty |
| empty-state | web/src/components/agchain/AgchainEmptyState.tsx | web/src/components/flows/tabs/FlowEmptyState.tsx | web/src/components/agchain/AgchainEmptyState.tsx | empty |
| error-alert | web/src/components/common/ErrorAlert.tsx | -- | web/src/components/common/ErrorAlert.tsx | error |
| page-header | web/src/components/shell/ShellPageHeader.tsx | -- | web/src/components/shell/ShellPageHeader.tsx | default |

## Page Pattern Inventory

| Pattern | Strongest Example | Competing Examples | Structure Notes |
|---|---|---|---|
| registry-list | web/src/pages/Projects.tsx | -- | Data table with pagination, loading, toast feedback. |
| detail-workspace | web/src/pages/flows/FlowDetail (via FlowsShellLayout) | web/src/pages/superuser/ workspace editors | FlowDetail uses FlowsShellLayout with fixed sidebar rail + main content with tabs. |
| three-column-workbench | web/src/pages/superuser/PlanTracker.tsx | web/src/pages/superuser/TestIntegrations.tsx | Locked 3-column Workbench with persistent pane scaffolds. PlanTracker uses 26/52/22 width ratio with locked layout, no drag, no toolbar. TestIntegrations uses similar pattern. |
| settings-page | web/src/pages/settings/SettingsLayout.tsx | web/src/components/agchain/settings/AgchainSettingsNav.tsx | Two settings architectures: app settings under AppLayout, AGChain settings under AgchainShellLayout. |
| agchain-workspace | web/src/pages/agchain/ (40 files) | -- | Self-contained under AgchainShellLayout with AgchainWorkspaceProvider context. |

## State-Presentation Inventory

### Loading

Mixed. AuthGuard and SuperuserGuard use inline spinners/text. Skeleton component exists in components/ui/skeleton.tsx but is not universally used.

### Empty

Fragmented. AgchainEmptyState and FlowEmptyState serve same role with different visual language. No shared foundation EmptyState.

### Error

ErrorAlert component exists in components/common/. Not universally used.

### Success

Consistent. Sonner toast library via UIProvider.

### Permission

Well-structured. AuthGuard + SuperuserGuard (three admin surface tiers).

### Async / Polling

No shared long-running/polling pattern.

- [evidence] web/src/components/ui/skeleton.tsx
- [evidence] web/src/components/common/ErrorAlert.tsx
- [evidence] web/src/components/ui/provider.tsx renders Toaster from sonner
- [evidence] web/src/auth/AuthGuard.tsx
- [evidence] web/src/pages/superuser/SuperuserGuard.tsx

## Accessibility and Mode-Consistency Notes

- Focus ring color #e2503f is hardcoded in 12 UI primitive files instead of using --ring token (#EB5E41). The values are close but not identical.
- 20 of 34 UI primitive files use dark-mode-only hex values with no light mode equivalent.
- Three icon libraries with different size conventions may produce inconsistent touch targets.

## Quick Wins

| Bundle | Role | Est. Files | Recommended Direction |
|---|---|---|---|
| empty-state-component-fragmentation | Reusable empty-state component | 3 | Create shared EmptyState in components/common/ or components/ui/ with AgchainEmptyState's API. |
| data-grid-library-fragmentation | Canonical data grid component | 4 | Standardize on react-data-grid for app surfaces. |

## Conflict Bundles

### Bundle: hex-bypass-in-ui-primitives

**Role under dispute:** Token system compliance across Ark UI wrapper components

**Effort level:** moderate (~20 files)

**Competing implementations:**
1. **CSS custom property tokens (tailwind.css)** (web/src/tailwind.css) -- Semantic surface, border, accent, and focus tokens with full light/dark coverage. --border: dark #2a2a2a / light #d6d3d1. --primary: #EB5E41 both modes. --ring: #EB5E41 both modes. --accent: dark #1a1a1a / light #f5ebe6.
2. **Hardcoded hex values in 20 UI primitive files** (20 files in web/src/components/ui/ (accordion, checkbox, collapsible, combobox, dialog, file-upload, menu, number-input, pagination, popover, progress, select, segment-group, splitter, steps, switch, tabs, tags-input, tooltip, tree-view)) -- Dark-mode-specific styling for Ark UI component wrappers. 7 distinct values: #3a3a3a (border, 31×), #e2503f (focus ring, 15×), #222221 (hover bg, 12×), #f47a5c (checked/selected text, 10×), #31312e (muted bg, 5×), #111110 (deep bg, 3×), #55221e (primary-tinted bg, 4×). Total: 80 occurrences.

**Evidence:**
- [evidence] Every .tsx in web/src/components/ui/ individually inspected
- [evidence] 20 files with hex bypasses, 15 files clean
- [evidence] #3a3a3a (31×) vs --border dark value #2a2a2a — NOT the same value
- [evidence] #e2503f (15×) vs --ring/#primary #EB5E41 — close but NOT identical
- [evidence] #222221 (12×) vs --accent dark #1a1a1a — NOT the same value
- [evidence] #f47a5c (10×) — lighter primary variant, NO existing token equivalent
- [evidence] #31312e (5×) — between --secondary #1a1a1a and --border #2a2a2a, NO token equivalent
- [evidence] #111110 (3×) — near --background #0e0e0e, NOT the same value
- [evidence] #55221e (4×) — primary-tinted bg, NO token equivalent

**Why no single contract exists:** The Ark UI primitives use a parallel color palette that approximates but does not match the semantic tokens. 4 of the 7 hex values (#3a3a3a, #e2503f, #222221, #111110) are close to existing tokens but intentionally different values. 3 of the 7 (#f47a5c, #31312e, #55221e) have no token equivalent at all — they would need new tokens or mapping to existing ones. This is not simple find-and-replace; it requires deciding whether the Ark UI palette should converge to the existing tokens or whether the token system needs to expand to include these intermediate values.

**Recommended direction:** Define 3-4 new semantic tokens for the Ark UI interaction states that have no current equivalent: a 'selected-text' token (for #f47a5c), an 'interactive-surface' token (for #31312e), and a 'primary-tinted-bg' token (for #55221e). Then migrate all 20 files to reference semantic tokens instead of hex. The close-but-not-identical values (#3a3a3a vs --border #2a2a2a, #e2503f vs --ring #EB5E41) should converge to the existing tokens unless there is a documented reason for the difference.

**Discussion questions:**
1. Is the Ark UI palette intentionally different from the semantic tokens (e.g., #3a3a3a is deliberately lighter than --border #2a2a2a), or is this accidental drift?
2. Should we add new semantic tokens for the 3 values with no equivalent (#f47a5c, #31312e, #55221e), or should these converge to existing tokens?
3. Should the focus ring be #e2503f (current Ark UI value) or #EB5E41 (--ring/--primary token value)?
4. Should the migration happen in one batch or file-by-file with visual verification?

### Bundle: icon-library-fragmentation

**Role under dispute:** Canonical icon library and icon component contract

**Effort level:** moderate (~124 files)

**Competing implementations:**
1. **Tabler Icons** (@tabler/icons-react (101 files, 48 distinct icons, 122 total imports)) -- Legacy/primary icon library with widest usage. Top 5: IconPlus (8×), IconChevronRight (7×), IconDownload (6×), IconX (6×), IconLoader2 (5×).
2. **Hugeicons** (@hugeicons/react (15 files, generic HugeiconsIcon component only — no named icon imports)) -- Migration target per icon-contract.ts. Used via dynamic component rendering, not named imports.
3. **Lucide React** (lucide-react (8 files, 13 distinct icons, 16 total imports)) -- Used in UI primitives. Top icons: FileIcon (2×), UploadIcon (2×), XIcon (2×).

**Evidence:**
- [evidence] Tabler: 101 files, 48 distinct icons, 122 total imports
- [evidence] Hugeicons: 15 files — all use generic HugeiconsIcon component, zero named icon imports
- [evidence] Lucide: 8 files, 13 distinct icons, 16 total imports
- [evidence] web/src/lib/icon-contract.ts ICON_STANDARD.migrationStatus: 'Hugeicons migration in progress'

**Why no single contract exists:** Three libraries accumulated over time. Tabler dominates (101 files). Hugeicons is declared migration target but only 15 files use it, and only through the generic component — no named icon imports anywhere. Lucide came via shadcn/UI primitives.

**Recommended direction:** Execute the documented Hugeicons migration. The AppIcon abstraction in icon-contract.ts should gate all future usage. Hugeicons' current 15-file footprint uses the generic HugeiconsIcon component pattern, which is the intended AppIcon approach.

**Discussion questions:**
1. Is the Hugeicons migration still the intended direction?
2. Should AppIcon be built before migration begins, or should migration proceed file-by-file?
3. What is the priority of icon migration vs other foundation work?

### Bundle: data-grid-library-fragmentation

**Role under dispute:** Canonical data grid component

**Effort level:** quick-win (~4 files)

**Competing implementations:**
1. **react-data-grid** (web/src/components/blocks/BlockViewerGridRDG.tsx, web/src/pages/settings/SettingsGridSample.tsx) -- Lightweight grid for app surfaces.
2. **ag-grid-react** (web/src/components/marketing/MarketingGrid.tsx, web/src/lib/agGridTheme.ts) -- Feature-rich commercial grid for marketing demo.

**Evidence:**
- [evidence] react-data-grid: 2 app surface files
- [evidence] ag-grid-react: 1 marketing file + 1 theme factory

**Why no single contract exists:** Two grid libraries serve different surfaces. ag-grid is marketing-only with a theme factory. react-data-grid is used in actual app surfaces without a theme factory.

**Recommended direction:** Standardize on react-data-grid for app surfaces. Evaluate whether marketing can use react-data-grid to eliminate the ag-grid dependency.

**Discussion questions:**
1. Is ag-grid needed for any planned app features, or is it marketing-only?
2. Should react-data-grid get a theme factory?

### Bundle: secondary-navigation-rail-fragmentation

**Role under dispute:** Secondary navigation rail component contract

**Effort level:** architectural (~5 files)

**Competing implementations:**
1. **AdminLeftNav** (web/src/components/admin/AdminLeftNav.tsx) -- Left nav for 3 admin surfaces under AdminShellLayout.
2. **AgchainLeftNav** (web/src/components/agchain/AgchainLeftNav.tsx) -- Left nav for AGChain workspace.
3. **FlowsDetailRail** (web/src/components/flows/FlowsDetailRail.tsx) -- Fixed sidebar for flow detail view.
4. **AgchainBenchmarkNav + AgchainSettingsNav** (web/src/components/agchain/AgchainBenchmarkNav.tsx, web/src/components/agchain/settings/AgchainSettingsNav.tsx) -- Sub-section navigation within AGChain.

**Evidence:**
- [evidence] 5 different secondary nav components with no shared base
- [evidence] No shared SecondaryRail, SectionNav, or DetailRail base component found

**Why no single contract exists:** Each section built its own rail independently. No shared primitive was extracted.

**Recommended direction:** Extract a shared SecondaryRail primitive that accepts a link config array. AdminLeftNav is the broadest user (3 admin surfaces).

**Discussion questions:**
1. Should all secondary rails share a single width token?
2. Should the secondary rail support collapse behavior?

### Bundle: empty-state-component-fragmentation

**Role under dispute:** Reusable empty-state component

**Effort level:** quick-win (~3 files)

**Competing implementations:**
1. **AgchainEmptyState** (web/src/components/agchain/AgchainEmptyState.tsx) -- Card with title, description, optional action and eyebrow.
2. **FlowEmptyState** (web/src/components/flows/tabs/FlowEmptyState.tsx) -- Gradient icon container with title and subtitle.

**Evidence:**
- [evidence] web/src/components/agchain/AgchainEmptyState.tsx
- [evidence] web/src/components/flows/tabs/FlowEmptyState.tsx
- [evidence] No shared EmptyState in components/ui/ or components/common/

**Why no single contract exists:** Built independently with different visual language. Neither lives in a shared location.

**Recommended direction:** Create shared EmptyState in components/common/ or components/ui/ with AgchainEmptyState's API. FlowEmptyState's gradient icon can be a variant.

**Discussion questions:**
1. Card style (AgchainEmptyState) or gradient icon style (FlowEmptyState)?
2. Should inline empty text also use the component?

### Bundle: app-vs-agchain-shell-overlap

**Role under dispute:** Authenticated shell layout for header + left-rail + content

**Effort level:** architectural (~2 files)

**Competing implementations:**
1. **AppLayout** (web/src/components/layout/AppLayout.tsx) -- Main app shell with TopCommandBar, LeftRailShadcn, RightRailShell.
2. **AgchainShellLayout** (web/src/components/layout/AgchainShellLayout.tsx) -- AGChain workspace shell with TopCommandBar, AgchainLeftNav — structurally mirrors AppLayout.

**Evidence:**
- [evidence] Both render TopCommandBar + resizable left sidebar + content
- [evidence] Both use HeaderCenterProvider
- [evidence] Both implement resizable left sidebar with localStorage persistence
- [evidence] AppLayout has right rail; AgchainShellLayout does not

**Why no single contract exists:** AgchainShellLayout was built separately for AGChain's workspace context but its shell framing is nearly identical to AppLayout.

**Recommended direction:** Evaluate whether AppLayout can accept left-rail and context-provider slots so AGChain uses it directly.

**Discussion questions:**
1. Should AppLayout become configurable with left-rail slots?
2. Should the right rail be available in AGChain workspace?

## Clean Areas

### top-header

TopCommandBar is the single header component. HeaderCenterContext provides injection.

- [evidence] web/src/components/shell/TopCommandBar.tsx

### right-rail

RightRailShell + RightRailContext. Single owner.

- [evidence] web/src/components/shell/RightRailShell.tsx

### authentication

AuthGuard is the single auth wrapper.

- [evidence] web/src/auth/AuthGuard.tsx

### toast-notifications

Sonner via UIProvider. Single mechanism.

- [evidence] web/src/components/ui/provider.tsx

### theme-switching

useTheme hook with data-theme attribute. Single owner.

- [evidence] web/src/hooks/useTheme.ts

### css-custom-property-system

tailwind.css is the single source. ~137 dark-mode properties, ~68 light-mode overrides, 34 @theme inline mappings.

- [evidence] web/src/tailwind.css — 317 lines

### admin-permission-guards

SuperuserGuard handles three admin surface tiers via shared AdminSurfaceGuard.

- [evidence] web/src/pages/superuser/SuperuserGuard.tsx

### typography-contract

font-contract.ts: 2 families, 9 sizes, 4 weights, 11 recipes. Single source.

- [evidence] web/src/lib/font-contract.ts

### toolbar-contract

toolbar-contract.ts: 10 button properties, 2 states, 6 strip properties. Single source.

- [evidence] web/src/lib/toolbar-contract.ts

### icon-size-and-context-contract

icon-contract.ts: 6 sizes (14-32px), 5 contexts, 3 strokes, 7 tones. Single source, even though the library is fragmented.

- [evidence] web/src/lib/icon-contract.ts

### color-contract-accessor

color-contract.ts: 29 token pairs across 5 groups. TypeScript accessor for tailwind.css values, not an independent source. Values match.

- [evidence] web/src/lib/color-contract.ts — values verified against tailwind.css

### public-shell-layouts

Three public layouts serve distinct route groups with no overlap.

- [evidence] web/src/router.tsx

## Recommended Directions

1. **hex-bypass-in-ui-primitives:** Define 3-4 new semantic tokens for the Ark UI interaction states that have no current equivalent: a 'selected-text' token (for #f47a5c), an 'interactive-surface' token (for #31312e), and a 'primary-tinted-bg' token (for #55221e). Then migrate all 20 files to reference semantic tokens instead of hex. The close-but-not-identical values (#3a3a3a vs --border #2a2a2a, #e2503f vs --ring #EB5E41) should converge to the existing tokens unless there is a documented reason for the difference.
2. **icon-library-fragmentation:** Execute the documented Hugeicons migration. The AppIcon abstraction in icon-contract.ts should gate all future usage. Hugeicons' current 15-file footprint uses the generic HugeiconsIcon component pattern, which is the intended AppIcon approach.
3. **data-grid-library-fragmentation:** Standardize on react-data-grid for app surfaces. Evaluate whether marketing can use react-data-grid to eliminate the ag-grid dependency.
4. **secondary-navigation-rail-fragmentation:** Extract a shared SecondaryRail primitive that accepts a link config array. AdminLeftNav is the broadest user (3 admin surfaces).
5. **empty-state-component-fragmentation:** Create shared EmptyState in components/common/ or components/ui/ with AgchainEmptyState's API. FlowEmptyState's gradient icon can be a variant.
6. **app-vs-agchain-shell-overlap:** Evaluate whether AppLayout can accept left-rail and context-provider slots so AGChain uses it directly.

## Unresolved Decisions

1. Is the Ark UI palette intentionally different from the semantic tokens (e.g., #3a3a3a is deliberately lighter than --border #2a2a2a), or is this accidental drift? *(from: hex-bypass-in-ui-primitives)*
2. Should we add new semantic tokens for the 3 values with no equivalent (#f47a5c, #31312e, #55221e), or should these converge to existing tokens? *(from: hex-bypass-in-ui-primitives)*
3. Should the focus ring be #e2503f (current Ark UI value) or #EB5E41 (--ring/--primary token value)? *(from: hex-bypass-in-ui-primitives)*
4. Should the migration happen in one batch or file-by-file with visual verification? *(from: hex-bypass-in-ui-primitives)*
5. Is the Hugeicons migration still the intended direction? *(from: icon-library-fragmentation)*
6. Should AppIcon be built before migration begins, or should migration proceed file-by-file? *(from: icon-library-fragmentation)*
7. What is the priority of icon migration vs other foundation work? *(from: icon-library-fragmentation)*
8. Is ag-grid needed for any planned app features, or is it marketing-only? *(from: data-grid-library-fragmentation)*
9. Should react-data-grid get a theme factory? *(from: data-grid-library-fragmentation)*
10. Should all secondary rails share a single width token? *(from: secondary-navigation-rail-fragmentation)*
11. Should the secondary rail support collapse behavior? *(from: secondary-navigation-rail-fragmentation)*
12. Card style (AgchainEmptyState) or gradient icon style (FlowEmptyState)? *(from: empty-state-component-fragmentation)*
13. Should inline empty text also use the component? *(from: empty-state-component-fragmentation)*
14. Should AppLayout become configurable with left-rail slots? *(from: app-vs-agchain-shell-overlap)*
15. Should the right rail be available in AGChain workspace? *(from: app-vs-agchain-shell-overlap)*

## Suggested Next Artifact

The next artifact should be the canonical frontend foundation contract, derived from this audit and the resolved discussion decisions.
