import { useEffect, useState } from 'react';
import { platformApiFetch } from '@/lib/platformApi';
import {
  collectClientDiagnostics,
  normalizeOperationalReadinessSnapshot,
  type ClientDiagnostic,
  type OperationalReadinessSnapshot,
  type OperationalReadinessSummary,
  type OperationalReadinessSurface,
} from '@/lib/operationalReadiness';

type UseOperationalReadinessState = {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refreshedAt: string | null;
  summary: OperationalReadinessSummary;
  surfaces: OperationalReadinessSurface[];
  clientDiagnostics: ClientDiagnostic[];
  refresh: () => Promise<void>;
};

const EMPTY_SUMMARY: OperationalReadinessSummary = { ok: 0, warn: 0, fail: 0, unknown: 0 };

async function fetchOperationalReadinessSnapshot(): Promise<OperationalReadinessSnapshot> {
  const response = await platformApiFetch('/admin/runtime/readiness?surface=all');
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
  const [summary, setSummary] = useState<OperationalReadinessSummary>(EMPTY_SUMMARY);
  const [surfaces, setSurfaces] = useState<OperationalReadinessSurface[]>([]);
  const [clientDiagnostics, setClientDiagnostics] = useState<ClientDiagnostic[]>(() => collectClientDiagnostics());

  async function refresh() {
    setRefreshing(true);
    setError(null);

    try {
      const [snapshot, diagnostics] = await Promise.all([
        fetchOperationalReadinessSnapshot(),
        Promise.resolve(collectClientDiagnostics()),
      ]);

      setSummary(snapshot.summary);
      setSurfaces(snapshot.surfaces);
      setClientDiagnostics(diagnostics);
      setRefreshedAt(snapshot.generated_at);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
      setClientDiagnostics(collectClientDiagnostics());
    } finally {
      setLoading(false);
      setRefreshing(false);
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
    summary,
    surfaces,
    clientDiagnostics,
    refresh,
  };
}
