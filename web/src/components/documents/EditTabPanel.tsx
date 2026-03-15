import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';

interface EditTabPanelProps {
  selectedDoc: ProjectDocumentRow | null;
}

export function EditTabPanel({ selectedDoc }: EditTabPanelProps) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {selectedDoc
        ? 'Editing is no longer available in this workspace.'
        : 'Select a document to preview.'}
    </div>
  );
}
