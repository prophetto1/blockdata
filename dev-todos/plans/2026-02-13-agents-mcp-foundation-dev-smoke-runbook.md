# Agents + MCP Foundation Dev Smoke Runbook

## Purpose

Validate foundation migrations and edge API behavior in a Supabase dev branch before any main-environment rollout.

## Scope

This runbook covers:

1. `021_agents_config_foundation`
2. `022_provider_connections`
3. `023_agents_config_security_hardening`
4. Edge function behavior for:
   - `agent-config`
   - `provider-connections`

## Preconditions

1. Authenticated user exists in the dev branch project.
2. `agent-config` and `provider-connections` functions are deployed to the same dev branch.
3. Feature flags remain off by default unless explicitly validating UI behavior.

## Migration Checks

After applying migrations, verify:

1. `agent_catalog`, `user_agent_configs`, `user_provider_connections` tables exist.
2. `user_agent_configs_one_default_per_user` index exists.
3. `user_agent_configs_unique_keyword_per_user` index exists.
4. Browser role (`authenticated`) has `SELECT` only on:
   - `user_agent_configs`
   - `user_provider_connections` (non-secret column subset)
5. Browser role does not have direct write grants to `user_agent_configs`.
6. `agent_catalog` contains seed rows:
   - `anthropic`
   - `openai`
   - `google`
   - `custom`

## Deterministic API Smoke Sequence

Use one authenticated user and run the sequence in order.

1. `GET agent-config` before setup:
   - Returns catalog + empty or partial configs.
   - Readiness is `false` for providers without configured auth.
2. `PATCH agent-config` with `agent_slug=anthropic`, `keyword=claude`, `is_default=true`:
   - Keyword is normalized to `/claude`.
   - Row is written with authenticated `user_id` (not caller-supplied body values).
3. `PATCH agent-config` for a second agent with same non-empty keyword:
   - Returns clear duplicate keyword error.
4. `POST provider-connections/connect` with malformed Google service account JSON:
   - Returns validation error.
5. `POST provider-connections/connect` with valid Google service account JSON + valid location:
   - Returns `status=connected`.
   - Response does not contain plaintext private key.
6. `GET provider-connections/status`:
   - Returns metadata/status only.
   - Does not expose `credential_encrypted`.
7. `POST provider-connections/disconnect` for Google service account:
   - Returns `status=disconnected`.
8. `GET agent-config` after connect/disconnect:
   - Google readiness follows rule:
     - `true` with Gemini API key OR connected Vertex service account.
     - `false` when neither exists.
9. Custom provider readiness check:
   - `false` when only `base_url` exists without API key.
   - `true` only when both `base_url` and API key are present (v1).

## Rollback Criteria

Do not promote from dev branch if any of these fail:

1. Authenticated browser can directly mutate `user_agent_configs`.
2. Secret material is returned in API payloads.
3. Default-agent uniqueness is violated for a single user.
4. Readiness rules diverge from provider matrix (`anthropic`, `openai`, `google`, `custom`).
