import { Badge, Text } from '@mantine/core';
import type { CellContext } from '@tanstack/react-table';

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'green',
  ai_complete: 'yellow',
  pending: 'gray',
  claimed: 'blue',
  failed: 'red',
};

export function StatusCell<T>({ getValue }: CellContext<T, unknown>) {
  const status = getValue() as string | null | undefined;
  if (!status) return <Text size="xs" c="dimmed">--</Text>;
  return (
    <Badge size="xs" variant="light" color={STATUS_COLORS[status] ?? 'gray'}>
      {status}
    </Badge>
  );
}
