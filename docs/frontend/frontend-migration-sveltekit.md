# Frontend Migration Guide: Next.js -> SvelteKit (`frontend/`)

Status date: 2026-02-03

This doc is a practical migration log + checklist. It is written for solo development and for AI agents to follow without context.

## Goals

- Create a single frontend in `frontend/` that contains:
  - Public pages: `/`, `/pricing`, `/how-it-works`
  - Protected dashboard: `/app/*`
- Keep the backend contract unchanged:
  - PostgREST reads under RLS
  - Edge Functions for orchestrations (`/ingest`, `/schemas`, `/runs`, `/export-jsonl`)
- Remove the Next.js UI and standardize on `frontend/`.

## Non-goals

- No SSR requirement for the dashboard.
- No redesign of DB schema or Edge Function contracts.
- No new backend service for the UI.

## Directory strategy

- `frontend/` (SvelteKit) is the active frontend.
- The prior Next.js UI directory was deleted on 2026-02-03.

## Environment variables (frontend)

The SvelteKit app uses public env vars:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY` (legacy anon JWT key, `eyJ...`)

Do not store service role keys or any shared secrets in the browser.

## Migration steps (checklist)

1) Scaffold `frontend/` SvelteKit project with minimal dependencies.
2) Implement Supabase auth (login, logout, session handling).
3) Add route protection for `/app/*`.
4) Implement core screens:
   - Upload -> call Edge Function `POST /functions/v1/ingest`
   - Document status -> read `documents` by `source_uid`
   - Blocks list -> read `blocks` by `doc_uid`
   - Export -> download `GET /functions/v1/export-jsonl?doc_uid=...`
5) (Phase 2 scaffolding) Add screens:
   - Schemas list/upload -> `schemas` table reads + `POST /functions/v1/schemas`
   - Runs list/create -> `annotation_runs` reads + `POST /functions/v1/runs`
   - Export-by-run -> `GET /functions/v1/export-jsonl?run_id=...`
6) Update docs and stop referencing Next.js as the primary UI.
7) Remove Next.js UI (completed on 2026-02-03).

## Rollback plan

If the SvelteKit frontend blocks progress:

- Keep using Edge Functions + smoke-test scripts as the primary verification path.
- Restore the old UI from git history only if absolutely necessary (do not maintain two active frontends).
