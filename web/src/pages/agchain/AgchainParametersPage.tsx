import { AgchainProjectPlaceholderPage } from '@/components/agchain/AgchainProjectPlaceholderPage';

export default function AgchainParametersPage() {
  return (
    <AgchainProjectPlaceholderPage
      title="Parameters"
      description="Runtime profiles, context delivery policy, and project-level parameter controls will live here."
      bullets={[
        'Parameters need their own shell slot because runtime policy should not be discoverable only through hidden benchmark fields.',
        'This surface will eventually own model/runtime parameter presets, context windows, and evaluation-time overrides.',
        'The placeholder keeps the information architecture locked while backend parameter seams remain unchanged.',
      ]}
    />
  );
}
