# Ark UI Remaining Tier Completion

**Goal:** Complete the Tier 1, Tier 2, and selected Tier 3 Ark UI component adoption across all AGChain pages and extend to superadmin and core blockdata pages. The first pass (plan: `2026-04-03-ark-ui-agchain-component-adoption-plan.md`) covered 4 AGChain pages as a visual subset. This plan finishes the remaining AGChain gaps and applies the same wrappers across the rest of the app.

**Architecture:** The app uses `@ark-ui/react@5.32.0` as its primary primitive layer. 19 wrapper components now exist in `web/src/components/ui/` (15 original + 4 added in the first pass: `select.tsx`, `steps.tsx`, `combobox.tsx`, `splitter.tsx`). This plan creates 6 new wrappers (`tags-input.tsx`, `progress.tsx`, `accordion.tsx`, `popover.tsx`, `pagination.tsx`, `tree-view.tsx`) and wires existing + new wrappers into all remaining pages that use custom Tailwind implementations or import directly from `@ark-ui/react` without going through the `ui/` wrapper layer. No backend, database, or observability changes.

**Tech Stack:** React, TypeScript, Tailwind CSS, `@ark-ui/react`, Vitest.

**Status:** Draft
**Author:** jon
**Date:** 2026-04-03

## Parallel Execution — Two Sessions

This plan is designed for simultaneous execution by two Claude Code sessions. No file is touched by both sessions.

### Session A: AGChain Components

**Tasks:** 1a-1f, 2, 3, 4, 5, 6, 7, 8, 15, 16, 17, 18
**Scope:** Create 6 new wrappers (TagsInput, Progress, Accordion, Popover, Pagination, TreeView), modify all 10 AGChain components, then run consistency migrations for the 12 files that import directly from `@ark-ui/react` (Tasks 15-18 moved here because they depend on Session A's new wrappers).
**Files touched:** Everything under `web/src/components/agchain/` and `web/src/pages/agchain/`, plus 6 new files in `web/src/components/ui/`, plus 12 consistency migration files.
**Test command:** `cd web && npx vitest run src/components/agchain/ src/pages/agchain/`
**Start immediately:** Yes — no dependencies on Session B.

### Session B: Non-AGChain Pages

**Tasks:** 9, 10, 11, 12, 13, 14
**Scope:** Swap custom tabs, native selects, and manual collapsible state across 5 non-AGChain pages/components and 1 superuser component.
**Files touched:** `web/src/pages/DocumentsPage.tsx`, `web/src/components/flows/FlowsDetailRail.tsx`, `web/src/pages/Upload.tsx`, `web/src/pages/superuser/SuperuserAuditHistory.tsx`, `web/src/pages/marketplace/ServiceDetailPage.tsx`, `web/src/components/superuser/OperationalReadinessCheckGrid.tsx`.
**Test command:** `cd web && npx vitest run src/pages/DocumentsPage.test.tsx src/pages/FlowDetail.test.tsx src/pages/Upload.test.tsx src/pages/superuser/ src/pages/marketplace/`
**Start immediately:** Yes — all wrappers consumed by Session B already exist (`ui/tabs.tsx`, `ui/select.tsx`, `ui/collapsible.tsx`). No dependency on Session A's new wrappers. Consistency migrations (Tasks 15-18) were moved to Session A since they depend on Session A's new wrapper files.

### Task 19: Final Build Verification

**Run by:** Whichever session finishes last.
**Command:** `cd web && npx vite build --mode development && npx vitest run src/`
**Purpose:** Full build + full test suite after both sessions' changes are on disk.

### Conflict Prevention

- Session A owns all `agchain/` files + all new `ui/*.tsx` wrappers + all 12 consistency migration files (Tasks 15-18)
- Session B owns all non-AGChain page files + `OperationalReadinessCheckGrid.tsx`
- Neither session modifies `ui/tabs.tsx`, `ui/select.tsx`, `ui/collapsible.tsx`, `ui/switch.tsx`, `ui/tooltip.tsx`, `ui/combobox.tsx`, `ui/segment-group.tsx` — these are consumed read-only
- If either session needs to modify a shared wrapper, STOP and coordinate

## Platform API

No platform API endpoints added, modified, or consumed. This is purely frontend component adoption.

## Observability

No traces, metrics, or structured logs. Zero-case justified: UI primitive swap with no new runtime behavior.

## Database Migrations

No database migrations.

## Edge Functions

No edge functions created or modified.

## Frontend Surface Area

**New pages:** 0

**New UI wrapper components:** 6

| Component | File | Wraps |
|-----------|------|-------|
| `TagsInput` | `web/src/components/ui/tags-input.tsx` | `@ark-ui/react/tags-input` — Root, Control, Input, Item, ItemText, ItemDeleteTrigger, ClearTrigger, HiddenInput |
| `Progress` | `web/src/components/ui/progress.tsx` | `@ark-ui/react/progress` — Root, Track, Range, Label, ValueText, Circle (SVG), View |
| `Accordion` | `web/src/components/ui/accordion.tsx` | `@ark-ui/react/accordion` — Root, Item, ItemTrigger, ItemContent, ItemIndicator |
| `Popover` | `web/src/components/ui/popover.tsx` | `@ark-ui/react/popover` — Root, Trigger, Positioner, Content, Arrow, ArrowTip, CloseTrigger, Title, Description |
| `Pagination` | `web/src/components/ui/pagination.tsx` | `@ark-ui/react/pagination` — Root, PrevTrigger, NextTrigger, Item, Ellipsis |
| `TreeView` | `web/src/components/ui/tree-view.tsx` | `@ark-ui/react/tree-view` — Root, Tree, Item, ItemText, ItemIndicator, Branch, BranchContent, BranchControl, BranchTrigger, BranchText, BranchIndicator |

**Modified AGChain components:** 10

| Component | File | What changes |
|-----------|------|-------------|
| `AgchainDatasetVersionDraftPage` | `web/src/pages/agchain/AgchainDatasetVersionDraftPage.tsx` | 2 custom toggle switches → Ark Switch (Shuffle, Auto-ID at ~lines 174-200) |
| `AgchainDatasetsToolbar` | `web/src/components/agchain/datasets/AgchainDatasetsToolbar.tsx` | Search input → Combobox (~line 38); 2 native selects → Ark Select (~lines 57-79) |
| `AgchainDatasetsTable` | `web/src/components/agchain/datasets/AgchainDatasetsTable.tsx` | Truncated name/slug cells → Tooltip (~lines 103-107) |
| `AgchainModelsToolbar` | `web/src/components/agchain/models/AgchainModelsToolbar.tsx` | Search input → Combobox (~line 297) |
| `AgchainModelsTable` | `web/src/components/agchain/models/AgchainModelsTable.tsx` | Truncated provider display → Tooltip (~lines 80-87) |
| `AgchainBenchmarkStepsList` | `web/src/components/agchain/benchmarks/AgchainBenchmarkStepsList.tsx` | Truncated step names → Tooltip (~lines 83-87) |
| `AgchainBenchmarkToolBag` | `web/src/components/agchain/benchmarks/AgchainBenchmarkToolBag.tsx` | Truncated tool refs → Tooltip (~lines 86-88, 171-173); native tool select → Ark Select (~lines 123-135) |
| `AgchainBenchmarkStepInspector` | `web/src/components/agchain/benchmarks/AgchainBenchmarkStepInspector.tsx` | 3 native selects → Ark Select (Step Kind ~145, API Boundary ~168, Scoring Mode ~192) |
| `AgchainDatasetFieldMappingEditor` | `web/src/components/agchain/datasets/AgchainDatasetFieldMappingEditor.tsx` | Manual Advanced toggle → Ark Collapsible (~lines 114-141) |
| `AgchainDatasetWizard` | `web/src/components/agchain/datasets/AgchainDatasetWizard.tsx` | 2 custom toggles → Switch (~lines 287, 331); comma-separated tags → TagsInput (~line 414); source type buttons → SegmentGroup (~line 240) |

**Modified non-AGChain pages:** 5

| Page | File | What changes |
|------|------|-------------|
| `DocumentsPage` | `web/src/pages/DocumentsPage.tsx` | Custom tab bar → Ark Tabs (~lines 102-123) |
| `FlowsDetailRail` | `web/src/components/flows/FlowsDetailRail.tsx` | Custom `FLOWS_SHELL_ITEMS` button loop → Ark Tabs with URL-based routing (~lines 33-54) |
| `Upload` | `web/src/pages/Upload.tsx` | NativeSelect for rows-per-page → Ark Select (~line 470) |
| `SuperuserAuditHistory` | `web/src/pages/superuser/SuperuserAuditHistory.tsx` | 2 native filter selects → Ark Select (~lines 190-210) |
| `ServiceDetailPage` | `web/src/pages/marketplace/ServiceDetailPage.tsx` | Function type filter select → Ark Select (~lines 297-309) |

**Modified non-AGChain components:** 1

| Component | File | What changes |
|-----------|------|-------------|
| `OperationalReadinessCheckGrid` | `web/src/components/superuser/OperationalReadinessCheckGrid.tsx` | Manual `Set<string>` expand/collapse → Ark Collapsible per check (~lines 141-151) |

**Consistency migrations (direct `@ark-ui/react` imports → `ui/` wrappers):** 12 files

| File | Current import | Migrates to wrapper |
|------|---------------|-------------------|
| `web/src/components/services/function-reference.tsx` | `@ark-ui/react/accordion` | `ui/accordion.tsx` |
| `web/src/pages/Landing.tsx` | `@ark-ui/react/accordion` | `ui/accordion.tsx` |
| `web/src/pages/Landing.old.tsx` | `@ark-ui/react/accordion` | `ui/accordion.tsx` |
| `web/src/pages/HowItWorks.tsx` | `@ark-ui/react/accordion` | `ui/accordion.tsx` |
| `web/src/pages/FlowsList.tsx` | `@ark-ui/react/pagination` | `ui/pagination.tsx` |
| `web/src/pages/superuser/DesignLayoutCaptures.tsx` | `@ark-ui/react/pagination` | `ui/pagination.tsx` |
| `web/src/pages/Projects.tsx` | `@ark-ui/react/pagination` | `ui/pagination.tsx` |
| `web/src/pages/SchemaLayout.tsx` | `@ark-ui/react/pagination` | `ui/pagination.tsx` |
| `web/src/components/shell/ProjectFocusSelectorPopover.tsx` | `@ark-ui/react/popover` | `ui/popover.tsx` |
| `web/src/pages/superuser/WorkspaceFileTree.tsx` | `@ark-ui/react/tree-view` | `ui/tree-view.tsx` |
| `web/src/components/flows/FlowWorkbench.tsx` | `@ark-ui/react/tree-view` | `ui/tree-view.tsx` |
| `web/src/components/documents/AssetsPanel.tsx` | `@ark-ui/react/tree-view` | `ui/tree-view.tsx` |

**New hooks:** 0
**New libraries/services:** 0

## Pre-Implementation Contract

No major component API, wrapper pattern, or page layout decision may be improvised during implementation. If any item below needs to change, implementation must stop and this plan must be revised.

### Locked Product Decisions

1. All new wrappers follow the established pattern: import from `@ark-ui/react/*`, `cn()` from `@/lib/utils`, `data-slot` attributes, named exports.
2. The Segment Group wrapper already exists at `ui/segmented-control.tsx` / `ui/segment-group.tsx`. Use it directly — do not create a new wrapper.
3. The Switch wrapper already exists at `ui/switch.tsx`. Use it directly.
4. The Collapsible wrapper already exists at `ui/collapsible.tsx`. Use it directly.
5. Toast adoption remains deferred (Sonner stays).
6. Project Switcher and Organization Switcher remain unchanged (custom `ProjectFocusSelectorPopover`).
7. FlowDetail's tab-to-URL routing must be preserved — Ark Tabs drives the visual tab state but the URL update logic stays.

### Locked Acceptance Contract

The implementation is complete only when all of the following are true:

1. Every native `<select>` element targeted by this plan (Datasets toolbar source type and validation filters, Benchmark StepInspector kind/boundary/scoring selects, Benchmark ToolBag tool select) is replaced with Ark Select. Intentionally untouched: Wizard delimiter select (~line 274 of `AgchainDatasetWizard.tsx`), Tools page source kind filter (~line 230 of `AgchainToolsPage.tsx`).
2. Every custom toggle switch (the `relative h-6 w-11 rounded-full` pattern) is replaced with Ark Switch.
3. Every plain search `<input>` in AGChain toolbars uses Ark Combobox with client-side filtering.
4. Every truncated text cell in AGChain tables has a Tooltip showing the full content on hover.
5. The Dataset Wizard tags input uses Ark TagsInput instead of a comma-separated string input.
6. The Dataset Wizard source type selector uses Ark SegmentGroup.
7. The Field Mapping Editor Advanced section uses Ark Collapsible.
8. DocumentsPage and FlowDetail use Ark Tabs instead of custom tab bars.
9. Upload, SuperuserAuditHistory, and ServiceDetailPage use Ark Select for filter dropdowns.
10. OperationalReadinessCheckGrid uses Ark Collapsible for expandable check details.
11. All existing tests pass (excluding pre-existing `AgchainProjectSwitcher.test.tsx` failure).
12. `npx vite build --mode development` succeeds.

### Locked Inventory Counts

#### Frontend

- New UI wrapper components: 6 (`tags-input.tsx`, `progress.tsx`, `accordion.tsx`, `popover.tsx`, `pagination.tsx`, `tree-view.tsx`)
- Modified AGChain components: 10
- Modified non-AGChain pages: 5
- Modified non-AGChain components: 1
- New pages/routes: 0
- New hooks: 0

### Locked File Inventory

#### New files

- `web/src/components/ui/tags-input.tsx`
- `web/src/components/ui/progress.tsx`
- `web/src/components/ui/accordion.tsx`
- `web/src/components/ui/popover.tsx`
- `web/src/components/ui/pagination.tsx`
- `web/src/components/ui/tree-view.tsx`

#### Modified files (AGChain)

- `web/src/pages/agchain/AgchainDatasetVersionDraftPage.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetsToolbar.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetsTable.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetFieldMappingEditor.tsx`
- `web/src/components/agchain/datasets/AgchainDatasetWizard.tsx`
- `web/src/components/agchain/models/AgchainModelsToolbar.tsx`
- `web/src/components/agchain/models/AgchainModelsTable.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarkStepsList.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarkToolBag.tsx`
- `web/src/components/agchain/benchmarks/AgchainBenchmarkStepInspector.tsx`

#### Modified files (non-AGChain)

- `web/src/pages/DocumentsPage.tsx`
- `web/src/components/flows/FlowsDetailRail.tsx`
- `web/src/pages/Upload.tsx`
- `web/src/pages/superuser/SuperuserAuditHistory.tsx`
- `web/src/pages/marketplace/ServiceDetailPage.tsx`
- `web/src/components/superuser/OperationalReadinessCheckGrid.tsx`
- `web/src/components/services/function-reference.tsx` (accordion wrapper migration)
- `web/src/pages/Landing.tsx` (accordion wrapper migration)
- `web/src/pages/Landing.old.tsx` (accordion wrapper migration)
- `web/src/pages/HowItWorks.tsx` (accordion wrapper migration)
- `web/src/pages/FlowsList.tsx` (pagination wrapper migration)
- `web/src/pages/superuser/DesignLayoutCaptures.tsx` (pagination wrapper migration)
- `web/src/pages/Projects.tsx` (pagination wrapper migration)
- `web/src/pages/SchemaLayout.tsx` (pagination wrapper migration)
- `web/src/components/shell/ProjectFocusSelectorPopover.tsx` (popover wrapper migration)
- `web/src/pages/superuser/WorkspaceFileTree.tsx` (tree-view wrapper migration)
- `web/src/components/flows/FlowWorkbench.tsx` (tree-view wrapper migration)
- `web/src/components/documents/AssetsPanel.tsx` (tree-view wrapper migration)

### Frozen Seam Contract

Data fetching hooks are untouched. Components change how data is rendered, not where it comes from. If a component swap requires data in a different shape (e.g., Combobox needs `{ label, value }` items), the adaptation happens at the component boundary via `useMemo` or inline mapping — not by modifying the hook.

The existing `ui/tabs.tsx` wrapper normalizes `onValueChange` to always receive a string. Pages must use the wrapper's callback signature.

### Explicit Risks Accepted In This Plan

1. **FlowDetail tab-to-URL coupling.** Ark Tabs controls visual state; the existing URL update logic (`navigate`) is preserved alongside it. This means tab changes fire both the Ark callback and the URL update — slightly redundant but preserves the routing contract.
2. **SegmentGroup on the Dataset Wizard source types** replaces a button group. If any source type needs to be disabled independently (not currently the case), SegmentGroup supports it via `data-disabled`.
3. **TagsInput changes the tags data model** from a single comma-separated string to an array of strings. The `handleCreate` callback in the wizard must be updated to pass the array directly instead of splitting on commas.

---

## Tasks

### Task 1a: Create TagsInput wrapper

**File:** `web/src/components/ui/tags-input.tsx`

**Step 1:** Create the wrapper following the established pattern. Export: `TagsInputRoot`, `TagsInputControl`, `TagsInputInput`, `TagsInputItem`, `TagsInputItemText`, `TagsInputItemDeleteTrigger`, `TagsInputClearTrigger`, `TagsInputHiddenInput`, `TagsInputLabel`.

**Commit:** `feat(ui): add Ark UI TagsInput wrapper`

### Task 1b: Create Progress wrapper

**File:** `web/src/components/ui/progress.tsx`

**Step 1:** Create the wrapper. Export: `ProgressRoot`, `ProgressTrack`, `ProgressRange`, `ProgressLabel`, `ProgressValueText`, `ProgressView`. Support both linear (track + range) and circle (SVG) variants via the `View` subcomponent.

**Commit:** `feat(ui): add Ark UI Progress wrapper`

### Task 1c: Create Accordion wrapper

**File:** `web/src/components/ui/accordion.tsx`

**Step 1:** Create the wrapper. Export: `AccordionRoot`, `AccordionItem`, `AccordionItemTrigger`, `AccordionItemContent`, `AccordionItemIndicator`. Support `multiple` and `collapsible` modes.

**Commit:** `feat(ui): add Ark UI Accordion wrapper`

### Task 1d: Create Popover wrapper

**File:** `web/src/components/ui/popover.tsx`

**Step 1:** Create the wrapper. Export: `PopoverRoot`, `PopoverTrigger`, `PopoverPositioner`, `PopoverContent`, `PopoverArrow`, `PopoverArrowTip`, `PopoverCloseTrigger`, `PopoverTitle`, `PopoverDescription`. Content renders via Portal + Positioner.

**Commit:** `feat(ui): add Ark UI Popover wrapper`

### Task 1e: Create Pagination wrapper

**File:** `web/src/components/ui/pagination.tsx`

**Step 1:** Create the wrapper. Export: `PaginationRoot`, `PaginationPrevTrigger`, `PaginationNextTrigger`, `PaginationItem`, `PaginationEllipsis`. Re-export `type PaginationPageChangeDetails` for consumer convenience.

**Commit:** `feat(ui): add Ark UI Pagination wrapper`

### Task 1f: Create TreeView wrapper

**File:** `web/src/components/ui/tree-view.tsx`

**Step 1:** Create the wrapper. Export: `TreeViewRoot`, `TreeViewTree`, `TreeViewItem`, `TreeViewItemText`, `TreeViewItemIndicator`, `TreeViewBranch`, `TreeViewBranchContent`, `TreeViewBranchControl`, `TreeViewBranchTrigger`, `TreeViewBranchText`, `TreeViewBranchIndicator`. Re-export `createTreeCollection`.

**Commit:** `feat(ui): add Ark UI TreeView wrapper`

### Task 2: Swap Dataset Version Draft toggles to Switch

**File:** `web/src/pages/agchain/AgchainDatasetVersionDraftPage.tsx`

**Step 1:** Import `SwitchRoot`, `SwitchControl`, `SwitchThumb`, `SwitchHiddenInput` from `ui/switch.tsx`.

**Step 2:** Replace the 2 custom toggle buttons (Shuffle ~line 174, Auto-ID ~line 194) with Ark Switch. Wire `checked` to existing state, `onCheckedChange` to existing setters.

**Commit:** `refactor(agchain): swap version draft toggles for Ark UI Switch`

### Task 3: Swap Dataset Wizard remaining custom inputs

**File:** `web/src/components/agchain/datasets/AgchainDatasetWizard.tsx`

**Step 1:** Import Switch, SegmentGroup, and TagsInput components.

**Step 2:** Replace the 2 custom toggles (Headers ~line 287, Trust remote code ~line 331) with Ark Switch.

**Step 3:** Replace the source type button group (~line 240) with SegmentGroup from `ui/segmented-control.tsx`.

**Step 4:** Replace the comma-separated tags `<input>` (~line 414) with TagsInput. Change the `tags` state from `string` to `string[]`. Update `handleCreate` to pass `tags` directly instead of `tags.split(',').map(...)`.

**Commit:** `refactor(agchain): swap wizard toggles, source selector, and tags input for Ark UI`

### Task 4: Swap Datasets toolbar search + selects

**File:** `web/src/components/agchain/datasets/AgchainDatasetsToolbar.tsx`

**Step 1:** Replace the search `<input>` (~line 38) with Combobox. Build collection from dataset items, filter client-side.

**Step 2:** Replace the 2 native `<select>` elements (source type ~line 57, validation ~line 69) with Ark Select.

**Commit:** `refactor(agchain): swap datasets toolbar search and selects for Ark UI`

### Task 5: Add Tooltips to Datasets table

**File:** `web/src/components/agchain/datasets/AgchainDatasetsTable.tsx`

**Step 1:** Wrap dataset name and slug cells (~lines 103-107) with Tooltip.

**Commit:** `refactor(agchain): add Ark UI Tooltip to datasets table`

### Task 6: Swap Models toolbar search + add Models table tooltips

**Files:** `web/src/components/agchain/models/AgchainModelsToolbar.tsx`, `web/src/components/agchain/models/AgchainModelsTable.tsx`

**Step 1:** Replace the search `<input>` in the toolbar (~line 297) with Combobox.

**Step 2:** Wrap truncated provider display name and auth kinds in the table (~lines 80-87) with Tooltip.

**Commit:** `refactor(agchain): swap models search for Combobox and add table Tooltips`

### Task 7: Add Tooltips + swap selects in Benchmarks components

**Files:** `web/src/components/agchain/benchmarks/AgchainBenchmarkStepsList.tsx`, `web/src/components/agchain/benchmarks/AgchainBenchmarkToolBag.tsx`, `web/src/components/agchain/benchmarks/AgchainBenchmarkStepInspector.tsx`

**Step 1:** Wrap truncated step names in StepsList (~lines 83-87) with Tooltip.

**Step 2:** Wrap truncated tool refs in ToolBag (~lines 86-88, 171-173) with Tooltip. Replace the native tool `<select>` (~line 123) with Ark Select.

**Step 3:** Replace the 3 native `<select>` elements in StepInspector (Step Kind ~line 145, API Boundary ~line 168, Scoring Mode ~line 192) with Ark Select.

**Commit:** `refactor(agchain): add Tooltips and swap selects in benchmark components`

### Task 8: Swap Field Mapping Editor Advanced section to Collapsible

**File:** `web/src/components/agchain/datasets/AgchainDatasetFieldMappingEditor.tsx`

**Step 1:** Import `CollapsibleRoot`, `CollapsibleTrigger`, `CollapsibleIndicator`, `CollapsibleContent` from `ui/collapsible.tsx`.

**Step 2:** Replace the manual `advancedOpen` state + button + conditional render (~lines 114-141) with Ark Collapsible.

**Commit:** `refactor(agchain): swap field mapping Advanced toggle for Ark UI Collapsible`

### Task 9: Swap DocumentsPage tab bar to Tabs

**File:** `web/src/pages/DocumentsPage.tsx`

**Step 1:** Import Tabs components from `ui/tabs.tsx`.

**Step 2:** Replace the custom tab bar (~lines 102-123) with `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`.

**Commit:** `refactor: swap DocumentsPage custom tabs for Ark UI Tabs`

### Task 10: Swap FlowsDetailRail navigation to Tabs

**File:** `web/src/components/flows/FlowsDetailRail.tsx`

The tab bar for FlowDetail is not rendered in `FlowDetail.tsx` itself — it is rendered in `FlowsDetailRail.tsx` (lines 33-54), which maps `FLOWS_SHELL_ITEMS` to `<button>` elements with manual `isActive` state via `location.pathname` comparison.

**Step 1:** Import Tabs from `ui/tabs.tsx`.

**Step 2:** Replace the `FLOWS_SHELL_ITEMS.map()` button loop (lines 33-54) with `TabsList`/`TabsTrigger`. Derive the active tab value from `location.pathname`. Wire `onValueChange` to call `navigate(buildFlowDetailPath(...))` to preserve the URL-based routing.

**Step 3:** Note: `FlowDetail.tsx` contains the tab config constants and content rendering — it does NOT need modification in this task. Only the rail navigation buttons are swapped.

**Commit:** `refactor: swap FlowsDetailRail navigation for Ark UI Tabs`

### Task 11: Swap Upload page NativeSelect

**File:** `web/src/pages/Upload.tsx`

**Step 1:** Replace the `NativeSelect` for rows-per-page (~line 470) with Ark Select.

**Commit:** `refactor: swap Upload rows-per-page NativeSelect for Ark UI Select`

### Task 12: Swap Superuser Audit History filter selects

**File:** `web/src/pages/superuser/SuperuserAuditHistory.tsx`

**Step 1:** Replace the 2 native `<select>` filter elements (~lines 190-210) with Ark Select.

**Commit:** `refactor: swap audit history filter selects for Ark UI Select`

### Task 13: Swap ServiceDetailPage function type filter

**File:** `web/src/pages/marketplace/ServiceDetailPage.tsx`

**Step 1:** Replace the native `<select>` for function type (~lines 297-309) with Ark Select.

**Commit:** `refactor: swap service detail function filter for Ark UI Select`

### Task 14: Swap Operational Readiness check grid to Collapsible

**File:** `web/src/components/superuser/OperationalReadinessCheckGrid.tsx`

**Step 1:** Replace the manual `expandedIds` Set + toggle function (~lines 141-151) with Ark Collapsible per check item. Each check becomes a `CollapsibleRoot` with `CollapsibleTrigger` (the check summary row) and `CollapsibleContent` (the expanded detail).

**Commit:** `refactor: swap readiness check grid expand/collapse for Ark UI Collapsible`

### Task 15: Migrate direct Accordion imports to wrapper

**Files:** `web/src/components/services/function-reference.tsx`, `web/src/pages/Landing.tsx`, `web/src/pages/Landing.old.tsx`, `web/src/pages/HowItWorks.tsx`

**Step 1:** In each file, replace `import { Accordion } from '@ark-ui/react/accordion'` with imports from `@/components/ui/accordion`.

**Step 2:** Update JSX to use the wrapper component names (e.g., `AccordionRoot` instead of `Accordion.Root`). If the file uses compound `Accordion.X` syntax, map each to the corresponding wrapper export.

**Commit:** `refactor: migrate direct accordion imports to ui/accordion wrapper`

### Task 16: Migrate direct Pagination imports to wrapper

**Files:** `web/src/pages/FlowsList.tsx`, `web/src/pages/superuser/DesignLayoutCaptures.tsx`, `web/src/pages/Projects.tsx`, `web/src/pages/SchemaLayout.tsx`

**Step 1:** In each file, replace `import { Pagination } from '@ark-ui/react/pagination'` with imports from `@/components/ui/pagination`.

**Step 2:** Update JSX to use wrapper component names.

**Commit:** `refactor: migrate direct pagination imports to ui/pagination wrapper`

### Task 17: Migrate direct Popover import to wrapper

**File:** `web/src/components/shell/ProjectFocusSelectorPopover.tsx`

**Step 1:** Replace `import { Popover } from '@ark-ui/react/popover'` with imports from `@/components/ui/popover`.

**Step 2:** Update JSX to use wrapper component names.

**Commit:** `refactor: migrate direct popover import to ui/popover wrapper`

### Task 18: Migrate direct TreeView imports to wrapper

**Files:** `web/src/pages/superuser/WorkspaceFileTree.tsx`, `web/src/components/flows/FlowWorkbench.tsx`, `web/src/components/documents/AssetsPanel.tsx`

**Step 1:** In each file, replace `import { TreeView, createTreeCollection } from '@ark-ui/react/tree-view'` with imports from `@/components/ui/tree-view`.

**Step 2:** Update JSX to use wrapper component names.

**Commit:** `refactor: migrate direct tree-view imports to ui/tree-view wrapper`

### Task 19: Run tests and verify build

**Step 1:** Run all tests:
```bash
cd web && npx vitest run src/components/ src/pages/
```

**Step 2:** Fix any test failures from changed DOM structure (same patterns as first pass: `getByText` → `getAllByText` for tooltip duplicates, `getByTestId` updates for removed components).

**Step 3:** Verify build:
```bash
cd web && npx vite build --mode development
```

**Commit:** `test: fix tests after Ark UI tier completion`

## Completion Criteria

The work is complete only when all of the following are true:

1. The 6 new UI wrappers exist at their declared paths and follow the established pattern.
2. Every native `<select>` targeted by this plan's tasks is replaced with Ark Select. The Wizard delimiter select and Tools source kind filter are intentionally excluded.
3. Zero custom toggle switches (the `relative h-6 w-11 rounded-full` pattern) remain in AGChain pages.
4. All AGChain toolbar search inputs use Combobox.
5. All AGChain table cells with potential text truncation have Tooltip wrapping.
6. DocumentsPage, FlowDetail, Upload, SuperuserAuditHistory, and ServiceDetailPage use Ark UI primitives.
7. OperationalReadinessCheckGrid uses Collapsible for expandable detail.
8. All existing tests pass (excluding pre-existing `AgchainProjectSwitcher.test.tsx`).
9. `npx vite build --mode development` succeeds.
10. The file inventory matches the locked counts (6 new wrappers, 10 modified AGChain, 6 modified non-AGChain pages + 12 consistency migrations).
11. No files import directly from `@ark-ui/react/accordion`, `@ark-ui/react/pagination`, `@ark-ui/react/popover`, or `@ark-ui/react/tree-view` — all go through `ui/` wrappers.