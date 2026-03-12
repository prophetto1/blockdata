import { useId } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useOnlyOfficeEditor } from '@/hooks/useOnlyOfficeEditor';
import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';

type Props = {
  doc: ProjectDocumentRow;
};

export function OnlyOfficeEditorPanel({ doc }: Props) {
  const instanceId = useId();
  const containerId = `oo-editor-${instanceId.replace(/:/g, '')}`;

  const { state } = useOnlyOfficeEditor(
    containerId,
    { source_uid: doc.source_uid },
    true,
  );

  return (
    <div className="relative h-full w-full">
      {state.status === 'opening' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-card text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          Loading editor…
        </div>
      )}

      {state.status === 'error' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-card text-sm text-destructive">
          <AlertCircle size={20} />
          <span>{state.message}</span>
        </div>
      )}

      <div
        id={containerId}
        className={`h-full w-full ${state.status === 'ready' ? '' : 'invisible'}`}
      />
    </div>
  );
}
