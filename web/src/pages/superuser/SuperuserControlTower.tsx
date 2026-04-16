import { useEffect, useState } from 'react';
import {
  IconClipboardList,
  IconCode,
  IconRoute,
  IconServer,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { CollapsibleSurface } from '@/components/superuser/CollapsibleSurface';
import {
  CoordinationRuntimeSurface,
} from '@/components/superuser/CoordinationRuntimeSurface';
import { DEFAULT_COORDINATION_RUNTIME_CARD_STATE } from '@/components/superuser/coordinationRuntimeCardState';
import { OperationalReadinessBootstrapPanel } from '@/components/superuser/OperationalReadinessBootstrapPanel';
import { OperationalReadinessCheckGrid } from '@/components/superuser/OperationalReadinessCheckGrid';
import { OperationalReadinessClientPanel } from '@/components/superuser/OperationalReadinessClientPanel';
import { OperationalReadinessLocalRecoveryPanel } from '@/components/superuser/OperationalReadinessLocalRecoveryPanel';
import { OperationalReadinessSummary } from '@/components/superuser/OperationalReadinessSummary';
import type { OperationalReadinessSurface } from '@/lib/operationalReadiness';
import { ControlTowerV2PageFrame } from '@/components/superuser/ControlTowerV2PageFrame';
import {
  PlatformPlaneCardV2,
  type PlaneFacet,
  type PlaneFacetTone,
} from '@/components/superuser/PlatformPlaneCardV2';
import { useOperationalReadiness } from '@/hooks/useOperationalReadiness';
import { usePlatformApiDevRecovery } from '@/hooks/usePlatformApiDevRecovery';

type PlaneCard = {
  key: string;
  label: string;
  role: string;
  tone: PlaneFacetTone;
  icon: Icon;
  facets: PlaneFacet[];
  drillLabel?: string;
  drillPath?: string;
};

function getEvidenceString(evidence: Record<string, unknown>, key: string): string | null {
  const value = evidence[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

const HOME_PLANES: PlaneCard[] = [
  {
    key: 'browser-state',
    label: 'Browser State',
    role: 'Boot handshake, readiness, cache',
    tone: 'healthy',
    icon: IconServer,
    facets: [
      { label: 'Readiness', tone: 'healthy', value: 'pull out panel' },
      { label: 'Bootstrap', tone: 'muted', value: 'load on select' },
      { label: 'Queries', tone: 'muted', value: 'no eager fetch' },
    ],
  },
  {
    key: 'coordination-state',
    label: 'Coordination State',
    role: 'Broker, stream bridge, events',
    tone: DEFAULT_COORDINATION_RUNTIME_CARD_STATE.tone,
    icon: IconCode,
    facets: DEFAULT_COORDINATION_RUNTIME_CARD_STATE.facets,
    drillLabel: 'Open runtime',
    drillPath: '/app/superuser/coordination-runtime',
  },
  {
    key: 'identity-routing',
    label: 'Identity + Routing',
    role: 'Agents, discussions, ownership',
    tone: 'muted',
    icon: IconRoute,
    facets: [
      { label: 'Identities', tone: 'muted', value: 'open runtime' },
      { label: 'Discussions', tone: 'muted', value: 'routing queue' },
      { label: 'Routing', tone: 'muted', value: 'inspect there' },
    ],
    drillLabel: 'Inspect routing',
    drillPath: '/app/superuser/coordination-runtime',
  },
  {
    key: 'policy-hooks',
    label: 'Policy + Hooks',
    role: 'Hook audit outcomes',
    tone: 'muted',
    icon: IconCode,
    facets: [
      { label: 'Policy', tone: 'muted', value: 'runtime summary' },
      { label: 'Hooks', tone: 'muted', value: 'open runtime' },
      { label: 'Audit', tone: 'muted', value: 'lazy loaded' },
    ],
    drillLabel: 'Open runtime summary',
    drillPath: '/app/superuser/coordination-runtime',
  },
  {
    key: 'repo-time',
    label: 'Repo-time Enforcement',
    role: 'Contract + future telemetry',
    tone: 'muted',
    icon: IconClipboardList,
    facets: [
      { label: 'Status', tone: 'muted', value: 'contract visible' },
      { label: 'Source', tone: 'muted', value: 'HOOK_AUDIT (tbd)' },
    ],
    drillLabel: 'Open plan tracker',
    drillPath: '/app/superuser/plan-tracker',
  },
];

const DEFAULT_BROWSER_STATE = {
  tone: 'healthy' as PlaneFacetTone,
  facets: [
    { label: 'Readiness', tone: 'healthy' as PlaneFacetTone, value: 'pull out panel' },
    { label: 'Bootstrap', tone: 'muted' as PlaneFacetTone, value: 'load on select' },
    { label: 'Queries', tone: 'muted' as PlaneFacetTone, value: 'no eager fetch' },
  ],
};

type SurfaceHeader = {
  summary: string;
  tone: 'healthy' | 'watch' | 'alert' | 'muted';
  worstChild: { label: string; hint?: string; tone: 'watch' | 'alert' } | null;
  defaultOpen: boolean;
};

function deriveSurfaceHeader(surface: OperationalReadinessSurface): SurfaceHeader {
  const { ok, warn, fail, unknown } = surface.summary;
  const total = ok + warn + fail + unknown;

  const tone: SurfaceHeader['tone'] =
    fail > 0 ? 'alert' : warn > 0 || unknown > 0 ? 'watch' : total > 0 ? 'healthy' : 'muted';

  const summary =
    warn === 0 && fail === 0 && unknown === 0
      ? `${ok}/${total} ok`
      : [
          `${total} check${total === 1 ? '' : 's'}`,
          warn > 0 ? `${warn} warn` : null,
          fail > 0 ? `${fail} fail` : null,
          unknown > 0 ? `${unknown} unknown` : null,
        ]
          .filter(Boolean)
          .join(' · ');

  const failing = surface.checks.find((check) => check.status === 'fail');
  const warning = surface.checks.find((check) => check.status === 'warn');
  const worstCheck = failing ?? warning ?? null;
  const worstChild = worstCheck
    ? {
        label: worstCheck.label,
        hint: worstCheck.remediation ? `→ ${worstCheck.remediation}` : undefined,
        tone: (failing ? 'alert' : 'watch') as 'watch' | 'alert',
      }
    : null;

  return {
    summary,
    tone,
    worstChild,
    defaultOpen: Boolean(failing),
  };
}

function EmbeddedOperationalReadinessSection({
  onBrowserStateChange,
}: {
  onBrowserStateChange: (state: { tone: PlaneFacetTone; facets: PlaneFacet[] }) => void;
}) {
  const {
    error,
    refreshedAt,
    bootstrap,
    summary,
    surfaces,
    clientDiagnostics,
    actionStates,
    checkDetails,
    executeAction,
    loadCheckDetail,
    verifyCheck,
    refresh,
  } = useOperationalReadiness();
  const devRecovery = usePlatformApiDevRecovery({
    onRecovered: refresh,
  });

  const runtimeIdentityCheck = surfaces
    .find((surface) => surface.id === 'shared')
    ?.checks.find((check) => check.check_id === 'shared.platform_api.ready');
  const runtimeIdentityEvidence =
    runtimeIdentityCheck && typeof runtimeIdentityCheck.evidence === 'object' && runtimeIdentityCheck.evidence !== null
      ? runtimeIdentityCheck.evidence
      : {};
  const runtimeIdentity = {
    runtimeEnvironment: getEvidenceString(runtimeIdentityEvidence, 'runtime_environment'),
    serviceName: getEvidenceString(runtimeIdentityEvidence, 'service_name'),
    revisionName: getEvidenceString(runtimeIdentityEvidence, 'revision_name'),
    configurationName: getEvidenceString(runtimeIdentityEvidence, 'configuration_name'),
    serviceAccountEmail: getEvidenceString(runtimeIdentityEvidence, 'service_account_email'),
  };

  useEffect(() => {
    const failCount = summary?.fail ?? 0;
    const warnCount = summary?.warn ?? 0;
    const unknownCount = summary?.unknown ?? 0;
    const nextTone: PlaneFacetTone =
      error || failCount > 0
        ? 'alert'
        : warnCount > 0 || unknownCount > 0 || !bootstrap.snapshot_available
          ? 'watch'
          : 'healthy';

    onBrowserStateChange({
      tone: nextTone,
      facets: [
        {
          label: 'Readiness',
          tone: bootstrap.snapshot_available ? 'healthy' : nextTone,
          value: bootstrap.snapshot_available ? 'snapshot loaded' : bootstrap.diagnosis_title,
        },
        {
          label: 'Bootstrap',
          tone: bootstrap.snapshot_available ? 'healthy' : nextTone,
          value: bootstrap.diagnosis_title,
        },
        {
          label: 'Queries',
          tone: summary ? nextTone : 'muted',
          value: summary
            ? `${summary.ok} ok - ${summary.warn} warn - ${summary.fail} fail`
            : 'loading...',
        },
      ],
    });
  }, [bootstrap.diagnosis_title, bootstrap.snapshot_available, error, onBrowserStateChange, summary]);

  return (
    <section className="rounded-[28px] border border-border/70 bg-card/75 shadow-sm">
      <div className="space-y-5 px-4 py-5 md:px-6">
        {!bootstrap.snapshot_available || error ? (
          <OperationalReadinessBootstrapPanel bootstrap={bootstrap} error={error} />
        ) : null}

        {devRecovery.enabled ? (
          <OperationalReadinessLocalRecoveryPanel
            loading={devRecovery.loading}
            recovering={devRecovery.recovering}
            error={devRecovery.error}
            status={devRecovery.status}
            lastRecovery={devRecovery.lastRecovery}
            onRecover={devRecovery.recover}
          />
        ) : null}

        {bootstrap.snapshot_available && summary ? (
          <>
            <OperationalReadinessSummary
              summary={summary}
              refreshedAt={refreshedAt}
              runtimeIdentity={runtimeIdentity}
            />

            <div className="space-y-2">
              {surfaces.map((surface) => {
                const header = deriveSurfaceHeader(surface);
                return (
                  <CollapsibleSurface
                    key={surface.id}
                    title={surface.label}
                    summary={header.summary}
                    tone={header.tone}
                    worstChild={header.worstChild}
                    defaultOpen={header.defaultOpen}
                  >
                    <OperationalReadinessCheckGrid
                      surface={surface}
                      actionStates={actionStates}
                      detailStates={checkDetails}
                      onExecuteAction={executeAction}
                      onLoadCheckDetail={loadCheckDetail}
                      onVerifyCheck={verifyCheck}
                    />
                  </CollapsibleSurface>
                );
              })}
            </div>
          </>
        ) : null}

        <OperationalReadinessClientPanel diagnostics={clientDiagnostics} />
      </div>
    </section>
  );
}

export function Component() {
  useShellHeaderTitle({
    title: 'Control Tower',
    breadcrumbs: ['Superuser', 'Control Tower'],
  });

  const [expandedPanel, setExpandedPanel] = useState<'operational-readiness' | 'coordination-runtime' | null>(null);
  const [browserState, setBrowserState] = useState(DEFAULT_BROWSER_STATE);
  const [coordinationState, setCoordinationState] = useState(DEFAULT_COORDINATION_RUNTIME_CARD_STATE);
  const planes = HOME_PLANES.map((plane) => {
    if (plane.key === 'browser-state') {
      return {
        ...plane,
        tone: browserState.tone,
        facets: browserState.facets,
      };
    }

    if (plane.key === 'coordination-state') {
      return {
        ...plane,
        tone: coordinationState.tone,
        facets: coordinationState.facets,
      };
    }

    return plane;
  });

  return (
    <ControlTowerV2PageFrame
      eyebrow="Operator Console"
      title="Control Tower"
      description="Five coordination state cards up top. Select Browser State or Coordination State to pull down the live runtime surfaces without leaving the superuser homepage."
      hideHeader
      contentClassName="min-h-full bg-background pb-8"
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {planes.map((plane) => {
          const readinessSelected = plane.key === 'browser-state' && expandedPanel === 'operational-readiness';
          const coordinationSelected = plane.key === 'coordination-state' && expandedPanel === 'coordination-runtime';

          return (
            <PlatformPlaneCardV2
              key={plane.key}
              label={plane.label}
              role={plane.role}
              tone={plane.tone}
              icon={plane.icon}
              facets={plane.facets}
              drillLabel={plane.drillLabel}
              drillPath={plane.drillPath}
              selected={readinessSelected || coordinationSelected}
              onSelect={
                plane.key === 'browser-state'
                  ? () => setExpandedPanel('operational-readiness')
                  : plane.key === 'coordination-state'
                    ? () => setExpandedPanel('coordination-runtime')
                  : undefined
              }
              selectLabel={
                plane.key === 'browser-state'
                  ? 'Select Browser State'
                  : plane.key === 'coordination-state'
                    ? 'Select Coordination State'
                    : undefined
              }
            />
          );
        })}
      </div>

      {expandedPanel === 'operational-readiness' ? (
        <EmbeddedOperationalReadinessSection onBrowserStateChange={setBrowserState} />
      ) : expandedPanel === 'coordination-runtime' ? (
        <CoordinationRuntimeSurface onStateChange={setCoordinationState} />
      ) : null}
    </ControlTowerV2PageFrame>
  );
}
