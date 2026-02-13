import { useMemo, useState } from 'react';
import { Button, Group, SegmentedControl, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { edgeJson } from '@/lib/edge';
import type { ProviderConnectionView } from '@/components/agents/useAgentConfigs';
import { ApiKeyPanel } from '@/components/agents/forms/ApiKeyPanel';

type GoogleAuthMode = 'gemini_key' | 'vertex_service_account';

export function GoogleAuthPanel({
  providerKeyInfo,
  providerConnections,
  providerConnectionFlowsEnabled,
  onReload,
  vertexOnly = false,
}: {
  providerKeyInfo: { key_suffix: string; is_valid: boolean | null; base_url: string | null } | null;
  providerConnections: ProviderConnectionView[];
  providerConnectionFlowsEnabled: boolean;
  onReload: () => Promise<void>;
  vertexOnly?: boolean;
}) {
  const [mode, setMode] = useState<GoogleAuthMode>(vertexOnly ? 'vertex_service_account' : 'gemini_key');
  const vertex = useMemo(
    () => providerConnections.find((c) => c.connection_type === 'gcp_service_account') ?? null,
    [providerConnections],
  );

  const [location, setLocation] = useState<string>(
    typeof vertex?.metadata_jsonb?.location === 'string' ? (vertex?.metadata_jsonb.location as string) : 'us-central1',
  );
  const [serviceAccountJson, setServiceAccountJson] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const connected = vertex?.status === 'connected';

  const handleConnect = async () => {
    if (!providerConnectionFlowsEnabled) {
      notifications.show({ color: 'yellow', message: 'Vertex connection flows are disabled by feature flag.' });
      return;
    }
    setConnecting(true);
    try {
      await edgeJson('provider-connections/connect', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'google',
          connection_type: 'gcp_service_account',
          location,
          service_account_json: serviceAccountJson,
        }),
      });
      notifications.show({ color: 'green', message: 'Vertex connected' });
      setServiceAccountJson('');
      await onReload();
    } catch (e) {
      notifications.show({ color: 'red', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!providerConnectionFlowsEnabled) return;
    setDisconnecting(true);
    try {
      await edgeJson('provider-connections/disconnect', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'google',
          connection_type: 'gcp_service_account',
        }),
      });
      notifications.show({ color: 'green', message: 'Vertex disconnected' });
      await onReload();
    } catch (e) {
      notifications.show({ color: 'red', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text fw={600}>Google auth</Text>
        {connected && (
          <Text size="sm" c="dimmed">
            Vertex connected
          </Text>
        )}
      </Group>

      {!vertexOnly && (
        <SegmentedControl
          value={mode}
          onChange={(v) => setMode(v as GoogleAuthMode)}
          data={[
            { value: 'gemini_key', label: 'Gemini API key' },
            { value: 'vertex_service_account', label: 'Vertex AI (service account)' },
          ]}
        />
      )}

      {mode === 'gemini_key' ? (
        <ApiKeyPanel provider="google" providerKeyInfo={providerKeyInfo} onReload={onReload} />
      ) : (
        <Stack gap="xs">
          <TextInput
            label="Location"
            description="Vertex location (e.g., us-central1)"
            value={location}
            onChange={(e) => setLocation(e.currentTarget.value)}
          />
          <Textarea
            label="Service account JSON"
            description="Paste the full service account JSON. Stored encrypted server-side."
            minRows={6}
            value={serviceAccountJson}
            onChange={(e) => setServiceAccountJson(e.currentTarget.value)}
            disabled={connected}
          />
          <Group justify="flex-end">
            {connected ? (
              <Button
                variant="light"
                onClick={handleDisconnect}
                loading={disconnecting}
                disabled={!providerConnectionFlowsEnabled}
              >
                Disconnect
              </Button>
            ) : (
              <Button
                onClick={handleConnect}
                loading={connecting}
                disabled={!providerConnectionFlowsEnabled || !location.trim() || !serviceAccountJson.trim()}
              >
                Connect
              </Button>
            )}
          </Group>
          {!providerConnectionFlowsEnabled && (
            <Text size="xs" c="dimmed">
              Vertex connect is disabled by feature flag.
            </Text>
          )}
        </Stack>
      )}
    </Stack>
  );
}
