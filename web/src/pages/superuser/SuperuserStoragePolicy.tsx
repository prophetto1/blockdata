import { useCallback, useEffect, useMemo, useState } from 'react';

import { ErrorAlert } from '@/components/common/ErrorAlert';
import { platformApiFetch } from '@/lib/platformApi';

const BYTES_PER_GB = 1024 * 1024 * 1024;
const inputClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

type StoragePolicyResponse = {
  default_new_user_quota_bytes: number;
  updated_at: string | null;
  updated_by: string | null;
};

function bytesToGigabytes(bytes: number): string {
  const value = bytes / BYTES_PER_GB;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function Component() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policy, setPolicy] = useState<StoragePolicyResponse | null>(null);
  const [quotaGb, setQuotaGb] = useState('');
  const [reason, setReason] = useState('Set free-tier signup quota for verification');

  const loadPolicy = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await platformApiFetch('/admin/storage/policy');
      if (!response.ok) {
        const message = await response.text().catch(() => '');
        throw new Error(message || `Policy fetch failed: ${response.status}`);
      }

      const data = await response.json() as StoragePolicyResponse;
      setPolicy(data);
      setQuotaGb(bytesToGigabytes(data.default_new_user_quota_bytes));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load storage policy');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPolicy();
  }, [loadPolicy]);

  const currentQuotaLabel = useMemo(() => {
    if (!policy) return '--';
    return `${bytesToGigabytes(policy.default_new_user_quota_bytes)} GB`;
  }, [policy]);

  const handleSave = useCallback(async () => {
    const parsed = Number(quotaGb);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('Quota must be a non-negative number of gigabytes.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await platformApiFetch('/admin/storage/policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_new_user_quota_bytes: Math.round(parsed * BYTES_PER_GB),
          reason: reason.trim() || 'Updated storage policy from superuser workspace',
        }),
      });

      if (!response.ok) {
        const message = await response.text().catch(() => '');
        throw new Error(message || `Policy update failed: ${response.status}`);
      }

      const data = await response.json() as StoragePolicyResponse;
      setPolicy(data);
      setQuotaGb(bytesToGigabytes(data.default_new_user_quota_bytes));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update storage policy');
    } finally {
      setSaving(false);
    }
  }, [quotaGb, reason]);

  return (
    <div className="h-full min-h-0 overflow-hidden p-4">
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Default New-User Quota</h2>
          <p className="text-xs text-muted-foreground">
            Controls the storage entitlement assigned during signup for future users.
          </p>
        </div>

        {error ? <ErrorAlert message={error} /> : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading storage policy...</p>
        ) : (
          <div className="grid gap-4 md:max-w-xl">
            <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Current policy</div>
              <div className="mt-1 text-sm font-medium text-foreground">{currentQuotaLabel}</div>
            </div>

            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Quota in GB</span>
              <input
                className={inputClass}
                type="number"
                min="0"
                step="1"
                value={quotaGb}
                onChange={(event) => setQuotaGb(event.currentTarget.value)}
              />
            </label>

            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Reason</span>
              <input
                className={inputClass}
                value={reason}
                onChange={(event) => setReason(event.currentTarget.value)}
                placeholder="Why are you updating the default quota?"
              />
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => { void handleSave(); }}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Policy'}
              </button>
              {policy?.updated_at ? (
                <span className="text-xs text-muted-foreground">Last updated {policy.updated_at}</span>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
