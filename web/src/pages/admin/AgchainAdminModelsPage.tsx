import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';

export default function AgchainAdminModelsPage() {
  useShellHeaderTitle({
    title: 'AGChain Admin Models',
    breadcrumbs: ['AGChain Admin', 'Models'],
  });

  return (
    <main className="relative h-full">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="mx-auto mt-6 h-52 w-[86rem] rounded-full bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.24),_transparent_70%)] blur-[88px]" />
      </div>
      <section className="mx-auto flex h-full w-full max-w-6xl flex-col gap-5 px-6 py-8">
        <div className="rounded-2xl border border-border/80 bg-card/80 px-6 py-6 shadow-sm backdrop-blur">
          <header className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              AGChain Admin
            </p>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">Models</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  AGChain administrators curate the global model registry here: providers, model targets, and target
                  policy metadata. Project-level API keys are intentionally managed in the project-facing Models page.
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-500/90">
                Registry surface (no provider secrets)
              </span>
            </div>
          </header>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <section className="rounded-2xl border border-border/70 bg-card/85 px-5 py-5">
            <h2 className="text-sm font-semibold text-foreground">Provider Registry</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Configure provider definitions, aliases, and connection profiles that power model availability.
            </p>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>• Provider directory status</p>
              <p>• Auth mode capabilities</p>
              <p>• Admin policy defaults</p>
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-card/85 px-5 py-5">
            <h2 className="text-sm font-semibold text-foreground">Model Targets</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Own the curated list of model identifiers and metadata shared by projects across the platform.
            </p>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>• Create and deprecate targets</p>
              <p>• Manage capability flags</p>
              <p>• Define default probe strategy</p>
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-card/85 px-5 py-5">
            <h2 className="text-sm font-semibold text-foreground">Operational Readiness</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Health reporting and deployment state are surfaced so admins can validate registry changes quickly.
            </p>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>• Target health timeline</p>
              <p>• Audit-ready visibility</p>
              <p>• Scoped controls by admin tier</p>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-dashed border-border/90 bg-muted/35 px-5 py-6">
          <p className="max-w-3xl text-sm text-muted-foreground">
            Implementation state: this page currently keeps the visual shell and structure ready while the functional
            registry controls are being completed separately.
          </p>
        </section>
      </section>
    </main>
  );
}
