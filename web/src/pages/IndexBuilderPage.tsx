import { useEffect } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { useIndexBuilder } from '@/hooks/useIndexBuilder';
import { IndexJobsList } from '@/components/pipelines/IndexJobsList';
import { IndexJobHeader } from '@/components/pipelines/IndexJobHeader';
import { IndexJobFilesTab } from '@/components/pipelines/IndexJobFilesTab';
import { IndexJobConfigTab } from '@/components/pipelines/IndexJobConfigTab';
import { IndexJobRunsTab } from '@/components/pipelines/IndexJobRunsTab';
import { IndexJobArtifactsTab } from '@/components/pipelines/IndexJobArtifactsTab';

const TAB_LABELS = [
  { id: 'files' as const, label: 'Files' },
  { id: 'config' as const, label: 'Config' },
  { id: 'runs' as const, label: 'Runs' },
  { id: 'artifacts' as const, label: 'Artifacts' },
];

export default function IndexBuilderPage() {
  const ib = useIndexBuilder();

  // Auto-tab-switch: when selected job transitions to running, switch to Runs tab
  useEffect(() => {
    if (ib.selectedJob?.status === 'running') {
      ib.setActiveTab('runs');
    }
  }, [ib.selectedJob?.status]);

  return (
    <div className="flex h-full min-h-0 gap-3 p-3">
      {/* Left pane — selected job detail (66%) */}
      <div className="flex min-h-0 min-w-0 flex-[2] flex-col rounded-lg border border-border bg-card">
        {!ib.selectedJob ? (
          /* Empty state */
          <div className="flex flex-1 flex-col px-5 py-6">
            <h3 className="text-base font-semibold text-foreground">Index Builder</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Upload markdown files, configure processing, and generate search-ready artifacts.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
              <li>Accepts Markdown (.md, .markdown)</li>
              <li>Produces lexical SQLite + semantic archive</li>
              <li>Runs can be monitored step-by-step</li>
            </ul>
            <div className="mt-6">
              <Button type="button" size="sm" onClick={ib.createNewJob}>
                <IconPlus size={14} />
                New Index Job
              </Button>
            </div>
          </div>
        ) : (
          /* Selected job detail */
          <div className="flex min-h-0 flex-1 flex-col">
            <IndexJobHeader
              name={ib.selectedJob.name}
              status={ib.selectedJob.status}
              hasUnsavedChanges={ib.hasUnsavedChanges}
              createdAt={ib.selectedJob.createdAt}
              updatedAt={ib.selectedJob.updatedAt}
              lastRunAt={ib.selectedJob.lastRunAt}
              memberCount={ib.selectedJob.memberCount}
              onNameChange={ib.setDraftName}
              onSaveDraft={() => { void ib.saveDraft(); }}
              onStartRun={() => { void ib.startRun(); }}
              onRetryRun={() => { void ib.retryRun(); }}
              onDiscard={() => ib.selectJob(ib.selectedJobId === '__new__' ? '' : ib.selectedJobId!)}
              isSaving={ib.pipelineSourceSet.isPersisting}
              isTriggering={ib.pipelineJob.isTriggering}
            />

            {/* Tab bar */}
            <div className="flex border-b border-border">
              {TAB_LABELS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => ib.setActiveTab(tab.id)}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                    ib.activeTab === tab.id
                      ? 'border-b-2 border-primary text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex min-h-0 flex-1 flex-col">
              {ib.activeTab === 'files' ? (
                <IndexJobFilesTab
                  sources={ib.pipelineSourceSet.sources}
                  selectedSourceUids={ib.pipelineSourceSet.selectedSourceUids}
                  sourcesLoading={ib.pipelineSourceSet.sourcesLoading}
                  sourcesError={ib.pipelineSourceSet.sourcesError}
                  onToggleSource={ib.pipelineSourceSet.toggleSource}
                  onUpload={ib.handleUpload}
                  onRemoveSource={ib.pipelineSourceSet.removeSource}
                />
              ) : null}
              {ib.activeTab === 'config' ? <IndexJobConfigTab /> : null}
              {ib.activeTab === 'runs' ? (
                <IndexJobRunsTab
                  job={ib.pipelineJob.job}
                  isPolling={ib.pipelineJob.isPolling}
                  jobLoading={ib.pipelineJob.jobLoading}
                  jobError={ib.pipelineJob.jobError}
                />
              ) : null}
              {ib.activeTab === 'artifacts' ? (
                <IndexJobArtifactsTab
                  job={ib.pipelineJob.job}
                  onDownload={ib.handleDownload}
                  downloadError={ib.downloadError}
                  downloadingKind={ib.downloadingKind}
                />
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Right pane — job list (34%) */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <IndexJobsList
          jobs={ib.indexJobs}
          selectedJobId={ib.selectedJobId}
          onSelectJob={(id) => { void ib.selectJob(id); }}
          onNewJob={ib.createNewJob}
        />
      </div>
    </div>
  );
}
