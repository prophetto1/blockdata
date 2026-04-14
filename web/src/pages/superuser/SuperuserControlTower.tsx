import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  IconClipboardList,
  IconCode,
  IconPlugConnected,
  IconRefresh,
  IconRoute,
  IconServer,
} from '@tabler/icons-react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { WorkbenchPage } from '@/components/common/WorkbenchPage';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { ControlTowerCoordinationPanel } from '@/components/superuser/ControlTowerCoordinationPanel';
import { ControlTowerHookPolicyPanel } from '@/components/superuser/ControlTowerHookPolicyPanel';
import { ControlTowerRepoTimePanel } from '@/components/superuser/ControlTowerRepoTimePanel';
import { ControlTowerStateQueryPanel } from '@/components/superuser/ControlTowerStateQueryPanel';
import {
  PlatformPlanesStrip,
  type PlatformPlaneDescriptor,
} from '@/components/superuser/PlatformPlanesStrip';
import { Button } from '@/components/ui/button';
import { useCoordinationDiscussionsQuery } from '@/hooks/query/useCoordinationDiscussionsQuery';
import { useCoordinationIdentitiesQuery } from '@/hooks/query/useCoordinationIdentitiesQuery';
import { useCoordinationStatusQuery } from '@/hooks/query/useCoordinationStatusQuery';
import { useOperationalReadinessSnapshotQuery } from '@/hooks/query/useOperationalReadinessSnapshotQuery';
import { useCoordinationStream } from '@/hooks/useCoordinationStream';
import { superuserKeys } from '@/lib/queryKeys/superuserKeys';
import {
  resetSuperuserControlTowerStore,
  useSuperuserControlTowerStore,
  type SuperuserControlTowerGroup,
  type SuperuserControlTowerPlane,
} from '@/stores/useSuperuserControlTowerStore';

type PlaneDescriptor = PlatformPlaneDescriptor & {
  explainerTitle: string;
  explainerBody: string;
  futureSource: string;
};

type SectionFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  actions?: ReactNode;
  children: ReactNode;
};

function sectionActionLabel(collapsed: boolean) {
  return collapsed ? 'Expand section' : 'Collapse section';
}

function ControlTowerSectionFrame({
  eyebrow,
  title,
  description,
  collapsed,
  onToggleCollapsed,
  actions,
  children,
}: SectionFrameProps) {
  return (
    <section className="rounded-[28px] border border-stone-300/90 bg-[#f5f1ed] p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-base font-semibold tracking-tight text-stone-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-stone-300 bg-white text-stone-700 active:scale-95"
            onClick={onToggleCollapsed}
          >
            {sectionActionLabel(collapsed)}
          </Button>
        </div>
      </div>

      {!collapsed ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}

function toneFromReadiness(
  failCount: number,
  warnCount: number,
): PlaneDescriptor['statusTone'] {
  if (failCount > 0) return 'alert';
  if (warnCount > 0) return 'watch';
  return 'healthy';
}

function formatSelectedPlaneLabel(value: SuperuserControlTowerPlane) {
  return value.replace(/-/g, ' ');
}

export function Component() {
  useShellHeaderTitle({
    title: 'Control Tower',
    breadcrumbs: ['Superuser', 'Control Tower'],
  });

  const queryClient = useQueryClient();
  const selectedPlane = useSuperuserControlTowerStore((state) => state.selectedPlane);
  const setSelectedPlane = useSuperuserControlTowerStore((state) => state.setSelectedPlane);
  const collapsedGroups = useSuperuserControlTowerStore((state) => state.collapsedGroups);
  const toggleGroupCollapsed = useSuperuserControlTowerStore((state) => state.toggleGroupCollapsed);
  const panelPreferences = useSuperuserControlTowerStore((state) => state.panelPreferences);
  const setPanelPreference = useSuperuserControlTowerStore((state) => state.setPanelPreference);

  const readinessQuery = useOperationalReadinessSnapshotQuery();
  const coordinationStatusQuery = useCoordinationStatusQuery();
  const coordinationIdentitiesQuery = useCoordinationIdentitiesQuery({ includeStale: true });
  const coordinationDiscussionsQuery = useCoordinationDiscussionsQuery({ status: 'all', limit: 50 });
  const fetchingCount = useIsFetching({ queryKey: superuserKeys.all });
  const coordinationStream = useCoordinationStream({ limit: 12 });

  const readinessSummary = readinessQuery.data?.snapshot?.summary;
  const hookAudit = coordinationStatusQuery.data?.hook_audit_summary;
  const superuserQueries = queryClient.getQueryCache().findAll({ queryKey: superuserKeys.all });
  const staleQueries = superuserQueries.filter((query) => query.isStale()).length;

  const planeDescriptors = useMemo<PlaneDescriptor[]>(() => {
    const readinessFail = readinessSummary?.fail ?? 0;
    const readinessWarn = readinessSummary?.warn ?? 0;
    const readinessTone = readinessQuery.isError
      ? 'alert'
      : readinessSummary
        ? toneFromReadiness(readinessFail, readinessWarn)
        : readinessQuery.isLoading
          ? 'muted'
          : 'watch';

    return [
      {
        planeId: 'browser-state',
        label: 'Browser State',
        role: 'Query bootstrap and browser-owned runtime targeting',
        status: readinessQuery.isLoading ? 'loading' : readinessQuery.isError ? 'error' : readinessQuery.data?.bootstrap.diagnosis_title ?? 'ready',
        statusTone: readinessTone,
        datumLabel: 'Latest datum',
        datumValue: readinessQuery.data?.bootstrap.diagnosis_summary ?? 'Waiting for readiness bootstrap to settle.',
        drillLabel: 'Open readiness',
        drillPath: '/app/superuser/operational-readiness',
        icon: IconServer,
        explainerTitle: 'Browser State is where the control tower proves the frontend is talking to the right backend seam.',
        explainerBody:
          'This plane combines the readiness bootstrap diagnosis, the authoritative snapshot, and the slice-scoped query family so the operator can tell whether the browser is aligned before reading anything deeper.',
        futureSource: 'Future detail continues to come from readiness checks and the shared query family, not from mirrored client state.',
      },
      {
        planeId: 'coordination-state',
        label: 'Coordination State',
        role: 'Broker health, stream bridge posture, and current event flow',
        status: coordinationStatusQuery.isLoading ? 'loading' : coordinationStream.connectionState,
        statusTone: coordinationStream.connectionState === 'connected'
          ? 'healthy'
          : coordinationStream.connectionState === 'error'
            ? 'alert'
            : coordinationStream.connectionState === 'degraded'
              ? 'watch'
              : 'muted',
        datumLabel: 'Latest datum',
        datumValue: coordinationStream.error ?? `Stream bridge ${coordinationStream.connectionState}`,
        drillLabel: 'Open runtime',
        drillPath: '/app/superuser/coordination-runtime',
        icon: IconPlugConnected,
        explainerTitle: 'Coordination State keeps the live runtime substrate visible without forcing it into a polling abstraction.',
        explainerBody:
          'The control tower treats the coordination bridge as a live seam: status and counts come from TanStack Query, while the event line remains an SSE surface through useCoordinationStream.',
        futureSource: 'Future richness here comes from additional event metadata, not from collapsing the stream into query snapshots.',
      },
      {
        planeId: 'identity-routing',
        label: 'Identity + Routing',
        role: 'Who is present, who owns work, and where discussion routes land',
        status: coordinationIdentitiesQuery.isLoading ? 'loading' : 'live',
        statusTone: coordinationIdentitiesQuery.isError || coordinationDiscussionsQuery.isError
          ? 'alert'
          : 'healthy',
        datumLabel: 'Latest datum',
        datumValue: `${coordinationIdentitiesQuery.data?.summary.active_count ?? 0} identities / ${coordinationDiscussionsQuery.data?.summary.thread_count ?? 0} discussions`,
        drillLabel: 'Inspect routing',
        drillPath: '/app/superuser/coordination-runtime',
        icon: IconRoute,
        explainerTitle: 'Identity + Routing connects active agents, workspace-bound discussions, and ownership clues into one legible operator surface.',
        explainerBody:
          'This plane answers the “who is here, where is work flowing, and what path currently owns the conversation?” question without making the operator leave the homepage first.',
        futureSource: 'The current routing detail comes from identities and discussions; richer ownership timelines can arrive later from the same coordination substrate.',
      },
      {
        planeId: 'policy-hooks',
        label: 'Policy + Hooks',
        role: 'Hook audit summary, current policy posture, and explicit instrumentation limits',
        status: coordinationStatusQuery.isLoading ? 'loading' : hookAudit?.state ?? 'not yet instrumented',
        statusTone: hookAudit?.error_count ? 'alert' : hookAudit?.warn_count ? 'watch' : 'muted',
        datumLabel: 'Latest datum',
        datumValue: hookAudit
          ? `${hookAudit.allow_count} allow / ${hookAudit.warn_count} warn / ${hookAudit.block_count} block`
          : 'Hook rows are not yet instrumented on this homepage.',
        drillLabel: 'Open runtime summary',
        drillPath: '/app/superuser/coordination-runtime',
        icon: IconCode,
        explainerTitle: 'Policy + Hooks is intentionally honest about the line between summary data and missing detail.',
        explainerBody:
          'The plane surfaces current hook-audit counts when they exist, but it does not pretend the homepage has record-level hook detail before that telemetry actually lands.',
        futureSource: 'This plane becomes richer when hook audit rows and outcomes are published beyond the current summary contract.',
      },
      {
        planeId: 'repo-time-enforcement',
        label: 'Repo-time Enforcement',
        role: 'Visible contract boundary for repo-side checks and future enforcement telemetry',
        status: 'contract visible',
        statusTone: 'muted',
        datumLabel: 'Latest datum',
        datumValue: 'Not yet instrumented; future live source is the HOOK_AUDIT stream.',
        drillLabel: 'Open plan tracker',
        drillPath: '/app/superuser/plan-tracker',
        icon: IconClipboardList,
        explainerTitle: 'Repo-time Enforcement stays visible on day one so the operator sees the boundary before the runtime signal exists.',
        explainerBody:
          'This plane is contract-oriented for now. It tells the truth about where enforcement currently lives and what telemetry source will turn the plane into a live operational surface later.',
        futureSource: 'Future live evidence should come from repo-time checks emitting into HOOKS.CHECK and HOOK_AUDIT on the coordination substrate.',
      },
    ];
  }, [
    coordinationDiscussionsQuery.data?.summary.thread_count,
    coordinationDiscussionsQuery.isError,
    coordinationIdentitiesQuery.data?.summary.active_count,
    coordinationIdentitiesQuery.isError,
    coordinationStatusQuery.data?.hook_audit_summary,
    coordinationStatusQuery.isLoading,
    coordinationStream.connectionState,
    coordinationStream.error,
    hookAudit,
    readinessQuery.data,
    readinessQuery.isError,
    readinessQuery.isLoading,
    readinessSummary,
  ]);

  const selectedPlaneDescriptor =
    planeDescriptors.find((plane) => plane.planeId === selectedPlane) ?? planeDescriptors[0];

  const querySummary = {
    total: superuserQueries.length,
    fetching: fetchingCount,
    stale: staleQueries,
    fresh: Math.max(superuserQueries.length - staleQueries, 0),
  };

  const storeSummary = {
    selectedPlane,
    expandedGroups: (Object.values(collapsedGroups) as boolean[]).filter((value) => !value).length,
    enabledPanels: (Object.values(panelPreferences) as boolean[]).filter(Boolean).length,
  };

  const primaryErrorMessage = [
    readinessQuery.error,
    coordinationStatusQuery.error,
    coordinationIdentitiesQuery.error,
    coordinationDiscussionsQuery.error,
  ]
    .find(Boolean);

  const isRefreshing = fetchingCount > 0;

  return (
    <WorkbenchPage
      eyebrow="Warm Operator Atlas"
      title="Superuser Control Tower"
      description="A dedicated superuser homepage for learning the platform in the same order every visit: browser state first, coordination and routing second, policy and repo-time boundaries always visible."
      actions={(
        <>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-stone-300 bg-white text-stone-700 active:scale-95"
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: superuserKeys.all });
            }}
          >
            <IconRefresh size={15} stroke={1.7} />
            {isRefreshing ? 'Refreshing...' : 'Refresh state'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-stone-300 bg-white text-stone-700 active:scale-95"
            onClick={() => resetSuperuserControlTowerStore()}
          >
            Reset view state
          </Button>
        </>
      )}
      className="bg-[#faf9f7]"
    >
      {primaryErrorMessage ? <ErrorAlert message={primaryErrorMessage.message} /> : null}

      <PlatformPlanesStrip
        planes={planeDescriptors}
        selectedPlane={selectedPlane}
        onSelectPlane={setSelectedPlane}
        connectionLabels={['reads runtime', 'routes work', 'governs hooks', 'enforced in repo']}
      />

      {panelPreferences.showPlaneExplainer ? (
        <section className="rounded-[26px] border border-stone-300 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-3xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
                Focused Plane Explainer
              </p>
              <h2 className="mt-1 text-base font-semibold tracking-tight text-stone-950">
                {selectedPlaneDescriptor.label}
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {selectedPlaneDescriptor.explainerTitle}
              </p>
            </div>
            <span className="rounded-full bg-[#f3ece7] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-600">
              {selectedPlaneDescriptor.status}
            </span>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <div className="rounded-xl border border-stone-200 bg-[#faf7f3] px-4 py-3">
              <p className="text-sm leading-6 text-stone-700">{selectedPlaneDescriptor.explainerBody}</p>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-stone-200 bg-[#faf7f3] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                  Future live source
                </p>
                <p className="mt-2 text-sm text-stone-700">{selectedPlaneDescriptor.futureSource}</p>
              </div>
              <Link
                to={selectedPlaneDescriptor.drillPath}
                className="inline-flex rounded-full border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-[#eb5e41]/35 hover:text-[#a5432f] active:scale-95"
              >
                {selectedPlaneDescriptor.drillLabel}
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <ControlTowerSectionFrame
        eyebrow="Row 1"
        title="State + Query Health"
        description="This row stays closest to browser/application state: readiness, query cache posture, and the thin Zustand slice that controls the operator view."
        collapsed={collapsedGroups['state-query-health']}
        onToggleCollapsed={() => toggleGroupCollapsed('state-query-health')}
        actions={(
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-stone-300 bg-white text-stone-700 active:scale-95"
            onClick={() => setPanelPreference('showQueryDetails', !panelPreferences.showQueryDetails)}
          >
            {panelPreferences.showQueryDetails ? 'Hide query detail' : 'Show query detail'}
          </Button>
        )}
      >
        <ControlTowerStateQueryPanel
          loading={readinessQuery.isLoading}
          refreshing={isRefreshing}
          readiness={readinessQuery.data}
          errorMessage={readinessQuery.error?.message ?? null}
          querySummary={querySummary}
          storeSummary={storeSummary}
          showQueryDetails={panelPreferences.showQueryDetails}
        />
      </ControlTowerSectionFrame>

      <ControlTowerSectionFrame
        eyebrow="Row 2"
        title="Coordination + Routing"
        description="The infrastructural row: live bridge posture, identities, discussions, and current routing ownership without hiding the quiet periods."
        collapsed={collapsedGroups['coordination-routing']}
        onToggleCollapsed={() => toggleGroupCollapsed('coordination-routing')}
        actions={(
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-stone-300 bg-white text-stone-700 active:scale-95"
            onClick={() => setPanelPreference('showCoordinationTimeline', !panelPreferences.showCoordinationTimeline)}
          >
            {panelPreferences.showCoordinationTimeline ? 'Hide timeline' : 'Show timeline'}
          </Button>
        )}
      >
        <ControlTowerCoordinationPanel
          loading={coordinationStatusQuery.isLoading || coordinationIdentitiesQuery.isLoading || coordinationDiscussionsQuery.isLoading}
          status={coordinationStatusQuery.data ?? null}
          identities={coordinationIdentitiesQuery.data ?? null}
          discussions={coordinationDiscussionsQuery.data ?? null}
          connectionState={coordinationStream.connectionState}
          streamError={coordinationStream.error ?? coordinationStream.disabledReason}
          showTimeline={panelPreferences.showCoordinationTimeline}
          events={coordinationStream.events}
        />
      </ControlTowerSectionFrame>

      <ControlTowerSectionFrame
        eyebrow="Row 3"
        title="Hook Policy + Audit"
        description="The final row stays explicit about partial instrumentation. Hook summary and repo-time enforcement remain visible, but they never fake detail that does not exist yet."
        collapsed={collapsedGroups['hook-policy-audit']}
        onToggleCollapsed={() => toggleGroupCollapsed('hook-policy-audit')}
        actions={(
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-stone-300 bg-white text-stone-700 active:scale-95"
            onClick={() => setPanelPreference('showRepoTimeNotes', !panelPreferences.showRepoTimeNotes)}
          >
            {panelPreferences.showRepoTimeNotes ? 'Hide repo-time notes' : 'Show repo-time notes'}
          </Button>
        )}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <ControlTowerHookPolicyPanel
            loading={coordinationStatusQuery.isLoading}
            status={coordinationStatusQuery.data ?? null}
          />
          <ControlTowerRepoTimePanel showNotes={panelPreferences.showRepoTimeNotes} />
        </div>
      </ControlTowerSectionFrame>

      <section className="rounded-[24px] border border-dashed border-stone-300 bg-white/80 px-4 py-3 text-sm text-stone-600">
        Current view state: focused on <span className="font-medium capitalize text-stone-900">{formatSelectedPlaneLabel(selectedPlane)}</span>, with {(Object.keys(collapsedGroups) as SuperuserControlTowerGroup[]).filter((group) => !collapsedGroups[group]).length} open rows and {querySummary.fetching} active fetches.
      </section>
    </WorkbenchPage>
  );
}
