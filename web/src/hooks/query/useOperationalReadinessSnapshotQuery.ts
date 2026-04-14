import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { platformApiFetch } from '@/lib/platformApi';
import { loadOperationalReadinessWithBootstrap, type LoadOperationalReadinessWithBootstrapResult } from '@/lib/platformApiDiagnostics';
import { normalizeOperationalReadinessSnapshot, type OperationalReadinessSnapshot } from '@/lib/operationalReadiness';
import { superuserKeys } from '@/lib/queryKeys/superuserKeys';

type UseOperationalReadinessSnapshotQueryOptions = {
  enabled?: boolean;
};

async function fetchOperationalReadinessSnapshot(
  platformApiTarget?: string,
): Promise<OperationalReadinessSnapshot> {
  const response = await platformApiFetch(
    '/admin/runtime/readiness?surface=all',
    {},
    platformApiTarget ? { platformApiTarget } : {},
  );

  if (!response.ok) {
    throw new Error(`Operational readiness request failed: ${response.status}`);
  }

  const snapshot = (await response.json()) as OperationalReadinessSnapshot;

  return normalizeOperationalReadinessSnapshot(snapshot);
}

async function loadOperationalReadinessSnapshot(): Promise<LoadOperationalReadinessWithBootstrapResult> {
  return loadOperationalReadinessWithBootstrap({
    loadSnapshot: fetchOperationalReadinessSnapshot,
  });
}

export function useOperationalReadinessSnapshotQuery(
  options: UseOperationalReadinessSnapshotQueryOptions = {},
): UseQueryResult<LoadOperationalReadinessWithBootstrapResult> {
  return useQuery({
    queryKey: superuserKeys.operationalReadinessSnapshot(),
    queryFn: loadOperationalReadinessSnapshot,
    staleTime: 30_000,
    enabled: options.enabled,
  });
}
