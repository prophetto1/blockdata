import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AgchainProjectSwitcher } from './AgchainProjectSwitcher';

const useAgchainProjectFocusMock = vi.fn();

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
   root = null;
   rootMargin = '';
   thresholds = [];
}

vi.mock('@/hooks/agchain/useAgchainProjectFocus', () => ({
  useAgchainProjectFocus: () => useAgchainProjectFocusMock(),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AgchainProjectSwitcher', () => {
  function buildFocusState() {
    return {
      loading: false,
      error: null,
      focusedProjectSlug: 'legal-evals',
      focusedProject: {
        project_id: 'project-1',
        project_slug: 'legal-evals',
        project_name: 'Legal Evals',
        benchmark_slug: 'legal-10',
        description: 'Legal benchmark package',
        href: '/app/agchain/overview?project=legal-evals',
      },
      items: [
        {
          project_id: 'project-1',
          project_slug: 'legal-evals',
          project_name: 'Legal Evals',
          benchmark_slug: 'legal-10',
          description: 'Legal benchmark package',
          href: '/app/agchain/overview?project=legal-evals',
        },
        {
          project_id: 'project-2',
          project_slug: 'finance-workspace',
          project_name: 'Finance Workspace',
          benchmark_slug: 'finance-eval',
          description: 'Finance evaluation package',
          href: '/app/agchain/overview?project=finance-workspace',
        },
      ],
      setFocusedProjectSlug: vi.fn(),
      reload: vi.fn(),
    };
  }

  beforeEach(() => {
    useAgchainProjectFocusMock.mockReset();
    useAgchainProjectFocusMock.mockReturnValue(buildFocusState());
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
    window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
    window.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;
  });

  it('shows the focused AGChain project or evaluation', () => {
    render(
      <MemoryRouter>
        <AgchainProjectSwitcher />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole('button', { name: /legal evals/i });
    expect(trigger).toBeInTheDocument();
    expect(within(trigger).getByText('Legal benchmark package')).toBeInTheDocument();
  });

  it('uses a searchable dropdown-style selector like the primary project switcher', async () => {
    render(
      <MemoryRouter>
        <AgchainProjectSwitcher />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /legal evals/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/find project/i)).toBeInTheDocument();
    });
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

    fireEvent.click(screen.getByRole('button', { name: /legal evals/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /finance workspace/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /finance workspace/i }));

    expect(setFocusedProjectSlug).toHaveBeenCalledWith('finance-workspace');
  });

  it('keeps the last focused slug visible during refresh instead of falling back to a loading-only label', () => {
    useAgchainProjectFocusMock.mockReturnValue({
      ...buildFocusState(),
      loading: true,
      focusedProject: null,
      focusedProjectSlug: 'legal-evals',
    });

    render(
      <MemoryRouter>
        <AgchainProjectSwitcher />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /^legal-evals$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /loading agchain projects/i })).not.toBeInTheDocument();
  });

  it('uses the create-manage footer entry for the AGChain registry dialog route', async () => {
    render(
      <MemoryRouter>
        <AgchainProjectSwitcher />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /legal evals/i }));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /open project registry|create.*project|manage projects/i })).toHaveAttribute('href', '/app/agchain/projects?new=1');
    });
  });
});
