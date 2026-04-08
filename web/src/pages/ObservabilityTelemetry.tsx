import { useEffect, useState } from 'react';

import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Button } from '@/components/ui/button';
import { platformApiFetch } from '@/lib/platformApi';

type TelemetryProbeRun = {
  probe_run_id: string;
  probe_kind: string;
  check_id: string | null;
  result: string;
  created_at?: string;
  failure_reason?: string | null;
  evidence?: {
    proof_level?: string;
    request_url?: string;
    http_status_code?: number;
  } | null;
};

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
  proof_status: 'unverified' | 'passing' | 'failing';
  proof_summary: string;
  latest_export_probe_run: TelemetryProbeRun | null;
};

function proofLabel(proofStatus: TelemetryStatus['proof_status']) {
  if (proofStatus === 'passing') {
    return 'Passing';
  }
  if (proofStatus === 'failing') {
    return 'Failing';
  }
  return 'Unverified';
}

async function readErrorDetail(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { detail?: string };
    if (typeof body.detail === 'string' && body.detail.trim()) {
      return body.detail;
    }
  } catch {
    // Fall back to the caller-provided message.
  }
  return fallback;
}

export function Component() {
  useShellHeaderTitle({ title: 'Telemetry', breadcrumbs: ['Observability', 'Telemetry'] });

  const [loading, setLoading] = useState(true);
  const [runningProbe, setRunningProbe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<TelemetryStatus | null>(null);

  async function loadTelemetryStatus() {
    setLoading(true);
    setError(null);

    try {
      const response = await platformApiFetch('/observability/telemetry-status');
      if (!response.ok) {
        throw new Error(
          await readErrorDetail(
            response,
            `Telemetry status request failed: ${response.status}`,
          ),
        );
      }

      setStatus((await response.json()) as TelemetryStatus);
    } catch (nextError) {
      setStatus(null);
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setLoading(false);
    }
  }

  async function runExportProbe() {
    setRunningProbe(true);
    setError(null);

    try {
      const response = await platformApiFetch('/admin/runtime/telemetry/export/probe', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(
          await readErrorDetail(
            response,
            `Telemetry export probe failed: ${response.status}`,
          ),
        );
      }

      await loadTelemetryStatus();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setRunningProbe(false);
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
              Phase 2 proof-backed status
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Telemetry</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              This page shows configured telemetry status and the latest export-probe result from
              <span className="font-medium text-foreground"> /observability/telemetry-status</span>.
              The proof run shows whether the collector accepted a real OTLP traces payload. It
              does not prove sink delivery or trace completeness.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => void runExportProbe()} disabled={loading || runningProbe}>
              {runningProbe ? 'Running Probe...' : 'Run Export Probe'}
            </Button>
            <Button type="button" variant="outline" onClick={() => void loadTelemetryStatus()} disabled={loading || runningProbe}>
              {loading ? 'Loading...' : 'Refresh Status'}
            </Button>
          </div>
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Service
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">{status.service_name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Namespace: {status.service_namespace}, Environment: {status.deployment_environment}
            </p>
          </article>

          <article className="rounded-2xl border border-border/70 bg-card/75 p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Pipeline status
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {status.enabled ? 'Enabled' : 'Disabled'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Protocol: {status.protocol}, Sampler: {status.sampler} ({status.sampler_arg})
            </p>
          </article>

          <article className="rounded-2xl border border-border/70 bg-card/75 p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Collector target
            </p>
            <p className="mt-2 break-all text-lg font-semibold text-foreground">{status.otlp_endpoint}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Metrics: {status.metrics_enabled ? 'enabled' : 'disabled'}, Logs:{' '}
              {status.logs_enabled ? 'enabled' : 'disabled'}, Correlation:{' '}
              {status.log_correlation ? 'enabled' : 'disabled'}
            </p>
          </article>

          <article className="rounded-2xl border border-border/70 bg-card/75 p-5 shadow-sm md:col-span-2 xl:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Latest export proof
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {proofLabel(status.proof_status)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{status.proof_summary}</p>
            {status.latest_export_probe_run ? (
              <dl className="mt-3 space-y-2 text-sm text-muted-foreground">
                <div>
                  <dt className="font-medium text-foreground">Probe kind</dt>
                  <dd>{status.latest_export_probe_run.probe_kind}</dd>
                </div>
                {status.latest_export_probe_run.created_at ? (
                  <div>
                    <dt className="font-medium text-foreground">Recorded at</dt>
                    <dd>{status.latest_export_probe_run.created_at}</dd>
                  </div>
                ) : null}
                {status.latest_export_probe_run.evidence?.request_url ? (
                  <div>
                    <dt className="font-medium text-foreground">Request URL</dt>
                    <dd className="break-all">{status.latest_export_probe_run.evidence.request_url}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </article>

          <article className="rounded-2xl border border-border/70 bg-card/75 p-5 shadow-sm md:col-span-2 xl:col-span-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Operator links
            </p>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <a
                className="font-medium text-foreground underline-offset-4 hover:underline"
                href={status.signoz_ui_url}
                target="_blank"
                rel="noreferrer"
              >
                {status.signoz_ui_url}
              </a>
              <a
                className="font-medium text-foreground underline-offset-4 hover:underline"
                href={status.jaeger_ui_url}
                target="_blank"
                rel="noreferrer"
              >
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
          Loading telemetry status...
        </div>
      ) : null}
    </main>
  );
}
