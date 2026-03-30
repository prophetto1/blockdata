import type { PipelineJob, PipelineSource } from '@/lib/pipelineService';

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

function ValueCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-xl border border-border bg-background/70 px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium text-foreground">{value}</div>
    </article>
  );
}

function toStageState(
  job: PipelineJob | null,
  stageValue: string,
): StageVisualState {
  if (!job) return 'pending';

  const currentStage = job.status === 'failed'
    ? job.failure_stage ?? job.stage
    : job.stage;
  const currentIndex = STAGE_DISPLAY.findIndex((item) => item.value === currentStage);
  const stageIndex = STAGE_DISPLAY.findIndex((item) => item.value === stageValue);

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

export function PipelineJobStatusPanel({
  job,
  sourceSetLabel,
  selectedSources,
  processingRequested,
  loading,
  error,
  isPolling,
}: {
  job: PipelineJob | null;
  sourceSetLabel: string;
  selectedSources: PipelineSource[];
  processingRequested: boolean;
  loading: boolean;
  error: string | null;
  isPolling: boolean;
}) {
  const showTracker = processingRequested || Boolean(job);

  return (
    <section className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Processing</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Follow each backend stage as the selected markdown set moves through the pipeline.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background/60 px-4 py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Active source set
          </div>
          <div className="mt-2 text-sm font-medium text-foreground">{sourceSetLabel}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedSources.length > 0 ? selectedSources.map((source) => (
              <span
                key={source.source_uid}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
              >
                {source.doc_title}
              </span>
            )) : (
              <span className="text-sm text-muted-foreground">No markdown files selected yet.</span>
            )}
          </div>
        </div>

        {loading ? <div className="text-sm text-muted-foreground">Loading latest job state...</div> : null}
        {error ? <div className="text-sm text-destructive">{error}</div> : null}
        {!showTracker ? (
          <div className="rounded-xl border border-dashed border-border bg-background/40 px-4 py-6 text-sm text-muted-foreground">
            Start processing to show the full stage tracker.
          </div>
        ) : null}

        {showTracker ? (
          <div className="space-y-3">
            {STAGE_DISPLAY.map((stage) => {
              const state = toStageState(job, stage.value);
              const isFailedStage = state === 'failed';

              return (
                <div
                  key={stage.value}
                  aria-label={`Stage ${stage.label}: ${state}`}
                  className={`rounded-xl border px-4 py-4 ${stageToneClass(state)}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-foreground">{stage.label}</div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {state}
                    </div>
                  </div>
                  {isFailedStage && job?.error_message ? (
                    <div className="mt-2 text-sm text-destructive">{job.error_message}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {job ? (
          <div className="grid gap-4 md:grid-cols-4">
            <ValueCard label="Status" value={job.status} />
            <ValueCard label="Stage" value={job.failure_stage ?? job.stage} />
            <ValueCard label="Sections" value={job.section_count ?? 0} />
            <ValueCard label="Chunks" value={job.chunk_count ?? 0} />
          </div>
        ) : null}

        {isPolling ? (
          <div className="text-sm text-muted-foreground">Polling for updates...</div>
        ) : null}
      </div>
    </section>
  );
}
