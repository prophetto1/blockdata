import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FlowFilterBar } from './FlowFilterBar';
import { FlowEmptyState } from './FlowEmptyState';

type LogEntry = {
  log_id: string;
  timestamp: string;
  level: string;
  task_id: string | null;
  message: string;
};

const LOG_LEVEL_BADGE: Record<string, 'gray' | 'blue' | 'yellow' | 'red'> = {
  TRACE: 'gray',
  DEBUG: 'gray',
  INFO: 'blue',
  WARN: 'yellow',
  ERROR: 'red',
};

const DEFAULT_FILTERS = [
  { id: 'level', label: 'Log Level INFO', removable: true },
  { id: 'interval', label: 'Interval Last 24 hours', removable: true },
];

export function LogsTab(
  { projectId, flowId }: { projectId: string | null; flowId: string },
) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    if (!projectId) {
      setLogs([]);
      setLoading(false);
      return () => { cancelled = true; };
    }

    supabase
      .from('flow_logs')
      .select('*')
      .eq('project_id', projectId)
      .eq('flow_id', flowId)
      .order('timestamp', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setLogs([]);
        } else {
          setLogs((data ?? []) as LogEntry[]);
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [flowId, projectId]);

  return (
    <div className="space-y-4">
      <FlowFilterBar
        searchPlaceholder="Search logs"
        filters={filters}
        onSearch={() => {}}
        onRemoveFilter={(id) => setFilters((f) => f.filter((p) => p.id !== id))}
        onClearAll={() => setFilters([])}
        onRefresh={() => {}}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading...</div>
      ) : logs.length === 0 ? (
        <FlowEmptyState
          title="No logs found for the selected filters."
          subtitle="Please try adjusting your filters, changing the time range, or check if the flow has executed recently."
        />
      ) : (
        <ScrollArea className="rounded-md border border-border bg-card max-h-[600px]">
          <table className="min-w-full text-xs font-mono">
            <tbody>
              {logs.map((log) => (
                <tr key={log.log_id} className="border-b border-border/30 hover:bg-accent/20">
                  <td className="px-2 py-1 text-muted-foreground whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td className="px-2 py-1">
                    <Badge variant={LOG_LEVEL_BADGE[log.level] ?? 'gray'} size="xs">{log.level}</Badge>
                  </td>
                  <td className="px-2 py-1 text-muted-foreground">{log.task_id ?? '--'}</td>
                  <td className="px-2 py-1 text-foreground">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      )}
    </div>
  );
}
