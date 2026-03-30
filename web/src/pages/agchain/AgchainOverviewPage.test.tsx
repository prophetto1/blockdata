import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AgchainOverviewPage from './AgchainOverviewPage';

const useAgchainProjectFocusMock = vi.fn();

vi.mock('@/hooks/agchain/useAgchainProjectFocus', () => ({
  useAgchainProjectFocus: () => useAgchainProjectFocusMock(),
}));

afterEach(() => {
  cleanup();
});

describe('AgchainOverviewPage', () => {
  beforeEach(() => {
    useAgchainProjectFocusMock.mockReset();
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

  it('keeps the four-box overview layout visible while project focus is still loading', () => {
    useAgchainProjectFocusMock.mockReturnValue({
      focusedProject: null,
      focusedProjectSlug: 'legal-10',
      loading: true,
      setFocusedProjectSlug: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/app/agchain/overview']}>
        <AgchainOverviewPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Observability')).toBeInTheDocument();
    expect(screen.getByText('Evaluation')).toBeInTheDocument();
    expect(screen.getByText('Recently created')).toBeInTheDocument();
    expect(screen.getByText('Project description')).toBeInTheDocument();
    expect(screen.queryByText('Loading project overview...')).not.toBeInTheDocument();
  });

  it('routes users back toward the project registry when no AGChain project is available', () => {
    useAgchainProjectFocusMock.mockReturnValue({
      focusedProject: null,
      focusedProjectSlug: null,
      loading: false,
      setFocusedProjectSlug: vi.fn(),
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
