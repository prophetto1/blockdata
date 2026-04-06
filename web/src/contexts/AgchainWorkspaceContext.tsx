import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useAuth } from '@/auth/AuthContext';
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

export type AgchainWorkspaceContextValue = {
  status: AgchainWorkspaceStatus;
  error: string | null;
  organizations: AgchainOrganizationRow[];
  projects: AgchainProjectRow[];
  selectedOrganization: AgchainOrganizationRow | null;
  selectedOrganizationId: string | null;
  selectedProject: AgchainProjectRow | null;
  selectedProjectId: string | null;
  setSelectedOrganizationId: (organizationId: string | null) => Promise<void>;
  setSelectedProjectId: (projectId: string | null, projectSlug?: string | null) => void;
  reloadAndSelect: (
    preferredProjectId?: string | null,
    preferredProjectSlug?: string | null,
  ) => Promise<void>;
  reload: () => Promise<void>;
};

const AgchainWorkspaceContext = createContext<AgchainWorkspaceContextValue | null>(null);

export function useAgchainWorkspace(): AgchainWorkspaceContextValue {
  const ctx = useContext(AgchainWorkspaceContext);
  if (!ctx) throw new Error('useAgchainWorkspace must be used within AgchainWorkspaceProvider');
  return ctx;
}

type ProviderState = {
  status: AgchainWorkspaceStatus;
  organizations: AgchainOrganizationRow[];
  projects: AgchainProjectRow[];
  selectedOrganizationId: string | null;
  selectedProjectId: string | null;
  error: string | null;
};

type SharedWorkspaceState = {
  userKey: string | null;
  requestKey: string | null;
  workspace: ProviderState;
};

const INITIAL_STATE: ProviderState = {
  status: 'bootstrapping',
  organizations: [],
  projects: [],
  selectedOrganizationId: null,
  selectedProjectId: null,
  error: null,
};

let sharedWorkspaceState: SharedWorkspaceState = {
  userKey: null,
  requestKey: null,
  workspace: INITIAL_STATE,
};

const workspaceListeners = new Set<() => void>();
const workspaceInflightByRequest = new Map<string, Promise<void>>();
const latestWorkspaceTokenByRequest = new Map<string, number>();
let workspaceRequestSequence = 0;

function subscribeWorkspace(listener: () => void) {
  workspaceListeners.add(listener);
  return () => {
    workspaceListeners.delete(listener);
  };
}

function emitWorkspace() {
  workspaceListeners.forEach((listener) => listener());
}

function getWorkspaceSnapshot() {
  return sharedWorkspaceState;
}

function setSharedWorkspaceState(
  next:
    | SharedWorkspaceState
    | ((current: SharedWorkspaceState) => SharedWorkspaceState),
) {
  sharedWorkspaceState =
    typeof next === 'function' ? next(sharedWorkspaceState) : next;
  emitWorkspace();
}

function buildUserKey(userId: string | null) {
  return userId ?? null;
}

function buildRequestKey(userKey: string | null, accessToken: string | null) {
  if (!userKey || !accessToken) return null;
  return `${userKey}:${accessToken}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function resetSharedWorkspaceState() {
  if (
    sharedWorkspaceState.userKey === null &&
    sharedWorkspaceState.requestKey === null &&
    sharedWorkspaceState.workspace === INITIAL_STATE &&
    workspaceInflightByRequest.size === 0 &&
    latestWorkspaceTokenByRequest.size === 0
  ) {
    return;
  }

  workspaceInflightByRequest.clear();
  latestWorkspaceTokenByRequest.clear();
  workspaceRequestSequence = 0;
  setSharedWorkspaceState({
    userKey: null,
    requestKey: null,
    workspace: INITIAL_STATE,
  });
}

function getWorkspaceStateForSession(
  snapshot: SharedWorkspaceState,
  userKey: string | null,
  requestKey: string | null,
): ProviderState {
  if (!userKey || !requestKey) return INITIAL_STATE;
  if (snapshot.userKey !== userKey) return INITIAL_STATE;
  if (snapshot.requestKey !== requestKey && snapshot.workspace.status === 'bootstrapping') {
    return INITIAL_STATE;
  }
  return snapshot.workspace;
}

async function fetchResolvedWorkspaceState(options?: {
  preferredProjectId?: string | null;
  preferredProjectSlug?: string | null;
  preferredOrgId?: string | null;
}): Promise<ProviderState> {
  const storedOrgId = options?.preferredOrgId ?? readStoredAgchainOrganizationFocusId();
  const orgsResponse = await fetchAgchainOrganizations();
  const organizations = orgsResponse.items;

  if (organizations.length === 0) {
    const result = reconcileWorkspaceSelection({
      organizations: [],
      projects: [],
      preferredOrgId: null,
      preferredProjectId: null,
      preferredProjectSlug: null,
      fetchError: null,
    });

    return {
      status: result.status,
      organizations,
      projects: [],
      selectedOrganizationId: result.selectedOrganizationId,
      selectedProjectId: result.selectedProjectId,
      error: result.error,
    };
  }

  const resolvedOrgId =
    (storedOrgId && organizations.some((o) => o.organization_id === storedOrgId))
      ? storedOrgId
      : organizations[0].organization_id;

  const projectsResponse = await fetchAgchainProjects({ organizationId: resolvedOrgId });
  const projects = projectsResponse.items;
  const preferredProjectId = options?.preferredProjectId ?? readStoredAgchainProjectFocusId();
  const preferredProjectSlug = options?.preferredProjectSlug ?? readStoredAgchainProjectFocusSlug();

  const result = reconcileWorkspaceSelection({
    organizations,
    projects,
    preferredOrgId: resolvedOrgId,
    preferredProjectId,
    preferredProjectSlug,
    fetchError: null,
  });

  const resolvedProject = projects.find((p) => p.project_id === result.selectedProjectId);
  writeStoredAgchainWorkspaceFocus({
    focusedOrganizationId: result.selectedOrganizationId,
    focusedProjectId: result.selectedProjectId,
    focusedProjectSlug: resolvedProject?.project_slug ?? null,
  });

  return {
    status: result.status,
    organizations,
    projects,
    selectedOrganizationId: result.selectedOrganizationId,
    selectedProjectId: result.selectedProjectId,
    error: result.error,
  };
}

async function resolveSharedWorkspace(
  userKey: string,
  requestKey: string,
  options?: {
    force?: boolean;
    preferredProjectId?: string | null;
    preferredProjectSlug?: string | null;
    preferredOrgId?: string | null;
    preserveSnapshot?: boolean;
  },
): Promise<void> {
  const force = options?.force ?? false;
  const preserveSnapshot = options?.preserveSnapshot ?? force;

  if (!force) {
    const inFlight = workspaceInflightByRequest.get(requestKey);
    if (inFlight) return inFlight;
    if (
      sharedWorkspaceState.userKey === userKey &&
      sharedWorkspaceState.requestKey === requestKey &&
      sharedWorkspaceState.workspace.status !== 'bootstrapping'
    ) {
      return;
    }
  }

  const currentWorkspace = getWorkspaceStateForSession(sharedWorkspaceState, userKey, requestKey);
  const canPreserveSnapshot =
    preserveSnapshot && currentWorkspace.status !== 'bootstrapping';

  setSharedWorkspaceState({
    userKey,
    requestKey,
    workspace: canPreserveSnapshot
      ? currentWorkspace
      : { ...currentWorkspace, status: 'bootstrapping', error: null },
  });

  const requestToken = ++workspaceRequestSequence;
  latestWorkspaceTokenByRequest.set(requestKey, requestToken);

  let requestPromise!: Promise<void>;
  requestPromise = (async () => {
    try {
      const nextWorkspace = await fetchResolvedWorkspaceState({
        preferredProjectId: options?.preferredProjectId,
        preferredProjectSlug: options?.preferredProjectSlug,
        preferredOrgId: options?.preferredOrgId,
      });

      if (latestWorkspaceTokenByRequest.get(requestKey) !== requestToken) return;

      setSharedWorkspaceState((current) => {
        if (current.userKey !== userKey || current.requestKey !== requestKey) return current;
        return {
          userKey,
          requestKey,
          workspace: nextWorkspace,
        };
      });
    } catch (error) {
      if (latestWorkspaceTokenByRequest.get(requestKey) !== requestToken) return;

      const message = getErrorMessage(error);
      setSharedWorkspaceState((current) => {
        if (current.userKey !== userKey || current.requestKey !== requestKey) return current;

        if (canPreserveSnapshot && current.workspace.status !== 'bootstrapping') {
          return {
            userKey,
            requestKey,
            workspace: {
              ...current.workspace,
              error: message,
            },
          };
        }

        return {
          userKey,
          requestKey,
          workspace: {
            ...INITIAL_STATE,
            status: 'error',
            error: message,
          },
        };
      });
    } finally {
      if (workspaceInflightByRequest.get(requestKey) === requestPromise) {
        workspaceInflightByRequest.delete(requestKey);
      }
      if (latestWorkspaceTokenByRequest.get(requestKey) === requestToken) {
        latestWorkspaceTokenByRequest.delete(requestKey);
      }
    }
  })();

  workspaceInflightByRequest.set(requestKey, requestPromise);
  return requestPromise;
}

export function resetAgchainWorkspaceStateForTests() {
  resetSharedWorkspaceState();
}

export function AgchainWorkspaceProvider({ children }: { children: ReactNode }) {
  const { loading: authLoading, session, user } = useAuth();
  const snapshot = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    getWorkspaceSnapshot,
  );
  const userKey = buildUserKey(user?.id ?? null);
  const requestKey = buildRequestKey(userKey, session?.access_token ?? null);
  const state = useMemo(
    () => getWorkspaceStateForSession(snapshot, userKey, requestKey),
    [requestKey, snapshot, userKey],
  );

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (authLoading) return;

    if (!requestKey || !userKey) {
      resetSharedWorkspaceState();
      return;
    }

    void resolveSharedWorkspace(userKey, requestKey);
  }, [authLoading, requestKey, userKey]);

  const setSelectedOrganizationId = useCallback(
    async (organizationId: string | null): Promise<void> => {
      if (!requestKey || !userKey) return;
      await resolveSharedWorkspace(userKey, requestKey, {
        force: true,
        preferredOrgId: organizationId,
        preserveSnapshot: false,
      });
    },
    [requestKey, userKey],
  );

  const setSelectedProjectId = useCallback(
    (projectId: string | null, projectSlug?: string | null): void => {
      if (!userKey) return;

      setSharedWorkspaceState((current) => {
        if (current.userKey !== userKey) return current;

        const workspace = current.workspace;
        if (workspace.status === 'ready' && projectId === null) {
          return current;
        }

        if (projectId !== null) {
          writeStoredAgchainWorkspaceFocus({
            focusedProjectId: projectId,
            focusedProjectSlug:
              projectSlug ?? workspace.projects.find((p) => p.project_id === projectId)?.project_slug ?? null,
          });
        }

        return {
          userKey,
          requestKey,
          workspace: {
            ...workspace,
            selectedProjectId: projectId,
          },
        };
      });
    },
    [requestKey, userKey],
  );

  const reloadAndSelect = useCallback(
    async (
      preferredProjectId?: string | null,
      preferredProjectSlug?: string | null,
    ): Promise<void> => {
      if (!requestKey || !userKey) return;
      await resolveSharedWorkspace(userKey, requestKey, {
        force: true,
        preferredProjectId,
        preferredProjectSlug,
        preferredOrgId: stateRef.current.selectedOrganizationId,
        preserveSnapshot: true,
      });
    },
    [requestKey, userKey],
  );

  const reload = useCallback(async (): Promise<void> => {
    if (!requestKey || !userKey) return;
    await resolveSharedWorkspace(userKey, requestKey, {
      force: true,
      preferredOrgId: stateRef.current.selectedOrganizationId,
      preserveSnapshot: true,
    });
  }, [requestKey, userKey]);

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
      reload,
      reloadAndSelect,
      selectedOrganization,
      selectedProject,
      setSelectedOrganizationId,
      setSelectedProjectId,
      state,
    ],
  );

  return (
    <AgchainWorkspaceContext.Provider value={value}>
      {children}
    </AgchainWorkspaceContext.Provider>
  );
}
