import type { StorageQuota } from '@/hooks/useStorageQuota';

function formatStorageBytes(bytes: number | null | undefined): string {
  const value = typeof bytes === 'number' ? bytes : 0;
  if (!Number.isFinite(value) || value <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const rounded = size >= 10 || unitIndex === 0 ? Math.round(size) : Math.round(size * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
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
  if (loading) {
    return <div className="px-3 py-2 text-sm text-muted-foreground">Loading storage...</div>;
  }

  if (error || !quota) {
    return <div className="px-3 py-2 text-sm text-destructive">{error ?? 'Storage unavailable'}</div>;
  }

  const remaining = Math.max(quota.quota_bytes - quota.used_bytes - quota.reserved_bytes, 0);

  return (
    <div className="grid gap-1 rounded-md border border-border bg-muted/20 px-3 py-2">
      <div className="text-sm font-medium text-foreground">{formatStorageBytes(quota.quota_bytes)} total</div>
      <div className="text-xs text-muted-foreground">
        {formatStorageBytes(quota.used_bytes)} used
      </div>
      <div className="text-xs text-muted-foreground">
        {formatStorageBytes(quota.reserved_bytes)} reserved
      </div>
      <div className="text-xs text-muted-foreground">
        {formatStorageBytes(remaining)} remaining
      </div>
    </div>
  );
}
