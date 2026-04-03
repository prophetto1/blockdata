import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useIndexBuilderList } from '@/hooks/useIndexBuilderList';
import { useIndexBuilderJob } from '@/hooks/useIndexBuilderJob';
import { IndexJobsList } from '@/components/pipelines/IndexJobsList';
import { IndexJobStatusChip } from '@/components/pipelines/IndexJobStatusChip';
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

  function backToList() {
    updateSelectedJobId(null);
    void list.refreshList();
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
                <h2 className="text-lg font-semibold text-foreground">No index job selected</h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  Select an index job or create a new one to edit file membership, review runs, and download outputs.
                </p>
                <Button type="button" size="sm" onClick={createNewJob}>
                  Create new job
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
                <Button type="button" size="sm" variant="outline" onClick={backToList}>
                  Return to list
                </Button>
              </div>
            ) : (
              <>
                {isDetailReady ? (
                  <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={backToList}
                        className="shrink-0 text-sm font-medium text-muted-foreground hover:text-foreground"
                      >
                        Index Jobs
                      </button>
                      <span className="shrink-0 text-sm text-muted-foreground">/</span>
                      <input
                        type="text"
                        value={job.jobName}
                        onChange={(e) => job.updateName(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:rounded-sm focus-visible:px-1"
                        placeholder="Untitled index job"
                      />
                      <IndexJobStatusChip status={job.status} hasUnsavedChanges={job.hasUnsavedChanges} />
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {job.status === 'draft' ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => { void job.saveDraft(); }}
                          disabled={job.pipelineSourceSet.isPersisting}
                        >
                          {job.pipelineSourceSet.isPersisting ? 'Saving...' : 'Save draft'}
                        </Button>
                      ) : null}
                      {job.hasUnsavedChanges && job.status !== 'draft' ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => { void job.startRun(); }}
                          disabled={job.pipelineSourceSet.isPersisting || job.pipelineJob.isTriggering}
                        >
                          {job.pipelineSourceSet.isPersisting ? 'Saving...' : 'Save and start'}
                        </Button>
                      ) : null}
                      {job.status === 'ready' && !job.hasUnsavedChanges ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => { void job.startRun(); }}
                          disabled={job.pipelineJob.isTriggering}
                        >
                          {job.pipelineJob.isTriggering ? 'Starting...' : 'Start run'}
                        </Button>
                      ) : null}
                      {job.status === 'running' ? (
                        <Button type="button" size="sm" disabled>Running...</Button>
                      ) : null}
                      {job.status === 'failed' && !job.hasUnsavedChanges ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => { void job.retryRun(); }}
                          disabled={job.pipelineJob.isTriggering}
                        >
                          {job.pipelineJob.isTriggering ? 'Starting...' : 'Retry run'}
                        </Button>
                      ) : null}
                      {job.status === 'complete' && !job.hasUnsavedChanges ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => { void job.retryRun(); }}
                          disabled={job.pipelineJob.isTriggering}
                        >
                          Run again
                        </Button>
                      ) : null}
                      {(job.hasUnsavedChanges || job.isNewJob) ? (
                        <Button type="button" size="sm" variant="outline" onClick={handleDiscard}>
                          Discard
                        </Button>
                      ) : null}
                    </div>
                  </div>
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
