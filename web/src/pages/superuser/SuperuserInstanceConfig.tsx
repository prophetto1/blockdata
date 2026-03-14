import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { InstanceConfigPanel } from '@/pages/settings/InstanceConfigPanel';

export function Component() {
  useShellHeaderTitle({ title: 'Instance Config', breadcrumbs: ['Settings', 'Admin', 'Instance Config'] });

  return (
    <div className="h-full min-h-0">
      <InstanceConfigPanel />
    </div>
  );
}
