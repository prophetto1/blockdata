import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useAuth } from '@/auth/AuthContext';
import {
  fetchAgchainModels,
  fetchAgchainModelProviders,
  type AgchainModelTarget,
  type AgchainProviderDefinition,
} from '@/lib/agchainModels';

type AdminRegistryStatus = 'idle' | 'loading' | 'ready' | 'error';

type SharedAdminRegistryState = {
  userKey: string | null;
  requestKey: string | null;
  providers: AgchainProviderDefinition[] | null;
  models: AgchainModelTarget[] | null;
  status: AdminRegistryStatus;
  error: string | null;
};

type AgchainAdminRegistryState = {
  providers: AgchainProviderDefinition[] | null;
  models: AgchainModelTarget[] | null;
  status: AdminRegistryStatus;
  error: string | null;
  refresh: () => Promise<void>;
};

let sharedAdminRegistryState: SharedAdminRegistryState = {
  userKey: null,
  requestKey: null,
  providers: null,
  models: null,
  status: 'idle',
  error: null,
};

const adminRegistryListeners = new Set<() => void>();
const adminRegistryInflightByRequest = new Map<string, Promise<void>>();

function subscribeAdminRegistry(listener: () => void) {
  adminRegistryListeners.add(listener);
  return () => {
    adminRegistryListeners.delete(listener);
  };
}

function emitAdminRegistry() {
  adminRegistryListeners.forEach((listener) => listener());
}

function getAdminRegistrySnapshot() {
  return sharedAdminRegistryState;
}

function setSharedAdminRegistryState(
  next: SharedAdminRegistryState | ((current: SharedAdminRegistryState) => SharedAdminRegistryState),
) {
  sharedAdminRegistryState =
    typeof next === 'function' ? next(sharedAdminRegistryState) : next;
  emitAdminRegistry();
}

function buildUserKey(userId: string | null) {
  return userId ?? null;
}

function buildRequestKey(userKey: string | null, accessToken: string | null) {
  if (!userKey || !accessToken) return null;
  return `${userKey}:${accessToken}`;
}

function resetSharedAdminRegistryState() {
  adminRegistryInflightByRequest.clear();
  setSharedAdminRegistryState({
    userKey: null,
    requestKey: null,
    providers: null,
    models: null,
    status: 'idle',
    error: null,
  });
}

async function resolveSharedAdminRegistry(
  userKey: string,
  requestKey: string,
  force = false,
): Promise<void> {
  if (!force) {
    const inflight = adminRegistryInflightByRequest.get(requestKey);
    if (inflight) return inflight;
    if (
      sharedAdminRegistryState.userKey === userKey &&
      sharedAdminRegistryState.requestKey === requestKey &&
      sharedAdminRegistryState.status === 'ready'
    ) {
      return;
    }
  }

  setSharedAdminRegistryState((current) => {
    const hasResolvedItems =
      current.userKey === userKey &&
      current.providers !== null &&
      current.models !== null;

    return {
      userKey,
      requestKey,
      providers: hasResolvedItems ? current.providers : null,
      models: hasResolvedItems ? current.models : null,
      status: hasResolvedItems ? 'ready' : 'loading',
      error: null,
    };
  });

  const request = (async () => {
    try {
      const [providers, models] = await Promise.all([
        fetchAgchainModelProviders(),
        fetchAgchainModels(),
      ]);

      setSharedAdminRegistryState((current) => {
        if (current.userKey !== userKey || current.requestKey !== requestKey) {
          return current;
        }

        return {
          userKey,
          requestKey,
          providers,
          models,
          status: 'ready',
          error: null,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSharedAdminRegistryState((current) => {
        if (current.userKey !== userKey || current.requestKey !== requestKey) {
          return current;
        }

        const hasResolvedItems =
          current.providers !== null &&
          current.models !== null;

        return {
          userKey,
          requestKey,
          providers: current.providers,
          models: current.models,
          status: hasResolvedItems ? 'ready' : 'error',
          error: message,
        };
      });
    } finally {
      adminRegistryInflightByRequest.delete(requestKey);
    }
  })();

  adminRegistryInflightByRequest.set(requestKey, request);
  return request;
}

export function useAgchainAdminRegistry(): AgchainAdminRegistryState {
  const { loading, session, user } = useAuth();
  const snapshot = useSyncExternalStore(
    subscribeAdminRegistry,
    getAdminRegistrySnapshot,
    getAdminRegistrySnapshot,
  );

  const userKey = buildUserKey(user?.id ?? null);
  const requestKey = buildRequestKey(userKey, session?.access_token ?? null);

  useEffect(() => {
    if (loading) return;
    if (!requestKey || !userKey) {
      resetSharedAdminRegistryState();
      return;
    }
    void resolveSharedAdminRegistry(userKey, requestKey);
  }, [loading, requestKey, userKey]);

  const refresh = useCallback(async () => {
    if (!requestKey || !userKey) return;
    await resolveSharedAdminRegistry(userKey, requestKey, true);
  }, [requestKey, userKey]);

  if (loading) {
    return { providers: null, models: null, status: 'loading', error: null, refresh };
  }

  if (!requestKey || !userKey) {
    return { providers: null, models: null, status: 'idle', error: null, refresh };
  }

  if (snapshot.userKey !== userKey) {
    return { providers: null, models: null, status: 'loading', error: null, refresh };
  }

  if (snapshot.requestKey !== requestKey && snapshot.providers === null && snapshot.models === null) {
    return { providers: null, models: null, status: 'loading', error: null, refresh };
  }

  return {
    providers: snapshot.providers,
    models: snapshot.models,
    status: snapshot.status,
    error: snapshot.error,
    refresh,
  };
}

export function resetAgchainAdminRegistryStateForTests() {
  resetSharedAdminRegistryState();
}
