import type { OperationalReadinessSummary as Summary } from '@/lib/operationalReadiness';

type RuntimeIdentity = {
  runtimeEnvironment: string | null;
  serviceName: string | null;
  revisionName: string | null;
  configurationName: string | null;
  serviceAccountEmail: string | null;
};

const SUMMARY_ITEMS: Array<{ key: keyof Summary; label: string; tone: string }> = [
  {
    key: 'ok',
    label: 'OK',
    tone: 'border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300',
  },
  {
    key: 'warn',
    label: 'WARN',
    tone: 'border-amber-500/20 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300',
  },
  {
    key: 'fail',
    label: 'FAIL',
    tone: 'border-rose-500/20 bg-rose-500/[0.08] text-rose-700 dark:text-rose-300',
  },
  {
    key: 'unknown',
    label: 'UNKNOWN',
    tone: 'border-slate-500/20 bg-slate-500/[0.08] text-slate-700 dark:text-slate-300',
  },
];

function formatRefreshTime(value: string | null): string {
  if (!value) return 'Last refresh unavailable';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Last refresh unavailable';
  return `Last refresh ${parsed.toLocaleString()}`;
}

function hasRuntimeIdentity(identity: RuntimeIdentity | null): identity is RuntimeIdentity {
  if (!identity) return false;
  return Object.values(identity).some((value) => Boolean(value));
}

function formatRuntimeEnvironment(value: string | null): string | null {
  if (!value) return null;
  if (value === 'cloud_run') return 'Cloud Run';
  if (value === 'local') return 'Local';
  return value.replace(/[_-]+/g, ' ');
}

export function OperationalReadinessSummary({
  summary,
  refreshedAt,
  runtimeIdentity,
}: {
  summary: Summary | null;
  refreshedAt: string | null;
  runtimeIdentity: RuntimeIdentity | null;
}) {
  if (!summary) return null;

  const showRuntimeIdentity = hasRuntimeIdentity(runtimeIdentity);

  return (
    <section className="rounded-[28px] border border-border/70 bg-card/75 p-3 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[repeat(4,minmax(0,132px))_minmax(260px,1fr)] lg:items-stretch">
        {SUMMARY_ITEMS.map(({ key, label, tone }) => (
          <div key={key} className={`rounded-2xl border px-3 py-2.5 ${tone}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-current/80">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{summary[key]}</p>
          </div>
        ))}

        <div
          aria-live="polite"
          className={`grid gap-3 ${showRuntimeIdentity ? 'sm:grid-cols-2' : ''}`}
        >
          <div className="rounded-2xl border border-dashed border-border/80 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Authoritative Snapshot
            </p>
            <p className="mt-2 text-base font-medium text-foreground">{formatRefreshTime(refreshedAt)}</p>
          </div>

          {showRuntimeIdentity ? (
            <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Active runtime
              </p>
              <dl className="mt-2 grid gap-x-3 gap-y-1.5 sm:grid-cols-[max-content_1fr]">
                {runtimeIdentity.serviceName ? (
                  <>
                    <dt className="text-muted-foreground">Service</dt>
                    <dd className="break-words font-medium text-foreground">{runtimeIdentity.serviceName}</dd>
                  </>
                ) : null}
                {runtimeIdentity.revisionName ? (
                  <>
                    <dt className="text-muted-foreground">Revision</dt>
                    <dd className="break-words font-medium text-foreground">{runtimeIdentity.revisionName}</dd>
                  </>
                ) : null}
                {runtimeIdentity.serviceAccountEmail ? (
                  <>
                    <dt className="text-muted-foreground">Identity</dt>
                    <dd className="break-words font-medium text-foreground">{runtimeIdentity.serviceAccountEmail}</dd>
                  </>
                ) : null}
                {formatRuntimeEnvironment(runtimeIdentity.runtimeEnvironment) ? (
                  <>
                    <dt className="text-muted-foreground">Environment</dt>
                    <dd className="break-words font-medium text-foreground">
                      {formatRuntimeEnvironment(runtimeIdentity.runtimeEnvironment)}
                    </dd>
                  </>
                ) : null}
                {runtimeIdentity.configurationName ? (
                  <>
                    <dt className="text-muted-foreground">Config</dt>
                    <dd className="break-words font-medium text-foreground">{runtimeIdentity.configurationName}</dd>
                  </>
                ) : null}
              </dl>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
