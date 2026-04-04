import {
  IconAlertCircle,
  IconCheck,
  IconClock,
  IconLoader2,
  IconPlus,
} from '@tabler/icons-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
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

function formatCount(count: number) {
  return `${count} document${count === 1 ? '' : 's'}`;
}

function getRunLabel(job: IndexJobViewModel) {
  if (!job.latestJob) return 'Never run';
  if (job.latestJob.status === 'queued') return 'Queued';
  if (job.latestJob.status === 'running') return 'Running';
  if (job.latestJob.status === 'failed') return 'Failed';
  if (job.latestJob.status === 'complete') return 'Complete';
  return 'Saved';
}

function getRunTone(job: IndexJobViewModel) {
  if (!job.latestJob) return 'muted';
  if (job.latestJob.status === 'queued' || job.latestJob.status === 'running') return 'running';
  if (job.latestJob.status === 'failed') return 'failed';
  if (job.latestJob.status === 'complete') return 'complete';
  return 'muted';
}

function RunStateBadge({ job }: { job: IndexJobViewModel }) {
  const tone = getRunTone(job);
  const label = getRunLabel(job);

  if (tone === 'running') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-accent/40 px-2 py-1 text-xs font-medium text-foreground">
        <IconLoader2 size={12} className="animate-spin" />
        {label}
      </span>
    );
  }

  if (tone === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
        <IconAlertCircle size={12} />
        {label}
      </span>
    );
  }

  if (tone === 'complete') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-1 text-xs font-medium text-foreground">
        <IconCheck size={12} />
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
      <IconClock size={12} />
      {label}
    </span>
  );
}

function sortJobs(jobs: IndexJobViewModel[]): IndexJobViewModel[] {
  return jobs.slice().sort((a, b) => {
    const aRunning = a.latestJob?.status === 'queued' || a.latestJob?.status === 'running';
    const bRunning = b.latestJob?.status === 'queued' || b.latestJob?.status === 'running';
    if (aRunning !== bRunning) return aRunning ? -1 : 1;

    const aFailed = a.latestJob?.status === 'failed';
    const bFailed = b.latestJob?.status === 'failed';
    if (aFailed !== bFailed) return aFailed ? -1 : 1;

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

  if (sorted.length === 0) {
    return (
      <section className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-border bg-card px-4 py-8">
        <div className="w-full max-w-sm rounded-lg border border-border bg-background/40 px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground">No index definitions yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Create one, upload markdown files, save it, and start a run when you&apos;re ready.
          </p>
          <div className="mt-5">
            <Button type="button" size="sm" variant="outline" onClick={onNewJob}>
              <IconPlus size={14} />
              New Definition
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div>
          <h2 className="text-sm font-medium text-foreground">Index Definitions</h2>
          <p className="text-xs text-muted-foreground">
            Saved document sets and their latest processing run.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onNewJob}>
          <IconPlus size={14} />
          New Definition
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="divide-y divide-border">
          {sorted.map((job) => {
            const isSelected = selectedJobId === job.id;

            return (
              <button
                key={job.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectJob(job.id)}
                className={[
                  'flex w-full flex-col gap-2 px-3 py-3 text-left transition-colors hover:bg-accent/30',
                  isSelected ? 'border-l-2 border-l-primary bg-accent/20 pl-[10px]' : '',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">
                      {job.name || 'Untitled definition'}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatCount(job.memberCount)}
                    </div>
                  </div>

                  <RunStateBadge job={job} />
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">Last run:</span>{' '}
                    {formatTimestamp(job.lastRunAt)}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Updated:</span>{' '}
                    {formatTimestamp(job.updatedAt)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </section>
  );
}
