---
title: "Platform requirements"
sidebar:
  order: 2
---

# AG Chain Platform Requirements
**Some details in this document is likely not completely accurate. Some details or plans might change as needed. The intent should be to grasp the general direction not use this as canonical requirement that must be complied with**
**Date:** 2026-03-26  
**Status:** Draft requirements document for AG chain inside `writing-system`  
**Purpose:** Capture, in one coherent place, the product requirements, architecture requirements, runtime requirements, and implementation boundaries discussed for AG chain as a benchmark authoring and execution platform.

---

## 1. Document Intent

This document is not a historical analysis of the current repository. It is a requirements document for what `_agchain` needs to become inside `writing-system`.

It consolidates four sources of direction:

- the Legal-10 benchmark specifications and runtime behavior already investigated
- the dataset and packaging assumptions already established
- the `writing-system` host-platform patterns already present in the UI, API, and observability stack
- the additional product decisions and constraints established through this session

This document should be read together with:

- 2026-03-26-agchain-platform-understanding.md

The understanding dossier explains why these requirements are defensible. This document states what AG chain must do.

---

## 2. Product Definition

AG chain is a generic benchmark platform hosted inside `writing-system`.

AG chain is not:

- a synonym for Legal-10
- just a script runner
- just a reporting dashboard
- just a dataset builder

AG chain is:

- a benchmark authoring platform
- a benchmark packaging platform
- a benchmark execution platform
- a model-selection platform for benchmark runs
- a scoring and artifact platform
- an observability-enabled benchmark operations platform

Legal-10 is the first benchmark package hosted by AG chain.

AG chain must be designed so that future benchmarks can be:

- unrelated to legal datasets
- built from different raw data sources
- packaged differently at build time
- executed with different step plans and scorers

without requiring AG chain itself to become Legal-10-specific.

---

## 3. Product Goals

AG chain must enable a user to:

- author and package benchmark assets
- register and version benchmarks
- choose an evaluated model through the platform
- choose execution and runtime policies through the platform
- run a benchmark repeatedly on different selected models
- automatically score and store results
- inspect raw benchmark artifacts and audit outputs
- inspect runtime traces and operational telemetry
- compare results across runs, models, and benchmark versions

AG chain must preserve benchmark rigor while still exposing flexible runtime configuration.

---

## 4. Non-Goals For This Phase

The following are out of scope for this phase unless explicitly reintroduced later:

- integrating or replacing the static Legal-10 website
- reading DuckDB directly at runtime from the benchmark UI or runner
- making AG chain a superuser-only workspace
- making AG chain dependent on Legal-10-specific step names or dataset fields
- treating the benchmark as only a CLI product

The static website has no required relationship to the AG chain shell for now.

---

## 5. Host Integration Requirements

### 5.1 Shell topology

AG chain must be implemented as a fourth sibling shell under the authenticated app router.

The intended shape is:

- `AuthGuard`
- `AppLayout`
- `FlowsShellLayout`
- `AdminShellLayout`
- `AgchainShellLayout`

AG chain must not be implemented as:

- an admin subsection
- a general app page with no dedicated shell
- a standalone frontend stored outside the host app

### 5.2 Route family

AG chain must live under its own dedicated route family:

- `/app/agchain/*`

### 5.3 Guarding model

AG chain must not require a special superuser-only guard as part of its product definition.

Requirements:

- no `AgchainGuard` is required for the product concept
- no superuser-only assumption should shape its architecture
- if `writing-system` uses normal authenticated app access, AG chain may inherit that host behavior
- AG chain should remain architecturally capable of becoming its own repo later without depending on admin-only semantics

### 5.4 Long-term portability

AG chain is being developed inside `writing-system` with the explicit intention that it may later be extracted into its own repository.

Requirements:

- AG chain-specific logic should be organized so it can be separated later
- host-platform patterns should be reused now, not reimplemented
- AG chain should avoid unnecessary coupling to unrelated `writing-system` product areas

---

## 6. Code Ownership And Directory Boundaries

### 6.1 Live product UI

All live React UI for AG chain should be implemented in the host web app.

Requirements:

- pages should live under `web/src/pages/agchain/*`
- components should live under `web/src/components/agchain/*`
- shell layout should be added as a host layout component, e.g. `AgchainShellLayout.tsx`
- AG chain routing should be registered in the host router

AG chain should not create a second independent frontend application under `_agchain`.

### 6.2 Live backend and orchestration

All live API and orchestration surfaces for AG chain should be implemented using `platform-api` patterns.

Requirements:

- backend routes should live under `services/platform-api/app/api/routes/*`
- AG chain execution should be triggered through API routes and backend orchestration patterns
- the backend should emit telemetry using the same OpenTelemetry-based patterns already present in `platform-api`

### 6.3 Benchmark workspace and portable domain material

`_agchain` should remain the benchmark workspace and extraction boundary.

Requirements:

- benchmark documentation remains in `_agchain/docs/*`
- benchmark packages such as `legal-10` remain in `_agchain`
- dataset/build assets and builder-side Python logic remain in `_agchain`
- package-specific benchmark logic may begin in `_agchain` even if later integrated more deeply into host services

This split means:

- `web` = live host UI
- `platform-api` = live host API and orchestration
- `_agchain` = benchmark domain workspace and future extraction boundary

---

## 7. AG Chain Functional Domains

AG chain must cover both benchmark authoring/building and benchmark execution/inspection.

The required top-level functional domains are:

- Home
- Benchmarks
- Build
- Runs
- Results
- Models
- Artifacts
- Observability
- Settings

These are product domains, not merely nav labels.

### 7.1 Home

Home must provide:

- a platform landing view
- recent runs
- benchmark/package health
- model/provider status summary
- warnings for missing configuration or invalid assets
- quick entry into common actions

### 7.2 Benchmarks

Benchmarks must provide:

- a benchmark registry
- benchmark package discovery
- benchmark version listing
- benchmark metadata
- benchmark capability summary
- benchmark-specific schemas
- benchmark step plan visibility
- benchmark scorer visibility

Benchmarks must treat Legal-10 as the first package, not the whole platform.

### 7.3 Build

Build is a required domain and must not be omitted from the product.

Build must provide:

- RP builder surfaces
- EU builder surfaces
- benchmark packet or benchmark bundle builder surfaces
- package assembly workflows
- package validation workflows
- integrity validation before execution
- dataset snapshot selection for build-time inputs

Build is where build-time reference data may be used. It is not runtime execution.

### 7.4 Runs

Runs must provide:

- run setup
- saved run profiles
- launch workflow
- queue view
- active run view
- completed run view
- failed run view
- rerun or clone-run workflow

### 7.5 Results

Results must provide:

- score summaries
- candidate outputs
- judge outputs
- citation-integrity outputs where applicable
- comparison across runs
- comparison across models
- comparison across benchmark versions
- leaderboard-style summaries where useful

### 7.6 Models

Models must provide:

- model/provider registry
- evaluated model selection
- judge model selection
- endpoint configuration
- API-based model connectivity
- model health or availability visibility
- capability metadata

### 7.7 Artifacts

Artifacts must provide direct inspection of raw benchmark outputs.

Artifacts must include access to:

- `run.jsonl`
- `audit_log.jsonl`
- `candidate_state.json`
- `summary.json`
- run manifests
- raw step outputs
- package or bundle manifests where applicable

### 7.8 Observability

Observability must provide:

- OpenTelemetry-based traces
- step events
- provider latency visibility
- failure diagnostics
- run-level and step-level telemetry visibility
- audit-versus-telemetry correlation where possible

### 7.9 Settings

Settings must provide AG chain-specific configuration surfaces for:

- runtime defaults
- storage roots
- artifact retention
- benchmark package registration
- concurrency defaults
- operational controls specific to AG chain

---

## 8. Shell And Navigation Requirements

### 8.1 Dedicated shell

AG chain must have its own shell layout, modeled after the existence of `AdminShellLayout`, but dedicated to benchmark workflows.

### 8.2 Primary rail

The AG chain primary rail should reflect the functional domains in Section 7.

Minimum required primary rail:

- Home
- Benchmarks
- Build
- Runs
- Results
- Models
- Artifacts
- Observability
- Settings

### 8.3 Secondary rail

AG chain should have a route-aware secondary rail similar in spirit to the admin secondary rail.

Examples of secondary-rail groupings:

- Benchmarks
  - all benchmarks
  - versions
  - schemas
  - scorers
  - validation

- Legal-10
  - overview
  - datasets
  - EUs
  - research packs
  - scoring
  - audit rules

- Build
  - research pack builder
  - evaluation unit builder
  - bundle builder
  - validation
  - integrity checks

- Runs
  - setup
  - queue
  - active
  - completed
  - failed
  - saved profiles

- Results
  - summaries
  - comparisons
  - leaderboards
  - judge outputs
  - citation integrity

The exact menu wording can change, but the functional coverage must remain.

---

## 9. Benchmark Package Requirements

AG chain must support benchmark packages as the core platform abstraction.

### 9.1 Package abstraction

AG chain must not hardcode Legal-10 assumptions into the platform core.

The platform must treat a benchmark package as a unit that provides:

- package metadata
- benchmark version
- dataset version references
- execution plan definitions
- step definitions
- prompt or message construction rules
- payload admission rules
- output schemas
- scoring bindings
- artifact contract
- validation rules
- supported runtime policies

### 9.2 Legal-10 as first package

Legal-10 must be implemented as the first benchmark package.

Legal-10-specific constructs such as:

- EUs
- research packs
- `d1`, `d2`, `j3`
- later step expansions
- legal scoring semantics

must remain package-owned semantics, not AG chain core semantics.

### 9.3 Registry and versioning

AG chain must include benchmark package registry and versioning capabilities.

Requirements:

- register benchmark packages
- list benchmark package versions
- associate dataset versions with package versions
- associate scorer versions with package versions
- expose package compatibility metadata

This is one of the critical missing surfaces from a simple runner UI.

---

## 10. Data And Asset Requirements

### 10.1 Build-time versus runtime data

DuckDB is build-time only.

Requirements:

- DuckDB may be used for benchmark development, data processing, RP construction, EU construction, or asset generation
- DuckDB must not be read directly by the runtime UI
- DuckDB must not be read directly by the runtime benchmark runner
- benchmark execution must use packaged benchmark assets only

### 10.2 Runtime assets

The runtime must load self-contained benchmark assets.

Minimum required runtime asset concepts:

- research packs or equivalent staged evidence packs
- evaluation units
- benchmark packets or benchmark bundles
- manifests and package metadata

The execution environment must consume built assets, not raw reference data.

### 10.3 Self-contained evaluation units

Evaluation units must be packaged so that the runner or orchestrator can load and run them without calling back into DuckDB or any raw build-time store.

### 10.4 Integrity and sealing direction

AG chain must preserve the benchmark goal of:

- packaged execution
- explicit payload admission
- reproducible runtime visibility
- integrity checks around packaged assets

Whether the exact release-grade sealing mechanics evolve later, the runtime must be designed around packaged, controlled assets.

---

## 11. Backend Runtime Requirements

### 11.1 API-triggered execution

The benchmark runner must not remain only a Python CLI invoked manually as the product interface.

Requirements:

- runs must be triggered through `platform-api` or the same architectural pattern used by `platform-api`
- execution must be represented as a backend orchestration workflow
- AG chain UI must interact with runs through API surfaces, not shelling out directly from the browser

### 11.2 Python runtime engine

The underlying benchmark runtime may remain Python-based.

Requirements:

- existing benchmark execution code can remain the underlying engine
- AG chain should wrap and orchestrate that runtime through backend services
- direct script behavior should be treated as implementation detail, not the primary product surface

### 11.3 Run lifecycle

The backend must support at least:

- run submission
- run validation
- run start
- step-level progress visibility
- run completion
- run failure handling
- artifact persistence
- result persistence

### 11.4 Storage expectations

Run outputs must be automatically stored so that the same benchmark can be run repeatedly on new selected models while preserving historical results.

Requirements:

- scores must be saved
- artifacts must be saved
- run metadata must be saved
- repeated executions against different models must remain comparable

---

## 12. Model Selection Requirements

Model selection is a first-class platform feature and must not be treated as a hidden backend configuration.

AG chain must provide:

- evaluated model selection
- provider/API endpoint selection
- support for OpenAI-compatible API patterns
- support for direct API-connected model providers where needed
- model capability metadata
- health or connection visibility

The platform should feel more like a model-selectable benchmark environment, similar in spirit to how agent platforms expose model configuration, rather than a fixed benchmark script with one hardcoded provider.

AG chain must also support independent judge-model configuration when benchmark scoring requires it.

---

## 13. Runtime Policy Requirements

Runtime policies are a central requirement, not a secondary option set.

### 13.1 Required policy categories

AG chain must expose configurable runtime policies for at least:

- context delivery
- context persistence or statefulness
- step-to-step API call strategy
- model target selection
- judge model selection
- retry behavior
- concurrency behavior
- tool availability

### 13.2 Step call strategy

AG chain must support both of the following modes:

- one API call per step
- single-call multi-step execution

Per-step API calling is required because it prevents the evaluated model from seeing future steps in advance.

Single-call execution is also required as an available option when intentionally chosen.

### 13.3 Context persistence and statefulness

AG chain must provide standardized control over how context is preserved across steps.

The exact final policy set may evolve, but the platform must be designed to support multiple persistence strategies rather than one hardcoded approach.

At minimum, the platform should be able to represent variants such as:

- no persistence
- sanitized carry-forward only
- replay of prior visible context
- broader session-style context replay when intentionally allowed

### 13.4 Standardized context control

AG chain must provide a platform-controlled way to define what context is preserved and how it is replayed.

This requirement exists because benchmark validity depends on preventing the evaluated model from gaining access to context it should not see.

### 13.5 Tools made available by the platform

Recent discussion expands the runtime scope beyond prompt-only execution.

AG chain should be designed to optionally provide evaluated models access to platform-mediated tools such as:

- internet access
- skills
- APIs
- other platform-provided tool surfaces

Requirements:

- tool availability must be explicit and policy-controlled
- tool usage must be standardized by the platform
- benchmark runs must be able to specify whether tools are allowed
- tool exposure must not implicitly bypass benchmark visibility controls

This is a major runtime requirement and needs careful design.

---

## 14. Builder Requirements

Builder surfaces are mandatory.

AG chain must provide builder functionality for:

- research packs or equivalent payload packages
- evaluation units
- benchmark packets or benchmark bundles
- package validation and integrity checking

These builder surfaces are essential because the platform is for benchmark authoring as well as execution.

AG chain must therefore support the lifecycle:

- build benchmark assets
- validate benchmark assets
- register benchmark packages
- execute benchmark packages
- inspect results and artifacts

---

## 15. Validation Requirements

Package and bundle validation is a required platform capability.

AG chain must validate:

- required files exist
- manifests are complete
- step definitions are resolvable
- scorer references are valid
- asset dependencies are present
- package version metadata is coherent
- build outputs are runnable

Validation must happen before benchmark execution, not only after failures occur.

---

## 16. Artifact And Audit Requirements

Raw artifact inspection is a required capability.

AG chain must preserve and expose benchmark artifacts in a way that lets users inspect exactly what happened during execution.

The artifact surface must include, where applicable:

- raw step outputs
- candidate state
- run logs
- audit logs
- score summaries
- manifests
- benchmark package metadata relevant to the run

AG chain must distinguish between:

- operational observability
- benchmark audit truth

Observability shows how the system behaved operationally. Audit artifacts show what happened in benchmark terms.

Both are required.

---

## 17. Observability Requirements

AG chain must use the same OpenTelemetry-based observability direction already present in `platform-api`.

Requirements:

- run-level telemetry
- step-level telemetry
- provider latency visibility
- error telemetry
- trace correlation where possible
- operational status surfaces similar in spirit to existing telemetry-status patterns

AG chain should not invent a completely separate observability model if host-platform observability patterns already solve the problem.

Observability must be built into the platform design, not added later as a cosmetic enhancement.

---

## 18. Results And Repeatability Requirements

AG chain must support repeated execution of the same benchmark against different selected models over time.

Requirements:

- results are automatically tallied
- scores are saved
- prior runs remain accessible
- repeated runs are comparable
- the same benchmark can be rerun with new model targets without manual bookkeeping

This requirement is central to the product value of AG chain.

---

## 19. Shared Versus Independent Responsibilities

### 19.1 Shared with writing-system

The following should be reused from the host wherever possible:

- shell and route composition patterns
- backend route patterns
- OpenTelemetry setup patterns
- telemetry-status style operational patterns
- general host application structure

### 19.2 Independent to AG chain

The following belong to AG chain and must be treated as its independent product responsibilities:

- benchmark registry
- benchmark package versioning
- build surfaces
- run-policy controls
- EU and research-pack lifecycle
- benchmark execution orchestration
- score and artifact management
- benchmark-oriented UI flows

### 19.3 Independent to Legal-10 package

The following remain benchmark-package-specific:

- legal benchmark semantics
- legal step names and sequencing
- legal scoring specifics
- citation-integrity rules
- legal package-specific prompt and payload behavior

---

## 20. Explicit Rejections And Constraints

The following statements are intentionally locked in as constraints from this session:

- AG chain is not just Legal-10.
- DuckDB must not be used directly at runtime.
- runtime should load self-contained EUs and packaged benchmark assets.
- the product should use `platform-api` patterns for execution and orchestration.
- AG chain should have its own independent shell.
- AG chain is not defined as a superuser-only workspace.
- the static website has no required relationship to AG chain for now.
- builder surfaces are required.
- package or bundle validation is required.
- run-policy controls are required.
- raw artifact inspection is required.
- benchmark package registry and versioning are required.

---

## 21. Minimum Platform Slice

If implementation needs a minimum first slice, it must still cover both sides of the product:

- benchmark authoring/building
- benchmark execution/inspection

The smallest acceptable first-platform slice should therefore include:

- `AgchainShellLayout`
- AG chain route family
- benchmark registry surface
- build surface for benchmark assets
- run launch surface
- model selection surface
- runtime policy controls
- artifact inspection surface
- observability surface

A slice that only runs benchmarks but cannot build, validate, inspect, and compare them is too narrow.

---

## 22. Bottom-Line Requirement

AG chain must become a benchmark platform inside `writing-system` that:

- authors benchmark assets
- packages benchmark assets
- validates benchmark assets
- selects evaluated models through the platform
- executes benchmarks through API-orchestrated backend workflows
- preserves controlled runtime visibility and statefulness policies
- saves scores and artifacts automatically
- exposes raw artifacts and benchmark results
- exposes OpenTelemetry-based observability
- remains generic enough to host future non-Legal benchmarks

Legal-10 is the first benchmark package on that platform, not the definition of the platform itself.
