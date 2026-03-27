# AG chain Benchmarks Table + Steps Workbench Implementation Plan

**Goal:** Build the first real AG chain `Benchmarks` surface as a table-backed benchmark catalog with `New Benchmark` creation and `Open Workbench` entry, plus the first real benchmark-local child page at `#steps`, so the AG chain shell stops rendering placeholder copy and gains a durable authoring surface for benchmark identity and ordered step flow.

**Architecture:** Keep benchmark identities and their versioned execution specs in Supabase, keep `services/platform-api` as the only runtime/backend surface the AG chain web app talks to, and preserve the already-shipped drill-navigation behavior under `/app/agchain/benchmarks/:benchmarkId`. The level-1 `Benchmarks` page is a catalog and entry surface, not a dashboard. Entering a benchmark must resolve to the benchmark workbench with `#steps` as the default section. This phase implements two real surfaces only: the catalog table and the editable `Steps` child page. Other benchmark-local hash sections remain navigable placeholders until their own plans land. The backend owns benchmark creation, benchmark summary aggregation, current-version resolution, and draft-step mutations. The frontend renders a table-first catalog and a two-column steps workbench against those routes. This plan must be read together with [2026-03-26-agchain-inspect-reference-runtime-boundary-plan.md](E:/writing-system/_agchain/docs/plans/2026-03-26-agchain-inspect-reference-runtime-boundary-plan.md): InspectAI is the primary runtime reference for providers, sandboxing, approval, scorer, and log patterns, but context delivery, payload admission, candidate-visible state, and fairness policy remain AG chain-owned and are not delegated to Inspect defaults. A core AG chain comparison mode is not only "which model scores highest on this benchmark," but also "which runtime policy bundle makes this model strongest on this benchmark." Benchmark catalog and workbench planning must preserve that runtime-policy identity as a first-class comparison axis rather than a secondary fairness footnote. Observability is first-class: every new route emits traces, metrics, and structured logs with AG chain-specific attributes and redaction rules.

**Tech Stack:** Supabase Postgres migrations and RLS, FastAPI, React + TypeScript, existing `platformApiFetch`, OpenTelemetry, pytest, Vitest.

**Status:** Draft
**Author:** Codex
**Date:** 2026-03-26

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/agchain/benchmarks` | List benchmark catalog rows for the level-1 table | New |
| POST | `/agchain/benchmarks` | Create a benchmark plus its initial draft spec version | New |
| GET | `/agchain/benchmarks/{benchmark_slug}` | Read one benchmark plus its current version summary for the workbench shell | New |
| GET | `/agchain/benchmarks/{benchmark_slug}/steps` | Read ordered steps for the current benchmark version | New |
| POST | `/agchain/benchmarks/{benchmark_slug}/steps` | Create a new step at the end of the current draft version | New |
| PATCH | `/agchain/benchmarks/{benchmark_slug}/steps/{benchmark_step_id}` | Update one step in the current draft version | New |
| POST | `/agchain/benchmarks/{benchmark_slug}/steps/reorder` | Persist a new ordered step sequence for the current draft version | New |
| DELETE | `/agchain/benchmarks/{benchmark_slug}/steps/{benchmark_step_id}` | Delete one step from the current draft version | New |

#### New endpoint contracts

`GET /agchain/benchmarks`

- Auth: `require_user_auth`
- Query params:
  - `search` optional case-insensitive match against benchmark name, slug, or description
  - `state` optional enum: `draft`, `ready`, `running`, `attention`, `archived`
  - `validation_status` optional enum: `pass`, `warn`, `fail`, `unknown`
  - `has_active_runs` optional boolean
- Response shape:
  - `items: []`
- each item contains:
    - `benchmark_id`
    - `benchmark_slug`
    - `benchmark_name`
    - `description`
    - `state`
    - `current_spec_label`
    - `current_spec_version`
    - `version_status`
    - `step_count`
    - `selected_eval_model_count`
    - `tested_model_count`
    - `tested_policy_bundle_count`
    - `validation_status`
    - `validation_issue_count`
    - `last_run_at`
    - `updated_at`
    - `href`
- Behavior:
  - returns benchmarks the current user can access through the platform-api ownership rules
  - derives `state` from current draft or current published version plus active runs and validation state
  - returns `tested_policy_bundle_count = 0` in this phase because `agchain_runs` does not yet persist a `runtime_policy_bundle_id` or equivalent runtime-policy identity
  - sorts by `updated_at DESC` unless filters override later
- Touches:
  - `public.agchain_benchmarks`
  - `public.agchain_benchmark_versions`
  - `public.agchain_benchmark_steps`
  - `public.agchain_benchmark_model_targets`
  - `public.agchain_runs`

`POST /agchain/benchmarks`

- Auth: `require_user_auth`
- Request body:
  - `benchmark_name`
  - `benchmark_slug` optional; if omitted, backend slugifies from `benchmark_name`
  - `description`
- Behavior:
  - creates a benchmark identity row
  - creates an initial draft version row with `version_status = 'draft'`
  - wires the new draft as the benchmark's current draft version
- Response shape:
  - `ok`
  - `benchmark_id`
  - `benchmark_slug`
  - `benchmark_version_id`
  - `redirect_path`
- Touches:
  - `public.agchain_benchmarks`
  - `public.agchain_benchmark_versions`

`GET /agchain/benchmarks/{benchmark_slug}`

- Auth: `require_user_auth`
- Response shape:
  - `benchmark`
  - `current_version`
  - `permissions`
  - `counts`
- Behavior:
  - resolves the current version as `current_draft_version_id` when present, else `current_published_version_id`
  - returns enough benchmark header data for the workbench page without embedding the whole step list
- Touches:
  - `public.agchain_benchmarks`
  - `public.agchain_benchmark_versions`
  - `public.agchain_benchmark_model_targets`
  - `public.agchain_runs`

`GET /agchain/benchmarks/{benchmark_slug}/steps`

- Auth: `require_user_auth`
- Response shape:
  - `benchmark`
  - `current_version`
  - `can_edit`
  - `steps: []`
  - each step contains:
    - `benchmark_step_id`
    - `step_order`
    - `step_id`
    - `display_name`
    - `step_kind`
    - `api_call_boundary`
    - `inject_payloads`
    - `scoring_mode`
    - `output_contract`
    - `scorer_ref`
    - `judge_prompt_ref`
    - `judge_grades_step_ids`
    - `enabled`
    - `step_config`
    - `updated_at`
- Behavior:
  - always sorts by `step_order ASC`
  - returns `can_edit = false` when the resolved version is not a draft
- Touches:
  - `public.agchain_benchmarks`
  - `public.agchain_benchmark_versions`
  - `public.agchain_benchmark_steps`

`POST /agchain/benchmarks/{benchmark_slug}/steps`

- Auth: `require_user_auth`
- Request body:
  - `step_id`
  - `display_name`
  - `step_kind`
  - `api_call_boundary`
  - `inject_payloads`
  - `scoring_mode`
  - `output_contract`
  - `scorer_ref` nullable
  - `judge_prompt_ref` nullable
  - `judge_grades_step_ids`
  - `enabled`
  - `step_config`
- Behavior:
  - only allowed when the resolved version is a draft owned by the current user
  - inserts the new row at the end of the ordered step list
  - updates cached `step_count` on the parent version row
- Response shape:
  - `ok`
  - `benchmark_step_id`
  - `step_order`
- Touches:
  - `public.agchain_benchmark_versions`
  - `public.agchain_benchmark_steps`

`PATCH /agchain/benchmarks/{benchmark_slug}/steps/{benchmark_step_id}`

- Auth: `require_user_auth`
- Request body:
  - any mutable subset of the `POST` contract
- Behavior:
  - only allowed on the current draft version owned by the current user
  - does not allow moving a step to another benchmark or version
- Response shape:
  - `ok`
  - `benchmark_step_id`
- Touches:
  - `public.agchain_benchmark_steps`

`POST /agchain/benchmarks/{benchmark_slug}/steps/reorder`

- Auth: `require_user_auth`
- Request body:
  - `ordered_step_ids: string[]`
- Behavior:
  - validates that the array contains every step exactly once for the current draft version
  - rewrites `step_order` densely in one transaction
- Response shape:
  - `ok`
  - `step_count`
- Touches:
  - `public.agchain_benchmark_steps`

`DELETE /agchain/benchmarks/{benchmark_slug}/steps/{benchmark_step_id}`

- Auth: `require_user_auth`
- Behavior:
  - only allowed on the current draft version owned by the current user
  - deletes the step and compacts `step_order`
  - updates cached `step_count` on the parent version row
- Response shape:
  - `ok`
  - `deleted_step_id`
- Touches:
  - `public.agchain_benchmark_steps`
  - `public.agchain_benchmark_versions`

### Observability

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Trace span | `agchain.benchmarks.list` | `services/platform-api/app/api/routes/agchain_benchmarks.py:list_benchmarks` | Measure catalog-read latency and filter usage |
| Trace span | `agchain.benchmarks.create` | `services/platform-api/app/api/routes/agchain_benchmarks.py:create_benchmark` | Measure benchmark creation latency and validation failures |
| Trace span | `agchain.benchmarks.get` | `services/platform-api/app/api/routes/agchain_benchmarks.py:get_benchmark` | Measure workbench header fetch latency |
| Trace span | `agchain.benchmarks.steps.get` | `services/platform-api/app/api/routes/agchain_benchmarks.py:get_benchmark_steps` | Measure steps child-page fetch latency |
| Trace span | `agchain.benchmarks.steps.create` | `services/platform-api/app/api/routes/agchain_benchmarks.py:create_benchmark_step` | Measure step creation latency |
| Trace span | `agchain.benchmarks.steps.update` | `services/platform-api/app/api/routes/agchain_benchmarks.py:update_benchmark_step` | Measure step edit latency |
| Trace span | `agchain.benchmarks.steps.reorder` | `services/platform-api/app/api/routes/agchain_benchmarks.py:reorder_benchmark_steps` | Measure reorder latency and transaction failures |
| Trace span | `agchain.benchmarks.steps.delete` | `services/platform-api/app/api/routes/agchain_benchmarks.py:delete_benchmark_step` | Measure step deletion latency |
| Metric counter | `platform.agchain.benchmarks.list.count` | `agchain_benchmarks.py:list_benchmarks` | Count catalog requests |
| Metric counter | `platform.agchain.benchmarks.create.count` | `agchain_benchmarks.py:create_benchmark` | Count successful benchmark creates |
| Metric counter | `platform.agchain.benchmarks.get.count` | `agchain_benchmarks.py:get_benchmark` | Count workbench shell fetches |
| Metric counter | `platform.agchain.benchmarks.steps.get.count` | `agchain_benchmarks.py:get_benchmark_steps` | Count steps child-page fetches |
| Metric counter | `platform.agchain.benchmarks.steps.create.count` | `agchain_benchmarks.py:create_benchmark_step` | Count successful step creates |
| Metric counter | `platform.agchain.benchmarks.steps.update.count` | `agchain_benchmarks.py:update_benchmark_step` | Count successful step updates |
| Metric counter | `platform.agchain.benchmarks.steps.reorder.count` | `agchain_benchmarks.py:reorder_benchmark_steps` | Count reorder attempts by result |
| Metric counter | `platform.agchain.benchmarks.steps.delete.count` | `agchain_benchmarks.py:delete_benchmark_step` | Count successful step deletes |
| Metric histogram | `platform.agchain.benchmarks.list.duration_ms` | `agchain_benchmarks.py:list_benchmarks` | Measure catalog latency |
| Metric histogram | `platform.agchain.benchmarks.steps.get.duration_ms` | `agchain_benchmarks.py:get_benchmark_steps` | Measure steps-read latency |
| Metric histogram | `platform.agchain.benchmarks.steps.write.duration_ms` | `agchain_benchmarks.py:create_benchmark_step`, `update_benchmark_step`, `reorder_benchmark_steps`, `delete_benchmark_step` | Measure step-write latency |
| Structured log | `agchain.benchmarks.created` | `agchain_benchmarks.py:create_benchmark` | Audit benchmark creation |
| Structured log | `agchain.benchmarks.steps.created` | `agchain_benchmarks.py:create_benchmark_step` | Audit step creation |
| Structured log | `agchain.benchmarks.steps.updated` | `agchain_benchmarks.py:update_benchmark_step` | Audit step edits |
| Structured log | `agchain.benchmarks.steps.reordered` | `agchain_benchmarks.py:reorder_benchmark_steps` | Audit step-order mutations |
| Structured log | `agchain.benchmarks.steps.deleted` | `agchain_benchmarks.py:delete_benchmark_step` | Audit step deletion |

Observability attribute rules:

- Allowed trace and metric attributes:
  - `benchmark_slug`
  - `version_status`
  - `validation_status`
  - `row_count`
  - `step_count`
  - `step_kind`
  - `scoring_mode`
  - `api_call_boundary`
  - `result`
  - `http.status_code`
  - `has_active_runs`
- Forbidden in trace or metric attributes:
  - full prompt templates
  - full system messages
  - `step_config` JSON
  - user email
  - user id
  - JWTs
  - provider credentials
  - raw benchmark description text beyond short labels
- Structured logs may include:
  - `benchmark_id`
  - `benchmark_version_id`
  - `benchmark_step_id`
  - operator `subject_id`
  - old vs new `step_order` counts
  - normalized validation errors
- Structured logs must not include:
  - prompt bodies
  - system-message text
  - step-config blobs
  - secrets
  - request headers

### Database Migrations

| Migration | Creates/Alters | Affects Existing Data? |
|-----------|----------------|------------------------|
| `20260326234500_agchain_benchmark_registry.sql` | Creates `public.agchain_benchmarks`, `public.agchain_benchmark_versions`, `public.agchain_benchmark_steps`, `public.agchain_benchmark_model_targets`, and `public.agchain_runs`; adds indexes, enables RLS, and grants service-role access | No |

#### Locked migration contract

`20260326234500_agchain_benchmark_registry.sql`

- Dependency:
  - this migration assumes `public.agchain_model_targets` exists from the AG chain Models plan
  - if `public.agchain_model_targets` does not exist yet, stop and land the models migration first
- Creates `public.agchain_benchmarks` with:
  - `benchmark_id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `benchmark_slug TEXT NOT NULL UNIQUE`
  - `benchmark_name TEXT NOT NULL`
  - `description TEXT NOT NULL DEFAULT ''`
  - `owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - `current_draft_version_id UUID NULL`
  - `current_published_version_id UUID NULL`
  - `archived_at TIMESTAMPTZ NULL`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- Creates `public.agchain_benchmark_versions` with:
  - `benchmark_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `benchmark_id UUID NOT NULL REFERENCES public.agchain_benchmarks(benchmark_id) ON DELETE CASCADE`
  - `version_label TEXT NOT NULL`
  - `version_status TEXT NOT NULL DEFAULT 'draft'`
  - `plan_family TEXT NOT NULL DEFAULT 'custom'`
  - `system_message TEXT NULL`
  - `payload_count INTEGER NOT NULL DEFAULT 0`
  - `step_count INTEGER NOT NULL DEFAULT 0`
  - `validation_status TEXT NOT NULL DEFAULT 'unknown'`
  - `validation_issue_count INTEGER NOT NULL DEFAULT 0`
  - `created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - `published_at TIMESTAMPTZ NULL`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- Creates `public.agchain_benchmark_steps` with:
  - `benchmark_step_id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `benchmark_version_id UUID NOT NULL REFERENCES public.agchain_benchmark_versions(benchmark_version_id) ON DELETE CASCADE`
  - `step_order INTEGER NOT NULL`
  - `step_id TEXT NOT NULL`
  - `display_name TEXT NOT NULL`
  - `step_kind TEXT NOT NULL`
  - `api_call_boundary TEXT NOT NULL DEFAULT 'own_call'`
  - `inject_payloads JSONB NOT NULL DEFAULT '[]'::jsonb`
  - `scoring_mode TEXT NOT NULL DEFAULT 'none'`
  - `output_contract TEXT NULL`
  - `scorer_ref TEXT NULL`
  - `judge_prompt_ref TEXT NULL`
  - `judge_grades_step_ids JSONB NOT NULL DEFAULT '[]'::jsonb`
  - `enabled BOOLEAN NOT NULL DEFAULT true`
  - `step_config_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- Creates `public.agchain_benchmark_model_targets` with:
  - `benchmark_model_target_id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `benchmark_version_id UUID NOT NULL REFERENCES public.agchain_benchmark_versions(benchmark_version_id) ON DELETE CASCADE`
  - `model_target_id UUID NOT NULL REFERENCES public.agchain_model_targets(model_target_id) ON DELETE CASCADE`
  - `selection_role TEXT NOT NULL`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- Creates `public.agchain_runs` with:
  - `run_id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `benchmark_id UUID NOT NULL REFERENCES public.agchain_benchmarks(benchmark_id) ON DELETE CASCADE`
  - `benchmark_version_id UUID NOT NULL REFERENCES public.agchain_benchmark_versions(benchmark_version_id) ON DELETE CASCADE`
  - `evaluated_model_target_id UUID NULL REFERENCES public.agchain_model_targets(model_target_id) ON DELETE SET NULL`
  - `judge_model_target_id UUID NULL REFERENCES public.agchain_model_targets(model_target_id) ON DELETE SET NULL`
  - `status TEXT NOT NULL`
  - `submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - `submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `started_at TIMESTAMPTZ NULL`
  - `completed_at TIMESTAMPTZ NULL`
  - `summary_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- Adds constraints:
  - `agchain_benchmark_versions` unique `(benchmark_id, version_label)`
  - `agchain_benchmark_steps` unique `(benchmark_version_id, step_order)`
  - `agchain_benchmark_steps` unique `(benchmark_version_id, step_id)`
  - `agchain_benchmark_model_targets` unique `(benchmark_version_id, model_target_id, selection_role)`
  - `version_status` check: `draft`, `published`, `archived`
  - `validation_status` check: `pass`, `warn`, `fail`, `unknown`
  - `step_kind` check: `model`, `judge`, `deterministic_post`, `aggregation`
  - `api_call_boundary` check: `own_call`, `continue_call`, `non_model`
  - `scoring_mode` check: `none`, `deterministic`, `judge`
  - `selection_role` check: `evaluated`, `judge`
  - `status` check: `queued`, `running`, `completed`, `failed`, `cancelled`
- Adds foreign keys from `public.agchain_benchmarks.current_draft_version_id` and `public.agchain_benchmarks.current_published_version_id` to `public.agchain_benchmark_versions.benchmark_version_id` after both tables exist
- Enables RLS on all five tables
- Grants:
  - service_role `SELECT, INSERT, UPDATE, DELETE`
  - no direct browser CRUD path is introduced by this migration
- Adds indexes:
  - `agchain_benchmarks_owner_updated_idx`
  - `agchain_benchmark_versions_benchmark_status_idx`
  - `agchain_benchmark_steps_version_order_idx`
  - `agchain_benchmark_model_targets_version_role_idx`
  - `agchain_runs_benchmark_status_submitted_idx`

### Edge Functions

No edge functions created or modified.

The benchmark catalog and steps workbench live in `platform-api`, not in Supabase edge functions. If importing Legal-10 packet data into the new tables later becomes a separate bootstrap concern, treat that as a follow-on plan rather than smuggling it into this surface plan.

### Frontend Surface Area

**New pages:** `0`

**New components:** `5`

| Component | File | Used by |
|-----------|------|---------|
| `AgchainBenchmarksToolbar` | `web/src/components/agchain/benchmarks/AgchainBenchmarksToolbar.tsx` | `AgchainBenchmarksPage.tsx` |
| `AgchainBenchmarksTable` | `web/src/components/agchain/benchmarks/AgchainBenchmarksTable.tsx` | `AgchainBenchmarksPage.tsx` |
| `AgchainBenchmarkWorkbenchHeader` | `web/src/components/agchain/benchmarks/AgchainBenchmarkWorkbenchHeader.tsx` | `AgchainBenchmarkWorkbenchPage.tsx` |
| `AgchainBenchmarkStepsList` | `web/src/components/agchain/benchmarks/AgchainBenchmarkStepsList.tsx` | `AgchainBenchmarkWorkbenchPage.tsx` |
| `AgchainBenchmarkStepInspector` | `web/src/components/agchain/benchmarks/AgchainBenchmarkStepInspector.tsx` | `AgchainBenchmarkWorkbenchPage.tsx` |

**New hooks:** `2`

| Hook | File | Used by |
|------|------|---------|
| `useAgchainBenchmarks` | `web/src/hooks/agchain/useAgchainBenchmarks.ts` | `AgchainBenchmarksPage.tsx` |
| `useAgchainBenchmarkSteps` | `web/src/hooks/agchain/useAgchainBenchmarkSteps.ts` | `AgchainBenchmarkWorkbenchPage.tsx` |

**New libraries/services:** `1`

| Library | File | Used by |
|---------|------|---------|
| `agchainBenchmarks` | `web/src/lib/agchainBenchmarks.ts` | `useAgchainBenchmarks.ts`, `useAgchainBenchmarkSteps.ts` |

**Modified pages:** `2`

| Page | File | What changes |
|------|------|--------------|
| `AgchainBenchmarksPage` | `web/src/pages/agchain/AgchainBenchmarksPage.tsx` | Replace placeholder copy with toolbar, benchmark table, empty state, and `New Benchmark` flow |
| `AgchainBenchmarkWorkbenchPage` | `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.tsx` | Replace placeholder section text with benchmark header and live `#steps` child page while preserving other hash placeholders |

**New tests:** `1`

| Test module | File | Covers |
|-------------|------|--------|
| Platform API route tests | `services/platform-api/tests/test_agchain_benchmarks.py` | List, create, detail, steps read, step mutation, and reorder contracts |

**Modified tests:** `2`

| Test module | File | Covers |
|-------------|------|--------|
| Page test | `web/src/pages/agchain/AgchainBenchmarksPage.test.tsx` | Real catalog render path, table columns, empty state, `New Benchmark` action, workbench links |
| Page test | `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx` | Default `#steps` behavior, live ordered steps panel, step inspector behavior |

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. Level-1 `Benchmarks` is a table-first benchmark catalog and entry surface, not a dashboard and not a placeholder marketing page.
2. Table rows represent benchmark identities. Versioned runspec data remains subordinate to the benchmark row and is summarized through the `Current Spec` column.
3. The page-level primary action is `New Benchmark`, and creation happens from the catalog page rather than from a separate wizard route.
4. Entering a benchmark resolves to `/app/agchain/benchmarks/:benchmarkId#steps`, and `#steps` is the default child page when no hash is present.
5. There is no benchmark `Overview` child page in this phase.
6. The first implemented benchmark-local child page is `Steps`. The other benchmark drill items remain navigable placeholders until their own plans land.
7. The `Steps` child page is a linear ordered-step editor with a step list and inspector. It is not a free-form DAG canvas because the current benchmark runtime is defined by authoritative array order and strictly sequential step execution within one evaluation unit.
8. The AG chain web app must talk to `services/platform-api`; it must not read or write the new AG chain benchmark tables directly from the browser.
9. This plan reuses the global model-registry table from the AG chain Models plan for count aggregates only. It does not implement the benchmark-local `#models` authoring page.
10. `Selected Eval Models` and `Tested Models` are catalog aggregates in this phase, not editable controls on the level-1 page. `tested_policy_bundle_count` is reserved for later run/results work and is returned as `0` in this phase.
11. `legal-10` packet files in `_agchain/legal-10` are source material for the table and step schema design. They are not fetched live by the browser or treated as the runtime database for the AG chain UI.
12. This phase does not freeze the future benchmark-local child-page taxonomy beyond `#steps`. After Inspect alignment, later child pages may shift toward a more execution-real vocabulary such as `Context`, `State`, `Tools`, `Sandbox`, `Approval`, and `Limits`.
13. Inspect's default task or solver context flow is not sufficient as the full AG chain policy surface. AG chain must continue to own session strategy, replay mode, carry-forward mode, and tool-equality policy above the Inspect runtime.
14. Within any benchmark version and run profile, all evaluated models must receive the same context, state, and tool policy bundle. Fairness is enforced by freezing the policy bundle, not by eliminating the policy surface.
15. The benchmark catalog must not imply that `tested models` alone is the meaningful coverage dimension. Arguably the most important insight is not only "which model wins," but "which runtime policy bundle makes this model strongest." However, this phase does not fabricate policy-bundle coverage from `agchain_runs`; that comparison mode remains for later run/results plans once runtime-policy identity is persisted.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. An authenticated user can open `/app/agchain/benchmarks` and see either a live table from `platform-api` or an explicit empty state with `New Benchmark`.
2. The table shows at least `Benchmark`, `State`, `Current Spec`, `Steps`, `Selected Eval Models`, `Tested Models`, `Validation`, and `Activity`.
3. The page contains a visible `New Benchmark` action that creates a benchmark and routes directly into its workbench at `#steps`.
4. Clicking a benchmark row or `Open Workbench` enters `/app/agchain/benchmarks/:benchmarkId#steps`.
5. Navigating to `/app/agchain/benchmarks/:benchmarkId` with no hash still renders `#steps` as the active child page.
6. The `#steps` child page renders the benchmark header plus an ordered step list fetched from `platform-api`.
7. Selecting a step opens a step inspector populated from the locked step fields in this plan.
8. On a draft version, the user can create, edit, reorder, and delete steps from the `#steps` child page.
9. After step mutations, the benchmark catalog reflects the updated `Steps` count without a full page reload.
10. No browser code performs direct Supabase CRUD against the new AG chain benchmark tables.
11. Each new backend route emits the locked trace span and structured log for its action.

### Locked Platform API Surface

#### New AG chain platform API endpoints: `8`

1. `GET /agchain/benchmarks`
2. `POST /agchain/benchmarks`
3. `GET /agchain/benchmarks/{benchmark_slug}`
4. `GET /agchain/benchmarks/{benchmark_slug}/steps`
5. `POST /agchain/benchmarks/{benchmark_slug}/steps`
6. `PATCH /agchain/benchmarks/{benchmark_slug}/steps/{benchmark_step_id}`
7. `POST /agchain/benchmarks/{benchmark_slug}/steps/reorder`
8. `DELETE /agchain/benchmarks/{benchmark_slug}/steps/{benchmark_step_id}`

#### Existing platform API endpoints reused as-is: `0`

#### Existing platform API support reused indirectly: `4`

1. Supabase JWT auth via `require_user_auth`
2. Existing `platformApiFetch` browser client contract
3. Existing OTel bootstrap and safe-attribute utilities
4. Existing AG chain model-target registry table from the AG chain Models plan

### Locked Observability Surface

#### New traces: `8`

1. `agchain.benchmarks.list`
2. `agchain.benchmarks.create`
3. `agchain.benchmarks.get`
4. `agchain.benchmarks.steps.get`
5. `agchain.benchmarks.steps.create`
6. `agchain.benchmarks.steps.update`
7. `agchain.benchmarks.steps.reorder`
8. `agchain.benchmarks.steps.delete`

#### New metrics: `8 counters`, `3 histograms`

1. `platform.agchain.benchmarks.list.count`
2. `platform.agchain.benchmarks.create.count`
3. `platform.agchain.benchmarks.get.count`
4. `platform.agchain.benchmarks.steps.get.count`
5. `platform.agchain.benchmarks.steps.create.count`
6. `platform.agchain.benchmarks.steps.update.count`
7. `platform.agchain.benchmarks.steps.reorder.count`
8. `platform.agchain.benchmarks.steps.delete.count`
9. `platform.agchain.benchmarks.list.duration_ms`
10. `platform.agchain.benchmarks.steps.get.duration_ms`
11. `platform.agchain.benchmarks.steps.write.duration_ms`

#### New structured logs: `5`

1. `agchain.benchmarks.created`
2. `agchain.benchmarks.steps.created`
3. `agchain.benchmarks.steps.updated`
4. `agchain.benchmarks.steps.reordered`
5. `agchain.benchmarks.steps.deleted`

### Locked Inventory Counts

#### Database

- New migrations: `1`
- Modified existing migrations: `0`

#### Backend

- New platform-api route modules: `1`
- New backend domain modules: `1`
- Modified backend entrypoint files: `1`

#### Frontend

- New top-level pages/routes: `0`
- Modified existing pages: `2`
- New visual components: `5`
- New hooks: `2`
- New libs/services: `1`

#### Tests

- New backend test modules: `1`
- New frontend test modules: `0`
- Modified existing frontend test modules: `2`

### Locked File Inventory

#### New files

- `E:\writing-system\supabase\migrations\20260326234500_agchain_benchmark_registry.sql`
- `E:\writing-system\services\platform-api\app\api\routes\agchain_benchmarks.py`
- `E:\writing-system\services\platform-api\app\domain\agchain\benchmark_registry.py`
- `E:\writing-system\services\platform-api\tests\test_agchain_benchmarks.py`
- `E:\writing-system\web\src\components\agchain\benchmarks\AgchainBenchmarksToolbar.tsx`
- `E:\writing-system\web\src\components\agchain\benchmarks\AgchainBenchmarksTable.tsx`
- `E:\writing-system\web\src\components\agchain\benchmarks\AgchainBenchmarkWorkbenchHeader.tsx`
- `E:\writing-system\web\src\components\agchain\benchmarks\AgchainBenchmarkStepsList.tsx`
- `E:\writing-system\web\src\components\agchain\benchmarks\AgchainBenchmarkStepInspector.tsx`
- `E:\writing-system\web\src\hooks\agchain\useAgchainBenchmarks.ts`
- `E:\writing-system\web\src\hooks\agchain\useAgchainBenchmarkSteps.ts`
- `E:\writing-system\web\src\lib\agchainBenchmarks.ts`

#### Modified files

- `E:\writing-system\services\platform-api\app\main.py`
- `E:\writing-system\web\src\pages\agchain\AgchainBenchmarksPage.tsx`
- `E:\writing-system\web\src\pages\agchain\AgchainBenchmarkWorkbenchPage.tsx`
- `E:\writing-system\web\src\pages\agchain\AgchainBenchmarksPage.test.tsx`
- `E:\writing-system\web\src\pages\agchain\AgchainBenchmarkWorkbenchPage.test.tsx`

#### Shared-file note

- `E:\writing-system\services\platform-api\app\domain\agchain\__init__.py` is intentionally not counted here because it may already be created by the AG chain Models plan. If it does not exist when implementation starts, revise the plan before proceeding.

## Frozen Benchmark Catalog And Steps Workbench Contract

The level-1 `Benchmarks` page is the benchmark catalog and entry surface. It must not drift into a dashboard, a run queue, or a storage browser. The table is the primary object on the page.

### Frozen benchmark table specification

| Column | Meaning | Source or derivation |
|--------|---------|----------------------|
| `Benchmark` | Benchmark name, slug, and short description | `agchain_benchmarks` |
| `State` | `draft`, `ready`, `running`, `attention`, or `archived` | derived from current version, active runs, and validation |
| `Current Spec` | Current draft or published version label | `agchain_benchmark_versions` |
| `Steps` | Number of authored steps in the current version | derived from `agchain_benchmark_steps` |
| `Selected Eval Models` | Count of selected evaluated-model targets for the current version | derived from `agchain_benchmark_model_targets` where `selection_role = 'evaluated'` |
| `Tested Models` | Count of distinct evaluated models exercised in completed runs for the benchmark | derived from `agchain_runs` |
| `Validation` | Current version validation badge plus issue count | `agchain_benchmark_versions` |
| `Activity` | Last run timestamp and last update timestamp | derived from `agchain_runs` plus `agchain_benchmarks.updated_at` |

The list API also returns `tested_policy_bundle_count`, but it is fixed at `0` in this phase. The benchmark catalog does not render it as a table column until a later run/results plan adds persisted runtime-policy identity to run records.

The table row contract is:

```ts
type BenchmarkListRow = {
  benchmarkId: string;
  benchmarkSlug: string;
  benchmarkName: string;
  description: string;
  state: 'draft' | 'ready' | 'running' | 'attention' | 'archived';
  currentSpecLabel: string;
  currentSpecVersion: string;
  versionStatus: 'draft' | 'published' | 'archived';
  stepCount: number;
  selectedEvalModelCount: number;
  testedModelCount: number;
  testedPolicyBundleCount: number;
  validationStatus: 'pass' | 'warn' | 'fail' | 'unknown';
  validationIssueCount: number;
  lastRunAt: string | null;
  updatedAt: string;
  href: string;
};
```

### Frozen `#steps` child-page specification

The first real benchmark-local child page is `#steps`. It is the default workbench view and the first benchmark authoring surface that becomes live.

The page must render:

- a benchmark header with benchmark name, current spec label, draft or published status, and `Open Workbench` context
- an ordered vertical list of step cards
- a step inspector for the currently selected step
- draft-only actions for `New Step`, `Save Order`, and destructive step removal

Each step card and inspector are driven by this contract:

```ts
type BenchmarkStepRow = {
  benchmarkStepId: string;
  stepOrder: number;
  stepId: string;
  displayName: string;
  stepKind: 'model' | 'judge' | 'deterministic_post' | 'aggregation';
  apiCallBoundary: 'own_call' | 'continue_call' | 'non_model';
  injectPayloads: string[];
  scoringMode: 'none' | 'deterministic' | 'judge';
  outputContract: string | null;
  scorerRef: string | null;
  judgePromptRef: string | null;
  judgeGradesStepIds: string[];
  enabled: boolean;
  stepConfig: Record<string, unknown>;
  updatedAt: string;
};
```

The page layout is explicitly two-column:

- left column:
  - ordered step cards
  - drag or button-based reorder controls
  - per-step summary badges for `stepKind`, `apiCallBoundary`, `scoringMode`, and `injectPayloads`
- right column:
  - selected-step inspector
  - editable fields for the locked `BenchmarkStepRow` contract

The `#steps` child page is where step ordering and API-call boundaries become user-controlled. It must not hide those controls behind generic JSON editors.

The `#steps` page is also intentionally linear. The legal-10 packet, especially `benchmark/plan.json`, shows a step schedule that is ordered and sequential. The current platform drill should reflect that truth instead of implying unsupported arbitrary graph execution. This also aligns well with Inspect's composite-solver model: the AG chain step list should be treated as authored input to a future custom solver chain, not as a generic node graph with arbitrary runtime semantics.

## Explicit Risks Accepted In This Plan

1. Only the benchmark catalog and the `#steps` child page become real in this phase. Other benchmark drill sections remain placeholders until their own plans land.
2. The benchmark-local `#models` page is not implemented here, so `Selected Eval Models` may remain low or zero until that follow-on plan is executed.
3. The `agchain_runs` table created here is aggregate-oriented for catalog counts. Full run orchestration, artifact persistence, and result inspection belong to later run and results plans.
4. Editing is restricted to the current draft version. If a benchmark resolves to a published-only version, the `#steps` page is read-only until a later version-management plan introduces draft cloning.
5. The currently shipped non-`#steps` benchmark drill items are placeholders and may be renamed or regrouped once the Inspect-aligned runtime taxonomy is formally planned.

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked API surface in this plan exists exactly as specified.
2. The locked traces, metrics, and structured logs exist exactly as specified.
3. The new Supabase migration exists and produces the locked tables and policies.
4. The inventory counts in this plan match the actual set of created and modified files.
5. `/app/agchain/benchmarks` no longer renders placeholder bullets and instead renders a live table or explicit empty state backed by `platform-api`.
6. `/app/agchain/benchmarks/:benchmarkId` no longer renders `Steps - not yet implemented` and instead renders the live `#steps` child page.
7. No part of the new AG chain `Benchmarks` surface performs direct browser CRUD against Supabase.

## Task 1: Create the AG chain benchmark registry migration

**File(s):** `E:\writing-system\supabase\migrations\20260326234500_agchain_benchmark_registry.sql`

**Step 1:** Write the migration that creates the five locked AG chain benchmark tables with their columns, constraints, indexes, grants, and RLS policies.
**Step 2:** Add the two deferred foreign keys from `agchain_benchmarks` to `agchain_benchmark_versions` after both tables exist.
**Step 3:** Verify the migration assumes the AG chain Models migration has already created `public.agchain_model_targets`.
**Step 4:** Check naming and policy style against the existing Supabase migration patterns already used in this repo.

**Test command:** `supabase db reset`
**Expected output:** Local reset completes successfully and the new AG chain benchmark tables exist with the expected constraints and indexes.

**Commit:** `feat: add agchain benchmark registry tables`

## Task 2: Write failing backend route tests for the AG chain Benchmarks API

**File(s):** `E:\writing-system\services\platform-api\tests\test_agchain_benchmarks.py`

**Step 1:** Add tests for `GET /agchain/benchmarks` list success, filter handling, and empty-state response.
**Step 2:** Add tests for `POST /agchain/benchmarks` creating a benchmark plus initial draft version.
**Step 3:** Add tests for `GET /agchain/benchmarks/{benchmark_slug}` current-version resolution.
**Step 4:** Add tests for `GET /agchain/benchmarks/{benchmark_slug}/steps` sorted step reads.
**Step 5:** Add tests for step create, update, reorder, and delete against a draft benchmark.
**Step 6:** Run the test module and verify it fails because the route module is not mounted yet.

**Test command:** `pytest services/platform-api/tests/test_agchain_benchmarks.py -q`
**Expected output:** The new test module fails with missing route or import errors before implementation.

**Commit:** `test: add failing agchain benchmarks api tests`

## Task 3: Implement the AG chain Benchmarks backend route and route registration

**File(s):** `E:\writing-system\services\platform-api\app\api\routes\agchain_benchmarks.py`, `E:\writing-system\services\platform-api\app\domain\agchain\benchmark_registry.py`, `E:\writing-system\services\platform-api\app\main.py`

**Step 1:** Create the domain helper that builds benchmark catalog queries, resolves the current draft or published version, and normalizes step rows.
**Step 2:** Create the FastAPI route module with the eight locked endpoints and the locked auth rules.
**Step 3:** Add OpenTelemetry spans, metrics, safe attributes, and structured logs exactly as locked in this plan.
**Step 4:** Mount the new router in `app/main.py` before the plugin catch-all.
**Step 5:** Run the backend test module and make it pass.

**Test command:** `pytest services/platform-api/tests/test_agchain_benchmarks.py -q`
**Expected output:** All tests in `test_agchain_benchmarks.py` pass.

**Commit:** `feat: add agchain benchmarks api`

## Task 4: Strengthen the failing frontend tests for the benchmark catalog and `#steps` child page

**File(s):** `E:\writing-system\web\src\pages\agchain\AgchainBenchmarksPage.test.tsx`, `E:\writing-system\web\src\pages\agchain\AgchainBenchmarkWorkbenchPage.test.tsx`

**Step 1:** Extend the existing catalog-page assertions into a stronger table-first render contract, preserving the current real column assertions and adding coverage for the remaining locked columns and `New Benchmark`.
**Step 2:** Expand the workbench test so it expects a live `#steps` child page rather than placeholder text.
**Step 3:** Mock the benchmark service layer for list and steps responses.
**Step 4:** Run the two page tests and verify they fail against the current placeholder pages.

**Test command:** `npm test -- src/pages/agchain/AgchainBenchmarksPage.test.tsx src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx`
**Expected output:** Both page tests fail because the current pages still render placeholder content.

**Commit:** `test: add failing agchain benchmarks page coverage`

## Task 5: Build the frontend service, hooks, catalog table, and steps workbench

**File(s):** `E:\writing-system\web\src\lib\agchainBenchmarks.ts`, `E:\writing-system\web\src\hooks\agchain\useAgchainBenchmarks.ts`, `E:\writing-system\web\src\hooks\agchain\useAgchainBenchmarkSteps.ts`, `E:\writing-system\web\src\components\agchain\benchmarks\AgchainBenchmarksToolbar.tsx`, `E:\writing-system\web\src\components\agchain\benchmarks\AgchainBenchmarksTable.tsx`, `E:\writing-system\web\src\components\agchain\benchmarks\AgchainBenchmarkWorkbenchHeader.tsx`, `E:\writing-system\web\src\components\agchain\benchmarks\AgchainBenchmarkStepsList.tsx`, `E:\writing-system\web\src\components\agchain\benchmarks\AgchainBenchmarkStepInspector.tsx`, `E:\writing-system\web\src\pages\agchain\AgchainBenchmarksPage.tsx`, `E:\writing-system\web\src\pages\agchain\AgchainBenchmarkWorkbenchPage.tsx`

**Step 1:** Create the service-layer fetch helpers that call the new `platform-api` benchmark routes.
**Step 2:** Create hooks for catalog loading, creation, step loading, selection state, and step mutation state.
**Step 3:** Build the catalog toolbar and table around the locked benchmark row contract.
**Step 4:** Build the benchmark workbench header, ordered steps list, and step inspector around the locked step contract.
**Step 5:** Replace the placeholder benchmark pages with the live composed surfaces while keeping non-steps hash sections as explicit placeholders.
**Step 6:** Run the two page tests and fix until they pass.

**Test command:** `npm test -- src/pages/agchain/AgchainBenchmarksPage.test.tsx src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx`
**Expected output:** The page tests pass and confirm the catalog and `#steps` child page render live surfaces.

**Commit:** `feat: build agchain benchmarks catalog and steps workbench`

## Task 6: Run locked verification for migration, backend, and frontend flows

**File(s):** `E:\writing-system\supabase\migrations\20260326234500_agchain_benchmark_registry.sql`, `E:\writing-system\services\platform-api\app\api\routes\agchain_benchmarks.py`, `E:\writing-system\services\platform-api\tests\test_agchain_benchmarks.py`, `E:\writing-system\web\src\pages\agchain\AgchainBenchmarksPage.tsx`, `E:\writing-system\web\src\pages\agchain\AgchainBenchmarkWorkbenchPage.tsx`

**Step 1:** Run the Supabase reset to verify the migration applies cleanly.
**Step 2:** Run the locked backend test module.
**Step 3:** Run the locked frontend page tests.
**Step 4:** Exercise `/app/agchain/benchmarks` locally: create one benchmark, verify redirect into `#steps`, add steps, reorder them, and confirm the catalog `Steps` count updates.

**Test command:** `supabase db reset && pytest services/platform-api/tests/test_agchain_benchmarks.py -q && npm test -- src/pages/agchain/AgchainBenchmarksPage.test.tsx src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx`
**Expected output:** All commands succeed; the new benchmark tables exist; backend tests pass; frontend page tests pass; local manual flow confirms create and step editing.

**Commit:** `chore: verify agchain benchmarks catalog`
