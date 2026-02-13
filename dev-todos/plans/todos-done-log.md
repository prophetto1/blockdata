# Todos Done Log (Canonical Completion Record)

**Date:** 2026-02-13  
**Status:** Active completion log

---

## Format

Use this format for each completed item:

- `YYYY-MM-DD` - `ID` - short completion note - verification evidence (deploy/test/API/SQL proof)
- Include concrete references when available (function names, migration IDs, endpoints, run IDs, or command outcomes).

---

## Historical Baseline (Already Completed)

- `2026-02-11` - `Q-P1` - Format reliability gate passed.
- `2026-02-12` - `Q-P2` - Worker/run reliability gate passed.
- `2026-02-12` - `Q-P3` - Config registry/ownership boundaries gate passed.
- `2026-02-12` - `Q-P4` - Prompt caching gate passed.
- `2026-02-12` - `Q-P5` - Adaptive batching gate passed.
- `2026-02-12` - `Q-P6` - Admin/superuser optimization controls gate passed.
- `2026-02-13` - `ING-P1` - Ingest control plane standardization complete.
- `2026-02-13` - `ING-P2` - Pandoc ingest track implementation complete.
- `2026-02-13` - `ING-P3` - Representation artifacts table/write path complete.
- `2026-02-13` - `ING-P5` - Parser-native view exposure complete.

---

## New Completions

- `2026-02-13` - `INT-005` - Agents + MCP configuration foundation implemented (build-only; runtime binding intentionally deferred behind feature flags) - verification: migrations `021/022/023`, edge APIs `agent-config` + `provider-connections`, web surfaces `/app/agents`, onboarding pages, MCP placeholder.
- `2026-02-13` - `INT-005-H1` - Agents auth/runtime hardening completed after rollout mismatch - verification: redeployed `agent-config` + `provider-connections` with `--no-verify-jwt`, applied remote migrations `021/022/023`, live probes return `HTTP 200` for `GET /functions/v1/agent-config` and `GET /functions/v1/provider-connections/status`.
- `2026-02-13` - `INT-005-H2` - Onboarding/action UX hardening for Agents foundation - verification: single-method providers now route directly from select step to connect step (`onboardingNextPath`), and MCP bindings removed from credential modal into dedicated MCP route link.
- `2026-02-13` - `INT-005-H3` - Anthropic API-key test path auth-mode fix - verification: redeployed `test-api-key` with `--no-verify-jwt`; live authenticated probe now returns provider-level validation payload (`{ valid: false, error: \"Invalid or disabled API key\" }`) instead of gateway `401 Invalid JWT`.
- `2026-02-13` - `INT-005-H4` - Restored full Settings provider configuration surface after regression - verification: restored `web/src/pages/Settings.tsx` to pre-foundation baseline (`7a52d05`), targeted lint passes, and provider defaults controls (`default_model`, `default_temperature`, `default_max_tokens`, `base_url`) are present again.
