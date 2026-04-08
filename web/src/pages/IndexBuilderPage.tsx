import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { useIndexBuilderList } from '@/hooks/useIndexBuilderList';
import { useIndexBuilderJob } from '@/hooks/useIndexBuilderJob';
import { IndexBuilderHeader } from '@/components/pipelines/IndexBuilderHeader';
import { IndexJobsList } from '@/components/pipelines/IndexJobsList';
import { IndexJobFilesTab } from '@/components/pipelines/IndexJobFilesTab';
import { IndexJobConfigTab } from '@/components/pipelines/IndexJobConfigTab';
import { IndexJobRunsTab } from '@/components/pipelines/IndexJobRunsTab';
import { IndexJobArtifactsTab } from '@/components/pipelines/IndexJobArtifactsTab';
import { PipelineOperationalProbePanel } from '@/components/pipelines/PipelineOperationalProbePanel';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  executePipelineBrowserUploadProbe,
  executePipelineJobExecutionProbe,
  type RuntimeProbeRun,
} from '@/lib/pipelineService';

function parseSelectedJobId(rawValue: string | null) {
  const trimmed = rawValue?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

export default function IndexBuilderPage() {
  useShellHeaderTitle({ title: 'Index Builder', breadcrumbs: ['Pipeline Services', 'Index Builder'] });

  const list = useIndexBuilderList();
  const [browserUploadProbeRun, setBrowserUploadProbeRun] = useState<RuntimeProbeRun | null>(null);
  const [jobExecutionProbeRun, setJobExecutionProbeRun] = useState<RuntimeProbeRun | null>(null);
  const [isRunningBrowserUploadProbe, setIsRunningBrowserUploadProbe] = useState(false);
  const [isRunningJobExecutionProbe, setIsRunningJobExecutionProbe] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedJobId = parseSelectedJobId(searchParams.get('job'));
  const updateSelectedJobId = useCallback((nextJobId: string | null) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (nextJobId) {
      nextSearchParams.set('job', nextJobId);
    } else {
      nextSearchParams.delete('job');
    }
    setSearchParams(nextSearchParams);
  }, [searchParams, setSearchParams]);

  const job = useIndexBuilderJob(selectedJobId, {
    onJobSaved: (sourceSetId) => {
      updateSelectedJobId(sourceSetId);
      void list.refreshList();
    },
    onSourceSetPersisted: () => {
      void list.refreshList();
    },
  });

  function selectJob(jobId: string) {
    updateSelectedJobId(jobId);
  }

  function createNewJob() {
    updateSelectedJobId('new');
  }

  const handleDiscard = () => {
    if (job.isNewJob) {
      updateSelectedJobId(null);
    } else {
      job.discardChanges();
    }
  };

  const isDetailView = selectedJobId !== null;
  const isDetailReady = isDetailView && !job.isLoading && !job.loadError;
  const selectedListJobId = selectedJobId && selectedJobId !== 'new' ? selectedJobId : null;
  const resolvedProjectId = job.resolvedProjectId ?? list.resolvedProjectId ?? null;

  const runBrowserUploadProbe = useCallback(async () => {
    if (!resolvedProjectId) return;
    try {
      setIsRunningBrowserUploadProbe(true);
      setBrowserUploadProbeRun(await executePipelineBrowserUploadProbe({
        projectId: resolvedProjectId,
        pipelineKind: job.service.pipelineKind,
      }));
    } finally {
      setIsRunningBrowserUploadProbe(false);
    }
  }, [job.service.pipelineKind, resolvedProjectId]);

  const runJobExecutionProbe = useCallback(async () => {
    if (!resolvedProjectId) return;
    try {
      setIsRunningJobExecutionProbe(true);
      setJobExecutionProbeRun(await executePipelineJobExecutionProbe({
        projectId: resolvedProjectId,
        pipelineKind: job.service.pipelineKind,
      }));
    } finally {
      setIsRunningJobExecutionProbe(false);
    }
  }, [job.service.pipelineKind, resolvedProjectId]);

  return (
    <div className="h-full w-full min-h-0 p-2">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
          <div className="min-h-0 border-b border-border lg:border-b-0 lg:border-r">
            <IndexJobsList
              jobs={list.indexJobs}
              selectedJobId={selectedListJobId}
              onSelectJob={selectJob}
              onNewJob={createNewJob}
            />
          </div>

          <div className="min-h-0 flex flex-1 flex-col">
            {!isDetailView ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                <h2 className="text-lg font-semibold text-foreground">No definition selected</h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Select a saved definition or create one to edit file membership, review the latest run, and download outputs.
                </p>
                <Button type="button" size="sm" onClick={createNewJob}>
                  Create definition
                </Button>
              </div>
            ) : job.isLoading ? (
              <div className="flex flex-1 flex-col gap-3 p-4">
                <Skeleton className="h-10 w-2/3" />
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="mt-4 h-64 w-full" />
              </div>
            ) : job.loadError ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
                <p className="text-sm text-destructive">{job.loadError}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    updateSelectedJobId(null);
                    void list.refreshList();
                  }}
                >
                  Return to list
                </Button>
              </div>
            ) : (
              <>
                {isDetailReady ? (
                  <IndexBuilderHeader
                    title={job.jobName}
                    onTitleChange={job.updateName}
                    isNewDefinition={job.isNewJob}
                    hasUnsavedChanges={job.hasUnsavedChanges}
                    memberCount={job.pipelineSourceSet.selectedSourceUids.length}
                    status={job.status}
                    latestJob={job.pipelineJob.job}
                    isPersisting={job.pipelineSourceSet.isPersisting}
                    isTriggering={job.pipelineJob.isTriggering}
                    onSave={job.saveDraft}
                    onStartRun={job.startRun}
                    onRetryRun={job.retryRun}
                    onDiscard={handleDiscard}
                  />
                ) : null}

                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="flex flex-col gap-6 px-4 py-4">
                    {resolvedProjectId ? (
                      <PipelineOperationalProbePanel
                        serviceLabel={job.service.label}
                        browserUploadRun={browserUploadProbeRun}
                        jobExecutionRun={jobExecutionProbeRun}
                        isRunningBrowserUpload={isRunningBrowserUploadProbe}
                        isRunningJobExecution={isRunningJobExecutionProbe}
                        onRunBrowserUpload={runBrowserUploadProbe}
                        onRunJobExecution={runJobExecutionProbe}
                      />
                    ) : null}

                    <div className="flex flex-col gap-4 xl:flex-row">
                      <div className="min-w-0 flex-[2]">
                        <IndexJobFilesTab
                          sources={job.pipelineSourceSet.sources}
                          selectedSourceUids={job.pipelineSourceSet.selectedSourceUids}
                          sourcesLoading={job.pipelineSourceSet.sourcesLoading}
                          sourcesError={job.pipelineSourceSet.sourcesError}
                          browserUploadProbeRun={browserUploadProbeRun}
                          onToggleSource={job.pipelineSourceSet.toggleSource}
                          onUpload={job.handleUpload}
                          onRemoveSource={job.pipelineSourceSet.removeSource}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <IndexJobConfigTab />
                      </div>
                    </div>

                    <IndexJobRunsTab
                      job={job.pipelineJob.job}
                      isPolling={job.pipelineJob.isPolling}
                      jobLoading={job.pipelineJob.jobLoading}
                      jobError={job.pipelineJob.jobError}
                      jobExecutionProbeRun={jobExecutionProbeRun}
                    />

                    <IndexJobArtifactsTab
                      job={job.pipelineJob.job}
                      onDownload={job.handleDownload}
                      downloadError={job.downloadError}
                      downloadingKind={job.downloadingKind}
                      jobExecutionProbeRun={jobExecutionProbeRun}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
