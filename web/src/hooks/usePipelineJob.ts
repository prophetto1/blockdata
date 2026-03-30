import { useCallback, useEffect, useState } from 'react';
import {
  createPipelineJob,
  getLatestPipelineJob,
  getPipelineJob,
  type PipelineJob,
  type PipelineJobSummary,
} from '@/lib/pipelineService';

type UsePipelineJobOptions = {
  pipelineKind: string | null;
  sourceSetId: string | null;
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
  pipelineKind,
  sourceSetId,
  pollIntervalMs = 2000,
}: UsePipelineJobOptions) {
  const [job, setJob] = useState<PipelineJob | null>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const refreshLatestJob = useCallback(async (sourceSetIdOverride?: string | null) => {
    const resolvedSourceSetId = sourceSetIdOverride ?? sourceSetId;
    if (!pipelineKind || !resolvedSourceSetId) {
      setJob(null);
      setJobError(null);
      return null;
    }

    try {
      setJobLoading(true);
      setJobError(null);
      const latest = await getLatestPipelineJob({
        pipelineKind,
        sourceSetId: resolvedSourceSetId,
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
  }, [pipelineKind, sourceSetId]);

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

  const triggerJob = useCallback(async (sourceSetIdOverride?: string | null) => {
    const resolvedSourceSetId = sourceSetIdOverride ?? sourceSetId;
    if (!pipelineKind || !resolvedSourceSetId) return;

    try {
      setIsTriggering(true);
      setTriggerError(null);
      const created = await createPipelineJob({
        pipelineKind,
        sourceSetId: resolvedSourceSetId,
      });
      setJob(toTrackedJob(created));
    } catch (error) {
      setTriggerError(toErrorMessage(error, 'Unable to start the pipeline job.'));
    } finally {
      setIsTriggering(false);
    }
  }, [pipelineKind, sourceSetId]);

  return {
    job,
    jobLoading,
    jobError,
    triggerError,
    isTriggering,
    isPolling,
    refreshLatestJob,
    triggerJob,
  };
}
