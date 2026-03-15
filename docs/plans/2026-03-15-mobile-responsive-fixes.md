# Mobile Responsive Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix critical and major mobile responsiveness regressions so the app shell, header, popovers, and floating chat work correctly on phones (375px+) and tablets (768px+).

**Architecture:** All fixes target the existing component/CSS layer — no new components. The `useIsMobile()` hook (768px breakpoint) is already wired into `AppLayout`. We add mobile CSS overrides, constrain popovers/chat, and align the TopCommandBar CSS breakpoint with the JS breakpoint.

**Tech Stack:** React 19, Tailwind CSS 4, Ark UI 5, CSS custom properties, `useIsMobile()` hook at 768px.

---

## Task 1: Add mobile content edge padding

The `<main>` area has zero padding on mobile — content is flush to screen edges.

**Files:**
- Modify: `web/src/components/layout/AppLayout.tsx:237-246`

**Step 1: Read the current shellMainStyle block**

Confirm the inline style block at lines 237–246 in `AppLayout.tsx`. The current code:

```tsx
const shellMainStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  paddingTop: `${styleTokens.shell.headerHeight}px`,
  paddingInlineStart: `${mainInsetStart}px`,
  paddingInlineEnd: `${mainInsetEnd}px`,
  overflow: lockMainScroll ? 'hidden' : 'auto',
  overscrollBehavior: lockMainScroll ? 'none' : 'auto',
  backgroundColor: 'var(--background)',
};
```

On mobile, `mainInsetStart` and `mainInsetEnd` are both `0`, so the `<main>` has no horizontal breathing room.

**Step 2: Add mobile padding to shellMainStyle**

Wrap a conditional to add 16px (1rem) horizontal padding on mobile. Only add padding when the route isn't a full-bleed route (flows, schemas, etc. already bypass `AppPageShell`).

```tsx
const shellMainStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  paddingTop: `${styleTokens.shell.headerHeight}px`,
  paddingInlineStart: `${mainInsetStart}px`,
  paddingInlineEnd: `${mainInsetEnd}px`,
  overflow: lockMainScroll ? 'hidden' : 'auto',
  overscrollBehavior: lockMainScroll ? 'none' : 'auto',
  backgroundColor: 'var(--background)',
};

// On mobile, add horizontal padding so content isn't flush to screen edges.
// Full-bleed routes (flows, schemas, etc.) render their own Outlet without
// AppPageShell, so they manage their own padding.
if (isMobile) {
  shellMainStyle.paddingInlineStart = '16px';
  shellMainStyle.paddingInlineEnd = '16px';
}
```

Wait — `shellMainStyle` is declared with `const`. Change to `let`, or build conditionally:

```tsx
const mobilePadInline = isMobile ? '16px' : undefined;

const shellMainStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  paddingTop: `${styleTokens.shell.headerHeight}px`,
  paddingInlineStart: isMobile ? '16px' : `${mainInsetStart}px`,
  paddingInlineEnd: isMobile ? '16px' : `${mainInsetEnd}px`,
  overflow: lockMainScroll ? 'hidden' : 'auto',
  overscrollBehavior: lockMainScroll ? 'none' : 'auto',
  backgroundColor: 'var(--background)',
};
```

**Step 3: Verify visually**

Run: `cd web && npm run dev`

Open DevTools → toggle device toolbar to 375×667 (iPhone SE). Navigate to `/app/projects` or `/app/elt`. Content should have 16px left/right breathing room. Full-bleed routes like `/app/flows` should NOT double-pad (they bypass `AppPageShell`).

**Step 4: Commit**

```bash
git add web/src/components/layout/AppLayout.tsx
git commit -m "fix: add 16px inline padding on mobile so content isn't flush to screen edges"
```

---

## Task 2: Fix TopCommandBar CSS breakpoint mismatch + search overflow

The CSS media query fires at 1200px but the JS breakpoint is 768px, so the shell-guides grid is broken between 768–1200px. The search bar also forces 360px min-width.

**Files:**
- Modify: `web/src/components/shell/TopCommandBar.css:1-5, 136-154, 177-179`

**Step 1: Add mobile overrides for CSS variables**

At the top of the file, add a media query that zeros out the shell-guide column widths below 768px:

```css
@media (max-width: 767px) {
  :root {
    --shell-guide-left-width: auto;
    --shell-guide-middle-width: 0px;
    --top-command-bar-leading-offset: 0px;
  }
}
```

**Step 2: Change the shell-guides collapse breakpoint from 1200px → 768px**

Replace the existing `@media (max-width: 1200px)` block (lines 136-154) with:

```css
@media (max-width: 767px) {
  .top-command-bar--shell-guides {
    grid-template-columns: auto;
    padding-inline-start: calc(var(--app-shell-navbar-offset, 0px) + 0.75rem);
    padding-inline-end: 1rem;
  }

  .top-command-bar--shell-guides::before,
  .top-command-bar--shell-guides::after {
    display: none;
  }

  .top-command-bar--shell-guides .top-command-bar-center,
  .top-command-bar--shell-guides .top-command-bar-right,
  .top-command-bar--shell-guides .top-command-bar-shell-slot,
  .top-command-bar--shell-guides .top-command-bar-shell-label {
    display: none;
  }
}
```

**Step 3: Constrain search width on mobile**

Replace line 177-179:

```css
.top-command-bar-search-wrap {
  width: min(360px, 100%);
}
```

with:

```css
.top-command-bar-search-wrap {
  width: min(360px, 100%);
  min-width: 0;
}

@media (max-width: 767px) {
  .top-command-bar-search-wrap {
    width: 100%;
  }
}
```

**Step 4: Collapse the project-switcher fixed width on mobile**

The `.top-command-bar--minimal .project-switcher-trigger` block (lines 37-42) hardcodes 196px. Add a mobile override:

```css
@media (max-width: 767px) {
  .top-command-bar--minimal .project-switcher-trigger {
    width: auto;
    flex: 1 1 auto;
    margin-inline-start: 0;
    max-width: 160px;
  }

  .top-command-bar--minimal .top-command-bar-left,
  .top-command-bar--minimal .top-command-bar-center {
    transform: none;
  }
}
```

**Step 5: Verify visually**

Open DevTools → 375px width. Header should show: hamburger → project switcher (truncated) → search (full-width if present) → theme toggle. No horizontal overflow.

Switch to 1024px (tablet). Shell-guides layout (editor route) should still display as multi-column — this regression only applied below 768px.

**Step 6: Commit**

```bash
git add web/src/components/shell/TopCommandBar.css
git commit -m "fix: align TopCommandBar CSS breakpoint to 768px, constrain search and project-switcher on mobile"
```

---

## Task 3: Constrain ProjectSwitcher popover width on mobile

The popover uses a hardcoded `w-80` (320px) with no max-width constraint. On 375px phones it bleeds to screen edges.

**Files:**
- Modify: `web/src/components/shell/ProjectSwitcher.tsx:37`

**Step 1: Add max-width and responsive constraint to Popover.Content**

Change line 37 from:

```tsx
<Popover.Content className="relative z-[140] w-80 rounded-md border border-border bg-popover p-0 shadow-md outline-none">
```

to:

```tsx
<Popover.Content className="relative z-[140] w-80 max-w-[calc(100vw-32px)] rounded-md border border-border bg-popover p-0 shadow-md outline-none">
```

The `max-w-[calc(100vw-32px)]` ensures 16px margin on each side of the viewport. On screens ≥352px the `w-80` (320px) wins; on smaller screens the `max-w` constrains it.

**Step 2: Verify visually**

Open DevTools → 375px. Click the project switcher. Popover should be 320px wide with ~27px margin on each side. On 320px viewport it should shrink to 288px.

**Step 3: Commit**

```bash
git add web/src/components/shell/ProjectSwitcher.tsx
git commit -m "fix: constrain project-switcher popover to viewport width minus 32px on small screens"
```

---

## Task 4: Constrain DraggableChat on mobile

The floating chat has `min-width: 380px` and `min-height: 520px`, dominating small screens. On mobile, skip the floating window entirely and dock to a near-fullscreen overlay.

**Files:**
- Modify: `web/src/components/layout/AppLayout.tsx:64-95`

**Step 1: Add mobile-aware sizing to DraggableChat**

The current inline styles are:

```tsx
width: 'min(380px, calc(100vw - 24px))',
height: 'min(520px, 60vh)',
```

Change to more mobile-friendly values:

```tsx
width: 'min(380px, calc(100vw - 24px))',
height: 'min(520px, calc(100dvh - 24px))',
```

And add `maxHeight` + `maxWidth` constraints:

```tsx
style={{
  position: 'fixed',
  zIndex: 340,
  ...(position
    ? { top: `${position.y}px`, left: `${position.x}px` }
    : { bottom: '12px', right: '12px' }),
  width: 'min(380px, calc(100vw - 24px))',
  height: 'min(520px, calc(100dvh - 24px))',
  maxWidth: 'calc(100vw - 24px)',
  maxHeight: 'calc(100dvh - 24px)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  backgroundColor: 'var(--chrome, var(--background))',
  overflow: 'hidden',
  boxShadow: '0 24px 64px rgba(0, 0, 0, 0.24)',
  userSelect: isDragging ? 'none' : undefined,
}}
```

This ensures:
- On 375×667 phones: chat is 351×643 (leaves 12px margins)
- Uses `100dvh` instead of `60vh` so it can use available mobile viewport height
- `maxWidth`/`maxHeight` prevent dragged position from pushing it off-screen

**Step 2: Verify visually**

Toggle device toolbar to iPhone SE (375×667). Open the AI chat, detach it. The floating window should fit within the viewport with 12px margins on all sides.

**Step 3: Commit**

```bash
git add web/src/components/layout/AppLayout.tsx
git commit -m "fix: constrain floating chat window to viewport bounds on mobile"
```

---

## Task 5: Hide right-rail toggle on mobile

The right rail itself is already hidden on mobile (`showRightRail` checks `!isMobile`), but the toggle button still renders because `showRightRailToggle` is a separate check. This is already correct in the current code (`showRightRailToggle = !isMobile`), so **verify this is working**.

**Files:**
- Read: `web/src/components/layout/AppLayout.tsx:180-181`

**Step 1: Verify the guard**

Read lines 180-181:

```tsx
const showRightRail = !isMobile && hasRailContent && rightRail.isOpen;
const showRightRailToggle = !isMobile;
```

This is correct — `showRightRailToggle` is `false` on mobile, so the toggle button at line 400 won't render. No code change needed.

**Step 2: Verify visually**

Open DevTools → 375px. The right-rail tab button on the right edge should NOT be visible.

**Step 3: Note**

No commit needed — this was a false positive in the audit. The toggle is already guarded.

---

## Task 6: Add mobile-aware TopCommandBar nav toggle touch target

The hamburger toggle is `h-8 w-8` (32px), below the iOS 44px recommendation.

**Files:**
- Modify: `web/src/components/shell/TopCommandBar.tsx:128`

**Step 1: Increase touch target size**

Change line 128 from:

```tsx
className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
```

to:

```tsx
className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
```

This changes 32px → 40px, closer to the 44px recommendation while fitting the 60px header. The icon stays 24px (the `size={24}` prop) — just the tappable area grows.

**Step 2: Verify visually**

Open DevTools → 375px. The hamburger icon should have a visibly larger tap target. It should still fit within the 60px header height.

**Step 3: Commit**

```bash
git add web/src/components/shell/TopCommandBar.tsx
git commit -m "fix: increase mobile nav toggle touch target from 32px to 40px"
```

---

## Task 7: Add mobile CSS variable overrides in tailwind.css

The shell layout CSS variables are desktop-only. Add mobile overrides for gap and padding.

**Files:**
- Modify: `web/src/tailwind.css` (after line 96, inside `:root`)

**Step 1: Add a mobile media query block**

Add the following after the `:root` block's closing brace (but before the `[data-theme='light']` block):

```css
@media (max-width: 767px) {
  :root {
    --app-shell-page-gap: 0.75rem;
    --app-shell-page-bottom-padding: 1rem;
  }
}
```

This reduces gap from 1rem → 0.75rem and bottom padding from 1.5rem → 1rem on mobile, reclaiming vertical space.

**Step 2: Verify visually**

Navigate to a constrained-mode page (if any exist) on 375px viewport. Spacing between sections should be slightly tighter.

**Step 3: Commit**

```bash
git add web/src/tailwind.css
git commit -m "fix: reduce page gap and bottom padding on mobile viewports"
```

---

## Summary

| Task | Issue | Severity | LOC changed |
|------|-------|----------|-------------|
| 1 | Main content zero padding on mobile | Critical | ~4 |
| 2 | CSS breakpoint mismatch + search/switcher overflow | Critical + Major | ~30 |
| 3 | ProjectSwitcher popover overflow | Critical | ~1 |
| 4 | DraggableChat dominates small screens | Major | ~4 |
| 5 | Right-rail toggle (verify only) | Major | 0 |
| 6 | Touch target too small | Moderate | ~1 |
| 7 | CSS variable mobile overrides | Moderate | ~6 |

**Total:** ~46 lines changed across 4 files. No new files, no new dependencies.
