import { platformApiFetch } from '@/lib/platformApi';

export type AgchainBenchmarkListRow = {
  benchmark_id: string;
  benchmark_slug: string;
  benchmark_name: string;
  description: string;
  state: 'draft' | 'ready' | 'running' | 'attention' | 'archived';
  current_spec_label: string;
  current_spec_version: string;
  version_status: 'draft' | 'published' | 'archived';
  step_count: number;
  selected_eval_model_count: number;
  tested_model_count: number;
  tested_policy_bundle_count: number;
  validation_status: 'pass' | 'warn' | 'fail' | 'unknown';
  validation_issue_count: number;
  last_run_at: string | null;
  updated_at: string;
  href: string;
};

export type AgchainBenchmarkCreateRequest = {
  benchmark_name: string;
  benchmark_slug: string | null;
  description: string;
};

export type AgchainBenchmarkSummary = {
  benchmark_id: string;
  benchmark_slug: string;
  benchmark_name: string;
  description: string;
};

export type AgchainBenchmarkVersionSummary = {
  benchmark_version_id: string;
  version_label: string;
  version_status: 'draft' | 'published' | 'archived';
  plan_family: string;
  step_count: number;
  validation_status: 'pass' | 'warn' | 'fail' | 'unknown';
  validation_issue_count: number;
};

export type AgchainBenchmarkStepRow = {
  benchmark_step_id: string;
  step_order: number;
  step_id: string;
  display_name: string;
  step_kind: 'model' | 'judge' | 'deterministic_post' | 'aggregation';
  api_call_boundary: 'own_call' | 'continue_call' | 'non_model';
  inject_payloads: string[];
  scoring_mode: 'none' | 'deterministic' | 'judge';
  output_contract: string | null;
  scorer_ref: string | null;
  judge_prompt_ref: string | null;
  judge_grades_step_ids: string[];
  enabled: boolean;
  step_config: Record<string, unknown>;
  updated_at: string;
};

export type AgchainBenchmarkStepWrite = {
  step_id: string;
  display_name: string;
  step_kind: AgchainBenchmarkStepRow['step_kind'];
  api_call_boundary: AgchainBenchmarkStepRow['api_call_boundary'];
  inject_payloads: string[];
  scoring_mode: AgchainBenchmarkStepRow['scoring_mode'];
  output_contract: string | null;
  scorer_ref: string | null;
  judge_prompt_ref: string | null;
  judge_grades_step_ids: string[];
  enabled: boolean;
  step_config: Record<string, unknown>;
};

export type AgchainBenchmarkStepUpdate = Partial<AgchainBenchmarkStepWrite>;

export type AgchainBenchmarkDetail = {
  benchmark: AgchainBenchmarkSummary;
  current_version: AgchainBenchmarkVersionSummary | null;
  permissions: {
    can_edit: boolean;
  };
  counts: {
    selected_eval_model_count: number;
    tested_model_count: number;
  };
};

export type AgchainBenchmarkStepsDetail = {
  benchmark: AgchainBenchmarkSummary;
  current_version: AgchainBenchmarkVersionSummary | null;
  can_edit: boolean;
  steps: AgchainBenchmarkStepRow[];
};

type BenchmarksResponse = {
  items: AgchainBenchmarkListRow[];
};

type BenchmarkCreateResponse = {
  ok: boolean;
  benchmark_id: string;
  benchmark_slug: string;
  benchmark_version_id: string;
  redirect_path: string;
};

type BenchmarkStepCreateResponse = {
  ok: boolean;
  benchmark_step_id: string;
  step_order: number;
};

type BenchmarkStepUpdateResponse = {
  ok: boolean;
  benchmark_step_id: string;
};

type BenchmarkStepReorderResponse = {
  ok: boolean;
  step_count: number;
};

type BenchmarkStepDeleteResponse = {
  ok: boolean;
  deleted_step_id: string;
};

function trimToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function csvToList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function listToCsv(value: string[] | null | undefined): string {
  return (value ?? []).join(', ');
}

function sanitizeNullableString(value: string | null | undefined): string | null {
  return trimToNull(value);
}

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

export function sanitizeBenchmarkCreateRequest(
  payload: AgchainBenchmarkCreateRequest,
): AgchainBenchmarkCreateRequest {
  return {
    benchmark_name: payload.benchmark_name.trim(),
    benchmark_slug: trimToNull(payload.benchmark_slug),
    description: payload.description.trim(),
  };
}

export function sanitizeBenchmarkStepWrite(
  payload: AgchainBenchmarkStepWrite | (AgchainBenchmarkStepWrite & { inject_payloads_csv?: string }),
): AgchainBenchmarkStepWrite {
  const stepConfig = payload.step_config ?? {};
  return {
    step_id: payload.step_id.trim(),
    display_name: payload.display_name.trim(),
    step_kind: payload.step_kind,
    api_call_boundary: payload.api_call_boundary,
    inject_payloads: payload.inject_payloads,
    scoring_mode: payload.scoring_mode,
    output_contract: sanitizeNullableString(payload.output_contract),
    scorer_ref: sanitizeNullableString(payload.scorer_ref),
    judge_prompt_ref: sanitizeNullableString(payload.judge_prompt_ref),
    judge_grades_step_ids: payload.judge_grades_step_ids,
    enabled: payload.enabled,
    step_config: stepConfig,
  };
}

export function buildEmptyBenchmarkStepDraft(stepIndex: number): AgchainBenchmarkStepWrite {
  return {
    step_id: `s${stepIndex}`,
    display_name: `Step ${stepIndex}`,
    step_kind: 'model',
    api_call_boundary: 'own_call',
    inject_payloads: [],
    scoring_mode: 'none',
    output_contract: null,
    scorer_ref: null,
    judge_prompt_ref: null,
    judge_grades_step_ids: [],
    enabled: true,
    step_config: {},
  };
}

export function draftFromBenchmarkStep(step: AgchainBenchmarkStepRow): AgchainBenchmarkStepWrite {
  return {
    step_id: step.step_id,
    display_name: step.display_name,
    step_kind: step.step_kind,
    api_call_boundary: step.api_call_boundary,
    inject_payloads: [...step.inject_payloads],
    scoring_mode: step.scoring_mode,
    output_contract: step.output_contract,
    scorer_ref: step.scorer_ref,
    judge_prompt_ref: step.judge_prompt_ref,
    judge_grades_step_ids: [...step.judge_grades_step_ids],
    enabled: step.enabled,
    step_config: { ...step.step_config },
  };
}

export function stepDraftToFormValues(step: AgchainBenchmarkStepWrite) {
  return {
    ...step,
    inject_payloads_csv: listToCsv(step.inject_payloads),
    judge_grades_step_ids_csv: listToCsv(step.judge_grades_step_ids),
    step_config_json: JSON.stringify(step.step_config ?? {}, null, 2),
  };
}

export function stepFormValuesToDraft(values: {
  step_id: string;
  display_name: string;
  step_kind: AgchainBenchmarkStepRow['step_kind'];
  api_call_boundary: AgchainBenchmarkStepRow['api_call_boundary'];
  inject_payloads_csv: string;
  scoring_mode: AgchainBenchmarkStepRow['scoring_mode'];
  output_contract: string;
  scorer_ref: string;
  judge_prompt_ref: string;
  judge_grades_step_ids_csv: string;
  enabled: boolean;
  step_config_json: string;
}): AgchainBenchmarkStepWrite {
  let parsedStepConfig: Record<string, unknown> = {};
  const trimmedJson = values.step_config_json.trim();
  if (trimmedJson) {
    parsedStepConfig = JSON.parse(trimmedJson) as Record<string, unknown>;
  }

  return {
    step_id: values.step_id.trim(),
    display_name: values.display_name.trim(),
    step_kind: values.step_kind,
    api_call_boundary: values.api_call_boundary,
    inject_payloads: csvToList(values.inject_payloads_csv),
    scoring_mode: values.scoring_mode,
    output_contract: sanitizeNullableString(values.output_contract),
    scorer_ref: sanitizeNullableString(values.scorer_ref),
    judge_prompt_ref: sanitizeNullableString(values.judge_prompt_ref),
    judge_grades_step_ids: csvToList(values.judge_grades_step_ids_csv),
    enabled: values.enabled,
    step_config: parsedStepConfig,
  };
}

export async function fetchAgchainBenchmarks(): Promise<AgchainBenchmarkListRow[]> {
  const response = await platformApiFetch('/agchain/benchmarks');
  const data = await parseJsonResponse<BenchmarksResponse>(response);
  return data.items ?? [];
}

export async function createAgchainBenchmark(
  payload: AgchainBenchmarkCreateRequest,
): Promise<BenchmarkCreateResponse> {
  const response = await platformApiFetch('/agchain/benchmarks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sanitizeBenchmarkCreateRequest(payload)),
  });

  return parseJsonResponse<BenchmarkCreateResponse>(response);
}

export async function fetchAgchainBenchmarkDetail(benchmarkSlug: string): Promise<AgchainBenchmarkDetail> {
  const response = await platformApiFetch(`/agchain/benchmarks/${encodeURIComponent(benchmarkSlug)}`);
  return parseJsonResponse<AgchainBenchmarkDetail>(response);
}

export async function fetchAgchainBenchmarkSteps(benchmarkSlug: string): Promise<AgchainBenchmarkStepsDetail> {
  const response = await platformApiFetch(`/agchain/benchmarks/${encodeURIComponent(benchmarkSlug)}/steps`);
  return parseJsonResponse<AgchainBenchmarkStepsDetail>(response);
}

export async function createAgchainBenchmarkStep(
  benchmarkSlug: string,
  payload: AgchainBenchmarkStepWrite,
): Promise<BenchmarkStepCreateResponse> {
  const response = await platformApiFetch(`/agchain/benchmarks/${encodeURIComponent(benchmarkSlug)}/steps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sanitizeBenchmarkStepWrite(payload)),
  });
  return parseJsonResponse<BenchmarkStepCreateResponse>(response);
}

export async function updateAgchainBenchmarkStep(
  benchmarkSlug: string,
  benchmarkStepId: string,
  payload: AgchainBenchmarkStepUpdate,
): Promise<BenchmarkStepUpdateResponse> {
  const response = await platformApiFetch(
    `/agchain/benchmarks/${encodeURIComponent(benchmarkSlug)}/steps/${encodeURIComponent(benchmarkStepId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return parseJsonResponse<BenchmarkStepUpdateResponse>(response);
}

export async function reorderAgchainBenchmarkSteps(
  benchmarkSlug: string,
  orderedStepIds: string[],
): Promise<BenchmarkStepReorderResponse> {
  const response = await platformApiFetch(
    `/agchain/benchmarks/${encodeURIComponent(benchmarkSlug)}/steps/reorder`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordered_step_ids: orderedStepIds }),
    },
  );
  return parseJsonResponse<BenchmarkStepReorderResponse>(response);
}

export async function deleteAgchainBenchmarkStep(
  benchmarkSlug: string,
  benchmarkStepId: string,
): Promise<BenchmarkStepDeleteResponse> {
  const response = await platformApiFetch(
    `/agchain/benchmarks/${encodeURIComponent(benchmarkSlug)}/steps/${encodeURIComponent(benchmarkStepId)}`,
    {
      method: 'DELETE',
    },
  );
  return parseJsonResponse<BenchmarkStepDeleteResponse>(response);
}
