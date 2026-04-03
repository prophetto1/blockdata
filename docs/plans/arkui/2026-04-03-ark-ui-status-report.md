# Ark UI Adoption Status Report

**Date:** 2026-04-03
**Context:** Three CC sessions attempted Ark UI adoption across the AGChain and Blockdata surfaces. The result is zero visible UI improvement despite 60+ component swaps. This report documents the current state, identifies the root causes, and presents options for corrective action.

---

## Root Cause

The wrapper files in `web/src/components/ui/` were styled using theme tokens that are nearly invisible on our dark background:

| Token | Value | Visual result on `#0e0e0e` background |
|-------|-------|---------------------------------------|
| `border-border` | `#2a2a2a` | Barely visible — 12% luminance delta |
| `border-input` | `#2a2a2a` | Same as above |
| `bg-background` | `#0e0e0e` | Identical to page background — invisible |
| `bg-accent` | `#1a1a1a` | 5% luminance delta — invisible |
| `bg-muted` | `#1a1a1a` | Same as accent — invisible |
| `bg-accent/80` | `#1a1a1a` at 80% | Still invisible |

Meanwhile, the Ark UI standard examples (fetched via the `ark-ui` MCP tool) use visually distinct styling:

| Ark example pattern | What it looks like | Our equivalent |
|---|---|---|
| `border: 1px solid var(--demo-border-emphasized)` | Visible border with real contrast | `border-[#3a3a3a]` (~20% higher than our `#2a2a2a`) |
| `background: var(--demo-coral-solid)` on checked states | Bold primary fill (#EB5E41) | `bg-primary` |
| `background: var(--demo-coral-subtle)` on indicator/highlight | Tinted primary at ~10% | `bg-primary/10` |
| `color: var(--demo-coral-fg)` on selected text | Primary-colored text | `text-primary` |
| `box-shadow: var(--demo-shadow-md)` on dropdowns | Visible depth/floating | `shadow-lg shadow-black/30` |
| `background: var(--demo-neutral-subtle)` on hover | White at ~5% opacity | `bg-white/5` |
| `outline: 2px solid var(--demo-coral-focus-ring)` | Primary-colored focus ring | `outline-2 outline-primary` |
| Checkbox `width/height: 1.25rem` | Larger, more visible control | `h-5 w-5` (currently `h-4 w-4`) |
| Tabs indicator `background: coral-subtle; height: 2rem` | Filled tinted panel behind selected tab | `bg-primary/10 h-8 rounded-md` |

None of these patterns were adopted in any of the three sessions. The wrappers copied the existing Tailwind token names without checking whether those tokens produced visible contrast.

---

## Two Usage Patterns

### Pattern A: Direct Ark UI imports (no wrapper)

**~25 files** import Ark UI components directly from `@ark-ui/react/*` and apply their own inline Tailwind classes. These files bypass the wrapper layer entirely. Restyling the wrappers would have zero effect on them.

### Pattern B: Via `ui/*.tsx` wrappers

**22 wrapper files** exist in `web/src/components/ui/`. Consumer files import from these wrappers. Restyling the wrappers would propagate to all Pattern B consumers automatically.

### The conflict

Some files use both patterns. `AgchainModelsToolbar.tsx` imports `Select` directly from `@ark-ui/react/select` AND imports `CheckboxRoot` from the wrapper. This creates inconsistency — the Select is styled inline, the Checkbox uses the wrapper defaults.

---

## Complete Wrapper Inventory (Pattern B)

22 wrapper files in `web/src/components/ui/`:

| # | Component | File | Needs Restyling? | Key Issues |
|---|-----------|------|:---:|---|
| 1 | Select | `select.tsx` | **Yes** | `border-border` invisible, `bg-accent` hover invisible, no primary focus |
| 2 | Checkbox | `checkbox.tsx` | **Yes** | h-4 w-4 too small, `border-input bg-background` invisible |
| 3 | Tabs | `tabs.tsx` | **Yes** | Indicator is invisible 2px line, no primary selected text |
| 4 | Combobox | `combobox.tsx` | **Yes** | Same issues as Select |
| 5 | Switch | `switch.tsx` | **Yes** | `bg-muted` track invisible on dark, `bg-background` thumb invisible |
| 6 | Accordion | `accordion.tsx` | **Yes** | `border-border` separator invisible |
| 7 | Collapsible | `collapsible.tsx` | **Yes** | `border-border bg-background` invisible, `hover:bg-accent/30` invisible |
| 8 | Menu | `menu.tsx` | **Yes** | `border-border`, `hover:bg-accent` invisible highlight |
| 9 | Dialog | `dialog.tsx` | **Partial** | Has shadow-lg and animations, but `border-border` low-contrast |
| 10 | Tooltip | `tooltip.tsx` | **Yes** | `border-border` invisible |
| 11 | Popover | `popover.tsx` | **Yes** | `border-border` invisible |
| 12 | Pagination | `pagination.tsx` | **Yes** | `border-border`, `hover:bg-accent` invisible |
| 13 | Number Input | `number-input.tsx` | **Yes** | `border-input bg-background` invisible |
| 14 | Tags Input | `tags-input.tsx` | **Yes** | `border-border`, `bg-accent` tags invisible |
| 15 | Splitter | `splitter.tsx` | **Yes** | `border-border bg-background` thumb invisible |
| 16 | Steps | `steps.tsx` | **Yes** | `border-border` incomplete indicator invisible |
| 17 | Segment Group | `segment-group.tsx` | **Yes** | `bg-background shadow-sm` indicator invisible |
| 18 | Tree View | `tree-view.tsx` | **Yes** | `hover:bg-accent`, `data-[selected]:bg-accent` invisible |
| 19 | Scroll Area | `scroll-area.tsx` | **Yes** | No visible scrollbar styling |
| 20 | File Upload | `file-upload.tsx` | **Yes** | `border-border` dashed border invisible |
| 21 | Field | `field.tsx` | No | Structural wrapper, no visual parts |
| 22 | Progress | `progress.tsx` | **Yes** | `bg-accent` track invisible |

**21 of 22 wrappers need restyling.**

---

## Direct-Import Files (Pattern A)

~25 files import Ark UI directly. Grouped by area:

### Blockdata Core Pages

| File | Ark Components Used | Wrapper Exists? | Styling Quality |
|------|-------------------|:---:|---|
| `FlowsList.tsx` | Checkbox, Select | Yes for both | Decent inline styling with primary accents |
| `Schemas.tsx` | Select, Splitter | Yes for both | Custom inline styling |
| `SchemaLayout.tsx` | RadioGroup, Switch | **No** RadioGroup wrapper; Yes Switch | Inline with primary checked states |
| `HowItWorks.tsx` | Steps, Tabs, Clipboard, Highlight, JsonTreeView | Partial | Marketing page, own styling |
| `Landing.tsx` | Tabs, Highlight, JsonTreeView | Partial | Marketing page, own styling |
| `UseCases.tsx` | Tabs, Highlight, JsonTreeView | Partial | Marketing page, own styling |
| `ModelRegistrationPreview.tsx` | Switch | Yes | Not assessed |

### Shell & Layout

| File | Ark Components Used | Wrapper Exists? | Styling Quality |
|------|-------------------|:---:|---|
| `TopCommandBar.tsx` | Combobox | Yes | CSS-variable-based custom styling |
| `LeftRailShadcn.tsx` | Avatar, ToggleGroup | **No** wrappers | `bg-muted/50, border-border` — low contrast |
| `ShellWorkspaceSelector.tsx` | SegmentGroup | Yes | CSS module styling |
| `AppLayout.tsx` | Drawer | **No** wrapper | CSS variable styling |
| `PublicNavModern.tsx` | Swap | **No** wrapper | Not assessed |

### Documents & Upload

| File | Ark Components Used | Wrapper Exists? | Styling Quality |
|------|-------------------|:---:|---|
| `UploadTabPanel.tsx` | FileUpload | Yes | `border-border, hover:bg-muted/50` — low contrast |
| `UploadSourceCards.tsx` | RadioGroup | **No** wrapper | `primary/5` — invisible |
| `ProjectParseUploader.tsx` | FileUpload | Yes | `border-border, hover:bg-muted/50` — low contrast |
| `PreviewTabPanel.tsx` | JsonTreeView | **No** wrapper | Not assessed |

### Settings & Config

| File | Ark Components Used | Wrapper Exists? |
|------|-------------------|:---:|
| `setting-card-shared.tsx` | Field, NumberInput, PasswordInput, Select, Switch | Partial |
| `SettingsProviderForm.tsx` | Field, NumberInput, PasswordInput, Select, Slider | Partial |
| `SettingsAccount.tsx` | Field, PasswordInput | Partial |
| `SettingsAdmin.tsx` | Field | Yes |
| `DoclingConfigPanel.tsx` | Select | Yes |
| `ServiceDetailPanel.tsx` | Switch | Yes |
| `ServiceDetailRailView.tsx` | Clipboard, JsonTreeView | **No** wrappers |

### AGChain

| File | Ark Components Used | Wrapper Exists? |
|------|-------------------|:---:|
| `AgchainModelsToolbar.tsx` | Select (direct) + Checkbox (wrapper) | **Mixed** — both patterns in one file |

### Other

| File | Ark Components Used | Wrapper Exists? |
|------|-------------------|:---:|
| `ParseEasyPanel.tsx` | Field, NumberInput, RadioGroup | Partial |
| `ProviderCredentialsModule.tsx` | NumberInput, Slider | Partial |
| `IntegrationMap.tsx` | HoverCard | **No** wrapper |
| `function-reference.tsx` | Clipboard, JsonTreeView | **No** wrappers |
| `JsonViewer.tsx` | Clipboard, JsonTreeView | **No** wrappers |
| `Workbench.tsx` | Splitter | Yes | CSS modules |
| `FlowWorkbench.tsx` | Clipboard | **No** wrapper |
| `DesignLayoutCaptures.tsx` | Checkbox | Yes |
| `SuperuserAuditHistory.tsx` | Field, Select (via wrapper) | Yes |

---

## Ark UI Components With No Wrapper

These components are used in the codebase but have no `ui/*.tsx` wrapper at all:

| Component | Used In | Usage Count |
|-----------|---------|:-----------:|
| RadioGroup | SchemaLayout, UploadSourceCards, ParseEasyPanel | 3 |
| Clipboard | JsonViewer, function-reference, FlowWorkbench, HowItWorks, Landing.old | 5 |
| JsonTreeView | PreviewTabPanel, JsonViewer, function-reference, ServiceDetailRailView, HowItWorks, Landing, UseCases, Landing.old | 8 |
| PasswordInput | LoginSplit, RegisterSplit, SettingsAccount, setting-card-shared, SettingsProviderForm | 5 |
| Slider | ProviderCredentialsModule, SettingsProviderForm | 2 |
| HoverCard | IntegrationMap | 1 |
| Drawer | AppLayout | 1 |
| Avatar | LeftRailShadcn | 1 |
| ToggleGroup | LeftRailShadcn | 1 |
| Swap | PublicNavModern | 1 |
| Highlight | HowItWorks, Landing, UseCases, Landing.old | 4 |
| Marquee | Landing.old | 1 |

---

## What The Earlier Sessions Actually Produced

### Session 1–2 (prior to today): Ark UI component adoption

- Created 22 wrapper files in `web/src/components/ui/`
- Swapped native HTML elements for Ark UI components on AGChain pages
- All wrappers styled to **match the existing look** — `border-border`, `bg-background`, `bg-accent`
- Result: zero visible change

### Session 3 (today): "Visual Correction Plan"

- Restyled `tabs.tsx` — added defaults + TabsIndicator (still invisible: `bg-accent/80` = `#1a1a1a`)
- Created `checkbox.tsx` wrapper — `border-input bg-background` = invisible
- Replaced 8 native `<select>` with Ark Select (using the invisible wrapper)
- Replaced 7 native `<input type="checkbox">` with Ark Checkbox (using the invisible wrapper)
- Deleted 2 test files that need to be restored: `AgchainWorkspaceSync.test.tsx`, `AgchainToolsPage.test.tsx`
- Modified 4 other test files to handle Ark UI DOM changes (these changes are valid)
- Net visual improvement: **near zero**

### Cleanup required from today's session

- Restore `web/src/components/agchain/AgchainWorkspaceSync.test.tsx` (deleted incorrectly)
- Restore `web/src/pages/agchain/AgchainToolsPage.test.tsx` (deleted incorrectly)

---

## Scope Summary

| Category | Count |
|----------|------:|
| Wrapper files needing restyling | 21 |
| Consumer files that import from wrappers (benefit from Option A) | **84** |
| Direct-import files bypassing wrappers (Pattern A) | ~25 |
| Files using mixed patterns (A+B) | 1+ |
| Ark UI components with no wrapper | 12 |
| Total files touching Ark UI | ~60 |

**Key leverage insight:** Restyling 21 wrapper files automatically fixes the visual output of 84 consumer files. That is a 1:4 leverage ratio.

---

## Options

### Option A: Restyle the 21 wrappers only

**Scope:** Modify the Tailwind classes in the 21 `ui/*.tsx` wrapper files to match Ark UI standard examples. Use `border-[#3a3a3a]` for visible borders, `bg-primary/10` for highlights, `bg-primary` for checked/selected states, `shadow-lg shadow-black/30` for popover depth, `outline-2 outline-primary` for focus.

**What this fixes:**
- Every consumer that imports from `ui/*.tsx` wrappers gets the visual improvement automatically
- The AGChain pages touched in today's session (which now use wrappers) would immediately look better
- Any future code that uses the wrappers would inherit the correct styles

**What this does NOT fix:**
- The ~25 files using Pattern A (direct imports) still have their own inline styling
- Components with no wrapper (RadioGroup, Clipboard, JsonTreeView, PasswordInput, Slider, etc.) are untouched
- The mixed-pattern file (AgchainModelsToolbar) would have the Checkbox look right but the Select still use direct inline styles

**Effort:** ~21 files, CSS-only changes, no structural work. Could be done in one session.

**Risk:** Low — CSS-only changes to existing files. Consumer overrides via twMerge still work. No API changes.

### Option B: Restyle wrappers + migrate all direct-import files to use wrappers + create missing wrappers

**Scope:**
1. Restyle the 21 existing wrappers (same as Option A)
2. Create wrappers for the 12 unwrapped components (RadioGroup, Clipboard, JsonTreeView, PasswordInput, Slider, HoverCard, Drawer, Avatar, ToggleGroup, Swap, Highlight, Marquee)
3. Migrate the ~25 Pattern A files to import from the wrappers instead of directly from `@ark-ui/react`
4. Resolve the mixed-pattern conflict in AgchainModelsToolbar

**What this fixes:**
- Everything Option A fixes, plus
- Consistent styling across the entire codebase — one source of truth for each component's look
- No more duplicate styling effort — change the wrapper, change everywhere
- Eliminates the direct-import pattern entirely

**What this does NOT fix:**
- Marketing pages (Landing, HowItWorks, UseCases) may have intentionally custom styling that shouldn't be forced into wrappers

**Effort:** ~58 files (21 restyle + 12 new wrappers + ~25 migrations). Multi-session effort.

**Risk:** Medium — migrating direct-import files may break inline styling assumptions. Marketing pages may need exceptions. Test updates likely needed.

---

### Option C: Adjust the theme tokens globally

**Scope:** Change the CSS variable values in `web/src/tailwind.css` to increase contrast between border, accent, muted, and background tokens. For example: `--border: #3a3a3a` instead of `#2a2a2a`, `--accent: #262626` instead of `#1a1a1a`, `--muted: #262626`.

**What this fixes:**
- Every component in the entire app — wrappers, direct imports, non-Ark components — gets higher contrast automatically
- No file-by-file changes needed
- Fixes the root cause (low-contrast tokens) rather than working around it

**What this does NOT fix:**
- Components that need Ark-example-level styling (primary accents on checked states, shadow depth on dropdowns, indicator panels on tabs) — these require wrapper code changes regardless of token values
- The structural issues (no wrappers for 12 components, mixed patterns)

**Effort:** 1 file change. But requires visual regression testing across the entire app — every page, every component.

**Risk:** High — changing global tokens affects everything. Non-Ark components (buttons, cards, headers, tables, navigation) would all shift. Could improve some areas while degrading others. Hard to predict without a full visual audit.

### Notes on scope exclusions

**Utility/data-display components that may not need visual wrappers:**
Highlight, Marquee, JsonTreeView, and Clipboard are data-display or utility components, not form controls. They may not benefit from a styled wrapper — their visual treatment is content-dependent. Option B should scope wrapper creation to form/interactive components only (RadioGroup, PasswordInput, Slider, Drawer, HoverCard) and leave utility components as direct imports.

**Marketing pages:**
Landing.tsx, HowItWorks.tsx, UseCases.tsx, and Landing.old.tsx have intentionally custom styling for marketing purposes. These should be excluded from any wrapper migration.

---

## Recommendation

Option A first, then Option B incrementally. Option C is tempting but too risky without a full visual audit.

The wrappers are the leverage point — fixing 21 files propagates to all wrapper consumers. The direct-import files can be migrated incrementally afterward, wrapper by wrapper, without blocking the immediate visual improvement.