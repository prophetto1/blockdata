import type { OperationalReadinessDependencyRef } from '@/lib/operationalReadiness';

const STATUS_DOT: Record<OperationalReadinessDependencyRef['status'], string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  fail: 'bg-rose-500',
  unknown: 'bg-slate-400',
};

function DependencyGroup({
  title,
  items,
  emptyState,
}: {
  title: string;
  items: OperationalReadinessDependencyRef[];
  emptyState: string;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</h4>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyState}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((dependency) => (
            <li
              key={`${title}-${dependency.check_id}`}
              className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/75 px-3 py-2.5"
            >
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[dependency.status]}`} />
              <div className="min-w-0">
                <p className="font-medium text-foreground">{dependency.label}</p>
                <p className="mt-1 break-all text-[12px] text-muted-foreground">{dependency.check_id}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function OperationalReadinessDependencyPanel({
  dependsOn,
  blockedBy,
}: {
  dependsOn: OperationalReadinessDependencyRef[];
  blockedBy: OperationalReadinessDependencyRef[];
}) {
  return (
    <article className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground">Dependencies</h3>
        <p className="text-sm text-muted-foreground">
          Upstream checks this status depends on and blockers that still hold it red.
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <DependencyGroup
          title="Depends on"
          items={dependsOn}
          emptyState="No upstream dependencies declared."
        />
        <DependencyGroup
          title="Blocked by"
          items={blockedBy}
          emptyState="No active blockers declared."
        />
      </div>
    </article>
  );
}
