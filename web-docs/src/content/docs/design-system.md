---
title: design-system
description: "That's the guide. 8 rules, no fluff, no inventory, no implementation steps. Regulations that prevent the recurring problems:"
---

That's the guide. 8 rules, no fluff, no inventory, no implementation steps. Regulations that prevent the recurring problems:

No Mantine
Styles live with their component
Tokens come from tailwind.css
Exact replacement map for --mantine-* variables
Never revert user work
Don't delete third-party library overrides
Verify after every CSS edit
Ark UI uses data-selected, not data-state
Claude’s Plan
Frontend Styling Regulations
These rules are mandatory for every AI session working on this codebase. Violating them causes regressions that waste entire sessions to fix.

Read docs/design-system.md for the full token/color/spacing/typography spec. This document covers operational rules for working with the code.

Rule 1: No Mantine
Mantine is being removed. 61 files still import it — that number only goes down, never up.

Never add a new @mantine/core import
Never write var(--mantine-*) in any CSS
Never write light-dark() in any CSS — this is a Mantine pattern, it is banned
Never write .mantine-* class selectors
When touching a file that uses Mantine, replace Mantine components with HTML + Tailwind
Rule 2: Styles Live With Their Component
There is no central CSS monolith. Each component owns its styles in a .css file next to its .tsx. The .tsx imports its own .css.

Component	CSS file
LeftRail	components/shell/LeftRail.css
TopCommandBar	components/shell/TopCommandBar.css
ShellHeaderTitle	components/common/ShellHeaderTitle.css
AppPageShell	components/layout/AppPageShell.css
FlowsRouteShell	components/layout/FlowsRouteShell.css
FlowWorkbench	components/flows/FlowWorkbench.css
FlowDetail	pages/FlowDetail.css
Flows	pages/Flows.css
theme.css exists only as a legacy file being emptied. When you move rules out of it, they go to the component's CSS file. theme.css only keeps: body reset, shared grid utilities, global .is-* modifiers.

Rule 3: All Tokens Come From tailwind.css
Design tokens live in web/src/tailwind.css as CSS custom properties. The @theme inline block bridges them to Tailwind utilities. Dark mode is :root default. Light mode is [data-theme='light'].

Never define new tokens in theme.css or theme.ts. If you need a new token, add it to tailwind.css.

Rule 4: Mantine → Tailwind Replacement Map
When replacing var(--mantine-*), use these exact values:

Spacing: --mantine-spacing-xs → 0.25rem, sm → 0.5rem, md → 1rem, lg → 1.5rem, xl → 2rem

Font sizes: --mantine-font-size-xs → 0.75rem, sm → 0.875rem

Semantic colors:

Mantine variable	Replacement
--mantine-color-body	var(--background)
--mantine-color-text	var(--foreground)
--mantine-color-default	var(--card)
--mantine-color-default-hover	var(--accent)
--mantine-color-default-border	var(--border)
--mantine-color-dimmed	var(--muted-foreground)
--mantine-primary-color-filled	var(--primary)
--mantine-primary-color-contrast	var(--primary-foreground)
Gray scale (zinc): gray-0 #fafafa, gray-1 #f4f4f5, gray-2 #e4e4e7, gray-3 #d4d4d8, gray-4 #a1a1aa, gray-5 #71717a, gray-6 #52525b, gray-7 #3f3f46, gray-8 #27272a, gray-9 #09090b

Named colors: blue-4 #60a5fa, blue-5 #3b82f6, blue-6 #2563eb, green-6 #16a34a, red-6 #dc2626, yellow-6 #ca8a04, dark-6 #27272a

light-dark() replacement: Dark is default. light-dark(LIGHT, DARK) → use the dark value, or if it matches a tailwind token use that token instead.

Rule 5: Never Revert User Work
If the user has been editing a file across sessions — trimming it, refactoring it, migrating it — do NOT:

git checkout that file
Overwrite it with a "checkpoint" commit that includes a stale version
Restore deleted code the user already removed
Before committing any file, check if it's smaller than the committed version. If theme.css line count goes UP in a commit, something is wrong.

Rule 6: Third-Party Library Overrides Are Real
Classes like .react-pdf-*, .uppy-*, .rdg-* target DOM rendered by third-party libraries. No .tsx file references them directly — the library renders those class names internally. They are NOT unused. Do not delete them without confirming the library is removed from the project.

Rule 7: Verify After Every CSS Edit

grep -c "light-dark(" web/src/theme.css        # must be 0 or decreasing
grep -c "\-\-mantine-" web/src/theme.css        # must be 0 or decreasing
wc -l web/src/theme.css                          # must only go DOWN
Rule 8: Ark UI Data Attributes
Ark UI (via Zag.js) uses data-selected, data-disabled, data-focus, etc. — NOT data-state="active". When styling Ark UI components with Tailwind, use data-[selected]: not data-[state=active]:.s
## Stack

- **shadcn/ui** — standard UI components (Button, Dialog, Input, Select, Tabs, Toast, etc.)
- **Ark UI** — specialized headless components (Tree View, JSON Tree View, File Upload, Splitter, Color Picker, Tour, etc.)
- **Tailwind CSS** — all styling. No separate CSS files. No CSS-in-JS. Every style is a utility class on the element.
- **Ark-first rule** - when Ark UI provides the needed component, use Ark UI.

No other styling system is allowed. No Mantine. No custom global CSS classes.

---

## Tokens

All design tokens live in `tailwind.css` as CSS custom properties. The `@theme inline` block bridges them to Tailwind utilities.

Dark mode is the default (`:root`). Light mode activates via `[data-theme='light']` on the root element.

### Semantic color tokens

| Token | Dark (default) | Light | Use |
|-------|---------------|-------|-----|
| `--background` | `#0e0e0e` | `#fafaf9` | page background |
| `--foreground` | `#eeeeee` | `#1c1917` | body text |
| `--card` | `#141414` | `#ffffff` | card/panel surface |
| `--card-foreground` | `#eeeeee` | `#1c1917` | card text |
| `--popover` | `#141414` | `#ffffff` | popover surface |
| `--popover-foreground` | `#eeeeee` | `#1c1917` | popover text |
| `--primary` | `#EB5E41` | `#EB5E41` | primary actions, brand accent (coral) |
| `--primary-foreground` | `#ffffff` | `#ffffff` | text on primary |
| `--secondary` | `#1a1a1a` | `#f5f5f4` | secondary surface |
| `--secondary-foreground` | `#eeeeee` | `#1c1917` | text on secondary |
| `--muted` | `#1a1a1a` | `#f5f5f4` | muted backgrounds |
| `--muted-foreground` | `#a0a0a0` | `#78716c` | muted/dimmed text |
| `--accent` | `#1a1a1a` | `#f5f5f4` | accent surface |
| `--accent-foreground` | `#eeeeee` | `#1c1917` | text on accent |
| `--destructive` | `#dc2626` | `#dc2626` | destructive actions |
| `--destructive-foreground` | `#ffffff` | `#ffffff` | text on destructive |
| `--border` | `#2a2a2a` | `#e7e5e4` | borders, dividers |
| `--input` | `#2a2a2a` | `#e7e5e4` | input borders |
| `--ring` | `#EB5E41` | `#EB5E41` | focus ring (coral) |

### Sidebar tokens

| Token | Dark | Light |
|-------|------|-------|
| `--sidebar` | `#0e0e0e` | `#fafaf9` |
| `--sidebar-foreground` | `#eeeeee` | `#1c1917` |
| `--sidebar-primary` | `#EB5E41` | `#EB5E41` |
| `--sidebar-primary-foreground` | `#ffffff` | `#ffffff` |
| `--sidebar-accent` | `#1a1a1a` | `#f5f5f4` |
| `--sidebar-accent-foreground` | `#eeeeee` | `#1c1917` |
| `--sidebar-border` | `#2a2a2a` | `#e7e5e4` |
| `--sidebar-ring` | `#eeeeee` | `#1c1917` |

**Rule:** Never use raw hex values in components. Always reference semantic tokens via Tailwind utilities (`bg-background`, `text-foreground`, `border-border`, etc.). If a color is not in the token list, it does not exist in the design system.

### Flow canvas tokens

| Token | Dark (default) | Light | Use |
|-------|---------------|-------|-----|
| `--flow-accent` | `#9eb0c7` | `#6b7f99` | flow canvas primary accent |
| `--flow-accent-soft-bg` | `rgba(158,176,199,0.22)` | `rgba(107,127,153,0.14)` | soft accent surface |
| `--flow-accent-soft-border` | `rgba(158,176,199,0.40)` | `rgba(107,127,153,0.34)` | soft accent border |
| `--flow-active-tab-text` | `#e7eef8` | `#1c1917` | active tab text in flow shell |
| `--flow-shell-glow` | `rgba(122,140,162,0.20)` | `rgba(107,127,153,0.10)` | flow shell glow effect |

### Admin/settings tokens

| Token | Dark (default) | Light | Use |
|-------|---------------|-------|-----|
| `--admin-config-rail-bg` | `#101113` | `#ffffff` | settings rail background |
| `--admin-config-rail-border` | `#2a2a2a` | `#e8e5e3` | settings rail border |
| `--admin-config-frame-bg` | `#141414` | `#ffffff` | settings frame background |
| `--admin-config-header-bg` | `#181818` | `#f5f3f1` | settings section header |
| `--admin-config-content-bg` | `#0f0f10` | `#faf9f7` | settings content area |
| `--admin-config-status-success-bg` | `rgba(34,197,94,0.16)` | `rgba(22,163,74,0.12)` | success status overlay |
| `--admin-config-status-success-border` | `rgba(34,197,94,0.40)` | `rgba(22,163,74,0.38)` | success status border |
| `--admin-config-status-success-fg` | `#86efac` | `#166534` | success status text |
| `--admin-config-status-error-bg` | `rgba(220,38,38,0.18)` | `rgba(220,38,38,0.10)` | error status overlay |
| `--admin-config-status-error-border` | `rgba(248,113,113,0.42)` | `rgba(220,38,38,0.32)` | error status border |
| `--admin-config-status-error-fg` | `#fca5a5` | `#b91c1c` | error status text |

### Code pane tokens

| Token | Dark (default) | Light | Use |
|-------|---------------|-------|-----|
| `--app-code-pane-bg` | `#14161b` | — | code editor background |
| `--app-code-pane-border` | `rgba(255,255,255,0.08)` | — | code editor border |
| `--app-code-pane-fg` | `rgba(255,255,255,0.88)` | — | code editor foreground |

### Grid tokens

| Token | Dark (default) | Light | Use |
|-------|---------------|-------|-----|
| `--app-grid-background` | `#09090b` | `#ffffff` | data grid surface |
| `--app-grid-chrome-background` | `#09090b` | `#faf9f7` | data grid chrome/header |
| `--app-grid-foreground` | `#fafafa` | `#1c1917` | data grid text |
| `--app-grid-border` | `#27272a` | `#d6d3d1` | data grid borders |
| `--app-grid-subtle-text` | `#a1a1aa` | `#78716c` | data grid secondary text |

### JSON tree view syntax tokens

| Token | Dark (default) | Light | Use |
|-------|---------------|-------|-----|
| `--json-string` | `#a5d6a7` | `#2e7d32` | string values |
| `--json-number` | `#90caf9` | `#1565c0` | number values |
| `--json-boolean` | `#ce93d8` | `#7b1fa2` | boolean values |
| `--json-key` | `#ef9a9a` | `#c62828` | object keys |
| `--json-accent` | `#ffcc80` | `#e65100` | accent/highlight |
| `--json-null` | `#78909c` | `#546e7a` | null values |

---

## Typography

### Font stacks

| Token | Stack | Use |
|-------|-------|-----|
| `--font-sans` | IBM Plex Sans, system-ui, sans-serif | all UI text |
| `--font-mono` | JetBrains Mono, IBM Plex Mono, ui-monospace, monospace | code, tabular data |

Serif is available only as a user-selected option for data grid viewing: Georgia, Cambria, Times New Roman, serif.

### Size scale (rem, relative to 16px root)

| Tailwind class | rem | Use |
|----------------|-----|-----|
| `text-xs` | 0.75 | badges, timestamps, fine print |
| `text-sm` | 0.875 | body text, form labels, table cells |
| `text-base` | 1.0 | default body, inputs |
| `text-lg` | 1.125 | section labels, emphasized body |
| `text-xl` | 1.25 | page subtitles |

### Nav-specific sizes (CSS custom properties)

| Property | rem | Use |
|----------|-----|-----|
| `--app-font-size-nav-label` | 0.6875 | sidebar category labels |
| `--app-font-size-nav-caption` | 0.75 | sidebar secondary text |
| `--app-font-size-nav` | 0.875 | sidebar link text |
| `--app-font-size-nav-strong` | 0.9375 | sidebar active/strong link |
| `--app-font-size-brand` | 1.6875 | logo text |

### Headings

| Level | rem | weight | line-height |
|-------|-----|--------|-------------|
| h1 | 2.25 | 800 | 1.2 |
| h2 | 2.0 | 700 | 1.25 |
| h3 | 1.5 | 600 | 1.3 |
| h4 | 1.25 | 600 | 1.4 |
| h5 | 1.0 | 600 | 1.5 |
| h6 | 0.875 | 600 | 1.5 |

### Line-height

- Body text: `1.6` (`leading-relaxed`)
- Headings: 1.2–1.5 (decreasing with size, see table)
- Data grid cells: `1.3` compact, `1.5` comfortable
- Single-line UI (buttons, badges, nav links): `1` (`leading-none`)

### Weight

| Tailwind class | Use |
|----------------|-----|
| `font-normal` (400) | body, form values, table cells |
| `font-medium` (500) | labels, captions, secondary emphasis |
| `font-semibold` (600) | subheadings (h3–h6), active nav, column headers |
| `font-bold` (700) | h2, section titles |
| `font-extrabold` (800) | h1 only |

**Rule:** Never use weight alone to convey meaning. Always pair with size or color difference.

---

## Spacing

Tailwind's default spacing scale. Base unit: `0.25rem` (4px). All spacing is a multiple.

| Class | rem | Use |
|-------|-----|-----|
| `gap-1` / `p-1` | 0.25 | tight internal padding |
| `gap-2` / `p-2` | 0.5 | compact element spacing |
| `gap-3` / `p-3` | 0.75 | inline sibling spacing |
| `gap-4` / `p-4` | 1.0 | section padding |
| `gap-5` / `p-5` | 1.25 | generous padding |
| `gap-6` / `p-6` | 1.5 | vertical section rhythm |

**Rules:**
- Inline spacing between siblings: `gap-3` or `gap-4`.
- Section padding: `p-4` to `p-5`.
- Page-level gutters: `p-4` on mobile, `p-5` on desktop.
- Vertical rhythm between sections: `gap-6`.
- Never use raw pixel values.

---

## Borders & Radius

**Border width:** `border` (1px) always. No 2px borders.

**Border color:** `border-border` (resolves to `--border` token).

**Radius:**

| Tailwind class | Value | Use |
|----------------|-------|-----|
| `rounded-sm` | `calc(var(--radius) - 4px)` | badges, chips, small pills |
| `rounded-md` | `calc(var(--radius) - 2px)` | buttons, inputs, selects |
| `rounded-lg` | `var(--radius)` (0.625rem) | cards, modals, panels |
| `rounded-xl` | `calc(var(--radius) + 4px)` | large containers |
| `rounded-full` | 9999px | avatars, dots |

---

## Layout

| Dimension | Value | Notes |
|-----------|-------|-------|
| header height | 4.5rem | fixed; brand + command bar |
| sidebar width | 18.5rem | collapsible; 0 when hidden |
| content max-width | 85rem | centered, never wider |
| pane header height | 3.125rem | consistent across all pane headers |

### Breakpoints

| Tailwind prefix | Width |
|-----------------|-------|
| (none) | mobile-first default |
| `md:` | ≥ 48em (768px) |
| `lg:` | ≥ 64em (1024px) |
| `xl:` | ≥ 80em (1280px) |

**Rules:**
- Below `md`: sidebar collapses, multi-column layouts stack to single column.
- All heights use `dvh`, never `vh`.
- Page content area: `h-[calc(100dvh-4.5rem)]`.
- Panes within a page: CSS Grid with `minmax(0,1fr)` — never fixed heights on content areas.

---

## Data Grid

### Density

| Mode | Row height | Cell padding | Line-height |
|------|------------|--------------|-------------|
| compact | 2rem | 0.125rem | 1.3 |
| comfortable | 2.5rem | 0.375rem | 1.5 |

### Grid font sizing (mono adjustment)

Mono fonts render visually larger than sans. Apply a multiplier:

| Size | Sans | Mono multiplier |
|------|------|-----------------|
| small (0.75rem) | 1.0 | 0.95 |
| medium (0.875rem) | 1.0 | 0.9 |
| large (1.0rem) | 1.0 | 0.86 |

**Rules:**
- Header row: `bg-muted` or equivalent semi-transparent overlay.
- Row striping: even/odd rows with subtle alpha differences (≤ 0.12).
- Selected row: sky-blue overlay (`rgba(56, 189, 248, 0.18)` light / `0.3` dark).
- Grid overrides on third-party components use `!important`. This is intentional.
- Column headers: `font-semibold`, sans stack always (even when cells use mono/serif).

---

## Elevation

Two levels only:

| Level | Value | Use |
|-------|-------|-----|
| none | `shadow-none` | default state |
| card-hover | `shadow-lg` | hover on interactive cards |

**Rule:** No other shadows. No inset shadows. No colored shadows.

---

## Status & Overlay

| State | Alpha | Color |
|-------|-------|-------|
| staged/pending | 0.14 | amber `rgba(250, 176, 5, α)` |
| confirmed/success | 0.12 | green `rgba(46, 189, 89, α)` |
| selected | 0.18–0.3 | sky `rgba(56, 189, 248, α)` |

**Rule:** Status colors are always semi-transparent overlays on the existing surface — never solid backgrounds.

---

## Dark Mode

Dark is the default. Light activates via `data-theme="light"` on `<html>`.

**Rules:**
- Every component uses Tailwind semantic color utilities (`bg-background`, `text-foreground`, `border-border`). These resolve automatically per mode.
- For one-off mode differences, use Tailwind's `dark:` variant.
- Never detect mode in JS. Never toggle classes manually for dark/light.
- Never use `light-dark()` CSS function (Mantine pattern — banned).

---

## Component Styling

**Rule:** All styles are Tailwind utility classes directly on JSX elements. No exceptions.

- No `.css` files per component.
- No global CSS class names (`.my-component-header`).
- No CSS-in-JS or styled-components.
- No `style={{ }}` props except for truly dynamic values (e.g., `style={{ width: computedPx }}`).
- Use `cn()` (clsx + twMerge) for conditional class composition.

---

## What This Doc Does NOT Cover

- Component APIs or prop signatures
- File structure or import paths
- Component behavior or state machines
- Animation/transition timing (components decide their own)
- Z-index stacking (components manage their own layer)
