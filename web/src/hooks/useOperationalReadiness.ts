import { useCallback, useMemo, useState } from 'react';
import { useOperationalReadinessSnapshotQuery } from '@/hooks/query/useOperationalReadinessSnapshotQuery';
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

function formatErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function useOperationalReadiness(): UseOperationalReadinessState {
  const readinessQuery = useOperationalReadinessSnapshotQuery();
  const [actionStates, setActionStates] = useState<Record<string, OperationalReadinessActionExecutionState>>({});
  const [checkDetails, setCheckDetails] = useState<Record<string, OperationalReadinessCheckDetailState>>({});

  const snapshot = useMemo<OperationalReadinessSnapshot | null>(() => {
    if (!readinessQuery.data?.snapshot) return null;
    return normalizeOperationalReadinessSnapshot(readinessQuery.data.snapshot);
  }, [readinessQuery.data?.snapshot]);

  const loading = readinessQuery.isPending;
  const refreshing = readinessQuery.isFetching;
  const error = readinessQuery.error ? formatErrorMessage(readinessQuery.error) : null;
  const refreshedAt = snapshot?.generated_at ?? null;
  const bootstrap = readinessQuery.data?.bootstrap ?? INITIAL_BOOTSTRAP;
  const summary = readinessQuery.error ? null : snapshot?.summary ?? null;
  const surfaces = readinessQuery.error ? [] : snapshot?.surfaces ?? [];
  const clientDiagnostics = readinessQuery.error
    ? collectClientDiagnostics()
    : readinessQuery.data?.clientDiagnostics ?? collectClientDiagnostics();

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

  const refresh = useCallback(async () => {
    const result = await readinessQuery.refetch();
    if (result.error) {
      throw result.error;
    }
  }, [readinessQuery]);

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
