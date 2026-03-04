import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconLock, IconPlus, IconX } from '@tabler/icons-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { PreviewTabPanel } from '@/components/documents/PreviewTabPanel';
import FlowCanvas from '@/components/flows/FlowCanvas';
import FlowWorkbench from '@/components/flows/FlowWorkbench';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { edgeJson } from '@/lib/edge';
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

const MAX_PREVIEW_TABS = 8;
const PREVIEW_TAB_PREFIX = 'preview-';

function isPreviewTab(value: string): boolean {
  return value.startsWith(PREVIEW_TAB_PREFIX);
}

function buildPreviewLabel(index: number): string {
  return index === 0 ? 'Preview' : `Preview-${String(index + 1).padStart(2, '0')}`;
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
  const [flowDescription, setFlowDescription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flowTriggers, setFlowTriggers] = useState<FlowTriggerSummary[]>([]);
  const [triggerQuery, setTriggerQuery] = useState('');
  const [topologyResetNonce, setTopologyResetNonce] = useState(0);
  const [previewTabs, setPreviewTabs] = useState<string[]>([]);
  const previewSeqRef = useRef(1);

  const previewTabConfigs = useMemo<FlowTabConfig[]>(
    () => previewTabs.map((value, index) => ({ value, label: buildPreviewLabel(index) })),
    [previewTabs],
  );
  const allTabs = useMemo<FlowTabConfig[]>(
    () => [...FLOW_TABS, ...previewTabConfigs],
    [previewTabConfigs],
  );

  const activeTab = useMemo(() => {
    if (tab && isPreviewTab(tab) && previewTabs.includes(tab)) return tab;
    const storedTab = typeof window === 'undefined' ? null : window.localStorage.getItem(FLOW_DEFAULT_TAB_STORAGE_KEY);
    if (isLockedFlowTab(tab)) return tab;
    return getPreferredFlowTab(tab, storedTab, OPEN_FLOW_TAB_VALUES, 'overview');
  }, [tab, previewTabs]);

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
        setNamespace(resolvedNamespace);
        setFlowDescription(metadata.description ?? null);
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

  const filteredTriggers = useMemo(() => {
    const needle = triggerQuery.trim().toLowerCase();
    if (needle.length === 0) return flowTriggers;
    return flowTriggers.filter((trigger) =>
      trigger.id.toLowerCase().includes(needle) ||
      trigger.type.toLowerCase().includes(needle) ||
      (trigger.workerId ?? '').toLowerCase().includes(needle),
    );
  }, [flowTriggers, triggerQuery]);

  const addPreviewTab = useCallback(() => {
    if (previewTabs.length >= MAX_PREVIEW_TABS) return;
    const seq = previewSeqRef.current;
    previewSeqRef.current += 1;
    const value = `${PREVIEW_TAB_PREFIX}${seq}`;
    setPreviewTabs((current) => [...current, value]);
    navigate(`/app/flows/${flowId}/${value}${searchSuffix}`);
  }, [flowId, navigate, previewTabs.length, searchSuffix]);

  const closePreviewTab = useCallback((tabValue: string) => {
    setPreviewTabs((current) => current.filter((v) => v !== tabValue));
    if (activeTab === tabValue) {
      navigate(`/app/flows/${flowId}/overview${searchSuffix}`);
    }
  }, [activeTab, flowId, navigate, searchSuffix]);

  const activeTabLabel = useMemo(
    () => allTabs.find((item) => item.value === activeTab)?.label ?? activeTab,
    [activeTab, allTabs],
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
          if (!value) return;
          if (isPreviewTab(value)) {
            navigate(`/app/flows/${flowId}/${value}${searchSuffix}`);
            return;
          }
          if (!isFlowTab(value)) return;
          if (isLockedFlowTab(value)) return;
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(FLOW_DEFAULT_TAB_STORAGE_KEY, value);
          }
          navigate(`/app/flows/${flowId}/${value}${searchSuffix}`);
        }}
        className="flow-detail-tabs flex min-h-0 flex-col"
      >
        <TabsList
          aria-label="Flow sections"
          className="flow-detail-tabs-row flex h-11 min-h-11 w-full items-stretch overflow-x-auto bg-card shadow-[inset_0_-1px_0_var(--border)]"
        >
          {FLOW_TABS.map((item) => {
            const isLocked = Boolean(item.locked);
            return (
              <TabsTrigger
                key={item.value}
                value={item.value}
                disabled={isLocked}
                aria-disabled={isLocked}
                className="inline-flex h-full shrink-0 items-center gap-1 border-r border-border px-3.5 text-[13px] font-semibold leading-none whitespace-nowrap text-muted-foreground transition-colors first:border-l first:border-l-border hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground data-selected:bg-background data-selected:text-foreground"
              >
                <span>{item.label}</span>
                {isLocked ? <IconLock size={11} aria-hidden /> : null}
              </TabsTrigger>
            );
          })}
          {previewTabConfigs.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="group inline-flex h-full shrink-0 items-center gap-1 border-r border-border px-3.5 text-[13px] font-semibold leading-none whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-selected:bg-background data-selected:text-foreground"
            >
              <span>{item.label}</span>
              <button
                type="button"
                aria-label={`Close ${item.label}`}
                className="ml-0.5 rounded p-0.5 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100 data-selected:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  closePreviewTab(item.value);
                }}
              >
                <IconX size={10} aria-hidden />
              </button>
            </TabsTrigger>
          ))}
          {previewTabs.length < MAX_PREVIEW_TABS ? (
            <button
              type="button"
              aria-label="Add preview tab"
              className="inline-flex h-full shrink-0 items-center px-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={addPreviewTab}
            >
              <IconPlus size={14} aria-hidden />
            </button>
          ) : null}
        </TabsList>

        {error ? (
          <div
            role="alert"
            className="mx-4 mt-4 flex items-start justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive dark:border-destructive/40"
          >
            <span>{error}</span>
            <button
              type="button"
              aria-label="Dismiss flow error"
              className="shrink-0 rounded border border-destructive/30 px-1.5 py-0.5 text-xs text-destructive hover:bg-destructive/10 dark:border-destructive/40"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {FLOW_TABS.map((item) => (
          <TabsContent key={item.value} value={item.value} className="flow-detail-tab-panel p-4">
            {item.value === 'topology' ? (
              <div className="flow-detail-panel-placeholder flex min-h-0 flex-1 rounded-md border border-border bg-card">
                <FlowCanvas key={`topology-canvas:${flowId}:${topologyResetNonce}`} />
              </div>
            ) : item.value === 'edit' ? (
              <FlowWorkbench
                flowId={flowId}
                flowName={flowName}
                namespace={namespace ?? 'default'}
              />
            ) : item.value === 'overview' ? (
              <div className="flow-detail-panel-placeholder rounded-md border border-border bg-card p-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Namespace</p>
                    <p className="text-sm font-semibold">{namespace ?? 'default'}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Total Executions</p>
                    <p className="text-sm font-semibold">&mdash;</p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Success Rate</p>
                    <p className="text-sm font-semibold">&mdash;</p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Documents</p>
                    <p className="text-sm font-semibold">&mdash;</p>
                  </div>
                </div>
                {flowDescription ? (
                  <p className="mt-3 text-sm text-muted-foreground">{flowDescription}</p>
                ) : null}
                <div className="mt-4 space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Recent executions</h3>
                  <p className="text-sm text-muted-foreground">No executions yet.</p>
                </div>
              </div>
            ) : item.value === 'triggers' ? (
              <div className="flow-detail-panel-placeholder rounded-md border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">Triggers</h3>
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
            ) : item.value === 'auditlogs' ? (
              <div className="flow-detail-panel-placeholder rounded-md border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground">Audit log</h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  Audit logs are unavailable in this edition.
                </p>
              </div>
            ) : (
              <div className="flow-detail-panel-placeholder rounded-md border border-border bg-card p-4">
                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold text-foreground">{item.label}</h3>
                  <p className="text-sm text-muted-foreground">
                    Shared flow tab structure placeholder.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        ))}
        {previewTabConfigs.map((item) => (
          <TabsContent key={item.value} value={item.value} className="flow-detail-tab-panel h-full min-h-0">
            <PreviewTabPanel doc={null} />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
