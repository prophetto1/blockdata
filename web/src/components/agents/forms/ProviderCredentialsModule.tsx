import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Divider,
  Group,
  NumberInput,
  Paper,
  PasswordInput,
  Select,
  Slider,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconPlugConnected } from '@tabler/icons-react';
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

  const canTest = apiKey.trim().length > 0 && (provider !== 'custom' || baseUrl.trim().length > 0);

  const hasDefaultsChanged =
    providerKeyInfo != null &&
    (model !== (providerKeyInfo.default_model ?? '') ||
      temperature !== (providerKeyInfo.default_temperature ?? 0.3) ||
      maxTokens !== (providerKeyInfo.default_max_tokens ?? DEFAULT_MAX_TOKENS) ||
      (provider === 'custom' && (baseUrl.trim() || null) !== (providerKeyInfo.base_url ?? null)));

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
          ...(provider === 'custom' ? { base_url: baseUrl.trim() } : {}),
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
    if (provider === 'custom' && !baseUrl.trim()) {
      notifications.show({
        color: 'yellow',
        message: 'Custom provider requires a base URL.',
      });
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
          ...(provider === 'custom' ? { base_url: baseUrl.trim() } : {}),
        }),
      });
      setApiKey('');
      setTestStatus('idle');
      setTestError(null);
      await onReload();
      notifications.show({ color: 'green', message: 'Saved API key and provider defaults.' });
    } catch (e) {
      notifications.show({ color: 'red', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setSavingKey(false);
    }
  };

  const handleSaveDefaults = async () => {
    if (!providerKeyInfo) {
      notifications.show({
        color: 'yellow',
        message: 'Save an API key first, then update defaults.',
      });
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
          ...(provider === 'custom' ? { base_url: baseUrl.trim() } : {}),
        }),
      });
      await onReload();
      notifications.show({ color: 'green', message: 'Saved provider defaults.' });
    } catch (e) {
      notifications.show({ color: 'red', message: e instanceof Error ? e.message : String(e) });
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
      notifications.show({ color: 'green', message: 'Removed API key.' });
    } catch (e) {
      notifications.show({ color: 'red', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Stack gap="md">
      <Paper p="md" radius="sm" withBorder>
        <Text fw={600} mb="xs">API key</Text>
        {hasExistingKey && (
          <Group justify="space-between" mb="xs">
            <Text size="sm" c="dimmed">Saved key ending in {existingSuffix}</Text>
            <Button
              variant="subtle"
              color="red"
              size="xs"
              onClick={handleDeleteKey}
              loading={deleting}
            >
              Remove
            </Button>
          </Group>
        )}
        <Group gap="xs" align="flex-end">
          <PasswordInput
            label="New API key"
            placeholder={providerDef?.keyPlaceholder ?? 'Paste API key...'}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.currentTarget.value);
              setTestStatus('idle');
              setTestError(null);
            }}
            style={{ flex: 1 }}
          />
          <Tooltip label="Send a minimal API call to verify the key">
            <Button
              variant="light"
              onClick={handleTest}
              loading={testStatus === 'testing'}
              disabled={!canTest}
              leftSection={<IconPlugConnected size={16} />}
            >
              {testStatus === 'valid' ? 'Valid' : testStatus === 'invalid' ? 'Failed' : 'Test'}
            </Button>
          </Tooltip>
          <Button onClick={handleSaveKey} loading={savingKey} disabled={!apiKey.trim() || (provider === 'custom' && !baseUrl.trim())}>
            Save key
          </Button>
        </Group>
        {testStatus === 'valid' && <Text size="xs" c="green" mt={4}>Key verified.</Text>}
        {testStatus === 'invalid' && testError && <Text size="xs" c="red" mt={4}>{testError}</Text>}
      </Paper>

      {provider === 'custom' && (
        <Paper p="md" radius="sm" withBorder>
          <TextInput
            label="Base URL"
            description="OpenAI-compatible endpoint (for example: http://localhost:1234/v1)"
            placeholder="https://your-endpoint.example.com/v1"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.currentTarget.value)}
            required
          />
        </Paper>
      )}

      <Paper p="md" radius="sm" withBorder>
        <Text fw={600} mb={4}>Provider defaults</Text>
        <Text size="xs" c="dimmed" mb="sm">
          Used when run config does not override model parameters.
        </Text>
        <Stack gap="sm">
          {modelOptions.length > 0 ? (
            <Select
              label="Default model"
              data={modelOptions}
              value={model}
              onChange={(value) => setModel(value ?? '')}
            />
          ) : (
            <TextInput
              label="Default model"
              placeholder="model-name"
              value={model}
              onChange={(e) => setModel(e.currentTarget.value)}
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
            />
          </div>

          <NumberInput
            label="Max tokens"
            min={100}
            max={8000}
            step={100}
            value={maxTokens}
            onChange={(value) => typeof value === 'number' && setMaxTokens(value)}
          />
        </Stack>
        <Divider my="sm" />
        <Group justify="flex-end">
          <Button
            variant="light"
            leftSection={<IconDeviceFloppy size={16} />}
            onClick={handleSaveDefaults}
            loading={savingDefaults}
            disabled={!hasDefaultsChanged}
          >
            Save defaults
          </Button>
        </Group>
      </Paper>
    </Stack>
  );
}
