# AGChain Left-Rail Project Selector Relocation Implementation Plan

**Goal:** Move the AGChain focused-project selector out of the top command bar and into the AGChain left rail so it renders directly below the `BlockData Bench` brand and directly above the locked project-scoped level-1 menu items, making the selected project visually explicit as the independent variable for `Overview`, `Datasets`, `Prompts`, `Scorers`, `Parameters`, `Tools`, `Observability`, and `Settings`.

**Architecture:** Keep the existing frontend-only AGChain project-focus seam exactly as-is: `useAgchainProjectFocus` remains the sole owner of focused-project state, the selector continues to read from `GET /agchain/benchmarks`, and the selector continues to update focus by calling `setFocusedProjectSlug`. Do not add or modify platform API, migration, or observability seams. Implement this as a shell-composition change in `AgchainShellLayout` plus one generic optional left-rail header-content slot in `LeftRailShadcn`, then adapt `AgchainProjectSwitcher` so the same selector can render in a full-width rail context instead of a compact top-bar pill.

**Tech Stack:** React + TypeScript, React Router, existing AGChain shell components, existing `useAgchainProjectFocus`, existing AGChain benchmark list API client, Vitest.

**Status:** Draft
**Author:** Codex for jwchu
**Date:** 2026-03-30

### Platform API

No platform API changes.

Existing platform API endpoints reused as-is:

| Verb | Path | Action | Status |
|------|------|--------|--------|
| GET | `/agchain/benchmarks` | Populate the focused-project selector choices and hydrate the current focused-project label | Existing - reused as-is |
| POST | `/agchain/benchmarks` | Preserve current project/evaluation creation ownership on `/app/agchain/projects` | Existing - reused as-is |

Justification:

- this request changes selector placement, not selector data,
- the existing AGChain project-focus seam already hydrates selector rows correctly,
- no new runtime capability is required.

### Observability

No observability changes.

Justification:

- no backend route, worker, edge function, or database seam changes,
- the relocation is a pure frontend shell-composition change,
- the existing project-focus flow already operates entirely through current traced/untraced seams with no new owned runtime path introduced in this plan.

### Database Migrations

No database migrations.

### Edge Functions

No edge functions created or modified.

Existing edge functions remain out of scope because this implementation stays entirely in the web shell.

### Frontend Surface Area

**New pages/routes:** `0`

**New components:** `0`

**New hooks/services:** `0`

**Modified existing runtime files:** `3`

| File | What changes |
|------|--------------|
| `web/src/components/layout/AgchainShellLayout.tsx` | Stop rendering `AgchainProjectSwitcher` in `TopCommandBar.primaryContext`, pass the selector into the left rail instead, and keep the top command bar otherwise unchanged |
| `web/src/components/shell/LeftRailShadcn.tsx` | Add one optional generic rail-header content slot rendered below `headerBrand` and above the nav list when `navSections` are used |
| `web/src/components/agchain/AgchainProjectSwitcher.tsx` | Add a minimal styling seam so the selector trigger can render correctly in a full-width left-rail context without breaking its existing dropdown behavior |

**Modified existing test files:** `3`

| File | What changes |
|------|--------------|
| `web/src/components/layout/AgchainShellLayout.test.tsx` | Lock that AGChain no longer injects project context into the top bar and instead renders it inside the primary rail |
| `web/src/components/shell/LeftRailShadcn.test.tsx` | Lock the new generic header-content slot ordering: brand first, custom slot second, nav content below |
| `web/src/components/agchain/AgchainProjectSwitcher.test.tsx` | Lock the rail-width trigger contract while preserving search, focus switching, and project-registry navigation |

**Not modified:** `6`

- `services/platform-api/app/api/routes/agchain_benchmarks.py`
- `services/platform-api/app/api/routes/agchain_models.py`
- `supabase/migrations/*`
- `web/src/hooks/agchain/useAgchainProjectFocus.ts`
- `web/src/components/agchain/AgchainLeftNav.tsx`
- `web/src/router.tsx`

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. The AGChain focused-project selector moves into the left rail and is rendered directly below the `BlockData Bench` brand and directly above the locked 8-item AGChain level-1 nav.
2. The AGChain top command bar no longer shows the AGChain project selector.
3. The AGChain top command bar keeps its existing height, right-side controls, and hidden-search layout behavior in this plan; this is not a broader header redesign.
4. The selector continues to use the existing `AgchainProjectSwitcher` behavior and the existing `useAgchainProjectFocus` seam. Focus ownership does not move into `AgchainLeftNav`, `LeftRailShadcn`, router state, or URL query state.
5. The AGChain left rail remains the owner of level-1 project-scoped navigation only. `Projects` remains a selector-owned registry route, not a new rail item.
6. The relocation must not change the locked rail order: `Overview`, `Datasets`, `Prompts`, `Scorers`, `Parameters`, `Tools`, `Observability`, `Settings`.
7. The hidden benchmark-definition second rail remains unchanged and appears only on `/app/agchain/settings/project/benchmark-definition`.
8. The implementation must not introduce AGChain-specific branching into `LeftRailShadcn` beyond a generic optional header-content slot.
9. The selector’s dropdown semantics remain unchanged: searchable list, in-place focus switching, and footer link to `/app/agchain/projects`.
10. The selector move is visual/compositional only; it must not change the current benchmark-backed system of record for AGChain project rows.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. On `/app/agchain/overview`, the left rail shows `BlockData Bench`, then the AGChain focused-project selector, then the level-1 menu starting at `Overview`.
2. On `/app/agchain/overview`, the top command bar no longer renders the AGChain project selector.
3. On `/app/agchain/projects`, the same left-rail selector is still visible above the AGChain nav and its footer link still points to `/app/agchain/projects`.
4. Opening the rail selector still shows the searchable project list and `Find project...` input.
5. Selecting a different project in the rail selector updates AGChain focus through the existing hook and causes focused-project child pages such as `Overview` to read the newly focused project.
6. On `/app/agchain/settings/project/benchmark-definition`, the benchmark second rail still renders exactly as before.

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

#### Database

- New migrations: `0`
- Modified existing migrations: `0`

#### Frontend runtime

- New pages/routes: `0`
- New components: `0`
- New hooks/services: `0`
- Modified runtime files: `3`

#### Tests

- New test modules: `0`
- Modified existing test modules: `3`

#### Backend/runtime

- Modified platform API files: `0`
- Modified edge functions: `0`

### Locked File Inventory

#### New files

None.

#### Modified existing files

- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/shell/LeftRailShadcn.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.tsx`
- `web/src/components/layout/AgchainShellLayout.test.tsx`
- `web/src/components/shell/LeftRailShadcn.test.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.test.tsx`

#### Deleted files

None.

#### Not modified

- `web/src/hooks/agchain/useAgchainProjectFocus.ts`
- `web/src/components/agchain/AgchainLeftNav.tsx`
- `web/src/router.tsx`
- `services/platform-api/app/api/routes/agchain_benchmarks.py`
- `services/platform-api/app/api/routes/agchain_models.py`
- `supabase/migrations/*`

## Frozen Project-Focus Seam Contract

The existing AGChain project-focus seam must remain intact:

- `useAgchainProjectFocus` stays the single focused-project owner,
- the selector continues to hydrate from `fetchAgchainBenchmarks`,
- focus persistence continues to use the existing local-storage key,
- AGChain child pages continue to derive their displayed values from the current focused project instead of from selector-local state.

Do not reimplement this move by introducing AGChain-specific focus state inside `LeftRailShadcn` or by adding new URL synchronization logic. The shell should only relocate the selector, not replace its state model.

## Explicit Risks Accepted In This Plan

1. The top command bar will still have an empty left-side context area on AGChain routes after the selector is removed; that whitespace is accepted in this plan because header redesign is out of scope.
2. `AgchainProjectSwitcher` may need a small rail-specific trigger styling seam even though a broader shared-selector alignment plan already exists; that limited styling concession is acceptable here to keep the relocation bounded.
3. Adding a generic optional slot to `LeftRailShadcn` slightly expands a shared shell API surface, but this is acceptable because the slot is generic and can support future shell compositions without AGChain-only branching.

## Completion Criteria

The work is complete only when all of the following are true:

1. The locked frontend file inventory above matches the actual modified file set.
2. The AGChain selector renders inside the left rail and no longer renders in the AGChain top command bar.
3. The hidden benchmark-definition secondary rail behavior is unchanged.
4. The selector still supports search, focus switching, and the `/app/agchain/projects` footer link.
5. No backend, migration, or observability files are changed.
6. The focused AGChain Vitest slice passes.

## Task 1: Lock The Relocation In Tests

**File(s):** `web/src/components/layout/AgchainShellLayout.test.tsx`, `web/src/components/shell/LeftRailShadcn.test.tsx`

**Step 1:** Update `AgchainShellLayout.test.tsx` so the mocked `LeftRailShadcn` exposes both the brand slot and the new rail-header-content slot.
**Step 2:** Add assertions that the AGChain project selector renders inside the primary rail content rather than the top header composition.
**Step 3:** Extend `LeftRailShadcn.test.tsx` with a focused test that renders `headerBrand`, the new optional rail-header-content prop, and `navSections`, then verifies the rendered order is brand -> rail slot -> nav.

**Test command:** `cd web && npx vitest run src/components/layout/AgchainShellLayout.test.tsx src/components/shell/LeftRailShadcn.test.tsx`
**Expected output:** The new assertions fail before implementation and then pass after the slot and shell wiring are added.

**Commit:** `test: lock agchain selector left-rail placement`

## Task 2: Add A Generic Left-Rail Header Slot

**File(s):** `web/src/components/shell/LeftRailShadcn.tsx`

**Step 1:** Add one optional generic prop for content that renders beneath `headerBrand` inside `SidebarHeader`.
**Step 2:** Place the new slot below the current brand block and above the `SidebarContent` nav region when `navSections` are active.
**Step 3:** Preserve all current behavior when the new prop is omitted so the default platform shell remains unchanged.

**Test command:** `cd web && npx vitest run src/components/shell/LeftRailShadcn.test.tsx`
**Expected output:** `LeftRailShadcn.test.tsx` passes with the new slot ordering covered.

**Commit:** `feat: add generic left rail header slot`

## Task 3: Make The AGChain Selector Rail-Compatible

**File(s):** `web/src/components/agchain/AgchainProjectSwitcher.tsx`, `web/src/components/agchain/AgchainProjectSwitcher.test.tsx`

**Step 1:** Add a minimal styling seam so the selector trigger can render full-width inside the left rail without breaking current dropdown behavior.
**Step 2:** Keep the searchable popover, focus switching, last-known-label behavior, and project-registry footer link unchanged.
**Step 3:** Update the selector test module to assert the rail-compatible trigger contract while preserving the current interaction tests.

**Test command:** `cd web && npx vitest run src/components/agchain/AgchainProjectSwitcher.test.tsx`
**Expected output:** `AgchainProjectSwitcher.test.tsx` passes and still covers visible label, searchable dropdown, focus switching, stable label during refresh, and registry navigation.

**Commit:** `feat: adapt agchain selector for rail placement`

## Task 4: Recompose The AGChain Shell

**File(s):** `web/src/components/layout/AgchainShellLayout.tsx`, `web/src/components/layout/AgchainShellLayout.test.tsx`

**Step 1:** Remove `AgchainProjectSwitcher` from `TopCommandBar.primaryContext`.
**Step 2:** Pass `AgchainProjectSwitcher` into the new left-rail header-content slot so it renders below the AGChain brand and above the AGChain nav.
**Step 3:** Preserve the current hidden-search top command bar behavior and the benchmark-definition secondary rail logic unchanged.

**Test command:** `cd web && npx vitest run src/components/layout/AgchainShellLayout.test.tsx`
**Expected output:** The shell layout tests pass and confirm the selector now lives in the rail while the second-rail route behavior stays intact.

**Commit:** `feat: move agchain selector into left rail`

## Task 5: Run The Focused AGChain Verification Slice

**File(s):** `web/src/components/layout/AgchainShellLayout.test.tsx`, `web/src/components/shell/LeftRailShadcn.test.tsx`, `web/src/components/agchain/AgchainProjectSwitcher.test.tsx`

**Step 1:** Run the focused shell and selector tests together.
**Step 2:** If a shell-layout assertion regresses on the benchmark-definition route, fix it before widening verification.
**Step 3:** Confirm that no unrelated backend or migration files were touched.

**Test command:** `cd web && npx vitest run src/components/layout/AgchainShellLayout.test.tsx src/components/shell/LeftRailShadcn.test.tsx src/components/agchain/AgchainProjectSwitcher.test.tsx`
**Expected output:** All targeted AGChain selector/rail tests pass with no backend test involvement required.

**Commit:** `test: verify agchain left-rail selector relocation`
