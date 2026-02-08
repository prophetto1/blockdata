import { Badge } from '@mantine/core';

const COLOR: Record<string, string> = {
  pending: 'gray',
  claimed: 'yellow',
  complete: 'green',
  failed: 'red',
};

export function StatusBadge({ status }: { status: string | undefined }) {
  if (!status) return <Badge size="xs" color="gray">--</Badge>;
  return <Badge size="xs" color={COLOR[status] ?? 'gray'}>{status}</Badge>;
}
