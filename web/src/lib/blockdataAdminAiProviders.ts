import { platformApiFetch } from '@/lib/platformApi';

export type BlockdataProviderCategory = 'model_provider' | 'cloud_provider';
export type BlockdataCredentialFormKind = 'basic_api_key' | 'vertex_ai';

export type BlockdataAdminProviderDefinition = {
  provider_slug: string;
  display_name: string;
  provider_category: BlockdataProviderCategory;
  credential_form_kind: BlockdataCredentialFormKind;
  env_var_name: string | null;
  docs_url: string | null;
  supported_auth_kinds: string[];
  default_probe_strategy: string;
  default_capabilities: Record<string, unknown>;
  supports_custom_base_url: boolean;
  supports_model_args: boolean;
  enabled: boolean;
  sort_order: number;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

export type BlockdataAdminProviderDefinitionWrite = {
  provider_slug: string;
  display_name: string;
  provider_category: BlockdataProviderCategory;
  credential_form_kind: BlockdataCredentialFormKind;
  env_var_name: string | null;
  docs_url: string | null;
  supported_auth_kinds: string[];
  default_probe_strategy: string;
  default_capabilities: Record<string, unknown>;
  supports_custom_base_url: boolean;
  supports_model_args: boolean;
  enabled: boolean;
  sort_order: number;
  notes: string | null;
};

export type BlockdataAdminProviderModel = {
  provider_model_id: string;
  label: string;
  provider_slug: string;
  provider_display_name: string;
  model_id: string;
  qualified_model: string;
  api_base_display: string | null;
  auth_kind: string;
  config_jsonb: Record<string, unknown>;
  capabilities_jsonb: Record<string, unknown>;
  enabled: boolean;
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BlockdataAdminProviderModelWrite = {
  label: string;
  provider_slug: string;
  model_id: string;
  qualified_model: string;
  api_base: string | null;
  auth_kind: string;
  config_jsonb: Record<string, unknown>;
  capabilities_jsonb: Record<string, unknown>;
  enabled: boolean;
  sort_order: number;
  notes: string | null;
};

type ProviderMutationResponse = {
  ok: boolean;
  provider_slug: string;
};

type ProviderModelMutationResponse = {
  ok: boolean;
  provider_model_id: string;
};

type ProvidersResponse = {
  items: BlockdataAdminProviderDefinition[];
};

type ProviderModelsResponse = {
  items: BlockdataAdminProviderModel[];
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

export function sanitizeBlockdataAdminProviderDefinitionWrite(
  payload: BlockdataAdminProviderDefinitionWrite,
): BlockdataAdminProviderDefinitionWrite {
  return {
    ...payload,
    provider_slug: payload.provider_slug.trim(),
    display_name: payload.display_name.trim(),
    env_var_name: trimToNull(payload.env_var_name),
    docs_url: trimToNull(payload.docs_url),
    supported_auth_kinds: payload.supported_auth_kinds
      .map((item) => item.trim())
      .filter((item, index, items) => item.length > 0 && items.indexOf(item) === index),
    notes: trimToNull(payload.notes),
  };
}

export function sanitizeBlockdataAdminProviderModelWrite(
  payload: BlockdataAdminProviderModelWrite,
): BlockdataAdminProviderModelWrite {
  return {
    ...payload,
    label: payload.label.trim(),
    provider_slug: payload.provider_slug.trim(),
    model_id: payload.model_id.trim(),
    qualified_model: payload.qualified_model.trim(),
    api_base: trimToNull(payload.api_base),
    notes: trimToNull(payload.notes),
  };
}

export async function fetchBlockdataAdminProviderDefinitions(): Promise<BlockdataAdminProviderDefinition[]> {
  const response = await platformApiFetch('/admin/ai-providers');
  const data = await parseJsonResponse<ProvidersResponse>(response);
  return data.items ?? [];
}

export async function createBlockdataAdminProviderDefinition(
  payload: BlockdataAdminProviderDefinitionWrite,
): Promise<ProviderMutationResponse> {
  const response = await platformApiFetch('/admin/ai-providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sanitizeBlockdataAdminProviderDefinitionWrite(payload)),
  });
  return parseJsonResponse<ProviderMutationResponse>(response);
}

export async function updateBlockdataAdminProviderDefinition(
  providerSlug: string,
  payload: Partial<BlockdataAdminProviderDefinitionWrite>,
): Promise<ProviderMutationResponse> {
  const normalizedPayload = {
    ...payload,
    provider_slug: payload.provider_slug?.trim(),
    display_name: payload.display_name?.trim(),
    env_var_name: trimToNull(payload.env_var_name),
    docs_url: trimToNull(payload.docs_url),
    notes: trimToNull(payload.notes),
    supported_auth_kinds: payload.supported_auth_kinds
      ?.map((item) => item.trim())
      .filter((item, index, items) => item.length > 0 && items.indexOf(item) === index),
  };
  const response = await platformApiFetch(`/admin/ai-providers/${providerSlug}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normalizedPayload),
  });
  return parseJsonResponse<ProviderMutationResponse>(response);
}

export async function fetchBlockdataAdminProviderModels(
  limit = 200,
  offset = 0,
  providerSlug?: string,
): Promise<BlockdataAdminProviderModel[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (providerSlug?.trim()) {
    params.set('provider_slug', providerSlug.trim());
  }
  const response = await platformApiFetch(`/admin/ai-providers/models?${params.toString()}`);
  const data = await parseJsonResponse<ProviderModelsResponse>(response);
  return data.items ?? [];
}

export async function createBlockdataAdminProviderModel(
  payload: BlockdataAdminProviderModelWrite,
): Promise<ProviderModelMutationResponse> {
  const response = await platformApiFetch('/admin/ai-providers/models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sanitizeBlockdataAdminProviderModelWrite(payload)),
  });
  return parseJsonResponse<ProviderModelMutationResponse>(response);
}

export async function updateBlockdataAdminProviderModel(
  providerModelId: string,
  payload: Partial<BlockdataAdminProviderModelWrite>,
): Promise<ProviderModelMutationResponse> {
  const normalizedPayload = {
    ...payload,
    label: payload.label?.trim(),
    provider_slug: payload.provider_slug?.trim(),
    model_id: payload.model_id?.trim(),
    qualified_model: payload.qualified_model?.trim(),
    api_base: trimToNull(payload.api_base),
    notes: trimToNull(payload.notes),
  };
  const response = await platformApiFetch(`/admin/ai-providers/models/${providerModelId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normalizedPayload),
  });
  return parseJsonResponse<ProviderModelMutationResponse>(response);
}
