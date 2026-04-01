import { useCallback, useEffect, useMemo, useState } from 'react';
import { useProjectFocus } from './useProjectFocus';
import { usePipelineJob } from './usePipelineJob';
import { usePipelineSourceSet } from './usePipelineSourceSet';
import { useResolvedPipelineService } from '@/pages/usePipelineServicesOverview';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import {
  listPipelineSourceSets,
  type PipelineSourceSetSummary,
} from '@/lib/pipelineSourceSetService';
import {
  uploadPipelineSource,
  downloadPipelineDeliverable,
  type PipelineDeliverable,
} from '@/lib/pipelineService';
import {
  deriveIndexJobStatus,
  type IndexJobStatus,
  type IndexJobViewModel,
} from '@/lib/indexJobStatus';

export type IndexBuilderTab = 'files' | 'config' | 'runs' | 'artifacts';

export function useIndexBuilder() {
  const { resolvedProjectId } = useProjectFocus();
  const { service } = useResolvedPipelineService('index-builder');
  const pipelineKind = service?.pipelineKind ?? null;

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

  const [indexJobs, setIndexJobs] = useState<IndexJobViewModel[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<IndexBuilderTab>('files');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingKind, setDownloadingKind] = useState<string | null>(null);

  const refreshList = useCallback(async () => {
    if (!resolvedProjectId || !pipelineKind) {
      setIndexJobs([]);
      return;
    }
    try {
      setIsRefreshing(true);
      const items = await listPipelineSourceSets({
        projectId: resolvedProjectId,
        pipelineKind,
      });
      setIndexJobs(
        items.map((item): IndexJobViewModel => ({
          id: item.source_set_id,
          name: item.label,
          status: deriveIndexJobStatus(
            { source_set_id: item.source_set_id, member_count: item.member_count },
            item.latest_job,
            false,
          ),
          memberCount: item.member_count,
          totalBytes: item.total_bytes,
          createdAt: item.created_at ?? null,
          updatedAt: item.updated_at ?? null,
          lastRunAt: item.latest_job?.started_at ?? null,
          latestJob: item.latest_job,
        })),
      );
    } catch {
      setIndexJobs([]);
    } finally {
      setIsRefreshing(false);
    }
  }, [resolvedProjectId, pipelineKind]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const selectJob = useCallback(async (id: string) => {
    setSelectedJobId(id);
    setHasUnsavedChanges(false);
    setActiveTab('files');
    const detail = await pipelineSourceSet.loadSourceSet(id);
    if (detail) {
      setDraftName(detail.label);
    }
    await pipelineJob.refreshLatestJob(id);
  }, [pipelineSourceSet, pipelineJob]);

  const createNewJob = useCallback(() => {
    setSelectedJobId('__new__');
    setDraftName('Untitled index job');
    setActiveTab('files');
    pipelineSourceSet.resetSelection();
    pipelineSourceSet.setSourceSetLabel('Untitled index job');
    setHasUnsavedChanges(true);
  }, [pipelineSourceSet]);
  const saveDraft = useCallback(async () => {
    pipelineSourceSet.setSourceSetLabel(draftName.trim() || 'Untitled index job');
    const saved = await pipelineSourceSet.persistSourceSet();
    await refreshList();
    setHasUnsavedChanges(false);
    if (selectedJobId === '__new__') {
      setSelectedJobId(saved.source_set_id);
    }
  }, [pipelineSourceSet, draftName, refreshList, selectedJobId]);

  const startRun = useCallback(async () => {
    if (hasUnsavedChanges || selectedJobId === '__new__') {
      pipelineSourceSet.setSourceSetLabel(draftName.trim() || 'Untitled index job');
      const saved = await pipelineSourceSet.persistSourceSet();
      await refreshList();
      setHasUnsavedChanges(false);
      if (selectedJobId === '__new__') {
        setSelectedJobId(saved.source_set_id);
      }
      await pipelineJob.triggerJob(saved.source_set_id);
    } else {
      await pipelineJob.triggerJob();
    }
    setActiveTab('runs');
  }, [hasUnsavedChanges, selectedJobId, pipelineSourceSet, pipelineJob, draftName, refreshList]);

  const retryRun = useCallback(async () => {
    await pipelineJob.triggerJob();
    setActiveTab('runs');
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
      const message = error instanceof Error && error.message.trim()
        ? error.message
        : 'Unable to download the selected deliverable.';
      setDownloadError(message);
    } finally {
      setDownloadingKind(null);
    }
  }, [pipelineJob.job]);

  const selectedJob = useMemo((): IndexJobViewModel | null => {
    if (!selectedJobId) return null;
    if (selectedJobId === '__new__') {
      return {
        id: '__new__',
        name: draftName,
        status: 'draft',
        memberCount: pipelineSourceSet.selectedSourceUids.length,
        totalBytes: 0,
        createdAt: null,
        updatedAt: null,
        lastRunAt: null,
        latestJob: null,
      };
    }
    const found = indexJobs.find((job) => job.id === selectedJobId);
    if (!found) return null;
    return {
      ...found,
      name: draftName || found.name,
      status: deriveIndexJobStatus(
        { source_set_id: found.id, member_count: found.memberCount },
        found.latestJob,
        false, // hasUnsavedChanges is passed separately to the chip, not baked into derived status
      ),
    };
  }, [selectedJobId, draftName, indexJobs, hasUnsavedChanges, pipelineSourceSet.selectedSourceUids.length]);

  return {
    // List state
    indexJobs,
    isRefreshing,
    refreshList,

    // Selection state
    selectedJobId,
    selectedJob,
    activeTab,
    setActiveTab,
    hasUnsavedChanges,
    draftName,
    setDraftName: (name: string) => {
      setDraftName(name);
      setHasUnsavedChanges(true);
    },

    // Actions
    selectJob,
    createNewJob,
    saveDraft,
    startRun,
    retryRun,
    handleUpload,
    handleDownload,

    // Download state
    downloadError,
    downloadingKind,

    // Composed hook state (pass-through for components)
    pipelineSourceSet,
    pipelineJob,
    service,
    resolvedProjectId,
  };
}
