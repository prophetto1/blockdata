# AGChain Rail 2 Shell Compliance Fixes

**Goal:** Fix three defects in the AGChain permanent Rail 2 implementation so that it follows the same layout rules as the AppLayout and AdminShellLayout shells.

**Architecture:** Two files touched. Rail 2 `<aside>` positioning fixed in `AgchainShellLayout`. Rail 2 surface color and border fixed in `AgchainBenchmarkNav`. No structural changes — same components, same composition, corrected properties.

**Tech Stack:** React + TypeScript, Tailwind CSS.

**Status:** Draft
**Date:** 2026-03-28

---

## Manifest

### Platform API

No platform API changes.
Justification: this batch only changes inline styles and className tokens in existing AGChain shell components. It does not add, remove, or modify routes, requests, auth boundaries, or response shapes.

### Observability

No observability changes.
Justification: this batch only corrects presentational shell layout and surface tokens. It does not alter runtime branching, async flow, or any monitored backend/frontend instrumentation seam.

### Database Migrations

No database migrations.
Justification: no tables, columns, constraints, or persisted data contracts are touched by these shell-only corrections.

### Edge Functions

No edge function changes.
Justification: the work is confined to local React component layout and styling; no Supabase edge path participates in the behavior being fixed.

### Frontend Surface Area

**Modified pages:** `0`
**Modified components:** `2`
**Modified hooks:** `0`
**Modified services:** `0`
**Modified files:** `2`
**Mount point:** AGChain shell secondary rail shown on benchmark detail routes under `/app/agchain/benchmarks/:benchmarkId`.

| File | What changes |
|------|--------------|
| `web/src/components/layout/AgchainShellLayout.tsx` | Rail 2 `<aside>`: change `insetBlock: 0` to `top: AGCHAIN_HEADER_HEIGHT, bottom: 0`. Remove `backgroundColor` from the aside (inner component owns it). Remove `borderInlineStart` from the aside (inner component owns it). |
| `web/src/components/agchain/AgchainBenchmarkNav.tsx` | Change `backgroundColor` from `var(--background)` to `var(--sidebar-accent)`. Add right border `border-r border-sidebar-border` to match AdminLeftNav's className pattern. |

---

## Defects Being Fixed

### Defect 1: Rail 2 overlaps the header

**Rule:** When a header exists, Rail 2 must start below it. AppLayout's Rail 1 can run full height because LeftRailShadcn has its own 60px brand area to fill the header zone. Rail 2 has no such internal structure — its nav items start at the top of the component and would render behind the header.

**AdminShellLayout gets away with `insetBlock: 0`** because it has no header at all. AGChain has a header, so Rail 2 must use `top: AGCHAIN_HEADER_HEIGHT`.

**Fix:** `AgchainShellLayout.tsx` Rail 2 aside: replace `insetBlock: 0` with `top: ${AGCHAIN_HEADER_HEIGHT}px, bottom: 0`.

### Defect 2: Rail 2 has wrong surface color

**Rule:** The aside container sets no background. The inner nav component owns its surface color. AdminShellLayout's Rail 2 aside has no backgroundColor. AdminLeftNav sets `backgroundColor: 'var(--sidebar-accent)'` on its `<nav>`.

**Fix:** Remove `backgroundColor` from the `AgchainShellLayout.tsx` Rail 2 aside. Change `AgchainBenchmarkNav.tsx` from `var(--background)` to `var(--sidebar-accent)`.

### Defect 3: Rail 2 missing right border

**Rule:** AdminLeftNav has `border-r border-sidebar-border` creating visual separation from the content area. The current implementation only has a left border on the aside.

**Fix:** Remove `borderInlineStart` from the aside (it was doubling up with the inner component anyway). Add `border-r border-sidebar-border` to `AgchainBenchmarkNav`'s `<nav>` className, matching AdminLeftNav's pattern exactly.

---

## Locked Decisions

1. Follow the AdminLeftNav pattern: aside is a positioning shell only, inner `<nav>` owns color and borders.
2. `var(--sidebar-accent)` is the correct Rail 2 surface token — same as AdminLeftNav.
3. Rail 2 top edge is `AGCHAIN_HEADER_HEIGHT` (60px) — same as the main content area's top offset.

---

## Completion Criteria

1. Rail 2 nav items are fully visible and do not render behind the header.
2. Rail 2 has a visually distinct surface color from both Rail 1 and the content area.
3. Rail 2 has a right border separating it from the content area.
4. All existing tests continue to pass.

---

## Task Plan

### Task 1: Fix Rail 2 aside positioning and delegation

**File:** `web/src/components/layout/AgchainShellLayout.tsx`

**Step 1:** On the Rail 2 `<aside>` style object, replace `insetBlock: 0` with `top: ${AGCHAIN_HEADER_HEIGHT}px` and `bottom: 0`.

**Step 2:** Remove `backgroundColor: 'var(--background)'` from the aside style.

**Step 3:** Remove `borderInlineStart: '1px solid var(--sidebar-border)'` from the aside style.

**Test command:** `cd web && npx vitest run src/components/layout/AgchainShellLayout.test.tsx --reporter=verbose`
**Expected output:** All 4 tests pass.
**Commit:** `fix(agchain): align rail2 aside shell`

### Task 2: Fix AgchainBenchmarkNav surface and borders

**File:** `web/src/components/agchain/AgchainBenchmarkNav.tsx`

**Step 1:** Change the `<nav>` style `backgroundColor` from `'var(--background)'` to `'var(--sidebar-accent)'`.

**Step 2:** Add `border-r border-sidebar-border` to the `<nav>` className (matching AdminLeftNav).

**Test command:** `cd web && npx vitest run src/components/agchain/AgchainBenchmarkNav.test.tsx --reporter=verbose`
**Expected output:** All 5 tests pass.
**Commit:** `fix(agchain): align benchmark rail surface`

### Task 3: Verify targeted rail shell slice

**Test command:** `cd web && npx vitest run src/components/layout/AgchainShellLayout.test.tsx src/components/agchain/AgchainBenchmarkNav.test.tsx --reporter=verbose`
**Expected output:** All 9 tests pass.
**Commit:** `test(agchain): verify rail2 shell fixes`
