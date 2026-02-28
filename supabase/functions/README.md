# Supabase Edge Functions

Edge functions for the BlockData ingest pipeline, schema management, run
execution, and export.

## Functions

- `ingest`: Accepts an upload. Default mode performs conversion/ingest. Optional
  multipart field `ingest_mode=upload_only` stores only `source_documents`
  (`status='uploaded'`) so parsing can be started explicitly later.
- `conversion-complete`: Callback endpoint invoked by the Python conversion
  service after it uploads Markdown back to Storage.
- `dbt-projects`: Registers a dbt project bundle (zip) for a project (control-plane only).
- `dbt-runs`: Creates/polls dbt runs and proxies artifacts/events; dispatches execution to the Python dbt service.
- `export-jsonl`: Emits JSONL for a `run_id`, joining `blocks` + `block_overlays`
  into the canonical two-key export format.
- `schemas`: CRUD for user-defined extraction schemas in `public.schemas`.
- `runs`: Creates a `runs` row and populates `block_overlays` (one per block)
  for a `conv_uid` + `schema_id`.
- `worker`: Claims pending `block_overlays`, calls the LLM, writes structured
  output back to the overlay.
- `user-api-keys`: Encrypted storage for per-user provider API keys.
- `admin-config`: Superuser-only admin runtime policy management.
- `admin-integration-catalog`: Superuser-only integration catalog sync and mapping management (Kestra-compatible).
- `agent-config`: Returns agent catalog + per-user agent configuration; computes
  readiness based on saved keys/connections (config-first).
- `provider-connections`: Stores non-key provider connections (v1: Vertex AI
  service account) encrypted server-side.

## Required env vars (Supabase secrets)

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DOCUMENTS_BUCKET` (default: `documents`)
- `DBT_BUCKET` (default: `dbt`)
- `CONVERSION_SERVICE_URL` (URL of the FastAPI service)
- `CONVERSION_SERVICE_KEY` (shared secret; used in header
  `X-Conversion-Service-Key`)
- `DBT_SERVICE_URL` (URL of the dbt-runner service)
- `DBT_SERVICE_KEY` (shared secret; used in header `X-DBT-Service-Key`)

## JWT mode

Edge Functions in this repo are intended to run with Supabase gateway JWT
verification disabled (`verify_jwt = false`). When deploying, pass
`--no-verify-jwt` explicitly (do not rely on `config.toml`; it can be ignored
depending on deploy mode).

Each function enforces auth internally as needed (`requireUserId`, superuser
checks, or conversion-service shared secret), which avoids Supabase gateway JWT
verification drift across projects.
