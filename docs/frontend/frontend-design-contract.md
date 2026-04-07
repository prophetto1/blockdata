# Frontend Design Contract

**Version:** 1.0-draft
**Date:** 2026-04-05
**Source of truth:** `web/src/tailwind.css` for CSS custom properties; TypeScript contracts in `web/src/lib/` for programmatic access.
**Companion:** Assessment report at `2026-04-05-frontend-design-system-assessment.md`

This document declares the canonical frontend design contract for the `writing-system/web` codebase. Values marked **Canonical** are read directly from the current source. Values marked **Proposed** do not yet exist in the codebase and require approval before implementation.

---

## 1. Color Contract

### 1.1 Core Semantic Tokens — STATUS: Canonical

Source: `web/src/tailwind.css` :root (dark) and :root[data-theme='light'] (light).

| Token | Dark | Light | Role |
|---|---|---|---|
| --background | #0e0e0e | #faf9f7 | Page background |
| --foreground | #eeeeee | #1c1917 | Primary text |
| --card | #141414 | #ffffff | Card / elevated surface |
| --card-foreground | #eeeeee | #1c1917 | Text on card |
| --popover | #141414 | #ffffff | Dropdown / popover surface |
| --popover-foreground | #eeeeee | #1c1917 | Text on popover |
| --primary | #EB5E41 | #EB5E41 | Brand primary (same both modes) |
| --primary-foreground | #ffffff | #ffffff | Text on primary |
| --secondary | #1a1a1a | #f0eeed | Secondary surface (pills, tags) |
| --secondary-foreground | #eeeeee | #292524 | Text on secondary |
| --muted | #1a1a1a | #e8e6e3 | Muted / disabled surface |
| --muted-foreground | #a0a0a0 | #44403c | Secondary / helper text |
| --accent | #1a1a1a | #f5ebe6 | Accent surface (warm tint) |
| --accent-foreground | #eeeeee | #1c1917 | Text on accent |
| --destructive | #dc2626 | #dc2626 | Error / destructive (same both modes) |
| --destructive-foreground | #ffffff | #ffffff | Text on destructive |
| --border | #2a2a2a | #d6d3d1 | Default border |
| --input | #2a2a2a | #d6d3d1 | Form input border |
| --ring | #EB5E41 | #EB5E41 | Focus ring (same both modes) |
| --chrome | #0e0e0e | #ffffff | Header + sidebar surface |

### 1.2 Sidebar Tokens — STATUS: Canonical

| Token | Dark | Light |
|---|---|---|
| --sidebar | #0e0e0e | #ffffff |
| --sidebar-foreground | #eeeeee | #1c1917 |
| --sidebar-primary | #EB5E41 | #EB5E41 |
| --sidebar-primary-foreground | #ffffff | #ffffff |
| --sidebar-accent | #1a1a1a | #f5f3f1 |
| --sidebar-accent-foreground | #eeeeee | #1c1917 |
| --sidebar-border | #2a2a2a | #e8e5e3 |
| --sidebar-ring | #eeeeee | #1c1917 |

### 1.3 Gray Scale — STATUS: Canonical

| Token | Value | Note |
|---|---|---|
| --app-gray-1 | #f4f4f5 | Lightest |
| --app-gray-2 | #e4e4e7 | |
| --app-gray-3 | #d4d4d8 | |
| --app-gray-4 | #a1a1aa | |
| --app-gray-5 | #71717a | |
| --app-gray-6 | #52525b | |
| --app-gray-7 | #3f3f46 | |
| --app-gray-8 | #27272a | |
| --app-gray-9 | #09090b | Darkest |

### 1.4 Status Palette — STATUS: Canonical

| Token | Value |
|---|---|
| --app-blue-5 | #339af0 |
| --app-blue-6 | #228be6 |
| --app-yellow-6 | #fab005 |
| --app-green-6 | #40c057 |
| --app-red-6 | #fa5252 |

### 1.5 Admin Config Colors — STATUS: Canonical

| Token | Dark | Light | Role |
|---|---|---|---|
| --admin-config-rail-bg | #101113 | #ffffff | Second rail bg |
| --admin-config-rail-border | #2a2a2a | #e8e5e3 | Second rail divider |
| --admin-config-frame-bg | #141414 | #ffffff | Frame/card surface |
| --admin-config-header-bg | #181818 | #f5f3f1 | Section header surface |
| --admin-config-content-bg | #0f0f10 | #faf9f7 | Content area bg |
| --admin-config-status-success-bg | rgba(34,197,94,0.16) | rgba(22,163,74,0.12) | Success banner bg |
| --admin-config-status-success-border | rgba(34,197,94,0.40) | rgba(22,163,74,0.38) | Success banner border |
| --admin-config-status-success-fg | #86efac | #166534 | Success banner text |
| --admin-config-status-error-bg | rgba(220,38,38,0.18) | rgba(220,38,38,0.10) | Error banner bg |
| --admin-config-status-error-border | rgba(248,113,113,0.42) | rgba(220,38,38,0.32) | Error banner border |
| --admin-config-status-error-fg | #fca5a5 | #b91c1c | Error banner text |

### 1.6 Interaction State Tokens — STATUS: Proposed

These tokens do not exist yet. They are needed to replace the 3 hex values in UI primitives that have no current token equivalent.

| Proposed Token | Dark Value | Light Value | Replaces | Role |
|---|---|---|---|---|
| --interactive-selected-text | #f47a5c | TBD | #f47a5c (10 occurrences) | Checked/selected text in interactive components |
| --interactive-surface | #31312e | TBD | #31312e (5 occurrences) | Interactive background between secondary and border |
| --primary-tinted-bg | #55221e | TBD | #55221e (4 occurrences) | Primary-tinted surface for active tab/step states |

### 1.7 Hex Convergence Map — STATUS: Proposed

These hex values are close to existing tokens and should converge unless visual difference is documented.

| Current Hex | Occurrences | Converge To | Token Value | Visual Delta |
|---|---|---|---|---|
| #3a3a3a | 31 | --border | #2a2a2a | +16 lightness (subtle) |
| #e2503f | 15 | --ring | #EB5E41 | Hue/saturation shift (subtle) |
| #222221 | 12 | --accent | #1a1a1a | +8 lightness (subtle) |
| #111110 | 3 | --background | #0e0e0e | +3 lightness (negligible) |

---

## 2. Typography Contract — STATUS: Canonical

Source: `web/src/lib/font-contract.ts`, `web/src/tailwind.css`.

### 2.1 Font Families

| Token | CSS Var | Stack | Use |
|---|---|---|---|
| sans | --app-font-sans | Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif | All UI text |
| mono | --app-font-mono | JetBrains Mono, IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, Liberation Mono, monospace | Code, data cells, technical values |

### 2.2 Size Scale

| Token | Rem | Px | Use |
|---|---|---|---|
| 2xs | 0.625rem | 10 | Grid cells, dense badges |
| xs | 0.75rem | 12 | Captions, labels, helper text |
| sm | 0.875rem | 14 | Body small, secondary text |
| base | 1rem | 16 | Body, nav items |
| lg | 1.125rem | 18 | Subheadings, nav strong |
| xl | 1.25rem | 20 | Section headings |
| 2xl | 1.5rem | 24 | Page titles |
| 3xl | 1.875rem | 30 | Marketing headings |
| 4xl | 2.25rem | 36 | Hero headings |

### 2.3 Weight Scale

| Token | Value | Use |
|---|---|---|
| normal | 400 | Body text |
| medium | 500 | Labels, nav items |
| semibold | 600 | Subheadings, card titles |
| bold | 700 | Page headings |

### 2.4 Usage Recipes

| Context | Tailwind Classes | Family |
|---|---|---|
| Page title | text-2xl font-bold | sans |
| Section heading | text-xl font-semibold | sans |
| Card title | text-sm font-semibold | sans |
| Body text | text-sm font-normal | sans |
| Nav item | text-sm font-medium | sans |
| Label / caption | text-xs font-medium text-muted-foreground | sans |
| Section label (uppercase) | text-xs font-semibold uppercase tracking-wide text-muted-foreground | sans |
| Badge / pill | text-xs font-medium | sans |
| Data cell | text-xs | mono |
| Code / JSON key | text-xs | mono |
| Dense grid cell | text-2xs | mono |

---

## 3. Spacing Contract — STATUS: Canonical (partial)

### 3.1 CSS Custom Properties

| Token | Value | Px |
|---|---|---|
| --app-space-xs | 0.5rem | 8 |
| --app-space-sm | 0.75rem | 12 |
| --app-space-md | 1rem | 16 |
| --app-space-lg | 1.5rem | 24 |

### 3.2 Convention

Tailwind's default spacing scale is the primary system (~4,700 spacing class occurrences across 250 files). The 4 custom CSS vars are used in shell layout and component composition. Most-used classes: px-3 (469), py-3 (442), p-2 (417), px-4 (417).

---

## 4. Radius Contract — STATUS: Canonical

Source: `web/src/tailwind.css` + `@theme inline`.

| Token | Derivation | Value |
|---|---|---|
| --radius | Base | 0.625rem (10px) |
| --radius-sm | --radius - 4px | 0.375rem (6px) |
| --radius-md | --radius - 2px | 0.5rem (8px) |
| --radius-lg | --radius | 0.625rem (10px) |
| --radius-xl | --radius + 4px | 0.875rem (14px) |

---

## 5. Shadow Contract — STATUS: Proposed

Only 1 shadow token exists. The following scale is proposed to cover the 9 ad-hoc shadows in the codebase.

| Proposed Token | Dark Value | Light Value | Replaces |
|---|---|---|---|
| --shadow-sm | 0 2px 8px rgba(0,0,0,0.15) | 0 2px 8px rgba(28,25,23,0.08) | flow-canvas controls, minimap |
| --shadow-md | 0 3px 10px rgba(15,23,42,0.08) | 0 3px 10px rgba(28,25,23,0.06) | flow node cards |
| --shadow-lg | 0 8px 24px rgba(0,0,0,0.12) | 0 8px 24px rgba(28,25,23,0.08) | Already exists as --app-card-hover-shadow |
| --shadow-xl | 0 14px 40px rgba(0,0,0,0.22) | 0 14px 40px rgba(28,25,23,0.12) | Workspace selector dropdown |
| --shadow-focus-ring | inset 0 0 0 2px color-mix(...) | inset 0 0 0 2px color-mix(...) | Drag-over pane highlight, focus states |

---

## 6. Z-Index Contract — STATUS: Proposed

No z-index tokens exist. The following layering contract is proposed based on the 13 hardcoded values found.

| Proposed Token | Value | Use |
|---|---|---|
| --z-base | 0 | Default stacking context |
| --z-raised | 1 | Slightly elevated elements (hero sections, shell guides) |
| --z-dropdown | 10 | Dropdowns, popovers, menus |
| --z-sticky | 30 | Sticky headers, fixed sidebars |
| --z-tooltip | 50 | Tooltips |
| --z-modal | 60 | Modals, command bar overlays |
| --z-toast | 70 | Toast notifications (must be above modals) |

---

## 7. Animation Contract — STATUS: Proposed

No animation tokens exist. The following are proposed based on the 22 transition instances and 2 keyframe animations found.

### 7.1 Duration Scale

| Proposed Token | Value | Use |
|---|---|---|
| --duration-fast | 100ms | Hover color changes, checkbox toggles |
| --duration-default | 120ms | Standard interactive transitions (13 of 22 instances use this) |
| --duration-slow | 180ms | Layout shifts, column resizes |

### 7.2 Easing

| Proposed Token | Value | Use |
|---|---|---|
| --ease-default | ease | All standard transitions |
| --ease-out | ease-out | Exit animations, tooltips |

### 7.3 Keyframe Standard

The `tooltip-in` animation (120ms ease-out, opacity 0→1 + translateY 2px→0) is used identically in FlowWorkbench.css and Workbench.css. It should be a single shared keyframe.

---

## 8. Border Contract — STATUS: Canonical (color) / Proposed (width)

### 8.1 Border Color — Canonical

| Token | Dark | Light |
|---|---|---|
| --border | #2a2a2a | #d6d3d1 |
| --input | #2a2a2a | #d6d3d1 |
| --sidebar-border | #2a2a2a | #e8e5e3 |

### 8.2 Border Width — Convention (no tokens)

| Width | Use | Count |
|---|---|---|
| 1px | Default (implicit with `border` class) | ~80+ instances |
| 1.5px | Custom focus border (theme.css) | 1 instance |
| 2px | Focus state ring (theme.css) | 1 instance |
| 4px | Flow node variant left border (flow-canvas.css) | 1 instance |

Convention: 1px default. No border-width tokens are proposed — the 1px default is sufficient for this codebase.

---

## 9. Icon Contract — STATUS: Canonical

Source: `web/src/lib/icon-contract.ts`.

### 9.1 Size Scale

| Token | Px |
|---|---|
| xs | 14 |
| sm | 16 |
| md | 20 |
| lg | 24 |
| xl | 28 |
| xxl | 32 |

### 9.2 Semantic Contexts

| Context | Size Token |
|---|---|
| inline | sm (16px) |
| content | md (20px) |
| utility | md (20px) |
| nav | lg (24px) |
| hero | xl (28px) |

### 9.3 Stroke Weights

| Token | Value |
|---|---|
| light | 1.6 |
| regular | 1.8 |
| strong | 2.1 |

### 9.4 Tone Classes

| Tone | Tailwind Class |
|---|---|
| current | (inherits) |
| default | text-foreground |
| muted | text-muted-foreground |
| accent | text-primary |
| success | text-emerald-600 dark:text-emerald-400 |
| warning | text-amber-600 dark:text-amber-400 |
| danger | text-red-600 dark:text-red-400 |

### 9.5 Library Direction

| Library | Current State | Direction |
|---|---|---|
| @tabler/icons-react | 101 files, 48 icons | Migrate to Hugeicons |
| @hugeicons/react | 15 files, generic component | Migration target |
| lucide-react | 8 files, 13 icons | Migrate to Hugeicons |

All icons must pass through the `AppIcon` component abstraction. Direct library imports outside AppIcon are non-compliant.

---

## 10. Shell Layout Contract — STATUS: Canonical

Source: `web/src/tailwind.css`, `web/src/lib/styleTokens.ts`.

### 10.1 Dimensions

| Token | Desktop | Mobile |
|---|---|---|
| --app-shell-header-height | 60px | 44px |
| --app-shell-navbar-width | 220px | 200px |
| --app-shell-navbar-compact-width | 60px | - |
| --app-shell-content-max-width | 1460px | - |
| --app-shell-page-gap | 1rem | 0.75rem |
| --app-shell-page-bottom-padding | 1.5rem | 1rem |

### 10.2 Shell Regions

| Region | Owner | State Owner | Rating |
|---|---|---|---|
| Top header | TopCommandBar.tsx | HeaderCenterContext.tsx | Clear |
| Left rail (primary) | LeftRailShadcn.tsx | nav-config.ts | Clear |
| Left rail (secondary) | 5 competing components | None | Ambiguous |
| Right rail | RightRailShell.tsx | RightRailContext.tsx | Clear |
| Content area | 4 layout components | None | Ambiguous |
| Public shells | 3 layout components | None | Clear |

### 10.3 Runtime Token Access

`web/src/lib/styleTokens.ts` provides runtime access:
- shell.headerHeight: 60
- shell.navbarWidth: 220
- shell.navbarCompactWidth: 60
- shell.navbarMinWidth: 220
- shell.navbarMaxWidth: 350
- shell.rightRailWidth: 350
- shell.assistantWidth: 360
- admin.navWidth: 200

---

## 11. Toolbar Contract — STATUS: Canonical

Source: `web/src/lib/toolbar-contract.ts`.

### 11.1 Button Anatomy

| Property | Value |
|---|---|
| Height | h-7 |
| Padding | px-2 |
| Gap | gap-1.5 |
| Font size | text-xs |
| Font weight | font-medium |
| Line height | leading-4 |
| Radius | rounded-md |
| Border | border |
| Transition | transition-colors |
| Press feedback | active:scale-[0.97] |

### 11.2 States

| State | Classes |
|---|---|
| Active | border-border bg-background text-foreground |
| Inactive | border-transparent text-muted-foreground hover:bg-accent hover:text-foreground |

### 11.3 Strip Layout

| Property | Value |
|---|---|
| Layout | flex flex-wrap items-center |
| Gap | gap-1 |
| Padding | p-2 |
| Background | bg-card |
| Border | border border-border rounded-md |

---

## 12. Component Contract Index — STATUS: Canonical

### 12.1 UI Primitives (34 files)

| Component | Library | Hex Clean | Exports |
|---|---|---|---|
| AppIcon | Standalone | Yes | AppIcon |
| Badge | Standalone | Yes | Badge |
| Button | Radix (Slot) | Yes | Button |
| Input | Standalone | Yes | Input |
| Skeleton | Standalone | Yes | Skeleton |
| ToolbarButton | Standalone | Yes | ToolbarButton |
| SegmentedControl | Standalone | Yes | SegmentedControl |
| NativeSelect | Standalone | Yes | NativeSelect |
| Accordion | Ark UI | No (2 hex) | AccordionRoot, AccordionItem, AccordionItemTrigger, AccordionItemContent |
| Checkbox | Ark UI | No (2 hex) | CheckboxRoot, CheckboxControl, CheckboxIndicator, CheckboxLabel |
| Combobox | Ark UI | No (4 hex) | ComboboxRoot, ComboboxControl, ComboboxInput, ComboboxContent, ComboboxItem |
| Dialog | Ark UI | No (3 hex) | DialogRoot, DialogTrigger, DialogContent, DialogTitle, DialogDescription |
| Menu | Ark UI | No (5 hex) | MenuRoot, MenuTrigger, MenuContent, MenuItem |
| Select | Ark UI | No (4 hex) | SelectRoot, SelectTrigger, SelectContent, SelectItem |
| Tabs | Ark UI | No (5 hex) | Tabs, TabsList, TabsTrigger, TabsContent |
| TreeView | Ark UI | No (9 hex) | TreeViewRoot, TreeViewBranch, TreeViewItem |

(Remaining Ark UI components: collapsible, field, file-upload, number-input, pagination, popover, progress, scroll-area, segment-group, splitter, steps, switch, tags-input, tooltip)

(Remaining Radix components: separator, sheet, sidebar)

---

## 13. State Presentation Contract — STATUS: Canonical (partial)

| State | Component | Location | Universal |
|---|---|---|---|
| Loading | Skeleton | components/ui/skeleton.tsx | No — guard pages use inline spinners |
| Empty | AgchainEmptyState, FlowEmptyState | agchain/, flows/ | No — two competing, plus inline text in other pages |
| Error | ErrorAlert | components/common/ErrorAlert.tsx | No — not universally used |
| Success | Sonner toast | components/ui/provider.tsx | Yes |
| Permission | AuthGuard + SuperuserGuard | auth/, superuser/ | Yes |
| Async | None | - | No shared pattern |

---

## 14. Light / Dark Mode Contract — STATUS: Canonical

| Property | Value |
|---|---|
| Default mode | Dark (color-scheme: dark in :root) |
| Switching mechanism | data-theme attribute on :root |
| Light mode selector | :root[data-theme='light'] |
| Persistence | localStorage, hydrated in main.tsx before React mount |
| Hook | useTheme() from web/src/hooks/useTheme.ts |
| Token coverage | ~68 light-mode overrides for ~137 dark-mode properties |
| Uncovered in light mode | Gray scale (9), status palette (5), font sizes (6), spacing (4), workbench prose (13), decorative (7), code pane (3) |

---

## 15. Compliance Rules

### Token Compliance

1. All color values in component code must reference CSS custom properties or Tailwind semantic classes. Hardcoded hex values are non-compliant.
2. Typography must use FONT_RECIPES from font-contract.ts. Ad-hoc font-size/weight combinations are non-compliant.
3. Icon rendering must pass through AppIcon. Direct icon library imports outside AppIcon are non-compliant.
4. Toolbar buttons must use TOOLBAR_BUTTON_BASE from toolbar-contract.ts. Custom toolbar styling is non-compliant.

### Shell Compliance

5. Pages under /app/* must use one of the 4 authenticated shell layouts (AppLayout, AdminShellLayout, AgchainShellLayout, FlowsShellLayout). Freestyle page shells are non-compliant.
6. Shell dimensions must reference --app-shell-* tokens. Hardcoded pixel values for header height, navbar width, or content max-width are non-compliant.

### State Presentation Compliance

7. Success feedback must use Sonner toast via UIProvider. Custom success patterns are non-compliant.
8. Permission guarding must use AuthGuard (authentication) or SuperuserGuard (admin tiers). Custom permission checks that bypass these guards are non-compliant.

---

## Appendix A: Tailwind @theme Inline Mappings (34 entries)

| Tailwind Token | CSS Var |
|---|---|
| --font-sans | var(--app-font-sans) |
| --font-mono | var(--app-font-mono) |
| --color-background | var(--background) |
| --color-foreground | var(--foreground) |
| --color-card | var(--card) |
| --color-card-foreground | var(--card-foreground) |
| --color-popover | var(--popover) |
| --color-popover-foreground | var(--popover-foreground) |
| --color-primary | var(--primary) |
| --color-primary-foreground | var(--primary-foreground) |
| --color-secondary | var(--secondary) |
| --color-secondary-foreground | var(--secondary-foreground) |
| --color-muted | var(--muted) |
| --color-muted-foreground | var(--muted-foreground) |
| --color-accent | var(--accent) |
| --color-accent-foreground | var(--accent-foreground) |
| --color-destructive | var(--destructive) |
| --color-destructive-foreground | var(--destructive-foreground) |
| --color-border | var(--border) |
| --color-input | var(--input) |
| --color-ring | var(--ring) |
| --color-sidebar | var(--sidebar) |
| --color-sidebar-foreground | var(--sidebar-foreground) |
| --color-sidebar-primary | var(--sidebar-primary) |
| --color-sidebar-primary-foreground | var(--sidebar-primary-foreground) |
| --color-sidebar-accent | var(--sidebar-accent) |
| --color-sidebar-accent-foreground | var(--sidebar-accent-foreground) |
| --color-sidebar-border | var(--sidebar-border) |
| --color-sidebar-ring | var(--sidebar-ring) |
| --radius-sm | calc(var(--radius) - 4px) |
| --radius-md | calc(var(--radius) - 2px) |
| --radius-lg | var(--radius) |
| --radius-xl | calc(var(--radius) + 4px) |

---

## Appendix B: Domain-Specific Token Groups

These groups are canonical but domain-scoped — they apply to specific surfaces, not globally.

| Group | Tokens | Scope |
|---|---|---|
| Grid colors | 5 dark + 5 light | Data grids (ag-grid, react-data-grid) |
| JSON tree view | 18 vars | JsonTreeView component |
| Flow surface | 5 dark + 5 light | Flows workbench |
| Left rail accents | 4 dark + 4 light | Primary navigation rail |
| Marketing | 3 dark + 3 light | Marketing/public pages |
| Code pane | 3 dark | Code viewer surfaces |
| Workbench prose | 13 vars | MDX editor / document workspace |