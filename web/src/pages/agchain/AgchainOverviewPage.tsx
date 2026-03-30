import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AgchainOverviewAskLoopPanel } from '@/components/agchain/overview/AgchainOverviewAskLoopPanel';
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

  if (loading && !focusedProject) {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <section className="rounded-3xl border border-border/70 bg-card/70 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Project overview</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Loading project overview...</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Resolving the focused AGChain project before rendering overview-first surfaces.
          </p>
        </section>
      </AgchainPageFrame>
    );
  }

  if (!focusedProject) {
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

  const projectName = focusedProject.benchmark_name;

  return (
    <AgchainPageFrame className="gap-6 py-8" data-testid="agchain-overview-page">
      <section className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Selected AGChain project
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Project overview</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            {projectName} is the active AGChain project context. This overview-first shell makes room for datasets,
            prompts, scorers, parameters, tools, observability, and settings before deeper benchmark editing.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 xl:items-end">
          <div className="rounded-full border border-border/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Project slug {focusedProject.benchmark_slug}
          </div>
          <Link
            to="/app/agchain/settings"
            className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Configure project
          </Link>
        </div>
      </section>

      <AgchainOverviewAskLoopPanel projectName={projectName} />

      <section className="grid gap-6 xl:grid-cols-2">
        <AgchainOverviewObservabilityCard />
        <AgchainOverviewEvaluationCard />
      </section>

      <AgchainOverviewRecentGrid />

      <section className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
        <p className="text-lg font-semibold text-foreground">Project description</p>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground">
          {focusedProject.description || 'This project currently uses a benchmark-backed AGChain definition while the broader project shell is being promoted into first-class level-one surfaces.'}
        </p>
      </section>
    </AgchainPageFrame>
  );
}
