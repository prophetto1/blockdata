# 2026-04-02 Storage Parser Replay Remediation Plan

## Goal

Document the storage-specific replay remediation that landed through the parser/storage seam, and hand off the remaining replay blocker at `20260309183000_073_normalize_flow_identity.sql` to the active upstream reconciliation plan in `docs/plans/2026-04-01-supabase-migration-reconciliation-plan.md`.

## Status

Blocked - storage-specific blockers cleared; broader post-`069` project-authority reconciliation now belongs to `docs/plans/2026-04-01-supabase-migration-reconciliation-plan.md`.

## Source Inputs

- `docs/plans/2026-04-02-storage-namespace-remediation-and-linked-db-closure-plan.md`
- `docs/plans/2026-04-02-storage-namespace-separation-and-gcs-access-correction-plan.md`
- `docs/plans/2026-04-01-supabase-migration-reconciliation-plan.md`
- local replay failure on 2026-04-02 from a clean isolated checkout: `npx supabase db start` / `npx supabase db reset`
- current migration chain in `supabase/migrations`

## Active Dependency

- Active upstream plan: `docs/plans/2026-04-01-supabase-migration-reconciliation-plan.md`
- This artifact is no longer the active completion plan for end-to-end replay.
- Tasks 3 through 6 remain blocked until the upstream plan clears `073` and any subsequent post-`069` project-authority drift.

## Architecture

This plan successfully repaired the parser/storage-specific replay seam, but it did not fully restore a replayable migration chain by itself.

The landed work under this plan is:

1. Keep the fix additive wherever replay can be repaired without touching later files.
2. Add one additive backdated bootstrap migration that sorts before `20260220194000_040_storage_documents_preview_select_policy.sql`.
3. In that bootstrap, create the missing parser-era physical tables, catalog relations, and compatibility columns that later migrations assume already exist.
4. If replay then reaches a later historical migration with SQL that PostgreSQL will not parse, allow a syntax-only repair that preserves the same schema intent and constraint names.
5. Make the bootstrap idempotent so it is safe on the linked database, which already appears to have the parser-era tables.
6. Record the next failure once replay leaves the parser/storage seam.

The remaining work is no longer owned here:

1. Replay now fails at `20260309183000_073_normalize_flow_identity.sql` because it still assumes `public.projects` exists after the `069` rename seam.
2. That broader migration-history reconciliation is now owned by `docs/plans/2026-04-01-supabase-migration-reconciliation-plan.md`.
3. This file remains as a blocked handoff artifact and storage-specific evidence trail, not as the active completion contract.

This is a landed replay-remediation prerequisite plus a blocked handoff, not the active plan for end-to-end replay completion.

## Tech Stack

- Supabase CLI
- Supabase Postgres SQL migrations
- Postgres DDL, constraints, indexes, grants, and RLS policies
- FastAPI backend test harness with `pytest`
- Node/npm repo tooling for command execution and schema dump capture

## Verified Current State

### Historical isolated-environment evidence

- At the time the replay blocker was first isolated, a temporary storage-scoped checkout existed outside the main repository.
- That temporary checkout has since been retired. Active execution for this plan now occurs from `E:\\writing-system` on local `master` only, using a clean working tree when replay or build verification requires isolation.

### Replay failure evidence

- `npx supabase db start` began local replay in the isolated verification environment and failed during `20260220194000_040_storage_documents_preview_select_policy.sql`.
- The concrete failure is:
  - `ERROR: relation "public.source_documents" does not exist (SQLSTATE 42P01)`
- That means the current migration chain is not replayable from scratch before the storage namespace closeout can even validate its own SQL.

### Migration-history gap evidence

- No migration in `supabase/migrations` creates `public.source_documents`.
- No migration in `supabase/migrations` creates `public.conversion_parsing`.
- No migration in `supabase/migrations` creates `public.conversion_representations`.
- No migration in `supabase/migrations` creates `public.runs`.
- No migration in `supabase/migrations` creates `public.block_overlays`.
- No migration in `supabase/migrations` creates `public.representation_type_catalog`.
- No migration in `supabase/migrations` creates `public.block_type_catalog`.
- No migration in `supabase/migrations` creates `public.status_document_uploads`.

### Post-bootstrap replay evidence

- After the initial bootstrap landed, `npx supabase db start` progressed past `20260220194000_040_storage_documents_preview_select_policy.sql`.
- Replay then failed during `20260221110000_041_conversion_representations_docling_exports.sql`.
- The concrete failure is:
  - `ERROR: relation "public.representation_type_catalog" does not exist (SQLSTATE 42P01)`
- Later parser/storage migrations also directly reference:
  - `public.block_type_catalog` in `20260221120000_042_docling_label_and_display_registry.sql`
  - `public.representation_type_catalog` in `20260222143000_048_citations_output_artifact.sql`
  - `public.status_document_uploads` in `20260313240000_083_rename_ingested_to_parsed.sql`
- The approved bootstrap surface therefore has to include the missing parser/storage catalog layer those migrations depend on.

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
- Later parser/storage migrations also assume supporting catalog relations:
  - `public.representation_type_catalog`
  - `public.block_type_catalog`
  - `public.status_document_uploads`
- Later parser RPCs and cleanup SQL also assume `public.blocks` can be filtered by `conv_uid`, which is not part of the earliest replayed `public.blocks` contract.

### Execution consequence

- The approved closeout plan is correctly blocked at Task 3.
- `services/platform-api/tests/test_storage_namespace_schema_contract.py` and `docs/plans/__complete/reports/2026-04-02-storage-namespace-closure-verification-report.md` are not present in current `master` and must be created by this remediation before they can carry replay evidence.

## Pre-Implementation Contract

- Do not edit or rename any existing migration file, including:
  - `20260402193000_storage_namespace_metadata_foundation.sql`
  - `20260402194000_pipeline_source_registry_and_fk_migration.sql`
  - `20260402195000_storage_namespace_backfill_and_source_document_reconciliation.sql`
- Do not change the schema intent of existing historical migrations. The only approved historical edits in this plan are replay-safe repairs inside `20260227160000_052_integration_registry_actions.sql` and `20260303110000_065_service_schema_extensions.sql`.
- Do not use migration repair to pretend the missing parser-era schema exists locally.
- Do not change runtime storage or pipeline API behavior in `services/platform-api/app` or `web/src` as part of this remediation.
- Do not downscope the fix to only `public.source_documents`; the plan must cover the whole parser-era compatibility surface that later migrations reference.
- If authoritative linked-db DDL conflicts with the assumptions in this plan, stop and revise the plan before writing SQL.

## Locked Product Decisions

1. This remediation exists only to make the historical SQL chain replayable and to unblock the storage namespace closeout.
2. The fix is additive except for the explicitly approved replay-safe repairs in `20260227160000_052_integration_registry_actions.sql` and `20260303110000_065_service_schema_extensions.sql`. No semantic behavior change to historical migrations is allowed.
3. The new bootstrap migration must sort before `20260220194000_040_storage_documents_preview_select_policy.sql`.
4. The new bootstrap migration must be idempotent on the linked database because those parser-era tables already appear to exist there.
5. The bootstrap migration must create physical tables and compatibility columns, not views or ad hoc repair scripts.
6. The parser-era bootstrap surface is:
   - `public.source_documents`
   - `public.conversion_parsing`
   - `public.conversion_representations`
   - `public.runs`
   - `public.block_overlays`
   - `public.representation_type_catalog`
   - `public.block_type_catalog`
   - `public.status_document_uploads`
   - parser-era compatibility columns on `public.blocks` required by later migrations
7. The linked database remains the source of truth for the parser/storage contract this bootstrap must satisfy, but the bootstrap may only mirror the subset that is safe at timestamp `20260220193000`.
8. The bootstrap must not pre-create later-era additions that are introduced by unguarded later migrations. Known exclusions include:
   - `public.source_documents.document_surface`
   - `public.source_documents.storage_object_id`
   - `public.block_overlays.overlay_uid`
   - later-era foreign keys whose target tables do not yet exist at the bootstrap timestamp
9. `public.blocks` already exists before this remediation in a legacy `doc_uid` shape. The bootstrap may only add additive compatibility columns, constraints, indexes, and policy changes required by later parser/storage migrations.
10. After this remediation cleared the storage-specific seam, the remaining replay blocker moved to the upstream reconciliation plan in `docs/plans/2026-04-01-supabase-migration-reconciliation-plan.md`; the approved closeout plan cannot resume until that upstream plan succeeds.
11. No secondary checkout is assumed by this plan. Execution must proceed from `E:\\writing-system` on local `master`.
12. The only allowed edits to existing historical migrations in this plan are:
   - replacing the unsupported `ADD CONSTRAINT IF NOT EXISTS` syntax in `20260227160000_052_integration_registry_actions.sql` with equivalent idempotent guarded `ALTER TABLE ... ADD CONSTRAINT` logic that preserves the same constraint names, targets, and `ON DELETE RESTRICT` behavior
   - repairing the `service_functions_view` refresh in `20260303110000_065_service_schema_extensions.sql` so replay preserves the prior view column prefix and appends the new metadata fields without changing the intended view semantics
13. This file must not be used to claim full-chain replay completion once the next blocker is outside the parser/storage seam.

## Locked Acceptance Contract

The storage parser replay remediation is complete as a blocked handoff only when all of the following are true:

1. `npx supabase db start` succeeds locally from `E:\\writing-system` on `master` with a clean working tree.
2. `npx supabase db reset --yes` replays through the storage-specific blockers at `040`, `041`, `042`, `048`, `052`, `065`, and `083`.
3. `npx supabase migration list --local` shows the new bootstrap migration applied ahead of the parser/storage table-and-catalog chain.
4. The verification report records the next failure at `20260309183000_073_normalize_flow_identity.sql`.
5. The concrete error recorded for that next blocker is `ERROR: relation "public.projects" does not exist (SQLSTATE 42P01)`.
6. Active ownership of the remaining replay blocker is transferred to `docs/plans/2026-04-01-supabase-migration-reconciliation-plan.md`.
7. The blocked closeout plan remains intentionally paused until that upstream plan proves replay clean beyond `073`.

## Locked Platform API Surface

No platform API endpoints are added, removed, or changed in this remediation.

## Locked Observability Surface

No traces, metrics, or structured logs are added in this remediation.

The zero case is intentional because this work is replayable schema repair, not runtime feature expansion.

Observability attribute rules for this zero-case:

- Allowed new attributes: none
- Forbidden additions to any existing observability surface during this remediation:
  - `owner_id`
  - `user_id`
  - `project_id`
  - `source_uid`
  - `doc_uid`
  - `conv_uid`
  - `run_id`
  - `object_key`
  - `bucket`
  - raw SQL text
  - linked schema dump contents
  - access tokens
  - database passwords
  - signed URLs

## Database Migrations

### New migration 1

- File: `supabase/migrations/20260220193000_storage_parser_compat_bootstrap.sql`
- Schema effect:
  - create bootstrap-safe versions of `public.source_documents`, `public.conversion_parsing`, `public.conversion_representations`, `public.runs`, `public.block_overlays`, `public.representation_type_catalog`, `public.block_type_catalog`, and `public.status_document_uploads` if absent using the linked database as the reference contract
  - exclude later unguarded additions that are owned by later migrations, including `source_documents.document_surface`, `source_documents.storage_object_id`, and `block_overlays.overlay_uid`
  - seed only the minimal bootstrap-era catalog rows required for later parser/storage migrations to succeed, including platform block types for `042` and legacy upload statuses for `083`
  - add additive compatibility columns and supporting indexes/constraints/policies to legacy `public.blocks` so later parser/storage migrations and RPCs can target `conv_uid`-based state
  - add only the foreign keys, checks, permissions, and policies whose dependencies already exist at the bootstrap timestamp
  - preserve the repo's existing privilege pattern by relying on row-level security plus narrow explicit grants only; the bootstrap must not introduce broad `GRANT ALL` access for `anon` or `authenticated` on parser/storage tables
  - satisfy the exact bootstrap-safe relation contract below
- Data impact:
  - local replay path: tables start empty and satisfy downstream migration dependencies
  - linked-db path: idempotent no-op or additive-only column/index/constraint reconciliation

### Required bootstrap-safe relation contract

#### `public.source_documents`

- Required columns:
  - `source_uid TEXT NOT NULL`
  - `owner_id UUID NOT NULL`
  - `source_type TEXT NOT NULL`
  - `source_filesize INTEGER`
  - `source_total_characters INTEGER`
  - `source_locator TEXT NOT NULL`
  - `doc_title TEXT NOT NULL`
  - `uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `status TEXT NOT NULL DEFAULT 'uploaded'`
  - `error TEXT`
  - `conversion_job_id UUID`
  - `project_id UUID NOT NULL`
- Required constraints:
  - primary key on `source_uid`
  - `source_documents_source_uid_check`
- Required policies and permissions:
  - `ALTER TABLE public.source_documents ENABLE ROW LEVEL SECURITY`
  - `CREATE POLICY source_documents_select_own`
  - no bootstrap-added broad table grants to `anon`, `authenticated`, or `service_role`

#### `public.conversion_parsing`

- Required columns:
  - `conv_uid TEXT NOT NULL`
  - `source_uid TEXT NOT NULL`
  - `conv_status TEXT`
  - `conv_parsing_tool TEXT`
  - `conv_representation_type TEXT`
  - `conv_total_blocks INTEGER`
  - `conv_block_type_freq JSONB`
  - `conv_total_characters INTEGER`
  - `conv_locator TEXT`
  - `pipeline_config JSONB DEFAULT '{}'::jsonb`
  - `requested_pipeline_config JSONB NOT NULL DEFAULT '{}'::jsonb`
  - `applied_pipeline_config JSONB NOT NULL DEFAULT '{}'::jsonb`
  - `parser_runtime_meta JSONB NOT NULL DEFAULT '{}'::jsonb`
- Required constraints and foreign keys:
  - primary key on `conv_uid`
  - `conversion_parsing_conv_uid_check`
  - `conversion_parsing_source_uid_fkey` to `public.source_documents(source_uid)`
- Required policies and permissions:
  - `ALTER TABLE public.conversion_parsing ENABLE ROW LEVEL SECURITY`
  - `CREATE POLICY conversion_parsing_select_own`
  - no bootstrap-added broad table grants to `anon`, `authenticated`, or `service_role`

#### `public.conversion_representations`

- Required columns:
  - `representation_id UUID NOT NULL DEFAULT gen_random_uuid()`
  - `source_uid TEXT NOT NULL`
  - `conv_uid TEXT NOT NULL`
  - `parsing_tool TEXT NOT NULL`
  - `representation_type TEXT NOT NULL`
  - `artifact_locator TEXT NOT NULL`
  - `artifact_hash TEXT NOT NULL`
  - `artifact_size_bytes INTEGER NOT NULL`
  - `artifact_meta JSONB NOT NULL DEFAULT '{}'::jsonb`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- Required constraints, foreign keys, and indexes:
  - primary key on `representation_id`
  - unique constraint on `(conv_uid, representation_type)`
  - `conversion_representations_artifact_hash_check`
  - `conversion_representations_artifact_size_bytes_check`
  - `conversion_representations_conv_uid_check`
  - `conversion_representations_source_uid_fkey` to `public.source_documents(source_uid)`
  - `idx_conversion_representations_conv_uid`
  - `idx_conversion_representations_source_created`
- Required policies and permissions:
  - `ALTER TABLE public.conversion_representations ENABLE ROW LEVEL SECURITY`
  - `CREATE POLICY conversion_representations_select_own`
  - no bootstrap-added broad table grants to `anon`, `authenticated`, or `service_role`

#### `public.representation_type_catalog`

- Required columns:
  - `representation_type TEXT NOT NULL`
  - `description TEXT`
  - `sort_order INTEGER NOT NULL DEFAULT 0`
- Required constraints:
  - primary key on `representation_type`
- Required seed behavior:
  - no bootstrap seed rows are required; later migrations `041` and `048` must be able to insert their artifact types into an empty but valid catalog
- Required policies and permissions:
  - no bootstrap-added broad table grants to `anon`, `authenticated`, or `service_role`

#### `public.block_type_catalog`

- Required columns:
  - `block_type TEXT NOT NULL`
  - `description TEXT`
  - `sort_order INTEGER NOT NULL DEFAULT 0`
- Required constraints:
  - primary key on `block_type`
- Required seed behavior:
  - bootstrap must seed the platform block types that later migration `042` references through foreign keys or updates:
    - `heading`
    - `paragraph`
    - `list_item`
    - `code_block`
    - `table`
    - `figure`
    - `caption`
    - `footnote`
    - `divider`
    - `html_block`
    - `definition`
    - `checkbox`
    - `form_region`
    - `key_value_region`
    - `page_header`
    - `page_footer`
    - `other`
- Required policies and permissions:
  - no bootstrap-added broad table grants to `anon`, `authenticated`, or `service_role`

#### `public.status_document_uploads`

- Required columns:
  - `status TEXT NOT NULL`
  - `description TEXT`
  - `sort_order INTEGER NOT NULL DEFAULT 0`
- Required constraints:
  - primary key on `status`
- Required seed behavior:
  - bootstrap must seed the legacy upload-status keys required by `source_documents.status` defaults and later migration `083`:
    - `uploaded`
    - `upload_failed`
    - `ingested`
    - `ingest_failed`
  - exact pre-`083` `sort_order` integers do not carry runtime meaning in this remediation, but each seeded row must have a stable integer value
- Required policies and permissions:
  - no bootstrap-added broad table grants to `anon`, `authenticated`, or `service_role`

#### `public.runs`

- Required columns:
  - `run_id UUID NOT NULL DEFAULT gen_random_uuid()`
  - `owner_id UUID NOT NULL`
  - `conv_uid TEXT NOT NULL`
  - `schema_id UUID NOT NULL`
  - `model_config JSONB`
  - `status TEXT NOT NULL DEFAULT 'running'`
  - `total_blocks INTEGER NOT NULL`
  - `completed_blocks INTEGER NOT NULL DEFAULT 0`
  - `failed_blocks INTEGER NOT NULL DEFAULT 0`
  - `started_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `completed_at TIMESTAMPTZ`
  - `failure_log JSONB DEFAULT '[]'::jsonb`
- Required constraints, foreign keys, and indexes:
  - primary key on `run_id`
  - `runs_completed_blocks_check`
  - `runs_failed_blocks_check`
  - `runs_total_blocks_check`
  - `runs_conv_uid_fkey` to `public.conversion_parsing(conv_uid)`
  - `idx_runs_conv_uid`
  - `idx_runs_owner_started`
- Required policies and permissions:
  - `ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY`
  - `CREATE POLICY runs_select_own`
  - no bootstrap-added broad table grants to `anon`, `authenticated`, or `service_role`

#### `public.block_overlays`

- Required columns:
  - `run_id UUID NOT NULL`
  - `block_uid TEXT NOT NULL`
  - `overlay_jsonb_confirmed JSONB NOT NULL DEFAULT '{}'::jsonb`
  - `status TEXT NOT NULL DEFAULT 'pending'`
  - `claimed_by TEXT`
  - `claimed_at TIMESTAMPTZ`
  - `attempt_count INTEGER NOT NULL DEFAULT 0`
  - `last_error TEXT`
  - `overlay_jsonb_staging JSONB NOT NULL DEFAULT '{}'::jsonb`
  - `confirmed_at TIMESTAMPTZ`
  - `confirmed_by UUID`
- Required constraints, foreign keys, and indexes:
  - primary key on `(run_id, block_uid)`
  - `block_overlays_attempt_count_check`
  - `block_overlays_block_uid_fkey` to `public.blocks(block_uid)`
  - `block_overlays_run_id_fkey` to `public.runs(run_id)`
  - `idx_block_overlays_run_status`
- Required policies and permissions:
  - `ALTER TABLE public.block_overlays ENABLE ROW LEVEL SECURITY`
  - `CREATE POLICY block_overlays_select_own`
  - `CREATE POLICY block_overlays_update_own`
  - `GRANT UPDATE(overlay_jsonb_staging) ON TABLE public.block_overlays TO authenticated`
  - no other bootstrap-added broad table grants to `anon`, `authenticated`, or `service_role`

#### `public.blocks` additive compatibility bridge

- The legacy `public.blocks` table remains in place. The bootstrap must not drop or rewrite legacy `doc_uid`-based columns.
- Required additive columns if absent:
  - `conv_uid TEXT`
  - `block_locator JSONB`
  - `block_content TEXT`
- Required additive constraints, foreign keys, indexes, and policies if absent:
  - unique constraint on `(conv_uid, block_index)`
  - `blocks_conv_uid_fkey` to `public.conversion_parsing(conv_uid)`
  - `idx_blocks_conv_uid`
  - `idx_blocks_conv_uid_index`
  - `ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY`
  - `CREATE POLICY blocks_select_own` using the `conversion_parsing -> source_documents -> owner_id` path

### Explicit bootstrap exclusions

- `public.source_documents.document_surface`
- `public.source_documents.storage_object_id`
- `source_documents_document_surface_check`
- `source_documents_storage_object_id_fkey`
- `source_documents_document_surface_idx`
- `public.block_overlays.overlay_uid`
- `block_overlays_confirmed_by_fkey`
- `block_overlays_status_fkey`
- `blocks_block_type_fkey`
- `blocks_block_uid_check`
- `blocks_v2_block_locator_check`
- `conversion_parsing_conv_parsing_tool_check`
- `conversion_parsing_conv_parsing_tool_fkey`
- `conversion_parsing_conv_representation_type_fkey`
- `conversion_parsing_conv_status_fkey`
- `conversion_representations_pairing`
- `conversion_representations_v2_parsing_tool_check`
- `conversion_representations_parsing_tool_fkey`
- `conversion_representations_representation_type_fkey`
- `runs_schema_id_fkey`
- `runs_status_fkey`
- `source_documents_project_id_fkey`
- `source_documents_source_type_fkey`
- `source_documents_status_fkey`

No second migration is planned in this remediation. The bootstrap file must be comprehensive enough to satisfy all later parser/storage dependencies in one additive step.

### Modified historical migration 1

- File: `supabase/migrations/20260227160000_052_integration_registry_actions.sql`
- Schema effect:
  - replace the unsupported `ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS ...` statements for `integration_services_action_fkey` and `integration_functions_action_fkey` with equivalent idempotent guarded `ALTER TABLE ... ADD CONSTRAINT` logic
  - preserve the exact constraint names, referenced tables and columns, and `ON DELETE RESTRICT` behavior already intended by the migration
  - do not change any other DDL, RLS policy, seed data, or uniqueness behavior in `052`
- Data impact:
  - none; this is a replay-safe syntax repair only

### Modified historical migration 2

- File: `supabase/migrations/20260303110000_065_service_schema_extensions.sql`
- Schema effect:
  - repair the `service_functions_view` refresh so PostgreSQL replay preserves the pre-existing view column order from the earlier migration chain while still exposing the new metadata columns introduced by `065`
  - preserve the same view name, joins, filters, grants, and intended added metadata fields
  - do not change any other DDL, seed data, or registry semantics in `065`
- Data impact:
  - none; this is a replay-safe view-definition repair only

## Edge Functions

No edge function changes.

## Frontend Surface Area

No frontend runtime or component changes.

## Locked Inventory Counts

### Backend

- New migration files: `1`
- Modified existing migration files: `2`
- New backend test files: `1`
- Modified runtime backend files: `0`

### Frontend

- Modified frontend files: `0`

### Docs

- New plan files: `0`
- New verification docs: `1`

## Locked File Inventory

### New files

- `supabase/migrations/20260220193000_storage_parser_compat_bootstrap.sql`
- `services/platform-api/tests/test_storage_namespace_schema_contract.py`
- `docs/plans/__complete/reports/2026-04-02-storage-namespace-closure-verification-report.md`

### Modified files
- `supabase/migrations/20260227160000_052_integration_registry_actions.sql`
- `supabase/migrations/20260303110000_065_service_schema_extensions.sql`

## Frozen Seam Contract

The frozen replay seam for this remediation is the schema boundary immediately before `20260220194000_040_storage_documents_preview_select_policy.sql`.

Later migrations in the replay chain are allowed to rely only on:

1. the bootstrap-safe relations, columns, constraints, indexes, policies, and grants listed in `## Database Migrations`
2. the explicit exclusions remaining absent until their owning later migrations run
3. the fact that `public.blocks` is a legacy table receiving an additive compatibility bridge rather than a destructive cutover
4. the approved historical replay repairs declared in `## Database Migrations` for `20260227160000_052_integration_registry_actions.sql` and `20260303110000_065_service_schema_extensions.sql`

The bootstrap migration is not allowed to:

- pre-create later-era columns or foreign keys that later unguarded migrations still own
- rewrite historical migration ownership of parser-track CHECK constraints
- drop legacy `public.blocks` columns to force early parity with the linked final schema
- introduce new runtime tables, endpoints, or observability surfaces outside this frozen seam
- change the schema intent of later historical migrations while performing a syntax-only replay repair

## Task Breakdown

## Task 1: Capture authoritative parser-era DDL from the linked database

**File(s):** `docs/plans/__complete/reports/2026-04-02-storage-namespace-closure-verification-report.md`

**Step 1:** Create `docs/plans/__complete/reports/2026-04-02-storage-namespace-closure-verification-report.md` as the execution evidence artifact for this remediation.
**Step 2:** Dump the linked public schema or inspect the linked database catalog for:
- `source_documents`
- `conversion_parsing`
- `conversion_representations`
- `runs`
- `block_overlays`
- `representation_type_catalog`
- `block_type_catalog`
- `status_document_uploads`
- `blocks`

**Step 3:** Record the exact columns, foreign keys, checks, indexes, and policies needed by the later parser/storage migrations.
**Step 4:** Separate the linked contract into:
- bootstrap-safe elements that can exist at `20260220193000`
- later-era additions that must remain owned by later migrations
**Step 5:** Compare that bootstrap-safe contract to the assumptions in the current migration chain.
**Step 6:** If the linked schema materially differs from the contract implied here, stop and revise the plan before writing the bootstrap SQL.

**Test command:** `cd supabase && npx supabase db dump --linked --schema public --file .temp/parser-storage-linked-schema.sql`
**Expected output:** a linked-db schema artifact plus an execution-note breakdown of which parser/storage elements are bootstrap-safe versus later-era exclusions.

**Commit:** `docs(storage): capture parser replay blocker schema evidence`

## Task 2: Add the additive parser compatibility bootstrap migration

**File(s):** `supabase/migrations/20260220193000_storage_parser_compat_bootstrap.sql`, `supabase/migrations/20260227160000_052_integration_registry_actions.sql`, `supabase/migrations/20260303110000_065_service_schema_extensions.sql`

**Step 1:** Create the bootstrap migration with `IF NOT EXISTS` and equivalent idempotent guards so it is safe on the linked database.
**Step 2:** Define the physical parser/storage relations the later migrations require:
- `source_documents`
- `conversion_parsing`
- `conversion_representations`
- `runs`
- `block_overlays`
- `representation_type_catalog`
- `block_type_catalog`
- `status_document_uploads`

**Step 3:** Seed only the minimal catalog data required by downstream migrations:
- platform block-type rows required by `042`
- legacy upload-status rows required by `083`
**Step 4:** Exclude later-era unguarded additions that are owned by later migrations, including `source_documents.document_surface`, `source_documents.storage_object_id`, and `block_overlays.overlay_uid`.
**Step 5:** Add the parser-era compatibility columns to `public.blocks` that later cleanup SQL expects, including `conv_uid` when absent.
**Step 6:** Add only the required indexes, foreign keys, checks, permissions, and policies whose dependencies already exist at the bootstrap timestamp.
**Step 7:** Preserve the repo's existing privilege model by avoiding bootstrap-time `GRANT ALL` access for `anon` or `authenticated`; only narrow explicit permissions that existing downstream SQL depends on may be added.
**Step 8:** Do not backfill or rewrite data in existing immutable tables beyond harmless null-safe compatibility initialization.
**Step 9:** If replay then reaches `20260227160000_052_integration_registry_actions.sql` and fails on unsupported `ADD CONSTRAINT IF NOT EXISTS` syntax, repair only those two statements in-place using guarded `pg_constraint` checks while preserving the same constraint names and foreign key targets.
**Step 10:** If replay then reaches `20260303110000_065_service_schema_extensions.sql` and fails because `CREATE OR REPLACE VIEW public.service_functions_view` would rename existing columns in-place, repair only that view refresh so the prior column prefix from the earlier replay chain is preserved and the new metadata fields are appended without changing the intended joins, filters, or grants.

**Test command:** `cd supabase && npx supabase db reset --yes`
**Expected output:** replay proceeds past migrations `040`, `041`, `042`, `048`, `052`, `065`, and `083`, then through the later parser/storage and storage-namespace migration chain without bootstrap-time dependency, syntax, or view-refresh failures.

**Commit:** `fix(supabase): add parser compatibility bootstrap for replay`

## Task 3: Create the schema-contract test for replay prerequisites

**File(s):** `services/platform-api/tests/test_storage_namespace_schema_contract.py`

**Step 1:** Create `services/platform-api/tests/test_storage_namespace_schema_contract.py`.
**Step 2:** Assert that the bootstrap relations and compatibility columns exist in the dumped post-reset schema.
**Step 3:** Assert the expected storage namespace relations and view contract that the blocked closeout plan depends on.
**Step 4:** Fail explicitly if the replayed schema still lacks any parser-era prerequisite relation.

**Test command:** `cd services/platform-api && pytest -q tests/test_storage_namespace_schema_contract.py`
**Expected output:** `1 passed`

**Commit:** `test(storage): extend schema contract for parser replay bootstrap`

## Task 4: Re-run local replay and targeted backend verification

**File(s):** `docs/plans/__complete/reports/2026-04-02-storage-namespace-closure-verification-report.md`

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

**File(s):** `docs/plans/__complete/reports/2026-04-02-storage-namespace-closure-verification-report.md`

**Step 1:** Capture linked migration state before apply.
**Step 2:** Run `npx supabase db push` against the linked project.
**Step 3:** Capture linked migration state after apply. If `db push` fails before the normal post-apply capture, rerun `npx supabase migration list` immediately before any other action so the post-failure state is recorded.
**Step 4:** Record before/after state, CLI exit status, and any partially applied migration state in the verification report.
**Step 5:** If the push partially applies, leaves drift, or fails after changing linked migration state, freeze further migration attempts. Do not retry `db push`, do not edit historical migration files, and do not patch linked migration history manually in this plan.
**Step 6:** In that partial-apply case, stop execution and write a dedicated additive linked-db recovery plan before any further migration action.
**Step 7:** Only resume the closeout plan when the linked project is either cleanly updated or blocked behind that separately approved recovery plan.

**Test command:** `cd supabase && npx supabase link --project-ref $SUPABASE_PROJECT_ID && npx supabase migration list && npx supabase db push && npx supabase migration list`
**Expected output:** the linked project shows `20260220193000_storage_parser_compat_bootstrap.sql` applied with no pending replay-remediation migration.

**Commit:** `docs(storage): record linked parser bootstrap application`

## Task 6: Resume the blocked closeout plan from Task 3

**File(s):** `docs/plans/2026-04-02-storage-namespace-remediation-and-linked-db-closure-plan.md`, `docs/plans/__complete/reports/2026-04-02-storage-namespace-closure-verification-report.md`

**Step 1:** Resume the approved closeout plan from Task 3.
**Step 2:** Re-run the local replay, linked-db apply, CORS application, manual acceptance, and re-evaluation steps in that plan.
**Step 3:** Do not call the storage namespace implementation complete until the closeout plan itself reaches its approval-grade verdict.

**Test command:** `cd supabase && npx supabase db start && npx supabase db reset --yes && npx supabase migration list --local && cd ../services/platform-api && pytest -q tests/test_storage_namespace_schema_contract.py tests/test_storage_routes.py tests/test_storage_source_documents.py tests/test_storage_download_url.py tests/test_pipelines_routes.py tests/test_pipeline_source_sets_service.py tests/test_pipeline_source_library.py`
**Expected output:** the closeout plan's Task 3 verification command is green, proving the replay blocker is removed and the closeout plan can continue through its remaining linked-apply, CORS, manual acceptance, and re-evaluation steps.

**Commit:** `docs(storage): resume namespace closeout after replay remediation`

## Explicit Risks

1. The linked parser-era schema may contain columns or policies not visible from runtime code alone; that is why Task 1 is mandatory.
2. Backdated additive migrations can be applied later to the linked database only if they are strictly idempotent.
3. The replay blocker may expose additional missing parser/storage catalog assumptions after the first bootstrap lands; if so, that is a new debugging cycle, not permission to rewrite historical files.
4. If replay surfaces another historical migration defect, that requires a new evidence-backed plan amendment; the only pre-approved historical edits in this plan are the replay repairs for `052` and `065`.

## Completion Criteria

The work is complete as a blocked handoff only when all of the following are true:

1. The new additive bootstrap migration exists and is idempotent.
2. The verification artifact records that replay now clears the storage-specific blockers at `040`, `041`, `042`, `048`, `052`, `065`, and `083`.
3. The next replay blocker is recorded at `20260309183000_073_normalize_flow_identity.sql` with `public.projects` missing.
4. The active upstream ownership of the remaining replay problem is transferred to `docs/plans/2026-04-01-supabase-migration-reconciliation-plan.md`.
5. Tasks 3 through 6 remain intentionally pending under this file until the upstream plan succeeds.
