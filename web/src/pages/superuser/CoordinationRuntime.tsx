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
  type CoordinationClassificationProvenance,
  type CoordinationDiscussionResponse,
  type CoordinationIdentityResponse,
  type CoordinationSessionTypeKey,
  type CoordinationStatusResponse,
} from '@/lib/coordinationApi';
import {
  COORDINATION_SESSION_CLASSIFICATION_LABELS,
  COORDINATION_SESSION_CLASSIFICATION_TYPE_ORDER,
} from '@/lib/coordinationSessionClassification';

const PROVENANCE_ORDER = ['launch_stamped', 'runtime_observed', 'configured', 'inferred', 'unknown'] as const;
const EMPTY_COUNTS_BY_TYPE: Record<CoordinationSessionTypeKey, number> = {
  'vscode.cc.cli': 0,
  'vscode.cdx.cli': 0,
  'vscode.cc.ide-panel': 0,
  'vscode.cdx.ide-panel': 0,
  'claude-desktop.cc': 0,
  'codex-app-win.cdx': 0,
  'terminal.cc': 0,
  'terminal.cdx': 0,
  unknown: 0,
};
const EMPTY_COUNTS_BY_PROVENANCE: Record<CoordinationClassificationProvenance, number> = {
  launch_stamped: 0,
  runtime_observed: 0,
  configured: 0,
  inferred: 0,
  unknown: 0,
};

function CoordinationSessionClassificationSummary({
  status,
  loading,
}: {
  status: CoordinationStatusResponse | null;
  loading: boolean;
}) {
  const summary = status?.session_classification_summary;
  const countsByType = summary?.counts_by_type ?? EMPTY_COUNTS_BY_TYPE;
  const countsByProvenance = summary?.counts_by_provenance ?? EMPTY_COUNTS_BY_PROVENANCE;

  const activeTypeCounts = COORDINATION_SESSION_CLASSIFICATION_TYPE_ORDER.filter(
    (key) => (countsByType[key] ?? 0) > 0,
  );
  const activeProvenanceCounts = PROVENANCE_ORDER.filter((key) => (countsByProvenance[key] ?? 0) > 0);

  return (
    <section
      data-testid="coordination-session-classification-summary"
      className="rounded-xl border border-border/70 bg-card/80 px-4 py-4 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Session Classification</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Server-owned labels resolved from the coordination runtime without replacing the underlying lease record.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">
            {loading ? 'Loading...' : `${summary?.classified_count ?? 0} classified`}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">
            {loading ? 'Loading...' : `${summary?.unknown_count ?? 0} unknown`}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Counts By Type
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {loading ? (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground">Loading...</span>
            ) : activeTypeCounts.length > 0 ? (
              activeTypeCounts.map((key) => (
                <span key={key} className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground">
                  {COORDINATION_SESSION_CLASSIFICATION_LABELS[key]}: {countsByType[key]}
                </span>
              ))
            ) : (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground">No classified sessions</span>
            )}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Counts By Provenance
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {loading ? (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground">Loading...</span>
            ) : activeProvenanceCounts.length > 0 ? (
              activeProvenanceCounts.map((key) => (
                <span key={key} className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground">
                  {key}: {countsByProvenance[key]}
                </span>
              ))
            ) : (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground">No provenance data</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

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
          <CoordinationSessionClassificationSummary status={status} loading={loading} />
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
