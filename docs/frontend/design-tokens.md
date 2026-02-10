# BlockData Design Token Specification

**Date:** 2026-02-09
**Style:** shadcn (via MantineHub)
**Neutral:** Slate (Tailwind blue-tinted gray)
**Accent:** Indigo
**Stack:** Mantine v8 + `createTheme()` + CSS Variables
**Implementation:** `web/src/theme.ts`
**Source:** [MantineHub](https://mantinehub.com) — shadcn themes for Mantine

---

## How to Use This Document

This is the **authoritative design spec**. `theme.ts` implements it.

- To change the visual design: edit this document first, then update `theme.ts` to match.
- To add a new component: check here for the applicable tokens, then implement.
- Anyone working on the frontend reads this — no conversation context needed.

---

## 1. Color System

### 1.1 Neutral Palette: Slate

All surfaces, borders, and text derive from this single palette.

| Index | Hex | Tailwind Shade | Role |
|:--|:--|:--|:--|
| 0 | `#f8fafc` | 50 | Lightest surface (light mode body) / Dark mode primary text |
| 1 | `#f1f5f9` | 100 | Light hover surfaces |
| 2 | `#e2e8f0` | 200 | Light mode borders |
| 3 | `#cbd5e1` | 300 | Dark mode light text |
| 4 | `#94a3b8` | 400 | Placeholder text, dimmed text, anchors |
| 5 | `#475569` | 600 | — |
| 6 | `#334155` | 700 | Dark mode borders, secondary surface |
| 7 | `#1e293b` | 800 | Dark mode hover surfaces |
| 8 | `#0f172a` | 900 | Dark mode card/paper surfaces |
| 9 | `#020817` | 950 | Dark mode body background |

### 1.2 Accent: Indigo

Primary interactive color — buttons, active states, links, focus.

| Index | Hex | Usage |
|:--|:--|:--|
| 4 | `#818cf8` | Dark mode filled buttons (primaryShade.dark) |
| 5 | `#4f46e5` | Light mode filled buttons (primaryShade.light) |
| 6 | `#4338ca` | Hover states |

### 1.3 Semantic Colors

| Purpose | Color Key | Filled Index | Usage |
|:--|:--|:--|:--|
| Success | `green` | 5-6 | Complete badges, progress bars |
| Warning | `amber` | 5 | Claimed/in-progress badges |
| Error | `red` | 5 | Failed badges, error alerts |
| Info | `blue` | 5-6 | Info alerts, links |
| Schema | `violet` | 5-6 | Schema ref badges, schema cards |

### 1.4 Surface Layers

#### Dark mode (default)

| Layer | Variable | Resolves To | Hex |
|:--|:--|:--|:--|
| Body | `--mantine-color-body` | `secondary-9` | `#020817` |
| Default surface | `--mantine-color-default` | `secondary-9` | `#020817` |
| Card / Paper | `--mantine-color-secondary-filled` | `secondary-8` | `#0f172a` |
| Hover | `--mantine-color-default-hover` | `secondary-7` | `#1e293b` |
| Border | `--mantine-color-default-border` | `secondary-7` | `#1e293b` |

#### Light mode

| Layer | Variable | Resolves To | Hex |
|:--|:--|:--|:--|
| Body | `--mantine-color-body` | `white` | `#ffffff` |
| Default surface | `--mantine-color-default` | `secondary-0` | `#f8fafc` |
| Card / Paper | `--mantine-color-secondary-filled` | `white` | `#ffffff` |
| Hover | `--mantine-color-default-hover` | `secondary-1` | `#f1f5f9` |
| Border | `--mantine-color-default-border` | `secondary-2` | `#e2e8f0` |

### 1.5 Text Hierarchy

#### Dark mode

| Level | Variable | Resolves To | Hex |
|:--|:--|:--|:--|
| Primary | `--mantine-color-text` | `secondary-0` | `#f8fafc` |
| Default | `--mantine-color-default-color` | `secondary-1` | `#f1f5f9` |
| Dimmed | `--mantine-color-dimmed` | `secondary-4` | `#94a3b8` |
| Placeholder | `--mantine-color-placeholder` | `secondary-4` | `#94a3b8` |

#### Light mode

| Level | Variable | Resolves To | Hex |
|:--|:--|:--|:--|
| Primary | `--mantine-color-text` | `secondary-9` | `#020817` |
| Default | `--mantine-color-default-color` | `secondary-9` | `#020817` |
| Dimmed | `--mantine-color-dimmed` | `secondary-10` | `#64748B` |
| Placeholder | `--mantine-color-placeholder` | `secondary-10` | `#64748B` |

---

## 2. Typography

| Token | Value |
|:--|:--|
| `fontFamily` | `Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif` |
| `fontFamilyMonospace` | `JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace` |
| `headings.fontFamily` | Same as body |

### Font Sizes

| Token | px | Usage |
|:--|:--|:--|
| `xs` | 12 | Badges, captions, timestamps |
| `sm` | 14 | Body text, table cells, nav labels |
| `md` | 16 | Default inputs |
| `lg` | 18 | Larger body |
| `xl` | 20 | Section headers |

### Heading Sizes

| Level | Font Size | Line Height | Weight |
|:--|:--|:--|:--|
| h1 | 36px | 44px | 600 |
| h2 | 30px | 38px | 600 |
| h3 | 24px | 32px | 600 |
| h4 | 20px | 30px | 600 |

---

## 3. Spacing

| Token | px | Usage |
|:--|:--|:--|
| `xs` | 10 | Inline gaps, tight spacing |
| `sm` | 12 | Form field gaps, table cell padding |
| `md` | 16 | Default gap (Stack, Group) |
| `lg` | 20 | Card padding, section spacing |
| `xl` | 24 | Page section gaps |

---

## 4. Geometry

### Border Radius

| Token | px | Usage |
|:--|:--|:--|
| `xs` | 6 | Micro elements |
| `sm` | 8 | **Default** — buttons, cards, inputs, badges |
| `md` | 12 | Modals, larger containers |
| `lg` | 16 | Drawers |
| `xl` | 24 | Full-round elements |

`defaultRadius: 'sm'` (8px) — shadcn convention.

### Shadows

Subtle, not decorative. Cards use `withBorder` instead of shadows.

| Token | Value |
|:--|:--|
| `xs` | `0 1px 2px rgba(0,0,0,0.05)` |
| `sm` | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)` |
| `md` | `0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)` |
| `lg` | `0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)` |
| `xl` | `0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)` |

---

## 5. Component Defaults

These are set via `theme.components` in `theme.ts`. Do not override with inline styles.

| Component | Key Props | Notes |
|:--|:--|:--|
| **Card** | `padding="lg"`, `withBorder`, no shadow | Border-defined cards (shadcn style) |
| **Paper** | no shadow | Flat surfaces |
| **Button** | auto-contrast text color | Filled buttons get contrast text automatically |
| **Badge** | `variant="light"`, `size="sm"` | Translucent background by default |
| **NavLink** | `variant="light"` | Subtle hover highlight |
| **Select** | `checkIconPosition="right"` | shadcn convention |
| **Switch** | custom thumb/track colors | Uses `--mantine-color-default-border` |
| **Tooltip** | primary color bg | Inverted tooltip |

---

## 6. Behavioral Settings

| Setting | Value | Why |
|:--|:--|:--|
| `focusRing` | `'never'` | shadcn convention — no blue ring on focus |
| `cursorType` | `'pointer'` | Clickable elements show pointer cursor |
| `autoContrast` | `true` | Auto-picks text color for readability |
| `luminanceThreshold` | `0.3` | When to flip text from dark to light |
| `defaultColorScheme` | `'dark'` | Set in `App.tsx` MantineProvider |

---

## 7. Layout Constants

Set in component code, not in theme. Documented here for reference.

| Token | Value | Where |
|:--|:--|:--|
| Header height | 56px | `AppLayout.tsx` AppShell header |
| Sidebar width | 240px | `AppLayout.tsx` AppShell navbar |
| Content padding | `md` (16px) | `AppLayout.tsx` AppShell padding |
| Content max-width | fluid | No max-width constraint |

---

## 8. AG Grid Alignment

The Block Viewer uses AG Grid. To match the theme, set these CSS variables on the grid container:

| AG Grid Variable | Value | Source |
|:--|:--|:--|
| `--ag-font-family` | `Inter, sans-serif` | Match `fontFamily` |
| `--ag-font-size` | `13px` | Dense grid |
| `--ag-background-color` | `var(--mantine-color-body)` | Body background |
| `--ag-header-background-color` | `var(--mantine-color-secondary-filled)` | Card surface |
| `--ag-row-border-color` | `var(--mantine-color-default-border)` | Slate-7 in dark |
| `--ag-border-radius` | `8px` | Match `defaultRadius: 'sm'` |
| `--ag-row-height` | `36px` | Compact |
| `--ag-header-height` | `40px` | Slightly taller |

---

## 9. Reference

| Resource | URL |
|:--|:--|
| MantineHub (theme source) | [mantinehub.com](https://mantinehub.com) |
| MantineHub GitHub | [github.com/RubixCube-Innovations/mantine-theme-builder](https://github.com/RubixCube-Innovations/mantine-theme-builder) |
| Cloned reference | `ref-repos/mantine-theme-builder/` |
| Mantine theming docs | [mantine.dev/theming/theme-object](https://mantine.dev/theming/theme-object/) |
| shadcn/ui (original aesthetic) | [ui.shadcn.com](https://ui.shadcn.com) |

---

## 10. Changeset from Previous Theme

| What Changed | Before | After |
|:--|:--|:--|
| Neutral palette | Mantine default warm gray | Tailwind Slate (cool blue-black) |
| Dark body bg | `#1a1b1e` (warm) | `#020817` (cool near-black) |
| Dark card bg | `#25262b` (warm) | `#0f172a` (cool navy) |
| Dark borders | `#2c2e33` (warm) | `#1e293b` (cool blue-gray) |
| Border radius | 4px (`sm` old scale) | 8px (`sm` new scale, shadcn) |
| Shadows | None on cards | Still none — `withBorder` is the pattern |
| Component overrides | 12 basic defaultProps | 15 overrides with color-aware `vars()` functions |
| CSS variable resolver | 3 custom vars | Full shadcn resolver (surfaces, text, filled, light, outline, contrast) |
| Focus ring | default (visible) | `'never'` (shadcn) |
| Cursor | default | `'pointer'` on interactive elements |
| Font sizes | Mantine defaults (rem-based) | Explicit px-based scale (12-20) |
| Heading weights | Mixed 600/700 | All 600 (shadcn) |