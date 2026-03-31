import type { OperationalReadinessActionRun, OperationalReadinessProbeRun } from '@/lib/operationalReadiness';

function formatTimestamp(value: string | null): string {
  if (!value) return 'Unavailable';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unavailable';
  return parsed.toLocaleString();
}

function ProbeHistoryCard({
  title,
  emptyState,
  result,
  durationMs,
  createdAt,
  failureReason,
}: {
  title: string;
  emptyState: string;
  result?: string;
  durationMs?: number;
  createdAt?: string | null;
  failureReason?: string | null;
}) {
  if (!result) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
        {emptyState}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-background/85 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-foreground">{title}</p>
        <span className="rounded-full border border-border/70 bg-card/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {result}
        </span>
      </div>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Recorded</dt>
          <dd className="mt-1 text-foreground">{formatTimestamp(createdAt ?? null)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Duration</dt>
          <dd className="mt-1 font-medium tabular-nums text-foreground">
            {typeof durationMs === 'number' ? `${durationMs} ms` : 'Unavailable'}
          </dd>
        </div>
      </dl>

      {failureReason ? <p className="mt-3 text-sm text-rose-700 dark:text-rose-300">{failureReason}</p> : null}
    </div>
  );
}

export function OperationalReadinessProbeHistoryPanel({
  latestProbeRun,
  latestActionRun,
}: {
  latestProbeRun?: OperationalReadinessProbeRun | null;
  latestActionRun?: OperationalReadinessActionRun | null;
}) {
  return (
    <article className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground">Probe History</h3>
        <p className="text-sm text-muted-foreground">
          Latest backend-owned proof and remediation records for this check.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <ProbeHistoryCard
          title="Latest probe run"
          emptyState="No probe run recorded yet."
          result={latestProbeRun?.result}
          durationMs={latestProbeRun?.duration_ms}
          createdAt={latestProbeRun?.created_at}
          failureReason={latestProbeRun?.failure_reason}
        />
        <ProbeHistoryCard
          title="Latest action run"
          emptyState="No action run recorded yet."
          result={latestActionRun?.result}
          durationMs={latestActionRun?.duration_ms}
          createdAt={latestActionRun?.created_at}
          failureReason={latestActionRun?.failure_reason}
        />
      </div>
    </article>
  );
}
