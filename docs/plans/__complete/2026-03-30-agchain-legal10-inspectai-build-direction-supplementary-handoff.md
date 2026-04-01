# Supplementary Handoff: AGChain Legal-10 + InspectAI Build Direction

**Parent authority:** `docs/plans/2026-03-30-agchain-legal10-inspectai-build-direction.md`
**Status:** Supplemental handoff written, not an implementation-plan replacement
**Author:** Codex
**Date:** 2026-03-30

## Purpose

This document supplements the parent direction doc. It does not replace it, and it does not authorize implementation by itself.

Its purpose is narrower:

1. restate the verified repo facts that matter most to the next planner or implementer
2. rehearse the likely implementation path surface by surface
3. name the files and seams that are real today versus still placeholder
4. make the stop conditions explicit so the next phase does not drift back into fake AGChain progress

The approved contract still has to be written as one or more proper implementation plans before code changes begin.

## Verified repo facts

The following points were re-checked against the current repo while preparing this handoff.

### Legal-10 runtime basis is real

- `_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py` exists and is a real runner.
- `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/inspect_backend.py` exists and provides a real Inspect-backed execution adapter.
- `_agchain/legal-10/runspecs/3-STEP-RUN/runtime/runtime_config.py` exists and defines a real `RuntimeConfig` surface.
- `_agchain/legal-10 && pytest -q` still passes: `45 passed in 1.02s`.

### Real run artifacts already exist

- `_agchain/legal-10/runs/run_20260208_080028_154291` exists.
- That run directory contains:
  - `run_manifest.json`
  - `summary.json`
  - `candidate_state.json`
  - `audit_log.jsonl`
  - `run.jsonl`
  - `staging/`
- `summary.json` already exposes:
  - `run_id`
  - `eu_id`
  - `benchmark_id`
  - `eval_model`
  - `judge_model`
  - `timestamp`
  - `scores`
- `run_manifest.json` already exposes:
  - `run_id`
  - `eu_id`
  - `benchmark_dir`
  - `eu_dir`
  - `eval_model`
  - `judge_model`
  - `step_count`
  - `created_at`
- `candidate_state.json` already exposes step keys `d1`, `d2`, and `j3`.

### Dataset basis is only partial

- `_agchain/legal-10/datasets` does not exist in this checkout.
- `_agchain/legal-10/artifacts` does not exist in this checkout.
- The parent direction is correct to treat `Datasets` as honest inventory/build-artifact scope first, not a full dataset-management product.

### Current AGChain backend ownership is still thin

- `services/platform-api/app/main.py` currently registers only:
  - `agchain_benchmarks.py`
  - `agchain_models.py`
- There are no registered `platform-api` routes today for:
  - runs
  - results
  - prompts
  - scorers
  - parameters
  - datasets
  - observability drilldown

### Current AGChain web shell is still mostly placeholder

- `web/src/pages/agchain/AgchainRunsPage.tsx` is still placeholder prose through `AgchainSectionPage`.
- `web/src/pages/agchain/AgchainResultsPage.tsx` is still placeholder prose through `AgchainSectionPage`.
- `web/src/components/agchain/AgchainLeftNav.tsx` still exposes:
  - `Overview`
  - `Datasets`
  - `Prompts`
  - `Scorers`
  - `Parameters`
  - `Tools`
  - `Observability`
- `web/src/router.tsx` routes `Runs` and `Results`, but they are not part of the primary left-nav list sampled above.

That mismatch matters. The router knows about more AGChain pages than the main AGChain nav admits, while the actual page bodies for `Runs` and `Results` are still placeholder shells.

## What this means operationally

The parent direction is correct on the core point:

- do not try to build "all AGChain"
- do not copy InspectAI as a product shell
- do not keep placeholder prose while waiting for a giant future platform build

The fastest honest path is still:

1. `Runs`
2. `Results`
3. `Prompts + Scorers + Parameters`
4. `Datasets`
5. only then broader `Observability`
6. only after that `Tools` / sandbox policy exposure

## Rehearsed implementation path

This is not a new plan. It is a rehearsal of what the next approved plans are likely to need.

### Rehearsal 0: truthfulness cleanup before any new AGChain exposure

Before any new "real" AGChain surface is claimed:

- every placeholder page that remains mounted must either be:
  - withdrawn from primary exposure, or
  - rewritten into a truthful narrow surface
- no page may imply broad product support when the backing seam is still missing
- no implementation may use frontend copy as a substitute for backend ownership

This is especially important for:

- `web/src/components/agchain/AgchainLeftNav.tsx`
- `web/src/router.tsx`
- `web/src/pages/agchain/AgchainRunsPage.tsx`
- `web/src/pages/agchain/AgchainResultsPage.tsx`

### Rehearsal 1: first real `Runs` surface

The parent direction says `Runs` should go first. Repo reality supports that.

#### Real basis that already exists

- runner: `run_3s.py`
- backend adapter seam: `runtime/execution_backend.py`, `runtime/inspect_backend.py`
- config seam: `runtime/runtime_config.py`
- checked-in run history: `_agchain/legal-10/runs/*`

#### Honest first product claim

The first `Runs` surface should be a real run-launch plus run-history surface for Legal-10 only.

It should expose:

- benchmark selection
- EU selection
- evaluated model
- judge model
- backend choice: `direct` or `inspect`
- baseline profile / runtime constraints
- submitted and completed run history

#### Likely owned seams that the next implementation plan must lock

- `platform-api` endpoints for:
  - list runs
  - get one run
  - submit one run
- route-owned observability for those endpoints
- a service layer that reads real run directories and launches the runner through an owned backend seam
- frontend page logic that stops using `AgchainSectionPage` placeholder copy

#### Important constraint

The parent direction allows a file-backed first pass. If the next implementation plan takes that path, it must say so explicitly and lock the zero-migration case honestly. "File-backed first" is valid only if `platform-api` still owns the browser-facing seam.

#### What not to do

- do not trigger runs by telling the user to use CLI manually
- do not wire the page directly to the filesystem from the browser
- do not expose tool/sandbox/network toggles that `RuntimeConfig` explicitly rejects in the current phase

#### Proof required before this page counts as real

- a run can be launched through the owned runtime seam
- the run is recorded in visible history
- `run_manifest.json` and `summary.json` are reachable through the owned backend path
- the page shows real status/history instead of placeholder prose

### Rehearsal 2: first real `Results` surface

`Results` should come immediately after `Runs` because the artifact basis already exists.

#### Real basis that already exists

- `summary.json`
- `candidate_state.json`
- per-step outputs in the run directory
- deterministic scores
- judge scores

#### Honest first product claim

The first `Results` surface should be a run result viewer, not a full experiments/comparisons product.

It should expose:

- run summary
- per-step output viewer
- `d2` versus `j3` judge comparison
- citation-integrity and score output where present

#### Likely owned seams that the next implementation plan must lock

- `platform-api` endpoints for:
  - list run results or load result by run
  - fetch per-step artifacts
- route/service traces and counters on those result endpoints
- frontend result page plus any step-viewer components

#### What not to do

- do not block this surface on a future experiments registry
- do not invent cross-benchmark comparison workflows here
- do not claim broad result lineage that the current artifacts do not encode

#### Proof required before this page counts as real

- a run selected from `Runs` can open a real results view
- `summary`, `candidate_state`, and step outputs are rendered from real artifacts
- score fields are real values, not copied explanatory text

### Rehearsal 3: `Prompts + Scorers + Parameters`

This should be the third implementation wave, not the first.

#### `Prompts`

Real basis exists in:

- `benchmark/model_steps`
- `benchmark/judge_prompts`
- `runtime/input_assembler.py`

The first real `Prompts` surface should show:

- prompt template
- resolved placeholders
- admitted payloads
- judge prompt refs
- system-message and output-guard information

Do not wait for a generic prompt CMS.

#### `Scorers`

Real basis exists in:

- `_agchain/legal-10/runspecs/3-STEP-RUN/scorers`
- `_agchain/legal-10/chain/scoring`

The first real `Scorers` surface should show:

- scorer registry for the selected benchmark
- deterministic versus judge scoring modes
- step-to-scorer mapping
- sample or run outputs where scorer artifacts already exist

#### `Parameters`

Real basis exists in:

- `runtime/runtime_config.py`
- `_agchain/profiles/types.py`
- `_agchain/profiles/baseline.py`

The supplement matters here because the repo itself enforces a limit:

- `tool_mode != 'none'` is rejected in the current phase
- `approval_mode != 'none'` is rejected in the current phase
- `sandbox_mode != 'none'` is rejected in the current phase

So the first real `Parameters` surface should be:

- live for current baseline constraints
- explicit about current profile values
- disabled or display-only for future tool/sandbox/approval fields

It must not pretend those futures are active.

### Rehearsal 4: honest `Datasets`

`Datasets` should come after the surfaces above, not before them.

#### Real basis that already exists

- `inventory_datasets.py`
- `rp_builder.py`
- `eu_builder.py`
- benchmark-owned build semantics

#### Real basis that does not exist

- checked-in `legal-10/datasets/`
- full dataset CRUD backend
- polished registry-managed sample browsing
- editing or promotion workflows

#### Honest first product claim

The first `Datasets` surface should be a read-first artifact registry over:

- dataset inventory
- versions or build outputs where present
- RP directories
- EU directories
- import/export metadata
- build provenance

#### What not to do

- do not market it as a full dataset management system
- do not promise editing
- do not promise broad cross-benchmark dataset workflows

### Rehearsal 5: `Observability` after run/result truth exists

The parent direction is right to put this after the first useful run/result surfaces.

The first real `Observability` page should be a run-artifact drilldown over:

- `run_manifest.json`
- `audit_log.jsonl`
- `run.jsonl`
- per-step usage and timing
- state transitions

Important distinction:

- the AGChain product surface can defer broad cross-run telemetry-backed observability
- the implementation plans for `Runs`, `Results`, `Prompts`, or `Datasets` still must declare their own `platform-api` observability from day one

So "OTel later" does not mean "no OTel now." It means:

- no broad AGChain observability product yet
- but every new owned runtime seam still gets normal trace/metric/log contracts when it is implemented

### Rehearsal 6: `Tools` and sandbox policy last

This remains late-phase work.

Repo reality supports the parent direction:

- current `RuntimeConfig` knows about future-facing tool, approval, and sandbox fields
- current phase validation rejects them
- `InspectBackend` is real, but that does not mean a full product-level tools or sandbox policy surface is ready

So the truthful choices are still:

- keep `Tools` out of primary nav, or
- reduce it to one explicit state: no tools enabled for the current Legal-10 baseline

Do not build a speculative tools-management shell just because Inspect references exist.

## Files the next planner or implementer should inspect first

### Legal-10 runtime and artifacts

- `E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py`
- `E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/execution_backend.py`
- `E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/inspect_backend.py`
- `E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/runtime_config.py`
- `E:/writing-system/_agchain/legal-10/runs/run_20260208_080028_154291/run_manifest.json`
- `E:/writing-system/_agchain/legal-10/runs/run_20260208_080028_154291/summary.json`
- `E:/writing-system/_agchain/legal-10/runs/run_20260208_080028_154291/candidate_state.json`
- `E:/writing-system/_agchain/legal-10/runs/run_20260208_080028_154291/audit_log.jsonl`
- `E:/writing-system/_agchain/legal-10/runs/run_20260208_080028_154291/run.jsonl`

### Existing AGChain backend truth

- `E:/writing-system/services/platform-api/app/main.py`
- `E:/writing-system/services/platform-api/app/api/routes/agchain_benchmarks.py`
- `E:/writing-system/services/platform-api/app/api/routes/agchain_models.py`

### Existing AGChain frontend shell and placeholder surfaces

- `E:/writing-system/web/src/components/agchain/AgchainLeftNav.tsx`
- `E:/writing-system/web/src/router.tsx`
- `E:/writing-system/web/src/pages/agchain/AgchainRunsPage.tsx`
- `E:/writing-system/web/src/pages/agchain/AgchainResultsPage.tsx`
- `E:/writing-system/web/src/pages/agchain/AgchainPromptsPage.tsx`
- `E:/writing-system/web/src/pages/agchain/AgchainScorersPage.tsx`
- `E:/writing-system/web/src/pages/agchain/AgchainParametersPage.tsx`
- `E:/writing-system/web/src/pages/agchain/AgchainDatasetsPage.tsx`
- `E:/writing-system/web/src/pages/agchain/AgchainObservabilityPage.tsx`

## Stop conditions

Implementation should stop and force a new plan revision if any of the following happens:

1. the work starts introducing a broad new `/agchain/*` API family without a locked implementation plan
2. the first run/result surfaces stop being Legal-10-specific and start pretending to solve all AGChain benchmark families
3. the work tries to import InspectAI UI or menu shape as the product target
4. the work treats future tool, approval, sandbox, MCP, or network policy as live when `RuntimeConfig` still rejects them
5. the work claims a full dataset-management system despite the missing checked-in dataset directory and missing CRUD/backend registry seams
6. the work uses filesystem reads directly from the browser instead of owned backend seams
7. the work treats the absence of a broad AGChain observability product as a reason to skip route/service OTel on newly created runtime seams

## Recommended next planning split

The parent direction already says this, and repo reality supports it.

The next approved plans should be split as:

1. `Runs` real surface plan
2. `Results` real surface plan
3. `Prompts + Scorers + Parameters` real surface plan
4. `Datasets` inventory/build-artifact surface plan

That split is better than one giant AGChain plan because each slice can lock:

- exact `platform-api` contracts
- exact observability
- honest zero-cases for persistence where appropriate
- exact frontend pages/components/hooks
- surface-specific acceptance proof

## Final handoff note

The most important thing to preserve from the parent direction is not the word "InspectAI." It is the honesty rule.

What is already real should become visible quickly.

What is not yet real should not stay exposed as if it were already a product surface.

This repo already has enough true Legal-10 runtime basis to replace several AGChain placeholders now. It does not yet have enough basis to justify broad AGChain shell claims.
