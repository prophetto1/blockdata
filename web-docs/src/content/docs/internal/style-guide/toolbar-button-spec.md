---
title: toolbar-button-spec
description: Standard toolbar button contract — one shape, three content modes, used across the platform.
---

## Principle

One button shell. Three content modes. The outer box is always the same size and shape. Only the content inside changes — and the content must be **immediately understandable** to the user.

---

## The Button Shell (contract)

Every toolbar button shares these properties regardless of content.

### Dimensions

| Property | Value |
|----------|-------|
| Height | 36px |
| Min width | 36px (ensures icon-only buttons are square) |
| Padding | 0 10px |
| Border | 1px solid `var(--border)` |
| Border radius | 6px |
| Background | `var(--background)` |

### Typography

| Property | Value |
|----------|-------|
| Font family | `var(--app-font-sans)` (inherited) |
| Font size | 13px |
| Font weight | 600 |

### Icon (when present)

| Property | Value |
|----------|-------|
| Size | 15px |
| Color | inherits from button text color |

### Inner gap

| Property | Value |
|----------|-------|
| Gap (between icon and label) | 6px |

### Layout

```
display: inline-flex;
align-items: center;
justify-content: center;
```

### Transition

```
transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease;
```

---

## Content Modes

The shell supports three content modes. Choose whichever communicates most clearly.

### Icon + Text

Use when the action benefits from both a visual hint and a label.

```
[ icon  Label ]
```

### Text Only

Use when the label alone is unambiguous.

```
[  Label  ]
```

### Icon Only

Use **only** when the icon is universally understood without a label. When in doubt, add text.

```
[ icon ]
```

The button becomes a square (36x36). Padding collapses to 0.

---

## The Rule

> If someone has to guess what the button does, it needs a label.

Icon-only is a privilege earned by universal recognition — not a shortcut for saving space.

---

## States

| State | Background | Border | Text color |
|-------|-----------|--------|------------|
| Default | `var(--background)` | `var(--border)` | `var(--muted-foreground)` |
| Hover | `color-mix(in oklab, var(--accent) 55%, transparent)` | `var(--border)` | `var(--foreground)` |
| Active / Open | `var(--background)` | `var(--border)` | `var(--foreground)` |
| Active indicator | `box-shadow: inset 0 -2px 0 var(--primary)` | | |
| Disabled | `var(--background)` | `var(--border)` | `var(--muted-foreground)` at 0.4 opacity |

---

## Toolbar Layout

Buttons sit inside a toolbar row:

| Property | Value |
|----------|-------|
| Gap between buttons | 6px |
| Toolbar padding | 8px |
| Toolbar background | `var(--card)` |
| Toolbar border | 1px solid `var(--border)` |
| Toolbar border radius | 8px |
| Flex wrap | yes |

---

## Current ad-hoc patterns (pre-contract audit)

Everything below documents what exists today. None of it follows the contract above. This is the inventory of what must be migrated.

---

### 1. Flow Edit — Panel Toggle Buttons (left side)

**Source:** `web/src/components/flows/FlowWorkbench.css` lines 36-65, `FlowWorkbench.tsx` lines 126-134, 1862-1878

| Property | Value |
|----------|-------|
| Height | 28px |
| Font size | 12px |
| Font weight | 600 |
| Icon size | 13px |
| Gap | 6px |
| Padding | 0 8px |
| Border | 1px solid transparent |
| Border radius | 6px |
| Content | icon + text (always) |

**Buttons:** Flow Code, No-code, Topology, Documentation, Assets, Preview, Blueprints

**States:**
- Default: transparent bg, transparent border, muted text
- Hover: `var(--background)` bg, foreground text
- Open: `var(--background)` bg, `var(--border)` border, foreground text
- Focused: `box-shadow: inset 0 -1px 0 var(--primary)`

---

### 2. Flow Edit — Validate Button (right side)

**Source:** `FlowWorkbench.css` lines 117-136, `FlowWorkbench.tsx` lines 1896-1915

| Property | Value |
|----------|-------|
| Height | 32px |
| Width | 32px (square) |
| Font size | — |
| Icon size | 14px (`IconCheck`) |
| Padding | 0 |
| Border | 1px solid `var(--border)` |
| Border radius | 6px |
| Background | `var(--background)` |
| Content | icon only |

---

### 3. Flow Edit — Actions Menu Trigger (right side)

**Source:** `FlowWorkbench.css` lines 117-128, `FlowWorkbench.tsx` lines 1917-1929

| Property | Value |
|----------|-------|
| Height | 32px |
| Font size | 13px |
| Font weight | 600 |
| Padding | 0 10px |
| Border | 1px solid `var(--border)` |
| Border radius | 6px |
| Background | `var(--background)` |
| Content | text only ("Actions") |

---

### 4. Flow Edit — Copy Button (right side)

**Source:** `FlowWorkbench.css` lines 138-160, `FlowWorkbench.tsx` lines 1931-1938

| Property | Value |
|----------|-------|
| Height | 32px |
| Font size | 13px |
| Font weight | 600 |
| Icon size | 14px |
| Gap | 5px |
| Padding | 0 10px |
| Border | 1px solid `var(--border)` |
| Border radius | 6px |
| Content | icon + text |

**Extra states:**
- Hover: `color-mix(in oklab, var(--background) 80%, var(--foreground) 20%)`
- Copied: accent-colored border and text

---

### 5. Flow Edit — Save Button (right side)

**Source:** `FlowWorkbench.css` lines 117-128, 181-184, `FlowWorkbench.tsx` lines 1946-1953

| Property | Value |
|----------|-------|
| Height | 32px |
| Font size | 13px |
| Font weight | 600 |
| Padding | 0 10px |
| Border | 1px solid `var(--border)` |
| Border radius | 6px |
| Background | `var(--background)` |
| Content | text only ("Save" / "Saving...") |
| Disabled | muted text, 0.7 opacity |

---

### 6. Flow Edit — Pane Split/Menu Triggers (inside panes)

**Source:** `FlowWorkbench.css` lines 346-387

| Property | Value |
|----------|-------|
| Height | 24px |
| Width | 24px (square) |
| Border | 1px solid `var(--border)` |
| Border radius | 6px |
| Background | `var(--background)` |
| Content | icon only |
| Hover | `color-mix(in oklab, var(--accent) 55%, transparent)` |
| Disabled | 0.4 opacity |

---

### 7. Flow Edit — File Manager Sort Buttons

**Source:** `FlowWorkbench.css` lines 443-462

| Property | Value |
|----------|-------|
| Height | 24px |
| Font size | 11px |
| Font weight | 600 |
| Padding | 0 8px |
| Border | 0 (1px left between siblings) |
| Border radius | 0 (inside grouped container with 6px radius) |
| Background | transparent |
| Content | text only |
| Active | `var(--background)` bg, `box-shadow: inset 0 -1px 0 var(--primary)` |

---

### 8. Flow Edit — File Manager Action Buttons

**Source:** `FlowWorkbench.css` lines 488-513

| Property | Value |
|----------|-------|
| Height | 24px |
| Width | 24px (square) |
| Border | 0 |
| Border radius | 6px |
| Background | transparent |
| Content | icon only |
| Hover | `color-mix(in oklab, var(--accent) 50%, transparent)` |
| Disabled | 0.35 opacity |
| Danger variant | hover color `#ef4444` |

---

### 9. Flow Edit — Pane Tab Buttons

**Source:** `FlowWorkbench.css` lines 291-344

| Property | Value |
|----------|-------|
| Height | 33px (parent row height) |
| Font size | 12px |
| Font weight | 600 |
| Padding | 0 8px |
| Gap | 4px |
| Border | border-right 1px solid `var(--border)` |
| Border radius | 0 |
| Content | text, with close button (16x16, 3px radius) |
| Active | `var(--background)` bg, `box-shadow: inset 0 -1px 0 var(--primary)` |
| Hover | `color-mix(in oklab, var(--accent) 45%, transparent)` |

---

### 10. Flow Detail — Page Tab Bar

**Source:** `web/src/pages/FlowDetail.tsx` lines 278-326

| Property | Value |
|----------|-------|
| Height | 40px (`h-10 min-h-10`) |
| Font size | 12px (`text-xs`) |
| Font weight | 500 (`font-medium`) |
| Padding | `px-3` |
| Gap | `gap-1` |
| Border | `border-r border-border` (right separator) |
| Border radius | 0 |
| Content | text only (some with lock icon at 11px) |
| Selected | `bg-background text-foreground` |
| Hover | `bg-accent text-foreground` |
| Disabled | `cursor-not-allowed opacity-40` |

**Tabs:** Overview, Topology, Executions, Edit, Revisions, Triggers, Logs, Metrics, Dependencies, Concurrency, Audit Logs (locked)

---

### 11. Schema Editor — View Toggle Buttons

**Source:** `web/src/pages/Schemas.tsx` lines 631-660

| Property | Value |
|----------|-------|
| Height | 40px (`h-10`) |
| Font size | 12px (inline style) |
| Font weight | 500 (inline style) |
| Line height | 16px (inline style) |
| Icon size | 14px |
| Gap | 6px (`gap-1.5`) |
| Padding | `px-2` (8px) |
| Border | 1px solid (dynamic) |
| Border radius | 4px (`rounded`) |
| Content | icon + text |

**Buttons:** Visual, Split, Code

**States:**
- Active: `border-border bg-background text-foreground`
- Inactive: `border-transparent text-muted-foreground hover:bg-background hover:text-foreground`

---

### 12. Schema Editor — Action Buttons (Reset, Save)

**Source:** `web/src/pages/Schemas.tsx` lines 663-690

Uses shadcn `Button` component with overrides:

| Property | Value |
|----------|-------|
| Height | 40px (`h-10`) |
| Font size | 12px (`text-xs`) |
| Icon size | 14px |
| Gap | 6px (`gap-1.5`) |
| Padding | `px-2` |
| Content | icon + text |

**Buttons:** Reset (ghost variant), Save (default variant)

---

### 13. Schema Editor — Field Row Icon Buttons

**Source:** `web/src/pages/Schemas.tsx` lines 298-300, 372-397

| Property | Value |
|----------|-------|
| Height | 32px (`h-8`) |
| Width | 32px (`w-8`) |
| Border | 0 |
| Border radius | `rounded-full` (50%) |
| Icon size | 18px (Brackets, Asterisk, Trash) or 16px (small Trash) |
| Content | icon only |

**States:**
- Active: `bg-accent text-foreground`
- Inactive: `text-muted-foreground hover:text-foreground`

---

### 14. SchemaLayout — Pane Collapse Toggles

**Source:** `web/src/pages/SchemaLayout.tsx` lines 115-149

| Property | Value |
|----------|-------|
| Height | 24px |
| Width | 24px |
| Border radius | `rounded` (4px) |
| Icon size | `PANE_CHEVRON_ICON.size` (from legacy `iconTokens.ts`) |
| Content | icon only |
| States | `text-muted-foreground hover:text-foreground` |

---

### 15. SchemaLayout — Pagination Buttons

**Source:** `web/src/pages/SchemaLayout.tsx` lines 246-270

| Property | Value |
|----------|-------|
| Height | 24px (`h-6`) |
| Width | 24px (`w-6`) |
| Border radius | `rounded` (4px) |
| Font size | 12px (`text-xs`) |
| Icon size | 14px |
| Content | icon only (prev/next), text (page numbers) |
| Disabled | 0.4 opacity |

---

### 16. SchemaLayout — Tab Labels (Basic/Advanced, Preview/Metadata/Blocks)

**Source:** `web/src/pages/SchemaLayout.tsx` lines 40-58

| Property | Value |
|----------|-------|
| Height | content (no fixed height) |
| Font size | 14px (`text-sm`) |
| Font weight | 700 active / 600 inactive |
| Border | none |
| Border radius | none |
| Content | text only (bare `<span>`, not a `<button>`) |
| Active | `font-bold text-foreground` |
| Inactive | `font-semibold text-muted-foreground` |

Not actually buttons — these are styled `<span>` elements with `cursor: pointer`. Semantically incorrect.

---

## Summary of inconsistencies

| Property | Variants found |
|----------|---------------|
| Height | 24px, 28px, 32px, 33px, 40px, content-fit |
| Font size | 11px, 12px, 13px, 14px |
| Font weight | 500, 600, 700 |
| Icon size | 11px, 13px, 14px, 15px, 16px, 18px |
| Border radius | 0, 3px, 4px, 6px, 50% |
| Gap | 0, 4px, 5px, 6px |
| Padding | 0, 0 2px, 0 8px, 0 10px, 0 12px |
| Content pattern | icon-only, text-only, icon+text, bare spans |

16 distinct ad-hoc button patterns across 4 pages, with 6 different heights, 4 font sizes, 3 font weights, 6 icon sizes, and 5 border radii.

---

## Component Typography Inventory

Everything below catalogues the current font size, weight, and line-height for key components beyond buttons. Use as the baseline for font standardization.

---

### Button component (`components/ui/button.tsx`)

All variants share the same typographic base.

| Property | Value | Tailwind class |
|----------|-------|----------------|
| Font size | 14px | `text-sm` |
| Font weight | 500 | `font-medium` |
| Line height | default | — |

#### Size variants

| Variant | Height | Padding | Typography override |
|---------|--------|---------|---------------------|
| default | `h-10` (40px) | `px-4 py-2` | none |
| sm | `h-9` (36px) | `px-3` | none |
| lg | `h-11` (44px) | `px-8` | none |
| icon | `h-10 w-10` | — | no text |

#### Style variants

All use `text-sm font-medium`. Color varies:

| Variant | Text color |
|---------|------------|
| default | `text-primary-foreground` |
| destructive | `text-destructive-foreground` |
| outline | inherits, `hover:text-accent-foreground` |
| secondary | `text-secondary-foreground` |
| ghost | inherits, `hover:text-accent-foreground` |
| link | `text-primary` |

---

### Toolbar button (`components/ui/toolbar-button.tsx`)

| Property | Value | Source |
|----------|-------|--------|
| Font size | 12px | `text-xs` |
| Font weight | 500 | `font-medium` |
| Line height | 16px | `leading-4` |
| Height | 28px | `h-7` |
| Padding | `px-2` | — |
| Gap (icon-label) | 6px | `gap-1.5` |

| State | Border | Background | Text color |
|-------|--------|------------|------------|
| active | `border-border` | `bg-background` | `text-foreground` |
| inactive | `border-transparent` | transparent | `text-muted-foreground` |

---

### Search bar (`components/shell/TopCommandBar.css`)

All values are hardcoded CSS, not Tailwind classes.

| Element | Font size | Line height | Height | Padding |
|---------|-----------|-------------|--------|---------|
| Search input | 13px (`0.8125rem`) | 1 | 30px | `0 10px` |
| Search result item | 13px | 1.2 | — | `6px 8px` |
| Empty message | 12px (`0.75rem`) | — | — | — |
| View tabs | 12px | 1 | min 24px | `0 10px` |

View tab weight: `500` default, `600` when active.

---

### ELT panels — shared hierarchy

All three ELT panels (`ParseEasyPanel`, `DltPullPanel`, `DltLoadPanel`) follow the same pattern:

| Element | Size | Weight | Color | Class string |
|---------|------|--------|-------|--------------|
| Panel header | 14px | 600 | foreground | `text-sm font-semibold` |
| Section heading | 14px | 700 | foreground | `text-sm font-bold` |
| Category label | 12px | 600 | foreground | `text-xs font-semibold` |
| Field label | 12px | 500 | foreground | `text-xs font-medium` |
| Description / hint | 12px | 400 | muted-foreground | `text-xs` |
| Button text | 12px | 500 | foreground | `text-xs font-medium` |
| Mono / technical | 12px | 400 | default | `text-xs font-mono` |

#### ParseEasyPanel specifics

| Element | Size | Weight | Notes |
|---------|------|--------|-------|
| Status badge (queued) | **11px** | 500 | `text-[11px] font-medium` — emerald border/bg |
| Status badge (error) | **11px** | 500 | `text-[11px] font-medium` — red border/bg |
| ConfigSwitch label | 12px | 400 | `text-xs leading-4` |
| Run button | 12px | 500 | `h-8 w-[78px] text-xs font-medium` |
| Mode toggle (Standard/Advanced) | 12px | 500 | `h-8 w-24 text-xs font-medium` |
| Tier card | 12px | 400 | `text-xs` with `px-3 py-2` |

#### DltPullPanel / DltLoadPanel specifics

| Element | Size | Weight | Notes |
|---------|------|--------|-------|
| Run button | 12px | 500 | `h-8 text-xs font-medium`, disabled `opacity-70` |
| Section icon label | 12px | 600 | `text-xs font-semibold` with `gap-2` icon |

---

### Flows — tab bar (`pages/FlowDetail.tsx`)

Tabs: Overview, Topology, Executions, **Edit**, Revisions, Triggers, Logs, Metrics, Dependencies, Concurrency, Audit Logs.

| Property | Value | Class |
|----------|-------|-------|
| Font size | 12px | `text-xs` |
| Font weight | 500 | `font-medium` |
| Line height | 1 | `leading-none` |
| Inactive color | muted | `text-muted-foreground` |
| Active color | foreground | `data-selected:text-foreground` |
| Active background | card | `data-selected:bg-background` |
| Hover | accent bg | `hover:bg-accent hover:text-foreground` |
| Disabled | 40% opacity | `disabled:opacity-40 disabled:cursor-not-allowed` |

---

### Flows — Edit tab toolbar (`FlowWorkbench.tsx` + `.css`)

| Element | Font size | Font weight | Source |
|---------|-----------|-------------|--------|
| Panel buttons (Flow Code, No-code, etc.) | **12px** | 600 | CSS `.flow-workbench-panel-button` |
| Switch label ("Playground") | **13px** | 600 | CSS `.flow-workbench-switch-label` |
| Validate button | **13px** | 600 | CSS `.flow-workbench-validate-button` |
| Actions trigger | **13px** | 600 | CSS `.flow-workbench-actions-trigger` |
| Save button | **13px** | 600 | CSS `.flow-workbench-save-button` |
| Action notice | **12px** | — | CSS `.flow-workbench-action-notice` |

#### Editor pane tabs

| Property | Value |
|----------|-------|
| Font size | 12px |
| Font weight | 600 |
| Line height | 1 |
| Inactive | `color: var(--muted-foreground)` |
| Active | `color: var(--foreground)`, underline via `box-shadow: inset 0 -1px 0 var(--primary)` |

#### File manager

| Element | Font size | Font weight |
|---------|-----------|-------------|
| Search input | 12px | — |
| Sort buttons | **11px** | 600 |
| File names | inherits | `text-foreground` |
| File info | inherits | `text-muted-foreground` |

#### Placeholder panels (Documentation, Blueprints, No-code)

| Element | Class |
|---------|-------|
| Title | `text-sm font-semibold text-foreground` |
| Description | `text-sm text-muted-foreground` |

---

### Flows — list page (`pages/FlowsList.tsx`)

| Element | Size | Weight | Color | Notes |
|---------|------|--------|-------|-------|
| Search input | 14px | — | foreground | `text-sm`, height `h-8` |
| Table header | 12px | 500 | muted-foreground | `text-xs font-medium` |
| Flow ID (primary) | 14px | 500 | foreground | `text-sm font-medium` |
| Flow ID (sub) | 12px | — | muted-foreground | `text-xs` |
| Mock badge | **10px** | — | amber | `text-[10px] uppercase tracking-wide` |
| Table cells | 12px | — | varies | `text-xs` |
| Action button | 12px | — | foreground | `text-xs`, `px-2 py-1` |
| Empty state | 14px | — | muted-foreground | `text-sm` |

---

### Settings cards (`pages/settings/setting-card-shared.tsx`)

| Element | Size | Weight | Color | Class string |
|---------|------|--------|-------|--------------|
| Card title | 14px | 500 | foreground | `text-sm font-medium` |
| Card description | 12px | 400 | muted-foreground | `text-xs text-muted-foreground` |
| Input fields | 14px | 400 | foreground | `text-sm` |
| Placeholder text | 14px | 400 | muted-foreground | `placeholder:text-muted-foreground` |
| Switch label | 14px | 400 | foreground | `text-sm text-foreground` |
| Textarea | 12px | 400 | foreground | `text-xs font-mono` |
| Save button | 12px | — | — | `text-xs` via `h-7 px-3` |

---

## Bracket-notation sizes in use

These escape the Tailwind scale and need decisions during standardization:

| Value | Where | Purpose |
|-------|-------|---------|
| `text-[10px]` | FlowsList mock badge | Tiny uppercase label |
| `text-[11px]` | ParseEasyPanel status badges, FlowWorkbench file sort buttons | Status indicators, sort controls |
| `text-[13px]` | TopCommandBar search, FlowWorkbench toolbar actions | Search input, toolbar action labels |
| `text-[15px]` | LeftRailShadcn nav items | Sidebar nav (non-compact mode) |

---

## Typography observations

1. **Two font-size systems coexist.** Tailwind classes (`text-xs`, `text-sm`) and raw CSS (`font-size: 12px`, `font-size: 13px`). FlowWorkbench uses CSS exclusively; ELT panels use Tailwind exclusively.

2. **Weight inconsistency.** "Bold" means `font-bold` (700) in ELT section headings but `font-weight: 600` in FlowWorkbench panel buttons. The semantic intent is the same — "this is a heading."

3. **13px is the odd size.** It sits between `text-xs` (12px) and `text-sm` (14px). Used for search inputs and toolbar action buttons. Dropping it would mean choosing 12px (tighter) or 14px (roomier).

4. **11px and 10px are micro sizes.** Used only for status badges and sort buttons. Could be mapped to a `2xs` token if kept, or bumped to 12px (`text-xs`) if the extra density isn't needed.

5. **Line-height is rarely explicit.** Most components rely on Tailwind defaults. Only the toolbar button (`leading-4`), FlowWorkbench tabs (`line-height: 1`), and search bar (`line-height: 1`) set it deliberately.
