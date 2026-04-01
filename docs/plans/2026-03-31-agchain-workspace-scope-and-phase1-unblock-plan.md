# AGChain Workspace Scope And Phase 1 Unblock Implementation Plan

**Goal:** Phase A hardens project authorization and lands the durable operations substrate required to resume Phase 1 dataset and eval work safely. Phase B migrates the AGChain shell, selectors, and settings information architecture onto the first-pass `organization -> project -> child resource` scope model.

**Architecture:** Keep Supabase Postgres as the persisted system of record and `services/platform-api` as the only runtime/backend surface the AGChain web app talks to. Treat `public.user_projects` as the current physical project authority in this repo and environment, then layer AGChain organizations and explicit project memberships around that table rather than inventing a second project store. Add `project_id` ownership to AGChain benchmarks so benchmark rows stop acting as the shell's surrogate project registry, preserve benchmark routes and workbench surfaces as compatibility-facing child resources, and enforce project access in `platform-api` before any AGChain service-role reads or writes. Pull the durable `agchain_operations` queue, route, domain, and worker substrate forward before any additional dataset preview or materialization flow is allowed to return `202`.

**Tech Stack:** Supabase Postgres migrations and RLS, FastAPI, React + TypeScript, existing `platformApiFetch` and AGChain hooks, OpenTelemetry, pytest, Vitest.

**Status:** Draft
**Author:** Codex
**Date:** 2026-03-31
**Amends:** [2026-03-31-agchain-inspect-phase1-datasets-and-eval-surfaces-plan.md](/E:/writing-system/docs/plans/2026-03-31-agchain-inspect-phase1-datasets-and-eval-surfaces-plan.md)

## Manifest

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/agchain/organizations` | List AGChain organizations visible to the authenticated user for the shell selector | New |
| GET | `/agchain/projects` | List AGChain projects inside the selected organization plus primary benchmark summary | New |
| POST | `/agchain/projects` | Create a project and optionally seed its initial benchmark child resource | New |
| GET | `/agchain/projects/{project_id}` | Read one AGChain project summary, membership role, and settings/header metadata | New |
| PATCH | `/agchain/projects/{project_id}` | Update project metadata inside the selected organization | New |
| GET | `/agchain/operations/{operation_id}` | Poll durable AGChain operation status | New |
| POST | `/agchain/operations/{operation_id}/cancel` | Cancel a cancellable durable AGChain operation | New |
| GET | `/agchain/benchmarks` | List benchmark child resources; add `project_id` filter and stop acting as the project registry contract | Modified |
| POST | `/agchain/benchmarks` | Create a benchmark under an explicit project instead of relying on `owner_user_id` as the scope boundary | Modified |
| GET | `/agchain/benchmarks/{benchmark_slug}` | Resolve benchmark by slug, then enforce project access through the owning project | Modified |
| GET | `/agchain/benchmarks/{benchmark_slug}/steps` | Same auth change as benchmark detail | Modified |
| POST | `/agchain/benchmarks/{benchmark_slug}/steps` | Same auth change as benchmark detail | Modified |
| PATCH | `/agchain/benchmarks/{benchmark_slug}/steps/{benchmark_step_id}` | Same auth change as benchmark detail | Modified |
| POST | `/agchain/benchmarks/{benchmark_slug}/steps/reorder` | Same auth change as benchmark detail | Modified |
| DELETE | `/agchain/benchmarks/{benchmark_slug}/steps/{benchmark_step_id}` | Same auth change as benchmark detail | Modified |
| GET | `/agchain/datasets` | Keep current read contract, but enforce project access before any service-role read | Modified |
| GET | `/agchain/datasets/new/bootstrap` | Keep current read contract; return global defaults plus optional project-scoped defaults when `project_id` is supplied and authorized | Modified |
| GET | `/agchain/datasets/{dataset_id}/detail` | Keep current read contract, but enforce project access explicitly | Modified |
| GET | `/agchain/datasets/{dataset_id}/versions` | Keep current read contract, but enforce project access explicitly | Modified |
| GET | `/agchain/datasets/{dataset_id}/versions/{dataset_version_id}/source` | Derive owning project through dataset/version and enforce project access explicitly | Modified |
| GET | `/agchain/datasets/{dataset_id}/versions/{dataset_version_id}/mapping` | Same auth change as source route | Modified |
| GET | `/agchain/datasets/{dataset_id}/versions/{dataset_version_id}/validation` | Same auth change as source route | Modified |
| GET | `/agchain/datasets/{dataset_id}/versions/{dataset_version_id}/samples` | Keep current read contract, but enforce project access explicitly | Modified |
| GET | `/agchain/datasets/{dataset_id}/versions/{dataset_version_id}/samples/{sample_id}` | Derive owning project through dataset/version and enforce project access explicitly | Modified |

#### New endpoint contracts

`GET /agchain/organizations`

- Auth: `require_user_auth`
- Request: no body
- Response:
  - `items: []`
  - each item contains `organization_id`, `organization_slug`, `display_name`, `membership_role`, `is_personal`, `project_count`
- Touches:
  - `public.agchain_organizations`
  - `public.agchain_organization_members`

`GET /agchain/projects`

- Auth: `require_user_auth`
- Query params:
  - `organization_id` optional; if omitted, resolve the caller's personal organization first and fall back to the first accessible organization
  - `search` optional
- Response:
  - `items: []`
  - each item contains `project_id`, `organization_id`, `project_slug`, `project_name`, `description`, `membership_role`, `updated_at`, nullable `primary_benchmark_slug`, nullable `primary_benchmark_name`
- Touches:
  - `public.user_projects`
  - `public.agchain_project_memberships`
  - `public.agchain_benchmarks` for primary benchmark summary only

`POST /agchain/projects`

- Auth: `require_user_auth`
- Request body:
  - `organization_id` nullable
  - `project_name`
  - `project_slug` nullable
  - `description`
  - `seed_initial_benchmark` boolean default `true`
  - `initial_benchmark_name` nullable
- Behavior:
  - resolve the target organization and confirm the caller may create projects there
  - insert `public.user_projects`
  - insert `public.agchain_project_memberships` for the creator as `project_admin`
  - when `seed_initial_benchmark = true`, create one benchmark child resource plus its initial version in the same transaction
- Response:
  - `ok`
  - `project_id`
  - `project_slug`
  - nullable `primary_benchmark_slug`
  - `redirect_path`
- Touches:
  - `public.user_projects`
  - `public.agchain_project_memberships`
  - `public.agchain_benchmarks`
  - `public.agchain_benchmark_versions`

`GET /agchain/projects/{project_id}`

- Auth: `require_user_auth`
- Response:
  - `project`
    - `project_id`, `organization_id`, `project_slug`, `project_name`, `description`, `membership_role`, `updated_at`
  - `primary_benchmark`
    - nullable `benchmark_id`, `benchmark_slug`, `benchmark_name`, `current_version_id`, `current_version_label`
  - `settings_partitions`
    - locked values `project`, `organization`, `personal`
- Touches:
  - `public.user_projects`
  - `public.agchain_project_memberships`
  - `public.agchain_benchmarks`
  - `public.agchain_benchmark_versions`

`PATCH /agchain/projects/{project_id}`

- Auth: `require_user_auth`
- Request body:
  - mutable subset of `project_name`, `project_slug`, `description`
- Behavior:
  - reject writes unless membership role is `project_admin` or `organization_admin`
- Response:
  - `ok`
  - `project_id`
- Touches:
  - `public.user_projects`
  - `public.agchain_project_memberships`

#### Locked slug and role semantics

- `project_slug` is normalized to lowercase kebab-case, using only `a-z`, `0-9`, and `-`, with repeated separators collapsed and leading or trailing separators trimmed.
- `project_slug` uniqueness scope is `(organization_id, project_slug)`. The same slug may exist in different organizations, but never twice inside one organization.
- When `POST /agchain/projects` omits `project_slug`, generate it from `project_name`.
- Workspace-scope backfill uses the same slug generator. Benchmark-backed compatibility projects use the existing `benchmark_slug` when it is available and collision-free inside the target organization; otherwise they fall back to normalized project name.
- Collision handling is deterministic: append `-2`, `-3`, and so on inside the target organization. If the base slug would exceed the final length budget, truncate the base before adding the suffix.
- First-pass organization roles are exactly `organization_admin` and `organization_member`.
- First-pass project roles are exactly `project_admin`, `project_editor`, and `project_viewer`.
- `organization_admin` is the only first-pass role that may bypass direct project-membership rows for project-scoped AGChain reads and writes inside its organization.
- Only memberships with `membership_status = 'active'` authorize access.
- Disabled organization memberships do not authorize organization-admin bypass.
- Disabled project memberships do not authorize project reads or writes.

`GET /agchain/operations/{operation_id}`

- Auth: `require_user_auth`
- Behavior:
  - load the durable operation row
  - derive its owning `project_id`
  - enforce project access through the shared project-access helper before returning any operation fields
- Response: exact shared `AgchainOperationStatus` payload.
  - `operation_id`, `operation_type`, `status`, `poll_url`, `cancel_url`, `target_kind`, `target_id`, `attempt_count`, `progress`, `last_error`, `result`, `created_at`, `started_at`, `heartbeat_at`, `completed_at`
- Touches:
  - `public.agchain_operations`
  - `public.user_projects`
  - `public.agchain_project_memberships`

`POST /agchain/operations/{operation_id}/cancel`

- Auth: `require_user_auth`
- Request: no body
- Behavior:
  - load the durable operation row
  - derive its owning `project_id`
  - enforce project access through the shared project-access helper before changing cancellation state
- Response: exact shared `AgchainOperationStatus` payload after cancellation state is recorded.
- Touches:
  - `public.agchain_operations`
  - `public.user_projects`
  - `public.agchain_project_memberships`

#### Modified endpoint contracts

`GET /agchain/benchmarks`

- Query params:
  - `search`
  - `state`
  - `validation_status`
  - `has_active_runs`
  - optional `project_id`
  - optional `limit`
  - optional `cursor` or `offset`
- Response:
  - `items`
  - each item includes `benchmark_id`, `project_id`, `benchmark_slug`, `benchmark_name`, `description`, `latest_version_id`, `latest_version_label`, `dataset_version_id`, `scorer_count`, `tool_count`, `status`, `validation_status`, `updated_at`
  - nullable `next_cursor`
- Role in system:
  - child benchmark-resource list only
  - never the shell project registry
- Why:
  - current AGChain focus and project registry are benchmark-backed; the new plan must stop using the benchmark list as the authoritative project selector surface

`POST /agchain/benchmarks`

- Change:
  - `project_id` becomes required
  - created benchmark row writes `project_id`
  - create result remains the compatibility-facing benchmark create contract: `ok`, `benchmark_id`, `benchmark_slug`, `benchmark_version_id`, `redirect_path`
  - project access is enforced through project membership rather than `owner_user_id`
- Why:
  - benchmark remains a child resource under project instead of standing in for the project boundary

All benchmark detail and step routes

- Change:
  - load benchmark by slug
  - read its `project_id`
  - enforce access through the shared project access helper before any service-role read or write
- Why:
  - project is the primary collaboration and authorization boundary in the scope model

`GET /agchain/datasets/new/bootstrap`

- Change:
  - add optional `project_id` query param
  - when `project_id` is present, enforce project access first and return project-scoped defaults
  - when `project_id` is omitted, return global defaults only
  - keep the existing response envelope otherwise unchanged
- Why:
  - the plan claims project-aware defaults in this pass, so the scoping mechanism must be explicit

All dataset read routes

- Change:
  - keep the existing response envelopes
  - remove the current `del user_id` pass-through pattern
  - resolve and enforce owning project access explicitly before any admin query
  - routes without a `project_id` query parameter must walk `dataset -> project` and enforce access there
- Why:
  - the current dataset read tranche discards caller identity while using the service-role path, which makes project scoping an unenforced assumption

### Observability

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Trace span | `agchain.organizations.list` | `services/platform-api/app/api/routes/agchain_workspaces.py:list_organizations_route` | Measure organization-selector reads |
| Trace span | `agchain.projects.list` | `agchain_workspaces.py:list_projects_route` | Measure project-selector and registry reads |
| Trace span | `agchain.projects.create` | `agchain_workspaces.py:create_project_route` | Measure project creation and optional benchmark seeding |
| Trace span | `agchain.projects.get` | `agchain_workspaces.py:get_project_route` | Measure project detail/settings reads |
| Trace span | `agchain.projects.update` | `agchain_workspaces.py:update_project_route` | Measure project metadata writes |
| Trace span | `agchain.project_access.check` | `services/platform-api/app/domain/agchain/project_access.py:require_project_access` | Prove auth checks are explicit and observable |
| Trace span | `agchain.operations.get` | `services/platform-api/app/api/routes/agchain_operations.py:get_operation_route` | Measure operation polling latency |
| Trace span | `agchain.operations.cancel` | `agchain_operations.py:cancel_operation_route` | Measure cancellation writes |
| Trace span | `agchain.inspect.operation.lease` | `services/platform-api/app/domain/agchain/operation_queue.py:lease_operation` | Measure queue lease acquisition latency |
| Trace span | `agchain.inspect.operation.complete` | `operation_queue.py:complete_operation` | Measure durable completion writes |
| Metric counter | `platform.agchain.organizations.list.count` | `agchain_workspaces.py:list_organizations_route` | Count organization-selector reads |
| Metric counter | `platform.agchain.projects.list.count` | `agchain_workspaces.py:list_projects_route` | Count project-selector and project-registry reads |
| Metric counter | `platform.agchain.projects.create.count` | `agchain_workspaces.py:create_project_route` | Count project creation attempts |
| Metric counter | `platform.agchain.projects.update.count` | `agchain_workspaces.py:update_project_route` | Count project metadata updates |
| Metric counter | `platform.agchain.operations.get.count` | `agchain_operations.py:get_operation_route` | Count operation poll reads |
| Metric counter | `platform.agchain.operations.cancel.count` | `agchain_operations.py:cancel_operation_route` | Count operation cancellation attempts |
| Metric histogram | `platform.agchain.projects.list.duration_ms` | `agchain_workspaces.py:list_projects_route` | Measure project-registry latency |
| Metric histogram | `platform.agchain.project_access.check.duration_ms` | `project_access.py:require_project_access` | Measure auth-check latency |
| Metric histogram | `platform.agchain.operations.execution.duration_ms` | `operation_queue.py:complete_operation` | Measure per-operation completion duration |
| Structured log | `agchain.project.access_denied` | `project_access.py:require_project_access` | Audit denied access without leaking hidden-resource metadata |
| Structured log | `agchain.projects.created` | `agchain_workspaces.py:create_project_route` | Audit project creation |
| Structured log | `agchain.projects.updated` | `agchain_workspaces.py:update_project_route` | Audit project metadata edits |
| Structured log | `agchain.operation.failed` | `operation_queue.py:fail_operation` | Audit terminal operation failures |

Observability attribute rules:

- Allowed trace and metric attributes:
  - `organization_id_present`
  - `project_id_present`
  - `membership_role`
  - `operation_type`
  - `status`
  - `result`
  - `row_count`
  - `latency_ms`
  - `http.status_code`
- Forbidden in trace or metric attributes:
  - raw `user_id`
  - email
  - benchmark step payloads
  - dataset sample payloads
  - secrets
  - request headers
  - freeform provider or model config blobs
- Structured logs may include:
  - `project_id`
  - `organization_id`
  - `benchmark_slug`
  - `operation_id`
  - normalized denial reason
- Structured logs must not include:
  - raw sample data
  - API keys
  - source URIs containing credentials
  - request bodies from dataset preview/materialization uploads

### Database Migrations

| Migration | Creates/Alters | Affects Existing Data? |
|-----------|----------------|------------------------|
| `20260331213000_agchain_workspace_scope_alignment.sql` | Creates AGChain organizations and project membership tables; alters `public.user_projects` with `organization_id` and `project_slug`; alters `public.agchain_benchmarks` with `project_id`; backfills benchmark-backed projects and owner memberships; corrects AGChain project foreign keys to `public.user_projects` when those tables already exist | Yes - additive backfill only; existing benchmark rows are assigned to explicit projects and existing user-owned projects are assigned to seeded personal organizations |
| `20260331220000_agchain_operations_prereqs.sql` | Creates `public.agchain_operations` plus indexes and lease/retry columns required for durable `202` behavior | No destructive rewrite; additive queue substrate only |

#### Locked column-level schema: `20260331213000_agchain_workspace_scope_alignment.sql`

- User identity column intent in this plan:
  - `owner_user_id`, `user_id`, and `created_by` remain UUID identity fields without introducing new `auth.users(id)` foreign-key constraints in this pass unless a later migration step names one explicitly.
  - This keeps the workspace-scope migration additive and avoids widening auth-schema backfill risk while ownership semantics are being normalized.

- `public.agchain_organizations`
  - `organization_id uuid primary key default gen_random_uuid()`
  - `organization_slug text not null unique`
  - `display_name text not null`
  - `owner_user_id uuid not null`
  - `is_personal boolean not null default false`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
- `public.agchain_organization_members`
  - `organization_member_id uuid primary key default gen_random_uuid()`
  - `organization_id uuid not null references public.agchain_organizations(organization_id) on delete cascade`
  - `user_id uuid not null`
  - `membership_role text not null check (membership_role in ('organization_admin', 'organization_member'))`
  - `membership_status text not null default 'active' check (membership_status in ('active', 'disabled'))`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - unique `(organization_id, user_id)`
- `public.agchain_project_memberships`
  - `project_membership_id uuid primary key default gen_random_uuid()`
  - `project_id uuid not null references public.user_projects(project_id) on delete cascade`
  - `organization_id uuid not null references public.agchain_organizations(organization_id) on delete cascade`
  - `user_id uuid not null`
  - `membership_role text not null check (membership_role in ('project_admin', 'project_editor', 'project_viewer'))`
  - `membership_status text not null default 'active' check (membership_status in ('active', 'disabled'))`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - unique `(project_id, user_id)`
- `public.user_projects` additive columns
  - `organization_id uuid` references `public.agchain_organizations(organization_id)`
  - `project_slug text`
  - `created_by uuid`
  - unique `(organization_id, project_slug)` after backfill completes
  - supporting indexes on `(organization_id, updated_at desc)` and `(owner_id, updated_at desc)`
- `public.agchain_benchmarks` additive columns
  - `project_id uuid` references `public.user_projects(project_id)`
  - supporting index on `(project_id, updated_at desc)`
  - `owner_user_id` remains in place during this pass as a compatibility field, but it no longer defines the auth boundary after the backfill

#### Locked column-level schema: `20260331220000_agchain_operations_prereqs.sql`

- `public.agchain_operations`
  - `operation_id uuid primary key default gen_random_uuid()`
  - `project_id uuid not null references public.user_projects(project_id) on delete cascade`
  - `operation_type text not null`
  - `status text not null check (status in ('queued', 'running', 'completed', 'failed', 'cancel_requested', 'cancelled'))`
  - `target_kind text`
  - `target_id text`
  - `idempotency_key text`
  - `payload_jsonb jsonb not null default '{}'::jsonb`
  - `progress_jsonb jsonb not null default '{}'::jsonb`
  - `last_error_jsonb jsonb`
  - `result_jsonb jsonb`
  - `attempt_count integer not null default 0`
  - `max_attempts integer not null default 3`
  - `lease_owner text`
  - `lease_expires_at timestamptz`
  - `started_at timestamptz`
  - `heartbeat_at timestamptz`
  - `completed_at timestamptz`
  - `cancel_requested_at timestamptz`
  - `created_by uuid`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - unique `(project_id, idempotency_key)` when `idempotency_key` is not null
  - supporting indexes on `(status, lease_expires_at)` and `(project_id, created_at desc)`

### Edge Functions

No edge functions created or modified.

This implementation stays in `platform-api`. Existing edge functions and browser Supabase reads are compatibility references only.

### Frontend Surface Area

**New pages:** `0`

**New components:** `1`

| Component | File | Used by |
|-----------|------|---------|
| `AgchainOrganizationSwitcher` | `web/src/components/agchain/AgchainOrganizationSwitcher.tsx` | `AgchainShellLayout.tsx` |

**New hooks:** `1`

| Hook | File | Used by |
|------|------|---------|
| `useAgchainWorkspaceContext` | `web/src/hooks/agchain/useAgchainWorkspaceContext.ts` | `AgchainShellLayout.tsx`, `AgchainProjectSwitcher.tsx`, `AgchainSettingsPage.tsx` |

**New libraries/services:** `1`

| Library | File | Used by |
|---------|------|---------|
| `agchainWorkspaces` | `web/src/lib/agchainWorkspaces.ts` | `useAgchainWorkspaceContext.ts`, `AgchainProjectsPage.tsx` |

**Modified pages:** `5`

| Page | File | What changes |
|------|------|--------------|
| `AgchainProjectsPage` | `web/src/pages/agchain/AgchainProjectsPage.tsx` | Stop using benchmark list as the project registry; use the new projects endpoint and project-first copy |
| `AgchainSettingsPage` | `web/src/pages/agchain/AgchainSettingsPage.tsx` | Keep the scope partitions, but remove benchmark-backed ownership copy and use explicit project/org/user framing |
| `AgchainBenchmarksPage` | `web/src/pages/agchain/AgchainBenchmarksPage.tsx` | Treat benchmark definition as a child resource under selected project instead of a benchmark-backed project surrogate |
| `AgchainOverviewPage` | `web/src/pages/agchain/AgchainOverviewPage.tsx` | Consume project-first focus state and stop assuming benchmark-backed focus labels |
| `AgchainSectionPage` | `web/src/pages/agchain/AgchainSectionPage.tsx` | Update generic child-page copy from “benchmark-backed project” language to explicit project scope |

**Modified components:** `3`

| Component | File | What changes |
|-----------|------|--------------|
| `AgchainProjectSwitcher` | `web/src/components/agchain/AgchainProjectSwitcher.tsx` | Switch from benchmark-backed project list to real project rows |
| `AgchainShellLayout` | `web/src/components/layout/AgchainShellLayout.tsx` | Add organization selector and use workspace context instead of benchmark-only focus |
| `AgchainBenchmarkNav` | `web/src/components/agchain/AgchainBenchmarkNav.tsx` | Keep benchmark-definition rail as child-resource navigation under project settings |

**Modified hooks/services:** `4`

| File | What changes |
|------|--------------|
| `web/src/hooks/agchain/useAgchainProjectFocus.ts` | Preserve outward compatibility where needed, but source focus from project rows instead of benchmark rows |
| `web/src/lib/agchainProjectFocus.ts` | Store selected organization and project IDs rather than benchmark slug only |
| `web/src/lib/agchainBenchmarks.ts` | Remove the benchmark-list-as-project-registry coupling; benchmark APIs become child-resource APIs |
| `web/src/router.tsx` | Keep legacy benchmark redirects, but re-anchor AGChain shell defaulting on organization/project context |

## Source Verification Ledger

### Current AGChain runtime seams verified

- `services/platform-api/app/main.py` currently mounts `agchain_benchmarks`, `agchain_models`, and `agchain_datasets`; it does not mount `agchain_operations` or any org/project workspace router.
- `services/platform-api/app/domain/agchain/` currently contains `benchmark_registry.py`, `dataset_registry.py`, `model_registry.py`, and provider/type helpers; it does not contain `project_access.py`, `workspace_registry.py`, or `operation_queue.py`.
- `web/src/router.tsx` currently redirects `/app/agchain` to `/app/agchain/overview` when the benchmark-backed focus hook has a selection and to `/app/agchain/projects` otherwise.
- `web/src/components/layout/AgchainShellLayout.tsx` currently renders only a benchmark-backed `AgchainProjectSwitcher` in the AGChain rail header and only opens rail 2 for `/app/agchain/settings/project/benchmark-definition`.

### Current scope/auth drift verified

- `services/platform-api/app/domain/agchain/dataset_registry.py` discards `user_id` in every read helper and uses `get_supabase_admin()` keyed by request identifiers.
- `services/platform-api/app/domain/agchain/benchmark_registry.py` scopes benchmark reads and writes by `owner_user_id`, not by project.
- `web/src/lib/agchainBenchmarks.ts` defines `AgchainProjectRegistryRow` as benchmark fields and implements `fetchAgchainProjectRegistry()` by calling `GET /agchain/benchmarks`.
- `web/src/hooks/agchain/useAgchainProjectFocus.ts` stores `benchmark_slug` in local storage and resolves the “project” focus from benchmark rows.
- `web/src/pages/agchain/AgchainSettingsPage.tsx` already shows `Project`, `Organization`, and `Personal` partitions, but it still says the selected benchmark-backed project “owns” the settings surface.

### Current project-table reality verified

- The connected Supabase project currently has `public.user_projects` and does not expose `public.projects` in `list_tables`.
- The repo's AGChain dataset migration file currently references `public.projects(project_id)`, which conflicts with the connected database and with frontend/runtime code such as `web/src/lib/tables.ts` and `services/platform-api/app/api/routes/storage.py` that use `user_projects`.
- Because this plan needs a real project authority, it must normalize on `public.user_projects` rather than continuing the `projects` vs `user_projects` split.

### Current operations-substrate blocker verified

- The repo does not currently contain `services/platform-api/app/api/routes/agchain_operations.py`.
- The repo does not currently contain `services/platform-api/app/domain/agchain/operation_queue.py`.
- The repo does not currently contain `services/platform-api/app/workers/agchain_operations.py`.
- The repo does not currently contain the planned operations migration from the existing Phase 1 dataset/eval plan.

## Problem Statement

AGChain now has three separate but connected problems:

1. The shell and settings direction are moving toward explicit organization, project, and user scope, but the live frontend still resolves “project” through benchmark rows and benchmark slug storage.
2. The current dataset read tranche uses service-role access without proving project access first, which makes the project boundary soft at the exact point where AGChain is becoming a multi-user, shared-workspace system.
3. The existing Phase 1 plan allows Task 5 to depend on durable `202` behavior before the queue, route, domain, and worker substrate for those `202` paths exists in the repo.

This plan fixes those problems in the smallest first pass that still makes the scopes real, keeps benchmark as a child resource, and unblocks continuation of the Phase 1 dataset/eval work without faking async behavior.

## Execution Phasing

- **Phase A: Phase 1 unblock gate.** Tasks 1 through 4 are the required prerequisite tranche before the amended Task 5 in the active Phase 1 dataset/eval plan may resume. This phase covers persistence alignment, explicit project auth, project-backed benchmark auth, and the durable operations substrate.
- **Phase B: Workspace productization.** Tasks 5 and 6 complete the shell, selector, settings, and page migration implied by the new scope model. They are required for this plan to be fully complete, but they are not a blocker for resuming backend Task 5 work once Phase A is landed and verified.
- **Phase C: Re-lock and handoff.** Task 7 re-amends the active Phase 1 plan, verifies the new prerequisite order, and confirms the migrated shell and compatibility routes still reach benchmark-backed workspaces.

## Pre-Implementation Contract

No major product, API, observability, persistence, auth-boundary, worker, or inventory decision may be improvised during implementation. If any locked item in this plan needs to change, implementation must stop and this plan must be revised first.

## Locked Product Decisions

1. `Organization` is the membership and governance scope above project.
2. `Project` is the focused AGChain workspace and the primary authorization boundary.
3. `Benchmark` remains a real child resource under project. This plan does not collapse benchmark into project metadata.
4. `public.user_projects` is the current physical project table authority for this implementation. AGChain-owned runtime paths must converge on that table instead of continuing the `projects` vs `user_projects` split.
5. First pass organization support is minimal and operational: one seeded personal organization per existing user plus explicit organization and project membership rows. Full invite flows, permission-group builders, and rich admin UIs are deferred.
6. Existing benchmark-backed AGChain project behavior is preserved only as a compatibility bridge during the migration. New AGChain shell state and new AGChain project routes are project-first.
7. Unauthorized cross-project AGChain access returns `403` to match current project-ownership route conventions already used elsewhere in `platform-api`.
8. The AGChain web app must talk to `platform-api`. This plan does not add direct browser Supabase CRUD for AGChain scope, auth, or operations surfaces.
9. No new AGChain route may return `202` unless a durable `public.agchain_operations` row already exists and the worker lease contract is mounted.
10. `seed_initial_benchmark` on project creation is a transitional compatibility behavior for the current benchmark-definition-first workflow. It is not the long-term statement that benchmark is the parent workspace.
11. The first-pass role model is intentionally narrow: `organization_admin`, `organization_member`, `project_admin`, `project_editor`, and `project_viewer` only.

## Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. An authenticated user sees an organization selector and a project selector in the AGChain shell.
2. The AGChain shell defaults using organization/project context, not benchmark rows masquerading as projects.
3. The AGChain settings landing still shows `Project`, `Organization`, and `Personal` partitions, but the copy and routing no longer describe a benchmark row as the owner of that surface.
4. Existing benchmark-backed AGChain entries are backfilled into explicit projects and remain reachable through the migrated shell without manual data repair.
5. `GET /agchain/datasets`, dataset detail, dataset versions, sample list, sample detail, source, mapping, and validation all reject unauthorized cross-project access before any service-role dataset read occurs.
6. Benchmark detail and benchmark step routes enforce access through `benchmark.project_id`, not through `owner_user_id` alone.
7. `GET /agchain/projects` becomes the AGChain project registry surface; `GET /agchain/benchmarks` remains only a child benchmark list surface.
8. `GET /agchain/operations/{operation_id}` and `POST /agchain/operations/{operation_id}/cancel` exist and read durable queue rows from `public.agchain_operations`.
9. No dataset preview or materialization route returns `202` until the durable operations substrate from this plan exists.
10. The updated Phase 1 continuation path is explicit: auth hardening and operations prerequisites land before any further Task 5 async behavior is implemented.
11. A representative benchmark-backed AGChain entry that existed before the migration is reachable after backfill through `GET /agchain/projects`, through the project-scoped benchmark list, and through the benchmark-definition route under the migrated shell.

## Locked Platform API Surface

### New platform API endpoints: `7`

1. `GET /agchain/organizations`
2. `GET /agchain/projects`
3. `POST /agchain/projects`
4. `GET /agchain/projects/{project_id}`
5. `PATCH /agchain/projects/{project_id}`
6. `GET /agchain/operations/{operation_id}`
7. `POST /agchain/operations/{operation_id}/cancel`

### Existing platform API endpoints modified: `17`

1. `GET /agchain/benchmarks`
2. `POST /agchain/benchmarks`
3. `GET /agchain/benchmarks/{benchmark_slug}`
4. `GET /agchain/benchmarks/{benchmark_slug}/steps`
5. `POST /agchain/benchmarks/{benchmark_slug}/steps`
6. `PATCH /agchain/benchmarks/{benchmark_slug}/steps/{benchmark_step_id}`
7. `POST /agchain/benchmarks/{benchmark_slug}/steps/reorder`
8. `DELETE /agchain/benchmarks/{benchmark_slug}/steps/{benchmark_step_id}`
9. `GET /agchain/datasets`
10. `GET /agchain/datasets/new/bootstrap`
11. `GET /agchain/datasets/{dataset_id}/detail`
12. `GET /agchain/datasets/{dataset_id}/versions`
13. `GET /agchain/datasets/{dataset_id}/versions/{dataset_version_id}/source`
14. `GET /agchain/datasets/{dataset_id}/versions/{dataset_version_id}/mapping`
15. `GET /agchain/datasets/{dataset_id}/versions/{dataset_version_id}/validation`
16. `GET /agchain/datasets/{dataset_id}/versions/{dataset_version_id}/samples`
17. `GET /agchain/datasets/{dataset_id}/versions/{dataset_version_id}/samples/{sample_id}`

## Locked Observability Surface

### New traces: `10`

1. `agchain.organizations.list`
2. `agchain.projects.list`
3. `agchain.projects.create`
4. `agchain.projects.get`
5. `agchain.projects.update`
6. `agchain.project_access.check`
7. `agchain.operations.get`
8. `agchain.operations.cancel`
9. `agchain.inspect.operation.lease`
10. `agchain.inspect.operation.complete`

### New structured logs: `4`

1. `agchain.project.access_denied`
2. `agchain.projects.created`
3. `agchain.projects.updated`
4. `agchain.operation.failed`

### New metrics: `6 counters`, `3 histograms`

1. `platform.agchain.organizations.list.count`
2. `platform.agchain.projects.list.count`
3. `platform.agchain.projects.create.count`
4. `platform.agchain.projects.update.count`
5. `platform.agchain.operations.get.count`
6. `platform.agchain.operations.cancel.count`
7. `platform.agchain.projects.list.duration_ms`
8. `platform.agchain.project_access.check.duration_ms`
9. `platform.agchain.operations.execution.duration_ms`

### Existing AGChain route traces preserved and amended: `10`

1. `agchain.datasets.list`
2. `agchain.datasets.new.bootstrap`
3. `agchain.datasets.detail.get`
4. `agchain.datasets.versions.list`
5. `agchain.datasets.versions.source.get`
6. `agchain.datasets.versions.mapping.get`
7. `agchain.datasets.versions.validation.get`
8. `agchain.datasets.samples.list`
9. `agchain.datasets.samples.get`
10. `agchain.benchmarks.*` route spans already present in `agchain_benchmarks.py`

## Locked Inventory Counts

### Database

- New migrations: `2`
- Modified existing migrations: `0`

### Backend

- New route modules: `2`
- New domain modules: `3`
- New worker modules: `1`
- Modified route modules: `2`
- Modified domain modules: `3`
- Modified backend entrypoints/config files: `2`

### Frontend

- New top-level pages/routes: `0`
- New visual components: `1`
- New hooks: `1`
- New libraries/services: `1`
- Modified pages: `5`
- Modified components: `3`
- Modified hooks/services: `4`

### Tests

- New backend test modules: `2`
- New frontend test modules: `1`
- Modified existing backend test modules: `2`
- Modified existing frontend test modules: `6`

### Documentation

- Modified existing plan files: `1`

## Locked File Inventory

### New files

- `supabase/migrations/20260331213000_agchain_workspace_scope_alignment.sql`
- `supabase/migrations/20260331220000_agchain_operations_prereqs.sql`
- `services/platform-api/app/api/routes/agchain_workspaces.py`
- `services/platform-api/app/api/routes/agchain_operations.py`
- `services/platform-api/app/domain/agchain/workspace_registry.py`
- `services/platform-api/app/domain/agchain/project_access.py`
- `services/platform-api/app/domain/agchain/operation_queue.py`
- `services/platform-api/app/workers/agchain_operations.py`
- `services/platform-api/tests/test_agchain_workspaces.py`
- `services/platform-api/tests/test_agchain_operations.py`
- `web/src/lib/agchainWorkspaces.ts`
- `web/src/hooks/agchain/useAgchainWorkspaceContext.ts`
- `web/src/components/agchain/AgchainOrganizationSwitcher.tsx`
- `web/src/components/agchain/AgchainOrganizationSwitcher.test.tsx`

### Modified files

- `services/platform-api/app/main.py`
- `services/platform-api/app/core/config.py`
- `services/platform-api/app/api/routes/agchain_benchmarks.py`
- `services/platform-api/app/api/routes/agchain_datasets.py`
- `services/platform-api/app/domain/agchain/__init__.py`
- `services/platform-api/app/domain/agchain/benchmark_registry.py`
- `services/platform-api/app/domain/agchain/dataset_registry.py`
- `services/platform-api/tests/test_agchain_benchmarks.py`
- `services/platform-api/tests/test_agchain_datasets.py`
- `web/src/router.tsx`
- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/layout/AgchainShellLayout.test.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.test.tsx`
- `web/src/components/agchain/AgchainBenchmarkNav.tsx`
- `web/src/lib/agchainBenchmarks.ts`
- `web/src/lib/agchainProjectFocus.ts`
- `web/src/hooks/agchain/useAgchainProjectFocus.ts`
- `web/src/hooks/agchain/useAgchainProjectFocus.test.tsx`
- `web/src/pages/agchain/AgchainProjectsPage.tsx`
- `web/src/pages/agchain/AgchainProjectsPage.test.tsx`
- `web/src/pages/agchain/AgchainSettingsPage.tsx`
- `web/src/pages/agchain/AgchainSettingsPage.test.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.test.tsx`
- `web/src/pages/agchain/AgchainOverviewPage.tsx`
- `web/src/pages/agchain/AgchainSectionPage.tsx`
- `docs/plans/2026-03-31-agchain-inspect-phase1-datasets-and-eval-surfaces-plan.md`

## Frozen Seam Contract

`public.user_projects` is the current physical project row store. This plan does not create a second project table for AGChain. It layers organizations and explicit project memberships around `user_projects`, then moves AGChain-owned runtime surfaces onto that authority.

Do not keep using benchmark rows as the AGChain project registry once this plan begins. Benchmarks remain child resources.

Do not rely on frontend focus state, local storage, or request-supplied `project_id` alone as proof of access. The backend must re-establish project authorization before any service-role AGChain read or write.

Do not return non-durable operation-like payloads. Any shipped `202` path must be backed by `public.agchain_operations` plus the worker lease contract from this plan.

## Explicit Risks Accepted In This Plan

1. First-pass organization support is intentionally minimal. It creates real scope boundaries without implementing every future membership-management or permission-group UX.
2. Benchmarks keep their existing slug-based routes during this pass even after becoming project-owned child resources. A later plan can decide whether benchmark URLs become fully project-scoped.
3. This plan normalizes AGChain-owned runtime paths and AGChain shell state. It does not attempt a repo-wide cleanup of every non-AGChain `projects` vs `user_projects` reference.
4. Project creation seeds one initial benchmark child resource by default only as a transitional compatibility bridge so the current benchmark-definition-first workflow keeps functioning while the project boundary becomes explicit.

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked API surface in this plan exists exactly as specified.
2. `public.user_projects`, organization membership, and AGChain benchmark ownership are aligned exactly as specified.
3. The locked traces and structured logs in this plan exist exactly as specified.
4. Dataset and benchmark routes no longer rely on implicit project focus or `owner_user_id` alone to authorize service-role AGChain access.
5. The AGChain shell defaults from organization/project selector state instead of benchmark list rows.
6. The AGChain project registry route no longer proxies the benchmark list as its backing contract.
7. The durable operations substrate exists before any additional dataset or benchmark flow is allowed to return `202`.
8. The inventory counts in this plan match the actual set of created and modified files.
9. The existing Phase 1 dataset/eval plan can safely resume only after this plan's auth hardening and operations-prerequisite tasks are complete.

## Execution Plan

### Task 1: Write the workspace scope alignment migration

**File(s):** `supabase/migrations/20260331213000_agchain_workspace_scope_alignment.sql`

**Step 1:** Create `public.agchain_organizations`, `public.agchain_organization_members`, and `public.agchain_project_memberships` with role/status checks and indexes on `(organization_id, user_id)` and `(project_id, user_id)`.
**Step 2:** Alter `public.user_projects` to add nullable `organization_id`, `project_slug`, `created_by`, and non-destructive supporting indexes.
**Step 3:** Alter `public.agchain_benchmarks` to add nullable `project_id` referencing `public.user_projects(project_id)` and supporting indexes on `(project_id, updated_at desc)`.
**Step 4:** Seed one personal organization per existing user, assign each existing `user_projects` row to that personal organization, and create project-admin membership rows from current `owner_id`.
**Step 5:** Backfill each existing AGChain benchmark into an explicit project by resolving or creating a benchmark-backed project row for the owner, then write `agchain_benchmarks.project_id`.
**Step 6:** If AGChain dataset tables already exist, drop and recreate any `public.projects` foreign keys so they reference `public.user_projects` instead.
**Step 7:** Apply the migration on a disposable dev database and run explicit verification queries before leaving this task. The verification must prove:
  - no `public.user_projects` row is left with null `organization_id`
  - no `public.user_projects` row is missing a `project_admin` membership for the owning user
  - no existing `public.agchain_benchmarks` row is left with null `project_id`
  - no AGChain runtime foreign key still targets `public.projects`

**Verification SQL (run after the reset against the disposable dev database):**

```sql
select count(*) as projects_missing_organization_id
from public.user_projects
where organization_id is null;

select count(*) as owner_projects_missing_active_admin_membership
from public.user_projects up
left join public.agchain_project_memberships pm
  on pm.project_id = up.project_id
 and pm.user_id = up.owner_id
 and pm.membership_role = 'project_admin'
 and pm.membership_status = 'active'
where pm.project_membership_id is null;

select count(*) as benchmarks_missing_project_id
from public.agchain_benchmarks
where project_id is null;

select count(*) as agchain_runtime_fks_still_targeting_public_projects
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
  and tc.table_name like 'agchain_%'
  and ccu.table_schema = 'public'
  and ccu.table_name = 'projects';
```

**Test command:** `cd supabase && supabase db reset`
**Expected output:** The local database resets with the new migration applied, and the Task 1 verification queries return zero unexpected rows for membership, organization, benchmark ownership, and foreign-key alignment gaps.

**Commit:** `feat(agchain): align workspace scope persistence`

### Task 2: Add the shared project-access helper and harden dataset auth

**File(s):** `services/platform-api/app/domain/agchain/project_access.py`, `services/platform-api/app/domain/agchain/dataset_registry.py`, `services/platform-api/app/api/routes/agchain_datasets.py`, `services/platform-api/tests/test_agchain_datasets.py`

**Step 1:** Write failing backend tests that prove cross-project dataset reads are rejected with `403` for list, bootstrap when `project_id` is supplied, detail, version source, and sample detail.
**Step 2:** Implement `require_project_access()` and helper loaders in `project_access.py` using `public.user_projects`, active `public.agchain_project_memberships`, and active organization-admin bypass rules.
**Step 3:** Replace the current `del user_id` dataset read pattern with explicit project access checks before every admin query.
**Step 4:** For dataset routes that do not receive `project_id` directly, derive the owning project through dataset/version lookup and then enforce access.
**Step 5:** Add the `agchain.project_access.check` trace and `agchain.project.access_denied` structured log, then update route span attributes so project auth is explicit in telemetry.

**Test command:** `cd services/platform-api && pytest -q tests/test_agchain_datasets.py`
**Expected output:** Dataset route tests pass and include non-mocked cross-project rejection coverage.

**Commit:** `fix(agchain): enforce project access on dataset reads`

### Task 3: Re-anchor benchmarks to projects and add workspace routes

**File(s):** `services/platform-api/app/api/routes/agchain_workspaces.py`, `services/platform-api/app/domain/agchain/workspace_registry.py`, `services/platform-api/app/domain/agchain/benchmark_registry.py`, `services/platform-api/app/api/routes/agchain_benchmarks.py`, `services/platform-api/app/domain/agchain/__init__.py`, `services/platform-api/tests/test_agchain_workspaces.py`, `services/platform-api/tests/test_agchain_benchmarks.py`

**Step 1:** Write failing tests for `GET /agchain/organizations`, `GET /agchain/projects`, `POST /agchain/projects`, `GET /agchain/projects/{project_id}`, and `PATCH /agchain/projects/{project_id}`, including project-admin vs organization-admin vs viewer or editor rejection coverage.
**Step 2:** Implement workspace registry helpers that list organizations, list projects, create projects, and read/update project metadata through `public.user_projects` plus AGChain membership tables.
**Step 3:** Modify benchmark registry reads and writes to use `benchmark.project_id` plus the shared project-access helper instead of `owner_user_id` as the auth boundary.
**Step 4:** Add `project_id` support to `GET /agchain/benchmarks`, make `POST /agchain/benchmarks` require `project_id`, and keep benchmark list semantics strictly child-resource scoped.
**Step 4a:** Preserve `seed_initial_benchmark` only as transitional compatibility behavior. The created project remains the scope parent even when the initial benchmark child is seeded automatically.
**Step 5:** Mount the new workspace router in `services/platform-api/app/main.py`.

**Test command:** `cd services/platform-api && pytest -q tests/test_agchain_workspaces.py tests/test_agchain_benchmarks.py`
**Expected output:** Workspace and benchmark tests pass for organization/project listing, seeded project creation, and project-backed benchmark auth.

**Commit:** `feat(agchain): add workspace registry and project-backed benchmarks`

### Task 4: Pull forward the durable operations prerequisites

**File(s):** `supabase/migrations/20260331220000_agchain_operations_prereqs.sql`, `services/platform-api/app/api/routes/agchain_operations.py`, `services/platform-api/app/domain/agchain/operation_queue.py`, `services/platform-api/app/workers/agchain_operations.py`, `services/platform-api/app/core/config.py`, `services/platform-api/app/main.py`, `services/platform-api/tests/test_agchain_operations.py`

**Step 1:** Write failing tests for operation polling, cancellation, unauthorized cross-project operation poll rejection, unauthorized cross-project operation cancel rejection, lease retry behavior, and worker-safe completion writes.
**Step 2:** Create `public.agchain_operations` with durable status, idempotency, lease, retry, and cancellation columns exactly as required for shipped `202` paths.
**Step 3:** Implement `operation_queue.py` helpers for create, lease, heartbeat, complete, fail, retry, and cancel.
**Step 4:** Implement `agchain_operations.py` route handlers for poll and cancel using `require_user_auth` plus project access through the owning project row.
**Step 5:** Implement `workers/agchain_operations.py` as the only lease consumer in this phase and wire lifecycle startup/shutdown plus the exact new settings in `main.py` and `core/config.py`:
  - `agchain_operations_worker_enabled` / `AGCHAIN_OPERATIONS_WORKER_ENABLED`
  - `agchain_operations_worker_poll_interval_seconds` / `AGCHAIN_OPERATIONS_WORKER_POLL_INTERVAL_SECONDS`
  - `agchain_operations_worker_batch_size` / `AGCHAIN_OPERATIONS_WORKER_BATCH_SIZE`
  - `agchain_operations_worker_lease_seconds` / `AGCHAIN_OPERATIONS_WORKER_LEASE_SECONDS`

**Test command:** `cd services/platform-api && pytest -q tests/test_agchain_operations.py`
**Expected output:** Durable operation tests pass for poll, cancel, lease safety, retry lineage, and worker lifecycle contracts.

**Commit:** `feat(agchain): pull forward durable operations substrate`

### Task 5: Adapt the AGChain shell to explicit organization and project focus

**File(s):** `web/src/lib/agchainWorkspaces.ts`, `web/src/hooks/agchain/useAgchainWorkspaceContext.ts`, `web/src/lib/agchainProjectFocus.ts`, `web/src/hooks/agchain/useAgchainProjectFocus.ts`, `web/src/components/agchain/AgchainOrganizationSwitcher.tsx`, `web/src/components/agchain/AgchainProjectSwitcher.tsx`, `web/src/components/layout/AgchainShellLayout.tsx`, `web/src/router.tsx`, `web/src/components/layout/AgchainShellLayout.test.tsx`, `web/src/components/agchain/AgchainOrganizationSwitcher.test.tsx`, `web/src/components/agchain/AgchainProjectSwitcher.test.tsx`, `web/src/hooks/agchain/useAgchainProjectFocus.test.tsx`

**Step 1:** Add the workspace client and hook that load organizations and projects from `platform-api`.
**Step 2:** Update local AGChain focus storage to track selected `organization_id` and `project_id`, not just benchmark slug.
**Step 3:** Add `AgchainOrganizationSwitcher` above the existing project switcher in the AGChain shell header.
**Step 4:** Preserve a compatibility wrapper in `useAgchainProjectFocus()` so existing pages can migrate without a full one-shot rewrite.
**Step 5:** Update the AGChain index redirect to prefer organization/project context and keep legacy benchmark redirects only as compatibility bridges.

**Test command:** `cd web && npx vitest run src/components/layout/AgchainShellLayout.test.tsx src/components/agchain/AgchainOrganizationSwitcher.test.tsx src/components/agchain/AgchainProjectSwitcher.test.tsx src/hooks/agchain/useAgchainProjectFocus.test.tsx`
**Expected output:** Shell and focus tests pass for organization selection, project selection, persistence, and compatibility redirects.

**Commit:** `feat(agchain): add organization and project shell focus`

### Task 6: Recast AGChain projects, settings, and benchmark pages around the scope model

**File(s):** `web/src/pages/agchain/AgchainProjectsPage.tsx`, `web/src/pages/agchain/AgchainProjectsPage.test.tsx`, `web/src/pages/agchain/AgchainSettingsPage.tsx`, `web/src/pages/agchain/AgchainSettingsPage.test.tsx`, `web/src/pages/agchain/AgchainBenchmarksPage.tsx`, `web/src/pages/agchain/AgchainBenchmarksPage.test.tsx`, `web/src/pages/agchain/AgchainOverviewPage.tsx`, `web/src/pages/agchain/AgchainSectionPage.tsx`, `web/src/lib/agchainBenchmarks.ts`, `web/src/components/agchain/AgchainBenchmarkNav.tsx`

**Step 1:** Update the AGChain projects page so it uses `GET /agchain/projects` rather than the benchmark list, while keeping seeded benchmark creation as the default CTA path.
**Step 2:** Update the settings landing copy so `Project`, `Organization`, and `Personal` are explicit scope partitions rather than placeholders “owned” by a benchmark-backed project.
**Step 3:** Update benchmark definition copy and loading behavior so benchmark is presented as a child resource under the selected project.
**Step 4:** Update overview and generic section copy to stop describing benchmark rows as the owning project surface.
**Step 5:** Keep `/app/agchain/benchmarks/:benchmarkId` as a compatibility redirect into the benchmark-definition child page under project settings.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainProjectsPage.test.tsx src/pages/agchain/AgchainSettingsPage.test.tsx src/pages/agchain/AgchainBenchmarksPage.test.tsx`
**Expected output:** Page tests pass for project-first registry behavior, scoped settings framing, and benchmark-as-child routing.

**Commit:** `feat(agchain): recast shell pages around workspace scope`

### Task 7: Re-lock Phase 1 continuation and verify the blocker corrections

**File(s):** `docs/plans/2026-03-31-agchain-inspect-phase1-datasets-and-eval-surfaces-plan.md`, `services/platform-api/tests/test_agchain_operations.py`, `services/platform-api/tests/test_agchain_datasets.py`

**Step 1:** Update the active Phase 1 datasets/eval plan with a short amendment note that Task 4.1 auth hardening and the operations prerequisite tranche from this plan must land before any further Task 5 `202` work.
**Step 2:** Run the locked backend tests for datasets, workspaces, benchmarks, and operations together.
**Step 3:** Verify no repo file still claims that benchmark list rows are the AGChain project registry contract.
**Step 4:** Verify one representative pre-migration benchmark-backed AGChain entry is reachable after the backfill through `GET /agchain/projects`, the project-scoped benchmark list, and the benchmark-definition child route under the migrated shell.
**Step 5:** Hand off this plan and the amended Phase 1 plan together so execution continues in the corrected order.

**Test command:** `cd services/platform-api && pytest -q tests/test_agchain_datasets.py tests/test_agchain_workspaces.py tests/test_agchain_benchmarks.py tests/test_agchain_operations.py`
**Expected output:** Auth hardening, workspace scope, benchmark project ownership, durable operations prerequisites, and representative migrated benchmark reachability all pass together before Task 5 resumes.

**Commit:** `docs(agchain): lock workspace scope prerequisite order for phase1`

## Execution Handoff

- Read this plan fully before starting.
- Follow the locked scope, auth, operations, and inventory decisions exactly.
- Execution rule: only Phase A is the immediate prerequisite for resuming backend Phase 1 Task 5 work. Phase B is workspace productization and may proceed afterward.
- Read the amended [2026-03-31-agchain-inspect-phase1-datasets-and-eval-surfaces-plan.md](/E:/writing-system/docs/plans/2026-03-31-agchain-inspect-phase1-datasets-and-eval-surfaces-plan.md) together with this plan before resuming Task 5 work.
- If any implementation step would require a different project authority table, a non-durable `202` path, or a different parent/child hierarchy than the one locked here, stop and revise the plan first.
