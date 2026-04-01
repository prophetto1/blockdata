import type { IndexJobStatus } from '@/lib/indexJobStatus';

const STATUS_STYLES: Record<IndexJobStatus, string> = {
  empty: '',
  draft: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  ready: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  invalid: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  running: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  failed: 'bg-destructive/15 text-destructive',
  complete: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
};

const STATUS_LABELS: Record<IndexJobStatus, string> = {
  empty: '',
  draft: 'Draft',
  ready: 'Ready',
  invalid: 'Invalid',
  running: 'Running',
  failed: 'Failed',
  complete: 'Complete',
};

export function IndexJobStatusChip({
  status,
  hasUnsavedChanges,
}: {
  status: IndexJobStatus;
  hasUnsavedChanges?: boolean;
}) {
  if (status === 'empty') return null;

  const showUnsaved = hasUnsavedChanges && status !== 'draft';
  const displayLabel = showUnsaved ? 'Unsaved changes' : STATUS_LABELS[status];
  const displayStyle = showUnsaved ? STATUS_STYLES.draft : STATUS_STYLES[status];

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${displayStyle}`}
    >
      {displayLabel}
    </span>
  );
}
