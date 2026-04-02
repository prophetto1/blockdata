# 2026-04-01 Supabase Migration Reconciliation Plan

## Objective

Bring the connected Supabase project into schema alignment with the current AGChain and pipeline runtime without replaying semantically equivalent migrations and without attempting to run local-only migrations that are currently wrong for the live `public.user_projects` authority.

## Current Observed State

### Evidence-backed facts

- `supabase migration list` shows timestamp drift between local and remote migration histories.
- Supabase CLI documentation states that `migration list` compares timestamps only, not semantic schema equivalence.
- The connected database currently has `public.user_projects` and does not have `public.projects`.
- The connected database currently does **not** have:
  - `public.agchain_organizations`
  - `public.agchain_organization_members`
  - `public.agchain_project_memberships`
  - `public.agchain_operations`
  - `public.agchain_datasets`
  - `public.agchain_tools`
  - `public.agchain_scorers`
  - `public.pipeline_jobs`
  - `public.pipeline_deliverables`
  - `public.pipeline_source_sets`
  - `public.pipeline_source_set_items`
- The connected database currently **does** have:
  - `public.agchain_model_targets` with 29 rows
  - `public.agchain_benchmarks` with 2 rows
  - `public.user_projects` with 21 rows and 6 distinct owners
- `public.user_projects` is missing the columns required by the current AGChain workspace runtime:
  - `organization_id`
  - `project_slug`
  - `created_by`
- The current org selector failure is explained by this mismatch:
  - [AgchainOrganizationSwitcher.tsx](/E:/writing-system/web/src/components/agchain/AgchainOrganizationSwitcher.tsx) loads `/agchain/organizations`
  - [workspace_registry.py](/E:/writing-system/services/platform-api/app/domain/agchain/workspace_registry.py) queries `agchain_organizations` and `agchain_organization_members`
  - those tables do not exist remotely, so the backend throws an unhandled error and the UI surfaces `HTTP 500`

### Data snapshot that matters for backfills

- `public.user_projects`: `21` rows, `0` rows with null `owner_id`
- distinct owners across `public.user_projects` and `public.agchain_benchmarks`: `6`
- `public.agchain_benchmarks`: `2` rows, both owned by the same user
- neither benchmark name currently matches an existing `user_projects.project_name` for that owner

Implication: the workspace backfill in [20260331213000_agchain_workspace_scope_alignment.sql](/E:/writing-system/supabase/migrations/20260331213000_agchain_workspace_scope_alignment.sql) is expected to create `2` compatibility project rows for existing benchmarks, taking `public.user_projects` from `21` to `23` rows on the current data snapshot.

## Drift Classification

### Bucket A: timestamp drift only, repair migration history, do not rerun DDL

These local files map to semantically equivalent remote migrations already present under different remote timestamps:

| Local version | Remote version | Local file | Why repair instead of rerun |
|---|---|---|---|
| `20260321200000` | `20260322053958` | `20260321200000_auth_oauth_attempts.sql` | Remote migration history already contains the same feature under a later timestamped version name |
| `20260321173000` | `20260327212558` | `20260321173000_create_user_variables.sql` | Remote already has the created secret store schema under a different timestamp |
| `20260327110000` | `20260327212726` | `20260327110000_user_secret_store_hardening.sql` | Remote already has the hardening change under a different timestamp |
| `20260321120000` | `20260327214221` | `20260321120000_storage_default_quota_policy.sql` | Remote already has the quota policy under a different timestamp |
| `20260321130000` | `20260327214241` | `20260321130000_storage_source_document_bridge.sql` | Remote already has the storage/source bridge under a different timestamp |
| `20260326170000` | `20260327214302` | `20260326170000_agchain_model_targets.sql` | Remote already has AGChain model target tables and rows |
| `20260326234500` | `20260327214330` | `20260326234500_agchain_benchmark_registry.sql` | Remote already has AGChain benchmark registry tables and rows |

### Bucket B: safe local-only migrations that should run forward as-is

| Version | File | Status |
|---|---|---|
| `20260305120050` | `20260305120050_069_user_projects_rename.sql` | Safe no-op on current remote because `public.user_projects` already exists and `public.projects` does not |
| `20260317230000` | `20260317230000_101_register_code_source_types.sql` | Still needed; code source types exist, but `6` `source_documents` rows are still mislabeled as `binary` |
| `20260328103000` | `20260328103000_drop_old_reserve_user_storage_overload.sql` | Still needed; remote currently exposes both `reserve_user_storage` overloads |
| `20260328113000` | `20260328113000_agchain_benchmark_step_reorder_atomic_rpc.sql` | Still needed; reorder RPC is not present remotely |
| `20260330130000` | `20260330130000_pipeline_source_set_storage_contract.sql` | Forward migration once `20260330120000` is corrected and applied |
| `20260331143000` | `20260331143000_agchain_inspect_component_registries.sql` | Still needed; AGChain tool/scorer registry tables are absent remotely |
| `20260331213000` | `20260331213000_agchain_workspace_scope_alignment.sql` | Still needed; this is the migration that unblocks `/agchain/organizations` |
| `20260331220000` | `20260331220000_agchain_operations_prereqs.sql` | Still needed; `public.agchain_operations` is absent remotely |
| `20260401123000` | `20260401123000_agchain_tools_runtime_refs.sql` | Still needed after component registries land |

### Bucket C: local-only migrations that are wrong against the current project authority and must be corrected before any normal push

These local-only files still reference `public.projects(project_id)` even though the connected database uses `public.user_projects(project_id)`:

| Version | File | Blocking issue |
|---|---|---|
| `20260327200000` | `20260327200000_pipeline_jobs_and_deliverables_foundation.sql` | `pipeline_jobs.project_id` references `public.projects(project_id)` |
| `20260330120000` | `20260330120000_pipeline_source_sets_foundation.sql` | `pipeline_source_sets.project_id` references `public.projects(project_id)` |
| `20260331141000` | `20260331141000_agchain_inspect_dataset_registry.sql` | `agchain_datasets.project_id` references `public.projects(project_id)` |

These three files block any clean `db push` path until corrected.

## Preferred Reconciliation Path

### Phase 0: freeze and snapshot

1. Freeze further Supabase migration edits until the reconciliation commit is prepared.
2. Capture:
   - current `supabase migration list`
   - current remote schema backup
   - current row counts for `user_projects`, `agchain_benchmarks`, `agchain_model_targets`
3. Treat the connected remote as the operational truth for existing data, but treat the repo migration chain as the source of desired forward state.

### Phase 1: repair timestamp-only drift

For each Bucket A pair:

1. Mark the local timestamp as applied in remote migration history.
2. Mark the remote-only timestamp as reverted.
3. Re-run `supabase migration list`.

Expected result after this phase:

- the seven Bucket A discrepancies are gone
- only the genuinely unapplied local files remain unmatched

Exact repair pairs:

| Apply local | Revert remote |
|---|---|
| `20260321200000` | `20260322053958` |
| `20260321173000` | `20260327212558` |
| `20260327110000` | `20260327212726` |
| `20260321120000` | `20260327214221` |
| `20260321130000` | `20260327214241` |
| `20260326170000` | `20260327214302` |
| `20260326234500` | `20260327214330` |

Use Supabase CLI `migration repair` only for this bucket. Do not use it to pretend Bucket B or Bucket C DDL is already present.

### Phase 2: correct the broken local-only files before any push

Because these files are local-only and are not present in the connected remote history, the preferred path is to fix them in place before rollout:

1. Edit [20260327200000_pipeline_jobs_and_deliverables_foundation.sql](/E:/writing-system/supabase/migrations/20260327200000_pipeline_jobs_and_deliverables_foundation.sql)
   - replace `REFERENCES public.projects(project_id)` with `REFERENCES public.user_projects(project_id)`
2. Edit [20260330120000_pipeline_source_sets_foundation.sql](/E:/writing-system/supabase/migrations/20260330120000_pipeline_source_sets_foundation.sql)
   - replace `REFERENCES public.projects(project_id)` with `REFERENCES public.user_projects(project_id)`
3. Edit [20260331141000_agchain_inspect_dataset_registry.sql](/E:/writing-system/supabase/migrations/20260331141000_agchain_inspect_dataset_registry.sql)
   - replace `REFERENCES public.projects(project_id)` with `REFERENCES public.user_projects(project_id)`

No other semantic rewrite is needed in those files unless review finds additional `public.projects` assumptions beyond the direct foreign key.

### Decision gate for editing historical local files

Use the preferred in-place correction only if those three timestamps have not been applied to any shared database.

Current evidence:

- they are not applied on the connected remote
- their target tables do not exist on the connected remote

If another shared branch database has already applied any of those timestamps, do **not** edit that file in place. In that case, use the fallback path in the final section of this document.

### Phase 3: rehearse the forward-only migration run on a disposable environment

Rehearse on a disposable database that starts from the current remote state after Phase 1 and the corrected files from Phase 2.

Recommended order:

1. `20260305120050_069_user_projects_rename.sql`
2. `20260317230000_101_register_code_source_types.sql`
3. corrected `20260327200000_pipeline_jobs_and_deliverables_foundation.sql`
4. `20260328103000_drop_old_reserve_user_storage_overload.sql`
5. `20260328113000_agchain_benchmark_step_reorder_atomic_rpc.sql`
6. corrected `20260330120000_pipeline_source_sets_foundation.sql`
7. `20260330130000_pipeline_source_set_storage_contract.sql`
8. corrected `20260331141000_agchain_inspect_dataset_registry.sql`
9. `20260331143000_agchain_inspect_component_registries.sql`
10. `20260331213000_agchain_workspace_scope_alignment.sql`
11. `20260331220000_agchain_operations_prereqs.sql`
12. `20260401123000_agchain_tools_runtime_refs.sql`

Why this order is correct:

- it preserves timestamp order
- it lets the still-needed code-source and storage cleanup land before later schema work
- it lands the pipeline foundations before source-set constraints
- it lands AGChain benchmark/tool/dataset registry prerequisites before workspace and operations runtime
- it lands tool runtime ref widening only after `agchain_tools` and `agchain_benchmark_version_tools` exist

### Phase 4: verification gates on the disposable environment

#### Migration-history gates

- `supabase migration list` shows no unmatched rows for Buckets A, B, or C

#### Schema gates

Verify these relations now exist:

- `public.pipeline_jobs`
- `public.pipeline_deliverables`
- `public.pipeline_source_sets`
- `public.pipeline_source_set_items`
- `public.agchain_datasets`
- `public.agchain_dataset_versions`
- `public.agchain_tools`
- `public.agchain_tool_versions`
- `public.agchain_scorers`
- `public.agchain_scorer_versions`
- `public.agchain_organizations`
- `public.agchain_organization_members`
- `public.agchain_project_memberships`
- `public.agchain_operations`

Verify these columns now exist:

- `public.user_projects.organization_id`
- `public.user_projects.project_slug`
- `public.user_projects.created_by`
- `public.agchain_benchmarks.project_id`
- `public.agchain_tools.source_kind`
- `public.agchain_benchmark_version_tools.tool_ref`

#### Data/backfill gates

On the current connected-data snapshot, the disposable rehearsal should prove:

- `public.user_projects` count becomes `23`
- `public.agchain_organizations` count becomes `6`
- `public.agchain_organization_members` count becomes `6`
- `public.agchain_project_memberships` count becomes `23`
- `public.agchain_benchmarks` rows with null `project_id` becomes `0`
- `public.user_projects` rows with null `organization_id` becomes `0`
- `public.user_projects` rows with null `project_slug` becomes `0`
- `public.user_projects` rows with null `created_by` becomes `0`
- `source_documents` rows still mislabeled as binary for known code extensions becomes `0`

#### Runtime/API gates

After the disposable migration rehearsal, verify authenticated API reads for:

- `GET /agchain/organizations`
- `GET /agchain/projects`
- `GET /agchain/datasets`
- `GET /agchain/tools`

The org selector must return `200` and at least one organization row instead of `HTTP 500`.

### Phase 5: production rollout

Only after the disposable environment passes all gates:

1. apply the same Phase 1 repairs on the production-linked remote migration history
2. deploy the corrected migration files
3. run the forward migration sequence once against the linked production project
4. rerun the verification queries
5. smoke-test the AGChain org selector and project registry in the live web app

## Verification Queries

Use these as the canonical post-rollout checks.

```sql
select to_regclass('public.agchain_organizations') as agchain_organizations,
       to_regclass('public.agchain_organization_members') as agchain_organization_members,
       to_regclass('public.agchain_project_memberships') as agchain_project_memberships,
       to_regclass('public.agchain_operations') as agchain_operations,
       to_regclass('public.agchain_datasets') as agchain_datasets,
       to_regclass('public.agchain_tools') as agchain_tools,
       to_regclass('public.agchain_scorers') as agchain_scorers,
       to_regclass('public.pipeline_jobs') as pipeline_jobs,
       to_regclass('public.pipeline_deliverables') as pipeline_deliverables,
       to_regclass('public.pipeline_source_sets') as pipeline_source_sets,
       to_regclass('public.pipeline_source_set_items') as pipeline_source_set_items;
```

```sql
select
  count(*) filter (where organization_id is null) as user_projects_without_org,
  count(*) filter (where project_slug is null) as user_projects_without_slug,
  count(*) filter (where created_by is null) as user_projects_without_created_by
from public.user_projects;
```

```sql
select count(*) as benchmarks_without_project
from public.agchain_benchmarks
where project_id is null;
```

```sql
select
  (select count(*) from public.user_projects) as user_projects_count,
  (select count(*) from public.agchain_organizations) as organizations_count,
  (select count(*) from public.agchain_organization_members) as organization_members_count,
  (select count(*) from public.agchain_project_memberships) as project_memberships_count;
```

```sql
select count(*) as binary_code_source_rows
from public.source_documents
where source_type = 'binary'
  and (
    source_locator like '%.py'
    or source_locator like '%.java'
    or source_locator like '%.js'
    or source_locator like '%.jsx'
    or source_locator like '%.ts'
    or source_locator like '%.tsx'
    or source_locator like '%.go'
    or source_locator like '%.rs'
    or source_locator like '%.cs'
  );
```

## Fallback Path If Local-Only Files Cannot Be Edited In Place

If any shared environment has already applied `20260327200000`, `20260330120000`, or `20260331141000`:

1. do not mutate those historical files
2. create a new one-time reconciliation cutover migration, following the precedent in [20260316050000_096_reconciliation_cutover.sql](/E:/writing-system/supabase/migrations/20260316050000_096_reconciliation_cutover.sql)
3. make that cutover migration:
   - create the missing pipeline and AGChain tables against `public.user_projects`
   - alter `public.user_projects`
   - alter `public.agchain_benchmarks`
   - backfill orgs, memberships, project slugs, created-by values, and benchmark project links
   - add the missing RPC/function changes
4. after the cutover succeeds, repair remote migration history to mark the superseded local timestamps as applied
5. resume normal forward-only migrations from the next timestamp after the cutover

This fallback is heavier than the preferred path and should be used only if shared-environment application history blocks safe in-place correction.
