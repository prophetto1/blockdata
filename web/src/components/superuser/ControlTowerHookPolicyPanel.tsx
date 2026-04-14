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
    <section className="rounded-[24px] border border-stone-300 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            Hook Policy + Audit
          </p>
          <h3 className="mt-1 text-sm font-semibold text-stone-950">Current hook summary without pretending rows exist</h3>
        </div>
        <span className="rounded-full bg-[#f3ece7] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-600">
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
          <div key={label} className="rounded-xl border border-stone-200 bg-[#faf7f3] px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-stone-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-[#faf7f3] px-3 py-4 text-sm text-stone-600">
        Detailed hook-audit records are not yet instrumented on this homepage. This panel is intentionally honest: it shows the backend summary when available and keeps the missing-detail boundary visible.
      </div>
    </section>
  );
}
