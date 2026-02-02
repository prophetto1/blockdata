# Frontend architecture stress test vs backend direction + PRD v4

Date: 2026-02-02  
Candidate: `json-schemas/frontend-architecture.md` + `json-schemas/duplicate-source-uid-handling.md`  
Specs / reality sources:
- `json-schemas/prd-v4.md` (PRD v4)
- `json-schemas/complete/ddl-plan.md` (DDL plan)
- Supabase DB (current): `public.documents`, `public.blocks`, RLS policies, pg_cron TTL job
- Edge Functions (current): `supabase/functions/ingest`, `supabase/functions/conversion-complete`, `supabase/functions/export-jsonl`

## 1) System requirements list (SRL)

### SRL-1: Identity model (Phase 1)

- `source_uid = sha256(source_type + "\n" + raw_source_bytes)` and is available at upload time.
- `md_uid = sha256(raw_markdown_bytes)` (immediate for `.md`, post-conversion for non-md).
- `doc_uid = sha256(immutable_schema_ref + "\n" + md_uid)` (depends on `md_uid`).
- `block_uid = sha256(doc_uid + ":" + block_index)`.

### SRL-2: Lifecycle model (Phase 1)

- For `.md`: one request can compute `source_uid`, `md_uid`, `doc_uid`, ingest blocks, and mark status `ingested`.
- For non-md: create a row with `status='converting'`, `conversion_job_id`, `md_uid=NULL`, `doc_uid=NULL`; conversion callback verifies `conversion_job_id`, computes `md_uid/doc_uid`, ingests blocks, then marks `ingested` (or `conversion_failed` / `ingest_failed`).
- Stale conversions must resolve via a TTL job (`pg_cron`) that marks old `converting` rows as `conversion_failed`.

### SRL-3: Security boundary

- Client reads via RLS and does not write to tables directly.
- Edge Functions own all writes (service-role).
- Conversion service touches Storage only via signed URLs and authenticates via shared secret.

### SRL-4: Required Phase 1 UI operations

- Upload a file + `immutable_schema_ref` + optional `doc_title` to start ingest.
- Poll conversion/ingest status using `source_uid` (until `doc_uid` exists).
- Fetch block inventory using `doc_uid` once ingested.
- Export JSONL (Phase 1: inert `annotation` placeholder).

### SRL-5: Phase 2 (planned) data model

- `schemas(schema_ref)` (user-defined annotation schema)
- `annotation_runs(run_id, doc_uid, schema_ref, status, total/completed/failed…)`
- `block_annotations(run_id, block_uid, status, annotation_jsonb, …)` with Realtime updates scoped by `run_id`

## 2) What currently exists (backend reality snapshot)

### DB schema + policies (current Supabase)

- `public.documents`
  - PK: `source_uid`
  - UNIQUE: `md_uid`, `doc_uid`
  - CHECKs for sha256 hex, status set, and `doc_uid -> md_uid` dependency.
- `public.blocks`
  - PK: `block_uid`
  - FK: `doc_uid -> documents(doc_uid)`
  - UNIQUE: `(doc_uid, block_index)`
- RLS is enabled and read policies exist:
  - `documents_select_own`: `owner_id = auth.uid()`
  - `blocks_select_own`: block is readable if owning document has `owner_id = auth.uid()`
- TTL job exists (pg_cron): marks stale `converting` rows as `conversion_failed` after 5 minutes.
- `documents.updated_at` trigger exists.

### Edge Functions (current)

- `POST /functions/v1/ingest`
  - Accepts multipart form: `file`, `immutable_schema_ref`, `doc_title` (optional).
  - Writes to Storage and to Postgres.
  - For `.md`: returns `{ source_uid, doc_uid, status: 'ingested', blocks_count }`.
  - For non-md: returns `202` with `{ source_uid, doc_uid: null, status: 'converting' }` and triggers conversion.
- `POST /functions/v1/conversion-complete`
  - Auth: `X-Conversion-Service-Key`.
  - Verifies `conversion_job_id` matches the row.
  - Computes `md_uid/doc_uid`, ingests blocks, sets `ingested` or failure status.
- `GET /functions/v1/export-jsonl?doc_uid=...`
  - Reads `documents` + `blocks` using the user token and emits NDJSON with inert annotation placeholder.

## 3) Alignment: frontend design vs SRL / backend reality

### 3.1 Good alignment

- The frontend’s mental model of Phase 1 vs Phase 2 is consistent with the PRD:
  - Phase 1 shows immutable blocks only; annotations are an overlay concept.
  - Phase 2 overlays per-run annotations and can subscribe via Realtime on `block_annotations`.
- The proposed component split is compatible with a Postgres/RLS backend (BlockViewer is “immutable-only”, AnnotationPanel injects overlays).
- Export menu concept matches: “JSONL (Phase 1) — immutable blocks only”.

### 3.2 Gaps / mismatches (highest impact first)

#### Gap A: Duplicate `source_uid` handling is not valid in a multi-user world (with current schema + RLS)

`duplicate-source-uid-handling.md` proposes:
1) client computes `source_uid`
2) `GET /documents?source_uid={hash}`
3) if exists, redirect and skip upload

This only works if the uploading user can *see* the existing `documents` row.

With current schema + policies:
- `documents.source_uid` is the PK (global per project).
- RLS only allows reading rows where `owner_id = auth.uid()`.

Therefore:
- If user B uploads bytes already uploaded by user A, user B cannot see the row via RLS pre-check, but the insert will still fail on the PK.
- Result: “invisible conflict” (frontend sees “doesn’t exist”, backend rejects anyway).

This is the single biggest frontend/backend mismatch because it is a data-model decision, not a UI choice.

#### Gap B: Duplicate upload by the *same* user still fails today unless the frontend pre-check runs

Current `/ingest` always tries:
- Storage upload with `upsert: false`
- DB insert into `documents` (PK `source_uid`)

So re-uploading identical bytes can fail in two ways:
- same filename: Storage object already exists -> upload fails
- different filename: Storage upload succeeds, DB insert fails on `documents_pkey`

The frontend proposal’s pre-check prevents this, but the backend endpoint is not idempotent by itself.

#### Gap C: Status polling identifier vs routing

The frontend routes are doc-centric (`/documents/:doc_uid`), but for non-md uploads:
- `doc_uid` is **unknown until conversion completes**
- only `source_uid` is available immediately

The design needs an explicit “upload status” state keyed by `source_uid` (route or state machine), not only `doc_uid`.

#### Gap D: “GET /documents?source_uid=…” and “GET /documents/:doc_uid/blocks” are underspecified

Today, Phase 1 “read” surfaces are:
- PostgREST reads (`/rest/v1/documents`, `/rest/v1/blocks`) via RLS, and/or
- Edge Function `export-jsonl` for exports

There is no Edge Function route exactly matching:
- `GET /documents/:source_uid`
- `GET /documents/:doc_uid/blocks`

The PRD allows “or equivalent”, but the frontend doc should pick and name the contract so implementation doesn’t drift.

### 3.3 Phase 2 type alignment (minor notes)

Frontend types:
- `AnnotationRun.status: running|complete|failed|cancelled`
- `BlockAnnotation.status: pending|claimed|complete|failed`

These match the DDL plan. Column naming should be kept consistent (`annotation_jsonb` vs any future rename) to avoid churn.

## 4) Recommendations (actionable)

### R1: Decide now: single-tenant (v0) vs true multi-user

If v0 is single-tenant (one owner), then the duplicate `source_uid` UX is fine and the current schema is acceptable for Phase 1.

If you want multi-user where different users can upload the same bytes independently, the current keying strategy will block that. You need one of:
- A “source blob” table keyed by `source_uid` + a separate per-user “document instance” mapping table, or
- Make `documents` keyed per-owner (but this breaks global content-addressed dedupe as currently specified).

This decision should be reflected in both the frontend UX and the DB constraints.

### R2: Make `/ingest` idempotent for same-user duplicates (even if frontend also pre-checks)

Recommended server behavior for `(owner_id, source_uid)` already present:
- return existing `{source_uid, doc_uid, status}` (200/202 depending on status)
- never attempt a second Storage upload

This avoids “double upload” bugs and makes the API robust against UI retries.

### R3: Add an explicit Phase 1 “status page” keyed by `source_uid`

In the frontend architecture, add either:
- a route like `/uploads/:source_uid` (or `/documents-by-source/:source_uid`) which polls `documents` by `source_uid`, then redirects to `/documents/:doc_uid` once available, or
- a documented state machine that the Upload page holds until `doc_uid` is non-null.

### R4: Pick the read API contract and document it as the canonical one

Option A (lowest work): PostgREST reads via RLS:
- `documents` lookup by `source_uid` and/or `doc_uid`
- `blocks` query by `doc_uid` ordered by `block_index`

Option B (explicit API): add read-only Edge Functions for:
- `GET /documents/:source_uid`
- `GET /documents/:doc_uid/blocks`

Either is fine; the key is to choose one and align the docs/types to it.

### R5: Update duplicate-source doc to reflect owner scoping

At minimum, rewrite the “GET /documents?source_uid={hash}” step as:
- “Query `documents` for the current user’s rows only (RLS-scoped).”

Otherwise it reads like a global lookup, which is not what the current policies allow.

## 5) Concrete backend questions the frontend should force-clarify

1) Is this Phase 1 app single-user only (one owner), or multi-user from day one?
2) If multi-user: what is the intended behavior when two users upload identical bytes?
3) For non-md uploads, what should happen if conversion outputs Markdown that would dedupe to an existing `md_uid/doc_uid`?
4) Are we committing to PostgREST reads via RLS as the public read API, or will we expose read-only Edge Functions?

