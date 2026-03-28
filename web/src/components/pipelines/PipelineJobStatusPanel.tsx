import type { PipelineJob } from '@/lib/pipelineService';

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

export function PipelineJobStatusPanel({
  job,
  loading,
  error,
  isPolling,
}: {
  job: PipelineJob | null;
  loading: boolean;
  error: string | null;
  isPolling: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Job Status</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Current lifecycle state and stage progression for the selected source.
          </p>
        </div>

        {loading ? <div className="text-sm text-muted-foreground">Loading latest job state...</div> : null}
        {error ? <div className="text-sm text-destructive">{error}</div> : null}
        {!loading && !error && !job ? (
          <div className="text-sm text-muted-foreground">
            No pipeline job has been created for the selected source yet.
          </div>
        ) : null}

        {job ? (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <ValueCard label="Status" value={job.status} />
              <ValueCard label="Stage" value={job.stage} />
              <ValueCard label="Sections" value={job.section_count ?? 0} />
              <ValueCard label="Chunks" value={job.chunk_count ?? 0} />
            </div>

            {isPolling ? (
              <div className="text-sm text-muted-foreground">Polling for updates...</div>
            ) : null}

            {job.embedding_provider || job.embedding_model ? (
              <div className="grid gap-4 md:grid-cols-2">
                <ValueCard label="Embedding provider" value={job.embedding_provider ?? 'n/a'} />
                <ValueCard label="Embedding model" value={job.embedding_model ?? 'n/a'} />
              </div>
            ) : null}

            {job.status === 'failed' ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-destructive">
                  Failure
                </div>
                <div className="mt-2 text-sm text-foreground">
                  Stage: {job.failure_stage ?? job.stage}
                </div>
                {job.error_message ? (
                  <div className="mt-2 text-sm text-destructive">{job.error_message}</div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
