import type { PipelineSource } from '@/lib/pipelineService';
import { Button } from '@/components/ui/button';

function formatCount(count: number) {
  return `${count} markdown file${count === 1 ? '' : 's'}`;
}

export function PipelineSourceSetPanel({
  label,
  selectedSources,
  projectId,
  isRunning,
  onLabelChange,
  onMoveUp,
  onMoveDown,
  onRemove,
  onRun,
}: {
  label: string;
  selectedSources: PipelineSource[];
  projectId: string | null;
  isRunning: boolean;
  onLabelChange: (value: string) => void;
  onMoveUp: (sourceUid: string) => void;
  onMoveDown: (sourceUid: string) => void;
  onRemove: (sourceUid: string) => void;
  onRun: () => Promise<void>;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Processing set</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Set the processing order before starting the pipeline run.
            </p>
          </div>
          <div className="text-sm text-muted-foreground">{formatCount(selectedSources.length)}</div>
        </div>

        <div className="space-y-2">
          <label htmlFor="pipeline-source-set-label" className="text-sm font-medium text-foreground">
            Source set label
          </label>
          <input
            id="pipeline-source-set-label"
            aria-label="Source set label"
            value={label}
            onChange={(event) => onLabelChange(event.currentTarget.value)}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </div>

        {selectedSources.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background/40 px-4 py-6 text-sm text-muted-foreground">
            Add uploaded markdown files to define the source set that will be processed.
          </div>
        ) : (
          <div className="space-y-3">
            {selectedSources.map((source, index) => (
              <article
                key={source.source_uid}
                className="flex flex-col gap-3 rounded-xl border border-border bg-background/70 px-4 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-foreground">{source.doc_title}</div>
                    <div className="text-xs text-muted-foreground">Order {index + 1}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Move ${source.doc_title} up`}
                      disabled={index === 0}
                      onClick={() => onMoveUp(source.source_uid)}
                    >
                      Up
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Move ${source.doc_title} down`}
                      disabled={index === selectedSources.length - 1}
                      onClick={() => onMoveDown(source.source_uid)}
                    >
                      Down
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${source.doc_title} from processing set`}
                      onClick={() => onRemove(source.source_uid)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 px-4 py-3">
          <div className="text-sm text-muted-foreground">
            {projectId
              ? 'Run starts the visible stage tracker and keeps the selected set in context.'
              : 'Select a project before starting processing.'}
          </div>
          <Button
            type="button"
            onClick={() => { void onRun(); }}
            disabled={!projectId || selectedSources.length === 0 || isRunning}
          >
            {isRunning ? 'Starting...' : 'Start processing'}
          </Button>
        </div>
      </div>
    </section>
  );
}
