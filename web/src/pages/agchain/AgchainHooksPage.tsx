import { AgchainProjectPlaceholderPage } from '@/components/agchain/AgchainProjectPlaceholderPage';

export default function AgchainHooksPage() {
  return (
    <AgchainProjectPlaceholderPage
      title="Hooks"
      description="Harness hooks, lifecycle triggers, and automation extension points will live here."
      bullets={[
        'Hooks need their own harness route so lifecycle automation remains visible and governable at the project level.',
        'This surface will eventually configure pre-run, post-run, and step-level callbacks or interceptors.',
        'The placeholder reserves that extension point inside the new harness taxonomy while the deeper model is still being designed.',
      ]}
    />
  );
}
