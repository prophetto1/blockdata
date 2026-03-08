import { IconPlus, IconX } from '@tabler/icons-react';
import type { FlowDocument, FlowLabel } from '../flow-document';

type Props = {
  doc: FlowDocument;
  updateField: <K extends keyof Omit<FlowDocument, '_extra'>>(key: K, value: FlowDocument[K]) => void;
};

export function LabelsSection({ doc, updateField }: Props) {
  const labels = doc.labels ?? [];

  const update = (next: FlowLabel[]) => updateField('labels', next.length > 0 ? next : undefined);

  const setLabel = (index: number, field: 'key' | 'value', val: string) => {
    const next = labels.map((l, i) => (i === index ? { ...l, [field]: val } : l));
    update(next);
  };

  const addLabel = () => update([...labels, { key: '', value: '' }]);

  const removeLabel = (index: number) => update(labels.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Labels</h3>
        <button
          type="button"
          onClick={addLabel}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <IconPlus size={14} /> Add
        </button>
      </div>
      {labels.length === 0 ? (
        <p className="text-xs text-muted-foreground">No labels defined.</p>
      ) : (
        <div className="space-y-1.5">
          {labels.map((label, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                className="flex h-7 w-full rounded-md border border-input bg-background px-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="key"
                value={label.key}
                onChange={(e) => setLabel(i, 'key', e.target.value)}
              />
              <input
                className="flex h-7 w-full rounded-md border border-input bg-background px-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="value"
                value={label.value}
                onChange={(e) => setLabel(i, 'value', e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeLabel(i)}
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <IconX size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
