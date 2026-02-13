import { Card, Stack, Text } from '@mantine/core';
import { PageHeader } from '@/components/common/PageHeader';

export default function Commands() {
  return (
    <>
      <PageHeader
        title="Commands"
        subtitle="Placeholder surface for command catalog and execution (future)."
      />
      <Card withBorder radius="md" p="lg">
        <Stack gap="xs">
          <Text fw={600}>Coming soon</Text>
          <Text size="sm" c="dimmed">
            This page will host reusable commands that agents can invoke through MCP tooling.
          </Text>
        </Stack>
      </Card>
    </>
  );
}

