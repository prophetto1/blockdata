import { WorkbenchPage } from '@/components/common/WorkbenchPage';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { StateManagementOwnershipSurface } from '@/components/superuser/StateManagementOwnershipSurface';

export function Component() {
  useShellHeaderTitle({
    title: 'State Management',
    breadcrumbs: ['Superuser', 'State Management'],
  });

  return (
    <WorkbenchPage
      eyebrow="Control Tower"
      title="State Management"
      description="Page-first registry for superuser state ownership, visibility, and invalidation behavior."
      contentClassName="gap-4 bg-background"
    >
      <StateManagementOwnershipSurface />
    </WorkbenchPage>
  );
}
