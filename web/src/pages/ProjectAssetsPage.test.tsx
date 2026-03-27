import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectAssetsPage from './ProjectAssetsPage';
import { platformApiFetch } from '@/lib/platformApi';

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

vi.mock('@/hooks/useProjectFocus', () => ({
  useProjectFocus: () => ({
    resolvedProjectId: 'project-1',
  }),
}));

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        remove: vi.fn(),
        createSignedUrl: vi.fn(),
      })),
    },
    auth: {
      getSession: vi.fn(),
      refreshSession: vi.fn(),
    },
  },
}));

vi.mock('@/lib/edge', () => ({
  manageDocument: vi.fn(),
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
const platformApiFetchMock = vi.mocked(platformApiFetch);

vi.mock('@/components/documents/DocumentFileTable', () => ({
  DocumentFileTable: (props: Record<string, unknown>) => documentFileTableMock(props),
}));

vi.mock('@/components/workbench/Workbench', () => ({
  Workbench: Object.assign(
    (props: {
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
          {/* Render files content so the file table test can find it */}
          <section data-testid="files-content">
            {props.renderContent('files')}
          </section>
        </div>
      );
    },
    { displayName: 'Workbench' },
  ),
}));

describe('ProjectAssetsPage', () => {
  beforeEach(() => {
    platformApiFetchMock.mockReset();
    platformApiFetchMock.mockResolvedValue(new Response(JSON.stringify({
      quota_bytes: 5 * 1024 * 1024 * 1024,
      used_bytes: 1 * 1024 * 1024 * 1024,
      reserved_bytes: 0,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    documentFileTableMock.mockClear();
    workbenchMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders used, reserved, total, and remaining quota on the assets page', async () => {
    render(<ProjectAssetsPage />);

    expect(await screen.findByText(/5 GB total/i)).toBeInTheDocument();
    expect(screen.getByText(/1 GB used/i)).toBeInTheDocument();
    expect(screen.getByText(/4 GB remaining/i)).toBeInTheDocument();
  });

  it('renders the files pane with the parse compact file-list styling', () => {
    render(<ProjectAssetsPage />);

    expect(screen.getByTestId('document-file-table')).toBeInTheDocument();
    const props = documentFileTableMock.mock.calls[0]?.[0] as { className?: string } | undefined;
    expect(props?.className).toContain('parse-documents-table');
    expect(props?.className).toContain('parse-documents-table-compact');
  });

  it('uses a two-pane layout with preview in the second pane', () => {
    render(<ProjectAssetsPage />);

    const props = workbenchMock.mock.calls[0]?.[0] as {
      tabs: Array<{ id: string }>;
      defaultPanes: Array<{ id: string; tabs: string[] }>;
    } | undefined;

    expect(props?.defaultPanes).toHaveLength(2);
    expect(props?.defaultPanes[0]?.tabs).toEqual(['upload']);
    expect(props?.defaultPanes[1]?.tabs).toEqual(['preview']);
  });
});
