import type { OperationalReadinessSummary as Summary } from '@/lib/operationalReadiness';

const SUMMARY_ITEMS: Array<{ key: keyof Summary; label: string }> = [
  { key: 'ok', label: 'OK' },
  { key: 'warn', label: 'WARN' },
  { key: 'fail', label: 'FAIL' },
  { key: 'unknown', label: 'UNKNOWN' },
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
  summary: Summary;
  refreshedAt: string | null;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))_auto] md:items-center">
        {SUMMARY_ITEMS.map(({ key, label }) => (
          <div key={key} className="rounded-xl border border-border/80 bg-background/80 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{summary[key]}</p>
          </div>
        ))}
        <div className="rounded-xl border border-dashed border-border/80 bg-background/60 px-3 py-3 text-sm text-muted-foreground">
          {formatRefreshTime(refreshedAt)}
        </div>
      </div>
    </section>
  );
}
