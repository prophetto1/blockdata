type JsonObject = Record<string, unknown>;

export type AgchainOperationStatus = {
  operation_id: string;
  operation_type: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  poll_url: string | null;
  cancel_url: string | null;
  target_kind: string | null;
  target_id: string | null;
  attempt_count: number;
  progress: JsonObject;
  last_error: JsonObject | null;
  result: JsonObject | null;
  created_at: string | null;
  started_at: string | null;
  heartbeat_at: string | null;
  completed_at: string | null;
};

export type AgchainRunRow = {
  run_id: string;
  benchmark_id: string;
  benchmark_version_id: string;
  evaluated_model_target_id: string;
  judge_model_target_id: string | null;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  submitted_at: string;
  started_at: string | null;
  completed_at: string | null;
  sample_count: number;
  score_summary: JsonObject;
  retry_of_run_id: string | null;
};

export type AgchainRunDetail = {
  run: AgchainRunRow;
  latest_operation: AgchainOperationStatus | null;
  resolved_contract: JsonObject;
  recent_failures: JsonObject[];
};

export type AgchainRunLaunchRequest = {
  project_id: string;
  benchmark_version_id: string;
  dataset_version_id: string;
  evaluated_model_target_id: string;
  judge_model_target_id: string | null;
  tool_policy_jsonb: JsonObject;
  sandbox_profile_id: string | null;
  resolved_generate_config_jsonb: JsonObject;
  resolved_eval_config_jsonb: JsonObject;
  run_tags_jsonb: JsonObject;
  idempotency_key?: string | null;
};

export type AgchainRunsResponse = {
  items: AgchainRunRow[];
  next_cursor: string | null;
};

export type AgchainRunLaunchSuccessResponse = {
  ok: boolean;
  run: AgchainRunRow;
  operation: AgchainOperationStatus | null;
  launch_status: string;
};

export type AgchainRunCancelResponse = {
  ok: boolean;
  run: AgchainRunRow;
  operation: AgchainOperationStatus | null;
};

export type AgchainRunRetryResponse = {
  ok: boolean;
  run: AgchainRunRow;
  operation: AgchainOperationStatus;
};

export type AgchainRunSamplesResponse = {
  items: JsonObject[];
  next_cursor: string | null;
};

export type AgchainRunLaunchResponse = AgchainRunLaunchSuccessResponse | AgchainOperationStatus;
export type AgchainRunMutationResponse = AgchainRunCancelResponse;
