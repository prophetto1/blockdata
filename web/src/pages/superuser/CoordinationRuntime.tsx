import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconRefresh } from '@tabler/icons-react';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { WorkbenchPage } from '@/components/common/WorkbenchPage';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Button } from '@/components/ui/button';
import { useCoordinationStream } from '@/hooks/useCoordinationStream';
import {
  CoordinationRuntimeDisabledError,
  type CoordinationDiscussionResponse,
  type CoordinationIdentity,
  type CoordinationIdentityResponse,
  type CoordinationStatusResponse,
  getCoordinationDiscussions,
  getCoordinationIdentities,
  getCoordinationStatus,
} from '@/lib/coordinationApi';
import { cn } from '@/lib/utils';

function statusBadgeClasses(tone: 'healthy' | 'watch' | 'alert' | 'muted') {
  if (tone === 'healthy') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (tone === 'watch') return 'border-amber-400/25 bg-amber-400/10 text-amber-100';
  if (tone === 'alert') return 'border-rose-500/25 bg-rose-500/10 text-rose-200';
  return 'border-white/10 bg-white/5 text-slate-300';
}

function metricTextClasses(tone: 'healthy' | 'watch' | 'alert' | 'muted') {
  if (tone === 'healthy') return 'text-emerald-300';
  if (tone === 'watch') return 'text-amber-300';
  if (tone === 'alert') return 'text-rose-300';
  return 'text-slate-100';
}

function streamTone(connectionState: string) {
  if (connectionState === 'connected') return 'healthy';
  if (connectionState === 'degraded') return 'watch';
  if (connectionState === 'error') return 'alert';
  return 'muted';
}

function identityTone(identity: CoordinationIdentity | null) {
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
    identity.lease_identity ?? identity.identity ?? identity.session_agent_id ?? 'unknown-identity',
    identity.revision ?? identity.claimed_at ?? `row-${index}`,
    index,
  ].join('-');
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

function CoordinationMetricTile({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string | number;
  note: string;
  tone: 'healthy' | 'watch' | 'alert' | 'muted';
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className={cn('text-4xl font-semibold tracking-tight', metricTextClasses(tone))}>{value}</p>
        <p className="pb-1 text-xs uppercase tracking-[0.2em] text-slate-500">{note}</p>
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
    <div className="border-b border-slate-800/90 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
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
        <span className={cn('rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em]', statusBadgeClasses('muted'))}>
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
    <section className="rounded-2xl border border-slate-800 bg-slate-950/85">
      <div className="border-b border-slate-800 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-[0.18em] text-slate-100">IDENTITIES</h2>
          <div className="flex flex-wrap gap-2 text-xs text-slate-400">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {loading ? 'Loading...' : `${data?.summary.active_count ?? 0} active`}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {loading ? 'Loading...' : `${data?.summary.stale_count ?? 0} stale`}
            </span>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-800">
        {loading ? (
          <p className="px-4 py-4 text-sm text-slate-400">Loading claimed identities...</p>
        ) : identities.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-400">No claimed identities are currently visible.</p>
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
                  selected ? 'bg-sky-400/10' : 'bg-transparent hover:bg-white/[0.03]',
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
                    <p className="truncate font-medium text-slate-100">{identityDisplayName(identity)}</p>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-[0.18em]', statusBadgeClasses(identityTone(identity)))}>
                      {identity.stale ? 'stale' : 'active'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{identityMeta(identity)}</p>
                </div>
                <div className="text-xs text-slate-400">
                  <p className="uppercase tracking-[0.18em] text-slate-500">lease</p>
                  <p className="mt-1 text-slate-200">{formatValue(identity.lease_identity)}</p>
                </div>
                <div className="text-xs text-slate-400">
                  <p className="uppercase tracking-[0.18em] text-slate-500">updated</p>
                  <p className="mt-1 text-slate-200">{formatTimestamp(updatedAt)}</p>
                </div>
                <div className="text-xs text-slate-400">
                  <p className="uppercase tracking-[0.18em] text-slate-500">age</p>
                  <p className="mt-1 text-slate-200">{formatRelativeAge(updatedAt)}</p>
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
    <aside className="rounded-2xl border border-slate-800 bg-slate-950/90">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-[0.18em] text-slate-100">INSPECTOR</h2>
      </div>

      <div className="space-y-4 px-4 py-4 text-sm text-slate-200">
        {identity ? (
          <>
            <div>
              <p className="font-medium text-slate-100">{identityDisplayName(identity)}</p>
              <p className="mt-1 text-xs text-slate-500">
                {identity.host ?? 'unknown host'} - {identity.session_classification.display_label}
              </p>
            </div>

            <dl className="space-y-3">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Connection</dt>
                <dd className="mt-1 text-slate-100">{identity.stale ? 'stale' : 'active'}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Surface</dt>
                <dd className="mt-1 text-slate-100">{surface}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Host</dt>
                <dd className="mt-1 text-slate-100">{formatValue(identity.host)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Lease id</dt>
                <dd className="mt-1 text-slate-100">{formatValue(identity.lease_identity)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Revision</dt>
                <dd className="mt-1 text-slate-100">{formatValue(identity.revision)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Claimed</dt>
                <dd className="mt-1 text-slate-100">{formatTimestamp(identity.claimed_at)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Last heartbeat</dt>
                <dd className="mt-1 text-slate-100">{formatTimestamp(identity.last_heartbeat_at)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Expires</dt>
                <dd className="mt-1 text-slate-100">{formatTimestamp(identity.expires_at)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Provenance</dt>
                <dd className="mt-1 text-slate-100">{identity.session_classification.provenance.key}</dd>
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
          <p className="text-sm text-slate-400">Select an identity to inspect its lease and runtime details.</p>
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
      className="rounded-2xl border border-slate-800 bg-slate-950/85"
    >
      <div className="border-b border-slate-800 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-[0.18em] text-slate-100">Discussion Queue</h2>
          <div className="flex flex-wrap gap-2 text-xs text-slate-400">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {loading ? 'Loading...' : `${data?.summary.thread_count ?? 0} threads`}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {loading ? 'Loading...' : `${data?.summary.pending_count ?? 0} pending`}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        {loading ? (
          <p className="text-sm text-slate-400">Loading discussion threads...</p>
        ) : discussions.length === 0 ? (
          <p className="text-sm text-slate-400">No discussion threads are currently projected.</p>
        ) : (
          discussions.map((discussion) => (
            <div key={discussion.task_id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-100">{discussion.task_id}</p>
                <span className="text-xs text-sky-200">{discussion.updated_at ?? '--'}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {discussion.last_event_kind ?? 'No event kind'} - {discussion.workspace_path ?? 'No workspace path'}
              </p>
              {discussion.directional_doc ? (
                <p className="mt-2 break-all text-xs text-slate-500">{discussion.directional_doc}</p>
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
    <section className="rounded-2xl border border-slate-800 bg-slate-950/75">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold tracking-[0.18em] text-slate-100">Live events</h2>
          <p className="mt-1 text-xs text-slate-500">
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
        <div className="border-b border-slate-800 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {stream.error}
        </div>
      ) : null}

      <div className="space-y-2 px-4 py-4 text-xs text-slate-400">
        {visibleEvents.length === 0 ? (
          <p>{stream.paused ? 'Feed paused. Resume to receive new events.' : 'Waiting for coordination events...'}</p>
        ) : (
          visibleEvents.map((event) => (
            <div key={event.event_id} className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-slate-200">
                  <span className="font-medium">{event.event_kind}</span> {event.task_id}
                </p>
                <span>{formatTimestamp(event.occurred_at)}</span>
              </div>
              <p className="mt-1 break-all text-slate-500">{event.subject}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export function Component() {
  useShellHeaderTitle({
    title: 'Coordination Runtime',
    breadcrumbs: ['Superuser', 'Coordination Runtime'],
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disabledMessage, setDisabledMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<CoordinationStatusResponse | null>(null);
  const [identities, setIdentities] = useState<CoordinationIdentityResponse | null>(null);
  const [discussions, setDiscussions] = useState<CoordinationDiscussionResponse | null>(null);
  const [selectedIdentityKey, setSelectedIdentityKey] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const nextStatus = await getCoordinationStatus();
      const [nextIdentities, nextDiscussions] = await Promise.all([
        getCoordinationIdentities(),
        getCoordinationDiscussions({ status: 'all', limit: 50 }),
      ]);
      setStatus(nextStatus);
      setIdentities(nextIdentities);
      setDiscussions(nextDiscussions);
      setDisabledMessage(null);
    } catch (nextError) {
      if (nextError instanceof CoordinationRuntimeDisabledError) {
        setDisabledMessage(nextError.message);
        setStatus(null);
        setIdentities(null);
        setDiscussions(null);
        setError(null);
      } else {
        setError(nextError instanceof Error ? nextError.message : String(nextError));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const identityRows = identities?.identities ?? [];
  useEffect(() => {
    if (identityRows.length === 0) {
      if (selectedIdentityKey !== null) {
        setSelectedIdentityKey(null);
      }
      return;
    }

    const selectedStillExists = identityRows.some((identity, index) => getIdentityKey(identity, index) === selectedIdentityKey);
    if (!selectedStillExists) {
      setSelectedIdentityKey(getIdentityKey(identityRows[0], 0));
    }
  }, [identityRows, selectedIdentityKey]);

  const selectedIdentity = useMemo(() => {
    if (identityRows.length === 0) return null;
    const match = identityRows.find((identity, index) => getIdentityKey(identity, index) === selectedIdentityKey);
    return match ?? identityRows[0];
  }, [identityRows, selectedIdentityKey]);

  return (
    <WorkbenchPage
      eyebrow="Live coordination operator console"
      title="Coordination Runtime"
      description="Ranked runtime state, identity ownership, discussion queue, and live event evidence through the authenticated platform-api seam."
      actions={(
        <Button type="button" size="sm" variant="outline" onClick={() => void loadStatus()} disabled={refreshing}>
          <IconRefresh aria-hidden="true" className={cn(refreshing && 'animate-spin')} stroke={1.8} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      )}
      contentClassName="gap-4 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.10),_transparent_32%),linear-gradient(180deg,_rgba(2,6,23,0.10),_transparent_28%)]"
    >
      {error ? <ErrorAlert message={error} /> : null}

      {disabledMessage ? (
        <section
          data-testid="coordination-runtime-disabled"
          className="rounded-xl border border-border/70 bg-card/80 px-4 py-4 text-sm text-muted-foreground shadow-sm"
        >
          {disabledMessage}
        </section>
      ) : (
        <section className="overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900 text-slate-100 shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
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
                selectedKey={selectedIdentityKey}
                onSelect={setSelectedIdentityKey}
              />
              <CoordinationIdentityInspector identity={selectedIdentity} />
            </div>

            <CoordinationDiscussionPanel data={discussions} loading={loading} />

            {!loading ? <CoordinationRuntimeLivePanel /> : null}
          </div>
        </section>
      )}
    </WorkbenchPage>
  );
}
