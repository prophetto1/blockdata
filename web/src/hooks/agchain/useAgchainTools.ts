import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAgchainProjectFocus } from '@/hooks/agchain/useAgchainProjectFocus';
import {
  archiveAgchainTool,
  createAgchainTool,
  fetchAgchainToolDetail,
  fetchAgchainToolsBootstrap,
  listAgchainTools,
  previewAgchainTool,
  publishAgchainToolVersion,
  updateAgchainToolMetadata,
  updateAgchainToolVersion,
  type AgchainToolBootstrapResponse,
  type AgchainToolDetailResponse,
  type AgchainToolMutationPayload,
  type AgchainToolRegistryRow,
} from '@/lib/agchainTools';
import { listSecrets, type SecretMetadata } from '@/lib/secretsApi';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

function getToolSelectionKey(row: AgchainToolRegistryRow | null) {
  if (!row) {
    return null;
  }
  return row.tool_id ?? row.tool_ref ?? null;
}

export function useAgchainTools() {
  const { focusedProject, loading: projectLoading } = useAgchainProjectFocus();
  const projectId = focusedProject?.project_id ?? null;

  const [items, setItems] = useState<AgchainToolRegistryRow[]>([]);
  const [bootstrap, setBootstrap] = useState<AgchainToolBootstrapResponse | null>(null);
  const [secrets, setSecrets] = useState<SecretMetadata[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedToolKey, setSelectedToolKey] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<AgchainToolDetailResponse | null>(null);

  const sourceKindOptions = bootstrap?.source_kind_options ?? ['custom', 'bridged', 'mcp_server'];
  const selectedRow = useMemo(
    () => items.find((row) => getToolSelectionKey(row) === selectedToolKey) ?? null,
    [items, selectedToolKey],
  );

  const loadResources = useCallback(async () => {
    if (!projectId) {
      return;
    }

    setListLoading(true);
    try {
      const [toolList, nextBootstrap, nextSecrets] = await Promise.all([
        listAgchainTools(projectId),
        fetchAgchainToolsBootstrap(projectId),
        listSecrets(),
      ]);
      setItems(toolList.items);
      setBootstrap(nextBootstrap);
      setSecrets(nextSecrets);
      setError(null);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setListLoading(false);
    }
  }, [projectId]);

  const selectTool = useCallback((row: AgchainToolRegistryRow | null) => {
    setSelectedToolKey(getToolSelectionKey(row));
  }, []);

  const closeInspector = useCallback(() => {
    setSelectedToolKey(null);
  }, []);

  useEffect(() => {
    if (!projectId) {
      setItems([]);
      setBootstrap(null);
      setSecrets([]);
      setSelectedToolKey(null);
      setSelectedDetail(null);
      setError(null);
      setDetailError(null);
      return;
    }

    void loadResources();
  }, [loadResources, projectId]);

  useEffect(() => {
    const selectedToolId = selectedRow?.tool_id;

    if (!selectedToolId || !projectId) {
      setSelectedDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    let cancelled = false;

    async function loadDetail() {
      setDetailLoading(true);
      try {
        const detail = await fetchAgchainToolDetail(projectId!, selectedToolId!);
        if (!cancelled) {
          setSelectedDetail(detail);
          setDetailError(null);
        }
      } catch (nextError) {
        if (!cancelled) {
          setSelectedDetail(null);
          setDetailError(getErrorMessage(nextError));
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [projectId, selectedRow?.tool_id]);

  const previewDraft = useCallback(
    async (payload: AgchainToolMutationPayload) => {
      if (!projectId) {
        throw new Error('Choose a project first');
      }

      return previewAgchainTool(projectId, payload.sourceKind, {
        version_label: payload.versionLabel,
        parallel_calls_allowed: payload.parallelCallsAllowed,
        tool_config_jsonb: payload.toolConfigJsonb,
      });
    },
    [projectId],
  );

  const createTool = useCallback(
    async (payload: AgchainToolMutationPayload) => {
      if (!projectId) {
        throw new Error('Choose a project first');
      }

      setMutating(true);
      try {
        const preview = await previewDraft(payload);
        if (!preview.validation.ok) {
          throw new Error(preview.validation.errors.join(', ') || 'Tool preview failed');
        }

        const result = await createAgchainTool(projectId, payload);
        await loadResources();
        setError(null);
        return result;
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setError(message);
        throw new Error(message);
      } finally {
        setMutating(false);
      }
    },
    [loadResources, previewDraft, projectId],
  );

  const updateSelectedTool = useCallback(
    async (payload: AgchainToolMutationPayload) => {
      if (!projectId || !selectedRow?.tool_id) {
        throw new Error('Select an authored tool first');
      }
      const versionId =
        selectedDetail?.latest_version?.tool_version_id ?? selectedDetail?.versions[0]?.tool_version_id ?? null;
      if (!versionId) {
        throw new Error('The selected tool does not have an editable version');
      }

      setMutating(true);
      try {
        const preview = await previewDraft(payload);
        if (!preview.validation.ok) {
          throw new Error(preview.validation.errors.join(', ') || 'Tool preview failed');
        }

        await updateAgchainToolMetadata(projectId, selectedRow.tool_id, payload);
        await updateAgchainToolVersion(projectId, selectedRow.tool_id, versionId, payload);
        await loadResources();
        setError(null);
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setError(message);
        throw new Error(message);
      } finally {
        setMutating(false);
      }
    },
    [loadResources, previewDraft, projectId, selectedDetail, selectedRow],
  );

  const publishSelectedTool = useCallback(async () => {
    if (!projectId || !selectedRow?.tool_id) {
      throw new Error('Select an authored tool first');
    }
    const versionId =
      selectedDetail?.latest_version?.tool_version_id ?? selectedDetail?.versions[0]?.tool_version_id ?? null;
    if (!versionId) {
      throw new Error('The selected tool does not have a publishable version');
    }

    setMutating(true);
    try {
      await publishAgchainToolVersion(projectId, selectedRow.tool_id, versionId);
      await loadResources();
      setError(null);
    } catch (nextError) {
      const message = getErrorMessage(nextError);
      setError(message);
      throw new Error(message);
    } finally {
      setMutating(false);
    }
  }, [loadResources, projectId, selectedDetail, selectedRow]);

  const archiveSelectedTool = useCallback(async () => {
    if (!projectId || !selectedRow?.tool_id) {
      throw new Error('Select an authored tool first');
    }

    setMutating(true);
    try {
      await archiveAgchainTool(projectId, selectedRow.tool_id);
      setSelectedToolKey(null);
      await loadResources();
      setError(null);
    } catch (nextError) {
      const message = getErrorMessage(nextError);
      setError(message);
      throw new Error(message);
    } finally {
      setMutating(false);
    }
  }, [loadResources, projectId, selectedRow]);

  return {
    focusedProject,
    projectLoading,
    items,
    bootstrap,
    secrets,
    listLoading,
    detailLoading,
    mutating,
    error,
    detailError,
    sourceKindOptions,
    selectedToolKey,
    selectedRow,
    selectedDetail,
    selectTool,
    closeInspector,
    createTool,
    updateSelectedTool,
    publishSelectedTool,
    archiveSelectedTool,
    previewDraft,
  };
}
