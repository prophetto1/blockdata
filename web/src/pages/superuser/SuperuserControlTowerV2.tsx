import { useMemo } from 'react';
import {
  IconClipboardList,
  IconCode,
  IconPlugConnected,
  IconRefresh,
  IconRoute,
  IconServer,
} from '@tabler/icons-react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { ControlTowerV2ErrorNotice } from '@/components/superuser/ControlTowerV2ErrorNotice';
import { ControlTowerV2PageFrame } from '@/components/superuser/ControlTowerV2PageFrame';
import {
  PlatformPlaneCardV2,
  type PlaneFacet,
  type PlaneFacetTone,
} from '@/components/superuser/PlatformPlaneCardV2';
import { useCoordinationDiscussionsQuery } from '@/hooks/query/useCoordinationDiscussionsQuery';
import { useCoordinationIdentitiesQuery } from '@/hooks/query/useCoordinationIdentitiesQuery';
import { useCoordinationStatusQuery } from '@/hooks/query/useCoordinationStatusQuery';
import { useOperationalReadinessSnapshotQuery } from '@/hooks/query/useOperationalReadinessSnapshotQuery';
import { useCoordinationStream } from '@/hooks/useCoordinationStream';
import { superuserKeys } from '@/lib/queryKeys/superuserKeys';
import {
  TOOLBAR_BUTTON_BASE,
  TOOLBAR_BUTTON_STATES,
} from '@/lib/toolbar-contract';
import { cn } from '@/lib/utils';

function worstTone(tones: PlaneFacetTone[]): PlaneFacetTone {
  if (tones.includes('alert')) return 'alert';
  if (tones.includes('watch')) return 'watch';
  if (tones.some((t) => t === 'healthy')) return 'healthy';
  return 'muted';
}

export function Component() {
  const queryClient = useQueryClient();
  const readinessQuery = useOperationalReadinessSnapshotQuery();
  const coordinationStatusQuery = useCoordinationStatusQuery();
  const coordinationIdentitiesQuery = useCoordinationIdentitiesQuery({ includeStale: true });
  const coordinationDiscussionsQuery = useCoordinationDiscussionsQuery({ status: 'all', limit: 50 });
  const fetchingCount = useIsFetching({ queryKey: superuserKeys.all });
  const coordinationStream = useCoordinationStream({ limit: 12 });

  const readinessSnapshot = readinessQuery.data?.snapshot;
  const readinessSummary = readinessSnapshot?.summary;
  const bootstrap = readinessQuery.data?.bootstrap;
  const hookAudit = coordinationStatusQuery.data?.hook_audit_summary;
  const discussionsSummary = coordinationDiscussionsQuery.data?.summary;
  const identitiesData = coordinationIdentitiesQuery.data;

  const superuserQueries = queryClient.getQueryCache().findAll({ queryKey: superuserKeys.all });
  const staleQueries = superuserQueries.filter((q) => q.isStale()).length;
  const freshQueries = Math.max(superuserQueries.length - staleQueries, 0);

  const readinessStamp = readinessSnapshot?.generated_at
    ? new Date(readinessSnapshot.generated_at).toLocaleTimeString()
    : null;

  const routingDetail =
    coordinationDiscussionsQuery.data?.discussions[0]?.workspace_path
    ?? coordinationStatusQuery.data?.app_runtime?.runtime_root
    ?? identitiesData?.identities[0]?.host
    ?? 'not yet observed';

  const planes = useMemo(() => {
    const readinessTone: PlaneFacetTone = readinessQuery.isError
      ? 'alert'
      : (readinessSummary?.fail ?? 0) > 0
        ? 'alert'
        : (readinessSummary?.warn ?? 0) > 0
          ? 'watch'
          : readinessSummary
            ? 'healthy'
            : 'muted';

    const bootstrapTone: PlaneFacetTone = readinessQuery.isError
      ? 'alert'
      : readinessQuery.isLoading
        ? 'muted'
        : bootstrap
          ? 'healthy'
          : 'muted';

    const queryTone: PlaneFacetTone =
      fetchingCount > 0
        ? 'watch'
        : superuserQueries.length > 0
          ? 'healthy'
          : 'muted';

    const browserFacets: PlaneFacet[] = [
      {
        label: 'Readiness',
        tone: readinessTone,
        value: readinessSummary
          ? `${readinessSummary.pass} pass · ${readinessSummary.warn} warn · ${readinessSummary.fail} fail${readinessStamp ? ` · ${readinessStamp}` : ''}`
          : readinessQuery.isLoading
            ? 'loading…'
            : 'no snapshot',
      },
      {
        label: 'Bootstrap',
        tone: bootstrapTone,
        value: bootstrap?.diagnosis_title ?? 'pending',
      },
      {
        label: 'Queries',
        tone: queryTone,
        value: `${superuserQueries.length} cached · ${fetchingCount} fetching · ${freshQueries} fresh · ${staleQueries} stale`,
      },
    ];

    const connectionTone: PlaneFacetTone =
      coordinationStream.connectionState === 'connected'
        ? 'healthy'
        : coordinationStream.connectionState === 'error'
          ? 'alert'
          : coordinationStream.connectionState === 'degraded'
            ? 'watch'
            : 'muted';

    const eventsTone: PlaneFacetTone =
      coordinationStream.events.length > 0 ? 'healthy' : 'muted';

    const latestEvent = coordinationStream.events[coordinationStream.events.length - 1];
    const latestEventLabel = latestEvent?.subject ?? '—';

    const coordFacets: PlaneFacet[] = [
      {
        label: 'Connection',
        tone: connectionTone,
        value: coordinationStream.connectionState,
      },
      {
        label: 'Events',
        tone: eventsTone,
        value: `${coordinationStream.events.length} in tail`,
      },
      {
        label: 'Latest',
        tone: eventsTone,
        value: latestEventLabel,
      },
    ];

    const identitiesCount = coordinationIdentitiesQuery.data?.summary.active_count ?? 0;
    const discussionsCount = coordinationDiscussionsQuery.data?.summary.thread_count ?? 0;

    const identitiesTone: PlaneFacetTone = coordinationIdentitiesQuery.isError
      ? 'alert'
      : identitiesCount > 0
        ? 'healthy'
        : 'muted';

    const discussionsTone: PlaneFacetTone = coordinationDiscussionsQuery.isError
      ? 'alert'
      : discussionsCount > 0
        ? 'healthy'
        : 'muted';

    const identityFacets: PlaneFacet[] = [
      {
        label: 'Identities',
        tone: identitiesTone,
        value: `${identitiesCount} active`,
      },
      {
        label: 'Discussions',
        tone: discussionsTone,
        value: `${discussionsCount} threads`,
      },
      {
        label: 'Routing',
        tone: 'muted',
        value: 'not yet instrumented',
      },
    ];

    const allowCount = hookAudit?.allow_count ?? 0;
    const warnCount = hookAudit?.warn_count ?? 0;
    const blockCount = hookAudit?.block_count ?? 0;
    const errorCount = hookAudit?.error_count ?? 0;

    const policyFacets: PlaneFacet[] = [
      { label: 'Allow', tone: allowCount > 0 ? 'healthy' : 'muted', value: `${allowCount}` },
      { label: 'Warn', tone: warnCount > 0 ? 'watch' : 'muted', value: `${warnCount}` },
      { label: 'Block', tone: blockCount > 0 ? 'watch' : 'muted', value: `${blockCount}` },
      { label: 'Error', tone: errorCount > 0 ? 'alert' : 'muted', value: `${errorCount}` },
    ];

    const repoFacets: PlaneFacet[] = [
      { label: 'Status', tone: 'muted', value: 'contract visible' },
      { label: 'Source', tone: 'muted', value: 'HOOK_AUDIT (tbd)' },
    ];

    return [
      {
        key: 'browser-state',
        label: 'Browser State',
        role: 'Boot handshake, readiness, cache',
        tone: worstTone([readinessTone, bootstrapTone, queryTone]),
        icon: IconServer,
        facets: browserFacets,
        drillLabel: 'Open readiness',
        drillPath: '/app/superuser/operational-readiness',
      },
      {
        key: 'coordination-state',
        label: 'Coordination',
        role: 'Broker, stream bridge, events',
        tone: worstTone([connectionTone, eventsTone]),
        icon: IconPlugConnected,
        facets: coordFacets,
        drillLabel: 'Open runtime',
        drillPath: '/app/superuser/coordination-runtime',
      },
      {
        key: 'identity-routing',
        label: 'Identity + Routing',
        role: 'Agents, discussions, ownership',
        tone: worstTone([identitiesTone, discussionsTone]),
        icon: IconRoute,
        facets: identityFacets,
        drillLabel: 'Inspect routing',
        drillPath: '/app/superuser/coordination-runtime',
      },
      {
        key: 'policy-hooks',
        label: 'Policy + Hooks',
        role: 'Hook audit outcomes',
        tone: errorCount > 0 ? 'alert' : warnCount > 0 || blockCount > 0 ? 'watch' : 'muted',
        icon: IconCode,
        facets: policyFacets,
        drillLabel: 'Open runtime summary',
        drillPath: '/app/superuser/coordination-runtime',
      },
      {
        key: 'repo-time',
        label: 'Repo-time Enforcement',
        role: 'Contract + future telemetry',
        tone: 'muted' as PlaneFacetTone,
        icon: IconClipboardList,
        facets: repoFacets,
        drillLabel: 'Open plan tracker',
        drillPath: '/app/superuser/plan-tracker',
      },
    ];
  }, [
    bootstrap,
    coordinationDiscussionsQuery.data?.summary.thread_count,
    coordinationDiscussionsQuery.isError,
    coordinationIdentitiesQuery.data?.summary.active_count,
    coordinationIdentitiesQuery.isError,
    coordinationStream.connectionState,
    coordinationStream.events,
    fetchingCount,
    hookAudit,
    readinessQuery.isError,
    readinessQuery.isLoading,
    readinessSummary,
    staleQueries,
    superuserQueries.length,
  ]);

  const primaryError = [
    readinessQuery.error,
    coordinationStatusQuery.error,
    coordinationIdentitiesQuery.error,
    coordinationDiscussionsQuery.error,
  ].find(Boolean);

  const isRefreshing = fetchingCount > 0;

  return (
    <ControlTowerV2PageFrame
      eyebrow="Operator Console"
      title="Control Tower v2"
      description="Five coordination planes, each a dense facet strip. No rows below — every fact fits inside its plane card."
      actions={(
        <button
          type="button"
          onClick={() => {
            void queryClient.invalidateQueries({ queryKey: superuserKeys.all });
          }}
          className={cn(TOOLBAR_BUTTON_BASE, TOOLBAR_BUTTON_STATES.inactive)}
        >
          <IconRefresh
            size={14}
            stroke={1.8}
            className={cn(isRefreshing && 'animate-spin')}
          />
          <span>{isRefreshing ? 'Refreshing' : 'Refresh'}</span>
        </button>
      )}
      contentClassName="min-h-full bg-background pb-8"
    >
      {primaryError ? <ControlTowerV2ErrorNotice message={primaryError.message} /> : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {planes.map((plane) => (
          <PlatformPlaneCardV2
            key={plane.key}
            label={plane.label}
            role={plane.role}
            tone={plane.tone}
            icon={plane.icon}
            facets={plane.facets}
            drillLabel={plane.drillLabel}
            drillPath={plane.drillPath}
          />
        ))}
      </div>
    </ControlTowerV2PageFrame>
  );
}
