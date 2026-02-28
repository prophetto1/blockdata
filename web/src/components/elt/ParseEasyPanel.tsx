import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

type Props = {
  projectId: string | null;
};

const TIERS = [
  { key: 'fast', label: 'Fast', credits: 1, description: 'Basic text extraction. Best for clean, text-heavy documents without complex layouts.' },
  { key: 'cost_effective', label: 'Cost Effective', credits: 3, description: 'Good balance of quality and cost. Handles most standard documents well.' },
  { key: 'agentic', label: 'Agentic', credits: 10, description: 'Works well for most documents with diagrams and images. May struggle with complex layouts.' },
  { key: 'agentic_plus', label: 'Agentic Plus', credits: 25, description: 'Best quality for complex documents with tables, charts, and mixed layouts.' },
] as const;

type TierKey = (typeof TIERS)[number]['key'];

export function ParseEasyPanel({ projectId }: Props) {
  const [selectedTier, setSelectedTier] = useState<TierKey>('agentic');
  const activeTier = TIERS.find((t) => t.key === selectedTier) ?? TIERS[2];

  return (
    <ScrollArea className="h-full w-full" viewportClass="p-4">
      <div className="flex min-h-0 flex-col gap-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">
          Parse — Easy{projectId ? ` • Project ${projectId.slice(0, 8)}` : ''}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          Choose a parsing tier. Higher tiers handle more complex document layouts.
        </div>
      </div>

      {/* Tier track */}
      <div className="rounded-md border border-border bg-card p-3">
        <div className="mb-2 text-xs font-semibold">Tiers</div>
        <div className="flex gap-1">
          {TIERS.map((tier) => (
            <button
              key={tier.key}
              type="button"
              onClick={() => setSelectedTier(tier.key)}
              className={`flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                selectedTier === tier.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>

        {/* Tier detail card */}
        <div className="mt-3 rounded border border-border bg-background p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold">{activeTier.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{activeTier.description}</div>
            </div>
            <div className="shrink-0 text-sm font-semibold">{activeTier.credits} credits</div>
          </div>
        </div>
      </div>
      </div>
    </ScrollArea>
  );
}
