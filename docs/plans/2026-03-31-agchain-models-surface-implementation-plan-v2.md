# AG chain Models Surface Implementation Plan (v2)

**Goal:** Build and complete the AG chain level-1 `Models` surface as an operational provider-first configuration page backed by model-target-aware Supabase tables and `services/platform-api` routes with OpenTelemetry instrumentation, **plus inline credential connection** so a user can configure a provider, inspect the curated global model targets under it, and verify health without turning the top-level page into a registry workspace.

**Architecture:** Keep Supabase as the persisted system of record and `services/platform-api` as the only runtime/backend surface the AG chain web app talks to. The top-level `Models` page is a global provider-configuration surface, not a benchmark-local model assignment screen and not a top-level model-target workbench. The frontend derives recognizable provider rows by joining the supported provider catalog with grouped global model targets from the existing model routes; this amendment does not introduce new provider-scoped platform-api endpoints. A provider's configure/detail view is model-target-aware and exposes the curated global model targets under that provider, credential state, connect/disconnect behavior, and readiness/health checks. Credential connection writes API keys to `user_api_keys` via a new platform-api endpoint using `APP_SECRET_ENVELOPE_KEY` - not the legacy Deno edge function which only supports 4 providers and uses an incompatible key derivation. The existing `_load_api_key` decrypt path in `model_registry.py` is updated to use `decrypt_with_fallback` so it can read Python-encrypted rows written with either `APP_SECRET_ENVELOPE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`; it does not make Deno-encrypted rows readable through Python, and that pre-existing incompatibility is not resolved by this plan. Benchmark-specific evaluated-model and judge-model selection remains inside the benchmark workbench and is explicitly out of scope. Runtime-profile authoring, context/statefulness configuration, tool/sandbox policy design, run scheduling, and results comparison are also explicitly out of scope. This implementation uses a provider-catalog seam in `platform-api` inspired by `inspect_ai`: model targets reference a canonical `provider_slug` plus optional qualifier and provider-specific args, while the backend resolves probe behavior and supported-provider metadata through code-owned provider definitions. Observability is first-class: every route emits traces, metrics, and structured logs with AG chain-specific attributes and redaction rules.

**Tech Stack:** Supabase Postgres migrations and RLS, FastAPI, React + TypeScript, existing `platformApiFetch`, OpenTelemetry, pytest, Vitest, InspectAI-informed provider registry patterns.

**Plan Type:** Hybrid feature-build + correction plan.
**Status:** v2 - correcting v1 defects, adding credential connection, amending the top-level UI contract to a provider-first configuration surface, and completing remaining verification.
**Original Author:** Codex (v1, 2026-03-26)
**v2 Author:** Claude (2026-03-31)
**Date:** 2026-03-31
**Amendment Note:** 2026-03-31 - preserve the model-target-aware backend and platform-api contract, but change the top-level `/app/agchain/models` UI contract from a target-registry workspace to a provider-first configuration/settings surface.

---

## v1 Defects This Plan Corrects

The v1 plan landed Tasks 2-5 (backend tests, backend implementation, frontend tests, frontend implementation) but had three defects discovered during v2 audit:

### Defect 1: `load_model_detail` passes wrong arguments to `_normalize_row`

**File:** `services/platform-api/app/domain/agchain/model_registry.py`
**Line:** 222 (v1)

v1 code:
```python
return _normalize_row(sb, user_id, row), (checks.data or [])
```

`_normalize_row` signature (line 110): `def _normalize_row(row: dict[str, Any], credential_status: str) -> dict[str, Any]`

The call passes `sb` (Supabase client) as `row` and `user_id` (string) as `credential_status`. Every model detail fetch crashes with `KeyError` or `TypeError`.

**v2 fix (applied 2026-03-31):**
```python
credential_statuses = _resolve_credential_statuses(sb, user_id, [row])
credential_status = credential_statuses.get(row["model_target_id"], "missing")
checks = (
    _health_query(sb)
    .eq("model_target_id", model_target_id)
    .order("checked_at", desc=True)
    .limit(10)
    .execute()
)
return _normalize_row(row, credential_status), (checks.data or [])
```

### Defect 2: `refresh_model_target_health` calls nonexistent function

**File:** `services/platform-api/app/domain/agchain/model_registry.py`
**Line:** 455 (v1)

v1 code:
```python
credential_status = _resolve_credential_status(sb, user_id, row)
```

`_resolve_credential_status` (singular) does not exist. The function is `_resolve_credential_statuses` (plural, line 99) which takes a list and returns a dict. Every health refresh crashes with `NameError`.

**v2 fix (applied 2026-03-31):**
```python
credential_statuses = _resolve_credential_statuses(sb, user_id, [row])
credential_status = credential_statuses.get(row["model_target_id"], "missing")
```

### Defect 3: Models missing from AGChain primary rail

**File:** `web/src/components/agchain/AgchainLeftNav.tsx`

v1 omitted `Models` from the nav items. The page exists and is route-mounted at `/app/agchain/models` but was unreachable from the navigation.

**v2 fix (applied 2026-03-31):** Added `{ label: 'Models', icon: IconCpu, path: '/app/agchain/models' }` after Scorers. Updated `AgchainLeftNav.test.tsx` to assert the 9-item rail.

### Defect 4: Models page requires project focus guard - contradicts the global Models surface contract

**File:** `web/src/pages/agchain/AgchainModelsPage.tsx`

v1 code wraps the entire top-level Models page shell in a `useAgchainProjectFocus` guard:
```tsx
if (!focusLoading && !focusedProject) {
  return ( /* "Choose an AGChain project" prompt */ );
}
```

This contradicts the locked direction that `Models` is a global, non-benchmark-local surface. Under the v2 amendment, the same bug would still be wrong because the provider-first page must render without project focus. When the benchmarks API is unreachable or the focused project doesn't resolve, the page shows a dead-end guard instead of the Models page.

**v2 fix (not yet applied - requires implementation):** Remove `useAgchainProjectFocus` dependency from `AgchainModelsPage.tsx`. The page renders unconditionally. Hero section changes from project-scoped ("Selected AGChain project") to platform-scoped ("AGChain platform").

### Defect 5: No credential connection path on the Models page

**Scope:** The v1 plan created 6 endpoints for model-target CRUD and health probes but provided no way to connect an API key from the Models page. A user who creates a model target with `auth_kind: api_key` must navigate to a separate Settings surface to add credentials, then return to Models and hope the status resolves. This makes the page non-functional as a standalone provider-configuration surface.

**Existing credential infrastructure (verified):**

| Store | Table | Write Path | Crypto | Provider Coverage |
|-------|-------|-----------|--------|-------------------|
| API keys | `user_api_keys` | Deno edge function `user-api-keys/index.ts` | `SUPABASE_SERVICE_ROLE_KEY` via Deno `encryptApiKey()` | 4 only: `anthropic`, `openai`, `google`, `custom` |
| Provider connections | `user_provider_connections` | platform-api `/connections/connect` | `APP_SECRET_ENVELOPE_KEY` via Python `encrypt_with_context()` | Any provider string |

**Problems with existing paths:**
1. The Deno edge function only supports 4 providers. The Models catalog has 15.
2. The Deno edge function uses a different key derivation than Python (`SHA256(secret + "\n" + context + "\n")` vs `SHA256(secret + context)`). This is a known pre-existing incompatibility documented in the auth-secrets plan.
3. The `/connections/connect` endpoint writes to `user_provider_connections`, not `user_api_keys`. The model registry's `_resolve_api_key_statuses` reads from `user_api_keys`.

**Decrypt path issue:** `_load_api_key` at `model_registry.py:330` uses `decrypt_with_context(blob, SUPABASE_SERVICE_ROLE_KEY, context)` - single-key decrypt with the old key. If we write new rows via platform-api using `APP_SECRET_ENVELOPE_KEY`, `_load_api_key` must be updated to use `decrypt_with_fallback` (from `crypto.py`, already exists per the auth-secrets plan) so it can read Python-encrypted rows written with either:
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_SECRET_ENVELOPE_KEY`

Pre-existing Deno-encrypted rows remain a separate incompatible seam until they are replaced through the new platform-api credential flow.

**v2 fix (not yet applied - requires implementation):**
1. Add `POST /agchain/models/{model_target_id}/connect-key` - saves API key to `user_api_keys` via platform-api, encrypted with `APP_SECRET_ENVELOPE_KEY`, supports all 15 provider slugs.
2. Add `DELETE /agchain/models/{model_target_id}/disconnect-key` - removes API key for the model target's provider.
3. Update `_load_api_key` to use `decrypt_with_fallback` instead of single-key `decrypt_with_context`.
4. Add frontend credential connection component in the model inspector.
5. Add OTel instrumentation for both new endpoints.

---

## Implementation Checkpoint (v2)

### Implemented and verified (v1 Tasks 2-5 + v2 Defects 1-3):

- `services/platform-api/app/api/routes/agchain_models.py` - 6 v1 routes mounted; `connect-key` and `disconnect-key` are not yet added
- `services/platform-api/app/domain/agchain/__init__.py` - domain exports
- `services/platform-api/app/domain/agchain/model_provider_catalog.py` - 15 providers
- `services/platform-api/app/domain/agchain/model_registry.py` - list, detail (v2 fixed), create, update, refresh-health (v2 fixed); `_load_api_key` still needs the v2 decrypt-fallback update
- `services/platform-api/app/main.py` - router registered
- `services/platform-api/tests/test_agchain_models.py` - 14 v1 tests passing; v2 credential-route, auth-boundary, and `key_suffix` coverage not yet added
- `supabase/migrations/20260326170000_agchain_model_targets.sql` - migration applied, tables exist with 29 seeded model targets
- `web/src/components/agchain/models/AgchainModelsToolbar.tsx` - create/edit sheet with provider-driven form
- `web/src/components/agchain/models/AgchainModelsTable.tsx` - table component
- `web/src/components/agchain/models/AgchainModelInspector.tsx` - detail inspector with edit and refresh; v2 credential panel not yet mounted
- `web/src/hooks/agchain/useAgchainModels.ts` - data hook; v2 connect/disconnect actions not yet added
- `web/src/lib/agchainModels.ts` - API client; v2 connect/disconnect functions not yet added
- `web/src/pages/agchain/AgchainModelsPage.tsx` - page (needs v2 Defect 4 fix)
- `web/src/pages/agchain/AgchainModelsPage.test.tsx` - 3 tests passing (needs v2 Defect 4 update and v2 credential-panel assertions)
- `web/src/components/agchain/AgchainLeftNav.tsx` - Models in rail (v2 fixed)
- `web/src/components/agchain/AgchainLeftNav.test.tsx` - 9-item assertion (v2 fixed)

### Remaining v2 work:

1. **Fix Defect 4:** Remove project focus guard from `AgchainModelsPage.tsx`
2. **Update page test:** Remove project focus mock, remove guard test case, update hero text assertions
3. **Add credential backend surface:** Implement `POST /agchain/models/{model_target_id}/connect-key` and `DELETE /agchain/models/{model_target_id}/disconnect-key`
4. **Add credential compatibility fix:** Switch `_load_api_key` to `decrypt_with_fallback`
5. **Add credential test coverage:** Prove normal authenticated-user access, unauthenticated rejection, user-scoped delete behavior, and the `key_suffix` read contract
6. **Add credential UI:** Build `AgchainModelCredentialPanel`, wire it into the inspector, and refetch detail after connect/disconnect
7. **Visual + telemetry verification:** Confirm connect, disconnect, and post-connect refresh-health work end-to-end without leaking secrets into traces or logs

---

## Operational Preconditions

1. `APP_SECRET_ENVELOPE_KEY` must be configured in every environment that runs `services/platform-api` before the v2 credential routes are enabled or tested.
2. `services/platform-api/app/infra/crypto.py` must already expose `decrypt_with_fallback()` from the auth-secrets plan before Tasks v2-5 and v2-6 are considered complete.
3. If either prerequisite is missing, do not ship `connect-key` or `disconnect-key`; keep this plan incomplete and revise rollout rather than routing writes back through the Deno `user-api-keys` edge function.
4. End-to-end verification for this plan must exercise a platform-api-written credential plus a subsequent `refresh-health` call in an environment where `APP_SECRET_ENVELOPE_KEY` is present.

---

## Manifest

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/agchain/models/providers` | List the supported AG chain provider catalog for create/edit flows | Implemented (v1) |
| GET | `/agchain/models` | List global AG chain model targets that back the provider-first page and provider configure view | Implemented (v1) |
| GET | `/agchain/models/{model_target_id}` | Read one model target plus recent health-check history for the provider configure view | Implemented (v1), detail fix (v2) |
| POST | `/agchain/models` | Create a model target row validated against the provider catalog | Implemented (v1) |
| PATCH | `/agchain/models/{model_target_id}` | Update mutable model target metadata | Implemented (v1) |
| POST | `/agchain/models/{model_target_id}/refresh-health` | Run a provider-aware readiness/connectivity probe, persist result, and update current health | Implemented (v1), credential fix (v2) |
| POST | `/agchain/models/{model_target_id}/connect-key` | Save an API key for this model target's provider, encrypted via platform-api crypto | New (v2) |
| DELETE | `/agchain/models/{model_target_id}/disconnect-key` | Remove the API key for this model target's provider | New (v2) |

#### v1 endpoint contracts (implemented)

All 6 v1 endpoint contracts below are implemented and tested. See the original plan for full details.

#### v2 new endpoint contracts

`POST /agchain/models/{model_target_id}/connect-key`

- Auth: `require_user_auth`
- Request body:
  ```json
  {
    "api_key": "sk-proj-abc123..."
  }
  ```
- Behavior:
  - Load model target row to get `provider_slug` and `auth_kind`
  - Reject with `422` if `auth_kind` is not `api_key`
  - Reject with `404` if model target does not exist
  - Encrypt `api_key` with `encrypt_with_context(api_key, get_envelope_key(), "user-api-keys-v1")`
  - Extract `key_suffix` as last 4 characters of plaintext
  - Upsert into `user_api_keys` on conflict `(user_id, provider)`:
    - `user_id`: authenticated user
    - `provider`: model target's `provider_slug`
    - `api_key_encrypted`: encrypted value
    - `key_suffix`: last 4 chars
    - `is_valid`: `null` (unknown until next health check)
  - Return updated credential status for this model target
- Response `200`:
  ```json
  {
    "ok": true,
    "key_suffix": "c123",
    "credential_status": "ready"
  }
  ```
- Response `404`:
  ```json
  { "detail": "AG chain model target not found" }
  ```
- Response `422`:
  ```json
  { "detail": "Model target auth_kind is not api_key" }
  ```
- Touches:
  - `public.agchain_model_targets` (read - to resolve `provider_slug`, `auth_kind`)
  - `public.user_api_keys` (upsert)
- Crypto:
  - Uses `get_envelope_key()` from `app.infra.crypto` (same as auth-secrets plan)
  - Context string: `"user-api-keys-v1"` (matches existing context used by the Deno edge function and `_load_api_key`)
  - Does NOT call the Deno edge function. Does NOT use `SUPABASE_SERVICE_ROLE_KEY` for encryption.

`DELETE /agchain/models/{model_target_id}/disconnect-key`

- Auth: `require_user_auth`
- Request: no body
- Behavior:
  - Load model target row to get `provider_slug`
  - Reject with `404` if model target does not exist
  - Delete row from `user_api_keys` matching `(user_id, provider_slug)`
  - Return updated credential status (`missing`)
- Response `200`:
  ```json
  {
    "ok": true,
    "credential_status": "missing"
  }
  ```
- Response `404`:
  ```json
  { "detail": "AG chain model target not found" }
  ```
- Touches:
  - `public.agchain_model_targets` (read)
  - `public.user_api_keys` (delete)

#### v2 modified internal behavior

`_load_api_key` in `model_registry.py`

- Change: replace `decrypt_with_context(blob, SUPABASE_SERVICE_ROLE_KEY, context)` with `decrypt_with_fallback(blob, context)`
- Why: platform-api now writes `user_api_keys` rows encrypted with `APP_SECRET_ENVELOPE_KEY`, while older Python-written rows may still use `SUPABASE_SERVICE_ROLE_KEY`. `decrypt_with_fallback` tries `APP_SECRET_ENVELOPE_KEY` first, then falls back to `SUPABASE_SERVICE_ROLE_KEY`, so both Python-encrypted variants remain readable. This does not make Deno-encrypted rows readable through Python.
- Note: this reuses the `decrypt_with_fallback` function already implemented by the auth-secrets plan. No new crypto code.

#### v1 endpoint contracts (implemented, unchanged)

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
  - each item contains `model_target_id`, `label`, `provider_slug`, `provider_display_name`, `provider_qualifier`, `model_name`, `qualified_model`, `api_base_display`, `auth_kind`, `credential_status`, nullable `key_suffix`, `enabled`, `supports_evaluated`, `supports_judge`, `capabilities`, `health_status`, `health_checked_at`, `last_latency_ms`, `probe_strategy`, `notes`, `created_at`, `updated_at`
- Touches:
  - `public.agchain_model_targets`
  - read-only joins/lookups into `public.user_api_keys`, `public.user_provider_connections` only for derived `credential_status` and nullable `key_suffix`
  - code-owned provider catalog for display metadata
- Credential status contract:
  - values in this phase: `ready`, `missing`, `invalid`, `disconnected`, `not_required`
  - this is derived for the requesting authenticated user, not as a global platform-wide readiness judgment
  - `key_suffix` is requester-scoped, nullable, and limited to the final 4 characters of an `api_key` credential; plaintext keys, encrypted blobs, and raw credential payloads are never returned

`GET /agchain/models/{model_target_id}`

- Auth: `require_user_auth`
- Response shape:
  - `model_target`
    - contains the same fields as a `GET /agchain/models` list item plus `last_error_code` and `last_error_message`
    - includes the same nullable requester-scoped `key_suffix` contract as the list endpoint
  - `recent_health_checks`
    - each item contains `health_check_id`, `status`, `probe_strategy`, `latency_ms`, `error_code`, `error_message`, `checked_at`
  - `provider_definition`
    - contains `provider_slug`, `display_name`, `supported_auth_kinds`, `default_probe_strategy`, `default_capabilities`, `supports_custom_base_url`, `supports_model_args`, `notes`
- Touches:
  - `public.agchain_model_targets`
  - `public.agchain_model_health_checks`
  - read-only credential readiness lookups as above, including nullable `key_suffix`
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
| Trace span | `agchain.models.connect_key` | `agchain_models.py:connect_model_key` | Measure credential save latency and encryption failures (v2) |
| Trace span | `agchain.models.disconnect_key` | `agchain_models.py:disconnect_model_key` | Measure credential removal latency (v2) |
| Metric counter | `platform.agchain.models.connect_key.count` | `agchain_models.py:connect_model_key` | Count API key connection attempts (v2) |
| Metric counter | `platform.agchain.models.disconnect_key.count` | `agchain_models.py:disconnect_model_key` | Count API key disconnection attempts (v2) |
| Structured log | `agchain.models.key_connected` | `agchain_models.py:connect_model_key` | Audit credential connection - provider_slug and key_suffix only, never the key itself (v2) |
| Structured log | `agchain.models.key_disconnected` | `agchain_models.py:disconnect_model_key` | Audit credential removal - provider_slug only (v2) |

Observability attribute rules:

- Allowed trace and metric attributes:
  - `provider_slug`, `provider_qualifier_present`, `auth_kind`, `supports_evaluated`, `supports_judge`, `enabled`, `health_status`, `credential_status`, `probe_strategy`, `result`, `http.status_code`, `filter.provider_slug_present`, `filter.compatibility`, `filter.health_status`, `row_count`, `latency_ms`
- Forbidden in trace or metric attributes:
  - raw API keys, encrypted credentials, raw `credential_source_jsonb`, raw `model_args_jsonb`, full `api_base`, user email, user id, full error payloads from providers, benchmark ids (this page is global)
- Structured logs may include:
  - `model_target_id`, operator `subject_id`, `provider_slug`, old vs new `health_status`, `probe_strategy`, normalized validation errors
- Structured logs must not include:
  - secrets, full base URLs with tokens, request headers, provider response bodies
- Observability proof distinction:
  - instrumentation presence: the locked spans, counters, histograms, and structured logs are emitted from the declared route/domain call sites
  - exporter plumbing: this plan reuses the existing `services/platform-api` OpenTelemetry export path and does not change exporter configuration
  - proof level required at completion: runtime observation of the locked connect/disconnect/refresh-health signals through the existing telemetry pipeline in the target environment, not merely local code instrumentation or passing unit tests
- No additional telemetry names beyond the locked surface may be introduced during implementation without revising this plan.

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
  - `auth_kind` check: `('none', 'api_key', 'oauth', 'service_account', 'custom')`
  - `probe_strategy` check: `('provider_default', 'http_openai_models', 'http_anthropic_models', 'http_google_models', 'custom_http', 'none')`
  - `health_status` check: `('healthy', 'degraded', 'error', 'unknown')`
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
- Enables RLS on both tables
- Grants: authenticated column-level `SELECT` only (excludes `credential_source_jsonb`), service_role full CRUD
- Indexes: `provider_slug_idx`, `health_status_idx`, `enabled_idx`, `health_checks_target_checked_at_idx`

### Edge Functions

No edge functions created or modified.

### Frontend Surface Area

**New pages:** `0`

**New components:** `4` (3 v1 + 1 v2)

| Component | File | Used by | Version |
|-----------|------|---------|---------|
| `AgchainModelsToolbar` | `web/src/components/agchain/models/AgchainModelsToolbar.tsx` | `AgchainModelsPage.tsx` | v1 path preserved; amended v2 to act as provider-first header/search controls |
| `AgchainModelsTable` | `web/src/components/agchain/models/AgchainModelsTable.tsx` | `AgchainModelsPage.tsx` | v1 path preserved; amended v2 to render provider-first rows rather than top-level target rows |
| `AgchainModelInspector` | `web/src/components/agchain/models/AgchainModelInspector.tsx` | `AgchainModelsPage.tsx` | v1 path preserved; amended v2 to act as the provider configure/detail surface |
| `AgchainModelCredentialPanel` | `web/src/components/agchain/models/AgchainModelCredentialPanel.tsx` | `AgchainModelInspector.tsx` | v2 |

**v2 provider-first UI contract:**

- The top-level `/app/agchain/models` page renders a recognizable provider list derived by joining `GET /agchain/models/providers` with grouped results from `GET /agchain/models`.
- Supported providers still render even when they currently have zero curated global model targets.
- Each top-level row shows provider identity, derived status, target count, minimal last-checked metadata, and a single `Configure` action.
- The first layer does not present a persistent model-target table-plus-inspector workspace.
- Choosing `Configure` opens a right-side provider configure panel attached to the Models page. Inline row expansion, full-page route takeover, and modal-over-modal flows are out of scope for this phase. File paths stay the same; the UI contract changes.
- The provider configure/detail view shows provider-scoped credential state for the current user plus the curated global model targets under that provider.
- Target-level actions such as `refresh-health`, create, and edit live inside the provider configure/detail view rather than at the first-page layer.
- No new provider-scoped platform-api endpoints are added in this amendment; provider rows are derived in the frontend from the existing provider catalog and model-target routes.

**Authoritative provider-row status precedence:**

- If a provider currently has zero curated global model targets, status is `no_targets`. This wins even if the provider exists in the catalog or stale credentials already exist for that provider.
- Otherwise, if any target under the provider has `credential_status` in `{invalid, disconnected}` or `health_status` in `{error, degraded}`, status is `needs_attention`.
- Otherwise, if at least one target under the provider has `credential_status` in `{ready, not_required}`, status is `configured`. A mix of `ready` and `missing` still resolves to `configured`.
- Otherwise, status is `not_configured`. Healthy targets with only `missing` credentials still resolve to `not_configured`.
- `last_checked_at` is the most recent non-null `health_checked_at` across the provider's curated targets; it is `null` when no target has ever been checked.

**v2 `AgchainModelCredentialPanel` interaction contract:**

- Renders inside the provider configure/detail view when the provider has at least one curated target with `auth_kind === 'api_key'`
- Shows current provider-scoped credential status: `ready` (with masked suffix `....c123`), `missing`, or `invalid`
- Shows one explicit scope sentence: "This credential applies to all targets under this provider for your account."
- Uses a credential anchor target id because the backend remains model-target-aware while credential scope stays `(user_id, provider_slug)`
- Credential anchor selection is deterministic: choose the first enabled curated target for that provider where `auth_kind === 'api_key'`, ordered by `label` ascending and then `model_target_id` ascending
- If no eligible `api_key` target exists, the anchor is `null` and the panel renders guidance only
- If create/edit flows, disablement, or auth-kind changes alter the eligible targets, recompute the anchor on the next refetch using the same rule
- Connect/disconnect actions must never target a non-`api_key` model target
- When `missing`: shows an API key input field (password type), a "Connect" button
- When `ready`: shows the masked suffix, a "Disconnect" button, and a "Replace" action that reveals the input
- "Connect" calls `POST /agchain/models/{id}/connect-key` with the plaintext key
- "Disconnect" calls `DELETE /agchain/models/{id}/disconnect-key`
- After connect/disconnect, the hook refetches provider rows and provider detail so credential status updates in both the provider summary and nested target detail
- The input field never displays a stored key - only the 4-char suffix is shown
- For providers without `api_key` targets, or provider detail anchored on non-API-key targets, the panel shows "Auth type: {auth_kind}. Configure in Settings / Connections." Inline connection for non-API-key auth kinds is out of scope for v2.

**New hooks:** `1`

| Hook | File | Used by |
|------|------|---------|
| `useAgchainModels` | `web/src/hooks/agchain/useAgchainModels.ts` | `AgchainModelsPage.tsx` |

**New libraries/services:** `1`

| Library | File | Used by |
|---------|------|---------|
| `agchainModels` | `web/src/lib/agchainModels.ts` | `useAgchainModels.ts` |

**New helper modules:** `1` (v2)

| Helper | File | Used by |
|--------|------|---------|
| `agchainModelProviders` | `web/src/lib/agchainModelProviders.ts` | `useAgchainModels.ts` |

**Modified pages:** `1`

| Page | File | What changes |
|------|------|--------------|
| `AgchainModelsPage` | `web/src/pages/agchain/AgchainModelsPage.tsx` | v1: replaced placeholder with table+inspector surface. v2 amendment: remove project focus guard and recast the top level into a provider-first configuration page. |

**Modified nav:** `1`

| Component | File | What changes |
|-----------|------|--------------|
| `AgchainLeftNav` | `web/src/components/agchain/AgchainLeftNav.tsx` | v2: add `Models` item with `IconCpu` after Scorers |

**New tests:** `3` (2 v1 + 1 v2)

| Test module | File | Covers |
|-------------|------|--------|
| Platform API route tests | `services/platform-api/tests/test_agchain_models.py` | Provider catalog, list, detail, create, update, refresh-health contracts |
| Page test | `web/src/pages/agchain/AgchainModelsPage.test.tsx` | Provider-first page shell, configure action, credential flow, and nested target detail |
| Provider derivation unit test | `web/src/lib/agchainModelProviders.test.ts` | Provider-row status precedence, `last_checked_at`, and deterministic credential-anchor selection |

**Modified tests:** `3`

| Test module | File | What changes |
|-------------|------|--------------|
| Platform API route tests | `services/platform-api/tests/test_agchain_models.py` | v2 amendment: add provider-wide credential-side-effect coverage plus connect/disconnect auth-boundary and redaction assertions |
| Page test | `web/src/pages/agchain/AgchainModelsPage.test.tsx` | v2 amendment: remove top-level target-workspace assumptions and assert provider-first configure flow |
| Nav test | `web/src/components/agchain/AgchainLeftNav.test.tsx` | v2: assert 9-item rail including Models |

---

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. Level-1 `Models` is a provider-first configuration surface backed by global AG chain model-target data, not a benchmark-local model picker.
2. The `Models` page does NOT require a focused AGChain project. It renders unconditionally.
3. Benchmark-local evaluated-model and judge-model selection is out of scope for this plan and remains part of the benchmark workbench's future `Models` subsection.
4. The AG chain web app must talk to `services/platform-api`; it must not read or write the new AG chain model tables directly from the browser.
5. Supabase remains the persisted system of record for this phase; the plan does not introduce a separate AG chain-only database.
6. This phase allows inline connect/disconnect only for `api_key` providers inside the provider configure/detail view; it does not create a generic cross-provider secrets-management console or non-API-key inline auth flows.
7. The first shipped `Models` surface must be provider-first and settings-like at the top level. No persistent table-plus-inspector workspace and no fake second rail is added at the first layer.
8. Health checks are lightweight readiness/probe checks, not full benchmark execution. They verify target reachability and credential readiness only.
9. Supported provider families are first-class runtime-owned metadata exposed by `platform-api`; creation/edit flows must validate against this provider catalog rather than accept arbitrary provider strings.
10. Sandbox configuration is not part of the level-1 `Models` page scope in this plan.
11. Runtime-policy-bundle comparison is a first-class AG chain comparison mode, but this page does not author or compare runtime profiles. It only provides the provider-first configuration surface and underlying curated model-target registry those later comparisons depend on.
12. This phase does not expose a delete action for model targets. Operators disable targets through `enabled` instead.
13. Credential connection is scoped to `(user_id, provider_slug)` in this phase, not to `model_target_id`. Connecting or disconnecting a credential affects all model targets for that provider for the current user.
14. The provider configure/detail view is model-target-aware: it may show multiple curated global model targets for one provider, and target-level readiness/health lives there rather than on the first-page shape.
15. This amendment does not introduce new provider-scoped platform-api endpoints. The top-level provider rows are derived from the existing provider catalog and model-target routes.
16. `Configure` opens a right-side provider configure panel attached to the Models page. Inline expansion, separate full-page subroutes, and modal takeovers are out of scope for this phase.
17. Provider-row status derivation and credential-anchor selection must follow the authoritative rules in `Frontend Surface Area`. Implementers may not improvise alternate precedence or anchor heuristics.
18. Provider-wide credential scope must be visible to the user in the configure panel copy and proven in tests; it may not remain an implicit backend-only behavior.

### Final Scope Lock

This implementation plan is final only for the following owned surface:

- global AG chain provider catalog
- provider-first configuration page for `/app/agchain/models`
- provider configure/detail view with underlying model-target list, credential state, and target actions
- model-target health/readiness inspection and probe refresh
- create/edit flows for curated global model targets inside the provider configure/detail view
- `Models` item in the AGChain primary rail

The following are explicitly excluded from this plan even if the resulting UI later links to them:

- benchmark-local evaluated-model selection
- benchmark-local judge-model selection
- workflow-time model/target selection during eval or benchmark setup
- runtime-profile or environment-profile authoring
- context-delivery, statefulness, persistence, memory, or compaction policy
- tool exposure, sandbox, approval, or retrieval policy design
- run launch, scheduling, campaign orchestration, or queue management
- results comparison, leaderboards, or profile-aware ranking logic

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. An authenticated user can open `/app/agchain/models` and see a provider-first configuration list fetched from `platform-api` - without requiring a focused AGChain project.
2. The page can load the supported provider catalog from `GET /agchain/models/providers` and combine it with the global model-target list from `GET /agchain/models`.
3. The top-level list renders recognizable provider rows with clear status derived by the locked precedence, minimal metadata, and one `Configure` action per row.
4. The top-level page does not render a persistent model-target table-plus-inspector workspace.
5. Choosing `Configure` opens a right-side provider configure/detail panel for that provider.
6. The provider detail/configure view shows provider-scoped credential state for the current user, includes explicit copy that the credential applies across that provider's targets for the current account, and never exposes plaintext or encrypted keys; the only credential-display field allowed back to the browser is masked `key_suffix`.
7. For providers with `api_key` targets, a user can connect an API key from the configure view and see the provider-scoped credential state change from `missing` to `ready`.
8. A user can disconnect an API key from the configure view and see the provider-scoped credential state revert to `missing`.
9. For providers with curated global model targets, the configure view lists those targets and shows target-level readiness, health, and metadata.
10. For a provider with multiple curated targets in mixed credential/health states, the top-level provider row resolves status using the locked precedence rules, and the credential panel selects the locked anchor target deterministically.
11. A superuser can create a new model target inside the provider configure/detail view and see it appear without a page reload.
12. A superuser can edit a model target inside the provider configure/detail view and see the updated values reflected there and in the provider summary.
13. A superuser can trigger `refresh-health` for a target from the configure view, which writes a history row and updates the target's current health fields using the locked provider seam. After connecting a key, the target can complete its health probe using the connected credential.
14. Each new backend route emits the locked trace span and structured log for its action.
15. No browser code performs direct Supabase CRUD against the new AG chain model tables.
16. `Models` appears in the AGChain primary rail and the nav test passes.

### Locked Platform API Surface

#### AG chain platform API endpoints: `8` (6 v1 + 2 v2)

1. `GET /agchain/models/providers` (v1)
2. `GET /agchain/models` (v1)
3. `GET /agchain/models/{model_target_id}` (v1)
4. `POST /agchain/models` (v1)
5. `PATCH /agchain/models/{model_target_id}` (v1)
6. `POST /agchain/models/{model_target_id}/refresh-health` (v1)
7. `POST /agchain/models/{model_target_id}/connect-key` (v2)
8. `DELETE /agchain/models/{model_target_id}/disconnect-key` (v2)

#### Edge functions: `0`

No edge functions created or modified. The Deno `user-api-keys` edge function is untouched. New credential writes go through platform-api only.

### Locked Observability Surface

#### Traces: `9` (7 v1 + 2 v2)

1. `agchain.models.providers.list` (v1)
2. `agchain.models.list` (v1)
3. `agchain.models.get` (v1)
4. `agchain.models.create` (v1)
5. `agchain.models.update` (v1)
6. `agchain.models.refresh_health` (v1)
7. `agchain.models.provider_probe` (v1)
8. `agchain.models.connect_key` (v2)
9. `agchain.models.disconnect_key` (v2)

#### Metrics: `7 counters` (5 v1 + 2 v2), `2 histograms` (v1)

1. `platform.agchain.models.providers.list.count` (v1)
2. `platform.agchain.models.list.count` (v1)
3. `platform.agchain.models.create.count` (v1)
4. `platform.agchain.models.update.count` (v1)
5. `platform.agchain.models.refresh_health.count` (v1)
6. `platform.agchain.models.list.duration_ms` (v1)
7. `platform.agchain.models.refresh_health.duration_ms` (v1)
8. `platform.agchain.models.connect_key.count` (v2)
9. `platform.agchain.models.disconnect_key.count` (v2)

#### Structured logs: `6` (4 v1 + 2 v2)

1. `agchain.models.created` (v1)
2. `agchain.models.updated` (v1)
3. `agchain.models.health_refreshed` (v1)
4. `agchain.models.provider_probe_failed` (v1)
5. `agchain.models.key_connected` (v2)
6. `agchain.models.key_disconnected` (v2)

### Locked Inventory Counts

#### Database

- New migrations: `1` (v1, applied)
- Modified existing migrations: `0`

#### Backend

- New platform-api route modules: `1` (v1)
- New backend domain modules: `3` (v1)
- Modified backend entrypoint files: `1` (v1)
- Modified backend domain modules: `1` (v2 - `model_registry.py` bug fixes + `_load_api_key` decrypt fallback)
- Modified backend route modules: `1` (v2 - `agchain_models.py` add connect-key/disconnect-key endpoints)

#### Frontend

- New top-level pages/routes: `0`
- Modified existing pages: `1` (`AgchainModelsPage.tsx` - v1 + v2)
- New visual components: `4` (3 v1 + 1 v2 - `AgchainModelCredentialPanel.tsx`)
- Modified visual components: `3` (v2 amendment - `AgchainModelsToolbar.tsx`, `AgchainModelsTable.tsx`, `AgchainModelInspector.tsx`)
- New hooks: `1` (v1)
- Modified hooks: `1` (v2 - `useAgchainModels.ts` add provider-row derivation plus connect/disconnect actions)
- New libs/services: `2` (1 v1 + 1 v2 helper)
- Modified libs/services: `1` (v2 - `agchainModels.ts` preserves connect/disconnect API functions; no new provider-scoped endpoint layer)
- Modified nav components: `1` (v2 - `AgchainLeftNav.tsx`)

#### Tests

- New backend test modules: `1` (v1)
- New frontend test modules: `2` (1 v1 + 1 v2 helper test)
- Modified existing test modules: `3` (v2 - `AgchainModelsPage.test.tsx`, `AgchainLeftNav.test.tsx`, `test_agchain_models.py`)

### Locked File Inventory

#### New files (v1)

- `supabase/migrations/20260326170000_agchain_model_targets.sql`
- `services/platform-api/app/api/routes/agchain_models.py`
- `services/platform-api/app/domain/agchain/__init__.py`
- `services/platform-api/app/domain/agchain/model_provider_catalog.py`
- `services/platform-api/app/domain/agchain/model_registry.py`
- `services/platform-api/tests/test_agchain_models.py`
- `web/src/components/agchain/models/AgchainModelsToolbar.tsx`
- `web/src/components/agchain/models/AgchainModelsTable.tsx`
- `web/src/components/agchain/models/AgchainModelInspector.tsx`
- `web/src/hooks/agchain/useAgchainModels.ts`
- `web/src/lib/agchainModels.ts`
- `web/src/pages/agchain/AgchainModelsPage.test.tsx`

#### Modified files (v1)

- `services/platform-api/app/main.py`

#### New files (v2)

- `web/src/components/agchain/models/AgchainModelCredentialPanel.tsx` (Defect 5 - credential connection UI)
- `web/src/lib/agchainModelProviders.ts` (v2 tightening - pure provider-row derivation and credential-anchor helper)
- `web/src/lib/agchainModelProviders.test.ts` (v2 tightening - direct mixed-state and credential-anchor derivation coverage)

#### Modified files (v2)

- `services/platform-api/app/api/routes/agchain_models.py` (Defect 5 - add connect-key + disconnect-key endpoints, add OTel signals)
- `services/platform-api/app/domain/agchain/model_registry.py` (Defect 1 + 2 fixes + Defect 5 `_load_api_key` decrypt fallback)
- `services/platform-api/tests/test_agchain_models.py` (Defect 5 - add connect-key + disconnect-key test coverage plus provider-wide side-effect assertions)
- `web/src/components/agchain/AgchainLeftNav.tsx` (Defect 3 - add Models to rail)
- `web/src/components/agchain/AgchainLeftNav.test.tsx` (Defect 3 - 9-item assertion)
- `web/src/components/agchain/models/AgchainModelsToolbar.tsx` (v2 amendment - simplify top-level controls for provider-first configuration)
- `web/src/components/agchain/models/AgchainModelsTable.tsx` (v2 amendment - render provider-first rows and `Configure` action)
- `web/src/components/agchain/models/AgchainModelInspector.tsx` (v2 amendment - repurpose into provider configure/detail surface and mount credential panel)
- `web/src/hooks/agchain/useAgchainModels.ts` (Defect 5 + v2 amendment - consume provider-row helper and keep connectKey + disconnectKey actions)
- `web/src/lib/agchainModels.ts` (Defect 5 - preserve connectModelKey + disconnectModelKey API functions; no new provider-scoped endpoints)
- `web/src/pages/agchain/AgchainModelsPage.tsx` (Defect 4 + v2 amendment - remove project focus guard and render provider-first configuration page)
- `web/src/pages/agchain/AgchainModelsPage.test.tsx` (Defect 4 + v2 amendment - remove guard test, remove top-level registry-workspace assumptions, assert provider-first configure flow)

---

## Frozen Global Models Contract

The level-1 `Models` page is the AG chain platform's global provider-configuration surface. It is backed by global curated model targets, but those targets live underneath each provider's configure/detail view rather than as the top-level page shape. It is not the place where a benchmark chooses which models to run. That benchmark-local choice belongs to the benchmark workbench and must not be smuggled into this page through quick filters, ad hoc join tables, or benchmark-specific columns.

Do not implement benchmark assignment, benchmark eligibility matrices, or benchmark-specific judge/evaluated subsets in this plan. Those belong to a later benchmark workbench plan.

Do not implement runtime-profile authoring, runtime-policy-bundle comparison, or profile-aware leaderboards in this plan. Those are first-class AG chain capabilities, but they belong to later benchmark, runner, and results plans rather than to the provider-configuration surface.

Do not implement direct browser Supabase reads for these tables. The AG chain app must fetch through `platform-api` so auth, telemetry, and probe behavior stay inside owned runtime code.

Do not treat `provider_slug` as a free-text UI label. It is a backend-validated identity that resolves into provider display metadata, default probe behavior, and supported auth/config capabilities.

Do not gate the Models page behind a project focus guard. The page is global. It renders unconditionally.

Do not turn the first layer into a persistent model-target table-plus-inspector workspace. The top-level page stays simple and provider-first; deeper target-level structure lives inside the provider configure/detail view.

---

## Explicit Risks Accepted In This Plan

1. Credential readiness is derived from existing connection/key surfaces rather than from a dedicated AG chain secrets UI. That keeps this phase focused but means some provider-specific readiness logic may still be approximate until a later credential-integration plan hardens it.
2. Health checks remain lightweight probe-style checks, not full token-usage or completion-call validations. A model target may be marked reachable yet still fail under full benchmark execution.
3. The provider catalog is code-owned in `platform-api` during this phase rather than persisted in a dedicated table. This avoids premature admin/catalog complexity but means provider additions require backend code changes until a later catalog-management plan exists.
4. Sandbox-related capability metadata may be partial in this phase because the level-1 page does not yet own runner/tool execution configuration.
5. Provider credentials are deliberately scoped to `(user_id, provider_slug)` in this phase rather than to individual model targets. That simplifies the provider-first UX, but it does not support per-target credentials for different qualifiers, base URLs, or organizational contexts under the same provider.
6. Provider-row summary semantics are deliberately derived in the frontend from the provider catalog plus model-target endpoints rather than served from a dedicated provider-summary backend endpoint. That is acceptable at this phase's scale, but if provider-level summary logic becomes more complex later, the seam may need to move server-side.

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked API surface in this plan exists exactly as specified.
2. The locked API read contracts expose requester-scoped nullable `key_suffix` exactly as specified and never expose plaintext keys, encrypted blobs, or raw credential payloads.
3. The locked traces, metrics, and structured logs exist exactly as specified, including `agchain.models.connect_key` and `agchain.models.disconnect_key`, and they do not leak raw secrets.
4. `APP_SECRET_ENVELOPE_KEY` is present in the environment used for credential-route verification, and `_load_api_key` uses `decrypt_with_fallback` so Python-encrypted rows written with either `APP_SECRET_ENVELOPE_KEY` or `SUPABASE_SERVICE_ROLE_KEY` remain readable.
5. The new Supabase migration exists and produces the locked tables and policies.
6. The inventory counts in this plan match the actual set of created and modified files.
7. `/app/agchain/models` renders a live provider-first configuration list backed by `platform-api` without requiring a project focus guard, provider rows use the locked status precedence, and `Configure` opens the locked right-side provider detail/configure panel.
8. An authenticated user can connect an API key for an `api_key` provider from the configure view, see only a masked suffix, disconnect it, and see the provider-scoped credential state update without a full page reload.
9. After a key is connected, `refresh-health` can complete for a target under that provider using that credential and writes the locked health-check history update.
10. The backend test suite proves normal authenticated-user access, unauthenticated rejection, scoped credential deletion, and the `key_suffix` redaction contract.
11. The frontend verification proves provider rows render correctly, the locked status precedence is applied, `Configure` opens the right-side panel, and the provider detail/configure view exposes the underlying targets and readiness state.
12. Direct unit tests prove provider-row status derivation, `last_checked_at`, and deterministic credential-anchor selection through the locked mixed-state matrix.
13. The backend verification proves the practical provider-wide side effect: connecting or disconnecting through one eligible target changes credential readiness for other targets under the same provider for the same user.
14. No part of the new AG chain `Models` page performs direct browser CRUD against Supabase.
15. `Models` appears in the AGChain primary rail.

---

## v2 Remaining Tasks

v1 Tasks 1-5 are implemented. The following v2 tasks complete the surface.

### Task v2-1: Fix model registry domain bugs (DONE)

**File:** `services/platform-api/app/domain/agchain/model_registry.py`

**Applied 2026-03-31.** See Defect 1 and Defect 2 above for exact before/after code.

**Verification:** `cd services/platform-api && python -m pytest tests/test_agchain_models.py -q` - 14 passed.

### Task v2-2: Restore Models in AGChain primary rail (DONE)

**Files:** `web/src/components/agchain/AgchainLeftNav.tsx`, `web/src/components/agchain/AgchainLeftNav.test.tsx`

**Applied 2026-03-31.** Added `Models` item after Scorers. Updated test to assert 9-item locked order.

**Verification:** `cd web && npx vitest run src/components/agchain/AgchainLeftNav.test.tsx` - 1 passed.

### Task v2-3: Remove project focus guard from Models page and shift hero copy to provider-first configuration

**File:** `web/src/pages/agchain/AgchainModelsPage.tsx`

**Step 1:** Remove the `Link` import from `react-router-dom`.

**Step 2:** Remove the `useAgchainProjectFocus` import and its destructured usage (`focusedProject`, `focusLoading`).

**Step 3:** Remove the entire project focus guard block - the `if (!focusLoading && !focusedProject)` return that renders "Choose an AGChain project."

**Step 4:** Replace the project-scoped hero section:

Before:
```tsx
<p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Selected AGChain project</p>
<h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Models</h1>
<p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
  {(focusedProject?.benchmark_name ?? 'Selected project')} owns this models page. Model targets, provider
  readiness, and health checks stay scoped to the focused AGChain project or evaluation.
</p>
```

After:
```tsx
<p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">AGChain platform</p>
<h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Models</h1>
<p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
  Configure provider access and inspect the curated global model targets available under each provider.
</p>
```

**Step 5:** Verify the page component no longer imports or references `useAgchainProjectFocus`, `focusedProject`, `focusLoading`, or `Link`.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainModelsPage.test.tsx`
**Expected output:** Tests fail because the test still mocks `useAgchainProjectFocus` and asserts the older top-level copy. Fixed in Task v2-4.

**Commit:** `fix(agchain): remove project focus guard from provider configuration page`

### Task v2-4: Update Models page test for provider-first configuration shell

**File:** `web/src/pages/agchain/AgchainModelsPage.test.tsx`

**Step 1:** Remove the `useAgchainProjectFocusMock` variable and its `vi.mock('@/hooks/agchain/useAgchainProjectFocus')` block.

**Step 2:** Remove all `useAgchainProjectFocusMock.mockReturnValue(...)` calls from `beforeEach`.

**Step 3:** Remove the entire test case `it('routes users back toward the project registry when no AGChain project is available')`.

**Step 4:** In the remaining page render test, update the hero text assertion:

Before:
```typescript
expect(screen.getByText(/legal-10 owns this models page/i)).toBeInTheDocument();
```

After:
```typescript
expect(screen.getByText(/configure provider access/i)).toBeInTheDocument();
```

**Step 5:** Verify the test file no longer references `useAgchainProjectFocus` or `focusedProject`.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainModelsPage.test.tsx`
**Expected output:** The shell-level page tests pass; the fuller provider-first configure-flow assertions are added in Task v2-7.

**Commit:** `test(agchain): update models page test for provider-first shell`

### Task v2-5: Add connect-key and disconnect-key backend endpoints

**Files:**
- `services/platform-api/app/api/routes/agchain_models.py`
- `services/platform-api/app/domain/agchain/model_registry.py`

**Step 1:** Add Pydantic request model in `agchain_models.py`:

```python
class ConnectKeyRequest(BaseModel):
    api_key: str = Field(min_length=1)
```

**Step 2:** Add `connect_model_key()` domain logic in `model_registry.py` so the route layer keeps the existing v1 pattern of auth + OTel + response formatting only:

```python
def connect_model_key(*, user_id: str, model_target_id: str, api_key: str) -> dict[str, Any]:
    sb = get_supabase_admin()
    row = (
        sb.table("agchain_model_targets")
        .select("provider_slug, auth_kind")
        .eq("model_target_id", model_target_id)
        .maybe_single()
        .execute()
        .data
    )
    if not row:
        raise HTTPException(status_code=404, detail="AG chain model target not found")
    if row["auth_kind"] != "api_key":
        raise HTTPException(status_code=422, detail=f"Model target auth_kind is '{row['auth_kind']}', not 'api_key'")

    provider_slug = row["provider_slug"]
    key_suffix = api_key[-4:]
    encrypted = encrypt_with_context(api_key, get_envelope_key(), USER_API_KEYS_CONTEXT)

    sb.table("user_api_keys").upsert(
        {
            "user_id": user_id,
            "provider": provider_slug,
            "api_key_encrypted": encrypted,
            "key_suffix": key_suffix,
            "is_valid": None,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="user_id,provider",
    ).execute()

    return {"provider_slug": provider_slug, "key_suffix": key_suffix, "credential_status": "ready"}
```

**Step 3:** Add `disconnect_model_key()` domain logic in `model_registry.py`:

```python
def disconnect_model_key(*, user_id: str, model_target_id: str) -> dict[str, Any]:
    sb = get_supabase_admin()
    row = (
        sb.table("agchain_model_targets")
        .select("provider_slug")
        .eq("model_target_id", model_target_id)
        .maybe_single()
        .execute()
        .data
    )
    if not row:
        raise HTTPException(status_code=404, detail="AG chain model target not found")

    provider_slug = row["provider_slug"]
    sb.table("user_api_keys").delete().eq("user_id", user_id).eq("provider", provider_slug).execute()
    return {"provider_slug": provider_slug, "credential_status": "missing"}
```

**Step 4:** Add `POST /agchain/models/{model_target_id}/connect-key` route in `agchain_models.py` that delegates to the domain function:

```python
@router.post("/{model_target_id}/connect-key", summary="Connect an API key for a model target")
async def connect_model_key_route(
    model_target_id: UUID,
    body: ConnectKeyRequest,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.models.connect_key") as span:
        model_target_id_str = str(model_target_id)
        outcome = connect_model_key(user_id=auth.user_id, model_target_id=model_target_id_str, api_key=body.api_key)
        attrs = {"provider_slug": outcome["provider_slug"], "result": "ok"}
        set_span_attributes(span, attrs)
        models_connect_key_counter.add(1, safe_attributes(attrs))
        logger.info(
            "agchain.models.key_connected",
            extra={
                "model_target_id": model_target_id_str,
                "provider_slug": outcome["provider_slug"],
                "key_suffix": outcome["key_suffix"],
            },
        )
        return {"ok": True, "key_suffix": outcome["key_suffix"], "credential_status": outcome["credential_status"]}
```

**Step 5:** Add `DELETE /agchain/models/{model_target_id}/disconnect-key` route in `agchain_models.py` that delegates to the domain function:

```python
@router.delete("/{model_target_id}/disconnect-key", summary="Disconnect API key for a model target")
async def disconnect_model_key_route(
    model_target_id: UUID,
    auth: AuthPrincipal = Depends(require_user_auth),
):
    with tracer.start_as_current_span("agchain.models.disconnect_key") as span:
        model_target_id_str = str(model_target_id)
        outcome = disconnect_model_key(user_id=auth.user_id, model_target_id=model_target_id_str)
        attrs = {"provider_slug": outcome["provider_slug"], "result": "ok"}
        set_span_attributes(span, attrs)
        models_disconnect_key_counter.add(1, safe_attributes(attrs))
        logger.info(
            "agchain.models.key_disconnected",
            extra={"model_target_id": model_target_id_str, "provider_slug": outcome["provider_slug"]},
        )
        return {"ok": True, "credential_status": outcome["credential_status"]}
```

**Step 6:** Add the counter declarations at the top of `agchain_models.py` alongside the existing counters:

```python
models_connect_key_counter = meter.create_counter("platform.agchain.models.connect_key.count")
models_disconnect_key_counter = meter.create_counter("platform.agchain.models.disconnect_key.count")
```

**Step 7:** Update imports:

```python
# agchain_models.py
from app.domain.agchain.model_registry import (
    connect_model_key,
    create_model_target,
    disconnect_model_key,
    list_model_targets,
    list_supported_providers,
    load_model_detail,
    refresh_model_target_health,
    resolve_provider_definition,
    update_model_target,
)

# model_registry.py
from datetime import datetime, timezone
from app.infra.crypto import encrypt_with_context, get_envelope_key
```

Keep `get_supabase_admin` inside `model_registry.py`; do not import it into the route module for these v2 endpoints.

**Test command:** `cd services/platform-api && python -m pytest tests/test_agchain_models.py -q`
**Expected output:** Existing 14 tests pass. New connect/disconnect tests added in Task v2-6.

**Commit:** `feat(agchain): add connect-key and disconnect-key endpoints for model credentials`

### Task v2-6: Add backend tests for credential endpoints and fix _load_api_key decrypt

**Files:** `services/platform-api/tests/test_agchain_models.py`, `services/platform-api/app/domain/agchain/model_registry.py`

**Step 1:** Add route test for connect-key success using the normal authenticated `client` fixture, not `superuser_client`, and patch the route-imported domain function so the test matches the v1 route -> domain pattern:

```python
def test_connect_key_returns_masked_suffix_for_authenticated_user(client):
    with patch("app.api.routes.agchain_models.connect_model_key") as mock_connect:
        mock_connect.return_value = {
            "provider_slug": "openai",
            "key_suffix": "c123",
            "credential_status": "ready",
        }
        response = client.post(
            f"/agchain/models/{MODEL_ID}/connect-key",
            json={"api_key": "sk-test-abc123"},
        )

    assert response.status_code == 200
    assert response.json()["key_suffix"] == "c123"
    assert response.json()["credential_status"] == "ready"
    mock_connect.assert_called_once_with(
        user_id="user-1",
        model_target_id=MODEL_ID,
        api_key="sk-test-abc123",
    )
```

**Step 2:** Add an `unauthenticated_client` fixture in the same module and assert both credential routes reject requests without `require_user_auth`.

**Step 3:** Add route test for connect-key rejects non-`api_key` `auth_kind` using the normal authenticated `client` fixture:

```python
def test_connect_key_rejects_non_api_key_auth_kind(client):
    with patch(
        "app.api.routes.agchain_models.connect_model_key",
        side_effect=HTTPException(status_code=422, detail="Model target auth_kind is 'service_account', not 'api_key'"),
    ):
        response = client.post(
            f"/agchain/models/{MODEL_ID}/connect-key",
            json={"api_key": "sk-test-abc123"},
        )
    assert response.status_code == 422
```

**Step 4:** Add a route test for disconnect-key success using the normal authenticated `client` fixture by patching the route-imported domain function, and add a separate direct domain-function test in the same module to prove the delete is scoped to the current user plus provider:

```python
def test_disconnect_key_returns_missing_for_authenticated_user(client):
    with patch("app.api.routes.agchain_models.disconnect_model_key") as mock_disconnect:
        mock_disconnect.return_value = {
            "provider_slug": "openai",
            "credential_status": "missing",
        }
        response = client.delete(f"/agchain/models/{MODEL_ID}/disconnect-key")

    assert response.status_code == 200
    assert response.json()["credential_status"] == "missing"
    mock_disconnect.assert_called_once_with(user_id="user-1", model_target_id=MODEL_ID)


from app.domain.agchain.model_registry import disconnect_model_key


def test_disconnect_model_key_scopes_delete_to_current_user_and_provider():
    with patch("app.domain.agchain.model_registry.get_supabase_admin") as mock_get_sb:
        mock_sb = mock_get_sb.return_value
        mock_sb.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
            "provider_slug": "openai",
        }
        delete_chain = mock_sb.table.return_value.delete.return_value
        delete_chain.eq.return_value.eq.return_value.execute.return_value.data = []

        result = disconnect_model_key(user_id="user-1", model_target_id=MODEL_ID)

    assert result["credential_status"] == "missing"
    delete_chain.eq.assert_called_once_with("user_id", "user-1")
    delete_chain.eq.return_value.eq.assert_called_once_with("provider", "openai")
```

**Step 5:** Add a backend-facing test that proves provider-wide credential side effects. Connect or disconnect through one eligible target, then verify another target under the same `provider_slug` reflects the same credential readiness for that user. This must make the `(user_id, provider_slug)` scope impossible to misunderstand.

**Step 6:** Add a read-contract test that `GET /agchain/models/{model_target_id}` returns nullable `key_suffix` for the requesting user after a ready `api_key` credential exists, and explicitly does not return plaintext `api_key`, `api_key_encrypted`, or raw credential payloads.

**Step 7:** Update `_load_api_key` in `model_registry.py` to use `decrypt_with_fallback`, and replace the module-level crypto import instead of adding an inline import:

Before:
```python
from app.infra.crypto import decrypt_with_context

secret = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
return decrypt_with_context(row["api_key_encrypted"], secret, USER_API_KEYS_CONTEXT)
```

After:
```python
from app.infra.crypto import decrypt_with_fallback

return decrypt_with_fallback(row["api_key_encrypted"], USER_API_KEYS_CONTEXT)
```

**Test command:** `cd services/platform-api && python -m pytest tests/test_agchain_models.py -q`
**Expected output:** All tests pass including normal authenticated-user credential tests, unauthenticated rejection coverage, scoped disconnect coverage, provider-wide credential-side-effect coverage, and the `key_suffix` read-contract test.

**Commit:** `feat(agchain): test credential endpoints and fix _load_api_key decrypt fallback`

### Task v2-7: Recast the Models UI into a provider-first configuration surface

**Files:**
- `web/src/components/agchain/models/AgchainModelsToolbar.tsx` (modify)
- `web/src/components/agchain/models/AgchainModelsTable.tsx` (modify)
- `web/src/components/agchain/models/AgchainModelCredentialPanel.tsx` (new)
- `web/src/components/agchain/models/AgchainModelInspector.tsx` (modify)
- `web/src/pages/agchain/AgchainModelsPage.tsx` (modify)
- `web/src/pages/agchain/AgchainModelsPage.test.tsx` (modify)
- `web/src/hooks/agchain/useAgchainModels.ts` (modify)
- `web/src/lib/agchainModelProviders.ts` (new)
- `web/src/lib/agchainModelProviders.test.ts` (new)
- `web/src/lib/agchainModels.ts` (preserve existing API functions; add only UI-supporting types if needed)

**Step 1:** Create a pure helper module at `web/src/lib/agchainModelProviders.ts` that owns provider-row derivation, status precedence, `last_checked_at`, and deterministic credential-anchor selection. `useAgchainModels.ts` consumes this helper; the page, table, and inspector do not each re-implement the derivation logic.

**Step 2:** In `useAgchainModels.ts`, derive provider-first rows from the existing provider catalog plus the fetched global model targets by calling the helper module. Supported providers without any curated targets must still render at the top level. Use a derived provider-row shape along these lines:

```typescript
type AgchainProviderRow = {
  provider_slug: string;
  display_name: string;
  status: 'configured' | 'needs_attention' | 'not_configured' | 'no_targets';
  target_count: number;
  last_checked_at: string | null;
  credential_anchor_target_id: string | null;
  targets: AgchainModelTarget[];
};
```

Implement the provider-row status precedence and `last_checked_at` derivation exactly as defined in `Frontend Surface Area`. Do not invent alternate precedence, fallback statuses, or different `last_checked_at` heuristics.

Return provider-first state from the hook: provider rows, selected provider slug, selected provider row, and the existing connect/disconnect/refresh/create/update actions.

**Step 3:** Add direct unit tests in `web/src/lib/agchainModelProviders.test.ts` for the locked derivation matrix:
- provider with zero targets -> `no_targets`
- mixed healthy targets with only missing credentials -> `not_configured`
- one invalid/disconnected credential among otherwise healthy targets -> `needs_attention`
- one degraded/error target among otherwise ready targets -> `needs_attention`
- mixture of `ready` and `missing` -> `configured`
- no eligible `api_key` target -> `credential_anchor_target_id === null`
- multiple eligible `api_key` targets -> deterministic anchor by `label` ascending, then `model_target_id` ascending

**Step 4:** Rework `AgchainModelsPage.tsx`, `AgchainModelsToolbar.tsx`, and `AgchainModelsTable.tsx` so the top-level page is settings-like and provider-first:
- top-level hero remains `AGChain platform` / `Models`
- top-level body copy matches Task v2-3
- top-level list renders provider rows, not model-target rows
- the first layer shows provider identity, derived status, target count, last checked, and a single `Configure` action
- no persistent second column or always-open inspector is rendered at the first layer

Keep file paths unchanged; the component contracts change.

**Step 5:** Repurpose `AgchainModelInspector.tsx` into the provider configure/detail surface opened by the row `Configure` action. This must render as a right-side provider configure panel attached to the Models page. Inline expansion, modal takeover, and full-page route transitions are out of scope. The contract is:
- provider summary at the top
- credential panel below the summary
- curated global model targets for that provider listed underneath
- each target item shows `label`, `qualified_model`, auth readiness, health, and last checked
- target-level actions such as `refresh-health` and edit live here
- superuser-only create flow for a new model target under the provider also lives here

**Step 6:** Keep and adapt `AgchainModelCredentialPanel.tsx` so it is provider-scoped in the UI while still using the existing model-target-aware backend routes. The locked provider-first behavior is:
- the configure view labels the credential state as provider-wide for the current user
- the panel includes the explicit scope sentence from `Frontend Surface Area`: "This credential applies to all targets under this provider for your account."
- the panel uses the deterministic credential-anchor selection rule from `Frontend Surface Area` because the backend credential routes remain `model_target_id`-based
- when the provider has no `api_key` target available, the panel falls back to auth-kind guidance rather than inventing a new provider-scoped API route
- masked suffix remains the only credential-display field allowed back to the browser

**Step 7:** Inside the provider configure/detail view, show the curated global model targets under that provider. If a provider has multiple targets, they are shown here rather than at the first-page layer. The current top-level page does not attempt to present the whole target registry workspace.

**Step 8:** Update `AgchainModelsPage.test.tsx` to assert the provider-first contract:
- provider rows render at the first layer
- row action is `Configure`
- opening configure shows the provider detail/configure surface
- the configure surface exposes nested target details
- the configure surface displays the provider-wide credential-scope sentence
- connect/disconnect still works and only masked suffix is shown
- a mixed-state provider renders the locked top-level status and the locked credential anchor behavior remains stable after refetch
- the page no longer asserts a persistent table-plus-inspector workspace

**Test command:** `cd web && npx vitest run src/lib/agchainModelProviders.test.ts src/pages/agchain/AgchainModelsPage.test.tsx`
**Expected output:** The helper derivation tests and page tests both pass.

**Commit:** `feat(agchain): recast models page into provider-first configuration surface`

### Task v2-8: End-to-end visual verification

**Step 1:** Start `platform-api` and web dev server.

**Step 2:** Navigate to `/app/agchain/models` in the browser.

**Step 3:** Verify:
- hero section shows `AGChain platform` / `Models` and the provider-first configuration copy from Task v2-3
- the top-level page renders recognizable provider rows with status derived by the locked precedence and a single `Configure` action per row
- the first layer does not present a persistent target-registry workspace or always-open inspector
- clicking `Configure` opens the locked right-side provider configure/detail panel
- for `api_key` providers: the credential panel shows provider-scoped connection state, includes the explicit provider-wide scope sentence, allows connect/replace/disconnect, and only ever shows a masked suffix
- for `service_account`-only providers: the credential panel shows auth-kind guidance rather than an API-key input
- the provider detail/configure surface lists the curated global model targets underneath that provider and exposes target-level readiness, health, and metadata
- a provider with multiple curated targets in mixed states still resolves the top-level provider status and credential anchor using the locked rules
- triggering `refresh-health` from a target inside the configure view updates the target's current health state and health-check history

**Step 4:** Take a screenshot as visual evidence.

**Expected output:** The page is a provider-first configuration surface at the top level, with target-level detail and health actions available inside each provider's configure view.

## Verification Commands

```bash
cd services/platform-api && python -m pytest tests/test_agchain_models.py -q
cd web && npx vitest run src/lib/agchainModelProviders.test.ts
cd web && npx vitest run src/pages/agchain/AgchainModelsPage.test.tsx
cd web && npx vitest run src/components/agchain/AgchainLeftNav.test.tsx
```

Manual verification checklist:
1. Run the page in an environment where `APP_SECRET_ENVELOPE_KEY` is set for `services/platform-api`.
2. Open `/app/agchain/models`, confirm the top-level page renders provider rows with one `Configure` action each, and confirm the page does not present a persistent target-registry workspace.
3. Open a provider's configure view, confirm the panel states that the credential applies to all targets under that provider for the current account, connect an API key for an `api_key` provider, and confirm the panel shows only a masked suffix rather than plaintext or encrypted data.
4. Disconnect the key and confirm the provider-scoped credential state returns to missing across the provider's eligible targets.
5. Reconnect the key, trigger `refresh-health` for a target under that provider, and confirm the target records a new health-check row and updates current health fields.
6. In a provider with multiple curated targets in mixed states, confirm the top-level provider row resolves the locked status precedence and the credential anchor behavior remains deterministic.
7. Inspect traces and structured logs for `agchain.models.connect_key`, `agchain.models.disconnect_key`, and `agchain.models.refresh_health`; confirm `provider_slug` and `status` attributes are present, but raw API keys, encrypted blobs, request headers, and provider response bodies are absent.

## Execution Handoff

- Read this plan fully before starting.
- Follow the plan exactly. Do not improvise on locked decisions.
- Tasks v2-1 and v2-2 are already applied.
- Tasks v2-3 through v2-7 require code changes.
- Task v2-8 is visual verification only.
- Before Task v2-5, verify `APP_SECRET_ENVELOPE_KEY` is configured in the local/test environment you will use, and verify the target deployed environment has the same prerequisite before rollout.
- Treat `decrypt_with_fallback` from the auth-secrets plan as a hard prerequisite for Task v2-6. If it is absent, stop and revise the rollout rather than downgrading to single-key decrypt behavior.
- Do not modify other AGChain pages or their project focus guards.
- Do not modify `useAgchainProjectFocus`; only remove its import from the Models page.
- This amendment is frontend-contract only. Preserve the existing model-target-aware backend and `platform-api` surface as much as possible.
- Do not add new provider-scoped `platform-api` routes as part of this amendment. Derive provider rows from the existing provider catalog and model-target endpoints.
- Do not call the Deno `user-api-keys` edge function from the new credential endpoints. All credential writes go through `platform-api`.
- Do not modify the Deno `user-api-keys` edge function or `api_key_crypto.ts`.
- Do not expose plaintext credentials, encrypted blobs, or raw credential payloads in any API response, trace, metric attribute, or structured log. The only credential-display field allowed back to the browser is nullable `key_suffix`.
- If changes require touching files outside the locked inventory, stop and revise the plan.

