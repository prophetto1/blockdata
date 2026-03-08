import { IconPlus, IconX } from '@tabler/icons-react';
import type { FlowDocument, FlowInput } from '../flow-document';

const INPUT_TYPES = ['STRING', 'INT', 'FLOAT', 'BOOLEAN', 'DATETIME', 'FILE', 'JSON', 'URI'] as const;

type Props = {
  doc: FlowDocument;
  updateField: <K extends keyof Omit<FlowDocument, '_extra'>>(key: K, value: FlowDocument[K]) => void;
};

export function InputsSection({ doc, updateField }: Props) {
  const inputs = doc.inputs ?? [];

  const update = (next: FlowInput[]) => updateField('inputs', next.length > 0 ? next : undefined);

  const setInput = (index: number, patch: Partial<FlowInput>) => {
    const next = inputs.map((inp, i) => (i === index ? { ...inp, ...patch } : inp));
    update(next);
  };

  const addInput = () => update([...inputs, { id: '', type: 'STRING' }]);

  const removeInput = (index: number) => update(inputs.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Inputs</h3>
        <button
          type="button"
          onClick={addInput}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <IconPlus size={14} /> Add
        </button>
      </div>
      {inputs.length === 0 ? (
        <p className="text-xs text-muted-foreground">No inputs defined.</p>
      ) : (
        <div className="space-y-2">
          {inputs.map((input, i) => (
            <div key={i} className="rounded-md border border-border bg-card p-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <input
                  className="flex h-7 w-full rounded-md border border-input bg-background px-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="id"
                  value={input.id}
                  onChange={(e) => setInput(i, { id: e.target.value })}
                />
                <select
                  className="flex h-7 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={input.type}
                  onChange={(e) => setInput(i, { type: e.target.value })}
                >
                  {INPUT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeInput(i)}
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <IconX size={14} />
                </button>
              </div>
              <div className="flex items-center gap-3 pl-1">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={input.required === true}
                    onChange={(e) => setInput(i, { required: e.target.checked || undefined })}
                    className="rounded border-input"
                  />
                  required
                </label>
                <input
                  className="flex h-7 flex-1 rounded-md border border-input bg-background px-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="default value"
                  value={input.defaults ?? ''}
                  onChange={(e) => setInput(i, { defaults: e.target.value || undefined })}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
