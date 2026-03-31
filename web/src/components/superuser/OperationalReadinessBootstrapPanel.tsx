import { AlertTriangle, CheckCircle2, ChevronDown, Info } from 'lucide-react';
import type { OperationalReadinessBootstrapState } from '@/lib/operationalReadiness';

function statusTone(status: OperationalReadinessBootstrapState['probes'][number]['status']): string {
  switch (status) {
    case 'ok':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    case 'warn':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    case 'fail':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300';
    case 'pending':
      return 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300';
    case 'skipped':
      return 'border-slate-500/20 bg-background/70 text-muted-foreground';
  }
}

function nextOperatorAction(diagnosisKind: OperationalReadinessBootstrapState['diagnosis_kind']): string {
  switch (diagnosisKind) {
    case 'platform_api_unreachable':
      return 'Start or retarget platform-api, then refresh this page.';
    case 'readiness_route_missing':
      return 'Switch the frontend to the backend that exposes /admin/runtime/readiness.';
    case 'auth_missing':
      return 'Sign in first, then refresh to load the authoritative snapshot.';
    case 'auth_rejected':
      return 'Refresh the session or fix backend auth configuration before retrying.';
    case 'preflight_or_cors_failure':
      return 'Use the relative /platform-api proxy or repair the direct target CORS policy.';
    case 'target_mismatch':
      return 'Remove the absolute override or point it at the expected local platform-api target.';
    case 'snapshot_http_error':
      return 'Inspect the backend response and retry once the route returns a successful snapshot.';
    case 'unknown_transport_failure':
      return 'Inspect the probe details below before retrying.';
    case 'ready':
      return 'The snapshot is authoritative. Continue with backend readiness triage below.';
  }
}

export function OperationalReadinessBootstrapPanel({
  bootstrap,
  error,
}: {
  bootstrap: OperationalReadinessBootstrapState;
  error?: string | null;
}) {
  const ready = bootstrap.snapshot_available;
  const showExpandedDiagnostics = !ready;

  return (
    <section className="rounded-[28px] border border-border/70 bg-card/80 p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {ready ? (
                <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-emerald-500" />
              ) : (
                <AlertTriangle aria-hidden="true" className="h-5 w-5 text-amber-500" />
              )}
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Bootstrap diagnostics
              </p>
            </div>
            <div className="space-y-1">
              <h2 className={`${ready ? 'text-xl' : 'text-2xl'} font-semibold tracking-tight text-foreground`}>
                {bootstrap.diagnosis_title}
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{bootstrap.diagnosis_summary}</p>
            </div>
          </div>

          <div
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
              ready
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
            }`}
          >
            {ready ? 'Snapshot available' : 'Snapshot unavailable'}
          </div>
        </div>

        <div className={`grid gap-3 ${ready ? 'lg:grid-cols-[1.3fr_1fr]' : 'md:grid-cols-4'}`}>
          <article className="rounded-2xl border border-border/60 bg-background/60 p-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Working path
            </p>
            <div className={`mt-3 grid gap-2 ${ready ? 'sm:grid-cols-3' : 'sm:grid-cols-1'}`}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Origin</p>
                <p className="mt-1 break-all text-sm font-medium text-foreground">{bootstrap.frontend_origin}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Target</p>
                <p className="mt-1 break-all text-sm font-medium text-foreground">{bootstrap.platform_api_target}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Mode</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {bootstrap.base_mode === 'relative_proxy' ? 'relative proxy' : 'absolute direct'}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-border/60 bg-background/60 p-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Next operator action
            </p>
            <p className="mt-3 text-sm leading-6 text-foreground">{nextOperatorAction(bootstrap.diagnosis_kind)}</p>
          </article>
        </div>
      </div>

      <details className="group mt-4 rounded-2xl border border-border/60 bg-background/45 open:bg-background/60" open={showExpandedDiagnostics}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Bootstrap probe details
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {ready
                ? 'Healthy bootstrap detail is collapsed by default so the readiness workbench stays primary.'
                : 'Probe detail stays expanded while bootstrap is still blocking or degrading the page.'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <span>{bootstrap.probes.length} probes</span>
            <ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
          </div>
        </summary>

        <div className="grid gap-3 border-t border-border/60 px-4 py-4 lg:grid-cols-2 xl:grid-cols-3">
          {bootstrap.probes.map((probe) => (
            <article key={probe.probe_id} className="rounded-2xl border border-border/70 bg-background/80 p-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {probe.label}
                  </p>
                  <p className="text-sm font-medium text-foreground">{probe.summary}</p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusTone(probe.status)}`}
                >
                  {probe.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{probe.detail}</p>
              {probe.target_url ? (
                <p className="mt-3 break-all font-mono text-[12px] text-muted-foreground">{probe.target_url}</p>
              ) : null}
              {typeof probe.http_status_code === 'number' ? (
                <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  HTTP {probe.http_status_code}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </details>

      {error ? (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-900 dark:text-rose-100">
          <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}
    </section>
  );
}
