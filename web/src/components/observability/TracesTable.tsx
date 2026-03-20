import { Link } from 'react-router-dom';

import type { Trace } from './types';

type TracesTableProps = {
  traces: Trace[];
  loading: boolean;
  onRefresh: () => void;
};

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'OK':
      return 'border-emerald-300 bg-emerald-500/10 text-emerald-500';
    case 'ERROR':
      return 'border-rose-300 bg-rose-500/10 text-rose-500';
    default:
      return 'border-slate-300 bg-slate-500/10 text-slate-500';
  }
}

function formatDuration(durationMs: number): string {
  if (!Number.isFinite(durationMs)) return '-';
  if (durationMs >= 1000) return `${(durationMs / 1000).toFixed(2)}s`;
  return `${Math.max(0, Math.round(durationMs))}ms`;
}

function formatTime(value: string): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export function TracesTable({ traces, loading, onRefresh }: TracesTableProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Recent Traces</h2>
          <p className="text-xs text-muted-foreground">Filter and inspect captured request paths across services.</p>
        </div>
        <button
          type="button"
          className="rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent"
          onClick={onRefresh}
        >
          Refresh
        </button>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-semibold">Trace ID</th>
              <th className="px-3 py-2 font-semibold">Operation</th>
              <th className="px-3 py-2 font-semibold">Service</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Started</th>
              <th className="px-3 py-2 font-semibold">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  Loading traces...
                </td>
              </tr>
            ) : traces.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  No trace data available yet.
                </td>
              </tr>
            ) : (
              traces.map((trace) => (
                <tr key={trace.traceId} className="hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <Link
                      className="font-mono text-xs text-sky-600 underline-offset-2 hover:underline"
                      to={`/app/observability/traces/${encodeURIComponent(trace.traceId)}`}
                    >
                      {trace.traceId}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-foreground">{trace.operationName}</td>
                  <td className="px-3 py-2 text-muted-foreground">{trace.serviceName}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${statusBadgeClass(trace.status)}`}>
                      {trace.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{formatTime(trace.startTime)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDuration(trace.durationMs)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
