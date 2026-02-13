# Supabase Edge Functions (Phase 1 + Phase 2 scaffolding)

This folder contains Supabase Edge Functions for the Phase 1 immutable ingest pipeline, plus Phase 2 scaffolding (schema upload + run creation + export-by-run).

## Functions

- `ingest`: Accepts an upload, writes `documents`, ensures Markdown exists (Docling conversion if needed), and ingests Markdown into `blocks`.
- `conversion-complete`: Callback endpoint invoked by the Python conversion service after it uploads Markdown back to Storage.
- `export-jsonl`: Emits JSONL for either `doc_uid` (Phase 1; inert annotation placeholder) or `run_id` (Phase 2; overlays `block_annotations`).
- `schemas`: Uploads a user-defined annotation schema JSON into `public.schemas` (Phase 2).
- `runs`: Creates an `annotation_runs` row and populates `block_annotations` for a `doc_uid` + `schema_id` (Phase 2).
- `agent-config`: Returns agent catalog + per-user agent configuration; computes readiness based on saved keys/connections (config-first).
- `provider-connections`: Stores non-key provider connections (v1: Vertex AI service account) encrypted server-side.

## Required env vars (Supabase secrets)

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DOCUMENTS_BUCKET` (default: `documents`)
- `CONVERSION_SERVICE_URL` (URL of the FastAPI service)
- `CONVERSION_SERVICE_KEY` (shared secret; used in header `X-Conversion-Service-Key`)
