---
title: nango-integration
description: How Nango fits into the Blockdata platform as the OAuth and integration provider for marketplace connections.
---

## Role

Nango handles OAuth token acquisition, storage, and refresh for external service providers. When a user connects Google Drive, Slack, GitHub, or any other provider through the marketplace, Nango manages the credentials lifecycle. Blockdata never stores raw OAuth tokens directly.

## Architecture

```
User clicks "Connect" in Marketplace
    |
    v
provider-connections edge function
    |
    v
Nango OAuth flow (localhost:3003)
    |-- Redirects to provider (Google, Slack, etc.)
    |-- User authorizes
    |-- Nango stores encrypted tokens in _nango_connections
    |
    v
Callback to Blockdata
    |-- Registers connection in Supabase provider_connections table
    |-- Connection is now available to flow triggers and service functions
```

## Nango Database Schema

### `_nango_configs` (Provider Definitions)

Stores the OAuth client configuration for each provider integration.

| Column | Type | Purpose |
|---|---|---|
| `id` | int | Auto-increment PK |
| `unique_key` | varchar | Provider identifier (e.g., `google-drive`, `slack`) |
| `provider` | varchar | Provider template name |
| `oauth_client_id` | varchar | OAuth client ID |
| `oauth_client_secret` | text | Encrypted OAuth client secret |
| `oauth_scopes` | text | Requested OAuth scopes |
| `environment_id` | int | Environment reference |
| `display_name` | varchar | Human-readable provider name |
| `custom` | json | Provider-specific overrides |
| `missing_fields` | array | Fields not yet configured |

### `_nango_connections` (User Connections)

Stores active user connections with encrypted credentials.

| Column | Type | Purpose |
|---|---|---|
| `id` | int | Auto-increment PK |
| `provider_config_key` | varchar | FK to provider config |
| `connection_id` | varchar | User-facing connection identifier |
| `credentials` | json | Encrypted OAuth tokens (access, refresh) |
| `connection_config` | jsonb | Provider-specific connection settings |
| `metadata` | jsonb | User-defined metadata |
| `credentials_expires_at` | timestamptz | Token expiry for auto-refresh |
| `last_refresh_success` | timestamptz | Last successful token refresh |
| `last_refresh_failure` | timestamptz | Last failed refresh attempt |
| `refresh_attempts` | smallint | Consecutive refresh failures |
| `refresh_exhausted` | boolean | True when refresh retries are exhausted |
| `last_execution_at` | timestamptz | Last time the connection was used |
| `tags` | jsonb | User-defined tags for filtering |
| `end_user_id` | int | Links to end user record |

### `_nango_sync_configs` / `_nango_sync_jobs` / `_nango_syncs`

Nango can run background syncs that pull data from providers on a schedule. These tables track sync definitions and execution state. Currently unused but available for future data ingestion flows.

### Other Tables

| Table | Purpose |
|---|---|
| `_nango_accounts` | Organization/account management |
| `_nango_users` | Dashboard user accounts |
| `_nango_sessions` | Active sessions |
| `_nango_oauth_sessions` | In-flight OAuth flows |
| `_nango_environments` | Dev/prod environment separation |
| `_nango_environment_variables` | Per-environment secrets |
| `_nango_external_webhooks` | Webhook delivery config |
| `api_secrets` | Nango API key storage |
| `connect_sessions` | Connect UI session state |
| `end_users` | End user records for user-level connections |
| `on_event_scripts` | Post-connection event hooks |
| `plans` | Billing/plan metadata |
| `private_keys` | Encryption key management |

## Integration with Blockdata

### Marketplace Connection Flow

1. **Frontend** (`web/src/components/marketplace/`): User browses providers, clicks "Connect"
2. **Edge function** (`supabase/functions/provider-connections/`): Initiates OAuth via Nango API
3. **Nango** (`localhost:3003`): Manages OAuth redirect, token exchange, storage
4. **Callback**: Edge function registers connection in `provider_connections` table
5. **Usage**: Flow triggers and service functions retrieve tokens from Nango via API to authenticate external calls

### Nango API Endpoints

From Blockdata's edge functions, use the Nango API:

```typescript
// Create a connection (start OAuth flow)
POST http://localhost:3003/connection
{ "provider_config_key": "google-drive", "connection_id": "user-123-gdrive" }

// Get connection credentials (for use in flows)
GET http://localhost:3003/connection/{connection_id}?provider_config_key=google-drive
// Returns: { credentials: { access_token: "...", refresh_token: "..." } }

// List all connections for a provider
GET http://localhost:3003/connection?provider_config_key=google-drive
```

### Flow Trigger Integration

A Nango connection enables flow triggers like:

- **File watch**: Monitor a Google Drive folder for new files, trigger ingest flow
- **Webhook**: Receive Slack messages, trigger processing flow
- **Schedule + API**: Poll a GitHub repo on schedule, trigger sync flow

The trigger definition references a `connection_id`. At execution time, the pipeline-worker fetches current credentials from Nango, makes the API call, and writes results to `flow_executions`.

## Current State

- Nango server is running and healthy (v0.69.40)
- Database is migrated and empty (zero configs, zero connections)
- Redis is running with default config
- Elasticsearch is disabled (non-critical, only affects Nango's internal log viewer)
- Ready for provider configuration

## Next Steps

1. Configure initial providers in Nango (Google Drive, Slack, GitHub) via dashboard or API
2. Wire `provider-connections` edge function to use Nango's API for OAuth flow
3. Map Nango `connection_id` to Supabase `provider_connections` rows
4. Implement credential retrieval in pipeline-worker for authenticated task execution
