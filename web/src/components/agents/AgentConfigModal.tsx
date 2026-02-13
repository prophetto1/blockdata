import { useState } from 'react';
import {
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Alert,
  Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconInfoCircle } from '@tabler/icons-react';
import type { AgentCatalogRow, UserAgentConfigRow } from '@/lib/types';
import { edgeJson } from '@/lib/edge';
import { featureFlags } from '@/lib/featureFlags';
import type { ProviderConnectionView } from '@/components/agents/useAgentConfigs';
import { PROVIDERS } from '@/components/agents/providerRegistry';
import { GoogleAuthPanel } from '@/components/agents/forms/GoogleAuthPanel';
import { ProviderCredentialsModule } from '@/components/agents/forms/ProviderCredentialsModule';

export function AgentConfigModal({
  opened,
  onClose,
  catalog,
  config,
  readiness,
  providerKeyInfo,
  providerConnections,
  onSaveConfig,
  onReload,
}: {
  opened: boolean;
  onClose: () => void;
  catalog: AgentCatalogRow;
  config: UserAgentConfigRow | null;
  readiness: { is_ready: boolean; reasons: string[] } | null;
  providerKeyInfo: {
    key_suffix: string;
    is_valid: boolean | null;
    base_url: string | null;
    default_model?: string;
    default_temperature?: number;
    default_max_tokens?: number;
  } | null;
  providerConnections: ProviderConnectionView[];
  onSaveConfig: (patch: {
    agent_slug: string;
    keyword: string;
    model: string;
  }) => Promise<void>;
  onReload: () => Promise<void>;
}) {
  const provider = catalog.provider_family;
  const providerDef = PROVIDERS.find((p) => p.id === provider);

  const [keyword, setKeyword] = useState(config?.keyword ?? '');
  const [model, setModel] = useState(config?.model ?? catalog.default_model ?? '');

  const configured = readiness?.is_ready ?? false;
  const readinessText = readiness?.reasons?.join('; ') ?? '';

  const modelOptions = providerDef?.models ?? [];

  const saveDisabled = !keyword.trim() || !model.trim();

  const handleSave = async () => {
    try {
      await onSaveConfig({
        agent_slug: catalog.agent_slug,
        keyword,
        model,
      });
      notifications.show({ color: 'green', message: 'Saved agent config' });
      onClose();
    } catch (e) {
      notifications.show({ color: 'red', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const handleSetDefault = async () => {
    try {
      await edgeJson('agent-config', {
        method: 'PATCH',
        body: JSON.stringify({ agent_slug: catalog.agent_slug, is_default: true }),
      });
      await onReload();
      notifications.show({ color: 'green', message: 'Set as default agent' });
    } catch (e) {
      notifications.show({ color: 'red', message: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={`Configure: ${catalog.display_name}`} size="lg">
      <Stack gap="md">
        {!configured && (
          <Alert icon={<IconInfoCircle size={16} />} color="yellow" title="Needs setup">
            {readinessText || 'Credentials are not configured yet.'}
          </Alert>
        )}

        <TextInput
          label="Keyword"
          description="Slash command alias. Example: /claude"
          value={keyword}
          onChange={(e) => setKeyword(e.currentTarget.value)}
        />

        {modelOptions.length > 0 ? (
          <Select label="Model" data={modelOptions} value={model} onChange={(v) => v && setModel(v)} />
        ) : (
          <TextInput
            label="Model"
            description="Model identifier (for custom providers)."
            value={model}
            onChange={(e) => setModel(e.currentTarget.value)}
          />
        )}

        <Divider />

        <ProviderCredentialsModule provider={provider} providerKeyInfo={providerKeyInfo} onReload={onReload} />

        {provider === 'google' && (
          <>
            <Divider />
            <GoogleAuthPanel
              providerKeyInfo={providerKeyInfo}
              providerConnections={providerConnections}
              providerConnectionFlowsEnabled={featureFlags.providerConnectionFlows}
              onReload={onReload}
              vertexOnly
            />
          </>
        )}

        <Group justify="space-between" mt="xs">
          <Group gap="xs">
            <Button variant="light" onClick={handleSetDefault} disabled={!configured}>
              Set default
            </Button>
            {!featureFlags.providerConnectionFlows && provider === 'google' && (
              <Text size="xs" c="dimmed">
                Vertex connect is behind `providerConnectionFlows`.
              </Text>
            )}
          </Group>

          <Button onClick={handleSave} disabled={saveDisabled}>
            Save
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
