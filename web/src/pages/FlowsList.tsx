import { useEffect, useMemo, useState } from 'react';
import { IconClock, IconExternalLink, IconSearch } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { PageHeader } from '@/components/common/PageHeader';
import { PROJECT_FOCUS_STORAGE_KEY } from '@/lib/projectFocus';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const FLOW_LIST_LIMIT = 500;

type FlowListRow = {
  project_id: string;
  flow_id: string;
  namespace: string;
  revision: number;
  updated_at: string | null;
  project_name: string | null;
  synthetic: boolean;
};

type ProjectRow = {
  project_id: string;
  project_name: string | null;
  updated_at: string | null;
};

function readFocusedProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(PROJECT_FOCUS_STORAGE_KEY);
  const value = raw?.trim() ?? '';
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed === 'string' && parsed.trim().length > 0) return parsed.trim();
  } catch {
    // Keep non-JSON storage format for backward compatibility.
  }
  return value;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleString();
}

function syntheticFlowId(projectName: string | null, projectId: string): string {
  const trimmed = (projectName ?? '').trim().toLowerCase();
  if (trimmed.length === 0) return `flow-${projectId.slice(0, 8)}`;
  const slug = trimmed
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug.length > 0 ? slug : `flow-${projectId.slice(0, 8)}`;
}

function parseYamlScalar(source: string, key: 'id' | 'namespace'): string | null {
  const pattern = new RegExp(`^\\s*${key}\\s*:\\s*([^\\n#]+?)\\s*$`, 'm');
  const match = source.match(pattern);
  if (!match) return null;
  return match[1]?.trim().replace(/^['"]|['"]$/g, '') ?? null;
}

function parseFlowSource(source: string): { flowId: string; namespace: string } {
  const flowId = parseYamlScalar(source, 'id') ?? '';
  const namespace = parseYamlScalar(source, 'namespace') ?? 'default';
  return {
    flowId: flowId.length > 0 ? flowId : 'unknown',
    namespace: namespace.length > 0 ? namespace : 'default',
  };
}

function readJoinedProjectName(value: unknown): string | null {
  if (Array.isArray(value)) {
    const first = value[0] as { project_name?: unknown } | undefined;
    return typeof first?.project_name === 'string' && first.project_name.trim().length > 0
      ? first.project_name.trim()
      : null;
  }
  if (value && typeof value === 'object') {
    const maybe = value as { project_name?: unknown };
    return typeof maybe.project_name === 'string' && maybe.project_name.trim().length > 0
      ? maybe.project_name.trim()
      : null;
  }
  return null;
}

export default function FlowsList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<FlowListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadRows = async () => {
      setLoading(true);
      setError(null);

      const projectsQuery = await supabase
        .from('projects')
        .select('project_id, project_name, updated_at')
        .order('updated_at', { ascending: false })
        .limit(FLOW_LIST_LIMIT);

      if (cancelled) return;

      if (projectsQuery.error) {
        setRows([]);
        setError(projectsQuery.error.message);
        setLoading(false);
        return;
      }

      const projectRows = (projectsQuery.data ?? []) as ProjectRow[];
      const focusedProjectId = readFocusedProjectId();
      const targetProject = (
        projectRows.find((project) => project.project_id === focusedProjectId)
        ?? projectRows.find((project) => project.project_name?.trim().toLowerCase() === 'default project')
        ?? projectRows[0]
        ?? null
      );

      if (!targetProject) {
        setRows([]);
        setLoading(false);
        return;
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(PROJECT_FOCUS_STORAGE_KEY, targetProject.project_id);
      }

      const selectBase = 'project_id, source, revision, created_at, updated_at';
      const withProject = await supabase
        .from('flow_sources')
        .select(`${selectBase}, projects(project_name)`)
        .eq('project_id', targetProject.project_id)
        .maybeSingle();

      let rowData = withProject.data as Record<string, unknown> | null;
      let queryError = withProject.error;

      if (queryError) {
        const fallback = await supabase
          .from('flow_sources')
          .select(selectBase)
          .eq('project_id', targetProject.project_id)
          .maybeSingle();
        rowData = fallback.data as Record<string, unknown> | null;
        queryError = fallback.error;
      }

      if (cancelled) return;

      if (queryError) {
        queryError = null;
        rowData = null;
      }

      const nextRows: FlowListRow[] = rowData ? [rowData].map((row) => {
        const source = String(row.source ?? '');
        const { flowId, namespace } = parseFlowSource(source);
        const revisionRaw = Number(row.revision);
        const revision = Number.isFinite(revisionRaw) && revisionRaw > 0 ? revisionRaw : 1;

        return {
          project_id: String(row.project_id ?? ''),
          flow_id: flowId,
          namespace,
          revision,
          updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
          project_name: readJoinedProjectName(row.projects) ?? targetProject.project_name ?? null,
          synthetic: false,
        };
      }).filter((row) => row.project_id.length > 0) : [{
          project_id: targetProject.project_id,
          flow_id: syntheticFlowId(targetProject.project_name ?? null, targetProject.project_id),
          namespace: 'default',
          revision: 1,
          updated_at: typeof targetProject.updated_at === 'string' ? targetProject.updated_at : null,
          project_name: targetProject.project_name ?? null,
          synthetic: true,
      }];

      setRows(nextRows);
      setLoading(false);
    };

    void loadRows();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return rows;

    return rows.filter((row) => (
      row.flow_id.toLowerCase().includes(trimmed)
      || row.namespace.toLowerCase().includes(trimmed)
      || row.project_id.toLowerCase().includes(trimmed)
      || (row.project_name ?? '').toLowerCase().includes(trimmed)
    ));
  }, [query, rows]);

  const openFlow = (projectId: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PROJECT_FOCUS_STORAGE_KEY, projectId);
    }
    navigate(`/app/flows/${projectId}/overview`);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeader title="Flows" subtitle="Browse and open saved flows." />

      {error ? <ErrorAlert message={error} /> : null}

      <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
          <label className="relative min-w-0 flex-1">
            <IconSearch
              size={14}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search flows"
              className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-2 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </label>
          <span className="shrink-0 text-xs text-muted-foreground">
            {filteredRows.length} of {rows.length}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No flows found.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 font-medium">Flow ID</th>
                  <th className="px-3 py-2 font-medium">Namespace</th>
                  <th className="px-3 py-2 font-medium">Revision</th>
                  <th className="px-3 py-2 font-medium">Project</th>
                  <th className="px-3 py-2 font-medium">Updated</th>
                  <th className="px-3 py-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.project_id}
                    onDoubleClick={() => openFlow(row.project_id)}
                    className={cn('border-b border-border/60 hover:bg-accent/50')}
                  >
                    <td className="px-3 py-2 align-middle">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground" title={row.flow_id}>
                          {row.flow_id}
                        </div>
                        {row.synthetic ? (
                          <div className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400">
                            mock
                          </div>
                        ) : null}
                        <div className="truncate text-xs text-muted-foreground" title={row.project_id}>
                          {row.project_id}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-muted-foreground">
                      {row.namespace}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-foreground">
                      r{row.revision}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-muted-foreground">
                      {row.project_name ?? '--'}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <IconClock size={12} />
                        {formatDate(row.updated_at)}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-middle text-right">
                      <button
                        type="button"
                        onClick={() => openFlow(row.project_id)}
                        className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-accent"
                      >
                        <IconExternalLink size={12} />
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
