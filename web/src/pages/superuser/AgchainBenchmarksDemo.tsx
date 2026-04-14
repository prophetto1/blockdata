import { useEffect, useState } from 'react';
import { WorkbenchPage } from '@/components/common/WorkbenchPage';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { AgchainBenchmarksTable } from '@/components/agchain/benchmarks/AgchainBenchmarksTable';
import {
  fetchAgchainBenchmarkRegistry,
  type AgchainBenchmarkRegistryRow,
} from '@/lib/agchainBenchmarks';

export function Component() {
  const [items, setItems] = useState<AgchainBenchmarkRegistryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAgchainBenchmarkRegistry(50, 0)
      .then((res) => { if (!cancelled) setItems(res.items); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <WorkbenchPage
      eyebrow="DEMO"
      title="Agchain Benchmarks (demo)"
      description="Wired demo surface for AgchainBenchmarksTable. Pulls the first 50 rows from fetchAgchainBenchmarkRegistry."
      hideHeader
      contentClassName="gap-4 p-0 md:p-0"
    >
      <div
        data-testid="agchain-benchmarks-page-content"
        className="flex min-h-0 flex-1 flex-col gap-4 px-4 pt-3"
      >
        {error ? <ErrorAlert message={error} /> : null}
        <AgchainBenchmarksTable items={items} loading={loading} />
      </div>
    </WorkbenchPage>
  );
}
