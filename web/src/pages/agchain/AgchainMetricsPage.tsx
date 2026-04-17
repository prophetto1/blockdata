import { AgchainProjectPlaceholderPage } from '@/components/agchain/AgchainProjectPlaceholderPage';

export default function AgchainMetricsPage() {
  return (
    <AgchainProjectPlaceholderPage
      title="Metrics"
      description="Project metrics, score trends, and execution summaries will live here for the selected AGChain project."
      bullets={[
        'Metrics should summarize evaluation health without forcing users down into raw traces or event logs.',
        'This route will eventually surface score distributions, throughput, cost, and judge agreement views.',
        'The placeholder keeps the monitor taxonomy explicit while those reporting surfaces are still being designed.',
      ]}
    />
  );
}
