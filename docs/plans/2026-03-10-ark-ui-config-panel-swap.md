# Ark UI Config Panel Component Swap

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace hand-rolled form controls in the Pandoc and Docling config panels with existing and new Ark UI component wrappers.

**Architecture:** Both panels share identical local components (`Toggle`, `Select`, `Section`, `NumberInput`, `TextInput`, `FieldRow`, `TriToggle`). We'll create shared Ark UI wrappers in `src/components/ui/`, then swap them into both panels — Pandoc first, then Docling.

**Tech Stack:** `@ark-ui/react@^5.32.0` (already installed), Tailwind CSS, existing `cn()` utility.

---

## Existing wrappers (no work needed)

| Component | File | Notes |
|-----------|------|-------|
| `SwitchRoot/Control/Thumb/HiddenInput` | `web/src/components/ui/switch.tsx` | Replaces `Toggle` |
| `SegmentGroupRoot/Indicator/Item/ItemText/ItemHiddenInput` | `web/src/components/ui/segment-group.tsx` | Replaces `TriToggle` |

## Wrapper style convention (match existing codebase)

All wrappers in `src/components/ui/` follow this pattern:
- Import Ark component namespaced: `import { X as ArkX } from '@ark-ui/react/x'`
- Create thin wrapper functions: `function XRoot({ className, ...props }: ArkX.RootProps)`
- Apply default Tailwind classes via `cn()`
- Export named parts: `export { XRoot, XTrigger, ... }`

---

## Task 1: Create Collapsible wrapper

Replaces the hand-rolled `Section` component (collapsible card with title + chevron).

**Create:** `web/src/components/ui/collapsible.tsx`

**Step 1:** Create the file with this exact content:

```tsx
import { Collapsible as ArkCollapsible } from '@ark-ui/react/collapsible';
import { cn } from '@/lib/utils';

function CollapsibleRoot({ className, ...props }: React.ComponentProps<typeof ArkCollapsible.Root>) {
  return (
    <ArkCollapsible.Root
      className={cn('rounded-md border border-border bg-background', className)}
      {...props}
    />
  );
}

function CollapsibleTrigger({ className, ...props }: React.ComponentProps<typeof ArkCollapsible.Trigger>) {
  return (
    <ArkCollapsible.Trigger
      className={cn(
        'flex w-full items-center justify-between px-3 py-2 text-sm font-bold text-foreground hover:bg-accent/30',
        className,
      )}
      {...props}
    />
  );
}

function CollapsibleIndicator({ className, ...props }: React.ComponentProps<typeof ArkCollapsible.Indicator>) {
  return (
    <ArkCollapsible.Indicator
      className={cn(
        'text-xs text-muted-foreground transition-transform',
        'data-[state=open]:rotate-90',
        className,
      )}
      {...props}
    />
  );
}

function CollapsibleContent({ className, ...props }: React.ComponentProps<typeof ArkCollapsible.Content>) {
  return (
    <ArkCollapsible.Content
      className={cn('border-t border-border px-3 py-2 space-y-1', className)}
      {...props}
    />
  );
}

export { CollapsibleRoot, CollapsibleTrigger, CollapsibleIndicator, CollapsibleContent };
```

**Step 2:** Verify TypeScript compiles: `cd web && npx tsc --noEmit src/components/ui/collapsible.tsx` (or just check no red squiggles in IDE).

**Step 3:** Commit: `feat: add Ark UI Collapsible wrapper`

---

## Task 2: Create NumberInput wrapper

Replaces the hand-rolled `<input type="number">`.

**Create:** `web/src/components/ui/number-input.tsx`

**Step 1:** Create the file with this exact content:

```tsx
import { NumberInput as ArkNumberInput } from '@ark-ui/react/number-input';
import { cn } from '@/lib/utils';

function NumberInputRoot({ className, ...props }: React.ComponentProps<typeof ArkNumberInput.Root>) {
  return (
    <ArkNumberInput.Root
      className={cn('inline-flex items-center', className)}
      {...props}
    />
  );
}

function NumberInputInput({ className, ...props }: React.ComponentProps<typeof ArkNumberInput.Input>) {
  return (
    <ArkNumberInput.Input
      className={cn(
        'h-8 w-24 rounded-md border border-input bg-background px-2 text-xs text-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { NumberInputRoot, NumberInputInput };
```

> Stepper triggers (increment/decrement buttons) omitted — the current UI is a plain number box. Add stepper buttons later if the design evolves.

**Step 2:** Verify TypeScript compiles.

**Step 3:** Commit: `feat: add Ark UI NumberInput wrapper`

---

## Task 3: Create Field wrapper

Replaces the hand-rolled `FieldRow` (label + description + control layout).

**Create:** `web/src/components/ui/field.tsx`

**Step 1:** Create the file with this exact content:

```tsx
import { Field as ArkField } from '@ark-ui/react/field';
import { cn } from '@/lib/utils';

function FieldRoot({ className, ...props }: React.ComponentProps<typeof ArkField.Root>) {
  return (
    <ArkField.Root
      className={cn('flex min-h-9 items-start justify-between gap-4 py-1.5', className)}
      {...props}
    />
  );
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof ArkField.Label>) {
  return (
    <ArkField.Label
      className={cn('text-sm font-medium text-foreground', className)}
      {...props}
    />
  );
}

function FieldHelperText({ className, ...props }: React.ComponentProps<typeof ArkField.HelperText>) {
  return (
    <ArkField.HelperText
      className={cn('text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

function FieldErrorText({ className, ...props }: React.ComponentProps<typeof ArkField.ErrorText>) {
  return (
    <ArkField.ErrorText
      className={cn('text-xs text-destructive', className)}
      {...props}
    />
  );
}

export { FieldRoot, FieldLabel, FieldHelperText, FieldErrorText };
```

**Step 2:** Verify TypeScript compiles.

**Step 3:** Commit: `feat: add Ark UI Field wrapper`

---

## Task 4: Swap components in PandocConfigPanel

**Modify:** `web/src/pages/settings/PandocConfigPanel.tsx`

This is the biggest task. The panel has ~30 `<FieldRow>` usages, ~20 `<Toggle>` usages, ~15 `<Section>` usages, ~10 `<NumberInput>` usages, and ~12 `<TriToggle>` usages.

### What to keep as-is

- `Select` function — keep the local native `<select>` wrapper (Ark Select is too heavy for this use case)
- `TextInput` function — keep the local `<input type="text">` wrapper (no Ark equivalent worth the overhead)
- `getIn` / `setIn` helpers — unchanged
- `ConfigEditor` component — structure unchanged, just swap the primitives inside it
- `PandocConfigPanel` / `Component` — unchanged

### Step-by-step

**Step 1:** Add new imports at top of file. Replace the `@tabler/icons-react` import to remove icons that are no longer needed (the chevron in Section is replaced by CollapsibleIndicator):

```tsx
// ADD these imports after the existing ones:
import { SwitchRoot, SwitchControl, SwitchThumb, SwitchHiddenInput } from '@/components/ui/switch';
import { SegmentGroupRoot, SegmentGroupIndicator, SegmentGroupItem, SegmentGroupItemText, SegmentGroupItemHiddenInput } from '@/components/ui/segment-group';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleIndicator, CollapsibleContent } from '@/components/ui/collapsible';
import { NumberInputRoot, NumberInputInput } from '@/components/ui/number-input';
import { FieldRoot, FieldLabel, FieldHelperText } from '@/components/ui/field';
```

**Step 2:** Delete the local `FieldRow` function (lines 350-359) and replace all `<FieldRow label="X" description="Y">...</FieldRow>` with:

```tsx
<FieldRoot>
  <div className="min-w-0 flex-1">
    <FieldLabel>X</FieldLabel>
    <FieldHelperText>Y</FieldHelperText>
  </div>
  <div className="shrink-0">...</div>
</FieldRoot>
```

If there's no description, omit the `<FieldHelperText>` line.

**Step 3:** Delete the local `Toggle` function (lines 362-380) and replace all `<Toggle checked={x} onChange={fn} />` with:

```tsx
<SwitchRoot checked={x} onCheckedChange={(d) => fn(d.checked)}>
  <SwitchControl><SwitchThumb /></SwitchControl>
  <SwitchHiddenInput />
</SwitchRoot>
```

Note the API difference: Ark Switch uses `onCheckedChange` which receives `{ checked: boolean }`, not a plain boolean.

**Step 4:** Delete the local `TriToggle` function (lines 382-404) and replace all `<TriToggle value={v} onChange={fn} />` with a SegmentGroup. The tri-toggle has 3 states: `null` (default), `true` (on), `false` (off). Map these to string values:

```tsx
<SegmentGroupRoot
  value={v === null ? 'default' : v ? 'on' : 'off'}
  onValueChange={(d) => {
    const map: Record<string, boolean | null> = { default: null, on: true, off: false };
    fn(map[d.value] ?? null);
  }}
>
  <SegmentGroupIndicator />
  <SegmentGroupItem value="default"><SegmentGroupItemText>default</SegmentGroupItemText><SegmentGroupItemHiddenInput /></SegmentGroupItem>
  <SegmentGroupItem value="on"><SegmentGroupItemText>on</SegmentGroupItemText><SegmentGroupItemHiddenInput /></SegmentGroupItem>
  <SegmentGroupItem value="off"><SegmentGroupItemText>off</SegmentGroupItemText><SegmentGroupItemHiddenInput /></SegmentGroupItem>
</SegmentGroupRoot>
```

This replaces the cycling button with a proper 3-segment control where the user can see all states and click directly.

**Step 5:** Delete the local `Section` function (lines 451-466) and replace all `<Section title="X" defaultOpen={bool}>...</Section>` with:

```tsx
<CollapsibleRoot defaultOpen={bool}>
  <CollapsibleTrigger>
    X
    <CollapsibleIndicator>&#9654;</CollapsibleIndicator>
  </CollapsibleTrigger>
  <CollapsibleContent>...</CollapsibleContent>
</CollapsibleRoot>
```

**Step 6:** Delete the local `NumberInput` function (lines 432-447) and replace all `<NumberInput value={v} onChange={fn} min={a} max={b} step={s} />` with:

```tsx
<NumberInputRoot
  value={String(v)}
  onValueChange={(d) => { const n = parseFloat(d.value); if (!Number.isNaN(n)) fn(n); }}
  min={a}
  max={b}
  step={s}
>
  <NumberInputInput />
</NumberInputRoot>
```

Note: Ark NumberInput `value` is a string, so wrap with `String(v)`. The `onValueChange` callback receives `{ value: string, valueAsNumber: number }`.

**Step 7:** Verify the app compiles: `cd web && npx tsc --noEmit`

**Step 8:** Commit: `refactor: swap Pandoc config panel to Ark UI components`

---

## Task 5: Swap components in DoclingConfigPanel

**Modify:** `web/src/pages/settings/DoclingConfigPanel.tsx`

Identical swap as Task 4. The Docling panel has the same local component definitions.

**Step 1:** Add the same imports as Task 4 Step 1.

**Step 2:** Delete the local `FieldRow`, `Toggle`, `Select` (keep this one), `TextInput` (keep), `NumberInput`, `Section` functions.

**Step 3:** Apply the same replacements as Task 4 Steps 2-6. The Docling panel does NOT use `TriToggle`, so skip that swap.

**Step 4:** Verify: `cd web && npx tsc --noEmit`

**Step 5:** Commit: `refactor: swap Docling config panel to Ark UI components`

---

## Task 6: Build verification

**Run:** `cd web && npm run build`

If build succeeds, we're done. If there are type errors or runtime issues, fix them and commit: `fix: resolve Ark UI swap build issues`

---

## Out of scope (for later)

- **Ark `Select`** — native `<select>` works fine; Ark Select needs `createListCollection` and more markup. Swap when design calls for a styled dropdown.
- **Ark `ScrollArea`** — already used in the main panel shell. No change needed.
