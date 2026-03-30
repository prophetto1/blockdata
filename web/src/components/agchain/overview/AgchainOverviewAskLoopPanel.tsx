import { agchainOverviewPromptPlaceholder } from './agchainOverviewPlaceholderData';

type AgchainOverviewAskLoopPanelProps = {
  projectName: string;
};

export function AgchainOverviewAskLoopPanel({ projectName }: AgchainOverviewAskLoopPanelProps) {
  return (
    <section
      data-testid="agchain-overview-ask-loop"
      className="rounded-3xl border border-border/70 bg-card/70 p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Ask Loop</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask AGChain questions about {projectName} before you move deeper into datasets, prompts, or tools.
          </p>
        </div>
        <div className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-muted-foreground">
          Project context live
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border/70 bg-background/70 p-4">
        <div className="min-h-24 rounded-xl border border-dashed border-border/70 bg-background px-4 py-3 text-sm text-muted-foreground">
          {agchainOverviewPromptPlaceholder}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
            Focused project
          </span>
          <span className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
            Prompt context
          </span>
          <span className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
            Dataset context
          </span>
        </div>
      </div>
    </section>
  );
}
