# AGChain Project-Level Shell Recovery Implementation Plan

**Goal:** Re-level AGChain so a selected AGChain project or evaluation becomes the ambient shell context, analogous to BlockData's focused project, while the current benchmark table is moved into a dedicated AGChain project registry instead of occupying a benchmark-child page slot. This batch must also lock the AGChain level-1 ownership model so current and future first-rail surfaces behave as children of one selected AGChain project or evaluation rather than mixing project-child pages with multi-project catalog pages.

**Architecture:** Keep the existing authenticated AGChain benchmark endpoints as the only backend contract in this batch, but reinterpret them at the shell level: one AGChain project or evaluation maps 1:1 to one benchmark slug for now. Add a frontend `useAgchainProjectFocus` seam and `AgchainProjectSwitcher` in the AGChain top bar, move the current benchmark table and create surface to `/app/agchain/projects`, keep `/app/agchain/benchmarks` as the selected project's benchmark-definition page, and preserve `/app/agchain/benchmarks/:benchmarkId` as a compatibility redirect that sets project focus before landing on the canonical project-scoped route. In this model, `/app/agchain/projects` is the registry surface and AGChain first-rail pages are project-scoped children. That ownership rule applies not only to the current `Benchmarks`, `Models`, `Runs`, `Results`, and `Observability` pages, but also to the planned Braintrust-shaped AGChain surfaces such as `Datasets`, `Playgrounds`, `Experiments`, `Prompts`, `Scorers`, `Parameters`, and `Tools`. This batch still fixes shell leveling first, but it now locks the future level-1 ownership model so those surfaces land under the selected AGChain project or evaluation rather than recreating the current benchmark-catalog mistake.

**Tech Stack:** React + TypeScript, React Router, existing `platformApiFetch`, existing FastAPI AGChain benchmark routes, Vitest.

**Status:** Draft
**Author:** Codex for jwchu
**Date:** 2026-03-28

## Current-State Assessment

### BlockData assessment

The user's diagnosis is substantially correct, with one important nuance.

- BlockData has a real shell-level focused-project model:
  - `TopCommandBar` mounts `ProjectSwitcher`
  - `ProjectSwitcher` resolves the selected project through `useProjectFocus`
  - `useProjectFocus` persists and resolves ambient project context
- Multiple first-rail workbench surfaces consume that ambient project:
  - Assets
  - Parse
  - Extract
  - Convert
  - Pipeline Services
  - Schemas
  - Flows
- Not every BlockData menu is project-owned:
  - Settings
  - Marketplace
  - Superuser
  - other global or admin surfaces

So the BlockData pattern is not "every menu is literally a child of project." The real pattern is: project-owned workbenches sit under an ambient selected project, while some platform, admin, or user surfaces remain outside that ownership.

### AGChain assessment

The current AGChain shell is mis-leveled relative to that pattern.

- AGChain hides the project-style selector entirely.
- AGChain only gains benchmark context when the URL already includes `/app/agchain/benchmarks/:benchmarkId`.
- The current `Benchmarks` rail item lands on a catalog table listing multiple benchmarks, while sibling first-rail pages are intended to read as children of one selected evaluation context.
- That makes the current benchmark table the one AGChain surface operating one level higher than its neighbors, which breaks focus confirmation and makes benchmark-local behavior ambiguous.
- If AGChain adds future first-rail surfaces such as `Datasets`, `Playgrounds`, `Prompts`, `Scorers`, `Parameters`, and `Tools` before fixing that leveling problem, the shell will compound the mistake by mixing project-child pages with new multi-project nouns in the same rail.

### Directional correction

The shell-level container for AGChain should not use `benchmark` as the primary shell noun.

For AGChain UI purposes in this phase:

- one AGChain project or evaluation maps 1:1 to one benchmark package,
- `benchmark` remains the underlying authored and runtime object,
- `project` or `evaluation` becomes the ambient shell-level selection model,
- the current benchmark table becomes the registry of AGChain projects and evaluations,
- the registry lives at `/app/agchain/projects` rather than inside any project-child first-rail page,
- current and future AGChain first-rail surfaces are project-scoped children of the selected AGChain project or evaluation.

This aligns better with Braintrust's project-level shell pattern while preserving Inspect-grounded benchmark semantics underneath. The exact final label set may still evolve in later IA plans, but the ownership rule is fixed here: AGChain level-1 menus should feel like Braintrust in their project-scoped behavior, not like a mixed shell where one first-rail page unexpectedly becomes a multi-project registry.

## Manifest

### Platform API

No platform API contract changes.

#### Existing platform API endpoints reused as-is

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/agchain/benchmarks` | Populate the AGChain project or evaluation selector and the AGChain project registry table | Existing - reused as-is |
| POST | `/agchain/benchmarks` | Create a new AGChain project or evaluation by creating its underlying benchmark identity | Existing - reused as-is |
| GET | `/agchain/benchmarks/{benchmark_slug}` | Load the selected AGChain project's benchmark-definition shell and header data | Existing - reused as-is |
| GET | `/agchain/benchmarks/{benchmark_slug}/steps` | Load the selected AGChain project's benchmark-definition steps section | Existing - reused as-is |
| POST | `/agchain/benchmarks/{benchmark_slug}/steps` | Create draft benchmark-definition steps for the selected AGChain project | Existing - reused as-is |
| PATCH | `/agchain/benchmarks/{benchmark_slug}/steps/{benchmark_step_id}` | Update draft benchmark-definition steps for the selected AGChain project | Existing - reused as-is |
| POST | `/agchain/benchmarks/{benchmark_slug}/steps/reorder` | Reorder draft benchmark-definition steps for the selected AGChain project | Existing - reused as-is |
| DELETE | `/agchain/benchmarks/{benchmark_slug}/steps/{benchmark_step_id}` | Delete draft benchmark-definition steps for the selected AGChain project | Existing - reused as-is |

Justification:

- the existing benchmark list endpoint already supplies the registry and selector spine,
- the existing benchmark detail and steps endpoints already supply the project-local benchmark-definition surface,
- this batch is a frontend shell and route recovery, not a backend contract expansion.

### Observability

No new observability work.

Justification:

- this plan does not add or modify any platform API endpoint,
- the new project-focus behavior is frontend-local shell state plus existing endpoint reuse,
- the current benchmark endpoints already own their server-side observability surface.

### Database Migrations

No database migrations.

Justification:

- this batch intentionally uses the existing benchmark tables as the current backing store for AGChain projects and evaluations,
- no new project table or mapping table is introduced in this phase.

### Edge Functions

No edge function changes.

### Frontend Surface Area

**New pages/routes:** `1`

| Page | File | Purpose |
|------|------|---------|
| `AgchainProjectsPage` | `web/src/pages/agchain/AgchainProjectsPage.tsx` | Dedicated AGChain project and evaluation registry and creation surface at `/app/agchain/projects` |

**New components:** `1`

| Component | File | Used by |
|-----------|------|---------|
| `AgchainProjectSwitcher` | `web/src/components/agchain/AgchainProjectSwitcher.tsx` | `AgchainShellLayout` via `TopCommandBar`; exposes ambient AGChain project or evaluation selection |

**New hooks:** `1`

| Hook | File | Purpose |
|------|------|---------|
| `useAgchainProjectFocus` | `web/src/hooks/agchain/useAgchainProjectFocus.ts` | Resolve, persist, and change the focused AGChain project or evaluation using benchmark rows as the initial backing data |

**Modified pages:** `6`

| Page | File | What changes |
|------|------|--------------|
| `AgchainBenchmarksPage` | `web/src/pages/agchain/AgchainBenchmarksPage.tsx` | Becomes the selected AGChain project's benchmark-definition page instead of the registry table |
| `AgchainBenchmarkWorkbenchPage` | `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.tsx` | Becomes a compatibility redirect that maps legacy benchmark URLs into AGChain project focus |
| `AgchainModelsPage` | `web/src/pages/agchain/AgchainModelsPage.tsx` | Reads and visibly names the focused AGChain project or evaluation so the page is confirmed as project-child |
| `AgchainRunsPage` | `web/src/pages/agchain/AgchainRunsPage.tsx` | Reads and visibly names the focused AGChain project or evaluation so the page is confirmed as project-child |
| `AgchainResultsPage` | `web/src/pages/agchain/AgchainResultsPage.tsx` | Reads and visibly names the focused AGChain project or evaluation so the page is confirmed as project-child |
| `AgchainObservabilityPage` | `web/src/pages/agchain/AgchainObservabilityPage.tsx` | Reads and visibly names the focused AGChain project or evaluation so the page is confirmed as project-child |

**Modified components:** `5`

| Component | File | What changes |
|-----------|------|--------------|
| `TopCommandBar` | `web/src/components/shell/TopCommandBar.tsx` | Accept an AGChain-provided primary-context switcher instead of only the default BlockData `ProjectSwitcher` |
| `AgchainShellLayout` | `web/src/components/layout/AgchainShellLayout.tsx` | Mount `AgchainProjectSwitcher`, resolve AGChain project focus, and show Rail 2 based on the canonical benchmark-definition route rather than legacy route-param ownership |
| `AgchainBenchmarkNav` | `web/src/components/agchain/AgchainBenchmarkNav.tsx` | Build links from canonical benchmark-definition route `/app/agchain/benchmarks#...` instead of legacy `:benchmarkId` routes |
| `AgchainBenchmarksTable` | `web/src/components/agchain/benchmarks/AgchainBenchmarksTable.tsx` | Reframe the current table as AGChain project or evaluation registry content rather than as a benchmark-child catalog page |
| `AgchainBenchmarksToolbar` | `web/src/components/agchain/benchmarks/AgchainBenchmarksToolbar.tsx` | Reframe page copy and create actions around AGChain projects and evaluations while still creating the underlying benchmark identity |

**Modified hooks/services:** `1`

| Hook/Service | File | What changes |
|--------------|------|--------------|
| `useAgchainBenchmarkSteps` | `web/src/hooks/agchain/useAgchainBenchmarkSteps.ts` | Accept selected AGChain project context, mapped to benchmark slug, instead of assuming route-param ownership |

**Modified router/support files:** `1`

| File | What changes |
|------|--------------|
| `web/src/router.tsx` | Add `/app/agchain/projects`, re-route AGChain index, and convert `/app/agchain/benchmarks/:benchmarkId` into a compatibility focus-setting flow |

### Frontend-First Design Contract

Because this batch does not add or modify backend, database, or observability seams, frontend shape must be designed and visually verified first rather than left as the last implementation pass.

Before deeper seam wiring is considered complete, the implementation must make the following visually explicit:

- `/app/agchain/projects` is the multi-project registry surface
- `/app/agchain/benchmarks` is a child page of one selected AGChain project or evaluation
- the top bar exposes AGChain project or evaluation focus as a shell-level selector
- current and future first-rail pages are framed as project-scoped children rather than as catalog-level siblings

The first implementation task for this plan must therefore lock shell/page framing, visible ownership cues, and route-level page semantics early enough for user visual approval.

## Pre-Implementation Contract

No major product, route, shell, compatibility, or ownership decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. **Ambient shell noun: AGChain project or evaluation.** The shell-level selected object is an AGChain project or evaluation, not `benchmark` as the primary UI noun.
2. **Initial 1:1 compatibility mapping.** For this phase, one AGChain project or evaluation maps 1:1 to one benchmark slug. `benchmark` remains the underlying authored and runtime object and API contract.
3. **The current benchmark table becomes the AGChain project and evaluation registry.** It moves to `/app/agchain/projects` and is no longer mounted at `/app/agchain/benchmarks`.
4. **`/app/agchain/benchmarks` becomes the selected project's benchmark-definition page.** The current first-rail `Benchmarks` item remains useful, but it becomes a child page inside the selected AGChain project or evaluation.
5. **Current AGChain first-rail surfaces are treated as project children.** In this batch, `Benchmarks`, `Models`, `Runs`, `Results`, and `Observability` are all interpreted as pages belonging to the selected AGChain project or evaluation, even if some of their deeper data or control seams remain immature.
6. **Future AGChain first-rail expansion is locked to the same project-child ownership model.** Planned AGChain level-1 surfaces such as `Datasets`, `Playgrounds`, `Experiments`, `Prompts`, `Scorers`, `Parameters`, `Tools`, and later `Overview` / `Settings`-style surfaces must mount as children of the selected AGChain project or evaluation, not as multi-project registry pages.
7. **No AGChain first-rail page may own a multi-project table or catalog by default.** The AGChain project and evaluation registry lives at `/app/agchain/projects` and future catalog-style surfaces must justify their shell level explicitly in a separate approved plan.
8. **Permanent Rail 2 survives as benchmark-definition sub-navigation only.** It is not the selector for which AGChain project or evaluation is in focus.
9. **Legacy benchmark deep links survive.** `/app/agchain/benchmarks/:benchmarkId` and hash deep links remain valid compatibility paths that set AGChain project focus before redirecting to the canonical project-scoped route.
10. **BlockData shell behavior is not modified.** `ProjectSwitcher`, `useProjectFocus`, `AppLayout`, and BlockData routes remain untouched.
11. **No AGChain organization selector is added in this batch.** The existing workspace selector remains the outer app-level selector, and a distinct AGChain organization or workspace layer is deferred.
12. **This batch does not freeze the exact final AGChain label set, but it does freeze the ownership model.** Later plans may rename current first-rail nouns toward a more Braintrust-like set such as `Overview`, `Datasets`, `Playgrounds`, `Experiments`, `Prompts`, `Scorers`, `Parameters`, `Tools`, and `Settings`, but they must remain children of the selected AGChain project or evaluation and must not reintroduce a benchmark-style catalog page into level 1.
13. **Frontend shape is locked before deeper implementation.** Because backend seams are unchanged in this batch, the shell/page framing for `/app/agchain/projects`, `/app/agchain/benchmarks`, and the AGChain selector in the top bar must be rendered and visually reviewable before the rest of the seam work is treated as implementation-complete.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. An authenticated user opens `/app/agchain` and sees an AGChain project or evaluation selector in the top bar.
2. If one or more benchmark rows exist, AGChain resolves a focused AGChain project or evaluation from persisted selection or the first available row.
3. `/app/agchain/projects` renders the current table and create surface, but framed as the AGChain project and evaluation registry.
4. `/app/agchain/benchmarks` renders the selected AGChain project's benchmark-definition page, not the registry table.
5. Rail 2 appears on `/app/agchain/benchmarks` and continues to drive `#steps`, `#questions`, `#context`, and the other benchmark-definition sub-sections for the selected AGChain project.
6. Switching the AGChain project or evaluation in the top bar updates the current AGChain child page while preserving the current route and hash when possible.
7. Visiting `/app/agchain/benchmarks/legal-10#steps` updates AGChain project focus using the `legal-10` benchmark slug and lands on `/app/agchain/benchmarks#steps`.
8. `Models`, `Runs`, `Results`, and `Observability` visibly name the currently focused AGChain project or evaluation so the scope is confirmable.
9. If no AGChain projects or evaluations exist, `/app/agchain` and benchmark child routes route the user to the `/app/agchain/projects` empty state rather than a broken project-local shell.
10. No AGChain first-rail page renders the multi-project benchmark registry or creation table; that ownership belongs to `/app/agchain/projects`.
11. The shell/page shape for `/app/agchain/projects`, `/app/agchain/benchmarks`, and the top-bar selector is visually reviewable before deeper focus wiring is treated as complete.

### Locked Platform API Surface

#### New platform API endpoints: `0`

#### Existing platform API endpoints modified: `0`

#### Existing platform API endpoints reused as-is: `8`

1. `GET /agchain/benchmarks`
2. `POST /agchain/benchmarks`
3. `GET /agchain/benchmarks/{benchmark_slug}`
4. `GET /agchain/benchmarks/{benchmark_slug}/steps`
5. `POST /agchain/benchmarks/{benchmark_slug}/steps`
6. `PATCH /agchain/benchmarks/{benchmark_slug}/steps/{benchmark_step_id}`
7. `POST /agchain/benchmarks/{benchmark_slug}/steps/reorder`
8. `DELETE /agchain/benchmarks/{benchmark_slug}/steps/{benchmark_step_id}`

### Locked Observability Surface

#### New traces: `0`

#### New metrics: `0`

#### New structured logs: `0`

Reason:

- this plan does not create a new server-owned runtime seam,
- it reuses the existing benchmark endpoints and their current observability,
- the new AGChain project or evaluation focus seam is frontend-local shell state.

### Locked Inventory Counts

#### Frontend runtime

- New pages/routes: `1`
- New components: `1`
- New hooks: `1`
- Modified pages: `6`
- Modified components: `5`
- Modified hooks/services: `1`
- Modified router/support files: `1`

#### Tests

- New test modules: `4`
- Modified existing test modules: `6`

### Locked File Inventory

#### New files

- `web/src/pages/agchain/AgchainProjectsPage.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.tsx`
- `web/src/hooks/agchain/useAgchainProjectFocus.ts`
- `web/src/pages/agchain/AgchainProjectsPage.test.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.test.tsx`
- `web/src/hooks/agchain/useAgchainProjectFocus.test.tsx`
- `web/src/pages/agchain/AgchainProjectScopedPlaceholderPages.test.tsx`

#### Modified files

- `web/src/components/shell/TopCommandBar.tsx`
- `web/src/components/shell/TopCommandBar.test.tsx`
- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/layout/AgchainShellLayout.test.tsx`
- `web/src/components/agchain/AgchainBenchmarkNav.tsx`
- `web/src/components/agchain/AgchainBenchmarkNav.test.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarksTable.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarksToolbar.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.test.tsx`
- `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.tsx`
- `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx`
- `web/src/pages/agchain/AgchainModelsPage.tsx`
- `web/src/pages/agchain/AgchainModelsPage.test.tsx`
- `web/src/pages/agchain/AgchainRunsPage.tsx`
- `web/src/pages/agchain/AgchainResultsPage.tsx`
- `web/src/pages/agchain/AgchainObservabilityPage.tsx`
- `web/src/hooks/agchain/useAgchainBenchmarkSteps.ts`
- `web/src/router.tsx`

## Frozen Seam Contract

### BlockData project focus seam

Do not modify `ProjectSwitcher`, `useProjectFocus`, or the main `AppLayout` project-focus behavior. AGChain gets its own parallel AGChain project or evaluation focus seam rather than mutating the BlockData one.

### AGChain project or evaluation mapping seam

For this phase only, AGChain project or evaluation identity is backed directly by the existing benchmark slug.

- Do not introduce a new backend `agchain_projects` table in this batch.
- Do not rename existing benchmark API routes in this batch.
- Do not treat this 1:1 mapping as a permanent semantic truth of AGChain beyond this compatibility phase.

### AGChain benchmark deep-link seam

Legacy deep links to `/app/agchain/benchmarks/:benchmarkId` must continue to work.

- They may redirect.
- They may no longer remain the canonical normal-navigation path.
- They must still set the focused AGChain project or evaluation before landing on the canonical project-scoped route.

### Registry seam

The current table and create flow remain available, but they move to `/app/agchain/projects`.

Do not strand AGChain project or evaluation creation inside a switcher-only flow.

## Explicit Risks Accepted In This Plan

1. The shell-level AGChain project or evaluation is still backed by benchmark slug in this phase. A future datasets, experiments, playgrounds, prompts, scorers, parameters, and tools wave may require a true first-class AGChain project entity.
2. `Models` remains a partially immature child surface. This plan makes its project ownership visible in the shell, but it does not redesign the deeper model-target semantics yet.
3. This batch does not add a separate AGChain organization layer. If AGChain later needs organization, workspace, and project separation beyond the current app workspace selector, that will require a separate plan.
4. This batch does not rename the current first-rail labels all the way to a Braintrust-like final set. It locks project-scoped ownership now and leaves exact final labeling to a follow-on IA plan.

## Completion Criteria

The work is complete only when all of the following are true:

1. AGChain project or evaluation focus exists as a real shell-level frontend seam.
2. `/app/agchain/projects` owns the registry table and creation flow.
3. `/app/agchain/benchmarks` no longer renders the registry table.
4. Legacy benchmark URLs redirect through the AGChain project or evaluation focus contract without losing deep-link intent.
5. Current AGChain first-rail pages visibly behave as children of the selected AGChain project or evaluation, and none of them renders the multi-project benchmark registry.
6. The plan contract clearly locks future AGChain first-rail expansion to project-child ownership rather than benchmark-catalog ownership.
7. All locked file counts and routes match this plan.

## Task 1: Lock the frontend shell and route shape first

**File(s):**

- `web/src/pages/agchain/AgchainProjectsPage.tsx`
- `web/src/pages/agchain/AgchainProjectsPage.test.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.test.tsx`
- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/layout/AgchainShellLayout.test.tsx`
- `web/src/components/shell/TopCommandBar.tsx`
- `web/src/components/shell/TopCommandBar.test.tsx`

**Step 1:** Render the AGChain shell so `/app/agchain/projects` visibly reads as the project and evaluation registry surface and `/app/agchain/benchmarks` visibly reads as a child page of one selected AGChain project or evaluation, even if deeper focus behavior is still incomplete.

**Step 2:** Make the AGChain top bar visibly reserve and render the project or evaluation selector position so the shell ownership model is obvious in the browser before deeper seam work.

**Step 3:** Add or update targeted render tests proving the route-level page framing and ownership cues are present and that the benchmark registry is no longer implied as a first-rail child page.

**Step 4:** Perform a browser-based visual pass on `/app/agchain/projects` and `/app/agchain/benchmarks` before proceeding with deeper focus wiring.

**Test commands:**

- `cd web && npx vitest run src/pages/agchain/AgchainProjectsPage.test.tsx src/pages/agchain/AgchainBenchmarksPage.test.tsx src/components/layout/AgchainShellLayout.test.tsx src/components/shell/TopCommandBar.test.tsx --reporter=verbose`
- `cd web && npm run dev`

**Expected output:** The targeted render tests pass for the new project-scoped shell framing, and the browser view is ready for user visual approval of the AGChain route/page shape.

**Commit:** `feat: lock agchain project-scoped shell shape`

## Task 2: Add failing tests for AGChain project focus and switcher behavior

**File(s):**

- `web/src/hooks/agchain/useAgchainProjectFocus.test.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.test.tsx`
- `web/src/components/shell/TopCommandBar.test.tsx`

**Step 1:** Add a new failing hook test file proving AGChain project focus resolves persisted selection, falls back to the first available benchmark row, and clears invalid stored focus.

**Step 2:** Add a new failing switcher test file proving the selector shows the focused AGChain project or evaluation, lists available project rows, and exposes navigation into `/app/agchain/projects`.

**Step 3:** Extend `TopCommandBar.test.tsx` with a failing test proving AGChain can provide its own primary-context switcher without mounting the default BlockData `ProjectSwitcher`.

**Test command:** `cd web && npx vitest run src/hooks/agchain/useAgchainProjectFocus.test.tsx src/components/agchain/AgchainProjectSwitcher.test.tsx src/components/shell/TopCommandBar.test.tsx --reporter=verbose`

**Expected output:** New tests fail because AGChain project focus and custom switcher injection do not exist yet.

**Commit:** `test: add failing agchain project focus coverage`

## Task 3: Implement the AGChain project focus seam

**File(s):**

- `web/src/hooks/agchain/useAgchainProjectFocus.ts`
- `web/src/components/agchain/AgchainProjectSwitcher.tsx`
- `web/src/components/shell/TopCommandBar.tsx`

**Step 1:** Implement `useAgchainProjectFocus` so it lists available AGChain projects and evaluations from `GET /agchain/benchmarks`, persists the selected project slug, resolves the current focused project, and exposes setter and reload behavior.

**Step 2:** Implement `AgchainProjectSwitcher` so it renders the focused AGChain project or evaluation label, lists available project rows, allows focus switching, and exposes a direct path into `/app/agchain/projects`.

**Step 3:** Extend `TopCommandBar` with a prop for a caller-provided primary-context switcher so AGChain can mount `AgchainProjectSwitcher` while BlockData continues using the existing `ProjectSwitcher`.

**Step 4:** Make the new tests pass without changing BlockData shell behavior.

**Test command:** `cd web && npx vitest run src/hooks/agchain/useAgchainProjectFocus.test.tsx src/components/agchain/AgchainProjectSwitcher.test.tsx src/components/shell/TopCommandBar.test.tsx --reporter=verbose`

**Expected output:** All targeted AGChain project-focus and top-bar tests pass.

**Commit:** `feat: add agchain project focus switcher`

## Task 4: Move the registry table into the AGChain project and evaluation route

**File(s):**

- `web/src/pages/agchain/AgchainProjectsPage.tsx`
- `web/src/pages/agchain/AgchainProjectsPage.test.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarksTable.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarksToolbar.tsx`

**Step 1:** Create `AgchainProjectsPage.tsx` and move the current registry table plus create flow into `/app/agchain/projects`.

**Step 2:** Update `AgchainBenchmarksTable.tsx` so its visible copy and semantics describe AGChain projects and evaluations while still showing the underlying benchmark-derived row data.

**Step 3:** Update `AgchainBenchmarksToolbar.tsx` so the visible shell copy and create action describe AGChain projects and evaluations rather than a child benchmark page.

**Step 4:** Add project-registry tests covering populated, empty, and create-entry states for `/app/agchain/projects`.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainProjectsPage.test.tsx src/components/agchain/AgchainProjectSwitcher.test.tsx --reporter=verbose`

**Expected output:** AGChain project registry tests pass.

**Commit:** `refactor: move agchain registry table to projects route`

## Task 5: Re-level the AGChain shell and benchmark-definition child page

**File(s):**

- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/layout/AgchainShellLayout.test.tsx`
- `web/src/components/agchain/AgchainBenchmarkNav.tsx`
- `web/src/hooks/agchain/useAgchainBenchmarkSteps.ts`
- `web/src/pages/agchain/AgchainBenchmarksPage.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.test.tsx`

**Step 1:** Update `AgchainShellLayout` to mount `AgchainProjectSwitcher` in the top bar and derive the canonical benchmark-definition shell from AGChain project focus rather than required `:benchmarkId` path ownership.

**Step 2:** Update `AgchainBenchmarkNav` so it builds benchmark-definition links against `/app/agchain/benchmarks#...`.

**Step 3:** Update `useAgchainBenchmarkSteps` so it reads the focused AGChain project's benchmark slug rather than requiring route-param ownership.

**Step 4:** Replace `AgchainBenchmarksPage.tsx` with the selected AGChain project's benchmark-definition page and remove the registry table from it.

**Step 5:** Update the shell and benchmarks-page tests to prove `/app/agchain/benchmarks` is now the selected AGChain project's benchmark-definition child page.

**Test command:** `cd web && npx vitest run src/components/layout/AgchainShellLayout.test.tsx src/components/agchain/AgchainBenchmarkNav.test.tsx src/pages/agchain/AgchainBenchmarksPage.test.tsx --reporter=verbose`

**Expected output:** AGChain shell, benchmark nav, and benchmark-definition page tests pass.

**Commit:** `refactor: relevel agchain benchmark page under project focus`

## Task 6: Re-route AGChain and preserve legacy benchmark links

**File(s):**

- `web/src/router.tsx`
- `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.tsx`
- `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx`

**Step 1:** Change `/app/agchain` index so it lands on `/app/agchain/benchmarks` when a focused AGChain project or evaluation exists and on `/app/agchain/projects` when none exists.

**Step 2:** Add `/app/agchain/projects` as the dedicated AGChain project and evaluation registry route.

**Step 3:** Convert `/app/agchain/benchmarks/:benchmarkId` into a compatibility route that sets AGChain project focus from the benchmark slug and redirects to `/app/agchain/benchmarks` while preserving hash state.

**Step 4:** Update the existing workbench-page test module so it verifies compatibility redirect behavior instead of the old benchmark-detail mounting model.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx src/components/layout/AgchainShellLayout.test.tsx src/pages/agchain/AgchainProjectsPage.test.tsx --reporter=verbose`

**Expected output:** Router-dependent AGChain compatibility tests pass.

**Commit:** `refactor: reroute agchain around project focus and legacy benchmark redirects`

## Task 7: Make the current AGChain first-rail pages visibly project-scoped

**File(s):**

- `web/src/pages/agchain/AgchainModelsPage.tsx`
- `web/src/pages/agchain/AgchainModelsPage.test.tsx`
- `web/src/pages/agchain/AgchainRunsPage.tsx`
- `web/src/pages/agchain/AgchainResultsPage.tsx`
- `web/src/pages/agchain/AgchainObservabilityPage.tsx`
- `web/src/pages/agchain/AgchainProjectScopedPlaceholderPages.test.tsx`

**Step 1:** Update `AgchainModelsPage.tsx` so it visibly names the focused AGChain project or evaluation while preserving the current model surface behavior.

**Step 2:** Update `AgchainRunsPage.tsx`, `AgchainResultsPage.tsx`, and `AgchainObservabilityPage.tsx` so each page visibly names the focused AGChain project or evaluation and clearly behaves as a child page of that context.

**Step 3:** Add explicit no-project fallback behavior that routes users back toward `/app/agchain/projects` when no AGChain project is available.

**Step 4:** Add and update tests proving these current first-rail pages visibly reflect project ownership.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainModelsPage.test.tsx src/pages/agchain/AgchainProjectScopedPlaceholderPages.test.tsx --reporter=verbose`

**Expected output:** AGChain project-scoped page tests pass.

**Commit:** `fix: make current agchain first-rail pages visibly project-scoped`

## Task 8: Verify the targeted AGChain shell slice end to end

**File(s):**

- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/shell/TopCommandBar.tsx`
- `web/src/pages/agchain/AgchainProjectsPage.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.tsx`
- `web/src/router.tsx`

**Step 1:** Run the full targeted AGChain shell slice for project focus, switcher behavior, registry routing, benchmark-definition child routing, and legacy benchmark compatibility.

**Step 2:** Confirm no BlockData top-bar or shell tests regressed from the `TopCommandBar` changes.

**Test command:** `cd web && npx vitest run src/hooks/agchain/useAgchainProjectFocus.test.tsx src/components/agchain/AgchainProjectSwitcher.test.tsx src/components/shell/TopCommandBar.test.tsx src/components/layout/AgchainShellLayout.test.tsx src/components/agchain/AgchainBenchmarkNav.test.tsx src/pages/agchain/AgchainProjectsPage.test.tsx src/pages/agchain/AgchainBenchmarksPage.test.tsx src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx src/pages/agchain/AgchainModelsPage.test.tsx src/pages/agchain/AgchainProjectScopedPlaceholderPages.test.tsx --reporter=verbose`

**Expected output:** All targeted AGChain and shared top-bar tests pass with zero failures.

**Commit:** `test: verify agchain project-level shell recovery`
