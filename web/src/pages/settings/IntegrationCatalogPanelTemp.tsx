import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DataGrid,
  TreeDataGrid,
  SelectColumn,
  renderSortIcon,
  renderSortPriority,
  renderTextEditor,
  type Column,
  type ColumnOrColumnGroup,
  type ColumnWidths,
  type SortColumn,
  type CellCopyArgs,
  type CellPasteArgs,
  type FillEvent,
  type RenderEditCellProps,
  type RenderCheckboxProps,
  type RenderSortStatusProps,
  type RenderSummaryCellProps,
  type DataGridHandle,
  type RowsChangeData,
} from 'react-data-grid';
import { Checkbox } from '@ark-ui/react/checkbox';
import { supabase } from '@/lib/supabase';
import { paginateRows, PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from './pagination';

/* ── Row type — lightweight (excludes task_schema & task_markdown blobs) ── */

type CatalogRow = {
  item_id: string;
  source: string;
  external_id: string;
  plugin_name: string;
  plugin_title: string | null;
  plugin_group: string | null;
  plugin_version: string | null;
  categories: string[] | null;
  task_class: string;
  task_title: string | null;
  task_description: string | null;
  enabled: boolean;
  mapped_service_id: string | null;
  mapped_function_id: string | null;
  mapping_notes: string | null;
  source_updated_at: string | null;
  created_at: string | null;
};

/* ── Lightweight select (no task_schema / task_markdown — those are ~50 MB total) ── */

const LIGHT_SELECT = [
  'item_id', 'source', 'external_id',
  'plugin_name', 'plugin_title', 'plugin_group', 'plugin_version', 'categories',
  'task_class', 'task_title', 'task_description',
  'enabled',
  'mapped_service_id', 'mapped_function_id', 'mapping_notes',
  'source_updated_at', 'created_at',
].join(',');

/* ── Summary row type ── */

type SummaryRow = {
  totalRows: number;
  enabledCount: number;
  distinctPlugins: number;
  distinctGroups: number;
};

/* ── Editable columns ── */

const EDITABLE_KEYS = new Set(['enabled', 'mapping_notes']);

/* ── Helpers ── */

function formatTs(v: string | null): string {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? (v ?? '') : d.toLocaleString();
}

async function fetchAndDownload(itemId: string, column: 'task_schema' | 'task_markdown', filename: string) {
  const { data, error } = await supabase
    .from('integration_catalog_items_temp')
    .select(column)
    .eq('item_id', itemId)
    .single();
  if (error || !data) {
    alert(`Download failed: ${error?.message ?? 'no data'}`);
    return;
  }
  const val = (data as Record<string, unknown>)[column];
  if (val == null) return;
  const content = typeof val === 'string' ? val : JSON.stringify(val, null, 2);
  const mime = column === 'task_schema' ? 'application/json' : 'text/markdown';
  downloadBlob(content, filename, mime);
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function safeName(cls: string) {
  return cls.replace(/\./g, '_');
}

function getCellTextValue(row: CatalogRow, key: string): string {
  const v = (row as Record<string, unknown>)[key];
  if (v == null) return '';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') return JSON.stringify(v, null, 2);
  return String(v);
}

/* ── Sort comparator ── */

function getComparator(sortColumn: string): (a: CatalogRow, b: CatalogRow) => number {
  switch (sortColumn) {
    case 'enabled':
      return (a, b) => (a.enabled === b.enabled ? 0 : a.enabled ? -1 : 1);
    case 'categories':
      return (a, b) => {
        const av = (a.categories ?? []).join(',');
        const bv = (b.categories ?? []).join(',');
        return av.localeCompare(bv);
      };
    default:
      return (a, b) => {
        const av = (a as Record<string, unknown>)[sortColumn];
        const bv = (b as Record<string, unknown>)[sortColumn];
        const as = av == null ? '' : String(av);
        const bs = bv == null ? '' : String(bv);
        return as.localeCompare(bs);
      };
  }
}

/* ── Column width persistence ── */

const COL_WIDTHS_KEY = 'blockdata-catalog-temp-col-widths';

function readPersistedWidths(): ColumnWidths {
  try {
    const raw = localStorage.getItem(COL_WIDTHS_KEY);
    if (!raw) return new Map();
    const entries = JSON.parse(raw) as [string, string, number][];
    const map = new Map<string, { type: 'resized' | 'measured'; width: number }>();
    for (const [key, type, width] of entries) {
      if (type !== 'resized' && type !== 'measured') continue;
      if (typeof width !== 'number' || !Number.isFinite(width) || width <= 0) continue;
      map.set(key, { type, width });
    }
    return map;
  } catch {
    return new Map();
  }
}

function persistWidths(widths: ColumnWidths) {
  const resized: [string, string, number][] = [];
  for (const [key, val] of widths) {
    if (val.type === 'resized') resized.push([key, val.type, val.width]);
  }
  try {
    localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(resized));
  } catch {
    /* storage full — ignore */
  }
}

/* ── Enabled toggle editor ── */

function EnabledEditor({ row, onRowChange, onClose }: RenderEditCellProps<CatalogRow, SummaryRow>) {
  return (
    <select
      className="h-full w-full bg-background"
      autoFocus
      value={row.enabled ? 'true' : 'false'}
      onChange={(e) => {
        onRowChange({ ...row, enabled: e.target.value === 'true' }, true);
      }}
      onBlur={() => onClose(true)}
    >
      <option value="true">true</option>
      <option value="false">false</option>
    </select>
  );
}

/* ── Custom renderers ── */

function RdgCheckbox({
  onChange,
  checked,
  indeterminate,
  disabled,
  tabIndex,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
}: RenderCheckboxProps) {
  const shiftKeyRef = useRef(false);
  return (
    <Checkbox.Root
      checked={indeterminate ? 'indeterminate' : checked}
      disabled={disabled}
      onCheckedChange={(details) => {
        onChange(details.checked === true, shiftKeyRef.current);
      }}
      onMouseDown={(e: React.MouseEvent) => {
        shiftKeyRef.current = e.shiftKey;
      }}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      className="catalog-rdg-checkbox"
    >
      <Checkbox.Control className="catalog-rdg-checkbox-control">
        <Checkbox.Indicator>
          <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5">
            <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Checkbox.Indicator>
        <Checkbox.Indicator indeterminate>
          <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5">
            <path d="M2.5 6H9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </Checkbox.Indicator>
      </Checkbox.Control>
      <Checkbox.HiddenInput tabIndex={tabIndex} />
    </Checkbox.Root>
  );
}

function customRenderSortStatus({ sortDirection, priority }: RenderSortStatusProps) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
      {renderSortIcon({ sortDirection })}
      {renderSortPriority({ priority })}
    </span>
  );
}

/* ── Row class ── */

function getRowClass(row: CatalogRow): string | undefined {
  if (!row.enabled) return 'catalog-rdg-row-disabled';
  return undefined;
}

/* ── Row key getter (outside component per RDG perf warning) ── */

function rowKeyGetter(row: CatalogRow): string {
  return row.item_id;
}

/* ── isRowSelectionDisabled (outside component per RDG perf warning) ── */

function isRowSelectionDisabled(): boolean {
  return false;
}

/* ── Row grouper for TreeDataGrid ── */

function rowGrouper(rows: readonly CatalogRow[], columnKey: string): Record<string, readonly CatalogRow[]> {
  const groups: Record<string, CatalogRow[]> = {};
  for (const row of rows) {
    const key = String((row as Record<string, unknown>)[columnKey] ?? '(empty)');
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }
  return groups;
}

/* ── Columns ── */

const ROW_NUMBER_COLUMN: Column<CatalogRow, SummaryRow> = {
  key: '_row_number',
  name: '#',
  width: 50,
  minWidth: 40,
  resizable: false,
  sortable: false,
  renderCell: ({ rowIdx }) => (
    <span className="text-muted-foreground tabular-nums">{rowIdx + 1}</span>
  ),
  renderSummaryCell: () => null,
};

function makeSummaryRenderer(render: (row: SummaryRow) => string) {
  return function SummaryCell({ row }: RenderSummaryCellProps<SummaryRow, CatalogRow>) {
    return <span className="font-semibold">{render(row)}</span>;
  };
}

const PLUGIN_COLUMNS: Column<CatalogRow, SummaryRow>[] = [
  {
    key: 'task_class',
    name: 'Task Class',
    width: 360,
    renderSummaryCell: makeSummaryRenderer((r) => `${r.totalRows} rows`),
    colSpan(args) {
      if (args.type === 'SUMMARY') return 6;
      return undefined;
    },
  },
  {
    key: 'plugin_name',
    name: 'Plugin',
    width: 120,
    renderSummaryCell: () => null,
  },
  {
    key: 'plugin_title',
    name: 'Plugin Title',
    width: 150,
    renderSummaryCell: () => null,
  },
  {
    key: 'plugin_group',
    name: 'Group',
    width: 200,
    renderSummaryCell: () => null,
  },
  {
    key: 'plugin_version',
    name: 'Version',
    width: 110,
    renderSummaryCell: () => null,
  },
  {
    key: 'categories',
    name: 'Categories',
    width: 150,
    renderCell: ({ row }) => (row.categories ?? []).join(', '),
    renderSummaryCell: () => null,
  },
];

const TASK_COLUMNS: Column<CatalogRow, SummaryRow>[] = [
  {
    key: 'task_title',
    name: 'Title',
    width: 260,
  },
  {
    key: 'task_description',
    name: 'Description',
    width: 280,
  },
  {
    key: 'task_schema',
    name: 'Schema',
    width: 90,
    sortable: false,
    renderCell: ({ row }) => (
      <button
        className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground hover:text-foreground"
        onClick={() => fetchAndDownload(row.item_id, 'task_schema', `${safeName(row.task_class)}.schema.json`)}
      >
        JSON
      </button>
    ),
  },
  {
    key: 'task_markdown',
    name: 'Docs',
    width: 90,
    sortable: false,
    renderCell: ({ row }) => (
      <button
        className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground hover:text-foreground"
        onClick={() => fetchAndDownload(row.item_id, 'task_markdown', `${safeName(row.task_class)}.md`)}
      >
        MD
      </button>
    ),
  },
];

const CONFIG_COLUMNS: Column<CatalogRow, SummaryRow>[] = [
  {
    key: 'enabled',
    name: 'Enabled',
    width: 75,
    renderCell: ({ row }) => row.enabled ? 'true' : 'false',
    renderEditCell: EnabledEditor,
    renderSummaryCell: makeSummaryRenderer((r) => `${r.enabledCount} on`),
  },
];

const MAPPING_COLUMNS: Column<CatalogRow, SummaryRow>[] = [
  {
    key: 'mapped_service_id',
    name: 'Service ID',
    width: 280,
  },
  {
    key: 'mapped_function_id',
    name: 'Function ID',
    width: 280,
  },
  {
    key: 'mapping_notes',
    name: 'Notes',
    width: 180,
    renderEditCell: renderTextEditor,
  },
];

const IDENTITY_COLUMNS: Column<CatalogRow, SummaryRow>[] = [
  {
    key: 'source',
    name: 'Source',
    width: 80,
  },
  {
    key: 'external_id',
    name: 'External ID',
    width: 300,
  },
  {
    key: 'item_id',
    name: 'Item ID',
    width: 290,
  },
];

const TIMESTAMP_COLUMNS: Column<CatalogRow, SummaryRow>[] = [
  {
    key: 'source_updated_at',
    name: 'Source Updated',
    width: 170,
    sortDescendingFirst: true,
    renderCell: ({ row }) => formatTs(row.source_updated_at),
  },
  {
    key: 'created_at',
    name: 'Created',
    width: 170,
    sortDescendingFirst: true,
    renderCell: ({ row }) => formatTs(row.created_at),
  },
];

/* ── Column visibility ── */

const ALL_COLUMN_GROUPS = [
  { group: 'Plugin', columns: PLUGIN_COLUMNS },
  { group: 'Task', columns: TASK_COLUMNS },
  { group: 'Config', columns: CONFIG_COLUMNS },
  { group: 'Mapping', columns: MAPPING_COLUMNS },
  { group: 'Identity', columns: IDENTITY_COLUMNS },
  { group: 'Timestamps', columns: TIMESTAMP_COLUMNS },
] as const;

const HIDDEN_COLS_KEY = 'blockdata-catalog-temp-hidden-cols';

function readHiddenColumns(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_COLS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr.filter((k) => typeof k === 'string'));
  } catch {
    return new Set();
  }
}

function persistHiddenColumns(hidden: Set<string>) {
  try {
    localStorage.setItem(HIDDEN_COLS_KEY, JSON.stringify([...hidden]));
  } catch { /* ignore */ }
}

/* ── Filter hidden columns ── */

function filterColumns(
  cols: Column<CatalogRow, SummaryRow>[],
  hidden: Set<string>,
): Column<CatalogRow, SummaryRow>[] {
  return hidden.size === 0 ? cols : cols.filter((c) => !hidden.has(c.key));
}

function buildInitialColumns(hidden: Set<string>): readonly ColumnOrColumnGroup<CatalogRow, SummaryRow>[] {
  return [
    ROW_NUMBER_COLUMN as ColumnOrColumnGroup<CatalogRow, SummaryRow>,
    SelectColumn as Column<CatalogRow, SummaryRow>,
    { name: 'Plugin', headerCellClass: 'catalog-rdg-group-header', children: filterColumns(PLUGIN_COLUMNS, hidden) },
    { name: 'Task', headerCellClass: 'catalog-rdg-group-header', children: filterColumns(TASK_COLUMNS, hidden) },
    { name: 'Config', headerCellClass: 'catalog-rdg-group-header', children: filterColumns(CONFIG_COLUMNS, hidden) },
    { name: 'Mapping', headerCellClass: 'catalog-rdg-group-header', children: filterColumns(MAPPING_COLUMNS, hidden) },
    { name: 'Identity', headerCellClass: 'catalog-rdg-group-header', children: filterColumns(IDENTITY_COLUMNS, hidden) },
    { name: 'Timestamps', headerCellClass: 'catalog-rdg-group-header', children: filterColumns(TIMESTAMP_COLUMNS, hidden) },
  ].filter((g) => !('children' in g) || (g.children as unknown[]).length > 0);
}

/* ── Flat column list for TreeDataGrid (no groups) ── */

function buildFlatColumns(hidden: Set<string>): readonly Column<CatalogRow, SummaryRow>[] {
  return [
    ROW_NUMBER_COLUMN,
    SelectColumn as Column<CatalogRow, SummaryRow>,
    ...filterColumns(PLUGIN_COLUMNS, hidden),
    ...filterColumns(TASK_COLUMNS, hidden),
    ...filterColumns(CONFIG_COLUMNS, hidden),
    ...filterColumns(MAPPING_COLUMNS, hidden),
    ...filterColumns(IDENTITY_COLUMNS, hidden),
    ...filterColumns(TIMESTAMP_COLUMNS, hidden),
  ];
}

/* ── Column reorder helper ── */

function reorderColumns(
  cols: readonly ColumnOrColumnGroup<CatalogRow, SummaryRow>[],
  sourceKey: string,
  targetKey: string,
): readonly ColumnOrColumnGroup<CatalogRow, SummaryRow>[] {
  // Flatten to find indices, then reorder within groups
  const result = cols.map((colOrGroup) => {
    if ('children' in colOrGroup && colOrGroup.children) {
      const children = [...colOrGroup.children];
      const srcIdx = children.findIndex((c) => 'key' in c && c.key === sourceKey);
      const tgtIdx = children.findIndex((c) => 'key' in c && c.key === targetKey);
      if (srcIdx >= 0 && tgtIdx >= 0 && srcIdx !== tgtIdx) {
        const [moved] = children.splice(srcIdx, 1);
        children.splice(tgtIdx, 0, moved);
        return { ...colOrGroup, children };
      }
    }
    return colOrGroup;
  });
  return result;
}

/* ── Component ── */

export function IntegrationCatalogPanelTemp() {
  const gridRef = useRef<DataGridHandle>(null);
  const columnPickerRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);
  const [selectedRows, setSelectedRows] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => readPersistedWidths());
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => readHiddenColumns());
  const [columns, setColumns] = useState(() => buildInitialColumns(hiddenColumns));
  const [groupByPlugin, setGroupByPlugin] = useState(false);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [expandedGroupIds, setExpandedGroupIds] = useState<ReadonlySet<unknown>>(() => new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  /* ── Close column picker on outside click ── */
  useEffect(() => {
    if (!showColumnPicker) return;
    function handleClick(e: MouseEvent) {
      if (columnPickerRef.current && !columnPickerRef.current.contains(e.target as Node)) {
        setShowColumnPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showColumnPicker]);

  /* ── Persist column widths ── */
  useEffect(() => {
    persistWidths(columnWidths);
  }, [columnWidths]);

  /* ── Load data ── */
  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from('integration_catalog_items_temp')
        .select(LIGHT_SELECT)
        .order('plugin_group', { ascending: true })
        .order('task_class', { ascending: true });
      if (e) throw new Error(e.message);
      setRows((data as unknown as CatalogRow[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  /* ── Filter ── */
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.task_class, r.task_title ?? '', r.task_description ?? '', r.plugin_name, r.plugin_group ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);

  /* ── Sort ── */
  const sortedRows = useMemo(() => {
    if (sortColumns.length === 0) return filteredRows;
    const sorted = [...filteredRows];
    sorted.sort((a, b) => {
      for (const { columnKey, direction } of sortColumns) {
        const cmp = getComparator(columnKey)(a, b);
        if (cmp !== 0) return direction === 'ASC' ? cmp : -cmp;
      }
      return 0;
    });
    return sorted;
  }, [filteredRows, sortColumns]);

  /* ── Reset page when data changes ── */
  useEffect(() => {
    setPage(1);
  }, [search, sortColumns]);

  /* ── Paginate ── */
  const pageSlice = useMemo(
    () => paginateRows(sortedRows, page, pageSize),
    [sortedRows, page, pageSize],
  );

  /* ── Summary rows (computed from full filtered set, not just current page) ── */
  const summaryRows = useMemo((): readonly SummaryRow[] => {
    const plugins = new Set<string>();
    const groups = new Set<string>();
    let enabledCount = 0;
    for (const r of sortedRows) {
      plugins.add(r.plugin_name);
      if (r.plugin_group) groups.add(r.plugin_group);
      if (r.enabled) enabledCount++;
    }
    return [
      {
        totalRows: sortedRows.length,
        enabledCount,
        distinctPlugins: plugins.size,
        distinctGroups: groups.size,
      },
    ];
  }, [sortedRows]);

  /* ── Handlers ── */

  const handleColumnWidthsChange = useCallback((next: ColumnWidths) => {
    setColumnWidths(new Map(next));
  }, []);

  const handleRowsChange = useCallback(
    (nextRows: CatalogRow[], { indexes, column }: RowsChangeData<CatalogRow, SummaryRow>) => {
      const prev = rows;
      setRows(nextRows);
      // Persist editable changes to Supabase
      for (const idx of indexes) {
        const newRow = nextRows[idx];
        const oldRow = prev.find((r) => r.item_id === newRow.item_id);
        if (!oldRow) continue;
        const key = column.key as keyof CatalogRow;
        if (!EDITABLE_KEYS.has(key)) continue;
        const update: Record<string, unknown> = { [key]: newRow[key] };
        void supabase
          .from('integration_catalog_items_temp')
          .update(update)
          .eq('item_id', newRow.item_id)
          .then(({ error: e }) => {
            if (e) {
              setError(`Save failed: ${e.message}`);
              // Rollback
              setRows((cur) => cur.map((r) => (r.item_id === oldRow.item_id ? oldRow : r)));
            }
          });
      }
    },
    [rows],
  );

  function handleFill({ columnKey, sourceRow, targetRow }: FillEvent<CatalogRow>): CatalogRow {
    if (!EDITABLE_KEYS.has(columnKey)) return targetRow;
    return { ...targetRow, [columnKey]: (sourceRow as Record<string, unknown>)[columnKey] };
  }

  function handleCellCopy(args: CellCopyArgs<CatalogRow, SummaryRow>, event: React.ClipboardEvent<HTMLDivElement>) {
    const text = getCellTextValue(args.row, args.column.key);
    event.clipboardData.setData('text/plain', text);
    event.preventDefault();
  }

  function handleCellPaste(args: CellPasteArgs<CatalogRow, SummaryRow>, event: React.ClipboardEvent<HTMLDivElement>): CatalogRow {
    const key = args.column.key;
    if (!EDITABLE_KEYS.has(key)) return args.row;
    const text = event.clipboardData.getData('text/plain');
    if (key === 'enabled') {
      return { ...args.row, enabled: text.trim().toLowerCase() === 'true' };
    }
    return { ...args.row, [key]: text };
  }

  const handleColumnsReorder = useCallback(
    (sourceKey: string, targetKey: string) => {
      setColumns((prev) => reorderColumns(prev, sourceKey, targetKey));
    },
    [],
  );

  /* ── Rebuild columns when visibility changes ── */
  useEffect(() => {
    setColumns(buildInitialColumns(hiddenColumns));
    persistHiddenColumns(hiddenColumns);
  }, [hiddenColumns]);

  /* ── Flat columns for TreeDataGrid mode ── */
  const flatColumns = useMemo(() => buildFlatColumns(hiddenColumns), [hiddenColumns]);

  /* ── Shared grid props ── */
  const sharedProps = {
    ref: gridRef,
    rows: pageSlice.rows,
    rowKeyGetter,
    columnWidths,
    onColumnWidthsChange: handleColumnWidthsChange,
    selectedRows,
    onSelectedRowsChange: setSelectedRows as (selectedRows: Set<string>) => void,
    sortColumns,
    onSortColumnsChange: setSortColumns,
    onRowsChange: handleRowsChange,
    onCellCopy: handleCellCopy,
    onCellPaste: handleCellPaste,
    onColumnsReorder: handleColumnsReorder,
    enableVirtualization: true,
    bottomSummaryRows: summaryRows,
    className: 'catalog-rdg h-full',
    rowClass: getRowClass,
    direction: 'ltr' as const,
    'aria-label': 'Integration catalog items',
    defaultColumnOptions: { resizable: true, sortable: true, draggable: true },
    renderers: {
      renderCheckbox: RdgCheckbox,
      renderSortStatus: customRenderSortStatus,
      noRowsFallback: (
        <div className="p-4 text-muted-foreground">
          {loading ? 'Loading...' : 'No rows match filter.'}
        </div>
      ),
    },
  } as const;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex shrink-0 items-center gap-2 pb-2">
        <input
          className="h-7 w-64 rounded border border-input bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          placeholder="Filter..."
        />
        <button
          type="button"
          className={`h-7 rounded border px-2 text-xs transition-colors ${groupByPlugin ? 'border-primary bg-primary/10 text-primary' : 'border-input bg-background text-muted-foreground hover:text-foreground'}`}
          onClick={() => setGroupByPlugin((v) => !v)}
        >
          Group by plugin
        </button>
        <div ref={columnPickerRef} className="relative">
          <button
            type="button"
            className={`h-7 rounded border px-2 text-xs transition-colors ${showColumnPicker ? 'border-primary bg-primary/10 text-primary' : 'border-input bg-background text-muted-foreground hover:text-foreground'}`}
            onClick={() => setShowColumnPicker((v) => !v)}
          >
            Columns{hiddenColumns.size > 0 ? ` (${hiddenColumns.size} hidden)` : ''}
          </button>
          {showColumnPicker && (
            <div className="absolute left-0 top-full z-50 mt-1 max-h-80 w-64 overflow-y-auto rounded border border-input bg-background p-2 shadow-lg">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Columns</span>
                <div className="flex gap-2">
                  {hiddenColumns.size > 0 && (
                    <button
                      type="button"
                      className="text-[10px] text-primary hover:underline"
                      onClick={() => setHiddenColumns(new Set())}
                    >
                      Show all
                    </button>
                  )}
                </div>
              </div>
              {ALL_COLUMN_GROUPS.map(({ group, columns: cols }) => (
                <div key={group} className="mt-1.5">
                  <span className="text-[10px] font-medium text-muted-foreground">{group}</span>
                  {cols.map((col) => (
                    <div key={col.key} className="flex items-center gap-1.5 py-0.5 text-xs hover:text-foreground">
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <input
                          type="checkbox"
                          className="accent-primary"
                          checked={!hiddenColumns.has(col.key)}
                          onChange={(e) => {
                            setHiddenColumns((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) {
                                next.delete(col.key);
                              } else {
                                next.add(col.key);
                              }
                              return next;
                            });
                          }}
                        />
                        <span className={hiddenColumns.has(col.key) ? 'text-muted-foreground' : ''}>{col.name}</span>
                      </label>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        {selectedRows.size > 0 && (
          <button
            type="button"
            className="h-7 rounded border border-destructive/40 bg-destructive/10 px-2 text-xs text-destructive hover:bg-destructive/20 transition-colors"
            onClick={async () => {
              const ids = [...selectedRows];
              const { error: e } = await supabase
                .from('integration_catalog_items_temp')
                .delete()
                .in('item_id', ids);
              if (e) {
                setError(`Delete failed: ${e.message}`);
                return;
              }
              setRows((cur) => cur.filter((r) => !selectedRows.has(r.item_id)));
              setSelectedRows(new Set());
            }}
          >
            Delete {selectedRows.size} row{selectedRows.size > 1 ? 's' : ''}
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {pageSlice.start}–{pageSlice.end} of {sortedRows.length}{rows.length !== sortedRows.length ? ` (${rows.length} total)` : ''}
          {selectedRows.size > 0 ? ` · ${selectedRows.size} selected` : ''}
        </span>
        {loading && <span className="text-xs text-muted-foreground">loading...</span>}
        <select
          className="h-7 rounded border border-input bg-background px-1 text-xs text-foreground"
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>{n} / page</option>
          ))}
        </select>
        {pageSlice.totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="h-7 rounded border border-input bg-background px-2 text-xs disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </button>
            <span className="text-xs text-muted-foreground">
              {pageSlice.page}/{pageSlice.totalPages}
            </span>
            <button
              type="button"
              className="h-7 rounded border border-input bg-background px-2 text-xs disabled:opacity-40"
              disabled={page >= pageSlice.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="shrink-0 rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {error}
        </p>
      )}

      {/* ── Grid ── */}
      <div className="min-h-0 flex-1">
        {groupByPlugin ? (
          <TreeDataGrid<CatalogRow, SummaryRow, string>
            {...sharedProps}
            columns={flatColumns}
            groupBy={['plugin_name']}
            rowGrouper={rowGrouper}
            expandedGroupIds={expandedGroupIds}
            onExpandedGroupIdsChange={setExpandedGroupIds}
          />
        ) : (
          <DataGrid<CatalogRow, SummaryRow, string>
            {...sharedProps}
            columns={columns}
            onFill={handleFill}
            isRowSelectionDisabled={isRowSelectionDisabled}
          />
        )}
      </div>
    </div>
  );
}
