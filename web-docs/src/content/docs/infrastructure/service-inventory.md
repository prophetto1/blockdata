---
title: Infrastructure Service Inventory
description: Live inventory of all containerized services, database access, and credentials for the Blockdata development environment.
---

## Active Services

All services run as Docker containers on the Ubuntu development machine.

### Supabase (Hosted)

| Field | Value |
|---|---|
| Project | `dbdzzhshmigewyprahej.supabase.co` |
| Role | System of record. Auth, user config, service registry, job orchestration, flow definitions. |
| Access | Via Supabase dashboard, REST API, or `supabase` CLI |

### Kestra (`:8088`)

| Field | Value |
|---|---|
| Container | `kestra-kestra-1` |
| Image | `kestra/kestra:latest` |
| Ports | `8088` (UI), `8089` (internal API) |
| Dashboard | `admin@kestra.io` / `Kestra2026` |
| Role | Reference implementation only. Schema and UX patterns are studied, not depended on at runtime. |

**Kestra Postgres** (internal to Docker network):

| Field | Value |
|---|---|
| Container | `kestra-postgres-1` |
| Image | `postgres:16` |
| Host | `kestra-postgres-1:5432` (Docker-internal) |
| User / Pass | `kestra` / `k3str4` |
| Database | `kestra` |
| Tables | 21 tables. Key: `flows`, `executions`, `logs`, `metrics`, `triggers`, `flow_topologies`, `concurrency_limit` |

### Nango (`:3003`)

| Field | Value |
|---|---|
| Container | `nango-server` |
| Image | `nangohq/nango-server:hosted` |
| Version | `0.69.40` |
| Port | `3003` (mapped from internal `8080`) |
| Dashboard | `admin` / `1234` |
| Server URL | `http://localhost:3003` |
| Public URL | `http://localhost:3000` |
| Encryption Key | `KhqBJkKSyq5sZeArrHrX0Qgk2v/3SZ1Anl4mZ5jWvKY=` |
| Role | OAuth/integration provider. Handles token acquisition and refresh for marketplace connections. |

**Nango Postgres** (`localhost:5433`):

| Field | Value |
|---|---|
| Container | `nango-db` |
| Image | `postgres:16.0-alpine` |
| Host / Port | `localhost:5433` |
| User / Pass | `nango` / `nango` |
| Database / Schema | `nango` / `nango` |
| Tables | 30 tables |
| Key tables | `_nango_configs` (provider OAuth creds, 19 cols), `_nango_connections` (user connections, 23 cols), `_nango_sync_configs`, `_nango_sync_jobs`, `_nango_syncs` |
| Current state | Fresh instance, zero connections configured |

Key columns in `_nango_connections`:

| Column | Type | Purpose |
|---|---|---|
| `provider_config_key` | varchar | Maps to a provider config |
| `connection_id` | varchar | User-facing connection identifier |
| `credentials` | json | Encrypted OAuth tokens |
| `connection_config` | jsonb | Provider-specific connection settings |
| `metadata` | jsonb | User-defined metadata |
| `credentials_expires_at` | timestamptz | Token expiry for auto-refresh |
| `last_refresh_success` | timestamptz | Last successful token refresh |
| `tags` | jsonb | User-defined tags |

**Nango Redis** (`localhost:6380`):

| Field | Value |
|---|---|
| Container | `nango-redis` |
| Image | `redis:7.2.4` |
| Port | `6380` |
| Keyspace | Empty |
| Eviction | `noeviction` |
| Memory cap | None (default) |

### ArangoDB (Stopped)

| Field | Value |
|---|---|
| Container | `dazzling_dhawan` |
| Image | `arangodb:3.12` |
| Port | `8529` (when running) |
| User / Pass | `root` / `blockdata_dev` |
| Role | Future read-optimized projection store. Documents, blocks, annotations, parse artifacts. |
| Status | Stopped. Restart with `docker start dazzling_dhawan`. |

## Service Topology

```
Browser
  |
  +-- localhost:5174  -->  web/ (Vite dev server)
  +-- localhost:3003  -->  Nango (OAuth provider)
  +-- localhost:8088  -->  Kestra (reference only)
  +-- localhost:8529  -->  ArangoDB (stopped)
  |
  +-- Supabase hosted  -->  dbdzzhshmigewyprahej.supabase.co
        |                      (Postgres, Auth, Edge Functions, Storage)
        |
        +-- pipeline-worker (Python/FastAPI, local or Cloud Run)
        +-- conversion-service (Python/FastAPI, Cloud Run)
```

## Integration Points

### Nango + Marketplace

When a user connects an external service (Google Drive, Slack, GitHub) through the marketplace:

1. Frontend calls the `provider-connections` edge function
2. Edge function redirects to Nango's OAuth flow at `localhost:3003`
3. Nango handles the OAuth dance, stores encrypted tokens in `_nango_connections`
4. The connection is registered in Supabase's `provider_connections` table
5. Flow triggers and service functions use the Nango connection to authenticate API calls

### Kestra Schema + Supabase

Kestra's Postgres tables are the reference model for Blockdata's flow runtime tables. The pattern (JSONB + generated columns) is adopted into Supabase migrations. Kestra itself is not called at runtime.

### ArangoDB Projection

Once flow runtime tables exist in Supabase with the JSONB `value` column pattern, the same JSON documents can be synced to ArangoDB collections via CDC or trigger-based replication. ArangoDB provides graph traversal and document queries that complement Supabase's relational queries.
