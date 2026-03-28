import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IconLayoutDashboard, IconTransform } from '@tabler/icons-react';
import type { WorkbenchTab } from '@/components/workbench/Workbench';
import { normalizePaneWidths, type Pane } from '@/components/workbench/workbenchState';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import { platformApiFetch } from '@/lib/platformApi';
import { PipelineCatalogPanel, type PipelineServiceViewModel } from '@/components/pipelines/PipelineCatalogPanel';
import { PipelineUploadPanel } from '@/components/pipelines/PipelineUploadPanel';
import { PipelineJobStatusPanel } from '@/components/pipelines/PipelineJobStatusPanel';
import { PipelineDeliverablesPanel } from '@/components/pipelines/PipelineDeliverablesPanel';
import { usePipelineJob } from '@/hooks/usePipelineJob';
import {
  downloadPipelineDeliverable,
  type PipelineDefinition,
  type PipelineDeliverable,
  uploadPipelineSource,
} from '@/lib/pipelineService';

const PIPELINE_SERVICES: PipelineServiceViewModel[] = [
  {
    slug: 'index-builder',
    pipelineKind: 'markdown_index_builder',
    label: 'Index Builder',
    description: 'Build lexical and semantic retrieval packages from markdown sources.',
    eligibleSourceTypes: ['md', 'markdown'],
    deliverableKinds: ['lexical_sqlite', 'semantic_zip'],
  },
];

const PIPELINE_SERVICES_BY_SLUG = new Map(
  PIPELINE_SERVICES.map((service) => [service.slug, service]),
);

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Unable to load pipeline definitions.';
}

function mergeServiceDefinition(
  service: PipelineServiceViewModel,
  definitions: PipelineDefinition[],
): PipelineServiceViewModel {
  const definition = definitions.find((item) => item.pipeline_kind === service.pipelineKind);
  if (!definition) return service;

  return {
    ...service,
    label: definition.label?.trim() || service.label,
    eligibleSourceTypes: definition.eligible_source_types?.length
      ? definition.eligible_source_types
      : service.eligibleSourceTypes,
    deliverableKinds: definition.deliverable_kinds?.length
      ? definition.deliverable_kinds
      : service.deliverableKinds,
  };
}

function PipelineServiceOverview({
  service,
  projectId,
  pipelineJob,
  onUpload,
  onDownload,
  downloadError,
  downloadingKind,
}: {
  service: PipelineServiceViewModel | null;
  projectId: string | null;
  pipelineJob: ReturnType<typeof usePipelineJob>;
  onUpload: (file: File) => Promise<void>;
  onDownload: (deliverable: PipelineDeliverable) => Promise<void>;
  downloadError: string | null;
  downloadingKind: string | null;
}) {
  if (!service) {
    return (
      <div className="h-full overflow-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-6">
          <section className="rounded-2xl border border-border bg-card px-6 py-6">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Pipeline Services</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Select a service from the catalog to continue.
            </p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-6">
        <PipelineUploadPanel
          service={service}
          projectId={projectId}
          sources={pipelineJob.sources}
          sourcesLoading={pipelineJob.sourcesLoading}
          sourcesError={pipelineJob.sourcesError}
          selectedSourceUid={pipelineJob.selectedSourceUid}
          onSelectSource={pipelineJob.setSelectedSourceUid}
          onTrigger={pipelineJob.triggerJob}
          onUpload={onUpload}
          isTriggering={pipelineJob.isTriggering}
        />
        <PipelineJobStatusPanel
          job={pipelineJob.job}
          loading={pipelineJob.jobLoading}
          error={pipelineJob.jobError ?? pipelineJob.triggerError}
          isPolling={pipelineJob.isPolling}
        />
        <PipelineDeliverablesPanel
          job={pipelineJob.job}
          onDownload={onDownload}
          downloadError={downloadError}
          downloadingKind={downloadingKind}
        />
      </div>
    </div>
  );
}

export const PIPELINE_SERVICES_TABS: WorkbenchTab[] = [
  { id: 'pipeline-services-catalog', label: 'Services', icon: IconLayoutDashboard },
  { id: 'pipeline-services-overview', label: 'Service Overview', icon: IconTransform },
];

export function buildPipelineServicesDefaultPanes(serviceSlug?: string): Pane[] {
  return normalizePaneWidths([
    {
      id: 'pane-pipeline-services',
      tabs: ['pipeline-services-catalog', 'pipeline-services-overview'],
      activeTab: serviceSlug ? 'pipeline-services-overview' : 'pipeline-services-catalog',
      width: 100,
    },
  ]);
}

export function usePipelineServicesWorkbench() {
  const { serviceSlug } = useParams<{ serviceSlug?: string }>();
  const { resolvedProjectId } = useProjectFocus();
  const [definitions, setDefinitions] = useState<PipelineDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingKind, setDownloadingKind] = useState<string | null>(null);

  const selectedService = serviceSlug ? PIPELINE_SERVICES_BY_SLUG.get(serviceSlug) ?? null : null;
  const resolvedServices = PIPELINE_SERVICES.map((service) => mergeServiceDefinition(service, definitions));
  const resolvedSelectedService = selectedService
    ? mergeServiceDefinition(selectedService, definitions)
    : null;

  const pipelineJob = usePipelineJob({
    projectId: resolvedProjectId,
    pipelineKind: resolvedSelectedService?.pipelineKind ?? null,
  });

  useShellHeaderTitle({
    breadcrumbs: resolvedSelectedService
      ? ['Pipeline Services', resolvedSelectedService.label]
      : ['Pipeline Services'],
  });

  useEffect(() => {
    let cancelled = false;

    async function loadDefinitions() {
      try {
        setLoading(true);
        setError(null);
        const response = await platformApiFetch('/pipelines/definitions');
        if (!response.ok) {
          throw new Error(`Pipeline definitions request failed with status ${response.status}.`);
        }
        const payload = await response.json() as { items?: PipelineDefinition[] };
        if (!cancelled) {
          setDefinitions(Array.isArray(payload.items) ? payload.items : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(formatErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDefinitions();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    if (!resolvedProjectId || !resolvedSelectedService) {
      throw new Error('Select a project before uploading a markdown source.');
    }
    const uploaded = await uploadPipelineSource({
      projectId: resolvedProjectId,
      serviceSlug: resolvedSelectedService.slug,
      file,
    });
    await pipelineJob.refreshSources();
    pipelineJob.setSelectedSourceUid(uploaded.sourceUid);
  }, [pipelineJob.refreshSources, pipelineJob.setSelectedSourceUid, resolvedProjectId, resolvedSelectedService]);

  const handleDownload = useCallback(async (deliverable: PipelineDeliverable) => {
    if (!pipelineJob.job) return;
    try {
      setDownloadingKind(deliverable.deliverable_kind);
      setDownloadError(null);
      const blob = await downloadPipelineDeliverable({
        jobId: pipelineJob.job.job_id,
        deliverableKind: deliverable.deliverable_kind,
      });
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = deliverable.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (downloadIssue) {
      setDownloadError(formatErrorMessage(downloadIssue));
    } finally {
      setDownloadingKind(null);
    }
  }, [pipelineJob.job]);

  const defaultPanes = buildPipelineServicesDefaultPanes(serviceSlug);

  function renderContent(tabId: string) {
    if (tabId === 'pipeline-services-catalog') {
      return (
        <PipelineCatalogPanel
          services={resolvedServices}
          loading={loading}
          error={error}
        />
      );
    }

    if (tabId === 'pipeline-services-overview') {
      return (
        <PipelineServiceOverview
          service={resolvedSelectedService}
          projectId={resolvedProjectId}
          pipelineJob={pipelineJob}
          onUpload={handleUpload}
          onDownload={handleDownload}
          downloadError={downloadError}
          downloadingKind={downloadingKind}
        />
      );
    }

    return null;
  }

  return {
    defaultPanes,
    renderContent,
    pageKey: serviceSlug ?? 'landing',
  };
}
