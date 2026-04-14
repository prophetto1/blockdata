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
          <section className="rounded-[28px] border border-dashed border-border/70 bg-card/70 p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Operational Readiness
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {loading ? 'Loading readiness snapshot...' : 'Readiness snapshot not yet available.'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {bootstrap?.diagnosis_summary ?? 'Bootstrap scaffolds stay visible while the authoritative snapshot is still resolving.'}
            </p>
          </section>
        )}

        <section className="rounded-[24px] border border-border/70 bg-card/80 p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Browser Slice Status
              </p>
              <h3 className="mt-1 text-sm font-semibold text-foreground">Bootstrap + frontend targeting</h3>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {refreshing ? 'Refreshing' : bootstrap?.diagnosis_title ?? 'Pending'}
            </span>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            {errorMessage ?? bootstrap?.diagnosis_summary ?? 'The browser-state plane stays visible even while the snapshot handshake is still in motion.'}
          </p>

          {showQueryDetails ? (
            <dl className="mt-4 grid gap-2 sm:grid-cols-2">
              {diagnostics.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="mt-1 break-all text-sm font-medium text-foreground">{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>
      </div>

      <div className="grid gap-4">
        <section className="rounded-[24px] border border-border/70 bg-card/80 p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Query Family
          </p>
          <h3 className="mt-1 text-sm font-semibold text-foreground">Slice-scoped cache summary</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Cached queries</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{querySummary.total}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Currently fetching</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{querySummary.fetching}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Fresh</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{querySummary.fresh}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Stale</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{querySummary.stale}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-border/70 bg-card/80 p-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Zustand UI Slice
          </p>
          <h3 className="mt-1 text-sm font-semibold text-foreground">Client-only operator view state</h3>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Focused plane</dt>
              <dd className="mt-2 text-sm font-medium capitalize text-foreground">
                {formatPlaneLabel(storeSummary.selectedPlane)}
              </dd>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Expanded groups</dt>
              <dd className="mt-2 text-sm font-medium text-foreground">{storeSummary.expandedGroups}</dd>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Visible panels</dt>
              <dd className="mt-2 text-sm font-medium text-foreground">{storeSummary.enabledPanels}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-muted-foreground">
            No server payloads are mirrored into Zustand. This slice only keeps UI state: plane focus, row collapse, and panel visibility.
          </p>
        </section>
      </div>
    </div>
  );
}
