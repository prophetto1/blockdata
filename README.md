# MD Annotate

Upload various document types, auto-break into blocks, apply any metadata schema, and AI-powered block annotation. Use to edit documents, extract signals, enrich metadata, or build knowledge graphs — all from the same deterministic base.

## How It Works

1. **Upload** — any format (PDF, DOCX, TXT) auto-converts to Markdown via Docling
2. **Ingest** — Markdown is parsed into block-level units (paragraphs, headings, tables, code, etc.)
3. **Schema** — select or upload an annotation schema defining what AI should extract per block
4. **Annotate** — AI workers fill structured fields for every block, concurrently
5. **Export** — JSONL, revised document, or feed directly into a knowledge graph

## Key Ideas

- **Immutable base** — document content is frozen at ingest, never modified
- **Swappable schemas** — same blocks, different lenses, different outputs
- **Block = universal unit** — one block, one vector, one KG node, N metadata layers

## Stack

Docling · remark-parse · Supabase/PostgreSQL · Pandoc
