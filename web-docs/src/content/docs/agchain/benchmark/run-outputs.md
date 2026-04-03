---
title: "Run outputs reference"
sidebar:
  order: 4
---

# 3-STEP-RUN outputs (what exists, where, and when)

This document is a quick alignment checklist for the `3-STEP-RUN` vertical slice.

## Definitions

- **Build-time**: scripts that generate sealed inputs (ResearchPacks, EUs, ground-truth lists, manifests) from large datasets/DBs.
- **Run-time**: the runner executes a benchmark plan against an already-built EU, calls models, enforces staging/no-leak, and writes run artifacts.

## Mental model diagram (one page)

```text
BUILD-TIME (offline; produces sealed inputs; no evaluated/judge model calls)
  datasets/* + duckdb/parquet
        |
        v
  RP builder (Stage 4A)  --->  <rp_root>/rpv1__<anchor_caseId>/
                                 payloads/d1.json   (anchor + citation roster)
                                 payloads/d2.json   (authority texts)
                                 doc3.json          (runner-only metadata)
                                 manifest.json      (optional)
        |
        v
  EU builder (Stage 4B)  --->  <eu_root>/eus/<eu_id>/
                                 p1.json            (anchor payload)
                                 p2.json            (research pack payload)
                                 ground_truth.json  (runner-only: anchor_inventory_full, rp_subset, d1 truth, ...)
                                 manifest.json      (optional; recommended)

BENCHMARK PACKAGE (defined once per run-spec; reused across all EUs)
  runspecs/3-STEP-RUN/benchmark/
    benchmark.json
    plan.json
    model_steps/{d1,d2,j3}.json
    judge_prompts/j3.json   (one judge call grades BOTH IRACs)

RUN-TIME (per eu_id; runner executes plan against one EU)
  runner loads benchmark packet + EU packet
  for step in [d1, d2, j3]:
    staging/<run_id>/<call_id>/  <- copy ONLY: step.json + admitted p*.json + candidate_state.json
    evaluated model API call     <- messages built from staged bytes + candidate_state + full anchor
    parse + validate JSON output
    if step == d1: deterministic KA scoring (python) using ground_truth.json (runner-only; never staged)
    append run.jsonl + audit_log.jsonl + trace.jsonl; update candidate_state.json
  after j3:
    judge model API (ONE call) -> append judge record to run.jsonl (grades both IRACs)
    citation_integrity.py (python) -> append deterministic record to run.jsonl
    write run_manifest.json + summary.json
```

## 1) Repo deliverables (checked in)

**Runspec docs**
- `runspecs/3-STEP-RUN/PROMPT.md`
- `runspecs/3-STEP-RUN/PLAN.md`
- `runspecs/3-STEP-RUN/OUTPUTS.md` (this file)

**Benchmark package builder (static inputs shared across all EUs for the run-spec)**
- `runspecs/3-STEP-RUN/3S-benchmark-builder.py`

**Runner (run-time executor for the slice)**
- `runspecs/3-STEP-RUN/run_3S.py`
- `runspecs/3-STEP-RUN/runtime/` (helpers for loading plan, staging, audit hashing, trace events, state save/load, JSONL writers, summary)

**Adapters (real API calls)**
- `runspecs/3-STEP-RUN/adapters/base.py`
- `runspecs/3-STEP-RUN/adapters/<provider>.py` (at least one concrete provider used by the slice)

**Deterministic scoring**
- `runspecs/3-STEP-RUN/citation_integrity.py` (runner-only check run after both IRACs)
- `runspecs/3-STEP-RUN/d1_known_authority_scorer.py` (deterministic scoring for `d1`)

**Contracts + validation**
- `runspecs/3-STEP-RUN/contracts/` (schemas/contracts for plan, prompts, outputs, state, trace)
- `runspecs/3-STEP-RUN/validate_contracts.py`

**Tests**
- `runspecs/3-STEP-RUN/tests/test_citation_integrity.py`
- `runspecs/3-STEP-RUN/tests/test_contract_validation.py`
- (optional) `runspecs/3-STEP-RUN/tests/test_staging_no_leak.py`

## 2) Build-time outputs (generated; not checked in)

### 2.1 ResearchPacks (Stage 4A output)

Produced by an RP builder (reference: `internal/specs/must_update/build_research_packs.py`).

Per anchor case:
- `<rp_root>/rpv1__<anchor_caseId>/payloads/d1.json` (anchor + citation roster)
- `<rp_root>/rpv1__<anchor_caseId>/payloads/d2.json` (authority texts)
- `<rp_root>/rpv1__<anchor_caseId>/doc3.json` (runner-only metadata used for EU assembly/scoring)
- `<rp_root>/rpv1__<anchor_caseId>/manifest.json` (optional integrity binder)

### 2.2 Evaluation Units (Stage 4B output)

Produced by an EU builder (new/refactored; reference inspiration: `internal/specs/must_update/build_eus.py`).

Per EU id:
- `<eu_root>/eus/<eu_id>/p1.json` (anchor payload)
- `<eu_root>/eus/<eu_id>/p2.json` (research pack payload)
- `<eu_root>/eus/<eu_id>/ground_truth.json` (runner-only; includes `anchor_inventory_full` + `rp_subset` + any deterministic labels needed for `d1`)
- `<eu_root>/eus/<eu_id>/manifest.json` (TBD: optional but recommended integrity binder)

Notes:
- We do NOT hand-author a demo EU under `runspecs/3-STEP-RUN/`. EUs are built from RPs and can be reused by 3-step and 10-step plans.
- RP builder currently emits `payloads/d1.json` and `payloads/d2.json`; EU builder maps those bytes to the EU payload names `p1.json` and `p2.json` (unless we later decide to rename RP outputs too).

## 3) Benchmark package outputs (generated once; reused across all EUs)

Produced by `runspecs/3-STEP-RUN/3S-benchmark-builder.py`.

Flat v2 layout (current assumption; see `internal/specs/top_level_docs/benchmark-structure-v2.md`):
- `runspecs/3-STEP-RUN/benchmark/benchmark.json` (judge config and benchmark metadata)
- `runspecs/3-STEP-RUN/benchmark/plan.json` (step schedule + payload admissions + scoring mode metadata)
- `runspecs/3-STEP-RUN/benchmark/model_steps/d1.json`
- `runspecs/3-STEP-RUN/benchmark/model_steps/d2.json`
- `runspecs/3-STEP-RUN/benchmark/model_steps/j3.json`
- `runspecs/3-STEP-RUN/benchmark/judge_prompts/j3.json` (single rubric prompt; judge grades BOTH IRACs)

## 4) Run-time outputs (per run execution)

Written by the runner under `runspecs/3-STEP-RUN/runs/<run_id>/`:
- `run.jsonl` (step records + one judge record + one citation_integrity record)
- `audit_log.jsonl` (hashes/proofs for staged bytes + message bytes per delivery boundary)
- `run_manifest.json` (provenance snapshot: benchmark id, eu id, model identifiers/settings, input hashes)
- `summary.json` (deterministic rollups computed from `run.jsonl`)
- `trace.jsonl` (LangGraph-shaped events; minimal contract)
- `candidate_state.json` (final sanitized state snapshot; no scores/judge/ground truth)

Transient during execution (deleted after each evaluated-model call):
- `runspecs/3-STEP-RUN/staging/<run_id>/<call_id>/...` (staged step prompt + admitted payloads + `candidate_state.json`)

## 5) Visibility contract (no-leak rule)

- "Flat EU folder" is only a filesystem layout choice. The evaluated model only sees files that the runner copies into `staging/.../` for the current step.
- `ground_truth.json` is runner-only and must never be staged or included in candidate messages or `candidate_state.json`.
- There is exactly one judge call (after the RP IRAC) that grades BOTH IRACs and is written as one record in `run.jsonl` (e.g., `step_id: judge_j3`).

## 6) Dependency order (proper sequence)

This is the dependency chain for producing the outputs without rework:

1. Freeze the path contract for this slice (flat vs nested) + freeze key field names (`citations` field key, `anchor_inventory_full`, `rp_subset`) + decide where judge model config lives (`benchmark.json` vs runtime config).
2. Write the contracts/schemas + `validate_contracts.py` so builders/runner have a single source of truth for file locations and JSON shapes.
3. Run/build ResearchPacks (Stage 4A) -> RPs exist under `<rp_root>/rpv1__<anchor_caseId>/...`.
4. Run/build Evaluation Units (Stage 4B) from RPs -> EUs exist under `<eu_root>/eus/<eu_id>/...` with `p1.json`, `p2.json`, `ground_truth.json` (+ manifest if enabled).
5. Run/build the benchmark package once (benchmark.json, plan.json, step prompts, judge prompt) -> `runspecs/3-STEP-RUN/benchmark/...`.
6. Run the runner against a selected EU -> `runspecs/3-STEP-RUN/runs/<run_id>/...` artifacts are produced.

## 7) Suggested ownership (3 devs)

**Dev 1 (Codex / main pipeline):**
- `runspecs/3-STEP-RUN/run_3S.py` + `runspecs/3-STEP-RUN/runtime/` + adapters integration
- `runspecs/3-STEP-RUN/3S-benchmark-builder.py` (benchmark package output)
- End-to-end run wiring: staging/no-leak, candidate_state save/load, trace.jsonl, run.jsonl/audit/manifest/summary

**Dev 2 (modules outside main pipeline):**
- `runspecs/3-STEP-RUN/contracts/` + `runspecs/3-STEP-RUN/validate_contracts.py`
- `runspecs/3-STEP-RUN/citation_integrity.py` (already created) + tests + output-contract doc
  - Integration note: expose a single function (e.g. `score_citation_integrity(...)`) and freeze the IRAC citations field key (default: `citations`).

**Dev 3 (build-time data artifacts):**
- EU builder (Stage 4B) that converts RPs -> EUs (including `anchor_inventory_full` + `rp_subset` into `ground_truth.json`, and optional EU manifest)
- Optional: minor RP builder tweaks only if needed for EU builder inputs (otherwise reuse `internal/specs/must_update/build_research_packs.py` logic as-is)
