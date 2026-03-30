import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AgchainDatasetsPage from './AgchainDatasetsPage';
import AgchainParametersPage from './AgchainParametersPage';
import AgchainPromptsPage from './AgchainPromptsPage';
import AgchainScorersPage from './AgchainScorersPage';
import AgchainToolsPage from './AgchainToolsPage';

const useAgchainProjectFocusMock = vi.fn();

vi.mock('@/hooks/agchain/useAgchainProjectFocus', () => ({
  useAgchainProjectFocus: () => useAgchainProjectFocusMock(),
}));

afterEach(() => {
  cleanup();
});

describe('AGChain level-one placeholder pages', () => {
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

  it('shows the focused project ownership on datasets, prompts, scorers, parameters, and tools pages', () => {
    const { rerender } = render(
      <MemoryRouter>
        <AgchainDatasetsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Datasets' })).toBeInTheDocument();
    expect(screen.getByText(/legal-10 owns this datasets page/i)).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <AgchainPromptsPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Prompts' })).toBeInTheDocument();
    expect(screen.getByText(/legal-10 owns this prompts page/i)).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <AgchainScorersPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Scorers' })).toBeInTheDocument();
    expect(screen.getByText(/legal-10 owns this scorers page/i)).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <AgchainParametersPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Parameters' })).toBeInTheDocument();
    expect(screen.getByText(/legal-10 owns this parameters page/i)).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <AgchainToolsPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Tools' })).toBeInTheDocument();
    expect(screen.getByText(/legal-10 owns this tools page/i)).toBeInTheDocument();
    expect(screen.getAllByText('Project-scoped placeholder surface').length).toBeGreaterThan(0);
  });

  it('routes users back toward the project registry when no AGChain project is available', () => {
    useAgchainProjectFocusMock.mockReturnValue({
      focusedProject: null,
      loading: false,
    });

    render(
      <MemoryRouter>
        <AgchainDatasetsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Choose an AGChain project' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open project registry' })).toHaveAttribute('href', '/app/agchain/projects');
  });
});
