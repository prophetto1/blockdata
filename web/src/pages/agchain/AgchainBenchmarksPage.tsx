import { Link, useLocation } from 'react-router-dom';
import { AgchainBenchmarkStepInspector } from '@/components/agchain/benchmarks/AgchainBenchmarkStepInspector';
import { AgchainBenchmarkStepsList } from '@/components/agchain/benchmarks/AgchainBenchmarkStepsList';
import { AgchainBenchmarkWorkbenchHeader } from '@/components/agchain/benchmarks/AgchainBenchmarkWorkbenchHeader';
import { useAgchainBenchmarkSteps } from '@/hooks/agchain/useAgchainBenchmarkSteps';
import { AgchainPageFrame } from './AgchainPageFrame';

const SECTION_LABELS: Record<string, string> = {
  '#steps': 'Steps',
  '#questions': 'Questions',
  '#context': 'Context',
  '#state': 'State',
  '#scoring': 'Scoring',
  '#models': 'Models',
  '#runner': 'Runner',
  '#validation': 'Validation',
  '#runs': 'Runs',
};

export default function AgchainBenchmarksPage() {
  const { hash } = useLocation();
  const activeHash = hash || '#steps';
  const activeLabel = SECTION_LABELS[activeHash] ?? 'Steps';
  const {
    benchmark,
    currentVersion,
    counts,
    steps,
    selectedStepId,
    selectedStep,
    canEdit,
    loading,
    mutating,
    error,
    dirtyOrder,
    selectStep,
    moveStep,
    saveOrder,
    createStep,
    updateSelectedStep,
    deleteSelectedStep,
    focusedProject,
    hasProjectFocus,
  } = useAgchainBenchmarkSteps();

  if (!loading && !hasProjectFocus) {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <section className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Benchmark definition
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Choose an AGChain project</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Benchmark definition is a child page of the selected AGChain project or evaluation. Pick a project from
            the registry before editing its benchmark steps.
          </p>
          <Link
            to="/app/agchain/projects"
            className="mt-5 inline-flex w-fit items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Open project registry
          </Link>
        </section>
      </AgchainPageFrame>
    );
  }

  return (
    <AgchainPageFrame className="gap-6 py-8" data-testid="agchain-benchmark-definition-page">
      <section className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Selected AGChain project
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Benchmark definition</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          {focusedProject?.project_name ?? focusedProject?.benchmark_name ?? 'Selected project'} owns this benchmark
          definition page. Benchmarks remain child resources under the selected project, and the multi-project registry
          lives at the projects route, not here.
        </p>
      </section>

      <AgchainBenchmarkWorkbenchHeader
        benchmark={benchmark}
        currentVersion={currentVersion}
        counts={counts}
        canEdit={canEdit}
        mutating={mutating}
        onCreateStep={createStep}
      />

      {error ? (
        <section className="rounded-3xl border border-destructive/40 bg-destructive/5 px-6 py-4 text-sm text-destructive">
          {error}
        </section>
      ) : null}

      {activeHash === '#steps' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(24rem,1fr)]">
          <AgchainBenchmarkStepsList
            steps={steps}
            selectedStepId={selectedStepId}
            canEdit={canEdit}
            loading={loading}
            mutating={mutating}
            dirtyOrder={dirtyOrder}
            onSelect={selectStep}
            onMove={moveStep}
            onSaveOrder={saveOrder}
          />
          <AgchainBenchmarkStepInspector
            selectedStep={selectedStep}
            canEdit={canEdit}
            loading={loading}
            mutating={mutating}
            onSave={updateSelectedStep}
            onDelete={deleteSelectedStep}
          />
        </div>
      ) : (
        <section className="rounded-3xl border border-border/70 bg-card/70 p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-foreground">{activeLabel}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            {activeLabel} remains a child placeholder of the selected AGChain project in this phase. The live surface
            implemented in this plan is `#steps`.
          </p>
        </section>
      )}
    </AgchainPageFrame>
  );
}
