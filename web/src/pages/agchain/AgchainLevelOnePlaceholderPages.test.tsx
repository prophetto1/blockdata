import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AgchainParametersPage from './AgchainParametersPage';
import AgchainPromptsPage from './AgchainPromptsPage';
import AgchainScorersPage from './AgchainScorersPage';

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

  it('shows the focused project ownership on prompts, scorers, and parameters pages', () => {
    const { rerender } = render(
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
  });

  it('routes users back toward the project registry when no AGChain project is available', () => {
    useAgchainProjectFocusMock.mockReturnValue({
      focusedProject: null,
      loading: false,
    });

    render(
      <MemoryRouter>
        <AgchainPromptsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Choose an AGChain project' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open project registry' })).toHaveAttribute('href', '/app/agchain/projects');
  });
});
