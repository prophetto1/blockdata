# Doc 4 — Supabase Core Pipeline + Database (Implementation Status, As-Is)

Purpose: describe what exists now: what is deployed/working, how to verify it, and known limitations.

No future requirements belong here.

---

## Repo State (What Exists)

Migrations present:
- `supabase/migrations/20260202102234_001_phase1_immutable_documents_blocks.sql`
- `supabase/migrations/20260202120000_002_phase2_schemas_runs_block_annotations.sql`

Edge Functions present:
- `supabase/functions/ingest`
- `supabase/functions/conversion-complete`
- `supabase/functions/export-jsonl`
- `supabase/functions/schemas`
- `supabase/functions/runs`

---

## What Is Verified (Recorded)

See `changelog.jsonl` for recorded milestones/decisions including:
- Phase 1 ingest + export smoke test passing for `.md`
- Phase 2 scaffolding tables/functions deployed

---

## How to Verify (Local / Operator)

- Use existing smoke test scripts under `scripts/` (names may vary by scenario).
- For non-md end-to-end: ensure conversion service URL + secret are set in Supabase Edge Function secrets, then upload `.txt/.docx/.pdf` and observe `documents.status` transitions.

---

## Known Constraints

- Client writes are not allowed; writes occur via Edge Functions.
- Reads are owner-scoped via RLS.

