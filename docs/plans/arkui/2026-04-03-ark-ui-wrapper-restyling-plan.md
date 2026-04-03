# Ark UI Wrapper Restyling Plan

**Goal:** Restyle the existing Ark UI wrapper components (`select.tsx`, `checkbox.tsx`, `tabs.tsx`) so they match the visual quality of Ark UI's own standard examples — visible borders, primary-color accents, animated indicators, shadows on dropdowns, properly sized controls — instead of the current invisible-on-dark-background styling.

**Architecture:** This is a CSS-only change to 3 existing wrapper files. No structural changes, no new components, no consumer file changes. The wrappers already have the correct Ark UI component structure. The problem is that they use low-contrast theme tokens (`border-border`, `bg-background`, `bg-accent`) that are nearly invisible on our `#0e0e0e` dark background. The fix is to restyle them using the Ark UI standard example CSS as the reference, mapped to our existing theme tokens — primarily using `primary` (`#EB5E41`) for accents and checked/selected states, `primary/10` for subtle highlights, and higher-contrast borders.

**Reference:** Ark UI standard examples fetched via the `ark-ui` MCP tool — `select/basic`, `checkbox/basic`, `tabs/indicator`. The CSS module files from those examples define the visual baseline.

**Token mapping from Ark examples to our theme:**

| Ark demo token | Our equivalent | Tailwind class |
|---|---|---|
| `--demo-coral-solid` | `--primary` (#EB5E41) | `bg-primary`, `border-primary` |
| `--demo-coral-contrast` | `--primary-foreground` (#ffffff) | `text-primary-foreground` |
| `--demo-coral-fg` | `--primary` (#EB5E41) | `text-primary` |
| `--demo-coral-subtle` | primary at 10% | `bg-primary/10` |
| `--demo-coral-focus-ring` | `--ring` (#EB5E41) | `ring-ring`, `outline-ring` |
| `--demo-border-emphasized` | stronger border than `--border` | `border-[#3a3a3a]` |
| `--demo-neutral-subtle` | white at ~5% | `bg-white/5` |
| `--demo-bg-popover` | `--popover` (#141414) | `bg-popover` |
| `--demo-shadow-md` | shadow | `shadow-lg shadow-black/30` |

**Tech Stack:** React, TypeScript, Tailwind CSS, `@ark-ui/react`.

**Status:** Draft
**Author:** jon
**Date:** 2026-04-03

## Platform API

No platform API changes. This is a CSS restyling of 3 frontend wrapper files.

## Observability

No observability changes. No runtime behavior changes — purely visual.

## Database Migrations

No database migrations. Purely presentational.

## Edge Functions

No edge functions created or modified.

## Frontend Surface Area

**New pages:** 0
**New components:** 0
**New hooks:** 0

**Modified components:** 3

| Component | File | What changes |
|-----------|------|-------------|
| Select wrapper | `web/src/components/ui/select.tsx` | Restyle trigger, content, items to match Ark standard example |
| Checkbox wrapper | `web/src/components/ui/checkbox.tsx` | Restyle control size, colors, focus to match Ark standard example |
| Tabs wrapper | `web/src/components/ui/tabs.tsx` | Restyle indicator from invisible 2px line to visible primary-tinted panel, update trigger selected state |

## Pre-Implementation Contract

No improvisation. The styles below are derived directly from Ark UI's standard example CSS, mapped to our theme tokens. The implementer must use these exact classes, not invent new ones.

### Locked Visual Requirements

1. **Select trigger** must have a visible border (`border-[#3a3a3a]`), and on focus must show a `primary`-colored border + box-shadow ring — not the current invisible `border-border` that disappears into the background.
2. **Select dropdown content** must have a visible shadow (`shadow-lg shadow-black/30`), a `border-[#3a3a3a]` border, open/close scale+fade animation, and a custom thin scrollbar.
3. **Select items** on hover must show `bg-white/5` highlight. Checked items must show `text-primary` color and `font-medium`. The check indicator must be `text-primary`.
4. **Checkbox control** must be `h-5 w-5` (1.25rem, matching the Ark example — not the current `h-4 w-4`). Unchecked state: `border-[#3a3a3a] bg-transparent`. Checked state: `bg-primary border-primary text-primary-foreground`. Focus: `outline-2 outline-primary outline-offset-2` (not ring).
5. **Tabs indicator** must be a `bg-primary/10` filled panel matching the trigger height (`h-8`), with `rounded-md` corners and a 200ms slide transition — not a 2px invisible line. The selected trigger text must turn `text-primary`.
6. **Tabs list** must have no bottom border (the Ark example uses no border on the list — the indicator IS the visual feedback). `isolation: isolate` on the list, `gap-1`.

### Locked Acceptance Contract

The implementation is complete only when:

1. On the Tools page, the "All source kinds" select trigger has a clearly visible border that contrasts against the dark background.
2. Clicking the select opens a dropdown with a visible shadow and scale-fade animation.
3. Hovering over dropdown items shows a highlight that is visibly different from the non-hovered state.
4. On the Models page, the capability checkboxes are visibly larger (1.25rem) than the old native checkboxes, with a `#EB5E41` orange-red fill when checked.
5. On the Dataset Detail page, the tab indicator is a filled, tinted panel behind the selected tab text — not a thin line.
6. The selected tab text is `#EB5E41` (primary color), not the same white as unselected tabs.
7. Build passes and existing tests pass.

### Locked Inventory Counts

- New files: **0**
- Modified files: **3** (`select.tsx`, `checkbox.tsx`, `tabs.tsx`)

### Locked File Inventory

#### Modified files

| # | File | What changes |
|---|------|-------------|
| 1 | `web/src/components/ui/select.tsx` | Restyle SelectTrigger, SelectContent, SelectItem, SelectItemIndicator |
| 2 | `web/src/components/ui/checkbox.tsx` | Restyle CheckboxControl size and colors, CheckboxIndicator |
| 3 | `web/src/components/ui/tabs.tsx` | Restyle TabsIndicator, TabsTrigger selected state, TabsList |

## Explicit Risks

1. **Consumer pages that pass className overrides may conflict.** The Benchmarks page passes extensive TabsTrigger overrides. Since we use twMerge, the consumer's classes win — so the sidebar tabs will keep their filled-background pattern. No consumer file changes needed.
2. **h-5 w-5 checkbox may shift layouts slightly.** The checkbox grows from 1rem to 1.25rem. In flex layouts with `items-center` this should be fine. In tight grid cells it could shift spacing.

---

## Tasks

### Task 1: Restyle Select wrapper

**File(s):** `web/src/components/ui/select.tsx`

**Step 1:** Restyle `SelectTrigger` — replace the invisible border with a visible one, add transition and focus ring matching the Ark example:
```tsx
function SelectTrigger({ className, ...props }: React.ComponentProps<typeof ArkSelect.Trigger>) {
  return (
    <ArkSelect.Trigger
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-md border border-[#3a3a3a] bg-transparent px-3 py-2 text-sm',
        'text-foreground transition-[border-color,box-shadow] duration-150',
        'focus-visible:border-primary focus-visible:outline-none focus-visible:shadow-[0_0_0_1px_var(--primary)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[placeholder-shown]:text-muted-foreground',
        className,
      )}
      data-slot="select-trigger"
      {...props}
    />
  );
}
```

**Step 2:** Restyle `SelectContent` — add visible shadow, stronger border, custom scrollbar:
```tsx
function SelectContent({ className, ...props }: React.ComponentProps<typeof ArkSelect.Content>) {
  return (
    <Portal>
      <ArkSelect.Positioner>
        <ArkSelect.Content
          className={cn(
            'z-50 min-w-[var(--reference-width)] overflow-y-auto rounded-md border border-[#3a3a3a] bg-popover p-1',
            'shadow-lg shadow-black/30',
            'max-h-[min(var(--available-height,300px),300px)]',
            'scrollbar-thin scrollbar-thumb-[#3a3a3a] scrollbar-track-popover',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            className,
          )}
          data-slot="select-content"
          {...props}
        />
      </ArkSelect.Positioner>
    </Portal>
  );
}
```

**Step 3:** Restyle `SelectItem` — use `bg-white/5` for hover highlight, `text-primary` for checked:
```tsx
function SelectItem({ className, ...props }: React.ComponentProps<typeof ArkSelect.Item>) {
  return (
    <ArkSelect.Item
      className={cn(
        'flex cursor-default select-none items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
        'data-[highlighted]:bg-white/5',
        'data-[state=checked]:text-primary data-[state=checked]:font-medium',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      data-slot="select-item"
      {...props}
    />
  );
}
```

**Step 4:** Restyle `SelectItemIndicator` — keep `text-primary` (already correct):
No change needed — already `text-primary`.

**Test command:** `cd web && npx tsc --noEmit --pretty 2>&1 | head -5`
**Expected output:** No type errors.

**Commit:** `fix(ui): restyle Select wrapper to match Ark UI standard example`

### Task 2: Restyle Checkbox wrapper

**File(s):** `web/src/components/ui/checkbox.tsx`

**Step 1:** Restyle `CheckboxControl` — increase to 1.25rem (h-5 w-5), use transparent bg with visible border, primary fill on checked, outline-based focus:
```tsx
function CheckboxControl({
  className,
  ...props
}: React.ComponentProps<typeof ArkCheckbox.Control>) {
  return (
    <ArkCheckbox.Control
      className={cn(
        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[#3a3a3a] bg-transparent transition-colors',
        'data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground',
        'data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:text-primary-foreground',
        'data-[focus-visible]:outline-2 data-[focus-visible]:outline-primary data-[focus-visible]:outline-offset-2',
        'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
```

**Step 2:** Update `CheckboxIndicator` SVG to match the larger control size (use 0.875rem = 14px icon inside 1.25rem control, matching the Ark example):
```tsx
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
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7l3 3 5-5.5" />
        </svg>
      )}
    </ArkCheckbox.Indicator>
  );
}
```

**Test command:** `cd web && npx tsc --noEmit --pretty 2>&1 | head -5`
**Expected output:** No type errors.

**Commit:** `fix(ui): restyle Checkbox wrapper to match Ark UI standard example`

### Task 3: Restyle Tabs wrapper

**File(s):** `web/src/components/ui/tabs.tsx`

**Step 1:** Restyle `TabsList` — remove the bottom border, add `isolate` for z-index stacking, use `gap-1`:
```tsx
export function TabsList({ className, ...props }: ComponentProps<typeof ArkTabs.List>) {
  return (
    <ArkTabs.List
      data-slot="tabs-list"
      className={cn(
        'relative inline-flex items-center isolate gap-1',
        'data-[orientation=horizontal]:flex-row',
        'data-[orientation=vertical]:flex-col',
        className,
      )}
      {...props}
    />
  );
}
```

**Step 2:** Restyle `TabsTrigger` — no border, `bg-transparent`, selected text turns `text-primary`, rounded for the indicator backdrop:
```tsx
export function TabsTrigger({ className, ...props }: ComponentProps<typeof ArkTabs.Trigger>) {
  return (
    <ArkTabs.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md px-3 h-8 text-sm font-medium',
        'bg-transparent border-none text-muted-foreground whitespace-nowrap select-none',
        'data-[selected]:text-primary',
        'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
        'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed',
        className,
      )}
      {...props}
    />
  );
}
```

**Step 3:** Restyle `TabsIndicator` — from an invisible 2px line to a visible primary-tinted panel that fills behind the selected trigger:
```tsx
export function TabsIndicator({ className, ...props }: ComponentProps<typeof ArkTabs.Indicator>) {
  return (
    <ArkTabs.Indicator
      data-slot="tabs-indicator"
      className={cn(
        'absolute z-[-1] bg-primary/10 rounded-md',
        'transition-[width,height,left,top] duration-200 ease-out',
        'data-[orientation=horizontal]:h-8',
        'data-[orientation=vertical]:w-[calc(100%-0.5rem)]',
        className,
      )}
      {...props}
    />
  );
}
```

**Test command:** `cd web && npx tsc --noEmit --pretty 2>&1 | head -5`
**Expected output:** No type errors.

**Commit:** `fix(ui): restyle Tabs wrapper to match Ark UI standard example`

### Task 4: Build and verify

**File(s):** All 3 modified files.

**Step 1:** `cd web && npx tsc --noEmit --pretty`
**Expected output:** Zero errors.

**Step 2:** `cd web && npx vite build --mode development`
**Expected output:** Build completes.

**Step 3:** `cd web && npx vitest run src/components/agchain/ src/pages/agchain/`
**Expected output:** All tests pass.

**Step 4:** Start dev server and visually verify:
- Tools page: "All source kinds" dropdown has visible border, opens with shadow and animation, hover shows highlight, selected item is orange-red text
- Models page: checkboxes are larger (1.25rem), checked state shows orange-red fill
- Dataset Detail page: tab indicator is a tinted panel behind the selected tab, selected tab text is orange-red
- Benchmarks page: sidebar tabs are unaffected (consumer overrides win via twMerge)

**Commit:** Only if test adjustments needed.

## Completion Criteria

1. Select trigger border is visibly distinct from the page background.
2. Select dropdown opens with shadow and scale-fade animation.
3. Select item hover shows a visible highlight.
4. Checked select items and item indicators use the primary color (#EB5E41).
5. Checkbox control is 1.25rem × 1.25rem with a transparent unchecked background and visible border.
6. Checked checkbox fills with primary color (#EB5E41) and shows a white check icon.
7. Tab indicator is a primary-tinted filled panel (not a 2px line), matching the trigger height.
8. Selected tab text is primary color (#EB5E41).
9. Build passes and tests pass.