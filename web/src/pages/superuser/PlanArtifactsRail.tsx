import type { PlanArtifactSummary, PlanUnit } from './planTrackerModel';

type Props = {
  plan: PlanUnit;
  selectedArtifactId: string;
  onSelectArtifact: (artifactId: string) => void;
};

function labelForArtifact(artifact: PlanArtifactSummary) {
  return artifact.title;
}

export function PlanArtifactsRail({ plan, selectedArtifactId, onSelectArtifact }: Props) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-muted/30" data-testid="plan-artifacts-rail">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold tracking-tight">Secondary Artifact Rail</h2>
        <p className="mt-2 text-sm text-muted-foreground">Artifacts for {plan.title}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-1">
          {plan.artifacts.map((artifact) => {
            const selected = artifact.artifactId === selectedArtifactId;
            return (
              <button
                key={artifact.artifactId}
                type="button"
                aria-label={artifact.title}
                onClick={() => onSelectArtifact(artifact.artifactId)}
                className={[
                  'flex w-full items-center justify-between rounded-md border px-3 py-2 text-left transition-colors',
                  selected
                    ? 'border-primary/40 bg-primary/10 text-foreground'
                    : 'border-transparent bg-background/80 text-foreground hover:border-border hover:bg-background',
                ].join(' ')}
              >
                <span className="truncate text-sm font-medium">{labelForArtifact(artifact)}</span>
                <span
                  aria-hidden="true"
                  className="ml-3 shrink-0 rounded bg-muted px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground"
                >
                  {artifact.artifactType}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
