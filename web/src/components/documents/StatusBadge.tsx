import { Badge } from '@/components/ui/badge';
import type { FileDispatchStatus } from '@/hooks/useBatchParse';

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
      {label}
    </Badge>
  );
}

export function DispatchBadge({ status }: { status: FileDispatchStatus }) {
  if (status === 'idle') return null;
  const variant: 'blue' | 'red' | 'default' | 'gray' =
    status === 'dispatched'
      ? 'blue'
      : status === 'dispatch_error'
        ? 'red'
        : status === 'dispatching'
          ? 'default'
          : 'gray';
  return (
    <Badge variant={variant} size="xs" className="ml-1">
      {status === 'dispatching' ? 'sending...' : status}
    </Badge>
  );
}