import { IconPlus, IconTrash } from '@tabler/icons-react';
import { NocodeCard } from './NocodeCard';

type Props = {
  name: string;
  items: unknown[] | undefined;
  info?: string;
  onChange: (value: unknown[] | undefined) => void;
};

function itemLabel(item: unknown, index: number): string {
  if (item != null && typeof item === 'object' && 'id' in item) {
    return String((item as Record<string, unknown>).id);
  }
  return `Item ${index + 1}`;
}

function itemSublabel(item: unknown): string | null {
  if (item != null && typeof item === 'object' && 'type' in item) {
    const type = String((item as Record<string, unknown>).type);
    const parts = type.split('.');
    return parts[parts.length - 1] ?? type;
  }
  return null;
}

export function ArraySection({ name, items, info, onChange }: Props) {
  const count = items?.length ?? 0;

  const handleRemove = (index: number) => {
    if (!items) return;
    const next = items.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : undefined);
  };

  const handleAdd = () => {
    const next = [...(items ?? []), { id: '', type: '' }];
    onChange(next);
  };

  return (
    <NocodeCard name={name} typeBadge="Array" info={info}>
      {count > 0 && (
        <div className="space-y-1">
          {items!.map((item, i) => (
            <div key={i} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-medium text-foreground truncate">{itemLabel(item, i)}</span>
                {itemSublabel(item) && (
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">
                    {itemSublabel(item)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <IconTrash size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={handleAdd}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <IconPlus size={14} />
        Add a new value
      </button>
    </NocodeCard>
  );
}
