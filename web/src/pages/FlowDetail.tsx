import { useEffect, useMemo, useState } from 'react';
import { IconLock } from '@tabler/icons-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import FlowCanvas from '@/components/flows/FlowCanvas';
import FlowWorkbench from '@/components/flows/FlowWorkbench';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { edgeJson } from '@/lib/edge';
import { fetchAllProjectDocuments } from '@/lib/projectDocuments';
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

type FlowTabConfig = {
  value: string;
  label: string;
  locked?: boolean;
};

const FLOW_TABS: readonly FlowTabConfig[] = [
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
  { value: 'auditlogs', label: 'Audit Logs', locked: true },
] as const;

type FlowTab = (typeof FLOW_TABS)[number]['value'];
const LOCKED_FLOW_TAB_VALUES = FLOW_TABS
  .filter((tab) => tab.locked)
  .map((tab) => tab.value) as readonly FlowTab[];
const OPEN_FLOW_TAB_VALUES = FLOW_TABS
  .filter((tab) => !tab.locked)
  .map((tab) => tab.value) as readonly FlowTab[];
const FLOW_DEFAULT_TAB_STORAGE_KEY = 'flowDefaultTab';

function isFlowTab(value: string | undefined): value is FlowTab {
  return FLOW_TABS.some((tab) => tab.value === value);
}

function isLockedFlowTab(value: string | undefined): value is FlowTab {
  return Boolean(value) && LOCKED_FLOW_TAB_VALUES.some((tab) => tab === value);
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

type FlowMetadataResponse = {
  id?: string;
  namespace?: string;
  revision?: number;
  description?: string | null;
  deleted?: boolean;
  disabled?: boolean;
  triggers?: Array<Record<string, unknown>>;
  labels?: Array<{
    key?: string;
    value?: string;
  }>;
  updated_at?: string | null;
};

type FlowTriggerSummary = {
  id: string;
  type: string;
  workerId: string | null;
  nextExecutionDate: string | null;
  disabled: boolean;
};

function isSuppressedFlowMetadataError(message: string): boolean {
  return /^Network request failed \(flows\/default\/[^)]+\)\.$/.test(message);
}

function toTriggerTypeLabel(type: string): string {
  const trimmed = type.trim();
  if (trimmed.length === 0) return 'Unknown';
  const parts = trimmed.split('.');
  return parts[parts.length - 1] ?? trimmed;
}

function toFlowTriggers(input: FlowMetadataResponse['triggers']): FlowTriggerSummary[] {
  if (!Array.isArray(input)) return [];
  return input.map((entry, index) => {
    const idRaw = entry.id;
    const typeRaw = entry.type;
    const workerIdRaw = entry.workerId ?? entry.worker_id ?? null;
    const nextExecutionRaw = entry.nextExecutionDate ?? entry.next_execution_date ?? null;
    return {
      id: typeof idRaw === 'string' && idRaw.trim().length > 0 ? idRaw : `trigger-${index + 1}`,
      type: typeof typeRaw === 'string' ? typeRaw : 'Unknown',
      workerId: typeof workerIdRaw === 'string' && workerIdRaw.trim().length > 0 ? workerIdRaw : null,
      nextExecutionDate: typeof nextExecutionRaw === 'string' && nextExecutionRaw.trim().length > 0
        ? nextExecutionRaw
        : null,
      disabled: Boolean(entry.disabled),
    };
  });
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
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<FlowDocumentSummary[]>([]);
  const [runs, setRuns] = useState<FlowRunSummary[]>([]);
  const [workspaceProjects, setWorkspaceProjects] = useState<FlowDependencyProject[]>([]);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [dependencyError, setDependencyError] = useState<string | null>(null);
  const [flowTriggers, setFlowTriggers] = useState<FlowTriggerSummary[]>([]);
  const [triggerQuery, setTriggerQuery] = useState('');
  const [topologyResetNonce, setTopologyResetNonce] = useState(0);

  const activeTab: FlowTab = useMemo(() => {
    const storedTab = typeof window === 'undefined' ? null : window.localStorage.getItem(FLOW_DEFAULT_TAB_STORAGE_KEY);
    if (isLockedFlowTab(tab)) return tab;
    return getPreferredFlowTab(tab, storedTab, OPEN_FLOW_TAB_VALUES, 'overview');
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
    if (typeof window !== 'undefined' && !isLockedFlowTab(activeTab)) {
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
    if (activeTab !== 'topology') return;
    // Remount canvas when entering Topology so it resets to default layout.
    setTopologyResetNonce((current) => current + 1);
  }, [activeTab, flowId]);

  useEffect(() => {
    if (!flowId) return;
    let cancelled = false;

    const load = async () => {
      setError(null);
      try {
        const metadata = await edgeJson<FlowMetadataResponse>(`flows/default/${encodeURIComponent(flowId)}`);
        if (cancelled) return;

        const flowNameFromLabel = (metadata.labels ?? []).find((label) =>
          label.key === 'name' && typeof label.value === 'string' && label.value.trim().length > 0
        )?.value?.trim();

        const resolvedNamespace = (typeof metadata.namespace === 'string' && metadata.namespace.length > 0)
          ? metadata.namespace
          : 'default';
        setFlowName(flowNameFromLabel ?? `Flow ${flowId.slice(0, 8)}`);
        setWorkspaceId(resolvedNamespace === 'default' ? null : resolvedNamespace);
        setNamespace(resolvedNamespace);
        setFlowDescription(metadata.description ?? null);
        setProjectUpdatedAt(typeof metadata.updated_at === 'string' ? metadata.updated_at : null);
        setFlowTriggers(toFlowTriggers(metadata.triggers));
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        if (isSuppressedFlowMetadataError(message)) {
          setError(null);
          setFlowTriggers([]);
          return;
        }
        setError(message);
        setFlowTriggers([]);
      }
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
      let docs: Array<Record<string, unknown>> = [];
      try {
        docs = await fetchAllProjectDocuments<Record<string, unknown>>({
          projectId: flowId,
          select: 'source_uid, doc_title, status, uploaded_at, source_type, conv_uid',
        });
      } catch (error) {
        if (cancelled) return;
        setRunsError(error instanceof Error ? error.message : String(error));
        return;
      }

      if (cancelled) return;

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
  const dependenciesTabCount = dependencies.length;
  const filteredTriggers = useMemo(() => {
    const needle = triggerQuery.trim().toLowerCase();
    if (needle.length === 0) return flowTriggers;
    return flowTriggers.filter((trigger) =>
      trigger.id.toLowerCase().includes(needle) ||
      trigger.type.toLowerCase().includes(needle) ||
      (trigger.workerId ?? '').toLowerCase().includes(needle),
    );
  }, [flowTriggers, triggerQuery]);
  const peakConcurrency = useMemo(() => estimatePeakConcurrency(scopedRuns), [scopedRuns]);

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
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (!value || !isFlowTab(value)) return;
          if (isLockedFlowTab(value)) return;
          if (value === 'dependencies' && dependenciesTabCount === 0) return;
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(FLOW_DEFAULT_TAB_STORAGE_KEY, value);
          }
          navigate(`/app/flows/${flowId}/${value}${searchSuffix}`);
        }}
        className="flow-detail-tabs flex min-h-0 flex-col"
      >
        <TabsList
          aria-label="Flow sections"
          className="flow-detail-tabs-row flex h-10 min-h-10 w-full items-stretch overflow-x-auto bg-card shadow-[inset_0_-1px_0_var(--border)]"
        >
          {FLOW_TABS.map((item) => {
            const isLocked = Boolean(item.locked);
            const isDependenciesTab = item.value === 'dependencies';
            const isDisabled = isLocked || (isDependenciesTab && dependenciesTabCount === 0);
            const label = isDependenciesTab && dependenciesTabCount > 0
              ? `${item.label} (${dependenciesTabCount})`
              : item.label;
            return (
              <TabsTrigger
                key={item.value}
                value={item.value}
                disabled={isDisabled}
                aria-disabled={isDisabled}
                className="inline-flex h-full shrink-0 items-center gap-1 border-r border-border px-3 text-xs font-medium leading-none whitespace-nowrap text-muted-foreground transition-colors first:border-l first:border-l-border hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground data-[selected]:bg-background data-[selected]:text-foreground"
              >
                <span>{label}</span>
                {isLocked ? <IconLock size={11} aria-hidden /> : null}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {error ? (
          <div
            role="alert"
            className="mx-4 mt-4 flex items-start justify-between gap-3 rounded-md border border-red-300/80 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/50 dark:text-red-200"
          >
            <span>{error}</span>
            <button
              type="button"
              aria-label="Dismiss flow error"
              className="shrink-0 rounded border border-red-300/80 px-1.5 py-0.5 text-xs text-red-700 hover:bg-red-100 dark:border-red-400/40 dark:text-red-200 dark:hover:bg-red-900/40"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {FLOW_TABS.map((item) => (
          <TabsContent key={item.value} value={item.value} className="flow-detail-tab-panel p-4">
            {item.value === 'topology' ? (
              <div className="flow-detail-panel-placeholder rounded-md border border-slate-300/80 bg-white/95 p-0 dark:border-slate-700/70 dark:bg-slate-900/80">
                <FlowCanvas key={`topology-canvas:${flowId}:${topologyResetNonce}`} />
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
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Triggers</h3>
                  <button
                    type="button"
                    className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                    onClick={() => navigate(`/app/flows/${flowId}/edit`)}
                  >
                    Add trigger
                  </button>
                </div>
                {flowTriggers.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No triggers configured for this flow.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    <input
                      aria-label="Filter triggers"
                      value={triggerQuery}
                      onChange={(event) => setTriggerQuery(event.currentTarget.value)}
                      placeholder="Filter triggers"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    {filteredTriggers.map((trigger) => (
                      <div key={trigger.id} className="rounded-md border border-border bg-background px-3 py-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <code className="font-medium">{trigger.id}</code>
                          <span className={trigger.disabled ? 'text-amber-600 dark:text-amber-300' : 'text-emerald-600 dark:text-emerald-300'}>
                            {trigger.disabled ? 'Disabled' : 'Enabled'}
                          </span>
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          Type: {toTriggerTypeLabel(trigger.type)}
                        </div>
                        {trigger.workerId ? (
                          <div className="mt-1 text-muted-foreground">Worker: {trigger.workerId}</div>
                        ) : null}
                        {trigger.nextExecutionDate ? (
                          <div className="mt-1 text-muted-foreground">
                            Next execution: {new Date(trigger.nextExecutionDate).toLocaleString()}
                          </div>
                        ) : null}
                      </div>
                    ))}
                    {filteredTriggers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No triggers match this filter.</p>
                    ) : null}
                  </div>
                )}
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
                <p className="mt-3 text-sm text-muted-foreground">
                  Audit logs are unavailable in this edition.
                </p>
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
