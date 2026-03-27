# Developer Prompt: Legal-10 3-STEP-RUN (HAL-compatible vertical slice)

## Goal
Build a minimal end-to-end Legal-10 run-spec through a 3-step mvp. 

- `d1` = Known Authority (deterministic scoring)
- `d2` = IRAC without RP (candidate output; later judged + citation-checked)
- `j3` = IRAC with RP (candidate output; later judged + citation-checked)
- After `j3`:
  - **Judge call** grades BOTH IRACs (MEE-style rubric) and returns JSON
  - **Deterministic citation_integrity** compares model-used citations vs the build-time “full list” citation inventories

- requires build-time benchmark + EU packets (plan/steps + p1/p2/ground_truth) before runtime



All run-spec docs/scripts live under:
`E:\agchain\legal-10\runspecs\3-STEP-RUN\`

Generated build artifacts (ResearchPacks, EUs, and run outputs) should be written to a configurable output root (defaulting to `datasets/` where appropriate), not committed to the repo.

## Required on-disk package layout (Benchmark Structure v2)
(See `internal/specs/top_level_docs/benchmark-structure-v2.md`.)

### Benchmark packet (shared; exported from runner source-of-truth)
The runner consumes these at run-time, but they should be produced ahead of time via a deterministic export/dump (so the packet is reproducible and reverse-engineerable).

Benchmark packet files:
- `benchmark/benchmark.json`
- `benchmark/plan.json`
- `benchmark/model_steps/d1.json`
- `benchmark/model_steps/d2.json`
- `benchmark/model_steps/j3.json`
- `benchmark/judge_prompts/j3.json` (judge rubric for grading BOTH IRACs)

### EU packets (built by the EU builder)
Do **not** hand-author an EU in this runspec directory. Instead, the EU builder (reusable for both 3-step and 10-step) must output, for each `eu_id`:
- `eus/{eu_id}/p1.json` (anchor payload; short SCOTUS opinion text)
- `eus/{eu_id}/p2.json` (research pack payload)
- `eus/{eu_id}/ground_truth.json` (runner-only labels + citation inventories)

Output location is configurable (e.g., `datasets/eus/<benchmark_id>/eus/{eu_id}/...`), but the runner must always enforce no-leak via staging (payloads are only visible when admitted).

## plan.json (3-step version)
Must follow v2 fields: `step_id`, `step_file`, `scoring`, `scorer_ref` or `judge_prompt_file`, `output_contract`, `inject_payloads`.

Recommended injections:
- `d1`: `["p1"]`
- `d2`: `["p1"]`
- `j3`: `["p1","p2"]`

## Step specs to follow
Use these as the truth for what each step requires:
- `internal/specs/steps/known_authority.md` (d1)
- `internal/specs/steps/irac_without_rp.md` (d2)
- `internal/specs/steps/irac_with_rp.md` (j3)
- `internal/specs/steps/citation_integrity.md` (deterministic check after IRACs)

Important: both IRAC steps must return JSON that includes an explicit citation list field (e.g. `citations: [...]`).

## ground_truth.json (what must be in it for this run)
Once an anchor is selected, the RP is determined, and the deterministic citation check lists are determined.
Build-time must write these runner-only lists:

- `anchor_inventory_full`: **all unique in-scope citations extracted from the anchor text** (the “full list”)
- `rp_subset`: the subset of citations actually shipped in `p2.json` (Top-K authorities)

Also include whatever d1 needs to score deterministically (OK to hardcode for the 1-EU demo).

## Runner execution requirements (behavior)
The runner (or “orchestrator”) executes one EU by reading `benchmark/*` + `eus/{eu_id}/*`.

Per step:
- Create `staging/{run_id}/{call_id}/`
- Copy ONLY:
  - current step file (`benchmark/model_steps/<step>.json`)
  - admitted payloads (`eus/{eu_id}/p*.json` per `inject_payloads`)
  - `candidate_state.json`
- Build candidate messages using:
  - step messages
  - FULL anchor text (for this v1 run we resend full anchor every step)
  - `candidate_state.json` (accumulates after each step; **no scores**)
- Call evaluated model via real API
- Parse + validate against `output_contract`
- Score deterministic steps immediately
- Append a step record to `runs/{run_id}/run.jsonl`
- Append delivery hashes to `runs/{run_id}/audit_log.jsonl` (hash staged bytes + message bytes)
- Emit LangGraph-shaped events to `runs/{run_id}/trace.jsonl`
- Update + save `candidate_state.json` after the step finishes


Judge call (after `j3`):
- Call judge model via real API
- Input: `benchmark/judge_prompts/j3.json` + BOTH IRAC outputs (d2 + j3)
- Output: strict JSON with per-IRAC scores + totals (rubric not finalized; judge instructed to grade using its understanding of the rubric)
- Save a judge record into `run.jsonl` (e.g. step_id `judge_j3`, include `grades_step_ids: ["d2","j3"]`)

Deterministic citation_integrity (after `j3`):
- No model call
- Extract citations from BOTH IRAC outputs using the explicit citations list field
- Compare deterministically against:
  - `anchor_inventory_full` (full list of in-scope citations from anchor text)
  - `rp_subset` (citations shipped in p2 for j3)
- Record result as a final deterministic step record in `run.jsonl` (e.g. step_id `d4_citation_integrity`)

Outputs (canonical):
- `runs/{run_id}/run.jsonl`
- `runs/{run_id}/audit_log.jsonl`
- `runs/{run_id}/run_manifest.json`
- `runs/{run_id}/summary.json`
- (additional) `runs/{run_id}/trace.jsonl` + `candidate_state.json`

## Why this is HAL-compatible later
Later we want: **1 EU = 1 HAL task**.
So the Legal-10 runner must be runnable inside a per-task working directory with local files, and must not depend on global paths.
HAL will provide: task sandbox, concurrency, logs/results directory.
Our runner provides: plan execution, staging/no-leak, state/trace, judge, deterministic scoring.
