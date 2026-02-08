# MD Annotate

Upload various document types, auto-break into blocks, apply any metadata schema, and AI-powered block annotation. Use to edit documents, extract signals, enrich metadata, or build knowledge graphs — all from the same deterministic base.

## Web App (Primary UI)

The primary UI is the React app in `web/` (web-first; the block viewer is the primary interface).

Local setup:

1) Copy `web/.env.example` → `web/.env` and set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2) Run:
   - `cd web`
   - `npm install`
   - `npm run dev`

## How It Works

1. **Upload** — any format (PDF, DOCX, TXT) auto-converts via Docling
2. **Ingest** — converted representation is parsed into block-level units
3. **Schema** — select or upload a schema defining what AI should extract per block
4. **Annotate** — AI workers fill structured fields for every block, concurrently
5. **Export** — JSONL, revised document, or feed directly into a knowledge graph

## Key Ideas

- **Immutable base** — document content is frozen at ingest, never modified
- **Swappable schemas** — same blocks, different lenses, different outputs
- **Block = universal unit** — one block, one vector, one KG node, N metadata layers

## Stack

Docling · mdast (remark) · Supabase/PostgreSQL
