import { AgchainProjectPlaceholderPage } from '@/components/agchain/AgchainProjectPlaceholderPage';

export default function AgchainInstructionsPage() {
  return (
    <AgchainProjectPlaceholderPage
      title="Instructions"
      description="Harness instructions, persistent guidance, and runtime behavior policies will live here."
      bullets={[
        'Instructions need their own harness surface so they are not collapsed into prompt authoring or hidden implementation detail.',
        'This route will eventually own system guidance, execution policy, and harness-level behavior framing.',
        'The placeholder keeps the harness taxonomy visible while the instruction model is still being defined.',
      ]}
    />
  );
}
