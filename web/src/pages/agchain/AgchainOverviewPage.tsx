import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AgchainEmptyState } from '@/components/agchain/AgchainEmptyState';
import { AgchainOverviewEvaluationCard } from '@/components/agchain/overview/AgchainOverviewEvaluationCard';
import { AgchainOverviewObservabilityCard } from '@/components/agchain/overview/AgchainOverviewObservabilityCard';
import { AgchainOverviewRecentGrid } from '@/components/agchain/overview/AgchainOverviewRecentGrid';
import { useAgchainScopeState } from '@/hooks/agchain/useAgchainScopeState';
import { useAgchainProjectFocus } from '@/hooks/agchain/useAgchainProjectFocus';
import { AgchainPageFrame } from './AgchainPageFrame';
import { AgchainStandardSurface } from './AgchainStandardSurface';

export default function AgchainOverviewPage() {
  const [searchParams] = useSearchParams();
  const requestedProjectSlug = searchParams.get('project');
  const scopeState = useAgchainScopeState('project');
  const {
    focusedProjectSlug,
    loading,
    setFocusedProjectSlug,
  } = useAgchainProjectFocus();

  useEffect(() => {
    if (requestedProjectSlug && requestedProjectSlug !== focusedProjectSlug) {
      setFocusedProjectSlug(requestedProjectSlug);
    }
  }, [focusedProjectSlug, requestedProjectSlug, setFocusedProjectSlug]);

  if (scopeState.kind === 'bootstrapping') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <div className="flex flex-1 items-center justify-center"><p className="text-sm text-muted-foreground">Loading workspace...</p></div>
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'error') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <AgchainEmptyState
          title="AGChain overview unavailable"
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
          eyebrow="Project overview"
          title="Choose an AGChain project"
          description="Overview is the default child surface of the selected AGChain project or evaluation. Pick a project from the registry before entering the overview-first shell."
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

  const projectDescription = scopeState.focusedProject.description
    || (loading
      ? 'Loading focused AGChain project details...'
      : 'This workspace now acts as the shared AGChain parent surface. Benchmark definition remains a child resource inside the selected project.');

  return (
    <AgchainStandardSurface title="Overview" bodyClassName="space-y-6" surfaceTestId="agchain-standard-surface">
      <section className="grid gap-6 xl:grid-cols-2" data-testid="agchain-overview-page">
        <AgchainOverviewObservabilityCard />
        <AgchainOverviewEvaluationCard />
      </section>

      <AgchainOverviewRecentGrid />

      <section className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
        <p className="text-lg font-semibold text-foreground">Project description</p>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground">
          {projectDescription}
        </p>
      </section>
    </AgchainStandardSurface>
  );
}
