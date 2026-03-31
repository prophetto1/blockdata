# AGChain Models: Inspect AI Integration and Frontend Implementation Plan

**Feature:** AGChain Models

**Goal (one sentence):** Restore `Models` as an operational AGChain surface by exposing it in the primary rail, aligning its semantics to Inspect AI model concepts, and tightening the platform-api/persistence/observability/frontend contracts so the surface is fully owned and modifiable.

**Architecture:** Supabase Postgres remains the system of record (`agchain_model_targets`, `agchain_model_health_checks`). `services/platform-api` is the only backend surface the web app talks to and remains the control plane. The refresh-health path remains a provider-aware readiness probe (HTTP) whose internal implementation is evolved behind a frozen HTTP contract; no CLI shell-out is permitted. Inspect AI alignment is achieved by adopting/porting the *semantic contracts* we need (provider registry shape + `GenerateConfig`-style runtime config schema) into AGChain-owned modules, not by depending on Inspect at runtime.

**Tech Stack:** Supabase Postgres (migrations), FastAPI + Pydantic (platform-api), httpx (probes), OpenTelemetry (traces/metrics/logs), React + TypeScript (web), pytest + Vitest (tests).

**Status:** Revised (post-evaluation)
**Date:** 2026-03-31

---

## Pre-Implementation Contract

No major decision is improvised during implementation. If any contract below changes, stop and revise the plan first.

### Setback Context (Why This Plan Is Strict)

Recent regressions replaced or obscured real feature surfaces via placeholder menus, redirects, or under-specified “wrapper” behavior. This plan therefore locks contracts to prevent future “looks done” outcomes that fail to preserve required runtime seams.

### Evaluator Prohibition

Do not approve or normalize:

- placeholder shells that hide missing backend seams
- black-box wrappers around external code presented as “integration”
- redirects or menu edits that remove real surfaces
- vague endpoint/migration/telemetry language where the implementer would decide critical behavior during coding

---

## Verified Current Reality (Ground Truth)

- Backend routes exist and are instrumented: `E:/writing-system/services/platform-api/app/api/routes/agchain_models.py`.
- Domain logic exists: `E:/writing-system/services/platform-api/app/domain/agchain/model_registry.py` and `E:/writing-system/services/platform-api/app/domain/agchain/model_provider_catalog.py`.
- Persistence exists: `E:/writing-system/supabase/migrations/20260326170000_agchain_model_targets.sql`.
- Frontend page exists: `E:/writing-system/web/src/pages/agchain/AgchainModelsPage.tsx`.
- The AGChain left rail currently omits `Models`: `E:/writing-system/web/src/components/agchain/AgchainLeftNav.tsx` and `E:/writing-system/web/src/components/agchain/AgchainLeftNav.test.tsx`.
- The current domain implementation has correctness defects that must be fixed before claiming the surface is operational:
  - `model_registry.load_model_detail` calls `_normalize_row` with an incorrect signature.
  - `model_registry.refresh_model_target_health` calls `_resolve_credential_status` which does not exist.

---

## Locked Product Decisions

1. `Models` is a primary rail item and must be reachable via `/app/agchain/models` with no redirects.
2. No runtime dependency on `_agchain/_reference/inspect_ai` is allowed; any Inspect-derived code is copied/adapted into our codebase.
3. Phase 1 does **not** introduce `role_bindings_jsonb`. Role bindings remain `supports_evaluated` and `supports_judge` booleans (single source of truth) to avoid schema conflicts.
4. Phase 1 adds **only** the missing persisted runtime config surface: `generate_config_jsonb` (Inspect-aligned config schema).
5. Refresh-health remains a readiness probe; “instantiate” in this plan means *construct provider + config objects*, not run a generation call.

---

## Locked Acceptance Contract (End-to-End)

The work is complete only when:

1. `Models` is present in the primary AGChain rail and the nav test is updated to match.
2. The `Models` page supports: list, create, update, view detail, refresh health, and view health history using only platform-api endpoints.
3. `generate_config_jsonb` exists in persistence, is writable via create/update, and is returned in model detail.
4. The refresh-health HTTP contract is unchanged, and internal changes preserve correctness.
5. OpenTelemetry spans/metrics/log events listed below exist with the declared names and emit locations.
6. Backend and frontend tests pass for the touched surfaces.

---

## Manifest

### Platform API

#### Existing endpoints (must remain mounted)

- `GET /agchain/models/providers`
- `GET /agchain/models`
- `GET /agchain/models/{model_target_id}`
- `POST /agchain/models`
- `PATCH /agchain/models/{model_target_id}`
- `POST /agchain/models/{model_target_id}/refresh-health`

#### Endpoint contracts (explicit)

`GET /agchain/models/providers`
- Auth: `require_user_auth`
- Request: query none
- Response: `{ "items": AgchainProviderDefinition[] }`
- Tables: none (provider catalog is in code)
- Emit: span `agchain.models.providers.list` (`agchain_models.py:list_supported_providers_route`)

`GET /agchain/models`
- Auth: `require_user_auth`
- Request: query `provider_slug?`, `compatibility?`, `health_status?`, `enabled?`, `search?`, `limit`, `offset`
- Response: `{ "items": AgchainModelTargetRow[], "total": number, "limit": number, "offset": number }`
- Tables: `agchain_model_targets` (read), plus credential readiness reads from `user_api_keys`, `user_provider_connections` via service_role
- Emit: span `agchain.models.list` + counter/histogram in `agchain_models.py:list_models`

`GET /agchain/models/{model_target_id}`
- Auth: `require_user_auth`
- Request: path `model_target_id`
- Response:
  - `{ "model_target": AgchainModelTargetDetailRow, "recent_health_checks": AgchainModelHealthCheck[], "provider_definition": AgchainProviderDefinition | null }`
  - `AgchainModelTargetDetailRow` must include `generate_config_jsonb` once added
- Tables: `agchain_model_targets` (read), `agchain_model_health_checks` (read)
- Emit: span `agchain.models.get` (`agchain_models.py:get_model`)

`POST /agchain/models`
- Auth: `require_superuser`
- Request body (JSON): existing `ModelTargetCreateRequest` plus **new** `generate_config_jsonb: dict` default `{}`.
- Response: `{ "ok": true, "model_target_id": string }`
- Tables: `agchain_model_targets` (insert)
- Emit: span `agchain.models.create` + log event `agchain.models.created`

`PATCH /agchain/models/{model_target_id}`
- Auth: `require_superuser`
- Request body (JSON): existing `ModelTargetUpdateRequest` plus **new** optional `generate_config_jsonb?: dict`.
- Response: `{ "ok": true, "model_target_id": string }`
- Tables: `agchain_model_targets` (update)
- Emit: span `agchain.models.update` + log event `agchain.models.updated`

`POST /agchain/models/{model_target_id}/refresh-health`
- Auth: `require_superuser`
- Request: no body
- Response (frozen seam):
  - `{ "ok": true, "health_status": string, "latency_ms": number | null, "checked_at": string, "message": string, "probe_strategy": string }`
- Tables: `agchain_model_targets` (update), `agchain_model_health_checks` (insert)
- Emit: span `agchain.models.refresh_health` + histogram `platform.agchain.models.refresh_health.duration_ms` + log event `agchain.models.health_refreshed`

### Frozen Seam Contract (Refresh-Health)

- The HTTP request/response contract of `POST /agchain/models/{id}/refresh-health` remains unchanged.
- Internal change allowed: replace parts of `_run_provider_probe` with Inspect-aligned provider/config resolution, but the probe remains “readiness/probe”, not a model generation call.

### Observability

#### Existing instruments (must be preserved exactly)

- Spans:
  - `agchain.models.providers.list` (`agchain_models.py:list_supported_providers_route`)
  - `agchain.models.list` (`agchain_models.py:list_models`)
  - `agchain.models.get` (`agchain_models.py:get_model`)
  - `agchain.models.create` (`agchain_models.py:create_model`)
  - `agchain.models.update` (`agchain_models.py:patch_model`)
  - `agchain.models.refresh_health` (`agchain_models.py:refresh_model_health`)
  - `agchain.models.provider_probe` (`model_registry.py:_run_provider_probe`)
- Counters:
  - `platform.agchain.models.providers.list.count` (routes)
  - `platform.agchain.models.list.count` (routes)
  - `platform.agchain.models.create.count` (routes)
  - `platform.agchain.models.update.count` (routes)
  - `platform.agchain.models.refresh_health.count` (routes)
- Histograms:
  - `platform.agchain.models.list.duration_ms` (routes)
  - `platform.agchain.models.refresh_health.duration_ms` (routes)
- Structured logs (existing):
  - `agchain.models.created` (routes)
  - `agchain.models.updated` (routes)
  - `agchain.models.health_refreshed` (routes)
  - `agchain.models.provider_probe_failed` (domain)

#### New instruments (add)

Purpose: make the new Inspect-aligned resolution seam traceable without leaking credentials.

- Spans:
  - `agchain.models.runtime.resolve` (new module, called by refresh-health before probe)
  - `agchain.models.runtime.probe` (new module wrapper around provider_probe selection)
- Counters:
  - `platform.agchain.models.runtime.resolve.count`
  - `platform.agchain.models.runtime.probe.count`
- Histograms:
  - `platform.agchain.models.runtime.resolve.duration_ms`
  - `platform.agchain.models.runtime.probe.duration_ms`
- Structured logs:
  - `agchain.models.runtime.resolve_failed` (emit location: new runtime module)
  - `agchain.models.runtime.probe_failed` (emit location: new runtime module)

Attributes policy:
- Allowed: `provider_slug`, `auth_kind`, `probe_strategy`, `health_status`, `http.status_code`, `latency_ms`
- Forbidden: tokens, raw headers, decrypted secrets, raw request/response bodies

### Database Migrations

#### Existing schema facts (must be reflected, not re-invented)

- `model_args_jsonb` already exists and is `JSONB NOT NULL DEFAULT '{}'::jsonb`.
- Role bindings already exist as `supports_evaluated` and `supports_judge`.

#### Migration to add (exact)

- File: `supabase/migrations/20260331160000_agchain_model_generate_config_jsonb.sql`
- Change:
  - `ALTER TABLE public.agchain_model_targets ADD COLUMN IF NOT EXISTS generate_config_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb;`
- Data impact: existing rows get `{}`.

### Edge Functions

- None. Explicitly no Edge Function changes.

### Frontend Surface Area

Counts (exact):
- Modified pages: 1 (`web/src/pages/agchain/AgchainModelsPage.tsx`)
- Modified components: 4
- New components: 1
- Modified hooks: 1
- Modified lib files: 1
- Modified nav tests: 1

Files (exact):
- Modify `web/src/components/agchain/AgchainLeftNav.tsx` (add `Models` item)
- Modify `web/src/components/agchain/AgchainLeftNav.test.tsx` (expect `Models` in order)
- Modify `web/src/pages/agchain/AgchainModelsPage.tsx` (no semantic change beyond any new fields surfaced)
- Modify `web/src/components/agchain/models/AgchainModelsToolbar.tsx` (edit create/edit to include `generate_config_jsonb` and optionally `model_args_jsonb`)
- Modify `web/src/components/agchain/models/AgchainModelInspector.tsx` (render runtime config summary; wire edit sheet fields)
- Modify `web/src/lib/agchainModels.ts` (add `generate_config_jsonb` to write type + detail type)
- Modify `web/src/hooks/agchain/useAgchainModels.ts` (pass through new fields; no API changes beyond types)
- Add `web/src/components/agchain/models/AgchainModelJsonConfigEditor.tsx` (shared JSON editor for `model_args_jsonb` and `generate_config_jsonb`)

Backend file inventory (locked):
- Modify `services/platform-api/app/api/routes/agchain_models.py` (request models and response payload include `generate_config_jsonb`)
- Modify `services/platform-api/app/domain/agchain/model_registry.py` (include `generate_config_jsonb` in detail normalization; integrate runtime resolve seam for probes)
- Add `services/platform-api/app/domain/agchain/model_runtime_config.py` (Pydantic schema aligned to Inspect `GenerateConfig` + validation)
- Add `services/platform-api/app/domain/agchain/model_runtime_seam.py` (resolve→probe wrapper with OTel spans/logs)
- Add `services/platform-api/tests/test_agchain_models_runtime_config.py`

---

## Tasks (Executable, TDD)

### Task 0 — Fix Existing Model Registry Defects (Make Current Surface Functional)
- Fix `services/platform-api/app/domain/agchain/model_registry.py`:
  - `load_model_detail` must compute `credential_status` correctly and call `_normalize_row(row, credential_status)`.
  - `refresh_model_target_health` must compute credential status via an existing helper (or introduce a correctly-named helper) and must not call missing symbols.
- Test: `cd services/platform-api && python -m pytest tests/test_agchain_models.py -q`
- Commit: `fix(agchain): repair model registry detail and refresh-health`

### Task 1 — Restore Models in Primary Rail
- Edit `web/src/components/agchain/AgchainLeftNav.tsx` to add `{ label: 'Models', path: '/app/agchain/models' }`.
- Update `web/src/components/agchain/AgchainLeftNav.test.tsx` to assert the new ordered list.
- Test: `cd web && npm test -- src/components/agchain/AgchainLeftNav.test.tsx`
- Commit: `fix(agchain): restore models in primary rail`

### Task 2 — Add generate_config_jsonb Migration
- Add `supabase/migrations/20260331160000_agchain_model_generate_config_jsonb.sql` with the exact ALTER TABLE.
- Verify schema locally via migration tooling (if available) or by reviewing SQL only.
- Commit: `feat(agchain): persist model generate config`

### Task 3 — Backend Runtime Config Schema (Inspect-aligned)
- Add `services/platform-api/app/domain/agchain/model_runtime_config.py` containing a Pydantic model mirroring the subset of Inspect `GenerateConfig` we support now (timeout, attempt_timeout, max_retries, max_connections, system_message, max_tokens, temperature, top_p, stop_seqs, cache policy).
- Add unit tests in `services/platform-api/tests/test_agchain_models_runtime_config.py`.
- Test: `cd services/platform-api && python -m pytest tests/test_agchain_models_runtime_config.py -q`
- Commit: `feat(agchain): add generate-config schema and validation`

### Task 4 — Wire generate_config_jsonb Through Platform API
- Update `services/platform-api/app/api/routes/agchain_models.py` request models to accept `generate_config_jsonb`.
- Update domain `create_model_target` / `update_model_target` to persist it.
- Update detail response to include it.
- Test: `cd services/platform-api && python -m pytest tests/test_agchain_models.py -q`
- Commit: `feat(agchain): expose generate_config_jsonb over models api`

### Task 5 — Define and Instrument Runtime Seam (Frozen Refresh Contract)
- Add `services/platform-api/app/domain/agchain/model_runtime_seam.py` with:
  - `resolve_runtime_config(row)` (span `agchain.models.runtime.resolve`)
  - `probe_target(row)` wrapper (span `agchain.models.runtime.probe`)
  - counters/histograms/logs declared in the manifest
- Rewire `model_registry.refresh_model_target_health` to call the seam while preserving endpoint output.
- Test: `cd services/platform-api && python -m pytest tests/test_agchain_models.py -q`
- Commit: `feat(agchain): instrument models runtime seam`

### Task 6 — Frontend: JSON Config Editor + Wire Into Create/Edit
- Add `web/src/components/agchain/models/AgchainModelJsonConfigEditor.tsx`.
- Update `AgchainModelsToolbar.tsx` and `AgchainModelInspector.tsx` to edit `model_args_jsonb` and `generate_config_jsonb`.
- Update `web/src/lib/agchainModels.ts` types and payload writers.
- Test: `cd web && npm test -- src/pages/agchain/AgchainModelsPage.test.tsx`
- Commit: `feat(agchain): edit model args and generate config in models ui`

---

## Risks (Explicit)

- Adding `generate_config_jsonb` requires careful response/payload shaping to avoid breaking current UI.
- Do not leak secret material through logs/spans; keep config validation strict and safe.
- Runtime seam must not silently turn health-check into “generate a completion”; the probe remains readiness-focused.
