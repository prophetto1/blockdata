import { useEffect, useMemo, useState } from 'react';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { type PipelineServiceViewModel } from '@/components/pipelines/PipelineCatalogPanel';
import { platformApiFetch } from '@/lib/platformApi';
import type { PipelineDefinition } from '@/lib/pipelineService';

export const PIPELINE_SERVICES: PipelineServiceViewModel[] = [
  {
    slug: 'index-builder',
    pipelineKind: 'markdown_index_builder',
    label: 'Index Builder',
    description: 'Build lexical and semantic retrieval packages from markdown sources.',
    eligibleSourceTypes: ['md', 'markdown'],
    deliverableKinds: ['lexical_sqlite', 'semantic_zip'],
  },
];

export const PIPELINE_SERVICES_BY_SLUG = new Map(
  PIPELINE_SERVICES.map((service) => [service.slug, service]),
);

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Unable to load pipeline definitions.';
}

export function mergePipelineServiceDefinition(
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

function usePipelineDefinitions() {
  const [definitions, setDefinitions] = useState<PipelineDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return { definitions, loading, error };
}

export function useResolvedPipelineService(serviceSlug: string) {
  const { definitions, loading, error } = usePipelineDefinitions();

  const service = useMemo(() => {
    const selectedService = PIPELINE_SERVICES_BY_SLUG.get(serviceSlug) ?? null;
    return selectedService
      ? mergePipelineServiceDefinition(selectedService, definitions)
      : null;
  }, [definitions, serviceSlug]);

  return { service, loading, error };
}

export function usePipelineServicesOverview() {
  const { definitions, loading, error } = usePipelineDefinitions();

  useShellHeaderTitle({
    breadcrumbs: ['Pipeline Services'],
  });

  const services = useMemo(
    () => PIPELINE_SERVICES.map((service) => mergePipelineServiceDefinition(service, definitions)),
    [definitions],
  );

  return { services, loading, error };
}
