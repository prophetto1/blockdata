import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { edgeFetch } from '@/lib/edge';
import { supabase } from '@/lib/supabase';
import {
  buildTaskDetailSourceUrl,
  extractTaskSchemaSummary,
  parseTaskSchema,
  taskClassHoverText,
  type ParsedTaskSchema,
} from './integration-catalog.helpers';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, paginateRows } from './pagination';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type CatalogItemRow = {
  item_id: string;
  plugin_name: string;
  plugin_title: string | null;
  plugin_group: string | null;
  plugin_version: string | null;
  categories: string[] | null;
  task_class: string;
  task_title: string | null;
  task_description: string | null;
  task_schema: Record<string, unknown> | null;
  task_markdown: string | null;
  enabled: boolean;
  suggested_service_type: string | null;
  last_synced_at: string;
  updated_at: string;
};

type AdminIntegrationCatalogResponse = {
  superuser: { user_id: string; email: string };
  items: CatalogItemRow[];
  services: unknown[];
  functions: unknown[];
};

type SyncSummary = {
  total_normalized: number;
  would_insert?: number;
  would_update?: number;
  inserted?: number;
  updated?: number;
  duplicate_classes_in_payload: number;
};

type SyncResponse = {
  ok: boolean;
  dry_run: boolean;
  source_url: string;
  summary: SyncSummary;
  warnings?: string[];
};

type InlineStatus = {
  kind: 'success' | 'error';
  message: string;
};

function formatTimestamp(value: string | null): string {
  if (!value) return 'n/a';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function stripPluginPrefix(taskClass: string): string {
  return taskClass.replace(/^io\.kestra\.plugin\./, '');
}

/* ------------------------------------------------------------------ */
/*  Schema detail (expandable)                                         */
/* ------------------------------------------------------------------ */

function SchemaDetail({ schema, markdown }: { schema: ParsedTaskSchema; markdown: string | null }) {
  const [showExamples, setShowExamples] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  return (
    <div className="space-y-4 py-3">
      {schema.deprecated && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Deprecated: {schema.deprecated}
        </div>
      )}

      {/* Inputs */}
      {schema.inputs.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-semibold text-foreground">
            Inputs ({schema.inputs.length})
            {schema.requiredInputNames.length > 0 && (
              <span className="ml-1 font-normal text-muted-foreground">
                {schema.requiredInputNames.length} required
              </span>
            )}
          </h4>
          <div className="overflow-auto rounded-md border border-border">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Name</th>
                  <th className="px-2 py-1.5 font-medium">Type</th>
                  <th className="px-2 py-1.5 font-medium">Req</th>
                  <th className="px-2 py-1.5 font-medium">Dynamic</th>
                  <th className="px-2 py-1.5 font-medium">Default</th>
                  <th className="px-2 py-1.5 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {schema.inputs.map((inp) => (
                  <tr key={inp.name} className="border-t border-border align-top">
                    <td className="px-2 py-1.5 font-mono text-foreground">{inp.name}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">
                      {inp.type}
                      {inp.enum && (
                        <span className="ml-1 text-muted-foreground/60">
                          [{inp.enum.slice(0, 4).join(', ')}{inp.enum.length > 4 ? ` +${inp.enum.length - 4}` : ''}]
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {inp.required && (
                        <span className="rounded bg-primary/10 px-1 text-[10px] font-medium text-primary">yes</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-muted-foreground/60">
                      {inp.dynamic ? 'yes' : ''}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-muted-foreground/60">
                      {inp.default ?? ''}
                    </td>
                    <td className="max-w-[300px] px-2 py-1.5 text-muted-foreground">
                      {inp.description ?? inp.title ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Outputs */}
      {schema.outputs.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-semibold text-foreground">
            Outputs ({schema.outputs.length})
          </h4>
          <div className="overflow-auto rounded-md border border-border">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Name</th>
                  <th className="px-2 py-1.5 font-medium">Type</th>
                  <th className="px-2 py-1.5 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {schema.outputs.map((out) => (
                  <tr key={out.name} className="border-t border-border align-top">
                    <td className="px-2 py-1.5 font-mono text-foreground">{out.name}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{out.type}</td>
                    <td className="max-w-[300px] px-2 py-1.5 text-muted-foreground">
                      {out.description ?? out.title ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Definitions */}
      {schema.definitions.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-semibold text-foreground">
            Definitions ({schema.definitions.length})
          </h4>
          <div className="flex flex-wrap gap-2 text-xs">
            {schema.definitions.map((def) => (
              <span key={def.name} className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-muted-foreground">
                {def.name.split('.').pop()} ({def.propertyNames.length} props)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Metrics */}
      {schema.metrics.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-semibold text-foreground">
            Metrics ({schema.metrics.length})
          </h4>
          <div className="flex flex-wrap gap-2 text-xs">
            {schema.metrics.map((m) => (
              <span key={m.name} className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-muted-foreground">
                {m.name} ({m.type}{m.unit ? `, ${m.unit}` : ''})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Examples */}
      {schema.examples.length > 0 && (
        <div>
          <button
            type="button"
            className="text-xs font-semibold text-foreground hover:underline"
            onClick={() => setShowExamples(!showExamples)}
          >
            Examples ({schema.examples.length}) {showExamples ? '[-]' : '[+]'}
          </button>
          {showExamples && (
            <div className="mt-1.5 space-y-2">
              {schema.examples.map((ex, i) => (
                <div key={i} className="rounded-md border border-border">
                  {ex.title && (
                    <div className="border-b border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                      {ex.title}
                    </div>
                  )}
                  <pre className="overflow-auto p-3 text-[11px] text-foreground/80">{ex.code}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Markdown docs */}
      {markdown && markdown.trim().length > 0 && (
        <div>
          <button
            type="button"
            className="text-xs font-semibold text-foreground hover:underline"
            onClick={() => setShowDocs(!showDocs)}
          >
            Documentation {showDocs ? '[-]' : '[+]'}
          </button>
          {showDocs && (
            <pre className="mt-1.5 max-h-[400px] overflow-auto rounded-md border border-border bg-muted/30 p-3 text-[11px] text-foreground/80 whitespace-pre-wrap">
              {markdown}
            </pre>
          )}
        </div>
      )}

      {schema.inputs.length === 0 && schema.outputs.length === 0 && (
        <p className="text-xs text-muted-foreground">No schema data — run Fetch Schema to hydrate.</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main panel                                                         */
/* ------------------------------------------------------------------ */

export function IntegrationCatalogPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<InlineStatus | null>(null);
  const [items, setItems] = useState<CatalogItemRow[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState('http://localhost:8080/api/v1/plugins');
  const [search, setSearch] = useState('');
  const [lastSync, setLastSync] = useState<SyncResponse | null>(null);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const catalogEndpoint = 'admin-integration-catalog';

  /* ---- Data loading ---- */
  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await edgeFetch(catalogEndpoint, { method: 'GET' });
      const text = await resp.text();
      let payload: AdminIntegrationCatalogResponse | { error?: string } = {};
      try {
        payload = text ? (JSON.parse(text) as AdminIntegrationCatalogResponse) : payload;
      } catch { /* text fallback */ }
      if (!resp.ok) throw new Error((payload as { error?: string }).error ?? text ?? `HTTP ${resp.status}`);
      const data = payload as AdminIntegrationCatalogResponse;
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadCatalog(); }, [loadCatalog]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-integration-catalog-items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'integration_catalog_items' }, () => { void loadCatalog(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadCatalog]);

  /* ---- Sync ---- */
  const runSync = async (dryRun: boolean) => {
    setStatus(null);
    const key = dryRun ? 'sync:dry-run' : 'sync:apply';
    setSavingKey(key);
    try {
      const resp = await edgeFetch(catalogEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'sync_kestra', source_url: sourceUrl.trim() || undefined, dry_run: dryRun }),
      });
      const text = await resp.text();
      let payload: SyncResponse | { error?: string } = {};
      try { payload = text ? JSON.parse(text) : {}; } catch { /* fallback */ }
      if (!resp.ok) throw new Error((payload as { error?: string }).error ?? text ?? `HTTP ${resp.status}`);
      const data = payload as SyncResponse;
      setLastSync(data);
      if (!dryRun) await loadCatalog();
      const warnCount = data.warnings?.length ?? 0;
      setStatus({
        kind: 'success',
        message: dryRun
          ? `Dry run: ${data.summary.total_normalized} items (${data.summary.would_insert ?? 0} insert, ${data.summary.would_update ?? 0} update, ${warnCount} warnings).`
          : `Sync applied: ${data.summary.total_normalized} items (${data.summary.inserted ?? 0} inserted, ${data.summary.updated ?? 0} updated, ${warnCount} warnings).`,
      });
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setSavingKey(null);
    }
  };

  /* ---- Hydrate ---- */
  const hydrateDetail = async (taskClass: string) => {
    setStatus(null);
    const key = `item:hydrate:${taskClass}`;
    setSavingKey(key);
    try {
      const resp = await edgeFetch(catalogEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'hydrate_detail', task_class: taskClass, source_url: buildTaskDetailSourceUrl(sourceUrl, taskClass) }),
      });
      const text = await resp.text();
      let payload: { error?: string } = {};
      try { payload = text ? JSON.parse(text) : {}; } catch { /* fallback */ }
      if (!resp.ok) throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);
      await loadCatalog();
      setStatus({ kind: 'success', message: 'Task detail hydrated from source.' });
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setSavingKey(null);
    }
  };

  /* ---- Filter + paginate ---- */
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

  const pagination = useMemo(() => paginateRows(filteredItems, page, pageSize), [filteredItems, page, pageSize]);

  /* ---- Expand toggle ---- */
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ---- Render ---- */
  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted-foreground">
          Kestra Source URL
          <input
            className="mt-1 h-8 w-[460px] max-w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.currentTarget.value)}
            placeholder="http://localhost:8080/api/v1/plugins"
          />
        </label>
        <Button size="sm" className="h-8 px-3 text-xs" disabled={loading} onClick={() => void loadCatalog()}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
        <Button size="sm" className="h-8 px-3 text-xs" disabled={savingKey === 'sync:dry-run'} onClick={() => void runSync(true)}>
          {savingKey === 'sync:dry-run' ? 'Running...' : 'Dry-Run Sync'}
        </Button>
        <Button size="sm" className="h-8 px-3 text-xs" disabled={savingKey === 'sync:apply'} onClick={() => void runSync(false)}>
          {savingKey === 'sync:apply' ? 'Applying...' : 'Apply Sync'}
        </Button>
      </div>

      {/* Search + pagination controls */}
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">
          <span className="font-mono">{items.length}</span> items |
          Showing <span className="font-mono">{filteredItems.length}</span>
        </p>
        <input
          className="h-8 min-w-[240px] rounded-md border border-input bg-background px-2 text-xs text-foreground"
          value={search}
          onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
          placeholder="Search class, plugin, title, category..."
        />
        <label className="text-xs text-muted-foreground">
          Page size
          <select
            className="ml-1 h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.currentTarget.value) || DEFAULT_PAGE_SIZE); setPage(1); }}
          >
            {PAGE_SIZE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </label>
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" className="h-8 px-2 text-xs" disabled={pagination.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Prev
          </Button>
          <p className="px-2 text-xs text-muted-foreground">
            Page <span className="font-mono">{pagination.page}</span> / <span className="font-mono">{pagination.totalPages}</span>
          </p>
          <Button size="sm" className="h-8 px-2 text-xs" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}>
            Next
          </Button>
        </div>
      </div>

      {lastSync && (
        <p className="text-xs text-muted-foreground">
          Last sync: <span className="font-mono">{lastSync.summary.total_normalized}</span> items,
          {' '}<span className="font-mono">{lastSync.summary.duplicate_classes_in_payload}</span> duplicates.
        </p>
      )}

      {status && (
        <div className={status.kind === 'error'
          ? 'rounded-md border border-red-400/40 bg-red-500/10 p-2 text-xs text-red-200'
          : 'rounded-md border border-emerald-400/40 bg-emerald-500/10 p-2 text-xs text-emerald-100'
        }>
          {status.message}
        </div>
      )}
      {error && <ErrorAlert message={error} />}

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[1200px] border-collapse text-xs">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="w-8 px-2 py-2" />
              <th className="px-2 py-2 font-medium">Task</th>
              <th className="px-2 py-2 font-medium">Plugin</th>
              <th className="px-2 py-2 font-medium">Group</th>
              <th className="px-2 py-2 font-medium">Version</th>
              <th className="px-2 py-2 font-medium">Categories</th>
              <th className="px-2 py-2 font-medium">Schema</th>
              <th className="px-2 py-2 font-medium">Docs</th>
              <th className="px-2 py-2 font-medium">Synced</th>
              <th className="px-2 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagination.rows.map((row) => {
              const isExpanded = expandedIds.has(row.item_id);
              const summary = extractTaskSchemaSummary(row.task_schema);
              const hydrateKey = `item:hydrate:${row.task_class}`;
              const hasSchema = summary.propertyKeys.length > 0 || summary.outputKeys.length > 0;

              return (
                <tr key={row.item_id} className="group border-t border-border align-top">
                  {/* Expand toggle */}
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => toggleExpand(row.item_id)}
                    >
                      {isExpanded ? '\u25BC' : '\u25B6'}
                    </button>
                  </td>

                  {/* Task (class + title + description) */}
                  <td className="px-2 py-2" colSpan={isExpanded ? 9 : 1}>
                    <p
                      className="font-mono text-[11px] text-foreground cursor-pointer hover:underline"
                      title={taskClassHoverText(row.task_description, row.task_title, row.task_class)}
                      onClick={() => toggleExpand(row.item_id)}
                    >
                      {stripPluginPrefix(row.task_class)}
                    </p>
                    {row.task_title && (
                      <p className="mt-0.5 text-muted-foreground">{row.task_title}</p>
                    )}
                    {row.task_description && !isExpanded && (
                      <p className="mt-0.5 text-muted-foreground/60 truncate max-w-[400px]">{row.task_description}</p>
                    )}

                    {/* Expanded detail */}
                    {isExpanded && (
                      <SchemaDetail
                        schema={parseTaskSchema(row.task_schema)}
                        markdown={row.task_markdown}
                      />
                    )}
                  </td>

                  {/* Remaining columns (hidden when expanded) */}
                  {!isExpanded && (
                    <>
                      <td className="px-2 py-2 text-muted-foreground">
                        <p className="font-mono">{row.plugin_name}</p>
                        {row.plugin_title && <p className="text-muted-foreground/60">{row.plugin_title}</p>}
                      </td>
                      <td className="px-2 py-2 font-mono text-muted-foreground/60">
                        {row.plugin_group ? stripPluginPrefix(row.plugin_group) : 'n/a'}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground/60">{row.plugin_version ?? 'n/a'}</td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {(row.categories ?? []).join(', ') || 'n/a'}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {hasSchema ? (
                          <span title={`in: ${summary.propertyKeys.join(', ')}\nout: ${summary.outputKeys.join(', ')}`}>
                            in {summary.propertyKeys.length} / out {summary.outputKeys.length}
                            {summary.requiredKeys.length > 0 && ` / ${summary.requiredKeys.length} req`}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">empty</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground/60">
                        {row.task_markdown && row.task_markdown.trim().length > 0 ? 'yes' : 'no'}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground/60 text-[11px]">
                        {formatTimestamp(row.last_synced_at)}
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={savingKey === hydrateKey}
                          onClick={() => void hydrateDetail(row.task_class)}
                        >
                          {savingKey === hydrateKey ? 'Fetching...' : 'Fetch Schema'}
                        </Button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {!loading && !error && filteredItems.length === 0 && (
              <tr>
                <td className="px-2 py-3 text-muted-foreground" colSpan={10}>
                  No catalog items match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
