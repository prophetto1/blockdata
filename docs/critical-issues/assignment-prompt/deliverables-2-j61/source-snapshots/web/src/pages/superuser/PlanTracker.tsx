import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Workbench } from '@/components/workbench/Workbench';

import {
  PLAN_TRACKER_DEFAULT_PANES,
  PLAN_TRACKER_TABS,
  usePlanTracker,
} from './usePlanTracker';

export function Component() {
  useShellHeaderTitle({ title: 'Plan Tracker', breadcrumbs: ['Superuser'] });

  const tracker = usePlanTracker();

  return (
    <div className="h-full w-full min-h-0 p-2" data-testid="plan-tracker-shell">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <Workbench
          tabs={PLAN_TRACKER_TABS}
          defaultPanes={PLAN_TRACKER_DEFAULT_PANES}
          saveKey="plan-tracker-layout-v2"
          renderContent={tracker.renderContent}
          hideToolbar
          maxColumns={3}
          minColumns={3}
          maxTabsPerPane={1}
          disableDrag
          lockLayout
        />
      </div>
    </div>
  );
}
