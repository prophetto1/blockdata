# Supabase Edge Functions (Phase 1 + Phase 2 scaffolding)

This folder contains Supabase Edge Functions for the Phase 1 immutable ingest
pipeline, plus Phase 2 scaffolding (schema upload + run creation +
export-by-run).

## Functions

- `ingest`: Accepts an upload, writes `documents`, ensures Markdown exists
  (Docling conversion if needed), and ingests Markdown into `blocks`.
- `conversion-complete`: Callback endpoint invoked by the Python conversion
  service after it uploads Markdown back to Storage.
- `export-jsonl`: Emits JSONL for either `doc_uid` (Phase 1; inert annotation
  placeholder) or `run_id` (Phase 2; overlays `block_annotations`).
- `schemas`: Uploads User Schema JSON (structured schema object) into
  `public.schemas` (Phase 2). See `docs/specs/user-schema-json-contract.md`.
- `runs`: Creates an `annotation_runs` row and populates `block_annotations` for
  a `doc_uid` + `schema_id` (Phase 2).
- `agent-config`: Returns agent catalog + per-user agent configuration; computes
  readiness based on saved keys/connections (config-first).
- `provider-connections`: Stores non-key provider connections (v1: Vertex AI
  service account) encrypted server-side.
- `track-b-runs`: Creates Track B (`unstructured_oss`) workflow runs with
  required idempotency semantics and subset document selection.
- `track-b-worker`: Internal Track B worker endpoint that claims queued Track B
  runs, advances doc/run states (`indexing -> downloading -> partitioning ->
  chunking -> enriching -> persisting -> success`), and persists Track B
  artifacts/outputs (`partition`, `chunk`, `embed`, `preview`, `persist` step
  artifacts).

## Required env vars (Supabase secrets)

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DOCUMENTS_BUCKET` (default: `documents`)
- `CONVERSION_SERVICE_URL` (URL of the FastAPI service)
- `CONVERSION_SERVICE_KEY` (shared secret; used in header
  `X-Conversion-Service-Key`)
- `TRACK_B_WORKER_KEY` (shared secret; used by `track-b-worker` in header
  `X-Track-B-Worker-Key`)
- `TRACK_B_CHUNK_MAX_CHARS` (optional; default `1200`, bounded to `200..8000`)
- `TRACK_B_EMBED_DIMENSIONS` (optional; default `8`, bounded to `4..256`)
- `TRACK_B_PARTITION_TIMEOUT_MS` (optional; default `60000`, bounded to `1000..300000`)
- `UNSTRUCTURED_TRACK_SERVICE_URL` (optional; if set, `track-b-worker` requests
  `POST /general/v0/general` (multipart) from this service, with fallback to
  `POST /partition`)
- `TRACK_B_SERVICE_KEY` (optional; forwarded by `track-b-worker` to service as
  `X-Track-B-Service-Key` when set)
- `UNSTRUCTURED_API_KEY` (optional for Track B worker; used as
  `unstructured-api-key` when calling `POST /general/v0/general`)

Track B partition service contract currently expects Unstructured-style elements
(`type`, `element_id`, `text`, `metadata`) and uses explicit
`partition_parameters` in worker requests (`coordinates`, `strategy`,
`output_format`, `unique_element_ids`, `chunking_strategy`).

Track B worker observability emits `unstructured_state_events_v2` detail payloads:
- `event = "doc_observability"` with per-step latency, artifact count, and backend
- `event = "doc_failure_observability"` with failed step + reason
- `event = "run_observability"` with doc success/failure counts and step failure totals

## JWT mode

Edge Functions in this repo are intended to run with Supabase gateway JWT
verification disabled (`verify_jwt = false`). When deploying, pass
`--no-verify-jwt` explicitly (do not rely on `config.toml`; it can be ignored
depending on deploy mode).

Each function enforces auth internally as needed (`requireUserId`, superuser
checks, or conversion-service shared secret), which avoids Supabase gateway JWT
verification drift across projects.
