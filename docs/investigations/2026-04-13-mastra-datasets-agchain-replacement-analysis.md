# Mastra Datasets as the AGChain Datasets Feature

## Question

If Mastra `datasets` were adopted as the AGChain `datasets` feature, what else would need to come with it for the feature to be operational inside our platform?

## Executive Answer

Mastra `datasets` cannot honestly replace the **entire** AGChain datasets feature as currently described in our docs.

It can replace the **runtime evaluation dataset layer**:

- versioned dataset records
- dataset item CRUD
- schema validation
- experiment launch against a target
- per-item result capture
- score persistence

It does **not** replace the **build-time benchmark corpus pipeline** we already describe for AGChain:

- raw legal corpora and normalized DuckDB schema
- derived label generation
- research pack creation
- evaluation unit sealing
- benchmark bundle packaging
- benchmark-specific ground truth artifacts

So the right framing is:

- **Mastra datasets can replace AGChain's runtime evaluation-dataset subsystem**
- **Mastra datasets cannot replace AGChain's benchmark-build pipeline by themselves**

## What AGChain "Datasets" Means in Our Repo Today

Our AGChain docs currently use "datasets" to mean a **build-time benchmark construction system**, not only a runtime dataset registry.

Evidence:

- `web-docs/src/content/docs/agchain/benchmark/datasets/build-pipeline-and-datasets.md`
  - "How raw datasets become sealed benchmark bundles. This is build-time only — none of this runs at runtime."
  - raw dataset inventory lives in `_agchain/datasets/`
  - pipeline stages include DuckDB views, label generation, Research Pack builder, EU builder, and Benchmark Builder
  - sealed units include `ground_truth.json`, `benchmark.json`, `plan.json`, and model-step artifacts
- `web-docs/src/content/docs/agchain/benchmark/datasets/datasets-implications.md`
  - Legal-10 datasets are described as the core benchmark corpus and ground-truth pipeline
  - Fowler scores, Shepard's treatment edges, ideology joins, and citation-depth labels are all part of the benchmark data model
- `web-docs/src/content/docs/agchain/benchmark/datasets/sc-dataset-db-schema.md`
  - documents a DuckDB-first integrated benchmark database with 13 base tables, 7 analytical views, and multiple external legal sources

That means our current AGChain datasets feature boundary includes:

1. Corpus ingestion and normalization
2. Derived-label / ground-truth computation
3. Benchmark packaging and sealing
4. Runtime consumption of finished evaluation units

Mastra `datasets` only overlaps meaningfully with item 4, plus a small part of dataset authoring/versioning.

## What Mastra `datasets` Actually Is

Mastra `datasets` is a runtime evaluation domain centered on **versioned dataset records and experiment execution**.

Evidence:

- `I:\mastra\client-sdks\client-js\src\types.ts`
  - `DatasetRecord` includes `inputSchema`, `groundTruthSchema`, `requestContextSchema`, `targetType`, `targetIds`, `scorerIds`, and `version`
  - `DatasetItem` includes `input`, `groundTruth`, `expectedTrajectory`, `requestContext`, and `source`
  - `TriggerDatasetExperimentParams` requires `datasetId`, `targetType`, `targetId`, optional `scorerIds`, `agentVersion`, and `maxConcurrency`
- `I:\mastra\packages\core\src\datasets\dataset.ts`
  - `Dataset.startExperimentAsync()` resolves both the `datasets` store and the `experiments` store
  - validates there are items at the chosen dataset version
  - creates an experiment record before background execution
- `I:\mastra\packages\core\src\datasets\experiment\executor.ts`
  - dataset experiments run against `agent`, `workflow`, or `scorer` targets
  - workflow execution explicitly disables built-in scorers to avoid double-scoring
- `I:\mastra\packages\core\src\datasets\experiment\scorer.ts`
  - experiment execution resolves scorers from Mastra's scorer registry
  - persists scores through storage when available
- `I:\mastra\packages\server\src\server\handlers\datasets.ts`
  - datasets are feature-gated
  - dataset routes and experiment/review routes are exposed together
  - some experiment routes resolve the `experiments` storage domain directly

This is a strong fit for a **versioned evaluation dataset + experiment runner**. It is not a benchmark bundle builder.

## Hard Boundary Mismatch

If we say "Mastra datasets will become AGChain datasets" without narrowing scope, we would be collapsing two different product boundaries:

- **AGChain datasets in our docs** = benchmark corpus + build pipeline + sealed evaluation artifacts
- **Mastra datasets in source** = runtime dataset records + experiments + scoring attachment

That mismatch matters because Mastra does not appear to provide first-class replacements for:

- DuckDB-first benchmark corpus modeling
- legal-source ingestion and view creation
- research-pack construction
- evaluation-unit sealing
- benchmark bundle manifests and packaged run assets

Those remain AGChain-specific assets and should stay ours unless we deliberately redesign AGChain around a very different evaluation model.

## Minimum Mastra Feature Set Required

If the goal is narrower and more realistic:

> Replace the AGChain runtime dataset/eval management layer with Mastra's dataset system

then `datasets` cannot be adopted alone. The minimum operational bundle is:

### 1. `datasets`

Required for:

- dataset records
- item CRUD
- schema validation
- dataset versioning
- request-context and expected-trajectory support

### 2. `experiments`

Required because Mastra dataset execution is not self-contained inside the dataset store.

Evidence:

- `Dataset.startExperimentAsync()` resolves `getStore('experiments')`
- server review/list/update routes also directly use the `experiments` domain

Without `experiments`, datasets can exist, but AGChain-style evaluation runs do not.

### 3. `scores`

Required if we want operational evaluation output, not just raw experiment rows.

Evidence:

- `runScorersForItem()` persists scores through storage when available
- our own research maps `scores` directly to AGChain eval output

Without `scores`, experiment execution loses an important part of AGChain's evaluative surface.

### 4. `scorer-definitions` and scorer registry access

Required if AGChain users need managed, reusable scorer configurations rather than hardcoded evaluator logic.

Evidence:

- Mastra experiments resolve scorers from the scorer registry
- our own mapping calls `scorer-definitions` the AGChain scorer registry

If we only use code-defined scorers, this can be a phase-2 add-on. If AGChain needs user-manageable scorers, it belongs in the first bundle.

### 5. Target execution layer

Required because dataset experiments always run **against something**:

- `agent`
- `workflow`
- `scorer`

Evidence:

- `executor.ts` switches on `targetType`
- unsupported target types do not run

For AGChain specifically, the minimum useful target layer is probably:

- `agents`
- `workflows`

And if AGChain remains focused on evaluating assembled systems, we likely also need:

- `skills`
- `mcp-clients`
- `mcp-servers`
- `workspaces`

Those are not required for Mastra datasets in the abstract, but they are likely required for **our AGChain use case**.

### 6. `base` + `shared` + `versioned`

Required as foundation contracts.

Our own Mastra mapping already calls these out as first-port foundation pieces. This is especially important because:

- datasets are versioned
- scorer-definitions are versioned
- other nearby domains reuse the same foundation patterns

Trying to adopt `datasets` without the shared/versioned substrate would mean re-implementing the hard part by hand.

### 7. A real storage adapter set

Required because datasets, experiments, and scores are storage-backed domains.

Our research already points to:

- `pg` as the primary serious adapter
- `libsql` as optional dev/test support

Without a real storage adapter, the feature is not operational in the platform sense.

## Strongly Recommended, But Not Strictly First-Bundle

### `observability`

Recommended because dataset experiment execution carries trace context and AGChain will likely need result debugging, auditability, and failure analysis.

Mastra's experiment path already passes trace IDs through execution/scoring surfaces, but traces are not the hard blocker the way `experiments` and `scores` are.

### Studio / evaluation UI

Recommended for internal use, but not a hard dependency if we are willing to build our own product UI against the API/storage layer.

Mastra's own UI shows datasets as part of a broader Evaluation surface, not as a fully isolated product module.

## What Must Stay Ours

Even if Mastra datasets becomes the AGChain runtime dataset/eval layer, these parts should remain AGChain-owned:

1. Legal-10 corpus ingestion and normalization
2. DuckDB benchmark schema and analytical views
3. Ground-truth derivation logic
4. Research Pack and EU builders
5. Benchmark bundle sealing and manifests
6. AGChain's assembled-agent evaluation philosophy
7. Any domain-specific legal scoring logic that is part of AGChain's identity, not generic evaluator plumbing

This matches our research direction: Mastra provides the substrate; AGChain keeps the differentiating evaluation model.

## Recommended Decision

Do **not** position Mastra `datasets` as a replacement for the entire AGChain datasets feature.

Position it as a replacement for this narrower slice:

> AGChain's runtime evaluation dataset registry, versioning, experiment-launch, and score-persistence subsystem

If we adopt it at that boundary, the adoption set should be:

1. `base` + `shared` + `versioned`
2. `datasets`
3. `experiments`
4. `scores`
5. scorer registry / `scorer-definitions`
6. target execution layer (`agents`, `workflows`, and likely AGChain's assembled-system domains)
7. a real storage adapter (`pg` first)

And we should explicitly keep the benchmark-build pipeline as AGChain-native.

## Bottom Line

Mastra `datasets` is a good candidate for the **runtime evaluation dataset substrate**.

It is **not** a drop-in replacement for the full AGChain datasets feature as currently documented.

If we adopt it, the correct bundle is not just `datasets`; it is:

`datasets + experiments + scores + scorer-definitions + target execution + versioned storage foundation`

while AGChain keeps:

`corpus pipeline + benchmark packaging + domain-specific evaluation design`
