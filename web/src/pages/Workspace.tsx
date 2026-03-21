import { Workbench } from '@/components/workbench/Workbench';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { useWorkspaceEditor, WORKSPACE_TABS, WORKSPACE_DEFAULT_PANES } from './superuser/useWorkspaceEditor';

export function Component() {
  useShellHeaderTitle({});
  const { renderContent } = useWorkspaceEditor('workspace-dir');
  return (
    <div className="h-full w-full min-h-0 p-2">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <Workbench
          tabs={WORKSPACE_TABS}
          defaultPanes={WORKSPACE_DEFAULT_PANES}
          saveKey="workspace-layout-1"
          renderContent={renderContent}
          hideToolbar
          maxColumns={4}
          maxTabsPerPane={2}
        />
      </div>
    </div>
  );
}
