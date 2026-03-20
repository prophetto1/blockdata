import { useEffect, useMemo, useState } from 'react';

import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { createObservabilityApiClient } from '@/components/observability/api';
import { TracesTable } from '@/components/observability/TracesTable';
import type { Trace } from '@/components/observability/types';

export default function ObservabilityTracesPage() {
  useShellHeaderTitle({ title: 'Traces', breadcrumbs: ['Observability', 'Traces'] });

  const [isLoading, setIsLoading] = useState(true);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [query, setQuery] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(() => createObservabilityApiClient(), []);

  const fetch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await client.fetchTraces({
        query: query || undefined,
        serviceName: serviceName || undefined,
        status: status || undefined,
        limit: 50,
      });
      setTraces(payload.items);
    } catch {
      setError('Failed to load traces.');
      setTraces([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetch();
  }, []);

  const services = useMemo(
    () => Array.from(new Set(traces.map((trace) => trace.serviceName).filter(Boolean))).sort(),
    [traces],
  );

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-card p-4">
        <h1 className="text-sm font-semibold text-foreground">Traces</h1>
        <p className="text-xs text-muted-foreground">Search and inspect platform traces pushed through OpenTelemetry.</p>

        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search operation or attributes"
          />
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={serviceName}
            onChange={(event) => setServiceName(event.target.value)}
          >
            <option value="">All services</option>
            {services.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="OK">OK</option>
            <option value="ERROR">ERROR</option>
            <option value="TIMEOUT">TIMEOUT</option>
            <option value="UNSET">UNSET</option>
          </select>
          <button
            type="button"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
            onClick={() => {
              void fetch();
            }}
          >
            Apply
          </button>
        </div>
      </section>

      {error ? <p className="text-sm text-amber-600">{error}</p> : null}
      <TracesTable traces={traces} loading={isLoading} onRefresh={() => void fetch()} />
    </div>
  );
}
