import { useCallback, useEffect, useId, useRef } from 'react';
import { IconAlertCircle, IconLoader2 } from '@tabler/icons-react';
import { useOnlyOfficeEditor } from '@/hooks/useOnlyOfficeEditor';
import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';

type Props = {
  doc: ProjectDocumentRow;
};

export function OnlyOfficeEditorPanel({ doc }: Props) {
  const instanceId = useId();
  const containerId = `oo-editor-${instanceId.replace(/:/g, '')}`;
  const hostRef = useRef<HTMLDivElement>(null);
  const editorDivRef = useRef<HTMLDivElement | null>(null);

  // Create a detached div for OnlyOffice to own. React never sees its children.
  const getEditorDiv = useCallback(() => {
    if (!editorDivRef.current) {
      const div = document.createElement('div');
      div.id = containerId;
      div.style.width = '100%';
      div.style.height = '100%';
      editorDivRef.current = div;
    }
    return editorDivRef.current;
  }, [containerId]);

  // Mount the editor div into the host ref imperatively
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const editorDiv = getEditorDiv();
    host.appendChild(editorDiv);

    return () => {
      // On unmount, remove imperatively — React never touches editorDiv's children
      if (editorDiv.parentNode === host) {
        host.removeChild(editorDiv);
      }
    };
  }, [getEditorDiv]);

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

      {/* Host div — React manages this empty div. The OnlyOffice editor div
          is appended/removed imperatively, so React never reconciles its mutated subtree. */}
      <div ref={hostRef} className="h-full w-full" />
    </div>
  );
}
