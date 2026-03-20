import type { Trace, TraceTimelinePoint } from './types';

type TraceDetailsPanelProps = {
  trace: Trace | null;
  loading: boolean;
  timeline: TraceTimelinePoint[];
};

function formatTime(value: string): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function formatDuration(durationMs: number): string {
  if (!Number.isFinite(durationMs)) return '-';
  if (durationMs >= 1000) return `${(durationMs / 1000).toFixed(2)}s`;
  return `${Math.max(0, Math.round(durationMs))}ms`;
}

export function TraceDetailsPanel({ trace, loading, timeline }: TraceDetailsPanelProps) {
  if (loading) {
    return (
      <section className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Loading trace detail...</p>
      </section>
    );
  }

  if (!trace) {
    return (
      <section className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">No trace detail available.</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Trace Detail</h2>
        <p className="mt-1 text-xs font-mono text-muted-foreground">{trace.traceId}</p>

        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Operation</dt>
            <dd className="font-medium text-foreground">{trace.operationName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Service</dt>
            <dd className="text-foreground">{trace.serviceName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="text-foreground">{trace.status}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Started</dt>
            <dd className="text-foreground">{formatTime(trace.startTime)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Ended</dt>
            <dd className="text-foreground">{formatTime(trace.endTime || '')}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Duration</dt>
            <dd className="text-foreground">{formatDuration(trace.durationMs)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Timeline ({timeline.length} points)</h3>
        {timeline.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No timeline points available.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {timeline.map((point) => (
              <li key={`${point.traceId}:${point.spanId}`} className="grid gap-1 rounded border border-border bg-background/80 p-2 sm:grid-cols-2">
                <span className="font-mono text-xs text-muted-foreground">{point.spanId}</span>
                <span className="text-foreground">{point.label}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Spans ({trace.spans.length})</h3>
        {trace.spans.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No span detail available.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {trace.spans.map((span) => (
              <li key={span.spanId} className="rounded border border-border bg-background/80 p-2">
                <div className="font-medium text-foreground">{span.name}</div>
                <p className="text-xs text-muted-foreground">
                  id {span.spanId}
                  {span.parentSpanId ? ` parent ${span.parentSpanId}` : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  {span.serviceName} | {span.status} | {formatDuration(span.durationMs)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
