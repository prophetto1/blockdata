import { Link } from 'react-router-dom';
import { agchainOverviewEvaluationActions } from './agchainOverviewPlaceholderData';

export function AgchainOverviewEvaluationCard() {
  return (
    <article
      data-testid="agchain-overview-evaluation-card"
      className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-foreground">Evaluation</p>
          <p className="mt-2 text-sm text-muted-foreground">Experiment score progress</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {agchainOverviewEvaluationActions.map((action) => (
            <Link
              key={action.href}
              to={action.href}
              className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border/70 bg-background/50 p-4">
        <div className="flex items-end gap-3">
          <span className="text-4xl font-semibold tracking-tight text-foreground">0</span>
          <span className="pb-1 text-sm text-muted-foreground">Active experiments</span>
        </div>
        <div className="mt-6 h-40 rounded-2xl border border-dashed border-border/70 bg-background/70 p-4">
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No score data yet. Seed the project with datasets, prompts, and scorers to begin comparisons.
          </div>
        </div>
      </div>
    </article>
  );
}
