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

type UseIndexBuilderJobOptions = {
  onJobSaved?: (sourceSetId: string) => void;
};

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

  const [jobName, setJobName] = useState('Untitled index job');
  const [savedName, setSavedName] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(!isNewJob);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingKind, setDownloadingKind] = useState<string | null>(null);

  // Load existing job on mount
  useEffect(() => {
    if (isNewJob || !jobId || !pipelineKind) {
      setIsLoading(false);
      if (isNewJob) {
        pipelineSourceSet.resetSelection();
        pipelineSourceSet.setSourceSetLabel('Untitled index job');
        setHasUnsavedChanges(true);
      }
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        setIsLoading(true);
        setLoadError(null);
        const detail = await pipelineSourceSet.loadSourceSet(jobId!);
        if (!cancelled && detail) {
          setJobName(detail.label);
          setSavedName(detail.label);
          setHasUnsavedChanges(false);
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
    setHasUnsavedChanges(true);
  }, []);

  const saveDraft = useCallback(async () => {
    const label = jobName.trim() || 'Untitled index job';
    pipelineSourceSet.setSourceSetLabel(label);
    const saved = await pipelineSourceSet.persistSourceSet();
    setSavedName(label);
    setHasUnsavedChanges(false);
    if (isNewJob) {
      onJobSavedRef.current?.(saved.source_set_id);
    }
  }, [jobName, pipelineSourceSet, isNewJob]);

  const startRun = useCallback(async () => {
    if (hasUnsavedChanges || isNewJob) {
      const label = jobName.trim() || 'Untitled index job';
      pipelineSourceSet.setSourceSetLabel(label);
      const saved = await pipelineSourceSet.persistSourceSet();
      setSavedName(label);
      setHasUnsavedChanges(false);
      if (isNewJob) {
        onJobSavedRef.current?.(saved.source_set_id);
      }
      await pipelineJob.triggerJob(saved.source_set_id);
    } else {
      await pipelineJob.triggerJob();
    }
  }, [hasUnsavedChanges, isNewJob, jobName, pipelineSourceSet, pipelineJob]);

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
    setHasUnsavedChanges(true);
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
    setJobName(savedName);
    setHasUnsavedChanges(false);
  }, [savedName]);

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