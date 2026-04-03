# AGChain Two-Rail Shell Redesign Implementation Plan

**Goal:** Redesign the AGChain app shell from a single-rail drill pattern to a Braintrust-style two-rail layout where rail 1 is always visible and rail 2 appears contextually for benchmark detail sub-sections, while leaving the main BlockData app shell unchanged.

**Architecture:** Replace `AgchainShellLayout` with a new two-rail layout that renders both rails simultaneously when on a benchmark detail route. Rail 1 holds the 5 persistent nav items. Rail 2 holds the 9 benchmark sub-sections when the route matches `/app/agchain/benchmarks/:benchmarkId`. The header shrinks from 60px to 44px and gains a breadcrumb showing page context. The existing `LeftRailShadcn` component is not reused for AGChain — the two-rail layout is purpose-built to match the Braintrust proportions exactly. BlockData's main app shell continues to use `LeftRailShadcn` with the typography improvements already applied.

**Tech Stack:** React + TypeScript, Tailwind CSS, React Router.

**Status:** Draft
**Date:** 2026-03-28

---

## Verified Current State

Current AGChain shell components:

- `web/src/components/layout/AgchainShellLayout.tsx` — single-rail shell with resizable sidebar (220-350px), 60px header, `TopCommandBar`, renders `LeftRailShadcn` as `AgchainChromeRail`
- `web/src/components/agchain/AgchainLeftNav.tsx` — 5 nav items (Benchmarks with `drillId: 'benchmark'`, Models, Runs, Results, Observability)
- `web/src/components/shell/nav-config.ts` — `BENCHMARK_DRILL` config with 9 hash-based sections (Steps, Questions, Context, State, Scoring, Models, Runner, Validation, Runs)
- `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.tsx` — reads `location.hash` to determine active section, only `#steps` implemented, rest are placeholders
- `web/src/pages/agchain/AgchainPageFrame.tsx` — thin page wrapper (`min-h-full bg-background` + `flex w-full flex-col px-4`)
- Router: `/app/agchain/benchmarks/:benchmarkId` lazy-loads `AgchainBenchmarkWorkbenchPage`

Braintrust reference measurements (extracted from live site via Playwright):

| Property | Braintrust Value |
|---|---|
| Rail 1 width | 224px |
| Rail 2 width | 224px |
| Header height | 44px |
| Nav item height | 28px |
| Nav item font | Inter 13px / 500 weight |
| Nav item padding | 8px horizontal |
| Nav icon size | 14px |
| Icon-to-text gap | 10px |
| Inactive text color (light mode) | `rgb(63, 63, 70)` / zinc-700 |
| Active text color (light mode) | `rgb(0, 0, 0)` / black |
| Section label font | 12px / 400 weight / sentence case / zinc-500 |
| Rail 2 title font | 14px / 600 weight |
| Row spacing | 0px (no gap between items) |

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

**New components:** `2`

| Component | File | Used by |
|-----------|------|---------|
| `AgchainTwoRailShell` | `web/src/components/layout/AgchainTwoRailShell.tsx` | Router — replaces `AgchainShellLayout` as the shell element |
| `AgchainRail2Nav` | `web/src/components/agchain/AgchainRail2Nav.tsx` | `AgchainTwoRailShell` — renders rail 2 content based on current route |

**Modified files:** `4`

| File | What changes |
|------|--------------|
| `web/src/router.tsx` | Replace `AgchainShellLayout` element with `AgchainTwoRailShell` in the agchain route tree |
| `web/src/components/agchain/AgchainLeftNav.tsx` | Remove `drillId: 'benchmark'` from the Benchmarks item — drill navigation is replaced by rail 2 |
| `web/src/components/shell/nav-config.ts` | Remove `BENCHMARK_DRILL` config — no longer used by the new shell |
| `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.tsx` | Remove inline hash-tab navigation bar — section switching is now owned by rail 2 |

**Deprecated (not deleted this phase):** `1`

| File | Why |
|------|-----|
| `web/src/components/layout/AgchainShellLayout.tsx` | Replaced by `AgchainTwoRailShell`. Left in tree but no longer imported by router. Can be deleted in a cleanup pass. |

**New test files:** `1`

| File | Tests |
|------|-------|
| `web/src/components/layout/AgchainTwoRailShell.test.tsx` | Rail 2 visibility based on route; breadcrumb rendering; nav item active states |

---

## Locked Decisions

1. **BlockData's main app shell is not touched.** Only the AGChain shell changes. `LeftRailShadcn.tsx`, `AppLayout.tsx`, and all BlockData navigation stay as-is.
2. **Rail widths are fixed, not resizable.** Rail 1 = 200px, Rail 2 = 220px. The resizable drag handle from the current shell is dropped. The Braintrust reference uses fixed widths and the extra complexity of dual-resizable rails is not justified.
3. **Rail 2 appears only on benchmark detail routes.** When on `/app/agchain/benchmarks/:benchmarkId`, rail 2 is visible. On all other routes (benchmarks list, models, runs, results, observability), only rail 1 is visible.
4. **Hash-based sub-section routing is preserved.** Rail 2 renders links that navigate to `/app/agchain/benchmarks/:benchmarkId#steps`, `#questions`, etc. The workbench page continues to read `location.hash` to determine active content. This preserves existing behavior without changing the router tree.
5. **The header shows a breadcrumb**, not a bare title. Format: "Benchmarks" on list pages, "Benchmarks > [name]" on detail pages, "Models" on models page, etc.
6. **Rail 1 active item matches the current top-level section**, not the hash. When viewing `/app/agchain/benchmarks/legal-10#scoring`, "Benchmarks" is active in rail 1 and "Scoring" is active in rail 2.

---

## Layout Contract

### Single-rail state (list pages, non-benchmark pages)

```
┌──────────────────────────────────────────────────────┐
│ Header (44px)                                         │
│ [brand] [breadcrumb: "Benchmarks"]        [controls]  │
├──────────┬───────────────────────────────────────────┤
│ Rail 1   │ Main content                              │
│ 200px    │ flex-1                                    │
│          │                                           │
│ Bench... │ <Outlet />                                │
│ Models   │                                           │
│ Runs     │                                           │
│ Results  │                                           │
│ Observ.. │                                           │
├──────────┤                                           │
│ [user]   │                                           │
└──────────┴───────────────────────────────────────────┘
```

### Two-rail state (benchmark detail pages)

```
┌───────────────────────────────────────────────────────────┐
│ Header (44px)                                              │
│ [brand] [breadcrumb: "Benchmarks > Legal-10"] [controls]   │
├──────────┬───────────┬────────────────────────────────────┤
│ Rail 1   │ Rail 2    │ Main content                       │
│ 200px    │ 220px     │ flex-1                             │
│          │           │                                    │
│ Bench..◀ │ Steps     │ <Outlet />                         │
│ Models   │ Questions │                                    │
│ Runs     │ Context   │                                    │
│ Results  │ State     │                                    │
│ Observ.. │ Scoring   │                                    │
│          │ Models    │                                    │
│          │ Runner    │                                    │
│          │ Valid..   │                                    │
│          │ Runs      │                                    │
├──────────┤           │                                    │
│ [user]   │           │                                    │
└──────────┴───────────┴────────────────────────────────────┘
```

### Dimension contract

| Element | Value |
|---------|-------|
| Header height | 44px |
| Rail 1 width | 200px |
| Rail 2 width | 220px |
| Rail 1 bg | `var(--sidebar)` (existing) |
| Rail 2 bg | `var(--background)` (page background, like Braintrust) |
| Rail 2 left border | 1px `var(--sidebar-border)` |
| Nav item height | 28px (`h-7`) |
| Nav item font | 13px, font-weight 500 (medium) |
| Nav item padding | 8px horizontal (`px-2`) |
| Nav icon size | 14px |
| Icon-to-text gap | 10px (`gap-2.5`) |
| Inactive text | `text-sidebar-foreground/90` (rail 1), `text-foreground/70` (rail 2) |
| Active text | `text-sidebar-accent-foreground` (rail 1), `text-foreground font-semibold` (rail 2) |
| Active background | `bg-sidebar-accent` (rail 1), `bg-accent` (rail 2) |
| Row spacing | 1px (`space-y-px`) |
| Breadcrumb font | 14px, 600 weight |
| Rail 2 section title | Not used — rail 2 items are a flat list for benchmark sub-sections |

---

## Frozen Seam Contract

**BlockData app shell is untouched.** The `AppLayout.tsx`, `LeftRailShadcn.tsx`, `TopCommandBar.tsx`, and all main-app navigation continue to work exactly as they do today. The AGChain shell is a separate layout component mounted at a different router level.

**Hash routing is preserved.** The workbench page's `useLocation().hash` reading is unchanged. Rail 2 navigates by setting the hash, not by changing routes. This means the router tree does not change — only the shell wrapping the routes changes.

**Drill system in `nav-config.ts` is not removed, only the `BENCHMARK_DRILL` entry.** Other drills (flows, superuser) are unaffected. The `LeftRailShadcn` drill mechanism continues to work for BlockData's main app.

---

## Risks

1. The workbench page currently renders its own section-tab UI (reading `location.hash` and rendering tab headers). If that inline tab bar is not removed, users will see duplicate navigation (rail 2 + inline tabs). Task 4 addresses this.
2. Rail 2 visibility is route-based. If a user navigates to `/app/agchain/benchmarks/:id` with a stale or invalid benchmark ID, rail 2 still appears. This matches current drill behavior and is acceptable.

---

## Completion Criteria

1. AGChain pages at `/app/agchain/benchmarks`, `/app/agchain/models`, etc. render with a single 200px rail and 44px header.
2. AGChain benchmark detail at `/app/agchain/benchmarks/:benchmarkId` renders with two rails (200px + 220px) and the 9 sub-sections in rail 2.
3. Clicking a rail 2 item navigates to the correct `#hash` and highlights the active item.
4. The header breadcrumb shows the current page context.
5. All BlockData main-app navigation (Assets, Ingest, Connections, etc.) is unchanged.
6. The `AgchainTwoRailShell` test suite passes.

---

## Task Plan

### Task 1: Create the `AgchainTwoRailShell` layout component

**File(s):** `web/src/components/layout/AgchainTwoRailShell.tsx`

**Step 1:** Create the file with the layout grid: fixed header (44px), rail 1 (200px fixed), optional rail 2 (220px, shown when `benchmarkId` param exists), main content (flex-1).

**Step 2:** Use `useParams()` and `useLocation()` to determine:
- Whether a `benchmarkId` is present (show rail 2)
- The current top-level section for rail 1 active state
- The current hash for rail 2 active state
- Breadcrumb text

**Step 3:** Render rail 1 with the 5 AGChain nav items inline (not via `LeftRailShadcn`). Use the Braintrust typography specs: 13px/500/14px icons/28px height/8px padding.

**Step 4:** Render the header with brand ("BlockData Bench") on the left and breadcrumb text. 44px height.

**Step 5:** Render `<Outlet />` in the main content area.

**Test command:** `cd web && npx vitest run src/components/layout/AgchainTwoRailShell.test.tsx --reporter=verbose`
**Expected output:** Component renders, rail 2 absent on non-benchmark routes.
**Commit:** `feat: add AgchainTwoRailShell layout component`

### Task 2: Create the `AgchainRail2Nav` component

**File(s):** `web/src/components/agchain/AgchainRail2Nav.tsx`

**Step 1:** Create the component. It receives `benchmarkId: string` and `activeHash: string` props.

**Step 2:** Render the 9 benchmark sub-sections as nav items using the same typography spec as rail 1. Each item is a `<Link>` to `/app/agchain/benchmarks/${benchmarkId}${hash}`.

**Step 3:** Highlight the active item based on `activeHash`. Default to `#steps` when hash is empty.

**Test command:** `cd web && npx vitest run src/components/agchain/AgchainRail2Nav.test.tsx --reporter=verbose`
**Expected output:** 9 items render, active item highlighted, correct hrefs.
**Commit:** `feat: add AgchainRail2Nav component for benchmark sub-sections`

### Task 3: Wire the new shell into the router

**File(s):**
- `web/src/router.tsx`
- `web/src/components/agchain/AgchainLeftNav.tsx`

**Step 1:** In `router.tsx`, replace the `AgchainShellLayout` import with `AgchainTwoRailShell`. Change the `element` on the agchain route tree.

**Step 2:** In `AgchainLeftNav.tsx`, remove `drillId: 'benchmark'` from the Benchmarks nav item. The drill is now replaced by rail 2.

**Step 3:** Verify the app loads at `/app/agchain/benchmarks` and `/app/agchain/benchmarks/:id` with the new shell.

**Test command:** `cd web && npx vitest run src/router.test.tsx --reporter=verbose`
**Expected output:** AGChain routes render with the new shell.
**Commit:** `feat: wire AgchainTwoRailShell into router, remove benchmark drill`

### Task 4: Remove inline hash-tab navigation from the workbench page

**File(s):** `web/src/pages/agchain/AgchainBenchmarkWorkbenchPage.tsx`

**Step 1:** Remove the inline tab bar / hash-tab rendering that currently appears at the top of the workbench content. Section switching is now owned by rail 2.

**Step 2:** Keep the `useLocation().hash` reading and conditional rendering of section content — this still determines what the main content area shows.

**Step 3:** Verify the workbench page renders correctly within the new two-rail shell with no duplicate navigation.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainBenchmarkWorkbenchPage.test.tsx --reporter=verbose`
**Expected output:** Workbench renders within new shell, no inline tab bar, content still switches by hash.
**Commit:** `refactor: remove inline hash-tab nav from benchmark workbench, now in rail 2`

### Task 5: Clean up unused drill config

**File(s):** `web/src/components/shell/nav-config.ts`

**Step 1:** Remove the `BENCHMARK_DRILL` config object and its entry in the `NAV_DRILL_CONFIGS` array.

**Step 2:** Remove the `resolveBenchmarkDrillPath` helper function and its export.

**Step 3:** Remove the `extractBenchmarkId` helper function and its export.

**Step 4:** Verify no remaining imports reference these removed exports.

**Test command:** `cd web && npx vitest run --reporter=verbose`
**Expected output:** Full frontend test suite passes with no broken imports.
**Commit:** `chore: remove unused BENCHMARK_DRILL config and helpers`

### Task 6: Write test suite for the new shell

**File(s):** `web/src/components/layout/AgchainTwoRailShell.test.tsx`

**Step 1:** Test that rail 2 is NOT rendered when route is `/app/agchain/benchmarks` (list page).

**Step 2:** Test that rail 2 IS rendered when route is `/app/agchain/benchmarks/legal-10`.

**Step 3:** Test that rail 1 highlights "Benchmarks" when on any benchmark route.

**Step 4:** Test that rail 2 highlights the correct hash item.

**Step 5:** Test breadcrumb rendering: "Benchmarks" on list, "Benchmarks > legal-10" on detail.

**Test command:** `cd web && npx vitest run src/components/layout/AgchainTwoRailShell.test.tsx --reporter=verbose`
**Expected output:** All assertions pass.
**Commit:** `test: add AgchainTwoRailShell test suite`