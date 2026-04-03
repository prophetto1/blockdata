## Plan Reviewed

- `docs/plans/2026-04-01-index-builder-redesign-implementation-plan.md`
- Summary: a frontend-heavy redesign that replaces the current mock/workbench Index Builder page with a real two-pane list/detail surface over existing `pipeline_source_sets`, `pipeline_jobs`, and `pipeline_deliverables`, while making only two small backend response-shape additions.

## Structural Verdict

**Structurally Incomplete**

### Structural Deficiencies

1. **The core `useIndexBuilder` orchestration depends on shared-hook control surfaces that do not exist in the current seam** — Task 4 and Task 5 require the new hook to select an arbitrary saved source set, hydrate the inner source-set hook with that selection, and reset it for a fresh draft ([plan lines 470-483](E:/writing-system/docs/plans/2026-04-01-index-builder-redesign-implementation-plan.md#L470), [plan lines 498-521](E:/writing-system/docs/plans/2026-04-01-index-builder-redesign-implementation-plan.md#L498)). But the current shared hook keeps `hydrateSourceSet` internal and does not expose any public setter/reset API for `activeSourceSetId` or selected source IDs ([usePipelineSourceSet.ts](E:/writing-system/web/src/hooks/usePipelineSourceSet.ts#L45), [usePipelineSourceSet.ts](E:/writing-system/web/src/hooks/usePipelineSourceSet.ts#L177)). It also defaults `refreshSourceSet()` to the first source set when `activeSourceSetId` is null, which conflicts with the plan’s explicit empty-state and arbitrary-row selection model ([usePipelineSourceSet.ts](E:/writing-system/web/src/hooks/usePipelineSourceSet.ts#L76)). The locked file inventory does not include modifying [`usePipelineSourceSet.ts`](E:/writing-system/web/src/hooks/usePipelineSourceSet.ts), so the plan’s primary implementation path is not actually implementable as written.

2. **Task 8 introduces unsupported header actions that the locked API surface never declares** — the task-level CTA matrix adds `Delete` for invalid jobs and `Duplicate` for ready jobs ([plan lines 626-633](E:/writing-system/docs/plans/2026-04-01-index-builder-redesign-implementation-plan.md#L626)), but the locked platform API surface only modifies source-set reads and otherwise reuses create/update/job/upload routes as-is ([plan lines 129-154](E:/writing-system/docs/plans/2026-04-01-index-builder-redesign-implementation-plan.md#L129)). There is no delete or duplicate contract in the manifest, no supporting endpoint in the locked API section, and no corresponding inventory for implementing those actions. That leaves implementers with task instructions that exceed the declared surface area.

## Quality Findings

Not assessed. Per the evaluation contract, Phase 1 failed, so the plan should be corrected structurally before holistic quality review.

## Approval Recommendation

**Recommendation:** `Revise — Structural`

This revision fixed most of the problems from the prior draft: the frozen seam section exists, the file inventory now includes `pipelineService.ts`, and the large monolithic tasks were broken into much smaller units. The remaining blocker is substantive, not cosmetic: before implementation starts, the plan needs to reconcile the new page orchestration with the real `usePipelineSourceSet` seam and remove or formally declare the unsupported `Delete` / `Duplicate` actions.
