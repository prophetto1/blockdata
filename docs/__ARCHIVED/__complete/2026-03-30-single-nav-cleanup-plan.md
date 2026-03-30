# Single Nav View Cleanup Implementation Plan

**Goal:** Remove the classic/pipeline nav style toggle and all classic-specific code so the BlockData side rail has one and only one navigation view — what is currently called "pipeline view" — with no toggle button, no style label, and no two-rail classic infrastructure.

**Architecture:** Delete the nav style toggle button, the `NavStyle` type, `getNavStyle`/`setNavStyle` functions, `TOP_LEVEL_NAV` array, `CLASSIC_LEAF_ITEMS` array, `ClassicNavSection`/`ClassicNavEntry` types, `isClassicNavSection`/`createClassicSection` helpers, the `onDrillChange` prop, the classic drill `useEffect`, and the `navStyle` state from `LeftRailShadcn`. Delete `ClassicDrillRail.tsx` entirely. Remove the Rail 2 mounting logic, `classicDrill` state, and `navbarRail2Width` from `AppLayout`. The remaining nav always renders `PIPELINE_NAV` items with drill-in/drill-out in a single rail. No user-facing toggle or style label exists.

**Tech Stack:** React + TypeScript, Vitest.

**Status:** Draft
**Author:** Codex for jwchu
**Date:** 2026-03-30

## Manifest

### Platform API

No platform API changes. Frontend cleanup only.

### Observability

No observability changes. Frontend cleanup only.

### Database Migrations

No database migrations.

### Edge Functions

No edge functions created or modified.

### Frontend Surface Area

**New pages:** `0`

**New components:** `0`

**Deleted components:** `1`

| Component | File | Why |
|-----------|------|-----|
| `ClassicDrillRail` | `web/src/components/shell/ClassicDrillRail.tsx` | No longer needed — classic two-rail mode is removed |

**Modified components:** `2`

| Component | File | What changes |
|-----------|------|--------------|
| `LeftRailShadcn` | `web/src/components/shell/LeftRailShadcn.tsx` | Remove `navStyle` state, `toggleNavStyle`, `onDrillChange` prop, classic drill `useEffect`, `isClassicView`, toggle button, all classic branches. Nav always renders `PIPELINE_NAV` with single-rail drill behavior. |
| `AppLayout` / `AppShellInner` | `web/src/components/layout/AppLayout.tsx` | Remove `ClassicDrillRail` import, `classicDrill` state, `handleDrillChange`, `showClassicRail2`, `rail2Width`, `onDrillChange` prop on LeftRailShadcn, Rail 2 aside. |

**Modified support files:** `2`

| File | What changes |
|------|--------------|
| `web/src/components/shell/nav-config.ts` | Remove `NavStyle` type, `NAV_STYLE_KEY`, `getNavStyle`, `setNavStyle`, `TOP_LEVEL_NAV`, `CLASSIC_LEAF_ITEMS`, `ClassicNavSection` type, `ClassicNavEntry` type, `isClassicNavSection`, `createClassicSection`. Keep `PIPELINE_NAV`, `DRILL_CONFIGS`, `ALL_TOP_LEVEL_ITEMS`, `SHARED_STATIC_SECTIONS`, all section definitions. |
| `web/src/lib/styleTokens.ts` | Remove `navbarRail2Width`. |

## Pre-Implementation Contract

No major decision may be improvised during implementation.

### Locked Product Decisions

1. There is one nav view. No toggle. No style label. No "Classic view" / "Pipeline view" text anywhere.
2. The remaining view is what was called "pipeline view" — `PIPELINE_NAV` items with single-rail drill-in/drill-out.
3. The `ClassicDrillRail` component and all two-rail infrastructure are deleted.
4. `localStorage` key `blockdata.nav.style` is no longer read or written. Stale values in existing browsers are harmless — they'll be ignored.
5. Desktop compact mode and mobile nav are unchanged.
6. AGChain shell is unchanged.

### Locked Acceptance Contract

1. The side rail shows nav items with drills. No toggle button appears at the bottom of the rail above the account card.
2. No text saying "Classic view" or "Pipeline view" appears anywhere in the UI.
3. Clicking a drillable item replaces Rail 1 content with the drill view. Back button returns to top-level nav. This is the only nav behavior.
4. No second aside (Rail 2) appears under any condition in the main app shell.
5. All previously-passing pipeline view tests continue to pass.

### Locked Inventory Counts

#### Frontend

- Deleted files: `2` (ClassicDrillRail.tsx, ClassicDrillRail.test.tsx)
- Modified components: `2` (LeftRailShadcn, AppLayout)
- Modified support files: `2` (nav-config.ts, styleTokens.ts)

#### Tests

- Deleted test modules: `1` (ClassicDrillRail.test.tsx — if it exists)
- Modified existing test modules: `3` (LeftRailShadcn.test.tsx, AppLayout.test.tsx, nav-config.test.ts)

### Locked File Inventory

#### Deleted files

- `web/src/components/shell/ClassicDrillRail.tsx`
- `web/src/components/shell/ClassicDrillRail.test.tsx` (if it exists)

#### Modified files

- `web/src/components/shell/LeftRailShadcn.tsx`
- `web/src/components/shell/LeftRailShadcn.test.tsx`
- `web/src/components/shell/nav-config.ts`
- `web/src/components/shell/nav-config.test.ts`
- `web/src/components/layout/AppLayout.tsx`
- `web/src/components/layout/AppLayout.test.tsx`
- `web/src/lib/styleTokens.ts`

## Frozen Seam Contract

### AGChain shell seam

Do not modify `AgchainShellLayout`, `AgchainLeftNav`, `AgchainBenchmarkNav`, or any AGChain route.

### Mobile nav seam

Do not modify the mobile drawer behavior.

### Compact mode seam

Do not modify desktop compact (icon-only) mode.

## Explicit Risks Accepted In This Plan

1. Users who had `blockdata.nav.style` set to `'classic'` in localStorage will see the pipeline view on next load. The stale key is harmless and ignored.
2. This removes the two-rail classic view that was just built in this session. That work served its purpose as an exploration — the decision is to simplify to one view.

## Completion Criteria

1. No toggle button or style label appears in the side rail.
2. No `ClassicDrillRail` component exists.
3. No `NavStyle` type, `getNavStyle`, `setNavStyle`, `TOP_LEVEL_NAV`, or `CLASSIC_LEAF_ITEMS` exist in nav-config.ts.
4. No `navbarRail2Width` exists in styleTokens.ts.
5. All tests pass.

## Task 1: Remove classic infrastructure from nav-config.ts

**File(s):** `web/src/components/shell/nav-config.ts`, `web/src/components/shell/nav-config.test.ts`

**Step 1:** Delete `ClassicNavSection` type, `ClassicNavEntry` type, `isClassicNavSection`, `createClassicSection`, `TOP_LEVEL_NAV`, `CLASSIC_LEAF_ITEMS`.

**Step 2:** Delete `NavStyle` type, `NAV_STYLE_KEY`, `getNavStyle`, `setNavStyle`.

**Step 3:** Update `isNavItem` parameter type to use `NavItem | 'divider'` instead of `ClassicNavEntry | NavItem | 'divider'`.

**Step 4:** Update nav-config.test.ts to remove any tests referencing classic structures.

**Test command:** `cd web && npx vitest run src/components/shell/nav-config.test.ts --reporter=verbose`
**Expected output:** All nav-config tests pass.

**Commit:** `refactor: remove classic nav infrastructure from nav-config`

## Task 2: Remove classic code from LeftRailShadcn

**File(s):** `web/src/components/shell/LeftRailShadcn.tsx`, `web/src/components/shell/LeftRailShadcn.test.tsx`

**Step 1:** Remove `navStyle` state, `toggleNavStyle` function, `setNavStyleState`. Remove imports: `getNavStyle`, `setNavStyle`, `type NavStyle`.

**Step 2:** Remove `onDrillChange` prop from `LeftRailShadcnProps` and destructuring.

**Step 3:** Remove the classic drill `useEffect` (the one that calls `onDrillChange`).

**Step 4:** Remove the `isClassicView` variable. Remove `navStyle !== 'classic'` condition from the drill render decision — drills always replace content.

**Step 5:** Remove the nav style toggle button (the `<div className="px-3 pb-1">` block near the bottom that renders "Classic view" / "Pipeline view").

**Step 6:** Update LeftRailShadcn.test.tsx to remove classic-specific tests (classic sizing, classic drill reporting, classic nav items).

**Test command:** `cd web && npx vitest run src/components/shell/LeftRailShadcn.test.tsx --reporter=verbose`
**Expected output:** All LeftRailShadcn tests pass.

**Commit:** `refactor: remove classic nav code from LeftRailShadcn`

## Task 3: Remove Rail 2 from AppLayout and delete ClassicDrillRail

**File(s):** `web/src/components/layout/AppLayout.tsx`, `web/src/components/layout/AppLayout.test.tsx`, `web/src/lib/styleTokens.ts`, `web/src/components/shell/ClassicDrillRail.tsx`

**Step 1:** Remove `ClassicDrillRail` import, `getNavStyle` import, `NavDrillConfig` import from AppLayout.

**Step 2:** Remove `classicDrill` state, `handleDrillChange` callback, `navStyle` variable, `showClassicRail2` variable, `rail2Width` computation.

**Step 3:** Remove the Rail 2 `<aside>` block that renders `ClassicDrillRail`.

**Step 4:** Remove `onDrillChange={handleDrillChange}` from the LeftRailShadcn mount.

**Step 5:** Simplify `mainInsetStart` back to `isMobile ? 0 : desktopNavbarWidth`.

**Step 6:** Remove `navbarRail2Width` from `styleTokens.ts`.

**Step 7:** Delete `web/src/components/shell/ClassicDrillRail.tsx` and `ClassicDrillRail.test.tsx` (if it exists).

**Step 8:** Update AppLayout.test.tsx to remove classic drill rail tests.

**Test command:** `cd web && npx vitest run src/components/layout/AppLayout.test.tsx src/components/shell/LeftRailShadcn.test.tsx src/components/shell/nav-config.test.ts --reporter=verbose`
**Expected output:** All tests pass.

**Commit:** `refactor: remove two-rail infrastructure and ClassicDrillRail`