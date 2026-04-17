import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AgchainParametersPage from './AgchainParametersPage';
import AgchainPromptsPage from './AgchainPromptsPage';
import AgchainScorersPage from './AgchainScorersPage';

const useAgchainScopeStateMock = vi.fn();

vi.mock('@/hooks/agchain/useAgchainScopeState', () => ({
  useAgchainScopeState: () => useAgchainScopeStateMock(),
}));

afterEach(() => {
  cleanup();
});

describe('AGChain level-one placeholder pages', () => {
  beforeEach(() => {
    useAgchainScopeStateMock.mockReset();
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

  it('shows honest placeholder behavior on prompts, scorers, and parameters pages', () => {
    const { rerender } = render(
      <MemoryRouter>
        <AgchainPromptsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Prompts' })).toBeInTheDocument();
    expect(screen.getByTestId('agchain-placeholder-body')).toBeEmptyDOMElement();
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <AgchainScorersPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Scorers' })).toBeInTheDocument();
    expect(screen.getByTestId('agchain-placeholder-body')).toBeEmptyDOMElement();

    rerender(
      <MemoryRouter>
        <AgchainParametersPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Parameters' })).toBeInTheDocument();
    expect(screen.getByTestId('agchain-placeholder-body')).toBeEmptyDOMElement();
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
      <MemoryRouter>
        <AgchainPromptsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Choose an AGChain project' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open project registry' })).toHaveAttribute('href', '/app/agchain/projects');
  });
});
