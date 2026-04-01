type JsonObject = Record<string, unknown>;

export type AgchainMetricDefinition = {
  metric_name: string;
  display_name: string;
  description: string;
  value_type: string;
  thresholds?: JsonObject;
};

export type AgchainScorerRow = {
  scorer_id: string;
  scorer_name: string;
  display_name: string;
  latest_version_id: string | null;
  metric_names: string[];
  is_builtin: boolean;
  updated_at: string;
};

export type AgchainScorerVersionSummary = {
  scorer_version_id: string;
  version_label: string;
  metric_names: string[];
  status: 'draft' | 'published' | 'archived';
  updated_at: string;
};

export type AgchainScorerDetail = {
  scorer_id: string;
  scorer_name: string;
  display_name: string;
  description: string;
  is_builtin: boolean;
};

export type AgchainScorerWriteRequest = {
  project_id: string;
  scorer_name: string;
  display_name: string;
  description: string;
  is_builtin: boolean;
};

export type AgchainScorerVersionWriteRequest = {
  version_label: string;
  metric_definitions_jsonb: AgchainMetricDefinition[];
  scorer_config_jsonb: JsonObject;
  output_schema_jsonb: JsonObject;
  notes: string;
};

export type AgchainScorersResponse = {
  items: AgchainScorerRow[];
  next_cursor: string | null;
};

export type AgchainScorerResponse = {
  scorer: AgchainScorerDetail;
  latest_version: AgchainScorerVersionSummary | null;
  versions: AgchainScorerVersionSummary[];
};

export type AgchainScorerVersionsResponse = {
  items: AgchainScorerVersionSummary[];
  next_cursor: string | null;
};

export type AgchainScorerWriteResponse = {
  ok: boolean;
  scorer: AgchainScorerDetail;
};

export type AgchainScorerVersionWriteResponse = {
  ok: boolean;
  scorer_version: AgchainScorerVersionSummary;
};
