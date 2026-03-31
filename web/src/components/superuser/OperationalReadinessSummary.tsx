import type { OperationalReadinessSummary as Summary } from '@/lib/operationalReadiness';

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

export function OperationalReadinessSummary({
  summary,
  refreshedAt,
}: {
  summary: Summary | null;
  refreshedAt: string | null;
}) {
  if (!summary) return null;

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
          className="rounded-2xl border border-dashed border-border/80 bg-background/70 px-4 py-3 text-sm text-muted-foreground"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Authoritative Snapshot
          </p>
          <p className="mt-2 text-base font-medium text-foreground">{formatRefreshTime(refreshedAt)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Use this strip for count orientation, then move straight into surface triage.
          </p>
        </div>
      </div>
    </section>
  );
}
