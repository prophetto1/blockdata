import { platformApiFetch } from '@/lib/platformApi';

export type AgchainProviderDefinition = {
  provider_slug: string;
  display_name: string;
  supports_custom_base_url: boolean;
  supported_auth_kinds: string[];
  default_probe_strategy: string;
  default_capabilities: Record<string, unknown>;
  supports_model_args: boolean;
  notes: string | null;
};

export type AgchainModelTarget = {
  model_target_id: string;
  label: string;
  provider_slug: string;
  provider_display_name: string;
  provider_qualifier: string | null;
  model_name: string;
  qualified_model: string;
  api_base_display: string | null;
  auth_kind: string;
  credential_status: string;
  enabled: boolean;
  supports_evaluated: boolean;
  supports_judge: boolean;
  capabilities: Record<string, unknown>;
  health_status: string;
  health_checked_at: string | null;
  last_latency_ms: number | null;
  probe_strategy: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AgchainModelHealthCheck = {
  health_check_id: string;
  status: string;
  checked_at: string;
  latency_ms: number | null;
  probe_strategy: string;
  error_message: string | null;
};

export type AgchainModelDetail = {
  model_target: AgchainModelTarget;
  recent_health_checks: AgchainModelHealthCheck[];
  provider_definition: AgchainProviderDefinition | null;
};

export type AgchainModelTargetWrite = {
  label: string;
  provider_slug: string;
  provider_qualifier: string | null;
  model_name: string;
  qualified_model: string;
  api_base: string | null;
  auth_kind: string;
  credential_source_jsonb: Record<string, unknown>;
  model_args_jsonb: Record<string, unknown>;
  supports_evaluated: boolean;
  supports_judge: boolean;
  capabilities_jsonb: Record<string, unknown>;
  probe_strategy: string;
  notes: string | null;
  enabled: boolean;
};

type IdResponse = {
  ok: boolean;
  model_target_id: string;
};

type ProvidersResponse = {
  items: AgchainProviderDefinition[];
};

type ModelsResponse = {
  items: AgchainModelTarget[];
  total: number;
  limit: number;
  offset: number;
};

function trimToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
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

export function sanitizeModelTargetWrite(payload: AgchainModelTargetWrite): AgchainModelTargetWrite {
  return {
    ...payload,
    label: payload.label.trim(),
    model_name: payload.model_name.trim(),
    qualified_model: payload.qualified_model.trim(),
    provider_qualifier: trimToNull(payload.provider_qualifier),
    api_base: trimToNull(payload.api_base),
    notes: trimToNull(payload.notes),
  };
}

export async function fetchAgchainModelProviders(): Promise<AgchainProviderDefinition[]> {
  const response = await platformApiFetch('/agchain/models/providers');
  const data = await parseJsonResponse<ProvidersResponse>(response);
  return data.items ?? [];
}

export async function fetchAgchainModels(limit = 50, offset = 0): Promise<AgchainModelTarget[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const response = await platformApiFetch(`/agchain/models?${params.toString()}`);
  const data = await parseJsonResponse<ModelsResponse>(response);
  return data.items ?? [];
}

export async function fetchAgchainModelDetail(modelTargetId: string): Promise<AgchainModelDetail> {
  const response = await platformApiFetch(`/agchain/models/${modelTargetId}`);
  return parseJsonResponse<AgchainModelDetail>(response);
}

export async function createAgchainModelTarget(payload: AgchainModelTargetWrite): Promise<IdResponse> {
  const response = await platformApiFetch('/agchain/models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sanitizeModelTargetWrite(payload)),
  });

  return parseJsonResponse<IdResponse>(response);
}

export async function updateAgchainModelTarget(
  modelTargetId: string,
  payload: Partial<AgchainModelTargetWrite>,
): Promise<IdResponse> {
  const response = await platformApiFetch(`/agchain/models/${modelTargetId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse<IdResponse>(response);
}

export async function refreshAgchainModelTargetHealth(modelTargetId: string) {
  const response = await platformApiFetch(`/agchain/models/${modelTargetId}/refresh-health`, {
    method: 'POST',
  });

  return parseJsonResponse<{
    ok: boolean;
    health_status: string;
    latency_ms: number | null;
    checked_at: string;
    message: string;
    probe_strategy: string;
  }>(response);
}
