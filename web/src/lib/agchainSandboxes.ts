type JsonObject = Record<string, unknown>;

export type AgchainSandboxHealthCheck = {
  health_status: 'healthy' | 'degraded' | 'failed' | 'unknown';
  health_checked_at: string | null;
  diagnostic_summary: JsonObject;
};

export type AgchainSandboxProfileRow = {
  sandbox_profile_id: string;
  provider: string;
  profile_name: string;
  health_status: 'healthy' | 'degraded' | 'failed' | 'unknown';
  health_checked_at: string | null;
  updated_at: string;
};

export type AgchainSandboxProfileDetail = {
  sandbox_profile_id: string;
  provider: string;
  profile_name: string;
  config_jsonb: JsonObject;
  limits_jsonb: JsonObject;
  connection_capabilities_jsonb: JsonObject;
  notes: string;
  health_status: 'healthy' | 'degraded' | 'failed' | 'unknown';
  health_checked_at: string | null;
};

export type AgchainSandboxWriteRequest = {
  project_id: string;
  provider: string;
  profile_name: string;
  config_jsonb: JsonObject;
  limits_jsonb: JsonObject;
  connection_capabilities_jsonb: JsonObject;
  notes: string;
};

export type AgchainSandboxesResponse = {
  items: AgchainSandboxProfileRow[];
  next_cursor: string | null;
};

export type AgchainSandboxProfileResponse = {
  sandbox_profile: AgchainSandboxProfileDetail;
  recent_health_checks: AgchainSandboxHealthCheck[];
};

export type AgchainSandboxWriteResponse = {
  ok: boolean;
  sandbox_profile: AgchainSandboxProfileDetail;
};

export type AgchainSandboxHealthCheckResponse = {
  ok: boolean;
  sandbox_profile: AgchainSandboxProfileDetail;
  recent_health_checks: AgchainSandboxHealthCheck[];
};
