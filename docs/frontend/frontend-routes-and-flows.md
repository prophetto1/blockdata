# Frontend Routes + Flows (SvelteKit `frontend/`)

Status date: 2026-02-03

This document maps pages to backend calls. If something breaks, use this to localize the failing layer.

## Public routes (no auth)

- `/` (landing)
- `/pricing`
- `/how-it-works`

## Auth routes

- `/login`
  - Supabase Auth: email/password sign-in.
- `/logout`
  - Supabase Auth: sign out, redirect to `/`.

## Protected dashboard routes (`/app/*`)

All routes under `/app/*` require a Supabase session. If unauthenticated, redirect to `/login`.

### `/app` (overview)

- Shows navigation and quick links to core flows.

### `/app/workspace`

Purpose: workspace home for pipeline buildout.

- Links to the core flows (upload/documents/schemas/runs).

### `/app/upload`

Purpose: start ingest.

- Edge Function:
  - `POST /functions/v1/ingest` (multipart form)
    - fields: `file`, `immutable_schema_ref`, `doc_title`

### `/app/documents`

Purpose: list user documents.

- PostgREST:
  - `documents` table: list recent documents for the current user under RLS.

### `/app/documents/[source_uid]`

Purpose: check ingestion lifecycle and find `doc_uid`.

- PostgREST:
  - `documents` by `source_uid`
- Actions:
  - If `status=ingested` and `doc_uid` present: link to blocks + export.

### `/app/documents/[source_uid]/blocks`

Purpose: browse block inventory.

- PostgREST:
  - `blocks` by `doc_uid` ordered by `block_index` (paginated via range).

### `/app/schemas`

Purpose: upload/list annotation schemas (Phase 2 scaffolding).

- Edge Function:
  - `POST /functions/v1/schemas` (multipart file upload)
- PostgREST:
  - `schemas` list

### `/app/runs`

Purpose: create/list runs (Phase 2 scaffolding).

- Edge Function:
  - `POST /functions/v1/runs` JSON `{ doc_uid, schema_id }`
- PostgREST:
  - `annotation_runs` list

### `/app/runs/[run_id]`

Purpose: view run + export annotated JSONL.

- PostgREST:
  - `annotation_runs` by `run_id`
- Edge Function:
  - `GET /functions/v1/export-jsonl?run_id=...`
