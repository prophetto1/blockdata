# 2026-03-31 AGChain Inspect Phase 1 Datasets And Eval Surfaces Implementation Plan

**Goal:** Deliver a Phase 1 AGChain implementation that exposes the Inspect-native dataset and evaluation substrate before any Legal-10-specific customization. Phase 1 must preserve Inspect semantics for datasets, task configuration, scorer configuration, tool and sandbox contracts, run execution metadata, and eval-log viewing. Phase 2 will layer Legal-10-specific build, authoring, and benchmark customization on top of this substrate without replacing the Inspect-native core.

**Architecture:** Keep `services/platform-api` as the only runtime/backend surface the AGChain web app talks to for dataset, benchmark, scorer, tool, sandbox, run, result, and operation flows. Add Inspect-native dataset materialization, benchmark-version runtime snapshots, scorer/tool/sandbox registries, run orchestration, and results/log projection in `platform-api`; keep full Inspect log blobs in storage as the authoritative record and Postgres projections as derived caches; preserve the existing step-authored benchmark workbench while producing a resolved `task_definition_jsonb` runtime contract; keep Legal-10 DuckDB and benchmark-build workflows outside these Phase 1 runtime paths.

**Tech Stack:** Supabase Postgres migrations and storage buckets, FastAPI, React + TypeScript, existing `platformApiFetch` and AGChain hooks, OpenTelemetry, pytest, Vitest, InspectAI-informed dataset/task/log contracts.

**Status:** Draft for evaluation  
**Author:** Codex  
**Date:** 2026-03-31  
**Supersedes for Phase 1:** [2026-03-31-agchain-datasets-integration-and-frontend-plan.md](/E:/writing-system/docs/plans/2026-03-31-agchain-datasets-integration-and-frontend-plan.md)

### Amendment 2026-04-01: Workspace scope and durable operations prerequisites

Before any further Task 5 dataset `202` work resumes in this plan, the prerequisite tranche from [2026-03-31-agchain-workspace-scope-and-phase1-unblock-plan.md](/E:/writing-system/docs/plans/2026-03-31-agchain-workspace-scope-and-phase1-unblock-plan.md) must be treated as landed requirements:

- Task 4.1 auth hardening: project access must be explicitly enforced before AGChain service-role dataset reads or writes.
- Durable operations prerequisite tranche: the `agchain_operations` migration, operations routes, queue-domain substrate, and worker lease contract must land before any new dataset preview or commit path returns `202`.

Execution rule: only that prerequisite Phase A backend tranche gates resumption of backend Task 5 work. The later workspace-shell productization work may continue afterward, but it is not a prerequisite for dataset preview or materialization backend execution.

### Platform API

| Module | Endpoints | Status |
|------|------|--------|
| `services/platform-api/app/api/routes/agchain_datasets.py` | `GET /agchain/datasets`, `GET /agchain/datasets/new/bootstrap`, `POST /agchain/datasets/new/preview`, `POST /agchain/datasets`, `GET /agchain/datasets/{dataset_id}/detail`, `PATCH /agchain/datasets/{dataset_id}`, `GET /agchain/datasets/{dataset_id}/versions`, `GET /agchain/datasets/{dataset_id}/versions/{dataset_version_id}/source`, `GET /agchain/datasets/{dataset_id}/versions/{dataset_version_id}/mapping`, `GET /agchain/datasets/{dataset_id}/versions/{dataset_version_id}/validation`, `POST /agchain/datasets/{dataset_id}/versions/{dataset_version_id}/preview`, `GET /agchain/datasets/{dataset_id}/versions/{dataset_version_id}/samples`, `GET /agchain/datasets/{dataset_id}/versions/{dataset_version_id}/samples/{sample_id}`, `POST /agchain/datasets/{dataset_id}/version-drafts`, `GET /agchain/datasets/{dataset_id}/version-drafts/{draft_id}`, `PATCH /agchain/datasets/{dataset_id}/version-drafts/{draft_id}`, `POST /agchain/datasets/{dataset_id}/version-drafts/{draft_id}/preview`, `POST /agchain/datasets/{dataset_id}/version-drafts/{draft_id}/commit` | New |
| `services/platform-api/app/api/routes/agchain_benchmarks.py` | `GET /agchain/benchmarks`, `POST /agchain/benchmarks`, `GET /agchain/benchmarks/{benchmark_slug}`, `PATCH /agchain/benchmarks/{benchmark_slug}`, `GET /agchain/benchmarks/{benchmark_slug}/versions`, `POST /agchain/benchmarks/{benchmark_slug}/versions`, `GET /agchain/benchmarks/{benchmark_slug}/versions/{benchmark_version_id}`, `POST /agchain/benchmarks/{benchmark_slug}/validate` plus existing legacy step routes preserved | Existing - contract expanded |
| `services/platform-api/app/api/routes/agchain_scorers.py` | `GET /agchain/scorers`, `POST /agchain/scorers`, `GET /agchain/scorers/{scorer_id}`, `PATCH /agchain/scorers/{scorer_id}`, `GET /agchain/scorers/{scorer_id}/versions`, `POST /agchain/scorers/{scorer_id}/versions` | New |
| `services/platform-api/app/api/routes/agchain_tools.py` | `GET /agchain/tools`, `POST /agchain/tools`, `GET /agchain/tools/{tool_id}`, `PATCH /agchain/tools/{tool_id}`, `GET /agchain/tools/{tool_id}/versions`, `POST /agchain/tools/{tool_id}/versions` | New |
| `services/platform-api/app/api/routes/agchain_sandboxes.py` | `GET /agchain/sandboxes`, `POST /agchain/sandboxes`, `GET /agchain/sandboxes/{sandbox_id}`, `PATCH /agchain/sandboxes/{sandbox_id}`, `POST /agchain/sandboxes/{sandbox_id}/health-check` | New |
| `services/platform-api/app/api/routes/agchain_runs.py` | `GET /agchain/runs`, `POST /agchain/runs`, `GET /agchain/runs/{run_id}`, `POST /agchain/runs/{run_id}/cancel`, `POST /agchain/runs/{run_id}/retry`, `GET /agchain/runs/{run_id}/samples` | New |
| `services/platform-api/app/api/routes/agchain_results.py` | `GET /agchain/results`, `GET /agchain/results/{run_id}/log`, `GET /agchain/results/{run_id}/log/samples`, `GET /agchain/results/{run_id}/log/samples/{sample_run_id}`, `GET /agchain/results/{run_id}/log/json` | New |
| `services/platform-api/app/api/routes/agchain_operations.py` | `GET /agchain/operations/{operation_id}`, `POST /agchain/operations/{operation_id}/cancel` | New |

Detailed auth, request, response, touched-table, idempotency, and `202` operation contracts are locked later in `## Locked Platform API Surface`.

### Observability

- Route-level traces are required on every dataset, benchmark, scorer, tool, sandbox, run, result, and operation route named above.
- Internal traces are required on dataset preview/materialization, task resolution, scorer resolution, tool resolution, sandbox resolution, run launch, operation leasing/completion, and log projection.
- Structured logs are required for dataset preview queueing, dataset materialization completion, operation failure, run launch acceptance, run completion, and log projection failure.
- Metrics are required for dataset preview/draft/materialization flows, benchmark validation, sandbox health checks, run lifecycle, log projection, and operations queue depth/timing.
- Allowed and forbidden AGChain observability attributes remain locked and are restated later in `## Locked Observability Surface`.

### Database Migrations

| Migration | Creates/Alters | Affects Existing Data? |
|-----------|----------------|------------------------|
| `20260331141000_agchain_inspect_dataset_registry.sql` | Creates dataset registry, dataset versions, dataset drafts, dataset samples, and dataset validation projections | No destructive rewrite; new dataset tables start empty |
| `20260331143000_agchain_inspect_component_registries.sql` | Creates scorer/tool/sandbox registries and benchmark-version join tables; alters `agchain_benchmark_versions` with Inspect task/config columns | Yes - existing benchmark versions receive additive nullable or defaulted columns only |
| `20260331145000_agchain_inspect_runs_logs_operations.sql` | Alters `agchain_runs`; creates durable operations queue and results/log projection tables | Yes - existing run rows receive additive nullable or defaulted columns only |

Column-level schema detail is locked later in `## Locked Persistence Surface`.

### Edge Functions

No edge functions created or modified.

Existing Supabase edge functions remain read-only references. Dataset preview, materialization orchestration, registry CRUD, run launch, and log projection stay in `platform-api`. If an existing edge function becomes preferable, implementation must stop and the plan must be revised first.

### Frontend Surface Area

- New pages or route implementations: `4`
  - `web/src/pages/agchain/AgchainDatasetCreatePage.tsx`
  - `web/src/pages/agchain/AgchainDatasetDetailPage.tsx`
  - `web/src/pages/agchain/AgchainDatasetVersionDraftPage.tsx`
  - `web/src/pages/agchain/AgchainSandboxesPage.tsx`
- Modified existing AGChain pages: `7`
  - dataset registry, benchmark definition, benchmark workbench, scorer registry, tool registry, runs, results
- New components: `22`
  - dataset workflow, benchmark config panels, scorer/tool/sandbox registry panels, runs, and results viewers
- New hooks: `8`
  - datasets, dataset detail, dataset draft, scorers, tools, sandboxes, runs, results
- New frontend lib or service modules: `6`
  - `web/src/lib/agchainDatasets.ts`, `agchainScorers.ts`, `agchainTools.ts`, `agchainSandboxes.ts`, `agchainRuns.ts`, `agchainResults.ts`
- Modified existing frontend service modules: `1`
  - `web/src/lib/agchainBenchmarks.ts`

Exact counts and file inventory remain locked later in `## Locked Inventory Counts` and `## Locked File Inventory`.

### Pre-Implementation Contract

No major product, API, observability, persistence, auth-boundary, path-parameter, worker, or inventory decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

## Source Verification Ledger

This plan is source-verified against the current repo, not drafted from memory.

### Current AGChain surfaces verified

- Current datasets UI is still a placeholder in [AgchainDatasetsPage.tsx](/E:/writing-system/web/src/pages/agchain/AgchainDatasetsPage.tsx).
- Current build, runs, and results pages are also placeholders in [AgchainBuildPage.tsx](/E:/writing-system/web/src/pages/agchain/AgchainBuildPage.tsx), [AgchainRunsPage.tsx](/E:/writing-system/web/src/pages/agchain/AgchainRunsPage.tsx), and [AgchainResultsPage.tsx](/E:/writing-system/web/src/pages/agchain/AgchainResultsPage.tsx).
- Current AGChain platform API only mounts benchmark and model surfaces, not datasets/tasks/scorers/tools/sandboxes/log viewer routes, in [main.py](/E:/writing-system/services/platform-api/app/main.py), [agchain_benchmarks.py](/E:/writing-system/services/platform-api/app/api/routes/agchain_benchmarks.py), and [agchain_models.py](/E:/writing-system/services/platform-api/app/api/routes/agchain_models.py).
- Existing AGChain benchmark persistence exists in [20260326234500_agchain_benchmark_registry.sql](/E:/writing-system/supabase/migrations/20260326234500_agchain_benchmark_registry.sql).

### Inspect-native source of truth verified

- Inspect sample contract and field inventory are defined in [inspect_ai/dataset/_dataset.py](/E:/writing-system/_agchain/_reference/inspect_ai/src/inspect_ai/dataset/_dataset.py) and [inspect_ai/dataset/_util.py](/E:/writing-system/_agchain/_reference/inspect_ai/src/inspect_ai/dataset/_util.py).
- Inspect dataset loaders and source options are defined in [inspect_ai/dataset/_sources/csv.py](/E:/writing-system/_agchain/_reference/inspect_ai/src/inspect_ai/dataset/_sources/csv.py), [inspect_ai/dataset/_sources/json.py](/E:/writing-system/_agchain/_reference/inspect_ai/src/inspect_ai/dataset/_sources/json.py), and [inspect_ai/dataset/_sources/hf.py](/E:/writing-system/_agchain/_reference/inspect_ai/src/inspect_ai/dataset/_sources/hf.py).
- Inspect task and eval configuration semantics are defined in [inspect_ai/_eval/task/task.py](/E:/writing-system/_agchain/_reference/inspect_ai/src/inspect_ai/_eval/task/task.py), [inspect_ai/_eval/registry.py](/E:/writing-system/_agchain/_reference/inspect_ai/src/inspect_ai/_eval/registry.py), [inspect_ai/_eval/eval.py](/E:/writing-system/_agchain/_reference/inspect_ai/src/inspect_ai/_eval/eval.py), and [inspect_ai/_eval/run.py](/E:/writing-system/_agchain/_reference/inspect_ai/src/inspect_ai/_eval/run.py).
- Inspect scorer and metric contracts are defined in [inspect_ai/scorer/_scorer.py](/E:/writing-system/_agchain/_reference/inspect_ai/src/inspect_ai/scorer/_scorer.py) and [inspect_ai/scorer/_metric.py](/E:/writing-system/_agchain/_reference/inspect_ai/src/inspect_ai/scorer/_metric.py).
- Inspect tool and sandbox contracts are defined in [inspect_ai/tool/_tool.py](/E:/writing-system/_agchain/_reference/inspect_ai/src/inspect_ai/tool/_tool.py) and [inspect_ai/util/_sandbox/environment.py](/E:/writing-system/_agchain/_reference/inspect_ai/src/inspect_ai/util/_sandbox/environment.py).
- Inspect eval-log schema, file behavior, and viewer semantics are defined in [inspect_ai/log/_log.py](/E:/writing-system/_agchain/_reference/inspect_ai/src/inspect_ai/log/_log.py), [inspect_ai/log/_recorders/file.py](/E:/writing-system/_agchain/_reference/inspect_ai/src/inspect_ai/log/_recorders/file.py), [inspect_ai/log/_recorders/buffer/database.py](/E:/writing-system/_agchain/_reference/inspect_ai/src/inspect_ai/log/_recorders/buffer/database.py), [eval-logs.qmd](/E:/writing-system/_agchain/_reference/inspect_ai/docs/eval-logs.qmd), [log-viewer.qmd](/E:/writing-system/_agchain/_reference/inspect_ai/docs/log-viewer.qmd), [log-schema.json](/E:/writing-system/_agchain/_reference/inspect_ai/src/inspect_ai/_view/www/log-schema.json), [LogView.tsx](/E:/writing-system/_agchain/_reference/inspect_ai/src/inspect_ai/_view/www/src/app/log-view/LogView.tsx), and [LogsPanel.tsx](/E:/writing-system/_agchain/_reference/inspect_ai/src/inspect_ai/_view/www/src/app/log-list/LogsPanel.tsx).

### AGChain and Legal-10 operational sources verified

- AGChain product/domain expectations were verified in [2026-03-26-agchain-platform-understanding.md](/E:/writing-system/_agchain/docs/_essentials/2026-03-26-agchain-platform-understanding.md) and [2026-03-26-agchain-platform-requirements.md](/E:/writing-system/_agchain/docs/_essentials/2026-03-26-agchain-platform-requirements.md).
- The owner directive for Inspect adoption order was verified in [owner-message.md](/E:/writing-system/_agchain/docs/_essentials/agchain-inspect-braintrust-matching/owner-message.md).
- Legal-10 build-time dataset and bundle behavior were verified in [05-build-pipeline-and-datasets.md](/E:/writing-system/_agchain/docs/_essentials/05-build-pipeline-and-datasets.md), [benchmark_builder.py](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/benchmark_builder.py), [input_assembler.py](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/input_assembler.py), [inspect_backend.py](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/inspect_backend.py), [plan.json](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/benchmark/plan.json), and the Legal-10 docs-site pages under [benchmarks/legal-10](/E:/writing-system/_agchain/docs-site/src/content/docs/benchmarks/legal-10).

## Problem Statement

The existing March 31 datasets draft is not sufficient for the current product direction because it intentionally trims Inspect semantics. It omits Inspect-native sandbox fields, setup fields, files fields, full loader parity, and log-view parity. The user request for this turn is broader: Phase 1 must establish the Inspect-native substrate first, and only then can Phase 2 introduce Legal-10-specific authoring and workflow behavior.

That means the correct Phase 1 target is not a narrow "dataset registry page." The correct target is the set of backend and frontend surfaces required to represent and operate Inspect datasets exactly enough that AGChain can later layer Legal-10 behavior without forking or reinterpreting the substrate.

## Pre-Implementation Contract

No major product, API, observability, persistence, auth-boundary, path-parameter, worker, or inventory decision may be improvised during implementation. If any locked item in this plan needs to change, implementation must stop and this plan must be revised first.

## Locked Product Decisions

- Phase 1 is Inspect-first, not Legal-10-first.
- Phase 1 uses the current AGChain navigation model rather than building a separate mini-application.
- Phase 1 preserves the existing AGChain distinction between build-time datasets and runtime execution. Large Legal-10 DuckDB and raw-source processing stay in build-time workflows. Runtime persistence stores Inspect-ready materialized dataset records, task definitions, run metadata, and log projections.
- Phase 1 stores Inspect-native full eval logs in object storage and stores normalized query projections in Postgres.
- Phase 1 introduces generic AGChain concepts named after Inspect where appropriate instead of hiding Inspect concepts behind Legal-10-specific terminology.
- Phase 2 will add Legal-10 package builders, RP or EU authoring views, and benchmark custom workflows on top of this substrate rather than replacing the dataset/task/log core.

## Locked Scope Boundary

### In scope for Phase 1

- Dataset source definitions
- Dataset materialization and versioning
- Dataset sample browse and preview APIs
- Task or benchmark definitions built on Inspect task semantics
- Scorer registry and metric definitions
- Tool registry and approval or sandbox requirements
- Sandbox profile registry and health validation
- Eval run creation, status tracking, and retry-safe identity
- Eval log listing and log detail viewing with Inspect-compatible structure
- Frontend pages for those exact surfaces
- Full platform API, persistence, storage, and OTel contract

### Explicitly out of scope for Phase 1

- Legal-10-specific RP builder flows
- Legal-10-specific EU builder flows
- Legal-10-specific benchmark packet builders
- Legal-10-only UI overlays, rubric shortcuts, or bundle signing flows
- Broad project-wide customization of AGChain beyond the Inspect-native substrate

## Locked Platform API Surface

All routes live under authenticated platform API patterns and follow the existing AGChain span naming convention used by benchmarks and models.

### Shared conventions

- Every route is authenticated and project-scoped through the existing AGChain focused-project contract.
- List endpoints support `limit`, `cursor` or `offset`, and deterministic sort defaults.
- Mutation routes return the full created or updated resource so the frontend can rehydrate without a second fetch.
- Validation failures use `422` with machine-readable `code`, `message`, and `field_errors`.
- Missing resources use `404`.
- Cross-resource compatibility failures use `409`.
- Long-running operations that enqueue materialization or log projection work return `202` plus operation status payloads when they do not complete inline.

### Locked auth boundary

- Read-only registry, detail, result-view, and operation-poll routes use `require_user_auth`.
- Dataset authoring flows and run launch or retry flows use `require_user_auth`; these are core operator actions inside the focused AGChain project.
- Shared benchmark, scorer, tool, and sandbox definition mutations use `require_superuser` in Phase 1. This plan does not widen mutation authority while it introduces new shared registries and versioned task configuration.
- Existing legacy benchmark-step mutation routes remain `require_superuser`, and new benchmark-version mutation routes follow that same privileged boundary.

### Dataset route contract

- `GET /agchain/datasets`
  - Auth: `require_user_auth`
  - Request query:
    - `project_id`
    - `search`
    - `source_type`
    - `status`
    - `validation_status`
    - `limit`
    - `cursor` or `offset`
  - Response shape:
    - `items`
    - each item includes `dataset_id`, `slug`, `name`, `description`, `status`, `source_type`, `latest_version_id`, `latest_version_label`, `sample_count`, `validation_status`, `updated_at`
    - `next_cursor`
  - Touches:
    - `public.agchain_datasets`
    - `public.agchain_dataset_versions`
    - derived validation summary tables

- `GET /agchain/datasets/new/bootstrap`
  - Auth: `require_user_auth`
  - Request: no body
  - Response shape:
    - `allowed_source_types`
    - `field_spec_defaults`
    - `source_config_defaults`
    - `materialization_defaults`
    - `upload_limits`
    - `validation_rules`
  - Touches:
    - code-owned dataset source catalog

- `POST /agchain/datasets/new/preview`
  - Auth: `require_user_auth`
  - Request body:
    - `project_id`
    - `source_type`
    - `source_upload_id` or `source_uri`
    - `source_config_jsonb`
    - `field_spec_jsonb`
    - `materialization_options_jsonb`
  - Response shape:
    - `ok`
    - `preview_id`
    - `sample_count`
    - `preview_samples`
    - `validation_summary`
    - `field_resolution_summary`
  - Touches:
    - transient preview seam only
    - no persistent dataset rows

- `POST /agchain/datasets`
  - Auth: `require_user_auth`
  - Request body:
    - create-preview contract plus `name`, `slug`, `description`, `tags`, `initial_version_label`
  - Response shape:
    - `ok`
    - `dataset`
    - `version`
  - Touches:
    - `public.agchain_datasets`
    - `public.agchain_dataset_versions`
    - `public.agchain_dataset_samples`
    - `public.agchain_dataset_version_validations`

- `GET /agchain/datasets/{dataset_id}/detail`
  - Auth: `require_user_auth`
  - Request query:
    - `project_id`
    - optional `version_id`
  - Response shape:
    - `dataset`
    - `selected_version`
    - `tab_counts`
    - `warnings_summary`
    - `available_actions`
  - Touches:
    - `public.agchain_datasets`
    - `public.agchain_dataset_versions`
    - `public.agchain_dataset_version_validations`

- `PATCH /agchain/datasets/{dataset_id}`
  - Auth: `require_user_auth`
  - Request body:
    - mutable subset of `name`, `description`, `tags`, `status`
  - Response shape:
    - `ok`
    - `dataset`
  - Touches:
    - `public.agchain_datasets`

- `GET /agchain/datasets/{dataset_id}/versions`
  - Auth: `require_user_auth`
  - Request query:
    - `project_id`
    - `limit`
    - `cursor` or `offset`
  - Response shape:
    - `items`
    - each item includes `dataset_version_id`, `version_label`, `created_at`, `sample_count`, `checksum`, `validation_status`, `base_version_id`
    - `next_cursor`
  - Touches:
    - `public.agchain_dataset_versions`
    - `public.agchain_dataset_version_validations`

- `GET /agchain/datasets/{dataset_id}/versions/{dataset_version_id}/source`
  - Auth: `require_user_auth`
  - Request: no body
  - Response shape:
    - `dataset_version_id`
    - `source_type`
    - `source_uri`
    - `source_config_jsonb`

- `GET /agchain/datasets/{dataset_id}/versions/{dataset_version_id}/mapping`
  - Auth: `require_user_auth`
  - Request: no body
  - Response shape:
    - `dataset_version_id`
    - `field_spec_jsonb`
    - `field_resolution_summary`

- `GET /agchain/datasets/{dataset_id}/versions/{dataset_version_id}/validation`
  - Auth: `require_user_auth`
  - Request: no body
  - Response shape:
    - `dataset_version_id`
    - `validation_status`
    - `issue_groups`
    - `warning_counts`
    - `generated_at`
  - Touches:
    - `public.agchain_dataset_version_validations`

- `POST /agchain/datasets/{dataset_id}/versions/{dataset_version_id}/preview`
  - Auth: `require_user_auth`
  - Request body:
    - optional `refresh=true`
  - Response shape:
    - `ok`
    - `dataset_version_id`
    - `preview_samples`
    - `validation_summary`
  - Touches:
    - validation projection refresh

- `GET /agchain/datasets/{dataset_id}/versions/{dataset_version_id}/samples`
  - Auth: `require_user_auth`
  - Request query:
    - `project_id`
    - `search`
    - `has_setup`
    - `has_sandbox`
    - `has_files`
    - `parse_status`
    - `limit`
    - `cursor` or `offset`
  - Response shape:
    - `items`
    - each item includes `sample_id`, `input_preview`, `target_preview`, `choice_count`, `metadata_summary`, `has_setup`, `has_sandbox`, `has_files`, `parse_status`
    - `next_cursor`

- `GET /agchain/datasets/{dataset_id}/versions/{dataset_version_id}/samples/{sample_id}`
  - Auth: `require_user_auth`
  - Request: no body
  - Response shape:
    - `sample_id`
    - `canonical_sample_json`
    - `metadata_json`
    - `setup`
    - `sandbox`
    - `files`

- `POST /agchain/datasets/{dataset_id}/version-drafts`
  - Auth: `require_user_auth`
  - Request body:
    - `base_version_id`
  - Response shape:
    - `ok`
    - `draft`
  - Touches:
    - `public.agchain_dataset_version_drafts`

- `GET /agchain/datasets/{dataset_id}/version-drafts/{draft_id}`
  - Auth: `require_user_auth`
  - Request: no body
  - Response shape:
    - `draft_id`
    - `base_version_id`
    - `source_config_jsonb`
    - `field_spec_jsonb`
    - `materialization_options_jsonb`
    - `preview_summary`
    - `validation_summary`
    - `dirty_state`

- `PATCH /agchain/datasets/{dataset_id}/version-drafts/{draft_id}`
  - Auth: `require_user_auth`
  - Request body:
    - mutable subset of draft source config, field spec, materialization options, version label
  - Response shape:
    - `ok`
    - `draft`

- `POST /agchain/datasets/{dataset_id}/version-drafts/{draft_id}/preview`
  - Auth: `require_user_auth`
  - Request body:
    - current draft payload or `use_saved=true`
  - Response shape:
    - `ok`
    - `preview_samples`
    - `validation_summary`
    - `diff_summary`

- `POST /agchain/datasets/{dataset_id}/version-drafts/{draft_id}/commit`
  - Auth: `require_user_auth`
  - Request body:
    - optional `commit_message`
  - Response shape:
    - `ok`
    - `dataset`
    - `version`
  - Touches:
    - `public.agchain_dataset_versions`
    - `public.agchain_dataset_samples`
    - `public.agchain_dataset_version_validations`
    - `public.agchain_dataset_version_drafts`

### Route mounting contract

- `services/platform-api/app/main.py`
  Must mount `agchain_datasets.router`, `agchain_scorers.router`, `agchain_tools.router`, `agchain_sandboxes.router`, `agchain_runs.router`, `agchain_results.router`, and `agchain_operations.router` adjacent to existing AGChain routers.
- `services/platform-api/app/api/routes/agchain_benchmarks.py`
  Existing benchmark router remains mounted in place and is extended for Inspect-native task definition fields, benchmark-version readbacks, and server-side validation.
- `services/platform-api/app/domain/agchain/__init__.py`
  Must export dataset registry, task registry, scorer registry, tool registry, sandbox registry, run registry, log projection, operation queue, and shared AGChain types used by the routers and worker.

### Transaction, idempotency, and background-work contract

- `POST /agchain/datasets`
  Single transaction for registry row, version row, validation row, and sample projection rows after preview has succeeded.
- `POST /agchain/datasets/{dataset_id}/version-drafts/{draft_id}/commit`
  Single transaction for immutable version creation plus draft closure. It must be idempotent on `(draft_id, committed_version_id)` so browser retries do not create duplicate versions.
- `POST /agchain/runs`
  Inserts the run row and any required `agchain_operations` background-work row atomically so the UI never sees a launched operation without its owning run record.
- Preview endpoints are non-committing and must never write immutable dataset-version rows.
- Draft rows are mutable and expire via `expires_at`; expired drafts return `409` with an explicit `draft_expired` code.
- Any route that returns `202` must also persist a durable `public.agchain_operations` row and return an operation status payload with `operation_id`, `operation_type`, `status`, `poll_url`, `cancel_url` nullable, and `started_at`.
- If sample normalization, validation projection, run handoff, or log projection exceeds synchronous thresholds, the platform API enqueues Postgres-backed background work and returns `202`. That worker path is first-class in this plan, not implicit.

### Background operation contract

- `202`-eligible flows in this phase:
  - `POST /agchain/datasets/new/preview`
  - `POST /agchain/datasets`
  - `POST /agchain/datasets/{dataset_id}/versions/{dataset_version_id}/preview`
  - `POST /agchain/datasets/{dataset_id}/version-drafts/{draft_id}/preview`
  - `POST /agchain/datasets/{dataset_id}/version-drafts/{draft_id}/commit`
  - `POST /agchain/runs`
  - internal log projection triggered by run completion
- `public.agchain_operations` is the durable queue and status resource. Each row stores:
  - `operation_id`
  - `project_id`
  - `operation_type`
  - `target_kind`
  - `target_id`
  - `status`
  - `request_hash`
  - `idempotency_key`
  - `progress_jsonb`
  - `attempt_count`
  - `lease_expires_at`
  - `heartbeat_at`
  - `cancel_requested_at`
  - `completed_at`
  - `last_error_jsonb`
  - `result_jsonb`
- `services/platform-api/app/workers/agchain_operations.py` owns queue polling and leases. This phase does not introduce an external broker.
- Retry model:
  - preview, materialization, and log-projection operations retry up to `3` times with backoff
  - run-launch handoff retries up to `2` times before terminal failure
  - terminal statuses are `succeeded`, `failed`, or `cancelled`
- Timeout model:
  - preview: `5m`
  - materialization: `15m`
  - run-launch handoff: `2m`
  - log projection: `10m`
- Cancellation model:
  - queued or running preview, materialization, and run-launch operations may be cancelled
  - cancellation is best-effort and records final state on the operation row
  - immutable dataset-version rows must not be partially committed after a successful cancellation

### Operations

- `GET /agchain/operations/{operation_id}`
  - Auth: `require_user_auth`
  - Request: no body
  - Response shape:
    - `operation_id`
    - `operation_type`
    - `target_kind`
    - `target_id`
    - `status`
    - `attempt_count`
    - `progress`
    - `last_error`
    - `result`
    - `created_at`
    - `started_at`
    - `heartbeat_at`
    - `completed_at`
  - Touches:
    - `public.agchain_operations`
- `POST /agchain/operations/{operation_id}/cancel`
  - Auth: `require_user_auth`
  - Request body: none
  - Response shape:
    - `ok`
    - `operation`
  - Touches:
    - `public.agchain_operations`

### Dataset endpoint authority

- The only authoritative dataset endpoint set for this plan is the `### Dataset route contract` above.
- No second dataset route list exists anywhere else in this plan.
- The page-to-backend matrix below may reference only those routes plus the `diff_summary` already returned by draft-preview responses; it must not introduce additional dataset endpoints.

### Dataset page-to-backend support matrix

- `/app/agchain/datasets`
  Backed by `GET /agchain/datasets`
- `/app/agchain/datasets/new`
  Backed by `GET /agchain/datasets/new/bootstrap`, `POST /agchain/datasets/new/preview`, and `POST /agchain/datasets`
- `/app/agchain/datasets/:datasetId`
  Backed by `GET /agchain/datasets/{dataset_id}/detail`, `PATCH /agchain/datasets/{dataset_id}`, `GET /agchain/datasets/{dataset_id}/versions`, `GET /agchain/datasets/{dataset_id}/versions/{dataset_version_id}/source`, `GET /agchain/datasets/{dataset_id}/versions/{dataset_version_id}/mapping`, `GET /agchain/datasets/{dataset_id}/versions/{dataset_version_id}/validation`, `GET /agchain/datasets/{dataset_id}/versions/{dataset_version_id}/samples`, `GET /agchain/datasets/{dataset_id}/versions/{dataset_version_id}/samples/{sample_id}`, and `POST /agchain/datasets/{dataset_id}/versions/{dataset_version_id}/preview`
- `/app/agchain/datasets/:datasetId/versions/new`
  Backed by `POST /agchain/datasets/{dataset_id}/version-drafts`, `GET /agchain/datasets/{dataset_id}/version-drafts/{draft_id}`, `PATCH /agchain/datasets/{dataset_id}/version-drafts/{draft_id}`, `POST /agchain/datasets/{dataset_id}/version-drafts/{draft_id}/preview`, and `POST /agchain/datasets/{dataset_id}/version-drafts/{draft_id}/commit`

### Dataset source payload contract

- `source_type`: `csv`, `json`, `jsonl`, `huggingface`
- `source_uri`: file upload reference, object-storage URI, or Hugging Face dataset path
- `source_config_jsonb`
  CSV supports delimiter, headers, dialect, encoding.
  JSON and JSONL support path hints and line mode.
  Hugging Face supports `path`, `split`, `name`, `data_dir`, `revision`, `trust`, `cached`, and extra kwargs.
- `field_spec_jsonb`
  Explicit mapping for Inspect sample fields including `input`, `messages`, `choices`, `target`, `id`, `metadata`, `sandbox`, `files`, and `setup`.
- `materialization_options_jsonb`
  Includes `shuffle`, `shuffle_choices`, `limit`, `auto_id`, and deterministic seed.

### Benchmarks or Tasks

`Benchmarks` becomes the frontend label for AGChain benchmarking, but the backend schema for Phase 1 is Inspect-task-native.

- `GET /agchain/benchmarks`
  - Auth: `require_user_auth`
  - Request query:
    - `project_id`
    - `search`
    - `status`
    - `dataset_version_id`
    - `limit`
    - `cursor` or `offset`
  - Response shape:
    - `items`
    - each item includes `benchmark_id`, `benchmark_slug`, `benchmark_name`, `description`, `latest_version_id`, `latest_version_label`, `dataset_version_id`, `scorer_count`, `tool_count`, `status`, `validation_status`, `updated_at`
    - `next_cursor`
  - Touches:
    - `public.agchain_benchmarks`
    - `public.agchain_benchmark_versions`
    - read-only joins into `public.agchain_dataset_versions`
- `POST /agchain/benchmarks`
  - Auth: `require_superuser`
  - Request body:
    - `project_id`
    - `benchmark_name`
    - `benchmark_slug`
    - `description`
    - `tags`
  - Response shape:
    - `ok`
    - `benchmark`
  - Touches:
    - `public.agchain_benchmarks`
- `GET /agchain/benchmarks/{benchmark_slug}`
  - Auth: `require_user_auth`
  - Request: no body
  - Response shape:
    - `benchmark`
    - `current_draft_version`
    - `current_published_version`
    - `recent_runs_count`
  - Touches:
    - `public.agchain_benchmarks`
    - `public.agchain_benchmark_versions`
    - `public.agchain_runs`
- `PATCH /agchain/benchmarks/{benchmark_slug}`
  - Auth: `require_superuser`
  - Request body:
    - mutable subset of `benchmark_name`, `description`, `tags`, and publish pointers
  - Response shape:
    - `ok`
    - `benchmark`
  - Touches:
    - `public.agchain_benchmarks`
- `GET /agchain/benchmarks/{benchmark_slug}/versions`
  - Auth: `require_user_auth`
  - Request query:
    - `limit`
    - `cursor` or `offset`
  - Response shape:
    - `items`
    - each item includes `benchmark_version_id`, `version_label`, `version_status`, `dataset_version_id`, `validation_status`, `scorer_count`, `tool_count`, `created_at`, `updated_at`
    - `next_cursor`
  - Touches:
    - `public.agchain_benchmark_versions`
    - `public.agchain_benchmark_version_scorers`
    - `public.agchain_benchmark_version_tools`
- `POST /agchain/benchmarks/{benchmark_slug}/versions`
  - Auth: `require_superuser`
  - Request body:
    - `version_label`
    - `dataset_version_id`
    - `task_name`
    - `task_file_ref` or `task_definition_jsonb`
    - `solver_plan_jsonb`
    - `scorer_refs_jsonb`
    - `tool_refs_jsonb`
    - `sandbox_profile_id`
    - `sandbox_overrides_jsonb`
    - `model_roles_jsonb`
    - `generate_config_jsonb`
    - `eval_config_jsonb`
    - `publish` optional boolean
  - Response shape:
    - `ok`
    - `benchmark_version`
    - `validation_summary`
  - Touches:
    - `public.agchain_benchmark_versions`
    - `public.agchain_benchmark_version_scorers`
    - `public.agchain_benchmark_version_tools`
    - read-only joins into `public.agchain_dataset_versions`
    - read-only joins into `public.agchain_scorer_versions`
    - read-only joins into `public.agchain_tool_versions`
    - read-only joins into `public.agchain_sandbox_profiles`
- `GET /agchain/benchmarks/{benchmark_slug}/versions/{benchmark_version_id}`
  - Auth: `require_user_auth`
  - Request: no body
  - Response shape:
    - `benchmark_version`
    - `dataset_version`
    - `scorer_refs`
    - `tool_refs`
    - `sandbox_profile`
    - `model_roles`
    - `generate_config`
    - `eval_config`
    - `validation_summary`
  - Touches:
    - `public.agchain_benchmark_versions`
    - `public.agchain_benchmark_version_scorers`
    - `public.agchain_benchmark_version_tools`
    - `public.agchain_dataset_versions`
    - `public.agchain_scorer_versions`
    - `public.agchain_tool_versions`
    - `public.agchain_sandbox_profiles`
- `POST /agchain/benchmarks/{benchmark_slug}/validate`
  - Auth: `require_superuser`
  - Request body:
    - `benchmark_version_id` or a draft payload using the create-version contract
  - Response shape:
    - `ok`
    - `issues`
    - `warnings`
    - `resolved_refs`
    - `compatibility_summary`
  - Touches:
    - `public.agchain_benchmark_versions`
    - `public.agchain_dataset_versions`
    - `public.agchain_scorer_versions`
    - `public.agchain_tool_versions`
    - `public.agchain_sandbox_profiles`
    - `public.agchain_model_targets`

### Task definition payload contract

- `dataset_version_id`
- `task_name`
- `task_file_ref` or `task_definition_jsonb`
  Phase 1 supports structured task-definition JSON that maps to Inspect task semantics without requiring arbitrary code execution in the platform API.
- `solver_plan_jsonb`
  Ordered solver or plan steps as a structured representation.
- `scorer_refs_jsonb`
- `tool_refs_jsonb`
- `sandbox_profile_id`
- `sandbox_overrides_jsonb`
- `model_roles_jsonb`
- `generate_config_jsonb`
- `eval_config_jsonb`
  Includes `fail_on_error`, `retry_on_error`, `epochs`, `message_limit`, `token_limit`, `time_limit`, `working_limit`, `cost_limit`, `max_samples`, `max_tasks`, `max_subprocesses`, `log_samples`, `log_images`, `log_buffer`, and sync intervals as supported by the chosen Inspect parity tranche.

### Benchmark step relationship contract

- `public.agchain_benchmark_steps` remains the step-authoring table used by the existing benchmark workbench. This plan does not delete it, replace it, or leave it orphaned.
- `public.agchain_benchmark_versions.task_definition_jsonb` is the resolved runtime snapshot used for compatibility validation, run launch, immutable version readback, and later parity work against Inspect task semantics.
- Legacy benchmark versions may have `task_definition_jsonb` null. In that case the platform API resolves the runtime task definition from ordered `agchain_benchmark_steps`, `agchain_benchmark_model_targets`, and version-level config.
- Phase 1-authored benchmark versions continue to use step rows for step-by-step editing, but `validate` and `publish` must refresh `task_definition_jsonb` from the current ordered steps plus dataset, scorer, tool, sandbox, and model configuration. There is no competing second source of truth at runtime.

### Scorers

- `GET /agchain/scorers`
  - Auth: `require_user_auth`
  - Request query:
    - `project_id`
    - `search`
    - `is_builtin`
    - `limit`
    - `cursor` or `offset`
  - Response shape:
    - `items`
    - each item includes `scorer_id`, `scorer_name`, `display_name`, `latest_version_id`, `metric_names`, `is_builtin`, `updated_at`
    - `next_cursor`
  - Touches:
    - `public.agchain_scorers`
    - `public.agchain_scorer_versions`
- `POST /agchain/scorers`
  - Auth: `require_superuser`
  - Request body:
    - `project_id`
    - `scorer_name`
    - `display_name`
    - `description`
    - `is_builtin`
  - Response shape:
    - `ok`
    - `scorer`
  - Touches:
    - `public.agchain_scorers`
- `GET /agchain/scorers/{scorer_id}`
  - Auth: `require_user_auth`
  - Request: no body
  - Response shape:
    - `scorer`
    - `latest_version`
    - `versions`
  - Touches:
    - `public.agchain_scorers`
    - `public.agchain_scorer_versions`
- `PATCH /agchain/scorers/{scorer_id}`
  - Auth: `require_superuser`
  - Request body:
    - mutable subset of scorer metadata
  - Response shape:
    - `ok`
    - `scorer`
  - Touches:
    - `public.agchain_scorers`
- `GET /agchain/scorers/{scorer_id}/versions`
  - Auth: `require_user_auth`
  - Request query:
    - `limit`
    - `cursor` or `offset`
  - Response shape:
    - `items`
    - each item includes `scorer_version_id`, `version_label`, `metric_names`, `status`, `updated_at`
    - `next_cursor`
  - Touches:
    - `public.agchain_scorer_versions`
- `POST /agchain/scorers/{scorer_id}/versions`
  - Auth: `require_superuser`
  - Request body:
    - `version_label`
    - `metric_definitions_jsonb`
    - `scorer_config_jsonb`
    - `output_schema_jsonb`
    - `notes`
  - Response shape:
    - `ok`
    - `scorer_version`
  - Touches:
    - `public.agchain_scorer_versions`

Each scorer record stores:

- `scorer_name`
- `display_name`
- `metric_definitions_jsonb`
- `scorer_config_jsonb`
- `output_schema_jsonb`
- `is_builtin`

### Tools

- `GET /agchain/tools`
  - Auth: `require_user_auth`
  - Request query:
    - `project_id`
    - `search`
    - `approval_required`
    - `limit`
    - `cursor` or `offset`
  - Response shape:
    - `items`
    - each item includes `tool_id`, `tool_name`, `display_name`, `latest_version_id`, `approval_required`, `parallel_tool_calls_supported`, `updated_at`
    - `next_cursor`
  - Touches:
    - `public.agchain_tools`
    - `public.agchain_tool_versions`
- `POST /agchain/tools`
  - Auth: `require_superuser`
  - Request body:
    - `project_id`
    - `tool_name`
    - `display_name`
    - `description`
    - `approval_required`
    - `parallel_tool_calls_supported`
  - Response shape:
    - `ok`
    - `tool`
  - Touches:
    - `public.agchain_tools`
- `GET /agchain/tools/{tool_id}`
  - Auth: `require_user_auth`
  - Request: no body
  - Response shape:
    - `tool`
    - `latest_version`
    - `versions`
  - Touches:
    - `public.agchain_tools`
    - `public.agchain_tool_versions`
- `PATCH /agchain/tools/{tool_id}`
  - Auth: `require_superuser`
  - Request body:
    - mutable subset of tool metadata
  - Response shape:
    - `ok`
    - `tool`
  - Touches:
    - `public.agchain_tools`
- `GET /agchain/tools/{tool_id}/versions`
  - Auth: `require_user_auth`
  - Request query:
    - `limit`
    - `cursor` or `offset`
  - Response shape:
    - `items`
    - each item includes `tool_version_id`, `version_label`, `approval_required`, `parallel_tool_calls_supported`, `updated_at`
    - `next_cursor`
  - Touches:
    - `public.agchain_tool_versions`
- `POST /agchain/tools/{tool_id}/versions`
  - Auth: `require_superuser`
  - Request body:
    - `version_label`
    - `tool_schema_jsonb`
    - `approval_required`
    - `parallel_tool_calls_supported`
    - `sandbox_requirements_jsonb`
    - `viewer_hints_jsonb`
    - `notes`
  - Response shape:
    - `ok`
    - `tool_version`
  - Touches:
    - `public.agchain_tool_versions`

Each tool record stores:

- `tool_name`
- `display_name`
- `description`
- `tool_schema_jsonb`
- `approval_required`
- `parallel_tool_calls_supported`
- `sandbox_requirements_jsonb`
- `viewer_hints_jsonb`

### Sandboxes

- `GET /agchain/sandboxes`
  - Auth: `require_user_auth`
  - Request query:
    - `project_id`
    - `provider`
    - `health_status`
    - `search`
    - `limit`
    - `cursor` or `offset`
  - Response shape:
    - `items`
    - each item includes `sandbox_profile_id`, `provider`, `profile_name`, `health_status`, `health_checked_at`, `updated_at`
    - `next_cursor`
  - Touches:
    - `public.agchain_sandbox_profiles`
- `POST /agchain/sandboxes`
  - Auth: `require_superuser`
  - Request body:
    - `project_id`
    - `provider`
    - `profile_name`
    - `config_jsonb`
    - `limits_jsonb`
    - `connection_capabilities_jsonb`
    - `notes`
  - Response shape:
    - `ok`
    - `sandbox_profile`
  - Touches:
    - `public.agchain_sandbox_profiles`
- `GET /agchain/sandboxes/{sandbox_id}`
  - Auth: `require_user_auth`
  - Request: no body
  - Response shape:
    - `sandbox_profile`
    - `recent_health_checks`
  - Touches:
    - `public.agchain_sandbox_profiles`
- `PATCH /agchain/sandboxes/{sandbox_id}`
  - Auth: `require_superuser`
  - Request body:
    - mutable subset of `profile_name`, `config_jsonb`, `limits_jsonb`, `connection_capabilities_jsonb`, and `notes`
  - Response shape:
    - `ok`
    - `sandbox_profile`
  - Touches:
    - `public.agchain_sandbox_profiles`
- `POST /agchain/sandboxes/{sandbox_id}/health-check`
  - Auth: `require_superuser`
  - Request body:
    - `force_refresh` optional boolean
  - Response shape:
    - `ok`
    - `health_status`
    - `health_checked_at`
    - `diagnostic_summary`
  - Touches:
    - `public.agchain_sandbox_profiles`
    - optional `public.agchain_operations` if a long-running remote probe returns `202`

Each sandbox profile stores:

- `provider`
- `profile_name`
- `config_jsonb`
- `limits_jsonb`
- `connection_capabilities_jsonb`
- `health_status`
- `health_checked_at`

### Runs

- `GET /agchain/runs`
  - Auth: `require_user_auth`
  - Request query:
    - `project_id`
    - `status`
    - `benchmark_id`
    - `benchmark_version_id`
    - `limit`
    - `cursor` or `offset`
  - Response shape:
    - `items`
    - each item includes `run_id`, `benchmark_id`, `benchmark_version_id`, `evaluated_model_target_id`, `judge_model_target_id`, `status`, `submitted_at`, `started_at`, `completed_at`, `sample_count`, `score_summary`, `retry_of_run_id`
    - `next_cursor`
  - Touches:
    - `public.agchain_runs`
    - read-only joins into `public.agchain_benchmarks`
    - read-only joins into `public.agchain_run_log_headers`
- `POST /agchain/runs`
  - Auth: `require_user_auth`
  - Request body:
    - `project_id`
    - `benchmark_version_id`
    - `dataset_version_id`
    - `evaluated_model_target_id`
    - `judge_model_target_id`
    - `tool_policy_jsonb`
    - `sandbox_profile_id`
    - `resolved_generate_config_jsonb`
    - `resolved_eval_config_jsonb`
    - `run_tags_jsonb`
    - `idempotency_key` optional string
  - Response shape:
    - `ok`
    - `run`
    - `operation` nullable
    - `launch_status`
  - Touches:
    - `public.agchain_runs`
    - read-only joins into `public.agchain_benchmark_versions`
    - read-only joins into `public.agchain_dataset_versions`
    - read-only joins into `public.agchain_model_targets`
    - `public.agchain_operations`
- `GET /agchain/runs/{run_id}`
  - Auth: `require_user_auth`
  - Request: no body
  - Response shape:
    - `run`
    - `latest_operation`
    - `resolved_contract`
    - `recent_failures`
  - Touches:
    - `public.agchain_runs`
    - `public.agchain_operations`
- `POST /agchain/runs/{run_id}/cancel`
  - Auth: `require_user_auth`
  - Request body: none
  - Response shape:
    - `ok`
    - `run`
    - `operation` nullable
  - Touches:
    - `public.agchain_runs`
    - `public.agchain_operations`
- `POST /agchain/runs/{run_id}/retry`
  - Auth: `require_user_auth`
  - Request body:
    - `idempotency_key` optional string
  - Response shape:
    - `ok`
    - `run`
    - `operation`
  - Touches:
    - `public.agchain_runs`
    - `public.agchain_operations`
- `GET /agchain/runs/{run_id}/samples`
  - Auth: `require_user_auth`
  - Request query:
    - `search`
    - `status`
    - `limit`
    - `cursor` or `offset`
  - Response shape:
    - `items`
    - each item includes `sample_run_id`, `sample_id`, `input_preview`, `status`, `score_summary`, `token_usage`, `error_summary`
    - `next_cursor`
  - Touches:
    - `public.agchain_run_log_samples`

Run create payload stores:

- `benchmark_version_id`
- `dataset_version_id`
- `evaluated_model_target_id`
- `judge_model_target_id`
- `tool_policy_jsonb`
- `sandbox_profile_id`
- `resolved_generate_config_jsonb`
- `resolved_eval_config_jsonb`
- `run_tags_jsonb`

### Results and Logs

- `GET /agchain/results`
  - Auth: `require_user_auth`
  - Request query:
    - `project_id`
    - `benchmark_id`
    - `status`
    - `evaluated_model_target_id`
    - `compare_by`
    - `limit`
    - `cursor` or `offset`
  - Response shape:
    - `items`
    - each item includes `run_id`, `benchmark_name`, `benchmark_version_label`, `evaluated_model_label`, `judge_model_label`, `status`, `aggregate_scores`, `sample_count`, `submitted_at`, `completed_at`
    - `next_cursor`
  - Touches:
    - `public.agchain_runs`
    - `public.agchain_run_log_headers`
    - read-only joins into `public.agchain_benchmarks`
    - read-only joins into `public.agchain_model_targets`
- `GET /agchain/results/{run_id}/log`
  - Auth: `require_user_auth`
  - Request: no body
  - Response shape:
    - `log_header`
    - `viewer_tabs`
    - `artifact_links`
  - Touches:
    - `public.agchain_run_log_headers`
    - storage bucket `agchain-inspect-logs`
- `GET /agchain/results/{run_id}/log/samples`
  - Auth: `require_user_auth`
  - Request query:
    - `search`
    - `status`
    - `limit`
    - `cursor` or `offset`
  - Response shape:
    - `items`
    - each item includes `sample_run_id`, `sample_id`, `status`, `score_summary`, `error_summary`, `token_usage`, `has_attachments`
    - `next_cursor`
  - Touches:
    - `public.agchain_run_log_samples`
- `GET /agchain/results/{run_id}/log/samples/{sample_run_id}`
  - Auth: `require_user_auth`
  - Request: no body
  - Response shape:
    - `sample`
    - `events`
    - `attachments`
    - `scores`
    - `usage`
    - `raw_links`
  - Touches:
    - `public.agchain_run_log_samples`
    - `public.agchain_run_log_sample_events`
    - storage bucket `agchain-inspect-attachments`
- `GET /agchain/results/{run_id}/log/json`
  - Auth: `require_user_auth`
  - Request: no body
  - Response shape:
    - raw streaming payload with Inspect-compatible JSON body
  - Touches:
    - storage bucket `agchain-inspect-logs`

## Locked Persistence Surface

### Locked migration contract

| Migration | Schema effect | Data impact | RLS and operational notes | Rollback posture |
|-----------|---------------|-------------|---------------------------|------------------|
| `20260331141000_agchain_inspect_dataset_registry.sql` | Creates `agchain_datasets`, `agchain_dataset_versions`, `agchain_dataset_version_drafts`, `agchain_dataset_samples`, and `agchain_dataset_version_validations`; adds dataset indexes named below | No destructive data impact; all dataset tables are additive and start empty | No direct `anon` or `authenticated` grants; platform-api writes with service-role access and keeps project auth at the API layer | Safe to roll back by dropping only these new dataset tables before downstream references land |
| `20260331143000_agchain_inspect_component_registries.sql` | Creates `agchain_scorers`, `agchain_scorer_versions`, `agchain_tools`, `agchain_tool_versions`, `agchain_sandbox_profiles`, `agchain_benchmark_version_scorers`, and `agchain_benchmark_version_tools`; alters `agchain_benchmark_versions` with dataset, task, model, sandbox, and config columns | Existing benchmark rows are preserved and backfilled with null-safe inspect-extension columns; no destructive rewrite of current benchmark state | Existing benchmark tables keep service-role write ownership; new component tables follow the same grant pattern; foreign keys are additive | Added columns may remain dormant if a rollback is required; new component tables and join tables can be removed without touching existing benchmark identity rows |
| `20260331145000_agchain_inspect_runs_logs_operations.sql` | Alters `agchain_runs` with dataset, sandbox, resolved-config, log-storage, retry-lineage, and projection-status columns; creates `agchain_operations`, `agchain_run_log_headers`, `agchain_run_log_samples`, and `agchain_run_log_sample_events` | Existing `agchain_runs` rows are preserved and backfilled with nullable inspect-extension columns; log projections only populate for new or reprojected runs | `agchain_operations` is the durable queue leased by the platform-api worker; unique idempotency applies on `(project_id, operation_type, idempotency_key)` when an idempotency key is present | Projection tables can be dropped without losing authoritative log blobs; additive `agchain_runs` columns can be left dormant until a follow-up cleanup migration |

### Column-level schema contract

No migration owner should invent additional phase-1 columns beyond the tables and columns listed below. If implementation discovers a missing field, the plan must be revised before the migration is written.

#### `20260331141000_agchain_inspect_dataset_registry.sql`

- `public.agchain_datasets`
  - `dataset_id uuid primary key default gen_random_uuid()`
  - `project_id uuid not null references public.user_projects(project_id) on delete cascade`
  - `slug text not null`
  - `name text not null`
  - `description text not null default ''`
  - `tags_jsonb jsonb not null default '[]'::jsonb`
  - `status text not null default 'active'`
  - `source_type text not null`
  - `latest_version_id uuid null references public.agchain_dataset_versions(dataset_version_id) on delete set null` added after `public.agchain_dataset_versions` exists
  - `created_by uuid not null references auth.users(id) on delete cascade`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - unique `(project_id, slug)`
- `public.agchain_dataset_versions`
  - `dataset_version_id uuid primary key default gen_random_uuid()`
  - `dataset_id uuid not null references public.agchain_datasets(dataset_id) on delete cascade`
  - `version_label text not null`
  - `base_version_id uuid null references public.agchain_dataset_versions(dataset_version_id) on delete set null`
  - `source_type text not null`
  - `source_uri text null`
  - `source_config_jsonb jsonb not null default '{}'::jsonb`
  - `field_spec_jsonb jsonb not null default '{}'::jsonb`
  - `materialization_options_jsonb jsonb not null default '{}'::jsonb`
  - `parse_summary_jsonb jsonb not null default '{}'::jsonb`
  - `validation_summary_jsonb jsonb not null default '{}'::jsonb`
  - `sample_count integer not null default 0`
  - `checksum text not null`
  - `created_by uuid not null references auth.users(id) on delete cascade`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - unique `(dataset_id, version_label)`
- `public.agchain_dataset_version_drafts`
  - `draft_id uuid primary key default gen_random_uuid()`
  - `dataset_id uuid not null references public.agchain_datasets(dataset_id) on delete cascade`
  - `base_version_id uuid null references public.agchain_dataset_versions(dataset_version_id) on delete set null`
  - `version_label text null`
  - `source_config_jsonb jsonb not null default '{}'::jsonb`
  - `field_spec_jsonb jsonb not null default '{}'::jsonb`
  - `materialization_options_jsonb jsonb not null default '{}'::jsonb`
  - `preview_summary_jsonb jsonb not null default '{}'::jsonb`
  - `validation_summary_jsonb jsonb not null default '{}'::jsonb`
  - `dirty_state_jsonb jsonb not null default '{}'::jsonb`
  - `draft_status text not null default 'open'`
  - `expires_at timestamptz not null`
  - `created_by uuid not null references auth.users(id) on delete cascade`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - unique `(dataset_id, created_by, base_version_id, draft_status)` where `draft_status = 'open'`
- `public.agchain_dataset_samples`
  - `dataset_sample_id uuid primary key default gen_random_uuid()`
  - `dataset_version_id uuid not null references public.agchain_dataset_versions(dataset_version_id) on delete cascade`
  - `sample_id text not null`
  - `canonical_sample_jsonb jsonb not null`
  - `summary_jsonb jsonb not null default '{}'::jsonb`
  - `metadata_jsonb jsonb not null default '{}'::jsonb`
  - `has_setup boolean not null default false`
  - `has_sandbox boolean not null default false`
  - `has_files boolean not null default false`
  - `parse_status text not null default 'ok'`
  - unique `(dataset_version_id, sample_id)`
- `public.agchain_dataset_version_validations`
  - `dataset_version_validation_id uuid primary key default gen_random_uuid()`
  - `dataset_version_id uuid not null references public.agchain_dataset_versions(dataset_version_id) on delete cascade`
  - `source_hash text not null`
  - `validation_status text not null`
  - `issue_groups_jsonb jsonb not null default '{}'::jsonb`
  - `warning_count integer not null default 0`
  - `duplicate_id_count integer not null default 0`
  - `missing_field_count integer not null default 0`
  - `unsupported_payload_count integer not null default 0`
  - `generated_at timestamptz not null default now()`

#### `20260331143000_agchain_inspect_component_registries.sql`

- `public.agchain_scorers`
  - `scorer_id uuid primary key default gen_random_uuid()`
  - `project_id uuid not null references public.user_projects(project_id) on delete cascade`
  - `scorer_name text not null`
  - `display_name text not null`
  - `description text not null default ''`
  - `is_builtin boolean not null default false`
  - `latest_version_id uuid null references public.agchain_scorer_versions(scorer_version_id) on delete set null` added after `public.agchain_scorer_versions` exists
  - `created_by uuid not null references auth.users(id) on delete cascade`
  - `archived_at timestamptz null`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - unique `(project_id, scorer_name)`
- `public.agchain_scorer_versions`
  - `scorer_version_id uuid primary key default gen_random_uuid()`
  - `scorer_id uuid not null references public.agchain_scorers(scorer_id) on delete cascade`
  - `version_label text not null`
  - `metric_definitions_jsonb jsonb not null default '{}'::jsonb`
  - `scorer_config_jsonb jsonb not null default '{}'::jsonb`
  - `output_schema_jsonb jsonb not null default '{}'::jsonb`
  - `notes text not null default ''`
  - `status text not null default 'draft'`
  - `created_by uuid not null references auth.users(id) on delete cascade`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - unique `(scorer_id, version_label)`
- `public.agchain_tools`
  - `tool_id uuid primary key default gen_random_uuid()`
  - `project_id uuid not null references public.user_projects(project_id) on delete cascade`
  - `tool_name text not null`
  - `display_name text not null`
  - `description text not null default ''`
  - `approval_mode text not null default 'manual'`
  - `sandbox_requirement_jsonb jsonb not null default '{}'::jsonb`
  - `latest_version_id uuid null references public.agchain_tool_versions(tool_version_id) on delete set null` added after `public.agchain_tool_versions` exists
  - `created_by uuid not null references auth.users(id) on delete cascade`
  - `archived_at timestamptz null`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - unique `(project_id, tool_name)`
- `public.agchain_tool_versions`
  - `tool_version_id uuid primary key default gen_random_uuid()`
  - `tool_id uuid not null references public.agchain_tools(tool_id) on delete cascade`
  - `version_label text not null`
  - `input_schema_jsonb jsonb not null default '{}'::jsonb`
  - `output_schema_jsonb jsonb not null default '{}'::jsonb`
  - `tool_config_jsonb jsonb not null default '{}'::jsonb`
  - `parallel_calls_allowed boolean not null default false`
  - `status text not null default 'draft'`
  - `created_by uuid not null references auth.users(id) on delete cascade`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - unique `(tool_id, version_label)`
- `public.agchain_sandbox_profiles`
  - `sandbox_profile_id uuid primary key default gen_random_uuid()`
  - `project_id uuid not null references public.user_projects(project_id) on delete cascade`
  - `provider text not null`
  - `profile_name text not null`
  - `display_name text not null`
  - `description text not null default ''`
  - `config_jsonb jsonb not null default '{}'::jsonb`
  - `limits_jsonb jsonb not null default '{}'::jsonb`
  - `capabilities_jsonb jsonb not null default '{}'::jsonb`
  - `health_status text not null default 'unknown'`
  - `last_health_check_at timestamptz null`
  - `last_health_check_jsonb jsonb not null default '{}'::jsonb`
  - `created_by uuid not null references auth.users(id) on delete cascade`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - unique `(project_id, provider, profile_name)`
- `public.agchain_benchmark_version_scorers`
  - `benchmark_version_scorer_id uuid primary key default gen_random_uuid()`
  - `benchmark_version_id uuid not null references public.agchain_benchmark_versions(benchmark_version_id) on delete cascade`
  - `scorer_version_id uuid not null references public.agchain_scorer_versions(scorer_version_id) on delete restrict`
  - `position integer not null`
  - `alias text null`
  - `config_overrides_jsonb jsonb not null default '{}'::jsonb`
  - unique `(benchmark_version_id, position)`
- `public.agchain_benchmark_version_tools`
  - `benchmark_version_tool_id uuid primary key default gen_random_uuid()`
  - `benchmark_version_id uuid not null references public.agchain_benchmark_versions(benchmark_version_id) on delete cascade`
  - `tool_version_id uuid not null references public.agchain_tool_versions(tool_version_id) on delete restrict`
  - `position integer not null`
  - `alias text null`
  - `config_overrides_jsonb jsonb not null default '{}'::jsonb`
  - unique `(benchmark_version_id, position)`
- `public.agchain_benchmark_versions` additive columns in this migration
  - `dataset_version_id uuid null references public.agchain_dataset_versions(dataset_version_id) on delete set null`
  - `task_name text null`
  - `task_file_ref text null`
  - `task_definition_jsonb jsonb null`
  - `solver_plan_jsonb jsonb not null default '{}'::jsonb`
  - `sandbox_profile_id uuid null references public.agchain_sandbox_profiles(sandbox_profile_id) on delete set null`
  - `sandbox_overrides_jsonb jsonb not null default '{}'::jsonb`
  - `model_roles_jsonb jsonb not null default '{}'::jsonb`
  - `generate_config_jsonb jsonb not null default '{}'::jsonb`
  - `eval_config_jsonb jsonb not null default '{}'::jsonb`
  - `validation_summary_jsonb jsonb not null default '{}'::jsonb`
- `public.agchain_benchmark_steps`
  - no column changes in this phase; relationship to `task_definition_jsonb` is locked by the benchmark-step contract above

#### `20260331145000_agchain_inspect_runs_logs_operations.sql`

- `public.agchain_runs` additive columns in this migration
  - `project_id uuid null references public.user_projects(project_id) on delete set null`
  - `dataset_version_id uuid null references public.agchain_dataset_versions(dataset_version_id) on delete set null`
  - `sandbox_profile_id uuid null references public.agchain_sandbox_profiles(sandbox_profile_id) on delete set null`
  - `retry_of_run_id uuid null references public.agchain_runs(run_id) on delete set null`
  - `resolved_task_definition_jsonb jsonb not null default '{}'::jsonb`
  - `resolved_model_roles_jsonb jsonb not null default '{}'::jsonb`
  - `resolved_generate_config_jsonb jsonb not null default '{}'::jsonb`
  - `resolved_eval_config_jsonb jsonb not null default '{}'::jsonb`
  - `log_storage_bucket text null`
  - `log_storage_path text null`
  - `projection_status text not null default 'pending'`
  - `current_operation_id uuid null references public.agchain_operations(operation_id) on delete set null` added after `public.agchain_operations` exists
  - `sample_count integer not null default 0`
  - `score_summary_jsonb jsonb not null default '{}'::jsonb`
  - `usage_summary_jsonb jsonb not null default '{}'::jsonb`
- `public.agchain_operations`
  - `operation_id uuid primary key default gen_random_uuid()`
  - `project_id uuid not null references public.user_projects(project_id) on delete cascade`
  - `operation_type text not null`
  - `target_kind text not null`
  - `target_id uuid null`
  - `status text not null`
  - `request_hash text not null`
  - `idempotency_key text null`
  - `progress_jsonb jsonb not null default '{}'::jsonb`
  - `attempt_count integer not null default 0`
  - `lease_expires_at timestamptz null`
  - `heartbeat_at timestamptz null`
  - `cancel_requested_at timestamptz null`
  - `last_error_jsonb jsonb not null default '{}'::jsonb`
  - `result_jsonb jsonb not null default '{}'::jsonb`
  - `created_at timestamptz not null default now()`
  - `started_at timestamptz null`
  - `completed_at timestamptz null`
- `public.agchain_run_log_headers`
  - `run_id uuid primary key references public.agchain_runs(run_id) on delete cascade`
  - `benchmark_id uuid not null references public.agchain_benchmarks(benchmark_id) on delete cascade`
  - `benchmark_version_id uuid not null references public.agchain_benchmark_versions(benchmark_version_id) on delete cascade`
  - `dataset_version_id uuid null references public.agchain_dataset_versions(dataset_version_id) on delete set null`
  - `status text not null`
  - `score_summary_jsonb jsonb not null default '{}'::jsonb`
  - `usage_summary_jsonb jsonb not null default '{}'::jsonb`
  - `error_summary_jsonb jsonb not null default '{}'::jsonb`
  - `sample_count integer not null default 0`
  - `started_at timestamptz null`
  - `completed_at timestamptz null`
  - `updated_at timestamptz not null default now()`
- `public.agchain_run_log_samples`
  - `run_log_sample_id uuid primary key default gen_random_uuid()`
  - `run_id uuid not null references public.agchain_runs(run_id) on delete cascade`
  - `sample_run_id text not null`
  - `sample_id text not null`
  - `position integer not null`
  - `status text not null`
  - `score_summary_jsonb jsonb not null default '{}'::jsonb`
  - `error_summary_jsonb jsonb not null default '{}'::jsonb`
  - `token_usage_jsonb jsonb not null default '{}'::jsonb`
  - `has_attachments boolean not null default false`
  - `preview_jsonb jsonb not null default '{}'::jsonb`
  - `updated_at timestamptz not null default now()`
  - unique `(run_id, sample_run_id)`
- `public.agchain_run_log_sample_events`
  - `run_log_sample_event_id uuid primary key default gen_random_uuid()`
  - `run_id uuid not null references public.agchain_runs(run_id) on delete cascade`
  - `sample_run_id text not null`
  - `event_index integer not null`
  - `event_type text not null`
  - `event_at timestamptz null`
  - `event_summary_jsonb jsonb not null default '{}'::jsonb`
  - `attachment_refs_jsonb jsonb not null default '[]'::jsonb`
  - `usage_jsonb jsonb not null default '{}'::jsonb`
  - `created_at timestamptz not null default now()`
  - unique `(run_id, sample_run_id, event_index)`

### Postgres tables

- `agchain_datasets`
  Registry row. Project-scoped. Stores identity, slug, display metadata, lifecycle status, latest version id. Unique on `(project_id, slug)`.
- `agchain_dataset_versions`
  One row per materialized source snapshot. Stores source type, source uri, source config jsonb, field spec jsonb, materialization options jsonb, parse summary, validation warnings, sample count, checksum, created_by, created_at. Unique on `(dataset_id, version_label)`.
- `agchain_dataset_version_drafts`
  Mutable draft rows used by the version-draft page. Stores `dataset_id`, `base_version_id`, draft source config jsonb, draft field spec jsonb, draft materialization options jsonb, preview summary jsonb, validation summary jsonb, dirty flags, draft status, expires_at, created_by, updated_at. At most one open draft per `(dataset_id, created_by, base_version_id)`.
- `agchain_dataset_samples`
  One row per materialized Inspect sample. Composite uniqueness on `(dataset_version_id, sample_id)`. Stores canonical sample jsonb, summary jsonb, metadata jsonb, has_setup, has_sandbox, has_files, parse_status.
- `agchain_dataset_version_validations`
  Version-scoped validation projection rows used by the detail page `Validation` tab and `Re-run Preview` action. Stores grouped issue payloads, warning counts, duplicate-id counts, missing-field counts, unsupported-payload counts, generated_at, and source hash.
- `agchain_scorers`
  Project-scoped scorer registry. Unique on `(project_id, scorer_name)`.
- `agchain_scorer_versions`
  Immutable scorer version rows. Unique on `(scorer_id, version_label)`.
- `agchain_tools`
  Project-scoped tool registry. Unique on `(project_id, tool_name)`.
- `agchain_tool_versions`
  Immutable tool version rows. Unique on `(tool_id, version_label)`.
- `agchain_sandbox_profiles`
  Project-scoped sandbox profile registry. Unique on `(project_id, provider, profile_name)`.
- `agchain_benchmarks`
  Extend existing benchmark registry rather than replacing it.
- `agchain_benchmark_versions`
  Extend with Inspect-native task definition fields instead of a bespoke phase-1 task table. New columns include `dataset_version_id`, `task_definition_jsonb`, `solver_plan_jsonb`, `sandbox_profile_id`, `sandbox_overrides_jsonb`, `model_roles_jsonb`, `generate_config_jsonb`, `eval_config_jsonb`, and `validation_summary_jsonb`.
- `agchain_benchmark_version_scorers`
  Join table from benchmark version to scorer versions with stable display order.
- `agchain_benchmark_version_tools`
  Join table from benchmark version to tool versions with stable display order.
- `agchain_runs`
  Extend existing table with dataset version pointer, sandbox profile pointer, raw resolved inspect configs, log storage pointers, projection status, retry lineage, current operation pointer, and aggregate metrics.
- `agchain_operations`
  Durable background-work queue and status resource for preview, materialization, run launch, and log projection. Unique idempotency on `(project_id, operation_type, idempotency_key)` when `idempotency_key` is present.
- `agchain_run_log_headers`
  Stores normalized EvalLog header projection for fast list/detail queries. Unique on `(run_id)`.
- `agchain_run_log_samples`
  Stores normalized EvalSample summary projection for the viewer grid. Unique on `(run_id, sample_run_id)`.
- `agchain_run_log_sample_events`
  Stores incremental event slices only if live polling requires DB-backed deltas. Unique on `(run_id, sample_run_id, event_index)`.

### Storage buckets

- `agchain-dataset-imports`
  Raw uploaded source files before materialization.
- `agchain-inspect-logs`
  Canonical Inspect `.eval` or `.json` logs.
- `agchain-inspect-attachments`
  Attachment payloads referenced by sample events.

## Locked Edge Function Surface

No Supabase edge function is introduced in Phase 1. Dataset preview, materialization orchestration, registry CRUD, run creation, and log projection all live in the platform API service so that the Inspect-native contract and OTel surface stay in one backend.

### Storage contract

- Full Inspect log blobs are authoritative.
- Postgres log projection rows are derived and reproducible from the authoritative log blobs.
- Dataset sample JSONB rows are canonical materialized sample objects used by the platform API.

### Indexes

- Dataset list by `project_id`, `updated_at desc`
- Dataset versions by `dataset_id`, `created_at desc`
- Dataset version drafts by `(dataset_id, updated_at desc)` and `(expires_at)`
- Dataset samples by `(dataset_version_id, sample_id)`
- Dataset validations by `(dataset_version_id, generated_at desc)`
- GIN on `metadata_jsonb` for sample filtering
- Scorers by `(project_id, updated_at desc)`
- Tools by `(project_id, updated_at desc)`
- Sandbox profiles by `(project_id, provider, updated_at desc)`
- Benchmark-version scorer join rows by `(benchmark_version_id, position)`
- Benchmark-version tool join rows by `(benchmark_version_id, position)`
- Runs by `(project_id, created_at desc)` and `(status, created_at desc)`
- Operations by `(project_id, status, created_at desc)` and `(lease_expires_at)`
- Run log headers by `(run_id)`
- Run log samples by `(run_id, sample_id)` and `(run_id, status)`

## Locked Deployment Surface

- `services/platform-api/app/main.py` starts `start_agchain_operations_worker()` and stops it on shutdown using the same lifecycle discipline already used for storage cleanup and telemetry shutdown.
- `services/platform-api/app/workers/agchain_operations.py` is the only queue consumer in this phase. It acquires Postgres leases and must be safe to run in multiple app replicas.
- Runtime env contract for this plan:
  - `AGCHAIN_OPERATIONS_ENABLED`
  - `AGCHAIN_OPERATIONS_POLL_SECONDS`
  - `AGCHAIN_OPERATION_LEASE_SECONDS`
  - `AGCHAIN_OPERATION_MAX_ATTEMPTS`
  - `AGCHAIN_DATASET_PREVIEW_SYNC_THRESHOLD`
  - `AGCHAIN_DATASET_MATERIALIZATION_SYNC_THRESHOLD`
  - `AGCHAIN_RUN_LAUNCH_SYNC_THRESHOLD`
  - `AGCHAIN_LOG_PROJECTION_SYNC_THRESHOLD`
- No new Supabase edge function, cron, or third-party queue is introduced in Phase 1.
- If a deployment cannot run the background worker reliably, the implementation must stop and the plan must be revised before shipping any `202`-returning path.

## Locked Observability Surface

### Trace spans

Route spans are explicit. Each item below names the span, emit location, and purpose.

- `services/platform-api/app/api/routes/agchain_datasets.py`
  - `agchain.datasets.list` emitted by `list_datasets_route` to measure dataset registry query latency and result counts.
  - `agchain.datasets.create` emitted by `create_dataset_route` to measure create-path persistence and whether the path completed sync or async.
  - `agchain.datasets.get` emitted by `get_dataset_route` to measure dataset metadata fetch latency for the detail shell.
  - `agchain.datasets.update` emitted by `update_dataset_route` to measure metadata edits and conflict failures.
  - `agchain.datasets.new.bootstrap` emitted by `get_dataset_bootstrap_route` to measure add-page bootstrap latency.
  - `agchain.datasets.new.preview` emitted by `preview_new_dataset_route` to measure create-flow preview latency and source-type mix.
  - `agchain.datasets.detail.get` emitted by `get_dataset_detail_route` to measure dataset workspace hydration latency.
  - `agchain.datasets.preview` emitted by `preview_dataset_route` to measure generic source-preview latency outside the create flow.
  - `agchain.datasets.versions.create` emitted by `create_dataset_version_route` to measure version materialization requests.
  - `agchain.datasets.versions.list` emitted by `list_dataset_versions_route` to measure version-history query latency.
  - `agchain.datasets.versions.get` emitted by `get_dataset_version_route` to measure immutable version metadata fetch latency.
  - `agchain.datasets.versions.source.get` emitted by `get_dataset_version_source_route` to measure source-snapshot reads.
  - `agchain.datasets.versions.mapping.get` emitted by `get_dataset_version_mapping_route` to measure field-mapping reads.
  - `agchain.datasets.versions.validation.get` emitted by `get_dataset_version_validation_route` to measure validation-tab reads.
  - `agchain.datasets.versions.preview` emitted by `preview_dataset_version_route` to measure re-run preview latency for immutable versions.
  - `agchain.datasets.versions.diff.get` emitted by `get_dataset_version_diff_route` to measure version-diff generation latency.
  - `agchain.datasets.version_drafts.create` emitted by `create_dataset_version_draft_route` to measure draft creation latency.
  - `agchain.datasets.version_drafts.get` emitted by `get_dataset_version_draft_route` to measure draft reload latency.
  - `agchain.datasets.version_drafts.update` emitted by `update_dataset_version_draft_route` to measure draft-save latency.
  - `agchain.datasets.version_drafts.preview` emitted by `preview_dataset_version_draft_route` to measure draft preview latency.
  - `agchain.datasets.version_drafts.commit` emitted by `commit_dataset_version_draft_route` to measure draft commit latency and idempotent retries.
  - `agchain.datasets.samples.list` emitted by `list_dataset_samples_route` to measure sample-grid query latency.
  - `agchain.datasets.samples.get` emitted by `get_dataset_sample_route` to measure full sample-detail fetch latency.
- `services/platform-api/app/api/routes/agchain_benchmarks.py`
  - `agchain.benchmarks.list` emitted by `list_benchmarks_route` to measure benchmark registry list latency.
  - `agchain.benchmarks.create` emitted by `create_benchmark_route` to measure benchmark row creation.
  - `agchain.benchmarks.get` emitted by `get_benchmark_route` to measure benchmark header/detail fetch latency.
  - `agchain.benchmarks.update` emitted by `update_benchmark_route` to measure metadata edits.
  - `agchain.benchmarks.versions.list` emitted by `list_benchmark_versions_route` to measure version-history reads.
  - `agchain.benchmarks.versions.create` emitted by `create_benchmark_version_route` to measure task-definition version creation.
  - `agchain.benchmarks.versions.get` emitted by `get_benchmark_version_route` to measure resolved benchmark-version reads.
  - `agchain.benchmarks.validate` emitted by `validate_benchmark_route` to measure server-side compatibility validation latency.
- `services/platform-api/app/api/routes/agchain_scorers.py`
  - `agchain.scorers.list` emitted by `list_scorers_route` to measure scorer registry list latency.
  - `agchain.scorers.create` emitted by `create_scorer_route` to measure scorer creation.
  - `agchain.scorers.get` emitted by `get_scorer_route` to measure scorer detail reads.
  - `agchain.scorers.update` emitted by `update_scorer_route` to measure scorer metadata edits.
  - `agchain.scorers.versions.list` emitted by `list_scorer_versions_route` to measure scorer-version history reads.
  - `agchain.scorers.versions.create` emitted by `create_scorer_version_route` to measure immutable scorer-version creation.
- `services/platform-api/app/api/routes/agchain_tools.py`
  - `agchain.tools.list` emitted by `list_tools_route` to measure tool registry list latency.
  - `agchain.tools.create` emitted by `create_tool_route` to measure tool creation.
  - `agchain.tools.get` emitted by `get_tool_route` to measure tool detail reads.
  - `agchain.tools.update` emitted by `update_tool_route` to measure tool metadata edits.
  - `agchain.tools.versions.list` emitted by `list_tool_versions_route` to measure tool-version history reads.
  - `agchain.tools.versions.create` emitted by `create_tool_version_route` to measure immutable tool-version creation.
- `services/platform-api/app/api/routes/agchain_sandboxes.py`
  - `agchain.sandboxes.list` emitted by `list_sandboxes_route` to measure sandbox-profile registry reads.
  - `agchain.sandboxes.create` emitted by `create_sandbox_route` to measure sandbox-profile creation.
  - `agchain.sandboxes.get` emitted by `get_sandbox_route` to measure sandbox-profile detail reads.
  - `agchain.sandboxes.update` emitted by `update_sandbox_route` to measure sandbox-profile edits.
  - `agchain.sandboxes.health_check` emitted by `health_check_sandbox_route` to measure health-probe latency and remote-provider failure rates.
- `services/platform-api/app/api/routes/agchain_runs.py`
  - `agchain.runs.list` emitted by `list_runs_route` to measure run-queue list latency.
  - `agchain.runs.create` emitted by `create_run_route` to measure run-create request latency and sync-vs-async disposition.
  - `agchain.runs.get` emitted by `get_run_route` to measure run-detail reads.
  - `agchain.runs.cancel` emitted by `cancel_run_route` to measure cancellation latency.
  - `agchain.runs.retry` emitted by `retry_run_route` to measure retry request latency.
  - `agchain.runs.samples.list` emitted by `list_run_samples_route` to measure run-sample summary reads.
- `services/platform-api/app/api/routes/agchain_results.py`
  - `agchain.results.list` emitted by `list_results_route` to measure results-grid latency.
  - `agchain.results.log.get` emitted by `get_result_log_route` to measure log-header and viewer-metadata reads.
  - `agchain.results.log.samples.list` emitted by `list_result_log_samples_route` to measure projected sample-grid reads.
  - `agchain.results.log.samples.get` emitted by `get_result_log_sample_route` to measure full sample viewer reads.
  - `agchain.results.log.json.get` emitted by `get_result_log_json_route` to measure raw log streaming.
- `services/platform-api/app/api/routes/agchain_operations.py`
  - `agchain.operations.get` emitted by `get_operation_route` to measure operation-status polling latency.
  - `agchain.operations.cancel` emitted by `cancel_operation_route` to measure cancel request latency.

### Internal spans

- `agchain.inspect.dataset.preview` emitted by `services/platform-api/app/domain/agchain/inspect_dataset_materializer.py:preview_dataset_source` to measure loader execution and preview shaping.
- `agchain.inspect.dataset.draft.create` emitted by `services/platform-api/app/domain/agchain/dataset_registry.py:create_dataset_version_draft` to measure draft seeding.
- `agchain.inspect.dataset.draft.update` emitted by `services/platform-api/app/domain/agchain/dataset_registry.py:update_dataset_version_draft` to measure draft persistence.
- `agchain.inspect.dataset.draft.preview` emitted by `services/platform-api/app/domain/agchain/inspect_dataset_materializer.py:preview_dataset_draft` to measure draft-specific preview computation.
- `agchain.inspect.dataset.validation.project` emitted by `services/platform-api/app/domain/agchain/inspect_dataset_materializer.py:project_dataset_validation` to measure validation projection generation.
- `agchain.inspect.dataset.materialize` emitted by `services/platform-api/app/domain/agchain/inspect_dataset_materializer.py:materialize_dataset_version` to measure full materialization runtime.
- `agchain.inspect.dataset.sample.normalize` emitted by `services/platform-api/app/domain/agchain/inspect_dataset_materializer.py:normalize_sample` to measure per-sample normalization cost.
- `agchain.inspect.task.resolve` emitted by `services/platform-api/app/domain/agchain/task_registry.py:resolve_benchmark_version` to measure task-definition resolution.
- `agchain.inspect.scorer.resolve` emitted by `services/platform-api/app/domain/agchain/scorer_registry.py:resolve_scorer_versions` to measure scorer resolution.
- `agchain.inspect.tool.resolve` emitted by `services/platform-api/app/domain/agchain/tool_registry.py:resolve_tool_versions` to measure tool resolution.
- `agchain.inspect.sandbox.resolve` emitted by `services/platform-api/app/domain/agchain/sandbox_registry.py:resolve_sandbox_profile` to measure sandbox-profile resolution.
- `agchain.inspect.run.launch` emitted by `services/platform-api/app/domain/agchain/run_registry.py:launch_run_operation` to measure runtime handoff latency.
- `agchain.inspect.operation.lease` emitted by `services/platform-api/app/domain/agchain/operation_queue.py:lease_operation` to measure queue-lease acquisition latency.
- `agchain.inspect.operation.complete` emitted by `services/platform-api/app/domain/agchain/operation_queue.py:complete_operation` to measure durable completion writes.
- `agchain.inspect.log.persist` emitted by `services/platform-api/app/domain/agchain/log_projection.py:persist_log_blob` to measure authoritative log-blob persistence.
- `agchain.inspect.log.project_header` emitted by `services/platform-api/app/domain/agchain/log_projection.py:project_log_header` to measure EvalLog header projection.
- `agchain.inspect.log.project_sample` emitted by `services/platform-api/app/domain/agchain/log_projection.py:project_log_samples` to measure sample-summary projection.
- `agchain.inspect.log.project_events` emitted by `services/platform-api/app/domain/agchain/log_projection.py:project_log_sample_events` to measure event-slice projection.

### Structured logs

- `agchain.dataset.preview.enqueued` emitted by `services/platform-api/app/api/routes/agchain_datasets.py:preview_new_dataset_route` to record async preview queueing without logging raw sample payloads.
- `agchain.dataset.materialization.completed` emitted by `services/platform-api/app/domain/agchain/inspect_dataset_materializer.py:materialize_dataset_version` to record dataset-version id, sample count, and validation rollup.
- `agchain.operation.failed` emitted by `services/platform-api/app/domain/agchain/operation_queue.py:fail_operation` to record operation type, attempt count, timeout vs error classification, and terminal failure code.
- `agchain.run.launch.accepted` emitted by `services/platform-api/app/api/routes/agchain_runs.py:create_run_route` to record run id, benchmark version id, and whether execution was accepted sync or async.
- `agchain.run.completed` emitted by `services/platform-api/app/domain/agchain/run_registry.py:finalize_run` to record final status, aggregate score summary, and projection status.
- `agchain.log.projection.failed` emitted by `services/platform-api/app/domain/agchain/log_projection.py:project_log_header` to record projection failure class and affected run id.

### Metrics

- Counters
  - `agchain.datasets.preview.requests` emitted by `agchain_datasets.py:preview_new_dataset_route` to count preview requests by source type.
  - `agchain.datasets.drafts.created` emitted by `agchain_datasets.py:create_dataset_version_draft_route` to count new drafts.
  - `agchain.datasets.drafts.committed` emitted by `agchain_datasets.py:commit_dataset_version_draft_route` to count successful immutable version commits.
  - `agchain.datasets.draft_preview.requests` emitted by `agchain_datasets.py:preview_dataset_version_draft_route` to count draft preview attempts.
  - `agchain.datasets.validation.reruns` emitted by `agchain_datasets.py:preview_dataset_version_route` to count validation reruns on immutable versions.
  - `agchain.datasets.materializations` emitted by `inspect_dataset_materializer.py:materialize_dataset_version` to count successful materializations.
  - `agchain.datasets.materialization_failures` emitted by `inspect_dataset_materializer.py:materialize_dataset_version` to count terminal materialization failures.
  - `agchain.benchmarks.validation.requests` emitted by `agchain_benchmarks.py:validate_benchmark_route` to count compatibility-validation requests.
  - `agchain.sandboxes.health_checks` emitted by `agchain_sandboxes.py:health_check_sandbox_route` to count sandbox probes.
  - `agchain.runs.started` emitted by `run_registry.py:launch_run_operation` to count accepted launches.
  - `agchain.runs.completed` emitted by `run_registry.py:finalize_run` to count successful completions.
  - `agchain.runs.failed` emitted by `run_registry.py:finalize_run` to count terminal failures.
  - `agchain.runs.cancelled` emitted by `agchain_runs.py:cancel_run_route` to count cancellations.
  - `agchain.logs.projected` emitted by `log_projection.py:project_log_header` to count successful log projections.
  - `agchain.logs.projection_failures` emitted by `log_projection.py:project_log_header` to count failed projections.
  - `agchain.operations.retried` emitted by `operation_queue.py:retry_operation` to count queue retries.
- Histograms
  - `agchain.datasets.preview.duration_ms` emitted by `agchain_datasets.py:preview_new_dataset_route` to measure create-flow preview latency.
  - `agchain.datasets.draft_preview.duration_ms` emitted by `agchain_datasets.py:preview_dataset_version_draft_route` to measure draft preview latency.
  - `agchain.datasets.detail.duration_ms` emitted by `agchain_datasets.py:get_dataset_detail_route` to measure dataset-workspace hydration latency.
  - `agchain.datasets.validation.duration_ms` emitted by `agchain_datasets.py:get_dataset_version_validation_route` to measure validation-read latency.
  - `agchain.datasets.materialization.duration_ms` emitted by `inspect_dataset_materializer.py:materialize_dataset_version` to measure end-to-end materialization time.
  - `agchain.datasets.sample_parse.duration_ms` emitted by `inspect_dataset_materializer.py:normalize_sample` to measure per-sample parse and normalization time.
  - `agchain.benchmarks.validation.duration_ms` emitted by `agchain_benchmarks.py:validate_benchmark_route` to measure compatibility-validation runtime.
  - `agchain.sandboxes.health_check.duration_ms` emitted by `agchain_sandboxes.py:health_check_sandbox_route` to measure remote probe duration.
  - `agchain.runs.launch.duration_ms` emitted by `agchain_runs.py:create_run_route` to measure run-create and handoff latency.
  - `agchain.runs.total.duration_ms` emitted by `run_registry.py:finalize_run` to measure full run wall-clock duration.
  - `agchain.logs.projection.duration_ms` emitted by `log_projection.py:project_log_header` to measure total projection time per run.
  - `agchain.logs.sample_query.duration_ms` emitted by `agchain_results.py:list_result_log_samples_route` to measure sample-grid query latency.
  - `agchain.operations.queue.wait.duration_ms` emitted by `operation_queue.py:lease_operation` to measure queue wait time before lease.
  - `agchain.operations.execution.duration_ms` emitted by `operation_queue.py:complete_operation` to measure per-operation execution duration.
- Gauges or observable gauges
  - `agchain.runs.active` emitted by `run_registry.py:observe_active_runs` to report currently running run count.
  - `agchain.logs.pending_projection` emitted by `log_projection.py:observe_pending_projections` to report queued log projections.
  - `agchain.operations.pending` emitted by `operation_queue.py:observe_pending_operations` to report queued or leased operations.

### Standard attributes

Only the following AGChain-specific attributes are allowed on spans, metrics, and structured logs in this phase:

- `agchain.project_id`
- `agchain.dataset_id`
- `agchain.dataset_version_id`
- `agchain.benchmark_id`
- `agchain.benchmark_version_id`
- `agchain.run_id`
- `agchain.operation_id`
- `agchain.operation_type`
- `agchain.source_type`
- `agchain.sandbox_provider`
- `agchain.tool_count`
- `agchain.scorer_count`
- `agchain.sample_count`
- `agchain.status`
- `agchain.retry_of_run_id`
- `agchain.error_type`

### Forbidden attributes

- No raw source file bytes, file-upload bodies, or object-storage presigned URLs.
- No raw `canonical_sample_json`, raw sample `files`, or raw sample `setup` payloads.
- No raw Inspect log JSON, event payload bodies, or attachment contents.
- No secrets, API keys, auth headers, cookies, JWTs, or connection credentials.
- No prompt or message content fields whose value could contain user or model text.

## Locked Frontend Surface

This section now locks the dataset surfaces plus the minimum benchmark, scorer, tool, sandbox, run, and result pages required by the acceptance contract. Existing AGChain placeholders are not left implicit in this revision.

The information architecture derives from the Inspect dataset substrate, not from the models page. The primary frontend entities are:

- `Dataset`
  a named registry entry with metadata and a latest-version pointer
- `DatasetVersion`
  an immutable materialized source snapshot
- `Sample`
  the canonical Inspect sample object
- `FieldSpec`
  the mapping contract from source columns or keys into the Inspect sample shape
- `BenchmarkVersion`
  the resolved task-definition snapshot that references a dataset version, scorer versions, tool versions, sandbox profile, model roles, and run limits
- `Run`
  one execution attempt against a benchmark version and dataset version pair
- `ResultLog`
  the Inspect-compatible run output surfaced through the AGChain results viewer

The visual language should remain inside the AGChain shell, but the page logic must stay operator-oriented, dense, and explicitly project-scoped.

### Locked frontend TypeScript contract

- Shared AGChain frontend types live only in `web/src/lib/agchainDatasets.ts`, `web/src/lib/agchainBenchmarks.ts`, `web/src/lib/agchainScorers.ts`, `web/src/lib/agchainTools.ts`, `web/src/lib/agchainSandboxes.ts`, `web/src/lib/agchainRuns.ts`, and `web/src/lib/agchainResults.ts`. Page-local duplicate API shapes are not allowed.
- `web/src/lib/agchainDatasets.ts` owns `AgchainDatasetListRow`, `AgchainDatasetDetail`, `AgchainDatasetVersionSummary`, `AgchainDatasetDraft`, `AgchainDatasetSampleSummary`, `AgchainDatasetSampleDetail`, `AgchainDatasetSourceConfig`, `AgchainFieldSpec`, `AgchainMaterializationOptions`, dataset validation summaries, and create or draft request payload types.
- `web/src/lib/agchainBenchmarks.ts` extends the existing benchmark service and owns `AgchainBenchmarkListRow`, `AgchainBenchmarkSummary`, `AgchainBenchmarkVersionSummary`, `AgchainBenchmarkVersionDetail`, `AgchainTaskDefinition`, `AgchainSolverPlan`, `AgchainModelRoleAssignment`, and benchmark validation response types. Route params are `benchmarkSlug` in the router and `benchmark_slug` in API payloads.
- `web/src/lib/agchainScorers.ts` owns `AgchainScorerRow`, `AgchainScorerDetail`, `AgchainScorerVersionSummary`, `AgchainMetricDefinition`, and scorer write payloads.
- `web/src/lib/agchainTools.ts` owns `AgchainToolRow`, `AgchainToolDetail`, `AgchainToolVersionSummary`, `AgchainToolSchema`, sandbox-requirement types, and tool write payloads.
- `web/src/lib/agchainSandboxes.ts` owns `AgchainSandboxProfileRow`, `AgchainSandboxProfileDetail`, `AgchainSandboxHealthCheck`, and sandbox write payloads.
- `web/src/lib/agchainRuns.ts` owns `AgchainRunRow`, `AgchainRunDetail`, `AgchainRunLaunchRequest`, `AgchainOperationStatus`, and retry or cancel response types. Dataset pages and results pages reuse the same `AgchainOperationStatus` contract for `202` polling instead of inventing a second operation type.
- `web/src/lib/agchainResults.ts` owns `AgchainResultRow`, `AgchainRunLogHeader`, `AgchainRunLogSampleSummary`, `AgchainRunLogSampleDetail`, score-summary types, and raw-log metadata types.

### Page 1: Dataset Registry

- Route: `/app/agchain/datasets`
- File: `web/src/pages/agchain/AgchainDatasetsPage.tsx`
- Purpose
  Landing page for dataset discovery, filtering, and entry into create/detail flows.
- Layout
  Top toolbar with search, source-type filter, status filter, validation-status filter, and primary `Add Dataset` button.
  Main content as a dense table, not cards.
  Optional right-side summary rail for the currently highlighted row on wide screens.
- Required table columns
  `Name`, `Latest Version`, `Source`, `Samples`, `Updated`, `Validation`, `Status`
- Row actions
  `Open`, `Create New Version`, `Archive`
- Empty state
  Explains supported source types and presents a single primary `Add Dataset` action.
- Look and feel
  Dense internal operator index, stable row heights, small badges, and no decorative hero treatment.

### Page 2: Add Dataset

- Route: `/app/agchain/datasets/new`
- File: `web/src/pages/agchain/AgchainDatasetCreatePage.tsx`
- Purpose
  Dedicated full-page creation flow for adding the first version of a dataset. This must not be hidden behind a tiny modal because field mapping and preview are core operations.
- Layout
  Four-step wizard with persistent step rail and sticky footer actions.
  Primary editor pane in the center.
  Persistent validation rail on the right.
- Step 1: `Source`
  Choose `CSV`, `JSON`, `JSONL`, or `Hugging Face`.
  Upload file or enter HF dataset configuration.
  Show source-specific controls such as delimiter, headers, split, revision, and trust flags.
- Step 2: `Field Mapping`
  Explicit editors for `input`, `target`, `choices`, `id`, `metadata`, `sandbox`, `files`, and `setup`.
  Support mapping from columns or keys and show unresolved required fields immediately.
- Step 3: `Preview`
  Preview table of parsed samples before commit.
  Show parse warnings, duplicate ID warnings, missing target warnings, and unsupported payload warnings.
- Step 4: `Create`
  Capture dataset name, slug, description, tags, and initial version label.
  Final submit creates the dataset registry entry and first dataset version.
- Look and feel
  Editor-style workflow with monospace mapping fields, fixed validation rail, and sticky commit bar.

### Page 3: Dataset Detail Workspace

- Route: `/app/agchain/datasets/:datasetId`
- File: `web/src/pages/agchain/AgchainDatasetDetailPage.tsx`
- Purpose
  Primary page for meaningful dataset inspection and manipulation after creation.
- Header contract
  Dataset name, status badge, latest-version badge, source-type badge, sample-count stat, updated timestamp, and actions `Edit Metadata`, `Create New Version`, `Re-run Preview`.
- Layout
  Header strip at top.
  Version switcher directly beneath header.
  Main tabset beneath version switcher.
- Required tabs
  `Summary`, `Source`, `Mapping`, `Samples`, `Versions`, `Validation`
- `Summary` tab
  Dataset metadata, latest-version summary, counts, and warning rollup.
- `Source` tab
  Read-only display of the source snapshot for the selected version.
  `Edit for New Version` action launches the version-draft flow rather than mutating an immutable version in place.
- `Mapping` tab
  Field-spec mapping blocks shown in a two-column technical layout.
  Diff from previous version when applicable.
  `Revise Mapping` action launches the version-draft flow.
- `Samples` tab
  Dense sample table with columns `Sample ID`, `Input Preview`, `Target Preview`, `Choices`, `Metadata`, `Setup`, `Sandbox`, `Files`, `Parse Status`.
  Row click opens a sample-detail drawer.
- `Versions` tab
  Version history table with version label, created time, sample count, checksum, and validation status.
  Row actions `Inspect`, `Draft From This Version`.
- `Validation` tab
  Structured issue groups for parse errors, duplicate IDs, missing required fields, field-mapping warnings, and sandbox or file payload warnings.
- Look and feel
  This page should feel like a technical workspace, not a read-only detail card. The user must be able to audit a version and initiate meaningful change from it.

### Page 4: Dataset Version Draft

- Route: `/app/agchain/datasets/:datasetId/versions/new`
- File: `web/src/pages/agchain/AgchainDatasetVersionDraftPage.tsx`
- Purpose
  The actual manipulation surface for an existing dataset. Any meaningful change to source config, field mapping, or import options happens here and results in a new immutable dataset version.
- Entry paths
  From `Create New Version` in the dataset header.
  From `Edit for New Version` in the `Source` tab.
  From `Revise Mapping` in the `Mapping` tab.
  From `Draft From This Version` in the `Versions` tab.
- Layout
  Reuses the add-dataset wizard structure, but prefilled from the chosen base version.
  Header shows base version and a diff summary as the draft changes.
- Required manipulation capabilities
  Edit source config.
  Edit field mapping.
  Change materialization options such as shuffle, shuffle choices, limit, and auto-ID behavior.
  Re-run preview before committing.
  Commit as a new immutable version.
- Look and feel
  Same operator-editor feel as the create page, but clearly framed as version drafting rather than first-time creation.

### Page 5: Benchmark Definition Workspace

- Route: `/app/agchain/settings/project/benchmark-definition`
- File: `web/src/pages/agchain/AgchainBenchmarksPage.tsx`
- Purpose
  Primary benchmark-definition surface for the focused AGChain project. This page owns dataset-version selection, task-definition authoring, scorer and tool references, sandbox-profile selection, model-role assignment, and server-side validation.
- Layout
  Existing step workbench remains the top-level structure, but the current hash tabs become live sections rather than placeholders.
  Required sections are `Steps`, `Dataset`, `Scoring`, `Tools`, `Sandbox`, `Models`, `Runner`, and `Validation`.
- Required behaviors
  Selecting a dataset version updates validation state immediately.
  Scorer, tool, and sandbox references show latest compatible versions plus an explicit pinned-version selector.
  `Validate` runs `POST /agchain/benchmarks/{benchmark_slug}/validate`.
  `Save Draft` writes a benchmark version draft.
  `Publish Version` creates or updates the immutable benchmark version selected by the operator.
- Deep link
  `/app/agchain/benchmarks/:benchmarkSlug` backed by `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.tsx` remains available for step-by-step inspection and historical version audit.

### Page 6: Scorer Registry

- Route: `/app/agchain/scorers`
- File: `web/src/pages/agchain/AgchainScorersPage.tsx`
- Purpose
  Project-scoped registry for scorer definitions and version history.
- Layout
  Dense table on the left, detail/editor panel on the right.
- Required table columns
  `Name`, `Latest Version`, `Metrics`, `Built In`, `Updated`
- Required behaviors
  Create scorer, edit scorer metadata, inspect version history, create immutable scorer version, and copy a scorer reference for benchmark-definition use.

### Page 7: Tool Registry

- Route: `/app/agchain/tools`
- File: `web/src/pages/agchain/AgchainToolsPage.tsx`
- Purpose
  Project-scoped registry for tool definitions and approval posture.
- Layout
  Dense table plus detail panel matching the scorer-registry interaction model.
- Required table columns
  `Name`, `Latest Version`, `Approval`, `Parallel Calls`, `Updated`
- Required behaviors
  Create tool, edit metadata, inspect sandbox requirements, inspect version history, and create immutable tool versions.

### Page 8: Sandbox Profiles

- Route: `/app/agchain/sandboxes`
- File: `web/src/pages/agchain/AgchainSandboxesPage.tsx`
- Purpose
  Project-scoped registry for sandbox profiles and health validation.
- Layout
  Provider filter, status filter, sandbox table, and detail panel with a `Run Health Check` action.
- Required table columns
  `Profile`, `Provider`, `Health`, `Checked`, `Updated`
- Required behaviors
  Create sandbox profile, edit limits and connection capabilities, run health checks, and surface the resulting diagnostics without leaving the page.

### Page 9: Run Launch And Queue

- Route: `/app/agchain/runs`
- File: `web/src/pages/agchain/AgchainRunsPage.tsx`
- Purpose
  Launch runs, inspect active queue state, and retry or cancel eligible runs.
- Layout
  Run-launch panel above a dense queue table.
  Operation status rail appears inline whenever launch falls back to the `202` background path.
- Required form inputs
  `Benchmark Version`, `Dataset Version`, `Evaluated Model`, `Judge Model`, `Sandbox Profile`, `Generate Config Overrides`, `Eval Config Overrides`, `Run Tags`
- Required behaviors
  `Launch Run` calls `POST /agchain/runs`.
  `Cancel` calls `POST /agchain/runs/{run_id}/cancel`.
  `Retry` calls `POST /agchain/runs/{run_id}/retry`.
  The queue table reflects `queued`, `running`, `completed`, `failed`, and `cancelled` states with live operation polling when needed.

### Page 10: Results And Log Viewer

- Route: `/app/agchain/results`
- File: `web/src/pages/agchain/AgchainResultsPage.tsx`
- Purpose
  Compare completed or in-flight runs and inspect the Inspect-compatible log viewer for one selected run.
- Layout
  Master-detail split view.
  Left pane is a results table.
  Right pane is a tabbed run-log viewer.
- Required viewer tabs
  `Summary`, `Scores`, `Samples`, `Events`, `JSON`
- Required behaviors
  Selecting a run loads `GET /agchain/results/{run_id}/log`.
  The `Samples` tab loads `GET /agchain/results/{run_id}/log/samples`.
  Sample-row selection opens full sample detail using `GET /agchain/results/{run_id}/log/samples/{sample_run_id}`.
  The `JSON` tab streams `GET /agchain/results/{run_id}/log/json` without embedding raw blob bodies in client logs.

### Supporting components

- `AgchainDatasetsToolbar`
  Search, filters, and `Add Dataset` primary action.
- `AgchainDatasetsTable`
  Registry table on the dataset index page.
- `AgchainDatasetWizard`
  Shared wizard shell for create and version-draft flows.
- `AgchainDatasetFieldMappingEditor`
  Dedicated editor for Inspect field mappings.
- `AgchainDatasetPreviewTable`
  Parsed-sample preview before commit.
- `AgchainDatasetValidationPanel`
  Persistent grouped validation issues.
- `AgchainDatasetVersionSwitcher`
  Selected-version control inside the dataset detail page.
- `AgchainDatasetSamplesTable`
  Dense sample browser for a materialized version.
- `AgchainDatasetSampleDrawer`
  Full sample detail with sections `Canonical Sample`, `Input`, `Target and Choices`, `Metadata`, `Setup`, `Sandbox`, `Files`, `Raw JSON`.
- `AgchainDatasetVersionsTable`
  Version history and draft-entry actions.
- `AgchainBenchmarkConfigPanels`
  Live non-step benchmark-definition sections for dataset, scoring, tools, sandbox, models, runner, and validation.
- `AgchainScorersTable`
  Registry table for scorer rows.
- `AgchainScorerDetailPanel`
  Scorer metadata and version-history editor.
- `AgchainToolsTable`
  Registry table for tool rows.
- `AgchainToolDetailPanel`
  Tool metadata, schema, and approval editor.
- `AgchainSandboxesTable`
  Registry table for sandbox profiles.
- `AgchainSandboxDetailPanel`
  Limits, connection capability, and health-check detail panel.
- `AgchainRunLaunchPanel`
  Run-launch form and async operation status rail.
- `AgchainRunsTable`
  Dense run queue with retry and cancel actions.
- `AgchainResultsTable`
  Results comparison table with aggregate score summaries.
- `AgchainRunLogViewer`
  Tabbed Inspect-compatible viewer shell for summary, scores, samples, events, and raw JSON.
- `AgchainRunLogSampleDrawer`
  Sample-level result detail drawer with events, attachments, scores, and usage.

### Frontend acceptance

- A user can discover datasets from the registry page.
- A user can start dataset creation from an explicit `Add Dataset` page.
- A user can preview parsing and field mapping before creation.
- A user can open a dataset detail workspace and inspect source, mapping, samples, versions, and validation.
- A user can initiate meaningful dataset manipulation from the detail page by creating a new version draft.
- A user can adjust source config and field mapping in the version-draft page and commit a new immutable version.
- A user can define and validate a benchmark version from `/app/agchain/settings/project/benchmark-definition` using dataset, scorer, tool, sandbox, model, and runner inputs that map directly to the backend contract in this plan.
- A user can manage scorer, tool, and sandbox registry records from dedicated AGChain pages rather than placeholder shells.
- A user can launch, cancel, and retry runs from `/app/agchain/runs` without direct CLI invocation.
- A user can inspect results and one selected run's Inspect-compatible log viewer from `/app/agchain/results`.
- Any frontend flow that receives a `202` operation response exposes operation polling and terminal failure state explicitly in the UI.

## Locked Inventory Counts

- New API route modules: 7
  - datasets
  - operations
  - scorers
  - tools
  - sandboxes
  - runs
  - results
- Modified existing API route modules: 1
  - benchmarks
- New domain modules: 10 minimum
  - dataset registry
  - inspect dataset materializer
  - task registry
  - scorer registry
  - tool registry
  - sandbox registry
  - run registry
  - log projection
  - operation queue
  - shared agchain types
- New worker modules: 1
  - agchain operations worker
- New frontend pages or route implementations: 4
  - add dataset
  - dataset detail workspace
  - dataset version draft
  - sandbox profiles
- Modified existing AGChain pages: 7
  - dataset registry
  - benchmark definition
  - benchmark workbench
  - scorer registry
  - tool registry
  - run launch and queue
  - results and log viewer
- New frontend components: 22
  - dataset toolbar
  - dataset registry table
  - dataset wizard shell
  - dataset field mapping editor
  - dataset preview table
  - dataset validation panel
  - dataset version switcher
  - dataset samples table
  - dataset sample drawer
  - dataset versions table
  - benchmark config panels
  - scorers table
  - scorer detail panel
  - tools table
  - tool detail panel
  - sandboxes table
  - sandbox detail panel
  - run launch panel
  - runs table
  - results table
  - run log viewer
  - run log sample drawer
- Modified existing frontend components: 4
  - AGChain left nav
  - benchmark workbench header
  - benchmark steps list
  - benchmark step inspector
- New frontend hooks: 8
  - use AGChain datasets
  - use AGChain dataset detail
  - use AGChain dataset draft
  - use AGChain scorers
  - use AGChain tools
  - use AGChain sandboxes
  - use AGChain runs
  - use AGChain results
- Modified frontend hooks or services: 2
  - use AGChain benchmark steps
  - AGChain benchmarks service
- New migrations: 3
  - dataset registry and samples
  - component registries and benchmark-version extensions
  - run, log-projection, and operations extensions

## Locked File Inventory

### Platform API

#### New files

- `services/platform-api/app/api/routes/agchain_datasets.py`
- `services/platform-api/app/api/routes/agchain_operations.py`
- `services/platform-api/app/api/routes/agchain_scorers.py`
- `services/platform-api/app/api/routes/agchain_tools.py`
- `services/platform-api/app/api/routes/agchain_sandboxes.py`
- `services/platform-api/app/api/routes/agchain_runs.py`
- `services/platform-api/app/api/routes/agchain_results.py`
- `services/platform-api/app/domain/agchain/dataset_registry.py`
- `services/platform-api/app/domain/agchain/inspect_dataset_materializer.py`
- `services/platform-api/app/domain/agchain/task_registry.py`
- `services/platform-api/app/domain/agchain/scorer_registry.py`
- `services/platform-api/app/domain/agchain/tool_registry.py`
- `services/platform-api/app/domain/agchain/sandbox_registry.py`
- `services/platform-api/app/domain/agchain/run_registry.py`
- `services/platform-api/app/domain/agchain/log_projection.py`
- `services/platform-api/app/domain/agchain/operation_queue.py`
- `services/platform-api/app/domain/agchain/types.py`
- `services/platform-api/app/workers/agchain_operations.py`

#### Modified files

- `services/platform-api/app/main.py`
- `services/platform-api/app/core/config.py`
- `services/platform-api/app/api/routes/agchain_benchmarks.py`
- `services/platform-api/app/domain/agchain/__init__.py`

### Database

- `supabase/migrations/20260331141000_agchain_inspect_dataset_registry.sql`
- `supabase/migrations/20260331143000_agchain_inspect_component_registries.sql`
- `supabase/migrations/20260331145000_agchain_inspect_runs_logs_operations.sql`

### Frontend

#### New files

- `web/src/pages/agchain/AgchainDatasetCreatePage.tsx`
- `web/src/pages/agchain/AgchainDatasetDetailPage.tsx`
- `web/src/pages/agchain/AgchainDatasetVersionDraftPage.tsx`
- `web/src/pages/agchain/AgchainSandboxesPage.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetsToolbar.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetsTable.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetWizard.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetFieldMappingEditor.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetPreviewTable.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetValidationPanel.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetVersionSwitcher.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetSamplesTable.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetSampleDrawer.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetVersionsTable.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarkConfigPanels.tsx`
- `web/src/components/agchain/scorers/AgchainScorersTable.tsx`
- `web/src/components/agchain/scorers/AgchainScorerDetailPanel.tsx`
- `web/src/components/agchain/tools/AgchainToolsTable.tsx`
- `web/src/components/agchain/tools/AgchainToolDetailPanel.tsx`
- `web/src/components/agchain/sandboxes/AgchainSandboxesTable.tsx`
- `web/src/components/agchain/sandboxes/AgchainSandboxDetailPanel.tsx`
- `web/src/components/agchain/runs/AgchainRunLaunchPanel.tsx`
- `web/src/components/agchain/runs/AgchainRunsTable.tsx`
- `web/src/components/agchain/results/AgchainResultsTable.tsx`
- `web/src/components/agchain/results/AgchainRunLogViewer.tsx`
- `web/src/components/agchain/results/AgchainRunLogSampleDrawer.tsx`
- `web/src/lib/agchainDatasets.ts`
- `web/src/lib/agchainScorers.ts`
- `web/src/lib/agchainTools.ts`
- `web/src/lib/agchainSandboxes.ts`
- `web/src/lib/agchainRuns.ts`
- `web/src/lib/agchainResults.ts`
- `web/src/hooks/agchain/useAgchainDatasets.ts`
- `web/src/hooks/agchain/useAgchainDatasetDetail.ts`
- `web/src/hooks/agchain/useAgchainDatasetDraft.ts`
- `web/src/hooks/agchain/useAgchainScorers.ts`
- `web/src/hooks/agchain/useAgchainTools.ts`
- `web/src/hooks/agchain/useAgchainSandboxes.ts`
- `web/src/hooks/agchain/useAgchainRuns.ts`
- `web/src/hooks/agchain/useAgchainResults.ts`

#### Modified files

- `web/src/router.tsx`
- `web/src/components/agchain/AgchainLeftNav.tsx`
- `web/src/pages/agchain/AgchainDatasetsPage.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.tsx`
- `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.tsx`
- `web/src/pages/agchain/AgchainScorersPage.tsx`
- `web/src/pages/agchain/AgchainToolsPage.tsx`
- `web/src/pages/agchain/AgchainRunsPage.tsx`
- `web/src/pages/agchain/AgchainResultsPage.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarkWorkbenchHeader.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarkStepsList.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarkStepInspector.tsx`
- `web/src/hooks/agchain/useAgchainBenchmarkSteps.ts`
- `web/src/lib/agchainBenchmarks.ts`

## Frozen Seam Contract

The following seams are frozen for this plan. They are not optional implementation details.

1. `services/platform-api` remains the only runtime/backend surface for all in-scope dataset, benchmark, scorer, tool, sandbox, run, result, and operation flows.
2. Full Inspect log blobs in storage remain authoritative; Postgres log tables are derived projections only.
3. Legal-10 DuckDB, bundle assembly, and benchmark-build workflows remain build-time seams and must not become runtime dependencies for Phase 1 routes.
4. `agchain_benchmark_steps` remains the step-authoring seam, while `agchain_benchmark_versions.task_definition_jsonb` remains the runtime seam.
5. Any `202` path in this plan is backed only by durable `agchain_operations` rows and the worker lease contract.

## Execution Plan

### Task 1: Lock backend AGChain type definitions

**File(s):** `services/platform-api/app/domain/agchain/types.py`, `services/platform-api/app/domain/agchain/__init__.py`, `services/platform-api/tests/test_agchain_types.py`

**Step 1:** Add or extend `services/platform-api/tests/test_agchain_types.py` so the tests name the exact backend contracts for `Sample`, `FieldSpec`, dataset source config, task definition, scorer definition, tool definition, sandbox profile, run config, operation status, and log projections.
**Step 2:** Run `cd services/platform-api && pytest -q tests/test_agchain_types.py` to confirm the contract is not yet fully satisfied.
**Step 3:** Implement the missing canonical types in `services/platform-api/app/domain/agchain/types.py` without changing Inspect-native field names.
**Step 4:** Re-export only the locked AGChain type symbols through `services/platform-api/app/domain/agchain/__init__.py`.
**Step 5:** Re-run the targeted test command.

**Test command:** `cd services/platform-api && pytest -q tests/test_agchain_types.py`
**Expected output:** `tests/test_agchain_types.py` passes with no failures and locks the exact backend type names and field shapes declared in this plan.
**Commit:** `feat(platform-api): lock agchain inspect backend type contract`

### Task 2: Lock shared frontend AGChain type modules

**File(s):** `web/src/lib/agchainDatasets.ts`, `web/src/lib/agchainBenchmarks.ts`, `web/src/lib/agchainScorers.ts`, `web/src/lib/agchainTools.ts`, `web/src/lib/agchainSandboxes.ts`, `web/src/lib/agchainRuns.ts`, `web/src/lib/agchainResults.ts`

**Step 1:** Add or update exported TypeScript types so each shared AGChain lib module exposes the exact contracts listed in `### Locked frontend TypeScript contract`.
**Step 2:** Normalize benchmark route params to `benchmarkSlug` in router-facing types and `benchmark_slug` in API payload types.
**Step 3:** Ensure `AgchainOperationStatus` is exported once from `web/src/lib/agchainRuns.ts` and reused by dataset and result callers rather than duplicated.
**Step 4:** Remove any page-local or hook-local duplicate API shapes introduced while locking the shared modules.

**Test command:** `cd web && npm run test -- src/pages/agchain/AgchainBenchmarksPage.test.tsx src/pages/agchain/AgchainDatasetsPage.test.tsx`
**Expected output:** Targeted AGChain page tests continue to compile and pass against the shared type modules, with no duplicate ad hoc response shapes left in the touched files.
**Commit:** `refactor(web): lock shared agchain type modules`

### Task 3: Write the dataset registry migration

**File(s):** `supabase/migrations/20260331141000_agchain_inspect_dataset_registry.sql`

**Step 1:** Create the migration skeleton with the exact five dataset tables, constraints, indexes, and grants listed in the locked persistence contract.
**Step 2:** Add the circular `latest_version_id` foreign key after both dataset tables exist instead of improvising a different schema shape.
**Step 3:** Encode the exact uniqueness rules for dataset slugs, version labels, sample identity, and open draft behavior.
**Step 4:** Re-read the migration against the `### Column-level schema contract` and remove any unplanned columns or tables.

**Test command:** `rg -n "agchain_datasets|agchain_dataset_versions|agchain_dataset_version_drafts|agchain_dataset_samples|agchain_dataset_version_validations" supabase/migrations/20260331141000_agchain_inspect_dataset_registry.sql`
**Expected output:** The migration file contains all five required dataset tables and no unplanned table names for this tranche.
**Commit:** `feat(db): add agchain dataset registry migration`

### Task 4: Build dataset registry read and detail routes

**File(s):** `services/platform-api/app/api/routes/agchain_datasets.py`, `services/platform-api/app/domain/agchain/dataset_registry.py`, `services/platform-api/app/main.py`, `services/platform-api/tests/test_agchain_datasets.py`

**Step 1:** Add failing route tests for dataset list, bootstrap, detail, versions, source, mapping, validation, samples, and sample detail responses.
**Step 2:** Implement the route handlers and domain queries for those read paths using the exact request and response shapes locked in the platform API contract.
**Step 3:** Mount `agchain_datasets.router` in `services/platform-api/app/main.py`.
**Step 4:** Re-run the targeted dataset route tests.

**Test command:** `cd services/platform-api && pytest -q tests/test_agchain_datasets.py`
**Expected output:** Targeted dataset tests pass for list, bootstrap, detail, versions, source, mapping, validation, and sample-read contracts.
**Commit:** `feat(platform-api): add agchain dataset read routes`

### Task 5: Build dataset preview, draft, and materialization flows

Prerequisite amendment: do not implement Task 5 Step 4 or any other new dataset `202` path until the auth hardening and durable operations prerequisites above are already landed and verified.

**File(s):** `services/platform-api/app/api/routes/agchain_datasets.py`, `services/platform-api/app/domain/agchain/dataset_registry.py`, `services/platform-api/app/domain/agchain/inspect_dataset_materializer.py`, `services/platform-api/tests/test_agchain_datasets.py`

**Step 1:** Add failing tests for create-flow preview, dataset create, draft create, draft update, draft preview, draft commit, and immutable-version preview rerun.
**Step 2:** Implement source preview for CSV, JSON, JSONL, and Hugging Face with canonical sample normalization that preserves `sandbox`, `files`, and `setup`.
**Step 3:** Persist dataset versions, validation projections, sample rows, and draft rows exactly as locked in the persistence contract.
**Step 4:** Add `202` fallback behavior only through `agchain_operations` for preview or commit paths that exceed synchronous thresholds.
**Step 5:** Re-run the targeted dataset tests.

**Test command:** `cd services/platform-api && pytest -q tests/test_agchain_datasets.py`
**Expected output:** Dataset tests pass for preview, create, draft lifecycle, sample normalization, validation projections, and synchronous-vs-async response behavior.
**Commit:** `feat(platform-api): add agchain dataset materialization flows`

### Task 6: Extend benchmark versions and the step-to-runtime bridge

**File(s):** `supabase/migrations/20260331143000_agchain_inspect_component_registries.sql`, `services/platform-api/app/api/routes/agchain_benchmarks.py`, `services/platform-api/app/domain/agchain/task_registry.py`, `services/platform-api/tests/test_agchain_benchmarks.py`

**Step 1:** Add failing tests for benchmark version list, benchmark version readback, slug-based routing, and validation responses.
**Step 2:** Add the exact additive benchmark-version columns declared in the locked persistence contract; do not alter `agchain_benchmark_steps`.
**Step 3:** Implement runtime resolution so legacy versions can synthesize `task_definition_jsonb` from ordered steps while phase-1-authored versions refresh that snapshot on validate or publish.
**Step 4:** Keep all new benchmark route paths slug-based as `{benchmark_slug}`.
**Step 5:** Re-run the targeted benchmark tests.

**Test command:** `cd services/platform-api && pytest -q tests/test_agchain_benchmarks.py`
**Expected output:** Benchmark tests pass for slug-based routes, version readbacks, validation, and the locked relationship between `agchain_benchmark_steps` and `task_definition_jsonb`.
**Commit:** `feat(platform-api): extend agchain benchmark runtime bridge`

### Task 7: Build the scorer registry backend

**File(s):** `services/platform-api/app/api/routes/agchain_scorers.py`, `services/platform-api/app/domain/agchain/scorer_registry.py`, `supabase/migrations/20260331143000_agchain_inspect_component_registries.sql`, `services/platform-api/tests/test_agchain_scorers.py`

**Step 1:** Add failing tests for scorer list, create, detail, update, version list, and version create.
**Step 2:** Implement scorer registry and scorer-version persistence with the exact auth boundary locked in this plan.
**Step 3:** Validate scorer-version references and metric-definition payloads against the shared backend type contract.
**Step 4:** Re-run the targeted scorer tests.

**Test command:** `cd services/platform-api && pytest -q tests/test_agchain_scorers.py`
**Expected output:** Targeted scorer tests pass for read paths, superuser-only mutation paths, and immutable scorer-version contracts.
**Commit:** `feat(platform-api): add agchain scorer registry`

### Task 8: Build the tool and sandbox backends

**File(s):** `services/platform-api/app/api/routes/agchain_tools.py`, `services/platform-api/app/api/routes/agchain_sandboxes.py`, `services/platform-api/app/domain/agchain/tool_registry.py`, `services/platform-api/app/domain/agchain/sandbox_registry.py`, `supabase/migrations/20260331143000_agchain_inspect_component_registries.sql`, `services/platform-api/tests/test_agchain_tools.py`, `services/platform-api/tests/test_agchain_sandboxes.py`

**Step 1:** Add failing tests for tool list, create, detail, update, version list, version create, sandbox list, sandbox create, sandbox update, and sandbox health check.
**Step 2:** Implement tool registry and tool-version persistence with locked approval and sandbox-requirement payload shapes.
**Step 3:** Implement sandbox profile persistence and health-check orchestration using the locked superuser-only mutation boundary.
**Step 4:** Re-run the targeted tool and sandbox tests.

**Test command:** `cd services/platform-api && pytest -q tests/test_agchain_tools.py tests/test_agchain_sandboxes.py`
**Expected output:** Tool and sandbox tests pass for read contracts, superuser-only write contracts, and the locked health-check response shape.
**Commit:** `feat(platform-api): add agchain tool and sandbox backends`

### Task 9: Build the operations queue and run-launch backend

**File(s):** `supabase/migrations/20260331145000_agchain_inspect_runs_logs_operations.sql`, `services/platform-api/app/api/routes/agchain_operations.py`, `services/platform-api/app/api/routes/agchain_runs.py`, `services/platform-api/app/core/config.py`, `services/platform-api/app/domain/agchain/run_registry.py`, `services/platform-api/app/domain/agchain/operation_queue.py`, `services/platform-api/app/workers/agchain_operations.py`, `services/platform-api/app/main.py`, `services/platform-api/tests/test_agchain_operations.py`, `services/platform-api/tests/test_agchain_runs.py`

**Step 1:** Add failing tests for operation polling, operation cancellation, run create, run cancel, run retry, and lease behavior.
**Step 2:** Create the `agchain_operations` queue schema and the additive `agchain_runs` columns exactly as locked in the persistence contract.
**Step 3:** Implement durable queue leasing, heartbeat, retry, timeout, and cancellation logic in `operation_queue.py` and `workers/agchain_operations.py`.
**Step 4:** Implement run-create orchestration that records resolved runtime config and only returns `202` when a durable operation row exists.
**Step 5:** Mount worker startup and shutdown in `services/platform-api/app/main.py` and wire settings in `services/platform-api/app/core/config.py`.
**Step 6:** Re-run the targeted operations and runs tests.

**Test command:** `cd services/platform-api && pytest -q tests/test_agchain_operations.py tests/test_agchain_runs.py`
**Expected output:** Operations and run tests pass for durable `202` behavior, lease safety, retry lineage, and run launch or cancellation contracts.
**Commit:** `feat(platform-api): add agchain operations queue and runs`

### Task 10: Build results and log projection backend

**File(s):** `services/platform-api/app/api/routes/agchain_results.py`, `services/platform-api/app/domain/agchain/log_projection.py`, `supabase/migrations/20260331145000_agchain_inspect_runs_logs_operations.sql`, `services/platform-api/tests/test_agchain_results.py`

**Step 1:** Add failing tests for results list, log header read, sample summary list, sample detail read, and raw log streaming.
**Step 2:** Implement authoritative log-blob persistence and derived Postgres header, sample, and event projection writes.
**Step 3:** Implement results read routes so the UI can load summary, scores, samples, events, and raw JSON without treating projection rows as the source of truth.
**Step 4:** Re-run the targeted results tests.

**Test command:** `cd services/platform-api && pytest -q tests/test_agchain_results.py`
**Expected output:** Results tests pass for log header, sample summaries, sample details, raw log fetches, and the authoritative-blob-vs-derived-projection seam.
**Commit:** `feat(platform-api): add agchain results and log projection`

### Task 11: Build the dataset frontend

**File(s):** `web/src/router.tsx`, `web/src/pages/agchain/AgchainDatasetsPage.tsx`, `web/src/pages/agchain/AgchainDatasetCreatePage.tsx`, `web/src/pages/agchain/AgchainDatasetDetailPage.tsx`, `web/src/pages/agchain/AgchainDatasetVersionDraftPage.tsx`, `web/src/components/agchain/datasets/AgchainDatasetsToolbar.tsx`, `web/src/components/agchain/datasets/AgchainDatasetsTable.tsx`, `web/src/components/agchain/datasets/AgchainDatasetWizard.tsx`, `web/src/components/agchain/datasets/AgchainDatasetFieldMappingEditor.tsx`, `web/src/components/agchain/datasets/AgchainDatasetPreviewTable.tsx`, `web/src/components/agchain/datasets/AgchainDatasetValidationPanel.tsx`, `web/src/components/agchain/datasets/AgchainDatasetVersionSwitcher.tsx`, `web/src/components/agchain/datasets/AgchainDatasetSamplesTable.tsx`, `web/src/components/agchain/datasets/AgchainDatasetSampleDrawer.tsx`, `web/src/components/agchain/datasets/AgchainDatasetVersionsTable.tsx`, `web/src/lib/agchainDatasets.ts`, `web/src/hooks/agchain/useAgchainDatasets.ts`, `web/src/hooks/agchain/useAgchainDatasetDetail.ts`, `web/src/hooks/agchain/useAgchainDatasetDraft.ts`

**Step 1:** Add failing tests for the dataset registry page, add-dataset page, dataset detail page, and dataset version-draft page.
**Step 2:** Replace the placeholder dataset registry with a live table, toolbar, and navigation entry points.
**Step 3:** Implement the add-dataset wizard and detail workspace using only the shared dataset and operation type modules.
**Step 4:** Implement the version-draft page with preview reruns and explicit `202` polling.
**Step 5:** Re-run the targeted dataset page tests.

**Test command:** `cd web && npm run test -- src/pages/agchain/AgchainDatasetsPage.test.tsx src/pages/agchain/AgchainDatasetCreatePage.test.tsx src/pages/agchain/AgchainDatasetDetailPage.test.tsx src/pages/agchain/AgchainDatasetVersionDraftPage.test.tsx`
**Expected output:** All four dataset page tests pass and the placeholder dataset shell is replaced by the locked registry, create, detail, and draft surfaces.
**Commit:** `feat(web): build agchain dataset surfaces`

### Task 12: Build the benchmark-definition frontend

**File(s):** `web/src/router.tsx`, `web/src/components/agchain/AgchainLeftNav.tsx`, `web/src/pages/agchain/AgchainBenchmarksPage.tsx`, `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.tsx`, `web/src/components/agchain/benchmarks/AgchainBenchmarkWorkbenchHeader.tsx`, `web/src/components/agchain/benchmarks/AgchainBenchmarkStepsList.tsx`, `web/src/components/agchain/benchmarks/AgchainBenchmarkStepInspector.tsx`, `web/src/components/agchain/benchmarks/AgchainBenchmarkConfigPanels.tsx`, `web/src/lib/agchainBenchmarks.ts`, `web/src/hooks/agchain/useAgchainBenchmarkSteps.ts`

**Step 1:** Add failing tests for benchmark-definition sections becoming live and for benchmark workbench slug-based deep links.
**Step 2:** Keep the existing step workbench intact while wiring live dataset, scoring, tool, sandbox, model, runner, and validation panels into the benchmark definition page.
**Step 3:** Normalize all router and service code to the locked `benchmarkSlug` or `benchmark_slug` contract.
**Step 4:** Re-run the targeted benchmark frontend tests.

**Test command:** `cd web && npm run test -- src/pages/agchain/AgchainBenchmarksPage.test.tsx`
**Expected output:** The benchmark-definition page test passes with live non-step sections and slug-based workbench routing.
**Commit:** `feat(web): build agchain benchmark definition surface`

### Task 13: Build scorer, tool, and sandbox frontend registries

**File(s):** `web/src/pages/agchain/AgchainScorersPage.tsx`, `web/src/pages/agchain/AgchainToolsPage.tsx`, `web/src/pages/agchain/AgchainSandboxesPage.tsx`, `web/src/components/agchain/scorers/AgchainScorersTable.tsx`, `web/src/components/agchain/scorers/AgchainScorerDetailPanel.tsx`, `web/src/components/agchain/tools/AgchainToolsTable.tsx`, `web/src/components/agchain/tools/AgchainToolDetailPanel.tsx`, `web/src/components/agchain/sandboxes/AgchainSandboxesTable.tsx`, `web/src/components/agchain/sandboxes/AgchainSandboxDetailPanel.tsx`, `web/src/lib/agchainScorers.ts`, `web/src/lib/agchainTools.ts`, `web/src/lib/agchainSandboxes.ts`, `web/src/hooks/agchain/useAgchainScorers.ts`, `web/src/hooks/agchain/useAgchainTools.ts`, `web/src/hooks/agchain/useAgchainSandboxes.ts`

**Step 1:** Add failing tests for scorer, tool, and sandbox registry pages.
**Step 2:** Replace scorer and tool placeholder pages with registry tables plus right-side detail or editor panels.
**Step 3:** Add the sandbox profiles page and its health-check UI using the locked shared type modules.
**Step 4:** Re-run the targeted registry page tests.

**Test command:** `cd web && npm run test -- src/pages/agchain/AgchainScorersPage.test.tsx src/pages/agchain/AgchainToolsPage.test.tsx src/pages/agchain/AgchainSandboxesPage.test.tsx`
**Expected output:** Scorer, tool, and sandbox page tests pass and the placeholder shells are replaced by the locked registry surfaces.
**Commit:** `feat(web): build agchain component registries`

### Task 14: Build the runs and results frontend

**File(s):** `web/src/pages/agchain/AgchainRunsPage.tsx`, `web/src/pages/agchain/AgchainResultsPage.tsx`, `web/src/components/agchain/runs/AgchainRunLaunchPanel.tsx`, `web/src/components/agchain/runs/AgchainRunsTable.tsx`, `web/src/components/agchain/results/AgchainResultsTable.tsx`, `web/src/components/agchain/results/AgchainRunLogViewer.tsx`, `web/src/components/agchain/results/AgchainRunLogSampleDrawer.tsx`, `web/src/lib/agchainRuns.ts`, `web/src/lib/agchainResults.ts`, `web/src/hooks/agchain/useAgchainRuns.ts`, `web/src/hooks/agchain/useAgchainResults.ts`

**Step 1:** Add failing tests for the runs page and results page.
**Step 2:** Replace the runs placeholder with the launch form, queue table, and retry or cancel controls.
**Step 3:** Replace the results placeholder with the split-view results table and Inspect-compatible log viewer.
**Step 4:** Use the shared `AgchainOperationStatus` contract for async operation polling rather than inventing a second operation state model.
**Step 5:** Re-run the targeted runs and results tests.

**Test command:** `cd web && npm run test -- src/pages/agchain/AgchainRunsPage.test.tsx src/pages/agchain/AgchainResultsPage.test.tsx`
**Expected output:** Runs and results page tests pass and the placeholder shells are replaced by the locked launch, queue, table, and log-viewer surfaces.
**Commit:** `feat(web): build agchain runs and results surfaces`

### Task 15: Instrument observability and verify the locked surface

**File(s):** `services/platform-api/app/api/routes/agchain_datasets.py`, `services/platform-api/app/api/routes/agchain_benchmarks.py`, `services/platform-api/app/api/routes/agchain_scorers.py`, `services/platform-api/app/api/routes/agchain_tools.py`, `services/platform-api/app/api/routes/agchain_sandboxes.py`, `services/platform-api/app/api/routes/agchain_runs.py`, `services/platform-api/app/api/routes/agchain_results.py`, `services/platform-api/app/api/routes/agchain_operations.py`, `services/platform-api/app/domain/agchain/inspect_dataset_materializer.py`, `services/platform-api/app/domain/agchain/task_registry.py`, `services/platform-api/app/domain/agchain/scorer_registry.py`, `services/platform-api/app/domain/agchain/tool_registry.py`, `services/platform-api/app/domain/agchain/sandbox_registry.py`, `services/platform-api/app/domain/agchain/run_registry.py`, `services/platform-api/app/domain/agchain/operation_queue.py`, `services/platform-api/app/domain/agchain/log_projection.py`, `services/platform-api/tests/test_agchain_observability.py`

**Step 1:** Add or update failing observability tests so every locked trace, metric, structured log, and attribute rule has a targeted assertion.
**Step 2:** Instrument every route and internal seam named in `## Locked Observability Surface`.
**Step 3:** Re-run the backend observability suite and fix any missing or redacted-wrong attributes.
**Step 4:** Verify the locked inventory counts and frozen seam rules against the actual changed files before claiming the work complete.

**Test command:** `cd services/platform-api && pytest -q tests/test_agchain_observability.py tests/test_agchain_operations.py tests/test_agchain_runs.py tests/test_agchain_results.py`
**Expected output:** All targeted backend observability, operations, runs, and results tests pass, and the emitted traces, metrics, and structured logs match the locked contract with no forbidden attributes.
**Commit:** `feat(platform-api): instrument agchain inspect observability`

## Locked Acceptance Contract

Phase 1 is complete only when all of the following are true:

1. A user can create and preview datasets from CSV, JSON, JSONL, and Hugging Face configs.
2. Materialized dataset samples preserve Inspect-native fields including `sandbox`, `files`, and `setup`.
3. A user can define and validate a benchmark or task version from `/app/agchain/settings/project/benchmark-definition` that references dataset versions, scorer versions, tool versions, sandbox profiles, model roles, and generate config.
4. A user can manage scorer, tool, and sandbox registry records from dedicated AGChain pages rather than placeholder shells.
5. A user can launch, cancel, and retry a run from `/app/agchain/runs` without resorting to direct CLI invocation.
6. The system persists Inspect-compatible full logs and displays them through `/app/agchain/results` with viewer tabs matching the Inspect information model: `Summary`, `Scores`, `Samples`, `Events`, and `JSON`.
7. The routes, traces, counters, histograms, structured logs, database tables, storage buckets, and deployment-surface requirements named in this plan all exist.
8. The placeholder datasets page is replaced by four concrete dataset surfaces: registry, add, detail, and version-draft.
9. A user can start dataset creation from the registry, preview before commit, inspect dataset details, and manipulate an existing dataset by drafting a new version from the detail workspace.
10. Any `202` operation path in this plan returns a durable operation resource that the frontend can poll and, when allowed, cancel.
11. Every user-visible dataset, benchmark, scorer, tool, sandbox, run, and result surface named here is backed by explicit API endpoints, persisted backing tables, worker or deployment contracts, and named OTel spans and metrics in this plan.

## Completion Criteria

The work is complete only when all of the following are true:

1. The required header, manifest sections, locked sections, frozen seam contract, and completion gate all exist in this document with no missing required heading.
2. The locked Platform API surface exists exactly as specified, including auth boundaries, slug-based benchmark paths, and durable `202` operation behavior.
3. The locked Observability surface exists exactly as specified, including route spans, internal spans, structured logs, metrics, and forbidden-attribute redaction rules.
4. The three migration files land with the exact filenames and column-level schema contracts locked in this plan.
5. The shared frontend type modules and frontend surface area exist exactly as specified, with no page-local duplicate API shapes replacing the shared contracts.
6. The Frozen Seam Contract remains intact: `platform-api` is the only runtime/backend surface, storage log blobs remain authoritative, Legal-10 build artifacts remain out of runtime scope, the benchmark step/runtime bridge remains locked, and `202` behavior remains durable and queue-backed.
7. The Locked Acceptance Contract above passes end to end.
8. The locked inventory counts and locked file inventory match the actual set of created and modified files.
9. The task-plan verification commands pass with the expected outputs written in the execution plan.

## Explicit Risks Accepted In This Plan

- Risk: full Inspect parity is broader than the earlier datasets proposal.
  Control: this plan explicitly treats datasets as inseparable from task, scorer, tool, sandbox, and log surfaces.
- Risk: arbitrary Python task execution inside platform API would be unsafe.
  Control: Phase 1 uses structured task-definition persistence and a runtime seam for execution rather than open code execution in the API process.
- Risk: log projection can drift from authoritative Inspect blobs.
  Control: storage blobs remain canonical and projection rows are treated as derived caches.
- Risk: Legal-10 build assets can leak into runtime assumptions.
  Control: keep build-time DuckDB and heavy raw-source processing outside Phase 1 runtime tables and APIs.
- Risk: async operation handling can stall if the worker is disabled or misconfigured.
  Control: the deployment surface now makes the worker mandatory for any shipped `202` path, and observability exposes pending-operation gauges plus failure logs.
- Risk: scale-to-zero hosting or multi-replica deployment can starve queue progress or double-claim operations.
  Control: the worker contract is lease-based with heartbeat expiry and explicit retry state in Postgres; if the chosen host cannot guarantee safe background progress for those leases, Phase 1 cannot ship any `202` path until the deployment plan is revised.

## Verification Checklist Before Approval

- Compare every route in this plan against existing mounted routes and confirm the additions are net-new.
- Compare every `202`-returning route in this plan against the operation-resource and worker contract.
- Compare sample field inventory against Inspect `Sample` and `FieldSpec`.
- Compare run-log payload expectations against Inspect `EvalLog`, `EvalSample`, and viewer tabs.
- Compare AGChain page inventory against dataset, benchmark, scorer, tool, sandbox, run, and result surfaces named here.
- Confirm the migration filenames are unique and compatible with the repo timestamp-hygiene rule.
- Confirm no Legal-10-specific runtime coupling is required for Phase 1 acceptance.
