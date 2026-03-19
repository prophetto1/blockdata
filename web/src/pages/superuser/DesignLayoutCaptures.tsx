import { useCallback, useEffect, useState } from 'react';
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
  IconCamera,
  IconDownload,
  IconEye,
  IconPlus,
  IconRefresh,
} from '@tabler/icons-react';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Checkbox } from '@ark-ui/react/checkbox';
import { Pagination } from '@ark-ui/react/pagination';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DialogRoot,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogCloseTrigger,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  ICON_CONTEXT_SIZE,
  ICON_SIZES,
  ICON_STANDARD,
  ICON_STROKES,
} from '@/lib/icon-contract';
import type { CaptureEntry, CaptureRequest, PageType, ThemeRequest } from './design-captures.types';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CAPTURE_SERVER = import.meta.env.VITE_CAPTURE_SERVER_URL || 'http://localhost:4488';

type SortField = 'name' | 'viewport' | 'theme' | 'pageType' | 'capturedAt';
type SortDir = 'asc' | 'desc';

const PAGE_SIZES = [10, 25, 50] as const;

const PAGE_TYPE_COLORS = {
  settings: 'blue',
  editor: 'violet',
  dashboard: 'teal',
  workbench: 'orange',
  marketing: 'green',
} as const satisfies Record<PageType, string>;

const THEME_BADGE = {
  light: 'default',
  dark: 'dark',
  both: 'gray',
} as const satisfies Record<ThemeRequest, string>;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fileUrl(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/');
  const encoded = normalized.split('/').map(encodeURIComponent).join('/');
  return `${CAPTURE_SERVER}/files/${encoded}`;
}

function captureFileUrl(row: CaptureEntry, theme: string, filename: string): string {
  return fileUrl(`${row.outputDir}/${theme}/${filename}`.replace(/\\/g, '/'));
}

function formatDate(value: string | null): string {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleString();
}

async function fetchCaptures(): Promise<{ data: CaptureEntry[]; connected: boolean }> {
  try {
    const res = await fetch(`${CAPTURE_SERVER}/captures`);
    if (!res.ok) return { data: [], connected: true };
    return { data: await res.json(), connected: true };
  } catch {
    return { data: [], connected: false };
  }
}

async function requestCapture(body: CaptureRequest): Promise<{ id: string; status: string; message?: string }> {
  const res = await fetch(`${CAPTURE_SERVER}/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

async function requestAuthComplete(captureId: string): Promise<{ id: string; status: string }> {
  const res = await fetch(`${CAPTURE_SERVER}/auth-complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: captureId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SortIcon({ field, activeField, dir }: { field: SortField; activeField: SortField | null; dir: SortDir }) {
  if (field !== activeField) return <IconArrowsSort size={12} className="text-muted-foreground/50" />;
  return dir === 'asc'
    ? <IconArrowUp size={12} className="text-primary" />
    : <IconArrowDown size={12} className="text-primary" />;
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export function Component() {
  useShellHeaderTitle({ title: 'Design Layout Captures', breadcrumbs: ['Superuser', 'Design Layout Captures'] });

  const [rows, setRows] = useState<CaptureEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverOnline, setServerOnline] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [sortField, setSortField] = useState<SortField | null>('capturedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const utilityIconSize = ICON_SIZES[ICON_CONTEXT_SIZE[ICON_STANDARD.utilityTopRight.context]];
  const utilityIconStroke = ICON_STROKES[ICON_STANDARD.utilityTopRight.stroke];

  // ---------- data loading ----------

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, connected } = await fetchCaptures();
    setRows(data);
    setServerOnline(connected);
    setLoading(false);
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  // ---------- sort / filter ----------

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = rows
    .filter((row) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return [row.name, row.url, row.viewport, row.theme, row.pageType]
        .join(' ')
        .toLowerCase()
        .includes(q);
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ---------- re-capture ----------

  const handleReCapture = async (row: CaptureEntry) => {
    const [w, h] = row.viewport.split('x').map(Number);
    const req: CaptureRequest = { url: row.url, width: w, height: h, theme: row.theme, pageType: row.pageType };
    try {
      const result = await requestCapture(req);
      if (result.status === 'auth-needed') {
        // Open modal pre-filled so user can complete auth flow
        setCaptureForm(req);
        setModalStatus({
          state: 'auth-needed',
          captureId: result.id,
          message: result.message ?? 'Browser opened. Complete login, then click "Auth Complete".',
        });
        setShowAddNew(true);
      } else {
        void loadData();
      }
    } catch (err) {
      setCaptureForm(req);
      setModalStatus({ state: 'error', message: err instanceof Error ? err.message : String(err) });
      setShowAddNew(true);
    }
  };

  // ---------- add-new modal ----------

  const [showAddNew, setShowAddNew] = useState(false);
  const [captureForm, setCaptureForm] = useState<CaptureRequest>({
    url: '',
    width: 1920,
    height: 1080,
    theme: 'light',
    pageType: 'settings',
  });
  const [modalStatus, setModalStatus] = useState<{
    state: 'idle' | 'submitting' | 'auth-needed' | 'capturing' | 'done' | 'error';
    message?: string;
    captureId?: string;
  }>({ state: 'idle' });

  const handleStartCapture = async () => {
    setModalStatus({ state: 'submitting' });
    try {
      const result = await requestCapture(captureForm);
      if (result.status === 'auth-needed') {
        setModalStatus({
          state: 'auth-needed',
          captureId: result.id,
          message: result.message ?? 'Browser opened. Complete login, then click "Auth Complete".',
        });
      } else if (result.status === 'complete') {
        setModalStatus({ state: 'done', captureId: result.id });
        void loadData();
      } else {
        setModalStatus({ state: 'capturing', captureId: result.id });
        void loadData();
      }
    } catch (err) {
      setModalStatus({ state: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleAuthComplete = async () => {
    if (!modalStatus.captureId) return;
    setModalStatus({ state: 'capturing', captureId: modalStatus.captureId });
    try {
      const result = await requestAuthComplete(modalStatus.captureId);
      if (result.status === 'complete') {
        setModalStatus({ state: 'done', captureId: result.id });
      } else {
        setModalStatus({ state: 'capturing', captureId: result.id });
      }
      void loadData();
    } catch (err) {
      setModalStatus({ state: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  // ---------- render ----------

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pt-3">
      {!serverOnline && !loading && (
        <div className="flex items-center gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 dark:border-red-700 dark:bg-red-900/20">
          <span className="text-sm font-medium text-red-800 dark:text-red-300">Capture server unavailable</span>
          <span className="text-sm text-red-700 dark:text-red-400">
            Run <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs dark:bg-red-900/40">npm run capture-server</code> to start it on localhost:{CAPTURE_SERVER.split(':').pop()}
          </span>
        </div>
      )}
      <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          <label className="relative min-w-[220px] flex-1 max-w-sm">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
              <HugeiconsIcon icon={Search01Icon} size={utilityIconSize} strokeWidth={utilityIconStroke} className="text-muted-foreground" />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.currentTarget.value); setPage(1); }}
              placeholder="Search captures"
              className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-2 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </label>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadData()}>
              <IconRefresh size={14} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowAddNew(true)}>
              <IconPlus size={14} />
              Add New
            </Button>
          </div>
        </div>

        {/* Table */}
        <ScrollArea className="min-h-0 flex-1">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="w-10 px-3 py-2">
                  <Checkbox.Root
                    checked={selected.size === paginated.length && paginated.length > 0}
                    onCheckedChange={(details) => {
                      if (details.checked) {
                        setSelected(new Set(paginated.map((r) => r.id)));
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
                  <button type="button" onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 hover:text-foreground">
                    Name <SortIcon field="name" activeField={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="px-3 py-2 font-medium">URL</th>
                <th className="px-3 py-2 font-medium">
                  <button type="button" onClick={() => toggleSort('viewport')} className="inline-flex items-center gap-1 hover:text-foreground">
                    Viewport <SortIcon field="viewport" activeField={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="px-3 py-2 font-medium">
                  <button type="button" onClick={() => toggleSort('theme')} className="inline-flex items-center gap-1 hover:text-foreground">
                    Theme <SortIcon field="theme" activeField={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="px-3 py-2 font-medium">
                  <button type="button" onClick={() => toggleSort('pageType')} className="inline-flex items-center gap-1 hover:text-foreground">
                    Page Type <SortIcon field="pageType" activeField={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="px-3 py-2 font-medium">
                  <button type="button" onClick={() => toggleSort('capturedAt')} className="inline-flex items-center gap-1 hover:text-foreground">
                    Captured <SortIcon field="capturedAt" activeField={sortField} dir={sortDir} />
                  </button>
                </th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-sm text-muted-foreground">
                    Loading captures...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-sm text-muted-foreground">
                    No captures yet. Click "Add New" to start.
                  </td>
                </tr>
              ) : (
                paginated.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      'border-b border-border/60 align-top hover:bg-accent/30',
                      selected.has(row.id) && 'bg-accent/20',
                    )}
                  >
                    <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox.Root
                        checked={selected.has(row.id)}
                        onCheckedChange={() => toggleRow(row.id)}
                      >
                        <Checkbox.Control className="h-4 w-4 rounded border-input" />
                        <Checkbox.HiddenInput />
                      </Checkbox.Root>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        {row.status === 'complete' && (
                          <img
                            src={captureFileUrl(row, row.theme === 'both' ? 'light' : row.theme, 'viewport.png')}
                            alt=""
                            className="h-8 w-14 shrink-0 rounded border border-border object-cover object-top"
                          />
                        )}
                        <span className="text-sm font-medium text-foreground">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-muted-foreground max-w-[250px] truncate" title={row.url}>
                      {row.url}
                    </td>
                    <td className="px-3 py-3 text-sm text-muted-foreground font-mono">{row.viewport}</td>
                    <td className="px-3 py-3">
                      <Badge variant={THEME_BADGE[row.theme]} size="sm">{row.theme}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={PAGE_TYPE_COLORS[row.pageType]} size="sm">{row.pageType}</Badge>
                    </td>
                    <td className="px-3 py-3 text-sm text-muted-foreground">{formatDate(row.capturedAt)}</td>
                    <td className="px-3 py-3">
                      <Badge
                        variant={
                          row.status === 'complete' ? 'green'
                          : row.status === 'failed' ? 'red'
                          : row.status === 'capturing' ? 'blue'
                          : row.status === 'auth-needed' ? 'yellow'
                          : 'gray'
                        }
                        size="sm"
                      >
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {row.status === 'complete' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              aria-label="View screenshot"
                              title="View screenshot"
                              onClick={() => window.open(captureFileUrl(row, row.theme === 'both' ? 'light' : row.theme, 'viewport.png'), '_blank')}
                            >
                              <IconEye size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              aria-label="Download report"
                              title="Download report"
                              onClick={() => window.open(captureFileUrl(row, row.theme === 'both' ? 'light' : row.theme, 'report.json'), '_blank')}
                            >
                              <IconDownload size={14} />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label="Re-capture"
                          title="Re-capture"
                          onClick={() => void handleReCapture(row)}
                        >
                          <IconCamera size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ScrollArea>

        {/* Pagination footer */}
        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.currentTarget.value)); setPage(1); }}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s} per page</option>
              ))}
            </select>
            {totalPages > 1 && (
              <Pagination.Root
                count={filtered.length}
                pageSize={pageSize}
                page={page}
                onPageChange={(details) => setPage(details.page)}
                className="flex items-center gap-1"
              >
                <Pagination.PrevTrigger className="rounded px-1.5 py-0.5 hover:bg-accent disabled:opacity-40">
                  Prev
                </Pagination.PrevTrigger>
                <span>Page {page} of {totalPages}</span>
                <Pagination.NextTrigger className="rounded px-1.5 py-0.5 hover:bg-accent disabled:opacity-40">
                  Next
                </Pagination.NextTrigger>
              </Pagination.Root>
            )}
          </div>
          <span className="font-medium">Total: {filtered.length}</span>
        </div>
      </section>

      {/* Add New Capture modal */}
      <DialogRoot open={showAddNew} onOpenChange={(details) => {
        setShowAddNew(details.open);
        if (!details.open) setModalStatus({ state: 'idle' });
      }}>
        <DialogContent className="max-w-lg">
          <DialogCloseTrigger />
          <DialogTitle>New Capture</DialogTitle>
          <DialogDescription>
            Enter a URL and capture settings. The capture server must be running on localhost:4488.
          </DialogDescription>

          <DialogBody>
            <label className="block">
              <span className="text-sm font-medium">URL</span>
              <input
                type="url"
                value={captureForm.url}
                onChange={(e) => setCaptureForm((f) => ({ ...f, url: e.currentTarget.value }))}
                placeholder="https://www.evidence.studio/settings/organization"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium">Width</span>
                <input
                  type="number"
                  value={captureForm.width}
                  onChange={(e) => setCaptureForm((f) => ({ ...f, width: Number(e.currentTarget.value) }))}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Height</span>
                <input
                  type="number"
                  value={captureForm.height}
                  onChange={(e) => setCaptureForm((f) => ({ ...f, height: Number(e.currentTarget.value) }))}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium">Theme</span>
                <select
                  value={captureForm.theme}
                  onChange={(e) => setCaptureForm((f) => ({ ...f, theme: e.currentTarget.value as ThemeRequest }))}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="both">Both (light + dark)</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium">Page Type</span>
                <select
                  value={captureForm.pageType}
                  onChange={(e) => setCaptureForm((f) => ({ ...f, pageType: e.currentTarget.value as PageType }))}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="settings">Settings</option>
                  <option value="editor">Editor</option>
                  <option value="dashboard">Dashboard</option>
                  <option value="workbench">Workbench</option>
                  <option value="marketing">Marketing</option>
                </select>
              </label>
            </div>

            {/* Status feedback */}
            {modalStatus.state === 'submitting' && (
              <p className="text-sm text-muted-foreground">Starting capture...</p>
            )}
            {modalStatus.state === 'auth-needed' && (
              <div className="flex gap-3 rounded-md border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-700 dark:bg-yellow-900/20">
                <span className="text-sm text-yellow-800 dark:text-yellow-300">{modalStatus.message}</span>
              </div>
            )}
            {modalStatus.state === 'capturing' && (
              <div className="flex gap-3 rounded-md border border-blue-300 bg-blue-50 p-3 dark:border-blue-700 dark:bg-blue-900/20">
                <span className="text-sm text-blue-800 dark:text-blue-300">Capturing... Playwright is running the measurement scripts.</span>
              </div>
            )}
            {modalStatus.state === 'done' && (
              <div className="flex gap-3 rounded-md border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-700 dark:bg-emerald-900/20">
                <span className="text-sm text-emerald-800 dark:text-emerald-300">Capture complete.</span>
              </div>
            )}
            {modalStatus.state === 'error' && (
              <div className="flex gap-3 rounded-md border border-red-300 bg-red-50 p-3 dark:border-red-700 dark:bg-red-900/20">
                <span className="text-sm text-red-800 dark:text-red-300">{modalStatus.message}</span>
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            {modalStatus.state !== 'done' && (
              <Button size="sm" variant="outline" onClick={() => setShowAddNew(false)}>Cancel</Button>
            )}
            {modalStatus.state === 'auth-needed' && (
              <Button size="sm" onClick={() => void handleAuthComplete()}>
                Auth Complete
              </Button>
            )}
            {(modalStatus.state === 'idle' || modalStatus.state === 'error') && (
              <Button size="sm" onClick={() => void handleStartCapture()} disabled={!captureForm.url}>
                <IconCamera size={14} />
                Capture
              </Button>
            )}
            {modalStatus.state === 'done' && (
              <Button size="sm" variant="outline" onClick={() => setShowAddNew(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </div>
  );
}
