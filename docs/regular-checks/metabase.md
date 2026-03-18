# Metabase: What We Learned and What We're Taking

## The Product

Metabase is a 46k-star open-source BI tool (AGPL). Clojure backend, React 18 + TypeScript frontend, Mantine v8 UI. The entire codebase is public, including enterprise features gated by license token at runtime. 1.6GB repo.

## What They Built Well

**Visual Query Builder (Notebook Mode).** Located in `frontend/src/metabase/querying/notebook/`. Users pick tables, add filters, joins, aggregations, sorts, and limits through a step-by-step UI without writing SQL. No other open-source project has matched this. The core state machine lives in a single ~1,000-line React hook. The full QB is ~50 components.

**Three-Area Platform Separation.** Not just admin layers — Metabase separates the product into three distinct surfaces:

1. **Admin** — database connections, user management, permissions, embedding config, table metadata (column types, semantic meaning, relationships). Each layer constrains the next. This keeps AI grounded.
2. **Main Platform** — questions, dashboards, collections, browsing. The end-user workspace.
3. **Data Studio** — the power-user surface. Contains: library, data structure, clustering, dependency graph, dependency diagnostics, transforms (visual query builder), SQL query (code editor), Python scripts (code editor).

The Data Studio separation is the key architectural insight. It groups all data operations — visual QB, SQL, Python, transforms, diagnostics — into one dedicated surface away from the main browsing experience.

**SQL Editor.** CodeMirror 6 with autocomplete from database schema, template variables, snippet insertion, multi-dialect support. Located in `frontend/src/metabase/query_builder/components/NativeQueryEditor/CodeMirrorEditor/`.

## What They Got Wrong

**AI is bolted on.** MetaBot is a gated chatbot in a sidebar. "Natural language to SQL" treated as a translation layer, not a core interaction model.

**Spreadsheet paradigm.** The QB still thinks in database terms (aggregations, breakouts, joins). Better than raw SQL, but still technical.

**Gated embedding.** The embedding SDK, interactive embedding, and whitelabel are all enterprise-only. You cannot embed Metabase into your own workspace without paying.

## What We're Taking (Architecture, Not Code)

- **Three-layer separation** maps to our superuser/admin/user-workspace config model. Confirms the architecture is right.
- **QB pattern** — study how UI state compiles to SQL. Table picker, filter builder, join builder, aggregation selector, sort, limit. Each is a step that modifies an immutable query object.
- **CodeMirror 6** for any code editing surface (SQL, expressions, custom formulas).
- **ECharts** as their charting library (Apache 2.0, 60k stars). Worth evaluating for our visualization needs.

## What We're Building Instead

**Three dedicated surfaces, each with its own AI.** Inspired by Metabase's three-area separation but fundamentally different. Each surface has a dedicated AI agent with full access to the knowledge graph, vector database, and MCP tools. The AI in each surface plays a role specific to that context.

**AI does the work, not the user.** Instead of users browsing thousands of function catalogs (our 1,000+ planned functions, Python libraries, transforms), the AI discovers and executes functions on their behalf. User describes intent. AI selects the function, clicks it in, shows the transform chain, and asks for confirmation. The user never needs to know the function catalog exists.

**Doc-style query builder.** Queries feel like writing a Google Doc, not operating a spreadsheet. Top-to-bottom flowing, readable, natural language-adjacent. Each clause is an interactive editable block in a sentence-like flow.

**Two views, same surface.** Doc mode (visual blocks showing the transform chain) and code mode (CodeMirror editor — SQL, Python, whatever). Toggle between them. Edit one, the other updates. The SQL builder is just "show me the code." Python scripts are just "show me the code."

**Voice-first interaction.** Take it further than typing. ElevenLabs integration. Conversation as the first-class input — user talks, AI does the work. Typing is the fallback, not the default. Make the entire platform as conversational as possible.

## The Landscape (March 2026)

No open-source standalone React visual query builder exists. Metabase's is the best but deeply coupled to their Clojure backend. `react-awesome-query-builder` (MIT, 2.2k stars) handles filter/WHERE clauses only. Weaverbird has the right concept (step-by-step pipeline) but is Vue.js with ~200 stars.

The visual query builder is ours to build. And we're building it better.

## Connection Details (Local Instance)

- **Host:** `aws-1-us-west-1.pooler.supabase.com`
- **Port:** 5432
- **Database:** postgres
- **Username:** `postgres.dbdzzhshmigewyprahej`
- **SSL:** required
