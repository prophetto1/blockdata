# web-docs — Handoff

## Stack

Astro 5.18 + Starlight 0.37 + Tailwind 4 (via @tailwindcss/vite + @astrojs/starlight-tailwind)

## Commands

```
npm run dev      # localhost:4321
npm run build    # static output → dist/
npm run preview  # serve built dist/
npm run check    # TypeScript type checking
```

## File tree

```
web-docs/
├── astro.config.mjs          # site config, sidebar, integrations
├── package.json
├── public/
│   └── favicon.svg            # indigo "B" placeholder
├── src/
│   ├── content.config.ts      # Starlight loader + schema
│   ├── content/docs/          # all docs live here
│   │   ├── index.mdx          # splash landing page
│   │   └── getting-started.md # first page
│   └── styles/
│       └── global.css         # Tailwind layers + Starlight CSS properties
└── tsconfig.json
```

## What's configured

| Feature | Status | Notes |
|---------|--------|-------|
| Pagefind search | on | zero-config, built at build time |
| Dark/light toggle | on | built-in, no setup needed |
| Sitemap | on | `@astrojs/sitemap`, requires `site` in config |
| Last updated | on | reads git commit dates per file |
| Prev/next pagination | on | automatic from sidebar order |
| Table of contents | on | h2–h3 depth |
| Edit link | on | points to `writing-system/web-docs/` on GitHub |
| Tailwind CSS | on | `@tailwindcss/vite` + `@astrojs/starlight-tailwind` bridge |
| Credits footer | on | "Built with Starlight" link |
| Custom CSS | on | `src/styles/global.css` — Tailwind layers, accent colors, fonts, dark bg |

## What's NOT configured

- No MDX components (Cards, Tabs, Steps, FileTree, etc.) — add when needed
- No i18n / locales
- No custom component overrides
- No logo image (uses text title)
- No social links
- Favicon is a placeholder

## Adding pages

Drop `.md` or `.mdx` files in `src/content/docs/`. Subdirectories become URL segments.

```
src/content/docs/
├── index.mdx           → /
├── getting-started.md  → /getting-started/
├── guides/
│   └── setup.md        → /guides/setup/
└── api/
    └── overview.md     → /api/overview/
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

- Accent: `#4f46e5` (indigo)
- Font: system-ui stack
- Mono: JetBrains Mono stack
- Dark bg: `#0f0f14`

Full list of properties: https://starlight.astro.build/reference/css-variables/
