import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AgchainBenchmarksPage from './AgchainBenchmarksPage';

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

describe('AgchainBenchmarksPage', () => {
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

  it('shows a benchmark catalog table with workbench entry points', async () => {
    render(
      <MemoryRouter>
        <AgchainBenchmarksPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Benchmarks' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'New Benchmark' })).toBeInTheDocument();
    });

    expect(screen.getByRole('columnheader', { name: 'Benchmark' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'State' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Current Spec' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Steps' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Selected Eval Models' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Tested Models' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Validation' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Activity' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Open Workbench' }).length).toBeGreaterThan(0);
    expect(platformApiFetchMock).toHaveBeenCalledWith('/agchain/benchmarks?limit=50&offset=0');
  });

  it('creates a benchmark from the catalog page and routes into its workbench', async () => {
    render(
      <MemoryRouter>
        <AgchainBenchmarksPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'New Benchmark' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'New Benchmark' }));
    fireEvent.change(screen.getByLabelText('Benchmark Name'), { target: { value: 'New Benchmark' } });
    fireEvent.change(screen.getByLabelText('Benchmark Slug'), { target: { value: 'new-benchmark' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Catalog-created benchmark.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Benchmark' }));

    await waitFor(() => {
      expect(platformApiFetchMock).toHaveBeenCalledWith(
        '/agchain/benchmarks',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    expect(navigateMock).toHaveBeenCalledWith('/app/agchain/benchmarks/new-benchmark#steps');
  });
});
