import { Workbench } from '@/components/workbench/Workbench';
import {
  INDEX_BUILDER_TABS,
  useIndexBuilderWorkbench,
} from './useIndexBuilderWorkbench';

export default function IndexBuilderPage() {
  const { workbenchRef, defaultPanes, renderContent, saveKey } = useIndexBuilderWorkbench();

  return (
    <div className="h-full w-full min-h-0 p-2">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <Workbench
          ref={workbenchRef}
          key={saveKey}
          tabs={INDEX_BUILDER_TABS}
          defaultPanes={defaultPanes}
          saveKey={saveKey}
          renderContent={renderContent}
          className="pipeline-services-workbench"
          hideToolbar
          disableDrag
          lockLayout
          maxColumns={1}
        />
      </div>
    </div>
  );
}
