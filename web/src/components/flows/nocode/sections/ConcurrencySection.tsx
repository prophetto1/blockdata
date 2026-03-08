import { NocodeCard } from './NocodeCard';
import type { FlowConcurrency } from '../flow-document';

const BEHAVIORS = ['QUEUE', 'CANCEL', 'FAIL'] as const;

type Props = {
  concurrency: FlowConcurrency | undefined;
  onChange: (value: FlowConcurrency | undefined) => void;
};

export function ConcurrencySection({ concurrency, onChange }: Props) {
  const limit = concurrency?.limit ?? 0;
  const behavior = concurrency?.behavior ?? 'QUEUE';

  const update = (patch: Partial<FlowConcurrency>) => {
    const next = { ...concurrency, ...patch };
    if (!next.limit && !next.behavior) {
      onChange(undefined);
    } else {
      onChange(next);
    }
  };

  return (
    <NocodeCard name="concurrency" typeBadge="Complex">
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-foreground">limit</span>
            <span className="text-xs text-muted-foreground">Number</span>
          </div>
          <div className="flex items-center gap-0">
            <button
              type="button"
              onClick={() => update({ limit: Math.max(0, limit - 1) })}
              className="flex h-8 w-8 items-center justify-center rounded-l-md border border-border bg-background text-sm hover:bg-accent"
            >
              &minus;
            </button>
            <input
              type="number"
              min={0}
              value={limit}
              onChange={(e) => update({ limit: Number(e.target.value) || 0 })}
              className="h-8 flex-1 border-y border-border bg-background px-2 text-center text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => update({ limit: limit + 1 })}
              className="flex h-8 w-8 items-center justify-center rounded-r-md border border-border bg-background text-sm hover:bg-accent"
            >
              +
            </button>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-foreground">behavior</span>
            <span className="text-xs text-muted-foreground">Enum</span>
          </div>
          <select
            value={behavior}
            onChange={(e) => update({ behavior: e.target.value })}
            className="flex h-8 w-full rounded-md border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {BEHAVIORS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>
    </NocodeCard>
  );
}
