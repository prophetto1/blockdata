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
