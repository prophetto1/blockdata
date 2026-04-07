# AGChain Models: Fully Defined API, OTel, and SQL Contract

## Summary
- Chosen functionality: `Models`, not `Datasets`.
- Product boundary: `Models` is a **global model registry** at `/app/agchain/models`, consistent with [agchain-platform-architecture.md](E:/writing-system/_agchain/docs/_essentials/platform/agchain-platform-architecture.md).
- Benchmark-scoped model selection stays in existing `agchain_benchmark_model_targets`; it is explicitly out of scope for this functionality.
- System of record: `public.agchain_model_targets` and `public.agchain_model_health_checks`.
- Inspect alignment: store a **constrained, explicit subset** of Inspect `GenerateConfig` in `generate_config_jsonb`; reject unknown keys rather than pretending to support full Inspect config.

## Public API / Types
```ts
type ProviderDefinition = {
  provider_slug: string
  display_name: string
  supports_custom_base_url: boolean
  supported_auth_kinds: ("none"|"api_key"|"oauth"|"service_account"|"custom")[]
  default_probe_strategy: "provider_default"|"http_openai_models"|"http_anthropic_models"|"http_google_models"|"custom_http"|"none"
  default_capabilities: CapabilitySet
  supports_model_args: boolean
  notes: string | null
}

type CapabilitySet = Partial<{
  chat: boolean
  tools: boolean
  json: boolean
  reasoning: boolean
  vision: boolean
}>

type CredentialSource =
  | {}
  | { source: "user_api_keys" }
  | { source: "user_provider_connections"; connection_type: string }

type GenerateConfigPhase1 = Partial<{
  max_retries: number
  timeout: number
  attempt_timeout: number
  max_connections: number
  system_message: string
  max_tokens: number
  top_p: number
  temperature: number
  stop_seqs: string[]
  frequency_penalty: number
  presence_penalty: number
  seed: number
  top_k: number
  cache: boolean
}>

type ModelTargetRow = {
  model_target_id: string
  label: string
  provider_slug: string
  provider_display_name: string
  provider_qualifier: string | null
  model_name: string
  qualified_model: string
  api_base_display: string | null
  auth_kind: string
  credential_status: "ready"|"missing"|"invalid"|"disconnected"|"not_required"
  enabled: boolean
  supports_evaluated: boolean
  supports_judge: boolean
  capabilities: CapabilitySet
  health_status: "healthy"|"degraded"|"error"|"unknown"
  health_checked_at: string | null
  last_latency_ms: number | null
  probe_strategy: string
  notes: string | null
  created_at: string
  updated_at: string
}

type ModelTargetDetailRow = ModelTargetRow & {
  api_base: string | null
  model_args_jsonb: Record<string, unknown>
  generate_config_jsonb: GenerateConfigPhase1
}

type HealthCheckRow = {
  health_check_id: string
  status: "healthy"|"degraded"|"error"|"unknown"
  checked_at: string
  latency_ms: number | null
  probe_strategy: string
  error_message: string | null
}
```

| Endpoint | Auth | Request | Response | Touches |
|---|---|---|---|---|
| `GET /agchain/models/providers` | `require_user_auth` | none | `{ items: ProviderDefinition[] }` | code-only provider catalog |
| `GET /agchain/models` | `require_user_auth` | `provider_slug?`, `compatibility?` = `evaluated|judge`, `health_status?`, `enabled?`, `search?`, `limit=50`, `offset=0` | `{ items: ModelTargetRow[], total, limit, offset }` | `agchain_model_targets`, `user_api_keys`, `user_provider_connections` |
| `GET /agchain/models/{model_target_id}` | `require_user_auth` | path UUID | `{ model_target: ModelTargetDetailRow, recent_health_checks: HealthCheckRow[], provider_definition: ProviderDefinition|null }` | `agchain_model_targets`, `agchain_model_health_checks`, `user_api_keys`, `user_provider_connections` |
| `POST /agchain/models` | `require_superuser` | `label`, `provider_slug`, `provider_qualifier?`, `model_name`, `qualified_model`, `api_base?`, `auth_kind`, `credential_source_jsonb`, `model_args_jsonb`, `generate_config_jsonb?`, `supports_evaluated`, `supports_judge`, `capabilities_jsonb`, `probe_strategy`, `notes?`, `enabled` | `{ ok: true, model_target_id }` | `agchain_model_targets` insert |
| `PATCH /agchain/models/{model_target_id}` | `require_superuser` | optional subset of POST fields except `provider_slug`, `model_name`, `qualified_model` | `{ ok: true, model_target_id }` | `agchain_model_targets` update |
| `POST /agchain/models/{model_target_id}/refresh-health` | `require_superuser` | none | `{ ok: true, health_status, latency_ms, checked_at, message, probe_strategy }` | `agchain_model_targets` update, `agchain_model_health_checks` insert, credential tables read |

Validation rules:
- `provider_slug` must resolve in the provider catalog.
- `auth_kind` must be in the provider’s `supported_auth_kinds`.
- `probe_strategy` must be one of the existing SQL enum values.
- `credential_source_jsonb` contract is exact:
  - `auth_kind="none"` -> `{}`
  - `auth_kind="api_key"` -> `{ "source": "user_api_keys" }`
  - `auth_kind in {"oauth","service_account","custom"}` -> `{ "source": "user_provider_connections", "connection_type": string }`
- `capabilities_jsonb` may only contain `chat`, `tools`, `json`, `reasoning`, `vision`; all values must be boolean; unknown keys are `422`.
- `generate_config_jsonb` may only contain keys from `GenerateConfigPhase1`; unknown keys are `422`.
- `GenerateConfigPhase1` value rules:
  - `max_retries >= 0`
  - `timeout`, `attempt_timeout`, `max_connections`, `max_tokens`, `top_k` are positive integers
  - `0 <= top_p <= 1`
  - `0 <= temperature <= 2`
  - `-2 <= frequency_penalty <= 2`
  - `-2 <= presence_penalty <= 2`
  - `stop_seqs` is an array of strings
  - `cache` is boolean only
- `credential_source_jsonb` is write-only and never returned from the API.

## OTel Requirements
| Type | Name | Emit location | Required attrs |
|---|---|---|---|
| Span | `agchain.models.providers.list` | `agchain_models.py:list_supported_providers_route` | `row_count` |
| Span | `agchain.models.list` | `agchain_models.py:list_models` | `row_count`, `filter.provider_slug_present`, `filter.compatibility`, `filter.health_status`, `latency_ms` |
| Span | `agchain.models.get` | `agchain_models.py:get_model` | `provider_slug`, `auth_kind`, `health_status`, `has_generate_config` |
| Span | `agchain.models.create` | `agchain_models.py:create_model` | `provider_slug`, `auth_kind`, `supports_evaluated`, `supports_judge`, `enabled`, `has_generate_config` |
| Span | `agchain.models.update` | `agchain_models.py:patch_model` | `enabled`, `auth_kind`, `probe_strategy`, `has_generate_config` |
| Span | `agchain.models.refresh_health` | `agchain_models.py:refresh_model_health` | `health_status`, `probe_strategy`, `result`, `latency_ms` |
| Span | `agchain.models.provider_probe` | `model_registry.py:_run_provider_probe` | `provider_slug`, `probe_strategy`, `http.status_code`, `result`, `latency_ms` |
| Counter | `platform.agchain.models.providers.list.count` | route | same safe attrs as span |
| Counter | `platform.agchain.models.list.count` | route | same safe attrs as span |
| Counter | `platform.agchain.models.create.count` | route | same safe attrs as span |
| Counter | `platform.agchain.models.update.count` | route | same safe attrs as span |
| Counter | `platform.agchain.models.refresh_health.count` | route | same safe attrs as span |
| Histogram | `platform.agchain.models.list.duration_ms` | route | same safe attrs as list span |
| Histogram | `platform.agchain.models.refresh_health.duration_ms` | route | same safe attrs as refresh span |
| Structured log | `agchain.models.created` | route | include `model_target_id`, `subject_id`, safe attrs |
| Structured log | `agchain.models.updated` | route | include `model_target_id`, `subject_id`, safe attrs |
| Structured log | `agchain.models.health_refreshed` | route | include `model_target_id`, `subject_id`, safe attrs |
| Structured log | `agchain.models.provider_probe_failed` | domain | include `provider_slug`, `probe_strategy`, failure class |

Attribute policy:
- Allowed in spans/metrics: `provider_slug`, `auth_kind`, `probe_strategy`, `health_status`, `credential_status`, `supports_evaluated`, `supports_judge`, `enabled`, `has_generate_config`, `row_count`, `limit`, `offset`, `latency_ms`, `http.status_code`, `result`.
- Forbidden in spans/metrics: `model_target_id`, `user_id`, `email`, `credential_source_jsonb`, decrypted secrets, raw headers, raw provider responses, `api_base`, `qualified_model`.
- Structured logs may include `model_target_id` and `subject_id`; they must never include decrypted secrets or raw credentials.

## SQL Requirements
- Preserve existing tables:
  - `public.agchain_model_targets`
  - `public.agchain_model_health_checks`
- Preserve existing benchmark-selection table and keep it out of scope:
  - `public.agchain_benchmark_model_targets`
- Add exactly one migration:
  - `supabase/migrations/20260331160000_agchain_model_generate_config_jsonb.sql`
- Migration effect on `agchain_model_targets`:
  - add `generate_config_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb`
  - add object-shape check so `jsonb_typeof(generate_config_jsonb) = 'object'`
- No new tables.
- No new indexes.
- No change to existing unique identity constraint on `(provider_slug, provider_qualifier, qualified_model, api_base)`.
- No change to existing `auth_kind`, `probe_strategy`, or `health_status` SQL check constraints.
- No change to `agchain_model_health_checks`.
- RLS remains enabled on both existing tables.
- `service_role` retains full table CRUD and is the only direct actor for `generate_config_jsonb`.
- Existing column-level `SELECT` grant to `authenticated` remains unchanged; `generate_config_jsonb` is exposed through platform-api, not direct browser SQL.

## Test Plan
- Backend route tests cover all 6 endpoints, including `generate_config_jsonb` create, update, detail readback, and validation rejection.
- Backend migration test proves the new column exists with default `{}` and object-only constraint.
- OTel tests assert the exact span/counter/histogram/log names above.
- Frontend tests update `AgchainModelDetail` typing and verify the detail fetch can render and edit `generate_config_jsonb` without changing list-row shape.

## Assumptions
- `Models` remains a global registry; project focus UI does not constrain backend list/create/update semantics.
- `generate_config_jsonb` is a constrained Inspect-aligned subset in this functionality; unsupported Inspect keys are rejected, not silently stored.
- Direct DB reads of model config from the browser are out of scope; platform-api is the sole supported read/write surface.

