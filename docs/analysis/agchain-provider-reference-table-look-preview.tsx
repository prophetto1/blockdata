import { Fragment, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { IconSearch, IconX } from '@tabler/icons-react';

type CredentialScope = 'organization' | 'project';
type CredentialStatus = 'Not set' | 'Set' | 'Inherited';
type CredentialFormKind = 'basic_api_key' | 'azure_openai' | 'aws_bedrock' | 'vertex_ai';

type ProviderRecord = {
  providerSlug: string;
  displayName: string;
  envVarName: string;
  docsUrl: string;
  providerCategory: string;
  credentialFormKind: CredentialFormKind;
  logoText: string;
};

type ProviderRuntimeState = {
  hasOrgCredential: boolean;
  hasProjectCredential: boolean;
  orgLastUpdatedAt: string | null;
  projectLastUpdatedAt: string | null;
};

type ToastState = {
  title: string;
  message?: string;
  tone: 'success' | 'error' | 'info';
} | null;

type FormVariantConfig = {
  modeLabel: string;
  helperText: string;
  extraFieldLabel?: string;
  extraFieldPlaceholder?: string;
};

const INPUT_BASE_CLASS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring';

const FORM_VARIANTS: Record<CredentialFormKind, FormVariantConfig> = {
  basic_api_key: {
    modeLabel: 'API key',
    helperText: 'Use the provider API key for direct authentication.',
  },
  azure_openai: {
    modeLabel: 'Azure OpenAI API key',
    helperText: 'Set your Azure OpenAI credentials for the selected subscription.',
    extraFieldLabel: 'Azure endpoint',
    extraFieldPlaceholder: 'https://{resource-name}.openai.azure.com/',
  },
  aws_bedrock: {
    modeLabel: 'AWS Bedrock API key',
    helperText: 'Store your AWS credential values used for Bedrock requests.',
    extraFieldLabel: 'AWS region',
    extraFieldPlaceholder: 'us-east-1',
  },
  vertex_ai: {
    modeLabel: 'Vertex AI API key',
    helperText: 'Use service-account-based credentials for Vertex AI requests.',
    extraFieldLabel: 'Google Cloud project ID',
    extraFieldPlaceholder: 'your-gcp-project-id',
  },
};

const providersSeed: ProviderRecord[] = [
  {
    providerSlug: 'openai',
    displayName: 'OpenAI',
    envVarName: 'OPENAI_API_KEY',
    docsUrl: 'https://platform.openai.com/docs/api-reference',
    providerCategory: 'Model providers',
    credentialFormKind: 'basic_api_key',
    logoText: 'O',
  },
  {
    providerSlug: 'anthropic',
    displayName: 'Anthropic',
    envVarName: 'ANTHROPIC_API_KEY',
    docsUrl: 'https://docs.anthropic.com/en/api/getting-started',
    providerCategory: 'Model providers',
    credentialFormKind: 'basic_api_key',
    logoText: 'A',
  },
  {
    providerSlug: 'azure-openai',
    displayName: 'Azure OpenAI',
    envVarName: 'AZURE_OPENAI_API_KEY',
    docsUrl: 'https://learn.microsoft.com/azure/ai-services/openai',
    providerCategory: 'Cloud providers',
    credentialFormKind: 'azure_openai',
    logoText: 'AZ',
  },
  {
    providerSlug: 'aws-bedrock',
    displayName: 'AWS Bedrock',
    envVarName: 'AWS_BEDROCK_KEY',
    docsUrl: 'https://docs.aws.amazon.com/bedrock',
    providerCategory: 'Cloud providers',
    credentialFormKind: 'aws_bedrock',
    logoText: 'AW',
  },
  {
    providerSlug: 'vertex-ai',
    displayName: 'Vertex AI',
    envVarName: 'GOOGLE_APPLICATION_CREDENTIALS',
    docsUrl: 'https://cloud.google.com/vertex-ai',
    providerCategory: 'Cloud providers',
    credentialFormKind: 'vertex_ai',
    logoText: 'V',
  },
];

const nowDate = () => new Date().toLocaleString();

const initialRuntimeState: Record<string, ProviderRuntimeState> = {
  openai: { hasOrgCredential: true, hasProjectCredential: false, orgLastUpdatedAt: nowDate(), projectLastUpdatedAt: null },
  anthropic: { hasOrgCredential: false, hasProjectCredential: false, orgLastUpdatedAt: null, projectLastUpdatedAt: null },
  'azure-openai': { hasOrgCredential: true, hasProjectCredential: true, orgLastUpdatedAt: nowDate(), projectLastUpdatedAt: nowDate() },
  'aws-bedrock': { hasOrgCredential: false, hasProjectCredential: true, orgLastUpdatedAt: null, projectLastUpdatedAt: nowDate() },
  'vertex-ai': { hasOrgCredential: false, hasProjectCredential: false, orgLastUpdatedAt: null, projectLastUpdatedAt: null },
};

function resolveStatus(scope: CredentialScope, state: ProviderRuntimeState): CredentialStatus {
  if (scope === 'organization') return state.hasOrgCredential ? 'Set' : 'Not set';
  if (state.hasProjectCredential) return 'Set';
  if (state.hasOrgCredential) return 'Inherited';
  return 'Not set';
}

function resolveLastUpdate(scope: CredentialScope, state: ProviderRuntimeState): string {
  if (scope === 'organization') return state.orgLastUpdatedAt || '--';
  if (state.hasProjectCredential) return state.projectLastUpdatedAt || '--';
  return state.hasOrgCredential ? state.orgLastUpdatedAt || '--' : '--';
}

function statusColor(status: CredentialStatus) {
  return status === 'Set'
    ? 'text-emerald-500'
    : status === 'Inherited'
      ? 'text-amber-500'
      : 'text-muted-foreground';
}

function primaryActionLabel(scope: CredentialScope, status: CredentialStatus): 'Save' | 'Update' {
  if (status === 'Not set') return 'Save';
  return scope === 'project' && status === 'Inherited' ? 'Save' : 'Update';
}

function resolveShowRemove(status: CredentialStatus): boolean {
  return status === 'Set';
}

function getRowActions(_scope: CredentialScope, status: CredentialStatus): Array<'Add Credential' | 'Edit' | 'Remove'> {
  if (status === 'Not set') return ['Add Credential'];
  if (status === 'Set') return ['Edit', 'Remove'];
  return ['Edit'];
}

function makePayload(apiKey: string, formKind: CredentialFormKind, extraField: string) {
  return {
    credential_payload: {
      api_key: apiKey,
      credential_form_kind: formKind,
      extra_field: extraField || undefined,
    },
  };
}

function getVariantConfig(formKind: CredentialFormKind): FormVariantConfig {
  return FORM_VARIANTS[formKind];
}

export function AgchainProviderReferenceTableLookPreview() {
  const [scope, setScope] = useState<CredentialScope>('project');
  const [query, setQuery] = useState('');
  const [runtimeBySlug, setRuntimeBySlug] = useState<Record<string, ProviderRuntimeState>>(initialRuntimeState);
  const [activeProviderSlug, setActiveProviderSlug] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [providerExtraField, setProviderExtraField] = useState('');
  const [toast, setToast] = useState<ToastState>(null);

  const groupedRows = useMemo(() => {
    const grouped = new Map<string, ProviderRecord[]>();
    const q = query.trim().toLowerCase();

    providersSeed
      .filter((provider) => !q || `${provider.displayName} ${provider.envVarName} ${provider.providerCategory}`.toLowerCase().includes(q))
      .forEach((provider) => {
        const bucket = grouped.get(provider.providerCategory) ?? [];
        bucket.push(provider);
        grouped.set(provider.providerCategory, bucket);
      });

    return Array.from(grouped.entries());
  }, [query]);

  const activeProvider = activeProviderSlug
    ? providersSeed.find((provider) => provider.providerSlug === activeProviderSlug)
    : null;
  const activeRuntimeState = activeProvider ? runtimeBySlug[activeProvider.providerSlug] : null;
  const activeStatus = activeProvider && activeRuntimeState ? resolveStatus(scope, activeRuntimeState) : null;
  const activeActionLabel = activeStatus ? primaryActionLabel(scope, activeStatus) : 'Save';
  const activeVariantConfig = activeProvider ? getVariantConfig(activeProvider.credentialFormKind) : null;

  const openForProvider = (providerSlug: string) => {
    setActiveProviderSlug(providerSlug);
    setApiKey('');
    setProviderExtraField('');
    setOpenModal(true);
    setToast(null);
  };

  const closeModal = () => {
    setOpenModal(false);
    setActiveProviderSlug(null);
    setApiKey('');
    setProviderExtraField('');
  };

  const removeCredential = (provider: ProviderRecord, status: CredentialStatus) => {
    if (!resolveShowRemove(status)) return;

    setRuntimeBySlug((prev) => ({
      ...prev,
      [provider.providerSlug]:
        scope === 'organization'
          ? {
              ...prev[provider.providerSlug],
              hasOrgCredential: false,
              orgLastUpdatedAt: null,
            }
          : {
              ...prev[provider.providerSlug],
              hasProjectCredential: false,
              projectLastUpdatedAt: null,
            },
    }));
    setToast({
      title: 'Credential removed',
      tone: 'success',
      message: `${provider.displayName} credential removed.`,
    });
  };

  const onRowRemove = (provider: ProviderRecord) => {
    const state = runtimeBySlug[provider.providerSlug];
    const status = resolveStatus(scope, state);
    removeCredential(provider, status);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!activeProvider || !activeRuntimeState) return;

    const trimmedApiKey = apiKey.trim();
    if (!trimmedApiKey) {
      setToast({
        title: 'Unable to save credential',
        message: 'Enter a value before saving.',
        tone: 'error',
      });
      return;
    }

    const payload = makePayload(trimmedApiKey, activeProvider.credentialFormKind, providerExtraField.trim());
    setRuntimeBySlug((prev) => ({
      ...prev,
      [activeProvider.providerSlug]:
        scope === 'organization'
          ? {
              ...prev[activeProvider.providerSlug],
              hasOrgCredential: true,
              orgLastUpdatedAt: nowDate(),
            }
          : {
              ...prev[activeProvider.providerSlug],
              hasProjectCredential: true,
              projectLastUpdatedAt: nowDate(),
            },
    }));

    setOpenModal(false);
    setActiveProviderSlug(null);
    setApiKey('');
    setProviderExtraField('');
    setToast({
      title: 'Credential saved',
      tone: 'success',
      message: `${activeProvider.displayName}: ${payload.credential_payload.credential_form_kind === 'basic_api_key' ? 'API key' : 'credentials'} saved.`,
    });
  };

  const onTest = () => {
    if (!activeProvider) return;
    if (!apiKey.trim()) {
      setToast({
        title: 'Unable to validate credential',
        message: `Enter a value first for ${activeProvider.displayName}.`,
        tone: 'error',
      });
      return;
    }

    const passed = apiKey.length > 6 || apiKey.startsWith('sk-');
    setToast({
      title: passed ? 'Credential validated' : 'Unable to validate credential',
      tone: passed ? 'success' : 'error',
      message: passed
        ? `Validation succeeded for ${activeProvider.displayName}.`
        : 'The credential format is invalid or validation request failed.',
    });
  };

  const onRemove = () => {
    if (!activeProvider || !activeRuntimeState || !activeStatus) return;
    const status = activeStatus;
    if (!resolveShowRemove(status)) return;
    removeCredential(activeProvider, status);
    closeModal();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <section className="rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Provider credentials</h1>
            <p className="text-sm text-muted-foreground">Manage provider credentials across organization and project scope.</p>
          </div>
          <div className="inline-flex rounded-md border p-0.5">
            <button
              type="button"
              onClick={() => setScope('organization')}
              className={`rounded px-3 py-1.5 text-sm ${scope === 'organization' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}
            >
              Organization
            </button>
            <button
              type="button"
              onClick={() => setScope('project')}
              className={`rounded px-3 py-1.5 text-sm ${scope === 'project' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}
            >
              Project
            </button>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[240px] flex-1 max-w-sm">
              <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder="Search providers"
                className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </label>
            <button
              type="button"
              onClick={() => setQuery('')}
              disabled={!query.trim()}
              className={`text-xs ${query.trim() ? 'text-muted-foreground hover:text-foreground' : 'cursor-not-allowed text-muted-foreground/50'}`}
            >
              Clear all
            </button>
          </div>

          <div className="overflow-hidden rounded-md border border-border">
            <div className="overflow-auto">
              <table className="min-w-full text-left">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Provider</th>
                    <th className="px-3 py-2">Credential Status</th>
                    <th className="px-3 py-2">Last Update</th>
                    <th className="w-28 px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                        No provider rows match "{query}".
                      </td>
                    </tr>
                  ) : (
                    groupedRows.map(([category, providers]) => (
                      <Fragment key={category}>
                        <tr className="border-b border-border bg-muted/20">
                          <td colSpan={4} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {category}
                          </td>
                        </tr>
                        {providers.map((provider) => {
                          const state = runtimeBySlug[provider.providerSlug];
                          const status = resolveStatus(scope, state);
                          const rowActions = getRowActions(scope, status);

                          return (
                            <tr key={provider.providerSlug} className="border-b border-border/60 align-top hover:bg-accent/20">
                              <td className="px-3 py-3">
                                <div className="flex items-start gap-2">
                                  <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded bg-secondary text-xs font-semibold text-secondary-foreground">
                                    {provider.logoText}
                                  </span>
                                  <div className="leading-tight">
                                    <p className="text-sm font-medium text-foreground">{provider.displayName}</p>
                                    <p className="text-[11px] text-muted-foreground">{provider.envVarName}</p>
                                  </div>
                                </div>
                              </td>
                              <td className={`px-3 py-3 ${statusColor(status)}`}>{status}</td>
                              <td className="px-3 py-3 text-muted-foreground">{resolveLastUpdate(scope, state)}</td>
                              <td className="px-3 py-3 text-right">
                                <div className="flex flex-wrap justify-end gap-2">
                                  {rowActions.map((action) => {
                                    if (action === 'Remove') {
                                      return (
                                        <button
                                          type="button"
                                          key={action}
                                          onClick={() => onRowRemove(provider)}
                                          className="text-xs text-destructive hover:underline"
                                          aria-label={`Remove ${provider.displayName} credential`}
                                        >
                                          {action}
                                        </button>
                                      );
                                    }

                                    return (
                                      <button
                                        type="button"
                                        key={action}
                                        onClick={() => openForProvider(provider.providerSlug)}
                                        className="text-xs text-primary hover:underline"
                                        aria-label={`${action} ${provider.displayName} credential`}
                                      >
                                        {action}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-60 w-[360px] max-w-[90vw] rounded-md border p-3 shadow-lg">
          <div
            className={`rounded-md px-3 py-2 text-sm ${
              toast.tone === 'success'
                ? 'bg-emerald-500/10 text-emerald-700'
                : toast.tone === 'error'
                  ? 'bg-rose-500/10 text-rose-700'
                  : 'bg-muted text-foreground'
            }`}
          >
            <p className="font-medium">{toast.title}</p>
            {toast.message ? <p className="mt-1 text-xs text-foreground/80">{toast.message}</p> : null}
          </div>
        </div>
      ) : null}

      {openModal && activeProvider && activeRuntimeState && activeVariantConfig ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Configure credential</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Keep each provider credential aligned to current scope and environment.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-input/60 text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-md border p-4">
              <div className="flex items-start gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-secondary text-sm font-semibold text-secondary-foreground">
                  {activeProvider.logoText}
                </span>
                <div className="leading-tight">
                  <p className="font-medium">{activeProvider.displayName}</p>
                  <a
                    href={activeProvider.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                  >
                    Provider docs
                  </a>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{activeVariantConfig.helperText}</p>
            </div>

            <form onSubmit={onSubmit} className="mt-5 grid gap-4">
              <div className="grid gap-1.5">
                <label htmlFor="credential-name" className="text-sm font-medium">Name</label>
                <input
                  id="credential-name"
                  value={activeProvider.envVarName}
                  readOnly
                  className={`${INPUT_BASE_CLASS} cursor-not-allowed bg-muted/45`}
                />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="api-key" className="text-sm font-medium">{activeVariantConfig.modeLabel}</label>
                <input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.currentTarget.value)}
                  className={INPUT_BASE_CLASS}
                  aria-label={`${activeVariantConfig.modeLabel} input`}
                />
              </div>
              {activeProvider.credentialFormKind !== 'basic_api_key' && activeVariantConfig.extraFieldLabel ? (
                <div className="grid gap-1.5">
                  <label htmlFor="provider-extra" className="text-sm font-medium">
                    {activeVariantConfig.extraFieldLabel}
                  </label>
                  <input
                    id="provider-extra"
                    value={providerExtraField}
                    onChange={(event) => setProviderExtraField(event.currentTarget.value)}
                    className={INPUT_BASE_CLASS}
                    placeholder={activeVariantConfig.extraFieldPlaceholder}
                    aria-label={activeVariantConfig.extraFieldLabel}
                  />
                </div>
              ) : null}

              <div className="mt-3 flex justify-between items-center gap-2 border-t pt-4">
                <p className="text-xs text-muted-foreground">{activeVariantConfig.modeLabel}</p>
                <div className="inline-flex gap-2">
                  <button
                    type="button"
                    onClick={onTest}
                    className="rounded-md border border-input px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                  >
                    Test key
                  </button>
                  {activeStatus === 'Set' ? (
                    <button
                      type="button"
                      onClick={onRemove}
                      className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive hover:bg-destructive/15"
                    >
                      Remove
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
                  >
                    {activeActionLabel}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
