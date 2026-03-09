import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { FlowEmptyState } from './FlowEmptyState';
import { FlowFilterBar } from './FlowFilterBar';

type FlowAuditRevision = {
  flow_source_id: string;
  revision: number;
  created_at: string;
  updated_at: string;
  disabled: boolean;
  labels: Record<string, string> | null;
  source: string;
};

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function summarizeSource(source: string): string {
  const firstMeaningfulLine = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstMeaningfulLine) return 'Source snapshot recorded';
  return firstMeaningfulLine.length > 72
    ? `${firstMeaningfulLine.slice(0, 72)}...`
    : firstMeaningfulLine;
}

function formatLabels(labels: Record<string, string> | null): string {
  if (!labels) return 'No labels';
  const entries = Object.entries(labels);
  if (entries.length === 0) return 'No labels';
  return entries.map(([key, value]) => `${key}:${value}`).join(', ');
}

export function AuditLogsTab(
  { projectId, flowId }: { projectId: string | null; flowId: string },
) {
  const [rows, setRows] = useState<FlowAuditRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    if (!projectId) {
      setRows([]);
      setSelectedRevisionId(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    supabase
      .from('flow_sources')
      .select('flow_source_id, revision, created_at, updated_at, disabled, labels, source')
      .eq('project_id', projectId)
      .eq('flow_id', flowId)
      .order('revision', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setRows([]);
          setSelectedRevisionId(null);
          setLoading(false);
          return;
        }

        const nextRows = (data ?? []) as FlowAuditRevision[];
        setRows(nextRows);
        setSelectedRevisionId((current) => {
          if (current && nextRows.some((row) => row.flow_source_id === current)) return current;
          return nextRows[0]?.flow_source_id ?? null;
        });
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [flowId, projectId, reloadTick]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => {
      const haystack = [
        `revision ${row.revision}`,
        row.disabled ? 'disabled' : 'active',
        formatLabels(row.labels),
        row.source,
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, search]);

  const selectedRow = useMemo(() => {
    if (filteredRows.length === 0) return null;
    if (selectedRevisionId) {
      const existing = filteredRows.find((row) => row.flow_source_id === selectedRevisionId);
      if (existing) return existing;
    }
    return filteredRows[0] ?? null;
  }, [filteredRows, selectedRevisionId]);

  return (
    <div className="space-y-4">
      <FlowFilterBar
        searchPlaceholder="Search audit history"
        filters={[]}
        onSearch={setSearch}
        onRemoveFilter={() => {}}
        onClearAll={() => setSearch('')}
        onRefresh={() => setReloadTick((current) => current + 1)}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading...</div>
      ) : filteredRows.length === 0 ? (
        <FlowEmptyState
          title="No audit events yet."
          subtitle="Create or update this flow to build its change history."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <ScrollArea className="rounded-md border border-border bg-card">
            <table className="min-w-full text-xs">
              <thead className="border-b border-border bg-muted/30">
                <tr className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 text-left">When</th>
                  <th className="px-3 py-2 text-left">Revision</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Summary</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const selected = selectedRow?.flow_source_id === row.flow_source_id;
                  return (
                    <tr
                      key={row.flow_source_id}
                      className={cn(
                        'cursor-pointer border-t border-border/40 align-top hover:bg-accent/30',
                        selected && 'bg-accent/40',
                      )}
                      onClick={() => setSelectedRevisionId(row.flow_source_id)}
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                        {formatDate(row.updated_at || row.created_at)}
                      </td>
                      <td className="px-3 py-2 font-medium text-foreground">Revision {row.revision}</td>
                      <td className="px-3 py-2">
                        <Badge variant={row.disabled ? 'gray' : 'green'} size="xs">
                          {row.disabled ? 'Disabled' : 'Active'}
                        </Badge>
                      </td>
                      <td className="max-w-[420px] px-3 py-2 text-muted-foreground">
                        {summarizeSource(row.source)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>

          {selectedRow ? (
            <article className="rounded-md border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Revision {selectedRow.revision}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Recorded {formatDate(selectedRow.created_at)}
                  </p>
                </div>
                <Badge variant={selectedRow.disabled ? 'gray' : 'green'} size="sm">
                  {selectedRow.disabled ? 'Disabled' : 'Active'}
                </Badge>
              </div>

              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Labels</dt>
                  <dd className="mt-1 text-foreground">{formatLabels(selectedRow.labels)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Snapshot</dt>
                  <dd className="mt-1 rounded-md border border-border bg-background p-3 font-mono text-xs text-foreground whitespace-pre-wrap">
                    {selectedRow.source}
                  </dd>
                </div>
              </dl>
            </article>
          ) : null}
        </div>
      )}
    </div>
  );
}
