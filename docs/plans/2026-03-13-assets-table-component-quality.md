# Assets Table Component Quality — Use Established UI Primitives

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the Assets table to use established Ark UI / CVA components (Button, Badge) instead of raw HTML, hide the irrelevant parse-status column, and normalize arbitrary font sizes to design-system tokens.

**Architecture:** Surgical edits to 3 existing files. No new files, no new components, no new tokens. Every change swaps a raw HTML pattern for an existing component already in the project's `components/ui/` layer.

**Tech Stack:** Button (CVA, `components/ui/button.tsx`), Badge (CVA, `components/ui/badge.tsx`), DocumentFileTable, StatusBadge

**Scope boundary:** This plan covers only the Assets page's table. Parse page table fixes are a separate plan. PreviewTabPanel font sizes (`text-[11px]`, `text-[13px]`) are out of scope — those are deliberate preview-header sizing, not table data.

---

### Task 1: Hide the Status column on Assets

The `DocumentFileTable` already has a `hideStatus` prop (default `false`). Assets shows parse status (parsed/unparsed/converting) which is meaningless here — every row is a successfully uploaded file.

**Files:**
- Modify: `web/src/pages/useAssetsWorkbench.tsx:96-111` (the `DocumentFileTable` usage)

**Step 1: Add `hideStatus` prop**

In `useAssetsWorkbench.tsx`, find the `<DocumentFileTable` JSX block and add `hideStatus`:

```tsx
        <DocumentFileTable
          docs={docs}
          loading={loading}
          error={error}
          selected={selected}
          toggleSelect={toggleSelect}
          toggleSelectAll={toggleSelectAll}
          allSelected={allSelected}
          someSelected={someSelected}
          activeDoc={activeDocUid}
          onDocClick={handleDocClick}
          renderRowActions={renderRowActions}
          hideStatus
        />
```

**Step 2: Verify the app compiles**

Run: `cd web && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

**Step 3: Commit**

```bash
cd web && git add src/pages/useAssetsWorkbench.tsx && git commit -m "fix(assets): hide irrelevant parse-status column from file table"
```

---

### Task 2: Replace raw action buttons with Button component

The `renderRowActions` in `useAssetsWorkbench.tsx` uses two raw `<button>` elements with hand-styled classes. Replace with the project's `Button` component (`variant="ghost"`, `size="icon"`).

**Files:**
- Modify: `web/src/pages/useAssetsWorkbench.tsx:63-82`

**Step 1: Add Button import**

The file does not currently import `Button`. Add it:

```tsx
import { Button } from '@/components/ui/button';
```

**Step 2: Replace renderRowActions**

Find the current `renderRowActions`:

```tsx
  const renderRowActions = useCallback((doc: ProjectDocumentRow) => (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); void handleDownload(doc); }}
        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent"
        title="Download"
      >
        <IconDownload size={14} />
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); void handleDelete(doc); }}
        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        title="Delete"
      >
        <IconTrash size={14} />
      </button>
    </div>
  ), [handleDownload, handleDelete]);
```

Replace with:

```tsx
  const renderRowActions = useCallback((doc: ProjectDocumentRow) => (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground"
        onClick={(e) => { e.stopPropagation(); void handleDownload(doc); }}
        title="Download"
      >
        <IconDownload size={14} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        onClick={(e) => { e.stopPropagation(); void handleDelete(doc); }}
        title="Delete"
      >
        <IconTrash size={14} />
      </Button>
    </div>
  ), [handleDownload, handleDelete]);
```

**Why `className="h-6 w-6"`:** The Button `icon` size defaults to `h-10 w-10`, which is too large for a compact table row. The override keeps the table dense.

**Step 3: Remove unused icon imports if any**

Check that `IconDownload` and `IconTrash` are still used (they are — in the JSX). No import cleanup needed.

**Step 4: Verify the app compiles**

Run: `cd web && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

**Step 5: Commit**

```bash
cd web && git add src/pages/useAssetsWorkbench.tsx && git commit -m "refactor(assets): replace raw action buttons with Button component"
```

---

### Task 3: Replace format `<span>` with Badge component in DocumentFileTable

The format cell in `DocumentFileTable.tsx` uses a raw `<span>` with `text-[10px]` and hand-rolled badge-like styling. Replace with the existing `Badge` component.

**Files:**
- Modify: `web/src/components/documents/DocumentFileTable.tsx:133-136`

**Step 1: Add Badge import**

```tsx
import { Badge } from '@/components/ui/badge';
```

**Step 2: Replace the format span**

Find:

```tsx
                  <td className="px-3 py-2.5">
                    <span className="inline-flex rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                      {getDocumentFormat(doc)}
                    </span>
                  </td>
```

Replace with:

```tsx
                  <td className="px-3 py-2.5">
                    <Badge variant="gray" size="xs" className="uppercase">
                      {getDocumentFormat(doc)}
                    </Badge>
                  </td>
```

**Why `variant="gray" size="xs"`:** The Badge `gray` variant uses `bg-muted text-muted-foreground` — the same semantic tokens as the hand-rolled span. The `xs` size maps to `px-1.5 py-px text-[10px]` which preserves the compact look.

**Step 3: Verify the app compiles**

Run: `cd web && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

**Step 4: Commit**

```bash
cd web && git add src/components/documents/DocumentFileTable.tsx && git commit -m "refactor(table): replace raw format span with Badge component"
```

---

### Task 4: Replace StatusBadge internals with Badge component

`StatusBadge.tsx` uses hardcoded Tailwind colors (`bg-green-500/10 text-green-600 dark:text-green-400`) instead of the Badge component's semantic variants. This affects the Parse page (Assets now hides status via Task 1), but fixing the shared component is the right thing.

**Files:**
- Modify: `web/src/components/documents/StatusBadge.tsx`

**Step 1: Rewrite StatusBadge.tsx**

Replace the entire file with:

```tsx
import { Badge } from '@/components/ui/badge';
import type { FileDispatchStatus } from '@/hooks/useBatchParse';

export function StatusBadge({ status, error }: { status: string; error?: string | null }) {
  const variant: 'green' | 'red' | 'blue' | 'gray' =
    status === 'parsed'
      ? 'green'
      : status === 'conversion_failed' || status === 'parse_failed'
        ? 'red'
        : status === 'converting'
          ? 'blue'
          : 'gray';
  const label =
    status === 'parsed'
      ? 'parsed'
      : status === 'uploaded'
        ? 'unparsed'
        : status.replace(/_/g, ' ');
  return (
    <Badge variant={variant} size="xs" title={error ?? undefined}>
      {label}
    </Badge>
  );
}

export function DispatchBadge({ status }: { status: FileDispatchStatus }) {
  if (status === 'idle') return null;
  const variant: 'blue' | 'red' | 'default' | 'gray' =
    status === 'dispatched'
      ? 'blue'
      : status === 'dispatch_error'
        ? 'red'
        : status === 'dispatching'
          ? 'default'
          : 'gray';
  return (
    <Badge variant={variant} size="xs" className="ml-1">
      {status === 'dispatching' ? 'sending...' : status}
    </Badge>
  );
}
```

**What changed:**
- `StatusBadge`: hardcoded `bg-green-500/10 text-green-600 dark:text-green-400` → `Badge variant="green"` (which renders `bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300`)
- `DispatchBadge`: same pattern — hardcoded blue/red colors → Badge variants
- `text-[10px]` raw class → Badge `size="xs"` (which includes `text-[10px]` internally, consistent with the design system)
- Both now use the project's single source of truth for badge styling

**Step 2: Verify the app compiles**

Run: `cd web && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

**Step 3: Commit**

```bash
cd web && git add src/components/documents/StatusBadge.tsx && git commit -m "refactor(badges): use Badge component instead of hardcoded Tailwind colors"
```

---

## Verification Checklist

After all 4 tasks:

1. **Assets page (`/app/assets`):**
   - No Status column visible
   - Format badge uses Badge component (visually identical, semantically correct)
   - Download/Delete buttons use Button component (hover states from design system)
   - Clicking a row shows preview in right pane

2. **Parse page (`/app/parse`):**
   - Status column still visible (hideStatus defaults to false)
   - StatusBadge and DispatchBadge render with Badge component variants
   - Format badge uses Badge component
   - No visual regression — colors map to same semantic intent

3. **No arbitrary font sizes introduced** — `text-[10px]` is now encapsulated inside Badge `size="xs"`, not scattered across components

4. **TypeScript compiles:** `cd web && npx tsc --noEmit`

---

## What Changed (Summary)

| File | Change | Lines |
|------|--------|-------|
| `useAssetsWorkbench.tsx` | Add `hideStatus`, swap raw buttons → `Button` | ~10 lines changed |
| `DocumentFileTable.tsx` | Format span → `Badge` | 4 lines changed |
| `StatusBadge.tsx` | Full rewrite using `Badge` component | 43 → 37 lines |

## What Was NOT Changed

- No new components created
- No new design tokens added
- No changes to Badge or Button component definitions
- No changes to ParsePage, useParseWorkbench, or PreviewTabPanel
- No router or build config changes