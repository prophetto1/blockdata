import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AgchainProjectsPage from './AgchainProjectsPage';

const platformApiFetchMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: (...args: unknown[]) => platformApiFetchMock(...args),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  cleanup();
});

describe('AgchainProjectsPage', () => {
  beforeEach(() => {
    platformApiFetchMock.mockReset();
    navigateMock.mockReset();
    platformApiFetchMock.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/agchain/projects' && (!init?.method || init.method === 'GET')) {
        return Promise.resolve(
          jsonResponse({
            items: [
              {
                project_id: 'project-1',
                organization_id: 'org-1',
                project_slug: 'legal-evals',
                project_name: 'Legal Evals',
                membership_role: 'project_admin',
                updated_at: '2026-03-27T08:15:00Z',
                description: 'Three-step benchmark package for legal analysis.',
                primary_benchmark_slug: 'legal-10',
                primary_benchmark_name: 'Legal-10',
              },
            ],
          }),
        );
      }

      if (path === '/agchain/projects' && init?.method === 'POST') {
        return Promise.resolve(
          jsonResponse({
            ok: true,
            project_id: 'project-2',
            project_slug: 'new-project',
            primary_benchmark_slug: 'new-benchmark',
            redirect_path: '/app/agchain/projects/new-project',
          }),
        );
      }

      return Promise.reject(new Error(`Unhandled platformApiFetch call: ${path}`));
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
    expect(platformApiFetchMock).toHaveBeenCalledWith('/agchain/projects');

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

  it('shows an empty registry state when no project workspaces exist yet', async () => {
    platformApiFetchMock.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/agchain/projects' && (!init?.method || init.method === 'GET')) {
        return Promise.resolve(
          jsonResponse({
            items: [],
          }),
        );
      }

      return Promise.reject(new Error(`Unhandled platformApiFetch call: ${path}`));
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
      expect(platformApiFetchMock).toHaveBeenCalledWith(
        '/agchain/projects',
        expect.objectContaining({ method: 'POST' }),
      );
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
