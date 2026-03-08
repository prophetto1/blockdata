---
title: Getting Started
description: Set up and run the BlockData docs site locally.
slug: getting-started
---

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm or pnpm

## Install

```bash
cd blockdata-ct
npm install
```

## Development

```bash
npm run dev       # http://localhost:4421
```

## Build

```bash
npm run build     # static output â†’ dist/
npm run preview   # serve the built site
```

## Type check

```bash
npm run check     # runs astro check
```

## Adding pages

Drop `.md` or `.mdx` files in `src/content/docs/`. Subdirectories become URL segments:

```
src/content/docs/
â”œâ”€â”€ index.mdx              â†’ /
â”œâ”€â”€ getting-started.md     â†’ /getting-started/
â”œâ”€â”€ guides/
â”‚   â””â”€â”€ setup.md           â†’ /guides/setup/
â””â”€â”€ reference/
    â””â”€â”€ overview.md        â†’ /reference/overview/
```

Every page needs frontmatter:

```md
---
title: Page Title
description: Short description for SEO.
---

Content here.
```

## Sidebar

Managed in `astro.config.mjs`. Add pages manually or autogenerate from directories:

```js
sidebar: [
  { slug: 'getting-started' },
  {
    label: 'Guides',
    autogenerate: { directory: 'guides' },
  },
],
```

## Theming

Override Starlight CSS custom properties in `src/styles/global.css`. Current values:

| Property | Value |
|---|---|
| Accent color | `#4f46e5` (indigo) |
| Body font | system-ui stack |
| Mono font | JetBrains Mono stack |
| Dark background | `#0f0f14` |

Full property list: [Starlight CSS Variables](https://starlight.astro.build/reference/css-variables/)
