# Frontend Runbook (SvelteKit in `frontend/`)

Status date: 2026-02-03

This is the “do I remember how to run and debug the dashboard?” guide.

## What the frontend does

- Public marketing pages: `/`, `/pricing`, `/how-it-works`
- Auth pages: `/login` (and `/logout`)
- Dashboard: `/app/*` (requires an authenticated Supabase session)
- Calls the backend via:
  - PostgREST reads under RLS (`documents`, `blocks`, `schemas`, `annotation_runs`, `block_annotations`)
  - Edge Functions for orchestration + exports (`/ingest`, `/schemas`, `/runs`, `/export-jsonl`)

## Local setup

1) Create env file:

- Copy `frontend/.env.example` -> `frontend/.env`

2) Install dependencies and run:

- `cd frontend`
- `npm install`
- `npm run dev`

Local URL:

- `http://localhost:5173`

## Required env vars

- `PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co`
- `PUBLIC_SUPABASE_ANON_KEY=<legacy anon key that starts with eyJ...>`

## Deploy (Vercel)

This frontend is built as a static site (adapter-static).

Vercel project settings:

- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `build`
- Environment Variables:
  - `PUBLIC_SUPABASE_URL`
  - `PUBLIC_SUPABASE_ANON_KEY`

SPA deep-linking:

- `frontend/vercel.json` routes unknown paths to `200.html` so `/app/*` works on refresh.

## How auth works (high level)

- Login uses `supabase.auth.signInWithPassword`.
- Session is stored client-side by `@supabase/supabase-js`.
- Protected routes under `/app/*` redirect to `/login` if no active session.

## Troubleshooting

### “I can’t read tables in the dashboard”

- Confirm you’re logged in and have a valid session.
- Confirm RLS policies allow reads for the current user (they should be owner-scoped).

### “Edge Function calls return 401”

- Ensure requests include both:
  - `Authorization: Bearer <access_token>`
  - `apikey: <PUBLIC_SUPABASE_ANON_KEY>`

### “Upload succeeds but status never moves past converting”

- Conversion service likely not deployed or callback secret mismatch.
- Check `documents.error` and ensure `CONVERSION_SERVICE_URL/KEY` secrets are set in Supabase.
