# agent-config

Agent catalog + per-user agent configuration (keyword/model/MCP bindings).

This function does not execute models. It only persists configuration and computes readiness based on:
- `public.user_api_keys` (key present, base_url for custom)
- `public.user_provider_connections` (v1: Google Vertex service account status)

