import { Route, ShieldCheck } from 'lucide-react';
import type {
  OperationalReadinessActionability,
  OperationalReadinessAvailableAction,
} from '@/lib/operationalReadiness';

const ACTIONABILITY_LABELS: Record<OperationalReadinessActionability, string> = {
  backend_action: 'Backend action',
  backend_probe: 'Backend probe',
  external_change: 'External change',
  info_only: 'Info only',
};

export function OperationalReadinessActionPanel({
  actionability,
  actions,
}: {
  actionability: OperationalReadinessActionability;
  actions: OperationalReadinessAvailableAction[];
}) {
  return (
    <article className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground">Available Actions</h3>
          <p className="text-sm text-muted-foreground">
            Backend-owned remediations the operator can trust for this check.
          </p>
        </div>
        <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {ACTIONABILITY_LABELS[actionability]}
        </span>
      </div>

      {actions.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
          No backend-owned actions available.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {actions.map((action) => (
            <article
              key={action.action_kind}
              className="rounded-2xl border border-border/70 bg-background/85 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck aria-hidden="true" className="h-4 w-4 text-emerald-500" />
                    <p className="font-medium text-foreground">{action.label}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
                {action.requires_confirmation ? (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
                    Confirm first
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border/60 bg-card/70 px-3 py-2 text-sm text-muted-foreground">
                <Route aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className="min-w-0 break-all font-mono text-[12px]">{action.route}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </article>
  );
}
