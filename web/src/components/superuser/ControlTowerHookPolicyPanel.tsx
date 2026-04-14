import type { CoordinationStatusResponse } from '@/lib/coordinationApi';

type ControlTowerHookPolicyPanelProps = {
  loading: boolean;
  status: CoordinationStatusResponse | null;
};

export function ControlTowerHookPolicyPanel({
  loading,
  status,
}: ControlTowerHookPolicyPanelProps) {
  const hookAudit = status?.hook_audit_summary;

  return (
    <section className="rounded-[24px] border border-border/70 bg-card/80 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Hook Policy + Audit
          </p>
          <h3 className="mt-1 text-sm font-semibold text-foreground">Current hook summary without pretending rows exist</h3>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {loading ? 'Loading' : hookAudit?.state ?? 'not yet instrumented'}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Allow', hookAudit?.allow_count ?? 0],
          ['Warn', hookAudit?.warn_count ?? 0],
          ['Block', hookAudit?.block_count ?? 0],
          ['Error', hookAudit?.error_count ?? 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border/60 bg-muted/30 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-border/70 bg-muted/25 px-3 py-4 text-sm text-muted-foreground">
        Detailed hook-audit records are not yet instrumented on this homepage. This panel is intentionally honest: it shows the backend summary when available and keeps the missing-detail boundary visible.
      </div>
    </section>
  );
}
