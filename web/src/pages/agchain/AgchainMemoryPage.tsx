import { AgchainProjectPlaceholderPage } from '@/components/agchain/AgchainProjectPlaceholderPage';

export default function AgchainMemoryPage() {
  return (
    <AgchainProjectPlaceholderPage
      title="Memory"
      description="Harness memory configuration, recall boundaries, and retained context policy will live here."
      bullets={[
        'Memory deserves a first-class harness surface because retained context is a design choice, not just a hidden implementation detail.',
        'This route will eventually shape episodic memory, summaries, retrieval rules, and reset boundaries.',
        'The placeholder holds that taxonomy slot open while the memory model is still being specified.',
      ]}
    />
  );
}
