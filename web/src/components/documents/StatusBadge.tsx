import { IconLoader2 } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';

export function StatusBadge({ status, error }: { status: string; error?: string | null }) {
  const variant: 'green' | 'red' | 'blue' | 'gray' =
    status === 'parsed'
      ? 'green'
      : status === 'conversion_failed' || status === 'parse_failed'
        ? 'red'
        : status === 'converting'
          ? 'blue'
          : 'gray';
  const label =
    status === 'parsed'
      ? 'parsed'
      : status === 'uploaded'
        ? 'unparsed'
        : status.replace(/_/g, ' ');
  return (
    <Badge variant={variant} size="xs" title={error ?? undefined}>
      {status === 'converting' && <IconLoader2 size={10} className="mr-1 animate-spin" />}
      {label}
    </Badge>
  );
}
