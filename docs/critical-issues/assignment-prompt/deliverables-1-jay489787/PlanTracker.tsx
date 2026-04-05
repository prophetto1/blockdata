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
        <div className="border-b border-border px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Browser-local tracker workspace
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            Lifecycle navigator, document workspace, and workflow inspector
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Reads and writes tracker-managed Markdown artifacts from disk through the File System Access API.
          </div>
        </div>

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
