# Doc 3 — Frontend (SvelteKit) (Technical Spec, Present-Oriented)

Purpose: guide development of the SvelteKit dashboard frontend against the current backend surface (Supabase Auth/RLS + Edge Functions).

Non-goal: final product vision (Doc 1/2).

---

## Environment

Browser-safe env vars:
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`

Never in the browser:
- service role keys
- conversion service secrets

---

## Auth Model

- Supabase Auth (email/password) via `@supabase/supabase-js`.
- Routes under `/app/*` require a valid session; redirect to `/login` otherwise.

---

## Required Pages / Flows (Current Surface)

Upload + ingest:
- Upload file + `immutable_schema_ref` + `doc_title`
- Call `POST /functions/v1/ingest`

Document lifecycle:
- Read `documents` under RLS to show `status`, `error`, and `doc_uid` when available.
- If `status=converting`, poll until terminal state.

Block inventory:
- Read `blocks` under RLS filtered by `doc_uid`, ordered by `block_index` (pagination/range).

Export:
- Download `GET /functions/v1/export-jsonl?doc_uid=...`
- (Phase 2 scaffolding) Download `GET /functions/v1/export-jsonl?run_id=...`

Phase 2 scaffolding:
- Upload schema (`POST /functions/v1/schemas`) and list schemas (RLS reads)
- Create run (`POST /functions/v1/runs` with `{ doc_uid, schema_id }`) and list runs (RLS reads)

---

## Error Handling

- RLS/401s: ensure both `Authorization: Bearer <token>` and `apikey: <anon_key>` are sent for Edge Functions.
- Conversion stalls: surface `documents.error` and suggest checking conversion service + secrets.

