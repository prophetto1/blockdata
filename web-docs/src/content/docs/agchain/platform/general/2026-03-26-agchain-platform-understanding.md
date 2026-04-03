---
title: "Platform understanding dossier"
sidebar:
  order: 3
---

# AG Chain Platform Understanding Dossier
**Some details in this document is likely not completely accurate. Some details or plans might change as needed. The intent should be to grasp the general direction not use this as canonical requirement that must be complied with**

**Date:** 2026-03-26  
**Status:** Working architecture reference grounded in `E:\writing-system\_agchain` and `E:\writing-system`  
**Purpose:** Consolidate the current understanding of AG chain as a generic benchmark runner platform, Legal-10 as its first benchmark package, the dataset/build pipeline that feeds Legal-10, and the host-platform seams that already exist in `writing-system`.

---

## Executive Summary

The cleanest model of this system is:

- `writing-system` is the host platform.
- `AG chain` is the benchmark runner product that should live inside that host.
- `Legal-10` is the first benchmark package loaded by AG chain.

This distinction matters because the current `legal-10` repository contains at least four layers of concern at once:

1. benchmark semantics and package rules
2. dataset and build-pipeline machinery
3. a current runnable 3-step execution slice
4. older or partially superseded chain/runtime ideas

The evidence in `E:\writing-system\_agchain\legal-10\docs`, `runspecs`, `scripts`, `tests`, `runs`, and `website` points toward a benchmark-native execution model with the following invariants:

- all benchmark data is intended to be pre-built and sealed
- runtime should avoid retrieval and avoid hidden state
- evidence admission is explicit and step-scoped
- statefulness is runner-managed, not model-native
- the evaluated model must only see staged bytes
- auditability is a first-class product requirement

At the same time, the current codebase is not one clean implementation of one clean architecture. It is a mixture of:

- strong target-state specs
- a real but narrow 3-step direct-API runner
- legacy chain-step modules using older naming and contracts
- packaging and entry-point declarations that do not match the live files
- tests that currently fail because they reference stale paths or stale module locations

The most defensible conclusion is:

- AG chain should be defined as a generic benchmark platform with benchmark registration, runtime configuration, artifact inspection, and observability.
- Legal-10 should be defined as a benchmark package that provides step plans, payload schemas, scoring, ground-truth rules, and benchmark-specific artifact semantics.
- `writing-system` already provides the strongest host surfaces for shell structure, routing, auth, platform API shape, worker-style orchestration patterns, and OpenTelemetry-backed observability.

---

## Source Authority And Evidence Model

### Authority hierarchy inside Legal-10

`E:\writing-system\_agchain\legal-10\docs\_INDEX.md` explicitly defines a hierarchy for resolving conflicts:

1. `docs/mvp/M1-buildtime-packaging-sealing-dev-brief.md`
2. `docs/platform/inter-step-requirements.md`
3. `docs/fdq/*.md`
4. everything else as supplementary

That authority rule is important because the repository contains overlapping descriptions from different phases of development.

### How this dossier treats sources

This dossier uses four evidence classes:

1. **Target-state benchmark intent**
   - `docs/specifications/*`
   - `docs/mvp/*`
   - `docs/platform/*`
   - `docs/10-step-chain/*`
   - `docs/build-pipeline/*`

2. **Current executable truth**
   - `runspecs/3-STEP-RUN/*`
   - `scripts/eu_builder.py`
   - `scripts/rp_builder.py`
   - actual run artifacts under `runs/`

3. **Current legacy or partially superseded implementation surfaces**
   - `chain/steps/*`
   - `chain/scoring/*`
   - `README.md`
   - `pyproject.toml`

4. **Host-platform seams**
   - `E:\writing-system\web\src\router.tsx`
   - `E:\writing-system\web\src\components\shell\nav-config.ts`
   - `E:\writing-system\web\src\components\layout\AdminShellLayout.tsx`
   - `E:\writing-system\services\platform-api\app\main.py`
   - `E:\writing-system\services\platform-api\app\observability\otel.py`
   - related route and test files

### Interpretation rule

When sources disagree:

- use current executable code and concrete artifacts to describe **current state**
- use the authority hierarchy above to describe **intended target state**
- preserve the contradiction explicitly instead of smoothing it over

---

## AG Chain Product Definition

AG chain is best understood as a **generic benchmark runner platform** rather than as a legal benchmark.

Its platform responsibilities are:

- register and describe benchmark packages
- load package-specific benchmark definitions
- expose model target selection
- expose runtime policy selection
- orchestrate benchmark execution against sealed assets
- emit auditable artifacts
- expose progress, logs, telemetry, and comparison views

The platform surface implied by the Legal-10 specifications is broader than a single runner script. AG chain needs to own:

- benchmark registry
- benchmark package contract
- model target registry
- run profiles
- artifact registry or artifact discovery
- run history and status
- dataset/package discovery
- observability and audit correlation

### AG chain runtime knobs implied by the specs

Across `docs/platform/*`, `docs/mvp/*`, `docs/specifications/*`, and the current runner code, the following runtime knobs are either explicit or strongly implied:

- evaluated provider
- evaluated model id
- judge provider
- judge model id
- context delivery mode
- state persistence mode
- concurrency mode
- retry policy
- output validation strictness
- observability level
- run scope by benchmark and EU set

### AG chain should not be benchmark-specific

`docs/10-step-chain/benchmark-package-structures-v4.md` is inconsistent in places, but it still makes one strategically important point: naming like `d1`, `j10`, `p1`, and `p2` is an author-space choice, not a platform requirement.

That means AG chain should not bake in:

- legal-specific step names
- EU/RP semantics as universal abstractions
- legal dataset fields as generic platform fields

Instead, AG chain should treat those as part of a package contract supplied by Legal-10.

---

## Legal-10 Benchmark-Package Definition

Legal-10 is a benchmark package that contributes benchmark-specific rules, assets, and evaluation semantics to AG chain.

### What Legal-10 contributes

Legal-10 contributes:

- benchmark definition
- step order and step semantics
- prompt templates and output contracts
- payload structure
- ground-truth rules
- deterministic scorers
- judge-scored steps
- citation-integrity post-processing
- dataset/build logic
- run-artifact expectations

### Legal-10 exists in two overlapping forms

The repository currently represents Legal-10 in at least three overlapping product forms:

1. **Older README framing**
   - emphasizes AG8/S1-S8 and an integrity gate
   - describes an older architecture layout that no longer matches the checked-in tree

2. **3-step MVP**
   - the clearest current executable vertical slice
   - `d1 -> d2 -> j3` plus judge pair grading and citation integrity

3. **Full 10-step target state**
   - described in `docs/10-step-chain/chain-overview-v1.1.md`
   - adds canary, fact extraction, validation, unknown authority, transitive reasoning, and full open-book IRAC flow

### Legal-10 package identity

The most stable package identity in the repo is:

- **build-time**: raw data -> RPs -> EUs -> benchmark packet -> sealed bundle
- **run-time**: benchmark packet + one EU -> staged step execution -> score + judge + integrity -> auditable run artifacts

That package identity is benchmark-specific and should remain inside the Legal-10 package rather than being generalized into the AG chain core.

---

## Dataset And Build-Pipeline Architecture

### Database-first design

`E:\writing-system\_agchain\datasets\[C] database-integration\architecture-decisions.md` is one of the clearest architecture documents in the entire corpus.

Its central decision is:

- all benchmark data is pre-computed at build time
- builders and runners should perform zero runtime calculation beyond loading sealed packets, executing models, and comparing outputs

This aligns strongly with the Legal-10 runtime documents and with the current 3-step runners and builders.

### Build pipeline stages

Across `docs/build-pipeline/*`, `scripts/rp_builder.py`, `scripts/eu_builder.py`, and the dataset inventories, the build pipeline looks like:

1. raw legal source material is normalized into DuckDB and derivative files
2. citation inventory is extracted from anchor cases
3. citations are resolved across SCOTUS and CAP corpora
4. authority texts are pre-extracted
5. ranked authority lists are materialized
6. research packs are built per eligible anchor
7. evaluation units are built from research packs plus ground truth
8. benchmark packet JSON is built for a given run specification
9. bundle sealing is specified as required but only partially realized

### Important dataset products

The dataset layer already contains substantive benchmark assets:

- `duckdb_inventory.md` documenting the primary DuckDB tables and views
- `scdb_full_with_text.jsonl`
- `cap_*` text and ranking outputs
- `scotus_*` ranking outputs
- `eus/legal10_3step_v1/eus/*`
- `rps/rpv1__*`

The DuckDB inventory shows a serious source-data substrate:

- `shepards_edges` at about 5.7M rows
- `cap_cases_meta` at about 855k rows
- `cl_crosswalk` at about 866k rows
- `scdb_cases` at about 29k rows
- `scotus_text_stats` at about 27.7k rows

### Development vs release model

The dataset architecture decisions document resolves a useful split:

- develop against DuckDB
- pre-build and seal packets for release

That split is important for AG chain:

- AG chain as a platform can support package development against local data stores
- benchmark execution should still target sealed assets for integrity and reproducibility

### Portability caveat

`datasets/duckdb_inventory.md` still references original absolute paths such as `E:\agchain\...`, which means the current dataset documentation is not fully path-agnostic even inside `E:\writing-system\_agchain`.

---

## Benchmark Package Asset Model

The package asset model is the bridge between AG chain as a generic platform and Legal-10 as a concrete benchmark.

### What AG chain should assume every benchmark package provides

The repo evidence implies that a benchmark package must provide at least:

- package metadata and version
- dataset version references
- benchmark packet schema
- one or more execution plans
- prompt or message construction rules
- payload admission rules
- output schemas
- scoring bindings
- audit artifact contract
- benchmark-specific validation logic

Legal-10 already provides all of these pieces in fragmented form, even though they are not yet formalized as one package interface.

### Legal-10 asset categories visible in the repo

The main asset categories already visible in `E:\writing-system\_agchain\legal-10` and `E:\writing-system\_agchain\datasets` are:

- **Research Packs**
  - example: `datasets\rps\rpv1__1826-018\manifest.json`
  - contain staged authority texts and payload files such as `payloads\d1.json`, `payloads\d2.json`, and `doc3.json`

- **Evaluation Units**
  - example: `datasets\eus\legal10_3step_v1\eus\eu__1826-018\ground_truth.json`
  - pair benchmark-visible artifacts with benchmark-hidden truth and scoring anchors

- **Prompt payload files**
  - example: `p1.json` and `p2.json` within the EU directory
  - encode step-specific task scaffolding

- **Ground truth and scoring assets**
  - `ground_truth.json`
  - judge requirements implied by the scoring flow
  - citation-integrity scoring logic in `runspecs\3-STEP-RUN\scorers\citation_integrity.py`

- **Run specs and manifests**
  - runner-written `run_manifest.json`
  - website reporting specs in `website\public\data\run-specs.json`

### Research Pack and EU relationship

The current package shape is not arbitrary. The benchmark is built around a strict separation:

- an RP contains the research materials that may be admitted at runtime
- an EU defines the evaluation target, prompt structure, and hidden truth used for scoring

This separation matters because it is how the benchmark controls leakage. The model is not supposed to read the whole dataset or query a live DB during execution. It is supposed to receive staged bytes derived from the sealed package.

### Legal-10-specific names versus generic package nouns

AG chain should normalize around generic package nouns such as:

- benchmark package
- dataset snapshot
- evaluation unit
- evidence pack or staged payload
- step definition
- scorer
- artifact bundle

Legal-10 can then map its own benchmark-specific terminology onto those nouns:

- RP as a Legal-10 research-pack construct
- EU as a Legal-10 evaluation-unit construct
- `d1`, `d2`, `j3`, or later `j6`, `j7`, `j10` as Legal-10 step ids

### Package manifest expectations

The current repo suggests AG chain will eventually need a package manifest richer than the current runner manifests. That manifest likely needs to describe:

- package id
- package version
- benchmark version
- dataset version
- supported execution plans
- required artifact schema
- scoring modules
- prompt files or prompt resolvers
- supported context policies
- supported persistence policies
- validation hooks

Legal-10 currently has pieces of this information scattered across docs, run artifacts, and website data, but not one consolidated machine-readable manifest.

---

## Runtime Execution Architecture

### Current executable truth: the 3-step runner

`E:\writing-system\_agchain\legal-10\runspecs\3-STEP-RUN\run_3s.py` is the clearest runnable expression of the benchmark runtime today.

Its effective flow is:

1. load benchmark packet and EU inputs
2. assemble step-specific visible inputs
3. call the evaluated model for `d1`
4. persist admitted carry-forward state
5. call the evaluated model for `d2`
6. call the evaluated model for `j3`
7. run judge-pair grading
8. run citation-integrity checks
9. write artifacts and summaries

That flow matters more than older architectural descriptions because it is the path that actually produces run artifacts.

### Key runtime modules already present

The 3-step slice already decomposes runtime concerns in a way AG chain can reuse:

- `adapters\model_adapter.py`
  - provider-specific API invocation
  - current adapters: OpenAI and Anthropic

- `runtime\input_assembler.py`
  - deterministic message-window construction
  - current fenced sections: `ENV`, `ANCHOR_PACK`, `EVIDENCE_PACK`, `CARRY_FORWARD`, `TASK`, `OUTPUT_GUARD`

- `runtime\payload_gate.py`
  - only loads admitted payload files listed in `inject_payloads`

- `runtime\state.py`
  - sanitizes carry-forward state and strips forbidden score or judge fields

- `benchmark_builder.py`
  - builds the runtime benchmark packet consumed by the runner

This is already a runner kernel. It is not yet a host-platform feature, but it is also not just documentation.

### What AG chain should generalize from this runtime

AG chain should generalize the runtime around interfaces, not around Legal-10 names. The reusable runtime seams are:

- package loader
- execution-plan loader
- model target selector
- input assembler
- payload gate
- candidate-state sanitizer
- scorer dispatcher
- artifact writer
- event emitter
- telemetry emitter

Legal-10 should implement these seams through package configuration and benchmark-specific modules.

### What should remain package-specific

The following should remain inside the Legal-10 package:

- exact step ids and step order
- exact prompt payload files
- benchmark-specific output schema rules
- benchmark-specific ground truth interpretation
- benchmark-specific scoring composition
- citation-integrity rules

### Runtime target state beyond the current 3-step implementation

The docs point to a broader target state than the 3-step runner currently covers. The target state includes:

- more steps than the current `d1 -> d2 -> j3`
- richer open-book synthesis and IRAC flows
- more benchmark package packaging rules
- more explicit stage-directory and no-leak controls
- stronger benchmark bundle semantics

So the current runtime proves the basic execution kernel, but not the full target-state platform.

---

## Context Delivery And State Persistence Model

### Benchmark-level principle

The strongest recurring principle across `docs/platform/inter-step-requirements.md`, `docs/platform/statefulness-context-persistence.md`, and the current runtime code is:

- the model should only receive explicitly staged context
- any inter-step persistence must be deliberate, sanitized, and auditable

This is a benchmark integrity requirement, not just an implementation preference.

### Current context assembly behavior

`runspecs\3-STEP-RUN\runtime\input_assembler.py` constructs prompts in a deterministic section order:

1. environment framing
2. anchor pack
3. evidence pack
4. carry-forward state
5. task instructions
6. output guard

That sectioned assembly is already the beginning of a configurable AG chain context-delivery system.

### Current payload admission behavior

`runspecs\3-STEP-RUN\runtime\payload_gate.py` only injects payloads explicitly named in the step configuration. This means the current runner already enforces a narrower invariant than a normal agent platform:

- no broad retrieval
- no ad hoc file access
- no implicit evidence expansion

The benchmark runner decides what is visible.

### Current state carry-forward behavior

`runspecs\3-STEP-RUN\runtime\state.py` recursively removes disallowed keys associated with:

- scores
- ground truth
- judge artifacts
- other protected fields

This is strong evidence that Legal-10 does not want arbitrary thread memory or provider memory. It wants explicit candidate-state persistence controlled by the runner.

### What AG chain should expose as configurable policy

AG chain should expose context and persistence as first-class run policies. The repo evidence supports at least the following future policy dimensions:

- `replay_minimal`
  - only step-essential admitted payloads plus sanitized carry-forward state

- `replay_full`
  - all benchmark-admitted prior visible material for the package-defined window

- `none`
  - no step-to-step candidate state

- `candidate_state_only`
  - only sanitized state explicitly carried by the runner

Current code does not yet present these as user-selectable modes, but the docs and runtime behavior clearly imply them.

### What AG chain should refuse to support for benchmark execution

For benchmark-grade runs, AG chain should not silently allow:

- live retrieval against the benchmark corpus
- unlogged tool access that can alter evidence visibility
- provider-native persistent memory
- opaque server-side thread history outside runner control

The Legal-10 docs treat these as threats to validity, not optional conveniences.

---

## Scoring, Judge, And Audit Model

### Composite evaluation model

Legal-10 does not use a single scoring mode. The repository shows a composite scoring approach:

- direct candidate outputs for benchmark steps
- deterministic or rule-based scoring
- judge-model scoring for subjective or rubric-based steps
- citation-integrity post-processing

The 3-step runner operationalizes this composite flow even though the full 10-step chain is not yet implemented.

### Current judge flow

`run_3s.py` executes a judge-pair grading stage after the model run. This matters architecturally because it means AG chain must treat the judged model as distinct from the evaluated model. The platform therefore needs independent configuration for:

- evaluated model target
- judge model target

That is not a nicety. It is already a requirement implicit in the current executable benchmark.

### Current artifact outputs

The current runner writes a meaningful artifact bundle, including:

- `run.jsonl`
- `audit_log.jsonl`
- `candidate_state.json`
- `summary.json`
- `run_manifest.json`

The observed sample run in `legal-10\runs\run_20260208_080028_154291` confirms that these artifacts are real and not just spec prose.

### Audit as product requirement

The audit model is not just logging. The core benchmark requirements imply that artifacts must prove:

- what inputs were admitted
- what model was called
- what outputs were produced
- what scoring happened
- what state was carried forward
- what integrity checks were applied

This is why AG chain should treat observability and audit as related but separate products:

- observability is for operations and debugging
- audit artifacts are for benchmark validity and reproducibility

### Current-state limitation

The current run artifacts are meaningful but thinner than the target-state documentation implies. For example:

- `summary.json` is present and useful
- `run_manifest.json` exists but is not yet a rich package-level manifest
- no `trace.jsonl` was observed in the sampled run directory

So current-state auditability is real, but not yet at the full level described by the most ambitious docs.

---

## AG Chain Shell, Menus, And Platform Surfaces

### Why AG chain should have its own shell

The clearest host precedent in `writing-system` is the admin area:

- `web\src\router.tsx` mounts a distinct shell at `/app/superuser/*`
- `web\src\components\layout\AdminShellLayout.tsx` creates a dedicated primary rail and secondary rail
- `web\src\components\admin\AdminLeftNav.tsx` defines sectioned secondary navigation based on route context

AG chain should be hosted the same way:

- not as a single page in the general app rail
- not as a small settings subsection
- but as its own benchmark-workbench shell

### Proposed AG chain primary rail

The platform nouns suggested by the benchmark corpus are:

- `Home`
- `Benchmarks`
- `Runs`
- `Datasets`
- `Models`
- `Evaluation Units`
- `Research Packs`
- `Artifacts`
- `Observability`
- `Settings`

These are platform nouns, not Legal-10-only nouns. That is why they fit AG chain better than a rail centered directly on Legal-10.

### Proposed AG chain secondary rail behavior

AG chain should mirror the admin pattern in `AdminLeftNav.tsx`, where the secondary rail changes with the current top-level page.

Examples:

- `Benchmarks`
  - all benchmarks
  - package versions
  - schemas
  - scorers
  - validation

- `Legal-10`
  - overview
  - datasets
  - EUs
  - RPs
  - run profiles
  - scoring
  - audit rules

- `Runs`
  - queue
  - active
  - completed
  - failed
  - saved profiles
  - comparisons

- `Observability`
  - run traces
  - step events
  - provider metrics
  - failures
  - audit correlation

### AG chain route shape inside writing-system

`web\src\router.tsx` already proves the host can support a separate shell family. The clean route family would look like:

- `/app/agchain`
- `/app/agchain/benchmarks`
- `/app/agchain/benchmarks/:benchmarkId`
- `/app/agchain/runs`
- `/app/agchain/runs/:runId`
- `/app/agchain/models`
- `/app/agchain/datasets`
- `/app/agchain/observability`

This would let AG chain behave as a first-class product inside the host rather than as a single embedded page.

---

## Shared Vs Independent Responsibilities Relative To Writing-System

The repository evidence supports a clean separation between host responsibilities and AG chain responsibilities.

### Shared host capabilities that already exist in writing-system

These capabilities already exist and should be reused rather than rebuilt:

- authenticated app hosting
- shell and route composition
- separate-shell precedent via `AdminShellLayout`
- environment-driven backend configuration
- FastAPI application bootstrap
- route modularization and mounting patterns
- background-worker style lifecycle management
- OpenTelemetry bootstrap
- telemetry status endpoints
- trace-correlated logging
- superuser/admin control surfaces

Concrete evidence:

- `web\src\router.tsx`
- `web\src\components\layout\AdminShellLayout.tsx`
- `web\src\components\admin\AdminLeftNav.tsx`
- `services\platform-api\app\main.py`
- `services\platform-api\app\api\routes\telemetry.py`
- `services\platform-api\tests\test_observability.py`

### AG chain-specific capabilities that the host does not already provide

These capabilities are benchmark-platform-specific and should live inside AG chain:

- benchmark registry
- benchmark package contract
- benchmark run-profile schema
- benchmark package loading
- EU and RP inspection surfaces
- benchmark artifact browsing
- benchmark run comparisons
- benchmark-specific context-delivery controls
- benchmark-specific persistence-policy controls
- scorer and judge orchestration for benchmark runs

### Legal-10-specific capabilities that should stay inside the benchmark package

These should not be lifted into AG chain core:

- legal citation and authority semantics
- RP construction rules
- EU ground-truth schema
- step ids such as `d1`, `d2`, `j3`, `j6`, `j7`, or `j10`
- citation-integrity checks
- benchmark-specific judge rubrics

### Shared but specialized surfaces

Some surfaces exist conceptually in the host already but need benchmark-specific specialization inside AG chain:

- model/provider selection
- run submission
- job progress views
- telemetry views
- artifact links
- settings pages

These are best understood as host capabilities with AG chain-specific semantics layered on top.

---

## Current Implementation Inventory Inside Legal-10

### Documentation surfaces

The documentation corpus is extensive and should be treated as the main source of target-state intent:

- `docs\specifications`
- `docs\mvp`
- `docs\platform`
- `docs\10-step-chain`
- `docs\build-pipeline`

The docs are not fully consistent, but they are dense enough to reconstruct benchmark intent with high confidence.

### Current runnable benchmark slice

The strongest implemented slice is the 3-step runner under:

- `runspecs\3-STEP-RUN\run_3s.py`
- `runspecs\3-STEP-RUN\benchmark_builder.py`
- `runspecs\3-STEP-RUN\adapters\model_adapter.py`
- `runspecs\3-STEP-RUN\runtime\input_assembler.py`
- `runspecs\3-STEP-RUN\runtime\payload_gate.py`
- `runspecs\3-STEP-RUN\runtime\state.py`

This is the current benchmark kernel.

### Current build and packaging helpers

The real build-side helpers are:

- `scripts\eu_builder.py`
- `scripts\rp_builder.py`

These scripts are important because they prove the package assets are not hypothetical. The repo already builds real benchmark components.

### Older or parallel runtime surfaces

The `chain` tree contains substantial logic but appears to represent an older or alternate structure:

- `chain\steps\s6_irac_synthesis.py`
- `chain\steps\s7_open_book_synthesis.py`
- `chain\scoring\s6_composite.py`
- `chain\steps\steps-current.md`

These files remain useful as source material for target-state step semantics, but they do not match the clearest current runtime slice.

### Tests

The repo has tests, but the current test suite is not green:

- `tests\test_3_step_run_citation_integrity.py`
- `tests\test_irac_judge_requirement.py`

Observed current failures show:

- stale module paths
- cwd-relative path assumptions

That means tests provide evidence, but not yet a clean verification baseline.

### Run artifacts

Observed run artifacts under `legal-10\runs\run_20260208_080028_154291` prove that:

- real model-backed runs have occurred
- summary and audit outputs are materialized
- current runner artifacts are already meaningful enough to guide platform design

### Website and reporting surfaces

`legal-10\website` appears to be a reporting and presentation surface rather than the execution environment. Still, `website\public\data\run-specs.json` is strategically useful because it already distinguishes:

- `l10_core`
- `l10_full`
- `ag10_main`

This implies the benchmark/reporting worldview is already broader than one narrow runtime slice.

---

## Current-State Vs Target-State Comparison

### What current code already proves

Current code already proves:

- Legal-10 can run real benchmark executions against live model APIs
- the runner can assemble admitted inputs deterministically
- the runner can sanitize state between steps
- the benchmark can produce auditable run artifacts
- build scripts can materialize RPs and EUs from the dataset substrate

### What exists mostly in specification form

The following exist more as target-state intent than as complete code:

- a generalized benchmark package contract
- a full AG chain platform shell inside `writing-system`
- a benchmark registry supporting unrelated benchmark families
- richer sealed bundle and manifest mechanics
- a complete 10-step executable chain
- a fully normalized package/version interface

### What is partially implemented

Several areas are in a partial state:

- packaging and sealing
- run manifest richness
- observability integration at benchmark-platform level
- benchmark-wide route/API surfaces
- naming and module organization consistency

### Strategic synthesis

The system is therefore neither “just docs” nor “already a platform.” It is:

- a strong benchmark specification corpus
- a real 3-step proof of execution
- a meaningful dataset/build substrate
- a host platform that can absorb the benchmark product
- but no single integrated AG chain platform yet

---

## Gaps, Contradictions, And Unresolved Tensions

### 1. Entry points and packaging do not match the live tree

`legal-10\pyproject.toml` declares scripts such as:

- `l10-run-chain = "scripts.run_chain:main"`
- `l10-serve-api = "scripts.serve_api:main"`

But the checked-in `scripts` directory does not currently contain matching live files for those entry points. This is a concrete mismatch between packaging declarations and current implementation.

### 2. Tests encode stale assumptions

Current pytest failures show at least two stale assumptions:

- citation-integrity tests look for `runspecs\3-STEP-RUN\citation_integrity.py` even though the scorer lives under `runspecs\3-STEP-RUN\scorers\citation_integrity.py`
- IRAC tests use cwd-relative file paths and fail from the repo root

This means the test suite is currently documenting an earlier tree layout more than it is validating the present one.

### 3. Step naming is not stable across the repo

The repo contains overlapping naming systems:

- older README references to AG8 and S1-S8
- current 3-step runtime references to `d1`, `d2`, `j3`
- `chain` references to `s6`, `s7`, and canonical `j6`, `j7`
- 10-step docs referencing later full-chain semantics

This instability is manageable if AG chain treats step ids as package-owned names, but it is a serious problem if the platform assumes one canonical naming system today.

### 4. Sealing is specified more strongly than it is currently implemented

The docs are emphatic about build-time packaging and sealing. The codebase clearly moves in that direction, but the current implementation appears stronger on:

- staged packet construction
- explicit payload admission

than on:

- end-to-end bundle sealing
- formal package manifests
- explicit release-grade verification of sealed artifacts

### 5. Observability intent is broader than current benchmark instrumentation

`docs/platform/langfuse-integration.md` argues for observability and trace systems as complementary infrastructure rather than the evaluation runner itself. `writing-system` already has OTEL-backed observability. But Legal-10 as currently implemented does not yet appear fully integrated into that host observability surface.

This is not a conceptual contradiction. It is a current integration gap.

### 6. Repo path assumptions leak through the documentation

Some docs and inventories still reference `E:\agchain\...` rather than `E:\writing-system\_agchain\...`. That does not block the architecture, but it does show the material has not yet been normalized around the current host location.

---

## Recommended First Implementation Surfaces

The first implementation surfaces should not try to solve the entire benchmark. They should establish the host-platform structure that lets the benchmark land cleanly.

### 1. Define the AG chain package contract inside writing-system

Create the first explicit benchmark package contract with concepts for:

- benchmark id and version
- dataset snapshot/version
- execution plan definitions
- run-profile schema
- scorer bindings
- artifact contract
- supported runtime policies

This is the main architectural translation layer between AG chain and Legal-10.

### 2. Create the AG chain shell inside the host UI

Use the admin-shell pattern as the immediate host precedent:

- dedicated AG chain shell layout
- dedicated AG chain primary rail
- route-scoped secondary rail
- route family under `/app/agchain/*`

This gives the platform a coherent home before the deeper execution work lands.

### 3. Introduce AG chain API surfaces in platform-api

The initial backend surface should cover:

- benchmark discovery
- model target discovery
- run submission
- run status
- run event streaming or polling
- artifact discovery

The host already has the application and observability scaffolding for this.

### 4. Port the 3-step Legal-10 runtime kernel into the host as the first package-backed execution path

Do not rewrite the benchmark runtime from scratch. Instead:

- preserve the proven 3-step runner semantics
- extract runtime seams into package-aware modules
- host those modules inside `writing-system`

This keeps execution aligned with the current benchmark truth.

### 5. Add benchmark-aware observability without collapsing audit into telemetry

Reuse `writing-system` OTEL infrastructure for:

- run spans
- step spans
- provider latency
- error telemetry

But keep benchmark artifacts as separate canonical outputs:

- audit artifacts remain benchmark truth
- telemetry remains operational truth

### 6. Normalize documentation and path assumptions after the host seams are in place

Once AG chain has a real host shell and API seam, the next cleanup pass should normalize:

- path references
- package names
- step naming documentation
- stale tests and entry points

That work will be easier once the destination architecture is real.

---

## Bottom-Line Understanding

The most accurate current understanding is:

- `writing-system` is already the right host platform.
- `AG chain` should be built as a benchmark-platform product inside it.
- `Legal-10` should be implemented as the first benchmark package on that platform.

The legal benchmark work is not merely "documentation waiting for code." The repository already contains:

- a serious benchmark specification corpus
- a real dataset/build substrate
- a real 3-step execution kernel
- real run artifacts

What is missing is the integrated host-platform layer that turns those pieces into a stable benchmark product with:

- a dedicated shell
- benchmark and run management
- model and runtime policy selection
- artifact browsing
- observability integration
- a package contract capable of hosting future non-legal benchmarks

That is the architecture direction the current evidence supports most strongly.
