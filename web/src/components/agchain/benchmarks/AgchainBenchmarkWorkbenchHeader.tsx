import { Button } from '@/components/ui/button';
import type { AgchainBenchmarkSummary, AgchainBenchmarkVersionSummary } from '@/lib/agchainBenchmarks';

type AgchainBenchmarkWorkbenchHeaderProps = {
  benchmark: AgchainBenchmarkSummary | null;
  currentVersion: AgchainBenchmarkVersionSummary | null;
  counts: {
    selected_eval_model_count: number;
    tested_model_count: number;
  };
  canEdit: boolean;
  mutating: boolean;
  onCreateStep: () => Promise<unknown>;
};

function renderBadge(label: string, value: string) {
  return (
    <div className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
      <span>{label}: </span>
      <span>{value}</span>
    </div>
  );
}

export function AgchainBenchmarkWorkbenchHeader({
  benchmark,
  currentVersion,
  counts,
  canEdit,
  mutating,
  onCreateStep,
}: AgchainBenchmarkWorkbenchHeaderProps) {
  return (
    <section className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Benchmark</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {benchmark?.benchmark_name ?? 'Benchmark'}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
            {benchmark?.description || 'Ordered benchmark steps, API-call boundaries, and step-level scoring rules.'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Button type="button" onClick={() => void onCreateStep()} disabled={!canEdit || mutating}>
            New Step
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {renderBadge('Status', currentVersion?.version_status ?? 'draft')}
        {renderBadge('Version', currentVersion?.version_label ?? 'v0.1.0')}
        {renderBadge('Steps', String(currentVersion?.step_count ?? 0))}
        {renderBadge('Eval Models', String(counts.selected_eval_model_count))}
        {renderBadge('Tested Models', String(counts.tested_model_count))}
      </div>
    </section>
  );
}
