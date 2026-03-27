import { useCallback, useEffect, useState } from 'react';
import {
  createAgchainBenchmark,
  fetchAgchainBenchmarks,
  type AgchainBenchmarkCreateRequest,
  type AgchainBenchmarkListRow,
} from '@/lib/agchainBenchmarks';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function useAgchainBenchmarks() {
  const [items, setItems] = useState<AgchainBenchmarkListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const nextItems = await fetchAgchainBenchmarks();
      setItems(nextItems);
      setError(null);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const createBenchmark = useCallback(
    async (payload: AgchainBenchmarkCreateRequest) => {
      setCreating(true);
      try {
        const result = await createAgchainBenchmark(payload);
        await loadItems();
        setError(null);
        return result;
      } catch (nextError) {
        setError(getErrorMessage(nextError));
        throw nextError;
      } finally {
        setCreating(false);
      }
    },
    [loadItems],
  );

  return {
    items,
    loading,
    creating,
    error,
    reload: loadItems,
    createBenchmark,
  };
}
