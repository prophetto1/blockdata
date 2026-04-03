# AGChain Workspace Scope Resume Checklist

Purpose: resume execution of the approved workspace-scope unblock plan from the current repo state without re-investigating the same ground.

Source plan: [2026-03-31-agchain-workspace-scope-and-phase1-unblock-plan.md](/E:/writing-system/docs/plans/2026-03-31-agchain-workspace-scope-and-phase1-unblock-plan.md)

## Current Cutoff Point

Implementation appears to have reached:

- Task 1: migration files written, but local reset and backfill verification still blocked by missing Docker Desktop
- Task 2: dataset auth hardening landed
- Task 3: workspace routes and project-backed benchmark auth landed
- Task 4: durable operations substrate landed
- Task 5: not started in substance
- Task 6: not started in substance
- Task 7: not started in substance

The practical state is: backend Phase A mostly exists, but the repo has not yet crossed into the frontend workspace migration and has not completed the final re-lock and handoff work.

## What Is Already Reusable

Backend foundation already present:

- `services/platform-api/app/api/routes/agchain_workspaces.py`
- `services/platform-api/app/domain/agchain/workspace_registry.py`
- `services/platform-api/app/domain/agchain/project_access.py`
- `services/platform-api/app/api/routes/agchain_operations.py`
- `services/platform-api/app/domain/agchain/operation_queue.py`
- `services/platform-api/app/workers/agchain_operations.py`
- `supabase/migrations/20260331213000_agchain_workspace_scope_alignment.sql`
- `supabase/migrations/20260331220000_agchain_operations_prereqs.sql`

Backend verification already green:

- `cd services/platform-api && pytest -q tests/test_agchain_datasets.py tests/test_agchain_workspaces.py tests/test_agchain_benchmarks.py tests/test_agchain_operations.py`

Frontend reuse points already present:

- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.tsx`
- `web/src/hooks/agchain/useAgchainProjectFocus.ts`
- `web/src/lib/agchainProjectFocus.ts`
- `web/src/router.tsx`

These files are not correct for the new scope model yet, but they are the actual seams to continue from.

## Remaining Phase A Cleanup Before Further Work

These should be closed before claiming the unblock tranche is complete:

1. Verify Task 1 migrations and backfill locally once Docker is available.
   - Run `cd supabase && npx supabase db reset`
   - Confirm the backfill invariants from the approved plan

2. Fix `create_project()` so seeded project creation is atomic.
   - Current implementation in `services/platform-api/app/domain/agchain/workspace_registry.py` performs sequential inserts into:
     - `public.user_projects`
     - `public.agchain_project_memberships`
     - `public.agchain_benchmarks`
     - `public.agchain_benchmark_versions`
   - Resume by moving this into one transactional path or one database-side RPC that preserves the locked contract

3. Tighten observability attributes to the approved contract.
   - Remove raw `agchain.project_id`, `agchain.dataset_id`, and similar raw identifiers from span/log attributes where the plan only allows presence booleans and role/result-style fields
   - Primary files:
     - `services/platform-api/app/api/routes/agchain_datasets.py`
     - `services/platform-api/app/domain/agchain/project_access.py`

## Restart Sequence

### Step 0: Re-establish the exact checkpoint

- Re-read the approved plan sections for Tasks 5, 6, and 7
- Re-run the backend Phase A tests to confirm the repo still matches the last known passing state
- Do not start frontend edits until the current branch state is stable and understood

### Step 1: Finish the remaining Phase A deviations

- Land the `create_project()` transaction fix
- Clean up observability attribute drift
- Run:
  - `cd services/platform-api && pytest -q tests/test_agchain_workspaces.py tests/test_agchain_datasets.py tests/test_agchain_benchmarks.py tests/test_agchain_operations.py`
- If Docker is available, run:
  - `cd supabase && npx supabase db reset`

Exit condition:

- Backend unblock tranche matches the approved contract, not just the broad architecture

### Step 2: Start Task 5 from the existing shell seams

Work from these current files:

- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.tsx`
- `web/src/hooks/agchain/useAgchainProjectFocus.ts`
- `web/src/lib/agchainProjectFocus.ts`
- `web/src/router.tsx`

Main changes:

- add `web/src/lib/agchainWorkspaces.ts`
- add `web/src/hooks/agchain/useAgchainWorkspaceContext.ts`
- migrate project focus from benchmark-backed registry rows to explicit workspace project rows
- preserve compatibility redirects from `/app/agchain/benchmarks/:benchmarkId`
- keep the secondary benchmark rail only as the benchmark-definition child seam, not as project authority

Tests to update or add:

- `web/src/hooks/agchain/useAgchainProjectFocus.test.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.test.tsx`
- any new workspace-context tests required by the approved plan

Exit condition:

- the shell can select organization and project explicitly
- project focus storage no longer treats `benchmark_slug` as the authoritative workspace identifier

### Step 3: Execute Task 6 against the already existing page surfaces

Primary files:

- `web/src/pages/agchain/AgchainProjectsPage.tsx`
- `web/src/pages/agchain/AgchainSettingsPage.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.tsx`
- `web/src/pages/agchain/AgchainOverviewPage.tsx`
- `web/src/pages/agchain/AgchainSectionPage.tsx`
- `web/src/lib/agchainBenchmarks.ts`
- `web/src/components/agchain/AgchainBenchmarkNav.tsx`

Main changes:

- switch the projects page from benchmark list semantics to `GET /agchain/projects`
- keep seeded benchmark creation as a transitional CTA, not the workspace authority
- rewrite settings copy into explicit `Project`, `Organization`, and `Personal` scope partitions
- rewrite benchmark-definition copy so benchmark is presented as a child resource under project
- remove remaining “benchmark row owns the project” copy across overview and placeholder pages

Tests to update:

- `web/src/pages/agchain/AgchainProjectsPage.test.tsx`
- `web/src/pages/agchain/AgchainSettingsPage.test.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.test.tsx`
- `web/src/pages/agchain/AgchainOverviewPage.test.tsx`
- `web/src/pages/agchain/AgchainProjectScopedPlaceholderPages.test.tsx`
- any tests that still assert benchmark-backed project registry behavior

Exit condition:

- the visible shell and page copy match `organization -> project -> child resource`
- benchmark remains a real child resource and compatibility route, not the parent workspace

### Step 4: Execute Task 7 and re-lock continuation

- Amend `docs/plans/2026-03-31-agchain-inspect-phase1-datasets-and-eval-surfaces-plan.md`
- Add the short note that auth hardening and operations prerequisites must land before any further Task 5 async dataset work
- Re-run the locked backend tests
- Verify one migrated benchmark-backed entry is still reachable through:
  - `GET /agchain/projects`
  - project-scoped benchmark list
  - benchmark-definition child route under the migrated shell

Exit condition:

- both plans agree on the corrected prerequisite order
- the repo has a documented and verified continuation path into the next Phase 1 work

## Files That Still Encode Old Benchmark-Backed Project Authority

These are the first places to revisit when restarting Phase B:

- `web/src/hooks/agchain/useAgchainProjectFocus.ts`
- `web/src/lib/agchainProjectFocus.ts`
- `web/src/lib/agchainBenchmarks.ts`
- `web/src/pages/agchain/AgchainProjectsPage.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.tsx`
- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/router.tsx`

## Recommended Restart Order

1. Reconfirm the current backend checkpoint with tests.
2. Close the remaining Phase A deviations.
3. Implement Task 5 from the existing shell and focus seams.
4. Implement Task 6 across projects, settings, benchmark-definition, and overview copy.
5. Finish Task 7 and re-lock the amended continuation path.

## Implementation Readiness

The restart point is now clear enough to lead implementation without re-planning from scratch.

The main discipline point is this:

- do not treat Phase B as a greenfield rewrite
- continue from the current shell, switcher, router, and benchmark compatibility seams
- but do not resume deeper Phase 1 continuation work until the remaining Phase A contract deviations are closed
