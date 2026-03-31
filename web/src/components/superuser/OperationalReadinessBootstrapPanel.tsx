import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { OperationalReadinessBootstrapState } from '@/lib/operationalReadiness';

/* ── Probe status ring (matches check grid ring style) ─────────────────── */

type ProbeStatus = OperationalReadinessBootstrapState['probes'][number]['status'];

const PROBE_RING: Record<ProbeStatus, { stroke: string; fill: string }> = {
  ok: { stroke: 'stroke-emerald-500', fill: 'fill-emerald-500' },
  warn: { stroke: 'stroke-amber-500', fill: 'fill-amber-500' },
  fail: { stroke: 'stroke-rose-500', fill: 'fill-rose-500' },
  pending: { stroke: 'stroke-slate-400', fill: 'fill-slate-400' },
  skipped: { stroke: 'stroke-slate-300 dark:stroke-slate-600', fill: 'fill-slate-300 dark:fill-slate-600' },
};

function ProbeRing({ status }: { status: ProbeStatus }) {
  const { stroke, fill } = PROBE_RING[status];
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" className="shrink-0" aria-hidden="true">
      <circle cx={8} cy={8} r={6} className={`${stroke} fill-none`} strokeWidth={1.5} />
      {status === 'ok' ? (
        <circle cx={8} cy={8} r={3} className={fill} />
      ) : status === 'fail' ? (
        <>
          <line x1={5.5} y1={5.5} x2={10.5} y2={10.5} className={stroke} strokeWidth={1.5} strokeLinecap="round" />
          <line x1={10.5} y1={5.5} x2={5.5} y2={10.5} className={stroke} strokeWidth={1.5} strokeLinecap="round" />
        </>
      ) : status === 'warn' ? (
        <>
          <line x1={8} y1={5} x2={8} y2={8.5} className={stroke} strokeWidth={1.5} strokeLinecap="round" />
          <circle cx={8} cy={10.5} r={0.8} className={fill} />
        </>
      ) : (
        <circle cx={8} cy={8} r={1.5} className={fill} />
      )}
    </svg>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

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
      return '';
  }
}

/* ── Component ─────────────────────────────────────────────────────────── */

export function OperationalReadinessBootstrapPanel({
  bootstrap,
  error,
}: {
  bootstrap: OperationalReadinessBootstrapState;
  error?: string | null;
}) {
  const ready = bootstrap.snapshot_available;

  if (ready) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-2.5 text-sm">
        <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-500" />
        <span className="text-foreground">Snapshot loaded</span>
        <span className="text-muted-foreground">— {bootstrap.diagnosis_summary}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{bootstrap.diagnosis_title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{nextOperatorAction(bootstrap.diagnosis_kind)}</p>
        </div>
      </div>

      {/* Probe timeline (inspired by pipeline builder progress list) */}
      <details className="rounded-xl border border-border/70 bg-card/80">
        <summary className="cursor-pointer list-none px-4 py-2.5 text-sm text-muted-foreground">
          Probe details ({bootstrap.probes.filter((p) => p.status === 'fail').length} failed, {bootstrap.probes.filter((p) => p.status === 'ok').length} ok)
        </summary>
        <div className="border-t border-border/60 px-4 py-3">
          <div className="relative">
            {bootstrap.probes.length > 1 ? (
              <div
                aria-hidden="true"
                className="absolute left-[7px] top-[16px] w-px bg-border/60"
                style={{ bottom: 16 }}
              />
            ) : null}
            <div className="space-y-0">
              {bootstrap.probes.map((probe) => (
                <div key={probe.probe_id} className="flex items-start gap-3 py-1.5">
                  <div className="relative z-10 mt-0.5 flex shrink-0 items-center justify-center rounded-full bg-card" style={{ width: 16 }}>
                    <ProbeRing status={probe.status} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{probe.label}</span>
                      {typeof probe.http_status_code === 'number' ? (
                        <span className="rounded border border-border/60 bg-background/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {probe.http_status_code}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{probe.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </details>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-900 dark:text-rose-100">
          <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}
    </div>
  );
}
