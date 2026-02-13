import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  Text,
  Group,
  Stack,
  Button,
  PasswordInput,
  TextInput,
  Select,
  Slider,
  NumberInput,
  Badge,
  ThemeIcon,
  Paper,
  Divider,
  Tooltip,
  NavLink,
  Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconX,
  IconKey,
  IconBrain,
  IconCloud,
  IconDeviceFloppy,
  IconPlugConnected,
  IconServer,
} from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { edgeJson } from '@/lib/edge';
import { PageHeader } from '@/components/common/PageHeader';
import type { UserApiKeyRow } from '@/lib/types';

/* ------------------------------------------------------------------ */
/*  Provider registry — add a new entry here to surface a provider    */
/* ------------------------------------------------------------------ */

type ProviderDef = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  enabled: boolean;
  models?: { value: string; label: string }[];
  keyPlaceholder?: string;
  keyHelpUrl?: string;
  defaultModel?: string;
};

const PROVIDERS: ProviderDef[] = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    description: 'Claude models',
    icon: <IconBrain size={20} />,
    color: 'violet',
    enabled: true,
    models: [
      { value: 'claude-opus-4-6', label: 'Claude Opus 4.6 — most capable' },
      { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5 — balanced (default)' },
      { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 — fastest' },
    ],
    keyPlaceholder: 'sk-ant-api03-...',
    keyHelpUrl: 'https://console.anthropic.com/settings/keys',
    defaultModel: 'claude-sonnet-4-5-20250929',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'GPT & reasoning models',
    icon: <IconCloud size={20} />,
    color: 'teal',
    enabled: true,
    models: [
      { value: 'gpt-4.1', label: 'GPT-4.1 — most capable' },
      { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini — balanced (default)' },
      { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano — fastest' },
      { value: 'o3', label: 'o3 — reasoning' },
      { value: 'o4-mini', label: 'o4-mini — reasoning, faster' },
    ],
    keyPlaceholder: 'sk-...',
    keyHelpUrl: 'https://platform.openai.com/api-keys',
    defaultModel: 'gpt-4.1-mini',
  },
  {
    id: 'google',
    label: 'Google AI',
    description: 'Gemini models',
    icon: <IconCloud size={20} />,
    color: 'blue',
    enabled: true,
    models: [
      { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro — most capable' },
      { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash — balanced (default)' },
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash — fastest' },
    ],
    keyPlaceholder: 'AIza...',
    keyHelpUrl: 'https://aistudio.google.com/apikey',
    defaultModel: 'gemini-2.5-flash',
  },
  {
    id: 'custom',
    label: 'Custom / Self-hosted',
    description: 'OpenAI-compatible endpoint',
    icon: <IconServer size={20} />,
    color: 'orange',
    enabled: true,
    keyPlaceholder: 'Your API key...',
    defaultModel: '',
  },
];

type TestStatus = 'idle' | 'testing' | 'valid' | 'invalid';

const USER_KEY_COLUMNS =
  'id, user_id, provider, key_suffix, is_valid, default_model, default_temperature, default_max_tokens, base_url, created_at, updated_at';
const DEFAULT_MAX_TOKENS = 4096;

export default function Settings() {
  const [selectedId, setSelectedId] = useState(PROVIDERS[0].id);
  const provider = PROVIDERS.find((p) => p.id === selectedId)!;

  // Keyed by provider id → DB row (null = no key saved)
  const [keyMap, setKeyMap] = useState<Record<string, UserApiKeyRow | null>>({});
  const [loading, setLoading] = useState(true);

  // Form state (scoped to selected provider)
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(provider.defaultModel ?? '');
  const [temperature, setTemperature] = useState(0.3);
  const [maxTokens, setMaxTokens] = useState(DEFAULT_MAX_TOKENS);
  const [baseUrl, setBaseUrl] = useState('');

  // Action state
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testError, setTestError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingDefaults, setSavingDefaults] = useState(false);

  // Load all saved keys on mount
  useEffect(() => {
    supabase
      .from('user_api_keys')
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

        // Initialise form from the first provider's saved row
        const first = map[PROVIDERS[0].id];
        if (first) {
          setModel(first.default_model);
          setTemperature(first.default_temperature);
          setMaxTokens(first.default_max_tokens);
          setBaseUrl(first.base_url ?? '');
        }
        setLoading(false);
      });
  }, []);

  // Sync form state when switching providers
  const handleSelectProvider = (id: string) => {
    setSelectedId(id);
    const p = PROVIDERS.find((x) => x.id === id)!;
    const row = keyMap[id];
    setApiKey('');
    setTestStatus('idle');
    setTestError(null);
    if (row) {
      setModel(row.default_model);
      setTemperature(row.default_temperature);
      setMaxTokens(row.default_max_tokens);
      setBaseUrl(row.base_url ?? '');
    } else {
      setModel(p.defaultModel ?? '');
      setTemperature(0.3);
      setMaxTokens(DEFAULT_MAX_TOKENS);
      setBaseUrl('');
    }
  };

  const existing = keyMap[selectedId] ?? null;

  /* ---- handlers (parameterised by selectedId) ---- */

  const handleTest = async () => {
    if (!apiKey.trim()) {
      notifications.show({ color: 'yellow', title: 'Enter a key', message: `Paste your ${provider.label} API key first.` });
      return;
    }
    if (selectedId === 'custom' && !baseUrl.trim()) {
      notifications.show({ color: 'yellow', title: 'Enter a base URL', message: 'Custom provider requires a base URL.' });
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
          provider: selectedId,
          ...(selectedId === 'custom' ? { base_url: baseUrl.trim() } : {}),
        }),
      });
      setTestStatus(result.valid ? 'valid' : 'invalid');
      if (!result.valid) setTestError(result.error ?? 'Key validation failed');
    } catch (e) {
      setTestStatus('invalid');
      setTestError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return;
    if (selectedId === 'custom' && !baseUrl.trim()) {
      notifications.show({ color: 'yellow', title: 'Enter a base URL', message: 'Custom provider requires a base URL.' });
      return;
    }
    setSaving(true);
    try {
      await edgeJson<{ ok: boolean; key_suffix?: string }>('user-api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedId,
          api_key: apiKey.trim(),
          default_model: model,
          default_temperature: temperature,
          default_max_tokens: maxTokens,
          ...(selectedId === 'custom' ? { base_url: baseUrl.trim() } : {}),
        }),
      });

      const { data } = await supabase
        .from('user_api_keys')
        .select(USER_KEY_COLUMNS)
        .eq('provider', selectedId)
        .maybeSingle();

      if (data) {
        const row = data as UserApiKeyRow;
        setKeyMap((prev) => ({ ...prev, [selectedId]: row }));
        setModel(row.default_model);
        setTemperature(row.default_temperature);
        setMaxTokens(row.default_max_tokens);
        setBaseUrl(row.base_url ?? '');
      }
      setApiKey('');
      notifications.show({ color: 'green', title: 'Saved', message: 'API key and defaults saved.' });
    } catch (e) {
      notifications.show({ color: 'red', title: 'Error', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDefaults = async () => {
    setSavingDefaults(true);
    try {
      await edgeJson<{ ok: boolean }>('user-api-keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedId,
          default_model: model,
          default_temperature: temperature,
          default_max_tokens: maxTokens,
          ...(selectedId === 'custom' ? { base_url: baseUrl.trim() } : {}),
        }),
      });
      if (existing) {
        setKeyMap((prev) => ({
          ...prev,
          [selectedId]: {
            ...existing,
            default_model: model,
            default_temperature: temperature,
            default_max_tokens: maxTokens,
            base_url: selectedId === 'custom' ? baseUrl.trim() || null : existing.base_url,
          },
        }));
      }
      notifications.show({ color: 'green', title: 'Saved', message: 'Model defaults updated.' });
    } catch (e) {
      notifications.show({ color: 'red', title: 'Error', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setSavingDefaults(false);
    }
  };

  const handleDeleteKey = async () => {
    try {
      await edgeJson<{ ok: boolean }>('user-api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedId }),
      });
      setKeyMap((prev) => ({ ...prev, [selectedId]: null }));
      setApiKey('');
      setModel(provider.defaultModel ?? '');
      setTemperature(0.3);
      setMaxTokens(DEFAULT_MAX_TOKENS);
      setBaseUrl('');
      setTestStatus('idle');
      notifications.show({ color: 'green', title: 'Removed', message: 'API key deleted.' });
    } catch (e) {
      notifications.show({ color: 'red', title: 'Error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const hasKeyChanged = apiKey.trim().length > 0;
  const hasDefaultsChanged =
    existing != null &&
    (model !== existing.default_model ||
      temperature !== existing.default_temperature ||
      maxTokens !== existing.default_max_tokens ||
      (selectedId === 'custom' && (baseUrl.trim() || null) !== (existing.base_url ?? null)));

  if (loading) return null;

  /* ================================================================ */
  /*  Render                                                          */
  /* ================================================================ */

  return (
    <>
      <PageHeader title="Settings" subtitle="Configure AI providers and model defaults." />
      <Group justify="flex-end" mb="md" maw={960}>
        <Button
          size="xs"
          variant="light"
          leftSection={<IconServer size={14} />}
          component={Link}
          to="/app/settings/superuser"
        >
          Superuser Controls
        </Button>
      </Group>

      <Group align="flex-start" gap="lg" wrap="nowrap" maw={960}>
        {/* ── Left column: provider list ── */}
        <Card withBorder radius="md" padding={0} w={240} style={{ flexShrink: 0 }}>
          <Text fw={600} size="xs" c="dimmed" tt="uppercase" px="md" pt="md" pb={4}>
            Providers
          </Text>
          {PROVIDERS.map((p) => {
            const row = keyMap[p.id];
            return (
              <NavLink
                key={p.id}
                label={p.label}
                description={p.enabled ? p.description : 'Coming soon'}
                leftSection={
                  <ThemeIcon size="sm" radius="sm" variant="light" color={p.enabled ? p.color : 'gray'}>
                    {p.icon}
                  </ThemeIcon>
                }
                rightSection={
                  row?.is_valid === true ? (
                    <Badge size="xs" variant="light" color="green" circle>
                      <IconCheck size={10} />
                    </Badge>
                  ) : row?.is_valid === false ? (
                    <Badge size="xs" variant="light" color="red" circle>
                      <IconX size={10} />
                    </Badge>
                  ) : null
                }
                active={selectedId === p.id}
                onClick={() => handleSelectProvider(p.id)}
                disabled={!p.enabled}
                styles={{ label: { fontSize: 'var(--mantine-font-size-sm)' } }}
              />
            );
          })}
        </Card>

        {/* ── Right column: selected provider config ── */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Card withBorder radius="md" padding="lg">
            <Group gap="sm" mb="md">
              <ThemeIcon size="lg" radius="md" variant="light" color={provider.color}>
                {provider.icon}
              </ThemeIcon>
              <div>
                <Text fw={600} size="sm">{provider.label}</Text>
                <Text size="xs" c="dimmed">{provider.description}</Text>
              </div>
              {existing && (
                <Badge
                  ml="auto"
                  size="sm"
                  variant="light"
                  color={existing.is_valid === true ? 'green' : existing.is_valid === false ? 'red' : 'gray'}
                  leftSection={
                    existing.is_valid === true
                      ? <IconCheck size={12} />
                      : existing.is_valid === false
                        ? <IconX size={12} />
                        : <IconKey size={12} />
                  }
                >
                  {existing.is_valid === true ? 'Connected' : existing.is_valid === false ? 'Invalid' : `Key ····${existing.key_suffix}`}
                </Badge>
              )}
            </Group>

            {/* API Key Section */}
            <Paper p="md" radius="sm" withBorder>
              <Text fw={500} size="sm" mb="xs">API Key</Text>
              {existing && !hasKeyChanged && (
                <Group gap="sm" mb="sm">
                  <Text size="sm" c="dimmed" ff="monospace">
                    {'•'.repeat(20)}{existing.key_suffix}
                  </Text>
                  <Button variant="subtle" size="xs" color="red" onClick={handleDeleteKey}>
                    Remove
                  </Button>
                </Group>
              )}
              <Group gap="xs" align="flex-end">
                <PasswordInput
                  placeholder={existing ? 'Enter new key to replace' : (provider.keyPlaceholder ?? 'Paste API key...')}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.currentTarget.value);
                    setTestStatus('idle');
                    setTestError(null);
                  }}
                  style={{ flex: 1 }}
                  size="sm"
                />
                <Tooltip label="Send a minimal API call to verify the key">
                  <Button
                    variant="light"
                    size="sm"
                    onClick={handleTest}
                    loading={testStatus === 'testing'}
                    disabled={!apiKey.trim() || (selectedId === 'custom' && !baseUrl.trim())}
                    leftSection={<IconPlugConnected size={16} />}
                    color={testStatus === 'valid' ? 'green' : testStatus === 'invalid' ? 'red' : 'blue'}
                  >
                    {testStatus === 'valid' ? 'Valid' : testStatus === 'invalid' ? 'Failed' : 'Test'}
                  </Button>
                </Tooltip>
              </Group>
              {testStatus === 'valid' && (
                <Text size="xs" c="green" mt={4}>Key verified — connection successful.</Text>
              )}
              {testStatus === 'invalid' && testError && (
                <Text size="xs" c="red" mt={4}>{testError}</Text>
              )}
              {provider.keyHelpUrl && (
                <Text size="xs" c="dimmed" mt="xs">
                  Your key is stored securely and used only for processing your documents. Get a key at{' '}
                  <Text
                    component="a"
                    href={provider.keyHelpUrl}
                    target="_blank"
                    rel="noopener"
                    size="xs"
                    c="blue"
                    style={{ textDecoration: 'underline' }}
                  >
                    {new URL(provider.keyHelpUrl).hostname}
                  </Text>
                </Text>
              )}
            </Paper>

            {/* Base URL (Custom provider only) */}
            {selectedId === 'custom' && (
              <Paper p="md" radius="sm" withBorder mt="md">
                <TextInput
                  label="Base URL"
                  description="OpenAI-compatible API endpoint (e.g., http://localhost:1234/v1)"
                  placeholder="https://your-endpoint.example.com/v1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.currentTarget.value)}
                  size="sm"
                  required
                />
              </Paper>
            )}

            <Divider my="md" />

            {/* Model Defaults Section — always shown */}
            <Text fw={500} size="sm" mb="xs">Model Defaults</Text>
            <Text size="xs" c="dimmed" mb="sm">
              Applied when a schema's prompt_config does not specify its own model or parameters.
            </Text>

            <Stack gap="sm">
              {provider.models && provider.models.length > 0 ? (
                <Select
                  label="Model"
                  data={provider.models}
                  value={model}
                  onChange={(v) => v && setModel(v)}
                  size="sm"
                />
              ) : (
                <TextInput
                  label="Model"
                  description="Enter the model identifier (e.g., llama-3.1-70b)"
                  placeholder="model-name"
                  value={model}
                  onChange={(e) => setModel(e.currentTarget.value)}
                  size="sm"
                />
              )}

              <div>
                <Text size="sm" mb={4}>Temperature: {temperature.toFixed(1)}</Text>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={temperature}
                  onChange={setTemperature}
                  marks={[
                    { value: 0, label: '0' },
                    { value: 0.3, label: '0.3' },
                    { value: 1, label: '1.0' },
                  ]}
                  size="sm"
                />
                <Text size="xs" c="dimmed" mt={4}>
                  Lower values produce more deterministic, consistent annotations.
                </Text>
              </div>

              <NumberInput
                label="Max tokens per block"
                min={100}
                max={8000}
                step={100}
                value={maxTokens}
                onChange={(v) => typeof v === 'number' && setMaxTokens(v)}
                size="sm"
                description="Maximum output length for each block processed by the AI."
              />
            </Stack>

            <Divider my="md" />

            {/* Save Buttons */}
            <Group justify="flex-end" gap="xs">
              {hasKeyChanged && (
                <Button
                  onClick={handleSaveKey}
                  loading={saving}
                  leftSection={<IconDeviceFloppy size={16} />}
                >
                  {existing ? 'Replace Key & Save' : 'Save Key & Defaults'}
                </Button>
              )}
              {!hasKeyChanged && hasDefaultsChanged && (
                <Button
                  onClick={handleSaveDefaults}
                  loading={savingDefaults}
                  variant="light"
                  leftSection={<IconDeviceFloppy size={16} />}
                >
                  Save Defaults
                </Button>
              )}
            </Group>
          </Card>
        </Box>
      </Group>
    </>
  );
}
