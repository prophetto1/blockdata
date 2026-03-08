import { useEffect, useMemo, useState } from 'react';
import {
  IconAdjustmentsHorizontal,
  IconEye,
  IconEyeOff,
  IconGripVertical,
  IconX,
} from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { AppIcon } from '@/components/ui/app-icon';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FlowFilterBar } from './FlowFilterBar';

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

type LabelEntry = {
  key: string;
  value: string;
};

type ColumnKey =
  | 'startDate'
  | 'endDate'
  | 'duration'
  | 'namespace'
  | 'flow'
  | 'labels'
  | 'state'
  | 'inputs'
  | 'outputs'
  | 'taskId'
  | 'triggers'
  | 'parentExecution'
  | 'metadata';

type ColumnOption = {
  key: ColumnKey;
  label: string;
  description: string;
  visible: boolean;
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

const INITIAL_COLUMN_OPTIONS: ColumnOption[] = [
  { key: 'startDate', label: 'Start date', description: 'When the execution started', visible: true },
  { key: 'endDate', label: 'End date', description: 'When the execution finished', visible: true },
  { key: 'duration', label: 'Duration', description: 'Total runtime of the execution', visible: true },
  { key: 'namespace', label: 'Namespace', description: 'Namespace to which the execution belongs', visible: true },
  { key: 'flow', label: 'Flow', description: 'Flow identifier for this execution', visible: true },
  { key: 'labels', label: 'Labels', description: 'Execution labels', visible: true },
  { key: 'state', label: 'State', description: 'Current execution state', visible: true },
  { key: 'inputs', label: 'Inputs', description: 'Inputs provided to the execution', visible: true },
  { key: 'outputs', label: 'Outputs', description: 'Outputs emitted by the execution', visible: true },
  { key: 'taskId', label: 'Task ID', description: 'ID of the last task in the execution', visible: true },
  { key: 'triggers', label: 'Triggers', description: 'Trigger that started the execution', visible: true },
  { key: 'parentExecution', label: 'Parent execution', description: 'Parent execution ID that triggered this execution', visible: true },
  { key: 'metadata', label: 'Metadata', description: 'Additional execution metadata', visible: false },
];

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

function toLabelEntries(labels: Record<string, string> | null): LabelEntry[] {
  if (!labels) return [];
  return Object.entries(labels).map(([key, value]) => ({ key, value }));
}

function renderColumnContent(columnKey: ColumnKey, execution: Execution) {
  if (columnKey === 'startDate') {
    return formatDate(execution.start_date);
  }
  if (columnKey === 'endDate') {
    return formatDate(execution.end_date);
  }
  if (columnKey === 'duration') {
    return formatDuration(execution.duration_ms);
  }
  if (columnKey === 'namespace') {
    return execution.namespace;
  }
  if (columnKey === 'flow') {
    return execution.flow_id;
  }
  if (columnKey === 'labels') {
    return (
      toLabelEntries(execution.labels).length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {toLabelEntries(execution.labels).map((label) => (
            <span
              key={`${execution.execution_id}:${label.key}`}
              className="inline-flex items-center rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
            >
              {label.key}={label.value}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground">--</span>
      )
    );
  }
  if (columnKey === 'state') {
    return (
      <Badge variant={STATE_BADGE_VARIANT[execution.state] ?? 'gray'} size="xs">
        {execution.state}
      </Badge>
    );
  }
  if (columnKey === 'triggers') {
    return execution.trigger_type ?? '--';
  }
  return '--';
}

export function ExecutionsTab({ flowId }: { flowId: string }) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [search, setSearch] = useState('');
  const [showChart, setShowChart] = useState(false);
  const [periodicRefresh, setPeriodicRefresh] = useState(false);
  const [showColumnsPanel, setShowColumnsPanel] = useState(false);
  const [columnOptions, setColumnOptions] = useState(INITIAL_COLUMN_OPTIONS);
  const [reloadTick, setReloadTick] = useState(0);

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

    return () => {
      cancelled = true;
    };
  }, [flowId, reloadTick]);

  const filteredExecutions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return executions;

    return executions.filter((execution) => {
      const haystack = [
        execution.execution_id,
        execution.flow_id,
        execution.namespace,
        execution.state,
        execution.trigger_type ?? '',
        ...toLabelEntries(execution.labels).map(({ key, value }) => `${key}=${value}`),
      ].join(' ').toLowerCase();

      return haystack.includes(query);
    });
  }, [executions, search]);

  const visibleColumns = useMemo(
    () => columnOptions.filter((column) => column.visible),
    [columnOptions],
  );

  return (
    <div className="space-y-4">
      <FlowFilterBar
        searchPlaceholder="Search executions"
        filters={filters}
        onSearch={setSearch}
        onRemoveFilter={(id) => setFilters((current) => current.filter((filter) => filter.id !== id))}
        onClearAll={() => setFilters([])}
        onRefresh={() => setReloadTick((current) => current + 1)}
      />

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3 px-2 text-sm">
          <label className="inline-flex items-center gap-2 text-foreground">
            <span>Show Chart</span>
            <button
              type="button"
              aria-pressed={showChart}
              onClick={() => setShowChart((value) => !value)}
              className={cn(
                'relative inline-flex h-6 w-10 items-center rounded-full border transition-colors',
                showChart ? 'border-primary bg-primary/20' : 'border-border bg-muted/40',
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 rounded-full bg-background shadow transition-transform',
                  showChart ? 'translate-x-5' : 'translate-x-1',
                )}
              />
            </button>
          </label>

          <div className="ml-auto flex flex-wrap items-center gap-5 text-foreground">
            <label className="inline-flex items-center gap-2">
              <button
                type="button"
                aria-pressed={periodicRefresh}
                onClick={() => setPeriodicRefresh((value) => !value)}
                className={cn(
                  'relative inline-flex h-6 w-10 items-center rounded-full border transition-colors',
                  periodicRefresh ? 'border-primary bg-primary/20' : 'border-border bg-muted/40',
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 rounded-full bg-background shadow transition-transform',
                    periodicRefresh ? 'translate-x-5' : 'translate-x-1',
                  )}
                />
              </button>
              <span>Periodic refresh</span>
            </label>

            <button
              type="button"
              aria-expanded={showColumnsPanel}
              onClick={() => setShowColumnsPanel((value) => !value)}
              className="inline-flex items-center gap-2 text-foreground hover:text-primary"
            >
              <AppIcon icon={IconAdjustmentsHorizontal} context="inline" tone="current" />
              <span>Columns</span>
            </button>
          </div>
        </div>

        {showColumnsPanel ? (
          <aside className="absolute right-0 top-full z-10 mt-3 w-full max-w-[332px] rounded-md border border-border bg-card shadow-xl xl:right-2">
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Customize table columns</h3>
                <p className="mt-1 text-sm text-muted-foreground">Drag to reorder columns</p>
              </div>
              <button
                type="button"
                aria-label="Close column picker"
                onClick={() => setShowColumnsPanel(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <AppIcon icon={IconX} context="inline" tone="current" />
              </button>
            </div>

            <div className="max-h-[320px] overflow-auto">
              {columnOptions.map((column) => (
                <div key={column.key} className="flex items-start gap-3 border-b border-border px-4 py-4 last:border-b-0">
                  <span className="pt-0.5 text-muted-foreground">
                    <AppIcon icon={IconGripVertical} context="inline" tone="current" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{column.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{column.description}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`${column.visible ? 'Hide' : 'Show'} ${column.label} column`}
                    onClick={() => {
                      setColumnOptions((current) =>
                        current.map((entry) =>
                          entry.key === column.key ? { ...entry, visible: !entry.visible } : entry,
                        ),
                      );
                    }}
                    className="rounded-md p-1 text-emerald-400 hover:bg-accent"
                  >
                    <AppIcon icon={column.visible ? IconEye : IconEyeOff} context="inline" tone="current" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-border px-4 py-3 text-center text-sm text-muted-foreground">
              {visibleColumns.length} of {columnOptions.length} columns visible
            </div>
          </aside>
        ) : null}
      </div>

      <div className="overflow-auto rounded-md border border-border bg-card">
        <table className="min-w-full text-xs">
          <thead className="border-b border-border bg-muted/30">
            <tr className="text-xs font-semibold text-muted-foreground">
              <th className="w-10 px-3 py-2 text-left">
                <input
                  type="checkbox"
                  aria-label="Select all executions"
                  className="h-3.5 w-3.5 rounded border-border bg-background"
                />
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left">Id</th>
              {visibleColumns.map((column) => (
                <th key={column.key} className="whitespace-nowrap px-3 py-2 text-left">
                  {column.label}
                </th>
              ))}
              <th className="whitespace-nowrap px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={visibleColumns.length + 3} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : filteredExecutions.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 3} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No Executions Found
                </td>
              </tr>
            ) : (
              filteredExecutions.map((execution) => (
                <tr key={execution.execution_id} className="border-t border-border/40 hover:bg-accent/30">
                  <td className="px-3 py-2 align-top">
                    <input
                      type="checkbox"
                      aria-label={`Select execution ${execution.execution_id}`}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-border bg-background"
                    />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-foreground">{execution.execution_id.slice(0, 8)}</td>
                  {visibleColumns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-3 py-2 text-muted-foreground',
                        (column.key === 'startDate' || column.key === 'endDate' || column.key === 'duration')
                          && 'whitespace-nowrap',
                        column.key === 'duration' && 'font-mono',
                      )}
                    >
                      {renderColumnContent(column.key, execution)}
                    </td>
                  ))}
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
