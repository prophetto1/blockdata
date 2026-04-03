# Ark UI Wrapper Visual Correction Plan

**Goal:** Restyle all 21 visually ineffective Ark UI wrapper components in `web/src/components/ui/` so they match the visual quality of Ark UI's standard examples — visible borders, primary-color accents, animated indicators, shadows on floating content, properly sized controls — instead of the current invisible-on-dark-background styling. Restore 2 incorrectly deleted test files. Produce visual proof of improvement.

**Architecture:** This is a targeted correction pass for a failed adoption outcome. The wrappers already have the correct Ark UI component composition. The problem is they use low-contrast theme tokens (`border-border`, `bg-background`, `bg-accent`, `bg-muted`) that are nearly invisible on the app's `#0e0e0e` dark background. The fix is CSS-class-only changes to 21 wrapper files, using Ark UI standard example CSS (fetched via `ark-ui` MCP tool) as the visual baseline, mapped to our theme tokens. No structural changes, no new wrappers, no global token changes, no direct-import migrations.

**Reference:** Ark UI standard examples fetched via `mcp__ark-ui__get_example` for: select, checkbox, tabs, dialog, menu, accordion, combobox, switch, popover, tooltip, tags-input, pagination. The CSS module files from those examples define the visual baseline for each wrapper.

**Token mapping from Ark examples to our theme:**

| Ark demo token | Our equivalent | Tailwind class |
|---|---|---|
| `--demo-coral-solid` | `--primary` (#EB5E41) | `bg-primary`, `border-primary` |
| `--demo-coral-contrast` | `--primary-foreground` (#ffffff) | `text-primary-foreground` |
| `--demo-coral-fg` | `--primary` (#EB5E41) | `text-primary` |
| `--demo-coral-subtle` | primary at 10% | `bg-primary/10` |
| `--demo-coral-focus-ring` | `--ring` (#EB5E41) | `outline-2 outline-primary` |
| `--demo-border-emphasized` | stronger border than `--border` | `border-[#3a3a3a]` |
| `--demo-neutral-subtle` | white at ~5% | `bg-white/5` |
| `--demo-neutral-muted` | white at ~5% | `bg-white/5` |
| `--demo-bg-popover` | `--popover` (#141414) | `bg-popover` |
| `--demo-bg-thumb` | white | `bg-white` |
| `--demo-shadow-md` | shadow | `shadow-lg shadow-black/30` |
| `--demo-shadow-sm` | shadow | `shadow-md shadow-black/20` |

**Tech Stack:** React, TypeScript, Tailwind CSS, `@ark-ui/react`.

**Status:** Draft
**Author:** jon
**Date:** 2026-04-03

## Context: Why This Plan Exists

Three prior CC sessions attempted Ark UI adoption. They produced 22 wrapper files and 60+ component swaps, but zero visible UI improvement. The wrappers were styled using theme tokens that are nearly invisible on the app's dark background. A detailed status report at `docs/plans/arkui/2026-04-03-ark-ui-status-report.md` documents the root cause and full wrapper inventory. This plan is the targeted correction.

### What this plan is NOT

- Not a full-codebase Ark migration
- Not a migration of direct-import Ark consumers to wrappers
- Not creation of wrappers for unwrapped Ark components
- Not a global theme-token redesign
- Not a re-litigation of whether Ark should be used

## Platform API

No platform API changes. This corrects frontend wrapper styling only.

## Observability

No observability changes. All changes are client-side CSS class replacements in React wrapper files.

## Database Migrations

No database migrations. Purely presentational.

## Edge Functions

No edge functions created or modified.

## Frontend Surface Area

**New pages:** 0
**New components:** 0
**New hooks:** 0
**New services:** 0

**Modified wrappers:** 21

| # | Wrapper | File | Key Changes |
|---|---------|------|-------------|
| 1 | Select | `select.tsx` | Trigger border, content shadow, item highlight/checked colors |
| 2 | Checkbox | `checkbox.tsx` | Control size 1.25rem, border, checked primary fill |
| 3 | Tabs | `tabs.tsx` | Indicator → filled panel, selected text primary, list no border |
| 4 | Combobox | `combobox.tsx` | Input border/focus, content shadow, item highlight/checked |
| 5 | Dialog | `dialog.tsx` | Content border/shadow, close trigger hover/focus |
| 6 | Menu | `menu.tsx` | Trigger border/hover, content shadow, item highlight |
| 7 | Switch | `switch.tsx` | Control track, thumb bg |
| 8 | Accordion | `accordion.tsx` | Item border, trigger focus |
| 9 | Collapsible | `collapsible.tsx` | Root border/bg, trigger hover, content border |
| 10 | Tooltip | `tooltip.tsx` | Content border/shadow |
| 11 | Popover | `popover.tsx` | Content border/shadow, arrow border, close focus |
| 12 | Pagination | `pagination.tsx` | Trigger/item border/hover/focus |
| 13 | Number Input | `number-input.tsx` | Input border/bg |
| 14 | Tags Input | `tags-input.tsx` | Control border/focus, item preview bg, item input bg |
| 15 | Splitter | `splitter.tsx` | Resize trigger line/indicator |
| 16 | Steps | `steps.tsx` | Trigger focus, incomplete indicator border, separator |
| 17 | Segment Group | `segment-group.tsx` | Root bg/ring, indicator bg, item checked text |
| 18 | Tree View | `tree-view.tsx` | Branch/item hover/selected/focus, indent guide |
| 19 | File Upload | `file-upload.tsx` | Dropzone border/hover/focus, item border |
| 20 | Progress | `progress.tsx` | Track bg |
| 21 | Scroll Area | `scroll-area.tsx` | Scrollbar visibility (CSS file) |

**Restored test files:** 2

| # | File |
|---|------|
| 1 | `web/src/components/agchain/AgchainWorkspaceSync.test.tsx` |
| 2 | `web/src/pages/agchain/AgchainToolsPage.test.tsx` |

## Pre-Implementation Contract

No major decision may be improvised during implementation. If any locked requirement below needs to change, implementation must stop and this plan must be revised first.

### MCP Reference Guidance

The Ark UI standard examples define the visual baseline. This plan already contains the translated patterns for all 21 wrappers. The implementer SHOULD reference the Ark example via `mcp__ark-ui__get_example` when:
- A task description is ambiguous about the intended visual outcome
- A component-specific deviation from the default token replacements is being considered
- The implementer wants to verify sub-component composition before restyling

Do not invent styling. Use the plan's translated patterns as the primary reference, and the MCP examples as the authoritative fallback.

### Locked Token Replacement Rules

These are the default replacements to apply across all 21 wrappers. Component-specific deviations are permitted when the Ark standard example clearly calls for a different pattern (e.g., Segment Group indicator using `bg-popover` instead of `bg-transparent`), but any deviation must be documented in the commit message with the reasoning.

| Current token | Replacement | Applies to |
|---|---|---|
| `border-border` | `border-[#3a3a3a]` | All borders |
| `border-input` | `border-[#3a3a3a]` | Form input borders |
| `bg-background` | `bg-transparent` | Form control backgrounds |
| `bg-accent` | `bg-white/5` | Hover/highlight states |
| `bg-muted` | `bg-white/5` | Track/container backgrounds |
| `bg-accent/80` | `bg-primary/10` | Active/indicator backgrounds |
| `bg-accent/30` | `bg-white/5` | Subtle hover states |
| `hover:bg-accent` | `hover:bg-white/5` | Hover states |
| `hover:bg-accent/20` | `hover:bg-white/5` | Subtle hover |
| `hover:bg-muted/50` | `hover:bg-white/5` | Subtle hover |
| `text-accent-foreground` | `text-foreground` | Text in highlight states (unless checked, then `text-primary`) |
| `data-[highlighted]:bg-accent` | `data-[highlighted]:bg-white/5` | Dropdown item highlight |
| `data-[highlighted]:text-accent-foreground` | (remove — keep `text-foreground`) | Dropdown item highlight text |
| `data-[selected]:bg-accent` | `data-[selected]:bg-white/5` | Tree/nav selected |
| `data-[selected]:text-accent-foreground` | `data-[selected]:text-primary` | Selected text color |
| `data-[state=checked]:text-foreground` | `data-[state=checked]:text-primary` | Checked item text |
| `focus-visible:ring-2 focus-visible:ring-ring` | `focus-visible:border-primary focus-visible:shadow-[0_0_0_1px_var(--primary)]` | Inline focus (triggers, inputs) |
| `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` | `focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2` | Outline focus (buttons, controls) |
| `data-[focus-visible]:outline-ring` | `data-[focus-visible]:outline-primary` | Data-attr focus |
| `ring-border` | `ring-[#3a3a3a]` | Inset ring |
| `shadow-md` (on floating content) | `shadow-lg shadow-black/30` | Dropdowns, popovers, tooltips |
| `shadow-sm` (on indicators) | `shadow-md shadow-black/20` | Segment indicator, splitter handle |
| `bg-border` | `bg-[#3a3a3a]` | Separator/guide lines |
| `before:bg-border` | `before:bg-[#3a3a3a]` | Pseudo-element separators |
| `stroke-accent` | `stroke-white/10` | SVG tracks |
| `h-4 w-4` (checkbox only) | `h-5 w-5` | Checkbox control size |

### Locked Visual Requirements

1. **Floating content** (Select, Combobox, Menu, Popover, Tooltip) must have `border-[#3a3a3a]`, `shadow-lg shadow-black/30`, and scale-fade animation.
2. **Form inputs** (Select trigger, Combobox input, Number input, Tags input control) must have `border-[#3a3a3a]` border and primary-colored focus treatment.
3. **Hover states** on interactive items must use `bg-white/5` — visibly distinct from the surrounding background.
4. **Checked/selected states** must use `text-primary` for text and `bg-primary` for fills.
5. **Focus treatment** must use primary color (`#EB5E41`) — either as border+shadow for inline elements or outline for standalone controls.
6. **Checkbox control** must be `h-5 w-5` (1.25rem), matching the Ark standard example.
7. **Tabs indicator** must be a `bg-primary/10` filled panel, not a 2px line.
8. **Switch thumb** must be `bg-white` (visible on dark), not `bg-background` (invisible).

### Locked Acceptance Contract

The implementation is complete only when all of the following are true:

1. Both deleted test files are restored and passing.
2. All 21 wrapper files have been restyled per the token replacement rules.
3. Select dropdowns have visible borders, shadows, and item hover highlights.
4. Checkboxes are 1.25rem with primary fill on checked state.
5. Tab indicator is a filled primary-tinted panel behind the selected tab.
6. Switch thumb is visible (white) on the dark background.
7. Menu/Combobox/Popover/Tooltip floating content has visible borders and shadows.
8. All hover, focus, and selected states are easy to perceive on the `#0e0e0e` background.
9. Build passes (`cd web && npx vite build --mode development`).
10. Tests pass (`cd web && npx vitest run`).
11. Visual proof (Playwright screenshots) shows obvious improvement on AGChain surfaces.

### Consumer Audit Findings

Verified consumer override patterns — no consumer file changes needed for this pass:

| Consumer | Override Pattern | Blocks Restyling? | Action |
|----------|-----------------|:-:|---|
| AgchainBenchmarksPage | Full TabsTrigger visual override with `data-[selected]:bg-primary` | No — intentional sidebar nav, consumer wins via twMerge | None |
| AgchainDatasetDetailPage | No className overrides on Tabs | No | Benefits automatically |
| AgchainDatasetSamplesTable | SelectTrigger `h-9 min-w-[10rem]` (dimensional only) | No | Benefits automatically |
| AgchainToolEditorDialog | SelectTrigger `h-10` (dimensional only) | No | Benefits automatically |
| AgchainModelsToolbar | Checkbox uses wrapper (no overrides); Select uses raw Ark (Pattern A) | Checkbox: No. Select: out of scope | Checkbox benefits; raw Select unchanged this pass |

### Scope Boundaries

**In scope:**
- Restoring 2 deleted tests
- Restyling 21 existing wrapper files
- Validating wrapper consumers show visible improvement
- Updating tests for legitimate Ark DOM changes

**Out of scope:**
- Migrating ~25 direct-import files to wrappers
- Creating wrappers for 12 unwrapped Ark components
- Global theme token redesign
- Marketing page styling
- Non-Ark component styling

### Stop Conditions

Stop and escalate if:
- Fixing wrappers appears impossible without a global token redesign
- Meaningful improvement requires mass migration of direct-import files
- New wrapper creation becomes required to show progress
- Work expands beyond wrapper correction into general UI redesign

## Locked Inventory Counts

### Test Restoration
- Restored files: **2**

### Wrapper Restyling
- Modified wrapper files: **21** (plus conditionally `scroll-area.css` = **22** max)
- New files: **0**
- Test files potentially requiring assertion updates: **up to 8** (conditional on actual test failures)

### Restyling Breakdown by Category

| Category | Wrappers | Count |
|----------|----------|:-----:|
| Form controls | Select, Checkbox, Switch, Number Input, Tags Input, File Upload | 6 |
| Floating content | Combobox, Dialog, Menu, Popover, Tooltip | 5 |
| Navigation | Tabs, Accordion, Collapsible, Pagination, Segment Group, Steps | 6 |
| Layout | Splitter, Tree View, Progress, Scroll Area | 4 |

### Sub-components requiring changes: **51** across 21 files (including 1 CSS file edit for scroll-area)

## Locked File Inventory

### Restored files

| # | File |
|---|------|
| 1 | `web/src/components/agchain/AgchainWorkspaceSync.test.tsx` |
| 2 | `web/src/pages/agchain/AgchainToolsPage.test.tsx` |

### Modified files

| # | File |
|---|------|
| 1 | `web/src/components/ui/select.tsx` |
| 2 | `web/src/components/ui/checkbox.tsx` |
| 3 | `web/src/components/ui/tabs.tsx` |
| 4 | `web/src/components/ui/combobox.tsx` |
| 5 | `web/src/components/ui/dialog.tsx` |
| 6 | `web/src/components/ui/menu.tsx` |
| 7 | `web/src/components/ui/switch.tsx` |
| 8 | `web/src/components/ui/accordion.tsx` |
| 9 | `web/src/components/ui/collapsible.tsx` |
| 10 | `web/src/components/ui/tooltip.tsx` |
| 11 | `web/src/components/ui/popover.tsx` |
| 12 | `web/src/components/ui/pagination.tsx` |
| 13 | `web/src/components/ui/number-input.tsx` |
| 14 | `web/src/components/ui/tags-input.tsx` |
| 15 | `web/src/components/ui/splitter.tsx` |
| 16 | `web/src/components/ui/steps.tsx` |
| 17 | `web/src/components/ui/segment-group.tsx` |
| 18 | `web/src/components/ui/tree-view.tsx` |
| 19 | `web/src/components/ui/file-upload.tsx` |
| 20 | `web/src/components/ui/progress.tsx` |
| 21 | `web/src/components/ui/scroll-area.tsx` |
| 22 | `web/src/components/ui/scroll-area.css` (if scrollbar styling needs changes) |

### Test files potentially requiring Ark DOM assertion updates

If Task 8 reveals test failures due to Ark DOM structure changes (e.g., assertions checking for native elements that were replaced with Ark components in earlier sessions), the following test files may need assertion updates. These are not pre-committed scope — they are conditional on actual test failures.

| # | File | Reason |
|---|------|--------|
| 1 | `web/src/components/agchain/AgchainProjectSwitcher.test.tsx` | May assert on Select DOM |
| 2 | `web/src/components/agchain/AgchainModelsTable.test.tsx` | May assert on Checkbox DOM |
| 3 | `web/src/components/agchain/CreatePermissionGroupModal.test.tsx` | May assert on Checkbox DOM |
| 4 | `web/src/components/agchain/InviteOrganizationMembersModal.test.tsx` | May assert on Checkbox DOM |
| 5 | `web/src/components/agchain/PermissionGroupMembersModal.test.tsx` | May assert on Checkbox DOM |
| 6 | `web/src/pages/agchain/AgchainDatasetsPage.test.tsx` | May assert on Tabs DOM |
| 7 | `web/src/pages/agchain/AgchainModelsPage.test.tsx` | May assert on Select/Checkbox DOM |
| 8 | `web/src/pages/agchain/AgchainOrganizationMembersPage.test.tsx` | May assert on Select DOM |

## Explicit Risks

1. **Consumer className overrides may conflict.** The Benchmarks page passes extensive TabsTrigger overrides. twMerge ensures consumer classes win, so the sidebar tabs keep their filled-background pattern. Verified no other blocking overrides exist.
2. **h-5 w-5 checkbox may shift layouts slightly.** Grows from 1rem to 1.25rem. In flex layouts with `items-center` this should be fine.
3. **Scroll area uses CSS modules, not Tailwind.** May need a separate CSS file edit rather than className changes.
4. **51 sub-component changes across 21 files.** Higher risk of a missed replacement. Mitigation: verify via grep after completion that no `border-border`, `bg-accent` (without `/`), `bg-background`, or `bg-muted` tokens remain in the 21 files.
5. **Hard-coded palette values sit outside the semantic token system.** Using `border-[#3a3a3a]`, `bg-white/5`, and `shadow-black/30` directly in 21 wrappers creates a wrapper-local styling layer that does not participate in the existing `--border`, `--accent`, `--muted` design system. This is an accepted short-term tradeoff: changing the global tokens is too risky for this correction pass (affects non-Ark components across the entire app). A follow-on batch should consider extracting these into semantic tokens (e.g., `--border-emphasized`, `--surface-subtle`, `--surface-floating`) so the wrapper layer reconnects with the design system.
6. **Test files may need assertion updates.** If tests assert on DOM elements that changed in the prior Ark adoption (native `<select>` → Ark Select, native checkbox → Ark Checkbox), those assertions may fail. The conditional test file list in the inventory identifies the candidates.

---

## Tasks

### Task 0: Restore deleted test files

**File(s):**
- `web/src/components/agchain/AgchainWorkspaceSync.test.tsx`
- `web/src/pages/agchain/AgchainToolsPage.test.tsx`

**Step 1:** Restore both files from HEAD:
```bash
git restore --staged web/src/components/agchain/AgchainWorkspaceSync.test.tsx
git restore web/src/components/agchain/AgchainWorkspaceSync.test.tsx
git restore --staged web/src/pages/agchain/AgchainToolsPage.test.tsx
git restore web/src/pages/agchain/AgchainToolsPage.test.tsx
```

**Step 2:** Verify both files exist:
```bash
ls -la web/src/components/agchain/AgchainWorkspaceSync.test.tsx web/src/pages/agchain/AgchainToolsPage.test.tsx
```

**Test command:** `cd web && npx vitest run src/components/agchain/AgchainWorkspaceSync.test.tsx src/pages/agchain/AgchainToolsPage.test.tsx`
**Expected output:** Both tests pass.

**Commit:** `fix: restore incorrectly deleted AgchainWorkspaceSync and AgchainToolsPage tests`

### Task 1: Restyle Select wrapper

**File:** `web/src/components/ui/select.tsx`

**MCP reference:** `select/basic` example CSS. Key patterns: `border: 1px solid var(--demo-border-emphasized)`, `box-shadow: var(--demo-shadow-md)`, `background: var(--demo-neutral-subtle)` on highlight, `color: var(--demo-coral-fg)` on checked.

**Changes (4 sub-components):**

`SelectTrigger`:
- `border border-border` → `border border-[#3a3a3a]`
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` → `focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[0_0_0_1px_var(--primary)]`
- Add `transition-[border-color,box-shadow] duration-150`

`SelectContent`:
- `border border-border` → `border border-[#3a3a3a]`
- `shadow-md` (if present) or add `shadow-lg shadow-black/30`

`SelectItem`:
- `data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground` → `data-[highlighted]:bg-white/5`
- `data-[state=checked]:text-foreground` → `data-[state=checked]:text-primary`

`SelectIndicator` (chevron): no change needed — already `text-muted-foreground`.

**Test command:** `cd web && npx tsc --noEmit --pretty 2>&1 | head -5`
**Commit:** `fix(ui): restyle Select wrapper — visible borders, shadows, primary checked`

### Task 2: Restyle Checkbox wrapper

**File:** `web/src/components/ui/checkbox.tsx`

**MCP reference:** `checkbox/basic` example CSS. Key patterns: `width/height: 1.25rem`, `border: 1px solid var(--demo-border-emphasized)`, checked `background: var(--demo-coral-solid)`.

**Changes (2 sub-components):**

`CheckboxControl`:
- `h-4 w-4` → `h-5 w-5`
- `border border-input bg-background` → `border border-[#3a3a3a] bg-transparent`
- `data-[state=checked]:border-primary data-[state=checked]:bg-primary` — already correct
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` → `data-[focus-visible]:outline-2 data-[focus-visible]:outline-primary data-[focus-visible]:outline-offset-2`

`CheckboxIndicator`: Update SVG from 12×12 to 14×14 to match larger control:
- `width="12" height="12" viewBox="0 0 12 12"` → `width="14" height="14" viewBox="0 0 14 14"`
- `<path d="M2.5 6l2.5 2.5 4.5-5" />` → `<path d="M3 7l3 3 5-5.5" />`

**Commit:** `fix(ui): restyle Checkbox wrapper — 1.25rem, visible border, primary fill`

### Task 3: Restyle Tabs wrapper

**File:** `web/src/components/ui/tabs.tsx`

**MCP reference:** `tabs/indicator` example CSS. Key patterns: indicator `background: var(--demo-coral-subtle); border-radius: 0.375rem; height: 2rem`, trigger `data-[selected] color: var(--demo-coral-fg)`.

**Changes (3 sub-components):**

`TabsList`:
- Remove `data-[orientation=horizontal]:border-b data-[orientation=horizontal]:border-border`
- Add `isolate gap-1`

`TabsTrigger`:
- `text-muted-foreground` → keep
- `hover:text-foreground` → keep
- `data-[selected]:text-foreground` → `data-[selected]:text-primary`
- `px-4 py-2` → `px-3 h-8`
- Add `rounded-md bg-transparent border-none whitespace-nowrap select-none`
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` → `focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2`

`TabsIndicator`:
- `bg-accent/80` → `bg-primary/10`
- `data-[orientation=horizontal]:h-[2px] data-[orientation=horizontal]:bottom-0` → `data-[orientation=horizontal]:h-8`
- Add `rounded-md`

**Commit:** `fix(ui): restyle Tabs wrapper — primary indicator panel, primary selected text`

### Task 4a: Restyle Combobox and Menu wrappers

**Files:** `combobox.tsx`, `menu.tsx`

**Shared pattern:** Floating content needs `border-[#3a3a3a]` and `shadow-lg shadow-black/30`. Highlight states need `bg-white/5`. Focus rings need primary color.

#### combobox.tsx (3 sub-components)

`ComboboxInput`:
- `border border-border` → `border border-[#3a3a3a]`
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` → `focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[0_0_0_1px_var(--primary)]`

`ComboboxContent`:
- `border border-border` → `border border-[#3a3a3a]`
- `shadow-md` → `shadow-lg shadow-black/30`

`ComboboxItem`:
- `data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground` → `data-[highlighted]:bg-white/5`
- `data-[state=checked]:text-foreground` → `data-[state=checked]:text-primary`

#### menu.tsx (3 sub-components)

`MenuTrigger`:
- `bg-background` → `bg-transparent`
- `border border-input` → `border border-[#3a3a3a]`
- `hover:bg-accent hover:text-accent-foreground` → `hover:bg-white/5`
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` → `focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2`

`MenuContent`:
- `border border-border` → `border border-[#3a3a3a]`
- `shadow-md` → `shadow-lg shadow-black/30`

`MenuItem`:
- `data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground` → `data-[highlighted]:bg-white/5`

**Commit:** `fix(ui): restyle Combobox and Menu wrappers — visible borders, shadows, highlights`

### Task 4b: Restyle Dialog, Popover, and Tooltip wrappers

**Files:** `dialog.tsx`, `popover.tsx`, `tooltip.tsx`

#### dialog.tsx (2 sub-components)

`DialogContent`:
- `border border-border` → `border border-[#3a3a3a]`
- `shadow-lg` → `shadow-lg shadow-black/30`

`DialogCloseTrigger`:
- `hover:bg-accent hover:text-accent-foreground` → `hover:bg-white/5 hover:text-foreground`
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` → `focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2`

#### popover.tsx (3 sub-components)

`PopoverContent`:
- `border border-border` → `border border-[#3a3a3a]`
- `shadow-md` → `shadow-lg shadow-black/30`

`PopoverArrow`:
- `border-t border-l border-border` → `border-t border-l border-[#3a3a3a]`

`PopoverCloseTrigger`:
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` → `focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2`

#### tooltip.tsx (1 sub-component)

`TooltipContent`:
- `border border-border` → `border border-[#3a3a3a]`
- `shadow-md` → `shadow-lg shadow-black/30`

**Commit:** `fix(ui): restyle Dialog, Popover, Tooltip wrappers — visible borders, shadows`

### Task 5: Restyle form control wrappers (Switch, Number Input, Tags Input, File Upload)

**Files:** `switch.tsx`, `number-input.tsx`, `tags-input.tsx`, `file-upload.tsx`

#### switch.tsx (2 sub-components)

`SwitchControl`:
- `border border-input bg-muted` → `border border-[#3a3a3a] bg-white/5`

`SwitchThumb`:
- `bg-background` → `bg-white`
- `shadow` → `shadow-md shadow-black/20`

#### number-input.tsx (1 sub-component)

`NumberInputInput`:
- `border border-input bg-background` → `border border-[#3a3a3a] bg-transparent`

#### tags-input.tsx (3 sub-components)

`TagsInputControl`:
- `border border-border` → `border border-[#3a3a3a]`
- `focus-within:ring-2 focus-within:ring-ring` → `focus-within:border-primary focus-within:shadow-[0_0_0_1px_var(--primary)]`

`TagsInputItemPreview`:
- `bg-accent text-accent-foreground` → `bg-white/5 text-foreground`

`TagsInputItemInput`:
- `border border-border bg-accent` → `border border-[#3a3a3a] bg-white/5`

#### file-upload.tsx (3 sub-components)

`FileUploadDropzone`:
- `border-border` → `border-[#3a3a3a]`
- `hover:bg-muted/50` → `hover:bg-white/5`
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` → `focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2`

`FileUploadItem`:
- `border border-border` → `border border-[#3a3a3a]`

`FileUploadItemDeleteTrigger`:
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` → `focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2`

**Commit:** `fix(ui): restyle form control wrappers — visible borders, white thumb, primary focus`

### Task 6: Restyle navigation wrappers (Accordion, Collapsible, Pagination, Segment Group, Steps)

**Files:** `accordion.tsx`, `collapsible.tsx`, `pagination.tsx`, `segment-group.tsx`, `steps.tsx`

#### accordion.tsx (2 sub-components)

`AccordionItem`:
- `border-b border-border` → `border-b border-[#3a3a3a]`

`AccordionItemTrigger`:
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` → `focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2`

#### collapsible.tsx (3 sub-components)

`CollapsibleRoot`:
- `border border-border bg-background` → `border border-[#3a3a3a] bg-transparent`

`CollapsibleTrigger`:
- `hover:bg-accent/30` → `hover:bg-white/5`

`CollapsibleContent`:
- `border-t border-border` → `border-t border-[#3a3a3a]`

#### pagination.tsx (3 sub-components)

`PaginationPrevTrigger`:
- `border border-border` → `border border-[#3a3a3a]`
- `hover:bg-accent hover:text-accent-foreground` → `hover:bg-white/5`
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` → `focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2`

`PaginationNextTrigger`: same changes as PrevTrigger.

`PaginationItem`:
- `border border-border` → `border border-[#3a3a3a]`
- `hover:bg-accent hover:text-accent-foreground` → `hover:bg-white/5`
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` → `focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2`
- `data-[selected]:bg-primary data-[selected]:border-primary data-[selected]:text-primary-foreground` — already correct

#### segment-group.tsx (3 sub-components)

`SegmentGroupRoot`:
- `bg-muted` → `bg-white/5`
- `ring-border` → `ring-[#3a3a3a]`

`SegmentGroupIndicator`:
- `bg-background shadow-sm` → `bg-popover shadow-md shadow-black/20`

`SegmentGroupItem`:
- `data-[state=checked]:text-foreground` → `data-[state=checked]:text-primary`
- `data-[focus-visible]:outline-ring` → `data-[focus-visible]:outline-primary`

#### steps.tsx (3 sub-components)

`StepsTrigger`:
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` → `focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2`

`StepsIndicator`:
- `data-[incomplete]:border-border` → `data-[incomplete]:border-[#3a3a3a]`

`StepsSeparator`:
- `bg-border` → `bg-[#3a3a3a]`

**Commit:** `fix(ui): restyle navigation wrappers — visible borders, primary focus, highlights`

### Task 7: Restyle layout wrappers (Splitter, Tree View, Progress, Scroll Area)

**Files:** `splitter.tsx`, `tree-view.tsx`, `progress.tsx`, `scroll-area.tsx` (or its CSS file)

#### splitter.tsx (2 sub-components)

`SplitterResizeTrigger`:
- Both `before:bg-border` → `before:bg-[#3a3a3a]`

`SplitterResizeTriggerIndicator`:
- `border border-border bg-background shadow-sm` → `border border-[#3a3a3a] bg-popover shadow-md shadow-black/20`

#### tree-view.tsx (3 sub-components)

`TreeViewBranchControl`:
- `hover:bg-accent` → `hover:bg-white/5`
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` → `focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2`
- `data-[selected]:bg-accent data-[selected]:text-accent-foreground` → `data-[selected]:bg-white/5 data-[selected]:text-primary`

`TreeViewItem`:
- Same changes as TreeViewBranchControl.

`TreeViewBranchIndentGuide`:
- `bg-border` → `bg-[#3a3a3a]`

#### progress.tsx (2 sub-components)

`ProgressTrack`:
- `bg-accent` → `bg-white/5`

`ProgressCircleTrack`:
- `stroke-accent` → `stroke-white/10`

#### scroll-area.tsx

Check if `scroll-area.css` needs visible scrollbar styling. If the scrollbar is invisible, add:
- Thumb: `background: #3a3a3a` with hover to `#4a4a4a`
- Track: `background: transparent`

**Commit:** `fix(ui): restyle layout wrappers — visible separators, tree selection, progress track`

### Task 8: Build, test, and verify token cleanup

**Step 1:** Verify no low-contrast tokens remain in the 21 wrapper files:
```bash
cd web && grep -rn "border-border\|border-input\|bg-background\|bg-muted\b\|bg-accent\b\|hover:bg-accent\b\|ring-ring\b" src/components/ui/select.tsx src/components/ui/checkbox.tsx src/components/ui/tabs.tsx src/components/ui/combobox.tsx src/components/ui/dialog.tsx src/components/ui/menu.tsx src/components/ui/switch.tsx src/components/ui/accordion.tsx src/components/ui/collapsible.tsx src/components/ui/tooltip.tsx src/components/ui/popover.tsx src/components/ui/pagination.tsx src/components/ui/number-input.tsx src/components/ui/tags-input.tsx src/components/ui/splitter.tsx src/components/ui/steps.tsx src/components/ui/segment-group.tsx src/components/ui/tree-view.tsx src/components/ui/file-upload.tsx src/components/ui/progress.tsx src/components/ui/scroll-area.tsx
```
**Expected output:** Zero matches.

**Step 2:** TypeScript check:
```bash
cd web && npx tsc --noEmit --pretty
```
**Expected output:** Zero errors.

**Step 3:** Vite build:
```bash
cd web && npx vite build --mode development
```
**Expected output:** Build completes.

**Step 4:** Run tests:
```bash
cd web && npx vitest run
```
**Expected output:** All tests pass. If any tests fail due to legitimate Ark DOM structure changes (e.g., assertions checking for native `<select>` or `<input type="checkbox">`), fix the assertions to match Ark component DOM.

**Commit:** `test: fix tests after Ark UI visual correction` (only if test adjustments needed)

### Task 9: Visual verification with Playwright

**Step 1:** Start the dev server:
```bash
cd web && npm run dev
```

**Step 2:** Navigate to each representative surface and capture screenshots:

Required proof surfaces:
1. **AGChain Dataset Detail** — tabs with indicator panel and primary selected text
2. **AGChain Benchmarks** — sidebar tabs preserved (not broken by wrapper changes)
3. **AGChain Tools Page** — Select dropdown with visible border, shadow, hover highlights
4. **AGChain Models Toolbar** — checkboxes with visible checked state (primary fill, 1.25rem)
5. **AGChain Tool Editor Dialog** — Select dropdowns with visible styling inside dialog
6. **AGChain Settings > Organization Members** — Select with visible border

**Step 3:** Confirm each surface shows visible improvement:
- Borders are clearly visible against the dark background
- Hover states produce visible highlight
- Selected/checked states use primary color (#EB5E41)
- Focus treatment is visible
- Floating content has depth (shadow)

**Step 4:** If any surface does NOT show visible improvement, identify the blocking cause:
- **Missing token replacement in a wrapper:** fix it (this is in scope).
- **CSS specificity issue within the wrapper:** fix it (this is in scope).
- **Consumer className override blocking the wrapper defaults:** document the specific consumer and override pattern, but do NOT edit consumer files. If consumer overrides are the primary blocker for visible improvement, stop and escalate — the plan may need a scope revision to include targeted consumer adjustments.

**Step 5:** Save screenshots to `docs/plans/arkui/captures/` with descriptive filenames (e.g., `agchain-dataset-detail-tabs.png`, `agchain-models-toolbar-checkboxes.png`).

**Commit:** No commit — verification only.

## Completion Criteria

The work is complete only when all of the following are true:

**Primary — Visual proof (the actual quality bar):**

1. Visual proof screenshots (saved to `docs/plans/arkui/captures/`) show obvious visible improvement on AGChain surfaces.
2. Selects look like intentional floating controls, not browser-native chrome.
3. Checkboxes look like intentional UI controls (1.25rem, primary fill).
4. Tabs have a visible selected-state treatment (filled primary-tinted panel).
5. Focus, hover, and selected states are easy to perceive on the `#0e0e0e` background.

**Secondary — Hygiene checks (necessary but not sufficient):**

6. Both deleted test files are restored and passing.
7. All 21 wrapper files have been restyled — no `border-border`, `bg-background`, `bg-accent` (without `/`), `bg-muted`, `ring-ring` tokens remain in any of the 21 files (verified by grep). Note: passing grep without visual proof does NOT satisfy completion.
8. The locked token replacement rules have been applied across all 51 sub-components, with any component-specific deviations documented.
9. TypeScript compiles, Vite builds, and tests pass.
10. The inventory counts in this plan match the actual set of modified files.
