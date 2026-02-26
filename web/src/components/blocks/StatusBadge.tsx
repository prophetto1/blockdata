import { Badge, type BadgeProps } from '@/components/ui/badge';

const COLOR: Record<string, BadgeProps['variant']> = {
  pending: 'gray',
  claimed: 'yellow',
  complete: 'green',
  failed: 'red',
};

export function StatusBadge({ status }: { status: string | undefined }) {
  if (!status) return <Badge size="xs" variant="gray">--</Badge>;
  return <Badge size="xs" variant={COLOR[status] ?? 'gray'}>{status}</Badge>;
}
