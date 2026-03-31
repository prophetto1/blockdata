import type { ClientDiagnostic } from '@/lib/operationalReadiness';

export function OperationalReadinessClientPanel({
  diagnostics,
}: {
  diagnostics: ClientDiagnostic[];
}) {
  return (
    <details className="rounded-[28px] border border-border/70 bg-card/75 shadow-sm">
      <summary className="cursor-pointer list-none px-4 py-4">
        <p className="text-xl font-semibold text-foreground">Client Environment</p>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Supporting browser-local facts stay collapsed unless you need local frontend context.
        </p>
      </summary>

      <div className="grid gap-3 border-t border-border/70 px-4 py-4 md:grid-cols-4">
        {diagnostics.map((diagnostic) => (
          <article key={diagnostic.id} className="rounded-2xl border border-border/70 bg-background/75 p-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {diagnostic.label}
            </p>
            <p className="mt-2 break-all text-sm font-medium text-foreground">{diagnostic.value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{diagnostic.summary}</p>
          </article>
        ))}
      </div>
    </details>
  );
}
