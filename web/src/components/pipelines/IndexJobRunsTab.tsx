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

type StageVisualState = 'pending' | 'in progress' | 'done' | 'failed';

function toStageState(job: PipelineJob | null, stageValue: string): StageVisualState {
  if (!job) return 'pending';
  const currentStage = job.status === 'failed' ? (job.failure_stage ?? job.stage) : job.stage;
  const currentIndex = STAGE_DISPLAY.findIndex((s) => s.value === currentStage);
  const stageIndex = STAGE_DISPLAY.findIndex((s) => s.value === stageValue);

  if (job.status === 'complete') return 'done';
  if (currentIndex === -1 || stageIndex === -1) return 'pending';
  if (job.status === 'failed') {
    if (stageIndex < currentIndex) return 'done';
    if (stageIndex === currentIndex) return 'failed';
    return 'pending';
  }
  if (stageIndex < currentIndex) return 'done';
  if (stageIndex === currentIndex) return 'in progress';
  return 'pending';
}

function stageToneClass(state: StageVisualState) {
  if (state === 'done') return 'border-emerald-500/30 bg-emerald-500/10';
  if (state === 'in progress') return 'border-sky-500/30 bg-sky-500/10';
  if (state === 'failed') return 'border-destructive/30 bg-destructive/10';
  return 'border-border bg-background/60';
}

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
  const seconds = Math.floor((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
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
      <div className="flex-1 px-4 py-4 text-sm text-muted-foreground">
        Loading run status...
      </div>
    );
  }

  if (jobError) {
    return (
      <div className="flex-1 px-4 py-4 text-sm text-destructive">{jobError}</div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No runs yet — start a run to see progress here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
      {/* Run metadata header */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {job.started_at ? (
          <span>Run started {formatTimestamp(job.started_at)}</span>
        ) : null}
        {formatElapsed(job.started_at, job.completed_at) ? (
          <span>Elapsed: {formatElapsed(job.started_at, job.completed_at)}</span>
        ) : null}
      </div>

      {/* 9-stage progress tracker */}
      <div className="space-y-1.5">
        {STAGE_DISPLAY.map((stage) => {
          const state = toStageState(job, stage.value);
          const isFailedStage = state === 'failed';
          return (
            <div
              key={stage.value}
              aria-label={`Stage ${stage.label}: ${state}`}
              className={`rounded-md border px-3 py-2 ${stageToneClass(state)}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-foreground">{stage.label}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {state}
                </span>
              </div>
              {isFailedStage && job.error_message ? (
                <div className="mt-1 text-xs text-destructive">{job.error_message}</div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Error summary */}
      {job.status === 'failed' && job.error_message ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          <p className="text-xs font-medium text-destructive">
            Failed at: {job.failure_stage ?? job.stage}
          </p>
          <p className="mt-1 text-xs text-destructive/80">{job.error_message}</p>
        </div>
      ) : null}

      {/* Stats on completion */}
      {job.status === 'complete' ? (
        <div className="grid grid-cols-3 gap-2">
          {job.section_count != null ? (
            <div className="rounded-md border border-border bg-background/60 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sections</div>
              <div className="mt-1 text-sm font-medium text-foreground">{job.section_count}</div>
            </div>
          ) : null}
          {job.chunk_count != null ? (
            <div className="rounded-md border border-border bg-background/60 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Chunks</div>
              <div className="mt-1 text-sm font-medium text-foreground">{job.chunk_count}</div>
            </div>
          ) : null}
          {job.embedding_model ? (
            <div className="rounded-md border border-border bg-background/60 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Embedding</div>
              <div className="mt-1 text-sm font-medium text-foreground">{job.embedding_model}</div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Polling indicator */}
      {isPolling ? (
        <div className="text-xs text-muted-foreground">Polling for updates…</div>
      ) : null}
    </div>
  );
}
