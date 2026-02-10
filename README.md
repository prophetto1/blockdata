# BlockData

Turn documents into structured knowledge — paragraph by paragraph, at any scale.

BlockData is a document intelligence platform that decomposes documents into blocks, applies user-defined extraction schemas via AI, and produces structured, traceable outputs. Every block gets identical treatment. Paragraph 1 and paragraph 840 receive the same schema, the same instructions, the same quality.

## The Problem

AI can't process long documents consistently. A 39,000-word manuscript exceeds what any single AI session handles well — the model shortcuts, loses context, skips sections. Manual extraction doesn't scale. And document-level metadata misses the value: the insight lives at the paragraph level.

## How It Works

```
Upload → Decompose → Schema → Process → Export
```

1. **Upload** — Drop in any document: Markdown, Word, PDF. Multiple files per project, any combination of formats.
2. **Decompose** — The platform splits each document into ordered, typed blocks (paragraphs, headings, tables, footnotes) with stable, deterministic identities.
3. **Define a Schema** — Describe what to extract: types, enums, instructions. Browse templates, use the AI wizard, or write JSON directly.
4. **Process** — AI processes every block independently against your schema. No context window limits. Blocks run in parallel at any scale.
5. **Export** — Structured results as JSONL. Push to Neo4j for knowledge graphs, DuckDB for analytics, or consume via webhook.

## Use Cases

**Long-document review** — A 50,000-word manuscript reviewed at paragraph-level quality in minutes. Prose editing, technical accuracy, structural assessment, terminology extraction — each paragraph against the same standard.

**Multi-document knowledge extraction** — Upload 77 documents across formats. Define one schema. Extract entities, relationships, obligations, cross-references — every field traceable to its source paragraph. Export to a knowledge graph.

**Legal research at scale** — 28,000 opinions, 420,000 blocks. Extract rhetorical function, citations, legal principles at the paragraph level across entire corpora.

**Contract review** — A 45-page DOCX. Get obligations, risk flags, defined terms, cross-references, and deadlines — clause by clause, with page-level tracing.

## Architecture

```
web/                    React + Mantine + AG Grid (Vite, TypeScript)
supabase/
  functions/
    ingest/             Document upload + block extraction
    schemas/            Schema CRUD
    runs/               Run creation + overlay generation
    export-jsonl/       JSONL export per run
    conversion-complete/  Callback from conversion service
  migrations/           PostgreSQL schema (RLS-enabled)
services/
  conversion-service/   FastAPI + Docling (PDF/DOCX → Markdown)
```

### Parsing Tracks

| Track | Formats | Parser | Locator |
|:------|:--------|:-------|:--------|
| **mdast** | `.md` | remark (mdast AST) | `text_offset_range` |
| **Docling** | `.docx`, `.pdf` | Docling → DoclingDocument | `docling_json_pointer` |
| **Pandoc** | `.txt`, `.epub`, `.odt`, `.rst`, `.latex` | Pandoc AST | `pandoc_ast_path` |

### Data Model

- **Projects** — group documents by initiative. Schemas are global, reusable across projects.
- **Documents** → **Blocks** — each document produces an ordered inventory of typed blocks with cryptographic identities. Re-upload the same file, get the same IDs.
- **Schemas** — user-defined JSON describing what to extract per block. Opaque to the platform — validated only for structure.
- **Runs** — apply a schema to a document's blocks. Each run generates one overlay per block.
- **Block Overlays** — structured AI output per block, tracked through `pending → claimed → complete/failed` states.

### Key Properties

- **Immutable base** — document content is frozen at ingest, never modified.
- **Deterministic identity** — `source_uid = sha256(source_type + raw_bytes)`, `conv_uid = sha256(tool + rep_type + rep_bytes)`, `block_uid = conv_uid + ":" + block_index`.
- **Swappable schemas** — same blocks, different schemas, different structured outputs.
- **Parallel processing** — block overlays act as a distributed work queue. Multiple AI workers (across providers) claim and process blocks concurrently.

## Stack

React 19 · Mantine 8 · AG Grid · TypeScript · Vite · Supabase (PostgreSQL + Edge Functions + Auth + Storage) · Docling · mdast/remark

## Local Development

### Frontend

```bash
cd web
cp .env.example .env    # Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

### Supabase

```bash
supabase start          # Local Supabase (Docker)
supabase db push        # Apply migrations
supabase functions serve # Serve edge functions locally
```

### Conversion Service

```bash
cd services/conversion-service
pip install -r requirements.txt
CONVERSION_SERVICE_KEY=your-secret uvicorn app.main:app --port 8000
```

## License

Proprietary. All rights reserved.
