# 0211 Worker Runtime Reliability (Priority 2)

**Date:** 2026-02-11  
**Status:** In Progress (partial scenarios verified)  
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

---

## 5) Current Gaps Blocking Priority 2 Exit

1. Happy path (`pending -> claimed -> ai_complete`) not verified because no valid Anthropic key is currently configured.
2. Retry and terminal-failure semantics (`attempt_count` increments to terminal `failed`) require key-enabled LLM calls that return non-401 processing errors.
3. Run rollup completion checks (`completed_blocks`, `failed_blocks`, terminal `runs_v2.status='complete'`) remain pending until happy/retry paths are executed.

---

## 6) Next Required Checks

1. Provision valid key path (user key or platform fallback key).
2. Execute one happy-path run and verify:
   - overlay transitions to `ai_complete`
   - run transitions to `complete`
   - rollups match overlay truth
3. Execute one forced-failure run and verify:
   - retry increments `attempt_count`
   - terminal state reaches `failed` at retry limit
   - run rollups reflect failed count accurately
4. Record run IDs and outcomes in this file and gate docs.
