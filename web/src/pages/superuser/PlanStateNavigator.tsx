import { useMemo } from 'react';

import {
  normalizeLifecycleState,
  type LifecycleState,
  type PlanArtifactSummary,
  type PlanUnit,
} from './planTrackerModel';

const LIFECYCLE_TABS: Array<{ id: LifecycleState; label: string }> = [
  { id: 'to-do', label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'under-review', label: 'Under Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'implemented', label: 'Implemented' },
  { id: 'verified', label: 'Verified' },
  { id: 'closed', label: 'Closed' },
];

type PlanStateNavigatorProps = {
  activeState: LifecycleState;
  onChangeState: (state: LifecycleState) => void;
  planUnits: PlanUnit[];
  selectedPlanId: string | null;
  selectedArtifactId: string | null;
  onSelectPlan: (planId: string) => void;
  onSelectArtifact: (artifactId: string) => void;
};

function formatTimestamp(value?: string | null) {
  if (!value) return '--';

  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value;
  }
}

function artifactTypeLabel(value: string) {
  return value.replace(/-/g, ' ');
}

function getArtifactTimestamp(artifact: PlanArtifactSummary) {
  return artifact.metadata.updatedAt ?? artifact.metadata.createdAt ?? null;
}

export function PlanStateNavigator({
  activeState,
  onChangeState,
  planUnits,
  selectedPlanId,
  selectedArtifactId,
  onSelectPlan,
  onSelectArtifact,
}: PlanStateNavigatorProps) {
  const counts = useMemo(() => {
    const map = new Map<LifecycleState, number>();
    for (const tab of LIFECYCLE_TABS) {
      map.set(tab.id, 0);
    }

    for (const unit of planUnits) {
      const resolved = normalizeLifecycleState(unit.status);
      map.set(resolved, (map.get(resolved) ?? 0) + 1);
    }

    return map;
  }, [planUnits]);

  const filteredPlans = useMemo(
    () => planUnits.filter((unit) => normalizeLifecycleState(unit.status) === activeState),
    [activeState, planUnits],
  );

  const activeLabel = LIFECYCLE_TABS.find((tab) => tab.id === activeState)?.label ?? 'Current State';

  return (
    <div className="flex h-full min-h-0 flex-col bg-card" data-testid="plan-state-navigator">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Plans</h2>
        <p className="mt-1 text-xs text-muted-foreground">Lifecycle-driven tracker view</p>
      </div>

      <div className="border-b border-border px-2 py-2">
        <div className="grid grid-cols-2 gap-1 xl:grid-cols-1">
          {LIFECYCLE_TABS.map((tab) => {
            const selected = tab.id === activeState;
            const count = counts.get(tab.id) ?? 0;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeState(tab.id)}
                className={[
                  'flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors',
                  selected
                    ? 'bg-primary/10 text-foreground ring-1 ring-primary/30'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                ].join(' ')}
              >
                <span className="font-medium">{tab.label}</span>
                <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {filteredPlans.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center">
            <div>
              <p className="text-sm font-medium text-foreground">No plans in {activeLabel}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Switch tabs or verify metadata normalization for this directory.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPlans.map((plan) => {
              const selectedPlan = plan.planId === selectedPlanId;

              return (
                <div
                  key={plan.planId}
                  className={[
                    'rounded-lg border transition-colors',
                    selectedPlan ? 'border-primary/30 bg-primary/5' : 'border-border bg-background',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={() => onSelectPlan(plan.planId)}
                    className="w-full px-3 py-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">{plan.title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{plan.artifacts.length} artifacts</span>
                          {plan.productArea ? <span>{plan.productArea}</span> : null}
                          {plan.functionalArea ? <span>{plan.functionalArea}</span> : null}
                        </div>
                      </div>

                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                        {normalizeLifecycleState(plan.status)}
                      </span>
                    </div>
                  </button>

                  {selectedPlan ? (
                    <div className="border-t border-border px-2 py-2">
                      <div className="space-y-1">
                        {plan.artifacts.map((artifact) => {
                          const selectedArtifact = artifact.artifactId === selectedArtifactId;

                          return (
                            <button
                              key={artifact.artifactId}
                              type="button"
                              onClick={() => onSelectArtifact(artifact.artifactId)}
                              className={[
                                'flex w-full items-start justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors',
                                selectedArtifact
                                  ? 'bg-accent text-foreground'
                                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                              ].join(' ')}
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">{artifact.title}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                                  <span className="rounded bg-muted px-1.5 py-0.5 uppercase tracking-wide">
                                    {artifactTypeLabel(artifact.artifactType)}
                                  </span>
                                  <span>v{artifact.version}</span>
                                  <span>{formatTimestamp(getArtifactTimestamp(artifact))}</span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
