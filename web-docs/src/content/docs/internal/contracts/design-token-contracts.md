---
title: Design Token Contracts
description: Live font, spacing, color, and editor token contracts for the docs site, with notes on inheritance and current exceptions.
---

## Source Of Truth

The live token contract for this docs site is `src/styles/global.css`.

Supporting internal docs under `src/content/docs/internal/style-guide/current-configs/` are useful snapshots, but the runtime values come from `:root` and `:root[data-theme='light']` in `global.css`.

## Font Contract

### Imported font assets

| Package import | Weights loaded |
|---|---|
| `@fontsource/inter` | `400`, `500`, `600`, `700` |
| `@fontsource/jetbrains-mono` | `400`, `500` |
| `@fontsource/nunito` | `400`, `500`, `600`, `700` |

### Active font tokens

| Token | Value | Use |
|---|---|---|
| `--app-font-sans` | `"Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | Body copy, shell controls, and general UI |
| `--app-font-mono` | `"JetBrains Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace` | File tree, code, editor status, and inline code |
| `--sl-font` | `var(--app-font-sans)` | Starlight UI bridge |
| `--sl-font-mono` | `var(--app-font-mono)` | Starlight code bridge |

`Inter` is imported but is not assigned to an active runtime token in this docsite shell.

## Spacing And Size Contract

### Explicit spacing tokens

| Token | Value |
|---|---|
| `--app-space-xs` | `0.5rem` |
| `--app-space-sm` | `0.75rem` |
| `--app-space-md` | `1rem` |
| `--app-space-lg` | `1.5rem` |
| `--radius` | `0.625rem` |
| `--sl-nav-height` | `50px` |

### Structural sizes used by the shell

| Contract surface | Value | Owner |
|---|---|---|
| Sidebar toggle button | `2.25rem` square | `DocsSidebar.astro` |
| File tree header row | `1.5rem` | `DocsSidebar.astro` |
| File tree item row | `1.5rem` | `DocsSidebar.astro` |
| Work-area top strip | `2.25rem` | `DocsTwoColumnContent.astro` |
| Default split ratio | `50%` | `DocsTwoColumnContent.astro` |
| Split ratio clamp | `20%` to `80%` | `DocsTwoColumnContent.astro` |
| Large-screen content width | `65rem` at `72rem+` viewport | `global.css` |

## Base Color Tokens

### Core surfaces and text

| Token | Dark | Light |
|---|---|---|
| `--background` | `#0e0e0e` | `#faf9f7` |
| `--foreground` | `#eeeeee` | `#1c1917` |
| `--card` | `#141414` | `#ffffff` |
| `--card-foreground` | `#eeeeee` | `#1c1917` |
| `--popover` | `#141414` | `#ffffff` |
| `--popover-foreground` | `#eeeeee` | `#1c1917` |
| `--primary` | `#eb5e41` | `#eb5e41` |
| `--primary-foreground` | `#ffffff` | `#ffffff` |
| `--secondary` | `#1a1a1a` | `#f0eeed` |
| `--secondary-foreground` | `#eeeeee` | `#292524` |
| `--muted` | `#1a1a1a` | `#e8e6e3` |
| `--muted-foreground` | `#a0a0a0` | `#57534e` |
| `--accent` | `#1a1a1a` | `#f5ebe6` |
| `--accent-foreground` | `#eeeeee` | `#1c1917` |

### Borders, separators, and focus

| Token | Dark | Light |
|---|---|---|
| `--separator` | `#2a2a2a` | `#d6d3d1` |
| `--border` | `var(--separator)` | `var(--separator)` |
| `--input` | `#2a2a2a` | `#d6d3d1` |
| `--ring` | `#eb5e41` | `#eb5e41` |

### Sidebar-specific tokens

| Token | Dark | Light |
|---|---|---|
| `--sidebar` | `#0e0e0e` | `#ffffff` |
| `--sidebar-foreground` | `#eeeeee` | `#1c1917` |
| `--sidebar-accent` | `#1a1a1a` | `#f5f3f1` |
| `--sidebar-border` | `var(--separator)` | `var(--separator)` |

## Starlight Bridge Tokens

These variables adapt the app tokens to Starlight's theming surface.

| Token | Dark | Light |
|---|---|---|
| `--sl-color-accent-low` | `#2a1510` | `#2a1510` |
| `--sl-color-accent` | `var(--primary)` | `var(--primary)` |
| `--sl-color-accent-high` | `#fcd5cc` | `#fcd5cc` |
| `--sl-color-purple-low` | `#2a1510` | `#2a1510` |
| `--sl-color-purple` | `var(--primary)` | `var(--primary)` |
| `--sl-color-purple-high` | `#fcd5cc` | `#fcd5cc` |
| `--sl-color-white` | `#ffffff` | `#1c1917` |
| `--sl-color-gray-1` | `#f5f5f5` | `#292524` |
| `--sl-color-gray-2` | `#d4d4d8` | `#44403c` |
| `--sl-color-gray-3` | `#a1a1aa` | `#57534e` |
| `--sl-color-gray-4` | `#71717a` | `#78716c` |
| `--sl-color-gray-5` | `#52525b` | `#a8a29e` |
| `--sl-color-gray-6` | `#3f3f46` | `#d6d3d1` |
| `--sl-color-black` | `#09090b` | `#ffffff` |
| `--sl-color-bg` | `var(--background)` | `var(--background)` |
| `--sl-color-bg-nav` | `var(--card)` | `var(--card)` |
| `--sl-color-bg-sidebar` | `var(--card)` | `var(--card)` |
| `--sl-color-bg-inline-code` | `color-mix(in oklab, var(--card) 80%, var(--foreground) 20%)` | `color-mix(in oklab, var(--accent) 72%, var(--background) 28%)` |
| `--sl-color-text` | `var(--foreground)` | `var(--foreground)` |
| `--sl-color-text-accent` | `var(--primary)` | `var(--primary)` |
| `--sl-color-hairline` | `var(--separator)` | `var(--separator)` |
| `--sl-color-hairline-shade` | `var(--separator)` | `var(--separator)` |
| `--sl-color-backdrop-overlay` | `rgba(9, 9, 11, 0.72)` | `rgba(28, 25, 23, 0.48)` |

## Editor Surface Tokens

These are derived tokens for the split-editor surface.

| Token | Dark | Light |
|---|---|---|
| `--editor-bg` | `var(--sl-color-bg)` | `var(--sl-color-bg)` |
| `--editor-fg` | `var(--sl-color-text)` | `var(--sl-color-text)` |
| `--editor-muted-fg` | `var(--sl-color-gray-3)` | `var(--sl-color-gray-3)` |
| `--editor-chrome-bg` | `var(--sl-color-bg-nav)` | `var(--sl-color-bg-nav)` |
| `--editor-border` | `var(--sl-color-hairline)` | `var(--sl-color-hairline)` |
| `--editor-accent` | `var(--sl-color-text-accent)` | `var(--sl-color-text-accent)` |
| `--editor-success` | `#4ade80` | `#15803d` |
| `--editor-danger` | `#f87171` | `#b91c1c` |

## Typographic And Surface Rules In Use

The docsite currently enforces these runtime rules through `global.css` and shell component styles:

- Dark mode is the default `color-scheme`; light mode is activated by `data-theme='light'`.
- `html` and `body` use `var(--app-font-sans)`.
- `code`, `kbd`, `samp`, and `pre` use `var(--app-font-mono)`.
- Body copy applies `letter-spacing: -0.01em`.
- `h1` through `h4` use `letter-spacing: -0.02em`, with heavier weights than Starlight defaults.
- Inline code and code blocks derive borders and backgrounds from semantic tokens instead of raw surfaces.

## Current Exceptions To The Token Rule

Most shell surfaces use semantic variables, but a few hard-coded values still exist:

| File | Hard-coded value | Current use |
|---|---|---|
| `src/components/SiteTitle.astro` | `#1f1f1f` | Light-theme fallback for the `BLOCK` wordmark |
| `src/components/DocsSidebar.astro` | `#d1ab6f` | File tree folder icon color |
| `src/components/DocsSidebar.astro` | `#8aa9ff` | Markdown file icon color |

These are part of the live implementation today, but they are not first-class tokens.
