import { Workbench } from '@/components/workbench/Workbench';
import { useAssetsWorkbench, ASSETS_TABS, ASSETS_DEFAULT_PANES } from './useAssetsWorkbench';

export default function ProjectAssetsPage() {
  const { renderContent, workbenchRef } = useAssetsWorkbench();
  return (
    <div className="h-full w-full min-h-0 p-2">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <Workbench
          ref={workbenchRef}
          tabs={ASSETS_TABS}
          defaultPanes={ASSETS_DEFAULT_PANES}
          saveKey="project-assets-v2"
          renderContent={renderContent}
          className="assets-workbench"
          hideToolbar
          disableDrag
          lockLayout
          maxColumns={2}
        />
      </div>
    </div>
  );
}
