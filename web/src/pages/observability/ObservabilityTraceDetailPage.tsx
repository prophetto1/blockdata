import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { createObservabilityApiClient } from '@/components/observability/api';
import { TraceDetailsPanel } from '@/components/observability/TraceDetailsPanel';
import type { Trace, TraceTimelinePoint } from '@/components/observability/types';

export default function ObservabilityTraceDetailPage() {
  const { traceId } = useParams<{ traceId: string }>();
  useShellHeaderTitle({
    title: 'Trace Detail',
    breadcrumbs: ['Observability', 'Traces', traceId || 'Trace'],
  });

  const [trace, setTrace] = useState<Trace | null>(null);
  const [timeline, setTimeline] = useState<TraceTimelinePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!traceId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const [tracePayload, timelinePayload] = await Promise.all([
          createObservabilityApiClient().fetchTrace(traceId),
          createObservabilityApiClient().fetchTraceTimeline(traceId),
        ]);
        if (!cancelled) {
          setTrace(tracePayload);
          setTimeline(timelinePayload);
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load trace detail from telemetry backend.');
          setTrace(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [traceId]);

  if (!traceId) {
    return <p className="text-sm text-muted-foreground">Trace ID missing.</p>;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-card p-3">
        <h1 className="text-sm font-semibold text-foreground">Trace {traceId}</h1>
        {error ? <p className="mt-1 text-sm text-amber-600">{error}</p> : null}
      </section>

      <TraceDetailsPanel trace={loading ? null : trace} loading={loading} timeline={timeline} />
    </div>
  );
}
