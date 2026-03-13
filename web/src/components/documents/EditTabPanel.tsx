import { OnlyOfficeEditorPanel } from '@/components/documents/OnlyOfficeEditorPanel';
import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';
import { isOnlyOfficeEditable } from '@/lib/projectDetailHelpers';

interface EditTabPanelProps {
  selectedDoc: ProjectDocumentRow | null;
}

export function EditTabPanel({ selectedDoc }: EditTabPanelProps) {
  if (selectedDoc && isOnlyOfficeEditable(selectedDoc)) {
    return <OnlyOfficeEditorPanel doc={selectedDoc} />;
  }

  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {selectedDoc
        ? 'This file format is not editable. Select a DOCX, XLSX, or PPTX file.'
        : 'Select an editable document (DOCX, XLSX, PPTX).'}
    </div>
  );
}
