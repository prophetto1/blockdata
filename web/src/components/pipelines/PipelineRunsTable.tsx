import { ScrollArea } from '@/components/ui/scroll-area';

export type PipelineRunRow = {
  job_id: string;
  label: string;
  status: 'draft' | 'queued' | 'running' | 'complete' | 'failed';
  created_at: string;
  deliverables: { deliverable_kind: string; filename: string }[];
};

function StatusBadge({ status }: { status: PipelineRunRow['status'] }) {
  const styles: Record<PipelineRunRow['status'], string> = {
    draft: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    queued: 'bg-muted/60 text-muted-foreground',
    running: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
    complete: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    failed: 'bg-destructive/15 text-destructive',
  };

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function formatTimestamp(iso: string) {
  try {
    const date = new Date(iso);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function PipelineRunsTable({
  runs,
  selectedJobId,
  onSelectRun,
}: {
  runs: PipelineRunRow[];
  selectedJobId: string | null;
  onSelectRun: (jobId: string) => void;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="border-b border-border px-3 py-2">
        <h2 className="text-sm font-medium text-foreground">Runs</h2>
      </div>

      {/* Table */}
      {runs.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">No runs yet.</p>
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-card text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Label</th>
                <th className="w-[80px] px-3 py-2 font-medium">Status</th>
                <th className="w-[120px] px-3 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr
                  key={run.job_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectRun(run.job_id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectRun(run.job_id);
                    }
                  }}
                  className={`cursor-pointer border-b border-border/60 align-top transition-colors hover:bg-accent/30 ${
                    selectedJobId === run.job_id ? 'bg-accent/20' : ''
                  }`}
                >
                  <td className="px-3 py-3 font-medium text-foreground">{run.label}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {formatTimestamp(run.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      )}
    </section>
  );
}