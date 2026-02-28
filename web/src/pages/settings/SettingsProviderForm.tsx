import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Field } from '@ark-ui/react/field';
import { NumberInput } from '@ark-ui/react/number-input';
import { PasswordInput } from '@ark-ui/react/password-input';
import { Select, createListCollection } from '@ark-ui/react/select';
import { Slider } from '@ark-ui/react/slider';
import { Tooltip } from '@ark-ui/react/tooltip';
import {
  IconBrain,
  IconChevronLeft,
  IconCheck,
  IconChevronDown,
  IconCloud,
  IconDeviceFloppy,
  IconEye,
  IconEyeOff,
  IconKey,
  IconMinus,
  IconPlugConnected,
  IconPlus,
  IconRocket,
  IconSearch,
  IconServer,
  IconVectorTriangle,
  IconX,
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { edgeJson } from '@/lib/edge';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { UserApiKeyRow } from '@/lib/types';
import { SettingsPageFrame } from './SettingsPageHeader';

type ModelPurpose = 'chat' | 'extraction' | 'embedding' | 'parsing' | 'reasoning';

type ProviderModelOption = {
  value: string;
  label: string;
  purposes?: ModelPurpose[];
};

type ProviderDef = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  models?: ProviderModelOption[];
  keyPlaceholder?: string;
  keyHelpUrl?: string;
  defaultModel?: string;
};

export const PROVIDERS: ProviderDef[] = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    description: 'Claude models — chat, extraction, reasoning',
    icon: <IconBrain size={20} />,
    enabled: true,
    models: [
      { value: 'claude-opus-4-6', label: 'Claude Opus 4.6 — most capable', purposes: ['chat', 'extraction', 'reasoning'] },
      { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5 — balanced (default)', purposes: ['chat', 'extraction'] },
      { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 — fastest', purposes: ['chat', 'extraction'] },
    ],
    keyPlaceholder: 'sk-ant-api03-...',
    keyHelpUrl: 'https://console.anthropic.com/settings/keys',
    defaultModel: 'claude-sonnet-4-5-20250929',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'GPT, reasoning, and embedding models',
    icon: <IconCloud size={20} />,
    enabled: true,
    models: [
      { value: 'gpt-4.1', label: 'GPT-4.1 — most capable', purposes: ['chat', 'extraction'] },
      { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini — balanced (default)', purposes: ['chat', 'extraction'] },
      { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano — fastest', purposes: ['chat'] },
      { value: 'o3', label: 'o3 — reasoning', purposes: ['reasoning'] },
      { value: 'o4-mini', label: 'o4-mini — reasoning, faster', purposes: ['reasoning'] },
      { value: 'text-embedding-3-small', label: 'text-embedding-3-small — 1536d', purposes: ['embedding'] },
      { value: 'text-embedding-3-large', label: 'text-embedding-3-large — 3072d', purposes: ['embedding'] },
    ],
    keyPlaceholder: 'sk-...',
    keyHelpUrl: 'https://platform.openai.com/api-keys',
    defaultModel: 'gpt-4.1-mini',
  },
  {
    id: 'google',
    label: 'Google AI',
    description: 'Gemini and embedding models',
    icon: <IconCloud size={20} />,
    enabled: true,
    models: [
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro — most capable', purposes: ['chat', 'extraction', 'parsing'] },
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash — balanced (default)', purposes: ['chat', 'extraction', 'parsing'] },
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash — fastest', purposes: ['chat', 'parsing'] },
      { value: 'text-embedding-004', label: 'text-embedding-004 — 768d', purposes: ['embedding'] },
    ],
    keyPlaceholder: 'AIza...',
    keyHelpUrl: 'https://aistudio.google.com/apikey',
    defaultModel: 'gemini-2.5-flash',
  },
  {
    id: 'voyage',
    label: 'Voyage AI',
    description: 'Dedicated embedding models',
    icon: <IconRocket size={20} />,
    enabled: true,
    models: [
      { value: 'voyage-3-large', label: 'voyage-3-large — 1024d (default)', purposes: ['embedding'] },
      { value: 'voyage-3-lite', label: 'voyage-3-lite — 512d, fastest', purposes: ['embedding'] },
      { value: 'voyage-code-3', label: 'voyage-code-3 — code-optimized', purposes: ['embedding'] },
    ],
    keyPlaceholder: 'pa-...',
    keyHelpUrl: 'https://dash.voyageai.com/api-keys',
    defaultModel: 'voyage-3-large',
  },
  {
    id: 'cohere',
    label: 'Cohere',
    description: 'Embeddings and reranking',
    icon: <IconSearch size={20} />,
    enabled: true,
    models: [
      { value: 'embed-v4.0', label: 'Embed v4.0 — latest (default)', purposes: ['embedding'] },
      { value: 'embed-multilingual-v3.0', label: 'Embed Multilingual v3.0', purposes: ['embedding'] },
      { value: 'rerank-v3.5', label: 'Rerank v3.5', purposes: [] },
    ],
    keyPlaceholder: 'co-...',
    keyHelpUrl: 'https://dashboard.cohere.com/api-keys',
    defaultModel: 'embed-v4.0',
  },
  {
    id: 'jina',
    label: 'Jina AI',
    description: 'Embeddings and reranking',
    icon: <IconVectorTriangle size={20} />,
    enabled: true,
    models: [
      { value: 'jina-embeddings-v3', label: 'jina-embeddings-v3 — 1024d (default)', purposes: ['embedding'] },
      { value: 'jina-reranker-v2-base-multilingual', label: 'jina-reranker-v2 — reranking', purposes: [] },
    ],
    keyPlaceholder: 'jina_...',
    keyHelpUrl: 'https://jina.ai/api-key',
    defaultModel: 'jina-embeddings-v3',
  },
  {
    id: 'custom',
    label: 'Custom / Self-hosted',
    description: 'OpenAI-compatible endpoint',
    icon: <IconServer size={20} />,
    enabled: true,
    keyPlaceholder: 'Your API key...',
    defaultModel: '',
  },
];

type TestStatus = 'idle' | 'testing' | 'valid' | 'invalid';
type InlineStatus = {
  kind: 'success' | 'error' | 'info';
  message: string;
};

const USER_KEY_COLUMNS =
  'id, user_id, provider, key_suffix, is_valid, default_model, default_temperature, default_max_tokens, base_url, created_at, updated_at';
const DEFAULT_MAX_TOKENS = 4096;

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring';

const numberTriggerClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function getProviderAccentClasses(enabled: boolean) {
  return enabled
    ? 'border-border bg-muted text-foreground'
    : 'border-border bg-muted text-muted-foreground';
}

export default function SettingsProviderForm() {
  const navigate = useNavigate();
  const { providerId } = useParams<{ providerId: string }>();
  const provider = PROVIDERS.find((p) => p.id === providerId) ?? PROVIDERS[0];

  const [keyMap, setKeyMap] = useState<Record<string, UserApiKeyRow | null>>({});
  const [loading, setLoading] = useState(true);

  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(provider.defaultModel ?? '');
  const [temperature, setTemperature] = useState(0.3);
  const [maxTokens, setMaxTokens] = useState(DEFAULT_MAX_TOKENS);
  const [baseUrl, setBaseUrl] = useState('');

  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testError, setTestError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [status, setStatus] = useState<InlineStatus | null>(null);

  const modelCollection = useMemo(
    () => createListCollection<ProviderModelOption>({ items: provider.models ?? [] }),
    [provider.models],
  );

  useEffect(() => {
    supabase
      .from(TABLES.userApiKeys)
      .select(USER_KEY_COLUMNS)
      .then(({ data }) => {
        const map: Record<string, UserApiKeyRow | null> = {};
        for (const p of PROVIDERS) map[p.id] = null;

        if (data) {
          for (const row of data as UserApiKeyRow[]) {
            map[row.provider] = row;
          }
        }

        setKeyMap(map);
        setLoading(false);
      });
  }, []);

  // Sync form state when provider changes (route navigation)
  useEffect(() => {
    const row = keyMap[provider.id];

    setApiKey('');
    setTestStatus('idle');
    setTestError(null);
    setStatus(null);

    if (row) {
      setModel(row.default_model);
      setTemperature(row.default_temperature);
      setMaxTokens(row.default_max_tokens);
      setBaseUrl(row.base_url ?? '');
      return;
    }

    setModel(provider.defaultModel ?? '');
    setTemperature(0.3);
    setMaxTokens(DEFAULT_MAX_TOKENS);
    setBaseUrl('');
  }, [provider.id, keyMap]);

  const existing = keyMap[provider.id] ?? null;

  const handleTest = async () => {
    setStatus(null);
    if (!apiKey.trim()) {
      setStatus({ kind: 'error', message: `Paste your ${provider.label} API key first.` });
      return;
    }

    if (provider.id === 'custom' && !baseUrl.trim()) {
      setStatus({ kind: 'error', message: 'Custom provider requires a base URL.' });
      return;
    }

    setTestStatus('testing');
    setTestError(null);

    try {
      const result = await edgeJson<{ valid: boolean; error?: string }>('test-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey.trim(),
          provider: provider.id,
          ...(provider.id === 'custom' ? { base_url: baseUrl.trim() } : {}),
        }),
      });

      setTestStatus(result.valid ? 'valid' : 'invalid');
      if (!result.valid) {
        setTestError(result.error ?? 'Key validation failed');
      }
    } catch (e) {
      setTestStatus('invalid');
      setTestError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleSaveKey = async () => {
    setStatus(null);
    if (!apiKey.trim()) return;

    if (provider.id === 'custom' && !baseUrl.trim()) {
      setStatus({ kind: 'error', message: 'Custom provider requires a base URL.' });
      return;
    }

    setSaving(true);
    try {
      await edgeJson<{ ok: boolean; key_suffix?: string }>('user-api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: provider.id,
          api_key: apiKey.trim(),
          default_model: model,
          default_temperature: temperature,
          default_max_tokens: maxTokens,
          ...(provider.id === 'custom' ? { base_url: baseUrl.trim() } : {}),
        }),
      });

      const { data } = await supabase
        .from(TABLES.userApiKeys)
        .select(USER_KEY_COLUMNS)
        .eq('provider', provider.id)
        .maybeSingle();

      if (data) {
        const row = data as UserApiKeyRow;
        setKeyMap((prev) => ({ ...prev, [provider.id]: row }));
        setModel(row.default_model);
        setTemperature(row.default_temperature);
        setMaxTokens(row.default_max_tokens);
        setBaseUrl(row.base_url ?? '');
      }

      setApiKey('');
      setStatus({ kind: 'success', message: 'API key and defaults saved.' });
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDefaults = async () => {
    setStatus(null);
    setSavingDefaults(true);
    try {
      await edgeJson<{ ok: boolean }>('user-api-keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: provider.id,
          default_model: model,
          default_temperature: temperature,
          default_max_tokens: maxTokens,
          ...(provider.id === 'custom' ? { base_url: baseUrl.trim() } : {}),
        }),
      });

      if (existing) {
        setKeyMap((prev) => ({
          ...prev,
          [provider.id]: {
            ...existing,
            default_model: model,
            default_temperature: temperature,
            default_max_tokens: maxTokens,
            base_url: provider.id === 'custom' ? baseUrl.trim() || null : existing.base_url,
          },
        }));
      }

      setStatus({ kind: 'success', message: 'Model defaults updated.' });
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setSavingDefaults(false);
    }
  };

  const handleDeleteKey = async () => {
    setStatus(null);
    try {
      await edgeJson<{ ok: boolean }>('user-api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: provider.id }),
      });

      setKeyMap((prev) => ({ ...prev, [provider.id]: null }));
      setApiKey('');
      setModel(provider.defaultModel ?? '');
      setTemperature(0.3);
      setMaxTokens(DEFAULT_MAX_TOKENS);
      setBaseUrl('');
      setTestStatus('idle');

      setStatus({ kind: 'success', message: 'API key deleted.' });
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const hasKeyChanged = apiKey.trim().length > 0;
  const hasDefaultsChanged =
    existing != null &&
    (model !== existing.default_model ||
      temperature !== existing.default_temperature ||
      maxTokens !== existing.default_max_tokens ||
      (provider.id === 'custom' && (baseUrl.trim() || null) !== (existing.base_url ?? null)));

  if (loading) return null;

  return (
    <SettingsPageFrame
      title={provider.label}
      description={provider.description}
      headerAction={(
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs"
          onClick={() => navigate('/app/settings/ai')}
        >
          <IconChevronLeft size={14} />
          Back
        </Button>
      )}
    >
      {status && (
        <div
          className={cn(
            'mb-4 rounded-md border px-3 py-2 text-sm',
            status.kind === 'success'
              ? 'border-border bg-muted text-foreground'
              : status.kind === 'info'
                ? 'border-border bg-muted text-foreground'
                : 'border-border bg-muted text-foreground',
          )}
          role="status"
          aria-live="polite"
        >
          {status.message}
        </div>
      )}
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <div
          className={cn(
            'inline-flex h-10 w-10 items-center justify-center rounded-md border',
            getProviderAccentClasses(provider.enabled),
          )}
        >
          {provider.icon}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">{provider.label}</h2>
          <p className="text-xs text-muted-foreground">{provider.description}</p>
        </div>

        {existing && (
          <Badge
            variant="gray"
            size="sm"
            className="ml-auto inline-flex items-center gap-1.5"
          >
            {existing.is_valid === true ? (
              <IconCheck size={12} />
            ) : existing.is_valid === false ? (
              <IconX size={12} />
            ) : (
              <IconKey size={12} />
            )}
            {existing.is_valid === true
              ? 'Connected'
              : existing.is_valid === false
                ? 'Invalid'
                : `Key ....${existing.key_suffix}`}
          </Badge>
        )}
      </div>

      <section className="rounded-md bg-transparent p-0">
        <h3 className="mb-2 text-sm font-medium text-foreground">API Key</h3>

        {existing && !hasKeyChanged && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <code className="text-sm text-muted-foreground">{`${'*'.repeat(20)}${existing.key_suffix}`}</code>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={handleDeleteKey}>
              Remove
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <PasswordInput.Root className="min-w-0 flex-1">
            <PasswordInput.Control className="relative flex items-center">
              <PasswordInput.Input
                className={cn(inputClass, 'pr-10')}
                placeholder={existing ? 'Enter new key to replace' : (provider.keyPlaceholder ?? 'Paste API key...')}
                value={apiKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setApiKey(e.currentTarget.value);
                  setTestStatus('idle');
                  setTestError(null);
                }}
              />
              <PasswordInput.VisibilityTrigger className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground">
                <PasswordInput.Indicator fallback={<IconEyeOff size={16} />}>
                  <IconEye size={16} />
                </PasswordInput.Indicator>
              </PasswordInput.VisibilityTrigger>
            </PasswordInput.Control>
          </PasswordInput.Root>

          <Tooltip.Root openDelay={250} closeDelay={100}>
            <Tooltip.Trigger asChild>
              <Button
                type="button"
                variant={testStatus === 'idle' ? 'outline' : 'default'}
                onClick={handleTest}
                disabled={
                  testStatus === 'testing' ||
                  !apiKey.trim() ||
                  (provider.id === 'custom' && !baseUrl.trim())
                }
                className={cn('gap-1.5 sm:min-w-24')}
              >
                <IconPlugConnected size={16} />
                {testStatus === 'testing'
                  ? 'Testing...'
                  : testStatus === 'valid'
                    ? 'Valid'
                    : testStatus === 'invalid'
                      ? 'Failed'
                      : 'Test'}
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Positioner>
              <Tooltip.Content className="z-50 max-w-xs rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md">
                Send a minimal API call to verify the key
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>
        </div>

        {testStatus === 'valid' && (
          <p className="mt-1 text-xs text-muted-foreground">Key verified - connection successful.</p>
        )}
        {testStatus === 'invalid' && testError && (
          <p className="mt-1 text-xs text-muted-foreground">{testError}</p>
        )}

        {provider.keyHelpUrl && (
          <p className="mt-2 text-xs text-muted-foreground">
            Your key is stored securely and used only for processing your documents. Get a key at{' '}
            <a
              href={provider.keyHelpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline"
            >
              {new URL(provider.keyHelpUrl).hostname}
            </a>
          </p>
        )}
      </section>

      {provider.id === 'custom' && (
        <section className="mt-4 rounded-md bg-transparent p-0">
          <Field.Root required>
            <Field.Label className="mb-1.5 text-sm font-medium text-foreground">Base URL</Field.Label>
            <Input
              placeholder="https://your-endpoint.example.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.currentTarget.value)}
              required
            />
            <Field.HelperText className="mt-1 text-xs text-muted-foreground">
              OpenAI-compatible API endpoint (e.g., http://localhost:1234/v1)
            </Field.HelperText>
          </Field.Root>
        </section>
      )}

      <div className="my-5 h-px w-full bg-border" />

      <h3 className="text-sm font-medium text-foreground">Model Defaults</h3>
      <p className="mb-3 mt-1 text-xs text-muted-foreground">
        Applied when a schema&apos;s prompt_config does not specify its own model or parameters.
      </p>

      <div className="space-y-4">
        {provider.models && provider.models.length > 0 ? (
          <Field.Root>
            <Field.Label className="mb-1.5 text-sm font-medium text-foreground">Model</Field.Label>
            <Select.Root
              collection={modelCollection}
              value={model ? [model] : []}
              onValueChange={(details) => {
                const next = details.value[0];
                if (next) setModel(next);
              }}
              positioning={{
                placement: 'bottom-start',
                sameWidth: true,
                offset: { mainAxis: 6 },
                strategy: 'fixed',
              }}
            >
              <Select.Control className="relative">
                <Select.Trigger className={cn(inputClass, 'flex items-center justify-between')}>
                  <Select.ValueText className="truncate text-left" placeholder="Select model" />
                  <Select.Indicator className="ml-2 shrink-0 text-muted-foreground">
                    <IconChevronDown size={16} />
                  </Select.Indicator>
                </Select.Trigger>
              </Select.Control>
              <Select.Positioner className="z-50">
                <Select.Content className="max-h-64 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
                  {modelCollection.items.map((item) => (
                    <Select.Item
                      key={item.value}
                      item={item}
                      className={cn(
                        'flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-sm text-popover-foreground',
                        'data-[state=checked]:bg-accent data-[state=checked]:font-medium',
                        'data-[highlighted]:bg-accent data-[highlighted]:outline-none',
                      )}
                    >
                      <Select.ItemText>{item.label}</Select.ItemText>
                      <Select.ItemIndicator>
                        <IconCheck size={14} />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
              <Select.HiddenSelect name="settings-provider-model" />
            </Select.Root>
          </Field.Root>
        ) : (
          <Field.Root>
            <Field.Label className="mb-1.5 text-sm font-medium text-foreground">Model</Field.Label>
            <Input
              placeholder="model-name"
              value={model}
              onChange={(e) => setModel(e.currentTarget.value)}
            />
            <Field.HelperText className="mt-1 text-xs text-muted-foreground">
              Enter the model identifier (e.g., llama-3.1-70b)
            </Field.HelperText>
          </Field.Root>
        )}

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Temperature</span>
            <span className="text-sm text-muted-foreground">{temperature.toFixed(1)}</span>
          </div>

          <Slider.Root
            min={0}
            max={1}
            step={0.1}
            value={[temperature]}
            onValueChange={(details) => {
              const next = details.value[0];
              if (typeof next === 'number') setTemperature(next);
            }}
            className="w-full"
          >
            <Slider.Control className="relative flex h-6 w-full items-center">
              <Slider.Track className="h-2 w-full rounded-full bg-muted">
                <Slider.Range className="h-full rounded-full bg-primary" />
              </Slider.Track>
              <Slider.Thumb
                index={0}
                className="block h-4 w-4 rounded-full border border-border bg-background shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Slider.HiddenInput />
              </Slider.Thumb>
            </Slider.Control>
            <Slider.MarkerGroup className="mt-1 flex justify-between text-xs text-muted-foreground">
              <Slider.Marker value={0}>0</Slider.Marker>
              <Slider.Marker value={0.3}>0.3</Slider.Marker>
              <Slider.Marker value={1}>1.0</Slider.Marker>
            </Slider.MarkerGroup>
          </Slider.Root>

          <p className="mt-1 text-xs text-muted-foreground">
            Lower values produce more deterministic, consistent annotations.
          </p>
        </div>

        <Field.Root>
          <Field.Label className="mb-1.5 text-sm font-medium text-foreground">Max tokens per block</Field.Label>
          <NumberInput.Root
            min={100}
            max={8000}
            step={100}
            value={String(maxTokens)}
            onValueChange={({ valueAsNumber }) => {
              if (Number.isFinite(valueAsNumber)) {
                setMaxTokens(valueAsNumber);
              }
            }}
          >
            <NumberInput.Control className="relative">
              <NumberInput.Input className={cn(inputClass, 'pr-22')} />
              <div className="absolute inset-y-1 right-1 flex items-center gap-1">
                <NumberInput.DecrementTrigger className={numberTriggerClass} aria-label="Decrease max tokens">
                  <IconMinus size={14} />
                </NumberInput.DecrementTrigger>
                <NumberInput.IncrementTrigger className={numberTriggerClass} aria-label="Increase max tokens">
                  <IconPlus size={14} />
                </NumberInput.IncrementTrigger>
              </div>
            </NumberInput.Control>
          </NumberInput.Root>
          <Field.HelperText className="mt-1 text-xs text-muted-foreground">
            Maximum output length for each block processed by the AI.
          </Field.HelperText>
        </Field.Root>
      </div>

      <div className="my-5 h-px w-full bg-border" />

      <div className="flex justify-end gap-2">
        {hasKeyChanged && (
          <Button type="button" onClick={handleSaveKey} disabled={saving} className="gap-1.5">
            <IconDeviceFloppy size={16} />
            {saving
              ? 'Saving...'
              : existing
                ? 'Replace Key & Save'
                : 'Save Key & Defaults'}
          </Button>
        )}

        {!hasKeyChanged && hasDefaultsChanged && (
          <Button type="button" onClick={handleSaveDefaults} disabled={savingDefaults} variant="outline" className="gap-1.5">
            <IconDeviceFloppy size={16} />
            {savingDefaults ? 'Saving...' : 'Save Defaults'}
          </Button>
        )}
      </div>
    </SettingsPageFrame>
  );
}
