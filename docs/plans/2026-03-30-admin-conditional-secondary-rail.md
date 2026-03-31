# Admin Conditional Secondary Rail Implementation Plan

**Goal:** Make the superuser 2nd rail (secondary navigation) conditional — visible only when the current route has secondary nav content, hidden otherwise, with the main content area reclaiming the space.

**Architecture:** Export `getSecondaryNav` from `AdminLeftNav.tsx` so `AdminShellLayout.tsx` can evaluate whether secondary nav exists for the current route. Conditionally render the 2nd rail `<aside>` and dynamically adjust the main content `insetInlineStart` offset. No new components, hooks, or abstractions — the existing `getSecondaryNav` pure function already computes exactly what we need.

**Tech Stack:** React, TypeScript, Vitest

**Status:** Complete
**Author:** Jon
**Date:** 2026-03-30

---

## Pre-Implementation Contract

No major product or UI decision may be improvised during implementation. If any item below needs to change, the implementation must stop and this plan must be revised first.

### Locked Product Decisions

1. The 2nd rail is shown or hidden based on the return value of `getSecondaryNav(pathname)` — if empty array, no 2nd rail.
2. Routes with secondary nav today: `instance-config`, `worker-config`, `parsers-docling`, `document-views`. All other superuser routes get full-width main content.
3. No animation or transition for the show/hide — hard toggle.
4. No new components, hooks, or state management. This is a layout-level conditional using an existing pure function.

---

## Manifest

### Platform API

No platform API changes. This is a pure frontend layout change.

### Observability

No observability changes. No new traces, metrics, or logs.

### Database Migrations

No database migrations.

### Edge Functions

No edge functions created or modified.

### Frontend Surface Area

**New pages:** `0`
**New components:** `0`
**New hooks:** `0`

**Modified files:** `4`

| File | What changes |
|------|-------------|
| `web/src/components/admin/AdminLeftNav.tsx` | Export `getSecondaryNav` function |
| `web/src/components/layout/AdminShellLayout.tsx` | Import `getSecondaryNav`, add `useLocation`, conditionally render 2nd rail aside, dynamically compute `insetInlineStart` |
| `web/src/components/layout/__tests__/AdminShellLayout.test.tsx` | Update expectations: 2nd rail absent on index route, add test for route with secondary nav |
| `web/src/components/admin/__tests__/AdminLeftNav.test.tsx` | Add test verifying `getSecondaryNav` export contract |

---

## Locked Acceptance Contract

The implementation is only complete when all of the following are true:

1. Navigating to `/app/superuser/instance-config` shows the 2nd rail with Instance secondary nav items.
2. Navigating to `/app/superuser/worker-config` shows the 2nd rail with Worker secondary nav items.
3. Navigating to `/app/superuser/parsers-docling` shows the 2nd rail with Docling secondary nav items.
4. Navigating to `/app/superuser/audit` (or any route without secondary nav) does NOT render the 2nd rail aside, and the main content starts immediately after the 1st rail.
5. The main content area `insetInlineStart` is `sidebarWidth` (no 2nd rail) or `sidebarWidth + 184` (with 2nd rail) depending on the route.
6. All existing tests pass. New tests verify both states.

---

## Locked Inventory Counts

### Frontend

- New files: `0`
- Modified files: `4`

### Tests

- New test modules: `0`
- Modified test modules: `2`

---

## Tasks

### Task 1: Export `getSecondaryNav` from AdminLeftNav

**File(s):** `web/src/components/admin/AdminLeftNav.tsx`

**Step 1:** Add `export` keyword to the `getSecondaryNav` function declaration (line 105).

Change:
```ts
function getSecondaryNav(pathname: string): SecondarySection[] {
```
To:
```ts
export function getSecondaryNav(pathname: string): SecondarySection[] {
```

**Step 2:** Verify existing tests still pass.

**Test command:** `npx vitest run web/src/components/admin/__tests__/AdminLeftNav.test.tsx`
**Expected output:** All existing tests pass.

**Commit:** `feat: export getSecondaryNav from AdminLeftNav`

---

### Task 2: Add test for `getSecondaryNav` export contract

**File(s):** `web/src/components/admin/__tests__/AdminLeftNav.test.tsx`

**Step 1:** Add a test that imports `getSecondaryNav` and verifies:
- Returns non-empty array for `instance-config`
- Returns non-empty array for `worker-config`
- Returns non-empty array for `parsers-docling`
- Returns empty array for `audit` (a route without secondary nav)
- Returns empty array for `/app/superuser` (index)

**Test command:** `npx vitest run web/src/components/admin/__tests__/AdminLeftNav.test.tsx`
**Expected output:** All tests pass including new ones.

**Commit:** `test: verify getSecondaryNav export contract`

---

### Task 3: Make 2nd rail conditional in AdminShellLayout

**File(s):** `web/src/components/layout/AdminShellLayout.tsx`

**Step 1:** Add `useLocation` import from `react-router-dom` and import `getSecondaryNav` from `AdminLeftNav`.

**Step 2:** Inside `AdminShellLayout`, call `useLocation()` to get `pathname`. Compute:
```ts
const hasSecondaryRail = getSecondaryNav(pathname).length > 0;
```

**Step 3:** Conditionally render the 2nd rail `<aside>` — only when `hasSecondaryRail` is true.

**Step 4:** Update `mainStyle.insetInlineStart` to:
```ts
insetInlineStart: hasSecondaryRail
  ? `${sidebarWidth + ADMIN_SECONDARY_RAIL_WIDTH}px`
  : `${sidebarWidth}px`,
```

**Test command:** `npx vitest run web/src/components/layout/__tests__/AdminShellLayout.test.tsx`
**Expected output:** Existing tests may need updating (next task).

**Commit:** `feat: conditional 2nd rail in admin shell layout`

---

### Task 4: Update AdminShellLayout tests

**File(s):** `web/src/components/layout/__tests__/AdminShellLayout.test.tsx`

**Step 1:** Update the existing test that checks for `admin-secondary-rail` — on `/app/superuser` (index route), the 2nd rail should NOT be present. Change `expect(screen.getByTestId('admin-secondary-rail')).toBeInTheDocument()` to `expect(screen.queryByTestId('admin-secondary-rail')).not.toBeInTheDocument()`.

**Step 2:** Add a new test that renders at `/app/superuser/instance-config` and verifies the 2nd rail IS present.

**Step 3:** Add a test that renders at `/app/superuser/audit` and verifies the 2nd rail is NOT present.

**Test command:** `npx vitest run web/src/components/layout/__tests__/AdminShellLayout.test.tsx`
**Expected output:** All tests pass.

**Commit:** `test: update admin shell layout tests for conditional 2nd rail`

---

### Task 5: Run full test suite for affected area

**Step 1:** Run all admin and layout tests together.

**Test command:** `npx vitest run web/src/components/admin/ web/src/components/layout/`
**Expected output:** All tests pass, zero failures.

**Commit:** No commit — verification only.

---

## Explicit Risks Accepted In This Plan

1. No animation on show/hide. If the user navigates between a route with secondary nav and one without, the layout shift is instant. This is acceptable for a superuser-only admin area.
2. `getSecondaryNav` uses pathname prefix matching, which means any new superuser routes added later will default to no 2nd rail unless explicitly added to the function. This is the desired default.

## Completion Criteria

The work is complete only when all of the following are true:

1. The 2nd rail renders only for routes that have secondary navigation content.
2. The main content area reclaims the 184px when no 2nd rail is shown.
3. All modified test files pass.
4. No other tests are broken by the change.