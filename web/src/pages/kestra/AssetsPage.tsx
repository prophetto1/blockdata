import KestraPageShell from './KestraPageShell';

export default function AssetsPage() {
  return (
    <KestraPageShell
      title="Assets"
      subtitle="Browse shared assets, files, and runtime artifacts."
      searchPlaceholder="Search assets"
      columns={['Name', 'Type', 'Namespace', 'Updated', 'Actions']}
      emptyTitle="No assets found."
      emptyDescription="Assets will appear here after the shared file and artifact surfaces are wired."
      primaryActionLabel="Upload asset"
    />
  );
}
