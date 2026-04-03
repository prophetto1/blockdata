# Classic Nav Two-Rail Redesign Implementation Plan

**Goal:** Convert the classic nav view from a dense single-rail layout into a two-rail system where Rail 1 shows the same top-level items as pipeline view (with unified sizing) and Rail 2 appears as a second physical aside when a drill is active — rather than replacing Rail 1 content.

**Architecture:** Modify `LeftRailShadcn` so the `'classic'` nav style renders `PIPELINE_NAV` items in Rail 1 with pipeline sizing (`h-7`, `text-[13px]`). When a drill is active in classic mode, Rail 1 keeps showing top-level nav and reports the drill config externally via an `onDrillChange` callback prop. `AppLayout` reads that callback, stores the drill state, and mounts a new `ClassicDrillRail` component as a second physical `<aside>` when the nav is in classic mode with an active drill. Pipeline view is unchanged — drills still replace content in the single rail. The shrunken classic-specific sizing (`text-[10px]`, `h-6`, `px-1`) and the `renderClassicEntry` rendering path are removed since classic Rail 1 now renders the same items as pipeline view.

**Tech Stack:** React + TypeScript, existing `LeftRailShadcn`, existing `AppLayout`, existing `nav-config`, Vitest.

**Status:** Draft
**Author:** Codex for jwchu
**Date:** 2026-03-30

## Source of Truth

The user has already written target-behavior tests in:
- `web/src/components/shell/LeftRailShadcn.test.tsx`
- `web/src/components/shell/nav-config.test.ts`
- `web/src/components/layout/AppLayout.test.tsx`

These tests define the exact expected behavior. The implementation must make them pass.

## Verified Current State

### Already done (earlier in this session)
- `onDrillChange` prop added to `LeftRailShadcnProps` and accepted in destructuring
- `activeNav` always returns `PIPELINE_NAV` via `getActiveNav()` (not conditional on navStyle)
- `compactNav` always uses `PIPELINE_NAV.filter(isNavItem)` (not conditional on navStyle)
- `validDrillIds` uses `PIPELINE_NAV` only (not conditional on navStyle)
- `ALL_TOP_LEVEL_ITEMS` uses only `PIPELINE_TOP_LEVEL_ITEMS` (classic route items removed)
- `resolveFlowDrillPath` accepts full paths
- Workbench drill removed, Tests section added, Transform in Ingest, API in Connections

### Not yet done (this plan's scope)
- `isClassicView` sizing branches still active — classic uses `text-[10px]/h-6/px-1`
- `renderClassicEntry` function still exists and is called when `navStyle === 'classic'`
- When classic has an active drill, Rail 1 content is replaced (same as pipeline)
- `onDrillChange` callback is never called
- `AppLayout` does not pass `onDrillChange` to `LeftRailShadcn`
- `AppLayout` does not render a second aside (ClassicDrillRail)
- `ClassicDrillRail` component does not exist
- `styleTokens.ts` has no `navbarRail2Width`

## Manifest

### Platform API

No platform API changes. Frontend shell layout change only.

### Observability

No observability changes. Frontend shell layout change only.

### Database Migrations

No database migrations.

### Edge Functions

No edge functions created or modified.

### Frontend Surface Area

**New pages:** `0`

**New components:** `1`

| Component | File | Used by |
|-----------|------|---------|
| `ClassicDrillRail` | `web/src/components/shell/ClassicDrillRail.tsx` | `AppLayout.tsx` — renders the second physical rail when classic nav has an active drill |

**Modified components:** `2`

| Component | File | What changes |
|-----------|------|--------------|
| `LeftRailShadcn` | `web/src/components/shell/LeftRailShadcn.tsx` | Remove `isClassicView` sizing branches (unified pipeline sizing). Remove `renderClassicEntry` and the classic branch in `renderTopLevelNav`. When `navStyle === 'classic'` and drill is active, keep showing `renderTopLevelNav()` and call `onDrillChange`. Remove unused imports. |
| `AppLayout` / `AppShellInner` | `web/src/components/layout/AppLayout.tsx` | Pass `onDrillChange` to `LeftRailShadcn`. Store drill state. Mount `ClassicDrillRail` as second aside when classic drill is active. Adjust `mainInsetStart` and header `insetInlineStart`. |

**Modified support files:** `1`

| File | What changes |
|------|--------------|
| `web/src/lib/styleTokens.ts` | Add `navbarRail2Width: 224` |

## Pre-Implementation Contract

No major layout, sizing, or behavioral decision may be improvised during implementation. If any locked item below needs to change, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. Classic view uses the same item sizing as pipeline view (`h-7`, `text-[13px]`, `px-2`). The shrunken `text-[10px]` / `h-6` / `px-1` classic tokens are removed.
2. Classic view shows a second physical rail for drill content rather than replacing Rail 1.
3. Pipeline view behavior is completely unchanged by this plan.
4. The second rail width is 224px (matching AGChain Rail 2).
5. Classic Rail 1 renders `PIPELINE_NAV` items (already done — `activeNav = getActiveNav()` returns `PIPELINE_NAV` unconditionally).
6. `LeftRailShadcn` communicates drill state to `AppLayout` via `onDrillChange` callback prop.
7. Desktop compact mode and mobile nav are unchanged.
8. Dead classic rendering code (`renderClassicEntry`, `isClassicView` sizing branches, unused imports) is removed.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. In classic view, Rail 1 shows the same top-level items as pipeline view, with identical `h-7` / `text-[13px]` sizing.
2. In classic view, drill children (Knowledge Bases, Index Builder, Secrets, Account, etc.) do NOT appear inline in Rail 1.
3. When on `/app/settings/profile` in classic view, Settings is visible in Rail 1 but Account is NOT — the drill is reported externally via `onDrillChange`.
4. `AppLayout` mounts `ClassicDrillRail` when classic nav reports an active drill.
5. `AppLayout` does NOT mount `ClassicDrillRail` when pipeline nav reports an active drill.
6. Pipeline view drill behavior is unchanged — drills replace Rail 1 content in-place.
7. All 5 currently-failing tests pass.

### Locked Inventory Counts

#### Frontend

- New components: `1` (ClassicDrillRail)
- Modified components: `2` (LeftRailShadcn, AppLayout)
- Modified support files: `1` (styleTokens.ts)

#### Tests

- New test modules: `0` (ClassicDrillRail.test.tsx not required — AppLayout.test.tsx mocks it and tests the mount/unmount contract)
- Modified existing test modules: `0` (tests are already written by the user)

### Locked File Inventory

#### New files

- `web/src/components/shell/ClassicDrillRail.tsx`

#### Modified files

- `web/src/components/shell/LeftRailShadcn.tsx`
- `web/src/components/layout/AppLayout.tsx`
- `web/src/lib/styleTokens.ts`

## Frozen Seam Contract

### Pipeline view seam

Do not modify pipeline view rendering or drill behavior. When `navStyle === 'pipeline'`, the component must behave identically to before this plan.

### AGChain shell seam

Do not modify `AgchainShellLayout`, `AgchainLeftNav`, `AgchainBenchmarkNav`, or any AGChain route.

### Mobile nav seam

Do not modify the mobile drawer behavior. Two-rail applies to desktop only.

### Compact mode seam

Do not modify desktop compact (icon-only) mode.

## Explicit Risks Accepted In This Plan

1. Rail 1 + Rail 2 at 220px + 224px = 444px of left navigation. On a 1024px viewport that leaves 580px for content. Same as AGChain.
2. `TOP_LEVEL_NAV`, `CLASSIC_LEAF_ITEMS`, `ClassicNavSection`, `ClassicNavEntry`, `createClassicSection`, `isClassicNavSection`, and `renderClassicEntry` become dead code after classic Rail 1 switches to rendering `PIPELINE_NAV` items. They are cleaned up in this plan.
3. Classic view gains route-based auto-drill since `PIPELINE_NAV` items carry `drillId` properties.

## Completion Criteria

The work is complete only when all of the following are true:

1. All 5 currently-failing tests pass (3 in LeftRailShadcn.test.tsx, 2 in nav-config.test.ts).
2. All previously-passing tests continue to pass.
3. `ClassicDrillRail` component exists.
4. `AppLayout` mounts ClassicDrillRail on classic drill.
5. The locked file inventory matches implementation.

## Task 1: Unify classic sizing and remove classic rendering path in LeftRailShadcn

**File(s):** `web/src/components/shell/LeftRailShadcn.tsx`

**Step 1:** Remove the `isClassicView` sizing branches. Replace all conditional sizing with pipeline-only values:
- `railStackClass`: always `'space-y-px'`
- `railDividerClass`: always `'my-1 mx-2 h-px bg-sidebar-border'`
- `railItemClass`: always the pipeline value (`h-7`, `text-[13px]`, `px-2`, `gap-2.5`)
- `drillBackClass`: always the pipeline value
- `drillSectionLabelClass`: always the pipeline value
- All icon sizes: always `14`
- Remove the `isClassicView` variable

**Step 2:** Remove the `renderClassicEntry` function entirely.

**Step 3:** In `renderTopLevelNav`, remove the `if (navStyle === 'classic') { return renderClassicEntry(...) }` branch. All nav styles now use the same NavItem rendering path.

**Step 4:** In the SidebarContent render decision, when `navStyle === 'classic'` and `activeDrillConfig` is set, render `renderTopLevelNav()` instead of `renderDrillView()`. Add a `useEffect` that calls `onDrillChange(activeDrillConfig, drillBack)` when the drill changes in classic mode, and `onDrillChange(null, drillBack)` when the drill clears.

**Step 5:** Remove unused imports: `TOP_LEVEL_NAV`, `CLASSIC_LEAF_ITEMS`, `isClassicNavSection`, `ClassicNavEntry`.

**Test command:** `cd web && npx vitest run src/components/shell/LeftRailShadcn.test.tsx src/components/shell/nav-config.test.ts --reporter=verbose`
**Expected output:** All LeftRailShadcn and nav-config tests pass.

**Commit:** `refactor: unify classic nav to pipeline sizing with external drill reporting`

## Task 2: Create ClassicDrillRail component

**File(s):** `web/src/components/shell/ClassicDrillRail.tsx`

**Step 1:** Create a component that accepts `config: NavDrillConfig`, `onBack: () => void`, and uses `useLocation` for active-item highlighting.

**Step 2:** Render the drill's section items using the same `h-7`, `text-[13px]`, `px-2` sizing as pipeline drill items. Include a back button at top with a left chevron.

**Step 3:** Style with `var(--chrome, var(--background))` background, `border-inline-end: 1px solid var(--border)`, `overflow-y: auto`.

**Test command:** `cd web && npx vitest run src/components/layout/AppLayout.test.tsx --reporter=verbose`
**Expected output:** AppLayout tests pass (they mock ClassicDrillRail and test the mount/unmount contract).

**Commit:** `feat: add ClassicDrillRail component`

## Task 3: Mount ClassicDrillRail in AppLayout

**File(s):** `web/src/components/layout/AppLayout.tsx`, `web/src/lib/styleTokens.ts`

**Step 1:** Add `navbarRail2Width: 224` to `styleTokens.ts`.

**Step 2:** In `AppShellInner`, add state: `const [classicDrill, setClassicDrill] = useState<{ config: NavDrillConfig; back: () => void } | null>(null)`. Read `navStyle` from localStorage (or add a state variable).

**Step 3:** Pass `onDrillChange` callback to `LeftRailShadcn` that updates `classicDrill` state.

**Step 4:** Compute `showClassicRail2 = classicDrill !== null && navStyle is classic`. Render `ClassicDrillRail` as a second `<aside>` at `insetInlineStart: navbarWidth` with width `navbarRail2Width` when active.

**Step 5:** Adjust `mainInsetStart` and header `insetInlineStart` to include Rail 2 width when visible.

**Test command:** `cd web && npx vitest run src/components/layout/AppLayout.test.tsx src/components/shell/LeftRailShadcn.test.tsx src/components/shell/nav-config.test.ts --reporter=verbose`
**Expected output:** All tests pass.

**Commit:** `feat: mount classic drill as second rail in AppLayout`

## Task 4: End-to-end verification

**File(s):** All modified files.

**Step 1:** Run the full targeted test slice.

**Step 2:** Browser-based visual verification: classic view shows Rail 1 + Rail 2 on drill activation, pipeline view shows single-rail drill replacement.

**Test command:** `cd web && npx vitest run src/components/shell/LeftRailShadcn.test.tsx src/components/layout/AppLayout.test.tsx src/components/shell/nav-config.test.ts --reporter=verbose`
**Expected output:** All targeted tests pass with zero failures.

**Commit:** `test: verify classic nav two-rail redesign`