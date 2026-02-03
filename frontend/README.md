# Frontend (SvelteKit)

Primary frontend for Writing System:

- Public pages: `/`, `/pricing`, `/how-it-works`
- Auth pages: `/login`, `/logout`
- Dashboard: `/app/*` (auth required)

Backend integration (unchanged):

- PostgREST reads under RLS (`documents`, `blocks`, `schemas`, `annotation_runs`, `block_annotations`)
- Edge Functions for orchestration + export:
  - `POST /functions/v1/ingest`
  - `POST /functions/v1/schemas`
  - `POST /functions/v1/runs`
  - `GET /functions/v1/export-jsonl`

## Local setup

1) Create env file:

- Copy `.env.example` -> `.env`

2) Fill in:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`

2) Install + run:

- `npm install`
- `npm run dev`

Local URL:

- `http://localhost:5173`

## Required env vars

- `PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co`
- `PUBLIC_SUPABASE_ANON_KEY=<legacy anon JWT key, starts with eyJ...>`

## Deploy to Vercel (static)

This frontend uses `@sveltejs/adapter-static` and produces a static build in `frontend/build/`.

In Vercel:

- Import the repo
- Set **Root Directory** to `frontend`
- Set **Framework Preset** to `Other`
- Set **Build Command** to `npm run build`
- Set **Output Directory** to `build`
- Add env vars:
  - `PUBLIC_SUPABASE_URL`
  - `PUBLIC_SUPABASE_ANON_KEY`

Note:

- `frontend/vercel.json` provides an SPA fallback so deep links like `/app/...` don’t 404.
