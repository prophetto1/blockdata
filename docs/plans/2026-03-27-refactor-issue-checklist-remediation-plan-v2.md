# Refactor Issue Checklist Remediation Plan (v2)

**Goal:** Verify the issues in [refactor-issue-checklist.md](/E:/writing-system/docs/refactor-issue-checklist.md), separate real defects from stale entries, and execute the remaining work in a dependency-safe order that prevents later refactors from invalidating earlier fixes.

**Architecture:** Treat the checklist as a multi-workstream hardening program, not one flat cleanup pass. Keep existing public product scope, routes, tables, and services unless a verified bug requires a contract change. Execute security and API-boundary fixes first, then subsystem-specific hardening, then runtime/performance work, then low-risk frontend cleanup. Keep crypto format migration separate from immediate crypto safety fixes so deployed ciphertext compatibility is never changed opportunistically.

**Tech Stack:** FastAPI, React + TypeScript, Supabase/Postgres migrations and RPCs, OpenTelemetry, pytest, Vitest.

**Status:** Draft
**Date:** 2026-03-27

---

## Verified Current State

Checklist verification against current `master`:

- Total checklist entries reviewed: `45`
- Verified actionable now: `41`
- Verified stale/resolved: `3`
- Verified obsolete: `1`

Verified non-actionable items:

- `S1` resolved: protocol whitelist guard exists in [otel.py](/E:/writing-system/services/platform-api/app/observability/otel.py)
- `S4` resolved: [cluster.xml](/E:/writing-system/docker/signoz/clickhouse/cluster.xml) uses `zookeeper`
- `S16` obsolete: the live uniqueness contract already prevents case-colliding `user_variables.name` rows
- `S23` resolved locally: [ConnectionsPanel.tsx](/E:/writing-system/web/src/pages/settings/ConnectionsPanel.tsx) now uses current backend function names

Larger-picture issues hiding inside the checklist:

- `C2` is not a local helper tweak; it is a deployed crypto-compatibility contract problem
- `S15` is not just one exception path; it is a storage completion durability problem
- `C5`, `S3`, `S17`, `S18`, `S19`, and `M2` belong to one Legal-10 runtime/backend seam
- `S10`, `S11`, `S12`, `S13`, `S14`, and `M15` belong to one AG chain registry/benchmark correctness and scale seam

---

## Manifest

### Platform API

| Verb | Path | Action | Status |
|------|------|--------|--------|
| n/a | app startup CORS middleware | Replace wildcard credentialed CORS with explicit trusted origins | Modified |
| POST | `/agchain/benchmarks` | Tighten write auth from user to superuser | Modified |
| POST | `/agchain/benchmarks/{benchmark_slug}/steps` | Tighten write auth from user to superuser | Modified |
| PATCH | `/agchain/benchmarks/{benchmark_slug}/steps/{benchmark_step_id}` | Tighten write auth from user to superuser | Modified |
| POST | `/agchain/benchmarks/{benchmark_slug}/steps/reorder` | Tighten write auth from user to superuser and make reorder atomic | Modified |
| DELETE | `/agchain/benchmarks/{benchmark_slug}/steps/{benchmark_step_id}` | Tighten write auth from user to superuser | Modified |
| POST | `/connections/disconnect` | Return not-found when no row matches disconnect target | Modified |
| POST | `/connections/test` | Stop returning raw internal probe logs/details to callers | Modified |
| PATCH | `/secrets/{secret_id}` | Validate `value_kind`, reject empty update, tighten `secret_id` typing | Modified |
| DELETE | `/secrets/{secret_id}` | Tighten `secret_id` typing | Modified |
| PATCH | `/variables/{variable_id}` | Tighten `variable_id` typing | Modified |
| DELETE | `/variables/{variable_id}` | Tighten `variable_id` typing | Modified |
| GET | `/agchain/models` | Remove N+1 credential resolution path and add pagination | Modified |
| GET | `/agchain/benchmarks` | Remove N+1 counts path and add pagination | Modified |
| POST | `/storage/uploads/{reservation_id}/complete` | Make source-document bridge failure durable and observable | Modified |

No new public endpoints are planned in this pass. If any workstream later requires a new route or RPC to preserve atomicity, the plan must be revised first.

#### Modified endpoint contracts

`GET /agchain/models`

- Change: add optional `limit` and `offset` query params
- Query contract: `limit` defaults to `50`, `offset` defaults to `0`
- Response contract: `{"items": [...], "total": number, "limit": number, "offset": number}`
- Compatibility rule: existing `items` remains the primary collection key; added metadata is backward-compatible
- Frontend consumers updated in this plan: [agchainModels.ts](/E:/writing-system/web/src/lib/agchainModels.ts), [AgchainModelsPage.tsx](/E:/writing-system/web/src/pages/agchain/AgchainModelsPage.tsx)

`GET /agchain/benchmarks`

- Change: add optional `limit` and `offset` query params
- Query contract: `limit` defaults to `50`, `offset` defaults to `0`
- Response contract: `{"items": [...], "total": number, "limit": number, "offset": number}`
- Compatibility rule: existing `items` remains the primary collection key; added metadata is backward-compatible
- Frontend consumers updated in this plan: [agchainBenchmarks.ts](/E:/writing-system/web/src/lib/agchainBenchmarks.ts), [useAgchainBenchmarks.ts](/E:/writing-system/web/src/hooks/agchain/useAgchainBenchmarks.ts), [AgchainBenchmarksPage.tsx](/E:/writing-system/web/src/pages/agchain/AgchainBenchmarksPage.tsx)

`POST /connections/test`

- Change: stop returning raw internal probe logs to callers
- Response contract: preserve `valid` and `data`; any operator-detail remains server-side in logs
- Why: the current `logs` payload can include internal connection detail or stack traces

### Observability

| Type | Name | Where | Purpose |
|------|------|-------|---------|
| Log warning | `crypto.plaintext_passthrough` | [crypto.py](/E:/writing-system/services/platform-api/app/infra/crypto.py) | Flag plaintext values found in encrypted columns |
| Metric counter | `platform.crypto.plaintext_fallback.count` | [crypto.py](/E:/writing-system/services/platform-api/app/infra/crypto.py) | Count plaintext fallback events |
| Log warning | `otel.unknown_sampler` | [otel.py](/E:/writing-system/services/platform-api/app/observability/otel.py) | Record invalid sampler names before fallback |
| Structured log | existing route/service loggers | admin/storage, storage, connections, model registry | Preserve internal detail in logs while removing it from HTTP responses |

Observability attribute rules:

- Allowed attributes: `action`, `result`, `value_kind`, `status`, `http.status_code`, `storage.kind`, `requested.bytes`, `actual.bytes`, `row_count`, `latency_ms`, `probe_strategy`, `health_status`
- Forbidden in trace/metric attrs: `user_id`, `email`, connection strings, raw secret values, secret names, full object keys, raw provider probe logs

### Database Migrations

| File | Change |
|------|--------|
| `supabase/migrations/<new>_drop_old_reserve_user_storage_overload.sql` | Drop the superseded `reserve_user_storage` signature before recreating the new one. Affects existing data: No |
| `supabase/migrations/<new>_agchain_benchmark_step_reorder_atomic_rpc.sql` | Add a DB-owned atomic reorder path for benchmark step ordering. Affects existing data: No |

No schema rewrite is locked yet for `C2` or `S15`. If either requires new tables, columns, or RPCs after implementation-level investigation, stop and draft a dedicated subplan first.

### Edge Functions

No edge-function changes.

### Frontend Surface Area

**New pages:** `0`
**New components:** `0`
**Modified files:** `12`

| File | What changes |
|------|--------------|
| [web/src/components/agchain/models/AgchainModelsTable.tsx](/E:/writing-system/web/src/components/agchain/models/AgchainModelsTable.tsx) | Align badge maps with backend status vocabulary |
| [web/src/pages/agchain/AgchainModelsPage.tsx](/E:/writing-system/web/src/pages/agchain/AgchainModelsPage.tsx) | Consume backward-compatible paginated model-target response |
| [web/src/lib/agchainModels.ts](/E:/writing-system/web/src/lib/agchainModels.ts) | Parse backward-compatible paginated model-target response |
| [web/src/pages/agchain/AgchainBenchmarksPage.tsx](/E:/writing-system/web/src/pages/agchain/AgchainBenchmarksPage.tsx) | Consume backward-compatible paginated benchmark response |
| [web/src/hooks/agchain/useAgchainBenchmarks.ts](/E:/writing-system/web/src/hooks/agchain/useAgchainBenchmarks.ts) | Track benchmark pagination state and fetch params |
| [web/src/hooks/useDirectUpload.ts](/E:/writing-system/web/src/hooks/useDirectUpload.ts) | Remove stale closure over `files` |
| [web/src/lib/agchainBenchmarks.ts](/E:/writing-system/web/src/lib/agchainBenchmarks.ts) | Catch and surface JSON parse failures |
| [web/src/lib/storageUploadService.ts](/E:/writing-system/web/src/lib/storageUploadService.ts) | Revisit non-streaming hash path |
| [web/src/components/agchain/benchmarks/AgchainBenchmarkStepInspector.tsx](/E:/writing-system/web/src/components/agchain/benchmarks/AgchainBenchmarkStepInspector.tsx) | Surface step-config parse failures instead of raw uncaught errors |
| [web/src/pages/settings/SettingsSecrets.tsx](/E:/writing-system/web/src/pages/settings/SettingsSecrets.tsx) | Add delete confirmation |
| [web/src/router.tsx](/E:/writing-system/web/src/router.tsx) | Remove dead conditional |
| [web/src/components/shell/LeftRailShadcn.tsx](/E:/writing-system/web/src/components/shell/LeftRailShadcn.tsx) | Remove or wire the unconditional notification dot |

### Additional Runtime Surface

| File | What changes |
|------|--------------|
| [runtime/execution_backend.py](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/execution_backend.py) | Stop blocking the event loop in async execution |
| [runtime/runtime_config.py](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/runtime_config.py) | Make phase-gated profile rejection explicit |
| [runtime/inspect_backend.py](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/inspect_backend.py) | Handle non-system/non-user role strategy explicitly |
| [adapters/model_adapter.py](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/adapters/model_adapter.py) | Reuse clients and make system-message behavior explicit |
| [run_3s.py](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py) | Replace or document hand-rolled `.env` parsing |

---

## Locked Inventory Counts

- Modified platform-api production files: `16`
- Modified platform-api test files: `7`
- Modified frontend files: `12`
- Modified runtime files: `5`
- Modified docs/checklist files: `1`
- New migrations: `2`

These counts are locked for this revision. If implementation needs to exceed them, stop and revise the plan first.

## Locked Decisions

1. `S1`, `S4`, `S16`, and `S23` are removed from the actionable remediation scope. Do not spend implementation time re-fixing them.
2. `C2` is split from the immediate hardening work. Do not change ciphertext derivation or wire format in the same batch as `C3`, `S22`, or `M13`.
3. Security boundary fixes land before performance work or cosmetic cleanup.
4. Files touched by benchmark/model registry auth fixes are not reused for helper dedupe or pagination cleanup until the auth contract is settled.
5. `S12` reorder atomicity is implemented with a dedicated Postgres RPC migration, not with Python-side best-effort looping.
6. Storage durability (`S15`) is treated as a subsystem reliability fix, not a minor route patch. If a durable bridge needs new persistence or a compensating job, stop and revise.
7. New observability names introduced by this plan must be added to [contract.py](/E:/writing-system/services/platform-api/app/observability/contract.py) rather than left inline.
8. Security fixes are committed in small auditable batches; CORS/auth, error sanitization, connection-merge behavior, and input validation do not share a single commit.
9. Pagination changes are backward-compatible: the response keeps `items` and adds metadata, and the frontend pagination consumers are part of this plan.
10. Test-harness stabilization (`S5`) lands before large backend workstreams so cache pollution does not mask regressions.
11. Cosmetic-only frontend issues (`M4`, `M8`) land last.

---

## Risks

1. Pagination can break existing AG chain list screens if the frontend and backend contracts drift; the response shape and frontend consumers are therefore locked together in this plan.
2. Benchmark reorder atomicity may tempt a quick Python-loop patch; this plan forbids that and requires a DB-owned atomic reorder path.
3. Storage completion durability may uncover a need for stronger persistence or repair semantics than the current route can express; if so, the plan must be revised rather than improvised.
4. The deferred `C2` crypto migration remains a known security design issue; implementers must not “sneak it in” while touching crypto helpers in this pass.

---

## Ordered Workstreams

### Workstream 0: Checklist Hygiene and Test Harness

Issue IDs: `S5`

Purpose:

- stabilize backend test isolation before broader backend edits
- keep the checklist itself accurate before implementation starts

### Workstream 1: Security and API Contract Boundary

Issue IDs: `C1`, `C4`, `C6`, `C7`, `S6`, `S7`, `S9`, `M6`, `M14`

Purpose:

- remove live auth and data-exposure risks first
- lock request/response semantics before downstream refactors

### Workstream 2: Immediate Crypto and Connection Hardening

Issue IDs: `C3`, `S8`, `S22`, `M12`, `M13`, `S2`, `M1`, `M3`, `M7`

Purpose:

- harden crypto fallback behavior and connection resolution without changing deployed ciphertext compatibility
- centralize small observability/hygiene seams after the security boundary is stable

### Workstream 3: Storage Durability and Upload Path Reliability

Issue IDs: `S15`, `S20`, `M10`, `M11`

Purpose:

- fix the storage completion/source-document bridge before additional storage UX cleanup
- keep DB-function cleanup and upload-path behavior in the same subsystem batch

### Workstream 4: AG Chain Registry and Benchmark Correctness/Scale

Issue IDs: `S10`, `S11`, `S12`, `S13`, `S14`, `M15`

Purpose:

- fix N+1s, collision handling, reorder atomicity, and status vocabulary together
- avoid revisiting the same registry/benchmark files across multiple batches

### Workstream 5: Legal-10 Runtime and Backend Abstraction Hardening

Issue IDs: `C5`, `S3`, `S17`, `S18`, `S19`, `M2`

Purpose:

- isolate benchmark-runner runtime changes from platform-api work
- treat blocking async behavior and adapter lifecycle as one seam

### Workstream 6: Frontend UX and Local State Cleanup

Issue IDs: `S21`, `M4`, `M5`, `M8`, `M9`

Purpose:

- finish low-risk UI/state cleanup after backend contracts are stable

### Dedicated Follow-On Plan: Crypto Derivation Migration

Issue IDs: `C2`

Purpose:

- design and approve a compatibility-safe migration from the current single-pass derivation contract to a stronger KDF-based scheme
- define read/write compatibility, backfill strategy, and rollback behavior before any code changes

This is intentionally last. It has the highest blast radius and the weakest “quick refactor” shape.

---

## Task Plan

### Task 1: Stabilize checklist hygiene and backend test isolation

**File(s):**
- [services/platform-api/tests/conftest.py](/E:/writing-system/services/platform-api/tests/conftest.py)
- [docs/refactor-issue-checklist.md](/E:/writing-system/docs/refactor-issue-checklist.md)

- **Step 1:** Add an autouse fixture that clears `get_settings()` cache between tests.
- **Step 2:** Mark `S1`, `S4`, `S16`, and `S23` as resolved/obsolete in the checklist so the implementation tracker matches repo reality.
- **Test command:** `cd services/platform-api && pytest -q`
- **Expected output:** backend suite passes without cache-order coupling regressions.
- **Commit:** `chore: stabilize settings cache tests and refresh refactor checklist`

### Task 2A: Fix CORS and benchmark write authorization

**File(s):**
- [services/platform-api/app/main.py](/E:/writing-system/services/platform-api/app/main.py)
- [services/platform-api/app/api/routes/agchain_benchmarks.py](/E:/writing-system/services/platform-api/app/api/routes/agchain_benchmarks.py)

- **Step 1:** Replace wildcard credentialed CORS with explicit configured origins.
- **Step 2:** Require superuser auth on benchmark mutation endpoints.
- **Test command:** `cd services/platform-api && pytest -q tests/test_agchain_benchmarks.py`
- **Expected output:** benchmark route tests pass and mutation endpoints are no longer user-auth writable.
- **Commit:** `fix: tighten cors and benchmark mutation auth`

### Task 2B: Remove internal error detail leaks

**File(s):**
- [services/platform-api/app/api/routes/admin_storage.py](/E:/writing-system/services/platform-api/app/api/routes/admin_storage.py)
- [services/platform-api/app/api/routes/storage.py](/E:/writing-system/services/platform-api/app/api/routes/storage.py)
- [services/platform-api/app/api/routes/connections.py](/E:/writing-system/services/platform-api/app/api/routes/connections.py)
- [services/platform-api/app/domain/agchain/model_registry.py](/E:/writing-system/services/platform-api/app/domain/agchain/model_registry.py)

- **Step 1:** Replace user-facing `str(exc)` responses with generic messages.
- **Step 2:** Move connection test operator detail to server-side logs only.
- **Test command:** `cd services/platform-api && pytest -q tests/test_connections.py tests/test_storage_routes.py tests/test_agchain_models.py`
- **Expected output:** targeted suites pass and callers no longer receive raw internal errors/logs.
- **Commit:** `fix: sanitize leaked platform api and probe errors`

### Task 2C: Fix connection merge and disconnect contract behavior

**File(s):**
- [services/platform-api/app/infra/connection.py](/E:/writing-system/services/platform-api/app/infra/connection.py)
- [services/platform-api/app/api/routes/connections.py](/E:/writing-system/services/platform-api/app/api/routes/connections.py)

- **Step 1:** Replace blind credential/metadata merge with explicit merge semantics.
- **Step 2:** Make disconnect return the correct not-found behavior.
- **Test command:** `cd services/platform-api && pytest -q tests/test_connections.py`
- **Expected output:** connection route tests pass with explicit merge and disconnect behavior.
- **Commit:** `fix: harden connection merge and disconnect semantics`

### Task 2D: Tighten secret and variable input validation

**File(s):**
- [services/platform-api/app/api/routes/secrets.py](/E:/writing-system/services/platform-api/app/api/routes/secrets.py)
- [services/platform-api/app/api/routes/variables.py](/E:/writing-system/services/platform-api/app/api/routes/variables.py)
- [services/platform-api/app/api/routes/agchain_models.py](/E:/writing-system/services/platform-api/app/api/routes/agchain_models.py)

- **Step 1:** Validate `value_kind` on secret PATCH.
- **Step 2:** Reject empty secret PATCH bodies.
- **Step 3:** Tighten path parameter typing on affected routes.
- **Test command:** `cd services/platform-api && pytest -q tests/test_secrets.py tests/test_agchain_models.py`
- **Expected output:** invalid inputs fail at the request-validation layer instead of leaking through to storage.
- **Commit:** `fix: tighten secret, variable, and model route validation`

### Task 3: Harden crypto, connection, and observability helper seams

**File(s):**
- [services/platform-api/app/infra/crypto.py](/E:/writing-system/services/platform-api/app/infra/crypto.py)
- [services/platform-api/app/infra/connection.py](/E:/writing-system/services/platform-api/app/infra/connection.py)
- [services/platform-api/app/observability/contract.py](/E:/writing-system/services/platform-api/app/observability/contract.py)
- [services/platform-api/app/observability/otel.py](/E:/writing-system/services/platform-api/app/observability/otel.py)
- [services/platform-api/app/observability/storage_metrics.py](/E:/writing-system/services/platform-api/app/observability/storage_metrics.py)
- [services/platform-api/app/api/routes/agchain_models.py](/E:/writing-system/services/platform-api/app/api/routes/agchain_models.py)
- [services/platform-api/app/api/routes/agchain_benchmarks.py](/E:/writing-system/services/platform-api/app/api/routes/agchain_benchmarks.py)

- **Step 1:** Add explicit plaintext fallback warning/counter behavior and lock the new counter name in `contract.py`.
- **Step 2:** Stop swallowing broad decrypt exceptions silently.
- **Step 3:** Remove unnecessary `json_mod` alias and duplicate sampler/helper patterns.
- **Step 4:** Move remaining storage metric names to observability contract constants.
- **Step 5:** Ensure any sync connection resolution from async callers is moved behind a safe boundary.
- **Test command:** `cd services/platform-api && pytest -q tests/test_observability.py tests/test_connections.py`
- **Expected output:** observability and connection tests pass with new warning/counter behavior.
- **Commit:** `fix: harden crypto fallback and observability helper seams`

### Task 4: Repair storage durability and DB function hygiene

**File(s):**
- [services/platform-api/app/api/routes/storage.py](/E:/writing-system/services/platform-api/app/api/routes/storage.py)
- [services/platform-api/app/services/storage_source_documents.py](/E:/writing-system/services/platform-api/app/services/storage_source_documents.py)
- [web/src/lib/storageUploadService.ts](/E:/writing-system/web/src/lib/storageUploadService.ts)
- [supabase/migrations/20260321130000_storage_source_document_bridge.sql](/E:/writing-system/supabase/migrations/20260321130000_storage_source_document_bridge.sql)
- `supabase/migrations/<new>_drop_old_reserve_user_storage_overload.sql`

- **Step 1:** Make storage completion resilient when the source-document bridge fails after the reservation completes.
- **Step 2:** Remove or use `storage_object_id` consistently in the bridge helper.
- **Step 3:** Drop the old `reserve_user_storage` overload before recreating the current signature.
- **Step 4:** Reassess the non-streaming hash path in the upload client and either harden or document the fallback.
- **Test command:** `cd services/platform-api && pytest -q tests/test_storage_routes.py tests/test_storage_source_documents.py`
- **Expected output:** storage completion tests pass and migration history contains a single current `reserve_user_storage` signature.
- **Commit:** `fix: harden storage completion bridge and reservation function contract`

### Task 5A: Fix AG chain model registry scale and list contract

**File(s):**
- [services/platform-api/app/domain/agchain/model_registry.py](/E:/writing-system/services/platform-api/app/domain/agchain/model_registry.py)
- [web/src/lib/agchainModels.ts](/E:/writing-system/web/src/lib/agchainModels.ts)
- [web/src/pages/agchain/AgchainModelsPage.tsx](/E:/writing-system/web/src/pages/agchain/AgchainModelsPage.tsx)
- [web/src/components/agchain/models/AgchainModelsTable.tsx](/E:/writing-system/web/src/components/agchain/models/AgchainModelsTable.tsx)

- **Step 1:** Replace per-row credential resolution with batched queries.
- **Step 2:** Add backward-compatible pagination to the model-target list contract and frontend consumer.
- **Step 3:** Align frontend badge maps with backend status vocabulary.
- **Test command:** `cd services/platform-api && pytest -q tests/test_agchain_models.py && cd E:\\writing-system\\web && npm run test -- AgchainModelsPage AgchainModelsTable`
- **Expected output:** model-target backend/frontend tests pass and the paginated response still preserves `items`.
- **Commit:** `fix: harden agchain model registry list semantics`

### Task 5B: Fix AG chain benchmark correctness and atomic reorder

**File(s):**
- [services/platform-api/app/domain/agchain/benchmark_registry.py](/E:/writing-system/services/platform-api/app/domain/agchain/benchmark_registry.py)
- `supabase/migrations/<new>_agchain_benchmark_step_reorder_atomic_rpc.sql`

- **Step 1:** Replace per-benchmark selected-model counting with batched resolution.
- **Step 2:** Make benchmark slug conflicts return a contract-safe conflict response.
- **Step 3:** Implement benchmark reorder atomicity through the dedicated RPC migration.
- **Test command:** `cd services/platform-api && pytest -q tests/test_agchain_benchmarks.py`
- **Expected output:** benchmark tests pass and reorder writes no longer rely on Python-side row-by-row updates.
- **Commit:** `fix: harden agchain benchmark registry writes and counts`

### Task 5C: Finish benchmark pagination consumption

**File(s):**
- [web/src/lib/agchainBenchmarks.ts](/E:/writing-system/web/src/lib/agchainBenchmarks.ts)
- [web/src/hooks/agchain/useAgchainBenchmarks.ts](/E:/writing-system/web/src/hooks/agchain/useAgchainBenchmarks.ts)
- [web/src/pages/agchain/AgchainBenchmarksPage.tsx](/E:/writing-system/web/src/pages/agchain/AgchainBenchmarksPage.tsx)

- **Step 1:** Add backward-compatible pagination consumption to the benchmark list frontend path.
- **Step 2:** Preserve the current `items` rendering contract while introducing pagination state.
- **Test command:** `cd E:\\writing-system\\web && npm run test -- AgchainBenchmarksPage`
- **Expected output:** benchmark page tests pass and the list renders the paginated response correctly.
- **Commit:** `fix: consume paginated agchain benchmark list contract`

### Task 6: Fix Legal-10 runtime/backend seam

**File(s):**
- [runtime/execution_backend.py](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/execution_backend.py)
- [runtime/runtime_config.py](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/runtime_config.py)
- [runtime/inspect_backend.py](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/inspect_backend.py)
- [adapters/model_adapter.py](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/adapters/model_adapter.py)
- [run_3s.py](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py)

- **Step 1:** Move blocking adapter calls off the event loop.
- **Step 2:** Make phase-gated profile rejection explicit at the `from_profile()` seam.
- **Step 3:** Reuse model clients and make Anthropic/Inspect role handling deterministic.
- **Step 4:** Replace or explicitly document hand-rolled `.env` parsing.
- **Test command:** `cd E:\\writing-system && pytest -q _agchain/legal-10/tests`
- **Expected output:** Legal-10 runtime tests pass without blocking-call regressions or role-handling failures.
- **Commit:** `fix: harden legal-10 runtime execution backends`

### Task 7: Finish low-risk frontend cleanup

**File(s):**
- [web/src/hooks/useDirectUpload.ts](/E:/writing-system/web/src/hooks/useDirectUpload.ts)
- [web/src/pages/settings/SettingsSecrets.tsx](/E:/writing-system/web/src/pages/settings/SettingsSecrets.tsx)
- [web/src/router.tsx](/E:/writing-system/web/src/router.tsx)
- [web/src/components/shell/LeftRailShadcn.tsx](/E:/writing-system/web/src/components/shell/LeftRailShadcn.tsx)
- [web/src/lib/agchainBenchmarks.ts](/E:/writing-system/web/src/lib/agchainBenchmarks.ts)
- [web/src/components/agchain/benchmarks/AgchainBenchmarkStepInspector.tsx](/E:/writing-system/web/src/components/agchain/benchmarks/AgchainBenchmarkStepInspector.tsx)
- any directly associated Vitest files

- **Step 1:** Remove stale closure behavior in direct upload.
- **Step 2:** Add confirmation before destructive secret deletes.
- **Step 3:** Remove dead conditionals and unconditional notification affordances.
- **Step 4:** Catch and surface benchmark step-config JSON parse failures in both the parsing library and the inspector UI.
- **Test command:** `cd E:\\writing-system\\web && npm run test`
- **Expected output:** frontend suite passes and no user-facing regressions remain in the cleaned surfaces.
- **Commit:** `fix: finish frontend state and ux cleanup`

### Task 8: Write the dedicated crypto migration plan before touching KDF behavior

**File(s):**
- [docs/refactor-issue-checklist.md](/E:/writing-system/docs/refactor-issue-checklist.md)
- new dedicated crypto migration plan file

- **Step 1:** Investigate Deno/Python interop, ciphertext read compatibility, write compatibility, and rollout/backfill strategy for `C2`.
- **Step 2:** Draft a dedicated approved plan for KDF migration rather than mixing it into the checklist hardening pass.
- **Test command:** none
- **Expected output:** a separate implementation plan exists for the KDF migration with explicit compatibility and rollback rules.
- **Commit:** `docs: plan crypto derivation migration separately from checklist remediation`

---

## Completion Criteria

- Every checklist item is either fixed, explicitly marked stale/resolved/obsolete, or split into a dedicated follow-on plan.
- No security-critical issue (`C1`–`C7`) remains open.
- Storage and benchmark write paths are no longer vulnerable to the currently verified correctness failures.
- Legal-10 runtime adapters no longer hide the currently verified blocking/role-handling issues.
- Frontend cleanup lands only after the owning backend/runtime contracts are stable.
- `C2` is not implemented ad hoc; it is either still intentionally deferred or covered by a separately approved migration plan.

---

## Why This Order Is Optimal

1. Security and API contract fixes come first because they reduce immediate exposure and set the contracts later batches must obey.
2. Crypto helper hardening follows, but the KDF migration itself is isolated so deployed ciphertext compatibility is never changed under cleanup pressure.
3. Storage durability lands before AG chain performance and frontend polish because it risks silent data loss.
4. AG chain registry/benchmark fixes are grouped so auth, N+1s, reorder semantics, and badge vocabulary settle together.
5. Legal-10 runtime work is isolated from platform-api changes because it touches a different execution seam and test surface.
6. Frontend cleanup is last because it depends on settled backend/runtime contracts and has the lowest operational risk.
