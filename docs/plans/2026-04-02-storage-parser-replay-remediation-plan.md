# 2026-04-02 Storage Parser Replay Remediation Plan

## Goal

Restore a fully replayable local Supabase migration chain for the storage/parser surface so the approved closeout plan in `docs/plans/2026-04-02-storage-namespace-remediation-and-linked-db-closure-plan.md` can resume at Task 3 and complete without rewriting existing migration history.

## Status

Draft

## Source Inputs

- `docs/plans/2026-04-02-storage-namespace-remediation-and-linked-db-closure-plan.md`
- `docs/plans/2026-04-02-storage-namespace-separation-and-gcs-access-correction-plan.md`
- local replay failure on 2026-04-02 in the clean worktree: `npx supabase db start` / `npx supabase db reset`
- current migration chain in `supabase/migrations`

## Architecture

The replay blocker is not in the storage namespace migrations themselves. It is a missing parser-era compatibility surface in the replayable migration history.

The corrective direction is:

1. Keep all existing migrations immutable.
2. Add one additive backdated bootstrap migration that sorts before `20260220194000_040_storage_documents_preview_select_policy.sql`.
3. In that bootstrap, create the missing parser-era physical tables and compatibility columns that later migrations assume already exist.
4. Make the bootstrap idempotent so it is safe on the linked database, which already appears to have the parser-era tables.
5. Extend the schema-contract test so replay proves both:
   - the parser-era bootstrap surface exists
   - the later storage namespace surface still exists

This is a replay-remediation prerequisite, not a redesign of storage runtime behavior.

## Verified Current State

### Clean worktree evidence

- A clean storage-scoped worktree exists at `E:\\writing-system-storage-closeout` on branch `codex/storage-namespace-closeout`.
- `cd web && npm run build` succeeds in that clean worktree after dependency install.

### Replay failure evidence

- `npx supabase db start` begins local replay in the clean worktree and fails during `20260220194000_040_storage_documents_preview_select_policy.sql`.
- The concrete failure is:
  - `ERROR: relation "public.source_documents" does not exist (SQLSTATE 42P01)`
- That means the current migration chain is not replayable from scratch before the storage namespace closeout can even validate its own SQL.

### Migration-history gap evidence

- No migration in `supabase/migrations` creates `public.source_documents`.
- No migration in `supabase/migrations` creates `public.conversion_parsing`.
- No migration in `supabase/migrations` creates `public.conversion_representations`.
- No migration in `supabase/migrations` creates `public.runs`.
- No migration in `supabase/migrations` creates `public.block_overlays`.

### Schema-shape mismatch evidence

- Early replayable history creates:
  - `public.documents`
  - `public.blocks`
  - `public.documents_v2`
  - `public.blocks_v2`
  - `public.runs_v2`
  - `public.block_overlays_v2`
  - `public.conversion_representations_v2`
- Later storage/parser migrations assume unversioned parser-era relations:
  - `public.source_documents`
  - `public.conversion_parsing`
  - `public.conversion_representations`
  - `public.runs`
  - `public.block_overlays`
- Later parser RPCs and cleanup SQL also assume `public.blocks` can be filtered by `conv_uid`, which is not part of the earliest replayed `public.blocks` contract.

### Execution consequence

- The approved closeout plan is correctly blocked at Task 3.
- The new `services/platform-api/tests/test_storage_namespace_schema_contract.py` file can remain, but it cannot be verified until the replayable parser/storage base schema exists.

## Pre-Implementation Contract

- Do not edit or rename any existing migration file, including:
  - `20260402193000_storage_namespace_metadata_foundation.sql`
  - `20260402194000_pipeline_source_registry_and_fk_migration.sql`
  - `20260402195000_storage_namespace_backfill_and_source_document_reconciliation.sql`
- Do not use migration repair to pretend the missing parser-era schema exists locally.
- Do not change runtime storage or pipeline API behavior in `services/platform-api/app` or `web/src` as part of this remediation.
- Do not downscope the fix to only `public.source_documents`; the plan must cover the whole parser-era compatibility surface that later migrations reference.
- If authoritative linked-db DDL conflicts with the assumptions in this plan, stop and revise the plan before writing SQL.

## Locked Product Decisions

1. This remediation exists only to make the historical SQL chain replayable and to unblock the storage namespace closeout.
2. The fix is additive. Existing migrations remain immutable.
3. The new bootstrap migration must sort before `20260220194000_040_storage_documents_preview_select_policy.sql`.
4. The new bootstrap migration must be idempotent on the linked database because those parser-era tables already appear to exist there.
5. The bootstrap migration must create physical tables and compatibility columns, not views or ad hoc repair scripts.
6. The parser-era bootstrap surface is:
   - `public.source_documents`
   - `public.conversion_parsing`
   - `public.conversion_representations`
   - `public.runs`
   - `public.block_overlays`
   - parser-era compatibility columns on `public.blocks` required by later migrations
7. The linked database remains the source of truth for the exact parser-era table DDL that must be mirrored idempotently in the bootstrap migration.
8. After this remediation lands, the approved closeout plan resumes unchanged from Task 3.

## Locked Acceptance Contract

The replay remediation is only complete when all of the following are true:

1. `npx supabase db start` succeeds locally in the clean worktree.
2. `npx supabase db reset --yes` replays the full migration chain with no failure before or during the storage namespace migrations.
3. `npx supabase migration list --local` shows the new bootstrap migration applied ahead of the parser/storage chain.
4. `cd services/platform-api && pytest -q tests/test_storage_namespace_schema_contract.py` passes against the locally reset database.
5. The targeted backend storage namespace suite passes against the locally reset database.
6. `supabase db push` applies the new bootstrap migration to the linked project with no destructive drift.
7. The blocked closeout plan can then resume at Task 3 without another replay blocker.

## Locked Platform API Surface

No platform API endpoints are added, removed, or changed in this remediation.

## Locked Observability Surface

No traces, metrics, or structured logs are added in this remediation.

The zero case is intentional because this work is replayable schema repair, not runtime feature expansion.

## Database Migrations

### New migration 1

- File: `supabase/migrations/20260220193000_storage_parser_compat_bootstrap.sql`
- Schema effect:
  - create `public.source_documents` if absent using linked-db-authoritative parser-era contract
  - create `public.conversion_parsing` if absent using linked-db-authoritative parser-era contract
  - create `public.conversion_representations` if absent using linked-db-authoritative parser-era contract
  - create `public.runs` if absent using linked-db-authoritative parser-era contract
  - create `public.block_overlays` if absent using linked-db-authoritative parser-era contract
  - add parser-era compatibility columns and supporting indexes/constraints to `public.blocks` if absent
  - add any grants/RLS/policies that the later parser/storage migrations assume already exist
- Data impact:
  - local replay path: tables start empty and satisfy downstream migration dependencies
  - linked-db path: idempotent no-op or additive-only column/index/constraint reconciliation

No second migration is planned in this remediation. The bootstrap file must be comprehensive enough to satisfy all later parser/storage dependencies in one additive step.

## Edge Functions

No edge function changes.

## Frontend Surface Area

No frontend runtime or component changes.

## Locked Inventory Counts

### Backend

- New migration files: `1`
- Modified backend test files: `1`
- Modified runtime backend files: `0`

### Frontend

- Modified frontend files: `0`

### Docs

- New plan files: `1`
- Modified verification docs: `1`

## Locked File Inventory

### New files

- `supabase/migrations/20260220193000_storage_parser_compat_bootstrap.sql`

### Modified files

- `services/platform-api/tests/test_storage_namespace_schema_contract.py`
- `docs/plans/2026-04-02-storage-namespace-closure-verification-report.md`

## Task Breakdown

## Task 1: Capture authoritative parser-era DDL from the linked database

**File(s):** `docs/plans/2026-04-02-storage-namespace-closure-verification-report.md`

**Step 1:** Dump the linked public schema or inspect the linked database catalog for:
- `source_documents`
- `conversion_parsing`
- `conversion_representations`
- `runs`
- `block_overlays`
- `blocks`

**Step 2:** Record the exact columns, foreign keys, checks, indexes, and policies needed by the later parser/storage migrations.
**Step 3:** Compare the linked contract to the assumptions in the current migration chain.
**Step 4:** If the linked schema materially differs from the contract implied here, stop and revise the plan before writing the bootstrap SQL.

**Test command:** `cd supabase && npx supabase db dump --linked --schema public --file .temp/parser-storage-linked-schema.sql`
**Expected output:** a linked-db schema artifact that exposes the authoritative parser-era DDL needed for the bootstrap migration.

**Commit:** `docs(storage): capture parser replay blocker schema evidence`

## Task 2: Add the additive parser compatibility bootstrap migration

**File(s):** `supabase/migrations/20260220193000_storage_parser_compat_bootstrap.sql`

**Step 1:** Create the bootstrap migration with `IF NOT EXISTS` and equivalent idempotent guards so it is safe on the linked database.
**Step 2:** Define the physical parser-era tables the later migrations require:
- `source_documents`
- `conversion_parsing`
- `conversion_representations`
- `runs`
- `block_overlays`

**Step 3:** Add the parser-era compatibility columns to `public.blocks` that later cleanup SQL expects, including `conv_uid` when absent.
**Step 4:** Add any required indexes, foreign keys, checks, grants, and policies that later migrations assume already exist.
**Step 5:** Do not backfill or rewrite data in existing immutable tables beyond harmless null-safe compatibility initialization.

**Test command:** `cd supabase && npx supabase db reset --yes`
**Expected output:** replay proceeds past migrations `040`, `079`, `080`, `081`, `082`, and the storage namespace chain.

**Commit:** `fix(supabase): add parser compatibility bootstrap for replay`

## Task 3: Extend the schema-contract test to cover replay prerequisites

**File(s):** `services/platform-api/tests/test_storage_namespace_schema_contract.py`

**Step 1:** Extend the schema-contract test so it asserts the bootstrap relations and compatibility columns exist in the dumped post-reset schema.
**Step 2:** Keep the existing storage namespace assertions intact.
**Step 3:** Fail explicitly if the replayed schema still lacks any parser-era prerequisite relation.

**Test command:** `cd services/platform-api && pytest -q tests/test_storage_namespace_schema_contract.py`
**Expected output:** `1 passed`

**Commit:** `test(storage): extend schema contract for parser replay bootstrap`

## Task 4: Re-run local replay and targeted backend verification

**File(s):** `docs/plans/2026-04-02-storage-namespace-closure-verification-report.md`

**Step 1:** Start the local Supabase environment.
**Step 2:** Replay the full migration chain with `npx supabase db reset --yes`.
**Step 3:** Capture `npx supabase migration list --local`.
**Step 4:** Run:
- `pytest -q tests/test_storage_namespace_schema_contract.py`
- `pytest -q tests/test_storage_routes.py tests/test_storage_source_documents.py tests/test_storage_download_url.py tests/test_pipelines_routes.py tests/test_pipeline_source_sets_service.py tests/test_pipeline_source_library.py`

**Step 5:** Record the replay and test evidence in the verification report.
**Step 6:** If replay still fails, stop and use systematic debugging again before changing SQL.

**Test command:** `cd supabase && npx supabase db start && npx supabase db reset --yes && npx supabase migration list --local && cd ../services/platform-api && pytest -q tests/test_storage_namespace_schema_contract.py tests/test_storage_routes.py tests/test_storage_source_documents.py tests/test_storage_download_url.py tests/test_pipelines_routes.py tests/test_pipeline_source_sets_service.py tests/test_pipeline_source_library.py`
**Expected output:** local reset succeeds and the targeted backend suite passes.

**Commit:** `docs(storage): record replay remediation verification`

## Task 5: Apply the bootstrap migration to the linked database

**File(s):** `docs/plans/2026-04-02-storage-namespace-closure-verification-report.md`

**Step 1:** Capture linked migration state before apply.
**Step 2:** Run `npx supabase db push` against the linked project.
**Step 3:** Capture linked migration state after apply.
**Step 4:** Record before/after state in the verification report.
**Step 5:** If the push fails, stop and debug the linked migration application path before resuming the closeout plan.

**Test command:** `cd supabase && npx supabase link --project-ref $SUPABASE_PROJECT_ID && npx supabase migration list && npx supabase db push && npx supabase migration list`
**Expected output:** the linked project shows `20260220193000_storage_parser_compat_bootstrap.sql` applied with no pending replay-remediation migration.

**Commit:** `docs(storage): record linked parser bootstrap application`

## Task 6: Resume the blocked closeout plan from Task 3

**File(s):** `docs/plans/2026-04-02-storage-namespace-remediation-and-linked-db-closure-plan.md`, `docs/plans/2026-04-02-storage-namespace-closure-verification-report.md`

**Step 1:** Resume the approved closeout plan from Task 3.
**Step 2:** Re-run the local replay, linked-db apply, CORS application, manual acceptance, and re-evaluation steps in that plan.
**Step 3:** Do not call the storage namespace implementation complete until the closeout plan itself reaches its approval-grade verdict.

**Test command:** `resume execution of docs/plans/2026-04-02-storage-namespace-remediation-and-linked-db-closure-plan.md from Task 3`
**Expected output:** the closeout plan no longer fails on local migration replay and can finish normally.

**Commit:** `docs(storage): resume namespace closeout after replay remediation`

## Explicit Risks

1. The linked parser-era schema may contain columns or policies not visible from runtime code alone; that is why Task 1 is mandatory.
2. Backdated additive migrations can be applied later to the linked database only if they are strictly idempotent.
3. The replay blocker may expose additional missing parser-era assumptions after the first bootstrap lands; if so, that is a new debugging cycle, not permission to rewrite historical files.

## Completion Criteria

The work is complete only when all of the following are true:

1. The new additive bootstrap migration exists and is idempotent.
2. The local Supabase migration chain replays from scratch with no parser/storage dependency failures.
3. The schema-contract test proves both parser-era replay prerequisites and storage namespace schema requirements.
4. The targeted backend storage namespace suite passes against the reset local database.
5. The linked database shows the bootstrap migration applied successfully.
6. The blocked storage namespace closeout plan can then resume from Task 3 and finish under its own acceptance contract.
