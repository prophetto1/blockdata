import { AgchainProjectPlaceholderPage } from '@/components/agchain/AgchainProjectPlaceholderPage';

export default function AgchainPromptsPage() {
  return (
    <AgchainProjectPlaceholderPage
      title="Prompts"
      description="Prompt packs, prompt revisions, and prompt-to-evaluation promotion flows will live here for the selected AGChain project."
      bullets={[
        'Prompts need to sit in the main project rail because they are authored objects, not hidden benchmark implementation details.',
        'This surface will eventually connect prompt draft work to datasets, scorers, and evaluation comparisons.',
        'The placeholder keeps the project shell stable while deeper prompt behavior is still being planned.',
      ]}
    />
  );
}
