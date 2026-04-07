# AGChain Project And Admin Models Pages Implementation Plan

**Goal:** Split the current mixed `/app/agchain/models` surface into its three correct surfaces: a project-scoped local provider page at `/app/agchain/models`, an organization-scoped global provider page at `/app/agchain/settings/organization/ai-providers`, and an admin-scoped provider and curated-model registry at `/app/agchain-admin/models`, while correcting credential ownership from user-scoped to organization-default plus project-override.

**Architecture:** Reuse the current mixed models workspace as the structural starting point for the admin page instead of rebuilding it from scratch. Build the organization page and project page as visually parallel provider tables with the same centered credential modal design, using the PDF reference as the interaction contract for the shared `basic API key` form while still using this repo's existing shell, tokens, table primitives, modal primitives, and state-message primitives. Add one organization-scoped platform API seam for global defaults under `/agchain/organizations/{organization_id}/model-providers` and one project-scoped platform API seam for local overrides under `/agchain/projects/{project_id}/model-providers`. Persist provider definitions in `agchain_provider_registry` and make that the only runtime provider-definition source of truth after cutover, including provider category and credential form kind so the frontend can render category-grouped rows and provider-specific forms without hard-coded per-provider drift. Effective credential resolution becomes `project override -> organization credential -> Not set`. Credential rows persist encrypted structured payloads keyed by provider form kind so the common API-key modal and future Azure/AWS/Vertex variants can share the same save/test/delete seam without schema churn.

**Tech Stack:** React + TypeScript, existing AGChain shell and AGChain admin shell layouts, FastAPI, Supabase Postgres, OpenTelemetry, Vitest, pytest.

**Status:** Draft
**Author:** Codex (requested by user)
**Date:** 2026-04-05
**Reference UI:** `E:/agchain models- doc 1.pdf` - 3-page reference capture for the shared provider-credential page and the common `basic API key` modal used by most providers

## Manifest

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/agchain/organizations/{organization_id}/model-providers` | Read organization-scoped global provider rows, grouped provider metadata, and credential state | New |
| PUT | `/agchain/organizations/{organization_id}/model-providers/{provider_slug}/credential` | Save or replace one organization-scoped provider credential | New |
| POST | `/agchain/organizations/{organization_id}/model-providers/{provider_slug}/credential/test` | Validate a typed organization credential without persisting it | New |
| DELETE | `/agchain/organizations/{organization_id}/model-providers/{provider_slug}/credential` | Remove one organization-scoped provider credential | New |
| GET | `/agchain/projects/{project_id}/model-providers` | Read project-scoped effective provider rows, grouped provider metadata, and local-override state for the focused project | New |
| PUT | `/agchain/projects/{project_id}/model-providers/{provider_slug}/credential` | Save or replace one project-scoped local override credential | New |
| POST | `/agchain/projects/{project_id}/model-providers/{provider_slug}/credential/test` | Validate a typed project override credential without persisting it | New |
| DELETE | `/agchain/projects/{project_id}/model-providers/{provider_slug}/credential` | Remove one project-scoped local override credential | New |
| GET | `/agchain/models/providers` | Read persisted provider registry rows for the admin models page | Existing - contract changes |
| POST | `/agchain/models/providers` | Create one provider registry row | New |
| PATCH | `/agchain/models/providers/{provider_slug}` | Update one provider registry row | New |
| GET | `/agchain/models` | Read curated model target registry rows for admin use | Existing - contract changes |
| GET | `/agchain/models/{model_target_id}` | Read one curated model target detail for admin use | Existing - contract changes |
| POST | `/agchain/models` | Create one curated model target | Existing - no path change |
| PATCH | `/agchain/models/{model_target_id}` | Update one curated model target | Existing - no path change |
| POST | `/agchain/models/{model_target_id}/refresh-health` | Leave credential-authenticated target health refresh unchanged; redesigning it for explicit organization scope is out of scope for this plan | Existing - explicitly out of scope |
| POST | `/agchain/models/{model_target_id}/connect-key` | Remove legacy user-scoped credential path | Removed |
| DELETE | `/agchain/models/{model_target_id}/disconnect-key` | Remove legacy user-scoped credential path | Removed |

#### New endpoint contracts

`GET /agchain/organizations/{organization_id}/model-providers`

- Auth: `require_user_auth` plus `require_organization_membership(user_id, organization_id)`
- Request: no body
- Response: `{ items: [{ provider_slug, display_name, docs_url, env_var_name, provider_category: "model" | "cloud", credential_form_kind: "basic_api_key" | "basic_access_token" | "service_account_json" | "azure_openai" | "aws_bedrock" | "vertex_ai", enabled, credential_status: "Not set" | "Set", last_updated_at, supported_auth_kinds }], total }`
- Touches: `public.agchain_provider_registry`, `public.agchain_organization_provider_credentials`
- Notes: returns everything needed to render the organization page sections, row subtitles, and centered credential modal without a second provider-detail read

`PUT /agchain/organizations/{organization_id}/model-providers/{provider_slug}/credential`

- Auth: `require_user_auth` plus `require_organization_permission(user_id, organization_id, "organization.settings.manage")`
- Request: `{ credential_payload: object }`
- Response: `{ ok: true, credential_status: "Set", updated_at, message: string }`
- Touches: `public.agchain_organization_provider_credentials`
- Notes: `credential_payload` must match the provider's `credential_form_kind`; for `basic_api_key` providers the payload is exactly `{ api_key: string }`. Save is not gated by a prior successful test result and must still persist when the last test failed or no test was run. This writes by `(organization_id, provider_slug)` only and is the global default layer for all projects in the organization.

`POST /agchain/organizations/{organization_id}/model-providers/{provider_slug}/credential/test`

- Auth: `require_user_auth` plus `require_organization_permission(user_id, organization_id, "organization.settings.manage")`
- Request: `{ credential_payload: object }`
- Response: `{ ok: true, result: "passed" | "failed", message: string, latency_ms: number | null }`
- Touches: provider lookup in `public.agchain_provider_registry`; no credential persistence
- Notes: `credential_payload` must match the provider's `credential_form_kind`; for `basic_api_key` providers the payload is exactly `{ api_key: string }`. This exists only to support the organization page `Test key` action, emits an external state message, and does not mutate table state or persist credential data.

`DELETE /agchain/organizations/{organization_id}/model-providers/{provider_slug}/credential`

- Auth: `require_user_auth` plus `require_organization_permission(user_id, organization_id, "organization.settings.manage")`
- Request: no body
- Response: `{ ok: true, credential_status: "Not set" }`
- Touches: `public.agchain_organization_provider_credentials`
- Notes: deletion affects only the addressed organization and may expose `Not set` or `Inherited` states on project rows downstream

`GET /agchain/projects/{project_id}/model-providers`

- Auth: `require_user_auth` plus `require_project_access(user_id, project_id)`
- Request: no body
- Response: `{ items: [{ provider_slug, display_name, docs_url, env_var_name, provider_category: "model" | "cloud", credential_form_kind: "basic_api_key" | "basic_access_token" | "service_account_json" | "azure_openai" | "aws_bedrock" | "vertex_ai", enabled, credential_status: "Not set" | "Set" | "Inherited", effective_source: "none" | "project" | "organization", has_local_override: boolean, last_updated_at, supported_auth_kinds }], total }`
- Touches: `public.agchain_provider_registry`, `public.agchain_organization_provider_credentials`, `public.agchain_project_provider_credentials`
- Notes: `last_updated_at` reflects the credential currently driving the row; inherited rows show the organization credential update time, local rows show the project override update time

`PUT /agchain/projects/{project_id}/model-providers/{provider_slug}/credential`

- Auth: `require_user_auth` plus `require_project_write_access(user_id, project_id)`
- Request: `{ credential_payload: object }`
- Response: `{ ok: true, credential_status: "Set", updated_at, message: string }`
- Touches: `public.agchain_project_provider_credentials`
- Notes: `credential_payload` must match the provider's `credential_form_kind`; for `basic_api_key` providers the payload is exactly `{ api_key: string }`. Save is not gated by a prior successful test result and must still persist when the last test failed or no test was run. This writes by `(project_id, provider_slug)` only, creates or replaces the local override, and must not touch `user_api_keys`.

`POST /agchain/projects/{project_id}/model-providers/{provider_slug}/credential/test`

- Auth: `require_user_auth` plus `require_project_write_access(user_id, project_id)`
- Request: `{ credential_payload: object }`
- Response: `{ ok: true, result: "passed" | "failed", message: string, latency_ms: number | null }`
- Touches: provider lookup in `public.agchain_provider_registry`; no credential persistence
- Notes: `credential_payload` must match the provider's `credential_form_kind`; for `basic_api_key` providers the payload is exactly `{ api_key: string }`. This exists only to support the project modal `Test key` action before saving a local override, emits an external state message, and does not mutate table state or persist credential data.

`DELETE /agchain/projects/{project_id}/model-providers/{provider_slug}/credential`

- Auth: `require_user_auth` plus `require_project_write_access(user_id, project_id)`
- Request: no body
- Response: `{ ok: true, credential_status: "Inherited" | "Not set" }`
- Touches: `public.agchain_project_provider_credentials`
- Notes: deletion removes only the local override; if an organization credential exists the row returns to `Inherited`, otherwise it returns to `Not set`

`POST /agchain/models/providers`

- Auth: `require_agchain_admin`
- Request: `{ provider_slug: string, display_name: string, docs_url: string | null, env_var_name: string | null, provider_category: "model" | "cloud", credential_form_kind: "basic_api_key" | "basic_access_token" | "service_account_json" | "azure_openai" | "aws_bedrock" | "vertex_ai", enabled: boolean, supports_custom_base_url: boolean, supported_auth_kinds: string[], default_probe_strategy: string, default_capabilities_jsonb: object, supports_model_args: boolean, notes: string | null, sort_order: number }`
- Response: `{ ok: true, provider_slug, created_at }`
- Touches: `public.agchain_provider_registry`
- Notes: this is the admin capability that allows the registry to grow to new providers over time

`PATCH /agchain/models/providers/{provider_slug}`

- Auth: `require_agchain_admin`
- Request: partial payload of `{ display_name, docs_url, env_var_name, provider_category, credential_form_kind, enabled, supports_custom_base_url, supported_auth_kinds, default_probe_strategy, default_capabilities_jsonb, supports_model_args, notes, sort_order }`
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
| Trace span | `agchain.organization_model_providers.list` | `services/platform-api/app/api/routes/agchain_organization_model_providers.py:list_organization_model_providers` | Measure organization provider-list latency and access outcomes |
| Trace span | `agchain.organization_model_providers.credential.upsert` | `services/platform-api/app/api/routes/agchain_organization_model_providers.py:upsert_organization_model_provider_credential` | Measure global credential saves and replaces |
| Trace span | `agchain.organization_model_providers.credential.test` | `services/platform-api/app/api/routes/agchain_organization_model_providers.py:test_organization_model_provider_credential` | Measure organization test-key latency and failures |
| Trace span | `agchain.organization_model_providers.credential.delete` | `services/platform-api/app/api/routes/agchain_organization_model_providers.py:delete_organization_model_provider_credential` | Measure global credential removals |
| Trace span | `agchain.project_model_providers.list` | `services/platform-api/app/api/routes/agchain_project_model_providers.py:list_project_model_providers` | Measure project provider-list latency and effective-state outcomes |
| Trace span | `agchain.project_model_providers.credential.upsert` | `services/platform-api/app/api/routes/agchain_project_model_providers.py:upsert_project_model_provider_credential` | Measure project override saves and replaces |
| Trace span | `agchain.project_model_providers.credential.test` | `services/platform-api/app/api/routes/agchain_project_model_providers.py:test_project_model_provider_credential` | Measure project override test-key latency and failures |
| Trace span | `agchain.project_model_providers.credential.delete` | `services/platform-api/app/api/routes/agchain_project_model_providers.py:delete_project_model_provider_credential` | Measure project override removals |
| Trace span | `agchain.models.providers.list` | `services/platform-api/app/api/routes/agchain_models.py:list_supported_providers_route` | Measure admin provider-registry list reads |
| Trace span | `agchain.models.providers.create` | `services/platform-api/app/api/routes/agchain_models.py:create_provider_route` | Audit provider creation |
| Trace span | `agchain.models.providers.update` | `services/platform-api/app/api/routes/agchain_models.py:update_provider_route` | Audit provider updates |
| Metric | `platform.agchain.organization_model_providers.list.count` | `agchain_organization_model_providers.py:list_organization_model_providers` | Count organization provider-list requests |
| Metric | `platform.agchain.organization_model_providers.credential.upsert.count` | `agchain_organization_model_providers.py:upsert_organization_model_provider_credential` | Count organization credential saves |
| Metric | `platform.agchain.organization_model_providers.credential.test.count` | `agchain_organization_model_providers.py:test_organization_model_provider_credential` | Count organization test-key attempts |
| Metric | `platform.agchain.organization_model_providers.credential.delete.count` | `agchain_organization_model_providers.py:delete_organization_model_provider_credential` | Count organization credential deletions |
| Metric | `platform.agchain.project_model_providers.list.count` | `agchain_project_model_providers.py:list_project_model_providers` | Count project provider-list requests |
| Metric | `platform.agchain.project_model_providers.credential.upsert.count` | `agchain_project_model_providers.py:upsert_project_model_provider_credential` | Count project override saves |
| Metric | `platform.agchain.project_model_providers.credential.test.count` | `agchain_project_model_providers.py:test_project_model_provider_credential` | Count project override test-key attempts |
| Metric | `platform.agchain.project_model_providers.credential.delete.count` | `agchain_project_model_providers.py:delete_project_model_provider_credential` | Count project override deletions |
| Metric | `platform.agchain.models.providers.create.count` | `agchain_models.py:create_provider_route` | Count provider creations |
| Metric | `platform.agchain.models.providers.update.count` | `agchain_models.py:update_provider_route` | Count provider updates |
| Histogram | `platform.agchain.organization_model_providers.list.duration_ms` | `agchain_organization_model_providers.py:list_organization_model_providers` | Track organization provider-list latency |
| Histogram | `platform.agchain.organization_model_providers.credential.upsert.duration_ms` | `agchain_organization_model_providers.py:upsert_organization_model_provider_credential` | Track organization credential save latency |
| Histogram | `platform.agchain.organization_model_providers.credential.test.duration_ms` | `agchain_organization_model_providers.py:test_organization_model_provider_credential` | Track organization test-key latency |
| Histogram | `platform.agchain.project_model_providers.list.duration_ms` | `agchain_project_model_providers.py:list_project_model_providers` | Track project provider-list latency |
| Histogram | `platform.agchain.project_model_providers.credential.upsert.duration_ms` | `agchain_project_model_providers.py:upsert_project_model_provider_credential` | Track project override save latency |
| Histogram | `platform.agchain.project_model_providers.credential.test.duration_ms` | `agchain_project_model_providers.py:test_project_model_provider_credential` | Track project override test-key latency |
| Structured log | `agchain.organization_model_provider.credential_saved` | `organization_model_providers.py:upsert_organization_credential` | Audit organization credential saves without exposing secret material |
| Structured log | `agchain.organization_model_provider.credential_deleted` | `organization_model_providers.py:delete_organization_credential` | Audit organization credential deletes |
| Structured log | `agchain.project_model_provider.credential_saved` | `project_model_providers.py:upsert_project_credential` | Audit project override saves without exposing secret material |
| Structured log | `agchain.project_model_provider.credential_deleted` | `project_model_providers.py:delete_project_credential` | Audit project override deletes |
| Structured log | `agchain.models.provider.created` | `provider_registry.py:create_provider_registry_row` | Audit admin provider creation |
| Structured log | `agchain.models.provider.updated` | `provider_registry.py:update_provider_registry_row` | Audit admin provider updates |

Observability attribute rules:

- Allowed attributes: `provider_slug`, `provider_category`, `credential_form_kind`, `credential_status`, `effective_source`, `result`, `http.status_code`, `organization_id_present`, `project_id_present`, `provider_enabled`, `supported_auth_kind_count`, `has_stored_credential`, `has_local_override`
- Forbidden in trace, metric, or structured log attributes: `user_id`, `email`, raw `organization_id`, raw `project_id`, raw `api_key`, encrypted key material, decrypted key material, `key_suffix`, raw request body values

### Database Migrations

| Migration | Creates/Alters | Affects Existing Data? |
|-----------|----------------|------------------------|
| `20260405130000_agchain_provider_registry.sql` | Creates `public.agchain_provider_registry`, seeds the current known providers, adds `provider_category` plus `credential_form_kind`, and adds the foreign-key relationship from `agchain_model_targets.provider_slug` to `agchain_provider_registry.provider_slug` | Yes - validates existing `agchain_model_targets.provider_slug` values against seeded provider rows, but does not rewrite target rows |
| `20260405140000_agchain_organization_provider_credentials.sql` | Creates `public.agchain_organization_provider_credentials` with foreign keys to `public.agchain_organizations.organization_id` and `public.agchain_provider_registry.provider_slug`, uniqueness on `(organization_id, provider_slug)`, encrypted structured credential payload storage, and stored form-kind metadata | No - no automatic backfill from `user_api_keys` or `/secrets` |
| `20260405150000_agchain_project_provider_credentials.sql` | Creates `public.agchain_project_provider_credentials` with foreign keys to `user_projects.project_id` and `agchain_provider_registry.provider_slug`, uniqueness on `(project_id, provider_slug)`, encrypted structured override payload storage, and stored form-kind metadata | No - no automatic backfill from `user_api_keys`; override rows are written only when a project diverges from the organization default |

### Edge Functions

No edge functions created or modified.

Existing edge functions are out of scope for this plan. This implementation stays in `platform-api`, `supabase/migrations`, and the web app. If an edge-function reuse path becomes preferable, stop and revise this plan before implementation continues.

### Frontend Surface Area

**New pages:** `1`

| Page | File | Used by |
|------|------|---------|
| `AgchainOrganizationAiProvidersPage` | `web/src/pages/agchain/settings/AgchainOrganizationAiProvidersPage.tsx` | `web/src/router.tsx` |

**New components:** `3`

| Component | File | Used by |
|-----------|------|---------|
| `AgchainProviderCredentialsTable` | `web/src/components/agchain/models/AgchainProviderCredentialsTable.tsx` | `web/src/pages/agchain/settings/AgchainOrganizationAiProvidersPage.tsx`, `web/src/pages/agchain/AgchainModelsPage.tsx` |
| `AgchainProviderCredentialModal` | `web/src/components/agchain/models/AgchainProviderCredentialModal.tsx` | `web/src/pages/agchain/settings/AgchainOrganizationAiProvidersPage.tsx`, `web/src/pages/agchain/AgchainModelsPage.tsx` |
| `AgchainProviderRegistryForm` | `web/src/components/agchain/models/AgchainProviderRegistryForm.tsx` | `web/src/components/agchain/models/AgchainModelInspector.tsx` |

**New hooks:** `2`

| Hook | File | Used by |
|------|------|---------|
| `useOrganizationModelProviders` | `web/src/hooks/agchain/useOrganizationModelProviders.ts` | `web/src/pages/agchain/settings/AgchainOrganizationAiProvidersPage.tsx` |
| `useProjectModelProviders` | `web/src/hooks/agchain/useProjectModelProviders.ts` | `web/src/pages/agchain/AgchainModelsPage.tsx` |

**New libraries or services:** `2`

| Library | File | Used by |
|---------|------|---------|
| `agchainOrganizationModelProviders` | `web/src/lib/agchainOrganizationModelProviders.ts` | `useOrganizationModelProviders.ts` |
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

**New frontend test modules:** `2`

| File | What changes |
|------|--------------|
| `web/src/pages/agchain/settings/AgchainOrganizationAiProvidersPage.test.tsx` | Add organization provider page coverage for `Not set` and `Set` states plus global credential actions |
| `web/src/pages/admin/AgchainAdminModelsPage.test.tsx` | Add admin registry page coverage for provider growth, provider editing, and no secret-entry behavior |

**Modified frontend test modules:** `1`

| File | What changes |
|------|--------------|
| `web/src/pages/agchain/AgchainModelsPage.test.tsx` | Rewrite around project-scoped effective rows, `Inherited` state behavior, modal behavior, and absence of model-target CRUD |

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. The project page at `/app/agchain/models` remains in the existing AGChain shell and stays focused on the selected AGChain project.
2. The organization page at `/app/agchain/settings/organization/ai-providers` replaces the current placeholder and becomes the global provider-credential page for the active organization.
3. The admin page at `/app/agchain-admin/models` remains in the existing AGChain admin shell and becomes the provider and curated-model registry.
4. The current mixed models workspace is treated as the structural starting point for the admin page, not thrown away and rebuilt from zero.
5. The organization page and the project page are visually parallel provider-management pages built from the same table, category grouping, and centered modal design.
6. The admin page is the registry half: provider metadata plus curated model targets, with no secret-entry controls.
7. Organization credentials are the global default layer for AGChain provider access.
8. Project credentials are local overrides only; a project override wins over the organization credential for the same provider.
9. Effective provider credential resolution is `project override -> organization credential -> Not set`.
10. Removing a project override must reveal the organization credential again when one exists.
11. No AGChain provider page reads from or writes to `user_api_keys` after this cutover.
12. `agchain_provider_registry` becomes the only runtime provider-definition source of truth after cutover; `model_provider_catalog.py` is retired.
13. `agchain_provider_registry` also owns `provider_category` and `credential_form_kind`, so the provider pages do not infer category grouping or form composition from hard-coded frontend lists.
14. The shared `basic API key` modal defined by `E:/agchain models- doc 1.pdf` is the exact interaction contract for the common provider form used by most providers; non-basic provider forms reuse the same outer shell, row grouping, test/save state-message behavior, and endpoint seam.
15. `credential/test` is an optional validation action only. It never persists credential data, never changes row state, and never becomes a prerequisite for `Save` or `Update`.
16. The provider pages use this repo's existing shell, tokens, table primitives, modal primitives, and state-message primitives rather than copying Braintrust's dark-theme visual tokens.
17. The admin registry must support adding provider rows and adding curated model rows under them; it is not limited to editing seeded rows only.
18. No personal credential program, generic `/secrets` integration, deployment-`ENV` fallback, or broader settings IA refactor is part of this plan.
19. Credential-authenticated model-target health refresh is not revised in this tranche; the global admin route does not carry an organization selector, so any org-scoped redesign of `POST /agchain/models/{model_target_id}/refresh-health` must land in a follow-on plan.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. On `/app/agchain/settings/organization/ai-providers`, the user sees a provider-first global credential page for the active organization.
2. On `/app/agchain/models`, the user sees a provider-first local override page for the focused project, not the current split-pane registry workspace.
3. Both provider pages use the same table columns in the same order: `Provider | Credential Status | Last Update | Actions`.
4. Both provider pages render providers in registry-driven category groups such as `Model providers` and `Cloud providers` when those categories are present.
5. Opening a `basic_api_key` provider on either provider page shows a centered modal titled `Configure API key` with provider identity, provider docs link, a read-only `Name` field showing the env-var value, an `API key` secret input, helper copy, `Test key`, and a primary action of `Save` or `Update`.
6. The provider row action opens that modal and uses the current platform action-cell primitive rather than embedding inline credential controls in the table body.
7. Pressing `Test key` shows a state message outside the modal, leaves the modal open, and never injects an inline pass/fail banner into the modal body.
8. Pressing `Save` or `Update` closes the modal, updates the table immediately, and shows the same save-success state message regardless of whether the key was previously tested, untested, or last failed validation.
9. Saving a provider key on the organization page changes the global organization credential only.
10. Saving a provider key on the project page changes the local project override only.
11. If an organization credential exists and no project override exists, the project row shows `Inherited`.
12. If a project override is added while the project row is `Inherited`, the row becomes `Set`.
13. If that project override is removed while an organization credential still exists, the row returns to `Inherited`, not `Not set`.
14. `/app/agchain/models` shows no curated model-target forms, no health-check list, and no inline inspector.
15. `/app/agchain-admin/models` presents the current registry/editor-style workspace, now mounted under the admin route and free of credential controls.
16. An admin can add a provider row on `/app/agchain-admin/models`, set its category plus credential form kind, then add curated model rows under that provider.
17. The admin page contains no secret-entry, test-key, save-key, or remove-key actions.
18. The admin page does not introduce a new credential-authenticated health-refresh action in this tranche.

### Locked Visual Behavior

- The organization page and the project page use the same table and centered modal design.
- The exact table columns on both provider pages are `Provider | Credential Status | Last Update | Actions`.
- The provider list is grouped by `provider_category` sections such as `Model providers` and `Cloud providers`.
- Each provider row shows provider logo, provider display name, and the env-var name as the muted subtitle under the name.
- The organization page `Credential Status` values are exactly `Not set` and `Set`.
- The project page `Credential Status` values are exactly `Not set`, `Set`, and `Inherited`.
- On the project page, `Inherited` means no local project override exists and the active organization credential is currently supplying the provider.
- On the project page, `Set` means a local project override exists and is taking precedence over any organization credential.
- The visible row action is a single trailing configure/edit action that opens the modal; the state-specific action semantics are enforced by its accessible label and by the modal footer, not by rendering multiple inline table buttons.
- On the organization page, `Not set` opens a modal with `Test key` and `Save`.
- On the organization page, `Set` opens a modal with `Test key`, `Update`, and `Remove`.
- On the project page, `Not set` opens a modal with `Test key` and `Save`.
- On the project page, `Set` opens a modal with `Test key`, `Update`, and `Remove`.
- On the project page, `Inherited` opens a modal with `Test key` and `Save`; saving there creates or replaces the local project override.
- The common provider form used by most providers is the `basic_api_key` form from the PDF reference: title `Configure API key`, provider docs link near the provider name, read-only `Name` field showing the env-var value, `API key` input, helper encryption copy, `Test key`, and primary `Save` or `Update`.
- The provider pages intentionally do not show the Braintrust in-modal `API key validated` state; test success or failure appears only as an external state message.
- `Test key` success uses a green external state message. `Test key` failure uses a red external state message and includes provider error detail when the backend provides one.
- `Save` or `Update` uses one shared success state message regardless of the most recent test outcome.
- `Last Update` shows the timestamp of the credential currently driving the visible state; inherited rows show the organization credential update time and local rows show the project override update time.

### Locked Basic Provider Reference Contract

- The PDF reference at `E:/agchain models- doc 1.pdf` is the exact interaction source for `basic_api_key` providers such as Grok/OpenAI-style single-secret providers.
- Use the repo's existing shell, table, modal, button, icon-button, and state-message primitives, but preserve the reference composition: category-grouped table, one row-end configure action, narrow centered modal, and out-of-modal state messages.
- For `basic_api_key` providers, the read-only `Name` field shows the provider env-var identifier; the editable secret field is labeled `API key` and uses placeholder text like `Enter API key`.
- The modal never auto-validates on paste or keystroke. Validation runs only when the user presses `Test key`.
- `Test key` never disables `Save` or `Update`.
- `Save` or `Update` must still succeed after a failed test and must still succeed when no test was run.
- When save succeeds, the frontend closes the modal first, updates the table row state, and then emits the external success state message.
- The default save-success copy is `Secret saved successfully`.
- The default test-failure heading for `basic_api_key` providers is `Unable to validate API key`, with provider-returned detail shown below when available.
- Non-basic provider forms such as Azure, AWS Bedrock, and Vertex AI must reuse the same outer shell and the same test/save/delete state transitions, but their field constitution is keyed off `credential_form_kind` instead of the `basic_api_key` field list.

### Locked Platform API Surface

#### New organization-scoped platform API endpoints: `4`

1. `GET /agchain/organizations/{organization_id}/model-providers`
2. `PUT /agchain/organizations/{organization_id}/model-providers/{provider_slug}/credential`
3. `POST /agchain/organizations/{organization_id}/model-providers/{provider_slug}/credential/test`
4. `DELETE /agchain/organizations/{organization_id}/model-providers/{provider_slug}/credential`

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

#### Existing platform API endpoints reused as-is: `2`

1. `POST /agchain/models`
2. `PATCH /agchain/models/{model_target_id}`

#### Existing platform API endpoints explicitly left out of scope: `1`

1. `POST /agchain/models/{model_target_id}/refresh-health` - the admin route is global and does not carry an organization selector, so credential-authenticated health redesign belongs in a follow-on org-scoped plan

#### Existing platform API endpoints removed: `2`

1. `POST /agchain/models/{model_target_id}/connect-key`
2. `DELETE /agchain/models/{model_target_id}/disconnect-key`

### Locked Observability Surface

#### New traces: `11`

1. `agchain.organization_model_providers.list`
2. `agchain.organization_model_providers.credential.upsert`
3. `agchain.organization_model_providers.credential.test`
4. `agchain.organization_model_providers.credential.delete`
5. `agchain.project_model_providers.list`
6. `agchain.project_model_providers.credential.upsert`
7. `agchain.project_model_providers.credential.test`
8. `agchain.project_model_providers.credential.delete`
9. `agchain.models.providers.list`
10. `agchain.models.providers.create`
11. `agchain.models.providers.update`

#### New metrics: `10 counters`, `6 histograms`

1. `platform.agchain.organization_model_providers.list.count`
2. `platform.agchain.organization_model_providers.credential.upsert.count`
3. `platform.agchain.organization_model_providers.credential.test.count`
4. `platform.agchain.organization_model_providers.credential.delete.count`
5. `platform.agchain.project_model_providers.list.count`
6. `platform.agchain.project_model_providers.credential.upsert.count`
7. `platform.agchain.project_model_providers.credential.test.count`
8. `platform.agchain.project_model_providers.credential.delete.count`
9. `platform.agchain.models.providers.create.count`
10. `platform.agchain.models.providers.update.count`

#### New structured logs: `6`

1. `agchain.organization_model_provider.credential_saved`
2. `agchain.organization_model_provider.credential_deleted`
3. `agchain.project_model_provider.credential_saved`
4. `agchain.project_model_provider.credential_deleted`
5. `agchain.models.provider.created`
6. `agchain.models.provider.updated`

### Locked Inventory Counts

#### Database

- New migrations: `3`
- Modified existing migrations: `0`

#### Backend

- New route modules: `2`
- New domain modules: `3`
- Modified backend modules: `4`
- New backend test modules: `3`
- Modified backend test modules: `1`

#### Frontend

- New top-level pages or routes: `1`
- Modified existing pages: `2`
- New visual components: `3`
- New hooks: `2`
- New service or library modules: `2`
- Modified existing components and hooks: `6`
- New frontend test modules: `2`
- Modified frontend test modules: `1`
- Retired mixed-scope modules: `2`

### Locked File Inventory

#### New files

- `supabase/migrations/20260405130000_agchain_provider_registry.sql`
- `supabase/migrations/20260405140000_agchain_organization_provider_credentials.sql`
- `supabase/migrations/20260405150000_agchain_project_provider_credentials.sql`
- `services/platform-api/app/api/routes/agchain_organization_model_providers.py`
- `services/platform-api/app/api/routes/agchain_project_model_providers.py`
- `services/platform-api/app/domain/agchain/provider_registry.py`
- `services/platform-api/app/domain/agchain/organization_model_providers.py`
- `services/platform-api/app/domain/agchain/project_model_providers.py`
- `services/platform-api/tests/test_agchain_provider_registry.py`
- `services/platform-api/tests/test_agchain_organization_model_providers.py`
- `services/platform-api/tests/test_agchain_project_model_providers.py`
- `web/src/lib/agchainOrganizationModelProviders.ts`
- `web/src/lib/agchainProjectModelProviders.ts`
- `web/src/hooks/agchain/useOrganizationModelProviders.ts`
- `web/src/hooks/agchain/useProjectModelProviders.ts`
- `web/src/components/agchain/models/AgchainProviderCredentialsTable.tsx`
- `web/src/components/agchain/models/AgchainProviderCredentialModal.tsx`
- `web/src/components/agchain/models/AgchainProviderRegistryForm.tsx`
- `web/src/pages/agchain/settings/AgchainOrganizationAiProvidersPage.tsx`
- `web/src/pages/agchain/settings/AgchainOrganizationAiProvidersPage.test.tsx`
- `web/src/pages/admin/AgchainAdminModelsPage.test.tsx`

#### Modified files

- `services/platform-api/app/api/routes/agchain_models.py`
- `services/platform-api/app/domain/agchain/model_registry.py`
- `services/platform-api/app/domain/agchain/__init__.py`
- `services/platform-api/app/main.py`
- `services/platform-api/tests/test_agchain_models.py`
- `web/src/router.tsx`
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

## Frozen Provider Credential Scope Contract

The organization provider page must resolve global credential state by `(organization_id, provider_slug)`.

The project models page must resolve effective credential state by `(project_id, provider_slug)` with fallback to the active organization credential for the same provider when no local override exists.

The provider pages must resolve row grouping and modal form composition from `agchain_provider_registry.provider_category` and `agchain_provider_registry.credential_form_kind`, not from hard-coded frontend provider maps.

The organization and project credential tables must persist encrypted structured payloads keyed by provider form kind rather than a single `api_key` string column.

`credential/test` must accept the same payload shape as `credential` save, but it must never persist payload data, never mutate row status, and never become a prerequisite for `Save` or `Update`.

Do not implement AGChain provider credential reads or writes by reusing `user_api_keys`, `connect_model_key`, `disconnect_model_key`, generic `/secrets`, or deployment `ENV`. Those seams are explicitly the wrong ownership model for this product contract.

Do not add personal fallback, cross-project copy behavior, or any inheritance path beyond `organization default -> project override` in this tranche.

Do not use `agchain_model_targets` as the organization or project page list spine. `agchain_model_targets` remains the curated admin registry of provider-model rows. The organization and project pages read provider registry rows plus organization/project credential rows only.

## Explicit Risks Accepted In This Plan

1. Legacy `user_api_keys` rows remain in the database for unrelated surfaces in this tranche; this plan only removes them from the AGChain models pages.
2. Provider deletion is not part of this tranche; registry growth is required, but destructive provider removal remains out of scope.
3. Providers that are not credential-configurable may still appear in the registry, but the organization and project pages only expose credential controls for configurable providers.
4. This revision locks the exact `basic_api_key` form from the PDF reference, but non-basic Azure/AWS/Vertex field lists still depend on follow-on provider-specific references even though their backend seam is accounted for here.

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked API surface in this plan exists exactly as specified.
2. The locked traces, metrics, and structured logs in this plan exist exactly as specified.
3. The three locked database migrations exist exactly as specified.
4. `agchain_provider_registry` is the live runtime provider-definition source of truth and `model_provider_catalog.py` is retired.
5. `agchain_provider_registry` also owns `provider_category` plus `credential_form_kind`, and both provider pages render from that metadata rather than hard-coded frontend lists.
6. `/app/agchain/settings/organization/ai-providers` is backed by organization-scoped global credentials rather than `user_api_keys`, generic `/secrets`, or deployment `ENV`.
7. `/app/agchain/models` is backed by project-local overrides plus organization fallback rather than `user_api_keys`.
8. The organization and project credential tables persist encrypted structured payloads rather than a single hard-coded `api_key` string shape.
9. The provider pages implement the locked `basic_api_key` modal contract from `E:/agchain models- doc 1.pdf`, including external `Test key` / `Save` state-message behavior and close-on-save behavior.
10. `/app/agchain/models` no longer mounts any model-target CRUD or health-inspector behavior.
11. `/app/agchain-admin/models` no longer presents as a placeholder and does not expose key management.
12. The locked inventory counts in this plan match the actual created, modified, and retired files.

## Task 1: Add The Provider Registry Migration

**File(s):** `supabase/migrations/20260405130000_agchain_provider_registry.sql`

**Step 1:** Create `public.agchain_provider_registry` with `provider_slug` as the primary key plus provider metadata, `provider_category`, `credential_form_kind`, supported auth kinds, defaults, and sort order.
**Step 2:** Seed the migration with the current known provider rows that today live in `model_provider_catalog.py`.
**Step 3:** Add the foreign-key relationship from `agchain_model_targets.provider_slug` to `agchain_provider_registry.provider_slug`.

**Test command:** `cd supabase && supabase db reset`
**Expected output:** Reset succeeds and `agchain_provider_registry` exists with seeded provider rows and valid `agchain_model_targets` references.

**Commit:** `db: add agchain provider registry`

## Task 2: Add The Organization And Project Provider Credential Migrations

**File(s):** `supabase/migrations/20260405140000_agchain_organization_provider_credentials.sql`, `supabase/migrations/20260405150000_agchain_project_provider_credentials.sql`

**Step 1:** Create `public.agchain_organization_provider_credentials` with foreign keys to `public.agchain_organizations.organization_id` and `public.agchain_provider_registry.provider_slug`.
**Step 2:** Create `public.agchain_project_provider_credentials` with foreign keys to `user_projects.project_id` and `agchain_provider_registry.provider_slug`.
**Step 3:** Add encrypted structured credential-payload fields, stored form-kind metadata, timestamps, and uniqueness on `(organization_id, provider_slug)` for global rows and `(project_id, provider_slug)` for local override rows.
**Step 4:** Keep both migrations free of any automatic copy from `user_api_keys` or generic `/secrets`.

**Test command:** `cd supabase && supabase db reset`
**Expected output:** Reset succeeds and both credential tables exist with the expected keys and constraints.

**Commit:** `db: add agchain organization and project provider credentials`

## Task 3: Add Failing Backend Tests For Provider Registry Growth

**File(s):** `services/platform-api/tests/test_agchain_provider_registry.py`, `services/platform-api/tests/test_agchain_models.py`

**Step 1:** Write pytest coverage that expects `GET /agchain/models/providers` to read persisted provider rows with `provider_category` and `credential_form_kind`.
**Step 2:** Add pytest coverage that expects `POST /agchain/models/providers` and `PATCH /agchain/models/providers/{provider_slug}` to require AGChain admin auth and accept the locked category/form metadata.
**Step 3:** Add assertions that admin model-target payloads no longer include user credential state.

**Test command:** `cd services/platform-api && pytest -q tests/test_agchain_provider_registry.py tests/test_agchain_models.py`
**Expected output:** Failing assertions for missing provider-registry persistence and missing create/update behavior.

**Commit:** `test: add agchain provider registry backend coverage`

## Task 4: Implement The Provider Registry Backend And Retire The Static Catalog

**File(s):** `services/platform-api/app/domain/agchain/provider_registry.py`, `services/platform-api/app/api/routes/agchain_models.py`, `services/platform-api/app/domain/agchain/model_registry.py`, `services/platform-api/app/domain/agchain/__init__.py`, `services/platform-api/tests/test_agchain_provider_registry.py`, `services/platform-api/tests/test_agchain_models.py`, `services/platform-api/app/domain/agchain/model_provider_catalog.py`

**Step 1:** Implement registry list, create, update, and provider-lookup helpers in `provider_registry.py`, including `provider_category` and `credential_form_kind`.
**Step 2:** Change `agchain_models.py` so provider-list reads, provider creation, and provider updates all use the persisted registry and preserve the new metadata.
**Step 3:** Replace `model_registry.py` provider validation lookups so model-target CRUD reads from the persisted registry, not the static catalog.
**Step 4:** Remove runtime imports of `model_provider_catalog.py` and retire that file.
**Step 5:** Re-run the targeted backend tests until they pass.

**Test command:** `cd services/platform-api && pytest -q tests/test_agchain_provider_registry.py tests/test_agchain_models.py`
**Expected output:** Registry tests pass and no runtime path still depends on `model_provider_catalog.py`.

**Commit:** `feat: move agchain provider definitions into registry persistence`

## Task 5: Add Failing Backend Tests For Organization And Project Provider Credentials

**File(s):** `services/platform-api/tests/test_agchain_organization_model_providers.py`, `services/platform-api/tests/test_agchain_project_model_providers.py`

**Step 1:** Write pytest coverage for the four new `/agchain/organizations/{organization_id}/model-providers` endpoints, including grouped category/form metadata in the list response.
**Step 2:** Write pytest coverage for the four `/agchain/projects/{project_id}/model-providers` endpoints, including `Not set`, `Set`, and `Inherited` effective states.
**Step 3:** Add assertions that a project override takes precedence over an organization credential and that deleting the override returns the row to `Inherited` when a global credential exists.
**Step 4:** Add assertions that `credential/test` validates a payload without persisting it on either scope and without changing table state.
**Step 5:** Add assertions that `credential` save succeeds even when no test was run and still succeeds after a failed test.

**Test command:** `cd services/platform-api && pytest -q tests/test_agchain_organization_model_providers.py tests/test_agchain_project_model_providers.py`
**Expected output:** Failing assertions for missing organization- and project-scoped provider credential endpoints and missing inherited-state logic.

**Commit:** `test: add organization and project model provider credential coverage`

## Task 6: Implement The Organization And Project Credential Backend

**File(s):** `services/platform-api/app/domain/agchain/organization_model_providers.py`, `services/platform-api/app/api/routes/agchain_organization_model_providers.py`, `services/platform-api/app/domain/agchain/project_model_providers.py`, `services/platform-api/app/api/routes/agchain_project_model_providers.py`, `services/platform-api/app/domain/agchain/__init__.py`, `services/platform-api/app/main.py`, `services/platform-api/tests/test_agchain_organization_model_providers.py`, `services/platform-api/tests/test_agchain_project_model_providers.py`

**Step 1:** Implement organization-provider list, credential save, credential test, and credential delete helpers using `agchain_provider_registry` plus `agchain_organization_provider_credentials`, reading `provider_category` and `credential_form_kind` from the registry.
**Step 2:** Implement project-provider effective list, credential save, credential test, and credential delete helpers using `agchain_provider_registry`, `agchain_organization_provider_credentials`, and `agchain_project_provider_credentials`, reading `provider_category` and `credential_form_kind` from the registry.
**Step 3:** Use `require_organization_membership` for organization list reads, `require_organization_permission(user_id, organization_id, "organization.settings.manage")` for organization credential mutations, `require_project_access` for project list reads, and `require_project_write_access` for project credential mutations.
**Step 4:** Persist encrypted structured credential payloads keyed by `credential_form_kind`, and make both `credential/test` endpoints accept the same payload shape without persisting it.
**Step 5:** Mount the eight new organization- and project-scoped endpoints in `main.py`.
**Step 6:** Add the locked traces, metrics, and structured logs without emitting secret material.

**Test command:** `cd services/platform-api && pytest -q tests/test_agchain_organization_model_providers.py tests/test_agchain_project_model_providers.py`
**Expected output:** Organization and project credential tests pass and prove `Not set`, `Set`, and `Inherited` behavior end to end.

**Commit:** `feat: add organization defaults and project overrides for agchain provider credentials`

## Task 7: Move The Existing Registry Workspace To The Admin Page

**File(s):** `web/src/pages/admin/AgchainAdminModelsPage.tsx`, `web/src/components/agchain/models/AgchainModelsTable.tsx`, `web/src/components/agchain/models/AgchainModelInspector.tsx`, `web/src/components/agchain/models/AgchainModelsToolbar.tsx`, `web/src/hooks/agchain/useAgchainModels.ts`, `web/src/lib/agchainModels.ts`, `web/src/lib/agchainModelProviders.ts`, `web/src/components/agchain/models/AgchainProviderRegistryForm.tsx`, `web/src/pages/admin/AgchainAdminModelsPage.test.tsx`

**Step 1:** Rebuild `AgchainAdminModelsPage.tsx` using the current split-pane models workspace as the starting structure.
**Step 2:** Remove credential actions from that stack and insert `AgchainProviderRegistryForm` for provider create/edit metadata, including `provider_category` and `credential_form_kind`.
**Step 3:** Narrow `useAgchainModels`, `agchainModels.ts`, and `agchainModelProviders.ts` to admin registry semantics only.
**Step 4:** Add admin page tests that cover provider creation, provider editing, category/form metadata, curated model-target CRUD, and the absence of secret-entry UI.

**Test command:** `cd web && npm run test -- src/pages/admin/AgchainAdminModelsPage.test.tsx`
**Expected output:** The admin page test passes and the page renders the registry workspace instead of the placeholder.

**Commit:** `feat: move agchain model registry workspace to admin page`

## Task 8: Add The Organization Providers Page And Simplify The Project Models Page

**File(s):** `web/src/router.tsx`, `web/src/pages/agchain/settings/AgchainOrganizationAiProvidersPage.tsx`, `web/src/pages/agchain/settings/AgchainOrganizationAiProvidersPage.test.tsx`, `web/src/hooks/agchain/useOrganizationModelProviders.ts`, `web/src/lib/agchainOrganizationModelProviders.ts`, `web/src/pages/agchain/AgchainModelsPage.tsx`, `web/src/pages/agchain/AgchainModelsPage.test.tsx`, `web/src/hooks/agchain/useProjectModelProviders.ts`, `web/src/lib/agchainProjectModelProviders.ts`, `web/src/components/agchain/models/AgchainProviderCredentialsTable.tsx`, `web/src/components/agchain/models/AgchainProviderCredentialModal.tsx`

**Step 1:** Replace the `/app/agchain/settings/organization/ai-providers` placeholder with `AgchainOrganizationAiProvidersPage` backed by `useOrganizationModelProviders`.
**Step 2:** Rewrite `AgchainModelsPage.tsx` to read the focused project and load effective provider rows through `useProjectModelProviders`.
**Step 3:** Keep the organization page and project page on the same table and centered-modal design by sharing `AgchainProviderCredentialsTable` and `AgchainProviderCredentialModal`, with the exact columns `Provider | Credential Status | Last Update | Actions` and category-grouped sections driven by `provider_category`.
**Step 4:** Implement the shared `basic_api_key` modal exactly as locked from `E:/agchain models- doc 1.pdf`: title `Configure API key`, provider identity plus docs link, read-only `Name` field, `API key` input, helper copy, `Test key`, and primary `Save` or `Update`.
**Step 5:** Show `Test key` results only as external state messages outside the modal, keep the modal open after test, and show one save-success state message after `Save`/`Update` regardless of the prior test outcome.
**Step 6:** Make the organization page support only `Not set -> Save` and `Set -> Update, Remove` inside the modal, and make the project page support only `Not set -> Save`, `Set -> Update, Remove`, and `Inherited -> Save`, where saving from `Inherited` creates a local override and removing that override returns the row to `Inherited` when a global credential exists.
**Step 7:** Rewrite both page tests around the locked `Not set`, `Set`, and `Inherited` behavior, the grouped-provider list, the external state-message behavior, and the absence of registry/editor behavior on the project page.

**Test command:** `cd web && npm run test -- src/pages/agchain/settings/AgchainOrganizationAiProvidersPage.test.tsx src/pages/agchain/AgchainModelsPage.test.tsx`
**Expected output:** Both provider page tests pass against the locked table, status, and action contract.

**Commit:** `feat: split agchain provider pages into organization and project scopes`

## Task 9: Retire The Remaining Mixed-Scope Credential Artifact

**File(s):** `web/src/components/agchain/models/AgchainModelCredentialPanel.tsx`

**Step 1:** Remove the now-unused embedded credential panel file after the admin page no longer imports it.
**Step 2:** Re-run the organization page, project page, and admin page suites to prove the new provider pages and the admin registry surface stand on their own.

**Test command:** `cd web && npm run test -- src/pages/agchain/settings/AgchainOrganizationAiProvidersPage.test.tsx src/pages/agchain/AgchainModelsPage.test.tsx src/pages/admin/AgchainAdminModelsPage.test.tsx`
**Expected output:** All three page suites pass and no embedded account-scoped credential UI remains.

**Commit:** `refactor: retire embedded agchain credential panel`

## Task 10: Run Full Contract Verification

**File(s):** `docs/plans/2026-04-05-agchain-project-and-admin-model-pages-implementation-plan.md`

**Step 1:** Run the migration, backend, and frontend verification commands from this plan.
**Step 2:** Compare the actual created, modified, and retired files against the locked inventory counts in this document.
**Step 3:** Verify the implemented page behavior against the locked acceptance contract before closing the work.
**Step 4:** Use `verification-before-completion` discipline before claiming the work complete.

**Test command:** `cd services/platform-api && pytest -q tests/test_agchain_provider_registry.py tests/test_agchain_models.py tests/test_agchain_organization_model_providers.py tests/test_agchain_project_model_providers.py && cd ../../web && npm run test -- src/pages/agchain/settings/AgchainOrganizationAiProvidersPage.test.tsx src/pages/agchain/AgchainModelsPage.test.tsx src/pages/admin/AgchainAdminModelsPage.test.tsx && npm run build`
**Expected output:** Backend tests pass, the organization page, project page, and admin page suites pass, and the web build completes without reintroducing mixed-scope surfaces.

**Commit:** `chore: verify agchain model surface split`

## Execution Handoff

Plan path: `docs/plans/2026-04-05-agchain-project-and-admin-model-pages-implementation-plan.md`

Before implementation starts:

1. Read this plan fully before touching code.
2. Follow the locked product, API, observability, and inventory decisions exactly.
3. Do not reintroduce a duplicate provider-definition seam or rebuild the admin page from zero.
4. If any locked decision proves wrong during implementation, stop and revise this plan before continuing.

## Revision Summary

**Evaluation cross-checked:** `evaluating-plan-before-implementation`, `blind-implementation-review`, `addressing-evaluation-findings`
**Artifact revised:** `docs/plans/2026-04-05-agchain-project-and-admin-model-pages-implementation-plan.md`

### Cross-Check Results

- Verified accurate: `3`
- Verified inaccurate: `0`
- Partially accurate: `0`

### Findings Fixed

- Duplicate provider-definition seam -> runtime provider definitions are now locked to `agchain_provider_registry` only, and `model_provider_catalog.py` is retired after cutover.
- Credential ownership seam -> provider credentials are now locked to `organization default -> project override`, not project-only or user-scoped storage.
- Missing visual contract -> the organization page and project page now lock exact table columns, exact status labels, and exact state-based actions, including `Inherited`.
- Admin health seam ambiguity -> `POST /agchain/models/{model_target_id}/refresh-health` is now explicitly left out of scope instead of silently depending on an implicit organization selector that does not exist on the global admin route.
- Organization credential migration ambiguity -> the migration now names `public.agchain_organizations.organization_id` as the exact foreign-key target.
- Shared UI primitive drift -> the shared provider table and modal are now locked to neutral component names instead of project-only names.
- Underbuilt admin registry -> admin scope now explicitly includes provider creation plus curated model-target growth, not just edit-only seeded rows.
- Missing reference-form contract -> the common provider modal is now locked against `E:/agchain models- doc 1.pdf`, including category grouping, external `Test key` / `Save` state messages, and the exact `basic_api_key` field constitution.
- Single-string credential seam -> the save/test contract now uses `credential_payload` plus `credential_form_kind` so non-basic Azure/AWS/Vertex forms do not force a second backend rewrite.

### Cascading Changes

- Platform API surface now covers both the organization global-default seam and the project local-override seam.
- Frontend inventory counts now include the organization AI providers page while preserving reuse of the admin-facing models workspace.
- File inventory and tasks were re-locked to reflect the org/global plus project/local provider split, neutral shared UI primitives, the PDF-derived `basic_api_key` modal contract, and the exact `Inherited` state behavior.

### Ready for re-evaluation

This revision incorporates the newly agreed organization-default plus project-override credential model, the PDF-derived common provider form contract, and the generalized backend payload seam needed for non-basic provider variants. It is ready for a fresh approve/reject pass against that updated product contract.
