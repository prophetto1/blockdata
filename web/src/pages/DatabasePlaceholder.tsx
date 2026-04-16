import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconChevronLeft, IconChevronRight, IconDatabase, IconRefresh } from '@tabler/icons-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { edgeFetch } from '@/lib/edge';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { cn } from '@/lib/utils';

type TableCatalogRow = {
  table_schema: string;
  table_name: string;
  column_count: number;
  row_estimate: number | null;
};

type TableColumnRow = {
  ordinal_position: number;
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: boolean;
  column_default: string | null;
};

type TableRowsResponse = {
  table: { table_schema: string; table_name: string };
  columns: TableColumnRow[];
  rows: Record<string, unknown>[];
  total_rows: number;
  limit: number;
  offset: number;
};

type GridDensity = 'compact' | 'cozy' | 'comfortable';

const PAGE_SIZE_OPTIONS = [25, 50, 100, 250];
const CELL_WIDTH_OPTIONS = [280, 420, 640, 900];

function tableKey(row: TableCatalogRow): string {
  return `${row.table_schema}.${row.table_name}`;
}

function parseResponseError(status: number, text: string): string {
  try {
    const parsed = text ? JSON.parse(text) as { error?: string } : {};
    return parsed.error ?? `HTTP ${status}`;
  } catch {
    return text || `HTTP ${status}`;
  }
}

function formatCellValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatEstimate(value: number | null): string {
  if (value === null || Number.isNaN(value)) return 'n/a';
  return new Intl.NumberFormat().format(value);
}

export default function DatabasePlaceholder() {
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [tables, setTables] = useState<TableCatalogRow[]>([]);

  const [selectedTableKey, setSelectedTableKey] = useState('');
  const [tableFilter, setTableFilter] = useState('');

  const [loadingRows, setLoadingRows] = useState(false);
  const [rowsError, setRowsError] = useState<string | null>(null);
  const [columns, setColumns] = useState<TableColumnRow[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [totalRows, setTotalRows] = useState(0);

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [density, setDensity] = useState<GridDensity>('cozy');
  const [wrapCells, setWrapCells] = useState(false);
  const [zebraRows, setZebraRows] = useState(true);
  const [showGridLines, setShowGridLines] = useState(true);
  const [maxCellWidth, setMaxCellWidth] = useState(420);

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    setCatalogError(null);
    try {
      const resp = await edgeFetch('admin-database-browser', { method: 'GET' });
      const text = await resp.text();
      if (!resp.ok) throw new Error(parseResponseError(resp.status, text));

      const payload = text ? JSON.parse(text) as { tables?: TableCatalogRow[] } : {};
      const nextTables = Array.isArray(payload.tables) ? payload.tables : [];
      setTables(nextTables);
      setSelectedTableKey((prev) => {
        if (prev && nextTables.some((row) => tableKey(row) === prev)) return prev;
        if (nextTables.length > 0) return tableKey(nextTables[0]!);
        return '';
      });
    } catch (e) {
      setCatalogError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const filteredTables = useMemo(() => {
    const q = tableFilter.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter((row) => {
      const value = `${row.table_schema}.${row.table_name}`.toLowerCase();
      return value.includes(q);
    });
  }, [tableFilter, tables]);

  const selectedTable = useMemo(() => (
    tables.find((row) => tableKey(row) === selectedTableKey) ?? null
  ), [selectedTableKey, tables]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalRows / pageSize)), [pageSize, totalRows]);

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const loadSelectedTableRows = useCallback(async () => {
    if (!selectedTable) {
      setColumns([]);
      setRows([]);
      setTotalRows(0);
      return;
    }

    setLoadingRows(true);
    setRowsError(null);
    try {
      const params = new URLSearchParams({
        table_schema: selectedTable.table_schema,
        table_name: selectedTable.table_name,
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
      });

      const q = debouncedSearch.trim();
      if (q.length > 0) params.set('search', q);

      const resp = await edgeFetch(`admin-database-browser?${params.toString()}`, { method: 'GET' });
      const text = await resp.text();
      if (!resp.ok) throw new Error(parseResponseError(resp.status, text));

      const payload = text ? JSON.parse(text) as TableRowsResponse : null;
      setColumns(Array.isArray(payload?.columns) ? payload.columns : []);
      setRows(Array.isArray(payload?.rows) ? payload.rows : []);
      setTotalRows(Number.isFinite(payload?.total_rows) ? Math.max(0, payload?.total_rows ?? 0) : 0);
    } catch (e) {
      setRowsError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingRows(false);
    }
  }, [debouncedSearch, page, pageSize, selectedTable]);

  useEffect(() => {
    void loadSelectedTableRows();
  }, [loadSelectedTableRows]);

  const columnNames = useMemo(() => {
    if (columns.length > 0) return columns.map((col) => col.column_name);
    if (rows.length > 0) return Object.keys(rows[0] ?? {});
    return [];
  }, [columns, rows]);

  const startRow = totalRows === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = totalRows === 0 ? 0 : Math.min(totalRows, page * pageSize);

  const headerCellClass = density === 'compact'
    ? 'px-2 py-1.5 font-medium'
    : density === 'comfortable'
      ? 'px-3 py-2.5 font-medium'
      : 'px-2 py-2 font-medium';

  const bodyCellClass = density === 'compact'
    ? 'px-2 py-1 text-[11px]'
    : density === 'comfortable'
      ? 'px-3 py-2.5 text-sm'
      : 'px-2 py-1.5 text-xs';

  const cellTextClass = wrapCells
    ? 'block whitespace-pre-wrap break-words'
    : 'block whitespace-nowrap overflow-hidden text-ellipsis';

  return (
    <div className="space-y-4">
      <PageHeader title="Database" />

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-md border border-border bg-card p-3">
          <div className="mb-3 flex items-center gap-2">
            <IconDatabase size={20} strokeWidth={1.5} className="text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Tables</p>
            <span className="ml-auto text-xs text-muted-foreground">{filteredTables.length} / {tables.length}</span>
            <button
              type="button"
              aria-label="Refresh catalog"
              title={loadingCatalog ? 'Refreshing...' : 'Refresh catalog'}
              disabled={loadingCatalog}
              onClick={() => void loadCatalog()}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            >
              <IconRefresh size={14} className={loadingCatalog ? 'animate-spin' : ''} />
            </button>
          </div>

          <input
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"
            placeholder="Filter schema.table..."
            value={tableFilter}
            onChange={(event) => setTableFilter(event.currentTarget.value)}
          />

          {catalogError && (
            <div className="mt-3">
              <ErrorAlert message={catalogError} />
            </div>
          )}

          <div className="mt-3 max-h-[68vh] overflow-auto rounded-md border border-border">
            {filteredTables.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground">No tables match current filter.</p>
            )}
            <ul className="divide-y divide-border">
              {filteredTables.map((row) => {
                const key = tableKey(row);
                const selected = key === selectedTableKey;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      className={cn(
                        'w-full px-3 py-2 text-left text-xs transition-colors',
                        selected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50',
                      )}
                      onClick={() => {
                        setSelectedTableKey(key);
                        setPage(1);
                        setSearchInput('');
                      }}
                    >
                      <p className="font-mono text-[11px]">{key}</p>
                      <p className="mt-0.5 text-muted-foreground">
                        cols {row.column_count} | est {formatEstimate(row.row_estimate)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="rounded-md border border-border bg-card p-3">
          {!selectedTable && (
            <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
              Select a table to inspect rows.
            </div>
          )}

          {selectedTable && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-sm text-foreground">
                  {selectedTable.table_schema}.{selectedTable.table_name}
                </p>
                <span className="text-xs text-muted-foreground">
                  {startRow}-{endRow} of {totalRows}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <input
                    className="h-8 w-[260px] max-w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"
                    placeholder="Search rows (all columns)"
                    value={searchInput}
                    onChange={(event) => {
                      setSearchInput(event.currentTarget.value);
                      setPage(1);
                    }}
                  />
                  <label className="text-xs text-muted-foreground">
                    Page size
                    <select
                      className="ml-1 h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                      value={pageSize}
                      onChange={(event) => {
                        const next = Number(event.currentTarget.value);
                        setPageSize(Number.isFinite(next) && next > 0 ? next : 50);
                        setPage(1);
                      }}
                    >
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    disabled={loadingRows}
                    onClick={() => void loadSelectedTableRows()}
                    aria-label="Refresh rows"
                    title={loadingRows ? 'Loading...' : 'Refresh rows'}
                  >
                    <IconRefresh size={14} className={loadingRows ? 'animate-spin' : ''} />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  disabled={page <= 1 || loadingRows}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  aria-label="Previous page"
                  title="Previous page"
                >
                  <IconChevronLeft size={14} />
                </Button>
                <p className="text-xs text-muted-foreground">
                  Page {page} / {totalPages}
                </p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  disabled={page >= totalPages || loadingRows}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  aria-label="Next page"
                  title="Next page"
                >
                  <IconChevronRight size={14} />
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-background px-2 py-2">
                <span className="text-xs font-medium text-foreground">Visual Controls</span>
                <label className="text-xs text-muted-foreground">
                  Density
                  <select
                    className="ml-1 h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                    value={density}
                    onChange={(event) => setDensity(event.currentTarget.value as GridDensity)}
                  >
                    <option value="compact">Compact</option>
                    <option value="cozy">Cozy</option>
                    <option value="comfortable">Comfortable</option>
                  </select>
                </label>
                <label className="text-xs text-muted-foreground">
                  Cell width
                  <select
                    className="ml-1 h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                    value={maxCellWidth}
                    onChange={(event) => {
                      const next = Number(event.currentTarget.value);
                      setMaxCellWidth(Number.isFinite(next) ? next : 420);
                    }}
                  >
                    {CELL_WIDTH_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}px</option>
                    ))}
                  </select>
                </label>
                <label className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={wrapCells}
                    onChange={(event) => setWrapCells(event.currentTarget.checked)}
                  />
                  Wrap cells
                </label>
                <label className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={zebraRows}
                    onChange={(event) => setZebraRows(event.currentTarget.checked)}
                  />
                  Zebra rows
                </label>
                <label className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={showGridLines}
                    onChange={(event) => setShowGridLines(event.currentTarget.checked)}
                  />
                  Grid lines
                </label>
              </div>

              {rowsError && <ErrorAlert message={rowsError} />}

              <div className="rounded-md border border-border bg-background p-2">
                <p className="mb-2 text-xs font-medium text-foreground">Columns ({columns.length})</p>
                {columns.length === 0 && (
                  <p className="text-xs text-muted-foreground">No column metadata returned.</p>
                )}
                {columns.length > 0 && (
                  <div className="max-h-40 overflow-auto">
                    <table className="min-w-full border-collapse text-left text-xs">
                      <thead className="text-muted-foreground">
                        <tr>
                          <th className="px-2 py-1 font-medium">#</th>
                          <th className="px-2 py-1 font-medium">Column</th>
                          <th className="px-2 py-1 font-medium">Type</th>
                          <th className="px-2 py-1 font-medium">Nullable</th>
                          <th className="px-2 py-1 font-medium">Default</th>
                        </tr>
                      </thead>
                      <tbody>
                        {columns.map((col) => (
                          <tr key={col.column_name} className="border-t border-border">
                            <td className="px-2 py-1 text-muted-foreground">{col.ordinal_position}</td>
                            <td className="px-2 py-1 font-mono text-foreground">{col.column_name}</td>
                            <td className="px-2 py-1 text-muted-foreground">{col.data_type}</td>
                            <td className="px-2 py-1 text-muted-foreground">{col.is_nullable ? 'YES' : 'NO'}</td>
                            <td className="max-w-[260px] truncate px-2 py-1 text-muted-foreground" title={col.column_default ?? ''}>
                              {col.column_default ?? ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="overflow-auto rounded-md border border-border">
                <table className="min-w-full border-collapse text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      {columnNames.map((name) => (
                        <th key={name} className={headerCellClass}>
                          <span className="font-mono text-[11px]">{name}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {!loadingRows && rows.length === 0 && (
                      <tr>
                        <td className={cn('text-muted-foreground', bodyCellClass)} colSpan={Math.max(1, columnNames.length)}>
                          No rows for this page/filter.
                        </td>
                      </tr>
                    )}
                    {rows.map((row, index) => (
                      <tr
                        key={`${selectedTableKey}-${index}`}
                        className={cn(
                          'align-top',
                          showGridLines && 'border-t border-border',
                          zebraRows && index % 2 === 1 && 'bg-muted/20',
                        )}
                      >
                        {columnNames.map((columnName) => {
                          const value = formatCellValue(row[columnName]);
                          return (
                            <td
                              key={columnName}
                              className={cn('text-foreground', bodyCellClass)}
                              style={{ maxWidth: maxCellWidth }}
                            >
                              <span className={cellTextClass} title={value}>
                                {value}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
