# Memory Current Triage

**Source file:** [0131-135-mdfixed-memory.jsonl](/E:/writing-system/_agchain/docs/instructions-background/0131-135-mdfixed-memory.jsonl)  
**Date reviewed:** 2026-03-30

## Bottom line

Most of this memory file is still useful.

It is **not** mostly stale. The stale part is narrower:

- repo-topology assumptions
- old relocation paths
- old Central Hub / standalone-website decisions

The usable part is much larger:

- dataset/build pipeline facts
- benchmark packet structure
- EU/RP semantics
- payload admission and staging isolation
- candidate state behavior
- run artifact expectations
- FDQ / step / scoring semantics
- Inspect-shaped chain-runtime ideas

## Counts

From a structured pass over the JSONL:

- total records: `135`
- entities: `119`
- relations: `16`
- clearly stale topology/migration entries: `1`
- mixed entries with some useful content but stale hosting assumptions: `1`
- still-actionable entries: `69+`

This means the file should be treated as **mostly actionable with selective pruning**, not discarded.

## Entries that are stale or need caution

### 1. `l10-migration-repo-relocation`

This is stale for current pathing.

Why:

- it says the repo relocated to `E:\\agchain\\legal-10`
- current live work is inside `E:\\writing-system\\_agchain\\legal-10`

Use only as migration history, not as current path guidance.

### 2. `legal10-website-admin-pocketbase-status`

Use with caution.

Why:

- this is about the old static website admin arrangement under `website/public/admin/`
- it reflects a project-local admin/frontend posture, not the current AGChain-in-`writing-system` platform direction

Still useful only if someone is specifically working on the old Legal-10 website shell.

### 3. `l10-decision-website-admin-location`

Use with caution.

Why:

- it encodes a decision about keeping website admin pages in the standalone Legal-10 repo instead of a central hub
- that is not a safe platform assumption now that AGChain is hosted inside `writing-system`

The general idea of separating project-specific admin from reusable platform components may still be useful, but the actual hosting decision is stale.

### 4. `l10-doc-architecture-decisions`

Use with caution.

Why:

- it references `hub/documentation/`
- it uses an older three-tier “Central Hub Platform > Client Repos > Local State Root” framing

The useful part is the substance:

- database-first
- PDRunner / Inspect wrapper thinking
- staging isolation

The stale part is the repo/topology language.

### 5. `l10-analysis-hub-migration-proposals`

Mostly stale for current repo structure.

Use only if somebody needs migration history from the pre-`writing-system` phase.

## Entries that are still strongly actionable

These are the memory areas that still look worth using.

### Dataset/build layer

- `scdb-data-source`
- `cap-data-source`
- `shepards-data-source`
- `fowler-scores`
- `citation-depth-labels`
- `scdb_with_ideology`

Why they are useful:

- they describe the actual legal dataset substrate
- they explain what the derived artifacts mean
- they map raw materials to benchmark behavior

### Research pack / evaluation unit mechanics

- `rp-selection-scotus`
- `rp-selection-cap`
- `eu-packet`
- `benchmark-package`

Why they are useful:

- they preserve the dataset -> RP -> EU -> benchmark packet model
- that model still fits the current AGChain / Legal-10 relationship

### Runtime mechanics

- `payload-admission`
- `staging-isolation`
- `candidate-state`
- `run-artifacts`

Why they are useful:

- they align with the actual runtime code in `legal-10/runspecs/3-STEP-RUN/runtime`
- they capture benchmark-native execution rules we still need

### Scoring and post-chain behavior

- `post-citation-integrity`
- judge / IRAC grading memories
- benchmark packet / run summary memories

Why they are useful:

- they describe the benchmark semantics, not old repo topology

### Inspect-related chain-runtime direction

- `pdrunner`
- `pdrunner-execution`

Why they are useful:

- the exact naming may be older, but the core idea still matters:
  - Inspect handles intra-step execution well
  - AGChain needs chain-level orchestration on top

Use these as design guidance, not as a naming contract.

## Practical rule for future use

When using this JSONL:

- keep entries about dataset semantics, runtime mechanics, scoring, packet structure, and Inspect wrapper/orchestration ideas
- ignore or rewrite entries that talk about:
  - old repo locations
  - Central Hub hosting assumptions
  - standalone Legal-10 website/admin topology

## Safest interpretation

Treat this memory file as:

- **good for benchmark/package/runtime knowledge**
- **bad for current filesystem/repo-topology assumptions**

That is the right way to use it without inheriting stale infrastructure decisions.
