import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AgchainOrganizationRow, AgchainProjectRow } from '@/lib/agchainWorkspaces';
import {
  fetchAgchainOrganizations,
  fetchAgchainProjects,
} from '@/lib/agchainWorkspaces';
import {
  readStoredAgchainOrganizationFocusId,
  readStoredAgchainProjectFocusId,
  readStoredAgchainProjectFocusSlug,
  writeStoredAgchainWorkspaceFocus,
} from '@/lib/agchainProjectFocus';
import {
  reconcileWorkspaceSelection,
  type AgchainWorkspaceStatus,
} from '@/lib/agchainWorkspaceReconciliation';

export type { AgchainWorkspaceStatus } from '@/lib/agchainWorkspaceReconciliation';

// ---------------------------------------------------------------------------
// Context value type
// ---------------------------------------------------------------------------

export type AgchainWorkspaceContextValue = {
  // Status layer — authoritative, determines UI behavior
  status: AgchainWorkspaceStatus;
  error: string | null;

  // Collections layer — the full org-scoped lists
  organizations: AgchainOrganizationRow[];
  projects: AgchainProjectRow[];

  // Selection layer — resolved from reconciliation
  selectedOrganization: AgchainOrganizationRow | null;
  selectedOrganizationId: string | null;
  selectedProject: AgchainProjectRow | null;
  selectedProjectId: string | null;

  // Actions — fetch actions return Promise<void>, local-only mutations return void
  setSelectedOrganizationId: (organizationId: string | null) => Promise<void>;
  setSelectedProjectId: (projectId: string | null, projectSlug?: string | null) => void;
  reloadAndSelect: (
    preferredProjectId?: string | null,
    preferredProjectSlug?: string | null,
  ) => Promise<void>;
  reload: () => Promise<void>;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AgchainWorkspaceContext = createContext<AgchainWorkspaceContextValue | null>(null);

// ---------------------------------------------------------------------------
// Consumer hook
// ---------------------------------------------------------------------------

export function useAgchainWorkspace(): AgchainWorkspaceContextValue {
  const ctx = useContext(AgchainWorkspaceContext);
  if (!ctx) throw new Error('useAgchainWorkspace must be used within AgchainWorkspaceProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Internal state shape
// ---------------------------------------------------------------------------

type ProviderState = {
  status: AgchainWorkspaceStatus;
  organizations: AgchainOrganizationRow[];
  projects: AgchainProjectRow[];
  selectedOrganizationId: string | null;
  selectedProjectId: string | null;
  error: string | null;
};

const INITIAL_STATE: ProviderState = {
  status: 'bootstrapping',
  organizations: [],
  projects: [],
  selectedOrganizationId: null,
  selectedProjectId: null,
  error: null,
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

// ---------------------------------------------------------------------------
// Provider component
// ---------------------------------------------------------------------------

export function AgchainWorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProviderState>(INITIAL_STATE);

  // Monotonic request token for latest-request-wins guard
  const requestTokenRef = useRef(0);

  // Keep a ref to the latest state for async actions that need the freshest org ID
  const stateRef = useRef(state);
  stateRef.current = state;

  // -----------------------------------------------------------------------
  // Core async flow: fetch orgs + projects, reconcile, commit
  // -----------------------------------------------------------------------

  const runBootstrap = useCallback(
    async (options?: {
      preferredProjectId?: string | null;
      preferredProjectSlug?: string | null;
      preferredOrgId?: string | null;
    }): Promise<void> => {
      const token = ++requestTokenRef.current;
      setState((prev) => ({ ...prev, status: 'bootstrapping' }));

      try {
        // Step 2-3: Read preferred org, fetch organizations
        const storedOrgId = options?.preferredOrgId ?? readStoredAgchainOrganizationFocusId();
        const orgsResponse = await fetchAgchainOrganizations();
        const organizations = orgsResponse.items;

        // Stale guard
        if (requestTokenRef.current !== token) return;

        // Step 4-5: Early exits handled by reconciliation
        if (organizations.length === 0) {
          const result = reconcileWorkspaceSelection({
            organizations: [],
            projects: [],
            preferredOrgId: null,
            preferredProjectId: null,
            preferredProjectSlug: null,
            fetchError: null,
          });
          setState({
            status: result.status,
            organizations,
            projects: [],
            selectedOrganizationId: result.selectedOrganizationId,
            selectedProjectId: result.selectedProjectId,
            error: result.error,
          });
          return;
        }

        // Step 6: Resolve org
        const resolvedOrgId =
          (storedOrgId && organizations.some((o) => o.organization_id === storedOrgId))
            ? storedOrgId
            : organizations[0].organization_id;

        // Step 7: Fetch projects for resolved org
        const projectsResponse = await fetchAgchainProjects({ organizationId: resolvedOrgId });
        const projects = projectsResponse.items;

        // Stale guard
        if (requestTokenRef.current !== token) return;

        // Step 8: Read latest localStorage NOW (picks up mid-bootstrap writes)
        const preferredProjectId = options?.preferredProjectId ?? readStoredAgchainProjectFocusId();
        const preferredProjectSlug = options?.preferredProjectSlug ?? readStoredAgchainProjectFocusSlug();

        // Step 9: Reconcile
        const result = reconcileWorkspaceSelection({
          organizations,
          projects,
          preferredOrgId: resolvedOrgId,
          preferredProjectId,
          preferredProjectSlug,
          fetchError: null,
        });

        // Step 10: Set provider state atomically
        setState({
          status: result.status,
          organizations,
          projects,
          selectedOrganizationId: result.selectedOrganizationId,
          selectedProjectId: result.selectedProjectId,
          error: result.error,
        });

        // Step 11: Persist resolved selection to localStorage
        const resolvedProject = projects.find((p) => p.project_id === result.selectedProjectId);
        writeStoredAgchainWorkspaceFocus({
          focusedOrganizationId: result.selectedOrganizationId,
          focusedProjectId: result.selectedProjectId,
          focusedProjectSlug: resolvedProject?.project_slug ?? null,
        });
      } catch (err) {
        // Stale guard
        if (requestTokenRef.current !== token) return;

        setState((prev) => ({
          ...prev,
          status: 'error',
          error: getErrorMessage(err),
        }));
      }
    },
    [],
  );

  // -----------------------------------------------------------------------
  // Bootstrap on mount
  // -----------------------------------------------------------------------

  useEffect(() => {
    void runBootstrap();
  }, [runBootstrap]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const setSelectedOrganizationId = useCallback(
    async (organizationId: string | null): Promise<void> => {
      await runBootstrap({ preferredOrgId: organizationId });
    },
    [runBootstrap],
  );

  const setSelectedProjectId = useCallback(
    (projectId: string | null, projectSlug?: string | null): void => {
      setState((prev) => {
        // Case 3 from URL slug contract: when ready and projectId is null, no-op
        if (prev.status === 'ready' && projectId === null) {
          return prev;
        }

        // Persist to localStorage from freshest state (avoids stale closure)
        if (projectId !== null) {
          writeStoredAgchainWorkspaceFocus({
            focusedProjectId: projectId,
            focusedProjectSlug:
              projectSlug ?? prev.projects.find((p) => p.project_id === projectId)?.project_slug ?? null,
          });
        }

        return { ...prev, selectedProjectId: projectId };
      });
    },
    [],
  );

  const reloadAndSelect = useCallback(
    async (
      preferredProjectId?: string | null,
      preferredProjectSlug?: string | null,
    ): Promise<void> => {
      await runBootstrap({
        preferredProjectId,
        preferredProjectSlug,
        preferredOrgId: stateRef.current.selectedOrganizationId,
      });
    },
    [runBootstrap],
  );

  const reload = useCallback(async (): Promise<void> => {
    await runBootstrap();
  }, [runBootstrap]);

  // -----------------------------------------------------------------------
  // Derived values
  // -----------------------------------------------------------------------

  const selectedOrganization = useMemo(
    () =>
      state.organizations.find((o) => o.organization_id === state.selectedOrganizationId) ?? null,
    [state.organizations, state.selectedOrganizationId],
  );

  const selectedProject = useMemo(
    () =>
      state.projects.find((p) => p.project_id === state.selectedProjectId) ?? null,
    [state.projects, state.selectedProjectId],
  );

  // -----------------------------------------------------------------------
  // Context value
  // -----------------------------------------------------------------------

  const value = useMemo<AgchainWorkspaceContextValue>(
    () => ({
      status: state.status,
      error: state.error,
      organizations: state.organizations,
      projects: state.projects,
      selectedOrganization,
      selectedOrganizationId: state.selectedOrganizationId,
      selectedProject,
      selectedProjectId: state.selectedProjectId,
      setSelectedOrganizationId,
      setSelectedProjectId,
      reloadAndSelect,
      reload,
    }),
    [
      state,
      selectedOrganization,
      selectedProject,
      setSelectedOrganizationId,
      setSelectedProjectId,
      reloadAndSelect,
      reload,
    ],
  );

  return (
    <AgchainWorkspaceContext.Provider value={value}>
      {children}
    </AgchainWorkspaceContext.Provider>
  );
}
