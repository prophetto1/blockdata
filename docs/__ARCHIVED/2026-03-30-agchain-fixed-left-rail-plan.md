# AGChain Fixed Left Rail Implementation Plan

**Goal:** Remove the AGChain-specific ability to collapse the primary side rail into the narrow snapped state so the AGChain app shell always presents its project selector and level-1 navigation in the full left-rail layout.

**Architecture:** Keep the shared `LeftRailShadcn` component generic for the rest of the product, but stop `AgchainShellLayout.tsx` from opting into compact-mode behavior. Remove the AGChain-owned local-storage seam for desktop rail open state and rail width, remove the resize handle that only exists while the AGChain rail is expanded, and render the AGChain rail at the standard expanded shell width while preserving the existing overview-first route family, benchmark rail-2 behavior, and left-rail project-selector placement.

**Tech Stack:** React, TypeScript, React Router, existing shell layout primitives, Vitest.

## Source Documents

- `docs/plans/2026-03-30-agchain-overview-first-project-shell-replacement-plan.md`
- `docs/plans/2026-03-30-agchain-shell-selector-registry-regression-correction-v2-plan.md`
- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/layout/AgchainShellLayout.test.tsx`
- `web/src/components/shell/LeftRailShadcn.tsx`
- `web/src/components/shell/LeftRailShadcn.test.tsx`
- User request on 2026-03-30: AGChain should not allow the side rail to reduce into the narrower snapped position.

## Revision Basis

This plan supersedes the AGChain-specific portion of the March 30 regression-correction batch that restored persisted AGChain rail open-state and width behavior. The shared shell still supports compact mode for other surfaces, but AGChain no longer needs or wants that affordance.

## Current-State Assessment

### What is wrong right now

- `AgchainShellLayout.tsx` still owns `agchain.shell.nav_open_desktop` and `agchain.shell.sidebar_width`.
- The AGChain rail passes `desktopCompact={!desktopNavOpened}` and `onToggleDesktopCompact={toggleDesktopCompact}` into `LeftRailShadcn`, which is what causes the AGChain collapse icon and snapped compact state to appear.
- The AGChain shell still renders a resize separator and persists width changes, even though the user wants the AGChain side rail locked in the expanded layout.
- Current AGChain layout tests still assert that AGChain restores persisted compact state and width from local storage, which would preserve the behavior the user now wants removed.

## Manifest

### Platform API

No platform API changes. AGChain shell collapse behavior is purely browser-owned layout state.

### Observability

No observability changes. This batch removes a local-only UI affordance and does not alter any traced runtime seam, network request, or backend-owned decision path.

### Database Migrations

No database migrations.

### Edge Functions

No edge-function changes.

### Frontend Surface Area

| File | Change |
|------|--------|
| `web/src/components/layout/AgchainShellLayout.tsx` | Remove AGChain-owned compact/open-state and width persistence, stop passing compact/toggle props into the shared rail, remove the AGChain resize handle, and pin the rail width to the standard expanded shell width while preserving benchmark rail-2 behavior. |
| `web/src/components/layout/AgchainShellLayout.test.tsx` | Replace persisted compact/open-state coverage with assertions that AGChain always renders the expanded rail width and no longer carries AGChain-specific compact-mode persistence assumptions. |

## Pre-Implementation Contract

### Locked Product Decisions

1. AGChain always renders its primary rail in the expanded desktop layout.
2. AGChain no longer exposes the collapse icon or the snapped compact state.
3. AGChain no longer persists desktop rail open state or AGChain-specific rail width in local storage.
4. AGChain no longer exposes the desktop drag-resize separator.
5. The shared `LeftRailShadcn` compact-mode behavior remains intact for non-AGChain shells; this batch does not refactor or remove that generic capability.
6. The AGChain selector remains below the `BlockData Bench` brand and above the locked 8-item AGChain primary navigation.
7. The AGChain benchmark-definition secondary rail behavior remains unchanged.

### Locked Acceptance Contract

1. Visiting any AGChain route renders `[data-testid="agchain-platform-rail"]` at `styleTokens.shell.navbarWidth`.
2. AGChain no longer reads from or writes to `agchain.shell.nav_open_desktop` or `agchain.shell.sidebar_width`.
3. AGChain no longer passes `desktopCompact` or `onToggleDesktopCompact` into `LeftRailShadcn`.
4. Existing AGChain navigation, selector rendering, and benchmark-definition rail-2 layout continue to work unchanged.
5. `AppLayout.tsx` and `LeftRailShadcn.tsx` behavior for the rest of the product remains unchanged.

### Locked Platform API Surface

#### New platform API endpoints: `0`

#### Existing platform API endpoints modified: `0`

#### Existing platform API endpoints reused as-is: `0`

### Locked Observability Surface

#### New traces: `0`

#### New metrics: `0`

#### New structured logs: `0`

### Locked Inventory Counts

#### Frontend runtime

- Modified files: `1`
- New files: `0`
- Deleted files: `0`

#### Tests

- Modified files: `1`
- New files: `0`
- Deleted files: `0`

#### Backend/runtime

- Modified files: `0`

### Locked File Inventory

#### New files

- None.

#### Modified existing files

- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/layout/AgchainShellLayout.test.tsx`

#### Deleted files

- None.

#### Not modified

- `web/src/components/shell/LeftRailShadcn.tsx`
- `web/src/components/shell/LeftRailShadcn.test.tsx`
- `web/src/components/agchain/AgchainProjectSwitcher.tsx`
- `web/src/components/agchain/AgchainLeftNav.tsx`
- `web/src/components/layout/AppLayout.tsx`

## Frozen Shell Contract

### AGChain left-rail behavior contract

- Use `styleTokens.shell.navbarWidth` as the fixed AGChain rail width.
- Keep the rail mounted as the existing fixed desktop aside at the left edge.
- Preserve the existing `TopCommandBar`, route outlet, and benchmark rail-2 positioning math, but compute the base rail width from the fixed expanded width rather than from AGChain-owned open/compact state.

### Shared-shell boundary contract

- `LeftRailShadcn` remains the owner of generic compact-mode UI for other app shells.
- AGChain opts out by not passing compact-mode props, rather than by mutating the generic component.

## Explicit Risks Accepted In This Plan

- Stale AGChain local-storage keys may remain in browsers after rollout. That is acceptable because AGChain will no longer read them.
- This batch does not attempt to normalize all shell-width behavior across the product; it only removes AGChain’s collapse/resizer seam.

## Completion Criteria

- AGChain no longer shows the collapse affordance.
- AGChain no longer enters the compact snapped rail state.
- AGChain no longer persists AGChain-specific rail width or open state.
- AGChain layout tests encode the fixed expanded-rail contract.
- Targeted AGChain layout tests pass.

## Task 1: Lock the fixed-rail AGChain contract in tests

- `web/src/components/layout/AgchainShellLayout.test.tsx`

**Step 1:** Remove the current tests that assert AGChain restores compact/open-state and resizable-width behavior from AGChain local storage.
**Step 2:** Add tests proving AGChain renders the project selector inside the rail header in the expanded state without relying on `desktopCompact`.
**Step 3:** Add tests proving the AGChain rail width is the fixed standard width and that stale AGChain local-storage keys do not change the rendered width or compact state.
**Test command:** `cd web && npx vitest run src/components/layout/AgchainShellLayout.test.tsx --reporter=verbose`
**Expected output:** Updated AGChain layout tests fail against the current implementation and describe the fixed-rail contract.
**Commit:** `test: lock agchain fixed rail contract`

## Task 2: Remove AGChain compact-mode and resize behavior

- `web/src/components/layout/AgchainShellLayout.tsx`

**Step 1:** Remove `AGCHAIN_DESKTOP_NAV_OPEN_KEY`, `AGCHAIN_SIDEBAR_WIDTH_KEY`, and the AGChain-owned `desktopNavOpened` / `sidebarWidth` state plus all related `localStorage` effects.
**Step 2:** Replace the AGChain rail-width calculation with a fixed base width of `styleTokens.shell.navbarWidth`, still adding `AGCHAIN_RAIL_2_WIDTH` only when the benchmark-definition secondary rail is mounted.
**Step 3:** Stop passing `desktopCompact` and `onToggleDesktopCompact` into `LeftRailShadcn`.
**Step 4:** Remove the AGChain-only resize separator and drag handlers.
**Step 5:** Preserve the existing selector placement, nav sections, sign-out behavior, and benchmark-definition route-specific secondary rail.
**Test command:** `cd web && npx vitest run src/components/layout/AgchainShellLayout.test.tsx --reporter=verbose`
**Expected output:** AGChain layout tests pass with the fixed expanded-rail behavior.
**Commit:** `fix: remove agchain rail collapse behavior`

## Task 3: Run final frontend verification

- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/layout/AgchainShellLayout.test.tsx`

**Step 1:** Run the targeted AGChain shell test file.
**Step 2:** Run the web build to catch any TypeScript or bundling regressions outside the test seam.
**Test command:** `cd web && npx vitest run src/components/layout/AgchainShellLayout.test.tsx --reporter=verbose && npm run build`
**Expected output:** Vitest passes for the AGChain shell contract and the web build completes successfully.
**Commit:** `chore: verify agchain fixed rail change`
