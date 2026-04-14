import { OperationalReadinessSummary } from '@/components/superuser/OperationalReadinessSummary';
import type { LoadOperationalReadinessWithBootstrapResult } from '@/lib/platformApiDiagnostics';
import type { SuperuserControlTowerPlane } from '@/stores/useSuperuserControlTowerStore';

type QuerySummary = {
  total: number;
  fetching: number;
  fresh: number;
  stale: number;
};

type StoreSummary = {
  selectedPlane: SuperuserControlTowerPlane;
  expandedGroups: number;
  enabledPanels: number;
};

type ControlTowerStateQueryPanelProps = {
  loading: boolean;
  refreshing: boolean;
  readiness: LoadOperationalReadinessWithBootstrapResult | undefined;
  errorMessage: string | null;
  querySummary: QuerySummary;
  storeSummary: StoreSummary;
  showQueryDetails: boolean;
};

function formatPlaneLabel(value: SuperuserControlTowerPlane): string {
  return value.replace(/-/g, ' ');
}

export function ControlTowerStateQueryPanel({
  loading,
  refreshing,
  readiness,
  errorMessage,
  querySummary,
  storeSummary,
  showQueryDetails,
}: ControlTowerStateQueryPanelProps) {
  const readinessSnapshot = readiness?.snapshot ?? null;
  const bootstrap = readiness?.bootstrap ?? null;
  const diagnostics = readiness?.clientDiagnostics ?? [];

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
      <div className="space-y-4">
        {readinessSnapshot ? (
          <OperationalReadinessSummary
            summary={readinessSnapshot.summary}
            refreshedAt={readinessSnapshot.generated_at}
            runtimeIdentity={null}
          />
        ) : (
          <section className="rounded-[28px] border border-dashed border-stone-300 bg-white/80 p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
              Operational Readiness
            </p>
            <p className="mt-2 text-sm font-medium text-stone-900">
              {loading ? 'Loading readiness snapshot...' : 'Readiness snapshot not yet available.'}
            </p>
            <p className="mt-1 text-sm text-stone-600">
              {bootstrap?.diagnosis_summary ?? 'Bootstrap scaffolds stay visible while the authoritative snapshot is still resolving.'}
            </p>
          </section>
        )}

        <section className="rounded-[24px] border border-stone-300 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                Browser Slice Status
              </p>
              <h3 className="mt-1 text-sm font-semibold text-stone-950">Bootstrap + frontend targeting</h3>
            </div>
            <span className="rounded-full bg-[#f3ece7] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-600">
              {refreshing ? 'Refreshing' : bootstrap?.diagnosis_title ?? 'Pending'}
            </span>
          </div>

          <p className="mt-3 text-sm text-stone-600">
            {errorMessage ?? bootstrap?.diagnosis_summary ?? 'The browser-state plane stays visible even while the snapshot handshake is still in motion.'}
          </p>

          {showQueryDetails ? (
            <dl className="mt-4 grid gap-2 sm:grid-cols-2">
              {diagnostics.map((item) => (
                <div key={item.id} className="rounded-xl border border-stone-200 bg-[#faf7f3] px-3 py-2.5">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                    {item.label}
                  </dt>
                  <dd className="mt-1 break-all text-sm font-medium text-stone-900">{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>
      </div>

      <div className="grid gap-4">
        <section className="rounded-[24px] border border-stone-300 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            Query Family
          </p>
          <h3 className="mt-1 text-sm font-semibold text-stone-950">Slice-scoped cache summary</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-stone-200 bg-[#faf7f3] px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">Cached queries</p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">{querySummary.total}</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-[#faf7f3] px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">Currently fetching</p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">{querySummary.fetching}</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-[#faf7f3] px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">Fresh</p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">{querySummary.fresh}</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-[#faf7f3] px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">Stale</p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">{querySummary.stale}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-stone-300 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            Zustand UI Slice
          </p>
          <h3 className="mt-1 text-sm font-semibold text-stone-950">Client-only operator view state</h3>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-stone-200 bg-[#faf7f3] px-3 py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">Focused plane</dt>
              <dd className="mt-2 text-sm font-medium capitalize text-stone-950">
                {formatPlaneLabel(storeSummary.selectedPlane)}
              </dd>
            </div>
            <div className="rounded-xl border border-stone-200 bg-[#faf7f3] px-3 py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">Expanded groups</dt>
              <dd className="mt-2 text-sm font-medium text-stone-950">{storeSummary.expandedGroups}</dd>
            </div>
            <div className="rounded-xl border border-stone-200 bg-[#faf7f3] px-3 py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">Visible panels</dt>
              <dd className="mt-2 text-sm font-medium text-stone-950">{storeSummary.enabledPanels}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-stone-600">
            No server payloads are mirrored into Zustand. This slice only keeps UI state: plane focus, row collapse, and panel visibility.
          </p>
        </section>
      </div>
    </div>
  );
}
