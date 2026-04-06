import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

type CredentialScope = 'organization' | 'project';
type CredentialStatus = 'Not set' | 'Set' | 'Inherited';

type ProviderRecord = {
  providerSlug: string;
  displayName: string;
  envVarName: string;
  docsUrl: string;
  providerCategory: string;
  credentialFormKind: 'basic_api_key' | string;
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

const INPUT_BASE_CLASS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring';

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
    credentialFormKind: 'basic_api_key',
    logoText: 'AZ',
  },
  {
    providerSlug: 'aws-bedrock',
    displayName: 'AWS Bedrock',
    envVarName: 'AWS_BEDROCK_KEY',
    docsUrl: 'https://docs.aws.amazon.com/bedrock',
    providerCategory: 'Cloud providers',
    credentialFormKind: 'basic_api_key',
    logoText: 'AW',
  },
  {
    providerSlug: 'vertex-ai',
    displayName: 'Vertex AI',
    envVarName: 'GOOGLE_APPLICATION_CREDENTIALS',
    docsUrl: 'https://cloud.google.com/vertex-ai',
    providerCategory: 'Cloud providers',
    credentialFormKind: 'basic_api_key',
    logoText: 'V',
  },
];

const nowDate = () => new Date().toLocaleString();

const initialRuntimeState: Record<string, ProviderRuntimeState> = {
  openai: {
    hasOrgCredential: true,
    hasProjectCredential: false,
    orgLastUpdatedAt: nowDate(),
    projectLastUpdatedAt: null,
  },
  anthropic: {
    hasOrgCredential: false,
    hasProjectCredential: false,
    orgLastUpdatedAt: null,
    projectLastUpdatedAt: null,
  },
  'azure-openai': {
    hasOrgCredential: true,
    hasProjectCredential: true,
    orgLastUpdatedAt: nowDate(),
    projectLastUpdatedAt: nowDate(),
  },
  'aws-bedrock': {
    hasOrgCredential: false,
    hasProjectCredential: true,
    orgLastUpdatedAt: null,
    projectLastUpdatedAt: nowDate(),
  },
  'vertex-ai': {
    hasOrgCredential: false,
    hasProjectCredential: false,
    orgLastUpdatedAt: null,
    projectLastUpdatedAt: null,
  },
};

function resolveStatus(scope: CredentialScope, state: ProviderRuntimeState): CredentialStatus {
  if (scope === 'organization') {
    return state.hasOrgCredential ? 'Set' : 'Not set';
  }

  if (state.hasProjectCredential) {
    return 'Set';
  }

  if (state.hasOrgCredential) {
    return 'Inherited';
  }

  return 'Not set';
}

function resolveLastUpdate(scope: CredentialScope, state: ProviderRuntimeState): string {
  if (scope === 'organization') {
    return state.orgLastUpdatedAt || '--';
  }

  if (state.hasProjectCredential) {
    return state.projectLastUpdatedAt || '--';
  }

  return state.hasOrgCredential ? state.orgLastUpdatedAt || '--' : '--';
}

function resolvePrimaryActionLabel(scope: CredentialScope, status: CredentialStatus): 'Save' | 'Update' {
  if (scope === 'project' && status === 'Inherited') {
    return 'Save';
  }

  if (scope === 'organization' && status === 'Not set') {
    return 'Save';
  }

  if (scope === 'project' && status === 'Not set') {
    return 'Save';
  }

  return 'Update';
}

function resolveShowRemove(scope: CredentialScope, status: CredentialStatus): boolean {
  if (scope === 'organization') {
    return status === 'Set';
  }

  return status === 'Set';
}

function makePayload(apiKey: string) {
  return {
    credential_payload: {
      api_key: apiKey,
    },
  };
}

function statusColorClass(status: CredentialStatus) {
  return status === 'Set'
    ? 'text-emerald-500'
    : status === 'Inherited'
      ? 'text-amber-500'
      : 'text-muted-foreground';
}

export function AgchainProviderReferenceUiPreview() {
  const [scope, setScope] = useState<CredentialScope>('project');
  const [runtimeBySlug, setRuntimeBySlug] = useState<Record<string, ProviderRuntimeState>>(initialRuntimeState);
  const [activeProviderSlug, setActiveProviderSlug] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [toast, setToast] = useState<ToastState>(null);

  const rowsByCategory = useMemo(() => {
    const grouped = new Map<string, ProviderRecord[]>();

    providersSeed.forEach((provider) => {
      const bucket = grouped.get(provider.providerCategory) ?? [];
      bucket.push(provider);
      grouped.set(provider.providerCategory, bucket);
    });

    return Array.from(grouped.entries()).map(([category, providers]) => ({
      category,
      providers,
    }));
  }, []);

  const activeProvider = activeProviderSlug
    ? providersSeed.find((provider) => provider.providerSlug === activeProviderSlug)
    : null;

  const activeRuntimeState = activeProvider ? runtimeBySlug[activeProvider.providerSlug] : null;
  const activeStatus = activeProvider && activeRuntimeState ? resolveStatus(scope, activeRuntimeState) : null;
  const showRemove = activeStatus ? resolveShowRemove(scope, activeStatus) : false;
  const primaryActionLabel = activeStatus ? resolvePrimaryActionLabel(scope, activeStatus) : 'Save';

  const clearToast = () => setToast(null);

  const openForProvider = (providerSlug: string) => {
    setActiveProviderSlug(providerSlug);
    setApiKey('');
    setOpenModal(true);
    clearToast();
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!activeProviderSlug || !activeProvider || !activeRuntimeState) {
      return;
    }

    const payload = makePayload(apiKey.trim());
    if (!payload.credential_payload.api_key.trim()) {
      setToast({
        title: 'Unable to save API key',
        message: 'Enter a value before saving this secret.',
        tone: 'error',
      });
      return;
    }

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
    setToast({
      title: 'Secret saved successfully',
      tone: 'success',
      message: `${activeProvider.displayName}: ${payload.credential_payload.api_key ? 'Stored in credential payload.' : ''}`,
    });
  };

  const onTest = () => {
    if (!activeProviderSlug || !activeProvider) {
      return;
    }

    const input = apiKey.trim();
    if (!input) {
      setToast({
        title: 'Unable to validate API key',
        message: `Enter a key first for ${activeProvider.displayName}.`,
        tone: 'error',
      });
      return;
    }

    const passed = input.length > 6 || input.startsWith('sk-');
    if (passed) {
      setToast({
        title: 'API key validated',
        tone: 'success',
        message: `Validation succeeded for ${activeProvider.displayName}.`,
      });
    } else {
      setToast({
        title: 'Unable to validate API key',
        tone: 'error',
        message: 'The API key format is invalid or test request failed.',
      });
    }
  };

  const onRemove = () => {
    if (!activeProvider || !activeProviderSlug || !activeRuntimeState || !activeStatus) {
      return;
    }

    if (!resolveShowRemove(scope, activeStatus)) {
      return;
    }

    setRuntimeBySlug((prev) => ({
      ...prev,
      [activeProvider.providerSlug]:
        scope === 'organization'
          ? {
              ...prev[activeProvider.providerSlug],
              hasOrgCredential: false,
              orgLastUpdatedAt: null,
            }
          : {
              ...prev[activeProvider.providerSlug],
              hasProjectCredential: false,
              projectLastUpdatedAt: null,
            },
    }));

    setOpenModal(false);
    setActiveProviderSlug(null);
    setApiKey('');
    setToast({
      title: 'Secret removed',
      tone: 'success',
      message: `${activeProvider.displayName} local credential entry removed.`,
    });
  };

  const closeModal = () => {
    setOpenModal(false);
    setActiveProviderSlug(null);
    setApiKey('');
  };

  return (
    <div className="min-h-screen bg-background p-6 text-sm text-foreground">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Provider credentials</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Configure API credentials for each configured provider scope.
            </p>
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
        </header>

        <div className="space-y-6">
          {rowsByCategory.map(({ category, providers }) => (
            <section key={category} className="grid gap-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{category}</h2>
              <div className="rounded-xl border bg-card">
                <table className="w-full table-fixed">
                  <thead className="border-b bg-muted/35">
                    <tr>
                      <th className="w-1/3 px-4 py-2 text-left font-medium text-muted-foreground">Provider</th>
                      <th className="w-1/6 px-4 py-2 text-left font-medium text-muted-foreground">Credential Status</th>
                      <th className="w-1/5 px-4 py-2 text-left font-medium text-muted-foreground">Last Update</th>
                      <th className="w-20 px-4 py-2 text-right font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providers.map((provider, index) => {
                      const state = runtimeBySlug[provider.providerSlug];
                      const status = resolveStatus(scope, state);
                      const isLast = index === providers.length - 1;

                      return (
                        <tr key={provider.providerSlug} className={`border-b ${isLast ? 'border-transparent' : ''}`}>
                          <td className="px-4 py-3 align-top">
                            <div className="flex items-start gap-2">
                              <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded bg-secondary text-xs font-semibold text-secondary-foreground">
                                {provider.logoText}
                              </span>
                              <div className="leading-tight">
                                <p className="font-medium">{provider.displayName}</p>
                                <p className="text-xs text-muted-foreground">{provider.envVarName}</p>
                              </div>
                            </div>
                          </td>
                          <td className={`px-4 py-3 align-top ${statusColorClass(status)}`}>{status}</td>
                          <td className="px-4 py-3 align-top text-muted-foreground">{resolveLastUpdate(scope, state)}</td>
                          <td className="px-4 py-3 text-right align-top">
                            <button
                              type="button"
                              onClick={() => openForProvider(provider.providerSlug)}
                              aria-label={`Configure ${provider.displayName} credentials`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-muted"
                              title="Configure"
                            >
                              ✎
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      </div>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-40 w-[360px] max-w-[90vw] rounded-md border p-3 shadow-lg">
          <div
            className={`rounded-md px-3 py-2 text-sm ${toast.tone === 'success' ? 'bg-emerald-500/10 text-emerald-700' : toast.tone === 'error' ? 'bg-rose-500/10 text-rose-700' : 'bg-muted text-foreground'}`}
          >
            <p className="font-medium">{toast.title}</p>
            {toast.message ? <p className="mt-1 text-xs text-foreground/80">{toast.message}</p> : null}
          </div>
        </div>
      ) : null}

      {openModal && activeProvider && activeRuntimeState ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-[0_24px_50px_-30px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Configure API key</h2>
                <p className="mt-1 text-xs text-muted-foreground">Update provider credential for current scope.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-input/60 text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-5 rounded-md border p-4">
              <div className="mb-3 flex items-start gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-secondary text-sm font-semibold">
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
            </div>

            <form onSubmit={onSubmit} className="mt-5 grid gap-4">
              <div className="grid gap-1.5">
                <label htmlFor="credential-name" className="text-sm font-medium">
                  Name
                </label>
                <input
                  id="credential-name"
                  value={activeProvider.envVarName}
                  readOnly
                  className={`${INPUT_BASE_CLASS} cursor-not-allowed bg-muted/45`}
                  aria-label="Credential name"
                />
                <p className="text-xs text-muted-foreground">Expected environment variable identifier.</p>
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="api-key" className="text-sm font-medium">
                  API key
                </label>
                <input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.currentTarget.value)}
                  placeholder="Enter API key"
                  className={INPUT_BASE_CLASS}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  API keys are stored securely in encrypted storage and only used for signed provider requests.
                </p>
              </div>

              <div className="mt-3 flex justify-between items-center gap-2 border-t pt-4">
                <p className="text-xs text-muted-foreground">{activeProvider.credentialFormKind}</p>
                <div className="inline-flex gap-2">
                  <button
                    type="button"
                    onClick={onTest}
                    className="rounded-md border border-input px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                  >
                    Test key
                  </button>
                  {showRemove ? (
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
                    {primaryActionLabel}
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
