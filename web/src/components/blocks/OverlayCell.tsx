import { Badge, Group, Text, Tooltip } from '@mantine/core';
import type { SchemaFieldMeta } from '@/lib/schema-fields';

type Props = {
  value: unknown;
  fieldMeta: SchemaFieldMeta;
};

export function OverlayCell({ value, fieldMeta }: Props) {
  if (value === null || value === undefined) {
    return <Text size="sm" c="dimmed">--</Text>;
  }

  if (typeof value === 'boolean') {
    return <Badge size="xs" color={value ? 'green' : 'gray'}>{value ? 'Yes' : 'No'}</Badge>;
  }

  if (typeof value === 'number') {
    return <Text size="sm">{value}</Text>;
  }

  if (typeof value === 'string') {
    if (fieldMeta.enumValues?.includes(value)) {
      return <Badge size="xs" variant="light">{value}</Badge>;
    }
    const clipped = value.length > 60;
    return (
      <Tooltip label={value} disabled={!clipped} multiline maw={400} withArrow>
        <Text size="sm" lineClamp={1}>{clipped ? value.slice(0, 60) + '...' : value}</Text>
      </Tooltip>
    );
  }

  if (Array.isArray(value)) {
    if (value.length <= 3 && value.every((v) => typeof v === 'string')) {
      return (
        <Group gap={4}>
          {value.map((v, i) => <Badge key={i} size="xs" variant="light">{String(v)}</Badge>)}
        </Group>
      );
    }
    return (
      <Tooltip label={JSON.stringify(value, null, 2)} multiline maw={400} withArrow>
        <Text size="sm" c="dimmed">[{value.length} items]</Text>
      </Tooltip>
    );
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value as object);
    const preview = keys.slice(0, 3).join(', ') + (keys.length > 3 ? ', ...' : '');
    return (
      <Tooltip label={JSON.stringify(value, null, 2)} multiline maw={400} withArrow>
        <Text size="sm" c="dimmed">{`{${preview}}`}</Text>
      </Tooltip>
    );
  }

  return <Text size="sm">{String(value)}</Text>;
}
