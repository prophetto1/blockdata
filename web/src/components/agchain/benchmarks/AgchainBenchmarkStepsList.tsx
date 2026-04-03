import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { AgchainBenchmarkStepRow } from '@/lib/agchainBenchmarks';

type AgchainBenchmarkStepsListProps = {
  steps: AgchainBenchmarkStepRow[];
  selectedStepId: string | null;
  canEdit: boolean;
  loading: boolean;
  mutating: boolean;
  dirtyOrder: boolean;
  onSelect: (benchmarkStepId: string) => void;
  onMove: (benchmarkStepId: string, direction: -1 | 1) => void;
  onSaveOrder: () => Promise<unknown>;
};

function renderBadge(key: string, value: string) {
  return (
    <span
      key={key}
      className="rounded-full border border-border/70 bg-background px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
    >
      {value}
    </span>
  );
}

export function AgchainBenchmarkStepsList({
  steps,
  selectedStepId,
  canEdit,
  loading,
  mutating,
  dirtyOrder,
  onSelect,
  onMove,
  onSaveOrder,
}: AgchainBenchmarkStepsListProps) {
  return (
    <section className="rounded-3xl border border-border/70 bg-card/70 shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-border/70 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Steps</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ordered linear steps are the authored execution contract for this benchmark version.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void onSaveOrder()}
          disabled={!canEdit || !dirtyOrder || mutating}
        >
          Save Order
        </Button>
      </div>

      <div className="grid gap-3 p-4">
        {loading ? (
          <p className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-sm text-muted-foreground">
            Loading steps...
          </p>
        ) : steps.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-sm text-muted-foreground">
            No steps yet. Create the first step to start defining benchmark flow.
          </p>
        ) : (
          steps.map((step, index) => {
            const selected = step.benchmark_step_id === selectedStepId;
            return (
              <div
                key={step.benchmark_step_id}
                className={`rounded-2xl border px-4 py-4 transition ${
                  selected ? 'border-foreground/40 bg-background' : 'border-border/70 bg-card/30'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    aria-label={`Step ${step.step_order}: ${step.display_name}`}
                    onClick={() => onSelect(step.benchmark_step_id)}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Step {step.step_order}
                    </p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="mt-2 truncate text-base font-medium text-foreground">{step.display_name}</p>
                      </TooltipTrigger>
                      <TooltipContent>{step.display_name}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{step.step_id}</p>
                      </TooltipTrigger>
                      <TooltipContent>{step.step_id}</TooltipContent>
                    </Tooltip>
                  </button>

                  {canEdit ? (
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onMove(step.benchmark_step_id, -1)}
                        disabled={mutating || index === 0}
                      >
                        Up
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onMove(step.benchmark_step_id, 1)}
                        disabled={mutating || index === steps.length - 1}
                      >
                        Down
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {renderBadge(`${step.benchmark_step_id}-kind`, step.step_kind)}
                  {renderBadge(`${step.benchmark_step_id}-boundary`, step.api_call_boundary)}
                  {renderBadge(`${step.benchmark_step_id}-scoring`, step.scoring_mode)}
                  {step.inject_payloads.map((payload) =>
                    renderBadge(`${step.benchmark_step_id}-payload-${payload}`, payload),
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
