import { CoordinationRuntimeSurface } from '@/components/superuser/CoordinationRuntimeSurface';
import { WorkbenchPage } from '@/components/common/WorkbenchPage';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';

export function Component() {
  useShellHeaderTitle({
    title: 'Coordination Runtime',
    breadcrumbs: ['Superuser', 'Coordination Runtime'],
  });

  return (
    <WorkbenchPage
      title="Coordination Runtime"
      hideHeader
      contentClassName="gap-4 bg-background"
    >
      <CoordinationRuntimeSurface />
    </WorkbenchPage>
  );
}
