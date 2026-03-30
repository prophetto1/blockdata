# AGChain Shell, Selector, and Registry Regression Correction v2 Implementation Plan

**Goal:** Correct the AGChain shell regressions introduced during the overview-first rollout by restoring persisted left-rail resize behavior, aligning the selector and registry with existing BlockData platform patterns, synchronizing AGChain focus/list state across mounted consumers, moving the AGChain project selector into the left rail above the project-scoped menu, and normalizing the registry create/table composition so newly created projects appear immediately without refresh.

**Architecture:** Keep AGChain on the existing benchmark-backed runtime seam and reuse the existing authenticated `GET /agchain/benchmarks` and `POST /agchain/benchmarks` platform API contracts without backend changes. For this batch, restore the proven persisted-width/open-state rail behavior by reusing the existing pattern already implemented inside `AppLayout.tsx` as a read-only reference while keeping AGChain ownership in `AgchainShellLayout.tsx`; do not refactor `AppLayout.tsx` in this batch. Extract one shared selector popover contract used by both BlockData and AGChain, move the AGChain selector from the top command bar into the AGChain left rail through a generic `LeftRailShadcn` header-content slot, convert AGChain focus/list propagation into an explicit shared helper seam, and rebuild `/app/agchain/projects` around one header, query-param-driven centered creation dialog, and explicit registry columns instead of bespoke sheet/stacked-cell composition.

**Tech Stack:** React + TypeScript, React Router, existing shell layout primitives, existing `Dialog` primitives, existing AGChain benchmark platform API routes, Vitest.

**Status:** Draft v2
**Author:** Codex for jwchu
**Date:** 2026-03-30

## Source Documents

Primary intent and prior plan inputs:

- `docs/plans/2026-03-30-agchain-shell-selector-registry-regression-correction-plan.md`
- `docs/plans/2026-03-30-agchain-left-rail-project-selector-relocation-implementation-plan.md`
- `docs/plans/2026-03-30-agchain-overview-first-project-shell-replacement-plan.md`
- `docs/plans/2026-03-30-agchain-project-selector-and-registry-platform-alignment-plan.md`
- `docs/plans/2026-03-28-agchain-evaluation-workspace-direction.md`
- `docs/plans/2026-03-28-agchain-braintrust-surface-capture-and-design-contract-plan.md`

Current implementation seams reviewed:

- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/layout/AppLayout.tsx`
- `web/src/components/shell/LeftRailShadcn.tsx`
- `web/src/components/shell/ProjectSwitcher.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.tsx`
- `web/src/hooks/agchain/useAgchainProjectFocus.ts`
- `web/src/pages/agchain/AgchainProjectsPage.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarksTable.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarksToolbar.tsx`

Reference UX inputs reviewed:

- Braintrust project-overview capture already used for the overview-first shell work
- Braintrust scorers table capture shared in-thread on 2026-03-30, showing the intended table-first project-scoped surface shape
- In-thread AGChain screenshots from 2026-03-30 showing the current top-bar selector placement and duplicated registry rows

## Revision Basis

This v2 specifically addresses the verified structural findings from the pre-implementation evaluation of v1:

1. The toolbar file disposition is now explicit and non-contradictory: `AgchainBenchmarksToolbar.tsx` is deleted in this batch and is no longer listed as modified.
2. The resize-seam ownership is now explicit: `AppLayout.tsx` is a read-only reference for the existing persisted rail-width/open-state pattern, and `AgchainShellLayout.tsx` remains the only AGChain runtime owner in this batch.
3. The shared selector contract is now explicit: the new `ProjectFocusSelectorPopover.tsx` component has a locked adapter surface, and AGChain left-rail placement is integrated into the same v2 scope rather than split across a second plan.

## Current-State Assessment

### What is wrong right now

The current AGChain shell is diverging from both the shared BlockData platform shell and the Braintrust-style reference in six concrete ways:

1. `AgchainShellLayout.tsx` no longer uses persisted resizable left-rail behavior. It hardcodes `224px` widths for Rail 1 and Rail 2, so the draggable width behavior that exists in the main platform shell is gone.
2. `useAgchainProjectFocus.ts` is not a shared focus store. Each hook instance owns its own local `items` and `focusedProjectSlug`, so the selector, overview page, and registry page can disagree.
3. Creating a project from `/app/agchain/projects` updates the local registry page hook, but it does not notify the selector/focus seam. A newly created project may not appear in the selector or become the visible focused project until refresh.
4. `AgchainProjectSwitcher.tsx` is still a bespoke AGChain selector implementation rather than a thin wrapper over a shared selector contract. Trigger width shifts with the label and footer CTA semantics drift from BlockData.
5. `AgchainBenchmarksTable.tsx` collapses project name, slug, and description into one stacked cell. When those values are short or similar, the same visible text appears multiple times.
6. The AGChain project selector is still rendered in the top command bar instead of the left rail. That weakens the visual hierarchy that should make the focused project read as the independent variable for `Overview`, `Datasets`, `Prompts`, `Scorers`, `Parameters`, `Tools`, `Observability`, and `Settings`.

### Why this feels so different from Braintrust

Braintrust uses a stable project-scoped shell with a persistent left navigation model and table-first surfaces. The current AGChain shell is doing too much shell reinterpretation while too many exposed level-1 surfaces remain placeholders. That makes AGChain feel like a renamed shell first and a real project-scoped workspace second.

This batch does not attempt to implement real `Datasets`, `Prompts`, `Scorers`, `Parameters`, or `Tools` surfaces. It corrects shell mechanics, selector placement, focus synchronization, and registry composition so AGChain stops feeling mechanically broken while those deeper surfaces remain separate work.

### Why this feels so different from BlockData

BlockData already has a proven pattern for:

- persisted left-rail width/open-state behavior,
- shared selector dropdown semantics,
- query-param-driven create entry,
- cross-instance focus/list synchronization.

AGChain diverged by cloning only parts of those patterns instead of reusing the actual platform contracts.

## Manifest

### Platform API

No platform API changes.

Existing platform API endpoints reused as-is:

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/agchain/benchmarks` | Populate AGChain selector rows, hydrate focused-project resolution, and refresh the AGChain registry table | Existing - reused as-is |
| POST | `/agchain/benchmarks` | Create a new benchmark-backed AGChain project/evaluation row from the AGChain registry dialog | Existing - reused as-is |

Justification:

- this batch corrects frontend shell, selector, and registry behavior only,
- the currently broken seams are all browser-owned composition/state problems,
- the current benchmark-backed AGChain API surface is sufficient for list + create in this batch.

### Observability

No new observability work.

Justification:

- this batch does not create a new backend-owned runtime seam,
- the work is entirely inside existing frontend composition and local client synchronization,
- no new FastAPI, database, or edge-function path is introduced.

### Database Migrations

No database migrations.

### Edge Functions

No edge functions created or modified.

Existing edge functions remain out of scope because this implementation stays entirely in the web shell.

### Frontend Surface Area

**New shared libraries/services:** `1`

| File | Purpose |
|------|---------|
| `web/src/lib/agchainProjectFocus.ts` | Shared AGChain storage/event contract for focused-project slug and project-list invalidation |

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
| `AgchainProjectsPage` | `web/src/pages/agchain/AgchainProjectsPage.tsx` | Becomes the single owner of the page header, query-param create entry, centered create dialog, create/focus notification handoff, and deduplicated explicit-column registry rendering |

**Modified existing components/layout:** `6`

| File | What changes |
|------|--------------|
| `web/src/components/layout/AgchainShellLayout.tsx` | Restore persisted AGChain rail-width/open-state behavior, move the selector into the left rail, and preserve the current conditional benchmark Rail 2 |
| `web/src/components/shell/LeftRailShadcn.tsx` | Add one generic optional header-content slot rendered below `headerBrand` and above nav content when present |
| `web/src/components/shell/ProjectSwitcher.tsx` | Refactor into a thin BlockData wrapper over the shared selector component |
| `web/src/components/agchain/AgchainProjectSwitcher.tsx` | Refactor into a thin AGChain wrapper over the shared selector component, with AGChain-specific footer action and left-rail-compatible trigger styling |
| `web/src/components/shell/TopCommandBar.css` | Lock shared selector trigger width and truncation behavior used by the shared selector wrappers |
| `web/src/components/agchain/benchmarks/AgchainBenchmarksTable.tsx` | Replace the stacked repeated-value cell with explicit `Project`, `Slug`, and `Description` columns |

**Modified existing hooks/services:** `1`

| File | What changes |
|------|--------------|
| `web/src/hooks/agchain/useAgchainProjectFocus.ts` | Convert AGChain focus into a shared storage/event-driven hook so multiple mounted consumers stay synchronized and list invalidations propagate |

**Modified router/support files:** `0`

**New test modules:** `3`

| File | Purpose |
|------|---------|
| `web/src/components/shell/ProjectFocusSelectorPopover.test.tsx` | Locks shared selector trigger width, search, row semantics, and footer-action behavior |
| `web/src/components/shell/ProjectSwitcher.test.tsx` | Locks BlockData wrapper behavior over the shared selector component |
| `web/src/lib/agchainProjectFocus.test.ts` | Locks AGChain focus/list event semantics at the shared helper layer |

**Modified existing test modules:** `5`

| File | What changes |
|------|--------------|
| `web/src/components/layout/AgchainShellLayout.test.tsx` | Restore assertions for persisted AGChain rail behavior, left-rail selector placement, and current conditional Rail 2 offsets |
| `web/src/components/shell/LeftRailShadcn.test.tsx` | Lock generic header-content slot ordering and ensure nav content still renders correctly beneath it |
| `web/src/components/agchain/AgchainProjectSwitcher.test.tsx` | Update AGChain selector expectations to shared-selector behavior, left-rail placement contract, and immediate post-create focus/list consistency |
| `web/src/hooks/agchain/useAgchainProjectFocus.test.tsx` | Add cross-instance sync and project-list invalidation coverage |
| `web/src/pages/agchain/AgchainProjectsPage.test.tsx` | Add `?new=1`, create-notification, centered-dialog, and deduplicated explicit-column expectations |

**Deleted obsolete runtime files:** `1`

- `web/src/components/agchain/benchmarks/AgchainBenchmarksToolbar.tsx`

## Pre-Implementation Contract

No major shell, selector, registry, or synchronization decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. **AGChain keeps the current overview-first route family in this batch.** This plan corrects shell, selector, focus-sync, and registry regressions; it does not reopen the level-1 noun decision.
2. **AGChain must restore persisted resizable left-rail behavior.** Fixed hardcoded left-rail widths are not acceptable.
3. **The resize restoration is AGChain-owned in this batch.** `AppLayout.tsx` is a read-only reference for the existing persisted-width/open-state pattern; `AgchainShellLayout.tsx` is the only AGChain runtime owner to be modified.
4. **This batch does not refactor or extract a new generic rail-width helper from `AppLayout.tsx`.** Shared-shell extraction is out of scope here.
5. **AGChain keeps its own benchmark-backed registry seam.** This batch does not repoint AGChain at BlockData's project table or `/app/projects/list`.
6. **Selector UI becomes one shared selector contract used by both BlockData and AGChain.** BlockData and AGChain may keep thin wrappers, but not two separate selector implementation paths.
7. **AGChain focus state becomes cross-instance shared state.** The selector, overview page, registry page, and future AGChain surfaces must not each own isolated local focus copies.
8. **Creating a new AGChain project must immediately invalidate and rebroadcast the AGChain project list plus focused project slug.** Manual refresh must not be required.
9. **The AGChain selector moves into the left rail.** It renders directly below `BlockData Bench` and directly above the locked 8-item AGChain level-1 menu.
10. **The AGChain top command bar no longer shows the AGChain selector.** Header height, right-side controls, and hidden-search geometry remain unchanged in this batch.
11. **The selector trigger width must stay stable across label lengths.** Short names such as `ss` must not shrink the trigger.
12. **The AGChain selector footer CTA becomes a create/manage affordance.** In this batch the destination is `/app/agchain/projects?new=1`, not a passive registry link.
13. **`/app/agchain/projects?new=1` opens a centered create dialog immediately.** The AGChain registry stops using the bespoke right-side `Sheet` creation flow.
14. **The AGChain registry table renders distinct columns for project name, project slug, and project description.** The same visible value must never be stacked three times in one cell.
15. **The AGChain registry page has one primary header only.** Duplicate `Projects and evaluations` title stacks are removed.
16. **The hidden benchmark-definition second rail remains unchanged and appears only on `/app/agchain/settings/project/benchmark-definition`.**
17. **No backend, migration, or observability changes are allowed in this batch.**
18. **This batch corrects shell mechanics and selector/registry composition only.** It does not attempt to implement real `Datasets`, `Prompts`, `Scorers`, `Parameters`, or `Tools` product surfaces.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. On `/app/agchain/overview`, the AGChain left rail supports persisted open/compact state and persisted desktop width instead of fixed hardcoded width.
2. On `/app/agchain/overview`, the AGChain selector renders below `BlockData Bench` and above the AGChain menu starting with `Overview`.
3. On `/app/agchain/overview`, the AGChain top command bar no longer renders the AGChain selector.
4. Switching projects in the AGChain selector updates all mounted AGChain consumers without refresh.
5. `/app/agchain/projects?new=1` opens the centered create dialog immediately.
6. Successfully creating a project updates the selector contents and visible focused project immediately without refresh, then navigates into the overview-first shell.
7. The AGChain registry shows separate `Project`, `Slug`, and `Description` columns and no longer repeats the same visible value vertically in one cell.
8. Existing overview-first routing and the hidden benchmark second-rail route still work after the shell correction.
9. Existing BlockData selector behavior still works under the shared selector component.
10. Locked inventory counts match the actual changed file set and no backend/runtime seams change.

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

- New test modules: `3`
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
- `web/src/components/shell/ProjectSwitcher.test.tsx`
- `web/src/components/agchain/AgchainProjectCreateDialog.tsx`

#### Modified existing files

- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/layout/AgchainShellLayout.test.tsx`
- `web/src/components/shell/LeftRailShadcn.tsx`
- `web/src/components/shell/LeftRailShadcn.test.tsx`
- `web/src/components/shell/ProjectSwitcher.tsx`
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

- `web/src/components/layout/AppLayout.tsx`
- `web/src/hooks/useDraggable.ts`
- `web/src/router.tsx`
- `web/src/pages/agchain/AgchainOverviewPage.tsx`
- `web/src/components/agchain/AgchainLeftNav.tsx`
- `services/platform-api/**`
- `supabase/migrations/**`
- `supabase/functions/**`

## Frozen Shell and Selector Contract

### Shared AGChain shell contract

- AGChain left rail keeps the current overview-first route family and current conditional Rail 2 ownership.
- Rail 2 still appears only on `/app/agchain/settings/project/benchmark-definition`.
- Restoring resize behavior and moving the selector into the left rail must not change the current AGChain route family or the locked 8-item AGChain menu order.

### Resize restoration contract

- The resize/open-state pattern is copied from the existing `AppLayout.tsx` behavior, not invented from scratch.
- AGChain uses AGChain-owned local-storage keys for desktop nav open state and desktop rail width; it does not reuse the BlockData keys directly.
- `AppLayout.tsx` remains read-only in this batch.
- `useDraggable.ts` is not part of the rail-width restoration contract and remains untouched.

### Shared selector component contract

`ProjectFocusSelectorPopover.tsx` owns the shared dropdown shell used by both wrappers. Its contract in this batch is:

- a fixed-width trigger with truncation support,
- search input ownership,
- row-list shell ownership,
- loading/empty/error shell ownership,
- footer CTA region ownership,
- wrapper-provided data adapter fields for:
  - `items`,
  - selected item identifier,
  - trigger label,
  - search placeholder,
  - empty-state label,
  - footer CTA label,
  - footer navigation target or callback,
  - row-selection callback.

BlockData and AGChain wrappers may format their own row data, labels, and footer action, but they do not fork the shared popover markup or interaction model.

### AGChain left-rail selector placement contract

- `LeftRailShadcn.tsx` adds one generic optional header-content slot rendered below `headerBrand` and above nav content.
- `AgchainShellLayout.tsx` passes `AgchainProjectSwitcher` into that slot.
- AGChain does not introduce AGChain-specific branching inside `LeftRailShadcn` beyond that generic slot.
- The AGChain top command bar no longer passes `AgchainProjectSwitcher` as `primaryContext`.

### AGChain focus-sync contract

- `useAgchainProjectFocus` broadcasts focus changes and project-list invalidations across hook instances.
- The shared AGChain focus helper owns:
  - the AGChain focus storage key,
  - the focus-changed event name,
  - the project-list-changed event name.
- Creating a project must:
  - store the new focused slug,
  - broadcast project-list-changed,
  - let all mounted AGChain surfaces reload or reconcile without manual refresh.

### AGChain registry contract

- `/app/agchain/projects` remains the multi-project registry route.
- `/app/agchain/projects?new=1` opens the create dialog immediately.
- The page renders one header only.
- The create flow uses a centered dialog pattern rather than the bespoke right-side sheet.
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
3. **Visible placeholder level-1 pages remain a separate problem.** This correction makes AGChain stop feeling mechanically broken, but it does not turn placeholder `Datasets` / `Prompts` / `Scorers` / `Parameters` / `Tools` routes into real product pages.
4. **The AGChain top command bar will keep an empty left-side context region after the selector moves to the rail.** Header redesign remains out of scope in this batch.

## Completion Criteria

The work is complete only when all of the following are true:

1. AGChain shell persisted resize behavior is restored with AGChain-owned storage keys.
2. AGChain selector and BlockData selector both use the shared selector contract.
3. AGChain selector renders in the left rail rather than the AGChain top command bar.
4. AGChain project creation updates selector contents and focused project immediately without refresh.
5. AGChain registry creation uses `?new=1` + centered dialog instead of the bespoke sheet.
6. AGChain registry no longer duplicates project values vertically in one cell.
7. AGChain table columns explicitly separate project name, slug, and description.
8. Existing overview-first routing and hidden benchmark-definition Rail 2 still work after the correction.
9. Existing BlockData selector behavior still works after the shared selector extraction.
10. Locked inventory counts match the actual changed file set.
11. No backend/runtime seams change.

## Task 1: Lock the failing regression tests for shell resize, left-rail selector placement, focus sync, and registry composition

**File(s):**

- `web/src/components/layout/AgchainShellLayout.test.tsx`
- `web/src/components/shell/LeftRailShadcn.test.tsx`
- `web/src/hooks/agchain/useAgchainProjectFocus.test.tsx`
- `web/src/pages/agchain/AgchainProjectsPage.test.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.test.tsx`

**Step 1:** Add failing tests proving the AGChain shell still needs persisted draggable rail-width/open-state behavior.
**Step 2:** Add failing tests proving the selector must render in the left rail below the brand instead of the top command bar.
**Step 3:** Add failing tests proving two `useAgchainProjectFocus` consumers do not currently stay synchronized across focus/list changes.
**Step 4:** Add failing tests proving `/app/agchain/projects?new=1` must open create UI immediately and that create must update selector-visible project state without refresh.
**Step 5:** Add failing tests proving the registry table renders separate `Project`, `Slug`, and `Description` columns rather than stacked duplicate values.

**Test command:** `cd web && npx vitest run src/components/layout/AgchainShellLayout.test.tsx src/components/shell/LeftRailShadcn.test.tsx src/hooks/agchain/useAgchainProjectFocus.test.tsx src/pages/agchain/AgchainProjectsPage.test.tsx src/components/agchain/AgchainProjectSwitcher.test.tsx --reporter=verbose`
**Expected output:** New regression tests fail for the current implementation and describe the exact broken seams.

**Commit:** `test: lock agchain shell selector and registry regression coverage`

## Task 2: Restore persisted AGChain shell behavior and add the generic rail header-content slot

**File(s):**

- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/layout/AgchainShellLayout.test.tsx`
- `web/src/components/shell/LeftRailShadcn.tsx`
- `web/src/components/shell/LeftRailShadcn.test.tsx`

**Step 1:** Reintroduce AGChain-owned persisted desktop nav open state and desktop rail width in `AgchainShellLayout.tsx`, modeled on the current `AppLayout.tsx` pattern while preserving current route ownership.
**Step 2:** Preserve the current hidden benchmark Rail 2 logic and overview-first route family while restoring the resizable left-rail pattern.
**Step 3:** Add one generic optional `headerContent`-style slot to `LeftRailShadcn.tsx` that renders below the brand and above nav content.
**Step 4:** Update tests to lock both the resize behavior and the header-content slot ordering.

**Test command:** `cd web && npx vitest run src/components/layout/AgchainShellLayout.test.tsx src/components/shell/LeftRailShadcn.test.tsx --reporter=verbose`
**Expected output:** AGChain shell resize tests pass and the generic rail header-content slot renders in the correct order without breaking nav rendering.

**Commit:** `feat: restore agchain shell rail behavior`

## Task 3: Extract the shared selector popover contract and move AGChain selector placement into the left rail

**File(s):**

- `web/src/components/shell/ProjectFocusSelectorPopover.tsx`
- `web/src/components/shell/ProjectFocusSelectorPopover.test.tsx`
- `web/src/components/shell/ProjectSwitcher.tsx`
- `web/src/components/shell/ProjectSwitcher.test.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.test.tsx`
- `web/src/components/shell/TopCommandBar.css`
- `web/src/components/layout/AgchainShellLayout.tsx`

**Step 1:** Extract the shared selector popover shell from `ProjectSwitcher.tsx` into `ProjectFocusSelectorPopover.tsx` with the locked adapter contract.
**Step 2:** Refactor `ProjectSwitcher.tsx` into a thin BlockData wrapper over the shared selector component.
**Step 3:** Refactor `AgchainProjectSwitcher.tsx` into a thin AGChain wrapper over the shared selector component, keeping AGChain-specific footer CTA and last-known-label behavior.
**Step 4:** Move AGChain selector composition from `TopCommandBar.primaryContext` into the new left-rail header-content slot in `AgchainShellLayout.tsx`.
**Step 5:** Lock the shared fixed-width trigger and truncation behavior in CSS/tests.

**Test command:** `cd web && npx vitest run src/components/shell/ProjectFocusSelectorPopover.test.tsx src/components/shell/ProjectSwitcher.test.tsx src/components/agchain/AgchainProjectSwitcher.test.tsx src/components/layout/AgchainShellLayout.test.tsx --reporter=verbose`
**Expected output:** BlockData selector behavior remains green, AGChain selector behavior remains green, and AGChain selector placement now passes the left-rail assertions.

**Commit:** `refactor: share selector contract across blockdata and agchain`

## Task 4: Convert AGChain project focus into a shared synchronized seam

**File(s):**

- `web/src/lib/agchainProjectFocus.ts`
- `web/src/lib/agchainProjectFocus.test.ts`
- `web/src/hooks/agchain/useAgchainProjectFocus.ts`
- `web/src/hooks/agchain/useAgchainProjectFocus.test.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.tsx`

**Step 1:** Add the shared AGChain storage/event helper that owns the focus storage key and the list/focus invalidation event names.
**Step 2:** Refactor `useAgchainProjectFocus.ts` so multiple hook instances stay synchronized across focus changes and project-list invalidations.
**Step 3:** Ensure the AGChain wrapper keeps the last known focused slug visible during refresh while still converging to the resolved project name after reload.
**Step 4:** Verify that selector-visible state and page-visible focused-project state stay synchronized after focus changes and post-create invalidation.

**Test command:** `cd web && npx vitest run src/lib/agchainProjectFocus.test.ts src/hooks/agchain/useAgchainProjectFocus.test.tsx src/components/agchain/AgchainProjectSwitcher.test.tsx --reporter=verbose`
**Expected output:** AGChain selector state stays synchronized across mounted consumers and no longer needs page refresh to reflect new or newly focused projects.

**Commit:** `fix: share agchain project focus state`

## Task 5: Rebuild the AGChain registry page and creation flow around platform patterns

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

## Task 6: Run the final AGChain + BlockData regression sweep

**File(s):**

- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/shell/LeftRailShadcn.tsx`
- `web/src/components/shell/ProjectSwitcher.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.tsx`
- `web/src/pages/agchain/AgchainProjectsPage.tsx`
- `web/src/hooks/agchain/useAgchainProjectFocus.ts`

**Step 1:** Run the targeted Vitest sweep covering shell layout, left-rail header slot, shared selector, AGChain selector, AGChain focus sync, and AGChain registry behavior.
**Step 2:** Run `npm run build` to catch any shared-shell, selector, or registry compile regressions.
**Step 3:** In an authenticated browser session, verify:
- rail resize works on `/app/agchain/overview`
- selector is rendered in the left rail below the brand
- selector width stays stable while switching projects
- `/app/agchain/projects?new=1` opens the create dialog immediately
- creating a project updates the selector without refresh
- the registry table shows distinct `Project`, `Slug`, and `Description` columns

**Test command:** `cd web && npx vitest run src/components/layout/AgchainShellLayout.test.tsx src/components/shell/LeftRailShadcn.test.tsx src/components/shell/ProjectFocusSelectorPopover.test.tsx src/components/shell/ProjectSwitcher.test.tsx src/lib/agchainProjectFocus.test.ts src/hooks/agchain/useAgchainProjectFocus.test.tsx src/components/agchain/AgchainProjectSwitcher.test.tsx src/pages/agchain/AgchainProjectsPage.test.tsx --reporter=verbose && npm run build`
**Expected output:** The full AGChain + BlockData selector/shell sweep passes and the web build completes successfully.

**Commit:** `test: verify agchain shell selector and registry corrections`
