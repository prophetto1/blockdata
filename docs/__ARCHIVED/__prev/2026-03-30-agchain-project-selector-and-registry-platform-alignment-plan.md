# AGChain Project Selector and Registry Platform Alignment Implementation Plan

**Goal:** Align the AGChain project selector and AGChain project registry with the existing BlockData platform-shell component patterns: fixed-width shared selector behavior, shared dropdown semantics, shared modal/dialog primitives instead of AGChain-only sheet UI, and deduplicated registry row display that no longer repeats the same project value multiple times.

**Architecture:** Keep AGChain on its existing benchmark-backed project/evaluation runtime seam and keep `/app/agchain/projects` as the AGChain-specific multi-project registry route. Do not point AGChain at BlockData's `/app/projects/list` data model. Instead, extract a shared selector popover component from the current BlockData `ProjectSwitcher`, reuse that shared selector in both BlockData and AGChain, and rebuild the AGChain registry page to use the same platform page/dialog primitives already used by BlockData while preserving AGChain's own `GET /agchain/benchmarks` and `POST /agchain/benchmarks` contracts.

**Tech Stack:** React + TypeScript, React Router, existing shell/top-bar CSS, existing AGChain benchmark list/create platform API routes, existing `Dialog` primitives, Vitest.

**Status:** Draft
**Author:** Codex for jwchu
**Date:** 2026-03-30

## Source Documents

Primary intent and current-shell inputs:

- `docs/plans/2026-03-30-agchain-overview-first-project-shell-replacement-plan.md`
- `docs/plans/2026-03-28-agchain-surface-planning-method.md`
- `docs/plans/2026-03-28-agchain-evaluation-workspace-direction.md`

Current implementation seams reviewed:

- `web/src/components/shell/ProjectSwitcher.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.tsx`
- `web/src/components/shell/TopCommandBar.css`
- `web/src/hooks/agchain/useAgchainProjectFocus.ts`
- `web/src/pages/agchain/AgchainProjectsPage.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarksToolbar.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarksTable.tsx`
- `web/src/pages/Projects.tsx`

Live review findings from the current AGChain shell:

- the AGChain selector trigger width changes based on the selected project label length,
- the AGChain selector footer uses `Open project registry` instead of the shared BlockData-style create/manage affordance pattern,
- the AGChain registry page uses a bespoke toolbar + right-side `Sheet` flow instead of existing platform page/dialog components,
- the AGChain registry first column can render the same short value three times when `benchmark_name`, `benchmark_slug`, and `description` collapse to the same visible string.

## Current-State Assessment

### What already landed correctly

The overview-first AGChain shell is already in place:

- AGChain has a focused-project selector in the top bar,
- `/app/agchain/projects` owns the multi-project registry route,
- `/app/agchain/overview` is the default focused-project child route,
- AGChain's level-1 rail is already project-scoped.

### What is now misaligned

The current implementation diverged from the platform-component reuse goal in three ways:

1. **Selector drift:** `AgchainProjectSwitcher.tsx` is visually close to `ProjectSwitcher.tsx`, but it is still a separate implementation path rather than a shared selector contract.
2. **Registry drift:** `AgchainProjectsPage.tsx` delegates to `AgchainBenchmarksToolbar.tsx` and `AgchainBenchmarksTable.tsx`, which creates a second AGChain-only registry pattern instead of reusing the platform page/dialog primitives already used on `Projects.tsx`.
3. **Display duplication:** `AgchainBenchmarksTable.tsx` currently renders `benchmark_name`, `benchmark_slug`, and `description` in the same stacked cell even when those values normalize to the same string, which is why a short project like `ss` appears three times.

### Root causes observed in code

1. **Variable selector width:** neither AGChain nor BlockData currently owns a fixed shared width contract for the project-selector trigger. AGChain also bypassed the `.project-switcher-trigger` hook in `TopCommandBar.css`, which made the drift more obvious.
2. **Wrong footer semantics:** BlockData's selector footer points into the existing create-project flow, while AGChain's selector footer points to a separate AGChain registry page and that destination currently uses custom registry UI.
3. **Registry header duplication:** `AgchainProjectsPage.tsx` renders one page-level title and `AgchainBenchmarksToolbar.tsx` renders another `Projects and evaluations` title directly below it.
4. **Triple-name bug:** the registry table's first column unconditionally shows name, slug, and description without checking whether the secondary lines actually add information.

## Manifest

### Platform API

No platform API contract changes.

#### Existing platform API endpoints reused as-is

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/agchain/benchmarks` | Populate the AGChain selector and AGChain registry table | Existing - reused as-is |
| POST | `/agchain/benchmarks` | Create a new AGChain project/evaluation backed by the existing benchmark identity | Existing - reused as-is |

Justification:

- the current issues are selector, registry, and display-contract problems, not missing runtime seams,
- AGChain must keep its own benchmark-backed system of record in this batch,
- routing AGChain creation into BlockData's `projects` table would be architecturally wrong for this surface.

### Observability

No new observability work.

Justification:

- this batch adds no new backend-owned runtime seam,
- the selector and registry changes are frontend-only composition and display changes on top of existing routes.

### Database Migrations

No database migrations.

### Edge Functions

No edge function changes.

### Frontend Surface Area

**New shared components:** `1`

| Component | File | Used by |
|-----------|------|---------|
| `ProjectFocusSelectorPopover` | `web/src/components/shell/ProjectFocusSelectorPopover.tsx` | `ProjectSwitcher.tsx`, `AgchainProjectSwitcher.tsx` |

**Modified existing pages:** `1`

| Page | File | What changes |
|------|------|--------------|
| `AgchainProjectsPage` | `web/src/pages/agchain/AgchainProjectsPage.tsx` | Becomes the owner of the aligned AGChain registry framing, single header, BlockData-style create-dialog flow, and `?new=1` entry behavior |

**Modified existing components/layout:** `5`

| File | What changes |
|------|--------------|
| `web/src/components/shell/ProjectSwitcher.tsx` | Refactor BlockData selector into a thin wrapper around the new shared selector component |
| `web/src/components/agchain/AgchainProjectSwitcher.tsx` | Refactor AGChain selector into a thin wrapper around the same shared selector component |
| `web/src/components/shell/TopCommandBar.css` | Add the fixed shared selector trigger width/truncation contract used by both BlockData and AGChain |
| `web/src/components/agchain/benchmarks/AgchainBenchmarksTable.tsx` | Reframe the AGChain registry table cell rendering so duplicate name/slug/description lines are suppressed |
| `web/src/components/agchain/benchmarks/AgchainBenchmarksToolbar.tsx` | Removed from runtime ownership; its bespoke duplicate heading and right-side sheet flow are retired |

**Modified existing hooks/services:** `1`

| File | What changes |
|------|--------------|
| `web/src/hooks/agchain/useAgchainProjectFocus.ts` | Keep stored focus hydrated immediately so the shared selector shows a stable last-known label during refresh |

**Modified router/support files:** `0`

**New test modules:** `2`

| File | Purpose |
|------|---------|
| `web/src/components/shell/ProjectFocusSelectorPopover.test.tsx` | Locks the shared selector trigger width contract, search input, footer CTA semantics, and stable label behavior |
| `web/src/components/shell/ProjectSwitcher.test.tsx` | Locks the BlockData wrapper around the new shared selector and its `Create Project` routing behavior |

**Modified existing test modules:** `3`

| File | What changes |
|------|--------------|
| `web/src/components/agchain/AgchainProjectSwitcher.test.tsx` | Update AGChain selector expectations to shared-selector behavior, fixed trigger contract, and AGChain-specific footer action |
| `web/src/hooks/agchain/useAgchainProjectFocus.test.tsx` | Preserve immediate stored-focus hydration behavior |
| `web/src/pages/agchain/AgchainProjectsPage.test.tsx` | Replace bespoke toolbar/sheet expectations with aligned registry and deduplicated row-display expectations |

**Deleted obsolete runtime file:** `1`

- `web/src/components/agchain/benchmarks/AgchainBenchmarksToolbar.tsx`

## Pre-Implementation Contract

No major product, selector, registry, routing, or component-reuse decision may be improvised during implementation. If any item below changes, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. **AGChain keeps its own project/evaluation registry route and backend seam.** This batch does not repoint AGChain at BlockData's `/app/projects/list` data model.
2. **The top-bar selector must become one shared selector component contract used by both BlockData and AGChain.** AGChain may keep its own wrapper, but not its own bespoke selector implementation.
3. **The selector trigger width must be fixed on desktop and must not expand or shrink with the selected project label.** Long labels truncate; short labels do not collapse the trigger.
4. **The shared selector contract must own the dropdown frame, search field, trigger styling, chevron behavior, and footer CTA structure.**
5. **BlockData and AGChain keep different data adapters, but they must share the same selector UI contract.**
6. **AGChain selector footer behavior must stop being AGChain-bespoke copy.** The footer CTA must align with the shared BlockData-style create/manage pattern.
7. **The AGChain selector footer CTA will route to `/app/agchain/projects?new=1`, not `/app/projects/list?new=1`.** AGChain creation still belongs to AGChain's benchmark-backed seam.
8. **`/app/agchain/projects?new=1` must open the create-project dialog immediately, matching the BlockData query-param modal-entry pattern.**
9. **The AGChain create flow must use the existing centered dialog primitives, not a right-side `Sheet`.**
10. **The AGChain registry page must have one primary page header only.** The current duplicated `Projects and evaluations` heading stack is removed.
11. **The AGChain registry table must never render the same visible value multiple times in the first column.** If name, slug, and description normalize to the same text, only one visible value survives.
12. **No backend, migration, or observability changes are allowed in this batch.**
13. **This batch aligns selector and registry composition only.** It does not attempt full BlockData feature parity such as status filters, document counts, or BlockData project ownership semantics where AGChain backend data does not support them.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. The AGChain selector trigger keeps the same desktop width when switching between a short label like `ss` and a long project label.
2. The BlockData selector and AGChain selector are both thin wrappers over the same shared selector component.
3. The AGChain selector dropdown includes the same shared search field and general footer structure as the BlockData selector.
4. The AGChain selector footer CTA routes to `/app/agchain/projects?new=1`.
5. Opening `/app/agchain/projects?new=1` shows a centered create dialog immediately rather than a right-side sheet.
6. The AGChain registry page no longer renders duplicate page titles.
7. The AGChain registry row for a project like `ss` no longer shows the same short string three times in the first column.
8. Creating a project from the AGChain selector or registry still lands inside the AGChain overview-first shell.
9. Existing BlockData selector behavior is preserved aside from the newly shared fixed-width contract.
10. No backend files, migrations, or platform API routes change.

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

- New shared components: `1`
- Modified existing pages: `1`
- Modified existing components/layout: `5`
- Modified existing hooks/services: `1`
- Modified router/support files: `0`
- Deleted obsolete runtime files: `1`

#### Tests

- New test modules: `2`
- Modified existing test modules: `3`

#### Backend/runtime

- Modified platform-api files: `0`
- Modified migrations: `0`
- Modified edge-function files: `0`

### Locked File Inventory

#### New files

- `web/src/components/shell/ProjectFocusSelectorPopover.tsx`
- `web/src/components/shell/ProjectFocusSelectorPopover.test.tsx`
- `web/src/components/shell/ProjectSwitcher.test.tsx`

#### Modified existing files

- `web/src/components/shell/ProjectSwitcher.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.tsx`
- `web/src/components/shell/TopCommandBar.css`
- `web/src/hooks/agchain/useAgchainProjectFocus.ts`
- `web/src/pages/agchain/AgchainProjectsPage.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarksTable.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.test.tsx`
- `web/src/hooks/agchain/useAgchainProjectFocus.test.tsx`
- `web/src/pages/agchain/AgchainProjectsPage.test.tsx`

#### Deleted files

- `web/src/components/agchain/benchmarks/AgchainBenchmarksToolbar.tsx`

#### Not modified

- `services/platform-api/**`
- `supabase/migrations/**`
- `supabase/functions/**`
- `web/src/router.tsx`
- `web/src/pages/Projects.tsx`
- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/pages/agchain/AgchainOverviewPage.tsx`

## Frozen Selector and Registry Contract

### Shared selector contract

- The shared selector trigger is one desktop-width contract for both BlockData and AGChain.
- The selected label truncates inside the trigger.
- The chevron position does not shift when the selected label changes.
- The dropdown contains:
  - search input,
  - scrollable row list,
  - one footer CTA region.

### BlockData wrapper contract

- `ProjectSwitcher.tsx` continues to use `useProjectFocus`.
- Footer CTA remains `Create Project`.
- Footer CTA continues to route to `/app/projects/list?new=1`.

### AGChain wrapper contract

- `AgchainProjectSwitcher.tsx` continues to use `useAgchainProjectFocus`.
- Footer CTA routes to `/app/agchain/projects?new=1`.
- The last stored AGChain focus slug must remain visible during refresh while the benchmark list is loading.
- The wrapper must not introduce AGChain-only trigger geometry.

### AGChain registry contract

- `/app/agchain/projects` remains the AGChain registry route.
- `/app/agchain/projects?new=1` opens the create dialog immediately.
- The page uses one header, one aligned create-dialog flow, and one registry table surface.
- The create flow uses the existing dialog primitives already used on `Projects.tsx`, not `Sheet`.
- The registry first column displays:
  - primary project name,
  - optional secondary metadata only when distinct and meaningful,
  - one clear open action.

## Explicit Risks Accepted In This Plan

1. **This batch touches the shared BlockData selector path.** Even though the user request is AGChain-driven, the correct architectural fix is a shared selector component, so BlockData regression coverage is required.
2. **AGChain still uses benchmark-backed names and slugs underneath the UI.** This plan fixes display duplication and wrapper alignment, not the underlying benchmark/project identity model.
3. **AGChain create-project form fields remain slightly different from BlockData.** AGChain still needs slug support because the existing `POST /agchain/benchmarks` contract expects it, so the UI can align structurally without becoming byte-for-byte identical.

## Completion Criteria

The work is complete only when all of the following are true:

1. The shared selector component exists and is used by both BlockData and AGChain wrappers.
2. The selector trigger width remains stable across project-name length changes.
3. The AGChain selector footer points to `/app/agchain/projects?new=1`.
4. The AGChain registry page opens a centered dialog when `?new=1` is present.
5. The AGChain registry page no longer uses the bespoke sheet toolbar path.
6. The AGChain registry first column no longer renders redundant repeated values.
7. Existing AGChain overview-first navigation still works after selector and registry alignment.
8. Existing BlockData project switching still works after the shared selector refactor.
9. All locked file counts match the actual created, modified, and deleted files.
10. No backend/runtime seams change.

## Task 1: Extract the shared selector popover contract from the current BlockData selector

**File(s):**

- `web/src/components/shell/ProjectFocusSelectorPopover.tsx`
- `web/src/components/shell/ProjectFocusSelectorPopover.test.tsx`
- `web/src/components/shell/ProjectSwitcher.tsx`
- `web/src/components/shell/ProjectSwitcher.test.tsx`
- `web/src/components/shell/TopCommandBar.css`

**Step 1:** Create `ProjectFocusSelectorPopover.tsx` as the shared selector UI component that owns trigger geometry, search box, row list shell, footer CTA slot, and desktop-width contract.

**Step 2:** Refactor `ProjectSwitcher.tsx` into a thin BlockData-specific wrapper that supplies BlockData data, current selection, footer label, and footer navigation.

**Step 3:** Move the fixed trigger-width contract into shared selector styling so the trigger no longer resizes with label length.

**Step 4:** Add tests for the shared selector and BlockData wrapper behavior.

**Test command:** `cd web && npx vitest run src/components/shell/ProjectFocusSelectorPopover.test.tsx src/components/shell/ProjectSwitcher.test.tsx --reporter=verbose`

**Expected output:** Shared selector tests pass, BlockData wrapper still routes to `/app/projects/list?new=1`, and the fixed-width trigger contract is locked in tests.

**Commit:** `refactor: extract shared project focus selector`

## Task 2: Rebuild the AGChain selector as a wrapper over the shared selector contract

**File(s):**

- `web/src/components/agchain/AgchainProjectSwitcher.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.test.tsx`
- `web/src/hooks/agchain/useAgchainProjectFocus.ts`
- `web/src/hooks/agchain/useAgchainProjectFocus.test.tsx`

**Step 1:** Refactor `AgchainProjectSwitcher.tsx` into a thin AGChain wrapper over the new shared selector component.

**Step 2:** Route the AGChain selector footer CTA to `/app/agchain/projects?new=1`.

**Step 3:** Preserve immediate stored-focus hydration so refresh continues showing the last AGChain project label instead of a loading-only fallback.

**Step 4:** Update AGChain selector tests to lock shared-selector behavior and AGChain-specific routing.

**Test command:** `cd web && npx vitest run src/hooks/agchain/useAgchainProjectFocus.test.tsx src/components/agchain/AgchainProjectSwitcher.test.tsx --reporter=verbose`

**Expected output:** Stored focus hydration passes, AGChain selector uses shared search/dropdown behavior, and the AGChain footer CTA points at `/app/agchain/projects?new=1`.

**Commit:** `refactor: align agchain selector with shared project picker`

## Task 3: Replace the AGChain registry sheet flow with the existing platform dialog pattern

**File(s):**

- `web/src/pages/agchain/AgchainProjectsPage.tsx`
- `web/src/pages/agchain/AgchainProjectsPage.test.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarksTable.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarksToolbar.tsx`

**Step 1:** Move create-dialog ownership into `AgchainProjectsPage.tsx` and delete `AgchainBenchmarksToolbar.tsx`.

**Step 2:** Rebuild the page to use one page header and the same modal-entry pattern used by `Projects.tsx`, including `?new=1` support.

**Step 3:** Keep AGChain create behavior on `POST /agchain/benchmarks` and overview-first navigation on success.

**Step 4:** Remove the duplicated page title stack and update tests accordingly.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainProjectsPage.test.tsx --reporter=verbose`

**Expected output:** `/app/agchain/projects?new=1` opens the aligned create dialog, project creation still posts to `/agchain/benchmarks`, and the page no longer shows duplicated headings or a sheet-based flow.

**Commit:** `refactor: align agchain project registry create flow`

## Task 4: Fix the AGChain registry row display contract so duplicate values are suppressed

**File(s):**

- `web/src/components/agchain/benchmarks/AgchainBenchmarksTable.tsx`
- `web/src/pages/agchain/AgchainProjectsPage.test.tsx`

**Step 1:** Add row-display normalization so the first column only renders slug and description when they are distinct from the visible project name and from each other.

**Step 2:** Keep one clear open affordance per row while preventing triple-display cases like `ss / ss / ss`.

**Step 3:** Update tests to prove duplicate strings are not rendered redundantly.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainProjectsPage.test.tsx --reporter=verbose`

**Expected output:** The AGChain registry page still navigates correctly, but duplicate field values no longer render as repeated stacked text.

**Commit:** `fix: dedupe agchain registry row display`

## Task 5: Final regression sweep for shared selector and AGChain registry alignment

**File(s):** none (verification only)

**Step 1:** Run the focused selector and AGChain registry Vitest sweep.

**Step 2:** Run the web build to ensure the shared selector refactor and registry cleanup compile cleanly.

**Step 3:** In an authenticated browser session, verify:

- `/app/agchain/overview`
- `/app/agchain/projects`
- `/app/agchain/projects?new=1`
- a BlockData route that shows the default `ProjectSwitcher`

**Step 4:** Confirm all of the following visually:

- AGChain selector width is stable across short and long project names,
- AGChain selector no longer flashes a loading-only label when a stored focus exists,
- the AGChain dropdown footer CTA is aligned with the shared selector contract,
- the AGChain registry opens the centered dialog, not a right-side sheet,
- the AGChain registry no longer shows `ss` three times when the underlying values collapse.

**Test command:** `cd web && npx vitest run src/components/shell/ProjectFocusSelectorPopover.test.tsx src/components/shell/ProjectSwitcher.test.tsx src/hooks/agchain/useAgchainProjectFocus.test.tsx src/components/agchain/AgchainProjectSwitcher.test.tsx src/pages/agchain/AgchainProjectsPage.test.tsx --reporter=verbose && npm run build`

**Expected output:** All targeted tests pass, the web build succeeds, and authenticated browser verification confirms the aligned selector and registry behavior.

**Commit:** no commit (verification only)
