import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  AgchainCredentialScope,
  AgchainScopedModelProvider,
  ScopedCredentialPayload,
  VertexAiCredentialPayload,
} from '@/lib/agchainModelProviderCredentials';

type AgchainProviderCredentialModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: AgchainScopedModelProvider | null;
  scope: AgchainCredentialScope;
  saving: boolean;
  testing: boolean;
  onSubmit: (payload: ScopedCredentialPayload) => Promise<void>;
  onTest: (payload: ScopedCredentialPayload) => Promise<void>;
  onRemove?: () => Promise<void>;
};

type ProviderMode = 'standard' | 'express';
type AuthMode = 'access_token' | 'credential_json' | 'api_key';

const inputClass =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

function buildInitialVertexDraft(provider: AgchainScopedModelProvider | null): VertexAiCredentialPayload {
  const config =
    provider?.credential_config && 'auth_mode' in provider.credential_config
      ? provider.credential_config
      : null;

  return {
    provider_mode: (config?.provider_mode as ProviderMode | undefined) ?? 'standard',
    auth_mode: (config?.auth_mode as AuthMode | undefined) ?? 'access_token',
    access_token: '',
    credential_json: '',
    api_key: '',
    project: config?.project ?? '',
    location: config?.location ?? 'us-central1',
    supports_streaming: config?.supports_streaming ?? true,
    include_default_registry: config?.include_default_registry ?? true,
    headers: config?.headers ?? [{ key: '', value: '' }],
    models: config?.models ?? [{ value: '' }],
  };
}

function activeActionLabel(provider: AgchainScopedModelProvider | null, scope: AgchainCredentialScope) {
  if (!provider) return 'Save';
  if (provider.credential_status === 'not_set') return 'Save';
  if (scope === 'project' && provider.credential_status === 'inherited') return 'Save';
  return 'Update';
}

function allowRemove(provider: AgchainScopedModelProvider | null) {
  return provider?.credential_status === 'set';
}

function derivedVertexBaseUrl(draft: VertexAiCredentialPayload) {
  if (draft.provider_mode === 'express') {
    return 'https://aiplatform.googleapis.com';
  }
  if ((draft.location || '').trim().toLowerCase() === 'global') {
    return 'https://aiplatform.googleapis.com';
  }
  return `https://${draft.location || 'us-central1'}-aiplatform.googleapis.com`;
}

export function AgchainProviderCredentialModal({
  open,
  onOpenChange,
  provider,
  scope,
  saving,
  testing,
  onSubmit,
  onTest,
  onRemove,
}: AgchainProviderCredentialModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [vertexDraft, setVertexDraft] = useState<VertexAiCredentialPayload>(() => buildInitialVertexDraft(provider));

  useEffect(() => {
    if (!open) return;
    setApiKey('');
    setVertexDraft(buildInitialVertexDraft(provider));
  }, [open, provider]);

  const actionLabel = activeActionLabel(provider, scope);
  const isVertex = provider?.credential_form_kind === 'vertex_ai';
  const vertexBaseUrl = useMemo(() => derivedVertexBaseUrl(vertexDraft), [vertexDraft]);

  async function handleSubmit() {
    if (!provider) return;
    if (provider.credential_form_kind === 'vertex_ai') {
      await onSubmit(vertexDraft);
      return;
    }
    await onSubmit({ api_key: apiKey });
  }

  async function handleTest() {
    if (!provider) return;
    if (provider.credential_form_kind === 'vertex_ai') {
      await onTest(vertexDraft);
      return;
    }
    await onTest({ api_key: apiKey });
  }

  return (
    <DialogRoot open={open} onOpenChange={(details) => onOpenChange(details.open)}>
      {open && provider ? (
        <DialogContent className="w-[min(44rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)]">
          <DialogCloseTrigger />
          <DialogTitle>{provider.credential_form_kind === 'vertex_ai' ? 'Configure provider' : 'Configure API key'}</DialogTitle>
          <DialogDescription>
            {scope === 'organization'
              ? 'Manage the organization-wide provider credential used as the global default.'
              : 'Manage the project-level provider credential override for this provider.'}
          </DialogDescription>
          <DialogBody>
            <section className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-foreground">{provider.display_name}</p>
                  {provider.docs_url ? (
                    <a
                      href={provider.docs_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex text-xs text-muted-foreground underline-offset-4 hover:underline"
                    >
                      Provider docs
                    </a>
                  ) : null}
                </div>
                <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {scope === 'organization' ? 'Organization' : 'Project'}
                </span>
              </div>
              {provider.notes ? (
                <p className="mt-3 text-xs leading-6 text-muted-foreground">{provider.notes}</p>
              ) : null}
            </section>

            {!isVertex ? (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label htmlFor="provider-name" className="text-sm font-medium text-foreground">
                    Name
                  </label>
                  <input
                    id="provider-name"
                    value={provider.env_var_name ?? provider.display_name}
                    readOnly
                    className={`${inputClass} cursor-not-allowed bg-muted/45`}
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="provider-api-key" className="text-sm font-medium text-foreground">
                    API Key
                  </label>
                  <input
                    id="provider-api-key"
                    type="password"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.currentTarget.value)}
                    placeholder="Enter API key"
                    className={inputClass}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground">Connector mode</label>
                  <div className="inline-flex w-fit rounded-md border p-0.5">
                    <button
                      type="button"
                      className={`rounded px-3 py-1.5 text-sm ${
                        vertexDraft.provider_mode === 'standard'
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                      onClick={() =>
                        setVertexDraft((current) => ({
                          ...current,
                          provider_mode: 'standard',
                          auth_mode: current.auth_mode === 'api_key' ? 'access_token' : current.auth_mode,
                        }))
                      }
                    >
                      Standard Vertex AI
                    </button>
                    <button
                      type="button"
                      className={`rounded px-3 py-1.5 text-sm ${
                        vertexDraft.provider_mode === 'express'
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                      onClick={() =>
                        setVertexDraft((current) => ({
                          ...current,
                          provider_mode: 'express',
                          auth_mode: 'api_key',
                        }))
                      }
                    >
                      Vertex AI express mode
                    </button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground">Authentication</label>
                  <div className="flex flex-wrap gap-4 text-sm text-foreground">
                    {vertexDraft.provider_mode === 'express' ? (
                      <span className="rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground">
                        Authentication: API Key
                      </span>
                    ) : (
                      <>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="radio"
                            checked={vertexDraft.auth_mode === 'access_token'}
                            onChange={() => setVertexDraft((current) => ({ ...current, auth_mode: 'access_token' }))}
                          />
                          Access Token
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="radio"
                            checked={vertexDraft.auth_mode === 'credential_json'}
                            onChange={() => setVertexDraft((current) => ({ ...current, auth_mode: 'credential_json' }))}
                          />
                          Credential JSON
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="radio"
                            checked={vertexDraft.auth_mode === 'api_key'}
                            onChange={() => setVertexDraft((current) => ({ ...current, auth_mode: 'api_key' }))}
                          />
                          API Key
                        </label>
                      </>
                    )}
                  </div>
                </div>

                {vertexDraft.auth_mode === 'credential_json' ? (
                  <div className="grid gap-2">
                    <label htmlFor="vertex-credential-json" className="text-sm font-medium text-foreground">
                      Credential JSON
                    </label>
                    <textarea
                      id="vertex-credential-json"
                      value={vertexDraft.credential_json}
                      onChange={(event) => {
                        const nextValue = event.currentTarget.value;
                        setVertexDraft((current) => ({ ...current, credential_json: nextValue }));
                      }}
                      placeholder="Paste full Google Cloud credential JSON here"
                      className={`${inputClass} min-h-32 font-mono`}
                    />
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <label htmlFor="vertex-secret" className="text-sm font-medium text-foreground">
                      {vertexDraft.auth_mode === 'access_token' ? 'Access Token' : 'API Key'}
                    </label>
                    <input
                      id="vertex-secret"
                      type="password"
                      value={vertexDraft.auth_mode === 'access_token' ? vertexDraft.access_token : vertexDraft.api_key}
                      onChange={(event) => {
                        const nextValue = event.currentTarget.value;
                        const nextKey = vertexDraft.auth_mode === 'access_token' ? 'access_token' : 'api_key';
                        setVertexDraft((current) => ({
                          ...current,
                          [nextKey]: nextValue,
                        }));
                      }}
                      placeholder={vertexDraft.auth_mode === 'access_token' ? 'Enter access token' : 'Enter API key'}
                      className={inputClass}
                    />
                  </div>
                )}

                {vertexDraft.provider_mode === 'standard' ? (
                  <>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="grid gap-2">
                        <label htmlFor="vertex-project" className="text-sm font-medium text-foreground">
                          Project
                        </label>
                        <input
                          id="vertex-project"
                          value={vertexDraft.project}
                          onChange={(event) => {
                            const nextValue = event.currentTarget.value;
                            setVertexDraft((current) => ({ ...current, project: nextValue }));
                          }}
                          className={inputClass}
                          placeholder="project-id"
                        />
                      </div>
                      <div className="grid gap-2">
                        <label htmlFor="vertex-location" className="text-sm font-medium text-foreground">
                          Location
                        </label>
                        <input
                          id="vertex-location"
                          value={vertexDraft.location}
                          onChange={(event) => {
                            const nextValue = event.currentTarget.value;
                            setVertexDraft((current) => ({ ...current, location: nextValue }));
                          }}
                          className={inputClass}
                          placeholder="us-central1 or global"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Derived API base URL: <span className="font-medium text-foreground">{vertexBaseUrl}</span>
                    </p>
                  </>
                ) : null}

                <section className="grid gap-2 rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-sm font-medium text-foreground">Capabilities</p>
                  <label className="inline-flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={vertexDraft.supports_streaming}
                      onChange={(event) => {
                        const nextChecked = event.currentTarget.checked;
                        setVertexDraft((current) => ({ ...current, supports_streaming: nextChecked }));
                      }}
                    />
                    This endpoint supports streaming
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={vertexDraft.include_default_registry}
                      onChange={(event) => {
                        const nextChecked = event.currentTarget.checked;
                        setVertexDraft((current) => ({
                          ...current,
                          include_default_registry: nextChecked,
                        }));
                      }}
                    />
                    Include the default registry of Vertex AI models
                  </label>
                </section>
              </div>
            )}
          </DialogBody>
          <DialogFooter className="items-center justify-between border-t border-border/70 pt-4">
            <div />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void handleTest()} disabled={testing}>
                {testing ? 'Testing...' : 'Test key'}
              </Button>
              {allowRemove(provider) && onRemove ? (
                <Button type="button" variant="outline" onClick={() => void onRemove()} disabled={saving}>
                  Remove
                </Button>
              ) : null}
              <Button type="button" onClick={() => void handleSubmit()} disabled={saving}>
                {saving ? `${actionLabel}...` : actionLabel}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </DialogRoot>
  );
}
