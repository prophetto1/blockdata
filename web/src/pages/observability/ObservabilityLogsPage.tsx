import { useEffect, useMemo, useState } from 'react';

import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { createObservabilityApiClient } from '@/components/observability/api';
import type { LogLevel, LogRecord } from '@/components/observability/types';

const LEVELS: LogLevel[] = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

function formatTime(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function levelClass(level: LogLevel): string {
  switch (level) {
    case 'ERROR':
    case 'FATAL':
      return 'text-rose-500';
    case 'WARN':
      return 'text-amber-500';
    case 'DEBUG':
    case 'TRACE':
      return 'text-slate-500';
    default:
      return 'text-emerald-500';
  }
}

export default function ObservabilityLogsPage() {
  useShellHeaderTitle({ title: 'Logs', breadcrumbs: ['Observability', 'Logs'] });

  const client = createObservabilityApiClient();
  const [query, setQuery] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [minLevel, setMinLevel] = useState<LogLevel | ''>('');
  const [records, setRecords] = useState<LogRecord[]>([]);
  const [streaming, setStreaming] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const services = useMemo(() => Array.from(new Set(records.map((r) => r.serviceName).filter(Boolean))).sort(), [records]);

  useEffect(() => {
    let stop: (() => void) | null = null;
    let cancel = false;

    const hydrate = async () => {
      setLoading(true);
      try {
        const payload = await client.fetchLogs({
          limit: 100,
          query,
          serviceName: serviceName || undefined,
          minLevel: minLevel || undefined,
        });
        if (!cancel) {
          setRecords(payload.items);
        }
      } catch {
        if (!cancel) {
          setError('Unable to load logs from backend.');
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    };

    void hydrate();

    if (streaming) {
      void client
        .subscribeToLogs({
          query,
          serviceName: serviceName || undefined,
          minLevel: minLevel || undefined,
          onMessage: (record) => {
            if (cancel) return;
            setRecords((current) => {
              if (current.some((existing) => existing.logId === record.logId)) return current;
              return [record, ...current].slice(0, 500);
            });
          },
        })
        .then((stopFn) => {
          if (!cancel) {
            stop = stopFn;
          }
        })
        .catch(() => {
          if (!cancel) {
            setError('Streaming unavailable. Polling will still show cached records.');
          }
        });
    }

    return () => {
      cancel = true;
      if (stop) {
        stop();
      }
    };
  }, [query, serviceName, minLevel, streaming]);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Logs</h2>
        <p className="text-xs text-muted-foreground">Inspect recent structured logs and stream updates while enabled.</p>

        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <input
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search message or trace ID"
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
            value={minLevel}
            onChange={(event) => setMinLevel(event.target.value as LogLevel | '')}
          >
            <option value="">Any level</option>
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
            onClick={() => setStreaming((current) => !current)}
          >
            {streaming ? 'Pause stream' : 'Resume stream'}
          </button>
        </div>
      </section>

      {error ? <p className="text-sm text-amber-600">{error}</p> : null}

      <section className="rounded-lg border border-border bg-card">
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Time</th>
                <th className="px-3 py-2 font-semibold">Level</th>
                <th className="px-3 py-2 font-semibold">Service</th>
                <th className="px-3 py-2 font-semibold">Trace ID</th>
                <th className="px-3 py-2 font-semibold">Message</th>
              </tr>
            </thead>
            <tbody>
              {loading && records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-sm text-muted-foreground">
                    Loading logs...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-sm text-muted-foreground">
                    No logs available yet.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.logId} className="border-t border-border">
                    <td className="px-3 py-2 text-muted-foreground">{formatTime(record.timestamp)}</td>
                    <td className={`px-3 py-2 font-semibold ${levelClass(record.level)}`}>{record.level}</td>
                    <td className="px-3 py-2 text-muted-foreground">{record.serviceName || 'unknown'}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{record.traceId || '-'}</td>
                    <td className="px-3 py-2 text-foreground">{record.message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
