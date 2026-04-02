import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAgchainWorkspace, AgchainWorkspaceProvider } from './AgchainWorkspaceContext';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const fetchAgchainOrganizationsMock = vi.fn();
const fetchAgchainProjectsMock = vi.fn();

vi.mock('@/lib/agchainWorkspaces', async () => {
  const actual = await vi.importActual<typeof import('@/lib/agchainWorkspaces')>('@/lib/agchainWorkspaces');
  return {
    ...actual,
    fetchAgchainOrganizations: () => fetchAgchainOrganizationsMock(),
    fetchAgchainProjects: (options?: unknown) => fetchAgchainProjectsMock(options),
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ORG_1 = {
  organization_id: 'org-1',
  organization_slug: 'personal',
  display_name: 'Personal',
  membership_role: 'organization_admin',
  is_personal: true,
  project_count: 1,
};

const ORG_2 = {
  organization_id: 'org-2',
  organization_slug: 'acme',
  display_name: 'Acme',
  membership_role: 'organization_member',
  is_personal: false,
  project_count: 1,
};

const PROJECT_1 = {
  project_id: 'project-1',
  organization_id: 'org-1',
  project_slug: 'legal-evals',
  project_name: 'Legal Evals',
  description: 'Legal benchmark package',
  membership_role: 'project_admin',
  updated_at: '2026-03-31T16:45:00Z',
  primary_benchmark_slug: 'legal-10',
  primary_benchmark_name: 'Legal-10',
};

const PROJECT_2 = {
  project_id: 'project-2',
  organization_id: 'org-2',
  project_slug: 'finance-evals',
  project_name: 'Finance Evals',
  description: 'Finance eval',
  membership_role: 'project_admin',
  updated_at: '2026-03-31T14:00:00Z',
  primary_benchmark_slug: 'finance-eval',
  primary_benchmark_name: 'Finance Eval',
};

// ---------------------------------------------------------------------------
// Probe component
// ---------------------------------------------------------------------------

function ProviderProbe() {
  const ctx = useAgchainWorkspace();
  return (
    <div>
      <span data-testid="status">{ctx.status}</span>
      <span data-testid="org">{ctx.selectedOrganization?.display_name ?? 'none'}</span>
      <span data-testid="project">{ctx.selectedProject?.project_name ?? 'none'}</span>
      <span data-testid="error">{ctx.error ?? 'none'}</span>
      <button data-testid="switch-org" onClick={() => ctx.setSelectedOrganizationId('org-2')}>Switch Org</button>
      <button data-testid="switch-project" onClick={() => ctx.setSelectedProjectId('project-2', 'finance-evals')}>Switch Project</button>
      <button data-testid="reload" onClick={() => ctx.reload()}>Reload</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AgchainWorkspaceProvider>
      <ProviderProbe />
    </AgchainWorkspaceProvider>,
  );
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

function setupHappyPath() {
  fetchAgchainOrganizationsMock.mockResolvedValue({ items: [ORG_1, ORG_2] });
  fetchAgchainProjectsMock.mockImplementation((options?: { organizationId?: string | null }) => {
    if (options?.organizationId === 'org-2') {
      return Promise.resolve({ items: [PROJECT_2] });
    }
    return Promise.resolve({ items: [PROJECT_1] });
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AgchainWorkspaceProvider', () => {
  beforeEach(() => {
    fetchAgchainOrganizationsMock.mockReset();
    fetchAgchainProjectsMock.mockReset();
  });

  it('bootstraps to ready with valid org + project', async () => {
    setupHappyPath();
    renderWithProvider();

    expect(screen.getByTestId('status')).toHaveTextContent('bootstrapping');

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('org')).toHaveTextContent('Personal');
    expect(screen.getByTestId('project')).toHaveTextContent('Legal Evals');
  });

  it('transitions to no-organization when no orgs returned', async () => {
    fetchAgchainOrganizationsMock.mockResolvedValue({ items: [] });
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('no-organization');
    });
  });

  it('transitions to no-project when org exists but no projects', async () => {
    fetchAgchainOrganizationsMock.mockResolvedValue({ items: [ORG_1] });
    fetchAgchainProjectsMock.mockResolvedValue({ items: [] });
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('no-project');
    });
    expect(screen.getByTestId('org')).toHaveTextContent('Personal');
  });

  it('transitions to error on fetch failure', async () => {
    fetchAgchainOrganizationsMock.mockRejectedValue(new Error('Network failure'));
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('error');
    });
    expect(screen.getByTestId('error')).toHaveTextContent('Network failure');
  });

  it('reloads projects on org switch', async () => {
    setupHappyPath();
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
    });

    await act(async () => {
      screen.getByTestId('switch-org').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
      expect(screen.getByTestId('org')).toHaveTextContent('Acme');
      expect(screen.getByTestId('project')).toHaveTextContent('Finance Evals');
    });
  });

  it('updates project immediately without re-fetch on project switch', async () => {
    fetchAgchainOrganizationsMock.mockResolvedValue({ items: [ORG_1] });
    fetchAgchainProjectsMock.mockResolvedValue({ items: [PROJECT_1, { ...PROJECT_2, organization_id: 'org-1' }] });
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
    });

    const fetchCountBefore = fetchAgchainProjectsMock.mock.calls.length;

    act(() => {
      screen.getByTestId('switch-project').click();
    });

    expect(screen.getByTestId('project')).toHaveTextContent('Finance Evals');
    expect(fetchAgchainProjectsMock.mock.calls.length).toBe(fetchCountBefore);
  });

  it('falls back correctly with stale localStorage', async () => {
    window.localStorage.setItem('agchain.organizationFocusId', 'org-deleted');
    window.localStorage.setItem('agchain.projectFocusId', 'project-deleted');

    setupHappyPath();
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
    });

    // Falls back to first org and first project
    expect(screen.getByTestId('org')).toHaveTextContent('Personal');
    expect(screen.getByTestId('project')).toHaveTextContent('Legal Evals');
  });

  it('discards stale response on rapid org switch (latest-request-wins)', async () => {
    const org1Gate: { resolve: ((value: { items: (typeof PROJECT_1)[] }) => void) | null } = { resolve: null };

    fetchAgchainOrganizationsMock.mockResolvedValue({ items: [ORG_1, ORG_2] });
    fetchAgchainProjectsMock.mockImplementation((options?: { organizationId?: string | null }) => {
      if (options?.organizationId === 'org-2') {
        return Promise.resolve({ items: [PROJECT_2] });
      }
      // First org: delay resolution so we can trigger a second switch
      return new Promise<{ items: (typeof PROJECT_1)[] }>((resolve) => {
        org1Gate.resolve = resolve;
      });
    });

    renderWithProvider();

    // Wait for bootstrap to start (orgs loaded, first project fetch in-flight)
    await waitFor(() => {
      expect(fetchAgchainProjectsMock).toHaveBeenCalled();
    });

    // Resolve the first project fetch so bootstrap completes
    await act(async () => {
      org1Gate.resolve?.({ items: [PROJECT_1] });
    });

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
    });

    // Now set up a slow response for org-1 and switch twice
    type ProjectsResult = { items: (typeof PROJECT_1)[] };
    const slowSwitch: { resolve: ((value: ProjectsResult) => void) | null } = { resolve: null };
    fetchAgchainProjectsMock.mockImplementation((options?: { organizationId?: string | null }) => {
      if (options?.organizationId === 'org-2') {
        return Promise.resolve({ items: [PROJECT_2] });
      }
      return new Promise<ProjectsResult>((resolve) => {
        slowSwitch.resolve = resolve;
      });
    });

    // First switch: to org-1 (slow)
    act(() => {
      screen.getByTestId('reload').click();
    });

    // Second switch: to org-2 (fast) — should win
    await act(async () => {
      screen.getByTestId('switch-org').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
      expect(screen.getByTestId('org')).toHaveTextContent('Acme');
    });

    // Now resolve the slow org-1 response — it should be discarded
    slowSwitch.resolve?.({ items: [PROJECT_1] });

    // Wait a tick and verify state didn't revert
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByTestId('org')).toHaveTextContent('Acme');
    expect(screen.getByTestId('project')).toHaveTextContent('Finance Evals');
  });
});
