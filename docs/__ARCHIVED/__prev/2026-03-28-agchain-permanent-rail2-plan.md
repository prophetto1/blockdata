# AGChain Permanent Rail 2 Implementation Plan

**Goal:** Replace the overlay drill pattern for benchmark sub-sections with a permanent second rail, following the AdminShellLayout composition pattern (LeftRailShadcn as Rail 1, purpose-built component as Rail 2) while using Braintrust's measured dimensions and typography for all visual properties.

**Architecture:** Modify `AgchainShellLayout` in-place. Keep `LeftRailShadcn` as Rail 1 (unchanged shared component). Add a second `<aside>` for Rail 2 containing a new `AgchainBenchmarkNav` component that renders the 9 benchmark sub-sections via hash-based links. Rail 2 is conditionally rendered only on benchmark detail routes (`/app/agchain/benchmarks/:benchmarkId`). Remove the `BENCHMARK_DRILL` config and its drill-based navigation so users never see both the overlay drill and the permanent rail simultaneously. Clean up dead benchmark-specific code in `LeftRailShadcn` and `nav-config.ts`.

**Tech Stack:** React + TypeScript, Tailwind CSS, React Router, Vitest.

**Status:** Draft
**Date:** 2026-03-28

---

## Manifest

### Platform API

No platform API changes.

### Observability

No observability changes. This is a frontend-only shell redesign.

### Database Migrations

No database migrations.

### Edge Functions

No edge function changes.

### Frontend Surface Area

**New pages:** `0`

**New components:** `1`

| Component | File | Used by |
|-----------|------|---------|
| `AgchainBenchmarkNav` | `web/src/components/agchain/AgchainBenchmarkNav.tsx` | `AgchainShellLayout` — renders Rail 2 content on benchmark detail routes |

**Modified components:** `3`

| File | What changes |
|------|--------------|
| `web/src/components/layout/AgchainShellLayout.tsx` | Replace resizable single-rail layout with fixed-width two-rail layout. Remove resize state/handler/localStorage. Add second `<aside>` for Rail 2, conditionally rendered when pathname matches a benchmark detail route. Set Rail 1 to fixed 224px, Rail 2 to fixed 224px. Adjust header and main content offsets accordingly. |
| `web/src/components/agchain/AgchainLeftNav.tsx` | Remove `drillId: 'benchmark'` from the Benchmarks nav item. The drill is replaced by Rail 2. |
| `web/src/components/shell/nav-config.ts` | Remove `BENCHMARK_DRILL` constant. Remove it from `DRILL_CONFIGS` array. Remove `resolveBenchmarkDrillPath` export. |

**Dead code cleanup:** `1`

| File | What changes |
|------|--------------|
| `web/src/components/shell/LeftRailShadcn.tsx` | Remove `extractBenchmarkId` private function (dead after BENCHMARK_DRILL removal). Remove `resolveBenchmarkDrillPath` import. Remove benchmark-specific branches in `renderDrillView` (`benchmarkId` variable, `resolveBenchmarkDrillPath` call, `config.id === 'benchmark'` checks). No behavioral change — these code paths can never execute after BENCHMARK_DRILL is removed from DRILL_CONFIGS. |

**Modified test files:** `1`

| File | What changes |
|------|--------------|
| `web/src/components/layout/AgchainShellLayout.test.tsx` | Fix the currently-failing test. Update to test: Rail 2 absent on non-benchmark routes, Rail 2 present on benchmark detail routes, active hash highlighting. |

**Not modified:**

| File | Why |
|------|-----|
| `web/src/router.tsx` | Shell element stays `AgchainShellLayout` — modified in-place, not replaced |
| `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.tsx` | Already reads `location.hash` cleanly, no inline tab bar to remove |

---

## Pre-Implementation Contract

No major product, API, or inventory decision may be improvised during implementation. If any item below needs to change, the implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. **AdminShellLayout composition pattern.** Rail 1 is `LeftRailShadcn` (unchanged shared component). Rail 2 is a standalone component in a separate `<aside>`. This matches the existing two-rail pattern at `web/src/components/layout/AdminShellLayout.tsx`.
2. **Braintrust visual dimensions.** Rail widths, nav item typography, icon sizes, and spacing follow the Braintrust reference measurements extracted via Playwright (documented below). These override Admin's values and the previous draft plan's adapted values.
3. **Rail 1 is fixed-width, not resizable.** The current resize handle and localStorage persistence are removed. Braintrust uses fixed-width rails and the resize complexity is not justified for the AGChain shell.
4. **Rail 2 is conditional.** Rendered only when the pathname matches `/app/agchain/benchmarks/:benchmarkId`. On all other AGChain routes (benchmark list, models, runs, results, observability), only Rail 1 is visible. This avoids wasting 224px of empty space on pages with no secondary nav content.
5. **Header stays at 60px.** Changing to Braintrust's 44px would require modifying `LeftRailShadcn`'s internal brand area height (hardcoded at `h-[60px]`) to avoid a visual seam. That shared component modification is out of scope for this plan. Header height can be addressed in a follow-up.
6. **Hash-based sub-section routing is preserved.** Rail 2 renders links that navigate to `/app/agchain/benchmarks/:benchmarkId#steps`, `#questions`, etc. The workbench page continues to read `location.hash` to determine active content. No router tree changes.
7. **BlockData's main app shell is not touched.** `AppLayout.tsx`, `LeftRailShadcn.tsx` (behavioral), and all BlockData navigation stay as-is.
8. **Rail 1 active item matches the current top-level section.** When viewing `/app/agchain/benchmarks/legal-10#scoring`, "Benchmarks" is active in Rail 1 and "Scoring" is active in Rail 2.

### Dimension Contract

Source: Braintrust reference measurements (extracted from live site via Playwright).

| Element | Value | Tailwind |
|---------|-------|----------|
| Rail 1 width | 224px fixed | `w-[224px]` |
| Rail 2 width | 224px fixed | `w-[224px]` |
| Header height | 60px (unchanged this phase) | — |
| Nav item height | 28px | `h-7` |
| Nav item font | 13px, font-weight 500 | `text-[13px] font-medium` |
| Nav item padding | 8px horizontal | `px-2` |
| Nav icon size | 14px | `size={14}` |
| Icon-to-text gap | 10px | `gap-2.5` |
| Inactive text (Rail 2) | `text-foreground/70` | zinc-700 equivalent |
| Active text (Rail 2) | `text-foreground font-semibold` | black equivalent |
| Active background (Rail 2) | `bg-accent` | — |
| Row spacing | 0px (no gap between items) | `space-y-0` |
| Rail 2 background | `var(--background)` (page bg) | — |
| Rail 2 left border | 1px `var(--sidebar-border)` | `border-l border-sidebar-border` |

Rail 1 typography is already Braintrust-correct via `LeftRailShadcn`'s `renderSectionsNav` (13px/500/h-7/px-2/gap-2.5/14px icons). No changes needed there.

### Frozen Seam Contract

**LeftRailShadcn is not behaviorally modified.** Only dead code is removed (benchmark-specific branches that can never execute after BENCHMARK_DRILL removal). All existing drill behavior for other drills (flows, settings, ingest, build-ai, connections, workbench, pipeline-services, observability) is preserved.

**The drill system in nav-config.ts survives.** Only the `BENCHMARK_DRILL` entry is removed. `DRILL_CONFIGS`, `getDrillConfig`, `findDrillByRoute`, and all other drill configs are unchanged.

**The workbench page's hash reading is unchanged.** `AgchainBenchmarkWorkbenchPage` continues to use `useLocation().hash` and `SECTION_LABELS` exactly as today. Rail 2 navigates by setting the hash, not by changing routes.

---

## Risks

1. **Layout shift on navigation.** When a user clicks from the benchmark list into a benchmark detail, Rail 2 appears and the main content area narrows by 224px. This is intentional and matches Braintrust behavior, but content may reflow. Acceptable.
2. **Rail 2 on stale benchmark IDs.** If a user navigates to `/app/agchain/benchmarks/:id` with an invalid ID, Rail 2 still appears. This matches current drill behavior and is acceptable.

---

## Completion Criteria

1. AGChain pages at `/app/agchain/benchmarks`, `/app/agchain/models`, etc. render with a single 224px rail and 60px header.
2. AGChain benchmark detail at `/app/agchain/benchmarks/:benchmarkId` renders with two 224px rails and the 9 sub-sections in Rail 2.
3. Clicking a Rail 2 item navigates to the correct `#hash` and highlights the active item.
4. Rail 1 highlights "Benchmarks" when on any benchmark route.
5. No overlay drill activates when navigating to benchmark detail routes.
6. All BlockData main-app navigation (Assets, Ingest, Connections, etc.) is unchanged.
7. The `AgchainShellLayout` test suite passes (currently failing — must be green after this work).
8. Full frontend test suite passes with no broken imports.

---

## Locked Inventory Counts

### Frontend

- New components: `1` (`AgchainBenchmarkNav`)
- Modified components: `3` (`AgchainShellLayout`, `AgchainLeftNav`, `nav-config.ts`)
- Dead code cleanup: `1` (`LeftRailShadcn`)
- Modified test files: `1` (`AgchainShellLayout.test.tsx`)
- New test files: `0`

### Locked File Inventory

#### New files

- `web/src/components/agchain/AgchainBenchmarkNav.tsx`

#### Modified files

- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/layout/AgchainShellLayout.test.tsx`
- `web/src/components/agchain/AgchainLeftNav.tsx`
- `web/src/components/shell/nav-config.ts`
- `web/src/components/shell/LeftRailShadcn.tsx`

---

## Task Plan

### Task 1: Create the `AgchainBenchmarkNav` component

**File(s):** `web/src/components/agchain/AgchainBenchmarkNav.tsx`

**Step 1:** Create the file. The component receives `benchmarkId: string` as a prop. It reads `useLocation().hash` to determine the active sub-section (default `#steps` when hash is empty).

**Step 2:** Define the 9 benchmark sub-sections inline (matching the icons and labels from the current `BENCHMARK_DRILL` in `nav-config.ts`):

- Steps (IconClipboardList, `#steps`)
- Questions (IconFileText, `#questions`)
- Context (IconLayoutDashboard, `#context`)
- State (IconDatabase, `#state`)
- Scoring (IconChartBar, `#scoring`)
- Models (IconAtom2, `#models`)
- Runner (IconPlayerPlay, `#runner`)
- Validation (IconTestPipe, `#validation`)
- Runs (IconActivity, `#runs`)

**Step 3:** Render as a `<nav>` with `data-testid="agchain-secondary-rail"`. Each item is a `<Link>` to `/app/agchain/benchmarks/${benchmarkId}${hash}`. Use Braintrust typography: `text-[13px] font-medium h-7 px-2 gap-2.5`, icons at `size={14} stroke={1.75}`. Active item: `bg-accent text-foreground font-semibold`. Inactive: `text-foreground/70 hover:bg-accent/50 hover:text-foreground`. Background: `var(--background)`.

**Test command:** `cd web && npx vitest run src/components/agchain/AgchainBenchmarkNav.test.tsx --reporter=verbose`
**Expected output:** 9 items render, active item highlighted for matching hash, default to `#steps` when no hash, correct hrefs.
**Commit:** `feat: add AgchainBenchmarkNav component for permanent Rail 2`

### Task 2: Remove benchmark drill from nav-config

**File(s):**
- `web/src/components/shell/nav-config.ts`
- `web/src/components/agchain/AgchainLeftNav.tsx`

**Step 1:** In `AgchainLeftNav.tsx`, remove `drillId: 'benchmark'` from the Benchmarks nav item (line 14). The item becomes: `{ label: 'Benchmarks', icon: IconPackages, path: '/app/agchain/benchmarks' }`.

**Step 2:** In `nav-config.ts`, remove the `BENCHMARK_DRILL` constant (lines 294–316).

**Step 3:** In `nav-config.ts`, remove `BENCHMARK_DRILL` from the `DRILL_CONFIGS` array (line 318).

**Step 4:** In `nav-config.ts`, remove the `resolveBenchmarkDrillPath` export function (lines 357–359).

**Step 5:** Verify no other files import `resolveBenchmarkDrillPath` or reference `BENCHMARK_DRILL` (confirmed by grep — only `LeftRailShadcn.tsx` imports `resolveBenchmarkDrillPath`, cleaned up in Task 3).

**Test command:** `cd web && npx vitest run --reporter=verbose`
**Expected output:** No broken imports from nav-config changes. Existing drill tests for other drills pass.
**Commit:** `refactor: remove BENCHMARK_DRILL, replace with permanent Rail 2`

### Task 3: Clean up dead benchmark code in LeftRailShadcn

**File(s):** `web/src/components/shell/LeftRailShadcn.tsx`

**Step 1:** Remove the `resolveBenchmarkDrillPath` import from the import block (line 32).

**Step 2:** Remove the `extractBenchmarkId` private function (lines 91–94).

**Step 3:** In `renderDrillView`, remove the `benchmarkId` variable assignment: `const benchmarkId = config.id === 'benchmark' ? extractBenchmarkId(location.pathname) : null;` (line 402).

**Step 4:** In `renderDrillView`, simplify the `resolvedPath` computation to remove the `benchmarkId` branch:
```typescript
const resolvedPath = flowId
  ? resolveFlowDrillPath(item.path, flowId)
  : item.path;
```

**Step 5:** In `renderDrillView`, simplify the `isActive` computation to remove the `benchmarkId` branch:
```typescript
const isActive = flowId
  ? location.pathname === resolvedPath || location.pathname.startsWith(resolvedPath + '/')
  : item.path === config.parentPath
    ? location.pathname === item.path
    : isItemActive(item, location.pathname);
```

**Step 6:** In `renderDrillView`, simplify the `isDisabled` computation:
```typescript
const isDisabled = config.id === 'flows' && !flowId;
```

**Test command:** `cd web && npx vitest run --reporter=verbose`
**Expected output:** Full test suite passes. No behavioral change — removed code paths were unreachable after Task 2.
**Commit:** `chore: remove dead benchmark drill code from LeftRailShadcn`

### Task 4: Wire Rail 2 into AgchainShellLayout

**File(s):** `web/src/components/layout/AgchainShellLayout.tsx`

**Step 1:** Add imports: `useLocation` from `react-router-dom`, `AgchainBenchmarkNav` from `@/components/agchain/AgchainBenchmarkNav`.

**Step 2:** Replace the resizable sidebar state with fixed-width constants:
```typescript
const AGCHAIN_RAIL_1_WIDTH = 224;
const AGCHAIN_RAIL_2_WIDTH = 224;
```

**Step 3:** Remove `sidebarWidth` state, `isResizingRef`, `handleResizeStart` callback, and the `SIDEBAR_WIDTH_KEY` constant. These are no longer needed with fixed-width rails.

**Step 4:** Add benchmark ID extraction from pathname:
```typescript
const location = useLocation();
const benchmarkMatch = location.pathname.match(/^\/app\/agchain\/benchmarks\/([^/]+)/);
const benchmarkId = benchmarkMatch ? decodeURIComponent(benchmarkMatch[1]!) : null;
const showRail2 = benchmarkId !== null;
const totalRailWidth = AGCHAIN_RAIL_1_WIDTH + (showRail2 ? AGCHAIN_RAIL_2_WIDTH : 0);
```

**Step 5:** Update the header's `insetInlineStart` to `${totalRailWidth}px`.

**Step 6:** Update the Rail 1 `<aside>` width to `${AGCHAIN_RAIL_1_WIDTH}px`. Remove the resize handle `<div role="separator" ...>` element.

**Step 7:** Add the Rail 2 `<aside>`, conditionally rendered when `showRail2` is true:
```tsx
{showRail2 && (
  <aside
    data-testid="agchain-secondary-rail"
    style={{
      position: 'fixed',
      insetBlock: 0,
      insetInlineStart: `${AGCHAIN_RAIL_1_WIDTH}px`,
      width: `${AGCHAIN_RAIL_2_WIDTH}px`,
      borderInlineStart: '1px solid var(--sidebar-border)',
      backgroundColor: 'var(--background)',
      zIndex: 19,
    }}
  >
    <AgchainBenchmarkNav benchmarkId={benchmarkId!} />
  </aside>
)}
```

**Step 8:** Update the main content `insetInlineStart` to `${totalRailWidth}px`.

**Test command:** `cd web && npx vitest run src/components/layout/AgchainShellLayout.test.tsx --reporter=verbose`
**Expected output:** Tests pass (after Task 5 updates the test file).
**Commit:** `feat: wire permanent Rail 2 into AgchainShellLayout`

### Task 5: Update the test suite

**File(s):** `web/src/components/layout/AgchainShellLayout.test.tsx`

**Step 1:** Update the existing test to remove the `agchain-secondary-rail` expectation on `/app/agchain/runs` (Rail 2 is not shown on non-benchmark routes).

**Step 2:** Add a test: on `/app/agchain/benchmarks/legal-10`, `agchain-secondary-rail` IS present.

**Step 3:** Add a test: on `/app/agchain/models`, `agchain-secondary-rail` is NOT present.

**Step 4:** Verify all other existing assertions still hold (platform rail, brand text, no "go to app", etc.).

**Test command:** `cd web && npx vitest run src/components/layout/AgchainShellLayout.test.tsx --reporter=verbose`
**Expected output:** All assertions pass. The previously-failing test is now green.
**Commit:** `test: fix AgchainShellLayout tests for permanent Rail 2`

### Task 6: Full test suite verification

**Step 1:** Run the full frontend test suite.

**Test command:** `cd web && npx vitest run --reporter=verbose`
**Expected output:** All tests pass. No broken imports from removed exports.
**Commit:** No commit — verification only.