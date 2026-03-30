import { Link } from 'react-router-dom';

export function AgchainOverviewObservabilityCard() {
  return (
    <article
      data-testid="agchain-overview-observability-card"
      className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm"
    >
      <p className="text-2xl font-semibold tracking-tight text-foreground">Observability</p>
      <p className="mt-2 text-sm text-muted-foreground">Trace your AI app interactions</p>

      <div className="mt-6 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <span className="text-lg font-semibold">O</span>
      </div>

      <p className="mt-6 text-lg font-semibold text-foreground">Get started with observability</p>
      <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
        Trace user interactions for monitoring, real-time scoring, and review. Annotate logs data and use it as the
        source for evaluations inside the AGChain workspace.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">Set up tracing for your AI app in minutes.</p>

      <Link
        to="/app/agchain/observability"
        className="mt-6 inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        Setup tracing
      </Link>
    </article>
  );
}
