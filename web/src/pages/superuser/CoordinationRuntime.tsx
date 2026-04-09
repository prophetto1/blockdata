import { useCallback, useEffect, useState } from 'react';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { WorkbenchPage } from '@/components/common/WorkbenchPage';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { CoordinationEventFeed } from '@/components/superuser/CoordinationEventFeed';
import { CoordinationStatusSummary } from '@/components/superuser/CoordinationStatusSummary';
import { Button } from '@/components/ui/button';
import { useCoordinationStream } from '@/hooks/useCoordinationStream';
import {
  CoordinationRuntimeDisabledError,
  getCoordinationStatus,
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

  const loadStatus = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const nextStatus = await getCoordinationStatus();
      setStatus(nextStatus);
      setDisabledMessage(null);
    } catch (nextError) {
      if (nextError instanceof CoordinationRuntimeDisabledError) {
        setDisabledMessage(nextError.message);
        setStatus(null);
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
          {!loading ? <CoordinationRuntimeLive /> : null}
        </>
      )}
    </WorkbenchPage>
  );
}
