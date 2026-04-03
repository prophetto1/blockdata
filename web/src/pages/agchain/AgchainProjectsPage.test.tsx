import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AgchainProjectsPage from './AgchainProjectsPage';

const navigateMock = vi.fn();
const reloadAndSelectMock = vi.fn();
const reloadMock = vi.fn();
const useAgchainWorkspaceMock = vi.fn();
const useAgchainScopeStateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/contexts/AgchainWorkspaceContext', () => ({
  useAgchainWorkspace: () => useAgchainWorkspaceMock(),
}));

vi.mock('@/hooks/agchain/useAgchainScopeState', () => ({
  useAgchainScopeState: () => useAgchainScopeStateMock(),
}));

const createAgchainProjectMock = vi.fn();

vi.mock('@/lib/agchainWorkspaces', async () => {
  const actual = await vi.importActual<typeof import('@/lib/agchainWorkspaces')>('@/lib/agchainWorkspaces');
  return {
    ...actual,
    createAgchainProject: (...args: unknown[]) => createAgchainProjectMock(...args),
  };
});

const PROJECT_ROW = {
  project_id: 'project-1',
  organization_id: 'org-1',
  project_slug: 'legal-evals',
  project_name: 'Legal Evals',
  membership_role: 'project_admin',
  updated_at: '2026-03-27T08:15:00Z',
  description: 'Three-step benchmark package for legal analysis.',
  primary_benchmark_slug: 'legal-10',
  primary_benchmark_name: 'Legal-10',
};

afterEach(() => {
  cleanup();
});

describe('AgchainProjectsPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    reloadAndSelectMock.mockReset();
    reloadMock.mockReset();
    useAgchainWorkspaceMock.mockReset();
    createAgchainProjectMock.mockReset();

    reloadAndSelectMock.mockResolvedValue(undefined);
    reloadMock.mockResolvedValue(undefined);
    useAgchainScopeStateMock.mockReset();
    useAgchainScopeStateMock.mockReturnValue({
      kind: 'no-project',
      selectedOrganization: {
        organization_id: 'org-1',
        display_name: 'AGChain',
      },
    });

    useAgchainWorkspaceMock.mockReturnValue({
      projects: [PROJECT_ROW],
      status: 'ready',
      error: null,
      selectedProjectId: 'project-1',
      selectedOrganizationId: 'org-1',
      reloadAndSelect: reloadAndSelectMock,
      reload: reloadMock,
    });
  });

  it('shows the AGChain project registry from the explicit projects route', async () => {
    render(
      <MemoryRouter>
        <AgchainProjectsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Projects and evaluations' })).toBeInTheDocument();
    expect(screen.getByText(/shared workspace parent/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Project' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Project registry' })).toBeInTheDocument();
    });

    const frame = screen.getByTestId('agchain-page-frame');
    expect(frame).toHaveClass('w-full', 'px-4');
    expect(frame.className).not.toContain('max-w-');

    expect(screen.getByRole('columnheader', { name: 'Project' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Slug' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Primary benchmark' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Project' })).toHaveAttribute('href', '/app/agchain/overview?project=legal-evals');
  });

  it('shows loading while the shared AGChain scope is bootstrapping', () => {
    useAgchainScopeStateMock.mockReturnValue({
      kind: 'bootstrapping',
    });

    render(
      <MemoryRouter>
        <AgchainProjectsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Loading workspace...')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Project registry' })).not.toBeInTheDocument();
  });

  it('shows the no-organization fallback from the shared AGChain scope state', () => {
    useAgchainScopeStateMock.mockReturnValue({
      kind: 'no-organization',
    });

    render(
      <MemoryRouter>
        <AgchainProjectsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'No organization' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Projects and evaluations' })).not.toBeInTheDocument();
  });

  it('shows an empty registry state when no project workspaces exist yet', async () => {
    useAgchainWorkspaceMock.mockReturnValue({
      projects: [],
      status: 'no-project',
      error: null,
      selectedProjectId: null,
      selectedOrganizationId: 'org-1',
      reloadAndSelect: reloadAndSelectMock,
      reload: reloadMock,
    });

    render(
      <MemoryRouter>
        <AgchainProjectsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('No AGChain project workspaces have been created yet.')).toBeInTheDocument();
    });
  });

  it('creates a project workspace while keeping initial benchmark seeding as compatibility behavior', async () => {
    createAgchainProjectMock.mockResolvedValue({
      ok: true,
      project_id: 'project-2',
      project_slug: 'new-project',
      primary_benchmark_slug: 'new-benchmark',
      redirect_path: '/app/agchain/projects/new-project',
    });

    render(
      <MemoryRouter>
        <AgchainProjectsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Project' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create Project' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Project' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Project Name'), { target: { value: 'New Benchmark' } });
    fireEvent.change(screen.getByLabelText('Project Slug'), { target: { value: 'new-benchmark' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Catalog-created benchmark.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Project' }));

    await waitFor(() => {
      expect(createAgchainProjectMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(reloadAndSelectMock).toHaveBeenCalledWith('project-2', 'new-project');
    });

    expect(navigateMock).toHaveBeenCalledWith('/app/agchain/overview?project=new-project');
  });

  it('opens the create dialog immediately from the ?new=1 query parameter', async () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/projects?new=1']}>
        <AgchainProjectsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Project' })).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Project Name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Project' })).toBeInTheDocument();
  });
});
