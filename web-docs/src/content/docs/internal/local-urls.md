---
title: local-urls
description: Every local service URL, port, and environment variable for internal development.
---

Quick reference for all services running locally during development.

## Dev Servers        sdfd sdf

| Service | URL | Port | Start command |
|---------|-----|------|---------------|
| Web App (React) | `http://127.0.0.1:5174` | 5174 | `cd web && npm run dev` |
| Web App (LAN) | `http://0.0.0.0:4173` | 4173 | `cd web && npm run dev:alt` |
| Docs (Starlight) | `http://localhost:4421` | 4421 | `cd blockdata-ct && npm run dev` |
| OpenVSCode | `http://localhost:3000` | 3000 | `cd blockdata-ct && npm run openvscode:up` |
| Pipeline Worker (FastAPI) | `http://localhost:8000` | 8000 | Python/uvicorn |
| Uppy Companion | `http://localhost:3020` | 3020 | `cd services/uppy-companion && npm start` |
| Ollama (LLM) | `http://localhost:11434` | 11434 | `ollama serve` |

## Docker Services

| Service | URL | Port | Credentials |
|---------|-----|------|-------------|
| ArangoDB | `http://localhost:8529` | 8529 | `root` / `blockdata_dev` |
| Apache NiFi | `https://localhost:8443` | 8443 | `admin` / `blockdataAdmin123!` |
| Nango | `http://localhost:3003/signin` | 3003 | `admin@blockdata.dev` / `Blockdata_dev1` |
| Nango Postgres | `localhost:5433` | 5433 | `nango` / `nango` |
| Nango Redis | `localhost:6380` | 6380 | â€” |
| Bytebase | `http://localhost:8080` | 8080 | Set on first visit |
| Kestra | `http://localhost:8080` | 8080 | Docker / standalone |

## Supabase (local)

Requires `supabase start` to launch.

| Service | URL | Port |
|---------|-----|------|
| API | `http://127.0.0.1:54321` | 54321 |
| DB (Postgres) | `localhost:54322` | 54322 |
| Studio | `http://127.0.0.1:54323` | 54323 |
| Inbucket (email) | `http://127.0.0.1:54324` | 54324 |
| Analytics | `localhost:54327` | 54327 |

Default DB credentials: `postgres` / `postgres`. Keys printed by `supabase start`.

## Remote services (always-on)

| Service | URL | Env var |
|---------|-----|---------|
| Supabase | `https://dbdzzhshmigewyprahej.supabase.co` | `VITE_SUPABASE_URL` |
| Supabase DB | `aws-1-us-west-1.pooler.supabase.com:5432` | `DATABASE_URL` |
| Conversion Service | Cloud Run (us-central1) | `CONVERSION_SERVICE_URL` |
| Uppy Companion (prod) | Cloud Run (us-central1) | `VITE_UPPY_COMPANION_URL` |

## Environment variables

### Web app (`web/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_SUPABASE_URL` | â€” | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | â€” | Supabase anonymous JWT |
| `VITE_PIPELINE_WORKER_URL` | `http://localhost:8000` | Pipeline Worker base URL |
| `VITE_UPPY_COMPANION_URL` | â€” | Uppy Companion URL for cloud file imports |

### Root (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | â€” | Direct Postgres connection string |
| `SUPABASE_SERVICE_ROLE_KEY` | â€” | Service role JWT (admin access) |
| `CONVERSION_SERVICE_URL` | â€” | Conversion service endpoint |
| `CONVERSION_SERVICE_KEY` | â€” | Conversion service API key |
| `CONVERSION_SERVICE_ACK_TIMEOUT_MS` | `8000` | Ack timeout in ms |
| `UNSTRUCTURED_TRACK_SERVICE_URL` | `http://127.0.0.1:8000` | Unstructured track service |
| `TRACK_B_SERVICE_KEY` | â€” | Track B service API key |
| `TRACK_B_WORKER_KEY` | â€” | Track B worker API key |

### Feature flags

| Flag | Default | Description |
|------|---------|-------------|
| `VITE_FF_SHELL_V2` | `true` | Shell v2 UI |
| `VITE_FF_ASSISTANT_DOCK` | `true` | Assistant dock panel |
| `VITE_FF_AGENTS_CONFIG_UI` | `true` | Agents configuration UI |
| `VITE_FF_MCP_PLACEHOLDER_UI` | `true` | MCP placeholder UI |
| `VITE_FF_PROVIDER_CONNECTION_FLOWS` | `true` | Provider connection flows |
| `VITE_FF_COMMANDS_UI` | `true` | Commands UI |

## Docs site access

Run the docs site directly from `blockdata-ct`:

| Path | Target |
|------|--------|
| `/` | `http://localhost:4421` |
| `/_image` | `http://localhost:4421` |

## Port conflicts

- **Port 8000**: Pipeline Worker and Unstructured Track Service both default here. Run only one at a time, or override one with a different port.
- **Port 8080**: Bytebase and Kestra both use 8080. Run only one at a time.

## Env file locations

```
.env                                  # root DB, conversion, track service
.env.example                          # root template
.env.local                            # root local overrides (gitignored)
web/.env                              # web app Supabase, feature flags
web/.env.example                      # web app template
web/.env.local                        # web app local overrides (gitignored)
services/uppy-companion/.env.example  # companion template
```
