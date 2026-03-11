# Kestra CT Comparative Assessment

## Plan Metadata

- Source paths:
  - `kestra-ct/`
  - `kt-ct/`
- Date reviewed: `2026-03-09`
- Reviewer: `Codex`

## Verdict

`Conditional Pass`

## Findings

### Critical

1. `kt-ct` still carries the wrong identity rule.
   [2026-03-09-kestra-compatibility-preparatory-implementation-plan.md](/home/jon/blockdata/kt-ct/plans/2026-03-09-kestra-compatibility-preparatory-implementation-plan.md#L15) says `namespace` is an alias of `project_id`. That contradicts the corrected Kestra-native rule in [2026-03-09-kestra-integration-preparation-implementation-plan.md](/home/jon/blockdata/kestra-ct/plans/2026-03-09-kestra-integration-preparation-implementation-plan.md#L13), which treats `namespace` as first-class and forbids `project_id` inside the `kt.*` compatibility surface. This makes `kt-ct` unsafe as the canonical governing CT without revision.

2. `kt-ct`'s generated API tree is not safe to treat as the backend contract baseline.
   `kt-ct/generated/kestra-api/sdk/ks-shared.gen.ts` imports `vue-router`, which makes the SDK layer frontend-coupled. `kt-ct` documents this correctly in [worker-system.md](/home/jon/blockdata/kt-ct/instructions/worker-system.md), but the generated tree itself still contains that unsafe layer. `kestra-ct` made the safer choice by staging types-only output in [kestra-contract](/home/jon/blockdata/kestra-ct/generated/kestra-contract).

### Major

1. `kestra-ct` is the stronger operating CT.
   It has the more complete preparation lifecycle: readiness docs, decisions log, verification matrix, worker templates, runtime baseline, adapter layout, seeded page registry, seeded page packet, and gate assessment. `kt-ct` is more skeletal by comparison and does not show the same closed preparation loop.

2. `kt-ct` is stronger on backend implementation guardrails.
   It explicitly requires sequential thinking, forbids backend imports from `sdk/*.gen.ts`, and states the backend type rule in multiple places, especially [worker-system.md](/home/jon/blockdata/kt-ct/instructions/worker-system.md) and [page.plan.template.md](/home/jon/blockdata/kt-ct/tasks/page.plan.template.md). `kestra-ct` should absorb those rules.

3. `kt-ct` has the better staged DB type shape.
   [database.types.kt.ts](/home/jon/blockdata/kt-ct/generated/database.types.kt.ts) models generated columns as `never` in `Insert` and `Update`, which is safer for backend adapter work. [database.types.ts](/home/jon/blockdata/kestra-ct/generated/database.types.ts) is acceptable as a CT staging artifact, but its permissive `Partial<Row>` inserts and updates are weaker as a long-term backend contract.

4. `kestra-ct` has the better page-task model.
   The packet-plus-registry model in [packet.md](/home/jon/blockdata/kestra-ct/pages/flows-list/packet.md) and [page-registry.yaml](/home/jon/blockdata/kestra-ct/page-registry.yaml) is more operationally useful than `kt-ct`'s looser task-file model. It makes scope, blockers, dependencies, and in-scope files explicit before implementation starts.

### Minor

1. The two CT trees use different naming conventions.
   `kestra-ct` uses `pages/flows-list/` while `kt-ct` uses `tasks/flows_list.*`. The difference is not harmful by itself, but it creates avoidable worker confusion if both roots stay present.

2. `kt-ct` has a few useful artifacts `kestra-ct` does not yet mirror.
   The most useful are [worker-launch-prompt.md](/home/jon/blockdata/kt-ct/prompts/worker-launch-prompt.md) and [openapi-ts.backend.config.ts](/home/jon/blockdata/kt-ct/references/openapi-ts.backend.config.ts). They are reference-grade inputs, not reasons to switch the canonical CT.

## Specific Gaps, Contradictions, And Ambiguity

- `kestra-ct` and `kt-ct` disagree on the identity model.
- `kestra-ct` has the better governance and staging discipline, but `kt-ct` has stronger backend implementation rules.
- `kt-ct` generated a broader OpenAPI output surface than the backend should consume.
- The repo now has two CT roots, which is useful for comparison but unsafe for worker execution if both are treated as active sources of truth.

## Required Changes Before Implementation

1. Keep `kestra-ct` as the single canonical CT for live work.
2. Do not merge `kt-ct` wholesale into `kestra-ct`.
3. Port these specific improvements from `kt-ct` into `kestra-ct`:
   - explicit sequential-thinking requirement in worker instructions
   - explicit backend ban on `sdk/*.gen.ts` imports
   - stricter DB type strategy for future promotion into runtime paths
   - useful reference artifacts such as the backend OpenAPI config and worker launch prompt
4. Mark `kt-ct` as comparative reference only once the selected improvements are absorbed.

## Verification Expectations

- Compare the governing plan in each CT.
- Compare worker instructions and template chains.
- Compare first-page task artifacts.
- Compare generated DB and contract type strategies.
- Verify any recommendation against the actual file contents in both trees, not prior chat summaries.

## Acceptance Criteria Check

- Alignment with corrected Kestra direction: `kestra-ct Pass`, `kt-ct Fail`
- Scope boundaries and operating process: `kestra-ct Pass`, `kt-ct Partial`
- Backend type and import discipline: `kestra-ct Partial`, `kt-ct Pass`
- Page-task execution readiness: `kestra-ct Pass`, `kt-ct Partial`
- Safe canonical CT choice available: `Pass`

## Final Recommendation

`Go` with `kestra-ct` as the canonical control tower.

`Do Not Merge` `kt-ct` as a second live CT.

Use `kt-ct` as a reference source for selected upgrades only:

- copy the backend import prohibition
- copy the sequential-thinking requirement
- adopt the stricter DB insert/update typing strategy when promoting types
- retain the backend OpenAPI config and worker prompt as optional references

The parallel runs were complementary, not redundant. `kestra-ct` won the governance model. `kt-ct` produced several implementation guardrails worth harvesting. The clean path is selective reconciliation, not directory fusion.
