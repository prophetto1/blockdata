import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AgchainOverviewEvaluationCard } from '@/components/agchain/overview/AgchainOverviewEvaluationCard';
import { AgchainOverviewObservabilityCard } from '@/components/agchain/overview/AgchainOverviewObservabilityCard';
import { AgchainOverviewRecentGrid } from '@/components/agchain/overview/AgchainOverviewRecentGrid';
import { useAgchainProjectFocus } from '@/hooks/agchain/useAgchainProjectFocus';
import { AgchainPageFrame } from './AgchainPageFrame';

export default function AgchainOverviewPage() {
  const [searchParams] = useSearchParams();
  const requestedProjectSlug = searchParams.get('project');
  const {
    focusedProject,
    focusedProjectSlug,
    loading,
    setFocusedProjectSlug,
  } = useAgchainProjectFocus();

  useEffect(() => {
    if (requestedProjectSlug && requestedProjectSlug !== focusedProjectSlug) {
      setFocusedProjectSlug(requestedProjectSlug);
    }
  }, [focusedProjectSlug, requestedProjectSlug, setFocusedProjectSlug]);

  if (!loading && !focusedProject) {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <section className="rounded-3xl border border-border/70 bg-card/70 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Project overview</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Choose an AGChain project</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Overview is the default child surface of the selected AGChain project or evaluation. Pick a project from
            the registry before entering the overview-first shell.
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

  const projectDescription = focusedProject?.description
    || (loading
      ? 'Loading focused AGChain project details...'
      : 'This project currently uses a benchmark-backed AGChain definition while the broader project shell is being promoted into first-class level-one surfaces.');

  return (
    <AgchainPageFrame className="gap-6 py-8" data-testid="agchain-overview-page">
      <section className="grid gap-6 xl:grid-cols-2">
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
    </AgchainPageFrame>
  );
}
