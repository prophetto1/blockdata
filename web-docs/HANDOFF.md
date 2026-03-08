# blockdata-ct - Handoff

## Stack

Astro 5.18 + Starlight 0.37 + Tailwind 4 (via @tailwindcss/vite + @astrojs/starlight-tailwind)

## Commands

```
npm run dev      # localhost:4421
npm run build    # static output â†’ dist/
npm run preview  # serve built dist/
npm run check    # TypeScript type checking
```

## File tree

```
blockdata-ct/
â”œâ”€â”€ astro.config.mjs          # site config, sidebar, integrations
â”œâ”€â”€ package.json
â”œâ”€â”€ public/
â”‚   â””â”€â”€ favicon.svg            # indigo "B" placeholder
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ content.config.ts      # Starlight loader + schema
â”‚   â”œâ”€â”€ content/docs/          # all docs live here
â”‚   â”‚   â”œâ”€â”€ index.mdx          # splash landing page
â”‚   â”‚   â””â”€â”€ getting-started.md # first page
â”‚   â””â”€â”€ styles/
â”‚       â””â”€â”€ global.css         # Tailwind layers + Starlight CSS properties
â””â”€â”€ tsconfig.json
```

## What's configured

| Feature | Status | Notes |
|---------|--------|-------|
| Pagefind search | on | zero-config, built at build time |
| Dark/light toggle | on | built-in, no setup needed |
| Sitemap | on | `@astrojs/sitemap`, requires `site` in config |
| Last updated | on | reads git commit dates per file |
| Prev/next pagination | on | automatic from sidebar order |
| Table of contents | on | h2â€“h3 depth |
| Edit link | on | points to `prophetto1/blockdata-ct/` on GitHub |
| Tailwind CSS | on | `@tailwindcss/vite` + `@astrojs/starlight-tailwind` bridge |
| Credits footer | on | "Built with Starlight" link |
| Custom CSS | on | `src/styles/global.css` â€” Tailwind layers, accent colors, fonts, dark bg |

## What's NOT configured

- No MDX components (Cards, Tabs, Steps, FileTree, etc.) â€” add when needed
- No i18n / locales
- No custom component overrides
- No logo image (uses text title)
- No social links
- Favicon is a placeholder

## Adding pages

Drop `.md` or `.mdx` files in `src/content/docs/`. Subdirectories become URL segments.

```
src/content/docs/
â”œâ”€â”€ index.mdx           â†’ /
â”œâ”€â”€ getting-started.md  â†’ /getting-started/
â”œâ”€â”€ guides/
â”‚   â””â”€â”€ setup.md        â†’ /guides/setup/
â””â”€â”€ api/
    â””â”€â”€ overview.md     â†’ /api/overview/
```

Every page needs frontmatter:

```md
---
title: Page Title
description: Short description for SEO.
---

Content here.
```

## Sidebar config

Manual in `astro.config.mjs`. Add pages individually or autogenerate from directories:

```js
sidebar: [
  { slug: 'getting-started' },
  {
    label: 'Guides',
    autogenerate: { directory: 'guides' },
  },
  {
    label: 'API Reference',
    items: [
      { slug: 'api/overview' },
      { slug: 'api/endpoints' },
    ],
  },
],
```

## Theming

Override Starlight CSS properties in `src/styles/global.css` (below the Tailwind layer imports). Current values:

- Accent: `#EB5E41` (matches main site `--primary`)
- Font: Inter (matches main site `--app-font-sans`)
- Mono: JetBrains Mono + IBM Plex Mono (matches main site `--app-font-mono`)
- Dark bg: `#0e0e0e` (matches main site `--background`)
- Light bg: `#faf9f7` (matches main site warm stone scale)

Full list of properties: https://starlight.astro.build/reference/css-variables/

