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
    <main className="flex w-full flex-col gap-4 px-6 py-5">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold text-foreground">Telemetry</h1>
        <span className="text-xs text-muted-foreground">
          OTLP export-probe status from <code className="rounded bg-muted px-1 py-0.5 text-[11px]">/observability/telemetry-status</code>
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => void loadTelemetryStatus()} disabled={loading || runningProbe}>
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
          <Button type="button" size="sm" onClick={() => void runExportProbe()} disabled={loading || runningProbe}>
            {runningProbe ? 'Running…' : 'Run Export Probe'}
          </Button>
        </div>
      </header>

      {error ? (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <span className="font-semibold">Telemetry status unavailable.</span> {error}
        </div>
      ) : null}

      {status ? (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-md border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Service</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">{status.service_name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {status.service_namespace} · {status.deployment_environment}
            </p>
          </article>

          <article className="rounded-md border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Pipeline</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              {status.enabled ? 'Enabled' : 'Disabled'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {status.protocol} · sampler {status.sampler} ({status.sampler_arg})
            </p>
          </article>

          <article className="rounded-md border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Collector</p>
            <p className="mt-0.5 break-all text-sm font-semibold text-foreground">{status.otlp_endpoint}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              metrics {status.metrics_enabled ? 'on' : 'off'} · logs {status.logs_enabled ? 'on' : 'off'} · correlation {status.log_correlation ? 'on' : 'off'}
            </p>
          </article>

          <article className="rounded-md border border-border bg-card p-3 md:col-span-2 xl:col-span-2">
            <div className="flex items-baseline gap-2">
              <p className="text-xs text-muted-foreground">Latest export proof</p>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                status.proof_status === 'passing' ? 'bg-emerald-500/15 text-emerald-500' :
                status.proof_status === 'failing' ? 'bg-rose-500/15 text-rose-500' :
                'bg-muted text-muted-foreground'
              }`}>{proofLabel(status.proof_status)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{status.proof_summary}</p>
            {status.latest_export_probe_run ? (
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-muted-foreground">Probe kind</dt>
                <dd className="font-medium text-foreground">{status.latest_export_probe_run.probe_kind}</dd>
                {status.latest_export_probe_run.created_at ? (
                  <>
                    <dt className="text-muted-foreground">Recorded</dt>
                    <dd className="font-medium text-foreground">{status.latest_export_probe_run.created_at}</dd>
                  </>
                ) : null}
                {status.latest_export_probe_run.evidence?.request_url ? (
                  <>
                    <dt className="text-muted-foreground">Request</dt>
                    <dd className="break-all font-medium text-foreground">{status.latest_export_probe_run.evidence.request_url}</dd>
                  </>
                ) : null}
              </dl>
            ) : null}
          </article>

          <article className="rounded-md border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Operator links</p>
            <div className="mt-1 flex flex-col gap-0.5 text-xs">
              <a className="truncate font-medium text-foreground underline-offset-4 hover:underline" href={status.signoz_ui_url} target="_blank" rel="noreferrer">
                SigNoz → {status.signoz_ui_url}
              </a>
              <a className="truncate font-medium text-foreground underline-offset-4 hover:underline" href={status.jaeger_ui_url} target="_blank" rel="noreferrer">
                Jaeger → {status.jaeger_ui_url}
              </a>
            </div>
          </article>
        </section>
      ) : null}

      {!loading && !error && !status ? (
        <div className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          No telemetry status returned by the platform API.
        </div>
      ) : null}

      {loading && !status ? (
        <div className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          Loading telemetry status…
        </div>
      ) : null}
    </main>
  );
}
