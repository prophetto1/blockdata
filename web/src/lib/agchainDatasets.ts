import { platformApiFetch } from '@/lib/platformApi';
import type { AgchainOperationStatus } from '@/lib/agchainRuns';

type JsonObject = Record<string, unknown>;
type JsonList = Record<string, unknown>[];

export type AgchainDatasetSourceType = 'csv' | 'json' | 'jsonl' | 'huggingface';
export type AgchainDatasetStatus = 'active' | 'archived';
export type AgchainDatasetValidationStatus = 'pass' | 'warn' | 'fail' | 'unknown';
export type AgchainDatasetParseStatus = 'ok' | 'warn' | 'error';

export type AgchainFieldSpec = {
  input: JsonObject | null;
  messages: JsonObject | null;
  choices: JsonObject | null;
  target: JsonObject | null;
  id: JsonObject | null;
  metadata: JsonObject | null;
  sandbox: JsonObject | null;
  files: JsonObject | null;
  setup: JsonObject | null;
};

export type AgchainDatasetSourceConfig = {
  source_type: AgchainDatasetSourceType;
  source_uri: string | null;
  delimiter?: string | null;
  headers?: boolean | string[] | null;
  dialect?: string | null;
  encoding?: string | null;
  path_hints?: string[];
  line_mode?: string | null;
  path?: string | null;
  split?: string | null;
  name?: string | null;
  data_dir?: string | null;
  revision?: string | null;
  trust?: boolean | null;
  cached?: boolean | null;
  extra_kwargs?: JsonObject;
};

export type AgchainMaterializationOptions = {
  shuffle: boolean;
  shuffle_choices: boolean;
  limit: number | null;
  auto_id: boolean;
  deterministic_seed: number | null;
};

export type AgchainDatasetValidationIssueGroup = {
  key: string;
  label: string;
  count: number;
  issues: JsonList;
};

export type AgchainDatasetValidationSummary = {
  validation_status: AgchainDatasetValidationStatus;
  warning_count: number;
  duplicate_id_count: number;
  missing_field_count: number;
  unsupported_payload_count: number;
  issue_groups: AgchainDatasetValidationIssueGroup[];
  generated_at: string | null;
  source_hash: string | null;
};

export type AgchainDatasetListRow = {
  dataset_id: string;
  slug: string;
  name: string;
  description: string;
  status: AgchainDatasetStatus;
  source_type: AgchainDatasetSourceType;
  latest_version_id: string | null;
  latest_version_label: string | null;
  sample_count: number;
  validation_status: AgchainDatasetValidationStatus;
  updated_at: string;
};

export type AgchainDatasetVersionSummary = {
  dataset_version_id: string;
  version_label: string;
  created_at: string;
  sample_count: number;
  checksum: string;
  validation_status: AgchainDatasetValidationStatus;
  base_version_id: string | null;
};

export type AgchainDatasetDetail = {
  dataset_id: string;
  slug: string;
  name: string;
  description: string;
  tags: string[];
  status: AgchainDatasetStatus;
  source_type: AgchainDatasetSourceType;
  latest_version_id: string | null;
  latest_version_label: string | null;
  sample_count: number;
  validation_status: AgchainDatasetValidationStatus;
  updated_at: string;
};

export type AgchainDatasetWarningsSummary = Pick<
  AgchainDatasetValidationSummary,
  'warning_count' | 'duplicate_id_count' | 'missing_field_count' | 'unsupported_payload_count'
>;

export type AgchainDatasetDraft = {
  draft_id: string;
  base_version_id: string | null;
  source_config_jsonb: AgchainDatasetSourceConfig;
  field_spec_jsonb: AgchainFieldSpec;
  materialization_options_jsonb: AgchainMaterializationOptions;
  preview_summary: JsonObject;
  validation_summary: AgchainDatasetValidationSummary;
  dirty_state: JsonObject;
};

export type AgchainDatasetSampleSummary = {
  sample_id: string;
  input_preview: string | null;
  target_preview: string | null;
  choices: string[];
  metadata: JsonObject;
  has_setup: boolean;
  has_sandbox: boolean;
  has_files: boolean;
  parse_status: AgchainDatasetParseStatus;
};

export type AgchainDatasetSampleDetail = {
  sample_id: string;
  canonical_sample_json: JsonObject;
  metadata_json: JsonObject;
  setup: JsonObject | null;
  sandbox: JsonObject | null;
  files: JsonObject[];
};

export type AgchainDatasetPreviewRequest = {
  project_id: string;
  source_type: AgchainDatasetSourceType;
  source_upload_id?: string | null;
  source_uri?: string | null;
  source_config_jsonb: AgchainDatasetSourceConfig;
  field_spec_jsonb: AgchainFieldSpec;
  materialization_options_jsonb: AgchainMaterializationOptions;
};

export type AgchainDatasetCreateRequest = AgchainDatasetPreviewRequest & {
  slug: string;
  name: string;
  description: string;
  tags: string[];
  initial_version_label: string;
};

export type AgchainDatasetUpdateRequest = Partial<
  Pick<AgchainDatasetDetail, 'name' | 'description' | 'tags' | 'status'>
>;

export type AgchainDatasetDraftCreateRequest = {
  project_id: string;
  base_version_id?: string | null;
};

export type AgchainDatasetDraftWriteRequest = {
  version_label?: string | null;
  source_config_jsonb: AgchainDatasetSourceConfig;
  field_spec_jsonb: AgchainFieldSpec;
  materialization_options_jsonb: AgchainMaterializationOptions;
};

export type AgchainDatasetListResponse = {
  items: AgchainDatasetListRow[];
  next_cursor: string | null;
};

export type AgchainDatasetBootstrapResponse = {
  allowed_source_types: AgchainDatasetSourceType[];
  field_spec_defaults: AgchainFieldSpec;
  source_config_defaults: Partial<Record<AgchainDatasetSourceType, Partial<AgchainDatasetSourceConfig>>>;
  materialization_defaults: AgchainMaterializationOptions;
  upload_limits: JsonObject;
  validation_rules: JsonObject;
};

export type AgchainDatasetDetailResponse = {
  dataset: AgchainDatasetDetail;
  selected_version: AgchainDatasetVersionSummary | null;
  tab_counts: Record<string, number>;
  warnings_summary: AgchainDatasetWarningsSummary;
  available_actions: string[];
};

export type AgchainDatasetUpdateResponse = {
  ok: boolean;
  dataset: AgchainDatasetDetail;
};

export type AgchainDatasetVersionsResponse = {
  items: AgchainDatasetVersionSummary[];
  next_cursor: string | null;
};

export type AgchainDatasetSourceResponse = {
  dataset_version_id: string;
  source_type: AgchainDatasetSourceType;
  source_uri: string | null;
  source_config_jsonb: AgchainDatasetSourceConfig;
};

export type AgchainDatasetMappingResponse = {
  dataset_version_id: string;
  field_spec_jsonb: AgchainFieldSpec;
  field_resolution_summary: JsonObject;
};

export type AgchainDatasetVersionValidationResponse = {
  dataset_version_id: string;
  validation_status: AgchainDatasetValidationStatus;
  issue_groups: AgchainDatasetValidationIssueGroup[];
  warning_counts: AgchainDatasetWarningsSummary;
  generated_at: string | null;
};

export type AgchainDatasetSamplesResponse = {
  items: AgchainDatasetSampleSummary[];
  next_cursor: string | null;
};

export type AgchainDatasetSampleResponse = AgchainDatasetSampleDetail;

export type AgchainDatasetPreviewSuccessResponse = {
  ok: boolean;
  preview_id: string;
  sample_count: number;
  preview_samples: AgchainDatasetSampleSummary[];
  validation_summary: AgchainDatasetValidationSummary;
  field_resolution_summary: JsonObject;
};

export type AgchainDatasetCreateSuccessResponse = {
  ok: boolean;
  dataset: AgchainDatasetDetail;
  version: AgchainDatasetVersionSummary;
};

export type AgchainDatasetVersionPreviewSuccessResponse = {
  ok: boolean;
  dataset_version_id: string;
  preview_samples: AgchainDatasetSampleSummary[];
  validation_summary: AgchainDatasetValidationSummary;
};

export type AgchainDatasetDraftCreateResponse = {
  ok: boolean;
  draft: AgchainDatasetDraft;
};

export type AgchainDatasetDraftResponse = AgchainDatasetDraft;

export type AgchainDatasetDraftPreviewSuccessResponse = {
  ok: boolean;
  preview_samples: AgchainDatasetSampleSummary[];
  validation_summary: AgchainDatasetValidationSummary;
  diff_summary: JsonObject;
};

export type AgchainDatasetDraftCommitSuccessResponse = {
  ok: boolean;
  dataset: AgchainDatasetDetail;
  version: AgchainDatasetVersionSummary;
};

export type AgchainDatasetPreviewResponse = AgchainDatasetPreviewSuccessResponse | AgchainOperationStatus;
export type AgchainDatasetCreateResponse = AgchainDatasetCreateSuccessResponse | AgchainOperationStatus;
export type AgchainDatasetVersionPreviewResponse =
  | AgchainDatasetVersionPreviewSuccessResponse
  | AgchainOperationStatus;
export type AgchainDatasetDraftPreviewResponse =
  | AgchainDatasetDraftPreviewSuccessResponse
  | AgchainOperationStatus;
export type AgchainDatasetDraftCommitResponse =
  | AgchainDatasetDraftCommitSuccessResponse
  | AgchainOperationStatus;

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      (errorBody as { detail?: string; error?: string }).detail ??
      (errorBody as { detail?: string; error?: string }).error ??
      `HTTP ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

function trimToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

// ---------------------------------------------------------------------------
// Service functions — 17 dataset routes + 1 shared operations route
// ---------------------------------------------------------------------------

// 1. GET /agchain/datasets
export async function listDatasets(
  projectId: string,
  params?: { cursor?: string | null; search?: string | null; source_type?: string | null; validation_status?: string | null },
): Promise<AgchainDatasetListResponse> {
  const qs = new URLSearchParams({ project_id: projectId });
  if (params?.cursor) qs.set('cursor', params.cursor);
  if (params?.search) qs.set('search', params.search);
  if (params?.source_type) qs.set('source_type', params.source_type);
  if (params?.validation_status) qs.set('validation_status', params.validation_status);
  const response = await platformApiFetch(`/agchain/datasets?${qs.toString()}`);
  return parseJsonResponse<AgchainDatasetListResponse>(response);
}

// 2. GET /agchain/datasets/new/bootstrap
export async function getDatasetBootstrap(
  projectId?: string | null,
): Promise<AgchainDatasetBootstrapResponse> {
  const qs = new URLSearchParams();
  if (projectId) qs.set('project_id', projectId);
  const query = qs.toString();
  const response = await platformApiFetch(`/agchain/datasets/new/bootstrap${query ? `?${query}` : ''}`);
  return parseJsonResponse<AgchainDatasetBootstrapResponse>(response);
}

// 3. POST /agchain/datasets/new/preview
export async function previewNewDataset(
  body: AgchainDatasetPreviewRequest,
): Promise<AgchainDatasetPreviewResponse> {
  const response = await platformApiFetch('/agchain/datasets/new/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseJsonResponse<AgchainDatasetPreviewResponse>(response);
}

// 4. POST /agchain/datasets
export async function createDataset(
  body: AgchainDatasetCreateRequest,
): Promise<AgchainDatasetCreateResponse> {
  const response = await platformApiFetch('/agchain/datasets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseJsonResponse<AgchainDatasetCreateResponse>(response);
}

// 5. GET /agchain/datasets/{dataset_id}/detail
export async function getDatasetDetail(
  datasetId: string,
  projectId: string,
  versionId?: string | null,
): Promise<AgchainDatasetDetailResponse> {
  const qs = new URLSearchParams({ project_id: projectId });
  if (versionId) qs.set('version_id', versionId);
  const response = await platformApiFetch(
    `/agchain/datasets/${encodeURIComponent(datasetId)}/detail?${qs.toString()}`,
  );
  return parseJsonResponse<AgchainDatasetDetailResponse>(response);
}

// 6. GET /agchain/datasets/{dataset_id}/versions
export async function listDatasetVersions(
  datasetId: string,
  projectId: string,
  params?: { cursor?: string | null },
): Promise<AgchainDatasetVersionsResponse> {
  const qs = new URLSearchParams({ project_id: projectId });
  if (params?.cursor) qs.set('cursor', params.cursor);
  const response = await platformApiFetch(
    `/agchain/datasets/${encodeURIComponent(datasetId)}/versions?${qs.toString()}`,
  );
  return parseJsonResponse<AgchainDatasetVersionsResponse>(response);
}

// 7. GET /agchain/datasets/{dataset_id}/versions/{id}/source
export async function getDatasetVersionSource(
  datasetId: string,
  versionId: string,
): Promise<AgchainDatasetSourceResponse> {
  const response = await platformApiFetch(
    `/agchain/datasets/${encodeURIComponent(datasetId)}/versions/${encodeURIComponent(versionId)}/source`,
  );
  return parseJsonResponse<AgchainDatasetSourceResponse>(response);
}

// 8. GET /agchain/datasets/{dataset_id}/versions/{id}/mapping
export async function getDatasetVersionMapping(
  datasetId: string,
  versionId: string,
): Promise<AgchainDatasetMappingResponse> {
  const response = await platformApiFetch(
    `/agchain/datasets/${encodeURIComponent(datasetId)}/versions/${encodeURIComponent(versionId)}/mapping`,
  );
  return parseJsonResponse<AgchainDatasetMappingResponse>(response);
}

// 9. GET /agchain/datasets/{dataset_id}/versions/{id}/validation
export async function getDatasetVersionValidation(
  datasetId: string,
  versionId: string,
): Promise<AgchainDatasetVersionValidationResponse> {
  const response = await platformApiFetch(
    `/agchain/datasets/${encodeURIComponent(datasetId)}/versions/${encodeURIComponent(versionId)}/validation`,
  );
  return parseJsonResponse<AgchainDatasetVersionValidationResponse>(response);
}

// 10. POST /agchain/datasets/{dataset_id}/versions/{id}/preview
export async function previewDatasetVersion(
  datasetId: string,
  versionId: string,
  body: { refresh?: boolean },
): Promise<AgchainDatasetVersionPreviewResponse> {
  const response = await platformApiFetch(
    `/agchain/datasets/${encodeURIComponent(datasetId)}/versions/${encodeURIComponent(versionId)}/preview`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  return parseJsonResponse<AgchainDatasetVersionPreviewResponse>(response);
}

// 11. GET /agchain/datasets/{dataset_id}/versions/{id}/samples
export async function listDatasetSamples(
  datasetId: string,
  versionId: string,
  projectId: string,
  params?: { cursor?: string | null; search?: string | null; parse_status?: string | null },
): Promise<AgchainDatasetSamplesResponse> {
  const qs = new URLSearchParams({ project_id: projectId });
  if (params?.cursor) qs.set('cursor', params.cursor);
  if (params?.search) qs.set('search', params.search);
  if (params?.parse_status) qs.set('parse_status', params.parse_status);
  const response = await platformApiFetch(
    `/agchain/datasets/${encodeURIComponent(datasetId)}/versions/${encodeURIComponent(versionId)}/samples?${qs.toString()}`,
  );
  return parseJsonResponse<AgchainDatasetSamplesResponse>(response);
}

// 12. GET /agchain/datasets/{dataset_id}/versions/{id}/samples/{sample_id}
export async function getDatasetSampleDetail(
  datasetId: string,
  versionId: string,
  sampleId: string,
): Promise<AgchainDatasetSampleResponse> {
  const response = await platformApiFetch(
    `/agchain/datasets/${encodeURIComponent(datasetId)}/versions/${encodeURIComponent(versionId)}/samples/${encodeURIComponent(sampleId)}`,
  );
  return parseJsonResponse<AgchainDatasetSampleResponse>(response);
}

// 13. POST /agchain/datasets/{dataset_id}/version-drafts
export async function createDatasetVersionDraft(
  datasetId: string,
  body: AgchainDatasetDraftCreateRequest,
): Promise<AgchainDatasetDraftCreateResponse> {
  const response = await platformApiFetch(
    `/agchain/datasets/${encodeURIComponent(datasetId)}/version-drafts`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  return parseJsonResponse<AgchainDatasetDraftCreateResponse>(response);
}

// 14. GET /agchain/datasets/{dataset_id}/version-drafts/{draft_id}
export async function getDatasetVersionDraft(
  datasetId: string,
  draftId: string,
): Promise<AgchainDatasetDraftResponse> {
  const response = await platformApiFetch(
    `/agchain/datasets/${encodeURIComponent(datasetId)}/version-drafts/${encodeURIComponent(draftId)}`,
  );
  return parseJsonResponse<AgchainDatasetDraftResponse>(response);
}

// 15. PATCH /agchain/datasets/{dataset_id}/version-drafts/{draft_id}
export async function updateDatasetVersionDraft(
  datasetId: string,
  draftId: string,
  body: Partial<AgchainDatasetDraftWriteRequest>,
): Promise<AgchainDatasetDraftResponse> {
  const response = await platformApiFetch(
    `/agchain/datasets/${encodeURIComponent(datasetId)}/version-drafts/${encodeURIComponent(draftId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  return parseJsonResponse<AgchainDatasetDraftResponse>(response);
}

// 16. POST /agchain/datasets/{dataset_id}/version-drafts/{draft_id}/preview
export async function previewDatasetVersionDraft(
  datasetId: string,
  draftId: string,
  body: Partial<AgchainDatasetDraftWriteRequest>,
): Promise<AgchainDatasetDraftPreviewResponse> {
  const response = await platformApiFetch(
    `/agchain/datasets/${encodeURIComponent(datasetId)}/version-drafts/${encodeURIComponent(draftId)}/preview`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  return parseJsonResponse<AgchainDatasetDraftPreviewResponse>(response);
}

// 17. POST /agchain/datasets/{dataset_id}/version-drafts/{draft_id}/commit
export async function commitDatasetVersionDraft(
  datasetId: string,
  draftId: string,
  body: { commit_message?: string | null },
): Promise<AgchainDatasetDraftCommitResponse> {
  const response = await platformApiFetch(
    `/agchain/datasets/${encodeURIComponent(datasetId)}/version-drafts/${encodeURIComponent(draftId)}/commit`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  return parseJsonResponse<AgchainDatasetDraftCommitResponse>(response);
}

// 18. GET /agchain/operations/{operation_id} (shared, not dataset-specific)
export async function getOperationStatus(
  operationId: string,
): Promise<AgchainOperationStatus> {
  const response = await platformApiFetch(
    `/agchain/operations/${encodeURIComponent(operationId)}`,
  );
  return parseJsonResponse<AgchainOperationStatus>(response);
}
