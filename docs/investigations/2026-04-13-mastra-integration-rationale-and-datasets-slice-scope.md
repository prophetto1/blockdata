# Mastra Integration Rationale and Datasets Slice Scope

## Why We Are Doing This At All

The repo's core direction is not to become an agent-framework company.

The direction is:

- **Block Data** = document/data layer that turns documents into structured knowledge and deployable services
- **AGChain** = evaluation layer for full model-plus-tools-plus-workflow systems
- **Agent framework** = orchestration substrate that powers both
- **End state** = a legal AI platform

Evidence:

- `E:\writing-system\_research\20260410--00--repo-structure-and-context\what-we-are.md`
  - AGChain asks what a full model-plus-tools-plus-workflow system can do in practice
  - the agent framework is the orchestration layer under both Block Data and AGChain
  - the legal AI platform is the real product destination
  - the repo explicitly says the goal is **not** to become "a Mastra-based clone of an agent framework company"
  - the reason Mastra is attractive is that it may let us skip rebuilding a large portion of the orchestration, workflow, eval, and MCP plumbing from scratch

So the real reason for this Mastra work is:

> determine how much non-differentiating orchestration and evaluation infrastructure we can adopt, so we can spend the time on the legal-AI-specific layer instead of rebuilding substrate

That is why the evaluation has been so careful.

We are not asking:

- "Can Mastra be the product?"

We are asking:

- "How much of the orchestration/eval substrate can we borrow without giving up our product identity?"

## Why We Needed The Real Local Mastra Product Surface

We paused other work to inspect the **real Mastra product surfaces locally** because docs and code structure alone were not enough.

We needed to see:

- what the actual Studio / playground exposes
- which features are really first-class product surfaces vs backend-only adapters
- what runtime paths exist between UI, server, storage, experiments, scores, and targets
- where the local open-source runtime differs from the hosted/cloud layering

Evidence:

- `E:\writing-system\_research\20260412--09--agent-framework-design-MSTA--JON\0412--mastra-docker-setup-checklist.md`
  - explicitly targets self-hosted Studio on `:4111`
  - includes Postgres, Qdrant, Redis, and "max settings" configuration
- `E:\writing-system\docs\infra\mastra-dev-handoff-2026-04-12.md`
  - the goal was to get the Mastra dev server up on `4111` so the playground UI could actually be inspected
- `E:\writing-system\_research\20260412--09--agent-framework-design-MSTA--JON\0412--mastra-integration-test-results.md`
  - the technical feasibility was already proven against our Supabase Postgres
  - what remained was product-surface inspection, not just storage proof

So the local instance was not a side quest. It was the required step before making substrate decisions.

## What "Datasets" Means In This Investigation

The important clarification is:

When we say **Mastra datasets** for AGChain integration, we do **not** mean:

- cut out the `datasets` storage domain in isolation
- adapt a couple of backend methods into our existing components
- keep our current pages and just swap a persistence layer under them

We mean:

> assess and potentially integrate the full Mastra **datasets product slice** as Mastra actually runs it, including related pages, frontend components, hooks, client methods, API routes, server handlers, core runtime logic, scoring dependencies, experiment machinery, and runtime behaviors

And if adopted, the goal is not just API compatibility. The goal is to replicate the important runtime behaviors and product ergonomics **into our system** on a second track.

## The Datasets Product Slice In Mastra

The Mastra datasets feature is a **product slice**, not a single isolated module.

### 1. Product entry surface

- `I:\mastra\packages\playground\src\pages\evaluation\index.tsx`
  - datasets lives inside the broader **Evaluation** page
  - top-level tabs are `overview`, `scorers`, `datasets`, `experiments`
  - the datasets view is therefore already coupled to experiments and scorers at the product level

### 2. Frontend domain surface

- `I:\mastra\packages\playground-ui\src\domains\datasets\`

The datasets UI domain includes:

- dataset creation / editing / duplication / deletion
- item authoring and item detail flows
- CSV import
- JSON import
- save-as-dataset-item flows
- schema configuration
- dataset versions and item versions
- dataset experiments
- experiment comparison
- experiment trigger UI
- scorer selection
- target selection
- bulk trace review
- generated-item flows

Important directories and files:

- `components/create-dataset-dialog.tsx`
- `components/edit-dataset-dialog.tsx`
- `components/duplicate-dataset-dialog.tsx`
- `components/experiment-trigger/experiment-trigger-dialog.tsx`
- `components/experiment-trigger/scorer-selector.tsx`
- `components/experiment-trigger/target-selector.tsx`
- `components/experiments/`
- `components/items/`
- `components/versions/`
- `components/csv-import/`
- `components/json-import/`
- `hooks/use-datasets.ts`
- `hooks/use-experiments.ts`
- `hooks/use-dataset-experiments.ts`
- `hooks/use-dataset-item-versions.ts`
- `hooks/use-dataset-versions.ts`
- `hooks/use-dataset-mutations.ts`
- `hooks/use-agent-schema.ts`
- `hooks/use-workflow-schema.ts`
- `hooks/use-scorer-schema.ts`

This is the clearest evidence that "datasets" in Mastra is already a broad evaluation UX slice rather than a narrow storage primitive.

### 3. Client SDK surface

- `I:\mastra\client-sdks\client-js\src\client.ts`
- `I:\mastra\client-sdks\client-js\src\types.ts`

The client surface includes:

- dataset CRUD
- item CRUD
- batch insert/delete
- generated items
- dataset version operations
- experiment listing / trigger / result update

The type model shows that a dataset record itself includes:

- `inputSchema`
- `groundTruthSchema`
- `requestContextSchema`
- `targetType`
- `targetIds`
- `scorerIds`
- `version`

Dataset items include:

- `input`
- `groundTruth`
- `expectedTrajectory`
- `requestContext`
- `source`

That means the runtime concept is already bigger than "rows in a dataset table."

### 4. Server/API surface

- `I:\mastra\packages\server\src\server\handlers\datasets.ts`
- `I:\mastra\packages\server\src\server\schemas\datasets.ts`
- `I:\mastra\packages\server\src\server\server-adapter\routes\datasets.ts`

The server slice includes:

- `/datasets`
- `/datasets/:datasetId`
- `/datasets/:datasetId/items`
- `/datasets/:datasetId/items/:itemId`
- `/experiments`
- `/experiments/review-summary`
- `/datasets/:datasetId/experiments`
- `/datasets/:datasetId/experiments/:experimentId`
- `/datasets/:datasetId/experiments/:experimentId/results`
- `/datasets/:datasetId/compare`
- `/datasets/:datasetId/versions`
- `/datasets/:datasetId/generate-items`
- `/datasets/cluster-failures`

This matters because it shows the operational surface we would need to mirror is not just dataset CRUD. It also includes:

- cross-dataset experiment views
- review summary
- experiment comparison
- failure clustering
- generated-item workflows
- version history

### 5. Core runtime surface

- `I:\mastra\packages\core\src\datasets\dataset.ts`
- `I:\mastra\packages\core\src\datasets\manager.ts`
- `I:\mastra\packages\core\src\datasets\validation\`
- `I:\mastra\packages\core\src\datasets\experiment\executor.ts`
- `I:\mastra\packages\core\src\datasets\experiment\scorer.ts`
- `I:\mastra\packages\core\src\datasets\experiment\analytics\`

This is where the real runtime behavior lives:

- dataset version resolution
- dataset item validation
- experiment creation
- target execution
- scorer resolution and execution
- score persistence
- result aggregation / comparison
- failure analysis

So if we say "integrate Mastra datasets," this core runtime is part of scope by definition.

## Runtime Behaviors We Would Need To Replicate

If the integration target is the full Mastra datasets slice, the runtime behaviors to preserve are roughly:

### A. Dataset authoring behavior

- create datasets with schemas
- attach targets and scorers
- edit datasets without losing version semantics
- import CSV / JSON into dataset items
- create datasets from selected items

### B. Item and version behavior

- item CRUD
- batch item operations
- dataset version history
- item history across versions
- compare versions

### C. Experiment behavior

- launch experiments from a dataset against a selected target
- support target types used by the slice (`agent`, `workflow`, `scorer`; processor currently not core)
- use dataset version at run time
- support scorer selection at run time
- background execution returning `pending`
- per-item results persisted to experiment storage

### D. Evaluation / scoring behavior

- resolve scorers from the scorer registry
- run scorers per result
- persist scores to storage
- support review-summary and result updates
- compare experiments
- cluster failures

### E. Product-level UX behavior

- datasets appear inside a broader evaluation surface
- experiments and scorers are adjacent first-class tabs, not disconnected tools
- datasets filters depend on targets, tags, and experiment status
- experiment flows depend on agents/workflows/scorers being available as selectable system entities

## What This Means For Integration Scope

The integration unit is not:

- `datasets` only

The integration unit is:

- **Evaluation page surfaces**
- **datasets frontend domain**
- **experiments frontend domain**
- **scores / scorer selection surfaces**
- **dataset-related client SDK methods**
- **dataset + experiment + score server routes**
- **core dataset runtime**
- **experiment executor + scorer runtime**
- **versioning and storage foundation**

In practice, this means the "datasets track" we add into our system needs to be treated as a **Mastra evaluation slice** more than a narrow dataset module.

## How This Fits The Second-Track Plan

This clarified scope still fits the additive second-track model.

The right second track is:

- keep the existing AGChain benchmark-build pipeline
- add a Mastra-backed evaluation slice that consumes benchmark-ready runtime data
- mirror Mastra's datasets/experiments/scorers runtime behaviors in our product
- compare side-by-side before making it primary

So the correct second-track interpretation is:

- not "swap in a new dataset storage engine"
- but "introduce a Mastra-shaped evaluation runtime slice inside AGChain"

## Bottom Line

The reason for all of this is not feature envy.

It is a substrate decision:

- keep our differentiation in legal AI, document-to-service pipelines, benchmark design, and assembled-agent evaluation philosophy
- adopt as much non-differentiating orchestration/eval infrastructure as is genuinely worth borrowing

And with your clarification, the scope for `datasets` is now locked as:

> the full Mastra datasets product/runtime slice, with related pages, frontend components, backend routes, runtime machinery, and evaluation behaviors traced together for second-track integration
