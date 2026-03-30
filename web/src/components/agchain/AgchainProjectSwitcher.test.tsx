import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AgchainProjectSwitcher } from './AgchainProjectSwitcher';

const useAgchainProjectFocusMock = vi.fn();

vi.mock('@/hooks/agchain/useAgchainProjectFocus', () => ({
  useAgchainProjectFocus: () => useAgchainProjectFocusMock(),
}));

afterEach(() => {
  cleanup();
});

describe('AgchainProjectSwitcher', () => {
  function buildFocusState() {
    return {
      loading: false,
      error: null,
      focusedProjectSlug: 'legal-10',
      focusedProject: {
        benchmark_id: 'benchmark-1',
        benchmark_slug: 'legal-10',
        benchmark_name: 'Legal-10',
        description: 'Legal benchmark package',
        href: '/app/agchain/benchmarks/legal-10#steps',
      },
      items: [
        {
          benchmark_id: 'benchmark-1',
          benchmark_slug: 'legal-10',
          benchmark_name: 'Legal-10',
          description: 'Legal benchmark package',
          href: '/app/agchain/benchmarks/legal-10#steps',
        },
        {
          benchmark_id: 'benchmark-2',
          benchmark_slug: 'finance-eval',
          benchmark_name: 'Finance Eval',
          description: 'Finance evaluation package',
          href: '/app/agchain/benchmarks/finance-eval#steps',
        },
      ],
      setFocusedProjectSlug: vi.fn(),
      reload: vi.fn(),
    };
  }

  beforeEach(() => {
    useAgchainProjectFocusMock.mockReset();
    useAgchainProjectFocusMock.mockReturnValue(buildFocusState());
  });

  it('shows the focused AGChain project or evaluation', () => {
    render(
      <MemoryRouter>
        <AgchainProjectSwitcher />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /legal-10/i })).toBeInTheDocument();
  });

  it('lists available AGChain project rows and allows focus switching', async () => {
    const setFocusedProjectSlug = vi.fn();
    useAgchainProjectFocusMock.mockReturnValue({
      ...buildFocusState(),
      setFocusedProjectSlug,
    });

    render(
      <MemoryRouter>
        <AgchainProjectSwitcher />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /legal-10/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /finance eval/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /finance eval/i }));

    expect(setFocusedProjectSlug).toHaveBeenCalledWith('finance-eval');
  });

  it('exposes navigation into the AGChain project registry route', async () => {
    render(
      <MemoryRouter>
        <AgchainProjectSwitcher />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /legal-10/i }));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /open project registry/i })).toHaveAttribute('href', '/app/agchain/projects');
    });
  });
});
