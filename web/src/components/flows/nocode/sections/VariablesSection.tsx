import { IconPlus, IconTrash } from '@tabler/icons-react';
import { NocodeCard } from './NocodeCard';

type Props = {
  variables: Record<string, unknown> | undefined;
  onChange: (value: Record<string, unknown> | undefined) => void;
};

export function VariablesSection({ variables, onChange }: Props) {
  const entries = Object.entries(variables ?? {});

  const update = (next: Record<string, unknown>) => {
    onChange(Object.keys(next).length > 0 ? next : undefined);
  };

  const setEntry = (oldKey: string, newKey: string, newValue: string) => {
    const next = { ...variables };
    if (oldKey !== newKey) delete next[oldKey];
    next[newKey] = newValue;
    update(next);
  };

  const removeEntry = (key: string) => {
    const next = { ...variables };
    delete next[key];
    update(next);
  };

  const addEntry = () => {
    const next = { ...variables, '': '' };
    onChange(next);
  };

  return (
    <NocodeCard name="variables" typeBadge="Dict">
      {entries.length > 0 && (
        <div className="space-y-1.5">
          {entries.map(([key, value], i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                className="flex h-7 w-[140px] rounded-md border border-input bg-background px-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="key"
                value={key}
                onChange={(e) => setEntry(key, e.target.value, String(value ?? ''))}
              />
              <input
                className="flex h-7 flex-1 rounded-md border border-input bg-background px-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="value"
                value={String(value ?? '')}
                onChange={(e) => setEntry(key, key, e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeEntry(key)}
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <IconTrash size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={addEntry}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <IconPlus size={14} />
        Add a new value
      </button>
    </NocodeCard>
  );
}
