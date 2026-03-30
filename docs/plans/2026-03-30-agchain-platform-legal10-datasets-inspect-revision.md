# AGChain Platform Revision: Legal-10, Datasets, and InspectAI

## Status

This document supersedes the practical implementation direction in:

- [2026-03-30-agchain-legal10-inspectai-build-direction.md](/E:/writing-system/docs/plans/2026-03-30-agchain-legal10-inspectai-build-direction.md)

The earlier document was directionally useful on existing Legal-10 runtime code and placeholder surfaces, but it was not strong enough on the actual AGChain platform contract defined in `docs/agchain/_essentials`.

## Verdict on the prior plan

The prior plan should **not** be used as the final implementation basis without revision.

It had three material problems:

1. it over-centered the current broken AGChain side rail instead of the AGChain platform requirements in [`docs/agchain/_essentials/2026-03-26-agchain-platform-requirements.md`](/E:/writing-system/docs/agchain/_essentials/2026-03-26-agchain-platform-requirements.md)
2. it treated the absence of `legal-10/datasets` inside [`_agchain/legal-10`](/E:/writing-system/_agchain/legal-10) as the main dataset fact, when the actual checked-in dataset/build layer lives under [`_agchain/datasets`](/E:/writing-system/_agchain/datasets)
3. it did not make the governing distinction explicit enough:
   - `AGChain` is the generic benchmark authoring/execution platform
   - `Legal-10` is the first benchmark package loaded into that platform
   - `_agchain/datasets` is the current benchmark data/build layer that Legal-10 operationalizes

## Governing contract

The correct system model, repeated plainly, is:

- `writing-system` is the host application
- `AGChain` is the benchmark authoring, build, execution, and inspection platform
- `Legal-10` is one benchmark package inside AGChain
- `_agchain/datasets` contains the current dataset/build assets that feed Legal-10
- InspectAI is a first-class reference and substrate candidate, not the AGChain product itself

This is consistent with:

- [`docs/agchain/_essentials/2026-03-26-agchain-platform-understanding.md`](/E:/writing-system/docs/agchain/_essentials/2026-03-26-agchain-platform-understanding.md)
- [`docs/agchain/_essentials/2026-03-26-agchain-platform-requirements.md`](/E:/writing-system/docs/agchain/_essentials/2026-03-26-agchain-platform-requirements.md)
- [`_agchain/_reference/owner-message.md`](/E:/writing-system/_agchain/_reference/owner-message.md)

## What AGChain is required to own

From the essentials docs, AGChain is not a Legal-10 viewer. It must own platform responsibilities such as:

- benchmark registration
- benchmark package loading
- builder surfaces
- validation surfaces
- run submission and orchestration
- results inspection
- artifact inspection
- observability
- model registration
- runtime policy exposure

The key product implication is this:

the current primary rail should not be designed around whatever placeholder pages happen to exist today.

The required primary AGChain rail is much closer to:

- Home
- Benchmarks
- Build
- Runs
- Results
- Models
- Artifacts
- Observability
- Settings

That comes directly from the requirements docs, and it is a better fit for a generic authoring/execution platform than the current placeholder-heavy rail.

## What Legal-10 contributes to AGChain

Legal-10 should be treated as a package contract, not as the platform.

Legal-10 contributes:

- benchmark definition
- step order and semantics
- prompt templates
- output contracts
- payload structure
- scorer semantics
- benchmark-specific ground truth rules
- benchmark-specific artifact expectations
- builder logic for its own package assets

Files that make this concrete:

- [`_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py`](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/run_3s.py)
- [`_agchain/legal-10/runspecs/3-STEP-RUN/benchmark_builder.py`](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/benchmark_builder.py)
- [`_agchain/legal-10/runspecs/3-STEP-RUN/runtime`](/E:/writing-system/_agchain/legal-10/runspecs/3-STEP-RUN/runtime)
- [`_agchain/legal-10/chain/scoring`](/E:/writing-system/_agchain/legal-10/chain/scoring)
- [`_agchain/legal-10/scripts/rp_builder.py`](/E:/writing-system/_agchain/legal-10/scripts/rp_builder.py)
- [`_agchain/legal-10/scripts/eu_builder.py`](/E:/writing-system/_agchain/legal-10/scripts/eu_builder.py)

## What `_agchain/datasets` actually is

The checked-in dataset layer is real and important. It already contains:

- raw and derived corpus files
- ranked citation files
- DuckDB database
- bundle exports
- materialized RPs
- materialized EUs
- inventory outputs
- parquet exports

Top-level examples:

- [`_agchain/datasets/legal10-updates.duckdb`](/E:/writing-system/_agchain/datasets/legal10-updates.duckdb)
- [`_agchain/datasets/citation_inventory.parquet`](/E:/writing-system/_agchain/datasets/citation_inventory.parquet)
- [`_agchain/datasets/scdb_full_with_text.jsonl`](/E:/writing-system/_agchain/datasets/scdb_full_with_text.jsonl)
- [`_agchain/datasets/rps`](/E:/writing-system/_agchain/datasets/rps)
- [`_agchain/datasets/eus`](/E:/writing-system/_agchain/datasets/eus)
- [`_agchain/datasets/bundles`](/E:/writing-system/_agchain/datasets/bundles)
- [`_agchain/datasets/inventory`](/E:/writing-system/_agchain/datasets/inventory)

This changes the implementation picture materially.

The key relationship is:

1. `_agchain/datasets` contains the current benchmark data/build substrate
2. Legal-10 builder code operationalizes that substrate into package artifacts
3. AGChain should expose that lifecycle through product surfaces

So the dataset question is not "does `legal-10` contain a dataset folder?"

The real question is:

"How does AGChain expose benchmark-owned datasets and build outputs without baking Legal-10-specific semantics into the platform core?"

## Why InspectAI matters

The owner message establishes the correct rule:

For every adjacent runtime capability, AGChain should deliberately choose one Inspect adoption mode:

1. use directly
2. compose around it
3. port and customize
4. reference only

This means AGChain should not independently rebuild Inspect-shaped substrate code unless there is a clear rationale.

### Recommended adoption modes by seam

| Seam | Recommended mode | Reason |
|---|---|---|
| execution backend abstraction | compose around it | AGChain needs platform policy and benchmark/package semantics over Inspect execution |
| model config / roles / limits | compose around it | Inspect already has the right configuration vocabulary |
| sandbox environment contract | compose around it first | strong substrate fit, AGChain needs policy exposure |
| advanced sandbox providers | reference now, compose later | useful later, not first showcase slice |
| eval log and trace shape | port and customize | AGChain needs stricter audit/artifact visibility control |
| benchmark-specific payload admission and candidate state | AGChain-owned | this is package semantics, not Inspect substrate |
| scorer semantics for Legal-10 | AGChain-owned | benchmark-specific scoring logic must remain package-owned |
| benchmark authoring package layout | port and customize from Inspect patterns | Inspect Evals is useful, but AGChain needs its own package contract |

## What this means for the web product

The current placeholder rail is not just incomplete. It is also not the best product shape.

The correct rule is:

- `Datasets`, `Prompts`, `Scorers`, `Parameters`, and `Tools` are better treated as child workspaces of benchmark authoring/build/execution surfaces
- `Benchmarks`, `Build`, `Runs`, `Results`, `Models`, and `Artifacts` should carry more of the primary platform weight

So the earlier question "which placeholder menu should we make real first?" needs a revised answer.

The better question is:

"Which primary AGChain platform surface best operationalizes the platform/package/dataset relationship first?"

## Revised implementation order

### 1. Build

This should become the first real missing AGChain surface.

Why:

- the essentials docs say builder surfaces are mandatory
- it operationalizes the relationship between `_agchain/datasets`, Legal-10 builder code, and benchmark packets
- it is authoring-platform work, not just benchmark viewing
- it avoids pretending AGChain is only a run launcher

The first Build surface should expose:

- source dataset inventory
- RP build actions and status
- EU build actions and status
- benchmark packet build actions and status
- validation output
- artifact counts and locations

### 2. Runs

Once Build is real, Runs becomes the natural next surface.

Runs should expose:

- package selection
- built asset selection
- evaluated model
- judge model
- runtime profile / policy
- backend choice where allowed
- run history

This can reuse the existing Legal-10 runtime immediately.

### 3. Results

Results should follow Runs directly and expose:

- run summaries
- per-step outputs
- scorer outputs
- citation integrity outputs
- result comparison across runs and models

### 4. Artifacts

Artifacts should expose exactly what was staged, emitted, and sealed:

- benchmark packet files
- EU/RP files
- run artifacts
- audit logs
- candidate state
- validation reports

### 5. Secondary authoring workspaces

After the above spine is live, add or refine:

- prompt workspace
- scorer workspace
- parameter/profile workspace
- tool/sandbox policy workspace

These are still important, but they should not define the primary AGChain platform shape.

## Concrete surface mapping

This is the revised answer to "what can we build now from real code?"

| Surface | Current code basis | Ready now? | Notes |
|---|---|---:|---|
| Benchmarks | existing benchmark registry/API + Legal-10 benchmark packet | Yes | already partly real |
| Build | `_agchain/datasets` + `rp_builder.py` + `eu_builder.py` + `benchmark_builder.py` | Yes | should be first missing surface made real |
| Runs | `run_3s.py` + runtime package + run artifacts | Yes | second major slice |
| Results | run artifacts + summaries + scorer outputs | Yes | third major slice |
| Models | existing model registry/API | Yes | already partly real |
| Artifacts | benchmark packets, EUs, RPs, run artifacts, audit logs | Yes | should become explicit surface |
| Observability | audit/run artifacts now, OTel later | Partial | start with artifact-backed drilldown |
| Settings | runtime defaults / registration / storage roots | Partial | can stay narrower initially |
| Prompt/scorer/parameter/tool sub-workspaces | strong basis, but better as child surfaces | Partial-to-Yes | should not drive the primary rail |

## Revised practical answer

The important simplification is:

stop treating AGChain as "the Legal-10 app with placeholder pages."

Treat it as:

- a generic benchmark platform
- currently seeded with one real benchmark package: Legal-10
- currently fed by one real dataset/build substrate: `_agchain/datasets`
- intentionally borrowing runtime substrate patterns from InspectAI

From that framing, the first concrete implementation slice should be:

1. Build
2. Runs
3. Results
4. Artifacts

That sequence is simpler, more honest, and much less likely to reintroduce Legal-10-specific assumptions into AGChain's platform surfaces.

## Verification basis used for this revision

- [`docs/agchain/_essentials/2026-03-26-agchain-platform-understanding.md`](/E:/writing-system/docs/agchain/_essentials/2026-03-26-agchain-platform-understanding.md)
- [`docs/agchain/_essentials/2026-03-26-agchain-platform-requirements.md`](/E:/writing-system/docs/agchain/_essentials/2026-03-26-agchain-platform-requirements.md)
- [`docs/agchain/_essentials/benchmark-package-structures-v4.md`](/E:/writing-system/docs/agchain/_essentials/benchmark-package-structures-v4.md)
- [`docs/agchain/_essentials/build-pipeline/datasets-implications.md`](/E:/writing-system/docs/agchain/_essentials/build-pipeline/datasets-implications.md)
- [`_agchain/_reference/owner-message.md`](/E:/writing-system/_agchain/_reference/owner-message.md)
- [`_agchain/_reference/inspect_ai_analysis.md`](/E:/writing-system/_agchain/_reference/inspect_ai_analysis.md)
- [`_agchain/_reference/inspect_ai`](/E:/writing-system/_agchain/_reference/inspect_ai)
- [`_agchain/datasets`](/E:/writing-system/_agchain/datasets)
- [`_agchain/legal-10`](/E:/writing-system/_agchain/legal-10)
