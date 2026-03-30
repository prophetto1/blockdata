import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AgchainProjectCreateDialog } from '@/components/agchain/AgchainProjectCreateDialog';
import { AgchainBenchmarksTable } from '@/components/agchain/benchmarks/AgchainBenchmarksTable';
import { useAgchainBenchmarks } from '@/hooks/agchain/useAgchainBenchmarks';
import {
  broadcastAgchainProjectListChanged,
  setStoredAgchainProjectFocusSlug,
} from '@/lib/agchainProjectFocus';

function overviewPathForProject(projectSlug: string) {
  return `/app/agchain/overview?project=${encodeURIComponent(projectSlug)}`;
}

export default function AgchainProjectsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { items, loading, creating, error, createBenchmark } = useAgchainBenchmarks();
  const createOpen = searchParams.get('new') === '1';

  const tableItems = useMemo(
    () => items.map((item) => ({
      ...item,
      href: overviewPathForProject(item.benchmark_slug),
    })),
    [items],
  );

  function setCreateOpen(open: boolean) {
    const next = new URLSearchParams(searchParams);
    if (open) {
      next.set('new', '1');
    } else {
      next.delete('new');
    }
    setSearchParams(next, { replace: !open });
  }

  async function handleCreateBenchmark(payload: {
    benchmark_name: string;
    benchmark_slug: string | null;
    description: string;
  }) {
    const result = await createBenchmark(payload) as { benchmark_slug?: string };
    const nextSlug = result.benchmark_slug ?? payload.benchmark_slug ?? null;
    setStoredAgchainProjectFocusSlug(nextSlug);
    broadcastAgchainProjectListChanged(nextSlug);
    setCreateOpen(false);
    navigate(nextSlug ? overviewPathForProject(nextSlug) : '/app/agchain/overview');
  }

  return (
    <div className="min-h-full bg-background" data-testid="agchain-projects-page">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-8 py-8">
        <header className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            AGChain Projects
          </p>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Projects and evaluations</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              This route owns the multi-project AGChain registry. Choose or create the project or evaluation that the
              rest of the AGChain shell will scope itself around.
            </p>
          </div>
          <div className="pt-2">
            <Button type="button" onClick={() => setCreateOpen(true)}>
              New Project
            </Button>
          </div>
        </header>
        <AgchainProjectCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          creating={creating}
          error={error}
          onCreate={handleCreateBenchmark}
        />
        <AgchainBenchmarksTable
          items={tableItems}
          loading={loading}
        />
      </div>
    </div>
  );
}
