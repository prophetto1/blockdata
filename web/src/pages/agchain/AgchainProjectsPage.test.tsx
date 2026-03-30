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
      if (path === '/agchain/benchmarks?limit=50&offset=0' && (!init?.method || init.method === 'GET')) {
        return Promise.resolve(
          jsonResponse({
            items: [
              {
                benchmark_id: 'benchmark-1',
                benchmark_slug: 'legal-10',
                benchmark_name: 'Legal-10',
                description: 'Three-step benchmark package for legal analysis.',
                state: 'draft',
                current_spec_label: 'draft v0.1.0',
                current_spec_version: 'v0.1.0',
                version_status: 'draft',
                step_count: 3,
                selected_eval_model_count: 2,
                tested_model_count: 0,
                tested_policy_bundle_count: 0,
                validation_status: 'warn',
                validation_issue_count: 2,
                last_run_at: null,
                updated_at: '2026-03-27T08:15:00Z',
                href: '/app/agchain/benchmarks/legal-10#steps',
              },
            ],
            total: 1,
            limit: 50,
            offset: 0,
          }),
        );
      }

      if (path === '/agchain/benchmarks' && init?.method === 'POST') {
        return Promise.resolve(
          jsonResponse({
            ok: true,
            benchmark_id: 'benchmark-2',
            benchmark_slug: 'new-benchmark',
            benchmark_version_id: 'version-1',
            redirect_path: '/app/agchain/benchmarks/new-benchmark#steps',
          }),
        );
      }

      return Promise.reject(new Error(`Unhandled platformApiFetch call: ${path}`));
    });
  });

  it('shows the AGChain projects registry framing around the existing benchmark table', async () => {
    render(
      <MemoryRouter>
        <AgchainProjectsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Projects and evaluations' })).toBeInTheDocument();
    expect(screen.getByText(/multi-project AGChain registry/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'New Project' })).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: 'Project registry' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Benchmark' })).toBeInTheDocument();
    const openProjectLinks = screen.getAllByRole('link', { name: 'Open Project' });
    expect(openProjectLinks.length).toBeGreaterThan(0);
    expect(openProjectLinks[0]).toHaveAttribute('href', '/app/agchain/overview?project=legal-10');
    expect(platformApiFetchMock).toHaveBeenCalledWith('/agchain/benchmarks?limit=50&offset=0');
  });

  it('shows an empty registry state when no benchmark-backed projects exist yet', async () => {
    platformApiFetchMock.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/agchain/benchmarks?limit=50&offset=0' && (!init?.method || init.method === 'GET')) {
        return Promise.resolve(
          jsonResponse({
            items: [],
            total: 0,
            limit: 50,
            offset: 0,
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
      expect(screen.getByText('No AGChain projects have been created yet.')).toBeInTheDocument();
    });
  });

  it('creates a benchmark-backed project from the projects route and routes into overview-first shell', async () => {
    render(
      <MemoryRouter>
        <AgchainProjectsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'New Project' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'New Project' }));
    fireEvent.change(screen.getByLabelText('Project Name'), { target: { value: 'New Benchmark' } });
    fireEvent.change(screen.getByLabelText('Project Slug'), { target: { value: 'new-benchmark' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Catalog-created benchmark.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Project' }));

    await waitFor(() => {
      expect(platformApiFetchMock).toHaveBeenCalledWith(
        '/agchain/benchmarks',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    expect(navigateMock).toHaveBeenCalledWith('/app/agchain/overview?project=new-benchmark');
  });
});
