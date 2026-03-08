import { NocodeCard } from './NocodeCard';
import type { FlowRetry } from '../flow-document';

const RETRY_TYPES = ['constant', 'exponential', 'random'] as const;

type Props = {
  retry: FlowRetry | undefined;
  onChange: (value: FlowRetry | undefined) => void;
};

export function RetrySection({ retry, onChange }: Props) {
  const selectedType = retry?.type ?? '';

  const selectType = (type: string) => {
    if (type === selectedType) {
      onChange(undefined);
    } else {
      onChange({ ...retry, type: type as FlowRetry['type'] });
    }
  };

  return (
    <NocodeCard name="retry" typeBadge="Complex">
      <div className="flex items-center gap-4">
        {RETRY_TYPES.map((type) => (
          <label key={type} className="flex items-center gap-2 cursor-pointer">
            <span
              className="relative inline-flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors"
              style={{
                borderColor: selectedType === type ? 'var(--primary)' : 'var(--border)',
              }}
            >
              {selectedType === type && (
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              )}
            </span>
            <span className="text-sm text-foreground capitalize">{type}</span>
          </label>
        ))}
      </div>
    </NocodeCard>
  );
}
