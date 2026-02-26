import { useEffect, useMemo, useState } from 'react';
import { IconAlertTriangle, IconLock, IconPlayerPlay } from '@tabler/icons-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import FlowCanvas from '@/components/flows/FlowCanvas';
import FlowWorkbench from '@/components/flows/FlowWorkbench';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import {
  buildDependencyItems,
  buildRevisionItems,
  computeFlowMetrics,
  estimatePeakConcurrency,
  filterRunsByTimeRange,
  type FlowDependencyProject,
  type FlowDocumentSummary,
  type FlowRunSummary,
} from './flowInsights';
import {
  DEFAULT_FLOW_TIME_RANGE,
  getPreferredFlowTab,
  shouldApplyDefaultTimeRange,
} from './flowRouteState';
import './FlowDetail.css';

const FLOW_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'topology', label: 'Topology' },
  { value: 'executions', label: 'Executions' },
  { value: 'edit', label: 'Edit' },
  { value: 'revisions', label: 'Revisions' },
  { value: 'triggers', label: 'Triggers' },
  { value: 'logs', label: 'Logs' },
  { value: 'metrics', label: 'Metrics' },
  { value: 'dependencies', label: 'Dependencies' },
  { value: 'concurrency', label: 'Concurrency' },
  { value: 'auditlogs', label: 'Audit Logs' },
] as const;

type FlowTab = (typeof FLOW_TABS)[number]['value'];
const FLOW_TAB_VALUES = FLOW_TABS.map((tab) => tab.value) as readonly FlowTab[];
const FLOW_DEFAULT_TAB_STORAGE_KEY = 'flowDefaultTab';

function isFlowTab(value: string | undefined): value is FlowTab {
  return FLOW_TABS.some((tab) => tab.value === value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatDurationMs(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return 'n/a';
  const minutes = Math.round(value / 60000);
  if (minutes < 1) return '<1 min';
  return `${minutes} min`;
}

function timeRangeFromSearch(searchParams: URLSearchParams): string | null {
  return searchParams.get('filters[timeRange][EQUALS]');
}

export default function FlowDetail() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { flowId, tab } = useParams<{ flowId: string; tab?: string }>();
  const [flowName, setFlowName] = useState('Flow');
  const [namespace, setNamespace] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [projectUpdatedAt, setProjectUpdatedAt] = useState<string | null>(null);
  const [flowDescription, setFlowDescription] = useState<string | null>(null);
  const [isDeleted] = useState(false);
  const [isAllowedToEdit] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<FlowDocumentSummary[]>([]);
  const [runs, setRuns] = useState<FlowRunSummary[]>([]);
  const [workspaceProjects, setWorkspaceProjects] = useState<FlowDependencyProject[]>([]);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [runNotice, setRunNotice] = useState<string | null>(null);

  const activeTab: FlowTab = useMemo(() => {
    const storedTab = typeof window === 'undefined' ? null : window.localStorage.getItem(FLOW_DEFAULT_TAB_STORAGE_KEY);
    return getPreferredFlowTab(tab, storedTab, FLOW_TAB_VALUES, 'overview');
  }, [tab]);

  const searchSuffix = useMemo(() => {
    const serialized = searchParams.toString();
    return serialized.length > 0 ? `?${serialized}` : '';
  }, [searchParams]);

  useEffect(() => {
    if (!flowId) {
      navigate('/app/flows', { replace: true });
      return;
    }
    if (tab !== activeTab) {
      navigate(`/app/flows/${flowId}/${activeTab}${searchSuffix}`, { replace: true });
      return;
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(FLOW_DEFAULT_TAB_STORAGE_KEY, activeTab);
    }
  }, [activeTab, flowId, navigate, searchSuffix, tab]);

  useEffect(() => {
    if (!shouldApplyDefaultTimeRange(activeTab, searchParams)) return;
    const next = new URLSearchParams(searchParams);
    next.set('filters[timeRange][EQUALS]', DEFAULT_FLOW_TIME_RANGE);
    setSearchParams(next, { replace: true });
  }, [activeTab, searchParams, setSearchParams]);

  useEffect(() => {
    if (!flowId) return;
    let cancelled = false;

    const load = async () => {
      setError(null);
      const { data, error: queryError } = await supabase
        .from(TABLES.projects)
        .select('project_name, workspace_id, description, updated_at')
        .eq('project_id', flowId)
        .maybeSingle();

      if (cancelled) return;
      if (queryError) {
        setError(queryError.message);
        return;
      }

      const row = (data as {
        project_name?: string;
        workspace_id?: string | null;
        description?: string | null;
        updated_at?: string | null;
      } | null);

      setFlowName(String(row?.project_name ?? `Flow ${flowId.slice(0, 8)}`));
      setWorkspaceId(row?.workspace_id ?? null);
      setNamespace(String(row?.workspace_id ?? 'default'));
      setFlowDescription(row?.description ?? null);
      setProjectUpdatedAt(row?.updated_at ?? null);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [flowId]);

  useEffect(() => {
    if (!flowId) return;
    let cancelled = false;

    const loadRuns = async () => {
      setRunsError(null);
      const { data: docs, error: docsError } = await supabase
        .from(TABLES.documents)
        .select('source_uid, doc_title, status, uploaded_at, source_type, conv_uid')
        .eq('project_id', flowId)
        .order('uploaded_at', { ascending: false })
        .limit(300);

      if (cancelled) return;
      if (docsError) {
        setRunsError(docsError.message);
        return;
      }

      const nextDocuments: FlowDocumentSummary[] = (docs ?? []).map((row) => {
        const item = row as Record<string, unknown>;
        return {
          source_uid: String(item.source_uid ?? ''),
          doc_title: String(item.doc_title ?? item.source_uid ?? 'Untitled document'),
          status: String(item.status ?? 'uploaded'),
          uploaded_at: String(item.uploaded_at ?? new Date(0).toISOString()),
          source_type: String(item.source_type ?? 'document'),
        };
      });
      setDocuments(nextDocuments);

      const convUids = Array.from(
        new Set(
          (docs ?? [])
            .map((row) => (row as { conv_uid?: string | null }).conv_uid ?? null)
            .filter((value): value is string => typeof value === 'string' && value.length > 0),
        ),
      );
      if (convUids.length === 0) {
        setRuns([]);
        return;
      }

      const { data: runRows, error: runError } = await supabase
        .from(TABLES.runs)
        .select('run_id, status, started_at, completed_at, total_blocks, completed_blocks, failed_blocks, conv_uid')
        .in('conv_uid', convUids)
        .order('started_at', { ascending: false })
        .limit(300);

      if (cancelled) return;
      if (runError) {
        setRunsError(runError.message);
        return;
      }

      setRuns((runRows ?? []) as FlowRunSummary[]);
    };

    void loadRuns();
    return () => {
      cancelled = true;
    };
  }, [flowId]);

  useEffect(() => {
    if (!workspaceId || !flowId) {
      setWorkspaceProjects([]);
      return;
    }
    let cancelled = false;

    const loadWorkspaceProjects = async () => {
      setDependencyError(null);
      const { data, error: workspaceError } = await supabase
        .from(TABLES.projects)
        .select('project_id, project_name, updated_at')
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false })
        .limit(200);

      if (cancelled) return;
      if (workspaceError) {
        setDependencyError(workspaceError.message);
        return;
      }

      setWorkspaceProjects((data ?? []) as FlowDependencyProject[]);
    };

    void loadWorkspaceProjects();
    return () => {
      cancelled = true;
    };
  }, [flowId, workspaceId]);

  const timeRangeValue = useMemo(() => timeRangeFromSearch(searchParams), [searchParams]);
  const scopedRuns = useMemo(
    () => filterRunsByTimeRange(runs, timeRangeValue),
    [runs, timeRangeValue],
  );
  const metrics = useMemo(() => computeFlowMetrics(scopedRuns), [scopedRuns]);
  const revisions = useMemo(
    () => buildRevisionItems(documents, scopedRuns, projectUpdatedAt),
    [documents, projectUpdatedAt, scopedRuns],
  );
  const dependencies = useMemo(
    () => buildDependencyItems(flowId ?? '', workspaceProjects),
    [flowId, workspaceProjects],
  );
  const peakConcurrency = useMemo(() => estimatePeakConcurrency(scopedRuns), [scopedRuns]);
  const derivedAuditItems = useMemo(
    () => revisions.filter((item) => item.type === 'flow-update' || item.type === 'run-complete' || item.type === 'document-status'),
    [revisions],
  );

  const activeTabLabel = useMemo(
    () => FLOW_TABS.find((item) => item.value === activeTab)?.label ?? activeTab,
    [activeTab],
  );

  useShellHeaderTitle({
    title: flowName,
    subtitle: `Flows/${flowName}/${activeTabLabel}`,
  });

  if (!flowId) return null;

  return (
    <section className="flow-detail-shell">
      <header className="flow-detail-topbar">
        <div className="flow-detail-topbar-main">
          <p className="flow-detail-breadcrumb">Flows / {namespace ?? 'default'}</p>
          <h1 className="flow-detail-title">
            {isDeleted ? <IconAlertTriangle size={16} className="text-amber-500" /> : null}
            {!isDeleted && !isAllowedToEdit ? <IconLock size={16} className="text-slate-500" /> : null}
            <span>{flowName}</span>
          </h1>
        </div>
        <div className="flow-detail-topbar-actions">
          <button
            type="button"
            className="flow-action-btn"
            onClick={() => {
              const now = new Date().toLocaleString();
              setRunNotice(`Manual run requested at ${now}.`);
            }}
          >
            <IconPlayerPlay size={14} />
            <span>Run</span>
          </button>
        </div>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (!value || !isFlowTab(value)) return;
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(FLOW_DEFAULT_TAB_STORAGE_KEY, value);
          }
          navigate(`/app/flows/${flowId}/${value}${searchSuffix}`);
        }}
        className="flow-detail-tabs flex min-h-0 flex-col"
      >
        <TabsList
          aria-label="Flow sections"
          className="flow-detail-tabs-row flex h-10 min-h-10 w-full items-stretch overflow-x-auto border-b border-slate-300/90 bg-slate-100/95 dark:border-slate-700/80 dark:bg-slate-950/80"
        >
          {FLOW_TABS.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="inline-flex h-10 shrink-0 items-center border-r border-slate-300/80 px-4 text-[12px] font-medium leading-none whitespace-nowrap text-slate-600 transition-colors first:border-l first:border-l-slate-300/80 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700/80 dark:text-slate-300 dark:first:border-l-slate-700/80 dark:hover:bg-slate-900/60 dark:hover:text-slate-50 data-[selected]:-mb-px data-[selected]:border-b data-[selected]:border-b-white data-[selected]:border-t-2 data-[selected]:border-t-[color:var(--flow-accent)] data-[selected]:bg-white data-[selected]:text-slate-950 dark:data-[selected]:border-b-slate-900 dark:data-[selected]:bg-slate-900 dark:data-[selected]:text-white"
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {error ? (
          <div
            role="alert"
            className="mx-4 mt-4 rounded-md border border-red-300/80 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/50 dark:text-red-200"
          >
            {error}
          </div>
        ) : null}
        {runNotice ? (
          <div className="mx-4 mt-2 rounded-md border border-emerald-300/70 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-200">
            {runNotice}
          </div>
        ) : null}

        {FLOW_TABS.map((item) => (
          <TabsContent key={item.value} value={item.value} className="flow-detail-tab-panel p-4">
            {item.value === 'topology' ? (
              <div className="flow-detail-panel-placeholder rounded-md border border-slate-300/80 bg-white/95 p-0 dark:border-slate-700/70 dark:bg-slate-900/80">
                <FlowCanvas />
              </div>
            ) : item.value === 'edit' ? (
              <FlowWorkbench
                flowId={flowId}
                flowName={flowName}
                namespace={namespace ?? 'default'}
              />
            ) : item.value === 'overview' ? (
              <div className="flow-detail-panel-placeholder rounded-md border border-slate-300/80 bg-white/95 p-4 dark:border-slate-700/70 dark:bg-slate-900/80">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Namespace</p>
                    <p className="text-sm font-semibold">{namespace ?? 'default'}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Total Executions</p>
                    <p className="text-sm font-semibold">{scopedRuns.length}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Success Rate</p>
                    <p className="text-sm font-semibold">{formatPercent(metrics.successRate)}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Documents</p>
                    <p className="text-sm font-semibold">{documents.length}</p>
                  </div>
                </div>
                {flowDescription ? (
                  <p className="mt-3 text-sm text-muted-foreground">{flowDescription}</p>
                ) : null}
                <div className="mt-4 space-y-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent executions</h3>
                  {scopedRuns.slice(0, 5).map((run) => (
                    <div key={run.run_id} className="rounded-md border border-border bg-background px-3 py-2 text-xs">
                      <span className="font-medium">{run.status}</span> - <span>{new Date(run.started_at).toLocaleString()}</span>
                    </div>
                  ))}
                  {scopedRuns.length === 0 ? <p className="text-sm text-muted-foreground">No executions yet.</p> : null}
                </div>
              </div>
            ) : item.value === 'executions' ? (
              <div className="flow-detail-panel-placeholder rounded-md border border-slate-300/80 bg-white/95 p-4 dark:border-slate-700/70 dark:bg-slate-900/80">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Executions</h3>
                  {runsError ? <p className="text-sm text-red-600 dark:text-red-300">{runsError}</p> : null}
                  {scopedRuns.map((run) => (
                    <div key={run.run_id} className="rounded-md border border-border bg-background px-3 py-2 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{run.run_id}</span>
                        <span>{run.status}</span>
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        Started {new Date(run.started_at).toLocaleString()}
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        Blocks: {run.completed_blocks ?? 0}/{run.total_blocks ?? 0} - Failed: {run.failed_blocks ?? 0}
                      </div>
                    </div>
                  ))}
                  {scopedRuns.length === 0 ? <p className="text-sm text-muted-foreground">No executions yet.</p> : null}
                </div>
              </div>
            ) : item.value === 'revisions' ? (
              <div className="flow-detail-panel-placeholder rounded-md border border-slate-300/80 bg-white/95 p-4 dark:border-slate-700/70 dark:bg-slate-900/80">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Revision timeline</h3>
                <div className="mt-3 space-y-2">
                  {revisions.slice(0, 40).map((entry) => (
                    <div key={entry.id} className="rounded-md border border-border bg-background px-3 py-2 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{entry.title}</span>
                        <span>{new Date(entry.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="mt-1 text-muted-foreground">{entry.detail}</div>
                    </div>
                  ))}
                  {revisions.length === 0 ? <p className="text-sm text-muted-foreground">No revision activity yet.</p> : null}
                </div>
              </div>
            ) : item.value === 'triggers' ? (
              <div className="flow-detail-panel-placeholder rounded-md border border-slate-300/80 bg-white/95 p-4 dark:border-slate-700/70 dark:bg-slate-900/80">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Triggers</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Manual trigger</p>
                    <p className="text-sm font-semibold">Enabled</p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Document upload trigger</p>
                    <p className="text-sm font-semibold">{documents.length > 0 ? 'Detected' : 'Idle'}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Schedule trigger</p>
                    <p className="text-sm font-semibold">Not configured</p>
                  </div>
                </div>
              </div>
            ) : item.value === 'logs' ? (
              <div className="flow-detail-panel-placeholder rounded-md border border-slate-300/80 bg-white/95 p-4 dark:border-slate-700/70 dark:bg-slate-900/80">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Flow logs</h3>
                <div className="mt-3 space-y-2">
                  {revisions.slice(0, 60).map((entry) => (
                    <div key={`log-${entry.id}`} className="rounded-md border border-border bg-background px-3 py-2 text-xs">
                      <div className="text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</div>
                      <div className="mt-1">
                        <span className="font-medium">{entry.type}</span> - {entry.detail}
                      </div>
                    </div>
                  ))}
                  {revisions.length === 0 ? <p className="text-sm text-muted-foreground">No log events yet.</p> : null}
                </div>
              </div>
            ) : item.value === 'metrics' ? (
              <div className="flow-detail-panel-placeholder rounded-md border border-slate-300/80 bg-white/95 p-4 dark:border-slate-700/70 dark:bg-slate-900/80">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Execution metrics</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-4">
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Running now</p>
                    <p className="text-sm font-semibold">{metrics.runningRuns}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Successful</p>
                    <p className="text-sm font-semibold">{metrics.successRuns}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Failed</p>
                    <p className="text-sm font-semibold">{metrics.failedRuns}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Avg duration</p>
                    <p className="text-sm font-semibold">{formatDurationMs(metrics.avgDurationMs)}</p>
                  </div>
                </div>
              </div>
            ) : item.value === 'dependencies' ? (
              <div className="flow-detail-panel-placeholder rounded-md border border-slate-300/80 bg-white/95 p-4 dark:border-slate-700/70 dark:bg-slate-900/80">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Workspace dependencies</h3>
                {dependencyError ? <p className="mt-2 text-sm text-red-600 dark:text-red-300">{dependencyError}</p> : null}
                <div className="mt-3 space-y-2">
                  {dependencies.map((project) => (
                    <div key={project.project_id} className="rounded-md border border-border bg-background px-3 py-2 text-xs">
                      <div className="font-medium">{project.project_name}</div>
                      <div className="text-muted-foreground">Updated {new Date(project.updated_at).toLocaleString()}</div>
                    </div>
                  ))}
                  {dependencies.length === 0 ? <p className="text-sm text-muted-foreground">No sibling flows in this workspace.</p> : null}
                </div>
              </div>
            ) : item.value === 'concurrency' ? (
              <div className="flow-detail-panel-placeholder rounded-md border border-slate-300/80 bg-white/95 p-4 dark:border-slate-700/70 dark:bg-slate-900/80">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Concurrency</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Active runs</p>
                    <p className="text-sm font-semibold">{metrics.runningRuns}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Peak observed</p>
                    <p className="text-sm font-semibold">{peakConcurrency}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Window</p>
                    <p className="text-sm font-semibold">{timeRangeValue ?? DEFAULT_FLOW_TIME_RANGE}</p>
                  </div>
                </div>
              </div>
            ) : item.value === 'auditlogs' ? (
              <div className="flow-detail-panel-placeholder rounded-md border border-slate-300/80 bg-white/95 p-4 dark:border-slate-700/70 dark:bg-slate-900/80">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Audit log</h3>
                <div className="mt-3 space-y-2">
                  {derivedAuditItems.slice(0, 40).map((entry) => (
                    <div key={`audit-${entry.id}`} className="rounded-md border border-border bg-background px-3 py-2 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{entry.type}</span>
                        <span>{new Date(entry.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="mt-1 text-muted-foreground">{entry.detail}</div>
                    </div>
                  ))}
                  {derivedAuditItems.length === 0 ? <p className="text-sm text-muted-foreground">No audit events yet.</p> : null}
                </div>
              </div>
            ) : (
              <div className="flow-detail-panel-placeholder rounded-md border border-slate-300/80 bg-white/95 p-4 dark:border-slate-700/70 dark:bg-slate-900/80">
                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.label}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Shared flow tab structure placeholder.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Flow ID: {flowId}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Namespace: {namespace ?? 'default'}
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
