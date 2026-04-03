import { Link } from 'react-router-dom';
import { AgchainEmptyState } from '@/components/agchain/AgchainEmptyState';
import { ShellPageHeader } from '@/components/shell/ShellPageHeader';
import { useAgchainScopeState } from '@/hooks/agchain/useAgchainScopeState';
import { AgchainPageFrame } from '@/pages/agchain/AgchainPageFrame';

export type AgchainProjectPlaceholderPageProps = {
  title: string;
  description: string;
  bullets: string[];
  statusLabel?: string;
};

export function AgchainProjectPlaceholderPage({
  title,
  description,
  bullets,
  statusLabel = 'Coming soon',
}: AgchainProjectPlaceholderPageProps) {
  const scopeState = useAgchainScopeState('project');

  if (scopeState.kind === 'bootstrapping') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading AGChain project...</p>
        </div>
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'error') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <AgchainEmptyState
          title="AGChain project unavailable"
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
          description="Select or create an organization to continue into AGChain."
        />
      </AgchainPageFrame>
    );
  }

  if (scopeState.kind === 'no-project') {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <AgchainEmptyState
          title="Choose an AGChain project"
          description={`${title} is scoped to the selected AGChain project or evaluation. Pick a project from the registry before working in this surface.`}
          action={(
            <Link
              to="/app/agchain/projects"
              className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Open project registry
            </Link>
          )}
        />
      </AgchainPageFrame>
    );
  }

  return (
    <AgchainPageFrame className="gap-6 py-8">
      <ShellPageHeader
        title={title}
        description={description}
      />

      <section className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border/60 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {statusLabel}
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-card-foreground">
              This surface is intentionally still a placeholder
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              The route stays mounted so navigation, ownership, and page boundaries are explicit before the deeper product behavior is implemented.
            </p>
          </div>
        </div>

        <ul className="mt-5 grid gap-3">
          {bullets.map((bullet) => (
            <li
              key={bullet}
              className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm leading-7 text-card-foreground"
            >
              {bullet}
            </li>
          ))}
        </ul>
      </section>
    </AgchainPageFrame>
  );
}
