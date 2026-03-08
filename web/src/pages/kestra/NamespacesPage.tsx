import KestraPageShell from './KestraPageShell';

export default function NamespacesPage() {
  return (
    <KestraPageShell
      title="Namespaces"
      subtitle="Organize flows and related runtime files by namespace."
      searchPlaceholder="Search namespaces"
      columns={['Namespace', 'Flows', 'Files', 'Updated']}
      emptyTitle="No namespaces found."
      emptyDescription="Namespaces will appear here after flow definitions are promoted to the Kestra-style model."
      primaryActionLabel="Create namespace"
    />
  );
}
