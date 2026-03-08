import KestraPageShell from './KestraPageShell';

export default function InstancePage() {
  return (
    <KestraPageShell
      title="Instance"
      subtitle="Manage instance-wide runtime, worker, and observability settings."
      searchPlaceholder="Search instance settings"
      columns={['Setting', 'Current value', 'Scope', 'Updated']}
      emptyTitle="No instance settings found."
      emptyDescription="Instance controls will appear here as the Kestra-like runtime administration layer is connected."
    />
  );
}
