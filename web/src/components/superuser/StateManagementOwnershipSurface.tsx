import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, RefreshCw, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  getStateManagementQueryFamily,
  getStateManagementSurface,
  getStateManagementZustandValue,
  isStateManagementObservationObserved,
  stateManagementQueryFamilies,
  stateManagementSurfaces,
  type StateManagementObservationState,
  type StateManagementQueryFamilyDefinition,
  type StateManagementSurfaceDefinition,
  type StateManagementSurfaceId,
} from '@/lib/superuser/stateManagementRegistry';
import { superuserKeys } from '@/lib/queryKeys/superuserKeys';
import { useSuperuserControlTowerStore } from '@/stores/useSuperuserControlTowerStore';

type QueryFamilyObservation = StateManagementQueryFamilyDefinition & {
  observation: StateManagementObservationState;
  queryCount: number;
  fetching: boolean;
  errored: boolean;
};

function formatPlaneLabel(value: string) {
  return value.replaceAll('-', ' ');
}

function getQueryFamilyObservation(
  queryClient: ReturnType<typeof useQueryClient>,
  family: StateManagementQueryFamilyDefinition,
): QueryFamilyObservation {
  const queries = queryClient.getQueryCache().findAll({
    queryKey: family.queryKeyPrefix,
  });

  return {
    ...family,
    observation: queries.length > 0 ? 'observed' : 'not-yet-observed',
    queryCount: queries.length,
    fetching: queries.some((query) => query.state.fetchStatus === 'fetching'),
    errored: queries.some((query) => query.state.status === 'error'),
  };
}

function getObservationTone(observation: QueryFamilyObservation) {
  if (!isStateManagementObservationObserved(observation.observation)) {
    return 'border-dashed border-border/80 bg-muted/20 text-muted-foreground';
  }

  if (observation.errored) {
    return 'border-rose-500/40 bg-rose-500/10 text-rose-200';
  }

  if (observation.fetching) {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-100';
  }

  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
}

function getObservationLabel(observation: QueryFamilyObservation) {
  if (!isStateManagementObservationObserved(observation.observation)) {
    return 'Not yet observed in this session';
  }

  if (observation.errored) {
    return 'Observed in current query cache with errors';
  }

  if (observation.fetching) {
    return 'Observed in current query cache and refreshing';
  }

  return 'Observed in current query cache';
}

function RegistryButton({
  surface,
  selected,
  onSelect,
}: {
  surface: StateManagementSurfaceDefinition;
  selected: boolean;
  onSelect: (surfaceId: StateManagementSurfaceId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(surface.id)}
      aria-label={surface.label}
      aria-pressed={selected}
      className={cn(
        'w-full border-l-2 px-0 py-3 text-left transition-colors',
        selected
          ? 'border-foreground text-foreground'
          : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
      )}
    >
      <span className="block text-sm font-medium">{surface.label}</span>
      <span className="mt-1 block pr-3 text-xs leading-5">{surface.summary}</span>
    </button>
  );
}

function SummaryStrip({
  observedQueryFamilies,
  activePanelCount,
}: {
  observedQueryFamilies: number;
  activePanelCount: number;
}) {
  return (
    <section
      aria-label="State management summary"
      className="grid gap-3 border-b border-border/70 pb-4 md:grid-cols-4"
    >
      <div className="border border-border/70 bg-background px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Mapped surfaces
        </p>
        <p className="mt-2 text-2xl font-semibold text-foreground">{stateManagementSurfaces.length}</p>
      </div>
      <div className="border border-border/70 bg-background px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Query families
        </p>
        <p className="mt-2 text-2xl font-semibold text-foreground">{stateManagementQueryFamilies.length}</p>
      </div>
      <div className="border border-border/70 bg-background px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Observed now
        </p>
        <p className="mt-2 text-2xl font-semibold text-foreground">{observedQueryFamilies}</p>
      </div>
      <div className="border border-border/70 bg-background px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          UI-only values
        </p>
        <p className="mt-2 text-2xl font-semibold text-foreground">{activePanelCount}</p>
      </div>
    </section>
  );
}

function RouteOwnershipInspector({
  surface,
  observations,
}: {
  surface: StateManagementSurfaceDefinition;
  observations: QueryFamilyObservation[];
}) {
  return (
    <div className="space-y-6">
      <section className="space-y-2 border-b border-border/70 pb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Route ownership
        </p>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Route ownership</h2>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{surface.inspectorIntro}</p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium text-foreground">{surface.route}</span>
          <Link
            to={surface.route}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {surface.drilldownLabel}
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <section className="space-y-3 border-b border-border/70 pb-5">
        <h3 className="text-sm font-semibold text-foreground">Query ownership</h3>
        {observations.length > 0 ? (
          <ul className="space-y-3">
            {observations.map((observation) => (
              <li key={observation.id} className="space-y-2 border-b border-border/50 pb-3 last:border-b-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{observation.label}</span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
                      getObservationTone(observation),
                    )}
                  >
                    {getObservationLabel(observation)}
                  </span>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">{observation.summary}</p>
                <dl className="grid gap-2 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold uppercase tracking-[0.18em]">Owner hook</dt>
                    <dd className="mt-1">{observation.ownerHook}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase tracking-[0.18em]">Owner component</dt>
                    <dd className="mt-1">{observation.ownerComponent}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase tracking-[0.18em]">Owner route</dt>
                    <dd className="mt-1">{observation.ownerRoute}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase tracking-[0.18em]">Cached queries</dt>
                    <dd className="mt-1">{observation.queryCount}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            Registry-only surface. This route does not own a server-state family. It inspects the current cache and
            explains ownership instead of replaying neighboring pages.
          </p>
        )}
      </section>

      <section className="space-y-3 border-b border-border/70 pb-5">
        <h3 className="text-sm font-semibold text-foreground">Zustand ownership</h3>
        {surface.zustandValues.length > 0 ? (
          <ul className="space-y-3">
            {surface.zustandValues.map((valueId) => {
              const value = getStateManagementZustandValue(valueId);

              if (!value) {
                return null;
              }

              return (
                <li key={value.id} className="border-b border-border/50 pb-3 last:border-b-0 last:pb-0">
                  <p className="text-sm font-medium text-foreground">{value.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{value.summary}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {value.ownerStore} · {value.lifecycle}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            None wired at the route level today. This surface does not read the shared Control Tower UI slice directly.
          </p>
        )}
      </section>

      <section className="space-y-3 border-b border-border/70 pb-5">
        <h3 className="text-sm font-semibold text-foreground">State vocabulary</h3>
        <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
          {surface.vocabularies.map((vocabulary) => (
            <li key={vocabulary} className="flex items-start gap-3">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-foreground/70" />
              <span>{vocabulary}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 border-b border-border/70 pb-5">
        <h3 className="text-sm font-semibold text-foreground">State-to-visibility</h3>
        <ul className="space-y-3">
          {surface.visibilityRules.map((rule) => (
            <li key={rule.state} className="grid gap-1 md:grid-cols-[10rem_minmax(0,1fr)]">
              <span className="text-sm font-medium text-foreground">{rule.state}</span>
              <span className="text-sm leading-6 text-muted-foreground">{rule.behavior}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Action &amp; invalidation</h3>
        <ul className="space-y-3">
          {surface.actions.map((action) => (
            <li key={action.label} className="grid gap-1 md:grid-cols-[14rem_minmax(0,1fr)]">
              <span className="text-sm font-medium text-foreground">{action.label}</span>
              <div className="space-y-1 text-sm leading-6 text-muted-foreground">
                <p>{action.effect}</p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Invalidation:{' '}
                  {Array.isArray(action.invalidation)
                    ? action.invalidation.join(', ')
                    : action.invalidation}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SupportRail({
  observations,
  onInvalidate,
  onResetUi,
  selectedPlane,
  expandedGroups,
  enabledPanels,
  lastAction,
}: {
  observations: QueryFamilyObservation[];
  onInvalidate: () => void;
  onResetUi: () => void;
  selectedPlane: string;
  expandedGroups: number;
  enabledPanels: number;
  lastAction: string | null;
}) {
  return (
    <aside className="space-y-5 border-l border-border/70 pl-0 lg:pl-5">
      <section className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Supporting rail
        </p>
        <h2 className="text-sm font-semibold text-foreground">Query family registry</h2>
        <ul className="space-y-3">
          {observations.map((observation) => (
            <li key={observation.id} className="space-y-1 border-b border-border/50 pb-3 last:border-b-0 last:pb-0">
              <p className="text-sm font-medium text-foreground">{observation.label}</p>
              <p className="text-xs leading-5 text-muted-foreground">{getObservationLabel(observation)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 border-t border-border/70 pt-5">
        <h2 className="text-sm font-semibold text-foreground">Current Control Tower UI slice</h2>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Focused plane</dt>
            <dd className="mt-1 capitalize text-foreground">{formatPlaneLabel(selectedPlane)}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Expanded groups</dt>
            <dd className="mt-1 text-foreground">{expandedGroups}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Visible panels</dt>
            <dd className="mt-1 text-foreground">{enabledPanels}</dd>
          </div>
        </dl>
        <p className="text-xs leading-5 text-muted-foreground">
          This shared Control Tower store stays local to the browser and only carries operator preferences. Fetched
          payloads remain in TanStack Query.
        </p>
      </section>

      <section className="space-y-3 border-t border-border/70 pt-5">
        <h2 className="text-sm font-semibold text-foreground">Route actions</h2>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onInvalidate}>
            <RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />
            Invalidate observed queries
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onResetUi}>
            <RotateCcw aria-hidden="true" className="mr-2 h-4 w-4" />
            Reset Control Tower UI slice
          </Button>
        </div>
        {lastAction ? <p className="text-xs leading-5 text-muted-foreground">{lastAction}</p> : null}
      </section>
    </aside>
  );
}

export function StateManagementOwnershipSurface() {
  const queryClient = useQueryClient();
  const [selectedSurfaceId, setSelectedSurfaceId] = useState<StateManagementSurfaceId>('control-tower');
  const [lastAction, setLastAction] = useState<string | null>(null);
  const selectedPlane = useSuperuserControlTowerStore((state) => state.selectedPlane);
  const collapsedGroups = useSuperuserControlTowerStore((state) => state.collapsedGroups);
  const panelPreferences = useSuperuserControlTowerStore((state) => state.panelPreferences);
  const resetUiSlice = useSuperuserControlTowerStore((state) => state.reset);

  const selectedSurface = getStateManagementSurface(selectedSurfaceId);
  const observations = stateManagementQueryFamilies.map((family) => getQueryFamilyObservation(queryClient, family));
  const selectedObservations = selectedSurface.queryFamilies
    .map((familyId) => {
      const family = getStateManagementQueryFamily(familyId);
      return family ? getQueryFamilyObservation(queryClient, family) : null;
    })
    .filter((family): family is QueryFamilyObservation => family !== null);
  const observedQueryFamilies = observations.filter((observation) =>
    isStateManagementObservationObserved(observation.observation),
  ).length;
  const expandedGroups = Object.values(collapsedGroups).filter((collapsed) => !collapsed).length;
  const enabledPanels = Object.values(panelPreferences).filter(Boolean).length;

  async function handleInvalidate() {
    await queryClient.invalidateQueries({ queryKey: superuserKeys.all });
    setLastAction('Invalidated the superuser query family from the ownership surface.');
  }

  function handleResetUi() {
    resetUiSlice();
    setLastAction('Reset the shared Control Tower UI slice to its default browser-only values.');
  }

  return (
    <div
      data-testid="superuser-zustand-react-query-ownership-surface"
      className="space-y-6 border border-border/70 bg-background px-4 py-4 md:px-5"
    >
      <section className="space-y-3 border-b border-border/70 pb-5">
        <p className="text-sm leading-6 text-muted-foreground">
          TanStack Query owns server truth. This page shows which superuser route actually consumes each family instead
          of replaying the operational surfaces.
        </p>
        <p className="text-sm leading-6 text-muted-foreground">
          Zustand owns browser-only operator state. This page shows the real UI slice and where that slice is still only
          partial or explanatory.
        </p>
      </section>

      <SummaryStrip
        observedQueryFamilies={observedQueryFamilies}
        activePanelCount={enabledPanels}
      />

      <div className="grid gap-6 xl:grid-cols-[16rem_minmax(0,1fr)_18rem]">
        <nav aria-label="State management routes" className="space-y-1 border-r border-border/70 pr-0 xl:pr-5">
          {stateManagementSurfaces.map((surface) => (
            <RegistryButton
              key={surface.id}
              surface={surface}
              selected={selectedSurface.id === surface.id}
              onSelect={setSelectedSurfaceId}
            />
          ))}
        </nav>

        <RouteOwnershipInspector surface={selectedSurface} observations={selectedObservations} />

        <SupportRail
          observations={observations}
          onInvalidate={() => void handleInvalidate()}
          onResetUi={handleResetUi}
          selectedPlane={selectedPlane}
          expandedGroups={expandedGroups}
          enabledPanels={enabledPanels}
          lastAction={lastAction}
        />
      </div>
    </div>
  );
}
