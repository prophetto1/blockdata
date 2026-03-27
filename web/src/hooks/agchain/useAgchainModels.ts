import { useCallback, useEffect, useState } from 'react';
import {
  createAgchainModelTarget,
  fetchAgchainModelDetail,
  fetchAgchainModelProviders,
  fetchAgchainModels,
  refreshAgchainModelTargetHealth,
  type AgchainModelDetail,
  type AgchainModelTarget,
  type AgchainModelTargetWrite,
  type AgchainProviderDefinition,
  updateAgchainModelTarget,
} from '@/lib/agchainModels';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function useAgchainModels() {
  const [items, setItems] = useState<AgchainModelTarget[]>([]);
  const [providers, setProviders] = useState<AgchainProviderDefinition[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AgchainModelDetail | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setListLoading(true);
    try {
      const nextItems = await fetchAgchainModels();
      setItems(nextItems);
      setError(null);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadProviders = useCallback(async () => {
    setProvidersLoading(true);
    try {
      const nextProviders = await fetchAgchainModelProviders();
      setProviders(nextProviders);
      setError(null);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setProvidersLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (modelTargetId: string) => {
    setDetailLoading(true);
    try {
      const nextDetail = await fetchAgchainModelDetail(modelTargetId);
      setDetail(nextDetail);
      setDetailError(null);
    } catch (nextError) {
      setDetail(null);
      setDetailError(getErrorMessage(nextError));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
    void loadProviders();
  }, [loadItems, loadProviders]);

  useEffect(() => {
    if (!selectedModelId) {
      setDetail(null);
      setDetailError(null);
      return;
    }

    void loadDetail(selectedModelId);
  }, [loadDetail, selectedModelId]);

  const selectModel = useCallback((modelTargetId: string) => {
    setSelectedModelId(modelTargetId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedModelId(null);
  }, []);

  const createModel = useCallback(
    async (payload: AgchainModelTargetWrite) => {
      setMutating(true);
      try {
        const result = await createAgchainModelTarget(payload);
        await loadItems();
        setSelectedModelId(result.model_target_id);
        setError(null);
        return result;
      } catch (nextError) {
        setError(getErrorMessage(nextError));
        throw nextError;
      } finally {
        setMutating(false);
      }
    },
    [loadItems],
  );

  const updateSelectedModel = useCallback(
    async (payload: Partial<AgchainModelTargetWrite>) => {
      if (!selectedModelId) {
        throw new Error('No model target selected');
      }

      setMutating(true);
      try {
        const result = await updateAgchainModelTarget(selectedModelId, payload);
        await loadItems();
        await loadDetail(selectedModelId);
        setError(null);
        return result;
      } catch (nextError) {
        setError(getErrorMessage(nextError));
        throw nextError;
      } finally {
        setMutating(false);
      }
    },
    [loadDetail, loadItems, selectedModelId],
  );

  const refreshSelectedModelHealth = useCallback(async () => {
    if (!selectedModelId) {
      throw new Error('No model target selected');
    }

    setRefreshing(true);
    try {
      const result = await refreshAgchainModelTargetHealth(selectedModelId);
      await loadItems();
      await loadDetail(selectedModelId);
      setError(null);
      return result;
    } catch (nextError) {
      setError(getErrorMessage(nextError));
      throw nextError;
    } finally {
      setRefreshing(false);
    }
  }, [loadDetail, loadItems, selectedModelId]);

  return {
    items,
    providers,
    selectedModelId,
    selectedModel: detail?.model_target ?? null,
    recentHealthChecks: detail?.recent_health_checks ?? [],
    providerDefinition: detail?.provider_definition ?? null,
    listLoading,
    providersLoading,
    detailLoading,
    mutating,
    refreshing,
    error,
    detailError,
    selectModel,
    clearSelection,
    createModel,
    updateSelectedModel,
    refreshSelectedModelHealth,
  };
}
