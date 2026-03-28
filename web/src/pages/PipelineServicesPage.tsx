import { Workbench } from '@/components/workbench/Workbench';
import {
  PIPELINE_SERVICES_TABS,
  usePipelineServicesWorkbench,
} from './usePipelineServicesWorkbench';

export default function PipelineServicesPage() {
  const { defaultPanes, renderContent, pageKey } = usePipelineServicesWorkbench();

  return (
    <div className="h-full w-full min-h-0 p-2">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <Workbench
          key={pageKey}
          tabs={PIPELINE_SERVICES_TABS}
          defaultPanes={defaultPanes}
          saveKey={`pipeline-services-${pageKey}-v1`}
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
