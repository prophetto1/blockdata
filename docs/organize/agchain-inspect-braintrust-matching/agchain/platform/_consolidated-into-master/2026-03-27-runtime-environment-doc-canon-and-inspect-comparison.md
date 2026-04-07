# Runtime / Environment Canon And InspectAI Comparison

Date: 2026-03-27

## Purpose

This report separates fresh vs stale documentation across:

- `E:\writing-system\_agchain\legal-10\docs`
- `E:\writing-system\_agchain\docs-site\src\content`

It then extracts the runtime and environment-profile requirements that should drive AG chain platform design, and compares those requirements against the reference repository in:

- `E:\writing-system\_agchain\_reference\inspect_ai`

## Verification Method

The split below was verified against:

- `legal-10/docs/_INDEX.md`
- `legal-10/docs/platform/_INDEX.md`
- explicit stale/supplementary folder markers
- current docs-site page inventory under `docs-site/src/content/docs`
- keyword scans for runtime/state/session/context/isolation/audit concepts

Confidence is high for the current runtime/environment canon because the Legal-10 docs explicitly declare their own authority ordering.

## Authority Rules

The Legal-10 corpus already defines the reading order:

1. `legal-10/docs/mvp/M1-buildtime-packaging-sealing-dev-brief.md`
   Highest authority for bundle layout, package/build boundary, and sealing.
2. `legal-10/docs/platform/inter-step-requirements.md`
   Highest authority for runtime behavior.
3. `legal-10/docs/fdq/*.md`
   Highest authority for specific step prompt/contract/scoring behavior.

For runtime specifically, `legal-10/docs/platform/_INDEX.md` says to read:

1. `platform/inter-step-requirements.md`
2. `platform/pdrunner-inspect-ai.md`
3. `platform/statefulness-context-persistence.md`
4. `platform/prompt-messages.md`
5. `platform/prompts-v1.0.md`

If overlapping requirements conflict, `inter-step-requirements.md` wins.

## Fresh Primary Runtime / Environment Docs

These are the primary sources to use when extracting AG chain runtime-policy and environment-profile requirements:

- `legal-10/docs/platform/inter-step-requirements.md`
- `legal-10/docs/platform/statefulness-context-persistence.md`
- `legal-10/docs/platform/prompt-messages.md`
- `legal-10/docs/platform/pdrunner-inspect-ai.md`
- `legal-10/docs/mvp/M1-buildtime-packaging-sealing-dev-brief.md`
- `legal-10/docs/mvp/run-outputs.md`

These are not top authority, but they are still fresh and useful as synthesis / cross-check material:

- `legal-10/docs/specifications/02092026.md`
- `legal-10/docs/specifications/3-step-mvp-consolidated-spec.md`
- `legal-10/docs/10-step-chain/chain-overview-v1.1.md`

## Fresh Docs-Site Mirrors

The docs-site does contain fresh platform pages, but they function as curated mirrors and summaries of the Legal-10 platform docs rather than an independent authority source.

Useful mirror pages:

- `docs-site/src/content/docs/platform/runtime/runner-engine.md`
- `docs-site/src/content/docs/platform/state-messages/state-management.md`
- `docs-site/src/content/docs/platform/state-messages/message-assembly.md`
- `docs-site/src/content/docs/platform/isolation-security/staging-isolation.md`
- `docs-site/src/content/docs/platform/audit-repro/audit.md`
- `docs-site/src/content/docs/platform/index.md`
- `docs-site/src/content/docs/benchmarks/legal-10/index.md`

These pages are fresh enough to keep, but they should be treated as explanatory mirrors. They do not add materially new runtime-policy requirements beyond the Legal-10 authority docs.

## Stale / Supplementary / Exclude From Primary Extraction

These should not be used as primary sources for runtime/environment-profile design:

- `legal-10/docs/secondary-reference/**`
- `legal-10/docs/-ongoing-work/**`
- `legal-10/docs/steps-reference/**`
- `legal-10/docs/-prompts/**`
- `legal-10/docs/_summaries/**`

These are useful only as supplementary or future-shape references:

- `legal-10/docs/10-step-chain/benchmark-package-structures-v4.md`
  Future-shape / normalization reference, not current runtime authority.
- most of `legal-10/docs/build-pipeline/**`
  Useful for boundary enforcement, but not runtime-policy extraction.
- `legal-10/docs/fdq/**`
  Use only when step-specific scoring/prompt contracts matter.

Known superseded item:

- `legal-10/docs/fdq/post/judge-evaluation-both-iracs.md`
  Superseded by `legal-10/docs/fdq/post/irac-pair-scoring.md`

Docs-site pages to exclude from runtime/environment extraction:

- benchmark overview pages such as `benchmarks/atomic.md`, `benchmarks/l7.md`, `benchmarks/quantization.md`
- project/infrastructure/roadmap overview pages
- Legal-10 data-model pages except when checking the DuckDB build/runtime boundary

## Extracted Runtime / Environment Requirements

The fresh docs imply that AG chain needs a first-class environment profile / runtime-policy bundle with at least the following dimensions.

### 1. Session Topology

The platform must support and identify how model calls are sessioned:

- fresh call per step
- growing conversation across steps
- explicit API-call boundaries inside a chain
- possibly grouped-call execution for adjacent steps

Current named policies already exist:

- `Replay_Minimal`
- `Replay_Full`

### 2. Candidate-Visible State Strategy

The platform must control how prior work is carried forward:

- sanitized `candidate_state.json`
- explicit carry-forward allowlists
- runner-owned vs candidate-visible state separation
- exact rules for what is forbidden in carry-forward

Current state-provider taxonomy already exists:

- Type 0 baseline
- Type I pinned context / core identity state
- Type II session context manager
- Type III temporal fact store

### 3. Message Assembly Contract

Message construction is not generic chat history. It is a fenced, ordered, auditable protocol:

1. `ENV`
2. `ANCHOR_PACK`
3. `EVIDENCE_PACK`
4. `CARRY_FORWARD`
5. `TASK`
6. `OUTPUT_GUARD`

This ordering is fixed and must be policy-identifiable.

### 4. Payload Admission Policy

The runtime must control when each payload becomes visible:

- per-step admissions
- staged-file copying only for admitted payloads
- no future payload visibility
- no runtime back-edge into build-time stores

### 5. Isolation And Staging

The evaluated model must only see:

- current step definition
- admitted payloads
- sanitized carry-forward state

The runner must hash staged files and assemble messages from staged bytes only.

### 6. Tool / Sandbox / Approval Envelope

The environment profile must be able to vary:

- no tools
- selected tools
- broad tool access
- sandbox type
- approval policy

This must remain benchmark-fair within a comparison cohort.

### 7. Limits And Runtime Controls

The policy bundle should also identify runtime controls such as:

- timeout policy
- token ceilings
- retry behavior
- truncation / overflow handling
- observability verbosity

### 8. Audit And Reproducibility

Environment profiles are not only behavioral; they must be provable:

- staged-file hashes
- final message hash
- model identity
- judge identity
- policy bundle identity
- artifact lineage

## What Docs-Site Adds

The docs-site runtime pages are useful because they restate the core runtime contract cleanly:

- state carry-forward and session strategies
- fenced message windows
- staging isolation
- audit artifact set

But they do not change the primary conclusions above. They are a good publishing surface, not the primary extraction source.

## InspectAI Comparison

## Strong Reuse Candidates

InspectAI already provides strong substrate pieces for:

- model/provider abstraction
- named model roles
- sandbox abstraction
- approval policy system
- tool protocol and MCP integration
- task execution loop
- mutable task state
- limits such as message/token/time/cost controls
- logging / eval trace infrastructure
- compaction and truncation machinery

Important source seams:

- `inspect_ai/_eval/task/task.py`
- `inspect_ai/solver/_task_state.py`
- `inspect_ai/model/_model.py`
- `inspect_ai/model/_compaction/*`
- `inspect_ai/util/_sandbox/environment.py`
- `inspect_ai/approval/_approval.py`
- `inspect_ai/approval/_policy.py`
- `inspect_ai/tool/_tool.py`

## What InspectAI Does Not Define For AG Chain

InspectAI does not give AG chain’s required environment-policy surface as a first-class benchmark object. In particular, it does not define:

- payload admission schedules as benchmark policy
- fixed candidate-visible window ordering as benchmark policy
- Type 0 / I / II / III state-provider taxonomy
- exact carry-forward sanitation contract
- benchmark-owned session topology / replay strategy as comparison identity
- exact audit proof of staged bytes plus final candidate-visible message bytes
- fairness-oriented comparison of the same model under different environment bundles

InspectAI has mechanisms in these areas, but not the AG chain policy layer that makes them benchmark-comparable and audit-stable.

## Recommended Ownership Boundary

AG chain should own:

- environment profile / runtime-policy-bundle schema
- message-window protocol
- payload-admission policy
- candidate-state policy
- benchmark fairness rules
- audit proof contract
- run/result identity linking model plus benchmark plus policy bundle

InspectAI should be treated as the execution substrate for:

- provider adapters
- tool execution
- sandbox execution
- approval enforcement
- generic task / message / limit handling
- trace/log plumbing

## Final Conclusion

The fresh canonical source for environment-profile and runtime requirements is the Legal-10 platform corpus, not the docs-site and not InspectAI.

The docs-site runtime pages are fresh mirrors worth keeping, but they do not replace the Legal-10 authority docs.

InspectAI is a strong implementation substrate, but AG chain must keep ownership of the environment-policy layer. That is the product surface that differentiates AG chain:

- same benchmark
- same model
- different environment profile
- different result

That comparison mode is not a side feature. It is a first-class design requirement emerging directly from the fresh runtime docs.
