import { platformApiFetch } from '@/lib/platformApi';

export type AgchainCredentialStatus = 'not_set' | 'set' | 'inherited';
export type AgchainCredentialScope = 'organization' | 'project';
export type AgchainProviderCategory = 'model_provider' | 'cloud_provider';
export type AgchainCredentialFormKind = 'basic_api_key' | 'vertex_ai';

export type BasicApiKeyCredentialPayload = {
  api_key: string;
};

export type VertexAiCredentialPayload = {
  provider_mode: 'standard' | 'express';
  auth_mode: 'access_token' | 'credential_json' | 'api_key';
  access_token?: string;
  credential_json?: string;
  api_key?: string;
  project?: string;
  location?: string;
  supports_streaming: boolean;
  include_default_registry: boolean;
  headers: Array<{ key: string; value: string }>;
  models: Array<{ value: string }>;
};

export type ScopedCredentialPayload = BasicApiKeyCredentialPayload | VertexAiCredentialPayload;

export type SanitizedCredentialConfig =
  | Record<string, never>
  | Omit<VertexAiCredentialPayload, 'access_token' | 'credential_json' | 'api_key'> & {
      auth_mode: VertexAiCredentialPayload['auth_mode'];
    };

export type AgchainScopedModelProvider = {
  provider_slug: string;
  display_name: string;
  provider_category: AgchainProviderCategory;
  credential_form_kind: AgchainCredentialFormKind;
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
  credential_status: AgchainCredentialStatus;
  effective_source: 'organization' | 'project' | 'none';
  last_updated_at: string | null;
  has_local_override: boolean;
  credential_config: SanitizedCredentialConfig | null;
};

type ScopedProvidersResponse = {
  items?: AgchainScopedModelProvider[];
};

type MutationResponse = {
  ok: boolean;
  provider_slug: string;
  credential_status: AgchainCredentialStatus;
};

type TestCredentialResponse = {
  ok: boolean;
  provider_slug: string;
  result: 'success' | 'error';
  message: string;
};

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

function toPayloadBody(credentialPayload: ScopedCredentialPayload) {
  return JSON.stringify({ credential_payload: credentialPayload });
}

export async function fetchOrganizationModelProviders(
  organizationId: string,
): Promise<AgchainScopedModelProvider[]> {
  const response = await platformApiFetch(`/agchain/organizations/${organizationId}/model-providers`);
  const data = await parseJsonResponse<ScopedProvidersResponse>(response);
  return data.items ?? [];
}

export async function saveOrganizationModelProviderCredential(
  organizationId: string,
  providerSlug: string,
  credentialPayload: ScopedCredentialPayload,
): Promise<MutationResponse> {
  const response = await platformApiFetch(
    `/agchain/organizations/${organizationId}/model-providers/${providerSlug}/credential`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: toPayloadBody(credentialPayload),
    },
  );
  return parseJsonResponse<MutationResponse>(response);
}

export async function testOrganizationModelProviderCredential(
  organizationId: string,
  providerSlug: string,
  credentialPayload: ScopedCredentialPayload,
): Promise<TestCredentialResponse> {
  const response = await platformApiFetch(
    `/agchain/organizations/${organizationId}/model-providers/${providerSlug}/credential/test`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: toPayloadBody(credentialPayload),
    },
  );
  return parseJsonResponse<TestCredentialResponse>(response);
}

export async function deleteOrganizationModelProviderCredential(
  organizationId: string,
  providerSlug: string,
): Promise<MutationResponse> {
  const response = await platformApiFetch(
    `/agchain/organizations/${organizationId}/model-providers/${providerSlug}/credential`,
    {
      method: 'DELETE',
    },
  );
  return parseJsonResponse<MutationResponse>(response);
}

export async function fetchProjectModelProviders(projectId: string): Promise<AgchainScopedModelProvider[]> {
  const response = await platformApiFetch(`/agchain/projects/${projectId}/model-providers`);
  const data = await parseJsonResponse<ScopedProvidersResponse>(response);
  return data.items ?? [];
}

export async function saveProjectModelProviderCredential(
  projectId: string,
  providerSlug: string,
  credentialPayload: ScopedCredentialPayload,
): Promise<MutationResponse> {
  const response = await platformApiFetch(`/agchain/projects/${projectId}/model-providers/${providerSlug}/credential`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: toPayloadBody(credentialPayload),
  });
  return parseJsonResponse<MutationResponse>(response);
}

export async function testProjectModelProviderCredential(
  projectId: string,
  providerSlug: string,
  credentialPayload: ScopedCredentialPayload,
): Promise<TestCredentialResponse> {
  const response = await platformApiFetch(`/agchain/projects/${projectId}/model-providers/${providerSlug}/credential/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: toPayloadBody(credentialPayload),
  });
  return parseJsonResponse<TestCredentialResponse>(response);
}

export async function deleteProjectModelProviderCredential(
  projectId: string,
  providerSlug: string,
): Promise<MutationResponse> {
  const response = await platformApiFetch(`/agchain/projects/${projectId}/model-providers/${providerSlug}/credential`, {
    method: 'DELETE',
  });
  return parseJsonResponse<MutationResponse>(response);
}
