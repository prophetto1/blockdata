import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FlowDetail from './FlowDetail';

const { fromMock, navigateMock, setSearchParamsMock, useShellHeaderTitleMock, edgeJsonMock, routeState, workspaceProjectsLimitMock } = vi.hoisted(() => {
  const route = { tab: 'overview' as string | undefined };
  const edgeJson = vi.fn().mockResolvedValue({
    id: 'flow-1',
    namespace: 'workspace-1',
    revision: 1,
    description: 'Flow description',
    deleted: false,
    disabled: false,
    labels: [{ key: 'name', value: 'Default Project' }],
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
          eq: vi.fn(() => {
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
    edgeJsonMock: edgeJson,
    routeState: route,
    workspaceProjectsLimitMock: workspaceProjectsLimit,
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ flowId: 'flow-1', tab: routeState.tab }),
    useSearchParams: () => [new URLSearchParams(), setSearchParamsMock] as const,
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

vi.mock('@/lib/edge', () => ({
  edgeJson: edgeJsonMock,
}));

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: useShellHeaderTitleMock,
}));

describe('FlowDetail page', () => {
  beforeEach(() => {
    routeState.tab = 'overview';
    window.localStorage.clear();
    navigateMock.mockReset();
    setSearchParamsMock.mockReset();
    useShellHeaderTitleMock.mockReset();
    edgeJsonMock.mockClear();
    fromMock.mockClear();
    workspaceProjectsLimitMock.mockReset();
    workspaceProjectsLimitMock.mockResolvedValue({
      data: [{
        project_id: 'flow-1',
        project_name: 'Default Project',
        updated_at: '2026-02-26T10:00:00.000Z',
      }],
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all Kestra parity tabs in canonical order', async () => {
    render(<FlowDetail />);

    await waitFor(() => {
      expect(screen.getByLabelText('Flow sections')).toBeInTheDocument();
    });

    const tabsRoot = screen.getByLabelText('Flow sections');
    const tabLabels = within(tabsRoot).getAllByRole('tab')
      .map((tab) => tab.textContent?.replace(/\s+/g, ' ').trim());
    expect(tabLabels).toEqual([
      'Overview',
      'Topology',
      'Executions',
      'Edit',
      'Revisions',
      'Triggers',
      'Logs',
      'Metrics',
      'Dependencies',
      'Concurrency',
      'Audit Logs',
    ]);
  });

  it('renders flow tabs and pushes breadcrumb/title metadata to shell header', async () => {
    render(
      <FlowDetail />,
    );

    await waitFor(() => {
      expect(fromMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(edgeJsonMock).toHaveBeenCalledWith('flows/default/flow-1');
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

    const tabsRoot = screen.getByLabelText('Flow sections');
    const overviewTab = within(tabsRoot).getByRole('tab', { name: /overview/i });
    expect(overviewTab).toBeInTheDocument();
    const topologyTab = within(tabsRoot).getByRole('tab', { name: /topology/i });
    expect(within(tabsRoot).getByRole('tab', { name: /concurrency/i })).toBeInTheDocument();
    expect(topologyTab).toBeInTheDocument();
  });

  it('keeps audit logs tab locked and prevents tab navigation when clicked', async () => {
    render(<FlowDetail />);

    await waitFor(() => {
      expect(screen.getByLabelText('Flow sections')).toBeInTheDocument();
    });

    const tabsRoot = screen.getByLabelText('Flow sections');
    navigateMock.mockClear();
    const auditLogsTab = within(tabsRoot).getByRole('tab', { name: /audit logs/i });
    fireEvent.click(auditLogsTab);
    expect(navigateMock).not.toHaveBeenCalled();
    expect(auditLogsTab).toHaveAttribute('aria-disabled', 'true');
  });

  it('renders locked audit logs panel without overwriting remembered open tab', async () => {
    routeState.tab = 'auditlogs';
    window.localStorage.setItem('flowDefaultTab', 'edit');
    render(<FlowDetail />);

    expect(await screen.findByText('Audit logs are unavailable in this edition.')).toBeInTheDocument();
    expect(window.localStorage.getItem('flowDefaultTab')).toBe('edit');
  });

  it('disables dependencies tab when there are no sibling dependencies', async () => {
    render(<FlowDetail />);

    await waitFor(() => {
      expect(screen.getByLabelText('Flow sections')).toBeInTheDocument();
    });

    const tabsRoot = screen.getByLabelText('Flow sections');
    const dependenciesTab = within(tabsRoot).getByRole('tab', { name: /dependencies/i });
    expect(dependenciesTab).toHaveAttribute('aria-disabled', 'true');

    navigateMock.mockClear();
    fireEvent.click(dependenciesTab);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('shows dependency count badge in tab label when sibling dependencies exist', async () => {
    workspaceProjectsLimitMock.mockResolvedValueOnce({
      data: [
        {
          project_id: 'flow-1',
          project_name: 'Default Project',
          updated_at: '2026-02-26T10:00:00.000Z',
        },
        {
          project_id: 'flow-2',
          project_name: 'Sibling Flow',
          updated_at: '2026-02-26T11:00:00.000Z',
        },
      ],
      error: null,
    });

    render(<FlowDetail />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /dependencies \(1\)/i })).toBeInTheDocument();
    });
  });
});
