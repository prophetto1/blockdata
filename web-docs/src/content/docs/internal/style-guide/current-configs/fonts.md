---
title: fonts
description: Typography settings and font stack configuration.
---

## Font Stacks

| CSS Variable | Value |
|-------------|-------|
| `--app-font-sans` | `"Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| `--app-font-mono` | `"JetBrains Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace` |
| `--sl-font` | `var(--app-font-sans)` |
| `--sl-font-mono` | `var(--app-font-mono)` |

## Loaded Weights

| Font | Weights | Source |
|------|---------|--------|
| Nunito | 400, 500, 600, 700 | `@fontsource/nunito` |
| JetBrains Mono | 400, 500 | `@fontsource/jetbrains-mono` |

## Usage

| Context | Font | Weight |
|---------|------|--------|
| Body text | Nunito | 400 |
| UI labels / sidebar | Nunito | 500 |
| Subheadings (h3, h4) | Nunito | 600 |
| Page titles (h1, h2) | Nunito | 700 |
| Code blocks | JetBrains Mono | 400 |
| Expressive Code UI | Nunito | — (`--ec-uiFontFml`) |
| Expressive Code body | JetBrains Mono | — (`--ec-codeFontFml`) |
| Expressive Code UI size | — | `0.82rem` |
