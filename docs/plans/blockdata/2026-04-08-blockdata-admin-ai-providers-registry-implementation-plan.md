# Blockdata Admin AI Providers Registry Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current Blockdata Admin `/app/blockdata-admin/ai-providers` user-key settings mount with a true Blockdata-admin registry workspace that uses the same provider-first layout grammar as AGChain Admin Models while owning a separate Blockdata backend contract.

**Architecture:** Keep the frontend route and shell location the same, but remount it to a dedicated `BlockdataAdminAiProvidersPage` instead of `SettingsAiOverview` and `SettingsProviderForm`. Add a Blockdata-only platform-api route family under `/admin/ai-providers`, gated by `require_blockdata_admin`, backed by new `blockdata_ai_provider_registry` and `blockdata_ai_provider_models` tables. The admin page owns provider definitions and curated provider model metadata only; it must not read or mutate `user_api_keys`, call `user-api-keys`, call `test-api-key`, or inherit AGChain registry tables and endpoints.

**Tech Stack:** Supabase Postgres migrations, FastAPI, Supabase Python client, React + TypeScript, OpenTelemetry, pytest, Vitest.

---

## Manifest

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/admin/ai-providers` | List Blockdata admin provider registry rows | New |
| POST | `/admin/ai-providers` | Create a Blockdata admin provider definition | New |
| PATCH | `/admin/ai-providers/{provider_slug}` | Update a Blockdata admin provider definition | New |
| GET | `/admin/ai-providers/models` | List Blockdata admin provider-model rows with optional provider filter | New |
| POST | `/admin/ai-providers/models` | Create a Blockdata admin provider-model row | New |
| PATCH | `/admin/ai-providers/models/{provider_model_id}` | Update a Blockdata admin provider-model row | New |

Namespace audit completed during plan revision: no existing platform-api router currently owns `/admin/ai-providers` or any descendant path, so Blockdata keeps this route family instead of moving under `/admin/blockdata/...`.

#### New endpoint contracts

`GET /admin/ai-providers`

- Auth: `require_blockdata_admin`
- Request: no body
- Response: `{ "items": ProviderDefinition[] }`
- Touches: `public.blockdata_ai_provider_registry`

`POST /admin/ai-providers`

- Auth: `require_blockdata_admin`
- Request body:
  - `provider_slug: string`
  - `display_name: string`
  - `provider_category: "model_provider" | "cloud_provider"`
  - `credential_form_kind: "basic_api_key" | "vertex_ai"`
  - `env_var_name: string | null`
  - `docs_url: string | null`
  - `supported_auth_kinds: string[]`
  - `default_probe_strategy: string`
  - `default_capabilities: object`
  - `supports_custom_base_url: boolean`
  - `supports_model_args: boolean`
  - `enabled: boolean`
  - `sort_order: number`
  - `notes: string | null`
- Response: `{ "ok": true, "provider_slug": string }`
- Touches: `public.blockdata_ai_provider_registry`

`PATCH /admin/ai-providers/{provider_slug}`

- Auth: `require_blockdata_admin`
- Request body: partial provider-definition payload using the same field names as `POST`
- Response: `{ "ok": true, "provider_slug": string }`
- Touches: `public.blockdata_ai_provider_registry`

`GET /admin/ai-providers/models`

- Auth: `require_blockdata_admin`
- Query:
  - `provider_slug?: string`
  - `enabled?: boolean`
  - `search?: string`
  - `limit?: integer` default `50`
  - `offset?: integer` default `0`
- Response: `{ "items": ProviderModelRow[], "total": number, "limit": number, "offset": number }`
- Touches: `public.blockdata_ai_provider_models`, `public.blockdata_ai_provider_registry`

`POST /admin/ai-providers/models`

- Auth: `require_blockdata_admin`
- Request body:
  - `label: string`
  - `provider_slug: string`
  - `model_id: string`
  - `qualified_model: string`
  - `api_base: string | null`
  - `auth_kind: string`
  - `config_jsonb: object`
  - `capabilities_jsonb: object`
  - `enabled: boolean`
  - `sort_order: number`
  - `notes: string | null`
- Response: `{ "ok": true, "provider_model_id": string }`
- Touches: `public.blockdata_ai_provider_models`

`PATCH /admin/ai-providers/models/{provider_model_id}`

- Auth: `require_blockdata_admin`
- Request body: partial provider-model payload using the same field names as `POST`
- Response: `{ "ok": true, "provider_model_id": string }`
- Touches: `public.blockdata_ai_provider_models`

### Observability

Add the following spans, counters, histograms, and structured logs to the new Blockdata admin route family.

- Spans:
  - `admin.ai_providers.list`
  - `admin.ai_providers.create`
  - `admin.ai_providers.update`
  - `admin.ai_provider_models.list`
  - `admin.ai_provider_models.create`
  - `admin.ai_provider_models.update`
- Counters:
  - `platform.admin.ai_providers.list.count`
  - `platform.admin.ai_providers.create.count`
  - `platform.admin.ai_providers.update.count`
  - `platform.admin.ai_provider_models.list.count`
  - `platform.admin.ai_provider_models.create.count`
  - `platform.admin.ai_provider_models.update.count`
- Histograms:
  - `platform.admin.ai_providers.list.duration_ms`
  - `platform.admin.ai_provider_models.list.duration_ms`
- Structured logs:
  - `admin.ai_providers.created`
  - `admin.ai_providers.updated`
  - `admin.ai_provider_models.created`
  - `admin.ai_provider_models.updated`
- Required attributes:
  - `result`
  - `http.status_code`
  - `actor_role="blockdata_admin"`
  - `provider_slug` on all provider mutations and all model operations
  - `provider_model_id` on model mutations
  - `filter.provider_slug_present` on model-list requests
- Forbidden attributes:
  - `api_key`
  - `api_key_encrypted`
  - `key_suffix`
  - `access_token`
  - `auth_token`
  - `credential_json`
  - `credential_payload`
  - `default_model`
  - `default_temperature`
  - `default_max_tokens`
  - `base_url`
  - any field read from `public.user_api_keys`

### Database Migrations

- Create `public.blockdata_ai_provider_registry`
- Create `public.blockdata_ai_provider_models`
- Seed `blockdata_ai_provider_registry` from the current Blockdata hard-coded provider set using `ON CONFLICT (provider_slug) DO UPDATE` so the migration remains idempotent:
  - `openai`
  - `anthropic`
  - `google`
  - `voyage`
  - `cohere`
  - `jina`
  - `custom`
- Before provider-model backfill, auto-register any additional provider slugs already present in `public.model_role_assignments.provider` as disabled inferred `model_provider` rows with inferred display names and a backfill note, using `ON CONFLICT (provider_slug) DO NOTHING`
- Backfill `blockdata_ai_provider_models` from distinct `(provider, model_id)` pairs already present in `public.model_role_assignments`, using `ON CONFLICT (provider_slug, model_id) DO NOTHING`
- Do not backfill from `public.user_api_keys`
- Do not alter `public.agchain_provider_registry`, `public.agchain_model_targets`, or `public.model_role_assignments` in this plan

### Edge Functions

No edge-function changes in this plan.

- Do not reuse `supabase/functions/user-api-keys`
- Do not reuse `supabase/functions/test-api-key`
- Do not add new edge functions for the admin page

### Frontend Surface Area

- Create a dedicated admin page at `web/src/pages/admin/BlockdataAdminAiProvidersPage.tsx`
- Create a Blockdata-specific admin API client at `web/src/lib/blockdataAdminAiProviders.ts`
- Create a Blockdata-specific admin registry hook at `web/src/hooks/blockdata/useBlockdataAdminAiProviderRegistry.ts`
- Modify `web/src/router.tsx` so both `/app/blockdata-admin/ai-providers` and `/app/blockdata-admin/ai-providers/:providerId` mount the new admin page
- Preserve AGChain Admin Models as a separate page with no behavior changes in this plan
- Leave `SettingsAiOverview` and `SettingsProviderForm` in the repo for one phase, but stop using them as the Blockdata admin route target

## Pre-Implementation Contract

This plan is not a request to polish the current settings page. It is a remount and backend replacement. The existing Blockdata admin route is currently a scope error because it reads `user_api_keys` directly and calls edge functions intended for user-scoped key storage. The replacement must behave like an admin registry workspace, not like a settings credential editor.

## Locked Product Decisions

1. Blockdata Admin AI Providers adopts the AGChain Admin Models page layout grammar: provider-first left rail, selected-provider workspace on the right, calm admin framing, and dialog-based create/edit flows.
2. Blockdata Admin AI Providers is an admin-only registry surface, not a secret-entry surface.
3. API-key entry, key testing, key suffix display, default temperature sliders, max-token inputs, and remove-key actions are forbidden on the Blockdata admin page.
4. The Blockdata admin backend stands on its own under `/admin/ai-providers` and new `blockdata_ai_*` tables.
5. AGChain registry tables and AGChain admin routes are not reused as Blockdata storage or API contracts.
6. The selected provider owns the lower model catalog region on the page. The page must read as "selected provider and the models registered under it."
7. `model_role_assignments` remains the live role-mapping seam in this plan. The new provider-model catalog seeds from it but does not replace it yet.
8. `/app/blockdata-admin/ai-providers/:providerId` remains a valid deep link, but it selects a provider inside the new page instead of mounting a completely different form screen.
9. Unknown provider slugs discovered during migration backfill are auto-registered as disabled provider rows instead of aborting the migration.

## Locked Acceptance Contract

1. Navigating to `/app/blockdata-admin/ai-providers` shows an admin workspace, not the current card grid from `SettingsAiOverview`.
2. The page header remains `AI Providers`, but the description explains registry management, not personal key configuration.
3. The left panel contains provider search, refresh, add-provider action, and a provider registry table or list with a visibly selected row.
4. The right column contains a provider summary region and a provider-scoped model table for the selected provider.
5. Clicking a provider row updates the right-side provider summary and filters the model table to that provider.
6. `Add Provider` opens a provider-definition dialog. `Add Model` opens a model dialog already scoped to the selected provider.
7. No secret-entry controls appear anywhere on the page.
8. Browser network traffic from this page goes only to the new `/admin/ai-providers*` platform-api routes.
9. `/app/blockdata-admin/ai-providers/openai` opens the same page with `openai` preselected.
10. An unknown `/app/blockdata-admin/ai-providers/:providerId` deep link falls through to a no-selection state, shows a non-blocking inline notice, and never errors the page.
11. `AgchainAdminModelsPage` continues to render and test exactly as it does today.

## Locked Platform API Surface

### Provider-definition response shape

Every provider row returned by `GET /admin/ai-providers` must include:

- `provider_slug`
- `display_name`
- `provider_category`
- `credential_form_kind`
- `env_var_name`
- `docs_url`
- `supported_auth_kinds`
- `default_probe_strategy`
- `default_capabilities`
- `supports_custom_base_url`
- `supports_model_args`
- `enabled`
- `sort_order`
- `notes`
- `created_at`
- `updated_at`

### Provider-model response shape

Every model row returned by `GET /admin/ai-providers/models` must include:

- `provider_model_id`
- `label`
- `provider_slug`
- `provider_display_name`
- `model_id`
- `qualified_model`
- `api_base_display`
- `auth_kind`
- `config_jsonb`
- `capabilities_jsonb`
- `enabled`
- `sort_order`
- `notes`
- `created_at`
- `updated_at`

### Validation rules

- `provider_slug` must be trimmed and non-empty.
- `display_name` and `label` must be trimmed and non-empty.
- `supported_auth_kinds` must be a non-empty deduplicated string array.
- `provider_slug` on provider-model writes must reference an existing `blockdata_ai_provider_registry` row.
- `(provider_slug, model_id)` must be unique in `blockdata_ai_provider_models`.
- `qualified_model` must be trimmed and non-empty.
- `config_jsonb` and `capabilities_jsonb` must always normalize to JSON objects.

## Locked Observability Surface

1. Every new admin route must emit one span and one counter increment per request.
2. Both list endpoints must record list duration histograms.
3. Success and failure cases must both emit telemetry with `result` and `http.status_code`.
4. Mutations must write structured logs with `actor_role="blockdata_admin"`.
5. Model-list telemetry must explicitly note whether a provider filter was present.
6. No span attribute, metric attribute, log field, or structured event may include key fragments, raw credentials, auth tokens, or any field read from `public.user_api_keys`.

### Forbidden telemetry fields

- `api_key`
- `api_key_encrypted`
- `key_suffix`
- `access_token`
- `auth_token`
- `credential_json`
- `credential_payload`
- `default_model`
- `default_temperature`
- `default_max_tokens`
- `base_url`
- any other field sourced from `public.user_api_keys`

## Locked Inventory Counts

### Database

- 1 new migration file
- 2 new tables
- 1 provider seed block
- 1 backfill block from existing `model_role_assignments`

### Backend

- 4 new backend files
- 1 modified backend file
- 6 new admin endpoints

### Frontend

- 4 new frontend files
- 1 modified frontend file
- 1 new admin page
- 2 existing routes remounted to the new page

### Tests

- 2 new test files
- 1 existing AGChain admin page test file intentionally left unchanged

## Locked File Inventory

### New files

- `supabase/migrations/20260408152000_blockdata_ai_provider_registry.sql`
- `services/platform-api/app/api/routes/admin_ai_providers.py`
- `services/platform-api/app/domain/blockdata/__init__.py`
- `services/platform-api/app/domain/blockdata/ai_provider_registry.py`
- `services/platform-api/tests/test_admin_ai_providers.py`
- `web/src/lib/blockdataAdminAiProviders.ts`
- `web/src/hooks/blockdata/useBlockdataAdminAiProviderRegistry.ts`
- `web/src/pages/admin/BlockdataAdminAiProvidersPage.tsx`
- `web/src/pages/admin/BlockdataAdminAiProvidersPage.test.tsx`

### Modified files

- `services/platform-api/app/main.py`
- `web/src/router.tsx`

## Frozen Seam Contract

### User credential boundary

- Blockdata Admin AI Providers must not call `supabase.from(TABLES.userApiKeys)`.
- Blockdata Admin AI Providers must not call `user-api-keys`.
- Blockdata Admin AI Providers must not call `test-api-key`.
- `SettingsAiOverview` and `SettingsProviderForm` are no longer the mounted admin seam after this implementation.

### AGChain separation boundary

- Blockdata admin routes use `require_blockdata_admin`, not `require_agchain_admin`.
- Blockdata admin routes persist to `blockdata_ai_provider_registry` and `blockdata_ai_provider_models`, not `agchain_provider_registry` or `agchain_model_targets`.
- AGChain frontend hooks and clients are not reused as the Blockdata data layer.

### Model-role compatibility boundary

- `model_role_assignments` continues storing `(role_key, provider, model_id)` in this plan.
- The new provider-model registry may seed from current role assignments, but role assignments do not gain a foreign key to `provider_model_id` in this plan.
- Any future model-role normalization must land in a separate follow-up plan.

## Explicit Risks Accepted In This Plan

1. Blockdata will temporarily have both legacy settings AI-provider files and the new admin registry files in the repo at the same time; only the route mount changes in this plan.
2. The new Blockdata provider-model catalog becomes the admin source of truth for this page before downstream consumers adopt it.
3. Auto-registered provider rows created from unknown `model_role_assignments.provider` values may need later manual cleanup or enrichment after rollout.
4. The provider-definition schema is intentionally close to AGChain's to preserve visual and operational familiarity, but the storage and auth contracts remain separate.

## Completion Criteria

1. `web/src/router.tsx` no longer mounts `SettingsAiOverview` or `SettingsProviderForm` for Blockdata admin AI-provider routes.
2. The new Blockdata admin page renders a provider-first workspace with provider and model dialogs.
3. The page never hits `user_api_keys` or edge-function secret endpoints.
4. `services/platform-api` exposes the six new `/admin/ai-providers*` endpoints behind `require_blockdata_admin`.
5. The migration creates and seeds the new Blockdata registry tables without altering AGChain registry tables.
6. Targeted pytest coverage exists for auth rejection, provider list, provider create/update, model list, and model create/update.
7. Targeted Vitest coverage exists for initial render, provider selection, valid and invalid deep-link selection, and provider/model creation dialogs.
8. Telemetry emitted by the new route family excludes key fragments, credential payloads, and any `user_api_keys`-sourced fields.
9. The existing `AgchainAdminModelsPage` test suite still passes unchanged.

## Tasks

### Task 1: Write the failing backend contract tests

**Files:**
- Create: `services/platform-api/tests/test_admin_ai_providers.py`

**Step 1: Write failing route-contract tests**

- Cover:
  - non-admin rejection for `GET /admin/ai-providers`
  - list provider success payload
  - create provider success payload
  - list provider-model success payload with provider filter
  - create provider-model success payload

**Step 2: Run the targeted backend test file**

Run:

```bash
cd services/platform-api && pytest -q tests/test_admin_ai_providers.py
```

Expected:

- FAIL because the route file is not registered yet and `/admin/ai-providers*` does not exist.

**Step 3: Commit the failing contract**

```bash
git add services/platform-api/tests/test_admin_ai_providers.py
git commit -m "test: lock blockdata admin ai providers route contract"
```

### Task 2: Add the Blockdata registry migration

**Files:**
- Create: `supabase/migrations/20260408152000_blockdata_ai_provider_registry.sql`

**Step 1: Create the migration**

- Create `blockdata_ai_provider_registry`
- Create `blockdata_ai_provider_models`
- Add FK from provider models to provider registry
- Seed provider rows from the current hard-coded Blockdata provider set with `ON CONFLICT (provider_slug) DO UPDATE`
- Auto-register unknown provider slugs discovered in `model_role_assignments.provider` as disabled inferred provider rows before model backfill
- Backfill distinct provider/model pairs from `model_role_assignments` with `ON CONFLICT (provider_slug, model_id) DO NOTHING`

**Step 2: Verify the migration applies cleanly**

Run:

```bash
supabase db reset
```

Expected:

- PASS with the new migration applied and no SQL errors.

**Step 3: Commit the migration**

```bash
git add supabase/migrations/20260408152000_blockdata_ai_provider_registry.sql
git commit -m "feat: add blockdata ai provider registry tables"
```

### Task 3: Implement the backend domain and admin route family

**Files:**
- Create: `services/platform-api/app/api/routes/admin_ai_providers.py`
- Create: `services/platform-api/app/domain/blockdata/__init__.py`
- Create: `services/platform-api/app/domain/blockdata/ai_provider_registry.py`
- Modify: `services/platform-api/app/main.py`

**Step 1: Implement the domain helpers**

- Add provider row normalization and validation
- Add provider-model row normalization and validation
- Add list/create/update helpers for both tables
- Enforce the frozen seams:
  - no `user_api_keys`
  - no edge-function calls
  - no AGChain tables

**Step 2: Implement the FastAPI route family**

- Add the six `/admin/ai-providers*` endpoints
- Gate them with `require_blockdata_admin`
- Emit the locked spans, counters, histograms, and structured logs

**Step 3: Register the router in `app.main`**

- Include the new router alongside the existing Blockdata admin routes

**Step 4: Re-run the targeted backend tests**

Run:

```bash
cd services/platform-api && pytest -q tests/test_admin_ai_providers.py
```

Expected:

- PASS

**Step 5: Commit the backend implementation**

```bash
git add services/platform-api/app/api/routes/admin_ai_providers.py services/platform-api/app/domain/blockdata/__init__.py services/platform-api/app/domain/blockdata/ai_provider_registry.py services/platform-api/app/main.py
git commit -m "feat: add blockdata admin ai provider registry api"
```

### Task 4: Write the failing frontend admin page tests

**Files:**
- Create: `web/src/pages/admin/BlockdataAdminAiProvidersPage.test.tsx`

**Step 1: Write failing UI-contract tests**

- Cover:
  - provider registry renders in admin frame
  - selected provider controls the right-side workspace
  - `Add Provider` dialog opens
  - `Add Model` dialog opens only with a selected provider
  - route param deep-link selects the expected provider
  - invalid route param deep-link shows a non-blocking notice and no-selection state
  - no secret-entry copy or controls appear

**Step 2: Run the targeted frontend test file**

Run:

```bash
cd web && npm run test -- src/pages/admin/BlockdataAdminAiProvidersPage.test.tsx
```

Expected:

- FAIL because the page, hook, and client do not exist yet.

**Step 3: Commit the failing UI contract**

```bash
git add web/src/pages/admin/BlockdataAdminAiProvidersPage.test.tsx
git commit -m "test: lock blockdata admin ai providers ui contract"
```

### Task 5: Implement the Blockdata admin client, hook, page, and route remount

**Files:**
- Create: `web/src/lib/blockdataAdminAiProviders.ts`
- Create: `web/src/hooks/blockdata/useBlockdataAdminAiProviderRegistry.ts`
- Create: `web/src/pages/admin/BlockdataAdminAiProvidersPage.tsx`
- Modify: `web/src/router.tsx`

**Step 1: Implement the Blockdata admin API client**

- Add provider list/create/update functions
- Add provider-model list/create/update functions
- Normalize payloads exactly to the new backend contract

**Step 2: Implement the Blockdata admin registry hook**

- Load provider rows and provider-model rows with shared local cache
- Support refresh
- Support route-param-selected provider on first render

**Step 3: Build the new admin page**

- Recreate the AGChain provider-first layout grammar:
  - left provider registry controls and table
  - right provider summary card
  - right provider-model table card
  - provider dialog
  - model dialog
- Replace AGChain-specific copy with Blockdata-specific copy
- Support the invalid `:providerId` case with a non-blocking inline notice and no-selection state
- Omit all secret-entry controls

**Step 4: Remount the router**

- Mount `BlockdataAdminAiProvidersPage` for:
  - `/app/blockdata-admin/ai-providers`
  - `/app/blockdata-admin/ai-providers/:providerId`

**Step 5: Run the targeted frontend tests**

Run:

```bash
cd web && npm run test -- src/pages/admin/BlockdataAdminAiProvidersPage.test.tsx
```

Expected:

- PASS

**Step 6: Commit the frontend implementation**

```bash
git add web/src/lib/blockdataAdminAiProviders.ts web/src/hooks/blockdata/useBlockdataAdminAiProviderRegistry.ts web/src/pages/admin/BlockdataAdminAiProvidersPage.tsx web/src/router.tsx
git commit -m "feat: add blockdata admin ai providers registry page"
```

### Task 6: Verification sweep

**Files:**
- No new files

**Step 1: Re-run targeted backend coverage**

Run:

```bash
cd services/platform-api && pytest -q tests/test_admin_ai_providers.py
```

Expected:

- PASS

**Step 2: Re-run targeted frontend coverage**

Run:

```bash
cd web && npm run test -- src/pages/admin/BlockdataAdminAiProvidersPage.test.tsx src/pages/admin/AgchainAdminModelsPage.test.tsx
```

Expected:

- PASS

**Step 3: Sanity-check the route mount and changed files**

Run:

```bash
git diff --stat
git status --short
```

Expected:

- Only the files named in this plan appear as intentional changes.

**Step 4: Commit the verification pass**

```bash
git add supabase/migrations/20260408152000_blockdata_ai_provider_registry.sql services/platform-api/app/api/routes/admin_ai_providers.py services/platform-api/app/domain/blockdata/__init__.py services/platform-api/app/domain/blockdata/ai_provider_registry.py services/platform-api/app/main.py services/platform-api/tests/test_admin_ai_providers.py web/src/lib/blockdataAdminAiProviders.ts web/src/hooks/blockdata/useBlockdataAdminAiProviderRegistry.ts web/src/pages/admin/BlockdataAdminAiProvidersPage.tsx web/src/pages/admin/BlockdataAdminAiProvidersPage.test.tsx web/src/router.tsx
git commit -m "chore: verify blockdata admin ai providers registry rollout"
```

## Execution Handoff

Plan complete and saved to `docs/plans/blockdata/2026-04-08-blockdata-admin-ai-providers-registry-implementation-plan.md`.

Two execution options:

1. Subagent-Driven (this session) - implement the tasks here, one task at a time, with review between steps.
2. Parallel Session (separate) - open a fresh execution session and run the plan with `executing-plans`.
