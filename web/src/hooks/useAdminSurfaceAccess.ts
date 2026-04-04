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
  sessionKey: string | null;
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
      sessionKey: '__auth_bypass__',
      access: FULL_ACCESS,
      status: 'ready',
      error: null,
    }
  : {
      sessionKey: null,
      access: null,
      status: 'idle',
      error: null,
    };

const listeners = new Set<() => void>();
const inFlightBySession = new Map<string, Promise<void>>();

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

function buildSessionKey(userId: string | null, accessToken: string | null) {
  if (!userId || !accessToken) return null;
  return `${userId}:${accessToken}`;
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
  if (sharedState.sessionKey === null && sharedState.status === 'idle' && sharedState.access === null && sharedState.error === null) {
    return;
  }
  inFlightBySession.clear();
  setSharedState({
    sessionKey: null,
    access: null,
    status: 'idle',
    error: null,
  });
}

async function resolveSharedAccess(sessionKey: string, force = false): Promise<void> {
  if (AUTH_BYPASS_ENABLED) return;

  if (!force) {
    const inFlight = inFlightBySession.get(sessionKey);
    if (inFlight) return inFlight;
    if (sharedState.sessionKey === sessionKey && sharedState.status === 'ready') return;
  }

  setSharedState((current) => {
    if (
      !force &&
      current.sessionKey === sessionKey &&
      (current.status === 'loading' || current.status === 'ready')
    ) {
      return current;
    }

    return {
      sessionKey,
      access: current.sessionKey === sessionKey ? current.access : null,
      status: 'loading',
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
        if (current.sessionKey !== sessionKey) return current;
        return {
          sessionKey,
          access: normalizeAccess(body),
          status: 'ready',
          error: null,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSharedState((current) => {
        if (current.sessionKey !== sessionKey) return current;
        return {
          sessionKey,
          access: current.access,
          status: 'error',
          error: message,
        };
      });
    } finally {
      inFlightBySession.delete(sessionKey);
    }
  })();

  inFlightBySession.set(sessionKey, request);
  return request;
}

export function useAdminSurfaceAccessState(): AdminSurfaceAccessState {
  const { loading, session, user } = useAuth();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const userId = user?.id ?? null;
  const accessToken = session?.access_token ?? null;
  const sessionKey = buildSessionKey(userId, accessToken);

  useEffect(() => {
    if (AUTH_BYPASS_ENABLED) return;
    if (loading) return;

    if (!sessionKey) {
      resetSharedAccessState();
      return;
    }

    void resolveSharedAccess(sessionKey);
  }, [loading, sessionKey]);

  const refresh = useCallback(async () => {
    if (AUTH_BYPASS_ENABLED) return;
    if (!sessionKey) return;
    await resolveSharedAccess(sessionKey, true);
  }, [sessionKey]);

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

  if (!sessionKey) {
    return {
      access: null,
      status: 'idle',
      error: null,
      refresh,
    };
  }

  if (snapshot.sessionKey !== sessionKey) {
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
