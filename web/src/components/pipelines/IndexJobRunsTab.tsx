import {
  IconAlertCircle,
  IconCheck,
  IconClock,
  IconLoader2,
  IconPlayerPlay,
} from '@tabler/icons-react';
import type { PipelineJob } from '@/lib/pipelineService';

const STAGE_DISPLAY = [
  { value: 'loading_sources', label: 'Loading sources' },
  { value: 'consolidating', label: 'Consolidating' },
  { value: 'parsing', label: 'Parsing' },
  { value: 'normalizing', label: 'Normalizing' },
  { value: 'structuring', label: 'Structuring' },
  { value: 'chunking', label: 'Chunking' },
  { value: 'lexical_indexing', label: 'Lexical indexing' },
  { value: 'embedding', label: 'Embedding' },
  { value: 'packaging', label: 'Packaging' },
] as const;

type StageVisualState = 'pending' | 'running' | 'done' | 'failed';

function formatTimestamp(iso: string | null | undefined) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatElapsed(startedAt: string | null | undefined, completedAt: string | null | undefined) {
  if (!startedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const seconds = Math.max(0, Math.floor((end - start) / 1000));

  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remaining}s`;

  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours}h ${remMinutes}m`;
}

function toStageLabel(stage: string | null | undefined) {
  if (!stage) return null;
  const match = STAGE_DISPLAY.find((item) => item.value === stage);
  return match?.label ?? stage.replace(/_/g, ' ');
}

function getCurrentStage(job: PipelineJob | null) {
  if (!job) return null;
  return job.status === 'failed' ? (job.failure_stage ?? job.stage) : job.stage;
}

function toStageState(job: PipelineJob | null, stageValue: string): StageVisualState {
  if (!job) return 'pending';

  const currentStage = getCurrentStage(job);
  const currentIndex = STAGE_DISPLAY.findIndex((item) => item.value === currentStage);
  const stageIndex = STAGE_DISPLAY.findIndex((item) => item.value === stageValue);

  if (currentIndex === -1 || stageIndex === -1) return 'pending';
  if (job.status === 'complete') return 'done';

  if (job.status === 'failed') {
    if (stageIndex < currentIndex) return 'done';
    if (stageIndex === currentIndex) return 'failed';
    return 'pending';
  }

  if (stageIndex < currentIndex) return 'done';
  if (stageIndex === currentIndex) return 'running';
  return 'pending';
}

function stageContainerClass(state: StageVisualState) {
  if (state === 'done') return 'border-emerald-500/30 bg-emerald-500/10';
  if (state === 'running') return 'border-sky-500/30 bg-sky-500/10';
  if (state === 'failed') return 'border-destructive/30 bg-destructive/10';
  return 'border-border bg-background';
}

function StageMarker({ state }: { state: StageVisualState }) {
  if (state === 'done') {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
        <IconCheck size={14} />
      </span>
    );
  }

  if (state === 'running') {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-400">
        <IconLoader2 size={14} className="animate-spin" />
      </span>
    );
  }

  if (state === 'failed') {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <IconAlertCircle size={14} />
      </span>
    );
  }

  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <IconClock size={14} />
    </span>
  );
}

function RunStateBadge({ job }: { job: PipelineJob }) {
  if (job.status === 'queued' || job.status === 'running') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-1 text-xs font-medium text-sky-700 dark:text-sky-400">
        <IconLoader2 size={12} className="animate-spin" />
        {job.status === 'queued' ? 'Queued' : 'Running'}
      </span>
    );
  }

  if (job.status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-1 text-xs font-medium text-destructive">
        <IconAlertCircle size={12} />
        Failed
      </span>
    );
  }

  if (job.status === 'complete') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <IconCheck size={12} />
        Complete
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
      {job.status}
    </span>
  );
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

export function IndexJobRunsTab({
  job,
  isPolling,
  jobLoading,
  jobError,
}: {
  job: PipelineJob | null;
  isPolling: boolean;
  jobLoading: boolean;
  jobError: string | null;
}) {
  if (jobLoading) {
    return (
      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-medium text-foreground">Latest run</h3>
        </div>
        <div className="px-4 py-10 text-sm text-muted-foreground">
          Loading latest run...
        </div>
      </section>
    );
  }

  if (jobError) {
    return (
      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-medium text-foreground">Latest run</h3>
        </div>
        <div className="px-4 py-10 text-sm text-destructive">{jobError}</div>
      </section>
    );
  }

  if (!job) {
    return (
      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-medium text-foreground">Latest run</h3>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <IconPlayerPlay size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No run yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Save this definition and start a run to see progress, results, and output stats here.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const currentStageLabel = toStageLabel(getCurrentStage(job));
  const startedAt = formatTimestamp(job.started_at);
  const completedAt = formatTimestamp(job.completed_at);
  const elapsed = formatElapsed(job.started_at, job.completed_at);
  const hasOutputStats = (
    job.section_count != null
    || job.chunk_count != null
    || Boolean(job.embedding_provider)
    || Boolean(job.embedding_model)
  );

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-medium text-foreground">Latest run</h3>
              <RunStateBadge job={job} />
              {isPolling ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                  <IconLoader2 size={12} className="animate-spin" />
                  Live updates
                </span>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {currentStageLabel ? <span>Stage: {currentStageLabel}</span> : null}
              {startedAt ? <span>Started: {startedAt}</span> : null}
              {completedAt ? <span>Completed: {completedAt}</span> : null}
              {elapsed ? <span>Elapsed: {elapsed}</span> : null}
            </div>
          </div>

          {job.job_id ? (
            <div className="text-xs text-muted-foreground">
              Run ID: <span className="font-mono">{job.job_id.slice(0, 8)}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-5 px-4 py-4">
        {job.status === 'failed' && job.error_message ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3">
            <p className="text-xs font-medium text-destructive">
              Run failed{currentStageLabel ? ` during ${currentStageLabel}` : ''}
            </p>
            <p className="mt-1 text-xs text-destructive/90">{job.error_message}</p>
          </div>
        ) : null}

        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Progress
          </div>

          <div className="space-y-2">
            {STAGE_DISPLAY.map((stage) => {
              const state = toStageState(job, stage.value);
              const isActive = state === 'running';
              const isFailed = state === 'failed';

              return (
                <div
                  key={stage.value}
                  className={`rounded-md border px-3 py-3 ${stageContainerClass(state)}`}
                >
                  <div className="flex items-start gap-3">
                    <StageMarker state={state} />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-medium text-foreground">{stage.label}</div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {state === 'running'
                            ? 'In progress'
                            : state === 'done'
                              ? 'Done'
                              : state === 'failed'
                                ? 'Failed'
                                : 'Pending'}
                        </div>
                      </div>

                      {isActive ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          This is the current active stage.
                        </p>
                      ) : null}

                      {isFailed && job.error_message ? (
                        <p className="mt-1 text-xs text-destructive">{job.error_message}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {hasOutputStats ? (
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Run outputs
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {job.section_count != null ? (
                <SummaryStat label="Sections" value={job.section_count} />
              ) : null}

              {job.chunk_count != null ? (
                <SummaryStat label="Chunks" value={job.chunk_count} />
              ) : null}

              {job.embedding_provider ? (
                <SummaryStat label="Embedding provider" value={job.embedding_provider} />
              ) : null}

              {job.embedding_model ? (
                <SummaryStat label="Embedding model" value={job.embedding_model} />
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
