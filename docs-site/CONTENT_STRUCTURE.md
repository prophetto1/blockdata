# Docs Site Content Directory Structure

This docs authoring structure is aligned to the sidebar menu groups defined in `docs-site/astro.config.mjs`.

## Save New Pages By Menu Group

- `Getting Started` -> `src/content/docs/getting-started/`
- `Core Workflow` -> `src/content/docs/core-workflow/`
- `Key Concepts` -> `src/content/docs/key-concepts/`
- `Integrations` -> `src/content/docs/integrations/`
- `Roadmap` -> `src/content/docs/roadmap/`

## Route Stability Rule

Many pages use explicit `slug` frontmatter so URLs stay stable even though files are organized by menu group.

When moving an existing page:

1. Keep or add `slug: /existing-route/` in frontmatter.
2. Keep sidebar links in `astro.config.mjs` unchanged unless the route is intentionally changing.
3. Run `npm run build` in `docs-site` to verify no broken routes.

## Current Menu-Aligned Tree

```text
src/content/docs/
  core-workflow/
  getting-started/
  integrations/
  key-concepts/
  roadmap/
```
