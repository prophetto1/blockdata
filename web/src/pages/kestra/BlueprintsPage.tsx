import KestraPageShell from './KestraPageShell';

export default function BlueprintsPage() {
  return (
    <KestraPageShell
      title="Blueprints"
      subtitle="Browse reusable workflow templates and examples."
      searchPlaceholder="Search blueprints"
      columns={['Blueprint', 'Category', 'Updated', 'Actions']}
      emptyTitle="No blueprints available."
      emptyDescription="Blueprints will surface here once the template catalog is connected."
      primaryActionLabel="Create"
    />
  );
}
