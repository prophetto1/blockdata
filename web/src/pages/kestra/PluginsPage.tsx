import KestraPageShell from './KestraPageShell';

export default function PluginsPage() {
  return (
    <KestraPageShell
      title="Plugins"
      subtitle="Browse mapped plugins and runtime handler readiness."
      searchPlaceholder="Search plugins"
      columns={['Plugin', 'Group', 'Kind', 'Readiness', 'Actions']}
      emptyTitle="No plugins loaded."
      emptyDescription="Plugin inventory will appear here when the normalized Kestra catalog is wired."
    />
  );
}
