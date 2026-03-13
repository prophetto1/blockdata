import type { FileDispatchStatus } from '@/hooks/useBatchParse';

export function StatusBadge({ status, error }: { status: string; error?: string | null }) {
  const variant =
    status === 'ingested'
      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
      : status === 'conversion_failed' || status === 'ingest_failed'
        ? 'bg-destructive/10 text-destructive'
        : status === 'converting'
          ? 'bg-primary/10 text-primary'
          : 'bg-muted/60 text-muted-foreground';
  const label =
    status === 'ingested'
      ? 'success'
      : status === 'uploaded'
        ? 'unparsed'
        : status.replace(/_/g, ' ');
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${variant}`}
      title={error ?? undefined}
    >
      {label}
    </span>
  );
}

export function DispatchBadge({ status }: { status: FileDispatchStatus }) {
  if (status === 'idle') return null;
  const variant =
    status === 'dispatched'
      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
      : status === 'dispatch_error'
        ? 'bg-destructive/10 text-destructive'
        : status === 'dispatching'
          ? 'bg-primary/10 text-primary'
          : 'bg-muted/60 text-muted-foreground';
  return (
    <span className={`ml-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${variant}`}>
      {status === 'dispatching' ? 'sending...' : status}
    </span>
  );
}
