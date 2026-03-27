import { useNavigate } from 'react-router-dom';
import { AgchainBenchmarksTable } from '@/components/agchain/benchmarks/AgchainBenchmarksTable';
import { AgchainBenchmarksToolbar } from '@/components/agchain/benchmarks/AgchainBenchmarksToolbar';
import { useAgchainBenchmarks } from '@/hooks/agchain/useAgchainBenchmarks';

export default function AgchainBenchmarksPage() {
  const navigate = useNavigate();
  const { items, loading, creating, error, createBenchmark } = useAgchainBenchmarks();

  async function handleCreateBenchmark(payload: {
    benchmark_name: string;
    benchmark_slug: string | null;
    description: string;
  }) {
    const result = await createBenchmark(payload);
    navigate(result.redirect_path);
  }

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-8 py-8">
        <AgchainBenchmarksToolbar
          onCreate={handleCreateBenchmark}
          creating={creating}
          error={error}
        />
        <AgchainBenchmarksTable items={items} loading={loading} />
      </div>
    </div>
  );
}
