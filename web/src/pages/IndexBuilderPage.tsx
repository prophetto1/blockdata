import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useIndexBuilderList } from '@/hooks/useIndexBuilderList';
import { useIndexBuilderJob } from '@/hooks/useIndexBuilderJob';
import { IndexBuilderHeader } from '@/components/pipelines/IndexBuilderHeader';
import { IndexJobsList } from '@/components/pipelines/IndexJobsList';
import { IndexJobFilesTab } from '@/components/pipelines/IndexJobFilesTab';
import { IndexJobConfigTab } from '@/components/pipelines/IndexJobConfigTab';
import { IndexJobRunsTab } from '@/components/pipelines/IndexJobRunsTab';
import { IndexJobArtifactsTab } from '@/components/pipelines/IndexJobArtifactsTab';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

function parseSelectedJobId(rawValue: string | null) {
  const trimmed = rawValue?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

export default function IndexBuilderPage() {
  const list = useIndexBuilderList();
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
                    <div className="flex flex-col gap-4 xl:flex-row">
                      <div className="min-w-0 flex-[2]">
                        <IndexJobFilesTab
                          sources={job.pipelineSourceSet.sources}
                          selectedSourceUids={job.pipelineSourceSet.selectedSourceUids}
                          sourcesLoading={job.pipelineSourceSet.sourcesLoading}
                          sourcesError={job.pipelineSourceSet.sourcesError}
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
                    />

                    <IndexJobArtifactsTab
                      job={job.pipelineJob.job}
                      onDownload={job.handleDownload}
                      downloadError={job.downloadError}
                      downloadingKind={job.downloadingKind}
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
