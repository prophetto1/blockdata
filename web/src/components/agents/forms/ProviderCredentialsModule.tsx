import { useEffect, useMemo, useState } from 'react';
import { NumberInput } from '@ark-ui/react/number-input';
import { Slider } from '@ark-ui/react/slider';
import { toast } from 'sonner';
import { IconDeviceFloppy, IconPlugConnected } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { edgeJson } from '@/lib/edge';
import { PROVIDERS } from '@/components/agents/providerRegistry';

type TestStatus = 'idle' | 'testing' | 'valid' | 'invalid';
const DEFAULT_MAX_TOKENS = 4096;

export function ProviderCredentialsModule({
  provider,
  providerKeyInfo,
  onReload,
}: {
  provider: string;
  providerKeyInfo: {
    key_suffix: string;
    is_valid: boolean | null;
    base_url: string | null;
    default_model?: string;
    default_temperature?: number;
    default_max_tokens?: number;
  } | null;
  onReload: () => Promise<void>;
}) {
  const providerDef = useMemo(() => PROVIDERS.find((p) => p.id === provider), [provider]);
  const modelOptions = useMemo(() => providerDef?.models ?? [], [providerDef]);

  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(providerKeyInfo?.base_url ?? '');
  const [model, setModel] = useState(
    providerKeyInfo?.default_model ?? modelOptions[0]?.value ?? '',
  );
  const [temperature, setTemperature] = useState(providerKeyInfo?.default_temperature ?? 0.3);
  const [maxTokens, setMaxTokens] = useState(providerKeyInfo?.default_max_tokens ?? DEFAULT_MAX_TOKENS);

  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testError, setTestError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState(false);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setApiKey('');
    setTestStatus('idle');
    setTestError(null);
    setBaseUrl(providerKeyInfo?.base_url ?? '');
    setModel(providerKeyInfo?.default_model ?? modelOptions[0]?.value ?? '');
    setTemperature(providerKeyInfo?.default_temperature ?? 0.3);
    setMaxTokens(providerKeyInfo?.default_max_tokens ?? DEFAULT_MAX_TOKENS);
  }, [provider, providerKeyInfo, modelOptions]);

  const existingSuffix = providerKeyInfo?.key_suffix?.trim() || '';
  const hasExistingKey = existingSuffix.length === 4;
  const hasBaseUrlField = provider === 'custom';
  const requiresBaseUrl = provider === 'custom';

  const canTest = apiKey.trim().length > 0 && (!requiresBaseUrl || baseUrl.trim().length > 0);

  const hasDefaultsChanged =
    providerKeyInfo != null &&
    (model !== (providerKeyInfo.default_model ?? '') ||
      temperature !== (providerKeyInfo.default_temperature ?? 0.3) ||
      maxTokens !== (providerKeyInfo.default_max_tokens ?? DEFAULT_MAX_TOKENS) ||
      (hasBaseUrlField && (baseUrl.trim() || null) !== (providerKeyInfo.base_url ?? null)));

  const handleTest = async () => {
    if (!canTest) return;
    setTestStatus('testing');
    setTestError(null);
    try {
      const result = await edgeJson<{ valid: boolean; error?: string }>('test-api-key', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          api_key: apiKey.trim(),
          ...(hasBaseUrlField ? { base_url: baseUrl.trim() || null } : {}),
        }),
      });
      if (result.valid) {
        setTestStatus('valid');
      } else {
        setTestStatus('invalid');
        setTestError(result.error ?? 'Key validation failed');
      }
    } catch (e) {
      setTestStatus('invalid');
      setTestError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return;
    if (requiresBaseUrl && !baseUrl.trim()) {
      toast.warning('Custom provider requires a base URL.');
      return;
    }

    setSavingKey(true);
    try {
      await edgeJson('user-api-keys', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          api_key: apiKey.trim(),
          default_model: model,
          default_temperature: temperature,
          default_max_tokens: maxTokens,
          ...(hasBaseUrlField ? { base_url: baseUrl.trim() || null } : {}),
        }),
      });
      setApiKey('');
      setTestStatus('idle');
      setTestError(null);
      await onReload();
      toast.success('Saved API key and provider defaults.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingKey(false);
    }
  };

  const handleSaveDefaults = async () => {
    if (!providerKeyInfo) {
      toast.warning('Save an API key first, then update defaults.');
      return;
    }

    setSavingDefaults(true);
    try {
      await edgeJson('user-api-keys', {
        method: 'PATCH',
        body: JSON.stringify({
          provider,
          default_model: model,
          default_temperature: temperature,
          default_max_tokens: maxTokens,
          ...(hasBaseUrlField ? { base_url: baseUrl.trim() || null } : {}),
        }),
      });
      await onReload();
      toast.success('Saved provider defaults.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingDefaults(false);
    }
  };

  const handleDeleteKey = async () => {
    setDeleting(true);
    try {
      await edgeJson('user-api-keys', {
        method: 'DELETE',
        body: JSON.stringify({ provider }),
      });
      setApiKey('');
      setTestStatus('idle');
      setTestError(null);
      await onReload();
      toast.success('Removed API key.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(false);
    }
  };

  const inputClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border p-4">
        <span className="mb-1.5 block font-semibold">API key</span>
        {hasExistingKey && (
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Saved key ending in {existingSuffix}</span>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleDeleteKey} disabled={deleting}>
              {deleting && <div className="mr-1.5 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              Remove
            </Button>
          </div>
        )}
        <div className="flex items-end gap-1.5">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <label className="text-sm font-medium">New API key</label>
            <input
              type="password"
              className={inputClass}
              placeholder={providerDef?.keyPlaceholder ?? 'Paste API key...'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.currentTarget.value);
                setTestStatus('idle');
                setTestError(null);
              }}
            />
          </div>
          <Button variant="secondary" onClick={handleTest} disabled={!canTest || testStatus === 'testing'} title="Send a minimal API call to verify the key">
            {testStatus === 'testing' && <div className="mr-1.5 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            <IconPlugConnected size={16} />
            {testStatus === 'valid' ? 'Valid' : testStatus === 'invalid' ? 'Failed' : 'Test'}
          </Button>
          <Button onClick={handleSaveKey} disabled={savingKey || !apiKey.trim() || (provider === 'custom' && !baseUrl.trim())}>
            {savingKey && <div className="mr-1.5 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            Save key
          </Button>
        </div>
        {testStatus === 'valid' && <span className="mt-1 block text-xs text-green-600 dark:text-green-400">Key verified.</span>}
        {testStatus === 'invalid' && testError && <span className="mt-1 block text-xs text-destructive">{testError}</span>}
      </div>

      {hasBaseUrlField && (
        <div className="rounded-md border p-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Base URL {requiresBaseUrl && <span className="text-destructive">*</span>}</label>
            <span className="text-xs text-muted-foreground">OpenAI-compatible endpoint (for example: http://localhost:1234/v1)</span>
            <input
              type="text"
              className={inputClass}
              placeholder="https://your-endpoint.example.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.currentTarget.value)}
            />
          </div>
        </div>
      )}

      <div className="rounded-md border p-4">
        <span className="mb-1 block font-semibold">Provider defaults</span>
        <span className="mb-3 block text-xs text-muted-foreground">
          Used when run config does not override model parameters.
        </span>
        <div className="flex flex-col gap-3">
          {modelOptions.length > 0 ? (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Default model</label>
              <select
                className={inputClass}
                value={model}
                onChange={(e) => setModel(e.currentTarget.value)}
              >
                {modelOptions.map((opt) => {
                  const value = typeof opt === 'string' ? opt : opt.value;
                  const label = typeof opt === 'string' ? opt : opt.label;
                  return <option key={value} value={value}>{label}</option>;
                })}
              </select>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Default model</label>
              <input
                type="text"
                className={inputClass}
                placeholder="model-name"
                value={model}
                onChange={(e) => setModel(e.currentTarget.value)}
              />
            </div>
          )}

          <div>
            <span className="mb-1 block text-sm">Temperature: {temperature.toFixed(1)}</span>
            <Slider.Root
              min={0}
              max={1}
              step={0.1}
              value={[temperature]}
              onValueChange={(details) => setTemperature(details.value[0])}
            >
              <Slider.Control className="relative flex h-6 w-full items-center">
                <Slider.Track className="h-2 w-full rounded-full bg-muted">
                  <Slider.Range className="h-full rounded-full bg-primary" />
                </Slider.Track>
                <Slider.Thumb index={0} className="block h-5 w-5 rounded-full border-2 border-primary bg-background shadow">
                  <Slider.HiddenInput />
                </Slider.Thumb>
              </Slider.Control>
              <Slider.MarkerGroup className="mt-1 flex justify-between text-xs text-muted-foreground">
                <Slider.Marker value={0}>0</Slider.Marker>
                <Slider.Marker value={0.3}>0.3</Slider.Marker>
                <Slider.Marker value={1}>1.0</Slider.Marker>
              </Slider.MarkerGroup>
            </Slider.Root>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Max tokens</label>
            <NumberInput.Root
              min={100}
              max={8000}
              step={100}
              value={String(maxTokens)}
              onValueChange={(details) => {
                if (typeof details.valueAsNumber === 'number' && !Number.isNaN(details.valueAsNumber)) {
                  setMaxTokens(details.valueAsNumber);
                }
              }}
            >
              <NumberInput.Control className="relative">
                <NumberInput.Input className="h-9 w-full rounded-md border border-input bg-background px-3 pr-10 text-sm text-foreground" />
                <div className="absolute inset-y-0 right-1 flex items-center gap-1">
                  <NumberInput.DecrementTrigger className="h-6 w-4 rounded border border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                    -
                  </NumberInput.DecrementTrigger>
                  <NumberInput.IncrementTrigger className="h-6 w-4 rounded border border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                    +
                  </NumberInput.IncrementTrigger>
                </div>
              </NumberInput.Control>
            </NumberInput.Root>
          </div>
        </div>
        <div className="my-3 h-px bg-border" />
        <div className="flex justify-end">
          <Button variant="secondary" onClick={handleSaveDefaults} disabled={savingDefaults || !hasDefaultsChanged}>
            {savingDefaults && <div className="mr-1.5 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            <IconDeviceFloppy size={16} />
            Save defaults
          </Button>
        </div>
      </div>
    </div>
  );
}
