import { CoordinationStatusSummary } from '@/components/superuser/CoordinationStatusSummary';
import type { CoordinationConnectionState } from '@/hooks/useCoordinationStream';
import type {
  CoordinationDiscussionResponse,
  CoordinationIdentityResponse,
  CoordinationStatusResponse,
  CoordinationStreamEvent,
} from '@/lib/coordinationApi';

type ControlTowerCoordinationPanelProps = {
  loading: boolean;
  status: CoordinationStatusResponse | null;
  identities: CoordinationIdentityResponse | null;
  discussions: CoordinationDiscussionResponse | null;
  connectionState: CoordinationConnectionState;
  streamError: string | null;
  showTimeline: boolean;
  events: CoordinationStreamEvent[];
};

function connectionTone(connectionState: CoordinationConnectionState) {
  if (connectionState === 'connected') return 'bg-emerald-500/12 text-emerald-700';
  if (connectionState === 'degraded') return 'bg-amber-500/12 text-amber-700';
  if (connectionState === 'error') return 'bg-rose-500/12 text-rose-700';
  return 'bg-stone-200 text-stone-700';
}

export function ControlTowerCoordinationPanel({
  loading,
  status,
  identities,
  discussions,
  connectionState,
  streamError,
  showTimeline,
  events,
}: ControlTowerCoordinationPanelProps) {
  const recentEvents = [...events].slice(-4).reverse();
  const routingDetail =
    discussions?.discussions[0]?.workspace_path
    ?? status?.app_runtime.runtime_root
    ?? identities?.identities[0]?.host
    ?? 'Routing detail not yet observed';

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
      <div className="space-y-4">
        <CoordinationStatusSummary status={status} loading={loading} />

        <section className="rounded-[24px] border border-stone-300 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                Coordination Snapshot
              </p>
              <h3 className="mt-1 text-sm font-semibold text-stone-950">Identity, discussion, and ownership routing</h3>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${connectionTone(connectionState)}`}>
              {connectionState}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-stone-200 bg-[#faf7f3] px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">Identities</p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">{identities?.summary.active_count ?? 0}</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-[#faf7f3] px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">Discussions</p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">{discussions?.summary.thread_count ?? 0}</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-[#faf7f3] px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">Pending recipients</p>
              <p className="mt-2 text-2xl font-semibold text-stone-950">{discussions?.summary.pending_count ?? 0}</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-stone-200 bg-[#faf7f3] px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">Routing or ownership detail</p>
            <p className="mt-2 break-all text-sm font-medium text-stone-950">{routingDetail}</p>
            <p className="mt-1 text-sm text-stone-600">
              {streamError ?? 'The coordination plane stays readable even when the live stream is quiet.'}
            </p>
          </div>
        </section>
      </div>

      <section className="rounded-[24px] border border-stone-300 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">
              Coordination Timeline
            </p>
            <h3 className="mt-1 text-sm font-semibold text-stone-950">Current routing and stream posture</h3>
          </div>
          <span className="rounded-full bg-[#f3ece7] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-600">
            {showTimeline ? 'Visible' : 'Hidden'}
          </span>
        </div>

        {showTimeline ? (
          recentEvents.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {recentEvents.map((event) => (
                <li key={event.event_id} className="rounded-xl border border-stone-200 bg-[#faf7f3] px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-stone-950">{event.event_kind}</p>
                    <span className="text-xs text-stone-500">{event.occurred_at}</span>
                  </div>
                  <p className="mt-1 text-xs text-stone-600">{event.subject}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-[#faf7f3] px-3 py-4 text-sm text-stone-600">
              {loading ? 'Waiting for coordination data...' : 'No recent stream events have reached this surface yet.'}
            </div>
          )
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-stone-300 bg-[#faf7f3] px-3 py-4 text-sm text-stone-600">
            Timeline is hidden, but the live connection state above still reflects the current bridge posture.
          </div>
        )}
      </section>
    </div>
  );
}
