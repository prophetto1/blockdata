import { useEffect, useState } from 'react';
import {
  Card,
  Text,
  Group,
  Stack,
  Button,
  PasswordInput,
  Select,
  Slider,
  NumberInput,
  Badge,
  ThemeIcon,
  Alert,
  Paper,
  Divider,
  Tooltip,
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
} from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { edgeJson } from '@/lib/edge';
import { PageHeader } from '@/components/common/PageHeader';
import type { UserApiKeyRow } from '@/lib/types';

const ANTHROPIC_MODELS = [
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6 — most capable' },
  { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5 — balanced (default)' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 — fastest' },
];

type TestStatus = 'idle' | 'testing' | 'valid' | 'invalid';

export default function Settings() {
  // Existing key state (loaded from DB)
  const [existing, setExisting] = useState<UserApiKeyRow | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('claude-sonnet-4-5-20250929');
  const [temperature, setTemperature] = useState(0.3);
  const [maxTokens, setMaxTokens] = useState(2000);

  // Action state
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testError, setTestError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingDefaults, setSavingDefaults] = useState(false);

  // Load existing key on mount
  useEffect(() => {
    supabase
      .from('user_api_keys')
      .select('id, user_id, provider, key_suffix, is_valid, default_model, default_temperature, default_max_tokens, created_at, updated_at')
      .eq('provider', 'anthropic')
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const row = data as UserApiKeyRow;
          setExisting(row);
          setModel(row.default_model);
          setTemperature(row.default_temperature);
          setMaxTokens(row.default_max_tokens);
        }
        setLoading(false);
      });
  }, []);

  const handleTest = async () => {
    if (!apiKey.trim()) {
      notifications.show({ color: 'yellow', title: 'Enter a key', message: 'Paste your Anthropic API key first.' });
      return;
    }
    setTestStatus('testing');
    setTestError(null);
    try {
      const result = await edgeJson<{ valid: boolean; error?: string }>('test-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey.trim(), provider: 'anthropic' }),
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
    setSaving(true);
    try {
      await edgeJson<{ ok: boolean; key_suffix?: string }>('user-api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'anthropic',
          api_key: apiKey.trim(),
          default_model: model,
          default_temperature: temperature,
          default_max_tokens: maxTokens,
        }),
      });

      // Reload the saved state
      const { data } = await supabase
        .from('user_api_keys')
        .select('id, user_id, provider, key_suffix, is_valid, default_model, default_temperature, default_max_tokens, created_at, updated_at')
        .eq('provider', 'anthropic')
        .maybeSingle();

      if (data) {
        const row = data as UserApiKeyRow;
        setExisting(row);
        setModel(row.default_model);
        setTemperature(row.default_temperature);
        setMaxTokens(row.default_max_tokens);
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
          provider: 'anthropic',
          default_model: model,
          default_temperature: temperature,
          default_max_tokens: maxTokens,
        }),
      });

      if (existing) {
        setExisting({ ...existing, default_model: model, default_temperature: temperature, default_max_tokens: maxTokens });
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
        body: JSON.stringify({ provider: 'anthropic' }),
      });
      setExisting(null);
      setApiKey('');
      setModel('claude-sonnet-4-5-20250929');
      setTemperature(0.3);
      setMaxTokens(2000);
      setTestStatus('idle');
      notifications.show({ color: 'green', title: 'Removed', message: 'API key deleted.' });
    } catch (e) {
      notifications.show({ color: 'red', title: 'Error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const hasKeyChanged = apiKey.trim().length > 0;
  const hasDefaultsChanged = existing != null && (
    model !== existing.default_model ||
    temperature !== existing.default_temperature ||
    maxTokens !== existing.default_max_tokens
  );

  if (loading) return null;

  return (
    <>
      <PageHeader title="Settings" subtitle="Configure your AI provider and model defaults." />

      <Stack maw={640} gap="lg">
        {/* ── Anthropic Provider Card ── */}
        <Card withBorder radius="md" padding="lg">
          <Group gap="sm" mb="md">
            <ThemeIcon size="lg" radius="md" variant="light" color="violet">
              <IconBrain size={20} />
            </ThemeIcon>
            <div>
              <Text fw={600} size="sm">Anthropic</Text>
              <Text size="xs" c="dimmed">Claude models for document annotation</Text>
            </div>
            {existing && (
              <Badge
                ml="auto"
                size="sm"
                variant="light"
                color={existing.is_valid === true ? 'green' : existing.is_valid === false ? 'red' : 'gray'}
                leftSection={existing.is_valid === true
                  ? <IconCheck size={12} />
                  : existing.is_valid === false
                    ? <IconX size={12} />
                    : <IconKey size={12} />}
              >
                {existing.is_valid === true ? 'Connected' : existing.is_valid === false ? 'Invalid' : `Key ••••${existing.key_suffix}`}
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
                placeholder={existing ? 'Enter new key to replace' : 'sk-ant-api03-...'}
                value={apiKey}
                onChange={(e) => { setApiKey(e.currentTarget.value); setTestStatus('idle'); setTestError(null); }}
                style={{ flex: 1 }}
                size="sm"
              />
              <Tooltip label="Send a minimal API call to verify the key">
                <Button
                  variant="light"
                  size="sm"
                  onClick={handleTest}
                  loading={testStatus === 'testing'}
                  disabled={!apiKey.trim()}
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
            <Text size="xs" c="dimmed" mt="xs">
              Your key is stored securely and used only for processing your documents. Get a key at{' '}
              <Text component="a" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener" size="xs" c="blue" style={{ textDecoration: 'underline' }}>
                console.anthropic.com
              </Text>
            </Text>
          </Paper>

          <Divider my="md" />

          {/* Model & Defaults Section */}
          <Text fw={500} size="sm" mb="xs">Model Defaults</Text>
          <Text size="xs" c="dimmed" mb="sm">
            These apply when a schema's prompt_config does not specify its own model or parameters.
          </Text>

          <Stack gap="sm">
            <Select
              label="Model"
              data={ANTHROPIC_MODELS}
              value={model}
              onChange={(v) => v && setModel(v)}
              size="sm"
            />

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

        {/* ── Future Providers ── */}
        <Card withBorder radius="md" padding="lg" style={{ opacity: 0.5 }}>
          <Group gap="sm">
            <ThemeIcon size="lg" radius="md" variant="light" color="gray">
              <IconCloud size={20} />
            </ThemeIcon>
            <div>
              <Text fw={600} size="sm">OpenAI</Text>
              <Text size="xs" c="dimmed">GPT models</Text>
            </div>
            <Badge ml="auto" size="sm" variant="light" color="gray">Coming soon</Badge>
          </Group>
        </Card>

        <Card withBorder radius="md" padding="lg" style={{ opacity: 0.5 }}>
          <Group gap="sm">
            <ThemeIcon size="lg" radius="md" variant="light" color="gray">
              <IconCloud size={20} />
            </ThemeIcon>
            <div>
              <Text fw={600} size="sm">Google AI</Text>
              <Text size="xs" c="dimmed">Gemini models</Text>
            </div>
            <Badge ml="auto" size="sm" variant="light" color="gray">Coming soon</Badge>
          </Group>
        </Card>

        {!existing && (
          <Alert color="blue" variant="light">
            Configure your Anthropic API key above to enable AI-powered document annotation.
            The worker will use your key to process blocks when you run a schema.
          </Alert>
        )}
      </Stack>
    </>
  );
}
