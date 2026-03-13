import { Workbench } from '@/components/workbench/Workbench';
import { useParseWorkbench, PARSE_TABS, PARSE_DEFAULT_PANES } from './useParseWorkbench';

export default function ParsePage() {
  const { renderContent } = useParseWorkbench();
  return (
    <div className="h-full w-full min-h-0 p-2">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <Workbench
          tabs={PARSE_TABS}
          defaultPanes={PARSE_DEFAULT_PANES}
          saveKey="parse-documents"
          renderContent={renderContent}
          hideToolbar
          disableDrag
          maxColumns={2}
        />
      </div>
    </div>
  );
}
