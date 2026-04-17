import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AgchainSectionPage } from './AgchainSectionPage';

const useAgchainScopeStateMock = vi.fn();

vi.mock('@/hooks/agchain/useAgchainScopeState', () => ({
  useAgchainScopeState: () => useAgchainScopeStateMock(),
}));

afterEach(() => {
  cleanup();
});

describe('AgchainSectionPage', () => {
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

  it('acts as a deprecated compatibility shim over the shared placeholder surface', () => {
    render(
      <MemoryRouter>
        <AgchainSectionPage
          title="Runs"
          description="Run setup lives here."
          bullets={['First bullet', 'Second bullet']}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Runs' })).toBeInTheDocument();
    expect(screen.getByTestId('agchain-placeholder-body')).toBeEmptyDOMElement();
    expect(screen.queryByText('Deprecated compatibility surface')).not.toBeInTheDocument();

    const frame = screen.getByTestId('agchain-page-frame');
    expect(frame).toHaveClass('w-full');
    expect(frame.className).not.toContain('max-w-');
    expect(frame.className).not.toContain('mx-auto');
  });

  it('keeps the no-project fallback delegated to the shared placeholder surface', () => {
    useAgchainScopeStateMock.mockReturnValue({
      kind: 'no-project',
      selectedOrganization: {
        organization_id: 'org-1',
        display_name: 'AGChain',
      },
    });

    render(
      <MemoryRouter>
        <AgchainSectionPage
          title="Runs"
          description="Run setup lives here."
          bullets={['First bullet', 'Second bullet']}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Choose an AGChain project' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open project registry' })).toHaveAttribute('href', '/app/agchain/projects');
  });
});
