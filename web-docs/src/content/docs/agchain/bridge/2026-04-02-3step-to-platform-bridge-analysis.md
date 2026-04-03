---
title: "CLI prototype to platform bridge analysis"
sidebar:
  order: 4
---

# 3-Step CLI Prototype → AGChain Platform: Bridge Analysis

**Date:** 2026-04-02
**Source:** `_agchain/legal-10/runspecs/3-STEP-RUN/` (working prototype, 13 Python files + 6 JSON artifacts)
**Purpose:** Map what the CLI prototype does manually to what the AGChain platform needs to do through UI authoring + API-triggered jobs. Identify what already aligns, what's missing, and where the first cuts are.

---

## The Two Sides

**CLI prototype** (`3-STEP-RUN/`): A developer runs `python run_3s.py --benchmark-dir ... --eu-dir ... --provider openai --model gpt-4o`. Everything is hardcoded or passed via CLI args. Prompts are Python string constants in `benchmark_builder.py`. Credentials come from `.env`. The runner reads plan.json and executes.

**AGChain platform**: A user opens the workspace, creates a benchmark, adds steps with prompts and scoring modes, selects a dataset, picks a model target, and clicks "Run." The platform materializes the bundle, launches the runner, and stores results.

---

## Component-by-Component Mapping

### 1. Benchmark Metadata

| CLI | AGChain Platform | Status |
|-----|-----------------|--------|
| `benchmark.json` — hardcoded in `benchmark_builder.py` | `agchain_benchmarks` table (name, description, version) | **Already aligned.** The table stores the same fields. |
| `system_message` field in benchmark.json | Not stored. Currently hardcoded in the builder. | **Gap.** Needs a field on the benchmark or benchmark version. |

### 2. The Plan (step orchestration)

| CLI plan.json field | AGChain table field | Status |
|---------------------|---------------------|--------|
| `steps[].step_id` | `agchain_benchmark_steps.step_id` | Aligned |
| step ordering | `agchain_benchmark_steps.step_order` | Aligned |
| `steps[].scoring` | `agchain_benchmark_steps.scoring_mode` | Aligned |
| `steps[].scorer_ref` | `agchain_benchmark_steps.scorer_ref` | Aligned |
| `steps[].judge_prompt_file` | `agchain_benchmark_steps.judge_prompt_ref` | Aligned |
| `steps[].output_contract` | `agchain_benchmark_steps.output_contract` | Aligned |
| `steps[].inject_payloads` | `agchain_benchmark_steps.inject_payloads` | Aligned |
| `steps[].judge_grades_step_ids` | `agchain_benchmark_steps.judge_grades_step_ids` | Aligned |
| `steps[].step_file` (path to model_steps JSON) | Derived from step_id at materialization time | N/A — platform generates this |

**Verdict:** plan.json is ~95% covered by existing AGChain step schema. The materializer just reads the table and writes the JSON.

### 3. Step Definitions (prompt templates + output schemas)

| CLI artifact | AGChain storage | Status |
|-------------|----------------|--------|
| `model_steps/d1.json` with `prompt_template` | `agchain_benchmark_steps.step_config_jsonb` (opaque blob) | **Gap.** The blob has no locked schema. |
| `prompt_template` (the actual prompt text with `{anchor_text}` placeholders) | Not structured | **Gap.** This is the main authoring content. |
| `placeholders` (list of placeholder names) | Not structured | **Gap.** Derivable from template but should be explicit. |
| `output_schema` (JSON Schema the runner validates against) | Not structured | **Gap.** Critical for runner validation. |
| `step_name` (display name) | `agchain_benchmark_steps.display_name` | Aligned |

**Verdict:** This is the biggest gap. The step_config_jsonb blob needs a locked schema with three required fields: `prompt_template`, `placeholders`, `output_schema`. Everything else about the step is already in dedicated columns.

### 4. Judge Prompts

| CLI artifact | AGChain storage | Status |
|-------------|----------------|--------|
| `judge_prompts/irac_mee_pair_v1.json` with `prompt_template`, `placeholders`, `output_schema` | `judge_prompt_ref` stores a reference string | **Gap.** The ref exists but the prompt content doesn't have a home. |

**Verdict:** Judge prompts need storage — either as rows in a scorer/prompt registry table, or as structured content within the benchmark version. AGChain's scorers surface exists (`agchain_scorer_prompts` was planned in the umbrella plan) but the actual prompt authoring and storage isn't built yet.

### 5. Evaluation Units (EUs)

| CLI artifact | AGChain equivalent | Status |
|-------------|-------------------|--------|
| `eus/{eu_id}/p1.json` (anchor payload) | Dataset sample fields (`input`, `metadata`) | **Conceptual match.** A dataset sample contains the anchor content. |
| `eus/{eu_id}/p2.json` (research pack) | Not directly modeled | **Gap.** The RP is built from ranked citations — a build pipeline job, not a simple field mapping. |
| `eus/{eu_id}/ground_truth.json` (runner-only labels) | Dataset sample `target` or `metadata` fields | **Partial.** Ground truth needs to be split from candidate-visible data. |
| `manifest.json` + `signature.json` (sealing) | No equivalent | **Gap.** Bundle integrity verification doesn't exist yet. |

**Verdict:** EU construction is the most complex gap. It requires a build pipeline that:
1. Reads from AGChain's dataset (anchor cases)
2. Runs the RP assembly logic (citation ranking, authority text lookup, K-rule)
3. Splits into p1 (candidate-visible) + p2 (conditional) + ground_truth (runner-only)
4. Seals with manifest + signature

This is NOT a simple materializer — it's the `rp-packager.py` + `eu-builder.py` pipeline, which itself depends on the Legal-10 data pipeline (stages 1–4A).

### 6. Runtime Components

| CLI component | AGChain platform equivalent | Status |
|--------------|---------------------------|--------|
| `run_3s.py` (CLI orchestrator) | Run-launch API endpoint + async worker | **Not built.** The `agchain_operations` framework exists but no run handler. |
| `model_adapter.py` / `inspect_backend.py` | Credential bridge + Inspect integration | **Not built.** Reference code exists but not wired to platform-api. |
| `payload_gate.py` | Reusable as-is inside the runner worker | **Ready.** Pure function, no CLI dependencies. |
| `input_assembler.py` | Reusable as-is inside the runner worker | **Ready.** Pure function, no CLI dependencies. |
| `staging.py` | Reusable as-is inside the runner worker | **Ready.** Pure function, filesystem-only. |
| `state.py` | Reusable as-is inside the runner worker | **Ready.** Pure function, no CLI dependencies. |
| `audit.py` | Reusable as-is inside the runner worker | **Ready.** Pure function, JSONL writer. |
| `runtime_config.py` | Reusable as-is inside the runner worker | **Ready.** Pydantic model, no CLI dependencies. |
| `execution_result.py` | Reusable as-is inside the runner worker | **Ready.** Dataclass, no dependencies. |
| `scorers/d1_known_authority_scorer.py` | Reusable as-is. Referenced by `scorer_ref`. | **Ready.** Pure function. |
| `scorers/citation_integrity.py` | Reusable as-is. Post-chain deterministic check. | **Ready.** Pure function. |

**Verdict:** 8 of 13 runtime files are pure functions with no CLI or filesystem coupling — they can be imported directly into a platform-api worker. The main orchestrator (`run_3s.py`) needs to be refactored from CLI entry point to async worker function, and the model adapter needs the credential bridge.

### 7. Credentials

| CLI | AGChain platform | Status |
|-----|-----------------|--------|
| `.env` file with `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` | `user_api_keys` table (encrypted per user per provider) | **Gap.** `_load_api_key()` exists in model_registry.py but nothing bridges it to the runner's model call. |

---

## What's Ready vs What's Missing

### Ready (reusable as-is from the prototype)

- `payload_gate.py` — admit only what plan says
- `input_assembler.py` — build fenced-window messages
- `staging.py` — per-call isolation directories
- `state.py` — candidate state with sanitization
- `audit.py` — cryptographic audit trail
- `runtime_config.py` — execution config model
- `execution_result.py` — result data class
- `execution_backend.py` — backend abstraction (direct/inspect)
- `d1_known_authority_scorer.py` — deterministic scorer
- `citation_integrity.py` — deterministic post-check

### Already in the platform (just needs materializer)

- Benchmark metadata → benchmark.json
- Step ordering, scoring modes, inject_payloads, scorer_refs → plan.json
- Model targets with credentials → model selection
- Tool manifests with resolved refs → future tool provisioning

### Missing (must build)

| Gap | What it is | Complexity |
|-----|-----------|-----------|
| **Step content schema** | Lock `step_config_jsonb` to: `prompt_template`, `placeholders`, `output_schema` | Low — schema definition + migration |
| **System message storage** | Field on benchmark version for the runner system message | Low — one column |
| **Judge prompt storage** | Authored judge prompts with template, placeholders, output_schema | Medium — new table or structured content in scorer registry |
| **Bundle materializer** | Function: read AGChain tables → emit benchmark/ directory (plan.json + model_steps/*.json + judge_prompts/*.json) | Medium — reads from DB, writes JSON files |
| **Credential bridge** | Function: model_target_id + user_id → decrypted API key → Inspect model config | Medium — security-sensitive |
| **Run-launch worker** | Async handler in agchain_operations: receive benchmark + EU + model → orchestrate step chain → store results | High — the main integration piece |
| **EU build pipeline** | Jobs that produce p1/p2/ground_truth from datasets | High — depends on Legal-10 data pipeline |
| **Bundle sealing** | manifest.json + signature.json generation and verification | Medium — crypto, deterministic hashing |

---

## Recommended Build Sequence

### Phase A: Make the authoring surface produce a runnable bundle

1. **Lock step_config_jsonb schema** — migration adding CHECK or application-level validation for `prompt_template` (required string), `placeholders` (required string array), `output_schema` (required JSON Schema object)
2. **Add system_message to benchmark version** — one column, default null
3. **Build the bundle materializer** — function that reads one benchmark version + its steps from Supabase and writes `benchmark.json` + `plan.json` + `model_steps/*.json`. Does NOT handle judge prompts or EUs yet.
4. **Verify round-trip** — author a benchmark in the UI, materialize it, confirm the runner prototype can read the output

This proves: authored benchmark → plan.json the runner understands.

### Phase B: Wire the runner into platform-api

5. **Import the 8 pure runtime modules** into platform-api (or a runner service)
6. **Build the credential bridge** — model_target_id → decrypted key → Inspect model call
7. **Build the run-launch worker** — refactor run_3s.py's main loop into an async function that receives: materialized bundle path, EU path, model config, user context. Uses the existing agchain_operations framework.
8. **Store run results** — write summary, run.jsonl, audit_log to platform storage (GCS or Supabase)

This proves: user clicks Run → model calls happen → results appear.

### Phase C: Close the EU gap

9. **EU materializer** for Legal-10 — takes AGChain dataset samples (anchor cases) and produces EU packets. This is the rp-packager + eu-builder pipeline running as a platform job.
10. **Bundle sealing** — manifest + signature generation
11. **End-to-end**: author benchmark → build EUs from dataset → materialize bundle → seal → run → results

---

## The Hardcoded-to-Configurable Migration

The prototype hardcodes many things that become user-authored in the platform:

| Hardcoded in prototype | Becomes authored in platform |
|----------------------|----------------------------|
| Prompt templates (Python constants) | `step_config_jsonb.prompt_template` per step |
| Output schemas (Python dicts) | `step_config_jsonb.output_schema` per step |
| Placeholder lists | `step_config_jsonb.placeholders` per step |
| System message (constant) | Benchmark version field |
| Judge prompt (constant) | Judge prompt registry / authored content |
| Step ordering (d1→d2→j3) | `agchain_benchmark_steps.step_order` |
| Inject payloads per step | `agchain_benchmark_steps.inject_payloads` |
| Scoring mode per step | `agchain_benchmark_steps.scoring_mode` |
| Temperature (0.0) | `generate_config_jsonb` on model target or run config |
| Max tokens (4096/2048) | `generate_config_jsonb` or step-level config |
| Model selection (CLI args) | Model target selection in UI |
| API keys (.env) | `user_api_keys` table (encrypted) |
| Pass threshold (0.75) | Scorer configuration (future) |
| K-rule for RPs | Dataset/EU build config (future) |
| Window fence markers | Runner constant (keep hardcoded — protocol detail) |
| Sanitization rules | Runner constant (keep hardcoded — security boundary) |

The bottom section (fence markers, sanitization) should stay hardcoded — they're protocol invariants, not user choices. Everything above them becomes authored.