# AG chain InspectAI Reference Runtime Boundary Plan

**Goal:** Rebase AG chain's runtime architecture on `inspect_ai` where it is strong, while explicitly preserving AG chain ownership over context delivery, statefulness, payload admission, and fairness policy so the platform can expose richer benchmark-controlled runtime options than Inspect supplies by default. AG chain is not only a benchmark-versus-model platform. It must also support deliberate comparison of the same evaluated model against the same benchmark under different runtime-policy bundles for context, tools, memory, session topology, and sandbox behavior.

**Architecture:** `writing-system` remains the host shell and API surface. `AG chain` remains the benchmark product, registry, authoring workbench, orchestration plane, and audit layer. `Legal-10` remains the first benchmark package and build workspace. `inspect_ai` becomes the primary Python execution reference for model providers, model roles, sandbox environments, approval policies, scorer composition, eval logs, and trace logs. However, AG chain keeps ownership of the benchmark-runtime policy plane: session topology, replay strategy, carry-forward rules, payload gating, candidate-visible state, tool-equality policy, runtime-policy-bundle identity, and benchmark-specific audit artifacts.

**Tech Stack:** Python 3.10+, FastAPI, Pydantic, AnyIO, InspectAI runtime primitives, Supabase Postgres for AG chain registry state, React + TypeScript for the host UI, OpenTelemetry for host-platform observability.

**Status:** Draft
**Author:** Codex
**Date:** 2026-03-26

## Stack Profile: InspectAI

**Primary Language(s):** Python
**Runtime:** Python package + CLI, Pydantic models, AnyIO concurrency, FastAPI-based log/view server

**Backend / Runtime Capabilities**

- Task abstraction combining dataset, solver, scorer, model, sandbox, approval, metadata, and limits
- Sample abstraction with `input`, `target`, `metadata`, `sandbox`, `files`, and `setup`
- Solver framework for prompt engineering, multi-turn execution, and custom agent scaffolds
- Scorer framework including deterministic scorers and model-graded scorers
- Model provider framework built around `ModelAPI`, provider registry, model roles, retries, limits, caching, and OpenAI-compatible backends
- Sandbox framework with a stable `SandboxEnvironment` interface and built-in `docker` and `local` bindings
- Approval-policy framework for tool calls
- Eval logs, trace logs, and a separate viewer/server surface

**Notable Strengths For AG Chain**

- provider normalization
- model-role support for grader or judge models
- sandbox abstraction
- tool approval policy
- retry and limit semantics
- rich per-run and per-sample logging
- trace logging for model, subprocess, and sandbox actions

**Notable Weakness For AG Chain**

- context delivery and statefulness policy is comparatively generic
- it does not give AG chain, out of the box, a rich benchmark-author-controlled matrix for:
  - per-step fresh sessions versus long-lived sessions
  - structured replay modes
  - candidate-state sanitization policies
  - benchmark-defined context windows and carry-forward policies
  - explicit fairness envelopes for context richness across evaluated models

## Compatibility Assessment

**Language & Runtime Compatibility:** High for AG chain backend work. `platform-api` is Python, so Inspect can be used directly as a substrate rather than translated.

**Architecture Compatibility:** Medium-high. Inspect is an eval runtime library, not a product shell. It fits the execution plane well but does not replace AG chain's registry, authoring workbench, or host UI.

**Frontend Compatibility:** Low. Inspect's viewer and CLI are references, not replacements for the AG chain shell inside `writing-system`.

**Overall Assessment:** Adoptable with effort

That means:

- direct reuse is appropriate for Python runtime seams
- adaptation is required where AG chain has stricter benchmark semantics
- AG chain should not invent a second provider or sandbox framework if Inspect already supplies one

## Adopt Directly Or Near-Directly

AG chain should treat these as Inspect-first surfaces:

- model provider abstraction via `ModelAPI`
- supported-provider catalog patterns
- OpenAI-compatible provider support
- model roles for separate grader or judge models
- runtime limit vocabulary:
  - `message_limit`
  - `token_limit`
  - `time_limit`
  - `working_limit`
  - `cost_limit`
  - `fail_on_error`
  - `continue_on_fail`
  - `retry_on_error`
- sandbox environment abstraction
- Docker sandbox provisioning patterns
- approval-policy framework for tool calls
- scorer and model-graded scorer composition
- eval log and trace-log patterns
- log-view/server concepts for run inspection

## Keep AG chain-Owned

AG chain still owns these layers and should not hand them over to Inspect defaults:

- benchmark registry and versioning
- benchmark catalog and workbench UI
- Legal-10 build pipeline, RP/EU builders, packaging, and sealing
- payload admission policy
- candidate-visible staging rules
- candidate-state sanitization and carry-forward
- benchmark-specific audit artifacts and message hashing
- citation integrity and benchmark-specific deterministic post-processing
- fairness policy for context, tools, and memory across evaluated models
- product navigation and route design inside the host app

## Critical Divergence: Context Delivery, Statefulness, And Fairness

This is the most important boundary.

Inspect provides a generic execution state model and generic task or solver configuration. AG chain needs a richer benchmark-controlled runtime policy surface.

AG chain must define first-class runtime policy families for:

- `Session topology`
  - single long-lived session across all steps
  - one fresh API call per step
  - grouped API calls across selected steps
- `Replay strategy`
  - no replay
  - minimal replay
  - full replay
  - structured summary replay
  - persistent local context or working memory
- `Carry-forward source`
  - sanitized candidate state only
  - prior outputs
  - derived summaries
  - explicit tool-backed local store
- `Tool exposure`
  - no tools
  - benchmark-approved limited tools
  - bounded read-only tools
  - wider tool access
- `Memory backing`
  - no external memory
  - per-run ephemeral local memory
  - sandbox-resident working set
  - benchmark-defined persistent local context for the run

### Fairness Rule

Within one benchmark version and one run profile, every evaluated model must receive the same context, state, tool, and memory policy bundle.

That means AG chain should not reduce the policy surface in order to force fairness. Instead, it should:

- expose the policy surface explicitly
- freeze the selected policy per benchmark version or run profile
- compare models only within cohorts that share the exact same policy bundle

### Comparative Insight Rule

AG chain must support two different comparison modes and keep them distinct:

- `Model comparison`
  - compare different evaluated models only when they share the same benchmark version and the same runtime-policy bundle
- `Policy comparison`
  - compare the same evaluated model against the same benchmark version across different runtime-policy bundles

This second mode is not a side case. It is one of the product's core reasons to exist. The platform must make it possible to answer questions like:

- how does one model perform with no tools versus bounded read-only tools
- how does one model perform with fresh-step sessions versus long-lived replay
- how does one model perform with minimal replay versus persistent local memory
- how does one model perform with different sandbox or approval envelopes

That means AG chain needs a first-class `runtime_policy_bundle` identity that is stored on every run and carried into results, audit, and comparison surfaces.

### Runtime Ownership Rule

AG chain should therefore use Inspect as the execution substrate, but implement context and state delivery above it through AG chain-owned authored policies that compile down into:

- custom solver behavior
- task configuration
- sample setup and file staging
- tool and sandbox configuration
- model role wiring

## AG chain Object Mapping To Inspect

| AG chain concept | Inspect concept | Ownership |
|------------------|-----------------|-----------|
| Benchmark | AG chain wrapper around a family of Inspect tasks | AG chain |
| Benchmark version / runspec | Versioned authored spec that compiles to Inspect `Task` + solver configuration | AG chain |
| Evaluation Unit | `Sample` | Mixed: AG chain authors, Inspect executes |
| Ordered steps | Composite or custom `Solver` chain | Mixed |
| Judge model | `model_roles["grader"]` or scorer model | Inspect-first |
| Selected eval models | repeated eval runs against the same task or task family | Mixed |
| Runtime policy bundle | AG chain-authored runtime profile compiled into solver, task, sandbox, tool, and limit wiring | AG chain |
| Payload files | `Sample.files` and sample setup | Mixed |
| Sandbox | `sandbox` on task or sample | Inspect-first |
| Tool approval | `ApprovalPolicy` | Inspect-first |
| Runtime limits | `EvalConfig` and task limits | Inspect-first vocabulary, AG chain-owned policy surface |
| Eval logs / traces | `EvalLog` and trace logs | Inspect-first |
| Payload gate / candidate state / message hashing | custom runtime layer | AG chain |
| Package build pipeline | none | AG chain / Legal-10 |

## Immediate Plan Drift Findings

### Verified

- The AG chain `Benchmarks` page should still be a table-first catalog.
- The `#steps` child page is still the correct first implemented benchmark-local page.
- The `Models` page should still be a global registry rather than a benchmark-local picker.
- `platform-api` plus Supabase remains the right host architecture for AG chain product state.

### Contradicted Or Incomplete

- Any plan that implicitly assumes AG chain should invent a bespoke provider layer from scratch is now incomplete. Inspect already provides a stronger provider substrate.
- Any plan that treats Inspect as sufficient for context or statefulness policy is incomplete. That policy surface remains AG chain-owned.
- Any benchmark-local IA beyond `#steps` that pretends the remaining child pages are already logically settled should be treated as provisional.

## Locked Adjustments To Existing AG chain Plans

1. All future AG chain runtime plans must evaluate Inspect-first reuse before creating bespoke provider, sandbox, approval, or log abstractions.
2. All future AG chain benchmark-runtime plans must explicitly separate:
   - Inspect-owned execution primitives
   - AG chain-owned context, state, payload, and fairness policy
3. Benchmark versions and run profiles must be able to freeze a context or tool policy bundle, compare different models only within that bundle, and compare the same model across different bundles as an explicit policy-sensitivity analysis mode.
4. Future run and observability plans must combine host OTel with Inspect eval logs and trace logs rather than choosing one or the other.

## Impact On Current Plans

### Models plan

The current models plan direction is broadly correct only if model targets are treated as AG chain registry rows that resolve into Inspect-compatible provider specs rather than a wholly custom provider layer.

### Benchmarks table + `#steps` plan

The current benchmark plan remains valid as a UI slice. However:

- its architecture must preserve a compile target into Inspect task or solver structures
- `#steps` should be understood as authoring a future Inspect composite solver boundary
- the remaining benchmark-local child pages should stay provisional because the eventual runtime taxonomy should likely expose Inspect-aligned execution concepts plus AG chain-owned context or state policy

### Future benchmark-local IA

The currently shipped drill navigation can remain for now, but the likely longer-term benchmark-local workbench taxonomy should be closer to:

- `Steps`
- `Scoring`
- `Models`
- `Context`
- `State`
- `Tools`
- `Sandbox`
- `Approval`
- `Limits`
- `Validation`
- `Runs`

This is not a frozen IA contract yet. It is a planning direction informed by Inspect's real execution vocabulary plus AG chain's stricter context/state requirements.
