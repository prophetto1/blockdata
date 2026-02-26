import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FlowDetail from './FlowDetail';

const { fromMock, navigateMock, setSearchParamsMock, useShellHeaderTitleMock } = vi.hoisted(() => {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: {
      project_name: 'Default Project',
      workspace_id: 'workspace-1',
      description: 'Flow description',
      updated_at: '2026-02-26T10:00:00.000Z',
    },
    error: null,
  });

  const docsLimit = vi.fn().mockResolvedValue({
    data: [{
      source_uid: 'doc-1',
      doc_title: 'Doc One',
      status: 'uploaded',
      uploaded_at: '2026-02-26T09:00:00.000Z',
      source_type: 'pdf',
      conv_uid: 'conv-1',
    }],
    error: null,
  });

  const runsLimit = vi.fn().mockResolvedValue({
    data: [{
      run_id: 'run-1',
      status: 'complete',
      started_at: '2026-02-26T09:10:00.000Z',
      completed_at: '2026-02-26T09:11:00.000Z',
      total_blocks: 10,
      completed_blocks: 10,
      failed_blocks: 0,
    }],
    error: null,
  });

  const workspaceProjectsLimit = vi.fn().mockResolvedValue({
    data: [{
      project_id: 'flow-1',
      project_name: 'Default Project',
      updated_at: '2026-02-26T10:00:00.000Z',
    }],
    error: null,
  });

  const from = vi.fn((table: string) => {
    if (table === 'projects') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn((column: string) => {
            if (column === 'project_id') {
              return { maybeSingle };
            }
            return {
              order: vi.fn(() => ({
                limit: workspaceProjectsLimit,
              })),
            };
          }),
        })),
      };
    }

    if (table === 'documents_view') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: docsLimit,
            })),
          })),
        })),
      };
    }

    if (table === 'runs') {
      return {
        select: vi.fn(() => ({
          in: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: runsLimit,
            })),
          })),
        })),
      };
    }

    return {
      select: vi.fn(() => ({})),
    };
  });

  return {
    fromMock: from,
    navigateMock: vi.fn(),
    setSearchParamsMock: vi.fn(),
    useShellHeaderTitleMock: vi.fn(),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ flowId: 'flow-1', tab: 'overview' }),
    useSearchParams: () => [new URLSearchParams(), setSearchParamsMock] as const,
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: useShellHeaderTitleMock,
}));

describe('FlowDetail page', () => {
  it('renders flow tabs and pushes breadcrumb/title metadata to shell header', async () => {
    render(
      <FlowDetail />,
    );

    await waitFor(() => {
      expect(fromMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(setSearchParamsMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(useShellHeaderTitleMock).toHaveBeenLastCalledWith({
        title: 'Default Project',
        subtitle: 'Flows/Default Project/Overview',
      });
    });

    const overviewTab = screen.getByRole('tab', { name: /overview/i });
    expect(overviewTab).toBeInTheDocument();
    const topologyTab = screen.getByRole('tab', { name: /topology/i });
    expect(screen.getByRole('tab', { name: /concurrency/i })).toBeInTheDocument();
    expect(topologyTab).toBeInTheDocument();
  });
});
