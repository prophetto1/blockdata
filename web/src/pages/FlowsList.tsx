import { useCallback, useEffect, useState } from 'react';
import {
  IconAdjustments,
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
  IconBookmark,
  IconBolt,
  IconFileExport,
  IconFileImport,
  IconFileSearch,
  IconFilter,
  IconInfoCircle,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
} from '@tabler/icons-react';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useNavigate } from 'react-router-dom';
import { Checkbox } from '@ark-ui/react/checkbox';
import { Select, createListCollection } from '@ark-ui/react/select';
import { PaginationRoot, PaginationPrevTrigger, PaginationNextTrigger } from '@/components/ui/pagination';
import { Portal } from '@ark-ui/react/portal';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  ICON_CONTEXT_SIZE,
  ICON_SIZES,
  ICON_STANDARD,
  ICON_STROKES,
} from '@/lib/icon-contract';
import { loadFlowsList, formatLabelBadge } from './flows/flows.api';
import type { FlowListItem, FlowSortField, FlowSortDir, FlowLabel } from './flows/flows.types';

const PAGE_SIZES = [10, 25, 50, 100] as const;

const pageSizeCollection = createListCollection({
  items: PAGE_SIZES.map((s) => ({ label: `${s} per page`, value: String(s) })),
});

function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString();
}

function LabelBadge({ label }: { label: FlowLabel }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap">
      {formatLabelBadge(label)}
    </span>
  );
}

function StatusCell({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground">--</span>;

  const variant = status === 'SUCCESS'
    ? 'green'
    : status === 'FAILED'
      ? 'red'
      : status === 'RUNNING'
        ? 'blue'
        : status === 'WARNING'
          ? 'yellow'
          : 'gray';

  return <Badge variant={variant} size="sm">{status}</Badge>;
}

function SortIcon({ field, activeField, dir }: { field: FlowSortField; activeField: FlowSortField | null; dir: FlowSortDir }) {
  if (field !== activeField) return <IconArrowsSort size={12} className="text-muted-foreground/50" />;
  return dir === 'asc'
    ? <IconArrowUp size={12} className="text-primary" />
    : <IconArrowDown size={12} className="text-primary" />;
}

export default function FlowsList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<FlowListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [sortField, setSortField] = useState<FlowSortField | null>(null);
  const [sortDir, setSortDir] = useState<FlowSortDir>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fetchKey, setFetchKey] = useState(0);

  const utilityIconSize = ICON_SIZES[ICON_CONTEXT_SIZE[ICON_STANDARD.utilityTopRight.context]];
  const utilityIconStroke = ICON_STROKES[ICON_STANDARD.utilityTopRight.stroke];

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedQuery(query); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch flows
  useEffect(() => {
    let cancelled = false;
    const fetchFlows = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await loadFlowsList({
          query: debouncedQuery || undefined,
          page,
          size: pageSize,
          sort: sortField ?? undefined,
          sortDir: sortField ? sortDir : undefined,
        });
        if (cancelled) return;
        setRows(result.results);
        setTotal(result.total);
      } catch (e) {
        if (cancelled) return;
        setRows([]);
        setTotal(0);
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchFlows();
    return () => { cancelled = true; };
  }, [debouncedQuery, page, pageSize, sortField, sortDir, fetchKey]);

  const refresh = useCallback(() => setFetchKey((k) => k + 1), []);

  const toggleSort = (field: FlowSortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const clearFilters = () => {
    setQuery('');
    setDebouncedQuery('');
    setSortField(null);
    setSortDir('asc');
    setPage(1);
  };

  const toggleRow = (routeId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(routeId)) next.delete(routeId);
      else next.add(routeId);
      return next;
    });
  };

  const openFlow = (row: FlowListItem) => {
    navigate(`/app/flows/${encodeURIComponent(row.namespace)}/${encodeURIComponent(row.flowId)}/overview`);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = query.length > 0 || sortField !== null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pt-3">
      <PageHeader title="Flows" />

      {error && <ErrorAlert message={error} />}

      <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          <label className="relative min-w-[220px] flex-1 max-w-sm">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
              <HugeiconsIcon icon={Search01Icon} size={utilityIconSize} strokeWidth={utilityIconStroke} className="text-muted-foreground" />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              placeholder="Search flows"
              className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-2 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </label>

          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear all
            </button>
          ) : null}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm">
              <IconFilter size={14} />
              Add filters
            </Button>
            <Button variant="outline" size="sm" onClick={refresh}>
              <IconRefresh size={14} />
              Refresh data
            </Button>
            <Button variant="outline" size="icon" aria-label="Save current filters">
              <IconBookmark size={14} />
            </Button>
            <Button variant="outline" size="sm">
              Saved filters
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">0</span>
            </Button>
            <Button variant="outline" size="icon" aria-label="Page display settings">
              <IconAdjustments size={14} />
            </Button>
            <Button variant="outline" size="sm">
              <IconFileExport size={14} />
              Export as CSV
            </Button>
            <Button variant="outline" size="sm">
              <IconFileImport size={14} />
              Import
            </Button>
            <Button variant="outline" size="sm">
              <IconFileSearch size={14} />
              Source search
            </Button>
            <Button size="sm">
              <IconPlus size={14} />
              Create
            </Button>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground">
              <tr className="border-b border-border">
              <th className="w-10 px-3 py-2">
                <Checkbox.Root
                  checked={selected.size === rows.length && rows.length > 0}
                  onCheckedChange={(details) => {
                    if (details.checked) {
                      setSelected(new Set(rows.map((r) => r.routeId)));
                    } else {
                      setSelected(new Set());
                    }
                  }}
                >
                  <Checkbox.Control className="h-4 w-4 rounded border-input" />
                  <Checkbox.HiddenInput />
                </Checkbox.Root>
              </th>
              <th className="px-3 py-2 font-medium">
                <button type="button" onClick={() => toggleSort('id')} className="inline-flex items-center gap-1 hover:text-foreground">
                  Id <SortIcon field="id" activeField={sortField} dir={sortDir} />
                </button>
              </th>
              <th className="px-3 py-2 font-medium">Labels</th>
              <th className="px-3 py-2 font-medium">
                <button type="button" onClick={() => toggleSort('namespace')} className="inline-flex items-center gap-1 hover:text-foreground">
                  Namespace <SortIcon field="namespace" activeField={sortField} dir={sortDir} />
                </button>
              </th>
              <th className="px-3 py-2 font-medium">Last execution date</th>
              <th className="px-3 py-2 font-medium">Last execution status</th>
              <th className="px-3 py-2 font-medium">Execution statistics</th>
              <th className="px-3 py-2 font-medium">Triggers</th>
              <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-sm text-muted-foreground">
                    Loading flows...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-sm text-muted-foreground">
                    No flows found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.routeId}
                    className={cn(
                      'cursor-pointer border-b border-border/60 align-top hover:bg-accent/30',
                      selected.has(row.routeId) && 'bg-accent/20',
                      row.disabled && 'opacity-70',
                    )}
                    onClick={() => openFlow(row)}
                  >
                    <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox.Root
                        checked={selected.has(row.routeId)}
                        onCheckedChange={() => toggleRow(row.routeId)}
                      >
                        <Checkbox.Control className="h-4 w-4 rounded border-input" />
                        <Checkbox.HiddenInput />
                      </Checkbox.Root>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground">{row.flowId}</span>
                        {row.description ? (
                          <span title={row.description}>
                            <IconInfoCircle size={14} className="text-muted-foreground/60" />
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {row.labels.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.labels.map((label, i) => <LabelBadge key={i} label={label} />)}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">--</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-muted-foreground">{row.namespace}</td>
                    <td className="px-3 py-3 text-sm text-muted-foreground">{formatDate(row.lastExecutionDate) || '--'}</td>
                    <td className="px-3 py-3"><StatusCell status={row.lastExecutionStatus} /></td>
                    <td className="px-3 py-3 text-sm text-muted-foreground">{row.executionStatistics || '--'}</td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
                        <IconBolt size={12} className="text-primary" />
                        {row.triggerCount}
                      </span>
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label="Execute flow"
                          title="Execute flow"
                        >
                          <IconPlayerPlay size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label="Flow details"
                          title="Flow details"
                          onClick={() => openFlow(row)}
                        >
                          <IconFileSearch size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ScrollArea>

        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Select.Root
              collection={pageSizeCollection}
              value={[String(pageSize)]}
              onValueChange={(details) => { setPageSize(Number(details.value[0])); setPage(1); }}
              positioning={{ placement: 'top-start', sameWidth: true }}
            >
              <Select.Control>
                <Select.Trigger className="rounded-md border border-border bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <Select.ValueText placeholder="Per page" />
                </Select.Trigger>
              </Select.Control>
              <Portal>
                <Select.Positioner>
                  <Select.Content className="rounded-md border border-border bg-popover p-1 text-xs shadow-md">
                    {PAGE_SIZES.map((s) => (
                      <Select.Item key={s} item={String(s)} className="cursor-pointer rounded px-2 py-1 hover:bg-accent">
                        <Select.ItemText>{s} per page</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>
            {totalPages > 1 && (
              <PaginationRoot
                count={total}
                pageSize={pageSize}
                page={page}
                onPageChange={(details) => setPage(details.page)}
                className="flex items-center gap-1"
              >
                <PaginationPrevTrigger className="rounded px-1.5 py-0.5 hover:bg-accent disabled:opacity-40">
                  Prev
                </PaginationPrevTrigger>
                <span>Page {page} of {totalPages}</span>
                <PaginationNextTrigger className="rounded px-1.5 py-0.5 hover:bg-accent disabled:opacity-40">
                  Next
                </PaginationNextTrigger>
              </PaginationRoot>
            )}
          </div>
          <span className="font-medium">Total: {total}</span>
        </div>
      </section>
    </div>
  );
}
