import { platformApiFetch } from '@/lib/platformApi';
import {
  prepareSourceUpload,
  type CompletedUpload,
  type PreparedSourceUpload,
  type UploadReservation,
} from '@/lib/storageUploadService';
import {
  cancelUploadReservation,
  postUploadApiJson,
  reserveUploadWithConflictRecovery,
} from '@/lib/uploadReservationRecovery';

export type PipelineDefinition = {
  pipeline_kind: string;
  label: string;
  supports_manual_trigger: boolean;
  eligible_source_types: string[];
  deliverable_kinds: string[];
};

export type PipelineSource = {
  pipeline_source_id: string;
  source_uid: string;
  project_id: string;
  doc_title: string;
  source_type: string;
  content_type?: string;
  byte_size?: number;
  created_at?: string;
};

export type PipelineDeliverable = {
  deliverable_kind: string;
  filename: string;
  content_type: string;
  byte_size: number;
  created_at: string;
};

export type PipelineJob = {
  job_id: string;
  pipeline_kind: string;
  source_set_id: string;
  source_uid?: string | null;
  status: string;
  stage: string;
  failure_stage?: string | null;
  error_message?: string | null;
  section_count?: number | null;
  chunk_count?: number | null;
  embedding_provider?: string | null;
  embedding_model?: string | null;
  created_at?: string | null;
  started_at?: string | null;
  claimed_at?: string | null;
  heartbeat_at?: string | null;
  completed_at?: string | null;
  deliverables: PipelineDeliverable[];
};

export type PipelineJobSummary = {
  job_id: string;
  pipeline_kind: string;
  source_set_id: string;
  status: string;
  stage: string;
  started_at?: string | null;
};

export type PipelineUploadResult = {
  sourceUid: string;
  reservation: UploadReservation;
  completed: CompletedUpload;
};

export type RuntimeProbeRun = {
  probe_run_id: string;
  probe_kind: string;
  check_id: string | null;
  result: string;
  duration_ms: number;
  evidence: Record<string, unknown>;
  failure_reason?: string | null;
  created_at?: string | null;
};

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

function normalizeJob(job: PipelineJob | null | undefined): PipelineJob | null {
  if (!job) return null;
  return {
    ...job,
    deliverables: Array.isArray(job.deliverables) ? job.deliverables : [],
  };
}

export async function listPipelineDefinitions(): Promise<PipelineDefinition[]> {
  const response = await platformApiFetch('/pipelines/definitions');
  const payload = await parseJsonResponse<{ items?: PipelineDefinition[] }>(
    response,
    'pipeline definitions request failed',
  );
  return Array.isArray(payload.items) ? payload.items : [];
}

export async function executePipelineBrowserUploadProbe(params: {
  projectId: string;
  pipelineKind: string;
}): Promise<RuntimeProbeRun> {
  return postJson<RuntimeProbeRun>(
    '/admin/runtime/pipeline-services/browser-upload/probe',
    {
      project_id: params.projectId,
      pipeline_kind: params.pipelineKind,
    },
    'pipeline browser-upload probe failed',
  );
}

export async function executePipelineJobExecutionProbe(params: {
  projectId: string;
  pipelineKind: string;
}): Promise<RuntimeProbeRun> {
  return postJson<RuntimeProbeRun>(
    '/admin/runtime/pipeline-services/job-execution/probe',
    {
      project_id: params.projectId,
      pipeline_kind: params.pipelineKind,
    },
    'pipeline job-execution probe failed',
  );
}

export async function listPipelineSources(params: {
  pipelineKind: string;
  projectId: string;
  search?: string;
}): Promise<PipelineSource[]> {
  const query = buildQuery({
    project_id: params.projectId,
    search: params.search,
  });
  const response = await platformApiFetch(`/pipelines/${params.pipelineKind}/sources${query}`);
  const payload = await parseJsonResponse<{ items?: PipelineSource[] }>(
    response,
    'pipeline sources request failed',
  );
  return Array.isArray(payload.items) ? payload.items : [];
}

export async function createPipelineJob(params: {
  pipelineKind: string;
  sourceSetId: string;
}): Promise<PipelineJobSummary> {
  return postJson<PipelineJobSummary>(
    `/pipelines/${params.pipelineKind}/jobs`,
    { source_set_id: params.sourceSetId },
    'pipeline job create failed',
  );
}

export async function getLatestPipelineJob(params: {
  pipelineKind: string;
  sourceSetId: string;
}): Promise<PipelineJob | null> {
  const response = await platformApiFetch(
    `/pipelines/${params.pipelineKind}/jobs/latest${buildQuery({ source_set_id: params.sourceSetId })}`,
  );
  const payload = await parseJsonResponse<{ job?: PipelineJob | null }>(
    response,
    'pipeline latest-job request failed',
  );
  return normalizeJob(payload.job ?? null);
}

export async function getPipelineJob(params: {
  jobId: string;
}): Promise<PipelineJob> {
  const response = await platformApiFetch(`/pipelines/jobs/${params.jobId}`);
  const payload = await parseJsonResponse<{ job: PipelineJob }>(
    response,
    'pipeline job read failed',
  );
  return normalizeJob(payload.job) as PipelineJob;
}

export async function listPipelineDeliverables(params: {
  jobId: string;
}): Promise<PipelineDeliverable[]> {
  const response = await platformApiFetch(`/pipelines/jobs/${params.jobId}/deliverables`);
  const payload = await parseJsonResponse<{ items?: PipelineDeliverable[] }>(
    response,
    'pipeline deliverables request failed',
  );
  return Array.isArray(payload.items) ? payload.items : [];
}

export async function downloadPipelineDeliverable(params: {
  jobId: string;
  deliverableKind: string;
}): Promise<Blob> {
  const response = await platformApiFetch(
    `/pipelines/jobs/${params.jobId}/deliverables/${params.deliverableKind}/download`,
  );
  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `pipeline deliverable download failed: ${response.status}`);
  }
  return await response.blob();
}

async function reservePipelineUpload(params: {
  projectId: string;
  prepared: PreparedSourceUpload;
  serviceSlug: string;
}): Promise<UploadReservation> {
  return reserveUploadWithConflictRecovery(() => (
    postUploadApiJson<UploadReservation>(
      '/storage/uploads',
      {
        project_id: params.projectId,
        ...params.prepared,
        storage_surface: 'pipeline-services',
        storage_service_slug: params.serviceSlug,
      },
      'pipeline upload reservation failed',
    )
  ));
}

export async function uploadPipelineSource(params: {
  projectId: string;
  serviceSlug: string;
  file: File;
  docTitle?: string;
}): Promise<PipelineUploadResult> {
  const prepared = await prepareSourceUpload(params.file, { docTitle: params.docTitle });
  const reservation = await reservePipelineUpload({
    projectId: params.projectId,
    prepared,
    serviceSlug: params.serviceSlug,
  });

  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(reservation.signed_upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': prepared.content_type },
      body: params.file,
    });
  } catch (error) {
    await cancelUploadReservation(reservation.reservation_id);
    throw error;
  }

  if (!uploadResponse.ok) {
    await cancelUploadReservation(reservation.reservation_id);
    throw new Error(`signed upload failed: ${uploadResponse.status}`);
  }

  const completed = await postUploadApiJson<CompletedUpload>(
    `/storage/uploads/${reservation.reservation_id}/complete`,
    { actual_bytes: params.file.size },
    'pipeline upload completion failed',
  );

  return {
    sourceUid: prepared.source_uid,
    reservation,
    completed,
  };
}
