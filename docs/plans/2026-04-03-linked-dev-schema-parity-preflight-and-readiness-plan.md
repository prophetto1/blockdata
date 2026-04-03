# 2026-04-03 Linked Dev Schema Parity Preflight And Readiness Plan

**Goal:** Eliminate the recurring linked-dev schema drift class that currently surfaces as late route failures by adding a repo-owned local startup preflight that auto-applies safe pending migrations, a local-only `platform-api` startup gate that fails fast when schema parity is behind, and a new Superuser Operational Readiness `Schema parity` surface that exposes parity state and exact remediation.

**Architecture:** Treat linked-dev schema reconciliation as a repo bootstrap concern, not an app-runtime mutation concern. Add a Node-based preflight that loads repo migration history, compares it against the linked Supabase dev database, repairs only explicitly known-equivalent history drift, auto-applies remaining safe pending repo migrations through the normal Supabase CLI path, verifies required schema objects, and writes a shared parity-state artifact. Add a Python verifier that reads the parity-state artifact during local `platform-api` startup and stops the process before any routes can return drift-induced `500`s. Extend the existing Operational Readiness snapshot and page with a new `Schema parity` surface that reports the linked project ref, repo and remote heads, safe-pending and unsafe-drift counts, missing required schema objects, blocked checks, last successful sync attempt, and the next action.

**Tech Stack:** Node 22, `pg`, Supabase CLI, PowerShell 7, FastAPI, Python 3.11, React 19, TypeScript 5.9, Vitest 4, pytest.

**Status:** Draft
**Date:** 2026-04-03

## Source Of Truth

This plan is derived from:

- `docs/plans/2026-04-01-supabase-migration-reconciliation-plan.md`
- `docs/plans/__complete/2026-04-02-operational-readiness-diagnostic-detail-expansion-plan.md`
- `.env.example`
- `scripts/start-platform-api.ps1`
- `services/platform-api/app/main.py`
- `services/platform-api/app/api/routes/admin_runtime_readiness.py`
- `services/platform-api/app/services/runtime_readiness.py`
- `web/src/lib/operationalReadiness.ts`
- `package.json`
- the linked Supabase dev project currently addressed by `.env`
- the user direction in this session to auto-apply safe pending migrations during local startup, fail fast when schema parity is behind, and expose the result on the existing Superuser Operational Readiness page as a separate surface, not a separate tab

## Verified Current State

### Linked dev drift is a real recurring operator failure

- The linked dev database recently failed the AGChain settings members route because `public.agchain_permission_group_memberships` did not exist.
- The failure surfaced late as a `500` from `organization_access.py`, not as an early startup block.
- The root cause was not missing application code. It was missing linked-dev schema state.

### The repo already treats migration history as explicit and additive-only

- `.github/workflows/supabase-db-validate.yml` replays migrations locally with `supabase db reset`.
- `.github/workflows/supabase-db-deploy.yml` applies repo migrations to the linked project with `supabase db push`.
- `.github/workflows/migration-history-hygiene.yml` prevents modifying or deleting existing migration files.
- Nothing in the current local startup path auto-reconciles the linked dev database before app startup.

### Local `platform-api` startup currently has no schema parity preflight

- `scripts/start-platform-api.ps1` loads `.env`, resolves Python, writes `.codex-tmp/platform-api-dev/state.json`, and launches uvicorn.
- It does not currently run any linked-dev migration parity check or migration apply step before startup.
- `services/platform-api/app/main.py` starts the FastAPI app, configures telemetry, and includes routers, but it does not currently stop boot when the linked dev schema is behind repo expectations.

### Tests and direct app imports currently bypass the launcher entirely

- Many backend tests instantiate `create_app()` or import `app.main:app` directly instead of using `scripts/start-platform-api.ps1`.
- `services/platform-api/app/core/config.py` currently defaults `otel_deployment_env` to `local`, so generic "local" detection is not precise enough for a startup gate.
- Any new startup verifier must therefore activate only from an explicit launcher-owned signal, not from environment heuristics like `local`.

### Operational Readiness currently has no schema surface

- `services/platform-api/app/api/routes/admin_runtime_readiness.py` accepts only `all`, `shared`, `blockdata`, and `agchain`.
- `services/platform-api/app/services/runtime_readiness.py` hardcodes the same three surfaces in `_surface_checks(...)` and `get_runtime_readiness_snapshot(...)`.
- `web/src/lib/operationalReadiness.ts` hardcodes the same three surface ids in `OperationalReadinessSurfaceId` and `SURFACE_ORDER`.
- `web/src/pages/superuser/SuperuserOperationalReadiness.tsx` already renders surfaces generically, so a fourth backend-owned surface fits the current page model without introducing tabs.

### Known-equivalent remote drift already exists

- The migration reconciliation work already documented that linked-history drift must be treated explicitly, not guessed.
- The linked dev project already contains remote-only timestamps representing operator-applied equivalents of some repo migrations.
- This means the startup preflight cannot assume that "remote version missing" always means "migration not semantically applied."

### The local repo already has a named linked-project credential contract

- `.env.example` already declares `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, and `DATABASE_URL`.
- Existing linked-project migration plans and workflows already treat explicit `supabase link --project-ref ...` plus `supabase db push` as the canonical remote-apply path.
- The new local preflight must reuse that explicit targeting model instead of depending on ambient global Supabase CLI login state.

## Platform API

### Existing endpoint reused

- `GET /admin/runtime/readiness`

### Endpoint behavior change

- Extend the `surface` query enum from `all | shared | blockdata | agchain` to `all | shared | blockdata | agchain | schema`.
- Include the new `schema` surface in the `all` snapshot ordering.
- Do not add a second readiness endpoint.

### New local-only startup guard

- Add a local-only startup verification seam in `platform-api` that reads the shared schema-parity state artifact before the app begins serving requests.
- The startup guard must not apply migrations.
- The startup guard must fail with an explicit message naming missing repo migrations, missing required schema objects, and blocked runtime checks when parity is not green.

## Frontend Surface

### Existing page reused

- Reuse `/app/superuser/operational-readiness`.
- Do not add a second page or a tab system.

### Existing components reused

- Reuse `OperationalReadinessCheckGrid` for the new `Schema parity` surface.
- Reuse the existing surface list rendering model in `SuperuserOperationalReadiness.tsx`.
- Keep the existing page route, auth gate, and fetch path unchanged.

## Database Migrations

No new database migrations.

Justification:

- This batch fixes linked-dev schema parity workflow and visibility, not database product behavior.
- Existing migration files remain immutable.
- The preflight may apply already-authored repo migrations to the linked dev database, but it must not add or rewrite migration SQL in this batch.

## Edge Functions

No edge function changes.

Justification:

- The problem is in repo startup, linked-dev schema state, backend startup verification, and Operational Readiness.
- No Supabase edge function owns or consumes the linked-dev startup path addressed here.

## Observability

### Reused readiness telemetry

- **Type:** existing span and metric
- **Name:** `admin.runtime.readiness.check` span and `record_runtime_readiness_check(...)`
- **Emit location:** `services/platform-api/app/services/runtime_readiness.py`
- **Purpose:** capture status for the new `schema` surface checks without introducing a second readiness instrumentation seam

### New startup/preflight logs

- **Type:** structured logs
- **Names:** `linked_dev_schema_parity.preflight.start`, `linked_dev_schema_parity.preflight.result`, `linked_dev_schema_parity.startup_gate`
- **Emit locations:** `scripts/linked-dev-schema-parity-preflight.mjs` and `services/platform-api/app/services/schema_parity.py`
- **Purpose:** make local parity classification and startup stop conditions auditable without requiring a debugger

### Allowed observability attributes

- `linked_project_ref`
- `repo_migration_head`
- `remote_migration_head`
- `safe_pending_count`
- `applied_pending_count`
- `known_equivalent_count`
- `unsafe_drift_count`
- `missing_required_schema_object_count`
- `blocked_check_ids`
- `state_status`
- `next_action`
- `launcher_enabled`
- `applicability`
- `lock_state`

### Forbidden observability attributes

- `DATABASE_URL`
- database passwords
- access tokens
- full raw SQL text
- raw migration file contents
- signed URLs
- user secrets

## Pre-Implementation Contract

No major ownership, startup, schema-mutation, or readiness-surface decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

## Locked Product Decisions

1. Linked-dev schema mutation is owned by the repo-level local startup preflight, not by `platform-api` runtime code.
2. `platform-api` startup verification is local-only and verify-only. It must not mutate the database.
3. Auto-apply is allowed only for explicitly allowlisted linked dev project refs and only when remote drift is either absent or explicitly classified as known-equivalent in the shared contract.
4. Unknown remote-only migration versions, non-additive history problems, stale or missing parity state, and missing required schema objects are hard-stop conditions.
5. Known-equivalent drift is resolved only through explicit contract mappings and bounded migration-history repair logic. No heuristic equivalence matching is allowed.
6. The canonical deploy path remains the repo's explicit Supabase CLI and CI workflows. This batch does not replace deploy-time migration management.
7. Operational Readiness gains a new backend-owned `Schema parity` surface on the existing page. No separate tab system is introduced.
8. The new readiness surface is diagnostic only. No UI repair or migration-apply control is added in this batch.
9. Existing migration SQL files remain immutable.
10. Production and Cloud Run startup behavior are out of scope. This batch addresses linked-dev local startup only.
11. The local preflight must explicitly target the linked dev project with `SUPABASE_PROJECT_REF` before any repair, migration listing, or `db push`.
12. The local preflight may run only when `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, and `DATABASE_URL` are all present in the local environment loaded from `.env`.
13. The Python startup verifier may activate only when explicit launcher-owned env vars are present. Generic `local` environment detection is forbidden.
14. The `schema` readiness surface must have explicit non-applicable behavior outside the canonical linked-dev launcher path. It may not silently fail or disappear unpredictably.
15. The preflight must be single-flight. Concurrent startup and manual rerun attempts may not execute `migration repair` or `db push` in parallel.

## Locked Schema Parity State Contract

The repo preflight and the backend startup/readiness code must share one JSON state artifact at:

- `.codex-tmp/platform-api-dev/schema-parity.json`

The repo preflight must also use one lock file at:

- `.codex-tmp/platform-api-dev/schema-parity.lock`

Locked shape:

```json
{
  "status": "ok | blocked",
  "checked_at": "ISO-8601 timestamp",
  "linked_project_ref": "string | null",
  "repo_migration_head": "string | null",
  "remote_migration_head": "string | null",
  "safe_pending_local_versions": ["string"],
  "applied_local_versions": ["string"],
  "known_equivalent_versions": [
    {
      "local_version": "string",
      "remote_version": "string",
      "reason": "string"
    }
  ],
  "unsafe_remote_only_versions": ["string"],
  "missing_required_schema_objects": ["string"],
  "blocked_checks": ["string"],
  "last_successful_sync_at": "ISO-8601 timestamp | null",
  "next_action": "string"
}
```

Locked rules:

- `status = ok` means the linked dev database satisfies repo parity for the allowlisted local startup path.
- `status = blocked` means startup must stop and Operational Readiness must report the blocking reason.
- `known_equivalent_versions` may only come from the committed contract file, never from runtime guesses.
- `blocked_checks` must list human-meaningful runtime seams such as `agchain.settings.organization_members`.
- The lock file must be acquired before any mutation-capable step and released after the parity state has been persisted.

### Launcher activation contract

`scripts/start-platform-api.ps1` must set all of the following before launching uvicorn:

- `PLATFORM_API_DEV_LAUNCHER=1`
- `PLATFORM_API_SCHEMA_PARITY_STATE_PATH=<repo>/.codex-tmp/platform-api-dev/schema-parity.json`
- `PLATFORM_API_SCHEMA_PARITY_LOCK_PATH=<repo>/.codex-tmp/platform-api-dev/schema-parity.lock`

Locked rule:

- The Python startup verifier runs only when `PLATFORM_API_DEV_LAUNCHER=1` and `PLATFORM_API_SCHEMA_PARITY_STATE_PATH` are both present.
- Direct `create_app()` calls, direct imports of `app.main:app`, pytest, and non-launcher contexts bypass the verifier unless a test explicitly opts in.

## Locked Schema Contract

### Shared contract file

Implementation must add one committed contract file for parity classification. The contract file must define:

- allowlisted linked dev project refs
- known-equivalent local-to-remote version mappings
- required schema objects
- blocked runtime check ids or route seams associated with those required objects

### Auto-apply classification

Locked behavior:

1. Load repo migration versions from `supabase/migrations`.
2. Load linked remote history from `supabase_migrations.schema_migrations`.
3. Verify that `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, and `DATABASE_URL` are present before any mutation-capable step. If any are missing, stop and mark the state `blocked`.
4. `Push-Location supabase` and run `npx supabase link --project-ref $SUPABASE_PROJECT_REF` before any `migration repair`, `migration list`, or `db push`.
5. Normalize remote history through the committed equivalence mapping.
6. If any remote-only version is not allowlisted as equivalent, stop and mark the state `blocked`.
7. If equivalence repair is needed for missing local versions already satisfied by known remote versions, run bounded `supabase migration repair --status applied ...` only for the mapped local versions.
8. Run `supabase db push` only after the drift set is reduced to known-equivalent versions plus safe pending repo versions.
9. Verify required schema objects after apply or no-op classification.
10. Persist the parity state artifact before `platform-api` startup continues.

### Concurrency control

Locked behavior:

1. The preflight acquires `.codex-tmp/platform-api-dev/schema-parity.lock` before any repair or apply step.
2. If the lock is already held, a second invocation waits for a short bounded interval and then exits with a blocked parity state instead of racing the first invocation.
3. The blocked state must set `next_action` to wait for the active preflight to finish or rerun after the lock clears.
4. The manual `linked-dev:schema-preflight` command and the launcher-owned startup preflight share the same lock behavior.

## Locked Readiness Surface Contract

### Surface id and placement

- Surface id: `schema`
- Surface label: `Schema parity`
- Placement: fourth surface in the existing readiness page ordering, after `agchain`

### Locked checks in this batch

1. `schema.linked_dev.migration_parity`
   - Reports linked project ref, repo head, remote head, safe pending count, applied pending count, known-equivalent count, unsafe drift count, last successful sync, and next action.

2. `schema.linked_dev.required_objects`
   - Reports required schema object count, missing required schema objects, blocked runtime checks, and remediation text.

### Non-applicable behavior

Locked behavior outside the canonical linked-dev launcher path:

- The `schema` surface still appears in `surface=all` and `surface=schema`.
- Both locked checks return `status = ok` and `actionability = info_only`.
- Their summaries must state that linked-dev schema parity is not active in this runtime.
- Evidence must include `applicability = not_applicable` and `launcher_enabled = false`.

### Locked non-goals

- No per-migration UI browser
- No inline migration history editing controls
- No multi-project selector
- No browser-triggered auto-apply action

## Locked Observability Surface

- Reuse the current readiness check span and metric for `schema` checks.
- Add only the structured startup/preflight logs defined in this plan.
- Do not add a new dashboard, alerting product surface, or analytics event family in this batch.

## Locked Inventory Counts

### Scripts and root config

- New files: `3`
- Modified files: `2`

### Backend runtime

- New files: `1`
- Modified files: `3`

### Backend tests

- New files: `1`
- Modified files: `4`

### Frontend runtime

- New files: `0`
- Modified files: `1`

### Frontend tests

- New files: `0`
- Modified files: `2`

## Locked File Inventory

### New files

- `scripts/linked-dev-schema-parity-preflight.mjs`
- `scripts/schema-parity-contract.json`
- `scripts/tests/linked-dev-schema-parity-preflight.test.mjs`
- `services/platform-api/app/services/schema_parity.py`
- `services/platform-api/tests/test_schema_parity.py`

### Modified files

- `package.json`
- `scripts/start-platform-api.ps1`
- `services/platform-api/app/main.py`
- `services/platform-api/app/api/routes/admin_runtime_readiness.py`
- `services/platform-api/app/services/runtime_readiness.py`
- `services/platform-api/tests/test_dev_bootstrap_contract.py`
- `services/platform-api/tests/test_procfile_startup.py`
- `services/platform-api/tests/test_runtime_readiness_service.py`
- `services/platform-api/tests/test_admin_runtime_readiness_routes.py`
- `web/src/lib/operationalReadiness.ts`
- `web/src/components/superuser/OperationalReadinessCheckGrid.test.tsx`
- `web/src/pages/superuser/SuperuserOperationalReadiness.test.tsx`

## Frozen Seam Contract

### Repo migration authority

- `supabase/migrations/*.sql` remains the only repo migration authority.
- Existing migration files are not edit scope.
- CI workflows remain the authoritative deploy and replay path for non-local environments.

### Local startup ownership

- `scripts/start-platform-api.ps1` remains the canonical local `platform-api` startup entrypoint.
- The new preflight is inserted into that entrypoint rather than creating a parallel ad hoc launcher.

### Backend runtime ownership

- `platform-api` startup verifies parity state but does not apply migrations.
- Existing public API routes remain unchanged except for the readiness surface enum extension.

### Frontend readiness ownership

- `/app/superuser/operational-readiness` remains the only page for this diagnostic surface.
- The page continues to render surfaces generically from snapshot data.
- No tab system, modal workflow, or additional route is introduced.

## Explicit Risks Accepted In This Plan

1. Auto-applying repo migrations to the linked dev database during local startup is a real mutation of shared dev state.
   - Mitigation: allowlisted project refs only, explicit equivalence mappings only, stop on unknown remote drift, use the canonical Supabase CLI path after bounded repair.

2. Known-equivalent remote drift can be misclassified if the committed contract is wrong.
   - Mitigation: no heuristic matching, explicit mapping entries only, and mandatory stop on any unknown remote-only version.

3. A stale or missing parity-state artifact could block local startup unexpectedly.
   - Mitigation: the preflight always runs before startup in the canonical local entrypoint and writes an explicit next action into the state file.

4. The new readiness surface may be misread as a general migration-management UI.
   - Mitigation: keep the surface diagnostic-only and avoid browser-triggered repair controls in this batch.

5. Directly coupling startup to linked-dev parity may frustrate ad hoc debugging if someone launches the app outside the repo entrypoint.
   - Mitigation: the startup verifier only activates from launcher-owned env vars; the failure message names the exact repo launcher or preflight command to rerun.

6. Concurrent startup or manual rerun attempts could otherwise race on `migration repair` or `db push`.
   - Mitigation: use one shared lock file with bounded wait and explicit blocked-state output.

## Relationship To Other Active Work

- This plan does not replace the broader Supabase migration reconciliation work. It consumes its documented equivalence discipline and local-only authority rules.
- This plan does not replace the completed Operational Readiness diagnostic-detail expansion. It extends that existing readiness surface model with one new backend-owned surface.
- This plan does not change product functionality in BlockData or AGChain. It prevents linked-dev schema drift from surfacing late as broken runtime behavior.

## Task Breakdown

### Task 1: Add the linked-dev schema parity contract and repo preflight

**Files:**

- `scripts/linked-dev-schema-parity-preflight.mjs`
- `scripts/schema-parity-contract.json`
- `scripts/tests/linked-dev-schema-parity-preflight.test.mjs`
- `package.json`

**Steps:**

1. Add the committed parity contract file with allowlisted linked dev project refs, known-equivalent version mappings, required schema objects, and blocked runtime checks.
2. Implement the Node preflight to load `.env`, require `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, and `DATABASE_URL`, explicitly run `cd supabase && npx supabase link --project-ref $SUPABASE_PROJECT_REF`, inspect repo migration files, inspect linked remote migration history through `pg`, classify safe pending and unsafe drift, run bounded `supabase migration repair --status applied ...` when contract-mapped equivalence repair is needed, run `supabase db push` for remaining safe pending repo migrations, verify required schema objects, and persist `.codex-tmp/platform-api-dev/schema-parity.json`.
3. Add a manual root script entry such as `linked-dev:schema-preflight` so the preflight can be rerun outside full startup when needed, using the same explicit targeting and lock file path as launcher startup.
4. Add Node tests covering no-op green state, known-equivalent repair state, safe pending apply state, unknown remote-only drift stop, missing required schema object stop, missing local credentials stop, and concurrent lock stop.

**Test commands:**

- `node --test scripts/tests/linked-dev-schema-parity-preflight.test.mjs`

**Expected output:** the preflight classifier and repair/apply decision logic pass without requiring a live database.

**Commit:** `feat(dev-startup): add linked dev schema parity preflight`

### Task 2: Wire the local startup gate without giving `platform-api` mutation authority

**Files:**

- `scripts/start-platform-api.ps1`
- `services/platform-api/app/services/schema_parity.py`
- `services/platform-api/app/main.py`
- `services/platform-api/tests/test_dev_bootstrap_contract.py`
- `services/platform-api/tests/test_procfile_startup.py`
- `services/platform-api/tests/test_schema_parity.py`

**Steps:**

1. Update `scripts/start-platform-api.ps1` so it sets the launcher-only env vars, runs the linked-dev schema preflight before uvicorn starts, and stops startup immediately on a blocked parity result.
2. Add a Python schema-parity verifier that reads the shared state artifact, activates only when `PLATFORM_API_DEV_LAUNCHER=1` and `PLATFORM_API_SCHEMA_PARITY_STATE_PATH` are present, enforces freshness and success rules, and produces a clear startup error with missing migrations, missing schema objects, blocked checks, and the exact rerun command.
3. Call that verifier from the FastAPI lifespan startup path before the app begins serving requests.
4. Update startup contract tests to assert the explicit launcher env vars and preflight hook exist in the canonical local startup path.
5. Add backend tests for green state, missing state, blocked state, stale state, and non-launcher bypass behavior.

**Test commands:**

- `cd services/platform-api && pytest -q tests/test_schema_parity.py tests/test_dev_bootstrap_contract.py tests/test_procfile_startup.py`

**Expected output:** the startup verifier passes on green launcher-owned parity state, bypasses direct test/import contexts, and fails clearly on blocked parity state.

**Commit:** `feat(platform-api): fail fast on blocked linked dev schema parity`

### Task 3: Add the `Schema parity` Operational Readiness surface

**Files:**

- `services/platform-api/app/api/routes/admin_runtime_readiness.py`
- `services/platform-api/app/services/runtime_readiness.py`
- `services/platform-api/tests/test_runtime_readiness_service.py`
- `services/platform-api/tests/test_admin_runtime_readiness_routes.py`
- `web/src/lib/operationalReadiness.ts`
- `web/src/components/superuser/OperationalReadinessCheckGrid.test.tsx`
- `web/src/pages/superuser/SuperuserOperationalReadiness.test.tsx`

**Steps:**

1. Extend the readiness route and service to support `surface=schema` and include `schema` in the `all` ordering.
2. Add the locked `schema.linked_dev.migration_parity` and `schema.linked_dev.required_objects` checks, driven from the shared parity-state artifact and existing readiness telemetry seams.
3. Define the non-applicable behavior for all non-launcher runtimes so the `schema` surface remains present but renders `ok` / `info_only` diagnostics instead of false failures.
4. Extend the frontend readiness type normalization to accept the `schema` surface id and preserve rendering through the existing page/grid composition.
5. Update backend and frontend tests so the new surface is covered both directly and through the `all` snapshot path, including the non-applicable runtime branch.

**Test commands:**

- `cd services/platform-api && pytest -q tests/test_runtime_readiness_service.py tests/test_admin_runtime_readiness_routes.py`
- `cd web && npx vitest run src/components/superuser/OperationalReadinessCheckGrid.test.tsx src/pages/superuser/SuperuserOperationalReadiness.test.tsx`

**Expected output:** the new readiness surface serializes correctly, the frontend accepts the fourth surface id, and the existing page renders it without a new route or tab system.

**Commit:** `feat(readiness): add linked dev schema parity surface`

### Task 4: Run linked-dev end-to-end verification

**Files:**

- verification only; no additional runtime files are added in this task

**Steps:**

1. Run the new manual preflight command against the linked dev project and capture whether it no-ops, repairs known-equivalent history, or applies safe pending repo migrations through the explicit `supabase link --project-ref ...` path.
2. Start `platform-api` through the canonical local startup path and confirm the app boots only after a green parity state.
3. Open `/app/superuser/operational-readiness` and verify the `Schema parity` surface appears with the linked project ref, repo head, remote head, safe pending count, unsafe drift count, missing required schema objects, last successful sync, and next action.
4. Confirm the AGChain settings members path no longer fails late for the recently observed missing-table class when the required schema objects are present.
5. Confirm a second concurrent preflight attempt is blocked by the shared lock instead of racing the active run.
6. If manual verification encounters unknown drift, stop and write a dedicated follow-on reconciliation plan instead of widening this batch.

**Verification commands:**

- `node --test scripts/tests/linked-dev-schema-parity-preflight.test.mjs`
- `npm run linked-dev:schema-preflight`
- `npm run platform-api:dev`
- `cd services/platform-api && pytest -q tests/test_schema_parity.py tests/test_dev_bootstrap_contract.py tests/test_procfile_startup.py tests/test_runtime_readiness_service.py tests/test_admin_runtime_readiness_routes.py`
- `cd web && npx vitest run src/components/superuser/OperationalReadinessCheckGrid.test.tsx src/pages/superuser/SuperuserOperationalReadiness.test.tsx`

**Expected output:** the linked dev startup path becomes self-healing for safe pending migrations, explicitly targets the intended linked project, blocks on unsafe drift before serving requests, enforces single-flight mutation behavior, and exposes the parity result on Operational Readiness.

**Commit:** `test(dev-startup): verify linked dev schema parity flow`

## Locked Acceptance Contract

The implementation is complete only when all of the following are true:

1. The canonical local `platform-api` startup path runs a linked-dev schema parity preflight before uvicorn starts.
2. The preflight requires `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, and `DATABASE_URL`, and explicitly links the target project before any repair or apply step.
3. The preflight compares repo migrations against the linked dev database and uses only explicit contract mappings to treat remote drift as known-equivalent.
4. Unknown remote-only versions, non-additive history problems, missing required schema objects, or missing local credentials block startup before `platform-api` begins serving requests.
5. Safe pending repo migrations are auto-applied only for allowlisted linked dev project refs and only through the locked preflight path.
6. The preflight is single-flight, and concurrent manual/startup attempts cannot run repair or apply steps in parallel.
7. `platform-api` startup does not mutate the database directly.
8. The Python startup verifier activates only from explicit launcher-owned env vars and bypasses direct test/import contexts.
9. `GET /admin/runtime/readiness?surface=schema` returns a `Schema parity` surface, and `surface=all` includes the same surface.
10. Outside the canonical linked-dev launcher path, the `Schema parity` surface returns explicit non-applicable `ok` / `info_only` diagnostics instead of false failures.
11. The `Schema parity` surface reports the linked project ref, repo migration head, remote migration head, safe pending count, unsafe drift count, missing required schema objects, last successful sync attempt, blocked checks, and the next action.
12. The existing readiness page renders the new surface without adding a new route or tab system.
13. Existing migration SQL files remain unchanged.
14. Unknown linked-dev drift still stops the batch and produces a clear next action instead of being auto-repaired heuristically.

## Completion Criteria

The work is complete only when all of the following are true:

1. Local startup self-heals the common safe-pending linked-dev migration case.
2. Local startup stops early on unsafe drift instead of allowing a later route-level `500`.
3. The linked dev preflight always targets the intended linked project through the explicit local credential contract.
4. The parity result is shared between the repo preflight, backend startup verification, and Operational Readiness through one locked state artifact plus one single-flight lock file.
5. Superuser Operational Readiness exposes linked-dev schema parity as a first-class diagnostic surface with defined non-applicable behavior outside launcher startup.
6. The repo's canonical deploy and migration-authority rules remain intact.
7. The recently observed AGChain settings missing-table failure class is prevented from reappearing as a hidden startup gap on the canonical local dev path.
