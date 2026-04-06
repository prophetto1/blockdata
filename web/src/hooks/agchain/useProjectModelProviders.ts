import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useAuth } from '@/auth/AuthContext';
import {
  fetchProjectModelProviders,
  type AgchainScopedModelProvider,
} from '@/lib/agchainModelProviderCredentials';

type ProvidersCatalogStatus = 'idle' | 'loading' | 'ready' | 'error';

type ProvidersCatalogState = {
  items: AgchainScopedModelProvider[] | null;
  status: ProvidersCatalogStatus;
  error: string | null;
  refresh: () => Promise<void>;
};

type SharedProvidersCatalogState = {
  userKey: string | null;
  requestKey: string | null;
  projectId: string | null;
  items: AgchainScopedModelProvider[] | null;
  status: ProvidersCatalogStatus;
  error: string | null;
};

let sharedProvidersCatalogState: SharedProvidersCatalogState = {
  userKey: null,
  requestKey: null,
  projectId: null,
  items: null,
  status: 'idle',
  error: null,
};

const providersCatalogListeners = new Set<() => void>();
const providersCatalogInflightByRequest = new Map<string, Promise<void>>();

function subscribeProvidersCatalog(listener: () => void) {
  providersCatalogListeners.add(listener);
  return () => {
    providersCatalogListeners.delete(listener);
  };
}

function emitProvidersCatalog() {
  providersCatalogListeners.forEach((listener) => listener());
}

function getProvidersCatalogSnapshot() {
  return sharedProvidersCatalogState;
}

function setSharedProvidersCatalogState(
  next:
    | SharedProvidersCatalogState
    | ((current: SharedProvidersCatalogState) => SharedProvidersCatalogState),
) {
  sharedProvidersCatalogState =
    typeof next === 'function' ? next(sharedProvidersCatalogState) : next;
  emitProvidersCatalog();
}

function buildUserKey(userId: string | null) {
  return userId ?? null;
}

function buildRequestKey(userKey: string | null, accessToken: string | null) {
  if (!userKey || !accessToken) return null;
  return `${userKey}:${accessToken}`;
}

function buildScopeKey(requestKey: string, projectId: string) {
  return `${requestKey}:${projectId}`;
}

function resetSharedProvidersCatalogState() {
  providersCatalogInflightByRequest.clear();
  setSharedProvidersCatalogState({
    userKey: null,
    requestKey: null,
    projectId: null,
    items: null,
    status: 'idle',
    error: null,
  });
}

async function resolveSharedProvidersCatalog(
  userKey: string,
  requestKey: string,
  projectId: string,
  force = false,
): Promise<void> {
  const scopeKey = buildScopeKey(requestKey, projectId);
  if (!force) {
    const inFlight = providersCatalogInflightByRequest.get(scopeKey);
    if (inFlight) return inFlight;
    if (
      sharedProvidersCatalogState.userKey === userKey &&
      sharedProvidersCatalogState.requestKey === requestKey &&
      sharedProvidersCatalogState.projectId === projectId &&
      sharedProvidersCatalogState.status === 'ready'
    ) {
      return;
    }
  }

  setSharedProvidersCatalogState((current) => {
    const hasResolvedItems =
      current.userKey === userKey &&
      current.projectId === projectId &&
      current.items !== null;

    return {
      userKey,
      requestKey,
      projectId,
      items: hasResolvedItems ? current.items : null,
      status: hasResolvedItems ? 'ready' : 'loading',
      error: null,
    };
  });

  const request = (async () => {
    try {
      const nextItems = await fetchProjectModelProviders(projectId);
      setSharedProvidersCatalogState((current) => {
        if (
          current.userKey !== userKey ||
          current.requestKey !== requestKey ||
          current.projectId !== projectId
        ) {
          return current;
        }

        return {
          userKey,
          requestKey,
          projectId,
          items: nextItems,
          status: 'ready',
          error: null,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSharedProvidersCatalogState((current) => {
        if (
          current.userKey !== userKey ||
          current.requestKey !== requestKey ||
          current.projectId !== projectId
        ) {
          return current;
        }

        return {
          userKey,
          requestKey,
          projectId,
          items: current.items,
          status: current.items ? 'ready' : 'error',
          error: message,
        };
      });
    } finally {
      providersCatalogInflightByRequest.delete(scopeKey);
    }
  })();

  providersCatalogInflightByRequest.set(scopeKey, request);
  return request;
}

export function useProjectModelProviders(projectId: string | null): ProvidersCatalogState {
  const { loading, session, user } = useAuth();
  const snapshot = useSyncExternalStore(
    subscribeProvidersCatalog,
    getProvidersCatalogSnapshot,
    getProvidersCatalogSnapshot,
  );

  const userKey = buildUserKey(user?.id ?? null);
  const requestKey = buildRequestKey(userKey, session?.access_token ?? null);

  useEffect(() => {
    if (loading) return;
    if (!requestKey || !userKey || !projectId) {
      resetSharedProvidersCatalogState();
      return;
    }
    void resolveSharedProvidersCatalog(userKey, requestKey, projectId);
  }, [loading, projectId, requestKey, userKey]);

  const refresh = useCallback(async () => {
    if (!requestKey || !userKey || !projectId) return;
    await resolveSharedProvidersCatalog(userKey, requestKey, projectId, true);
  }, [projectId, requestKey, userKey]);

  if (loading) {
    return { items: null, status: 'loading', error: null, refresh };
  }
  if (!requestKey || !userKey || !projectId) {
    return { items: null, status: 'idle', error: null, refresh };
  }
  if (snapshot.userKey !== userKey || snapshot.projectId !== projectId) {
    return { items: null, status: 'loading', error: null, refresh };
  }
  if (snapshot.requestKey !== requestKey && snapshot.items === null) {
    return { items: null, status: 'loading', error: null, refresh };
  }

  return {
    items: snapshot.items,
    status: snapshot.status,
    error: snapshot.error,
    refresh,
  };
}

export function resetProjectModelProvidersStateForTests() {
  resetSharedProvidersCatalogState();
}
