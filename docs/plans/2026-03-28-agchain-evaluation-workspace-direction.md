# AGChain Evaluation Workspace Direction

**Goal:** Define the product and architecture direction for AGChain's missing evaluation surfaces so the next implementation plans can build a Braintrust-shaped frontend over an Inspect-compatible execution substrate without collapsing AGChain's own benchmark semantics.

**Architecture:** Keep `services/platform-api` as the browser-facing control plane, keep `_agchain/legal-10` and future benchmark packages as the semantic runtime layer, adopt Inspect patterns for datasets, model roles, sandbox providers, tracing, and eval decomposition, and evolve AGChain into a unified evaluation workspace with first-class `datasets`, `playgrounds`, `experiments`, `runs`, and `trace` surfaces rather than isolated benchmark/model pages plus placeholders.

**Tech Stack:** Supabase Postgres migrations and RLS, FastAPI, React + TypeScript, OpenTelemetry, AGChain benchmark packages under `_agchain`, Inspect-compatible runtime patterns, local/remote sandbox providers.

**Status:** Directional Draft
**Author:** Codex
**Date:** 2026-03-28

## Scope Statement

This document is intentionally not a task-by-task execution plan. It is a direction lock and surface contract for the next AGChain planning wave. It defines:

- the target product shape
- the canonical object model
- the missing runtime/data/control-plane seams
- the frontend information architecture
- the boundaries between AGChain ownership and Inspect adoption

Exact endpoint-by-endpoint contracts, file inventories, and bite-sized TDD tasks should be written only after this direction is approved.

## Directional Manifest

### Platform API

Already real:

- AGChain model-target route family
- AGChain benchmark registry route family

Directionally required route families:

- dataset registry and dataset detail
- dataset samples and sample drilldown
- experiment registry and experiment detail
- run submission / status / cancellation / retry
- playground save / execute / promote-to-experiment
- trace and sample-result retrieval
- prompt / scorer / parameter / tool metadata if exposed in AGChain web surfaces

This document intentionally does not freeze exact verbs and paths. The next execution-ready plan must do that.

### Observability

Directionally required observability families:

- run lifecycle traces
- sample / step traces
- sandbox / tool traces
- scorer traces
- provider usage metrics
- failure / anomaly structured logs

### Database Migrations

Already real:

- AGChain model-target migrations
- AGChain benchmark registry migrations
- `agchain_runs` as a primitive run record

Directionally required future object families:

- datasets
- dataset versions
- dataset samples
- experiments
- richer run / sample-result / trace persistence
- playground session persistence

This document intentionally does not freeze migration filenames. The next execution-ready plan must do that.

### Edge Functions

No edge functions are part of the direction. AGChain browser-facing control should remain in `services/platform-api`.

### Frontend Surface Area

Already real:

- benchmark catalog
- benchmark workbench shell
- models surface

Still placeholder or missing:

- runs
- results / comparisons
- observability / traces
- datasets
- experiments
- playgrounds
- prompt / scorer / parameter / tool surfaces

## Verified Current State

### Frontend

Current mounted AGChain routes under `/app/agchain`:

- `benchmarks` has a real catalog page and benchmark-local workbench shell
- `models` has a real model target registry surface
- `runs` is a placeholder
- `results` is a placeholder
- `observability` is a placeholder

Current page owners:

- `web/src/pages/agchain/AgchainBenchmarksPage.tsx`
- `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.tsx`
- `web/src/pages/agchain/AgchainModelsPage.tsx`
- `web/src/pages/agchain/AgchainRunsPage.tsx`
- `web/src/pages/agchain/AgchainResultsPage.tsx`
- `web/src/pages/agchain/AgchainObservabilityPage.tsx`

Current shell direction:

- `web/src/components/layout/AgchainShellLayout.tsx`
- `docs/plans/__prev/2026-03-28-agchain-two-rail-shell-redesign-plan.md`

### Backend / Database

Current AGChain-owned data/control seams already exist for:

- model targets and health checks
- benchmark registry, versions, steps, model-target bindings
- `agchain_runs` database storage as a primitive run row
- Inspect execution backend seam in `_agchain/legal-10`

Current AGChain-owned data/control seams do not yet exist for:

- dataset registry
- dataset versions / samples
- experiment registry
- sample-level result storage
- trace drilldown storage/view model
- playground session state

Current backend owners:

- `services/platform-api/app/api/routes/agchain_models.py`
- `services/platform-api/app/api/routes/agchain_benchmarks.py`
- `services/platform-api/app/domain/agchain/model_registry.py`
- `services/platform-api/app/domain/agchain/benchmark_registry.py`
- `_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py`

### Runtime / Inspect Direction Already Locked

Existing AGChain direction already states:

- AGChain remains semantic-first
- Inspect is an execution substrate reference, not the semantic authority
- assembled message windows remain AGChain-owned
- staging, payload admission, candidate state, scoring, and audit artifacts remain AGChain-owned

Primary direction references:

- `docs/plans/2026-03-27-inspectAI-execution-backend-implementation-plan-final.md`
- `_agchain/_reference/inspect_ai/docs/datasets.qmd`
- `_agchain/_reference/inspect_ai/docs/tasks.qmd`
- `_agchain/_reference/inspect_ai/docs/models.qmd`
- `_agchain/_reference/inspect_ai/docs/solvers.qmd`
- `_agchain/_reference/inspect_ai/docs/scorers.qmd`
- `_agchain/_reference/inspect_ai/docs/sandboxing.qmd`
- `_agchain/_reference/inspect_ai/docs/tracing.qmd`

## Product Direction

AGChain should stop presenting itself primarily as:

- benchmark editor
- model registry
- future runs placeholder
- future results placeholder
- future observability placeholder

AGChain should instead become a unified evaluation workspace with the same exposed object vocabulary users now expect from Braintrust-like systems:

- datasets
- playgrounds
- experiments
- runs
- traces / logs
- prompts
- scorers
- parameters
- tools
- benchmarks
- models

The key product shift is:

- `Benchmarks` stay important, but they are no longer the only real authoring spine.
- `Experiments` become the primary comparison surface.
- `Datasets` become the primary sample-selection spine.
- `Playgrounds` become the primary interactive authoring and pre-experiment surface.
- `Runs` become operational execution records, not the main product summary surface.
- `Observability` becomes trace/log drilldown, not placeholder prose.

## Canonical Object Model

### Core domain objects

1. `Benchmark`
   - versioned benchmark package / authored task definition
   - AGChain-owned semantics, prompts, scorer references, runtime expectations

2. `Dataset`
   - reusable named collection of samples
   - project-scoped, versioned, filterable

3. `Sample`
   - stable `sample_id`
   - metadata
   - optional attached files / packet assets
   - optional sandbox/setup hints
   - maps cleanly to Inspect's `Sample` concept

4. `ModelTarget`
   - user-visible resolved model endpoint / provider target
   - already implemented

5. `RuntimeProfile`
   - execution policy bundle
   - candidate/judge model role mapping
   - sandbox backend and policy
   - time/token/message/cost limits
   - AGChain-owned fairness and carry-forward behavior

6. `Experiment`
   - named comparison object
   - binds benchmark version + dataset version + runtime profile + evaluated model set + judge model policy
   - owns summaries, deltas, regressions, and rerun lineage

7. `Run`
   - concrete execution attempt of an experiment or playground save
   - queue / running / completed / failed lifecycle

8. `SampleResult`
   - one sample's evaluated output, scores, errors, artifacts, and trace references within a run

9. `Trace`
   - sample- and step-level execution timeline
   - messages, tool calls, sandbox actions, scorer events, provider usage, errors

10. `PlaygroundSession`
    - ad hoc interactive evaluation setup
    - can be promoted to an experiment

### AGChain-specific extensions beyond Inspect

These remain AGChain-owned and are not delegated to generic Inspect defaults:

- admitted-payload visibility rules
- staged EU packet projection
- inter-step carry-forward state
- candidate-visible vs judge-visible separation
- benchmark-native audit artifacts
- fairness / policy bundles as a comparison axis

## Frontend Direction

### Target top-level information architecture

The AGChain shell should evolve toward these top-level surfaces:

1. `Overview`
2. `Datasets`
3. `Playgrounds`
4. `Experiments`
5. `Benchmarks`
6. `Models`
7. `Runs`
8. `Observe`
9. `Prompts`
10. `Scorers`
11. `Parameters`
12. `Tools`
13. `Settings`

Not every surface needs to ship at once, but the architecture should be built assuming this object model, not assuming the current five-item shell is final.

### Priority missing surfaces

The most important missing real surfaces are:

1. `Datasets`
   - registry table
   - dataset detail
   - sample table
   - sample drilldown

2. `Experiments`
   - experiment table
   - run summary cards
   - baseline vs candidate comparisons
   - regression highlighting

3. `Playgrounds`
   - benchmark/task selection
   - dataset/sample selection
   - model and scorer controls
   - run-preview / save-as-experiment

4. `Observe`
   - trace list
   - per-run drilldown
   - per-sample message / tool / scorer timeline
   - compare two traces or two sample results side by side

### Design references

Use the captures in `docs/design` as the immediate visual reference set:

- `docs/design/image copy 2.png` — project overview with evaluation and observability blocks
- `docs/design/image copy.png` — prompt/editor split layout with right-side context panel
- `docs/design/image copy 3.png` — grouped settings navigation density and project-level object nav
- `docs/design/image.png` — compact configuration form styling in dark mode

Directional UI takeaways:

- dense left-rail object navigation
- summary cards plus empty-state guidance on overview pages
- table-first datasets and experiments surfaces
- editor/workbench surfaces with a wide primary pane and narrow contextual side pane
- direct navigation continuity between logs/observe and evaluations

## Backend Direction

### Platform API role

`services/platform-api` should be the browser-facing control plane for:

- dataset CRUD and versioning
- experiment CRUD
- run submission and status
- playground save / run
- trace and sample-result retrieval
- prompt/scorer/tool registry metadata if surfaced in the web app

### Runtime role

`_agchain/legal-10` and future benchmark packages remain the semantic runtime owners for:

- message assembly
- payload admission
- candidate state
- scorer semantics
- benchmark-native audit logs

Inspect should be used where AGChain benefits from substrate patterns:

- dataset/sample decomposition
- model roles
- structured output controls
- reasoning capture
- tracing patterns
- sandbox provider interfaces

### Sandbox direction

Borrow Inspect's sandbox provider pattern directly, but not its semantics wholesale.

AGChain should own:

- which packet files are projected
- which files are candidate-visible
- which files are judge-visible
- whether sandbox state is per-sample, per-step, or per-call

Inspect-derived pieces to adopt:

- sandbox backend abstraction
- local/docker provider pattern first
- remote providers later via EC2/K8s-style plugins
- tool-support container pattern

## Directional Data Surface

### Existing AGChain tables

- `agchain_model_targets`
- `agchain_model_health_checks`
- `agchain_benchmarks`
- `agchain_benchmark_versions`
- `agchain_benchmark_steps`
- `agchain_benchmark_model_targets`
- `agchain_runs`

### Missing AGChain tables / stores

Directionally required new object families:

- `agchain_datasets`
- `agchain_dataset_versions`
- `agchain_dataset_samples`
- `agchain_experiments`
- `agchain_experiment_runs` or a richer expansion of `agchain_runs`
- `agchain_run_sample_results`
- `agchain_run_traces` or a trace-reference table to stored artifacts
- `agchain_playground_sessions`

### Storage / artifact direction

Use project-owned persisted artifacts for:

- run manifests
- sample outputs
- score summaries
- trace bundles
- benchmark-native audit artifacts

`storage_objects` and existing service-run artifact patterns may be reused for raw artifact persistence, but AGChain still needs domain tables to make experiments, datasets, and sample results queryable in product surfaces.

## Directional Observability Surface

AGChain should adopt the host platform's OTel conventions and extend them with AGChain-specific attributes and drilldowns.

Required observability families:

- run submission / queue traces
- per-sample execution traces
- per-step candidate/judge traces
- sandbox lifecycle and tool-call traces
- scorer invocation traces
- provider latency / token / cost metrics
- structured logs for failed runs, failed samples, and sandbox anomalies

The long-term Observe surface should unify:

- raw runtime telemetry
- execution artifacts
- scorer metadata
- experiment/result drilldown

## Locked Directional Decisions

1. AGChain should borrow Braintrust's exposed frontend patterns more than Inspect's raw UI.
2. AGChain should borrow Inspect's runtime and sandbox patterns more than Braintrust's undocumented backend assumptions.
3. `Datasets`, `Playgrounds`, and `Experiments` are first-class missing surfaces and should not be treated as secondary polish.
4. `Runs` are operational execution records, not the primary analysis surface.
5. `Results` should evolve into experiment/sample comparison views rather than remain a disconnected top-level placeholder category.
6. `Observe` should unify traces and logs with evaluation drilldown rather than live as a separate ops-only concept.
7. AGChain remains semantic-first. Inspect remains a substrate.
8. No future plan should assume the current AGChain route map is already the right product map.

## Recommended Planning Order

The next execution-ready plans should be written in this order:

1. `Datasets surface + dataset registry`
2. `Experiments surface + experiment/run comparison spine`
3. `Run submission + orchestration surface`
4. `Observe / trace drilldown surface`
5. `Playgrounds surface`
6. `Prompt / scorer / parameter / tool workspace surfaces`

## Explicit Non-Goals For This Direction Document

- No exact endpoint-by-endpoint contract yet
- No exact migration filenames yet
- No exact frontend file inventory yet
- No bite-sized TDD execution tasks yet

Those belong in the next plan documents, after this direction is accepted.

## Direction Approval Criteria

This direction is approved when all of the following are accepted:

1. AGChain will target a Braintrust-shaped evaluation workspace rather than extend the current benchmark/model shell indefinitely.
2. Inspect remains a substrate for datasets, model roles, sandbox providers, tracing, and execution patterns, not the semantic authority.
3. `Datasets`, `Experiments`, `Playgrounds`, and `Observe` are recognized as first-class missing surfaces.
4. Future execution-ready plans will be written per surface family rather than as one giant implementation batch.
