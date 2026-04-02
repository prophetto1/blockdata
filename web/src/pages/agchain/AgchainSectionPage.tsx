import { Link } from 'react-router-dom';
import { useAgchainProjectFocus } from '@/hooks/agchain/useAgchainProjectFocus';
import { AgchainPageFrame } from './AgchainPageFrame';

type AgchainSectionPageProps = {
  title: string;
  description: string;
  bullets: string[];
  statusLabel?: string;
};

export function AgchainSectionPage({
  title,
  description,
  bullets,
  statusLabel = 'Project-scoped placeholder surface',
}: AgchainSectionPageProps) {
  const { focusedProject, status, reload: reloadWorkspace } = useAgchainProjectFocus();

  if (status === 'bootstrapping') {
    return (
      <AgchainPageFrame className="gap-8 py-10">
        <div className="flex flex-1 items-center justify-center"><p className="text-sm text-muted-foreground">Loading workspace...</p></div>
      </AgchainPageFrame>
    );
  }

  if (status === 'error') {
    return (
      <AgchainPageFrame className="gap-8 py-10">
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <p className="text-sm text-muted-foreground">Failed to load AGChain workspace context.</p>
          <button onClick={() => void reloadWorkspace()} className="text-sm font-medium text-foreground underline-offset-4 hover:underline">Retry</button>
        </div>
      </AgchainPageFrame>
    );
  }

  if (status === 'no-organization') {
    return (
      <AgchainPageFrame className="gap-8 py-10">
        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-sm">
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">No organization</h1>
          <p className="mt-3 text-sm text-muted-foreground">Select or create an organization to continue.</p>
        </section>
      </AgchainPageFrame>
    );
  }

  if (!focusedProject) {
    return (
      <AgchainPageFrame className="gap-8 py-10">
        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">AGChain project</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Choose an AGChain project</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            {title} is a child page of the selected AGChain project or evaluation. Pick a project from the registry
            before working in this surface.
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
    <AgchainPageFrame className="gap-8 py-10">
      <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Selected AGChain project</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          {(focusedProject?.project_name ?? focusedProject?.benchmark_name ?? 'Selected project')} owns this {title.toLowerCase()} page. {description}
        </p>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {statusLabel}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {bullets.map((bullet) => (
          <article key={bullet} className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <p className="text-sm leading-7 text-card-foreground">{bullet}</p>
          </article>
        ))}
      </section>
    </AgchainPageFrame>
  );
}
