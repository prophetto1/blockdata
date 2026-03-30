# AGChain Legal-10 + InspectAI Build Direction

## Purpose

This document answers the immediate question behind the current AGChain side-rail mess:

1. What already exists in `_agchain/legal-10` that is real code and not just reference material?
2. Which current AGChain menu surfaces are placeholders versus actually backed by working code?
3. Which InspectAI capabilities should be adopted as the implementation basis, and which areas should stay AGChain-owned and built from existing Legal-10 code?
4. What should be built first so the side rail stops lying and starts reflecting operational functionality?

This is intentionally concrete. It is not a generic architecture memo.

## Short answer

`_agchain/legal-10` is already a real benchmark runtime package. It is not complete enough to power the full AGChain workspace by itself, but it is absolutely substantial enough to replace several of the current placeholder surfaces with real, narrow functionality.

The strongest existing bases are:

- `Runs`
- `Results`
- `Prompts`
- `Scorers`
- `Parameters` (limited)
- benchmark-owned dataset build pipeline semantics

The weakest existing bases are:

- `Datasets` as a browser-facing registry
- `Tools`
- broad `Observability`
- Braintrust-style `Experiments` / comparison workflows

So the immediate move should not be "keep all placeholders until the whole platform exists." The immediate move should be:

1. turn `Runs` into a real run-launch + run-history surface over current Legal-10 runtime artifacts
2. turn `Results` into a real per-run / per-step results surface
3. turn `Prompts`, `Scorers`, and `Parameters` into real benchmark-definition surfaces backed by Legal-10 files
4. turn `Datasets` into a real dataset/build-artifact inventory surface only after its backend contract is honest

## What is physically present today

### 1. Legal-10 runtime and benchmark package code

The current checkout contains these real code areas under [`_agchain/legal-10`](/E:/writing-system/_agchain/legal-10):

- [`_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py`](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py)
- [`_agchain/legal-10/runspecs/3-STEP-RUN/benchmark_builder.py`](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/benchmark_builder.py)
- [`_agchain/legal-10/runspecs/3-STEP-RUN/runtime/execution_backend.py`](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/execution_backend.py)
- [`_agchain/legal-10/runspecs/3-STEP-RUN/runtime/inspect_backend.py`](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/inspect_backend.py)
- [`_agchain/legal-10/runspecs/3-STEP-RUN/runtime/runtime_config.py`](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/runtime_config.py)
- [`_agchain/legal-10/runspecs/3-STEP-RUN/runtime/input_assembler.py`](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/input_assembler.py)
- [`_agchain/legal-10/runspecs/3-STEP-RUN/runtime/payload_gate.py`](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/payload_gate.py)
- [`_agchain/legal-10/runspecs/3-STEP-RUN/runtime/state.py`](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/state.py)
- [`_agchain/legal-10/runspecs/3-STEP-RUN/runtime/audit.py`](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/audit.py)
- [`_agchain/legal-10/runspecs/3-STEP-RUN/runtime/staging.py`](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/staging.py)
- [`_agchain/legal-10/chain/steps`](/E:/writing-system/_agchain/legal-10/chain/steps)
- [`_agchain/legal-10/chain/scoring`](/E:/writing-system/_agchain/legal-10/chain/scoring)

What this means in plain terms:

- Legal-10 already knows how to define steps.
- Legal-10 already knows which payloads are admitted to which step.
- Legal-10 already knows how to assemble model messages deterministically.
- Legal-10 already knows how to carry forward sanitized state between steps.
- Legal-10 already knows how to run with either direct model adapters or an Inspect-backed model backend.
- Legal-10 already knows how to emit audit and run artifacts.
- Legal-10 already has benchmark packet materialization code and scorer code.

### 2. Legal-10 data/build pipeline code

These scripts are real and materially useful:

- [`_agchain/legal-10/scripts/rp_builder.py`](/E:/writing-system/_agchain/legal-10/scripts/rp_builder.py)
- [`_agchain/legal-10/scripts/eu_builder.py`](/E:/writing-system/_agchain/legal-10/scripts/eu_builder.py)
- [`_agchain/legal-10/scripts/inventory_datasets.py`](/E:/writing-system/_agchain/legal-10/scripts/inventory_datasets.py)
- [`_agchain/legal-10/scripts/materialize_export_bundle.py`](/E:/writing-system/_agchain/legal-10/scripts/materialize_export_bundle.py)
- [`_agchain/legal-10/scripts/langfuse_dataset_from_export.py`](/E:/writing-system/_agchain/legal-10/scripts/langfuse_dataset_from_export.py)
- [`_agchain/legal-10/scripts/bundle_categorize_and_dedupe.py`](/E:/writing-system/_agchain/legal-10/scripts/bundle_categorize_and_dedupe.py)

What these already give AGChain:

- a dataset/export inventory pattern
- RP and EU build semantics
- ground-truth derivation semantics
- bundle materialization semantics
- export-to-dataset import semantics
- conservative dedupe and categorized bundle logic

This is strong build-pipeline code. It is not yet a user-facing dataset registry product.

### 3. Legal-10 profile and runtime-shape code already exists outside the benchmark package

Under [`_agchain/profiles`](/E:/writing-system/_agchain/profiles) there is already a useful AGChain-owned abstraction layer:

- [`_agchain/profiles/types.py`](/E:/writing-system/_agchain/profiles/types.py)
- [`_agchain/profiles/registry.py`](/E:/writing-system/_agchain/profiles/registry.py)
- [`_agchain/profiles/baseline.py`](/E:/writing-system/_agchain/profiles/baseline.py)
- [`_agchain/profiles/strategies/session.py`](/E:/writing-system/_agchain/profiles/strategies/session.py)
- [`_agchain/profiles/strategies/state_provider.py`](/E:/writing-system/_agchain/profiles/strategies/state_provider.py)

This is important because it means AGChain already started formalizing:

- session strategy
- state provider
- tool strategy
- runtime constraints
- cache / compaction policy

It is not fully built out, but it is the correct place to anchor the `Parameters` surface.

### 4. Real run artifacts already exist

There is a concrete run under [`_agchain/legal-10/runs/run_20260208_080028_154291`](/E:/writing-system/_agchain/legal-10/runs/run_20260208_080028_154291):

- [`run_manifest.json`](/E:/writing-system/_agchain/legal-10/runs/run_20260208_080028_154291/run_manifest.json)
- [`summary.json`](/E:/writing-system/_agchain/legal-10/runs/run_20260208_080028_154291/summary.json)
- [`candidate_state.json`](/E:/writing-system/_agchain/legal-10/runs/run_20260208_080028_154291/candidate_state.json)
- [`audit_log.jsonl`](/E:/writing-system/_agchain/legal-10/runs/run_20260208_080028_154291/audit_log.jsonl)
- [`run.jsonl`](/E:/writing-system/_agchain/legal-10/runs/run_20260208_080028_154291/run.jsonl)

This means `Runs`, `Results`, and a first-pass trace/observability drilldown do not need to start from zero.

### 5. The Legal-10 tests are green

Current verification:

- `cd _agchain/legal-10 && pytest -q`
- result: `45 passed in 0.99s`

That matters. The existing runtime is not just aspirational code.

## What is placeholder today in the AGChain web shell

The current side rail is defined in [`web/src/components/agchain/AgchainLeftNav.tsx`](/E:/writing-system/web/src/components/agchain/AgchainLeftNav.tsx).

Its top-level items are:

- Overview
- Datasets
- Prompts
- Scorers
- Parameters
- Tools
- Observability
- Settings

The placeholder pattern is real and explicit in:

- [`web/src/pages/agchain/AgchainSectionPage.tsx`](/E:/writing-system/web/src/pages/agchain/AgchainSectionPage.tsx)
- [`web/src/pages/agchain/AgchainDatasetsPage.tsx`](/E:/writing-system/web/src/pages/agchain/AgchainDatasetsPage.tsx)
- [`web/src/pages/agchain/AgchainRunsPage.tsx`](/E:/writing-system/web/src/pages/agchain/AgchainRunsPage.tsx)

The tests also lock these pages as placeholders:

- [`web/src/pages/agchain/AgchainLevelOnePlaceholderPages.test.tsx`](/E:/writing-system/web/src/pages/agchain/AgchainLevelOnePlaceholderPages.test.tsx)
- [`web/src/pages/agchain/AgchainProjectScopedPlaceholderPages.test.tsx`](/E:/writing-system/web/src/pages/agchain/AgchainProjectScopedPlaceholderPages.test.tsx)

The pages that are currently real enough to work with are:

- `Benchmarks`
- `Models`

Those have actual frontend hooks and actual platform API support:

- [`web/src/hooks/agchain/useAgchainBenchmarks.ts`](/E:/writing-system/web/src/hooks/agchain/useAgchainBenchmarks.ts)
- [`web/src/hooks/agchain/useAgchainModels.ts`](/E:/writing-system/web/src/hooks/agchain/useAgchainModels.ts)
- [`services/platform-api/app/api/routes/agchain_benchmarks.py`](/E:/writing-system/services/platform-api/app/api/routes/agchain_benchmarks.py)
- [`services/platform-api/app/api/routes/agchain_models.py`](/E:/writing-system/services/platform-api/app/api/routes/agchain_models.py)

So the current product truth is:

- `Benchmarks` and `Models` are real surfaces.
- `Datasets`, `Prompts`, `Scorers`, `Parameters`, `Tools`, `Runs`, `Results`, and `Observability` are mostly shell claims.

## Important mismatch: docs-site is richer than the checked-in Legal-10 folder

The docs site contains a meaningful Legal-10 doc tree under:

- [`_agchain/docs-site/src/content/docs/benchmarks/legal-10`](/E:/writing-system/_agchain/docs-site/src/content/docs/benchmarks/legal-10)

It documents:

- evaluation steps
- scoring
- packages
- data model
- pipeline builders
- platform isolation / state-message behavior

But there is a hard mismatch:

- the docs reference `legal-10/docs/...`
- the docs reference `legal-10/datasets/...`
- the checked-in [`_agchain/legal-10`](/E:/writing-system/_agchain/legal-10) directory currently has no `docs/` directory
- the checked-in [`_agchain/legal-10`](/E:/writing-system/_agchain/legal-10) directory currently has no `datasets/` directory

That means the docs site is partly documenting intended or externalized assets, not only what is present in this checkout.

This matters for the UI buildout: some surfaces can be backed immediately by local code, but dataset/file-heavy surfaces cannot pretend the checked-in package is self-contained when it currently is not.

## InspectAI: what is actually useful here

From the reference material under:

- [`_agchain/_reference/inspect_ai`](/E:/writing-system/_agchain/_reference/inspect_ai)
- [`_agchain/_reference/inspect_evals`](/E:/writing-system/_agchain/_reference/inspect_evals)
- [`_agchain/_reference/inspect_cyber`](/E:/writing-system/_agchain/_reference/inspect_cyber)
- [`_agchain/_reference/inspect_ec2_sandbox`](/E:/writing-system/_agchain/_reference/inspect_ec2_sandbox)
- [`_agchain/_reference/inspect_k8s_sandbox`](/E:/writing-system/_agchain/_reference/inspect_k8s_sandbox)

the useful takeaways are straightforward.

### Adopt from InspectAI

These should be borrowed directly or near-directly:

- task decomposition patterns
- dataset/sample model
- scorer protocol and metric aggregation
- model role/config abstraction
- eval log / trace persistence shape
- sandbox environment contract and registry pattern
- sample-level setup / cleanup lifecycle
- resource-limit concepts: message/token/time/cost limits

### Do not copy from InspectAI as the product surface

Do not treat Inspect's UI as the AGChain product target.

The March 28 direction doc is correct:

- borrow Braintrust-like frontend exposure
- borrow Inspect runtime patterns

### Use Inspect Evals as authoring examples, not as the platform product

`inspect_evals` is useful because it shows how real eval suites are packaged:

- per-eval folder structure
- task files
- dataset assets
- scorer modules
- `eval.yaml`
- README + runnable layout

That is directly useful for AGChain benchmark authoring and package conventions.

### Use inspect_cyber / EC2 / K8s sandbox repos selectively

These repos are useful for:

- complex sandbox provider shape
- infra conventions
- scaling / isolation patterns

They are not the first thing to wire into the current showcase build. They matter after the basic run/dataset/result surfaces stop being placeholders.

## Menu-by-menu assessment

### Datasets

#### What already exists

- Legal-10 build scripts expect dataset inputs and can inventory/build them.
- `inventory_datasets.py` is already a good basis for a file-backed dataset inventory.
- `rp_builder.py` and `eu_builder.py` already encode the benchmark-owned semantics of turning datasets into RPs and EUs.
- the March 28 direction and sandbox/dataset plan already point toward an Inspect-shaped dataset registry.

#### What is missing

- no checked-in `legal-10/datasets` directory in this checkout
- no dataset CRUD API route in `services/platform-api`
- no dataset version tables surfaced in current AGChain code shown here
- no real web dataset page beyond placeholder copy

#### Verdict

Not complete enough for the full intended `Datasets` product surface.

It is complete enough for a first build if the scope is honest:

- dataset inventory
- dataset versions/build artifacts
- RP/EU outputs
- import/export metadata

It is not complete enough for:

- polished registry-managed sample browsing
- editing
- promotion workflows
- broad cross-benchmark dataset management

#### Recommendation

Build `Datasets` as a read-first artifact registry backed by real Legal-10 inventory/build metadata, not as a fake CRUD shell.

### Prompts

#### What already exists

- benchmark packet prompt templates
- judge prompts
- input assembly rules
- system message rules
- placeholder resolution logic

Files:

- [`_agchain/legal-10/runspecs/3-STEP-RUN/benchmark/model_steps`](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/benchmark/model_steps)
- [`_agchain/legal-10/runspecs/3-STEP-RUN/benchmark/judge_prompts`](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/benchmark/judge_prompts)
- [`_agchain/legal-10/runspecs/3-STEP-RUN/runtime/input_assembler.py`](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/input_assembler.py)

#### Verdict

Yes. This is strong enough to build a real `Prompts` surface now for Legal-10.

#### Recommendation

The first `Prompts` surface should show:

- step prompt template
- resolved placeholders
- admitted payloads
- judge prompt refs
- system message / output guard

Do not wait for a generic cross-benchmark prompt CMS.

### Scorers

#### What already exists

- deterministic scorer refs in benchmark plan
- scorer modules in runspec and chain
- citation integrity scoring
- judge score normalization inside runner

Files:

- [`_agchain/legal-10/runspecs/3-STEP-RUN/scorers`](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/scorers)
- [`_agchain/legal-10/chain/scoring`](/E:/writing-system/_agchain/legal-10/chain/scoring)

#### Verdict

Yes. Strong enough to build a real `Scorers` surface now.

#### Recommendation

Build `Scorers` as:

- scorer registry for the selected benchmark
- deterministic vs judge scoring mode display
- step-to-scorer mapping
- sample/run outputs where scorer artifacts already exist

### Parameters

#### What already exists

- `RuntimeConfig`
- runtime limits
- profile types
- session/state/tool strategy IDs

Files:

- [`_agchain/legal-10/runspecs/3-STEP-RUN/runtime/runtime_config.py`](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime/runtime_config.py)
- [`_agchain/profiles/types.py`](/E:/writing-system/_agchain/profiles/types.py)
- [`_agchain/profiles/baseline.py`](/E:/writing-system/_agchain/profiles/baseline.py)

#### Current limitation

Most future-facing values are defined but explicitly rejected in the current phase:

- tool mode other than `none`
- approval mode other than `none`
- sandbox mode other than `none`
- remote MCP
- network access

#### Verdict

Partial, but usable.

#### Recommendation

Build `Parameters` as a real read/write surface for the baseline constraints that actually exist now, plus disabled/display-only rows for future fields. Do not pretend tool/sandbox policy is live yet.

### Tools

#### What already exists

- only type/strategy placeholders and future enums
- no real benchmark-level tool registry wired through Legal-10 baseline

#### Verdict

Not enough for a real `Tools` product surface.

#### Recommendation

Either:

- remove it from primary nav for now, or
- keep it but mark it as benchmark capability policy with a single truthful state: `No tools enabled for current Legal-10 baseline`

Do not keep the current generic placeholder prose.

### Runs

#### What already exists

- real runner
- real run manifests
- real per-step execution flow
- real audit logging
- direct backend and Inspect backend
- runtime config and profile resolution

Files:

- [`_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py`](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py)
- [`_agchain/legal-10/runspecs/3-STEP-RUN/runtime`](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime)
- [`_agchain/legal-10/runs`](/E:/writing-system/_agchain/legal-10/runs)

#### Verdict

Yes. This is strong enough to build a real `Runs` surface now.

#### Recommendation

Build the first `Runs` surface around real existing objects:

- benchmark selection
- EU selection
- evaluated model
- judge model
- backend (`direct` or `inspect`)
- baseline runtime profile
- submitted/completed run history

This can be file-backed first if necessary, then migrated behind platform API.

### Results

#### What already exists

- `summary.json`
- `candidate_state.json`
- per-step outputs in run artifacts
- deterministic and judge scores

#### Verdict

Yes, for a first useful surface.

#### Recommendation

Build `Results` as:

- run summary
- per-step output viewer
- judge comparison for `d2` vs `j3`
- citation integrity display

Do not block this on a future experiments spine.

### Observability

#### What already exists

- audit log
- run log
- timing / usage fields
- staging model
- run manifest

#### What is missing

- unified trace model
- platform-level telemetry-backed drilldown
- cross-run observability aggregation

#### Verdict

Partial.

#### Recommendation

Build `Observability` as a run-trace drilldown over existing artifacts first:

- step sequence
- admitted payloads
- staged files
- message hashes
- response hashes
- model metadata / timing / token usage where present

That is already materially better than a placeholder.

## Where InspectAI should plug in next

### Use InspectAI immediately for these backend seams

1. backend execution abstraction
2. richer model config surface
3. dataset/sample typing conventions
4. scorer/metric conventions
5. sandbox registry contract
6. eval log normalization

### Do not replace AGChain ownership in these areas

AGChain should continue to own:

1. benchmark-native semantics
2. payload admission rules
3. candidate state rules
4. benchmark packet shape
5. Legal-10 scoring semantics
6. browser-facing product object model

The right split is:

- InspectAI for execution substrate patterns
- AGChain Legal-10 for benchmark semantics
- AGChain web/platform for product surfaces

## Concrete build order

This is the order that best converts placeholder menu items into demonstrable functionality fastest.

### Phase 1: stop the lying

Replace the placeholder pages in this order:

1. `Runs`
2. `Results`
3. `Prompts`
4. `Scorers`
5. `Parameters`

Why:

- the code basis already exists
- the artifacts already exist
- this gives the fastest visible improvement
- this aligns with the real current Legal-10 package

### Phase 2: honest dataset surface

Build `Datasets` next, but scope it to what exists:

- artifact inventory
- export bundles
- RP directories
- EU directories
- build provenance

Do not market this as a complete dataset management system yet.

### Phase 3: observability drilldown

Build `Observability` as a run artifact / trace browser over:

- run manifest
- audit log
- run log
- per-step usage / timing
- state transitions

### Phase 4: tools and sandboxes

Only after the above:

- expose sandbox mode
- expose tool mode
- expose approval policy
- expose remote MCP / network policy

These are exactly where InspectAI sandbox patterns and the EC2/K8s references become implementation inputs.

## Immediate surface mapping

This is the practical answer to "can the current code back the menu?"

| Menu surface | Backing code exists now? | Good enough to build now? | What should back it |
|---|---:|---:|---|
| Datasets | Yes, partial | Yes, if inventory/build-artifact scoped | Legal-10 scripts first, Inspect-shaped registry later |
| Prompts | Yes | Yes | Legal-10 benchmark packet + input assembler |
| Scorers | Yes | Yes | Legal-10 scorer modules + score outputs |
| Parameters | Yes, partial | Yes, limited | RuntimeConfig + profiles |
| Tools | Barely | No, not as a full surface | Future Inspect-compatible tool policy |
| Runs | Yes | Yes | `run_3s.py` + run artifacts + profile config |
| Results | Yes | Yes | `summary.json` + candidate state + scorer outputs |
| Observability | Yes, partial | Yes, as run drilldown | audit/run logs first, OTel later |

## What should happen next

The next implementation plan should not be "finish all AGChain placeholders."

It should be:

1. `Runs` real surface plan
2. `Results` real surface plan
3. `Prompts + Scorers + Parameters` real surface plan
4. `Datasets` inventory/build-artifact surface plan

That is the fastest way to turn the current AGChain side rail from a misleading shell into a benchmark authoring and execution product that is visibly grounded in actual Legal-10 and Inspect-compatible runtime behavior.
