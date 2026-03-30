import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AgchainObservabilityPage from './AgchainObservabilityPage';
import AgchainResultsPage from './AgchainResultsPage';
import AgchainRunsPage from './AgchainRunsPage';

const useAgchainProjectFocusMock = vi.fn();

vi.mock('@/hooks/agchain/useAgchainProjectFocus', () => ({
  useAgchainProjectFocus: () => useAgchainProjectFocusMock(),
}));

afterEach(() => {
  cleanup();
});

describe('AGChain direct compatibility placeholder pages', () => {
  beforeEach(() => {
    useAgchainProjectFocusMock.mockReset();
    useAgchainProjectFocusMock.mockReturnValue({
      focusedProject: {
        benchmark_id: 'benchmark-1',
        benchmark_slug: 'legal-10',
        benchmark_name: 'Legal-10',
        description: 'Three-step benchmark package for legal analysis.',
      },
      loading: false,
    });
  });

  it('shows the focused project ownership on runs, results, and observability direct routes', () => {
    const { rerender } = render(
      <MemoryRouter>
        <AgchainRunsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Runs' })).toBeInTheDocument();
    expect(screen.getByText(/legal-10 owns this runs page/i)).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <AgchainResultsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Results' })).toBeInTheDocument();
    expect(screen.getByText(/legal-10 owns this results page/i)).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <AgchainObservabilityPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Observability' })).toBeInTheDocument();
    expect(screen.getByText(/legal-10 owns this observability page/i)).toBeInTheDocument();
    expect(screen.getAllByText('Project-scoped placeholder surface').length).toBeGreaterThan(0);
  });

  it('routes users back toward the project registry when no AGChain project is available', () => {
    useAgchainProjectFocusMock.mockReturnValue({
      focusedProject: null,
      loading: false,
    });

    render(
      <MemoryRouter>
        <AgchainRunsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Choose an AGChain project' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open project registry' })).toHaveAttribute('href', '/app/agchain/projects');
  });
});
