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

## Confirmed Missing

- no CT-staged generated backend Kestra API type directory yet at `kt-ct/generated/kestra-api/`
- no seeded first-page task artifacts yet for `flows_list`

## Important Observations

- `web-kt` is ready enough to serve as the UI reference workspace.
- the frontend contract source is ready enough to support both frontend and backend generation from the same `openapi.yml`.
- the `kt` schema currently appears empty in the live project, so compatibility work can proceed structurally, but real page wiring will still require either seed data, imports, or mock-compatible fallback behavior.
- worker-system guidance currently exists under `web-kt/docs/worker-system`, but the root control tower is not yet the source of truth.
- the staged DB types file now follows the CT-first rule, but it still needs review before any promotion into product paths.

## Readiness Summary

Current phase readiness:

- UI reference workspace: ready
- OpenAPI contract source: ready
- `kt` schema presence: ready
- root control-tower structure: ready
- CT staging location: ready
- shared DB types: ready for review
- shared backend API types: not ready
- root worker operating system: not ready
- first page task seed: not ready

## Recommendation

Continue with the preparatory phase in this order:

1. review the CT-staged DB types file
2. generate shared backend Kestra API contract types from `openapi.yml` into `kt-ct`
3. move worker instructions, prompts, and templates into `kt-ct`
4. seed `flows_list` task artifacts
5. promote staged outputs into product paths only after review
