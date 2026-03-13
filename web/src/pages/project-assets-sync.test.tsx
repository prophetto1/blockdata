import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectAssetsPage from './ProjectAssetsPage';
import DocsEditor from './DocsEditor';
import { fetchAllProjectDocuments } from '@/lib/projectDocuments';

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

vi.mock('@/hooks/useProjectFocus', () => ({
  useProjectFocus: () => ({
    resolvedProjectId: 'project-1',
    resolvedProjectName: 'Project One',
  }),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/documents/ProjectParseUppyUploader', () => ({
  ProjectParseUppyUploader: ({
    onBatchUploaded,
  }: {
    onBatchUploaded?: () => void | Promise<void>;
  }) => (
    <button type="button" onClick={() => void onBatchUploaded?.()}>
      Simulate upload
    </button>
  ),
}));

vi.mock('@/components/documents/OnlyOfficeEditorPanel', () => ({
  OnlyOfficeEditorPanel: ({ doc }: { doc: { doc_title: string } }) => (
    <div data-testid="onlyoffice-editor">{doc.doc_title}</div>
  ),
}));

vi.mock('@/lib/projectDocuments', () => ({
  fetchAllProjectDocuments: vi.fn(),
}));

const fetchAllProjectDocumentsMock = vi.mocked(fetchAllProjectDocuments);

const originalDoc = {
  source_uid: 'source-1',
  owner_id: 'owner-1',
  conv_uid: 'conv-1',
  project_id: 'project-1',
  source_type: 'docx',
  source_filesize: 1234,
  source_total_characters: null,
  doc_title: 'Original Draft.docx',
  status: 'ingested' as const,
  uploaded_at: '2026-03-10T00:00:00.000Z',
  error: null,
  source_locator: 'projects/project-1/source/original-draft.docx',
  conv_locator: 'projects/project-1/converted/original-draft.docx',
};

const uploadedDoc = {
  ...originalDoc,
  source_uid: 'source-2',
  conv_uid: 'conv-2',
  doc_title: 'Uploaded Notes.docx',
  source_locator: 'projects/project-1/source/uploaded-notes.docx',
  conv_locator: 'projects/project-1/converted/uploaded-notes.docx',
  uploaded_at: '2026-03-11T00:00:00.000Z',
};

describe('project asset surfaces', () => {
  beforeEach(() => {
    fetchAllProjectDocumentsMock.mockReset();
  });

  it('refreshes the docs editor when the project assets page uploads a file', async () => {
    fetchAllProjectDocumentsMock
      .mockResolvedValueOnce([originalDoc])
      .mockResolvedValueOnce([originalDoc])
      .mockResolvedValueOnce([uploadedDoc, originalDoc]);

    render(
      <>
        <ProjectAssetsPage />
        <DocsEditor />
      </>,
    );

    expect(await screen.findByText('Original Draft.docx')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Simulate upload' }));

    await waitFor(() => {
      expect(fetchAllProjectDocumentsMock).toHaveBeenCalledTimes(3);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Uploaded Notes.docx').length).toBeGreaterThan(1);
    });
  });
});
