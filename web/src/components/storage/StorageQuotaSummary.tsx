import type { StorageQuota } from '@/hooks/useStorageQuota';

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/** Pick the best unit index for a byte value. */
function pickUnit(bytes: number): number {
  if (!Number.isFinite(bytes) || bytes <= 0) return 0;
  let size = bytes;
  let idx = 0;
  while (size >= 1024 && idx < UNITS.length - 1) {
    size /= 1024;
    idx += 1;
  }
  return idx;
}

/** Format bytes using a specific unit index. */
function formatInUnit(bytes: number, unitIndex: number): string {
  const value = typeof bytes === 'number' ? bytes : 0;
  if (!Number.isFinite(value) || value < 0) return `0 ${UNITS[unitIndex]}`;
  const size = value / 1024 ** unitIndex;
  const rounded = size >= 10 || unitIndex === 0 ? Math.round(size) : Math.round(size * 10) / 10;
  return `${rounded} ${UNITS[unitIndex]}`;
}

export function StorageQuotaSummary({
  quota,
  loading,
  error,
}: {
  quota: StorageQuota | null;
  loading: boolean;
  error: string | null;
}) {
  const cardClassName = 'grid gap-1 rounded-md border border-border bg-muted/20 px-3 py-2';

  if (loading) {
    return (
      <div className={cardClassName}>
        <div className="text-sm text-muted-foreground">Loading storage...</div>
      </div>
    );
  }

  if (error || !quota) {
    return (
      <div className={cardClassName}>
        <div className="text-sm text-destructive">{error ?? 'Storage unavailable'}</div>
      </div>
    );
  }

  const remaining = Math.max(quota.quota_bytes - quota.used_bytes - quota.reserved_bytes, 0);

  // Use the same unit for total and remaining so the subtraction is visible.
  // If total and remaining would display identically at the natural unit, drop one level.
  const naturalUnit = pickUnit(quota.quota_bytes);
  const consumed = quota.used_bytes + quota.reserved_bytes;
  const unit = naturalUnit > 0 && consumed > 0
    && formatInUnit(quota.quota_bytes, naturalUnit) === formatInUnit(remaining, naturalUnit)
    ? naturalUnit - 1
    : naturalUnit;

  return (
    <div className={cardClassName}>
      <div className="text-sm font-medium text-foreground">{formatInUnit(quota.quota_bytes, unit)} total</div>
      <div className="text-xs text-muted-foreground">
        {formatInUnit(quota.used_bytes, pickUnit(quota.used_bytes))} used
      </div>
      {quota.reserved_bytes > 0 ? (
        <div className="text-xs text-muted-foreground">
          {formatInUnit(quota.reserved_bytes, pickUnit(quota.reserved_bytes))} reserved
        </div>
      ) : null}
      <div className="text-xs text-muted-foreground">
        {formatInUnit(remaining, unit)} remaining
      </div>
    </div>
  );
}
