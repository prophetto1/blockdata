import { useEffect, useState } from 'react';

import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { createObservabilityApiClient } from '@/components/observability/api';
import type { ObservabilityStatus } from '@/components/observability/types';

function statusLine(label: string, available: boolean, message?: string, fallbackHint?: string) {
  return {
    title: label,
    tone: available ? 'text-emerald-600' : 'text-amber-600',
    message: message || fallbackHint || 'No status reported.',
  };
}

function statusText(value: boolean): string {
  return value ? 'Available' : 'Unavailable';
}

function cardClass(isAvailable: boolean): string {
  return isAvailable
    ? 'border-emerald-500/40 bg-emerald-500/5'
    : 'border-amber-500/40 bg-amber-500/5';
}

export default function TelemetryStatusPage() {
  useShellHeaderTitle({ title: 'Telemetry', breadcrumbs: ['Observability', 'Telemetry'] });
  const [status, setStatus] = useState<ObservabilityStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      try {
        const payload = await createObservabilityApiClient().fetchTelemetryStatus();
        if (!canceled) {
          setStatus(payload);
        }
      } catch (err) {
        if (!canceled) {
          setError(err instanceof Error ? err.message : 'Unable to load telemetry status.');
        }
      }
    };

    void load();
    return () => {
      canceled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  if (!status) {
    return <p className="text-sm text-muted-foreground">Loading telemetry status...</p>;
  }

  const signozUiUrl = status.signoz_ui_url || '';
  const legacyJaegerUrl = status.jaeger_ui_url || '';
  const cards = [
    statusLine('Traces', status.traces.available, status.traces.message, 'Waiting on trace export pipeline.'),
    statusLine('Logs', status.logs.available, status.logs.message, 'Waiting on log export pipeline.'),
    statusLine('Metrics', status.metrics.available, status.metrics.message, 'Waiting on metrics export pipeline.'),
  ];

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => {
          const available =
            card.title === 'Traces'
              ? status.traces.available
              : card.title === 'Logs'
                ? status.logs.available
                : status.metrics.available;

          return (
            <article key={card.title} className={`rounded-lg border p-4 ${cardClass(available)}`}>
              <h2 className="text-sm font-semibold text-foreground">{card.title}</h2>
              <p className={`mt-1 text-lg font-bold ${card.tone}`}>{statusText(available)}</p>
              <p className="mt-2 text-xs text-muted-foreground">{card.message}</p>
            </article>
          );
        })}
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">UI Targets</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Set these in platform-api env and pass through the status contract for tooling links.
        </p>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">SigNoz UI URL</dt>
            <dd className="mt-1">
              {signozUiUrl ? (
                <a
                  className="text-sm text-sky-600 hover:underline"
                  href={signozUiUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {signozUiUrl}
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">Not configured.</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Jaeger URL (deprecated alias)</dt>
            <dd className="mt-1">
              {legacyJaegerUrl ? (
                <span className="text-sm text-muted-foreground">{legacyJaegerUrl}</span>
              ) : (
                <span className="text-sm text-muted-foreground">Not configured.</span>
              )}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
