import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { OperationalReadinessCheckGrid } from '@/components/superuser/OperationalReadinessCheckGrid';
import { OperationalReadinessClientPanel } from '@/components/superuser/OperationalReadinessClientPanel';
import { OperationalReadinessSummary } from '@/components/superuser/OperationalReadinessSummary';
import { Button } from '@/components/ui/button';
import { useOperationalReadiness } from '@/hooks/useOperationalReadiness';

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
    summary,
    surfaces,
    clientDiagnostics,
    refresh,
  } = useOperationalReadiness();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Operational Readiness</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            See what is working vs not working before debugging a flow, with one operator view for shared platform, BlockData, and AGChain dependencies.
          </p>
        </div>
        <Button type="button" onClick={() => void refresh()} disabled={loading || refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </header>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Readiness snapshot failed to load.</p>
            <p className="mt-1 text-rose-100/90">{error}</p>
          </div>
        </div>
      ) : null}

      <OperationalReadinessSummary summary={summary} refreshedAt={refreshedAt} />

      <div className="space-y-6">
        {surfaces.map((surface) => (
          <OperationalReadinessCheckGrid key={surface.id} surface={surface} />
        ))}
      </div>

      <OperationalReadinessClientPanel diagnostics={clientDiagnostics} />
    </div>
  );
}
