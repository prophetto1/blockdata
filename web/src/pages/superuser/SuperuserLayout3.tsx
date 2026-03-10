import { Workbench } from '@/components/workbench/Workbench';
import { useWorkspaceEditor, WORKSPACE_TABS, WORKSPACE_DEFAULT_PANES } from './useWorkspaceEditor';

export function Component() {
  const { renderContent } = useWorkspaceEditor('layout-3-dir');
  return (
    <div className="h-full w-full min-h-0 p-2">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <Workbench
          tabs={WORKSPACE_TABS}
          defaultPanes={WORKSPACE_DEFAULT_PANES}
          saveKey="superuser-layout-3"
          renderContent={renderContent}
          hideToolbar
        />
      </div>
    </div>
  );
}
