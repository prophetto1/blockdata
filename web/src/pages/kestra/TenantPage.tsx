import KestraPageShell from './KestraPageShell';

export default function TenantPage() {
  return (
    <KestraPageShell
      title="Tenant"
      subtitle="Review tenant-scoped settings, labels, and runtime identity surfaces."
      searchPlaceholder="Search tenant settings"
      columns={['Setting', 'Value', 'Updated']}
      emptyTitle="No tenant settings found."
      emptyDescription="Tenant-level parity work will land here once the matching backend contract is in place."
    />
  );
}
