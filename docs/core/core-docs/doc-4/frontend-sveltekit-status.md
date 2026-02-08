# Doc 4 — Frontend (Web) (Implementation Status, As-Is)

Purpose: describe the current web frontend behavior and how to run it.

---

## What Exists

- React web app under `web/` (Vite + React Router)
- Public routes: `/`, `/login`
- Protected app routes under `/app/*`

---

## How to Run (Local)

1) Copy `web/.env.example` → `web/.env`
2) Set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3) Run:
   - `cd web`
   - `npm install`
   - `npm run dev`

---

## What It Integrates With (As-Is)

- Reads via PostgREST under RLS: `documents_v2`, `blocks_v2`, `schemas`, `runs_v2`, `block_overlays_v2`
- Writes/orchestration via Edge Functions: `/ingest`, `/schemas`, `/runs`, `/export-jsonl`

---

## Note (History)

The prior SvelteKit frontend under `frontend/` has been retired in favor of `web/`.
