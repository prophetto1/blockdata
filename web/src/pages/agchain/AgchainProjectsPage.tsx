import { useNavigate } from 'react-router-dom';
import { AgchainBenchmarksTable } from '@/components/agchain/benchmarks/AgchainBenchmarksTable';
import { AgchainBenchmarksToolbar } from '@/components/agchain/benchmarks/AgchainBenchmarksToolbar';
import { useAgchainBenchmarks } from '@/hooks/agchain/useAgchainBenchmarks';

function overviewPathForProject(projectSlug: string) {
  return `/app/agchain/overview?project=${encodeURIComponent(projectSlug)}`;
}

export default function AgchainProjectsPage() {
  const navigate = useNavigate();
  const { items, loading, creating, error, createBenchmark } = useAgchainBenchmarks();

  async function handleCreateBenchmark(payload: {
    benchmark_name: string;
    benchmark_slug: string | null;
    description: string;
  }) {
    const result = await createBenchmark(payload) as { benchmark_slug?: string };
    navigate(result.benchmark_slug ? overviewPathForProject(result.benchmark_slug) : '/app/agchain/overview');
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
        </header>
        <AgchainBenchmarksToolbar
          onCreate={handleCreateBenchmark}
          creating={creating}
          error={error}
        />
        <AgchainBenchmarksTable
          items={items.map((item) => ({
            ...item,
            href: overviewPathForProject(item.benchmark_slug),
          }))}
          loading={loading}
        />
      </div>
    </div>
  );
}
