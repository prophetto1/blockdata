import {
  IconAlertCircle,
  IconCheck,
  IconClock,
  IconLoader2,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import type { IndexJobStatus } from '@/lib/indexJobStatus';
import type { PipelineJob } from '@/lib/pipelineService';

type IndexBuilderHeaderProps = {
  title: string;
  onTitleChange: (value: string) => void;
  isNewDefinition: boolean;
  hasUnsavedChanges: boolean;
  memberCount: number;
  status: IndexJobStatus;
  latestJob: PipelineJob | null;
  isPersisting: boolean;
  isTriggering: boolean;
  onSave: () => void | Promise<void>;
  onStartRun: () => void | Promise<void>;
  onRetryRun: () => void | Promise<void>;
  onDiscard: () => void;
};

function DefinitionStateBadge({
  isNewDefinition,
  hasUnsavedChanges,
}: {
  isNewDefinition: boolean;
  hasUnsavedChanges: boolean;
}) {
  if (isNewDefinition) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
        Draft
      </span>
    );
  }

  if (hasUnsavedChanges) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
        Unsaved changes
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
      <IconCheck size={12} />
      Saved
    </span>
  );
}

function RunStateBadge({ latestJob }: { latestJob: PipelineJob | null }) {
  if (!latestJob) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
        <IconClock size={12} />
        Never run
      </span>
    );
  }

  if (latestJob.status === 'queued' || latestJob.status === 'running') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-1 text-xs font-medium text-sky-700 dark:text-sky-400">
        <IconLoader2 size={12} className="animate-spin" />
        {latestJob.status === 'queued' ? 'Queued' : 'Running'}
      </span>
    );
  }

  if (latestJob.status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-1 text-xs font-medium text-destructive">
        <IconAlertCircle size={12} />
        Failed
      </span>
    );
  }

  if (latestJob.status === 'complete') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <IconCheck size={12} />
        Complete
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
      {latestJob.status}
    </span>
  );
}

function ActionCluster({
  isNewDefinition,
  hasUnsavedChanges,
  memberCount,
  status,
  latestJob,
  isPersisting,
  isTriggering,
  onSave,
  onStartRun,
  onRetryRun,
  onDiscard,
}: {
  isNewDefinition: boolean;
  hasUnsavedChanges: boolean;
  memberCount: number;
  status: IndexJobStatus;
  latestJob: PipelineJob | null;
  isPersisting: boolean;
  isTriggering: boolean;
  onSave: () => void | Promise<void>;
  onStartRun: () => void | Promise<void>;
  onRetryRun: () => void | Promise<void>;
  onDiscard: () => void;
}) {
  const isRunning = latestJob?.status === 'queued' || latestJob?.status === 'running';
  const latestFailed = latestJob?.status === 'failed';
  const latestComplete = latestJob?.status === 'complete';
  const canRun = memberCount > 0 && status !== 'empty';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(isNewDefinition || hasUnsavedChanges) ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onDiscard}
          disabled={isPersisting || isTriggering}
        >
          {isNewDefinition ? 'Discard draft' : 'Revert changes'}
        </Button>
      ) : null}

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => { void onSave(); }}
        disabled={isPersisting || isTriggering || (!isNewDefinition && !hasUnsavedChanges)}
      >
        {isPersisting ? 'Saving...' : 'Save definition'}
      </Button>

      {isRunning ? (
        <Button type="button" size="sm" disabled>
          Running...
        </Button>
      ) : canRun ? (
        latestFailed ? (
          <Button
            type="button"
            size="sm"
            onClick={() => { void onRetryRun(); }}
            disabled={isPersisting || isTriggering}
          >
            {isTriggering ? 'Starting...' : 'Retry run'}
          </Button>
        ) : latestComplete ? (
          <Button
            type="button"
            size="sm"
            onClick={() => { void onRetryRun(); }}
            disabled={isPersisting || isTriggering}
          >
            {isTriggering ? 'Starting...' : 'Run again'}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={() => { void onStartRun(); }}
            disabled={isPersisting || isTriggering}
          >
            {isTriggering ? 'Starting...' : 'Start run'}
          </Button>
        )
      ) : null}
    </div>
  );
}

export function IndexBuilderHeader({
  title,
  onTitleChange,
  isNewDefinition,
  hasUnsavedChanges,
  memberCount,
  status,
  latestJob,
  isPersisting,
  isTriggering,
  onSave,
  onStartRun,
  onRetryRun,
  onDiscard,
}: IndexBuilderHeaderProps) {
  return (
    <header className="shrink-0 border-b border-border px-4 py-3">
      <div className="flex flex-col gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-foreground outline-none placeholder:text-muted-foreground focus-visible:rounded-sm focus-visible:px-1 focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Untitled definition"
              />

              <div className="flex flex-wrap items-center gap-2">
                <DefinitionStateBadge
                  isNewDefinition={isNewDefinition}
                  hasUnsavedChanges={hasUnsavedChanges}
                />
                <RunStateBadge latestJob={latestJob} />
              </div>
            </div>

            {latestJob?.job_id ? (
              <div className="text-xs text-muted-foreground">
                Run ID: <span className="font-mono">{latestJob.job_id.slice(0, 8)}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-3">
            <ActionCluster
              isNewDefinition={isNewDefinition}
              hasUnsavedChanges={hasUnsavedChanges}
              memberCount={memberCount}
              status={status}
              latestJob={latestJob}
              isPersisting={isPersisting}
              isTriggering={isTriggering}
              onSave={onSave}
              onStartRun={onStartRun}
              onRetryRun={onRetryRun}
              onDiscard={onDiscard}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
