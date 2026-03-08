import { NocodeCard } from './NocodeCard';
import type { FlowWorkerGroup } from '../flow-document';

type Props = {
  workerGroup: FlowWorkerGroup | undefined;
  onChange: (value: FlowWorkerGroup | undefined) => void;
};

export function WorkerGroupSection({ workerGroup, onChange }: Props) {
  const update = (patch: Partial<FlowWorkerGroup>) => {
    const next = { ...workerGroup, ...patch };
    if (!next.fallback && !next.key) {
      onChange(undefined);
    } else {
      onChange(next);
    }
  };

  return (
    <NocodeCard name="workerGroup" typeBadge="Complex">
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-foreground">fallback</span>
            <span className="text-xs text-muted-foreground">Enum</span>
          </div>
          <select
            value={workerGroup?.fallback ?? ''}
            onChange={(e) => update({ fallback: e.target.value || undefined })}
            className="flex h-8 w-full rounded-md border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Choose a fallback</option>
            <option value="CANCEL">CANCEL</option>
            <option value="QUEUE">QUEUE</option>
            <option value="FAIL">FAIL</option>
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-foreground">key</span>
            <span className="text-xs text-muted-foreground">String</span>
          </div>
          <input
            className="flex h-8 w-full rounded-md border border-border bg-background px-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={workerGroup?.key ?? ''}
            onChange={(e) => update({ key: e.target.value || undefined })}
          />
        </div>
      </div>
    </NocodeCard>
  );
}
