import { AgchainProjectPlaceholderPage } from '@/components/agchain/AgchainProjectPlaceholderPage';

export default function AgchainSkillsPage() {
  return (
    <AgchainProjectPlaceholderPage
      title="Skills"
      description="Harness skills, reusable capability bundles, and skill-to-run relationships will live here."
      bullets={[
        'Skills should be authored as first-class harness assets rather than disappearing into isolated workflow nodes.',
        'This route will eventually connect skills to prompts, tools, storage, and memory policy.',
        'The placeholder reserves a dedicated harness-skills home while the deeper authoring model is still being planned.',
      ]}
    />
  );
}
