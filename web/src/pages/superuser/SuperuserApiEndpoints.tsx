import { useEffect, useMemo, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { platformApiFetch } from '@/lib/platformApi';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type EndpointRow = {
  method: string;
  path: string;
  group: string;
  summary: string;
  auth: string;
  source: 'route' | 'plugin';
};

type OpenApiOperation = {
  tags?: string[];
  summary?: string;
  security?: Record<string, string[]>[];
  'x-required-role'?: string;
};

type OpenApiSpec = {
  paths?: Record<string, Record<string, OpenApiOperation>>;
};

type PluginFunction = {
  function_name: string;
  path: string;
  method: string;
  task_type: string;
  parameter_schema?: { name: string; type: string; required?: boolean }[];
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function resolveAuth(detail: OpenApiOperation): string {
  // Custom role extension takes precedence
  if (detail['x-required-role']) return detail['x-required-role'];
  // OpenAPI security field: empty array = public, present = auth required
  if (!detail.security || detail.security.length === 0) return 'none';
  // Check what schemes are listed
  const schemes = detail.security.flatMap((s) => Object.keys(s));
  if (schemes.includes('HTTPBearer')) return 'bearer';
  if (schemes.includes('APIKeyHeader')) return 'api_key (deprecated)';
  return 'bearer';
}

function getCatchAllAuth(spec: OpenApiSpec): string {
  const catchAll = spec.paths?.['/{function_name}']?.['post'];
  return catchAll ? resolveAuth(catchAll) : 'bearer';
}

function parseOpenApi(spec: OpenApiSpec): EndpointRow[] {
  const rows: EndpointRow[] = [];
  for (const [path, methods] of Object.entries(spec.paths ?? {})) {
    // Skip the catch-all plugin route — plugins are listed separately
    if (path === '/{function_name}') continue;
    for (const [method, detail] of Object.entries(methods)) {
      if (method === 'parameters') continue;
      rows.push({
        method: method.toUpperCase(),
        path,
        group: detail.tags?.[0] ?? 'other',
        summary: detail.summary ?? '',
        auth: resolveAuth(detail),
        source: 'route',
      });
    }
  }
  return rows;
}

function parsePlugins(functions: PluginFunction[], pluginAuth: string): EndpointRow[] {
  return functions.map((fn) => ({
    method: fn.method.toUpperCase(),
    path: fn.path.startsWith('/') ? fn.path : `/${fn.path}`,
    group: fn.task_type.split('.').slice(-2, -1)[0] || 'plugin',
    summary: `${fn.task_type}`,
    auth: pluginAuth,
    source: 'plugin' as const,
  }));
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-600 dark:text-emerald-400',
  POST: 'text-blue-600 dark:text-blue-400',
  PUT: 'text-amber-600 dark:text-amber-400',
  DELETE: 'text-red-600 dark:text-red-400',
  PATCH: 'text-purple-600 dark:text-purple-400',
};

const inputClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Component() {
  useShellHeaderTitle({ title: 'API Endpoints', breadcrumbs: ['Superuser', 'API Endpoints'] });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [endpoints, setEndpoints] = useState<EndpointRow[]>([]);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'route' | 'plugin'>('all');
  const [groupFilter, setGroupFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [specResp, fnResp] = await Promise.all([
          platformApiFetch('/openapi.json'),
          platformApiFetch('/functions'),
        ]);

        if (!specResp.ok) throw new Error(`OpenAPI fetch failed: ${specResp.status}`);
        if (!fnResp.ok) throw new Error(`Functions fetch failed: ${fnResp.status}`);

        const spec = (await specResp.json()) as OpenApiSpec;
        const functions = (await fnResp.json()) as PluginFunction[];

        const routeRows = parseOpenApi(spec);
        const pluginAuth = getCatchAllAuth(spec);
        const pluginRows = parsePlugins(functions, pluginAuth);
        setEndpoints([...routeRows, ...pluginRows]);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const groups = useMemo(() => {
    const set = new Set(endpoints.map((e) => e.group));
    return ['all', ...Array.from(set).sort()];
  }, [endpoints]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return endpoints.filter((row) => {
      if (sourceFilter !== 'all' && row.source !== sourceFilter) return false;
      if (groupFilter !== 'all' && row.group !== groupFilter) return false;
      if (!q) return true;
      return [row.method, row.path, row.group, row.summary, row.auth, row.source]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [endpoints, search, sourceFilter, groupFilter]);

  const routeCount = endpoints.filter((e) => e.source === 'route').length;
  const pluginCount = endpoints.filter((e) => e.source === 'plugin').length;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {error && <ErrorAlert message={error} />}
      {loading && !error && (
        <p className="p-4 text-sm text-muted-foreground">Loading API endpoints...</p>
      )}

      {!loading && !error && (
        <>
          {/* Summary + Filters — pinned */}
          <div className="space-y-3 px-3 pt-3 md:px-4 md:pt-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{endpoints.length} endpoints</span>
              <span>{routeCount} routes</span>
              <span>{pluginCount} plugins</span>
            </div>

            <div className="grid gap-2 md:grid-cols-[1fr_160px_180px]">
              <input
                className={inputClass}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                placeholder="Search method, path, group, summary..."
              />
              <select
                className={inputClass}
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.currentTarget.value as typeof sourceFilter)}
              >
                <option value="all">All sources</option>
                <option value="route">Routes only</option>
                <option value="plugin">Plugins only</option>
              </select>
              <select
                className={inputClass}
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.currentTarget.value)}
              >
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g === 'all' ? 'All groups' : g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table — scrolls within container */}
          <div className="min-h-0 flex-1 px-3 pb-3 pt-3 md:px-4 md:pb-4">
            <ScrollArea className="h-full rounded-md border border-border">
              <table className="min-w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-[1] bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="w-[70px] px-3 py-2 font-medium">Method</th>
                    <th className="px-3 py-2 font-medium">Path</th>
                    <th className="w-[100px] px-3 py-2 font-medium">Group</th>
                    <th className="px-3 py-2 font-medium">Summary</th>
                    <th className="w-[100px] px-3 py-2 font-medium">Auth</th>
                    <th className="w-[70px] px-3 py-2 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => (
                    <tr
                      key={`${row.method}-${row.path}`}
                      className={cn(
                        'border-t border-border align-top hover:bg-accent/40',
                        i % 2 === 0 && 'bg-muted/20',
                      )}
                    >
                      <td className={cn('whitespace-nowrap px-3 py-2 font-mono font-semibold', METHOD_COLORS[row.method])}>
                        {row.method}
                      </td>
                      <td className="px-3 py-2 font-mono text-foreground">{row.path}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.group}</td>
                      <td className="max-w-[400px] truncate px-3 py-2 text-muted-foreground" title={row.summary}>
                        {row.summary}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            'inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
                            row.auth === 'none' && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                            row.auth === 'bearer' && 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                            row.auth === 'platform_admin' && 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
                          )}
                        >
                          {row.auth}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            'inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
                            row.source === 'route' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
                            row.source === 'plugin' && 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
                          )}
                        >
                          {row.source}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">No endpoints match current filters.</p>
              )}
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}
