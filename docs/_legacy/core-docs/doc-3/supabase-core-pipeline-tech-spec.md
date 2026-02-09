# Doc 3 — Supabase Core Pipeline + Database (Technical Spec, Present-Oriented)

Purpose: guide development from the **current** system state for the Supabase-backed core pipeline: ingest → deterministic blocks → export JSONL, plus Phase 2 scaffolding (schemas/runs/overlays).

Non-goal: describe the final product vision (Doc 1/2).

---

## Components in Scope

- Supabase Postgres schema (Phase 1 + Phase 2 scaffolding)
- Supabase Storage artifact layout (uploads + converted markdown)
- Supabase Edge Functions as the only write/orchestration surface
- Conversion callback contract into `/conversion-complete`
- JSONL export shape and assembly rules

---

## Storage Artifacts (Canonical Paths)

All objects live in the private bucket (default name: `documents`).

- Original upload bytes:
  - `uploads/{source_uid}/{original_filename}`
- Canonical Markdown bytes:
  - For `.md` uploads: same as source (`md_locator == source_locator`)
  - For non-md uploads: `converted/{source_uid}/{basename}.md`
- Optional debug artifact (if present): `converted/{source_uid}/{basename}.docling.json`

The canonical Markdown bytes at `md_locator` are the substrate used for parsing and for `char_span` offsets.

---

## Identity Model (Deterministic Hashes)

All hashes are SHA-256 hex (64 lowercase hex chars):

- `source_uid = sha256(source_type + \"\\n\" + raw_source_bytes)`
- `md_uid     = sha256(raw_markdown_bytes)`
- `doc_uid    = sha256(immutable_schema_ref + \"\\n\" + md_uid)`
- `block_uid  = sha256(doc_uid + \":\" + block_index)`

Rules:
- `source_uid` anchors the lifecycle row (upload + conversion).
- `doc_uid` anchors block inventory and all downstream operations.
- `block_uid` is the universal join key for overlays/exports.

---

## Database Contract (Tables + Invariants)

Phase 1:
- `documents` is anchored by `source_uid` and includes `owner_id`, locators, `md_uid`, `doc_uid`, lifecycle fields, and `conversion_job_id`.
- `blocks` is immutable-only; rows reference `documents.doc_uid`; `(doc_uid, block_index)` is unique; `char_span` is `[start,end]`.

Phase 2 scaffolding:
- `schemas` stores user-defined schema JSONB with per-owner uniqueness.
- `annotation_runs` binds a document (`doc_uid`) to a schema (`schema_id`) for a run, and tracks progress counters.
- `block_annotations` stores per-run per-block overlays keyed by `(run_id, block_uid)` with claim/progress fields.

RLS:
- Client reads are owner-scoped (authenticated users).
- Client writes are not permitted; Edge Functions perform writes with service role.

---

## Edge Functions (Public App Surface)

These are the orchestration endpoints the frontend and scripts rely on:

- `POST /functions/v1/ingest`
  - multipart form fields: `file`, `immutable_schema_ref`, `doc_title`
  - writes `documents`, ensures canonical Markdown exists, ingests into `blocks`
- `POST /functions/v1/conversion-complete`
  - internal callback from conversion service (shared secret header)
  - verifies `source_uid` + `conversion_job_id`, reads markdown, computes `md_uid`/`doc_uid`, writes blocks, sets status
- `POST /functions/v1/schemas` (Phase 2 scaffolding)
  - uploads schema JSON and returns `schema_id` + `schema_ref` + `schema_uid`
- `POST /functions/v1/runs` (Phase 2 scaffolding)
  - JSON body: `{ doc_uid, schema_id }`
  - creates `annotation_runs` + populates `block_annotations`
- `GET /functions/v1/export-jsonl`
  - `?doc_uid=...` emits Phase 1 export (inert annotation placeholder)
  - `?run_id=...` emits Phase 2 export (overlays per-block `annotation_jsonb`)

Auth:
- Requests should include `Authorization: Bearer <access_token>` and `apikey: <anon_key>`.

---

## Export Rules (JSONL)

Export is assembled by querying `documents` + `blocks` ordered by `block_index`.

Phase 1:
- `annotation.schema_ref = null`
- `annotation.schema_uid = null`
- `annotation.data = {}`

Phase 2:
- export keyed by `run_id`
- overlay comes from `block_annotations.annotation_jsonb` for `(run_id, block_uid)`
- `annotation.schema_ref` and `annotation.schema_uid` are sourced from the run’s schema

Export must not mutate the database.

---

## Implementation Next Steps (This Component)

1) Ensure end-to-end non-md ingest works reliably (Cloud Run conversion → callback → blocks inserted).
2) Add a single “Edge Functions Tech Spec” appendix if request/response shapes need to be frozen for frontend work.
3) Decide whether to add a dedicated status doc for Supabase deployment (migrations applied + functions deployed + secrets present).

