import { Workbench } from '@/components/workbench/Workbench';
import { CONVERT_DEFAULT_PANES, CONVERT_TABS, useConvertWorkbench } from './useConvertWorkbench';

export default function ConvertPage() {
  const { renderContent } = useConvertWorkbench();

  return (
    <div className="h-full w-full min-h-0 p-2">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <Workbench
          tabs={CONVERT_TABS}
          defaultPanes={CONVERT_DEFAULT_PANES}
          saveKey="convert-documents-v1"
          renderContent={renderContent}
          className="convert-workbench"
          hideToolbar
          disableDrag
          lockLayout
          maxColumns={3}
        />
      </div>
    </div>
  );
}
