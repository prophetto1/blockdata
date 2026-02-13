import { Badge, Button, Card, Group, Stack, Text } from '@mantine/core';
import type { AgentCatalogRow } from '@/lib/types';

export function AgentCard({
  catalog,
  isDefault,
  configured,
  keyword,
  onConfigure,
  onSetDefault,
  canSetDefault,
  configureLabel = 'Configure',
  hideSetDefault = false,
}: {
  catalog: AgentCatalogRow;
  isDefault: boolean;
  configured: boolean;
  keyword: string;
  onConfigure: () => void;
  onSetDefault: () => void;
  canSetDefault: boolean;
  configureLabel?: string;
  hideSetDefault?: boolean;
}) {
  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Stack gap={2}>
            <Text fw={700}>{catalog.display_name}</Text>
            <Text size="sm" c="dimmed">
              {catalog.provider_family}
            </Text>
          </Stack>
          <Group gap={6}>
            {isDefault && <Badge color="blue">Default</Badge>}
            <Badge color={configured ? 'green' : 'gray'} variant={configured ? 'filled' : 'light'}>
              {configured ? 'Configured' : 'Needs setup'}
            </Badge>
          </Group>
        </Group>

        <Text size="sm" c="dimmed">
          Keyword: <Text span fw={600}>{keyword || '(none)'}</Text>
        </Text>

        <Group justify="space-between">
          <Button variant="light" onClick={onConfigure}>
            {configureLabel}
          </Button>
          {!hideSetDefault && (
            <Button
              variant="subtle"
              onClick={onSetDefault}
              disabled={!canSetDefault || configured === false}
            >
              Make default
            </Button>
          )}
        </Group>
      </Stack>
    </Card>
  );
}
