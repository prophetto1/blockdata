import { Badge, Group, Text, Tooltip } from '@mantine/core';
import type { CellContext } from '@tanstack/react-table';
import type { SchemaFieldMeta } from '@/lib/schema-fields';

export function SchemaFieldCell<T>({ getValue, column }: CellContext<T, unknown>) {
  const value = getValue();
  const meta = (column.columnDef.meta as Record<string, unknown> | undefined)?.fieldMeta as SchemaFieldMeta | undefined;

  if (value === null || value === undefined) {
    return <Text size="xs" c="dimmed">--</Text>;
  }

  if (typeof value === 'boolean') {
    return <Badge size="xs" color={value ? 'green' : 'gray'}>{value ? 'Yes' : 'No'}</Badge>;
  }

  if (typeof value === 'number') {
    return <Text size="xs" fw={500}>{value}</Text>;
  }

  if (typeof value === 'string') {
    if (meta?.enumValues?.includes(value)) {
      return <Badge size="xs" variant="light">{value}</Badge>;
    }
    return (
      <Tooltip label={value} disabled={value.length <= 60} multiline maw={400} withArrow>
        <Text size="xs" lineClamp={1} style={{ wordBreak: 'break-word' }}>{value}</Text>
      </Tooltip>
    );
  }

  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === 'string' || typeof item === 'number')) {
      return (
        <Group gap={3} wrap="wrap">
          {value.slice(0, 5).map((item, index) => (
            <Badge key={index} size="xs" variant="light">{String(item)}</Badge>
          ))}
          {value.length > 5 && <Text size="xs" c="dimmed">+{value.length - 5}</Text>}
        </Group>
      );
    }
    return (
      <Tooltip label={JSON.stringify(value, null, 2)} multiline maw={400} withArrow>
        <Text size="xs" c="dimmed">[{value.length} items]</Text>
      </Tooltip>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <Tooltip label={JSON.stringify(value, null, 2)} multiline maw={400} withArrow>
        <Text size="xs" c="dimmed">
          {entries.slice(0, 2).map(([key, val]) => `${key}: ${String(val).slice(0, 25)}`).join(', ')}
          {entries.length > 2 && ', ...'}
        </Text>
      </Tooltip>
    );
  }

  return <Text size="xs">{String(value)}</Text>;
}
