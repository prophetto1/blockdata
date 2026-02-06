# Doc 4 — Frontend (SvelteKit) (Implementation Status, As-Is)

Purpose: describe the current frontend behavior and how to run it.

---

## What Exists

- SvelteKit frontend under `frontend/`
- Public pages (`/`, `/pricing`, `/how-it-works`)
- Auth routes (`/login`, `/logout`)
- Protected dashboard routes under `/app/*`

---

## How to Run (Local)

1) Copy `frontend/.env.example` → `frontend/.env`
2) Set:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
3) Run:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

---

## What It Integrates With (As-Is)

- Reads via PostgREST under RLS: `documents`, `blocks`, `schemas`, `annotation_runs`, `block_annotations`
- Writes/orchestration via Edge Functions: `/ingest`, `/schemas`, `/runs`, `/export-jsonl`

