type JsonObject = Record<string, unknown>;

export type AgchainScoreSummary = {
  metric_name: string;
  label: string;
  value: number | string | null;
  grade?: string | null;
};

export type AgchainRawLogMetadata = {
  bucket: string;
  path: string;
  content_type: string | null;
};

export type AgchainResultRow = {
  run_id: string;
  benchmark_name: string;
  benchmark_version_label: string;
  evaluated_model_label: string;
  judge_model_label: string | null;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  aggregate_scores: AgchainScoreSummary[];
  sample_count: number;
  submitted_at: string;
  completed_at: string | null;
};

export type AgchainResultsResponse = {
  items: AgchainResultRow[];
  next_cursor: string | null;
};

export type AgchainRunLogHeader = {
  run_id: string;
  benchmark_id: string;
  benchmark_version_id: string;
  dataset_version_id: string | null;
  status: string;
  score_summary: AgchainScoreSummary[];
  usage_summary: JsonObject;
  error_summary: JsonObject;
  sample_count: number;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

export type AgchainResultLogResponse = {
  log_header: AgchainRunLogHeader;
  viewer_tabs: string[];
  artifact_links: AgchainRawLogMetadata[];
};

export type AgchainRunLogSampleSummary = {
  sample_run_id: string;
  sample_id: string;
  status: string;
  score_summary: AgchainScoreSummary[];
  error_summary: JsonObject;
  token_usage: JsonObject;
  has_attachments: boolean;
};

export type AgchainResultLogSamplesResponse = {
  items: AgchainRunLogSampleSummary[];
  next_cursor: string | null;
};

export type AgchainRunLogSampleDetail = {
  sample: AgchainRunLogSampleSummary & {
    preview: JsonObject;
  };
  events: JsonObject[];
  attachments: JsonObject[];
  scores: AgchainScoreSummary[];
  usage: JsonObject;
  raw_links: AgchainRawLogMetadata[];
};

export type AgchainResultLogSampleResponse = AgchainRunLogSampleDetail;
