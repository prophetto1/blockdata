import { useEffect, useMemo, useState } from 'react';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import {
  type PlaneFacetTone,
} from '@/components/superuser/PlatformPlaneCardV2';
import {
  type CoordinationRuntimeCardState,
} from '@/components/superuser/coordinationRuntimeCardState';
import { Button } from '@/components/ui/button';
import { useCoordinationDiscussionsQuery } from '@/hooks/query/useCoordinationDiscussionsQuery';
import { useCoordinationIdentitiesQuery } from '@/hooks/query/useCoordinationIdentitiesQuery';
import { useCoordinationStatusQuery } from '@/hooks/query/useCoordinationStatusQuery';
import { useCoordinationStream } from '@/hooks/useCoordinationStream';
import {
  CoordinationRuntimeDisabledError,
  type CoordinationDiscussionResponse,
  type CoordinationIdentity,
  type CoordinationIdentityResponse,
  type CoordinationStatusResponse,
} from '@/lib/coordinationApi';
import { cn } from '@/lib/utils';

type CoordinationRuntimeSurfaceProps = {
  onStateChange?: (state: CoordinationRuntimeCardState) => void;
};

function statusBadgeClasses(tone: PlaneFacetTone) {
  if (tone === 'healthy') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  if (tone === 'watch') return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  if (tone === 'alert') return 'border-rose-500/20 bg-rose-500/10 text-rose-300';
  return 'border-border/70 bg-background/70 text-muted-foreground';
}

function metricTextClasses(tone: PlaneFacetTone) {
  if (tone === 'healthy') return 'text-emerald-300';
  if (tone === 'watch') return 'text-amber-300';
  if (tone === 'alert') return 'text-rose-300';
  return 'text-foreground';
}

function streamTone(connectionState: string): PlaneFacetTone {
  if (connectionState === 'connected') return 'healthy';
  if (connectionState === 'degraded') return 'watch';
  if (connectionState === 'error') return 'alert';
  return 'muted';
}

function identityTone(identity: CoordinationIdentity | null): PlaneFacetTone {
  if (!identity) return 'muted';
  return identity.stale ? 'watch' : 'healthy';
}

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '--';
  return String(value);
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return '--';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeAge(value: string | null | undefined) {
  if (!value) return '--';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const deltaMs = Date.now() - date.getTime();
  const deltaMinutes = Math.max(0, Math.round(deltaMs / 60000));
  if (deltaMinutes < 1) return 'just now';
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`;
  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}h ago`;
  const deltaDays = Math.round(deltaHours / 24);
  return `${deltaDays}d ago`;
}

function getIdentityKey(identity: CoordinationIdentity, index: number) {
  return [
    identity.host ?? 'unknown-host',
    identity.lease_identity ?? 'unknown-lease',
    identity.identity ?? 'unknown-identity',
    identity.session_agent_id ?? `unknown-session-${index}`,
    identity.family ?? identity.session_classification.key,
  ].join('-');
}

function formatErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function identityDisplayName(identity: CoordinationIdentity) {
  return identity.session_agent_id ?? identity.lease_identity ?? identity.identity ?? 'unknown-agent';
}

function identityMeta(identity: CoordinationIdentity) {
  return [
    identity.host,
    identity.session_classification.display_label,
    identity.family ? `family ${identity.family}` : null,
  ]
    .filter(Boolean)
    .join(' - ');
}

function worstTone(...tones: PlaneFacetTone[]): PlaneFacetTone {
  if (tones.includes('alert')) return 'alert';
  if (tones.includes('watch')) return 'watch';
  if (tones.includes('healthy')) return 'healthy';
  return 'muted';
}

function deriveCoordinationCardState(args: {
  disabledMessage: string | null;
  error: string | null;
  loading: boolean;
  status: CoordinationStatusResponse | null;
  identities: CoordinationIdentityResponse | null;
  discussions: CoordinationDiscussionResponse | null;
}): CoordinationRuntimeCardState {
  const {
    disabledMessage,
    error,
    loading,
    status,
    identities,
    discussions,
  } = args;

  if (disabledMessage) {
    return {
      tone: 'alert',
      facets: [
        { label: 'Connection', tone: 'alert', value: 'runtime disabled' },
        { label: 'Events', tone: 'muted', value: 'bridge inactive' },
        { label: 'Latest', tone: 'muted', value: 'inspect route' },
      ],
    };
  }

  if (error) {
    return {
      tone: 'alert',
      facets: [
        { label: 'Connection', tone: 'alert', value: 'runtime error' },
        { label: 'Events', tone: 'alert', value: error },
        { label: 'Latest', tone: 'muted', value: 'inspect route' },
      ],
    };
  }

  if (loading || !status || !identities || !discussions) {
    return {
      tone: 'watch',
      facets: [
        { label: 'Connection', tone: 'watch', value: 'loading runtime' },
        { label: 'Events', tone: 'muted', value: 'fetching queue' },
        { label: 'Latest', tone: 'muted', value: 'awaiting identities' },
      ],
    };
  }

  const brokerHealthy = status.broker.state === 'available';
  const bridgeState = status.stream_bridge.state ?? 'idle';
  const bridgeTone = brokerHealthy && bridgeState === 'connected' ? 'healthy' : streamTone(bridgeState);
  const pendingCount = discussions.summary.pending_count ?? status.discussion_summary.pending_count ?? 0;
  const bufferedCount = status.local_host_outbox_backlog.events ?? 0;
  const eventTone = bufferedCount > 0 ? 'alert' : pendingCount > 0 ? 'watch' : 'healthy';
  const activeCount = identities.summary.active_count ?? status.identity_summary.active_count ?? 0;
  const staleCount = identities.summary.stale_count ?? status.identity_summary.stale_count ?? 0;
  const latestTone = staleCount > 0 ? 'watch' : activeCount > 0 ? 'healthy' : 'muted';

  return {
    tone: worstTone(bridgeTone, eventTone, latestTone),
    facets: [
      {
        label: 'Connection',
        tone: bridgeTone,
        value: brokerHealthy && bridgeState === 'connected'
          ? 'connected'
          : `${status.broker.state} / ${bridgeState}`,
      },
      {
        label: 'Events',
        tone: eventTone,
        value: bufferedCount > 0
          ? `${bufferedCount} buffered`
          : pendingCount > 0
            ? `${pendingCount} pending`
            : 'feed ready',
      },
      {
        label: 'Latest',
        tone: latestTone,
        value: `${activeCount} active / ${staleCount} stale`,
      },
    ],
  };
}

function CoordinationMetricTile({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string | number;
  note: string;
  tone: PlaneFacetTone;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/80 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className={cn('text-3xl font-semibold tracking-tight', metricTextClasses(tone))}>{value}</p>
        <p className="pb-0.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}

function CoordinationRuntimeHeaderBand({
  status,
  loading,
  connectionState,
}: {
  status: CoordinationStatusResponse | null;
  loading: boolean;
  connectionState: string;
}) {
  const brokerOk = status?.broker.state === 'available';
  const bridgeOk = status?.stream_bridge.state === 'connected';
  const classifiedCount = status?.session_classification_summary.classified_count ?? 0;
  const unknownCount = status?.session_classification_summary.unknown_count ?? 0;
  const tiles = [
    {
      label: 'ACTIVE',
      value: loading ? '...' : status?.identity_summary.active_count ?? 0,
      note: 'running',
      tone: status && (status.identity_summary.active_count ?? 0) > 0 ? 'healthy' : 'muted',
    },
    {
      label: 'PENDING',
      value: loading ? '...' : status?.discussion_summary.pending_count ?? 0,
      note: 'threads',
      tone: status && (status.discussion_summary.pending_count ?? 0) > 0 ? 'watch' : 'muted',
    },
    {
      label: 'STALE',
      value: loading ? '...' : status?.identity_summary.stale_count ?? 0,
      note: 'identities',
      tone: status && (status.identity_summary.stale_count ?? 0) > 0 ? 'watch' : 'muted',
    },
    {
      label: 'BUFFERED',
      value: loading ? '...' : status?.local_host_outbox_backlog.events ?? 0,
      note: 'events',
      tone: status && (status.local_host_outbox_backlog.events ?? 0) > 0 ? 'alert' : 'muted',
    },
  ] as const;

  return (
    <div className="border-b border-border/70 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1',
              brokerOk && bridgeOk ? statusBadgeClasses('healthy') : statusBadgeClasses(streamTone(connectionState)),
            )}
          >
            <span className="h-2 w-2 rounded-full bg-current" />
            {loading ? 'loading' : brokerOk && bridgeOk ? 'healthy' : status?.stream_bridge.state ?? connectionState}
          </span>
          <span>{loading ? 'broker ...' : `broker ${status?.broker.state ?? '--'}`}</span>
          <span>{loading ? 'bridge ...' : `bridge ${status?.stream_bridge.state ?? '--'}`}</span>
          <span>{loading ? 'classification ...' : `${classifiedCount} classified / ${unknownCount} unknown`}</span>
        </div>
        <span className={cn('rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em]', statusBadgeClasses('muted'))}>
          live runtime
        </span>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-4">
        {tiles.map((tile) => (
          <CoordinationMetricTile key={tile.label} {...tile} />
        ))}
      </div>
    </div>
  );
}

function CoordinationIdentityWorkbench({
  data,
  loading,
  selectedKey,
  onSelect,
}: {
  data: CoordinationIdentityResponse | null;
  loading: boolean;
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const identities = data?.identities ?? [];

  return (
    <section className="rounded-xl border border-border/70 bg-card/80">
      <div className="border-b border-border/70 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-[0.16em] text-foreground">IDENTITIES</h2>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/70 bg-background/60 px-3 py-1">
              {loading ? 'Loading...' : `${data?.summary.active_count ?? 0} active`}
            </span>
            <span className="rounded-full border border-border/70 bg-background/60 px-3 py-1">
              {loading ? 'Loading...' : `${data?.summary.stale_count ?? 0} stale`}
            </span>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border/70">
        {loading ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">Loading claimed identities...</p>
        ) : identities.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">No claimed identities are currently visible.</p>
        ) : (
          identities.map((identity, index) => {
            const key = getIdentityKey(identity, index);
            const selected = key === selectedKey;
            const updatedAt = identity.last_heartbeat_at ?? identity.claimed_at;

            return (
              <button
                key={key}
                type="button"
                aria-label={identityDisplayName(identity)}
                aria-pressed={selected}
                onClick={() => onSelect(key)}
                className={cn(
                  'grid w-full gap-3 px-4 py-3 text-left text-sm transition-colors md:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_120px_88px]',
                  selected ? 'bg-accent/40' : 'bg-transparent hover:bg-accent/20',
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'h-2.5 w-2.5 rounded-full',
                        identity.stale ? 'bg-amber-400' : 'bg-emerald-400',
                      )}
                    />
                    <p className="truncate font-medium text-foreground">{identityDisplayName(identity)}</p>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-[0.18em]', statusBadgeClasses(identityTone(identity)))}>
                      {identity.stale ? 'stale' : 'active'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{identityMeta(identity)}</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p className="uppercase tracking-[0.18em] text-muted-foreground">lease</p>
                  <p className="mt-1 text-foreground">{formatValue(identity.lease_identity)}</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p className="uppercase tracking-[0.18em] text-muted-foreground">updated</p>
                  <p className="mt-1 text-foreground">{formatTimestamp(updatedAt)}</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p className="uppercase tracking-[0.18em] text-muted-foreground">age</p>
                  <p className="mt-1 text-foreground">{formatRelativeAge(updatedAt)}</p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}

function CoordinationIdentityInspector({
  identity,
}: {
  identity: CoordinationIdentity | null;
}) {
  const surface = identity
    ? `${identity.session_classification.container_host} / ${identity.session_classification.runtime_product.toUpperCase()}`
    : '--';

  return (
    <aside className="rounded-xl border border-border/70 bg-card/80">
      <div className="border-b border-border/70 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-[0.16em] text-foreground">INSPECTOR</h2>
      </div>

      <div className="space-y-4 px-4 py-4 text-sm text-muted-foreground">
        {identity ? (
          <>
            <div>
              <p className="font-medium text-foreground">{identityDisplayName(identity)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {identity.host ?? 'unknown host'} - {identity.session_classification.display_label}
              </p>
            </div>

            <dl className="space-y-3">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Connection</dt>
                <dd className="mt-1 text-foreground">{identity.stale ? 'stale' : 'active'}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Surface</dt>
                <dd className="mt-1 text-foreground">{surface}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Host</dt>
                <dd className="mt-1 text-foreground">{formatValue(identity.host)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Lease id</dt>
                <dd className="mt-1 text-foreground">{formatValue(identity.lease_identity)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Revision</dt>
                <dd className="mt-1 text-foreground">{formatValue(identity.revision)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Claimed</dt>
                <dd className="mt-1 text-foreground">{formatTimestamp(identity.claimed_at)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Last heartbeat</dt>
                <dd className="mt-1 text-foreground">{formatTimestamp(identity.last_heartbeat_at)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Expires</dt>
                <dd className="mt-1 text-foreground">{formatTimestamp(identity.expires_at)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Provenance</dt>
                <dd className="mt-1 text-foreground">{identity.session_classification.provenance.key}</dd>
              </div>
            </dl>

            {identity.session_classification.reason ? (
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200">Classification note</p>
                <p className="mt-2 text-sm text-amber-100">{identity.session_classification.reason}</p>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Select an identity to inspect its lease and runtime details.</p>
        )}
      </div>
    </aside>
  );
}

function CoordinationDiscussionPanel({
  data,
  loading,
}: {
  data: CoordinationDiscussionResponse | null;
  loading: boolean;
}) {
  const discussions = data?.discussions ?? [];

  return (
    <section
      data-testid="coordination-discussion-queue"
      className="rounded-xl border border-border/70 bg-card/80"
    >
      <div className="border-b border-border/70 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-[0.16em] text-foreground">Discussion Queue</h2>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border/70 bg-background/60 px-3 py-1">
              {loading ? 'Loading...' : `${data?.summary.thread_count ?? 0} threads`}
            </span>
            <span className="rounded-full border border-border/70 bg-background/60 px-3 py-1">
              {loading ? 'Loading...' : `${data?.summary.pending_count ?? 0} pending`}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading discussion threads...</p>
        ) : discussions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No discussion threads are currently projected.</p>
        ) : (
          discussions.map((discussion) => (
            <div key={discussion.task_id} className="rounded-lg border border-border/70 bg-background/60 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">{discussion.task_id}</p>
                <span className="text-xs text-muted-foreground">{discussion.updated_at ?? '--'}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {discussion.last_event_kind ?? 'No event kind'} - {discussion.workspace_path ?? 'No workspace path'}
              </p>
              {discussion.directional_doc ? (
                <p className="mt-2 break-all text-xs text-muted-foreground">{discussion.directional_doc}</p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function CoordinationRuntimeLivePanel() {
  const stream = useCoordinationStream();
  const [expanded, setExpanded] = useState(false);

  if (stream.connectionState === 'disabled') {
    return (
      <section
        data-testid="coordination-runtime-disabled"
        className="rounded-xl border border-border/70 bg-card/80 px-4 py-4 text-sm text-muted-foreground shadow-sm"
      >
        {stream.disabledReason ?? 'Coordination runtime is disabled.'}
      </section>
    );
  }

  const visibleEvents = expanded ? stream.events.slice().reverse() : stream.events.slice(-3).reverse();

  return (
    <section className="rounded-xl border border-border/70 bg-card/80">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold tracking-[0.16em] text-foreground">Live events</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {expanded ? 'Expanded stream tail from the authenticated coordination bridge.' : 'Supporting evidence stays compact until you need the full tail.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]', statusBadgeClasses(streamTone(stream.connectionState)))}>
            {stream.connectionState}
          </span>
          <Button type="button" size="sm" variant="outline" onClick={stream.togglePaused}>
            {stream.paused ? 'Resume live' : 'Pause live'}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setExpanded((current) => !current)}>
            {expanded ? 'Collapse' : 'Expand'}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={stream.clear}>
            Clear feed
          </Button>
        </div>
      </div>

      {stream.error ? (
        <div className="border-b border-border/70 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {stream.error}
        </div>
      ) : null}

      <div className="space-y-2 px-4 py-4 text-xs text-muted-foreground">
        {visibleEvents.length === 0 ? (
          <p>{stream.paused ? 'Feed paused. Resume to receive new events.' : 'Waiting for coordination events...'}</p>
        ) : (
          visibleEvents.map((event) => (
            <div key={event.event_id} className="rounded-lg border border-border/70 bg-background/60 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-foreground">
                  <span className="font-medium">{event.event_kind}</span> {event.task_id}
                </p>
                <span>{formatTimestamp(event.occurred_at)}</span>
              </div>
              <p className="mt-1 break-all text-muted-foreground">{event.subject}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export function CoordinationRuntimeSurface({
  onStateChange,
}: CoordinationRuntimeSurfaceProps) {
  const statusQuery = useCoordinationStatusQuery();
  const identitiesQuery = useCoordinationIdentitiesQuery({
    enabled: statusQuery.isSuccess,
    includeStale: false,
  });
  const discussionsQuery = useCoordinationDiscussionsQuery({
    enabled: statusQuery.isSuccess,
    status: 'all',
    limit: 50,
  });
  const [selectedIdentityKey, setSelectedIdentityKey] = useState<string | null>(null);

  const disabledMessage = statusQuery.error instanceof CoordinationRuntimeDisabledError
    ? statusQuery.error.message
    : null;
  const queryError = disabledMessage
    ? null
    : statusQuery.error ?? identitiesQuery.error ?? discussionsQuery.error ?? null;
  const loading = statusQuery.isPending
    || (statusQuery.isSuccess && (identitiesQuery.isPending || discussionsQuery.isPending));
  const hasRuntimeData = statusQuery.isSuccess && identitiesQuery.isSuccess && discussionsQuery.isSuccess;
  const error = queryError ? formatErrorMessage(queryError) : null;
  const status = hasRuntimeData ? statusQuery.data : null;
  const identities = hasRuntimeData ? identitiesQuery.data : null;
  const discussions = hasRuntimeData ? discussionsQuery.data : null;

  const cardState = useMemo(
    () =>
      deriveCoordinationCardState({
        disabledMessage,
        error,
        loading,
        status,
        identities,
        discussions,
      }),
    [disabledMessage, discussions, error, identities, loading, status],
  );

  useEffect(() => {
    onStateChange?.(cardState);
  }, [cardState, onStateChange]);

  const identityRows = useMemo(() => identities?.identities ?? [], [identities?.identities]);
  const effectiveSelectedIdentityKey = useMemo(() => {
    if (identityRows.length === 0) {
      return null;
    }

    const selectedStillExists = selectedIdentityKey !== null
      && identityRows.some((identity, index) => getIdentityKey(identity, index) === selectedIdentityKey);

    return selectedStillExists ? selectedIdentityKey : getIdentityKey(identityRows[0], 0);
  }, [identityRows, selectedIdentityKey]);

  const selectedIdentity = useMemo(() => {
    if (identityRows.length === 0) return null;
    const match = identityRows.find((identity, index) => getIdentityKey(identity, index) === effectiveSelectedIdentityKey);
    return match ?? identityRows[0];
  }, [effectiveSelectedIdentityKey, identityRows]);

  return (
    <>
      {error ? <ErrorAlert message={error} /> : null}

      {disabledMessage ? (
        <section
          data-testid="coordination-runtime-disabled"
          className="rounded-xl border border-border/70 bg-card/80 px-4 py-4 text-sm text-muted-foreground shadow-sm"
        >
          {disabledMessage}
        </section>
      ) : (
        <section
          data-testid="coordination-runtime-surface"
          className="overflow-hidden rounded-[24px] border border-border/70 bg-card text-foreground shadow-sm"
        >
          <CoordinationRuntimeHeaderBand
            status={status}
            loading={loading}
            connectionState={status?.stream_bridge.state ?? 'idle'}
          />

          <div className="space-y-4 p-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_320px]">
              <CoordinationIdentityWorkbench
                data={identities}
                loading={loading}
                selectedKey={effectiveSelectedIdentityKey}
                onSelect={setSelectedIdentityKey}
              />
              <CoordinationIdentityInspector identity={selectedIdentity} />
            </div>

            <CoordinationDiscussionPanel data={discussions} loading={loading} />

            {!loading ? <CoordinationRuntimeLivePanel /> : null}
          </div>
        </section>
      )}
    </>
  );
}
