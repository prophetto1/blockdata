# Frontend Redesign Master Specification v1.1 (Consolidated)

Date: 2026-02-17
Status: Consolidated from listed source documents
v1.1 update: Color token pack updated to match implemented dark-gray/blue palette (2026-02-17)

## Source Documents
1. `docs/frontend/2026-02-17-postman-flow-reactflow-redesign-reference.md`
2. `docs/frontend/2026-02-17-universal-frontend-spec-v1.md`
3. `docs/frontend/design-considerations.md`
4. `docs/frontend/head-inline-styles.md`
5. `docs/frontend/reference_elements_spec.md`
6. `docs/frontend/styles.md`

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

## Section 1: 2026-02-17-postman-flow-reactflow-redesign-reference.md

# Postman Flow Redesign Reference Index (Non-Redundant)

Date: 2026-02-17  
Status: Index document

## 1) Why this file exists

This file is intentionally short.
It is not a second spec. It indexes the canonical artifacts and records deltas.

## 2) Canonical source of truth

Use `docs/frontend/reference_elements_spec.md` as the single exhaustive visual/interaction reference.

## 3) Supporting docs and purpose

1. `docs/frontend/design-considerations.md`
   - Maps redesign requirements to actual `web/` files.
   - Captures architecture decisions and sequencing.
2. `docs/frontend/styles.md`
   - Curated CSS/token extract from inspection data.
3. `docs/frontend/head-inline-styles.md`
   - Curated `<head>` extract and what is actionable vs archival.
4. `docs/frontend/archive/2026-02-17-postman-head-inline-styles-raw.md`
   - Raw archive copy (do not use as implementation spec).
5. `docs/frontend/archive/2026-02-17-postman-styles-raw.md`
   - Raw archive copy (do not use as implementation spec).

## 4) Delta log

### 2026-02-17 (current)

1. Consolidated redundant docs so `reference_elements_spec.md` is canonical.
2. Added explicit mapping from redesign requirements to current `web/` implementation files.
3. Reclassified raw scrape dumps as archives and kept curated extracts in active docs.
4. Documented major parity gap: no React Flow/infinite-canvas implementation yet in current `web/src`.

## 5) Guardrail

If new capture data arrives, append deltas here and update the canonical spec. Do not create another overlapping summary spec.

---

## Section 2: 2026-02-17-universal-frontend-spec-v1.md

# Universal Frontend Specification v1

Date: 2026-02-17
Status: Draft for lock-in
Owner: Platform Frontend

## 1. Purpose

Define one UI contract that all pages follow after validation, so design decisions are not re-litigated page by page.

## 2. Scope

This spec applies to:
1. App pages under `/app/*`
2. Track A and Track B pages
3. Admin and settings pages

This spec does not force marketing pages to use dense tooling layout, but tokens and component rules still apply.

## 3. Core Principles

1. Grid first for page shells. Use Flexbox inside regions, not for whole-shell geometry.
2. CSS-owned visual system. Do not depend on library theme defaults for final visual identity.
3. Token-driven design. No hard-coded random values in feature components.
4. Density by intent. Tooling surfaces are dense; public surfaces can be relaxed.
5. Reuse over invention. New pages compose existing shell primitives before creating new ones.

## 4. Shell Contracts

### 4.1 Tooling Shell (default for `/app/*`)

Required zones:
1. Header (fixed height)
2. Left app rail (fixed)
3. Explorer/secondary nav (resizable)
4. Main work area (fluid)
5. Optional right assistant/context pane (resizable/collapsible)
6. Footer/status strip (optional by page type)

Recommended baseline:
1. Header: 50-56px
2. Rail: 50px
3. Explorer default: 280px
4. Assistant default: 320-360px

### 4.2 Public Shell

For non-tooling pages, keep top nav + content container, but use the same token system and component states.

## 5. Typography Contract

1. Base font family: Inter, system fallback stack.
2. Tooling surfaces default body size: 12px.
3. Section headers: 14px.
4. Page titles: 18-24px depending on hierarchy.
5. Code/data views use monospace stack only where functionally needed.

Rule: Do not set global `html { font-size: 12px; }` for entire app. Scope dense typography to tooling namespace (for example `.ui-density-compact`).

## 6. Token System

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

## 7. Grid and Pane Behavior

1. Panes must resize independently.
2. Collapse state and widths persist in local storage.
3. Each pane owns its own scroll behavior.
4. `min-width: 0` and `min-height: 0` must be set on grid children to prevent overflow bugs.

## 8. Component Standards

Required primitives for consistency:
1. Page header
2. Left rail nav section
3. Panel container with title bar
4. Dense table/list row pattern
5. Primary/secondary/icon button variants
6. Empty state pattern
7. Error state pattern

## 9. State Model

Every interactive component must define:
1. Default
2. Hover
3. Active
4. Focus-visible
5. Disabled
6. Error (where applicable)

## 10. Accessibility Baseline

1. Keyboard navigable controls only.
2. `aria-label` required for icon-only actions.
3. Visible focus ring required for keyboard focus.
4. Minimum contrast target: WCAG AA.
5. Respect reduced motion preference.

## 11. Page Acceptance Checklist

A page is compliant only if all are true:
1. Uses approved shell contract.
2. Uses tokenized CSS values.
3. Uses approved typography scale.
4. Defines all interaction states.
5. Meets accessibility baseline.
6. No ad hoc one-off layout hacks.

## 12. Adoption Strategy

1. Phase 1: Validate on Track-B V2 workbench.
2. Phase 2: Apply to high-traffic app pages (`Projects`, `ProjectDetail`, `Upload`, `RunDetail`).
3. Phase 3: Apply to remaining app surfaces.
4. Phase 4: Publish as locked standard and require checklist in PRs.

## 13. Governance

1. Spec updates require a version bump (`v1`, `v1.1`, `v2`).
2. Changes must include migration notes.
3. Do not silently modify foundational tokens or shell geometry rules.

## 14. Immediate Next Step

Run a single validation sprint on one page type (Track-B V2 layout) and assess:
1. Visual balance and proportionality
2. Build speed improvement
3. Reusability to other pages

If accepted, this document becomes mandatory baseline for all new page work.

## 15. Technology Boundary (Locked)

Use each tool only for the layer it is best at.

### 15.1 Custom CSS Grid (required)

Use custom CSS Grid for:
1. App shell geometry
2. Quad-pane layout
3. Pane splitters and resizers

Constraint:
- Do not use Mantine `AppShell` for this workbench shell because it is too opinionated for the required quad-pane behavior.

### 15.2 React Flow (required)

Use React Flow only for:
1. Infinite canvas viewport behavior
2. Node rendering host
3. Edge/connection behavior
4. Minimap and canvas interaction primitives

Constraint:
- Keep visual identity in project CSS. Do not rely on React Flow default visual styling as final UI.

### 15.3 Mantine (required inside panes)

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

## 16. Mantine Token Bridge (Mandatory)

Mantine must be treated as a token consumer, not a separate design system.

### 16.1 Policy

1. Redesign tokens are the source of truth.
2. Mantine theme values must be derived from redesign tokens.
3. If a Mantine component conflicts with tokenized shell visuals, override with scoped CSS in the page namespace.

### 16.2 Required mapping

Map redesign tokens into Mantine theme slots for:
1. Colors (surface, text, border, brand)
2. Radius scale
3. Spacing scale
4. Typography sizes/weights
5. Focus ring and default border behavior

### 16.3 Component behavior target

Mantine controls inside panels must visually read as native to the custom shell.

Must align for:
1. Input backgrounds and borders
2. Button heights/radius/contrast
3. Select/dropdown panel styling
4. Tooltip and modal surfaces
5. Hover/active/focus-visible states

### 16.4 Implementation rule

1. Keep shell geometry in custom CSS Grid.
2. Keep canvas behavior in React Flow.
3. Keep panel controls in Mantine, but always through token-bridged theme + scoped overrides.

### 16.5 Version note

Current repo dependency is Mantine `8.3.14` (`web/package.json`).
This policy still stands if later moving to Mantine v7: the bridge contract is version-agnostic.

---

## Section 3: design-considerations.md

# Frontend Redesign Design Considerations

Date: 2026-02-17  
Status: Active working document

## 1) Canonical doc set

Use this ordering only:
1. `docs/frontend/reference_elements_spec.md` (canonical visual + interaction spec)
2. `docs/frontend/design-considerations.md` (this file: implementation decisions and tradeoffs)
3. `docs/frontend/2026-02-17-postman-flow-reactflow-redesign-reference.md` (index + delta pointer)
4. `docs/frontend/styles.md` and `docs/frontend/head-inline-styles.md` (curated extracts)
5. `docs/frontend/archive/*.md` (raw scrape archives)

## 2) Current repo mapping (web)

| Redesign area | Current repo implementation | Status |
|---|---|---|
| App shell (header + left rail + content) | `web/src/components/layout/AppLayout.tsx`, `web/src/components/shell/TopCommandBar.tsx`, `web/src/components/shell/LeftRail.tsx` | Partial |
| Route topology for track-b workbench | `web/src/router.tsx` (`/app/projects/:projectId/track-b/transform`, `/extract`) | Present |
| Track-B 3-pane workbench layout | `web/src/pages/TrackBWorkbench.tsx` (CSS grid with files/preview/result, resizable result pane) | Present |
| PDF preview + overlay boxes | `web/src/pages/TrackBWorkbench.tsx` + `react-pdf` | Present |
| Result panel modes (formatted vs JSON) | `web/src/pages/TrackBWorkbench.tsx`, `web/src/components/common/JsonViewer.tsx` | Present |
| Postman/Figma-style infinite canvas nodes/edges | No React Flow usage in `web/src` | Missing |
| React Flow dependency | `web/package.json` has no `reactflow` / `@xyflow/react` | Missing |
| Bulk uploader library path | `web/src/pages/UppyLibraryDemo.tsx` + Uppy deps in `web/package.json` | Present |

## 3) Key architecture decisions

1. Keep current app shell as system shell (`AppLayout` + left rail + top command bar).
2. Implement Postman-style flow surface as a dedicated page/component subtree, not as global shell replacement.
3. Use CSS-first styling with project-owned class namespace (`.pm-*`), not vendor classes.
4. Keep React Flow as interaction engine only (viewport, nodes, edges, minimap); all visual identity in project CSS.
5. Preserve current Track-B parse preview/result behavior as functional baseline while introducing canvas mode incrementally.

## 4) Known gaps to close before visual parity

1. No canvas interaction layer yet (pan/zoom node graph) in current implementation.
2. No minimap/viewport controls matching Postman flow toolbar.
3. No custom node renderer matching Postman block anatomy.
4. No right context action rail mapped to a dedicated panel system.
5. Token parity is incomplete (spacing ramps, color ramps, motion, z-index).

## 5) Implementation sequence (low-risk)

1. Add dedicated flow workbench route with isolated component boundary.
2. Introduce React Flow with static seed nodes and pane shell parity.
3. Recreate header/toolbar/context rail anatomy from canonical spec.
4. Bridge existing Track-B data (documents/runs/results) into canvas blocks.
5. Calibrate tokens and interaction states, then remove legacy visual drift.

## 6) Non-goals for this phase

1. Do not copy Postman proprietary DOM/class structure.
2. Do not replace existing global app shell.
3. Do not add backend/schema changes in this frontend visual alignment phase.

---

## Section 4: head-inline-styles.md

# Head + Inline Styles Extract (Curated)

Date: 2026-02-17  
Source: Postman `<head>` capture

Raw archive:
- `docs/frontend/archive/2026-02-17-postman-head-inline-styles-raw.md`

## 1) Actionable items retained

### 1.1 Font preload + `@font-face`

```html
<link rel="preload" as="font" href="/_ar-assets/js/fonts/Inter-Regular-e764338977f38b2c.woff2" type="font/woff2" crossorigin>
```

```css
@font-face {
  font-family: Inter;
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url(/_ar-assets/js/fonts/Inter-Regular-e764338977f38b2c.woff2) format("woff2");
}
```

### 1.2 Loader/app-shell baseline patterns

```css
body {
  margin: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.app-root {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
```

### 1.3 React Flow baseline CSS signals captured from source

- `react-flow__viewport` uses transform-based pan/zoom.
- Layering model: edges, nodes, selection, controls, minimap.
- Minimap and controls are absolutely positioned panel overlays.

These are behavior-layer references only. Visual styling must remain project-owned.

## 2) Non-actionable/noise removed from active docs

1. New Relic scripts and minified JS payloads.
2. Route-prefetch boot scripts.
3. Hashed CSS/JS bundle links.
4. Theme bootstrap script internals tied to Postman runtime.
5. Third-party style payloads not relevant to our component system.

## 3) Usage rule

Use this file for extraction-level reference only.
For implementation requirements, use:
- `docs/frontend/reference_elements_spec.md`
- `docs/frontend/design-considerations.md`

---

## Section 5: reference_elements_spec.md

# Reference Elements Spec: Postman-Style Flow Workbench (Exhaustive Baseline)

Date: 2026-02-17
Status: Locked reference artifact for redesign
Owner: frontend redesign stream

## 0) Why this file exists

This file is the "do-not-lose" reference spec for the Postman-like Flow workbench redesign.
It is intentionally exhaustive and captures:
1. Shell structure
2. Control inventory
3. Pane geometry and state behavior
4. Canvas behavior cues
5. Token and typography baselines
6. CSS rendering/scrollbar patterns
7. Data attributes and semantics used as behavior anchors

Use this together with:
- `docs/frontend/2026-02-17-postman-flow-reactflow-redesign-reference.md`

## 1) Non-negotiable design directives (captured)

1. Infinite canvas design
2. Think Figma
3. Integrate React Flow
4. CSS-first implementation

## 2) Shell architecture contract

Top shell is a horizontal pane group with three logical panes:
1. Left sidebar pane
2. Main builder/canvas pane
3. Right context bar pane

Observed states from capture:
- Left collapsed width: `80px`
- Right context pane collapsed width: `0px`
- Session sample height: `873px`
- Session sample main width region around `943px` inside current viewport

Implementation contract:
- Keep pane layout independent from canvas layout
- Pane state (`collapsed/expanded`) must be externalized as app state
- No brittle reliance on vendor generated classes

## 3) Left sidebar reference map

### 3.1 Collapsed header nav (tablist)

Observed tabs and semantics:
1. Collections
2. Environments
3. History
4. Flows (active in provided capture)
5. Configure sidebar / more apps action

Expected behavior:
- `role="tablist"` for navigation
- active tab state visual + ARIA alignment
- collapsed rail preserves icon legibility at 80px width

### 3.2 Expanded sidebar controls

Observed controls in flow context:
1. Workspace title/link
2. `New` button
3. `Import` button
4. Search input (`Search flows`)
5. Sort button
6. Flows home button
7. Resource panel with links:
   - View Flows docs
   - Share feedback
8. Legacy Applications collapsible section

Implementation note:
- Keep this as a dedicated left-panel component tree separate from canvas component tree

## 4) Main pane reference map

### 4.1 Top tab strip

Observed:
1. Requester tabs bar
2. Active tab title `New flow`
3. New tab (+) control
4. Tab search trigger
5. Environment selector (`No environment` in sample)

### 4.2 Entity/workbench header

Observed header elements:
1. Breadcrumb/title area (`New flow`)
2. Copy link action
3. Clone action
4. Share action
5. Deploy primary action
6. Optional subtitle region

### 4.3 Workbench content split

Observed main workbench content:
1. Optional form panel container (left side of studio area)
2. Primary flow studio drop/canvas area

## 5) Canvas + React Flow behavior reference

### 5.1 React Flow core primitives observed

1. Renderer container
2. Viewport transform state (`translate + scale`)
3. Edges SVG layer
4. Nodes layer
5. Pane interaction layer
6. Background layer
7. Minimap panel

### 5.2 Canvas visual behavior cues

1. Dotted background grid
2. Minimap at bottom-left
3. Bottom toolbar floating over canvas
4. Attribution appears by default (unless Pro licensing/override policy)

### 5.3 Bottom toolbar inventory

Observed control groups:
1. Undo
2. Redo
3. Zoom out
4. Zoom in
5. Fit view
6. Run split button + scenario toggle
7. Run logs
8. Add block
9. Add annotation

### 5.4 Right context toolbar inventory

Observed icon rail actions:
1. Flow settings
2. Snapshots
3. Scenarios
4. Requests
5. Slides

Contract:
- Keep context rail independent from core canvas to allow toggled/role-based panels later

## 6) Node anatomy reference (Start node sample)

Observed block composition:
1. Header area with icon + title (`Start`)
2. Trigger change dropdown/button
3. Output port handle (`data`)
4. Suggestion chips/actions near output:
   - Describe
   - Add blocks
   - Browse templates
5. Inputs section with `Add input`
6. Footer region
7. Execution/state ring decoration

Implementation contract:
- Recreate node via custom React Flow node type
- Keep node layout CSS-driven and tokenized

## 7) Geometry and rendering reference values (captured)

Captured computed style sample (main flex region):
- `color: rgb(166, 166, 166)`
- `display: flex`
- `flex-basis: 0%`
- `flex-direction: row`
- `flex-grow: 1`
- `flex-shrink: 1`
- `font-feature-settings: "calt" 0`
- `font-size: 12px`
- `height: 873px`
- `width: 1023px`
- `min-height: 0`
- `min-width: 0`
- `text-rendering: optimizeLegibility`
- `text-size-adjust: 100%`
- `unicode-bidi: isolate`
- `-webkit-font-smoothing: antialiased`

## 8) Typography token baseline (captured)

```css
:root {
  --text-font-regular: "Inter", "OpenSans", Helvetica, Arial, sans-serif;
  --text-font-code: "IBMPlexMono", "Cousine", monospace;

  --text-font-size-xs: 10px;
  --text-font-size-s: 11px;
  --text-font-size-m: 12px;
  --text-font-size-l: 14px;
  --text-font-size-xl: 16px;
  --text-font-size-xxl: 18px;
  --text-font-size-xxxl: 24px;

  --text-line-height-xs: 12px;
  --text-line-height-s: 16px;
  --text-line-height-m: 20px;
  --text-line-height-l: 24px;
  --text-line-height-xl: 28px;
  --text-line-height-xxl: 32px;
  --text-line-height-xxxl: 40px;

  --text-font-weight-regular: 400;
  --text-font-weight-medium: 600;
  --text-font-weight-bold: 600;
}
```

Editor bounds captured:
```css
--min-editor-height: calc(10 * var(--size-m));
--max-editor-height: calc(100vh - 350px);
```

## 9) Global text rendering baseline (captured)

```css
html {
  text-rendering: optimizeLegibility;
  -moz-text-size-adjust: 100%;
  text-size-adjust: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Noto Sans", Ubuntu, Cantarell, "Helvetica Neue", Oxygen, "Fira Sans",
    "Droid Sans", Helvetica, Arial, sans-serif;
}
```

Fallback declaration seen in source stream:
```css
html {
  -webkit-text-size-adjust: 100%;
  -ms-text-size-adjust: 100%;
  font-family: sans-serif;
}
```

## 10) Scrollbar style baseline (captured)

```css
::-webkit-scrollbar {
  width: 12px;
  height: 12px;
  overflow: visible;
}

::-webkit-scrollbar-button {
  width: 0;
  height: 0;
}

::-webkit-scrollbar-corner {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar-thumb-background-color);
  background-clip: padding-box;
  border: 3px solid transparent;
  border-radius: 100px;
}

::-webkit-scrollbar-track {
  background-clip: padding-box;
  border: 3px solid transparent;
  border-radius: 100px;
}
```

## 11) Font and custom property references

```css
@font-face {
  font-family: Inter;
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url(/_ar-assets/js/fonts/Inter-Regular-e764338977f38b2c.woff2) format("woff2");
}
```

Captured custom-property intent:
```css
@property --aiChatNotificationAngle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}
```

## 12) Accessibility and semantics anchors

Observed semantic cues worth preserving:
1. `role="tablist"` and `role="tab"` for sidebar navigation
2. `aria-selected` and `aria-controls` in tab systems
3. `aria-label` coverage for control buttons/icons
4. `role="combobox"` for environment selector

Contract:
- Preserve semantic roles and ARIA parity while restyling

## 13) State and variant model to implement

Minimum state matrix for reliable parity:
1. Left pane: collapsed/expanded
2. Right pane: hidden/shown
3. Sidebar tab: idle/hover/active
4. Tab strip: idle/hover/active/pinned (if enabled)
5. Canvas node: idle/selected/dragging/disabled/error/warning
6. Port: idle/hover/connectable/connected/disabled
7. Toolbar buttons: default/hover/active/disabled

## 14) CSS-first implementation guardrails

1. Use project-owned class names only (e.g., `.pm-shell`, `.pm-pane-left`, `.pm-canvas-toolbar`).
2. No vendor hashed class dependence.
3. Keep a token layer for all colors/spacing/radius/typography.
4. Keep layout CSS deterministic and responsive (`height:100%`, `min-height:0`, `min-width:0` rules).
5. Keep React Flow usage to behavior primitives; style through our CSS namespace.

## 15) Replication order

1. Pane shell and geometry
2. Header and tab systems
3. Canvas + minimap + grid
4. Node anatomy and ports
5. Toolbars and context rail
6. Typography and final color calibration

## 16) Known omissions from capture (explicit)

These are not fully captured yet and should be collected later if perfect visual parity is required:
1. Full color token set (`--grey-*`, `--purple-*`, `--blue-*`, `--green-*` complete ramps)
2. Exact spacing scale names and values (`--spacing-*` full map)
3. Full motion/easing token map
4. Complete z-index layering map

## 17) Companion files

1. `docs/frontend/2026-02-17-postman-flow-reactflow-redesign-reference.md` (index + delta log)
2. `docs/frontend/reference_elements_spec.md` (this exhaustive element spec)

## 18) Freeze notice

Treat this document as a frozen input artifact for redesign kickoff.  
When new inspect captures arrive, append deltas; do not silently rewrite prior baselines.

## 19) Current Repo Traceability Map (web/)

This section maps the redesign reference to concrete current implementation points.

### 19.1 Shell and navigation

1. App shell container:
   - `web/src/components/layout/AppLayout.tsx`
2. Top bar controls:
   - `web/src/components/shell/TopCommandBar.tsx`
3. Left rail grouping and active-state logic:
   - `web/src/components/shell/LeftRail.tsx`
   - `web/src/components/shell/nav-config.ts`
4. Route topology (including Track-B workbench routes):
   - `web/src/router.tsx`

### 19.2 Track-B workbench (current closest surface)

1. Three-column workspace layout (Files / Preview / Result):
   - `web/src/pages/TrackBWorkbench.tsx`
2. Resizable result pane model:
   - `web/src/pages/TrackBWorkbench.tsx`
3. PDF preview + overlay boxes:
   - `web/src/pages/TrackBWorkbench.tsx`
   - `react-pdf` integration in same file
4. Result mode toggle (Formatted / JSON):
   - `web/src/pages/TrackBWorkbench.tsx`
   - `web/src/components/common/JsonViewer.tsx`

### 19.3 Upload pipeline UI baseline

1. Multi-file uploader implementation and Uppy usage:
   - `web/src/pages/UppyLibraryDemo.tsx`
2. Current Uppy package surface:
   - `web/package.json`

### 19.4 Styling baseline in current app

1. Global shell and component style layer:
   - `web/src/theme.css`

## 20) Gap Matrix: Postman-Style Target vs Current Repo

| Requirement | Current status | Evidence |
|---|---|---|
| Infinite canvas with node graph interactions | Missing | No React Flow component usage in `web/src`; no `reactflow` / `@xyflow/react` dependency in `web/package.json` |
| Postman-style minimap + canvas toolbars | Missing | No canvas component with minimap/flow controls implemented |
| Postman-style block/node anatomy on graph canvas | Missing | Current block/result representations are table/JSON and preview overlays, not graph nodes |
| Three-pane parse workspace behavior | Present (different visual language) | `web/src/pages/TrackBWorkbench.tsx` |
| PDF page preview + bounding overlays | Present | `web/src/pages/TrackBWorkbench.tsx` |
| Files -> parse result UX path | Present | `web/src/pages/TrackBWorkbench.tsx`, `web/src/pages/UppyLibraryDemo.tsx` |

## 21) Document role clarification

1. `reference_elements_spec.md` is the canonical exhaustive redesign reference.
2. `2026-02-17-postman-flow-reactflow-redesign-reference.md` is index/delta only.
3. `styles.md` and `head-inline-styles.md` are curated extracts.
4. `docs/frontend/archive/*.md` holds raw scrape archives and should not drive implementation decisions directly.

---

## Section 6: styles.md

# Styles Extract (Curated)

Date: 2026-02-17  
Source: Postman inspect capture

Raw archive:
- `docs/frontend/archive/2026-02-17-postman-styles-raw.md`

## 1) Actionable typography tokens

```css
:root {
  --text-font-regular: "Inter", "OpenSans", Helvetica, Arial, sans-serif;
  --text-font-code: "IBMPlexMono", "Cousine", monospace;

  --text-font-size-xs: 10px;
  --text-font-size-s: 11px;
  --text-font-size-m: 12px;
  --text-font-size-l: 14px;
  --text-font-size-xl: 16px;
  --text-font-size-xxl: 18px;
  --text-font-size-xxxl: 24px;

  --text-line-height-xs: 12px;
  --text-line-height-s: 16px;
  --text-line-height-m: 20px;
  --text-line-height-l: 24px;
  --text-line-height-xl: 28px;
  --text-line-height-xxl: 32px;
  --text-line-height-xxxl: 40px;

  --text-font-weight-regular: 400;
  --text-font-weight-medium: 600;
  --text-font-weight-bold: 600;
}
```

## 2) Editor height constraints

```css
:root {
  --min-editor-height: calc(10 * var(--size-m));
  --max-editor-height: calc(100vh - 350px);
}
```

## 3) HTML rendering baseline

```css
html {
  text-rendering: optimizeLegibility;
  -moz-text-size-adjust: 100%;
  text-size-adjust: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Noto Sans", Ubuntu, Cantarell, "Helvetica Neue", Oxygen, "Fira Sans",
    "Droid Sans", Helvetica, Arial, sans-serif;
}
```

## 4) Scrollbar baseline

```css
::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

::-webkit-scrollbar-button {
  width: 0;
  height: 0;
}

::-webkit-scrollbar-corner {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar-thumb-background-color);
  background-clip: padding-box;
  border: 3px solid transparent;
  border-radius: 100px;
}

::-webkit-scrollbar-track {
  background-clip: padding-box;
  border: 3px solid transparent;
  border-radius: 100px;
}
```

## 5) What was excluded on purpose

1. Duplicate declarations repeated in inspect output.
2. Browser UA stylesheet noise.
3. Truncated token sets (`Show all properties`) that are incomplete by construction.
4. Hashed asset paths that are not stable implementation inputs.

