# Ark UI Component Adoption: AGChain Pages

**Goal:** Adopt the existing Ark UI primitive wrappers (and create missing ones) across four AGChain pages so the user can visually assess the difference in behavior, accessibility, and polish. The four pages are: Dataset Detail, Dataset Create Wizard, Benchmarks Workbench, and Tools. Each page exercises a different tier of Ark UI component: Tabs, Select, Steps, Combobox, Splitter, Tooltip, and Toast.

**Architecture:** The app already uses `@ark-ui/react@5.32.0` as its primary primitive layer — 15 of 24 UI wrapper components in `web/src/components/ui/` already wrap Ark UI. The AGChain pages simply do not consume them, using custom Tailwind implementations instead. This plan creates 4 new Ark UI wrappers that do not exist yet (`select`, `steps`, `combobox`, `splitter`) following the established wrapper pattern, then wires all wrappers into the target pages. No backend, database, or observability changes. The toast infrastructure is left on Sonner (already working) — Ark Toast is deferred to avoid disrupting the global provider.

**Tech Stack:** React, TypeScript, Tailwind CSS, `@ark-ui/react`, Vitest.

**Status:** Draft
**Author:** jon
**Date:** 2026-04-03

## Platform API

No platform API endpoints added, modified, or consumed.

This plan is purely frontend component adoption. The AGChain pages already fetch data through existing hooks and endpoints — this work changes how that data is rendered, not where it comes from.

## Observability

No traces, metrics, or structured logs added.

Zero-case justified: this is a UI primitive swap. No new runtime behavior, no new data flows, no new failure modes that would benefit from instrumentation.

## Database Migrations

No database migrations.

## Edge Functions

No edge functions created or modified.

## Frontend Surface Area

**New pages:** 0

**New UI wrapper components:** 4

| Component | File | Wraps |
|-----------|------|-------|
| `Select` | `web/src/components/ui/select.tsx` | `@ark-ui/react/select` — trigger, content, items, item indicators, portal, clear trigger |
| `Steps` | `web/src/components/ui/steps.tsx` | `@ark-ui/react/steps` — root, list, item, trigger, indicator, separator, content, prev/next triggers |
| `Combobox` | `web/src/components/ui/combobox.tsx` | `@ark-ui/react/combobox` — input, trigger, content, items, item indicators, portal, filter hook |
| `Splitter` | `web/src/components/ui/splitter.tsx` | `@ark-ui/react/splitter` — root, panel, resize trigger, resize indicator |

**Modified pages:** 4

| Page | File | What changes |
|------|------|-------------|
| Dataset Detail | `web/src/pages/agchain/AgchainDatasetDetailPage.tsx` | Replace custom `<button>` tab bar with `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` from `ui/tabs`. Lazy-mount heavy tab panels. |
| Dataset Create Wizard | `web/src/components/agchain/datasets/AgchainDatasetWizard.tsx` | Replace manual step sidebar with `Steps` wrapper. Step indicators show completed/active/incomplete states. Preserve existing step content and navigation logic. |
| Benchmarks Workbench | `web/src/pages/agchain/AgchainBenchmarksPage.tsx` | Replace hash-based `AgchainBenchmarkNav` links with `Tabs` (vertical orientation). Wrap steps-list + inspector in `Splitter` for resizable panels. |
| Tools | `web/src/pages/agchain/AgchainToolsPage.tsx` | Add `Tooltip` to truncated table cells and icon-only buttons. Replace plain search `<input>` with `Combobox` for typeahead filtering. |

**Modified components:** 2

| Component | File | What changes |
|-----------|------|-------------|
| `AgchainDatasetVersionSwitcher` | `web/src/components/agchain/datasets/AgchainDatasetVersionSwitcher.tsx` | Replace native `<select>` with `Select` wrapper. Keyboard navigation, typeahead, proper ARIA listbox. |
| `AgchainToolsTable` | `web/src/components/agchain/tools/AgchainToolsTable.tsx` | Add `Tooltip` wrapping truncated tool name and description cells. |

**New hooks:** 0
**New libraries/services:** 0

## Pre-Implementation Contract

No major component API, wrapper pattern, or page layout decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised.

### Locked Product Decisions

1. All new UI wrappers follow the established pattern: import from `@ark-ui/react/*`, extract props via `ComponentProps`, apply `cn()` for className merging, add `data-slot` attributes, export named functions.
2. The tab content on Dataset Detail lazy-mounts via `lazyMount` and `unmountOnExit` props (matching the existing `ui/tabs.tsx` wrapper defaults).
3. The Benchmarks Workbench Tabs use vertical orientation to replace the current vertical link-based nav.
4. The Splitter default split is 60/40 (steps list / inspector) and is user-resizable.
5. The Combobox on the Tools page filters the existing tool list client-side — no new API calls.
6. Toast adoption is explicitly deferred. The app already uses Sonner via `web/src/components/ui/provider.tsx` and swapping the global toast provider is not in scope.
7. The Project Switcher and Organization Switcher are left unchanged — they use `ProjectFocusSelectorPopover` which is a custom shell component with its own design intent.

### Locked Acceptance Contract

The implementation is complete only when all of the following are true:

1. **Dataset Detail:** Clicking tab triggers shows the correct panel. Arrow keys navigate between tabs. The previously-custom tab bar has a visible indicator animation. Heavy panels (Samples, Source) only render when their tab is active.
2. **Dataset Detail:** The version switcher opens a positioned dropdown with keyboard navigation. Selecting a version updates the page. The native `<select>` is gone.
3. **Dataset Create Wizard:** The step sidebar shows numbered indicators with completed (check), active (highlighted), and incomplete (dimmed) states. Clicking a completed step navigates back. The existing step content and validation logic is unchanged.
4. **Benchmarks Workbench:** The vertical tabs replace the link-based nav. Section content renders inline (no hash navigation). The steps list and inspector are in a resizable splitter — dragging the handle resizes both panels.
5. **Tools page:** Hovering truncated tool names shows a tooltip with the full text. The search input provides typeahead suggestions from the tool registry.
6. All existing page tests pass (`npx vitest run` for affected test files).
7. No visual regressions on pages not in scope.

### Locked Inventory Counts

#### Frontend

- New UI wrapper components: 4
- Modified existing pages: 4
- Modified existing components: 2
- New pages/routes: 0
- New hooks: 0

#### Tests

- New test modules: 0 (wrapper components are tested through page-level tests)
- Modified existing test modules: 0 (unless existing tests reference the replaced DOM structure)

### Locked File Inventory

#### New files

- `web/src/components/ui/select.tsx`
- `web/src/components/ui/steps.tsx`
- `web/src/components/ui/combobox.tsx`
- `web/src/components/ui/splitter.tsx`

#### Modified files

- `web/src/pages/agchain/AgchainDatasetDetailPage.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetWizard.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetVersionSwitcher.tsx`
- `web/src/pages/agchain/AgchainBenchmarksPage.tsx`
- `web/src/pages/agchain/AgchainToolsPage.tsx`
- `web/src/components/agchain/tools/AgchainToolsTable.tsx`

### Frozen Seam Contract

The AGChain pages fetch data through existing hooks (`useAgchainDatasetDetail`, `useAgchainProjectFocus`, etc.). This plan does not change any data fetching, mutation, or state management. It only changes how the fetched data is rendered. If a page's data flow needs to change to support a component (e.g., the Combobox needs items in a different shape), the adaptation happens at the component boundary, not in the hook.

The existing `ui/tabs.tsx` wrapper already handles `onValueChange` normalization (string vs object). Pages that consume Tabs must use the wrapper's callback signature, not the raw Ark UI one.

### Explicit Risks Accepted In This Plan

1. **The Benchmarks Workbench hash navigation is being replaced with Tabs.** Any external links or bookmarks to `#steps`, `#questions`, etc. will stop working. This is accepted because the hash nav was never a product-level URL contract — it was an implementation convenience.

2. **The Splitter component is new and unstyled in the existing wrapper layer.** The resize handle styling will be implemented from scratch following the Ark UI example pattern. It may need iteration for visual fit.

3. **The Combobox filter is client-side only.** For the Tools page this is fine (small registry). If a future page needs server-side search, a different pattern (async Combobox) would be needed — that is not in scope here.

---

## Tasks

### Task 1: Create Select wrapper

**File:** `web/src/components/ui/select.tsx`

**Step 1:** Create the wrapper following the established pattern. Export: `SelectRoot`, `SelectLabel`, `SelectControl`, `SelectTrigger`, `SelectValueText`, `SelectContent`, `SelectItem`, `SelectItemText`, `SelectItemIndicator`, `SelectItemGroup`, `SelectItemGroupLabel`, `SelectClearTrigger`, `SelectIndicator`, `SelectHiddenSelect`.

Each subcomponent wraps the corresponding `@ark-ui/react/select` part with `cn()` for className merging and `data-slot` for styling hooks.

Re-export `createListCollection` from `@ark-ui/react/select` for consumer convenience.

**Step 2:** Verify the wrapper renders without errors in isolation.

**Commit:** `feat(ui): add Ark UI Select wrapper`

### Task 2: Create Steps wrapper

**File:** `web/src/components/ui/steps.tsx`

**Step 1:** Create the wrapper. Export: `StepsRoot`, `StepsList`, `StepsItem`, `StepsTrigger`, `StepsIndicator`, `StepsSeparator`, `StepsContent`, `StepsCompletedContent`, `StepsPrevTrigger`, `StepsNextTrigger`.

Indicator styling: `data-[incomplete]` gets border only, `data-[current]` gets primary highlight, `data-[complete]` gets filled primary with check icon.

**Commit:** `feat(ui): add Ark UI Steps wrapper`

### Task 3: Create Combobox wrapper

**File:** `web/src/components/ui/combobox.tsx`

**Step 1:** Create the wrapper. Export: `ComboboxRoot`, `ComboboxLabel`, `ComboboxControl`, `ComboboxInput`, `ComboboxTrigger`, `ComboboxContent`, `ComboboxItem`, `ComboboxItemText`, `ComboboxItemIndicator`, `ComboboxItemGroup`, `ComboboxItemGroupLabel`, `ComboboxClearTrigger`.

Re-export `useListCollection` and `useFilter` from `@ark-ui/react` for consumer convenience.

Content renders in a `Portal` with `Positioner` for correct layering.

**Commit:** `feat(ui): add Ark UI Combobox wrapper`

### Task 4: Create Splitter wrapper

**File:** `web/src/components/ui/splitter.tsx`

**Step 1:** Create the wrapper. Export: `SplitterRoot`, `SplitterPanel`, `SplitterResizeTrigger`, `SplitterResizeTriggerIndicator`.

Resize trigger styled as a subtle vertical bar with a draggable handle indicator. Cursor changes to `col-resize` on hover. Active/dragging state highlighted.

**Commit:** `feat(ui): add Ark UI Splitter wrapper`

### Task 5: Swap Dataset Detail tab bar to Tabs

**File:** `web/src/pages/agchain/AgchainDatasetDetailPage.tsx`

**Step 1:** Import `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from `@/components/ui/tabs`.

**Step 2:** Replace the custom `<div className="flex border-b">` tab bar (lines 225-240) with:
```tsx
<Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as DetailTab)}>
  <TabsList>
    {TABS.map(tab => (
      <TabsTrigger key={tab.key} value={tab.key}>{tab.label}</TabsTrigger>
    ))}
  </TabsList>
  {/* Tab content panels */}
  <TabsContent value="samples">...</TabsContent>
  <TabsContent value="versions">...</TabsContent>
  ...
</Tabs>
```

**Step 3:** Remove the manual `activeTab === tab.key` conditional rendering. Let `TabsContent` handle visibility via lazy mount.

**Step 4:** Verify tab switching, keyboard navigation (arrow keys), and that data loading callbacks still fire on tab change.

**Commit:** `refactor(agchain): swap dataset detail custom tabs for Ark UI Tabs`

### Task 6: Swap Dataset Version Switcher to Select

**File:** `web/src/components/agchain/datasets/AgchainDatasetVersionSwitcher.tsx`

**Step 1:** Import Select components from `@/components/ui/select` and `createListCollection`.

**Step 2:** Replace the native `<select>` with the Ark UI Select. Build the collection from the `versions` array. Wire `onValueChange` to call the existing `onSelect` prop.

**Step 3:** Verify version selection updates the dataset detail page, keyboard navigation works, and the dropdown positions correctly in the header area.

**Commit:** `refactor(agchain): swap dataset version switcher native select for Ark UI Select`

### Task 7: Swap Dataset Create Wizard step sidebar to Steps

**File:** `web/src/components/agchain/datasets/AgchainDatasetWizard.tsx`

**Step 1:** Import Steps components from `@/components/ui/steps`.

**Step 2:** Replace the manual step sidebar (numbered buttons with active/inactive styling) with `StepsRoot`, `StepsList`, `StepsItem`, `StepsTrigger`, `StepsIndicator`, `StepsSeparator`. Wire `step` (current index) to the Steps controlled value.

**Step 3:** Preserve the existing step content rendering — wrap each step's content area in `StepsContent` with the matching index. Keep the existing Back/Next/Cancel buttons but optionally wire them through `StepsPrevTrigger`/`StepsNextTrigger`.

**Step 4:** Verify the wizard flow: source selection → mapping → preview → details → completion. Ensure step indicators show completed/active/incomplete states correctly.

**Commit:** `refactor(agchain): swap dataset wizard manual steps for Ark UI Steps`

### Task 8: Swap Benchmarks Workbench nav to Tabs + add Splitter

**File:** `web/src/pages/agchain/AgchainBenchmarksPage.tsx`

**Step 1:** Import `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from `@/components/ui/tabs` and `SplitterRoot`, `SplitterPanel`, `SplitterResizeTrigger` from `@/components/ui/splitter`.

**Step 2:** Replace the `AgchainBenchmarkNav` hash-link sidebar with vertical `Tabs`:
```tsx
<Tabs orientation="vertical" defaultValue="steps">
  <TabsList>{/* 9 section triggers */}</TabsList>
  <TabsContent value="steps">
    <SplitterRoot panels={[{id:'list'},{id:'inspector'}]}>
      <SplitterPanel id="list">{/* AgchainBenchmarkStepsList */}</SplitterPanel>
      <SplitterResizeTrigger id="list:inspector" />
      <SplitterPanel id="inspector">{/* AgchainBenchmarkStepInspector */}</SplitterPanel>
    </SplitterRoot>
  </TabsContent>
  {/* Other section contents */}
</Tabs>
```

**Step 3:** Remove the hash-based navigation logic and `useLocation().hash` dependency.

**Step 4:** Verify section switching, that the Steps tab shows the resizable split layout, and that existing step editing/inspector behavior is preserved.

**Commit:** `refactor(agchain): swap benchmark nav to Ark UI Tabs + Splitter for inspector`

### Task 9: Add Tooltip and Combobox to Tools page

**Files:** `web/src/pages/agchain/AgchainToolsPage.tsx`, `web/src/components/agchain/tools/AgchainToolsTable.tsx`

**Step 1:** Import `Tooltip`, `TooltipTrigger`, `TooltipContent` from `@/components/ui/tooltip`.

**Step 2:** In `AgchainToolsTable.tsx`, wrap truncated tool name cells with:
```tsx
<Tooltip>
  <TooltipTrigger asChild><span className="truncate">{name}</span></TooltipTrigger>
  <TooltipContent>{name}</TooltipContent>
</Tooltip>
```

**Step 3:** In `AgchainToolsPage.tsx`, replace the plain search `<input>` with the `Combobox` wrapper. Build the collection from the tool registry. Filter client-side using `useFilter` with base sensitivity. The combobox input replaces the search field; selecting an item scrolls/highlights that tool in the table.

**Step 4:** Verify tooltips appear on hover with the full text. Verify the combobox filters the tool list and keyboard navigation works.

**Commit:** `refactor(agchain): add Ark UI Tooltip + Combobox to tools page`

### Task 10: Run tests and verify

**Step 1:** Run all affected tests:
```bash
cd web && npx vitest run src/components/agchain/ src/pages/agchain/
```

**Step 2:** Fix any test failures caused by changed DOM structure (e.g., tests that query for specific `<button>` elements that are now `TabsTrigger`).

**Step 3:** Start the dev server and manually verify all four pages render correctly, interactions work, and there are no console errors.

**Commit:** `test: fix tests after Ark UI component adoption`

## Completion Criteria

The work is complete only when all of the following are true:

1. The 4 new UI wrappers exist at their declared paths and follow the established wrapper pattern.
2. The 4 target pages consume Ark UI components instead of custom Tailwind implementations.
3. All tab interactions support keyboard navigation (arrow keys) and show proper ARIA roles.
4. The Dataset Version Switcher is a positioned dropdown, not a native `<select>`.
5. The Dataset Wizard shows step completion indicators.
6. The Benchmarks Workbench has a resizable split layout.
7. Truncated tool names show tooltips on hover.
8. All existing tests pass.
9. The file inventory matches the locked counts (4 new, 6 modified).