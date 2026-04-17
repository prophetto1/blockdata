import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AgchainDatasetsPage from './AgchainDatasetsPage';

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
  if (typeof globalThis.IntersectionObserver === 'undefined') {
    globalThis.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver;
  }
});

const platformApiFetchMock = vi.fn();

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: (...args: unknown[]) => platformApiFetchMock(...args),
}));

const useAgchainProjectFocusMock = vi.fn();
const useAgchainScopeStateMock = vi.fn();

vi.mock('@/hooks/agchain/useAgchainProjectFocus', () => ({
  useAgchainProjectFocus: () => useAgchainProjectFocusMock(),
}));

vi.mock('@/hooks/agchain/useAgchainScopeState', () => ({
  useAgchainScopeState: () => useAgchainScopeStateMock(),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const DATASET_LIST_RESPONSE = {
  items: [
    {
      dataset_id: 'dataset-1',
      slug: 'legal-qa',
      name: 'Legal QA Dataset',
      description: 'Legal evaluation samples.',
      status: 'active',
      source_type: 'csv',
      latest_version_id: 'version-1',
      latest_version_label: 'v3',
      sample_count: 15302,
      validation_status: 'pass',
      updated_at: '2026-03-31T16:45:00Z',
    },
    {
      dataset_id: 'dataset-2',
      slug: 'financial-news',
      name: 'Financial News Corpus',
      description: 'Financial news dataset.',
      status: 'active',
      source_type: 'json',
      latest_version_id: 'version-2',
      latest_version_label: 'v1',
      sample_count: 8350,
      validation_status: 'warn',
      updated_at: '2026-03-30T10:00:00Z',
    },
  ],
  next_cursor: null,
};

describe('AgchainDatasetsPage', () => {
  beforeEach(() => {
    platformApiFetchMock.mockReset();
    useAgchainProjectFocusMock.mockReset();
    useAgchainScopeStateMock.mockReset();
    useAgchainProjectFocusMock.mockReturnValue({
      focusedProject: {
        project_id: 'project-1',
        organization_id: 'org-1',
        project_slug: 'legal-10',
        project_name: 'Legal-10',
        description: 'Three-step benchmark package for legal analysis.',
        membership_role: 'owner',
        updated_at: '2026-03-31T00:00:00Z',
        primary_benchmark_slug: 'legal-10',
        primary_benchmark_name: 'Legal-10',
        benchmark_slug: 'legal-10',
        benchmark_name: 'Legal-10',
        href: '/app/agchain/overview?project=legal-10',
      },
      loading: false,
    });
    useAgchainScopeStateMock.mockReturnValue({
      kind: 'ready',
      selectedOrganization: {
        organization_id: 'org-1',
        display_name: 'AGChain',
      },
      focusedProject: {
        project_id: 'project-1',
        organization_id: 'org-1',
        project_slug: 'legal-10',
        project_name: 'Legal-10',
        description: 'Three-step benchmark package for legal analysis.',
        membership_role: 'owner',
        updated_at: '2026-03-31T00:00:00Z',
        primary_benchmark_slug: 'legal-10',
        primary_benchmark_name: 'Legal-10',
        benchmark_slug: 'legal-10',
        benchmark_name: 'Legal-10',
        href: '/app/agchain/overview?project=legal-10',
      },
    });

    platformApiFetchMock.mockImplementation((path: string) => {
      if (path.startsWith('/agchain/datasets?')) {
        return Promise.resolve(jsonResponse(DATASET_LIST_RESPONSE));
      }
      return Promise.reject(new Error(`Unhandled platformApiFetch call: ${path}`));
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders a table with dataset rows', async () => {
    render(
      <MemoryRouter>
        <AgchainDatasetsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Legal QA Dataset').length).toBeGreaterThan(0);
    });

    expect(screen.getByTestId('agchain-standard-surface')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Datasets' })).toBeInTheDocument();
    expect(screen.getAllByText('legal-qa').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Financial News Corpus').length).toBeGreaterThan(0);
    expect(screen.getAllByText('financial-news').length).toBeGreaterThan(0);
    expect(screen.getByText('15,302')).toBeInTheDocument();
  });

  it('renders the Add Dataset link', async () => {
    render(
      <MemoryRouter>
        <AgchainDatasetsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Legal QA Dataset').length).toBeGreaterThan(0);
    });

    const addLink = screen.getByRole('link', { name: /add dataset/i });
    expect(addLink).toBeInTheDocument();
    expect(addLink).toHaveAttribute('href', '/app/agchain/datasets/new');
  });

  it('shows empty state when no datasets exist', async () => {
    platformApiFetchMock.mockImplementation((path: string) => {
      if (path.startsWith('/agchain/datasets?')) {
        return Promise.resolve(jsonResponse({ items: [], next_cursor: null }));
      }
      return Promise.reject(new Error(`Unhandled: ${path}`));
    });

    render(
      <MemoryRouter>
        <AgchainDatasetsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('No datasets yet')).toBeInTheDocument();
    });
  });

  it('routes users back toward the project registry when no project is focused', () => {
    useAgchainScopeStateMock.mockReturnValue({
      kind: 'no-project',
      selectedOrganization: {
        organization_id: 'org-1',
        display_name: 'AGChain',
      },
    });

    render(
      <MemoryRouter>
        <AgchainDatasetsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /choose an agchain project/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open project registry' })).toHaveAttribute('href', '/app/agchain/projects');
  });

  it('shows loading while the shared AGChain scope is bootstrapping', () => {
    useAgchainScopeStateMock.mockReturnValue({
      kind: 'bootstrapping',
    });

    render(
      <MemoryRouter>
        <AgchainDatasetsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Loading workspace...')).toBeInTheDocument();
    expect(screen.queryByText('Datasets')).not.toBeInTheDocument();
  });
});
