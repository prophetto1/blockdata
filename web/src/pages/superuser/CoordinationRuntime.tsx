import { useCallback, useEffect, useState } from 'react';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { WorkbenchPage } from '@/components/common/WorkbenchPage';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { CoordinationDiscussionQueue } from '@/components/superuser/CoordinationDiscussionQueue';
import { CoordinationEventFeed } from '@/components/superuser/CoordinationEventFeed';
import { CoordinationIdentityTable } from '@/components/superuser/CoordinationIdentityTable';
import { CoordinationStatusSummary } from '@/components/superuser/CoordinationStatusSummary';
import { Button } from '@/components/ui/button';
import { useCoordinationStream } from '@/hooks/useCoordinationStream';
import {
  getCoordinationDiscussions,
  getCoordinationIdentities,
  CoordinationRuntimeDisabledError,
  getCoordinationStatus,
  type CoordinationDiscussionResponse,
  type CoordinationIdentityResponse,
  type CoordinationStatusResponse,
} from '@/lib/coordinationApi';

function CoordinationRuntimeLive() {
  const stream = useCoordinationStream();

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

  return (
    <CoordinationEventFeed
      events={stream.events}
      paused={stream.paused}
      connectionState={stream.connectionState}
      error={stream.error}
      onTogglePaused={stream.togglePaused}
      onClear={stream.clear}
    />
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

  const loadStatus = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const nextStatus = await getCoordinationStatus();
      const [nextIdentities, nextDiscussions] = await Promise.all([
        getCoordinationIdentities({ includeStale: true }),
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

  return (
    <WorkbenchPage
      eyebrow="Broker-backed admin runtime"
      title="Coordination Runtime"
      description="Observe broker health, bridge state, local backlog, and the live event stream through the authenticated platform-api seam."
      actions={(
        <Button type="button" size="sm" variant="outline" onClick={() => void loadStatus()} disabled={refreshing}>
          {refreshing ? 'Refreshing...' : 'Refresh status'}
        </Button>
      )}
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
        <>
          <CoordinationStatusSummary status={status} loading={loading} />
          <div className="grid gap-4 xl:grid-cols-2">
            <CoordinationIdentityTable data={identities} loading={loading} />
            <CoordinationDiscussionQueue data={discussions} loading={loading} />
          </div>
          {!loading ? <CoordinationRuntimeLive /> : null}
        </>
      )}
    </WorkbenchPage>
  );
}
