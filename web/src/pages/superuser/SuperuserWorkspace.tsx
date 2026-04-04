import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Workbench } from '@/components/workbench/Workbench';
import { normalizePaneWidths, type Pane } from '@/components/workbench/workbenchState';
import { IconDatabase, IconSettings } from '@tabler/icons-react';

import { Component as SuperuserProvisioningMonitor } from './SuperuserProvisioningMonitor';
import { Component as SuperuserStoragePolicy } from './SuperuserStoragePolicy';

const TABS = [
  { id: 'storage-policy', label: 'Storage Policy', icon: IconSettings },
  { id: 'provisioning-monitor', label: 'Provisioning Monitor', icon: IconDatabase },
];

const DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-1', tabs: ['storage-policy'], activeTab: 'storage-policy', width: 45 },
  { id: 'pane-2', tabs: ['provisioning-monitor'], activeTab: 'provisioning-monitor', width: 55 },
]);

function renderContent(tabId: string) {
  if (tabId === 'storage-policy') return <SuperuserStoragePolicy />;
  if (tabId === 'provisioning-monitor') return <SuperuserProvisioningMonitor />;
  return null;
}

export function Component() {
  useShellHeaderTitle({ title: 'Blockdata Admin', breadcrumbs: ['Blockdata Admin'] });

  return (
    <div className="h-full w-full min-h-0 p-2">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <Workbench
          tabs={TABS}
          defaultPanes={DEFAULT_PANES}
          saveKey="superuser-workbench-layout"
          renderContent={renderContent}
          hideToolbar
        />
      </div>
    </div>
  );
}
