import { useState, useCallback } from 'react';
import type { FlowDocument } from '../flow-document';

type Props = {
  doc: FlowDocument;
  updateField: <K extends keyof Omit<FlowDocument, '_extra'>>(key: K, value: FlowDocument[K]) => void;
};

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-start gap-2">
      <label className="text-xs font-medium text-muted-foreground pt-2">{label}</label>
      {children}
    </div>
  );
}

export function FlowPropertiesSection({ doc, updateField }: Props) {
  const [localId, setLocalId] = useState(doc.id);
  const [localNs, setLocalNs] = useState(doc.namespace);
  const [localDesc, setLocalDesc] = useState(doc.description ?? '');

  const syncId = useCallback(() => {
    if (localId !== doc.id) updateField('id', localId);
  }, [localId, doc.id, updateField]);

  const syncNs = useCallback(() => {
    if (localNs !== doc.namespace) updateField('namespace', localNs);
  }, [localNs, doc.namespace, updateField]);

  const syncDesc = useCallback(() => {
    const val = localDesc.length > 0 ? localDesc : undefined;
    if (val !== doc.description) updateField('description', val);
  }, [localDesc, doc.description, updateField]);

  // Sync local state when doc changes from outside (e.g. code editor)
  if (localId !== doc.id && document.activeElement?.getAttribute('data-field') !== 'id') {
    setLocalId(doc.id);
  }
  if (localNs !== doc.namespace && document.activeElement?.getAttribute('data-field') !== 'namespace') {
    setLocalNs(doc.namespace);
  }
  const docDesc = doc.description ?? '';
  if (localDesc !== docDesc && document.activeElement?.getAttribute('data-field') !== 'description') {
    setLocalDesc(docDesc);
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Flow properties</h3>
      <div className="space-y-2">
        <FieldRow label="id">
          <input
            data-field="id"
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={localId}
            onChange={(e) => setLocalId(e.target.value)}
            onBlur={syncId}
            onKeyDown={(e) => { if (e.key === 'Enter') syncId(); }}
          />
        </FieldRow>
        <FieldRow label="namespace">
          <input
            data-field="namespace"
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={localNs}
            onChange={(e) => setLocalNs(e.target.value)}
            onBlur={syncNs}
            onKeyDown={(e) => { if (e.key === 'Enter') syncNs(); }}
          />
        </FieldRow>
        <FieldRow label="description">
          <textarea
            data-field="description"
            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
            rows={2}
            value={localDesc}
            onChange={(e) => setLocalDesc(e.target.value)}
            onBlur={syncDesc}
            placeholder="Optional description"
          />
        </FieldRow>
      </div>
    </div>
  );
}
