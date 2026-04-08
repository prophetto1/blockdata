import { useEffect, useState } from 'react';

import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Button } from '@/components/ui/button';
import { platformApiFetch } from '@/lib/platformApi';

type TelemetryStatus = {
  signoz_ui_url: string;
  jaeger_ui_url: string;
  proof_status: 'unverified' | 'passing' | 'failing';
  proof_summary: string;
  latest_export_probe_run: {
    probe_kind: string;
    created_at?: string;
    failure_reason?: string | null;
  } | null;
};

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
  useShellHeaderTitle({ title: 'Traces', breadcrumbs: ['Observability', 'Traces'] });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<TelemetryStatus | null>(null);

  async function loadTraceProofStatus() {
    setLoading(true);
    setError(null);

    try {
      const response = await platformApiFetch('/observability/telemetry-status');
      if (!response.ok) {
        throw new Error(
          await readErrorDetail(
            response,
            `Trace proof status request failed: ${response.status}`,
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

  useEffect(() => {
    void loadTraceProofStatus();
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6">
      <header className="rounded-[28px] border border-border/70 bg-card/75 px-5 py-4 shadow-sm md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Trace proof and inspection
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Traces</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              This page shows the latest telemetry export proof state and where operators should go
              to inspect accepted traces after the backend probe runs.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => void loadTraceProofStatus()} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh Status'}
          </Button>
        </div>
      </header>

      {error ? (
        <section role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm">
          <p className="font-semibold text-foreground">Trace proof status unavailable.</p>
          <p className="mt-2 text-muted-foreground">{error}</p>
        </section>
      ) : null}

      {status ? (
        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-border/70 bg-card/75 p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Latest export proof
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">{status.proof_status}</p>
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
                {status.latest_export_probe_run.failure_reason ? (
                  <div>
                    <dt className="font-medium text-foreground">Failure reason</dt>
                    <dd>{status.latest_export_probe_run.failure_reason}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </article>

          <article className="rounded-2xl border border-border/70 bg-card/75 p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Trace inspectors
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
          No trace proof status was returned by the platform API.
        </div>
      ) : null}
    </main>
  );
}
