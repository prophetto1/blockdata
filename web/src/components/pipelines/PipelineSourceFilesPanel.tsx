import type { PipelineSource } from '@/lib/pipelineService';
import { Button } from '@/components/ui/button';

function formatBytes(value?: number) {
  if (!value || value <= 0) return 'Size unavailable';
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function PipelineSourceFilesPanel({
  sources,
  loading,
  error,
  selectedSourceUids,
  onToggleSource,
}: {
  sources: PipelineSource[];
  loading: boolean;
  error: string | null;
  selectedSourceUids: string[];
  onToggleSource: (sourceUid: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Uploaded markdown files</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review uploaded markdown files and choose which ones belong in the processing set.
          </p>
        </div>

        {loading ? <div className="text-sm text-muted-foreground">Loading uploaded markdown files...</div> : null}
        {error ? <div className="text-sm text-destructive">{error}</div> : null}
        {!loading && !error && sources.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background/40 px-4 py-6 text-sm text-muted-foreground">
            Uploaded markdown files appear here after the upload step completes.
          </div>
        ) : null}

        <div className="space-y-3">
          {sources.map((source) => {
            const isSelected = selectedSourceUids.includes(source.source_uid);
            const actionLabel = isSelected
              ? `Remove ${source.doc_title} from processing set`
              : `Add ${source.doc_title} to processing set`;

            return (
              <article
                key={source.source_uid}
                className="flex flex-col gap-3 rounded-xl border border-border bg-background/70 px-4 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="text-sm font-medium text-foreground">{source.doc_title}</div>
                  <div className="text-xs text-muted-foreground">
                    {source.source_type} • {formatBytes(source.byte_size)}
                  </div>
                </div>
                <Button
                  type="button"
                  variant={isSelected ? 'secondary' : 'outline'}
                  aria-label={actionLabel}
                  onClick={() => onToggleSource(source.source_uid)}
                >
                  {isSelected ? 'Selected' : 'Add to set'}
                </Button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
