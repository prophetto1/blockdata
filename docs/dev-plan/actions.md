# Actions - Build Plan (PRD v4 aligned)

Canonical build plan derived from:
- `json-schemas/prd-v4.md` (requirements)
- `json-schemas/ddl-plan.md` (DDL plan pointer)
- `json-schemas/complete/ddl-plan.md` (DDL plan content)

This file is the source of truth for implementation status. The PRD is the source of truth for product behavior.

Current Supabase project:
- `SUPABASE_URL=https://dbdzzhshmigewyprahej.supabase.co`

## Phase 1 - Immutable end-to-end

Goal: upload -> (convert to Markdown if needed) -> deterministic blocks in Postgres -> JSONL export with inert annotation placeholder.

### Database + RLS

- [x] `public.documents` exists with: `owner_id`, `source_uid`, `doc_uid`, `md_uid`, `source_type`, locators, `immutable_schema_ref`, `conversion_job_id`, `status`, `error`, timestamps
- [x] `public.blocks` exists with: `doc_uid`, `block_uid`, `block_index`, `block_type`, `section_path`, `char_span`, `content_original`
- [x] RLS enabled on `documents` + `blocks` (reads should be user-scoped; writes only via Edge Functions)
- [x] Schema under migration control (repo)
  - Migration files live in `supabase/migrations/` (Phase 1 + Phase 2).
  - Still TODO: verify a fresh Supabase project can be created from migrations only and produces identical tables/constraints/policies.

### Storage

- [x] Storage bucket: `documents` (private)
- [x] Path conventions (current):
  - `uploads/{source_uid}/{filename}`
  - `converted/{source_uid}/{name}.md`

### Edge Functions (Deno/TypeScript)

- [x] `POST /functions/v1/ingest`
  - Handles `.md` directly.
  - For non-md: creates `documents` row, sets `converting`, calls conversion service with signed Storage URLs, waits for `/conversion-complete`.
- [x] `POST /functions/v1/conversion-complete`
  - Validates `source_uid` + `conversion_job_id`, reads converted Markdown from Storage, computes `md_uid` + `doc_uid`, writes blocks, sets `ingested` or `ingest_failed`.
- [x] `GET /functions/v1/export-jsonl`
  - Emits Phase 1 JSONL (annotation placeholder is inert: `schema_ref=null`, `data={}`).
- [ ] JWT gateway hardening
  - Current state: functions are deployed with `verify_jwt=false` (function code still validates user JWT).
  - Done when: decision recorded and deployment matches it (typically `verify_jwt=true` for user-facing endpoints).

### Read APIs for Phase 1 UI (choose one)

- [ ] Option A (recommended): use PostgREST reads via RLS (no extra functions)
  - `documents` by `source_uid` (status + `doc_uid`)
  - `blocks` by `doc_uid` ordered by `block_index`
  - Done when: frontend can read these with user JWT only.
- [ ] Option B: implement read-only Edge Functions
  - `GET /documents/:source_uid`
  - `GET /documents/:doc_uid/blocks`

### Conversion service (FastAPI)

- [x] Conversion service code exists: `services/conversion-service` (FastAPI + Docling)
- [ ] Deploy conversion service
  - Done when: non-md ingest completes end-to-end (upload -> converting -> conversion-complete -> ingested -> export-jsonl works).

### Minimal UI (Next.js)

- [ ] Upload page (file + `immutable_schema_ref` + `doc_title`)
- [ ] Status/progress page (poll `documents.status` by `source_uid`)
- [ ] Block preview page (list blocks)
- [ ] Export button (downloads JSONL)

### Smoke test

- [x] Smoke test script exists: `scripts/smoke-test.ps1`
- [x] Manual smoke test succeeded for `.md` ingest + export (1 document, 216 blocks) on 2026-02-02.

## Phase 2 - Multi-schema annotation (planned)

Requirement: one document can be annotated under multiple user-defined schemas without overwriting immutable data.

- [x] DDL: `schemas`, `annotation_runs`, `block_annotations`
- [x] End-user schema upload (required):
  - Store user-provided annotation schemas in `schemas`.
  - Schema is reusable across many documents/runs (schema is not per-document).
  - Minimum behavior: authenticated user can upload schema JSON and receive a stable `schema_ref`.
  - Recommended: add `schema_uid` (sha256 of canonicalized schema JSON) for versioning/immutability.

Schema file location (repo convenience only):

- Example user-defined schemas live under `json-schemas/user-defined/`.
- [x] Edge Functions (Phase 2 scaffolding):
  - `POST /schemas` (upload + validate + store; returns `schema_id`, `schema_ref`, `schema_uid`)
  - `POST /runs` (start run: creates `annotation_runs` + populates `block_annotations` via RPC)
  - `GET /export-jsonl?run_id=...` (export annotated JSONL by run)
- [ ] Worker protocol (later):
  - `POST /runs/:run_id/claim` + `POST /runs/:run_id/complete`
- [ ] Realtime subscriptions on `block_annotations` updates
- [ ] Worker loop (claim -> LLM -> complete)

Export requirement (Phase 2):

- Each JSONL record includes `annotation.schema_ref`, `annotation.schema_uid`, and `annotation.data`.

## Smoke tests

- [x] Phase 1: `.md` ingest + export works (`scripts/smoke-test.ps1`)
- [ ] Phase 2 scaffolding: schema upload + run create + export-by-run (`scripts/smoke-test-schema-run.ps1`)

## Notes

- Prefer ASCII punctuation in docs (e.g., `->`, `-`) to avoid mojibake in Windows PowerShell file reads, or save Markdown as UTF-8 with BOM.
