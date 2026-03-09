# Kestra Compatibility Reassessment

Date: 2026-03-09

## Purpose

Reassess the current repository state before preparatory execution continues for Kestra compatibility work.

## Governing Read

We are doing compatibility-first Kestra alignment, not redesign. `web-kt` is the reference UI, `openapi.yml` is the contract source, and Supabase `kt.*` is the storage layer. Backend work must map typed `kt.*` rows into exact Kestra API DTOs. `namespace` is an alias of `project_id` and must never drift from it.

## Confirmed Ready

- `web-kt` exists at `E:\writing-system\web-kt`
- `web-kt` has installed dependencies under `E:\writing-system\web-kt\node_modules`
- root `openapi.yml` exists at `E:\writing-system\openapi.yml`
- Kestra UI frontend client has been generated in `E:\writing-system\web-kt\src\generated\kestra-api`
- generated SDK files include:
  - `ks-Flows.gen.ts`
  - `ks-Executions.gen.ts`
  - `ks-Logs.gen.ts`
  - `ks-Triggers.gen.ts`
- the Kestra schema transplant migration exists at `E:\writing-system\supabase\migrations\20260309193000_074_add_kt_kestra_schema.sql`
- the live Supabase project has the `kt` schema with 21 tables:
  - `kt.concurrency_limit`
  - `kt.dashboards`
  - `kt.execution_queued`
  - `kt.executions`
  - `kt.executordelayed`
  - `kt.executorstate`
  - `kt.flow_topologies`
  - `kt.flows`
  - `kt.flyway_schema_history`
  - `kt.kv_metadata`
  - `kt.logs`
  - `kt.metrics`
  - `kt.multipleconditions`
  - `kt.namespace_file_metadata`
  - `kt.queues`
  - `kt.service_instance`
  - `kt.settings`
  - `kt.sla_monitor`
  - `kt.templates`
  - `kt.triggers`
  - `kt.worker_job_running`
- the root control tower now exists at `E:\writing-system\kt-ct`
- core control-tower subdirectories now exist:
  - `kt-ct/assessments/`
  - `kt-ct/instructions/`
  - `kt-ct/prompts/`
  - `kt-ct/tasks/`
  - `kt-ct/evidence/`
  - `kt-ct/generated/`
  - `kt-ct/references/`
- a CT-staged generated database type file now exists at `kt-ct/generated/database.types.kt.ts`
- a CT-staged generated backend Kestra API type directory now exists at `kt-ct/generated/kestra-api/`
- staged backend SDK files include:
  - `sdk/ks-Flows.gen.ts`
  - `sdk/ks-Executions.gen.ts`
  - `sdk/ks-Logs.gen.ts`

## Confirmed Missing

- no remaining preparatory artifacts are missing

## Important Observations

- `web-kt` is ready enough to serve as the UI reference workspace.
- the frontend contract source is ready enough to support both frontend and backend generation from the same `openapi.yml`.
- the `kt` schema currently appears empty in the live project, so compatibility work can proceed structurally, but real page wiring will still require either seed data, imports, or mock-compatible fallback behavior.
- worker-system guidance still exists under `web-kt/docs/worker-system`, but the root control tower is now the primary source of truth.
- the staged DB types file now follows the CT-first rule, but it still needs review before any promotion into product paths.
- the staged backend API contract output now follows the CT-first rule and reuses the same tag-splitting generator pattern as `web-kt`.
- the staged backend SDK layer is not safe to use in backend code as generated because `kt-ct/generated/kestra-api/sdk/ks-shared.gen.ts` imports `vue-router`, and the other `sdk/*.gen.ts` files depend on it.
- until that is resolved, backend mappers should import from `kt-ct/generated/kestra-api/types.gen.ts` only, not from `sdk/*.gen.ts`.
- the root control tower now contains the primary worker instruction file, launch prompt, and page templates.
- the first page task set for `flows_list` now exists in `kt-ct/tasks`.

## Readiness Summary

Current phase readiness:

- UI reference workspace: ready
- OpenAPI contract source: ready
- `kt` schema presence: ready
- root control-tower structure: ready
- CT staging location: ready
- shared DB types: ready for review
- shared backend API types: ready for review
- root worker operating system: ready
- first page task seed: ready

## Preparatory Baseline Verdict

Preparatory baseline is complete.
The repo is ready to begin the first page workflow at `flows_list` using the CT worker system.

## Recommendation

Next step:

1. start `kt-ct/tasks/flows_list.capture.md`
2. expand `kt-ct/tasks/flows_list.plan.md` into the real page plan
3. keep all implementation CT-first until reviewed
