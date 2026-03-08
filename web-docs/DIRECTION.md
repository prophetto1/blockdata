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
web-docs/src/
  content/docs/              # source of truth — .md and .mdx pages
  pages/
    api/
      docs-file.ts           # file read/write utility (exists)
      docs.json.ts           # [Phase 1] full docs corpus as structured JSON
      chunks.json.ts         # [Phase 5] docs chunked by heading section for RAG
    llms.txt.ts              # [Phase 1] machine-readable sitemap
    llms-full.txt.ts         # [Phase 1] full rendered content for LLM consumption
  components/
    DocsHeader.astro         # custom header (exists)
    DocsSidebar.astro        # custom sidebar (exists)
    SiteTitle.astro          # branded title (exists)
    OramaSearch.astro        # search modal shell (exists — Phase 3)
    OramaSearchPanel.tsx     # React search island (exists — Phase 3)
    (semantic components)    # [future] Concept, Prerequisite, APIEndpoint, etc.
  lib/docs/
    generate-sidebar.mjs     # auto-generates Starlight sidebar from filesystem
    sidebar-order.mjs        # controls sidebar section ordering
    content-tree.mjs         # builds filesystem tree of docs
  styles/
    global.css               # theme tokens aligned to main site (exists)
```

## Build plan (ordered)

### Phase 1 — Machine-readable endpoints
- `llms.txt` endpoint listing every page with title, description, URL
- `llms-full.txt` with full page content concatenated
- `/api/docs.json` exposing the full corpus as structured data
- These make the docs immediately consumable by the main site's AI

### Phase 2 — Rich frontmatter schema
- Extend `content.config.ts` with fields: `tags`, `knowledgeGraphId`, `audience`, `relatedPages`
- Enforce schema validation so every page carries structured metadata
- This metadata powers filtering, cross-referencing, and targeted retrieval

### Phase 3 — Orama search (replaces Pagefind) ✅ COMPLETE

**Implemented 2026-03-08.**

Replaced Starlight's default Pagefind with Orama OSS via `@orama/plugin-astro`.

**What shipped:**
- `@orama/orama` + `@orama/plugin-astro` installed
- `astro.config.mjs`: `pagefind: false`, Orama integration added, Search component overridden
- `OramaSearch.astro`: modal shell with Ctrl/Cmd+K shortcut, click-outside-to-close, platform key detection, dev-mode fallback message
- `OramaSearchPanel.tsx`: React island — loads Orama DB on mount, 150ms debounced BM25 full-text search, result list with titles + content excerpts
- Custom `loadOramaDB()` that respects `import.meta.env.BASE_URL` (the plugin's built-in client hardcodes `/assets/` which breaks under base paths)
- All styles use Starlight design tokens (`--sl-color-*`)

**What's deferred to Phase 3.5 (answer synthesis):**
- Natural-language answer generation requires an LLM API key (OpenAI or Orama Cloud)
- Can be added later by wrapping search results with Orama's Answer Engine
- No architectural changes needed — just add the LLM call after `search()`

**Index stats:**
- 72 docs indexed, ~4.4MB JSON (client-side, fetched on first search open)
- `pathMatcher: /.+/` indexes all pages; can be narrowed if needed
- `contentSelectors: ['.sl-markdown-content']` targets only page body, not nav chrome

### Phase 3.5 — Search refinements (optional, not blocking)
- Narrow `pathMatcher` to exclude heavy plan/docling pages and reduce index size
- Add highlight/mark support for search term matches in excerpts
- Add keyboard navigation (arrow keys) through results
- Answer synthesis via Orama Answer Engine + OpenAI API key

### Phase 4 — Knowledge graph bridge
- Tag docs with standard/component IDs from the Learning Commons Knowledge Graph
- Optionally pull graph data into docs at build time via Astro content loaders
- Auto-generate cross-reference and progression pages
- **Note:** Phase 2 (rich frontmatter) should land first to provide `knowledgeGraphId` fields

### Phase 5 — RAG chunking pipeline
- Build-time pipeline that segments docs by heading section
- Exports chunks with metadata (title, section, tags, URL, knowledgeGraphId)
- `/api/chunks.json` endpoint for the main site to index into its vector store
- **Note:** The Orama index already contains per-page `content` extracted via `html-to-text`. The chunking pipeline adds heading-level granularity and structured metadata on top of that. Consider reusing Orama's `contentSelectors` + `html-to-text` pipeline rather than building a parallel extractor.
- **Note:** Phase 1's `/api/docs.json` and Phase 5's `/api/chunks.json` can share a common content extraction layer — build Phase 1 with chunking in mind to avoid duplicate work.

## Key decisions

- **Single source of truth.** Content lives in `blockdata-ct/src/content/docs/`. Everything else derives from it.
- **Build-time generation.** JSON endpoints, llms.txt, and chunk exports are generated at build time â€” no runtime dependencies.
- **Schema-first.** Frontmatter schema is enforced via Astro content collections. If a field exists, it's typed and validated.
- **Sidebar can autogenerate.** Use `autogenerate: { directory: '...' }` for sections that grow frequently (assessments, guides) to avoid manual config churn.

## Stack reference

- Astro 5.18 + Starlight 0.37 + Tailwind 4
- Orama search (`@orama/plugin-astro` — build-time index, client-side BM25)
- React 19 (search UI island)
- remark-math + rehype-katex (LaTeX support)
- remark-emoji
- Site: `https://www.blockdata.run`
- Dev server: `npm run dev` on port 4421
