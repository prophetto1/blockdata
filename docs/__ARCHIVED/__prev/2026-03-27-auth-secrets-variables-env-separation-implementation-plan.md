# Auth, Secrets, Variables, and Env Separation Implementation Plan

**Goal:** Separate identity/auth concerns from secret storage and runtime configuration, make the frontend use one canonical user-facing secrets surface, and harden backend secret handling so sensitive user values are treated as secrets rather than a mix of “variables”, auth state, and deployment env.

**Architecture:** Keep hosted Supabase Auth as the identity and session authority. Keep `services/platform-api` as the app-owned secret control plane and trusted runtime resolution layer. Preserve `user_provider_connections` as the separate store for structured provider credentials. Make the canonical user-facing management surface `Settings / Secrets`, keep `/app/secrets` as a compatibility redirect for one phase, and do not introduce a frontend `Variables` menu in this phase. Harden the existing `user_variables` store into a route-only encrypted secret store, expose it through `/secrets`, and use a dedicated application encryption root secret instead of `SUPABASE_SERVICE_ROLE_KEY`.

**Tech Stack:** Supabase Postgres migrations, FastAPI, Supabase Python client, React + TypeScript, existing crypto helpers, OpenTelemetry, pytest, Vitest.

**Status:** Draft
**Author:** Codex
**Date:** 2026-03-27

## Manifest

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/secrets` | List authenticated user secret metadata | New |
| POST | `/secrets` | Create authenticated user secret from plaintext input and return metadata only | New |
| PATCH | `/secrets/{secret_id}` | Update metadata and optionally rotate plaintext secret value | New |
| DELETE | `/secrets/{secret_id}` | Delete authenticated user secret | New |
| GET | `/variables` | Compatibility alias for the current secret store | Existing - mark deprecated, mirror `/secrets` |
| POST | `/variables` | Compatibility alias for the current secret store | Existing - mark deprecated, mirror `/secrets` |
| PATCH | `/variables/{variable_id}` | Compatibility alias for the current secret store | Existing - mark deprecated, mirror `/secrets` |
| DELETE | `/variables/{variable_id}` | Compatibility alias for the current secret store | Existing - mark deprecated, mirror `/secrets` |
| GET | `/connections` | Read provider connection metadata | Existing - no contract changes |
| POST | `/connections/connect` | Save encrypted provider credentials | Existing - no contract changes |
| POST | `/connections/disconnect` | Revoke provider credential record | Existing - no contract changes |
| POST | `/connections/test` | Resolve and test a saved provider connection | Existing - no contract changes |
| POST | `/auth/oauth/attempts` | Track OAuth attempt lifecycle around hosted Supabase Auth | Existing - no contract changes |
| POST | `/auth/oauth/attempts/{attempt_id}/events` | Record OAuth callback and completion events | Existing - no contract changes |

#### New endpoint contracts

`GET /secrets`

- Auth: `require_user_auth`
- Request: no body
- Response: `{ "secrets": SecretMetadata[] }`
- Touches: `public.user_variables`
- Returns metadata only: `id`, `name`, `description`, `value_kind`, `value_suffix`, `created_at`, `updated_at`

`POST /secrets`

- Auth: `require_user_auth`
- Request: `{ "name": string, "value": string, "description"?: string | null, "value_kind"?: "secret" | "token" | "api_key" | "client_secret" | "webhook_secret" }`
- Response: `{ "secret": SecretMetadata }`
- Touches: `public.user_variables`
- Encrypts server-side before insert and never returns plaintext or ciphertext

`PATCH /secrets/{secret_id}`

- Auth: `require_user_auth`
- Request: `{ "name"?: string, "value"?: string, "description"?: string | null, "value_kind"?: string }`
- Response: `{ "secret": SecretMetadata }`
- Touches: `public.user_variables`
- When `value` is present, rotates encrypted storage and suffix metadata

`DELETE /secrets/{secret_id}`

- Auth: `require_user_auth`
- Request: no body
- Response: `{ "ok": true, "id": string }`
- Touches: `public.user_variables`

#### Modified endpoint contracts

`GET/POST/PATCH/DELETE /variables`

- Change: retain as compatibility aliases to the same secret-management implementation, emit deprecation response metadata, and stop describing the surface as “Variables” in user-facing responses or OpenAPI summaries.
- Why: the current backend already exposes `/variables`, but the mounted frontend does not use a `Variables` settings surface and the stored values are secret-valued rather than general-purpose non-secret config.

### Observability

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Trace span | `secrets.list` | `services/platform-api/app/api/routes/secrets.py:list_secrets` | Measure metadata-list latency and failures |
| Trace span | `secrets.create` | `services/platform-api/app/api/routes/secrets.py:create_secret` | Measure create latency and validation failures |
| Trace span | `secrets.update` | `services/platform-api/app/api/routes/secrets.py:update_secret` | Measure rotate/update latency and missing-row failures |
| Trace span | `secrets.delete` | `services/platform-api/app/api/routes/secrets.py:delete_secret` | Measure delete latency and missing-row failures |
| Trace span | `secrets.resolve` | `services/platform-api/app/domain/plugins/models.py:get_secret`, `services/pipeline-worker/app/shared/context.py:get_secret` | Measure runtime resolution source and misses |
| Metric | `platform.secrets.list.count` | `secrets.py:list_secrets` | Count list requests |
| Metric | `platform.secrets.change.count` | `secrets.py:create_secret`, `update_secret`, `delete_secret` | Count create, rotate, and delete actions |
| Metric | `platform.secrets.resolve.count` | runtime `get_secret()` implementations | Count runtime hits, env fallbacks, and misses |
| Structured log | `secrets.changed` | `secrets.py` create/update/delete handlers | Audit action and result without logging names or values |

Observability attribute rules:

- Allowed attributes: `action`, `result`, `value_kind`, `resolution_source`, `caller`, `http.status_code`
- Forbidden in trace or metric attributes: `user_id`, `email`, `secret_id`, secret names, suffixes, plaintext values, ciphertext, env keys, connection ids, OAuth attempt secrets, auth tokens
- Structured logs must not include plaintext values, ciphertext, secret names, or env key names

### Database Migrations

| Migration | Creates/Alters | Affects Existing Data? |
|-----------|----------------|------------------------|
| `20260327110000_user_secret_store_hardening.sql` | Hardens `public.user_variables` into a route-only secret store by revoking direct browser table access, preserving service-role access, retaining owner-bound RLS, and clarifying table comments/default semantics as secret storage | No data rewrite; existing rows remain intact |

### Edge Functions

No edge functions created or modified.

Existing Supabase functions and hosted Supabase Auth are reused as-is. This implementation stays in `platform-api`, the web app, and one additive database hardening migration.

### Frontend Surface Area

**Current mounted secret-management label:** `Secrets`

**Current mounted secret-management route:** `/app/secrets`

**Current mounted secret-management page state:** placeholder only

**Current mounted settings routes relevant to this plan:** `/app/settings/profile`, `/app/settings/themes`, `/app/settings/ai`, `/app/settings/model-roles`, `/app/settings/mcp`, `/app/settings/connections`

**Current frontend `Variables` settings/menu surface:** `0`

`Variables` exists only in flow-editor document structures today; it is not a mounted settings page, secrets page, or navigation label for secret management.

**New pages/routes:** `1`

| Page | File | Route |
|------|------|-------|
| `SettingsSecrets` | `web/src/pages/settings/SettingsSecrets.tsx` | `/app/settings/secrets` |

**New components:** `2`

| Component | File | Used by |
|-----------|------|---------|
| `SecretsTable` | `web/src/components/settings/SecretsTable.tsx` | `SettingsSecrets.tsx` |
| `SecretEditorDialog` | `web/src/components/settings/SecretEditorDialog.tsx` | `SettingsSecrets.tsx` |

**New libraries/services:** `1`

| File | Purpose |
|------|---------|
| `web/src/lib/secretsApi.ts` | Typed frontend client for `/secrets` CRUD and compatibility error handling |

**Modified pages:** `2`

| Page | File | What changes |
|------|------|--------------|
| `SecretsPage` | `web/src/pages/SecretsPage.tsx` | Replace placeholder with compatibility redirect to `/app/settings/secrets` |
| Router settings subtree | `web/src/router.tsx` | Mount `/app/settings/secrets` and keep `/app/secrets` compatibility path |

**Modified support files:** `6`

| File | What changes |
|------|--------------|
| `web/src/pages/settings/index.ts` | Export `SettingsSecrets` |
| `web/src/pages/settings/settings-nav.ts` | Add `Secrets` under settings navigation |
| `web/src/pages/settings/settings-nav.test.ts` | Verify `Secrets` appears and resolves correctly |
| `web/src/components/shell/nav-config.ts` | Remove standalone placeholder treatment and point `Secrets` to canonical settings route or redirect target |
| `web/src/components/shell/nav-config.test.ts` | Verify shell nav points to the canonical secrets surface |
| `web/src/components/common/useShellHeaderTitle.test.tsx` | Verify breadcrumb/title resolves `Settings / Secrets` |

## Pre-Implementation Contract

No major product, API, observability, auth-boundary, or terminology decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

## Locked Product Decisions

1. The current live frontend secret-management menu label is `Secrets`, not `Variables`.
2. There is no mounted frontend settings/menu surface named `Variables` for secret management today.
3. The canonical user-facing management surface in this phase is `Settings / Secrets` at `/app/settings/secrets`.
4. `/app/secrets` remains only as a compatibility redirect for one phase; it is not the long-term canonical route.
5. Hosted Supabase Auth remains the identity and session authority. Secret CRUD and secret storage do not move into Supabase Auth tables or APIs.
6. `Connections` remains a distinct product surface for structured provider credentials such as service-account JSON and connection metadata. It is not merged into `Secrets` in this phase.
7. `Environment variables` remain deployment/runtime configuration owned by the process environment and `.env`, not user-managed config rows.
8. The existing `public.user_variables` table is treated as the physical secret store for this phase; the product surface and API surface are canonicalized to `Secrets` without a risky table rename.
9. Secret encryption and decryption must stop using `SUPABASE_SERVICE_ROLE_KEY` as the encryption seed. A dedicated env var such as `APP_SECRET_ENVELOPE_KEY` becomes mandatory for the app-owned secret store.
10. Trusted runtime resolution order is: user secret hit, then env fallback, then empty string or explicit miss behavior. Browser code never resolves plaintext secret values from storage rows.

## Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. The frontend settings navigation visibly includes `Secrets`.
2. There is still no frontend settings/menu entry named `Variables` for secret management.
3. Visiting `/app/secrets` redirects to `/app/settings/secrets`.
4. The `Settings / Secrets` page can list, create, update, and delete authenticated user secrets through `platform-api`.
5. Secret list/detail responses return metadata only and never plaintext values or ciphertext blobs.
6. Direct browser table access to `public.user_variables` is no longer sufficient to read or mutate secret rows.
7. `ExecutionContext.get_secret()` in both `platform-api` and `pipeline-worker` resolves user-scoped secrets when a `user_id` is present and falls back to env only when no user secret exists.
8. `Connections` flows continue to work without being merged into `Secrets`.
9. OAuth login behavior is unchanged because auth remains owned by hosted Supabase Auth and the existing `auth_oauth_attempts` flow.
10. The dedicated application secret envelope env var is required and used for encrypt/decrypt, and `SUPABASE_SERVICE_ROLE_KEY` is no longer used as the crypto root for user secrets or provider connections.

## Locked Platform API Surface

### New authenticated user endpoints: `4`

1. `GET /secrets`
2. `POST /secrets`
3. `PATCH /secrets/{secret_id}`
4. `DELETE /secrets/{secret_id}`

### Existing endpoints deprecated as compatibility aliases: `4`

1. `GET /variables`
2. `POST /variables`
3. `PATCH /variables/{variable_id}`
4. `DELETE /variables/{variable_id}`

### Existing endpoints reused as-is: `6`

1. `GET /connections`
2. `POST /connections/connect`
3. `POST /connections/disconnect`
4. `POST /connections/test`
5. `POST /auth/oauth/attempts`
6. `POST /auth/oauth/attempts/{attempt_id}/events`

## Locked Observability Surface

### New traces: `5`

1. `secrets.list`
2. `secrets.create`
3. `secrets.update`
4. `secrets.delete`
5. `secrets.resolve`

### New metrics: `3`

1. `platform.secrets.list.count`
2. `platform.secrets.change.count`
3. `platform.secrets.resolve.count`

### New structured logs: `1`

1. `secrets.changed`

## Locked Inventory Counts

### Database

- New migrations: `1`
- Modified existing migrations: `0`

### Backend

- New route modules: `1`
- Modified existing backend modules: `8`

### Frontend

- New top-level pages/routes: `1`
- New visual components: `2`
- New frontend libraries/services: `1`
- Modified existing frontend files: `8`

### Tests

- New test modules: `3`
- Modified existing test modules: `4`

## Locked File Inventory

### New files

- `supabase/migrations/20260327110000_user_secret_store_hardening.sql`
- `services/platform-api/app/api/routes/secrets.py`
- `services/platform-api/tests/test_secrets.py`
- `web/src/lib/secretsApi.ts`
- `web/src/pages/settings/SettingsSecrets.tsx`
- `web/src/pages/settings/SettingsSecrets.test.tsx`
- `web/src/components/settings/SecretsTable.tsx`
- `web/src/components/settings/SecretEditorDialog.tsx`

### Modified files

- `services/platform-api/app/main.py`
- `services/platform-api/app/api/routes/variables.py`
- `services/platform-api/app/core/config.py`
- `services/platform-api/app/domain/plugins/models.py`
- `services/platform-api/app/infra/crypto.py`
- `services/platform-api/app/infra/connection.py`
- `services/pipeline-worker/app/shared/context.py`
- `services/pipeline-worker/app/shared/auth.py`
- `services/platform-api/tests/test_variables.py`
- `services/platform-api/tests/test_connections.py`
- `.env.example`
- `web/src/router.tsx`
- `web/src/pages/SecretsPage.tsx`
- `web/src/pages/settings/index.ts`
- `web/src/pages/settings/settings-nav.ts`
- `web/src/pages/settings/settings-nav.test.ts`
- `web/src/components/shell/nav-config.ts`
- `web/src/components/shell/nav-config.test.ts`
- `web/src/components/common/useShellHeaderTitle.test.tsx`

## Frozen Frontend Naming Contract

The current mounted frontend secret-management label is `Secrets`, via the shell navigation and `/app/secrets`. There is no mounted frontend settings page or navigation item named `Variables` for secret management.

Do not implement this by introducing a second competing menu label such as `Variables` while leaving `Secrets` in place. The product must converge on one user-facing secret-management name in this phase, and that name is `Secrets`.

## Explicit Risks Accepted In This Plan

1. The physical database table remains named `user_variables` for this phase even though the product/API surface is canonicalized to `Secrets`.
2. Compatibility aliases for `/variables` may temporarily preserve backend naming drift while callers migrate.
3. `Connections` remains a separate surface in this phase even though some users may think of some connection credentials as “secrets”.

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked API surface in this plan exists exactly as specified.
2. The locked traces, metrics, and structured logs exist exactly as specified.
3. The frontend has one canonical secret-management name and route target.
4. `Auth`, `Secrets`, `Connections`, and deployment `Env` each have distinct runtime ownership and are no longer conflated in the user-facing product surface or backend crypto model.
5. The inventory counts in this plan match the actual set of created and modified files.

## Task 1: Write Failing Backend Secret Route Tests

**File(s):** `services/platform-api/tests/test_secrets.py`, `services/platform-api/tests/test_variables.py`

**Step 1:** Create `test_secrets.py` with failing coverage for list, create, update, and delete against `/secrets`.
**Step 2:** Assert metadata-only responses and absence of plaintext/ciphertext fields in every response body.
**Step 3:** Update `test_variables.py` to lock the deprecation-alias behavior for `/variables`.
**Step 4:** Run the backend secret-route tests and confirm they fail before implementation.

**Test command:** `python -m pytest services/platform-api/tests/test_secrets.py services/platform-api/tests/test_variables.py -v`
**Expected output:** New `/secrets` tests fail because the route does not exist yet; updated `/variables` compatibility assertions fail until the alias behavior is implemented.

**Commit:** `test(secrets): add failing secret route coverage`

## Task 2: Add the Secret Store Hardening Migration

**File(s):** `supabase/migrations/20260327110000_user_secret_store_hardening.sql`

**Step 1:** Create the migration to revoke direct table privileges on `public.user_variables` from `anon` and `authenticated`.
**Step 2:** Preserve service-role CRUD access and keep owner-bound RLS in place.
**Step 3:** Add comments clarifying that `public.user_variables` is the physical encrypted secret store for this phase.
**Step 4:** Verify the migration appears in the migration list and that the table privileges match the locked contract.

**Test command:** `Supabase MCP: apply_migration(name="20260327110000_user_secret_store_hardening"), list_tables(schemas=["public"], verbose=true), list_migrations()`
**Expected output:** The migration is recorded, `public.user_variables` still exists, and direct authenticated privileges are no longer available beyond the locked contract.

**Commit:** `feat(secrets): harden secret store privileges`

## Task 3: Add the Dedicated Encryption Root Secret

**File(s):** `.env.example`, `services/platform-api/app/core/config.py`, `services/platform-api/app/infra/crypto.py`, `services/platform-api/app/infra/connection.py`

**Step 1:** Add `APP_SECRET_ENVELOPE_KEY=` to `.env.example` with a comment that it is mandatory for user secret and provider credential encryption.
**Step 2:** Add config parsing in `platform-api` for `APP_SECRET_ENVELOPE_KEY`.
**Step 3:** Update crypto call sites to require the dedicated envelope key instead of `SUPABASE_SERVICE_ROLE_KEY`.
**Step 4:** Update provider-connection decrypt paths to use the same dedicated envelope key.
**Step 5:** Add failing or updated tests that prove encryption/decryption uses the new key source.

**Test command:** `python -m pytest services/platform-api/tests/test_connections.py services/platform-api/tests/test_secrets.py -v`
**Expected output:** Tests pass using `APP_SECRET_ENVELOPE_KEY`; no user secret or provider-connection encryption path still reads the service-role key as its crypto seed.

**Commit:** `feat(secrets): split crypto root from supabase service role`

## Task 4: Implement the Canonical `/secrets` Backend Surface

**File(s):** `services/platform-api/app/api/routes/secrets.py`, `services/platform-api/app/api/routes/variables.py`, `services/platform-api/app/main.py`

**Step 1:** Create `secrets.py` with the locked request/response models and metadata-only CRUD handlers.
**Step 2:** Register the new router in `app/main.py` before the plugin catch-all.
**Step 3:** Rework `variables.py` into compatibility aliases or wrappers over the same service logic and mark the route summaries as deprecated.
**Step 4:** Add the locked traces, metrics, and structured log surface.
**Step 5:** Run the targeted tests until `/secrets` passes and `/variables` compatibility remains intact.

**Test command:** `python -m pytest services/platform-api/tests/test_secrets.py services/platform-api/tests/test_variables.py -v`
**Expected output:** All secret-route and compatibility tests pass with metadata-only responses.

**Commit:** `feat(secrets): add canonical secrets api surface`

## Task 5: Implement Trusted Runtime Secret Resolution

**File(s):** `services/platform-api/app/domain/plugins/models.py`, `services/pipeline-worker/app/shared/context.py`, `services/pipeline-worker/app/shared/auth.py`

**Step 1:** Update both `ExecutionContext.get_secret()` implementations so they resolve user-scoped secrets from `public.user_variables` when `user_id` is available.
**Step 2:** Keep env lookup as the fallback when the user-scoped secret does not exist.
**Step 3:** Teach `resolve_credentials()` to support an explicit secret reference form such as `$SECRET.NAME`, routed through `context.get_secret()`, while preserving `$ENV.*` behavior.
**Step 4:** Add tests for secret hit, env fallback, missing secret, and auth-config resolution paths.

**Test command:** `python -m pytest services/platform-api/tests/test_plugins.py services/platform-api/tests/test_connections.py -v`
**Expected output:** Runtime contexts resolve user secrets first, env fallback second, and connection auth configs can reference secrets without exposing plaintext to the browser.

**Commit:** `feat(secrets): wire runtime secret resolution`

## Task 6: Write the Failing Frontend Secrets Tests

**File(s):** `web/src/pages/settings/SettingsSecrets.test.tsx`, `web/src/pages/settings/settings-nav.test.ts`, `web/src/components/shell/nav-config.test.ts`, `web/src/components/common/useShellHeaderTitle.test.tsx`

**Step 1:** Add failing tests for a new `Settings / Secrets` route and breadcrumb.
**Step 2:** Add failing tests proving that `Secrets` appears in settings navigation.
**Step 3:** Add failing tests proving `/app/secrets` redirects to `/app/settings/secrets`.
**Step 4:** Add a negative assertion that no secret-management settings route or nav item named `Variables` is introduced.

**Test command:** `npm --prefix web run test -- src/pages/settings/SettingsSecrets.test.tsx src/pages/settings/settings-nav.test.ts src/components/shell/nav-config.test.ts src/components/common/useShellHeaderTitle.test.tsx`
**Expected output:** New tests fail because the canonical settings secrets surface is not mounted yet.

**Commit:** `test(secrets): add failing frontend secrets surface coverage`

## Task 7: Implement the Frontend Secrets Surface

**File(s):** `web/src/lib/secretsApi.ts`, `web/src/pages/settings/SettingsSecrets.tsx`, `web/src/components/settings/SecretsTable.tsx`, `web/src/components/settings/SecretEditorDialog.tsx`, `web/src/router.tsx`, `web/src/pages/SecretsPage.tsx`, `web/src/pages/settings/index.ts`, `web/src/pages/settings/settings-nav.ts`, `web/src/components/shell/nav-config.ts`

**Step 1:** Add `secretsApi.ts` for typed CRUD calls to `/secrets`.
**Step 2:** Build `SettingsSecrets.tsx` with metadata-only table, create/edit dialog, rotate flow, and delete flow.
**Step 3:** Mount `/app/settings/secrets` in the settings router and export the page from the settings index.
**Step 4:** Convert `SecretsPage.tsx` into a compatibility redirect to the canonical settings route.
**Step 5:** Update settings navigation and shell nav so the visible product language is consistently `Secrets`.
**Step 6:** Re-run the targeted frontend tests until all pass.

**Test command:** `npm --prefix web run test -- src/pages/settings/SettingsSecrets.test.tsx src/pages/settings/settings-nav.test.ts src/components/shell/nav-config.test.ts src/components/common/useShellHeaderTitle.test.tsx`
**Expected output:** The new settings secrets route renders, nav resolves correctly, and `/app/secrets` redirects.

**Commit:** `feat(secrets): add canonical settings secrets ui`

## Task 8: Verification Sweep

**File(s):** `docs/plans/2026-03-27-auth-secrets-variables-env-separation-implementation-plan.md`

**Step 1:** Run the targeted backend test suite for secrets, variables compatibility, connections, and plugin/runtime secret resolution.
**Step 2:** Run the targeted frontend test suite for the settings secrets surface and nav updates.
**Step 3:** Verify the migration state and table privileges in Supabase.
**Step 4:** Verify manually that `/app/secrets` redirects and `Settings / Secrets` works for an authenticated user.
**Step 5:** Compare the actual file inventory against the locked counts in this plan before declaring completion.

**Test command:** `python -m pytest services/platform-api/tests/test_secrets.py services/platform-api/tests/test_variables.py services/platform-api/tests/test_connections.py services/platform-api/tests/test_plugins.py -v && npm --prefix web run test -- src/pages/settings/SettingsSecrets.test.tsx src/pages/settings/settings-nav.test.ts src/components/shell/nav-config.test.ts src/components/common/useShellHeaderTitle.test.tsx`
**Expected output:** All targeted backend and frontend tests pass, and the actual implementation matches the locked surface in this plan.

**Commit:** `chore(secrets): verify auth secrets variables env separation`
