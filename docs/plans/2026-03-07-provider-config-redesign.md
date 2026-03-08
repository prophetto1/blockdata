# Provider Configuration Redesign

## Problem

The current AI provider config supports one key per hardcoded provider. We need:
- Multiple custom/self-hosted endpoints (Ollama, vLLM, LM Studio, etc.)
- Model auto-discovery via `/v1/models`
- Enable/disable toggles without deleting config
- Platform-level keys (admin) vs user-level keys

## Design

Hybrid of Open WebUI's connection UX and LobeChat's typed data model.

### 1. Data Model

**New table: `provider_connections`**

```sql
create table provider_connections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id),

  -- Identity
  provider_key text not null,          -- 'anthropic', 'openai', 'custom-1', etc.
  display_name text not null,          -- 'Anthropic', 'My Ollama', etc.
  source text not null default 'builtin', -- 'builtin' | 'custom'

  -- Connection
  base_url text,                       -- null for builtins (use SDK default)
  auth_type text not null default 'bearer', -- 'bearer' | 'api_key' | 'none'
  key_suffix text,                     -- last 4 chars of stored key (display only)
  is_valid boolean,                    -- null = untested, true/false = test result

  -- Config
  enabled boolean not null default true,
  prefix_id text,                      -- namespace prefix e.g. 'ollama/'
  custom_headers jsonb,                -- optional custom headers
  default_model text,
  default_temperature numeric(3,2) default 0.3,
  default_max_tokens integer default 4096,

  -- Discovery
  discovered_models jsonb,             -- cached result of /v1/models
  last_discovery_at timestamptz,

  -- Meta
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

The actual API key is stored encrypted in `vault.secrets` (existing pattern from `user_api_keys`).

**Keep `user_api_keys`** for user-level overrides. When a user has their own key for a provider, it takes precedence over the platform connection.

**Keep `model_role_catalog` + `model_role_assignments`** unchanged. They reference `provider` + `model_id` which maps to `provider_connections.provider_key`.

### 2. Edge Functions

**`discover-models`** (new)
- Input: `{ connection_id }` or `{ base_url, api_key, auth_type }`
- Proxies `GET {base_url}/v1/models` (or `/api/tags` for Ollama)
- Returns `{ models: [{ id, name, owned_by }] }`
- Caches result in `provider_connections.discovered_models`

**`test-api-key`** (existing, extend)
- Add support for custom base URLs and auth types
- Return discovered models alongside validation result

**`user-api-keys`** (existing, unchanged)

### 3. Builtin Provider Seed Data

On first run or migration, seed `provider_connections` with builtins:

| provider_key | display_name | source  | base_url |
|-------------|-------------|---------|----------|
| anthropic   | Anthropic   | builtin | null     |
| openai      | OpenAI      | builtin | null     |
| google      | Google AI   | builtin | null     |
| voyage      | Voyage AI   | builtin | null     |
| cohere      | Cohere      | builtin | null     |
| jina        | Jina AI     | builtin | null     |

Builtins use their SDK's default base URL. Custom connections require `base_url`.

### 4. UI Components

#### SettingsAiOverview (refactored)

Grid of provider cards. Each card shows:
- Provider icon + name
- Connection status badge (Connected / Invalid / Not configured)
- Enable/disable toggle (right side)
- Click to navigate to detail form

Footer: **"+ Add Connection"** button opens AddConnectionModal.

#### AddConnectionModal (new)

Modal for adding custom connections:
- **Display Name** (text input)
- **Base URL** (text input, required for custom)
- **API Key** (sensitive input with show/hide)
- **Auth Type** dropdown: Bearer / API Key / None
- **Prefix ID** (optional, for model namespacing)
- **Custom Headers** (optional, JSON textarea)
- **"Verify & Discover"** button:
  - Tests the connection
  - Fetches `/v1/models`
  - Populates discovered models list below
- **Discovered Models** checklist (select which to enable)
- **Save** button

#### SettingsProviderForm (refactored)

Detail page for a single connection. Sections:

1. **Connection** — URL, key (with test button), status badge
2. **Discovered Models** — auto-fetched list with checkboxes, "Refresh" button
3. **Defaults** — model selector (from discovered list), temperature slider, max tokens
4. **Advanced** — prefix ID, custom headers, auth type
5. **Danger Zone** — delete connection (custom only; builtins can be disabled but not deleted)

### 5. Model Selector in Chat

The model badge in `RightRailChatPanel` ("Sonnet 4.5") becomes a dropdown populated from:
1. All enabled `provider_connections` where `enabled = true`
2. For each, show models from `discovered_models` (or hardcoded list for builtins)
3. Grouped by provider with prefix: `Anthropic > Claude Sonnet 4.5`, `My Ollama > llama3`

### 6. Migration Path

1. Create `provider_connections` table with seed data
2. Migrate existing `user_api_keys` data: for each row, create/update the matching `provider_connections` entry with `key_suffix`, `is_valid`, defaults
3. Keep `user_api_keys` working for user-level overrides
4. Update `SettingsAiOverview` to read from `provider_connections`
5. Update `SettingsProviderForm` to work with either builtin or custom connections
6. Add `AddConnectionModal`
7. Add `discover-models` edge function
8. Update chat model selector

### 7. What We Keep

- `PROVIDERS` array in `SettingsProviderForm.tsx` — used for builtin icon/description metadata only
- `user_api_keys` table — user-level key overrides
- `model_role_catalog` + `model_role_assignments` — role-based routing unchanged
- `test-api-key` edge function — extended, not replaced
- Existing provider form UX for key entry, temperature, max tokens

### 8. Implementation Order

1. DB migration + seed builtins
2. `discover-models` edge function
3. Refactor types (`ProviderConnection` type)
4. Refactor `SettingsAiOverview` (card grid with toggles)
5. `AddConnectionModal` component
6. Refactor `SettingsProviderForm` (detail page)
7. Chat model selector dropdown
