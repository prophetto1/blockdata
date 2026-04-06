import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { WorkerConfigPanel } from '@/pages/settings/WorkerConfigPanel';
import { SettingsPageFrame } from '@/pages/settings/SettingsPageHeader';

export function Component() {
  useShellHeaderTitle({ title: 'Worker Config', breadcrumbs: ['Blockdata Admin', 'Worker Config'] });

  return (
    <SettingsPageFrame
      title="Worker Config"
      description="Manage worker batching, queue-claim, retry, and caching settings for extraction operations."
      headerVariant="admin"
      bodyClassName="p-0"
    >
      <WorkerConfigPanel />
    </SettingsPageFrame>
  );
}
