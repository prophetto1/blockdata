# blockdata-ct - Direction

## Purpose

This docs site is not just human-readable documentation. It is the **knowledge layer** for the BlockData platform â€” a structured content corpus that serves three audiences:

1. **Humans** browsing docs in a browser
2. **AI systems** in the main website that assist users (RAG, chat, contextual help)
3. **The Learning Commons Knowledge Graph** for standards-aligned content discovery

All three consume the same source content. The docs site builds for humans (HTML) and machines (JSON, llms.txt) from a single source of truth.

## Existing content

Existing pages (assessments, internal specs, reference pages) are **development artifacts** â€” useful for testing the setup but not canonical content. They can be reorganized, replaced, or removed freely as real content takes shape.

## Architecture

```
blockdata-ct/src/
  content/docs/           # source of truth â€” .md and .mdx pages
  pages/
    api/
      docs.json.ts        # full docs corpus as structured JSON
      chunks.json.ts      # docs chunked by heading section for RAG ingestion
    llms.txt.ts           # llms.txt convention â€” machine-readable sitemap
    llms-full.txt.ts      # full rendered content for LLM consumption
  components/
    SiteTitle.astro        # branded title (exists)
    (semantic components)  # Concept, Prerequisite, APIEndpoint, etc.
  lib/
    docs-loader.ts         # helpers for querying content collections
  styles/
    global.css             # theme tokens aligned to main site (exists)
```

## Build plan (ordered)

### Phase 1 â€” Machine-readable endpoints
- `llms.txt` endpoint listing every page with title, description, URL
- `llms-full.txt` with full page content concatenated
- `/api/docs.json` exposing the full corpus as structured data
- These make the docs immediately consumable by the main site's AI

### Phase 2 â€” Rich frontmatter schema
- Extend `content.config.ts` with fields: `tags`, `knowledgeGraphId`, `audience`, `relatedPages`
- Enforce schema validation so every page carries structured metadata
- This metadata powers filtering, cross-referencing, and targeted retrieval

### Phase 3 â€” Orama search (replaces Pagefind)
- Integrate `@orama/plugin-astro` or Starlight Orama plugin
- Provides vector/hybrid search and natural-language answer synthesis
- Users ask questions, get answers drawn from docs â€” not just keyword matches

### Phase 4 â€” Knowledge graph bridge
- Tag docs with standard/component IDs from the Learning Commons Knowledge Graph
- Optionally pull graph data into docs at build time via Astro content loaders
- Auto-generate cross-reference and progression pages

### Phase 5 â€” RAG chunking pipeline
- Build-time pipeline that segments docs by heading section
- Exports chunks with metadata (title, section, tags, URL, knowledgeGraphId)
- `/api/chunks.json` endpoint for the main site to index into its vector store

## Key decisions

- **Single source of truth.** Content lives in `blockdata-ct/src/content/docs/`. Everything else derives from it.
- **Build-time generation.** JSON endpoints, llms.txt, and chunk exports are generated at build time â€” no runtime dependencies.
- **Schema-first.** Frontmatter schema is enforced via Astro content collections. If a field exists, it's typed and validated.
- **Sidebar can autogenerate.** Use `autogenerate: { directory: '...' }` for sections that grow frequently (assessments, guides) to avoid manual config churn.

## Stack reference

- Astro 5.18 + Starlight 0.37 + Tailwind 4
- Keystatic CMS (dev-only, for browser-based editing)
- remark-math + rehype-katex (LaTeX support)
- remark-emoji
- Site: `https://www.blockdata.run`
- Dev server: `npm run dev` on port 4421
