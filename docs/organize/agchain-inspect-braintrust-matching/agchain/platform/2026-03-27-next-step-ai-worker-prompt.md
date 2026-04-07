

The doc-separation pass is mostly complete.

The next step is to define a **simple contract** for:

1. environment profiles
2. runtime profiles

The output should stay narrow.

Do **not** broaden this into a full platform design unless the source-of-truth docs clearly require it.

## Source of Truth

Use these as the primary authorities: E:\writing-system\_agchain\legal-10\docs\_essentials

## Output Files

Create these two files:

1. `E:\writing-system\docs\plans\2026-03-27-environment-and-runtime-profile-contract.md`
2. `E:\writing-system\docs\plans\2026-03-27-environment-and-runtime-profile-implementation-plan.md`

## Deliverable 1: Contract

Write a simple contract document that defines:

### A. Environment profile list

For each environment profile, specify:

- profile name
- purpose
- whether it is build-time or run-time
- what inputs it requires
- what outputs/artifacts it produces
- what invariants apply
- whether it is AGChain-owned, InspectAI-backed, or outside current scope

### B. Runtime profile list

For each runtime profile, specify:

- profile name
- purpose
- model-role behavior
- statefulness behavior
- payload-admission behavior
- staging/isolation behavior
- audit/provenance behavior
- whether it is AGChain-owned, InspectAI-backed, or outside current scope

### C. Minimal capability mapping

Include a short table that maps each major capability into one of:

- `Owned by AGChain`
- `Wrapped InspectAI capability`
- `Delegated to InspectAI`
- `Not in current scope`

Focus only on capabilities needed to define the environment and runtime profile lists.

Do not turn this into a broad product spec.

## Deliverable 2: Implementation plan

Write a short implementation plan that explains how to implement the contract.

Keep it practical and specific.

It must include:

- goal
- architecture
- tech stack
- exact files or modules likely to change
- short task list
- tests to add
- completion criteria

## Constraints

1. Keep the output simple.
2. Stay aligned with the source-of-truth docs.
3. Separate build-time environments from run-time environments.
4. Preserve the no-leak, staged-bytes, and audit invariants.
5. Treat InspectAI as a substrate, not as the owner of AGChain chain semantics.

## What Good Output Looks Like

The worker should answer:

- What are the environment profiles we need?
- What are the runtime profiles we need?
- What does each one mean?
- Which parts belong to AGChain vs InspectAI?
- What is the next implementation step after the lists are locked?

The worker should **not** drift into:

- frontend design
- database design unless clearly required
- broad platform architecture unrelated to profile contracts
- placeholder or speculative features not justified by the source docs

## Final Response Format

When finished, provide:

1. the two file paths
2. the final list of environment profiles
3. the final list of runtime profiles
4. the top unresolved risk, if any
