import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { platformApiFetch } from '@/lib/platformApi';

export type AdminSurfaceAccess = {
  blockdataAdmin: boolean;
  agchainAdmin: boolean;
  superuser: boolean;
};

export type AdminSurfaceAccessStatus = 'idle' | 'loading' | 'ready' | 'error';

export type AdminSurfaceAccessState = {
  access: AdminSurfaceAccess | null;
  status: AdminSurfaceAccessStatus;
  error: string | null;
  refresh: () => Promise<void>;
};

type AccessResponse = {
  blockdata_admin?: boolean;
  agchain_admin?: boolean;
  superuser?: boolean;
};

type SharedAccessState = {
  userKey: string | null;
  requestKey: string | null;
  access: AdminSurfaceAccess | null;
  status: AdminSurfaceAccessStatus;
  error: string | null;
};

const AUTH_BYPASS_ENABLED = import.meta.env.VITE_AUTH_BYPASS === 'true';

const FULL_ACCESS: AdminSurfaceAccess = {
  blockdataAdmin: true,
  agchainAdmin: true,
  superuser: true,
};

let sharedState: SharedAccessState = AUTH_BYPASS_ENABLED
  ? {
      userKey: '__auth_bypass__',
      requestKey: '__auth_bypass__',
      access: FULL_ACCESS,
      status: 'ready',
      error: null,
    }
  : {
      userKey: null,
      requestKey: null,
      access: null,
      status: 'idle',
      error: null,
    };

const listeners = new Set<() => void>();
const inFlightByRequest = new Map<string, Promise<void>>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  listeners.forEach((listener) => listener());
}

function getSnapshot() {
  return sharedState;
}

function setSharedState(next: SharedAccessState | ((current: SharedAccessState) => SharedAccessState)) {
  sharedState = typeof next === 'function' ? next(sharedState) : next;
  emit();
}

function buildUserKey(userId: string | null) {
  return userId ?? null;
}

function buildRequestKey(userKey: string | null, accessToken: string | null) {
  if (!userKey || !accessToken) return null;
  return `${userKey}:${accessToken}`;
}

function normalizeAccess(body: AccessResponse): AdminSurfaceAccess {
  return {
    blockdataAdmin: Boolean(body.blockdata_admin),
    agchainAdmin: Boolean(body.agchain_admin),
    superuser: Boolean(body.superuser),
  };
}

function describeFailure(resp: Response, bodyText: string) {
  const trimmed = bodyText.trim();
  if (!trimmed) {
    return `Access probe failed with status ${resp.status}`;
  }
  return `Access probe failed with status ${resp.status}: ${trimmed}`;
}

function resetSharedAccessState() {
  if (AUTH_BYPASS_ENABLED) return;
  if (
    sharedState.userKey === null &&
    sharedState.requestKey === null &&
    sharedState.status === 'idle' &&
    sharedState.access === null &&
    sharedState.error === null
  ) {
    return;
  }
  inFlightByRequest.clear();
  setSharedState({
    userKey: null,
    requestKey: null,
    access: null,
    status: 'idle',
    error: null,
  });
}

async function resolveSharedAccess(userKey: string, requestKey: string, force = false): Promise<void> {
  if (AUTH_BYPASS_ENABLED) return;

  if (!force) {
    const inFlight = inFlightByRequest.get(requestKey);
    if (inFlight) return inFlight;
    if (sharedState.userKey === userKey && sharedState.requestKey === requestKey && sharedState.status === 'ready') {
      return;
    }
  }

  setSharedState((current) => {
    const hasResolvedAccess = current.userKey === userKey && current.access !== null;

    return {
      userKey,
      requestKey,
      access: hasResolvedAccess ? current.access : null,
      status: hasResolvedAccess ? 'ready' : 'loading',
      error: null,
    };
  });

  const request = (async () => {
    try {
      const resp = await platformApiFetch('/auth/access', { method: 'GET' });
      if (!resp.ok) {
        const bodyText = await resp.text().catch(() => '');
        throw new Error(describeFailure(resp, bodyText));
      }

      const body = await resp.json() as AccessResponse;
      setSharedState((current) => {
        if (current.userKey !== userKey || current.requestKey !== requestKey) return current;
        return {
          userKey,
          requestKey,
          access: normalizeAccess(body),
          status: 'ready',
          error: null,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSharedState((current) => {
        if (current.userKey !== userKey || current.requestKey !== requestKey) return current;
        return {
          userKey,
          requestKey,
          access: current.access,
          status: current.access ? 'ready' : 'error',
          error: message,
        };
      });
    } finally {
      inFlightByRequest.delete(requestKey);
    }
  })();

  inFlightByRequest.set(requestKey, request);
  return request;
}

export function useAdminSurfaceAccessState(): AdminSurfaceAccessState {
  const { loading, session, user } = useAuth();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const userId = user?.id ?? null;
  const accessToken = session?.access_token ?? null;
  const userKey = buildUserKey(userId);
  const requestKey = buildRequestKey(userKey, accessToken);

  useEffect(() => {
    if (AUTH_BYPASS_ENABLED) return;
    if (loading) return;

    if (!requestKey || !userKey) {
      resetSharedAccessState();
      return;
    }

    void resolveSharedAccess(userKey, requestKey);
  }, [loading, requestKey, userKey]);

  const refresh = useCallback(async () => {
    if (AUTH_BYPASS_ENABLED) return;
    if (!requestKey || !userKey) return;
    await resolveSharedAccess(userKey, requestKey, true);
  }, [requestKey, userKey]);

  if (AUTH_BYPASS_ENABLED) {
    return {
      access: FULL_ACCESS,
      status: 'ready',
      error: null,
      refresh,
    };
  }

  if (loading) {
    return {
      access: null,
      status: 'loading',
      error: null,
      refresh,
    };
  }

  if (!requestKey || !userKey) {
    return {
      access: null,
      status: 'idle',
      error: null,
      refresh,
    };
  }

  if (snapshot.userKey !== userKey) {
    return {
      access: null,
      status: 'loading',
      error: null,
      refresh,
    };
  }

  if (snapshot.requestKey !== requestKey && snapshot.access === null) {
    return {
      access: null,
      status: 'loading',
      error: null,
      refresh,
    };
  }

  return {
    access: snapshot.access,
    status: snapshot.status,
    error: snapshot.error,
    refresh,
  };
}

export function useAdminSurfaceAccess(): AdminSurfaceAccess | null {
  return useAdminSurfaceAccessState().access;
}
