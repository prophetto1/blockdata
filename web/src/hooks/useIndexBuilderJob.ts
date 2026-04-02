import { useCallback, useEffect, useRef, useState } from 'react';
import { useProjectFocus } from './useProjectFocus';
import { useResolvedPipelineService } from '@/pages/usePipelineServicesOverview';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { usePipelineSourceSet } from './usePipelineSourceSet';
import { usePipelineJob } from './usePipelineJob';
import {
  uploadPipelineSource,
  downloadPipelineDeliverable,
  type PipelineDeliverable,
} from '@/lib/pipelineService';
import { deriveIndexJobStatus, type IndexJobStatus } from '@/lib/indexJobStatus';
import type { PipelineSourceSet } from '@/lib/pipelineSourceSetService';

type UseIndexBuilderJobOptions = {
  onJobSaved?: (sourceSetId: string) => void;
};

type SavedJobSnapshot = {
  jobName: string;
  sourceSetId: string | null;
  selectedSourceUids: string[];
};

const DEFAULT_JOB_NAME = 'Untitled index job';

function orderSourceUids(sourceSet: PipelineSourceSet) {
  return sourceSet.items
    .slice()
    .sort((left, right) => left.source_order - right.source_order)
    .map((item) => item.source_uid);
}

function buildSavedSnapshot(sourceSet: PipelineSourceSet): SavedJobSnapshot {
  return {
    jobName: sourceSet.label,
    sourceSetId: sourceSet.source_set_id,
    selectedSourceUids: orderSourceUids(sourceSet),
  };
}

function sameSelection(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

export function useIndexBuilderJob(jobId: string | null, options?: UseIndexBuilderJobOptions) {
  const isNewJob = jobId === 'new';
  const { resolvedProjectId } = useProjectFocus();
  const { service } = useResolvedPipelineService('index-builder');
  const pipelineKind = service?.pipelineKind ?? null;
  const onJobSavedRef = useRef(options?.onJobSaved);
  onJobSavedRef.current = options?.onJobSaved;

  useShellHeaderTitle({
    breadcrumbs: ['Pipeline Services', service?.label ?? 'Index Builder'],
  });

  const pipelineSourceSet = usePipelineSourceSet({
    projectId: resolvedProjectId,
    pipelineKind,
  });

  const pipelineJob = usePipelineJob({
    pipelineKind,
    sourceSetId: pipelineSourceSet.activeSourceSetId,
  });

  const [jobName, setJobName] = useState(DEFAULT_JOB_NAME);
  const [savedSnapshot, setSavedSnapshot] = useState<SavedJobSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(!isNewJob);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingKind, setDownloadingKind] = useState<string | null>(null);

  // Load existing job on mount
  useEffect(() => {
    if (isNewJob || !jobId || !pipelineKind) {
      setIsLoading(false);
      setLoadError(null);
      if (isNewJob) {
        pipelineSourceSet.resetSelection();
        pipelineSourceSet.setSourceSetLabel(DEFAULT_JOB_NAME);
        setJobName(DEFAULT_JOB_NAME);
        setSavedSnapshot(null);
      }
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        setIsLoading(true);
        setLoadError(null);
        const detail = await pipelineSourceSet.loadSourceSet(jobId!);
        if (!detail) {
          if (!cancelled) {
            setLoadError('Unable to load this job.');
            setSavedSnapshot(null);
          }
          return;
        }
        if (!cancelled) {
          const nextSnapshot = buildSavedSnapshot(detail);
          setJobName(nextSnapshot.jobName);
          setSavedSnapshot(nextSnapshot);
        }
        await pipelineJob.refreshLatestJob(jobId);
      } catch {
        if (!cancelled) setLoadError('Unable to load this job.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [jobId, pipelineKind]);

  const hasUnsavedChanges = isNewJob
    ? true
    : savedSnapshot
      ? (
        jobName !== savedSnapshot.jobName
        || pipelineSourceSet.activeSourceSetId !== savedSnapshot.sourceSetId
        || !sameSelection(pipelineSourceSet.selectedSourceUids, savedSnapshot.selectedSourceUids)
      )
      : false;

  // Derive status
  const status: IndexJobStatus = deriveIndexJobStatus(
    isNewJob
      ? { source_set_id: null, member_count: pipelineSourceSet.selectedSourceUids.length }
      : { source_set_id: jobId, member_count: pipelineSourceSet.selectedSourceUids.length },
    pipelineJob.job ? { status: pipelineJob.job.status } : null,
    hasUnsavedChanges,
  );

  const updateName = useCallback((name: string) => {
    setJobName(name);
    pipelineSourceSet.setSourceSetLabel(name);
  }, [pipelineSourceSet]);

  const persistCurrentSourceSet = useCallback(async () => {
    const saved = await pipelineSourceSet.persistSourceSet();
    const nextSnapshot = buildSavedSnapshot(saved);
    setJobName(nextSnapshot.jobName);
    setSavedSnapshot(nextSnapshot);
    return saved;
  }, [pipelineSourceSet]);

  const saveDraft = useCallback(async () => {
    const saved = await persistCurrentSourceSet();
    if (isNewJob) {
      onJobSavedRef.current?.(saved.source_set_id);
    }
  }, [isNewJob, persistCurrentSourceSet]);

  const startRun = useCallback(async () => {
    if (hasUnsavedChanges || isNewJob) {
      const saved = await persistCurrentSourceSet();
      if (isNewJob) {
        onJobSavedRef.current?.(saved.source_set_id);
      }
      await pipelineJob.triggerJob(saved.source_set_id);
    } else {
      await pipelineJob.triggerJob();
    }
  }, [hasUnsavedChanges, isNewJob, persistCurrentSourceSet, pipelineJob]);

  const retryRun = useCallback(async () => {
    await pipelineJob.triggerJob();
  }, [pipelineJob]);

  const handleUpload = useCallback(async (files: File[]) => {
    if (!resolvedProjectId || !service) return;
    for (const file of files) {
      await uploadPipelineSource({
        projectId: resolvedProjectId,
        serviceSlug: service.slug,
        file,
      });
    }
    await pipelineSourceSet.refreshSources();
  }, [resolvedProjectId, service, pipelineSourceSet]);

  const handleDownload = useCallback(async (deliverable: PipelineDeliverable) => {
    if (!pipelineJob.job) return;
    try {
      setDownloadingKind(deliverable.deliverable_kind);
      setDownloadError(null);
      const blob = await downloadPipelineDeliverable({
        jobId: pipelineJob.job.job_id,
        deliverableKind: deliverable.deliverable_kind,
      });
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = deliverable.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Download failed.');
    } finally {
      setDownloadingKind(null);
    }
  }, [pipelineJob.job]);

  const discardChanges = useCallback(() => {
    if (!savedSnapshot) return;
    setJobName(savedSnapshot.jobName);
    pipelineSourceSet.setSourceSetLabel(savedSnapshot.jobName);
    pipelineSourceSet.replaceSelection(savedSnapshot.selectedSourceUids);
  }, [pipelineSourceSet, savedSnapshot]);

  return {
    // State
    jobName,
    status,
    hasUnsavedChanges,
    isNewJob,
    isLoading,
    loadError,
    downloadError,
    downloadingKind,

    // Actions
    updateName,
    saveDraft,
    startRun,
    retryRun,
    handleUpload,
    handleDownload,
    discardChanges,

    // Composed state (pass-through)
    pipelineSourceSet,
    pipelineJob,
    service,
    resolvedProjectId,
  };
}
