import type { CoordinationConnectionState } from '@/hooks/useCoordinationStream';
import type { CoordinationStreamEvent } from '@/lib/coordinationApi';
import { Button } from '@/components/ui/button';

type CoordinationEventFeedProps = {
  events: CoordinationStreamEvent[];
  paused: boolean;
  connectionState: CoordinationConnectionState;
  error: string | null;
  onTogglePaused: () => void;
  onClear: () => void;
};

function statusTone(connectionState: CoordinationConnectionState) {
  if (connectionState === 'connected') return 'bg-emerald-500/15 text-emerald-700';
  if (connectionState === 'degraded') return 'bg-amber-500/15 text-amber-700';
  if (connectionState === 'disabled') return 'bg-slate-500/15 text-slate-700';
  if (connectionState === 'error') return 'bg-destructive/15 text-destructive';
  return 'bg-muted text-muted-foreground';
}

export function CoordinationEventFeed({
  events,
  paused,
  connectionState,
  error,
  onTogglePaused,
  onClear,
}: CoordinationEventFeedProps) {
  return (
    <section
      data-testid="coordination-event-feed"
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-card/80 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-3 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Live Coordination Feed
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Bounded to the latest 250 task events from the authenticated platform bridge.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            data-testid="coordination-stream-state"
            className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusTone(connectionState)}`}
          >
            {connectionState}
          </span>
          <Button type="button" size="sm" variant="outline" onClick={onTogglePaused}>
            {paused ? 'Resume live feed' : 'Pause live feed'}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onClear}>
            Clear feed
          </Button>
        </div>
      </div>

      {error ? (
        <div className="border-b border-border/70 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {paused ? 'Feed paused. Resume to receive new events.' : 'Waiting for coordination events...'}
          </p>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <li
                key={event.event_id}
                data-testid="coordination-event-row"
                className="rounded-lg border border-border/70 bg-background/70 px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                    <span>{event.event_kind}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {event.task_id}
                    </span>
                    {event.buffered ? (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        buffered
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs text-muted-foreground">{event.occurred_at}</span>
                </div>
                <p className="mt-2 break-all text-xs text-muted-foreground">{event.subject}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
