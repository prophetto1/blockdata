# 0211 Worker Runtime Reliability (Priority 2)

**Date:** 2026-02-12  
**Status:** Passed (Priority 2 evidence complete)  
**Scope:** Runtime reliability checks for worker claim/release, cancellation, and run-state integrity.

---

## 1) Runtime Baseline

1. Supabase project: `dbdzzhshmigewyprahej`
2. Worker function:
   - slug: `worker`
   - `verify_jwt: true`
   - deployed version after fix: `6`
3. Deterministic test inputs:
   - schema: `82017f64-3833-485f-86af-4d3a61ffc131`
   - conversion (1 block, xlsx): `ceaafa1065f33684e5f10a39e388824c58c3f3f9ba9158766f96dc2a948014ea`
   - owner: `ae4c9b28-b123-4ce3-aa49-bc80ef537221`
4. Key-management function:
   - slug: `user-api-keys`
   - deployed version: `2`
   - runtime setting: `verify_jwt=false` (function still validates bearer via `auth.getUser()`)

---

## 2) RED Repro (Pre-Fix)

## Scenario: No API key path strands claimed overlays

1. Created run: `c92e9e56-5bfb-408d-820e-3796d7fe913b`
2. Invoked worker with valid auth + run_id.
3. Worker response:
   - `{"error":"No API key configured. Set your Anthropic API key in Settings."}`
4. Overlay state observed:
   - `status='claimed'`
   - `claimed_by='worker-c22f0449'`
   - `claimed_at` set
   - `attempt_count=0`
   - `last_error=null`

Result: **Bug confirmed**. No-key path left rows stranded in `claimed`.

---

## 3) Root-Cause Fix Applied

## Code change

File: `supabase/functions/worker/index.ts`

1. Added `releaseClaimed(...)` helper with:
   - strict release query: `run_id + claimed_by + block_uid[]`
   - fallback targeted release query: `run_id + block_uid[]`
   - explicit failure when not all target blocks are released
2. Updated cancellation branch to use the same release helper.
3. Preserved no-key error behavior while guaranteeing claim release first.

## Deployment

1. Deployed worker function to Supabase.
2. Verified active function version is now `6`.

---

## 4) GREEN Verification (Post-Fix)

## Scenario A: No API key path now releases claim

1. Created run: `07c476e5-d2c9-4f6a-84e5-4d34d8d2468b`
2. Invoked worker with run_id.
3. Worker response:
   - `{"error":"No API key configured. Set your Anthropic API key in Settings."}`
4. Overlay state observed:
   - `status='pending'`
   - `claimed_by=null`
   - `claimed_at=null`
   - `attempt_count=0`
   - `last_error='No API key configured. Set your Anthropic API key in Settings.'`

Result: **Pass**. No stranded `claimed` row.

## Scenario A2: Repeated no-key invocation remains stable

1. Created run: `ff1905ba-9044-4f40-8d03-232e001c6cf9`
2. Invoked worker with run_id.
3. Worker response:
   - `{"error":"No API key configured. Set your Anthropic API key in Settings."}`
4. Overlay/run state observed:
   - overlay `status='pending'`, `claimed_by=null`, `attempt_count=0`
   - overlay `last_error='No API key configured. Set your Anthropic API key in Settings.'`
   - run `status='running'`, `completed_blocks=0`, `failed_blocks=0`

Result: **Pass**. No-key path is repeatably non-stranding.

## Scenario B: Cancelled run release still works

1. Created and cancelled run: `5b471112-957b-4e93-9beb-2e0a123952ee`
2. Invoked worker with cancelled run_id.
3. Worker response:
   - `{"message":"Run cancelled","worker_id":"worker-b9a564d9","processed":0}`
4. Overlay state observed:
   - `status='pending'`
   - `claimed_by=null`
   - `claimed_at=null`
   - `attempt_count=0`
   - `last_error=null`

Result: **Pass**.

## Scenario C: Invalid user key path (401) releases claim and marks key invalid

1. Inserted temporary test row in `user_api_keys` for owner `ae4c9b28-b123-4ce3-aa49-bc80ef537221`:
   - provider: `anthropic`
   - key: invalid placeholder (`fake-test-key-invalid`)
2. Created run: `e055acca-30c5-4642-beb4-500f591d05ba`
3. Invoked worker with run_id.
4. Worker response:
   - `{"error":"API key is invalid or disabled. Update your key in Settings.","worker_id":"worker-6a36a988"}`
5. Overlay/key state observed:
   - overlay `status='pending'`, `claimed_by=null`, `attempt_count=0`
   - overlay `last_error='API key invalid or disabled'`
   - `user_api_keys.is_valid=false` for the temporary row
6. Cleanup:
   - deleted the temporary `user_api_keys` row
   - verified there are no remaining `anthropic` key rows

Result: **Pass**. 401 key-invalid handling releases claims and invalidates key state.

## Scenario D: `.env` Anthropic key save path works, but key itself is invalid

1. Saved Anthropic key from local `.env` via authenticated `POST /functions/v1/user-api-keys`.
2. Save result:
   - `saved_ok=true`, key stored encrypted (`enc:v1:*`)
3. Validity check:
   - `POST /functions/v1/test-api-key` returned `{"valid":false,"error":"Invalid or disabled API key"}`
4. Worker run after save:
   - run: `de64ec30-1831-4475-ad85-0b00b8f991d3`
   - worker response: `{"error":"API key is invalid or disabled. Update your key in Settings.","worker_id":"worker-e185bb2a"}`
   - overlay state: `pending`, `claimed_by=null`, `last_error='API key invalid or disabled'`
   - run state: remains `running` with `completed_blocks=0`, `failed_blocks=0`
5. User key row state:
   - `is_valid=false`
   - storage format: encrypted (`enc:v1:*`)

Result: **Infrastructure path pass / credential validity fail**. Save/decrypt/release pipeline works, but the current Anthropic credential is rejected by provider.

## Scenario E: Updated `.env` key validates and happy path completes

1. Re-saved updated Anthropic key from local `.env` via `POST /functions/v1/user-api-keys`.
2. Key test result:
   - `POST /functions/v1/test-api-key` returned `{"valid":true}`
3. Happy-path worker run:
   - run: `ab8a3b40-757c-473f-a0c8-65ac007f74bc`
   - worker response: `claimed=1, succeeded=1, failed=0, remaining_pending=0`
4. DB state:
   - overlay status: `ai_complete`
   - `overlay_jsonb_staging` populated
   - run status: `complete`
   - rollup: `completed_blocks=1`, `failed_blocks=0`
   - key row: `is_valid=true`, key suffix `RwAA`

Result: **Pass**. Happy path and completion rollup verified.

## Scenario F: Forced retry progression to terminal failed with correct rollup

1. Created run: `7f50cdcb-f897-4566-bb87-de2f62e79884`
2. Invoked worker 3 times using invalid model override:
   - `model_override='invalid-model-for-retry-test'`
3. Progression observed:
   - attempt 1: overlay `pending`, `attempt_count=1`
   - attempt 2: overlay `pending`, `attempt_count=2`
   - attempt 3: overlay `failed`, `attempt_count=3`
4. Final run state:
   - run status: `complete`
   - rollup: `completed_blocks=0`, `failed_blocks=1`
   - `remaining_pending=0` from worker response on final attempt

Result: **Pass**. Retry + terminal failure semantics and rollups verified.

---

## 5) Current Gaps Blocking Priority 2 Exit

None. Priority 2 verification scenarios are now complete.

---

## 6) Next Required Checks

1. Use this document as baseline evidence for Priority 2 `Passed` status.
2. Proceed to Priority 4 (prompt caching with benchmark + rollback toggle).
