# AG chain Models Surface Implementation Plan

**Goal:** Build the first real AG chain level-1 `Models` surface as a global model-registry table backed by new Supabase tables, `services/platform-api` routes, and OpenTelemetry instrumentation, while aligning the provider identity and health-probe architecture with `inspect_ai`'s provider-registry patterns rather than a flat free-text CRUD model. This plan is intentionally limited to the global model/provider registry and its health/readiness management.

**Architecture:** Keep Supabase as the persisted system of record and `services/platform-api` as the only runtime/backend surface the AG chain web app talks to. The new `Models` page is a global registry of model targets supported by AG chain, not a benchmark-local model assignment screen. Benchmark-specific evaluated-model and judge-model selection remains inside the benchmark workbench and is explicitly out of scope for this plan. Runtime-profile authoring, context/statefulness configuration, tool/sandbox policy design, run scheduling, and results comparison are also explicitly out of scope for this plan. AG chain's broader product thesis is not only "which model wins," but also "which runtime policy makes this model strongest." That runtime-policy comparison mode is first-class for the platform, but it belongs to later benchmark, runner, and results plans rather than to this level-1 `Models` surface. This implementation introduces a provider-catalog seam in `platform-api` inspired by `inspect_ai`: model targets reference a canonical `provider_slug` plus optional qualifier and provider-specific args, while the backend resolves probe behavior and supported-provider metadata through code-owned provider definitions. Observability is first-class: every new route emits traces, metrics, and structured logs with AG chain-specific attributes and redaction rules, and health refreshes emit provider-probe-specific telemetry suitable for later anomaly analysis.

**Tech Stack:** Supabase Postgres migrations and RLS, FastAPI, React + TypeScript, existing `platformApiFetch`, OpenTelemetry, pytest, Vitest, InspectAI-informed provider registry patterns.

**Status:** Partially implemented. Tasks 2-5 are landed in the working tree. Task 1 migration application verification and Task 6 locked end-to-end verification remain blocked locally until Docker Desktop / the Supabase local runtime is available.
**Author:** Codex
**Date:** 2026-03-26

## Implementation Checkpoint

The following surface is implemented on disk:

- `services/platform-api/app/api/routes/agchain_models.py`
- `services/platform-api/app/domain/agchain/__init__.py`
- `services/platform-api/app/domain/agchain/model_provider_catalog.py`
- `services/platform-api/app/domain/agchain/model_registry.py`
- `services/platform-api/app/main.py`
- `services/platform-api/tests/test_agchain_models.py`
- `supabase/migrations/20260326170000_agchain_model_targets.sql`
- `web/src/components/agchain/models/AgchainModelsToolbar.tsx`
- `web/src/components/agchain/models/AgchainModelsTable.tsx`
- `web/src/components/agchain/models/AgchainModelInspector.tsx`
- `web/src/hooks/agchain/useAgchainModels.ts`
- `web/src/lib/agchainModels.ts`
- `web/src/pages/agchain/AgchainModelsPage.tsx`
- `web/src/pages/agchain/AgchainModelsPage.test.tsx`

Verified locally:

- `pytest services/platform-api/tests/test_agchain_models.py -q` -> passed
- `npm test -- src/pages/agchain/AgchainModelsPage.test.tsx` -> passed

Still blocked locally:

- `npx supabase db reset`
  - blocked because the local Docker / Supabase runtime is unavailable
  - migration-shape verification is therefore not complete yet

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/agchain/models/providers` | List the supported AG chain provider catalog for create/edit flows | New |
| GET | `/agchain/models` | List global AG chain model targets for the table view | New |
| GET | `/agchain/models/{model_target_id}` | Read one model target plus recent health-check history for the inspector | New |
| POST | `/agchain/models` | Create a model target row validated against the provider catalog | New |
| PATCH | `/agchain/models/{model_target_id}` | Update mutable model target metadata | New |
| POST | `/agchain/models/{model_target_id}/refresh-health` | Run a provider-aware readiness/connectivity probe, persist result, and update current health | New |

#### New endpoint contracts

`GET /agchain/models/providers`

- Auth: `require_user_auth`
- Request: no body
- Response shape:
  - `items: []`
  - each item contains `provider_slug`, `display_name`, `supports_custom_base_url`, `supported_auth_kinds`, `default_probe_strategy`, `default_capabilities`, `supports_model_args`, `notes`
- Touches:
  - code-owned provider catalog in `services/platform-api/app/domain/agchain/model_provider_catalog.py`
- Notes:
  - this endpoint is the runtime-owned supported-provider list for the AG chain `Models` surface
  - it is not benchmark-local and it is not stored in a new database table during this phase

`GET /agchain/models`

- Auth: `require_user_auth`
- Query params:
  - `provider_slug` optional exact filter
  - `compatibility` optional enum: `evaluated`, `judge`, `any`
  - `health_status` optional enum: `healthy`, `degraded`, `error`, `unknown`
  - `enabled` optional boolean
  - `search` optional case-insensitive match against label, provider display name, qualified model, or model name
- Notes:
  - pagination is intentionally deferred in this phase because expected registry cardinality is low; revisit once the table is expected to materially exceed roughly `100` targets
- Response shape:
  - `items: []`
  - each item contains `model_target_id`, `label`, `provider_slug`, `provider_display_name`, `provider_qualifier`, `model_name`, `qualified_model`, `api_base_display`, `auth_kind`, `credential_status`, `enabled`, `supports_evaluated`, `supports_judge`, `capabilities`, `health_status`, `health_checked_at`, `last_latency_ms`, `probe_strategy`, `notes`, `created_at`, `updated_at`
- Touches:
  - `public.agchain_model_targets`
  - read-only joins/lookups into `public.user_api_keys`, `public.user_provider_connections` only for derived `credential_status`
  - code-owned provider catalog for display metadata
- Credential status contract:
  - values in this phase: `ready`, `missing`, `invalid`, `disconnected`, `not_required`
  - this is derived for the requesting authenticated user, not as a global platform-wide readiness judgment

`GET /agchain/models/{model_target_id}`

- Auth: `require_user_auth`
- Response shape:
  - `model_target`
  - `recent_health_checks`
  - `provider_definition`
- Touches:
  - `public.agchain_model_targets`
  - `public.agchain_model_health_checks`
  - read-only credential readiness lookups as above
  - code-owned provider catalog

`POST /agchain/models`

- Auth: `require_superuser`
- Request body:
  - `label`
  - `provider_slug`
  - `provider_qualifier` nullable
  - `model_name`
  - `qualified_model`
  - `api_base` nullable
  - `auth_kind`
  - `credential_source_jsonb`
  - `model_args_jsonb`
  - `supports_evaluated`
  - `supports_judge`
  - `capabilities_jsonb`
  - `probe_strategy`
  - `notes`
  - `enabled`
- Response shape:
  - `ok`
  - `model_target_id`
- Touches:
  - `public.agchain_model_targets`
  - code-owned provider catalog for provider validation and default-resolution
- Identity notes:
  - `provider_slug`, `provider_qualifier`, `model_name`, and `qualified_model` are identity-defining fields in this phase
  - `qualified_model` is operator-provided, trimmed by the frontend service layer, and stored as submitted rather than derived server-side

`PATCH /agchain/models/{model_target_id}`

- Auth: `require_superuser`
- Request body:
  - any mutable subset of the `POST` contract except immutable identity fields
- Immutable identity fields:
  - `provider_slug`
  - `provider_qualifier`
  - `model_name`
  - `qualified_model`
- Response shape:
  - `ok`
  - `model_target_id`
- Touches:
  - `public.agchain_model_targets`
  - code-owned provider catalog for provider validation if provider-owned fields are changed

`DELETE /agchain/models/{model_target_id}`

- Not created in this phase
- Reason:
  - model targets are disabled via the `enabled` field rather than deleted from the level-1 `Models` surface

`POST /agchain/models/{model_target_id}/refresh-health`

- Auth: `require_superuser`
- Request body:
  - none
- Behavior:
  - load model target metadata
  - resolve provider definition from the provider catalog
  - resolve credential readiness from existing credential tables
  - select the effective probe strategy from target override or provider default
  - if the target is probeable over HTTP, run a lightweight request using `httpx`
  - store one history row with provider/probe metadata
  - update the target row's current health fields
- Response shape:
  - `ok`
  - `health_status`
  - `latency_ms`
  - `checked_at`
  - `message`
  - `probe_strategy`
- Touches:
  - `public.agchain_model_targets`
  - `public.agchain_model_health_checks`
  - read-only credential lookup tables
  - code-owned provider catalog

### Observability

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Trace span | `agchain.models.providers.list` | `services/platform-api/app/api/routes/agchain_models.py:list_supported_providers` | Measure provider catalog reads and support later provider-catalog debugging |
| Trace span | `agchain.models.list` | `services/platform-api/app/api/routes/agchain_models.py:list_models` | Measure table-read latency and filter usage |
| Trace span | `agchain.models.get` | `services/platform-api/app/api/routes/agchain_models.py:get_model` | Measure detail-read latency and inspector fetch failures |
| Trace span | `agchain.models.create` | `services/platform-api/app/api/routes/agchain_models.py:create_model` | Measure create latency and provider-validation failures |
| Trace span | `agchain.models.update` | `services/platform-api/app/api/routes/agchain_models.py:update_model` | Measure edit latency and write failures |
| Trace span | `agchain.models.refresh_health` | `services/platform-api/app/api/routes/agchain_models.py:refresh_model_health` | Measure probe orchestration latency and distinguish readiness failure from probe failure |
| Trace span | `agchain.models.provider_probe` | `services/platform-api/app/domain/agchain/model_registry.py:refresh_health` | Capture provider-specific probe strategy, duration, and outcome |
| Metric counter | `platform.agchain.models.providers.list.count` | `agchain_models.py:list_supported_providers` | Count provider-catalog reads |
| Metric counter | `platform.agchain.models.list.count` | `agchain_models.py:list_models` | Count list requests |
| Metric counter | `platform.agchain.models.create.count` | `agchain_models.py:create_model` | Count successful creates |
| Metric counter | `platform.agchain.models.update.count` | `agchain_models.py:update_model` | Count successful updates |
| Metric counter | `platform.agchain.models.refresh_health.count` | `agchain_models.py:refresh_model_health` | Count health-check attempts by outcome |
| Metric histogram | `platform.agchain.models.list.duration_ms` | `agchain_models.py:list_models` | Measure list latency |
| Metric histogram | `platform.agchain.models.refresh_health.duration_ms` | `agchain_models.py:refresh_model_health` | Measure probe latency |
| Structured log | `agchain.models.created` | `agchain_models.py:create_model` | Audit model-target creation |
| Structured log | `agchain.models.updated` | `agchain_models.py:update_model` | Audit model-target edits |
| Structured log | `agchain.models.health_refreshed` | `agchain_models.py:refresh_model_health` | Audit probe outcome and state transition |
| Structured log | `agchain.models.provider_probe_failed` | `model_registry.py:refresh_health` | Audit provider/probe failures without logging secrets |

Observability attribute rules:

- Allowed trace and metric attributes:
  - `provider_slug`
  - `provider_qualifier_present`
  - `auth_kind`
  - `supports_evaluated`
  - `supports_judge`
  - `enabled`
  - `health_status`
  - `credential_status`
  - `probe_strategy`
  - `result`
  - `http.status_code`
  - `filter.provider_slug_present`
  - `filter.compatibility`
  - `filter.health_status`
  - `row_count`
  - `latency_ms`
- Forbidden in trace or metric attributes:
  - raw API keys
  - encrypted credentials
  - raw `credential_source_jsonb`
  - raw `model_args_jsonb`
  - full `api_base`
  - user email
  - user id
  - full error payloads from providers
  - benchmark ids, because this page is global and not benchmark-scoped
- Structured logs may include:
  - `model_target_id`
  - operator `subject_id`
  - `provider_slug`
  - old vs new `health_status`
  - `probe_strategy`
  - normalized validation errors
- Structured logs must not include:
  - secrets
  - full base URLs with tokens
  - request headers
  - provider response bodies

### Database Migrations

| Migration | Creates/Alters | Affects Existing Data? |
|-----------|----------------|------------------------|
| `20260326170000_agchain_model_targets.sql` | Creates `public.agchain_model_targets` and `public.agchain_model_health_checks`, adds indexes, enables RLS, grants authenticated read and service-role writes | No |

#### Locked migration contract

`20260326170000_agchain_model_targets.sql`

- Creates `public.agchain_model_targets` with:
  - `model_target_id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `label TEXT NOT NULL`
  - `provider_slug TEXT NOT NULL`
  - `provider_qualifier TEXT NULL`
  - `model_name TEXT NOT NULL`
  - `qualified_model TEXT NOT NULL`
  - `api_base TEXT NULL`
  - `auth_kind TEXT NOT NULL`
  - `credential_source_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb`
  - `model_args_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb`
  - `supports_evaluated BOOLEAN NOT NULL DEFAULT true`
  - `supports_judge BOOLEAN NOT NULL DEFAULT false`
  - `capabilities_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb`
  - `enabled BOOLEAN NOT NULL DEFAULT true`
  - `probe_strategy TEXT NOT NULL DEFAULT 'provider_default'`
  - `health_status TEXT NOT NULL DEFAULT 'unknown'`
  - `health_checked_at TIMESTAMPTZ NULL`
  - `last_latency_ms INTEGER NULL`
  - `last_error_code TEXT NULL`
  - `last_error_message TEXT NULL`
  - `notes TEXT NULL`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- Adds constraints:
  - identity uniqueness across `provider_slug`, optional qualifier, `qualified_model`, and optional `api_base` using `UNIQUE NULLS NOT DISTINCT`
  - `auth_kind` check
  - `probe_strategy` check
  - `health_status` check
- Field behavior notes:
  - `qualified_model` is stored as an operator-provided identity string; it is not derived in the database
  - `updated_at` is maintained by application writes in the create and patch handlers rather than by a trigger in this phase
- Creates `public.agchain_model_health_checks` with:
  - `health_check_id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `model_target_id UUID NOT NULL REFERENCES public.agchain_model_targets(model_target_id) ON DELETE CASCADE`
  - `provider_slug TEXT NOT NULL`
  - `probe_strategy TEXT NOT NULL`
  - `status TEXT NOT NULL`
  - `latency_ms INTEGER NULL`
  - `error_code TEXT NULL`
  - `error_message TEXT NULL`
  - `checked_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `checked_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL`
  - `metadata_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb`
  - `status` and `probe_strategy` checks aligned with the target table
- Enables RLS on both tables
- Grants:
  - authenticated column-level `SELECT` only
  - `credential_source_jsonb` is intentionally excluded from authenticated reads
  - service_role `SELECT, INSERT, UPDATE, DELETE`
- Adds indexes:
  - `agchain_model_targets_provider_slug_idx`
  - `agchain_model_targets_health_status_idx`
  - `agchain_model_targets_enabled_idx`
  - `agchain_model_health_checks_target_checked_at_idx`

### Edge Functions

No edge functions created or modified.

Existing Supabase functions and tables such as `provider-connections`, `user-api-keys`, and the current admin settings surfaces are read only as compatibility references. This implementation stays in `platform-api`. If reuse of an existing edge function becomes preferable, stop and confirm with the user first.

### Frontend Surface Area

**New pages:** `0`

**New components:** `3`

| Component | File | Used by |
|-----------|------|---------|
| `AgchainModelsToolbar` | `web/src/components/agchain/models/AgchainModelsToolbar.tsx` | `AgchainModelsPage.tsx` |
| `AgchainModelsTable` | `web/src/components/agchain/models/AgchainModelsTable.tsx` | `AgchainModelsPage.tsx` |
| `AgchainModelInspector` | `web/src/components/agchain/models/AgchainModelInspector.tsx` | `AgchainModelsPage.tsx` |

**New hooks:** `1`

| Hook | File | Used by |
|------|------|---------|
| `useAgchainModels` | `web/src/hooks/agchain/useAgchainModels.ts` | `AgchainModelsPage.tsx` |

**New libraries/services:** `1`

| Library | File | Used by |
|---------|------|---------|
| `agchainModels` | `web/src/lib/agchainModels.ts` | `useAgchainModels.ts` |

**Modified pages:** `1`

| Page | File | What changes |
|------|------|--------------|
| `AgchainModelsPage` | `web/src/pages/agchain/AgchainModelsPage.tsx` | Replace placeholder copy with a real toolbar + table + inspector surface backed by `platform-api`, including supported-provider-driven create/edit flows |

**New tests:** `2`

| Test module | File | Covers |
|-------------|------|--------|
| Platform API route tests | `services/platform-api/tests/test_agchain_models.py` | Provider catalog, list, detail, create, update, refresh-health contracts |
| Page test | `web/src/pages/agchain/AgchainModelsPage.test.tsx` | Real render path, provider-backed create/edit affordances, table display, inspector open |

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. Level-1 `Models` is a global AG chain model registry, not a benchmark-local model picker.
2. Benchmark-local evaluated-model and judge-model selection is out of scope for this plan and remains part of the benchmark workbench's future `Models` subsection.
3. The AG chain web app must talk to `services/platform-api`; it must not read or write the new AG chain model tables directly from the browser.
4. Supabase remains the persisted system of record for this phase; the plan does not introduce a separate AG chain-only database.
5. This phase does not create a secrets-management UI inside AG chain `Models`; it only references existing credential sources and reports credential readiness.
6. The first shipped `Models` surface must be table-first. No dashboard-first layout and no fake second-rail content is added here.
7. Health checks are lightweight readiness/probe checks, not full benchmark execution. They verify target reachability and credential readiness only.
8. Supported provider families are first-class runtime-owned metadata exposed by `platform-api`; creation/edit flows must validate against this provider catalog rather than accept arbitrary provider strings.
9. Sandbox configuration is not part of the level-1 `Models` page scope in this plan.
10. Runtime-policy-bundle comparison is a first-class AG chain comparison mode, but this page does not author or compare runtime profiles. It only provides the global model-target registry those later comparisons depend on.
11. This phase does not expose a delete action for model targets. Operators disable targets through `enabled` instead.

### Final Scope Lock

This implementation plan is final only for the following owned surface:

- global AG chain provider catalog
- global AG chain model-target registry
- model-target health/readiness inspection and probe refresh
- table, inspector, and create/edit flows for `/app/agchain/models`

The following are explicitly excluded from this plan even if the resulting UI later links to them:

- benchmark-local evaluated-model selection
- benchmark-local judge-model selection
- runtime-profile or environment-profile authoring
- context-delivery, statefulness, persistence, memory, or compaction policy
- tool exposure, sandbox, approval, or retrieval policy design
- run launch, scheduling, campaign orchestration, or queue management
- results comparison, leaderboards, or profile-aware ranking logic

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. An authenticated user can open `/app/agchain/models` and see a table fetched from `platform-api`.
2. The page can load the supported provider catalog from `GET /agchain/models/providers`.
3. The table shows at least `label`, `provider`, `qualified model`, `auth readiness`, `compatibility`, `health`, and `last checked`.
4. Selecting a row opens a detail inspector populated from `GET /agchain/models/{model_target_id}`.
5. A superuser can create a new model target from the supported provider catalog and see it appear in the table without a page reload.
6. A superuser can edit a model target and the updated values appear in both the table and the inspector.
7. A superuser can trigger `refresh-health`, which writes a history row and updates the target's current health fields using the locked provider-registry seam.
8. Each new backend route emits the locked trace span and structured log for its action.
9. No browser code performs direct Supabase CRUD against the new AG chain model tables.

### Locked Platform API Surface

#### New AG chain platform API endpoints: `6`

1. `GET /agchain/models/providers`
2. `GET /agchain/models`
3. `GET /agchain/models/{model_target_id}`
4. `POST /agchain/models`
5. `PATCH /agchain/models/{model_target_id}`
6. `POST /agchain/models/{model_target_id}/refresh-health`

#### Existing platform API endpoints reused as-is: `0`

#### Existing platform API support reused indirectly: `4`

1. Supabase JWT auth via `require_user_auth`
2. Superuser gating via `require_superuser`
3. Existing OTel bootstrap and safe-attribute utilities
4. Existing `httpx` instrumentation through OTel bootstrap

### Locked Observability Surface

#### New traces: `7`

1. `agchain.models.providers.list`
2. `agchain.models.list`
3. `agchain.models.get`
4. `agchain.models.create`
5. `agchain.models.update`
6. `agchain.models.refresh_health`
7. `agchain.models.provider_probe`

#### New metrics: `5 counters`, `2 histograms`

1. `platform.agchain.models.providers.list.count`
2. `platform.agchain.models.list.count`
3. `platform.agchain.models.create.count`
4. `platform.agchain.models.update.count`
5. `platform.agchain.models.refresh_health.count`
6. `platform.agchain.models.list.duration_ms`
7. `platform.agchain.models.refresh_health.duration_ms`

#### New structured logs: `4`

1. `agchain.models.created`
2. `agchain.models.updated`
3. `agchain.models.health_refreshed`
4. `agchain.models.provider_probe_failed`

### Locked Inventory Counts

#### Database

- New migrations: `1`
- Modified existing migrations: `0`

#### Backend

- New platform-api route modules: `1`
- New backend domain modules: `3`
- Modified backend entrypoint files: `1`

#### Frontend

- New top-level pages/routes: `0`
- Modified existing pages: `1`
- New visual components: `3`
- New hooks: `1`
- New libs/services: `1`

#### Tests

- New backend test modules: `1`
- New frontend test modules: `1`
- Modified existing test modules: `0`

### Locked File Inventory

#### New files

- `E:\writing-system\supabase\migrations\20260326170000_agchain_model_targets.sql`
- `E:\writing-system\services\platform-api\app\api\routes\agchain_models.py`
- `E:\writing-system\services\platform-api\app\domain\agchain\__init__.py`
- `E:\writing-system\services\platform-api\app\domain\agchain\model_provider_catalog.py`
- `E:\writing-system\services\platform-api\app\domain\agchain\model_registry.py`
- `E:\writing-system\services\platform-api\tests\test_agchain_models.py`
- `E:\writing-system\web\src\components\agchain\models\AgchainModelsToolbar.tsx`
- `E:\writing-system\web\src\components\agchain\models\AgchainModelsTable.tsx`
- `E:\writing-system\web\src\components\agchain\models\AgchainModelInspector.tsx`
- `E:\writing-system\web\src\hooks\agchain\useAgchainModels.ts`
- `E:\writing-system\web\src\lib\agchainModels.ts`
- `E:\writing-system\web\src\pages\agchain\AgchainModelsPage.test.tsx`

#### Modified files

- `E:\writing-system\services\platform-api\app\main.py`
- `E:\writing-system\web\src\pages\agchain\AgchainModelsPage.tsx`

## Frozen Global Models Contract

The level-1 `Models` page is the AG chain platform's global model-target registry. It is not the place where a benchmark chooses which models to run. That benchmark-local choice belongs to the benchmark workbench and must not be smuggled into this page through quick filters, ad hoc join tables, or benchmark-specific columns.

Do not implement benchmark assignment, benchmark eligibility matrices, or benchmark-specific judge/evaluated subsets in this plan. Those belong to a later benchmark workbench plan.

Do not implement runtime-profile authoring, runtime-policy-bundle comparison, or profile-aware leaderboards in this plan. Those are first-class AG chain capabilities, but they belong to later benchmark, runner, and results plans rather than to the global model registry.

Do not implement direct browser Supabase reads for these tables. The AG chain app must fetch through `platform-api` so auth, telemetry, and probe behavior stay inside owned runtime code.

Do not treat `provider_slug` as a free-text UI label. It is a backend-validated identity that resolves into provider display metadata, default probe behavior, and supported auth/config capabilities.

## Explicit Risks Accepted In This Plan

1. Credential readiness is derived from existing connection/key surfaces rather than from a dedicated AG chain secrets UI. That keeps this phase focused but means some provider-specific readiness logic may still be approximate until a later credential-integration plan hardens it.
2. Health checks remain lightweight probe-style checks, not full token-usage or completion-call validations. A model target may be marked reachable yet still fail under full benchmark execution.
3. The provider catalog is code-owned in `platform-api` during this phase rather than persisted in a dedicated table. This avoids premature admin/catalog complexity but means provider additions require backend code changes until a later catalog-management plan exists.
4. Sandbox-related capability metadata may be partial in this phase because the level-1 page does not yet own runner/tool execution configuration.

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked API surface in this plan exists exactly as specified.
2. The locked traces, metrics, and structured logs exist exactly as specified.
3. The new Supabase migration exists and produces the locked tables and policies.
4. The inventory counts in this plan match the actual set of created and modified files.
5. `/app/agchain/models` no longer renders placeholder bullets and instead renders a live table backed by `platform-api`.
6. No part of the new AG chain `Models` page performs direct browser CRUD against Supabase.
7. If local Docker / Supabase runtime is unavailable, migration-shape verification remains open and the plan cannot be treated as fully closed.

## Remaining Work Gate

Because the frontend and backend surfaces are implemented and locally tested, the only blocking verification gap before treating this plan as fully closed is local migration application and reset verification through the Supabase runtime.

Remaining required commands:

- `npx supabase db reset`
- `pytest services/platform-api/tests/test_agchain_models.py -q`
- `npm test -- src/pages/agchain/AgchainModelsPage.test.tsx`

The second and third commands already pass in the current working tree. The first is blocked locally by missing Docker / Supabase runtime availability.

## Historical Task Sequence Note

The task sequence below is preserved as the original implementation order. In the current working tree, Tasks 2-5 are implemented, while Task 1 local reset verification and Task 6 full locked verification remain open only because the local Supabase runtime is unavailable.

## Task 1: Rewrite the AG chain model registry migration around provider identity

**File(s):** `E:\writing-system\supabase\migrations\20260326170000_agchain_model_targets.sql`

**Step 1:** Rewrite the migration so `agchain_model_targets` and `agchain_model_health_checks` match the locked provider-slug, qualifier, model-args, and probe-strategy contract in this plan.
**Step 2:** Verify the migration does not alter existing data or existing tables.
**Step 3:** Check naming and policy style against the existing Supabase migration patterns used in `022_provider_connections.sql` and `014_user_api_keys.sql`.

**Test command:** `npx supabase db reset`
**Expected output:** Local reset completes successfully and the new AG chain tables exist with the expected grants, policies, and columns.

**Commit:** `feat: align agchain model registry tables with provider catalog`

## Task 2: Write failing backend route tests for the AG chain Models API

**File(s):** `E:\writing-system\services\platform-api\tests\test_agchain_models.py`

**Step 1:** Add tests for `GET /agchain/models/providers` returning the supported provider catalog.
**Step 2:** Add tests for `GET /agchain/models` list success with mocked Supabase reads plus resolved provider metadata.
**Step 3:** Add tests for `GET /agchain/models/{model_target_id}` detail success and 404 handling.
**Step 4:** Add tests for `POST /agchain/models` and `PATCH /agchain/models/{model_target_id}` superuser-only behavior, including provider validation failures.
**Step 5:** Add tests for `POST /agchain/models/{model_target_id}/refresh-health` writing a history row and updating current status.
**Step 6:** Run the test module and verify it fails because the route module is not mounted yet.

**Test command:** `pytest services/platform-api/tests/test_agchain_models.py -q`
**Expected output:** The new test module fails with missing route or import errors before implementation.

**Commit:** `test: add failing agchain models api tests`

## Task 3: Implement the AG chain provider catalog and model-registry backend

**File(s):** `E:\writing-system\services\platform-api\app\api\routes\agchain_models.py`, `E:\writing-system\services\platform-api\app\domain\agchain\__init__.py`, `E:\writing-system\services\platform-api\app\domain\agchain\model_provider_catalog.py`, `E:\writing-system\services\platform-api\app\domain\agchain\model_registry.py`, `E:\writing-system\services\platform-api\app\main.py`

**Step 1:** Create the provider-catalog helper that exposes the supported provider definitions required by the API and health probes.
**Step 2:** Create the model-registry domain helper that builds list/detail queries, normalizes rows, resolves credential readiness, and runs provider-aware health probes.
**Step 3:** Create the FastAPI route module with the six locked endpoints and the locked auth rules.
**Step 4:** Add OpenTelemetry spans, metrics, safe attributes, and structured logs exactly as locked in this plan.
**Step 5:** Mount the new router in `app/main.py` before the plugin catch-all.
**Step 6:** Run the backend test module and make it pass.

**Test command:** `pytest services/platform-api/tests/test_agchain_models.py -q`
**Expected output:** All tests in `test_agchain_models.py` pass.

**Commit:** `feat: add agchain models api`

## Task 4: Write the failing frontend page test for the live Models surface

**File(s):** `E:\writing-system\web\src\pages\agchain\AgchainModelsPage.test.tsx`

**Step 1:** Add a page test that renders `AgchainModelsPage` and expects a table-first models surface rather than placeholder bullets.
**Step 2:** Mock the page service layer to return supported providers plus model-target rows.
**Step 3:** Assert the page shows table columns, row data, and inspector open behavior.
**Step 4:** Assert the page can surface provider-backed create/edit affordances without accepting arbitrary provider strings.
**Step 5:** Run the test and verify it fails against the current placeholder page.

**Test command:** `npm test -- src/pages/agchain/AgchainModelsPage.test.tsx`
**Expected output:** The page test fails because the current page still renders placeholder content.

**Commit:** `test: add failing agchain models page test`

## Task 5: Build the frontend service, hook, and components for the AG chain Models page

**File(s):** `E:\writing-system\web\src\lib\agchainModels.ts`, `E:\writing-system\web\src\hooks\agchain\useAgchainModels.ts`, `E:\writing-system\web\src\components\agchain\models\AgchainModelsToolbar.tsx`, `E:\writing-system\web\src\components\agchain\models\AgchainModelsTable.tsx`, `E:\writing-system\web\src\components\agchain\models\AgchainModelInspector.tsx`, `E:\writing-system\web\src\pages\agchain\AgchainModelsPage.tsx`

**Step 1:** Create the service-layer fetch helpers that call the new `platform-api` routes, including the provider catalog endpoint.
**Step 2:** Create the data hook for list/detail loading, provider-catalog loading, selection state, and refresh-health action state.
**Step 3:** Build the toolbar, table, and inspector components around the locked fields and actions.
**Step 4:** Replace the placeholder `AgchainModelsPage` with the live composed surface.
**Step 5:** Run the page test and fix until it passes.

**Test command:** `npm test -- src/pages/agchain/AgchainModelsPage.test.tsx`
**Expected output:** The page test passes and confirms the page renders a live table/inspector surface.

**Commit:** `feat: build agchain models page`

## Task 6: Run locked verification for backend, frontend, and migration shape

**File(s):** `E:\writing-system\supabase\migrations\20260326170000_agchain_model_targets.sql`, `E:\writing-system\services\platform-api\app\api\routes\agchain_models.py`, `E:\writing-system\services\platform-api\tests\test_agchain_models.py`, `E:\writing-system\web\src\pages\agchain\AgchainModelsPage.tsx`, `E:\writing-system\web\src\pages\agchain\AgchainModelsPage.test.tsx`

**Step 1:** Run the Supabase reset to verify the migration applies cleanly.
**Step 2:** Run the locked backend test module.
**Step 3:** Run the locked frontend test module.
**Step 4:** If possible in the local dev stack, exercise `/app/agchain/models` and confirm the table fetches through `platform-api`.

**Test command:** `npx supabase db reset && pytest services/platform-api/tests/test_agchain_models.py -q && npm test -- src/pages/agchain/AgchainModelsPage.test.tsx`
**Expected output:** All commands succeed; the new tables exist; backend tests pass; frontend page test passes.

**Commit:** `chore: verify agchain models surface`
