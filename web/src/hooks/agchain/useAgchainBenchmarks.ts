import { useCallback, useEffect, useState } from 'react';
import {
  createAgchainBenchmark,
  fetchAgchainBenchmarks,
  type AgchainBenchmarkCreateRequest,
  type AgchainBenchmarkListRow,
  type AgchainBenchmarkListResponse,
} from '@/lib/agchainBenchmarks';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function useAgchainBenchmarks() {
  const [items, setItems] = useState<AgchainBenchmarkListRow[]>([]);
  const [pagination, setPagination] = useState<Pick<AgchainBenchmarkListResponse, 'total' | 'limit' | 'offset'>>({
    total: 0,
    limit: 50,
    offset: 0,
  });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const nextPage = await fetchAgchainBenchmarks(pagination.limit, pagination.offset);
      setItems(nextPage.items);
      setPagination({
        total: nextPage.total,
        limit: nextPage.limit,
        offset: nextPage.offset,
      });
      setError(null);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, pagination.offset]);

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
    pagination,
    loading,
    creating,
    error,
    reload: loadItems,
    createBenchmark,
  };
}
