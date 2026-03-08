---
title: Typography
description: Heading sizes, line heights, and text scale across breakpoints.
---

## Starlight Text Scale

| Token | Value | Px |
|-------|-------|----|
| `--sl-text-xs` | `0.8125rem` | 13px |
| `--sl-text-sm` | `0.875rem` | 14px |
| `--sl-text-base` | `1rem` | 16px |
| `--sl-text-lg` | `1.125rem` | 18px |
| `--sl-text-xl` | `1.25rem` | 20px |
| `--sl-text-2xl` | `1.5rem` | 24px |
| `--sl-text-3xl` | `1.8125rem` | 29px |
| `--sl-text-4xl` | `2.1875rem` | 35px |
| `--sl-text-5xl` | `2.625rem` | 42px |
| `--sl-text-6xl` | `4rem` | 64px |

## Heading Sizes (mobile < 72rem)

| Heading | Token | Maps To | Size |
|---------|-------|---------|------|
| H1 | `--sl-text-h1` | `--sl-text-4xl` | 2.1875rem (35px) |
| H2 | `--sl-text-h2` | `--sl-text-3xl` | 1.8125rem (29px) |
| H3 | `--sl-text-h3` | `--sl-text-2xl` | 1.5rem (24px) |
| H4 | `--sl-text-h4` | `--sl-text-xl` | 1.25rem (20px) |
| H5 | `--sl-text-h5` | `--sl-text-lg` | 1.125rem (18px) |
| H6 | — | `--sl-text-base` | 1rem (16px) |

## Heading Sizes (desktop >= 72rem)

| Heading | Token | Maps To | Size |
|---------|-------|---------|------|
| H1 | `--sl-text-h1` | `--sl-text-5xl` | 2.625rem (42px) |
| H2 | `--sl-text-h2` | `--sl-text-4xl` | 2.1875rem (35px) |
| H3 | `--sl-text-h3` | `--sl-text-3xl` | 1.8125rem (29px) |
| H4 | `--sl-text-h4` | `--sl-text-2xl` | 1.5rem (24px) |

## Custom Overrides (global.css)

| Element | Property | Starlight Default | Current Value |
|---------|----------|------------------|---------------|
| H1 (`#_top`, `.sl-markdown-content h1`) | font-size | `--sl-text-h1` | `clamp(1.8rem, 2.6vw, 2.35rem)` |
| H1 | line-height | `1.2` | `1.12` |
| H1 | font-weight | `600` | `700` |
| H1, H2, H3, H4 | letter-spacing | `0` | `-0.02em` |
| Body | letter-spacing | `0` | `-0.01em` |
| Body | line-height | `1.75` (`--sl-line-height`) | `1.75` (unchanged) |
| All headings | line-height | `1.2` (`--sl-line-height-headings`) | `1.2` (unchanged) |

## Body Text Tokens

| Token | Value |
|-------|-------|
| `--sl-text-body` | `var(--sl-text-base)` = 1rem (16px) |
| `--sl-text-body-sm` | `var(--sl-text-xs)` = 0.8125rem (13px) |
| `--sl-text-code` | `var(--sl-text-sm)` = 0.875rem (14px) |
| `--sl-text-code-sm` | `var(--sl-text-xs)` = 0.8125rem (13px) |
| `--sl-line-height` | `1.75` |
| `--sl-line-height-headings` | `1.2` |
