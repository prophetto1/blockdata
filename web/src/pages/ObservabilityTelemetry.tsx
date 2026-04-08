import { useEffect, useState } from 'react';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Button } from '@/components/ui/button';
import { platformApiFetch } from '@/lib/platformApi';

type TelemetryStatus = {
  enabled: boolean;
  service_name: string;
  service_namespace: string;
  deployment_environment: string;
  otlp_endpoint: string;
  protocol: string;
  sampler: string;
  sampler_arg: number;
  log_correlation: boolean;
  metrics_enabled: boolean;
  logs_enabled: boolean;
  signoz_ui_url: string;
  jaeger_ui_url: string;
};

export function Component() {
  useShellHeaderTitle({ title: 'Telemetry', breadcrumbs: ['Observability', 'Telemetry'] });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<TelemetryStatus | null>(null);

  async function loadTelemetryStatus() {
    setLoading(true);
    setError(null);

    try {
      const response = await platformApiFetch('/observability/telemetry-status');
      if (!response.ok) {
        let failureDetail = `Telemetry status request failed: ${response.status}`;
        try {
          const body = await response.json() as { detail?: string };
          if (typeof body.detail === 'string' && body.detail.trim()) {
            failureDetail = body.detail;
          }
        } catch {
          // Fall back to the HTTP-status-derived message when no JSON detail is available.
        }
        throw new Error(failureDetail);
      }

      setStatus(await response.json() as TelemetryStatus);
    } catch (nextError) {
      setStatus(null);
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTelemetryStatus();
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
      <header className="rounded-[28px] border border-border/70 bg-card/75 px-5 py-4 shadow-sm md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Phase 1 visibility only
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Telemetry</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              This page reports configured telemetry status from the platform API route
              <span className="font-medium text-foreground"> /observability/telemetry-status</span>.
              It does not prove successful OTLP export or collector ingest.
            </p>
          </div>
          <Button type="button" onClick={() => void loadTelemetryStatus()} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh Status'}
          </Button>
        </div>
      </header>

      {error ? (
        <section role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm">
          <p className="font-semibold text-foreground">Telemetry status unavailable.</p>
          <p className="mt-2 text-muted-foreground">{error}</p>
        </section>
      ) : null}

      {status ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-2xl border border-border/70 bg-card/75 p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Service</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{status.service_name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Namespace: {status.service_namespace} · Environment: {status.deployment_environment}
            </p>
          </article>

          <article className="rounded-2xl border border-border/70 bg-card/75 p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Pipeline status</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{status.enabled ? 'Enabled' : 'Disabled'}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Protocol: {status.protocol} · Sampler: {status.sampler} ({status.sampler_arg})
            </p>
          </article>

          <article className="rounded-2xl border border-border/70 bg-card/75 p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Collector target</p>
            <p className="mt-2 break-all text-lg font-semibold text-foreground">{status.otlp_endpoint}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Metrics: {status.metrics_enabled ? 'enabled' : 'disabled'} · Logs: {status.logs_enabled ? 'enabled' : 'disabled'} · Correlation: {status.log_correlation ? 'enabled' : 'disabled'}
            </p>
          </article>

          <article className="rounded-2xl border border-border/70 bg-card/75 p-5 shadow-sm md:col-span-2 xl:col-span-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Operator links</p>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <a className="font-medium text-foreground underline-offset-4 hover:underline" href={status.signoz_ui_url} target="_blank" rel="noreferrer">
                {status.signoz_ui_url}
              </a>
              <a className="font-medium text-foreground underline-offset-4 hover:underline" href={status.jaeger_ui_url} target="_blank" rel="noreferrer">
                {status.jaeger_ui_url}
              </a>
            </div>
          </article>
        </section>
      ) : null}

      {!loading && !error && !status ? (
        <div className="rounded-2xl border border-border/70 bg-card/75 px-5 py-4 text-sm text-muted-foreground">
          No telemetry status was returned by the platform API.
        </div>
      ) : null}

      {loading && !status ? (
        <div className="rounded-2xl border border-border/70 bg-card/75 px-5 py-4 text-sm text-muted-foreground">
          Loading telemetry status…
        </div>
      ) : null}
    </main>
  );
}
