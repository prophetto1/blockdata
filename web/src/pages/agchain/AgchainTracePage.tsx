import { AgchainProjectPlaceholderPage } from '@/components/agchain/AgchainProjectPlaceholderPage';

export default function AgchainTracePage() {
  return (
    <AgchainProjectPlaceholderPage
      title="Trace"
      description="Trace timelines, span inspection, and step-level execution detail will live here."
      bullets={[
        'Trace should expose the structured execution story for a project without being confused with high-level metrics or raw logs.',
        'This route will eventually show span trees, step timing, tool calls, and evaluated execution paths.',
        'The placeholder keeps the monitor lane honest while the trace viewer contract is still being defined.',
      ]}
    />
  );
}
