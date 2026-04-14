import { RefreshCw } from 'lucide-react';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { OperationalReadinessBootstrapPanel } from '@/components/superuser/OperationalReadinessBootstrapPanel';
import { OperationalReadinessCheckGrid } from '@/components/superuser/OperationalReadinessCheckGrid';
import { OperationalReadinessClientPanel } from '@/components/superuser/OperationalReadinessClientPanel';
import { OperationalReadinessLocalRecoveryPanel } from '@/components/superuser/OperationalReadinessLocalRecoveryPanel';
import { OperationalReadinessSummary } from '@/components/superuser/OperationalReadinessSummary';
import { Button } from '@/components/ui/button';
import { useOperationalReadiness } from '@/hooks/useOperationalReadiness';
import { usePlatformApiDevRecovery } from '@/hooks/usePlatformApiDevRecovery';

function getEvidenceString(evidence: Record<string, unknown>, key: string): string | null {
  const value = evidence[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

export function Component() {
  useShellHeaderTitle({
    title: 'Operational Readiness',
    breadcrumbs: ['Superuser', 'Operational Readiness'],
  });

  const {
    loading,
    refreshing,
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

  async function handleRefresh() {
    if (devRecovery.enabled) {
      await Promise.all([refresh(), devRecovery.refreshStatus()]);
      return;
    }

    await refresh();
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
      <div className="flex justify-end">
        <Button type="button" onClick={() => void handleRefresh()} disabled={loading || refreshing || devRecovery.recovering}>
          <RefreshCw
            aria-hidden="true"
            className={`mr-2 h-4 w-4 ${refreshing || devRecovery.loading ? 'animate-spin' : ''}`}
          />
          Refresh Status
        </Button>
      </div>

      <OperationalReadinessBootstrapPanel bootstrap={bootstrap} error={error} />

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

          <div className="space-y-6">
            {surfaces.map((surface) => (
              <OperationalReadinessCheckGrid
                key={surface.id}
                surface={surface}
                actionStates={actionStates}
                detailStates={checkDetails}
                onExecuteAction={executeAction}
                onLoadCheckDetail={loadCheckDetail}
                onVerifyCheck={verifyCheck}
              />
            ))}
          </div>
        </>
      ) : null}

      <OperationalReadinessClientPanel diagnostics={clientDiagnostics} />
    </main>
  );
}
