import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { PreviewTabPanel } from '@/components/documents/PreviewTabPanel';
import FlowCanvas from '@/components/flows/FlowCanvas';
import FlowWorkbench from '@/components/flows/FlowWorkbench';
import { AuditLogsTab } from '@/components/flows/tabs/AuditLogsTab';
import { ConcurrencyTab } from '@/components/flows/tabs/ConcurrencyTab';
import { DependenciesTab } from '@/components/flows/tabs/DependenciesTab';
import { ExecutionsTab } from '@/components/flows/tabs/ExecutionsTab';
import { LogsTab } from '@/components/flows/tabs/LogsTab';
import { MetricsTab } from '@/components/flows/tabs/MetricsTab';
import { OverviewTab } from '@/components/flows/tabs/OverviewTab';
import { RevisionsTab } from '@/components/flows/tabs/RevisionsTab';
import { TriggersTab } from '@/components/flows/tabs/TriggersTab';
import { edgeJson } from '@/lib/edge';
import { cn } from '@/lib/utils';
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
  { value: 'auditlogs', label: 'Audit Logs' },
] as const;

type FlowTab = (typeof FLOW_TABS)[number]['value'];
const LOCKED_FLOW_TAB_VALUES = FLOW_TABS
  .filter((tab) => tab.locked)
  .map((tab) => tab.value) as readonly FlowTab[];
const OPEN_FLOW_TAB_VALUES = FLOW_TABS
  .filter((tab) => !tab.locked)
  .map((tab) => tab.value) as readonly FlowTab[];
const FLOW_DEFAULT_TAB_STORAGE_KEY = 'flowDefaultTab';

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

type SeededFlowDetail = {
  name: string;
  namespace: string;
  description: string;
  triggers: FlowTriggerSummary[];
};

const SEEDED_FLOW_DETAILS: Record<string, SeededFlowDetail> = {
  default: {
    name: 'Default Flow',
    namespace: 'default',
    description: 'Seeded mock flow for reviewing the flow detail tabs before backend wiring is ready.',
    triggers: [
      {
        id: 'schedule-daily',
        type: 'Schedule',
        workerId: null,
        nextExecutionDate: '2026-03-08T12:00:00.000Z',
        disabled: false,
      },
    ],
  },
  main: {
    name: 'Main Flow',
    namespace: 'default',
    description: 'Seeded mock flow for reviewing the flow detail tabs before backend wiring is ready.',
    triggers: [
      {
        id: 'schedule-daily',
        type: 'Schedule',
        workerId: null,
        nextExecutionDate: '2026-03-08T12:00:00.000Z',
        disabled: false,
      },
    ],
  },
};

function isSuppressedFlowMetadataError(message: string): boolean {
  return /^Network request failed \(flows\/default\/[^)]+\)\.$/.test(message);
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


function FlowWorkspaceFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full w-full min-h-0 p-2">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        {children}
      </div>
    </div>
  );
}

export default function FlowDetail() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { flowId, tab } = useParams<{ flowId: string; tab?: string }>();
  const [flowName, setFlowName] = useState('Flow');
  const [namespace, setNamespace] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flowTriggers, setFlowTriggers] = useState<FlowTriggerSummary[]>([]);
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
    const seededFlow = SEEDED_FLOW_DETAILS[flowId];
    if (seededFlow) {
      setError(null);
      setFlowName(seededFlow.name);
      setNamespace(seededFlow.namespace);
      setFlowTriggers(seededFlow.triggers);
      return;
    }
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
  const useWorkspaceFrame = activeTab === 'edit' || activeTab === 'topology' || isPreviewTab(activeTab);

  useShellHeaderTitle({
    title: flowName,
    breadcrumbs: ['Flows', flowName, activeTabLabel],
  });

  if (!flowId) return null;

  const renderActivePanel = () => {
    if (isPreviewTab(activeTab)) {
      return (
        <FlowWorkspaceFrame>
          <PreviewTabPanel doc={null} />
        </FlowWorkspaceFrame>
      );
    }

    if (activeTab === 'topology') {
      return (
        <FlowWorkspaceFrame>
          <div className="flow-detail-panel-placeholder min-h-0 flex-1 overflow-hidden">
            <FlowCanvas key={`topology-canvas:${flowId}:${topologyResetNonce}`} />
          </div>
        </FlowWorkspaceFrame>
      );
    }

    if (activeTab === 'edit') {
      return (
        <FlowWorkspaceFrame>
          <FlowWorkbench
            flowId={flowId}
            flowName={flowName}
            namespace={namespace ?? 'default'}
          />
        </FlowWorkspaceFrame>
      );
    }

    if (activeTab === 'overview') {
      return (
        <OverviewTab onExecute={() => navigate(`/app/flows/${flowId}/executions${searchSuffix}`)} />
      );
    }

    if (activeTab === 'executions') return <ExecutionsTab flowId={flowId} />;
    if (activeTab === 'revisions') return <RevisionsTab flowId={flowId} />;
    if (activeTab === 'triggers') {
      return (
        <TriggersTab
          triggers={flowTriggers.map((t) => ({
            id: t.id,
            type: t.type,
            nextExecutionDate: t.nextExecutionDate,
            disabled: t.disabled,
          }))}
          onEditFlow={() => navigate(`/app/flows/${flowId}/edit`)}
        />
      );
    }
    if (activeTab === 'logs') return <LogsTab flowId={flowId} />;
    if (activeTab === 'metrics') return <MetricsTab flowId={flowId} />;
    if (activeTab === 'dependencies') return <DependenciesTab />;
    if (activeTab === 'concurrency') return <ConcurrencyTab />;
    if (activeTab === 'auditlogs') return <AuditLogsTab flowId={flowId} />;

    return null;
  };

  return (
    <section className="flow-detail-shell flex min-h-0 flex-1 flex-col">
      <div className="flow-detail-layout flex min-h-0 flex-1 overflow-hidden">
        <div className="flow-detail-content min-w-0 flex-1 overflow-hidden">
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

          <div
            className={cn(
              'flow-detail-tab-panel',
              useWorkspaceFrame ? 'p-2' : 'p-6',
            )}
          >
            {renderActivePanel()}
          </div>
        </div>
      </div>
    </section>
  );
}
