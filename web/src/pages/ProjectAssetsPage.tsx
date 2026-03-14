import { Workbench } from '@/components/workbench/Workbench';
import { useAssetsWorkbench, ASSETS_TABS, ASSETS_DEFAULT_PANES } from './useAssetsWorkbench';

export default function ProjectAssetsPage() {
  const { renderContent } = useAssetsWorkbench();
  return (
    <div className="h-full w-full min-h-0 p-2">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <Workbench
          tabs={ASSETS_TABS}
          defaultPanes={ASSETS_DEFAULT_PANES}
          saveKey="project-assets"
          renderContent={renderContent}
          className="assets-workbench"
          hideToolbar
          disableDrag
          lockLayout
          maxColumns={3}
        />
      </div>
    </div>
  );
}
