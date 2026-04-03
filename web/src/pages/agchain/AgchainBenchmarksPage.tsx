import { AgchainBenchmarkToolBag } from '@/components/agchain/benchmarks/AgchainBenchmarkToolBag';
import { AgchainEmptyState } from '@/components/agchain/AgchainEmptyState';
import { Link } from 'react-router-dom';
import { AgchainBenchmarkStepInspector } from '@/components/agchain/benchmarks/AgchainBenchmarkStepInspector';
import { AgchainBenchmarkStepsList } from '@/components/agchain/benchmarks/AgchainBenchmarkStepsList';
import { AgchainBenchmarkWorkbenchHeader } from '@/components/agchain/benchmarks/AgchainBenchmarkWorkbenchHeader';
import { useAgchainBenchmarkSteps } from '@/hooks/agchain/useAgchainBenchmarkSteps';
import { useAgchainScopeState } from '@/hooks/agchain/useAgchainScopeState';
import { AgchainPageFrame } from './AgchainPageFrame';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SplitterRoot, SplitterPanel, SplitterResizeTrigger } from '@/components/ui/splitter';

const SECTIONS = [
  { key: 'steps', label: 'Steps' },
  { key: 'questions', label: 'Questions' },
  { key: 'context', label: 'Context' },
  { key: 'state', label: 'State' },
  { key: 'scoring', label: 'Scoring' },
  { key: 'models', label: 'Models' },
  { key: 'runner', label: 'Runner' },
  { key: 'validation', label: 'Validation' },
  { key: 'runs', label: 'Runs' },
];

export default function AgchainBenchmarksPage() {
  const scopeState = useAgchainScopeState('project');
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
    toolRefs,
    resolvedTools,
    availableTools,
    dirtyToolBag,
    selectStep,
    moveStep,
    saveOrder,
    createStep,
    updateSelectedStep,
    deleteSelectedStep,
    addToolRef,
    updateToolRef,
    moveToolRef,
    removeToolRef,
    saveToolBag,
  } = useAgchainBenchmarkSteps();

  if (scopeState.kind === 'bootstrapping') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'error') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <AgchainEmptyState
          title="AGChain workspace unavailable"
          description="Failed to load AGChain workspace context."
          action={(
            <button
              type="button"
              onClick={() => void scopeState.reload()}
              className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              Retry
            </button>
          )}
        />
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'no-organization') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <AgchainEmptyState
          title="No organization"
          description="Select or create an organization to continue."
        />
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'no-project') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <AgchainEmptyState
          eyebrow="Benchmark definition"
          title="Choose an AGChain project"
          description="Benchmark definition is a child page of the selected AGChain project or evaluation. Pick a project from the registry before editing its benchmark steps."
          action={(
            <Link
              to="/app/agchain/projects"
              className="inline-flex w-fit items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Open project registry
            </Link>
          )}
        />
      </AgchainPageFrame>
    );
  }

  const focusedProject = scopeState.focusedProject;

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

      <Tabs defaultValue="steps" onValueChange={() => {}} className="grid gap-6 xl:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="self-start rounded-3xl border border-border/70 bg-card/70 shadow-sm p-2">
          <TabsList className="flex flex-col gap-0.5">
            {SECTIONS.map((s) => (
              <TabsTrigger
                key={s.key}
                value={s.key}
                className="w-full justify-start rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/20 hover:text-foreground data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:font-semibold"
              >
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </aside>

        <div>
          <TabsContent value="steps">
            <div className="space-y-6">
              <SplitterRoot
                panels={[{ id: 'list', minSize: 30 }, { id: 'inspector', minSize: 25 }]}
                defaultSize={[60, 40]}
                className="min-h-[24rem]"
              >
                <SplitterPanel id="list">
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
                </SplitterPanel>
                <SplitterResizeTrigger id="list:inspector" aria-label="Resize steps and inspector" />
                <SplitterPanel id="inspector">
                  <AgchainBenchmarkStepInspector
                    selectedStep={selectedStep}
                    canEdit={canEdit}
                    loading={loading}
                    mutating={mutating}
                    onSave={updateSelectedStep}
                    onDelete={deleteSelectedStep}
                  />
                </SplitterPanel>
              </SplitterRoot>

              <AgchainBenchmarkToolBag
                toolRefs={toolRefs}
                resolvedTools={resolvedTools}
                availableTools={availableTools}
                canEdit={canEdit && currentVersion?.version_status === 'draft'}
                loading={loading}
                mutating={mutating}
                dirty={dirtyToolBag}
                onAdd={addToolRef}
                onChange={updateToolRef}
                onMove={moveToolRef}
                onRemove={removeToolRef}
                onSave={saveToolBag}
              />
            </div>
          </TabsContent>

          {SECTIONS.filter((s) => s.key !== 'steps').map((s) => (
            <TabsContent key={s.key} value={s.key}>
              <section className="rounded-3xl border border-border/70 bg-card/70 p-8 shadow-sm">
                <h2 className="text-xl font-semibold text-foreground">{s.label}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                  {s.label} remains a child placeholder of the selected AGChain project in this phase. The live surface
                  implemented in this plan is Steps.
                </p>
              </section>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </AgchainPageFrame>
  );
}
