# AGChain Overview-First Project Shell Replacement Implementation Plan

**Goal:** Replace the interim benchmark-first AGChain shell with the real project-scoped level-1 surface set: `Overview`, `Datasets`, `Prompts`, `Scorers`, `Parameters`, `Tools`, `Observability`, and `Settings`. This batch must make `Overview` the default selected-project child route, remove `Benchmarks` from the primary rail, preserve the AGChain project-focus seam already implemented, and re-home benchmark authoring under a deeper project-configuration path instead of leaving it as a level-1 page.

**Architecture:** Keep the existing frontend AGChain project-focus seam and the existing authenticated AGChain benchmark endpoints as the only backing contract in this batch. Do not add or change backend, migration, or observability seams. Rebuild the AGChain primary rail around the locked level-1 menu set, implement a real shared-shell `/app/agchain/overview` page using the captured Braintrust project-overview layout as the frontend-first reference, create project-scoped placeholder pages for the remaining newly exposed level-1 surfaces, keep `Observability` as the canonical lower-rail item just above `Settings`, and move benchmark-definition editing behind a hidden project-configuration route under `Settings` instead of leaving it in the main rail. `Projects` remains the multi-project registry route, but it is not itself a level-1 rail item.

**Tech Stack:** React + TypeScript, React Router, existing AGChain shell components, existing `useAgchainProjectFocus`, existing FastAPI AGChain benchmark routes, Vitest.

**Status:** Draft  
**Author:** Codex for jwchu  
**Date:** 2026-03-30

## Source Documents

Primary planning and design inputs:

- `docs/plans/__complete/2026-03-28-agchain-benchmark-focus-shell-recovery-plan.md`
- `docs/plans/__prev/2026-03-28-agchain-appshelltestpage-braintrust-overview-mockup-plan.md`
- `docs/plans/2026-03-28-agchain-braintrust-surface-capture-and-design-contract-plan.md`
- `docs/plans/2026-03-28-agchain-surface-planning-method.md`
- `docs/plans/2026-03-28-agchain-evaluation-workspace-direction.md`
- `E:\writing-system\braintrust-dev-app-org-level-p-project-level--2026-03-28T19-15-11-189Z.json`
- `E:\writing-system\braintrust-dev-app-org-level-p-project-level-configuration-general--2026-03-28T19-24-58-950Z.json`
- `E:\writing-system\docs\screenshots\image copy.png`

## Current-State Assessment

### What the completed shell-recovery batch fixed

The prior shell-recovery plan correctly established the project-focus seam:

- AGChain now has a real top-bar project selector.
- `/app/agchain/projects` now owns the multi-project registry table.
- AGChain child pages now understand focused project or evaluation context.

That batch was directionally correct, but it intentionally kept `Benchmarks` as the canonical selected-project child page.

### What is now outdated

The approved recovery plan froze the ownership model but did not freeze the final level-1 menu nouns. The user has now locked the actual AGChain level-1 project surfaces:

1. `Overview`
2. `Datasets`
3. `Prompts`
4. `Scorers`
5. `Parameters`
6. `Tools`
7. `Observability`
8. `Settings`

That means the current primary rail is no longer correct:

- `Benchmarks` must leave level 1.
- `Models`, `Runs`, and `Results` must leave level 1.
- `Observability` stays, but it belongs near the bottom just above `Settings`.
- `Projects` remains a registry route and selector-owned surface, not a primary rail noun.

### Directional correction

This plan supersedes the level-1 information architecture frozen in `docs/plans/__complete/2026-03-28-agchain-benchmark-focus-shell-recovery-plan.md` while preserving the project-focus seam that plan introduced.

The resulting shell model is:

- one focused AGChain project or evaluation remains the ambient shell object,
- `Overview` becomes the default project-child route,
- the primary rail is project-scoped and Braintrust-inspired in shape,
- benchmark authoring survives but is removed from level 1 and re-homed under project configuration,
- the new level-1 surfaces that are not implemented yet render explicit project-scoped placeholders instead of remaining absent from the shell.

## Manifest

### Platform API

No platform API contract changes.

#### Existing platform API endpoints reused as-is

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/agchain/benchmarks` | Populate project focus and the project registry surface | Existing - reused as-is |
| POST | `/agchain/benchmarks` | Create a new AGChain project or evaluation via the current underlying benchmark identity | Existing - reused as-is |
| GET | `/agchain/benchmarks/{benchmark_slug}` | Load benchmark-definition data for the hidden project-configuration route | Existing - reused as-is |
| GET | `/agchain/benchmarks/{benchmark_slug}/steps` | Load benchmark-definition sections for the hidden configuration route | Existing - reused as-is |
| POST | `/agchain/benchmarks/{benchmark_slug}/steps` | Create benchmark-definition steps in the hidden configuration route | Existing - reused as-is |
| PATCH | `/agchain/benchmarks/{benchmark_slug}/steps/{benchmark_step_id}` | Update benchmark-definition steps in the hidden configuration route | Existing - reused as-is |
| POST | `/agchain/benchmarks/{benchmark_slug}/steps/reorder` | Reorder benchmark-definition steps in the hidden configuration route | Existing - reused as-is |
| DELETE | `/agchain/benchmarks/{benchmark_slug}/steps/{benchmark_step_id}` | Delete benchmark-definition steps in the hidden configuration route | Existing - reused as-is |

Justification:

- the user explicitly wants the backend left unchanged in this batch,
- the overview surface can be rendered from focused-project identity plus placeholder content,
- benchmark authoring still needs a home, but its current backend seam is adequate,
- no new dataset, prompt, scorer, parameter, tool, or settings backend contract is locked in this batch.

### Observability

No new observability work.

Justification:

- no new server-owned runtime seam is added,
- no platform API route changes are made,
- the newly exposed level-1 pages are either frontend-only placeholders or a frontend-first overview page backed only by existing project focus state.

### Database Migrations

No database migrations.

### Edge Functions

No edge function changes.

### Frontend Surface Area

**New primary level-1 routes/pages:** `6`

| Page | File | Purpose |
|------|------|---------|
| `AgchainOverviewPage` | `web/src/pages/agchain/AgchainOverviewPage.tsx` | Real project overview surface inside the shared AGChain shell |
| `AgchainDatasetsPage` | `web/src/pages/agchain/AgchainDatasetsPage.tsx` | Project-scoped placeholder page for datasets |
| `AgchainPromptsPage` | `web/src/pages/agchain/AgchainPromptsPage.tsx` | Project-scoped placeholder page for prompts |
| `AgchainScorersPage` | `web/src/pages/agchain/AgchainScorersPage.tsx` | Project-scoped placeholder page for scorers |
| `AgchainParametersPage` | `web/src/pages/agchain/AgchainParametersPage.tsx` | Project-scoped placeholder page for parameters |
| `AgchainToolsPage` | `web/src/pages/agchain/AgchainToolsPage.tsx` | Project-scoped placeholder page for tools |

**New overview components/data modules:** `5`

| File | Purpose |
|------|---------|
| `web/src/components/agchain/overview/AgchainOverviewAskLoopPanel.tsx` | Top assistant/input region derived from the Braintrust overview composition |
| `web/src/components/agchain/overview/AgchainOverviewObservabilityCard.tsx` | Overview card for observability onboarding/call-to-action |
| `web/src/components/agchain/overview/AgchainOverviewEvaluationCard.tsx` | Overview card for evaluation progress and next actions |
| `web/src/components/agchain/overview/AgchainOverviewRecentGrid.tsx` | Recently-created objects strip/grid for the overview page |
| `web/src/components/agchain/overview/agchainOverviewPlaceholderData.ts` | Static placeholder content and labels for overview-only cards in this batch |

**Modified existing pages:** `5`

| Page | File | What changes |
|------|------|--------------|
| `AgchainProjectsPage` | `web/src/pages/agchain/AgchainProjectsPage.tsx` | Becomes an entry surface into the new overview-first shell; create/select flows lead to `Overview` rather than `Benchmarks` |
| `AgchainBenchmarksPage` | `web/src/pages/agchain/AgchainBenchmarksPage.tsx` | Stops being a level-1 page and becomes the hidden benchmark-definition editor mounted under project settings |
| `AgchainBenchmarkWorkbenchPage` | `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.tsx` | Redirects legacy benchmark URLs into the hidden benchmark-definition route while preserving focus and hash intent |
| `AgchainObservabilityPage` | `web/src/pages/agchain/AgchainObservabilityPage.tsx` | Remains a project-scoped placeholder surface, but is now positioned as a lower-rail level-1 page near settings |
| `AgchainSettingsPage` | `web/src/pages/agchain/AgchainSettingsPage.tsx` | Replaces the thin `AgchainSectionPage` wrapper with a real settings landing that partitions `Project`, `Organization`, and `Personal` and links to benchmark definition |

**Modified existing components/layout:** `4`

| File | What changes |
|------|--------------|
| `web/src/components/agchain/AgchainLeftNav.tsx` | Replace the current primary rail nouns with the locked final level-1 set and order |
| `web/src/components/layout/AgchainShellLayout.tsx` | Make `Overview` the canonical primary child surface, show Rail 2 only for the hidden benchmark-definition route, and preserve current top-bar project focus |
| `web/src/components/agchain/AgchainBenchmarkNav.tsx` | Re-base benchmark-definition sub-navigation to the hidden settings/project route |
| `web/src/pages/agchain/AgchainSectionPage.tsx` | Generalize placeholder-page copy and CTA treatment for the newly exposed level-1 surfaces |

**Modified router/support files:** `1`

| File | What changes |
|------|--------------|
| `web/src/router.tsx` | Add `Overview`, new level-1 placeholder routes, settings landing, hidden benchmark-definition route, and compatibility redirects from old benchmark paths |

**New test files:** `3`

| File | Purpose |
|------|---------|
| `web/src/pages/agchain/AgchainOverviewPage.test.tsx` | Verifies the real overview surface, borrowed layout regions, and AGChain-specific deviations |
| `web/src/pages/agchain/AgchainLevelOnePlaceholderPages.test.tsx` | Verifies the new placeholder level-1 pages and their focused-project framing |
| `web/src/pages/agchain/AgchainSettingsPage.test.tsx` | Verifies settings landing copy, project/organization/personal partitioning, and benchmark-definition access link |

**Modified existing test files:** `7`

| File | What changes |
|------|--------------|
| `web/src/components/agchain/AgchainLeftNav.test.tsx` | Update the existing 5-item rail assertion to the new locked 8-item order |
| `web/src/components/layout/AgchainShellLayout.test.tsx` | Update shell expectations for overview-first routing and hidden benchmark-definition rail behavior |
| `web/src/pages/agchain/AgchainProjectsPage.test.tsx` | Update registry expectations so create/select flows land on overview |
| `web/src/pages/agchain/AgchainBenchmarksPage.test.tsx` | Reframe the page as hidden benchmark-definition configuration rather than a level-1 page |
| `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx` | Verify redirect into the new hidden benchmark-definition route |
| `web/src/pages/agchain/AgchainProjectScopedPlaceholderPages.test.tsx` | Update or narrow existing placeholder expectations to the surviving project-scoped surfaces |
| `web/src/pages/agchain/AgchainSectionPage.test.tsx` | Update shared placeholder-page expectations if frame, CTA, or focus messaging changes while preserving shell-aligned framing |

**Existing AGChain pages intentionally left off the main path in this batch:** `3`

| File | Status in this batch |
|------|----------------------|
| `web/src/pages/agchain/AgchainBuildPage.tsx` | Existing orphaned page remains unmounted; legacy `/app/agchain/build` is handled in router compatibility redirects only |
| `web/src/pages/agchain/AgchainArtifactsPage.tsx` | Existing orphaned page remains unmounted; legacy `/app/agchain/artifacts` continues to redirect to `Observability` |
| `web/src/pages/agchain/AgchainDashboardPage.tsx` | Existing orphaned page remains unmounted and unchanged in this batch |

## Pre-Implementation Contract

No major product, routing, shell, compatibility, or design-source decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. **This plan supersedes the current AGChain primary-rail contract.** The completed shell-recovery batch remains valid as a seam-recovery step, but its level-1 menu nouns are no longer the implementation target.
2. **The AGChain primary rail must contain exactly these level-1 items in this exact order:** `Overview`, `Datasets`, `Prompts`, `Scorers`, `Parameters`, `Tools`, `Observability`, `Settings`.
3. **No separate `Logs` menu exists in AGChain.** `Observability` remains the canonical noun and canonical route.
4. **`Observability` must sit near the bottom of the primary rail directly above `Settings`.**
5. **`Projects` is not a level-1 rail item.** It remains the multi-project registry route and is reached through project-switcher affordances, empty states, and direct navigation.
6. **`Overview` is the default selected-project child route.** `/app/agchain` lands on `/app/agchain/overview` when a focused project exists, and on `/app/agchain/projects` when no project exists.
7. **`Benchmarks` is removed from the primary rail.** Benchmark definition/editing survives, but only through a deeper hidden route under project configuration.
8. **The benchmark-definition route for this batch is `/app/agchain/settings/project/benchmark-definition`.** It is intentionally not a primary rail item.
9. **The permanent benchmark Rail 2 survives only inside the hidden benchmark-definition route.** It must not appear on `Overview`, placeholder level-1 pages, the registry surface, or the settings landing page.
10. **`Models`, `Runs`, and `Results` leave the primary rail in this batch.** They may survive temporarily as hidden compatibility routes, but they must no longer define the exposed AGChain shell hierarchy.
11. **`Overview` is a real product page in this batch, not a generic placeholder.** It must borrow the Braintrust overview page structure closely enough for side-by-side visual judgment.
12. **`Datasets`, `Prompts`, `Scorers`, `Parameters`, `Tools`, and `Settings` are allowed to ship as explicit project-scoped placeholders in this batch.** Their existence in the shell is part of the contract even though their deeper product behavior is not yet implemented.
13. **The backend remains unchanged.** No new API, migration, or observability seam may be added in this batch to support the overview or placeholder pages.
14. **The existing project-focus seam remains the ambient AGChain shell contract.** This plan uses it; it does not replace it.
15. **The old standalone mockup plan is absorbed as design input, not implemented as a separate route.** The Braintrust capture and screenshot drive the real `/app/agchain/overview` page instead of a throwaway `appshelltestpage`.
16. **Legacy compatibility redirects are direct where practical.** `/app/agchain/build` must redirect directly to `/app/agchain/settings/project/benchmark-definition` instead of chaining through `/app/agchain/benchmarks`, while `/app/agchain/artifacts` continues to redirect directly to `/app/agchain/observability`.
17. **Existing orphaned AGChain page files are acknowledged explicitly.** `AgchainBuildPage.tsx`, `AgchainArtifactsPage.tsx`, and `AgchainDashboardPage.tsx` remain unmounted and unchanged unless a later plan revives them intentionally.

### Locked Frontend Design Contract

#### Primary design sources

- `E:\writing-system\braintrust-dev-app-org-level-p-project-level--2026-03-28T19-15-11-189Z.json`
- `E:\writing-system\docs\screenshots\image copy.png`

#### Secondary reference-only design sources

- `E:\writing-system\braintrust-dev-app-org-level-p-project-level-configuration-general--2026-03-28T19-24-58-950Z.json`
- `docs/plans/__prev/2026-03-28-agchain-appshelltestpage-braintrust-overview-mockup-plan.md`

#### Borrow level

- `Overview`: exact or near-exact visual borrow from the Braintrust overview page, with AGChain-specific menu set and existing shared shell chrome.
- `Datasets`, `Prompts`: near-exact shell-level placeholders borrowing density, title treatment, and empty-state structure.
- `Scorers`, `Parameters`, `Tools`: structural borrow only; placeholder surfaces must not invent Braintrust semantics.
- `Observability`: keep AGChain noun and placeholder shape, but place it according to the new shell order.
- `Settings`: landing-page placeholder only in this batch, but it must visibly partition `Project`, `Organization`, and `Personal`.

#### Locked overview regions

The real `/app/agchain/overview` page must visibly include:

- page heading area with `Project overview`,
- a right-side `Configure project` action,
- a top assistant/input strip inspired by the Braintrust `Ask Loop` region,
- a left `Observability` card,
- a right `Evaluation` card,
- a lower recently-created objects strip or grid,
- a lower project-description or explanatory region.

These regions may use static placeholder copy in this batch where no backend seam exists, but the layout hierarchy and visible density must be intentional and reviewable rather than generic placeholder prose.

#### Locked AGChain deviations from the Braintrust reference

- The AGChain primary rail item list is not copied literally from Braintrust.
- `Logs`, `Topics`, `Monitor`, `Review`, `Playgrounds`, `Experiments`, and `SQL sandbox` are not added in this batch.
- `Observability` remains the AGChain noun instead of `Logs`.
- The page mounts inside the shared AGChain shell rather than a self-contained mock shell.
- The top-bar project switcher remains the AGChain shared-shell focus seam rather than a literal Braintrust header implementation.

#### Placeholder contract for newly exposed level-1 surfaces

Each placeholder level-1 page must:

- visibly name the focused AGChain project or evaluation,
- explain why the surface exists in the project shell,
- make clear that the page is intentionally staged rather than missing,
- provide a path back to `/app/agchain/projects` when no focused project exists,
- avoid generic lorem ipsum or blank placeholder cards.

### Frozen Route And Compatibility Contract

Canonical routes after this batch:

- `/app/agchain`
- `/app/agchain/projects`
- `/app/agchain/overview`
- `/app/agchain/datasets`
- `/app/agchain/prompts`
- `/app/agchain/scorers`
- `/app/agchain/parameters`
- `/app/agchain/tools`
- `/app/agchain/observability`
- `/app/agchain/settings`
- `/app/agchain/settings/project/benchmark-definition`

Compatibility-sensitive routes:

- `/app/agchain/benchmarks`
- `/app/agchain/benchmarks/:benchmarkId`

Locked compatibility behavior:

1. `/app/agchain/benchmarks` redirects to `/app/agchain/settings/project/benchmark-definition`.
2. `/app/agchain/benchmarks/:benchmarkId` sets focused project using the benchmark slug and redirects to `/app/agchain/settings/project/benchmark-definition`, preserving the hash when present.
3. Existing hidden routes such as `/app/agchain/models`, `/app/agchain/runs`, and `/app/agchain/results` may remain mounted in this batch, but they must be removed from the primary rail.
4. `/app/agchain/settings` no longer redirects to `benchmarks`; it becomes a real level-1 page.
5. `/app/agchain/build` redirects directly to `/app/agchain/settings/project/benchmark-definition`.
6. `/app/agchain/artifacts` redirects directly to `/app/agchain/observability`.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. An authenticated user with a focused AGChain project opens `/app/agchain` and lands on `/app/agchain/overview`.
2. An authenticated user without a focused AGChain project opens `/app/agchain` and lands on `/app/agchain/projects`.
3. The AGChain primary rail contains exactly `Overview`, `Datasets`, `Prompts`, `Scorers`, `Parameters`, `Tools`, `Observability`, and `Settings` in that order.
4. The AGChain primary rail no longer contains `Benchmarks`, `Models`, `Runs`, `Results`, or `Logs`.
5. `/app/agchain/overview` renders a real Braintrust-inspired project overview page in the shared AGChain shell, not a generic placeholder.
6. `/app/agchain/projects` remains the only multi-project registry surface.
7. `/app/agchain/benchmarks` no longer functions as a level-1 page and instead redirects to the hidden benchmark-definition route.
8. The benchmark-definition second rail appears only on `/app/agchain/settings/project/benchmark-definition`.
9. `/app/agchain/datasets`, `/app/agchain/prompts`, `/app/agchain/scorers`, `/app/agchain/parameters`, `/app/agchain/tools`, and `/app/agchain/settings` all exist as project-scoped surfaces in this batch.
10. `Observability` remains a mounted AGChain surface and appears just above `Settings` in the primary rail.
11. Project creation and project selection from `/app/agchain/projects` lead into the overview-first shell rather than back to the old benchmark-first shell.
12. The `Configure project` affordance on the overview page leads to a real AGChain configuration entry surface.
13. No backend routes, migrations, edge functions, or observability contracts are changed in this batch.
14. AGChain shell regression coverage explicitly proves the new router and rail still mount the shared shell correctly.

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

- overview and placeholder pages are frontend-first in this batch,
- the project-focus seam already exists,
- benchmark-definition continues to rely on existing benchmark-route observability.

### Locked Inventory Counts

#### Frontend runtime

- New pages/routes: `6`
- New overview components/data modules: `5`
- Modified existing pages: `5`
- Modified existing components/layout: `4`
- Modified hooks/services: `0`
- Modified router/support files: `1`

#### Tests

- New test modules: `3`
- Modified existing test modules: `7`

#### Backend/runtime

- Modified platform-api files: `0`
- Modified migrations: `0`
- Modified edge-function files: `0`

### Locked File Inventory

#### New files

- `web/src/pages/agchain/AgchainOverviewPage.tsx`
- `web/src/pages/agchain/AgchainDatasetsPage.tsx`
- `web/src/pages/agchain/AgchainPromptsPage.tsx`
- `web/src/pages/agchain/AgchainScorersPage.tsx`
- `web/src/pages/agchain/AgchainParametersPage.tsx`
- `web/src/pages/agchain/AgchainToolsPage.tsx`
- `web/src/components/agchain/overview/AgchainOverviewAskLoopPanel.tsx`
- `web/src/components/agchain/overview/AgchainOverviewObservabilityCard.tsx`
- `web/src/components/agchain/overview/AgchainOverviewEvaluationCard.tsx`
- `web/src/components/agchain/overview/AgchainOverviewRecentGrid.tsx`
- `web/src/components/agchain/overview/agchainOverviewPlaceholderData.ts`
- `web/src/pages/agchain/AgchainOverviewPage.test.tsx`
- `web/src/pages/agchain/AgchainLevelOnePlaceholderPages.test.tsx`
- `web/src/pages/agchain/AgchainSettingsPage.test.tsx`

#### Modified existing files

- `web/src/components/agchain/AgchainLeftNav.tsx`
- `web/src/components/agchain/AgchainLeftNav.test.tsx`
- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/agchain/AgchainBenchmarkNav.tsx`
- `web/src/pages/agchain/AgchainSectionPage.tsx`
- `web/src/pages/agchain/AgchainSectionPage.test.tsx`
- `web/src/pages/agchain/AgchainProjectsPage.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.tsx`
- `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.tsx`
- `web/src/pages/agchain/AgchainObservabilityPage.tsx`
- `web/src/pages/agchain/AgchainSettingsPage.tsx`
- `web/src/router.tsx`
- `web/src/components/layout/AgchainShellLayout.test.tsx`
- `web/src/pages/agchain/AgchainProjectsPage.test.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.test.tsx`
- `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx`
- `web/src/pages/agchain/AgchainProjectScopedPlaceholderPages.test.tsx`

#### Not modified

- `services/platform-api/**`
- `supabase/migrations/**`
- `supabase/functions/**`
- `web/src/hooks/agchain/useAgchainProjectFocus.ts`
- `web/src/components/agchain/AgchainProjectSwitcher.tsx`
- `web/src/components/shell/TopCommandBar.tsx`
- `web/src/pages/agchain/AgchainBuildPage.tsx`
- `web/src/pages/agchain/AgchainArtifactsPage.tsx`
- `web/src/pages/agchain/AgchainDashboardPage.tsx`
- `web/src/pages/agchain/AgchainModelsPage.tsx`
- `web/src/pages/agchain/AgchainModelsPage.test.tsx`

## Explicit Risks Accepted In This Plan

1. **Overview data stays partially static in this batch.** The overview page borrows the Braintrust page structure, but cards that would normally require richer backend aggregation use placeholder content or focused-project identity until a later backend plan exists.
2. **Settings is only partially realized.** The level-1 `Settings` page exists now, but the full second-rail project/organization/personal shell is intentionally deferred. The landing page must still make that partition visible.
3. **Legacy hidden routes survive temporarily.** `Models`, `Runs`, and `Results` may remain accessible by direct URL after they leave the primary rail. This avoids arbitrary route breakage while the broader AGChain surface wave is still unfinished.
4. **Benchmark naming drift persists underneath the shell.** The UI becomes overview-first and project-first, but the backing authored/runtime object remains `benchmark` until a separate backend/data-model plan replaces that seam.
5. **Braintrust is a visual/product reference, not a semantic source.** If a direct copy would force AGChain into the wrong semantics, the overview or placeholder content must stay AGChain-owned even when the layout is borrowed closely.

## Completion Criteria

The work is complete only when all of the following are true:

1. The AGChain primary rail order exactly matches the locked menu set in this plan.
2. `/app/agchain/overview` exists and is the default focused-project child route.
3. `/app/agchain/projects` remains the registry surface and is not promoted into level 1.
4. `/app/agchain/settings` exists as a visible level-1 page.
5. Benchmark authoring is reachable only through the hidden project-configuration route and no longer through a level-1 `Benchmarks` menu item.
6. The overview page is visually reviewable against the Braintrust capture and screenshot.
7. Placeholder level-1 pages exist for `Datasets`, `Prompts`, `Scorers`, `Parameters`, and `Tools`.
8. `Observability` remains mounted and appears directly above `Settings`.
9. The shared AGChain shell still mounts correctly after the router and rail rewrite.
10. All locked file counts and routes match this plan.

## Task 1: Lock the overview-first rail and route shape for visual approval

**File(s):**

- `web/src/components/agchain/AgchainLeftNav.tsx`
- `web/src/components/agchain/AgchainLeftNav.test.tsx`
- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/layout/AgchainShellLayout.test.tsx`
- `web/src/router.tsx`
- `web/src/pages/agchain/AgchainOverviewPage.tsx`
- `web/src/pages/agchain/AgchainOverviewPage.test.tsx`

**Step 1:** Replace the current AGChain primary rail items with the locked level-1 set and order from this plan.

**Step 2:** Add `/app/agchain/overview` and make it the default focused-project child route from `/app/agchain`.

**Step 3:** Render an initial overview page skeleton with the locked major regions so the shell shape is visually reviewable early.

**Step 4:** Keep benchmark Rail 2 hidden on the overview route.

**Test command:** `cd web && npx vitest run src/components/agchain/AgchainLeftNav.test.tsx src/components/layout/AgchainShellLayout.test.tsx src/pages/agchain/AgchainOverviewPage.test.tsx --reporter=verbose`

**Expected output:** The new rail order is enforced in tests, the overview route mounts inside the shared AGChain shell, and no benchmark second rail appears on overview.

**Manual verification:** In an authenticated browser session, open `/app/agchain/overview` and confirm the new rail order and overview page skeleton are visually acceptable before deeper work continues.

**Commit:** `feat: lock overview-first agchain rail shape`

## Task 2: Implement the real Braintrust-inspired overview page inside the shared AGChain shell

**File(s):**

- `web/src/pages/agchain/AgchainOverviewPage.tsx`
- `web/src/components/agchain/overview/AgchainOverviewAskLoopPanel.tsx`
- `web/src/components/agchain/overview/AgchainOverviewObservabilityCard.tsx`
- `web/src/components/agchain/overview/AgchainOverviewEvaluationCard.tsx`
- `web/src/components/agchain/overview/AgchainOverviewRecentGrid.tsx`
- `web/src/components/agchain/overview/agchainOverviewPlaceholderData.ts`
- `web/src/pages/agchain/AgchainOverviewPage.test.tsx`

**Step 1:** Build the overview page so it visibly reproduces the Braintrust reference hierarchy: page heading, ask/input strip, observability card, evaluation card, recent objects strip, and lower description region.

**Step 2:** Apply the locked AGChain deviations rather than copying the Braintrust rail or literal menu labels.

**Step 3:** Use static placeholder content wherever no backend seam exists, but keep the page visually intentional and dense enough for side-by-side judgment.

**Step 4:** Add a real `Configure project` affordance that leads into AGChain settings.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainOverviewPage.test.tsx --reporter=verbose`

**Expected output:** The overview page renders the locked major regions and AGChain-specific deviations without depending on new backend seams.

**Manual verification:** Compare `/app/agchain/overview` side-by-side with `E:\writing-system\docs\screenshots\image copy.png` and the primary JSON capture.

**Commit:** `feat: add agchain project overview page`

## Task 3: Re-home benchmark authoring under project configuration and preserve benchmark deep links

**File(s):**

- `web/src/pages/agchain/AgchainBenchmarksPage.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.test.tsx`
- `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.tsx`
- `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx`
- `web/src/components/agchain/AgchainBenchmarkNav.tsx`
- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/router.tsx`

**Step 1:** Move the benchmark-definition editor to `/app/agchain/settings/project/benchmark-definition`.

**Step 2:** Re-base the benchmark second rail and its hardcoded `basePath` from `/app/agchain/benchmarks` to `/app/agchain/settings/project/benchmark-definition`.

**Step 3:** Redirect `/app/agchain/benchmarks` and `/app/agchain/benchmarks/:benchmarkId` into the hidden configuration route while preserving the focused project and hash.

**Step 4:** Ensure benchmark Rail 2 appears only on the hidden benchmark-definition route.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainBenchmarksPage.test.tsx src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx src/components/layout/AgchainShellLayout.test.tsx --reporter=verbose`

**Expected output:** Old benchmark URLs redirect correctly, the hidden benchmark-definition route renders the editor, and Rail 2 is no longer tied to the old level-1 route.

**Commit:** `refactor: move agchain benchmark editing under settings`

## Task 4: Add the new project-scoped placeholder level-1 pages and the settings landing surface

**File(s):**

- `web/src/pages/agchain/AgchainDatasetsPage.tsx`
- `web/src/pages/agchain/AgchainPromptsPage.tsx`
- `web/src/pages/agchain/AgchainScorersPage.tsx`
- `web/src/pages/agchain/AgchainParametersPage.tsx`
- `web/src/pages/agchain/AgchainToolsPage.tsx`
- `web/src/pages/agchain/AgchainSettingsPage.tsx`
- `web/src/pages/agchain/AgchainObservabilityPage.tsx`
- `web/src/pages/agchain/AgchainSectionPage.tsx`
- `web/src/pages/agchain/AgchainLevelOnePlaceholderPages.test.tsx`
- `web/src/pages/agchain/AgchainSettingsPage.test.tsx`
- `web/src/pages/agchain/AgchainProjectScopedPlaceholderPages.test.tsx`
- `web/src/pages/agchain/AgchainSectionPage.test.tsx`

**Step 1:** Add the new level-1 placeholder pages using the locked placeholder contract and focused-project framing.

**Step 2:** Keep `Observability` as the canonical route and update its copy only as needed to fit the new shell order.

**Step 3:** Implement the settings landing page with visible `Project`, `Organization`, and `Personal` partitions plus a link into benchmark definition.

**Step 4:** Keep these pages project-scoped and explicit rather than generic blank placeholders.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainLevelOnePlaceholderPages.test.tsx src/pages/agchain/AgchainSettingsPage.test.tsx src/pages/agchain/AgchainProjectScopedPlaceholderPages.test.tsx src/pages/agchain/AgchainSectionPage.test.tsx --reporter=verbose`

**Expected output:** The new level-1 surfaces exist, are project-scoped, and settings visibly partitions project/organization/personal.

**Commit:** `feat: add agchain level-one placeholder surfaces`

## Task 5: Rewire registry entry points and shell regressions for the overview-first flow

**File(s):**

- `web/src/pages/agchain/AgchainProjectsPage.tsx`
- `web/src/pages/agchain/AgchainProjectsPage.test.tsx`
- `web/src/router.tsx`
- `web/src/components/layout/AgchainShellLayout.test.tsx`

**Step 1:** Make project creation and project selection land on `/app/agchain/overview` instead of the old benchmark-first page.

**Step 2:** Preserve `/app/agchain/projects` as the no-focus landing page and multi-project registry.

**Step 3:** Add explicit shell regression checks proving the AGChain shell still mounts correctly after the route rewrite.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainProjectsPage.test.tsx src/components/layout/AgchainShellLayout.test.tsx --reporter=verbose`

**Expected output:** Registry selection flows enter the overview-first shell, and shell-layout tests confirm the AGChain rail/header/frame still mount correctly.

**Commit:** `test: verify agchain overview-first project flow`

## Task 6: Final regression sweep and visual confirmation

**File(s):** none (verification only)

**Step 1:** Run the targeted AGChain Vitest sweep covering nav, overview, placeholders, settings landing, benchmark-definition redirects, projects flow, shell layout, shared placeholder framing, and the still-mounted direct `Models` compatibility surface.

**Step 2:** Run the AGChain build path to confirm the new routes compile.

**Step 3:** In an authenticated browser session, verify:

- `/app/agchain/overview`
- `/app/agchain/projects`
- `/app/agchain/settings`
- `/app/agchain/settings/project/benchmark-definition`

**Step 4:** Confirm the primary rail order, the lower placement of `Observability`, the absence of `Benchmarks` from level 1, and the continued shell mounting behavior.

**Test command:** `cd web && npx vitest run src/components/agchain/AgchainLeftNav.test.tsx src/components/layout/AgchainShellLayout.test.tsx src/pages/agchain/AgchainOverviewPage.test.tsx src/pages/agchain/AgchainLevelOnePlaceholderPages.test.tsx src/pages/agchain/AgchainSettingsPage.test.tsx src/pages/agchain/AgchainProjectsPage.test.tsx src/pages/agchain/AgchainBenchmarksPage.test.tsx src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx src/pages/agchain/AgchainProjectScopedPlaceholderPages.test.tsx src/pages/agchain/AgchainSectionPage.test.tsx src/pages/agchain/AgchainModelsPage.test.tsx --reporter=verbose && npm run build`

**Expected output:** All targeted AGChain tests pass, the web build succeeds, and manual browser verification confirms the overview-first project shell shape.

**Commit:** no commit (verification only)
