# Refactor Issue Checklist

Issues identified by blind implementation review of 15 commits (`78ebb2e3..daef141d` + uncommitted work, 2026-03-27). Covers: OTel contract, RuntimeConfig, auth/secrets separation, crypto, InspectAI execution backend, agchain profiles, agchain models/benchmarks surfaces, storage signup verification, migrations, frontend shell/router.

**Fix plan:** `docs/plans/2026-03-27-blind-review-refactor-fix-plan.md`

**Investigation note (S16 invalidated):** The `user_variables` uppercase migration is safe — the unique index on `(user_id, lower(name))` already prevents case-colliding rows at insert time. Removed from the plan.

## Critical

- [ ] **C1. CORS allows all origins with credentials.** `services/platform-api/app/main.py:88-94` sets `allow_origins=["*"]` with `allow_credentials=True`. Starlette works around the spec violation by reflecting the request origin, making every origin trusted for credentialed requests. Replace `"*"` with the explicit allowed origins list.

- [ ] **C2. Weak key derivation in crypto — no salt, no proper KDF.** `services/platform-api/app/infra/crypto.py:25-26` uses `hashlib.sha256(secret + context)` — a single-pass hash with no salt and no iterations. Acceptable for Deno interop, but should be documented with a migration path toward HKDF.

- [ ] **C3. Plaintext fallback silently returns unencrypted data.** `services/platform-api/app/infra/crypto.py:43-44` returns `ciphertext` verbatim when it doesn't start with `enc:v1:`. No logging, no metric. An attacker who can write to the DB column bypasses encryption entirely. Add a log warning and metric counter for the plaintext fallback path.

- [ ] **C4. Missing authorization on benchmark mutation endpoints.** `services/platform-api/app/api/routes/agchain_benchmarks.py` — `create_benchmark_route` (line 130), `create_benchmark_step_route` (193), `update_benchmark_step_route` (228), `reorder_benchmark_steps_route` (266), `delete_benchmark_step_route` (299) all use `require_user_auth` instead of `require_superuser`. Compare with `agchain_models.py` where writes correctly require superuser. Any authenticated user can mutate benchmarks.

- [ ] **C5. `DirectBackend.execute()` blocks the event loop.** `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/execution_backend.py:32` — the `async` method calls `self._adapter.call_model()` synchronously (blocking HTTP call). Use `asyncio.to_thread()` or `loop.run_in_executor()`.

- [ ] **C6. Internal error details leaked to API consumers in multiple routes.** Exception `str(exc)` is forwarded verbatim to HTTP responses in: `services/platform-api/app/api/routes/admin_storage.py:235,272` (SQL errors), `services/platform-api/app/api/routes/storage.py:359` (GCS errors), `services/platform-api/app/domain/agchain/model_registry.py:398` (health probe errors with internal URLs/IPs). Replace with generic messages; log the details server-side.

- [ ] **C7. Credential metadata merging can be poisoned.** `services/platform-api/app/infra/connection.py:37` — `return {**metadata, **creds}` merges user-writable `metadata_jsonb` with decrypted credentials. Keys in the credential blob could shadow metadata keys or vice versa. Use explicit key selection instead of blind dict merge.

## Significant

- [ ] **S1. Protocol whitelist guard is uncommitted.** The `_SUPPORTED_PROTOCOLS` check in `services/platform-api/app/observability/otel.py` (rejects gRPC) and its two tests exist only in the working tree. Commit them.

- [ ] **S2. Duplicate sampler imports in otel.py.** `configure_telemetry()` at `services/platform-api/app/observability/otel.py:48-53` imports `ALWAYS_OFF`, `ALWAYS_ON`, `ParentBased`, `TraceIdRatioBased` but they are unused — `_build_sampler()` at line 140-145 does its own imports. Remove the dead imports.

- [ ] **S3. `from_profile()` silently translates values it will immediately reject.** `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/runtime_config.py:74-101` maps `"standard"` and `"mcp"` through `_TOOL_MODE_MAP`, then the phase-gate validator rejects them. Either raise with a phase-specific message in `from_profile()` before construction, or document the behavior and add a test for the rejection path.

- [ ] **S4. SigNoz cluster.xml hostname mismatch is uncommitted.** Committed `docker/signoz/clickhouse/cluster.xml` references `zookeeper-1` but docker-compose names the service `zookeeper`. The fix exists only in the working tree. Commit it.

- [ ] **S5. `get_settings()` cache leaks between tests.** `lru_cache(maxsize=1)` on `get_settings()` with manual `cache_clear()` in tests is fragile. Add a `conftest.py` auto-clearing fixture.

- [ ] **S6. `UpdateSecretRequest.value_kind` is unvalidated.** `services/platform-api/app/api/routes/secrets.py:89` uses bare `str | None` instead of the `SecretValueKind` Literal used on create. PATCH can set `value_kind` to any arbitrary string.

- [ ] **S7. `disconnect` does not verify the row exists.** `services/platform-api/app/api/routes/connections.py:84-91` returns `{"ok": True}` even when no matching row was found/deleted.

- [ ] **S8. `resolve_connection_sync` blocks the event loop.** `services/platform-api/app/infra/connection.py:9` is synchronous but called from an async route. Should use `asyncio.to_thread()` or be made async.

- [ ] **S9. Connection test endpoint exposes internal error details.** `services/platform-api/app/api/routes/connections.py:107-108` returns `plugin.test_connection(creds)` results (including `logs`) directly, which may contain connection strings or stack traces.

- [ ] **S10. N+1 query in `list_model_targets`.** `services/platform-api/app/domain/agchain/model_registry.py:155-166` calls `_resolve_credential_status` per row, each executing a Supabase query.

- [ ] **S11. N+1 query in `list_benchmarks` for `selected_eval_model_count`.** `services/platform-api/app/domain/agchain/benchmark_registry.py:259` calls `_get_selected_eval_model_count` per benchmark row.

- [ ] **S12. Race condition in step reorder.** `services/platform-api/app/domain/agchain/benchmark_registry.py:502-505` updates `step_order` one row at a time with no transaction. Concurrent reorder requests or mid-loop crashes leave `step_order` inconsistent.

- [ ] **S13. Benchmark slug collision not handled gracefully.** `services/platform-api/app/domain/agchain/benchmark_registry.py:292-304` — duplicate `benchmark_slug` insert fails with raw Postgres error instead of 409 Conflict.

- [ ] **S14. Health badge map uses wrong keys.** `web/src/components/agchain/models/AgchainModelsTable.tsx:31-36` has `unhealthy` key but the DB/Python code uses `error`. The `AUTH_BADGE` map at line 38-42 has `configured` instead of `ready`. Badge colors will not render correctly.

- [ ] **S15. Source document upsert failure silently loses the bridge.** `services/platform-api/app/api/routes/storage.py:506-517` — if `upsert_source_document` fails after the `complete_user_storage_upload` RPC succeeds, the upload is marked done but the `source_documents` row is never written. No recovery mechanism exists.

- [ ] **S16. Bulk uppercase rename migration has no collision handling.** `supabase/migrations/20260327110000_user_secret_store_hardening.sql:3-4` — `UPDATE SET name = upper(name)` will fail with a unique constraint violation if two secrets for the same user differ only by case (e.g., `api_key` and `API_KEY`).

- [ ] **S17. `OpenAIAdapter` and `AnthropicAdapter` create new HTTP clients on every call.** `_agchain/legal-10/runspecs/3-STEP-RUN/adapters/model_adapter.py:56,91` — wastes connection pools, prevents reuse. Move client creation to `__init__`.

- [ ] **S18. `AnthropicAdapter` silently uses only the last system message.** `_agchain/legal-10/runspecs/3-STEP-RUN/adapters/model_adapter.py:94-100` — if multiple system messages exist, earlier ones are silently dropped.

- [ ] **S19. `InspectBackend` does not handle the `"assistant"` role.** `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/inspect_backend.py:65-76` — raises `ValueError` for any role other than `"system"` and `"user"`.

- [ ] **S20. Source document bridge accepts then discards `storage_object_id`.** `services/platform-api/app/services/storage_source_documents.py:16` — the function accepts `storage_object_id` as a required parameter then immediately `del`s it. Either remove the parameter or use it.

- [ ] **S21. `useDirectUpload` stale closure over `files` state.** `web/src/hooks/useDirectUpload.ts:63` — `startUpload` captures `files` from the render snapshot. Files added/removed during an upload are not reflected.

- [ ] **S22. `decrypt_with_fallback` swallows all exceptions silently.** `services/platform-api/app/infra/crypto.py:78-81,87-90` — bare `except Exception: pass` blocks swallow unexpected errors. Log the exception type at minimum.

- [ ] **S23. Settings Connections panel uses stale `function_name` values for live test calls.** `web/src/pages/settings/ConnectionsPanel.tsx:36,50,157` still sends `gcs_list` and `arangodb_load` to `POST /connections/test`, but the current backend registry resolves `load_gcs_list_objects` and `load_arango_batch_insert`. In production this makes the UI Test action fail with `Function ... not found` even though the backend fallback path itself works.

## Minor

- [ ] **M1. `_build_sampler` silently falls back to ALWAYS_ON for unknown names.** `services/platform-api/app/observability/otel.py:154`. Add a `logger.warning()`.

- [ ] **M2. Runner `.env` parsing is hand-rolled.** `_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py:28-33`. Replace with `python-dotenv` or document limitation.

- [ ] **M3. Storage metric names are inline strings, not contract constants.** `services/platform-api/app/observability/storage_metrics.py:10-28`. Promote to `contract.py`.

- [ ] **M4. Notification bell dot unconditionally rendered.** `web/src/components/shell/LeftRailShadcn.tsx:799`. Wire to state or remove.

- [ ] **M5. No delete confirmation in secrets frontend.** `web/src/pages/settings/SettingsSecrets.tsx:127` — `handleDelete` immediately calls `deleteSecret` with no confirmation dialog.

- [ ] **M6. `model_target_id` and `secret_id` path parameters have no UUID format validation.** `services/platform-api/app/api/routes/agchain_models.py:121`, `services/platform-api/app/api/routes/secrets.py:146,194`. Invalid strings produce raw Postgres errors (500) instead of 422.

- [ ] **M7. `_set_span_attrs` helper duplicated across files.** Identical function in `agchain_models.py:70-73` and `agchain_benchmarks.py:84-87`. Extract to shared utility.

- [ ] **M8. Dead conditional in router.** `web/src/router.tsx:62-63` — `const target = projectId ? '/app/transform' : '/app/transform'` — both branches identical.

- [ ] **M9. `stepFormValuesToDraft` does not handle JSON parse errors.** `web/src/lib/agchainBenchmarks.ts:256` — `JSON.parse` throws raw `SyntaxError` for invalid JSON in the step config textarea.

- [ ] **M10. `storageUploadService.ts` reads entire file into memory for SHA-256 on non-streaming path.** Line 130 calls `file.arrayBuffer()` which loads the full file. For 1 GB max file size, this causes OOM in browsers without streaming support.

- [ ] **M11. `reserve_user_storage` function overload not dropped.** `supabase/migrations/20260321130000_storage_source_document_bridge.sql` uses `CREATE OR REPLACE` with new parameters but doesn't `DROP` the old signature. Both overloads may coexist.

- [ ] **M12. `json` aliased as `json_mod` unnecessarily in connections.py.** `services/platform-api/app/api/routes/connections.py:7` — no naming conflict exists.

- [ ] **M13. `_b64url_encode` re-implements `base64.urlsafe_b64encode`.** `services/platform-api/app/infra/crypto.py:13-14`. Use the stdlib function.

- [ ] **M14. Empty PATCH body sends empty update to Supabase.** `services/platform-api/app/api/routes/secrets.py:154` — when all fields are `None`, `model_dump(exclude_none=True)` produces `{}`. Guard for "nothing to update."

- [ ] **M15. No pagination on model targets or benchmarks list endpoints.** `services/platform-api/app/domain/agchain/model_registry.py:156`, `benchmark_registry.py:203`. Both `SELECT *` with no limit.
