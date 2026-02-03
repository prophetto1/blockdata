# Design: SvelteKit Frontend in `frontend/` (Marketing + Protected Dashboard)

Date: 2026-02-03  
Status: Active

This design captures the “why” and the minimal structure for the new frontend so development stays fast for a solo developer and AI agents.

## Problem

We need a stable, simple frontend for a dashboard-first product:

- A few public marketing pages (not auth-gated).
- A protected dashboard where nearly all functionality lives.

Next.js (App Router) increased complexity and slowed iteration without providing meaningful value for this product shape.

## Decision

Build a single SvelteKit app in `frontend/` containing:

- Public routes: `/`, `/pricing`, `/how-it-works`
- Auth routes: `/login`, `/logout`
- Protected dashboard routes: `/app/*`

Related ADR:

- `docs/refs/frontend-stack-decision.md`

## Non-goals

- No SSR requirement for the dashboard.
- No movement of pipeline logic into the frontend.
- No changes to the backend contract (tables, RLS, Edge Function API shape).

## Architecture

### Runtime model

- Public routes can be static/prerendered.
- Dashboard routes are client-heavy and can be treated as SPA-style pages.
- Backend remains canonical; frontend is a thin client.

### Backend integration

Reads:

- Supabase PostgREST under RLS:
  - `documents`, `blocks`, `schemas`, `annotation_runs`, `block_annotations`

Writes / orchestration:

- Supabase Edge Functions:
  - `POST /functions/v1/ingest` (multipart upload)
  - `POST /functions/v1/schemas` (schema upload)
  - `POST /functions/v1/runs` (create run via RPC)
  - `GET /functions/v1/export-jsonl` (export by `doc_uid` or `run_id`)

### Auth model

- Supabase Auth email/password via `@supabase/supabase-js`.
- Protected routes redirect to `/login` when no session is present.

## Routes (minimum viable set)

Public:

- `/` landing
- `/pricing`
- `/how-it-works`

Auth:

- `/login`
- `/logout`

Dashboard:

- `/app` overview
- `/app/upload` -> calls `/ingest`
- `/app/documents` -> lists `documents`
- `/app/documents/[source_uid]` -> document status (and export)
- `/app/documents/[source_uid]/blocks` -> block inventory
- `/app/schemas` -> upload/list schemas (Phase 2 scaffolding)
- `/app/runs` -> create/list runs (Phase 2 scaffolding)
- `/app/runs/[run_id]` -> run detail + export-by-run

## Environment variables

Public (browser-safe):

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY` (legacy anon JWT key)

Never in the browser:

- `SUPABASE_SERVICE_ROLE_KEY`
- `CONVERSION_SERVICE_KEY`

## Documentation requirements

These docs must be kept in sync as the dashboard evolves:

- `docs/dev-plan/frontend-runbook.md`
- `docs/dev-plan/frontend-routes-and-flows.md`
- `docs/dev-plan/frontend-migration-sveltekit.md`

## Validation plan

- Frontend sanity:
  - Can login and see `/app`.
  - Can load `documents` list under RLS.
  - Can upload `.md` and navigate to the document status page.
  - Can view blocks and export JSONL.
- Backend proof remains the primary acceptance:
  - `scripts/smoke-test.ps1`
  - `scripts/smoke-test-gfm-blocktypes.ps1`
  - `scripts/smoke-test-schema-run.ps1`

