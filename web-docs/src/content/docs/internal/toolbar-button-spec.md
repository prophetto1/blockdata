---
title: Toolbar Button Spec
description: Standard toolbar button contract — one shape, three content modes, used across the platform.
---

## Principle

One button shell. Three content modes. The outer box is always the same size and shape. Only the content inside changes — and the content must be **immediately understandable** to the user.

---

## The Button Shell

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

Examples: Copy, Save, Validate, Export

### Text Only

Use when the label alone is unambiguous.

```
[  Label  ]
```

Examples: panel toggles like "Flow Code", "Topology", "Preview"

### Icon Only

Use **only** when the icon is universally understood without a label. When in doubt, add text.

```
[ icon ]
```

The button becomes a square (36x36). Padding collapses to 0.

Examples: checkmark (validate), trash (delete), close (X)

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

## Migration from current state

The current Flow Edit workbench uses two inconsistent tiers. This contract replaces both.

### Before (current)

| Location | Height | Font | Icon | Content pattern |
|----------|--------|------|------|-----------------|
| Left panel toggles | 28px | 12px | 13px | icon + text (always) |
| Validate | 32px | — | 14px | icon only |
| Actions | 32px | 13px | — | text only |
| Copy | 32px | 13px | 14px | icon + text |
| Save | 32px | 13px | — | text only |

### After (this contract)

All buttons: 36px height, 13px font, 15px icon, 6px radius, same border/background/states. Content mode chosen per button based on clarity.

---

## Source (pre-migration)

- CSS: `web/src/components/flows/FlowWorkbench.css` (lines 36-185)
- JSX: `web/src/components/flows/FlowWorkbench.tsx` (lines 126-134, 1862-1953)
