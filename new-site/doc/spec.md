# blockdata Frontend Design Specification v1.0

Date: 2026-02-18
Status: Locked tokens + interaction contracts. Remaining sections pending design decisions.

---

## Locked Visual Token Pack v1 (Normative)

This section is normative. Implementation must use these tokens directly.

### 1) Color Tokens (Dark Tooling Surfaces)

```css
:root {
  /* Surface */
  --surface-primary: #151515;
  --surface-canvas: #0d0d0d;
  --surface-secondary: #1f1f1f;
  --surface-tertiary: #2a2a2a;

  /* Border */
  --border-subtle: #333333;
  --border-default: #404040;
  --border-strong: #575757;

  /* Text */
  --text-primary: #f5f5f5;
  --text-secondary: #b3b3b3;
  --text-muted: #8a8a8a;
  --text-disabled: #666666;

  /* Brand / Actions */
  --brand-primary: #5aa2ff;
  --brand-action: #2f82e6;
  --state-success: #2ebd59;
  --state-warning: #fab005;
  --state-danger: #fa5252;

  /* Focus */
  --focus-ring: #7ab7ff;
  --focus-ring-shadow: 0 0 0 2px rgba(122, 183, 255, 0.35);
}
```

### 2) Spacing Tokens (px units)

```css
:root {
  --space-0: 0px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
}
```

### 3) Radius Tokens (px units)

```css
:root {
  --radius-none: 0px;
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-pill: 999px;
}
```

### 4) Typography Tokens (px units)

```css
:root {
  --font-family-sans: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", Helvetica, Arial, sans-serif;
  --font-family-mono: "IBM Plex Mono", "Cousine", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  --font-size-xs: 10px;
  --font-size-sm: 11px;
  --font-size-md: 12px;
  --font-size-lg: 14px;
  --font-size-xl: 16px;
  --font-size-2xl: 18px;
  --font-size-3xl: 24px;

  --line-height-xs: 12px;
  --line-height-sm: 16px;
  --line-height-md: 20px;
  --line-height-lg: 24px;
  --line-height-xl: 28px;
}
```

### 5) Elevation + Motion Tokens

```css
:root {
  --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.20);
  --shadow-2: 0 4px 12px rgba(0, 0, 0, 0.40);
  --shadow-3: 0 8px 24px rgba(0, 0, 0, 0.50);

  --motion-fast: 120ms;
  --motion-normal: 180ms;
  --motion-slow: 240ms;
  --ease-standard: cubic-bezier(0.2, 0.0, 0, 1);
}
```

### 6) Mandatory Usage Rules

1. No direct hex values in feature CSS; only token references.
2. No ad hoc border-radius values; only radius tokens.
3. No arbitrary margin/padding values; only spacing tokens.
4. If a new token is required, it must be added to this section first.
5. Mantine theme mapping must reference this token pack.

---

## Locked Interaction Contract v1 (Normative)

This section defines exact interaction behavior. Do not implement only abstract states.

### 1) Global State Timing and Motion

1. Hover-in transition: `var(--motion-fast)` with `var(--ease-standard)`.
2. Pressed/active transition: `var(--motion-fast)` with `var(--ease-standard)`.
3. Panel open/close and drawer transitions: `var(--motion-normal)` with `var(--ease-standard)`.
4. Disabled elements must have no animated hover effect.
5. Respect `prefers-reduced-motion: reduce` by disabling non-essential transitions.

### 2) Base Interactive Element Rules

1. Minimum hit target: 32x32px for icon-only controls, 36px height for regular controls.
2. `:focus-visible` is mandatory and uses `--focus-ring-shadow`.
3. Disabled state requires:
   - reduced contrast (`--text-disabled`)
   - no pointer cursor
   - no hover visual elevation
4. Hover on touch-only devices should not produce sticky visual states.

### 3) Buttons and Segmented Controls

1. Default button:
   - background: `--surface-secondary`
   - border: `1px solid --border-default`
   - text: `--text-primary`
2. Hover:
   - border shifts to `--border-strong`
   - optional elevation `--shadow-1`
3. Active/pressed:
   - translate Y by `1px` maximum
   - remove elevation boost
4. Primary action button:
   - background and border: `--brand-action`
   - hover uses a slightly darker shade via tokenized variant

### 4) Tabs and Left-Rail Navigation

1. Idle tab/nav item uses `--text-secondary`.
2. Hover state:
   - subtle background tint on `--surface-tertiary`
   - text to `--text-primary`
3. Active state:
   - persistent selected background
   - stronger border/accent indicator (left bar or bottom bar by pattern)
4. Keyboard interaction:
   - Arrow keys move between tab stops in tablists
   - Enter/Space activates focused item

### 5) Inputs and Dropdowns

1. Default:
   - background: `--surface-secondary`
   - border: `1px solid --border-default`
2. Hover:
   - border to `--border-strong`
3. Focus-visible:
   - border uses `--focus-ring`
   - focus ring shadow uses `--focus-ring-shadow`
4. Validation:
   - error border and helper text use `--state-danger`
   - warning uses `--state-warning`

### 6) Pane Resizers and Drag Behavior

1. Resizer visual width: 10px hit area minimum.
2. Cursor:
   - horizontal splitters: `col-resize`
   - vertical splitters: `row-resize`
3. Drag threshold before resize engages: 3px pointer movement.
4. Double-click on resizer resets pane width to default.
5. Keyboard resizing:
   - Arrow adjusts by 8px
   - Shift+Arrow adjusts by 24px
6. Width changes must persist after drag end.

### 7) Canvas and Node Interaction

1. Node states must be visually distinct:
   - default
   - hover
   - selected
   - dragging
   - disabled
   - error/warning
2. Selected node must show a clear high-contrast ring/border.
3. Drag start threshold: 3px.
4. Edge state:
   - default stroke token
   - selected stroke token
5. Handles/ports:
   - default, hover, connectable, connected, disabled states must be visually unique.

### 8) Toolbar and Floating Controls

1. Floating toolbar stays above canvas layers (`z-index` tokenized).
2. Icon controls follow the same default/hover/active/focus rules as other controls.
3. Disabled tools are visible but clearly inactive and non-interactive.

### 9) Interaction Accessibility Rules

1. Every icon-only control requires `aria-label`.
2. Focus order must match visual order.
3. No keyboard trap in side panels, modals, or canvas toolbars.
4. Escape closes transient UI (menus/popovers/modals) when appropriate.
5. Critical actions must be reachable without pointer input.

### 10) Interaction Acceptance Checklist

1. Every interactive element has default/hover/active/focus-visible/disabled behavior implemented.
2. Resizer drag and keyboard resize are both supported.
3. Canvas node selection and drag thresholds are deterministic.
4. Focus ring is visible across all controls.
5. Reduced-motion mode is respected.

---

## Shell Contracts (Locked from wireframes)

### Tooling Shell (default for app pages)

Required zones:
1. Header (fixed height)
2. Left nav rail (fixed width)
3. Explorer/secondary nav (optional, resizable)
4. Main work area (fluid)
5. Config pane (resizable, collapsible)
6. AI assistant pane (resizable, snap-to-tab)

Locked baseline:
1. Header: 52px
2. Left nav: 224px (full height, spans both rows)
3. Secondary/explorer column: 220px (optional, present on playground-2/3/4)
4. Config pane default: 360px (resizable, collapsible at 160px threshold)
5. AI pane default: 360px (resizable, snap-to-tab at 80px threshold)
6. AI tab (collapsed): 40px
7. Resize bounds: 120px min, 920px max

Connected shell styling (tooling pages only):

- Pane borders: `box-shadow: inset -1px 0 0 #111, inset 0 -1px 0 #111`
- Grid gap: 0px
- Outer border: `1px solid #111`
- Resizer separators: 10px wide, `1px solid #111` on each side

### Public Shell (nonauth, auth)

Top nav + centered content container. Same token system and component states apply.

- Content width: `min(92vw, 1180px)`
- Auth container width: `min(92vw, 480px)`

---

## Core Principles

1. Grid first for page shells. Use Flexbox inside regions, not for whole-shell geometry.
2. CSS-owned visual system. Do not depend on library theme defaults for final visual identity.
3. Token-driven design. No hard-coded random values in feature components.
4. Density by intent. Tooling surfaces are dense; public surfaces can be relaxed.
5. Reuse over invention. New pages compose existing shell primitives before creating new ones.

## Typography Contract

1. Base font family: Inter, system fallback stack.
2. Tooling surfaces default body size: 12px.
3. Section headers: 14px.
4. Page titles: 18-24px depending on hierarchy.
5. Code/data views use monospace stack only where functionally needed.

Rule: Do not set global `html { font-size: 12px; }` for entire app. Scope dense typography to tooling namespace.

## Token System

All new UI must consume tokens from CSS custom properties.

Minimum token groups:
1. Surface: primary, canvas, secondary
2. Borders: subtle, strong, focus
3. Text: primary, secondary, disabled
4. Brand: primary, action
5. Spacing scale: xs, s, m, l, xl
6. Radius scale: s, m, l, pill
7. Elevation: 1, 2, 3
8. Motion: fast, normal, slow

Rule: No raw hex use in feature-level CSS unless mapping to token definition file.

## Grid and Pane Behavior

1. Panes must resize independently.
2. Collapse state and widths persist in local storage.
3. Each pane owns its own scroll behavior.
4. `min-width: 0` and `min-height: 0` must be set on grid children to prevent overflow bugs.

## Component Standards

Required primitives for consistency:
1. Page header
2. Left rail nav section
3. Panel container with title bar
4. Dense table/list row pattern
5. Primary/secondary/icon button variants
6. Empty state pattern
7. Error state pattern

## State Model

Every interactive component must define:
1. Default
2. Hover
3. Active
4. Focus-visible
5. Disabled
6. Error (where applicable)

## Accessibility Baseline

1. Keyboard navigable controls only.
2. `aria-label` required for icon-only actions.
3. Visible focus ring required for keyboard focus.
4. Minimum contrast target: WCAG AA.
5. Respect reduced motion preference.

## Page Acceptance Checklist

A page is compliant only if all are true:
1. Uses approved shell contract.
2. Uses tokenized CSS values.
3. Uses approved typography scale.
4. Defines all interaction states.
5. Meets accessibility baseline.
6. No ad hoc one-off layout hacks.

## Governance

1. Spec updates require a version bump (`v1`, `v1.1`, `v2`).
2. Changes must include migration notes.
3. Do not silently modify foundational tokens or shell geometry rules.

---

## Technology Boundary (Locked)

Use each tool only for the layer it is best at.

### Custom CSS Grid (required)

Use custom CSS Grid for:
1. App shell geometry
2. Quad-pane layout
3. Pane splitters and resizers

Constraint:
- Do not use Mantine `AppShell` for this workbench shell because it is too opinionated for the required quad-pane behavior.

### React Flow (required)

Use React Flow only for:
1. Infinite canvas viewport behavior
2. Node rendering host
3. Edge/connection behavior
4. Minimap and canvas interaction primitives

Constraint:
- Keep visual identity in project CSS. Do not rely on React Flow default visual styling as final UI.

### Mantine (required inside panes)

Use Mantine for all intra-panel UI controls and interactions.

Examples:
1. Search inputs
2. Save/Run buttons
3. Environment dropdowns
4. New Chat input controls
5. Tooltips
6. Modals
7. Form controls and validation affordances

Constraint:
- Mantine is component/UI primitive layer inside panels, not the page-shell geometry layer.

---

## Mantine Token Bridge (Mandatory)

Mantine must be treated as a token consumer, not a separate design system.

### Policy

1. Redesign tokens are the source of truth.
2. Mantine theme values must be derived from redesign tokens.
3. If a Mantine component conflicts with tokenized shell visuals, override with scoped CSS in the page namespace.

### Required mapping

Map redesign tokens into Mantine theme slots for:
1. Colors (surface, text, border, brand)
2. Radius scale
3. Spacing scale
4. Typography sizes/weights
5. Focus ring and default border behavior

### Component behavior target

Mantine controls inside panels must visually read as native to the custom shell.

Must align for:
1. Input backgrounds and borders
2. Button heights/radius/contrast
3. Select/dropdown panel styling
4. Tooltip and modal surfaces
5. Hover/active/focus-visible states

### Implementation rule

1. Keep shell geometry in custom CSS Grid.
2. Keep canvas behavior in React Flow.
3. Keep panel controls in Mantine, but always through token-bridged theme + scoped overrides.

### Version note

Current repo dependency is Mantine `8.3.15` (`new-site/package.json`).

---

## Global CSS Baseline

### Text rendering

```css
html {
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-size-adjust: 100%;
}
```

### App root reset

```css
body {
  margin: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

#root {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
```

### React Flow CSS layer

- `react-flow__viewport` uses transform-based pan/zoom.
- Layering model: edges, nodes, selection, controls, minimap.
- Minimap and controls are absolutely positioned panel overlays.
- Visual styling must remain project-owned, not React Flow defaults.

---

## Stack

- React 19 + TypeScript
- Vite 7
- Mantine 8.3.15 (core, hooks, notifications)
- @xyflow/react 12.10
- @tabler/icons-react
- react-router-dom 7
- PostCSS (postcss-preset-mantine, postcss-simple-vars)
