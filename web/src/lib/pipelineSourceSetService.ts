import { platformApiFetch } from '@/lib/platformApi';
import type { PipelineJobSummary, PipelineSource } from '@/lib/pipelineService';

export type PipelineSourceSetItem = PipelineSource & {
  source_order: number;
  object_key?: string;
};

export type PipelineSourceSet = {
  source_set_id: string;
  project_id: string;
  label: string;
  member_count: number;
  total_bytes: number;
  created_at?: string;
  updated_at?: string;
  items: PipelineSourceSetItem[];
  latest_job: PipelineJobSummary | null;
};

export type PipelineSourceSetSummary = Omit<PipelineSourceSet, 'items'>;

function buildQuery(params: Record<string, string | undefined | null>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue;
    searchParams.set(key, value);
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `${fallbackMessage}: ${response.status}`);
  }
  return await response.json() as T;
}

async function postJson<T>(path: string, body: unknown, fallbackMessage: string): Promise<T> {
  const response = await platformApiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseJsonResponse<T>(response, fallbackMessage);
}

async function patchJson<T>(path: string, body: unknown, fallbackMessage: string): Promise<T> {
  const response = await platformApiFetch(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseJsonResponse<T>(response, fallbackMessage);
}

export async function listPipelineSourceSets(params: {
  pipelineKind: string;
  projectId: string;
}): Promise<PipelineSourceSetSummary[]> {
  const response = await platformApiFetch(
    `/pipelines/${params.pipelineKind}/source-sets${buildQuery({ project_id: params.projectId })}`,
  );
  const payload = await parseJsonResponse<{ items?: PipelineSourceSetSummary[] }>(
    response,
    'pipeline source-set list request failed',
  );
  return Array.isArray(payload.items) ? payload.items : [];
}

export async function getPipelineSourceSet(params: {
  pipelineKind: string;
  sourceSetId: string;
}): Promise<PipelineSourceSet> {
  const response = await platformApiFetch(
    `/pipelines/${params.pipelineKind}/source-sets/${params.sourceSetId}`,
  );
  const payload = await parseJsonResponse<{ source_set: PipelineSourceSet }>(
    response,
    'pipeline source-set read failed',
  );
  return payload.source_set;
}

export async function createPipelineSourceSet(params: {
  pipelineKind: string;
  projectId: string;
  label: string;
  pipelineSourceIds: string[];
}): Promise<PipelineSourceSet> {
  const payload = await postJson<{ source_set: PipelineSourceSet }>(
    `/pipelines/${params.pipelineKind}/source-sets`,
    {
      project_id: params.projectId,
      label: params.label,
      pipeline_source_ids: params.pipelineSourceIds,
    },
    'pipeline source-set create failed',
  );
  return payload.source_set;
}

export async function updatePipelineSourceSet(params: {
  pipelineKind: string;
  sourceSetId: string;
  label?: string;
  pipelineSourceIds?: string[];
}): Promise<PipelineSourceSet> {
  const payload = await patchJson<{ source_set: PipelineSourceSet }>(
    `/pipelines/${params.pipelineKind}/source-sets/${params.sourceSetId}`,
    {
      label: params.label,
      pipeline_source_ids: params.pipelineSourceIds,
    },
    'pipeline source-set update failed',
  );
  return payload.source_set;
}
