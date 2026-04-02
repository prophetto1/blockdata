import { useCallback, useEffect, useState } from 'react';
import {
  listDatasets,
  type AgchainDatasetListRow,
} from '@/lib/agchainDatasets';
import { useAgchainProjectFocus } from '@/hooks/agchain/useAgchainProjectFocus';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function useAgchainDatasets() {
  const { focusedProject } = useAgchainProjectFocus();
  const projectId = focusedProject?.project_id ?? null;

  const [items, setItems] = useState<AgchainDatasetListRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const loadDatasets = useCallback(
    async (params?: { cursor?: string | null; search?: string | null; source_type?: string | null; validation_status?: string | null }) => {
      if (!projectId) return;
      setLoading(true);
      try {
        const response = await listDatasets(projectId, params);
        if (params?.cursor) {
          setItems((prev) => [...prev, ...response.items]);
        } else {
          setItems(response.items);
        }
        setNextCursor(response.next_cursor);
        setError(null);
      } catch (nextError) {
        setError(getErrorMessage(nextError));
      } finally {
        setLoading(false);
      }
    },
    [projectId],
  );

  const refresh = useCallback(() => {
    return loadDatasets();
  }, [loadDatasets]);

  useEffect(() => {
    if (projectId) {
      loadDatasets();
    } else {
      setItems([]);
      setNextCursor(null);
    }
  }, [projectId, loadDatasets]);

  return { items, loading, error, nextCursor, refresh };
}
