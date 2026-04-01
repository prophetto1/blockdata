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
    refresh,
  } = useOperationalReadiness();
  const devRecovery = usePlatformApiDevRecovery({
    onRecovered: refresh,
  });

  async function handleRefresh() {
    if (devRecovery.enabled) {
      await Promise.all([refresh(), devRecovery.refreshStatus()]);
      return;
    }

    await refresh();
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
      <header className="rounded-[28px] border border-border/70 bg-card/75 px-5 py-4 shadow-sm md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Backend-owned control plane
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground" style={{ textWrap: 'balance' }}>
              Operational Readiness
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Backend proof first, operator actions second, browser-local diagnostics only when needed.
            </p>
          </div>
          <Button type="button" onClick={() => void handleRefresh()} disabled={loading || refreshing || devRecovery.recovering}>
            <RefreshCw
              aria-hidden="true"
              className={`mr-2 h-4 w-4 ${refreshing || devRecovery.loading ? 'animate-spin' : ''}`}
            />
            Refresh Status
          </Button>
        </div>
      </header>

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
          <OperationalReadinessSummary summary={summary} refreshedAt={refreshedAt} />

          <div className="space-y-6">
            {surfaces.map((surface) => (
              <OperationalReadinessCheckGrid key={surface.id} surface={surface} />
            ))}
          </div>
        </>
      ) : null}

      <OperationalReadinessClientPanel diagnostics={clientDiagnostics} />
    </main>
  );
}
