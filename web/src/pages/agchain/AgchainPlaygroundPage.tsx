import { AgchainProjectPlaceholderPage } from '@/components/agchain/AgchainProjectPlaceholderPage';

export default function AgchainPlaygroundPage() {
  return (
    <AgchainProjectPlaceholderPage
      title="Playground"
      description="Fast iteration loops, ad hoc evaluation experiments, and quick project-level testing flows will live here."
      bullets={[
        'Playground should support rapid exploration without forcing users into the full run-orchestration surface.',
        'This route reserves a clear place for lightweight experimentation inside the project shell.',
        'The placeholder keeps the new taxonomy visible while the deeper interaction model is still being designed.',
      ]}
    />
  );
}
