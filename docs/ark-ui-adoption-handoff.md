# Ark UI Component Adoption — Handoff for Continuation

This document gives a cold-start session everything it needs to continue adopting Ark UI components across blockdata pages and superuser admin surfaces. Read this fully before starting work.

## Background

The app already uses `@ark-ui/react@5.32.0` as its primary component primitive layer. 15+ wrapper components in `web/src/components/ui/` wrap Ark UI primitives with Tailwind styling via `cn()`. The AGChain pages were built fast over the past week and skipped these wrappers, using custom Tailwind implementations instead. A first pass has been completed on 4 AGChain pages. This session continues the adoption across the rest of the app.

## What Already Exists

### Ark UI wrappers in `web/src/components/ui/`

These wrappers are ready to import and use — no new code needed:

| Wrapper | File | Wraps |
|---------|------|-------|
| Tabs | `ui/tabs.tsx` | `@ark-ui/react/tabs` — Root, List, Trigger, Content (has `lazyMount` + `unmountOnExit` by default) |
| Select | `ui/select.tsx` | `@ark-ui/react/select` — full compound: Root, Trigger, Content, Item, etc. Re-exports `createListCollection` |
| Switch | `ui/switch.tsx` | `@ark-ui/react/switch` — Root, Control, Thumb, Label, HiddenInput |
| Tooltip | `ui/tooltip.tsx` | `@ark-ui/react/tooltip` — Root, Trigger, Content (with Portal) |
| Dialog | `ui/dialog.tsx` | `@ark-ui/react/dialog` — full compound with Portal, Backdrop, Positioner |
| Menu | `ui/menu.tsx` | `@ark-ui/react/menu` — Root, Trigger, Content, Item, ItemGroup, Separator |
| Collapsible | `ui/collapsible.tsx` | `@ark-ui/react/collapsible` — Root, Trigger, Indicator, Content |
| Field | `ui/field.tsx` | `@ark-ui/react/field` |
| File Upload | `ui/file-upload.tsx` | `@ark-ui/react/file-upload` |
| Number Input | `ui/number-input.tsx` | `@ark-ui/react/number-input` |
| Scroll Area | `ui/scroll-area.tsx` | `@ark-ui/react/scroll-area` |
| Segment Group | `ui/segment-group.tsx` | `@ark-ui/react/segment-group` |
| Segmented Control | `ui/segmented-control.tsx` | Built on segment-group |
| Steps | `ui/steps.tsx` | `@ark-ui/react/steps` — Root, List, Item, Trigger, Indicator, Separator, Content |
| Combobox | `ui/combobox.tsx` | `@ark-ui/react/combobox` — full compound with filter. Re-exports `useListCollection`, `useFilter` |
| Splitter | `ui/splitter.tsx` | `@ark-ui/react/splitter` — Root, Panel, ResizeTrigger, ResizeTriggerIndicator |

### Wrappers that use Radix (not Ark) — leave as-is

| Wrapper | File | Notes |
|---------|------|-------|
| Sheet | `ui/sheet.tsx` | `@radix-ui/react-dialog` — used for side panels/inspectors |
| Separator | `ui/separator.tsx` | `@radix-ui/react-separator` |
| Button | `ui/button.tsx` | `@radix-ui/react-slot` — just for `asChild` support |

### What was NOT wrapped (Sonner stays)

Toast uses Sonner via `ui/provider.tsx`. Do not swap to Ark Toast — the global provider is already wired and working.

## Wrapper Pattern

Every new wrapper must follow the established pattern. Study `ui/tabs.tsx` (minimal) and `ui/collapsible.tsx` (with default styles) as references.

```typescript
import { ComponentName as ArkComponentName } from '@ark-ui/react/component-name';
import { cn } from '@/lib/utils';  // NOT @/lib/cn

function WrapperRoot({ className, ...props }: React.ComponentProps<typeof ArkComponentName.Root>) {
  return (
    <ArkComponentName.Root
      className={cn('default-styles', className)}
      data-slot="component-name"
      {...props}
    />
  );
}

// Named exports, no default export
export { WrapperRoot, WrapperTrigger, WrapperContent };
```

Key rules:
- Import `cn` from `@/lib/utils` (20/22 wrappers use this, not `@/lib/cn`)
- Use `React.ComponentProps<typeof ArkComponent.Part>` for props
- Add `data-slot` attributes for styling hooks
- Spread `...props` last
- Use Tailwind data-attribute selectors for state: `data-[state=open]:`, `data-[selected]:`, `data-[highlighted]:`

## Completed Work (AGChain pages — already done)

These pages have already been converted. Do not re-do them.

| Page | File | What was done |
|------|------|---------------|
| Dataset Detail | `web/src/pages/agchain/AgchainDatasetDetailPage.tsx` | Custom tab bar → Ark Tabs with lazy mount |
| Dataset Version Switcher | `web/src/components/agchain/datasets/AgchainDatasetVersionSwitcher.tsx` | Native `<select>` → Ark Select |
| Dataset Create Wizard | `web/src/components/agchain/datasets/AgchainDatasetWizard.tsx` | Manual step sidebar → Ark Steps |
| Benchmarks Workbench | `web/src/pages/agchain/AgchainBenchmarksPage.tsx` | Hash-link nav → Ark Tabs (vertical), grid layout → Ark Splitter for inspector |
| Tools Page | `web/src/pages/agchain/AgchainToolsPage.tsx` | Plain search input → Ark Combobox with typeahead |
| Tools Table | `web/src/components/agchain/tools/AgchainToolsTable.tsx` | Truncated cells → Ark Tooltip wrapping |

## Remaining Work — Prioritized

### FIRST: Finish Tier 1 on AGChain Pages

The first session completed a 4-page subset. These Tier 1 items on AGChain pages were identified but not implemented:

**Switch → Dataset Version Draft toggles**
- File: `web/src/pages/agchain/AgchainDatasetVersionDraftPage.tsx`
- Pattern: Custom `relative h-6 w-11 rounded-full` toggle buttons with manual transform
- Replace with: `SwitchRoot`/`SwitchControl`/`SwitchThumb` from `ui/switch.tsx`

**Combobox → Datasets and Models search toolbars**
- File: `web/src/pages/agchain/AgchainDatasetsPage.tsx` — plain search `<input>` in toolbar
- File: `web/src/pages/agchain/AgchainModelsPage.tsx` — plain search `<input>` in toolbar
- Replace with: `ComboboxRoot`/`ComboboxInput`/`ComboboxContent`/`ComboboxItem` from `ui/combobox.tsx`
- Pattern: same as the Tools page implementation — build collection from registry items, filter client-side with `useFilter`

**Tooltip → All AGChain tables with truncated cells**
- Files: `web/src/components/agchain/datasets/AgchainDatasetsTable.tsx`, `web/src/components/agchain/models/AgchainModelsTable.tsx`, `web/src/components/agchain/benchmarks/AgchainBenchmarksTable.tsx`
- Pattern: same as Tools table — wrap truncated `<p>` cells with `Tooltip`/`TooltipTrigger`/`TooltipContent`
- Also: icon-only buttons across all AGChain pages that lack visible labels

**Tooltip → Benchmarks Workbench truncated step names and tool refs**
- File: `web/src/components/agchain/benchmarks/AgchainBenchmarkStepsList.tsx`
- File: `web/src/components/agchain/benchmarks/AgchainBenchmarkToolBag.tsx`

### SECOND: Tier 2 on AGChain Pages

These add new interaction patterns to pages that are already built:

**Collapsible → Benchmark step groups and field mapping sections**
- Wrapper exists at `ui/collapsible.tsx`
- File: `web/src/components/agchain/datasets/AgchainDatasetFieldMappingEditor.tsx` — field groups could collapse
- File: `web/src/components/agchain/benchmarks/AgchainBenchmarkStepInspector.tsx` — inspector form sections

**Menu → Table row actions**
- Wrapper exists at `ui/menu.tsx`
- Where: Dataset rows (edit/delete), Tool rows (replacing the single "Inspect" button with a menu), Benchmark steps (move up/down/delete)

**Tags Input → Multi-value inputs**
- Needs new wrapper: `ui/tags-input.tsx` wrapping `@ark-ui/react/tags-input`
- File: `web/src/components/agchain/datasets/AgchainDatasetWizard.tsx` — tags field (currently a plain comma-separated input)
- File: `web/src/components/agchain/settings/InviteOrganizationMembersModal.tsx` — email entry

**Clipboard → Copy-to-clipboard on IDs and refs**
- Needs new wrapper: `ui/clipboard.tsx` wrapping `@ark-ui/react/clipboard`
- Where: Tool signatures, dataset sample values, version IDs, API keys in settings

### THIRD: Adopt Across Non-AGChain Pages

### HIGH Priority: Manual Tab Systems → Ark Tabs

These pages have custom tab bars built with `<button>` + manual active state. Swap them for `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` from `ui/tabs.tsx`. The wrapper already handles `lazyMount` and `unmountOnExit`.

| Page | File | Tab pattern location |
|------|------|---------------------|
| Documents Page | `web/src/pages/DocumentsPage.tsx` | ~lines 102-123, manual tab buttons |
| Flow Detail | `web/src/pages/FlowDetail.tsx` | `FLOW_TABS` array with onClick handlers |

### HIGH Priority: Native HTML Selects → Ark Select

These use `<select>` or `NativeSelect` where Ark Select would give keyboard nav, typeahead, and proper ARIA.

| Page | File | What to replace |
|------|------|----------------|
| Upload | `web/src/pages/Upload.tsx` | `NativeSelect` for rows-per-page (~line 470) |
| Instance Config | `web/src/pages/settings/InstanceConfigPanel.tsx` | Native selects for config fields with `fieldType: 'select'` |

### HIGH Priority: Custom Filter Dropdowns → Ark Select or Combobox

| Page | File | What to replace |
|------|------|----------------|
| Superuser Audit History | `web/src/pages/superuser/SuperuserAuditHistory.tsx` | `auditRangeFilter` and `auditActorFilter` dropdowns (~lines 100-101) |
| Service Detail | `web/src/pages/marketplace/ServiceDetailPage.tsx` | `selectedFunctionType` filter dropdown (~line 41) |

### MEDIUM Priority: Expandable Sections → Ark Collapsible

The wrapper already exists at `ui/collapsible.tsx`. These components use manual `Set<string>` toggle state for expandable content.

| Component | File | What to replace |
|-----------|------|----------------|
| Readiness Check Grid | `web/src/components/superuser/OperationalReadinessCheckGrid.tsx` | `expandedIds` Set + toggle function (~lines 141-150) → Ark Collapsible per check |

### MEDIUM Priority: Add Tooltips to Truncated Table Cells

Same pattern as the Tools table — wrap truncated `<p>` or `<td>` content with `Tooltip`/`TooltipTrigger`/`TooltipContent`. Import from `ui/tooltip.tsx`.

Candidates:
- Any table with `truncate` class on text cells
- Icon-only buttons without visible labels
- Badge cells where the full value might be clipped

### LOWER Priority: Switch on Form Toggles

The wrapper exists at `ui/switch.tsx`. Look for custom toggle implementations (the `relative h-6 w-11 rounded-full` pattern with manual transform). The Dataset Version Draft page (`AgchainDatasetVersionDraftPage.tsx`) has these.

### LOWER Priority: Menu for Row Actions

Where tables have inline action buttons (Edit, Delete, Archive) that could become a dropdown `...` menu. Use the existing `ui/menu.tsx` wrapper.

## What NOT to Change

- **Project/Organization Switchers** — use `ProjectFocusSelectorPopover`, a custom shell component with its own design intent
- **Toast system** — stays on Sonner
- **Sheet component** — stays on Radix
- **Any backend code** — this is purely frontend
- **Data fetching hooks** — components change how data is rendered, not where it comes from

## How to Verify

1. Build: `cd web && npx vite build --mode development`
2. Tests: `cd web && npx vitest run src/pages/ src/components/`
3. Visual: `cd web && npm run dev` → check pages at `localhost:5374`

Note: `AgchainProjectSwitcher.test.tsx` has a pre-existing failure unrelated to Ark UI work. Ignore it.

## Ark UI MCP Tools Available

This environment has an Ark UI MCP server with these tools:
- `mcp__ark-ui__list_components` — list all components for a framework
- `mcp__ark-ui__list_examples` — list examples for a component
- `mcp__ark-ui__get_example` — get full example code + CSS
- `mcp__ark-ui__get_component_props` — get props/API for a component
- `mcp__ark-ui__styling_guide` — get data attributes for styling

Use `framework: "react"` for all calls.

## Tier Classification (for prioritization reference)

### Tier 1 — Direct replacements of existing custom implementations
Tabs, Select, Switch, Steps, Combobox, Tooltip

### Tier 2 — New capabilities that improve existing pages
Splitter, Collapsible, Accordion, Menu, Pagination, Clipboard, Tags Input

### Tier 3 — Enablers for pages not yet built
Tree View (Prompts), Editable (inline rename), Hover Card (Results/Runs), Navigation Menu (deep settings), Segment Group (view mode toggles), Progress (run execution), Floating Panel (draggable inspectors)