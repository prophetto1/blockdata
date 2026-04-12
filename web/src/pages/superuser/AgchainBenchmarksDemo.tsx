import { useEffect, useState } from 'react';
import { WorkbenchPage } from '@/components/common/WorkbenchPage';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { AgchainBenchmarksTable } from '@/components/agchain/benchmarks/AgchainBenchmarksTable';
import {
  fetchAgchainBenchmarkRegistry,
  type AgchainBenchmarkRegistryRow,
} from '@/lib/agchainBenchmarks';

export default function AgchainBenchmarksDemo() {
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
    >
      <div className="flex flex-col gap-4 p-4">
        {error ? <ErrorAlert message={error} /> : null}
        <AgchainBenchmarksTable items={items} loading={loading} />
      </div>
    </WorkbenchPage>
  );
}
