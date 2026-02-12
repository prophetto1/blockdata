# Progress Log - 2026-02-12

Running log of work completed during this development cycle.

---

## Priority 2: Worker/Run Runtime Reliability - PASSED

The new Anthropic API key is working. All remaining Priority 2 runtime checks are now complete.

### Key save + validation
- `POST /functions/v1/user-api-keys` saved encrypted key (suffix `RwAA`)
- `POST /functions/v1/test-api-key` returned `valid=true`
- `user_api_keys.is_valid=true`

### Happy path
- Run `ab8a3b40-757c-473f-a0c8-65ac007f74bc`
- Worker succeeded (`succeeded=1`, `remaining_pending=0`)
- Run rollup: `status=complete`, `completed_blocks=1`, `failed_blocks=0`

### Retry / terminal failure path
- Run `7f50cdcb-f897-4566-bb87-de2f62e79884`
- Forced with invalid `model_override`
- Attempts progressed 1 -> 2 -> 3, then overlay failed
- Run rollup: `status=complete`, `completed_blocks=0`, `failed_blocks=1`

### Cancellation proof (remains valid)
- Run `5b471112-957b-4e93-9beb-2e0a123952ee`

### Docs updated
- `docs/ongoing-tasks/complete/0211-worker-runtime-reliability.md`
- `docs/ongoing-tasks/0211-core-priority-queue-and-optimization-plan.md`
- `docs/ongoing-tasks/0211-core-workflows-before-assistant-plan.md`
- `docs/ongoing-tasks/0211-session-handoff-resume-guide.md`

### Infra note
Deployed `user-api-keys` edge function (v2) with `verify_jwt=false` because gateway JWT verification was rejecting normal user tokens as Invalid JWT. The function still enforces auth internally via `requireUserId()`.

---

## Priority 3: Config Registry Lock - PASSED

Priority 3 is now closed with runtime and repo parity checks complete.

### What passed
- Worker fallback defaults aligned to canonical contract (`temperature=0.3`) and deployed as `worker` v7.
- `user-api-keys` PATCH path now enforces provider-aware `base_url` validation parity and deployed as `user-api-keys` v3.
- Runtime migration parity restored by adding `supabase/migrations/20260211091818_add_base_url_multi_provider.sql`.
- Claim ordering rule codified and verified through migration `20260212004639_017_claim_overlay_batch_block_index_ordering.sql`.
- Transactional claim-order probe confirmed numeric `block_index` ordering.

### Docs updated
- `docs/ongoing-tasks/0211-admin-config-registry.md`
- `docs/ongoing-tasks/0211-core-priority-queue-and-optimization-plan.md`
- `docs/ongoing-tasks/0211-core-workflows-before-assistant-plan.md`
- `docs/ongoing-tasks/0211-session-handoff-resume-guide.md`

---

## Priority 4: Prompt Caching - PASSED (Corrective Cycle)

Priority 4 is now closed after a corrective rerun with benchmark and SQL parity evidence.

### What passed
- Resolved Edge Function JWT gateway mismatch for asymmetric user JWTs by setting:
  - `worker` to `verify_jwt=false` (deployed as `worker` v9)
  - `schemas` to `verify_jwt=false` (deployed as `schemas` v12)
- Preserved function-level auth safety in `worker`:
  - internal `requireUserId(req)` gate
  - run ownership check (`run.owner_id` must equal requester)
- Corrective benchmark pair completed:
  - OFF run: `7af1b494-ad4b-401c-9bcb-e59386b9760b`
  - ON run: `3e9dab67-9ede-491e-b50c-86642d78ad39`
- Cache telemetry and savings validated:
  - `cache_creation_input_tokens=1633`
  - `cache_read_input_tokens=45724`
  - `estimated_cost_usd_reduction_pct=50.24`
- SQL parity query validated no material output regression:
  - `material_mismatch_blocks=0` across `action`, `final.format`, and `final.content`.

### Evidence
- `docs/ongoing-tasks/0211-worker-optimization-benchmark-results.md`
- `scripts/logs/prompt-caching-benchmark-20260211-191241.json`
- `scripts/benchmark-worker-prompt-caching.ps1`
- `supabase/functions/worker/index.ts`

---

## Priority 5: Adaptive Multi-Block Batching - PASSED

### Runtime closure
- Completed batching hardening in `supabase/functions/worker/index.ts`:
  - richer batch parse diagnostics (`missing/unexpected/duplicate block_uids`, `stopReason`, parse issue flags)
  - flattened batched tool schema/result shape for deterministic mapping behavior
  - schema-aware output budgeting with text-heavy pack caps
  - recursive missing-subset retry/split behavior
  - low-credit (`402`) handling via `ProviderBalanceError` with claim release
- Kept single-block fallback and per-block retry/fail semantics intact.
- Deployed worker through version `15` with `verify_jwt=false` and internal auth enforcement.

### Final benchmark evidence
- Extraction suite artifact: `scripts/logs/worker-batching-benchmark-20260211-224355.json`
  - runs: `30be5896-41a8-4898-a576-c9f919d9f2a2` (baseline), `43025920-fe19-4a32-ba94-db293a1bb4c4` (pack10), `b2a72e9d-e984-4a2c-815a-947fc19590ab` (pack25)
  - call_count: `29 -> 4 -> 2`
  - cost reduction: `40.77%` (pack10), `46.73%` (pack25)
  - material parity vs baseline: `0` mismatch blocks
- Revision-heavy suite artifact: `scripts/logs/worker-batching-benchmark-20260211-224635.json`
  - runs: `86e75cc0-2d28-45f7-864f-e223d295918f` (baseline), `e64b5774-186b-4899-ad09-a6def2501733` (pack10), `ca55b7ff-8fd4-47c0-848a-8858d0fc1a06` (pack25)
  - call_count: `29 -> 6 -> 6`
  - cost reduction: `17.18%` (pack10 and pack25)
  - split_events: `0` in batched runs
  - material parity vs baseline (`action`, `final.format`, `final.content`): `0` mismatch blocks

### Tracker updates
- Marked Priority 5 as `Passed` in `docs/ongoing-tasks/0211-core-priority-queue-and-optimization-plan.md`.
- Updated Priority 5 prep/spec doc with final gate evidence.
- Updated session handoff docs to move active queue focus to Priority 6.

---

## Next

1. Start Priority 7 schema core workflow closure (`meta-configurator-integration/spec.md` path).
2. Capture deterministic wizard/save/fork/conflict (`409`) evidence and update the gate ledger.
3. Keep queue sequencing strict: Priority 8 stays blocked until Priority 7 is `Passed`.

---

## Priority 6: Admin/Superuser Optimization Controls - PASSED

### Backend control-plane foundation added
- Added migration `supabase/migrations/20260212114500_018_admin_runtime_policy_controls.sql`:
  - `admin_runtime_policy` table for mutable runtime policy values
  - `admin_runtime_policy_audit` table for `who/when/from/to/reason`
  - seeded defaults aligned to current worker/runtime behavior
- Added shared policy loader/validator:
  - `supabase/functions/_shared/admin_policy.ts`
- Added superuser auth helper:
  - `supabase/functions/_shared/superuser.ts` (email allowlist gate)
- Added superuser edge API:
  - `supabase/functions/admin-config/index.ts` (`GET` policies/audit, `PATCH/PUT` updates + audit writes)

### Run snapshot + worker consumption wiring added
- Updated `supabase/functions/runs/index.ts`:
  - loads effective admin policy at run creation
  - writes `model_config.policy_snapshot` + `policy_snapshot_at`
  - preserves per-run model overrides while snapshotting platform defaults
- Updated `supabase/functions/worker/index.ts`:
  - resolves batching/caching/runtime defaults from `run.model_config.policy_snapshot`
  - keeps request overrides as highest precedence for explicit invocations
  - keeps env defaults as fallback if snapshot is absent (backward compatibility)

### Superuser page scaffold added
- Added `web/src/pages/SuperuserSettings.tsx`:
  - single superuser-only control page model
  - category side-nav (`Models`, `Worker`, `Upload`, `Audit History`)
  - per-key editing + save with optional reason
  - audit history viewer
- Added route:
  - `web/src/router.tsx` -> `/app/settings/superuser`
- Added settings entry-point button:
  - `web/src/pages/Settings.tsx`

### Validation notes
- Web TypeScript compile passed: `npx tsc -b --pretty false` (in `web/`).
- `npm --prefix web run lint` still reports existing baseline errors in unrelated files (`AuthContext.tsx`, `useDocuments.ts`, `Projects.tsx`); no new lint-specific blocker introduced by P6 changes.

### Runtime closure proof (2026-02-12)
- Remote deploy completed:
  - `SUPERUSER_EMAIL_ALLOWLIST` set via `supabase secrets set`
  - edge functions deployed: `admin-config`, `runs`, `worker` (`verify_jwt=false`, internal auth retained)
- Migration `018_admin_runtime_policy_controls` applied to remote runtime via Supabase management SQL API and recorded in migration history.
- Runtime storage verified:
  - `admin_runtime_policy` row count = `19`
  - `admin_runtime_policy_audit` writing works via `admin-config` PATCH
- New-run policy uptake proof:
  - toggled `worker.prompt_caching.enabled` from `true` to `false`
  - run `d9e80ff2-a61a-49d4-a093-89a7b4b0421e` snapshot = `true` (pre-toggle)
  - run `63cfa335-7f99-4cc0-a3ca-a8ca4d60a7d9` snapshot = `false` (post-toggle)
- Mid-run snapshot drift prevention proof:
  - run `640cf4b0-6c6f-445b-bd13-ae80c1f2e73f` created under `false`
  - worker call #1 -> `prompt_caching=false`, `remaining_pending=24`
  - policy restored globally to `true`
  - worker call #2 on same run -> `prompt_caching=false`, `remaining_pending=19`
- Audit visibility proof:
  - both toggles returned audit entries in `GET /functions/v1/admin-config`
  - UI consumes same audit payload in `web/src/pages/SuperuserSettings.tsx` (`auditRows` rendering).

---

## Priority 7: Contract Consolidation (Pre-Implementation)

Created a merged, execution-level Priority 7 contracts document:

- `docs/ongoing-tasks/0212-priority7-schema-contracts-master-spec.md`

This consolidates and normalizes scattered schema-flow requirements from:

- `docs/ongoing-tasks/meta-configurator-integration/spec.md`
- `docs/ongoing-tasks/meta-configurator-integration/status.md`
- `docs/ongoing-tasks/0210-schema-wizard-and-ai-requirements.md`
- queue/workflow gate docs for Priority 7

Key outcomes:

1. Locked five-branch schema creation pipeline (templates, existing-fork, scratch wizard, upload JSON, advanced editor).
2. Locked single save boundary (`POST /schemas`) with current runtime status semantics (`200` create/idempotent, `409` conflict).
3. Locked worker/grid compatibility contract (`properties` + optional `prompt_config`).
4. Added deterministic implementation phasing and evidence matrix to avoid rework.
