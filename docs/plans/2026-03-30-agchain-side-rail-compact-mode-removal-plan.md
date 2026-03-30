# AGChain Side Rail Compact-Mode Removal Implementation Plan

**Goal:** Remove the AGChain app-shell behavior that collapses the primary side rail into its narrow snapped compact state, while preserving the current overview-first route family, the left-rail project selector, and desktop width resizing.

**Architecture:** Keep the change entirely inside the AGChain frontend shell. Retire AGChain-owned compact-state persistence and stop wiring the AGChain shell into the shared `LeftRailShadcn` compact-toggle affordance, while leaving the shared left-rail component, the main BlockData shell, the admin shell, routing, backend APIs, observability, and database seams unchanged.

**Tech Stack:** React + TypeScript, React Router, existing `AgchainShellLayout`, existing shared `LeftRailShadcn`, Vitest.

**Status:** Draft
**Author:** Codex for jwchu
**Date:** 2026-03-30

## Source Documents

Primary intent and inherited plan inputs:

- `docs/plans/2026-03-30-agchain-shell-selector-registry-regression-correction-v2-plan.md`
- `docs/plans/2026-03-30-agchain-overview-first-project-shell-replacement-plan.md`

Current implementation seams reviewed:

- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/layout/AgchainShellLayout.test.tsx`
- `web/src/components/shell/LeftRailShadcn.tsx`
- `web/src/components/shell/LeftRailShadcn.test.tsx`
- `web/src/components/layout/AppLayout.tsx`
- `web/src/components/layout/AdminShellLayout.tsx`

## Current-State Assessment

The current AGChain shell still allows the left rail to collapse into compact mode because `AgchainShellLayout.tsx` owns an AGChain-specific persisted open/compact state and passes both `desktopCompact={!desktopNavOpened}` and `onToggleDesktopCompact={toggleDesktopCompact}` into `LeftRailShadcn`.

That inherited design now conflicts with the current product direction:

1. The AGChain left rail now contains the focused-project selector directly under the AGChain brand.
2. Compact mode hides that selector and reduces the shell to icon-only navigation.
3. The user has explicitly stated that this snapped compact state is unnecessary and should not be allowed in AGChain.

The important implementation finding is that the unwanted affordance is AGChain-owned even though the icon is rendered by the shared rail component. AGChain can remove the behavior by changing only `AgchainShellLayout.tsx` and its tests. The shared rail component can stay unchanged because other shells still rely on its compact-mode contract.

## Manifest

### Platform API

No platform API changes.

Justification:

- the request changes only AGChain shell composition,
- no new route, endpoint, auth, or data contract is required,
- no backend-owned runtime seam is created or modified.

### Observability

No new observability work.

Justification:

- this is a frontend-only shell control removal,
- no traced server-owned path changes,
- no new runtime seam needs measurement to satisfy this request.

### Database Migrations

No database migrations.

### Edge Functions

No edge functions created or modified.

### Frontend Surface Area

**New pages/routes:** `0`

**New components:** `0`

**New hooks/services/libs:** `0`

**Modified existing layout files:** `1`

| File | What changes |
|------|--------------|
| `web/src/components/layout/AgchainShellLayout.tsx` | Remove AGChain compact-state persistence and stop exposing the compact toggle affordance while keeping desktop width resizing and current AGChain route ownership |

**Modified existing test files:** `1`

| File | What changes |
|------|--------------|
| `web/src/components/layout/AgchainShellLayout.test.tsx` | Replace compact-mode restoration coverage with AGChain-specific assertions that the shell always renders expanded and ignores stale compact-state storage |

## Pre-Implementation Contract

No major shell, routing, shared-component, or persistence decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. AGChain must not allow the primary side rail to enter compact/snapped mode.
2. The AGChain side rail remains permanently expanded on desktop, subject only to width resizing within the existing min/max width bounds.
3. The AGChain left-rail project selector remains visible at all times on desktop and is one reason compact mode is being removed.
4. This is an AGChain-only product decision. The main BlockData shell and the admin shell keep their current behavior in this batch.
5. The shared `LeftRailShadcn` compact-mode API is not removed in this batch; AGChain simply stops opting into it.
6. The AGChain overview-first route family, hidden benchmark-definition secondary rail, and current left-rail ordering remain unchanged.
7. Stale AGChain compact-state local storage must no longer control runtime behavior after this batch. A previously collapsed AGChain rail must render expanded after reload.
8. Desktop width resizing remains allowed in AGChain. This request removes compact mode, not width adjustment.

### Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. On `/app/agchain/overview`, the AGChain primary rail renders expanded by default.
2. On `/app/agchain/overview`, there is no control in the AGChain shell that collapses the primary rail into compact mode.
3. A stale `agchain.shell.nav_open_desktop=false` value no longer causes the AGChain rail to render compact after reload.
4. The focused-project selector remains visible in the AGChain rail header area after the change.
5. Desktop width resizing of the AGChain rail still works.
6. The hidden benchmark-definition second rail still appears only on `/app/agchain/settings/project/benchmark-definition`.
7. The main app shell and admin shell are unchanged in this batch.

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

- New pages/routes: `0`
- New components: `0`
- New hooks/services/libs: `0`
- Modified existing layout files: `1`
- Modified existing router/support files: `0`

#### Tests

- New test modules: `0`
- Modified existing test modules: `1`

#### Backend/runtime

- Modified platform-api files: `0`
- Modified migrations: `0`
- Modified edge-function files: `0`

### Locked File Inventory

#### New files

- none

#### Modified files

- `web/src/components/layout/AgchainShellLayout.tsx`
- `web/src/components/layout/AgchainShellLayout.test.tsx`

#### Not modified

- `web/src/components/shell/LeftRailShadcn.tsx`
- `web/src/components/shell/LeftRailShadcn.test.tsx`
- `web/src/components/layout/AppLayout.tsx`
- `web/src/components/layout/AdminShellLayout.tsx`
- `web/src/router.tsx`
- `services/platform-api/**`
- `supabase/migrations/**`
- `supabase/functions/**`

## Explicit Risks Accepted In This Plan

1. The AGChain shell will diverge intentionally from the main app shell by no longer supporting compact mode.
2. The obsolete AGChain compact-state storage key may remain in some browsers even if the runtime no longer uses it, unless the implementation explicitly removes it during shell mount.
3. This batch does not redesign the AGChain rail header; it only removes the compact-state behavior.

## Completion Criteria

The work is complete only when all of the following are true:

1. `AgchainShellLayout.tsx` no longer reads AGChain compact-state persistence to drive `desktopCompact`.
2. `AgchainShellLayout.tsx` no longer passes the compact-toggle callback into `LeftRailShadcn`.
3. AGChain shell tests prove stale compact-state storage no longer collapses the rail.
4. AGChain shell tests still prove the selector remains in the rail header and the benchmark secondary rail still mounts only on the hidden route.
5. No non-AGChain shell files were modified.

## Task 1: Lock the AGChain-only regression tests for compact-mode removal

**File(s):** `web/src/components/layout/AgchainShellLayout.test.tsx`

**Step 1:** Replace the inherited compact-state restoration test with a failing AGChain-specific test that seeds `agchain.shell.nav_open_desktop=false` and proves the AGChain rail still renders expanded.
**Step 2:** Add or update a test assertion that AGChain never drives the shared rail into compact mode for AGChain routes, whether by omitting the prop or by passing a false value.
**Step 3:** Add or update a test assertion that AGChain no longer passes a compact-toggle affordance into the shared rail seam.

**Test command:** `cd web && npx vitest run src/components/layout/AgchainShellLayout.test.tsx --reporter=verbose`
**Expected output:** The AGChain shell test suite fails before implementation because current AGChain behavior still restores compact mode from local storage and still wires the shared compact-toggle seam.

**Commit:** `test: lock agchain rail compact-mode removal`

## Task 2: Remove AGChain compact-state persistence and compact-toggle wiring

**File(s):** `web/src/components/layout/AgchainShellLayout.tsx`

**Step 1:** Remove the AGChain-owned compact open-state constant, state, and storage restore path from the shell.
**Step 2:** Keep `rail1Width` driven directly by the current desktop width state instead of a compact/expanded branch.
**Step 3:** Stop passing `desktopCompact={!desktopNavOpened}` and `onToggleDesktopCompact={toggleDesktopCompact}` into `LeftRailShadcn`.
**Step 4:** If needed for cleanup, remove or ignore the stale AGChain compact-state storage key so older browsers no longer reopen AGChain in compact mode.
**Step 5:** Preserve the existing desktop resize handle, benchmark secondary rail, top header offset, and selector-in-rail composition.

**Test command:** `cd web && npx vitest run src/components/layout/AgchainShellLayout.test.tsx --reporter=verbose`
**Expected output:** The updated AGChain shell tests pass and prove the rail stays expanded while the selector and benchmark-route behavior remain intact.

**Commit:** `refactor: remove agchain rail compact mode`

## Task 3: Run the AGChain shell verification sweep

**File(s):** none (verification only)

**Step 1:** Run the targeted AGChain shell test module after the implementation change.
**Step 2:** Run `cd web && npm run build` as the final compile verification command for the changed shell.
**Step 3:** In a browser session, verify `/app/agchain/overview` and `/app/agchain/settings/project/benchmark-definition` with any stale AGChain compact-state storage present.
**Step 4:** Confirm the rail stays expanded, the selector remains visible, width resizing still works, and the benchmark secondary rail behavior is unchanged.

**Test command:** `cd web && npx vitest run src/components/layout/AgchainShellLayout.test.tsx --reporter=verbose && npm run build`
**Expected output:** The AGChain shell tests pass, the web build exits successfully, and manual verification confirms compact mode is no longer available in AGChain.

**Commit:** no commit (verification only)
