import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AgchainOrganizationSwitcher } from './AgchainOrganizationSwitcher';

const useAgchainWorkspaceContextMock = vi.fn();

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

vi.mock('@/hooks/agchain/useAgchainWorkspaceContext', () => ({
  useAgchainWorkspaceContext: () => useAgchainWorkspaceContextMock(),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AgchainOrganizationSwitcher', () => {
  function buildWorkspaceState() {
    return {
      loading: false,
      error: null,
      organizations: [
        {
          organization_id: 'org-1',
          organization_slug: 'personal-user-1',
          display_name: 'Personal Workspace',
          membership_role: 'organization_admin',
          is_personal: true,
          project_count: 2,
        },
        {
          organization_id: 'org-2',
          organization_slug: 'team-acme',
          display_name: 'Acme Team',
          membership_role: 'organization_member',
          is_personal: false,
          project_count: 3,
        },
      ],
      selectedOrganizationId: 'org-1',
      selectedOrganization: {
        organization_id: 'org-1',
        organization_slug: 'personal-user-1',
        display_name: 'Personal Workspace',
        membership_role: 'organization_admin',
        is_personal: true,
        project_count: 2,
      },
      setSelectedOrganizationId: vi.fn(),
      reload: vi.fn(),
    };
  }

  beforeEach(() => {
    useAgchainWorkspaceContextMock.mockReset();
    useAgchainWorkspaceContextMock.mockReturnValue(buildWorkspaceState());
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
    window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
    window.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;
  });

  it('shows the selected AGChain organization', () => {
    render(
      <MemoryRouter>
        <AgchainOrganizationSwitcher />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /personal workspace/i })).toBeInTheDocument();
  });

  it('lists available organizations and allows switching', async () => {
    const setSelectedOrganizationId = vi.fn();
    useAgchainWorkspaceContextMock.mockReturnValue({
      ...buildWorkspaceState(),
      setSelectedOrganizationId,
    });

    render(
      <MemoryRouter>
        <AgchainOrganizationSwitcher />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /personal workspace/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /acme team/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /acme team/i }));

    expect(setSelectedOrganizationId).toHaveBeenCalledWith('org-2');
  });
});
