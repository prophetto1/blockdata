import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FlowFilterBar } from './FlowFilterBar';
import { FlowEmptyState } from './FlowEmptyState';

type Execution = {
  execution_id: string;
  flow_id: string;
  namespace: string;
  state: string;
  start_date: string | null;
  end_date: string | null;
  duration_ms: number | null;
  labels: Record<string, string> | null;
  trigger_type: string | null;
};

const DEFAULT_FILTERS = [
  { id: 'interval', label: 'Interval Last 24 hours', removable: true },
  { id: 'state', label: 'State in any', removable: true },
];

const STATE_BADGE_VARIANT: Record<string, 'green' | 'red' | 'blue' | 'yellow' | 'gray'> = {
  SUCCESS: 'green',
  FAILED: 'red',
  RUNNING: 'blue',
  WARNING: 'yellow',
  KILLED: 'red',
  PAUSED: 'gray',
};

function formatDuration(ms: number | null): string {
  if (ms == null) return '--';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatDate(value: string | null): string {
  if (!value) return '--';
  return new Date(value).toLocaleString();
}

export function ExecutionsTab({ flowId }: { flowId: string }) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    supabase
      .from('flow_executions')
      .select('*')
      .eq('flow_id', flowId)
      .order('start_date', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setExecutions([]);
        } else {
          setExecutions((data ?? []) as Execution[]);
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [flowId]);

  return (
    <div className="space-y-4">
      <FlowFilterBar
        searchPlaceholder="Search executions"
        filters={filters}
        onSearch={() => {}}
        onRemoveFilter={(id) => setFilters((f) => f.filter((p) => p.id !== id))}
        onClearAll={() => setFilters([])}
        onRefresh={() => {}}
      />

      {/* Chart area */}
      <div className="rounded-md border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Total Executions</h3>
        <p className="text-xs font-medium text-muted-foreground">Executions duration and count per date</p>
        {executions.length === 0 && !loading && (
          <FlowEmptyState
            title="Looks like there's nothing here... yet!"
            subtitle="Adjust your filters, or give it another go!"
          />
        )}
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-md border border-border bg-card">
        <table className="min-w-full text-xs">
          <thead className="border-b border-border bg-muted/30">
            <tr className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 text-left">Id</th>
              <th className="px-3 py-2 text-left">Start date</th>
              <th className="px-3 py-2 text-left">End date</th>
              <th className="px-3 py-2 text-left">Duration</th>
              <th className="px-3 py-2 text-left">Namespace</th>
              <th className="px-3 py-2 text-left">Flow</th>
              <th className="px-3 py-2 text-left">Labels</th>
              <th className="px-3 py-2 text-left">State</th>
              <th className="px-3 py-2 text-left">Triggers</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-sm text-muted-foreground">Loading...</td></tr>
            ) : executions.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-sm font-medium text-primary">No Executions Found</td></tr>
            ) : (
              executions.map((e) => (
                <tr key={e.execution_id} className={cn('border-t border-border/40 hover:bg-accent/30')}>
                  <td className="px-3 py-2 font-mono text-xs text-foreground">{e.execution_id.slice(0, 8)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(e.start_date)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(e.end_date)}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">{formatDuration(e.duration_ms)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{e.namespace}</td>
                  <td className="px-3 py-2 text-muted-foreground">{e.flow_id}</td>
                  <td className="px-3 py-2 text-muted-foreground">--</td>
                  <td className="px-3 py-2">
                    <Badge variant={STATE_BADGE_VARIANT[e.state] ?? 'gray'} size="xs">{e.state}</Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{e.trigger_type ?? '--'}</td>
                  <td className="px-3 py-2 text-muted-foreground">--</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
