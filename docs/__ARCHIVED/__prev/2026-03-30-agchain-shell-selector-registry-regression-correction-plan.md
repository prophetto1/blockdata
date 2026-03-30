# AGChain Shell, Selector, and Registry Regression Correction Implementation Plan

**Goal:** Correct the AGChain shell regressions introduced during the overview-first rollout by restoring shared resizable rail behavior, aligning the project selector and project registry with the existing BlockData platform patterns, fixing cross-surface project-focus synchronization, and normalizing the project-registry table so it no longer duplicates project values or requires refreshes to reflect newly created projects.

**Architecture:** Keep AGChain on the existing benchmark-backed runtime seam and reuse the existing authenticated `GET /agchain/benchmarks` and `POST /agchain/benchmarks` platform API contracts without backend changes. Restore AGChain to the shared shell behavior already used elsewhere in the app: resizable persisted left rail, shared selector UI contract, query-param-driven create dialog pattern, and explicit cross-instance focus/list synchronization. Keep `/app/agchain/projects` as the AGChain registry route, but stop using AGChain-only sheet/stacked-cell composition where BlockData already has better platform patterns.

**Tech Stack:** React + TypeScript, React Router, existing shell layout primitives, existing `Dialog` primitives, existing AGChain benchmark platform API routes, Vitest.

**Status:** Draft
**Author:** Codex for jwchu
**Date:** 2026-03-30

## Source Documents

Primary intent and current product-direction inputs:

- `docs/plans/2026-03-30-agchain-overview-first-project-shell-replacement-plan.md`
- `docs/plans/2026-03-30-agchain-project-selector-and-registry-platform-alignment-plan.md`
- `docs/plans/2026-03-28-agchain-evaluation-workspace-direction.md`
- `docs/plans/2026-03-28-agchain-braintrust-surface-capture-and-design-contract-plan.md`

Current implementation seams reviewed:

- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/layout/AdminShellLayout.tsx`
- `web/src/components/shell/ProjectSwitcher.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.tsx`
- `web/src/hooks/useProjectFocus.ts`
- `web/src/hooks/agchain/useAgchainProjectFocus.ts`
- `web/src/pages/Projects.tsx`
- `web/src/pages/agchain/AgchainProjectsPage.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarksTable.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarksToolbar.tsx`

Reference UX inputs reviewed:

- Braintrust project-overview capture already used for the overview-first shell work
- Braintrust scorers table capture shared in-thread on 2026-03-30, showing the intended table-first project-scoped surface shape

## Current-State Assessment

### What is wrong right now

The current AGChain shell is diverging from both the shared BlockData platform shell and the Braintrust-style reference in five concrete ways:

1. `AgchainShellLayout.tsx` no longer uses the resizable persisted left-rail behavior. It hardcodes `224px` widths for Rail 1 and Rail 2, so the draggable rail behavior that previously existed in AGChain is gone.
2. `useAgchainProjectFocus.ts` is not a shared focus store. Each hook instance owns its own local `items` and `focusedProjectSlug`, which means the top-bar selector, overview page, and registry page can disagree with each other.
3. Creating a project from `/app/agchain/projects` updates the local registry page hook, but it does not notify the selector/focus seam. That is why a newly created project may not appear in the selector or become the visible focused project until a refresh.
4. `AgchainProjectSwitcher.tsx` is still a bespoke AGChain implementation rather than a thin wrapper over a shared selector contract. The trigger width shifts with the label and the footer CTA semantics drift from BlockData.
5. `AgchainBenchmarksTable.tsx` collapses project name, slug, and description into one stacked cell. When those values are short or similar, the same visible text appears multiple times. The table needs explicit columns for project name, project slug, and description rather than vertical repetition.

### Why this feels so different from Braintrust

Braintrust is using a stable project-scoped shell with real table-first surfaces. The current AGChain shell is doing too much shell reinterpretation while too many exposed level-1 surfaces still remain placeholders. That makes AGChain feel like a renamed shell first and a real product second.

This plan does not attempt to implement real `Datasets`, `Prompts`, `Scorers`, `Parameters`, or `Tools` surfaces. It corrects the shell mechanics and registry/selector flow so AGChain stops feeling broken while those real surfaces are planned and implemented.

### Why this feels so different from BlockData

BlockData already has a proven pattern for:

- resizable persisted rail width,
- shared selector dropdown behavior,
- query-param-driven create flow,
- cross-instance focus/list synchronization.

AGChain diverged by cloning only parts of those patterns instead of reusing the actual platform contracts.

## Manifest

### Platform API

No platform API contract changes.

#### Existing platform API endpoints reused as-is

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/agchain/benchmarks` | Populate AGChain project selector and AGChain project registry | Existing - reused as-is |
| POST | `/agchain/benchmarks` | Create a new AGChain project/evaluation backed by the benchmark identity seam | Existing - reused as-is |

Justification:

- the reported bugs are shell-state, selector, and registry composition failures,
- the existing create/list routes already support the required runtime actions,
- the missing behavior is frontend synchronization and UI-contract reuse, not backend capability.

### Observability

No new observability work.

Justification:

- this batch does not create a new backend-owned runtime seam,
- the broken behavior is entirely inside the current frontend shell and selector composition.

### Database Migrations

No database migrations.

### Edge Functions

No edge function changes.

### Frontend Surface Area

**New shared libraries/services:** `1`

| File | Purpose |
|------|---------|
| `web/src/lib/agchainProjectFocus.ts` | Shared storage/event contract for AGChain project focus and AGChain project-list invalidation |

**New shared components:** `1`

| Component | File | Used by |
|-----------|------|---------|
| `ProjectFocusSelectorPopover` | `web/src/components/shell/ProjectFocusSelectorPopover.tsx` | `ProjectSwitcher.tsx`, `AgchainProjectSwitcher.tsx` |

**New AGChain-specific components:** `1`

| Component | File | Used by |
|-----------|------|---------|
| `AgchainProjectCreateDialog` | `web/src/components/agchain/AgchainProjectCreateDialog.tsx` | `AgchainProjectsPage.tsx` |

**Modified existing pages:** `1`

| Page | File | What changes |
|------|------|--------------|
| `AgchainProjectsPage` | `web/src/pages/agchain/AgchainProjectsPage.tsx` | Owns one registry header, query-param create dialog entry, create/focus notification handoff, and deduplicated explicit-column registry rendering |

**Modified existing components/layout:** `6`

| File | What changes |
|------|--------------|
| `web/src/components/layout/AgchainShellLayout.tsx` | Restore resizable persisted left-rail behavior while keeping current AGChain routes and conditional Rail 2 |
| `web/src/components/shell/ProjectSwitcher.tsx` | Refactor into a thin BlockData wrapper over the shared selector component |
| `web/src/components/agchain/AgchainProjectSwitcher.tsx` | Refactor into a thin AGChain wrapper over the shared selector component |
| `web/src/components/shell/TopCommandBar.css` | Lock shared selector trigger width and truncation behavior |
| `web/src/components/agchain/benchmarks/AgchainBenchmarksTable.tsx` | Replace stacked repeated-value cell with separate name, slug, and description columns |
| `web/src/components/agchain/benchmarks/AgchainBenchmarksToolbar.tsx` | Remove runtime ownership; AGChain registry stops depending on the bespoke duplicate-header + sheet flow |

**Modified existing hooks/services:** `1`

| File | What changes |
|------|--------------|
| `web/src/hooks/agchain/useAgchainProjectFocus.ts` | Convert AGChain focus into a shared storage/event-driven hook so multiple instances stay synchronized and list changes propagate |

**Modified router/support files:** `0`

**New test modules:** `2`

| File | Purpose |
|------|---------|
| `web/src/components/shell/ProjectFocusSelectorPopover.test.tsx` | Lock shared selector width, search, footer CTA, and list-row behavior |
| `web/src/lib/agchainProjectFocus.test.ts` | Lock AGChain focus/list event semantics at the shared helper layer |

**Modified existing test modules:** `5`

| File | What changes |
|------|--------------|
| `web/src/components/layout/AgchainShellLayout.test.tsx` | Restore assertions for resizable rail behavior and current AGChain shell offsets |
| `web/src/components/agchain/AgchainProjectSwitcher.test.tsx` | Update AGChain selector expectations to shared selector behavior and immediate post-create focus/list consistency |
| `web/src/hooks/agchain/useAgchainProjectFocus.test.tsx` | Add cross-instance sync and project-list invalidation coverage |
| `web/src/pages/agchain/AgchainProjectsPage.test.tsx` | Add `?new=1`, create-notification, and deduplicated table-column expectations |
| `web/src/components/shell/ProjectSwitcher.test.tsx` | Lock BlockData wrapper behavior over the shared selector component |

**Deleted obsolete runtime files:** `1`

- `web/src/components/agchain/benchmarks/AgchainBenchmarksToolbar.tsx`

## Pre-Implementation Contract

No major shell, selector, registry, or synchronization decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. **AGChain keeps the current overview-first route family in this batch.** This plan corrects shell and selector/regression behavior; it does not reopen the level-1 noun decision.
2. **AGChain must restore the resizable persisted left-rail behavior that already existed before the overview-first rewrite.** Fixed hardcoded left-rail widths are not acceptable.
3. **AGChain keeps its own benchmark-backed registry seam.** This batch does not repoint AGChain at BlockData's project table or `/app/projects/list`.
4. **Selector UI must become one shared selector contract used by both BlockData and AGChain.** AGChain may keep a wrapper, but not a bespoke selector implementation path.
5. **AGChain focus state must become cross-instance shared state.** The top bar, overview page, registry page, and future AGChain surfaces must not each own isolated local focus copies.
6. **Creating a new AGChain project must immediately invalidate and rebroadcast the AGChain project list plus focused project slug.** Manual refresh must not be required.
7. **The AGChain selector trigger width must stay stable across label lengths.** Short names such as `ss` must not shrink the trigger.
8. **The AGChain selector footer CTA must become a create/manage affordance, not a dead-end registry link.** In this batch the destination is `/app/agchain/projects?new=1`.
9. **`/app/agchain/projects?new=1` must open a centered create dialog immediately.** The AGChain registry stops using the bespoke right-side `Sheet` creation flow.
10. **The AGChain registry table must render distinct columns for project name, project slug, and project description.** The same visible value must never be stacked three times in one cell.
11. **The AGChain registry page must have one primary header only.** Duplicate `Projects and evaluations` title stacks are removed.
12. **No backend, migration, or observability changes are allowed in this batch.**
13. **This batch corrects shell mechanics and selector/registry composition only.** It does not attempt to implement real `Datasets`, `Prompts`, `Scorers`, `Parameters`, or `Tools` product surfaces.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. AGChain left rail width is draggable again and persists across refresh.
2. The AGChain selector trigger keeps the same desktop width when switching between a short name and a long name.
3. The AGChain selector and BlockData selector both render through the same shared selector component.
4. Selecting a project in one AGChain surface updates the visible focused project in the top-bar selector and any other AGChain page using `useAgchainProjectFocus`.
5. Creating a project from `/app/agchain/projects` immediately makes that project available in the selector without manual refresh.
6. Creating a project from `/app/agchain/projects` immediately focuses that project and lands in `/app/agchain/overview?project=<slug>`.
7. Opening `/app/agchain/projects?new=1` shows the create dialog immediately.
8. The AGChain registry table contains separate visible columns for `Project`, `Slug`, and `Description`.
9. A short project like `ss` appears once in the `Project` column, once in `Slug` only if distinct, and once in `Description` only if actually distinct.
10. The AGChain registry page no longer renders a duplicate second page title block.
11. Existing BlockData project switching still works after the shared selector extraction.
12. No backend files, migrations, or platform API routes change.

### Locked Platform API Surface

#### New platform API endpoints: `0`

#### Existing platform API endpoints modified: `0`

#### Existing platform API endpoints reused as-is: `2`

1. `GET /agchain/benchmarks`
2. `POST /agchain/benchmarks`

### Locked Observability Surface

#### New traces: `0`

#### New metrics: `0`

#### New structured logs: `0`

### Locked Inventory Counts

#### Frontend runtime

- New shared libraries/services: `1`
- New shared components: `1`
- New AGChain-specific components: `1`
- Modified existing pages: `1`
- Modified existing components/layout: `6`
- Modified existing hooks/services: `1`
- Modified router/support files: `0`
- Deleted obsolete runtime files: `1`

#### Tests

- New test modules: `2`
- Modified existing test modules: `5`

#### Backend/runtime

- Modified platform-api files: `0`
- Modified migrations: `0`
- Modified edge-function files: `0`

### Locked File Inventory

#### New files

- `web/src/lib/agchainProjectFocus.ts`
- `web/src/lib/agchainProjectFocus.test.ts`
- `web/src/components/shell/ProjectFocusSelectorPopover.tsx`
- `web/src/components/shell/ProjectFocusSelectorPopover.test.tsx`
- `web/src/components/agchain/AgchainProjectCreateDialog.tsx`

#### Modified existing files

- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/layout/AgchainShellLayout.test.tsx`
- `web/src/components/shell/ProjectSwitcher.tsx`
- `web/src/components/shell/ProjectSwitcher.test.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.test.tsx`
- `web/src/components/shell/TopCommandBar.css`
- `web/src/hooks/agchain/useAgchainProjectFocus.ts`
- `web/src/hooks/agchain/useAgchainProjectFocus.test.tsx`
- `web/src/pages/agchain/AgchainProjectsPage.tsx`
- `web/src/pages/agchain/AgchainProjectsPage.test.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarksTable.tsx`

#### Deleted files

- `web/src/components/agchain/benchmarks/AgchainBenchmarksToolbar.tsx`

#### Not modified

- `services/platform-api/**`
- `supabase/migrations/**`
- `supabase/functions/**`
- `web/src/router.tsx`
- `web/src/pages/agchain/AgchainOverviewPage.tsx`
- `web/src/components/agchain/AgchainLeftNav.tsx`

## Frozen Shell and Selector Contract

### Shared AGChain shell contract

- AGChain left rail uses the same persisted resize pattern as the existing shared shell, with its own AGChain storage key.
- Rail 2 still appears only on `/app/agchain/settings/project/benchmark-definition`.
- Restoring resize behavior must not change the current AGChain route ownership.

### Shared selector contract

- The selector trigger is a fixed desktop width with truncation.
- The selector owns the trigger, search field, row list shell, footer CTA region, and chevron placement.
- BlockData and AGChain use different data adapters, but one selector UI contract.

### AGChain focus-sync contract

- `useAgchainProjectFocus` broadcasts focus changes and project-list invalidations across hook instances.
- The shared AGChain focus helper owns:
  - storage key,
  - focus-changed event name,
  - project-list-changed event name.
- Creating a project must:
  - store the new focused slug,
  - broadcast project-list-changed,
  - let all mounted AGChain surfaces reload or reconcile without manual refresh.

### AGChain registry contract

- `/app/agchain/projects` remains the multi-project registry route.
- `/app/agchain/projects?new=1` opens the create dialog immediately.
- The page renders one header only.
- The create flow uses the same centered dialog pattern used on `Projects.tsx`.
- The table contains explicit columns for:
  - `Project`
  - `Slug`
  - `Description`
  - `State`
  - `Current Spec`
  - `Steps`
  - `Selected Eval Models`
  - `Tested Models`
  - `Validation`
  - `Activity`
  - `Action`

## Explicit Risks Accepted In This Plan

1. **This batch touches shared shell/selector code.** Even though the request is AGChain-driven, the correct fix path reuses platform patterns and therefore requires BlockData regression coverage.
2. **AGChain still uses benchmark-backed project identity underneath.** This plan fixes shell and display behavior, not the deeper benchmark/project semantic model.
3. **Visible placeholder level-1 pages remain a separate problem.** This correction makes AGChain stop feeling mechanically broken, but it does not turn the placeholder `Datasets` / `Prompts` / `Scorers` / `Parameters` / `Tools` routes into real product pages.

## Completion Criteria

The work is complete only when all of the following are true:

1. AGChain shell resize behavior is restored.
2. AGChain selector and BlockData selector both use the shared selector contract.
3. AGChain project creation updates selector contents and focused project immediately without refresh.
4. AGChain registry creation uses `?new=1` + centered dialog instead of the bespoke sheet.
5. AGChain registry no longer duplicates project values vertically in one cell.
6. AGChain table columns explicitly separate project name, slug, and description.
7. Existing overview-first routing still works after the shell correction.
8. Existing BlockData selector behavior still works after the shared selector extraction.
9. Locked inventory counts match the actual changed file set.
10. No backend/runtime seams change.

## Task 1: Lock the failing regression tests for shell resize, focus sync, and registry composition

**File(s):**

- `web/src/components/layout/AgchainShellLayout.test.tsx`
- `web/src/hooks/agchain/useAgchainProjectFocus.test.tsx`
- `web/src/pages/agchain/AgchainProjectsPage.test.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.test.tsx`

**Step 1:** Add failing tests proving the AGChain shell still needs persisted draggable rail behavior.
**Step 2:** Add failing tests proving two `useAgchainProjectFocus` consumers do not currently stay synchronized across focus/list changes.
**Step 3:** Add failing tests proving `/app/agchain/projects?new=1` must open create UI immediately and that create must update selector-visible project state without refresh.
**Step 4:** Add failing tests proving the registry table renders separate `Project`, `Slug`, and `Description` columns rather than stacked duplicate values.

**Test command:** `cd web && npx vitest run src/components/layout/AgchainShellLayout.test.tsx src/hooks/agchain/useAgchainProjectFocus.test.tsx src/pages/agchain/AgchainProjectsPage.test.tsx src/components/agchain/AgchainProjectSwitcher.test.tsx --reporter=verbose`

**Expected output:** New regression tests fail for the current implementation and describe the exact broken seams.

**Commit:** `test: lock agchain shell and selector regression coverage`

## Task 2: Restore shared AGChain shell behavior and extract the shared selector UI contract

**File(s):**

- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/layout/AgchainShellLayout.test.tsx`
- `web/src/components/shell/ProjectFocusSelectorPopover.tsx`
- `web/src/components/shell/ProjectFocusSelectorPopover.test.tsx`
- `web/src/components/shell/ProjectSwitcher.tsx`
- `web/src/components/shell/ProjectSwitcher.test.tsx`
- `web/src/components/shell/TopCommandBar.css`

**Step 1:** Restore AGChain left-rail resize state, persisted width, and drag handle behavior while preserving current conditional Rail 2 logic.
**Step 2:** Extract the shared selector popover UI contract from `ProjectSwitcher.tsx`.
**Step 3:** Refactor `ProjectSwitcher.tsx` into a thin BlockData-specific wrapper over that shared selector component.
**Step 4:** Lock the shared fixed-width trigger and truncation behavior in CSS/tests.

**Test command:** `cd web && npx vitest run src/components/layout/AgchainShellLayout.test.tsx src/components/shell/ProjectFocusSelectorPopover.test.tsx src/components/shell/ProjectSwitcher.test.tsx --reporter=verbose`

**Expected output:** AGChain shell resize tests pass and BlockData selector behavior remains green under the shared selector component.

**Commit:** `refactor: restore agchain shared shell behavior`

## Task 3: Convert AGChain project focus into a shared synchronized seam

**File(s):**

- `web/src/lib/agchainProjectFocus.ts`
- `web/src/lib/agchainProjectFocus.test.ts`
- `web/src/hooks/agchain/useAgchainProjectFocus.ts`
- `web/src/hooks/agchain/useAgchainProjectFocus.test.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.test.tsx`

**Step 1:** Add the shared AGChain storage/event helper modeled on the proven BlockData project-focus helper.
**Step 2:** Refactor `useAgchainProjectFocus.ts` so multiple hook instances stay synchronized across focus changes and project-list invalidations.
**Step 3:** Refactor `AgchainProjectSwitcher.tsx` into an AGChain-specific wrapper over the shared selector component.
**Step 4:** Ensure the AGChain wrapper keeps the last known focused slug visible during refresh while still converging to the resolved project name after reload.

**Test command:** `cd web && npx vitest run src/lib/agchainProjectFocus.test.ts src/hooks/agchain/useAgchainProjectFocus.test.tsx src/components/agchain/AgchainProjectSwitcher.test.tsx --reporter=verbose`

**Expected output:** AGChain selector state stays synchronized across mounted consumers and no longer needs page refresh to reflect new or newly focused projects.

**Commit:** `fix: share agchain project focus state`

## Task 4: Rebuild the AGChain registry page and creation flow around platform patterns

**File(s):**

- `web/src/pages/agchain/AgchainProjectsPage.tsx`
- `web/src/pages/agchain/AgchainProjectsPage.test.tsx`
- `web/src/components/agchain/AgchainProjectCreateDialog.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarksTable.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarksToolbar.tsx`

**Step 1:** Remove the duplicate AGChain registry toolbar ownership and make `AgchainProjectsPage.tsx` the single owner of the page header and create-entry pattern.
**Step 2:** Add the centered create dialog with query-param entry via `/app/agchain/projects?new=1`.
**Step 3:** On successful create, notify the AGChain project list/focus seam before navigating into the overview-first shell.
**Step 4:** Rebuild the table to use explicit `Project`, `Slug`, and `Description` columns and suppress duplicate display values.
**Step 5:** Delete the obsolete AGChain-only toolbar sheet file.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainProjectsPage.test.tsx src/components/agchain/AgchainProjectSwitcher.test.tsx --reporter=verbose`

**Expected output:** AGChain registry create flow opens from query param, new projects appear immediately in selector state, and the table no longer stacks repeated values.

**Commit:** `refactor: align agchain registry with platform patterns`

## Task 5: Run the final AGChain + BlockData regression sweep

**File(s):**

- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/shell/ProjectSwitcher.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.tsx`
- `web/src/pages/agchain/AgchainProjectsPage.tsx`
- `web/src/hooks/agchain/useAgchainProjectFocus.ts`

**Step 1:** Run the targeted Vitest sweep covering shell layout, shared selector, AGChain selector, AGChain focus sync, and AGChain registry behavior.
**Step 2:** Run `npm run build` to catch any shared-shell or selector compile regressions.
**Step 3:** In an authenticated browser session, verify:
- rail resize works on `/app/agchain/overview`
- selector width stays stable while switching projects
- `/app/agchain/projects?new=1` opens the create dialog immediately
- creating a project updates the selector without refresh
- the registry table shows distinct `Project`, `Slug`, and `Description` columns

**Test command:** `cd web && npx vitest run src/components/layout/AgchainShellLayout.test.tsx src/components/shell/ProjectFocusSelectorPopover.test.tsx src/components/shell/ProjectSwitcher.test.tsx src/lib/agchainProjectFocus.test.ts src/hooks/agchain/useAgchainProjectFocus.test.tsx src/components/agchain/AgchainProjectSwitcher.test.tsx src/pages/agchain/AgchainProjectsPage.test.tsx --reporter=verbose && npm run build`

**Expected output:** All targeted tests pass, build succeeds, and authenticated browser verification confirms the shell/selector/registry regressions are gone.

**Commit:** `fix: correct agchain shell selector and registry regressions`
