import { useEffect, useState } from 'react';
import { platformApiFetch } from '@/lib/platformApi';
import { loadOperationalReadinessWithBootstrap } from '@/lib/platformApiDiagnostics';
import {
  collectClientDiagnostics,
  executeOperationalReadinessAction,
  getOperationalReadinessCheckDetail,
  getOperationalReadinessActionStateKey,
  type OperationalReadinessActionExecutionState,
  type OperationalReadinessCheckDetailResponse,
  type OperationalReadinessCheckDetailState,
  type OperationalReadinessAvailableAction,
  normalizeOperationalReadinessSnapshot,
  type ClientDiagnostic,
  type OperationalReadinessBootstrapState,
  type OperationalReadinessSnapshot,
  type OperationalReadinessSummary,
  type OperationalReadinessSurface,
  verifyOperationalReadinessCheck,
} from '@/lib/operationalReadiness';

type UseOperationalReadinessState = {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refreshedAt: string | null;
  bootstrap: OperationalReadinessBootstrapState;
  summary: OperationalReadinessSummary | null;
  surfaces: OperationalReadinessSurface[];
  clientDiagnostics: ClientDiagnostic[];
  actionStates: Record<string, OperationalReadinessActionExecutionState>;
  checkDetails: Record<string, OperationalReadinessCheckDetailState>;
  executeAction: (checkId: string, action: OperationalReadinessAvailableAction) => Promise<void>;
  loadCheckDetail: (checkId: string, options?: { force?: boolean }) => Promise<void>;
  verifyCheck: (checkId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const INITIAL_BOOTSTRAP: OperationalReadinessBootstrapState = {
  diagnosis_kind: 'unknown_transport_failure',
  diagnosis_title: 'Collecting bootstrap diagnostics',
  diagnosis_summary: 'Resolving transport, route, and auth state before loading readiness.',
  snapshot_available: false,
  base_mode: 'relative_proxy',
  frontend_origin: typeof window === 'undefined' ? 'unknown' : window.location.origin,
  platform_api_target: '/platform-api',
  probes: [
    {
      probe_id: 'frontend_origin',
      label: 'Frontend origin',
      status: 'pending',
      summary: 'Pending',
      detail: 'Resolving the frontend origin.',
    },
    {
      probe_id: 'platform_api_target',
      label: 'Platform API target',
      status: 'pending',
      summary: 'Pending',
      detail: 'Resolving the platform API target.',
    },
    {
      probe_id: 'health_probe',
      label: 'Health probe',
      status: 'pending',
      summary: 'Pending',
      detail: 'Waiting to probe /health.',
    },
    {
      probe_id: 'readiness_route_probe',
      label: 'Readiness route probe',
      status: 'pending',
      summary: 'Pending',
      detail: 'Waiting to probe the readiness route.',
    },
    {
      probe_id: 'auth_token_probe',
      label: 'Auth token probe',
      status: 'pending',
      summary: 'Pending',
      detail: 'Waiting to inspect local auth state.',
    },
    {
      probe_id: 'snapshot_request',
      label: 'Snapshot request',
      status: 'pending',
      summary: 'Pending',
      detail: 'Waiting to decide whether to load the authenticated snapshot.',
    },
  ],
};

async function fetchOperationalReadinessSnapshot(platformApiTarget?: string): Promise<OperationalReadinessSnapshot> {
  const response = await platformApiFetch(
    '/admin/runtime/readiness?surface=all',
    {},
    platformApiTarget ? { platformApiTarget } : {},
  );
  if (!response.ok) {
    throw new Error(`Operational readiness request failed: ${response.status}`);
  }

  const body = (await response.json()) as OperationalReadinessSnapshot;
  return normalizeOperationalReadinessSnapshot(body);
}

export function useOperationalReadiness(): UseOperationalReadinessState {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [bootstrap, setBootstrap] = useState<OperationalReadinessBootstrapState>(INITIAL_BOOTSTRAP);
  const [summary, setSummary] = useState<OperationalReadinessSummary | null>(null);
  const [surfaces, setSurfaces] = useState<OperationalReadinessSurface[]>([]);
  const [clientDiagnostics, setClientDiagnostics] = useState<ClientDiagnostic[]>(() => collectClientDiagnostics());
  const [actionStates, setActionStates] = useState<Record<string, OperationalReadinessActionExecutionState>>({});
  const [checkDetails, setCheckDetails] = useState<Record<string, OperationalReadinessCheckDetailState>>({});

  function upsertCheckDetailState(
    checkId: string,
    updater: (current: OperationalReadinessCheckDetailState | undefined) => OperationalReadinessCheckDetailState,
  ) {
    setCheckDetails((current) => ({
      ...current,
      [checkId]: updater(current[checkId]),
    }));
  }

  function storeCheckDetail(
    checkId: string,
    detail: OperationalReadinessCheckDetailResponse,
  ) {
    upsertCheckDetailState(checkId, () => ({
      loading: false,
      verifying: false,
      error: null,
      detail,
    }));
  }

  async function refresh() {
    setRefreshing(true);
    setError(null);

    try {
      const nextState = await loadOperationalReadinessWithBootstrap({
        loadSnapshot: fetchOperationalReadinessSnapshot,
      });
      const normalizedSnapshot = nextState.snapshot
        ? normalizeOperationalReadinessSnapshot(nextState.snapshot)
        : null;

      setBootstrap(nextState.bootstrap);
      setSummary(normalizedSnapshot?.summary ?? null);
      setSurfaces(normalizedSnapshot?.surfaces ?? []);
      setClientDiagnostics(nextState.clientDiagnostics);
      setRefreshedAt(normalizedSnapshot?.generated_at ?? null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
      setClientDiagnostics(collectClientDiagnostics());
      setSummary(null);
      setSurfaces([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadCheckDetail(checkId: string, options?: { force?: boolean }) {
    const currentDetailState = checkDetails[checkId];
    if (!options?.force && (currentDetailState?.loading || currentDetailState?.detail)) {
      return;
    }

    upsertCheckDetailState(checkId, (current) => ({
      loading: true,
      verifying: current?.verifying ?? false,
      error: null,
      detail: current?.detail ?? null,
    }));

    try {
      const detail = await getOperationalReadinessCheckDetail(checkId, {
        platformApiTarget: bootstrap.platform_api_target,
      });
      storeCheckDetail(checkId, detail);
    } catch (nextError) {
      upsertCheckDetailState(checkId, (current) => ({
        loading: false,
        verifying: current?.verifying ?? false,
        error: nextError instanceof Error ? nextError.message : String(nextError),
        detail: current?.detail ?? null,
      }));
    }
  }

  async function verifyCheck(checkId: string) {
    upsertCheckDetailState(checkId, (current) => ({
      loading: current?.loading ?? false,
      verifying: true,
      error: null,
      detail: current?.detail ?? null,
    }));

    try {
      const detail = await verifyOperationalReadinessCheck(checkId, {
        platformApiTarget: bootstrap.platform_api_target,
      });
      storeCheckDetail(checkId, detail);
      await refresh();
      upsertCheckDetailState(checkId, (current) => ({
        loading: false,
        verifying: false,
        error: null,
        detail: current?.detail ?? detail,
      }));
    } catch (nextError) {
      upsertCheckDetailState(checkId, (current) => ({
        loading: false,
        verifying: false,
        error: nextError instanceof Error ? nextError.message : String(nextError),
        detail: current?.detail ?? null,
      }));
    }
  }

  async function executeAction(checkId: string, action: OperationalReadinessAvailableAction) {
    const actionKey = getOperationalReadinessActionStateKey(checkId, action.action_kind);
    setError(null);
    setActionStates((current) => ({
      ...current,
      [actionKey]: {
        status: 'pending',
        message: 'Executing backend action…',
      },
    }));

    try {
      await executeOperationalReadinessAction(action, {
        confirmed: true,
        platformApiTarget: bootstrap.platform_api_target,
      });
      await refresh();
      await loadCheckDetail(checkId, { force: true });

      setActionStates((current) => ({
        ...current,
        [actionKey]: {
          status: 'success',
          message: 'Action completed and the readiness snapshot was refreshed.',
        },
      }));
    } catch (nextError) {
      setActionStates((current) => ({
        ...current,
        [actionKey]: {
          status: 'error',
          message: nextError instanceof Error ? nextError.message : String(nextError),
        },
      }));
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return {
    loading,
    refreshing,
    error,
    refreshedAt,
    bootstrap,
    summary,
    surfaces,
    clientDiagnostics,
    actionStates,
    checkDetails,
    executeAction,
    loadCheckDetail,
    verifyCheck,
    refresh,
  };
}
