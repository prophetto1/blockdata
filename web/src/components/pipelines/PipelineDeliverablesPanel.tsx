import type { PipelineDeliverable, PipelineJob, PipelineSource } from '@/lib/pipelineService';
import { Button } from '@/components/ui/button';

function formatBytes(value: number | undefined) {
  if (!value || value <= 0) return '0 B';
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function PipelineDeliverablesPanel({
  job,
  sourceSetLabel,
  selectedSources,
  onDownload,
  downloadError,
  downloadingKind,
}: {
  job: PipelineJob | null;
  sourceSetLabel: string;
  selectedSources: PipelineSource[];
  onDownload: (deliverable: PipelineDeliverable) => Promise<void>;
  downloadError: string | null;
  downloadingKind: string | null;
}) {
  const isComplete = job?.status === 'complete';
  const deliverables = job?.deliverables ?? [];

  return (
    <section className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Deliverables</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Download lexical and semantic artifacts when the selected job completes.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background/60 px-4 py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Processing set
          </div>
          <div className="mt-2 text-sm font-medium text-foreground">{sourceSetLabel}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {selectedSources.length} markdown file{selectedSources.length === 1 ? '' : 's'} selected
          </div>
        </div>

        {!job ? (
          <div className="text-sm text-muted-foreground">
            Deliverables appear after a pipeline job has been started.
          </div>
        ) : null}

        {job && deliverables.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No deliverables are available for this job yet.
          </div>
        ) : null}

        {deliverables.map((deliverable) => (
          <article
            key={deliverable.deliverable_kind}
            className="flex flex-col gap-3 rounded-xl border border-border bg-background/70 px-4 py-4 md:flex-row md:items-center md:justify-between"
          >
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">{deliverable.filename}</div>
              <div className="text-xs text-muted-foreground">
                {deliverable.deliverable_kind} • {formatBytes(deliverable.byte_size)}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!isComplete || downloadingKind === deliverable.deliverable_kind}
              onClick={() => { void onDownload(deliverable); }}
              aria-label={`Download ${deliverable.filename}`}
            >
              {downloadingKind === deliverable.deliverable_kind ? 'Downloading...' : `Download ${deliverable.filename}`}
            </Button>
          </article>
        ))}

        {downloadError ? <div className="text-sm text-destructive">{downloadError}</div> : null}
      </div>
    </section>
  );
}
