import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import {
  PROJECT_FOCUS_STORAGE_KEY,
  PROJECT_FOCUS_CHANGED_EVENT,
  PROJECT_LIST_CHANGED_EVENT,
  readFocusedProjectId,
} from '@/lib/projectFocus';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';

export type ProjectOption = {
  value: string;
  label: string;
  docCount: number;
  workspaceId: string | null;
};

const PROJECTS_RPC_NEW = 'list_projects_overview';
const PROJECTS_RPC_LEGACY = 'list_projects_overview_v2';

type ProjectCatalogStatus = 'idle' | 'loading' | 'ready';

type SharedProjectCatalogState = {
  userKey: string | null;
  requestKey: string | null;
  projectOptions: ProjectOption[] | null;
  status: ProjectCatalogStatus;
};

function toCount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isMissingRpcError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return (
    error.code === 'PGRST202' ||
    /could not find the function/i.test(error.message ?? '') ||
    /function .* does not exist/i.test(error.message ?? '')
  );
}

let sharedProjectCatalogState: SharedProjectCatalogState = {
  userKey: null,
  requestKey: null,
  projectOptions: null,
  status: 'idle',
};

const projectCatalogListeners = new Set<() => void>();
const projectCatalogInflightByRequest = new Map<string, Promise<void>>();

function subscribeProjectCatalog(listener: () => void) {
  projectCatalogListeners.add(listener);
  return () => {
    projectCatalogListeners.delete(listener);
  };
}

function emitProjectCatalog() {
  projectCatalogListeners.forEach((listener) => listener());
}

function getProjectCatalogSnapshot() {
  return sharedProjectCatalogState;
}

function setSharedProjectCatalogState(
  next:
    | SharedProjectCatalogState
    | ((current: SharedProjectCatalogState) => SharedProjectCatalogState),
) {
  sharedProjectCatalogState =
    typeof next === 'function' ? next(sharedProjectCatalogState) : next;
  emitProjectCatalog();
}

function buildUserKey(userId: string | null) {
  return userId ?? null;
}

function buildRequestKey(userKey: string | null, accessToken: string | null) {
  if (!userKey || !accessToken) return null;
  return `${userKey}:${accessToken}`;
}

function resetSharedProjectCatalogState() {
  if (
    sharedProjectCatalogState.userKey === null &&
    sharedProjectCatalogState.requestKey === null &&
    sharedProjectCatalogState.projectOptions === null &&
    sharedProjectCatalogState.status === 'idle'
  ) {
    return;
  }

  projectCatalogInflightByRequest.clear();
  setSharedProjectCatalogState({
    userKey: null,
    requestKey: null,
    projectOptions: null,
    status: 'idle',
  });
}

async function fetchProjectOptionsCatalog(): Promise<ProjectOption[]> {
  const rpcParams = {
    p_search: null,
    p_status: 'all',
    p_limit: 200,
    p_offset: 0,
  };

  let rows: Array<Record<string, unknown>> = [];
  let { data, error } = await supabase.rpc(PROJECTS_RPC_NEW, rpcParams);

  if (error && isMissingRpcError(error)) {
    const fallback = await supabase.rpc(PROJECTS_RPC_LEGACY, rpcParams);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    const fallbackProjects = await supabase
      .from(TABLES.projects)
      .select('project_id, project_name')
      .order('project_name', { ascending: true });

    if (fallbackProjects.error) {
      return [];
    }

    rows = ((fallbackProjects.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      ...row,
      doc_count: 0,
    }));
  } else {
    rows = (data ?? []) as Array<Record<string, unknown>>;
  }

  return rows
    .map((row) => ({
      value: String(row.project_id ?? ''),
      label: String(row.project_name ?? 'Untitled project'),
      docCount: toCount(row.doc_count),
      workspaceId: row.workspace_id ? String(row.workspace_id) : null,
    }))
    .filter((row) => row.value.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label));
}

async function resolveSharedProjectCatalog(
  userKey: string,
  requestKey: string,
  force = false,
): Promise<void> {
  if (!force) {
    const inFlight = projectCatalogInflightByRequest.get(requestKey);
    if (inFlight) return inFlight;
    if (
      sharedProjectCatalogState.userKey === userKey &&
      sharedProjectCatalogState.requestKey === requestKey &&
      sharedProjectCatalogState.status === 'ready'
    ) {
      return;
    }
  }

  setSharedProjectCatalogState((current) => {
    const hasResolvedOptions =
      current.userKey === userKey && current.projectOptions !== null;

    return {
      userKey,
      requestKey,
      projectOptions: hasResolvedOptions ? current.projectOptions : null,
      status: hasResolvedOptions ? 'ready' : 'loading',
    };
  });

  const request = (async () => {
    try {
      const nextOptions = await fetchProjectOptionsCatalog();
      setSharedProjectCatalogState((current) => {
        if (current.userKey !== userKey || current.requestKey !== requestKey) return current;
        return {
          userKey,
          requestKey,
          projectOptions: nextOptions,
          status: 'ready',
        };
      });
    } catch {
      setSharedProjectCatalogState((current) => {
        if (current.userKey !== userKey || current.requestKey !== requestKey) return current;
        return {
          userKey,
          requestKey,
          projectOptions: current.projectOptions ?? [],
          status: 'ready',
        };
      });
    } finally {
      projectCatalogInflightByRequest.delete(requestKey);
    }
  })();

  projectCatalogInflightByRequest.set(requestKey, request);
  return request;
}

export function resetProjectCatalogStateForTests() {
  resetSharedProjectCatalogState();
}

export function useProjectFocus() {
  const location = useLocation();
  const { loading: authLoading, session, user } = useAuth();
  const activeProjectMatch = location.pathname.match(/^\/app\/elt\/([^/]+)/);
  const activeProjectId = activeProjectMatch ? activeProjectMatch[1] : null;
  const snapshot = useSyncExternalStore(
    subscribeProjectCatalog,
    getProjectCatalogSnapshot,
    getProjectCatalogSnapshot,
  );
  const userKey = buildUserKey(user?.id ?? null);
  const requestKey = buildRequestKey(userKey, session?.access_token ?? null);

  const [focusedProjectId, setFocusedProjectIdRaw] = useState<string | null>(() => readFocusedProjectId());

  // Broadcast focus changes so all hook instances stay in sync
  const setFocusedProjectId = useCallback((id: string | null) => {
    setFocusedProjectIdRaw(id);
    window.dispatchEvent(new CustomEvent(PROJECT_FOCUS_CHANGED_EVENT, { detail: { projectId: id } }));
  }, []);
  const projectOptions =
    snapshot.userKey === userKey
      ? snapshot.projectOptions ?? []
      : [];

  const loading = authLoading
    || (
      Boolean(userKey && requestKey)
      && (
        snapshot.userKey !== userKey
        || (snapshot.requestKey !== requestKey && snapshot.projectOptions === null)
        || (snapshot.status === 'loading' && snapshot.projectOptions === null)
      )
    );

  // Persist focused project
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const persistedProjectId = activeProjectId ?? focusedProjectId;
    if (persistedProjectId) {
      window.localStorage.setItem(PROJECT_FOCUS_STORAGE_KEY, persistedProjectId);
      return;
    }
    window.localStorage.removeItem(PROJECT_FOCUS_STORAGE_KEY);
  }, [activeProjectId, focusedProjectId]);

  const loadProjectOptions = useCallback(async () => {
    if (!requestKey || !userKey) return;
    await resolveSharedProjectCatalog(userKey, requestKey, true);
  }, [requestKey, userKey]);

  // Load on mount
  useEffect(() => {
    if (authLoading) return;

    if (!requestKey || !userKey) {
      resetSharedProjectCatalogState();
      return;
    }

    void resolveSharedProjectCatalog(userKey, requestKey);
  }, [authLoading, requestKey, userKey]);

  // Reload on project list changed event
  useEffect(() => {
    const handler = (e: Event) => {
      const focusId = (e as CustomEvent).detail?.focusProjectId;
      setFocusedProjectIdRaw(focusId ?? null);
      void loadProjectOptions();
    };
    window.addEventListener(PROJECT_LIST_CHANGED_EVENT, handler);
    return () => window.removeEventListener(PROJECT_LIST_CHANGED_EVENT, handler);
  }, [loadProjectOptions]);

  // Sync focused project across all hook instances
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail?.projectId ?? null;
      setFocusedProjectIdRaw(id);
    };
    window.addEventListener(PROJECT_FOCUS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(PROJECT_FOCUS_CHANGED_EVENT, handler);
  }, []);

  useEffect(() => {
    if (activeProjectId) return;
    if (focusedProjectId) return;
    if (projectOptions.length === 0) return;
    setFocusedProjectId(projectOptions[0]!.value);
  }, [activeProjectId, focusedProjectId, projectOptions]);

  const resolvedProjectId = useMemo(() => {
    const candidate = activeProjectId ?? focusedProjectId ?? projectOptions[0]?.value ?? null;
    if (!candidate) return null;
    return projectOptions.some((p) => p.value === candidate) ? candidate : null;
  }, [activeProjectId, focusedProjectId, projectOptions]);

  const resolvedProjectName = useMemo(() => {
    if (!resolvedProjectId) return null;
    return projectOptions.find((p) => p.value === resolvedProjectId)?.label ?? null;
  }, [resolvedProjectId, projectOptions]);

  return {
    projectOptions,
    loading,
    focusedProjectId,
    setFocusedProjectId,
    activeProjectId,
    resolvedProjectId,
    resolvedProjectName,
    reload: loadProjectOptions,
  };
}
