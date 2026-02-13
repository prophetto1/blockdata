import { Badge, Button, Card, Group, Stack, Text } from '@mantine/core';
import type { McpServerDef } from '@/components/mcp/mcp-catalog';

export function McpServerCard({
  server,
  status,
  actionLabel,
  onAction,
}: {
  server: McpServerDef;
  status: 'connected' | 'disconnected' | 'configure';
  actionLabel: string;
  onAction: () => void;
}) {
  const badgeColor = status === 'connected' ? 'green' : status === 'configure' ? 'blue' : 'gray';
  const badgeText = status === 'connected' ? 'Connected' : status === 'configure' ? 'Configure' : 'Not connected';

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Stack gap={2}>
            <Text fw={700}>{server.title}</Text>
            <Text size="sm" c="dimmed">
              {server.description}
            </Text>
          </Stack>
          <Badge color={badgeColor} variant={status === 'disconnected' ? 'light' : 'filled'}>
            {badgeText}
          </Badge>
        </Group>
        <Group justify="flex-end">
          <Button variant="light" onClick={onAction}>
            {actionLabel}
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

