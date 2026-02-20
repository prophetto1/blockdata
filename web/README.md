# Web App (React)

Primary web UI for BlockData.

## Local setup

1) Create env file:

- Copy `.env.example` → `.env`

2) Fill in:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

3) Install + run:

- `npm install`
- `npm run dev`

Local URL:

- `http://localhost:5173`

## What it integrates with

- PostgREST reads under RLS: `documents_view` (joins `source_documents` + `conversion_parsing`), `blocks`, `schemas`, `runs`, `block_overlays`
- Edge Functions:
  - `POST /functions/v1/ingest`
  - `POST /functions/v1/schemas`
  - `POST /functions/v1/runs`
  - `GET /functions/v1/export-jsonl`

## Routing (SPA)

The app uses React Router with `/app/*` routes. Deployments must serve `index.html` for deep links like `/app/documents/...`.
