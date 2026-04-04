import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';

export default function AgchainAdminModelsPage() {
  useShellHeaderTitle({
    title: 'AGChain Admin Models',
    breadcrumbs: ['AGChain Admin', 'Models'],
  });

  return (
    <main className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4 px-6 py-8">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          AGChain Admin
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Models</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          This surface is intentionally sparse in the first split. The backend gate and shell are now
          separated so AGChain administration can grow here without remaining tied to Superuser.
        </p>
      </header>

      <section className="rounded-2xl border border-border/70 bg-card px-5 py-6 shadow-sm">
        <p className="text-sm text-muted-foreground">
          No AGChain admin-owned model controls are mounted yet. This placeholder confirms the new
          route, guard, and rail inventory are wired correctly.
        </p>
      </section>
    </main>
  );
}
