import { useCallback, useEffect, useState } from 'react';
import {
  getDatasetDetail,
  getDatasetSampleDetail,
  getDatasetVersionMapping,
  getDatasetVersionSource,
  getDatasetVersionValidation,
  listDatasetSamples,
  listDatasetVersions,
  previewDatasetVersion,
  type AgchainDatasetDetailResponse,
  type AgchainDatasetMappingResponse,
  type AgchainDatasetSampleDetail,
  type AgchainDatasetSampleSummary,
  type AgchainDatasetSourceResponse,
  type AgchainDatasetVersionSummary,
  type AgchainDatasetVersionValidationResponse,
} from '@/lib/agchainDatasets';
import { useAgchainProjectFocus } from '@/hooks/agchain/useAgchainProjectFocus';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function useAgchainDatasetDetail(datasetId: string) {
  const { focusedProject } = useAgchainProjectFocus();
  const projectId = focusedProject?.project_id ?? null;

  const [detail, setDetail] = useState<AgchainDatasetDetailResponse | null>(null);
  const [versions, setVersions] = useState<AgchainDatasetVersionSummary[]>([]);
  const [source, setSource] = useState<AgchainDatasetSourceResponse | null>(null);
  const [mapping, setMapping] = useState<AgchainDatasetMappingResponse | null>(null);
  const [validation, setValidation] = useState<AgchainDatasetVersionValidationResponse | null>(null);
  const [samples, setSamples] = useState<AgchainDatasetSampleSummary[]>([]);
  const [selectedSample, setSelectedSample] = useState<AgchainDatasetSampleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(
    async (versionId?: string | null) => {
      if (!projectId) return;
      setLoading(true);
      try {
        const response = await getDatasetDetail(datasetId, projectId, versionId);
        setDetail(response);
        setError(null);
      } catch (nextError) {
        setError(getErrorMessage(nextError));
      } finally {
        setLoading(false);
      }
    },
    [datasetId, projectId],
  );

  const loadVersions = useCallback(async () => {
    if (!projectId) return;
    setTabLoading(true);
    try {
      const response = await listDatasetVersions(datasetId, projectId);
      setVersions(response.items);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setTabLoading(false);
    }
  }, [datasetId, projectId]);

  const loadSource = useCallback(
    async (versionId: string) => {
      setTabLoading(true);
      try {
        const response = await getDatasetVersionSource(datasetId, versionId);
        setSource(response);
      } catch (nextError) {
        setError(getErrorMessage(nextError));
      } finally {
        setTabLoading(false);
      }
    },
    [datasetId],
  );

  const loadMapping = useCallback(
    async (versionId: string) => {
      setTabLoading(true);
      try {
        const response = await getDatasetVersionMapping(datasetId, versionId);
        setMapping(response);
      } catch (nextError) {
        setError(getErrorMessage(nextError));
      } finally {
        setTabLoading(false);
      }
    },
    [datasetId],
  );

  const loadValidation = useCallback(
    async (versionId: string) => {
      setTabLoading(true);
      try {
        const response = await getDatasetVersionValidation(datasetId, versionId);
        setValidation(response);
      } catch (nextError) {
        setError(getErrorMessage(nextError));
      } finally {
        setTabLoading(false);
      }
    },
    [datasetId],
  );

  const loadSamples = useCallback(
    async (versionId: string, params?: { cursor?: string | null; search?: string | null; parse_status?: string | null }) => {
      if (!projectId) return;
      setTabLoading(true);
      try {
        const response = await listDatasetSamples(datasetId, versionId, projectId, params);
        if (params?.cursor) {
          setSamples((prev) => [...prev, ...response.items]);
        } else {
          setSamples(response.items);
        }
      } catch (nextError) {
        setError(getErrorMessage(nextError));
      } finally {
        setTabLoading(false);
      }
    },
    [datasetId, projectId],
  );

  const selectSample = useCallback(
    async (sampleId: string) => {
      const versionId = detail?.selected_version?.dataset_version_id;
      if (!versionId) return;
      setTabLoading(true);
      try {
        const response = await getDatasetSampleDetail(datasetId, versionId, sampleId);
        setSelectedSample(response);
      } catch (nextError) {
        setError(getErrorMessage(nextError));
      } finally {
        setTabLoading(false);
      }
    },
    [datasetId, detail],
  );

  const rerunPreview = useCallback(
    async (versionId: string) => {
      return previewDatasetVersion(datasetId, versionId, { refresh: true });
    },
    [datasetId],
  );

  const selectVersion = useCallback(
    async (versionId: string) => {
      await loadDetail(versionId);
      await Promise.all([
        loadSource(versionId),
        loadMapping(versionId),
        loadValidation(versionId),
        loadSamples(versionId),
      ]);
    },
    [loadDetail, loadSource, loadMapping, loadValidation, loadSamples],
  );

  useEffect(() => {
    if (projectId && datasetId) {
      loadDetail();
      loadVersions();
    }
  }, [projectId, datasetId, loadDetail, loadVersions]);

  return {
    detail,
    versions,
    source,
    mapping,
    validation,
    samples,
    selectedSample,
    loading,
    tabLoading,
    error,
    loadDetail,
    loadVersions,
    loadSource,
    loadMapping,
    loadValidation,
    loadSamples,
    selectSample,
    rerunPreview,
    selectVersion,
  };
}
