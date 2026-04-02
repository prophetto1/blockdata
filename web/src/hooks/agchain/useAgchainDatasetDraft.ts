import { useCallback, useEffect, useRef, useState } from 'react';
import {
  commitDatasetVersionDraft,
  createDatasetVersionDraft,
  getDatasetVersionDraft,
  getOperationStatus,
  previewDatasetVersionDraft,
  updateDatasetVersionDraft,
  type AgchainDatasetDraft,
  type AgchainDatasetDraftWriteRequest,
  type AgchainDatasetSampleSummary,
  type AgchainDatasetValidationSummary,
} from '@/lib/agchainDatasets';
import type { AgchainOperationStatus } from '@/lib/agchainRuns';
import { useAgchainProjectFocus } from '@/hooks/agchain/useAgchainProjectFocus';

type JsonObject = Record<string, unknown>;

const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_ATTEMPTS = 60;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

function isOperationStatus(response: unknown): response is AgchainOperationStatus {
  return typeof response === 'object' && response !== null && 'operation_id' in response;
}

export function useAgchainDatasetDraft(datasetId: string, draftId: string | null) {
  const { focusedProject } = useAgchainProjectFocus();
  const projectId = focusedProject?.project_id ?? null;

  const [draft, setDraft] = useState<AgchainDatasetDraft | null>(null);
  const [previewSamples, setPreviewSamples] = useState<AgchainDatasetSampleSummary[]>([]);
  const [previewValidation, setPreviewValidation] = useState<AgchainDatasetValidationSummary | null>(null);
  const [diffSummary, setDiffSummary] = useState<JsonObject | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [operationStatus, setOperationStatus] = useState<AgchainOperationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    attemptRef.current = 0;
  }, []);

  const startPolling = useCallback(
    (operationId: string, onTerminal: (status: AgchainOperationStatus) => void) => {
      stopPolling();
      attemptRef.current = 0;
      pollRef.current = setInterval(async () => {
        attemptRef.current += 1;
        if (attemptRef.current > MAX_POLL_ATTEMPTS) {
          stopPolling();
          setError('Operation timed out after maximum polling attempts');
          setPreviewing(false);
          setCommitting(false);
          return;
        }
        try {
          const status = await getOperationStatus(operationId);
          setOperationStatus(status);
          if (status.status === 'succeeded' || status.status === 'failed' || status.status === 'cancelled') {
            stopPolling();
            onTerminal(status);
          }
        } catch (pollError) {
          stopPolling();
          setError(getErrorMessage(pollError));
          setPreviewing(false);
          setCommitting(false);
        }
      }, POLL_INTERVAL_MS);
    },
    [stopPolling],
  );

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const createDraft = useCallback(
    async (baseVersionId: string | null): Promise<string | null> => {
      if (!projectId) return null;
      setLoading(true);
      try {
        const response = await createDatasetVersionDraft(datasetId, {
          project_id: projectId,
          base_version_id: baseVersionId,
        });
        setDraft(response.draft);
        setError(null);
        return response.draft.draft_id;
      } catch (nextError) {
        setError(getErrorMessage(nextError));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [datasetId, projectId],
  );

  const loadDraft = useCallback(async () => {
    if (!draftId) return;
    setLoading(true);
    try {
      const response = await getDatasetVersionDraft(datasetId, draftId);
      setDraft(response);
      setError(null);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [datasetId, draftId]);

  const updateDraft = useCallback(
    async (payload: Partial<AgchainDatasetDraftWriteRequest>) => {
      if (!draftId) return;
      setLoading(true);
      try {
        const response = await updateDatasetVersionDraft(datasetId, draftId, payload);
        setDraft(response);
        setError(null);
      } catch (nextError) {
        setError(getErrorMessage(nextError));
      } finally {
        setLoading(false);
      }
    },
    [datasetId, draftId],
  );

  const previewDraft = useCallback(
    async (payload: Partial<AgchainDatasetDraftWriteRequest>) => {
      if (!draftId) return;
      setPreviewing(true);
      setOperationStatus(null);
      try {
        const response = await previewDatasetVersionDraft(datasetId, draftId, payload);
        if (isOperationStatus(response)) {
          setOperationStatus(response);
          startPolling(response.operation_id, (terminal) => {
            setPreviewing(false);
            if (terminal.status === 'failed') {
              setError('Preview operation failed');
            }
          });
        } else {
          setPreviewSamples(response.preview_samples);
          setPreviewValidation(response.validation_summary);
          setDiffSummary(response.diff_summary);
          setPreviewing(false);
        }
        setError(null);
      } catch (nextError) {
        setError(getErrorMessage(nextError));
        setPreviewing(false);
      }
    },
    [datasetId, draftId, startPolling],
  );

  const commitDraft = useCallback(
    async (message?: string | null) => {
      if (!draftId) return null;
      setCommitting(true);
      setOperationStatus(null);
      try {
        const response = await commitDatasetVersionDraft(datasetId, draftId, {
          commit_message: message ?? null,
        });
        if (isOperationStatus(response)) {
          setOperationStatus(response);
          startPolling(response.operation_id, (terminal) => {
            setCommitting(false);
            if (terminal.status === 'failed') {
              setError('Commit operation failed');
            }
          });
          return null;
        } else {
          setCommitting(false);
          setError(null);
          return response;
        }
      } catch (nextError) {
        setError(getErrorMessage(nextError));
        setCommitting(false);
        return null;
      }
    },
    [datasetId, draftId, startPolling],
  );

  useEffect(() => {
    if (draftId) {
      loadDraft();
    }
  }, [draftId, loadDraft]);

  return {
    draft,
    previewSamples,
    previewValidation,
    diffSummary,
    loading,
    previewing,
    committing,
    operationStatus,
    error,
    createDraft,
    loadDraft,
    updateDraft,
    previewDraft,
    commitDraft,
  };
}
