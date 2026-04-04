import type { PlanUnit } from './planTrackerModel';

type Props = {
  units: PlanUnit[];
  selectedPlanId: string;
  onSelectPlan: (planId: string) => void;
};

const STATUS_ORDER = ['to-do', 'in-progress', 'under-review', 'approved', 'implemented', 'verified', 'closed'];

function labelForStatus(status: string) {
  return status.replaceAll('-', ' ').toUpperCase();
}

export function PlanUnitsRail({ units, selectedPlanId, onSelectPlan }: Props) {
  const groups = STATUS_ORDER.map((status) => ({
    status,
    items: units.filter((unit) => unit.status === status),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-muted/40" data-testid="plan-units-rail">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold tracking-tight">Primary Rail</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.status} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {labelForStatus(group.status)}
              </h3>
              <div className="space-y-1">
                {group.items.map((unit) => {
                  const selected = unit.planId === selectedPlanId;
                  return (
                    <button
                      key={unit.planId}
                      type="button"
                      onClick={() => onSelectPlan(unit.planId)}
                      className={[
                        'flex w-full items-start rounded-md border px-3 py-2 text-left transition-colors',
                        selected
                          ? 'border-primary/40 bg-primary/10 text-foreground'
                          : 'border-transparent bg-background/80 text-foreground hover:border-border hover:bg-background',
                      ].join(' ')}
                    >
                      <span className="text-sm font-medium leading-5">{unit.title}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
