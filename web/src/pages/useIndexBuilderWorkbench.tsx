import { useCallback, useRef, useState } from 'react';
import { IconTransform, IconDownload } from '@tabler/icons-react';
import type { WorkbenchHandle, WorkbenchTab } from '@/components/workbench/Workbench';
import { normalizePaneWidths, type Pane } from '@/components/workbench/workbenchState';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import { PipelineUploadPanel } from '@/components/pipelines/PipelineUploadPanel';
import { PipelineJobStatusPanel } from '@/components/pipelines/PipelineJobStatusPanel';
import { PipelineDeliverablesPanel } from '@/components/pipelines/PipelineDeliverablesPanel';
import { PipelineSourceFilesPanel } from '@/components/pipelines/PipelineSourceFilesPanel';
import { PipelineSourceSetPanel } from '@/components/pipelines/PipelineSourceSetPanel';
import { usePipelineJob } from '@/hooks/usePipelineJob';
import { usePipelineSourceSet } from '@/hooks/usePipelineSourceSet';
import {
  uploadPipelineSource,
  downloadPipelineDeliverable,
  type PipelineDeliverable,
} from '@/lib/pipelineService';
import { useResolvedPipelineService } from './usePipelineServicesOverview';

const INDEX_BUILDER_MAIN_TAB_ID = 'index-builder-main';
const INDEX_BUILDER_RUNS_TAB_ID = 'index-builder-runs-downloads';

export const INDEX_BUILDER_TABS: WorkbenchTab[] = [
  { id: INDEX_BUILDER_MAIN_TAB_ID, label: 'Index Builder', icon: IconTransform },
  { id: INDEX_BUILDER_RUNS_TAB_ID, label: 'Runs & Downloads', icon: IconDownload },
];

export function buildIndexBuilderDefaultPanes(): Pane[] {
  return normalizePaneWidths([
    {
      id: 'pane-index-builder',
      tabs: [INDEX_BUILDER_MAIN_TAB_ID, INDEX_BUILDER_RUNS_TAB_ID],
      activeTab: INDEX_BUILDER_MAIN_TAB_ID,
      width: 100,
    },
  ]);
}

export function useIndexBuilderWorkbench() {
  const workbenchRef = useRef<WorkbenchHandle>(null);
  const { resolvedProjectId } = useProjectFocus();
  const { service } = useResolvedPipelineService('index-builder');
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingKind, setDownloadingKind] = useState<string | null>(null);
  const [processingRequested, setProcessingRequested] = useState(false);

  const pipelineSourceSet = usePipelineSourceSet({
    projectId: resolvedProjectId,
    pipelineKind: service?.pipelineKind ?? null,
  });

  const pipelineJob = usePipelineJob({
    pipelineKind: service?.pipelineKind ?? null,
    sourceSetId: pipelineSourceSet.activeSourceSetId,
  });

  useShellHeaderTitle({
    breadcrumbs: ['Pipeline Services', service?.label ?? 'Index Builder'],
  });

  const handleUpload = useCallback(async (files: File[]) => {
    if (!resolvedProjectId || !service) {
      throw new Error('Select a project before uploading a markdown source.');
    }
    for (const file of files) {
      await uploadPipelineSource({
        projectId: resolvedProjectId,
        serviceSlug: service.slug,
        file,
      });
    }
    await pipelineSourceSet.refreshSources();
  }, [pipelineSourceSet, resolvedProjectId, service]);

  const handleRun = useCallback(async () => {
    setProcessingRequested(true);
    const sourceSet = await pipelineSourceSet.persistSourceSet();
    workbenchRef.current?.addTab(INDEX_BUILDER_RUNS_TAB_ID);
    await pipelineJob.triggerJob(sourceSet.source_set_id);
  }, [pipelineJob, pipelineSourceSet]);

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
    } catch (downloadIssue) {
      const message = downloadIssue instanceof Error && downloadIssue.message.trim()
        ? downloadIssue.message
        : 'Unable to download the selected deliverable.';
      setDownloadError(message);
    } finally {
      setDownloadingKind(null);
    }
  }, [pipelineJob.job]);

  const defaultPanes = buildIndexBuilderDefaultPanes();

  function renderContent(tabId: string) {
    if (!service) return null;

    if (tabId === INDEX_BUILDER_MAIN_TAB_ID) {
      return (
        <div className="h-full overflow-auto">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-6">
            <PipelineUploadPanel
              service={service}
              projectId={resolvedProjectId}
              onUpload={handleUpload}
            />
            <PipelineSourceFilesPanel
              sources={pipelineSourceSet.sources}
              loading={pipelineSourceSet.sourcesLoading}
              error={pipelineSourceSet.sourcesError}
              selectedSourceUids={pipelineSourceSet.selectedSourceUids}
              onToggleSource={pipelineSourceSet.toggleSource}
            />
            <PipelineSourceSetPanel
              label={pipelineSourceSet.sourceSetLabel}
              selectedSources={pipelineSourceSet.selectedSources}
              projectId={resolvedProjectId}
              isRunning={pipelineSourceSet.isPersisting || pipelineJob.isTriggering}
              onLabelChange={pipelineSourceSet.setSourceSetLabel}
              onMoveUp={(sourceUid) => pipelineSourceSet.moveSource(sourceUid, -1)}
              onMoveDown={(sourceUid) => pipelineSourceSet.moveSource(sourceUid, 1)}
              onRemove={pipelineSourceSet.removeSource}
              onRun={handleRun}
            />
          </div>
        </div>
      );
    }

    if (tabId === INDEX_BUILDER_RUNS_TAB_ID) {
      return (
        <div className="h-full overflow-auto">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-6">
            <PipelineJobStatusPanel
              job={pipelineJob.job}
              sourceSetLabel={pipelineSourceSet.sourceSetLabel}
              selectedSources={pipelineSourceSet.selectedSources}
              processingRequested={processingRequested}
              loading={pipelineJob.jobLoading}
              error={pipelineSourceSet.sourceSetError ?? pipelineJob.jobError ?? pipelineJob.triggerError}
              isPolling={pipelineJob.isPolling}
            />
            <PipelineDeliverablesPanel
              job={pipelineJob.job}
              sourceSetLabel={pipelineSourceSet.sourceSetLabel}
              selectedSources={pipelineSourceSet.selectedSources}
              onDownload={handleDownload}
              downloadError={downloadError}
              downloadingKind={downloadingKind}
            />
          </div>
        </div>
      );
    }

    return null;
  }

  return {
    workbenchRef,
    defaultPanes,
    renderContent,
    saveKey: 'pipeline-services-index-builder-v2',
  };
}
