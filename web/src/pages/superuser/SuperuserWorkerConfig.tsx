import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { WorkerConfigPanel } from '@/pages/settings/WorkerConfigPanel';

export function Component() {
  useShellHeaderTitle({ title: 'Worker Config', breadcrumbs: ['Blockdata Admin', 'Worker Config'] });

  return (
    <div className="h-full min-h-0">
      <WorkerConfigPanel />
    </div>
  );
}
