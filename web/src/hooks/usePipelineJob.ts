import { useCallback, useEffect, useState } from 'react';
import {
  createPipelineJob,
  getLatestPipelineJob,
  getPipelineJob,
  type PipelineJob,
  type PipelineJobSummary,
  listPipelineSources,
  type PipelineSource,
} from '@/lib/pipelineService';

type UsePipelineJobOptions = {
  projectId: string | null;
  pipelineKind: string | null;
  pollIntervalMs?: number;
};

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

function toTrackedJob(job: PipelineJobSummary): PipelineJob {
  return {
    ...job,
    deliverables: [],
  };
}

export function usePipelineJob({
  projectId,
  pipelineKind,
  pollIntervalMs = 2000,
}: UsePipelineJobOptions) {
  const [sources, setSources] = useState<PipelineSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [selectedSourceUid, setSelectedSourceUid] = useState<string | null>(null);
  const [job, setJob] = useState<PipelineJob | null>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const refreshSources = useCallback(async () => {
    if (!projectId || !pipelineKind) {
      setSources([]);
      setSourcesError(null);
      setSelectedSourceUid(null);
      return [];
    }

    try {
      setSourcesLoading(true);
      setSourcesError(null);
      const items = await listPipelineSources({ projectId, pipelineKind });
      setSources(items);
      setSelectedSourceUid((current) => {
        if (current && items.some((item) => item.source_uid === current)) return current;
        return items[0]?.source_uid ?? null;
      });
      return items;
    } catch (error) {
      setSources([]);
      setSourcesError(toErrorMessage(error, 'Unable to load your sources.'));
      setSelectedSourceUid(null);
      return [];
    } finally {
      setSourcesLoading(false);
    }
  }, [pipelineKind, projectId]);

  useEffect(() => {
    void refreshSources();
  }, [refreshSources]);

  const refreshLatestJob = useCallback(async () => {
    if (!pipelineKind || !selectedSourceUid) {
      setJob(null);
      setJobError(null);
      return null;
    }

    try {
      setJobLoading(true);
      setJobError(null);
      const latest = await getLatestPipelineJob({
        pipelineKind,
        sourceUid: selectedSourceUid,
      });
      setJob(latest);
      return latest;
    } catch (error) {
      setJob(null);
      setJobError(toErrorMessage(error, 'Unable to load the latest pipeline job.'));
      return null;
    } finally {
      setJobLoading(false);
    }
  }, [pipelineKind, selectedSourceUid]);

  useEffect(() => {
    void refreshLatestJob();
  }, [refreshLatestJob]);

  useEffect(() => {
    if (!job?.job_id) {
      setIsPolling(false);
      return undefined;
    }
    if (job.status === 'complete' || job.status === 'failed') {
      setIsPolling(false);
      return undefined;
    }

    setIsPolling(true);
    const intervalId = window.setInterval(() => {
      void getPipelineJob({ jobId: job.job_id })
        .then((nextJob) => {
          setJob(nextJob);
          setJobError(null);
          if (nextJob.status === 'complete' || nextJob.status === 'failed') {
            setIsPolling(false);
          }
        })
        .catch((error) => {
          setJobError(toErrorMessage(error, 'Unable to refresh pipeline job status.'));
        });
    }, pollIntervalMs);

    return () => {
      window.clearInterval(intervalId);
      setIsPolling(false);
    };
  }, [job?.job_id, job?.status, pollIntervalMs]);

  const triggerJob = useCallback(async () => {
    if (!pipelineKind || !selectedSourceUid) return;

    try {
      setIsTriggering(true);
      setTriggerError(null);
      const created = await createPipelineJob({
        pipelineKind,
        sourceUid: selectedSourceUid,
      });
      setJob(toTrackedJob(created));
    } catch (error) {
      setTriggerError(toErrorMessage(error, 'Unable to start the pipeline job.'));
    } finally {
      setIsTriggering(false);
    }
  }, [pipelineKind, selectedSourceUid]);

  return {
    sources,
    sourcesLoading,
    sourcesError,
    selectedSourceUid,
    setSelectedSourceUid,
    job,
    jobLoading,
    jobError,
    triggerError,
    isTriggering,
    isPolling,
    refreshSources,
    refreshLatestJob,
    triggerJob,
  };
}
