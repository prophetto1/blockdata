import { StorageQuotaSummary } from '@/components/storage/StorageQuotaSummary';
import { useStorageQuota } from '@/hooks/useStorageQuota';

export function AssetsRailQuotaCard() {
  const quota = useStorageQuota();

  return (
    <div className="px-2 pt-2" data-testid="assets-rail-quota-card">
      <StorageQuotaSummary
        quota={quota.data}
        loading={quota.loading}
        error={quota.error}
      />
    </div>
  );
}
