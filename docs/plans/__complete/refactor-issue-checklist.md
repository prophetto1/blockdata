# Refactor Issue Checklist

Issues identified by blind implementation review of 15 commits (`78ebb2e3..daef141d` + uncommitted work, 2026-03-27). Covers: OTel contract, RuntimeConfig, auth/secrets separation, crypto, InspectAI execution backend, agchain profiles, agchain models/benchmarks surfaces, storage signup verification, migrations, frontend shell/router.

**Execution plan:** `docs/plans/2026-03-27-refactor-issue-checklist-remediation-plan-v2.md`

**Investigation note (S16 invalidated):** The `user_variables` uppercase migration is safe — the unique index on `(user_id, lower(name))` already prevents case-colliding rows at insert time. Removed from the plan.

## Critical

- [x] **C1. CORS allows all origins with credentials.** Resolved. `services/platform-api/app/main.py` now uses the explicit `settings.auth_redirect_origins` list for credentialed CORS.

- [ ] **C2. Weak key derivation in crypto — no salt, no proper KDF.** Deferred. The live `enc:v1` contract is intentionally unchanged in this remediation batch and is now split into the follow-on migration plan below.

- Follow-on plan for `C2`: `docs/plans/2026-03-28-crypto-kdf-migration-plan.md`

- [x] **C3. Plaintext fallback silently returns unencrypted data.** Resolved. The fallback path now logs a warning and increments a dedicated plaintext-fallback counter.

- [x] **C4. Missing authorization on benchmark mutation endpoints.** Resolved. Benchmark mutation routes now require `require_superuser`.

- [x] **C5. `DirectBackend.execute()` blocks the event loop.** Resolved. The sync adapter call now runs via `asyncio.to_thread(...)`.

- [x] **C6. Internal error details leaked to API consumers in multiple routes.** Resolved. These routes now return sanitized errors and log internal details server-side.

- [x] **C7. Credential metadata merging can be poisoned.** Resolved. Connection resolution now backfills only a safe metadata subset instead of doing a blind dict merge.

## Significant

- [x] **S1. Protocol whitelist guard is uncommitted.** Resolved. The `_SUPPORTED_PROTOCOLS` check in `services/platform-api/app/observability/otel.py` (rejects gRPC) and its two tests are now committed.

- [x] **S2. Duplicate sampler imports in otel.py.** Resolved.

- [x] **S3. `from_profile()` silently translates values it will immediately reject.** Resolved. `from_profile()` now rejects future-phase tool modes explicitly before construction.

- [x] **S4. SigNoz cluster.xml hostname mismatch is uncommitted.** Resolved. `docker/signoz/clickhouse/cluster.xml` now matches the compose service name.

- [x] **S5. `get_settings()` cache leaks between tests.** Resolved. The platform-api test harness now auto-clears `get_settings()` between tests.

- [x] **S6. `UpdateSecretRequest.value_kind` is unvalidated.** Resolved. PATCH now uses `SecretValueKind`.

- [x] **S7. `disconnect` does not verify the row exists.** Resolved. Missing rows now return `404 Connection not found`.

- [x] **S8. `resolve_connection_sync` blocks the event loop.** Resolved. Async callers now use the non-blocking boundary.

- [x] **S9. Connection test endpoint exposes internal error details.** Resolved. The response no longer includes raw probe logs or internal error detail.

- [x] **S10. N+1 query in `list_model_targets`.** Resolved. Credential resolution is now batched.

- [x] **S11. N+1 query in `list_benchmarks` for `selected_eval_model_count`.** Resolved. Selected model counts are now batched.

- [x] **S12. Race condition in step reorder.** Resolved. Reorder now uses a dedicated atomic RPC.

- [x] **S13. Benchmark slug collision not handled gracefully.** Resolved. Duplicate slugs now return `409 Conflict`.

- [x] **S14. Health badge map uses wrong keys.** Resolved. The badge maps now match the backend vocabulary.

- [x] **S15. Source document upsert failure silently loses the bridge.** Resolved. Repeated completion now repairs the bridge, and failed bridge writes return a retryable error.

- [x] **S16. Bulk uppercase rename migration has no collision handling.** Obsolete. The `user_variables` unique index on `(user_id, lower(name))` already prevents case-colliding rows at insert time, so the uppercase migration is safe.

- [x] **S17. `OpenAIAdapter` and `AnthropicAdapter` create new HTTP clients on every call.** Resolved. The adapters now reuse cached client instances.

- [x] **S18. `AnthropicAdapter` silently uses only the last system message.** Resolved. All system messages are now preserved deterministically.

- [x] **S19. `InspectBackend` does not handle the `"assistant"` role.** Resolved.

- [x] **S20. Source document bridge accepts then discards `storage_object_id`.** Resolved. The dead parameter was removed.

- [x] **S21. `useDirectUpload` stale closure over `files` state.** Resolved.

- [x] **S22. `decrypt_with_fallback` swallows all exceptions silently.** Resolved. Decrypt failures now log warning detail instead of disappearing silently.

- [x] **S23. Settings Connections panel uses stale `function_name` values for live test calls.** Resolved. `web/src/pages/settings/ConnectionsPanel.tsx` now sends the backend-aligned `load_gcs_list_objects` and `load_arango_batch_insert` values to `POST /connections/test`.

## Minor

- [x] **M1. `_build_sampler` silently falls back to ALWAYS_ON for unknown names.** Resolved.

- [x] **M2. Runner `.env` parsing is hand-rolled.** Resolved. The loader now prefers `python-dotenv` and documents the fallback parser.

- [x] **M3. Storage metric names are inline strings, not contract constants.** Resolved.

- [x] **M4. Notification bell dot unconditionally rendered.** Resolved. The placeholder notifications affordance was removed.

- [x] **M5. No delete confirmation in secrets frontend.** Resolved.

- [x] **M6. `model_target_id` and `secret_id` path parameters have no UUID format validation.** Resolved.

- [x] **M7. `_set_span_attrs` helper duplicated across files.** Resolved. The helper now lives in the shared observability contract.

- [x] **M8. Dead conditional in router.** Resolved.

- [x] **M9. `stepFormValuesToDraft` does not handle JSON parse errors.** Resolved. Invalid JSON now raises a user-safe validation error.

- [x] **M10. `storageUploadService.ts` reads entire file into memory for SHA-256 on non-streaming path.** Resolved for this batch by documenting the non-streaming fallback as a compatibility path with that limitation.

- [x] **M11. `reserve_user_storage` function overload not dropped.** Resolved.

- [x] **M12. `json` aliased as `json_mod` unnecessarily in connections.py.** Resolved.

- [x] **M13. `_b64url_encode` re-implements `base64.urlsafe_b64encode`.** Resolved.

- [x] **M14. Empty PATCH body sends empty update to Supabase.** Resolved.

- [ ] **M15. No pagination on model targets or benchmarks list endpoints.** Partially addressed. Model targets now paginate, but the benchmarks list endpoint still needs the locked paginated response contract.
