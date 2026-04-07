# 2026-03-27 Legal-10 Doc Corpus Freshness Audit and InspectAI Comparison

**Goal:** Separate stale vs fresh docs in `_agchain/legal-10/docs` and `_agchain/docs-site/src/content`, use only the fresh governing set to extract environment profiles and runtime requirements, then compare that extracted contract against `inspect_ai`.

**Method:** Follow the same surface-locking discipline as `investigating-and-writing-plan`: identify the authoritative intent sources first, separate zero-case and non-governing material from governing material, then compare the locked runtime/build/audit/state surface against the external runtime substrate.

## Corpus Inventory

- Total docs analyzed: `112`
- `_agchain/legal-10/docs`: `80`
- `_agchain/docs-site/src/content`: `32`

## Classification Result

- `fresh_core`: `22`
- `fresh_supporting`: `25`
- `fresh_out_of_scope`: `46`
- `stale_superseded`: `19`

Important nuance:

- Only `19` docs are actually stale or superseded.
- Another `46` docs are still current enough to keep, but they are not governing sources for **environment profile** or **runtime requirement** extraction.
- The extraction below therefore uses the `47`-doc fresh governing set: `22 fresh_core + 25 fresh_supporting`.

Full file-by-file proof is in:

- `_agchain/docs-analysis/2026-03-27-doc-classification-ledger.md`
- `_agchain/docs-analysis/2026-03-27-doc-classification-ledger.json`

## Why These Docs Were Treated As Governing

The governing set was determined from the corpus's own authority markers:

1. `_agchain/legal-10/docs/_INDEX.md`
   - Declares the authority hierarchy.
   - Explicitly marks `secondary-reference/` as historical / superseded / early drafts.
   - Declares `mvp/M1-buildtime-packaging-sealing-dev-brief.md` highest authority for bundle layout/schemas.
   - Declares `platform/inter-step-requirements.md` highest authority for runtime behavior.

2. `_agchain/legal-10/docs/platform/_INDEX.md`
   - Declares runtime reading order and conflict precedence.
   - Makes `inter-step-requirements.md` the winner on runtime conflicts.

3. `_agchain/legal-10/docs/mvp/_INDEX.md`
   - Declares `M1-buildtime-packaging-sealing-dev-brief.md` the most authoritative MVP doc.
   - Declares `mvp/fdq-*.md` files to be 3-step extracts of canonical `fdq/` docs.

4. `_agchain/legal-10/docs/fdq/_INDEX.md`
   - Declares `fdq/post/judge-evaluation-both-iracs.md` superseded by `post/irac-pair-scoring.md`.
   - Declares the canonical shipped MVP step specs to be `01-ka-sc.md`, `09-irac-without-rp.md`, `10-irac-with-rp.md`.

5. `_agchain/docs-site/src/content/docs/index.mdx`
   - Frames docs-site as the canonical synthesis layer for current platform, benchmark, pipeline, and infrastructure state.

## Docs Removed From The Governing Set

### Stale / superseded

The following categories were removed before extraction:

1. `_agchain/legal-10/docs/_stale/**`
2. `_agchain/legal-10/docs/secondary-reference/**`
3. `_agchain/legal-10/docs/fdq/post/judge-evaluation-both-iracs.md`
4. `_agchain/legal-10/docs/mvp/fdq-01-ka-sc.md`
5. `_agchain/legal-10/docs/mvp/fdq-02-irac-without-rp.md`
6. `_agchain/legal-10/docs/mvp/fdq-03-irac-with-rp.md`

### Current but not governing for this extraction

These were not treated as stale, but they were excluded from the runtime/environment extraction pass:

1. `10-step-chain/**` forward-looking chain expansion docs
2. Most `steps-reference/**` implementation aides
3. `-ongoing-work/**` logs
4. `_summaries/**` summary material
5. Non-MVP FDQs (`02` through `08`) that do not define the shipped 3-step runtime surface
6. Prompt notes that do not add environment/runtime contract information

## Fresh Governing Sources Used For Extraction

### Fresh core

- `_agchain/legal-10/docs/_INDEX.md`
- `_agchain/legal-10/docs/platform/_INDEX.md`
- `_agchain/legal-10/docs/platform/inter-step-requirements.md`
- `_agchain/legal-10/docs/platform/pdrunner-inspect-ai.md`
- `_agchain/legal-10/docs/platform/prompt-messages.md`
- `_agchain/legal-10/docs/platform/statefulness-context-persistence.md`
- `_agchain/legal-10/docs/mvp/_INDEX.md`
- `_agchain/legal-10/docs/mvp/M1-buildtime-packaging-sealing-dev-brief.md`
- `_agchain/legal-10/docs/mvp/run-outputs.md`
- `_agchain/legal-10/docs/build-pipeline/_INDEX.md`
- `_agchain/legal-10/docs/build-pipeline/rp-builder-reference.py.md`
- `_agchain/legal-10/docs/build-pipeline/eu-builder-reference.py.md`
- `_agchain/legal-10/docs/build-pipeline/eu-builder-notes.md`
- `_agchain/legal-10/docs/build-pipeline/data-pipeline-reference.md`
- `_agchain/legal-10/docs/build-pipeline/sc-dataset-db-schema.md`
- `_agchain/legal-10/docs/build-pipeline/sealed-evaluation-units-security.md`
- `_agchain/legal-10/docs/fdq/_INDEX.md`
- `_agchain/legal-10/docs/fdq/01-ka-sc.md`
- `_agchain/legal-10/docs/fdq/09-irac-without-rp.md`
- `_agchain/legal-10/docs/fdq/10-irac-with-rp.md`
- `_agchain/legal-10/docs/fdq/post/irac-pair-scoring.md`
- `_agchain/legal-10/docs/fdq/post/citation_integrity.py.md`

### Fresh supporting

The docs-site mirror/synthesis layer was treated as current supporting evidence, especially:

- `_agchain/docs-site/src/content/docs/index.mdx`
- `_agchain/docs-site/src/content/docs/platform/**`
- `_agchain/docs-site/src/content/docs/pipeline/**`
- `_agchain/docs-site/src/content/docs/benchmarks/legal-10/index.md`
- `_agchain/docs-site/src/content/docs/benchmarks/legal-10/evaluation-steps.md`
- `_agchain/docs-site/src/content/docs/benchmarks/legal-10/packages.md`
- `_agchain/docs-site/src/content/docs/project/infrastructure/index.md`

Three additional legal-10 docs were kept as supporting, not canonical:

- `_agchain/legal-10/docs/mvp/benchmark-technical-specification-v1.1.md`
- `_agchain/legal-10/docs/platform/prompts-v1.0.md`
- `_agchain/legal-10/docs/specifications/3-step-mvp-consolidated-spec.md`

## Extracted Environment Profiles

## 1. Build-time packaging environment

This is the most concrete environment profile in the corpus.

Locked properties:

- Runs as Python CLI tooling.
- Must run on Windows with `python`; no conda assumption.
- Uses only local repo and dataset inputs.
- Performs **no model calls** and **no network calls** in M1.
- Produces sealed benchmark artifacts ahead of runtime.

Required inputs:

- `datasets/` local artifacts
- DuckDB-backed or file-backed source data for RP and EU construction
- FDQ specs and benchmark builder inputs

Required outputs:

- benchmark package
- EU packages
- manifests
- signatures / sealing artifacts

## 2. Runner host environment

This is the current execution environment for a single benchmark run.

Locked properties:

- Plan-driven serial execution
- Benchmark directory + EU directory as primary runtime inputs
- Separate evaluated-model and judge-model roles
- Pluggable provider/model pairs, with OpenAI and Anthropic explicitly documented

Required runtime outputs:

- `run.jsonl`
- `audit_log.jsonl`
- `run_manifest.json`
- `summary.json`
- `trace.jsonl`
- `candidate_state.json`

## 3. Per-call staging environment

This is the transient isolation envelope around each step execution.

Locked properties:

- Uses `staging/<run_id>/<call_id>/`
- Only admitted payloads and current step materials may enter staging
- `ground_truth`, judge prompts, future steps, and unadmitted payloads must never be staged
- Isolation guarantees come from what is copied into staging and what is omitted

## 4. Stateful execution profile

The corpus defines statefulness as a first-class runtime surface, not an accidental side effect.

Locked properties:

- `candidate_state.json` is the carry-forward spine
- State is accumulation-only
- State must be JSON-serializable
- Forbidden state content includes ground truth, scores, judge outputs, and `gt_*`
- No cross-EU leakage

Variants explicitly defined:

- Type 0 provider: file-based serialized state baseline
- Type I / II / III providers: future extensibility points
- Replay strategies: `Replay_Full` and `Replay_Minimal`
- Both replay strategies must yield identical audit proofs

## 5. Deployment / infrastructure environment

The docs-site infrastructure docs expose the broader platform deployment profile:

- GCP
- PocketBase
- Supabase
- Vercel
- environment variables and secrets management

This is a platform deployment environment, not the benchmark runtime contract itself, but it is still part of the current fresh supporting corpus.

## Extracted Runtime Requirements

## Core execution invariants

1. The runner executes steps strictly in plan order.
2. The runner, not the model, owns payload admission.
3. Sealed evidence is produced ahead of time; runtime retrieval is not part of the current contract.
4. The runner must be able to reject modified released bundles based on manifest/signature integrity.

## State and carry-forward

1. `candidate_state.json` carries model-derived artifacts between steps.
2. State accumulates; later steps add, they do not rewrite prior outputs.
3. Ground truth, judge material, and scoring material must never enter candidate-visible state.

## Payload admission and evidence delivery

1. Admission is controlled by `plan.json` and payload delivery boundaries.
2. Unadmitted references are runtime errors.
3. `p1` and `p2` are admitted at specific steps, not globally.

## Message assembly

The message window contract is fixed:

1. `ENV`
2. `ANCHOR_PACK`
3. `EVIDENCE_PACK`
4. `CARRY_FORWARD`
5. `TASK`
6. `OUTPUT_GUARD`

This ordering is not cosmetic; it is part of the runtime contract.

## Audit / observability

The corpus does define a runtime observability surface, but it is benchmark-native rather than platform-API-native:

- `audit_log.jsonl` for boundary proofs and staged/message bytes
- `run.jsonl` for append-only step and scorer records
- `run_manifest.json` for provenance
- `trace.jsonl` for execution events
- deterministic summary generation

## Post-chain semantics

1. The judge model grades the two IRAC outputs as a pair.
2. Citation integrity is a deterministic post-chain operation.

## Zero-case findings using the investigating-and-writing-plan lens

The corpus does **not** currently define the following as part of the Legal-10 runtime contract:

- a benchmark-specific platform API surface
- a runtime relational database schema for benchmark execution state
- frontend route/component contracts specific to the benchmark runtime

The active surfaces in this corpus are instead:

- sealed file/package contracts
- runner semantics
- statefulness
- staging/isolation
- audit and provenance artifacts

## Comparison Basis: InspectAI

Compared against:

- local shallow clone at `_external/inspect_ai`
- commit `563b4a62f92dd9ab15c52b02f1d9b84efc467baa`
- commit date `2026-03-27 00:29:34 -0400`
- official docs:
  - `https://inspect.aisi.org.uk/agent-bridge.html`
  - `https://inspect.aisi.org.uk/options.html`

## InspectAI Stack / Runtime Profile

Observed current repo/runtime characteristics:

- Python repository with `requires-python = ">=3.10"`
- Core top-level packages include `agent`, `approval`, `tool`, `model`, `solver`, and sandbox utilities
- Task definitions support:
  - `model_roles`
  - `sandbox`
  - `approval`
- CLI/docs expose:
  - `--sandbox`
  - `--approval`
  - `--env`
- Official agent-bridge docs expose both:
  - in-process Python agent bridging
  - sandbox agent bridging via localhost proxy and bridge-managed port

## Where InspectAI Aligns Well

InspectAI is a strong substrate for the following parts of our target runtime:

1. Model-role separation
   - Its `model_roles` concept aligns directly with evaluated-model vs judge-model separation.

2. Sandbox plumbing
   - Its sandbox support is more explicit than our current corpus on sandbox backend selection.

3. Tool approval
   - Its approval surface is a concrete capability we should absorb into our eventual environment profile schema.

4. Per-sample lifecycle
   - Its task/sample lifecycle is a good fit for step execution once AGChain owns the cross-step wrapper.

5. Agent / MCP bridging
   - Its bridge patterns are directly relevant if AGChain wants tools or external agent shells inside benchmark execution.

## Where InspectAI Does Not Match The Fresh AGChain Contract

InspectAI does **not** provide our current contract out of the box:

1. No sealed benchmark/EU/RP build pipeline
2. No AGChain-style payload admission contract
3. No first-class `candidate_state.json` carry-forward semantics
4. No fixed ENV/ANCHOR/EVIDENCE/CARRY_FORWARD/TASK/OUTPUT_GUARD window contract
5. No Type 0 / I / II / III state-provider abstraction
6. No AGChain-native `audit_log.jsonl` + `run_manifest.json` proof model
7. No benchmark-specific post-chain citation-integrity contract
8. No benchmark registry / policy bundle / fairness abstraction described in the current requirements summary

This matches the internal `pdrunner-inspect-ai.md` conclusion:

- InspectAI is a strong **step engine**
- AGChain still needs to own the **chain engine**

## Compatibility Assessment

Overall assessment: **Adoptable with effort**

What InspectAI can plausibly own:

- model invocation substrate
- sandbox execution substrate
- approval/tool plumbing
- task/sample lifecycle
- agent bridging

What AGChain still has to own:

- sealed build-time packaging and integrity
- benchmark package and EU contract
- payload admission
- statefulness registry
- carry-forward and replay semantics
- fixed message-window assembly
- audit/provenance contract
- benchmark-specific post-chain scoring and integrity checks

## New Requirements Exposed By The Comparison

The comparison surfaced a few things our fresh corpus should make explicit next:

1. Environment profiles should include sandbox backend selection, approval policy, and env-var catalog as explicit fields.
2. The AGChain-to-Inspect bridge should be specified as a contract, not just as an architectural idea.
3. Audit compatibility should be decided explicitly:
   - AGChain-native audit format only
   - dual-write into Inspect logs
   - or a defined mapping layer
4. Model-role mapping should be formalized in the environment profile object rather than implied by runner config.

## Bottom Line

After stale/superseded removal, the current governing environment/runtime contract is coherent:

- build-time packaging is sealed and offline
- runtime execution is plan-driven and stateful
- isolation is enforced through staging and admission
- observability is artifact-native (`audit_log.jsonl`, `run_manifest.json`, `trace.jsonl`)

`inspect_ai` is compatible with that direction as a runtime substrate, but it is not a replacement for the AGChain-owned chain semantics, packaging layer, or audit/state contract.
