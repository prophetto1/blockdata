# Core Workflows First Plan (Assistant Deferred)

**Date:** 2026-02-11  
**Status:** Active execution plan  
**Scope:** Complete and harden core product workflows/pipelines before internal assistant implementation

---

## 1) Sequencing Decision (Locked)

The internal assistant program is deferred until core platform workflows are production-stable.

Execution priority is now:

1. Conversion + ingest reliability.
2. Worker/run pipeline reliability.
3. Schema core workflows (wizard + advanced editor + save/fork/conflict).
4. Review/export/document lifecycle completion.
5. Test/security/ops hardening.
6. Internal assistant (KG/vector/MCP/CLI) after gates are complete.

Related deferred docs:

- `docs/ongoing-tasks/phase-2-integrations/0211-internal-assistant-development-direction.md`
- `docs/ongoing-tasks/phase-2-integrations/0211-internal-assistant-execution-checklist.md`

---

## 2) Active Workstreams (Core)

## Workstream A: Format Conversion + Ingest Reliability

**Goal:** Required formats ingest to blocks reliably and consistently.

1. Establish format matrix and runtime truth source.
2. Validate Cloud Run conversion deployment, revision, and secrets.
3. Run per-format smoke tests and capture outcomes.
4. Resolve format-specific failures and rerun matrix.

Primary references:

- `docs/ongoing-tasks/complete/0211-source-format-reliability-matrix.md`
- `docs/ongoing-tasks/0210-pdf-conversion-pipeline-failure.md`
- `services/conversion-service/app/main.py`
- `supabase/functions/ingest/process-convert.ts`

## Workstream B: Worker/Run Pipeline Completion

**Goal:** Runs move from pending to complete with robust retry/rollup behavior.

1. Verify worker invocation path from UI and API.
2. Verify claim/retry/fail semantics in runtime.
3. Verify run rollup counters/status transitions.
4. Verify key-management behavior for user keys/platform fallback.

Primary references:

- `supabase/functions/worker/index.ts`
- `docs/ongoing-tasks/0209-unified-remaining-work.md` (worker phase)

## Workstream C: Schema Core Workflow Completion

**Goal:** Schema creation and editing are complete without assistant dependency.

1. Complete wizard-first flow (manual path fully usable).
2. Keep advanced editor route and fork-by-default semantics.
3. Ensure save/idempotency/conflict behavior matches schema contract.
4. Verify worker/grid compatibility requirements (`properties`, prompt config conventions).

Primary references:

- `docs/ongoing-tasks/meta-configurator-integration/spec.md`
- `docs/ongoing-tasks/0210-schema-wizard-and-ai-requirements.md`

## Workstream D: Review + Export Workflow Hardening

**Goal:** Review and export pathways are complete and predictable.

1. Confirm staged vs confirmed overlay behavior end-to-end.
2. Close export gaps (merged variants if required by product scope).
3. Verify document-level and project-level export UX and correctness.

Primary references:

- `docs/ongoing-tasks/0209-unified-remaining-work.md`

## Workstream E: Hardening + Ops Baseline

**Goal:** Stabilize release posture before assistant work starts.

1. Expand smoke coverage for critical flows.
2. Ensure permission/RLS hardening remains intact.
3. Add operational runbook entries for common failures (conversion/worker/export).
4. Ensure status docs reflect runtime truth (remove stale contradictions).

Primary references:

- `docs/ongoing-tasks/0210-work-done-status-log.md`
- `docs/ongoing-tasks/0210-test-driven-hardening-plan.md`

---

## 3) Current Risk Concentration (2026-02-12)

1. Conversion runtime truth is inconsistent across docs (some entries say "resolved", others "unverified").  
Action: treat as unverified until fresh smoke matrix passes.

2. Format support widened in code (`pptx`, `xlsx`, `html`, `csv`) and now has runtime verification from full matrix run (`20260211-124133`).  
Action: keep full matrix in regression cadence to prevent drift.

3. Priority 6 admin/superuser optimization controls gate is now passed with deploy/runtime evidence.  
Action: proceed to Priority 7 schema core workflow completion.

4. Edge Function JWT mode mismatch (asymmetric user JWT vs `verify_jwt=true`) was resolved for active runtime paths.  
Action: maintain internal auth checks in functions where gateway verification is disabled.

---

## 4) Execution Gates Before Assistant Work

All must be true:

- [x] Required source formats pass ingest/conversion smoke matrix.
- [x] Worker pipeline is verified live (claim -> ai_complete/failed -> rollup).
- [ ] Schema core workflow is complete and stable.
- [ ] Review/export workflows are complete and tested.
- [ ] Core hardening baseline and runbooks are in place.

Only after these gates are complete should assistant implementation move from deferred to active.

---

## 5) Immediate Next Actions

1. Start Priority 7 schema core workflow closure (`meta-configurator-integration/spec.md`).
2. Treat `docs/ongoing-tasks/0212-priority7-schema-contracts-master-spec.md` as the execution contract and avoid scope drift.
3. Verify wizard-first schema creation path produces worker-compatible schema JSON (`properties`, `prompt_config`).
4. Verify save/fork/conflict (`409`) behavior and record deterministic recovery path evidence.
5. Update gate ledger and advance queue only after Priority 7 exit criteria are satisfied.

---

## 6) Progress Log

### 2026-02-11

Completed:

1. Locked sequencing: assistant work deferred behind core workflow gates.
2. Added active core plan (`0211-core-workflows-before-assistant-plan.md`).
3. Added source-format reliability matrix (`0211-source-format-reliability-matrix.md`).
4. Added matrix runner script (`scripts/run-format-matrix-smoke.ps1`).
5. Executed matrix run (timestamp `20260211-101408`) with results:
   - PASS: `md`, `txt`, `docx`, `pdf`, `html`, `csv`
   - SKIPPED (missing fixtures): `pptx`, `xlsx`
6. Added committed smoke fixtures:
   - `docs/tests/test-pack/lorem_ipsum.pptx`
   - `docs/tests/test-pack/lorem_ipsum.xlsx`
7. Executed matrix run (timestamp `20260211-124133`) with results:
   - PASS: `md`, `txt`, `docx`, `pdf`, `pptx`, `xlsx`, `html`, `csv`
8. Format reliability gate marked complete in matrix/runtime truth docs.
9. Reproduced worker no-key reliability bug (pre-fix): overlays remained `claimed` after worker returned no-key error.
10. Implemented and deployed worker fix (`supabase/functions/worker/index.ts`, deployed worker version `6`) with strict/fallback claim release helper.
11. Verified post-fix no-key behavior: claimed overlays now return to `pending` with `last_error` set.
12. Re-verified cancellation path: overlays are released to `pending` with no claim residue.
13. Re-verified no-key behavior on a fresh run (`ff1905ba-9044-4f40-8d03-232e001c6cf9`) to confirm repeatable non-stranding behavior.
14. Verified invalid-key (401) path with controlled temporary test key (`e055acca-30c5-4642-beb4-500f591d05ba`): claims released to `pending`, `last_error` set, key marked invalid.
15. Removed temporary test key and confirmed no Anthropic key rows remain, preserving the pre-test baseline.
16. Deployed `user-api-keys` edge function (v2) for encrypted key save path.
17. Saved Anthropic key from local `.env` into `user_api_keys` via `POST /functions/v1/user-api-keys` (encrypted at rest).
18. Verified with `test-api-key` + worker run (`de64ec30-1831-4475-ad85-0b00b8f991d3`) that the current key is provider-invalid (`is_valid=false`), while claim-release safeguards remain correct.
19. Re-saved updated Anthropic key from `.env`; provider validation returned valid.
20. Verified happy path run (`ab8a3b40-757c-473f-a0c8-65ac007f74bc`): worker succeeded, overlay `ai_complete`, run `complete`, rollups aligned.
21. Verified retry-to-terminal-failed behavior (`7f50cdcb-f897-4566-bb87-de2f62e79884`) with invalid model override:
   - attempts 1-2: `pending` with incrementing `attempt_count`
   - attempt 3: `failed` with `attempt_count=3`
22. Verified failed-run rollup correctness:
   - run `complete`, `completed_blocks=0`, `failed_blocks=1`
23. Priority 2 worker reliability gate criteria satisfied with evidence doc updates.
24. Executed Priority 3 source/runtime alignment:
   - aligned worker fallback temperature to `0.3` and deployed `worker` v7
   - patched `user-api-keys` PATCH path to enforce provider-aware `base_url` validation and deployed `user-api-keys` v3
   - added missing repo migration `20260211091818_add_base_url_multi_provider.sql` to match live migration history
25. Applied claim-ordering migration (`017_claim_overlay_batch_block_index_ordering`) and verified runtime function body now orders by `blocks_v2.block_index`.
26. Ran transactional claim-order probe (`BEGIN ... ROLLBACK`) proving deterministic numeric ordering (`[0..11]` claimed == expected).
27. Updated canonical registry and gate tracker; Priority 3 marked passed.
28. Implemented prompt caching path in worker with rollback control and usage telemetry:
   - added request/env toggle (`prompt_caching_enabled`, `WORKER_PROMPT_CACHING_ENABLED`)
   - deployed `worker` v8
29. Added benchmark harness and executed paired OFF/ON runs:
   - script: `scripts/benchmark-worker-prompt-caching.ps1`
   - result artifact: `scripts/logs/prompt-caching-benchmark-20260211-183102.json`
   - run IDs: `25ce329c-b4a6-4b05-8634-05e1d8b99672` (OFF), `cc7c4da8-ac17-4491-a14d-50b8fb483589` (ON)
30. Benchmark showed small cost reduction (`~1.59%`) but cache usage counters remained `0` (no observed prompt-cache hits).
31. SQL quality comparison found one material mismatch (`action/final.content`) between OFF and ON on block `...:15`; Priority 4 marked failed pending corrective rerun.
32. Added Priority 4 evidence doc:
    - `docs/ongoing-tasks/complete/0211-worker-optimization-benchmark-results.md`
33. Reproduced JWT-gateway failure for ES256 user tokens on `worker` with `verify_jwt=true` (`401 Invalid JWT`).
34. Deployed `worker` v9 with `verify_jwt=false` plus internal auth (`requireUserId`) and run ownership guard.
35. Deployed `schemas` v12 with `verify_jwt=false` (function already uses `requireUserId`).
36. Updated benchmark auth mode so worker invocations use user access token by default.
37. Executed corrective prompt-caching benchmark pair on cache-eligible schema:
   - `cache_off`: `7af1b494-ad4b-401c-9bcb-e59386b9760b`
   - `cache_on`: `3e9dab67-9ede-491e-b50c-86642d78ad39`
38. Confirmed non-zero cache telemetry on ON run:
   - `cache_creation_input_tokens=1633`
   - `cache_read_input_tokens=45724`
39. Confirmed material parity on corrective pair:
   - `material_mismatch_blocks=0` (`action/final.format/final.content`)
40. Priority 4 marked passed; next active queue item is Priority 5.
41. Completed Priority 5 adaptive batching closure cycle:
   - updated worker batching response parsing/tool shape and schema-aware pack sizing behavior
   - deployed worker through v15 with function-level auth retained
   - final extraction benchmark artifact: `scripts/logs/worker-batching-benchmark-20260211-224355.json`
   - final revision-heavy benchmark artifact: `scripts/logs/worker-batching-benchmark-20260211-224635.json`
42. Verified Priority 5 gate evidence:
   - extraction call_count `29 -> 4 -> 2`, cost down `40.77%` and `46.73%`, material parity `0` mismatch blocks
   - revision-heavy call_count `29 -> 6 -> 6`, cost down `17.18%`, material parity `0` mismatch blocks
   - queue invariants remained true (`completed=29`, `failed=0` in final suites)
43. Priority 5 marked passed; next active queue item is Priority 6.
44. Completed Priority 6 runtime closure:
   - deployed `admin-config`, `runs`, `worker` with `--no-verify-jwt` and internal auth retained
   - set `SUPERUSER_EMAIL_ALLOWLIST` as function secret
   - applied migration `20260212114500_018_admin_runtime_policy_controls` to runtime via Supabase management SQL endpoint
   - verified seed and storage state (`admin_runtime_policy` count = 19)
45. Proved new-run policy uptake and mid-run snapshot stability:
   - toggled `worker.prompt_caching.enabled` from `true` -> `false` -> `true`
   - new-run proof: `d9e80ff2-a61a-49d4-a093-89a7b4b0421e` snapshot `true`, `63cfa335-7f99-4cc0-a3ca-a8ca4d60a7d9` snapshot `false`
   - in-flight proof: run `640cf4b0-6c6f-445b-bd13-ae80c1f2e73f` kept `prompt_caching=false` across two worker invocations even after global restore (`remaining_pending 24 -> 19`)
46. Proved audit visibility:
   - `admin-config` API returned audit rows for both toggles with explicit reasons
   - UI wiring confirmed to consume the same audit payload (`SuperuserSettings` fetches `admin-config?audit_limit=100` and renders `auditRows`)
47. Priority 6 marked passed; next active queue item is Priority 7.

Next:

1. Execute Priority 7 schema core workflow completion.
2. Produce Priority 7 evidence for wizard usability and deterministic save/fork/conflict behavior.
3. Keep queue sequencing strict: Priority 8 remains blocked until Priority 7 is explicitly `Passed`.
