import KestraPageShell from './KestraPageShell';

export default function TestsPage() {
  return (
    <KestraPageShell
      title="Tests"
      subtitle="Track flow and task verification runs."
      searchPlaceholder="Search tests"
      columns={['Id', 'Namespace', 'Flow', 'State', 'Updated']}
      emptyTitle="No tests configured."
      emptyDescription="This surface is ready for parity work once runtime-backed test records are available."
      primaryActionLabel="Create test"
    />
  );
}
