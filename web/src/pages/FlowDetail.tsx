import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import FlowWorkbench from '@/components/flows/FlowWorkbench';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/cn';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';

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

function isFlowTab(value: string | undefined): value is FlowTab {
  return FLOW_TABS.some((tab) => tab.value === value);
}

export default function FlowDetail() {
  const navigate = useNavigate();
  const { flowId, tab } = useParams<{ flowId: string; tab?: string }>();
  const [flowName, setFlowName] = useState('Flow');
  const [namespace, setNamespace] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeTab: FlowTab = isFlowTab(tab) ? tab : 'overview';

  useEffect(() => {
    if (!flowId) {
      navigate('/app/flows', { replace: true });
      return;
    }
    if (!isFlowTab(tab)) {
      navigate(`/app/flows/${flowId}/overview`, { replace: true });
    }
  }, [flowId, navigate, tab]);

  useEffect(() => {
    if (!flowId) return;
    let cancelled = false;

    const load = async () => {
      setError(null);
      const { data, error: queryError } = await supabase
        .from(TABLES.projects)
        .select('project_name, workspace_id')
        .eq('project_id', flowId)
        .maybeSingle();

      if (cancelled) return;
      if (queryError) {
        setError(queryError.message);
        return;
      }

      setFlowName(String((data as { project_name?: string } | null)?.project_name ?? `Flow ${flowId.slice(0, 8)}`));
      setNamespace(String((data as { workspace_id?: string } | null)?.workspace_id ?? 'default'));
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [flowId]);

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
          navigate(`/app/flows/${flowId}/${value}`);
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
              className={cn(
                'inline-flex h-10 shrink-0 items-center border-r border-slate-300/80 px-4 text-[12px] font-medium leading-none whitespace-nowrap text-slate-600 transition-colors',
                'first:border-l first:border-l-slate-300/80 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700/80 dark:text-slate-300 dark:first:border-l-slate-700/80 dark:hover:bg-slate-900/60 dark:hover:text-slate-50',
                item.value === activeTab
                  ? '-mb-px border-b border-b-white border-t-2 border-t-sky-500 bg-white text-slate-950 dark:border-b-slate-900 dark:border-t-sky-400 dark:bg-slate-900 dark:text-white'
                  : '',
              )}
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

        {FLOW_TABS.map((item) => (
          <TabsContent key={item.value} value={item.value} className="flow-detail-tab-panel p-4">
            {item.value === 'topology' || item.value === 'edit' ? (
              <FlowWorkbench
                flowId={flowId}
                flowName={flowName}
              />
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
