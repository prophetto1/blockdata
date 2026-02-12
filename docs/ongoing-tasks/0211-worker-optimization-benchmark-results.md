# 0211 Worker Optimization Benchmark Results

**Date:** 2026-02-12  
**Priority:** 4 (Prompt caching)  
**Status:** Passed (after corrective rerun)

---

## 1) Scope and Corrective Context

- Feature under test: Anthropic prompt caching in `worker` LLM path.
- Initial OFF/ON pair (`25ce329c-b4a6-4b05-8634-05e1d8b99672` vs `cc7c4da8-ac17-4491-a14d-50b8fb483589`) failed gate due:
  - `cache_creation_input_tokens=0`, `cache_read_input_tokens=0`
  - material output mismatch on one block.
- Corrective work completed before rerun:
  - deployed `worker` v9 with internal auth (`requireUserId`) and run ownership guard.
  - switched `worker` to `verify_jwt=false` to align with Supabase asymmetric JWT guidance.
  - switched benchmark script worker bearer default from anon key to user access token.

---

## 2) Corrective Benchmark Inputs

- `conv_uid`: `2b79a0a8c44e07dd60843efcf21a4ccf7b1d659bf9e27a3706c83317fc72a254`
- `schema_id`: `94ffed2b-364f-453d-9553-fdb05521bf65` (`prose_optimizer_cache_probe_v3`)
  - `prompt_config.system_instructions` length: `4865` chars (cache-eligible static prompt)
- `total_blocks`: `29`
- `batch_size`: `5`
- benchmark artifact:
  - `scripts/logs/prompt-caching-benchmark-20260211-191241.json`

---

## 3) Verification Commands

1. `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\p4-debug-auth.ps1` (pre-fix repro, expected 401 Invalid JWT with `verify_jwt=true`)
2. `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\benchmark-worker-prompt-caching.ps1 -SchemaId 94ffed2b-364f-453d-9553-fdb05521bf65 -BatchSize 5`
3. SQL run-state verification in `runs_v2` for:
   - `7af1b494-ad4b-401c-9bcb-e59386b9760b` (`cache_off`)
   - `3e9dab67-9ede-491e-b50c-86642d78ad39` (`cache_on`)
4. SQL overlay parity query (`action`, `final.format`, `final.content`) across both runs.

---

## 4) Corrective OFF vs ON Results

### Run summary

- `cache_off`
  - `run_id`: `7af1b494-ad4b-401c-9bcb-e59386b9760b`
  - `elapsed_seconds`: `64.23`
  - `run_status`: `complete`
  - `completed_blocks`: `29`
  - `failed_blocks`: `0`
  - `usage.call_count`: `29`
  - `usage.input_tokens`: `62370`
  - `usage.output_tokens`: `3745`
  - `usage.cache_creation_input_tokens`: `0`
  - `usage.cache_read_input_tokens`: `0`
  - `usage.cache_hit_calls`: `0`
  - `estimated_cost_usd`: `0.243285`

- `cache_on`
  - `run_id`: `3e9dab67-9ede-491e-b50c-86642d78ad39`
  - `elapsed_seconds`: `67.69`
  - `run_status`: `complete`
  - `completed_blocks`: `29`
  - `failed_blocks`: `0`
  - `usage.call_count`: `29`
  - `usage.input_tokens`: `15013`
  - `usage.output_tokens`: `3745`
  - `usage.cache_creation_input_tokens`: `1633`
  - `usage.cache_read_input_tokens`: `45724`
  - `usage.cache_hit_calls`: `28`
  - `estimated_cost_usd`: `0.121055`

### Delta summary

- `estimated_cost_usd_delta`: `0.122230`
- `estimated_cost_usd_reduction_pct`: `50.24%`
- `input_tokens_delta`: `47357`
- `output_tokens_delta`: `0`
- `cache_creation_input_tokens_on`: `1633`
- `cache_read_input_tokens_on`: `45724`

Interpretation:

- Prompt-caching telemetry is now non-zero in both write and read dimensions.
- Cost reduction is substantial and driven by reduced effective input token billing.

---

## 5) Quality Comparison Notes (Corrective Pair)

SQL comparison (`7af1b494-ad4b-401c-9bcb-e59386b9760b` vs `3e9dab67-9ede-491e-b50c-86642d78ad39`):

- `joined_blocks=29`
- `exact_match_blocks=29`
- `mismatch_blocks=0`
- `action_match_blocks=29`
- `format_match_blocks=29`
- `final_content_match_blocks=29`
- `material_mismatch_blocks=0`

Assessment:

- No material regression observed on the corrective benchmark pair.

---

## 6) Rollback and Auth Safety

- Rollback path remains exercised and available:
  - env default: `WORKER_PROMPT_CACHING_ENABLED`
  - request override: `prompt_caching_enabled`
- Worker auth hardening:
  - gateway JWT check disabled (`verify_jwt=false`) for asymmetric JWT compatibility.
  - internal auth enforced via `requireUserId(req)` plus run ownership check.

---

## 7) Priority 4 Gate Decision

Current recommendation: **mark Priority 4 as Passed**.

Why:

1. No quality regression on corrective benchmark sample.
2. Measurable token/cost reduction is documented.
3. Rollback path is tested and retained.

---

## 8) Priority 5 Reference Pointer

Priority 5 (adaptive batching) final evidence is tracked in:

- `docs/ongoing-tasks/0211-priority5-adaptive-batching-prep-spec.md`
- `docs/ongoing-tasks/0212-session-handoff-priority5-core-pipeline.md`
- `scripts/logs/worker-batching-benchmark-20260211-224355.json`
- `scripts/logs/worker-batching-benchmark-20260211-224635.json`
