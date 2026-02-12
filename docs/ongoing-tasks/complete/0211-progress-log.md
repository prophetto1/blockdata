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

## Priority 5: Adaptive Multi-Block Batching - IN PROGRESS

### Runtime integration completed locally
- Replaced per-block processing loop with pack-based processing in `supabase/functions/worker/index.ts`.
- Wired adaptive pack construction using current env/request controls (`batching_enabled`, `pack_size`, output budget settings).
- Wired batched LLM execution path with per-pack uid validation.
- Added split-and-retry behavior for overflow-like failures and response mapping mismatches.
- Preserved single-block fallback and existing per-block retry/fail semantics.
- Added batching metrics to worker responses:
  - `initial_pack_count`
  - `packs_processed`
  - `split_events`
  - `avg_blocks_per_pack`

### Tracker updates
- Marked Priority 5 as `In Progress` in `docs/ongoing-tasks/0211-core-priority-queue-and-optimization-plan.md`.
- Updated implementation checklist status in `docs/ongoing-tasks/0211-priority5-adaptive-batching-prep-spec.md`.

---

## Next

1. Deploy updated `worker` function and run live smoke checks.
2. Extend benchmark flow for P5 suites (`batching_enabled=false/true`, varying `pack_size`).
3. Capture quality parity + call-count reduction evidence and update gate ledger.
