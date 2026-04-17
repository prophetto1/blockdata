import { AgchainProjectPlaceholderPage } from '@/components/agchain/AgchainProjectPlaceholderPage';

export default function AgchainSandboxPage() {
  return (
    <AgchainProjectPlaceholderPage
      title="Sandbox"
      description="Scratch evaluation objects, isolated trials, and temporary project experiments will live here."
      bullets={[
        'Sandbox should give users a contained place to try ideas without promoting them into reusable project assets.',
        'This surface needs to stay distinct from both the reusable eval-authoring lanes and the durable harness-authoring lanes.',
        'The placeholder protects that shell slot while the sandbox model is still being defined.',
      ]}
    />
  );
}
