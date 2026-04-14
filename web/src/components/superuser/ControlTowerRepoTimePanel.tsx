type ControlTowerRepoTimePanelProps = {
  showNotes: boolean;
};

export function ControlTowerRepoTimePanel({ showNotes }: ControlTowerRepoTimePanelProps) {
  return (
    <section className="rounded-[24px] border border-border/70 bg-card/80 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Repo-time Enforcement
          </p>
          <h3 className="mt-1 text-sm font-semibold text-foreground">Contract-visible before live telemetry exists</h3>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          not yet instrumented
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Current boundary</p>
        <p className="mt-2 text-sm font-medium text-foreground">
          Repo-time enforcement is still expressed through plan contracts, repo rules, and operator workflow expectations rather than a live event stream.
        </p>
      </div>

      <div className="mt-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Future live source</p>
        <p className="mt-2 text-sm text-muted-foreground">
          This plane becomes live when repo-time checks emit durable telemetry through the planned `HOOKS.CHECK` subject and `HOOK_AUDIT` stream on the coordination substrate.
        </p>
      </div>

      {showNotes ? (
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li className="rounded-xl border border-dashed border-border/70 bg-muted/25 px-3 py-3">
            The plane is visible on day one so operators know the boundary exists even before the runtime signal does.
          </li>
          <li className="rounded-xl border border-dashed border-border/70 bg-muted/25 px-3 py-3">
            When telemetry lands later, this panel should swap its contract copy for measured allow, warn, block, and error enforcement evidence.
          </li>
        </ul>
      ) : null}
    </section>
  );
}
