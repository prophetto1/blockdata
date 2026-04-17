import { AgchainProjectPlaceholderPage } from '@/components/agchain/AgchainProjectPlaceholderPage';

export default function AgchainEvalModelsPage() {
  return (
    <AgchainProjectPlaceholderPage
      title="Models"
      description="Evaluation-target model sets, judge roles, and project-scoped model selection rules will live here."
      bullets={[
        'Models in the eval lane should focus on what gets evaluated, compared, and judged inside project work.',
        'This route stays distinct from provider-credential management and other settings-owned infrastructure.',
        'The placeholder reserves the eval-models surface while the deeper model taxonomy is still being planned.',
      ]}
    />
  );
}
