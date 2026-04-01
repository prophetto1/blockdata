import type { PlatformApiDevRecoveryResult, PlatformApiDevStatus } from '@/lib/platformApiDevRecovery';
import { Button } from '@/components/ui/button';

type OperationalReadinessLocalRecoveryPanelProps = {
  loading: boolean;
  recovering: boolean;
  error: string | null;
  status: PlatformApiDevStatus | null;
  lastRecovery: PlatformApiDevRecoveryResult | null;
  onRecover: () => Promise<void> | void;
};

function formatBoolean(value: boolean): string {
  return value ? 'Yes' : 'No';
}

function formatApprovedBootstrap(value: string): string {
  return value === 'true' ? 'True' : 'Unknown';
}

function formatListenerState(status: PlatformApiDevStatus | null): string {
  if (!status) {
    return 'Unavailable';
  }

  return status.listener.running ? 'Running' : 'Stopped';
}

function StatusField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</dt>
      <dd className="mt-2 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function OperationalReadinessLocalRecoveryPanel({
  loading,
  recovering,
  error,
  status,
  lastRecovery,
  onRecover,
}: OperationalReadinessLocalRecoveryPanelProps) {
  return (
    <section className="rounded-[28px] border border-border/70 bg-card/75 px-5 py-4 shadow-sm md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Local dev recovery
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Platform API launch hygiene</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Localhost-only recovery through the approved bootstrap path when the dev listener is stale, missing, or mis-launched.
          </p>
        </div>

        <Button type="button" onClick={() => void onRecover()} disabled={loading || recovering}>
          {recovering ? 'Recovering platform-api...' : 'Recover platform-api'}
        </Button>
      </div>

      {status ? (
        <dl className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatusField label="Listener" value={formatListenerState(status)} />
          <StatusField label="PID" value={status.listener.pid ? String(status.listener.pid) : 'Unavailable'} />
          <StatusField label="Port" value={String(status.port)} />
          <StatusField label="Approved bootstrap" value={formatApprovedBootstrap(status.launch_hygiene.approved_bootstrap)} />
          <StatusField label="Provenance basis" value={status.launch_hygiene.provenance_basis} />
          <StatusField label="Env loaded" value={formatBoolean(status.launch_hygiene.env_loaded)} />
          <StatusField label="Repo root match" value={formatBoolean(status.launch_hygiene.repo_root_match)} />
          <StatusField label="State file" value={status.launch_hygiene.state_file_present ? 'Present' : 'Missing'} />
        </dl>
      ) : null}

      {!status && loading ? (
        <p className="mt-5 text-sm text-muted-foreground">Inspecting local platform-api launch state.</p>
      ) : null}

      {status ? <p className="mt-4 text-sm text-muted-foreground">{status.last_probe.detail}</p> : null}

      {lastRecovery ? (
        <div className="mt-4 rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">
            {lastRecovery.ok ? 'Recovery completed.' : 'Recovery failed.'}
          </p>
          <p className="mt-1 text-muted-foreground">
            {lastRecovery.failure_reason ?? 'The approved bootstrap path relaunched and returned a structured result.'}
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-900 dark:text-rose-100">
          {error}
        </div>
      ) : null}
    </section>
  );
}
