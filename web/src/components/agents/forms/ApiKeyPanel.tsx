import { useMemo, useState } from 'react';
import { Button, Group, PasswordInput, Stack, Text, TextInput, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlugConnected } from '@tabler/icons-react';
import { edgeJson } from '@/lib/edge';
import { PROVIDERS } from '@/components/agents/providerRegistry';

type TestStatus = 'idle' | 'testing' | 'valid' | 'invalid';

export function ApiKeyPanel({
  provider,
  providerKeyInfo,
  onReload,
}: {
  provider: string;
  providerKeyInfo: { key_suffix: string; is_valid: boolean | null; base_url: string | null } | null;
  onReload: () => Promise<void>;
}) {
  const def = useMemo(() => PROVIDERS.find((p) => p.id === provider), [provider]);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(providerKeyInfo?.base_url ?? '');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testError, setTestError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const existingSuffix = providerKeyInfo?.key_suffix?.trim() || '';
  const hasExisting = existingSuffix.length === 4;
  const hasBaseUrlField = provider === 'custom';
  const requiresBaseUrl = provider === 'custom';

  const canTest = apiKey.trim().length > 0 && (!requiresBaseUrl || baseUrl.trim().length > 0);

  const handleTest = async () => {
    setTestStatus('testing');
    setTestError(null);
    try {
      const result = await edgeJson<{ valid: boolean; error?: string }>('test-api-key', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          api_key: apiKey,
          ...(hasBaseUrlField ? { base_url: baseUrl.trim() || null } : {}),
        }),
      });
      if (result.valid) {
        setTestStatus('valid');
      } else {
        setTestStatus('invalid');
        setTestError(result.error ?? 'Test failed');
      }
    } catch (e) {
      setTestStatus('invalid');
      setTestError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await edgeJson('user-api-keys', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          api_key: apiKey,
          ...(hasBaseUrlField ? { base_url: baseUrl.trim() || null } : {}),
        }),
      });
      notifications.show({ color: 'green', message: 'Saved API key' });
      setApiKey('');
      setTestStatus('idle');
      setTestError(null);
      await onReload();
    } catch (e) {
      notifications.show({ color: 'red', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Text fw={600}>Credentials</Text>
        {hasExisting && (
          <Text size="sm" c="dimmed">
            Saved key ending in {existingSuffix}
          </Text>
        )}
      </Group>

      {hasBaseUrlField && (
        <TextInput
          label="Base URL"
          description="OpenAI-compatible endpoint base (e.g., http://localhost:1234/v1)"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.currentTarget.value)}
          required={requiresBaseUrl}
        />
      )}

      <Group gap="xs" align="flex-end">
        <PasswordInput
          label="API key"
          placeholder={hasExisting ? 'Enter new key to replace' : def?.keyPlaceholder ?? 'Paste API key...'}
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
        <Button onClick={handleSave} loading={saving} disabled={!apiKey.trim() || (requiresBaseUrl && !baseUrl.trim())}>
          Save
        </Button>
      </Group>

      {testStatus === 'valid' && <Text size="xs" c="green">Key verified.</Text>}
      {testStatus === 'invalid' && testError && <Text size="xs" c="red">{testError}</Text>}

      {def?.keyHelpUrl && (
        <Text size="xs" c="dimmed">
          Get a key at{' '}
          <Text component="a" href={def.keyHelpUrl} target="_blank" rel="noopener" size="xs" c="blue" style={{ textDecoration: 'underline' }}>
            {new URL(def.keyHelpUrl).hostname}
          </Text>
          .
        </Text>
      )}
    </Stack>
  );
}
