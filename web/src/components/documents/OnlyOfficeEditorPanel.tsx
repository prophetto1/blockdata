import { memo, useId } from 'react';
import { IconAlertCircle, IconLoader2 } from '@tabler/icons-react';
import { useOnlyOfficeEditor } from '@/hooks/useOnlyOfficeEditor';
import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';

type Props = {
  doc: ProjectDocumentRow;
};

/**
 * Static wrapper — React never re-renders or reconciles this node's subtree.
 * OnlyOffice's DocEditor replaces the div's children with an iframe; if React
 * tried to reconcile, it would hit an insertBefore error on the mutated DOM.
 */
const EditorHost = memo(
  ({ id }: { id: string }) => <div id={id} className="h-full w-full" />,
  () => true,
);

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
      {/* Overlay layer — stable wrapper so React never inserts/removes nodes
          as siblings of the OnlyOffice-managed div */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {state.status === 'opening' && (
          <div className="pointer-events-auto h-full w-full flex items-center justify-center gap-2 bg-card text-sm text-muted-foreground">
            <IconLoader2 size={16} className="animate-spin" />
            Loading editor…
          </div>
        )}

        {state.status === 'error' && (
          <div className="pointer-events-auto h-full w-full flex flex-col items-center justify-center gap-2 bg-card text-sm text-destructive">
            <IconAlertCircle size={20} />
            <span>{state.message}</span>
          </div>
        )}
      </div>

      {/* Editor layer — OnlyOffice manages this div's contents */}
      <EditorHost id={containerId} />
    </div>
  );
}
