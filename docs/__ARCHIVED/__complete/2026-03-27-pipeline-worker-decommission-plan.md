# Pipeline-Worker Decommission Plan

**Goal:** Remove `services/pipeline-worker/` entirely and update all remaining references so `services/platform-api` is the sole FastAPI execution surface for plugin dispatch, admin services CRUD, and script execution.

**Architecture:** `services/platform-api` already owns every capability that `pipeline-worker` provides: authenticated plugin execution (`POST /{function_name}`), admin services CRUD (`/admin/services/*`), script subprocess runner, storage helpers, credential resolution, and the plugin registry. The worker's Dockerfile, main.py, and merge doc all state it is deprecated. No code needs to be ported — every module in the worker has an equivalent or superior counterpart in platform-api. This plan deletes the worker directory, removes stale references in frontend comments and database seed data, and verifies that no live caller depends on a separate worker deployment.

**Tech Stack:** Git (file deletion), TypeScript (comment updates), SQL (optional seed data cleanup), pytest, Vitest.

**Status:** Draft
**Author:** Claude
**Date:** 2026-03-27

## Investigation Summary

### Full duplication verified

| Worker module | platform-api equivalent | Status |
|---|---|---|
| `app/main.py` — `POST /{function_name}` | `app/api/routes/plugin_execution.py` — same route, **with auth + OTel** | Superset |
| `app/registry.py` — discover, resolve, resolve_by_function_name | `app/domain/plugins/registry.py` — identical API | Duplicate |
| `app/shared/base.py` — BasePlugin, PluginOutput, PluginParam | `app/domain/plugins/models.py` — identical + credential_schema, test_connection | Superset |
| `app/shared/context.py` — ExecutionContext | `app/domain/plugins/models.py` — identical + user_id, file I/O, temp files, Jinja2 | Superset |
| `app/shared/output.py` — success/failed/warning | `app/domain/plugins/models.py:207-216` | Duplicate |
| `app/shared/storage.py` — upload/download | `app/infra/storage.py` — identical + list + delete | Superset |
| `app/shared/runner.py` — run_script | `app/domain/plugins/execution.py` — identical | Duplicate |
| `app/shared/auth.py` — resolve_credentials | `app/plugins/http.py` — inline credential resolution | Equivalent |
| `app/routes/admin_services.py` — admin CRUD | `app/api/routes/admin_services.py` — identical | Duplicate |
| `app/plugins/core.py, http.py, scripts.py, eyecite.py` | `app/plugins/` — same plugins registered | Duplicate |
| `tests/` | `services/platform-api/tests/` — broader coverage | Superset |

### No live deployment references

- No CI/CD workflows reference pipeline-worker
- No `.env.example` variables are worker-specific
- The Dockerfile is marked deprecated
- `services-panel.api.ts` already uses `VITE_PLATFORM_API_URL` (platform-api), not a separate worker URL

### Stale references found

1. `web/src/pages/settings/services-panel.api.ts` — comments say "pipeline-worker" but URL already points to platform-api
2. `web/src/pages/settings/services-panel.types.ts` — `'pipeline-worker': 'Pipeline Worker'` in SERVICE_TYPE_LABELS
3. `services/platform-api/app/domain/plugins/models.py` line 58 — docstring says "Faithful port of pipeline-worker/app/shared/context.py"
4. Database migrations reference `pipeline-worker` as service_name strings in seed data (not schema dependencies)

## Manifest

### Platform API

No platform API changes.

platform-api already owns the full plugin execution surface with auth and OTel. No endpoints are added, modified, or removed.

### Observability

No observability changes.

platform-api's plugin execution route already has OTel trace spans. The worker had none. Removing the worker improves observability coverage by eliminating an untraced execution path.

### Database Migrations

No migrations.

Database migrations reference `pipeline-worker` as string values in `service_registry.service_name` seed data. These are display strings in existing rows, not schema structures. They do not need migration — the service registry entries describe the service type, not the deployment target. If desired, a future optional cleanup migration can update the `base_url` column in existing `pipeline-worker` service_registry rows from `http://localhost:8000` to the platform-api URL, but this is not required for decommission.

### Edge Functions

No edge function changes.

### Frontend Surface Area

**New pages:** 0
**New components:** 0

**Modified files:** 2

| File | What changes |
|---|---|
| `web/src/pages/settings/services-panel.api.ts` | Remove "pipeline-worker" references from comments. The URL variable `PIPELINE_WORKER_URL` is renamed to `PLATFORM_API_URL` and the `pipelineFetch` / `pipelineMutation` helpers are renamed to `platformFetch` / `platformMutation`. No behavioral change — the URL already points to platform-api. |
| `web/src/pages/settings/services-panel.types.ts` | Change label `'pipeline-worker': 'Pipeline Worker'` to `'pipeline-worker': 'Platform API'` in SERVICE_TYPE_LABELS. |

## Pre-Implementation Contract

No major decision may be improvised during implementation. This is a deletion plan — the only code changes are removing `services/pipeline-worker/`, updating stale comments/labels in 2 frontend files, and updating 1 backend docstring.

## Locked Decisions

1. `services/pipeline-worker/` is deleted entirely. No code is ported — everything already exists in platform-api.
2. No platform-api code changes are required for this decommission. The authenticated plugin execution route, registry, admin services, script runner, and storage helpers are already complete.
3. Database `service_registry` rows with `service_name = 'pipeline-worker'` are not migrated in this plan. They are display-layer data, not deployment dependencies.
4. Frontend `services-panel.api.ts` comment and variable name cleanup is cosmetic — no URL or behavioral change, since `VITE_PLATFORM_API_URL` was already the target.
5. The worker's `shared/auth.py` `resolve_credentials` function is not ported. platform-api's HTTP plugin already handles credential resolution inline at `app/plugins/http.py:36-54`.

## Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. `services/pipeline-worker/` directory no longer exists in the repository.
2. `git grep pipeline-worker` returns zero hits in application source code (excluding docs/plans, migration comments, and this plan).
3. All existing platform-api tests pass — no regressions from the deletion.
4. All existing frontend tests pass.
5. `services/platform-api` `POST /{function_name}` continues to work with auth and OTel tracing.

## Locked Inventory Counts

### Deleted

- Deleted directories: 1 (`services/pipeline-worker/`)
- Files deleted: ~20 (entire worker tree)

### Modified

- Modified frontend files: 2
- Modified backend files: 1 (docstring only)

## Locked File Inventory

### Deleted

- `services/pipeline-worker/` (entire directory tree)

### Modified

1. `web/src/pages/settings/services-panel.api.ts` — rename variables and update comments
2. `web/src/pages/settings/services-panel.types.ts` — update SERVICE_TYPE_LABELS entry
3. `services/platform-api/app/domain/plugins/models.py` — remove "port of pipeline-worker" from ExecutionContext docstring

## Explicit Risks Accepted In This Plan

1. **Database service_registry rows still reference `pipeline-worker` as a service_name.** This is accepted because these are display strings in an admin catalog, not deployment routing. A future cleanup can update them.
2. **If any undiscovered external caller sends traffic to a standalone pipeline-worker deployment, it will stop working.** Investigation found no CI/CD, no deployment configs, and no env vars targeting a separate worker. The Dockerfile is marked deprecated. This risk is accepted as negligible.

## Completion Criteria

The work is complete only when:

1. `services/pipeline-worker/` is deleted.
2. No application source code outside docs/plans references `pipeline-worker` (verified by grep).
3. All platform-api tests pass.
4. All frontend tests pass.
5. The inventory counts match actual changes.

## Tasks

### Task 1: Write verification tests confirming platform-api already covers worker capabilities

**Files:** `services/platform-api/tests/test_routes.py` (extend existing)

**Step 1:** Run existing platform-api tests to establish green baseline.
**Step 2:** Verify `POST /{function_name}` route exists and requires auth by checking the test_routes.py coverage.
**Step 3:** Verify admin services routes exist by checking for `/admin/services` tests.

**Test command:**
```
cd E:\writing-system
python -m pytest services/platform-api/tests/ -q
```

**Expected output:** All tests pass — baseline confirmed.

**Commit:** no commit (verification only)

---

### Task 2: Delete services/pipeline-worker/

**Files:** `services/pipeline-worker/` (entire directory)

**Step 1:** Delete the entire `services/pipeline-worker/` directory.
**Step 2:** Run `git status` to confirm only the expected deletion shows.
**Step 3:** Run platform-api tests to confirm no import dependency on the worker.

**Test command:**
```
cd E:\writing-system
python -m pytest services/platform-api/tests/ -q
```

**Expected output:** All tests pass. No imports from `services/pipeline-worker` exist in platform-api.

**Commit:** `remove deprecated pipeline-worker service`

---

### Task 3: Clean up frontend references

**Files:**
- `web/src/pages/settings/services-panel.api.ts`
- `web/src/pages/settings/services-panel.types.ts`

**Step 1:** In `services-panel.api.ts`, rename `PIPELINE_WORKER_URL` to `PLATFORM_API_URL`.
**Step 2:** Rename `pipelineFetch` to `platformFetch` and `pipelineMutation` to `platformMutation`.
**Step 3:** Update the file header comment from "Targets FastAPI pipeline-worker" to "Targets FastAPI platform-api".
**Step 4:** Update the section comment from "Generic fetch to pipeline-worker" to "Generic fetch to platform-api".
**Step 5:** In `services-panel.types.ts`, change `'pipeline-worker': 'Pipeline Worker'` to `'pipeline-worker': 'Platform API'`.
**Step 6:** Run frontend tests.

**Test command:**
```
cd E:\writing-system
npm --prefix web run test -- src/pages/settings/services-panel.api.ts src/pages/settings/services-panel.types.ts
```

**Expected output:** All tests pass.

**Commit:** `update frontend references from pipeline-worker to platform-api`

---

### Task 4: Clean up backend docstring

**Files:** `services/platform-api/app/domain/plugins/models.py`

**Step 1:** Change the ExecutionContext docstring at line 57-59 from "Faithful port of pipeline-worker/app/shared/context.py. All methods preserve the same signatures and behavior." to "Plugin execution context. Provides template rendering, logging, secret resolution, and service access to plugins."
**Step 2:** Run platform-api tests.

**Test command:**
```
cd E:\writing-system
python -m pytest services/platform-api/tests/ -q
```

**Expected output:** All tests pass.

**Commit:** `remove stale pipeline-worker docstring reference`

---

### Task 5: Verification sweep

**Files:** none (verification only)

**Step 1:** Run `git grep pipeline-worker` and confirm zero hits in application source (excluding docs/plans and migration SQL comments).
**Step 2:** Run full platform-api test suite.
**Step 3:** Run full frontend test suite.
**Step 4:** Verify inventory: 1 directory deleted, 2 frontend files modified, 1 backend file modified.

**Test command:**
```
cd E:\writing-system
git grep -l "pipeline-worker" -- ":(exclude)docs/" ":(exclude)supabase/migrations/"
python -m pytest services/platform-api/tests/ -q
npm --prefix web run test
```

**Expected output:** grep returns zero hits. All tests pass.

**Commit:** no commit (verification only)

## Execution Handoff

When this plan is approved:

- Read the plan fully before starting.
- Follow the plan exactly. This is a deletion plan — do not port code that already exists.
- If you discover a live caller that depends on a separate pipeline-worker deployment, stop and revise the plan.
- Use the verification-before-completion skill before claiming any task is done.