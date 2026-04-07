# Supabase Migration History Reconciliation And AGChain Provider Repair Plan

**Goal:** Restore a clean linked-project migration history that matches the repo-owned Supabase migration chain, without re-running already-applied AGChain provider SQL and without editing immutable historical migration files.

**Architecture:** Treat `supabase/migrations/*.sql` as the immutable source of truth, treat the current linked Supabase schema as already carrying the AGChain provider tables, and use `supabase migration repair` only for history-only drift where local-file ownership and current remote schema effects are proven. Do not add more wrapper migrations, do not rewrite historical SQL, and do not apply more manual DDL for the already-landed provider tables.

**Tech Stack:** Supabase CLI, Supabase hosted Postgres, Supabase migration history table, GitHub Actions DB workflows, local `supabase db reset`, Node test runner, FastAPI/React contract verification by schema inspection.

**Status:** Draft
**Author:** Codex
**Date:** 2026-04-07

## Source Documents

- `docs/plans/2026-04-03-supabase-migration-reconciliation-successor-plan.md`
- `docs/plans/2026-04-03-supabase-sql-alignment-finalization-plan.md`
- `.github/workflows/migration-history-hygiene.yml`
- `.github/workflows/supabase-db-validate.yml`
- `.github/workflows/supabase-db-deploy.yml`
- `supabase/migrations/20260404153000_registry_admin_surface_profiles.sql`
- `supabase/migrations/20260406130000_agchain_provider_registry.sql`
- `supabase/migrations/20260406131000_agchain_organization_provider_credentials.sql`
- `supabase/migrations/20260406132000_agchain_project_provider_credentials.sql`
- `supabase/migrations/20260407113000_agchain_provider_registry_vertex_auth_alignment.sql`
- Supabase CLI reference: `supabase migration repair`

## Verified Current State

### Live AGChain provider schema is present

- The linked Supabase project now contains:
  - `public.agchain_provider_registry`
  - `public.agchain_organization_provider_credentials`
  - `public.agchain_project_provider_credentials`
  - `public.agchain_model_targets`
  - `public.agchain_model_health_checks`
- The linked provider registry contains seeded rows for `openai`, `anthropic`, and `vertex-ai`.
- `vertex-ai` now stores the live frontend/backend auth contract:
  - `["access_token", "credential_json", "api_key"]`

### The frontend/backend surfaces align to the SQL contract now

- The admin registry surface in `web/src/pages/admin/AgchainAdminModelsPage.tsx` reads and writes:
  - `credential_form_kind`
  - `supported_auth_kinds`
  - `docs_url`
  - `env_var_name`
  - `provider_category`
  - `default_probe_strategy`
- The runtime provider credential surfaces in:
  - `web/src/components/agchain/models/AgchainProviderCredentialsSurface.tsx`
  - `web/src/components/agchain/models/AgchainProviderCredentialsTable.tsx`
  - `web/src/components/agchain/models/AgchainProviderCredentialModal.tsx`
  consume the provider registry and credential tables expected by:
  - `services/platform-api/app/domain/agchain/provider_registry.py`
  - `services/platform-api/app/domain/agchain/provider_credentials.py`
- The original `vertex-ai` seed SQL did not match the live runtime contract. That mismatch is already corrected by `20260407113000_agchain_provider_registry_vertex_auth_alignment.sql`.

### Migration history is still drifted

There are two different kinds of drift:

1. **Operational version gaps**: local migration timestamps that are not recorded remotely under the same version.
2. **Name-only drift**: the same migration timestamp exists locally and remotely, but the suffix/name differs.

#### Operational version gaps currently known

These local repo migrations do not currently exist in linked history under the same local version:

1. `20260404153000_registry_admin_surface_profiles`
2. `20260406130000_agchain_provider_registry`
3. `20260406131000_agchain_organization_provider_credentials`
4. `20260406132000_agchain_project_provider_credentials`
5. `20260407113000_agchain_provider_registry_vertex_auth_alignment`

#### Remote wrapper versions currently known

The AGChain provider SQL was applied manually and recorded remotely as wrapper versions created on 2026-04-07:

1. `20260407075607_20260406130000_agchain_provider_registry`
2. `20260407075616_20260406131000_agchain_organization_provider_credentials`
3. `20260407075624_20260406132000_agchain_project_provider_credentials`
4. `20260407075628_20260407113000_agchain_provider_registry_vertex_auth_alignment`

These four are schema-equivalent to local repo migrations and should be repaired in history, not re-applied as SQL.

#### Older drift that must be classified carefully

1. `20260404153000_registry_admin_surface_profiles` is absent remotely, but remote history contains `20260404190805_registry_admin_surface_profiles`.
2. `20260208034956_006_add_block_overlays_v2_to_realtime` has the same timestamp remotely but the remote name omits `006_`.
3. `20260314130000_087_unrestrict_upload_file_types` has the same timestamp remotely but a different remote name: `087_upload_support_all_remove_upload_gates`.

The two same-timestamp drifts are not automatically actionable because the version is already present remotely. They should only be touched if the canonical CLI flow proves they block migration alignment.

### Repo workflow constraints are locked

- Existing migration files are immutable under `.github/workflows/migration-history-hygiene.yml`.
- The canonical linked deploy path remains:
  1. `supabase link --project-ref ...`
  2. `supabase migration list`
  3. `supabase db push`
  4. `supabase migration list`
- Supabase docs support repairing migration history by marking specific versions `applied` or `reverted` after linking the project.

## Manifest

### Platform API

No platform API routes, request shapes, response shapes, auth rules, or runtime ownership change in this plan.

Verification-only backend seams:

- `services/platform-api/app/api/routes/agchain_models.py`
- `services/platform-api/app/domain/agchain/provider_registry.py`
- `services/platform-api/app/domain/agchain/provider_credentials.py`

### Observability

No new runtime telemetry is added in this plan.

Justification:

- This batch changes migration-history bookkeeping and linked verification only.
- No new backend-owned runtime seam is introduced.
- Evidence is limited to `supabase migration list`, `supabase migration repair`, `supabase db push`, SQL verification queries, and replay/contract test output.

### Database Migrations

No new schema migrations are authorized beyond the already-created local file:

- `supabase/migrations/20260407113000_agchain_provider_registry_vertex_auth_alignment.sql`

This plan uses history repair plus verification. It does not authorize additional schema-altering migrations unless a stop condition below is hit and a new plan is written.

### Edge Functions

No edge functions are created or modified.

### Frontend Surface Area

No frontend files are modified in this plan.

Verification-only frontend surfaces:

- `web/src/pages/admin/AgchainAdminModelsPage.tsx`
- `web/src/components/agchain/models/AgchainProviderCredentialsSurface.tsx`
- `web/src/components/agchain/models/AgchainProviderCredentialsTable.tsx`
- `web/src/components/agchain/models/AgchainProviderCredentialModal.tsx`

## Pre-Implementation Contract

No major migration-history, linked-schema, or repair decision may be improvised during execution. If any version outside the locked repair map below appears, stop and write a follow-up plan instead of widening scope live.

### Locked Product Decisions

1. Local migration files remain immutable. No existing `supabase/migrations/*.sql` file may be edited or renamed in this batch.
2. The AGChain provider SQL already landed in the linked database. Those four migrations must be reconciled through migration-history repair only, not by re-running SQL manually.
3. `20260407113000_agchain_provider_registry_vertex_auth_alignment.sql` remains part of the local source-of-truth chain and must appear in linked history under its local version when this plan is complete.
4. `20260404153000_registry_admin_surface_profiles` may be repaired into linked history only after explicit proof that the linked schema effects match the local file’s intended objects and backfill contract.
5. The same-version name drifts at `20260208034956` and `20260314130000` are verification-only unless the canonical CLI flow proves they still block linked alignment.
6. The canonical deploy flow remains `link -> migration list -> db push -> migration list`. No alternate permanent deploy process is introduced.
7. `supabase migration repair` may be used only on the exact versions listed in the locked repair map.
8. If linked `db push` still reports drift after the locked repair map is executed, stop and write a new plan instead of continuing ad hoc.

### Locked Acceptance Contract

The work is only complete when all of the following are true:

1. The linked migration history no longer contains the four wrapper versions:
   - `20260407075607`
   - `20260407075616`
   - `20260407075624`
   - `20260407075628`
2. The linked migration history contains the four AGChain local versions as applied:
   - `20260406130000`
   - `20260406131000`
   - `20260406132000`
   - `20260407113000`
3. The linked schema still contains the three AGChain provider tables and the provider seed rows after repair.
4. If parity proof succeeds for `20260404153000_registry_admin_surface_profiles`, linked history records `20260404153000` instead of remote-only `20260404190805`.
5. `supabase db push` on the linked project does not attempt to apply the AGChain provider SQL again.
6. Local `supabase db reset` still succeeds from the repo-owned migration chain.
7. No historical migration file is edited in git to achieve the above.

### Locked Platform API Surface

No platform API changes.

### Locked Observability Surface

No runtime observability changes.

### Locked Inventory Counts

#### Database

- New schema migrations to create during execution: `0`
- Existing migration files modified: `0`
- Migration-history repair operations expected: `8` minimum
  - `4` revert wrapper versions
  - `4` apply local AGChain versions
- Optional additional repair operations: `2`
  - `1` revert `20260404190805`
  - `1` apply `20260404153000`

#### Frontend

- Modified files: `0`

#### Backend

- Modified runtime files: `0`

#### Documentation / Evidence

- New verification report files: `1`

### Locked File Inventory

#### New files expected from execution

- `docs/plans/__complete/reports/2026-04-07-supabase-migration-history-reconciliation-verification-report.md`

#### Existing files verified but not modified

- `.github/workflows/migration-history-hygiene.yml`
- `.github/workflows/supabase-db-validate.yml`
- `.github/workflows/supabase-db-deploy.yml`
- `supabase/migrations/20260404153000_registry_admin_surface_profiles.sql`
- `supabase/migrations/20260406130000_agchain_provider_registry.sql`
- `supabase/migrations/20260406131000_agchain_organization_provider_credentials.sql`
- `supabase/migrations/20260406132000_agchain_project_provider_credentials.sql`
- `supabase/migrations/20260407113000_agchain_provider_registry_vertex_auth_alignment.sql`

## Frozen Migration History Contract

### Safe repair map

The following remote wrapper versions are locked as history-only drift created by manual MCP application on 2026-04-07 and are safe to repair:

| Remote version to revert | Local version to mark applied | Proof basis |
| --- | --- | --- |
| `20260407075607` | `20260406130000` | linked schema contains `agchain_provider_registry` created from local repo SQL |
| `20260407075616` | `20260406131000` | linked schema contains `agchain_organization_provider_credentials` created from local repo SQL |
| `20260407075624` | `20260406132000` | linked schema contains `agchain_project_provider_credentials` created from local repo SQL |
| `20260407075628` | `20260407113000` | linked provider seed row for `vertex-ai` matches the corrected local auth-kind contract |

### Proof-gated repair map

This repair is allowed only after explicit parity verification:

| Remote version to revert | Local version to mark applied | Required proof |
| --- | --- | --- |
| `20260404190805` | `20260404153000` | linked schema must prove the two admin registry tables, indexes, triggers, comments, and active-superuser backfill expected by the local SQL |

### Verification-only drift

These same-timestamp name drifts are not repaired in this batch unless `supabase migration list` or `supabase db push` proves they still block the canonical flow:

| Local file | Remote record | Reason to leave untouched by default |
| --- | --- | --- |
| `20260208034956_006_add_block_overlays_v2_to_realtime` | `20260208034956_add_block_overlays_v2_to_realtime` | remote already has the same version timestamp |
| `20260314130000_087_unrestrict_upload_file_types` | `20260314130000_087_upload_support_all_remove_upload_gates` | remote already has the same version timestamp |

## Explicit Risks Accepted In This Plan

1. The AGChain provider SQL has already been executed once on the linked project outside the canonical `db push` path, so this batch accepts controlled history repair as the least risky way back to repo alignment.
2. The `20260404153000` admin-surface repair depends on schema-parity proof rather than access to the original remote SQL text; if proof is not strong enough, that repair must be deferred.
3. The two same-version name drifts may remain visible in exact local-vs-remote name comparisons even if the canonical CLI flow is operationally clean.

## Completion Criteria

1. The locked AGChain repair map is executed and verified.
2. The linked project still passes schema spot-checks for provider registry and provider credential tables after repair.
3. The linked project no longer carries the four AGChain wrapper versions.
4. The linked project records the repo-owned AGChain local versions as applied.
5. `supabase db push` does not attempt to reapply the AGChain provider chain.
6. Local replay remains healthy with `supabase db reset`.
7. A written verification report captures before/after migration lists and schema checks.

## Task 1: Capture the pre-repair migration and schema snapshot

**File(s):** `docs/plans/__complete/reports/2026-04-07-supabase-migration-history-reconciliation-verification-report.md`

**Step 1:** Link the local repo to the target project with `cd supabase && npx supabase link --project-ref $SUPABASE_PROJECT_REF`.
**Step 2:** Capture `npx supabase migration list` before any repair.
**Step 3:** Capture SQL evidence for:
- provider tables existing
- seeded provider rows
- current `vertex-ai` supported auth kinds
- admin registry tables existing
**Step 4:** Write the raw before-state evidence into the verification report.

**Test command:** `cd supabase && npx supabase migration list`
**Expected output:** The report records the four AGChain wrapper versions and any remaining remote-only timestamps before repair begins.

**Commit:** `docs(db): capture prerepair migration evidence`

## Task 2: Hard Stop/Go Gate - Prove `20260404153000` parity before touching it

**File(s):** `supabase/migrations/20260404153000_registry_admin_surface_profiles.sql`

**Step 1:** Query the linked database for `registry_blockdata_admin_profiles` and `registry_agchain_admin_profiles`.
**Step 2:** Verify the expected indexes, trigger names, table comments, and that active `registry_superuser_profiles` rows were backfilled into both new tables.
**Step 3:** If any required object or backfill condition is missing, stop this plan and write a dedicated follow-up plan for `20260404153000` instead of repairing its history record.

**Test command:** `psql "$env:DATABASE_URL" -c "select to_regclass('public.registry_blockdata_admin_profiles'), to_regclass('public.registry_agchain_admin_profiles');"`
**Expected output:** Both registry tables exist, and supporting parity checks confirm the local file’s intended effects. If not, this task is a stop condition.

**Commit:** `docs(db): prove admin registry migration parity`

## Task 3: Repair the four AGChain wrapper history records

**File(s):** none

**Step 1:** Revert the four wrapper records with `supabase migration repair ... --status reverted`.
**Step 2:** Mark the four local AGChain repo versions as applied with `supabase migration repair ... --status applied`.
**Step 3:** Re-run `supabase migration list` immediately after the repair.

**Test command:** `cd supabase && npx supabase migration repair 20260407075607 20260407075616 20260407075624 20260407075628 --status reverted && npx supabase migration repair 20260406130000 20260406131000 20260406132000 20260407113000 --status applied && npx supabase migration list`
**Expected output:** The four wrapper versions disappear from remote history, and the four local AGChain versions appear as applied.

**Commit:** `chore(db): repair agchain provider migration history`

## Task 4: Repair `20260404153000` only if Task 2 proved parity

**File(s):** none

**Step 1:** If Task 2 passed, revert remote `20260404190805`.
**Step 2:** Mark local `20260404153000` as applied.
**Step 3:** Re-run `supabase migration list`.
**Step 4:** If Task 2 did not pass, skip this task entirely and record the deferral in the verification report.

**Test command:** `cd supabase && npx supabase migration repair 20260404190805 --status reverted && npx supabase migration repair 20260404153000 --status applied && npx supabase migration list`
**Expected output:** If parity was proven, remote history records `20260404153000_registry_admin_surface_profiles` instead of `20260404190805_registry_admin_surface_profiles`.

**Commit:** `chore(db): reconcile admin registry migration history`

## Task 5: Re-run the canonical linked deploy flow

**File(s):** none

**Step 1:** Run `npx supabase migration list` after all allowed repairs.
**Step 2:** Run `npx supabase db push`.
**Step 3:** Run `npx supabase migration list` again.
**Step 4:** Confirm that `db push` does not try to reapply the AGChain provider migrations.
**Step 5:** If the two same-version name drifts still do not block `db push`, leave them untouched and document them as accepted residual name-only drift.

**Test command:** `cd supabase && npx supabase migration list && npx supabase db push && npx supabase migration list`
**Expected output:** `db push` completes without re-running the AGChain provider SQL and without introducing new unexplained remote-only versions.

**Commit:** `chore(db): reprove linked migration flow`

## Task 6: Reprove local replay and write the final report

**File(s):** `docs/plans/__complete/reports/2026-04-07-supabase-migration-history-reconciliation-verification-report.md`

**Step 1:** Run `cd supabase && npx supabase db reset --yes`.
**Step 2:** Re-run the existing reconciliation contract test if the linked/local seam needs proof.
**Step 3:** Append the post-repair linked migration list, schema checks, and local replay result to the verification report.
**Step 4:** Explicitly record any accepted residual name-only drift left out of repair.

**Test command:** `cd supabase && npx supabase db reset --yes`
**Expected output:** Local replay succeeds from the repo-owned migration chain after the linked history repair work is complete.

**Commit:** `docs(db): finalize migration reconciliation evidence`

## Execution Handoff

Read this plan fully before running any repair command.

Follow the locked repair map exactly:

1. Prove parity before touching `20260404153000`.
2. Repair the four AGChain wrapper versions.
3. Only then run the canonical linked `db push` verification.

If any version outside the locked map appears, stop and revise the plan before continuing.
