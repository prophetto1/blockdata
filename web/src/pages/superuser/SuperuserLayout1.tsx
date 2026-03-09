import { Workbench } from '@/components/workbench/Workbench';
import { normalizePaneWidths, type Pane } from '@/components/workbench/workbenchState';
import { IconLayoutDashboard, IconSettings, IconDatabase, IconChartBar } from '@tabler/icons-react';

const TABS = [
  { id: 'panel-a', label: 'Panel A', icon: IconLayoutDashboard },
  { id: 'panel-b', label: 'Panel B', icon: IconSettings },
  { id: 'panel-c', label: 'Panel C', icon: IconDatabase },
  { id: 'panel-d', label: 'Panel D', icon: IconChartBar },
];

const DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-1', tabs: ['panel-a'], activeTab: 'panel-a', width: 50 },
  { id: 'pane-2', tabs: ['panel-b'], activeTab: 'panel-b', width: 50 },
]);

function renderContent(_tabId: string) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted-foreground)', fontSize: '0.875rem', opacity: 0.5 }}>
      Placeholder
    </div>
  );
}

export function Component() {
  return (
    <div className="h-full w-full min-h-0 p-2">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <Workbench
          tabs={TABS}
          defaultPanes={DEFAULT_PANES}
          saveKey="superuser-layout-1"
          renderContent={renderContent}
          hideToolbar
        />
      </div>
    </div>
  );
}
