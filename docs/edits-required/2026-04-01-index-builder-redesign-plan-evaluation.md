## Plan Reviewed

- `docs/plans/2026-04-01-index-builder-redesign-implementation-plan.md`
- Summary: a frontend-heavy redesign of the Index Builder that replaces the current mock/workbench page with a real two-pane list/detail surface backed by the existing pipeline source-set and pipeline job APIs, plus a small backend serialization change for timestamps.

## Structural Verdict

**Structurally Incomplete**

### Structural Deficiencies

1. **Required `Locked Platform API Surface` section is missing** — this plan changes multiple existing API contracts, but it never freezes that surface in its own higher-rigor section. The document moves from `### Frontend Surface Area` at line 74 to `## Locked Product Decisions` at line 128 without a `## Locked Platform API Surface` section. That matters here because the manifest explicitly modifies both `GET /{pipeline_kind}/source-sets` and `GET /{pipeline_kind}/source-sets/{source_set_id}`.

2. **Required `Frozen Seam Contract` section is missing for a compatibility-sensitive migration** — this is not a greenfield page. The current [`web/src/pages/IndexBuilderPage.tsx`](E:/writing-system/web/src/pages/IndexBuilderPage.tsx) still imports `PipelineRunsTable`, `PipelineRunDetailPanel`, `PipelineNewRunForm`, and `MOCK_RUNS_FULL`, and [`web/src/pages/useIndexBuilderWorkbench.tsx`](E:/writing-system/web/src/pages/useIndexBuilderWorkbench.tsx) still composes `usePipelineSourceSet`, `usePipelineJob`, and the existing pipeline workbench panels. Because the plan is intentionally replacing that seam while leaving old files in the repo, it needs a frozen-seam section that states exactly what compatibility must hold and what legacy pieces may remain untouched.

3. **Locked inventory counts and file inventory contradict Task 2** — the frontend inventory says `Modified existing types: 1` and only lists `web/src/lib/pipelineSourceSetService.ts` in the modified file set (plan lines 120-124 and 156-193), but Task 2 also instructs an edit to `web/src/lib/pipelineService.ts` to add `started_at` to `PipelineJobSummary` (lines 267-275). The Task 2 `File(s)` list omits that file as well. As written, completion criterion 2 cannot be satisfied because the plan's locked inventory does not match its own implementation steps.

4. **The task breakdown is too coarse for the plan contract** — Task 3 bundles hook architecture, list loading, selection hydration, save orchestration, run orchestration, uploads, downloads, and return-shape design into one task. Task 10 rewrites the entire page shell, and Task 11 rewrites the entire page test module. Those are not 2-5 minute bite-sized implementation steps, which means the plan is still too loose at the point where it is supposed to become executable.

## Quality Findings

Not assessed. Per the evaluation contract, Phase 1 failed, so architecture quality should be reviewed only after the structural gaps above are fixed.

## Approval Recommendation

**Recommendation:** `Revise — Structural`

The overall direction looks bounded and reasonably aligned with the existing `pipeline_source_sets` and `pipeline_jobs` seams, but the plan is not ready to hand to an implementer yet. Add the missing higher-rigor sections, reconcile the locked inventory with the actual file edits, and split the large orchestration tasks into smaller verifiable steps before re-evaluation.
