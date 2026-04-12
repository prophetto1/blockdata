import type { CoordinationDiscussionResponse } from '@/lib/coordinationApi';

type CoordinationDiscussionQueueProps = {
  data: CoordinationDiscussionResponse | null;
  loading: boolean;
};

function participantLabel(participant: { host: string | null; agent_id: string | null }) {
  return participant.agent_id || participant.host || '--';
}

export function CoordinationDiscussionQueue({
  data,
  loading,
}: CoordinationDiscussionQueueProps) {
  const summary = data?.summary;
  const discussions = data?.discussions ?? [];

  return (
    <section
      data-testid="coordination-discussion-queue"
      className="overflow-hidden rounded-xl border border-border/70 bg-card/80 shadow-sm"
    >
      <div className="border-b border-border/70 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Discussion Queue</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Workspace-bound response obligations projected from task events.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">
              {loading ? 'Loading...' : `${summary?.thread_count ?? 0} threads`}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">
              {loading ? 'Loading...' : `${summary?.pending_count ?? 0} pending`}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">
              {loading ? 'Loading...' : `${summary?.stale_count ?? 0} stale`}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading discussion threads...</p>
        ) : discussions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No discussion threads are currently projected.</p>
        ) : (
          discussions.map((discussion) => (
            <article
              key={discussion.task_id}
              data-testid="coordination-discussion-row"
              className="rounded-lg border border-border/70 bg-background/70 px-3 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{discussion.task_id}</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${
                        discussion.status === 'stale'
                          ? 'bg-amber-500/15 text-amber-700'
                          : discussion.status === 'pending'
                            ? 'bg-sky-500/15 text-sky-700'
                            : 'bg-emerald-500/15 text-emerald-700'
                      }`}
                    >
                      {discussion.status}
                    </span>
                  </div>
                  <p className="mt-1 break-all text-xs text-muted-foreground">
                    {discussion.workspace_path ?? 'No workspace path'}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">{discussion.updated_at}</p>
              </div>

              <div className="mt-3 grid gap-3 text-xs text-muted-foreground md:grid-cols-3">
                <div>
                  <p className="font-semibold uppercase tracking-[0.16em]">Last Event</p>
                  <p className="mt-1 text-foreground">{discussion.last_event_kind ?? '--'}</p>
                </div>
                <div>
                  <p className="font-semibold uppercase tracking-[0.16em]">Participants</p>
                  <p className="mt-1 text-foreground">
                    {discussion.participants.length > 0
                      ? discussion.participants.map(participantLabel).join(', ')
                      : '--'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold uppercase tracking-[0.16em]">Pending Recipients</p>
                  <p className="mt-1 text-foreground">
                    {discussion.pending_recipients.length > 0
                      ? discussion.pending_recipients.map(participantLabel).join(', ')
                      : '--'}
                  </p>
                </div>
              </div>

              {discussion.directional_doc ? (
                <p className="mt-3 break-all text-xs text-muted-foreground">
                  Direction doc: {discussion.directional_doc}
                </p>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
