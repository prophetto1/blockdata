# AGChain Project And Admin Models Pages Implementation Plan

**Goal:** Split the current mixed `/app/agchain/models` surface into its two correct halves: a project-scoped provider credential page at `/app/agchain/models` and an admin-scoped provider and curated-model registry at `/app/agchain-admin/models`, while correcting credential ownership from user-scoped to project-scoped.

**Architecture:** Reuse the current mixed models workspace as the structural starting point for the admin page instead of rebuilding it from scratch. Simplify the current project page down to a provider list plus centered credential modal. Add one new project-scoped platform API seam for credentials under `/agchain/projects/{project_id}/model-providers`. Persist provider definitions in `agchain_provider_registry` and make that the only runtime provider-definition source of truth after cutover.

**Tech Stack:** React + TypeScript, existing AGChain shell and AGChain admin shell layouts, FastAPI, Supabase Postgres, OpenTelemetry, Vitest, pytest.

**Status:** Draft
**Author:** Codex (requested by user)
**Date:** 2026-04-05

## Manifest

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/agchain/projects/{project_id}/model-providers` | Read project-scoped provider rows and credential state for the focused project | New |
| PUT | `/agchain/projects/{project_id}/model-providers/{provider_slug}/credential` | Save or replace one project-scoped provider credential | New |
| POST | `/agchain/projects/{project_id}/model-providers/{provider_slug}/credential/test` | Validate a typed key without persisting it | New |
| DELETE | `/agchain/projects/{project_id}/model-providers/{provider_slug}/credential` | Remove one project-scoped provider credential | New |
| GET | `/agchain/models/providers` | Read persisted provider registry rows for the admin models page | Existing - contract changes |
| POST | `/agchain/models/providers` | Create one provider registry row | New |
| PATCH | `/agchain/models/providers/{provider_slug}` | Update one provider registry row | New |
| GET | `/agchain/models` | Read curated model target registry rows for admin use | Existing - contract changes |
| GET | `/agchain/models/{model_target_id}` | Read one curated model target detail for admin use | Existing - contract changes |
| POST | `/agchain/models` | Create one curated model target | Existing - no path change |
| PATCH | `/agchain/models/{model_target_id}` | Update one curated model target | Existing - no path change |
| POST | `/agchain/models/{model_target_id}/refresh-health` | Refresh curated model target health | Existing - no path change |
| POST | `/agchain/models/{model_target_id}/connect-key` | Remove legacy user-scoped credential path | Removed |
| DELETE | `/agchain/models/{model_target_id}/disconnect-key` | Remove legacy user-scoped credential path | Removed |

#### New endpoint contracts

`GET /agchain/projects/{project_id}/model-providers`

- Auth: `require_user_auth` plus `require_project_access(user_id, project_id)`
- Request: no body
- Response: `{ items: [{ provider_slug, display_name, docs_url, env_var_name, enabled, credential_status, validation_status, key_suffix_present, last_updated_at, supported_auth_kinds }], total }`
- Touches: `public.agchain_provider_registry`, `public.agchain_project_provider_credentials`
- Notes: returns everything needed to render the project page table and modal without a second provider-detail read

`PUT /agchain/projects/{project_id}/model-providers/{provider_slug}/credential`

- Auth: `require_user_auth` plus `require_project_write_access(user_id, project_id)`
- Request: `{ api_key: string }`
- Response: `{ ok: true, credential_status: "configured", validation_status: "unknown" | "passed" | "failed", key_suffix_present: true, updated_at }`
- Touches: `public.agchain_project_provider_credentials`
- Notes: writes by `(project_id, provider_slug)` only; must not touch `user_api_keys`

`POST /agchain/projects/{project_id}/model-providers/{provider_slug}/credential/test`

- Auth: `require_user_auth` plus `require_project_write_access(user_id, project_id)`
- Request: `{ api_key: string }`
- Response: `{ ok: true, result: "passed" | "failed", message: string, latency_ms: number | null }`
- Touches: provider lookup in `public.agchain_provider_registry`; no credential persistence
- Notes: exists only to support the project modal `Test key` action

`DELETE /agchain/projects/{project_id}/model-providers/{provider_slug}/credential`

- Auth: `require_user_auth` plus `require_project_write_access(user_id, project_id)`
- Request: no body
- Response: `{ ok: true, credential_status: "not_configured" }`
- Touches: `public.agchain_project_provider_credentials`
- Notes: deletion affects only the addressed project

`POST /agchain/models/providers`

- Auth: `require_agchain_admin`
- Request: `{ provider_slug: string, display_name: string, docs_url: string | null, env_var_name: string | null, enabled: boolean, supports_custom_base_url: boolean, supported_auth_kinds: string[], default_probe_strategy: string, default_capabilities_jsonb: object, supports_model_args: boolean, notes: string | null, sort_order: number }`
- Response: `{ ok: true, provider_slug, created_at }`
- Touches: `public.agchain_provider_registry`
- Notes: this is the admin capability that allows the registry to grow to new providers over time

`PATCH /agchain/models/providers/{provider_slug}`

- Auth: `require_agchain_admin`
- Request: partial payload of `{ display_name, docs_url, env_var_name, enabled, supports_custom_base_url, supported_auth_kinds, default_probe_strategy, default_capabilities_jsonb, supports_model_args, notes, sort_order }`
- Response: `{ ok: true, provider_slug, updated_at }`
- Touches: `public.agchain_provider_registry`
- Notes: updates provider metadata only; never accepts secrets

#### Modified endpoint contracts

`GET /agchain/models/providers`

- Change: switch from static `model_provider_catalog.py` output to persisted `agchain_provider_registry` output and require `require_agchain_admin`
- Why: the admin page is the provider registry surface and needs persisted create/update behavior

`GET /agchain/models`

- Change: remove user credential joins and return admin registry model target rows only
- Why: the admin page should reflect provider/model registry state, not any user or project credential state

`GET /agchain/models/{model_target_id}`

- Change: remove user credential joins and return model-target detail plus provider registry metadata only
- Why: the admin inspector must stay registry-scoped

### Observability

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Trace span | `agchain.project_model_providers.list` | `services/platform-api/app/api/routes/agchain_project_model_providers.py:list_project_model_providers` | Measure project provider-list latency and access outcomes |
| Trace span | `agchain.project_model_providers.credential.upsert` | `services/platform-api/app/api/routes/agchain_project_model_providers.py:upsert_project_model_provider_credential` | Measure project credential saves and replaces |
| Trace span | `agchain.project_model_providers.credential.test` | `services/platform-api/app/api/routes/agchain_project_model_providers.py:test_project_model_provider_credential` | Measure test-key latency and failures |
| Trace span | `agchain.project_model_providers.credential.delete` | `services/platform-api/app/api/routes/agchain_project_model_providers.py:delete_project_model_provider_credential` | Measure project credential removals |
| Trace span | `agchain.models.providers.list` | `services/platform-api/app/api/routes/agchain_models.py:list_supported_providers_route` | Measure admin provider-registry list reads |
| Trace span | `agchain.models.providers.create` | `services/platform-api/app/api/routes/agchain_models.py:create_provider_route` | Audit provider creation |
| Trace span | `agchain.models.providers.update` | `services/platform-api/app/api/routes/agchain_models.py:update_provider_route` | Audit provider updates |
| Metric | `platform.agchain.project_model_providers.list.count` | `agchain_project_model_providers.py:list_project_model_providers` | Count project provider-list requests |
| Metric | `platform.agchain.project_model_providers.credential.upsert.count` | `agchain_project_model_providers.py:upsert_project_model_provider_credential` | Count project credential saves |
| Metric | `platform.agchain.project_model_providers.credential.test.count` | `agchain_project_model_providers.py:test_project_model_provider_credential` | Count test-key attempts |
| Metric | `platform.agchain.project_model_providers.credential.delete.count` | `agchain_project_model_providers.py:delete_project_model_provider_credential` | Count project credential deletions |
| Metric | `platform.agchain.models.providers.create.count` | `agchain_models.py:create_provider_route` | Count provider creations |
| Metric | `platform.agchain.models.providers.update.count` | `agchain_models.py:update_provider_route` | Count provider updates |
| Histogram | `platform.agchain.project_model_providers.list.duration_ms` | `agchain_project_model_providers.py:list_project_model_providers` | Track project provider-list latency |
| Histogram | `platform.agchain.project_model_providers.credential.upsert.duration_ms` | `agchain_project_model_providers.py:upsert_project_model_provider_credential` | Track project credential save latency |
| Histogram | `platform.agchain.project_model_providers.credential.test.duration_ms` | `agchain_project_model_providers.py:test_project_model_provider_credential` | Track test-key latency |
| Structured log | `agchain.project_model_provider.credential_saved` | `project_model_providers.py:upsert_project_credential` | Audit project credential saves without exposing secret material |
| Structured log | `agchain.project_model_provider.credential_deleted` | `project_model_providers.py:delete_project_credential` | Audit project credential deletes |
| Structured log | `agchain.models.provider.created` | `provider_registry.py:create_provider_registry_row` | Audit admin provider creation |
| Structured log | `agchain.models.provider.updated` | `provider_registry.py:update_provider_registry_row` | Audit admin provider updates |

Observability attribute rules:

- Allowed attributes: `provider_slug`, `credential_status`, `validation_status`, `result`, `http.status_code`, `project_id_present`, `provider_enabled`, `supported_auth_kind_count`, `has_stored_credential`
- Forbidden in trace, metric, or structured log attributes: `user_id`, `email`, raw `project_id`, raw `api_key`, encrypted key material, decrypted key material, `key_suffix`, raw request body values

### Database Migrations

| Migration | Creates/Alters | Affects Existing Data? |
|-----------|----------------|------------------------|
| `20260405130000_agchain_provider_registry.sql` | Creates `public.agchain_provider_registry`, seeds the current known providers, and adds the foreign-key relationship from `agchain_model_targets.provider_slug` to `agchain_provider_registry.provider_slug` | Yes - validates existing `agchain_model_targets.provider_slug` values against seeded provider rows, but does not rewrite target rows |
| `20260405140000_agchain_project_provider_credentials.sql` | Creates `public.agchain_project_provider_credentials` with foreign keys to `user_projects.project_id` and `agchain_provider_registry.provider_slug`, uniqueness on `(project_id, provider_slug)`, and encrypted credential storage | No - no automatic backfill from `user_api_keys` |

### Edge Functions

No edge functions created or modified.

Existing edge functions are out of scope for this plan. This implementation stays in `platform-api`, `supabase/migrations`, and the web app. If an edge-function reuse path becomes preferable, stop and revise this plan before implementation continues.

### Frontend Surface Area

**New pages:** `0`

**New components:** `3`

| Component | File | Used by |
|-----------|------|---------|
| `ProjectModelProvidersTable` | `web/src/components/agchain/models/ProjectModelProvidersTable.tsx` | `web/src/pages/agchain/AgchainModelsPage.tsx` |
| `ProjectProviderCredentialModal` | `web/src/components/agchain/models/ProjectProviderCredentialModal.tsx` | `web/src/pages/agchain/AgchainModelsPage.tsx` |
| `AgchainProviderRegistryForm` | `web/src/components/agchain/models/AgchainProviderRegistryForm.tsx` | `web/src/components/agchain/models/AgchainModelInspector.tsx` |

**New hooks:** `1`

| Hook | File | Used by |
|------|------|---------|
| `useProjectModelProviders` | `web/src/hooks/agchain/useProjectModelProviders.ts` | `web/src/pages/agchain/AgchainModelsPage.tsx` |

**New libraries or services:** `1`

| Library | File | Used by |
|---------|------|---------|
| `agchainProjectModelProviders` | `web/src/lib/agchainProjectModelProviders.ts` | `useProjectModelProviders.ts` |

**Modified pages:** `2`

| Page | File | What changes |
|------|------|--------------|
| `AgchainModelsPage` | `web/src/pages/agchain/AgchainModelsPage.tsx` | Replace the mixed split-pane registry workspace with a provider list plus centered project-credential modal |
| `AgchainAdminModelsPage` | `web/src/pages/admin/AgchainAdminModelsPage.tsx` | Rehost the current mixed models workspace here and remove credential ownership from it |

**Modified existing components and hooks:** `6`

| File | What changes |
|------|--------------|
| `web/src/components/agchain/models/AgchainModelsTable.tsx` | Narrow semantics to admin registry rows and remove project-credential language |
| `web/src/components/agchain/models/AgchainModelInspector.tsx` | Remove the credential panel and add editable provider-registry metadata ahead of curated model targets |
| `web/src/components/agchain/models/AgchainModelsToolbar.tsx` | Add admin provider-create affordance while preserving target-form helpers already used by the inspector |
| `web/src/hooks/agchain/useAgchainModels.ts` | Narrow this hook to admin registry behavior only |
| `web/src/lib/agchainModels.ts` | Keep admin route-family clients and add provider create/update calls |
| `web/src/lib/agchainModelProviders.ts` | Recompute provider rows without user credential state so the admin page can continue using the current grouping utilities |

**New frontend test modules:** `1`

| File | What changes |
|------|--------------|
| `web/src/pages/admin/AgchainAdminModelsPage.test.tsx` | Add admin registry page coverage for provider growth, provider editing, and no secret-entry behavior |

**Modified frontend test modules:** `1`

| File | What changes |
|------|--------------|
| `web/src/pages/agchain/AgchainModelsPage.test.tsx` | Rewrite around project-scoped provider rows, modal behavior, and absence of model-target CRUD |

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. The project page at `/app/agchain/models` remains in the existing AGChain shell and stays focused on the selected AGChain project.
2. The admin page at `/app/agchain-admin/models` remains in the existing AGChain admin shell and becomes the provider and curated-model registry.
3. The current mixed models workspace is treated as the structural starting point for the admin page, not thrown away and rebuilt from zero.
4. The project page is the simplified half: provider list, provider status, and centered credential modal only.
5. The admin page is the registry half: provider metadata plus curated model targets, with no secret-entry controls.
6. Project credential ownership is truly project-scoped: one user may configure different keys in different projects and those keys must not bleed across projects.
7. The project page does not read or write `user_api_keys` after this cutover.
8. `agchain_provider_registry` becomes the only runtime provider-definition source of truth after cutover; `model_provider_catalog.py` is retired.
9. The admin registry must support adding provider rows and adding curated model rows under them; it is not limited to editing seeded rows only.
10. No broader settings IA refactor, organization inheritance, or user-default credential program is part of this plan.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. On `/app/agchain/models`, the user sees a provider-first credential page, not the current split-pane registry workspace.
2. Opening a provider on `/app/agchain/models` shows a centered modal with provider identity, docs link, env-var name chip, secure key input, helper copy, `Test key`, and `Save`.
3. Saving a provider key in `Project A` changes only `Project A`.
4. Switching to `Project B` shows independent provider status and does not reuse `Project A`'s stored key.
5. `/app/agchain/models` shows no curated model-target forms, no health-check list, and no inline inspector.
6. `/app/agchain-admin/models` presents the current registry/editor-style workspace, now mounted under the admin route and free of credential controls.
7. An admin can add a provider row on `/app/agchain-admin/models`, then add curated model rows under that provider.
8. The admin page contains no secret-entry, test-key, save-key, or remove-key actions.

### Locked Platform API Surface

#### New project-scoped platform API endpoints: `4`

1. `GET /agchain/projects/{project_id}/model-providers`
2. `PUT /agchain/projects/{project_id}/model-providers/{provider_slug}/credential`
3. `POST /agchain/projects/{project_id}/model-providers/{provider_slug}/credential/test`
4. `DELETE /agchain/projects/{project_id}/model-providers/{provider_slug}/credential`

#### New admin platform API endpoints: `2`

1. `POST /agchain/models/providers`
2. `PATCH /agchain/models/providers/{provider_slug}`

#### Existing platform API endpoints modified: `3`

1. `GET /agchain/models/providers` - persisted provider-registry rows, admin-only auth
2. `GET /agchain/models` - registry-only model-target payload, no user credential joins
3. `GET /agchain/models/{model_target_id}` - registry-only model-target detail, no user credential joins

#### Existing platform API endpoints reused as-is: `3`

1. `POST /agchain/models`
2. `PATCH /agchain/models/{model_target_id}`
3. `POST /agchain/models/{model_target_id}/refresh-health`

#### Existing platform API endpoints removed: `2`

1. `POST /agchain/models/{model_target_id}/connect-key`
2. `DELETE /agchain/models/{model_target_id}/disconnect-key`

### Locked Observability Surface

#### New traces: `7`

1. `agchain.project_model_providers.list`
2. `agchain.project_model_providers.credential.upsert`
3. `agchain.project_model_providers.credential.test`
4. `agchain.project_model_providers.credential.delete`
5. `agchain.models.providers.list`
6. `agchain.models.providers.create`
7. `agchain.models.providers.update`

#### New metrics: `6 counters`, `3 histograms`

1. `platform.agchain.project_model_providers.list.count`
2. `platform.agchain.project_model_providers.credential.upsert.count`
3. `platform.agchain.project_model_providers.credential.test.count`
4. `platform.agchain.project_model_providers.credential.delete.count`
5. `platform.agchain.models.providers.create.count`
6. `platform.agchain.models.providers.update.count`

#### New structured logs: `4`

1. `agchain.project_model_provider.credential_saved`
2. `agchain.project_model_provider.credential_deleted`
3. `agchain.models.provider.created`
4. `agchain.models.provider.updated`

### Locked Inventory Counts

#### Database

- New migrations: `2`
- Modified existing migrations: `0`

#### Backend

- New route modules: `1`
- New domain modules: `2`
- Modified backend modules: `4`
- New backend test modules: `2`
- Modified backend test modules: `1`

#### Frontend

- New top-level pages or routes: `0`
- Modified existing pages: `2`
- New visual components: `3`
- New hooks: `1`
- New service or library modules: `1`
- Modified existing components and hooks: `6`
- New frontend test modules: `1`
- Modified frontend test modules: `1`
- Retired mixed-scope modules: `2`

### Locked File Inventory

#### New files

- `supabase/migrations/20260405130000_agchain_provider_registry.sql`
- `supabase/migrations/20260405140000_agchain_project_provider_credentials.sql`
- `services/platform-api/app/api/routes/agchain_project_model_providers.py`
- `services/platform-api/app/domain/agchain/provider_registry.py`
- `services/platform-api/app/domain/agchain/project_model_providers.py`
- `services/platform-api/tests/test_agchain_provider_registry.py`
- `services/platform-api/tests/test_agchain_project_model_providers.py`
- `web/src/lib/agchainProjectModelProviders.ts`
- `web/src/hooks/agchain/useProjectModelProviders.ts`
- `web/src/components/agchain/models/ProjectModelProvidersTable.tsx`
- `web/src/components/agchain/models/ProjectProviderCredentialModal.tsx`
- `web/src/components/agchain/models/AgchainProviderRegistryForm.tsx`
- `web/src/pages/admin/AgchainAdminModelsPage.test.tsx`

#### Modified files

- `services/platform-api/app/api/routes/agchain_models.py`
- `services/platform-api/app/domain/agchain/model_registry.py`
- `services/platform-api/app/domain/agchain/__init__.py`
- `services/platform-api/app/main.py`
- `services/platform-api/tests/test_agchain_models.py`
- `web/src/pages/agchain/AgchainModelsPage.tsx`
- `web/src/pages/agchain/AgchainModelsPage.test.tsx`
- `web/src/pages/admin/AgchainAdminModelsPage.tsx`
- `web/src/components/agchain/models/AgchainModelsTable.tsx`
- `web/src/components/agchain/models/AgchainModelInspector.tsx`
- `web/src/components/agchain/models/AgchainModelsToolbar.tsx`
- `web/src/hooks/agchain/useAgchainModels.ts`
- `web/src/lib/agchainModels.ts`
- `web/src/lib/agchainModelProviders.ts`

#### Retired files

- `services/platform-api/app/domain/agchain/model_provider_catalog.py`
- `web/src/components/agchain/models/AgchainModelCredentialPanel.tsx`

## Frozen Project Credential Scope Contract

The project models page must resolve credential state by `(project_id, provider_slug)`, not by `(user_id, provider_slug)`.

Do not implement project-page credential reads or writes by reusing `user_api_keys`, `connect_model_key`, or `disconnect_model_key`. Those seams are explicitly the wrong ownership model for this product contract.

Do not add organization-level inheritance, user-default fallback, or cross-project copy behavior in this tranche. The required correction is narrower: one project owns one provider credential record, and another project may own a different record for the same provider.

Do not use `agchain_model_targets` as the project page list spine. `agchain_model_targets` remains the curated admin registry of provider-model rows. The project page reads provider registry rows plus project credential rows only.

## Explicit Risks Accepted In This Plan

1. Legacy `user_api_keys` rows remain in the database for unrelated surfaces in this tranche; this plan only removes them from the AGChain models pages.
2. Provider deletion is not part of this tranche; registry growth is required, but destructive provider removal remains out of scope.
3. Providers that are not project-configurable for credentials may still appear in the registry, but the project page only exposes project credential controls for project-configurable providers.

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked API surface in this plan exists exactly as specified.
2. The locked traces, metrics, and structured logs in this plan exist exactly as specified.
3. The two locked database migrations exist exactly as specified.
4. `agchain_provider_registry` is the live runtime provider-definition source of truth and `model_provider_catalog.py` is retired.
5. `/app/agchain/models` is backed by project-scoped credential ownership rather than `user_api_keys`.
6. `/app/agchain/models` no longer mounts any model-target CRUD or health-inspector behavior.
7. `/app/agchain-admin/models` no longer presents as a placeholder and does not expose key management.
8. The locked inventory counts in this plan match the actual created, modified, and retired files.

## Task 1: Add The Provider Registry Migration

**File(s):** `supabase/migrations/20260405130000_agchain_provider_registry.sql`

**Step 1:** Create `public.agchain_provider_registry` with `provider_slug` as the primary key plus provider metadata, supported auth kinds, defaults, and sort order.
**Step 2:** Seed the migration with the current known provider rows that today live in `model_provider_catalog.py`.
**Step 3:** Add the foreign-key relationship from `agchain_model_targets.provider_slug` to `agchain_provider_registry.provider_slug`.

**Test command:** `cd supabase && supabase db reset`
**Expected output:** Reset succeeds and `agchain_provider_registry` exists with seeded provider rows and valid `agchain_model_targets` references.

**Commit:** `db: add agchain provider registry`

## Task 2: Add The Project Provider Credential Migration

**File(s):** `supabase/migrations/20260405140000_agchain_project_provider_credentials.sql`

**Step 1:** Create `public.agchain_project_provider_credentials` with foreign keys to `user_projects.project_id` and `agchain_provider_registry.provider_slug`.
**Step 2:** Add encrypted credential storage fields, validation fields, timestamps, and a unique key on `(project_id, provider_slug)`.
**Step 3:** Keep this migration free of any automatic copy from `user_api_keys`.

**Test command:** `cd supabase && supabase db reset`
**Expected output:** Reset succeeds and `agchain_project_provider_credentials` exists with the expected keys and constraints.

**Commit:** `db: add agchain project provider credentials`

## Task 3: Add Failing Backend Tests For Provider Registry Growth

**File(s):** `services/platform-api/tests/test_agchain_provider_registry.py`, `services/platform-api/tests/test_agchain_models.py`

**Step 1:** Write pytest coverage that expects `GET /agchain/models/providers` to read persisted provider rows.
**Step 2:** Add pytest coverage that expects `POST /agchain/models/providers` and `PATCH /agchain/models/providers/{provider_slug}` to require AGChain admin auth.
**Step 3:** Add assertions that admin model-target payloads no longer include user credential state.

**Test command:** `cd services/platform-api && pytest -q tests/test_agchain_provider_registry.py tests/test_agchain_models.py`
**Expected output:** Failing assertions for missing provider-registry persistence and missing create/update behavior.

**Commit:** `test: add agchain provider registry backend coverage`

## Task 4: Implement The Provider Registry Backend And Retire The Static Catalog

**File(s):** `services/platform-api/app/domain/agchain/provider_registry.py`, `services/platform-api/app/api/routes/agchain_models.py`, `services/platform-api/app/domain/agchain/model_registry.py`, `services/platform-api/app/domain/agchain/__init__.py`, `services/platform-api/tests/test_agchain_provider_registry.py`, `services/platform-api/tests/test_agchain_models.py`, `services/platform-api/app/domain/agchain/model_provider_catalog.py`

**Step 1:** Implement registry list, create, update, and provider-lookup helpers in `provider_registry.py`.
**Step 2:** Change `agchain_models.py` so provider-list reads, provider creation, and provider updates all use the persisted registry.
**Step 3:** Replace `model_registry.py` provider validation lookups so model-target CRUD reads from the persisted registry, not the static catalog.
**Step 4:** Remove runtime imports of `model_provider_catalog.py` and retire that file.
**Step 5:** Re-run the targeted backend tests until they pass.

**Test command:** `cd services/platform-api && pytest -q tests/test_agchain_provider_registry.py tests/test_agchain_models.py`
**Expected output:** Registry tests pass and no runtime path still depends on `model_provider_catalog.py`.

**Commit:** `feat: move agchain provider definitions into registry persistence`

## Task 5: Add Failing Project Credential Backend Tests

**File(s):** `services/platform-api/tests/test_agchain_project_model_providers.py`

**Step 1:** Write pytest coverage for the four new `/agchain/projects/{project_id}/model-providers` endpoints.
**Step 2:** Add assertions that credential reads and writes are isolated by `project_id`.
**Step 3:** Add assertions that `credential/test` validates a key without persisting it.

**Test command:** `cd services/platform-api && pytest -q tests/test_agchain_project_model_providers.py`
**Expected output:** Failing assertions for missing project-scoped provider credential endpoints.

**Commit:** `test: add project model provider credential coverage`

## Task 6: Implement The Project Credential Backend

**File(s):** `services/platform-api/app/domain/agchain/project_model_providers.py`, `services/platform-api/app/api/routes/agchain_project_model_providers.py`, `services/platform-api/app/domain/agchain/__init__.py`, `services/platform-api/app/main.py`, `services/platform-api/tests/test_agchain_project_model_providers.py`

**Step 1:** Implement project-provider list, credential save, credential test, and credential delete helpers using `agchain_provider_registry` plus `agchain_project_provider_credentials`.
**Step 2:** Use `require_project_access` for list reads and `require_project_write_access` for credential mutations.
**Step 3:** Mount the four new project-scoped endpoints in `main.py`.
**Step 4:** Add the locked traces, metrics, and structured logs without emitting secret material.

**Test command:** `cd services/platform-api && pytest -q tests/test_agchain_project_model_providers.py`
**Expected output:** Project credential tests pass and prove per-project credential isolation.

**Commit:** `feat: add project-scoped agchain provider credentials`

## Task 7: Move The Existing Registry Workspace To The Admin Page

**File(s):** `web/src/pages/admin/AgchainAdminModelsPage.tsx`, `web/src/components/agchain/models/AgchainModelsTable.tsx`, `web/src/components/agchain/models/AgchainModelInspector.tsx`, `web/src/components/agchain/models/AgchainModelsToolbar.tsx`, `web/src/hooks/agchain/useAgchainModels.ts`, `web/src/lib/agchainModels.ts`, `web/src/lib/agchainModelProviders.ts`, `web/src/components/agchain/models/AgchainProviderRegistryForm.tsx`, `web/src/pages/admin/AgchainAdminModelsPage.test.tsx`

**Step 1:** Rebuild `AgchainAdminModelsPage.tsx` using the current split-pane models workspace as the starting structure.
**Step 2:** Remove credential actions from that stack and insert `AgchainProviderRegistryForm` for provider create/edit metadata.
**Step 3:** Narrow `useAgchainModels`, `agchainModels.ts`, and `agchainModelProviders.ts` to admin registry semantics only.
**Step 4:** Add admin page tests that cover provider creation, provider editing, curated model-target CRUD, and the absence of secret-entry UI.

**Test command:** `cd web && npm run test -- src/pages/admin/AgchainAdminModelsPage.test.tsx`
**Expected output:** The admin page test passes and the page renders the registry workspace instead of the placeholder.

**Commit:** `feat: move agchain model registry workspace to admin page`

## Task 8: Simplify The Project Models Page

**File(s):** `web/src/pages/agchain/AgchainModelsPage.tsx`, `web/src/pages/agchain/AgchainModelsPage.test.tsx`, `web/src/hooks/agchain/useProjectModelProviders.ts`, `web/src/lib/agchainProjectModelProviders.ts`, `web/src/components/agchain/models/ProjectModelProvidersTable.tsx`, `web/src/components/agchain/models/ProjectProviderCredentialModal.tsx`

**Step 1:** Rewrite `AgchainModelsPage.tsx` to read the focused project and load provider rows through `useProjectModelProviders`.
**Step 2:** Build the project page around `ProjectModelProvidersTable` and `ProjectProviderCredentialModal`.
**Step 3:** Make the modal own the project-scoped key flow: test, save, replace, remove.
**Step 4:** Rewrite `AgchainModelsPage.test.tsx` around project-specific state and the absence of registry/editor behavior.

**Test command:** `cd web && npm run test -- src/pages/agchain/AgchainModelsPage.test.tsx`
**Expected output:** The project page test passes against the provider-list plus centered-modal contract.

**Commit:** `feat: simplify agchain project models page`

## Task 9: Retire The Remaining Mixed-Scope Credential Artifact

**File(s):** `web/src/components/agchain/models/AgchainModelCredentialPanel.tsx`

**Step 1:** Remove the now-unused embedded credential panel file after the admin page no longer imports it.
**Step 2:** Re-run both page suites to prove the new project modal and the admin registry surface stand on their own.

**Test command:** `cd web && npm run test -- src/pages/agchain/AgchainModelsPage.test.tsx src/pages/admin/AgchainAdminModelsPage.test.tsx`
**Expected output:** Both page suites pass and no embedded account-scoped credential UI remains.

**Commit:** `refactor: retire embedded agchain credential panel`

## Task 10: Run Full Contract Verification

**File(s):** `docs/plans/2026-04-05-agchain-project-and-admin-model-pages-implementation-plan.md`

**Step 1:** Run the migration, backend, and frontend verification commands from this plan.
**Step 2:** Compare the actual created, modified, and retired files against the locked inventory counts in this document.
**Step 3:** Verify the implemented page behavior against the locked acceptance contract before closing the work.
**Step 4:** Use `verification-before-completion` discipline before claiming the work complete.

**Test command:** `cd services/platform-api && pytest -q && cd ../../web && npm run test -- src/pages/agchain/AgchainModelsPage.test.tsx src/pages/admin/AgchainAdminModelsPage.test.tsx && npm run build`
**Expected output:** Backend tests pass, both page suites pass, and the web build completes without reintroducing mixed-scope surfaces.

**Commit:** `chore: verify agchain model surface split`

## Execution Handoff

Plan path: `docs/plans/2026-04-05-agchain-project-and-admin-model-pages-implementation-plan.md`

Before implementation starts:

1. Read this plan fully before touching code.
2. Follow the locked product, API, observability, and inventory decisions exactly.
3. Do not reintroduce a duplicate provider-definition seam or rebuild the admin page from zero.
4. If any locked decision proves wrong during implementation, stop and revise this plan before continuing.

## Revision Summary

**Evaluation cross-checked:** `evaluating-plan-before-implementation`
**Artifact revised:** `docs/plans/2026-04-05-agchain-project-and-admin-model-pages-implementation-plan.md`

### Cross-Check Results

- Verified accurate: `3`
- Verified inaccurate: `0`
- Partially accurate: `0`

### Findings Fixed

- Duplicate provider-definition seam -> runtime provider definitions are now locked to `agchain_provider_registry` only, and `model_provider_catalog.py` is retired after cutover.
- Rebuild-heavy frontend plan -> frontend revision now reuses the current mixed models workspace as the admin starting point and limits new UI to the project credential page plus provider-registry form.
- Underbuilt admin registry -> admin scope now explicitly includes provider creation plus curated model-target growth, not just edit-only seeded rows.

### Cascading Changes

- Platform API surface reduced from five project endpoints to four by removing the unnecessary provider-detail endpoint.
- Frontend inventory counts were tightened to match the reuse/extract approach.
- File inventory and tasks were re-locked to reflect reuse of existing admin-facing models components and retirement of only the truly obsolete credential artifact.

### Ready for re-evaluation

This revision stays within the verified findings only and is ready for a fresh approve/reject pass.
