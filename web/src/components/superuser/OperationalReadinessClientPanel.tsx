import type { ClientDiagnostic } from '@/lib/operationalReadiness';

export function OperationalReadinessClientPanel({
  diagnostics,
}: {
  diagnostics: ClientDiagnostic[];
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
      <h2 className="text-xl font-semibold text-foreground">Client Environment</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Browser-local runtime facts shown separately from backend-owned readiness checks.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {diagnostics.map((diagnostic) => (
          <article key={diagnostic.id} className="rounded-xl border border-border/70 bg-background/60 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {diagnostic.label}
            </p>
            <p className="mt-2 break-all text-sm font-medium text-foreground">{diagnostic.value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{diagnostic.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
