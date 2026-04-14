# Mastra Datasets Dual-Track Adoption Decision

## Decision

We will **not** swap out the current AGChain datasets system in one cut.

We will adopt Mastra datasets as a **second-track runtime evaluation dataset system** first, run it alongside the current AGChain path, and only gradually promote it toward primary status after it proves operationally equivalent or better.

This means:

- no deletion of the current AGChain datasets/build pipeline
- no forced immediate migration of existing benchmark assets
- no framing of Mastra datasets as the replacement for the entire AGChain datasets feature

Instead, the integration model is:

- **Track A**: existing AGChain benchmark-build and runtime flow
- **Track B**: Mastra-backed runtime dataset / experiment / score flow

Track B starts additive. Only later, after evidence, does it become the default path. Track A remains available as the fallback until we intentionally retire parts of it.

## Scope of the Dual Track

### Track A stays responsible for:

- Legal-10 corpus ingestion
- DuckDB benchmark schema and derived views
- label and ground-truth generation
- research pack creation
- evaluation unit sealing
- benchmark bundle packaging

### Track B adds:

- Mastra `datasets`
- Mastra `experiments`
- Mastra `scores`
- scorer registry / `scorer-definitions`
- target execution against agent/workflow surfaces
- versioned runtime dataset management

## Options Considered

### Option A: Direct swap

| Dimension | Assessment |
|-----------|------------|
| Complexity | High |
| Cost | Lower short-term code duplication, higher migration risk |
| Scalability | Good if successful, fragile during cutover |
| Team familiarity | Low |

**Pros:**

- single system sooner
- less temporary architectural duplication
- faster conceptual simplification

**Cons:**

- high migration risk
- blurs the boundary between AGChain benchmark build logic and Mastra runtime eval logic
- makes rollback harder
- forces decisions before we have enough operational evidence

### Option B: Dual-track additive adoption

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium-High |
| Cost | Higher temporary integration cost |
| Scalability | Better migration safety, cleaner promotion path |
| Team familiarity | Better learning curve |

**Pros:**

- preserves current working system
- lets us compare old and new behavior on the same benchmark assets
- creates a reversible migration path
- allows Mastra to prove itself at the runtime-eval boundary before deeper adoption

**Cons:**

- temporary duplication
- requires explicit routing and provider boundaries
- some operational complexity while both tracks coexist

## Trade-off Analysis

Option B is the better choice.

The core reason is boundary mismatch: AGChain's current "datasets" feature includes benchmark construction, while Mastra datasets is a runtime evaluation domain. A direct swap would incorrectly compress those two layers into one decision and force us to retire AGChain-owned pipeline logic before we have evidence that Mastra should own any of it.

Dual-track adoption keeps the hard-earned benchmark pipeline intact while letting us evaluate Mastra where it is strongest:

- runtime dataset versioning
- experiment execution
- score persistence
- evaluation workflow management

This also gives us a controlled proof path:

1. feed the same benchmark-ready assets into both systems
2. compare run behavior, score persistence, ergonomics, and operational fit
3. promote Mastra only where it clearly improves the platform

## Consequences

- We need a clear seam between **benchmark-build assets** and **runtime evaluation datasets**.
- We should introduce a provider-style boundary rather than wiring Mastra directly through AGChain internals.
- Migration success must be measured by parallel-run evidence, not by how quickly we can rewire code.
- Some duplication is intentional and acceptable during the transition.
- The old system should become read-mostly before it becomes removable.

## Recommended Integration Shape

### 1. Treat Mastra as a new runtime provider, not the new benchmark source of truth

The benchmark-build pipeline remains AGChain-native.

Mastra becomes a runtime execution backend that consumes benchmark-ready artifacts or transformed evaluation-ready rows.

### 2. Add an explicit dataset backend seam in our platform

At the product/service layer, support two backends:

- `agchain-native`
- `mastra`

This avoids scattering Mastra-specific assumptions across the repo.

### 3. First bridge should be ingestion, not full authoring

The safest first move is:

- keep building EUs/bundles with the current AGChain system
- translate those benchmark-ready outputs into Mastra dataset records/items
- run Mastra experiments against the translated runtime dataset

That gives us comparable evaluation runs without rewriting the benchmark pipeline.

### 4. Use parallel-run mode before defaulting

For selected benchmark slices:

- run Track A and Track B side-by-side
- compare execution fidelity
- compare score persistence and result inspection
- compare target/scorer compatibility

### 5. Promote by capability, not by slogan

Possible promotion order:

1. Mastra runtime dataset storage
2. Mastra experiment tracking
3. Mastra score persistence
4. Mastra scorer registry
5. optional broader target/runtime adoption

The benchmark-build pipeline should only move if there is a separate argument for doing so.

## Initial Action Items

1. Define the exact AGChain-to-Mastra boundary as: `benchmark-build output -> runtime eval dataset ingest`.
2. Produce a package-level adoption map for the Mastra bundle:
   - `datasets`
   - `experiments`
   - `scores`
   - `scorer-definitions`
   - target execution dependencies
   - storage adapters
3. Identify the first benchmark artifact shape to ingest into Mastra datasets.
4. Design a provider seam in our platform so Track A and Track B can coexist cleanly.
5. Define comparison criteria for parallel-run evaluation before any default switch.

## Bottom Line

Mastra datasets should enter the repo as an **additive second track**.

That is the right adoption mode because it:

- preserves the current AGChain benchmark pipeline
- lets Mastra prove itself in the runtime-evaluation layer
- gives us a reversible migration path
- avoids deleting working system pieces before we have evidence
