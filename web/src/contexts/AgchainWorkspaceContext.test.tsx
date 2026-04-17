import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAgchainWorkspace, AgchainWorkspaceProvider, resetAgchainWorkspaceStateForTests } from './AgchainWorkspaceContext';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const fetchAgchainOrganizationsMock = vi.fn();
const fetchAgchainProjectsMock = vi.fn();
const fetchAgchainWorkspaceBootstrapMock = vi.fn();

vi.mock('@/lib/agchainWorkspaces', () => ({
  fetchAgchainOrganizations: () => fetchAgchainOrganizationsMock(),
  fetchAgchainProjects: (options?: unknown) => fetchAgchainProjectsMock(options),
  fetchAgchainWorkspaceBootstrap: (options?: unknown) => fetchAgchainWorkspaceBootstrapMock(options),
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    loading: false,
    user: { id: 'user-1' },
    session: { access_token: 'token-1' },
  }),
}));

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

const WORKSPACE_BOOTSTRAP_ORG_1 = {
  status: 'ready',
  organizations: [ORG_1, ORG_2],
  projects: [PROJECT_1],
  selectedOrganizationId: 'org-1',
  selectedProjectId: 'project-1',
  error: null,
};

const WORKSPACE_BOOTSTRAP_ORG_2 = {
  status: 'ready',
  organizations: [ORG_1, ORG_2],
  projects: [PROJECT_2],
  selectedOrganizationId: 'org-2',
  selectedProjectId: 'project-2',
  error: null,
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
  fetchAgchainWorkspaceBootstrapMock.mockImplementation((options?: {
    preferredOrganizationId?: string | null;
  }) => {
    if (options?.preferredOrganizationId === 'org-2') {
      return Promise.resolve(WORKSPACE_BOOTSTRAP_ORG_2);
    }
    return Promise.resolve(WORKSPACE_BOOTSTRAP_ORG_1);
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
  resetAgchainWorkspaceStateForTests();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AgchainWorkspaceProvider', () => {
  beforeEach(() => {
    fetchAgchainOrganizationsMock.mockReset();
    fetchAgchainProjectsMock.mockReset();
    fetchAgchainWorkspaceBootstrapMock.mockReset();
    fetchAgchainOrganizationsMock.mockRejectedValue(new Error('legacy organizations bootstrap should not run'));
    fetchAgchainProjectsMock.mockRejectedValue(new Error('legacy projects bootstrap should not run'));
    resetAgchainWorkspaceStateForTests();
  });

  it('bootstraps through the combined workspace endpoint instead of separate organizations and projects calls', async () => {
    fetchAgchainWorkspaceBootstrapMock.mockResolvedValue(WORKSPACE_BOOTSTRAP_ORG_1);
    fetchAgchainOrganizationsMock.mockRejectedValue(new Error('legacy organizations bootstrap should not run'));
    fetchAgchainProjectsMock.mockRejectedValue(new Error('legacy projects bootstrap should not run'));

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('org')).toHaveTextContent('Personal');
    expect(screen.getByTestId('project')).toHaveTextContent('Legal Evals');
    expect(fetchAgchainWorkspaceBootstrapMock).toHaveBeenCalledTimes(1);
    expect(fetchAgchainOrganizationsMock).not.toHaveBeenCalled();
    expect(fetchAgchainProjectsMock).not.toHaveBeenCalled();
  });

  it('keeps the last resolved workspace visible while an organization switch is loading', async () => {
    let resolveNextWorkspace: ((value: typeof WORKSPACE_BOOTSTRAP_ORG_2) => void) | null = null;
    fetchAgchainWorkspaceBootstrapMock
      .mockResolvedValueOnce(WORKSPACE_BOOTSTRAP_ORG_1)
      .mockImplementationOnce(
        () => new Promise<typeof WORKSPACE_BOOTSTRAP_ORG_2>((resolve) => {
          resolveNextWorkspace = resolve;
        }),
      );
    fetchAgchainOrganizationsMock.mockRejectedValue(new Error('legacy organizations bootstrap should not run'));
    fetchAgchainProjectsMock.mockRejectedValue(new Error('legacy projects bootstrap should not run'));

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
    });

    await act(async () => {
      screen.getByTestId('switch-org').click();
    });

    expect(screen.getByTestId('status')).toHaveTextContent('ready');
    expect(screen.getByTestId('org')).toHaveTextContent('Personal');
    expect(screen.getByTestId('project')).toHaveTextContent('Legal Evals');

    await act(async () => {
      resolveNextWorkspace?.(WORKSPACE_BOOTSTRAP_ORG_2);
    });

    await waitFor(() => {
      expect(screen.getByTestId('org')).toHaveTextContent('Acme');
      expect(screen.getByTestId('project')).toHaveTextContent('Finance Evals');
    });
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
    fetchAgchainWorkspaceBootstrapMock.mockResolvedValue({
      status: 'no-organization',
      organizations: [],
      projects: [],
      selectedOrganizationId: null,
      selectedProjectId: null,
      error: null,
    });
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('no-organization');
    });
  });

  it('transitions to no-project when org exists but no projects', async () => {
    fetchAgchainWorkspaceBootstrapMock.mockResolvedValue({
      status: 'no-project',
      organizations: [ORG_1],
      projects: [],
      selectedOrganizationId: 'org-1',
      selectedProjectId: null,
      error: null,
    });
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('no-project');
    });
    expect(screen.getByTestId('org')).toHaveTextContent('Personal');
  });

  it('transitions to error on fetch failure', async () => {
    fetchAgchainWorkspaceBootstrapMock.mockRejectedValue(new Error('Network failure'));
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
    fetchAgchainWorkspaceBootstrapMock.mockResolvedValue({
      status: 'ready',
      organizations: [ORG_1],
      projects: [PROJECT_1, { ...PROJECT_2, organization_id: 'org-1' }],
      selectedOrganizationId: 'org-1',
      selectedProjectId: 'project-1',
      error: null,
    });
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
    });

    const fetchCountBefore = fetchAgchainWorkspaceBootstrapMock.mock.calls.length;

    act(() => {
      screen.getByTestId('switch-project').click();
    });

    expect(screen.getByTestId('project')).toHaveTextContent('Finance Evals');
    expect(fetchAgchainWorkspaceBootstrapMock.mock.calls.length).toBe(fetchCountBefore);
  });

  it('falls back correctly with stale localStorage', async () => {
    window.localStorage.setItem('agchain.organizationFocusId', 'org-deleted');
    window.localStorage.setItem('agchain.projectFocusId', 'project-deleted');

    fetchAgchainWorkspaceBootstrapMock.mockResolvedValue(WORKSPACE_BOOTSTRAP_ORG_1);
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('org')).toHaveTextContent('Personal');
    expect(screen.getByTestId('project')).toHaveTextContent('Legal Evals');
  });

  it('discards stale response on rapid org switch (latest-request-wins)', async () => {
    const initialGate: { resolve: ((value: typeof WORKSPACE_BOOTSTRAP_ORG_1) => void) | null } = { resolve: null };

    fetchAgchainWorkspaceBootstrapMock.mockImplementation((options?: {
      preferredOrganizationId?: string | null;
    }) => {
      if (options?.preferredOrganizationId === 'org-2') {
        return Promise.resolve(WORKSPACE_BOOTSTRAP_ORG_2);
      }
      return new Promise<typeof WORKSPACE_BOOTSTRAP_ORG_1>((resolve) => {
        initialGate.resolve = resolve;
      });
    });

    renderWithProvider();

    // Wait for the first bootstrap request to start.
    await waitFor(() => {
      expect(fetchAgchainWorkspaceBootstrapMock).toHaveBeenCalled();
    });

    // Resolve the first bootstrap so the provider becomes ready.
    await act(async () => {
      initialGate.resolve?.(WORKSPACE_BOOTSTRAP_ORG_1);
    });

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
    });

    // Now set up a slow response for org-1 and switch twice.
    const slowSwitch: { resolve: ((value: typeof WORKSPACE_BOOTSTRAP_ORG_1) => void) | null } = { resolve: null };
    fetchAgchainWorkspaceBootstrapMock.mockImplementation((options?: {
      preferredOrganizationId?: string | null;
    }) => {
      if (options?.preferredOrganizationId === 'org-2') {
        return Promise.resolve(WORKSPACE_BOOTSTRAP_ORG_2);
      }
      return new Promise<typeof WORKSPACE_BOOTSTRAP_ORG_1>((resolve) => {
        slowSwitch.resolve = resolve;
      });
    });

    // First switch: reload current org-1 (slow).
    act(() => {
      screen.getByTestId('reload').click();
    });

    // Second switch: to org-2 (fast) — should win.
    await act(async () => {
      screen.getByTestId('switch-org').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
      expect(screen.getByTestId('org')).toHaveTextContent('Acme');
    });

    // Now resolve the slow org-1 response — it should be discarded.
    slowSwitch.resolve?.(WORKSPACE_BOOTSTRAP_ORG_1);

    // Wait a tick and verify state did not revert.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(screen.getByTestId('org')).toHaveTextContent('Acme');
    expect(screen.getByTestId('project')).toHaveTextContent('Finance Evals');
  });

  it('reuses the resolved workspace scope after a remount in the same session', async () => {
    setupHappyPath();

    const firstRender = renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('org')).toHaveTextContent('Personal');
    expect(screen.getByTestId('project')).toHaveTextContent('Legal Evals');
    expect(fetchAgchainWorkspaceBootstrapMock).toHaveBeenCalledTimes(1);

    firstRender.unmount();

    renderWithProvider();

    expect(screen.getByTestId('status')).toHaveTextContent('ready');
    expect(screen.getByTestId('org')).toHaveTextContent('Personal');
    expect(screen.getByTestId('project')).toHaveTextContent('Legal Evals');
    expect(fetchAgchainWorkspaceBootstrapMock).toHaveBeenCalledTimes(1);
  });
});
