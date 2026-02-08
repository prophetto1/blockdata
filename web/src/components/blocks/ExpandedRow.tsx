import { Code, Grid, Stack, Text, Badge, Paper } from '@mantine/core';
import type { BlockWithOverlay } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

export function ExpandedRow({ row }: { row: BlockWithOverlay }) {
  return (
    <Paper p="md" bg="var(--mantine-color-body)">
      <Grid>
        <Grid.Col span={{ base: 12, md: row.overlay ? 6 : 12 }}>
          <Stack gap="xs">
            <Text size="xs" fw={600}>Block metadata</Text>
            <Text size="xs" c="dimmed">
              Index: {row.block_index} | Type: {row.block_type}
            </Text>
            <Text size="xs" c="dimmed">block_uid: {row.block_uid}</Text>
            <Text size="xs" fw={600} mt="xs">Locator</Text>
            <Code block fz="xs">{JSON.stringify(row.block_locator, null, 2)}</Code>
            <Text size="xs" fw={600} mt="xs">Content</Text>
            <Code block fz="xs" style={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}>
              {row.block_content}
            </Code>
          </Stack>
        </Grid.Col>
        {row.overlay && (
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="xs">
              <Text size="xs" fw={600}>Overlay</Text>
              <StatusBadge status={row.overlay.status} />
              <Text size="xs" c="dimmed">
                Attempts: {row.overlay.attempt_count}
              </Text>
              {row.overlay.last_error && (
                <Badge color="red" size="xs">{row.overlay.last_error}</Badge>
              )}
              <Code block fz="xs" style={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}>
                {JSON.stringify(row.overlay.overlay_jsonb, null, 2)}
              </Code>
            </Stack>
          </Grid.Col>
        )}
      </Grid>
    </Paper>
  );
}
