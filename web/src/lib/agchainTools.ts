type JsonObject = Record<string, unknown>;

export type AgchainToolSchema = {
  input_schema_jsonb?: JsonObject;
  output_schema_jsonb?: JsonObject;
  tool_schema_jsonb?: JsonObject;
};

export type AgchainSandboxRequirement = {
  provider?: string | null;
  profile_name?: string | null;
  limits?: JsonObject;
  connection_capabilities?: JsonObject;
};

export type AgchainToolRow = {
  tool_id: string;
  tool_name: string;
  display_name: string;
  latest_version_id: string | null;
  approval_required: boolean;
  parallel_tool_calls_supported: boolean;
  updated_at: string;
};

export type AgchainToolVersionSummary = {
  tool_version_id: string;
  version_label: string;
  approval_required: boolean;
  parallel_tool_calls_supported: boolean;
  updated_at: string;
};

export type AgchainToolDetail = {
  tool_id: string;
  tool_name: string;
  display_name: string;
  description: string;
  approval_required: boolean;
  parallel_tool_calls_supported: boolean;
  sandbox_requirements_jsonb: JsonObject;
  viewer_hints_jsonb: JsonObject;
};

export type AgchainToolWriteRequest = {
  project_id: string;
  tool_name: string;
  display_name: string;
  description: string;
  approval_required: boolean;
  parallel_tool_calls_supported: boolean;
};

export type AgchainToolVersionWriteRequest = {
  version_label: string;
  tool_schema_jsonb: JsonObject;
  approval_required: boolean;
  parallel_tool_calls_supported: boolean;
  sandbox_requirements_jsonb: JsonObject;
  viewer_hints_jsonb: JsonObject;
  notes: string;
};

export type AgchainToolsResponse = {
  items: AgchainToolRow[];
  next_cursor: string | null;
};

export type AgchainToolResponse = {
  tool: AgchainToolDetail;
  latest_version: AgchainToolVersionSummary | null;
  versions: AgchainToolVersionSummary[];
};

export type AgchainToolVersionsResponse = {
  items: AgchainToolVersionSummary[];
  next_cursor: string | null;
};

export type AgchainToolWriteResponse = {
  ok: boolean;
  tool: AgchainToolDetail;
};

export type AgchainToolVersionWriteResponse = {
  ok: boolean;
  tool_version: AgchainToolVersionSummary;
};
