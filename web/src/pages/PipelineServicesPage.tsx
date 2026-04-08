import { useState } from 'react';
import { PipelineCatalogPanel } from '@/components/pipelines/PipelineCatalogPanel';
import { PipelineOperationalProbePanel } from '@/components/pipelines/PipelineOperationalProbePanel';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import {
  executePipelineBrowserUploadProbe,
  executePipelineJobExecutionProbe,
  type RuntimeProbeRun,
} from '@/lib/pipelineService';
import { usePipelineServicesOverview } from './usePipelineServicesOverview';

export default function PipelineServicesPage() {
  const { services, loading, error } = usePipelineServicesOverview();
  const { resolvedProjectId } = useProjectFocus();
  const [browserUploadRun, setBrowserUploadRun] = useState<RuntimeProbeRun | null>(null);
  const [jobExecutionRun, setJobExecutionRun] = useState<RuntimeProbeRun | null>(null);
  const [runningBrowserUpload, setRunningBrowserUpload] = useState(false);
  const [runningJobExecution, setRunningJobExecution] = useState(false);

  const primaryService = services[0] ?? null;

  async function runBrowserUploadProbe() {
    if (!resolvedProjectId || !primaryService) return;
    try {
      setRunningBrowserUpload(true);
      setBrowserUploadRun(await executePipelineBrowserUploadProbe({
        projectId: resolvedProjectId,
        pipelineKind: primaryService.pipelineKind,
      }));
    } finally {
      setRunningBrowserUpload(false);
    }
  }

  async function runJobExecutionProbe() {
    if (!resolvedProjectId || !primaryService) return;
    try {
      setRunningJobExecution(true);
      setJobExecutionRun(await executePipelineJobExecutionProbe({
        projectId: resolvedProjectId,
        pipelineKind: primaryService.pipelineKind,
      }));
    } finally {
      setRunningJobExecution(false);
    }
  }

  return (
    <PipelineCatalogPanel
      services={services}
      loading={loading}
      error={error}
      probePanel={resolvedProjectId && primaryService ? (
        <PipelineOperationalProbePanel
          serviceLabel={primaryService.label}
          browserUploadRun={browserUploadRun}
          jobExecutionRun={jobExecutionRun}
          isRunningBrowserUpload={runningBrowserUpload}
          isRunningJobExecution={runningJobExecution}
          onRunBrowserUpload={runBrowserUploadProbe}
          onRunJobExecution={runJobExecutionProbe}
        />
      ) : null}
    />
  );
}
