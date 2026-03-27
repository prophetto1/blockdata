import { platformApiFetch } from '@/lib/platformApi';

export type SecretValueKind =
  | 'secret'
  | 'token'
  | 'api_key'
  | 'client_secret'
  | 'webhook_secret';

export type SecretMetadata = {
  id: string;
  name: string;
  description?: string | null;
  value_kind: SecretValueKind;
  value_suffix?: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateSecretInput = {
  name: string;
  value: string;
  description?: string;
  value_kind: SecretValueKind;
};

export type UpdateSecretInput = {
  name?: string;
  value?: string;
  description?: string;
  value_kind?: SecretValueKind;
};

export type DeleteSecretResponse = {
  ok: true;
  id: string;
};

type SecretsListResponse = {
  secrets?: SecretMetadata[];
};

type SecretResponse = {
  secret: SecretMetadata;
};

async function readErrorMessage(resp: Response): Promise<string> {
  const payload = await resp.json().catch(() => null) as
    | { detail?: unknown; error?: unknown; message?: unknown }
    | null;

  if (payload && typeof payload.detail === 'string') return payload.detail;
  if (payload && typeof payload.error === 'string') return payload.error;
  if (payload && typeof payload.message === 'string') return payload.message;
  return `HTTP ${resp.status}`;
}

async function requireOk(resp: Response): Promise<Response> {
  if (!resp.ok) {
    throw new Error(await readErrorMessage(resp));
  }
  return resp;
}

export async function listSecrets(): Promise<SecretMetadata[]> {
  const resp = await requireOk(await platformApiFetch('/secrets'));
  const data = await resp.json() as SecretsListResponse;
  return data.secrets ?? [];
}

export async function createSecret(input: CreateSecretInput): Promise<SecretMetadata> {
  const resp = await requireOk(
    await platformApiFetch('/secrets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),
  );
  const data = await resp.json() as SecretResponse;
  return data.secret;
}

export async function updateSecret(secretId: string, input: UpdateSecretInput): Promise<SecretMetadata> {
  const resp = await requireOk(
    await platformApiFetch(`/secrets/${secretId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),
  );
  const data = await resp.json() as SecretResponse;
  return data.secret;
}

export async function deleteSecret(secretId: string): Promise<DeleteSecretResponse> {
  const resp = await requireOk(
    await platformApiFetch(`/secrets/${secretId}`, {
      method: 'DELETE',
    }),
  );
  return await resp.json() as DeleteSecretResponse;
}
