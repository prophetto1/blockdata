import { IconPlus } from '@tabler/icons-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { IndexJobStatusChip } from './IndexJobStatusChip';
import type { IndexJobViewModel } from '@/lib/indexJobStatus';

function formatTimestamp(iso: string | null) {
  if (!iso) return '—';
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

const STATUS_SORT_ORDER: Record<string, number> = {
  running: 0,
  failed: 1,
  draft: 2,
  invalid: 3,
  ready: 4,
  complete: 5,
  empty: 6,
};

function sortJobs(jobs: IndexJobViewModel[]): IndexJobViewModel[] {
  return jobs.slice().sort((a, b) => {
    const aPriority = STATUS_SORT_ORDER[a.status] ?? 9;
    const bPriority = STATUS_SORT_ORDER[b.status] ?? 9;
    if (aPriority !== bPriority) return aPriority - bPriority;
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bTime - aTime;
  });
}

export function IndexJobsList({
  jobs,
  selectedJobId,
  onSelectJob,
  onNewJob,
}: {
  jobs: IndexJobViewModel[];
  selectedJobId: string | null;
  onSelectJob: (id: string) => void;
  onNewJob: () => void;
}) {
  const sorted = sortJobs(jobs);

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-sm font-medium text-foreground">Index Jobs</h2>
        <Button type="button" size="sm" variant="outline" onClick={onNewJob}>
          <IconPlus size={14} />
          New Index Job
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">No index jobs yet.</p>
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-card text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="w-[80px] px-3 py-2 font-medium">Status</th>
                <th className="w-[110px] px-3 py-2 font-medium">Last run</th>
                <th className="w-[110px] px-3 py-2 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((job) => (
                <tr
                  key={job.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectJob(job.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectJob(job.id);
                    }
                  }}
                  className={`cursor-pointer border-b border-border/60 align-top transition-colors hover:bg-accent/30 ${
                    selectedJobId === job.id
                      ? 'border-l-2 border-l-primary bg-accent/20'
                      : ''
                  }`}
                >
                  <td className="px-3 py-3 font-medium text-foreground">{job.name}</td>
                  <td className="px-3 py-3">
                    <IndexJobStatusChip status={job.status} />
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {formatTimestamp(job.lastRunAt)}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {formatTimestamp(job.updatedAt)}
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
