import { Workbench } from '@/components/workbench/Workbench';
import { useParseWorkbench } from './useParseWorkbench';

export default function ParsePage() {
  const { renderContent, dynamicTabLabel, workbenchRef, mobilePreviewPanel, tabs, defaultPanes } = useParseWorkbench();
  return (
    <div className="h-full w-full min-h-0 p-2">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <Workbench
          ref={workbenchRef}
          tabs={tabs}
          defaultPanes={defaultPanes}
          saveKey="parse-documents-v4"
          renderContent={renderContent}
          dynamicTabLabel={dynamicTabLabel}
          className="parse-workbench"
          hideToolbar
          disableDrag
          lockLayout
          maxColumns={3}
          mobileTabs={['parse-compact', 'config', 'parse-settings']}
        />
      </div>
      {mobilePreviewPanel}
    </div>
  );
}
