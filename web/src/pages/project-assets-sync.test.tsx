import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectAssetsPage from './ProjectAssetsPage';
import { useProjectDocuments } from '@/hooks/useProjectDocuments';

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

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        remove: vi.fn(),
      })),
    },
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/lib/edge', () => ({
  manageDocument: vi.fn(),
}));

vi.mock('@/components/documents/UploadTabPanel', () => ({
  UploadTabPanel: ({
    onUploadComplete,
  }: {
    onUploadComplete?: () => void | Promise<void>;
  }) => (
    <button type="button" onClick={() => void onUploadComplete?.()}>
      Simulate upload
    </button>
  ),
}));

vi.mock('@/components/documents/DocumentFileTable', () => ({
  DocumentFileTable: ({ docs }: { docs: Array<{ doc_title: string }> }) => (
    <div>{docs.map((doc) => <div key={doc.doc_title}>{doc.doc_title}</div>)}</div>
  ),
}));

vi.mock('@/components/documents/PreviewTabPanel', () => ({
  PreviewTabPanel: () => <div>Preview</div>,
}));

vi.mock('@/components/workbench/Workbench', () => ({
  Workbench: ({
    defaultPanes,
    renderContent,
  }: {
    defaultPanes: Array<{ id: string; activeTab: string }>;
    renderContent: (tabId: string) => React.ReactNode;
  }) => (
    <div>
      {defaultPanes.map((pane) => (
        <section key={pane.id}>{renderContent(pane.activeTab)}</section>
      ))}
      <section>{renderContent('files')}</section>
    </div>
  ),
}));

vi.mock('@/hooks/useProjectDocuments', () => ({
  useProjectDocuments: vi.fn(),
}));

const useProjectDocumentsMock = vi.mocked(useProjectDocuments);
const refreshDocs = vi.fn();

const originalDoc = {
  source_uid: 'source-1',
  owner_id: 'owner-1',
  conv_uid: 'conv-1',
  project_id: 'project-1',
  source_type: 'docx',
  source_filesize: 1234,
  source_total_characters: null,
  doc_title: 'Original Draft.docx',
  status: 'parsed' as const,
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
    refreshDocs.mockReset();
    useProjectDocumentsMock.mockReset();
    useProjectDocumentsMock.mockReturnValue({
      docs: [originalDoc],
      loading: false,
      error: null,
      selected: new Set<string>(),
      toggleSelect: vi.fn(),
      toggleSelectAll: vi.fn(),
      allSelected: false,
      someSelected: false,
      refreshDocs,
    });
  });

  it('refreshes project assets when the upload surface reports a new file', async () => {
    render(<ProjectAssetsPage />);

    expect(await screen.findByText('Original Draft.docx')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Simulate upload' }));

    await waitFor(() => {
      expect(refreshDocs).toHaveBeenCalledTimes(1);
    });
  });
});
