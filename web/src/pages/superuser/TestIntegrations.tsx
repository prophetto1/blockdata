import { Workbench } from '@/components/workbench/Workbench';
import { SettingsPageFrame } from '@/pages/settings/SettingsPageHeader';
import { useWorkspaceEditor, WORKSPACE_TABS, WORKSPACE_DEFAULT_PANES } from './useWorkspaceEditor';

export function Component() {
  const { renderContent } = useWorkspaceEditor('test-integrations-dir');
  return (
    <SettingsPageFrame
      title="Test Integrations"
      description="Open the integration workbench for validating external services, routes, and runtime connectivity."
      headerVariant="admin"
      bodyClassName="p-2"
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <Workbench
          tabs={WORKSPACE_TABS}
          defaultPanes={WORKSPACE_DEFAULT_PANES}
          saveKey="test-integrations"
          renderContent={renderContent}
          hideToolbar
          maxColumns={4}
          maxTabsPerPane={2}
        />
      </div>
    </SettingsPageFrame>
  );
}
