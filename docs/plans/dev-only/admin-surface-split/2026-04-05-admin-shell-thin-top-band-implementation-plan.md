# Admin Shell Thin Top Band Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Standardize the Blockdata Admin, AGChain Admin, and Superuser shells so they share one thin full-width top band, a fully hideable left-side chrome stack, and the same open/closed behavior across all three surfaces.

**Architecture:** Keep the existing admin route split intact and implement the new behavior entirely inside the shared admin shell. Replace the current admin-shell "rails only" layout with a shell that owns a thin top band, renders breadcrumb context through the existing header-center plumbing, and hides the entire left-side chrome stack when collapsed so only the top band remains. Reuse the existing `LeftRailShadcn` navigation body, but allow the admin shell to suppress the rail's internal brand/header block because that role moves into the new top band.

**Tech Stack:** React 19, TypeScript, React Router, existing shell/header context, Ark UI, Tailwind utility classes, Vitest, Testing Library.

---

## Confirmed Product Contract

- Surfaces affected:
  - `/app/blockdata-admin/*`
  - `/app/agchain-admin/*`
  - `/app/superuser/*`
- Open state:
  - thin top band spans the full width of the viewport
  - top band visually fuses with the left rail using the same chrome background
  - no horizontal separator/color break between the top band and the rail
  - primary rail and optional secondary rail are visible below the top band
- Closed state:
  - the full left-side chrome stack is hidden
  - no compact/icon-only rail remains
  - only the thin top band remains across the full width of the page
- Toggle behavior:
  - toggle affordance lives in the thin top band at the far left
  - reopen restores the previous primary rail width
- Header content:
  - show route/page breadcrumb context from `useShellHeaderTitle`
  - keep behavior consistent across all three admin surfaces
- Backend:
  - no backend/API changes are required for this implementation

## Files To Modify

- Modify: `web/src/components/layout/AdminShellLayout.tsx`
- Modify: `web/src/components/layout/__tests__/AdminShellLayout.test.tsx`
- Modify: `web/src/components/shell/LeftRailShadcn.tsx`
- Modify: `web/src/lib/styleTokens.ts`

## Files To Create

- Create: `web/src/components/layout/AdminShellTopBand.tsx`

## Task 1: Add Failing Layout Tests For The New Admin Shell Contract

**Files:**
- Modify: `web/src/components/layout/__tests__/AdminShellLayout.test.tsx`
- Test: `cd web && npm run test -- src/components/layout/__tests__/AdminShellLayout.test.tsx`

**Step 1: Write failing tests**

Add tests that assert:
- a top band renders for admin routes
- the left-side chrome is visible by default
- clicking the top-band toggle hides the admin primary rail
- when hidden, the secondary rail also disappears
- when hidden, the outlet content still renders and the top band remains
- clicking the toggle again restores the rails

**Step 2: Run test to verify it fails**

Run:

```powershell
cd web
npm run test -- src/components/layout/__tests__/AdminShellLayout.test.tsx
```

Expected: FAIL because the admin shell currently has no top band and no hide/show state.

## Task 2: Add A Thin Shared Admin Top Band

**Files:**
- Create: `web/src/components/layout/AdminShellTopBand.tsx`
- Modify: `web/src/components/layout/AdminShellLayout.tsx`
- Modify: `web/src/lib/styleTokens.ts`

**Step 1: Create the top band component**

Implement a small shell component that:
- renders the far-left rail toggle
- renders breadcrumb/title context from `HeaderCenterContext`
- uses the same chrome background as the admin rail
- remains visible whether the rails are open or closed

**Step 2: Add a dedicated admin-shell header height token**

Add a thin admin shell header height token so the shell layout does not hardcode magic numbers.

## Task 3: Refactor AdminShellLayout To Own Open/Closed Chrome State

**Files:**
- Modify: `web/src/components/layout/AdminShellLayout.tsx`

**Step 1: Add persisted open/closed state**

Persist:
- admin rail width
- admin rail open/closed state

Use one shared state contract for all three admin surfaces.

**Step 2: Change shell geometry**

Implement layout rules so:
- top band is fixed at the top
- primary rail sits below the top band when open
- secondary rail sits below the top band when open
- main content starts below the top band in both open and closed states
- closed state removes all left-side chrome offsets from the content area

**Step 3: Provide breadcrumb context**

Wrap the admin shell with `HeaderCenterProvider` and render the current breadcrumb/title context in the top band so pages already using `useShellHeaderTitle` light up automatically.

## Task 4: Suppress The Rail’s Internal Header Block For Admin Shell Usage

**Files:**
- Modify: `web/src/components/shell/LeftRailShadcn.tsx`
- Modify: `web/src/components/layout/AdminShellLayout.tsx`

**Step 1: Add a targeted prop for header suppression**

Expose a prop on `LeftRailShadcn` that allows the admin shell to:
- hide the current brand/go-home/header-content block
- preserve the navigation body and footer behavior

**Step 2: Keep scope admin-specific**

Do not change the normal app shell interaction contract. The new suppression path should only be used by the admin shell.

## Task 5: Verify Green

**Files:**
- Test: `web/src/components/layout/__tests__/AdminShellLayout.test.tsx`
- Test: `web/src/router.admin-surfaces.test.ts`

**Step 1: Run focused layout tests**

```powershell
cd web
npm run test -- src/components/layout/__tests__/AdminShellLayout.test.tsx src/router.admin-surfaces.test.ts
```

Expected: PASS

**Step 2: Run lint or targeted type-safe verification if needed**

If touched files introduce lint-sensitive changes, run:

```powershell
cd web
npx eslint src/components/layout/AdminShellLayout.tsx src/components/layout/AdminShellTopBand.tsx src/components/layout/__tests__/AdminShellLayout.test.tsx src/components/shell/LeftRailShadcn.tsx src/lib/styleTokens.ts
```

Expected: PASS

## Notes And Assumptions

- This implementation deliberately does not move admin routes back under `AppLayout`.
- This implementation deliberately does not introduce a compact icon-only admin rail.
- This implementation deliberately keeps backend/admin access logic unchanged.
- If a page does not publish shell header context, the top band may show no breadcrumb content; current route files suggest the major admin surfaces already publish titles.
