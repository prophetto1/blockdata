import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { InstanceConfigPanel } from '@/pages/settings/InstanceConfigPanel';
import { SettingsPageFrame } from '@/pages/settings/SettingsPageHeader';

export function Component() {
  useShellHeaderTitle({ title: 'Instance Config', breadcrumbs: ['Blockdata Admin', 'Instance Config'] });

  return (
    <SettingsPageFrame
      title="Instance Config"
      description="Manage instance-wide execution, registry, alerting, observability, and secret-storage settings."
      headerVariant="admin"
      bodyClassName="p-0"
    >
      <InstanceConfigPanel />
    </SettingsPageFrame>
  );
}
