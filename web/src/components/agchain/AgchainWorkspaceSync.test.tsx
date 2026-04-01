import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AgchainOrganizationSwitcher } from './AgchainOrganizationSwitcher';
import { AgchainProjectSwitcher } from './AgchainProjectSwitcher';
import { useAgchainProjectFocus } from '@/hooks/agchain/useAgchainProjectFocus';

const fetchAgchainOrganizationsMock = vi.fn();
const fetchAgchainProjectsMock = vi.fn();

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

vi.mock('@/lib/agchainWorkspaces', async () => {
  const actual = await vi.importActual<typeof import('@/lib/agchainWorkspaces')>('@/lib/agchainWorkspaces');
  return {
    ...actual,
    fetchAgchainOrganizations: () => fetchAgchainOrganizationsMock(),
    fetchAgchainProjects: (options?: unknown) => fetchAgchainProjectsMock(options),
  };
});

function FocusProbe() {
  const { focusedProject } = useAgchainProjectFocus();
  return <div data-testid="agchain-focus-probe">{focusedProject?.project_name ?? 'No focused project'}</div>;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('AGChain workspace synchronization', () => {
  beforeEach(() => {
    fetchAgchainOrganizationsMock.mockReset();
    fetchAgchainProjectsMock.mockReset();

    fetchAgchainOrganizationsMock.mockResolvedValue({
      items: [
        {
          organization_id: 'org-1',
          organization_slug: 'personal-user-1',
          display_name: 'Personal Workspace',
          membership_role: 'organization_admin',
          is_personal: true,
          project_count: 1,
        },
        {
          organization_id: 'org-2',
          organization_slug: 'team-acme',
          display_name: 'Acme Team',
          membership_role: 'organization_member',
          is_personal: false,
          project_count: 1,
        },
      ],
    });

    fetchAgchainProjectsMock.mockImplementation((options?: { organizationId?: string | null }) => {
      if (options?.organizationId === 'org-2') {
        return Promise.resolve({
          items: [
            {
              project_id: 'project-2',
              organization_id: 'org-2',
              project_slug: 'finance-workspace',
              project_name: 'Finance Workspace',
              description: 'Finance evaluation package',
              membership_role: 'project_admin',
              updated_at: '2026-03-31T16:45:00Z',
              primary_benchmark_slug: 'finance-eval',
              primary_benchmark_name: 'Finance Eval',
            },
          ],
        });
      }

      return Promise.resolve({
        items: [
          {
            project_id: 'project-1',
            organization_id: 'org-1',
            project_slug: 'legal-evals',
            project_name: 'Legal Evals',
            description: 'Legal benchmark package',
            membership_role: 'project_admin',
            updated_at: '2026-03-31T16:45:00Z',
            primary_benchmark_slug: 'legal-10',
            primary_benchmark_name: 'Legal-10',
          },
        ],
      });
    });

    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
    window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
    window.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;
  });

  it('keeps organization and project selectors synchronized when the org changes', async () => {
    render(
      <MemoryRouter>
        <AgchainOrganizationSwitcher />
        <AgchainProjectSwitcher />
        <FocusProbe />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /personal workspace/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /legal evals/i })).toBeInTheDocument();
      expect(screen.getByTestId('agchain-focus-probe')).toHaveTextContent('Legal Evals');
    });

    fireEvent.click(screen.getByRole('button', { name: /personal workspace/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /acme team/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /acme team/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /finance workspace/i })).toBeInTheDocument();
      expect(screen.getByTestId('agchain-focus-probe')).toHaveTextContent('Finance Workspace');
    });

    fireEvent.click(screen.getByRole('button', { name: /finance workspace/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /legal evals/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /finance workspace/i })).toBeInTheDocument();
    });
  });
});
