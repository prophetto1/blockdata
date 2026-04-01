import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  connectModelKey,
  createAgchainModelTarget,
  disconnectModelKey,
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
import { deriveAgchainProviderRows } from '@/lib/agchainModelProviders';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function useAgchainModels() {
  const [items, setItems] = useState<AgchainModelTarget[]>([]);
  const [providers, setProviders] = useState<AgchainProviderDefinition[]>([]);
  const [selectedProviderSlug, setSelectedProviderSlug] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AgchainModelDetail | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const providerRows = useMemo(() => deriveAgchainProviderRows(providers, items), [providers, items]);
  const selectedProvider = useMemo(
    () => providerRows.find((provider) => provider.provider_slug === selectedProviderSlug) ?? null,
    [providerRows, selectedProviderSlug],
  );
  const selectedTarget = useMemo(
    () => selectedProvider?.targets.find((target) => target.model_target_id === selectedTargetId) ?? null,
    [selectedProvider, selectedTargetId],
  );

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
    if (!selectedProvider) {
      setSelectedTargetId(null);
      setDetail(null);
      setDetailError(null);
      return;
    }

    const nextTargetId =
      selectedProvider.targets.find((target) => target.model_target_id === selectedTargetId)?.model_target_id ??
      selectedProvider.credential_anchor_target_id ??
      selectedProvider.targets[0]?.model_target_id ??
      null;

    if (nextTargetId !== selectedTargetId) {
      setSelectedTargetId(nextTargetId);
    }

    if (!nextTargetId) {
      setDetail(null);
      setDetailError(null);
    }
  }, [selectedProvider, selectedTargetId]);

  useEffect(() => {
    if (!selectedTargetId) {
      setDetail(null);
      setDetailError(null);
      return;
    }

    void loadDetail(selectedTargetId);
  }, [loadDetail, selectedTargetId]);

  const selectProvider = useCallback((providerSlug: string) => {
    setSelectedProviderSlug(providerSlug);
  }, []);

  const closeProvider = useCallback(() => {
    setSelectedProviderSlug(null);
  }, []);

  const selectTarget = useCallback((modelTargetId: string) => {
    setSelectedTargetId(modelTargetId);
  }, []);

  const createModel = useCallback(
    async (payload: AgchainModelTargetWrite) => {
      setMutating(true);
      try {
        const result = await createAgchainModelTarget(payload);
        await loadItems();
        setSelectedProviderSlug(payload.provider_slug);
        setSelectedTargetId(result.model_target_id);
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

  const updateModel = useCallback(
    async (modelTargetId: string, payload: Partial<AgchainModelTargetWrite>) => {
      setMutating(true);
      try {
        const result = await updateAgchainModelTarget(modelTargetId, payload);
        await loadItems();
        if (selectedTargetId === modelTargetId) {
          await loadDetail(modelTargetId);
        }
        setError(null);
        return result;
      } catch (nextError) {
        setError(getErrorMessage(nextError));
        throw nextError;
      } finally {
        setMutating(false);
      }
    },
    [loadDetail, loadItems, selectedTargetId],
  );

  const refreshModelHealth = useCallback(
    async (modelTargetId: string) => {
      setRefreshing(true);
      try {
        const result = await refreshAgchainModelTargetHealth(modelTargetId);
        await loadItems();
        await loadDetail(modelTargetId);
        setSelectedTargetId(modelTargetId);
        setError(null);
        return result;
      } catch (nextError) {
        setError(getErrorMessage(nextError));
        throw nextError;
      } finally {
        setRefreshing(false);
      }
    },
    [loadDetail, loadItems],
  );

  const connectKey = useCallback(
    async (apiKey: string) => {
      const anchorTargetId = selectedProvider?.credential_anchor_target_id;
      if (!anchorTargetId) {
        throw new Error('No eligible api_key target is available for this provider');
      }

      setMutating(true);
      try {
        const result = await connectModelKey(anchorTargetId, apiKey);
        await loadItems();
        await loadDetail(selectedTargetId ?? anchorTargetId);
        setError(null);
        return result;
      } catch (nextError) {
        setError(getErrorMessage(nextError));
        throw nextError;
      } finally {
        setMutating(false);
      }
    },
    [loadDetail, loadItems, selectedProvider, selectedTargetId],
  );

  const disconnectKey = useCallback(async () => {
    const anchorTargetId = selectedProvider?.credential_anchor_target_id;
    if (!anchorTargetId) {
      throw new Error('No eligible api_key target is available for this provider');
    }

    setMutating(true);
    try {
      const result = await disconnectModelKey(anchorTargetId);
      await loadItems();
      await loadDetail(selectedTargetId ?? anchorTargetId);
      setError(null);
      return result;
    } catch (nextError) {
      setError(getErrorMessage(nextError));
      throw nextError;
    } finally {
      setMutating(false);
    }
  }, [loadDetail, loadItems, selectedProvider, selectedTargetId]);

  return {
    items,
    providers,
    providerRows,
    selectedProviderSlug,
    selectedProvider,
    selectedTargetId,
    selectedTarget: detail?.model_target ?? selectedTarget,
    recentHealthChecks: detail?.recent_health_checks ?? [],
    providerDefinition: selectedProvider?.provider_definition ?? detail?.provider_definition ?? null,
    listLoading,
    providersLoading,
    detailLoading,
    mutating,
    refreshing,
    error,
    detailError,
    selectProvider,
    closeProvider,
    selectTarget,
    createModel,
    updateModel,
    refreshModelHealth,
    connectKey,
    disconnectKey,
  };
}
