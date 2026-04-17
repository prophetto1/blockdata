import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

type ProviderMode = 'standard' | 'express';
type AuthMode = 'access_token' | 'credential_json' | 'api_key';
type EditorSection = 'headers' | 'models' | null;

type HeaderRow = {
  key: string;
  value: string;
};

type ModelRow = {
  value: string;
};

const INPUT_CLASS =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring';
const TEXTAREA_CLASS =
  'w-full min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring';
const CHEVRON = '›';

function PillToggle({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: (value: boolean) => void;
  children: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-start gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onToggle(event.currentTarget.checked)}
        className="mt-0.5 h-4 w-4 rounded border border-input text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <span className="text-foreground">{children}</span>
    </label>
  );
}

function SegmentedChoice<T extends string>({
  options,
  value,
  onValueChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onValueChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md border p-0.5">
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onValueChange(option.value)}
            className={`rounded px-3 py-1.5 text-sm ${
              active
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-muted'
            } ${index === 0 ? '' : 'ml-0.5'}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export function AgchainVertexAICredentialPopupPreview() {
  const [open, setOpen] = useState(true);
  const [providerMode, setProviderMode] = useState<ProviderMode>('standard');
  const [authMode, setAuthMode] = useState<AuthMode>('access_token');
  const [providerName, setProviderName] = useState('Vertex AI');
  const [provider, setProvider] = useState('vertex');
  const [project, setProject] = useState('acme-vertex');
  const [location, setLocation] = useState('us-central1');
  const [accessToken, setAccessToken] = useState('');
  const [credentialJson, setCredentialJson] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [headers, setHeaders] = useState<HeaderRow[]>([{ key: '', value: '' }]);
  const [models, setModels] = useState<ModelRow[]>([{ value: '' }]);
  const [supportsStreaming, setSupportsStreaming] = useState(true);
  const [includeDefaultRegistry, setIncludeDefaultRegistry] = useState(true);
  const [openEditor, setOpenEditor] = useState<EditorSection>(null);
  const [resultMessage, setResultMessage] = useState('Saving status: waiting for changes');

  const isExpress = providerMode === 'express';
  const isApiKeyMode = isExpress || authMode === 'api_key';

  const derivedBaseUrl = useMemo(() => {
    if (isExpress) return 'https://aiplatform.googleapis.com';
    if (location.trim().toLowerCase() === 'global') return 'https://aiplatform.googleapis.com';
    return `https://${location.trim() || 'us-central1'}-aiplatform.googleapis.com`;
  }, [location, isExpress]);

  const configuredHeaderCount = useMemo(
    () => headers.filter((row) => row.key.trim() || row.value.trim()).length,
    [headers],
  );

  const configuredModelCount = useMemo(
    () => models.filter((row) => row.value.trim()).length,
    [models],
  );

  const headerSummary =
    configuredHeaderCount === 0
      ? 'Headers: none configured'
      : `${configuredHeaderCount} custom header rows`;
  const modelSummary =
    configuredModelCount === 0
      ? 'Models: registry-driven defaults only'
      : `${configuredModelCount} custom model rows`;

  const providerModeLabel = isExpress ? 'Vertex AI express mode' : 'Standard Vertex AI';
  const providerModeCopy = isExpress
    ? 'Express mode uses API-key-first global endpoint behavior.'
    : 'Standard mode uses Google Cloud project/location resource framing.';

  const authLabel = useMemo(() => {
    if (isExpress || authMode === 'api_key') return 'API key';
    return authMode === 'access_token' ? 'Access token' : 'Credential JSON';
  }, [authMode, isExpress]);

  const authHelpText = useMemo(() => {
    if (isExpress) {
      return 'Use a Vertex AI API key. This is a plain key string, not JSON.';
    }
    if (authMode === 'access_token') {
      return 'Use a temporary OAuth bearer token. Best for testing and debugging.';
    }
    if (authMode === 'api_key') {
      return 'Use a Vertex AI API key. This is a plain key string, not JSON.';
    }
    return 'Paste a full Google Cloud credential JSON. Prefer ADC-attached credentials for production.';
  }, [authMode, isExpress]);

  const docsLinks = useMemo(() => {
    if (isExpress) {
      return {
        docs: 'https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstarts/quickstart-multimodal',
      };
    }
    return {
      docs: 'https://cloud.google.com/vertex-ai/docs/general/authentication',
    };
  }, [isExpress]);

  const renderedAuthInput = isApiKeyMode ? (
    <input
      type="password"
      value={apiKey}
      onChange={(event) => setApiKey(event.currentTarget.value)}
      placeholder="Enter API key"
      className={INPUT_CLASS}
    />
  ) : authMode === 'access_token' ? (
    <input
      type="password"
      value={accessToken}
      onChange={(event) => setAccessToken(event.currentTarget.value)}
      placeholder="Enter access token"
      className={INPUT_CLASS}
    />
  ) : (
    <textarea
      value={credentialJson}
      onChange={(event) => setCredentialJson(event.currentTarget.value)}
      placeholder="Paste full Google Cloud credential JSON here"
      className={TEXTAREA_CLASS}
    />
  );

  const addHeaderRow = () => {
    setHeaders((prev) => [...prev, { key: '', value: '' }]);
  };

  const removeHeaderRow = (index: number) => {
    setHeaders((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== index) : prev));
  };

  const updateHeader = (index: number, field: keyof HeaderRow, value: string) => {
    setHeaders((prev) =>
      prev.map((row, idx) => {
        if (idx !== index) return row;
        return { ...row, [field]: value };
      }),
    );
  };

  const addModelRow = () => {
    setModels((prev) => [...prev, { value: '' }]);
  };

  const removeModelRow = (index: number) => {
    setModels((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== index) : prev));
  };

  const updateModel = (index: number, value: string) => {
    setModels((prev) =>
      prev.map((row, idx) => {
        if (idx !== index) return row;
        return { ...row, value };
      }),
    );
  };

  const handleProviderModeChange = (nextMode: ProviderMode) => {
    setProviderMode(nextMode);
    if (nextMode === 'express') {
      setAuthMode('api_key');
    } else if (nextMode === 'standard' && authMode === 'api_key') {
      setAuthMode('access_token');
    }
  };

  const toggleEditor = (nextOpen: Exclude<EditorSection, null>) => {
    setOpenEditor((value) => (value === nextOpen ? null : nextOpen));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setResultMessage(`Saving status: saved (${providerModeLabel} · ${authLabel})`);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-background/90 p-6 text-sm text-foreground">
      <div className="relative w-full max-w-2xl rounded-2xl border bg-card/95 p-6 text-sm shadow-lg">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Configure provider</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              One connection, intentionally tuned for the selected auth and endpoint mode.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-input/60 text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <section className="grid gap-2">
            <label htmlFor="provider" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Provider
            </label>
            <div className="flex items-center gap-3">
              <select
                id="provider"
                value={provider}
                onChange={(event) => setProvider(event.currentTarget.value)}
                className={`${INPUT_CLASS} w-[260px]`}
              >
                <option value="vertex">Vertex AI</option>
                <option value="gemini">Gemini on Vertex AI</option>
              </select>
              <a
                href={docsLinks.docs}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Vertex AI provider docs {CHEVRON}
              </a>
            </div>
          </section>

          <section className="grid gap-2">
            <label htmlFor="provider-name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="provider-name"
              className={INPUT_CLASS}
              value={providerName}
              onChange={(event) => setProviderName(event.currentTarget.value)}
              placeholder="Enter provider label"
            />
            <span className="text-xs text-muted-foreground">
              Display name for this provider entry.
            </span>
          </section>

          <section className="grid gap-2">
            <label className="text-sm font-medium">Connector mode</label>
            <SegmentedChoice<ProviderMode>
              options={[
                { value: 'standard', label: 'Standard Vertex AI' },
                { value: 'express', label: 'Vertex AI express mode' },
              ]}
              value={providerMode}
              onValueChange={handleProviderModeChange}
            />
            <p className="text-xs text-muted-foreground">{providerModeCopy}</p>
          </section>

          <section className="grid gap-4">
            <fieldset className="grid gap-1.5">
              <legend className="text-sm font-medium">Authentication</legend>
              <div className="flex flex-wrap gap-3">
                {!isExpress ? (
                  <>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={authMode === 'access_token'}
                        onChange={() => setAuthMode('access_token')}
                      />
                      Access Token
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={authMode === 'credential_json'}
                        onChange={() => setAuthMode('credential_json')}
                      />
                      Credential JSON
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={authMode === 'api_key'}
                        onChange={() => setAuthMode('api_key')}
                      />
                      API Key
                    </label>
                  </>
                ) : (
                  <span className="rounded-md border border-dashed px-2 py-1 text-sm text-muted-foreground">
                    Authentication: API Key
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{authHelpText}</p>
              <label htmlFor="credential-value" className="text-sm font-medium">
                {authLabel}
              </label>
              {renderedAuthInput}
            </fieldset>

            {!isExpress ? (
              <>
                <section className="grid gap-2">
                  <label htmlFor="project-id" className="text-sm font-medium">
                    Project
                  </label>
                  <input
                    id="project-id"
                    value={project}
                    onChange={(event) => setProject(event.currentTarget.value)}
                    placeholder="project-id"
                    className={INPUT_CLASS}
                  />
                  <span className="text-xs text-muted-foreground">Google Cloud project ID.</span>
                </section>

                <section className="grid gap-2">
                  <label htmlFor="location" className="text-sm font-medium">
                    Location
                  </label>
                  <input
                    id="location"
                    value={location}
                    onChange={(event) => setLocation(event.currentTarget.value)}
                    placeholder="us-central1 or global"
                    className={INPUT_CLASS}
                  />
                  <span className="text-xs text-muted-foreground">
                    Regional endpoint location or global for supported Generative AI usage.
                  </span>
                </section>
                <p className="text-xs text-muted-foreground">
                  Derived API base URL: <span className="font-medium text-foreground">{derivedBaseUrl}</span>
                </p>
              </>
            ) : null}

            <section className="grid gap-2 rounded-md border border-border bg-muted/30 p-3">
              <p className="text-sm font-medium">Capabilities</p>
              <PillToggle checked={supportsStreaming} onToggle={setSupportsStreaming}>
                This endpoint supports streaming
              </PillToggle>
              <PillToggle checked={includeDefaultRegistry} onToggle={setIncludeDefaultRegistry}>
                Include the default registry of Vertex AI models
              </PillToggle>
              <p className="text-xs text-muted-foreground">
                Duplicate model IDs may still appear and be resolved through your routing policy.
              </p>
            </section>

            <button
              type="button"
              onClick={() => toggleEditor('headers')}
              className={`rounded-md text-left ${
                openEditor === 'headers' ? 'border border-foreground/35 bg-muted/55' : ''
              }`}
              title="Edit headers"
            >
              <SummaryRow label="Headers" value={headerSummary} />
            </button>

            <button
              type="button"
              onClick={() => toggleEditor('models')}
              className={`rounded-md text-left ${
                openEditor === 'models' ? 'border border-foreground/35 bg-muted/55' : ''
              }`}
              title="Edit models"
            >
              <SummaryRow label="Model list" value={modelSummary} />
            </button>

            {openEditor === 'headers' ? (
              <section className="grid gap-2 rounded-md border border-border p-3">
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-sm font-medium">Headers</h3>
                  <button
                    type="button"
                    onClick={() => setOpenEditor(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Done
                  </button>
                </div>
                {headers.map((row, index) => (
                  <div key={`headers-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <input
                      className={INPUT_CLASS}
                      value={row.key}
                      placeholder="Header key"
                      onChange={(event) => updateHeader(index, 'key', event.currentTarget.value)}
                    />
                    <input
                      className={INPUT_CLASS}
                      value={row.value}
                      placeholder="Header value"
                      onChange={(event) => updateHeader(index, 'value', event.currentTarget.value)}
                    />
                    <button
                      type="button"
                      className="rounded border border-input px-2 text-sm text-muted-foreground"
                      onClick={() => removeHeaderRow(index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addHeaderRow}
                  className="mt-1 w-fit rounded border border-dashed border-input px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Add a header
                </button>
              </section>
            ) : null}

            {openEditor === 'models' ? (
              <section className="grid gap-2 rounded-md border border-border p-3">
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-sm font-medium">Models</h3>
                  <button
                    type="button"
                    onClick={() => setOpenEditor(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Done
                  </button>
                </div>
                {models.map((row, index) => (
                  <div key={`model-${index}`} className="grid grid-cols-[1fr_auto] gap-2">
                    <input
                      className={INPUT_CLASS}
                      value={row.value}
                      placeholder="publisher/model or tuned endpoint resource"
                      onChange={(event) => updateModel(index, event.currentTarget.value)}
                    />
                    <button
                      type="button"
                      className="rounded border border-input px-2 text-sm text-muted-foreground"
                      onClick={() => removeModelRow(index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addModelRow}
                  className="mt-1 w-fit rounded border border-dashed border-input px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Add a model
                </button>
              </section>
            ) : null}
          </section>

          <footer className="mt-2 flex items-center justify-between border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">{resultMessage}</p>
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            >
              Save
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
