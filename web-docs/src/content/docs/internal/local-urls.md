---
title: Local Development URLs
description: Every local service URL, port, and environment variable for internal development.
---

Quick reference for all services running locally during development.

## Services

| Service | URL | Port | Start command |
|---------|-----|------|---------------|
| Web App (React) | `http://127.0.0.1:5174` | 5174 | `cd web && npm run dev` |
| Web App (LAN) | `http://0.0.0.0:4173` | 4173 | `cd web && npm run dev:alt` |
| Docs (Astro) | `http://localhost:4321` | 4321 | `cd web-docs && npm run dev` |
| Pipeline Worker (FastAPI) | `http://localhost:8000` | 8000 | Python/uvicorn |
| Uppy Companion | `http://localhost:3020` | 3020 | `cd services/uppy-companion && npm start` |
| Kestra | `http://localhost:8080` | 8080 | Docker / standalone |
| Ollama (LLM) | `http://localhost:11434` | 11434 | `ollama serve` |

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
| `VITE_SUPABASE_URL` | — | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | — | Supabase anonymous JWT |
| `VITE_PIPELINE_WORKER_URL` | `http://localhost:8000` | Pipeline Worker base URL |
| `VITE_UPPY_COMPANION_URL` | — | Uppy Companion URL for cloud file imports |

### Root (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | Direct Postgres connection string |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Service role JWT (admin access) |
| `CONVERSION_SERVICE_URL` | — | Conversion service endpoint |
| `CONVERSION_SERVICE_KEY` | — | Conversion service API key |
| `CONVERSION_SERVICE_ACK_TIMEOUT_MS` | `8000` | Ack timeout in ms |
| `UNSTRUCTURED_TRACK_SERVICE_URL` | `http://127.0.0.1:8000` | Unstructured track service |
| `TRACK_B_SERVICE_KEY` | — | Track B service API key |
| `TRACK_B_WORKER_KEY` | — | Track B worker API key |

### Feature flags

| Flag | Default | Description |
|------|---------|-------------|
| `VITE_FF_SHELL_V2` | `true` | Shell v2 UI |
| `VITE_FF_ASSISTANT_DOCK` | `true` | Assistant dock panel |
| `VITE_FF_AGENTS_CONFIG_UI` | `true` | Agents configuration UI |
| `VITE_FF_MCP_PLACEHOLDER_UI` | `true` | MCP placeholder UI |
| `VITE_FF_PROVIDER_CONNECTION_FLOWS` | `true` | Provider connection flows |
| `VITE_FF_COMMANDS_UI` | `true` | Commands UI |

## Proxy config

The Vite dev server (`web/vite.config.ts`) proxies docs routes to Astro:

| Path | Target |
|------|--------|
| `/docs` | `http://localhost:4321` |
| `/_image` | `http://localhost:4321` |

This means running both `web` and `web-docs` dev servers lets you access docs at `http://127.0.0.1:5174/docs`.

## Port conflicts

Pipeline Worker and Unstructured Track Service both default to port `8000`. Run only one at a time, or override one with a different port.

## Env file locations

```
.env                                  # root — DB, conversion, track service
.env.example                          # root template
.env.local                            # root local overrides (gitignored)
web/.env                              # web app — Supabase, feature flags
web/.env.example                      # web app template
web/.env.local                        # web app local overrides (gitignored)
services/uppy-companion/.env.example  # companion template
```
