import { AgchainSectionPage } from './AgchainSectionPage';

export default function AgchainResultsPage() {
  return (
    <AgchainSectionPage
      title="Results"
      description="Scored outcomes, comparisons, summaries, and rerun history will be surfaced here."
      bullets={[
        'The same benchmark should be rerunnable against new model targets without manual bookkeeping.',
        'Results need to stay comparable across runs, models, and benchmark versions.',
        'This surface is distinct from raw artifact inspection and from operational telemetry.',
      ]}
    />
  );
}
