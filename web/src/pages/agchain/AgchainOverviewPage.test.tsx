import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AgchainOverviewPage from './AgchainOverviewPage';

const useAgchainProjectFocusMock = vi.fn();
const useAgchainScopeStateMock = vi.fn();

vi.mock('@/hooks/agchain/useAgchainProjectFocus', () => ({
  useAgchainProjectFocus: () => useAgchainProjectFocusMock(),
}));

vi.mock('@/hooks/agchain/useAgchainScopeState', () => ({
  useAgchainScopeState: () => useAgchainScopeStateMock(),
}));

afterEach(() => {
  cleanup();
});

describe('AgchainOverviewPage', () => {
  beforeEach(() => {
    useAgchainProjectFocusMock.mockReset();
    useAgchainScopeStateMock.mockReset();
    useAgchainProjectFocusMock.mockReturnValue({
      focusedProject: {
        benchmark_id: 'benchmark-1',
        benchmark_slug: 'legal-10',
        benchmark_name: 'Legal-10',
        description: 'Three-step benchmark package for legal analysis.',
      },
      focusedProjectSlug: 'legal-10',
      loading: false,
      setFocusedProjectSlug: vi.fn(),
    });
    useAgchainScopeStateMock.mockReturnValue({
      kind: 'ready',
      selectedOrganization: {
        organization_id: 'org-1',
        display_name: 'AGChain',
      },
      focusedProject: {
        benchmark_id: 'benchmark-1',
        benchmark_slug: 'legal-10',
        benchmark_name: 'Legal-10',
        description: 'Three-step benchmark package for legal analysis.',
      },
    });
  });

  it('renders the reduced four-section overview layout', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/overview']}>
        <AgchainOverviewPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Observability')).toBeInTheDocument();
    expect(screen.getByText('Evaluation')).toBeInTheDocument();
    expect(screen.getByText('Recently created')).toBeInTheDocument();
    expect(screen.getByText('Project description')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: 'Project overview' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Configure project' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('agchain-overview-ask-loop')).not.toBeInTheDocument();
  });

  it('syncs focused project selection from the overview query parameter', async () => {
    const setFocusedProjectSlug = vi.fn();
    useAgchainProjectFocusMock.mockReturnValue({
      focusedProject: null,
      focusedProjectSlug: null,
      loading: true,
      setFocusedProjectSlug,
    });

    render(
      <MemoryRouter initialEntries={['/app/agchain/overview?project=legal-10']}>
        <AgchainOverviewPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(setFocusedProjectSlug).toHaveBeenCalledWith('legal-10');
    });
  });

  it('shows loading skeleton while workspace is bootstrapping', () => {
    useAgchainScopeStateMock.mockReturnValue({
      kind: 'bootstrapping',
    });

    render(
      <MemoryRouter initialEntries={['/app/agchain/overview']}>
        <AgchainOverviewPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Loading workspace...')).toBeInTheDocument();
    expect(screen.queryByText('Observability')).not.toBeInTheDocument();
  });

  it('routes users back toward the project registry when no AGChain project is available', () => {
    useAgchainScopeStateMock.mockReturnValue({
      kind: 'no-project',
      selectedOrganization: {
        organization_id: 'org-1',
        display_name: 'AGChain',
      },
    });

    render(
      <MemoryRouter initialEntries={['/app/agchain/overview']}>
        <AgchainOverviewPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Choose an AGChain project' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open project registry' })).toHaveAttribute('href', '/app/agchain/projects');
  });
});
