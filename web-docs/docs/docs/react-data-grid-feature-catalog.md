# React Data Grid — Complete Feature Catalog

> **Library**: `react-data-grid` v7.0.0-beta.59 (Comcast fork)
> **Source**: https://github.com/Comcast/react-data-grid
> **Demos**: https://comcast.github.io/react-data-grid/
> **Our grid**: `web/src/pages/settings/IntegrationCatalogPanelTemp.tsx`
> **Generated**: 2026-02-28

Status legend:
- **WIRED** — implemented in our grid
- **NOT WIRED** — not yet implemented
- **N/A** — not applicable to our use case

---

## Table of Contents

1. [DataGrid Props](#1-datagrid-props)
2. [Column Properties](#2-column-properties)
3. [TreeDataGrid Props](#3-treedatagrid-props)
4. [Built-in Components](#4-built-in-components)
5. [Render Functions](#5-render-functions)
6. [Hooks](#6-hooks)
7. [CSS Theming](#7-css-theming)
8. [Patterns from Official Demos](#8-patterns-from-official-demos)

---

## 1. DataGrid Props

### 1.1 Core Data

| Prop | Type | Status | Notes |
|------|------|--------|-------|
| `columns` | `readonly ColumnOrColumnGroup<R, SR>[]` | WIRED | Grouped columns (Plugin, Task, Config, Mapping, Identity, Timestamps) |
| `rows` | `readonly R[]` | WIRED | From Supabase `integration_catalog_items_temp` |
| `ref` | `Ref<DataGridHandle>` | WIRED | `gridRef` for imperative access |

### 1.2 Summary Rows

| Prop | Type | Status | Notes |
|------|------|--------|-------|
| `topSummaryRows` | `readonly SR[]` | NOT WIRED | CommonFeatures demo uses both top and bottom |
| `bottomSummaryRows` | `readonly SR[]` | WIRED | Aggregates: row count, schemas, docs, enabled, plugins |
| `summaryRowHeight` | `number \| ((type, row) => number)` | WIRED | 32px |

**Demo reference**: `CommonFeatures.tsx` passes the same summary array to both `topSummaryRows` and `bottomSummaryRows`.

### 1.3 Row Identity & Mutation

| Prop | Type | Status | Notes |
|------|------|--------|-------|
| `rowKeyGetter` | `(row: R) => K` | WIRED | `row.item_id` (defined outside component per perf warning) |
| `onRowsChange` | `(rows: R[], data: RowsChangeData) => void` | WIRED | Diffs changed rows, updates Supabase, rolls back on error |

### 1.4 Dimensions

| Prop | Type | Status | Notes |
|------|------|--------|-------|
| `rowHeight` | `number \| ((row: R) => number)` | WIRED | 36px static |
| `headerRowHeight` | `number` | WIRED | 32px |
| `enableVirtualization` | `boolean` | WIRED | `true` |

**Variable row height**: `VariableRowHeight.tsx` passes a function `rowHeight()` that returns dynamic values. Useful if we ever want taller rows for long descriptions.

**Animation**: `Animation.tsx` shows animated row height transitions using CSS `transition: grid-template-rows 0.5s ease` on the grid class. Toggle between 30/60/90px heights with smooth animation.

### 1.5 Column Widths

| Prop | Type | Status | Notes |
|------|------|--------|-------|
| `columnWidths` | `ColumnWidths` (Map) | WIRED | Persisted to localStorage |
| `onColumnWidthsChange` | `(widths: ColumnWidths) => void` | WIRED | Updates state + persists resized-only entries |

**Demo reference**: `ColumnsReordering.tsx` uses `columnWidths` + `onColumnWidthsChange` with a "Reset Columns" button that calls `setColumnWidths(new Map())`.

### 1.6 Selection

| Prop | Type | Status | Notes |
|------|------|--------|-------|
| `selectedRows` | `ReadonlySet<K>` | WIRED | `Set<string>` keyed by `item_id` |
| `onSelectedRowsChange` | `(selectedRows: Set<K>) => void` | WIRED | `setSelectedRows` |
| `isRowSelectionDisabled` | `(row: R) => boolean` | WIRED | `() => false` (all selectable), DataGrid only — not on TreeDataGrid |

**Demo reference**: `AllFeatures.tsx` disables selection for a specific row: `isRowSelectionDisabled={(row) => row.id === 'id_2'}`.

### 1.7 Sorting

| Prop | Type | Status | Notes |
|------|------|--------|-------|
| `sortColumns` | `readonly SortColumn[]` | WIRED | Multi-column sort |
| `onSortColumnsChange` | `(sortColumns: SortColumn[]) => void` | WIRED | `setSortColumns` |

**Demo reference**: `ColumnsReordering.tsx` limits to single-column sort: `setSortColumns(sortColumns.slice(-1))`. Our grid allows unlimited multi-column sort.

### 1.8 Column Options

| Prop | Type | Status | Notes |
|------|------|--------|-------|
| `defaultColumnOptions` | `Partial<Column<R, SR>>` | WIRED | `{ resizable: true, sortable: true, draggable: true }` |

### 1.9 Fill

| Prop | Type | Status | Notes |
|------|------|--------|-------|
| `onFill` | `(event: FillEvent<R>) => R` | WIRED | Copies editable cell values only. DataGrid only — not on TreeDataGrid |

**Demo reference**: `AllFeatures.tsx`:
```tsx
function handleFill({ columnKey, sourceRow, targetRow }: FillEvent<Row>): Row {
  return { ...targetRow, [columnKey]: sourceRow[columnKey as keyof Row] };
}
```

### 1.10 Cell Events

| Prop | Type | Status | Notes |
|------|------|--------|-------|
| `onCellMouseDown` | `(args, event) => void` | WIRED | No-op (extensibility) |
| `onCellClick` | `(args, event) => void` | WIRED | No-op (default select behavior) |
| `onCellDoubleClick` | `(args, event) => void` | WIRED | Downloads schema JSON / markdown files |
| `onCellContextMenu` | `(args, event) => void` | WIRED | No-op — **see Context Menu pattern below** |
| `onCellKeyDown` | `(args, event) => void` | WIRED | No-op (extensibility) |

**Key pattern from `AllFeatures.tsx`** — `onCellClick` with `preventGridDefault`:
```tsx
onCellClick={(args, event) => {
  if (args.column.key === 'title') {
    event.preventGridDefault();  // Stop default cell selection
    args.selectCell(true);       // Open editor immediately on single click
  }
}}
```

**Key pattern from `CellNavigation.tsx`** — custom Tab/Arrow navigation modes:
```tsx
function handleCellKeyDown(args: CellKeyDownArgs<Row>, event: CellKeyboardEvent) {
  if (args.mode === 'EDIT') return;
  const { column, rowIdx, selectCell } = args;
  // Custom navigation: loop over row, change row on edge, loop over column, no-tab
  event.preventGridDefault();
  event.preventDefault();
  selectCell({ rowIdx: newRowIdx, idx: newIdx });
}
```

**Key pattern from `MasterDetail.tsx`** — nested grid keyboard passthrough:
```tsx
onCellKeyDown={(_, event) => {
  if (event.isDefaultPrevented()) {
    event.preventGridDefault(); // skip parent grid nav if nested grid handled it
  }
}}
```

### 1.11 Clipboard

| Prop | Type | Status | Notes |
|------|------|--------|-------|
| `onCellCopy` | `(args, event) => void` | WIRED | Writes cell text to clipboard |
| `onCellPaste` | `(args, event) => R` | WIRED | Updates editable columns from clipboard text |

**Key pattern from `AllFeatures.tsx`** — copy with visual highlight:
```tsx
const [copiedCell, setCopiedCell] = useState<{
  readonly row: Row;
  readonly column: CalculatedColumn<Row>;
} | null>(null);

function handleCellCopy({ row, column }: CellPasteArgs<Row>, event) {
  if (window.getSelection()?.isCollapsed === false) {
    setCopiedCell(null);  // user highlighted text — let browser handle
    return;
  }
  setCopiedCell({ row, column });
  event.clipboardData.setData('text/plain', row[column.key]);
  event.preventDefault();
}

// Then inject CSS to highlight the copied cell:
<style>{`.${copiedRowClassname} > [aria-colindex="${copiedCell.column.idx + 1}"] {
  background-color: #ccccff;
}`}</style>
```

**Our gap**: We don't track `copiedCell` state or show a visual highlight on the source cell.

### 1.12 Cell Selection

| Prop | Type | Status | Notes |
|------|------|--------|-------|
| `onSelectedCellChange` | `(args: CellSelectArgs) => void` | WIRED | Tracks `activeCell` state |

### 1.13 Scroll & Resize

| Prop | Type | Status | Notes |
|------|------|--------|-------|
| `onScroll` | `(event: UIEvent) => void` | WIRED | No-op |
| `onColumnResize` | `(column, width) => void` | WIRED | No-op (widths handled by columnWidths) |
| `onColumnsReorder` | `(sourceKey, targetKey) => void` | WIRED | Reorders within column groups |

**Key pattern from `InfiniteScrolling.tsx`** — `onScroll` for lazy loading:
```tsx
function isAtBottom({ currentTarget }: React.UIEvent<HTMLDivElement>): boolean {
  return currentTarget.scrollTop + 10 >= currentTarget.scrollHeight - currentTarget.clientHeight;
}

async function handleScroll(event: React.UIEvent<HTMLDivElement>) {
  if (isLoading || !isAtBottom(event)) return;
  setIsLoading(true);
  const newRows = await loadMoreRows(50, rows.length);
  setRows([...rows, ...newRows]);
  setIsLoading(false);
}
```

**Key pattern from `ColumnsReordering.tsx`** — view transition animation:
```tsx
function onColumnsReorder(sourceKey: string, targetKey: string) {
  document.startViewTransition(() => {
    // reorder columns state
  });
}
```

**Our gap**: We don't use `document.startViewTransition` for smooth column reorder animation.

### 1.14 Styling

| Prop | Type | Status | Notes |
|------|------|--------|-------|
| `className` | `string` | WIRED | `'catalog-rdg h-full'` |
| `style` | `CSSProperties` | NOT WIRED | — |
| `headerRowClass` | `string` | WIRED | `'catalog-rdg-header-row'` |
| `rowClass` | `(row, index) => string` | WIRED | Dims disabled rows |
| `direction` | `'ltr' \| 'rtl'` | WIRED | `'ltr'` |

**Demo reference**: `AllFeatures.tsx` uses `rowClass` with index:
```tsx
rowClass={(row, index) => clsx({
  [highlightClassname]: row.id.includes('7') || index === 0,
  [copiedRowClassname]: copiedCell?.row === row
})}
```

**Demo reference**: `ResizableGrid.tsx` uses `style={{ resize: 'both' }}` to make the grid itself resizable by dragging its corner.

### 1.15 Renderers

| Prop | Type | Status | Notes |
|------|------|--------|-------|
| `renderers.renderCheckbox` | `(props: RenderCheckboxProps) => ReactNode` | WIRED | Custom checkbox with brand accent |
| `renderers.renderSortStatus` | `(props: RenderSortStatusProps) => ReactNode` | WIRED | Sort icon + priority number |
| `renderers.noRowsFallback` | `ReactNode` | WIRED | "Loading..." / "No rows match filter." |
| `renderers.renderCell` | `(key, props: CellRendererProps) => ReactNode` | NOT WIRED | Per-cell conditional styling wrapper |
| `renderers.renderRow` | `(key, props: RenderRowProps) => ReactNode` | NOT WIRED | Per-row conditional styling wrapper |

**Key pattern from `CustomizableRenderers.tsx`** — `renderCell` for conditional cell styling:
```tsx
import { Cell } from 'react-data-grid';

function renderCell(key: React.Key, props: CellRendererProps<Row, unknown>) {
  const style = props.column.key === 'priority' && props.row.priority === 'Critical'
    ? { color: 'red' }
    : undefined;
  return <Cell key={key} {...props} style={style} />;
}
```

**Key pattern from `CustomizableRenderers.tsx`** — `renderRow` for conditional row styling:
```tsx
import { Row as BaseRow } from 'react-data-grid';

function renderRow(key: React.Key, props: RenderRowProps<Row>) {
  const style = props.row.complete === 100 ? { color: 'green' } : undefined;
  return <BaseRow key={key} {...props} style={style} />;
}
```

**Key pattern from `RowsReordering.tsx`** — `renderRow` for drag-and-drop row reordering:
```tsx
const renderRow = useCallback((key: React.Key, props: RenderRowProps<Row>) => {
  return <DraggableRowRenderer key={key} {...props} onRowReorder={onRowReorder} />;
}, []);
// DraggableRowRenderer wraps BaseRow with HTML drag events
```

### 1.16 Accessibility

| Prop | Type | Status | Notes |
|------|------|--------|-------|
| `aria-label` | `string` | WIRED | `'Integration catalog items'` |
| `aria-labelledby` | `string` | NOT WIRED | — |
| `aria-rowcount` | `number` | NOT WIRED | — |
| `aria-description` | `string` | NOT WIRED | — |
| `role` | `string` | NOT WIRED | — |
| `data-testid` | `string` | NOT WIRED | — |

---

## 2. Column Properties

### 2.1 Identity & Sizing

| Property | Type | Status | Notes |
|----------|------|--------|-------|
| `key` | `string` | WIRED | All columns have keys matching DB column names |
| `name` | `string \| ReactElement` | WIRED | Display names |
| `width` | `number \| string` | WIRED | Per-column widths. Supports `'max-content'` for auto-fit |
| `minWidth` | `number` | NOT WIRED | — |
| `maxWidth` | `number` | NOT WIRED | — |
| `frozen` | `boolean` | WIRED | `task_class` is frozen |
| `resizable` | `boolean` | WIRED | Via `defaultColumnOptions` |
| `sortable` | `boolean` | WIRED | Via `defaultColumnOptions` |
| `draggable` | `boolean` | WIRED | Via `defaultColumnOptions` |
| `sortDescendingFirst` | `boolean` | WIRED | On all 4 timestamp columns |

### 2.2 Rendering

| Property | Type | Status | Notes |
|----------|------|--------|-------|
| `renderCell` | `(props: RenderCellProps) => ReactNode` | WIRED | Custom renderers on most columns |
| `renderHeaderCell` | `(props: RenderHeaderCellProps) => ReactNode` | NOT WIRED | **See Header Filters pattern** |
| `renderSummaryCell` | `(props: RenderSummaryCellProps) => ReactNode` | WIRED | Aggregate displays in bottom summary |
| `renderGroupCell` | `(props: RenderGroupCellProps) => ReactNode` | NOT WIRED | **See Row Grouping pattern** |
| `renderEditCell` | `(props: RenderEditCellProps) => ReactNode` | WIRED | `renderTextEditor` + custom `EnabledEditor` |

### 2.3 Styling

| Property | Type | Status | Notes |
|----------|------|--------|-------|
| `cellClass` | `string \| ((row: R) => string)` | NOT WIRED | Per-cell conditional CSS class |
| `headerCellClass` | `string` | WIRED | `'catalog-rdg-group-header'` on group headers |
| `summaryCellClass` | `string \| ((row: SR) => string)` | NOT WIRED | — |

**Demo reference**: `ColumnSpanning.tsx` uses `cellClass` as a function for conditional highlighting:
```tsx
cellClass(row) {
  if (key === '2' && row === 2) return colSpanClassname;
  return undefined;
}
```

### 2.4 Spanning

| Property | Type | Status | Notes |
|----------|------|--------|-------|
| `colSpan` | `(args: ColSpanArgs) => number \| undefined` | WIRED | `task_class` spans 6 columns in SUMMARY row |

**Demo reference**: `ColumnSpanning.tsx` shows `colSpan` for ROW, HEADER, and SUMMARY types:
```tsx
colSpan(args) {
  if (args.type === 'ROW' && args.row === 2) return 3;
  if (args.type === 'HEADER') return 3;
  return undefined;
}
```

### 2.5 Editing

| Property | Type | Status | Notes |
|----------|------|--------|-------|
| `editable` | `boolean \| ((row: R) => boolean)` | NOT WIRED | We control editability via `renderEditCell` presence |
| `editorOptions.displayCellContent` | `boolean` | NOT WIRED | Show cell content behind editor overlay |
| `editorOptions.commitOnOutsideClick` | `boolean` | NOT WIRED | Auto-commit when clicking outside |
| `editorOptions.closeOnExternalRowChange` | `boolean` | NOT WIRED | — |

**Key pattern from `CommonFeatures.tsx`** — portal-based editor with `editorOptions`:
```tsx
{
  key: 'progress',
  name: 'Completion',
  renderCell(props) {
    return <progress max={100} value={props.row.progress} />;
  },
  renderEditCell({ row, onRowChange, onClose }) {
    return createPortal(
      <dialog open>
        <input type="range" value={row.progress}
          onChange={(e) => onRowChange({ ...row, progress: e.target.valueAsNumber })} />
        <button onClick={() => onClose()}>Cancel</button>
        <button onClick={() => onClose(true)}>Save</button>
      </dialog>,
      document.body
    );
  },
  editorOptions: { displayCellContent: true }  // keep showing progress bar behind dialog
}
```

**Key pattern from `CommonFeatures.tsx`** — dropdown editor with auto-commit:
```tsx
renderEditCell: (p) => (
  <select value={p.row.country}
    onChange={(e) => p.onRowChange({ ...p.row, country: e.target.value }, true)}>
    {countries.map((c) => <option key={c}>{c}</option>)}
  </select>
)
```
The second argument `true` to `onRowChange` auto-commits the edit (closes editor and saves).

### 2.6 Column Groups

Column groups use the `ColumnOrColumnGroup` type:
```tsx
type ColumnOrColumnGroup<R, SR> =
  | Column<R, SR>
  | { name: string; headerCellClass?: string; children: readonly ColumnOrColumnGroup<R, SR>[] };
```

**Demo reference**: `ColumnGrouping.tsx` shows arbitrarily nested groups:
```tsx
const columns: readonly ColumnOrColumnGroup<number, number>[] = [
  { key: '1', name: 'Column 1' },
  {
    name: 'Group 1',
    children: [
      { key: '2', name: 'Column 2' },
      { key: '3', name: 'Column 3' }
    ]
  },
  {
    name: 'Group 2',
    children: [
      {
        name: 'Subgroup 2-1',
        children: [
          { name: 'Subgroup 2-1-1', children: [{ key: '5', name: 'Column 5' }] }
        ]
      },
      { key: '6', name: 'Column 6' },
    ]
  },
];
```

---

## 3. TreeDataGrid Props

TreeDataGrid extends DataGrid for row grouping. These props are **in addition to** all DataGrid props except `onFill` and `isRowSelectionDisabled` (which TreeDataGrid does not support).

| Prop | Type | Status | Notes |
|------|------|--------|-------|
| `groupBy` | `readonly string[]` | WIRED | `['plugin_name']` when toggled |
| `rowGrouper` | `(rows, columnKey) => Record<string, R[]>` | WIRED | Groups rows by column value |
| `expandedGroupIds` | `ReadonlySet<unknown>` | WIRED | Tracks which groups are expanded |
| `onExpandedGroupIdsChange` | `(ids: Set<unknown>) => void` | WIRED | `setExpandedGroupIds` |
| `groupIdGetter` | `(groupKey, parentId?) => string` | NOT WIRED | Custom group ID generation |
| `rowHeight` (function form) | `(args: RowHeightArgs) => number` | NOT WIRED | `args` includes `isGroupRow` for different group row height |

**Key pattern from `RowGrouping.tsx`** — `renderGroupCell` for aggregation in group rows:
```tsx
{
  key: 'gold',
  name: 'Gold',
  renderGroupCell({ childRows }) {
    return childRows.reduce((prev, { gold }) => prev + gold, 0);
  }
}
```

**Our gap**: We don't have `renderGroupCell` on any columns, so group rows in TreeDataGrid mode show empty cells instead of aggregated values (e.g., count of items in group, number with schemas, etc.).

---

## 4. Built-in Components

### 4.1 SelectColumn

Pre-built column with header checkbox (select all) and row checkboxes.

```tsx
import { SelectColumn } from 'react-data-grid';
const columns = [SelectColumn, ...otherColumns];
```

**Status**: WIRED

**Demo reference**: `CustomizableRenderers.tsx` overrides SelectColumn styling:
```tsx
{
  ...SelectColumn,
  headerCellClass: selectCellClassname,
  cellClass: selectCellClassname
}
```

### 4.2 SelectCellFormatter

Standalone checkbox component for custom selection cells.

```tsx
import { SelectCellFormatter } from 'react-data-grid';

// Used in CommonFeatures.tsx for the "Available" boolean column:
renderCell({ row, onRowChange, tabIndex }) {
  return (
    <SelectCellFormatter
      value={row.available}
      onChange={() => onRowChange({ ...row, available: !row.available })}
      tabIndex={tabIndex}
    />
  );
}
```

**Status**: NOT WIRED — we use a custom `EnabledEditor` dropdown instead. Could be useful for inline boolean toggle without entering edit mode.

### 4.3 Row and Cell Components

Used in custom `renderers.renderRow` and `renderers.renderCell`:

```tsx
import { Row as BaseRow, Cell } from 'react-data-grid';
```

**Status**: NOT WIRED — not imported.

### 4.4 textEditorClassname

CSS class for consistent editor styling:

```tsx
import { textEditorClassname } from 'react-data-grid/lib/editors/renderTextEditor';
// Apply to custom <select> or <input> editors for consistent look
```

**Status**: NOT WIRED — our `EnabledEditor` uses Tailwind classes instead.

---

## 5. Render Functions

Exported utility functions for composition in custom renderers.

| Function | Purpose | Status |
|----------|---------|--------|
| `renderTextEditor` | Default text input editor | WIRED |
| `renderSortIcon` | Sort direction arrow | WIRED (inside `customRenderSortStatus`) |
| `renderSortPriority` | Multi-sort priority number | WIRED (inside `customRenderSortStatus`) |
| `renderCheckbox` | Default checkbox renderer | NOT WIRED (we have custom) |
| `renderToggleGroup` | Group expand/collapse toggle | NOT WIRED |
| `renderValue` | Default cell value display | NOT WIRED |

---

## 6. Hooks

| Hook | Purpose | Status |
|------|---------|--------|
| `useRowSelection()` | Row selection state in custom cell renderers | NOT WIRED |
| `useHeaderRowSelection()` | Header select-all state in custom header renderers | NOT WIRED |

---

## 7. CSS Theming

### 7.1 Color Scheme

```css
/* Auto light/dark based on OS preference */
:root { color-scheme: light dark; }

/* Or force one mode */
.rdg-light { /* light mode */ }
.rdg-dark { /* dark mode */ }
```

**Status**: We rely on `data-theme` attribute. RDG picks up `color-scheme` from the root.

### 7.2 CSS Custom Properties

| Variable | Default | Our Override |
|----------|---------|-------------|
| `--rdg-selection-color` | `hsl(207, 75%, 66%)` | Not overridden |
| `--rdg-selection-width` | `2px` | Not overridden |
| `--rdg-font-size` | `14px` | Not overridden |
| `--rdg-color` | Theme-dependent | Not overridden |
| `--rdg-background-color` | Theme-dependent | Not overridden |
| `--rdg-header-background-color` | Theme-dependent | Not overridden |
| `--rdg-border-color` | Theme-dependent | Not overridden |
| `--rdg-row-hover-background-color` | Theme-dependent | Not overridden |
| `--rdg-row-selected-background-color` | Theme-dependent | Not overridden |
| `--rdg-row-selected-hover-background-color` | Theme-dependent | Not overridden |
| `--rdg-frozen-cell-box-shadow` | `2px 0 5px -2px...` | Not overridden |

### 7.3 Vite 8+ Note

If using lightningcss with Vite 8+, `light-dark()` CSS syntax may have bugs. Workaround:
```ts
// vite.config.ts
css: { transformer: 'postcss' }
// or
build: { cssMinify: 'esbuild' }
```

---

## 8. Patterns from Official Demos

### 8.1 Export to CSV / PDF

**Demo**: `CommonFeatures.tsx`
**Status**: NOT WIRED

Uses `gridRef.current!.element!` (the DOM element) to extract table data:

```tsx
import { flushSync } from 'react-dom';

function handleExportToCsv() {
  flushSync(() => setIsExporting(true));        // disable virtualization
  exportToCsv(gridRef.current!.element!, 'file.csv');
  flushSync(() => setIsExporting(false));       // re-enable virtualization
}
```

Key insight: `enableVirtualization` must be `false` during export so all rows are rendered in DOM. Use `flushSync` to force synchronous state update.

The `exportToCsv` and `exportToPdf` utilities are in `website/utils.tsx` — they walk the grid's DOM `<table>` structure. For our case, we could export directly from the rows array instead.

### 8.2 Context Menu (Right-Click)

**Demo**: `ContextMenu.tsx`
**Status**: NOT WIRED (handler exists but is a no-op)

Pattern: portal-based menu positioned at cursor coordinates.

```tsx
const [contextMenuProps, setContextMenuProps] = useState<{
  rowIdx: number; top: number; left: number;
} | null>(null);

// In DataGrid:
onCellContextMenu={({ row }, event) => {
  event.preventGridDefault();
  event.preventDefault();
  setContextMenuProps({ rowIdx: rows.indexOf(row), top: event.clientY, left: event.clientX });
}}

// Render portal:
{contextMenuProps && createPortal(
  <menu style={{ position: 'absolute', top: contextMenuProps.top, left: contextMenuProps.left }}>
    <li><button onClick={() => deleteRow(contextMenuProps.rowIdx)}>Delete Row</button></li>
    <li><button onClick={() => insertRow(contextMenuProps.rowIdx)}>Insert Row Above</button></li>
    <li><button onClick={() => insertRow(contextMenuProps.rowIdx + 1)}>Insert Row Below</button></li>
  </menu>,
  document.body
)}

// Dismiss on outside click:
useLayoutEffect(() => {
  if (!isOpen) return;
  const onMouseDown = (e: MouseEvent) => {
    if (!menuRef.current?.contains(e.target as Node)) setContextMenuProps(null);
  };
  window.addEventListener('mousedown', onMouseDown);
  return () => window.removeEventListener('mousedown', onMouseDown);
}, [isOpen]);
```

### 8.3 Header Filters

**Demo**: `HeaderFilters.tsx`
**Status**: NOT WIRED

Pattern: filter inputs rendered inside column headers using `renderHeaderCell`. Uses React Context to share filter state.

```tsx
const FilterContext = createContext<Filter | undefined>(undefined);

// Column definition:
{
  key: 'task',
  name: 'Title',
  headerCellClass: 'filter-cell',
  renderHeaderCell: (p) => (
    <FilterRenderer {...p}>
      {({ filters }) => (
        <input value={filters.task}
          onChange={(e) => setFilters({ ...filters, task: e.target.value })}
          onKeyDown={inputStopPropagation} />
      )}
    </FilterRenderer>
  )
}

// FilterRenderer component:
function FilterRenderer({ tabIndex, column, children }) {
  const filters = use(FilterContext)!;
  return (
    <>
      <div>{column.name}</div>
      {filters.enabled && <div>{children({ tabIndex, filters })}</div>}
    </>
  );
}

// Dynamic header height when filters are shown:
headerRowHeight={filters.enabled ? 70 : undefined}
```

Key detail: `onKeyDown={inputStopPropagation}` prevents arrow keys from navigating away from the input:
```tsx
function inputStopPropagation(event: React.KeyboardEvent<HTMLInputElement>) {
  if (['ArrowLeft', 'ArrowRight'].includes(event.key)) event.stopPropagation();
}
```

### 8.4 Master-Detail (Nested Grids)

**Demo**: `MasterDetail.tsx`
**Status**: NOT WIRED

Pattern: expandable rows that show a nested DataGrid. Uses discriminated union row type and dynamic `rowHeight`.

```tsx
type DepartmentRow =
  | { type: 'MASTER'; id: number; department: string; expanded: boolean }
  | { type: 'DETAIL'; id: number; parentId: number };

// Dynamic row height:
rowHeight={(row) => (row.type === 'DETAIL' ? 300 : 45)}

// colSpan to make detail row span all columns:
colSpan(args) {
  return args.type === 'ROW' && args.row.type === 'DETAIL' ? 3 : undefined;
}

// onRowsChange to insert/remove detail rows:
function onRowsChange(rows, { indexes }) {
  const row = rows[indexes[0]];
  if (row.type === 'MASTER') {
    if (row.expanded) {
      rows.splice(indexes[0] + 1, 0, { type: 'DETAIL', id: row.id + 100, parentId: row.id });
    } else {
      rows.splice(indexes[0] + 1, 1);
    }
    setRows(rows);
  }
}
```

### 8.5 Tree View (Manual Expand/Collapse)

**Demo**: `TreeView.tsx`
**Status**: NOT WIRED

Different from TreeDataGrid — this is a manual tree using `useReducer` to toggle child row visibility. Each row has an optional `children` array and `isExpanded` flag. Uses `CellExpanderFormatter` for the expand/collapse button and `ChildRowDeleteButton` for deleting child rows.

### 8.6 Cell Navigation Modes

**Demo**: `CellNavigation.tsx`
**Status**: NOT WIRED (handler exists but is a no-op)

Five navigation modes:
1. **NONE** — default grid navigation
2. **CHANGE_ROW** — ArrowRight at end of row moves to next row's first cell
3. **LOOP_OVER_ROW** — ArrowRight at end wraps to same row's first cell
4. **LOOP_OVER_COLUMN** — Tab moves down the column instead of across
5. **NO_TAB** — Tab leaves the grid entirely (focus next DOM element)

### 8.7 Infinite Scrolling

**Demo**: `InfiniteScrolling.tsx`
**Status**: NOT WIRED (onScroll handler is a no-op)

Pattern: detect scroll-to-bottom and load more rows.

### 8.8 Scroll To Cell (Programmatic)

**Demo**: `ScrollToCell.tsx`
**Status**: NOT WIRED (gridRef exists but `scrollToCell` not used)

```tsx
gridRef.current!.scrollToCell({ idx: columnIndex, rowIdx: rowIndex });
```

Supports `scroll-behavior: smooth` via CSS class on the grid.

### 8.9 Row Drag Reordering

**Demo**: `RowsReordering.tsx`
**Status**: NOT WIRED

Uses `renderers.renderRow` with a custom `DraggableRowRenderer` that wraps `BaseRow` with HTML5 drag events. Calls `document.startViewTransition()` for smooth animation.

### 8.10 Animation (Row Height Transitions)

**Demo**: `Animation.tsx`
**Status**: NOT WIRED

CSS transition on `grid-template-rows` for smooth row height changes:
```css
.transition-grid {
  transition: grid-template-rows 0.5s ease;
}
```

### 8.11 Resizable Grid Container

**Demo**: `ResizableGrid.tsx`
**Status**: NOT WIRED

Simply `style={{ resize: 'both' }}` on the DataGrid — makes the whole grid resizable by dragging the corner handle.

### 8.12 Million Cells Performance

**Demo**: `MillionCells.tsx`
**Status**: N/A

Demonstrates 1000x1000 grid (1M cells) with virtualization. Proves the library handles massive datasets.

---

## Feature Priority Matrix

Features ranked by practical value for the Integration Catalog grid:

### High Value

| Feature | Why |
|---------|-----|
| Context menu (right-click) | Delete/edit rows without toolbar, natural UX |
| Export to CSV | Users will want to export catalog data |
| Header filters | Column-level filtering is more precise than global search |
| `renderGroupCell` aggregation | TreeDataGrid mode shows empty group rows without it |
| Copied cell visual highlight | Visual feedback for copy/paste operations |

### Medium Value

| Feature | Why |
|---------|-----|
| `SelectCellFormatter` for enabled toggle | Inline boolean toggle without entering edit mode |
| `renderCell` / `renderRow` wrappers | Conditional per-cell/per-row styling |
| `topSummaryRows` | Summary at top for immediate visibility |
| View transition animation on reorder | Smooth visual feedback |
| `cellClass` per-column | Conditional cell styling (e.g., highlight nulls) |
| `editorOptions.displayCellContent` | Keep showing cell content behind modal editors |

### Lower Value (for this use case)

| Feature | Why |
|---------|-----|
| Infinite scrolling | We load all 945 rows at once — dataset is small |
| Master-Detail nested grids | Not applicable to flat catalog data |
| Manual Tree View | We use TreeDataGrid grouping instead |
| Row drag reordering | Catalog rows have no meaningful manual order |
| Cell navigation modes | Default navigation is fine |
| Scroll to cell | No current need for programmatic scrolling |
| Row height animation | Static row height is fine |
| Resizable grid container | Grid fills available space |
| Million cells perf | Dataset is <1000 rows |
| `minWidth` / `maxWidth` | Current fixed widths work fine |
| `aria-rowcount` etc. | Nice-to-have accessibility |
| `groupIdGetter` | Default group IDs work fine |
| `useRowSelection` / `useHeaderRowSelection` hooks | Only needed in deeply custom cell renderers |

---

## DataGridHandle API Reference

The `ref` gives access to:

```tsx
interface DataGridHandle {
  element: HTMLDivElement | null;      // DOM element (for export)
  scrollToCell(position: {             // Programmatic scroll
    idx?: number;
    rowIdx?: number;
  }): void;
  selectCell(position: {               // Programmatic cell selection
    idx: number;
    rowIdx: number;
  }, enableEditor?: boolean): void;
}
```

**Current usage**: `gridRef` is created but none of these methods are called.

---

## Type Reference

Key types to import when needed:

```tsx
import type {
  Column,
  ColumnOrColumnGroup,
  ColumnWidths,
  SortColumn,
  CalculatedColumn,
  CellSelectArgs,
  CellMouseArgs,
  CellMouseEvent,
  CellKeyDownArgs,
  CellKeyboardEvent,
  CellClipboardEvent,
  CellCopyArgs,
  CellPasteArgs,
  FillEvent,
  RowsChangeData,
  RenderCellProps,
  RenderEditCellProps,
  RenderHeaderCellProps,
  RenderSummaryCellProps,
  RenderGroupCellProps,
  RenderCheckboxProps,
  RenderSortStatusProps,
  RenderRowProps,
  CellRendererProps,
  DataGridHandle,
  Direction,
  ColSpanArgs,
  RowHeightArgs,
  SelectRowEvent,
} from 'react-data-grid';
```
