import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProjectAssetsPage from './ProjectAssetsPage';

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

vi.mock('@/hooks/useProjectFocus', () => ({
  useProjectFocus: () => ({
    resolvedProjectId: 'project-1',
  }),
}));

const useProjectDocumentsMock = vi.fn((_projectId: string | null) => ({
  docs: [
    {
      source_uid: 'source-1',
      owner_id: 'owner-1',
      conv_uid: null,
      project_id: 'project-1',
      source_type: 'pdf',
      source_filesize: 2048,
      source_total_characters: null,
      doc_title: 'Contracts/Lease.pdf',
      status: 'uploaded',
      uploaded_at: '2026-03-10T00:00:00.000Z',
      error: null,
      source_locator: 'projects/project-1/source/contracts-lease.pdf',
      conv_locator: null,
      conv_total_blocks: null,
      pipeline_config: null,
    },
  ],
  loading: false,
  error: null,
  selected: new Set<string>(),
  toggleSelect: vi.fn(),
  toggleSelectAll: vi.fn(),
  allSelected: false,
  someSelected: false,
  refreshDocs: vi.fn(),
}));

vi.mock('@/hooks/useProjectDocuments', () => ({
  useProjectDocuments: (projectId: string | null) => useProjectDocumentsMock(projectId),
}));

vi.mock('@/components/documents/UploadTabPanel', () => ({
  UploadTabPanel: () => <div>Upload panel</div>,
}));

vi.mock('@/components/documents/PreviewTabPanel', () => ({
  PreviewTabPanel: () => <div>Preview panel</div>,
}));

const documentFileTableMock = vi.fn((props: Record<string, unknown>) => (
  <div data-testid="document-file-table">{String(props.className ?? '')}</div>
));

const workbenchMock = vi.fn();

vi.mock('@/components/documents/DocumentFileTable', () => ({
  DocumentFileTable: (props: Record<string, unknown>) => documentFileTableMock(props),
}));

vi.mock('@/components/workbench/Workbench', () => ({
  Workbench: (props: {
    tabs: Array<{ id: string }>;
    defaultPanes: Array<{ id: string; activeTab: string; tabs: string[] }>;
    renderContent: (tabId: string) => React.ReactNode;
  }) => {
    workbenchMock(props);
    return (
      <div>
        {props.defaultPanes.map((pane) => (
          <section key={pane.id} data-testid={pane.id}>
            {props.renderContent(pane.activeTab)}
          </section>
        ))}
      </div>
    );
  },
}));

describe('ProjectAssetsPage', () => {
  it('renders the files pane with the parse compact file-list styling', () => {
    render(<ProjectAssetsPage />);

    expect(screen.getByTestId('document-file-table')).toBeInTheDocument();
    const props = documentFileTableMock.mock.calls[0]?.[0] as { className?: string } | undefined;
    expect(props?.className).toContain('parse-documents-table');
    expect(props?.className).toContain('parse-documents-table-compact');
  });

  it('registers a Preview-2 tab in the third pane', () => {
    render(<ProjectAssetsPage />);

    const props = workbenchMock.mock.calls[0]?.[0] as {
      tabs: Array<{ id: string }>;
      defaultPanes: Array<{ id: string; tabs: string[] }>;
    } | undefined;

    expect(props?.tabs.map((tab) => tab.id)).toContain('preview-2');
    expect(props?.defaultPanes[2]?.tabs).toEqual(['preview', 'preview-2']);
  });
});
