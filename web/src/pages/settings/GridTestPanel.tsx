import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DataGrid,
  TreeDataGrid,
  SelectColumn,
  renderSortIcon,
  renderSortPriority,
  type Column,
  type ColumnOrColumnGroup,
  type ColumnWidths,
  type DataGridHandle,
  type RenderSortStatusProps,
  type RowsChangeData,
  type SortColumn,
  type CellKeyDownArgs,
  type CellKeyboardEvent,
  type RenderGroupCellProps,
} from 'react-data-grid';
import type { Key } from 'react';
import catalogData from '@/data/integrations.json';
import { ScrollArea } from '@/components/ui/scroll-area';
import { paginateRows, PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from './pagination';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TaskSchema = {
  outputs?: Record<string, unknown>;
  properties?: Record<string, unknown>;
  definitions?: Record<string, unknown>;
};

type CatalogItemRow = {
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
  task_schema: TaskSchema | null;
  task_markdown: string | null;
  enabled: boolean;
  mapped_service_id: string | null;
  mapped_function_id: string | null;
  mapping_notes: string | null;
  source_updated_at: string | null;
  created_at: string | null;
};

type SummaryRow = {
  id?: 'top-summary' | 'bottom-summary';
  totalCount: number;
  filteredCount?: number;
  withSchema: number;
  withMarkdown: number;
  enabledCount: number;
  isFiltered?: boolean;
};


type MasterRow = CatalogItemRow & { type: 'MASTER'; expanded: boolean };
type DetailRow = { type: 'DETAIL'; id: string; parentId: string; parentRow: CatalogItemRow };
type CatalogRow = MasterRow | DetailRow;

function isMaster(row: CatalogRow): row is MasterRow {
  return row.type === 'MASTER';
}



/* ------------------------------------------------------------------ */
/*  Sidebar sections                                                   */
/* ------------------------------------------------------------------ */


/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function truncate(value: string | null, max = 80): string {
  if (!value) return '';
  return value.length <= max ? value : `${value.slice(0, max)}...`;
}

/** The real input properties live at task_schema.properties.properties (nested). */
function schemaInputProps(schema: TaskSchema | null): Record<string, Record<string, unknown>> {
  const outer = schema?.properties as Record<string, unknown> | undefined;
  const inner = outer?.properties;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    return inner as Record<string, Record<string, unknown>>;
  }
  return {};
}

/* ------------------------------------------------------------------ */
/*  Sort                                                               */
/* ------------------------------------------------------------------ */

function getComparator(sortColumn: string): (a: CatalogItemRow, b: CatalogItemRow) => number {
  switch (sortColumn) {
    case 'task_schema':
      return (a, b) => {
        const ak = Object.keys(schemaInputProps(a.task_schema)).length;
        const bk = Object.keys(schemaInputProps(b.task_schema)).length;
        return ak - bk;
      };
    case 'task_markdown':
      return (a, b) => {
        const av = !!a.task_markdown;
        const bv = !!b.task_markdown;
        return av === bv ? 0 : av ? -1 : 1;
      };
    case 'enabled':
      return (a, b) => {
        return a.enabled === b.enabled ? 0 : a.enabled ? -1 : 1;
      };
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

/* ------------------------------------------------------------------ */
/*  Column width persistence                                           */
/* ------------------------------------------------------------------ */

const COL_WIDTHS_KEY = 'blockdata-catalog-primary-col-widths';

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
  } catch { /* storage full */ }
}


/* ------------------------------------------------------------------ */
/*  Renderers                                                          */
/* ------------------------------------------------------------------ */

function customRenderSortStatus({ sortDirection, priority }: RenderSortStatusProps) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
      {renderSortIcon({ sortDirection })}
      {renderSortPriority({ priority })}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  CSV Export                                                         */
/* ------------------------------------------------------------------ */

function exportToCsv(gridEl: HTMLDivElement, fileName: string) {
  const head = getGridRows(gridEl, '.rdg-header-row');
  const body = getGridRows(gridEl, '.rdg-row:not(.rdg-summary-row)');
  const foot = getGridRows(gridEl, '.rdg-summary-row');
  const content = [...head, ...body, ...foot]
    .map((cells) => cells.map(serialiseCellValue).join(','))
    .join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function getGridRows(gridEl: HTMLDivElement, selector: string) {
  return Array.from(gridEl.querySelectorAll<HTMLDivElement>(selector)).map((gridRow) =>
    Array.from(gridRow.querySelectorAll<HTMLDivElement>('.rdg-cell')).map((c) => c.innerText),
  );
}

function serialiseCellValue(value: unknown) {
  if (typeof value === 'string') {
    const f = value.replace(/"/g, '""');
    return f.includes(',') ? `"${f}"` : f;
  }
  return value;
}


/** Column header with Kestra field name in amber */
function KestraHeader({ label, field }: { label: string; field: string }) {
  return (
    <div>
      <div>{label}</div>
      <div className="text-[10px] tracking-wide text-amber-600 dark:text-amber-400">{field}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Detail row panel (master-detail expand)                            */
/* ------------------------------------------------------------------ */

function downloadBlob(content: string, filename: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function DetailPanel({ row }: { row: CatalogItemRow }) {
  const inputProps = schemaInputProps(row.task_schema);
  const propEntries = Object.entries(inputProps);
  const required = ((row.task_schema?.properties as Record<string, unknown>)?.required as string[]) ?? [];

  const outputOuter = row.task_schema?.outputs as Record<string, unknown> | undefined;
  const outputInner = (outputOuter?.properties ?? {}) as Record<string, Record<string, unknown>>;
  const outputEntries = Object.entries(outputInner);

  const examples = ((row.task_schema?.properties as Record<string, unknown>)?.$examples ?? []) as { title?: string; code: string; lang?: string }[];

  return (
    <ScrollArea className="h-full" viewportClass="p-3">
      <div className="min-w-0 space-y-3">
        {/* Title & Description */}
        {(row.task_title || row.task_description) && (
          <div>
            {row.task_title && (
              <div className="text-xs font-semibold text-foreground">{row.task_title}</div>
            )}
            {row.task_description && (
              <div className="mt-0.5 whitespace-pre-wrap text-[11px] leading-relaxed text-foreground/80">
                {row.task_description}
              </div>
            )}
          </div>
        )}
        {/* Input properties */}
        {propEntries.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Input Properties ({propEntries.length})
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 text-left text-[9px] uppercase tracking-wider text-muted-foreground/60">
                  <th className="pb-0.5 pr-2">Name</th>
                  <th className="pb-0.5 pr-2">Type</th>
                  <th className="pb-0.5 pr-2">Req</th>
                  <th className="pb-0.5 pr-2">Default</th>
                  <th className="pb-0.5">Description</th>
                </tr>
              </thead>
              <tbody>
                {propEntries.map(([k, v]) => (
                  <tr key={k} className="border-b border-border/30">
                    <td className="py-0.5 pr-2 font-mono text-[10px] text-foreground">{k}</td>
                    <td className="py-0.5 pr-2 text-[10px] text-muted-foreground">
                      {(v.type as string) ?? (v.$ref ? 'ref' : '?')}
                    </td>
                    <td className="py-0.5 pr-2 text-[10px]">
                      {required.includes(k) ? <span className="text-orange-400">*</span> : ''}
                    </td>
                    <td className="py-0.5 pr-2 text-[10px] text-muted-foreground/60">
                      {v.default !== undefined ? JSON.stringify(v.default) : ''}
                    </td>
                    <td className="py-0.5 text-[10px] text-muted-foreground/80">
                      {v.description ? truncate(v.description as string, 120) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Outputs */}
        {outputEntries.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Outputs ({outputEntries.length})
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50 text-left text-[9px] uppercase tracking-wider text-muted-foreground/60">
                  <th className="pb-0.5 pr-2">Name</th>
                  <th className="pb-0.5 pr-2">Type</th>
                  <th className="pb-0.5">Description</th>
                </tr>
              </thead>
              <tbody>
                {outputEntries.map(([k, v]) => (
                  <tr key={k} className="border-b border-border/30">
                    <td className="py-0.5 pr-2 font-mono text-[10px] text-foreground">{k}</td>
                    <td className="py-0.5 pr-2 text-[10px] text-muted-foreground">
                      {(v.type as string) ?? '?'}
                    </td>
                    <td className="py-0.5 text-[10px] text-muted-foreground/80">
                      {v.description ? truncate(v.description as string, 120) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {propEntries.length === 0 && outputEntries.length === 0 && (
          <div className="text-xs text-muted-foreground/40">No schema data.</div>
        )}

        {/* YAML examples */}
        {examples.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Examples ({examples.length})
            </div>
            {examples.map((ex, i) => (
              <div key={i} className="mb-2">
                {ex.title && (
                  <div className="mb-0.5 text-[10px] text-foreground/70">{ex.title}</div>
                )}
                <pre className="max-h-40 overflow-auto rounded border border-border/40 bg-muted/30 p-2 font-mono text-[10px] leading-relaxed text-foreground/80">
                  {ex.code}
                </pre>
              </div>
            ))}
          </div>
        )}

      </div>
    </ScrollArea>
  );
}


/* ------------------------------------------------------------------ */
/*  Context Menu                                                       */
/* ------------------------------------------------------------------ */

type ContextMenuState = {
  row: CatalogRow;
  top: number;
  left: number;
} | null;

function CatalogContextMenu({
  state,
  onClose,
  onDeleteRow,
}: {
  state: NonNullable<ContextMenuState>;
  onClose: () => void;
  onDeleteRow: (id: string) => void;
}) {
  const menuRef = useRef<HTMLMenuElement>(null);

  useLayoutEffect(() => {
    function onMouseDown(event: MouseEvent) {
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) return;
      onClose();
    }
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [onClose]);

  const masterRow: CatalogItemRow = state.row.type === 'MASTER' ? state.row : state.row.parentRow;

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    onClose();
  }

  return createPortal(
    <menu
      ref={menuRef}
      className="fixed z-50 min-w-52 rounded-md border border-border bg-popover p-1 shadow-md"
      style={{ top: state.top, left: state.left }}
    >
      <li>
        <button
          type="button"
          className="flex w-full items-center rounded-sm px-2 py-1.5 text-xs text-popover-foreground hover:bg-accent"
          onClick={() => copyText(masterRow.task_class)}
        >
          Copy task class
        </button>
      </li>
      <li>
        <button
          type="button"
          className="flex w-full items-center rounded-sm px-2 py-1.5 text-xs text-popover-foreground hover:bg-accent"
          onClick={() => copyText(masterRow.plugin_name)}
        >
          Copy plugin name
        </button>
      </li>
      <li>
        <button
          type="button"
          className="flex w-full items-center rounded-sm px-2 py-1.5 text-xs text-popover-foreground hover:bg-accent"
          onClick={() => copyText(JSON.stringify(masterRow, null, 2))}
        >
          Copy row as JSON
        </button>
      </li>
      <li>
        <button
          type="button"
          className="flex w-full items-center rounded-sm px-2 py-1.5 text-xs text-popover-foreground hover:bg-accent"
          onClick={() => copyText(masterRow.item_id)}
        >
          Copy item ID
        </button>
      </li>
      {masterRow.task_description && (
        <li>
          <button
            type="button"
            className="flex w-full items-center rounded-sm px-2 py-1.5 text-xs text-popover-foreground hover:bg-accent"
            onClick={() => copyText(masterRow.task_description!)}
          >
            Copy description
          </button>
        </li>
      )}
      <li role="separator" className="my-1 h-px bg-border" />
      <li>
        <button
          type="button"
          className="flex w-full items-center rounded-sm px-2 py-1.5 text-xs text-red-400 hover:bg-accent"
          onClick={() => { onDeleteRow(masterRow.item_id); onClose(); }}
        >
          Delete row
        </button>
      </li>
    </menu>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/*  Row grouper (for TreeDataGrid)                                     */
/* ------------------------------------------------------------------ */

function rowGrouper(rows: readonly CatalogItemRow[], columnKey: string): Record<string, readonly CatalogItemRow[]> {
  const groups: Record<string, CatalogItemRow[]> = {};
  for (const row of rows) {
    let key: string;
    if (columnKey === 'categories') {
      key = (row.categories ?? []).join(', ') || '(no category)';
    } else {
      const val = (row as Record<string, unknown>)[columnKey];
      key = val == null ? '(empty)' : String(val);
    }
    (groups[key] ??= []).push(row);
  }
  return groups;
}

/* ------------------------------------------------------------------ */
/*  Columns — master-detail mode                                       */
/* ------------------------------------------------------------------ */

const FLAT_COLUMN_KEYS = [
  'select-row', 'plugin_title', 'task_class', 'item_id', 'task_title', 'plugin_group',
  'categories', 'task_schema', 'downloads',
  'created_at',
] as const;

/** colSpan from task_schema to the last column (everything after schema) */
const SCHEMA_COL_INDEX = FLAT_COLUMN_KEYS.indexOf('task_schema');
const DETAIL_COLSPAN = FLAT_COLUMN_KEYS.length - SCHEMA_COL_INDEX;

function buildMasterDetailColumns(): readonly ColumnOrColumnGroup<CatalogRow, SummaryRow>[] {
  return [
    {
      ...SelectColumn,
      frozen: true,
      renderCell(props) {
        if (props.row.type === 'DETAIL') return null;
        return SelectColumn.renderCell!(props as never);
      },
    } as Column<CatalogRow, SummaryRow>,
    /* ---- Plugin first, then task columns ---- */
    {
      key: 'plugin_title',
      name: 'Plugin',
      width: 100,
      frozen: true,
      draggable: false,
      renderHeaderCell: () => <KestraHeader label="Plugin" field="plugin_title" />,
      renderCell: ({ row }) => isMaster(row) ? (row.plugin_title ?? '') : null,
      renderSummaryCell: ({ row }) =>
        row.id === 'top-summary'
          ? <span className="text-[10px] text-muted-foreground">{row.isFiltered ? `${row.filteredCount} of ${row.totalCount}` : `${row.totalCount} items`}</span>
          : <strong className="text-[10px]">Totals</strong>,
    },
    {
      key: 'task_class',
      name: 'Class',
      width: 320,
      renderHeaderCell: () => <KestraHeader label="Class" field="task_class" />,
      renderCell({ row }) {
        if (row.type === 'DETAIL') return null;
        return row.task_class;
      },
      renderSummaryCell: ({ row }) =>
        row.id === 'top-summary'
          ? <span className="text-[10px] text-muted-foreground">{row.isFiltered ? 'filtered' : 'all'}</span>
          : <span className="text-[10px]">{row.totalCount} rows</span>,
    },
    {
      key: 'item_id',
      name: 'ID',
      width: 290,
      renderHeaderCell: () => <KestraHeader label="ID" field="item_id" />,
      renderCell: ({ row }) =>
        isMaster(row)
          ? <span className="font-mono text-[11px] text-muted-foreground/60">{row.item_id}</span>
          : null,
    },
    {
      key: 'task_title',
      name: 'Title',
      width: 220,
      renderHeaderCell: () => <KestraHeader label="Title" field="task_title" />,
      renderCell: ({ row }) => isMaster(row) ? (row.task_title ?? '') : null,
    },
    {
      key: 'plugin_group',
      name: 'Group',
      width: 200,
      renderHeaderCell: () => <KestraHeader label="Group" field="plugin_group" />,
      renderCell: ({ row }) => isMaster(row) ? (row.plugin_group ?? '') : null,
    },
    {
      key: 'categories',
      name: 'Categories',
      width: 140,
      renderHeaderCell: () => <KestraHeader label="Categories" field="categories" />,
      renderCell: ({ row }) => isMaster(row) ? (row.categories ?? []).join(', ') : null,
    },
    /* ---- Schema (detail pulldown host) ---- */
    {
      key: 'task_schema',
      name: 'Schema',
      width: 260,
      renderHeaderCell: () => <KestraHeader label="Schema" field="task_schema" />,
      colSpan(args) {
        if (args.type === 'ROW' && args.row.type === 'DETAIL') return DETAIL_COLSPAN;
        return undefined;
      },
      cellClass(row) {
        return row.type === 'DETAIL' ? 'catalog-detail-cell' : undefined;
      },
      renderCell({ row }) {
        if (row.type === 'DETAIL') return <DetailPanel row={row.parentRow} />;
        if (!isMaster(row)) return null;
        if (!row.task_schema) return <span className="text-muted-foreground/40">—</span>;
        const names = Object.keys(schemaInputProps(row.task_schema));
        return <span className="text-[10px] text-foreground/80">{names.join(', ')}</span>;
      },
      renderSummaryCell: ({ row }) => (
        <span className="text-[10px]">{row.withSchema} w/ schema</span>
      ),
    },
    {
      key: 'downloads',
      name: 'Downloads',
      width: 180,
      sortable: false,
      renderHeaderCell: () => <KestraHeader label="Downloads" field="" />,
      renderCell: ({ row }) => {
        if (!isMaster(row)) return null;
        const slug = row.task_class.split('.').pop() ?? row.task_class;
        const examples = ((row.task_schema?.properties as Record<string, unknown>)?.$examples ?? []) as { title?: string; code: string }[];
        return (
          <span className="flex items-center gap-1">
            {row.task_markdown && (
              <button type="button" className="rounded border border-border px-1.5 py-0.5 text-[9px] hover:bg-muted" onClick={(e) => { e.stopPropagation(); downloadBlob(row.task_markdown!, `${slug}.md`, 'text/markdown'); }}>.md</button>
            )}
            {row.task_schema && (
              <button type="button" className="rounded border border-border px-1.5 py-0.5 text-[9px] hover:bg-muted" onClick={(e) => { e.stopPropagation(); downloadBlob(JSON.stringify(row.task_schema, null, 2), `${slug}-schema.json`, 'application/json'); }}>json</button>
            )}
            {examples.length > 0 && (
              <button type="button" className="rounded border border-border px-1.5 py-0.5 text-[9px] hover:bg-muted" onClick={(e) => { e.stopPropagation(); downloadBlob(examples.map((ex) => `# ${ex.title ?? 'Example'}\n${ex.code}`).join('\n\n---\n\n'), `${slug}-examples.yaml`, 'text/yaml'); }}>yaml</button>
            )}
          </span>
        );
      },
    },
    /* ---- Timestamps ---- */
    {
      key: 'created_at',
      name: 'Created',
      width: 140,
      renderHeaderCell: () => <KestraHeader label="Created" field="created_at" />,
      renderCell: ({ row }) =>
        isMaster(row) && row.created_at
          ? <span className="text-[10px]">{new Date(row.created_at).toLocaleDateString()}</span>
          : null,
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Columns — grouped mode (flat CatalogItemRow, no detail rows)       */
/* ------------------------------------------------------------------ */

function buildGroupedColumns(): readonly ColumnOrColumnGroup<CatalogItemRow, SummaryRow>[] {
  return [
    { ...SelectColumn, frozen: true } as Column<CatalogItemRow, SummaryRow>,
    /* ---- Plugin first, then task columns ---- */
    {
      key: 'plugin_title',
      name: 'Plugin',
      width: 100,
      frozen: true,
      draggable: false,
      renderGroupCell: ({ childRows, toggleGroup, isExpanded }: RenderGroupCellProps<CatalogItemRow, SummaryRow>) => (
        <span className="cursor-pointer" onClick={toggleGroup}>
          {isExpanded ? '\u25BC' : '\u25B6'} {childRows.length} items
        </span>
      ),
      renderSummaryCell: ({ row }) =>
        row.id === 'top-summary'
          ? <span className="text-[10px] text-muted-foreground">{row.isFiltered ? `${row.filteredCount} of ${row.totalCount}` : `${row.totalCount} items`}</span>
          : <strong className="text-[10px]">Totals</strong>,
    },
    {
      key: 'task_class',
      name: 'Class',
      width: 320,
      renderHeaderCell: () => <KestraHeader label="Class" field="task_class" />,
      renderSummaryCell: ({ row }) =>
        row.id === 'top-summary'
          ? <span className="text-[10px] text-muted-foreground">{row.isFiltered ? 'filtered' : 'all'}</span>
          : <span className="text-[10px]">{row.totalCount} rows</span>,
    },
    {
      key: 'item_id',
      name: 'ID',
      width: 290,
      renderHeaderCell: () => <KestraHeader label="ID" field="item_id" />,
      renderCell: ({ row }) => (
        <span className="font-mono text-[11px] text-muted-foreground/60">{row.item_id}</span>
      ),
    },
    { key: 'task_title', name: 'Title', width: 220 },
    {
      key: 'plugin_group',
      name: 'Group',
      width: 200,
      renderHeaderCell: () => <KestraHeader label="Group" field="plugin_group" />,
    },
    {
      key: 'categories',
      name: 'Categories',
      width: 140,
      renderHeaderCell: () => <KestraHeader label="Categories" field="categories" />,
      renderCell: ({ row }) => (row.categories ?? []).join(', '),
    },
    {
      key: 'task_schema',
      name: 'Schema',
      width: 260,
      renderCell: ({ row }) =>
        row.task_schema
          ? <span className="text-emerald-600 dark:text-emerald-400">yes</span>
          : <span className="text-muted-foreground/40">—</span>,
      renderSummaryCell: ({ row }) => (
        <span className="text-[10px]">{row.withSchema} w/ schema</span>
      ),
    },
    {
      key: 'downloads',
      name: 'Downloads',
      width: 180,
      sortable: false,
      renderCell: ({ row }) => {
        const slug = row.task_class.split('.').pop() ?? row.task_class;
        const examples = ((row.task_schema?.properties as Record<string, unknown>)?.$examples ?? []) as { title?: string; code: string }[];
        return (
          <span className="flex items-center gap-1">
            {row.task_markdown && (
              <button type="button" className="rounded border border-border px-1.5 py-0.5 text-[9px] hover:bg-muted" onClick={(e) => { e.stopPropagation(); downloadBlob(row.task_markdown!, `${slug}.md`, 'text/markdown'); }}>.md</button>
            )}
            {row.task_schema && (
              <button type="button" className="rounded border border-border px-1.5 py-0.5 text-[9px] hover:bg-muted" onClick={(e) => { e.stopPropagation(); downloadBlob(JSON.stringify(row.task_schema, null, 2), `${slug}-schema.json`, 'application/json'); }}>json</button>
            )}
            {examples.length > 0 && (
              <button type="button" className="rounded border border-border px-1.5 py-0.5 text-[9px] hover:bg-muted" onClick={(e) => { e.stopPropagation(); downloadBlob(examples.map((ex) => `# ${ex.title ?? 'Example'}\n${ex.code}`).join('\n\n---\n\n'), `${slug}-examples.yaml`, 'text/yaml'); }}>yaml</button>
            )}
          </span>
        );
      },
    },
    /* ---- Timestamps ---- */
    {
      key: 'created_at',
      name: 'Created',
      width: 140,
      renderCell: ({ row }) =>
        row.created_at
          ? <span className="text-[10px]">{new Date(row.created_at).toLocaleDateString()}</span>
          : null,
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Main panel                                                         */
/* ------------------------------------------------------------------ */

const INITIAL_ITEMS = (catalogData as unknown as CatalogItemRow[]).map((item) => ({ ...item }));

export function GridTestPanel() {
  const [items, setItems] = useState<CatalogItemRow[]>(() => INITIAL_ITEMS.map((item) => ({ ...item })));
  const gridRef = useRef<DataGridHandle>(null);
  const gridWrapperRef = useRef<HTMLDivElement>(null);

  /* ---- State ---- */
  const [search, setSearch] = useState('');

  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => readPersistedWidths());
  const [selectedRows, setSelectedRows] = useState<Set<Key>>(() => new Set());
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [expandedGroupIds, setExpandedGroupIds] = useState<ReadonlySet<unknown>>(() => new Set());
  const [jumpToRow, setJumpToRow] = useState('');

  const isGrouped = false;

  /* ---- Columns ---- */
  const rawMasterDetailColumns = useMemo(
    () => buildMasterDetailColumns(),
    [],
  );
  const rawGroupedColumns = useMemo(
    () => buildGroupedColumns(),
    [],
  );

  /* ---- Column order (for drag reorder) ---- */
  const [columnOrder, setColumnOrder] = useState<string[]>(() => [...FLAT_COLUMN_KEYS]);

  const masterDetailColumns = useMemo(() => {
    const byKey = new Map(rawMasterDetailColumns.map((c) => ['key' in c ? c.key : '', c]));
    return columnOrder.map((k) => byKey.get(k)).filter(Boolean) as typeof rawMasterDetailColumns[number][];
  }, [rawMasterDetailColumns, columnOrder]);

  const groupedColumns = useMemo(() => {
    const byKey = new Map(rawGroupedColumns.map((c) => ['key' in c ? c.key : '', c]));
    return columnOrder.map((k) => byKey.get(k)).filter(Boolean) as typeof rawGroupedColumns[number][];
  }, [rawGroupedColumns, columnOrder]);

  const handleColumnsReorder = useCallback((sourceKey: string, targetKey: string) => {
    setColumnOrder((prev) => {
      const next = [...prev];
      const srcIdx = next.indexOf(sourceKey);
      const tgtIdx = next.indexOf(targetKey);
      if (srcIdx === -1 || tgtIdx === -1) return prev;
      next.splice(srcIdx, 1);
      next.splice(tgtIdx, 0, sourceKey);
      return next;
    });
  }, []);

  /* ---- Persist column widths ---- */
  useEffect(() => { persistWidths(columnWidths); }, [columnWidths]);

  /* ---- Search filter ---- */
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => {
      const haystack = [
        row.task_class, row.task_title ?? '', row.task_description ?? '',
        row.plugin_name, row.plugin_group ?? '', row.plugin_version ?? '',
        (row.categories ?? []).join(' '),
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search]);

  /* ---- Sort ---- */
  const sortedRows = useMemo(() => {
    if (sortColumns.length === 0) return filteredItems;
    const sorted = [...filteredItems];
    sorted.sort((a, b) => {
      for (const { columnKey, direction } of sortColumns) {
        const cmp = getComparator(columnKey)(a, b);
        if (cmp !== 0) return direction === 'ASC' ? cmp : -cmp;
      }
      return 0;
    });
    return sorted;
  }, [filteredItems, sortColumns]);

  /* ---- Reset page on filter/sort change ---- */
  useEffect(() => { setPage(1); }, [search, sortColumns]);

  /* ---- Paginate source rows (used in flat/master-detail mode) ---- */
  const pageSlice = useMemo(
    () => paginateRows(sortedRows, page, pageSize),
    [sortedRows, page, pageSize],
  );

  /* ---- Master-detail: build display rows with detail rows interleaved ---- */
  const displayRows = useMemo<CatalogRow[]>(() => {
    const result: CatalogRow[] = [];
    for (const item of pageSlice.rows) {
      const isExpanded = expandedIds.has(item.item_id);
      result.push({ ...item, type: 'MASTER' as const, expanded: isExpanded });
      if (isExpanded) {
        result.push({
          type: 'DETAIL' as const,
          id: `detail:${item.item_id}`,
          parentId: item.item_id,
          parentRow: item,
        });
      }
    }
    return result;
  }, [pageSlice.rows, expandedIds]);

  /* ---- Handle row expand/collapse via onRowsChange ---- */
  function handleRowsChange(rows: CatalogRow[], { indexes }: RowsChangeData<CatalogRow>) {
    const row = rows[indexes[0]];
    if (!row || row.type !== 'MASTER') return;

    const prevRow = displayRows[indexes[0]];
    if (prevRow && prevRow.type === 'MASTER' && prevRow.expanded !== row.expanded) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (row.expanded) next.add(row.item_id);
        else next.delete(row.item_id);
        return next;
      });
    }
  }

  const handleColumnWidthsChange = useCallback((next: ColumnWidths) => {
    setColumnWidths(new Map(next));
  }, []);

  /* ---- Copy cell value on Ctrl+C ---- */
  function handleCellCopy(
    { row, column }: { row: CatalogRow | CatalogItemRow; column: { key: string } },
    event: React.ClipboardEvent,
  ) {
    const sourceRow = 'type' in row && row.type === 'DETAIL' ? (row as DetailRow).parentRow : row;
    const val = (sourceRow as Record<string, unknown>)[column.key];
    const text = val == null ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val);
    event.clipboardData.setData('text/plain', text);
    event.preventDefault();
  }

  /* ---- Click row to expand/collapse detail ---- */
  function handleCellClick(args: { row: CatalogRow; column: { key: string } }) {
    if (args.row.type === 'DETAIL') return;
    if (args.column.key === 'select-row') return;
    const id = args.row.item_id;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ---- Keyboard: Escape clears selection/context menu ---- */
  function handleCellKeyDown(_args: CellKeyDownArgs<CatalogRow | CatalogItemRow, SummaryRow>, event: CellKeyboardEvent) {
    if (event.key === 'Escape') {
      setSelectedRows(new Set());
      setContextMenu(null);
    }
    if (event.isDefaultPrevented()) {
      event.preventGridDefault();
    }
  }

  /* ---- Context menu ---- */
  function handleCellContextMenu(
    args: { row: CatalogRow | CatalogItemRow; column: { key: string } },
    event: React.MouseEvent,
  ) {
    (event as unknown as { preventGridDefault: () => void }).preventGridDefault();
    event.preventDefault();
    const row = 'type' in args.row ? args.row as CatalogRow : { ...args.row, type: 'MASTER' as const, expanded: false } as CatalogRow;
    setContextMenu({ row, top: event.clientY, left: event.clientX });
  }

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  /* ---- Row class ---- */
  function masterDetailRowClass(row: CatalogRow, index: number) {
    if (row.type === 'DETAIL') return 'catalog-detail-row';
    const classes: string[] = [];
    if (index % 2 === 1) classes.push('bg-muted/20');
    if (selectedRows.has(row.item_id as Key)) classes.push('!bg-accent/30');
    return classes.join(' ');
  }

  function groupedRowClass(row: CatalogItemRow, index: number) {
    const classes: string[] = [];
    if (index % 2 === 1) classes.push('bg-muted/20');
    if (selectedRows.has(row.item_id as Key)) classes.push('!bg-accent/30');
    return classes.join(' ');
  }

  /* ---- Variable row height for detail rows ---- */
  function getRowHeight(row: CatalogRow) {
    return row.type === 'DETAIL' ? 300 : 28;
  }

  /* ---- Delete rows ---- */
  function handleDeleteRows(ids: Set<string>) {
    setItems((prev) => prev.filter((item) => !ids.has(item.item_id)));
    setExpandedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
    setSelectedRows((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id as Key);
      return next;
    });
  }

  /* ---- Export ---- */
  function handleExportCsv() {
    const el = gridWrapperRef.current?.querySelector<HTMLDivElement>('.rdg');
    if (el) exportToCsv(el, 'integration-catalog.csv');
  }

  /* ---- Scroll helpers ---- */
  function handleScrollToTop() {
    gridRef.current?.scrollToCell({ rowIdx: 0, idx: 0 });
  }

  function handleJumpToRow() {
    const idx = parseInt(jumpToRow, 10);
    if (Number.isNaN(idx) || idx < 1) return;
    const maxRow = isGrouped ? sortedRows.length - 1 : displayRows.length - 1;
    const rowIdx = Math.min(idx - 1, maxRow);
    gridRef.current?.scrollToCell({ rowIdx, idx: 0 });
    setJumpToRow('');
  }

  /* ---- Collapse all ---- */
  function handleCollapseAll() {
    if (isGrouped) setExpandedGroupIds(new Set());
    else setExpandedIds(new Set());
  }

  const hasExpanded = isGrouped ? (expandedGroupIds.size > 0) : (expandedIds.size > 0);

  /* ---- Shared grid props ---- */
  const sharedProps = {
    ref: gridRef,
    columnWidths,
    onColumnWidthsChange: handleColumnWidthsChange,
    sortColumns,
    onSortColumnsChange: setSortColumns,
    selectedRows,
    onSelectedRowsChange: setSelectedRows,
    onCellCopy: handleCellCopy as never,
    onCellKeyDown: handleCellKeyDown as never,
    onCellContextMenu: handleCellContextMenu as never,
    enableVirtualization: true,
    className: 'catalog-rdg h-full',
    headerRowHeight: 52,
    direction: 'ltr' as const,
    'aria-label': 'Integration catalog',
    defaultColumnOptions: { resizable: true, sortable: true, draggable: true },
    onColumnsReorder: handleColumnsReorder,
    renderers: {
      renderSortStatus: customRenderSortStatus,
      noRowsFallback: (
        <div className="p-4 text-muted-foreground">
          No rows match filter.
        </div>
      ),
    },
  };

  /* ---- Render ---- */
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 pb-2">
        <input
          className="h-7 w-64 rounded border border-input bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          placeholder="Search all columns..."
        />
        {hasExpanded && (
          <button
            type="button"
            className="h-7 rounded border border-input bg-background px-2 text-xs text-foreground hover:bg-muted"
            onClick={handleCollapseAll}
          >
            Collapse all
          </button>
        )}
        <button
          type="button"
          className="h-7 rounded border border-input bg-background px-2 text-xs text-foreground hover:bg-muted"
          onClick={handleExportCsv}
        >
          Export CSV
        </button>
        <button
          type="button"
          className="h-7 rounded border border-input bg-background px-2 text-xs text-orange-400 hover:bg-muted"
          onClick={() => {
            localStorage.removeItem(COL_WIDTHS_KEY);
            setColumnWidths(new Map());
          }}
          title="Reset column widths and order to defaults"
        >
          Reset columns
        </button>
        <button
          type="button"
          className="h-7 rounded border border-input bg-background px-2 text-xs text-foreground hover:bg-muted"
          onClick={handleScrollToTop}
          title="Scroll to top"
        >
          &uarr; Top
        </button>
        <div className="flex items-center gap-1">
          <input
            className="h-7 w-16 rounded border border-input bg-background px-1 text-xs text-foreground placeholder:text-muted-foreground"
            value={jumpToRow}
            onChange={(e) => setJumpToRow(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleJumpToRow(); }}
            placeholder="Row #"
            type="number"
            min={1}
          />
          <button
            type="button"
            className="h-7 rounded border border-input bg-background px-2 text-xs text-foreground hover:bg-muted"
            onClick={handleJumpToRow}
          >
            Go
          </button>
        </div>
        {selectedRows.size > 0 && (
          <>
            <span className="text-xs text-accent-foreground">
              {selectedRows.size} selected
            </span>
            <button
              type="button"
              className="h-7 rounded border border-red-400/50 bg-background px-2 text-xs text-red-400 hover:bg-red-400/10"
              onClick={() => { handleDeleteRows(selectedRows as Set<string>); }}
            >
              Delete selected
            </button>
          </>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {isGrouped
            ? `${sortedRows.length} rows`
            : <>{pageSlice.start}&ndash;{pageSlice.end} of {sortedRows.length}{items.length !== sortedRows.length ? ` (${items.length} total)` : ''}</>
          }
        </span>
        {!isGrouped && (
          <>
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
          </>
        )}
      </div>

      {/* Grid */}
      <div className="h-full min-h-0 flex-1" ref={gridWrapperRef}>
        {isGrouped ? (
          <TreeDataGrid<CatalogItemRow, SummaryRow>
            {...sharedProps}
            rows={sortedRows}
            columns={groupedColumns as Column<CatalogItemRow, SummaryRow>[]}
            rowKeyGetter={(row) => row.item_id}
            groupBy={['plugin_title']}
            rowGrouper={rowGrouper}
            expandedGroupIds={expandedGroupIds}
            onExpandedGroupIdsChange={setExpandedGroupIds}
            rowClass={groupedRowClass}
          />
        ) : (
          <DataGrid<CatalogRow, SummaryRow>
            {...sharedProps}
            rows={displayRows}
            columns={masterDetailColumns}
            rowKeyGetter={(row) => row.type === 'DETAIL' ? row.id : row.item_id}
            onRowsChange={handleRowsChange as never}
            onCellClick={handleCellClick as never}
            rowHeight={getRowHeight}
            rowClass={masterDetailRowClass}
          />
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <CatalogContextMenu
          state={contextMenu}
          onClose={closeContextMenu}
          onDeleteRow={(id) => handleDeleteRows(new Set([id]))}
        />
      )}
      </div>{/* /Content */}
    </div>
  );
}
