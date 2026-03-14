import { Workbench } from '@/components/workbench/Workbench';
import { EXTRACT_DEFAULT_PANES, EXTRACT_TABS, useExtractWorkbench } from './useExtractWorkbench';

export default function ExtractPage() {
  const { renderContent } = useExtractWorkbench();

  return (
    <div className="h-full w-full min-h-0 p-2">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <Workbench
          tabs={EXTRACT_TABS}
          defaultPanes={EXTRACT_DEFAULT_PANES}
          saveKey="extract-documents-v1"
          renderContent={renderContent}
          className="extract-workbench"
          hideToolbar
          disableDrag
          lockLayout
          maxColumns={3}
        />
      </div>
    </div>
  );
}
