import { Button } from '@/components/ui/button';
import { IndexJobStatusChip } from './IndexJobStatusChip';
import type { IndexJobStatus } from '@/lib/indexJobStatus';

function formatTimestamp(iso: string | null, prefix: string) {
  if (!iso) return null;
  try {
    const formatted = new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${prefix} ${formatted}`;
  } catch {
    return `${prefix} ${iso}`;
  }
}

export function IndexJobHeader({
  name,
  status,
  hasUnsavedChanges,
  createdAt,
  updatedAt,
  lastRunAt,
  memberCount,
  onNameChange,
  onSaveDraft,
  onStartRun,
  onRetryRun,
  onDiscard,
  isSaving,
  isTriggering,
}: {
  name: string;
  status: IndexJobStatus;
  hasUnsavedChanges: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  lastRunAt: string | null;
  memberCount: number;
  onNameChange: (name: string) => void;
  onSaveDraft: () => void;
  onStartRun: () => void;
  onRetryRun: () => void;
  onDiscard: () => void;
  isSaving: boolean;
  isTriggering: boolean;
}) {
  const showUnsavedCtas = hasUnsavedChanges && status !== 'draft';

  const hasMetadata = (status !== 'draft' && createdAt) || updatedAt || lastRunAt;

  return (
    <div className="border-b border-border px-4 py-3">
      {/* Line 1: name + status + actions */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          autoFocus={status === 'draft'}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:rounded-sm focus-visible:px-1"
          placeholder="Untitled index job"
        />
        <IndexJobStatusChip status={status} hasUnsavedChanges={hasUnsavedChanges} />

        {/* Actions — right-aligned on the title line */}
        {status === 'draft' ? (
          <>
            <Button
              type="button"
              size="sm"
              onClick={onSaveDraft}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save draft'}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onDiscard}>
              Discard
            </Button>
          </>
        ) : null}

        {showUnsavedCtas ? (
          <>
            <Button
              type="button"
              size="sm"
              onClick={onStartRun}
              disabled={isTriggering || isSaving || memberCount === 0}
            >
              {isTriggering ? 'Starting...' : 'Save and start'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onSaveDraft}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </>
        ) : null}

        {status === 'ready' && !hasUnsavedChanges ? (
          <Button
            type="button"
            size="sm"
            onClick={onStartRun}
            disabled={isTriggering}
          >
            {isTriggering ? 'Starting...' : 'Start run'}
          </Button>
        ) : null}

        {status === 'invalid' && !hasUnsavedChanges ? (
          <Button
            type="button"
            size="sm"
            disabled
            title="Add at least one markdown file to run this job"
          >
            Start run
          </Button>
        ) : null}

        {status === 'running' ? (
          <Button type="button" size="sm" disabled>
            Running…
          </Button>
        ) : null}

        {status === 'failed' && !hasUnsavedChanges ? (
          <Button
            type="button"
            size="sm"
            onClick={onRetryRun}
            disabled={isTriggering}
          >
            {isTriggering ? 'Starting...' : 'Retry run'}
          </Button>
        ) : null}

        {status === 'complete' && !hasUnsavedChanges ? (
          <Button
            type="button"
            size="sm"
            onClick={onRetryRun}
            disabled={isTriggering}
          >
            {isTriggering ? 'Starting...' : 'Run again'}
          </Button>
        ) : null}
      </div>

      {/* Line 2: metadata (only rendered when present) */}
      {hasMetadata ? (
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {status !== 'draft' && createdAt
            ? <span>{formatTimestamp(createdAt, 'Created')}</span>
            : null}
          {updatedAt
            ? <span>{formatTimestamp(updatedAt, 'Last edited')}</span>
            : null}
          {lastRunAt
            ? <span>{formatTimestamp(lastRunAt, 'Last run')}</span>
            : null}
        </div>
      ) : null}
    </div>
  );
}
