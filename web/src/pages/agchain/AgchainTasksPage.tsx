import { AgchainProjectPlaceholderPage } from '@/components/agchain/AgchainProjectPlaceholderPage';

export default function AgchainTasksPage() {
  return (
    <AgchainProjectPlaceholderPage
      title="Tasks"
      description="Task definitions, scenario design, and task-to-dataset assembly will live here for the selected AGChain project."
      bullets={[
        'Tasks need their own eval surface because they sit between raw datasets and downstream scorer or run configuration.',
        'This route will eventually own task prompts, expected outputs, and scenario packaging rules.',
        'The placeholder locks the new eval taxonomy into the shell before task authoring behavior is implemented.',
      ]}
    />
  );
}
