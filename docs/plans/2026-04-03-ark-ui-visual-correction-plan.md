# Ark UI Visual Correction Plan

**Goal:** Fix the Ark UI adoption so that every component renders with visible, designed styling — not as invisible headless pass-throughs that look identical to the raw HTML they replaced. The correction targets the wrapper layer (`ui/*.tsx`) and consumer pages to produce the same visual quality as the app's pre-existing styled components (Dialog, Menu, Switch, Collapsible).

**Architecture:** The problem is in the wrapper files and how consumers use them. The correction has two layers:

1. **Wrapper layer:** `ui/tabs.tsx` has zero default styles and is missing `TabsIndicator`. The other wrappers (Select, Combobox, Splitter, Steps) have styling but consumers override it with identical-to-before Tailwind classes. The fix is to make the wrappers opinionated enough that consuming them produces a visible design by default.

2. **Consumer layer:** Pages like `AgchainDatasetDetailPage.tsx` pass custom classes that replicate the old look instead of letting the wrapper's design show through. The fix is to remove the override classes and let the wrapper defaults render.

**Important prerequisite:** `ui/tabs.tsx` currently imports `cn` from `@/lib/cn` (simple string join, no tailwind-merge). The styled wrappers (`dialog.tsx`, `select.tsx`, `switch.tsx`) all import `cn` from `@/lib/utils` (clsx + twMerge). Adding default styles to tabs.tsx requires switching to the twMerge variant so consumer className overrides resolve correctly instead of producing conflicting Tailwind utilities.

**Reference implementations:** These pre-existing files demonstrate the correct pattern:
- `web/src/components/ui/dialog.tsx` — fully styled with animations, backdrop, positioning
- `web/src/components/ui/menu.tsx` — fully styled with hover, highlight, animations
- `web/src/components/ui/switch.tsx` — fully styled with checked state, thumb animation

**Tech Stack:** React, TypeScript, Tailwind CSS, `@ark-ui/react`.

**Status:** Draft
**Author:** jon
**Date:** 2026-04-03

## What went wrong

The original plans focused on "swapping primitives" — replacing custom buttons with Tabs, native selects with Select, etc. The acceptance criteria checked for keyboard navigation and ARIA roles but never required visible visual improvement. The wrappers were written as pass-throughs (`cn(className)` with no defaults) or styled to exactly match the old look, producing zero visible change across 60+ component swaps.

The correction addresses this by:
1. Adding proper default styles to the Tabs wrapper (including the missing `TabsIndicator`)
2. Ensuring every consumer page uses the wrapper's styled components instead of overriding with manual Tailwind
3. Replacing the remaining 8 native `<select>` elements across 6 AGChain files with Ark Select (these were never touched)
4. Creating a Checkbox wrapper for the 7 native `<input type="checkbox">` elements across 5 AGChain files

## Platform API

No platform API changes. This plan corrects frontend wrapper styling and replaces native HTML form elements with Ark UI components in existing React pages. No server-side endpoints are involved — all work is in `web/src/`.

## Observability

No observability changes. All changes are client-side component and class swaps in React. No server-side runtime paths are affected, no new request flows are introduced, and no existing traced spans are modified. There is no runtime behavior change that would benefit from instrumentation.

## Database Migrations

No database migrations. The native-to-Ark component swaps are purely presentational and do not affect data models or persistence.

## Edge Functions

No edge functions created or modified. All changes are in the web frontend source tree.

## Frontend Surface Area

**New wrapper:** 1

| Component | File | Wraps |
|-----------|------|-------|
| `Checkbox` | `web/src/components/ui/checkbox.tsx` | `@ark-ui/react/checkbox` — Root, Control, Indicator, Label, HiddenInput |

**Modified wrappers:** 1

| Wrapper | File | What changes |
|---------|------|-------------|
| `Tabs` | `web/src/components/ui/tabs.tsx` | Switch `cn` import from `@/lib/cn` to `@/lib/utils` (twMerge). Add `TabsIndicator` export. Add default styles to `TabsList` (relative inline-flex, border-b, orientation variants). Add default styles to `TabsTrigger` (padding, font, data-selected states). Add indicator with sliding animation using Ark's `--width`, `--height`, `--left`, `--top` CSS vars. |

**Modified consumer pages/components:** 13

| # | Page/Component | File | What changes |
|---|----------------|------|-------------|
| 1 | Dataset Detail | `web/src/pages/agchain/AgchainDatasetDetailPage.tsx` | Remove manual TabsTrigger classes. Add `TabsIndicator`. Let wrapper defaults render. |
| 2 | Benchmarks | `web/src/pages/agchain/AgchainBenchmarksPage.tsx` | Verify existing className overrides render correctly with updated wrapper defaults. No code changes expected — existing overrides use filled-background sidebar pattern that is correct for vertical nav and resolves cleanly via twMerge. |
| 3 | Dataset Samples Table | `web/src/components/agchain/datasets/AgchainDatasetSamplesTable.tsx` | Replace native `<select>` with Ark Select. |
| 4 | Tool Editor Dialog | `web/src/components/agchain/tools/AgchainToolEditorDialog.tsx` | Replace 2 native `<select>` with Ark Select. |
| 5 | Tool Source Editor | `web/src/components/agchain/tools/AgchainToolSourceEditor.tsx` | Replace 2 native `<select>` with Ark Select. |
| 6 | Dataset Wizard | `web/src/components/agchain/datasets/AgchainDatasetWizard.tsx` | Replace native delimiter `<select>` with Ark Select. |
| 7 | Tools Page | `web/src/pages/agchain/AgchainToolsPage.tsx` | Replace native source kind filter `<select>` with Ark Select. |
| 8 | Org Members | `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.tsx` | Replace native `<select>` with Ark Select. |
| 9 | Benchmark Step Inspector | `web/src/components/agchain/benchmarks/AgchainBenchmarkStepInspector.tsx` | Replace native `<input type="checkbox">` with Ark Checkbox (1 checkbox). |
| 10 | Models Toolbar | `web/src/components/agchain/models/AgchainModelsToolbar.tsx` | Replace 3 native `<input type="checkbox">` with Ark Checkbox. |
| 11 | Create Permission Group Modal | `web/src/components/agchain/settings/CreatePermissionGroupModal.tsx` | Replace native `<input type="checkbox">` with Ark Checkbox (rendered in `.map()` loop over permissions). |
| 12 | Invite Members Modal | `web/src/components/agchain/settings/InviteOrganizationMembersModal.tsx` | Replace native `<input type="checkbox">` with Ark Checkbox (rendered in `.map()` loop over permission groups). |
| 13 | Permission Group Members Modal | `web/src/components/agchain/settings/PermissionGroupMembersModal.tsx` | Replace native `<input type="checkbox">` with Ark Checkbox (rendered in `.map()` loop over available members). |

---

## Pre-Implementation Contract

No major product, API, observability, or inventory decision may be improvised during implementation. If any item below needs to change, the implementation must stop and this plan must be revised first.

### Locked Visual Requirements

1. **Tabs (horizontal)** must show a sliding indicator that animates between tabs when switching. The indicator uses Ark's `--width`/`--left` CSS variables with a transition.
2. **Tabs (vertical sidebar on Benchmarks)** must preserve the existing filled-background selection pattern (`data-[selected]:bg-primary data-[selected]:text-primary-foreground`). A 2px line indicator is wrong for sidebar navigation — do not add `TabsIndicator` to the Benchmarks page.
3. **Select dropdowns** must render as positioned floating panels with border, shadow, item highlighting, and check indicators — not as native browser `<select>` chrome.
4. **Checkboxes** must render as styled Ark Checkbox with a visible check indicator, not as native browser checkbox chrome.
5. **Every consumer page** must remove manual Tailwind overrides that replicate the old look and instead use the wrapper's default styling — except where the consumer's existing overrides are intentionally different from the wrapper defaults (e.g., vertical sidebar tabs on Benchmarks).

### Locked Acceptance Contract

The implementation is complete only when:

1. Switching tabs on Dataset Detail shows a visible sliding indicator animation.
2. The parse status filter dropdown on Dataset Samples Table (`AgchainDatasetSamplesTable.tsx`) renders as a styled Ark Select dropdown, not a native browser select.
3. Every native `<select>` listed in the locked file inventory has been replaced with Ark Select (no browser chrome visible).
4. Every native `<input type="checkbox">` listed in the locked file inventory has been replaced with Ark Checkbox (no browser checkbox visible).
5. The Benchmarks page vertical sidebar tabs still render with filled-background selection styling and are not broken by the updated Tabs wrapper defaults.
6. Build passes (`npx vite build --mode development`) and existing tests pass (`npx vitest run`).

### Locked Inventory Counts

#### Frontend — Wrappers

- New wrappers: **1** (`checkbox.tsx`)
- Modified wrappers: **1** (`tabs.tsx`)

#### Frontend — Consumer Pages/Components

- Modified consumer pages/components: **13**
- Of which verification-only (no code changes expected): **1** (`AgchainBenchmarksPage.tsx`)
- Of which code changes required: **12**

#### Native Element Replacement Targets

- Native `<select>` elements to replace: **8** across **6** files
- Native `<input type="checkbox">` elements to replace: **7** across **5** files

### Locked File Inventory

#### New files

| # | File |
|---|------|
| 1 | `web/src/components/ui/checkbox.tsx` |

#### Modified files

| # | File | Change type |
|---|------|------------|
| 1 | `web/src/components/ui/tabs.tsx` | Add defaults, indicator, switch cn import |
| 2 | `web/src/pages/agchain/AgchainDatasetDetailPage.tsx` | Remove overrides, add TabsIndicator |
| 3 | `web/src/pages/agchain/AgchainBenchmarksPage.tsx` | Verification only — no changes expected |
| 4 | `web/src/components/agchain/datasets/AgchainDatasetSamplesTable.tsx` | Replace 1 native select |
| 5 | `web/src/components/agchain/tools/AgchainToolEditorDialog.tsx` | Replace 2 native selects |
| 6 | `web/src/components/agchain/tools/AgchainToolSourceEditor.tsx` | Replace 2 native selects |
| 7 | `web/src/components/agchain/datasets/AgchainDatasetWizard.tsx` | Replace 1 native select |
| 8 | `web/src/pages/agchain/AgchainToolsPage.tsx` | Replace 1 native select |
| 9 | `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.tsx` | Replace 1 native select |
| 10 | `web/src/components/agchain/benchmarks/AgchainBenchmarkStepInspector.tsx` | Replace 1 native checkbox |
| 11 | `web/src/components/agchain/models/AgchainModelsToolbar.tsx` | Replace 3 native checkboxes |
| 12 | `web/src/components/agchain/settings/CreatePermissionGroupModal.tsx` | Replace 1 native checkbox (in loop) |
| 13 | `web/src/components/agchain/settings/InviteOrganizationMembersModal.tsx` | Replace 1 native checkbox (in loop) |
| 14 | `web/src/components/agchain/settings/PermissionGroupMembersModal.tsx` | Replace 1 native checkbox (in loop) |

## Explicit Risks Accepted In This Plan

1. **Visual regression across 13 consumer files.** The plan modifies or verifies 13 consumer files. Visual regressions may occur where wrapper defaults interact unexpectedly with existing page layouts. Mitigation: per-task dev server verification after each consumer change.
2. **Benchmarks sidebar stability.** The updated Tabs wrapper adds default styles that merge with the Benchmarks page's existing overrides via twMerge. If twMerge does not resolve the class conflicts correctly, the sidebar nav could break. Mitigation: Task 3 is a dedicated verification step; if it fails, the Benchmarks page's className overrides are adjusted to explicitly counteract the new defaults.
3. **Scope is AGChain-only.** 15+ native `<select>` elements exist outside AGChain pages (LoadPage, DatabasePlaceholder, SettingsAdmin, etc.). This plan intentionally does not touch them. A follow-up plan should address non-AGChain pages.
4. **Checkbox state API difference.** Ark Checkbox uses `onCheckedChange(details)` where `details.checked` is `boolean | 'indeterminate'`, not the native `event.target.checked` boolean. The 3 modal files use checkboxes in `.map()` loops — incorrect coercion would silently break toggle behavior. Mitigation: Task 6 specifies the exact conversion pattern.

---

## Tasks

### Task 1: Fix Tabs wrapper — add indicator and default styles

**File(s):** `web/src/components/ui/tabs.tsx`

**Step 1:** Change the `cn` import from `@/lib/cn` to `@/lib/utils` so that consumer className overrides resolve via twMerge instead of producing conflicting Tailwind utilities:
```tsx
// Before:
import { cn } from '@/lib/cn';
// After:
import { cn } from '@/lib/utils';
```

**Step 2:** Add default styles to `TabsList`:
```tsx
export function TabsList({ className, ...props }: ComponentProps<typeof ArkTabs.List>) {
  return (
    <ArkTabs.List
      data-slot="tabs-list"
      className={cn(
        'relative inline-flex items-center',
        'data-[orientation=horizontal]:flex-row data-[orientation=horizontal]:border-b data-[orientation=horizontal]:border-border',
        'data-[orientation=vertical]:flex-col data-[orientation=vertical]:border-r data-[orientation=vertical]:border-border',
        className,
      )}
      {...props}
    />
  );
}
```

**Step 3:** Add default styles to `TabsTrigger`:
```tsx
export function TabsTrigger({ className, ...props }: ComponentProps<typeof ArkTabs.Trigger>) {
  return (
    <ArkTabs.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium',
        'text-muted-foreground transition-colors',
        'hover:text-foreground',
        'data-[selected]:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
        className,
      )}
      {...props}
    />
  );
}
```

**Step 4:** Add `TabsIndicator` export wrapping `ArkTabs.Indicator` with sliding animation styles:
```tsx
export function TabsIndicator({ className, ...props }: ComponentProps<typeof ArkTabs.Indicator>) {
  return (
    <ArkTabs.Indicator
      data-slot="tabs-indicator"
      className={cn(
        'absolute z-[-1] rounded-sm bg-accent/80',
        'transition-[width,height,left,top] duration-200 ease-out',
        'data-[orientation=horizontal]:h-[2px] data-[orientation=horizontal]:bottom-0',
        'data-[orientation=vertical]:w-[2px] data-[orientation=vertical]:left-0',
        className,
      )}
      {...props}
    />
  );
}
```

**Test command:** `cd web && npx tsc --noEmit --pretty 2>&1 | head -20`
**Expected output:** No type errors in `tabs.tsx`.

**Commit:** `fix(ui): add TabsIndicator, default styles, and twMerge cn to Tabs wrapper`

### Task 2: Update Dataset Detail page — use Tabs indicator

**File(s):** `web/src/pages/agchain/AgchainDatasetDetailPage.tsx`

**Step 1:** Import `TabsIndicator` alongside existing Tabs imports.

**Step 2:** Remove the manual `className` overrides on `TabsList` and `TabsTrigger` — let the wrapper defaults render.

**Step 3:** Add `<TabsIndicator />` inside `<TabsList>` after the triggers.

**Test command:** `cd web && npx tsc --noEmit --pretty 2>&1 | grep -i "DatasetDetail" | head -10`
**Expected output:** No type errors referencing this file.

**Commit:** `fix(agchain): use Tabs indicator on dataset detail page`

### Task 3: Verify Benchmarks page — confirm sidebar tabs render correctly

**File(s):** `web/src/pages/agchain/AgchainBenchmarksPage.tsx`

This is a **verification-only** task. The Benchmarks page uses a vertical sidebar tab layout with filled-background selection styling (`data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:font-semibold`). This is the correct pattern for sidebar navigation and must be preserved.

**Step 1:** Start the dev server and navigate to the Benchmarks page. Confirm:
- The vertical sidebar tabs still render with filled-background selection.
- The tab labels are visible and correctly sized.
- Switching tabs works and the content panel updates.

**Step 2:** If the updated Tabs wrapper defaults cause visual conflicts (e.g., `border-r` from the wrapper clashing with the existing sidebar card border), adjust the Benchmarks page's `TabsList` className to explicitly override the conflicting defaults.

**Do NOT** add `TabsIndicator` to this page. Do NOT remove the existing `TabsTrigger` className overrides.

**Test command:** `cd web && npx vitest run src/pages/agchain/AgchainBenchmarksPage.test.tsx 2>&1 | tail -5`
**Expected output:** Tests pass (or file does not exist — visual verification covers this task).

**Commit:** Only if changes were required: `fix(agchain): adjust benchmarks sidebar tabs for updated wrapper defaults`

### Task 4: Create Checkbox wrapper

**File(s):** `web/src/components/ui/checkbox.tsx`

**Step 1:** Create the wrapper following the same pattern as `ui/switch.tsx`:
```tsx
import { Checkbox as ArkCheckbox } from '@ark-ui/react/checkbox';
import { cn } from '@/lib/utils';

function CheckboxRoot({
  className,
  ...props
}: React.ComponentProps<typeof ArkCheckbox.Root>) {
  return (
    <ArkCheckbox.Root
      className={cn('inline-flex items-center gap-2', className)}
      data-slot="checkbox"
      {...props}
    />
  );
}

function CheckboxControl({
  className,
  ...props
}: React.ComponentProps<typeof ArkCheckbox.Control>) {
  return (
    <ArkCheckbox.Control
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-input bg-background transition-colors',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        'data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

function CheckboxIndicator({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ArkCheckbox.Indicator>) {
  return (
    <ArkCheckbox.Indicator
      className={cn('flex items-center justify-center text-current', className)}
      {...props}
    >
      {children ?? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 6l2.5 2.5 4.5-5" />
        </svg>
      )}
    </ArkCheckbox.Indicator>
  );
}

function CheckboxLabel({
  className,
  ...props
}: React.ComponentProps<typeof ArkCheckbox.Label>) {
  return (
    <ArkCheckbox.Label
      className={cn('text-sm font-medium leading-none', className)}
      {...props}
    />
  );
}

const CheckboxHiddenInput = ArkCheckbox.HiddenInput;

export { CheckboxRoot, CheckboxControl, CheckboxIndicator, CheckboxLabel, CheckboxHiddenInput };
```

**Test command:** `cd web && npx tsc --noEmit --pretty 2>&1 | grep -i "checkbox" | head -10`
**Expected output:** No type errors in `checkbox.tsx`.

**Commit:** `feat(ui): add Ark UI Checkbox wrapper`

### Task 5: Replace 8 native `<select>` elements across 6 files

**File(s):**
1. `web/src/components/agchain/datasets/AgchainDatasetSamplesTable.tsx` — 1 select (parse status filter, line 77)
2. `web/src/components/agchain/tools/AgchainToolEditorDialog.tsx` — 2 selects (source kind line 204, approval mode line 225)
3. `web/src/components/agchain/tools/AgchainToolSourceEditor.tsx` — 2 selects (implementation kind line 35, transport type line 85)
4. `web/src/components/agchain/datasets/AgchainDatasetWizard.tsx` — 1 select (delimiter line 271)
5. `web/src/pages/agchain/AgchainToolsPage.tsx` — 1 select (source kind filter line 230)
6. `web/src/pages/agchain/settings/AgchainOrganizationMembersPage.tsx` — 1 select (status filter line 116)

**Step 1:** In each file, replace every native `<select>` with `SelectRoot`/`SelectControl`/`SelectTrigger`/`SelectValueText`/`SelectContent`/`SelectItem`/`SelectItemText`/`SelectItemIndicator`/`SelectHiddenSelect` imported from `@/components/ui/select`. Use `createListCollection` from the same import to build the item collection.

**Step 2:** Remove any `selectClass` manual style constants (present in `AgchainToolEditorDialog.tsx`, `AgchainToolSourceEditor.tsx`, and `AgchainToolsPage.tsx`).

**Step 3:** For each converted select, wire the `onValueChange` handler to extract the value:
```tsx
onValueChange={(details) => {
  const val = details.value[0];
  if (val) handler(val);
}}
```

**Test command:** `cd web && npx tsc --noEmit --pretty 2>&1 | grep -iE "(select|SamplesTable|ToolEditor|ToolSource|Wizard|ToolsPage|MembersPage)" | head -20`
**Expected output:** No type errors in any of the 6 files.

**Commit:** `fix(agchain): replace all 8 remaining native selects with Ark Select`

### Task 6: Replace 7 native checkboxes across 5 files

**File(s):**
1. `web/src/components/agchain/benchmarks/AgchainBenchmarkStepInspector.tsx` — 1 checkbox (step enabled, line 313)
2. `web/src/components/agchain/models/AgchainModelsToolbar.tsx` — 3 checkboxes (supports_evaluated line 255, supports_judge line 263, enabled line 271)
3. `web/src/components/agchain/settings/CreatePermissionGroupModal.tsx` — 1 checkbox in `.map()` loop (line 144)
4. `web/src/components/agchain/settings/InviteOrganizationMembersModal.tsx` — 1 checkbox in `.map()` loop (line 155)
5. `web/src/components/agchain/settings/PermissionGroupMembersModal.tsx` — 1 checkbox in `.map()` loop (line 195)

**Step 1:** In each file, replace `<input type="checkbox">` with the Checkbox wrapper from `@/components/ui/checkbox`.

**Step 2:** Convert the state binding pattern. Native checkboxes use `checked` + `onChange` with `event.target.checked`. Ark Checkbox uses `checked` + `onCheckedChange` with a `CheckedChangeDetails` object. The conversion pattern:

```tsx
// Before (native):
<input
  type="checkbox"
  checked={value}
  onChange={(event) => handler(event.target.checked)}
/>

// After (Ark):
<CheckboxRoot
  checked={value}
  onCheckedChange={(details) => handler(details.checked === true)}
>
  <CheckboxControl>
    <CheckboxIndicator />
  </CheckboxControl>
  <CheckboxHiddenInput />
</CheckboxRoot>
```

The `details.checked === true` coercion is required because `details.checked` can be `boolean | 'indeterminate'`. For all 7 checkboxes in this plan, indeterminate state is not used, so coercing to boolean is correct.

**Step 3:** For the 3 modal files where checkboxes render inside `.map()` loops, preserve the existing label text and layout. The `<label>` wrapper becomes a `<CheckboxLabel>` or remains a plain `<label>` wrapping the `CheckboxRoot` — match the existing layout structure.

**Test command:** `cd web && npx tsc --noEmit --pretty 2>&1 | grep -iE "(checkbox|StepInspector|ModelsToolbar|PermissionGroup|InviteOrganization)" | head -20`
**Expected output:** No type errors in any of the 5 files.

**Commit:** `fix(agchain): replace all 7 native checkboxes with Ark Checkbox`

### Task 7: Build and test

**File(s):** All files modified in Tasks 1–6.

**Step 1:** Run the TypeScript compiler across the full project:
```bash
cd web && npx tsc --noEmit --pretty
```
**Expected output:** Zero errors.

**Step 2:** Run the Vite build:
```bash
cd web && npx vite build --mode development
```
**Expected output:** Build completes with no errors.

**Step 3:** Run the AGChain test suites:
```bash
cd web && npx vitest run src/components/agchain/ src/pages/agchain/
```
**Expected output:** All tests pass. Some tests may need updates if they assert on native `<select>` or `<input type="checkbox">` elements — fix assertions to match the new Ark component DOM structure.

**Step 4:** Start dev server and visually verify each modified page:
- Dataset Detail: horizontal tabs have a sliding indicator animation
- Benchmarks: vertical sidebar tabs still use filled-background selection (no indicator)
- Dataset Samples Table: parse status filter is a styled Ark Select dropdown
- Tool Editor Dialog: source kind and approval mode are styled Ark Select dropdowns
- Tool Source Editor: implementation kind and transport type are styled Ark Select dropdowns
- Dataset Wizard: delimiter selector is a styled Ark Select dropdown
- Tools Page: source kind filter is a styled Ark Select dropdown
- Org Members: status filter is a styled Ark Select dropdown
- Benchmark Step Inspector: enabled checkbox is a styled Ark Checkbox
- Models Toolbar: 3 capability checkboxes are styled Ark Checkboxes
- Create Permission Group Modal: permission checkboxes are styled Ark Checkboxes
- Invite Members Modal: group checkboxes are styled Ark Checkboxes
- Permission Group Members Modal: member checkboxes are styled Ark Checkboxes

**Commit:** `test: fix tests after Ark UI visual correction` (only if test adjustments were needed)

## Completion Criteria

The work is complete only when all of the following are true:

1. Every native `<select>` element listed in the locked file inventory (8 elements across 6 files) has been replaced with Ark Select components from `ui/select.tsx`.
2. Every native `<input type="checkbox">` element listed in the locked file inventory (7 elements across 5 files) has been replaced with Ark Checkbox components from `ui/checkbox.tsx`.
3. The `tabs.tsx` wrapper imports `cn` from `@/lib/utils` (twMerge), exports `TabsIndicator`, and provides default styles for `TabsList` and `TabsTrigger`.
4. Dataset Detail page shows a visible sliding indicator animation on tab switch.
5. Benchmarks page vertical sidebar tabs render with filled-background selection styling, unbroken by the updated wrapper defaults.
6. The inventory counts in this plan match the actual set of created and modified files.
7. `npx vite build --mode development` completes with no errors.
8. `npx vitest run src/components/agchain/ src/pages/agchain/` passes.